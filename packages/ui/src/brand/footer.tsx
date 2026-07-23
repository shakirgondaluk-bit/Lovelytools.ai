import Link from 'next/link';
import { TOTAL_TOOLS } from '@lovelytools/registry';
import { AUDIENCES, CATEGORIES } from '../lib/categories';
// The primitive, not header's copy: header is a client component, so importing its
// Logo would ship client JS to render a static mark in the footer.
import { Logo } from '../primitives/logo';

// The DS specifies a Resources column (Blog, Guides, Tutorials, Comparisons, Help,
// FAQ). None of it is built — it is editorial served from Postgres per RFC-001 §2,
// and there is no database. The column linked six 404s. Linking to pages that don't
// exist is worse than not having the column; add it back with the content.

const COMPANY: Array<[string, string]> = [
  ['About', '/about'],
  ['Pricing', '/pricing'],
  ['Privacy', '/privacy'],
  ['Terms', '/terms'],
  ['Contact', '/contact'],
];

/**
 * Footer — brand + Tools, Solutions, Company + legal strip (DS §10 #14).
 * Pure RSC — zero client JS.
 */
export function Footer() {
  return (
    <footer className="border-t border-line bg-bg2">
      <div className="mx-auto grid max-w-page grid-cols-2 gap-x-6 gap-y-10 px-5 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1fr] md:gap-x-8 md:px-8 md:py-16">
        {/* Brand */}
        <div className="col-span-2 flex flex-col gap-4 md:col-span-1">
          <Logo />
          {/* Rendered from the catalog. This said "250+" while the catalog held 230. */}
          <p className="max-w-[260px] text-[13.5px] leading-[1.55] text-fg2">
            {TOTAL_TOOLS} tools that run on your device. Nothing is ever uploaded — verify it in
            your network inspector.
          </p>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-[6px] border border-line px-2.5 py-1 text-[12.5px] text-fg2">
              <span aria-hidden="true" className="h-[7px] w-[7px] animate-lt-pulse rounded-full bg-success" />
              0 files uploaded, ever
            </span>
            {/*
              A "Works offline · PWA" badge used to sit here. There is no service
              worker (RFC-001 §7 is unbuilt), so nothing works offline and the badge
              was simply false. Put it back with the service worker.
            */}
          </div>
        </div>

        <FooterColumn
          title="Tools"
          links={[['All tools', '/tools'], ...CATEGORIES.map((c): [string, string] => [c.name, c.href])]}
        />
        <FooterColumn
          title="Solutions"
          links={AUDIENCES.map((a): [string, string] => [a.label, `/${a.slug}`])}
        />
        <FooterColumn title="Company" links={COMPANY} />
      </div>

      <div className="border-t border-line">
        <div className="mx-auto flex max-w-page flex-wrap items-center justify-between gap-3 px-5 py-5 sm:px-6 md:px-8">
          <p className="text-[12.5px] text-fg3">© 2026 lovelytools.ai — all processing happens on your device.</p>
          <div className="flex items-center gap-5">
            <Link href="/privacy" className="text-[12.5px] text-fg3 transition-colors duration-150 hover:text-fg2">
              Privacy
            </Link>
            <Link href="/terms" className="text-[12.5px] text-fg3 transition-colors duration-150 hover:text-fg2">
              Terms
            </Link>
            {/* "Security" linked to /security, which does not exist. The privacy page
                covers the security posture; relink when a real page exists. */}
            <Link href="/contact" className="text-[12.5px] text-fg3 transition-colors duration-150 hover:text-fg2">
              Contact
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: Array<[string, string]> }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="font-grotesk text-[11px] font-semibold uppercase tracking-[0.13em] text-fg3">
        {title}
      </p>
      <ul className="flex flex-col gap-2.5">
        {links.map(([label, href]) => (
          <li key={href}>
            <Link
              href={href}
              className="text-[13.5px] text-fg2 transition-colors duration-150 hover:text-fg"
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
