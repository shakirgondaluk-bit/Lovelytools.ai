import type { Metadata } from 'next';
import { TOTAL_CATEGORIES, TOTAL_TOOLS } from '@lovelytools/registry';
import { Button, Footer, Header } from '@lovelytools/ui';

export const metadata: Metadata = {
  title: { absolute: 'About — why the tools run on your device | lovelytools.ai' },
  description: `lovelytools.ai is ${TOTAL_TOOLS} browser-based tools that never upload your files. Here is why it is built that way.`,
  alternates: { canonical: '/about' },
};

export default function AboutPage() {
  return (
    <>
      <Header />
      <main>
        <section className="relative overflow-hidden border-b border-line">
          <div aria-hidden="true" className="lt-grid-bg absolute inset-0" />
          <div className="lt-container relative flex flex-col gap-5 py-16">
            <span className="font-grotesk text-[12px] font-semibold uppercase tracking-[0.14em] text-accent">
              About
            </span>
            <h1 className="max-w-[720px] font-grotesk text-[clamp(32px,5vw,44px)] font-bold leading-[1.08] tracking-[-0.03em] text-fg">
              Stop uploading your files to strangers.
            </h1>
            <p className="max-w-[600px] text-[17px] leading-[1.55] text-fg2">
              That is the whole idea. Everything else here follows from it.
            </p>
          </div>
        </section>

        <section className="lt-container flex max-w-[760px] flex-col gap-12 py-section">
          <div className="flex flex-col gap-4">
            <h2 className="font-grotesk text-2xl font-bold tracking-[-0.02em] text-fg">
              The problem
            </h2>
            <p className="text-[15px] leading-[1.7] text-fg2">
              You need to merge two PDFs. You search, you find a site, you upload a contract to a
              server you know nothing about, you wait in a queue, and you get a file back with a
              watermark and an upsell. Somewhere on that server, your contract is still sitting
              there. Probably. You have no way to check.
            </p>
            <p className="text-[15px] leading-[1.7] text-fg2">
              This is a strange bargain, and everyone has quietly accepted it — for tax documents,
              medical scans, client work, passports.
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <h2 className="font-grotesk text-2xl font-bold tracking-[-0.02em] text-fg">
              The other way
            </h2>
            <p className="text-[15px] leading-[1.7] text-fg2">
              Your computer is not slow. It can merge a PDF, compress an image, or transcode a video
              perfectly well on its own — that is what it is for. The only reason those tasks moved
              to someone else&rsquo;s server was that browsers used to be too limited to do them.
              They are not any more.
            </p>
            <p className="text-[15px] leading-[1.7] text-fg2">
              So {TOTAL_TOOLS} tools across {TOTAL_CATEGORIES} categories run entirely in your
              browser, on your machine, with no upload, no queue, and no &ldquo;premium speed&rdquo;.
              There is no file-processing server here, which means there is nothing to leak, nothing
              to subpoena, and nothing for you to take on faith.
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <h2 className="font-grotesk text-2xl font-bold tracking-[-0.02em] text-fg">
              How it stays free
            </h2>
            <p className="text-[15px] leading-[1.7] text-fg2">
              The expensive part of a tools platform is processing files. We do not do that — every
              new user brings their own compute. What is left is serving static pages, which is
              close to free. So the tools are genuinely free rather than free-until-you-need-them,
              and Pro exists for people who need bigger limits, not for people who need the
              watermark removed.
            </p>
          </div>

          <div className="flex flex-col items-start gap-4 border-t border-line pt-8">
            <h2 className="font-grotesk text-2xl font-bold tracking-[-0.02em] text-fg">
              Don&rsquo;t take our word for it
            </h2>
            <p className="text-[15px] leading-[1.7] text-fg2">
              Open any tool with your network inspector running. That is the entire argument.
            </p>
            <div className="flex flex-wrap gap-3 pt-1">
              <Button asChild>
                <a href="/tools">Browse all tools</a>
              </Button>
              <Button asChild variant="secondary">
                <a href="/privacy">How privacy works</a>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
