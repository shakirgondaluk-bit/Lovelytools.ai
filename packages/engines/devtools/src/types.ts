// lovelytools.ai — Developer Tools Engine · op contract
export interface DevField {
  label: string;
  value: string;
  /** Render hint. */
  tone?: 'default' | 'positive' | 'negative' | 'muted';
  /** Monospace value (tokens, hashes). Default true. */
  mono?: boolean;
}

export interface DevAnnotation {
  line: number; // 1-based
  column: number; // 1-based
  message: string;
  kind: 'error' | 'match' | 'info';
}

/** A diff change op, consumed by the UI to render add/remove/equal runs. */
export interface DevDiffOp {
  type: 'equal' | 'insert' | 'delete';
  value: string;
}

export interface DevResult {
  output: string;
  /** Labeled rows — JWT claims, URL parts, color spaces. */
  fields?: DevField[];
  /** Line/column markers — JSON errors, regex matches. */
  annotations?: DevAnnotation[];
  /** Present for diff-checker. */
  diff?: DevDiffOp[];
  notes?: string[];
}

export type DevErrorCode = 'invalid-input' | 'parse-error' | 'timeout' | 'unsupported' | 'internal';

export class DevError extends Error {
  constructor(
    public code: DevErrorCode,
    /** Friendly, specific — "Unexpected , at line 14, column 8". */
    message: string,
    /** When known, the editor scrolls here. */
    public position?: { line: number; column: number },
  ) {
    super(message);
    this.name = 'DevError';
  }
}

/* ---------------- op definition ---------------- */

export type OptionSpec =
  | { id: string; label: string; kind: 'select'; default: string; options: Array<{ value: string; label: string }> }
  | { id: string; label: string; kind: 'toggle'; default: boolean }
  | { id: string; label: string; kind: 'text'; default: string; placeholder?: string }
  | { id: string; label: string; kind: 'number'; default: number; min?: number; max?: number };

export type DevOptions = Record<string, string | boolean | number>;

export interface DevOpDef {
  slug: string;
  name: string;
  description: string;
  /** Async ops (WebCrypto) and guarded ops (regex) are debounced by the hook. */
  async?: boolean;
  /** Two inputs (diff-checker) vs one. */
  inputs?: 1 | 2;
  /** Generators ignore the input pane — the UI hides it and offers "Generate again". */
  generator?: boolean;
  /** Output needs a non-text presentation — the UI special-cases these. */
  preview?: 'qrcode';
  options: OptionSpec[];
  run: (input: string, options: DevOptions, secondary?: string) => DevResult | Promise<DevResult>;
  /** CI-checked: run(input, defaults+options, secondary).output must equal expect. */
  vectors?: Array<{ input: string; options?: DevOptions; secondary?: string; expect: string }>;
  /**
   * True for ops whose output is intentionally non-reproducible (password and
   * UUID generation via crypto.getRandomValues) — exempt from "must ship
   * vectors" in CI. A deterministic/seedable "random" generator here would be
   * a security bug, not a testing convenience.
   */
  nondeterministic?: boolean;
}

const REGISTRY = new Map<string, DevOpDef>();

export function defineDevOp(def: DevOpDef): DevOpDef {
  if (REGISTRY.has(def.slug)) throw new Error(`Duplicate dev op: ${def.slug}`);
  REGISTRY.set(def.slug, def);
  return def;
}

export function getDevOp(slug: string): DevOpDef | undefined {
  return REGISTRY.get(slug);
}

export function allDevOps(): DevOpDef[] {
  return [...REGISTRY.values()];
}
