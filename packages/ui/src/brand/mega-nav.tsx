'use client';

import Link from 'next/link';
import { TOTAL_TOOLS } from '@lovelytools/registry';
import { CATEGORIES, AUDIENCES, type CategorySlug } from '../lib/categories';
import { MonogramChip } from './monogram-chip';

// A "resources" panel used to live here (Blog, Guides, Tutorials, Comparisons,
// Help, FAQ, plus a featured article). Every one of those routes is a 404 —
// editorial is served from Postgres per RFC-001 §2 and there is no database. Bring
// the panel back with the content.
export type MegaPanelId = 'products' | 'solutions';

interface MegaNavProps {
  open: MegaPanelId | null;
  onClose: () => void;
}

/**
 * MegaNav — full-width panels under the header (DS §9).
 *
 * An opaque etched sheet, not a transparent one. This used to carry --nav-bg (82%)
 * + 24px blur straight from the DS's nav rule, and the hero's 72px headline read
 * through it — menu labels sitting on ghosted display type. Those values are right
 * for the 64px header bar they were written for and wrong for a sheet that opens
 * over the hero; --nav-panel-bg in tokens/colors.css explains why no amount of
 * opacity or blur rescues the translucent version.
 *
 * The glass reads through devices the DS already owns: a vertical gradient for depth,
 * the inset top highlight and the float shadow (§Borders & shadows). No
 * backdrop-filter — with an opaque sheet there is nothing behind it to filter, and
 * skipping it also spares a repaint of the whole panel on every scroll.
 *
 * 200ms fade-up. Opens on trigger mouseenter (owned by Header); closes when the
 * pointer leaves the header+panel region or on Esc. Fully Tab-traversable.
 */
export function MegaNav({ open, onClose }: MegaNavProps) {
  if (!open) return null;

  return (
    <div
      role="region"
      aria-label={`${open} menu`}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
      className="absolute inset-x-0 top-full animate-lt-fadeup border-b border-line"
      style={{
        background: 'var(--nav-panel-bg)',
        boxShadow: 'var(--card-shadow), var(--nav-panel-edge)',
      }}
    >
      <div className="mx-auto max-w-page px-8 py-7">
        {open === 'products' && <ProductsPanel />}
        {open === 'solutions' && <SolutionsPanel />}
      </div>
    </div>
  );
}

/* ---------- Products: 2 category columns + featured card ---------- */

/**
 * The categories that operate on a file the user brings. Everything else is a
 * utility.
 *
 * Typed as CategorySlug[] deliberately. This list previously read
 * ['pdf', 'image', 'video', 'audio'] — slugs from the pre-merge catalog, which the
 * registry renamed to 'pdf-tools', 'image-tools' and so on. Because
 * `string[].includes(string)` is perfectly legal, TypeScript said nothing, the
 * filter matched nothing, and the Products menu silently rendered with one item in
 * it. Typing the array means a wrong slug is now a compile error.
 */
const FILE_CATEGORIES: CategorySlug[] = [
  'pdf-tools',
  'image-tools',
  'video-tools',
  'audio-tools',
  'social-media-tools',
];

function ProductsPanel() {
  const files = CATEGORIES.filter((c) => FILE_CATEGORIES.includes(c.slug));
  // The complement, not a second hand-kept list: a new category must appear in one
  // column or the other, never in neither.
  const utilities = CATEGORIES.filter((c) => !FILE_CATEGORIES.includes(c.slug));

  return (
    <div className="grid grid-cols-[1fr_1fr_320px] gap-8">
      <PanelColumn title="Files & Media">
        {files.map((c) => (
          <CategoryRow key={c.slug} category={c} />
        ))}
      </PanelColumn>
      <PanelColumn title="Utilities">
        {utilities.map((c) => (
          <CategoryRow key={c.slug} category={c} />
        ))}
      </PanelColumn>

      {/*
        This card used to promote /ai-tool-finder. The AIToolFinder component exists,
        but the page does not and neither does the LLM route it calls
        (/api/v1/finder, RFC-001 §8) — so the panel's one accent-coloured call to
        action was a 404. Browse-all is real, and it is the honest thing to point at.
      */}
      <Link
        href="/tools"
        className="flex flex-col justify-between gap-6 rounded-xl border border-line p-5 transition-colors duration-150 hover:border-line2"
        style={{ background: 'linear-gradient(135deg, var(--accent-soft), transparent 70%)' }}
      >
        <div className="flex flex-col gap-2">
          <span className="font-grotesk text-[11px] font-semibold uppercase tracking-[0.13em] text-accent">
            Browse
          </span>
          <span className="font-grotesk text-[16.5px] font-semibold tracking-[-0.01em] text-fg">
            All {TOTAL_TOOLS} tools
          </span>
          <span className="text-[13px] leading-[1.5] text-fg2">
            Every tool in one place, grouped by category. Free, no signup.
          </span>
        </div>
        <span className="text-[13.5px] font-semibold text-accent">See them all →</span>
      </Link>
    </div>
  );
}

function CategoryRow({ category }: { category: (typeof CATEGORIES)[number] }) {
  return (
    <Link
      href={category.href}
      className="flex items-center gap-3 rounded-[9px] p-2 transition-colors duration-150 hover:bg-surface2"
    >
      <MonogramChip code={category.code} hue={category.hue} hueOnLight={category.hueOnLight} size={34} />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-[14px] font-semibold text-fg">{category.name}</span>
        <span className="truncate text-[12px] text-fg3">{category.description}</span>
      </span>
      <span className="shrink-0 font-grotesk text-[12px] text-fg3">{category.toolCount}</span>
    </Link>
  );
}

/* ---------- Solutions: 7 audience rows in 3 columns ---------- */

function SolutionsPanel() {
  return (
    <div className="grid grid-cols-3 gap-x-8 gap-y-1">
      {AUDIENCES.map((a) => (
        <Link
          key={a.slug}
          href={`/${a.slug}`}
          className="flex items-center gap-3 rounded-[9px] p-2.5 transition-colors duration-150 hover:bg-surface2"
        >
          <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-[2px]" style={{ background: a.hue }} />
          <span className="flex flex-col">
            <span className="text-[14px] font-semibold text-fg">{a.name}</span>
            <span className="text-[12.5px] text-fg3">{a.description}</span>
          </span>
        </Link>
      ))}
    </div>
  );
}

/* ---------- shared ---------- */

function PanelColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="mb-2 px-2 font-grotesk text-[11px] font-semibold uppercase tracking-[0.13em] text-fg3">
        {title}
      </p>
      {children}
    </div>
  );
}
