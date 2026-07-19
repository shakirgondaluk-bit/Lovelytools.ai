// lovelytools.ai — the rest of the finance family: car loans, ROI, savings
// growth, retirement projection, discounts, flat-rate tax, and VAT. All money
// math through decimal.ts; display rounding is banker's at the edge only.
import {
  amortizedPayment,
  compound,
  Decimal,
  HUNDRED,
  ONE,
  percentToPeriodicRate,
  roundMoney,
} from '../decimal';
import { CalcError, defineCalculator, type CalcInputs, type CalcResult } from '../types';

const USD = { kind: 'money' as const, currency: 'USD' };

export const carLoan = defineCalculator({
  slug: 'car-loan-calculator',
  name: 'Car Loan Calculator',
  category: 'finance',
  description: 'Monthly car payment and total interest, after down payment and trade-in.',
  fields: [
    { id: 'price', label: 'Vehicle price', kind: 'money', default: 35000, min: 1, max: 10_000_000, required: true },
    { id: 'down', label: 'Down payment', kind: 'money', default: 5000, min: 0, max: 10_000_000 },
    { id: 'tradein', label: 'Trade-in value', kind: 'money', default: 0, min: 0, max: 10_000_000 },
    { id: 'rate', label: 'Annual interest rate (APR)', kind: 'percent', default: 6.9, min: 0, max: 100, step: 0.01, suffix: '%', required: true },
    { id: 'months', label: 'Term', kind: 'integer', default: 60, min: 6, max: 120, suffix: 'months', required: true },
  ],
  compute(inputs: CalcInputs): CalcResult {
    const price = inputs.price as Decimal;
    const down = inputs.down as Decimal;
    const tradein = inputs.tradein as Decimal;
    const financed = price.minus(down).minus(tradein);
    if (financed.lte(0)) throw new CalcError('out-of-domain', 'Down payment and trade-in already cover the full price.', 'down');

    const months = Number(inputs.months);
    const r = percentToPeriodicRate(inputs.rate as Decimal, 12);
    const M = amortizedPayment(financed, r, months);
    const totalPaid = M.times(months);
    const totalInterest = totalPaid.minus(financed);

    return {
      primary: { label: 'Monthly payment', value: roundMoney(M), format: USD },
      secondary: [
        { label: 'Amount financed', value: roundMoney(financed), format: USD },
        { label: 'Total interest', value: roundMoney(totalInterest), format: USD, tone: 'negative' },
        { label: 'Total cost (incl. down & trade-in)', value: roundMoney(totalPaid.plus(down).plus(tradein)), format: USD },
      ],
      formula: 'M = P · r(1+r)ⁿ / ((1+r)ⁿ − 1),  P = price − down − trade-in',
      steps: [
        `P = ${price} − ${down} − ${tradein} = ${financed}`,
        `r = ${inputs.rate}% / 12 · n = ${months} → M = ${roundMoney(M)}`,
      ],
    };
  },
  vectors: [
    { inputs: { price: '35000', down: '5000', tradein: '0', rate: '6.9', months: '60' }, expectPrimary: '592.62' },
    { inputs: { price: '20000', down: '0', tradein: '0', rate: '0', months: '48' }, expectPrimary: '416.67' },
  ],
});

