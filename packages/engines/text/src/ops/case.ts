// lovelytools.ai — case transforms. Locale-aware upper/lower; word-boundary
// aware title/camel/snake/kebab/constant.
import { words as splitWords } from '../segment';
import { computeStats } from './stats';
import { defineTextOp, type TextOptions, type TextResult } from '../types';

const SMALL_WORDS = new Set(['a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'in', 'nor', 'of', 'on', 'or', 'so', 'the', 'to', 'up', 'yet', 'vs', 'via']);

/** Split into word tokens for programmer cases (handles camelCase, kebab, snake, spaces). */
function tokens(text: string): string[] {
  return text
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2') // camel → spaced
    .replace(/[_\-./]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

// Keyed by the mode literals rather than `string`: that makes TRANSFORMS.upper a
// known key (so the fallback below is a real function, not `| undefined`), and it
// means a mode listed in `options` with no transform is a compile error.
type CaseMode =
  | 'upper' | 'lower' | 'sentence' | 'title' | 'capitalize'
  | 'camel' | 'pascal' | 'snake' | 'kebab' | 'constant' | 'toggle';

export const TRANSFORMS: Record<CaseMode, (t: string, locale: string) => string> = {
  upper: (t, l) => t.toLocaleUpperCase(l),
  lower: (t, l) => t.toLocaleLowerCase(l),
  sentence: (t, l) =>
    t.toLocaleLowerCase(l).replace(/(^\s*\p{L})|([.!?]\s+\p{L})/gu, (m) => m.toLocaleUpperCase(l)),
  title: (t, l) =>
    splitWords(t, l).length === 0
      ? t
      : t.toLocaleLowerCase(l).replace(/\p{L}[\p{L}'']*/gu, (word, offset, full) => {
          const isEdge = offset === 0 || offset + word.length === full.trimEnd().length;
          return !isEdge && SMALL_WORDS.has(word) ? word : word.charAt(0).toLocaleUpperCase(l) + word.slice(1);
        }),
  capitalize: (t, l) => t.replace(/\b\p{L}/gu, (m) => m.toLocaleUpperCase(l)),
  camel: (t, l) =>
    tokens(t).map((w, i) => (i === 0 ? w.toLocaleLowerCase(l) : w.charAt(0).toLocaleUpperCase(l) + w.slice(1).toLocaleLowerCase(l))).join(''),
  pascal: (t, l) =>
    tokens(t).map((w) => w.charAt(0).toLocaleUpperCase(l) + w.slice(1).toLocaleLowerCase(l)).join(''),
  snake: (t, l) => tokens(t).map((w) => w.toLocaleLowerCase(l)).join('_'),
  kebab: (t, l) => tokens(t).map((w) => w.toLocaleLowerCase(l)).join('-'),
  constant: (t, l) => tokens(t).map((w) => w.toLocaleUpperCase(l)).join('_'),
  toggle: (t, l) =>
    Array.from(t).map((ch) => (ch === ch.toLocaleUpperCase(l) ? ch.toLocaleLowerCase(l) : ch.toLocaleUpperCase(l))).join(''),
};

const isCaseMode = (m: string): m is CaseMode => Object.hasOwn(TRANSFORMS, m);

export const changeCase = defineTextOp({
  slug: 'case-converter',
  name: 'Case Converter',
  description: 'UPPER, lower, Title, Sentence, camelCase, snake_case, kebab-case, CONSTANT_CASE.',
  inputs: 1,
  options: [
    { id: 'mode', label: 'Case', kind: 'select', default: 'title', options: [
      { value: 'upper', label: 'UPPERCASE' }, { value: 'lower', label: 'lowercase' },
      { value: 'title', label: 'Title Case' }, { value: 'sentence', label: 'Sentence case' },
      { value: 'capitalize', label: 'Capitalize Each Word' }, { value: 'camel', label: 'camelCase' },
      { value: 'pascal', label: 'PascalCase' }, { value: 'snake', label: 'snake_case' },
      { value: 'kebab', label: 'kebab-case' }, { value: 'constant', label: 'CONSTANT_CASE' },
      { value: 'toggle', label: 'tOGGLE cASE' },
    ] },
    { id: 'locale', label: 'Language', kind: 'select', default: 'en', options: [
      { value: 'en', label: 'English' }, { value: 'tr', label: 'Turkish' }, { value: 'de', label: 'German' },
    ] },
  ],
  run(input: string, options: TextOptions): TextResult {
    const mode = String(options.mode);
    const fn = isCaseMode(mode) ? TRANSFORMS[mode] : TRANSFORMS.upper;
    const output = fn(input, String(options.locale || 'en'));
    return { output, stats: computeStats(output) };
  },
  vectors: [
    { input: 'the quick brown fox', options: { mode: 'title' }, expect: 'The Quick Brown Fox' },
    { input: 'hello world example', options: { mode: 'camel' }, expect: 'helloWorldExample' },
  ],
});
