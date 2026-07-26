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

export interface AffiliateCategory {
  slug: string; // used as the ?category= query value on /buyers-guide
  label: string; // must match a product's categoryLabel to group under this category
}

// The Buyer's Guide listing page groups products under these categories.
export const affiliateCategories: AffiliateCategory[] = [
  { slug: 'home-improvement-power-tools', label: 'Home Improvement & Power Tools' },
  { slug: 'kitchen-dining', label: 'Kitchen & Dining' },
  { slug: 'home-garden', label: 'Home & Garden' },
  { slug: 'sports-outdoor', label: 'Sports & Outdoor' },
  { slug: 'office-supplies', label: 'Office Supplies' },
  { slug: 'handmade-products', label: 'Handmade Products' },
  { slug: 'furniture', label: 'Furniture' },
];

// The skill appends new entries to this array.
export const affiliateProducts: AffiliateProduct[] = [
  {
    slug: 'ryobi-combi-drill-starter-kit',
    asin: 'B0BSGPHM3X',
    affiliateTag: 'lovelytools-21',
    amazonDomain: 'amazon.co.uk',

    categoryLabel: 'Home Improvement & Power Tools',
    categoryPath: '/buyers-guide?category=home-improvement-power-tools',

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
  {
    slug: 'huepar-360-laser-level-tripod',
    asin: 'B0DH4GBS7L',
    affiliateTag: 'lovelytools-21',
    amazonDomain: 'amazon.co.uk',

    categoryLabel: 'Home Improvement & Power Tools',
    categoryPath: '/buyers-guide?category=home-improvement-power-tools',

    brand: 'Huepar',
    name: '360° Laser Level with 1.3m Tripod, Self Leveling Rechargeable Laser Level for Construction and Picture Hanging',
    tagline: 'Three full 360° laser lines, a tripod, and a hard case — everything needed to level a room in one box.',
    description:
      'A self-leveling 360° laser level with one horizontal and two vertical beams, bundled with a 1.3m tripod and magnetic bracket for tiling, ceilings, cabinets and picture hanging.',

    images: [
      `/products/huepar-360-laser-level-tripod/1.jpg`,
      `/products/huepar-360-laser-level-tripod/2.jpg`,
      `/products/huepar-360-laser-level-tripod/3.jpg`,
      `/products/huepar-360-laser-level-tripod/4.jpg`,
    ],
    awardBadge: { line1: "AMAZON'S", line2: 'CHOICE' },

    trustBadges: [
      { icon: 'battery-charging', label: '4000mAh', sublabel: 'Rechargeable Li-ion, 8hrs use' },
      { icon: 'ruler', label: '1.3m Tripod', sublabel: 'Extends 17" to 50"' },
      { icon: 'star', label: '4.4 rating', sublabel: '44 reviews' },
      { icon: 'package', label: 'Full Kit', sublabel: 'Case, glasses, target plate' },
    ],
    specs: [
      { icon: 'layers', label: 'Laser lines', value: '3 × 360° (1 horizontal, 2 vertical)' },
      { icon: 'gauge', label: 'Accuracy', value: '±1/9" at 33 feet' },
      { icon: 'zap', label: 'Laser class', value: 'Class 2 (IEC/EN60825-1/2014), <1mW' },
      { icon: 'battery', label: 'Battery', value: '3.7V 4000mAh Li-ion, 8hrs runtime' },
      { icon: 'ruler', label: 'Tripod height', value: '17" to 50", 1/4"-20 thread' },
      { icon: 'timer', label: 'Pulse mode range', value: 'Up to 196ft with receiver (sold separately)' },
      { icon: 'settings', label: 'Modes', value: 'Self-leveling, manual, pulse' },
      { icon: 'package', label: 'Included', value: 'Tripod, magnetic bracket, hard case, glasses, target plate' },
    ],
    features: [
      {
        icon: 'layers',
        title: '3 × 360° laser lines',
        body: 'One horizontal and two vertical 360° beams project across an entire room from a single position.',
      },
      {
        icon: 'ruler',
        title: '1.3m tripod included',
        body: 'Extends from 17" to 50" so the laser height adjusts to ceilings, cabinets or floor work without extra purchases.',
      },
      {
        icon: 'settings',
        title: 'Self-leveling & manual mode',
        body: 'Self-levels automatically under 3° of tilt, or lock the pendulum for manual angled lines.',
      },
      {
        icon: 'timer',
        title: 'Pulse mode for outdoor use',
        body: 'Extends working distance from 98ft to 196ft when paired with a Huepar laser receiver, cutting through daylight glare.',
      },
      {
        icon: 'battery-charging',
        title: 'Rechargeable via USB-C',
        body: 'Built-in 4000mAh battery runs 8 hours per charge and tops up from a laptop, power bank or car charger.',
      },
      {
        icon: 'package',
        title: 'Full accessory kit',
        body: 'Ships with a magnetic 360° bracket, hard carry case, glasses, eyeglass case, target board and power cord.',
      },
    ],

    pros: [
      'Amazon\'s Choice with a 4.4 rating across 44 reviews',
      'Full 360° coverage on all three lines, not just the horizontal',
      'Tripod and magnetic bracket included — no separate mounting purchase needed',
      'USB-C rechargeable with 8-hour runtime',
      'Reviewers note it performs better than pricier DeWalt/Bosch units',
    ],
    cons: [
      'Pulse mode needs a separate Huepar LR-6RG receiver to use outdoors',
      'One reviewer felt the bundled tripod was the weak point of the kit',
    ],
    bestFor: [
      'DIYers tiling, hanging cabinets, or installing ceilings and picture rails',
      'Anyone wanting a tripod and case included rather than bought separately',
      'Indoor and occasional outdoor use (with a receiver for pulse mode)',
    ],
    notIdealFor: [
      'Frequent outdoor/long-distance work without already owning a laser receiver',
      'Buyers wanting the sturdiest possible tripod — consider upgrading that separately',
    ],

    score: 8.8,
    verdict:
      'A well-equipped 360° laser level that undercuts big-brand pricing while still including a tripod, hard case and full accessory set — reviewers rate it above comparable DeWalt and Bosch kits, with the tripod being the only recurring gripe.',

    faq: [
      {
        q: 'Does this work outdoors?',
        a: 'Yes, via pulse mode, which extends the working distance to 196ft, but it requires a Huepar laser receiver (e.g. LR-6RG) purchased separately to detect the flickering beam in daylight.',
      },
      {
        q: 'How long does the battery last?',
        a: 'The built-in 3.7V 4000mAh lithium-ion battery runs for about 8 hours per charge and recharges over USB-C from a laptop, power bank or car charger.',
      },
      {
        q: 'What is included in the box?',
        a: 'The laser level, a 1.3m tripod, a 360° magnetic bracket, a hard carry case, safety glasses with case, a target board, a tripod storage bag and a power cord.',
      },
      {
        q: 'How accurate is it?',
        a: 'Accuracy is rated at ±1/9" at 33 feet in self-leveling mode, which auto-levels under 3° of tilt and flashes to warn when it exceeds that range.',
      },
    ],
  },
  {
    slug: 'bosch-universalaquatak-135-pressure-washer',
    asin: 'B06XRWS76H',
    affiliateTag: 'lovelytools-21',
    amazonDomain: 'amazon.co.uk',

    categoryLabel: 'Home & Garden',
    categoryPath: '/buyers-guide',

    brand: 'Bosch',
    name: 'UniversalAquatak 135 High Pressure Washer | 1900 W, 135 Bar, 450 l/h Flow Rate, 3-in-1 Nozzle, Detergent Nozzle & Carrying Handle',
    tagline: '135 bar and a 3-in-1 nozzle that switches jets for you — one washer for the car, the patio and the garden furniture.',
    description:
      'A corded electric pressure washer with a 1900W motor and 135 bar of pressure, bundled with a 3-in-1 nozzle, a detergent nozzle for foam cleaning, and a pull-out handle for compact storage.',

    images: [
      `/products/bosch-universalaquatak-135-pressure-washer/1.jpg`,
      `/products/bosch-universalaquatak-135-pressure-washer/2.jpg`,
      `/products/bosch-universalaquatak-135-pressure-washer/3.jpg`,
      `/products/bosch-universalaquatak-135-pressure-washer/4.jpg`,
    ],

    trustBadges: [
      { icon: 'gauge', label: '135 Bar', sublabel: 'High-pressure cleaning power' },
      { icon: 'star', label: '4.4 rating', sublabel: '3,016 reviews' },
      { icon: 'package', label: 'Full Kit', sublabel: 'Gun, lance, 3-in-1 & detergent nozzle' },
      { icon: 'truck', label: '1K+ bought', sublabel: 'In the past month' },
    ],
    specs: [
      { icon: 'gauge', label: 'Pressure', value: '135 bar' },
      { icon: 'zap', label: 'Motor power', value: '1900 W, corded electric' },
      { icon: 'droplet', label: 'Max flow rate', value: '450 l/h' },
      { icon: 'ruler', label: 'Hose length', value: '7 m' },
      { icon: 'timer', label: 'Cable length', value: '5 m' },
      { icon: 'package', label: 'Weight', value: '6.55 kg (net)' },
      { icon: 'layers', label: 'Dimensions', value: '17.4 × 14.7 × 14.2 cm' },
      { icon: 'shield-check', label: 'Certification', value: 'CE, CSA' },
    ],
    features: [
      {
        icon: 'sliders',
        title: '3-in-1 nozzle',
        body: 'Combines a fan jet, rotary jet and point jet in a single nozzle, so the right jet is a twist away for any cleaning job.',
      },
      {
        icon: 'droplet',
        title: 'High-pressure foam cleaning',
        body: 'Fill the supplied detergent container and attach the detergent nozzle to lift stubborn dirt before rinsing.',
      },
      {
        icon: 'move',
        title: 'Pull-out & carrying handles',
        body: 'A pivoting, height-adjustable pull-out handle plus a second carrying handle make it easy to move and compact to store.',
      },
      {
        icon: 'refresh-ccw',
        title: 'Self-priming pump',
        body: 'Draws water directly from a container or tank when needed, without a separate priming step.',
      },
      {
        icon: 'layers',
        title: 'Compact storage design',
        body: 'The hose and detergent container clip onto the body of the washer, cutting the footprint needed to store it.',
      },
      {
        icon: 'package',
        title: 'Full accessory kit',
        body: 'Ships with the high-pressure gun, lance, 3-in-1 nozzle, detergent nozzle (450ml), 7m hose and a water filter.',
      },
    ],

    pros: [
      '4.4 rating across 3,016 reviews, with 1K+ bought in the past month',
      '3-in-1 nozzle covers fan, rotary and point jets without swapping attachments',
      'Detergent nozzle and container included for foam cleaning',
      'Pull-out and carrying handles make it compact to store and easy to move',
      'Self-priming pump can draw water from a container or tank',
    ],
    cons: [
      'Corded electric — needs a nearby mains socket and only a 5m power cable',
      '135 bar is mid-range for the category; heavier patio or driveway grime may need more passes',
    ],
    bestFor: [
      'Washing cars, patios, garden furniture and flowerpots around the home',
      'Buyers wanting one washer with multiple jet types instead of separate nozzles',
      'Anyone short on storage space, thanks to the pivoting handle and clip-on hose',
    ],
    notIdealFor: [
      'Cordless or battery-only setups — this is mains-powered with a 5m cable',
      'Heavy-duty commercial cleaning where a higher-pressure unit would work faster',
    ],

    score: 8.8,
    verdict:
      'A well-rounded corded pressure washer backed by a strong 4.4 rating from over 3,000 reviewers — the 3-in-1 nozzle and detergent kit cover most home cleaning jobs, and the pull-out handle keeps it easy to store.',

    faq: [
      {
        q: 'What is included in the box?',
        a: 'The UniversalAquatak 135 washer, Bosch high-pressure gun, lance, 3-in-1 nozzle, a detergent nozzle with 450ml container, a 7m high-pressure hose, and a water filter.',
      },
      {
        q: 'Can it draw water from a container instead of a tap?',
        a: 'Yes, it has a self-priming pump that can draw water directly from a container or tank.',
      },
      {
        q: 'How long are the hose and power cable?',
        a: 'The high-pressure hose is 7 metres and the power cable is 5 metres.',
      },
      {
        q: 'What is the maximum water temperature it can handle?',
        a: 'Up to 40°C inlet water temperature, per Bosch\'s technical data for this model.',
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
