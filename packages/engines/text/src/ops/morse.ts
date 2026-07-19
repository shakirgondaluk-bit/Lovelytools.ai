// lovelytools.ai — Morse both directions. Letters separated by spaces, words
// by " / " — the convention every reference chart uses.
import { defineTextOp, TextError, type TextOptions, type TextResult } from '../types';

const TO_MORSE: Record<string, string> = {
  A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.', H: '....',
  I: '..', J: '.---', K: '-.-', L: '.-..', M: '--', N: '-.', O: '---', P: '.--.',
  Q: '--.-', R: '.-.', S: '...', T: '-', U: '..-', V: '...-', W: '.--', X: '-..-',
  Y: '-.--', Z: '--..',
  '0': '-----', '1': '.----', '2': '..---', '3': '...--', '4': '....-',
  '5': '.....', '6': '-....', '7': '--...', '8': '---..', '9': '----.',
  '.': '.-.-.-', ',': '--..--', '?': '..--..', "'": '.----.', '!': '-.-.--',
  '/': '-..-.', '(': '-.--.', ')': '-.--.-', '&': '.-...', ':': '---...',
  ';': '-.-.-.', '=': '-...-', '+': '.-.-.', '-': '-....-', '_': '..--.-',
  '"': '.-..-.', '$': '...-..-', '@': '.--.-.',
};
const FROM_MORSE: Record<string, string> = Object.fromEntries(
  Object.entries(TO_MORSE).map(([ch, code]) => [code, ch]),
);

export const morse = defineTextOp({
  slug: 'morse-code-translator',
  name: 'Morse Code Translator',
  description: 'Text to Morse and back — letters spaced, words joined with " / ".',
  inputs: 1,
  options: [
    { id: 'direction', label: 'Direction', kind: 'select', default: 'encode', options: [
      { value: 'encode', label: 'Text → Morse' }, { value: 'decode', label: 'Morse → Text' },
    ] },
  ],
  run(input: string, options: TextOptions): TextResult {
    const notes: string[] = [];

    if (options.direction === 'decode') {
      if (input.trim() !== '' && /[^.\-\s/|]/.test(input)) {
        throw new TextError('invalid-input', 'Morse is dots, dashes, spaces and "/" between words — switch direction to encode text.');
      }
      let unknown = 0;
      const output = input
        .trim()
        .split(/\s*[/|]\s*|\s{3,}/) // words: "/", "|", or 3+ spaces
        .map((word) =>
          word
            .split(/\s+/)
            .filter(Boolean)
            .map((code) => {
              const ch = FROM_MORSE[code];
              if (ch === undefined) { unknown++; return '□'; }
              return ch;
            })
            .join(''),
        )
        .join(' ');
      if (unknown) notes.push(`${unknown} unrecognized code(s) shown as □.`);
      return { output, notes };
    }

    let dropped = 0;
    const output = input
      .trim()
      .toUpperCase()
      .split(/\s+/)
      .filter(Boolean)
      .map((word) =>
        Array.from(word)
          .map((ch) => {
            const code = TO_MORSE[ch];
            if (code === undefined) { dropped++; return null; }
            return code;
          })
          .filter(Boolean)
          .join(' '),
      )
      .filter(Boolean)
      .join(' / ');
    if (dropped) notes.push(`${dropped} character(s) have no Morse code and were dropped.`);
    return { output, notes };
  },
  vectors: [
    { input: 'SOS', expect: '... --- ...' },
    { input: 'HELLO WORLD', expect: '.... . .-.. .-.. --- / .-- --- .-. .-.. -..' },
    { input: '... --- ...', options: { direction: 'decode' }, expect: 'SOS' },
    { input: '.... .. / - .... . .-. .', options: { direction: 'decode' }, expect: 'HI THERE' },
  ],
});
