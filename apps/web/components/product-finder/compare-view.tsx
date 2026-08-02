'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { AffiliateIcon } from '@/components/templates/affiliate-icons';
import type { DiscoveryResult, FinderProduct } from '@/lib/product-finder/discovery-service';
import { BuyButton, PriceTag, readCachedResult, ScoreDial, Stars } from './finder-shared';

/**
 * Side-by-side comparison of 2–3 shortlisted products.
 *
 * Loads from the sessionStorage hand-off when the user arrived by clicking
 * Compare, and re-fetches from /api/product-finder/lookup otherwise — so a
 * shared or bookmarked comparison URL works in a cold session.
 */
export function CompareView() {
  const params = useSearchParams();
  const asins = useMemo(
    () =>
      (params.get('asins') ?? '')
        .split(',')
        .map((a) => a.trim().toUpperCase())
        .filter(Boolean)
        .slice(0, 3),
    [params],
  );
  const marketplace = params.get('market') ?? 'amazon.co.uk';

  const [items, setItems] = useState<FinderProduct[] | null>(null);
  const [verdict, setVerdict] = useState<DiscoveryResult['comparison']>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (asins.length === 0) {
      setError('No products were selected. Go back and pick two or three to compare.');
      return;
    }

    let cancelled = false;

    const cached = readCachedResult();
    const fromCache = cached?.results.filter((r) => asins.includes(r.product.asin.toUpperCase())) ?? [];
    if (fromCache.length === asins.length) {
      setItems(fromCache);
      setVerdict(cached?.comparison ?? null);
      return;
    }

    void (async () => {
      try {
        const response = await fetch('/api/product-finder/lookup', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ asins, marketplace }),
        });
        const payload = (await response.json()) as DiscoveryResult & { error?: string };
        if (cancelled) return;

        if (!response.ok) {
          setError(payload.error ?? 'Could not load those products.');
          return;
        }
        setItems(payload.results);
        setVerdict(payload.comparison);
      } catch {
        if (!cancelled) setError('Could not load those products. Check your connection and try again.');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [asins, marketplace]);

  if (error) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-2xl border border-line border-l-4 border-l-danger bg-surface p-6">
        <h2 className="flex items-center gap-2.5 font-grotesk text-[17px] font-bold text-fg">
          <AffiliateIcon name="alert-triangle" strokeWidth={2} className="size-5 text-danger" aria-hidden="true" />
          Nothing to compare
        </h2>
        <p className="max-w-[60ch] text-[14px] leading-relaxed text-fg2">{error}</p>
        <Link
          href="/product-finder"
          className="rounded-full bg-accent px-5 py-2.5 text-[13px] font-bold text-accent-fg transition-transform hover:scale-[1.02]"
        >
          Back to the finder
        </Link>
      </div>
    );
  }

  if (!items) {
    return (
      <div className="flex animate-pulse flex-col gap-4">
        <div className="h-8 w-1/3 rounded-full bg-surface2" />
        <div className="h-[420px] rounded-2xl bg-surface2" />
      </div>
    );
  }

  return <ComparisonGrid items={items} verdict={verdict} />;
}

/** Winner / budget / premium / value callouts, above the detail grid. */
function VerdictRow({
  items,
  verdict,
}: {
  items: FinderProduct[];
  verdict: DiscoveryResult['comparison'];
}) {
  if (!verdict) return null;

  const nameOf = (asin: string | null) => {
    if (!asin) return null;
    const match = items.find((i) => i.product.asin === asin);
    return match ? `${match.product.brand} ${match.product.name}` : null;
  };

  const cards: { icon: 'award' | 'badge-check' | 'star' | 'shield-check'; label: string; name: string | null }[] = [
    { icon: 'award', label: 'Winner', name: nameOf(verdict.winnerAsin) },
    { icon: 'badge-check', label: 'Best value', name: nameOf(verdict.bestValueAsin) },
    { icon: 'star', label: 'Best budget', name: nameOf(verdict.bestBudgetAsin) },
    { icon: 'shield-check', label: 'Best premium', name: nameOf(verdict.bestPremiumAsin) },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className={`flex flex-col gap-2 rounded-2xl border p-4 ${
              card.label === 'Winner' ? 'border-accent bg-accent-soft' : 'border-line bg-surface'
            }`}
          >
            <span className="flex items-center gap-2 text-[11.5px] font-extrabold uppercase tracking-wide text-accent">
              <AffiliateIcon name={card.icon} className="size-[13px]" aria-hidden="true" />
              {card.label}
            </span>
            <span className="text-[13.5px] font-semibold leading-snug text-fg">
              {card.name ?? <span className="font-normal text-fg3">Not enough price data to call this</span>}
            </span>
          </div>
        ))}
      </div>
      <p className="max-w-[80ch] text-[14px] leading-relaxed text-fg2">{verdict.summary}</p>
    </div>
  );
}

