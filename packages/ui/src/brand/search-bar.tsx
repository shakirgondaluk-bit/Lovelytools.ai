'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { TOTAL_TOOLS } from '@lovelytools/registry';
import { cn } from '../lib/utils';
import { KbdHint } from './kbd-hint';

export const SEARCH_INPUT_ID = 'lt-global-search';

// DS §6.2 — placeholder rotates through 6 task phrases every 2.6s.
const PLACEHOLDERS = [
  'Compress a 40 MB PDF…',
  'Remove an image background…',
  'Convert MP4 to GIF…',
  'Count words in an essay…',
  'Format messy JSON…',
  'Split a 200-page PDF…',
];

interface SearchBarProps {
  /** Called on submit. Default: navigates to /search?q= via form GET. */
  onSearch?: (query: string) => void;
  className?: string;
  autoFocus?: boolean;
}

/**
 * SearchBar — hero & global search (DS §6.2).
 * --surface fill, 1px --border2, r-14, card shadow. ⌘K / Ctrl+K focuses it
 * from anywhere; focus swaps the border to --accent (focus-within).
 */
export function SearchBar({ onSearch, className, autoFocus }: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [phrase, setPhrase] = useState(0);

  // Rotate placeholder
  useEffect(() => {
    const t = setInterval(() => setPhrase((p) => (p + 1) % PLACEHOLDERS.length), 2600);
    return () => clearInterval(t);
  }, []);

  // Global ⌘K / Ctrl+K
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    if (!onSearch) return; // fall through to native GET /search?q=
    e.preventDefault();
    const q = inputRef.current?.value.trim();
    if (q) onSearch(q);
  };

  return (
    <form
      action="/search"
      method="get"
      role="search"
      onSubmit={handleSubmit}
      className={cn(
        'flex items-center gap-2 rounded-[14px] border border-line2 bg-surface p-2 shadow-card',
        'transition-colors duration-150 focus-within:border-accent',
        className,
      )}
    >
      <span aria-hidden="true" className="pl-2.5 text-[17px] text-fg3">
        ⌕
      </span>
      <input
        ref={inputRef}
        id={SEARCH_INPUT_ID}
        name="q"
        type="search"
        autoFocus={autoFocus}
        autoComplete="off"
        placeholder={PLACEHOLDERS[phrase]}
        aria-label={`Search ${TOTAL_TOOLS} tools`}
        className="min-w-0 flex-1 bg-transparent text-[16px] text-fg placeholder:text-fg3 focus:outline-none"
      />
      <KbdHint keys="⌘K" className="hidden sm:inline-flex" />
      <button
        type="submit"
        className="cursor-pointer rounded-[9px] bg-accent px-[18px] py-[9px] text-[14px] font-semibold text-white transition-[filter] duration-150 hover:brightness-[1.12] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        Search
      </button>
    </form>
  );
}

/**
 * SearchTrigger — compact header variant (DS §6.2). Focuses the hero/global
 * input when present; otherwise navigates to /search.
 */
export function SearchTrigger({ className }: { className?: string }) {
  const activate = () => {
    const input = document.getElementById(SEARCH_INPUT_ID) as HTMLInputElement | null;
    if (input) {
      input.focus();
      input.select();
    } else {
      window.location.assign('/search');
    }
  };

  return (
    <button
      type="button"
      onClick={activate}
      className={cn(
        'flex cursor-pointer items-center gap-2 rounded-lg border border-line px-3 py-[7px] text-[13px] text-fg3',
        'transition-colors duration-150 hover:border-line2 hover:text-fg2',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
        className,
      )}
    >
      <span aria-hidden="true">⌕</span>
      <span>Search tools</span>
      <KbdHint keys="⌘K" />
    </button>
  );
}
