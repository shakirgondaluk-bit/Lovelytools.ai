// lovelytools.ai — registry: import every calculator once; tool pages and the
// sitemap read from here. Adding a calculator = adding one file + one import.
import { Decimal } from './decimal';
import { allCalculators, getCalculator, type CalculatorDef, type CalcInputs } from './types';

import './calculators/loan';
import './calculators/mortgage';
import './calculators/compound-interest';
import './calculators/percentage';
import './calculators/bmi';
import './calculators/date-diff';
import './calculators/unit-convert';
import './calculators/tip-split';
import './calculators/dates-more';
import './calculators/stats';
import './calculators/math-misc';
import './calculators/health';
import './calculators/fertility';
import './calculators/finance-more';
import './calculators/salary';
import './calculators/scientific';
import './calculators/unit-converters';
import './calculators/words-roman';

export { allCalculators, getCalculator };

/**
 * Calculator-engine tools that need a capability the engine genuinely doesn't
 * have. Same honesty mechanism as the other engines' NOT_IMPLEMENTED maps.
 */
export const CALCULATOR_NOT_IMPLEMENTED: Record<string, string> = {
  'currency-converter':
    'needs live exchange rates. A static table would silently misprice money the day after it shipped, and fetching daily rates means calling a third-party API — which this product’s "nothing leaves your device" promise treats as a product decision, not a wiring gap',
};

export const notImplementedReason = (slug: string): string | undefined =>
  CALCULATOR_NOT_IMPLEMENTED[slug];
export * from './types';
export { Decimal, D, roundMoney } from './decimal';

/** generateStaticParams() source for /[calculator] pages. */
export function calculatorSlugs(): string[] {
  return allCalculators().map((c) => c.slug);
}

/**
 * CI test runner: every definition's vectors are executed and compared
 * string-exact against the formatted primary value.
 */
export function runVectors(): Array<{ slug: string; pass: boolean; got: string; want: string }> {
  const out: Array<{ slug: string; pass: boolean; got: string; want: string }> = [];
  for (const def of allCalculators()) {
    for (const v of def.vectors) {
      const inputs = parseVectorInputs(def, v.inputs);
      let got: string;
      try {
        const r = def.compute(inputs);
        got = primaryToString(r.primary.value);
      } catch (e) {
        got = `ERROR: ${(e as Error).message}`;
      }
      out.push({ slug: def.slug, pass: got === v.expectPrimary, got, want: v.expectPrimary });
    }
  }
  return out;
}

function parseVectorInputs(def: CalculatorDef, raw: Record<string, string>): CalcInputs {
  const inputs: CalcInputs = {};
  for (const f of def.fields) {
    const val = raw[f.id] ?? String(f.default);
    inputs[f.id] =
      f.kind === 'select' || f.kind === 'date' || f.kind === 'unit' || f.kind === 'text'
        ? val
        : new Decimal(val);
  }
  return inputs;
}

function primaryToString(v: unknown): string {
  if (v && typeof v === 'object' && 'years' in (v as object)) {
    const d = v as { years: number; months: number; days: number };
    return `${d.years}y ${d.months}m ${d.days}d`;
  }
  return String(v);
}
