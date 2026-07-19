'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Category } from '@lovelytools/registry';
import { renderThumbnails, usePdfTool } from '@lovelytools/engine-pdf';
import { Button, ProgressBar, UploadZone, cn } from '@lovelytools/ui';
import { WorkflowSteps, type WorkflowStage } from './workflow-steps';

/** One page as the grid tracks it. Array order IS the export order. */
interface PageThumb {
  /** Stable key across reorders. */
  id: string;
  /** Zero-based index in the ORIGINAL document — what organize() consumes. */
  srcIndex: number;
  url: string;
  w: number;
  h: number;
}

type Phase = 'input' | 'loading' | 'process' | 'running' | 'done' | 'error';

const PHASE_TO_STAGE: Record<Phase, WorkflowStage> = {
  input: 'input',
  loading: 'input',
  process: 'process',
  running: 'process',
  done: 'output',
  error: 'process',
};

/**
 * ReorderRunner — the reorder tool's island (RFC-001 §9).
 *
 * The generic PDF runner asks for a page order as text ("3, 1, 2") — technically
 * functional, useless in practice, because nobody can hold a 40-page reshuffle in
 * their head. This renders the pages and lets you move them, which is the entire
 * point of a reorder tool.
 *
 * Two engine calls, both proven pdf-lib/pdfjs paths: renderThumbnails() to see the
 * pages, organize({ order }) to write the new document. Nothing leaves the device.
 */
