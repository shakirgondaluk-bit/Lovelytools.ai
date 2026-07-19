// lovelytools.ai — hashing via WebCrypto. No JS implementations to get subtly
// wrong; MD5 is intentionally absent (broken since 2004 — the UI offers SHA-256).
import { defineDevOp, type DevField, type DevOptions, type DevResult } from '../types';

const ALGOS = ['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512'] as const;

export const hash = defineDevOp({
  slug: 'hash-generator',
  name: 'Hash Generator',
  description: 'SHA-1/256/384/512 of any text via WebCrypto — hex or base64 output.',
  async: true,
  options: [
    { id: 'encoding', label: 'Output', kind: 'select', default: 'hex', options: [
      { value: 'hex', label: 'Hex' }, { value: 'base64', label: 'Base64' },
    ] },
    { id: 'uppercase', label: 'Uppercase hex', kind: 'toggle', default: false },
  ],
  async run(input: string, options: DevOptions): Promise<DevResult> {
    if (input === '') return { output: '' };
    const bytes = new TextEncoder().encode(input);
    const fields: DevField[] = [];
    for (const algo of ALGOS) {
      const digest = await crypto.subtle.digest(algo, bytes);
      let out =
        options.encoding === 'base64'
          ? btoa(String.fromCharCode(...new Uint8Array(digest)))
          : [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
      if (options.uppercase && options.encoding === 'hex') out = out.toUpperCase();
      fields.push({
        label: algo,
        value: out,
        tone: algo === 'SHA-1' ? 'muted' : 'default',
      });
    }
    return {
      output: fields.map((f) => `${f.label}: ${f.value}`).join('\n'),
      fields,
      notes: [
        `${bytes.length} byte(s) hashed on-device via crypto.subtle.`,
        'SHA-1 is shown for legacy interop only — don\u2019t use it for anything security-sensitive. MD5 is omitted on purpose.',
      ],
    };
  },
  vectors: [
    {
      input: 'abc',
      options: { encoding: 'hex', uppercase: false },
      expect: [
        'SHA-1: a9993e364706816aba3e25717850c26c9cd0d89d',
        'SHA-256: ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
        'SHA-384: cb00753f45a35e8bb5a03d699ac65007272c32ab0eded1631a8b605a43ff5bed8086072ba1e7cc2358baeca134c825a7',
        'SHA-512: ddaf35a193617abacc417349ae20413112e6fa4e89a97ea20a9eeee64b55d39a2192992a274fc1a836ba3c23a3feebbd454d4423643ce80e2a9ac94fa54ca49f',
      ].join('\n'),
    },
  ],
});
