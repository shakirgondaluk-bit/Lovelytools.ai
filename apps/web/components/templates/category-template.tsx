import Link from 'next/link';
import { toolsInCategory, type Category } from '@lovelytools/registry';
import { Footer, Header, MonogramChip, ToolCard } from '@lovelytools/ui';

/**
 * CategoryTemplate — the category hub (RFC-001 §6).
 * Hubs concentrate internal links: every tool in the category is one hop from here,
 * which is what makes "pdf tools online" rankable. Pure RSC.
 */
export function CategoryTemplate({ category }: { category: Category }) {
  const tools = toolsInCategory(category.id);

  return (
    <>
      <Header />
      <main>
        <section className="relative overflow-hidden border-b border-line">
          <div aria-hidden="true" className="lt-grid-bg absolute inset-0" />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-32 top-0 size-[420px] rounded-full opacity-20 blur-[120px]"
            style={{ background: category.hue }}
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
                  {category.shortName}
                </li>
              </ol>
            </nav>

            <div className="flex items-center gap-4">
              <MonogramChip
                code={category.code}
                hue={category.hue}
                hueOnLight={category.hueOnLight}
                size={48}
              />
              <h1 className="font-grotesk text-[clamp(32px,5vw,44px)] font-bold leading-[1.08] tracking-[-0.03em] text-fg">
                {category.name}
              </h1>
            </div>

            <p className="max-w-[560px] text-[17px] leading-[1.55] text-fg2">
              {category.description}
            </p>

            {/* Derived, so it cannot disagree with the grid below it. */}
            <p className="text-[13px] text-fg3">
              {tools.length} tools · all free · nothing uploaded
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
            name: category.name,
            description: category.description,
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
