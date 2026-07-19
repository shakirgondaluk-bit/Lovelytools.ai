// lovelytools.ai — amortized loan calculator.
import { amortizedPayment, D, Decimal, percentToPeriodicRate, roundMoney, ZERO } from '../decimal';
import { CalcError, defineCalculator, type CalcInputs, type CalcResult } from '../types';

export const loan = defineCalculator({
  slug: 'loan-calculator',
  name: 'Loan Calculator',
  category: 'finance',
  description: 'Monthly payment, total interest, and full amortization schedule.',
  fields: [
    { id: 'amount', label: 'Loan amount', kind: 'money', default: 25000, min: 1, max: 100_000_000, required: true },
    { id: 'rate', label: 'Annual interest rate', kind: 'percent', default: 8.5, min: 0, max: 100, step: 0.01, suffix: '%', required: true },
    { id: 'years', label: 'Term', kind: 'number', default: 5, min: 0.5, max: 50, step: 0.5, suffix: 'years', required: true },
  ],
  compute(inputs: CalcInputs): CalcResult {
    const P = inputs.amount as Decimal;
    const annual = inputs.rate as Decimal;
    const years = inputs.years as Decimal;
    const n = years.times(12).toNumber();
    if (!Number.isFinite(n) || n < 1) throw new CalcError('out-of-domain', 'Term must be at least a month.', 'years');
    const periods = Math.round(n);

    const r = percentToPeriodicRate(annual, 12);
    const M = amortizedPayment(P, r, periods);
    const totalPaid = M.times(periods);
    const totalInterest = totalPaid.minus(P);

    // Amortization schedule (yearly rollup keeps the table honest but small).
    let balance = P;
    let yearInterest = ZERO;
    let yearPrincipal = ZERO;
    const rows: CalcResult['schedule'] extends infer S ? (S extends { rows: infer R } ? R : never) : never = [] as never;
    const points: Array<{ x: string; Balance: number; Interest: number }> = [];
    let cumInterest = ZERO;
    for (let m = 1; m <= periods; m++) {
      const interest = balance.times(r);
      const principal = Decimal.min(M.minus(interest), balance);
      balance = balance.minus(principal);
      yearInterest = yearInterest.plus(interest);
      yearPrincipal = yearPrincipal.plus(principal);
      cumInterest = cumInterest.plus(interest);
      if (m % 12 === 0 || m === periods) {
        (rows as unknown[]).push([
          `Year ${Math.ceil(m / 12)}`,
          roundMoney(yearPrincipal),
          roundMoney(yearInterest),
          roundMoney(Decimal.max(balance, ZERO)),
        ]);
        points.push({
          x: `Y${Math.ceil(m / 12)}`,
          Balance: roundMoney(Decimal.max(balance, ZERO)).toNumber(),
          Interest: roundMoney(cumInterest).toNumber(),
        });
        yearInterest = ZERO;
        yearPrincipal = ZERO;
      }
    }

    return {
      primary: { label: 'Monthly payment', value: roundMoney(M), format: { kind: 'money', currency: 'USD' } },
      secondary: [
        { label: 'Total interest', value: roundMoney(totalInterest), format: { kind: 'money', currency: 'USD' }, tone: 'negative' },
        { label: 'Total paid', value: roundMoney(totalPaid), format: { kind: 'money', currency: 'USD' } },
        { label: 'Payments', value: periods, format: { kind: 'number', unit: 'months' } },
      ],
      schedule: {
        title: 'Amortization (yearly)',
        columns: [
          { label: 'Year', format: { kind: 'text' } },
          { label: 'Principal', format: { kind: 'money', currency: 'USD' } },
          { label: 'Interest', format: { kind: 'money', currency: 'USD' } },
          { label: 'Balance', format: { kind: 'money', currency: 'USD' } },
        ],
        rows: rows as never,
      },
      series: { title: 'Balance over time', points, seriesNames: ['Balance', 'Interest'] },
      formula: 'M = P · r(1+r)ⁿ / ((1+r)ⁿ − 1)',
      steps: [
        `r = ${annual}% / 12 = ${r.toSignificantDigits(6)} per month`,
        `n = ${years} years × 12 = ${periods} payments`,
        `M = ${P} × ${r.toSignificantDigits(4)}(1+${r.toSignificantDigits(4)})^${periods} / ((1+${r.toSignificantDigits(4)})^${periods} − 1) = ${roundMoney(M)}`,
      ],
    };
  },
  vectors: [
    { inputs: { amount: '25000', rate: '8.5', years: '5' }, expectPrimary: '512.91' },
    { inputs: { amount: '10000', rate: '0', years: '2' }, expectPrimary: '416.67' },
  ],
});
