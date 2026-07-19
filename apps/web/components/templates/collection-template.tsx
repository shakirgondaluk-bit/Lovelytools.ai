import Link from 'next/link';
import { collectionTools, type Collection } from '@lovelytools/registry';
import { Footer, Header, ToolCard } from '@lovelytools/ui';

/**
 * CollectionTemplate — audience page (RFC-001 §6: "tools for students").
 * Curated cross-category sets targeting audience intent rather than a head term.
 * Pure RSC.
 */
export function CollectionTemplate({
  collection,
  totalTools,
}: {
  collection: Collection;
  totalTools: number;
}) {
  const tools = collectionTools(collection.slug);

  return (
    <>
      <Header />
      <main>
        <section className="relative overflow-hidden border-b border-line">
          <div aria-hidden="true" className="lt-grid-bg absolute inset-0" />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-32 top-0 size-[420px] rounded-full opacity-20 blur-[120px]"
            style={{ background: collection.hue }}
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
                  {collection.name}
                </li>
              </ol>
            </nav>

            <span
              className="font-grotesk text-[12px] font-semibold uppercase tracking-[0.14em]"
              style={{ color: collection.hue }}
            >
              {collection.label}
            </span>

            <h1 className="max-w-[720px] font-grotesk text-[clamp(32px,5vw,44px)] font-bold leading-[1.08] tracking-[-0.03em] text-fg">
              {collection.description}
            </h1>

            <p className="max-w-[560px] text-[17px] leading-[1.55] text-fg2">
              {tools.length} tools picked out of {totalTools}, for the work you actually do. All of
              them run in your browser — nothing is uploaded.
            </p>
          </div>
        </section>

        <section className="lt-container py-14">
          <div className="grid grid-cols-1 gap-grid sm:grid-cols-2 lg:grid-cols-4">
            {tools.map((tool) => (
              <ToolCard key={tool.slug} tool={tool} showDescription />
            ))}
          </div>
        </section>
      </main>
      <Footer />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: `${collection.label} — ${collection.name} tools`,
            description: collection.description,
            mainEntity: {
              '@type': 'ItemList',
              numberOfItems: tools.length,
              itemListElement: tools.map((tool, i) => ({
                '@type': 'ListItem',
                position: i + 1,
                name: tool.name,
                url: `https://lovelytools.ai/${tool.slug}`,
              })),
            },
          }),
        }}
      />
    </>
  );
}
