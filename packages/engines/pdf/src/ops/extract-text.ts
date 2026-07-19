// lovelytools.ai — per-page text extraction (search, word counts, TXT export).
import { openPdfDocument } from '../pdfjs';
import {
  checkCancelled,
  outName,
  type OpContext,
  type PdfInput,
  type PdfOpResult,
} from '../types';

export interface PageText {
  page: number; // 1-based
  text: string;
}

export async function extractText(input: PdfInput, ctx: OpContext): Promise<PageText[]> {
  const doc = await openPdfDocument(input.buf);
  const out: PageText[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    checkCancelled(ctx);
    ctx.progress(Math.round((i / doc.numPages) * 95), `Reading page ${i} of ${doc.numPages}`);
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const text = (content.items as Array<{ str: string; hasEOL?: boolean }>)
      .map((it) => it.str + (it.hasEOL ? '\n' : ''))
      .join(' ')
      .replace(/[ \t]+/g, ' ')
      .trim();
    out.push({ page: i, text });
  }
  await doc.destroy();
  return out;
}

/** "PDF to TXT" tool — extraction packaged as a downloadable result. */
export async function extractTextAsFile(input: PdfInput, ctx: OpContext): Promise<PdfOpResult> {
  // Measured before the buffer is handed to pdf.js — see the note in pdfjs.ts.
  const bytesIn = input.buf.byteLength;
  const pages = await extractText(input, ctx);
  const empty = pages.filter((p) => p.text.length === 0).length;
  const text = pages.map((p) => p.text).join('\n\n\f\n\n');
  const bytes = new TextEncoder().encode(text);
  const warnings: string[] = [];
  if (empty === pages.length) {
    warnings.push('No selectable text found — this looks like a scanned PDF. OCR is coming to the Scan tools.');
  } else if (empty > 0) {
    warnings.push(`${empty} page${empty === 1 ? ' has' : 's have'} no selectable text (likely scanned images).`);
  }
  return {
    files: [{ bytes, name: outName(input.name, '', 'txt'), mime: 'text/plain' }],
    fidelity: empty > 0 ? 'text-only' : 'high',
    warnings,
    stats: { pagesIn: pages.length, pagesOut: pages.length, bytesIn, bytesOut: bytes.byteLength },
  };
}
