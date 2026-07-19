// lovelytools.ai — PDF Engine · slug → capability map.
//
// The registry says a tool runs on the `pdf` engine; this says which op, what the UI
// must collect first, and with what defaults. coverage.test.ts asserts this and the
// registry agree in both directions.

import type { CropOptions } from './ops/crop';
import type { OcrOptions } from './ops/ocr';
import type { RasterizeOptions } from './ops/rasterize';
import type { RedactOptions } from './ops/redact';
import type { SignOptions } from './ops/sign';
import type {
  CompressOptions,
  ImagesToPdfOptions,
  PageNumberOptions,
  RotationDeg,
  WatermarkOptions,
} from './types';

export type PdfCapability =
  | 'pdf.merge'
  | 'pdf.split'
  | 'pdf.compress'
  | 'pdf.rotate'
  | 'pdf.organize'
  | 'pdf.delete-pages'
  | 'pdf.extract-pages'
  | 'pdf.watermark'
  | 'pdf.page-numbers'
  | 'pdf.metadata'
  | 'pdf.extract-text'
  | 'pdf.images-to-pdf'
  | 'pdf.rasterize'
  | 'pdf.crop'
  | 'pdf.flatten'
  | 'pdf.fill-form'
  | 'pdf.protect'
  | 'pdf.unlock'
  | 'pdf.sign'
  | 'pdf.redact'
  | 'pdf.compare'
  | 'pdf.ocr';

/** What the tool page has to ask for before it can run. */
export type PdfControl =
  | { kind: 'none' }
  | { kind: 'range'; label: string; placeholder: string; hint?: string }
  | { kind: 'order'; label: string; placeholder: string; hint?: string }
  | { kind: 'text'; label: string; placeholder: string; hint?: string }
  /** Masked input. Never logged, never sent — see ops/security.ts. */
  | { kind: 'password'; label: string; placeholder: string; hint?: string; optional?: boolean }
  | { kind: 'number'; label: string; placeholder: string; hint?: string; min: number; max: number; step?: number }
  /** A second file: the signature image, or the document to compare against. */
  | { kind: 'second-file'; label: string; accept: string; hint?: string }
  /** Fields read out of the PDF itself, rendered as a form. */
  | { kind: 'form-fields'; label: string; hint?: string };

interface BindingBase {
  /** 'single' takes one file; 'multi' takes several (merge, images-to-pdf). */
  arity: 'single' | 'multi';
  /** File types the dropzone accepts. */
  accept: string;
  control: PdfControl;
  /** Verb on the run button, e.g. "Merge PDFs". */
  action: string;
}

/**
 * Discriminated on capability so each tool's options are the op's real option type.
 *
 * A single `options?: Record<string, unknown>` would be less code and would let a
 * typo like `{ quality: 0.7 }` on a lossless compress sail through to a silently
 * wrong result. The whole point of the binding is that it cannot lie about the op.
 *
 * Options the user supplies (watermark text, number template) are omitted here —
 * the control collects those, and the runner merges them in.
 */
export type PdfToolBinding = BindingBase &
  (
    | { capability: 'pdf.merge' }
    | { capability: 'pdf.split' }
    | { capability: 'pdf.extract-pages' }
    | { capability: 'pdf.delete-pages' }
    | { capability: 'pdf.organize' }
    | { capability: 'pdf.metadata' }
    | { capability: 'pdf.extract-text' }
    | { capability: 'pdf.rotate'; options: { by: RotationDeg } }
    | { capability: 'pdf.compress'; options: CompressOptions }
    | { capability: 'pdf.watermark'; options: Omit<WatermarkOptions, 'text'> }
    | { capability: 'pdf.page-numbers'; options: Omit<PageNumberOptions, 'template'> }
    | { capability: 'pdf.rasterize'; options: RasterizeOptions }
    | { capability: 'pdf.images-to-pdf'; options: ImagesToPdfOptions }
    | { capability: 'pdf.flatten' }
    | { capability: 'pdf.unlock' }
    | { capability: 'pdf.protect' }
    | { capability: 'pdf.compare' }
    | { capability: 'pdf.fill-form' }
    | { capability: 'pdf.crop'; options: Omit<CropOptions, 'marginPt'> }
    | { capability: 'pdf.redact'; options: Omit<RedactOptions, 'find'> }
    | { capability: 'pdf.sign'; options: Omit<SignOptions, 'image' | 'imageName'> }
    | { capability: 'pdf.ocr'; options: OcrOptions }
  );

const PDF_ACCEPT = 'application/pdf,.pdf';
const IMAGE_ACCEPT = 'image/jpeg,image/png,.jpg,.jpeg,.png';

