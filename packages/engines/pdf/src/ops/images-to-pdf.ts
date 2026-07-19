// lovelytools.ai — JPG/PNG/WebP → PDF. WebP is transcoded via canvas since
// pdf-lib embeds only JPEG/PNG.
import { PDFDocument } from 'pdf-lib';
import {
  checkCancelled,
  PdfError,
  type ImagesToPdfOptions,
  type OpContext,
  type PdfInput,
  type PdfOpResult,
} from '../types';

const PAGE_SIZES: Record<'a4' | 'letter', [number, number]> = {
  a4: [595.28, 841.89],
  letter: [612, 792],
};

export async function imagesToPdf(
  images: PdfInput[],
  opts: ImagesToPdfOptions,
  ctx: OpContext,
): Promise<PdfOpResult> {
  if (images.length === 0) throw new PdfError('empty-range', 'Add at least one image.');
  const doc = await PDFDocument.create();
  let bytesIn = 0;

  for (const [i, image] of images.entries()) {
    checkCancelled(ctx);
    ctx.progress(Math.round((i / images.length) * 85), `Placing ${image.name}`);
    bytesIn += image.buf.byteLength;

    const embedded = await embed(doc, image);
    const [pw, ph] =
      opts.pageSize === 'auto'
        ? [embedded.width + opts.marginPt * 2, embedded.height + opts.marginPt * 2]
        : orient(PAGE_SIZES[opts.pageSize], opts.orientation);

    const page = doc.addPage([pw, ph]);
    const avail = { w: pw - opts.marginPt * 2, h: ph - opts.marginPt * 2 };
    const scale =
      opts.fit === 'actual'
        ? 1
        : opts.fit === 'fill'
          ? Math.max(avail.w / embedded.width, avail.h / embedded.height)
          : Math.min(avail.w / embedded.width, avail.h / embedded.height, 1);
    const w = embedded.width * scale;
    const h = embedded.height * scale;
    page.drawImage(embedded, { x: (pw - w) / 2, y: (ph - h) / 2, width: w, height: h });
  }

  ctx.progress(92, 'Saving PDF');
  const bytes = await doc.save({ useObjectStreams: true });
  return {
    files: [{ bytes, name: 'images.pdf', mime: 'application/pdf' }],
    fidelity: 'high',
    warnings: [],
    stats: { pagesIn: images.length, pagesOut: images.length, bytesIn, bytesOut: bytes.byteLength },
  };
}

async function embed(doc: PDFDocument, img: PdfInput) {
  const head = new Uint8Array(img.buf.slice(0, 12));
  if (head[0] === 0xff && head[1] === 0xd8) return doc.embedJpg(img.buf);
  if (head[0] === 0x89 && head[1] === 0x50) return doc.embedPng(img.buf);
  if (String.fromCharCode(...head.slice(8, 12)) === 'WEBP') {
    return doc.embedJpg(await webpToJpeg(img.buf));
  }
  throw new PdfError('not-a-pdf', `${img.name} isn't a JPG, PNG, or WebP image.`);
}

/** Transcode WebP → JPEG via (Offscreen)Canvas. Worker-safe. */
async function webpToJpeg(buf: ArrayBuffer): Promise<ArrayBuffer> {
  const blob = new Blob([buf], { type: 'image/webp' });
  const bitmap = await createImageBitmap(blob);
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const g = canvas.getContext('2d')!;
  g.fillStyle = '#ffffff'; // JPEG has no alpha — flatten on white
  g.fillRect(0, 0, bitmap.width, bitmap.height);
  g.drawImage(bitmap, 0, 0);
  bitmap.close();
  const jpeg = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.92 });
  return jpeg.arrayBuffer();
}

function orient([w, h]: [number, number], o: 'portrait' | 'landscape'): [number, number] {
  return o === 'portrait' ? [w, h] : [h, w];
}
