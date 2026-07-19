// lovelytools.ai — line sorting: alpha, natural, length, numeric; reverse; dedupe.
import { computeStats } from './stats';
import { defineTextOp, type TextOptions, type TextResult } from '../types';

const naturalCollator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

export const sortLines = defineTextOp({
  slug: 'sort-lines',
  name: 'Sort Text Lines',
  description: 'Alphabetical, natural (file2 < file10), by length, or numeric — with reverse and dedupe.',
  inputs: 1,
  options: [
    { id: 'mode', label: 'Sort by', kind: 'select', default: 'natural', options: [
      { value: 'alpha', label: 'Alphabetical (A–Z)' },
      { value: 'natural', label: 'Natural (numbers in order)' },
      { value: 'length', label: 'Line length' },
      { value: 'numeric', label: 'Numeric value' },
    ] },
    { id: 'caseSensitive', label: 'Case sensitive', kind: 'toggle', default: false },
    { id: 'reverse', label: 'Reverse', kind: 'toggle', default: false },
    { id: 'dedupe', label: 'Remove duplicates', kind: 'toggle', default: false },
    { id: 'ignoreBlank', label: 'Drop blank lines', kind: 'toggle', default: true },
  ],
  run(input: string, options: TextOptions): TextResult {
    let lines = input.split(/\r\n|\r|\n/);
    if (options.ignoreBlank) lines = lines.filter((l) => l.trim() !== '');
    if (options.dedupe) lines = [...new Set(lines)];

    const cmp = comparator(String(options.mode), !!options.caseSensitive);
    lines.sort(cmp);
    if (options.reverse) lines.reverse();

    const output = lines.join('\n');
    return { output, stats: computeStats(output) };
  },
  vectors: [
    { input: 'banana\napple\ncherry', expect: 'apple\nbanana\ncherry' },
    { input: 'file10\nfile2\nfile1', expect: 'file1\nfile2\nfile10' },
  ],
});

function comparator(mode: string, caseSensitive: boolean): (a: string, b: string) => number {
  switch (mode) {
    case 'length':
      return (a, b) => a.length - b.length || naturalCollator.compare(a, b);
    case 'numeric':
      return (a, b) => (parseFloat(a) || 0) - (parseFloat(b) || 0);
    case 'alpha':
      return caseSensitive
        ? (a, b) => (a < b ? -1 : a > b ? 1 : 0)
        : (a, b) => a.toLowerCase().localeCompare(b.toLowerCase());
    case 'natural':
    default:
      return (a, b) => naturalCollator.compare(a, b);
  }
}
