// lovelytools.ai — "big text" via the Unicode Mathematical Alphanumeric
// Symbols block: real code points, so the result pastes as bold/monospace/
// sans text anywhere (social posts, chat) without needing an image. Each
// style picked below is contiguous in that block (no reserved-letterlike
// holes like italic's missing "h"), so the offset math never needs exceptions.
import { defineTextOp, type TextOptions, type TextResult } from '../types';

interface StyleBase { upper: number; lower: number; digit?: number }

const STYLES: Record<string, StyleBase> = {
  bold: { upper: 0x1d400, lower: 0x1d41a, digit: 0x1d7ce },
  sansBold: { upper: 0x1d5d4, lower: 0x1d5ee, digit: 0x1d7ec },
  monospace: { upper: 0x1d670, lower: 0x1d68a, digit: 0x1d7f6 },
};

function convert(text: string, style: string): string {
  if (style === 'fullwidth') {
    return Array.from(text, (ch) => {
      const c = ch.codePointAt(0)!;
      if (c === 0x20) return '　';
      if (c >= 65 && c <= 90) return String.fromCodePoint(0xff21 + (c - 65));
      if (c >= 97 && c <= 122) return String.fromCodePoint(0xff41 + (c - 97));
      if (c >= 48 && c <= 57) return String.fromCodePoint(0xff10 + (c - 48));
      return ch;
    }).join('');
  }
  const base = STYLES[style] ?? STYLES.bold!;
  return Array.from(text, (ch) => {
    const c = ch.codePointAt(0)!;
    if (c >= 65 && c <= 90) return String.fromCodePoint(base.upper + (c - 65));
    if (c >= 97 && c <= 122) return String.fromCodePoint(base.lower + (c - 97));
    if (c >= 48 && c <= 57 && base.digit !== undefined) return String.fromCodePoint(base.digit + (c - 48));
    return ch;
  }).join('');
}

export const bigText = defineTextOp({
  slug: 'big-text-generator',
  name: 'Big Text Generator',
  description: 'Turn text into large banner-style letters using Unicode bold, sans, monospace or fullwidth glyphs.',
  inputs: 1,
  options: [
    { id: 'style', label: 'Style', kind: 'select', default: 'bold', options: [
      { value: 'bold', label: '𝐁𝐨𝐥𝐝' }, { value: 'sansBold', label: '𝗦𝗮𝗻𝘀 𝗕𝗼𝗹𝗱' },
      { value: 'monospace', label: '𝙼𝚘𝚗𝚘𝚜𝚙𝚊𝚌𝚎' }, { value: 'fullwidth', label: 'Ｆｕｌｌｗｉｄｔｈ' },
    ] },
  ],
  run(input: string, options: TextOptions): TextResult {
    return { output: convert(input, String(options.style || 'bold')) };
  },
  vectors: [
    { input: 'AB1 ab2', options: { style: 'bold' }, expect: '\u{1D400}\u{1D401}\u{1D7CF} \u{1D41A}\u{1D41B}\u{1D7D0}' },
    { input: 'Hi 5', options: { style: 'fullwidth' }, expect: 'Ｈｉ　５' },
  ],
});
