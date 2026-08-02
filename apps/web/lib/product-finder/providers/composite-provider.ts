/**
 * Primary provider with a fallback underneath it.
 *
 * This is what makes a free-tier product API usable. A 100-requests-a-month
 * allowance is fine right up until request 101, and a finder that returns an
 * error page at that point is worse than one that never called an API at all.
 * Here, a quota exhaustion, an outage, a timeout or a plain miss falls through
 * to the curated catalog, so the visitor gets our own reviews and a note rather
 * than a dead end.
 *
 * It is also the seam that keeps "add an API key later" a config change:
 * set PRODUCT_PROVIDER=http and the catalog slides underneath automatically.
 *
 * Failures of the *fallback* are not swallowed — if both sources are down there
 * is genuinely nothing to show, and pretending otherwise would hide a real
 * outage from whoever is on call.
 */

import type { IProductProvider, ProviderCoverage } from '../provider';
import { isProductProviderError, type NormalizedProduct, type ProductQuery } from '../types';

/** Errors worth falling back on. A malformed request is our bug, not theirs. */
function isDegradable(error: unknown): boolean {
  if (!isProductProviderError(error)) return true; // unknown failure — degrade rather than 500
  switch (error.code) {
    case 'rate_limited':
    case 'timeout':
    case 'provider_unavailable':
    case 'unauthorized':
    case 'malformed_response':
      return true;
    case 'invalid_input':
    case 'not_found':
      return false;
    default:
      return false;
  }
}

export function createCompositeProvider(
  primary: IProductProvider,
  fallback: IProductProvider,
): IProductProvider {
  const degrade = (operation: string, error: unknown): void => {
    console.warn(
      `[product-finder] ${primary.id} ${operation} failed, falling back to ${fallback.id}`,
      error,
    );
  };

  return {
    id: `${primary.id}+${fallback.id}`,
    label: `${primary.label} (with ${fallback.label} as backup)`,
    // The pair can still see the whole marketplace when the primary is up, and
    // the empty-state wording keys off the *best* coverage available — a miss
    // from a live provider really does mean Amazon has nothing.
    coverage: (primary.coverage === 'marketplace'
      ? 'marketplace'
      : fallback.coverage) as ProviderCoverage,

    async search(query: ProductQuery, signal: AbortSignal): Promise<NormalizedProduct[]> {
      let results: NormalizedProduct[] = [];
      try {
        results = await primary.search(query, signal);
      } catch (error) {
        if (!isDegradable(error)) throw error;
        degrade('search', error);
      }
      if (results.length > 0) return results;

      // Nothing from the primary — top up from the catalog rather than show an
      // empty page. Deduped so a product present in both is not listed twice.
      const backup = await fallback.search(query, signal);
      const seen = new Set(results.map((p) => p.asin));
      return [...results, ...backup.filter((p) => !seen.has(p.asin))].slice(0, query.limit);
    },

    async getByAsin(asin: string, marketplace: string, signal: AbortSignal): Promise<NormalizedProduct | null> {
      try {
        const found = await primary.getByAsin(asin, marketplace, signal);
        if (found) return found;
      } catch (error) {
        if (!isDegradable(error)) throw error;
        degrade('getByAsin', error);
      }
      return fallback.getByAsin(asin, marketplace, signal);
    },

    async findAlternatives(product, limit, signal): Promise<NormalizedProduct[]> {
      try {
        const alternatives = primary.findAlternatives
          ? await primary.findAlternatives(product, limit, signal)
          : [];
        if (alternatives.length > 0) return alternatives;
      } catch (error) {
        if (!isDegradable(error)) throw error;
        degrade('findAlternatives', error);
      }
      return fallback.findAlternatives ? fallback.findAlternatives(product, limit, signal) : [];
    },
  };
}
