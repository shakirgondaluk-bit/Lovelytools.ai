// lovelytools.ai — Myers O(ND) line diff. Self-contained (each engine is
// independent) — same algorithm as the text engine's text-diff, adapted to
// DevResult/DevDiffOp so it renders through the shared devtools UI.
import { defineDevOp, type DevDiffOp, type DevOptions, type DevResult } from '../types';

function myers(a: string[], b: string[], eq: (x: string, y: string) => boolean): Array<{ type: DevDiffOp['type']; items: string[] }> {
  const n = a.length;
  const m = b.length;
  const max = n + m;
  const v: Record<number, number> = { 1: 0 };
  const trace: Array<Record<number, number>> = [];

  for (let d = 0; d <= max; d++) {
    trace.push({ ...v });
    for (let k = -d; k <= d; k += 2) {
      let x: number;
      if (k === -d || (k !== d && (v[k - 1] ?? -1) < (v[k + 1] ?? -1))) x = v[k + 1] ?? 0;
      else x = (v[k - 1] ?? 0) + 1;
      let y = x - k;
      while (x < n && y < m) {
        const ax = a[x];
        const by = b[y];
        if (ax === undefined || by === undefined || !eq(ax, by)) break;
        x++;
        y++;
      }
      v[k] = x;
      if (x >= n && y >= m) return backtrack(a, b, trace, d);
    }
  }
  return [];
}

function backtrack(a: string[], b: string[], trace: Array<Record<number, number>>, d: number) {
  const ops: Array<{ type: DevDiffOp['type']; items: string[] }> = [];
  let x = a.length;
  let y = b.length;
  for (let step = d; step > 0; step--) {
    const v = trace[step];
    if (!v) break;
    const k = x - y;
    const prevK = k === -step || (k !== step && (v[k - 1] ?? -1) < (v[k + 1] ?? -1)) ? k + 1 : k - 1;
    const prevX = v[prevK] ?? 0;
    const prevY = prevX - prevK;
    while (x > prevX && y > prevY) { push(ops, 'equal', a[--x] ?? ''); y--; }
    if (x === prevX) push(ops, 'insert', b[--y] ?? '');
    else push(ops, 'delete', a[--x] ?? '');
  }
  while (x > 0 && y > 0) { push(ops, 'equal', a[--x] ?? ''); y--; }
  while (y > 0) push(ops, 'insert', b[--y] ?? '');
  while (x > 0) push(ops, 'delete', a[--x] ?? '');
  return ops.reverse();
}

function push(ops: Array<{ type: DevDiffOp['type']; items: string[] }>, type: DevDiffOp['type'], item: string) {
  const last = ops[ops.length - 1];
  if (last && last.type === type) last.items.push(item);
  else ops.push({ type, items: [item] });
}

export const diffChecker = defineDevOp({
  slug: 'diff-checker',
  name: 'Diff Checker',
  description: 'Compare two files or texts and see the differences, line by line.',
  inputs: 2,
  options: [
    { id: 'ignoreWhitespace', label: 'Ignore whitespace', kind: 'toggle', default: false },
    { id: 'ignoreCase', label: 'Ignore case', kind: 'toggle', default: false },
  ],
  run(input: string, options: DevOptions, secondary = ''): DevResult {
    const norm = (s: string) => {
      let t = s;
      if (options.ignoreCase) t = t.toLowerCase();
      if (options.ignoreWhitespace) t = t.replace(/\s+/g, ' ').trim();
      return t;
    };
    const a = input.split(/\r\n|\r|\n/);
    const b = secondary.split(/\r\n|\r|\n/);
    const raw = myers(a, b, (x, y) => norm(x) === norm(y));
    const diff: DevDiffOp[] = raw.map((op) => ({ type: op.type, value: op.items.join('\n') }));

    const added = raw.filter((o) => o.type === 'insert').reduce((n, o) => n + o.items.length, 0);
    const removed = raw.filter((o) => o.type === 'delete').reduce((n, o) => n + o.items.length, 0);
    return { output: '', diff, notes: [`${added} line(s) added, ${removed} removed.`] };
  },
  vectors: [
    { input: 'a\nb\nc', secondary: 'a\nx\nc', options: { ignoreWhitespace: false, ignoreCase: false }, expect: '' },
  ],
});
