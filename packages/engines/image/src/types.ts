// lovelytools.ai — Image Engine · shared contracts
export type ImageFormat = 'jpeg' | 'png' | 'webp' | 'avif';

export type ImageFidelity = 'high' | 'good';

export type ImageErrorCode =
  | 'not-an-image'
  | 'corrupt-file'
  | 'too-large'
  | 'too-many-files'
  | 'dimensions-too-large'
  | 'encoder-unavailable'
  | 'invalid-options'
  | 'model-load-failed'
  | 'cancelled'
  | 'internal';

export class ImageError extends Error {
  constructor(
    public code: ImageErrorCode,
    /** Friendly, actionable — shown verbatim in the UI (DS §12). */
    message: string,
  ) {
    super(message);
    this.name = 'ImageError';
  }
}

/** Decoded once in the facade; ops receive pixels, not bytes. */
export interface DecodedImage {
  bitmap: ImageBitmap;
  name: string;
  sourceFormat: ImageFormat | 'gif' | 'bmp' | 'svg' | 'heic' | 'tiff';
  sourceBytes: number;
  width: number;
  height: number;
  /** True if the source carried EXIF orientation that was applied to pixels. */
  orientationApplied: boolean;
}

export interface OpContext {
  /** Real progress only — per file / per stage, never simulated. */
  progress: (pct: number, stage: string) => void;
  signal?: AbortSignal;
  warn: (msg: string) => void;
}

export interface OutputImage {
  blob: Blob;
  name: string;
  width: number;
  height: number;
}

export interface ImageOpStats {
  widthIn: number;
  heightIn: number;
  widthOut: number;
  heightOut: number;
  bytesIn: number;
  bytesOut: number;
}

export interface ImageOpResult {
  files: OutputImage[];
  fidelity: ImageFidelity;
  warnings: string[];
  stats: ImageOpStats;
}

/* ---------------- option types ---------------- */

export type ResizeMode =
  | { kind: 'fit'; width: number; height: number } // contain, no upscale by default
  | { kind: 'fill'; width: number; height: number } // cover + center-crop
  | { kind: 'exact'; width: number; height: number } // stretch
  | { kind: 'long-edge'; px: number } // scale so max(w,h) === px
  | { kind: 'scale'; factor: number }; // 0 < factor <= 4

export interface ResizeOptions {
  mode: ResizeMode;
  /** Allow upscaling. Default false — warns instead of blurring. */
  upscale?: boolean;
}

export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type RotateDeg = 90 | 180 | 270;
export type FlipAxis = 'horizontal' | 'vertical';

export interface EncodeOptions {
  format: ImageFormat;
  /** 0–1. Ignored for PNG. Default 0.85. */
  quality?: number;
  /** JPEG has no alpha — flatten color. Default '#ffffff'. */
  background?: string;
}

export interface CompressOptions {
  /** Target output size. The engine binary-searches quality to hit it. */
  targetBytes: number;
  /** Output format for the search. Default: source format (webp for png sources). */
  format?: ImageFormat;
  /** Floor so the search never produces mush. Default 0.35. */
  minQuality?: number;
}

export interface AdjustOptions {
  /** 1 = unchanged. Sensible UI range 0–2. */
  brightness?: number;
  contrast?: number;
  saturation?: number;
  /** Degrees, -180..180. */
  hueRotate?: number;
  /** 0–1. */
  grayscale?: number;
  /** Gaussian blur radius in px. */
  blur?: number;
}

export interface PixelateOptions {
  /** Mosaic block size in px. Bigger = chunkier. */
  blockSize: number;
}

export interface MemeOptions {
  topText: string;
  bottomText: string;
}

export type WatermarkAnchor =
  | 'center' | 'tile'
  | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export interface ImageWatermarkOptions {
  text: string;
  anchor: WatermarkAnchor;
  opacity: number; // 0–1
  /** Relative to image width; 0.04 ≈ subtle corner mark. */
  fontScale: number;
  color: string; // CSS color
}

export interface BackgroundRemoveOptions {
  /** Feather edge in px after matting. Default 1. */
  feather?: number;
  /** Fill instead of transparency (e.g. product-shot white). */
  background?: string | null;
}

/* ---------------- helpers ---------------- */

export function checkCancelled(ctx: OpContext): void {
  if (ctx.signal?.aborted) throw new ImageError('cancelled', 'Cancelled.');
}

export const EXT: Record<ImageFormat, string> = {
  jpeg: 'jpg',
  png: 'png',
  webp: 'webp',
  avif: 'avif',
};

export const MIME: Record<ImageFormat, string> = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  avif: 'image/avif',
};

export function outName(base: string, suffix: string, format: ImageFormat): string {
  return `${base.replace(/\.[^./\\]+$/, '')}${suffix}.${EXT[format]}`;
}
