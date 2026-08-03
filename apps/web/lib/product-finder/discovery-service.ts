/**
 * ProductDiscoveryService — the orchestrator.
 *
 *   input → provider → normalized model → filters → AI ranking → UI
 *
 * It depends on the `IProductProvider` and `IRankingEngine` interfaces only,
 * both injected through the constructor, so a test can drive it with a stub and
 * a future Product Advertising API provider drops in with no change here.
 */

import { buildAffiliateUrl } from '@/lib/affiliate-link';
import { loadConfig, type ProductFinderConfig } from './config';
import { detectInput } from './input';
import { runFilters, type AppliedFilter } from './filters';
import { deriveProductQuery } from './text';
import { resolveProvider, type IProductProvider } from './provider';
import { ClaudeRankingEngine } from './claude-ranking';
import {
  HeuristicRankingEngine,
  type ComparisonVerdict,
  type IRankingEngine,
  type ProductAnalysis,
} from './ranking';
import { ProductProviderError, type FinderInput, type NormalizedProduct } from './types';

/** One shortlisted product, with everything the UI needs and nothing it doesn't. */
export interface FinderProduct {
  product: NormalizedProduct;
  analysis: ProductAnalysis;
  /** Always built by the Affiliate Link Service — never a raw Amazon URL. */
  affiliateUrl: string;
  /** Where "View Details" goes: the curated review if we have one, else the generated page. */
  detailPath: string;
}

export interface DiscoveryResult {
  query: {
    raw: string;
    kind: 'keyword' | 'asin';
    keyword: string | null;
    asin: string | null;
    marketplace: string;
  };
  results: FinderProduct[];
  filters: AppliedFilter[];
  comparison: ComparisonVerdict | null;
  provider: { id: string; label: string };
  engine: string;
  notes: string[];
  /** How many candidates the provider returned before filtering. */
  candidateCount: number;
}

/** What a provider round-trip yields, before filtering and ranking. */
interface GatherResult {
  candidates: NormalizedProduct[];
  /** ASINs the user asked for by name — exempt from filtering and from relevance scoring. */
  pinned: string[];
  marketplace: string;
  /** What alternatives are judged against. Never null when there are alternatives. */
  keyword: string | null;
  /** True when `keyword` was built from a pasted product rather than typed. */
  keywordIsDerived?: boolean;
}

interface CacheEntry {
  expiresAt: number;
  value: DiscoveryResult;
}

/**
 * Per-process discovery cache. Deliberately in-memory and small: the point is
 * to stop a page refresh or a Compare click re-billing an upstream API call, not
 * to be a durable store. A restart losing it is correct behaviour.
 */
const cache = new Map<string, CacheEntry>();

function readCache(key: string): DiscoveryResult | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    cache.delete(key);
    return null;
  }
  return entry.value;
}

function writeCache(key: string, value: DiscoveryResult, ttlMs: number): void {
  if (ttlMs <= 0) return;
  // Cheap bound — this is a warm-path cache, not a store.
  if (cache.size > 200) cache.clear();
  cache.set(key, { expiresAt: Date.now() + ttlMs, value });
}

export class ProductDiscoveryService {
  constructor(
    private readonly provider: IProductProvider,
    private readonly ranking: IRankingEngine,
    private readonly config: ProductFinderConfig,
  ) {}

  /** Search by whatever the user typed: keyword, Amazon URL, or bare ASIN. */
  async discover(rawInput: string, signal: AbortSignal): Promise<DiscoveryResult> {
    const input = detectInput(rawInput, this.config.marketplace);
    if (!input) {
      throw new ProductProviderError(
        'invalid_input',
        'That does not look like a product name or a full Amazon product link. Paste a link containing /dp/ASIN, or just describe what you are looking for.',
        this.provider.id,
      );
    }

    const cacheKey = `${this.provider.id}:${this.ranking.id}:${input.kind}:${
      input.kind === 'asin' ? `${input.marketplace}/${input.asin}` : input.keyword.toLowerCase()
    }`;
    const cached = readCache(cacheKey);
    if (cached) return cached;

    const gathered = await this.gather(input, signal);

    if (gathered.candidates.length === 0) {
      throw new ProductProviderError(
        'not_found',
        this.describeEmptyResult(input, gathered.marketplace),
        this.provider.id,
      );
    }

    const result = await this.analyse({ ...gathered, raw: rawInput, kind: input.kind }, signal);
    writeCache(cacheKey, result, this.config.cacheTtlMs);
    return result;
  }

