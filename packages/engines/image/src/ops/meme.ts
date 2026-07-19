// lovelytools.ai — meme captions: classic top/bottom impact-style text
// (white fill, black stroke, uppercase, auto-shrunk to fit the width).
import { encode, makeCanvas } from '../raster';
import {
  checkCancelled,
  outName,
  type DecodedImage,
  type EncodeOptions,
  type ImageOpResult,
  type MemeOptions,
  type OpContext,
} from '../types';

export async function memeCaption(
  input: DecodedImage,
  opts: MemeOptions,
  enc: EncodeOptions,
  ctx: OpContext,
): Promise<ImageOpResult> {
  checkCancelled(ctx);
  const { width: w, height: h } = input;
  const { canvas, g } = makeCanvas(w, h);
  if (enc.format === 'jpeg') {
    g.fillStyle = enc.background ?? '#ffffff';
    g.fillRect(0, 0, w, h);
  }
  g.drawImage(input.bitmap, 0, 0);

  ctx.progress(50, 'Stamping captions');
  const pad = Math.round(w * 0.04);
  if (opts.topText.trim()) drawCaption(g, opts.topText, w, pad + fitSize(g, opts.topText, w) * 0.8);
  if (opts.bottomText.trim()) drawCaption(g, opts.bottomText, w, h - pad);

  ctx.progress(80, 'Encoding');
  const blob = await encode(canvas, enc);
  return {
    files: [{ blob, name: outName(input.name, '-meme', enc.format), width: w, height: h }],
    fidelity: 'high',
    warnings: [],
    stats: { widthIn: w, heightIn: h, widthOut: w, heightOut: h, bytesIn: input.sourceBytes, bytesOut: blob.size },
  };
}

/** Biggest size (capped ~13% of width) that keeps the (uppercased) text on one line. */
function fitSize(g: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, text: string, w: number): number {
  const max = Math.round(w * 0.13);
  let size = max;
  while (size > 12) {
    g.font = `900 ${size}px Impact, 'Arial Black', sans-serif`;
    if (g.measureText(text.toUpperCase()).width <= w * 0.92) break;
    size -= 2;
  }
  return size;
}

function drawCaption(
  g: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  text: string,
  w: number,
  baselineY: number,
): void {
  const upper = text.toUpperCase();
  const size = fitSize(g, upper, w);
  g.font = `900 ${size}px Impact, 'Arial Black', sans-serif`;
  g.textAlign = 'center';
  g.lineWidth = Math.max(2, size * 0.08);
  g.strokeStyle = '#000';
  g.fillStyle = '#fff';
  g.strokeText(upper, w / 2, baselineY);
  g.fillText(upper, w / 2, baselineY);
}
