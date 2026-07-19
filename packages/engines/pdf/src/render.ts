// lovelytools.ai — pdfjs rendering: thumbnails for the organize grid, previews,
// and DPI rasterization for raster compress. A real <canvas> on the main thread,
// OffscreenCanvas inside a worker — see makeCanvas.
import type { PageViewport, PDFPageProxy } from 'pdfjs-dist';
import { openPdfDocument } from './pdfjs';
import { PdfError } from './types';

export interface RenderedPage {
  page: number; // 1-based
  jpeg: ArrayBuffer;
  widthPt: number;
  heightPt: number;
}

export interface RasterOptions {
  dpi: number;
  quality: number; // 0–1 JPEG quality
}

const PT_PER_INCH = 72;

/** A page that hasn't painted in this long is not going to. */
const RENDER_TIMEOUT_MS = 30_000;

/**
 * Renders one page, bounded.
 *
 * pdf.js's RenderTask has no timeout of its own, and its failure mode here is to
 * stay pending forever: no error, no rejection, no network request — just a progress
 * bar frozen on page 1. An unbounded await turns that into a spinner the user stares
 * at until they give up. Bounded, it becomes a sentence they can act on.
 */
export async function renderPage(
  page: PDFPageProxy,
  ctx: unknown,
  viewport: PageViewport,
  pageNumber: number,
): Promise<void> {
  const task = page.render({ canvasContext: ctx as CanvasRenderingContext2D, viewport });
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      task.promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          task.cancel();
          // A PdfError, not a plain Error: usePdfTool shows a PdfError's message to
          // the user verbatim and replaces anything else with "Something went wrong
          // with this file". A timeout that explains itself is the entire value of
          // having a timeout, and a plain Error threw that away.
          reject(
            new PdfError(
              'internal',
              `Rendering page ${pageNumber} timed out after ${RENDER_TIMEOUT_MS / 1000}s. This browser couldn't rasterise the page — try Chrome or Edge, or use a tool that doesn't need rendering.`,
            ),
          );
        }, RENDER_TIMEOUT_MS);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

export async function renderPageToJpeg(
  buf: ArrayBuffer,
  opts: RasterOptions,
  onPage?: (i: number, n: number) => void,
): Promise<RenderedPage[]> {
  const doc = await openPdfDocument(buf);
  const scale = opts.dpi / PT_PER_INCH;
  const out: RenderedPage[] = [];

  for (let i = 1; i <= doc.numPages; i++) {
    onPage?.(i, doc.numPages);
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale });
    const { canvas, ctx } = makeCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
    await renderPage(page, ctx, viewport, i);
    out.push({
      page: i,
      jpeg: await toJpeg(canvas, opts.quality),
      widthPt: viewport.width / scale,
      heightPt: viewport.height / scale,
    });
    page.cleanup();
  }
  await doc.destroy();
  return out;
}

/** Thumbnail strip for the organize/split grids. maxEdge in CSS px. */
export async function renderThumbnails(
  buf: ArrayBuffer,
  maxEdge = 160,
  onPage?: (i: number, n: number) => void,
): Promise<Array<{ page: number; blob: Blob; width: number; height: number }>> {
  const doc = await openPdfDocument(buf);
  const out: Array<{ page: number; blob: Blob; width: number; height: number }> = [];
  for (let i = 1; i <= doc.numPages; i++) {
    onPage?.(i, doc.numPages);
    const page = await doc.getPage(i);
    const base = page.getViewport({ scale: 1 });
    const scale = maxEdge / Math.max(base.width, base.height);
    const viewport = page.getViewport({ scale });
    const { canvas, ctx } = makeCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
    await renderPage(page, ctx, viewport, i);
    out.push({
      page: i,
      blob: await toBlob(canvas, 0.82),
      width: Math.ceil(viewport.width),
      height: Math.ceil(viewport.height),
    });
    page.cleanup();
  }
  await doc.destroy();
  return out;
}

/* ---------------- canvas plumbing ---------------- */

type AnyCanvas = OffscreenCanvas | HTMLCanvasElement;

/**
 * Pick the canvas by execution context, not by feature detection.
 *
 * This used to prefer OffscreenCanvas whenever the constructor existed — which, on
 * the main thread, is always. These ops run on the main thread today (there is no
 * worker pool for PDF), and pdf.js's rendering path is far better trodden against a
 * real <canvas>. An OffscreenCanvas here left page.render() pending forever: no
 * error, no rejection, just a progress bar stuck on page 1.
 *
 * `document` is the honest test for "am I on the main thread". Inside a worker there
 * is no document and OffscreenCanvas is the only option — which is exactly when it
 * should be used.
 */
export function makeCanvas(w: number, h: number): { canvas: AnyCanvas; ctx: unknown } {
  if (typeof document === 'undefined') {
    const canvas = new OffscreenCanvas(w, h);
    return { canvas, ctx: canvas.getContext('2d') };
  }
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  return { canvas, ctx: canvas.getContext('2d') };
}

export type RasterMime = 'image/jpeg' | 'image/png';

export async function toBlob(canvas: AnyCanvas, quality: number, mime: RasterMime = 'image/jpeg'): Promise<Blob> {
  if ('convertToBlob' in canvas) {
    return canvas.convertToBlob({ type: mime, quality });
  }
  return new Promise((resolve, reject) =>
    (canvas as HTMLCanvasElement).toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Canvas export failed'))),
      mime,
      quality,
    ),
  );
}

async function toJpeg(canvas: AnyCanvas, quality: number): Promise<ArrayBuffer> {
  return (await toBlob(canvas, quality)).arrayBuffer();
}

/**
 * Rasterise every page to an image — the engine behind pdf-to-jpg and pdf-to-png.
 *
 * Separate from renderPageToJpeg, which exists to feed raster compression back into
 * a PDF and is JPEG by definition (embedJpg). This one is about handing the user
 * images, so it takes the format.
 */
export async function rasterizePages(
  buf: ArrayBuffer,
  opts: RasterOptions & { mime?: RasterMime },
  onPage?: (i: number, n: number) => void,
): Promise<Array<{ page: number; bytes: ArrayBuffer; mime: RasterMime }>> {
  const mime = opts.mime ?? 'image/jpeg';
  const doc = await openPdfDocument(buf);
  const scale = opts.dpi / PT_PER_INCH;
  const out: Array<{ page: number; bytes: ArrayBuffer; mime: RasterMime }> = [];

  for (let i = 1; i <= doc.numPages; i++) {
    onPage?.(i, doc.numPages);
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale });
    const { canvas, ctx } = makeCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
    await renderPage(page, ctx, viewport, i);
    // PNG ignores the quality argument — it is lossless.
    out.push({ page: i, bytes: await (await toBlob(canvas, opts.quality, mime)).arrayBuffer(), mime });
    page.cleanup();
  }
  await doc.destroy();
  return out;
}