  /**
   * Re-hydrates a specific set of ASINs. Backs the comparison page and the
   * generated detail page, so a shared or bookmarked link works in a fresh
   * session with no client-side state to rely on.
   */
  async lookup(asins: string[], marketplace: string, signal: AbortSignal): Promise<DiscoveryResult> {
    const unique = [...new Set(asins.map((a) => a.trim().toUpperCase()).filter(Boolean))].slice(0, 3);
    if (unique.length === 0) {
      throw new ProductProviderError('invalid_input', 'No products were selected to compare.', this.provider.id);
    }

    const found = (
      await Promise.all(unique.map((asin) => this.provider.getByAsin(asin, marketplace, signal)))
    ).filter((p): p is NormalizedProduct => p !== null);

    if (found.length === 0) {
      throw new ProductProviderError(
        'not_found',
        'None of those products could be loaded. They may no longer be listed.',
        this.provider.id,
      );
    }

    return this.analyse(
      {
        candidates: found,
        pinned: found.map((p) => p.asin),
        keyword: null,
        marketplace,
        raw: unique.join(','),
        kind: 'asin',
      },
      signal,
    );
  }

  /**
   * Wording for an empty result, scoped to what the active provider can
   * actually see.
   *
   * A `curated` provider has a fixed local set and never contacted Amazon, so
   * telling the visitor "no product found on amazon.co.uk" would misrepresent
   * both what we searched and what exists — the product is real, we just do not
   * cover it. Point them at what we *can* do instead.
   */
  private describeEmptyResult(input: FinderInput, marketplace: string): string {
    const curated = this.provider.coverage === 'curated';

    if (input.kind === 'asin') {
      return curated
        ? `We haven't reviewed that product, so there is nothing to rank yet. Right now the finder searches our own hand-picked reviews rather than the whole of Amazon — try describing what you're after instead (for example "cordless drill"), or browse the Buyer's Guide.`
        : `No product found for ASIN ${input.asin} on ${marketplace}.`;
    }

    return curated
      ? `Nothing in our reviewed products matched “${input.keyword}”. The finder searches our own hand-picked reviews rather than the whole of Amazon, so try a broader term, or browse the Buyer's Guide to see everything we cover.`
      : `Nothing matched “${input.keyword}”. Try fewer words, or paste the Amazon link directly.`;
  }

  /** Provider calls: turn a classified input into a candidate set. */
  private async gather(
    input: NonNullable<ReturnType<typeof detectInput>>,
    signal: AbortSignal,
  ): Promise<GatherResult> {
    if (input.kind === 'keyword') {
      const candidates = await this.provider.search(
        { keyword: input.keyword, marketplace: this.config.marketplace, limit: this.config.candidateLimit },
        signal,
      );
      return { candidates, pinned: [], marketplace: this.config.marketplace, keyword: input.keyword };
    }

    const primary = await this.provider.getByAsin(input.asin, input.marketplace, signal);
    if (!primary) {
      return { candidates: [], pinned: [], marketplace: input.marketplace, keyword: null };
    }

    // Build a shortlist around the pasted product so "Compare" is useful from a
    // single link. Providers that expose related items answer directly;
    // everything else falls back to a keyword search on the product's own name.
    let alternatives: NormalizedProduct[] = [];
    try {
      alternatives = this.provider.findAlternatives
        ? await this.provider.findAlternatives(primary, this.config.candidateLimit, signal)
        : await this.provider.search(
            {
              keyword: `${primary.brand} ${primary.category}`.trim(),
              marketplace: input.marketplace,
              limit: this.config.candidateLimit,
            },
            signal,
          );
    } catch {
      // The pasted product is the answer; alternatives are a bonus. A failure
      // to find them must not fail the lookup the user actually asked for.
      alternatives = [];
    }

    const candidates = [primary, ...alternatives.filter((a) => a.asin !== primary.asin)];

    // The keyword is what the alternatives get judged against, and it must not
    // be null here. It was, and the consequence was that alternatives fetched by
    // a fuzzy search skipped relevance filtering entirely and were each handed a
    // perfect relevance score — 30% of the total — for free. That is how a
    // camping cable reel became the "best alternative" to an EV charging cable.
    // The pinned product is exempted inside the ranking engine, since it is the
    // query rather than a match for it.
    return {
      candidates,
      pinned: [primary.asin],
      marketplace: input.marketplace,
      keyword: deriveProductQuery(primary.brand, primary.name),
      keywordIsDerived: true,
    };
  }

