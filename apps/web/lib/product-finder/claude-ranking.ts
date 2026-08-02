/**
 * Optional LLM enrichment for the ranking engine.
 *
 * Division of labour is deliberate:
 *   · the deterministic engine owns the *numbers* — AI score, rank order and
 *     the weighted breakdown. Those stay reproducible and auditable, and a
 *     model outage can never reshuffle the results page.
 *   · Claude owns the *language* — the rationale, pros, cons, best-for,
 *     not-ideal-for, buying recommendation, feature summary and price read —
 *     written strictly against the evidence we pass in.
 *
 * Any failure (no key, timeout, refusal, malformed JSON) degrades silently to
 * the heuristic engine's own prose. This decorator can never make the finder
 * fail; it can only make it read better.
 *
 * Transport note: this calls the Messages API over `fetch` rather than through
 * @anthropic-ai/sdk, because this workspace's pnpm store cannot take a new
 * dependency outside a full reinstall (see the note in affiliate-icons.tsx).
 * Swap in the SDK whenever the lockfile is next rebuilt — the call shape below
 * maps one-to-one onto `client.beta.messages.create`.
 */

import type { LlmConfig } from './config';
import type {
  IRankingEngine,
  ProductAnalysis,
  RankingInput,
  RankingResult,
} from './ranking';
import { formatMoney } from './ranking';
import type { NormalizedProduct } from './types';

const ANALYSIS_SCHEMA = {
  type: 'object',
  properties: {
    products: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          asin: { type: 'string' },
          rationale: { type: 'string' },
          pros: { type: 'array', items: { type: 'string' } },
          cons: { type: 'array', items: { type: 'string' } },
          bestFor: { type: 'array', items: { type: 'string' } },
          notIdealFor: { type: 'array', items: { type: 'string' } },
          recommendation: { type: 'string' },
          featureSummary: { type: 'string' },
          priceAnalysis: { type: 'string' },
        },
        required: [
          'asin',
          'rationale',
          'pros',
          'cons',
          'bestFor',
          'notIdealFor',
          'recommendation',
          'featureSummary',
          'priceAnalysis',
        ],
        additionalProperties: false,
      },
    },
    comparisonSummary: { type: 'string' },
  },
  required: ['products', 'comparisonSummary'],
  additionalProperties: false,
} as const;

const SYSTEM_PROMPT = `You write buying guidance for lovelytools.ai, a UK affiliate review site.

You are given a shortlist of Amazon products that has ALREADY been scored and ranked by a deterministic engine. Do not re-rank them and do not dispute the scores — your job is the words, not the order.

Rules, in priority order:
1. Ground every claim in the evidence provided. If a field says "not reported", say so plainly or leave the point out. Never invent a specification, a price, a rating, a review count, a warranty or a delivery promise.
2. Be specific and comparative. "4.4 stars across 3,016 reviews" beats "well reviewed". Reference the other products on the shortlist where it helps a decision.
3. Explain the given rank honestly, including where a product is weak. A shortlist where everything is excellent is not useful.
4. British English, plain and practical, no marketing filler, no exclamation marks, no emoji. Do not address the reader as "you guys" or open with "Looking for...".
5. pros: 3-5 items. cons: 2-4 items — never zero, find the real trade-off. bestFor and notIdealFor: 2-3 items each. Every list item is a short phrase, not a sentence with a full stop.
6. rationale, recommendation, featureSummary and priceAnalysis are 1-2 sentences each.
7. Prices move constantly. Never state a price as if it were fixed; refer to the figure as "at last check".`;

/** The evidence pack. Only fields a provider actually populated get through. */
function describeProduct(product: NormalizedProduct, analysis: ProductAnalysis): Record<string, unknown> {
  return {
    asin: product.asin,
    rank: analysis.rank,
    aiScore: analysis.aiScore,
    brand: product.brand,
    name: product.name,
    category: product.category,
    description: product.description || 'not reported',
    specifications: product.specifications.length ? product.specifications : 'not reported',
    priceAtLastCheck: formatMoney(product.price) ?? 'not reported',
    usualPrice: formatMoney(product.originalPrice) ?? 'not reported',
    discountPercent: product.discountPercent ?? 'not reported',
    rating: product.rating ?? 'not reported',
    reviewCount: product.reviewCount ?? 'not reported',
    availability: product.availability,
    delivery: product.delivery.text ?? (product.delivery.free === true ? 'free delivery' : 'not reported'),
    scoreBreakdown: analysis.breakdown.map((b) => ({
      dimension: b.label,
      score: b.score,
      weight: b.weight,
      why: b.note,
    })),
  };
}

interface LlmAnalysis {
  asin: string;
  rationale: string;
  pros: string[];
  cons: string[];
  bestFor: string[];
  notIdealFor: string[];
  recommendation: string;
  featureSummary: string;
  priceAnalysis: string;
}

interface LlmPayload {
  products: LlmAnalysis[];
  comparisonSummary: string;
}

/** Extracts the concatenated text blocks from a Messages API response. */
function readText(message: unknown): string {
  const content = (message as { content?: unknown }).content;
  if (!Array.isArray(content)) return '';
  return content
    .filter((block): block is { type: string; text: string } =>
      Boolean(block) && typeof block === 'object' && (block as { type?: string }).type === 'text',
    )
    .map((block) => block.text)
    .join('');
}

