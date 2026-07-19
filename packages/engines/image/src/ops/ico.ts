// lovelytools.ai — hand-rolled ICO encoder. Modern ICO entries can embed a full
// PNG per size directly (supported since Windows Vista) instead of a classic
// BITMAPINFOHEADER + DIB + AND-mask per size — far simpler, lossless, and every
// consumer (Windows, browsers, favicon parsers) reads this variant fine.
import { draw, encode } from '../raster';
import {
  checkCancelled,
  ImageError,
  outName,
  type DecodedImage,
  type ImageOpResult,
  type OpContext,
} from '../types';

export interface IcoOptions {
  /** Square sizes to embed, one PNG frame per size. */
  sizes: number[];
}

export async function encodeIco(
  input: DecodedImage,
  opts: IcoOptions,
  ctx: OpContext,
): Promise<ImageOpResult> {
  const sizes = [...new Set(opts.sizes)].sort((a, b) => a - b);
  if (sizes.length === 0) throw new ImageError('invalid-options', 'Pick at least one icon size.');
  if (sizes.some((s) => s < 1 || s > 256)) {
    throw new ImageError('invalid-options', 'ICO sizes must be between 1 and 256px.');
  }

  const frames: { size: number; bytes: Uint8Array }[] = [];
  for (let i = 0; i < sizes.length; i++) {
    checkCancelled(ctx);
    const size = sizes[i]!;
    ctx.progress(10 + Math.round((i / sizes.length) * 70), `Rendering ${size}×${size}`);
    const { canvas } = draw(input.bitmap, size, size, 'png');
    const blob = await encode(canvas, { format: 'png' });
    frames.push({ size, bytes: new Uint8Array(await blob.arrayBuffer()) });
  }

  ctx.progress(85, 'Packing .ico');
  const icoBytes = packIco(frames);
  const blob = new Blob([icoBytes as BlobPart], { type: 'image/x-icon' });
  const largest = sizes[sizes.length - 1] ?? input.width;

  return {
    files: [{ blob, name: outName(input.name, '', 'png').replace(/\.png$/, '.ico'), width: largest, height: largest }],
    fidelity: 'high',
    warnings: [],
    stats: {
      widthIn: input.width,
      heightIn: input.height,
      widthOut: largest,
      heightOut: largest,
      bytesIn: input.sourceBytes,
      bytesOut: blob.size,
    },
  };
}

/** ICONDIR + ICONDIRENTRY[] + one PNG payload per size (MS-ICO, PNG-in-ICO variant). */
function packIco(frames: { size: number; bytes: Uint8Array }[]): Uint8Array {
  const headerSize = 6 + 16 * frames.length;
  const total = headerSize + frames.reduce((n, f) => n + f.bytes.length, 0);
  const out = new Uint8Array(total);
  const view = new DataView(out.buffer);

  view.setUint16(0, 0, true); // reserved, must be 0
  view.setUint16(2, 1, true); // type: 1 = icon
  view.setUint16(4, frames.length, true);

  let offset = headerSize;
  for (let i = 0; i < frames.length; i++) {
    const f = frames[i]!;
    const entry = 6 + i * 16;
    out[entry + 0] = f.size >= 256 ? 0 : f.size; // width, 0 means 256
    out[entry + 1] = f.size >= 256 ? 0 : f.size; // height, 0 means 256
    out[entry + 2] = 0; // palette size — 0 for full color
    out[entry + 3] = 0; // reserved
    view.setUint16(entry + 4, 1, true); // color planes
    view.setUint16(entry + 6, 32, true); // bits per pixel
    view.setUint32(entry + 8, f.bytes.length, true);
    view.setUint32(entry + 12, offset, true);
    out.set(f.bytes, offset);
    offset += f.bytes.length;
  }

  return out;
}
