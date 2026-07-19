import { Button } from '../primitives/button';
import { cn } from '../lib/utils';

interface PricingCardProps {
  name: string;
  tagline?: string;
  price: string;
  period?: string;
  features: string[];
  cta?: string;
  ctaHref?: string;
  /** Accent border + "Most popular" pill overlapping the top edge. */
  popular?: boolean;
  className?: string;
}

/** PricingCard — plan card (DS §6.6). 32px padding, r-2xl, green ✓ feature rows. */
export function PricingCard({
  name,
  tagline,
  price,
  period,
  features,
  cta = 'Get started',
  ctaHref = '/pricing',
  popular = false,
  className,
}: PricingCardProps) {
  return (
    <div
      className={cn(
        'relative flex flex-col gap-5 rounded-2xl border bg-surface p-8',
        popular ? 'border-accent' : 'border-line',
        className,
      )}
    >
      {popular && (
        <span className="absolute -top-[13px] left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-accent px-[14px] py-[5px] text-xs font-semibold text-white">
          Most popular
        </span>
      )}

      <div className="flex flex-col gap-1">
        <span className="font-grotesk text-xl font-bold text-fg">{name}</span>
        {tagline && <span className="text-[13px] text-fg3">{tagline}</span>}
      </div>

      <div className="flex items-baseline gap-2">
        <span className="font-grotesk text-[42px] font-bold leading-none tracking-[-0.03em] text-fg">
          {price}
        </span>
        {period && <span className="text-[13px] text-fg3">{period}</span>}
      </div>

      <Button asChild variant={popular ? 'primary' : 'secondary'} size="md">
        <a href={ctaHref}>{cta}</a>
      </Button>

      <ul className="flex flex-col gap-3 border-t border-line pt-5">
        {features.map((feature) => (
          <li key={feature} className="flex gap-2.5 text-sm text-fg2">
            <span aria-hidden="true" className="shrink-0 text-success">
              ✓
            </span>
            {feature}
          </li>
        ))}
      </ul>
    </div>
  );
}