export const roi = defineCalculator({
  slug: 'roi-calculator',
  name: 'ROI Calculator',
  category: 'finance',
  description: 'Total and annualized return on an investment.',
  fields: [
    { id: 'initial', label: 'Amount invested', kind: 'money', default: 10000, min: 0.01, max: 1e12, required: true },
    { id: 'final', label: 'Final value', kind: 'money', default: 15000, min: 0, max: 1e12, required: true },
    { id: 'years', label: 'Held for', kind: 'number', default: 3, min: 0, max: 100, step: 0.1, suffix: 'years' },
  ],
  compute(inputs: CalcInputs): CalcResult {
    const initial = inputs.initial as Decimal;
    const final = inputs.final as Decimal;
    const years = inputs.years as Decimal;

    const profit = final.minus(initial);
    const total = profit.div(initial).times(HUNDRED);
    const gained = profit.gte(0);
    // Annualized (CAGR) only when a positive holding period was given.
    const annualized = years.gt(0) && final.gt(0)
      ? final.div(initial).pow(ONE.div(years)).minus(ONE).times(HUNDRED)
      : null;

    return {
      primary: { label: 'Total ROI', value: total.toDecimalPlaces(2), format: { kind: 'percent', precision: 2 }, tone: gained ? 'positive' : 'negative' },
      secondary: [
        { label: gained ? 'Profit' : 'Loss', value: roundMoney(profit.abs()), format: USD, tone: gained ? 'positive' : 'negative' },
        ...(annualized
          ? [{ label: `Annualized (CAGR, ${years}y)`, value: annualized.toDecimalPlaces(2), format: { kind: 'percent' as const, precision: 2 } }]
          : []),
      ],
      formula: 'ROI = (final − initial) / initial · CAGR = (final/initial)^(1/years) − 1',
      steps: [
        `(${final} − ${initial}) / ${initial} = ${total.toDecimalPlaces(2)}%`,
        ...(annualized ? [`(${final}/${initial})^(1/${years}) − 1 = ${annualized.toDecimalPlaces(2)}%/year`] : []),
      ],
    };
  },
  vectors: [
    { inputs: { initial: '10000', final: '15000', years: '3' }, expectPrimary: '50' },
    { inputs: { initial: '8000', final: '6000', years: '1' }, expectPrimary: '-25' },
  ],
});

/** FV of a starting balance plus end-of-month deposits at a monthly rate. */
function futureValue(initial: Decimal, monthly: Decimal, r: Decimal, months: number): Decimal {
  const growth = compound(r, months);
  const contributions = r.isZero() ? monthly.times(months) : monthly.times(growth.minus(ONE)).div(r);
  return initial.times(growth).plus(contributions);
}

export const savings = defineCalculator({
  slug: 'savings-calculator',
  name: 'Savings Calculator',
  category: 'finance',
  description: 'How a starting balance plus monthly deposits grows over time.',
  fields: [
    { id: 'initial', label: 'Starting balance', kind: 'money', default: 1000, min: 0, max: 1e10 },
    { id: 'monthly', label: 'Monthly deposit', kind: 'money', default: 200, min: 0, max: 1e8 },
    { id: 'rate', label: 'Annual interest rate', kind: 'percent', default: 5, min: 0, max: 50, step: 0.01, suffix: '%', required: true },
    { id: 'years', label: 'Saving for', kind: 'number', default: 10, min: 0.5, max: 80, step: 0.5, suffix: 'years', required: true },
  ],
  compute(inputs: CalcInputs): CalcResult {
    const initial = inputs.initial as Decimal;
    const monthly = inputs.monthly as Decimal;
    const years = inputs.years as Decimal;
    const months = Math.round(years.times(12).toNumber());
    const r = percentToPeriodicRate(inputs.rate as Decimal, 12);

    const fv = futureValue(initial, monthly, r, months);
    const contributed = initial.plus(monthly.times(months));
    const growth = fv.minus(contributed);

    // Year-by-year table so the compounding is visible, not asserted.
    const rows: Array<Array<Decimal | number | string>> = [];
    for (let y = 1; y <= Math.ceil(months / 12); y++) {
      const m = Math.min(y * 12, months);
      const v = futureValue(initial, monthly, r, m);
      rows.push([`Year ${y}`, roundMoney(initial.plus(monthly.times(m))), roundMoney(v)]);
    }

    return {
      primary: { label: `Balance after ${years} years`, value: roundMoney(fv), format: USD, tone: 'positive' },
      secondary: [
        { label: 'Total deposited', value: roundMoney(contributed), format: USD },
        { label: 'Interest earned', value: roundMoney(growth), format: USD, tone: 'positive' },
      ],
      schedule: {
        title: 'Growth by year',
        columns: [
          { label: 'Year', format: { kind: 'text' } },
          { label: 'Deposited', format: USD },
          { label: 'Balance', format: USD },
        ],
        rows,
      },
      formula: 'FV = P(1+r)ⁿ + PMT · ((1+r)ⁿ − 1)/r',
      steps: [
        `r = ${inputs.rate}% / 12 · n = ${months} months`,
        `FV = ${initial}(1+r)ⁿ + ${monthly}·((1+r)ⁿ−1)/r = ${roundMoney(fv)}`,
      ],
    };
  },
  vectors: [
    { inputs: { initial: '1000', monthly: '200', rate: '5', years: '10' }, expectPrimary: '32703.47' },
    { inputs: { initial: '0', monthly: '100', rate: '0', years: '2' }, expectPrimary: '2400' },
  ],
});

