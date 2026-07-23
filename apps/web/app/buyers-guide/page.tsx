import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { Footer, Header } from '@lovelytools/ui';
import { affiliateProducts } from '@/lib/affiliate-products';

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
export default function BuyersGuidePage() {
  const products = affiliateProducts;

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
              </ol>
            </nav>

            <h1 className="font-grotesk text-[clamp(32px,5vw,44px)] font-bold leading-[1.08] tracking-[-0.03em] text-fg">
              Buyer's Guide
            </h1>

            <p className="max-w-[560px] text-[17px] leading-[1.55] text-fg2">
              Hand-picked product recommendations and in-depth reviews to go with the tools you use
              every day.
            </p>

            <p className="text-[13px] text-fg3">{products.length} reviews</p>
          </div>
        </section>

        <section className="lt-container py-14">
          {products.length === 0 ? (
            <p className="text-[14.5px] text-fg2">No reviews yet — check back soon.</p>
          ) : (
            <div className="grid grid-cols-1 gap-grid sm:grid-cols-2 lg:grid-cols-3">
              {products.map((product) => (
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
                      className="h-auto w-full object-cover"
                    />
                  </div>
                  <span className="inline-flex w-fit items-center rounded-full bg-accent-soft px-2.5 py-1 text-[11.5px] font-semibold text-accent">
                    {product.categoryLabel}
                  </span>
                  <h2 className="font-grotesk text-[16px] font-bold leading-snug text-fg">
                    <span className="text-accent">{product.brand}</span> {product.name}
                  </h2>
                  <p className="text-[13px] leading-relaxed text-fg2">{product.tagline}</p>
                  <span className="mt-auto text-[13px] font-semibold text-accent">
                    Read review →
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
              itemListElement: products.map((product, i) => ({
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
