// lovelytools.ai — Image Engine facade: validate → decode once → op → result.
// These lived in the old flat engine/types.ts; under the RFC-001 package layout the
// shared engine contract is @lovelytools/engines-core.
import { FREE_LIMITS, type EngineLimits } from '@lovelytools/engines-core';
import { decodeImage } from './decode';
import { adjust, watermarkImage } from './ops/adjust';
import { keepOriginal, toBase64 } from './ops/base64';
import { removeBackground } from './ops/background-remove';
import { compress, convert } from './ops/convert';
import { encodeIco, type IcoOptions } from './ops/ico';
import { memeCaption } from './ops/meme';
import { pixelate } from './ops/pixelate';
import { resize } from './ops/resize';
import { stripMetadata } from './ops/strip-metadata';
import { crop, flip, rotateImage } from './ops/transform';
import {
  ImageError,
  type AdjustOptions,
  type BackgroundRemoveOptions,
  type CompressOptions,
  type CropRect,
  type DecodedImage,
  type EncodeOptions,
  type FlipAxis,
  type ImageOpResult,
  type ImageWatermarkOptions,
  type MemeOptions,
  type OpContext,
  type PixelateOptions,
  type ResizeOptions,
  type RotateDeg,
} from './types';

export * from './types';
export { capabilities } from './capabilities';
export { decodeImage } from './decode';

type ProgressFn = (pct: number, stage: string) => void;

export class ImageEngine {
  constructor(private limits: EngineLimits = FREE_LIMITS) {}

  /** Decode + validate a batch. Bitmaps are reused across chained ops. */
  async open(files: File[]): Promise<DecodedImage[]> {
    if (files.length > this.limits.maxFiles) {
      throw new ImageError('too-many-files', `That's ${files.length} files — the limit is ${this.limits.maxFiles}. Pro raises it to 200.`);
    }
    for (const f of files) {
      if (f.size > this.limits.maxBytesPerFile) {
        throw new ImageError('too-large', `${f.name} is over ${Math.round(this.limits.maxBytesPerFile / 1048576)} MB. Pro raises the limit to 2 GB.`);
      }
    }
    return Promise.all(files.map(decodeImage));
  }

  /** Release bitmaps when a tool page unmounts. */
  close(images: DecodedImage[]): void {
    for (const img of images) img.bitmap.close();
  }

  private async run(
    onProgress: ProgressFn,
    signal: AbortSignal | undefined,
    op: (ctx: OpContext) => Promise<ImageOpResult>,
  ): Promise<ImageOpResult> {
    const warnings: string[] = [];
    const ctx: OpContext = { progress: onProgress, signal, warn: (m) => warnings.push(m) };
    const result = await op(ctx);
    result.warnings.push(...warnings);
    onProgress(100, 'Done');
    return result;
  }

  resize(img: DecodedImage, opts: ResizeOptions & { encode: EncodeOptions }, onP: ProgressFn, signal?: AbortSignal) {
    return this.run(onP, signal, (ctx) => resize(img, opts, ctx));
  }

  crop(img: DecodedImage, rect: CropRect, enc: EncodeOptions, onP: ProgressFn, signal?: AbortSignal) {
    return this.run(onP, signal, (ctx) => crop(img, rect, enc, ctx));
  }

  rotate(img: DecodedImage, by: RotateDeg, enc: EncodeOptions, onP: ProgressFn, signal?: AbortSignal) {
    return this.run(onP, signal, (ctx) => rotateImage(img, by, enc, ctx));
  }

  flip(img: DecodedImage, axis: FlipAxis, enc: EncodeOptions, onP: ProgressFn, signal?: AbortSignal) {
    return this.run(onP, signal, (ctx) => flip(img, axis, enc, ctx));
  }

  convert(img: DecodedImage, enc: EncodeOptions, onP: ProgressFn, signal?: AbortSignal) {
    return this.run(onP, signal, (ctx) => convert(img, enc, ctx));
  }

  compress(img: DecodedImage, opts: CompressOptions, onP: ProgressFn, signal?: AbortSignal, original?: File) {
    return this.run(onP, signal, async (ctx) => {
      const result = await compress(img, opts, ctx);
      // "Never ship a bigger file" — ops only see pixels, so the facade swaps
      // the original bytes back in when compression didn't help.
      const keepIdx = result.warnings.findIndex((w) => w.startsWith('KEEP_ORIGINAL'));
      if (keepIdx >= 0 && original) {
        result.warnings[keepIdx] = 'The original was already smaller — kept unchanged.';
        result.files = [{ blob: original, name: original.name, width: img.width, height: img.height }];
        result.stats.bytesOut = original.size;
      }
      return result;
    });
  }

  adjust(img: DecodedImage, opts: AdjustOptions, enc: EncodeOptions, onP: ProgressFn, signal?: AbortSignal) {
    return this.run(onP, signal, (ctx) => adjust(img, opts, enc, ctx));
  }

  watermark(img: DecodedImage, opts: ImageWatermarkOptions, enc: EncodeOptions, onP: ProgressFn, signal?: AbortSignal) {
    return this.run(onP, signal, (ctx) => watermarkImage(img, opts, enc, ctx));
  }

  stripMetadata(img: DecodedImage, enc: EncodeOptions, onP: ProgressFn, signal?: AbortSignal) {
    return this.run(onP, signal, (ctx) => stripMetadata(img, enc, ctx));
  }

  removeBackground(img: DecodedImage, opts: BackgroundRemoveOptions, onP: ProgressFn, signal?: AbortSignal) {
    return this.run(onP, signal, (ctx) => removeBackground(img, opts, ctx));
  }

  pixelate(img: DecodedImage, opts: PixelateOptions, enc: EncodeOptions, onP: ProgressFn, signal?: AbortSignal) {
    return this.run(onP, signal, (ctx) => pixelate(img, opts, enc, ctx));
  }

  meme(img: DecodedImage, opts: MemeOptions, enc: EncodeOptions, onP: ProgressFn, signal?: AbortSignal) {
    return this.run(onP, signal, (ctx) => memeCaption(img, opts, enc, ctx));
  }

  ico(img: DecodedImage, opts: IcoOptions, onP: ProgressFn, signal?: AbortSignal) {
    return this.run(onP, signal, (ctx) => encodeIco(img, opts, ctx));
  }

  /** image-to-base64: encodes the ORIGINAL file bytes, never the re-decoded pixels. */
  toBase64(img: DecodedImage, original: Blob, onP: ProgressFn, signal?: AbortSignal) {
    return this.run(onP, signal, (ctx) => toBase64(img, original, ctx));
  }

  /** base64-to-image: `original` is the Blob built from the pasted text — handed back unchanged. */
  fromBase64(img: DecodedImage, original: Blob, onP: ProgressFn, signal?: AbortSignal) {
    return this.run(onP, signal, (ctx) => keepOriginal(img, original, ctx));
  }
}
