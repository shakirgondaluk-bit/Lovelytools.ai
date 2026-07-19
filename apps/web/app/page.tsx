import type { Metadata } from 'next';
import {
  COLLECTIONS,
  collectionTools,
  getTool,
  TOTAL_CATEGORIES,
  TOTAL_TOOLS,
} from '@lovelytools/registry';
import {
  Accordion,
  Badge,
  Button,
  CATEGORIES,
  CategoryCard,
  CollectionCard,
  FloatingCard,
  Footer,
  Header,
  StatCounter,
  TestimonialCard,
  ToolCard,
} from '@lovelytools/ui';
import { HeroSearch } from '@/components/hero-search';
import { PricingToggle } from '@/components/pricing-toggle';

export const metadata: Metadata = {
  title: 'lovelytools.ai — powerful online tools that never upload your files',
  description: `${TOTAL_TOOLS} browser-based tools for PDFs, images, video, audio, text and code. Everything runs on your device — your files never leave it. Free, no signup.`,
  alternates: { canonical: '/' },
};

// Featured tools — hand-picked slugs resolved through the registry, so a rename or
// removal surfaces at build rather than as a dead card in production.
const FEATURED = [
  'merge-pdf',
  'image-compressor',
  'pdf-to-word',
  'remove-background',
  'mp4-to-gif',
  'word-counter',
  'json-formatter',
  'compress-video',
];

const FAQ = [
  {
    q: 'Are the tools really free?',
    a: 'Yes. Every tool here is free to use, with no watermarks and no daily caps — and there is nothing to sign up for. Pro raises the file-size and batch limits for people who work in bulk, but the tools themselves are not gated.',
  },
  {
    q: 'Do my files get uploaded anywhere?',
    a: 'No. Every engine runs in your browser via WebAssembly. You can verify this yourself: open your browser’s network inspector, run any tool, and watch — there are no file uploads, because there is no upload endpoint to receive them.',
  },
  {
    q: 'Is there a file size limit?',
    a: 'Free tops out at 200 MB per file and 10 files at a time; Pro raises that to 2 GB and 200 files. The ceiling is your device’s memory, not our servers — we don’t have any in this path.',
  },
  {
    q: 'Does it work offline?',
    a: 'Calculators and text tools work offline immediately. File tools work offline once their engine has been cached — the strongest proof we can offer that nothing is being sent anywhere.',
  },
  {
    q: 'Can my team use it for confidential documents?',
    a: 'That is precisely what it is for. Contracts, statements and medical records never leave the tab. Nothing was stored, logged or seen by anyone — including us.',
  },
];

