/**
 * Normalized product + AI analysis → `AffiliateProduct`.
 *
 * The spec is explicit that the finder must not introduce a second product-page
 * template. It doesn't: this adapter shapes the discovery output into the exact
 * data contract the affiliate-product-adder skill writes, and the generated
 * page renders through the same `AffiliateProductTemplate` as every hand-written
 * review — same gallery, hover-zoom, trust-badge grid, Quick Specs, feature
 * grid, pros/cons/verdict row, price box, FAQ accordion and CTAs.
 *
 * Anything the provider did not report is either omitted or stated as unknown.
 * Nothing here fabricates a spec, a price, a warranty or a review count.
 */

import type { AffiliateFeature, AffiliateProduct, AffiliateSpecItem } from '@/lib/affiliate-products';
import type { AffiliateIconName } from '@/components/templates/affiliate-icons';
import { categorySlug, inferCategory } from './categorize';
import type { FinderProduct } from './discovery-service';
import { formatMoney } from './ranking';
import type { NormalizedProduct } from './types';

/**
 * Placeholder shown when a provider returns no imagery. An inline SVG keeps it
 * a data URI — no network request, nothing to 404, and it renders identically
 * in light and dark because it uses the same neutral as the gallery surround.
 */
const NO_IMAGE =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480" viewBox="0 0 640 480">
      <rect width="640" height="480" fill="#e8e6e1"/>
      <g fill="none" stroke="#9c968c" stroke-width="8" stroke-linecap="round" stroke-linejoin="round">
        <rect x="230" y="180" width="180" height="130" rx="10"/>
        <path d="M230 270l45-45 40 40 35-32 60 55"/>
        <circle cx="285" cy="215" r="12"/>
      </g>
      <text x="320" y="360" font-family="system-ui, sans-serif" font-size="22" fill="#6f6a62" text-anchor="middle">No image supplied</text>
    </svg>`,
  );

/** Deterministic icon choice from a spec label, so the same spec always looks the same. */
const SPEC_ICON_RULES: Array<[RegExp, AffiliateIconName]> = [
  [/watt|power|volt|\bv\b|energy|motor/i, 'zap'],
  [/speed|rpm|rate|pressure|bar\b|flow|performance/i, 'gauge'],
  [/batter|charg|cell|mah/i, 'battery'],
  [/dimension|size|length|width|height|depth|\bcm\b|\bmm\b|weight|\bkg\b/i, 'ruler'],
  [/warrant|guarante|certif|safety|approval/i, 'shield-check'],
  [/rating|review|star/i, 'star'],
  [/time|duration|minute|hour|runtime|timer/i, 'timer'],
  [/water|liquid|litre|tank|hydro/i, 'droplet'],
  [/heat|temperature|thermal|degree|cool/i, 'flame'],
  [/wireless|bluetooth|wi-?fi|connect|app/i, 'wifi'],
  [/sound|audio|noise|volume|\bdb\b/i, 'volume-2'],
  [/delivery|shipping|dispatch/i, 'truck'],
  [/include|accessor|content|box|kit|piece/i, 'package'],
  [/screen|display|monitor|led|lcd/i, 'monitor'],
  [/material|layer|capacity|storage|litres/i, 'layers'],
  [/mode|setting|adjust|control/i, 'sliders'],
  [/brand|manufactur|model/i, 'badge-check'],
];

const FALLBACK_SPEC_ICONS: AffiliateIconName[] = ['circle-dot', 'settings', 'move', 'package', 'layers', 'sliders'];

function specIcon(label: string, index: number): AffiliateIconName {
  for (const [pattern, icon] of SPEC_ICON_RULES) {
    if (pattern.test(label)) return icon;
  }
  return FALLBACK_SPEC_ICONS[index % FALLBACK_SPEC_ICONS.length]!;
}

/** The ranking engine's dimensions, mapped to icons for the feature grid. */
const BREAKDOWN_ICONS: Record<string, AffiliateIconName> = {
  rating: 'star',
  reliability: 'shield-check',
  value: 'badge-check',
  offer: 'truck',
  relevance: 'check',
  detail: 'layers',
};

export function generatedProductSlug(product: NormalizedProduct): string {
  const base = `${product.brand} ${product.name}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .split('-')
    .slice(0, 6)
    .join('-');
  return `${base || 'product'}-${product.asin.toLowerCase()}`;
}

function buildSpecs(product: NormalizedProduct): AffiliateSpecItem[] {
  const specs: AffiliateSpecItem[] = product.specifications
    .slice(0, 8)
    .map((spec, index) => ({ icon: specIcon(spec.label, index), label: spec.label, value: spec.value }));

  // Top up with facts the provider did report, so the panel is never near-empty.
  if (specs.length < 6) {
    const extras: AffiliateSpecItem[] = [];
    if (product.rating !== null) {
      extras.push({ icon: 'star', label: 'Customer rating', value: `${product.rating.toFixed(1)} / 5` });
    }
    if (product.reviewCount !== null) {
      extras.push({
        icon: 'users',
        label: 'Reviews',
        value: new Intl.NumberFormat('en-GB').format(product.reviewCount),
      });
    }
    const price = formatMoney(product.price);
    if (price) extras.push({ icon: 'badge-check', label: 'Price at last check', value: price });
    if (product.delivery.text) extras.push({ icon: 'truck', label: 'Delivery', value: product.delivery.text });
    extras.push({ icon: 'circle-dot', label: 'ASIN', value: product.asin });
    extras.push({ icon: 'shopping-cart', label: 'Marketplace', value: product.marketplace });

    for (const extra of extras) {
      if (specs.length >= 8) break;
      if (!specs.some((s) => s.label.toLowerCase() === extra.label.toLowerCase())) specs.push(extra);
    }
  }

  return specs;
}

