/**
 * Phase 1 default provider — the site's own curated affiliate catalog.
 *
 * Zero configuration, no third-party dependency, no rate limit, and every
 * record is one we already wrote and stand behind. That makes it the honest
 * default: the finder works out of the box on a fresh checkout, and swapping in
 * a live provider (PRODUCT_PROVIDER=http, or a future paapi provider) changes
 * nothing above this file.
 *
 * Everything provider-specific lives here — including the fact that this store
 * records rating inside a trust-badge string and deliberately does not record
 * price. Parsing those quirks is this adapter's job; nothing downstream knows
 * the catalog exists.
 */

import { affiliateProducts, type AffiliateProduct } from '@/lib/affiliate-products';
import { matchesTerm, tokenize } from '../text';
import type { ProductFinderConfig } from '../config';
import type { IProductProvider } from '../provider';
import type { NormalizedProduct, ProductQuery } from '../types';

const PROVIDER_ID = 'catalog';

/** "4.4 rating" -> 4.4 ; "5.0 rating" -> 5 */
function parseRatingBadge(label: string): number | null {
  const match = /(\d+(?:\.\d+)?)\s*(?:rating|stars?|\/\s*5)/i.exec(label);
  if (!match?.[1]) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) && value >= 0 && value <= 5 ? value : null;
}

/** "3,016 reviews" -> 3016 ; "1K+ bought" -> null (not a review count) */
function parseReviewBadge(sublabel: string): number | null {
  const match = /([\d,]+)\s*reviews?/i.exec(sublabel);
  if (!match?.[1]) return null;
  const value = Number(match[1].replace(/,/g, ''));
  return Number.isFinite(value) ? value : null;
}

function ratingSignal(product: AffiliateProduct): { rating: number | null; reviewCount: number | null } {
  for (const badge of product.trustBadges) {
    const rating = parseRatingBadge(badge.label);
    if (rating !== null) {
      return { rating, reviewCount: parseReviewBadge(badge.sublabel) };
    }
  }
  // No explicit rating badge: the editorial score is the only signal we have,
  // and it is a 0–10 scale. Converting it to stars is a fair reading of our own
  // review, and the ranking engine weights an inferred rating lower than a
  // provider-reported one via reviewCount being null.
  return { rating: Math.min(5, product.score / 2), reviewCount: null };
}

function toNormalized(product: AffiliateProduct): NormalizedProduct {
  const { rating, reviewCount } = ratingSignal(product);

  return {
    asin: product.asin,
    name: product.name,
    brand: product.brand,
    category: product.categoryLabel,
    images: [...product.images],
    description: product.description,
    specifications: product.specs.map((s) => ({ label: s.label, value: s.value })),
    // The catalog intentionally stores no price — the affiliate template always
    // sends buyers to Amazon for the live figure. Reporting null is correct;
    // inventing one would be worse than showing "See price on Amazon".
    price: null,
    originalPrice: null,
    discountPercent: null,
    rating,
    reviewCount,
    availability: 'unknown',
    delivery: { free: null, text: null },
    productUrl: `https://www.${product.amazonDomain}/dp/${product.asin}`,
    marketplace: product.amazonDomain,
    source: PROVIDER_ID,
    reviewSlug: product.slug,
  };
}

/** Cheap BM25-ish scoring over the fields a shopper would actually type. */
function relevance(product: AffiliateProduct, terms: string[]): { score: number; coversAllTerms: boolean } {
  const name = `${product.brand} ${product.name}`.toLowerCase();
  const haystack = [
    name,
    product.categoryLabel,
    product.tagline,
    product.description,
    product.specs.map((s) => `${s.label} ${s.value}`).join(' '),
    product.features.map((f) => `${f.title} ${f.body}`).join(' '),
  ]
    .join(' ')
    .toLowerCase();

  let score = 0;
  for (const term of terms) {
    if (matchesTerm(name, term)) score += 12;
    else if (matchesTerm(product.categoryLabel, term)) score += 6;
    else if (matchesTerm(haystack, term)) score += 3;
  }
  // Every term matching somewhere is a much stronger signal than one term
  // matching three times, so reward full coverage explicitly.
  const covered = terms.filter((t) => matchesTerm(haystack, t)).length;
  const coversAllTerms = covered === terms.length;
  if (coversAllTerms) score += 10;
  return { score, coversAllTerms };
}

export function createCatalogProvider(_config: ProductFinderConfig): IProductProvider {
  return {
    id: PROVIDER_ID,
    label: 'lovelytools.ai curated catalog',
    coverage: 'curated',

    async search(query: ProductQuery): Promise<NormalizedProduct[]> {
      const terms = tokenize(query.keyword ?? '');

      if (terms.length === 0) return affiliateProducts.slice(0, query.limit).map(toNormalized);

      return affiliateProducts
        .map((product) => ({ product, ...relevance(product, terms) }))
        // Requiring every search word to appear somewhere on the listing is
        // deliberately strict: this is the last-resort fallback shown when
        // Amazon itself is unreachable, and a shopper who searched "air
        // freshener" getting an air pump back — because "air" alone was
        // enough to score above zero — is a worse outcome than an honest
        // "nothing in our catalog matches that".
        .filter((r) => r.coversAllTerms)
        .sort((a, b) => b.score - a.score)
        .slice(0, query.limit)
        .map((r, index) => ({ ...toNormalized(r.product), sourceRank: index }));
    },

    async getByAsin(asin: string): Promise<NormalizedProduct | null> {
      const match = affiliateProducts.find((p) => p.asin.toUpperCase() === asin.toUpperCase());
      return match ? toNormalized(match) : null;
    },

    async findAlternatives(product, limit): Promise<NormalizedProduct[]> {
      // Same category, excluding the product itself — the closest thing to
      // "similar items" this corpus can honestly support.
      return affiliateProducts
        .filter((p) => p.categoryLabel === product.category && p.asin !== product.asin)
        .slice(0, limit)
        .map(toNormalized);
    },
  };
}
