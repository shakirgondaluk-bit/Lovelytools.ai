// lovelytools.ai — capability probing. Ask the browser, never the user agent.
// Probed once, cached for the session; the UI reads this to disable (with a
// reason) rather than fail at runtime.
import type { ImageFormat } from './types';

export interface ImageCapabilities {
  encode: Record<ImageFormat, boolean>;
  offscreenCanvas: boolean;
  webgpu: boolean;
  /** Human summary for the tool page footer, e.g. "WebGPU acceleration active". */
  summary: string;
}

let cached: Promise<ImageCapabilities> | null = null;

export function capabilities(): Promise<ImageCapabilities> {
  return (cached ??= probe());
}

async function probe(): Promise<ImageCapabilities> {
  const offscreenCanvas = typeof OffscreenCanvas !== 'undefined';

  const encode: Record<ImageFormat, boolean> = {
    jpeg: true,
    png: true,
    webp: await canEncode('image/webp'),
    avif: await canEncode('image/avif'),
  };

  let webgpu = false;
  try {
    const gpu = (navigator as Navigator & { gpu?: { requestAdapter(): Promise<unknown> } }).gpu;
    webgpu = !!gpu && (await gpu.requestAdapter()) !== null;
  } catch {
    webgpu = false;
  }

  const summary = webgpu
    ? 'WebGPU acceleration active'
    : 'Running on CPU (WASM) — still fully on-device';

  return { encode, offscreenCanvas, webgpu, summary };
}

/** 1×1 encode probe — the only reliable way to detect encoder support. */
async function canEncode(mime: string): Promise<boolean> {
  try {
    if (typeof OffscreenCanvas !== 'undefined') {
      const c = new OffscreenCanvas(1, 1);
      c.getContext('2d');
      const blob = await c.convertToBlob({ type: mime });
      return blob.type === mime;
    }
    const c = document.createElement('canvas');
    c.width = c.height = 1;
    return await new Promise((resolve) =>
      c.toBlob((b) => resolve(!!b && b.type === mime), mime),
    );
  } catch {
    return false;
  }
}
