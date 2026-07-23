import Link from 'next/link';
import Image from 'next/image';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { Footer, Header } from '@lovelytools/ui';
import type { AffiliateProduct } from '@/lib/affiliate-products';
import { affiliateUrl } from '@/lib/affiliate-products';
import { AffiliateIcon } from './affiliate-icons';
import { AffiliateGallery } from './affiliate-gallery';

// Scoped to this template only — the Claude Design mock's headings are set in Plus
// Jakarta Sans, not the site-wide Space Grotesk (font-grotesk). Loaded here rather
// than in tokens/typography.css so the rest of the site (Header, Footer, every
// other page) is unaffected.
const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  variable: '--font-jakarta',
});

/**
 * AffiliateProductTemplate — matches the "Affiliate Product Page" design
 * (Claude Design export) using this site's real tokens (packages/ui/src/styles/tokens)
 * instead of the prototype's standalone token set.
 *
 * Server component throughout — no client boundary needed. The FAQ accordion uses
 * native <details>/<summary> instead of client-side state, so it stays interactive
 * with zero JS shipped.
 */
export function AffiliateProductTemplate({ product }: { product: AffiliateProduct }) {
  const url = affiliateUrl(product);
  const filledStars = Math.max(0, Math.min(5, Math.round(product.score / 2)));

  return (
    <>
      <Header />
      <main
        className={jakarta.variable}
        style={{ background: 'linear-gradient(90deg, var(--accent-soft), transparent 65%)' }}
      >
        {/* Warm accent-tinted band behind the whole page, matching the Claude Design mock's
            cream background instead of the site's neutral page bg. Runs the full page height
            down to the disclosure footer — Footer itself (site chrome) stays outside it. */}
        <div className="relative overflow-hidden">
          <div className="lt-container flex flex-col gap-10 py-12">
            {/* Breadcrumb */}
            <nav aria-label="Breadcrumb">
              <ol className="flex flex-wrap items-center gap-2 text-[13px] text-fg3">
                <li>
                  <Link href="/" className="transition-colors hover:text-fg">
                    Home
                  </Link>
                </li>
                <li aria-hidden="true" className="text-fg3">
                  ›
                </li>
                <li>
                  <Link href={product.categoryPath} className="font-semibold text-accent transition-opacity hover:opacity-80">
                    {product.categoryLabel}
                  </Link>
                </li>
                <li aria-hidden="true" className="text-fg3">
                  ›
                </li>
                <li aria-current="page" className="truncate text-fg2">
                  {product.name}
                </li>
              </ol>
            </nav>

            {/* Hero: copy / gallery / quick specs */}
            <section className="flex flex-wrap items-stretch gap-6">
              <div className="order-2 flex min-w-0 flex-1 basis-[360px] flex-col gap-4 md:order-1">
                <span className="inline-flex w-fit items-center rounded-full bg-accent-soft px-3 py-1 text-[12px] font-semibold text-accent">
                  {product.categoryLabel}
                </span>

                <h1 className="flex flex-col gap-1">
                  <span className="[font-family:var(--font-jakarta)] text-[clamp(20px,3vw,26px)] font-extrabold uppercase leading-none tracking-[0.02em] text-accent">
                    {product.brand}
                  </span>
                  <span className="[font-family:var(--font-jakarta)] text-[clamp(30px,5.5vw,42px)] font-extrabold leading-[1.08] tracking-[-0.03em] text-fg">
                    {product.name}
                  </span>
                </h1>

                <p className="[font-family:var(--font-jakarta)] text-[17px] font-bold italic leading-snug text-accent">
                  {product.tagline}
                </p>

                <p className="max-w-[52ch] text-[14.5px] leading-[1.6] text-fg2">{product.description}</p>

                <div className="mt-2 flex flex-wrap gap-3">
                  <a
                    href={url}
                    target="_blank"
                    rel="nofollow sponsored noopener"
                    className="inline-flex h-[52px] items-center gap-2 rounded-full bg-accent px-7 text-[15px] font-bold text-accent-fg transition-transform hover:scale-[1.02]"
                  >
                    <AffiliateIcon name="shopping-cart" className="size-[18px]" />
                    Check Price on Amazon →
                  </a>
                  <a
                    href={url}
                    target="_blank"
                    rel="nofollow sponsored noopener"
                    className="inline-flex h-[52px] items-center rounded-full border border-line px-7 text-[15px] font-bold text-fg transition-colors hover:border-line2"
                  >
                    View on Amazon
                  </a>
                </div>

                <div className="mt-auto grid grid-cols-2 gap-3 pt-3">
                  {product.trustBadges.map((t) => (
                    <div
                      key={t.label}
                      className="flex min-w-0 items-center gap-3 rounded-2xl border border-line bg-surface p-3.5"
                    >
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
                        <AffiliateIcon name={t.icon} className="size-5" />
                      </span>
                      <span className="flex min-w-0 flex-col gap-0.5">
                        <span className="text-[14px] font-bold leading-tight text-fg">{t.label}</span>
                        <span className="text-[12.5px] leading-tight text-fg3">{t.sublabel}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Gallery */}
              <div className="order-1 min-w-0 flex-[1.25_1_440px] md:order-2">
                <AffiliateGallery images={product.images} productName={product.name} />
              </div>

              {/* Quick specs */}
              <div className="order-3 min-w-[min(300px,100%)] flex-1 basis-[300px] self-start">
                <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-5">
                  <h2 className="[font-family:var(--font-jakarta)] text-[22px] font-extrabold text-accent">
                    Quick Specs
                  </h2>
                  <dl className="flex flex-col divide-y divide-line">
                    {product.specs.map((s) => (
                      <div key={s.label} className="flex items-center justify-between gap-3 py-3.5 text-[14px]">
                        <dt className="flex items-center gap-2.5 font-semibold text-fg">
                          <AffiliateIcon name={s.icon} className="size-5 shrink-0 text-accent" />
                          {s.label}
                        </dt>
                        <dd className="text-right text-fg3">{s.value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </div>
            </section>
          </div>

          <div className="lt-container flex flex-col gap-10 py-12">
          {/* Feature grid */}
          {product.features.length > 0 && (
            <section className="grid grid-cols-2 gap-2 rounded-2xl border border-line bg-surface p-4 sm:grid-cols-3 lg:grid-cols-6">
              {product.features.map((f, i) => (
                <div
                  key={f.title}
                  className={`flex flex-col gap-2.5 p-4 ${i % 6 !== 0 ? 'lg:border-l lg:border-line' : ''} ${i % 3 !== 0 ? 'sm:border-l sm:border-line lg:border-l' : ''}`}
                >
                  <AffiliateIcon name={f.icon} strokeWidth={2} className="size-8 text-accent" />
                  <h3 className="[font-family:var(--font-jakarta)] text-[15px] font-bold text-fg">{f.title}</h3>
                  <p className="text-[13.5px] leading-relaxed text-fg2">{f.body}</p>
                </div>
              ))}
            </section>
          )}

          {/* Verdict / pros-cons / best-for */}
          <section className="grid grid-cols-1 items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex h-full flex-col rounded-2xl border border-line bg-surface p-6">
              <h3 className="mb-4 flex items-center gap-2.5 [font-family:var(--font-jakarta)] text-[19px] font-extrabold text-fg">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-green-500 text-white">
                  <AffiliateIcon name="thumbs-up" strokeWidth={2} className="size-[15px]" />
                </span>
                Pros
              </h3>
              <ul className="flex flex-col gap-3 text-[13.5px] leading-snug text-fg2">
                {product.pros.map((p) => (
                  <li key={p} className="flex gap-2">
                    <AffiliateIcon name="check" strokeWidth={2.5} className="mt-0.5 size-[15px] shrink-0 text-green-500" />
                    {p}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex h-full flex-col rounded-2xl border border-line bg-surface p-6">
              <h3 className="mb-4 flex items-center gap-2.5 [font-family:var(--font-jakarta)] text-[19px] font-extrabold text-fg">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-danger text-white">
                  <AffiliateIcon name="thumbs-down" strokeWidth={2} className="size-[15px]" />
                </span>
                Cons
              </h3>
              <ul className="flex flex-col gap-3 text-[13.5px] leading-snug text-fg2">
                {product.cons.map((c) => (
                  <li key={c} className="flex gap-2">
                    <AffiliateIcon name="x" strokeWidth={2.5} className="mt-0.5 size-[15px] shrink-0 text-danger" />
                    {c}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex h-full flex-col items-center justify-center gap-2 rounded-2xl border border-line bg-accent-soft p-6 text-center">
              <span className="flex items-center gap-1.5 text-[12px] font-extrabold uppercase tracking-wide text-accent">
                <AffiliateIcon name="award" className="size-[13px]" />
                Our Verdict
              </span>
              <span className="[font-family:var(--font-jakarta)] text-[44px] font-extrabold leading-none text-accent">
                {product.score.toFixed(1)}
                <span className="text-[18px] font-semibold text-fg3"> / 10</span>
              </span>
              <div className="flex gap-0.5 text-accent" aria-hidden="true">
                {Array.from({ length: 5 }).map((_, i) => (
                  <AffiliateIcon
                    key={i}
                    name="star"
                    className="size-[15px]"
                    fill={i < filledStars ? 'currentColor' : 'none'}
                  />
                ))}
              </div>
              <p className="max-w-[34ch] text-[13.5px] leading-snug text-fg2">{product.verdict}</p>
            </div>

            <div className="flex flex-col gap-5">
              <div className="rounded-2xl border border-line bg-surface p-6">
                <h3 className="mb-4 flex items-center gap-2.5 [font-family:var(--font-jakarta)] text-[19px] font-extrabold text-fg">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-green-500 text-white">
                    <AffiliateIcon name="users" strokeWidth={2} className="size-[15px]" />
                  </span>
                  Best For
                </h3>
                <ul className="flex flex-col gap-3 text-[13.5px] leading-snug text-fg2">
                  {product.bestFor.map((b) => (
                    <li key={b} className="flex gap-2">
                      <AffiliateIcon name="check" strokeWidth={2.5} className="mt-0.5 size-[15px] shrink-0 text-green-500" />
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border border-line border-l-4 border-l-accent bg-surface p-6">
                <h3 className="mb-4 flex items-center gap-2.5 [font-family:var(--font-jakarta)] text-[19px] font-extrabold text-fg">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-danger text-white">
                    <AffiliateIcon name="alert-triangle" strokeWidth={2} className="size-[14px]" />
                  </span>
                  Not Ideal For
                </h3>
                <ul className="flex flex-col gap-3 text-[13.5px] leading-snug text-fg2">
                  {product.notIdealFor.map((n) => (
                    <li key={n} className="flex gap-2">
                      <AffiliateIcon name="x" strokeWidth={2.5} className="mt-0.5 size-[15px] shrink-0 text-danger" />
                      {n}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          {/* Price box + FAQ */}
          <section className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[1fr_1.45fr]">
            <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-6">
              <h3 className="[font-family:var(--font-jakarta)] text-[22px] font-extrabold leading-tight text-fg">
                Check Latest Price on Amazon
              </h3>
              <p className="text-[13px] leading-relaxed text-fg3">
                Prices change frequently. Click below to see the most up-to-date price.
              </p>
              <a
                href={url}
                target="_blank"
                rel="nofollow sponsored noopener"
                className="mt-1 inline-flex h-[52px] w-full items-center justify-center gap-2 rounded-full bg-accent px-6 text-[15px] font-bold text-accent-fg transition-transform hover:scale-[1.01]"
              >
                <AffiliateIcon name="shopping-cart" className="size-[18px]" />
                Check Price on Amazon →
              </a>

              <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line pt-4 text-[12.5px] text-fg2">
                <span className="flex items-center gap-1.5">
                  <AffiliateIcon name="lock" className="size-4 text-accent" />
                  Secure Checkout
                </span>
                <span className="flex items-center gap-1.5">
                  <AffiliateIcon name="truck" className="size-4 text-accent" />
                  Fast Shipping
                </span>
                <span className="flex items-center gap-1.5">
                  <AffiliateIcon name="refresh-ccw" className="size-4 text-accent" />
                  Easy Returns
                </span>
              </div>
              <span className="flex items-center gap-1.5 text-[12.5px] text-fg2">
                <AffiliateIcon name="shield-check" className="size-4 text-accent" />
                Amazon Guarantee
              </span>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="[font-family:var(--font-jakarta)] text-xl font-bold tracking-[-0.02em] text-fg">
                  Frequently Asked Questions
                </h2>
                <a href="#faq" className="shrink-0 text-[13px] font-semibold text-accent hover:opacity-80">
                  View All FAQs →
                </a>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {product.faq.map((item) => (
                  <details
                    key={item.q}
                    className="group rounded-xl border border-line bg-surface p-4 open:pb-4 [&_summary::-webkit-details-marker]:hidden"
                  >
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[13.5px] font-bold text-fg">
                      {item.q}
                      <AffiliateIcon
                        name="chevron-down"
                        className="size-[16px] shrink-0 text-accent transition-transform duration-200 group-open:rotate-180"
                      />
                    </summary>
                    <p className="mt-2 text-[13px] leading-relaxed text-fg2">{item.a}</p>
                  </details>
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
