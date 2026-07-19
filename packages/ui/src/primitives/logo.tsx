import Link from 'next/link';
import { cn } from '../lib/utils';

interface LogoProps {
  /** Mark size in px. Default 28 (header). */
  size?: number;
  showWordmark?: boolean;
  href?: string | null;
  className?: string;
}

/**
 * Logo — the lovelytools.ai brand mark (DS §Brand).
 * A 135° accent→green gradient square holding "lt", plus the wordmark with ".ai"
 * always in accent. Built in CSS; no binary logo file exists, by design.
 * Never rotate, outline, or recolor.
 */
export function Logo({ size = 28, showWordmark = true, href = '/', className }: LogoProps) {
  const inner = (
    <>
      <span
        className="grid shrink-0 place-items-center font-grotesk font-bold text-white"
        style={{
          width: size,
          height: size,
          borderRadius: Math.round(size * 0.29),
          fontSize: Math.round(size * 0.54),
          // The one place a gradient is allowed as a fill (DS §Gradients).
          background: 'linear-gradient(135deg, var(--accent), var(--green))',
        }}
      >
        lt
      </span>
      {showWordmark && (
        <span
          className="font-grotesk font-bold tracking-[-0.02em]"
          style={{ fontSize: Math.round(size * 0.61) }}
        >
          lovelytools<span className="text-accent">.ai</span>
        </span>
      )}
    </>
  );

  const classes = cn('inline-flex items-center gap-[9px] text-fg no-underline', className);

  if (href == null) {
    return <span className={classes}>{inner}</span>;
  }
  return (
    <Link href={href} className={classes} aria-label="lovelytools.ai — home">
      {inner}
    </Link>
  );
}
