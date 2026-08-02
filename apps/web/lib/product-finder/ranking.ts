/**
 * The AI Ranking Engine.
 *
 * `IRankingEngine` is a seam of its own: the discovery service asks for an
 * analysis of a candidate set and gets back scores, reasoning and a comparison
 * verdict. Two implementations ship here —
 *
 *   · HeuristicRankingEngine — deterministic, offline, zero-dependency, and
 *     fully explainable: every point in the 0–100 score traces to a weighted
 *     signal that came out of the normalized product model, and the breakdown
 *     is returned so the UI can show *why* a product ranked where it did.
 *     This is the default and the always-available floor.
 *
 *   · ClaudeRankingEngine (claude-ranking.ts) — layered on top when
 *     ANTHROPIC_API_KEY is set. It writes the prose (pros, cons, best-for,
 *     buying recommendation) against the same evidence and inherits the
 *     heuristic scores as its baseline; any failure falls back silently.
 *
 * Nothing here invents facts. Every claim is derived from a field a provider
 * actually populated, and a signal the provider could not report degrades to a
 * neutral score with a note rather than a guess.
 */

import { relevanceScore } from './filters';
import type { Money, NormalizedProduct, ProductSpec } from './types';

export interface ScoreBreakdown {
  id: string;
  label: string;
  /** 0–100 for this dimension alone. */
  score: number;
  /** Contribution weight, 0–1. All weights sum to 1. */
  weight: number;
  /** One line explaining the number, shown in the "why this rank" panel. */
  note: string;
}

export interface ProductAnalysis {
  asin: string;
  rank: number; // 1-based
  aiScore: number; // 0–100
  headline: string;
  /** Why this product landed at this rank, relative to the rest of the shortlist. */
  rationale: string;
  pros: string[];
  cons: string[];
  bestFor: string[];
  notIdealFor: string[];
  recommendation: string;
  featureSummary: string;
  priceAnalysis: string;
  quickSpecs: ProductSpec[];
  breakdown: ScoreBreakdown[];
  engine: string;
}

export interface ComparisonVerdict {
  winnerAsin: string;
  bestBudgetAsin: string | null;
  bestPremiumAsin: string | null;
  bestValueAsin: string | null;
  summary: string;
}

export interface RankingResult {
  analyses: ProductAnalysis[];
  comparison: ComparisonVerdict | null;
  engine: string;
  /** Operator-facing notes, e.g. "LLM enrichment unavailable — heuristic only". */
  notes: string[];
}

export interface RankingInput {
  products: NormalizedProduct[];
  keyword: string | null;
  /** asin -> 0–1 preference score from the filter pipeline. */
  preference: Map<string, number>;
  /**
   * ASINs the user asked for by name (they pasted the link). These are the
   * subject of the query, not competitors in it, so they lead the list
   * regardless of score — burying someone's own product at #3 under
   * "alternatives" they never asked about is disorienting. The comparison
   * verdict still names the highest *scoring* product as the winner.
   */
  pinned?: string[];
  /**
   * True when `keyword` was derived from a pasted product rather than typed by
   * the user. Affects wording only — the scoring is identical.
   */
  keywordIsDerived?: boolean;
}

export interface IRankingEngine {
  readonly id: string;
  readonly label: string;
  rank(input: RankingInput, signal: AbortSignal): Promise<RankingResult>;
}

/* ────────────────────────────── helpers ────────────────────────────── */

export function formatMoney(value: Money | null): string | null {
  if (!value) return null;
  try {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: value.currency,
      maximumFractionDigits: 2,
    }).format(value.amount);
  } catch {
    return `${value.currency} ${value.amount.toFixed(2)}`;
  }
}

/**
 * Bounds a dimension score to 0–100 and rounds it.
 *
 * Rounding here rather than only at the end is load-bearing: these numbers are
 * rendered ("Customer rating 69/100") and read out by screen readers, and an
 * unrounded 68.88884706762741 is noise, not precision. Rounding each dimension
 * before weighting also means the breakdown the user sees adds up to the total
 * above it.
 */
