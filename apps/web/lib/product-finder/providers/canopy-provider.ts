/**
 * Canopy API provider — https://rest.canopyapi.co
 *
 * A licensed Amazon product data API. This is a dedicated provider rather than
 * a configuration of `http-provider` because Canopy's two endpoints do not
 * share a response shape:
 *
 *   search → data.amazonProductSearchResults.productResults.results[]  (lean)
 *   lookup → data.amazonProduct                                        (rich)
 *
 * and the generic provider only supports one results path. The lean/rich split
 * also matters to the rest of the system: search results carry no brand,
 * description, specifications or stock, so they are normalized honestly as
 * "not reported" rather than padded with guesses.
 *
 * Quota shape: the free tier is 100 requests/month. One search is one request,
 * so results are deliberately NOT enriched with a per-product lookup by default
 * — that would cost 4 requests per search instead of 1. The rich data is
 * fetched when someone actually opens a product. Set PRODUCT_ENRICH_RESULTS=true
 * to trade quota for fuller result cards.
 */

import type { ProductFinderConfig } from '../config';
import type { IProductProvider } from '../provider';
import { deriveProductQuery } from '../text';
import {
  ProductProviderError,
  isProductProviderError,
  type Availability,
  type Money,
  type NormalizedProduct,
  type ProductQuery,
  type ProductSpec,
} from '../types';

const PROVIDER_ID = 'canopy';
const BASE_URL = 'https://rest.canopyapi.co/api/amazon';
const GRAPHQL_URL = 'https://graphql.canopyapi.co/';

/**
 * Candidates requested per search.
 *
 * The REST search endpoint returns one page — 16 organic rows once sponsored
 * placements are stripped, which is exactly Amazon's own page 1. Ranking "the
 * three best" out of 16 is a weaker claim than it sounds. The GraphQL endpoint
 * takes an explicit `limit`, so the pool more than doubles for the *same single
 * request*; deeper pagination is deliberately not used, because each extra page
 * is another request against a 100/month free tier.
 */
const SEARCH_LIMIT = 40;

/** Canopy addresses stores by short code, not by hostname. */
const DOMAIN_BY_MARKETPLACE: Record<string, string> = {
  'amazon.co.uk': 'UK',
  'amazon.com': 'US',
  'amazon.de': 'DE',
  'amazon.fr': 'FR',
  'amazon.it': 'IT',
  'amazon.es': 'ES',
  'amazon.ca': 'CA',
  'amazon.com.mx': 'MX',
  'amazon.com.br': 'BR',
  'amazon.in': 'IN',
  'amazon.co.jp': 'JP',
  'amazon.com.au': 'AU',
};

const toDomain = (marketplace: string): string =>
  DOMAIN_BY_MARKETPLACE[marketplace.toLowerCase().replace(/^www\./, '')] ?? 'UK';

/* ─────────────────────────── wire types ─────────────────────────── */

interface CanopyPrice {
  value?: number | null;
  currency?: string | null;
}

interface CanopySearchItem {
  sponsored?: boolean;
  title?: string;
  url?: string;
  asin?: string;
  price?: CanopyPrice | null;
  mainImageUrl?: string | null;
  rating?: number | null;
  ratingsTotal?: number | null;
  isPrime?: boolean | null;
}

interface CanopyProduct extends CanopySearchItem {
  subtitle?: string | null;
  brand?: string | null;
  isInStock?: boolean | null;
  imageUrls?: string[] | null;
  featureBullets?: string[] | null;
  technicalSpecifications?: { name?: string; value?: string }[] | null;
  categories?: { name?: string }[] | null;
}

/* ─────────────────────────── normalization ─────────────────────────── */

function money(price: CanopyPrice | null | undefined): Money | null {
  if (!price || typeof price.value !== 'number' || price.value <= 0) return null;
  return { amount: price.value, currency: price.currency ?? 'GBP' };
}

/**
 * Splits an Amazon title into brand + rest when the brand is known.
 * Search results have no `brand` field, and rendering an empty brand line in
 * the card's design leaves a visible gap — the first token is a better guess
 * than nothing, and the detail page corrects it from the real field.
 */
function splitBrand(title: string, brand: string | null | undefined): { brand: string; name: string } {
  if (brand) {
    const prefix = new RegExp(`^${brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s+`, 'i');
    return { brand, name: title.replace(prefix, '') };
  }
  const [first = '', ...rest] = title.split(/\s+/);
  return rest.length > 0 ? { brand: first, name: rest.join(' ') } : { brand: '', name: title };
}

function specs(raw: CanopyProduct['technicalSpecifications']): ProductSpec[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((s) => (s?.name && s?.value ? { label: s.name, value: s.value } : null))
    .filter((s): s is ProductSpec => s !== null);
}

