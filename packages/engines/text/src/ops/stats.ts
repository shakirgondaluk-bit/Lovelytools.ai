// lovelytools.ai — text statistics. The counter everyone lands on; correctness
// here is the whole product.
import {
  countGraphemes,
  graphemes,
  lines as splitLines,
  paragraphs as splitParagraphs,
  sentences as splitSentences,
  words as splitWords,
} from '../segment';
import { defineTextOp, type TextOptions, type TextResult, type TextStats } from '../types';

export function computeStats(text: string, wpm = 238, locale = 'en'): TextStats {
  const w = splitWords(text, locale);
  const noSpaces = text.replace(/\s/g, '');
  const longest = w.reduce((max, word) => Math.max(max, countGraphemes(word, locale)), 0);
  return {
    characters: countGraphemes(text, locale),
    charactersNoSpaces: countGraphemes(noSpaces, locale),
    words: w.length,
    sentences: splitSentences(text, locale).length,
    paragraphs: splitParagraphs(text).length,
    lines: text === '' ? 0 : splitLines(text).length,
    readingTimeMin: w.length === 0 ? 0 : Math.max(0.1, Math.ceil((w.length / wpm) * 10) / 10),
    longestWord: longest,
  };
}

export const stats = defineTextOp({
  slug: 'word-counter',
  name: 'Word Counter',
  description: 'Words, characters, sentences, paragraphs, and reading time — Unicode-correct.',
  inputs: 1,
  options: [
    { id: 'wpm', label: 'Reading speed', kind: 'number', default: 238, min: 100, max: 600 },
    { id: 'locale', label: 'Language', kind: 'select', default: 'en', options: [
      { value: 'en', label: 'English' }, { value: 'ja', label: 'Japanese' },
      { value: 'zh', label: 'Chinese' }, { value: 'de', label: 'German' },
    ] },
  ],
  run(input: string, options: TextOptions): TextResult {
    const s = computeStats(input, Number(options.wpm) || 238, String(options.locale || 'en'));
    return { output: input, stats: s };
  },
  vectors: [{ input: 'hello world', expect: 'hello world' }],
});
