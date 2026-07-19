// lovelytools.ai — age, countdown, and time-of-day duration. Same calendar
// rules as date-diff.ts (UTC, real month lengths); "as of" fields default to
// the literal 'today', resolved at compute time — vectors pass explicit dates.
import { CalcError, defineCalculator, type CalcInputs, type CalcResult } from '../types';
import { calendarDiff, daysBetween, iso, parseUtc } from './date-utils';

export const age = defineCalculator({
  slug: 'age-calculator',
  name: 'Age Calculator',
  category: 'date',
  description: 'Exact age in years, months and days, plus the countdown to the next birthday.',
  fields: [
    { id: 'dob', label: 'Date of birth', kind: 'date', default: '1990-05-15', required: true },
    { id: 'asof', label: 'Age as of', kind: 'date', default: 'today', required: true },
  ],
  compute(inputs: CalcInputs): CalcResult {
    const dob = parseUtc(inputs.dob as string, 'dob');
    const asof = parseUtc(inputs.asof as string, 'asof');
    if (dob > asof) throw new CalcError('out-of-domain', 'Birth date is after the "as of" date.', 'dob');

    const diff = calendarDiff(dob, asof);
    const totalDays = daysBetween(dob, asof);

    // Next birthday: this year's anniversary, or next year's if it already passed.
    // Feb 29 birthdays fall on Mar 1 in common years (Date.UTC overflow handles it).
    let next = new Date(Date.UTC(asof.getUTCFullYear(), dob.getUTCMonth(), dob.getUTCDate()));
    if (next <= asof) next = new Date(Date.UTC(asof.getUTCFullYear() + 1, dob.getUTCMonth(), dob.getUTCDate()));
    const toBirthday = daysBetween(asof, next);

    const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    return {
      primary: { label: 'Age', value: diff, format: { kind: 'duration' } },
      secondary: [
        { label: 'Total days lived', value: totalDays, format: { kind: 'number', unit: 'days' } },
        { label: 'Total months', value: diff.years * 12 + diff.months, format: { kind: 'number', unit: 'months' } },
        { label: 'Next birthday', value: `${iso(next)} — in ${toBirthday} day${toBirthday === 1 ? '' : 's'}`, format: { kind: 'text' }, tone: 'positive' },
        { label: 'Born on a', value: WEEKDAYS[dob.getUTCDay()]!, format: { kind: 'text' } },
      ],
      formula: 'Calendar walk: years → months (real lengths) → days, in UTC',
      steps: [
        `${iso(dob)} → ${iso(asof)}`,
        `${diff.years}y ${diff.months}m ${diff.days}d exactly · ${totalDays} total days`,
      ],
    };
  },
  vectors: [
    { inputs: { dob: '1990-05-15', asof: '2026-07-18' }, expectPrimary: '36y 2m 3d' },
    { inputs: { dob: '2000-02-29', asof: '2026-02-28' }, expectPrimary: '25y 11m 30d' },
  ],
});

export const countdown = defineCalculator({
  slug: 'countdown-timer',
  name: 'Countdown Timer',
  category: 'date',
  description: 'Days remaining until a date, event or deadline.',
  fields: [
    { id: 'from', label: 'Counting from', kind: 'date', default: 'today', required: true },
    { id: 'target', label: 'Counting down to', kind: 'date', default: '2026-12-31', required: true },
  ],
  compute(inputs: CalcInputs): CalcResult {
    const from = parseUtc(inputs.from as string, 'from');
    const target = parseUtc(inputs.target as string, 'target');
    const totalDays = daysBetween(from, target);
    if (totalDays < 0) throw new CalcError('out-of-domain', 'That date has already passed.', 'target');

    const diff = calendarDiff(from, target);
    const weeks = Math.floor(totalDays / 7);

    return {
      primary: { label: 'Days to go', value: totalDays, format: { kind: 'number', unit: 'days' }, tone: 'positive' },
      secondary: [
        { label: 'In weeks', value: `${weeks} week${weeks === 1 ? '' : 's'} ${totalDays % 7} day${totalDays % 7 === 1 ? '' : 's'}`, format: { kind: 'text' } },
        { label: 'Calendar span', value: diff, format: { kind: 'duration' } },
        { label: 'In hours', value: totalDays * 24, format: { kind: 'number', unit: 'hours' } },
      ],
      formula: 'days = (target − from) / 86 400 000 ms',
      steps: [`${iso(from)} → ${iso(target)}`, `${totalDays} days · ${weeks}w ${totalDays % 7}d`],
    };
  },
  vectors: [
    { inputs: { from: '2026-07-18', target: '2026-12-31' }, expectPrimary: '166' },
    { inputs: { from: '2026-01-01', target: '2027-01-01' }, expectPrimary: '365' },
  ],
});

export const timeDuration = defineCalculator({
  slug: 'time-duration-calculator',
  name: 'Time Duration Calculator',
  category: 'date',
  description: 'Hours and minutes between two times of day, minus breaks — overnight-safe.',
  fields: [
    { id: 'start', label: 'Start time', kind: 'text', default: '09:15', required: true, hint: '24-hour, HH:MM' },
    { id: 'end', label: 'End time', kind: 'text', default: '17:45', required: true, hint: 'Earlier than start = crosses midnight' },
    { id: 'break', label: 'Break', kind: 'integer', default: 30, min: 0, max: 1440, suffix: 'minutes' },
  ],
  compute(inputs: CalcInputs): CalcResult {
    const start = parseTime(inputs.start as string, 'start');
    const end = parseTime(inputs.end as string, 'end');
    const breakMin = Number(inputs.break);

    // End at or before start means the span crosses midnight (night shift).
    const overnight = end <= start;
    const gross = (overnight ? end + 1440 : end) - start;
    const net = gross - breakMin;
    if (net < 0) throw new CalcError('out-of-domain', 'The break is longer than the whole span.', 'break');

    const h = Math.floor(net / 60);
    const m = net % 60;

    return {
      primary: { label: 'Duration', value: `${h}h ${m}m`, format: { kind: 'text' } },
      secondary: [
        { label: 'Decimal hours', value: Math.round((net / 60) * 100) / 100, format: { kind: 'number', unit: 'h' } },
        { label: 'Total minutes', value: net, format: { kind: 'number', unit: 'min' } },
        ...(breakMin > 0
          ? [{ label: 'Before the break', value: `${Math.floor(gross / 60)}h ${gross % 60}m`, format: { kind: 'text' } as const }]
          : []),
      ],
      formula: 'duration = end − start (+24h if overnight) − break',
      steps: [
        `${inputs.start} → ${inputs.end}${overnight ? ' (crosses midnight)' : ''} = ${Math.floor(gross / 60)}h ${gross % 60}m`,
        breakMin > 0 ? `− ${breakMin}m break = ${h}h ${m}m` : `No break — ${h}h ${m}m`,
      ],
    };
  },
  vectors: [
    { inputs: { start: '09:15', end: '17:45', break: '30' }, expectPrimary: '8h 0m' },
    { inputs: { start: '22:00', end: '06:00', break: '0' }, expectPrimary: '8h 0m' },
  ],
});

function parseTime(s: string, fieldId: string): number {
  const [, h, m] = /^(\d{1,2}):(\d{2})$/.exec(s.trim()) ?? [];
  if (!h || !m || +h > 23 || +m > 59) {
    throw new CalcError('invalid-input', 'Use 24-hour HH:MM, e.g. 09:15 or 17:45.', fieldId);
  }
  return +h * 60 + +m;
}

