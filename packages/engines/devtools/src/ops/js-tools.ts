// lovelytools.ai — JS formatter (js-beautify) and minifier (terser). JS
// syntax is genuinely too gnarly to hand-roll safely (ASI, regex-vs-divide,
// template literals) — these lean on two small, browser-safe, purpose-built
// libraries rather than risk a from-scratch tokenizer silently mangling code.
import beautify from 'js-beautify';
import { minify } from 'terser';
import { defineDevOp, DevError, type DevOptions, type DevResult } from '../types';

export const jsFormatter = defineDevOp({
  slug: 'js-formatter',
  name: 'JavaScript Formatter',
  description: 'Format and beautify JavaScript.',
  options: [
    { id: 'indent', label: 'Indent', kind: 'select', default: '2', options: [
      { value: '2', label: '2 spaces' }, { value: '4', label: '4 spaces' }, { value: 'tab', label: 'Tabs' },
    ] },
  ],
  run(input: string, options: DevOptions): DevResult {
    if (input.trim() === '') return { output: '' };
    const indent_char = options.indent === 'tab' ? '\t' : ' ';
    const indent_size = options.indent === 'tab' ? 1 : Number(options.indent) || 2;
    return { output: beautify(input, { indent_size, indent_char }) };
  },
  vectors: [
    { input: 'function f(a,b){return a+b;}', options: { indent: '2' }, expect: 'function f(a, b) {\n  return a + b;\n}' },
  ],
});

export const minifyJs = defineDevOp({
  slug: 'minify-js',
  name: 'Minify JS',
  description: 'Minify JavaScript to reduce file size.',
  async: true,
  options: [
    { id: 'mangle', label: 'Mangle variable names', kind: 'toggle', default: true },
  ],
  async run(input: string, options: DevOptions): Promise<DevResult> {
    if (input.trim() === '') return { output: '' };
    const result = await minify(input, { mangle: Boolean(options.mangle), compress: true });
    if (!result.code) throw new DevError('parse-error', 'Terser could not parse that as JavaScript.');
    const before = new TextEncoder().encode(input).length;
    const after = new TextEncoder().encode(result.code).length;
    return { output: result.code, notes: [`${before} → ${after} bytes (${Math.round((1 - after / before) * 100)}% smaller).`] };
  },
  vectors: [
    { input: 'function add(a, b) {\n  return a + b;\n}', options: { mangle: false }, expect: 'function add(a,b){return a+b}' },
  ],
});
