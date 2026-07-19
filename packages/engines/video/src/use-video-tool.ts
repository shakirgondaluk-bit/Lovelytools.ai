'use client';

// lovelytools.ai — Video Engine · React binding.
// The engine instance is created with the island and disposed with it, so a 31 MB
// WASM heap never outlives the page the user is on (RFC-001 §10).
import { useCallback, useEffect, useRef, useState } from 'react';
import { EngineError, type Progress } from '@lovelytools/engines-core';
import { bindingFor } from './registry';
import { VideoEngine } from './video-engine';
import type { VideoOptions, VideoResult } from './types';

export type VideoToolState = 'idle' | 'loading-engine' | 'running' | 'done' | 'error';

export interface UseVideoTool {
  state: VideoToolState;
  progress: Progress | null;
  result: VideoResult | null;
  error: string | null;
  /** True once the multithreaded core is confirmed — the UI notes slower runs. */
  threaded: boolean;
  run: (file: File, options?: VideoOptions, extraFiles?: File[]) => Promise<void>;
  cancel: () => void;
  reset: () => void;
}

export function useVideoTool(slug: string): UseVideoTool {
  const [state, setState] = useState<VideoToolState>('idle');
  const [progress, setProgress] = useState<Progress | null>(null);
  const [result, setResult] = useState<VideoResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [threaded, setThreaded] = useState(false);

  const engineRef = useRef<VideoEngine | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Free the WASM heap when the island unmounts.
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      engineRef.current?.dispose();
      engineRef.current = null;
    };
  }, []);

  const run = useCallback(
    async (file: File, options?: VideoOptions, extraFiles?: File[]) => {
      const binding = bindingFor(slug);
      if (!binding) {
        setState('error');
        setError(`No video capability is wired up for "${slug}".`);
        return;
      }

      setError(null);
      setResult(null);
      setProgress({ pct: 0, stage: 'Starting the engine' });

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        if (!engineRef.current) {
          setState('loading-engine');
          const engine = new VideoEngine();
          await engine.init();
          engineRef.current = engine;
          setThreaded(engine.isThreaded);
        }

        setState('running');
        const output = await engineRef.current.run(
          {
            id: `${slug}-${Date.now()}`,
            input: {
              file,
              capability: binding.capability,
              options: { ...binding.defaults, ...options },
              extraFiles,
            },
          },
          controller.signal,
          setProgress,
        );

        setResult(output);
        setState('done');
      } catch (caught) {
        if (controller.signal.aborted) {
          setState('idle');
          setProgress(null);
          return;
        }
        setState('error');
        setError(
          caught instanceof EngineError
            ? caught.message
            : 'Something went wrong running that. Try again.',
        );
      } finally {
        abortRef.current = null;
      }
    },
    [slug],
  );

  const cancel = useCallback(() => abortRef.current?.abort(), []);

  const reset = useCallback(() => {
    setState('idle');
    setProgress(null);
    setResult(null);
    setError(null);
  }, []);

  return { state, progress, result, error, threaded, run, cancel, reset };
}
