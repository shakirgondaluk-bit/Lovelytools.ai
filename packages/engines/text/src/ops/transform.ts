// lovelytools.ai — reverse (grapheme-safe), repeat (with a hard output cap),
// and the two single-purpose case tools that share case.ts's transforms.
import { graphemes } from '../segment';
import { TRANSFORMS } from './case';
import { computeStats } from './stats';
import { defineTextOp, TextError, type TextOptions, type TextResult } from '../types';

export const reverseText = defineTextOp({
  slug: 'reverse-text',
  name: 'Reverse Text',
  description: 'Reverse by characters, words or lines — emoji and accents stay intact.',
  inputs: 1,
  options: [
    { id: 'unit', label: 'Reverse', kind: 'select', default: 'characters', options: [
      { value: 'characters', label: 'Characters' },
      { value: 'words', label: 'Word order' },
      { value: 'lines', label: 'Line order' },
    ] },
  ],
  run(input: string, options: TextOptions): TextResult {
    let output: string;
    switch (options.unit) {
      case 'words':
        // Reverse word order per line; whitespace runs travel with the split.
        output = input
          .split(/\r\n|\r|\n/)
          .map((l) => l.split(/\s+/).filter(Boolean).reverse().join(' '))
          .join('\n');
        break;
      case 'lines':
        output = input.split(/\r\n|\r|\n/).reverse().join('\n');
        break;
      default:
        // Graphemes, not code units — "noël👍".split('').reverse() shreds both.
        output = input
          .split(/\r\n|\r|\n/)
          .map((l) => graphemes(l).reverse().join(''))
          .join('\n');
    }
    return { output, stats: computeStats(output) };
  },
  vectors: [
    { input: 'abc', expect: 'cba' },
    { input: 'one two three', options: { unit: 'words' }, expect: 'three two one' },
    { input: 'a\nb\nc', options: { unit: 'lines' }, expect: 'c\nb\na' },
  ],
});

const MAX_OUTPUT = 1_000_000;

export const textRepeater = defineTextOp({
  slug: 'text-repeater',
  name: 'Text Repeater',
  description: 'Repeat any text N times, with your choice of separator.',
  inputs: 1,
  options: [
    { id: 'times', label: 'Repeat', kind: 'number', default: 10, min: 1, max: 100000 },
    { id: 'separator', label: 'Between repeats', kind: 'select', default: 'newline', options: [
      { value: 'newline', label: 'New line' }, { value: 'space', label: 'Space' },
      { value: 'none', label: 'Nothing' }, { value: 'comma', label: 'Comma + space' },
    ] },
  ],
  run(input: string, options: TextOptions): TextResult {
    const times = Math.max(1, Math.trunc(Number(options.times) || 1));
    const sep = { newline: '\n', space: ' ', none: '', comma: ', ' }[String(options.separator)] ?? '\n';
    const projected = input.length * times + sep.length * (times - 1);
    if (projected > MAX_OUTPUT) {
      throw new TextError('invalid-input', `That would be ${(projected / 1e6).toFixed(1)} MB of text — the cap is 1 MB. Lower the count.`);
    }
    const output = Array(times).fill(input).join(sep);
    return { output, stats: computeStats(output) };
  },
  vectors: [
    { input: 'ab', options: { times: 3, separator: 'none' }, expect: 'ababab' },
    { input: 'hey', options: { times: 2, separator: 'comma' }, expect: 'hey, hey' },
  ],
});

export const upperLower = defineTextOp({
  slug: 'uppercase-to-lowercase',
  name: 'Uppercase to Lowercase',
  description: 'Flip text to all lowercase or ALL UPPERCASE, locale-aware.',
  inputs: 1,
  options: [
    { id: 'mode', label: 'Convert to', kind: 'select', default: 'lower', options: [
      { value: 'lower', label: 'lowercase' }, { value: 'upper', label: 'UPPERCASE' },
    ] },
    { id: 'locale', label: 'Language', kind: 'select', default: 'en', options: [
      { value: 'en', label: 'English' }, { value: 'tr', label: 'Turkish' }, { value: 'de', label: 'German' },
    ] },
  ],
  run(input: string, options: TextOptions): TextResult {
    const fn = options.mode === 'upper' ? TRANSFORMS.upper : TRANSFORMS.lower;
    const output = fn(input, String(options.locale || 'en'));
    return { output, stats: computeStats(output) };
  },
  vectors: [
    { input: 'Hello WORLD', expect: 'hello world' },
    { input: 'hello', options: { mode: 'upper' }, expect: 'HELLO' },
  ],
});

export const titleCase = defineTextOp({
  slug: 'title-case-converter',
  name: 'Title Case Converter',
  description: 'Headline-style capitalization that leaves the small words small.',
  inputs: 1,
  options: [
    { id: 'style', label: 'Style', kind: 'select', default: 'title', options: [
      { value: 'title', label: 'Title Case (AP-style small words)' },
      { value: 'capitalize', label: 'Capitalize Every Word' },
      { value: 'sentence', label: 'Sentence case' },
    ] },
  ],
  run(input: string, options: TextOptions): TextResult {
    const style = String(options.style);
    const fn = style === 'capitalize' ? TRANSFORMS.capitalize : style === 'sentence' ? TRANSFORMS.sentence : TRANSFORMS.title;
    const output = fn(input, 'en');
    return { output, stats: computeStats(output) };
  },
  vectors: [
    { input: 'the quick brown fox', expect: 'The Quick Brown Fox' },
    { input: 'a tale of two cities', expect: 'A Tale of Two Cities' },
  ],
});
