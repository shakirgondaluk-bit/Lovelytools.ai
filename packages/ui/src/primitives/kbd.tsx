import { cn } from '../lib/utils';

/**
 * Kbd — keyboard hint chip (⌘K, Esc, ⌘Enter) (DS §6.4).
 * Space Grotesk 11px on a hairline pill. Unicode glyphs are the icon set.
 */
export function Kbd({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        'inline-flex items-center whitespace-nowrap rounded-sm border border-line px-1.5 py-px',
        'font-grotesk text-[11px] font-medium leading-[1.4] text-fg3',
        className,
      )}
    >
      {children}
    </kbd>
  );
}
