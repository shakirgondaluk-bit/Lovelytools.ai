// lovelytools.ai — PDF Engine · shared contracts
export type PdfFidelity = 'high' | 'text-only';

export type PdfErrorCode =
  | 'password-protected'
  | 'corrupt-file'
  | 'not-a-pdf'
  | 'empty-range'
  | 'invalid-range'
  | 'too-large'
  | 'too-many-files'
  | 'cancelled'
  | 'grew-larger'
  | 'internal';

export class PdfError extends Error {
  constructor(
    public code: PdfErrorCode,
    /** Friendly, actionable — shown verbatim in the UI (DS §12). */
    message: string,
  ) {
    super(message);
    this.name = 'PdfError';
  }
}

export interface PdfInput {
  buf: ArrayBuffer;
  name: string;
}

export interface OpContext {
  /** Real progress only — per page / per file, never simulated. */
  progress: (pct: number, stage: string) => void;
  signal?: AbortSignal;
  /** Non-fatal caveats surfaced before download. */
  warn: (msg: string) => void;
}

export interface OutputFile {
  bytes: Uint8Array;
  name: string;
  mime: string; // application/pdf | text/plain
}

export interface PdfOpStats {
  pagesIn: number;
  pagesOut: number;
  bytesIn: number;
  bytesOut: number;
}

export interface PdfOpResult {
  files: OutputFile[];
  fidelity: PdfFidelity;
  warnings: string[];
  stats: PdfOpStats;
}

/* ---------------- page ranges ---------------- */

/** "1-3,7,12-" → zero-based page indices. Bounds-checked against pageCount. */
export function parsePageRange(spec: string, pageCount: number): number[] {
  const out: number[] = [];
  for (const part of spec.split(',').map((s) => s.trim()).filter(Boolean)) {
    const m = /^(\d+)?\s*-\s*(\d+)?$|^(\d+)$/.exec(part);
    if (!m) throw new PdfError('invalid-range', `"${part}" isn't a page range. Try "1-3, 7, 12-".`);
    if (m[3]) {
      pushPage(out, +m[3], pageCount, part);
    } else {
      const start = m[1] ? +m[1] : 1;
      const end = m[2] ? +m[2] : pageCount;
      if (start > end) throw new PdfError('invalid-range', `"${part}" is backwards — start after end.`);
      for (let p = start; p <= end; p++) pushPage(out, p, pageCount, part);
    }
  }
  if (out.length === 0) throw new PdfError('empty-range', 'No pages selected.');
  return [...new Set(out)];
}

function pushPage(out: number[], oneBased: number, pageCount: number, part: string): void {
  if (oneBased < 1 || oneBased > pageCount) {
    throw new PdfError('invalid-range', `Page ${oneBased} doesn't exist — this PDF has ${pageCount} page${pageCount === 1 ? '' : 's'}.`);
  }
  out.push(oneBased - 1);
}

/* ---------------- shared option types ---------------- */

export type RotationDeg = 90 | 180 | 270;

export interface MergeSource {
  input: PdfInput;
  /** Optional 1-based range spec ("1-3,7"). Omit for all pages. */
  range?: string;
}

export type SplitMode =
  | { kind: 'ranges'; specs: string[] } // one output per spec
  | { kind: 'every'; n: number } // chunks of n pages
  | { kind: 'single' }; // one file per page

export interface CompressOptions {
  mode: 'lossless' | 'raster';
  /** raster mode only */
  dpi?: number; // default 120
  quality?: number; // 0–1, default 0.7
}

export type WatermarkPosition = 'center' | 'diagonal' | 'tile';

export interface WatermarkOptions {
  text: string;
  position: WatermarkPosition;
  opacity: number; // 0–1
  fontSize: number;
  color: { r: number; g: number; b: number }; // 0–1 each
  range?: string;
}

export type NumberPosition =
  | 'bottom-center' | 'bottom-left' | 'bottom-right'
  | 'top-center' | 'top-left' | 'top-right';

export interface PageNumberOptions {
  /** "{n}" and "{total}" placeholders, e.g. "Page {n} of {total}". */
  template: string;
  position: NumberPosition;
  fontSize: number;
  startAt: number; // first printed number
  range?: string; // which pages get numbers
}

export interface PdfMetadata {
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string[];
  creator?: string;
}

export type ImageFit = 'fit' | 'fill' | 'actual';

export interface ImagesToPdfOptions {
  pageSize: 'a4' | 'letter' | 'auto'; // auto = each page sized to its image
  orientation: 'portrait' | 'landscape';
  marginPt: number;
  fit: ImageFit;
}

export interface OrganizeAction {
  /** New page order as zero-based indices of the source; omissions delete, repeats duplicate. */
  order: number[];
}

/* ---------------- helpers ---------------- */

export function checkCancelled(ctx: OpContext): void {
  if (ctx.signal?.aborted) throw new PdfError('cancelled', 'Cancelled.');
}

export function outName(base: string, suffix: string, ext = 'pdf'): string {
  return `${base.replace(/\.pdf$/i, '')}${suffix}.${ext}`;
}
