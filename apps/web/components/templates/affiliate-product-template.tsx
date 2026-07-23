import Link from 'next/link';
import Image from 'next/image';
import { Footer, Header } from '@lovelytools/ui';
import type { AffiliateProduct } from '@/lib/affiliate-products';
import { affiliateUrl } from '@/lib/affiliate-products';

/**
 * AffiliateProductTemplate — matches the "Affiliate Product Page" design
 * (Claude Design export) using this site's real tokens (packages/ui/src/styles/tokens)
 * instead of the prototype's standalone token set.
 *
 * Server component throughout — no client boundary needed, nothing here is
 * interactive beyond plain links.
 */
export function AffiliateProductTemplate({ product }: { product: AffiliateProduct }) {
  const url = affiliateUrl(product);

  return (
    <>
      <Header />
      <main>
        <div className="lt-container flex flex-col gap-10 py-12">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb">
            <ol className="flex flex-wrap items-center gap-2 text-[12.5px] text-fg3">
              <li>
                <Link href="/" className="transition-colors hover:text-fg">
                  Home
                </Link>
              </li>
              <li aria-hidden="true">·</li>
              <li>
                <Link href={product.categoryPath} className="transition-colors hover:text-fg">
                  {product.categoryLabel}
                </Link>
              </li>
              <li aria-hidden="true">·</li>
              <li aria-current="page" className="text-fg2">
                {product.name}
              </li>
            </ol>
          </nav>

          {/* Hero: copy / gallery / quick specs */}
          <section className="flex flex-wrap items-stretch gap-6">
            <div className="flex min-w-0 flex-1 basis-[360px] flex-col gap-4">
              <span className="inline-flex w-fit items-center rounded-full bg-accent-soft px-3 py-1 text-[12px] font-semibold text-accent">
                {product.categoryLabel}
              </span>

              <h1 className="font-grotesk text-[clamp(30px,5.5vw,42px)] font-extrabold leading-[1.08] tracking-[-0.03em] text-fg">
                <span className="text-accent">{product.brand}</span> {product.name}
              </h1>

              <p className="font-grotesk text-[17px] font-bold italic leading-snug text-accent">
                {product.tagline}
              </p>

              <p className="max-w-[52ch] text-[14.5px] leading-[1.6] text-fg2">{product.description}</p>

              <div className="mt-2 flex flex-wrap gap-3">
                <a
                  href={url}
                  target="_blank"
                  rel="nofollow sponsored noopener"
                  className="inline-flex h-12 items-center gap-2 rounded-full bg-accent px-6 text-[14.5px] font-bold text-accent-fg transition-transform hover:scale-[1.02]"
                >
                  Check Price on Amazon →
                </a>
                <a
                  href={url}
                  target="_blank"
                  rel="nofollow sponsored noopener"
                  className="inline-flex h-12 items-center rounded-full border border-line px-6 text-[14.5px] font-bold text-fg transition-colors hover:border-border2"
                >
                  View on Amazon
                </a>
              </div>

              <div className="mt-auto grid grid-cols-2 gap-3 pt-3 sm:grid-cols-4">
                {product.trustBadges.map((t) => (
                  <div
                    key={t.label}
                    className="flex flex-col items-center gap-1 rounded-xl border border-line bg-surface px-3 py-3 text-center"
                  >
                    <span className="text-[13px] font-bold text-fg">{t.label}</span>
                    <span className="text-[11.5px] text-fg3">{t.sublabel}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Gallery */}
            <div className="relative min-w-0 flex-[1.25_1_440px]">
              {product.awardBadge && (
                <div className="absolute -top-3 right-2 z-10 flex h-[70px] w-[70px] flex-col items-center justify-center rounded-full bg-accent text-center leading-tight text-accent-fg shadow-[var(--card-shadow)]">
                  <span className="text-[10px] font-extrabold">{product.awardBadge.line1}</span>
                  <span className="text-[10px] font-extrabold">{product.awardBadge.line2}</span>
                </div>
              )}
              <div className="overflow-hidden rounded-2xl border border-line bg-surface">
                <Image
                  src={product.images[0]}
                  alt={product.name}
                  width={880}
                  height={560}
                  className="h-auto w-full object-cover"
                  priority
                />
              </div>
              {product.images.length > 1 && (
                <div className="mt-3 grid grid-cols-4 gap-2">
                  {product.images.slice(1, 5).map((src, i) => (
                    <div key={src} className="overflow-hidden rounded-lg border border-line bg-surface">
                      <Image src={src} alt={`${product.name} ${i + 2}`} width={200} height={140} className="h-auto w-full object-cover" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick specs */}
            <div className="min-w-[min(300px,100%)] flex-1 basis-[300px]">
              <div className="flex h-full flex-col gap-3 rounded-2xl border border-line bg-surface p-5">
                <h2 className="font-grotesk text-[14px] font-extrabold uppercase tracking-wide text-fg">Quick Specs</h2>
                <dl className="flex flex-col divide-y divide-border">
                  {product.specs.map((s) => (
                    <div key={s.label} className="flex items-center justify-between gap-3 py-2.5 text-[13.5px]">
                      <dt className="text-fg3">{s.label}</dt>
                      <dd className="text-right font-semibold text-fg">{s.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          </section>

          {/* Feature grid */}
          {product.features.length > 0 && (
            <section className="grid grid-cols-1 gap-2 rounded-2xl border border-line bg-surface p-4 sm:grid-cols-2 lg:grid-cols-3">
              {product.features.map((f, i) => (
                <div
                  key={f.title}
                  className={`flex flex-col gap-2 p-4 ${i % 3 !== 0 ? 'sm:border-l sm:border-line' : ''}`}
                >
                  <h3 className="font-grotesk text-[15px] font-bold text-fg">{f.title}</h3>
                  <p className="text-[13.5px] leading-relaxed text-fg2">{f.body}</p>
                </div>
              ))}
            </section>
          )}

          {/* Verdict / pros-cons / best-for */}
          <section className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-[1.9fr_1fr_1.35fr]">
            <div className="rounded-2xl border border-line bg-surface p-6">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <h3 className="text-[13px] font-extrabold uppercase tracking-wide text-green">Pros</h3>
                  <ul className="flex flex-col gap-2 text-[13.5px] text-fg2">
                    {product.pros.map((p) => (
                      <li key={p} className="flex gap-2">
                        <span className="text-green">+</span>
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex flex-col gap-2">
                  <h3 className="text-[13px] font-extrabold uppercase tracking-wide text-error">Cons</h3>
                  <ul className="flex flex-col gap-2 text-[13.5px] text-fg2">
                    {product.cons.map((c) => (
                      <li key={c} className="flex gap-2">
                        <span className="text-error">−</span>
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-line bg-accent-soft p-6 text-center">
              <span className="text-[12px] font-extrabold uppercase tracking-wide text-accent">Our Verdict</span>
              <span className="font-grotesk text-[40px] font-extrabold text-fg">{product.score.toFixed(1)}</span>
              <p className="max-w-[34ch] text-[13.5px] leading-snug text-fg2">{product.verdict}</p>
            </div>

            <div className="flex flex-col gap-5">
              <div className="flex-1 rounded-2xl border border-line bg-green-soft p-5">
                <h3 className="mb-2 text-[13px] font-extrabold uppercase tracking-wide text-green">Best For</h3>
                <ul className="flex flex-col gap-1.5 text-[13.5px] text-fg2">
                  {product.bestFor.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border border-line bg-surface2 p-5">
                <h3 className="mb-2 text-[13px] font-extrabold uppercase tracking-wide text-fg3">Not Ideal For</h3>
                <ul className="flex flex-col gap-1.5 text-[13.5px] text-fg2">
                  {product.notIdealFor.map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          {/* Price box + FAQ */}
          <section className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[1fr_1.45fr]">
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-line bg-surface p-6 text-center">
              <h3 className="font-grotesk text-[16px] font-extrabold text-fg">Check Latest Price on Amazon</h3>
              <p className="text-[13px] text-fg3">Prices change frequently. Click below to see the most up-to-date price.</p>
              <a
                href={url}
                target="_blank"
                rel="nofollow sponsored noopener"
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-accent px-6 text-[14.5px] font-bold text-accent-fg"
              >
                Check Price on Amazon →
              </a>
            </div>

            <div className="flex flex-col gap-4">
              <h2 className="font-grotesk text-xl font-bold tracking-[-0.02em] text-fg">Frequently Asked Questions</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {product.faq.map((item) => (
                  <div key={item.q} className="rounded-xl border border-line bg-surface p-4">
                    <h3 className="mb-1.5 text-[13.5px] font-bold text-fg">{item.q}</h3>
                    <p className="text-[13px] leading-relaxed text-fg2">{item.a}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Affiliate disclosure */}
          <footer className="border-t border-line pt-5 text-[12px] text-fg3">
            As an Amazon Associate, lovelytools.ai earns from qualifying purchases. Links on this page may earn us a
            commission at no extra cost to you.
          </footer>
        </div>
      </main>
      <Footer />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Product',
            name: `${product.brand} ${product.name}`,
            description: product.description,
            image: product.images,
            review: {
              '@type': 'Review',
              reviewRating: { '@type': 'Rating', ratingValue: product.score, bestRating: 10 },
              author: { '@type': 'Organization', name: 'lovelytools.ai' },
            },
            offers: {
              '@type': 'Offer',
              url,
              priceCurrency: 'GBP',
              availability: 'https://schema.org/InStock',
            },
          }),
        }}
      />
    </>
  );
}
