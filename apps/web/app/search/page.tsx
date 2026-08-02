import type { Metadata } from 'next';
import Link from 'next/link';
import { CATEGORIES, searchTools, TOTAL_CATEGORIES, TOTAL_TOOLS } from '@lovelytools/registry';
import { Footer, Header, MonogramChip, SearchBar, ToolCard } from '@lovelytools/ui';

/** A results page, not a browse page — past ~48 hits the ranking is noise anyway. */
const MAX_RESULTS = 48;

/** Seeds the empty state. Task phrases, not feature names (DS voice). */
const SUGGESTIONS = [
  'Compress PDF',
  'Remove background',
  'MP4 to GIF',
  'Word counter',
  'JSON formatter',
  'Merge PDF',
];

/** Shown by both the empty and the no-results state — each chip is a real /search URL. */
function SuggestionChips() {
  return (
    <div className="flex flex-wrap gap-2">
      {SUGGESTIONS.map((label) => (
        <Link
          key={label}
          href={`/search?q=${encodeURIComponent(label)}`}
          className="rounded-full border border-line px-3 py-1.5 text-[12.5px] font-medium text-fg2 transition-colors hover:border-line2 hover:text-fg"
        >
          {label}
        </Link>
      ))}
    </div>
  );
}

const readQuery = async (searchParams?: Promise<{ q?: string | string[] }>) => {
  const resolved = await searchParams;
  // A repeated ?q= arrives as an array; take the first rather than rendering "a,b".
  const raw = Array.isArray(resolved?.q) ? resolved.q[0] : resolved?.q;
  return raw?.trim() ?? '';
};

export async function generateMetadata({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string | string[] }>;
}): Promise<Metadata> {
  const query = await readQuery(searchParams);

  return {
    title: {
      absolute: query
        ? `${query} — search results | lovelytools.ai`
        : `Search all ${TOTAL_TOOLS} tools | lovelytools.ai`,
    },
    description: `Search ${TOTAL_TOOLS} free browser tools on lovelytools.ai. Everything runs on your device — no upload, no signup.`,
    alternates: { canonical: '/search' },
    // Query-string result pages are thin, near-duplicate content — the classic
    // case search engines ask you not to index. The links out are still worth
    // following. Deliberately absent from sitemap.ts for the same reason.
    robots: { index: false, follow: true },
  };
}

/**
 * /search — the results page behind the header's "Search tools" link, the
 * SearchTrigger fallback, and SearchBar's form GET.
 *
 * That form is why this renders server-side instead of being a client island:
 * `<form action="/search" method="get">` submits natively before hydration, so
 * /search?q=pdf has to answer with results in the HTML. Matching runs through
 * the registry's in-memory index — 230 rows, so a network round-trip would cost
 * more than the answer (the same reasoning as HeroSearch).
 *
 * A static route, so it takes precedence over the registry's flat [slug]
 * namespace; /search is held in RESERVED_SLUGS so no tool can ever claim it.
 */
export default async function SearchPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string | string[] }>;
}) {
  const query = await readQuery(searchParams);
  const results = query ? searchTools(query, MAX_RESULTS) : [];

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
                  Search
                </li>
              </ol>
            </nav>

            <h1 className="max-w-[760px] font-grotesk text-[clamp(32px,5vw,44px)] font-bold leading-[1.08] tracking-[-0.03em] text-fg">
              {query ? <>Results for &ldquo;{query}&rdquo;</> : 'Search every tool.'}
            </h1>
            <p className="max-w-[560px] text-[17px] leading-[1.55] text-fg2">
              {query
                ? `${results.length} of ${TOTAL_TOOLS} tools match. All free, and nothing you open runs anywhere but your browser.`
                : `${TOTAL_TOOLS} tools across ${TOTAL_CATEGORIES} categories. Type what you need to do — "compress a PDF", not a feature name.`}
            </p>

            {/* No onSearch: submitting does a native GET back to /search?q=, which
                is what makes this page work before (and without) hydration. */}
            <SearchBar
              key={query}
              defaultValue={query}
              autoFocus={!query}
              className="w-full max-w-[600px]"
            />
          </div>
        </section>

        <section className="lt-band">
          <div className="lt-container flex flex-col gap-6 py-14">
            <p aria-live="polite" className="sr-only">
              {query
                ? `${results.length} result${results.length === 1 ? '' : 's'} for ${query}`
                : 'Enter a search to see matching tools'}
            </p>

            {results.length > 0 && (
              <div className="grid grid-cols-1 gap-grid sm:grid-cols-2 lg:grid-cols-4">
                {results.map((tool) => (
                  <ToolCard key={tool.slug} tool={tool} showDescription />
                ))}
              </div>
            )}

            {query && results.length === 0 && (
              <div className="flex flex-col items-start gap-4">
                <p className="max-w-[560px] text-[15px] leading-[1.6] text-fg2">
                  Nothing matches &ldquo;{query}&rdquo;. Try a plainer word — the index reads tool
                  names and descriptions, so &ldquo;pdf&rdquo; finds more than
                  &ldquo;portable document&rdquo;.
                </p>
                <SuggestionChips />
                <Link href="/tools" className="text-sm text-fg2 transition-colors hover:text-fg">
                  Or browse all {TOTAL_TOOLS} tools →
                </Link>
              </div>
            )}

            {!query && (
              <div className="flex flex-col gap-6">
                <SuggestionChips />

                <div className="flex flex-col gap-3">
                  <p className="font-grotesk text-[11px] font-semibold uppercase tracking-[0.13em] text-fg3">
                    Or jump to a category
                  </p>
                  <div className="grid grid-cols-1 gap-grid sm:grid-cols-2 lg:grid-cols-3">
                    {CATEGORIES.map((category) => (
                      <Link
                        key={category.id}
                        href={category.path}
                        className="flex items-center gap-3.5 rounded-xl border border-line bg-surface p-4 transition-[transform,border-color] duration-[180ms] ease-out hover:-translate-y-[3px] hover:border-line2"
                      >
                        <MonogramChip
                          code={category.code}
                          hue={category.hue}
                          hueOnLight={category.hueOnLight}
                        />
                        <span className="flex flex-col">
                          <span className="font-grotesk text-[15px] font-semibold tracking-[-0.01em] text-fg">
                            {category.name}
                          </span>
                          <span className="text-[12.5px] text-fg3">{category.description}</span>
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
