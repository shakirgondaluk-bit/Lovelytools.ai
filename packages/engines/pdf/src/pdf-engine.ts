// lovelytools.ai — PDF Engine facade. Validates inputs against plan limits,
// dispatches to ops, normalizes errors. Ops are pure and worker-safe; run them
// through the shared WorkerPool for heavy files or directly for quick ones.
// These lived in the old flat engine/types.ts; under the RFC-001 package layout the
// shared engine contract is @lovelytools/engines-core.
import { FREE_LIMITS, type EngineLimits } from '@lovelytools/engines-core';
import { compare, type CompareOptions } from './ops/compare';
import { compress } from './ops/compress';
import { crop, type CropOptions } from './ops/crop';
import { extractTextAsFile } from './ops/extract-text';
import { fillForm, flatten, readFormFields, type FillFormOptions } from './ops/forms';
import { imagesToPdf } from './ops/images-to-pdf';
import { merge } from './ops/merge';
import { readMetadata, stripMetadata, writeMetadata } from './ops/metadata';
import { ocr, type OcrOptions } from './ops/ocr';
import { organize, extractPages } from './ops/organize';
import { pageNumbers } from './ops/page-numbers';
import { rasterize, type RasterizeOptions } from './ops/rasterize';
import { redact, type RedactOptions } from './ops/redact';
import { rotate } from './ops/rotate';
import { protect, unlock, type ProtectOptions, type UnlockOptions } from './ops/security';
import { sign, type SignOptions } from './ops/sign';
import { split } from './ops/split';
import { watermark } from './ops/watermark';
import {
  PdfError,
  type CompressOptions,
  type ImagesToPdfOptions,
  type MergeSource,
  type OpContext,
  type OrganizeAction,
  type PageNumberOptions,
  type PdfInput,
  type PdfMetadata,
  type PdfOpResult,
  type RotationDeg,
  type SplitMode,
  type WatermarkOptions,
} from './types';

export * from './types';
export { renderThumbnails } from './render';
export { readMetadata, readFormFields };
export type {
  CompareOptions,
  CropOptions,
  FillFormOptions,
  OcrOptions,
  ProtectOptions,
  RasterizeOptions,
  RedactOptions,
  SignOptions,
  UnlockOptions,
};
export type { FormField, FormFieldKind } from './ops/forms';

type ProgressFn = (pct: number, stage: string) => void;

export class PdfEngine {
  constructor(private limits: EngineLimits = FREE_LIMITS) {}

  private ctx(onProgress: ProgressFn, signal?: AbortSignal): { ctx: OpContext; warnings: string[] } {
    const warnings: string[] = [];
    return {
      warnings,
      ctx: { progress: onProgress, signal, warn: (m) => warnings.push(m) },
    };
  }

  private check(files: Array<{ name: string; buf: ArrayBuffer }>): void {
    if (files.length > this.limits.maxFiles) {
      throw new PdfError('too-many-files', `That's ${files.length} files — the limit is ${this.limits.maxFiles}. Pro raises it to 200.`);
    }
    for (const f of files) {
      if (f.buf.byteLength > this.limits.maxBytesPerFile) {
        throw new PdfError('too-large', `${f.name} is over ${Math.round(this.limits.maxBytesPerFile / 1048576)} MB. Pro raises the limit to 2 GB.`);
      }
    }
  }

  private async run(
    files: PdfInput[],
    onProgress: ProgressFn,
    signal: AbortSignal | undefined,
    op: (ctx: OpContext) => Promise<PdfOpResult>,
  ): Promise<PdfOpResult> {
    this.check(files);
    const { ctx, warnings } = this.ctx(onProgress, signal);
    const result = await op(ctx);
    result.warnings.push(...warnings);
    onProgress(100, 'Done');
    return result;
  }

  merge(sources: MergeSource[], onProgress: ProgressFn, signal?: AbortSignal) {
    return this.run(sources.map((s) => s.input), onProgress, signal, (ctx) => merge(sources, ctx));
  }

  split(input: PdfInput, mode: SplitMode, onProgress: ProgressFn, signal?: AbortSignal) {
    return this.run([input], onProgress, signal, (ctx) => split(input, mode, ctx));
  }

  organize(input: PdfInput, action: OrganizeAction, onProgress: ProgressFn, signal?: AbortSignal) {
    return this.run([input], onProgress, signal, (ctx) => organize(input, action, ctx));
  }

  extractPages(input: PdfInput, range: string, onProgress: ProgressFn, signal?: AbortSignal) {
    return this.run([input], onProgress, signal, (ctx) => extractPages(input, range, ctx));
  }

