import Link from 'next/link';
import { relatedTools, type Category, type ToolDefinition } from '@lovelytools/registry';
import { Accordion, Footer, Header, MonogramChip, ToolCard } from '@lovelytools/ui';
import { ToolRunner } from '@/components/tool-runner';

/**
 * ToolTemplate — the tool page (RFC-001 §9).
 *
 * A React Server Component end to end: breadcrumb, H1, copy, FAQ and related links
 * are static HTML, so they are in the document at first paint and cost no JS. The
 * only client boundary is <ToolRunner>, which owns the entire interactive lifecycle.
 * The engine chunk loads after paint, never before — that is what keeps LCP under
 * the 1.2s budget on a page whose engine may be 31 MB.
 */
export function ToolTemplate({ tool, category }: { tool: ToolDefinition; category: Category }) {
  const related = relatedTools(tool.slug);

  const faq = [
    {
      q: `Is ${tool.name} really free?`,
      a: 'Yes — no watermark, no daily cap, no signup. Pro raises the file-size and batch limits, but the tool itself is not gated.',
    },
    {
      q: 'Do my files get uploaded?',
      a: 'No. This tool runs entirely in your browser. Open your network inspector and watch while it works — there are no file uploads, because there is no upload endpoint.',
    },
    {
      q: 'What are the limits?',
      a: 'Free handles up to 10 files at 200 MB each. Pro raises that to 200 files at 2 GB. The real ceiling is your device’s memory.',
    },
  ];

  return (
    <>
      <Header />
      <main>
        <div className="lt-container flex flex-col gap-10 py-12">
          {/* Breadcrumb — also the BreadcrumbList JSON-LD below. */}
          <nav aria-label="Breadcrumb">
            <ol className="flex flex-wrap items-center gap-2 text-[12.5px] text-fg3">
              <li>
                <Link href="/" className="transition-colors hover:text-fg">
                  Home
                </Link>
              </li>
              <li aria-hidden="true">·</li>
              <li>
                <Link href={category.path} className="transition-colors hover:text-fg">
                  {category.shortName}
                </Link>
              </li>
              <li aria-hidden="true">·</li>
              <li aria-current="page" className="text-fg2">
                {tool.name}
              </li>
            </ol>
          </nav>

          <header className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <MonogramChip code={category.code} hue={category.hue} hueOnLight={category.hueOnLight} size={48} />
              <div className="flex flex-col gap-1">
                <h1 className="font-grotesk text-[clamp(28px,4vw,44px)] font-bold leading-[1.08] tracking-[-0.03em] text-fg">
                  {tool.name}
                </h1>
                <p className="text-[15px] text-fg2">{tool.description}</p>
              </div>
            </div>
          </header>

          {/* The island. Everything above and below it is static HTML. */}
          <ToolRunner tool={tool} category={category} />

          <section className="flex flex-col gap-5 border-t border-line pt-10">
            <h2 className="font-grotesk text-xl font-bold tracking-[-0.02em] text-fg">
              How it works
            </h2>
            <p className="max-w-[720px] text-[14.5px] leading-[1.65] text-fg2">
              {tool.seo.description}
            </p>
          </section>

          <section className="flex flex-col gap-5">
            <h2 className="font-grotesk text-xl font-bold tracking-[-0.02em] text-fg">
              Questions about {tool.name.toLowerCase()}
            </h2>
            <div className="max-w-[760px]">
              <Accordion items={faq} defaultOpen={-1} />
            </div>
          </section>

          {related.length > 0 && (
            <section className="flex flex-col gap-5 border-t border-line pt-10">
              <h2 className="font-grotesk text-xl font-bold tracking-[-0.02em] text-fg">
                Frequently paired with
              </h2>
              <div className="grid grid-cols-1 gap-grid sm:grid-cols-2 lg:grid-cols-4">
                {related.map((item) => (
                  <ToolCard key={item.slug} tool={item} />
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
      <Footer />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            {
              '@context': 'https://schema.org',
              '@type': 'SoftwareApplication',
              name: tool.name,
              description: tool.seo.description,
              applicationCategory: 'UtilitiesApplication',
              operatingSystem: 'Any browser',
              offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
              // No aggregateRating: ratings live in tool_stats and none exist yet.
              // Emitting an invented one would be structured-data spam.
            },
            {
              '@context': 'https://schema.org',
              '@type': 'FAQPage',
              mainEntity: faq.map((item) => ({
                '@type': 'Question',
                name: item.q,
                acceptedAnswer: { '@type': 'Answer', text: item.a },
              })),
            },
            {
              '@context': 'https://schema.org',
              '@type': 'BreadcrumbList',
              itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://lovelytools.ai/' },
                {
                  '@type': 'ListItem',
                  position: 2,
                  name: category.shortName,
                  item: `https://lovelytools.ai${category.path}`,
                },
                { '@type': 'ListItem', position: 3, name: tool.name },
              ],
            },
          ]),
        }}
      />
    </>
  );
}