function ComparisonGrid({
  items,
  verdict,
}: {
  items: FinderProduct[];
  verdict: DiscoveryResult['comparison'];
}) {
  // Union of every specification label across the set, so a spec one product
  // publishes and another doesn't still gets a row (with an honest "—").
  const specLabels = useMemo(() => {
    const seen = new Map<string, string>();
    for (const item of items) {
      for (const spec of item.product.specifications) {
        const key = spec.label.toLowerCase();
        if (!seen.has(key)) seen.set(key, spec.label);
      }
    }
    return [...seen.values()].slice(0, 12);
  }, [items]);

  const specValue = (item: FinderProduct, label: string) =>
    item.product.specifications.find((s) => s.label.toLowerCase() === label.toLowerCase())?.value ?? '—';

  const columns = `minmax(150px, 180px) repeat(${items.length}, minmax(230px, 1fr))`;

  return (
    <div className="flex flex-col gap-8">
      <VerdictRow items={items} verdict={verdict} />

      {/* The grid can exceed the viewport on phones — it scrolls inside its own
          box so the page body never scrolls sideways. */}
      <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
        <div className="min-w-[640px]">
          {/* Header row: image + identity + actions */}
          <div className="grid items-stretch border-b border-line" style={{ gridTemplateColumns: columns }}>
            <div className="p-4 text-[12px] font-bold uppercase tracking-wide text-fg3">Product</div>
            {items.map((item) => (
              <div key={item.product.asin} className="flex flex-col gap-3 border-l border-line p-4">
                <div className="overflow-hidden rounded-xl border border-line bg-surface2">
                  <Image
                    src={item.product.images[0] ?? ''}
                    alt={`${item.product.brand} ${item.product.name}`}
                    width={320}
                    height={200}
                    unoptimized
                    className="h-[130px] w-full object-contain p-3"
                  />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-accent">
                  {item.product.brand}
                </span>
                <h2 className="font-grotesk text-[14px] font-bold leading-snug text-fg">{item.product.name}</h2>
                <div className="mt-auto flex flex-col gap-2 pt-1">
                  <BuyButton href={item.affiliateUrl} className="w-full" />
                  <Link
                    href={item.detailPath}
                    className="inline-flex h-10 items-center justify-center rounded-full border border-line px-4 text-[12.5px] font-bold text-fg transition-colors hover:border-line2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  >
                    View product
                  </Link>
                </div>
              </div>
            ))}
          </div>

          <Row label="AI score" columns={columns}>
            {items.map((item) => (
              <Cell key={item.product.asin}>
                <span className="flex items-center gap-3">
                  <ScoreDial score={item.analysis.aiScore} size={44} />
                  <span className="text-[12.5px] font-semibold text-fg2">{item.analysis.headline}</span>
                </span>
              </Cell>
            ))}
          </Row>

          <Row label="Price" columns={columns}>
            {items.map((item) => (
              <Cell key={item.product.asin}>
                <PriceTag
                  price={item.product.price}
                  originalPrice={item.product.originalPrice}
                  discountPercent={item.product.discountPercent}
                />
              </Cell>
            ))}
          </Row>

          <Row label="Rating" columns={columns}>
            {items.map((item) => (
              <Cell key={item.product.asin}>
                <Stars rating={item.product.rating} reviewCount={item.product.reviewCount} />
              </Cell>
            ))}
          </Row>

          <Row label="Delivery & stock" columns={columns}>
            {items.map((item) => (
              <Cell key={item.product.asin}>
                <span className="text-[12.5px] text-fg2">
                  {item.product.delivery.text ??
                    (item.product.delivery.free === true ? 'Free delivery' : 'Delivery shown on Amazon')}
                  {' · '}
                  {item.product.availability === 'in_stock'
                    ? 'In stock'
                    : item.product.availability === 'out_of_stock'
                      ? 'Out of stock'
                      : 'Stock confirmed on Amazon'}
                </span>
              </Cell>
            ))}
          </Row>

          <Row label="Why it scored this" columns={columns}>
            {items.map((item) => (
              <Cell key={item.product.asin}>
                <ul className="flex flex-col gap-2">
                  {item.analysis.breakdown.map((dimension) => (
                    <li key={dimension.id} className="flex flex-col gap-1">
                      <span className="flex items-center justify-between gap-2 text-[11.5px] font-semibold text-fg2">
                        {dimension.label}
                        <span className="text-fg3">{dimension.score}</span>
                      </span>
                      <span className="h-1.5 overflow-hidden rounded-full bg-surface2">
                        <span className="block h-full rounded-full bg-accent" style={{ width: `${dimension.score}%` }} />
                      </span>
                    </li>
                  ))}
                </ul>
              </Cell>
            ))}
          </Row>

          {specLabels.map((label) => (
            <Row key={label} label={label} columns={columns}>
              {items.map((item) => (
                <Cell key={item.product.asin}>
                  <span className="text-[12.5px] text-fg2">{specValue(item, label)}</span>
                </Cell>
              ))}
            </Row>
          ))}

          <Row label="Pros" columns={columns}>
            {items.map((item) => (
              <Cell key={item.product.asin}>
                <ul className="flex flex-col gap-1.5">
                  {item.analysis.pros.map((pro) => (
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
              </Cell>
            ))}
          </Row>

          <Row label="Cons" columns={columns} last>
            {items.map((item) => (
              <Cell key={item.product.asin}>
                <ul className="flex flex-col gap-1.5">
                  {item.analysis.cons.map((con) => (
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
              </Cell>
            ))}
          </Row>
        </div>
      </div>

      <p className="border-t border-line pt-5 text-[12px] text-fg3">
        As an Amazon Associate, lovelytools.ai earns from qualifying purchases. Prices and availability change
        frequently — the figures above are from the last check, and the buttons open the live listing.
      </p>
    </div>
  );
}

function Row({
  label,
  columns,
  last = false,
  children,
}: {
  label: string;
  columns: string;
  last?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`grid items-start ${last ? '' : 'border-b border-line'}`}
      style={{ gridTemplateColumns: columns }}
    >
      <div className="p-4 text-[12px] font-bold uppercase tracking-wide text-fg3">{label}</div>
      {children}
    </div>
  );
}

const Cell = ({ children }: { children: React.ReactNode }) => (
  <div className="border-l border-line p-4">{children}</div>
);
