// lovelytools.ai — Calculator Engine · definition contract
import type Decimal from 'decimal.js';

export type FieldKind =
  | 'money'
  | 'number'
  | 'percent'
  | 'integer'
  | 'date'
  | 'select'
  | 'unit'
  /** Free text the calculator parses itself: "4, 8, 15", "1/2", "09:30", "A 3". */
  | 'text';

export interface FieldSpec {
  id: string;
  label: string;
  kind: FieldKind;
  /** Default shown on first load (also the SEO-rendered example). */
  default: string | number;
  required?: boolean;
  min?: number;
  max?: number;
  step?: number;
  /** For 'select' / 'unit' fields. */
  options?: Array<{ value: string; label: string }>;
  /** Suffix hint, e.g. "years", "%". */
  suffix?: string;
  /** Help text under the field. */
  hint?: string;
}

export type CalcErrorCode = 'invalid-input' | 'out-of-domain' | 'internal';

export class CalcError extends Error {
  constructor(
    public code: CalcErrorCode,
    /** Friendly, actionable — shown inline at the offending field. */
    message: string,
    /** Field id the error belongs to (inline placement). */
    public fieldId?: string,
  ) {
    super(message);
    this.name = 'CalcError';
  }
}

/* ---------------- results ---------------- */

export type ValueFormat =
  | { kind: 'money'; currency: string; precision?: number }
  | { kind: 'number'; precision?: number; unit?: string }
  | { kind: 'percent'; precision?: number }
  | { kind: 'duration' } // value = { years, months, days }
  | { kind: 'text' };

export interface ResultValue {
  label: string;
  /** Decimal for money/number (exactness), string/object for text/duration. */
  value: Decimal | number | string | Record<string, number>;
  format: ValueFormat;
  /** Highlight tone in the UI. */
  tone?: 'default' | 'positive' | 'negative';
}

export interface ScheduleTable {
  title: string;
  columns: Array<{ label: string; format: ValueFormat }>;
  /** Row-major; Decimals allowed. Capped at 600 rows (50-year monthly). */
  rows: Array<Array<Decimal | number | string>>;
}

export interface ChartSeries {
  title: string;
  /** x label + one y per series name. Floats OK here — charts, not money. */
  points: Array<{ x: string; [series: string]: string | number }>;
  seriesNames: string[];
}

export interface CalcResult {
  /** The big number. */
  primary: ResultValue;
  secondary: ResultValue[];
  schedule?: ScheduleTable;
  series?: ChartSeries;
  /** Human-readable formula, e.g. "M = P · r(1+r)ⁿ / ((1+r)ⁿ − 1)". */
  formula: string;
  /** "Show your work" steps with substituted values. */
  steps: string[];
}

/* ---------------- definition ---------------- */

/** Parsed, validated inputs: field id → Decimal | string (select/date/unit). */
export type CalcInputs = Record<string, Decimal | string>;

export interface CalculatorDef {
  slug: string;
  name: string;
  category: 'finance' | 'health' | 'date' | 'units' | 'everyday';
  description: string;
  fields: FieldSpec[];
  compute: (inputs: CalcInputs) => CalcResult;
  /** CI-checked test vectors: inputs → expected primary (string-exact). */
  vectors: Array<{ inputs: Record<string, string>; expectPrimary: string }>;
}

const REGISTRY = new Map<string, CalculatorDef>();

export function defineCalculator(def: CalculatorDef): CalculatorDef {
  if (REGISTRY.has(def.slug)) throw new Error(`Duplicate calculator: ${def.slug}`);
  REGISTRY.set(def.slug, def);
  return def;
}

export function getCalculator(slug: string): CalculatorDef | undefined {
  return REGISTRY.get(slug);
}

export function allCalculators(): CalculatorDef[] {
  return [...REGISTRY.values()];
}
