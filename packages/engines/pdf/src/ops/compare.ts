// lovelytools.ai — diff the text of two PDFs.
//
// Declared unbuildable ("needs a text-diff pass across two documents"). extractText
// already existed; a line diff is thirty lines of Myers-lite. No new capability was
// needed, only the join.
//
// Deliberately a TEXT diff, not a visual one. A pixel diff of two renders tells you
// that something moved without telling you what changed, and a re-flowed paragraph
// lights up the whole page. Text is what people actually want compared.
import { checkCancelled, outName, PdfError, type OpContext, type PdfInput, type PdfOpResult } from '../types';
import { extractText } from './extract-text';

export interface CompareOptions {
  /** The document to compare against. */
  other: PdfInput;
}

type Op = 'same' | 'added' | 'removed';
interface DiffLine {
  op: Op;
  text: string;
  /** 1-based page in whichever document the line came from. */
  page: number;
}

export async function compare(
  input: PdfInput,
  opts: CompareOptions,
  ctx: OpContext,
): Promise<PdfOpResult> {
  const bytesIn = input.buf.byteLength + opts.other.buf.byteLength;

  ctx.progress(5, `Reading ${input.name}`);
  const left = await extractText(input, { ...ctx, progress: (p) => ctx.progress(5 + p * 0.35, 'Reading the first document') });

  checkCancelled(ctx);
  ctx.progress(45, `Reading ${opts.other.name}`);
  const right = await extractText(opts.other, {
    ...ctx,
    progress: (p) => ctx.progress(45 + p * 0.35, 'Reading the second document'),
  });

  const leftLines = toLines(left);
  const rightLines = toLines(right);

  if (leftLines.length === 0 && rightLines.length === 0) {
    throw new PdfError(
      'internal',
      'Neither document has selectable text — these look like scans. OCR them first and the comparison will work.',
    );
  }

  checkCancelled(ctx);
  ctx.progress(85, 'Comparing');
  const diff = diffLines(leftLines, rightLines);

  const added = diff.filter((d) => d.op === 'added').length;
  const removed = diff.filter((d) => d.op === 'removed').length;

  const report = renderReport(input.name, opts.other.name, diff, added, removed);
  const bytes = new TextEncoder().encode(report);

  ctx.progress(100, 'Done');
  return {
    files: [{ bytes, name: outName(input.name, '-diff', 'txt'), mime: 'text/plain' }],
    fidelity: 'text-only',
    warnings:
      added === 0 && removed === 0
        ? ['The text of these two documents is identical. Formatting, images and layout are not compared.']
        : ['Only text is compared — images, fonts and layout changes will not show up here.'],
    stats: {
      pagesIn: Math.max(left.length, right.length),
      pagesOut: Math.max(left.length, right.length),
      bytesIn,
      bytesOut: bytes.byteLength,
    },
  };
}

const toLines = (pages: Array<{ page: number; text: string }>): DiffLine[] =>
  pages.flatMap((p) =>
    p.text
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .map((text): DiffLine => ({ op: 'same', text, page: p.page })),
  );

/**
 * Longest-common-subsequence diff over whole lines.
 *
 * O(n·m) in memory, which is fine for documents (a 200-page PDF is a few thousand
 * lines) and would not be for source files. If that ever changes, swap in
 * diff-match-patch — the text engine already depends on it.
 */
function diffLines(a: DiffLine[], b: DiffLine[]): DiffLine[] {
  const n = a.length;
  const m = b.length;

  // lcs[i][j] = length of the longest common subsequence of a[i:] and b[j:]
  const lcs: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i]![j] =
        a[i]!.text === b[j]!.text
          ? lcs[i + 1]![j + 1]! + 1
          : Math.max(lcs[i + 1]![j]!, lcs[i]![j + 1]!);
    }
  }

  const out: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i]!.text === b[j]!.text) {
      out.push({ ...a[i]!, op: 'same' });
      i++;
      j++;
    } else if (lcs[i + 1]![j]! >= lcs[i]![j + 1]!) {
      out.push({ ...a[i]!, op: 'removed' });
      i++;
    } else {
      out.push({ ...b[j]!, op: 'added' });
      j++;
    }
  }
  while (i < n) out.push({ ...a[i++]!, op: 'removed' });
  while (j < m) out.push({ ...b[j++]!, op: 'added' });
  return out;
}

/** A unified-diff-shaped report: familiar to anyone who has read a code review. */
function renderReport(
  leftName: string,
  rightName: string,
  diff: DiffLine[],
  added: number,
  removed: number,
): string {
  const head = [
    `--- ${leftName}`,
    `+++ ${rightName}`,
    '',
    added === 0 && removed === 0
      ? 'The text is identical.'
      : `${removed} line${removed === 1 ? '' : 's'} removed, ${added} line${added === 1 ? '' : 's'} added.`,
    '',
  ];

  const body: string[] = [];
  let lastPage = -1;
  for (const line of diff) {
    if (line.op === 'same') continue;
    if (line.page !== lastPage) {
      body.push('', `@@ page ${line.page} @@`);
      lastPage = line.page;
    }
    body.push(`${line.op === 'added' ? '+' : '-'} ${line.text}`);
  }

  return [...head, ...body].join('\n') + '\n';
}