const clamp = (value: number, min = 0, max = 100) => Math.round(Math.max(min, Math.min(max, value)));

const median = (values: number[]): number | null => {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const upper = sorted[mid]!;
  return sorted.length % 2 ? upper : (sorted[mid - 1]! + upper) / 2;
};

const formatCount = (n: number) => new Intl.NumberFormat('en-GB').format(n);

/**
 * Confidence in a rating, 0–1, from review volume. Log-scaled: the step from
 * 5 to 50 reviews matters far more than 5,000 to 50,000.
 */
const ratingConfidence = (reviewCount: number | null): number => {
  if (reviewCount === null || reviewCount <= 0) return 0.35; // unrated ≠ badly rated, but it isn't evidence either
  return Math.min(1, Math.log10(reviewCount + 1) / 3.5);
};

/* ─────────────────────── deterministic scoring ─────────────────────── */

/** Review count treated as "well established" when the shortlist has nothing bigger. */
const REVIEW_VOLUME_FLOOR = 1000;

interface SetContext {
  keyword: string | null;
  /** True when the keyword was built from a pasted product rather than typed. */
  keywordIsDerived: boolean;
  /** ASINs the user asked for by name — exact matches, not candidates. */
  pinned: Set<string>;
  /**
   * Whether any candidate published specifications at all.
   *
   * Lean providers (Canopy's search endpoint, for instance) return title,
   * price, rating and image but no spec table. Scoring every product 0 on
   * "listing detail" in that case is not a measurement, it is a constant — it
   * drags every score down by the same amount and tells the reader nothing.
   * When nothing in the set has specs the dimension is dropped and its weight
   * is redistributed across the signals that do exist.
   */
  hasDetail: boolean;
  /** Whether any candidate reported a was/now price, i.e. whether discounts are knowable. */
  hasDiscountData: boolean;
  /**
   * How many products are being compared.
   *
   * Every set-relative claim has to check this. A shortlist of one is
   * simultaneously the cheapest and the dearest thing in it, which produced a
   * page telling the same buyer it suited "tighter budgets" and people who
   * "would rather pay more once" — two sentences apart.
   */
  size: number;
  /** Best rating in the set, for comparative wording. */
  bestRating: number | null;
  /** Highest review count in the set — the real figure, not the scoring floor. */
  topReviewCount: number | null;
  medianPrice: number | null;
  maxReviews: number;
  cheapest: NormalizedProduct | null;
  dearest: NormalizedProduct | null;
}

function buildSetContext(products: NormalizedProduct[], input: RankingInput): SetContext {
  const priced = products.filter((p) => p.price !== null);
  const sortedByPrice = [...priced].sort((a, b) => (a.price?.amount ?? 0) - (b.price?.amount ?? 0));

  return {
    keyword: input.keyword,
    keywordIsDerived: input.keywordIsDerived ?? false,
    pinned: new Set(input.pinned ?? []),
    hasDetail: products.some((p) => p.specifications.length > 0),
    hasDiscountData: products.some((p) => p.discountPercent !== null),
    size: products.length,
    bestRating: products.reduce<number | null>(
      (best, p) => (p.rating !== null && (best === null || p.rating > best) ? p.rating : best),
      null,
    ),
    topReviewCount: products.reduce<number | null>(
      (best, p) => (p.reviewCount !== null && (best === null || p.reviewCount > best) ? p.reviewCount : best),
      null,
    ),
    medianPrice: median(priced.map((p) => p.price!.amount)),
    // The reference point for the reliability signal. Normalising against the
    // set maximum alone makes a one-product lookup score 100/100 off 20
    // reviews, which is nonsense — the floor keeps the scale absolute enough
    // that a thinly-reviewed listing reads as thinly reviewed, while a
    // shortlist containing a genuinely popular product still grades on a curve.
    maxReviews: Math.max(REVIEW_VOLUME_FLOOR, ...products.map((p) => p.reviewCount ?? 0)),
    cheapest: sortedByPrice[0] ?? null,
    dearest: sortedByPrice[sortedByPrice.length - 1] ?? null,
  };
}

