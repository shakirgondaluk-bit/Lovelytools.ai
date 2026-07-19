import { cn } from '../lib/utils';

interface FloatingCardProps {
  label: string;
  hue: string;
  /** Degrees of tilt. Rotation lives on the wrapper; float on the inner element. */
  rotate?: number;
  /** Stagger the 6.8s float loop so cards don't bob in unison. */
  delay?: number;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * FloatingCard — the decorative hero chips (DS §10).
 * Top/bottom bands only, hidden below 1200px. Adds the inset top highlight that
 * marks an element as floating, and the one shadow token in the system.
 * The float loop is disabled by prefers-reduced-motion via the .lt-float hook.
 */
export function FloatingCard({ label, hue, rotate = 0, delay = 0, className, style }: FloatingCardProps) {
  return (
    <div
      aria-hidden="true"
      className={cn('pointer-events-none absolute hidden select-none xl:block', className)}
      style={{ transform: `rotate(${rotate}deg)`, ...style }}
    >
      <div
        className="lt-float flex animate-lt-float items-center gap-2.5 rounded-lg border border-line bg-surface px-3.5 py-2.5 shadow-card"
        style={{
          animationDelay: `${delay}s`,
          boxShadow: 'var(--card-shadow), inset 0 1px 0 rgba(255,255,255,.06)',
        }}
      >
        <span className="size-[9px] shrink-0 rounded-xs" style={{ background: hue }} />
        <span className="whitespace-nowrap font-sans text-[12.5px] font-medium text-fg2">
          {label}
        </span>
      </div>
    </div>
  );
}
