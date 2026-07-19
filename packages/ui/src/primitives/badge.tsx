import { cn } from '../lib/utils';

const TONES = {
  neutral: 'var(--text3)',
  accent: 'var(--accent)',
  green: 'var(--green)',
} as const;

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Adds a leading status marker. */
  dot?: boolean;
  /** Pulses the dot on a 2s loop — for live/status indicators only (DS §7). */
  pulse?: boolean;
  tone?: keyof typeof TONES;
}

/** Badge — status/label pill (DS §6.8). */
export function Badge({
  children,
  dot = false,
  pulse = false,
  tone = 'neutral',
  className,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-[5px]',
        'text-[13px] text-fg2',
        className,
      )}
      {...props}
    >
      {dot && (
        <span
          className={cn('size-[7px] shrink-0 rounded-full', pulse && 'animate-lt-pulse')}
          style={{ background: TONES[tone] }}
        />
      )}
      {children}
    </span>
  );
}
