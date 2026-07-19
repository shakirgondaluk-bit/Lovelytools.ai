// lovelytools.ai — BMI: metric + imperial, WHO bands.
import { D, Decimal } from '../decimal';
import { CalcError, defineCalculator, type CalcInputs, type CalcResult } from '../types';

const BANDS: Array<{ max: number; label: string; tone: 'default' | 'positive' | 'negative' }> = [
  { max: 18.5, label: 'Underweight', tone: 'negative' },
  { max: 25, label: 'Healthy range', tone: 'positive' },
  { max: 30, label: 'Overweight', tone: 'default' },
  { max: Infinity, label: 'Obese', tone: 'negative' },
];

export const bmi = defineCalculator({
  slug: 'bmi-calculator',
  name: 'BMI Calculator',
  category: 'health',
  description: 'Body mass index with WHO categories, metric or imperial.',
  fields: [
    { id: 'units', label: 'Units', kind: 'select', default: 'metric', options: [
      { value: 'metric', label: 'kg / cm' }, { value: 'imperial', label: 'lb / ft-in' },
    ] },
    { id: 'weight', label: 'Weight', kind: 'number', default: 72, min: 10, max: 700, required: true, suffix: 'kg or lb' },
    { id: 'height', label: 'Height', kind: 'number', default: 178, min: 50, max: 272, required: true, suffix: 'cm or total inches' },
  ],
  compute(inputs: CalcInputs): CalcResult {
    const metric = (inputs.units as string) === 'metric';
    const w = inputs.weight as Decimal;
    const h = inputs.height as Decimal;

    const kg = metric ? w : w.times('0.45359237'); // exact lb→kg
    const meters = metric ? h.div(100) : h.times('0.0254'); // exact in→m
    if (meters.lte(0)) throw new CalcError('out-of-domain', 'Height must be positive.', 'height');

    const value = kg.div(meters.pow(2));
    const band = BANDS.find((b) => value.lt(b.max))!;
    const healthyLow = meters.pow(2).times('18.5');
    const healthyHigh = meters.pow(2).times(25);
    const toDisplay = (kgVal: Decimal) => (metric ? kgVal : kgVal.div('0.45359237'));
    const unit = metric ? 'kg' : 'lb';

    return {
      primary: { label: 'BMI', value: value.toDecimalPlaces(1), format: { kind: 'number', precision: 1 }, tone: band.tone },
      secondary: [
        { label: 'Category (WHO)', value: band.label, format: { kind: 'text' }, tone: band.tone },
        { label: 'Healthy weight range', value: `${toDisplay(healthyLow).toDecimalPlaces(1)}–${toDisplay(healthyHigh).toDecimalPlaces(1)} ${unit}`, format: { kind: 'text' } },
      ],
      formula: 'BMI = kg / m²',
      steps: [
        metric ? `${w} kg / (${h} cm = ${meters} m)²` : `${w} lb = ${kg.toDecimalPlaces(2)} kg · ${h} in = ${meters.toDecimalPlaces(3)} m`,
        `${kg.toDecimalPlaces(2)} / ${meters.pow(2).toDecimalPlaces(4)} = ${value.toDecimalPlaces(1)}`,
      ],
    };
  },
  vectors: [
    { inputs: { units: 'metric', weight: '72', height: '178' }, expectPrimary: '22.7' },
    { inputs: { units: 'imperial', weight: '160', height: '70' }, expectPrimary: '23' },
  ],
});
