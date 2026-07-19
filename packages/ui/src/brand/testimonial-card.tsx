import { Avatar } from '../primitives/avatar';
import { cn } from '../lib/utils';

interface TestimonialCardProps {
  text: string;
  name: string;
  role?: string;
  initials: string;
  hue?: string;
  stars?: number;
  className?: string;
}

/** TestimonialCard — star row, quote, initials avatar (DS §6.9). */
export function TestimonialCard({
  text,
  name,
  role,
  initials,
  hue = '#7C6CFF',
  stars = 5,
  className,
}: TestimonialCardProps) {
  return (
    <figure
      className={cn(
        'flex flex-col gap-4 rounded-xl border border-line bg-surface p-[26px]',
        className,
      )}
    >
      <div
        className="text-sm tracking-[2px] text-star"
        aria-label={`Rated ${stars} out of 5`}
      >
        <span aria-hidden="true">{'★'.repeat(stars)}</span>
      </div>
      <blockquote className="m-0 text-[15px] leading-[1.65] text-fg2">{text}</blockquote>
      <figcaption className="mt-auto flex items-center gap-3">
        <Avatar initials={initials} hue={hue} size={36} className="text-[13px]" />
        <span className="flex flex-col">
          <span className="text-sm font-semibold text-fg">{name}</span>
          {role && <span className="text-[12.5px] text-fg3">{role}</span>}
        </span>
      </figcaption>
    </figure>
  );
}
