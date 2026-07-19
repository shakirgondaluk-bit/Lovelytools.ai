// lovelytools.ai — ovulation window and pregnancy due date. Standard clinical
// arithmetic (Naegele's rule with cycle adjustment; luteal phase ≈ 14 days) —
// estimates by design, and the steps say so.
import { CalcError, defineCalculator, type CalcInputs, type CalcResult } from '../types';
import { addDays, daysBetween, iso, parseUtc } from './date-utils';

export const ovulation = defineCalculator({
  slug: 'ovulation-calculator',
  name: 'Ovulation Calculator',
  category: 'health',
  description: 'Estimated ovulation day and fertile window from your last period.',
  fields: [
    { id: 'lmp', label: 'First day of last period', kind: 'date', default: '2026-07-01', required: true },
    { id: 'cycle', label: 'Cycle length', kind: 'integer', default: 28, min: 21, max: 45, suffix: 'days' },
  ],
  compute(inputs: CalcInputs): CalcResult {
    const lmp = parseUtc(inputs.lmp as string, 'lmp');
    const cycle = Number(inputs.cycle);

    // Ovulation ≈ next period − 14 days (the luteal phase is the stable half).
    const ovulationDay = addDays(lmp, cycle - 14);
    const fertileStart = addDays(ovulationDay, -5); // sperm survive ~5 days
    const fertileEnd = addDays(ovulationDay, 1);
    const nextPeriod = addDays(lmp, cycle);

    return {
      primary: { label: 'Estimated ovulation', value: iso(ovulationDay), format: { kind: 'text' }, tone: 'positive' },
      secondary: [
        { label: 'Fertile window', value: `${iso(fertileStart)} → ${iso(fertileEnd)}`, format: { kind: 'text' }, tone: 'positive' },
        { label: 'Next period expected', value: iso(nextPeriod), format: { kind: 'text' } },
        { label: 'Cycle', value: cycle, format: { kind: 'number', unit: 'days' } },
      ],
      formula: 'ovulation ≈ last period + (cycle − 14)',
      steps: [
        `${iso(lmp)} + (${cycle} − 14) days = ${iso(ovulationDay)}`,
        'The fertile window spans the 5 days before ovulation through the day after.',
        'Cycles vary — this is an estimate, not a guarantee of the fertile days.',
      ],
    };
  },
  vectors: [
    { inputs: { lmp: '2026-07-01', cycle: '28' }, expectPrimary: '2026-07-15' },
    { inputs: { lmp: '2026-07-01', cycle: '32' }, expectPrimary: '2026-07-19' },
  ],
});

export const pregnancy = defineCalculator({
  slug: 'pregnancy-calculator',
  name: 'Pregnancy Calculator',
  category: 'health',
  description: 'Due date and week-by-week progress from your last period.',
  fields: [
    { id: 'lmp', label: 'First day of last period', kind: 'date', default: '2026-01-01', required: true },
    { id: 'cycle', label: 'Cycle length', kind: 'integer', default: 28, min: 21, max: 45, suffix: 'days' },
    { id: 'asof', label: 'Progress as of', kind: 'date', default: 'today' },
  ],
  compute(inputs: CalcInputs): CalcResult {
    const lmp = parseUtc(inputs.lmp as string, 'lmp');
    const cycle = Number(inputs.cycle);
    const asof = parseUtc(inputs.asof as string, 'asof');

    // Naegele's rule (LMP + 280 days), shifted by the cycle's deviation from 28.
    const due = addDays(lmp, 280 + (cycle - 28));
    const gestDays = daysBetween(lmp, asof);
    const weeks = Math.floor(gestDays / 7);
    const trimester2 = addDays(lmp, 13 * 7 + (cycle - 28));
    const trimester3 = addDays(lmp, 27 * 7 + (cycle - 28));

    const progress =
      gestDays < 0
        ? 'Before the entered period date'
        : gestDays > 310
          ? 'Past any plausible due date — check the period date'
          : `${weeks} weeks ${gestDays % 7} days`;

    return {
      primary: { label: 'Estimated due date', value: iso(due), format: { kind: 'text' }, tone: 'positive' },
      secondary: [
        { label: `Progress (as of ${iso(asof)})`, value: progress, format: { kind: 'text' } },
        { label: 'Second trimester from', value: iso(trimester2), format: { kind: 'text' } },
        { label: 'Third trimester from', value: iso(trimester3), format: { kind: 'text' } },
        { label: 'Days until due date', value: Math.max(0, daysBetween(asof, due)), format: { kind: 'number', unit: 'days' } },
      ],
      formula: 'due ≈ last period + 280 days + (cycle − 28)   (Naegele’s rule)',
      steps: [
        `${iso(lmp)} + 280 ${cycle === 28 ? '' : `+ ${cycle - 28} `}days = ${iso(due)}`,
        'Only ~4% of babies arrive on the exact date — most within two weeks either side.',
      ],
    };
  },
  vectors: [
    { inputs: { lmp: '2026-01-01', cycle: '28', asof: '2026-07-18' }, expectPrimary: '2026-10-08' },
    { inputs: { lmp: '2026-01-01', cycle: '32', asof: '2026-07-18' }, expectPrimary: '2026-10-12' },
  ],
});