/**
 * Signal weights. They sum to 1, and the displayed AI score is exactly this
 * weighted sum — no hidden multipliers — so the breakdown shown to the user
 * fully accounts for the number above it.
 *
 * Relevance is the heaviest single weight, and that is the whole point of a
 * *finder*: an excellent product that only half-matches the query is a worse
 * answer than a good product that matches it exactly. Weighted any lower, a
 * heavily-reviewed cordless tyre inflator outranks an actual cordless drill on
 * the query "cordless drill" — which it did, before this was tuned.
 */
const WEIGHTS = {
  relevance: 0.3,
  rating: 0.24,
  value: 0.16,
  reliability: 0.12,
  offer: 0.1,
  detail: 0.08,
} as const;

/**
 * Confidence from the provider's own ordering, 1 → 0.
 *
 * Amazon ranks search results by a relevance model far better than anything we
 * can compute from a title string, and ignoring it was the defect that let a
 * £10.82 camping cable reel sitting at position 20 present itself as an
 * alternative to a £112 EV charging cable. Decay is gentle across the first
 * page and steep after it: position 1 scores 1.0, position 8 about 0.5,
 * position 20 about 0.29.
 */
const rankConfidence = (sourceRank: number | undefined): number =>
  sourceRank === undefined ? 1 : 1 / (1 + sourceRank / 8);

/**
 * How well a product answers the query.
 *
 * Two independent signals, because either alone is fooled. Term coverage alone
 * scores the cable reel highly — its title genuinely ends "...and EV Charging
 * Cables". Provider position alone would rank an irrelevant bestseller. Both
 * together is what separates a competing product from an accessory that happens
 * to share vocabulary.
 */
function relevanceDimension(product: NormalizedProduct, ctx: SetContext): ScoreBreakdown {
  // The product the user pasted is exact by definition — it is not a match to a
  // query, it *is* the query.
  if (ctx.pinned.has(product.asin)) {
    return {
      id: 'relevance',
      label: 'Match to your search',
      score: 100,
      weight: WEIGHTS.relevance,
      note: 'This is the exact product you linked to.',
    };
  }

  const terms = ctx.keyword ? relevanceScore(product, ctx.keyword) : 1;
  const rank = rankConfidence(product.sourceRank);
  const combined = terms * 0.6 + rank * 0.4;

  const position = product.sourceRank === undefined ? null : product.sourceRank + 1;
  const termNote = ctx.keyword
    ? `Matches ${Math.round(terms * 100)}% of the key terms${ctx.keywordIsDerived ? ' from the product you linked to' : ' you searched for'}.`
    : 'No search terms to match against.';

  return {
    id: 'relevance',
    label: 'Match to your search',
    score: clamp(combined * 100),
    weight: WEIGHTS.relevance,
    note: position === null ? termNote : `${termNote} Amazon ranks it #${position} for that search.`,
  };
}

