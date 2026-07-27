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
  {
    slug: 'lamicall-cordless-tyre-inflator',
    asin: 'B0DZWXC2FH',
    affiliateTag: 'lovelytools-21',
    amazonDomain: 'amazon.co.uk',

    categoryLabel: 'Home & Garden',
    categoryPath: '/buyers-guide',

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
    categoryPath: '/buyers-guide',

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
];

export function getAffiliateProduct(slug: string): AffiliateProduct | undefined {
  return affiliateProducts.find((p) => p.slug === slug);
}

export function allAffiliateProductSlugs(): string[] {
  return affiliateProducts.map((p) => p.slug);
}
