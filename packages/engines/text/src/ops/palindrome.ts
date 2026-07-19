// lovelytools.ai — palindrome check. Normalizes case and (optionally) strips
// non-alphanumeric characters before comparing to its own reverse.
import { graphemes } from '../segment';
import { defineTextOp, type TextOptions, type TextResult } from '../types';

export const palindromeChecker = defineTextOp({
  slug: 'palindrome-checker',
  name: 'Palindrome Checker',
  description: 'Check whether a word or phrase is a palindrome.',
  inputs: 1,
  options: [
    { id: 'ignorePunctuation', label: 'Ignore spaces & punctuation', kind: 'toggle', default: true },
    { id: 'caseSensitive', label: 'Case sensitive', kind: 'toggle', default: false },
  ],
  run(input: string, options: TextOptions): TextResult {
    let clean = input;
    if (options.ignorePunctuation) clean = clean.replace(/[^\p{L}\p{N}]/gu, '');
    if (!options.caseSensitive) clean = clean.toLowerCase();

    const chars = graphemes(clean);
    const isPalindrome = chars.length > 0 && chars.join('') === chars.slice().reverse().join('');
    const output = isPalindrome ? 'Yes — this is a palindrome.' : 'No — this is not a palindrome.';
    return { output, notes: [`Normalized: "${clean}"`] };
  },
  vectors: [
    { input: 'A man, a plan, a canal: Panama', expect: 'Yes — this is a palindrome.' },
    { input: 'hello', expect: 'No — this is not a palindrome.' },
    { input: 'racecar', expect: 'Yes — this is a palindrome.' },
  ],
});
