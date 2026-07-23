/**
 * Affiliate product data store.
 *
 * Temporary flat store — not yet wired into @lovelytools/registry. Once the
 * "Affiliate Products" category is built, migrate these entries into the
 * registry's schema and delete this file. Until then, this is the single
 * source of truth the skill writes to and the template reads from.
 */

import type { AffiliateIconName } from '@/components/templates/affiliate-icons';

export interface AffiliateSpecItem {
  icon: AffiliateIconName; // one of the names in components/templates/affiliate-icons.tsx
  label: string;
  value: string;
}

export interface AffiliateFeature {
  icon: AffiliateIconName;
  title: string;
  body: string;
}

export interface AffiliateFaqItem {
  q: string;
  a: string;
}

export interface AffiliateProduct {
  slug: string; // URL segment, e.g. "vocoo-kitchen-timer"
  asin: string;
  affiliateTag: string; // e.g. "lovelytools-21"
  amazonDomain: string; // e.g. "amazon.co.uk"

  categoryLabel: string; // breadcrumb + badge, e.g. "Kitchen Gadgets"
  categoryPath: string; // e.g. "/kitchen-gadgets" (once category exists)

  brand: string; // e.g. "VOCOO"
  name: string; // full product name, e.g. "Rechargeable Digital Kitchen Timer"
  tagline: string; // italic one-liner under the title
  description: string; // paragraph under tagline

  images: [string, ...string[]]; // hero first, then thumbnails — local paths under /public; hero is required
  awardBadge?: { line1: string; line2: string }; // e.g. { line1: "BEST", line2: "CHOICE" }

  trustBadges: { icon: AffiliateIconName; label: string; sublabel: string }[];
  specs: AffiliateSpecItem[];
  features: AffiliateFeature[];

  pros: string[];
  cons: string[];
  bestFor: string[];
  notIdealFor: string[];

  score: number; // 0–10
  verdict: string; // paragraph in the "Our Verdict" box

  faq: AffiliateFaqItem[];
}

function affiliateUrl(p: Pick<AffiliateProduct, 'asin' | 'affiliateTag' | 'amazonDomain'>) {
  return `https://www.${p.amazonDomain}/dp/${p.asin}?tag=${p.affiliateTag}`;
}

export { affiliateUrl };

