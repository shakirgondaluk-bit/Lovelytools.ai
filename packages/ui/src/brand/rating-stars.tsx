'use client';

import { useState } from 'react';
import { cn } from '../lib/utils';

const STAR = '★';
const GOLD = '#F5B83D'; // theme-invariant (DS §2)

interface RatingStarsProps {
  /** 0–5, decimals allowed for display. */
  value: number;
  /** Optional count rendered after the stars, e.g. "4.8 (12,940)". */
  count?: number;
  size?: number;
  className?: string;
}

/** RatingStars — read-only display row. Fractional fill via clipped overlay. */
export function RatingStars({ value, count, size = 13, className }: RatingStarsProps) {
  const pct = Math.max(0, Math.min(5, value)) * 20;
  return (
    <span
      className={cn('inline-flex items-center gap-1.5', className)}
      aria-label={`Rated ${value.toFixed(1)} out of 5`}
    >
      <span className="relative inline-block leading-none" style={{ fontSize: size }} aria-hidden="true">
        <span className="text-fg3 opacity-50">{STAR.repeat(5)}</span>
        <span
          className="absolute inset-0 overflow-hidden whitespace-nowrap"
          style={{ width: `${pct}%`, color: GOLD }}
        >
          {STAR.repeat(5)}
        </span>
      </span>
      <span className="font-grotesk text-[12.5px] font-medium text-fg2">
        {value.toFixed(1)}
        {count !== undefined && (
          <span className="text-fg3"> ({Intl.NumberFormat('en').format(count)})</span>
        )}
      </span>
    </span>
  );
}

interface RateToolProps {
  toolSlug: string;
  /** Called after a successful submit. */
  onRated?: (stars: number) => void;
  /** Override the network call (tests, storybook). Defaults to POST /api/v1/ratings. */
  submit?: (toolSlug: string, stars: number) => Promise<void>;
  className?: string;
}

/**
 * RateTool — interactive 1–5 star prompt (tool page, shown after 2nd successful use).
 * POSTs to /api/v1/ratings (edge, rate-limited 10/min, one rating per user per tool).
 */
export function RateTool({ toolSlug, onRated, submit, className }: RateToolProps) {
  const [hover, setHover] = useState(0);
  const [chosen, setChosen] = useState(0);
  const [state, setState] = useState<'idle' | 'saving' | 'done' | 'error'>('idle');

  const send = async (stars: number) => {
    setChosen(stars);
    setState('saving');
    try {
      if (submit) {
        await submit(toolSlug, stars);
      } else {
        const res = await fetch('/api/v1/ratings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ toolSlug, stars }),
        });
        if (!res.ok) throw new Error(String(res.status));
      }
      setState('done');
      onRated?.(stars);
    } catch {
      setState('error');
    }
  };

  if (state === 'done') {
    return (
      <p className={cn('animate-lt-fadeup text-[13.5px] text-fg2', className)}>
        <span className="text-success">✓</span> Thanks — your rating is in.
      </p>
    );
  }

  const shown = hover || chosen;
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <span className="text-[13.5px] text-fg2">How did it go?</span>
      <div
        className="flex"
        role="radiogroup"
        aria-label="Rate this tool from 1 to 5 stars"
        onMouseLeave={() => setHover(0)}
      >
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={chosen === n}
            aria-label={`${n} star${n > 1 ? 's' : ''}`}
            disabled={state === 'saving'}
            onMouseEnter={() => setHover(n)}
            onFocus={() => setHover(n)}
            onClick={() => send(n)}
            className="cursor-pointer px-0.5 text-[20px] leading-none transition-transform duration-150 hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-40"
            style={{ color: n <= shown ? GOLD : 'var(--text3)' }}
          >
            {STAR}
          </button>
        ))}
      </div>
      {state === 'error' && (
        <span className="text-[12.5px]" style={{ color: 'var(--error)' }}>
          Couldn&rsquo;t save — try again
        </span>
      )}
    </div>
  );
}
