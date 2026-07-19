// lovelytools.ai — compound interest with periodic contributions.
import { compound, D, Decimal, percentToPeriodicRate, roundMoney, ZERO, ONE } from '../decimal';
import { defineCalculator, type CalcInputs, type CalcResult } from '../types';

export const compoundInterest = defineCalculator({
  slug: 'compound-interest-calculator',
  name: 'Compound Interest Calculator',
  category: 'finance',
  description: 'Growth of a principal with regular contributions at any compounding frequency.',
  fields: [
    { id: 'principal', label: 'Starting amount', kind: 'money', default: 10000, min: 0, required: true },
    { id: 'contribution', label: 'Monthly contribution', kind: 'money', default: 500, min: 0 },
    { id: 'rate', label: 'Annual rate', kind: 'percent', default: 7, min: 0, max: 100, step: 0.01, suffix: '%', required: true },
    { id: 'years', label: 'Years', kind: 'integer', default: 20, min: 1, max: 80, required: true },
    { id: 'frequency', label: 'Compounding', kind: 'select', default: '12', options: [
      { value: '1', label: 'Yearly' }, { value: '4', label: 'Quarterly' },
      { value: '12', label: 'Monthly' }, { value: '365', label: 'Daily' },
    ] },
  ],
  compute(inputs: CalcInputs): CalcResult {
    const P = inputs.principal as Decimal;
    const pmt = inputs.contribution as Decimal;
    const years = (inputs.years as Decimal).toNumber();
    const freq = parseInt(inputs.frequency as string, 10);
    const r = percentToPeriodicRate(inputs.rate as Decimal, freq);

    // Simulate year by year (exact, and yields chart series for free).
    let balance = P;
    let contributed = P;
    const points: Array<{ x: string; Balance: number; Contributed: number }> = [];
    const monthlyPerPeriod = pmt.times(12).div(freq); // contributions normalized to periods
    for (let y = 1; y <= years; y++) {
      for (let p = 0; p < freq; p++) {
        balance = balance.times(ONE.plus(r)).plus(monthlyPerPeriod);
        contributed = contributed.plus(monthlyPerPeriod);
      }
      points.push({ x: `Y${y}`, Balance: roundMoney(balance).toNumber(), Contributed: roundMoney(contributed).toNumber() });
    }
    const interest = balance.minus(contributed);

    return {
      primary: { label: `Balance after ${years} years`, value: roundMoney(balance), format: { kind: 'money', currency: 'USD' }, tone: 'positive' },
      secondary: [
        { label: 'Total contributed', value: roundMoney(contributed), format: { kind: 'money', currency: 'USD' } },
        { label: 'Interest earned', value: roundMoney(interest), format: { kind: 'money', currency: 'USD' }, tone: 'positive' },
        { label: 'Growth multiple', value: contributed.gt(0) ? balance.div(contributed).toDecimalPlaces(2).toNumber() : 0, format: { kind: 'number', precision: 2, unit: '×' } },
      ],
      series: { title: 'Growth', points, seriesNames: ['Balance', 'Contributed'] },
      formula: 'A = P(1+r/n)ⁿᵗ + PMT·((1+r/n)ⁿᵗ − 1)/(r/n)',
      steps: [
        `r/n = ${inputs.rate}% / ${freq} = ${r.toSignificantDigits(6)} per period`,
        `${freq * years} periods over ${years} years`,
        `Final balance ${roundMoney(balance)} = ${roundMoney(contributed)} contributed + ${roundMoney(interest)} interest`,
      ],
    };
  },
  vectors: [
    { inputs: { principal: '10000', contribution: '0', rate: '7', years: '10', frequency: '1' }, expectPrimary: '19671.51' },
  ],
});
