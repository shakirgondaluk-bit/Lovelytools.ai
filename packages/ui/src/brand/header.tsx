'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Logo } from '../primitives/logo';
import { CATEGORIES } from '../lib/categories';
import { cn } from '../lib/utils';
import { useAccountState } from './account-context';
import { useFavorites } from './favorites';
import { MegaNav, type MegaPanelId } from './mega-nav';
import { MonogramChip } from './monogram-chip';
import { SearchTrigger } from './search-bar';
import { ThemeSwitcher } from './theme-switcher';

// A "Resources" trigger sat here. Its panel was six 404s and a link to a blog post
// that was never written — editorial is unbuilt. Restore it with the content.
const TRIGGERS: Array<{ id: MegaPanelId; label: string }> = [
  { id: 'tools', label: 'Tools' },
  { id: 'solutions', label: 'Solutions' },
];

/**
 * Header — sticky 64px bar, --nav-bg + 18px blur (DS §9).
 * Order: logo · Tools · Solutions · Resources · Buyer's Guide · Pricing · [spacer] ·
 * search trigger · EN · theme toggle · Log in · Get started.
 * Mega panels open on trigger mouseenter and close when the pointer leaves
 * the header+panel region (panels render inside <header>) or on Esc.
 */
export function Header() {
  const [open, setOpen] = useState<MegaPanelId | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(null);
        setMobileOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // The mobile sheet scrolls internally; freeze the page behind it so the two
  // scroll contexts don't fight on touch devices.
  useEffect(() => {
    document.documentElement.style.overflow = mobileOpen ? 'hidden' : '';
    return () => {
      document.documentElement.style.overflow = '';
    };
  }, [mobileOpen]);

  return (
    <header
      onMouseLeave={() => setOpen(null)}
      className="sticky top-0 z-[100] border-b border-line backdrop-blur-[18px]"
      style={{ background: 'var(--nav-bg)' }}
    >
      <div className="relative mx-auto flex h-16 max-w-page items-center gap-3 px-4 sm:px-6 md:gap-8 md:px-8">
        <Logo />

        {/* Desktop nav — hover mega panels make no sense on touch, so the whole
            cluster yields to the hamburger sheet below md. */}
        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {TRIGGERS.map((t) => (
            <button
              key={t.id}
              type="button"
              aria-expanded={open === t.id}
              aria-haspopup="true"
              onMouseEnter={() => setOpen(t.id)}
              onClick={() => setOpen(open === t.id ? null : t.id)}
              className={cn(
                'cursor-pointer rounded-lg px-3.5 py-2 text-[14px] font-medium transition-colors duration-150',
                'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
                open === t.id ? 'bg-surface2 text-fg' : 'text-fg2 hover:text-fg',
              )}
            >
              {t.label}
            </button>
          ))}
          <Link
            href="/buyers-guide"
            onMouseEnter={() => setOpen(null)}
            className="rounded-lg px-3.5 py-2 text-[14px] font-medium text-fg2 transition-colors duration-150 hover:text-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Buyer's Guide
          </Link>
          <Link
            href="/pricing"
            onMouseEnter={() => setOpen(null)}
            className="rounded-lg px-3.5 py-2 text-[14px] font-medium text-fg2 transition-colors duration-150 hover:text-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Pricing
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-1.5 md:gap-2.5" onMouseEnter={() => setOpen(null)}>
          <SearchTrigger className="hidden lg:flex" />
          <button
            type="button"
            aria-label="Language: English"
            className="hidden cursor-pointer rounded-lg px-2.5 py-2 text-[13px] font-medium text-fg2 transition-colors duration-150 hover:bg-surface2 hover:text-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent md:block"
          >
            EN
          </button>
          <FavoritesLink />
          <ThemeSwitcher />
          <AccountLink />
          {/*
            "Get started" goes to /tools, not /signup — and that is deliberate.
            RFC-001 §5: "Anonymous-first. Tool pages are never gated." For a product
            whose tools need no account, getting started IS opening a tool. Accounts
            (the AccountLink above) are an opt-in sync layer, not a gate.
          */}
          <Link
            href="/tools"
            className="hidden rounded-[9px] bg-accent px-[18px] py-[9px] text-[14px] font-semibold text-accent-fg transition-[filter] duration-150 hover:brightness-[1.12] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent md:block"
          >
            Get started
          </Link>

          {/* Hamburger — mobile only */}
          <button
            type="button"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
            aria-controls="lt-mobile-menu"
            onClick={() => setMobileOpen((v) => !v)}
            className="flex size-10 cursor-pointer flex-col items-center justify-center gap-[5px] rounded-lg text-fg2 transition-colors duration-150 hover:bg-surface2 hover:text-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent md:hidden"
          >
            <span
              aria-hidden="true"
              className={cn(
                'h-[1.5px] w-[18px] rounded-full bg-current transition-transform duration-200',
                mobileOpen && 'translate-y-[6.5px] rotate-45',
              )}
            />
            <span
              aria-hidden="true"
              className={cn(
                'h-[1.5px] w-[18px] rounded-full bg-current transition-opacity duration-200',
                mobileOpen && 'opacity-0',
              )}
            />
            <span
              aria-hidden="true"
              className={cn(
                'h-[1.5px] w-[18px] rounded-full bg-current transition-transform duration-200',
                mobileOpen && '-translate-y-[6.5px] -rotate-45',
              )}
            />
          </button>
        </div>
      </div>

      <MegaNav open={open} onClose={() => setOpen(null)} />
      {mobileOpen && <MobileMenu onNavigate={() => setMobileOpen(false)} />}
    </header>
  );
}

