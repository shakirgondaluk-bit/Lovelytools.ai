'use client';

// lovelytools.ai — Speech Engine · React binding.
// The engine is created with the island and disposed with it (RFC-001 §10).
// Mirrors use-audio-tool: one hook shape per engine, no surprises.
import { useCallback, useEffect, useRef, useState } from 'react';
import { EngineError, type Progress } from '@lovelytools/engines-core';
import { bindingFor } from './registry';
import { SpeechEngine } from './speech-engine';
import type { SpeechOptions, SpeechResult } from './types';

export type SpeechToolState = 'idle' | 'loading-engine' | 'running' | 'done' | 'error';

export interface UseSpeechTool {
  state: SpeechToolState;
  progress: Progress | null;
  /** Live partial transcript while running — token stream, not authoritative. */
  partial: string | null;
  result: SpeechResult | null;
  error: string | null;
  run: (file: File, options?: SpeechOptions) => Promise<void>;
  cancel: () => void;
  reset: () => void;
}

export function useSpeechTool(slug: string): UseSpeechTool {
  const [state, setState] = useState<SpeechToolState>('idle');
  const [progress, setProgress] = useState<Progress | null>(null);
  const [partial, setPartial] = useState<string | null>(null);
  const [result, setResult] = useState<SpeechResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const engineRef = useRef<SpeechEngine | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      engineRef.current?.dispose();
      engineRef.current = null;
    };
  }, []);

  const run = useCallback(
    async (file: File, options?: SpeechOptions) => {
      const binding = bindingFor(slug);
      if (!binding) {
        setState('error');
        setError(`No speech capability is wired up for "${slug}".`);
        return;
      }

      setError(null);
      setResult(null);
      setPartial(null);
      setProgress({ pct: 0, stage: 'Starting the engine' });

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        if (!engineRef.current) {
          setState('loading-engine');
          engineRef.current = new SpeechEngine();
          await engineRef.current.init();
        }

        setState('running');
        const output = await engineRef.current.run(
          {
            id: `${slug}-${Date.now()}`,
            input: {
              file,
              capability: binding.capability,
              options: { ...binding.defaults, ...options },
              onPartial: setPartial,
            },
          },
          controller.signal,
          setProgress,
        );

        setResult(output);
        setPartial(null);
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
    setPartial(null);
    setResult(null);
    setError(null);
  }, []);

  return { state, progress, partial, result, error, run, cancel, reset };
}