export default function HomePage() {
  const featured = FEATURED.map((slug) => getTool(slug)).filter((t) => t !== undefined);

  return (
    <>
      <Header />
      <main>
        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden">
          <div aria-hidden="true" className="lt-grid-bg absolute inset-0" />
          {/* Two drifting orbs — the only ambient colour in the system. */}
          <div
            aria-hidden="true"
            className="lt-drift pointer-events-none absolute -left-40 top-10 size-[520px] animate-lt-drift rounded-full opacity-30 blur-[120px]"
            style={{ background: 'var(--accent)' }}
          />
          <div
            aria-hidden="true"
            className="lt-drift pointer-events-none absolute -right-40 top-40 size-[420px] animate-lt-drift rounded-full opacity-20 blur-[120px]"
            style={{ background: 'var(--green)', animationDelay: '-8s' }}
          />

          <FloatingCard label="Merge PDF" hue="#FF6B6B" rotate={-8} delay={0} className="left-[6%] top-[22%]" />
          <FloatingCard label="Background Remover" hue="#4ADE80" rotate={6} delay={-1.4} className="left-[3%] top-[52%]" />
          <FloatingCard label="Loan Calculator" hue="#38BDF8" rotate={-4} delay={-2.8} className="left-[9%] top-[74%]" />
          <FloatingCard label="MP4 to GIF" hue="#7C6CFF" rotate={7} delay={-0.7} className="right-[6%] top-[20%]" />
          <FloatingCard label="Audio Cutter" hue="#FFC53D" rotate={-6} delay={-2.1} className="right-[3%] top-[46%]" />
          <FloatingCard label="JSON Formatter" hue="#34D3C3" rotate={5} delay={-3.5} className="right-[8%] top-[70%]" />

          <div className="lt-container relative flex flex-col items-center gap-6 pb-24 pt-[110px] text-center">
            <Badge dot pulse tone="green">
              Privacy-first · file tools that never upload
            </Badge>

            {/* No "+". The count is rendered from the catalog, so it is exact —
                and "230+" would be the same overclaim as the old hardcoded "250+".
                DS voice: numerals are content; stats must inform. */}
            <h1 className="max-w-[880px] font-grotesk text-[clamp(40px,7vw,72px)] font-bold leading-[1.04] tracking-[-0.035em] text-fg">
              {TOTAL_TOOLS} powerful online tools in one beautiful platform
            </h1>

            <p className="max-w-[560px] text-[17px] leading-[1.55] text-fg2">
              Convert, edit, optimise and calculate faster — with privacy-first tools that run
              entirely in your browser.
            </p>

            <HeroSearch />

            <p className="text-[12.5px] text-fg3">
              Free forever · no signup needed · {TOTAL_TOOLS} tools
            </p>
          </div>
        </section>

        {/* ── Stats ─────────────────────────────────────────────────────── */}
        <section className="lt-band bg-bg2">
          <div className="lt-container grid grid-cols-1 gap-10 py-14 text-center sm:grid-cols-3">
            <StatCounter value={TOTAL_TOOLS} caption="tools in your browser" className="items-center" />
            <StatCounter value={0} caption="files uploaded to our servers" className="items-center" />
            <StatCounter value="100%" caption="of processing happens on your device" className="items-center" />
          </div>
        </section>

        {/* ── Categories ────────────────────────────────────────────────── */}
        <section className="lt-band">
          <div className="lt-container flex flex-col gap-8 py-section">
            <div className="flex flex-col gap-2">
              <span className="font-grotesk text-[12px] font-semibold uppercase tracking-[0.14em] text-accent">
                Categories
              </span>
              <div className="flex flex-wrap items-end justify-between gap-4">
                <h2 className="font-grotesk text-[clamp(28px,4vw,40px)] font-bold tracking-[-0.03em] text-fg">
                  {TOTAL_CATEGORIES === 8 ? 'Eight' : TOTAL_CATEGORIES === 9 ? 'Nine' : TOTAL_CATEGORIES} categories. Zero uploads.
                </h2>
                <a href="/tools" className="text-sm text-fg2 transition-colors hover:text-fg">
                  All {TOTAL_TOOLS} tools →
                </a>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-grid sm:grid-cols-2 lg:grid-cols-4">
              {CATEGORIES.map((category) => (
                <CategoryCard key={category.slug} category={category} />
              ))}
            </div>
          </div>
        </section>

        {/* ── Collections ───────────────────────────────────────────────── */}
        <section className="lt-band bg-bg2">
          <div className="lt-container flex flex-col gap-8 py-section">
            <div className="flex flex-col gap-2">
              <span className="font-grotesk text-[12px] font-semibold uppercase tracking-[0.14em] text-accent">
                Collections
              </span>
              <h2 className="font-grotesk text-[clamp(28px,4vw,40px)] font-bold tracking-[-0.03em] text-fg">
                Curated for how you work
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-grid sm:grid-cols-2 lg:grid-cols-4">
              {COLLECTIONS.slice(0, 4).map((collection) => {
                const tools = collectionTools(collection.slug);
                return (
                  <CollectionCard
                    key={collection.slug}
                    label={collection.label}
                    name={collection.name}
                    description={collection.description}
                    hue={collection.hue}
                    href={`/${collection.slug}`}
                    sample={tools.slice(0, 3).map((t) => t.name)}
                    toolCount={tools.length}
                  />
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Featured tools ────────────────────────────────────────────── */}
        <section className="lt-band">
          <div className="lt-container flex flex-col gap-8 py-section">
            <div className="flex flex-col gap-2">
              <span className="font-grotesk text-[12px] font-semibold uppercase tracking-[0.14em] text-accent">
                Featured
              </span>
              <h2 className="font-grotesk text-[clamp(28px,4vw,40px)] font-bold tracking-[-0.03em] text-fg">
                The tools people reach for first
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-grid sm:grid-cols-2 lg:grid-cols-4">
              {featured.map((tool) => (
                <ToolCard key={tool.slug} tool={tool} />
              ))}
            </div>
          </div>
        </section>

        {/* ── Privacy proof ─────────────────────────────────────────────── */}
        <section className="lt-band bg-bg2">
          <div className="lt-container grid grid-cols-1 items-center gap-12 py-section lg:grid-cols-2">
            <div className="flex flex-col gap-5">
              <span className="font-grotesk text-[12px] font-semibold uppercase tracking-[0.14em] text-success">
                Privacy first
              </span>
              <h2 className="font-grotesk text-[clamp(28px,4vw,44px)] font-bold leading-[1.08] tracking-[-0.03em] text-fg">
                Your files never leave your device.
              </h2>
              <p className="text-[17px] leading-[1.55] text-fg2">
                Most tools upload your files to their servers. We don&rsquo;t — everything runs
                client-side, in your browser tab. Close the tab and it&rsquo;s gone.
              </p>
              <ul className="flex flex-col gap-3">
                {[
                  'Files never leave your device',
                  '100% client-side processing — WASM + WebGPU',
                  'No upload, no queue, no server-side copies',
                ].map((line) => (
                  <li key={line} className="flex items-center gap-2.5 text-sm text-fg2">
                    <span aria-hidden="true" className="text-success">
                      ✓
                    </span>
                    {line}
                  </li>
                ))}
              </ul>
              <p className="text-[13px] text-fg3">
                You can verify this in your browser&rsquo;s network inspector — there are no file
                uploads.
              </p>
            </div>

            <div className="rounded-2xl border border-line bg-surface p-8 shadow-card">
              <div className="flex flex-col gap-4 font-mono text-[12.5px]">
                <div className="flex items-center justify-between text-fg3">
                  <span>Network</span>
                  <span>0 requests</span>
                </div>
                <div className="flex items-center gap-3 rounded-lg border border-line bg-bg2 p-3">
                  <span className="size-[9px] shrink-0 rounded-xs" style={{ background: 'var(--green)' }} />
                  <span className="text-fg2">your-contract.pdf</span>
                  <span className="ml-auto text-success">stays local</span>
                </div>
                <div className="flex items-center gap-3 rounded-lg border border-dashed border-line p-3 opacity-50">
                  <span aria-hidden="true" style={{ color: 'var(--error)' }}>
                    ✕
                  </span>
                  <span className="text-fg3">POST /upload</span>
                  <span className="ml-auto text-fg3">no such endpoint</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── How it works ──────────────────────────────────────────────── */}
        <section className="lt-band">
          <div className="lt-container flex flex-col items-center gap-10 py-section">
            <h2 className="text-center font-grotesk text-[clamp(28px,4vw,40px)] font-bold tracking-[-0.03em] text-fg">
              Three steps. No account. No waiting.
            </h2>
            <div className="grid w-full grid-cols-1 gap-grid md:grid-cols-3">
              {[
                ['01', 'Drop it in', 'Drag any file into the tool — or paste, or browse. Nothing uploads.'],
                ['02', 'It processes here', 'Your own device does the work, instantly. No queue, no "premium speed".'],
                ['03', 'Download & done', 'Get the result. Nothing was stored, logged or seen by anyone — including us.'],
              ].map(([step, title, body]) => (
                <div key={step} className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-7">
                  <span className="font-grotesk text-[13px] font-bold text-accent">{step}</span>
                  <h3 className="font-grotesk text-xl font-bold tracking-[-0.02em] text-fg">{title}</h3>
                  <p className="text-sm leading-[1.6] text-fg2">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Testimonials ──────────────────────────────────────────────── */}
        <section className="lt-band bg-bg2">
          <div className="lt-container grid grid-cols-1 gap-grid py-section md:grid-cols-3">
            <TestimonialCard
              initials="MK"
              name="Maren Kessler"
              role="Paralegal"
              hue="#FF6B6B"
              text="We handle client contracts all day. I got approval from our compliance lead faster than for any tool we've ever bought, because there was nothing to approve — the files never leave the machine."
            />
            <TestimonialCard
              initials="DA"
              name="Dev Acharya"
              role="Frontend engineer"
              hue="#34D3C3"
              text="I stopped keeping a folder of one-off scripts. JWT decode, JSON format, regex test — it's all a tab away, and I'm not pasting a production token into someone's server."
            />
            <TestimonialCard
              initials="SR"
              name="Sofia Rossi"
              role="Content marketer"
              hue="#F472B6"
              text="Batch-compressing 300 images used to be an overnight job on someone else's queue. Now it's however long my laptop takes."
            />
          </div>
        </section>

        {/* ── Pricing ───────────────────────────────────────────────────── */}
        <section className="lt-band">
          <div className="lt-container flex flex-col items-center gap-10 py-section">
            <div className="flex flex-col items-center gap-5 text-center">
              <span className="font-grotesk text-[12px] font-semibold uppercase tracking-[0.14em] text-accent">
                Pricing
              </span>
              <h2 className="font-grotesk text-[clamp(28px,4vw,40px)] font-bold tracking-[-0.03em] text-fg">
                Free for everyone. Pro for power users.
              </h2>
            </div>
            <PricingToggle />
          </div>
        </section>

        {/* ── FAQ ───────────────────────────────────────────────────────── */}
        <section className="lt-band bg-bg2">
          <div className="lt-container flex flex-col items-center gap-10 py-section">
            <h2 className="font-grotesk text-[clamp(28px,4vw,40px)] font-bold tracking-[-0.03em] text-fg">
              Questions, answered
            </h2>
            <div className="w-full max-w-[760px]">
              <Accordion items={FAQ} />
            </div>
          </div>
        </section>

        {/* ── Final CTA ─────────────────────────────────────────────────── */}
        <section className="lt-band relative overflow-hidden">
          <div
            aria-hidden="true"
            className="lt-drift pointer-events-none absolute left-1/2 top-1/2 size-[600px] -translate-x-1/2 -translate-y-1/2 animate-lt-drift rounded-full opacity-20 blur-[130px]"
            style={{ background: 'var(--accent)' }}
          />
          <div className="lt-container relative flex flex-col items-center gap-6 py-section text-center">
            <h2 className="max-w-[720px] font-grotesk text-[clamp(32px,5vw,56px)] font-bold leading-[1.06] tracking-[-0.035em] text-fg">
              Stop uploading your files to strangers.
            </h2>
            <p className="max-w-[520px] text-[17px] leading-[1.55] text-fg2">
              {TOTAL_TOOLS} tools, right in your browser. Free to use, no signup, nothing installed.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="lg">
                <a href="/tools">Browse all tools</a>
              </Button>
              <Button asChild variant="secondary" size="lg">
                <a href="/pricing">See pricing</a>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <Footer />

      {/* FAQPage JSON-LD — the answers are in the DOM, so this describes real content. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: FAQ.map((item) => ({
              '@type': 'Question',
              name: item.q,
              acceptedAnswer: { '@type': 'Answer', text: item.a },
            })),
          }),
        }}
      />
    </>
  );
}

