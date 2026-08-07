/**
 * Product Finder configuration — the single place environment is read.
 *
 * Everything here is server-only (no NEXT_PUBLIC_ prefix): provider endpoints
 * and API keys must never reach the browser bundle, which is why discovery runs
 * behind app/api/product-finder/* rather than in the client island.
 */

export interface ProductFinderConfig {
  /** Which IProductProvider implementation to instantiate. */
  providerId: string;
  /**
   * Provider used when the primary returns nothing or is unavailable. Set to
   * the same id as `providerId` (or empty) to disable fallback entirely.
   */
  fallbackProviderId: string;
  /** Default Amazon marketplace when the user gives a keyword rather than a URL. */
  marketplace: string;
  /** Associates tag applied by the affiliate link service. */
  affiliateTag: string;
  /** Candidates requested from the provider before filtering/ranking. */
  candidateLimit: number;
  /** Products shown on the results page. */
  resultLimit: number;
  /** How many of `resultLimit` are the best product from distinct brands. */
  topBrandCount: number;
  /** How many are cheaper alternatives that still match every search word. */
  cheaperAlternativeCount: number;
  refinements: SearchRefinementConfig;
  /** Provider request timeout, ms. */
  timeoutMs: number;
  /** Discovery cache TTL, ms. 0 disables caching. */
  cacheTtlMs: number;
  http: HttpProviderConfig;
  canopy: CanopyConfig;
  llm: LlmConfig;
}

/**
 * Filters Amazon applies server-side, as part of the same search request.
 *
 * These are the refinements from Amazon's own sidebar, so they cost no extra
 * quota and narrow the pool *before* the 40-candidate page is cut — which is
 * strictly better than filtering locally afterwards, where a rejected product
 * has already consumed one of the 40 slots.
 */
export interface SearchRefinementConfig {
  /** Amazon's "Free UK Delivery by Amazon". */
  freeDelivery: boolean;
  /**
   * Amazon's "Get It Tomorrow". Note this is *stricter* than "within a week":
   * Amazon publishes no one-week refinement, so next-day is the closest
   * available, and switching it on will exclude items arriving in 2–6 days.
   */
  fastDelivery: boolean;
}

export interface CanopyConfig {
  apiKey: string | null;
  /**
   * Spend one extra request per shortlisted product to fetch specs and
   * description. Off by default: it turns one search into four requests, which
   * on the 100/month free tier is the difference between 100 searches and 25.
   */
  enrichResults: boolean;
}

/**
 * Config for the generic HTTP provider. Every field is data, not code — a new
 * upstream product API is onboarded by setting env vars, not by editing
 * business logic (Phase 1 requirement).
 */
export interface HttpProviderConfig {
  searchUrl: string | null;
  lookupUrl: string | null;
  apiKey: string | null;
  /** Header the API key is sent in, e.g. "x-api-key" or "Authorization". */
  apiKeyHeader: string;
  /** Optional prefix, e.g. "Bearer ". */
  apiKeyPrefix: string;
  /** Extra static headers as a JSON object. */
  headers: Record<string, string>;
  /**
   * Dot-path into the response body that holds the product array
   * (e.g. "data.products"). Empty string means the body is the array.
   */
  resultsPath: string;
  /** Field mapping: normalized field -> dot-path in the provider's product object. */
  fieldMap: Record<string, string>;
}

export interface LlmConfig {
  /** When absent, the deterministic ranking engine is used on its own. */
  apiKey: string | null;
  model: string;
  baseUrl: string;
  timeoutMs: number;
}

const num = (raw: string | undefined, fallback: number): number => {
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const json = <T>(raw: string | undefined, fallback: T): T => {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    // A malformed mapping should degrade to the defaults, not 500 the route.
    console.warn('[product-finder] ignoring malformed JSON in provider config');
    return fallback;
  }
};

/**
 * Default field mapping, written against the shape most third-party Amazon
 * product APIs already use. Override any subset via PRODUCT_PROVIDER_FIELD_MAP.
 */
