import type { Metadata } from 'next';
import Link from 'next/link';
import { Footer, Header } from '@lovelytools/ui';
import { ProductFinderView } from '@/components/product-finder/finder-view';

export const metadata: Metadata = {
  title: { absolute: 'Amazon Product Finder — AI-ranked picks | lovelytools.ai' },
  description:
    'Paste an Amazon link or describe what you need. We shortlist the three best matches, score each one 0–100 across six weighted signals, and show the reasoning behind every rank.',
  alternates: { canonical: '/product-finder' },
  openGraph: {
    title: 'Amazon Product Finder — AI-ranked picks',
    description:
      'Search by keyword or Amazon link, get the top three ranked with pros, cons, quick specs and a side-by-side comparison.',
    url: '/product-finder',
    type: 'website',
  },
};

/**
 * /product-finder — the finder's entry point.
 *
 * RSC shell (hero, chrome, structured data) with a single client island for the
 * interactive part, so the page is server-rendered and indexable while the
 * search stays interactive. No new layout: it reuses the site's standard hero
 * band, container, Header and Footer.
 */
export default function ProductFinderPage() {
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
                <li>
                  <Link href="/buyers-guide" className="transition-colors hover:text-fg">
                    Recommended Products
                  </Link>
                </li>
                <li aria-hidden="true">·</li>
                <li aria-current="page" className="text-fg2">
                  Amazon Product Finder
                </li>
              </ol>
            </nav>

            <h1 className="max-w-[760px] font-grotesk text-[clamp(32px,5vw,44px)] font-bold leading-[1.08] tracking-[-0.03em] text-fg">
              Amazon Product Finder
            </h1>
            <p className="max-w-[620px] text-[17px] leading-[1.55] text-fg2">
              Describe what you need, or paste an Amazon link. We shortlist the three strongest options, score each
              one out of 100, and show exactly why it landed where it did.
            </p>
          </div>
        </section>

        <section className="lt-container py-12">
          <ProductFinderView />
        </section>
      </main>
      <Footer />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebApplication',
            name: 'Amazon Product Finder',
            applicationCategory: 'ShoppingApplication',
            url: 'https://lovelytools.ai/product-finder',
            description: metadata.description,
            offers: { '@type': 'Offer', price: '0', priceCurrency: 'GBP' },
          }),
        }}
      />
    </>
  );
}
