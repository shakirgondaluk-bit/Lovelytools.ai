// lovelytools.ai — percent-encoding for URLs, encode + decode.
import { defineDevOp, DevError, type DevOptions, type DevResult } from '../types';

export const urlEncoder = defineDevOp({
  slug: 'url-encoder',
  name: 'URL Encoder',
  description: 'Percent-encode text for safe use in a URL — component or full-URI mode.',
  options: [
    { id: 'mode', label: 'Mode', kind: 'select', default: 'component', options: [
      { value: 'component', label: 'Component (encodes / ? & =)' },
      { value: 'uri', label: 'Full URI (keeps / ? & = intact)' },
    ] },
    { id: 'spacesAsPlus', label: 'Spaces as +', kind: 'toggle', default: false },
  ],
  run(input: string, options: DevOptions): DevResult {
    if (input === '') return { output: '' };
    let out = options.mode === 'uri' ? encodeURI(input) : encodeURIComponent(input);
    if (options.spacesAsPlus) out = out.replace(/%20/g, '+');
    return { output: out, notes: [`${input.length} character(s) encoded.`] };
  },
  vectors: [
    { input: 'a b?c=d', options: { mode: 'component', spacesAsPlus: false }, expect: 'a%20b%3Fc%3Dd' },
    { input: 'a b?c=d', options: { mode: 'component', spacesAsPlus: true }, expect: 'a+b%3Fc%3Dd' },
    { input: 'https://a.com/x y', options: { mode: 'uri', spacesAsPlus: false }, expect: 'https://a.com/x%20y' },
  ],
});

export const urlDecoder = defineDevOp({
  slug: 'url-decoder',
  name: 'URL Decoder',
  description: 'Decode percent-encoded URL strings back into readable text.',
  options: [
    { id: 'plusAsSpace', label: 'Treat + as space', kind: 'toggle', default: true },
  ],
  run(input: string, options: DevOptions): DevResult {
    if (input === '') return { output: '' };
    const pre = options.plusAsSpace ? input.replace(/\+/g, ' ') : input;
    try {
      return { output: decodeURIComponent(pre) };
    } catch {
      throw new DevError('parse-error', 'That contains an incomplete %XX escape sequence.');
    }
  },
  vectors: [
    { input: 'a%20b%3Fc%3Dd', options: { plusAsSpace: true }, expect: 'a b?c=d' },
    { input: 'a+b', options: { plusAsSpace: true }, expect: 'a b' },
    { input: 'a+b', options: { plusAsSpace: false }, expect: 'a+b' },
  ],
});