export const PDF_TOOLS: Record<string, PdfToolBinding> = {
  // ── Assemble ───────────────────────────────────────────────────────────────
  'merge-pdf': {
    capability: 'pdf.merge',
    arity: 'multi',
    accept: PDF_ACCEPT,
    control: { kind: 'none' },
    action: 'Merge PDFs',
  },
  'split-pdf': {
    capability: 'pdf.split',
    arity: 'single',
    accept: PDF_ACCEPT,
    control: {
      kind: 'range',
      label: 'Split into these ranges',
      placeholder: '1-3, 4-6, 7-',
      hint: 'One output file per range. Leave empty to split every page into its own file.',
    },
    action: 'Split PDF',
  },
  'extract-pdf-pages': {
    capability: 'pdf.extract-pages',
    arity: 'single',
    accept: PDF_ACCEPT,
    control: {
      kind: 'range',
      label: 'Pages to keep',
      placeholder: '1-3, 7, 12-',
      hint: 'Everything else is dropped.',
    },
    action: 'Extract pages',
  },
  'delete-pdf-pages': {
    capability: 'pdf.delete-pages',
    arity: 'single',
    accept: PDF_ACCEPT,
    control: {
      kind: 'range',
      label: 'Pages to remove',
      placeholder: '2, 5-7',
      hint: 'Everything else is kept, in its original order.',
    },
    action: 'Delete pages',
  },
  'organize-pdf': {
    capability: 'pdf.organize',
    arity: 'single',
    accept: PDF_ACCEPT,
    control: {
      kind: 'order',
      label: 'New page order',
      placeholder: '3, 1, 2, 2',
      hint: 'Omit a page to delete it; repeat one to duplicate it.',
    },
    action: 'Organize PDF',
  },
  'reorder-pdf-pages': {
    capability: 'pdf.organize',
    arity: 'single',
    accept: PDF_ACCEPT,
    control: {
      kind: 'order',
      label: 'New page order',
      placeholder: '3, 1, 2',
      hint: 'List every page in the order you want it.',
    },
    action: 'Reorder pages',
  },
  'rotate-pdf': {
    capability: 'pdf.rotate',
    arity: 'single',
    accept: PDF_ACCEPT,
    control: { kind: 'none' },
    action: 'Rotate 90°',
    options: { by: 90 },
  },

  // ── Optimise ───────────────────────────────────────────────────────────────
  'compress-pdf': {
    capability: 'pdf.compress',
    arity: 'single',
    accept: PDF_ACCEPT,
    control: { kind: 'none' },
    action: 'Compress PDF',
    // Raster re-renders each page as an image: big savings on scans, and it drops
    // the text layer, which the op warns about.
    options: { mode: 'raster', dpi: 120, quality: 0.7 },
  },
  'optimize-pdf': {
    capability: 'pdf.compress',
    arity: 'single',
    accept: PDF_ACCEPT,
    control: { kind: 'none' },
    action: 'Optimize PDF',
    // Lossless: rewrites the object streams, keeps text selectable.
    options: { mode: 'lossless' },
  },

  // ── Annotate ───────────────────────────────────────────────────────────────
  'add-watermark-pdf': {
    capability: 'pdf.watermark',
    arity: 'single',
    accept: PDF_ACCEPT,
    control: { kind: 'text', label: 'Watermark text', placeholder: 'CONFIDENTIAL' },
    action: 'Add watermark',
    options: { position: 'diagonal', opacity: 0.18, fontSize: 48, color: { r: 0, g: 0, b: 0 } },
  },
  'add-page-numbers': {
    capability: 'pdf.page-numbers',
    arity: 'single',
    accept: PDF_ACCEPT,
    control: {
      kind: 'text',
      label: 'Number format',
      placeholder: 'Page {n} of {total}',
      hint: '{n} is the page number, {total} the page count.',
    },
    action: 'Add page numbers',
    options: { position: 'bottom-center', fontSize: 10, startAt: 1 },
  },
  'edit-pdf-metadata': {
    capability: 'pdf.metadata',
    arity: 'single',
    accept: PDF_ACCEPT,
    control: { kind: 'text', label: 'Title', placeholder: 'Document title' },
    action: 'Update metadata',
  },

  // ── Convert ────────────────────────────────────────────────────────────────
  'pdf-to-text': {
    capability: 'pdf.extract-text',
    arity: 'single',
    accept: PDF_ACCEPT,
    control: { kind: 'none' },
    action: 'Extract text',
  },
  'pdf-to-jpg': {
    capability: 'pdf.rasterize',
    arity: 'single',
    accept: PDF_ACCEPT,
    control: { kind: 'none' },
    action: 'Convert to JPG',
    options: { mime: 'image/jpeg', dpi: 150, quality: 0.85 },
  },
  'pdf-to-png': {
    capability: 'pdf.rasterize',
    arity: 'single',
    accept: PDF_ACCEPT,
    control: { kind: 'none' },
    action: 'Convert to PNG',
    options: { mime: 'image/png', dpi: 150 },
  },
  'jpg-to-pdf': {
    capability: 'pdf.images-to-pdf',
    arity: 'multi',
    accept: IMAGE_ACCEPT,
    control: { kind: 'none' },
    action: 'Convert to PDF',
    options: { pageSize: 'auto', orientation: 'portrait', marginPt: 0, fit: 'fit' },
  },
  'png-to-pdf': {
    capability: 'pdf.images-to-pdf',
    arity: 'multi',
    accept: IMAGE_ACCEPT,
    control: { kind: 'none' },
    action: 'Convert to PDF',
    options: { pageSize: 'auto', orientation: 'portrait', marginPt: 0, fit: 'fit' },
  },
  'image-to-pdf': {
    capability: 'pdf.images-to-pdf',
    arity: 'multi',
    accept: IMAGE_ACCEPT,
    control: { kind: 'none' },
    action: 'Convert to PDF',
    options: { pageSize: 'a4', orientation: 'portrait', marginPt: 24, fit: 'fit' },
  },

  // ── Pages ──────────────────────────────────────────────────────────────────
  'crop-pdf': {
    capability: 'pdf.crop',
    arity: 'single',
    accept: PDF_ACCEPT,
    control: {
      kind: 'number',
      label: 'Trim from each edge',
      placeholder: '36',
      hint: 'In points — 72pt is one inch.',
      min: 1,
      max: 300,
      step: 1,
    },
    action: 'Crop PDF',
    options: {},
  },

  // ── Forms ──────────────────────────────────────────────────────────────────
  'fill-pdf-form': {
    capability: 'pdf.fill-form',
    arity: 'single',
    accept: PDF_ACCEPT,
    control: {
      kind: 'form-fields',
      label: 'Form fields',
      hint: 'Read straight out of the document. Leave a field alone to keep its current value.',
    },
    action: 'Fill form',
  },
  'flatten-pdf': {
    capability: 'pdf.flatten',
    arity: 'single',
    accept: PDF_ACCEPT,
    control: { kind: 'none' },
    action: 'Flatten PDF',
  },

  // ── Security ───────────────────────────────────────────────────────────────
  'protect-pdf': {
    capability: 'pdf.protect',
    arity: 'single',
    accept: PDF_ACCEPT,
    control: {
      kind: 'password',
      label: 'Password',
      placeholder: 'Choose a password',
      hint: 'Set on your device and never sent anywhere. We cannot recover it for you.',
    },
    action: 'Protect PDF',
  },
  'unlock-pdf': {
    capability: 'pdf.unlock',
    arity: 'single',
    accept: PDF_ACCEPT,
    control: {
      kind: 'password',
      label: 'Current password',
      placeholder: 'The password it opens with',
      hint: 'Leave empty if the PDF opens without one but blocks editing.',
      optional: true,
    },
    action: 'Remove password',
  },
  'sign-pdf': {
    capability: 'pdf.sign',
    arity: 'single',
    accept: PDF_ACCEPT,
    control: {
      kind: 'second-file',
      label: 'Signature image',
      accept: 'image/png,image/jpeg,.png,.jpg,.jpeg',
      hint: 'A PNG with a transparent background looks best. Placed bottom-right on the last page.',
    },
    action: 'Sign PDF',
    options: { position: 'bottom-right', widthPt: 160 },
  },
  'redact-pdf': {
    capability: 'pdf.redact',
    arity: 'single',
    accept: PDF_ACCEPT,
    control: {
      kind: 'text',
      label: 'Text to remove',
      placeholder: 'A name, a number, an address',
      hint: 'Every text run containing this is blacked out and the page is flattened, so the text is genuinely gone — not just covered.',
    },
    action: 'Redact PDF',
    options: { dpi: 150 },
  },

  // ── Read ───────────────────────────────────────────────────────────────────
  'ocr-pdf': {
    capability: 'pdf.ocr',
    arity: 'single',
    accept: PDF_ACCEPT,
    control: { kind: 'none' },
    action: 'Read text from scan',
    options: { lang: 'eng', dpi: 300 },
  },
  'compare-pdf': {
    capability: 'pdf.compare',
    arity: 'single',
    accept: PDF_ACCEPT,
    control: {
      kind: 'second-file',
      label: 'Compare against',
      accept: PDF_ACCEPT,
      hint: 'The second document. Only text is compared, not layout.',
    },
    action: 'Compare PDFs',
  },
};

/**
 * PDF-engine tools that need a capability the engine doesn't have.
 *
 * Empty, and worth keeping empty. This list once held all nine of the tools above,
 * and seven of those entries were simply wrong — pdf-lib had shipped setCropBox,
 * form.flatten(), getFields() and ignoreEncryption the whole time, and "unbuildable"
 * meant "not looked up". Only two needed anything new: tesseract.js for OCR
 * (RFC-001 §3 specified it and nobody added it) and @cantoo/pdf-lib for encryption,
 * which stock pdf-lib genuinely cannot write.
 *
 * The mechanism stays because the honesty is worth having: a tool page reads this
 * and explains itself rather than showing a dropzone that does nothing. Add an entry
 * only after checking that the library really can't do it.
 */
export const PDF_NOT_IMPLEMENTED: Record<string, string> = {};

export const pdfToolSlugs = (): string[] => Object.keys(PDF_TOOLS);

export const bindingFor = (slug: string): PdfToolBinding | undefined => PDF_TOOLS[slug];

export const notImplementedReason = (slug: string): string | undefined => PDF_NOT_IMPLEMENTED[slug];
