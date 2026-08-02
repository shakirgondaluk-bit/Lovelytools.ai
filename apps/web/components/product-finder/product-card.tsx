'use client';

import Image from 'next/image';
import Link from 'next/link';
import { AffiliateIcon } from '@/components/templates/affiliate-icons';
import type { FinderProduct } from '@/lib/product-finder/discovery-service';
import { BuyButton, MAX_COMPARE, PriceTag, ScoreDial, Stars } from './finder-shared';

/**
 * One ranked result. Carries everything the spec asks a card to carry — image,
 * name, price, discount, rating, review count, AI score, pros, cons, quick specs
 * — plus the three actions: Compare, View Details, Buy on Amazon.
 *
 * The rank ribbon and the "why this rank" disclosure are the reason this is a
 * finder result and not just a product tile: the score is never shown without
 * the reasoning behind it being one click away.
 */
export function ProductCard({
  item,
  selected,
  selectionCount,
  onToggleCompare,
}: {
  item: FinderProduct;
  selected: boolean;
  selectionCount: number;
  onToggleCompare: (asin: string) => void;
}) {
  const { product, analysis } = item;
  const atLimit = !selected && selectionCount >= MAX_COMPARE;

  return (
    <article
      className={`flex flex-col gap-4 rounded-2xl border bg-surface p-5 transition-[border-color,transform] duration-[180ms] ease-out ${
        selected ? 'border-accent' : 'border-line hover:border-line2'
      }`}
    >
      {/* Image + rank ribbon */}
      <div className="relative overflow-hidden rounded-xl border border-line bg-surface2">
        <span className="absolute left-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-accent px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-accent-fg">
          #{analysis.rank} {analysis.headline}
        </span>
        <Image
          src={product.images[0] ?? ''}
          alt={`${product.brand} ${product.name}`}
          width={440}
          height={300}
          unoptimized
          className="h-[190px] w-full object-contain p-4"
        />
      </div>

      {/* Identity + score */}
      <div className="flex items-start gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-[11.5px] font-bold uppercase tracking-[0.08em] text-accent">{product.brand}</span>
          <h3 className="font-grotesk text-[16px] font-bold leading-snug text-fg">{product.name}</h3>
        </div>
        <span className="flex shrink-0 flex-col items-center gap-1">
          <ScoreDial score={analysis.aiScore} />
          <span className="text-[10.5px] font-semibold uppercase tracking-wide text-fg3">AI score</span>
        </span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <PriceTag
          price={product.price}
          originalPrice={product.originalPrice}
          discountPercent={product.discountPercent}
        />
        <Stars rating={product.rating} reviewCount={product.reviewCount} />
      </div>

      {/* Pros / cons */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <ul className="flex flex-col gap-1.5">
          {analysis.pros.slice(0, 3).map((pro) => (
            <li key={pro} className="flex gap-2 text-[12.5px] leading-snug text-fg2">
              <AffiliateIcon
                name="check"
                strokeWidth={2.5}
                className="mt-0.5 size-[13px] shrink-0 text-green-500"
                aria-hidden="true"
              />
              {pro}
            </li>
          ))}
        </ul>
        <ul className="flex flex-col gap-1.5">
          {analysis.cons.slice(0, 3).map((con) => (
            <li key={con} className="flex gap-2 text-[12.5px] leading-snug text-fg2">
              <AffiliateIcon
                name="x"
                strokeWidth={2.5}
                className="mt-0.5 size-[13px] shrink-0 text-danger"
                aria-hidden="true"
              />
              {con}
            </li>
          ))}
        </ul>
      </div>

      {/* Quick specs */}
      {analysis.quickSpecs.length > 0 && (
        <dl className="flex flex-col divide-y divide-line rounded-xl border border-line bg-bg2/40">
          {analysis.quickSpecs.slice(0, 4).map((spec) => (
            <div key={spec.label} className="flex items-center justify-between gap-3 px-3.5 py-2 text-[12.5px]">
              <dt className="font-semibold text-fg2">{spec.label}</dt>
              <dd className="truncate text-right text-fg3">{spec.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {/* Why this rank — the score is never shown without its reasoning. */}
      <details className="group rounded-xl border border-line px-3.5 py-2.5 [&_summary::-webkit-details-marker]:hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-[12.5px] font-bold text-fg">
          Why it ranked #{analysis.rank}
          <AffiliateIcon
            name="chevron-down"
            className="size-4 shrink-0 text-accent transition-transform duration-200 group-open:rotate-180"
            aria-hidden="true"
          />
        </summary>
        <p className="mt-2 text-[12.5px] leading-relaxed text-fg2">{analysis.rationale}</p>
        <ul className="mt-3 flex flex-col gap-2">
          {analysis.breakdown.map((dimension) => (
            <li key={dimension.id} className="flex flex-col gap-1">
              <span className="flex items-center justify-between gap-2 text-[11.5px] font-semibold text-fg2">
                {dimension.label}
                <span className="text-fg3">{dimension.score}/100</span>
              </span>
              <span
                className="h-1.5 overflow-hidden rounded-full bg-surface2"
                role="img"
                aria-label={`${dimension.label}: ${dimension.score} out of 100`}
              >
                <span className="block h-full rounded-full bg-accent" style={{ width: `${dimension.score}%` }} />
              </span>
              <span className="text-[11.5px] leading-snug text-fg3">{dimension.note}</span>
            </li>
          ))}
        </ul>
      </details>

      {/* Actions */}
      <div className="mt-auto flex flex-col gap-2 pt-1">
        <BuyButton href={item.affiliateUrl} className="w-full" />
        <div className="flex gap-2">
          <Link
            href={item.detailPath}
            className="inline-flex h-11 flex-1 items-center justify-center rounded-full border border-line px-4 text-[13px] font-bold text-fg transition-colors hover:border-line2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            View details
          </Link>
          <button
            type="button"
            onClick={() => onToggleCompare(product.asin)}
            disabled={atLimit}
            aria-pressed={selected}
            className={`inline-flex h-11 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-full border px-4 text-[13px] font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-40 ${
              selected ? 'border-accent bg-accent-soft text-accent' : 'border-line text-fg hover:border-line2'
            }`}
            title={atLimit ? `You can compare up to ${MAX_COMPARE} products at a time.` : undefined}
          >
            <AffiliateIcon
              name={selected ? 'check' : 'layers'}
              strokeWidth={2}
              className="size-4"
              aria-hidden="true"
            />
            {selected ? 'Selected' : 'Compare'}
          </button>
        </div>
      </div>
    </article>
  );
}
