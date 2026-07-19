// lovelytools.ai — descriptive statistics: mean/median/mode and (sample or
// population) standard deviation. All Decimal — a mean of money amounts must
// not pick up float dust.
import { Decimal, ZERO } from '../decimal';
import { CalcError, defineCalculator, type CalcInputs, type CalcResult } from '../types';

/** "4, 8, 15" · "4 8 15" · one per line — all accepted. */
export function parseNumberList(raw: string, fieldId: string): Decimal[] {
  const parts = raw.split(/[,\s;]+/).filter(Boolean);
  if (parts.length === 0) throw new CalcError('invalid-input', 'Enter at least one number.', fieldId);
  return parts.map((p) => {
    try {
      const d = new Decimal(p);
      if (!d.isFinite()) throw new Error();
      return d;
    } catch {
      throw new CalcError('invalid-input', `"${p}" isn't a number.`, fieldId);
    }
  });
}

const sum = (xs: Decimal[]) => xs.reduce((a, b) => a.plus(b), ZERO);

export const average = defineCalculator({
  slug: 'average-calculator',
  name: 'Average Calculator',
  category: 'everyday',
  description: 'Mean, median, mode, sum and range of a list of numbers.',
  fields: [
    { id: 'values', label: 'Numbers', kind: 'text', default: '4, 8, 15, 16, 23, 42', required: true, hint: 'Separate with commas, spaces or new lines.' },
  ],
  compute(inputs: CalcInputs): CalcResult {
    const xs = parseNumberList(inputs.values as string, 'values');
    const n = xs.length;
    const total = sum(xs);
    const mean = total.div(n);

    const sorted = [...xs].sort((a, b) => a.comparedTo(b));
    const mid = Math.floor(n / 2);
    const median = n % 2 === 1 ? sorted[mid]! : sorted[mid - 1]!.plus(sorted[mid]!).div(2);

    // Mode: most frequent value(s); "—" when every value is unique.
    const counts = new Map<string, number>();
    for (const x of xs) counts.set(x.toString(), (counts.get(x.toString()) ?? 0) + 1);
    const maxCount = Math.max(...counts.values());
    const modes = [...counts.entries()].filter(([, c]) => c === maxCount).map(([v]) => v);
    const mode = maxCount === 1 ? '—' : modes.join(', ');

    return {
      primary: { label: 'Mean (average)', value: mean.toSignificantDigits(10), format: { kind: 'number' } },
      secondary: [
        { label: 'Median', value: median.toSignificantDigits(10), format: { kind: 'number' } },
        { label: 'Mode', value: mode, format: { kind: 'text' } },
        { label: 'Sum', value: total, format: { kind: 'number' } },
        { label: 'Count', value: n, format: { kind: 'number' } },
        { label: 'Range', value: `${sorted[0]} to ${sorted[n - 1]} (${sorted[n - 1]!.minus(sorted[0]!)})`, format: { kind: 'text' } },
      ],
      formula: 'mean = Σx / n',
      steps: [`Σx = ${total} over n = ${n} values`, `mean = ${total} / ${n} = ${mean.toSignificantDigits(10)}`],
    };
  },
  vectors: [
    { inputs: { values: '4, 8, 15, 16, 23, 42' }, expectPrimary: '18' },
    { inputs: { values: '1 2 2 3' }, expectPrimary: '2' },
  ],
});

export const standardDeviation = defineCalculator({
  slug: 'standard-deviation-calculator',
  name: 'Standard Deviation Calculator',
  category: 'everyday',
  description: 'Standard deviation and variance — sample (n−1) or population (n).',
  fields: [
    { id: 'values', label: 'Numbers', kind: 'text', default: '2, 4, 4, 4, 5, 5, 7, 9', required: true, hint: 'Separate with commas, spaces or new lines.' },
    { id: 'kind', label: 'Data is', kind: 'select', default: 'population', options: [
      { value: 'population', label: 'The whole population (÷ n)' },
      { value: 'sample', label: 'A sample (÷ n−1)' },
    ] },
  ],
  compute(inputs: CalcInputs): CalcResult {
    const xs = parseNumberList(inputs.values as string, 'values');
    const n = xs.length;
    const isSample = (inputs.kind as string) === 'sample';
    if (isSample && n < 2) throw new CalcError('out-of-domain', 'A sample needs at least two values.', 'values');

    const mean = sum(xs).div(n);
    const squares = sum(xs.map((x) => x.minus(mean).pow(2)));
    const divisor = isSample ? n - 1 : n;
    const variance = squares.div(divisor);
    const sd = variance.sqrt();

    return {
      primary: { label: `Standard deviation (${isSample ? 'sample' : 'population'})`, value: sd.toSignificantDigits(6), format: { kind: 'number' } },
      secondary: [
        { label: 'Variance', value: variance.toSignificantDigits(6), format: { kind: 'number' } },
        { label: 'Mean', value: mean.toSignificantDigits(8), format: { kind: 'number' } },
        { label: 'Count', value: n, format: { kind: 'number' } },
        { label: 'Sum of squared deviations', value: squares.toSignificantDigits(8), format: { kind: 'number' } },
      ],
      formula: isSample ? 's = √( Σ(x−x̄)² / (n−1) )' : 'σ = √( Σ(x−μ)² / n )',
      steps: [
        `mean = ${mean.toSignificantDigits(8)}`,
        `Σ(x−mean)² = ${squares.toSignificantDigits(8)}`,
        `√(${squares.toSignificantDigits(6)} / ${divisor}) = ${sd.toSignificantDigits(6)}`,
      ],
    };
  },
  vectors: [
    { inputs: { values: '2, 4, 4, 4, 5, 5, 7, 9', kind: 'population' }, expectPrimary: '2' },
    { inputs: { values: '2, 4, 4, 4, 5, 5, 7, 9', kind: 'sample' }, expectPrimary: '2.13809' },
  ],
});
