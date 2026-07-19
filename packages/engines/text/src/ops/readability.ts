// lovelytools.ai — Flesch Reading Ease + Flesch-Kincaid Grade Level. Syllable
// counting is the standard vowel-group heuristic (count runs of aeiouy, drop
// a trailing silent e, floor of 1 per word) — not phonetically perfect, but
// the same approximation every readability tool uses.
import { sentences as splitSentences, words as splitWords } from '../segment';
import { defineTextOp, type TextResult } from '../types';

function countSyllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return 0;
  let n = (w.match(/[aeiouy]+/g) ?? []).length;
  if (w.endsWith('e') && n > 1) n--;
  return Math.max(1, n);
}

function band(fre: number): string {
  if (fre >= 90) return 'Very Easy';
  if (fre >= 80) return 'Easy';
  if (fre >= 70) return 'Fairly Easy';
  if (fre >= 60) return 'Standard';
  if (fre >= 50) return 'Fairly Difficult';
  if (fre >= 30) return 'Difficult';
  return 'Very Confusing';
}

const round1 = (n: number) => Math.round(n * 10) / 10;

export const readability = defineTextOp({
  slug: 'readability-checker',
  name: 'Readability Checker',
  description: 'Score text readability with Flesch Reading Ease and Flesch-Kincaid grade level.',
  inputs: 1,
  options: [],
  run(input: string): TextResult {
    const words = splitWords(input, 'en');
    const sentenceCount = Math.max(1, splitSentences(input, 'en').length);
    const syllables = words.reduce((sum, w) => sum + countSyllables(w), 0);

    if (words.length === 0) {
      return { output: 'Add some text to see its readability score.' };
    }

    const wordsPerSentence = words.length / sentenceCount;
    const syllablesPerWord = syllables / words.length;
    const fre = round1(206.835 - 1.015 * wordsPerSentence - 84.6 * syllablesPerWord);
    const fkgl = round1(0.39 * wordsPerSentence + 11.8 * syllablesPerWord - 15.59);

    const output =
      `Flesch Reading Ease: ${fre} (${band(fre)})\n` +
      `Flesch-Kincaid Grade Level: ${fkgl}\n` +
      `Words: ${words.length} · Sentences: ${sentenceCount} · Syllables: ${syllables}`;
    return { output };
  },
  vectors: [
    { input: 'The cat sat.', expect: 'Flesch Reading Ease: 119.2 (Very Easy)\nFlesch-Kincaid Grade Level: -2.6\nWords: 3 · Sentences: 1 · Syllables: 3' },
  ],
});
