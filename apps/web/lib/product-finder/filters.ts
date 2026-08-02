/**
 * The search filter pipeline, applied in the order the spec fixes:
 *
 *   1. Keyword relevance
 *   2. Rating >= 4
 *   3. Free UK delivery
 *   4. Prefer discounted products
 *   5. Availability
 *   6. AI ranking            <- ranking.ts, not here
 *
 * Two kinds of stage. `exclude` stages remove products; `prefer` stages leave
 * the set alone and contribute a 0–1 preference score that the ranking engine
 * folds in as a signal. That distinction matters: "prefer discounted" must not
 * silently delete every full-price product, and a hard filter on a field the
 * provider doesn't report (delivery terms, stock) would delete everything.
 *
 * Relaxation: exclude stages are re-run in reverse order when the survivors
 * drop below the requested result count, so a narrow query degrades to "here
 * are the closest matches, and here's which filter we had to loosen" instead of
 * an empty page. Every decision is reported back so the results page can show
 * the applied filters honestly rather than claiming filters that did nothing.
 */

import { matchesTerm, tokenize } from './text';
import type { NormalizedProduct } from './types';

export type FilterMode = 'exclude' | 'prefer';

export interface AppliedFilter {
  id: string;
  label: string;
  mode: FilterMode;
  /** False when the stage had nothing to act on (e.g. no keyword for an ASIN lookup). */
  active: boolean;
  /** True when the stage was rolled back to keep the result set non-empty. */
  relaxed: boolean;
  removed: number;
}

export interface FilterOutcome {
  products: NormalizedProduct[];
  applied: AppliedFilter[];
  /** asin -> 0–1 preference score from the `prefer` stages. */
  preference: Map<string, number>;
}

export interface FilterContext {
  keyword: string | null;
  minResults: number;
}

const MIN_RATING = 4;

/**
 * How well a product answers the query, 0–1.
 *
 * Term coverage, weighted by *where* each term matched. A term in the brand or
 * product name is what the shopper is actually asking for; the same word buried
 * in a spec table or a marketing paragraph is a weaker signal — which is what
 * separates a cordless drill from a cordless tyre inflator when the query is
 * "cordless drill". Recall stays generous (a partial match still scores) so a
 * near-miss can be shown when nothing better exists.
 */
export function relevanceScore(product: NormalizedProduct, keyword: string): number {
  const terms = tokenize(keyword);
  if (terms.length === 0) return 1;

  const title = `${product.brand} ${product.name}`.toLowerCase();
  const secondary = [
    product.category,
    product.description,
    product.specifications.map((s) => `${s.label} ${s.value}`).join(' '),
  ]
    .join(' ')
    .toLowerCase();

  const total = terms.reduce((sum, term) => {
    if (matchesTerm(title, term)) return sum + 1;
    if (matchesTerm(secondary, term)) return sum + 0.6;
    return sum;
  }, 0);

  return total / terms.length;
}

/** Below this share of matched query terms, a result is noise rather than a near-miss. */
const RELEVANCE_FLOOR = 0.34;

/**
 * Collapses colour/size variants of the same product.
 *
 * Amazon lists each variant under its own ASIN, and a keyword search happily
 * returns all of them — "wireless headphones" came back as the Sony WH-CH520 in
 * Black, Blue and Beige: three ASINs, one product, identical £24.17 and
 * identical 44,619 reviews. A shortlist of three that is really one product is
 * worthless, so variants are merged before anything is ranked.
 *
 * The key is brand plus the title up to its first comma, which is where Amazon
 * puts the model before the feature list ("WH-CH520 Wireless Bluetooth On-Ear
 * Headphones" for all three). That is deliberately conservative: two genuinely
 * different products from one brand — EasyImpact vs AdvancedImpact — differ
 * within that prefix and are correctly kept apart.
 */
function dedupeVariants(products: NormalizedProduct[]): { kept: NormalizedProduct[]; removed: number } {
  const seen = new Set<string>();
  const kept: NormalizedProduct[] = [];

  for (const product of products) {
    const model = product.name
      .split(',')[0]!
      .toLowerCase()
      .replace(/[^a-z0-9\s]+/g, ' ')
      .trim()
      .split(/\s+/)
      .slice(0, 8)
      .join(' ');
    const key = `${product.brand.toLowerCase()}|${model}`;

    if (seen.has(key)) continue;
    seen.add(key);
    kept.push(product);
  }

  return { kept, removed: products.length - kept.length };
}

