/**
 * The provider seam.
 *
 * `IProductProvider` is the only thing ProductDiscoveryService knows about a
 * data source. Migrating to the official Amazon Product Advertising API means
 * writing one more class that satisfies this interface and registering it
 * below — no change to the filters, the ranking engine, the API routes, the
 * comparison logic, the affiliate engine, or any page.
 *
 * Registration is a factory map rather than eager construction so that adding a
 * provider that needs credentials can't break deployments that don't use it.
 */

import { createCanopyProvider } from './providers/canopy-provider';
import { createCatalogProvider } from './providers/catalog-provider';
import { createCompositeProvider } from './providers/composite-provider';
import { createHttpProvider } from './providers/http-provider';
import type { ProductFinderConfig } from './config';
import { ProductProviderError, type NormalizedProduct, type ProductQuery } from './types';

/**
 * What a provider can actually see.
 *
 * This exists so the service can word an empty result honestly. A `curated`
 * provider searching a fixed local set has not consulted Amazon, and saying
 * "no product found on amazon.co.uk" when we never asked Amazon is a false
 * statement about where we looked — it reads as "this product does not exist"
 * rather than "we do not cover this product".
 */
export type ProviderCoverage = 'curated' | 'marketplace';

export interface IProductProvider {
  /** Stable id, used for config selection, cache keys and error attribution. */
  readonly id: string;
  /** Human-readable name shown in the results page's "source" line. */
  readonly label: string;
  /** Whether this provider sees the whole marketplace or a fixed local set. */
  readonly coverage: ProviderCoverage;

  /** Keyword discovery. Returns up to `query.limit` candidates, unranked. */
  search(query: ProductQuery, signal: AbortSignal): Promise<NormalizedProduct[]>;

  /**
   * Single-product lookup by ASIN. Returns null when the marketplace has no
   * such product — reserve ProductProviderError for genuine failures so the UI
   * can tell "no such ASIN" apart from "the upstream API is down".
   */
  getByAsin(asin: string, marketplace: string, signal: AbortSignal): Promise<NormalizedProduct | null>;

  /**
   * Optional: related/alternative products for an ASIN, used to build a
   * comparison set from a single pasted URL. Providers that cannot do this
   * simply omit it and the service falls back to a keyword search on the name.
   */
  findAlternatives?(
    product: NormalizedProduct,
    limit: number,
    signal: AbortSignal,
  ): Promise<NormalizedProduct[]>;
}

type ProviderFactory = (config: ProductFinderConfig) => IProductProvider;

/**
 * The registry. To add the Product Advertising API in future:
 *   1. write providers/paapi-provider.ts implementing IProductProvider
 *   2. add `paapi: createPaapiProvider` here
 *   3. set PRODUCT_PROVIDER=paapi
 * That is the entire migration.
 */
const PROVIDERS: Record<string, ProviderFactory> = {
  catalog: createCatalogProvider,
  canopy: createCanopyProvider,
  http: createHttpProvider,
};

export const availableProviderIds = (): string[] => Object.keys(PROVIDERS);

function instantiate(id: string, config: ProductFinderConfig): IProductProvider {
  const factory = PROVIDERS[id];
  if (!factory) {
    throw new ProductProviderError(
      'provider_unavailable',
      `Unknown product provider "${id}". Available: ${availableProviderIds().join(', ')}.`,
      id,
    );
  }
  return factory(config);
}

/**
 * Builds the active provider, pairing it with a fallback when one is configured
 * and different. The pairing is what lets a metered or free-tier primary fail
 * softly into the curated catalog — see providers/composite-provider.ts.
 */
export function resolveProvider(config: ProductFinderConfig): IProductProvider {
  const primary = instantiate(config.providerId, config);

  const fallbackId = config.fallbackProviderId;
  if (!fallbackId || fallbackId === config.providerId) return primary;

  return createCompositeProvider(primary, instantiate(fallbackId, config));
}
