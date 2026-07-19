// lovelytools.ai — Base64 text encode/decode via UTF-8 safe atob/btoa wrappers.
import { defineDevOp, DevError, type DevOptions, type DevResult } from '../types';

function toBase64(s: string, urlSafe: boolean): string {
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  let out = btoa(bin);
  if (urlSafe) out = out.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return out;
}

function fromBase64(s: string): string {
  let b64 = s.trim().replace(/-/g, '+').replace(/_/g, '/');
  b64 = b64.padEnd(Math.ceil(b64.length / 4) * 4, '=');
  let bin: string;
  try {
    bin = atob(b64);
  } catch {
    throw new DevError('parse-error', 'That isn’t valid base64 — check for stray characters or missing padding.');
  }
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
}

export const base64Encode = defineDevOp({
  slug: 'base64-encode',
  name: 'Base64 Encode',
  description: 'Encode text to Base64 — standard or URL-safe alphabet.',
  options: [
    { id: 'urlSafe', label: 'URL-safe (-_ , no padding)', kind: 'toggle', default: false },
  ],
  run(input: string, options: DevOptions): DevResult {
    if (input === '') return { output: '' };
    return { output: toBase64(input, Boolean(options.urlSafe)) };
  },
  vectors: [
    { input: 'hello', options: { urlSafe: false }, expect: 'aGVsbG8=' },
    { input: 'hello', options: { urlSafe: true }, expect: 'aGVsbG8' },
    { input: '', options: {}, expect: '' },
  ],
});

export const base64Decode = defineDevOp({
  slug: 'base64-decode',
  name: 'Base64 Decode',
  description: 'Decode Base64 back into readable text — accepts standard or URL-safe input.',
  options: [],
  run(input: string, _options: DevOptions): DevResult {
    if (input.trim() === '') return { output: '' };
    return { output: fromBase64(input) };
  },
  vectors: [
    { input: 'aGVsbG8=', expect: 'hello' },
    { input: 'aGVsbG8', expect: 'hello' },
  ],
});