/**
 * The feature grid becomes the "why it ranked here" panel — one card per scoring
 * dimension, showing the score and the sentence that justifies it. That is more
 * useful than restating the Quick Specs in a second layout, and it satisfies the
 * requirement to explain WHY each product received its ranking.
 */
function buildFeatures(finder: FinderProduct): AffiliateFeature[] {
  return finder.analysis.breakdown.slice(0, 6).map((dimension) => ({
    icon: BREAKDOWN_ICONS[dimension.id] ?? 'circle-dot',
    title: `${dimension.label} · ${dimension.score}/100`,
    body: dimension.note,
  }));
}

function buildTrustBadges(finder: FinderProduct): AffiliateProduct['trustBadges'] {
  const { product, analysis } = finder;
  const badges: AffiliateProduct['trustBadges'] = [
    { icon: 'award', label: `AI score ${analysis.aiScore}/100`, sublabel: analysis.headline },
  ];

  badges.push(
    product.rating !== null
      ? {
          icon: 'star',
          label: `${product.rating.toFixed(1)} rating`,
          sublabel:
            product.reviewCount !== null
              ? `${new Intl.NumberFormat('en-GB').format(product.reviewCount)} reviews`
              : 'Review count not reported',
        }
      : { icon: 'star', label: 'Rating unknown', sublabel: 'Not reported for this listing' },
  );

  const price = formatMoney(product.price);
  badges.push(
    product.discountPercent !== null
      ? { icon: 'badge-check', label: `${product.discountPercent}% off`, sublabel: price ? `${price} at last check` : 'Discounted at last check' }
      : price
        ? { icon: 'badge-check', label: price, sublabel: 'Price at last check' }
        : { icon: 'badge-check', label: 'Live pricing', sublabel: 'Checked on Amazon at click-time' },
  );

  badges.push(
    product.delivery.free === true
      ? { icon: 'truck', label: 'Free delivery', sublabel: product.delivery.text ?? 'Included on this listing' }
      : product.availability === 'in_stock'
        ? { icon: 'truck', label: 'In stock', sublabel: 'Available at last check' }
        : { icon: 'truck', label: 'Check availability', sublabel: 'Stock is confirmed on Amazon' },
  );

  // The template's badge grid is a fixed 2×2 — always exactly four.
  return badges.slice(0, 4);
}

function buildFaq(finder: FinderProduct): AffiliateProduct['faq'] {
  const { analysis } = finder;
  return [
    {
      q: `Why did this rank ${analysis.rank === 1 ? 'first' : `#${analysis.rank}`}?`,
      a: analysis.rationale,
    },
    { q: 'Is it worth the money?', a: analysis.priceAnalysis },
    {
      q: 'Who is it right for?',
      a: `${analysis.bestFor.join('. ')}. It is less suited to: ${analysis.notIdealFor.join('; ')}.`,
    },
    {
      q: 'How was this analysis produced?',
      a: 'Every product on the shortlist is scored across six weighted signals — customer rating, review volume, value for money, current offer and availability, match to your search, and how completely the listing is documented. The score panel above shows each dimension and the reason behind its number. Nothing is scored on information the listing does not publish.',
    },
  ];
}

export interface AdapterContext {
  keyword: string | null;
  affiliateTag: string;
}

export function toAffiliateProduct(finder: FinderProduct, ctx: AdapterContext): AffiliateProduct {
  const { product, analysis } = finder;
  // `images` is typed as a non-empty tuple on AffiliateProduct, so the hero has
  // to be resolved to a definite string before the tuple is built.
  const [hero = NO_IMAGE, ...rest] = product.images.length > 0 ? product.images : [NO_IMAGE];

  const category = inferCategory(product, ctx.keyword, product.category);

  const tagline = ctx.keyword
    ? `${analysis.headline} for “${ctx.keyword}” — scored ${analysis.aiScore}/100 by the Amazon Product Finder.`
    : `${analysis.headline} — scored ${analysis.aiScore}/100 by the Amazon Product Finder.`;

  return {
    slug: generatedProductSlug(product),
    asin: product.asin,
    affiliateTag: ctx.affiliateTag,
    amazonDomain: product.marketplace,

    categoryLabel: category,
    // No per-category route exists yet, so the crumb points at the guide hub's
    // filtered view rather than a guessed path that would 404.
    categoryPath: `/buyers-guide?category=${categorySlug(category)}`,

    brand: product.brand,
    name: product.name,
    tagline,
    description: product.description || analysis.featureSummary,

    images: [hero, ...rest.slice(0, 4)],

    trustBadges: buildTrustBadges(finder),
    specs: buildSpecs(product),
    features: buildFeatures(finder),

    pros: analysis.pros,
    cons: analysis.cons,
    bestFor: analysis.bestFor,
    notIdealFor: analysis.notIdealFor,

    // The template renders a 0–10 verdict score and derives its star row from it.
    score: Math.round(analysis.aiScore) / 10,
    verdict: analysis.recommendation,

    faq: buildFaq(finder),
  };
}
