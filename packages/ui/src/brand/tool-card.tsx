import Link from 'next/link';
import { categoryBySlug, type Tool } from '../lib/categories';
import { cn, formatUses } from '../lib/utils';
import { FavoriteButton } from './favorites';
import { RatingStars } from './rating-stars';

interface ToolCardProps {
  tool: Tool;
  /** Category pages add a 1-line description (DS §11). */
  showDescription?: boolean;
  className?: string;
}

/**
 * ToolCard — featured tool card (DS §6.3).
 * 9px hue dot (r-3) + favorite toggle → name 15.5/600 + category 12.5 →
 * footer: ★ rating + uses. Hover: translateY(−3px), border → --border2.
 * RSC-compatible; FavoriteButton is the only client leaf.
 *
 * Ratings and use counts come from tool_stats (RFC-001 §4), not the registry, so
 * they are absent until the stats plane is connected. The footer collapses rather
 * than showing a placeholder — an invented rating is the one thing a privacy-first
 * brand cannot afford (DS voice: "stats must inform; no decorative stats").
 */
export function ToolCard({ tool, showDescription = false, className }: ToolCardProps) {
  const category = categoryBySlug(tool.category);

  return (
    <Link
      href={`/${tool.slug}`}
      className={cn(
        'group flex flex-col gap-3 rounded-xl border border-line bg-surface p-5',
        'transition-[transform,border-color] duration-[180ms] ease-out hover:-translate-y-[3px] hover:border-line2',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
        'active:scale-[0.98] md:active:scale-100', // press state on touch
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <span
          aria-hidden="true"
          className="h-[9px] w-[9px] rounded-[3px]"
          style={{ background: category.hue }}
        />
        <FavoriteButton toolSlug={tool.slug} toolName={tool.name} className="-m-2" />
      </div>

      <div className="flex flex-col gap-1">
        <h3 className="font-grotesk text-[15.5px] font-semibold leading-tight tracking-[-0.01em] text-fg">
          {tool.name}
        </h3>
        <p className="text-[12.5px] text-fg3">{category.name}</p>
        {showDescription && tool.description && (
          <p className="mt-1 text-[13px] leading-[1.55] text-fg2">{tool.description}</p>
        )}
      </div>

      {(tool.rating !== undefined || tool.uses !== undefined) && (
        <div className="mt-auto flex items-center justify-between pt-1">
          {tool.rating !== undefined ? <RatingStars value={tool.rating} /> : <span />}
          {tool.uses !== undefined && (
            <span className="text-[12.5px] text-fg3">{formatUses(tool.uses)} uses</span>
          )}
        </div>
      )}
    </Link>
  );
}
