// lovelytools.ai — shared canvas + encode plumbing for image ops.
import { capabilities } from './capabilities';
import { ImageError, MIME, type EncodeOptions, type ImageFormat } from './types';

export type AnyCanvas = OffscreenCanvas | HTMLCanvasElement;
export type Any2D = OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D;

export function makeCanvas(w: number, h: number): { canvas: AnyCanvas; g: Any2D } {
  if (typeof OffscreenCanvas !== 'undefined') {
    const canvas = new OffscreenCanvas(w, h);
    return { canvas, g: canvas.getContext('2d') as Any2D };
  }
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  return { canvas, g: canvas.getContext('2d') as Any2D };
}

export async function encode(canvas: AnyCanvas, opts: EncodeOptions): Promise<Blob> {
  const caps = await capabilities();
  if (!caps.encode[opts.format]) {
    throw new ImageError(
      'encoder-unavailable',
      `This browser can't write ${opts.format.toUpperCase()} — pick WebP or JPEG instead.`,
    );
  }
  const type = MIME[opts.format];
  const quality = opts.format === 'png' ? undefined : (opts.quality ?? 0.85);
  if ('convertToBlob' in canvas) {
    return canvas.convertToBlob({ type, quality });
  }
  return new Promise((resolve, reject) =>
    (canvas as HTMLCanvasElement).toBlob(
      (b) => (b ? resolve(b) : reject(new ImageError('internal', 'Encoding failed.'))),
      type,
      quality,
    ),
  );
}

/** Draw a bitmap onto a fresh canvas, flattening alpha for JPEG targets. */
export function draw(
  bitmap: ImageBitmap,
  w: number,
  h: number,
  format: ImageFormat,
  background = '#ffffff',
): { canvas: AnyCanvas; g: Any2D } {
  const { canvas, g } = makeCanvas(w, h);
  if (format === 'jpeg') {
    g.fillStyle = background;
    g.fillRect(0, 0, w, h);
  }
  g.imageSmoothingEnabled = true;
  g.imageSmoothingQuality = 'high';
  g.drawImage(bitmap, 0, 0, w, h);
  return { canvas, g };
}

/**
 * High-quality downscale: repeated half-steps until <2× target, then final
 * draw. Avoids the aliasing you get from a single big drawImage jump.
 */
export async function steppedDownscale(
  bitmap: ImageBitmap,
  targetW: number,
  targetH: number,
): Promise<ImageBitmap> {
  let cur = bitmap;
  let w = bitmap.width;
  let h = bitmap.height;
  while (w / 2 >= targetW * 2 && h / 2 >= targetH * 2) {
    w = Math.round(w / 2);
    h = Math.round(h / 2);
    const { canvas, g } = makeCanvas(w, h);
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = 'high';
    g.drawImage(cur, 0, 0, w, h);
    const next = await createImageBitmap(canvas as OffscreenCanvas);
    if (cur !== bitmap) cur.close();
    cur = next;
  }
  return cur;
}
