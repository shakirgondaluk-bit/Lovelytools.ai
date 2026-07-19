import { Slot } from '@radix-ui/react-slot';
import { cn } from '../lib/utils';

// DS §6.1 — four variants, three sizes. Hover: primary brightens 1.12, secondary
// borders lighten, ghosts gain a --surface2 fill. Press (touch): scale .98.
const VARIANTS = {
  primary: 'bg-accent text-white border-transparent hover:brightness-[1.12]',
  secondary: 'bg-transparent text-fg border-line2 hover:border-fg3',
  ghost: 'bg-transparent text-fg2 border-transparent font-medium hover:bg-surface2 hover:text-fg',
  chip: 'bg-transparent text-fg2 border-line font-medium hover:border-line2 hover:text-fg',
} as const;

const SIZES = {
  sm: 'px-[18px] py-[9px] text-sm rounded-md',
  md: 'px-[22px] py-[11px] text-[15px] rounded-[10px]',
  lg: 'px-7 py-[14px] text-base rounded-lg',
} as const;

// Ghost and chip carry their own geometry (DS spec) rather than the size scale.
const VARIANT_GEOMETRY = {
  ghost: 'px-[14px] py-2 text-sm rounded-lg',
  chip: 'px-3 py-1.5 text-[12.5px] rounded-full',
} as const;

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof VARIANTS;
  size?: keyof typeof SIZES;
  /** Render as the child element (e.g. a Next <Link>) instead of a <button>. */
  asChild?: boolean;
}

/**
 * Button — the brand button (DS §6.1).
 * Server-safe: hover and press states are CSS, not React state, so this renders
 * in an RSC without a client boundary.
 */
export function Button({
  variant = 'primary',
  size = 'md',
  asChild = false,
  className,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : 'button';
  const geometry =
    variant === 'ghost' || variant === 'chip' ? VARIANT_GEOMETRY[variant] : SIZES[size];

  return (
    <Comp
      className={cn(
        'inline-flex cursor-pointer select-none items-center justify-center gap-2 border font-sans font-semibold leading-none',
        'transition-[filter,border-color,background,color] duration-fast ease-[var(--ease-ui)]',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
        'active:scale-[0.98] md:active:scale-100',
        'disabled:pointer-events-none disabled:opacity-40',
        geometry,
        VARIANTS[variant],
        className,
      )}
      {...props}
    />
  );
}
