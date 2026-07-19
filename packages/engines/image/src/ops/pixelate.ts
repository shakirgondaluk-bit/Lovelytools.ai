// lovelytools.ai — pixelate: downscale to a mosaic grid, then blow it back up
// with smoothing off so each grid cell reads as one flat block. Pure canvas —
// no new dependency, same trick browsers use for "pixelated" CSS images.
import { encode, makeCanvas } from '../raster';
import {
  checkCancelled,
  outName,
  type DecodedImage,
  type EncodeOptions,
  type ImageOpResult,
  type OpContext,
  type PixelateOptions,
} from '../types';

export async function pixelate(
  input: DecodedImage,
  opts: PixelateOptions,
  enc: EncodeOptions,
  ctx: OpContext,
): Promise<ImageOpResult> {
  checkCancelled(ctx);
  const { width: w, height: h } = input;
  const block = Math.max(1, Math.round(opts.blockSize));
  const smallW = Math.max(1, Math.round(w / block));
  const smallH = Math.max(1, Math.round(h / block));

  ctx.progress(30, 'Mosaicking');
  const small = makeCanvas(smallW, smallH);
  small.g.imageSmoothingEnabled = true;
  small.g.drawImage(input.bitmap, 0, 0, smallW, smallH);

  const { canvas, g } = makeCanvas(w, h);
  if (enc.format === 'jpeg') {
    g.fillStyle = enc.background ?? '#ffffff';
    g.fillRect(0, 0, w, h);
  }
  g.imageSmoothingEnabled = false;
  g.drawImage(small.canvas, 0, 0, w, h);

  ctx.progress(75, 'Encoding');
  const blob = await encode(canvas, enc);
  return {
    files: [{ blob, name: outName(input.name, '-pixelated', enc.format), width: w, height: h }],
    fidelity: 'good',
    warnings: [],
    stats: {
      widthIn: w,
      heightIn: h,
      widthOut: w,
      heightOut: h,
      bytesIn: input.sourceBytes,
      bytesOut: blob.size,
    },
  };
}
