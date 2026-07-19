import { cn } from '../lib/utils';

interface AvatarProps {
  initials: string;
  /** Hue to tint with. Defaults to the accent. */
  hue?: string;
  size?: number;
  className?: string;
}

/**
 * Avatar — initials on a 16% tint of the given hue (DS §6.10).
 * There is no photography in the system, so identity is carried by initials.
 */
export function Avatar({ initials, hue = 'var(--accent)', size = 36, className }: AvatarProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'grid shrink-0 place-items-center rounded-full font-grotesk font-bold',
        className,
      )}
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.36),
        color: hue,
        background: `color-mix(in srgb, ${hue} 16%, transparent)`,
      }}
    >
      {initials}
    </span>
  );
}
