// lovelytools.ai — true redaction.
//
// Declared unbuildable: "needs true redaction — removing the content, not drawing a
// black box over it". That distinction is the whole tool, and it is why this op is
// the one place the engine deliberately destroys quality.
//
// The naive implementation — draw a black rectangle over the words — is not
// redaction. The text stays in the content stream: select it, copy it, or run
// pdf-to-text on it and the "redacted" name comes straight back out. That is how
// governments and law firms leak documents, repeatedly, in public.
//
// So this rasterises. Every page is re-rendered to a bitmap, which drops the text
// layer entirely, and the black boxes are painted onto the bitmap before it becomes a
// PDF again. What comes out has no text to recover, because it has no text at all.
// The cost is real — the document is now images, unsearchable and bigger — and the
// op says so rather than quietly handing back something that looks the same but isn't
// safe.
import { PDFDocument } from 'pdf-lib';
import { openPdfDocument } from '../pdfjs';
// The shared helpers, not a private copy. An earlier version of this op called
// page.render() directly and hung forever on the first page, because the timeout
// that makes rendering safe lives in render.ts — duplicating the loop duplicated
// everything except the part that mattered.
import { makeCanvas, renderPage, toBlob } from '../render';
import {
  checkCancelled,
  outName,
  PdfError,
  type OpContext,
  type PdfInput,
  type PdfOpResult,
} from '../types';

export interface RedactOptions {
  /** Every text run containing this string is blacked out. Case-insensitive. */
  find: string;
  /** Render resolution of the flattened output. */
  dpi?: number;
}

const PT_PER_INCH = 72;

export async function redact(
  input: PdfInput,
  opts: RedactOptions,
  ctx: OpContext,
): Promise<PdfOpResult> {
  const bytesIn = input.buf.byteLength;
  const needle = opts.find?.trim().toLowerCase();
  const dpi = opts.dpi ?? 150;

  if (!needle) {
    throw new PdfError('internal', 'Type the text you want removed.');
  }

  const doc = await openPdfDocument(input.buf);
  const out = await PDFDocument.create();
  const scale = dpi / PT_PER_INCH;
  let hits = 0;

  for (let i = 1; i <= doc.numPages; i++) {
    checkCancelled(ctx);
    ctx.progress(Math.round((i / doc.numPages) * 88), `Redacting page ${i} of ${doc.numPages}`);

    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale });
    const { canvas, ctx: rawCtx } = makeCanvas(
      Math.ceil(viewport.width),
      Math.ceil(viewport.height),
    );
    const ctx2d = rawCtx as CanvasRenderingContext2D | null;
    if (!ctx2d) throw new PdfError('internal', 'This browser could not open a canvas to redact on.');

    await renderPage(page, ctx2d, viewport, i);

    // Locate the matches on the rendered page, then paint over them. The paint order
    // matters only cosmetically — the text is already gone the moment we rasterised.
    const content = await page.getTextContent();
    ctx2d.fillStyle = '#000000';

    for (const item of content.items) {
      if (!('str' in item) || !item.str) continue;
      if (!item.str.toLowerCase().includes(needle)) continue;

      // transform is [a, b, c, d, e, f]; e/f are the run's origin in PDF space
      // (bottom-left), and the glyph height falls out of the b/d scale components.
      const [, b, , d, e, f] = item.transform as number[];
      const fontHeight = Math.hypot(b ?? 0, d ?? 0) || 10;
      const [vx, vy] = viewport.convertToViewportPoint(e ?? 0, f ?? 0) as [number, number];

      // The whole run goes, not just the matching substring. Over-redacting is a
      // cosmetic problem; under-redacting is the failure this tool exists to prevent.
      const pad = fontHeight * scale * 0.25;
      ctx2d.fillRect(
        vx - pad,
        vy - fontHeight * scale - pad,
        item.width * scale + pad * 2,
        fontHeight * scale + pad * 2,
      );
      hits++;
    }

    const blob = await toBlob(canvas, 0.85, 'image/jpeg');
    const img = await out.embedJpg(await blob.arrayBuffer());
    const widthPt = viewport.width / scale;
    const heightPt = viewport.height / scale;
    const outPage = out.addPage([widthPt, heightPt]);
    outPage.drawImage(img, { x: 0, y: 0, width: widthPt, height: heightPt });

    page.cleanup();
  }

  const pageCount = doc.numPages;
  await doc.destroy();

  if (hits === 0) {
    throw new PdfError(
      'internal',
      `"${opts.find}" doesn't appear in this document's text. Nothing was changed — check the spelling, or note that scanned pages have no text to search until you OCR them.`,
    );
  }

  ctx.progress(94, 'Saving');
  const bytes = await out.save({ useObjectStreams: true });

  return {
    files: [{ bytes, name: outName(input.name, '-redacted'), mime: 'application/pdf' }],
    fidelity: 'text-only',
    warnings: [
      `${hits} match${hits === 1 ? '' : 'es'} removed. Every page was flattened to an image to do it, so the text underneath is genuinely gone — not covered up.`,
      'The result is images: the document is no longer searchable or selectable, and it will be larger. That is the price of the text actually being gone.',
      'Whole text runs are blacked out, so a match may take neighbouring words with it. Check the result before sending it.',
    ],
    stats: { pagesIn: pageCount, pagesOut: pageCount, bytesIn, bytesOut: bytes.byteLength },
  };
}
