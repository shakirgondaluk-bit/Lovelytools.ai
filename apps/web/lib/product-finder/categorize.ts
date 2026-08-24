/**
 * Category inference for auto-published products.
 *
 * Why this exists: the search endpoint of a marketplace provider returns a
 * listing, not a taxonomy. Canopy only reports `categories` on the per-ASIN
 * detail lookup, and enriching every result costs four provider requests per
 * search instead of one — not worth it on a free tier just to label a badge.
 * So the category is inferred from the words we already have.
 *
 * The output is deliberately constrained to `affiliateCategories`. A badge that
 * doesn't match one of those labels is a dead filter chip on the Buyer's Guide,
 * and Amazon's own browse-node names ("Electronics", "Home & Kitchen > Small
 * Appliances > ...") don't line up with the hand-written ones anyway.
 *
 * Rules are ordered and first-match-wins, so put the specific ones above the
 * general ones — "phone case" must be tested before "phone".
 */

import { affiliateCategories } from '@/lib/affiliate-products';

/**
 * [pattern, label] — label must exist in `affiliateCategories`.
 *
 * Note the trailing `s?` on most nouns. Amazon titles are overwhelmingly plural
 * ("Headphones", "Screen Protectors", "Trainers"), so a bare `\bheadphone\b`
 * matches almost nothing real. The short, ambiguous words keep a hard `\b` on
 * both sides on purpose — `\bcar\b` must not fire on "cardigan" or "cartridge".
 */
