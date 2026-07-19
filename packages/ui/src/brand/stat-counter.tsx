'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '../lib/utils';

interface StatCounterProps {
  /** Numbers count up; strings (e.g. "99.9%") render statically. */
  value: number | string;
  prefix?: string;
  suffix?: string;
  caption?: string;
  className?: string;
}

/**
 * StatCounter — counts up over 1.6s with a cubic ease-out (DS §7).
 * Starts when scrolled into view, not on mount, so the animation is actually seen.
 * Honors prefers-reduced-motion by jumping straight to the value.
 */
export function StatCounter({ value, prefix = '', suffix = '', caption, className }: StatCounterProps) {
  const numeric = typeof value === 'number';
  const [display, setDisplay] = useState(numeric ? 0 : value);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!numeric) {
      setDisplay(value);
      return;
    }
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      setDisplay(value);
      return;
    }

    const node = ref.current;
    if (!node) return;

    let raf = 0;
    const run = () => {
      const start = performance.now();
      const duration = 1600; // --dur-counter
      const tick = (now: number) => {
        const p = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - p, 3);
        setDisplay(Math.round(value * eased));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            run();
            observer.disconnect();
          }
        }
      },
      { threshold: 0.4 },
    );
    observer.observe(node);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value, numeric]);

  return (
    <div ref={ref} className={cn('flex flex-col gap-1.5', className)}>
      <span className="font-grotesk text-[44px] font-bold leading-none tracking-[-0.03em] text-fg">
        {prefix}
        {typeof display === 'number' ? display.toLocaleString('en') : display}
        {suffix}
      </span>
      {caption && <span className="text-sm text-fg2">{caption}</span>}
    </div>
  );
}
