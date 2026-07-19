// lovelytools.ai — tip & split with explicit rounding modes.
import { D, Decimal, HUNDRED, roundMoney } from '../decimal';
import { CalcError, defineCalculator, type CalcInputs, type CalcResult } from '../types';

export const tipSplit = defineCalculator({
  slug: 'tip-calculator',
  name: 'Tip Calculator',
  category: 'everyday',
  description: 'Tip, total, and per-person split — round the tip, the total, or nothing.',
  fields: [
    { id: 'bill', label: 'Bill amount', kind: 'money', default: 86.4, min: 0, required: true },
    { id: 'tipPct', label: 'Tip', kind: 'percent', default: 18, min: 0, max: 100, step: 1, suffix: '%' },
    { id: 'people', label: 'Split between', kind: 'integer', default: 4, min: 1, max: 100, suffix: 'people' },
    { id: 'rounding', label: 'Rounding', kind: 'select', default: 'none', options: [
      { value: 'none', label: 'Exact' },
      { value: 'tip', label: 'Round tip up to $1' },
      { value: 'total', label: 'Round total up to $1' },
    ] },
  ],
  compute(inputs: CalcInputs): CalcResult {
    const bill = inputs.bill as Decimal;
    const pct = inputs.tipPct as Decimal;
    const people = (inputs.people as Decimal).toNumber();
    if (!Number.isInteger(people) || people < 1) throw new CalcError('invalid-input', 'At least one person has to pay.', 'people');
    const mode = inputs.rounding as string;

    let tip = bill.times(pct).div(HUNDRED);
    let total = bill.plus(tip);
    if (mode === 'tip') {
      tip = tip.ceil();
      total = bill.plus(tip);
    } else if (mode === 'total') {
      total = total.ceil();
      tip = total.minus(bill);
    }
    const perPerson = total.div(people);
    const effective = bill.gt(0) ? tip.div(bill).times(HUNDRED) : D(0);

    return {
      primary: { label: `Each of ${people} pays`, value: roundMoney(perPerson), format: { kind: 'money', currency: 'USD' } },
      secondary: [
        { label: 'Tip', value: roundMoney(tip), format: { kind: 'money', currency: 'USD' } },
        { label: 'Total', value: roundMoney(total), format: { kind: 'money', currency: 'USD' } },
        ...(mode !== 'none' ? [{ label: 'Effective tip', value: effective.toDecimalPlaces(1), format: { kind: 'percent' as const, precision: 1 } }] : []),
      ],
      formula: 'per person = (bill + tip) / people',
      steps: [
        `Tip = ${bill} × ${pct}% = ${roundMoney(tip)}${mode === 'tip' ? ' (rounded up)' : ''}`,
        `Total = ${roundMoney(total)}${mode === 'total' ? ' (rounded up)' : ''} / ${people} = ${roundMoney(perPerson)}`,
      ],
    };
  },
  vectors: [
    { inputs: { bill: '86.4', tipPct: '18', people: '4', rounding: 'none' }, expectPrimary: '25.49' },
    // Decimal.toString() never emits trailing zeros — 60, not "60.00". The UI's
    // money formatter adds the cents; vectors compare the raw value.
    { inputs: { bill: '100', tipPct: '20', people: '2', rounding: 'total' }, expectPrimary: '60' },
  ],
});
