// lovelytools.ai — text <-> Unicode code points, e.g. "Hi" <-> "U+0048 U+0069".
// Iterates by code point (not UTF-16 code unit) so astral characters like emoji
// round-trip as one token, not a broken surrogate pair.
import { defineTextOp, TextError, type TextOptions, type TextResult } from '../types';

function toCodePoints(text: string): string {
  return Array.from(text, (ch) => `U+${ch.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0')}`).join(' ');
}

function fromCodePoints(text: string): string {
  const tokens = text.trim().split(/\s+/).filter(Boolean);
  return tokens
    .map((tok) => {
      const hex = tok.replace(/^(U\+|0x)/i, '');
      const cp = parseInt(hex, 16);
      if (!hex || Number.isNaN(cp) || cp < 0 || cp > 0x10ffff) {
        throw new TextError('invalid-input', `"${tok}" isn’t a valid code point — expected something like U+0041.`);
      }
      return String.fromCodePoint(cp);
    })
    .join('');
}

export const unicodeConverter = defineTextOp({
  slug: 'unicode-converter',
  name: 'Unicode Converter',
  description: 'Convert text to and from Unicode code points (U+XXXX).',
  inputs: 1,
  options: [
    { id: 'direction', label: 'Direction', kind: 'select', default: 'encode', options: [
      { value: 'encode', label: 'Text → Code points' }, { value: 'decode', label: 'Code points → Text' },
    ] },
  ],
  run(input: string, options: TextOptions): TextResult {
    const output = options.direction === 'decode' ? fromCodePoints(input) : toCodePoints(input);
    return { output };
  },
  vectors: [
    { input: 'Hi', expect: 'U+0048 U+0069' },
    { input: 'U+0048 U+0069', options: { direction: 'decode' }, expect: 'Hi' },
    { input: '😀', expect: 'U+1F600' },
    { input: 'U+1F600', options: { direction: 'decode' }, expect: '😀' },
  ],
});
