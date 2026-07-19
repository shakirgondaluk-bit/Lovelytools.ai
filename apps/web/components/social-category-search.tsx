'use client';

import { useId, useMemo, useState } from 'react';
import type { ToolDefinition } from '@lovelytools/registry';
import { ToolCard } from '@lovelytools/ui';

/**
 * SocialCategorySearch — the category page's search + tool grid, one island.
 *
 * Filtering runs against the category's own tools, in memory, on keystroke —
 * the same "the index is smaller than a network round-trip" reasoning as the
 * hero search. The grid lives inside the island so filtering re-renders it;
 * with an empty query it renders every tool, which is exactly the static grid
 * the plain CategoryTemplate shows.
 */
export function SocialCategorySearch({ tools }: { tools: ToolDefinition[] }) {
  const [query, setQuery] = useState('');
  const inputId = useId();

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tools;
    return tools.filter(
      (tool) =>
        tool.name.toLowerCase().includes(q) ||
        tool.description.toLowerCase().includes(q) ||
        tool.slug.replace(/-/g, ' ').includes(q),
    );
  }, [query, tools]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex max-w-[480px] flex-col gap-1.5">
        <label htmlFor={inputId} className="sr-only">
          Search social media tools
        </label>
        <input
          id={inputId}
          type="search"
          placeholder="Extract audio, generate subtitles…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="rounded-lg border border-line bg-bg2 px-3.5 py-2.5 font-sans text-[14px] text-fg placeholder:text-fg3 focus:border-accent focus:outline-none"
        />
      </div>

      <p aria-live="polite" className="sr-only">
        {visible.length} tool{visible.length === 1 ? '' : 's'} shown
      </p>

      {visible.length > 0 ? (
        <div className="grid grid-cols-1 gap-grid sm:grid-cols-2 lg:grid-cols-4">
          {visible.map((tool) => (
            <ToolCard key={tool.slug} tool={tool} showDescription />
          ))}
        </div>
      ) : (
        <p className="text-[14px] text-fg2">
          Nothing here matches &ldquo;{query}&rdquo; — try &ldquo;audio&rdquo; or
          &ldquo;subtitles&rdquo;, or browse the grid with an empty search.
        </p>
      )}
    </div>
  );
}
