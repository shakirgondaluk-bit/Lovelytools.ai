import Link from 'next/link';
import type { Category } from '../lib/categories';
import { cn } from '../lib/utils';
import { MonogramChip } from './monogram-chip';

/**
 * CategoryCard — homepage categories grid (DS §6.3).
 * 40px monogram chip + "N tools" meta → name 16.5/600 → desc 13/--text3.
 * Hover: translateY(−3px) + border → category hue, 180ms.
 */
export function CategoryCard({ category, className }: { category: Category; className?: string }) {
  return (
    <Link
      href={category.href}
      className={cn(
        'group flex flex-col gap-3 rounded-xl border border-line bg-surface p-[22px]',
        'transition-[transform,border-color] duration-[180ms] ease-out hover:-translate-y-[3px]',
        'hover:border-[var(--card-hue)]',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
        'active:scale-[0.98] md:active:scale-100',
        className,
      )}
      style={{ '--card-hue': category.hue } as React.CSSProperties}
    >
      <div className="flex items-center justify-between">
        <MonogramChip code={category.code} hue={category.hue} hueOnLight={category.hueOnLight} />
        <span className="text-[12.5px] text-fg3">{category.toolCount} tools</span>
      </div>
      <div className="flex flex-col gap-1.5">
        <h3 className="font-grotesk text-[16.5px] font-semibold tracking-[-0.01em] text-fg">
          {category.name}
        </h3>
        <p className="text-[13px] leading-[1.5] text-fg3">{category.description}</p>
      </div>
    </Link>
  );
}