/**
 * MobileMenu — the below-md replacement for the hover mega panels.
 * A full-width sheet under the 64px bar: primary links, then every category
 * (the Tools panel's content, flattened), then account/pricing. Scrolls
 * internally; any navigation closes it.
 */
function MobileMenu({ onNavigate }: { onNavigate: () => void }) {
  const { enabled, signedIn } = useAccountState();

  return (
    <div
      id="lt-mobile-menu"
      className="absolute inset-x-0 top-full max-h-[calc(100dvh-64px)] overflow-y-auto border-b border-line md:hidden"
      style={{ background: 'var(--nav-panel-bg)', boxShadow: 'var(--card-shadow)' }}
    >
      <nav aria-label="Main" className="flex flex-col gap-1 px-4 py-4">
        <Link
          href="/tools"
          onClick={onNavigate}
          className="rounded-[9px] bg-accent px-4 py-3 text-center text-[14px] font-semibold text-accent-fg"
        >
          Get started — all tools
        </Link>

        <Link
          href="/search"
          onClick={onNavigate}
          className="mt-1 flex items-center gap-2.5 rounded-[9px] border border-line px-4 py-3 text-[14px] text-fg2"
        >
          <span aria-hidden="true">⌕</span> Search tools
        </Link>

        <p className="mt-4 px-2 font-grotesk text-[11px] font-semibold uppercase tracking-[0.13em] text-fg3">
          Categories
        </p>
        {CATEGORIES.map((c) => (
          <Link
            key={c.slug}
            href={c.href}
            onClick={onNavigate}
            className="flex items-center gap-3 rounded-[9px] p-2 transition-colors duration-150 hover:bg-surface2"
          >
            <MonogramChip code={c.code} hue={c.hue} hueOnLight={c.hueOnLight} size={30} />
            <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-fg">{c.name}</span>
            <span className="shrink-0 font-grotesk text-[12px] text-fg3">{c.toolCount}</span>
          </Link>
        ))}

        <div className="mt-3 flex flex-col gap-1 border-t border-line pt-3">
          <Link
            href="/favorites"
            onClick={onNavigate}
            className="rounded-[9px] p-2.5 text-[14px] font-medium text-fg2 hover:bg-surface2 hover:text-fg"
          >
            ♥ My Favorite Tools
          </Link>
          <Link
            href="/buyers-guide"
            onClick={onNavigate}
            className="rounded-[9px] p-2.5 text-[14px] font-medium text-fg2 hover:bg-surface2 hover:text-fg"
          >
            Buyer's Guide
          </Link>
          <Link
            href="/pricing"
            onClick={onNavigate}
            className="rounded-[9px] p-2.5 text-[14px] font-medium text-fg2 hover:bg-surface2 hover:text-fg"
          >
            Pricing
          </Link>
          {enabled && (
            <Link
              href="/account"
              onClick={onNavigate}
              className="rounded-[9px] p-2.5 text-[14px] font-medium text-fg2 hover:bg-surface2 hover:text-fg"
            >
              {signedIn ? 'Account' : 'Log in'}
            </Link>
          )}
        </div>
      </nav>
    </div>
  );
}

/**
 * The header's route into "My Favorite Tools". The count only renders once storage
 * has been read (`hydrated`) — rendering it earlier would show "0" to someone who
 * has favorites, and would mismatch the server HTML on hydration.
 */
function FavoritesLink() {
  const { favorites, hydrated } = useFavorites();
  const count = favorites.size;

  return (
    <Link
      href="/favorites"
      aria-label={
        hydrated && count > 0 ? `My Favorite Tools (${count})` : 'My Favorite Tools'
      }
      className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-[13px] font-medium text-fg2 transition-colors duration-150 hover:bg-surface2 hover:text-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      <span aria-hidden="true" className="text-[15px] leading-none">
        {hydrated && count > 0 ? '♥' : '♡'}
      </span>
      {hydrated && count > 0 && <span aria-hidden="true">{count}</span>}
    </Link>
  );
}

/**
 * The account entry point. Hidden entirely on deployments without accounts
 * configured (`enabled` false), so the header is unchanged there. Otherwise it is
 * "Log in" when signed out and "Account" when signed in — both routing to /account,
 * which renders the right view for the session.
 */
function AccountLink() {
  const { enabled, signedIn } = useAccountState();
  if (!enabled) return null;

  return (
    <Link
      href="/account"
      className="hidden rounded-lg px-2.5 py-2 text-[13px] font-medium text-fg2 transition-colors duration-150 hover:bg-surface2 hover:text-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:block"
    >
      {signedIn ? 'Account' : 'Log in'}
    </Link>
  );
}
