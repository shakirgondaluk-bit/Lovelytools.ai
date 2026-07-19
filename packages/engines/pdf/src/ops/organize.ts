// lovelytools.ai — organize: reorder / delete / duplicate / extract pages.
// The UI's drag-to-reorder grid emits a single `order` array; deletions are
// omissions, duplicates are repeats. One op, one save.
import { PDFDocument } from 'pdf-lib';
import {
  checkCancelled,
  outName,
  parsePageRange,
  PdfError,
  type OpContext,
  type OrganizeAction,
  type PdfInput,
  type PdfOpResult,
} from '../types';
import { openPdf } from './merge';

export async function organize(input: PdfInput, action: OrganizeAction, ctx: OpContext): Promise<PdfOpResult> {
  const src = await openPdf(input.buf, input.name);
  const total = src.getPageCount();
  if (action.order.length === 0) {
    throw new PdfError('empty-range', 'All pages were removed — a PDF needs at least one page.');
  }
  for (const idx of action.order) {
    if (idx < 0 || idx >= total) throw new PdfError('invalid-range', `Page ${idx + 1} doesn't exist.`);
  }

  ctx.progress(20, 'Rebuilding document');
  const doc = await PDFDocument.create();
  const pages = await doc.copyPages(src, action.order);
  pages.forEach((p, i) => {
    checkCancelled(ctx);
    doc.addPage(p);
    if (i % 20 === 0) ctx.progress(20 + Math.round((i / pages.length) * 65), `Placing page ${i + 1} of ${pages.length}`);
  });

  ctx.progress(90, 'Saving');
  const bytes = await doc.save({ useObjectStreams: true });
  return {
    files: [{ bytes, name: outName(input.name, '-organized'), mime: 'application/pdf' }],
    fidelity: 'high',
    warnings: [],
    stats: { pagesIn: total, pagesOut: action.order.length, bytesIn: input.buf.byteLength, bytesOut: bytes.byteLength },
  };
}

/** Extract a range into a new PDF ("Extract pages" tool) — sugar over organize. */
export async function extractPages(input: PdfInput, range: string, ctx: OpContext): Promise<PdfOpResult> {
  const src = await openPdf(input.buf, input.name);
  const order = parsePageRange(range, src.getPageCount());
  const result = await organize(input, { order }, ctx);
  const [file] = result.files;
  if (!file) throw new PdfError('internal', 'Extracting pages produced no document.');
  file.name = outName(input.name, '-extracted');
  return result;
}