function scoreProduct(
  product: NormalizedProduct,
  ctx: SetContext,
  preference: number,
): ScoreBreakdown[] {
  const breakdown: ScoreBreakdown[] = [];

  // 1. Customer rating, discounted by how much evidence backs it.
  const confidence = ratingConfidence(product.reviewCount);
  if (product.rating !== null) {
    const raw = (product.rating / 5) * 100;
    breakdown.push({
      id: 'rating',
      label: 'Customer rating',
      score: clamp(50 + (raw - 50) * confidence),
      weight: WEIGHTS.rating,
      note:
        product.reviewCount !== null
          ? `${product.rating.toFixed(1)}★ across ${formatCount(product.reviewCount)} reviews.`
          : `${product.rating.toFixed(1)}★, but the review count is not reported — treated with lower confidence.`,
    });
  } else {
    breakdown.push({
      id: 'rating',
      label: 'Customer rating',
      score: 50,
      weight: WEIGHTS.rating,
      note: 'No rating reported for this listing — scored neutrally rather than penalised.',
    });
  }

  // 2. Review volume as a standalone reliability proxy.
  const volume = product.reviewCount ?? 0;
  breakdown.push({
    id: 'reliability',
    label: 'Reliability signal',
    score: clamp((Math.log10(volume + 1) / Math.log10(ctx.maxReviews + 1)) * 100),
    weight: WEIGHTS.reliability,
    note:
      volume > 0
        ? `${formatCount(volume)} reviews — the more buyers, the more the rating can be trusted.`
        : 'No review volume reported, so long-term reliability is unproven here.',
  });

  // 3. Value for money: price against the shortlist median, adjusted by rating.
  //    Meaningless with one product — it would be comparing a price to itself
  //    and scoring a perfect 100 for the privilege.
  if (ctx.size < 2) {
    breakdown.push({
      id: 'value',
      label: 'Value for money',
      score: 50,
      weight: WEIGHTS.value,
      note: 'Nothing to compare this price against on its own — search a category to see how it stacks up.',
    });
  } else if (product.price && ctx.medianPrice) {
    const ratio = product.price.amount / ctx.medianPrice;
    const priceScore = clamp(100 - (ratio - 1) * 90);
    const qualityLift = product.rating !== null ? ((product.rating - 4) / 1) * 20 : 0;
    breakdown.push({
      id: 'value',
      label: 'Value for money',
      score: clamp(priceScore + qualityLift),
      weight: WEIGHTS.value,
      note:
        ratio < 0.95
          ? `At ${formatMoney(product.price)} it undercuts the shortlist median of ${formatMoney({ amount: ctx.medianPrice, currency: product.price.currency })}.`
          : ratio > 1.05
            ? `At ${formatMoney(product.price)} it sits above the shortlist median of ${formatMoney({ amount: ctx.medianPrice, currency: product.price.currency })}.`
            : `Priced in line with the rest of the shortlist.`,
    });
  } else {
    breakdown.push({
      id: 'value',
      label: 'Value for money',
      score: 50,
      weight: WEIGHTS.value,
      note: 'Live price is read on Amazon at click-time, so value is scored neutrally here.',
    });
  }

  // 4. Deal quality + availability + delivery, straight from the filter stage.
  breakdown.push({
    id: 'offer',
    label: 'Offer & availability',
    score: clamp(35 + preference * 65),
    weight: WEIGHTS.offer,
    note:
      product.discountPercent !== null
        ? `Currently ${product.discountPercent}% off${product.delivery.free ? ', with free delivery' : ''}.`
        : product.delivery.free
          ? 'Free delivery, no discount reported.'
          : 'No active discount reported for this listing.',
  });

  // 5. How well the listing answers the actual query — term coverage blended
  //    with the position the provider itself put it in.
  breakdown.push(relevanceDimension(product, ctx));

  // 6. How completely the listing is documented — a proxy for how confidently
  //    a buyer can judge it before ordering. Skipped entirely when the active
  //    provider publishes no specs for anything in the set (see ctx.hasDetail).
  if (ctx.hasDetail) {
    const detail = product.specifications.length * 10 + Math.min(40, product.description.length / 12);
    breakdown.push({
      id: 'detail',
      label: 'Listing detail',
      score: clamp(detail),
      weight: WEIGHTS.detail,
      note: `${product.specifications.length} published specification${product.specifications.length === 1 ? '' : 's'} to compare against.`,
    });
  }

  return breakdown;
}

