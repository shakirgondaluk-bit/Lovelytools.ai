// lovelytools.ai — rotate pages. Composes with the page's existing rotation.
import { degrees } from 'pdf-lib';
import {
  checkCancelled,
  outName,
  parsePageRange,
  type OpContext,
  type PdfInput,
  type PdfOpResult,
  type RotationDeg,
} from '../types';
import { openPdf } from './merge';

export async function rotate(
  input: PdfInput,
  by: RotationDeg,
  ctx: OpContext,
  range?: string,
): Promise<PdfOpResult> {
  const doc = await openPdf(input.buf, input.name);
  const total = doc.getPageCount();
  const indices = range ? parsePageRange(range, total) : doc.getPageIndices();

  indices.forEach((idx, i) => {
    checkCancelled(ctx);
    const page = doc.getPage(idx);
    page.setRotation(degrees(((page.getRotation().angle + by) % 360 + 360) % 360));
    if (i % 25 === 0) ctx.progress(Math.round((i / indices.length) * 85), `Rotating page ${idx + 1}`);
  });

  ctx.progress(90, 'Saving');
  const bytes = await doc.save({ useObjectStreams: true });
  return {
    files: [{ bytes, name: outName(input.name, '-rotated'), mime: 'application/pdf' }],
    fidelity: 'high',
    warnings: [],
    stats: { pagesIn: total, pagesOut: total, bytesIn: input.buf.byteLength, bytesOut: bytes.byteLength },
  };
}
