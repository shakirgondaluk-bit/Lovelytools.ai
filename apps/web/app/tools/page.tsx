import type { Metadata } from 'next';
import Link from 'next/link';
import { CATEGORIES, toolsInCategory, TOTAL_CATEGORIES, TOTAL_TOOLS } from '@lovelytools/registry';
import { Footer, Header, MonogramChip, ToolCard } from '@lovelytools/ui';

export const metadata: Metadata = {
  title: { absolute: `All ${TOTAL_TOOLS} tools — free, private, no upload | lovelytools.ai` },
  description: `Every one of the ${TOTAL_TOOLS} tools on lovelytools.ai, grouped by category. All of them run in your browser — your files never leave your device. Free, no signup.`,
  alternates: { canonical: '/tools' },
};

/**
 * /tools — the browse-all index.
 *
 * The homepage's primary call to action points here ("Browse all tools",
 * "All N tools →"), so it is not optional furniture. It is also the densest
 * internal-link hub on the site: every tool is one hop from it.
 */
export default function ToolsPage() {
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
                  All tools
                </li>
              </ol>
            </nav>

            <h1 className="max-w-[760px] font-grotesk text-[clamp(32px,5vw,44px)] font-bold leading-[1.08] tracking-[-0.03em] text-fg">
              Every tool, in one place.
            </h1>
            <p className="max-w-[560px] text-[17px] leading-[1.55] text-fg2">
              {TOTAL_TOOLS} tools across {TOTAL_CATEGORIES} categories. Free to use, no signup, and
              nothing you open here is uploaded anywhere.
            </p>

            {/* Jump links — 230 cards is a long page; make the categories reachable. */}
            <div className="flex flex-wrap gap-2 pt-2">
              {CATEGORIES.map((category) => (
                <a
                  key={category.id}
                  href={`#${category.id}`}
                  className="flex items-center gap-2 rounded-full border border-line px-3 py-1.5 text-[12.5px] font-medium text-fg2 transition-colors hover:border-line2 hover:text-fg"
                >
                  <span
                    aria-hidden="true"
                    className="size-[7px] rounded-xs"
                    style={{ background: category.hue }}
                  />
                  {category.name}
                  <span className="text-fg3">{toolsInCategory(category.id).length}</span>
                </a>
              ))}
            </div>
          </div>
        </section>

        {CATEGORIES.map((category, index) => {
          const tools = toolsInCategory(category.id);
          return (
            <section
              key={category.id}
              id={category.id}
              className={index % 2 === 1 ? 'lt-band bg-bg2' : 'lt-band'}
            >
              <div className="lt-container flex flex-col gap-6 py-14">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <MonogramChip
                      code={category.code}
                      hue={category.hue}
                      hueOnLight={category.hueOnLight}
                    />
                    <div className="flex flex-col">
                      <h2 className="font-grotesk text-[22px] font-bold tracking-[-0.02em] text-fg">
                        {category.name}
                      </h2>
                      <p className="text-[13px] text-fg3">{category.description}</p>
                    </div>
                  </div>
                  <Link
                    href={category.path}
                    className="text-sm text-fg2 transition-colors hover:text-fg"
                  >
                    {tools.length} tools →
                  </Link>
                </div>

                <div className="grid grid-cols-1 gap-grid sm:grid-cols-2 lg:grid-cols-4">
                  {tools.map((tool) => (
                    <ToolCard key={tool.slug} tool={tool} />
                  ))}
                </div>
              </div>
            </section>
          );
        })}
      </main>
      <Footer />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: `All ${TOTAL_TOOLS} tools`,
            description: `Every tool on lovelytools.ai, grouped by category.`,
            mainEntity: {
              '@type': 'ItemList',
              numberOfItems: TOTAL_TOOLS,
              itemListElement: CATEGORIES.flatMap((category) =>
                toolsInCategory(category.id).map((tool) => ({
                  '@type': 'ListItem',
                  name: tool.name,
                  url: `https://lovelytools.ai/${tool.slug}`,
                })),
              ),
            },
          }),
        }}
      />
    </>
  );
}
