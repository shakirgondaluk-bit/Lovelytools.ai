'use client';
// lovelytools.ai — React hook: one PDF op wired to UploadZone / ProgressBar.
// Generic over the op so every PDF tool page is ~30 lines of UI.
import { useCallback, useEffect, useRef, useState } from 'react';
import { FREE_LIMITS, type EngineLimits } from '@lovelytools/engines-core';
import { PdfEngine } from './pdf-engine';
import { PdfError, type OutputFile, type PdfInput, type PdfOpResult } from './types';

export type PdfToolStatus = 'idle' | 'working' | 'done' | 'error';

interface UsePdfToolOptions {
  limits?: EngineLimits;
  /** Anonymous usage beacon hook-up (counts only, never content). */
  onDone?: (result: PdfOpResult) => void;
}

export function usePdfTool({ limits = FREE_LIMITS, onDone }: UsePdfToolOptions = {}) {
  const engineRef = useRef<PdfEngine | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [status, setStatus] = useState<PdfToolStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState('');
  const [result, setResult] = useState<PdfOpResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const engine = () => (engineRef.current ??= new PdfEngine(limits));

  useEffect(() => () => abortRef.current?.abort(), []);

  /** Convert UploadZone's File[] into PdfInput[] (reads buffers once). */
  const toInputs = useCallback(async (files: File[]): Promise<PdfInput[]> => {
    return Promise.all(files.map(async (f) => ({ buf: await f.arrayBuffer(), name: f.name })));
  }, []);

  /**
   * Run any engine op:
   *   run((e, onP, signal) => e.compress(input, {mode:'raster'}, onP, signal))
   */
  const run = useCallback(
    async (
      op: (
        engine: PdfEngine,
        onProgress: (pct: number, stage: string) => void,
        signal: AbortSignal,
      ) => Promise<PdfOpResult>,
    ) => {
      abortRef.current?.abort();
      abortRef.current = new AbortController();
      setStatus('working');
      setError(null);
      setResult(null);
      setProgress(0);
      try {
        const r = await op(
          engine(),
          (pct, s) => {
            setProgress(pct);
            setStage(s);
          },
          abortRef.current.signal,
        );
        setResult(r);
        setStatus('done');
        onDone?.(r);
      } catch (e) {
        if (e instanceof PdfError && e.code === 'cancelled') {
          setStatus('idle');
          return;
        }
        // A PdfError is expected and its message is written for the user. Anything
        // else is a bug, and the cause must not be swallowed — an engine that fails
        // with a shrug is undebuggable in the field (RFC-001: Sentry across client,
        // server and workers).
        if (!(e instanceof PdfError)) console.error('[lovelytools] pdf op failed', e);
        setError(e instanceof PdfError ? e.message : 'Something went wrong with this file.');
        setStatus('error');
      }
    },
    [onDone],
  );

  const cancel = useCallback(() => abortRef.current?.abort(), []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setStatus('idle');
    setResult(null);
    setError(null);
    setProgress(0);
  }, []);

  const download = useCallback((file: OutputFile) => {
    const url = URL.createObjectURL(new Blob([file.bytes as BlobPart], { type: file.mime }));
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const downloadAll = useCallback(async () => {
    if (!result) return;
    const [only] = result.files;
    if (only && result.files.length === 1) return download(only);
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();
    for (const f of result.files) zip.file(f.name, f.bytes);
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pdf-results.zip';
    a.click();
    URL.revokeObjectURL(url);
  }, [result, download]);

  /** "saved 84%" moment for the compress UI. */
  const savedPct = result
    ? Math.max(0, Math.round((1 - result.stats.bytesOut / result.stats.bytesIn) * 100))
    : 0;

  return { status, progress, stage, result, error, savedPct, toInputs, run, cancel, reset, download, downloadAll };
}
