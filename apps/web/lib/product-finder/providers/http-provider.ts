/**
 * Configurable HTTP/JSON provider.
 *
 * This is the Phase 1 "bring your own data source" implementation: it makes no
 * assumption about which upstream product API you point it at. Endpoint, auth
 * header, static headers, the path to the results array, and the mapping from
 * their field names to ours are all environment data (see config.ts), so a new
 * upstream is onboarded by setting env vars — never by editing this file, and
 * certainly never by editing anything above the provider layer.
 *
 * Deliberately *not* here: any scraping technique, HTML parsing, CSS/XPath
 * selector, or bot-evasion. This provider speaks JSON to an API you are
 * licensed to call.
 */

import type { ProductFinderConfig, HttpProviderConfig } from '../config';
import type { IProductProvider } from '../provider';
import {
  ProductProviderError,
  type Availability,
  type Money,
  type NormalizedProduct,
  type ProductQuery,
  type ProductSpec,
} from '../types';

const PROVIDER_ID = 'http';

/** Reads "a.b.0.c" out of an arbitrary JSON value. Returns undefined on any miss. */
function readPath(source: unknown, path: string): unknown {
  if (!path) return source;
  let current: unknown = source;
  for (const segment of path.split('.')) {
    if (current === null || current === undefined) return undefined;
    if (Array.isArray(current)) {
      const index = Number(segment);
      current = Number.isInteger(index) ? current[index] : undefined;
    } else if (typeof current === 'object') {
      current = (current as Record<string, unknown>)[segment];
    } else {
      return undefined;
    }
  }
  return current;
}

const asString = (value: unknown): string | null => {
  if (typeof value === 'string') return value.trim() || null;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return null;
};

const asNumber = (value: unknown): number | null => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    // Tolerates "£129.99", "1,234", "4.4 out of 5".
    const parsed = Number(value.replace(/[^\d.-]/g, ''));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

function asImages(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      if (typeof entry === 'string') return entry;
      if (entry && typeof entry === 'object') {
        const record = entry as Record<string, unknown>;
        return asString(record.link ?? record.url ?? record.image ?? record.src);
      }
      return null;
    })
    .filter((url): url is string => typeof url === 'string' && url.length > 0);
}

function asSpecs(value: unknown): ProductSpec[] {
  if (Array.isArray(value)) {
    return value
      .map((entry) => {
        if (!entry || typeof entry !== 'object') return null;
        const record = entry as Record<string, unknown>;
        const label = asString(record.name ?? record.label ?? record.key);
        const text = asString(record.value ?? record.text);
        return label && text ? { label, value: text } : null;
      })
      .filter((s): s is ProductSpec => s !== null);
  }
  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .map(([label, raw]) => {
        const text = asString(raw);
        return text ? { label, value: text } : null;
      })
      .filter((s): s is ProductSpec => s !== null);
  }
  return [];
}

/** Reads free-text availability into the three-valued domain type. */
function asAvailability(value: unknown): Availability {
  const text = asString(value)?.toLowerCase();
  if (!text) return 'unknown';
  if (/out of stock|unavailable|currently unavailable|sold out/.test(text)) return 'out_of_stock';
  if (/in stock|available|dispatch|ships|left in stock|order soon/.test(text)) return 'in_stock';
  return 'unknown';
}

function asDeliveryFree(text: string | null): boolean | null {
  if (!text) return null;
  const lower = text.toLowerCase();
  if (/free\s+(?:\w+\s+){0,2}(?:delivery|shipping|returns?)/.test(lower)) return true;
  if (/\+?\s*[£$€]\s*\d/.test(lower)) return false;
  return null;
}

function money(amount: number | null, currency: string | null): Money | null {
  if (amount === null || amount <= 0) return null;
  return { amount, currency: currency ?? 'GBP' };
}

function discount(price: Money | null, original: Money | null): number | null {
  if (!price || !original || original.amount <= price.amount) return null;
  return Math.round(((original.amount - price.amount) / original.amount) * 100);
}

