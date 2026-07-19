// lovelytools.ai — crop (rect, bounds-checked) and transform (rotate/flip).
import { draw, encode, makeCanvas } from '../raster';
import {
  checkCancelled,
  ImageError,
  outName,
  type CropRect,
  type DecodedImage,
  type EncodeOptions,
  type FlipAxis,
  type ImageOpResult,
  type OpContext,
  type RotateDeg,
} from '../types';

export async function crop(
  input: DecodedImage,
  rect: CropRect,
  enc: EncodeOptions,
  ctx: OpContext,
): Promise<ImageOpResult> {
  const { width: sw, height: sh } = input;
  const x = Math.round(rect.x);
  const y = Math.round(rect.y);
  const w = Math.round(rect.width);
  const h = Math.round(rect.height);
  if (w < 1 || h < 1 || x < 0 || y < 0 || x + w > sw || y + h > sh) {
    throw new ImageError('invalid-options', `Crop area falls outside the image (${sw}×${sh}).`);
  }

  checkCancelled(ctx);
  ctx.progress(40, 'Cropping');
  const { canvas, g } = makeCanvas(w, h);
  if (enc.format === 'jpeg') {
    g.fillStyle = enc.background ?? '#ffffff';
    g.fillRect(0, 0, w, h);
  }
  g.drawImage(input.bitmap, x, y, w, h, 0, 0, w, h);

  ctx.progress(80, 'Encoding');
  const blob = await encode(canvas, enc);
  return {
    files: [{ blob, name: outName(input.name, '-cropped', enc.format), width: w, height: h }],
    fidelity: 'high',
    warnings: [],
    stats: { widthIn: sw, heightIn: sh, widthOut: w, heightOut: h, bytesIn: input.sourceBytes, bytesOut: blob.size },
  };
}

export async function rotateImage(
  input: DecodedImage,
  by: RotateDeg,
  enc: EncodeOptions,
  ctx: OpContext,
): Promise<ImageOpResult> {
  const { width: sw, height: sh } = input;
  const swap = by !== 180;
  const w = swap ? sh : sw;
  const h = swap ? sw : sh;

  checkCancelled(ctx);
  ctx.progress(40, 'Rotating');
  const { canvas, g } = makeCanvas(w, h);
  if (enc.format === 'jpeg') {
    g.fillStyle = enc.background ?? '#ffffff';
    g.fillRect(0, 0, w, h);
  }
  g.translate(w / 2, h / 2);
  g.rotate((by * Math.PI) / 180);
  g.drawImage(input.bitmap, -sw / 2, -sh / 2);

  ctx.progress(80, 'Encoding');
  const blob = await encode(canvas, enc);
  return {
    files: [{ blob, name: outName(input.name, '-rotated', enc.format), width: w, height: h }],
    fidelity: 'high',
    warnings: [],
    stats: { widthIn: sw, heightIn: sh, widthOut: w, heightOut: h, bytesIn: input.sourceBytes, bytesOut: blob.size },
  };
}

export async function flip(
  input: DecodedImage,
  axis: FlipAxis,
  enc: EncodeOptions,
  ctx: OpContext,
): Promise<ImageOpResult> {
  const { width: w, height: h } = input;
  checkCancelled(ctx);
  ctx.progress(40, 'Flipping');
  const { canvas, g } = makeCanvas(w, h);
  if (enc.format === 'jpeg') {
    g.fillStyle = enc.background ?? '#ffffff';
    g.fillRect(0, 0, w, h);
  }
  g.translate(axis === 'horizontal' ? w : 0, axis === 'vertical' ? h : 0);
  g.scale(axis === 'horizontal' ? -1 : 1, axis === 'vertical' ? -1 : 1);
  g.drawImage(input.bitmap, 0, 0);

  ctx.progress(80, 'Encoding');
  const blob = await encode(canvas, enc);
  return {
    files: [{ blob, name: outName(input.name, '-flipped', enc.format), width: w, height: h }],
    fidelity: 'high',
    warnings: [],
    stats: { widthIn: w, heightIn: h, widthOut: w, heightOut: h, bytesIn: input.sourceBytes, bytesOut: blob.size },
  };
}
