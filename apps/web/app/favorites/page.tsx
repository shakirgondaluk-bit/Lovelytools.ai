import type { Metadata } from 'next';
import Link from 'next/link';
import { Footer, Header } from '@lovelytools/ui';
import { FavoritesGrid } from '@/components/favorites-grid';

export const metadata: Metadata = {
  title: { absolute: 'My Favorite Tools | lovelytools.ai' },
  description:
    'The tools you have hearted, in one place. Saved on your device — no account, no sync, nothing uploaded.',
  alternates: { canonical: '/favorites' },
  // Personal and client-rendered: a crawler sees an empty list, so there is nothing
  // here worth indexing. Deliberately absent from sitemap.ts for the same reason.
  robots: { index: false, follow: true },
};

/**
 * /favorites — "My Favorite Tools".
 *
 * A static route, so it takes precedence over the registry's flat [slug] namespace
 * without needing a registry entry (it is not a tool, category or collection, and
 * adding it as one would corrupt the derived "N categories" counts the homepage
 * renders).
 */
export default function FavoritesPage() {
  return (
    <>
      <Header />
      <main>
        <section className="relative overflow-hidden border-b border-line">
          <div aria-hidden="true" className="lt-grid-bg absolute inset-0" />
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
                  My Favorite Tools
                </li>
              </ol>
            </nav>

            <h1 className="max-w-[760px] font-grotesk text-[clamp(32px,5vw,44px)] font-bold leading-[1.08] tracking-[-0.03em] text-fg">
              My Favorite Tools
            </h1>
            <p className="max-w-[560px] text-[17px] leading-[1.55] text-fg2">
              Everything you&rsquo;ve hearted, grouped by category. Kept in this
              browser&rsquo;s storage — not on a server, and not tied to an account.
            </p>
          </div>
        </section>

        <FavoritesGrid />
      </main>
      <Footer />
    </>
  );
}
