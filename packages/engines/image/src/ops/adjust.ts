// lovelytools.ai — adjust (brightness/contrast/saturation/hue/grayscale via
// the canvas filter pipeline) and text watermark.
import { encode, makeCanvas } from '../raster';
import {
  checkCancelled,
  outName,
  type AdjustOptions,
  type DecodedImage,
  type EncodeOptions,
  type ImageOpResult,
  type ImageWatermarkOptions,
  type OpContext,
  type WatermarkAnchor,
} from '../types';

export async function adjust(
  input: DecodedImage,
  opts: AdjustOptions,
  enc: EncodeOptions,
  ctx: OpContext,
): Promise<ImageOpResult> {
  checkCancelled(ctx);
  ctx.progress(30, 'Applying adjustments');
  const { canvas, g } = makeCanvas(input.width, input.height);
  if (enc.format === 'jpeg') {
    g.fillStyle = enc.background ?? '#ffffff';
    g.fillRect(0, 0, input.width, input.height);
  }
  g.filter = [
    opts.brightness !== undefined ? `brightness(${opts.brightness})` : '',
    opts.contrast !== undefined ? `contrast(${opts.contrast})` : '',
    opts.saturation !== undefined ? `saturate(${opts.saturation})` : '',
    opts.hueRotate !== undefined ? `hue-rotate(${opts.hueRotate}deg)` : '',
    opts.grayscale !== undefined ? `grayscale(${opts.grayscale})` : '',
    opts.blur !== undefined ? `blur(${opts.blur}px)` : '',
  ].filter(Boolean).join(' ') || 'none';
  g.drawImage(input.bitmap, 0, 0);

  ctx.progress(75, 'Encoding');
  const blob = await encode(canvas, enc);
  return {
    files: [{ blob, name: outName(input.name, '-adjusted', enc.format), width: input.width, height: input.height }],
    fidelity: 'high',
    warnings: [],
    stats: stats(input, blob.size),
  };
}

export async function watermarkImage(
  input: DecodedImage,
  opts: ImageWatermarkOptions,
  enc: EncodeOptions,
  ctx: OpContext,
): Promise<ImageOpResult> {
  checkCancelled(ctx);
  ctx.progress(30, 'Stamping');
  const { width: w, height: h } = input;
  const { canvas, g } = makeCanvas(w, h);
  if (enc.format === 'jpeg') {
    g.fillStyle = enc.background ?? '#ffffff';
    g.fillRect(0, 0, w, h);
  }
  g.drawImage(input.bitmap, 0, 0);

  const size = Math.max(12, Math.round(w * opts.fontScale));
  g.font = `600 ${size}px 'Space Grotesk', sans-serif`;
  g.fillStyle = opts.color;
  g.globalAlpha = opts.opacity;
  const tw = g.measureText(opts.text).width;
  const pad = Math.round(size * 0.9);

  if (opts.anchor === 'tile') {
    g.save();
    g.rotate((-30 * Math.PI) / 180);
    for (let y = -h; y < h * 2; y += size * 5) {
      for (let x = -w; x < w * 2; x += tw + size * 4) {
        g.fillText(opts.text, x, y);
      }
    }
    g.restore();
  } else {
    // Typed as [x, y] tuples rather than number[]: destructuring a tuple gives two
    // numbers, where arr[0] on a plain array would be number | undefined.
    const pos: Record<Exclude<WatermarkAnchor, 'tile'>, [number, number]> = {
      'center': [(w - tw) / 2, h / 2 + size / 3],
      'top-left': [pad, pad + size],
      'top-right': [w - tw - pad, pad + size],
      'bottom-left': [pad, h - pad],
      'bottom-right': [w - tw - pad, h - pad],
    };
    const [x, y] = pos[opts.anchor];
    g.fillText(opts.text, x, y);
  }
  g.globalAlpha = 1;

  ctx.progress(75, 'Encoding');
  const blob = await encode(canvas, enc);
  return {
    files: [{ blob, name: outName(input.name, '-watermarked', enc.format), width: w, height: h }],
    fidelity: 'high',
    warnings: [],
    stats: stats(input, blob.size),
  };
}

function stats(input: DecodedImage, bytesOut: number) {
  return {
    widthIn: input.width,
    heightIn: input.height,
    widthOut: input.width,
    heightOut: input.height,
    bytesIn: input.sourceBytes,
    bytesOut,
  };
}
