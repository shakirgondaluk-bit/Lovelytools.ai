// lovelytools.ai — find & replace with optional regex, case-insensitivity and
// whole-word matching. In plain mode the needle is escaped so "1+1" finds the
// literal string, not "11".
import { computeStats } from './stats';
import { defineTextOp, TextError, type TextOptions, type TextResult } from '../types';

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const findAndReplace = defineTextOp({
  slug: 'find-and-replace',
  name: 'Find and Replace',
  description: 'Replace every match — plain text or full regex, with $1 capture groups.',
  inputs: 1,
  options: [
    { id: 'find', label: 'Find', kind: 'text', default: '', placeholder: 'text or /pattern/' },
    { id: 'replace', label: 'Replace with', kind: 'text', default: '', placeholder: 'leave empty to delete' },
    { id: 'regex', label: 'Regular expression', kind: 'toggle', default: false },
    { id: 'ignoreCase', label: 'Ignore case', kind: 'toggle', default: false },
    { id: 'wholeWord', label: 'Whole words only', kind: 'toggle', default: false },
  ],
  run(input: string, options: TextOptions): TextResult {
    const find = String(options.find ?? '');
    if (find === '') return { output: input, notes: ['Type something to find.'] };
    const replacement = String(options.replace ?? '');

    let source = options.regex ? find : escapeRe(find);
    if (options.wholeWord) source = `\\b(?:${source})\\b`;

    let re: RegExp;
    try {
      re = new RegExp(source, options.ignoreCase ? 'gi' : 'g');
    } catch (e) {
      throw new TextError('invalid-input', `That isn’t a valid regular expression: ${(e as Error).message}`);
    }

    const count = [...input.matchAll(re)].length;
    // In plain mode the replacement is literal — "$" must not be a capture ref.
    const output = options.regex
      ? input.replace(re, replacement)
      : input.replace(re, () => replacement);

    return {
      output,
      stats: computeStats(output),
      notes: [`${count} replacement(s) made.`],
    };
  },
  vectors: [
    { input: 'the cat sat on the cat', options: { find: 'cat', replace: 'dog' }, expect: 'the dog sat on the dog' },
    { input: 'a1 b22 c333', options: { find: '\\d+', replace: '#', regex: true }, expect: 'a# b# c#' },
    { input: 'cat catalog', options: { find: 'cat', replace: 'dog', wholeWord: true }, expect: 'dog catalog' },
    { input: 'price: $5', options: { find: '$5', replace: '$10' }, expect: 'price: $10' },
  ],
});