/**
 * The weighted sum, renormalised so the weights present always total 1.
 *
 * Without this, dropping a dimension would silently deflate every score by its
 * weight — an 8-point penalty applied to everyone, which looks like a verdict
 * and is really just a missing field.
 */
const weightedScore = (breakdown: ScoreBreakdown[]): number => {
  const total = breakdown.reduce((sum, b) => sum + b.weight, 0);
  if (total <= 0) return 0;
  return Math.round(breakdown.reduce((sum, b) => sum + b.score * b.weight, 0) / total);
};

/* ─────────────────────────── prose generation ─────────────────────────── */

function buildPros(product: NormalizedProduct, ctx: SetContext): string[] {
  const pros: string[] = [];

  if (product.rating !== null && product.rating >= 4.5) {
    pros.push(
      product.reviewCount
        ? `Strong ${product.rating.toFixed(1)}★ average across ${formatCount(product.reviewCount)} reviews`
        : `Strong ${product.rating.toFixed(1)}★ average rating`,
    );
  } else if (product.rating !== null && product.rating >= 4) {
    pros.push(`Solid ${product.rating.toFixed(1)}★ rating from buyers`);
  }

  if (product.reviewCount !== null && product.reviewCount >= 500) {
    pros.push(`${formatCount(product.reviewCount)} reviews — a well-tested, widely bought product`);
  }
  if (product.discountPercent !== null && product.discountPercent >= 10) {
    pros.push(`${product.discountPercent}% below its usual price right now`);
  }
  if (product.delivery.free === true) {
    pros.push(product.delivery.text ? `Free delivery — ${product.delivery.text}` : 'Free delivery included');
  }
  if (product.price && ctx.cheapest && product.asin === ctx.cheapest.asin && ctx.dearest?.asin !== product.asin) {
    pros.push(`Cheapest option on this shortlist at ${formatMoney(product.price)}`);
  }
  if (product.specifications.length >= 6) {
    pros.push(`Fully specified listing — ${product.specifications.length} published specs to check before buying`);
  }

  return pros.slice(0, 5);
}

/**
 * Cons must never come back empty. A comparison column with nothing under
 * "Cons" reads as "this product has no downsides", which is a claim we have not
 * made and cannot support — so the last resort is the weakest scoring dimension,
 * which is always present and always grounded in the listing's own data.
 */
