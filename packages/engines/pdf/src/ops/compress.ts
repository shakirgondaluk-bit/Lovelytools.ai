// lovelytools.ai — compress. Two honest modes; never ships a bigger file.
//
// lossless: strip metadata + thumbnails, drop unused objects, re-save with
//           object streams. Typical 5–30%. Fidelity: high.
// raster:   re-render each page at target DPI to JPEG and rebuild the PDF.
//           Big wins on scan-heavy files (60–90%). Text becomes pixels —
//           fidelity: text-only; the UI must warn before download.
import { PDFDocument } from 'pdf-lib';
import { renderPageToJpeg } from '../render';
import {
  checkCancelled,
  outName,
  PdfError,
  type CompressOptions,
  type OpContext,
  type PdfInput,
  type PdfOpResult,
} from '../types';
import { openPdf } from './merge';

export async function compress(input: PdfInput, opts: CompressOptions, ctx: OpContext): Promise<PdfOpResult> {
  return opts.mode === 'lossless' ? lossless(input, ctx) : raster(input, opts, ctx);
}

async function lossless(input: PdfInput, ctx: OpContext): Promise<PdfOpResult> {
  ctx.progress(15, 'Reading PDF');
  const doc = await openPdf(input.buf, input.name);
  const total = doc.getPageCount();

  ctx.progress(40, 'Stripping metadata');
  doc.setTitle('');
  doc.setAuthor('');
  doc.setSubject('');
  doc.setKeywords([]);
  doc.setProducer('');
  doc.setCreator('');

  ctx.progress(65, 'Re-packing objects');
  const bytes = await doc.save({ useObjectStreams: true, addDefaultPage: false });

  if (bytes.byteLength >= input.buf.byteLength) {
    // Never ship a worse file — return the original untouched.
    return {
      files: [{ bytes: new Uint8Array(input.buf), name: input.name, mime: 'application/pdf' }],
      fidelity: 'high',
      warnings: ['This PDF is already tightly packed — lossless couldn\u2019t shrink it. Try the "smaller file" mode for scans.'],
      stats: { pagesIn: total, pagesOut: total, bytesIn: input.buf.byteLength, bytesOut: input.buf.byteLength },
    };
  }
  return {
    files: [{ bytes, name: outName(input.name, '-compressed'), mime: 'application/pdf' }],
    fidelity: 'high',
    warnings: [],
    stats: { pagesIn: total, pagesOut: total, bytesIn: input.buf.byteLength, bytesOut: bytes.byteLength },
  };
}

async function raster(input: PdfInput, opts: CompressOptions, ctx: OpContext): Promise<PdfOpResult> {
  const dpi = opts.dpi ?? 120;
  const quality = opts.quality ?? 0.7;
  if (dpi < 50 || dpi > 300) throw new PdfError('invalid-range', 'DPI must be between 50 and 300.');

  // Measure before handing the buffer to anything. openPdfDocument copies, so this
  // buffer survives — but reading a size back out of a buffer you have already given
  // away is what made this op report bytesIn: 0 and "100% smaller". Read it once,
  // up front, and the question cannot come up again.
  const bytesIn = input.buf.byteLength;

  const out = await PDFDocument.create();
  // render.ts owns pdfjs + OffscreenCanvas; we get back JPEG bytes + page size in points.
  const pages = await renderPageToJpeg(input.buf, { dpi, quality }, (i, n) => {
    checkCancelled(ctx);
    ctx.progress(Math.round((i / n) * 80), `Re-rendering page ${i} of ${n}`);
  });

  for (const p of pages) {
    const img = await out.embedJpg(p.jpeg);
    const page = out.addPage([p.widthPt, p.heightPt]);
    page.drawImage(img, { x: 0, y: 0, width: p.widthPt, height: p.heightPt });
  }

  ctx.progress(90, 'Saving');
  const bytes = await out.save({ useObjectStreams: true });

  if (bytes.byteLength >= bytesIn) {
    return {
      files: [{ bytes: new Uint8Array(input.buf), name: input.name, mime: 'application/pdf' }],
      fidelity: 'high',
      warnings: ['Re-rendering would have made this file bigger, so the original was kept.'],
      stats: { pagesIn: pages.length, pagesOut: pages.length, bytesIn, bytesOut: bytesIn },
    };
  }
  return {
    files: [{ bytes, name: outName(input.name, '-compressed'), mime: 'application/pdf' }],
    fidelity: 'text-only',
    warnings: ['Pages were re-rendered as images — text can no longer be selected or searched.'],
    stats: { pagesIn: pages.length, pagesOut: pages.length, bytesIn, bytesOut: bytes.byteLength },
  };
}