function availability(inStock: boolean | null | undefined): Availability {
  if (inStock === true) return 'in_stock';
  if (inStock === false) return 'out_of_stock';
  return 'unknown';
}

function normalize(raw: CanopyProduct, marketplace: string, sourceRank?: number): NormalizedProduct | null {
  const asin = raw.asin?.toUpperCase();
  const title = raw.title?.trim();
  if (!asin || !title) return null;

  const { brand, name } = splitBrand(title, raw.brand);
  const images = [raw.mainImageUrl, ...(raw.imageUrls ?? [])].filter(
    (url): url is string => typeof url === 'string' && url.length > 0,
  );

  return {
    asin,
    name,
    brand,
    // Empty, not a placeholder: search results carry no categories at all, and
    // a literal "Amazon" here was surfacing as the category badge on every
    // auto-published card. The adapter infers a real one instead.
    category: raw.categories?.[0]?.name ?? '',
    // Deduped: mainImageUrl is often also present in imageUrls.
    images: [...new Set(images)],
    description: (raw.featureBullets ?? []).slice(0, 3).join(' '),
    specifications: specs(raw.technicalSpecifications),
    price: money(raw.price),
    // Canopy reports one price, not a was/now pair, so there is no discount to
    // compute. Reporting null is correct; inferring a "was" price would be
    // inventing a saving that may not exist.
    originalPrice: null,
    discountPercent: null,
    rating: typeof raw.rating === 'number' ? raw.rating : null,
    reviewCount: typeof raw.ratingsTotal === 'number' ? raw.ratingsTotal : null,
    availability: availability(raw.isInStock),
    // Prime implies free delivery for Prime members, which is not the same as
    // free delivery for everyone — so it is recorded as text, not as a promise.
    delivery: { free: null, text: raw.isPrime ? 'Prime delivery available' : null },
    productUrl: raw.url ?? `https://www.${marketplace}/dp/${asin}`,
    marketplace,
    source: PROVIDER_ID,
    sourceRank,
  };
}

/* ─────────────────────────── transport ─────────────────────────── */

async function request<T>(path: string, apiKey: string, signal: AbortSignal): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      headers: { 'API-KEY': apiKey, accept: 'application/json' },
      signal,
      cache: 'no-store',
    });
  } catch (cause) {
    if (signal.aborted) {
      throw new ProductProviderError('timeout', 'Canopy did not respond in time.', PROVIDER_ID, { cause });
    }
    throw new ProductProviderError('provider_unavailable', 'Could not reach Canopy.', PROVIDER_ID, { cause });
  }

  if (response.status === 401 || response.status === 403) {
    throw new ProductProviderError('unauthorized', 'Canopy rejected the API key.', PROVIDER_ID);
  }
  if (response.status === 429) {
    // The free tier is 100 requests/month — this is the expected end of it, and
    // the composite provider turns it into a fallback rather than an error page.
    throw new ProductProviderError('rate_limited', 'Canopy quota exhausted.', PROVIDER_ID);
  }
  if (response.status === 404) {
    throw new ProductProviderError('not_found', 'Canopy has no record of that product.', PROVIDER_ID);
  }
  if (!response.ok) {
    throw new ProductProviderError('provider_unavailable', `Canopy returned ${response.status}.`, PROVIDER_ID);
  }

  try {
    return (await response.json()) as T;
  } catch (cause) {
    throw new ProductProviderError('malformed_response', 'Canopy returned invalid JSON.', PROVIDER_ID, { cause });
  }
}

/**
 * Search via GraphQL, which — unlike the REST endpoint — accepts a result limit.
 *
 * The domain is inlined as an enum literal rather than passed as a variable, so
 * this does not depend on knowing Canopy's enum type name. Errors are raised as
 * `malformed_response` so the caller can retry over REST: a schema change at
 * Canopy should cost us pool size, not the whole search.
 */
