import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { Footer, Header } from '@lovelytools/ui';
import {
  affiliateProducts,
  affiliateCategories,
  type AffiliateProduct,
} from '@/lib/affiliate-products';
import { listDiscovered } from '@/lib/product-finder/discovered-store';

export const metadata: Metadata = {
  title: "Buyer's Guide — hand-picked product reviews | lovelytools.ai",
  description:
    'Hand-picked product recommendations and in-depth reviews, alongside our free browser tools.',
  alternates: { canonical: '/buyers-guide' },
};

/**
 * Buyer's Guide hub — lists every affiliate product review, the same shape as
 * a category hub (CategoryTemplate) but reading from the affiliate product
 * store instead of the tool registry. Pure RSC.
 */
export default async function BuyersGuidePage({
  searchParams,
}: {
  searchParams?: Promise<{ category?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const activeSlug = resolvedSearchParams?.category;
  const activeCategory = affiliateCategories.find((c) => c.slug === activeSlug);

  // Hand-written reviews first, then whatever the Product Finder has
  // auto-published. Curated entries always lead: they are the ones with a real
  // verdict behind them, and a machine-generated card should never outrank one
  // just because it was discovered more recently.
  const discovered = await listDiscovered();
  const curatedSlugs = new Set(affiliateProducts.map((p) => p.slug));

  const entries: { product: AffiliateProduct; generated: boolean }[] = [
    ...affiliateProducts.map((product) => ({ product, generated: false })),
    ...discovered
      .filter((d) => !curatedSlugs.has(d.slug))
      .map((d) => ({ product: d.product, generated: true })),
  ];

  // Only chip categories that hold something. The category list is a closed set
  // the Product Finder's categoriser picks from, so most of it is empty at any
  // given moment — showing all twenty would be a wall of dead filters.
  const usedLabels = new Set(entries.map((e) => e.product.categoryLabel));
  const visibleCategories = affiliateCategories.filter((c) => usedLabels.has(c.label));

  const products = activeCategory
    ? entries.filter((e) => e.product.categoryLabel === activeCategory.label)
    : entries;

  return (
    <>
      <Header />
      <main>
        <section className="relative overflow-hidden border-b border-line">
          <div aria-hidden="true" className="lt-grid-bg absolute inset-0" />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-32 top-0 size-[420px] rounded-full opacity-20 blur-[120px]"
            style={{ background: 'var(--accent)' }}
          />
          <div className="lt-container relative flex flex-col gap-5 py-16">
            <nav aria-label="Breadcrumb">
              <ol className="flex items-center gap-2 text-[12.5px] text-fg3">
                <li>
                  <Link href="/" className="transition-colors hover:text-fg">
                    Home
                  </Link>
                </li>
                <li aria-hidden="true">·</li>
                <li aria-current="page" className="text-fg2">
                  Buyer's Guide
                </li>
                {activeCategory ? (
                  <>
                    <li aria-hidden="true">·</li>
                    <li aria-current="page" className="text-fg2">
                      {activeCategory.label}
                    </li>
                  </>
                ) : null}
              </ol>
            </nav>

            <h1 className="font-grotesk text-[clamp(32px,5vw,44px)] font-bold leading-[1.08] tracking-[-0.03em] text-fg">
              {activeCategory ? activeCategory.label : "Buyer's Guide"}
            </h1>

            <p className="max-w-[560px] text-[17px] leading-[1.55] text-fg2">
              Hand-picked product recommendations and in-depth reviews to go with the tools you use
              every day.
            </p>

            <p className="text-[13px] text-fg3">
              {products.length} {products.length === 1 ? 'review' : 'reviews'}
            </p>

            <div className="flex flex-wrap gap-2 pt-2">
              <Link
                href="/buyers-guide"
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-[13px] font-semibold transition-colors ${
                  !activeCategory
                    ? 'border-accent bg-accent-soft text-accent'
                    : 'border-line bg-surface text-fg2 hover:border-line2 hover:text-fg'
                }`}
              >
                All
              </Link>
              {visibleCategories.map((category) => (
                <Link
                  key={category.slug}
                  href={`/buyers-guide?category=${category.slug}`}
                  className={`inline-flex items-center rounded-full border px-3 py-1.5 text-[13px] font-semibold transition-colors ${
                    activeCategory?.slug === category.slug
                      ? 'border-accent bg-accent-soft text-accent'
                      : 'border-line bg-surface text-fg2 hover:border-line2 hover:text-fg'
                  }`}
                >
                  {category.label}
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Featured tool — the Buyer's Guide answers "which one should I buy?"
            for products we have already reviewed; the finder answers it for
            everything else, so it belongs at the top of this page. */}
        <section className="lt-container pt-12">
          <Link
            href="/product-finder"
            className="group flex flex-col gap-4 rounded-2xl border border-line p-6 transition-[transform,border-color] duration-[180ms] ease-out hover:-translate-y-[2px] hover:border-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:flex-row sm:items-center sm:justify-between"
            style={{ background: 'linear-gradient(135deg, var(--accent-soft), transparent 70%)' }}
          >
            <span className="flex flex-col gap-2">
              <span className="font-grotesk text-[11px] font-semibold uppercase tracking-[0.13em] text-accent">
                Featured tool
              </span>
              <span className="font-grotesk text-[20px] font-bold tracking-[-0.02em] text-fg">
                Amazon Product Finder
              </span>
              <span className="max-w-[60ch] text-[14px] leading-[1.55] text-fg2">
                Not reviewed here yet? Describe what you need — or paste an Amazon link — and get the three strongest
                options scored out of 100, with pros, cons, quick specs and a side-by-side comparison.
              </span>
            </span>
            <span className="inline-flex h-12 shrink-0 items-center justify-center rounded-full bg-accent px-6 text-[14px] font-bold text-accent-fg transition-transform group-hover:scale-[1.03]">
              Launch Amazon Product Finder →
            </span>
          </Link>
        </section>

        <section className="lt-container py-14">
          {products.length === 0 ? (
            <p className="text-[14.5px] text-fg2">
              {activeCategory
                ? `No reviews in ${activeCategory.label} yet — check back soon.`
                : 'No reviews yet — check back soon.'}
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-grid sm:grid-cols-2 lg:grid-cols-3">
              {products.map(({ product, generated }) => (
                <Link
                  key={product.slug}
                  href={`/products/${product.slug}`}
                  className="group flex flex-col gap-3 rounded-xl border border-line bg-surface p-4 transition-[transform,border-color] duration-[180ms] ease-out hover:-translate-y-[3px] hover:border-line2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:scale-[0.98] md:active:scale-100"
                >
                  <div className="overflow-hidden rounded-xl border border-line bg-surface2">
                    <Image
                      src={product.images[0]}
                      alt={product.name}
                      width={440}
                      height={280}
                      // Auto-published entries carry remote Amazon imagery,
                      // which is a product cut-out on a plain background rather
                      // than a framed 440×280 photo — so it is contained, not
                      // cropped. The 4:3 box gives a square cut-out roughly the
                      // same visual mass as a curated card's landscape photo;
                      // the old fixed 180px height made them look shrunken next
                      // to hand-written entries.
                      className={
                        generated
                          ? 'aspect-[4/3] w-full object-contain p-2'
                          : 'h-auto w-full object-cover'
                      }
                    />
                  </div>
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex w-fit items-center rounded-full bg-accent-soft px-2.5 py-1 text-[11.5px] font-semibold text-accent">
                      {product.categoryLabel}
                    </span>
                    {/* Labelled, not disguised. A visitor should be able to tell
                        a written review from a machine-generated listing before
                        they click, and so should we when pruning these. */}
                    {generated && (
                      <span className="inline-flex w-fit items-center rounded-full border border-line px-2.5 py-1 text-[11.5px] font-semibold text-fg3">
                        Auto-listed
                      </span>
                    )}
                  </span>
                  <h2 className="font-grotesk text-[16px] font-bold leading-snug text-fg">
                    <span className="text-accent">{product.brand}</span> {product.name}
                  </h2>
                  <p className="text-[13px] leading-relaxed text-fg2">{product.tagline}</p>
                  <span className="mt-auto text-[13px] font-semibold text-accent">
                    {generated ? 'See the analysis →' : 'Read review →'}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
      <Footer />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: "Buyer's Guide",
            description: metadata.description,
            mainEntity: {
              '@type': 'ItemList',
              numberOfItems: products.length,
              itemListElement: products.map(({ product }, i) => ({
                '@type': 'ListItem',
                position: i + 1,
                name: `${product.brand} ${product.name}`,
                url: `https://lovelytools.ai/products/${product.slug}`,
              })),
            },
          }),
        }}
      />
    </>
  );
}
