'use client';
// lovelytools.ai — React hook: batch image ops wired to UploadZone/ProgressRow.
import { useCallback, useEffect, useRef, useState } from 'react';
import { FREE_LIMITS, type EngineLimits } from '@lovelytools/engines-core';
import { ImageEngine } from './image-engine';
import {
  ImageError,
  type DecodedImage,
  type ImageOpResult,
  type OutputImage,
} from './types';

export interface ImageJob {
  id: string;
  name: string;
  status: 'queued' | 'working' | 'done' | 'error';
  progress: number;
  stage: string;
  result?: ImageOpResult;
  error?: string;
  /** Preview URL for the source (revoked on reset). */
  previewUrl: string;
}

interface UseImageToolOptions {
  limits?: EngineLimits;
  onDone?: (result: ImageOpResult) => void;
}

let uid = 0;

export function useImageTool({ limits = FREE_LIMITS, onDone }: UseImageToolOptions = {}) {
  const engineRef = useRef<ImageEngine | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const openImages = useRef<DecodedImage[]>([]);
  const urls = useRef<string[]>([]);
  const [jobs, setJobs] = useState<ImageJob[]>([]);
  const [batchError, setBatchError] = useState<string | null>(null);

  const engine = () => (engineRef.current ??= new ImageEngine(limits));

  useEffect(
    () => () => {
      abortRef.current?.abort();
      engineRef.current?.close(openImages.current);
      urls.current.forEach((u) => URL.revokeObjectURL(u));
    },
    [],
  );

  const patch = useCallback((id: string, up: Partial<ImageJob>) => {
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, ...up } : j)));
  }, []);

  /**
   * Hand UploadZone's File[] plus the op to run per image:
   *   runBatch(files, (engine, img, source, onP, signal) =>
   *     engine.compress(img, { targetBytes: 500_000 }, onP, signal, source))
   *
   * `source` is the original File behind `img` — ops that need the exact
   * original bytes (compress's "never ship a bigger file" swap, image-to-base64,
   * base64-to-image's passthrough) read it from here rather than re-fetching.
   */
  const runBatch = useCallback(
    async (
      files: File[],
      op: (
        engine: ImageEngine,
        img: DecodedImage,
        source: File,
        onProgress: (pct: number, stage: string) => void,
        signal: AbortSignal,
      ) => Promise<ImageOpResult>,
    ) => {
      setBatchError(null);
      let decoded: DecodedImage[];
      try {
        decoded = await engine().open(files);
      } catch (e) {
        setBatchError(e instanceof ImageError ? e.message : 'Something went wrong.');
        return;
      }
      openImages.current.push(...decoded);

      // open() is Promise.all(files.map(decodeImage)), so decoded is 1:1 with files in
      // order. Pairing each image with its job here keeps that explicit — the loop
      // below then walks one array instead of indexing three in lockstep.
      const queued = decoded.map((img, i) => {
        const source = files[i]!; // decoded is Promise.all(files.map(...)) — 1:1, always present
        const previewUrl = URL.createObjectURL(source);
        urls.current.push(previewUrl);
        const job: ImageJob = {
          id: `img-${++uid}`,
          name: img.name,
          status: 'queued',
          progress: 0,
          stage: 'Queued',
          previewUrl,
        };
        return { img, source, job };
      });
      setJobs((prev) => [...prev, ...queued.map((q) => q.job)]);

      abortRef.current ??= new AbortController();
      const signal = abortRef.current.signal;

      // Sequential: canvas work is memory-heavy; parallel decode already happened.
      for (const { img, source, job } of queued) {
        patch(job.id, { status: 'working', stage: 'Starting' });
        try {
          const result = await op(
            engine(),
            img,
            source,
            (pct, stage) => patch(job.id, { progress: pct, stage }),
            signal,
          );
          patch(job.id, { status: 'done', progress: 100, stage: 'Done', result });
          onDone?.(result);
        } catch (e) {
          if (e instanceof ImageError && e.code === 'cancelled') {
            patch(job.id, { status: 'error', stage: 'Cancelled', error: 'Cancelled' });
            break;
          }
          // An ImageError is expected and its message is written for the user.
          // Anything else is a bug, and the cause must not be swallowed — an
          // engine that fails with a shrug is undebuggable in the field.
          if (!(e instanceof ImageError)) console.error('[lovelytools] image op failed', e);
          patch(job.id, {
            status: 'error',
            stage: 'Failed',
            error: e instanceof ImageError ? e.message : 'Something went wrong with this image.',
          });
        }
      }
    },
    [patch, onDone],
  );

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  const reset = useCallback(() => {
    cancel();
    engineRef.current?.close(openImages.current);
    openImages.current = [];
    urls.current.forEach((u) => URL.revokeObjectURL(u));
    urls.current = [];
    setJobs([]);
    setBatchError(null);
  }, [cancel]);

  const download = useCallback((file: OutputImage) => {
    const url = URL.createObjectURL(file.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const downloadAll = useCallback(async () => {
    const done = jobs.filter((j) => j.status === 'done' && j.result);
    const files = done.flatMap((j) => j.result!.files);
    const [only] = files;
    if (!only) return;
    if (files.length === 1) return download(only);
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();
    for (const f of files) zip.file(f.name, f.blob);
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'images.zip';
    a.click();
    URL.revokeObjectURL(url);
  }, [jobs, download]);

  return { jobs, batchError, runBatch, cancel, reset, download, downloadAll };
}
