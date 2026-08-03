import type { Metadata } from 'next';
import Link from 'next/link';
import {
  CATEGORIES,
  searchTools,
  toolsInCategory,
  TOTAL_TOOLS,
  type ToolDefinition,
} from '@lovelytools/registry';
import { Footer, Header, MonogramChip, SearchBar, ToolCard } from '@lovelytools/ui';

/**
 * /search — results for the global tool search.
 *
 * Not optional furniture: three separate code paths land here, and all three
 * 404'd before this page existed. The header's search field is a plain GET form
 * whose action is /search, `SearchTrigger` navigates here whenever the page it
 * is on has no search input to focus, and the mobile menu links here directly.
 *
 * Pure RSC. The query comes in as ?q= and is answered from the registry's
 * in-memory index, so there is no API round-trip and no client-side filtering —
 * the results are in the HTML.
 */

export const metadata: Metadata = {
  title: { absolute: `Search ${TOTAL_TOOLS} tools | lovelytools.ai` },
  description: `Search every tool on lovelytools.ai. All ${TOTAL_TOOLS} of them run in your browser — your files never leave your device.`,
  alternates: { canonical: '/search' },
  // A results page per query is the textbook case of thin, near-duplicate
  // content. Crawl the links out of it, index the tools themselves.
  robots: { index: false, follow: true },
};

/** Result count is the whole page, so it is generous — no pagination to hide behind. */
const RESULT_LIMIT = 60;

function EmptyState({ query }: { query: string }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h2 className="font-grotesk text-[20px] font-bold tracking-[-0.02em] text-fg">
          Nothing matched “{query}”
        </h2>
        <p className="max-w-[60ch] text-[14.5px] leading-[1.55] text-fg2">
          Try a shorter or more general word — “pdf” rather than “pdf splitter online free”. Or
          browse by category below.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((category) => (
          <Link
            key={category.id}
            href={category.path}
            className="flex items-center gap-2 rounded-full border border-line px-3 py-1.5 text-[12.5px] font-medium text-fg2 transition-colors hover:border-line2 hover:text-fg"
          >
            <span
              aria-hidden="true"
              className="size-[7px] rounded-xs"
              style={{ background: category.hue }}
            />
            {category.name}
            <span className="text-fg3">{toolsInCategory(category.id).length}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function Prompt() {
  return (
    <div className="flex flex-col gap-6">
      <p className="max-w-[60ch] text-[14.5px] leading-[1.55] text-fg2">
        Type what you want to do — “compress image”, “json”, “convert webp” — and the matching tools
        appear here. Or browse the full catalogue by category.
      </p>

      <div className="grid grid-cols-1 gap-grid sm:grid-cols-2 lg:grid-cols-4">
        {CATEGORIES.map((category) => (
          <Link
            key={category.id}
            href={category.path}
            className="group flex flex-col gap-3 rounded-xl border border-line bg-surface p-5 transition-[transform,border-color] duration-[180ms] ease-out hover:-translate-y-[3px] hover:border-line2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <MonogramChip code={category.code} hue={category.hue} hueOnLight={category.hueOnLight} />
            <span className="font-grotesk text-[15px] font-bold tracking-[-0.01em] text-fg">
              {category.name}
            </span>
            <span className="text-[13px] leading-relaxed text-fg2">{category.description}</span>
            <span className="mt-auto text-[12.5px] text-fg3">
              {toolsInCategory(category.id).length} tools
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function Results({ query, tools }: { query: string; tools: ToolDefinition[] }) {
  return (
    <div className="flex flex-col gap-6">
      <p className="text-[13px] text-fg3" aria-live="polite">
        {tools.length} {tools.length === 1 ? 'tool' : 'tools'} matching “{query}”
      </p>
      <div className="grid grid-cols-1 gap-grid sm:grid-cols-2 lg:grid-cols-4">
        {tools.map((tool) => (
          <ToolCard key={tool.slug} tool={tool} showDescription />
        ))}
      </div>
    </div>
  );
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string }>;
}) {
  const resolved = await searchParams;
  const query = (resolved?.q ?? '').trim();
  const tools = query ? searchTools(query, RESULT_LIMIT) : [];

  return (
    <>
      <Header />
      <main>
        <section className="relative overflow-hidden border-b border-line">
          <div aria-hidden="true" className="lt-grid-bg absolute inset-0" />
          <div className="lt-container relative flex flex-col gap-5 py-14">
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

            <h1 className="font-grotesk text-[clamp(28px,4.5vw,40px)] font-bold leading-[1.08] tracking-[-0.03em] text-fg">
              {query ? `Results for “${query}”` : `Search ${TOTAL_TOOLS} tools`}
            </h1>

            {/* Carries SEARCH_INPUT_ID, so the header's search button focuses
                this field instead of navigating back to this same page. */}
            <SearchBar className="max-w-[620px]" autoFocus={!query} />
          </div>
        </section>

        <section className="lt-container py-14">
          {!query ? <Prompt /> : tools.length === 0 ? <EmptyState query={query} /> : <Results query={query} tools={tools} />}
        </section>
      </main>
      <Footer />
    </>
  );
}
