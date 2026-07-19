// lovelytools.ai — resize: fit / fill / exact / long-edge / scale.
// Stepped half-downscale for quality; refuses silent upscales.
import { draw, encode, steppedDownscale } from '../raster';
import {
  checkCancelled,
  ImageError,
  outName,
  type DecodedImage,
  type EncodeOptions,
  type ImageOpResult,
  type OpContext,
  type ResizeOptions,
} from '../types';

export async function resize(
  input: DecodedImage,
  opts: ResizeOptions & { encode: EncodeOptions },
  ctx: OpContext,
): Promise<ImageOpResult> {
  const { width: sw, height: sh } = input;
  const target = computeTarget(sw, sh, opts);

  if (!opts.upscale && (target.w > sw || target.h > sh)) {
    ctx.warn(`Kept at ${sw}×${sh} — upscaling would only blur it. Toggle "allow upscale" to force.`);
    target.w = Math.min(target.w, sw);
    target.h = Math.min(target.h, sh);
  }

  checkCancelled(ctx);
  ctx.progress(25, 'Resampling');
  const pre = await steppedDownscale(input.bitmap, target.w, target.h);

  ctx.progress(60, 'Compositing');
  let canvas;
  if (opts.mode.kind === 'fill') {
    // cover + center-crop
    const scale = Math.max(target.w / pre.width, target.h / pre.height);
    const dw = pre.width * scale;
    const dh = pre.height * scale;
    const out = draw(pre, target.w, target.h, opts.encode.format, opts.encode.background);
    out.g.drawImage(pre, (target.w - dw) / 2, (target.h - dh) / 2, dw, dh);
    canvas = out.canvas;
  } else {
    canvas = draw(pre, target.w, target.h, opts.encode.format, opts.encode.background).canvas;
  }
  if (pre !== input.bitmap) pre.close();

  ctx.progress(85, 'Encoding');
  const blob = await encode(canvas, opts.encode);
  return {
    files: [{ blob, name: outName(input.name, `-${target.w}x${target.h}`, opts.encode.format), width: target.w, height: target.h }],
    fidelity: 'high',
    warnings: [],
    stats: { widthIn: sw, heightIn: sh, widthOut: target.w, heightOut: target.h, bytesIn: input.sourceBytes, bytesOut: blob.size },
  };
}

function computeTarget(sw: number, sh: number, opts: ResizeOptions): { w: number; h: number } {
  const m = opts.mode;
  switch (m.kind) {
    case 'exact':
      return { w: m.width, h: m.height };
    case 'fill':
      return { w: m.width, h: m.height };
    case 'fit': {
      const scale = Math.min(m.width / sw, m.height / sh);
      return { w: Math.max(1, Math.round(sw * scale)), h: Math.max(1, Math.round(sh * scale)) };
    }
    case 'long-edge': {
      const scale = m.px / Math.max(sw, sh);
      return { w: Math.max(1, Math.round(sw * scale)), h: Math.max(1, Math.round(sh * scale)) };
    }
    case 'scale': {
      if (m.factor <= 0 || m.factor > 4) throw new ImageError('invalid-options', 'Scale must be between 0 and 4×.');
      return { w: Math.max(1, Math.round(sw * m.factor)), h: Math.max(1, Math.round(sh * m.factor)) };
    }
  }
}
