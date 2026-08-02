'use client';

/**
 * Small pieces shared by the Product Finder's results and comparison islands.
 *
 * Presentation only — no fetching, no business logic. Formatting is duplicated
 * here rather than imported from lib/product-finder/ranking so the client bundle
 * doesn't drag the whole scoring engine along for one `Intl` call.
 */

import { AffiliateIcon } from '@/components/templates/affiliate-icons';
import type { DiscoveryResult } from '@/lib/product-finder/discovery-service';
import type { Money } from '@/lib/product-finder/types';

export const MAX_COMPARE = 3;

export function formatPrice(value: Money | null): string | null {
  if (!value) return null;
  try {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: value.currency,
      maximumFractionDigits: 2,
    }).format(value.amount);
  } catch {
    return `${value.currency} ${value.amount.toFixed(2)}`;
  }
}

export const formatCount = (value: number): string => new Intl.NumberFormat('en-GB').format(value);

/* ───────────────────────── session hand-off ───────────────────────── */

const STORAGE_KEY = 'lt:product-finder:last-result';

/**
 * The comparison page's fast path. Results are handed over in sessionStorage so
 * clicking Compare is instant and costs no second provider call — but the page
 * never *depends* on it: a cold load (shared link, bookmark, refresh) re-fetches
 * from /api/product-finder/lookup instead. Storage failures (Safari private
 * mode, quota) are swallowed for the same reason.
 */
export function cacheResult(result: DiscoveryResult): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(result));
  } catch {
    /* the compare page re-fetches */
  }
}

export function readCachedResult(): DiscoveryResult | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as DiscoveryResult) : null;
  } catch {
    return null;
  }
}

/* ───────────────────────── presentational ───────────────────────── */

/** The 0–100 AI score, as a ring with the number inside. */
export function ScoreDial({ score, size = 56 }: { score: number; size?: number }) {
  const radius = size / 2 - 4;
  const circumference = 2 * Math.PI * radius;
  const filled = (Math.max(0, Math.min(100, score)) / 100) * circumference;

  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`AI score ${score} out of 100`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--border)" strokeWidth="4" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference}`}
        />
      </svg>
      <span
        aria-hidden="true"
        className="absolute font-grotesk font-bold text-fg"
        style={{ fontSize: size * 0.32 }}
      >
        {score}
      </span>
    </span>
  );
}

/** Amazon-style star row. Renders nothing when the provider reported no rating. */
export function Stars({ rating, reviewCount }: { rating: number | null; reviewCount: number | null }) {
  if (rating === null) {
    return <span className="text-[12.5px] text-fg3">Rating not reported</span>;
  }
  const filled = Math.round(rating);

  return (
    <span className="flex items-center gap-1.5">
      <span className="flex gap-0.5 text-star" aria-hidden="true">
        {Array.from({ length: 5 }).map((_, i) => (
          <AffiliateIcon key={i} name="star" className="size-[13px]" fill={i < filled ? 'currentColor' : 'none'} />
        ))}
      </span>
      <span className="text-[12.5px] font-semibold text-fg2">{rating.toFixed(1)}</span>
      {reviewCount !== null && (
        <span className="text-[12.5px] text-fg3">({formatCount(reviewCount)})</span>
      )}
    </span>
  );
}

export function PriceTag({
  price,
  originalPrice,
  discountPercent,
}: {
  price: Money | null;
  originalPrice: Money | null;
  discountPercent: number | null;
}) {
  const current = formatPrice(price);
  const was = formatPrice(originalPrice);

  if (!current) {
    // Never invent a price. The catalog provider deliberately stores none, and a
    // stale figure on an affiliate page is worse than no figure at all.
    return <span className="text-[13px] font-semibold text-fg2">Live price on Amazon</span>;
  }

  return (
    <span className="flex flex-wrap items-baseline gap-2">
      <span className="font-grotesk text-[20px] font-bold text-fg">{current}</span>
      {was && <span className="text-[13px] text-fg3 line-through">{was}</span>}
      {/* Literal green, not the `success` token — that token resolves to this
          design system's purple accent and would read as "info", not "saving". */}
      {discountPercent !== null && (
        <span className="rounded-full bg-green-500/15 px-2 py-0.5 text-[11.5px] font-bold text-green-500">
          −{discountPercent}%
        </span>
      )}
    </span>
  );
}

/** The "Buy on Amazon" control. Always fed a URL from the Affiliate Link Service. */
export function BuyButton({ href, className = '' }: { href: string; className?: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="nofollow sponsored noopener"
      className={`inline-flex h-11 items-center justify-center gap-2 rounded-full bg-accent px-5 text-[13.5px] font-bold text-accent-fg transition-transform hover:scale-[1.02] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${className}`}
    >
      <AffiliateIcon name="shopping-cart" className="size-4" aria-hidden="true" />
      Buy on Amazon
    </a>
  );
}

/** The applied-filter chips shown above the results. */
export function FilterChips({ filters }: { filters: DiscoveryResult['filters'] }) {
  const shown = filters.filter((f) => f.active);
  if (shown.length === 0) return null;

  const explain = (filter: DiscoveryResult['filters'][number]) =>
    filter.relaxed
      ? 'Loosened — keeping this filter would have left too few products to compare.'
      : filter.mode === 'prefer'
        ? 'Applied as a preference, not a cut-off.'
        : `Removed ${filter.removed} candidate${filter.removed === 1 ? '' : 's'}.`;

  return (
    <ul className="flex flex-wrap gap-2">
      {shown.map((filter) => (
        <li
          key={filter.id}
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-semibold ${
            filter.relaxed
              ? 'border-line bg-surface2 text-fg3'
              : 'border-accent/40 bg-accent-soft text-accent'
          }`}
          // `title` alone would become the element's accessible name and hide
          // the filter's actual label from screen readers — the explanation
          // would be announced instead of "Keyword relevance". aria-label
          // carries both, so the tooltip stays for sighted users.
          title={explain(filter)}
          aria-label={`${filter.label}${filter.relaxed ? ' (loosened)' : ''}. ${explain(filter)}`}
        >
          <AffiliateIcon
            name={filter.relaxed ? 'alert-triangle' : 'check'}
            strokeWidth={2.5}
            className="size-[12px]"
            aria-hidden="true"
          />
          {filter.label}
          {filter.relaxed && <span className="font-normal">(loosened)</span>}
        </li>
      ))}
    </ul>
  );
}

/** Loading placeholder that matches the real card's geometry, so nothing jumps. */
export function ResultSkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-4 rounded-2xl border border-line bg-surface p-5">
      <div className="h-[180px] rounded-xl bg-surface2" />
      <div className="h-3 w-1/3 rounded-full bg-surface2" />
      <div className="h-4 w-4/5 rounded-full bg-surface2" />
      <div className="h-3 w-2/3 rounded-full bg-surface2" />
      <div className="mt-2 flex flex-col gap-2">
        <div className="h-2.5 w-full rounded-full bg-surface2" />
        <div className="h-2.5 w-5/6 rounded-full bg-surface2" />
        <div className="h-2.5 w-3/4 rounded-full bg-surface2" />
      </div>
      <div className="mt-auto flex gap-2 pt-2">
        <div className="h-11 flex-1 rounded-full bg-surface2" />
        <div className="h-11 flex-1 rounded-full bg-surface2" />
      </div>
    </div>
  );
}