export function ReorderRunner({ category }: { category: Category }) {
  const [file, setFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<Phase>('input');
  const [pages, setPages] = useState<PageThumb[]>([]);
  const [loadPct, setLoadPct] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);

  const pdf = usePdfTool();
  const urlsRef = useRef<string[]>([]);

  const revokeAll = useCallback(() => {
    for (const u of urlsRef.current) URL.revokeObjectURL(u);
    urlsRef.current = [];
  }, []);

  // Object URLs are a manual resource — free them when the island unmounts.
  useEffect(() => revokeAll, [revokeAll]);

  const onDrop = useCallback(
    async (files: File[]) => {
      const next = files[0];
      if (!next) return;
      setFile(next);
      setPhase('loading');
      setLoadError(null);
      setLoadPct(0);
      revokeAll();

      try {
        // renderThumbnails copies the buffer internally (openPdfDocument slices), so
        // reading it once here is safe; the export step reads the File again fresh.
        const buf = await next.arrayBuffer();
        const thumbs = await renderThumbnails(buf, 200, (i, n) =>
          setLoadPct(Math.round((i / n) * 100)),
        );
        if (thumbs.length === 0) {
          setLoadError('That PDF has no pages to show.');
          setPhase('error');
          return;
        }
        const built = thumbs.map((t, i): PageThumb => {
          const url = URL.createObjectURL(t.blob);
          urlsRef.current.push(url);
          return { id: `p${t.page}-${i}`, srcIndex: t.page - 1, url, w: t.width, h: t.height };
        });
        setPages(built);
        setPhase('process');
      } catch {
        setLoadError(
          "Couldn't read that PDF's pages. If it's password-protected, unlock it first.",
        );
        setPhase('error');
      }
    },
    [revokeAll],
  );

  const move = useCallback((from: number, to: number) => {
    setPages((prev) => {
      if (to < 0 || to >= prev.length || from === to) return prev;
      const next = prev.slice();
      const [item] = next.splice(from, 1);
      if (!item) return prev;
      next.splice(to, 0, item);
      return next;
    });
  }, []);

  const reverse = useCallback(() => setPages((prev) => prev.slice().reverse()), []);
  const resetOrder = useCallback(
    () => setPages((prev) => prev.slice().sort((a, b) => a.srcIndex - b.srcIndex)),
    [],
  );

  const startOver = useCallback(() => {
    revokeAll();
    setPages([]);
    setFile(null);
    setLoadError(null);
    setPhase('input');
    pdf.reset();
  }, [pdf, revokeAll]);

  const changed = pages.some((p, i) => p.srcIndex !== i);

  const runExport = useCallback(async () => {
    if (!file) return;
    setPhase('running');
    const order = pages.map((p) => p.srcIndex);
    await pdf.run(async (engine, onProgress, signal) => {
      const buf = await file.arrayBuffer();
      return engine.organize({ buf, name: file.name }, { order }, onProgress, signal);
    });
  }, [file, pages, pdf]);

  // usePdfTool drives the actual op; mirror its terminal states into our phase.
  useEffect(() => {
    if (pdf.status === 'done') setPhase('done');
    else if (pdf.status === 'error') setPhase('process');
  }, [pdf.status]);

  const stage = PHASE_TO_STAGE[phase];

  return (
    <div className="flex flex-col gap-6">
      <WorkflowSteps active={stage} hue={category.hue} />

      <div className="rounded-2xl border border-line bg-surface p-6 sm:p-8">
        {/* ── INPUT ─────────────────────────────────────────────────────── */}
        {(phase === 'input' || phase === 'error') && !file && (
          <UploadZone
            accept="application/pdf,.pdf"
            maxFiles={1}
            label="Drop a PDF to rearrange"
            onFiles={onDrop}
            categoryCode={category.code}
            categoryHue={category.hue}
            categoryHueOnLight={category.hueOnLight}
          />
        )}

        {phase === 'loading' && (
          <div className="flex flex-col gap-3 py-6">
            <div className="flex items-center justify-between text-[13px] text-fg2">
              <span>Rendering page previews…</span>
              <span className="font-grotesk">{loadPct}%</span>
            </div>
            <ProgressBar value={loadPct} />
            <p className="text-[12.5px] text-fg3">
              This happens on your device — the file is never uploaded.
            </p>
          </div>
        )}

        {phase === 'error' && loadError && (
          <div className="flex flex-col gap-4">
            <p className="text-[13.5px]" style={{ color: 'var(--error)' }}>
              {loadError}
            </p>
            <Button variant="secondary" onClick={startOver}>
              Choose another file
            </Button>
          </div>
        )}

        {/* ── PROCESS ───────────────────────────────────────────────────── */}
        {(phase === 'process' || phase === 'running') && (
          <div className="flex flex-col gap-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-col">
                <span className="font-grotesk text-[15px] font-semibold text-fg">
                  {pages.length} page{pages.length === 1 ? '' : 's'}
                </span>
                <span className="text-[12.5px] text-fg3">
                  {changed ? 'Order changed — export to save it.' : 'Drag a page, or use the arrows.'}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="chip" onClick={reverse} disabled={phase === 'running'}>
                  Reverse
                </Button>
                <Button
                  variant="chip"
                  onClick={resetOrder}
                  disabled={phase === 'running' || !changed}
                >
                  Reset order
                </Button>
              </div>
            </div>

            <ul
              className="grid grid-cols-2 gap-grid sm:grid-cols-3 lg:grid-cols-5"
              aria-label="PDF pages — drag to reorder"
            >
              {pages.map((page, i) => (
                <li
                  key={page.id}
                  draggable={phase !== 'running'}
                  onDragStart={() => setDragId(page.id)}
                  onDragEnd={() => setDragId(null)}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (!dragId || dragId === page.id) return;
                    const from = pages.findIndex((p) => p.id === dragId);
                    if (from !== -1) move(from, i);
                  }}
                  className={cn(
                    'group relative flex flex-col overflow-hidden rounded-lg border bg-bg2',
                    'transition-[border-color,transform,opacity] duration-hover',
                    dragId === page.id ? 'border-[var(--pg-hue)] opacity-60' : 'border-line hover:border-line2',
                    phase !== 'running' && 'cursor-grab active:cursor-grabbing',
                  )}
                  style={{ '--pg-hue': category.hue } as React.CSSProperties}
                >
                  {/* Position badge — the NEW position, 1-based. */}
                  <span
                    className="absolute left-2 top-2 z-10 grid min-w-[22px] place-items-center rounded-md px-1.5 py-0.5 font-grotesk text-[12px] font-bold text-white shadow-card"
                    style={{ background: category.hue }}
                  >
                    {i + 1}
                  </span>
                  {page.srcIndex !== i && (
                    <span className="absolute right-2 top-2 z-10 rounded-md bg-surface2 px-1.5 py-0.5 text-[10.5px] text-fg3">
                      was {page.srcIndex + 1}
                    </span>
                  )}

                  <div className="flex items-center justify-center bg-white/[0.02] p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={page.url}
                      alt={`Page ${page.srcIndex + 1}`}
                      className="max-h-[180px] w-auto rounded-sm border border-line"
                      draggable={false}
                    />
                  </div>

                  {/* Accessible reorder — drag isn't keyboard-operable, these are. */}
                  <div className="flex items-center justify-between border-t border-line px-2 py-1.5">
                    <button
                      type="button"
                      aria-label={`Move page ${i + 1} earlier`}
                      disabled={i === 0 || phase === 'running'}
                      onClick={() => move(i, i - 1)}
                      className="grid size-6 place-items-center rounded text-fg3 transition-colors hover:text-fg disabled:opacity-30"
                    >
                      ←
                    </button>
                    <span className="font-grotesk text-[11px] text-fg3">page {i + 1}</span>
                    <button
                      type="button"
                      aria-label={`Move page ${i + 1} later`}
                      disabled={i === pages.length - 1 || phase === 'running'}
                      onClick={() => move(i, i + 1)}
                      className="grid size-6 place-items-center rounded text-fg3 transition-colors hover:text-fg disabled:opacity-30"
                    >
                      →
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            {pdf.error && (
              <p className="text-[13.5px]" style={{ color: 'var(--error)' }}>
                {pdf.error}
              </p>
            )}

            {phase === 'running' && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-[12.5px] text-fg2">
                  <span>{pdf.stage || 'Writing the reordered PDF'}</span>
                  <span className="font-grotesk">{pdf.progress}%</span>
                </div>
                <ProgressBar value={pdf.progress} />
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3 border-t border-line pt-5">
              {phase === 'running' ? (
                <Button variant="secondary" onClick={pdf.cancel}>
                  Cancel
                </Button>
              ) : (
                <>
                  <Button onClick={() => void runExport()}>Export reordered PDF</Button>
                  <Button variant="ghost" onClick={startOver}>
                    Choose another file
                  </Button>
                </>
              )}
            </div>
            <p className="text-[12.5px] text-fg3">
              Runs on your device. Open your network inspector and watch — nothing is uploaded.
            </p>
          </div>
        )}

        {/* ── OUTPUT ────────────────────────────────────────────────────── */}
        {phase === 'done' && pdf.result && (
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-2 rounded-lg border border-line bg-bg2 p-4">
              <p className="flex items-center gap-2 text-sm text-fg">
                <span aria-hidden="true" className="text-success">
                  ✓
                </span>
                Reordered {pdf.result.stats.pagesOut} page
                {pdf.result.stats.pagesOut === 1 ? '' : 's'} · {formatBytes(pdf.result.stats.bytesOut)}
              </p>
              {pdf.result.warnings.map((w) => (
                <p key={w} className="text-[12.5px] text-fg3">
                  {w}
                </p>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={() => void pdf.downloadAll()}>Download reordered PDF</Button>
              <Button variant="ghost" onClick={startOver}>
                Reorder another
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function formatBytes(n: number): string {
  if (n >= 1_048_576) return `${(n / 1_048_576).toFixed(1)} MB`;
  if (n >= 1024) return `${Math.round(n / 1024)} KB`;
  return `${n} B`;
}
