// lovelytools.ai — OCR a scanned PDF into selectable text.
//
// RFC-001 §3 specifies tesseract-wasm for the PDF engine and nobody ever added it.
// This is the one tool in the set that was genuinely missing a capability rather than
// a wire-up.
//
// tesseract.js is self-hosted — worker, WASM core and language data all served from
// our own origin, like the ffmpeg cores and the pdf.js worker. Its defaults fetch all
// three from a CDN, which for this product is the one thing that cannot happen: a
// scanned PDF is a passport or a payslip, and a CDN learning that you OCR'd one today
// is exactly the leak the whole architecture exists to prevent. The bytes would stay
// here; the fact of it would not.
import { createWorker } from 'tesseract.js';
import { rasterizePages } from '../render';
import { checkCancelled, outName, PdfError, type OpContext, type PdfInput, type PdfOpResult } from '../types';

const WASM_BASE =
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_WASM_BASE) || '/wasm';

const MANIFEST: Record<string, string> = (() => {
  try {
    return JSON.parse(process.env.NEXT_PUBLIC_WASM_MANIFEST || '{}');
  } catch {
    return {};
  }
})();

function assetBase(): string {
  const dir = MANIFEST['tesseract'];
  if (!dir) {
    throw new PdfError(
      'internal',
      'The OCR engine is missing from this build. Run `pnpm install` to stage it.',
    );
  }
  const base = typeof location !== 'undefined' ? location.href : 'http://localhost/';
  return new URL(`${WASM_BASE}/${dir}`, base).href;
}

export interface OcrOptions {
  /** Tesseract language code. 'eng' is the only one staged by default. */
  lang?: string;
  /** Render resolution fed to the recogniser. */
  dpi?: number;
}

export async function ocr(input: PdfInput, opts: OcrOptions, ctx: OpContext): Promise<PdfOpResult> {
  const bytesIn = input.buf.byteLength;
  const lang = opts.lang ?? 'eng';
  // 300dpi is the resolution Tesseract is tuned for. 150 halves the time and visibly
  // costs accuracy on small print, which is the print that matters on a scan.
  const dpi = opts.dpi ?? 300;
  const base = assetBase();

  ctx.progress(2, 'Rendering pages for OCR');
  const pages = await rasterizePages(input.buf, { dpi, quality: 0.92, mime: 'image/png' }, (i, n) => {
    checkCancelled(ctx);
    ctx.progress(2 + Math.round((i / n) * 28), `Rendering page ${i} of ${n}`);
  });

  if (pages.length === 0) throw new PdfError('corrupt-file', 'That PDF has no pages to read.');

  ctx.progress(32, 'Starting the OCR engine');
  const worker = await createWorker(lang, undefined, {
    workerPath: `${base}/worker.min.js`,
    corePath: `${base}/core`,
    langPath: `${base}/lang`,
    // The language data is ~10 MB. Cached by the browser after the first run, and
    // never fetched from anyone else's server.
    cacheMethod: 'none',
    logger: () => {},
  });

  try {
    const out: string[] = [];
    for (const [i, page] of pages.entries()) {
      checkCancelled(ctx);
      ctx.progress(35 + Math.round((i / pages.length) * 58), `Reading page ${i + 1} of ${pages.length}`);
      const { data } = await worker.recognize(new Blob([page.bytes as BlobPart], { type: page.mime }));
      out.push(data.text.trim());
    }

    const text = out.join('\n\n\f\n\n');
    const bytes = new TextEncoder().encode(text);
    const empty = out.filter((t) => t.length === 0).length;

    const warnings = [
      'OCR is a guess, not a transcription — check anything that matters, especially numbers.',
    ];
    if (empty > 0) {
      warnings.push(
        `${empty} page${empty === 1 ? '' : 's'} produced no text. Faint, skewed or handwritten scans defeat it.`,
      );
    }

    ctx.progress(100, 'Done');
    return {
      files: [{ bytes, name: outName(input.name, '-ocr', 'txt'), mime: 'text/plain' }],
      fidelity: 'text-only',
      warnings,
      stats: { pagesIn: pages.length, pagesOut: pages.length, bytesIn, bytesOut: bytes.byteLength },
    };
  } finally {
    // The worker holds a WASM heap and ~10 MB of language data. Leaking one per run
    // would end the session in a few documents.
    await worker.terminate();
  }
}
