// lovelytools.ai — stamp a signature image onto a page.
//
// Declared unbuildable ("needs digital signature support"), which conflated two very
// different things:
//
//   · A VISIBLE signature — a picture of a signature placed on the page. This is what
//     every "sign PDF online" tool means, and pdf-lib does it with embedPng +
//     drawImage.
//   · A DIGITAL signature — a cryptographic attestation (PKI, X.509, a certificate
//     you own) that proves the document hasn't changed since you signed it. That
//     needs a certificate and a signing authority, and it is not what this is.
//
// This op does the first and says so. Claiming the second would be a lie with legal
// consequences for whoever believed it.
import { degrees } from 'pdf-lib';
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

export type SignPosition = 'bottom-right' | 'bottom-left' | 'bottom-center';

export interface SignOptions {
  /** PNG or JPEG bytes of the signature. */
  image: ArrayBuffer;
  imageName: string;
  position: SignPosition;
  /** Width in points; height follows the image's aspect ratio. */
  widthPt: number;
  /** Which pages to sign. Omit for the last page only, which is the usual case. */
  range?: string;
}

const MARGIN = 36; // 0.5 inch

export async function sign(input: PdfInput, opts: SignOptions, ctx: OpContext): Promise<PdfOpResult> {
  const bytesIn = input.buf.byteLength;
  const doc = await openPdf(input.buf, input.name);
  const pageCount = doc.getPageCount();

  ctx.progress(20, 'Reading the signature');

  const isPng = opts.imageName.toLowerCase().endsWith('.png');
  let image;
  try {
    image = isPng ? await doc.embedPng(opts.image) : await doc.embedJpg(opts.image);
  } catch {
    throw new PdfError('corrupt-file', "That signature image couldn't be read. Use a PNG or JPEG.");
  }

  // Default to the last page: signatures go at the end of a document, not on every
  // page of it.
  const targets = opts.range ? parsePageRange(opts.range, pageCount) : [pageCount - 1];

  const width = opts.widthPt;
  const height = (image.height / image.width) * width;

  for (const [i, index] of targets.entries()) {
    checkCancelled(ctx);
    ctx.progress(30 + Math.round((i / targets.length) * 55), `Signing page ${index + 1}`);

    const page = doc.getPage(index);
    const { width: pw } = page.getSize();

    // Positions are relative to the page's own box, and pages can be rotated — a
    // signature placed without accounting for that lands sideways.
    const x =
      opts.position === 'bottom-left'
        ? MARGIN
        : opts.position === 'bottom-center'
          ? (pw - width) / 2
          : pw - width - MARGIN;

    page.drawImage(image, { x, y: MARGIN, width, height, rotate: degrees(0) });
  }

  ctx.progress(92, 'Saving');
  const bytes = await doc.save({ useObjectStreams: true });

  return {
    files: [{ bytes, name: outName(input.name, '-signed'), mime: 'application/pdf' }],
    fidelity: 'high',
    warnings: [
      'This places a picture of your signature on the page. It is not a cryptographic digital signature and does not prove the document is unaltered — if you need that, you need a certificate from a signing authority.',
    ],
    stats: { pagesIn: pageCount, pagesOut: pageCount, bytesIn, bytesOut: bytes.byteLength },
  };
}
