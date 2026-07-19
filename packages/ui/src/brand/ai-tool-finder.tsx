'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { TOTAL_TOOLS } from '@lovelytools/registry';
import { categoryBySlug, type CategorySlug } from '../lib/categories';
import { cn } from '../lib/utils';
import { MonogramChip } from './monogram-chip';

export interface FinderResult {
  slug: string;
  name: string;
  category: CategorySlug;
  /** One plain-English line on why this tool matches. */
  reason: string;
}

const EXAMPLES = [
  'shrink a PDF for email',
  'make my logo background transparent',
  'turn a lecture recording into text',
  'how much is 8.5% APR on 24k?',
];

interface AIToolFinderProps {
  /** Override the network call (tests / storybook / demo). Defaults to POST /api/v1/finder. */
  findTools?: (query: string) => Promise<FinderResult[]>;
  className?: string;
}

/**
 * AIToolFinder — full-width r-24 accent-wash panel, 2 columns (DS §10 #6).
 * POST /api/v1/finder (node, LLM, cached by query hash 7d, rate-limited
 * 10/min — 20 on Pro). Results fade up; loading shows skeleton rows, never
 * spinners.
 */
export function AIToolFinder({ findTools, className }: AIToolFinderProps) {
  const [query, setQuery] = useState('');
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [results, setResults] = useState<FinderResult[]>([]);

  const run = async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed || state === 'loading') return;
    setQuery(trimmed);
    setState('loading');
    try {
      let matches: FinderResult[];
      if (findTools) {
        matches = await findTools(trimmed);
      } else {
        const res = await fetch('/api/v1/finder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: trimmed }),
        });
        if (!res.ok) throw new Error(String(res.status));
        matches = (await res.json()).results;
      }
      setResults(matches.slice(0, 3));
      setState('done');
    } catch {
      setState('error');
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void run(query);
  };

  return (
    <section
      aria-labelledby="ai-finder-heading"
      className={cn('rounded-[24px] border border-line p-8 md:p-14', className)}
      style={{ background: 'linear-gradient(135deg, var(--accent-soft), var(--surface) 60%)' }}
    >
      <div className="grid items-start gap-10 md:grid-cols-2">
        {/* Pitch + examples */}
        <div className="flex flex-col gap-5">
          <p className="font-grotesk text-[11px] font-semibold uppercase tracking-[0.13em] text-accent">
            AI Tool Finder
          </p>
          <h2
            id="ai-finder-heading"
            className="font-grotesk text-[32px] font-bold leading-[1.12] tracking-[-0.03em] text-fg [text-wrap:balance]"
          >
            Describe the task. We&rsquo;ll point at the tool.
          </h2>
          <p className="max-w-[420px] text-[15px] leading-[1.55] text-fg2 [text-wrap:pretty]">
            {TOTAL_TOOLS} tools is a lot of menu. Say what you&rsquo;re trying to do in plain words
            and skip the browsing.
          </p>
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => void run(ex)}
                className="cursor-pointer rounded-full border border-line px-3 py-1.5 text-[12.5px] text-fg2 transition-colors duration-150 hover:border-line2 hover:text-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                &ldquo;{ex}&rdquo;
              </button>
            ))}
          </div>
        </div>

        {/* Input + results */}
        <div className="flex flex-col gap-3">
          <form
            onSubmit={onSubmit}
            className="flex items-center gap-2 rounded-[14px] border border-line2 bg-surface p-2 transition-colors duration-150 focus-within:border-accent"
          >
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="I need to…"
              aria-label="Describe what you need to do"
              className="min-w-0 flex-1 bg-transparent px-2.5 text-[15px] text-fg placeholder:text-fg3 focus:outline-none"
            />
            <button
              type="submit"
              disabled={state === 'loading'}
              className="shrink-0 cursor-pointer rounded-[9px] bg-accent px-[18px] py-[9px] text-[14px] font-semibold text-white transition-[filter] duration-150 hover:brightness-[1.12] disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {state === 'loading' ? 'Thinking…' : 'Find my tool'}
            </button>
          </form>

          {state === 'loading' && (
            <div className="flex flex-col gap-2" aria-hidden="true">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-[64px] animate-lt-pulse rounded-[13px] bg-surface2" />
              ))}
            </div>
          )}

          {state === 'done' && (
            <ul className="flex flex-col gap-2" aria-label="Matching tools">
              {results.map((r, i) => {
                const cat = categoryBySlug(r.category);
                return (
                  <li key={r.slug} className="animate-lt-fadeup" style={{ animationDelay: `${i * 60}ms` }}>
                    <Link
                      href={`/${r.slug}`}
                      className="flex items-center gap-3 rounded-[13px] border border-line bg-surface p-3.5 transition-colors duration-150 hover:border-line2"
                    >
                      <MonogramChip code={cat.code} hue={cat.hue} hueOnLight={cat.hueOnLight} size={34} />
                      <span className="flex min-w-0 flex-col">
                        <span className="text-[14px] font-semibold text-fg">{r.name}</span>
                        <span className="truncate text-[12.5px] text-fg3">{r.reason}</span>
                      </span>
                      <span aria-hidden="true" className="ml-auto text-[14px] text-accent">→</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}

          {state === 'error' && (
            <p role="alert" className="text-[13px]" style={{ color: 'var(--error)' }}>
              The finder is busy — try again in a moment, or browse the categories below.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
