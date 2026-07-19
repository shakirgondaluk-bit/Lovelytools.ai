// lovelytools.ai — the one place pdf.js gets loaded, configured and handed a document.
//
// pdf.js needs three things pointed at real URLs, and it fails differently for each:
//
//   workerSrc           — without it, every call throws
//                         `No "GlobalWorkerOptions.workerSrc" specified` immediately.
//   standardFontDataUrl — without it, PARSING still works but RENDERING a page that
//                         uses one of the 14 standard fonts (Helvetica, Times…) never
//                         resolves. That asymmetry is nasty: pdf-to-text passes, and
//                         pdf-to-jpg hangs forever at the first page with no error.
//   cMapUrl             — without it, CJK and other encoded text extracts as mojibake.
//
// Four call sites each did a bare `await import('pdfjs-dist')` and configured none of
// it. Hence this module: pdf.js is a singleton, so it gets configured exactly once,
// here, and nothing else is allowed to open a document.
//
// All three are self-hosted, like the ffmpeg cores. pdf.js's docs suggest a CDN; for
// a product whose whole promise is that nothing about your file leaves the machine,
// a CDN that learns which of our visitors opened a PDF tool is close enough to the
// line to stay well behind it.
//
// tooling/wasm-build stages and content-hashes these; next.config.ts bakes the
// manifest in at build time.
import type { PDFDocumentProxy } from 'pdfjs-dist';

type PdfjsModule = typeof import('pdfjs-dist');

const WASM_BASE =
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_WASM_BASE) || '/wasm';

const MANIFEST: Record<string, string> = (() => {
  try {
    return JSON.parse(process.env.NEXT_PUBLIC_WASM_MANIFEST || '{}');
  } catch {
    return {};
  }
})();

/**
 * Absolute, for the same reason ffmpeg's classWorkerURL is: a root-relative path can
 * resolve against a bundler's file:// base and blow up inside a Worker constructor.
 * The trailing slash matters — pdf.js concatenates a filename onto these.
 */
function assetUrl(path: string): string {
  const dir = MANIFEST['pdfjs'];
  if (!dir) {
    throw new Error('The PDF worker is missing from this build. Run `pnpm install` to stage it.');
  }
  const base = typeof location !== 'undefined' ? location.href : 'http://localhost/';
  return new URL(`${WASM_BASE}/${dir}/${path}`, base).href;
}

let cached: Promise<PdfjsModule> | null = null;

/** Imports pdf.js and points it at the self-hosted worker. Idempotent. */
export function loadPdfjs(): Promise<PdfjsModule> {
  cached ??= (async () => {
    const pdfjs = await import('pdfjs-dist');
    if (!pdfjs.GlobalWorkerOptions.workerSrc) {
      pdfjs.GlobalWorkerOptions.workerSrc = assetUrl('pdf.worker.min.mjs');
    }
    return pdfjs;
  })();
  return cached;
}

/**
 * Opens a document with every asset URL pdf.js needs. Use this rather than calling
 * getDocument directly — a call site that forgets one of these produces a hang, not
 * an error.
 *
 * The caller's buffer is copied, and that is not defensive padding.
 *
 * pdf.js TRANSFERS the buffer it is handed to its worker, which DETACHES it in this
 * thread. Every byte of the caller's ArrayBuffer is gone the moment getDocument is
 * called, and the two ways that surfaces are both bad:
 *
 *   · `new Uint8Array(detached)` throws "Cannot perform Construct on a detached
 *     ArrayBuffer" — which is at least loud. compress-pdf hit this returning the
 *     original after deciding rasterising wasn't worth it.
 *   · `detached.byteLength` silently returns 0 — which is worse. Every op reading
 *     input.buf.byteLength for its stats AFTER rendering was reporting bytesIn: 0,
 *     i.e. "100% smaller" on a file that had not shrunk at all.
 *
 * Copying here fixes all five call sites at once and keeps the transfer an
 * implementation detail of this module, which is where it belongs. The cost is one
 * duplicate of bytes the user already has in memory.
 */
export async function openPdfDocument(data: ArrayBuffer): Promise<PDFDocumentProxy> {
  const pdfjs = await loadPdfjs();
  return pdfjs.getDocument({
    // slice(0) is a copy, not a view — pdf.js may detach this one freely.
    data: data.slice(0),
    // Never let pdf.js fetch anything itself; it gets every URL explicitly.
    useWorkerFetch: false,
    standardFontDataUrl: assetUrl('standard_fonts/'),
    cMapUrl: assetUrl('cmaps/'),
    cMapPacked: true,
    // Draw glyphs as vector paths instead of registering FontFace objects on the
    // document.
    //
    // Not a performance knob — a correctness one. pdf.js's default path installs
    // each embedded font into document.fonts and waits on the FontFaceSet before it
    // will paint. In this app that wait never returns: page.render() stays pending
    // forever, with no error, no rejection and no network request to point at. It
    // cost an afternoon to find, because getPage() and getTextContent() are fine —
    // only rendering touches fonts, so pdf-to-text passed while pdf-to-jpg hung.
    //
    // Path glyphs render identically for our purposes and depend on nothing outside
    // the canvas.
    disableFontFace: true,
  }).promise;
}
