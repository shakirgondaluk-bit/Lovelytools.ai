// lovelytools.ai — text watermark: centered, diagonal, or tiled.
import { rgb, StandardFonts } from 'pdf-lib';
import {
  checkCancelled,
  outName,
  parsePageRange,
  type OpContext,
  type PdfInput,
  type PdfOpResult,
  type WatermarkOptions,
} from '../types';
import { openPdf } from './merge';

export async function watermark(input: PdfInput, opts: WatermarkOptions, ctx: OpContext): Promise<PdfOpResult> {
  const doc = await openPdf(input.buf, input.name);
  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  const total = doc.getPageCount();
  const indices = opts.range ? parsePageRange(opts.range, total) : doc.getPageIndices();
  const color = rgb(opts.color.r, opts.color.g, opts.color.b);

  indices.forEach((idx, i) => {
    checkCancelled(ctx);
    const page = doc.getPage(idx);
    const { width, height } = page.getSize();
    const textWidth = font.widthOfTextAtSize(opts.text, opts.fontSize);

    if (opts.position === 'tile') {
      const stepX = textWidth + 120;
      const stepY = opts.fontSize + 140;
      for (let y = 40; y < height; y += stepY) {
        for (let x = 20; x < width; x += stepX) {
          page.drawText(opts.text, {
            x, y, size: opts.fontSize, font, color, opacity: opts.opacity,
            rotate: { type: 'degrees', angle: 30 } as never,
          });
        }
      }
    } else {
      const diagonal = opts.position === 'diagonal';
      page.drawText(opts.text, {
        x: (width - textWidth * (diagonal ? 0.72 : 1)) / 2,
        y: diagonal ? height * 0.32 : (height - opts.fontSize) / 2,
        size: opts.fontSize,
        font,
        color,
        opacity: opts.opacity,
        ...(diagonal ? { rotate: { type: 'degrees', angle: 45 } as never } : {}),
      });
    }
    if (i % 20 === 0) ctx.progress(Math.round((i / indices.length) * 85), `Stamping page ${idx + 1}`);
  });

  ctx.progress(90, 'Saving');
  const bytes = await doc.save({ useObjectStreams: true });
  return {
    files: [{ bytes, name: outName(input.name, '-watermarked'), mime: 'application/pdf' }],
    fidelity: 'high',
    warnings: [],
    stats: { pagesIn: total, pagesOut: total, bytesIn: input.buf.byteLength, bytesOut: bytes.byteLength },
  };
}
