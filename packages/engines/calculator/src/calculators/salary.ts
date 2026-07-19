// lovelytools.ai — pay-period conversions. Everything normalizes to an annual
// figure first (hours/week × 52), then divides back out — one path, no drift.
import { Decimal, roundMoney } from '../decimal';
import { CalcError, defineCalculator, type CalcInputs, type CalcResult } from '../types';

const USD = { kind: 'money' as const, currency: 'USD' };

export const hourlyToSalary = defineCalculator({
  slug: 'hourly-to-salary',
  name: 'Hourly to Salary',
  category: 'finance',
  description: 'What an hourly wage adds up to per year, month and week.',
  fields: [
    { id: 'hourly', label: 'Hourly wage', kind: 'money', default: 25, min: 0.01, max: 100000, required: true },
    { id: 'hours', label: 'Hours per week', kind: 'number', default: 40, min: 1, max: 100, required: true },
    { id: 'weeks', label: 'Working weeks per year', kind: 'number', default: 52, min: 1, max: 52, required: true,
      hint: 'Use 50 if you take 2 unpaid weeks off.' },
  ],
  compute(inputs: CalcInputs): CalcResult {
    const hourly = inputs.hourly as Decimal;
    const hours = inputs.hours as Decimal;
    const weeks = inputs.weeks as Decimal;

    const weekly = hourly.times(hours);
    const annual = weekly.times(weeks);

    return {
      primary: { label: 'Annual salary', value: roundMoney(annual), format: USD, tone: 'positive' },
      secondary: [
        { label: 'Monthly', value: roundMoney(annual.div(12)), format: USD },
        { label: 'Weekly', value: roundMoney(weekly), format: USD },
        { label: 'Total hours per year', value: hours.times(weeks), format: { kind: 'number', unit: 'hours' } },
      ],
      formula: 'annual = hourly × hours/week × weeks/year',
      steps: [`${hourly} × ${hours} × ${weeks} = ${roundMoney(annual)}`],
    };
  },
  vectors: [
    { inputs: { hourly: '25', hours: '40', weeks: '52' }, expectPrimary: '52000' },
    { inputs: { hourly: '18.5', hours: '37.5', weeks: '50' }, expectPrimary: '34687.5' },
  ],
});

const PERIODS: Record<string, { label: string; toAnnual: (a: Decimal, hoursPerWeek: Decimal) => Decimal }> = {
  hour: { label: 'per hour', toAnnual: (a, h) => a.times(h).times(52) },
  day: { label: 'per day', toAnnual: (a) => a.times(5).times(52) },
  week: { label: 'per week', toAnnual: (a) => a.times(52) },
  month: { label: 'per month', toAnnual: (a) => a.times(12) },
  year: { label: 'per year', toAnnual: (a) => a },
};

export const salary = defineCalculator({
  slug: 'salary-calculator',
  name: 'Salary Calculator',
  category: 'finance',
  description: 'Convert pay between hourly, daily, weekly, monthly and annual.',
  fields: [
    { id: 'amount', label: 'Pay', kind: 'money', default: 60000, min: 0.01, max: 1e9, required: true },
    { id: 'per', label: 'Per', kind: 'select', default: 'year',
      options: Object.entries(PERIODS).map(([value, p]) => ({ value, label: p.label })) },
    { id: 'hours', label: 'Hours per week', kind: 'number', default: 40, min: 1, max: 100, required: true },
  ],
  compute(inputs: CalcInputs): CalcResult {
    const amount = inputs.amount as Decimal;
    const hours = inputs.hours as Decimal;
    const period = PERIODS[inputs.per as string];
    if (!period) throw new CalcError('invalid-input', 'Pick a pay period.', 'per');

    const annual = period.toAnnual(amount, hours);
    const hourly = annual.div(52).div(hours);

    return {
      primary: { label: 'Hourly equivalent', value: roundMoney(hourly), format: USD },
      secondary: [
        { label: 'Annual', value: roundMoney(annual), format: USD },
        { label: 'Monthly', value: roundMoney(annual.div(12)), format: USD },
        { label: 'Weekly', value: roundMoney(annual.div(52)), format: USD },
        { label: 'Daily (5-day week)', value: roundMoney(annual.div(52).div(5)), format: USD },
      ],
      formula: 'annual = pay × periods/year · hourly = annual / (52 × hours/week)',
      steps: [
        `${amount} ${period.label} → ${roundMoney(annual)} / year (at ${hours} h/week)`,
        `hourly = ${roundMoney(annual)} / (52 × ${hours}) = ${roundMoney(hourly)}`,
      ],
    };
  },
  vectors: [
    { inputs: { amount: '60000', per: 'year', hours: '40' }, expectPrimary: '28.85' },
    { inputs: { amount: '25', per: 'hour', hours: '40' }, expectPrimary: '25' },
  ],
});
