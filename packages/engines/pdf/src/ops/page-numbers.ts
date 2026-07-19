// lovelytools.ai — page numbering with template + position.
import { rgb, StandardFonts } from 'pdf-lib';
import {
  checkCancelled,
  outName,
  parsePageRange,
  type NumberPosition,
  type OpContext,
  type PageNumberOptions,
  type PdfInput,
  type PdfOpResult,
} from '../types';
import { openPdf } from './merge';

const MARGIN = 36;

export async function pageNumbers(input: PdfInput, opts: PageNumberOptions, ctx: OpContext): Promise<PdfOpResult> {
  const doc = await openPdf(input.buf, input.name);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const total = doc.getPageCount();
  const indices = opts.range ? parsePageRange(opts.range, total) : doc.getPageIndices();

  indices.forEach((idx, i) => {
    checkCancelled(ctx);
    const page = doc.getPage(idx);
    const { width, height } = page.getSize();
    const label = opts.template
      .replace(/\{n\}/g, String(opts.startAt + i))
      .replace(/\{total\}/g, String(indices.length));
    const textWidth = font.widthOfTextAtSize(label, opts.fontSize);
    const [x, y] = place(opts.position, width, height, textWidth, opts.fontSize);
    page.drawText(label, { x, y, size: opts.fontSize, font, color: rgb(0.35, 0.35, 0.38) });
    if (i % 25 === 0) ctx.progress(Math.round((i / indices.length) * 85), `Numbering page ${idx + 1}`);
  });

  ctx.progress(90, 'Saving');
  const bytes = await doc.save({ useObjectStreams: true });
  return {
    files: [{ bytes, name: outName(input.name, '-numbered'), mime: 'application/pdf' }],
    fidelity: 'high',
    warnings: [],
    stats: { pagesIn: total, pagesOut: total, bytesIn: input.buf.byteLength, bytesOut: bytes.byteLength },
  };
}

function place(pos: NumberPosition, w: number, h: number, tw: number, fs: number): [number, number] {
  const xs = { left: MARGIN, center: (w - tw) / 2, right: w - MARGIN - tw };
  const ys = { top: h - MARGIN - fs, bottom: MARGIN };
  const [v, hz] = pos.split('-') as ['top' | 'bottom', 'left' | 'center' | 'right'];
  return [xs[hz], ys[v]];
}
