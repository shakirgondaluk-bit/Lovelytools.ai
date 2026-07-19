// lovelytools.ai — number base converter, bases 2–36, BigInt-backed, with a
// two's-complement view for negatives.
import { defineDevOp, DevError, type DevField, type DevOptions, type DevResult } from '../types';

const COMMON = [2, 8, 10, 16] as const;

export const baseN = defineDevOp({
  slug: 'binary-to-decimal',
  name: 'Binary to Decimal',
  description: 'Binary, octal, decimal, hex, and any base 2–36 — BigInt precision, two’s-complement for negatives.',
  options: [
    { id: 'fromBase', label: 'Input base', kind: 'select', default: '2', options: [
      { value: '2', label: 'Binary (2)' }, { value: '8', label: 'Octal (8)' },
      { value: '10', label: 'Decimal (10)' }, { value: '16', label: 'Hex (16)' },
      { value: 'auto', label: 'Auto (0x/0b/0o prefix)' },
    ] },
    { id: 'width', label: 'Two’s-complement width', kind: 'select', default: '32', options: [
      { value: '8', label: '8-bit' }, { value: '16', label: '16-bit' }, { value: '32', label: '32-bit' }, { value: '64', label: '64-bit' },
    ] },
  ],
  run(input: string, options: DevOptions): DevResult {
    const raw = input.trim().replace(/[_\s]/g, ''); // allow 1_000_000 and spaced nibbles
    if (raw === '') return { output: '' };
    const value = parseBig(raw, String(options.fromBase));

    const fields: DevField[] = [];
    for (const base of COMMON) {
      fields.push({
        label: base === 2 ? 'Binary' : base === 8 ? 'Octal' : base === 10 ? 'Decimal' : 'Hex',
        value: prefix(base) + (base === 16 ? value.toString(16).toUpperCase() : value.toString(base)),
      });
    }

    const notes: string[] = [];
    if (value < 0n) {
      const width = BigInt(Number(options.width) || 32);
      const mod = 1n << width;
      const twos = ((value % mod) + mod) % mod;
      fields.push({ label: `Two's complement (${width}-bit hex)`, value: '0x' + twos.toString(16).toUpperCase().padStart(Number(width) / 4, '0') });
      notes.push(`Negative values shown as ${width}-bit two's complement.`);
    }
    return { output: value.toString(10), fields, notes };
  },
  vectors: [
    { input: '1010', options: { fromBase: '2', width: '32' }, expect: '10' },
    { input: 'ff', options: { fromBase: '16', width: '32' }, expect: '255' },
    { input: '-5', options: { fromBase: '10', width: '32' }, expect: '-5' },
  ],
});

function prefix(base: number): string {
  return base === 2 ? '0b' : base === 8 ? '0o' : base === 16 ? '0x' : '';
}

function parseBig(raw: string, fromBase: string): bigint {
  let neg = false;
  let s = raw;
  if (s.startsWith('-')) { neg = true; s = s.slice(1); }

  let base: number;
  if (fromBase === 'auto') {
    if (/^0x/i.test(s)) { base = 16; s = s.slice(2); }
    else if (/^0b/i.test(s)) { base = 2; s = s.slice(2); }
    else if (/^0o/i.test(s)) { base = 8; s = s.slice(2); }
    else base = 10;
  } else {
    base = Number(fromBase);
    s = s.replace(/^0[xbo]/i, '');
  }

  const digits = '0123456789abcdefghijklmnopqrstuvwxyz'.slice(0, base);
  let value = 0n;
  const B = BigInt(base);
  for (const ch of s.toLowerCase()) {
    const d = digits.indexOf(ch);
    if (d === -1) throw new DevError('parse-error', `"${ch}" isn't a valid base-${base} digit.`);
    value = value * B + BigInt(d);
  }
  return neg ? -value : value;
}
