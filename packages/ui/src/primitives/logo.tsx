import Image from 'next/image';
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
 * Dark theme: a 135° accent→green gradient square holding "lt", built in CSS.
 * Light theme: the gear+heart artwork (product decision, 2026-07) — the CSS mark
 * stays the dark-theme mark. Both render always; body.light toggles which is
 * visible (base.css), so there is no client JS and no hydration flash.
 * Never rotate, outline, or recolor the CSS mark.
 */
export function Logo({ size = 28, showWordmark = true, href = '/', className }: LogoProps) {
  const radius = Math.round(size * 0.29);
  const inner = (
    <>
      <span className="lt-logo-mark-slot relative shrink-0" style={{ width: size, height: size }}>
        <span
          className="lt-logo-mark-dark absolute inset-0 grid place-items-center font-grotesk font-bold text-white"
          style={{
            borderRadius: radius,
            fontSize: Math.round(size * 0.54),
            // The one place a gradient is allowed as a fill (DS §Gradients).
            background: 'linear-gradient(135deg, var(--accent), var(--green))',
          }}
        >
          lt
        </span>
        {/* The source art bleeds to a soft dark vignette at the corners; overscaling
            inside the clipped, rounded box crops that out and keeps just the gear+heart. */}
        <span className="lt-logo-mark-light absolute inset-0 overflow-hidden" style={{ borderRadius: radius }}>
          <Image
            src="/brand/logo-mark-light.png"
            alt=""
            width={size * 2}
            height={size * 2}
            className="absolute left-1/2 top-1/2 h-[180%] w-[180%] max-w-none -translate-x-1/2 -translate-y-1/2 object-cover"
            priority
          />
        </span>
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