function buildCons(product: NormalizedProduct, ctx: SetContext, breakdown: ScoreBreakdown[]): string[] {
  const cons: string[] = [];

  // The most useful caveat in a finder: it isn't quite what was asked for.
  if (ctx.keyword) {
    const relevance = relevanceScore(product, ctx.keyword);
    if (relevance < 0.99) {
      cons.push(`Only a partial match for “${ctx.keyword}” — check it does what you actually need`);
    }
  }

  if (product.reviewCount !== null && product.reviewCount < 50) {
    cons.push(`Only ${formatCount(product.reviewCount)} reviews so far — less feedback to judge it on`);
  } else if (product.reviewCount === null) {
    cons.push('Review count is not reported for this listing, so the rating is harder to weigh');
  }
  if (product.rating !== null && product.rating < 4.3) {
    cons.push(`${product.rating.toFixed(1)}★ is mid-pack — check recent reviews for the recurring complaints`);
  }
  if (product.price && ctx.dearest && product.asin === ctx.dearest.asin && ctx.cheapest?.asin !== product.asin) {
    cons.push(`Most expensive pick here at ${formatMoney(product.price)}`);
  }
  // Both of the following are gated on the set knowing anything about the
  // subject at all. When the active provider reports no discounts and no specs
  // for anything, these fire on every product identically — they distinguish
  // nothing, and they blame the product for a gap in our data source.
  if (ctx.hasDiscountData && product.discountPercent === null && product.price) {
    cons.push('No discount running — worth watching if you are not in a hurry');
  }
  if (product.delivery.free === false) {
    cons.push('Delivery is charged separately');
  }
  if (ctx.hasDetail && product.specifications.length < 4) {
    cons.push('Sparse specification list — you may need the manufacturer page to compare properly');
  }

  if (cons.length === 0) {
    // Last resort, in order of how much it actually helps a decision. These are
    // comparative on purpose: with a lean data source the absolute facts are
    // thin and identical across the shortlist, so "worse than the others at X"
    // is the only honest thing left that varies between products.
    if (product.rating !== null && ctx.bestRating !== null && product.rating < ctx.bestRating) {
      cons.push(
        `Rated ${product.rating.toFixed(1)}★ against ${ctx.bestRating.toFixed(1)}★ for the best-rated option here`,
      );
    } else if (
      product.reviewCount !== null &&
      ctx.topReviewCount !== null &&
      product.reviewCount < ctx.topReviewCount
    ) {
      cons.push(
        `Fewer reviews (${formatCount(product.reviewCount)}) than the most-reviewed option here (${formatCount(ctx.topReviewCount)})`,
      );
    } else if (product.price && ctx.cheapest?.price && product.price.amount > ctx.cheapest.price.amount) {
      cons.push(`Costs more than the cheapest option on this shortlist (${formatMoney(ctx.cheapest.price)})`);
    } else {
      const weakest = [...breakdown].sort((a, b) => a.score - b.score)[0];
      cons.push(
        weakest
          ? `Weakest on ${weakest.label.toLowerCase()} — ${weakest.note}`
          : 'Nothing in this listing stands out as a drawback — check the recent reviews before ordering',
      );
    }
  }

  return cons.slice(0, 4);
}

function buildBestFor(product: NormalizedProduct, ctx: SetContext, rank: number): string[] {
  const out: string[] = [];

  if (rank === 1 && ctx.size > 1) out.push('Buyers who want the strongest all-round pick without more research');
  // Set-relative claims only when there is a set. With one product these both
  // fire and contradict each other.
  if (ctx.size > 1 && product.price && ctx.cheapest?.asin === product.asin) {
    out.push('Tighter budgets, or a first purchase in this category');
  }
  if (ctx.size > 1 && product.price && ctx.dearest?.asin === product.asin) {
    out.push('Buyers who would rather pay more once than replace it later');
  }
  if (product.reviewCount !== null && product.reviewCount >= 1000) out.push('Anyone who wants a proven, heavily reviewed product');
  if (product.discountPercent !== null && product.discountPercent >= 15) out.push('Deal hunters — this is well below its usual price');
  if (out.length === 0) out.push(`Shoppers comparing options in ${product.category}`);

  return out.slice(0, 3);
}

function buildNotIdealFor(product: NormalizedProduct, ctx: SetContext): string[] {
  const out: string[] = [];

  if (ctx.size > 1 && product.price && ctx.dearest?.asin === product.asin) {
    out.push('Budget-first buyers — cheaper options on this list score close behind');
  }
  if (product.reviewCount !== null && product.reviewCount < 50) out.push('Anyone who wants a long track record of buyer feedback before committing');
  if (product.rating !== null && product.rating < 4.3) out.push('Buyers unwilling to accept a mid-pack satisfaction score');
  if (product.availability === 'out_of_stock') out.push('Anyone who needs it delivered this week');
  if (out.length === 0) {
    // The generic "the listing doesn't publish enough" line contradicts a page
    // that is showing dozens of specs, so it is only used when that is true.
    out.push(
      product.specifications.length >= 6
        ? 'Buyers with a hard requirement the specs do not cover — read the recent reviews for real-world complaints'
        : 'Buyers who need a specification this listing does not publish — check the details first',
    );
  }

  return out.slice(0, 3);
}

