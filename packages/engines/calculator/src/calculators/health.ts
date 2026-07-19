// lovelytools.ai — BMR (Mifflin-St Jeor), daily calories (TDEE), and macro
// split. Estimates by design and labelled as such — the formulas are the
// standard clinical ones, not medical advice.
import { Decimal } from '../decimal';
import { CalcError, defineCalculator, type CalcInputs, type CalcResult } from '../types';

const D0 = (v: Decimal) => v.toDecimalPlaces(0, Decimal.ROUND_HALF_EVEN);

const BODY_FIELDS = [
  { id: 'sex', label: 'Sex', kind: 'select' as const, default: 'male', options: [
    { value: 'male', label: 'Male' }, { value: 'female', label: 'Female' },
  ] },
  { id: 'age', label: 'Age', kind: 'integer' as const, default: 30, min: 10, max: 120, suffix: 'years', required: true },
  { id: 'units', label: 'Units', kind: 'select' as const, default: 'metric', options: [
    { value: 'metric', label: 'kg / cm' }, { value: 'imperial', label: 'lb / total inches' },
  ] },
  { id: 'weight', label: 'Weight', kind: 'number' as const, default: 70, min: 20, max: 700, required: true, suffix: 'kg or lb' },
  { id: 'height', label: 'Height', kind: 'number' as const, default: 175, min: 50, max: 272, required: true, suffix: 'cm or total inches' },
];

/** Mifflin-St Jeor: 10·kg + 6.25·cm − 5·age (+5 male / −161 female). */
function mifflin(inputs: CalcInputs): { bmr: Decimal; kg: Decimal; cm: Decimal } {
  const metric = (inputs.units as string) === 'metric';
  const w = inputs.weight as Decimal;
  const h = inputs.height as Decimal;
  const kg = metric ? w : w.times('0.45359237');
  const cm = metric ? h : h.times('2.54');
  const sexTerm = (inputs.sex as string) === 'male' ? new Decimal(5) : new Decimal(-161);
  const bmr = new Decimal(10).times(kg)
    .plus(new Decimal('6.25').times(cm))
    .minus(new Decimal(5).times(inputs.age as Decimal))
    .plus(sexTerm);
  if (bmr.lte(0)) throw new CalcError('out-of-domain', 'These inputs give a non-physical BMR — check weight and height.');
  return { bmr, kg, cm };
}

export const bmr = defineCalculator({
  slug: 'bmr-calculator',
  name: 'BMR Calculator',
  category: 'health',
  description: 'Basal metabolic rate — the calories your body burns at complete rest (Mifflin-St Jeor).',
  fields: BODY_FIELDS,
  compute(inputs: CalcInputs): CalcResult {
    const { bmr: value, kg, cm } = mifflin(inputs);
    return {
      primary: { label: 'BMR', value: D0(value), format: { kind: 'number', unit: 'kcal/day' } },
      secondary: [
        { label: 'Per hour at rest', value: value.div(24).toDecimalPlaces(0), format: { kind: 'number', unit: 'kcal' } },
        { label: 'Per week', value: D0(value.times(7)), format: { kind: 'number', unit: 'kcal' } },
      ],
      formula: '10·kg + 6.25·cm − 5·age + s   (s = +5 male, −161 female)',
      steps: [
        `10×${kg.toDecimalPlaces(1)} + 6.25×${cm.toDecimalPlaces(1)} − 5×${inputs.age} ${(inputs.sex as string) === 'male' ? '+ 5' : '− 161'}`,
        `= ${value.toDecimalPlaces(2)} kcal/day — this is rest-only; add activity for daily needs.`,
      ],
    };
  },
  vectors: [
    { inputs: { sex: 'male', age: '30', units: 'metric', weight: '70', height: '175' }, expectPrimary: '1649' },
    { inputs: { sex: 'female', age: '30', units: 'metric', weight: '70', height: '175' }, expectPrimary: '1483' },
  ],
});

const ACTIVITY: Record<string, { mult: string; label: string }> = {
  sedentary: { mult: '1.2', label: 'Sedentary (little exercise)' },
  light: { mult: '1.375', label: 'Light (1–3 days/week)' },
  moderate: { mult: '1.55', label: 'Moderate (3–5 days/week)' },
  active: { mult: '1.725', label: 'Active (6–7 days/week)' },
  veryactive: { mult: '1.9', label: 'Very active (physical job + training)' },
};