interface ExcludeStage {
  id: string;
  label: string;
  /**
   * False when this stage cannot be evaluated at all — no keyword to match, or
   * not one candidate carries the field. A stage that had nothing to judge is
   * reported as inactive rather than as a filter that "passed everything",
   * because showing "Free delivery ✓" when no listing reported delivery terms
   * is a claim we have not earned.
   */
  isActive(products: NormalizedProduct[], ctx: FilterContext): boolean;
  keep(product: NormalizedProduct, ctx: FilterContext): boolean;
}

const EXCLUDE_STAGES: ExcludeStage[] = [
  {
    id: 'relevance',
    label: 'Keyword relevance',
    isActive: (_products, ctx) => Boolean(ctx.keyword),
    keep: (product, ctx) => relevanceScore(product, ctx.keyword ?? '') >= RELEVANCE_FLOOR,
  },
  {
    id: 'rating',
    label: 'Rated 4.0 and above',
    isActive: (products) => products.some((p) => p.rating !== null),
    // An unknown rating is not a bad rating. Dropping unrated products here
    // would silently exclude every provider that doesn't report ratings.
    keep: (product) => product.rating === null || product.rating >= MIN_RATING,
  },
  {
    id: 'delivery',
    label: 'Free delivery',
    isActive: (products) => products.some((p) => p.delivery.free !== null),
    keep: (product) => product.delivery.free !== false,
  },
  {
    id: 'availability',
    label: 'In stock',
    isActive: (products) => products.some((p) => p.availability !== 'unknown'),
    keep: (product) => product.availability !== 'out_of_stock',
  },
];

/**
 * Stage 4 — preference, not exclusion. Returns 0–1 per product; the ranking
 * engine treats it as one weighted signal among several.
 */
function preferenceScore(product: NormalizedProduct): number {
  let score = 0;

  // Discount is the headline preference the spec asks for.
  if (product.discountPercent !== null) {
    score += Math.min(1, product.discountPercent / 40) * 0.6;
  }
  // A confirmed free-delivery product beats one where we simply don't know.
  if (product.delivery.free === true) score += 0.25;
  if (product.availability === 'in_stock') score += 0.15;

  return Math.min(1, score);
}

export function runFilters(candidates: NormalizedProduct[], ctx: FilterContext): FilterOutcome {
  const applied: AppliedFilter[] = [];

  // Variants collapse first: everything downstream — filter counts, ranking,
  // the comparison verdict — should be reasoning about distinct products.
  const deduped = dedupeVariants(candidates);
  let surviving = deduped.kept;

  applied.push({
    id: 'variants',
    label: 'Colour and size variants merged',
    mode: 'exclude',
    // Only claimed when it actually merged something.
    active: deduped.removed > 0,
    relaxed: false,
    removed: deduped.removed,
  });

  // Forward pass: apply each exclude stage in the specified order.
  const trail: { stage: ExcludeStage; before: NormalizedProduct[] }[] = [];
  for (const stage of EXCLUDE_STAGES) {
    const active = stage.isActive(candidates, ctx);
    if (!active) {
      applied.push({ id: stage.id, label: stage.label, mode: 'exclude', active: false, relaxed: false, removed: 0 });
      continue;
    }
    const before = surviving;
    surviving = surviving.filter((p) => stage.keep(p, ctx));
    trail.push({ stage, before });
    applied.push({
      id: stage.id,
      label: stage.label,
      mode: 'exclude',
      active: true,
      relaxed: false,
      removed: before.length - surviving.length,
    });
  }

  // Backward pass: undo the latest stages until we have enough to show. Order
  // matters — relevance is the last thing we give up, because a highly-rated
  // in-stock product that has nothing to do with the query is not a result.
  for (let i = trail.length - 1; i >= 0 && surviving.length < ctx.minResults; i -= 1) {
    const { stage, before } = trail[i]!;
    if (before.length === surviving.length) continue; // this stage removed nothing
    surviving = before;
    const record = applied.find((a) => a.id === stage.id);
    if (record) {
      record.relaxed = true;
      record.removed = 0;
    }
  }

  applied.push({
    id: 'discount',
    label: 'Discounted products preferred',
    mode: 'prefer',
    // Same honesty rule as the exclude stages: if not one candidate reported a
    // discount or delivery terms, there was no preference to express.
    active: candidates.some((p) => p.discountPercent !== null || p.delivery.free !== null),
    relaxed: false,
    removed: 0,
  });

  const preference = new Map(surviving.map((p) => [p.asin, preferenceScore(p)]));
  return { products: surviving, applied, preference };
}