async function searchViaGraphql(
  keyword: string,
  marketplace: string,
  apiKey: string,
  signal: AbortSignal,
): Promise<CanopySearchItem[]> {
  const query = `query Search($term: String!) {
    amazonProductSearchResults(input: { searchTerm: $term, domain: ${toDomain(marketplace)} }) {
      productResults(input: { page: 1, limit: ${SEARCH_LIMIT} }) {
        results { asin title url price { value currency } mainImageUrl rating ratingsTotal isPrime sponsored }
      }
    }
  }`;

  let response: Response;
  try {
    response = await fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: { 'API-KEY': apiKey, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ query, variables: { term: keyword } }),
      signal,
      cache: 'no-store',
    });
  } catch (cause) {
    if (signal.aborted) {
      throw new ProductProviderError('timeout', 'Canopy did not respond in time.', PROVIDER_ID, { cause });
    }
    throw new ProductProviderError('provider_unavailable', 'Could not reach Canopy.', PROVIDER_ID, { cause });
  }

  // Auth and quota are real conditions, not schema problems — surface them
  // as-is so the composite provider degrades instead of burning a second
  // request on a REST call that is certain to fail the same way.
  if (response.status === 401 || response.status === 403) {
    throw new ProductProviderError('unauthorized', 'Canopy rejected the API key.', PROVIDER_ID);
  }
  if (response.status === 429) {
    throw new ProductProviderError('rate_limited', 'Canopy quota exhausted.', PROVIDER_ID);
  }
  if (!response.ok) {
    throw new ProductProviderError('malformed_response', `Canopy GraphQL returned ${response.status}.`, PROVIDER_ID);
  }

  const body = (await response.json()) as {
    errors?: { message?: string }[];
    data?: { amazonProductSearchResults?: { productResults?: { results?: CanopySearchItem[] } } };
  };

  // GraphQL reports field errors in a 200 response, so a bad query looks like
  // success until the payload is inspected.
  if (body.errors?.length) {
    throw new ProductProviderError(
      'malformed_response',
      `Canopy GraphQL rejected the query: ${body.errors[0]?.message ?? 'unknown error'}`,
      PROVIDER_ID,
    );
  }

  return body.data?.amazonProductSearchResults?.productResults?.results ?? [];
}

/* ─────────────────────────── provider ─────────────────────────── */

export function createCanopyProvider(config: ProductFinderConfig): IProductProvider {
  const apiKey = config.canopy.apiKey;
  const enrich = config.canopy.enrichResults;

  const requireKey = (): string => {
    if (!apiKey) {
      throw new ProductProviderError(
        'unauthorized',
        'PRODUCT_PROVIDER=canopy needs CANOPY_API_KEY to be set.',
        PROVIDER_ID,
      );
    }
    return apiKey;
  };

  const lookup = async (asin: string, marketplace: string, signal: AbortSignal) => {
    const body = await request<{ data?: { amazonProduct?: CanopyProduct | null } }>(
      `/product?asin=${encodeURIComponent(asin)}&domain=${toDomain(marketplace)}`,
      requireKey(),
      signal,
    );
    const product = body.data?.amazonProduct;
    return product ? normalize(product, marketplace) : null;
  };

  return {
    id: PROVIDER_ID,
    label: 'Canopy Amazon data',
    coverage: 'marketplace',

    async search(query: ProductQuery, signal: AbortSignal): Promise<NormalizedProduct[]> {
      const key = requireKey();
      const keyword = query.keyword ?? '';

      let results: CanopySearchItem[];
      try {
        results = await searchViaGraphql(keyword, query.marketplace, key, signal);
      } catch (error) {
        // Only a schema/transport problem falls back to REST. Auth failures and
        // quota exhaustion would fail identically there, and retrying would
        // spend a second request to learn nothing.
        if (!isProductProviderError(error) || error.code !== 'malformed_response') throw error;
        console.warn('[product-finder] Canopy GraphQL search failed, retrying over REST', error.message);

        const body = await request<{
          data?: { amazonProductSearchResults?: { productResults?: { results?: CanopySearchItem[] } } };
        }>(
          `/search?searchTerm=${encodeURIComponent(keyword)}&domain=${toDomain(query.marketplace)}`,
          key,
          signal,
        );
        results = body.data?.amazonProductSearchResults?.productResults?.results ?? [];
      }

      const products = results
        // Sponsored rows are paid placements, not merit. A tool whose entire
        // premise is "here is the best one" must not rank an advert first.
        .filter((item) => item.sponsored !== true)
        // Rank is assigned after removing ads, so position reflects organic
        // relevance rather than how much shelf space was sold above it.
        .map((item, index) => normalize(item, query.marketplace, index))
        .filter((p): p is NormalizedProduct => p !== null)
        .slice(0, query.limit);

      if (!enrich) return products;

      // Opt-in: spend one request per product for specs and description.
      const enriched = await Promise.all(
        products.map(async (product) => {
          try {
            return (await lookup(product.asin, query.marketplace, signal)) ?? product;
          } catch {
            return product; // enrichment is a bonus, never a failure mode
          }
        }),
      );
      return enriched;
    },

    getByAsin: (asin, marketplace, signal) => lookup(asin, marketplace, signal),

    async findAlternatives(product, limit, signal): Promise<NormalizedProduct[]> {
      // Canopy has no "similar items" endpoint, so alternatives come from a
      // search built out of the product's own name. `deriveProductQuery` is
      // shared with the discovery service, which scores those alternatives for
      // relevance — searching for one phrase and grading against another would
      // let junk through the gap.
      const keyword = deriveProductQuery(product.brand, product.name);

      const results = await this.search(
        { keyword, marketplace: product.marketplace, limit: limit + 1 },
        signal,
      );
      return results.filter((p) => p.asin !== product.asin).slice(0, limit);
    },
  };
}