  /** Filters → ranking → presentation shaping. */
  private async analyse(
    args: GatherResult & { raw: string; kind: 'keyword' | 'asin' },
    signal: AbortSignal,
  ): Promise<DiscoveryResult> {
    const { candidates, pinned, keyword, keywordIsDerived, marketplace, raw, kind } = args;

    const filtered = runFilters(candidates, {
      keyword,
      keywordIsDerived,
      minResults: this.config.resultLimit,
    });

    // A product the user explicitly asked for is never filtered out from under
    // them — they pasted its link; showing "no results" would be absurd.
    const surviving = [...filtered.products];
    for (const asin of pinned) {
      if (!surviving.some((p) => p.asin === asin)) {
        const original = candidates.find((p) => p.asin === asin);
        if (original) {
          surviving.unshift(original);
          filtered.preference.set(asin, filtered.preference.get(asin) ?? 0);
        }
      }
    }

    const ranked = await this.ranking.rank(
      { products: surviving, keyword, keywordIsDerived, preference: filtered.preference, pinned },
      signal,
    );

    const byAsin = new Map(surviving.map((p) => [p.asin, p]));
    const results: FinderProduct[] = ranked.analyses
      .slice(0, Math.max(this.config.resultLimit, pinned.length))
      .map((analysis) => {
        const product = byAsin.get(analysis.asin)!;
        return {
          product,
          analysis,
          affiliateUrl: buildAffiliateUrl({
            asin: product.asin,
            marketplace: product.marketplace,
            tag: this.config.affiliateTag,
            sourceUrl: product.productUrl,
          }),
          detailPath: product.reviewSlug
            ? `/products/${product.reviewSlug}`
            : `/product-finder/product/${product.asin}?market=${encodeURIComponent(product.marketplace)}`,
        };
      });

    // Say so when the marketplace provider dropped out and the curated catalog
    // answered instead. `reviewSlug` is only ever set by the catalog provider,
    // so an all-curated shortlist from a provider that claims marketplace
    // coverage means the primary failed or ran out of quota. This used to be a
    // console warning and nothing else — the visitor saw one of our own reviews
    // presented as the best of Amazon, with no way to tell the difference.
    const notes = [...ranked.notes];
    if (
      this.provider.coverage === 'marketplace' &&
      results.length > 0 &&
      results.every((r) => r.product.reviewSlug)
    ) {
      notes.unshift(
        'Live Amazon results were unavailable for this search, so these come from our own reviewed products instead.',
      );
    }

    return {
      query: {
        raw,
        kind,
        keyword,
        asin: kind === 'asin' ? (pinned[0] ?? null) : null,
        marketplace,
      },
      results,
      filters: filtered.applied,
      comparison: ranked.comparison,
      provider: { id: this.provider.id, label: this.provider.label },
      engine: ranked.engine,
      notes,
      candidateCount: candidates.length,
    };
  }
}

/**
 * Composition root. The only place the concrete provider and ranking engine are
 * chosen; everything else receives them as interfaces.
 */
export function createDiscoveryService(config: ProductFinderConfig = loadConfig()): ProductDiscoveryService {
  const provider = resolveProvider(config);
  const heuristic = new HeuristicRankingEngine();
  const ranking: IRankingEngine = config.llm.apiKey
    ? new ClaudeRankingEngine(heuristic, config.llm)
    : heuristic;

  return new ProductDiscoveryService(provider, ranking, config);
}
