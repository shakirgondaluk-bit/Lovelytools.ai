// lovelytools.ai — merge N PDFs into one, with optional per-source page ranges.
import { PDFDocument } from 'pdf-lib';
import {
  checkCancelled,
  parsePageRange,
  PdfError,
  type MergeSource,
  type OpContext,
  type PdfOpResult,
} from '../types';

export async function merge(sources: MergeSource[], ctx: OpContext): Promise<PdfOpResult> {
  if (sources.length < 2) throw new PdfError('invalid-range', 'Add at least two PDFs to merge.');
  const out = await PDFDocument.create();
  let pagesIn = 0;
  let bytesIn = 0;

  // .entries() rather than an index loop: under noUncheckedIndexedAccess, sources[i]
  // is typed `T | undefined` even though the loop bound rules that out.
  for (const [i, source] of sources.entries()) {
    checkCancelled(ctx);
    const { input, range } = source;
    ctx.progress(
      Math.round((i / sources.length) * 85),
      `Adding ${input.name} (${i + 1} of ${sources.length})`,
    );
    const src = await openPdf(input.buf, input.name);
    bytesIn += input.buf.byteLength;
    pagesIn += src.getPageCount();
    const indices = range ? parsePageRange(range, src.getPageCount()) : src.getPageIndices();
    const pages = await out.copyPages(src, indices);
    for (const p of pages) out.addPage(p);
  }

  ctx.progress(90, 'Saving merged PDF');
  const bytes = await out.save({ useObjectStreams: true });
  return {
    files: [{ bytes, name: 'merged.pdf', mime: 'application/pdf' }],
    fidelity: 'high',
    warnings: [],
    stats: { pagesIn, pagesOut: out.getPageCount(), bytesIn, bytesOut: bytes.byteLength },
  };
}

/** Shared open-with-friendly-errors. Encrypted files fail fast and clearly. */
export async function openPdf(buf: ArrayBuffer, name: string): Promise<PDFDocument> {
  try {
    return await PDFDocument.load(buf, { ignoreEncryption: false, updateMetadata: false });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/encrypt/i.test(msg)) {
      throw new PdfError('password-protected', `${name} is password-protected. Use the Unlock tool first.`);
    }
    if (/header/i.test(msg) || /No PDF/i.test(msg)) {
      throw new PdfError('not-a-pdf', `${name} doesn't look like a PDF.`);
    }
    throw new PdfError('corrupt-file', `${name} couldn't be opened — it may be corrupt. Try re-exporting it.`);
  }
}
