// lovelytools.ai — fractions (exact BigInt arithmetic), ratios, GPA, and
// percent change.
import { Decimal } from '../decimal';
import { CalcError, defineCalculator, type CalcInputs, type CalcResult } from '../types';

/* ---------------- fractions ---------------- */

interface Frac { n: bigint; d: bigint }

const gcd = (a: bigint, b: bigint): bigint => (b === 0n ? (a < 0n ? -a : a) : gcd(b, a % b));

function simplify(f: Frac): Frac {
  if (f.d === 0n) throw new CalcError('out-of-domain', 'Division by zero — a denominator became 0.');
  const g = gcd(f.n, f.d);
  // Keep the sign on the numerator.
  const sign = f.d < 0n ? -1n : 1n;
  return { n: (f.n / g) * sign, d: (f.d / g) * sign };
}

/** "1/2" · "2 1/4" (mixed) · "3" (whole) — negatives allowed on the front. */
function parseFrac(raw: string, fieldId: string): Frac {
  const s = raw.trim();
  const mixed = /^(-?\d+)\s+(\d+)\/(\d+)$/.exec(s);
  if (mixed) {
    const whole = BigInt(mixed[1]!);
    const n = BigInt(mixed[2]!);
    const d = BigInt(mixed[3]!);
    if (d === 0n) throw new CalcError('invalid-input', 'Denominator can’t be 0.', fieldId);
    const sign = whole < 0n ? -1n : 1n;
    return { n: whole * d + sign * n, d };
  }
  const plain = /^(-?\d+)\/(-?\d+)$/.exec(s);
  if (plain) {
    const d = BigInt(plain[2]!);
    if (d === 0n) throw new CalcError('invalid-input', 'Denominator can’t be 0.', fieldId);
    return { n: BigInt(plain[1]!), d };
  }
  const whole = /^(-?\d+)$/.exec(s);
  if (whole) return { n: BigInt(whole[1]!), d: 1n };
  throw new CalcError('invalid-input', 'Write a fraction like 3/4, 2 1/4, or a whole number.', fieldId);
}

const fracString = (f: Frac): string => (f.d === 1n ? `${f.n}` : `${f.n}/${f.d}`);

function mixedString(f: Frac): string {
  if (f.d === 1n || (f.n < 0n ? -f.n : f.n) < f.d) return fracString(f);
  const whole = f.n / f.d;
  const rest = (f.n < 0n ? -f.n : f.n) % f.d;
  return rest === 0n ? `${whole}` : `${whole} ${rest}/${f.d}`;
}

export const fraction = defineCalculator({
  slug: 'fraction-calculator',
  name: 'Fraction Calculator',
  category: 'everyday',
  description: 'Add, subtract, multiply and divide fractions — exact, always simplified.',
  fields: [
    { id: 'a', label: 'First fraction', kind: 'text', default: '1/2', required: true, hint: 'e.g. 3/4, 2 1/4, or 5' },
    { id: 'op', label: 'Operation', kind: 'select', default: 'add', options: [
      { value: 'add', label: '+ add' }, { value: 'sub', label: '− subtract' },
      { value: 'mul', label: '× multiply' }, { value: 'div', label: '÷ divide' },
    ] },
    { id: 'b', label: 'Second fraction', kind: 'text', default: '3/4', required: true },
  ],
  compute(inputs: CalcInputs): CalcResult {
    const a = parseFrac(inputs.a as string, 'a');
    const b = parseFrac(inputs.b as string, 'b');
    const op = inputs.op as string;
    if (op === 'div' && b.n === 0n) throw new CalcError('out-of-domain', 'Can’t divide by zero.', 'b');

    const raw: Frac =
      op === 'add' ? { n: a.n * b.d + b.n * a.d, d: a.d * b.d } :
      op === 'sub' ? { n: a.n * b.d - b.n * a.d, d: a.d * b.d } :
      op === 'mul' ? { n: a.n * b.n, d: a.d * b.d } :
      { n: a.n * b.d, d: a.d * b.n };
    const r = simplify(raw);
    const OP = { add: '+', sub: '−', mul: '×', div: '÷' }[op]!;
    const decimal = new Decimal(r.n.toString()).div(r.d.toString());

    return {
      primary: { label: `${fracString(a)} ${OP} ${fracString(b)}`, value: fracString(r), format: { kind: 'text' } },
      secondary: [
        { label: 'As a mixed number', value: mixedString(r), format: { kind: 'text' } },
        { label: 'As a decimal', value: decimal.toSignificantDigits(10), format: { kind: 'number' } },
      ],
      formula: op === 'add' || op === 'sub' ? 'a/b ± c/d = (ad ± cb) / bd' : op === 'mul' ? 'a/b × c/d = ac / bd' : 'a/b ÷ c/d = ad / bc',
      steps: [
        `${fracString(a)} ${OP} ${fracString(b)} = ${fracString(raw)}`,
        `simplify by gcd = ${gcd(raw.n, raw.d)} → ${fracString(r)}`,
      ],
    };
  },
  vectors: [
    { inputs: { a: '1/2', op: 'add', b: '3/4' }, expectPrimary: '5/4' },
    { inputs: { a: '2 1/4', op: 'mul', b: '2/3' }, expectPrimary: '3/2' },
  ],
});