function normalize(raw: unknown, http: HttpProviderConfig, marketplace: string): NormalizedProduct | null {
  const map = http.fieldMap;
  const field = (key: string) => readPath(raw, map[key] ?? key);

  const asin = asString(field('asin'))?.toUpperCase();
  const name = asString(field('name'));
  // Without these two there is no product to show, and a half-empty card is
  // worse than one fewer result — drop it rather than render placeholders.
  if (!asin || !name) return null;

  const currency = asString(field('currency'));
  const price = money(asNumber(field('price')), currency);
  const originalPrice = money(asNumber(field('originalPrice')), currency);
  const deliveryText = asString(field('deliveryText'));

  return {
    asin,
    name,
    // No brand field? The first word of an Amazon title is the brand often
    // enough to be a better guess than an empty badge.
    brand: asString(field('brand')) ?? name.split(/\s+/)[0] ?? '',
    category: asString(field('category')) ?? 'Amazon',
    images: asImages(field('images')),
    description: asString(field('description')) ?? '',
    specifications: asSpecs(field('specifications')),
    price,
    originalPrice,
    discountPercent: discount(price, originalPrice),
    rating: asNumber(field('rating')),
    reviewCount: asNumber(field('reviewCount')),
    availability: asAvailability(field('availability')),
    delivery: { free: asDeliveryFree(deliveryText), text: deliveryText },
    productUrl: asString(field('productUrl')) ?? `https://www.${marketplace}/dp/${asin}`,
    marketplace,
    source: PROVIDER_ID,
  };
}

function buildHeaders(http: HttpProviderConfig): HeadersInit {
  const headers: Record<string, string> = { accept: 'application/json', ...http.headers };
  if (http.apiKey) headers[http.apiKeyHeader] = `${http.apiKeyPrefix}${http.apiKey}`;
  return headers;
}

/** Substitutes {keyword}, {asin}, {marketplace}, {limit} into a configured URL template. */
function expand(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? encodeURIComponent(String(values[key])) : match,
  );
}

async function fetchJson(url: string, http: HttpProviderConfig, signal: AbortSignal): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(url, { headers: buildHeaders(http), signal, cache: 'no-store' });
  } catch (cause) {
    if (signal.aborted) {
      throw new ProductProviderError('timeout', 'The product provider did not respond in time.', PROVIDER_ID, { cause });
    }
    throw new ProductProviderError('provider_unavailable', 'Could not reach the product provider.', PROVIDER_ID, { cause });
  }

  if (response.status === 401 || response.status === 403) {
    throw new ProductProviderError('unauthorized', 'The product provider rejected our credentials.', PROVIDER_ID);
  }
  if (response.status === 429) {
    throw new ProductProviderError('rate_limited', 'The product provider is rate limiting us. Try again shortly.', PROVIDER_ID);
  }
  if (!response.ok) {
    throw new ProductProviderError(
      'provider_unavailable',
      `The product provider returned ${response.status}.`,
      PROVIDER_ID,
    );
  }

  try {
    return await response.json();
  } catch (cause) {
    throw new ProductProviderError('malformed_response', 'The product provider returned invalid JSON.', PROVIDER_ID, { cause });
  }
}

function requireUrl(template: string | null, which: 'search' | 'lookup'): string {
  if (!template) {
    throw new ProductProviderError(
      'provider_unavailable',
      `PRODUCT_PROVIDER=http needs PRODUCT_PROVIDER_${which.toUpperCase()}_URL to be set.`,
      PROVIDER_ID,
    );
  }
  return template;
}

export function createHttpProvider(config: ProductFinderConfig): IProductProvider {
  const http = config.http;

  const collect = (body: unknown): unknown[] => {
    const results = readPath(body, http.resultsPath);
    if (Array.isArray(results)) return results;
    // Lookup endpoints commonly return a single object rather than an array.
    if (results && typeof results === 'object') return [results];
    return [];
  };

  return {
    id: PROVIDER_ID,
    label: 'Configured product API',
    coverage: 'marketplace',

    async search(query: ProductQuery, signal: AbortSignal): Promise<NormalizedProduct[]> {
      const url = expand(requireUrl(http.searchUrl, 'search'), {
        keyword: query.keyword ?? '',
        marketplace: query.marketplace,
        limit: query.limit,
      });
      const body = await fetchJson(url, http, signal);
      return collect(body)
        .map((raw) => normalize(raw, http, query.marketplace))
        .filter((p): p is NormalizedProduct => p !== null)
        .slice(0, query.limit);
    },

    async getByAsin(asin: string, marketplace: string, signal: AbortSignal): Promise<NormalizedProduct | null> {
      const url = expand(requireUrl(http.lookupUrl, 'lookup'), { asin, marketplace });
      const body = await fetchJson(url, http, signal);
      const [first] = collect(body);
      return first ? normalize(first, http, marketplace) : null;
    },
  };
}
