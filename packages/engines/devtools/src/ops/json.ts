// lovelytools.ai — JSON format / minify / validate with real line+column errors.
import { defineDevOp, DevError, type DevOptions, type DevResult } from '../types';

/** Turn V8/JSC's "at position N" into line/column against the source. */
export function positionOf(input: string, err: Error): { line: number; column: number } | undefined {
  const [, at] = /position (\d+)/.exec(err.message) ?? [];
  if (at === undefined) return undefined;
  const pos = Math.min(+at, input.length);
  let line = 1;
  let lastNl = -1;
  for (let i = 0; i < pos; i++) {
    if (input[i] === '\n') { line++; lastNl = i; }
  }
  return { line, column: pos - lastNl };
}

function sortDeep(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(sortDeep);
  if (v !== null && typeof v === 'object') {
    return Object.fromEntries(
      Object.entries(v as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, val]) => [k, sortDeep(val)]),
    );
  }
  return v;
}

export const json = defineDevOp({
  slug: 'json-formatter',
  name: 'JSON Formatter',
  description: 'Format, minify, validate, and sort keys — errors point at the exact line and column.',
  options: [
    { id: 'mode', label: 'Mode', kind: 'select', default: 'format', options: [
      { value: 'format', label: 'Format' }, { value: 'minify', label: 'Minify' }, { value: 'validate', label: 'Validate only' },
    ] },
    { id: 'indent', label: 'Indent', kind: 'select', default: '2', options: [
      { value: '2', label: '2 spaces' }, { value: '4', label: '4 spaces' }, { value: 'tab', label: 'Tabs' },
    ] },
    { id: 'sortKeys', label: 'Sort keys A–Z', kind: 'toggle', default: false },
  ],
  run(input: string, options: DevOptions): DevResult {
    if (input.trim() === '') return { output: '' };
    let value: unknown;
    try {
      value = JSON.parse(input);
    } catch (e) {
      const pos = positionOf(input, e as Error);
      const detail = (e as Error).message.replace(/^JSON\.parse: /, '').replace(/ in JSON at position \d+.*$/s, '');
      throw new DevError(
        'parse-error',
        pos ? `${detail} at line ${pos.line}, column ${pos.column}.` : `${detail}.`,
        pos,
      );
    }
    if (options.sortKeys) value = sortDeep(value);

    const stats = {
      keys: countKeys(value),
      depth: depthOf(value),
      bytes: new TextEncoder().encode(input).length,
    };
    const fields = [
      { label: 'Valid', value: 'Yes', tone: 'positive' as const, mono: false },
      { label: 'Keys', value: String(stats.keys), mono: false },
      { label: 'Max depth', value: String(stats.depth), mono: false },
      { label: 'Size', value: fmtBytes(stats.bytes), mono: false },
    ];

    if (options.mode === 'validate') return { output: input, fields };
    if (options.mode === 'minify') return { output: JSON.stringify(value), fields };
    const indent = options.indent === 'tab' ? '\t' : Number(options.indent) || 2;
    return { output: JSON.stringify(value, null, indent), fields };
  },
  vectors: [
    { input: '{"b":1,"a":2}', options: { mode: 'format', indent: '2', sortKeys: false }, expect: '{\n  "b": 1,\n  "a": 2\n}' },
    { input: '{"a":1,"b":2}', options: { mode: 'minify', indent: '2', sortKeys: false }, expect: '{"a":1,"b":2}' },
    { input: '{"b":1,"a":2}', options: { mode: 'format', indent: '2', sortKeys: true }, expect: '{\n  "a": 2,\n  "b": 1\n}' },
  ],
});

function countKeys(v: unknown): number {
  if (Array.isArray(v)) return v.reduce((n: number, x) => n + countKeys(x), 0);
  if (v !== null && typeof v === 'object') {
    const entries = Object.entries(v as Record<string, unknown>);
    return entries.length + entries.reduce((n, [, val]) => n + countKeys(val), 0);
  }
  return 0;
}

function depthOf(v: unknown): number {
  if (Array.isArray(v)) return v.length === 0 ? 1 : 1 + Math.max(...v.map(depthOf));
  if (v !== null && typeof v === 'object') {
    const vals = Object.values(v as Record<string, unknown>);
    return vals.length === 0 ? 1 : 1 + Math.max(...vals.map(depthOf));
  }
  return 0;
}

function fmtBytes(n: number): string {
  if (n >= 1048576) return `${(n / 1048576).toFixed(1)} MB`;
  if (n >= 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${n} B`;
}