const DEFAULT_FIELD_MAP: Record<string, string> = {
  asin: 'asin',
  name: 'title',
  brand: 'brand',
  category: 'category',
  images: 'images',
  description: 'description',
  price: 'price.value',
  currency: 'price.currency',
  originalPrice: 'price.list_price',
  rating: 'rating',
  reviewCount: 'ratings_total',
  availability: 'availability.raw',
  deliveryText: 'delivery.raw',
  productUrl: 'link',
  specifications: 'specifications',
};

export function loadConfig(): ProductFinderConfig {
  const env = process.env;

  return {
    providerId: env.PRODUCT_PROVIDER ?? 'catalog',
    // Defaults to the curated catalog: on a free-tier API key, running out of
    // quota should surface our own reviews, not an error page.
    fallbackProviderId: env.PRODUCT_FALLBACK_PROVIDER ?? 'catalog',
    marketplace: env.PRODUCT_MARKETPLACE ?? 'amazon.co.uk',
    affiliateTag: env.AMAZON_AFFILIATE_TAG ?? 'lovelytools-21',
    // 40 to match what the Canopy GraphQL search asks for. It was 24, which was
    // both unreachable (the REST endpoint returned one ~16-row page) and, once
    // GraphQL raised the ceiling, would have thrown away a third of the pool.
    candidateLimit: num(env.PRODUCT_CANDIDATE_LIMIT, 40),
    resultLimit: num(env.PRODUCT_RESULT_LIMIT, 5),
    topBrandCount: num(env.PRODUCT_TOP_BRAND_COUNT, 3),
    cheaperAlternativeCount: num(env.PRODUCT_CHEAPER_ALTERNATIVE_COUNT, 2),
    refinements: {
      freeDelivery: env.PRODUCT_REQUIRE_FREE_DELIVERY !== 'false',
      // Off unless asked for: "Get It Tomorrow" is the only delivery-speed
      // refinement Amazon publishes, and it is much stricter than a week.
      fastDelivery: env.PRODUCT_REQUIRE_FAST_DELIVERY === 'true',
    },
    // 90s, not 45s. A refined search — where Amazon applies the delivery
    // filters itself — measured 35.7s against Canopy, and Canopy's own free
    // tier has since shown queries (refined or not) occasionally running
    // 30-45s on its own. 45s left no room for the unrefined retry
    // (see canopy-provider.ts) to land before the outer budget expired, which
    // aborted a real-but-slow answer and degraded silently to the curated
    // catalog. 90s trades a longer worst-case wait for actually getting the
    // live answer instead of giving up on it.
    timeoutMs: num(env.PRODUCT_PROVIDER_TIMEOUT_MS, 90_000),
    cacheTtlMs: num(env.PRODUCT_CACHE_TTL_MS, 10 * 60_000),
    http: {
      searchUrl: env.PRODUCT_PROVIDER_SEARCH_URL ?? null,
      lookupUrl: env.PRODUCT_PROVIDER_LOOKUP_URL ?? null,
      apiKey: env.PRODUCT_PROVIDER_API_KEY ?? null,
      apiKeyHeader: env.PRODUCT_PROVIDER_API_KEY_HEADER ?? 'x-api-key',
      apiKeyPrefix: env.PRODUCT_PROVIDER_API_KEY_PREFIX ?? '',
      headers: json<Record<string, string>>(env.PRODUCT_PROVIDER_HEADERS, {}),
      resultsPath: env.PRODUCT_PROVIDER_RESULTS_PATH ?? 'search_results',
      fieldMap: { ...DEFAULT_FIELD_MAP, ...json<Record<string, string>>(env.PRODUCT_PROVIDER_FIELD_MAP, {}) },
    },
    canopy: {
      apiKey: env.CANOPY_API_KEY ?? null,
      enrichResults: env.PRODUCT_ENRICH_RESULTS === 'true',
    },
    llm: {
      apiKey: env.ANTHROPIC_API_KEY ?? null,
      model: env.PRODUCT_FINDER_LLM_MODEL ?? 'claude-opus-5',
      baseUrl: env.ANTHROPIC_BASE_URL ?? 'https://api.anthropic.com',
      timeoutMs: num(env.PRODUCT_FINDER_LLM_TIMEOUT_MS, 45_000),
    },
  };
}
