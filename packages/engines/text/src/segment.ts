// lovelytools.ai — Unicode-correct segmentation. Intl.Segmenter is baseline in
// every browser we support; a code-point fallback keeps counts sane elsewhere.
const HAS_SEG = typeof Intl !== 'undefined' && 'Segmenter' in Intl;

const cache = new Map<string, Intl.Segmenter>();
function segmenter(granularity: 'grapheme' | 'word' | 'sentence', locale: string): Intl.Segmenter {
  const key = `${granularity}:${locale}`;
  let s = cache.get(key);
  if (!s) {
    s = new Intl.Segmenter(locale, { granularity });
    cache.set(key, s);
  }
  return s;
}

/** User-perceived characters: "👨‍👩‍👧‍👦" → 1, "café" → 4. */
export function graphemes(text: string, locale = 'en'): string[] {
  if (!HAS_SEG) return Array.from(text); // code points — better than .length
  return [...segmenter('grapheme', locale).segment(text)].map((s) => s.segment);
}

export function countGraphemes(text: string, locale = 'en'): number {
  if (!HAS_SEG) return Array.from(text).length;
  let n = 0;
  for (const _ of segmenter('grapheme', locale).segment(text)) n++;
  return n;
}

/** Words by locale rules — handles CJK (no spaces) and skips punctuation runs. */
export function words(text: string, locale = 'en'): string[] {
  if (!HAS_SEG) return text.split(/\s+/).filter(Boolean);
  return [...segmenter('word', locale).segment(text)]
    .filter((s) => s.isWordLike)
    .map((s) => s.segment);
}

export function sentences(text: string, locale = 'en'): string[] {
  if (!HAS_SEG) return text.split(/(?<=[.!?])\s+/).filter((s) => s.trim());
  return [...segmenter('sentence', locale).segment(text)]
    .map((s) => s.segment.trim())
    .filter(Boolean);
}

export function paragraphs(text: string): string[] {
  return text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
}

export function lines(text: string): string[] {
  return text.split(/\r\n|\r|\n/);
}
