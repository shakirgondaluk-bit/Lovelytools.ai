// lovelytools.ai — random word generator. Same seeded-PRNG approach as
// lorem.ts (deterministic per seed → stable SSR, no hydration mismatch), but
// drawing from an everyday English word bank instead of pseudo-Latin filler.
import { TRANSFORMS } from './case';
import { defineTextOp, type TextOptions, type TextResult } from '../types';

const WORDS = (
  'time year people way day man thing woman life child world school state family student ' +
  'group country problem hand part place case week company system program question work ' +
  'government number night point home water room mother area money story fact month lot ' +
  'right study book eye job word business issue side kind head house service friend father ' +
  'power hour game line end member law car city community name president team minute idea ' +
  'body information back parent face others level office door health person art war history ' +
  'party result change morning reason research girl guy moment air teacher force education'
).split(' ');

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

const pick = (rand: () => number): string => WORDS[Math.floor(rand() * WORDS.length)] ?? 'time';

export const randomWords = defineTextOp({
  slug: 'random-word-generator',
  name: 'Random Word Generator',
  description: 'Generate random words for prompts and games.',
  inputs: 1,
  generator: true,
  options: [
    { id: 'count', label: 'How many', kind: 'number', default: 10, min: 1, max: 500 },
    { id: 'separator', label: 'Between words', kind: 'select', default: 'newline', options: [
      { value: 'newline', label: 'New line' }, { value: 'space', label: 'Space' }, { value: 'comma', label: 'Comma' },
    ] },
    { id: 'casing', label: 'Case', kind: 'select', default: 'lower', options: [
      { value: 'lower', label: 'lowercase' }, { value: 'capitalize', label: 'Capitalized' }, { value: 'upper', label: 'UPPERCASE' },
    ] },
    { id: 'seed', label: 'Seed', kind: 'number', default: 1, min: 0, max: 999999 },
  ],
  run(_input: string, options: TextOptions): TextResult {
    const rand = rng(Number(options.seed) || 1);
    const count = Math.max(1, Math.min(500, Math.trunc(Number(options.count)) || 10));
    const casing = options.casing === 'upper' ? TRANSFORMS.upper : options.casing === 'capitalize' ? TRANSFORMS.capitalize : TRANSFORMS.lower;
    const sep = { newline: '\n', space: ' ', comma: ', ' }[String(options.separator)] ?? '\n';

    const words: string[] = [];
    for (let i = 0; i < count; i++) words.push(casing(pick(rand), 'en'));
    return { output: words.join(sep) };
  },
  vectors: [
    { input: '', options: { count: 3, seed: 1, separator: 'space' }, expect: 'member time head' },
  ],
});