/* ---------------- ratio ---------------- */

export const ratio = defineCalculator({
  slug: 'ratio-calculator',
  name: 'Ratio Calculator',
  category: 'everyday',
  description: 'Solve A : B = C : D for the missing value, and simplify the ratio.',
  fields: [
    { id: 'a', label: 'A', kind: 'number', default: 2, required: true },
    { id: 'b', label: 'B', kind: 'number', default: 3, required: true },
    { id: 'c', label: 'C', kind: 'number', default: 10, required: true, hint: 'D is solved so that A:B = C:D' },
  ],
  compute(inputs: CalcInputs): CalcResult {
    const a = inputs.a as Decimal;
    const b = inputs.b as Decimal;
    const c = inputs.c as Decimal;
    if (a.isZero()) throw new CalcError('out-of-domain', 'A can’t be 0 — the ratio would be undefined.', 'a');
    const d = c.times(b).div(a);

    // Simplified A:B when both are integers; otherwise show the decimal ratio.
    let simplified: string;
    if (a.isInteger() && b.isInteger()) {
      const g = gcd(BigInt(a.toFixed(0)), BigInt(b.toFixed(0)));
      simplified = `${BigInt(a.toFixed(0)) / g} : ${BigInt(b.toFixed(0)) / g}`;
    } else {
      simplified = `1 : ${b.div(a).toSignificantDigits(6)}`;
    }

    return {
      primary: { label: 'D (missing value)', value: d.toSignificantDigits(10), format: { kind: 'number' } },
      secondary: [
        { label: 'Full proportion', value: `${a} : ${b} = ${c} : ${d.toSignificantDigits(10)}`, format: { kind: 'text' } },
        { label: 'A : B simplified', value: simplified, format: { kind: 'text' } },
        { label: 'Scale factor (C ÷ A)', value: c.div(a).toSignificantDigits(6), format: { kind: 'number', unit: '×' } },
      ],
      formula: 'D = C × B / A',
      steps: [`D = ${c} × ${b} / ${a} = ${d.toSignificantDigits(10)}`],
    };
  },
  vectors: [
    { inputs: { a: '2', b: '3', c: '10' }, expectPrimary: '15' },
    { inputs: { a: '16', b: '9', c: '1920' }, expectPrimary: '1080' },
  ],
});

/* ---------------- GPA ---------------- */

const GRADE_POINTS: Record<string, string> = {
  'A+': '4.0', 'A': '4.0', 'A-': '3.7',
  'B+': '3.3', 'B': '3.0', 'B-': '2.7',
  'C+': '2.3', 'C': '2.0', 'C-': '1.7',
  'D+': '1.3', 'D': '1.0', 'D-': '0.7',
  'F': '0.0',
};