const RULES: Array<[RegExp, string]> = [
  // EV kit before the generic "charging cable"/"charger" rule below, which
  // would otherwise file a 7.4kW Type 2 cable as a phone accessory.
  [/\b(ev charg|electric vehicle charg|type 2 (?:charg|cable)|wallbox)/i, 'Car & Motorbike'],

  // --- Specific accessories before the devices they attach to ---
  [
    /\b(screen protectors?|tempered glass|phone cases?|phone covers?|magsafe|charging cables?|chargers?|power banks?|sim card|lightning cable|usb-?c cables?|earbud cases?)\b/i,
    'Mobile Phones & Accessories',
  ],
  [
    /\b(smart ?watch(?:es)?|fitness trackers?|smart bands?|watch straps?|watch bands?|activity trackers?)\b/i,
    'Smartwatches & Wearables',
  ],
  [
    /\b(headphones?|earphones?|earbuds?|headsets?|soundbars?|bluetooth speakers?|speakers?|amplifiers?|turntables?|microphones?)\b/i,
    'Audio & Headphones',
  ],
  // Above Computers (which claims "monitors") and Toys (which claims
  // "gaming"), so a gaming TV or a TV-sized monitor lands here rather than
  // there. Soundbars stay under Audio & Headphones — moving them would change
  // how existing results are filed, which is a separate decision.
  [
    /\b(tvs?|televisions?|smart tv|mini ?led|oled|qled|projectors?|blu-?ray|home cinema|home theatre|av receivers?|set-?top box(?:es)?|streaming sticks?|fire tv|chromecast|freeview)\b/i,
    'TV & Home Cinema',
  ],
  [/\b(cameras?|camera lens|tripod for camera|gimbals?|drones?|camcorders?|gopro|webcams?|photography)\b/i, 'Cameras & Photography'],
  [
    /\b(laptops?|macbook|keyboards?|mouse|monitors?|ssd|hard drives?|graphics cards?|motherboards?|routers?|usb hubs?|docking stations?|printers?)\b/i,
    'Computers & Accessories',
  ],
  [/\b(mobile phones?|smartphones?|iphone|android phone|tablets?|ipad|e-?readers?|kindle)\b/i, 'Mobile Phones & Accessories'],

  // --- Tools & DIY ---
  [
    /\b(drills?|saws?|sanders?|grinders?|laser levels?|impact drivers?|multi-?tools?|tool ?kits?|tool ?sets?|spanners?|socket sets?|workbenches?|welders?|nail guns?|screwdrivers?)\b/i,
    'Home Improvement & Power Tools',
  ],
  [/\b(paint|sealant|adhesive|filler|plaster ?board|tiles?|grout|decorating|wallpaper)\b/i, 'Home Improvement & Power Tools'],

  // --- Motoring ---
  [
    /\b(tyres?|tires?|\bcar\b|vehicles?|dash ?cams?|ev charg|jump starters?|windscreens?|motorbikes?|motorcycles?|roof box|car seat covers?)\b/i,
    'Car & Motorbike',
  ],

  // --- Kitchen ---
  [
    /\b(kitchen|cook(?:er|ware|ing)?|air fryers?|blenders?|kettles?|toasters?|microwaves?|coffee|espresso|saucepans?|frying pans?|knives|knife|cutlery|dinnerware|food processors?|egg boilers?|slow cookers?|dishwashers?|chopping boards?|lunch ?box(?:es)?)\b/i,
    'Kitchen & Dining',
  ],

  // --- Cleaning ---
  [
    /\b(vacuums?|hoovers?|mops?|steam cleaners?|pressure washers?|detergents?|cleaning|laundry|\biron\b|ironing|washing machines?|tumble dryers?|bin bags?)\b/i,
    'Cleaning & Laundry',
  ],

  // --- Lighting & electrical ---
  [
    /\b(light bulbs?|led strips?|lamps?|torch(?:es)?|floodlights?|extension leads?|sockets?|smart plugs?|fuses?|wiring)\b/i,
    'Lighting & Electrical',
  ],

  // --- Furniture ---
  [
    /\b(desks?|chairs?|sofas?|armchairs?|bed frames?|mattress(?:es)?|wardrobes?|bookcases?|shelving units?|cabinets?|dining tables?|stools?|ottomans?)\b/i,
    'Furniture',
  ],

  // --- Home & garden ---
  [
    /\b(garden|lawn|mowers?|hedge trimmers?|plants?|greenhouses?|patio|bbq|barbecues?|compost|hose ?pipe|sheds?|fencing|watering|bird feeders?|heaters?|\bfans?\b|dehumidifiers?|air purifiers?|curtains?|rugs?|bedding|duvets?|pillows?|towels?|storage box(?:es)?)\b/i,
    'Home & Garden',
  ],

  // --- Personal care & health ---
  [
    /\b(shampoo|skincare|moisturis|serum|makeup|hair dryers?|straighteners?|clippers?|shavers?|razors?|epilators?|toothbrush(?:es)?|perfume)\b/i,
    'Beauty & Personal Care',
  ],
  [
    /\b(supplements?|vitamins?|first aid|thermometers?|blood pressure|massagers?|orthopaedic|orthopedic|mobility aid|hearing aids?|plasters?|medical)\b/i,
    'Health & Household',
  ],

  // --- Sport ---
  [
    /\b(dumbbells?|kettlebells?|treadmills?|exercise bikes?|yoga|running|hiking|camping|tents?|sleeping bags?|rucksacks?|backpacks?|bicycles?|\bbikes?\b|football|golf|fishing|swimming|skis?|skates?|\bgym\b)\b/i,
    'Sports & Outdoor',
  ],

  // --- Kids, pets, toys ---
  [/\b(baby|infant|toddler|nappies|nappy|pushchairs?|prams?|highchairs?|\bcot\b|nursery)\b/i, 'Baby & Kids'],
  [/\b(dogs?|\bcats?\b|\bpets?\b|puppy|kitten|aquariums?|hamsters?|litter trays?)\b/i, 'Pet Supplies'],
  [/\b(toys?|lego|puzzles?|board games?|action figures?|dolls?|jigsaws?|consoles?|playstation|xbox|nintendo|gaming)\b/i, 'Toys & Games'],

  // --- Office ---
  [
    /\b(\bpens?\b|notebooks?|stationery|folders?|binders?|staplers?|label ?makers?|shredders?|whiteboards?|calculators?|envelopes?|office)\b/i,
    'Office Supplies',
  ],

  // --- Clothing ---
  [
    /\b(t-?shirts?|jackets?|coats?|jeans|trousers|\bdress\b|shoes|trainers|boots|socks|\bhats?\b|gloves|scarf|hoodies?)\b/i,
    'Clothing & Accessories',
  ],
];

const FALLBACK = 'Electronics & Gadgets';

const LABELS = new Set(affiliateCategories.map((c) => c.label));

/**
 * Best-guess category for a product, always one of `affiliateCategories`.
 *
 * `providerCategory` is trusted only when it already matches one of our labels
 * exactly — a provider taxonomy string we don't recognise is worse than an
 * inferred one, because it produces a badge nothing can filter by.
 */
export function inferCategory(
  input: { brand: string; name: string; description?: string },
  keyword?: string | null,
  providerCategory?: string,
): string {
  if (providerCategory && LABELS.has(providerCategory)) return providerCategory;

  // Title first, keyword second. The keyword is what the visitor asked for, not
  // necessarily what this result is: a smartwatch that surfaces under "iphone
  // 17 pro" is a smartwatch, and keyword-first would file it under phone
  // accessories. The keyword is still a good rescue when the title is vague.
  const haystacks = [`${input.brand} ${input.name}`, keyword ?? '', input.description ?? ''];

  for (const haystack of haystacks) {
    if (!haystack.trim()) continue;
    for (const [pattern, label] of RULES) {
      if (pattern.test(haystack)) return label;
    }
  }

  return FALLBACK;
}

/** The `?category=` value for a label, for the Buyer's Guide filter links. */
export function categorySlug(label: string): string {
  return (
    affiliateCategories.find((c) => c.label === label)?.slug ??
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  );
}
