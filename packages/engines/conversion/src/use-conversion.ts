'use client';
// lovelytools.ai — React hook wiring the engine to UploadZone / ProgressRow.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ConversionEngine } from './engine';
import {
  EngineError,
  FREE_LIMITS,
  type ConversionJob,
  type EngineLimits,
  type FormatId,
} from './types';

interface UseConversionOptions {
  target: FormatId;
  limits?: EngineLimits;
  /** Fired per finished file — hook up the anonymous usage beacon here (counts only). */
  onJobDone?: (job: ConversionJob) => void;
}

export function useConversion({ target, limits = FREE_LIMITS, onJobDone }: UseConversionOptions) {
  const engineRef = useRef<ConversionEngine | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [jobs, setJobs] = useState<ConversionJob[]>([]);
  const [batchError, setBatchError] = useState<string | null>(null);

  const engine = () => (engineRef.current ??= new ConversionEngine(limits));

  useEffect(() => () => {
    abortRef.current?.abort();
    engineRef.current?.destroy();
  }, []);

  const patch = useCallback((id: string, up: Partial<ConversionJob>) => {
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, ...up } : j)));
  }, []);

  /** Hand UploadZone's File[] here. Detects, validates, queues, and starts. */
  const addFiles = useCallback(
    async (files: File[]) => {
      setBatchError(null);
      let prepared: ConversionJob[];
      try {
        prepared = await engine().prepare(files, target);
      } catch (e) {
        setBatchError(e instanceof EngineError ? e.message : 'Something went wrong.');
        return;
      }
      setJobs((prev) => [...prev, ...prepared]);

      abortRef.current ??= new AbortController();
      const signal = abortRef.current.signal;
      await Promise.allSettled(
        prepared.map(async (job) => {
          patch(job.id, { status: 'converting', stage: 'Starting' });
          try {
            const result = await engine().convert(
              job,
              (e) => patch(e.jobId, { progress: e.pct, stage: e.stage }),
              signal,
            );
            patch(job.id, { status: 'done', progress: 100, stage: 'Done', result });
            onJobDone?.({ ...job, status: 'done', progress: 100, stage: 'Done', result });
          } catch (e) {
            const err = e instanceof EngineError ? e : new EngineError('internal', 'Conversion failed.');
            patch(job.id, {
              status: err.code === 'cancelled' ? 'cancelled' : 'error',
              stage: err.message,
              error: err,
            });
          }
        }),
      );
    },
    [target, patch, onJobDone],
  );

  const cancelAll = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  const removeJob = useCallback((id: string) => {
    setJobs((prev) => prev.filter((j) => j.id !== id));
  }, []);

  const reset = useCallback(() => {
    cancelAll();
    setJobs([]);
    setBatchError(null);
  }, [cancelAll]);

  const downloadAll = useCallback(async () => {
    const done = jobs.filter((j) => j.status === 'done' && j.result);
    const [first] = done;
    if (!first?.result) return;
    const blob =
      done.length === 1 ? first.result.blob : await engine().zipResults(done.map((j) => j.result!));
    const name = done.length === 1 ? first.result.filename : 'converted-files.zip';
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }, [jobs]);

  const summary = useMemo(() => {
    const done = jobs.filter((j) => j.status === 'done').length;
    const failed = jobs.filter((j) => j.status === 'error').length;
    const busy = jobs.some((j) => j.status === 'converting' || j.status === 'queued');
    const warnings = jobs.flatMap((j) => j.result?.warnings ?? []);
    return { done, failed, busy, total: jobs.length, warnings: [...new Set(warnings)] };
  }, [jobs]);

  return { jobs, batchError, summary, addFiles, cancelAll, removeJob, reset, downloadAll };
}