// The skill appends new entries to this array.
export const affiliateProducts: AffiliateProduct[] = [
  {
    slug: 'ryobi-combi-drill-starter-kit',
    asin: 'B0BSGPHM3X',
    affiliateTag: 'lovelytools-21',
    amazonDomain: 'amazon.co.uk',

    categoryLabel: 'Power Tools',
    categoryPath: '/buyers-guide',

    brand: 'RYOBI',
    name: 'R18PD3-215GZ 18V ONE+ Cordless Combi Drill Starter Kit + 60-Piece Bit Set',
    tagline: 'Three tools in one — drill, hammer drill and screwdriver — with enough bits to never dig through a junk drawer again.',
    description:
      'A cordless combi drill that switches between wood, metal, masonry and screws without swapping tools, bundled with a 60-piece bit set so it is ready to use straight out of the box.',

    images: [
      `/products/ryobi-combi-drill-starter-kit/1.jpg`,
      `/products/ryobi-combi-drill-starter-kit/2.jpg`,
      `/products/ryobi-combi-drill-starter-kit/3.jpg`,
      `/products/ryobi-combi-drill-starter-kit/4.jpg`,
      `/products/ryobi-combi-drill-starter-kit/5.jpg`,
    ],
    awardBadge: { line1: "AMAZON'S", line2: 'CHOICE' },

    trustBadges: [
      { icon: 'battery-charging', label: '2 Batteries', sublabel: 'Included, ready to go' },
      { icon: 'shield-check', label: '3-Year', sublabel: 'ONE+ range warranty' },
      { icon: 'star', label: '5.0 rating', sublabel: '20 reviews' },
      { icon: 'wrench', label: '60 Pieces', sublabel: 'Bit set included' },
    ],
    specs: [
      { icon: 'zap', label: 'Voltage', value: '18V' },
      { icon: 'gauge', label: 'Max speed', value: '1800 RPM' },
      { icon: 'settings', label: 'Gearbox', value: '2-speed (500 / 1800 RPM)' },
      { icon: 'move', label: 'Max torque', value: '50 Nm' },
      { icon: 'sliders', label: 'Torque settings', value: '24' },
      { icon: 'battery', label: 'Batteries', value: '2 × 1.5 Ah ONE+ Li-ion' },
      { icon: 'circle-dot', label: 'Chuck', value: 'Ratcheting, up to 13mm bits' },
      { icon: 'package', label: 'Accessories', value: '60-piece drill/driver bit set' },
    ],
    features: [
      {
        icon: 'hammer',
        title: '3-in-1 combi drill',
        body: 'Drill, hammer drill and screwdriver modes cover wood, metal, masonry, plastic, plasterboard, ceramic and tile.',
      },
      {
        icon: 'gauge',
        title: '2-speed gearbox',
        body: '500/1800 RPM and up to 50Nm of torque, so it can switch from driving screws to boring through brick.',
      },
      {
        icon: 'sliders',
        title: '24 torque settings',
        body: 'Drives screws flush every time instead of stripping heads or sinking them too deep.',
      },
      {
        icon: 'circle-dot',
        title: 'Ratcheting chuck',
        body: 'Improves bit grip strength and takes any standard drilling or screwdriving bit up to 13mm.',
      },
      {
        icon: 'battery-charging',
        title: 'Compatible with 100+ ONE+ tools',
        body: 'The included batteries and charger work across the whole Ryobi ONE+ range, not just this drill.',
      },
      {
        icon: 'package',
        title: '60-piece bit set included',
        body: 'Wood, masonry and metal drill bits plus screwdriving tips, so the kit is ready to work immediately.',
      },
    ],

    pros: [
      '3-year warranty across the whole ONE+ range',
      'Ships with 2 batteries and a charger — no separate purchase needed',
      'Ratcheting chuck holds bits securely up to 13mm',
      '24 torque settings prevent stripped screws and overdriving',
      '5.0 rating from reviewers, Amazon\'s Choice',
    ],
    cons: [
      '1.5Ah batteries are the smaller capacity — heavy daily use will mean more recharging',
      'Bit set quality is entry-level; expect to replace the masonry bits first',
    ],
    bestFor: [
      'First-time cordless drill buyers wanting one tool for most household jobs',
      'Anyone already in, or starting, the Ryobi ONE+ battery ecosystem',
      'Occasional DIY: shelving, curtain rails, flat-pack furniture, light masonry',
    ],
    notIdealFor: [
      'Tradespeople needing all-day runtime — step up to a higher-Ah battery kit',
      'Heavy, repeated masonry drilling — an SDS+ drill is the better tool',
    ],

    score: 9.2,
    verdict:
      'A genuinely useful all-rounder: three drill modes, a real torque range, and a 60-piece bit set in the box means most first-time buyers won\'t need anything else for typical home jobs.',

    faq: [
      {
        q: 'Is this drill good for masonry and brick?',
        a: 'Yes — the hammer drill mode adds impact force for masonry, brick and stone, and the kit includes concrete drill bits.',
      },
      {
        q: 'How long do the included batteries last on a charge?',
        a: 'They\'re 1.5Ah ONE+ batteries — enough for typical DIY sessions, though heavy continuous use will need a recharge or a higher-capacity battery.',
      },
      {
        q: 'Will the batteries work with other Ryobi tools?',
        a: 'Yes, all ONE+ batteries and chargers are compatible across the entire Ryobi ONE+ range of over 100 tools.',
      },
      {
        q: 'What size bits does the chuck accept?',
        a: 'The ratcheting chuck accepts any standard drilling or screwdriving bit up to 13mm.',
      },
    ],
  },
];

export function getAffiliateProduct(slug: string): AffiliateProduct | undefined {
  return affiliateProducts.find((p) => p.slug === slug);
}

export function allAffiliateProductSlugs(): string[] {
  return affiliateProducts.map((p) => p.slug);
}
