'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useRef, useState } from 'react';
import { AffiliateIcon } from '@/components/templates/affiliate-icons';
import type { DiscoveryResult } from '@/lib/product-finder/discovery-service';
import { detectInput } from '@/lib/product-finder/input';
import { cacheResult, FilterChips, MAX_COMPARE, ResultSkeleton } from './finder-shared';
import { ProductCard } from './product-card';
import { SearchProgress } from './search-progress';

/**
 * The Product Finder search island.
 *
 * Discovery itself runs behind /api/product-finder/search — provider
 * credentials are server-only — so this component owns input, state and
 * presentation and nothing else. The same `detectInput` classifier the API uses
 * runs here too, purely to tell the user what we think they typed before they
 * commit to it; the server re-classifies and remains authoritative.
 */

/**
 * Only used for the client-side "we think this is a link/keyword" hint. The
 * server applies the real configured marketplace (PRODUCT_MARKETPLACE).
 */
const HINT_MARKETPLACE = 'amazon.co.uk';

const EXAMPLES = ['cordless drill', 'pressure washer', 'laser level', 'egg boiler'];

type Status = 'idle' | 'loading' | 'error' | 'done';

export function ProductFinderView() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DiscoveryResult | null>(null);
  const [selected, setSelected] = useState<string[]>([]);

  const hint = useMemo(() => {
    const parsed = detectInput(query, HINT_MARKETPLACE);
    if (!query.trim()) return null;
    if (!parsed) return { tone: 'warn' as const, text: 'That Amazon link has no readable product ID — paste the full link containing /dp/.' };
    if (parsed.kind === 'asin') return { tone: 'ok' as const, text: `Amazon product detected — ASIN ${parsed.asin}` };
    return { tone: 'ok' as const, text: 'Searching by keyword' };
  }, [query]);

  const search = useCallback(
    async (raw: string) => {
      const trimmed = raw.trim();
      if (!trimmed) {
        setError('Enter a product name, or paste an Amazon product link.');
        setStatus('error');
        return;
      }

      setStatus('loading');
      setError(null);
      setSelected([]);

      try {
        const response = await fetch('/api/product-finder/search', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ query: trimmed }),
        });
        const payload = (await response.json()) as DiscoveryResult & { error?: string };

        if (!response.ok) {
          setError(payload.error ?? 'Something went wrong. Try again in a moment.');
          setResult(null);
          setStatus('error');
          return;
        }

        setResult(payload);
        cacheResult(payload);
        setStatus('done');
        // Move focus to the results heading so keyboard and screen-reader users
        // land on the answer rather than back at the top of the form.
        requestAnimationFrame(() => resultsRef.current?.focus());
      } catch {
        setError('Could not reach the finder. Check your connection and try again.');
        setResult(null);
        setStatus('error');
      }
    },
    [],
  );

  const toggleCompare = useCallback((asin: string) => {
    setSelected((current) =>
      current.includes(asin)
        ? current.filter((a) => a !== asin)
        : current.length >= MAX_COMPARE
          ? current
          : [...current, asin],
    );
  }, []);

  const openComparison = useCallback(() => {
    if (!result || selected.length < 2) return;
    const params = new URLSearchParams({
      asins: selected.join(','),
      market: result.query.marketplace,
    });
    router.push(`/product-finder/compare?${params.toString()}`);
  }, [result, router, selected]);

  return (
    <div className="flex flex-col gap-8">
      {/* ── Search ───────────────────────────────────────────────── */}
      <form
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          void search(query);
        }}
      >
        <label htmlFor="pf-query" className="text-[13px] font-semibold text-fg2">
          What are you shopping for?
        </label>
        <div className="flex flex-col gap-2.5 sm:flex-row">
          <div className="relative flex-1">
            <AffiliateIcon
              name="shopping-cart"
              className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-fg3"
              aria-hidden="true"
            />
            <input
              id="pf-query"
              ref={inputRef}
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cordless drill — or paste an Amazon product link"
              autoComplete="off"
              spellCheck={false}
              aria-describedby="pf-hint"
              className="h-[52px] w-full rounded-full border border-line bg-surface pl-11 pr-4 text-[15px] text-fg outline-none transition-colors placeholder:text-fg3 hover:border-line2 focus-visible:border-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            />
          </div>
          <button
            type="submit"
            disabled={status === 'loading'}
            className="inline-flex h-[52px] cursor-pointer items-center justify-center gap-2 rounded-full bg-accent px-7 text-[15px] font-bold text-accent-fg transition-transform hover:scale-[1.02] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-wait disabled:opacity-70"
          >
            {status === 'loading' ? 'Finding…' : 'Find best products'}
          </button>
        </div>

        <p
          id="pf-hint"
          className={`min-h-[18px] text-[12.5px] ${hint?.tone === 'warn' ? 'text-danger' : 'text-fg3'}`}
        >
          {hint?.text ?? 'Works with a product name, a full Amazon link, or a bare ASIN.'}
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[12.5px] text-fg3">Try:</span>
          {EXAMPLES.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => {
                setQuery(example);
                void search(example);
              }}
              className="cursor-pointer rounded-full border border-line px-3 py-1.5 text-[12.5px] font-medium text-fg2 transition-colors hover:border-line2 hover:text-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {example}
            </button>
          ))}
        </div>
      </form>

      {/* ── Status ───────────────────────────────────────────────── */}
      {/* Loading is announced by SearchProgress's own live region, stage by
          stage — two live regions describing the same wait would double up. */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {status === 'error' && error}
        {status === 'done' && result && `${result.results.length} products found and ranked.`}
      </div>

      {status === 'loading' && (
        <div className="flex flex-col gap-6">
          <SearchProgress />
          <div className="grid grid-cols-1 gap-grid md:grid-cols-2 lg:grid-cols-3">
            <ResultSkeleton />
            <ResultSkeleton />
            <ResultSkeleton />
          </div>
        </div>
      )}

      {status === 'error' && error && (
        <div className="flex flex-col items-start gap-3 rounded-2xl border border-line border-l-4 border-l-danger bg-surface p-6">
          <h2 className="flex items-center gap-2.5 font-grotesk text-[17px] font-bold text-fg">
            <AffiliateIcon name="alert-triangle" strokeWidth={2} className="size-5 text-danger" aria-hidden="true" />
            No results
          </h2>
          <p className="max-w-[60ch] text-[14px] leading-relaxed text-fg2">{error}</p>

          {/* An empty result must not be a dead end — give both ways forward:
              re-run against something we do cover, or go read the reviews. */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {EXAMPLES.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => {
                  setQuery(example);
                  void search(example);
                }}
                className="cursor-pointer rounded-full border border-line px-3 py-1.5 text-[12.5px] font-medium text-fg2 transition-colors hover:border-line2 hover:text-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                Try “{example}”
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.focus()}
              className="cursor-pointer rounded-full border border-line px-4 py-2 text-[13px] font-semibold text-fg transition-colors hover:border-line2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Edit your search
            </button>
            <Link
              href="/buyers-guide"
              className="rounded-full bg-accent px-4 py-2 text-[13px] font-bold text-accent-fg transition-transform hover:scale-[1.02] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Browse everything we&rsquo;ve reviewed →
            </Link>
          </div>
        </div>
      )}

      {/* ── Results ──────────────────────────────────────────────── */}
      {status === 'done' && result && (
        <div className="flex flex-col gap-6">
          <div ref={resultsRef} tabIndex={-1} className="flex flex-col gap-4 outline-none">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="flex flex-col gap-1.5">
                <h2 className="font-grotesk text-[22px] font-bold tracking-[-0.02em] text-fg">
                  Top {result.results.length} for{' '}
                  <span className="text-accent">
                    {result.query.keyword ?? result.query.asin ?? result.query.raw}
                  </span>
                </h2>
                <p className="text-[13px] text-fg3">
                  {result.candidateCount} candidate{result.candidateCount === 1 ? '' : 's'} considered · ranked by{' '}
                  {result.engine === 'claude' ? 'signal scoring with Claude-written analysis' : 'signal scoring'} ·
                  source: {result.provider.label}
                </p>
              </div>
              <p className="text-[12.5px] text-fg3">Select 2–3 products to compare them side by side.</p>
            </div>

            <FilterChips filters={result.filters} />

            {result.notes.map((note) => (
              <p key={note} className="text-[12px] text-fg3">
                {note}
              </p>
            ))}
          </div>

          {/* Two tiers, labelled. A cheaper product sitting unexplained below a
              dearer one reads as a worse result rather than a deliberate
              value pick, so the split is stated rather than implied. */}
          {(() => {
            const cheaper = result.results.filter((r) => r.slot === 'cheaper-alternative');
            const leading = result.results.filter((r) => r.slot !== 'cheaper-alternative');

            const grid = (items: typeof result.results) => (
              <div className="grid grid-cols-1 items-stretch gap-grid md:grid-cols-2 lg:grid-cols-3">
                {items.map((item) => (
                  <ProductCard
                    key={item.product.asin}
                    item={item}
                    selected={selected.includes(item.product.asin)}
                    selectionCount={selected.length}
                    onToggleCompare={toggleCompare}
                  />
                ))}
              </div>
            );

            if (cheaper.length === 0) return grid(result.results);

            return (
              <div className="flex flex-col gap-8">
                {grid(leading)}
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1">
                    <h3 className="font-grotesk text-[17px] font-bold tracking-[-0.02em] text-fg">
                      Cheaper alternatives
                    </h3>
                    <p className="text-[13px] text-fg2">
                      {cheaper.length === 1 ? 'This one matches' : 'These match'} every word you searched for and
                      {cheaper.length === 1 ? ' undercuts' : ' undercut'} all of the above on price
                      {cheaper.length === 1 ? ', and it is' : ', and they are'} the best reviewed of the cheaper
                      options rather than simply the cheapest.
                    </p>
                  </div>
                  {grid(cheaper)}
                </div>
              </div>
            );
          })()}

          {result.comparison && (
            <div className="rounded-2xl border border-line bg-accent-soft p-6">
              <h3 className="mb-2 flex items-center gap-2 font-grotesk text-[16px] font-bold text-accent">
                <AffiliateIcon name="award" className="size-[15px]" aria-hidden="true" />
                The short version
              </h3>
              <p className="max-w-[80ch] text-[14px] leading-relaxed text-fg2">{result.comparison.summary}</p>
            </div>
          )}

          <p className="border-t border-line pt-5 text-[12px] text-fg3">
            As an Amazon Associate, lovelytools.ai earns from qualifying purchases. Links on this page may earn us a
            commission at no extra cost to you. Prices and availability are read from Amazon and can change at any
            time — always check the live listing before ordering.
          </p>
        </div>
      )}

      {/* ── Compare tray ─────────────────────────────────────────── */}
      {selected.length > 0 && result && (
        <div className="sticky bottom-4 z-40 mx-auto flex w-full max-w-[560px] flex-wrap items-center justify-between gap-3 rounded-full border border-line px-5 py-3 shadow-card" style={{ background: 'var(--nav-panel-bg)' }}>
          <span className="text-[13px] font-semibold text-fg">
            {selected.length} selected
            <span className="ml-1.5 font-normal text-fg3">
              {selected.length < 2 ? '· pick one more to compare' : `· up to ${MAX_COMPARE}`}
            </span>
          </span>
          <span className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelected([])}
              className="cursor-pointer rounded-full px-3 py-1.5 text-[12.5px] font-semibold text-fg2 transition-colors hover:text-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={openComparison}
              disabled={selected.length < 2}
              className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-full bg-accent px-5 text-[13px] font-bold text-accent-fg transition-transform hover:scale-[1.02] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-40"
            >
              <AffiliateIcon name="layers" strokeWidth={2} className="size-4" aria-hidden="true" />
              Compare
            </button>
          </span>
        </div>
      )}

      {status === 'idle' && (
        <div className="rounded-2xl border border-line bg-surface p-6">
          <h2 className="mb-3 font-grotesk text-[16px] font-bold text-fg">How the ranking works</h2>
          <ol className="flex flex-col gap-2 text-[13.5px] leading-relaxed text-fg2">
            <li>1. Candidates are gathered for your keyword, or for the ASIN in the link you paste.</li>
            <li>2. Filters run in order: keyword relevance, rating of 4.0+, free delivery, discounts preferred, in stock.</li>
            <li>
              3. Each survivor is scored 0–100 across six weighted signals, and the top three are shown with the
              reasoning behind every number.
            </li>
          </ol>
          <p className="mt-4 text-[13px] text-fg3">
            Already know what you want?{' '}
            <Link href="/buyers-guide" className="font-semibold text-accent hover:opacity-80">
              Read our full reviews
            </Link>
            .
          </p>
        </div>
      )}
    </div>
  );
}
