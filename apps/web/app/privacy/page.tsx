import type { Metadata } from 'next';
import { TOTAL_TOOLS } from '@lovelytools/registry';
import { Footer, Header } from '@lovelytools/ui';

export const metadata: Metadata = {
  title: { absolute: 'Privacy — your files never leave your device | lovelytools.ai' },
  description:
    'There is no file upload endpoint on lovelytools.ai. Every tool runs in your browser, and you can verify it in your network inspector. Here is exactly what we do and do not collect.',
  alternates: { canonical: '/privacy' },
};

/**
 * /privacy — the page the whole product is an argument for.
 *
 * Written as claims a reader can check rather than as legalese (DS voice: privacy
 * claims come with proof, never legalese). Every statement here is one the
 * architecture actually enforces — if a statement stops being true, the
 * architecture broke, not the copy.
 */
export default function PrivacyPage() {
  return (
    <>
      <Header />
      <main>
        <section className="relative overflow-hidden border-b border-line">
          <div aria-hidden="true" className="lt-grid-bg absolute inset-0" />
          <div
            aria-hidden="true"
            className="lt-drift pointer-events-none absolute -right-32 top-0 size-[420px] animate-lt-drift rounded-full opacity-20 blur-[120px]"
            style={{ background: 'var(--green)' }}
          />
          <div className="lt-container relative flex flex-col gap-5 py-16">
            <span className="font-grotesk text-[12px] font-semibold uppercase tracking-[0.14em] text-success">
              Privacy first
            </span>
            <h1 className="max-w-[720px] font-grotesk text-[clamp(32px,5vw,44px)] font-bold leading-[1.08] tracking-[-0.03em] text-fg">
              Your files never leave your device.
            </h1>
            <p className="max-w-[600px] text-[17px] leading-[1.55] text-fg2">
              Not &ldquo;we delete them after an hour&rdquo;. Not &ldquo;we encrypt them in
              transit&rdquo;. They are never sent. There is no endpoint to send them to.
            </p>
          </div>
        </section>

        <section className="lt-container flex max-w-[760px] flex-col gap-12 py-section">
          <div className="flex flex-col gap-4">
            <h2 className="font-grotesk text-2xl font-bold tracking-[-0.02em] text-fg">
              Check it yourself
            </h2>
            <p className="text-[15px] leading-[1.7] text-fg2">
              Open your browser&rsquo;s developer tools, switch to the Network tab, and use any tool
              on this site. Watch what happens when you drop a file in: nothing. No request carries
              your file, because no route exists that would accept one. This is the only privacy
              claim that matters — the one you can falsify in thirty seconds.
            </p>
            <p className="text-[15px] leading-[1.7] text-fg2">
              You can go further. Load a tool, turn off your network, and use it anyway. Once its
              engine is cached, it works with the cable pulled. Software that runs offline cannot be
              phoning your documents home.
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <h2 className="font-grotesk text-2xl font-bold tracking-[-0.02em] text-fg">
              What happens to your files
            </h2>
            <p className="text-[15px] leading-[1.7] text-fg2">
              They are read into your browser tab&rsquo;s memory, processed by a WebAssembly engine
              running on your own processor, and handed back to you as a download. When you close
              the tab, they are gone. We never see them, so we cannot store them, log them, train on
              them, or hand them to anyone who asks.
            </p>
            <ul className="flex flex-col gap-3 pt-1">
              {[
                `All ${TOTAL_TOOLS} tools process on your device`,
                'No upload endpoint exists anywhere in the system',
                'No file bytes are ever sent to a server, ours or anyone else’s',
                'The engines are self-hosted — not even a CDN sees which tool you opened',
              ].map((line) => (
                <li key={line} className="flex gap-2.5 text-[15px] text-fg2">
                  <span aria-hidden="true" className="shrink-0 text-success">
                    ✓
                  </span>
                  {line}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col gap-4">
            <h2 className="font-grotesk text-2xl font-bold tracking-[-0.02em] text-fg">
              What we do collect
            </h2>
            <p className="text-[15px] leading-[1.7] text-fg2">
              We would rather tell you plainly than let you assume it is nothing.
            </p>
            <div className="flex flex-col gap-3">
              {[
                [
                  'Anonymous usage counts',
                  'When a tool runs, we count that it ran: the tool’s name, whether it succeeded, and roughly how long it took. No filename, no file size, no content. The schema rejects anything else.',
                ],
                [
                  'Page analytics',
                  'Cookieless and first-party. Which pages get visited, no cross-site tracking, no advertising identifiers, no profile of you.',
                ],
                [
                  'Your account, if you make one',
                  'An email address, your plan, and the tools you favourited. You do not need an account to use anything here.',
                ],
              ].map(([title, body]) => (
                <div key={title} className="rounded-xl border border-line bg-surface p-5">
                  <h3 className="font-grotesk text-base font-semibold text-fg">{title}</h3>
                  <p className="mt-1.5 text-[14px] leading-[1.6] text-fg2">{body}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <h2 className="font-grotesk text-2xl font-bold tracking-[-0.02em] text-fg">
              Why build it this way
            </h2>
            <p className="text-[15px] leading-[1.7] text-fg2">
              Most online tools upload your file to a server, do the work there, and ask you to trust
              a retention policy. That trust is unverifiable by design — you cannot audit a promise.
              Doing the work on your device removes the need to trust us at all, which is a stronger
              position for you and a cheaper one for us. The incentives happen to line up.
            </p>
          </div>

          <p className="border-t border-line pt-6 text-[13px] text-fg3">
            Questions about any of this:{' '}
            <a href="/contact" className="text-accent transition-colors hover:text-fg">
              get in touch
            </a>
            .
          </p>
        </section>
      </main>
      <Footer />
    </>
  );
}
