'use client';

import { useEffect, useRef } from 'react';

/**
 * The hero's background grid, revealed only in a soft disc around the pointer.
 *
 * Listens on window (not the element) so the reveal keeps tracking even while the
 * cursor is over the headline, search bar or floating cards that sit above the
 * grid. Coordinates are computed relative to this element's own box, and the
 * effect fades out (--on: 0) whenever the pointer leaves the hero's bounds.
 * Throttled to one update per frame; all styling lives in .lt-grid-spotlight.
 */
export function HeroSpotlightGrid() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let raf = 0;
    let lastX = 0;
    let lastY = 0;

    const apply = () => {
      raf = 0;
      const rect = el.getBoundingClientRect();
      const x = lastX - rect.left;
      const y = lastY - rect.top;
      const inside = x >= 0 && y >= 0 && x <= rect.width && y <= rect.height;
      el.style.setProperty('--mx', `${x}px`);
      el.style.setProperty('--my', `${y}px`);
      el.style.setProperty('--on', inside ? '1' : '0');
    };

    const onMove = (e: PointerEvent) => {
      lastX = e.clientX;
      lastY = e.clientY;
      if (!raf) raf = requestAnimationFrame(apply);
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return <div ref={ref} aria-hidden="true" className="lt-grid-spotlight absolute inset-0" />;
}
