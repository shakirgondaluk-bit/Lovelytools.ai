/**
 * Affiliate product data store.
 *
 * Temporary flat store — not yet wired into @lovelytools/registry. Once the
 * "Affiliate Products" category is built, migrate these entries into the
 * registry's schema and delete this file. Until then, this is the single
 * source of truth the skill writes to and the template reads from.
 */

import { buildAffiliateUrl } from '@/lib/affiliate-link';
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
  categoryPath: string; // "/buyers-guide?category={slug}" — slug from affiliateCategories

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

/**
 * Delegates to the Affiliate Link Service so the curated product template and
 * the Product Finder build outbound links through exactly one code path. The
 * signature is unchanged — callers (and the affiliate-product-adder skill)
 * carry on using `affiliateUrl(product)`.
 */
function affiliateUrl(p: Pick<AffiliateProduct, 'asin' | 'affiliateTag' | 'amazonDomain'>) {
  return buildAffiliateUrl({ asin: p.asin, marketplace: p.amazonDomain, tag: p.affiliateTag });
}

export { affiliateUrl };

export interface AffiliateCategory {
  slug: string; // used as the ?category= query value on /buyers-guide
  label: string; // must match a product's categoryLabel to group under this category
}

// The Buyer's Guide listing page groups products under these categories.
//
// This is the closed set the Product Finder's categoriser is allowed to emit
// (see lib/product-finder/categorize.ts) — a label outside this list renders a
// badge that no filter chip can match. The guide only shows chips for
// categories that currently hold a product, so adding one here is cheap.
export const affiliateCategories: AffiliateCategory[] = [
  { slug: 'home-improvement-power-tools', label: 'Home Improvement & Power Tools' },
  { slug: 'kitchen-dining', label: 'Kitchen & Dining' },
  { slug: 'home-garden', label: 'Home & Garden' },
  { slug: 'sports-outdoor', label: 'Sports & Outdoor' },
  { slug: 'office-supplies', label: 'Office Supplies' },
  { slug: 'handmade-products', label: 'Handmade Products' },
  { slug: 'furniture', label: 'Furniture' },
  { slug: 'mobile-phones-accessories', label: 'Mobile Phones & Accessories' },
  { slug: 'smartwatches-wearables', label: 'Smartwatches & Wearables' },
  { slug: 'audio-headphones', label: 'Audio & Headphones' },
  { slug: 'tv-home-cinema', label: 'TV & Home Cinema' },
  { slug: 'computers-accessories', label: 'Computers & Accessories' },
  { slug: 'cameras-photography', label: 'Cameras & Photography' },
  { slug: 'car-motorbike', label: 'Car & Motorbike' },
  { slug: 'cleaning-laundry', label: 'Cleaning & Laundry' },
  { slug: 'lighting-electrical', label: 'Lighting & Electrical' },
  { slug: 'beauty-personal-care', label: 'Beauty & Personal Care' },
  { slug: 'health-household', label: 'Health & Household' },
  { slug: 'baby-kids', label: 'Baby & Kids' },
  { slug: 'pet-supplies', label: 'Pet Supplies' },
  { slug: 'toys-games', label: 'Toys & Games' },
  { slug: 'clothing-accessories', label: 'Clothing & Accessories' },
  { slug: 'electronics-gadgets', label: 'Electronics & Gadgets' },
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
    categoryPath: '/buyers-guide?category=home-garden',

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
  {
    slug: 'lamicall-cordless-tyre-inflator',
    asin: 'B0DZWXC2FH',
    affiliateTag: 'lovelytools-21',
    amazonDomain: 'amazon.co.uk',

    categoryLabel: 'Home & Garden',
    categoryPath: '/buyers-guide?category=home-garden',

    brand: 'Lamicall',
    name: 'Cordless Tyre Inflator Air Compressor - [Metal Cylinder] 150PSI Electric Pump with Digital Dual-Value Display, Portable Air Pump for Car Motorcycle Bike Balls, with Long Hose, Silicone Case',
    tagline: 'A pocket-sized compressor that hits 150PSI, doubles as a power bank, and shuts off the second your tyre hits target pressure.',
    description:
      'A cordless tyre inflator with an aluminium alloy cylinder and 120W motor, delivering up to 150PSI with a digital dual-value display, auto-shutoff, and a built-in 5000mAh battery that also works as a power bank.',

    images: [
      `/products/lamicall-cordless-tyre-inflator/1.jpg`,
      `/products/lamicall-cordless-tyre-inflator/2.jpg`,
      `/products/lamicall-cordless-tyre-inflator/3.jpg`,
      `/products/lamicall-cordless-tyre-inflator/4.jpg`,
    ],
    awardBadge: { line1: "AMAZON'S", line2: 'CHOICE' },

    trustBadges: [
      { icon: 'battery-charging', label: '5000mAh', sublabel: 'Battery, up to 28 min runtime' },
      { icon: 'gauge', label: '150 PSI', sublabel: 'Max pressure, 35L/min airflow' },
      { icon: 'star', label: '4.5 rating', sublabel: '478 reviews' },
      { icon: 'ruler', label: '50cm Hose', sublabel: 'Extended, rotatable nozzle' },
    ],
    specs: [
      { icon: 'zap', label: 'Motor power', value: '120W' },
      { icon: 'gauge', label: 'Max pressure', value: '150 PSI, 16500 RPM' },
      { icon: 'droplet', label: 'Airflow rate', value: '35 L/min' },
      { icon: 'battery', label: 'Battery', value: '5000mAh, up to 28 min runtime' },
      { icon: 'ruler', label: 'Air hose', value: '50cm extended, rotatable nozzle' },
      { icon: 'settings', label: 'Modes', value: '5 (car, motorcycle, bike, ball, custom)' },
      { icon: 'sliders', label: 'Pressure units', value: '4 (PSI, KPA, BAR, KG/CM²)' },
      { icon: 'package', label: 'Included', value: 'French nozzle, inflation nozzle/needle, Type-C cable, silicone sleeve' },
    ],
    features: [
      {
        icon: 'zap',
        title: '120W motor, 150PSI max',
        body: 'Inflates a car tyre from 28PSI to 36PSI in under a minute, backed by an aluminium alloy cylinder that reduces heat build-up.',
      },
      {
        icon: 'ruler',
        title: '50cm extended hose',
        body: 'A rotatable nozzle on a long hose reaches any valve position, so the pump can sit on the ground without bending down to hold it.',
      },
      {
        icon: 'gauge',
        title: 'Dual pressure gauge',
        body: 'A high-precision chip reads tyre pressure to ±0.1 PSI, showing live pressure and target side by side, and auto-shuts off on target.',
      },
      {
        icon: 'sliders',
        title: '5 modes, 4 pressure units',
        body: 'Presets for car, motorcycle, bike, ball and custom inflation, switchable between PSI, KPA, BAR and KG/CM².',
      },
      {
        icon: 'battery-charging',
        title: 'Doubles as a power bank',
        body: 'The built-in 5000mAh battery charges via USB-C and outputs 5V/2A, so it can top up a phone in an emergency.',
      },
      {
        icon: 'shield-check',
        title: 'Full safety protection',
        body: 'Over-voltage, over-current, over-temperature, under-voltage and short-circuit protection, tested from -15°C to 40°C.',
      },
    ],

    pros: [
      "Amazon's Choice with a 4.5 rating across 478 reviews, 100+ bought in the past month",
      'Reaches 150PSI with a 35L/min airflow rate — fast enough for a full car tyre top-up in under a minute',
      '50cm extended hose with a rotatable nozzle reaches awkward valve positions without bending down',
      'Auto-shutoff and a ±0.1 PSI accurate dual gauge take the guesswork out of target pressure',
      'Doubles as a 5000mAh power bank and has a built-in emergency light',
    ],
    cons: [
      'Battery-powered runtime (28 min) means very heavy use in one session will need a recharge',
      'A compact cylinder pump like this suits tyres and small items better than large volume inflatables',
    ],
    bestFor: [
      'Drivers wanting a fast, accurate, cordless inflator to keep in the car',
      'Cyclists and motorcyclists needing multiple valve types and pressure units in one tool',
      'Anyone who wants an inflator that can also serve as a backup power bank or light',
    ],
    notIdealFor: [
      'Inflating large-volume items like paddling pools or air beds regularly',
      'Users needing continuous runtime beyond 28 minutes without a recharge break',
    ],

    score: 9.0,
    verdict:
      "A well-specced cordless tyre inflator that backs up its 150PSI/35L/min numbers with a 4.5 rating from 478 reviewers — the extended hose, auto-shutoff and accurate dual gauge make it genuinely easier to use than a basic pump, and the power bank/light functions are a useful bonus.",

    faq: [
      {
        q: 'How long does it take to inflate a car tyre?',
        a: 'Lamicall states it can raise a car tyre from 28PSI to 36PSI in under a minute, thanks to the 120W motor delivering 35L/min airflow.',
      },
      {
        q: 'How long does the battery last on a charge?',
        a: 'The built-in 5000mAh battery runs for up to 28 minutes of continuous use per charge, and recharges via USB-C.',
      },
      {
        q: 'Can it inflate things other than car tyres?',
        a: 'Yes — it has 5 modes (car, motorcycle, bike, ball, custom) and includes a French nozzle, inflation nozzle and needle for different valve types.',
      },
      {
        q: 'Does it turn off automatically at the target pressure?',
        a: 'Yes, the dual-value display shows live and target pressure, and the pump auto-shuts off once the preset target is reached.',
      },
    ],
  },
  {
    slug: 'ingco-cordless-circular-saw',
    asin: 'B0CZHNWQCP',
    affiliateTag: 'lovelytools-21',
    amazonDomain: 'amazon.co.uk',

    categoryLabel: 'Home Improvement & Power Tools',
    categoryPath: '/buyers-guide?category=home-improvement-power-tools',

    brand: 'INGCO',
    name: '20V 140mm Cordless Circular Saw with Brushless Motor 6300RPM Max. Cutting Depth 50mm (90°) Electric Circular Saw 20mm Arbor with 1Pcs 4.0Ah Battery and Charger CSLI14021',
    tagline: 'A brushless 20V circular saw that cuts 50mm deep and comes with the battery and charger already in the box.',
    description:
      'A cordless circular saw with a brushless motor spinning a 140mm blade up to 6300 RPM, cutting up to 50mm deep at 90° and 33mm at 45°, bundled with a 4.0Ah battery and fast charger from the INGCO 20V P20S platform.',

    images: [
      `/products/ingco-cordless-circular-saw/1.jpg`,
      `/products/ingco-cordless-circular-saw/2.jpg`,
      `/products/ingco-cordless-circular-saw/3.jpg`,
      `/products/ingco-cordless-circular-saw/4.jpg`,
    ],
    awardBadge: { line1: "AMAZON'S", line2: 'CHOICE' },

    trustBadges: [
      { icon: 'battery-charging', label: '4.0Ah Battery', sublabel: 'Included, 2hr fast charge' },
      { icon: 'gauge', label: '6300 RPM', sublabel: 'Brushless motor, no-load speed' },
      { icon: 'star', label: '4.7 rating', sublabel: '173 reviews' },
      { icon: 'ruler', label: '50mm Depth', sublabel: 'Max cut at 90°' },
    ],
    specs: [
      { icon: 'zap', label: 'Voltage', value: '20V, brushless motor' },
      { icon: 'gauge', label: 'No-load speed', value: '0–6300 RPM' },
      { icon: 'ruler', label: 'Blade diameter', value: '140mm, 20mm arbor' },
      { icon: 'ruler', label: 'Max cutting depth', value: '50mm at 90°, 33mm at 45°' },
      { icon: 'sliders', label: 'Adjustments', value: 'Cutting depth & bevel angle' },
      { icon: 'battery', label: 'Battery', value: '1 × 4.0Ah Li-ion, P20S platform' },
      { icon: 'timer', label: 'Charge time', value: '2 hours (fast charger included)' },
      { icon: 'package', label: 'Included', value: 'Saw, 4.0Ah battery, charger, 140mm blade' },
    ],
    features: [
      {
        icon: 'zap',
        title: 'Brushless motor',
        body: 'Delivers more power and a longer run time per charge than a conventional carbon-brush motor.',
      },
      {
        icon: 'ruler',
        title: '50mm max cutting depth',
        body: 'Cuts up to 50mm deep at 90° and 33mm at 45°, covering straight and slant cuts in one tool.',
      },
      {
        icon: 'sliders',
        title: 'Depth & bevel adjustment',
        body: 'Both cutting depth and bevel angle adjust to match the material and the cut being made.',
      },
      {
        icon: 'battery-charging',
        title: '2-hour fast charging',
        body: 'The included 4.0Ah battery fully recharges in around 2 hours via the bundled fast charger.',
      },
      {
        icon: 'shield-check',
        title: 'Overheat protection',
        body: 'A power indicator and over-heating protection guard the motor and battery during extended use.',
      },
      {
        icon: 'package',
        title: 'Ready to cut out of the box',
        body: 'Ships with the saw, a 4.0Ah battery, a fast charger and a 140mm blade — no separate purchases needed to start.',
      },
    ],

    pros: [
      "Amazon's Choice with a 4.7 rating across 173 reviews, 50+ bought in the past month",
      'Brushless motor gives more power and longer runtime than brushed alternatives',
      'Battery and fast charger included — ready to use straight out of the box',
      'Battery is compatible across the whole INGCO 20V P20S tool platform',
      'Both cutting depth and bevel angle are adjustable for different cuts',
    ],
    cons: [
      'Only one 4.0Ah battery is included — a second pack means a separate purchase for continuous use',
      '140mm blade diameter suits general DIY cuts rather than deep structural timber work',
    ],
    bestFor: [
      'DIYers wanting a cordless saw ready to use out of the box, battery and charger included',
      'Anyone already in, or starting, the INGCO 20V P20S battery ecosystem',
      'Straight and angled cuts in wood up to 50mm thick',
    ],
    notIdealFor: [
      'Tradespeople needing all-day runtime without owning a spare battery',
      'Deep or heavy-duty timber cutting beyond 50mm — a larger-blade saw suits that better',
    ],

    score: 9.0,
    verdict:
      "A well-priced brushless circular saw that ships complete with a battery and fast charger — the 4.7 rating from 173 reviewers and Amazon's Choice badge back up its numbers, and it slots into the wider INGCO 20V tool range.",

    faq: [
      {
        q: 'Does this come with a battery and charger?',
        a: 'Yes — it includes one 4.0Ah Li-ion battery and a fast charger that fully recharges the battery in about 2 hours.',
      },
      {
        q: 'How deep can it cut?',
        a: 'Up to 50mm deep at a 90° straight cut, or 33mm at a 45° bevel cut.',
      },
      {
        q: 'Is the battery compatible with other INGCO tools?',
        a: 'Yes, the battery and charger work across the full range of INGCO 20V P20S platform power tools.',
      },
      {
        q: 'What size blade does it use?',
        a: 'A 140mm diameter blade with a 20mm arbor; one 140mm blade is included in the box.',
      },
    ],
  },
  {
    slug: 'pizza-delivery-bag-heavy-duty-insulated',
    asin: 'B077P1Z2WV',
    affiliateTag: 'lovelytools-21',
    amazonDomain: 'amazon.co.uk',

    categoryLabel: 'Kitchen & Dining',
    categoryPath: '/buyers-guide?category=kitchen-dining',

    brand: 'DS Packaging',
    name: 'Heavy Duty Pizza Delivery Bag, 20" x 20" x 8" Full Insulated All Sides, 51 x 51 x 20cm',
    tagline: 'A full foil-lined delivery bag built to keep pizza and takeaway food hot from the kitchen to the door.',
    description:
      'A heavy-duty insulated pizza delivery bag with full foil lining on every side and two ventilation holes to reduce condensation, sized to hold large pizza boxes for delivery drivers and caterers.',

    images: [
      `/products/pizza-delivery-bag-heavy-duty-insulated/1.jpg`,
      `/products/pizza-delivery-bag-heavy-duty-insulated/2.jpg`,
      `/products/pizza-delivery-bag-heavy-duty-insulated/3.jpg`,
      `/products/pizza-delivery-bag-heavy-duty-insulated/4.jpg`,
    ],

    trustBadges: [
      { icon: 'star', label: '4.6 rating', sublabel: '93 reviews' },
      { icon: 'layers', label: 'Full Insulation', sublabel: 'Heavy foil lining, all sides' },
      { icon: 'ruler', label: '20x20x8"', sublabel: '51 x 51 x 20cm interior' },
      { icon: 'truck', label: 'Ready to Ship', sublabel: 'In stock, dispatched fast' },
    ],
    specs: [
      { icon: 'ruler', label: 'Size', value: '20" x 20" x 8" (51 x 51 x 20cm)' },
      { icon: 'layers', label: 'Insulation', value: 'Full heavy foil lining, all sides' },
      { icon: 'refresh-ccw', label: 'Ventilation', value: 'Two air holes to reduce condensation' },
      { icon: 'package', label: 'Capacity', value: 'Fits multiple large pizza boxes' },
      { icon: 'star', label: 'Rating', value: '4.6 out of 5 (93 ratings)' },
      { icon: 'truck', label: 'Seller', value: 'DS Packaging Ltd, ships from the UK' },
    ],
    features: [
      {
        icon: 'layers',
        title: 'Full foil insulation',
        body: 'Heavy foil lining covers every side of the bag, not just the top, to hold heat in during transit.',
      },
      {
        icon: 'refresh-ccw',
        title: 'Ventilation holes',
        body: 'Two air holes let steam escape, cutting the condensation build-up that can soften pizza boxes.',
      },
      {
        icon: 'ruler',
        title: '20 x 20 x 8 inch interior',
        body: 'Sized to hold large pizza boxes, with room for more than one order at once.',
      },
      {
        icon: 'lock',
        title: 'Velcro closure flap',
        body: 'A hook-and-loop fastened inner flap keeps the bag sealed shut while it is being carried.',
      },
      {
        icon: 'shield-check',
        title: 'Heavy-duty build',
        body: 'Reviewers report it holds up well to repeated daily use by delivery drivers and caterers.',
      },
    ],

    pros: [
      'Reviewers say it keeps food "piping hot" for both deliveries and catering',
      'Full foil lining insulation on all sides, not just the top',
      'Ventilation holes help reduce condensation build-up inside the bag',
      'Interior is large enough for multiple big pizza boxes',
      'Velcro-fastened flap keeps the bag sealed during transit',
    ],
    cons: [
      'Sold as a generic/unbranded bag rather than an established thermal-bag brand',
      'No shoulder strap or wheels — it is a plain carry bag',
    ],
    bestFor: [
      'Pizza and takeaway delivery drivers, including gig-economy delivery work',
      'Caterers transporting hot food short distances',
      'Anyone moving hot cooked food between a kitchen and another location',
    ],
    notIdealFor: [
      'Buyers who specifically want an established, branded thermal delivery bag',
      'Long-distance delivery that needs an actively heated bag rather than passive insulation',
    ],

    score: 8.6,
    verdict:
      'A straightforward, heavy-duty insulated bag that reviewers say keeps pizza and takeaway food hot in transit — the full foil lining and ventilation holes work as advertised, even if it is a no-frills generic bag rather than a premium branded one.',

    faq: [
      {
        q: 'What size pizza boxes does it fit?',
        a: 'The interior measures 20" x 20" x 8" (51 x 51 x 20cm), sized for large pizza boxes and multiple orders at once.',
      },
      {
        q: 'How is it insulated?',
        a: 'A full heavy foil lining covers all sides of the bag to help retain heat during transit.',
      },
      {
        q: 'Does it have any ventilation?',
        a: 'Yes, two air holes let steam pass through, which helps reduce condensation build-up inside the bag.',
      },
      {
        q: 'Is it durable enough for daily delivery use?',
        a: 'Reviewers describe it as well-made and heavy duty, including drivers using it for gig-economy delivery services.',
      },
    ],
  },
  {
    slug: 'duronic-eb40-electric-egg-boiler',
    asin: 'B0CGJC5NB6',
    affiliateTag: 'lovelytools-21',
    amazonDomain: 'amazon.co.uk',

    categoryLabel: 'Kitchen & Dining',
    categoryPath: '/buyers-guide?category=kitchen-dining',

    brand: 'Duronic',
    name: 'EB40 BK Electric Egg Boiler, Steamer and Poacher for 7 Soft, Medium or Hard Boiled Eggs',
    tagline: 'Set the dial, walk away, and get seven eggs cooked exactly how you asked for them.',
    description:
      'A 400W electric egg steamer that cooks up to seven eggs at once to a soft, medium or hard yolk, then shuts itself off and beeps — no timer watching, no guessing, no pan of boiling water on the hob.',

    images: [
      `/products/duronic-eb40-electric-egg-boiler/1.jpg`,
      `/products/duronic-eb40-electric-egg-boiler/2.jpg`,
      `/products/duronic-eb40-electric-egg-boiler/3.jpg`,
      `/products/duronic-eb40-electric-egg-boiler/4.jpg`,
    ],
    awardBadge: { line1: "AMAZON'S", line2: 'CHOICE' },

    trustBadges: [
      { icon: 'star', label: '4.3 rating', sublabel: '778 reviews' },
      { icon: 'award', label: "Amazon's Choice", sublabel: 'In Egg Boilers' },
      { icon: 'package', label: '7 Eggs', sublabel: 'Cooked in one batch' },
      { icon: 'timer', label: 'Auto Shut-Off', sublabel: 'With ready buzzer' },
    ],
    specs: [
      { icon: 'zap', label: 'Power', value: '400W' },
      { icon: 'package', label: 'Capacity', value: 'Up to 7 eggs per batch' },
      { icon: 'sliders', label: 'Settings', value: 'Soft / medium / hard dial' },
      { icon: 'timer', label: 'Shut-off', value: 'Automatic, with buzzer' },
      { icon: 'droplet', label: 'Measuring cup', value: '11.5cm tall, MAX line, built-in piercer' },
      { icon: 'ruler', label: 'Dimensions', value: '20.5 x 18 x 14.5 cm' },
      { icon: 'layers', label: 'Material', value: 'Stainless steel body, black finish' },
      { icon: 'shield-check', label: 'Warranty', value: '1 year against manufacturer defects' },
    ],
    features: [
      {
        icon: 'package',
        title: 'Seven eggs at once',
        body: 'A single tray holds seven eggs, so one run covers a family breakfast or a week of meal-prep in one go.',
      },
      {
        icon: 'sliders',
        title: 'Soft, medium or hard dial',
        body: 'A front knob sets the yolk consistency you want rather than leaving you to time it yourself.',
      },
      {
        icon: 'timer',
        title: 'Shuts off and beeps',
        body: 'The cooker cuts power and sounds a buzzer when the eggs are done, so nothing is left boiling dry.',
      },
      {
        icon: 'droplet',
        title: 'Measuring cup with egg piercer',
        body: 'The cup meters the water to a MAX line and has a pin underneath to prick shells, which helps stop cracking.',
      },
      {
        icon: 'flame',
        title: 'Poaching and omelette trays',
        body: 'Duronic lists trays for poached eggs and omelettes alongside the boiling rack, extending it past plain boiled eggs.',
      },
      {
        icon: 'shield-check',
        title: 'Anti-slip base',
        body: 'Rubber feet keep the unit planted on the worktop while it is running and while you lift the hot lid off.',
      },
    ],

    pros: [
      'Cooks seven eggs in one batch — enough for a family breakfast or a batch of meal prep',
      'Soft, medium and hard settings on a single dial, no timing by hand',
      'Automatic shut-off with a buzzer means you can leave it and do something else',
      'Measuring cup doubles as an egg piercer, which cuts down on cracked shells',
      'Compact 20.5 x 18cm footprint suits small kitchens, dorms and office break rooms',
      "Amazon's Choice in Egg Boilers with a 4.3 rating across 778 reviews",
    ],
    cons: [
      'Duronic themselves warn that trapped steam under the lid can carry on cooking soft and medium eggs after shut-off',
      'The 1-year warranty is short next to the 3-year cover some kitchen brands offer',
      'This listing sells several styles at different prices — check which one is selected before you buy',
    ],
    bestFor: [
      'Households cooking several eggs at once on a weekday morning',
      'Meal preppers who batch-boil eggs for the week ahead',
      'Small kitchens, student halls and office break rooms with little counter space',
    ],
    notIdealFor: [
      'Anyone who wants a digital timer or LCD readout rather than a mechanical dial',
      'Cooks who want soft-boiled eggs stopped to the second without lifting the lid promptly',
    ],

    score: 8.5,
    verdict:
      "A simple, well-priced egg steamer that does the one job properly — seven eggs, one dial, and a buzzer when they are ready. The 4.3 rating across 778 reviews and the Amazon's Choice badge back it up; just lift the lid promptly if you like your yolks runny, because Duronic admits residual steam keeps cooking after the power cuts.",

    faq: [
      {
        q: 'How many eggs can it cook at once?',
        a: 'Up to seven eggs in a single batch, held on one tray under the clear lid.',
      },
      {
        q: 'How do I choose soft, medium or hard eggs?',
        a: 'Fill the measuring cup with water to the max line and turn the front dial to soft, medium or hard — the setting on the dial determines the texture, not the amount of water.',
      },
      {
        q: 'Does it turn itself off?',
        a: 'Yes. It cuts power and sounds a buzzer when the eggs are done. Duronic notes that for soft and medium eggs the trapped steam can keep cooking them after shut-off, so lift the lid promptly.',
      },
      {
        q: 'What is the measuring cup for?',
        a: 'It meters the right amount of water up to a MAX line, and has a piercing pin built into the base to prick the shell before cooking, which helps prevent cracking and cooks the egg more evenly.',
      },
    ],
  },
  {
    slug: 'etenwolf-vortex-s6-tyre-inflator',
    asin: 'B0D17QMS6F',
    affiliateTag: 'lovelytools-21',
    amazonDomain: 'amazon.co.uk',

    categoryLabel: 'Car & Motorbike',
    categoryPath: '/buyers-guide?category=car-motorbike',

    brand: 'ETENWOLF',
    name: 'Vortex S6 Tyre Inflator, Portable Air Compressor, 19200mAh Battery | for Heavy-Duty Vehicles, Cordless Air Pump for Cars, Bikes and Inflatables, 100% Duty Cycle and Dual Cylinder, Vivid Orange',
    tagline: 'A dual-cylinder cordless compressor built for truck and 4x4 tyres, not just topping up a hatchback.',
    description:
      'A 19200mAh cordless air compressor with a dual-cylinder pump and active cooling, rated for a 100% duty cycle — it will fill all four tyres on a pickup back to back without a cool-down break, and doubles as a 45W USB-C power bank and 1000-lumen work light.',

    images: [
      `/products/etenwolf-vortex-s6-tyre-inflator/1.jpg`,
      `/products/etenwolf-vortex-s6-tyre-inflator/2.jpg`,
      `/products/etenwolf-vortex-s6-tyre-inflator/3.jpg`,
      `/products/etenwolf-vortex-s6-tyre-inflator/4.jpg`,
    ],
    awardBadge: { line1: "AMAZON'S", line2: 'CHOICE' },

    trustBadges: [
      { icon: 'battery-charging', label: '19200mAh', sublabel: '18 pickup tyres, 30→35 PSI per charge' },
      { icon: 'gauge', label: '160 PSI max', sublabel: '1.5 CFM / 42 L/min airflow' },
      { icon: 'star', label: '4.6 rating', sublabel: '331 reviews' },
      { icon: 'refresh-ccw', label: '100% duty cycle', sublabel: 'Dual cylinder, active cooling' },
    ],
    specs: [
      { icon: 'gauge', label: 'Max pressure', value: '160 PSI' },
      { icon: 'droplet', label: 'Airflow rate', value: '1.5 CFM / 42 L/min @ 0 PSI' },
      { icon: 'battery', label: 'Battery', value: '19200mAh lithium' },
      { icon: 'zap', label: 'Charging', value: 'USB-C 45W, dual-direction' },
      { icon: 'layers', label: 'Pump', value: 'Dual cylinder with dedicated cooling' },
      { icon: 'sliders', label: 'Preset modes', value: '7, with preset pressure memory' },
      { icon: 'flame', label: 'LED light', value: '1000 lumens, plus flashing and SOS' },
      { icon: 'package', label: 'In the box', value: 'S6 inflator, 45W wall charger, cable, 2 air hoses, ball needle, Presta adapter, press-on valve' },
    ],
    features: [
      {
        icon: 'timer',
        title: 'Fills a 31" tyre in a minute',
        body: 'ETENWOLF rates it at 1.5 CFM (42 L/min) at 0 PSI, taking a 31-inch pickup tyre from 30 to 35 PSI in about a minute.',
      },
      {
        icon: 'refresh-ccw',
        title: '100% duty cycle',
        body: 'The dual-cylinder pump and dedicated cooling system let you take all four F150 tyres from 0 to 35 PSI back to back with no cool-down break in between.',
      },
      {
        icon: 'battery-charging',
        title: '19200mAh on board',
        body: 'A full charge covers 18 pickup tyre top-ups (245/70 R17) from 30 to 35 PSI, so it stays useful across a whole trip rather than one tyre.',
      },
      {
        icon: 'zap',
        title: '45W dual-direction USB-C',
        body: 'The same port charges the inflator quickly and outputs to your phone or other devices, so it works as a power bank when parked up.',
      },
      {
        icon: 'circle-dot',
        title: 'Auto stop at target',
        body: 'Set a target pressure and it shuts off on its own, with seven preset modes and pressure memory so your usual setting is one press away.',
      },
      {
        icon: 'monitor',
        title: '1000-lumen light + digital display',
        body: 'The screen shows current and target pressure side by side, and the LED runs at 1000 lumens with flashing and SOS modes — bright enough to use as a camping lantern.',
      },
    ],

    pros: [
      "Amazon's Choice with a 4.6 rating across 331 reviews, 100+ bought in the past month",
      'Genuinely sized for heavy-duty vehicles — pickups, trucks and off-roaders, not just car tyres',
      '100% duty cycle means all four tyres in one session without waiting for the pump to cool',
      '19200mAh battery covers roughly 18 pickup tyre top-ups per charge and feeds a 45W USB-C output',
      'Auto-stop, seven preset modes and pressure memory make repeat inflations near hands-off',
    ],
    cons: [
      'At £100+ it is priced well above the small pocket inflators it sits next to on Amazon',
      'Rated at 82 decibels — noticeably loud next to a compact single-cylinder pump',
      'ETENWOLF specifically excludes SUPs from the recommended inflatables',
    ],
    bestFor: [
      'Pickup, truck, 4x4 and RV owners who need real volume, not just a top-up pump',
      'Overlanders and off-roaders airing tyres back down and up in one session',
      'Anyone who wants one device covering tyres, inflatables, a power bank and a work light',
    ],
    notIdealFor: [
      'Drivers who only ever top up a small car tyre occasionally — a cheaper compact pump does that',
      'Inflating stand-up paddleboards, which the manufacturer explicitly rules out',
      'Anyone who needs a quiet pump for use near sleeping neighbours or campers',
    ],

    score: 9.2,
    verdict:
      'The Vortex S6 is a heavy-duty cordless compressor that backs its numbers up with a 4.6 rating from 331 reviewers — the dual-cylinder 100% duty cycle and 19200mAh battery are what separate it from the pocket inflators, and the 45W power bank and 1000-lumen light make it worth the space in the boot.',

    faq: [
      {
        q: 'How fast does it inflate a large tyre?',
        a: 'ETENWOLF rates it at 1.5 CFM (42 L/min) at 0 PSI, filling a 31-inch tyre from 30 to 35 PSI in around a minute. Maximum pressure is 160 PSI with gauge accuracy of ±1 PSI.',
      },
      {
        q: 'Can it do all four tyres without stopping?',
        a: 'Yes — the dual-cylinder pump and dedicated cooling system give it a 100% duty cycle, so ETENWOLF states you can take all four F150 tyres (245/70 R17) from 0 to 35 PSI continuously with no breaks.',
      },
      {
        q: 'How many tyres does one charge cover?',
        a: 'The 19200mAh battery is rated for 18 pickup tyre inflations from 30 to 35 PSI on a full charge, and recharges through a 45W USB-C port.',
      },
      {
        q: 'What else can it inflate?',
        a: 'Besides pickups, trucks and off-road vehicles, it handles regular cars, bicycles, balls, pool floats and air mattresses. It is not recommended for stand-up paddleboards.',
      },
    ],
  },
  {
    slug: 'inphic-bluetooth-silent-wireless-mouse',
    asin: 'B09K41MDJG',
    affiliateTag: 'lovelytools-21',
    amazonDomain: 'amazon.co.uk',

    categoryLabel: 'Computers & Accessories',
    categoryPath: '/buyers-guide?category=computers-accessories',

    brand: 'INPHIC',
    name: 'Bluetooth Mouse, [Upgraded] Multi-Device Silent Rechargeable Bluetooth Wireless Mouse (Tri-Mode: BT 5.0/4.0+2.4G), 1600DPI Ergonomic Portable Mouse for Laptop PC Computer Mac, Black',
    tagline: 'Three connection modes, silent clicks and months between charges — for under twenty pounds.',
    description:
      'A rechargeable wireless mouse that holds two Bluetooth pairings and a 2.4G dongle at once, switching between them with a button on the base. The left and right clicks are silent, and a 700mAh battery means you charge it a few times a year rather than swapping AAs.',

    images: [
      `/products/inphic-bluetooth-silent-wireless-mouse/1.jpg`,
      `/products/inphic-bluetooth-silent-wireless-mouse/2.jpg`,
      `/products/inphic-bluetooth-silent-wireless-mouse/3.jpg`,
      `/products/inphic-bluetooth-silent-wireless-mouse/4.jpg`,
    ],
    awardBadge: { line1: "AMAZON'S", line2: 'CHOICE' },

    trustBadges: [
      { icon: 'star', label: '4.4 rating', sublabel: '6,072 reviews, 200+ bought last month' },
      { icon: 'layers', label: '3 modes', sublabel: 'BT 5.0, BT 4.0 and 2.4G USB' },
      { icon: 'battery-charging', label: '700mAh', sublabel: 'Months of use per charge' },
      { icon: 'volume-2', label: 'Silent click', sublabel: 'Left and right buttons' },
    ],
    specs: [
      { icon: 'wifi', label: 'Connection', value: 'Bluetooth 5.0, Bluetooth 4.0, 2.4G USB' },
      { icon: 'battery', label: 'Battery', value: '700mAh lithium-polymer, rechargeable' },
      { icon: 'gauge', label: 'DPI levels', value: '1000 / 1200 / 1600, switchable' },
      { icon: 'sliders', label: 'Buttons', value: '6, including DPI and mode switch' },
      { icon: 'circle-dot', label: 'Sensor', value: 'Optical' },
      { icon: 'ruler', label: 'Range', value: 'Up to 10 m in each mode' },
      { icon: 'monitor', label: 'Compatibility', value: 'Windows 8/10, macOS, Android, iOS/iPadOS 14+' },
      { icon: 'users', label: 'Shape', value: 'Ergonomic, right-handed' },
    ],
    features: [
      {
        icon: 'layers',
        title: 'Three devices, one button',
        body: 'Holds Bluetooth 5.0, Bluetooth 4.0 and a 2.4G USB receiver at the same time. A switch on the base moves between them, with a green, blue or red light showing which is live.',
      },
      {
        icon: 'volume-2',
        title: 'Silent left and right clicks',
        body: 'The main buttons are near-silent, which is the difference between usable and antisocial in a shared office, a library, or a room where someone is asleep.',
      },
      {
        icon: 'battery-charging',
        title: 'Recharges, and rarely needs to',
        body: 'A 700mAh lithium-polymer cell runs for several months on a charge, so there are no AA batteries to keep buying and no dead mouse mid-task.',
      },
      {
        icon: 'circle-dot',
        title: 'Three power lights',
        body: 'Three indicators on top show how much charge is left rather than leaving you to guess, and the charging light switches itself off once the battery is full.',
      },
      {
        icon: 'gauge',
        title: '1000, 1200 or 1600 DPI',
        body: 'Three sensitivity steps on a dedicated button — slower for precise work, faster for crossing a large or high-resolution screen.',
      },
      {
        icon: 'users',
        title: 'Shaped for a right hand',
        body: 'A contoured right-handed body with a thumb rest, aimed at all-day desk use rather than the flat travel mice common at this price.',
      },
    ],

    pros: [
      "Amazon's Choice with a 4.4 rating across 6,072 reviews, 200+ bought in the past month",
      'Genuine tri-mode: two Bluetooth pairings plus a 2.4G dongle, switched from the base',
      'Silent left and right clicks make it usable in shared and quiet spaces',
      'Rechargeable 700mAh battery lasts months per charge, with three indicator lights',
      'Six buttons and three DPI steps at a price where two buttons is common',
    ],
    cons: [
      'Right-handed shape only — there is no left-handed version of this body',
      'Bluetooth 5.0 mode needs Windows 8 or 10; Windows 7 and XP are not supported, and iOS devices need iOS 14 or later',
      '1600 DPI tops out below what a large 4K display or gaming really wants',
    ],
    bestFor: [
      'Anyone moving between a laptop, tablet and desktop who wants one mouse for all three',
      'Shared offices, libraries and bedrooms where clicking noise matters',
      'People tired of buying AA batteries for a wireless mouse',
    ],
    notIdealFor: [
      'Left-handed users, given the contoured right-handed shell',
      'Gaming or high-resolution work that needs more than 1600 DPI',
      'Machines still on Windows 7 or XP, or iPhones and iPads below iOS 14',
    ],

    score: 8.6,
    verdict:
      'A lot of mouse for under twenty pounds: three-way switching, silent clicks and a rechargeable battery that lasts months are features usually found further up the range. The 4.4 average across 6,072 reviews reflects a solid everyday mouse rather than a precision instrument — the right-handed-only shell and the 1600 DPI ceiling are the honest limits.',

    faq: [
      {
        q: 'How do I switch between devices?',
        a: 'A mode button on the bottom of the mouse cycles between Bluetooth 5.0, Bluetooth 4.0 and the 2.4G USB receiver. An indicator shows green, blue or red for the active mode, so once each is paired you move between them with a single press.',
      },
      {
        q: 'How long does a charge last?',
        a: 'INPHIC rates the built-in 700mAh lithium-polymer battery at several months of use per charge. Three power indicator lights on the mouse show the remaining level, and the blue charging light turns itself off once it is full.',
      },
      {
        q: 'Is it actually silent?',
        a: 'The left and right buttons use silent switches, which is what makes it suitable for a library, dorm or office. The scroll wheel and side buttons are ordinary ones, so it is quiet rather than completely without sound.',
      },
      {
        q: 'Does it work with an iPad or iPhone?',
        a: 'Yes over Bluetooth 5.0, provided the device is on iOS 14 or later. On computers, Bluetooth 5.0 supports Windows 8 and 10, macOS and Android — but not Windows 7 or XP. The 2.4G receiver works with any device that has a USB port.',
      },
    ],
  },
  {
    slug: 'ghguole-70pc-tyre-repair-kit',
    asin: 'B0BCJNHFNY',
    affiliateTag: 'lovelytools-21',
    amazonDomain: 'amazon.co.uk',

    categoryLabel: 'Car & Motorbike',
    categoryPath: '/buyers-guide?category=car-motorbike',

    brand: 'Ghguole',
    name: 'Tyre Repair Kit, 70pcs Tyre Plug Kit, Heavy Duty Tyre Puncture Repair Kit, Universal Car Tyre Patch Kit with 30 Tyre Repair Rubber Strip for Tires on Cars, Trucks, Motorcycles, ATV, Tractor, Van',
    tagline: 'Thirty plugs, a pressure gauge and the valve tools to go with them, in a pouch that lives in the boot.',
    description:
      'A 70-piece tubeless tyre plug kit built around a hardened steel spiral probe and insert tool, with 30 rubber repair strips so it handles more than one puncture. The zip case is small enough to keep in the car permanently rather than remembering to pack it.',

    images: [
      `/products/ghguole-70pc-tyre-repair-kit/1.jpg`,
      `/products/ghguole-70pc-tyre-repair-kit/2.jpg`,
      `/products/ghguole-70pc-tyre-repair-kit/3.jpg`,
      `/products/ghguole-70pc-tyre-repair-kit/4.jpg`,
    ],
    awardBadge: { line1: "AMAZON'S", line2: 'CHOICE' },

    trustBadges: [
      { icon: 'star', label: '4.5 rating', sublabel: '2,901 reviews, 600+ bought last month' },
      { icon: 'package', label: '70 pieces', sublabel: 'Including 30 repair strips' },
      { icon: 'shield-check', label: 'Hardened steel', sublabel: 'Sandblasted insert needle' },
      { icon: 'truck', label: 'Universal fit', sublabel: 'Cars, bikes, ATVs, tractors, vans' },
    ],
    specs: [
      { icon: 'package', label: 'Total pieces', value: '70' },
      { icon: 'layers', label: 'Repair strips', value: '30 rubber plug strips' },
      { icon: 'wrench', label: 'Core tools', value: 'T-handle spiral probe, T-handle insert tool, threaded needle handle, pliers, hex key' },
      { icon: 'gauge', label: 'Pressure gauge', value: 'Pencil type, dual-headed, 12 cm' },
      { icon: 'settings', label: 'Valve hardware', value: '8 valve cores, 4-way valve tool, 8 plastic caps, 4 extension caps' },
      { icon: 'lock', label: 'Anti-theft nuts', value: '4 stainless steel + 4 aluminium alloy' },
      { icon: 'droplet', label: 'Lubricant', value: '1 tub included' },
      { icon: 'ruler', label: 'Case size', value: '20.5 × 14.5 cm zip pouch' },
    ],
    features: [
      {
        icon: 'wrench',
        title: 'Probe and insert, both T-handled',
        body: 'A spiral probe reams and cleans the hole, then the forked insert tool drives the plug home. Both use a full T-handle, which is what makes it possible to push through a car tyre by hand.',
      },
      {
        icon: 'layers',
        title: '30 repair strips',
        body: 'Enough plugs for many punctures rather than the two or three a minimal kit ships with, so one purchase covers years of occasional use.',
      },
      {
        icon: 'gauge',
        title: 'Pencil pressure gauge included',
        body: 'A dual-headed pencil gauge comes in the pouch, so you can check the tyre back to its correct pressure after a repair without a separate tool.',
      },
      {
        icon: 'settings',
        title: 'Valve servicing too',
        body: 'A four-way valve tool plus eight spare valve cores and caps, which covers the other common cause of a slow leak — a leaking valve rather than a punctured tread.',
      },
      {
        icon: 'lock',
        title: 'Anti-theft valve nuts',
        body: 'Four stainless steel and four aluminium alloy anti-theft nuts are included alongside the ordinary caps.',
      },
      {
        icon: 'ruler',
        title: 'Fits in the boot and stays there',
        body: 'The whole kit packs into a 20.5 × 14.5 cm zip cloth case, small enough to leave in the car for a roadside emergency instead of in the garage.',
      },
    ],

    pros: [
      "Amazon's Choice with a 4.5 rating across 2,901 reviews, 600+ bought in the past month",
      '30 repair strips included — most kits at this price ship a handful',
      'Goes beyond plugs: pressure gauge, four-way valve tool, spare valve cores and anti-theft nuts',
      'Hardened steel auger with a sandblasted insert needle, rather than soft plated tools',
      'Compact 20.5 × 14.5 cm case that genuinely lives in a boot or door pocket',
    ],
    cons: [
      'Tubeless tyres only — the manufacturer explicitly excludes tubed tyres',
      'Not for sidewall punctures, which are a tread-repair kit\'s standard limit',
      'No pump or compressor in the kit, so you still need a way to reinflate after plugging',
      'One small tub of lubricant and no vulcanising cement, so heavy use means buying more',
    ],
    bestFor: [
      'Drivers who want a roadside puncture fix that gets them to a garage under their own power',
      'Motorcyclists, van drivers and anyone running tubeless tyres on more than one vehicle',
      'Keeping permanently in the boot alongside a 12V inflator',
    ],
    notIdealFor: [
      'Tubed tyres, including most bicycles and some older motorcycles',
      'Sidewall or shoulder damage, which no plug kit can safely repair',
      'Anyone expecting a workshop-grade permanent repair rather than a get-you-home plug',
    ],

    score: 9.0,
    verdict:
      'A properly complete tyre plug kit rather than the four-piece minimum: the 30 strips, pressure gauge and valve tools cover most of what actually goes wrong with a tyre, and 4.5 stars from 2,901 reviewers backs up the build. Just know its limits — tubeless tread punctures only, and you will need something to put the air back in.',

    faq: [
      {
        q: 'What tyres can this repair?',
        a: 'Any tubeless tyre — cars, trucks, motorcycles, ATVs, tractors, vans, lawn mowers, RVs and jeeps. Ghguole is explicit that it is not designed for tubed tyres or for sidewall punctures, which cannot be safely plugged.',
      },
      {
        q: 'What are the 70 pieces?',
        a: '30 rubber repair strips, a T-handle spiral probe, a T-handle insert tool, a threaded needle handle, pliers, a hex key, a pencil pressure gauge, a four-way valve tool, 8 valve cores, 8 plastic valve caps, 4 extension caps, 4 stainless and 4 aluminium anti-theft nuts, a tub of lubricant and the cloth case.',
      },
      {
        q: 'Do I need anything else to fix a puncture?',
        a: 'Yes — a way to reinflate. The kit plugs the hole and lets you check the pressure with the included gauge, but there is no pump or compressor in it, so pair it with a 12V or cordless inflator.',
      },
      {
        q: 'How big is the case?',
        a: 'The zip cloth pouch measures 20.5 × 14.5 cm. The T-handle tools are 14 cm long with a 9.5 cm handle, and the pressure gauge is 12 cm, so the whole thing stores flat in a boot or under a seat.',
      },
    ],
  },
  {
    slug: 'hontry-10x25-compact-binoculars',
    asin: 'B07Q1GHB5X',
    affiliateTag: 'lovelytools-21',
    amazonDomain: 'amazon.co.uk',

    categoryLabel: 'Cameras & Photography',
    categoryPath: '/buyers-guide?category=cameras-photography',

    brand: 'Hontry',
    name: '10x25 Compact Binoculars for Adults and Kids Bird Watching | Small Binoculars for Camping, Hiking, Travel, Safari, Concerts, Theatre, Sports, Cruising and Road Trip',
    tagline: 'Pocket-sized 10x binoculars with BAK-4 glass, backed by more reviews than almost anything else in the category.',
    description:
      'A 260 g compact that fits where your phone fits, pairing 10x magnification with BAK-4 prisms and fully multi-coated optics. The interpupillary distance adjusts from 60 to 75 mm, so the same pair works for a child and an adult.',

    images: [
      `/products/hontry-10x25-compact-binoculars/1.jpg`,
      `/products/hontry-10x25-compact-binoculars/2.jpg`,
      `/products/hontry-10x25-compact-binoculars/3.jpg`,
      `/products/hontry-10x25-compact-binoculars/4.jpg`,
    ],
    awardBadge: { line1: "AMAZON'S", line2: 'CHOICE' },

    trustBadges: [
      { icon: 'star', label: '4.5 rating', sublabel: '22,673 reviews, 1K+ bought last month' },
      { icon: 'gauge', label: '10x25', sublabel: '10x magnification, 25 mm objective' },
      { icon: 'package', label: '260 g', sublabel: 'Fits a jacket pocket' },
      { icon: 'droplet', label: '96.4% light', sublabel: 'Fully multi-coated BAK-4 optics' },
    ],
    specs: [
      { icon: 'gauge', label: 'Magnification', value: '10x' },
      { icon: 'circle-dot', label: 'Objective lens', value: '25 mm' },
      { icon: 'layers', label: 'Prisms', value: 'BAK-4, fully multi-coated' },
      { icon: 'droplet', label: 'Light transmission', value: '96.4%, 1.552 refractive index' },
      { icon: 'sliders', label: 'Interpupillary distance', value: '60–75 mm adjustable' },
      { icon: 'ruler', label: 'Dimensions', value: '11 × 10 × 5 cm (4.33 × 3.94 × 1.97 in)' },
      { icon: 'package', label: 'Weight', value: '260 g' },
      { icon: 'shield-check', label: 'Body', value: 'ABS with slip-resistant textured grip' },
    ],
    features: [
      {
        icon: 'gauge',
        title: '10x without the wobble',
        body: 'Hontry pitches 10x as the balance point — enough reach to pick out a bird across a field, but not so much that every heartbeat shows in the image the way higher-power compacts do.',
      },
      {
        icon: 'layers',
        title: 'BAK-4 prisms, fully multi-coated',
        body: 'The higher-grade prism glass gives images real depth rather than the washed-out flatness of BK-7 budget optics, with anti-reflective coating on every air-to-glass surface.',
      },
      {
        icon: 'droplet',
        title: '96.4% light transmission',
        body: 'Hontry quotes 96.4% transmission and under 0.5% surface reflectance, which is what keeps the view usable as the light drops at the end of an afternoon.',
      },
      {
        icon: 'ruler',
        title: 'Fits where your phone fits',
        body: 'At 11 × 10 × 5 cm and 260 g it slides into a jacket pocket or glove box, which is the difference between binoculars you carry and binoculars you leave at home.',
      },
      {
        icon: 'sliders',
        title: '60–75 mm IPD range',
        body: 'The barrels fold to match eye spacing from a child to most adults, so one pair genuinely gets shared around rather than only fitting the person who bought it.',
      },
      {
        icon: 'package',
        title: 'Pouch and strap included',
        body: 'A soft carry pouch and neck strap come in the box, so it is ready to take out without buying accessories first.',
      },
    ],

    pros: [
      "Amazon's Choice with a 4.5 rating across 22,673 reviews — among the most-reviewed compacts on Amazon UK, 1K+ bought in the past month",
      'Genuinely pocketable at 260 g and 11 × 10 × 5 cm',
      'BAK-4 prisms and fully multi-coated optics at a price where BK-7 is common',
      'Interpupillary distance adjusts 60–75 mm, so kids and adults can share one pair',
      'Carry pouch and neck strap included',
    ],
    cons: [
      'A 25 mm objective gathers far less light than a full-size 42 mm binocular, so dawn and dusk viewing is limited whatever the coatings',
      'No tripod socket — Amazon lists mounting type as "No" — so long static observation means holding them up',
      '10x in a body this light shows hand shake more than an 8x compact would',
      'ABS plastic body rather than a rubber-armoured metal chassis',
    ],
    bestFor: [
      'Bird watching, hiking and travel where size and weight decide whether you actually bring them',
      'Families wanting one pair that fits both children and adults',
      'Concerts, theatre and sport, or keeping in the glove box for the view that turns up unplanned',
    ],
    notIdealFor: [
      'Serious low-light wildlife watching or astronomy, which needs a much larger objective',
      'Tripod-mounted observation, since there is no mounting socket',
      'Rough handling or wet weather work that calls for a sealed, armoured body',
    ],

    score: 9.1,
    verdict:
      'The review count is the story here: 4.5 stars across 22,673 buyers is about as much evidence as a compact binocular gets, and the BAK-4 glass and multi-coating justify it at the price. Buy them for what they are — a 260 g pair you will actually carry — not as a substitute for full-size optics in poor light.',

    faq: [
      {
        q: 'Will these fit a child?',
        a: 'Yes. The interpupillary distance adjusts from 60 mm to 75 mm by folding the barrels, which covers most children through to most adults, so the same pair can be handed round a family.',
      },
      {
        q: 'How good are they in low light?',
        a: 'Better than the price suggests, thanks to BAK-4 prisms, fully multi-coated lenses and a quoted 96.4% light transmission. But the 25 mm objective is the hard limit — for genuine dusk or dawn use, a 42 mm binocular gathers far more light.',
      },
      {
        q: 'What comes in the box?',
        a: 'The binoculars, a soft carry pouch and a neck strap. There is no tripod adapter, and Amazon lists the mounting type as "No", so they are designed to be hand-held.',
      },
      {
        q: 'How small are they really?',
        a: 'About 11 × 10 × 5 cm (4.33 × 3.94 × 1.97 in) and 260 g — roughly a palm-sized block that Hontry describes as fitting where your phone fits.',
      },
    ],
  },
  {
    slug: 'deesoo-20x25-compact-binoculars',
    asin: 'B0H2DM469L',
    affiliateTag: 'lovelytools-21',
    amazonDomain: 'amazon.co.uk',

    categoryLabel: 'Cameras & Photography',
    categoryPath: '/buyers-guide?category=cameras-photography',

    brand: 'deesoo',
    name: 'Compact Binoculars for Adults Kids — 20×25 High Power for Bird Watching | Small, Pocket, FMC, BAK4 Prism, Large Eyepiece, Easy Focus, Easy to Carry, Travel, Sightseeing, Outdoors, Hunting, Theatre',
    tagline: 'Twice the magnification of a standard pocket compact, with the trade-offs that come with it.',
    description:
      'A palm-sized 20x binocular with BAK4 prisms, fully multi-coated optics and 25 mm of eye relief for glasses wearers. The high magnification buys reach a 10x compact cannot match, at the cost of a dimmer, shakier image — worth knowing before you choose between them.',

    images: [
      `/products/deesoo-20x25-compact-binoculars/1.jpg`,
      `/products/deesoo-20x25-compact-binoculars/2.jpg`,
      `/products/deesoo-20x25-compact-binoculars/3.jpg`,
      `/products/deesoo-20x25-compact-binoculars/4.jpg`,
    ],
    awardBadge: { line1: "AMAZON'S", line2: 'CHOICE' },

    trustBadges: [
      { icon: 'star', label: '4.5 rating', sublabel: 'From 33 reviews — a small sample' },
      { icon: 'gauge', label: '20x25', sublabel: 'High power in a pocket body' },
      { icon: 'users', label: '25 mm eye relief', sublabel: 'Twist-up eyecups for glasses' },
      { icon: 'package', label: 'Full kit', sublabel: 'Case, strap, cloth and lens covers' },
    ],
    specs: [
      { icon: 'gauge', label: 'Magnification', value: '20x' },
      { icon: 'circle-dot', label: 'Objective lens', value: '25 mm' },
      { icon: 'layers', label: 'Prism', value: 'BAK4' },
      { icon: 'droplet', label: 'Coatings', value: 'FMC — green-coated objectives, blue-coated eyepieces' },
      { icon: 'ruler', label: 'Exit pupil', value: '1.25 mm (25 ÷ 20)' },
      { icon: 'users', label: 'Eye relief', value: '25 mm, twist-up eyecups' },
      { icon: 'settings', label: 'Focus', value: 'Central knob plus right-eyepiece diopter' },
      { icon: 'package', label: 'Weight', value: '0.6 lb (about 272 g)' },
    ],
    features: [
      {
        icon: 'gauge',
        title: '20x in a pocket body',
        body: 'Double the magnification of the 10x compacts that dominate this price bracket, which is the whole reason to pick it — deesoo pitches it directly against 12x rivals.',
      },
      {
        icon: 'layers',
        title: 'BAK4 prisms, fully multi-coated',
        body: 'The better prism glass and multi-layer coatings on every air-to-glass surface are what keep contrast up, rather than the single-coated optics common further down the range.',
      },
      {
        icon: 'users',
        title: '25 mm eye relief',
        body: 'Unusually generous, and paired with twist-up eyecups that fold down for spectacle wearers — so you can keep your glasses on and still see the full field.',
      },
      {
        icon: 'settings',
        title: 'Centre focus and diopter',
        body: 'A central knob focuses both barrels together, and the right eyepiece adjusts separately to correct for a difference between your eyes.',
      },
      {
        icon: 'ruler',
        title: 'Fits in one hand',
        body: 'At roughly 272 g the barrels fold into a palm-sized block that drops into a coat pocket or day bag.',
      },
      {
        icon: 'package',
        title: 'Ready out of the box',
        body: 'Case, neck strap, cleaning cloth and lens covers are all included, so nothing else needs buying before the first outing.',
      },
    ],

    pros: [
      "Amazon's Choice, rated 4.5 with 50+ bought in the past month",
      '20x magnification gives noticeably more reach than the 10x compacts it sits beside',
      'BAK4 prisms with fully multi-coated optics rather than single-coated budget glass',
      '25 mm eye relief and twist-up eyecups genuinely accommodate glasses',
      'Case, neck strap, cleaning cloth and lens covers all included',
    ],
    cons: [
      'Only 33 reviews, so the 4.5 rating rests on a much smaller sample than the established compacts around it',
      '20x over a 25 mm objective leaves a 1.25 mm exit pupil — a dim image, and low light is where that shows first',
      'Hand shake is magnified 20x too, so a steady view usually means bracing against something',
      'Plastic body, no tripod socket listed, and it costs more than well-reviewed 10x25 alternatives',
    ],
    bestFor: [
      'Daylight viewing where reach matters more than brightness — sightseeing, raptors on a distant perch, stage and stadium',
      'Glasses wearers, thanks to the 25 mm eye relief and folding eyecups',
      'Anyone who already owns a wide 8x or 10x and wants a pocketable high-power second pair',
    ],
    notIdealFor: [
      'Dawn, dusk or woodland light, where the 1.25 mm exit pupil runs out first',
      'Handheld use for long stretches without something to lean on',
      'A first and only binocular — a 10x25 or 8x42 is easier to live with',
    ],

    score: 8.4,
    verdict:
      'The optics tick the right boxes for the money — BAK4, fully multi-coated, real eye relief — and 20x buys reach nothing else this size offers. Scored below the other 4.5-star compacts here deliberately: 33 reviews is thin evidence, and the 1.25 mm exit pupil is a genuine limitation rather than a quibble.',

    faq: [
      {
        q: 'Is 20x better than the usual 10x compact?',
        a: 'It is more magnification, which is not the same as better. You get twice the reach, but the same 25 mm lens now spreads its light over twice the magnification, so the image is dimmer and every tremor in your hands is doubled. In good light on a distant subject it wins; in poor light, or held unsupported, a 10x is the easier tool.',
      },
      {
        q: 'Do they work if I wear glasses?',
        a: 'Yes — 25 mm of eye relief is generous, and the eyecups twist down so you can hold the binoculars closer with spectacles on and still take in the whole field of view.',
      },
      {
        q: 'What comes in the box?',
        a: 'The binoculars, a carry case, a neck strap, a cleaning cloth and lens covers. deesoo bills it as a complete kit, and nothing further is needed to start using them.',
      },
      {
        q: 'How do I focus them?',
        a: 'A central knob between the barrels focuses both eyepieces at once, and the right eyepiece turns independently so you can set it once for any difference between your eyes and then use the centre knob alone.',
      },
    ],
  },
  {
    slug: 'cigman-cnvpro-4k-night-vision-goggles',
    asin: 'B0FG2L5PDY',
    affiliateTag: 'lovelytools-21',
    amazonDomain: 'amazon.co.uk',

    categoryLabel: 'Cameras & Photography',
    categoryPath: '/buyers-guide?category=cameras-photography',

    brand: 'CIGMAN',
    name: 'CNVPRO Night Vision Goggles 4K with 1000M Range, F/0.8 Aperture, 4" Display, Wi-Fi Control, IP54 Night Vision Scope with Flashlight, Backlit Buttons & 64GB Storage for Outdoor Use',
    tagline: 'A 4-inch screen instead of an eyepiece, so two people can watch the same thing at once.',
    description:
      'Digital night vision built around an F/0.8 lens and a 4-inch display, recording to an included 64 GB card and streaming to your phone over Wi-Fi. The 5100 mAh battery runs 12 hours with the infrared illuminator on, which is the number that matters for actual night use.',

    images: [
      `/products/cigman-cnvpro-4k-night-vision-goggles/1.jpg`,
      `/products/cigman-cnvpro-4k-night-vision-goggles/2.jpg`,
      `/products/cigman-cnvpro-4k-night-vision-goggles/3.jpg`,
      `/products/cigman-cnvpro-4k-night-vision-goggles/4.jpg`,
    ],
    awardBadge: { line1: "AMAZON'S", line2: 'CHOICE' },

    trustBadges: [
      { icon: 'star', label: '4.3 rating', sublabel: 'From 98 reviews' },
      { icon: 'gauge', label: '1000 m range', sublabel: 'Maximum IR-assisted viewing' },
      { icon: 'battery', label: '12–18 hours', sublabel: '5100 mAh, IR on or off' },
      { icon: 'package', label: '64 GB card', sublabel: 'Included, plus cable and case' },
    ],
    specs: [
      { icon: 'circle-dot', label: 'Aperture', value: 'F/0.8' },
      { icon: 'monitor', label: 'Display', value: '4-inch screen' },
      { icon: 'gauge', label: 'Viewing range', value: 'Up to 1000 m, IR-assisted' },
      { icon: 'settings', label: 'Magnification', value: 'Up to 8x' },
      { icon: 'wifi', label: 'Wi-Fi', value: 'Phone control within 30 m' },
      { icon: 'battery', label: 'Battery', value: '5100 mAh — 18 h IR off, 12 h IR on' },
      { icon: 'package', label: 'Storage', value: '64 GB microSD included' },
      { icon: 'droplet', label: 'Weather rating', value: 'IP54 splash resistant' },
    ],
    features: [
      {
        icon: 'circle-dot',
        title: 'F/0.8 aperture',
        body: 'A very fast lens for the class, which is what lets the sensor work with the small amount of ambient light there is before the infrared illuminator has to take over.',
      },
      {
        icon: 'monitor',
        title: '4-inch screen, not an eyepiece',
        body: 'The display sits on the back rather than behind your eyes, so someone else can see what you are seeing — genuinely useful with children, or when identifying something together.',
      },
      {
        icon: 'layers',
        title: '7-layer multi-coated lens',
        body: 'CIGMAN quotes a 95% light transmission rate through the coated stack, the difference between a usable picture and a muddy one once light is scarce.',
      },
      {
        icon: 'wifi',
        title: 'Wi-Fi to your phone',
        body: 'Connect within 30 m to change settings, watch the live view and pull footage off without unplugging anything or removing the card.',
      },
      {
        icon: 'battery',
        title: '5100 mAh on board',
        body: 'Rated at 18 hours with the infrared off and 12 with it on, so a full night of recording is realistic rather than marketing.',
      },
      {
        icon: 'shield-check',
        title: 'Tripod mount and metal body',
        body: 'An aluminium and ABS shell with a tripod thread, so it can be left set up and pointed at one spot instead of held for hours.',
      },
    ],

    pros: [
      "Amazon's Choice, and a Red Dot 2024 design award mark on CIGMAN's own packaging",
      '4-inch rear screen means two people can watch at once, unlike eyepiece-only scopes',
      'F/0.8 aperture and a 7-layer coated lens are strong optics for digital night vision',
      'Genuinely complete kit: 64 GB card, USB-C cable, cleaning cloth, carry strap, carabiner compass and case',
      'Records to card and transfers over Wi-Fi, with a tripod mount for static observation',
    ],
    cons: [
      'A 4.3 rating from 98 reviews is the most modest score in this guide — decent, but not the near-universal approval the compacts here get',
      'The title says "IP54 Waterproof", but IP54 is splash and rain resistance only — it is not rated for immersion',
      'The headline 18-hour battery is with the infrared off; CIGMAN\'s own artwork puts it at 12 hours with IR on, which is how you will actually use it at night',
      '1000 m is a maximum detection range in ideal conditions, not the distance at which you can identify what you are looking at',
    ],
    bestFor: [
      'Wildlife watching after dark, where the shared screen and recording matter more than pocketability',
      'Night-time property and land checks that benefit from a tripod mount and hours of runtime',
      'Anyone who wants footage to keep rather than just a live view',
    ],
    notIdealFor: [
      'Wet-weather work beyond rain and splashes — IP54 does not cover immersion',
      'Anyone expecting long-range identification at the full 1000 m headline figure',
      'Buyers on a tight budget, given sub-£100 digital night vision exists, including CIGMAN\'s own cheaper model',
    ],

    score: 8.0,
    verdict:
      'A well-specified digital night vision unit where the screen, the recording and the 12-hour IR runtime are the real selling points, not the headline numbers. Scored at 8.0 because 4.3 stars from 98 reviews is solid rather than emphatic, and because the marketing overstates both the waterproofing and the usable range.',

    faq: [
      {
        q: 'How long does the battery actually last?',
        a: 'The 5100 mAh cell is rated at 18 hours with the infrared illuminator switched off and 12 hours with it on. Since the illuminator is what makes it work in real darkness, plan around the 12-hour figure for night use.',
      },
      {
        q: 'Is it waterproof?',
        a: 'Not in the usual sense. IP54 covers dust and splashing water, so rain and spray are fine, but it is not rated for submersion despite the word "waterproof" appearing in the product title.',
      },
      {
        q: 'How do I get photos and video off it?',
        a: 'It records to the included 64 GB microSD card. You can connect a phone over its built-in Wi-Fi within about 30 metres to change settings, watch the live view and transfer files, or use the supplied USB-C cable.',
      },
      {
        q: 'Does it see in complete darkness?',
        a: 'Yes — the built-in infrared illuminator lights the scene invisibly to the naked eye, with a quoted maximum range of 1000 metres. Treat that as detection distance in good conditions; the range at which you can actually identify a subject is considerably shorter.',
      },
    ],
  },
  {
    slug: 'oxford-hd-chain-lock-screamer-7-alarm',
    asin: 'B07DN6T8CD',
    affiliateTag: 'lovelytools-21',
    amazonDomain: 'amazon.co.uk',

    categoryLabel: 'Car & Motorbike',
    categoryPath: '/buyers-guide?category=car-motorbike',

    brand: 'Oxford',
    name: 'OF159 HD Motorbike Chain Lock + Screamer 7 Alarm Disc Lock Yellow/Black LK290 + Free Reminder Cable 1.5M',
    tagline: 'Two locks in one box — a hardened chain for the wheel and an alarmed disc lock for the brake.',
    description:
      'Oxford\'s mid-range HD chain paired with the Screamer 7 alarm disc lock, so a thief has to defeat a 9.5 mm hardened chain and set off a 100 dB siren. The padlock shackle doubles as a disc lock of its own, and a yellow reminder cable stops you riding away with the disc still locked.',

    images: [
      `/products/oxford-hd-chain-lock-screamer-7-alarm/1.jpg`,
      `/products/oxford-hd-chain-lock-screamer-7-alarm/2.jpg`,
      `/products/oxford-hd-chain-lock-screamer-7-alarm/3.jpg`,
      `/products/oxford-hd-chain-lock-screamer-7-alarm/4.jpg`,
    ],
    awardBadge: { line1: "AMAZON'S", line2: 'CHOICE' },

    trustBadges: [
      { icon: 'star', label: '4.3 rating', sublabel: '274 reviews, 300+ bought last month' },
      { icon: 'badge-check', label: 'Sold Secure', sublabel: 'Motor Scooter Silver, ART 4114' },
      { icon: 'volume-2', label: '100 dB alarm', sublabel: 'Motion and shock sensors' },
      { icon: 'ruler', label: '1.5 m chain', sublabel: '9.5 mm hardened square links' },
    ],
    specs: [
      { icon: 'ruler', label: 'Chain length', value: '1.5 m' },
      { icon: 'layers', label: 'Chain', value: '9.5 mm hardened square link' },
      { icon: 'lock', label: 'Padlock', value: 'Double locking, hardened shackle that doubles as a disc lock' },
      { icon: 'badge-check', label: 'Approvals', value: 'ART 4114, Sold Secure Motor Scooter Silver' },
      { icon: 'volume-2', label: 'Alarm', value: '100 dB siren' },
      { icon: 'settings', label: 'Sensors', value: 'Motion and shock' },
      { icon: 'circle-dot', label: 'Disc lock pin', value: '7 mm' },
      { icon: 'battery', label: 'Alarm battery', value: 'Lithium CR2' },
    ],
    features: [
      {
        icon: 'layers',
        title: '9.5 mm hardened square links',
        body: 'Square links are harder to get a bolt cropper jaw around than round ones, and the fabric sleeve keeps the chain off your paintwork while you thread it through a wheel.',
      },
      {
        icon: 'lock',
        title: 'The padlock is also a disc lock',
        body: 'The double-locking shackle is short enough to pass through a brake disc on its own, so you can leave the chain at home for a quick stop and still lock the bike.',
      },
      {
        icon: 'volume-2',
        title: '100 dB alarm on the disc',
        body: 'Motion and shock sensors trigger the Screamer 7 siren, so an attempt to move or lever the bike draws attention rather than passing quietly.',
      },
      {
        icon: 'droplet',
        title: 'Reminder cable included',
        body: 'A 1.5 m bright cable runs from the disc lock to the bars. Riding off with a disc lock still fitted is how people bend forks and drop bikes, and this is the cheap fix for it.',
      },
      {
        icon: 'badge-check',
        title: 'Independently rated',
        body: 'ART 4114 approved and Sold Secure Motor Scooter Silver — an actual third-party test result rather than a manufacturer security claim.',
      },
      {
        icon: 'package',
        title: 'Three keys, and replacements',
        body: 'Both locks ship with keys and a key replacement service. Note the key number down when it arrives — that is what a replacement is cut from if you lose the set.',
      },
    ],

    pros: [
      "Amazon's Choice, 4.3 from 274 reviews with 300+ bought in the past month",
      'Two separate locks in one purchase — chain for the wheel, alarmed disc lock for the brake',
      'Independently rated: ART 4114 and Sold Secure Motor Scooter Silver',
      'Amazon\'s review summary reports buyers rate the chain quality, durability and value highly',
      'Reminder cable and key replacement service included rather than sold separately',
    ],
    cons: [
      'Amazon\'s review summary flags that some buyers report the alarm stops working after getting wet, despite the water-resistant keyway cover',
      'Sold Secure Motor Scooter Silver is a mid-tier rating — Oxford describe it as a mid-range lock, and Gold or Diamond chains resist a determined attack for longer',
      'Alarm volume draws mixed comments: some buyers find 100 dB not deafening, others find it too loud',
      '1.5 m is enough for a wheel and a post but short for chaining through several bikes',
    ],
    bestFor: [
      'Everyday parking where a visible chain plus an audible alarm is the deterrent that matters',
      'Riders who want one purchase that covers both a chain and a disc lock',
      'Scooters and mid-value bikes, which is the risk tier this rating is aimed at',
    ],
    notIdealFor: [
      'High-value bikes left on the street overnight, which warrant a Sold Secure Gold or Diamond chain',
      'Permanently outdoor storage, given the reported alarm faults after water exposure',
      'Securing several bikes at once, or reaching a distant anchor point, at 1.5 m',
    ],

    score: 8.0,
    verdict:
      'A sensible bundle: the chain earns its reputation and the alarmed disc lock adds a layer most riders skip, all for less than the two bought separately. It is a Silver-rated deterrent rather than a fortress, and the alarm electronics are the weak link buyers report — so treat the chain as the real security and the siren as a bonus.',

    faq: [
      {
        q: 'How secure is it really?',
        a: 'It carries ART 4114 approval and a Sold Secure Motor Scooter Silver rating — independently tested, and mid-tier. Oxford themselves describe the HD chain as a mid-range lock that is light enough to carry but secure enough to deter opportunists. For a high-value bike left out overnight, a Sold Secure Gold or Diamond chain is the right step up.',
      },
      {
        q: 'How does the alarm work?',
        a: 'The Screamer 7 uses motion and shock sensors to trigger a 100 dB siren, powered by a lithium CR2 battery, and locks with a simple push. Worth knowing that Amazon\'s review summary reports some buyers finding the alarm stops working after it gets wet.',
      },
      {
        q: 'What is the yellow cable for?',
        a: 'It is a reminder cable. You run the 1.5 m bright cable from the fitted disc lock to your handlebars so you cannot ride off with the lock still on the disc — which is how forks get bent and bikes get dropped.',
      },
      {
        q: 'What if I lose the keys?',
        a: 'Both locks come with keys and a key replacement service. Make a note of the key number when the lock arrives and keep it somewhere safe — a replacement is cut from that number if the whole set goes missing.',
      },
    ],
  },
  {
    slug: 'insta360-ace-pro-2-ski-bundle',
    asin: 'B0DKBSS3L8',
    affiliateTag: 'lovelytools-21',
    amazonDomain: 'amazon.co.uk',

    categoryLabel: 'Cameras & Photography',
    categoryPath: '/buyers-guide?category=cameras-photography',

    brand: 'Insta360',
    name: 'Ace Pro 2 Ski Bundle — 8K Waterproof Action Camera Co-Engineered with Leica, 1/1.3" Sensor, Dual AI Chip, Leading Low Light, Superior Audio, Flip Screen & AI Editing for Vlogs',
    tagline: 'A Leica-designed lens on a 1/1.3-inch sensor, bundled with the mounts a winter trip actually needs.',
    description:
      'Insta360\'s flagship action camera, built around a large 1/1.3" sensor and a Leica Summarit lens, with two processors handling noise reduction and AI work separately. This is the Winter bundle — the camera plus two batteries, a 128 GB card, chest strap, adhesive mounts and an invisible selfie stick.',

    images: [
      `/products/insta360-ace-pro-2-ski-bundle/1.jpg`,
      `/products/insta360-ace-pro-2-ski-bundle/2.jpg`,
      `/products/insta360-ace-pro-2-ski-bundle/3.jpg`,
      `/products/insta360-ace-pro-2-ski-bundle/4.jpg`,
    ],

    trustBadges: [
      { icon: 'star', label: '4.5 rating', sublabel: '815 reviews, 89% at four stars or more' },
      { icon: 'gauge', label: '8K30 video', sublabel: '4K60 Active HDR, 13.5 stops' },
      { icon: 'droplet', label: '12 m waterproof', sublabel: 'Rated down to −20 °C' },
      { icon: 'package', label: '10-item bundle', sublabel: '2 batteries and a 128 GB card' },
    ],
    specs: [
      { icon: 'circle-dot', label: 'Sensor', value: '1/1.3" CMOS, 2.4 μm equivalent pixels' },
      { icon: 'layers', label: 'Lens', value: 'Leica Super-Summarit, f/2.6, 157° wide angle' },
      { icon: 'gauge', label: 'Max video', value: '8K30fps, 4K60fps Active HDR' },
      { icon: 'sliders', label: 'Dynamic range', value: '13.5 stops' },
      { icon: 'zap', label: 'Processing', value: 'Dual chip — Pro Imaging plus 5nm AI' },
      { icon: 'monitor', label: 'Screen', value: '2.5" flip touchscreen' },
      { icon: 'droplet', label: 'Waterproof', value: '12 m (39 ft), operates to −20 °C' },
      { icon: 'battery', label: 'Batteries', value: '2 × 1800 mAh included' },
    ],
    features: [
      {
        icon: 'circle-dot',
        title: 'Leica lens on a big sensor',
        body: 'A 1/1.3-inch sensor is large for an action camera, and the Leica Super-Summarit optics in front of it are the reason the image holds together when the light drops.',
      },
      {
        icon: 'zap',
        title: 'Two chips, not one',
        body: 'A dedicated Pro Imaging chip handles noise reduction while a 5nm AI chip does the rest — Insta360 claims twice the computing power of the original Ace Pro.',
      },
      {
        icon: 'monitor',
        title: '2.5-inch flip touchscreen',
        body: 'Flips up so you can frame yourself, with higher pixel density and brightness than the previous generation and a hinge rated for twice the durability.',
      },
      {
        icon: 'volume-2',
        title: 'Snap-on Wind Guard',
        body: 'A physical wind guard clips on and off as conditions change, paired with revised audio processing — the difference between usable narration and roar on a fast descent.',
      },
      {
        icon: 'droplet',
        title: 'Waterproof and cold-rated',
        body: 'Sealed to 12 m without a case and specified to keep working at −20 °C, which is the specification that matters for a camera sold as a ski bundle.',
      },
      {
        icon: 'package',
        title: 'The Winter kit',
        body: 'Two batteries, a 128 GB microSD card, chest strap, flexible adhesive mount, standard mount, mic cap, USB-C cable and a carbon-fibre invisible selfie stick.',
      },
    ],

    pros: [
      '4.5 stars across 815 reviews, with 76% leaving five stars',
      'Large 1/1.3" sensor and Leica Summarit optics — genuinely a step above typical action-camera imaging',
      'Amazon\'s review summary reports buyers praising photo and video quality and finding it easy to use',
      'Bundle includes two batteries and a 128 GB card, so there is nothing essential left to buy',
      'Waterproof to 12 m with no housing and rated to −20 °C',
    ],
    cons: [
      'Amazon\'s review summary reports mixed feedback on performance, functionality, stability, field of view and value for money',
      '5% of reviews are one star, a higher tail than the rating alone suggests',
      'Insta360 sells this camera in nine different bundles at different prices — it is easy to buy the wrong accessory set',
      'Flagship pricing, and the Winter bundle is not the cheapest way into the same camera',
    ],
    bestFor: [
      'Skiing, snowboarding and winter sports, which is exactly what this accessory set is chosen for',
      'Vloggers who need a flip screen and want low-light footage that holds up',
      'Anyone diving, riding or filming in weather that would end a phone',
    ],
    notIdealFor: [
      'Buyers who only need the camera — a cheaper bundle covers that for less',
      'Anyone wanting a proven-simple point-and-shoot, given the mixed comments on functionality',
      'Tight budgets, with capable action cameras available for a fraction of this',
    ],

    score: 9.0,
    verdict:
      'The imaging is the reason to buy it — a 1/1.3-inch sensor behind Leica glass, with dual processors and a genuinely useful flip screen, and the Winter bundle adds the mounts and spare power a ski trip needs. The reviews are strong on image quality and more mixed on everything else, so buy it for the pictures rather than the feature list.',

    faq: [
      {
        q: 'What exactly comes in the Ski bundle?',
        a: 'One Ace Pro 2, a Wind Guard fitted by default, two batteries, a standard mount, a mic cap, a USB-C cable, a 128 GB microSD card, a chest strap, a flexible adhesive mount and an Action Invisible Selfie Stick.',
      },
      {
        q: 'Do I need a waterproof housing?',
        a: 'No. The camera is sealed to 12 metres (39 ft) as it comes, and Insta360 rate it to keep working down to −20 °C, so snow and cold are within specification without an extra case.',
      },
      {
        q: 'How good is it in low light?',
        a: 'Low light is the headline claim. The 1/1.3" sensor gives 13.5 stops of dynamic range, and PureVideo mode applies AI noise reduction at up to 4K60fps. Reviewers single out image quality as the camera\'s strongest point.',
      },
      {
        q: 'Is this the same camera as the other bundles?',
        a: 'Yes — the Ace Pro 2 is identical across the range. What changes is the accessory set and the price: Insta360 list Standard, Starter, Bike, Motorcycle, POV, Vlog, Get-Set, MM93 and Winter bundles, so pick the one whose mounts match what you film.',
      },
    ],
  },
  {
    slug: 'dji-osmo-pocket-3-creator-combo',
    asin: 'B0CG19FGQ5',
    affiliateTag: 'lovelytools-21',
    amazonDomain: 'amazon.co.uk',

    categoryLabel: 'Cameras & Photography',
    categoryPath: '/buyers-guide?category=cameras-photography',

    brand: 'DJI',
    name: 'Osmo Pocket 3 Creator Combo, Vlogging Camera With 1" CMOS & 4K/120fps | 3-Axis Stabilization, Spotlight Follow, Fast Focusing, Mic Included for Clear Sound, Small Camera for Photography',
    tagline: 'A 1-inch sensor on a real motorised gimbal, in something that fits a jacket pocket.',
    description:
      'A pocket vlogging camera built around a 1-inch CMOS sensor and a three-axis mechanical gimbal — actual moving hardware rather than software smoothing. The Creator Combo adds the DJI Mic 2 transmitter, battery handle, wide-angle lens and mini tripod, which is most of what a vlogging setup needs.',

    images: [
      `/products/dji-osmo-pocket-3-creator-combo/1.jpg`,
      `/products/dji-osmo-pocket-3-creator-combo/2.jpg`,
      `/products/dji-osmo-pocket-3-creator-combo/3.jpg`,
      `/products/dji-osmo-pocket-3-creator-combo/4.jpg`,
    ],
    awardBadge: { line1: "AMAZON'S", line2: 'CHOICE' },

    trustBadges: [
      { icon: 'star', label: '4.5 rating', sublabel: '6,643 reviews, 79% five-star' },
      { icon: 'circle-dot', label: '1-inch CMOS', sublabel: '4K at up to 120fps' },
      { icon: 'move', label: '3-axis gimbal', sublabel: 'Mechanical, not software' },
      { icon: 'package', label: '12-piece combo', sublabel: 'Mic 2, battery handle, tripod' },
    ],
    specs: [
      { icon: 'circle-dot', label: 'Sensor', value: '1-inch CMOS' },
      { icon: 'gauge', label: 'Max video', value: '4K at 120fps' },
      { icon: 'move', label: 'Stabilisation', value: '3-axis mechanical gimbal' },
      { icon: 'monitor', label: 'Screen', value: '2-inch rotating touchscreen' },
      { icon: 'layers', label: 'Colour', value: '10-bit, D-Log M' },
      { icon: 'sliders', label: 'Lens', value: '20 mm equivalent, f/2.0' },
      { icon: 'volume-2', label: 'Audio', value: 'Stereo, plus DJI Mic 2 transmitter' },
      { icon: 'package', label: 'Storage', value: 'microSD (not included)' },
    ],
    features: [
      {
        icon: 'move',
        title: 'A gimbal, not a crop',
        body: 'Three motorised axes physically hold the camera level, so footage stays smooth without cropping into the sensor the way electronic stabilisation does.',
      },
      {
        icon: 'monitor',
        title: 'Screen rotates to portrait',
        body: 'Twist the 2-inch touchscreen and the camera switches between horizontal and vertical framing — the difference between shooting for YouTube and shooting for a phone feed.',
      },
      {
        icon: 'users',
        title: 'ActiveTrack 6.0',
        body: 'Set it on the tripod and the gimbal follows you around the frame, so you can move, present or demonstrate something without anyone behind the camera.',
      },
      {
        icon: 'volume-2',
        title: 'DJI Mic 2 in the box',
        body: 'The Creator Combo bundles a Mic 2 transmitter with windscreen and magnet clip, which is what fixes the audio that usually lets small-camera footage down.',
      },
      {
        icon: 'layers',
        title: '10-bit D-Log M',
        body: 'A billion colours and a flat log profile for grading, so footage holds up when you push the highlights and shadows of a sunrise in post.',
      },
      {
        icon: 'package',
        title: 'The whole Creator kit',
        body: 'Battery handle, mini tripod, wide-angle lens, 1/4" thread handle, protective cover, wrist strap, carrying bag and USB-C cable, on top of the camera and mic.',
      },
    ],

    pros: [
      "Amazon's Choice, 4.5 stars across 6,643 reviews with 79% leaving five stars",
      'A 1-inch sensor is large for this size, and it shows most in low light',
      'True mechanical three-axis stabilisation rather than a software crop',
      'Amazon\'s review summary reports buyers praising video quality, ease of use and portability',
      'Creator Combo includes the DJI Mic 2 transmitter, battery handle, tripod and wide-angle lens',
    ],
    cons: [
      'Amazon\'s review summary notes customers disagree on reliability and value for money',
      '6% of reviews are one star — a higher tail than the 4.5 average suggests',
      'A newer model exists: DJI now sell the Osmo Pocket 4P, so this is the previous generation',
      'No microSD card in the box, and the moving gimbal is more fragile than a sealed action camera',
    ],
    bestFor: [
      'Vloggers and creators who want broadcast-looking footage without carrying a rig',
      'Travel and events, where a pocket camera with a real gimbal beats a phone',
      'Anyone filming themselves alone, thanks to ActiveTrack and the rotating screen',
    ],
    notIdealFor: [
      'Rough, wet or impact-heavy filming — this is not a waterproof action camera',
      'Buyers who only want the camera, since the plain Osmo Pocket 3 costs noticeably less',
      'Anyone who would rather wait for or buy the newer Pocket 4P generation',
    ],

    score: 9.1,
    verdict:
      'Still the reference pocket vlogging camera: a 1-inch sensor and a genuine motorised gimbal in something you will actually carry, and the Creator Combo bundles the mic and handle you would otherwise buy separately. The caveats are that reliability divides reviewers and a newer Pocket generation now exists.',

    faq: [
      {
        q: 'What is in the Creator Combo?',
        a: 'The Osmo Pocket 3, a DJI Mic 2 transmitter with windscreen and clip magnet, the battery handle, a handle with a 1/4" thread, a wide-angle lens, the Osmo Mini Tripod, a protective cover, wrist strap, carrying bag and a USB-C cable. No memory card is included.',
      },
      {
        q: 'How is this different from the cheaper Osmo Pocket 3?',
        a: 'The camera is identical. The Creator Combo adds the Mic 2 transmitter, battery handle, wide-angle lens and tripod. DJI also sell an Audio Combo with a full mic kit, so pick by which accessories you need.',
      },
      {
        q: 'Is the stabilisation really better than a phone?',
        a: 'It works differently. Three motors physically move the camera to keep it level, so nothing is cropped away from the sensor — unlike electronic stabilisation, which trims the frame to compensate. That is why the footage stays steady while walking or running.',
      },
      {
        q: 'Can it shoot vertical video?',
        a: 'Yes. The 2-inch touchscreen rotates, and the camera switches between horizontal and vertical framing with it, so you can shoot natively for social feeds rather than cropping afterwards.',
      },
    ],
  },
  {
    slug: 'tcl-65c7l-sqd-mini-led-tv',
    asin: 'B0GY5DJ1MV',
    affiliateTag: 'lovelytools-21',
    amazonDomain: 'amazon.co.uk',

    categoryLabel: 'TV & Home Cinema',
    categoryPath: '/buyers-guide?category=tv-home-cinema',

    brand: 'TCL',
    name: '65C7L-UK 65 Inch SQD-Mini LED TV, 4K HDR 3000 nits and 1,152 dimming zones, Google TV, Dolby Vision & Atmos, Audio by Bang & Olufsen, 144Hz, Apple AirPlay 2 & Alexa (2026 New Model)',
    tagline: '1,152 dimming zones and 3,000 nits, with Bang & Olufsen doing the sound.',
    description:
      'TCL\'s 2026 SQD-Mini LED panel, pairing quantum-dot colour with 1,152 individually controlled dimming zones for genuine contrast rather than a grey approximation of black. Google TV, a 144 Hz panel and Bang & Olufsen tuning cover streaming, gaming and sound in one box.',

    images: [
      `/products/tcl-65c7l-sqd-mini-led-tv/1.jpg`,
      `/products/tcl-65c7l-sqd-mini-led-tv/2.jpg`,
      `/products/tcl-65c7l-sqd-mini-led-tv/3.jpg`,
      `/products/tcl-65c7l-sqd-mini-led-tv/4.jpg`,
    ],
    awardBadge: { line1: "AMAZON'S", line2: 'CHOICE' },

    trustBadges: [
      { icon: 'star', label: '4.7 rating', sublabel: 'From just 10 reviews so far' },
      { icon: 'flame', label: '3,000 nits', sublabel: '1,152 dimming zones' },
      { icon: 'gauge', label: '144 Hz', sublabel: 'FreeSync Premium Pro, 288 VRR mode' },
      { icon: 'volume-2', label: 'Bang & Olufsen', sublabel: 'Dolby Atmos and DTS:X' },
    ],
    specs: [
      { icon: 'monitor', label: 'Screen', value: '65 inch, 4K, 16:9' },
      { icon: 'layers', label: 'Panel', value: 'SQD-Mini LED, 1,152 dimming zones' },
      { icon: 'flame', label: 'Peak brightness', value: 'Up to 3,000 nits' },
      { icon: 'droplet', label: 'Colour', value: '100% BT.2020, Super Quantum Dot' },
      { icon: 'gauge', label: 'Refresh rate', value: '144 Hz, 288 VRR Game Accelerator' },
      { icon: 'volume-2', label: 'Audio', value: 'Bang & Olufsen, Dolby Atmos, DTS:X' },
      { icon: 'wifi', label: 'Connectivity', value: 'Wi-Fi, Bluetooth, Ethernet, HDMI, USB' },
      { icon: 'ruler', label: 'Dimensions', value: '144.4 W × 86.9 H × 36.9 D cm, 19.9 kg with stand' },
    ],
    features: [
      {
        icon: 'layers',
        title: '1,152 dimming zones',
        body: 'Mini LED backlights split into over a thousand independently controlled zones, so a bright object on a dark background keeps its edge instead of sitting in a grey halo.',
      },
      {
        icon: 'flame',
        title: '3,000 nits of peak brightness',
        body: 'Enough headroom that HDR highlights actually read as bright rather than merely lighter grey, and enough to stay watchable in a sunlit room.',
      },
      {
        icon: 'droplet',
        title: '100% BT.2020 colour',
        body: 'TCL claim full coverage of the broadcast colour standard the best content is graded against, using a Super Quantum Dot layer and an Ultra Colour Filter panel.',
      },
      {
        icon: 'gauge',
        title: 'Built for consoles',
        body: '144 Hz native with FreeSync Premium Pro, Dolby Vision Gaming and a 288 VRR Game Accelerator mode, plus TCL\'s Game Master tools.',
      },
      {
        icon: 'volume-2',
        title: 'Tuned by Bang & Olufsen',
        body: 'B&O tuning with Dolby Atmos and DTS:X — not a substitute for a soundbar, but a long way from the thin sound most flat panels ship with.',
      },
      {
        icon: 'monitor',
        title: 'Google TV, AirPlay 2 and Alexa',
        body: 'Google TV handles the apps, with Apple AirPlay 2 for casting from an iPhone and Alexa for voice, so nothing extra is needed to stream.',
      },
    ],

    pros: [
      "Amazon's Choice, currently rated 4.7 with no reviews below three stars",
      '1,152 dimming zones and 3,000 nits is serious Mini LED specification at this price',
      'Certified across the board: Dolby Vision IQ, HDR10+, IMAX Enhanced, Filmmaker Mode, Dolby Atmos, DTS:X',
      'Genuine gaming credentials — 144 Hz, FreeSync Premium Pro and Dolby Vision Gaming',
      'TCL offer a 5-year warranty, and the stand, remote and cables are all in the box',
    ],
    cons: [
      'Only 10 reviews — a 4.7 average on a brand-new 2026 model is almost no evidence either way',
      'No long-term reliability record yet, which matters more on a £1,000+ purchase than a £20 one',
      'The 5-year warranty is by redemption within 30 days of purchase, not automatic — you have to claim it',
      'Five sizes share this listing from 55 to 98 inches, so it is easy to order the wrong one',
    ],
    bestFor: [
      'Films and HDR content, where the dimming zones and peak brightness do the most work',
      'Console gaming at 144 Hz with variable refresh rate',
      'Bright living rooms, thanks to the anti-reflection screen and 3,000-nit peak',
    ],
    notIdealFor: [
      'Cautious buyers who want an established review record before spending four figures',
      'Anyone needing a wall bracket included — it is not, and VESA is 300 × 300 mm',
      'Small rooms: at 144 cm wide this needs a stand or wall of real width',
    ],

    score: 8.5,
    verdict:
      'On paper this is a lot of television for the money — 1,152 dimming zones, 3,000 nits and B&O sound are specifications usually attached to a bigger price. The honest caveat is evidence: ten reviews on a 2026 model tell you very little, so the score reflects the specification and the thin track record rather than a proven performer.',

    faq: [
      {
        q: 'How good is the contrast really?',
        a: 'The panel splits its Mini LED backlight into 1,152 independently dimmed zones and peaks at 3,000 nits. More zones means finer control over which parts of the screen are lit, which is what keeps bright objects from glowing into surrounding dark areas.',
      },
      {
        q: 'Is it a good gaming TV?',
        a: 'The specification says yes — 144 Hz native, AMD FreeSync Premium Pro, Dolby Vision Gaming and a 288 VRR Game Accelerator mode, alongside TCL\'s Game Master features. HDMI, Bluetooth and Wi-Fi are all present for consoles and peripherals.',
      },
      {
        q: 'What comes in the box, and can I wall-mount it?',
        a: 'The TV, stand, remote control, power cable and user manual. There is no wall bracket included; the mounting pattern is VESA 300 × 300 mm and the set weighs 18 kg without its stand.',
      },
      {
        q: 'Should I be worried about only ten reviews?',
        a: 'It is worth knowing about. This is a 2026 model that has not been on sale long, so the 4.7 average rests on a very small sample and there is no long-term reliability data yet. The specification is strong; the evidence behind it is simply thin so far.',
      },
    ],
  },
  {
    slug: 'ultimea-aura-a60-pro-soundbar',
    asin: 'B0GRZKG31G',
    affiliateTag: 'lovelytools-21',
    amazonDomain: 'amazon.co.uk',

    categoryLabel: 'Audio & Headphones',
    categoryPath: '/buyers-guide?category=audio-headphones',

    brand: 'ULTIMEA',
    name: 'Aura A60 Pro 7.1ch Surround Sound System for TV, Dolby Atmos Sound Bar with 4 Surround Speakers, VoiceMX, BassMX, 420W Peak Power, HDMI eARC, App Control (2026 Model)',
    tagline: 'Four satellites and a 5.25-inch sub for two hundred pounds — real surround, not a bar pretending.',
    description:
      'A 7.1 system with three channels in the bar and four separate satellite speakers placed around the room, driven over HDMI eARC for full-bandwidth Dolby Atmos. The A60 Pro upgrades the original A60 with a larger 5.25-inch subwoofer and more headroom.',

    images: [
      `/products/ultimea-aura-a60-pro-soundbar/1.jpg`,
      `/products/ultimea-aura-a60-pro-soundbar/2.jpg`,
      `/products/ultimea-aura-a60-pro-soundbar/3.jpg`,
      `/products/ultimea-aura-a60-pro-soundbar/4.jpg`,
    ],
    awardBadge: { line1: '#1', line2: 'BEST SELLER' },

    trustBadges: [
      { icon: 'award', label: '#1 Best Seller', sublabel: 'In Hi-Fi Speaker Systems' },
      { icon: 'star', label: '4.5 rating', sublabel: 'From 23 reviews so far' },
      { icon: 'volume-2', label: '7.1 channels', sublabel: '3 in the bar, 4 satellites' },
      { icon: 'circle-dot', label: '5.25" subwoofer', sublabel: 'Bass down to 45 Hz' },
    ],
    specs: [
      { icon: 'volume-2', label: 'Channels', value: '7.1 — 3 main plus 4 surround speakers' },
      { icon: 'zap', label: 'Peak power', value: '420 W (up from 350 W on the A60)' },
      { icon: 'circle-dot', label: 'Subwoofer', value: '5.25 inch, 18 mm high-excursion driver, 6.1 L cabinet' },
      { icon: 'gauge', label: 'Bass extension', value: 'Down to 45 Hz' },
      { icon: 'layers', label: 'Surround wiring', value: '2 front wired; rear pair one wireless, one wired' },
      { icon: 'monitor', label: 'Connection', value: 'HDMI eARC, 37 Mbps bandwidth' },
      { icon: 'users', label: 'Dialogue', value: 'VoiceMX, boosts 120 Hz – 6 kHz' },
      { icon: 'sliders', label: 'App tuning', value: '10-band EQ, 121 presets, 13 surround levels' },
    ],
    features: [
      {
        icon: 'volume-2',
        title: 'Four real satellites',
        body: 'Three channels in the bar plus four separate speakers placed around the seating area, so rear effects come from behind you rather than from processing that implies they do.',
      },
      {
        icon: 'users',
        title: 'VoiceMX for dialogue',
        body: 'Targets the 120 Hz to 6 kHz vocal band with dynamic EQ and gain, which is aimed squarely at the common complaint that speech disappears under the soundtrack.',
      },
      {
        icon: 'circle-dot',
        title: 'Bigger sub than the A60',
        body: 'A 5.25-inch driver replaces the original 4-inch, in a tuned 6.1-litre cabinet reaching down to 45 Hz — the single biggest change between this and the model it replaces.',
      },
      {
        icon: 'monitor',
        title: 'HDMI eARC, not just ARC',
        body: 'eARC carries far more bandwidth than standard ARC, which is what allows lossless Dolby Atmos to reach the bar rather than a compressed version of it.',
      },
      {
        icon: 'sliders',
        title: 'Tuning that goes deep',
        body: 'A 10-band graphic EQ, 121 presets and 13 separate surround levels in the app, so the rear channels can be balanced to where the speakers actually ended up.',
      },
      {
        icon: 'refresh-ccw',
        title: 'One remote, and OTA updates',
        body: 'The supplied remote controls the TV and the soundbar together, and firmware updates arrive over the air through the app rather than needing a service visit.',
      },
    ],

    pros: [
      '#1 Best Seller in Hi-Fi Speaker Systems, rated 4.5 with 100+ bought in the past month',
      'Genuine 7.1 layout with four satellites at a price where virtualised surround is the norm',
      'Larger 5.25-inch subwoofer and 420 W peak, both upgraded over the original A60',
      'HDMI eARC rather than plain ARC, so Dolby Atmos arrives at full bandwidth',
      'Unusually deep app control — 10-band EQ, 121 presets and 13 surround levels',
    ],
    cons: [
      'Only 23 reviews so far, so the 4.5 rating rests on a very small sample — and 7% of it is one star',
      'The rear speakers are only half wireless: the right rear connects wirelessly, the left rear still needs a cable',
      'Both front surround speakers wire directly to the bar, so there are cable runs to plan either way',
      'ULTIMEA\'s "99.99% detail accuracy" claim for SurroundX has no stated measure behind it',
    ],
    bestFor: [
      'Films and TV in a normal living room where rear channels genuinely change the experience',
      'Anyone whose main complaint is losing dialogue under the soundtrack',
      'Buyers who want separates-style surround without a receiver or separates money',
    ],
    notIdealFor: [
      'Rooms where no cable can reach the rear-left position',
      'Anyone wanting a proven track record — this is a 2026 model with few reviews',
      'Minimalists after a single bar and nothing else to place or wire',
    ],

    score: 8.4,
    verdict:
      'A lot of surround system for two hundred pounds: four real satellites, a bigger subwoofer than the model it replaces, eARC and genuinely deep app tuning. Scored short of the top of the guide only because 23 reviews is thin evidence — the specification and the price look right, the track record simply is not there yet.',

    faq: [
      {
        q: 'Are the rear speakers wireless?',
        a: 'Only partly. ULTIMEA describe a hybrid arrangement — the right rear speaker connects to the soundbar wirelessly, while the left rear connects by wire. The two front surround speakers are wired to the bar as well, so plan for cabling before you buy.',
      },
      {
        q: 'What is different about the Pro versus the original A60?',
        a: 'Two things ULTIMEA call out: the subwoofer grows from a 4-inch driver to 5.25 inches in a tuned 6.1-litre cabinet reaching 45 Hz, and peak power rises from 350 W to 420 W for more headroom during loud passages.',
      },
      {
        q: 'Why does HDMI eARC matter?',
        a: 'ULTIMEA quote eARC at 37 Mbps against roughly 1 Mbps for standard ARC. That extra bandwidth is what lets a lossless Dolby Atmos track reach the soundbar intact instead of being compressed on the way.',
      },
      {
        q: 'Can I fix quiet dialogue with it?',
        a: 'That is what VoiceMX is for. It isolates the 120 Hz to 6 kHz vocal range and applies dynamic EQ and gain in real time, aimed at low-volume listening and loud scenes where speech normally gets buried.',
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