export const calorie = defineCalculator({
  slug: 'calorie-calculator',
  name: 'Calorie Calculator',
  category: 'health',
  description: 'Daily calories to maintain, lose or gain weight, from BMR × activity.',
  fields: [
    ...BODY_FIELDS,
    { id: 'activity', label: 'Activity level', kind: 'select', default: 'moderate',
      options: Object.entries(ACTIVITY).map(([value, a]) => ({ value, label: a.label })) },
  ],
  compute(inputs: CalcInputs): CalcResult {
    const { bmr: base } = mifflin(inputs);
    const act = ACTIVITY[inputs.activity as string];
    if (!act) throw new CalcError('invalid-input', 'Pick an activity level.', 'activity');
    const tdee = base.times(act.mult);

    return {
      primary: { label: 'Maintenance calories', value: D0(tdee), format: { kind: 'number', unit: 'kcal/day' } },
      secondary: [
        { label: 'Lose ~0.5 kg/week', value: D0(tdee.minus(500)), format: { kind: 'number', unit: 'kcal/day' }, tone: 'negative' },
        { label: 'Mild loss ~0.25 kg/week', value: D0(tdee.minus(250)), format: { kind: 'number', unit: 'kcal/day' } },
        { label: 'Gain ~0.5 kg/week', value: D0(tdee.plus(500)), format: { kind: 'number', unit: 'kcal/day' }, tone: 'positive' },
        { label: 'BMR (rest only)', value: D0(base), format: { kind: 'number', unit: 'kcal/day' } },
      ],
      formula: 'TDEE = BMR × activity multiplier',
      steps: [
        `BMR = ${base.toDecimalPlaces(2)} kcal/day (Mifflin-St Jeor)`,
        `× ${act.mult} (${act.label.toLowerCase()}) = ${D0(tdee)} kcal/day`,
        '±500 kcal/day ≈ ±0.5 kg/week — an estimate, not a prescription.',
      ],
    };
  },
  vectors: [
    { inputs: { sex: 'male', age: '30', units: 'metric', weight: '70', height: '175', activity: 'moderate' }, expectPrimary: '2556' },
    // 1648.75 × 1.2 = 1978.5 exactly — banker's rounding takes the even neighbor.
    { inputs: { sex: 'male', age: '30', units: 'metric', weight: '70', height: '175', activity: 'sedentary' }, expectPrimary: '1978' },
  ],
});

const SPLITS: Record<string, { p: string; c: string; f: string; label: string }> = {
  balanced: { p: '0.30', c: '0.40', f: '0.30', label: 'Balanced (30P / 40C / 30F)' },
  lowcarb: { p: '0.40', c: '0.20', f: '0.40', label: 'Low-carb (40P / 20C / 40F)' },
  highprotein: { p: '0.40', c: '0.30', f: '0.30', label: 'High-protein (40P / 30C / 30F)' },
};

export const macro = defineCalculator({
  slug: 'macro-calculator',
  name: 'Macro Calculator',
  category: 'health',
  description: 'Daily protein, carb and fat gram targets from a calorie goal.',
  fields: [
    { id: 'calories', label: 'Daily calories', kind: 'number', default: 2200, min: 800, max: 10000, suffix: 'kcal', required: true },
    { id: 'split', label: 'Split', kind: 'select', default: 'balanced',
      options: Object.entries(SPLITS).map(([value, s]) => ({ value, label: s.label })) },
  ],
  compute(inputs: CalcInputs): CalcResult {
    const cal = inputs.calories as Decimal;
    const split = SPLITS[inputs.split as string];
    if (!split) throw new CalcError('invalid-input', 'Pick a split.', 'split');

    // 4 kcal/g protein & carbs, 9 kcal/g fat (Atwater factors).
    const protein = cal.times(split.p).div(4);
    const carbs = cal.times(split.c).div(4);
    const fat = cal.times(split.f).div(9);

    return {
      primary: { label: 'Protein', value: D0(protein), format: { kind: 'number', unit: 'g/day' } },
      secondary: [
        { label: 'Carbohydrates', value: D0(carbs), format: { kind: 'number', unit: 'g/day' } },
        { label: 'Fat', value: D0(fat), format: { kind: 'number', unit: 'g/day' } },
        { label: 'Protein calories', value: D0(cal.times(split.p)), format: { kind: 'number', unit: 'kcal' } },
        { label: 'Carb calories', value: D0(cal.times(split.c)), format: { kind: 'number', unit: 'kcal' } },
        { label: 'Fat calories', value: D0(cal.times(split.f)), format: { kind: 'number', unit: 'kcal' } },
      ],
      formula: 'grams = kcal × share / (4 kcal/g protein·carb, 9 kcal/g fat)',
      steps: [
        `${cal} kcal split ${split.label}`,
        `protein ${D0(protein)} g · carbs ${D0(carbs)} g · fat ${D0(fat)} g`,
      ],
    };
  },
  vectors: [
    { inputs: { calories: '2200', split: 'balanced' }, expectPrimary: '165' },
    { inputs: { calories: '2000', split: 'lowcarb' }, expectPrimary: '200' },
  ],
});
