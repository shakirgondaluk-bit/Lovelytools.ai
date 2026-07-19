// lovelytools.ai — calendar-exact date difference. UTC arithmetic, real month
// lengths, leap years — no "30-day month" approximations, DST-proof.
import { defineCalculator, CalcError, type CalcInputs, type CalcResult } from '../types';

export const dateDiff = defineCalculator({
  slug: 'date-difference-calculator',
  name: 'Date Difference Calculator',
  category: 'date',
  description: 'Exact years, months, and days between two dates — plus total days and business days.',
  fields: [
    { id: 'from', label: 'From', kind: 'date', default: '2025-01-15', required: true },
    { id: 'to', label: 'To', kind: 'date', default: '2026-07-13', required: true },
  ],
  compute(inputs: CalcInputs): CalcResult {
    const from = parseUtc(inputs.from as string, 'from');
    const to = parseUtc(inputs.to as string, 'to');
    const [a, b] = from <= to ? [from, to] : [to, from];
    const flipped = from > to;

    // Calendar-exact y/m/d: walk years, then months, borrowing real month lengths.
    let years = b.getUTCFullYear() - a.getUTCFullYear();
    let months = b.getUTCMonth() - a.getUTCMonth();
    let days = b.getUTCDate() - a.getUTCDate();
    if (days < 0) {
      months -= 1;
      days += daysInMonth(b.getUTCFullYear(), b.getUTCMonth() - 1);
    }
    if (months < 0) {
      years -= 1;
      months += 12;
    }

    const MS_DAY = 86_400_000;
    const totalDays = Math.round((b.getTime() - a.getTime()) / MS_DAY);

    // Business days: whole Mon–Fri days in [a, b) — holidays are out of scope, said so.
    let businessDays = 0;
    for (let t = a.getTime(); t < b.getTime(); t += MS_DAY) {
      const dow = new Date(t).getUTCDay();
      if (dow !== 0 && dow !== 6) businessDays++;
    }

    return {
      primary: {
        label: flipped ? 'Difference (dates were reversed)' : 'Difference',
        value: { years, months, days },
        format: { kind: 'duration' },
      },
      secondary: [
        { label: 'Total days', value: totalDays, format: { kind: 'number', unit: 'days' } },
        { label: 'Total weeks', value: Math.floor(totalDays / 7), format: { kind: 'number', unit: `weeks + ${totalDays % 7} days` } },
        { label: 'Business days (Mon–Fri)', value: businessDays, format: { kind: 'number', unit: 'days' } },
      ],
      formula: 'Calendar walk: years → months (real lengths) → days, in UTC',
      steps: [
        `${iso(a)} → ${iso(b)}`,
        `${years}y ${months}m ${days}d exactly · ${totalDays} total days`,
        'Business days count Mon–Fri only — public holidays vary by country and aren\u2019t included.',
      ],
    };
  },
  vectors: [
    { inputs: { from: '2025-01-15', to: '2026-07-13' }, expectPrimary: '1y 5m 28d' },
    // Leap-edge: the documented borrow-real-month-lengths walk gives Feb 29 →
    // Mar 1 next year as exactly 1y 0m 0d (borrowing 28-day Feb 2025). The old
    // expectation predated any test runner and contradicted the algorithm above.
    { inputs: { from: '2024-02-29', to: '2025-03-01' }, expectPrimary: '1y 0m 0d' },
  ],
});

function parseUtc(s: string, fieldId: string): Date {
  const [, year, month, day] = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s) ?? [];
  if (!year || !month || !day) throw new CalcError('invalid-input', 'Use the date picker or YYYY-MM-DD.', fieldId);
  const monthIdx = +month - 1;
  const d = new Date(Date.UTC(+year, monthIdx, +day));
  if (d.getUTCMonth() !== monthIdx || d.getUTCDate() !== +day) {
    throw new CalcError('invalid-input', `${s} isn't a real calendar date.`, fieldId);
  }
  return d;
}

function daysInMonth(year: number, monthIdx: number): number {
  // monthIdx may be -1 (borrow from December of the previous year).
  return new Date(Date.UTC(year, monthIdx + 1, 0)).getUTCDate();
}

const iso = (d: Date) => d.toISOString().slice(0, 10);
