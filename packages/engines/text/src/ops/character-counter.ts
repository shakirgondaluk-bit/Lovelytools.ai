// lovelytools.ai — character-focused counts. word-counter already reports the
// full TextStats; this tool leads with a letters/digits/spaces/punctuation
// breakdown instead.
import { countGraphemes } from '../segment';
import { computeStats } from './stats';
import { defineTextOp, type TextOptions, type TextResult } from '../types';

export const characterCounter = defineTextOp({
  slug: 'character-counter',
  name: 'Character Counter',
  description: 'Count characters with and without spaces, plus a letters/digits/punctuation breakdown.',
  inputs: 1,
  options: [
    { id: 'limit', label: 'Character limit (0 = none)', kind: 'number', default: 0, min: 0, max: 1000000 },
  ],
  run(input: string, options: TextOptions): TextResult {
    const letters = (input.match(/\p{L}/gu) ?? []).length;
    const digits = (input.match(/\p{N}/gu) ?? []).length;
    const spaces = (input.match(/\s/gu) ?? []).length;
    const punctuation = (input.match(/\p{P}/gu) ?? []).length;
    const notes = [`${letters} letter(s) · ${digits} digit(s) · ${spaces} space(s) · ${punctuation} punctuation`];

    const limit = Math.trunc(Number(options.limit)) || 0;
    if (limit > 0) {
      const count = countGraphemes(input);
      notes.push(count > limit ? `${count - limit} over the ${limit}-character limit.` : `${limit - count} character(s) remaining.`);
    }

    return { output: input, stats: computeStats(input), notes };
  },
  vectors: [{ input: 'ab 12!', expect: 'ab 12!' }],
});
