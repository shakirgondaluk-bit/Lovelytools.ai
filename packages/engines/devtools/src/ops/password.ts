// lovelytools.ai — password generator. Always crypto.getRandomValues with
// rejection sampling (never Math.random, never a seeded PRNG — a
// "reproducible" password generator is a vulnerability, not a feature).
import { defineDevOp, DevError, type DevOptions, type DevResult } from '../types';

const SETS = {
  uppercase: 'ABCDEFGHJKLMNPQRSTUVWXYZ',
  uppercaseAmbiguous: 'IO',
  lowercase: 'abcdefghijkmnpqrstuvwxyz',
  lowercaseAmbiguous: 'lo',
  numbers: '23456789',
  numbersAmbiguous: '01',
  symbols: '!@#$%^&*()-_=+[]{}',
};

/** Uniform pick in [0, max) via rejection sampling — no modulo bias. */
function randomIndex(max: number): number {
  const range = 256 - (256 % max);
  const buf = new Uint8Array(1);
  let x: number;
  do {
    crypto.getRandomValues(buf);
    x = buf[0] ?? 0;
  } while (x >= range);
  return x % max;
}

export const passwordGenerator = defineDevOp({
  slug: 'password-generator',
  name: 'Password Generator',
  description: 'Generate strong, random passwords locally — crypto.getRandomValues, never Math.random.',
  generator: true,
  nondeterministic: true,
  options: [
    { id: 'length', label: 'Length', kind: 'number', default: 16, min: 4, max: 128 },
    { id: 'uppercase', label: 'Uppercase (A-Z)', kind: 'toggle', default: true },
    { id: 'lowercase', label: 'Lowercase (a-z)', kind: 'toggle', default: true },
    { id: 'numbers', label: 'Numbers (0-9)', kind: 'toggle', default: true },
    { id: 'symbols', label: 'Symbols (!@#…)', kind: 'toggle', default: true },
    { id: 'excludeAmbiguous', label: 'Exclude ambiguous (I l 1 O 0)', kind: 'toggle', default: false },
    { id: 'seed', label: 'Regenerate trigger', kind: 'number', default: 0 },
  ],
  run(_input: string, options: DevOptions): DevResult {
    let pool = '';
    if (options.uppercase) pool += SETS.uppercase + (options.excludeAmbiguous ? '' : SETS.uppercaseAmbiguous);
    if (options.lowercase) pool += SETS.lowercase + (options.excludeAmbiguous ? '' : SETS.lowercaseAmbiguous);
    if (options.numbers) pool += SETS.numbers + (options.excludeAmbiguous ? '' : SETS.numbersAmbiguous);
    if (options.symbols) pool += SETS.symbols;
    if (pool === '') throw new DevError('invalid-input', 'Pick at least one character set.');

    const length = Math.max(4, Math.min(128, Number(options.length) || 16));
    let out = '';
    for (let i = 0; i < length; i++) out += pool[randomIndex(pool.length)];

    const bitsPerChar = Math.log2(pool.length);
    const entropyBits = Math.round(bitsPerChar * length);
    const strength = entropyBits >= 80 ? 'Strong' : entropyBits >= 60 ? 'Good' : entropyBits >= 40 ? 'Fair' : 'Weak';

    return {
      output: out,
      fields: [
        { label: 'Entropy', value: `~${entropyBits} bits`, mono: false },
        { label: 'Strength', value: strength, tone: entropyBits >= 60 ? 'positive' : entropyBits >= 40 ? 'default' : 'negative', mono: false },
      ],
      notes: ['Generated with crypto.getRandomValues on-device — never sent anywhere, never logged.'],
    };
  },
});
