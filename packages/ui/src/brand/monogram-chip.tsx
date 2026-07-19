import { cn } from '../lib/utils';

interface MonogramChipProps {
  /** Two-letter category code, e.g. "PD". */
  code: string;
  /** Theme-invariant category hue. */
  hue: string;
  /** Darkened hue used for text on light theme. */
  hueOnLight?: string;
  /** Square size in px. Default 40 (category card); mega-nav rows use 34. */
  size?: number;
  className?: string;
}

/**
 * MonogramChip — hue-tinted square with the category monogram.
 * DS §6.3: tint = hue at 14% alpha, text = hue, radius r-11, Space Grotesk bold.
 * RSC-safe. Light-theme text darkening is handled with a scoped CSS variable.
 */
export function MonogramChip({ code, hue, hueOnLight, size = 40, className }: MonogramChipProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex shrink-0 select-none items-center justify-center rounded-[11px] font-grotesk font-bold',
        'text-[var(--chip-hue)] [.light_&]:text-[var(--chip-hue-light)]',
        className,
      )}
      style={
        {
          width: size,
          height: size,
          fontSize: Math.round(size * 0.34),
          letterSpacing: '0.02em',
          background: `color-mix(in srgb, ${hue} 14%, transparent)`,
          '--chip-hue': hue,
          '--chip-hue-light': hueOnLight ?? hue,
        } as React.CSSProperties
      }
    >
      {code}
    </span>
  );
}
