import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { Footer, Header } from '@lovelytools/ui';
import { CompareView } from '@/components/product-finder/compare-view';

export const metadata: Metadata = {
  title: { absolute: 'Compare products — Amazon Product Finder | lovelytools.ai' },
  description: 'Compare up to three shortlisted Amazon products side by side: price, rating, AI score, specs, pros and cons.',
  alternates: { canonical: '/product-finder/compare' },
  // The comparison depends entirely on query params, so there is no stable
  // canonical page for a crawler to index.
  robots: { index: false, follow: true },
};

/**
 * /product-finder/compare?asins=…&market=… — side-by-side comparison.
 *
 * The island reads its selection from the query string, so a comparison can be
 * copied, shared or bookmarked. `useSearchParams` forces a Suspense boundary;
 * the fallback matches the island's own skeleton so nothing shifts.
 */
export default function ComparePage() {
  return (
    <>
      <Header />
      <main>
        <section className="relative overflow-hidden border-b border-line">
          <div aria-hidden="true" className="lt-grid-bg absolute inset-0" />
          <div className="lt-container relative flex flex-col gap-5 py-14">
            <nav aria-label="Breadcrumb">
              <ol className="flex flex-wrap items-center gap-2 text-[12.5px] text-fg3">
                <li>
                  <Link href="/" className="transition-colors hover:text-fg">
                    Home
                  </Link>
                </li>
                <li aria-hidden="true">·</li>
                <li>
                  <Link href="/product-finder" className="transition-colors hover:text-fg">
                    Amazon Product Finder
                  </Link>
                </li>
                <li aria-hidden="true">·</li>
                <li aria-current="page" className="text-fg2">
                  Compare
                </li>
              </ol>
            </nav>

            <h1 className="font-grotesk text-[clamp(28px,4.5vw,40px)] font-bold leading-[1.08] tracking-[-0.03em] text-fg">
              Side by side
            </h1>
            <p className="max-w-[560px] text-[17px] leading-[1.55] text-fg2">
              The same shortlist, laid out row by row — so the differences that matter are the ones you can actually
              see.
            </p>
          </div>
        </section>

        <section className="lt-container py-12">
          <Suspense
            fallback={
              <div className="flex animate-pulse flex-col gap-4">
                <div className="h-8 w-1/3 rounded-full bg-surface2" />
                <div className="h-[420px] rounded-2xl bg-surface2" />
              </div>
            }
          >
            <CompareView />
          </Suspense>
        </section>
      </main>
      <Footer />
    </>
  );
}
