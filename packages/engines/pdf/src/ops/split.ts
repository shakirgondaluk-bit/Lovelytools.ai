// lovelytools.ai — split one PDF into many: explicit ranges, every-N chunks,
// or one file per page.
import { PDFDocument } from 'pdf-lib';
import {
  checkCancelled,
  outName,
  parsePageRange,
  type OpContext,
  type OutputFile,
  type PdfInput,
  type PdfOpResult,
  type SplitMode,
} from '../types';
import { openPdf } from './merge';

export async function split(input: PdfInput, mode: SplitMode, ctx: OpContext): Promise<PdfOpResult> {
  const src = await openPdf(input.buf, input.name);
  const total = src.getPageCount();
  const base = input.name;

  const parts: Array<{ indices: number[]; label: string }> =
    mode.kind === 'ranges'
      ? mode.specs.map((spec) => ({ indices: parsePageRange(spec, total), label: `-p${spec.replace(/[^\d-]+/g, '_')}` }))
      : mode.kind === 'every'
        ? chunk(total, Math.max(1, mode.n)).map((indices, i) => ({ indices, label: `-part${i + 1}` }))
        : Array.from({ length: total }, (_, i) => ({ indices: [i], label: `-page${i + 1}` }));

  const files: OutputFile[] = [];
  for (const [i, part] of parts.entries()) {
    checkCancelled(ctx);
    ctx.progress(Math.round((i / parts.length) * 92), `Writing part ${i + 1} of ${parts.length}`);
    const doc = await PDFDocument.create();
    const pages = await doc.copyPages(src, part.indices);
    for (const p of pages) doc.addPage(p);
    files.push({
      bytes: await doc.save({ useObjectStreams: true }),
      name: outName(base, part.label),
      mime: 'application/pdf',
    });
  }

  return {
    files,
    fidelity: 'high',
    warnings: [],
    stats: {
      pagesIn: total,
      pagesOut: parts.reduce((n, p) => n + p.indices.length, 0),
      bytesIn: input.buf.byteLength,
      bytesOut: files.reduce((n, f) => n + f.bytes.byteLength, 0),
    },
  };
}

function chunk(total: number, n: number): number[][] {
  const out: number[][] = [];
  for (let start = 0; start < total; start += n) {
    out.push(Array.from({ length: Math.min(n, total - start) }, (_, i) => start + i));
  }
  return out;
}
