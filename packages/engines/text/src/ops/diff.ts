// lovelytools.ai — Myers O(ND) diff, line-level with word-level refinement on
// changed blocks. Returns change ops the UI paints as add/remove/equal runs.
import { defineTextOp, TextError, type DiffOp, type TextOptions, type TextResult } from '../types';

/** Myers diff over an array of tokens → equal/insert/delete ops. */
function myers<T>(a: T[], b: T[], eq: (x: T, y: T) => boolean): Array<{ type: DiffOp['type']; items: T[] }> {
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
      // x < n and y < m already prove both reads are in bounds; the locals are what
      // let the compiler see eq's arguments as T rather than T | undefined.
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

function backtrack<T>(a: T[], b: T[], trace: Array<Record<number, number>>, d: number) {
  const ops: Array<{ type: DiffOp['type']; items: T[] }> = [];
  let x = a.length;
  let y = b.length;
  for (let step = d; step > 0; step--) {
    // myers pushed a trace entry for every d it walked, and step counts back down
    // from that same d — so this is an invariant, not a case to recover from.
    const v = trace[step];
    if (!v) throw new TextError('internal', `Diff trace is missing step ${step}.`);
    const k = x - y;
    const prevK = k === -step || (k !== step && (v[k - 1] ?? -1) < (v[k + 1] ?? -1)) ? k + 1 : k - 1;
    const prevX = v[prevK] ?? 0;
    const prevY = prevX - prevK;
    while (x > prevX && y > prevY) { push(ops, 'equal', a[--x]); y--; }
    if (step > 0) {
      if (x === prevX) push(ops, 'insert', b[--y]);
      else push(ops, 'delete', a[--x]);
    }
  }
  while (x > 0 && y > 0) { push(ops, 'equal', a[--x]); y--; }
  while (y > 0) push(ops, 'insert', b[--y]);
  while (x > 0) push(ops, 'delete', a[--x]);
  return ops.reverse();
}

function push<T>(ops: Array<{ type: DiffOp['type']; items: T[] }>, type: DiffOp['type'], item: T) {
  const last = ops[ops.length - 1];
  if (last && last.type === type) last.items.push(item);
  else ops.push({ type, items: [item] });
}

export const diff = defineTextOp({
  slug: 'text-diff',
  name: 'Text Diff Checker',
  description: 'Line and word-level differences between two texts, Myers algorithm.',
  inputs: 2,
  heavy: true,
  options: [
    { id: 'granularity', label: 'Compare by', kind: 'select', default: 'line', options: [
      { value: 'line', label: 'Lines' }, { value: 'word', label: 'Words' },
    ] },
    { id: 'ignoreWhitespace', label: 'Ignore whitespace', kind: 'toggle', default: false },
    { id: 'ignoreCase', label: 'Ignore case', kind: 'toggle', default: false },
  ],
  run(input: string, options: TextOptions, secondary = ''): TextResult {
    const byWord = options.granularity === 'word';
    const split = (s: string) => (byWord ? s.split(/(\s+)/) : s.split(/\r\n|\r|\n/));
    const norm = (s: string) => {
      let t = s;
      if (options.ignoreCase) t = t.toLowerCase();
      if (options.ignoreWhitespace) t = t.replace(/\s+/g, ' ').trim();
      return t;
    };
    const a = split(input);
    const b = split(secondary);
    const raw = myers(a, b, (x, y) => norm(x) === norm(y));
    const sep = byWord ? '' : '\n';
    const diffOps: DiffOp[] = raw.map((op) => ({ type: op.type, value: op.items.join(sep) }));

    const added = raw.filter((o) => o.type === 'insert').reduce((n, o) => n + o.items.length, 0);
    const removed = raw.filter((o) => o.type === 'delete').reduce((n, o) => n + o.items.length, 0);
    return {
      output: '',
      diff: diffOps,
      notes: [`${added} ${byWord ? 'word' : 'line'}(s) added, ${removed} removed.`],
    };
  },
  // text-diff's payload lives in `diff`, not `output` — the vector only pins
  // down that a diverging pair never throws and output stays the empty string.
  vectors: [{ input: 'a\nb', secondary: 'a\nc', expect: '' }],
});
