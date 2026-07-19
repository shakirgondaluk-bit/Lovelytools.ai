import Link from 'next/link';
import { cn } from '../lib/utils';

interface CollectionCardProps {
  label: string;
  name: string;
  description: string;
  hue: string;
  href: string;
  /** Names of a few tools in the set — the card's proof it's curated. */
  sample: string[];
  toolCount: number;
  className?: string;
}

/**
 * CollectionCard — audience panel (DS §9 "Curated for how you work").
 * Carries a 10–16% hue wash, one of the three sanctioned gradient uses.
 */
export function CollectionCard({
  label,
  name,
  description,
  hue,
  href,
  sample,
  toolCount,
  className,
}: CollectionCardProps) {
  return (
    <Link
      href={href}
      className={cn(
        'group flex flex-col gap-4 rounded-xl border border-line p-card',
        'transition-[transform,border-color] duration-hover ease-out hover:-translate-y-[3px]',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
        className,
      )}
      style={{
        // DS §Gradients: hue wash on collection panels, 10–16%.
        background: `linear-gradient(160deg, color-mix(in srgb, ${hue} 13%, var(--surface)), var(--surface) 70%)`,
        borderColor: `color-mix(in srgb, ${hue} 22%, var(--border))`,
      }}
    >
      <div className="flex flex-col gap-1">
        <span
          className="font-grotesk text-[12px] font-semibold uppercase tracking-[0.14em]"
          style={{ color: hue }}
        >
          {label}
        </span>
        <span className="font-grotesk text-xl font-bold tracking-[-0.02em] text-fg">{name}</span>
      </div>

      <p className="m-0 text-[13.5px] leading-[1.55] text-fg2">{description}</p>

      <ul className="flex flex-col gap-1.5">
        {sample.map((tool) => (
          <li key={tool} className="flex items-center gap-2 text-[13px] text-fg2">
            <span
              aria-hidden="true"
              className="size-[5px] shrink-0 rounded-xs"
              style={{ background: hue }}
            />
            {tool}
          </li>
        ))}
      </ul>

      <span className="mt-auto text-[12.5px] text-fg3 transition-colors group-hover:text-fg">
        {toolCount} tools →
      </span>
    </Link>
  );
}
