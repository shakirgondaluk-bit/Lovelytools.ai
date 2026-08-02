/**
 * Shared text matching for keyword retrieval and relevance scoring.
 *
 * Lives on its own so the provider layer and the filter pipeline agree on what
 * "this term matches this product" means without either depending on the other.
 */

/**
 * Splits a query into searchable terms.
 *
 * Two characters is the floor. A one- or two-letter token matched as a
 * substring hits almost everything — "to" is inside "Motor" and "Automatic" —
 * so short tokens used to drag unrelated products into the shortlist.
 */
export const tokenize = (value: string): string[] =>
  value
    .toLowerCase()
    .split(/[^a-z0-9+]+/i)
    .filter((t) => t.length >= 3 || /\d/.test(t));

const escape = (term: string) => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Prefix-anchored match: the term must start a word, but may be followed by
 * more of one. "drill" matches "drilling" and "drill/driver"; "to" does not
 * match "Motor". Plain `includes` would accept both.
 */
export const matchesTerm = (haystack: string, term: string): boolean =>
  new RegExp(`\\b${escape(term)}`, 'i').test(haystack);

/**
 * Words that carry no retrieval signal in an Amazon title. Stripped so a derived
 * query spends its term budget on the product, not on connectives — "EV
 * Charging Cable for Electric" wastes two of five slots on "for" and "Electric
 * and".
 */
const STOPWORDS = new Set([
  'for', 'and', 'the', 'with', 'from', 'into', 'your', 'you', 'our', 'all', 'new',
  'set', 'pack', 'pcs', 'piece', 'pieces', 'inc', 'incl', 'including', 'plus',
  'ideal', 'perfect', 'premium', 'professional', 'heavy', 'duty', 'quality',
]);

/**
 * Builds a search phrase that describes what a product *is*, from its own title.
 *
 * Used for two things that must agree: finding alternatives to a pasted product,
 * and then judging how relevant those alternatives actually are. If the two
 * disagreed, we would search for one thing and score against another.
 *
 * The brand is excluded on purpose — including it returns the same seller's
 * other products rather than competing ones. Everything after the first comma is
 * dropped because that is where Amazon puts per-variant detail (length, colour,
 * model code), which narrows the search to the exact item we already have.
 */
export function deriveProductQuery(brand: string, name: string, maxTerms = 5): string {
  const withoutBrand = brand
    ? name.replace(new RegExp(`^${escape(brand)}\\s+`, 'i'), '')
    : name;

  return tokenize(withoutBrand.split(',')[0] ?? withoutBrand)
    .filter((term) => !STOPWORDS.has(term))
    .slice(0, maxTerms)
    .join(' ');
}
