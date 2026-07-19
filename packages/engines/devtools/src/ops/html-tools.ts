// lovelytools.ai — HTML pretty-printer and minifier. Tag-stream based (not a
// full DOM/void-element-aware parser) — good enough to make messy markup
// readable or small, not a validator.
import { defineDevOp, type DevOptions, type DevResult } from '../types';

const VOID_ELEMENTS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr',
]);
const INLINE_ELEMENTS = new Set([
  'a', 'abbr', 'b', 'bdi', 'bdo', 'br', 'cite', 'code', 'data', 'em', 'i', 'kbd', 'mark', 'q', 's', 'samp',
  'small', 'span', 'strong', 'sub', 'sup', 'time', 'u', 'var',
]);

type Piece = { type: 'tag' | 'text' | 'comment'; value: string; name?: string; close?: boolean; selfClose?: boolean };

function tokenize(html: string): Piece[] {
  const pieces: Piece[] = [];
  let i = 0;
  const n = html.length;
  while (i < n) {
    if (html[i] !== '<') {
      const next = html.indexOf('<', i);
      const end = next === -1 ? n : next;
      pieces.push({ type: 'text', value: html.slice(i, end) });
      i = end;
      continue;
    }
    if (html.startsWith('<!--', i)) {
      const end = html.indexOf('-->', i);
      const stop = end === -1 ? n : end + 3;
      pieces.push({ type: 'comment', value: html.slice(i, stop) });
      i = stop;
      continue;
    }
    if (html.startsWith('<!', i) || html.startsWith('<?', i)) {
      const end = html.indexOf('>', i);
      const stop = end === -1 ? n : end + 1;
      pieces.push({ type: 'comment', value: html.slice(i, stop) });
      i = stop;
      continue;
    }
    // script/style: swallow raw content verbatim, don't reformat JS/CSS as tags
    const rawTagMatch = /^<(script|style|pre|textarea)\b[^>]*>/i.exec(html.slice(i));
    if (rawTagMatch) {
      const tagName = (rawTagMatch[1] ?? '').toLowerCase();
      const openEnd = i + rawTagMatch[0].length;
      const closeTag = `</${tagName}>`;
      const closeIdx = html.toLowerCase().indexOf(closeTag, openEnd);
      const stop = closeIdx === -1 ? n : closeIdx + closeTag.length;
      pieces.push({ type: 'tag', value: html.slice(i, stop), name: tagName, close: false, selfClose: false });
      i = stop;
      continue;
    }
    const end = html.indexOf('>', i);
    if (end === -1) { pieces.push({ type: 'text', value: html.slice(i) }); break; }
    const raw = html.slice(i, end + 1);
    const close = raw.startsWith('</');
    const selfClose = raw.endsWith('/>');
    const nameMatch = /^<\/?([a-zA-Z0-9-]+)/.exec(raw);
    const name = (nameMatch?.[1] ?? '').toLowerCase();
    pieces.push({ type: 'tag', value: raw, name, close, selfClose: selfClose || VOID_ELEMENTS.has(name) });
    i = end + 1;
  }
  return pieces;
}

export const htmlFormatter = defineDevOp({
  slug: 'html-formatter',
  name: 'HTML Formatter',
  description: 'Format and beautify messy HTML.',
  options: [
    { id: 'indent', label: 'Indent', kind: 'select', default: '2', options: [
      { value: '2', label: '2 spaces' }, { value: '4', label: '4 spaces' }, { value: 'tab', label: 'Tabs' },
    ] },
  ],
  run(input: string, options: DevOptions): DevResult {
    if (input.trim() === '') return { output: '' };
    const indentUnit = options.indent === 'tab' ? '\t' : ' '.repeat(Number(options.indent) || 2);
    const pieces = tokenize(input);
    let depth = 0;
    const lines: string[] = [];
    for (const p of pieces) {
      if (p.type === 'text') {
        const text = p.value.trim();
        if (text !== '') lines.push(indentUnit.repeat(depth) + text.replace(/\s+/g, ' '));
        continue;
      }
      if (p.type === 'comment') {
        lines.push(indentUnit.repeat(depth) + p.value.trim());
        continue;
      }
      if (p.close) {
        depth = Math.max(0, depth - 1);
        lines.push(indentUnit.repeat(depth) + p.value);
      } else {
        lines.push(indentUnit.repeat(depth) + p.value);
        if (!p.selfClose) depth++;
      }
    }
    return { output: lines.join('\n') };
  },
  vectors: [
    { input: '<div><p>Hi</p><br><img src="x.png"></div>', options: { indent: '2' }, expect: '<div>\n  <p>\n    Hi\n  </p>\n  <br>\n  <img src="x.png">\n</div>' },
  ],
});

export const minifyHtml = defineDevOp({
  slug: 'minify-html',
  name: 'Minify HTML',
  description: 'Compress HTML by stripping comments and collapsing whitespace between tags.',
  options: [
    { id: 'stripComments', label: 'Strip comments', kind: 'toggle', default: true },
  ],
  run(input: string, options: DevOptions): DevResult {
    if (input.trim() === '') return { output: '' };
    const pieces = tokenize(input);
    let out = '';
    for (const p of pieces) {
      if (p.type === 'comment') {
        const isConditional = /^<!--\[if/.test(p.value);
        if (!options.stripComments || isConditional) out += p.value;
        continue;
      }
      if (p.type === 'text') {
        out += p.value.replace(/\s+/g, ' ');
        continue;
      }
      out += p.value;
    }
    // Collapse whitespace left between a closing '>' and the next '<' that
    // tokenize() couldn't see (it only trims per-text-node, not across tags).
    out = out.replace(/>\s+</g, '><').trim();
    const before = new TextEncoder().encode(input).length;
    const after = new TextEncoder().encode(out).length;
    return {
      output: out,
      notes: [`${before} → ${after} bytes (${Math.round((1 - after / before) * 100)}% smaller).`],
    };
  },
  vectors: [
    { input: '<div>\n  <!-- note -->\n  <p>Hi   there</p>\n</div>', options: { stripComments: true }, expect: '<div><p>Hi there</p></div>' },
  ],
});
