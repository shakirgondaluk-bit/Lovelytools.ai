// lovelytools.ai — convert (straight re-encode) and compress (target-size
// binary search over quality). Compress never ships a bigger file.
import { draw, encode } from '../raster';
import {
  checkCancelled,
  ImageError,
  outName,
  type CompressOptions,
  type DecodedImage,
  type EncodeOptions,
  type ImageFormat,
  type ImageOpResult,
  type OpContext,
} from '../types';

export async function convert(
  input: DecodedImage,
  enc: EncodeOptions,
  ctx: OpContext,
): Promise<ImageOpResult> {
  checkCancelled(ctx);
  if (input.sourceFormat === enc.format) {
    ctx.warn(`${input.name} is already ${enc.format.toUpperCase()} — re-encoded anyway (strips metadata).`);
  }
  ctx.progress(35, 'Converting');
  const { canvas } = draw(input.bitmap, input.width, input.height, enc.format, enc.background);
  ctx.progress(75, 'Encoding');
  const blob = await encode(canvas, enc);
  const warnings: string[] = [];
  if (input.sourceFormat === 'gif') {
    warnings.push('Animated GIFs convert as their first frame — animation isn\u2019t carried over.');
  }
  if (enc.format === 'jpeg' && (input.sourceFormat === 'png' || input.sourceFormat === 'webp')) {
    warnings.push('JPEG has no transparency — transparent areas were flattened to the background color.');
  }
  return {
    files: [{ blob, name: outName(input.name, '', enc.format), width: input.width, height: input.height }],
    fidelity: 'high',
    warnings,
    stats: sameDims(input, blob.size),
  };
}

export async function compress(
  input: DecodedImage,
  opts: CompressOptions,
  ctx: OpContext,
): Promise<ImageOpResult> {
  if (opts.targetBytes < 1024) throw new ImageError('invalid-options', 'Target size must be at least 1 KB.');
  const format: ImageFormat =
    opts.format ?? (input.sourceFormat === 'png' ? 'webp' : input.sourceFormat === 'jpeg' ? 'jpeg' : 'webp');
  const minQ = opts.minQuality ?? 0.35;

  const { canvas } = draw(input.bitmap, input.width, input.height, format);

  // Binary search quality → target size. ~6 encodes lands within a few %.
  let lo = minQ;
  let hi = 0.98;
  let best: Blob | null = null;
  for (let i = 0; i < 6; i++) {
    checkCancelled(ctx);
    const q = (lo + hi) / 2;
    ctx.progress(10 + i * 14, `Trying quality ${(q * 100).toFixed(0)}%`);
    const attempt = await encode(canvas, { format, quality: q });
    if (attempt.size <= opts.targetBytes) {
      best = attempt;
      lo = q; // room to raise quality
    } else {
      hi = q;
    }
  }

  const warnings: string[] = [];
  const out = best ?? (await encode(canvas, { format, quality: minQ }));
  if (!best && out.size > opts.targetBytes) {
    warnings.push(
      `Couldn't reach ${fmtBytes(opts.targetBytes)} without wrecking quality — this is the smallest clean version (${fmtBytes(out.size)}). Try resizing first.`,
    );
  }
  // Never ship a bigger file: the facade re-attaches the ORIGINAL bytes when
  // bytesOut >= bytesIn (ops only see pixels, so signal via warning + stats).
  if (out.size >= input.sourceBytes) {
    warnings.push('KEEP_ORIGINAL: the original was already smaller — the engine returns it unchanged.');
  }

  return {
    files: [{ blob: out, name: outName(input.name, '-compressed', format), width: input.width, height: input.height }],
    fidelity: 'high',
    warnings,
    stats: sameDims(input, out.size),
  };
}

function sameDims(input: DecodedImage, bytesOut: number) {
  return {
    widthIn: input.width,
    heightIn: input.height,
    widthOut: input.width,
    heightOut: input.height,
    bytesIn: input.sourceBytes,
    bytesOut,
  };
}

function fmtBytes(n: number): string {
  return n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.round(n / 1024)} KB`;
}
