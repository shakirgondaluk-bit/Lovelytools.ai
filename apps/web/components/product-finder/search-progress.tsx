'use client';

import { useEffect, useState } from 'react';
import { AffiliateIcon, type AffiliateIconName } from '@/components/templates/affiliate-icons';

/**
 * The Product Finder's "what's happening right now" stepper.
 *
 * A finder search is slow for real reasons — a live provider round-trip, then a
 * Claude ranking pass — and a bare spinner for ten seconds reads as a hang. This
 * walks the visitor through the pipeline that is genuinely running server-side:
 * the stage list below is the same sequence as filters.ts → ranking.ts →
 * pickShortlist, in the same order.
 *
 * Honesty rules this component holds to, because the results page it precedes is
 * built on the same principle (see FilterChips — a filter is only claimed when it
 * actually did something):
 *
 *   - Stages advance on *estimated* timings, not server telemetry. So they are
 *     worded as the work being done ("Filtering 4-star and above"), never as a
 *     finding ("Removed 14 products"). The real counts land with the results.
 *   - The last stage never self-completes. If the server is slower than the
 *     estimate the stepper holds there, spinning, rather than showing a finished
 *     checklist while we are still waiting.
 *   - The bar eases toward 92% and stops. It only reaches 100% when the response
 *     actually arrives — which is the moment this component unmounts.
 */

interface Stage {
  id: string;
  icon: AffiliateIconName;
  label: string;
  /** Estimated duration, ms. Tuned to the real cost of each step. */
  ms: number;
}

/**
 * Durations are deliberately uneven: the provider call and the Claude ranking
 * pass are the two that actually take seconds, and pretending the cheap in-memory
 * filters take as long would be theatre.
 */
const STAGES: Stage[] = [
  { id: 'search', icon: 'shopping-cart', label: 'Searching Amazon for matches', ms: 2600 },
  { id: 'variants', icon: 'layers', label: 'Merging colour and size variants', ms: 900 },
  { id: 'relevance', icon: 'badge-check', label: 'Keeping only genuine matches for your words', ms: 1000 },
  { id: 'rating', icon: 'star', label: 'Filtering 4-star and above', ms: 1000 },
  { id: 'reviews', icon: 'users', label: 'Weighing customer reviews', ms: 1200 },
  { id: 'delivery', icon: 'truck', label: 'Checking stock and free delivery', ms: 900 },
  { id: 'deals', icon: 'zap', label: 'Shortlisting deals and discounts', ms: 1000 },
  { id: 'scoring', icon: 'gauge', label: 'Scoring each product out of 100', ms: 3200 },
  { id: 'brands', icon: 'award', label: 'Extracting the top 3 brands', ms: 1400 },
  { id: 'cheaper', icon: 'package', label: 'Finding a popular cheaper alternative', ms: 1600 },
];

/** Cumulative end time of each stage, so the index is a lookup rather than a chain of timeouts. */
const ENDS = STAGES.reduce<number[]>((acc, stage) => {
  acc.push((acc[acc.length - 1] ?? 0) + stage.ms);
  return acc;
}, []);

const TOTAL = ENDS[ENDS.length - 1]!;

/** Where the bar parks while waiting. Never 100 — that belongs to the real response. */
const CEILING = 92;

const TICK = 100;

export function SearchProgress() {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const startedAt = Date.now();
    const id = window.setInterval(() => setElapsed(Date.now() - startedAt), TICK);
    return () => window.clearInterval(id);
  }, []);

  // -1 means we have outrun the estimate: hold on the final stage rather than
  // running out of pipeline and looking finished.
  const found = ENDS.findIndex((end) => elapsed < end);
  const current = found === -1 ? STAGES.length - 1 : found;

  // Asymptotic, so an over-running search keeps creeping instead of freezing.
  const percent = Math.min(CEILING, CEILING * (1 - Math.exp((-elapsed / TOTAL) * 2.6)));

  const seconds = Math.floor(elapsed / 1000);

  return (
    <div className="flex flex-col gap-5 rounded-2xl border border-line bg-surface p-6">
      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="lt-scan relative inline-flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent-soft">
            <AffiliateIcon name="gauge" strokeWidth={2} className="size-[18px] text-accent" aria-hidden="true" />
          </span>
          <div className="flex flex-col">
            <p className="font-grotesk text-[15.5px] font-bold tracking-[-0.01em] text-fg">
              Finding the best products
            </p>
            <p className="text-[12.5px] text-fg3">
              Reading live Amazon data, then scoring every candidate.
            </p>
          </div>
        </div>
        <span
          className="rounded-full border border-line px-2.5 py-1 font-grotesk text-[12px] font-semibold tabular-nums text-fg3"
          aria-hidden="true"
        >
          {seconds}s
        </span>
      </div>

      {/* ── Bar ──────────────────────────────────────────────────── */}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface2">
        <div
          className="lt-shimmer h-full rounded-full transition-[width] duration-200 ease-linear"
          style={{ width: `${percent}%`, background: 'var(--accent)' }}
        />
      </div>

      {/* ── Stages ───────────────────────────────────────────────── */}
      {/* aria-hidden: this is a visual walkthrough of work already announced in
          the live region below. Letting a screen reader read all ten rows on
          every tick would bury the one line that matters. */}
      <ol aria-hidden="true" className="flex flex-col gap-0.5">
        {STAGES.map((stage, index) => {
          const done = index < current;
          const active = index === current;

          // Pending stages fade with distance so the list reads as a queue
          // rather than ten equally-shouted lines.
          const pendingFade = Math.max(0.28, 1 - (index - current) * 0.22);

          return (
            <li
              key={stage.id}
              className={`flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors duration-200 ${
                active ? 'bg-accent-soft' : ''
              }`}
              style={done || active ? undefined : { opacity: pendingFade }}
            >
              <span className="relative inline-flex size-[18px] shrink-0 items-center justify-center">
                {done ? (
                  <AffiliateIcon
                    name="check"
                    strokeWidth={3}
                    className="size-[13px] text-accent"
                    aria-hidden="true"
                  />
                ) : active ? (
                  <span className="lt-spin absolute inset-0 rounded-full border-2 border-accent/25 border-t-accent" />
                ) : (
                  <span className="size-[5px] rounded-full bg-fg3/45" />
                )}
              </span>

              <AffiliateIcon
                name={stage.icon}
                strokeWidth={2}
                className={`size-[14px] shrink-0 ${active ? 'text-accent' : 'text-fg3'}`}
                aria-hidden="true"
              />

              <span
                className={`text-[13.5px] leading-snug ${
                  active ? 'font-semibold text-fg' : done ? 'text-fg3 line-through decoration-fg3/40' : 'text-fg2'
                }`}
              >
                {stage.label}
              </span>
            </li>
          );
        })}
      </ol>

      {/* Past the estimate the last stage just sits there spinning, which reads
          as a stall. Saying so is better than letting the visitor guess — broad
          keyword searches genuinely do run well past this on a cold cache. */}
      {elapsed > TOTAL && (
        <p className="border-t border-line pt-4 text-[12.5px] text-fg3">
          Still working — a broad search means more candidates to score, so this one is taking longer than usual.
          Results will appear as soon as they are ready.
        </p>
      )}

      {/* One announcement per stage change, rather than per tick. */}
      <p role="status" aria-live="polite" className="sr-only">
        {`Step ${current + 1} of ${STAGES.length}. ${STAGES[current]!.label}.`}
      </p>
    </div>
  );
}
