import Link from 'next/link';
import { cn } from '../lib/utils';

interface BlogCardProps {
  kind: string;
  title: string;
  meta: string;
  href: string;
  hue: string;
  className?: string;
}

/**
 * BlogCard — editorial card (DS §13).
 * The cover is a hue-striped placeholder: the system has no photography and no
 * stock illustration, so covers stay generative until real art exists.
 */
export function BlogCard({ kind, title, meta, href, hue, className }: BlogCardProps) {
  return (
    <Link
      href={href}
      className={cn(
        'group flex flex-col overflow-hidden rounded-xl border border-line bg-surface',
        'transition-[transform,border-color] duration-hover ease-out hover:-translate-y-[3px] hover:border-line2',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="h-[132px] w-full border-b border-line"
        style={{
          background: `repeating-linear-gradient(135deg, color-mix(in srgb, ${hue} 16%, var(--surface)) 0 10px, var(--surface) 10px 20px)`,
        }}
      />
      <div className="flex flex-col gap-2 p-card">
        <span
          className="font-grotesk text-[12px] font-semibold uppercase tracking-[0.14em]"
          style={{ color: hue }}
        >
          {kind}
        </span>
        <span className="font-grotesk text-[15.5px] font-bold leading-[1.35] tracking-[-0.02em] text-fg">
          {title}
        </span>
        <span className="text-[12.5px] text-fg3">{meta}</span>
      </div>
    </Link>
  );
}
