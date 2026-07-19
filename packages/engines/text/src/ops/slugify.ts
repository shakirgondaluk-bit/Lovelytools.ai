// lovelytools.ai — slugify with Unicode transliteration. NFKD strips accents;
// a small curated map covers characters NFKD won't decompose.
import { defineTextOp, type TextOptions, type TextResult } from '../types';

// Characters NFKD leaves intact but that have obvious ASCII equivalents.
const MAP: Record<string, string> = {
  ø: 'o', Ø: 'o', ł: 'l', Ł: 'l', đ: 'd', Đ: 'd', ß: 'ss', æ: 'ae', Æ: 'ae',
  œ: 'oe', Œ: 'oe', þ: 'th', Þ: 'th', ð: 'd', Ð: 'd', ı: 'i', ĳ: 'ij',
};

export function slugify(text: string, separator = '-', lower = true): string {
  let s = text.trim();
  s = Array.from(s).map((ch) => MAP[ch] ?? ch).join('');
  s = s.normalize('NFKD').replace(/[\u0300-\u036f]/g, ''); // strip combining marks
  if (lower) s = s.toLowerCase();
  s = s
    .replace(/[^a-zA-Z0-9]+/g, separator) // non-alnum → separator
    .replace(new RegExp(`\\${separator}{2,}`, 'g'), separator)
    .replace(new RegExp(`^\\${separator}|\\${separator}$`, 'g'), '');
  return s;
}

export const slug = defineTextOp({
  // The registry's slug for this tool — 'slug-generator' was a pre-registry
  // name that powered no page.
  slug: 'text-to-slug',
  name: 'Text to Slug',
  description: 'Clean URL slugs from any text, with Unicode transliteration.',
  inputs: 1,
  options: [
    { id: 'separator', label: 'Separator', kind: 'select', default: '-', options: [
      { value: '-', label: 'Hyphen (-)' }, { value: '_', label: 'Underscore (_)' },
    ] },
    { id: 'lower', label: 'Lowercase', kind: 'toggle', default: true },
    { id: 'perLine', label: 'One slug per line', kind: 'toggle', default: false },
  ],
  run(input: string, options: TextOptions): TextResult {
    const sep = String(options.separator || '-');
    const lower = options.lower !== false;
    const output = options.perLine
      ? input.split(/\r\n|\r|\n/).map((l) => slugify(l, sep, lower)).join('\n')
      : slugify(input, sep, lower);
    return { output };
  },
  vectors: [
    { input: 'Hello World!', expect: 'hello-world' },
    { input: 'Æther — Øresund café', expect: 'aether-oresund-cafe' },
  ],
});
