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
