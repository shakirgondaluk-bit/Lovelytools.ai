// lovelytools.ai — mortgage: amortized loan + tax/insurance/PMI/extra payments.
import { amortizedPayment, D, Decimal, percentToPeriodicRate, roundMoney, ZERO } from '../decimal';
import { CalcError, defineCalculator, type CalcInputs, type CalcResult } from '../types';

export const mortgage = defineCalculator({
  slug: 'mortgage-calculator',
  name: 'Mortgage Calculator',
  category: 'finance',
  description: 'True monthly cost: principal & interest plus tax, insurance, and PMI — with extra-payment payoff.',
  fields: [
    { id: 'price', label: 'Home price', kind: 'money', default: 425000, min: 1, required: true },
    { id: 'down', label: 'Down payment', kind: 'money', default: 85000, min: 0, required: true },
    { id: 'rate', label: 'Interest rate', kind: 'percent', default: 6.5, min: 0, max: 30, step: 0.01, suffix: '%', required: true },
    { id: 'years', label: 'Term', kind: 'select', default: '30', options: [
      { value: '15', label: '15 years' }, { value: '20', label: '20 years' }, { value: '30', label: '30 years' },
    ] },
    { id: 'taxYearly', label: 'Property tax / year', kind: 'money', default: 5100, min: 0 },
    { id: 'insYearly', label: 'Home insurance / year', kind: 'money', default: 1800, min: 0 },
    { id: 'extra', label: 'Extra payment / month', kind: 'money', default: 0, min: 0, hint: 'Applied straight to principal.' },
  ],
  compute(inputs: CalcInputs): CalcResult {
    const price = inputs.price as Decimal;
    const down = inputs.down as Decimal;
    if (down.gte(price)) throw new CalcError('out-of-domain', 'Down payment covers the full price — no loan needed.', 'down');
    const P = price.minus(down);
    const r = percentToPeriodicRate(inputs.rate as Decimal, 12);
    const periods = parseInt(inputs.years as string, 10) * 12;
    const extra = inputs.extra as Decimal;

    const MpI = amortizedPayment(P, r, periods);
    const tax = (inputs.taxYearly as Decimal).div(12);
    const ins = (inputs.insYearly as Decimal).div(12);
    // PMI: 0.6%/yr of loan while LTV > 80%.
    const ltv = P.div(price);
    const pmi = ltv.gt(0.8) ? P.times(0.006).div(12) : ZERO;
    const monthlyAll = MpI.plus(tax).plus(ins).plus(pmi);

    // Payoff simulation with extra payments (also finds PMI drop-off month).
    let balance = P;
    let months = 0;
    let totalInterest = ZERO;
    let pmiMonths = 0;
    const points: Array<{ x: string; Balance: number }> = [];
    while (balance.gt(0) && months < periods + 600) {
      const interest = balance.times(r);
      totalInterest = totalInterest.plus(interest);
      const principal = Decimal.min(MpI.minus(interest).plus(extra), balance);
      if (balance.div(price).gt(0.8)) pmiMonths++;
      balance = balance.minus(principal);
      months++;
      if (months % 12 === 0) points.push({ x: `Y${months / 12}`, Balance: roundMoney(Decimal.max(balance, ZERO)).toNumber() });
    }

    const savedMonths = periods - months;
    return {
      primary: { label: 'Monthly payment (all-in)', value: roundMoney(monthlyAll), format: { kind: 'money', currency: 'USD' } },
      secondary: [
        { label: 'Principal & interest', value: roundMoney(MpI), format: { kind: 'money', currency: 'USD' } },
        { label: 'Tax + insurance', value: roundMoney(tax.plus(ins)), format: { kind: 'money', currency: 'USD' } },
        ...(pmi.gt(0) ? [{ label: `PMI (until month ${pmiMonths})`, value: roundMoney(pmi), format: { kind: 'money', currency: 'USD' } as const, tone: 'negative' as const }] : []),
        { label: 'Total interest', value: roundMoney(totalInterest), format: { kind: 'money', currency: 'USD' }, tone: 'negative' },
        ...(extra.gt(0) ? [{ label: 'Paid off early by', value: { years: Math.floor(savedMonths / 12), months: savedMonths % 12, days: 0 }, format: { kind: 'duration' } as const, tone: 'positive' as const }] : []),
      ],
      series: { title: 'Balance', points, seriesNames: ['Balance'] },
      formula: 'M = P·r(1+r)ⁿ/((1+r)ⁿ−1) + tax/12 + ins/12 + PMI',
      steps: [
        `Loan = ${price} − ${down} = ${P} (LTV ${ltv.times(100).toDecimalPlaces(1)}%)`,
        `P&I = ${roundMoney(MpI)} over ${periods} months`,
        pmi.gt(0) ? `LTV > 80% → PMI ${roundMoney(pmi)}/mo until month ${pmiMonths}` : 'LTV ≤ 80% → no PMI',
        extra.gt(0) ? `Extra ${extra}/mo pays off in ${months} months (${savedMonths} early)` : `Payoff in ${months} months`,
      ],
    };
  },
  vectors: [
    { inputs: { price: '425000', down: '85000', rate: '6.5', years: '30', taxYearly: '5100', insYearly: '1800', extra: '0' }, expectPrimary: '2724.03' },
  ],
});
