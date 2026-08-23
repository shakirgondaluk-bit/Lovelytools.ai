/**
 * Sort options for the Buyer's Guide.
 *
 * Shared by the server component that does the ordering and the client island
 * that renders the dropdown, so the two cannot disagree about what a key means.
 */

import type { AffiliateProduct } from '@/lib/affiliate-products';

export const SORT_OPTIONS = [
  { key: 'recent', label: 'Recently added' },
  { key: 'oldest', label: 'Oldest first' },
  { key: 'rating', label: 'Highest rated' },
  { key: 'name', label: 'Name A–Z' },
] as const;

export type SortKey = (typeof SORT_OPTIONS)[number]['key'];

export const DEFAULT_SORT: SortKey = 'recent';

/** Narrows an arbitrary `?sort=` value, so a hand-edited URL falls back rather than throwing. */
export function parseSortKey(raw: string | undefined): SortKey {
  return SORT_OPTIONS.some((o) => o.key === raw) ? (raw as SortKey) : DEFAULT_SORT;
}

export interface GuideEntry {
  product: AffiliateProduct;
  generated: boolean;
}

/**
 * Orders the merged guide list.
 *
 * `recent` and `oldest` are positional, not date-based: AffiliateProduct has no
 * date, and entries are only ever appended, so the last element is the newest.
 * That also means the curated and auto-published halves cannot be interleaved by
 * recency — there is no shared key to compare on — so those two modes keep the
 * caller's grouping (curated first, each half already in the right order) and
 * simply reverse for `oldest`.
 *
 * `rating` and `name` do have a shared key, so they sort across the whole list.
 *
 * Every branch copies before sorting. `sort`/`reverse` mutate in place, and the
 * array handed in is built from the shared `affiliateProducts` export.
 */
export function sortGuideEntries(entries: GuideEntry[], sort: SortKey): GuideEntry[] {
  switch (sort) {
    case 'oldest':
      return entries.slice().reverse();

    case 'rating':
      // Score descending. Ties fall back to the incoming order, which is newest
      // first — a tie on score is better broken by recency than arbitrarily.
      return entries
        .map((entry, index) => ({ entry, index }))
        .sort((a, b) => b.entry.product.score - a.entry.product.score || a.index - b.index)
        .map(({ entry }) => entry);

    case 'name':
      return entries
        .slice()
        .sort((a, b) =>
          `${a.product.brand} ${a.product.name}`.localeCompare(
            `${b.product.brand} ${b.product.name}`,
            'en',
            { sensitivity: 'base', numeric: true },
          ),
        );

    case 'recent':
    default:
      return entries;
  }
}
