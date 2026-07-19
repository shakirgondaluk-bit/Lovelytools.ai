// lovelytools.ai — base64 in/out. Both directions work on the ORIGINAL bytes,
// never the canvas-decoded-then-reencoded pixels — a re-encode would silently
// recompress a JPEG or bloat a PNG. decodeImage() is only used upstream (by the
// runner, for base64-to-image) to validate the pasted bytes really are an image
// and to read its dimensions for the receipt.
import {
  checkCancelled,
  type DecodedImage,
  type ImageOpResult,
  type OpContext,
} from '../types';

/** image-to-base64: the file's own bytes, as a data: URI, wrapped in a text file. */
export async function toBase64(
  input: DecodedImage,
  originalBytes: Blob,
  ctx: OpContext,
): Promise<ImageOpResult> {
  checkCancelled(ctx);
  ctx.progress(30, 'Reading file');
  const buf = await originalBytes.arrayBuffer();
  ctx.progress(60, 'Encoding base64');
  const mime = originalBytes.type || 'application/octet-stream';
  const dataUri = `data:${mime};base64,${bufferToBase64(buf)}`;
  const blob = new Blob([dataUri], { type: 'text/plain' });
  const base = input.name.replace(/\.[^./\\]+$/, '');

  return {
    files: [{ blob, name: `${base}-base64.txt`, width: input.width, height: input.height }],
    fidelity: 'high',
    warnings: ['This is a text file containing the data: URI — paste it directly into CSS/HTML.'],
    stats: {
      widthIn: input.width,
      heightIn: input.height,
      widthOut: input.width,
      heightOut: input.height,
      bytesIn: input.sourceBytes,
      bytesOut: blob.size,
    },
  };
}

const EXT_BY_SOURCE: Record<DecodedImage['sourceFormat'], string> = {
  jpeg: 'jpg',
  png: 'png',
  webp: 'webp',
  avif: 'avif',
  gif: 'gif',
  bmp: 'bmp',
  svg: 'svg',
  heic: 'heic',
  tiff: 'tiff',
};

/** base64-to-image: hand back the exact decoded bytes — no re-encoding. */
export async function keepOriginal(input: DecodedImage, originalBytes: Blob, ctx: OpContext): Promise<ImageOpResult> {
  checkCancelled(ctx);
  ctx.progress(50, 'Preparing file');
  // The synthetic File built from pasted text rarely has a real extension —
  // sourceFormat is magic-byte-verified at decode time, so trust that instead.
  const base = input.name.replace(/\.[^./\\]+$/, '') || 'image';
  const name = `${base}.${EXT_BY_SOURCE[input.sourceFormat]}`;
  return {
    files: [{ blob: originalBytes, name, width: input.width, height: input.height }],
    fidelity: 'high',
    warnings: [],
    stats: {
      widthIn: input.width,
      heightIn: input.height,
      widthOut: input.width,
      heightOut: input.height,
      bytesIn: input.sourceBytes,
      bytesOut: originalBytes.size,
    },
  };
}

/** Chunked so a multi-MB buffer doesn't blow the call stack on String.fromCharCode(...bytes). */
function bufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  const CHUNK = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}