export const retirement = defineCalculator({
  slug: 'retirement-calculator',
  name: 'Retirement Calculator',
  category: 'finance',
  description: 'Projected nest egg at retirement, and the income it could sustain.',
  fields: [
    { id: 'age', label: 'Current age', kind: 'integer', default: 30, min: 16, max: 90, required: true },
    { id: 'retire', label: 'Retirement age', kind: 'integer', default: 65, min: 30, max: 100, required: true },
    { id: 'saved', label: 'Saved so far', kind: 'money', default: 20000, min: 0, max: 1e10 },
    { id: 'monthly', label: 'Monthly contribution', kind: 'money', default: 500, min: 0, max: 1e7 },
    { id: 'rate', label: 'Expected annual return', kind: 'percent', default: 7, min: 0, max: 30, step: 0.1, suffix: '%', required: true },
  ],
  compute(inputs: CalcInputs): CalcResult {
    const age = Number(inputs.age);
    const retire = Number(inputs.retire);
    if (retire <= age) throw new CalcError('out-of-domain', 'Retirement age must be after your current age.', 'retire');

    const months = (retire - age) * 12;
    const r = percentToPeriodicRate(inputs.rate as Decimal, 12);
    const fv = futureValue(inputs.saved as Decimal, inputs.monthly as Decimal, r, months);
    const contributed = (inputs.saved as Decimal).plus((inputs.monthly as Decimal).times(months));
    // The classic 4% rule — a heuristic, and the steps call it that.
    const annualIncome = fv.times('0.04');

    return {
      primary: { label: `Nest egg at ${retire}`, value: roundMoney(fv), format: USD, tone: 'positive' },
      secondary: [
        { label: 'Sustainable income (4% rule)', value: roundMoney(annualIncome), format: USD },
        { label: '— per month', value: roundMoney(annualIncome.div(12)), format: USD },
        { label: 'Total contributed', value: roundMoney(contributed), format: USD },
        { label: 'Investment growth', value: roundMoney(fv.minus(contributed)), format: USD, tone: 'positive' },
      ],
      formula: 'FV = P(1+r)ⁿ + PMT · ((1+r)ⁿ − 1)/r,  income ≈ 4% of FV',
      steps: [
        `${retire - age} years × 12 = ${months} monthly contributions at ${inputs.rate}%/year`,
        `FV = ${roundMoney(fv)} · 4% rule → ${roundMoney(annualIncome)}/year`,
        'Nominal projection — inflation and real returns will vary. The 4% rule is a rough heuristic.',
      ],
    };
  },
  vectors: [
    { inputs: { age: '30', retire: '65', saved: '20000', monthly: '500', rate: '7' }, expectPrimary: '1130650.34' },
    { inputs: { age: '40', retire: '65', saved: '0', monthly: '1000', rate: '0' }, expectPrimary: '300000' },
  ],
});

export const discount = defineCalculator({
  slug: 'discount-calculator',
  name: 'Discount Calculator',
  category: 'everyday',
  description: 'Sale price and amount saved from a percentage discount.',
  fields: [
    { id: 'price', label: 'Original price', kind: 'money', default: 80, min: 0, max: 1e9, required: true },
    { id: 'pct', label: 'Discount', kind: 'percent', default: 25, min: 0, max: 100, step: 0.5, suffix: '%', required: true },
  ],
  compute(inputs: CalcInputs): CalcResult {
    const price = inputs.price as Decimal;
    const pct = inputs.pct as Decimal;
    const saved = price.times(pct).div(HUNDRED);
    const sale = price.minus(saved);

    return {
      primary: { label: 'Sale price', value: roundMoney(sale), format: USD, tone: 'positive' },
      secondary: [
        { label: 'You save', value: roundMoney(saved), format: USD, tone: 'positive' },
        { label: 'Of original', value: HUNDRED.minus(pct), format: { kind: 'percent' } },
      ],
      formula: 'sale = price × (1 − d/100)',
      steps: [`${price} × (1 − ${pct}/100) = ${roundMoney(sale)} — saving ${roundMoney(saved)}`],
    };
  },
  vectors: [
    { inputs: { price: '80', pct: '25' }, expectPrimary: '60' },
    { inputs: { price: '129.99', pct: '30' }, expectPrimary: '90.99' },
  ],
});

