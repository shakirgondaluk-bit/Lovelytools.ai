import Link from 'next/link';
import { relatedTools, type Category, type ToolDefinition } from '@lovelytools/registry';
import { Accordion, Footer, Header, MonogramChip, ToolCard } from '@lovelytools/ui';
import { ReorderRunner } from '@/components/reorder/reorder-runner';

/**
 * ReorderTemplate — the dedicated page for reorder-pdf-pages (RFC-001 §9).
 *
 * Most PDF tools share ToolTemplate + the generic PdfRunner, which collects an
 * option and runs. Reorder can't: "what order?" is answered by seeing the pages, not
 * typing "3, 1, 2". So it gets its own template built around a visual workflow —
 * INPUT (drop) → PROCESS (drag) → OUTPUT (export) — while keeping the same shell
 * (breadcrumb, JSON-LD, FAQ, related links) as every other tool page, so it reads as
 * part of the set rather than a bolt-on.
 *
 * RSC end to end; ReorderRunner is the one client island.
 */
export function ReorderTemplate({
  tool,
  category,
}: {
  tool: ToolDefinition;
  category: Category;
}) {
  const related = relatedTools(tool.slug);

  const faq = [
    {
      q: 'How do I change the page order?',
      a: 'Drop your PDF, then drag any page card to a new spot — the numbers update as you go. Prefer the keyboard? Every page has arrow buttons to nudge it earlier or later. "Reverse" flips the whole document, and "Reset order" puts it back.',
    },
    {
      q: 'Do my files get uploaded?',
      a: 'No. The page previews are rendered in your browser and the new PDF is written there too. Open your network inspector while you work — there are no uploads, because there is no upload endpoint.',
    },
    {
      q: 'Will reordering lower the quality?',
      a: 'No. Pages are moved, not re-rendered — text stays selectable and images stay sharp. The only thing that changes is the order.',
    },
    {
      q: 'Can I delete or duplicate pages too?',
      a: (
        <>
          This tool is just about order. To drop or repeat pages, use{' '}
          <Link href="/organize-pdf" className="text-accent hover:text-fg">
            Organize PDF
          </Link>
          ; to pull a range out, use{' '}
          <Link href="/extract-pdf-pages" className="text-accent hover:text-fg">
            Extract pages
          </Link>
          .
        </>
      ),
    },
  ];

  const stages: Array<[string, string, string]> = [
    ['Input', 'Drop your PDF', 'The file opens in your browser and every page is rendered as a preview. Nothing is sent anywhere.'],
    ['Process', 'Rearrange the pages', 'Drag the page cards into any order, or nudge them with the arrows. Reverse the whole document or reset in one click.'],
    ['Output', 'Export the new PDF', 'The pages are rewritten in your chosen order into a fresh PDF — same quality, same selectable text — ready to download.'],
  ];

  return (
    <>
      <Header />
      <main>
        <div className="lt-container flex flex-col gap-10 py-12">
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

          {/* The island: workflow strip + drag grid + export. */}
          <ReorderRunner category={category} />

          {/* How it works — the same three stages, spelled out for the reader (and
              for crawlers) below the fold. */}
          <section className="flex flex-col gap-6 border-t border-line pt-10">
            <h2 className="font-grotesk text-xl font-bold tracking-[-0.02em] text-fg">
              How it works
            </h2>
            <div className="grid grid-cols-1 gap-grid md:grid-cols-3">
              {stages.map(([kicker, title, body], i) => (
                <div key={kicker} className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-card">
                  <span className="flex items-center gap-2">
                    <span
                      className="grid size-6 place-items-center rounded-md font-grotesk text-[12px] font-bold"
                      style={{
                        background: `color-mix(in srgb, ${category.hue} 14%, transparent)`,
                        color: category.hue,
                      }}
                    >
                      {i + 1}
                    </span>
                    <span
                      className="font-grotesk text-[11px] font-semibold uppercase tracking-[0.14em]"
                      style={{ color: category.hue }}
                    >
                      {kicker}
                    </span>
                  </span>
                  <span className="font-grotesk text-[16px] font-semibold text-fg">{title}</span>
                  <p className="text-[13.5px] leading-[1.6] text-fg2">{body}</p>
                </div>
              ))}
            </div>
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
            },
            {
              '@context': 'https://schema.org',
              '@type': 'HowTo',
              name: 'How to reorder PDF pages',
              step: stages.map(([, title, body], i) => ({
                '@type': 'HowToStep',
                position: i + 1,
                name: title,
                text: body,
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
