// lovelytools.ai — PDF → images. Backs pdf-to-jpg and pdf-to-png.
//
// These two tools used to declare the conversion engine, whose format set is
// documents only (no jpg, no png) — they could never have run. Rendering a PDF page
// to a bitmap is pdfjs's job, which lives here.
import { rasterizePages, type RasterMime } from '../render';
import { checkCancelled, PdfError, type OpContext, type PdfInput, type PdfOpResult } from '../types';

export interface RasterizeOptions {
  /** 'image/jpeg' | 'image/png' */
  mime: RasterMime;
  /** Render resolution. 150 is a readable screen page; 300 is print. */
  dpi?: number;
  /** JPEG only — PNG is lossless and ignores this. */
  quality?: number;
}

export async function rasterize(
  input: PdfInput,
  opts: RasterizeOptions,
  ctx: OpContext,
): Promise<PdfOpResult> {
  const dpi = opts.dpi ?? 150;
  const quality = opts.quality ?? 0.85;
  const ext = opts.mime === 'image/png' ? 'png' : 'jpg';

  // Measured before the buffer is handed to pdf.js — see the note in pdfjs.ts.
  const bytesIn = input.buf.byteLength;

  checkCancelled(ctx);
  ctx.progress(2, 'Reading the document');

  const pages = await rasterizePages(input.buf, { dpi, quality, mime: opts.mime }, (i, n) => {
    checkCancelled(ctx);
    ctx.progress(Math.round((i / n) * 94) + 2, `Rendering page ${i} of ${n}`);
  });

  if (pages.length === 0) {
    throw new PdfError('corrupt-file', 'That PDF has no pages we could render.');
  }

  const base = input.name.replace(/\.[^./\\]+$/, '');
  const pad = String(pages.length).length;

  if (opts.mime === 'image/png') {
    ctx.warn('PNG is lossless, so page images are large. JPEG is a fraction of the size.');
  }

  ctx.progress(100, 'Done');
  return {
    files: pages.map((p) => ({
      bytes: new Uint8Array(p.bytes),
      // Single-page PDFs get a plain name; multi-page get -01, -02…
      name:
        pages.length === 1
          ? `${base}.${ext}`
          : `${base}-${String(p.page).padStart(pad, '0')}.${ext}`,
      mime: p.mime,
    })),
    fidelity: 'high',
    warnings: [],
    stats: {
      pagesIn: pages.length,
      pagesOut: pages.length,
      bytesIn,
      bytesOut: pages.reduce((n, p) => n + p.bytes.byteLength, 0),
    },
  };
}
