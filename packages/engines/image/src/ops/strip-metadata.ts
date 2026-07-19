// lovelytools.ai — strip metadata: the canvas pipeline drops EXIF/GPS/XMP by
// construction; this op makes that the explicit product feature with a receipt.
import { draw, encode } from '../raster';
import {
  checkCancelled,
  outName,
  type DecodedImage,
  type EncodeOptions,
  type ImageOpResult,
  type OpContext,
} from '../types';

export async function stripMetadata(
  input: DecodedImage,
  enc: EncodeOptions,
  ctx: OpContext,
): Promise<ImageOpResult> {
  checkCancelled(ctx);
  ctx.progress(35, 'Removing metadata');
  // Re-encode from pixels: EXIF, GPS, XMP, thumbnails, color-profile blobs all
  // fall away. Orientation was applied at decode, so pixels stay upright.
  const { canvas } = draw(input.bitmap, input.width, input.height, enc.format, enc.background);
  ctx.progress(75, 'Encoding');
  const blob = await encode(canvas, {
    ...enc,
    quality: enc.quality ?? 0.92, // privacy tool: bias to quality, not size
  });

  const saved = input.sourceBytes - blob.size;
  const receipt =
    saved > 0
      ? `Removed metadata (${fmt(saved)} of EXIF/GPS/profile data and recompression savings).`
      : 'Metadata removed. The file grew slightly — pixel data was recompressed at high quality.';

  return {
    files: [{ blob, name: outName(input.name, '-clean', enc.format), width: input.width, height: input.height }],
    fidelity: 'high',
    warnings: [receipt],
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

function fmt(n: number): string {
  return n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`;
}
