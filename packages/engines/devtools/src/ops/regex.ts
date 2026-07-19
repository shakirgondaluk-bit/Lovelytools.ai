// lovelytools.ai — regex tester with catastrophic-backtracking protection:
// evaluation runs in a disposable Worker with a 200 ms budget. A hostile
// pattern kills the worker, not the tab.
import { defineDevOp, DevError, type DevAnnotation, type DevOptions, type DevResult } from '../types';

const BUDGET_MS = 200;

interface RegexOutcome {
  matches: Array<{ index: number; text: string; groups: Array<string | null> }>;
  replaced?: string;
}

/** Inline worker source — no separate file, works under any bundler. */
const WORKER_SRC = `
self.onmessage = (e) => {
  const { pattern, flags, text, replacement } = e.data;
  try {
    const re = new RegExp(pattern, flags);
    const matches = [];
    let m;
    if (flags.includes('g')) {
      while ((m = re.exec(text)) !== null && matches.length < 5000) {
        matches.push({ index: m.index, text: m[0], groups: m.slice(1).map((g) => g ?? null) });
        if (m[0] === '') re.lastIndex++;
      }
    } else {
      m = re.exec(text);
      if (m) matches.push({ index: m.index, text: m[0], groups: m.slice(1).map((g) => g ?? null) });
    }
    const replaced = replacement !== null ? text.replace(new RegExp(pattern, flags), replacement) : undefined;
    self.postMessage({ ok: true, matches, replaced });
  } catch (err) {
    self.postMessage({ ok: false, message: String(err && err.message || err) });
  }
};`;

function runGuarded(pattern: string, flags: string, text: string, replacement: string | null): Promise<RegexOutcome> {
  return new Promise((resolve, reject) => {
    const blob = new Blob([WORKER_SRC], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);
    const worker = new Worker(url);
    const timer = setTimeout(() => {
      worker.terminate();
      URL.revokeObjectURL(url);
      reject(new DevError('timeout', `That pattern took over ${BUDGET_MS} ms — likely catastrophic backtracking. Try atomic groups or a possessive rewrite.`));
    }, BUDGET_MS);
    worker.onmessage = (e) => {
      clearTimeout(timer);
      worker.terminate();
      URL.revokeObjectURL(url);
      if (e.data.ok) resolve(e.data as RegexOutcome);
      else reject(new DevError('parse-error', e.data.message));
    };
    worker.postMessage({ pattern, flags, text, replacement });
  });
}

export const regex = defineDevOp({
  slug: 'regex-tester',
  name: 'Regex Tester',
  description: 'Live matches, capture groups, and replace preview — hostile patterns time out safely.',
  async: true,
  options: [
    { id: 'pattern', label: 'Pattern', kind: 'text', default: '\\b(\\w+)@(\\w+)\\.com\\b', placeholder: 'regular expression' },
    { id: 'flags', label: 'Flags', kind: 'text', default: 'g', placeholder: 'gimsuy' },
    { id: 'replacement', label: 'Replacement (optional)', kind: 'text', default: '', placeholder: '$1 at $2' },
  ],
  async run(input: string, options: DevOptions): Promise<DevResult> {
    const pattern = String(options.pattern ?? '');
    if (pattern === '' || input === '') return { output: '' };
    const flags = String(options.flags ?? 'g').replace(/[^gimsuy]/g, '');
    const replacement = String(options.replacement ?? '');

    const outcome =
      typeof Worker !== 'undefined'
        ? await runGuarded(pattern, flags, input, replacement === '' ? null : replacement)
        : runUnguarded(pattern, flags, input, replacement === '' ? null : replacement);

    const annotations: DevAnnotation[] = outcome.matches.slice(0, 500).map((m) => {
      const upTo = input.slice(0, m.index);
      const line = (upTo.match(/\n/g)?.length ?? 0) + 1;
      const column = m.index - upTo.lastIndexOf('\n');
      return { line, column, message: m.text, kind: 'match' };
    });

    const lines = outcome.matches
      .map((m, i) => `#${i + 1} @${m.index}: "${m.text}"${m.groups.length ? '  groups: ' + m.groups.map((g, gi) => `$${gi + 1}=${g ?? '∅'}`).join(' ') : ''}`)
      .join('\n');

    return {
      output: outcome.replaced !== undefined ? outcome.replaced : lines,
      annotations,
      notes: [`${outcome.matches.length} match(es)${outcome.matches.length === 5000 ? ' (capped)' : ''}.`],
    };
  },
  vectors: [
    {
      input: 'contact: jane@example.com',
      expect: '#1 @9: "jane@example.com"  groups: $1=jane $2=example',
    },
  ],
});

/* Main-thread fallback when Workers are unavailable — still try/caught. */
function runUnguarded(pattern: string, flags: string, text: string, replacement: string | null): RegexOutcome {
  const re = new RegExp(pattern, flags);
  const matches: RegexOutcome['matches'] = [];
  let m: RegExpExecArray | null;
  if (flags.includes('g')) {
    while ((m = re.exec(text)) !== null && matches.length < 5000) {
      matches.push({ index: m.index, text: m[0], groups: m.slice(1).map((g) => g ?? null) });
      if (m[0] === '') re.lastIndex++;
    }
  } else {
    m = re.exec(text);
    if (m) matches.push({ index: m.index, text: m[0], groups: m.slice(1).map((g) => g ?? null) });
  }
  return { matches, replaced: replacement !== null ? text.replace(new RegExp(pattern, flags), replacement) : undefined };
}