  rotate(input: PdfInput, by: RotationDeg, onProgress: ProgressFn, range?: string, signal?: AbortSignal) {
    return this.run([input], onProgress, signal, (ctx) => rotate(input, by, ctx, range));
  }

  compress(input: PdfInput, opts: CompressOptions, onProgress: ProgressFn, signal?: AbortSignal) {
    return this.run([input], onProgress, signal, (ctx) => compress(input, opts, ctx));
  }

  watermark(input: PdfInput, opts: WatermarkOptions, onProgress: ProgressFn, signal?: AbortSignal) {
    return this.run([input], onProgress, signal, (ctx) => watermark(input, opts, ctx));
  }

  pageNumbers(input: PdfInput, opts: PageNumberOptions, onProgress: ProgressFn, signal?: AbortSignal) {
    return this.run([input], onProgress, signal, (ctx) => pageNumbers(input, opts, ctx));
  }

  writeMetadata(input: PdfInput, meta: PdfMetadata, onProgress: ProgressFn, signal?: AbortSignal) {
    return this.run([input], onProgress, signal, (ctx) => writeMetadata(input, meta, ctx));
  }

  stripMetadata(input: PdfInput, onProgress: ProgressFn, signal?: AbortSignal) {
    return this.run([input], onProgress, signal, (ctx) => stripMetadata(input, ctx));
  }

  imagesToPdf(images: PdfInput[], opts: ImagesToPdfOptions, onProgress: ProgressFn, signal?: AbortSignal) {
    return this.run(images, onProgress, signal, (ctx) => imagesToPdf(images, opts, ctx));
  }

  extractText(input: PdfInput, onProgress: ProgressFn, signal?: AbortSignal) {
    return this.run([input], onProgress, signal, (ctx) => extractTextAsFile(input, ctx));
  }

  /** PDF → page images (pdf-to-jpg, pdf-to-png). */
  rasterize(input: PdfInput, opts: RasterizeOptions, onProgress: ProgressFn, signal?: AbortSignal) {
    return this.run([input], onProgress, signal, (ctx) => rasterize(input, opts, ctx));
  }

  /** Trim a margin off every page (crop-pdf). */
  crop(input: PdfInput, opts: CropOptions, onProgress: ProgressFn, signal?: AbortSignal) {
    return this.run([input], onProgress, signal, (ctx) => crop(input, opts, ctx));
  }

  /** Bake form fields into the page (flatten-pdf). */
  flatten(input: PdfInput, onProgress: ProgressFn, signal?: AbortSignal) {
    return this.run([input], onProgress, signal, (ctx) => flatten(input, ctx));
  }

  /** Fill AcroForm fields (fill-pdf-form). */
  fillForm(input: PdfInput, opts: FillFormOptions, onProgress: ProgressFn, signal?: AbortSignal) {
    return this.run([input], onProgress, signal, (ctx) => fillForm(input, opts, ctx));
  }

  /** Password-protect (protect-pdf). The only op backed by @cantoo/pdf-lib. */
  protect(input: PdfInput, opts: ProtectOptions, onProgress: ProgressFn, signal?: AbortSignal) {
    return this.run([input], onProgress, signal, (ctx) => protect(input, opts, ctx));
  }

  /** Remove a password you already know (unlock-pdf). */
  unlock(input: PdfInput, opts: UnlockOptions, onProgress: ProgressFn, signal?: AbortSignal) {
    return this.run([input], onProgress, signal, (ctx) => unlock(input, opts, ctx));
  }

  /** Stamp a visible signature image — not a cryptographic signature (sign-pdf). */
  sign(input: PdfInput, opts: SignOptions, onProgress: ProgressFn, signal?: AbortSignal) {
    return this.run([input], onProgress, signal, (ctx) => sign(input, opts, ctx));
  }

  /** Remove text for real, by flattening the page (redact-pdf). */
  redact(input: PdfInput, opts: RedactOptions, onProgress: ProgressFn, signal?: AbortSignal) {
    return this.run([input], onProgress, signal, (ctx) => redact(input, opts, ctx));
  }

  /** Diff the text of two documents (compare-pdf). */
  compare(input: PdfInput, opts: CompareOptions, onProgress: ProgressFn, signal?: AbortSignal) {
    return this.run([input, opts.other], onProgress, signal, (ctx) => compare(input, opts, ctx));
  }

  /** Read a scan into text (ocr-pdf). */
  ocr(input: PdfInput, opts: OcrOptions, onProgress: ProgressFn, signal?: AbortSignal) {
    return this.run([input], onProgress, signal, (ctx) => ocr(input, opts, ctx));
  }
}
