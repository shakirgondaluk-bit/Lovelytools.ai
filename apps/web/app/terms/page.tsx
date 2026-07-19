import type { Metadata } from 'next';
import { Footer, Header } from '@lovelytools/ui';

export const metadata: Metadata = {
  title: { absolute: 'Terms of use | lovelytools.ai' },
  description: 'The terms for using lovelytools.ai, in plain language.',
  alternates: { canonical: '/terms' },
};

/**
 * /terms — plain-language placeholder.
 *
 * NOT LEGAL ADVICE AND NOT A REVIEWED DOCUMENT. It states honestly how the service
 * works, which is most of what terms are for, but a real product needs a lawyer to
 * read this before launch. Written plainly rather than in boilerplate so that when
 * counsel does review it, they are correcting substance and not decoding filler.
 */
const SECTIONS: Array<[string, string]> = [
  [
    'Using the service',
    'The tools are free to use, for anything you like, including commercial work. You do not need an account. There is no acceptable-use policy about what you may open, because we never see what you open — your files are processed on your device and never reach us.',
  ],
  [
    'Your files are yours',
    'We claim no rights over anything you process here, because we never receive it. No licence to your content is granted to us, because there is nothing to grant it over.',
  ],
  [
    'No warranty',
    'The tools are provided as they are. We work hard to make them correct, and the engines are tested — but keep your originals. Do not use this as your only copy of something that matters, and check the output before you rely on it. We are not liable for lost or damaged files.',
  ],
  [
    'Limits and fair use',
    'Free accounts are limited to 10 files per batch and 200 MB per file; Pro raises those. The real limit is your own device’s memory. We may rate-limit the small number of server endpoints that exist (search, ratings, the AI finder) to keep them available.',
  ],
  [
    'Paid plans',
    'Pro and Team bill in advance. Cancel any time and you keep your plan until the paid period ends; we do not refund partial periods. Prices may change, and we will tell you before they do.',
  ],
  [
    'Ending access',
    'You can stop using the service at any time — there is nothing to cancel unless you are paying. We may suspend an account that attacks the service or abuses the API endpoints.',
  ],
  [
    'Changes',
    'If these terms change materially, we will say so rather than quietly reissuing the page.',
  ],
];

export default function TermsPage() {
  return (
    <>
      <Header />
      <main>
        <section className="border-b border-line">
          <div className="lt-container flex flex-col gap-4 py-16">
            <h1 className="font-grotesk text-[clamp(32px,5vw,44px)] font-bold leading-[1.08] tracking-[-0.03em] text-fg">
              Terms of use
            </h1>
            <p className="max-w-[600px] text-[15px] leading-[1.6] text-fg2">
              In plain language, because terms nobody reads protect nobody.
            </p>
          </div>
        </section>

        <section className="lt-container flex max-w-[760px] flex-col gap-10 py-section">
          {/* Honest about its own status rather than implying legal review. */}
          <div
            className="rounded-xl border p-5 text-[13.5px] leading-[1.6]"
            style={{
              borderColor: 'color-mix(in srgb, var(--star) 35%, transparent)',
              background: 'color-mix(in srgb, var(--star) 8%, transparent)',
            }}
          >
            <strong className="text-fg">This is a draft, not a reviewed legal document.</strong>{' '}
            <span className="text-fg2">
              It describes accurately how the service works, but it has not been through a lawyer.
              Have counsel review it before launch.
            </span>
          </div>

          {SECTIONS.map(([title, body]) => (
            <div key={title} className="flex flex-col gap-3">
              <h2 className="font-grotesk text-xl font-bold tracking-[-0.02em] text-fg">{title}</h2>
              <p className="text-[15px] leading-[1.7] text-fg2">{body}</p>
            </div>
          ))}

          <p className="border-t border-line pt-6 text-[13px] text-fg3">
            See also{' '}
            <a href="/privacy" className="text-accent transition-colors hover:text-fg">
              how privacy works
            </a>
            .
          </p>
        </section>
      </main>
      <Footer />
    </>
  );
}
