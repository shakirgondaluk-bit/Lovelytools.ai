'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Logo } from '../primitives/logo';
import { cn } from '../lib/utils';
import { useAccountState } from './account-context';
import { useFavorites } from './favorites';
import { MegaNav, type MegaPanelId } from './mega-nav';
import { SearchTrigger } from './search-bar';
import { ThemeSwitcher } from './theme-switcher';

// A "Resources" trigger sat here. Its panel was six 404s and a link to a blog post
// that was never written — editorial is unbuilt. Restore it with the content.
const TRIGGERS: Array<{ id: MegaPanelId; label: string }> = [
  { id: 'products', label: 'Products' },
  { id: 'solutions', label: 'Solutions' },
];

/**
 * Header — sticky 64px bar, --nav-bg + 18px blur (DS §9).
 * Order: logo · Products · Solutions · Resources · Pricing · [spacer] ·
 * search trigger · EN · theme toggle · Log in · Get started.
 * Mega panels open on trigger mouseenter and close when the pointer leaves
 * the header+panel region (panels render inside <header>) or on Esc.
 */
export function Header() {
  const [open, setOpen] = useState<MegaPanelId | null>(null);

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => e.key === 'Escape' && setOpen(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <header
      onMouseLeave={() => setOpen(null)}
      className="sticky top-0 z-[100] border-b border-line backdrop-blur-[18px]"
      style={{ background: 'var(--nav-bg)' }}
    >
      <div className="relative mx-auto flex h-16 max-w-page items-center gap-8 px-8">
        <Logo />

        <nav aria-label="Main" className="flex items-center gap-1">
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
            href="/pricing"
            onMouseEnter={() => setOpen(null)}
            className="rounded-lg px-3.5 py-2 text-[14px] font-medium text-fg2 transition-colors duration-150 hover:text-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Pricing
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-2.5" onMouseEnter={() => setOpen(null)}>
          <SearchTrigger className="hidden lg:flex" />
          <button
            type="button"
            aria-label="Language: English"
            className="cursor-pointer rounded-lg px-2.5 py-2 text-[13px] font-medium text-fg2 transition-colors duration-150 hover:bg-surface2 hover:text-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
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
            className="rounded-[9px] bg-accent px-[18px] py-[9px] text-[14px] font-semibold text-white transition-[filter] duration-150 hover:brightness-[1.12] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Get started
          </Link>
        </div>
      </div>

      <MegaNav open={open} onClose={() => setOpen(null)} />
    </header>
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
