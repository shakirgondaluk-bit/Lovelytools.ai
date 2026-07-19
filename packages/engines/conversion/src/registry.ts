// lovelytools.ai — Conversion Engine · slug → capability map.
//
// Unlike the PDF/video/audio bindings, every tool here is a single fixed direction
// (word-to-pdf is always docx→pdf, never a target picker) — the registry.prepare()
// call just needs the target FormatId; source is auto-detected from magic bytes.
//
// coverage.test.ts asserts this and the registry agree in both directions, the same
// contract as every other engine's binding.
import type { FormatId } from './types';

export interface ConversionToolBinding {
  /** Output format. Source is auto-detected — never trust the extension. */
  to: FormatId;
  /** `accept` for the dropzone. Hand-written per tool, not derived from FormatId,
   *  because a source extension can be broader than what a specific tool means —
   *  markdown-to-pdf should offer .md, not every .txt/.log/.text variant that also
   *  detects as the same underlying `txt` format. */
  accept: string;
  /** Verb on the run button, e.g. "Convert to PDF". */
  action: string;
}

const PDF_ACCEPT = 'application/pdf,.pdf';
const DOCX_ACCEPT =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document,.docx';
const XLSX_ACCEPT =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,.xlsx,.xls';
const PPTX_ACCEPT =
  'application/vnd.openxmlformats-officedocument.presentationml.presentation,.pptx';
const HTML_ACCEPT = 'text/html,.html,.htm';
const MARKDOWN_ACCEPT = 'text/markdown,text/x-markdown,.md,.markdown';

export const CONVERSION_TOOLS: Record<string, ConversionToolBinding> = {
  'markdown-to-pdf': { to: 'pdf', accept: MARKDOWN_ACCEPT, action: 'Convert to PDF' },
  'html-to-pdf': { to: 'pdf', accept: HTML_ACCEPT, action: 'Convert to PDF' },
  'word-to-pdf': { to: 'pdf', accept: DOCX_ACCEPT, action: 'Convert to PDF' },
  'excel-to-pdf': { to: 'pdf', accept: XLSX_ACCEPT, action: 'Convert to PDF' },
  'powerpoint-to-pdf': { to: 'pdf', accept: PPTX_ACCEPT, action: 'Convert to PDF' },
  'pdf-to-word': { to: 'docx', accept: PDF_ACCEPT, action: 'Convert to Word' },
  'pdf-to-powerpoint': { to: 'pptx', accept: PDF_ACCEPT, action: 'Convert to PowerPoint' },
};

/**
 * Conversion-engine tools that need a capability the engine doesn't have.
 *
 * pdf-to-excel is the one entry, and it earned its place here the way the PDF
 * engine's OCR gap did — by checking the actual route graph rather than assuming
 * the registry entry implied working code. `planRoute('pdf', 'xlsx')` returns null:
 * the doc IR that `pdf` feeds never produces `xlsx`, and the table IR that produces
 * `xlsx` has no `pdf` producer. pdfToDoc() extracts paragraphs and headings, not
 * cell grids — there is no code anywhere that reads tabular structure out of a PDF.
 * That is a real, nontrivial capability (position-clustering text into rows and
 * columns), not a wiring gap, so it is declared rather than guessed at.
 */
export const CONVERSION_NOT_IMPLEMENTED: Record<string, string> = {
  'pdf-to-excel':
    'needs table-structure extraction from PDF text positions — nothing in the engine reads cell grids out of a PDF, only paragraphs and headings',
};

export const conversionToolSlugs = (): string[] => Object.keys(CONVERSION_TOOLS);

export const bindingFor = (slug: string): ConversionToolBinding | undefined =>
  CONVERSION_TOOLS[slug];

export const notImplementedReason = (slug: string): string | undefined =>
  CONVERSION_NOT_IMPLEMENTED[slug];
