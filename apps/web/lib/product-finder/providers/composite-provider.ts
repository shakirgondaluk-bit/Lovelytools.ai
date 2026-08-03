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
import {
  isProductProviderError,
  type NormalizedProduct,
  type ProductQuery,
  type ProviderErrorCode,
} from '../types';

/**
 * Plain-English cause per error code.
 *
 * This exists so a degradation is diagnosable from the deployment log alone.
 * The visitor-facing message stays deliberately generic — a shopper should not
 * be told about our API quota — which previously left the real reason dumped as
 * a raw error object, indistinguishable at a glance from any other stack trace.
 * Three very different problems (quota gone, key rejected, host too slow) look
 * identical from the outside and need different fixes.
 */
const CAUSE_BY_CODE: Record<ProviderErrorCode, string> = {
  rate_limited: 'quota exhausted',
  unauthorized: 'API key rejected',
  timeout: 'no response in time',
  provider_unavailable: 'provider unreachable',
  malformed_response: 'unreadable response',
  invalid_input: 'provider rejected our request',
  not_found: 'nothing found',
};

const describeCause = (error: unknown): string => {
  if (isProductProviderError(error)) return CAUSE_BY_CODE[error.code] ?? error.code;
  return `unexpected error (${error instanceof Error ? error.message : String(error)})`;
};

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
  /** One greppable line per degradation: search the log for "degraded". */
  const degrade = (operation: string, cause: string): void => {
    console.warn(
      `[product-finder] ${primary.id} degraded on ${operation}: ${cause} — serving ${fallback.id} instead`,
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
      let failed = false;
      try {
        results = await primary.search(query, signal);
      } catch (error) {
        if (!isDegradable(error)) throw error;
        failed = true;
        degrade('search', describeCause(error));
      }
      if (results.length > 0) return results;

      // A successful-but-empty search fell through silently before. It reaches
      // the catalog by the same route as a failure and looks identical to the
      // visitor, so it needs the same log line — but only when there was no
      // error, which has already been reported with a more specific cause.
      if (!failed) degrade('search', 'no matching products returned');

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
        degrade('getByAsin', describeCause(error));
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
        degrade('findAlternatives', describeCause(error));
      }
      return fallback.findAlternatives ? fallback.findAlternatives(product, limit, signal) : [];
    },
  };
}
