// lovelytools.ai — percentage calculator: three modes in one tool.
import { D, Decimal, HUNDRED, roundMoney } from '../decimal';
import { CalcError, defineCalculator, type CalcInputs, type CalcResult } from '../types';

export const percentage = defineCalculator({
  slug: 'percentage-calculator',
  name: 'Percentage Calculator',
  category: 'everyday',
  description: 'X% of Y, "X is what % of Y", and percent change — with the work shown.',
  fields: [
    { id: 'mode', label: 'Question', kind: 'select', default: 'of', options: [
      { value: 'of', label: 'What is X% of Y?' },
      { value: 'is', label: 'X is what % of Y?' },
      { value: 'change', label: '% change from X to Y' },
    ] },
    { id: 'x', label: 'X', kind: 'number', default: 15, required: true },
    { id: 'y', label: 'Y', kind: 'number', default: 240, required: true },
  ],
  compute(inputs: CalcInputs): CalcResult {
    const mode = inputs.mode as string;
    const x = inputs.x as Decimal;
    const y = inputs.y as Decimal;

    if (mode === 'of') {
      const result = x.div(HUNDRED).times(y);
      return {
        primary: { label: `${x}% of ${y}`, value: result.toDecimalPlaces(6), format: { kind: 'number', precision: 6 } },
        secondary: [],
        formula: 'result = (X / 100) × Y',
        steps: [`${x} / 100 = ${x.div(HUNDRED)}`, `${x.div(HUNDRED)} × ${y} = ${result.toDecimalPlaces(6)}`],
      };
    }
    if (mode === 'is') {
      if (y.isZero()) throw new CalcError('out-of-domain', 'Y can\u2019t be zero — nothing is a percentage of nothing.', 'y');
      const result = x.div(y).times(HUNDRED);
      return {
        primary: { label: `${x} is this % of ${y}`, value: result.toDecimalPlaces(4), format: { kind: 'percent', precision: 4 } },
        secondary: [],
        formula: '% = (X / Y) × 100',
        steps: [`${x} / ${y} = ${x.div(y).toSignificantDigits(8)}`, `× 100 = ${result.toDecimalPlaces(4)}%`],
      };
    }
    // change
    if (x.isZero()) throw new CalcError('out-of-domain', 'Can\u2019t compute % change from zero.', 'x');
    const change = y.minus(x).div(x.abs()).times(HUNDRED);
    return {
      primary: {
        label: `Change from ${x} to ${y}`,
        value: change.toDecimalPlaces(4),
        format: { kind: 'percent', precision: 4 },
        tone: change.gte(0) ? 'positive' : 'negative',
      },
      secondary: [{ label: 'Absolute change', value: y.minus(x), format: { kind: 'number' } }],
      formula: '% change = (Y − X) / |X| × 100',
      steps: [`${y} − ${x} = ${y.minus(x)}`, `/ |${x}| × 100 = ${change.toDecimalPlaces(4)}%`],
    };
  },
  vectors: [
    { inputs: { mode: 'of', x: '15', y: '240' }, expectPrimary: '36' },
    { inputs: { mode: 'is', x: '36', y: '240' }, expectPrimary: '15' },
    { inputs: { mode: 'change', x: '80', y: '100' }, expectPrimary: '25' },
  ],
});
