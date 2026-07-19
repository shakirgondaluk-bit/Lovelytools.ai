'use client';
// lovelytools.ai — React hook: live text input → result. Light ops run on every
// keystroke; heavy ops (diff) debounce and yield to idle time with a real
// "computing" state.
import { useCallback, useEffect, useRef, useState } from 'react';
import { TextError, type TextOpDef, type TextOptions, type TextResult } from './types';

const HEAVY_THRESHOLD = 20_000; // chars per side before diff yields to idle

export function useTextTool(def: TextOpDef) {
  const [input, setInput] = useState('');
  const [secondary, setSecondary] = useState(''); // diff's second pane
  const [options, setOptions] = useState<TextOptions>(() =>
    Object.fromEntries(def.options.map((o) => [o.id, o.default])),
  );
  const [result, setResult] = useState<TextResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [computing, setComputing] = useState(false);
  const idleHandle = useRef<number | null>(null);

  const setOption = useCallback((id: string, value: string | boolean | number) => {
    setOptions((prev) => ({ ...prev, [id]: value }));
  }, []);

  useEffect(() => {
    const heavy = def.heavy && (input.length > HEAVY_THRESHOLD || secondary.length > HEAVY_THRESHOLD);

    const compute = () => {
      try {
        const r = def.run(input, options, secondary);
        setResult(r);
        setError(null);
      } catch (e) {
        setResult(null);
        setError(e instanceof TextError ? e.message : 'Something went wrong.');
      } finally {
        setComputing(false);
      }
    };

    if (idleHandle.current !== null) cancelIdle(idleHandle.current);

    if (heavy) {
      setComputing(true);
      const timer = setTimeout(() => {
        idleHandle.current = requestIdle(compute);
      }, 200);
      return () => clearTimeout(timer);
    }

    compute();
  }, [def, input, secondary, options]);

  const copy = useCallback(async () => {
    if (result?.output) await navigator.clipboard.writeText(result.output);
  }, [result]);

  const download = useCallback(() => {
    if (!result?.output) return;
    const blob = new Blob([result.output], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${def.slug}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [result, def.slug]);

  return {
    input, setInput,
    secondary, setSecondary,
    options, setOption,
    result, error, computing,
    copy, download,
  };
}

/* requestIdleCallback with a setTimeout fallback (Safari). */
function requestIdle(fn: () => void): number {
  if (typeof requestIdleCallback !== 'undefined') return requestIdleCallback(fn) as unknown as number;
  return setTimeout(fn, 0) as unknown as number;
}
function cancelIdle(handle: number): void {
  if (typeof cancelIdleCallback !== 'undefined') cancelIdleCallback(handle);
  else clearTimeout(handle);
}
