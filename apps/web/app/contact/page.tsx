import type { Metadata } from 'next';
import { Footer, Header } from '@lovelytools/ui';

export const metadata: Metadata = {
  title: { absolute: 'Contact | lovelytools.ai' },
  description: 'How to reach the team behind lovelytools.ai — support, sales, security and press.',
  alternates: { canonical: '/contact' },
};

/**
 * /contact — deliberately email, not a form.
 *
 * A contact form needs an endpoint to POST to. `feedback` exists in the schema
 * (RFC-001 §4) but no route handler implements it, so a form here would either fail
 * silently or need a fake success state. Mailto links work today and are honest.
 * Swap them for a form when /api/v1/feedback exists.
 */
const CHANNELS: Array<{ title: string; body: string; email: string; hue: string }> = [
  {
    title: 'Support',
    body: 'Something broken, a tool giving the wrong answer, or a file that will not open. Tell us which tool and what you expected.',
    email: 'support@lovelytools.ai',
    hue: '#7C6CFF',
  },
  {
    title: 'Sales',
    body: 'Team plans, invoicing, procurement, or a security review before your company adopts it.',
    email: 'sales@lovelytools.ai',
    hue: '#4ADE80',
  },
  {
    title: 'Security',
    body: 'Found a vulnerability? Tell us privately first and we will credit you once it is fixed.',
    email: 'security@lovelytools.ai',
    hue: '#FF6B6B',
  },
  {
    title: 'Press',
    body: 'Questions about how the platform works, or how a tools business runs without file servers.',
    email: 'press@lovelytools.ai',
    hue: '#FFC53D',
  },
];

export default function ContactPage() {
  return (
    <>
      <Header />
      <main>
        <section className="border-b border-line">
          <div className="lt-container flex flex-col gap-4 py-16">
            <h1 className="font-grotesk text-[clamp(32px,5vw,44px)] font-bold leading-[1.08] tracking-[-0.03em] text-fg">
              Get in touch
            </h1>
            <p className="max-w-[560px] text-[17px] leading-[1.55] text-fg2">
              Real addresses, read by people. No ticket portal.
            </p>
          </div>
        </section>

        <section className="lt-container py-section">
          <div className="grid max-w-[900px] grid-cols-1 gap-grid sm:grid-cols-2">
            {CHANNELS.map((channel) => (
              <a
                key={channel.title}
                href={`mailto:${channel.email}`}
                className="group flex flex-col gap-2.5 rounded-xl border border-line bg-surface p-card transition-[transform,border-color] duration-hover ease-out hover:-translate-y-[3px] hover:border-line2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                <span
                  aria-hidden="true"
                  className="size-[9px] rounded-xs"
                  style={{ background: channel.hue }}
                />
                <h2 className="font-grotesk text-lg font-bold tracking-[-0.02em] text-fg">
                  {channel.title}
                </h2>
                <p className="text-[13.5px] leading-[1.6] text-fg2">{channel.body}</p>
                <span className="mt-auto pt-2 text-[13px] text-accent transition-colors group-hover:text-fg">
                  {channel.email} →
                </span>
              </a>
            ))}
          </div>

          <p className="max-w-[600px] pt-10 text-[13px] leading-[1.6] text-fg3">
            One thing we cannot help with: recovering a file. We never had it — it was processed on
            your device and never sent to us. That is the point, but it does mean your originals are
            your responsibility.
          </p>
        </section>
      </main>
      <Footer />
    </>
  );
}