export const gpa = defineCalculator({
  slug: 'gpa-calculator',
  name: 'GPA Calculator',
  category: 'everyday',
  description: 'Grade point average on the standard 4.0 scale, weighted by credits.',
  fields: [
    { id: 'courses', label: 'Courses', kind: 'text', default: 'A 3, B+ 3, A- 4, C 2', required: true,
      hint: 'One per comma or line: grade then credits, e.g. "A 3" or "B+:4".' },
  ],
  compute(inputs: CalcInputs): CalcResult {
    const entries = (inputs.courses as string).split(/[,\n;]+/).map((s) => s.trim()).filter(Boolean);
    if (entries.length === 0) throw new CalcError('invalid-input', 'Add at least one course.', 'courses');

    let points = new Decimal(0);
    let credits = new Decimal(0);
    const parsed: string[] = [];
    for (const entry of entries) {
      const m = /^([A-Fa-f][+-]?)[\s:]+(\d+(?:\.\d+)?)$/.exec(entry);
      if (!m) throw new CalcError('invalid-input', `"${entry}" — write a grade then credits, like "A 3".`, 'courses');
      const grade = m[1]!.toUpperCase();
      const gp = GRADE_POINTS[grade];
      if (gp === undefined) throw new CalcError('invalid-input', `"${grade}" isn't a letter grade (A+ through F, no E).`, 'courses');
      const cr = new Decimal(m[2]!);
      if (cr.lte(0)) throw new CalcError('invalid-input', `"${entry}" — credits must be positive.`, 'courses');
      points = points.plus(new Decimal(gp).times(cr));
      credits = credits.plus(cr);
      parsed.push(`${grade} (${gp}) × ${cr}`);
    }

    const value = points.div(credits).toDecimalPlaces(2);
    return {
      primary: { label: 'GPA', value, format: { kind: 'number', precision: 2 } },
      secondary: [
        { label: 'Quality points', value: points.toSignificantDigits(8), format: { kind: 'number' } },
        { label: 'Total credits', value: credits, format: { kind: 'number' } },
        { label: 'Courses', value: entries.length, format: { kind: 'number' } },
      ],
      formula: 'GPA = Σ(grade points × credits) / Σcredits',
      steps: [parsed.join(' · '), `${points.toSignificantDigits(8)} / ${credits} = ${value}`],
    };
  },
  vectors: [
    { inputs: { courses: 'A 3, B+ 3, A- 4, C 2' }, expectPrimary: '3.39' },
    { inputs: { courses: 'A 3, A 3' }, expectPrimary: '4' },
  ],
});

/* ---------------- percent change ---------------- */

export const percentageChange = defineCalculator({
  slug: 'percentage-change-calculator',
  name: 'Percentage Change Calculator',
  category: 'everyday',
  description: 'Percent increase or decrease from one value to another.',
  fields: [
    { id: 'from', label: 'Starting value', kind: 'number', default: 250, required: true },
    { id: 'to', label: 'Ending value', kind: 'number', default: 300, required: true },
  ],
  compute(inputs: CalcInputs): CalcResult {
    const from = inputs.from as Decimal;
    const to = inputs.to as Decimal;
    if (from.isZero()) throw new CalcError('out-of-domain', 'Change from 0 is undefined — any nonzero result is an infinite % change.', 'from');
    const change = to.minus(from).div(from.abs()).times(100);
    const rounded = change.toDecimalPlaces(2);
    const rising = change.gte(0);

    return {
      primary: {
        label: rising ? 'Increase' : 'Decrease',
        value: rounded,
        format: { kind: 'percent', precision: 2 },
        tone: rising ? 'positive' : 'negative',
      },
      secondary: [
        { label: 'Absolute change', value: to.minus(from), format: { kind: 'number' } },
        { label: 'Multiplier', value: from.isZero() ? '—' : `× ${to.div(from).toSignificantDigits(6)}`, format: { kind: 'text' } },
      ],
      formula: '% change = (to − from) / |from| × 100',
      steps: [`(${to} − ${from}) / |${from}| × 100 = ${rounded}%`],
    };
  },
  vectors: [
    { inputs: { from: '250', to: '300' }, expectPrimary: '20' },
    { inputs: { from: '300', to: '250' }, expectPrimary: '-16.67' },
  ],
});
