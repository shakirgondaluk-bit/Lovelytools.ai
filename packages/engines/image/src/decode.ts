// lovelytools.ai — decode: sniff magic bytes, decode to ImageBitmap with EXIF
// orientation applied to pixels (images never come out sideways), guard
// canvas-killing dimensions.
//
// Explicit reference (not just having ambient.d.ts in the package) because a
// consumer's own tsc run — apps/web's, for instance — walks this file's imports
// without including every sibling file under this package's "include" glob.
// Ambient module merging only reaches programs that actually see the file.
/// <reference path="./ambient.d.ts" />
import { ImageError, type DecodedImage } from './types';

const MAX_EDGE = 12_000; // px — canvas memory guard

export async function decodeImage(file: File): Promise<DecodedImage> {
  const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const sourceFormat = sniff(head, file.type);
  if (!sourceFormat) {
    throw new ImageError('not-an-image', `${file.name} isn't a supported image (JPG, PNG, WebP, AVIF, GIF, BMP, SVG, HEIC, TIFF).`);
  }

  let bitmap: ImageBitmap;
  try {
    // imageOrientation:'from-image' bakes EXIF rotation into the pixels. Safari's
    // ImageIO backend can actually decode HEIC/TIFF here natively — the WASM
    // decoders below are only the fallback for browsers that can't.
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    if (sourceFormat === 'svg') {
      bitmap = await decodeSvg(file); // Firefox needs explicit raster sizing
    } else if (sourceFormat === 'heic') {
      bitmap = await decodeHeic(file);
    } else if (sourceFormat === 'tiff') {
      bitmap = await decodeTiff(file);
    } else {
      throw new ImageError('corrupt-file', `${file.name} couldn't be decoded — it may be corrupt or truncated.`);
    }
  }

  if (bitmap.width > MAX_EDGE || bitmap.height > MAX_EDGE) {
    const dims = `${bitmap.width}×${bitmap.height}`;
    bitmap.close();
    throw new ImageError(
      'dimensions-too-large',
      `${file.name} is ${dims}px — the limit is ${MAX_EDGE.toLocaleString()}px per side. Resize it in stages.`,
    );
  }

  return {
    bitmap,
    name: file.name,
    sourceFormat,
    sourceBytes: file.size,
    width: bitmap.width,
    height: bitmap.height,
    orientationApplied: sourceFormat === 'jpeg', // EXIF orientation is a JPEG concern
  };
}

const HEIC_BRANDS = ['heic', 'heix', 'hevc', 'heim', 'heis', 'hevm', 'hevs', 'mif1', 'msf1'];

function sniff(b: Uint8Array, mime: string): DecodedImage['sourceFormat'] | null {
  if (b[0] === 0xff && b[1] === 0xd8) return 'jpeg';
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'png';
  if (str(b, 0, 4) === 'RIFF' && str(b, 8, 12) === 'WEBP') return 'webp';
  if (str(b, 4, 12) === 'ftypavif' || str(b, 4, 12) === 'ftypavis') return 'avif';
  if (str(b, 4, 8) === 'ftyp' && HEIC_BRANDS.includes(str(b, 8, 12))) return 'heic';
  if (str(b, 0, 3) === 'GIF') return 'gif';
  if (b[0] === 0x42 && b[1] === 0x4d) return 'bmp';
  if ((b[0] === 0x49 && b[1] === 0x49 && b[2] === 0x2a && b[3] === 0x00) ||
      (b[0] === 0x4d && b[1] === 0x4d && b[2] === 0x00 && b[3] === 0x2a)) return 'tiff';
  if (mime === 'image/svg+xml' || looksLikeSvg(b)) return 'svg';
  return null;
}

function looksLikeSvg(b: Uint8Array): boolean {
  const text = new TextDecoder().decode(b).trimStart().toLowerCase();
  return text.startsWith('<svg') || text.startsWith('<?xml');
}

const str = (b: Uint8Array, from: number, to: number) =>
  Array.from(b.slice(from, to), (c) => String.fromCharCode(c)).join('');

/** SVG rasterization at intrinsic (or 1024px fallback) size. Main thread only. */
async function decodeSvg(file: File): Promise<ImageBitmap> {
  if (typeof document === 'undefined') {
    throw new ImageError('corrupt-file', 'SVG decoding needs the main thread — route this op outside the worker.');
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new ImageError('corrupt-file', `${file.name} isn't valid SVG.`));
      img.src = url;
    });
    const w = img.naturalWidth || 1024;
    const h = img.naturalHeight || Math.round(1024 * (img.naturalHeight / (img.naturalWidth || 1))) || 1024;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
    return createImageBitmap(canvas);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** HEIC/HEIF via libheif's WASM build — lazy-loaded, self-contained (binary embedded). */
async function decodeHeic(file: File): Promise<ImageBitmap> {
  const factory = (await import('libheif-js/libheif-wasm/libheif-bundle.mjs')).default;
  const libheif = await factory();
  const buf = new Uint8Array(await file.arrayBuffer());
  const decoder = new libheif.HeifDecoder();
  const first = decoder.decode(buf)[0];
  if (!first) throw new ImageError('corrupt-file', `${file.name} doesn't contain a readable HEIC image.`);

  const width = first.get_width();
  const height = first.get_height();
  const imageData = new ImageData(width, height);
  await new Promise<void>((resolve, reject) => {
    first.display({ data: imageData.data, width, height }, (result) => {
      if (!result) reject(new ImageError('corrupt-file', `${file.name} couldn't be decoded — it may be corrupt or truncated.`));
      else resolve();
    });
  });
  return createImageBitmap(imageData);
}

/** TIFF via utif2 — pure JS, no WASM. Multi-page files use only the first page. */
async function decodeTiff(file: File): Promise<ImageBitmap> {
  const UTIF = (await import('utif2')).default;
  const buf = await file.arrayBuffer();
  const first = UTIF.decode(buf)[0];
  if (!first) throw new ImageError('corrupt-file', `${file.name} doesn't contain a readable TIFF image.`);
  UTIF.decodeImage(buf, first);
  const rgba = UTIF.toRGBA8(first);
  const imageData = new ImageData(new Uint8ClampedArray(rgba), first.width, first.height);
  return createImageBitmap(imageData);
}
