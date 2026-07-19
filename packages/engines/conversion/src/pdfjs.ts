// lovelytools.ai — pdf.js loader for the conversion engine.
//
// This engine, unlike @lovelytools/engine-pdf, opens PDFs from inside its OWN
// worker (worker-pool.ts fans jobs across up to 4 of them) — pdf.js is asked to
// spawn a worker from within a worker, and its own source has a bug in exactly
// that situation:
//
// `PDFWorker._initialize()` builds its same-origin check from `window.location`.
// Inside a dedicated Worker, `window` doesn't exist, so that line throws, is
// swallowed by pdf.js's own try/catch, and it falls back to "fake worker" mode —
// which loads pdf.worker.min.mjs via a same-thread dynamic `import()` rather than
// `new Worker()`. That file's top-level code has its own environment check:
// `typeof window === "undefined" && typeof self.postMessage === "function"`,
// meant to detect "I was loaded as a real worker's entry script" — true on a
// genuine top-level worker, but ALSO true here, because we're already inside
// one. So it self-installs pdf.js's worker protocol directly onto OUR worker's
// `self`, hijacking our own postMessage channel: pdf.js's internal "ready"
// handshake goes out to our real main thread, lands in worker-pool.ts's
// onMessage, and gets misread as our own job failing — with an empty message,
// since the stray payload has no `code`/`message` fields.
//
// The fix is to stop the fallback from ever triggering: polyfill `self.window`
// before pdf.js's same-origin check runs, so `window.location.href` resolves (a
// Worker's `self.location` is real) and `_initialize()` succeeds down its normal
// path — a genuine nested `new Worker()` with its own untouched message channel.
//
// This runs unconditionally rather than behind `typeof window === 'undefined'`:
// Next.js's client webpack build constant-folds that check to `false` for every
// browser-targeted chunk (worker chunks included — it has no notion of "worker"
// vs "main thread", only "server" vs "client"), so a guarded version of this line
// gets dead-code-eliminated before it ever reaches the browser. Unconditional is
// also correct on the main thread: `window.window === window` is already true by
// spec, so this is a no-op there.
(self as unknown as { window: typeof self }).window = self;

import type { PDFDocumentProxy } from 'pdfjs-dist';

type PdfjsModule = typeof import('pdfjs-dist');

const WASM_BASE = (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_WASM_BASE) || '/wasm';

const MANIFEST: Record<string, string> = (() => {
  try {
    return JSON.parse(process.env.NEXT_PUBLIC_WASM_MANIFEST || '{}');
  } catch {
    return {};
  }
})();

function assetUrl(path: string): string {
  const dir = MANIFEST['pdfjs'];
  if (!dir) {
    throw new Error('The PDF worker is missing from this build. Run `pnpm install` to stage it.');
  }
  const base = typeof location !== 'undefined' ? location.href : 'http://localhost/';
  return new URL(`${WASM_BASE}/${dir}/${path}`, base).href;
}

let cached: Promise<PdfjsModule> | null = null;

function loadPdfjs(): Promise<PdfjsModule> {
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
 * getDocument directly — see @lovelytools/engine-pdf's pdfjs.ts for why a call site
 * that forgets one of these produces a hang or a throw, not a clean result.
 *
 * The buffer is copied: pdf.js transfers (detaches) whatever ArrayBuffer it's
 * handed to its worker, and this engine's caller still needs `buf` intact — the
 * detection step upstream reads it before this function is ever called, but a
 * detached buffer would corrupt any future call reusing the same job.
 */
export async function openPdfDocument(data: ArrayBuffer): Promise<PDFDocumentProxy> {
  const pdfjs = await loadPdfjs();
  return pdfjs.getDocument({
    data: data.slice(0),
    useWorkerFetch: false,
    standardFontDataUrl: assetUrl('standard_fonts/'),
    cMapUrl: assetUrl('cmaps/'),
    cMapPacked: true,
    disableFontFace: true,
  }).promise;
}
