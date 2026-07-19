'use client';
// lovelytools.ai — React hook: live input → DevResult. Sync ops run on
// keystroke; async/guarded ops debounce 150 ms with stale-result protection.
import { useCallback, useEffect, useRef, useState } from 'react';
import { DevError, type DevOpDef, type DevOptions, type DevResult } from './types';

export function useDevTool(def: DevOpDef) {
  const [input, setInput] = useState('');
  const [secondary, setSecondary] = useState('');
  const [options, setOptions] = useState<DevOptions>(() =>
    Object.fromEntries(def.options.map((o) => [o.id, o.default])),
  );
  const [result, setResult] = useState<DevResult | null>(null);
  const [error, setError] = useState<{ message: string; position?: { line: number; column: number } } | null>(null);
  const [computing, setComputing] = useState(false);
  const runId = useRef(0);

  const setOption = useCallback((id: string, value: string | boolean | number) => {
    setOptions((prev) => ({ ...prev, [id]: value }));
  }, []);

  useEffect(() => {
    const id = ++runId.current;

    const apply = (r: DevResult | null, e: typeof error) => {
      if (id !== runId.current) return; // stale — a newer keystroke superseded us
      setResult(r);
      setError(e);
      setComputing(false);
    };

    const exec = async () => {
      try {
        const r = await def.run(input, options, secondary);
        apply(r, null);
      } catch (e) {
        if (e instanceof DevError) apply(null, { message: e.message, position: e.position });
        else apply(null, { message: 'Something went wrong.' });
      }
    };

    if (def.async) {
      setComputing(true);
      const timer = setTimeout(exec, 150);
      return () => clearTimeout(timer);
    }
    void exec();
  }, [def, input, secondary, options]);

  const copy = useCallback(async () => {
    if (result?.output) await navigator.clipboard.writeText(result.output);
  }, [result]);

  return { input, setInput, secondary, setSecondary, options, setOption, result, error, computing, copy };
}
