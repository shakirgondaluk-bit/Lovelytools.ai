import { cn } from '../lib/utils';

/**
 * KbdHint — keyboard hint chip (DS §6.4).
 * Space Grotesk 11px, 1px --border, radius 5px.
 */
export function KbdHint({ keys, className }: { keys: string; className?: string }) {
  return (
    <kbd
      className={cn(
        'inline-flex items-center rounded-[5px] border border-line2 px-1.5 py-0.5',
        'font-grotesk text-[11px] font-medium leading-none text-fg3',
        className,
      )}
    >
      {keys}
    </kbd>
  );
}