const nonEmpty = (values: unknown, fallback: string[]): string[] => {
  if (!Array.isArray(values)) return fallback;
  const cleaned = values.filter((v): v is string => typeof v === 'string' && v.trim().length > 0);
  return cleaned.length > 0 ? cleaned : fallback;
};

const text = (value: unknown, fallback: string): string =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback;

/**
 * Wraps a baseline engine. The baseline always runs first, so its scores and
 * ordering are what ship even when the model is unreachable.
 */
export class ClaudeRankingEngine implements IRankingEngine {
  readonly id = 'claude';
  readonly label = 'Claude-written analysis';

  constructor(
    private readonly baseline: IRankingEngine,
    private readonly config: LlmConfig,
  ) {}

  async rank(input: RankingInput, signal: AbortSignal): Promise<RankingResult> {
    const base = await this.baseline.rank(input, signal);
    if (!this.config.apiKey || base.analyses.length === 0) return base;

    try {
      const payload = await this.enrich(input, base, signal);
      if (!payload) return { ...base, notes: [...base.notes, 'Claude analysis unavailable — using signal-only wording.'] };

      const byAsin = new Map(payload.products.map((p) => [p.asin.toUpperCase(), p]));

      const analyses = base.analyses.map((analysis) => {
        const written = byAsin.get(analysis.asin.toUpperCase());
        if (!written) return analysis;
        return {
          ...analysis,
          rationale: text(written.rationale, analysis.rationale),
          pros: nonEmpty(written.pros, analysis.pros),
          cons: nonEmpty(written.cons, analysis.cons),
          bestFor: nonEmpty(written.bestFor, analysis.bestFor),
          notIdealFor: nonEmpty(written.notIdealFor, analysis.notIdealFor),
          recommendation: text(written.recommendation, analysis.recommendation),
          featureSummary: text(written.featureSummary, analysis.featureSummary),
          priceAnalysis: text(written.priceAnalysis, analysis.priceAnalysis),
          engine: this.id,
        } satisfies ProductAnalysis;
      });

      return {
        analyses,
        comparison: base.comparison
          ? { ...base.comparison, summary: text(payload.comparisonSummary, base.comparison.summary) }
          : null,
        engine: this.id,
        notes: base.notes,
      };
    } catch (error) {
      // Enrichment is strictly additive — never let it take the results page down.
      console.warn('[product-finder] Claude analysis failed, falling back to heuristic prose', error);
      return { ...base, notes: [...base.notes, 'Claude analysis failed — using signal-only wording.'] };
    }
  }

  private async enrich(
    input: RankingInput,
    base: RankingResult,
    outerSignal: AbortSignal,
  ): Promise<LlmPayload | null> {
    const productsByAsin = new Map(input.products.map((p) => [p.asin, p]));
    const evidence = base.analyses
      .map((analysis) => {
        const product = productsByAsin.get(analysis.asin);
        return product ? describeProduct(product, analysis) : null;
      })
      .filter((entry): entry is Record<string, unknown> => entry !== null);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.config.timeoutMs);
    const onOuterAbort = () => controller.abort();
    outerSignal.addEventListener('abort', onOuterAbort);

    try {
      const response = await fetch(`${this.config.baseUrl}/v1/messages`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'content-type': 'application/json',
          'x-api-key': this.config.apiKey!,
          'anthropic-version': '2023-06-01',
          // Server-side refusal fallback: if a safety classifier declines the
          // request, the API retries it on the recommended model in the same
          // call rather than handing us an empty response.
          'anthropic-beta': 'server-side-fallback-2026-07-01',
        },
        body: JSON.stringify({
          model: this.config.model,
          max_tokens: 8000,
          fallbacks: 'default',
          system: SYSTEM_PROMPT,
          output_config: {
            effort: 'medium',
            format: { type: 'json_schema', schema: ANALYSIS_SCHEMA },
          },
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: [
                    input.keyword
                      ? `The shopper searched for: ${input.keyword}`
                      : 'The shopper looked this product up directly by Amazon link.',
                    '',
                    'Shortlist, already ranked (rank 1 is the top pick). Write the analysis for each, in this order:',
                    JSON.stringify(evidence, null, 2),
                  ].join('\n'),
                },
              ],
            },
          ],
        }),
      });

      if (!response.ok) {
        console.warn(`[product-finder] Messages API returned ${response.status}`);
        return null;
      }

      const message = (await response.json()) as { stop_reason?: string };

      // Check stop_reason before touching content: on a refusal the content
      // array is empty or partial, and indexing into it would throw.
      if (message.stop_reason === 'refusal') {
        console.warn('[product-finder] Messages API declined the analysis request');
        return null;
      }

      const raw = readText(message);
      if (!raw) return null;

      const parsed = JSON.parse(raw) as LlmPayload;
      return Array.isArray(parsed.products) ? parsed : null;
    } finally {
      clearTimeout(timer);
      outerSignal.removeEventListener('abort', onOuterAbort);
    }
  }
}