export const tax = defineCalculator({
  slug: 'tax-calculator',
  name: 'Tax Calculator',
  category: 'finance',
  description: 'Take-home pay from a gross income and an effective tax rate.',
  fields: [
    { id: 'income', label: 'Gross annual income', kind: 'money', default: 60000, min: 0, max: 1e9, required: true },
    { id: 'rate', label: 'Effective tax rate', kind: 'percent', default: 24, min: 0, max: 99, step: 0.1, suffix: '%', required: true,
      hint: 'Your overall rate, not the top bracket — brackets vary by country and year.' },
  ],
  compute(inputs: CalcInputs): CalcResult {
    const income = inputs.income as Decimal;
    const rate = inputs.rate as Decimal;
    const taxPaid = income.times(rate).div(HUNDRED);
    const net = income.minus(taxPaid);

    return {
      primary: { label: 'Take-home (annual)', value: roundMoney(net), format: USD, tone: 'positive' },
      secondary: [
        { label: 'Tax paid', value: roundMoney(taxPaid), format: USD, tone: 'negative' },
        { label: 'Take-home per month', value: roundMoney(net.div(12)), format: USD },
        { label: 'Take-home per week', value: roundMoney(net.div(52)), format: USD },
      ],
      formula: 'net = gross × (1 − rate/100)',
      steps: [
        `${income} × (1 − ${rate}/100) = ${roundMoney(net)}`,
        'A flat effective rate — real systems use brackets, allowances and deductions, so treat this as a first pass.',
      ],
    };
  },
  vectors: [
    { inputs: { income: '60000', rate: '24' }, expectPrimary: '45600' },
    { inputs: { income: '100000', rate: '0' }, expectPrimary: '100000' },
  ],
});

export const vat = defineCalculator({
  slug: 'vat-calculator',
  name: 'VAT Calculator',
  category: 'finance',
  description: 'Add VAT to a net price, or extract it from a gross one.',
  fields: [
    { id: 'mode', label: 'Direction', kind: 'select', default: 'add', options: [
      { value: 'add', label: 'Add VAT (net → gross)' },
      { value: 'remove', label: 'Remove VAT (gross → net)' },
    ] },
    { id: 'amount', label: 'Amount', kind: 'money', default: 100, min: 0, max: 1e9, required: true },
    { id: 'rate', label: 'VAT rate', kind: 'percent', default: 20, min: 0, max: 50, step: 0.5, suffix: '%', required: true },
  ],
  compute(inputs: CalcInputs): CalcResult {
    const amount = inputs.amount as Decimal;
    const rate = (inputs.rate as Decimal).div(HUNDRED);
    const adding = (inputs.mode as string) === 'add';

    // Removing VAT divides — the classic mistake is subtracting the same
    // percentage, which over-strips (120 − 20% = 96, not the 100 you started with).
    const net = adding ? amount : amount.div(ONE.plus(rate));
    const gross = adding ? amount.times(ONE.plus(rate)) : amount;
    const vatAmount = gross.minus(net);

    return {
      primary: adding
        ? { label: 'Gross (with VAT)', value: roundMoney(gross), format: USD }
        : { label: 'Net (without VAT)', value: roundMoney(net), format: USD },
      secondary: [
        { label: 'VAT amount', value: roundMoney(vatAmount), format: USD },
        adding
          ? { label: 'Net (entered)', value: roundMoney(net), format: USD }
          : { label: 'Gross (entered)', value: roundMoney(gross), format: USD },
      ],
      formula: adding ? 'gross = net × (1 + rate)' : 'net = gross / (1 + rate)',
      steps: [
        adding
          ? `${amount} × ${ONE.plus(rate)} = ${roundMoney(gross)}`
          : `${amount} / ${ONE.plus(rate)} = ${roundMoney(net)} — dividing, not subtracting ${inputs.rate}%`,
      ],
    };
  },
  vectors: [
    { inputs: { mode: 'add', amount: '100', rate: '20' }, expectPrimary: '120' },
    { inputs: { mode: 'remove', amount: '100', rate: '20' }, expectPrimary: '83.33' },
  ],
});

