// lovelytools.ai — deterministic lorem ipsum. Seeded PRNG so the same options
// always yield the same text (stable SSR, no hydration mismatch).
import { computeStats } from './stats';
import { defineTextOp, type TextOptions, type TextResult } from '../types';

const WORDS = ('lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor ' +
  'incididunt ut labore et dolore magna aliqua enim ad minim veniam quis nostrud ' +
  'exercitation ullamco laboris nisi aliquip ex ea commodo consequat duis aute irure ' +
  'reprehenderit voluptate velit esse cillum eu fugiat nulla pariatur excepteur sint ' +
  'occaecat cupidatat non proident sunt culpa qui officia deserunt mollit anim id est laborum')
  .split(' ');

/** Mulberry32 — tiny deterministic PRNG. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** rand() is in [0,1), so the index is always inside WORDS; `?? 'lorem'` is the
 *  branch the compiler needs and never taken at runtime. */
const pick = (rand: () => number): string => WORDS[Math.floor(rand() * WORDS.length)] ?? 'lorem';

function sentence(rand: () => number, cap: boolean): string {
  const len = 6 + Math.floor(rand() * 10);
  const w: string[] = [];
  for (let i = 0; i < len; i++) w.push(pick(rand));
  let s = w.join(' ');
  if (rand() > 0.7) s = s.replace(/ (\w+) /, ' $1, ');
  if (cap) s = s.charAt(0).toUpperCase() + s.slice(1);
  return s + '.';
}

export const lorem = defineTextOp({
  slug: 'lorem-ipsum-generator',
  name: 'Lorem Ipsum Generator',
  description: 'Placeholder text by paragraphs, sentences, or words — deterministic per seed.',
  inputs: 1,
  generator: true,
  options: [
    { id: 'unit', label: 'Generate', kind: 'select', default: 'paragraphs', options: [
      { value: 'paragraphs', label: 'Paragraphs' }, { value: 'sentences', label: 'Sentences' }, { value: 'words', label: 'Words' },
    ] },
    { id: 'count', label: 'How many', kind: 'number', default: 3, min: 1, max: 100 },
    { id: 'startClassic', label: 'Start with "Lorem ipsum…"', kind: 'toggle', default: true },
    { id: 'seed', label: 'Seed', kind: 'number', default: 42, min: 0, max: 999999 },
  ],
  run(_input: string, options: TextOptions): TextResult {
    const rand = rng(Number(options.seed) || 42);
    const count = Math.max(1, Math.min(100, Number(options.count) || 3));
    const unit = String(options.unit);
    let output = '';

    if (unit === 'words') {
      const w: string[] = [];
      for (let i = 0; i < count; i++) w.push(pick(rand));
      output = w.join(' ');
      if (options.startClassic) output = 'Lorem ipsum ' + output;
    } else if (unit === 'sentences') {
      const s: string[] = [];
      for (let i = 0; i < count; i++) s.push(sentence(rand, true));
      output = s.join(' ');
      if (options.startClassic) output = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. ' + output;
    } else {
      const paras: string[] = [];
      for (let p = 0; p < count; p++) {
        const n = 3 + Math.floor(rand() * 4);
        const s: string[] = [];
        for (let i = 0; i < n; i++) s.push(sentence(rand, true));
        paras.push(s.join(' '));
      }
      if (options.startClassic) paras[0] = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. ' + paras[0];
      output = paras.join('\n\n');
    }
    return { output, stats: computeStats(output) };
  },
  vectors: [
    { input: '', options: { unit: 'words', count: 5, startClassic: false, seed: 42 }, expect: 'reprehenderit laboris sunt cillum eiusmod' },
    { input: '', options: { unit: 'sentences', count: 1, startClassic: false, seed: 7 }, expect: 'Sit est fugiat commodo exercitation nisi.' },
  ],
});
