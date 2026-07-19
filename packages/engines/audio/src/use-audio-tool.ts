'use client';

// lovelytools.ai — Audio Engine · React binding.
// The engine is created with the island and disposed with it (RFC-001 §10).
import { useCallback, useEffect, useRef, useState } from 'react';
import { EngineError, type Progress } from '@lovelytools/engines-core';
import { AudioEngine } from './audio-engine';
import { bindingFor } from './registry';
import type { AudioOptions, AudioResult } from './types';

export type AudioToolState = 'idle' | 'loading-engine' | 'running' | 'done' | 'error';

export interface UseAudioTool {
  state: AudioToolState;
  progress: Progress | null;
  result: AudioResult | null;
  error: string | null;
  run: (file: File, options?: AudioOptions, extraFiles?: File[]) => Promise<void>;
  cancel: () => void;
  reset: () => void;
}

export function useAudioTool(slug: string): UseAudioTool {
  const [state, setState] = useState<AudioToolState>('idle');
  const [progress, setProgress] = useState<Progress | null>(null);
  const [result, setResult] = useState<AudioResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const engineRef = useRef<AudioEngine | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      engineRef.current?.dispose();
      engineRef.current = null;
    };
  }, []);

  const run = useCallback(
    async (file: File, options?: AudioOptions, extraFiles?: File[]) => {
      const binding = bindingFor(slug);
      if (!binding) {
        setState('error');
        setError(`No audio capability is wired up for "${slug}".`);
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
          const engine = new AudioEngine();
          await engine.init();
          engineRef.current = engine;
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

  return { state, progress, result, error, run, cancel, reset };
}
