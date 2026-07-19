// lovelytools.ai — HTML escaping: a one-way "make it safe to display" tool
// (escape-html) and a fuller encode/decode tool with named + numeric entities
// (html-encoder).
import { defineDevOp, type DevOptions, type DevResult } from '../types';

const XML_UNSAFE: Record<string, string> = {
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
};

export const escapeHtml = defineDevOp({
  slug: 'escape-html',
  name: 'Escape HTML',
  description: 'Escape HTML special characters (& < > " \') so text is safe to display verbatim.',
  options: [
    { id: 'direction', label: 'Direction', kind: 'select', default: 'escape', options: [
      { value: 'escape', label: 'Escape' }, { value: 'unescape', label: 'Unescape' },
    ] },
  ],
  run(input: string, options: DevOptions): DevResult {
    if (input === '') return { output: '' };
    if (options.direction === 'unescape') {
      return { output: input.replace(/&(amp|lt|gt|quot|#39|apos);/g, (m) => unescapeOne(m)) };
    }
    return { output: input.replace(/[&<>"']/g, (c) => XML_UNSAFE[c] ?? c) };
  },
  vectors: [
    { input: `<a href="x">T&M's</a>`, options: { direction: 'escape' }, expect: '&lt;a href=&quot;x&quot;&gt;T&amp;M&#39;s&lt;/a&gt;' },
    { input: '&lt;b&gt;', options: { direction: 'unescape' }, expect: '<b>' },
  ],
});

function unescapeOne(entity: string): string {
  switch (entity) {
    case '&amp;': return '&';
    case '&lt;': return '<';
    case '&gt;': return '>';
    case '&quot;': return '"';
    case '&#39;':
    case '&apos;': return "'";
    default: return entity;
  }
}

/** Common named entities beyond the 5 XML-unsafe ones — enough for real prose. */
const NAMED_ENTITIES: Record<string, string> = {
  nbsp: ' ', copy: '©', reg: '®', trade: '™', hellip: '…',
  mdash: '—', ndash: '–', lsquo: '‘', rsquo: '’', ldquo: '“',
  rdquo: '”', euro: '€', pound: '£', yen: '¥', cent: '¢',
  deg: '°', plusmn: '±', times: '×', divide: '÷', middot: '·',
};
const NAMED_ENTITIES_REV: Record<string, string> = Object.fromEntries(
  Object.entries(NAMED_ENTITIES).map(([name, ch]) => [ch, `&${name};`]),
);

export const htmlEncoder = defineDevOp({
  slug: 'html-encoder',
  name: 'HTML Encoder',
  description: 'Encode text to HTML entities (named + numeric) or decode entities back to text.',
  options: [
    { id: 'mode', label: 'Mode', kind: 'select', default: 'encode', options: [
      { value: 'encode', label: 'Encode' }, { value: 'decode', label: 'Decode' },
    ] },
    { id: 'nonAscii', label: 'Also encode non-ASCII', kind: 'toggle', default: false },
  ],
  run(input: string, options: DevOptions): DevResult {
    if (input === '') return { output: '' };
    if (options.mode === 'decode') return { output: decodeEntities(input) };

    let out = '';
    for (const ch of input) {
      if (XML_UNSAFE[ch]) { out += XML_UNSAFE[ch]; continue; }
      if (NAMED_ENTITIES_REV[ch]) { out += NAMED_ENTITIES_REV[ch]; continue; }
      const code = ch.codePointAt(0) ?? 0;
      if (options.nonAscii && code > 127) { out += `&#${code};`; continue; }
      out += ch;
    }
    return { output: out };
  },
  vectors: [
    { input: 'Café & Co', options: { mode: 'encode', nonAscii: false }, expect: 'Café &amp; Co' },
    { input: 'Café & Co', options: { mode: 'encode', nonAscii: true }, expect: 'Caf&#233; &amp; Co' },
    { input: '&amp;copy;&nbsp;&#65;', options: { mode: 'decode' }, expect: '&copy; A' },
  ],
});

function decodeEntities(s: string): string {
  return s.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (m, body: string) => {
    if (body[0] === '#') {
      const code = body[1] === 'x' || body[1] === 'X' ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : m;
    }
    if (body === 'amp') return '&';
    if (body === 'lt') return '<';
    if (body === 'gt') return '>';
    if (body === 'quot') return '"';
    if (body === 'apos') return "'";
    return NAMED_ENTITIES[body] ?? m;
  });
}
