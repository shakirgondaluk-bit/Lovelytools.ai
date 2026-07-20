'use client';

import Link from 'next/link';
import { CATEGORIES, getTool } from '@lovelytools/registry';
import { ToolCard, useFavorites } from '@lovelytools/ui';

/**
 * The body of /favorites — the tools the visitor has hearted, grouped by category
 * so the page reads like the category hubs it sits alongside.
 *
 * Client-only by necessity: the set lives in localStorage, so there is nothing to
 * render on the server. Slugs are resolved through the registry rather than stored
 * with their names, which means a renamed tool follows its favorite, and a slug
 * that no longer exists (removed tool, hand-edited storage) is skipped instead of
 * rendering a dead card.
 */
export function FavoritesGrid() {
  const { favorites, hydrated } = useFavorites();

  // Don't paint an empty state over someone's saved list while storage is read.
  if (!hydrated) {
    return (
      <div className="lt-container py-20">
        <p className="text-center text-sm text-fg3">Loading your favorites…</p>
      </div>
    );
  }

  const tools = Array.from(favorites)
    .map((slug) => getTool(slug))
    .filter((t) => t !== undefined);

  if (tools.length === 0) {
    return (
      <div className="lt-container flex flex-col items-center gap-5 py-20 text-center">
        <span aria-hidden="true" className="text-[40px] leading-none text-fg3">
          ♡
        </span>
        <h2 className="font-grotesk text-[22px] font-bold tracking-[-0.02em] text-fg">
          No favorites yet
        </h2>
        <p className="max-w-[440px] text-[15px] leading-[1.55] text-fg2">
          Tap the heart on any tool card and it lands here — a shortcut list of the
          tools you actually use. Saved on this device only; no account needed.
        </p>
        <Link
          href="/tools"
          className="rounded-[9px] bg-accent px-[18px] py-[9px] text-[14px] font-semibold text-white transition-[filter] duration-150 hover:brightness-[1.12] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          Browse all tools
        </Link>
      </div>
    );
  }

  // Group by the tool's home category, preserving CATEGORIES order.
  const groups = CATEGORIES.map((category) => ({
    category,
    tools: tools.filter((t) => t.category === category.id),
  })).filter((g) => g.tools.length > 0);

  return (
    <div className="lt-container flex flex-col gap-12 py-14">
      {groups.map(({ category, tools: groupTools }) => (
        <section key={category.id} className="flex flex-col gap-6">
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="size-[9px] rounded-xs"
              style={{ background: category.hue }}
            />
            <h2 className="font-grotesk text-[18px] font-bold tracking-[-0.02em] text-fg">
              {category.name}
            </h2>
            <span className="text-[13px] text-fg3">{groupTools.length}</span>
          </div>
          <div className="grid grid-cols-1 gap-grid sm:grid-cols-2 lg:grid-cols-4">
            {groupTools.map((tool) => (
              <ToolCard key={tool.slug} tool={tool} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