function buildPriceAnalysis(product: NormalizedProduct, ctx: SetContext): string {
  if (!product.price) {
    return 'Amazon prices move constantly, so this page does not cache one — the button opens the live listing with the current figure.';
  }
  const price = formatMoney(product.price);
  const parts: string[] = [];

  if (product.originalPrice && product.discountPercent !== null) {
    parts.push(`${price}, down from ${formatMoney(product.originalPrice)} — a ${product.discountPercent}% saving.`);
  } else {
    parts.push(`${price} at last check.`);
  }

  if (ctx.medianPrice && product.price) {
    const delta = Math.round(((product.price.amount - ctx.medianPrice) / ctx.medianPrice) * 100);
    if (Math.abs(delta) >= 5) {
      parts.push(`That is ${Math.abs(delta)}% ${delta > 0 ? 'above' : 'below'} the median of the three shortlisted products.`);
    } else {
      parts.push('That is within a few percent of the shortlist median.');
    }
  }

  parts.push('Prices change frequently — check the live figure before ordering.');
  return parts.join(' ');
}

function buildFeatureSummary(product: NormalizedProduct): string {
  if (product.specifications.length > 0) {
    const headline = product.specifications
      .slice(0, 3)
      .map((s) => `${s.label}: ${s.value}`)
      .join(' · ');
    return `${headline}${product.specifications.length > 3 ? ` — plus ${product.specifications.length - 3} more published specs.` : '.'}`;
  }
  return product.description
    ? product.description.slice(0, 220)
    : 'This listing publishes no structured specifications — open it on Amazon for the manufacturer detail.';
}

function buildRationale(
  product: NormalizedProduct,
  breakdown: ScoreBreakdown[],
  rank: number,
  total: number,
): string {
  // Every product carries the same fixed set of dimensions, so both of these
  // always exist — but the compiler cannot know that from an array index.
  const strongest = [...breakdown].sort((a, b) => b.score * b.weight - a.score * a.weight)[0]!;
  const weakest = [...breakdown].sort((a, b) => a.score - b.score)[0]!;

  const position =
    rank === 1
      ? `Ranked first of ${total}`
      : rank === total
        ? `Ranked last of ${total}`
        : `Ranked ${rank} of ${total}`;

  return `${position} because it leads on ${strongest.label.toLowerCase()} — ${strongest.note} It loses ground on ${weakest.label.toLowerCase()}: ${weakest.note}`;
}

function buildRecommendation(
  product: NormalizedProduct,
  rank: number,
  score: number,
  total: number,
): string {
  const name = `${product.brand} ${product.name}`.trim();
  // "Best of this shortlist" is meaningless when the shortlist is one product.
  if (total === 1) {
    return score >= 80
      ? `${name} holds up well on the evidence this listing publishes.`
      : `${name} is a reasonable buy, but the listing leaves gaps — read the cons before ordering.`;
  }
  if (rank === 1 && score >= 80) return `Buy this one unless a specific requirement rules it out — ${name} wins on the evidence available.`;
  if (rank === 1) return `The best of this shortlist, though not a runaway win — read the cons on ${name} before ordering.`;
  if (score >= 75) return `A genuine alternative to the top pick; choose it if its strengths match what you actually need.`;
  return `Worth a look only if the top pick is unavailable or misses something you specifically need.`;
}

