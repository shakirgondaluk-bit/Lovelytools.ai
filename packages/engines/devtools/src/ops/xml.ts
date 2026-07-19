// lovelytools.ai — XML formatter: tokenize tags/text/comments/CDATA/PIs,
// re-indent by nesting depth, and flag unmatched tags as a real validation
// error (not just cosmetic reformatting).
import { defineDevOp, DevError, type DevOptions, type DevResult } from '../types';

type Token =
  | { kind: 'open'; name: string; raw: string; selfClose: boolean }
  | { kind: 'close'; name: string }
  | { kind: 'text'; value: string }
  | { kind: 'verbatim'; value: string }; // comments, CDATA, doctype, PIs

function tokenize(xml: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const n = xml.length;
  while (i < n) {
    if (xml[i] !== '<') {
      const next = xml.indexOf('<', i);
      const end = next === -1 ? n : next;
      const text = xml.slice(i, end);
      if (text.trim() !== '') tokens.push({ kind: 'text', value: text.trim() });
      i = end;
      continue;
    }
    if (xml.startsWith('<!--', i)) {
      const end = xml.indexOf('-->', i);
      if (end === -1) throw new DevError('parse-error', 'Unterminated comment (<!-- without -->).');
      tokens.push({ kind: 'verbatim', value: xml.slice(i, end + 3) });
      i = end + 3;
      continue;
    }
    if (xml.startsWith('<![CDATA[', i)) {
      const end = xml.indexOf(']]>', i);
      if (end === -1) throw new DevError('parse-error', 'Unterminated CDATA section.');
      tokens.push({ kind: 'verbatim', value: xml.slice(i, end + 3) });
      i = end + 3;
      continue;
    }
    if (xml.startsWith('<?', i)) {
      const end = xml.indexOf('?>', i);
      if (end === -1) throw new DevError('parse-error', 'Unterminated processing instruction (<? without ?>).');
      tokens.push({ kind: 'verbatim', value: xml.slice(i, end + 2) });
      i = end + 2;
      continue;
    }
    if (xml.startsWith('<!', i)) {
      const end = xml.indexOf('>', i);
      if (end === -1) throw new DevError('parse-error', 'Unterminated declaration (<! without >).');
      tokens.push({ kind: 'verbatim', value: xml.slice(i, end + 1) });
      i = end + 1;
      continue;
    }
    const end = xml.indexOf('>', i);
    if (end === -1) throw new DevError('parse-error', `Unclosed tag starting at position ${i}.`);
    const raw = xml.slice(i, end + 1);
    if (raw.startsWith('</')) {
      const name = raw.slice(2, -1).trim();
      tokens.push({ kind: 'close', name });
    } else {
      const selfClose = raw.endsWith('/>');
      const inner = raw.slice(1, selfClose ? -2 : -1).trim();
      const name = (inner.split(/\s/)[0] ?? '').trim();
      tokens.push({ kind: 'open', name, raw, selfClose });
    }
    i = end + 1;
  }
  return tokens;
}

export const xmlFormatter = defineDevOp({
  slug: 'xml-formatter',
  name: 'XML Formatter',
  description: 'Format and validate XML documents — flags unmatched tags.',
  options: [
    { id: 'indent', label: 'Indent', kind: 'select', default: '2', options: [
      { value: '2', label: '2 spaces' }, { value: '4', label: '4 spaces' }, { value: 'tab', label: 'Tabs' },
    ] },
  ],
  run(input: string, options: DevOptions): DevResult {
    if (input.trim() === '') return { output: '' };
    const tokens = tokenize(input);
    const indentUnit = options.indent === 'tab' ? '\t' : ' '.repeat(Number(options.indent) || 2);

    const stack: string[] = [];
    const lines: string[] = [];
    for (const t of tokens) {
      if (t.kind === 'close') {
        const expected = stack.pop();
        if (expected === undefined) throw new DevError('parse-error', `Unexpected closing tag </${t.name}> with no matching open tag.`);
        if (expected !== t.name) throw new DevError('parse-error', `Mismatched tag: expected </${expected}> but found </${t.name}>.`);
        lines.push(indentUnit.repeat(stack.length) + `</${t.name}>`);
      } else if (t.kind === 'open') {
        lines.push(indentUnit.repeat(stack.length) + t.raw);
        if (!t.selfClose) stack.push(t.name);
      } else {
        lines.push(indentUnit.repeat(stack.length) + t.value);
      }
    }
    if (stack.length > 0) throw new DevError('parse-error', `Unclosed tag(s): ${stack.map((s) => `<${s}>`).join(', ')}.`);

    return { output: lines.join('\n'), fields: [{ label: 'Valid', value: 'Yes', tone: 'positive', mono: false }] };
  },
  vectors: [
    { input: '<a><b>1</b><c/></a>', options: { indent: '2' }, expect: '<a>\n  <b>\n    1\n  </b>\n  <c/>\n</a>' },
    { input: '<?xml version="1.0"?><root>x</root>', options: { indent: '2' }, expect: '<?xml version="1.0"?>\n<root>\n  x\n</root>' },
  ],
});
