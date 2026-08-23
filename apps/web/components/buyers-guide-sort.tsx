'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';
import { SORT_OPTIONS, DEFAULT_SORT, type SortKey } from '@/lib/buyers-guide-sort';

/**
 * The Buyer's Guide sort control.
 *
 * A native `<select>` on purpose: it gets the platform's own picker on mobile,
 * keyboard support and screen-reader semantics for free, and it is a fraction of
 * the markup of a custom listbox. The rest of the page is server-rendered — this
 * is the one island, and only because a dropdown has to navigate on change.
 *
 * Sorting lives in the URL rather than component state so a sorted view can be
 * linked and survives a reload, and so the server component does the actual
 * ordering. The category param is carried across, because losing your category
 * filter when you change the sort is the obvious way to get this wrong.
 */
export function BuyersGuideSort() {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const current = (params.get('sort') ?? DEFAULT_SORT) as SortKey;

  const onChange = (value: string) => {
    const next = new URLSearchParams(params.toString());
    // Keep the default out of the URL: /buyers-guide and /buyers-guide?sort=recent
    // are the same page, and only one of them should be linkable.
    if (value === DEFAULT_SORT) next.delete('sort');
    else next.set('sort', value);

    const query = next.toString();
    startTransition(() => router.push(query ? `/buyers-guide?${query}` : '/buyers-guide', { scroll: false }));
  };

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="buyers-guide-sort" className="text-[13px] text-fg3">
        Sort by
      </label>
      <select
        id="buyers-guide-sort"
        value={current}
        onChange={(e) => onChange(e.target.value)}
        // aria-busy rather than disabling: disabling a focused select mid-navigation
        // drops keyboard focus to the body.
        aria-busy={pending}
        className="rounded-full border border-line bg-surface px-3 py-1.5 text-[13px] font-semibold text-fg2 transition-colors hover:border-line2 hover:text-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option.key} value={option.key}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
