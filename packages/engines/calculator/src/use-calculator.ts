'use client';
// lovelytools.ai — React hook: fields → validated Decimals → live results,
// synced to URL params (shareable, crawlable, back/forward-safe).
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Decimal } from './decimal';
import {
  CalcError,
  type CalcInputs,
  type CalcResult,
  type CalculatorDef,
  type FieldSpec,
} from './types';

export interface FieldError {
  fieldId: string;
  message: string;
}

export function useCalculator(def: CalculatorDef) {
  // Seed from URL params so shared links restore state.
  const [raw, setRaw] = useState<Record<string, string>>(() => seed(def));
  const urlTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setField = useCallback((id: string, value: string) => {
    setRaw((prev) => ({ ...prev, [id]: value }));
  }, []);

  // Validate + parse. Compute runs on every keystroke — it's pure and instant.
  const { result, errors } = useMemo(() => {
    const errors: FieldError[] = [];
    const inputs: CalcInputs = {};
    for (const f of def.fields) {
      const v = raw[f.id] ?? String(f.default);
      const parsed = parseField(f, v);
      if (parsed.error) {
        errors.push({ fieldId: f.id, message: parsed.error });
      } else {
        inputs[f.id] = parsed.value!;
      }
    }
    if (errors.length > 0) return { result: null, errors };
    try {
      return { result: def.compute(inputs), errors: [] as FieldError[] };
    } catch (e) {
      if (e instanceof CalcError) {
        return { result: null, errors: [{ fieldId: e.fieldId ?? '', message: e.message }] };
      }
      return { result: null, errors: [{ fieldId: '', message: 'Something went wrong — check the inputs.' }] };
    }
  }, [def, raw]);

  // Debounced URL sync (replaceState — no history spam; back/forward still work
  // across navigations because Next's router owns real transitions).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (urlTimer.current) clearTimeout(urlTimer.current);
    urlTimer.current = setTimeout(() => {
      const params = new URLSearchParams();
      for (const f of def.fields) {
        const v = raw[f.id];
        if (v !== undefined && v !== String(f.default)) params.set(f.id, v);
      }
      const qs = params.toString();
      const url = qs ? `${location.pathname}?${qs}` : location.pathname;
      history.replaceState(history.state, '', url);
    }, 350);
    return () => {
      if (urlTimer.current) clearTimeout(urlTimer.current);
    };
  }, [def, raw]);

  const reset = useCallback(() => {
    setRaw(Object.fromEntries(def.fields.map((f) => [f.id, String(f.default)])));
  }, [def]);

  return { raw, setField, result: result as CalcResult | null, errors, reset };
}

/* ---------------- parsing ---------------- */

function seed(def: CalculatorDef): Record<string, string> {
  const out = Object.fromEntries(def.fields.map((f) => [f.id, String(f.default)]));
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(location.search);
    for (const f of def.fields) {
      const v = params.get(f.id);
      if (v !== null && v.length <= 64) out[f.id] = v;
    }
  }
  return out;
}

function parseField(f: FieldSpec, v: string): { value?: CalcInputs[string]; error?: string } {
  if (f.kind === 'select' || f.kind === 'unit') {
    if (f.options && !f.options.some((o) => o.value === v)) return { error: 'Pick an option.' };
    return { value: v };
  }
  if (f.kind === 'date') {
    return v ? { value: v } : { error: 'Pick a date.' };
  }
  if (f.kind === 'text') {
    // The calculator's own compute() parses these (number lists, fractions,
    // times) and raises CalcError with a field-anchored message on bad input.
    if (f.required && v.trim() === '') return { error: 'Required.' };
    return { value: v };
  }
  const cleaned = v.replace(/[$,\s]/g, ''); // forgive "1,250.50" and "$300"
  if (cleaned === '') {
    return f.required ? { error: 'Required.' } : { value: new Decimal(0) };
  }
  let d: Decimal;
  try {
    d = new Decimal(cleaned);
  } catch {
    return { error: 'Numbers only.' };
  }
  if (!d.isFinite()) return { error: 'Numbers only.' };
  if (f.kind === 'integer' && !d.isInteger()) return { error: 'Whole numbers only.' };
  if (f.min !== undefined && d.lt(f.min)) return { error: `Minimum is ${f.min}.` };
  if (f.max !== undefined && d.gt(f.max)) return { error: `Maximum is ${f.max}.` };
  return { value: d };
}