function buildComparison(
  products: NormalizedProduct[],
  analyses: ProductAnalysis[],
  ctx: SetContext,
): ComparisonVerdict | null {
  if (analyses.length === 0) return null;

  const byAsin = new Map(products.map((p) => [p.asin, p]));
  // The winner is the highest *scoring* product, which is not necessarily the
  // first one listed: an ASIN the user pasted leads the results because they
  // asked for it, but calling it the winner would be a claim the scores do not
  // support. Guarded by the length check above.
  const winner = [...analyses].sort((a, b) => b.aiScore - a.aiScore)[0]!;

  const valuePick = [...analyses].sort((a, b) => {
    const aValue = a.breakdown.find((x) => x.id === 'value')?.score ?? 0;
    const bValue = b.breakdown.find((x) => x.id === 'value')?.score ?? 0;
    return bValue - aValue || b.aiScore - a.aiScore;
  })[0]!;

  const winnerName = (asin: string) => {
    const p = byAsin.get(asin);
    return p ? `${p.brand} ${p.name}`.trim() : asin;
  };

  const summaryParts = [`${winnerName(winner.asin)} takes it with an AI score of ${winner.aiScore}/100.`];
  if (ctx.cheapest) summaryParts.push(`${winnerName(ctx.cheapest.asin)} is the cheapest way in.`);
  if (ctx.dearest && ctx.dearest.asin !== ctx.cheapest?.asin) {
    summaryParts.push(`${winnerName(ctx.dearest.asin)} is the premium option.`);
  }
  if (valuePick.asin !== winner.asin) {
    summaryParts.push(`${winnerName(valuePick.asin)} gives the most per pound spent.`);
  }

  return {
    winnerAsin: winner.asin,
    bestBudgetAsin: ctx.cheapest?.asin ?? null,
    bestPremiumAsin: ctx.dearest && ctx.dearest.asin !== ctx.cheapest?.asin ? ctx.dearest.asin : null,
    bestValueAsin: valuePick.asin,
    summary: summaryParts.join(' '),
  };
}

/* ─────────────────────────── the engine ─────────────────────────── */

export class HeuristicRankingEngine implements IRankingEngine {
  readonly id = 'heuristic';
  readonly label = 'Signal-weighted ranking';

  async rank(input: RankingInput): Promise<RankingResult> {
    const ctx = buildSetContext(input.products, input);
    const pinned = ctx.pinned;

    const scored = input.products
      .map((product) => {
        const breakdown = scoreProduct(product, ctx, input.preference.get(product.asin) ?? 0);
        return { product, breakdown, aiScore: weightedScore(breakdown) };
      })
      .sort((a, b) => {
        // Pinned products lead; everything else is ordered by score.
        const pin = Number(pinned.has(b.product.asin)) - Number(pinned.has(a.product.asin));
        return pin || b.aiScore - a.aiScore;
      });

    const analyses: ProductAnalysis[] = scored.map((entry, index) => {
      const rank = index + 1;
      const isPinned = pinned.has(entry.product.asin);
      return {
        asin: entry.product.asin,
        rank,
        aiScore: entry.aiScore,
        headline: isPinned
          ? 'The product you asked for'
          : pinned.size > 0
            ? rank === pinned.size + 1
              ? 'Best alternative'
              : 'Also worth considering'
            : rank === 1
              ? 'Top pick'
              : rank === 2
                ? 'Runner-up'
                : rank === 3
                  ? 'Also worth considering'
                  : `Option ${rank}`,
        rationale: isPinned
          ? `Shown first because it is the product you linked to, not because it outscored the others. On the signals: ${buildRationale(entry.product, entry.breakdown, rank, scored.length).replace(/^Ranked [^ ]+( of \d+)? because it/, 'it')}`
          : buildRationale(entry.product, entry.breakdown, rank, scored.length),
        pros: buildPros(entry.product, ctx),
        cons: buildCons(entry.product, ctx, entry.breakdown),
        bestFor: buildBestFor(entry.product, ctx, rank),
        notIdealFor: buildNotIdealFor(entry.product, ctx),
        recommendation: buildRecommendation(entry.product, rank, entry.aiScore, scored.length),
        featureSummary: buildFeatureSummary(entry.product),
        priceAnalysis: buildPriceAnalysis(entry.product, ctx),
        quickSpecs: entry.product.specifications.slice(0, 6),
        breakdown: entry.breakdown,
        engine: this.id,
      };
    });

    return {
      analyses,
      comparison: buildComparison(
        scored.map((s) => s.product),
        analyses,
        ctx,
      ),
      engine: this.id,
      notes: [],
    };
  }
}
