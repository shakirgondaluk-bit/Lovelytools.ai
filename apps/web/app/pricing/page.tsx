import type { Metadata } from 'next';
import { TOTAL_TOOLS } from '@lovelytools/registry';
import { Accordion, Footer, Header } from '@lovelytools/ui';
import { PricingToggle } from '@/components/pricing-toggle';

export const metadata: Metadata = {
  title: { absolute: 'Pricing — free forever, Pro for power users | lovelytools.ai' },
  description: `All ${TOTAL_TOOLS} tools are free, with no watermarks and no daily caps. Pro raises the file-size and batch limits. No signup needed to start.`,
  alternates: { canonical: '/pricing' },
};

const FAQ = [
  {
    q: 'What do I actually get for free?',
    a: `Every one of the ${TOTAL_TOOLS} tools, with no watermark, no daily cap and no signup. Free tops out at 10 files per batch and 200 MB per file. That is not a trial — it is the product.`,
  },
  {
    q: 'So what is Pro for?',
    a: 'Volume. 200 files per batch instead of 10, 2 GB per file instead of 200 MB, and multithreaded video encoding. If you batch-compress hundreds of images or work with long video, you will notice. Otherwise you probably will not.',
  },
  {
    q: 'Why is it this cheap?',
    a: 'Because your device does the work. We have no file-processing servers to pay for — the expensive part of a tools platform scales with the audience at zero marginal cost to us. Pro pays for the catalog, not for compute.',
  },
  {
    q: 'Do you take payment details to start?',
    a: 'No. There is nothing to sign up for. Open a tool and use it.',
  },
  {
    q: 'Can I cancel?',
    a: 'Any time, and you keep Pro until the period you paid for ends. Then you are on Free — which is the same tools, at smaller limits.',
  },
];

export default function PricingPage() {
  return (
    <>
      <Header />
      <main>
        <section className="relative overflow-hidden border-b border-line">
          <div aria-hidden="true" className="lt-grid-bg absolute inset-0" />
          <div
            aria-hidden="true"
            className="lt-drift pointer-events-none absolute left-1/2 top-0 size-[520px] -translate-x-1/2 animate-lt-drift rounded-full opacity-20 blur-[120px]"
            style={{ background: 'var(--accent)' }}
          />
          <div className="lt-container relative flex flex-col items-center gap-5 py-16 text-center">
            <span className="font-grotesk text-[12px] font-semibold uppercase tracking-[0.14em] text-accent">
              Pricing
            </span>
            <h1 className="max-w-[720px] font-grotesk text-[clamp(32px,5vw,44px)] font-bold leading-[1.08] tracking-[-0.03em] text-fg">
              Free for everyone. Pro for power users.
            </h1>
            <p className="max-w-[520px] text-[17px] leading-[1.55] text-fg2">
              The tools are not gated. Pro raises the limits for people who live in them.
            </p>
          </div>
        </section>

        <section className="lt-container flex flex-col items-center gap-10 py-section">
          <PricingToggle />
        </section>

        <section className="lt-band bg-bg2">
          <div className="lt-container flex flex-col items-center gap-10 py-section">
            <h2 className="font-grotesk text-[clamp(28px,4vw,40px)] font-bold tracking-[-0.03em] text-fg">
              Questions, answered
            </h2>
            <div className="w-full max-w-[760px]">
              <Accordion items={FAQ} defaultOpen={-1} />
            </div>
          </div>
        </section>
      </main>
      <Footer />

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
