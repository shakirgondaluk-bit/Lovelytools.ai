// lovelytools.ai — CSS pretty-printer and minifier. Token-stream based,
// string/comment aware, no full CSS grammar (at-rules, nesting) needed for
// either job.
import { defineDevOp, type DevOptions, type DevResult } from '../types';

/** Split CSS into a flat token stream: comments, strings, and structural chars kept verbatim. */
function tokenize(css: string): string[] {
  const tokens: string[] = [];
  let i = 0;
  const n = css.length;
  let buf = '';
  const flush = () => { if (buf !== '') { tokens.push(buf); buf = ''; } };
  while (i < n) {
    const ch = css[i];
    if (ch === '/' && css[i + 1] === '*') {
      flush();
      const end = css.indexOf('*/', i + 2);
      const stop = end === -1 ? n : end + 2;
      tokens.push(css.slice(i, stop));
      i = stop;
      continue;
    }
    if (ch === '"' || ch === "'") {
      flush();
      let j = i + 1;
      while (j < n && css[j] !== ch) { if (css[j] === '\\') j++; j++; }
      tokens.push(css.slice(i, j + 1));
      i = j + 1;
      continue;
    }
    if (ch === '{' || ch === '}' || ch === ';') {
      flush();
      tokens.push(ch);
      i++;
      continue;
    }
    buf += ch;
    i++;
  }
  flush();
  return tokens;
}

/** Merge runs of non-structural tokens (text/strings/comments) between {, }, ;
 * boundaries into one logical segment — so `content: "a;b" /* n *\/;` stays one
 * declaration instead of splitting on the string or comment inside it. */
function segments(tokens: string[]): string[] {
  const out: string[] = [];
  let run = '';
  for (const tok of tokens) {
    if (tok === '{' || tok === '}' || tok === ';') {
      if (run !== '') { out.push(run); run = ''; }
      out.push(tok);
    } else {
      run += tok;
    }
  }
  if (run !== '') out.push(run);
  return out;
}

/** A segment that, once trimmed, IS a comment start-to-end — a standalone
 * comment between rules, not one embedded in a declaration's value. */
function isStandaloneComment(seg: string): boolean {
  const t = seg.trim();
  return t.startsWith('/*') && t.endsWith('*/') && t.indexOf('*/') === t.length - 2;
}

export const cssFormatter = defineDevOp({
  slug: 'css-formatter',
  name: 'CSS Formatter',
  description: 'Beautify and organize CSS code.',
  options: [
    { id: 'indent', label: 'Indent', kind: 'select', default: '2', options: [
      { value: '2', label: '2 spaces' }, { value: '4', label: '4 spaces' }, { value: 'tab', label: 'Tabs' },
    ] },
  ],
  run(input: string, options: DevOptions): DevResult {
    if (input.trim() === '') return { output: '' };
    const indentUnit = options.indent === 'tab' ? '\t' : ' '.repeat(Number(options.indent) || 2);
    const tokens = segments(tokenize(input));
    let depth = 0;
    const lines: string[] = [];
    for (const tok of tokens) {
      const t = tok.trim();
      if (t === '') continue;
      if (isStandaloneComment(t)) { lines.push(indentUnit.repeat(depth) + t); continue; }
      if (t === '{') {
        const last = lines.pop() ?? '';
        lines.push(`${last.trimEnd()} {`);
        depth++;
        continue;
      }
      if (t === '}') {
        depth = Math.max(0, depth - 1);
        lines.push(indentUnit.repeat(depth) + '}');
        continue;
      }
      if (t === ';') {
        const last = lines.pop() ?? '';
        lines.push(`${last.trimEnd()};`);
        continue;
      }
      const collapsed = t.replace(/\s+/g, ' ');
      const declMatch = /^([a-zA-Z-]+)\s*:\s*(.+)$/.exec(collapsed);
      lines.push(indentUnit.repeat(depth) + (declMatch ? `${declMatch[1]}: ${declMatch[2]}` : collapsed));
    }
    return { output: lines.join('\n') };
  },
  vectors: [
    { input: 'a{color:red;background : blue}', options: { indent: '2' }, expect: 'a {\n  color: red;\n  background: blue\n}' },
  ],
});

export const minifyCss = defineDevOp({
  slug: 'minify-css',
  name: 'Minify CSS',
  description: 'Shrink CSS by removing whitespace and comments.',
  options: [
    { id: 'stripComments', label: 'Strip comments', kind: 'toggle', default: true },
  ],
  run(input: string, options: DevOptions): DevResult {
    if (input.trim() === '') return { output: '' };
    const tokens = segments(tokenize(input));
    let out = '';
    for (const tok of tokens) {
      if (tok === '{' || tok === '}' || tok === ';') { out += tok; continue; }
      if (isStandaloneComment(tok)) {
        if (!options.stripComments) out += tok.trim();
        continue;
      }
      out += tok.replace(/\s+/g, ' ');
    }
    out = out
      .replace(/\s*([{}:;,])\s*/g, '$1')
      .replace(/;}/g, '}')
      .trim();
    const before = new TextEncoder().encode(input).length;
    const after = new TextEncoder().encode(out).length;
    return { output: out, notes: [`${before} → ${after} bytes (${Math.round((1 - after / before) * 100)}% smaller).`] };
  },
  vectors: [
    { input: 'a {\n  color: red;\n  background: blue;\n}\n/* note */\n', options: { stripComments: true }, expect: 'a{color:red;background:blue}' },
  ],
});
