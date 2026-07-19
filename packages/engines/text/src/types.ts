// lovelytools.ai — Text Engine · op contract
export interface TextStats {
  characters: number; // graphemes (user-perceived), not code units
  charactersNoSpaces: number;
  words: number;
  sentences: number;
  paragraphs: number;
  lines: number;
  /** Minutes at the configured wpm, rounded up to the nearest 0.1. */
  readingTimeMin: number;
  /** Longest word (grapheme length) — powers "readability" hints. */
  longestWord: number;
}

/** A diff change op, consumed by the UI to render add/remove/equal runs. */
export interface DiffOp {
  type: 'equal' | 'insert' | 'delete';
  value: string;
}

export interface TextResult {
  output: string;
  /** Present when the op reports counts (stats, and after-counts on transforms). */
  stats?: TextStats;
  /** Present for diff ops. */
  diff?: DiffOp[];
  /** Non-fatal notes, e.g. "3 invalid base64 characters were ignored." */
  notes?: string[];
}

export type TextErrorCode = 'invalid-input' | 'decode-failed' | 'internal';

export class TextError extends Error {
  constructor(
    public code: TextErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'TextError';
  }
}

/* ---------------- op definition ---------------- */

export type OptionSpec =
  | { id: string; label: string; kind: 'select'; default: string; options: Array<{ value: string; label: string }> }
  | { id: string; label: string; kind: 'toggle'; default: boolean }
  | { id: string; label: string; kind: 'text'; default: string; placeholder?: string }
  | { id: string; label: string; kind: 'number'; default: number; min?: number; max?: number };

export type TextOptions = Record<string, string | boolean | number>;

export interface TextOpDef {
  slug: string;
  name: string;
  description: string;
  /** Two inputs (diff) vs one. */
  inputs: 1 | 2;
  /** Heavy ops are debounced + run in idle time by the hook. */
  heavy?: boolean;
  /** Generators ignore the input pane — the UI hides it and offers "Generate again". */
  generator?: boolean;
  /** Output needs a non-text presentation — the UI special-cases these. */
  preview?: 'handwriting';
  options: OptionSpec[];
  run: (input: string, options: TextOptions, secondary?: string) => TextResult;
  /** CI-checked: run(input, defaults+options, secondary).output must equal expect. */
  vectors?: Array<{ input: string; options?: TextOptions; secondary?: string; expect: string }>;
}

const REGISTRY = new Map<string, TextOpDef>();

export function defineTextOp(def: TextOpDef): TextOpDef {
  if (REGISTRY.has(def.slug)) throw new Error(`Duplicate text op: ${def.slug}`);
  REGISTRY.set(def.slug, def);
  return def;
}

export function getTextOp(slug: string): TextOpDef | undefined {
  return REGISTRY.get(slug);
}

export function allTextOps(): TextOpDef[] {
  return [...REGISTRY.values()];
}
