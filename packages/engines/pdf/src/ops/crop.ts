// lovelytools.ai — crop pages by trimming a margin.
//
// This was declared unbuildable ("needs page-box manipulation"). pdf-lib has shipped
// setCropBox since 1.x; the capability was there the whole time.
import {
  checkCancelled,
  outName,
  parsePageRange,
  PdfError,
  type OpContext,
  type PdfInput,
  type PdfOpResult,
} from '../types';
import { openPdf } from './merge';

export interface CropOptions {
  /** Points trimmed from every edge. 72pt = 1 inch. */
  marginPt: number;
  /** Which pages to crop. Omit for all. */
  range?: string;
}

export async function crop(
  input: PdfInput,
  opts: CropOptions,
  ctx: OpContext,
): Promise<PdfOpResult> {
  const bytesIn = input.buf.byteLength;
  const margin = opts.marginPt;

  if (!Number.isFinite(margin) || margin <= 0) {
    throw new PdfError('invalid-range', 'Give a margin greater than 0 points to trim.');
  }

  const doc = await openPdf(input.buf, input.name);
  const pageCount = doc.getPageCount();
  const targets = opts.range ? parsePageRange(opts.range, pageCount) : doc.getPageIndices();

  for (const [i, index] of targets.entries()) {
    checkCancelled(ctx);
    ctx.progress(Math.round((i / targets.length) * 90), `Cropping page ${index + 1}`);

    const page = doc.getPage(index);
    // The crop box is expressed in the page's own coordinate space, which does not
    // necessarily start at 0,0 — a page can have a media box offset. Read it rather
    // than assuming, or the crop lands in the wrong place on those pages.
    const media = page.getMediaBox();
    const width = media.width - margin * 2;
    const height = media.height - margin * 2;

    if (width <= 0 || height <= 0) {
      throw new PdfError(
        'invalid-range',
        `A ${margin}pt margin would crop page ${index + 1} out of existence — it is only ${Math.round(media.width)}×${Math.round(media.height)}pt.`,
      );
    }

    page.setCropBox(media.x + margin, media.y + margin, width, height);
  }

  ctx.progress(95, 'Saving');
  const bytes = await doc.save({ useObjectStreams: true });

  ctx.warn(
    'Cropping hides the margins rather than deleting what was in them — the content is still in the file, just outside the visible box. Flatten or rasterise if it must be gone.',
  );

  return {
    files: [{ bytes, name: outName(input.name, '-cropped'), mime: 'application/pdf' }],
    fidelity: 'high',
    warnings: [],
    stats: { pagesIn: pageCount, pagesOut: pageCount, bytesIn, bytesOut: bytes.byteLength },
  };
}
