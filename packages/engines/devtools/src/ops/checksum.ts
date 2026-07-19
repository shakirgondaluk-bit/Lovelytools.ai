// lovelytools.ai — sha256-generator (thin wrapper on WebCrypto, same digest
// hash-generator already computes) and md5-generator. MD5 is broken for
// anything security-sensitive — WebCrypto refuses to implement it at all —
// but "give me an MD5 checksum" is still a legitimate, extremely common ask
// (verifying a download, matching a legacy record). This is a from-scratch,
// RFC 1321 reference implementation, checked against the standard test
// vectors below; the UI carries the same "not for passwords" warning
// hash-generator already shows for SHA-1.
import { defineDevOp, type DevOptions, type DevResult } from '../types';

export const sha256Generator = defineDevOp({
  slug: 'sha256-generator',
  name: 'SHA256 Generator',
  description: 'Create a SHA-256 hash from any text, via WebCrypto.',
  async: true,
  options: [
    { id: 'encoding', label: 'Output', kind: 'select', default: 'hex', options: [
      { value: 'hex', label: 'Hex' }, { value: 'base64', label: 'Base64' },
    ] },
  ],
  async run(input: string, options: DevOptions): Promise<DevResult> {
    if (input === '') return { output: '' };
    const bytes = new TextEncoder().encode(input);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    const arr = new Uint8Array(digest);
    const out = options.encoding === 'base64'
      ? btoa(String.fromCharCode(...arr))
      : [...arr].map((b) => b.toString(16).padStart(2, '0')).join('');
    return { output: out, notes: [`${bytes.length} byte(s) hashed on-device via crypto.subtle.`] };
  },
  vectors: [
    { input: '', options: { encoding: 'hex' }, expect: '' },
    { input: 'abc', options: { encoding: 'hex' }, expect: 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad' },
  ],
});

/* ---------------- MD5 (RFC 1321) ---------------- */

function rotl(x: number, c: number): number {
  return (x << c) | (x >>> (32 - c));
}

const S = [
  7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
  5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
  4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
  6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
];
const K = Array.from({ length: 64 }, (_, i) => Math.floor(Math.abs(Math.sin(i + 1)) * 2 ** 32) >>> 0);

function md5(bytes: Uint8Array): Uint8Array {
  const msgLenBits = bytes.length * 8;
  const withPad = (() => {
    const padLen = ((bytes.length % 64) < 56 ? 56 : 120) - (bytes.length % 64);
    const out = new Uint8Array(bytes.length + padLen + 8);
    out.set(bytes);
    out[bytes.length] = 0x80;
    const view = new DataView(out.buffer);
    // Length in bits, little-endian 64-bit (we only ever see lengths that fit in 32 bits).
    view.setUint32(out.length - 8, msgLenBits >>> 0, true);
    view.setUint32(out.length - 4, Math.floor(msgLenBits / 2 ** 32), true);
    return out;
  })();

  let a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;
  const view = new DataView(withPad.buffer);

  for (let chunk = 0; chunk < withPad.length; chunk += 64) {
    const M = new Uint32Array(16);
    for (let j = 0; j < 16; j++) M[j] = view.getUint32(chunk + j * 4, true);

    let A = a0, B = b0, C = c0, D = d0;
    for (let i = 0; i < 64; i++) {
      let F: number, g: number;
      if (i < 16) { F = (B & C) | (~B & D); g = i; }
      else if (i < 32) { F = (D & B) | (~D & C); g = (5 * i + 1) % 16; }
      else if (i < 48) { F = B ^ C ^ D; g = (3 * i + 5) % 16; }
      else { F = C ^ (B | ~D); g = (7 * i) % 16; }
      F = (F + A + (K[i] ?? 0) + (M[g] ?? 0)) >>> 0;
      A = D; D = C; C = B;
      B = (B + rotl(F, S[i] ?? 0)) >>> 0;
    }
    a0 = (a0 + A) >>> 0; b0 = (b0 + B) >>> 0; c0 = (c0 + C) >>> 0; d0 = (d0 + D) >>> 0;
  }

  const result = new Uint8Array(16);
  const rv = new DataView(result.buffer);
  rv.setUint32(0, a0, true); rv.setUint32(4, b0, true); rv.setUint32(8, c0, true); rv.setUint32(12, d0, true);
  return result;
}

export const md5Generator = defineDevOp({
  slug: 'md5-generator',
  name: 'MD5 Generator',
  description: 'Create an MD5 checksum from any text — legacy interop only, not for anything security-sensitive.',
  options: [
    { id: 'uppercase', label: 'Uppercase hex', kind: 'toggle', default: false },
  ],
  run(input: string, options: DevOptions): DevResult {
    if (input === '') return { output: '' };
    const bytes = new TextEncoder().encode(input);
    const digest = md5(bytes);
    let out = [...digest].map((b) => b.toString(16).padStart(2, '0')).join('');
    if (options.uppercase) out = out.toUpperCase();
    return {
      output: out,
      notes: [
        'MD5 has been broken since 2004 — fine for legacy checksums and de-duplication, never for passwords or signatures. Use SHA-256 for anything security-sensitive.',
      ],
    };
  },
  vectors: [
    { input: 'abc', options: { uppercase: false }, expect: '900150983cd24fb0d6963f7d28e17f72' },
    { input: 'The quick brown fox jumps over the lazy dog', options: { uppercase: false }, expect: '9e107d9d372bb6826bd81d3542a419d6' },
    { input: 'abc', options: { uppercase: true }, expect: '900150983CD24FB0D6963F7D28E17F72' },
  ],
});
