// lovelytools.ai — line-level tools: numbering, counting, dedupe, join,
// whitespace cleanup. All share one split so CRLF never leaks through.
import { computeStats } from './stats';
import { defineTextOp, type TextOptions, type TextResult } from '../types';

const splitLines = (s: string): string[] => s.split(/\r\n|\r|\n/);

export const addLineNumbers = defineTextOp({
  slug: 'add-line-numbers',
  name: 'Add Line Numbers',
  description: 'Prefix every line with its number — padded, from any start.',
  inputs: 1,
  options: [
    { id: 'start', label: 'Start at', kind: 'number', default: 1, min: 0, max: 100000 },
    { id: 'separator', label: 'After the number', kind: 'text', default: '. ', placeholder: '. ' },
    { id: 'pad', label: 'Right-align numbers', kind: 'toggle', default: true },
    { id: 'skipBlank', label: 'Skip blank lines', kind: 'toggle', default: false },
  ],
  run(input: string, options: TextOptions): TextResult {
    const lines = splitLines(input);
    const start = Math.trunc(Number(options.start)) || 1;
    const sep = String(options.separator ?? '. ');
    const numbered = lines.filter((l) => !options.skipBlank || l.trim() !== '').length;
    const width = String(start + Math.max(0, numbered - 1)).length;

    let n = start;
    const output = lines
      .map((line) => {
        if (options.skipBlank && line.trim() === '') return line;
        const num = options.pad ? String(n).padStart(width, ' ') : String(n);
        n++;
        return `${num}${sep}${line}`;
      })
      .join('\n');
    return { output, stats: computeStats(output) };
  },
  vectors: [
    { input: 'alpha\nbeta', expect: '1. alpha\n2. beta' },
    { input: 'a\nb\nc', options: { start: 9 }, expect: ' 9. a\n10. b\n11. c' },
  ],
});

export const countLines = defineTextOp({
  slug: 'count-lines',
  name: 'Count Lines',
  description: 'Total, non-empty and unique line counts for any block of text.',
  inputs: 1,
  options: [],
  run(input: string): TextResult {
    const lines = input === '' ? [] : splitLines(input);
    const nonEmpty = lines.filter((l) => l.trim() !== '');
    const unique = new Set(lines).size;
    return {
      output: input,
      stats: computeStats(input),
      notes: [
        `${lines.length} line(s) total`,
        `${nonEmpty.length} non-empty`,
        `${unique} unique`,
      ],
    };
  },
  vectors: [{ input: 'a\nb\na', expect: 'a\nb\na' }],
});

export const removeDuplicateLines = defineTextOp({
  slug: 'remove-duplicate-lines',
  name: 'Remove Duplicate Lines',
  description: 'Keep the first occurrence of every line, in original order.',
  inputs: 1,
  options: [
    { id: 'caseSensitive', label: 'Case sensitive', kind: 'toggle', default: true },
    { id: 'trimFirst', label: 'Ignore leading/trailing spaces when comparing', kind: 'toggle', default: false },
  ],
  run(input: string, options: TextOptions): TextResult {
    const seen = new Set<string>();
    const key = (l: string) => {
      let k = l;
      if (options.trimFirst) k = k.trim();
      if (!options.caseSensitive) k = k.toLowerCase();
      return k;
    };
    const lines = splitLines(input);
    const kept = lines.filter((l) => (seen.has(key(l)) ? false : (seen.add(key(l)), true)));
    const output = kept.join('\n');
    return {
      output,
      stats: computeStats(output),
      notes: [`Removed ${lines.length - kept.length} duplicate line(s) of ${lines.length}.`],
    };
  },
  vectors: [
    { input: 'a\nb\na\nc\nb', expect: 'a\nb\nc' },
    { input: 'A\na', options: { caseSensitive: false }, expect: 'A' },
  ],
});

export const removeLineBreaks = defineTextOp({
  slug: 'remove-line-breaks',
  name: 'Remove Line Breaks',
  description: 'Join lines into flowing text — optionally keeping paragraph breaks.',
  inputs: 1,
  options: [
    { id: 'keepParagraphs', label: 'Keep paragraph breaks (blank lines)', kind: 'toggle', default: true },
    { id: 'joiner', label: 'Join lines with', kind: 'select', default: 'space', options: [
      { value: 'space', label: 'A space' }, { value: 'none', label: 'Nothing' },
    ] },
  ],
  run(input: string, options: TextOptions): TextResult {
    const glue = options.joiner === 'none' ? '' : ' ';
    const joinBlock = (block: string) =>
      splitLines(block)
        .map((l) => l.trim())
        .filter((l) => l !== '')
        .join(glue);

    const output = options.keepParagraphs
      ? input.split(/\n{2,}|\r\n\r\n/).map(joinBlock).filter(Boolean).join('\n\n')
      : joinBlock(input);
    return { output, stats: computeStats(output) };
  },
  vectors: [
    { input: 'one\ntwo\nthree', expect: 'one two three' },
    { input: 'a\nb\n\nc\nd', options: { keepParagraphs: true }, expect: 'a b\n\nc d' },
  ],
});

export const removeExtraSpaces = defineTextOp({
  slug: 'remove-extra-spaces',
  name: 'Remove Extra Spaces',
  description: 'Collapse runs of spaces and tabs, trim line edges, squeeze blank lines.',
  inputs: 1,
  options: [
    { id: 'collapseBlank', label: 'Collapse multiple blank lines to one', kind: 'toggle', default: true },
    { id: 'tabsToSpaces', label: 'Tabs become spaces', kind: 'toggle', default: true },
  ],
  run(input: string, options: TextOptions): TextResult {
    let text = input;
    if (options.tabsToSpaces) text = text.replace(/\t/g, ' ');
    let out = splitLines(text).map((l) => l.replace(/ {2,}/g, ' ').trim());
    if (options.collapseBlank) {
      const squeezed: string[] = [];
      for (const line of out) {
        if (line === '' && squeezed[squeezed.length - 1] === '') continue;
        squeezed.push(line);
      }
      out = squeezed;
    }
    // Leading/trailing blank lines add nothing to "cleaned" text.
    while (out[0] === '') out.shift();
    while (out[out.length - 1] === '') out.pop();
    const output = out.join('\n');
    return { output, stats: computeStats(output) };
  },
  vectors: [
    { input: '  hello   world  ', expect: 'hello world' },
    { input: 'a\n\n\n\nb', expect: 'a\n\nb' },
  ],
});
