/**
 * Amazon Product Finder — the normalized domain model.
 *
 * Everything above the provider layer (filters, ranking, routes, UI) speaks
 * only these types. No provider-specific shape, selector, field name or
 * transport detail is allowed to leak past `IProductProvider`, which is what
 * makes swapping the Phase 1 provider for the official Product Advertising API
 * a one-file change (see lib/product-finder/provider.ts).
 */

/** Money is kept as a value + currency, never a pre-formatted string, so the UI owns presentation. */
export interface Money {
  amount: number;
  currency: string; // ISO 4217, e.g. "GBP"
}

export interface ProductSpec {
  label: string;
  value: string;
}

/**
 * Availability is deliberately three-valued. A provider that cannot tell us
 * must say `unknown` rather than guessing `in_stock` — the filter pipeline
 * excludes only a confirmed `out_of_stock`, so an honest `unknown` costs a
 * product nothing while a wrong `in_stock` would send a buyer to a dead page.
 */
export type Availability = 'in_stock' | 'out_of_stock' | 'unknown';

export interface Delivery {
  /** null when the provider does not expose delivery terms. */
  free: boolean | null;
  /** Human-readable summary, e.g. "FREE delivery Thu, 7 Aug". */
  text: string | null;
}

/** The single product shape every provider must return. */
export interface NormalizedProduct {
  asin: string;
  name: string;
  brand: string;
  category: string;
  images: string[]; // hero first
  description: string;
  specifications: ProductSpec[];
  price: Money | null;
  originalPrice: Money | null;
  /** 0–100, derived from price vs originalPrice. null when either is unknown. */
  discountPercent: number | null;
  rating: number | null; // 0–5
  reviewCount: number | null;
  availability: Availability;
  delivery: Delivery;
  productUrl: string; // canonical, untagged — the affiliate service adds the tag
  /** Marketplace host, e.g. "amazon.co.uk". Needed to build affiliate links. */
  marketplace: string;
  /** Id of the provider that produced this record — for debugging and attribution only. */
  source: string;
  /**
   * Zero-based position in the provider's own result ordering.
   *
   * Load-bearing, not diagnostic. Amazon's search ranking is a strong relevance
   * model and discarding it was a real defect: asking for alternatives to a
   * £112 EV charging cable surfaced a £10.82 camping cable reel that sat at
   * position 20, because a cheap well-rated item wins on our own signals once
   * every candidate is treated as equally relevant. Undefined when the provider
   * has no meaningful ordering (a direct ASIN lookup, for instance).
   */
  sourceRank?: number;
  /**
   * Set when this ASIN also exists as a hand-written review in the affiliate
   * store, so the UI can deep-link to the richer curated page instead of the
   * generated one.
   */
  reviewSlug?: string;
}

/** What the user typed, once classified. */
export type FinderInput =
  | { kind: 'keyword'; keyword: string }
  | { kind: 'asin'; asin: string; marketplace: string };

export interface ProductQuery {
  keyword?: string;
  asin?: string;
  marketplace: string;
  /** How many candidates the provider should try to return before filtering. */
  limit: number;
}

export type ProviderErrorCode =
  | 'invalid_input'
  | 'not_found'
  | 'timeout'
  | 'unauthorized'
  | 'rate_limited'
  | 'provider_unavailable'
  | 'malformed_response';

/**
 * The only error type business logic sees. Providers translate their own
 * failure modes (HTTP status, parse failure, SDK exception) into one of these
 * codes so the API route and UI can render a useful message without knowing
 * which provider is active.
 */
export class ProductProviderError extends Error {
  readonly code: ProviderErrorCode;
  readonly provider: string;

  constructor(code: ProviderErrorCode, message: string, provider: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'ProductProviderError';
    this.code = code;
    this.provider = provider;
  }
}

export const isProductProviderError = (e: unknown): e is ProductProviderError =>
  e instanceof ProductProviderError;
