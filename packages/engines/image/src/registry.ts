// lovelytools.ai — Image Engine · slug → capability map.
//
// Same contract as the PDF/conversion bindings: the registry says a tool runs on
// the `image` engine, this says which op, what the tool page must collect first,
// and with what defaults. coverage.test.ts asserts this and the registry agree.
//
// HEIC and TIFF sources need no dedicated capability — decode.ts (libheif-js /
// utif2) turns them into an ImageBitmap same as any other source, so
// heic-to-jpg and tiff-to-jpg are just `image.convert` with a narrower accept.
import type { IcoOptions } from './ops/ico';
import type { AdjustOptions, ImageFormat } from './types';

export type ImageCapability =
  | 'image.convert'
  | 'image.crop'
  | 'image.flip'
  | 'image.rotate'
  | 'image.resize'
  | 'image.compress'
  | 'image.adjust'
  | 'image.watermark'
  | 'image.pixelate'
  | 'image.meme'
  | 'image.ico'
  | 'image.to-base64'
  | 'image.from-base64'
  | 'image.remove-background';

/** What the tool page has to ask for before it can run. */
export type ImageControl =
  | { kind: 'none' }
  | { kind: 'format'; formats: ImageFormat[]; label: string }
  | { kind: 'resize' }
  /** Scale factor only (1–4x), upscale forced on — resize-image's fuller mode
   *  picker would let a user "upscale" at factor 1, which is just a no-op. */
  | { kind: 'upscale' }
  | { kind: 'crop' }
  | { kind: 'rotate' }
  | { kind: 'flip' }
  | { kind: 'adjust' }
  | { kind: 'blur' }
  | { kind: 'pixelate' }
  | { kind: 'watermark' }
  | { kind: 'meme' }
  | { kind: 'target-size' }
  | { kind: 'ico-sizes' }
  /** Primary input is pasted text, not a dropped file — base64-to-image only. */
  | { kind: 'paste-base64' };

interface BindingBase {
  /** 'single' takes one file; 'multi' takes several (bulk-image-compressor). */
  arity: 'single' | 'multi';
  /** File types the dropzone accepts. Ignored by the 'paste-base64' control. */
  accept: string;
  control: ImageControl;
  /** Verb on the run button, e.g. "Convert to JPG". */
  action: string;
}

/**
 * Discriminated on capability so each tool's preset carries the op's real option
 * type — a typo can't silently reach the wrong op. Most fields the *control*
 * collects at run time are deliberately absent here; what's left is only the
 * fixed part of a tool that never varies (bmp-to-jpg always targets jpeg,
 * grayscale-image always sets grayscale:1).
 */
export type ImageToolBinding = BindingBase &
  (
    | { capability: 'image.convert'; to?: ImageFormat }
    | { capability: 'image.crop' }
    | { capability: 'image.flip' }
    | { capability: 'image.rotate' }
    | { capability: 'image.resize' }
    | { capability: 'image.compress' }
    | { capability: 'image.adjust'; preset?: AdjustOptions }
    | { capability: 'image.watermark' }
    | { capability: 'image.pixelate' }
    | { capability: 'image.meme' }
    | { capability: 'image.ico'; options: IcoOptions }
    | { capability: 'image.to-base64' }
    | { capability: 'image.from-base64' }
    | { capability: 'image.remove-background' }
  );

const JPEG_ACCEPT = 'image/jpeg,.jpg,.jpeg';
const PNG_ACCEPT = 'image/png,.png';
const BMP_ACCEPT = 'image/bmp,image/x-ms-bmp,.bmp';
const SVG_ACCEPT = 'image/svg+xml,.svg';
const HEIC_ACCEPT = '.heic,.heif';
const TIFF_ACCEPT = 'image/tiff,.tif,.tiff';
/** image/* covers jpg/png/webp/avif/gif/bmp natively; the rest need explicit extensions. */
const ANY_IMAGE_ACCEPT = 'image/*,.heic,.heif,.tif,.tiff,.svg';

export const IMAGE_TOOLS: Record<string, ImageToolBinding> = {
  // ── Convert ────────────────────────────────────────────────────────────────
  'convert-image': {
    capability: 'image.convert',
    arity: 'single',
    accept: ANY_IMAGE_ACCEPT,
    control: { kind: 'format', formats: ['jpeg', 'png', 'webp', 'avif'], label: 'Convert to' },
    action: 'Convert',
  },
  'webp-converter': {
    capability: 'image.convert',
    arity: 'single',
    accept: ANY_IMAGE_ACCEPT,
    control: { kind: 'format', formats: ['webp', 'jpeg', 'png'], label: 'Convert to' },
    action: 'Convert',
  },
  'bmp-to-jpg': {
    capability: 'image.convert',
    to: 'jpeg',
    arity: 'single',
    accept: BMP_ACCEPT,
    control: { kind: 'none' },
    action: 'Convert to JPG',
  },
  'jpg-to-png': {
    capability: 'image.convert',
    to: 'png',
    arity: 'single',
    accept: JPEG_ACCEPT,
    control: { kind: 'none' },
    action: 'Convert to PNG',
  },
  'jpg-to-webp': {
    capability: 'image.convert',
    to: 'webp',
    arity: 'single',
    accept: JPEG_ACCEPT,
    control: { kind: 'none' },
    action: 'Convert to WebP',
  },
  'png-to-jpg': {
    capability: 'image.convert',
    to: 'jpeg',
    arity: 'single',
    accept: PNG_ACCEPT,
    control: { kind: 'none' },
    action: 'Convert to JPG',
  },
  'png-to-webp': {
    capability: 'image.convert',
    to: 'webp',
    arity: 'single',
    accept: PNG_ACCEPT,
    control: { kind: 'none' },
    action: 'Convert to WebP',
  },
  'svg-to-png': {
    capability: 'image.convert',
    to: 'png',
    arity: 'single',
    accept: SVG_ACCEPT,
    control: { kind: 'none' },
    action: 'Convert to PNG',
  },
  'heic-to-jpg': {
    capability: 'image.convert',
    to: 'jpeg',
    arity: 'single',
    accept: HEIC_ACCEPT,
    control: { kind: 'none' },
    action: 'Convert to JPG',
  },
  'tiff-to-jpg': {
    capability: 'image.convert',
    to: 'jpeg',
    arity: 'single',
    accept: TIFF_ACCEPT,
    control: { kind: 'none' },
    action: 'Convert to JPG',
  },

  // ── Transform ──────────────────────────────────────────────────────────────
  'crop-image': {
    capability: 'image.crop',
    arity: 'single',
    accept: ANY_IMAGE_ACCEPT,
    control: { kind: 'crop' },
    action: 'Crop image',
  },
  'flip-image': {
    capability: 'image.flip',
    arity: 'single',
    accept: ANY_IMAGE_ACCEPT,
    control: { kind: 'flip' },
    action: 'Flip image',
  },
  'rotate-image': {
    capability: 'image.rotate',
    arity: 'single',
    accept: ANY_IMAGE_ACCEPT,
    control: { kind: 'rotate' },
    action: 'Rotate image',
  },
  'resize-image': {
    capability: 'image.resize',
    arity: 'single',
    accept: ANY_IMAGE_ACCEPT,
    control: { kind: 'resize' },
    action: 'Resize image',
  },
  'upscale-image': {
    // "AI" in the registry description is aspirational copy — there is no neural
    // upscaler in this engine, only high-quality resampling. Binding it honestly
    // (not declaring it unbuilt) because it does deliver the literal claim, "up
    // to 4x": the runner surfaces a warning that it's resampling, not ML.
    capability: 'image.resize',
    arity: 'single',
    accept: ANY_IMAGE_ACCEPT,
    control: { kind: 'upscale' },
    action: 'Upscale image',
  },

  // ── Optimize ───────────────────────────────────────────────────────────────
  'image-compressor': {
    capability: 'image.compress',
    arity: 'single',
    accept: ANY_IMAGE_ACCEPT,
    control: { kind: 'target-size' },
    action: 'Compress image',
  },
  'bulk-image-compressor': {
    capability: 'image.compress',
    arity: 'multi',
    accept: ANY_IMAGE_ACCEPT,
    control: { kind: 'target-size' },
    action: 'Compress images',
  },

  // ── Adjust ─────────────────────────────────────────────────────────────────
  'grayscale-image': {
    capability: 'image.adjust',
    preset: { grayscale: 1 },
    arity: 'single',
    accept: ANY_IMAGE_ACCEPT,
    control: { kind: 'none' },
    action: 'Convert to grayscale',
  },
  'photo-filters': {
    capability: 'image.adjust',
    arity: 'single',
    accept: ANY_IMAGE_ACCEPT,
    control: { kind: 'adjust' },
    action: 'Apply filters',
  },
  'blur-image': {
    capability: 'image.adjust',
    arity: 'single',
    accept: ANY_IMAGE_ACCEPT,
    control: { kind: 'blur' },
    action: 'Blur image',
  },

  // ── Creative ───────────────────────────────────────────────────────────────
  'add-watermark-image': {
    capability: 'image.watermark',
    arity: 'single',
    accept: ANY_IMAGE_ACCEPT,
    control: { kind: 'watermark' },
    action: 'Add watermark',
  },
  'pixelate-image': {
    capability: 'image.pixelate',
    arity: 'single',
    accept: ANY_IMAGE_ACCEPT,
    control: { kind: 'pixelate' },
    action: 'Pixelate image',
  },
  'meme-generator': {
    capability: 'image.meme',
    arity: 'single',
    accept: ANY_IMAGE_ACCEPT,
    control: { kind: 'meme' },
    action: 'Generate meme',
  },

  // ── Icons ──────────────────────────────────────────────────────────────────
  'ico-converter': {
    capability: 'image.ico',
    options: { sizes: [16, 32, 48] },
    arity: 'single',
    accept: ANY_IMAGE_ACCEPT,
    control: { kind: 'ico-sizes' },
    action: 'Convert to ICO',
  },
  'favicon-generator': {
    // A multi-resolution .ico IS a favicon set — browsers pick the resolution
    // they need from the one file. Same capability as ico-converter, wider
    // default size list.
    capability: 'image.ico',
    options: { sizes: [16, 32, 48, 64] },
    arity: 'single',
    accept: ANY_IMAGE_ACCEPT,
    control: { kind: 'ico-sizes' },
    action: 'Generate favicon',
  },

  // ── Matting ────────────────────────────────────────────────────────────────
  'remove-background': {
    // U²-Net (small) via onnxruntime-web — model and runtime are self-hosted,
    // staged by tooling/wasm-build (`u2net` and `ort` in the WASM manifest).
    capability: 'image.remove-background',
    arity: 'single',
    accept: ANY_IMAGE_ACCEPT,
    control: { kind: 'none' },
    action: 'Remove background',
  },

  // ── Base64 ─────────────────────────────────────────────────────────────────
  'image-to-base64': {
    capability: 'image.to-base64',
    arity: 'single',
    accept: ANY_IMAGE_ACCEPT,
    control: { kind: 'none' },
    action: 'Encode to Base64',
  },
  'base64-to-image': {
    capability: 'image.from-base64',
    arity: 'single',
    accept: ANY_IMAGE_ACCEPT,
    control: { kind: 'paste-base64' },
    action: 'Decode image',
  },
};

/**
 * Image-engine tools that need a capability the engine genuinely doesn't have.
 *
 * Each entry below was checked against what the engine can actually do — not
 * assumed unbuildable because it sounded hard. blur/pixelate/meme-generator/
 * base64 turned out to be reachable with the existing canvas pipeline and zero
 * new dependencies (see ops/pixelate.ts, ops/meme.ts, ops/base64.ts), and
 * remove-background graduated off this list once a real model was vendored
 * (u2netp, staged by tooling/wasm-build); these three did not.
 */
export const IMAGE_NOT_IMPLEMENTED: Record<string, string> = {
  'collage-maker':
    'needs a multi-image grid-layout compositor with a cell-arrangement UI — every op this engine has is single-image-in, single-image-out, and a real collage tool needs materially different state (image count, grid shape, per-cell cropping) than an options object',
  'gif-maker':
    "needs an animated GIF encoder. Browsers have no native one, and none of this engine's dependencies (jszip, libheif-js, utif2, onnxruntime-web) provide one — unlike heic-to-jpg/tiff-to-jpg/ico-converter, no GIF-encoding library was vetted and added this pass",
  'image-color-picker':
    "needs an interactive point-and-sample UI (click a pixel, read its color) — every other tool here is run-once-produce-a-file, but a color picker produces no file at all and has no 'run' step to bind a capability to",
};

export const imageToolSlugs = (): string[] => Object.keys(IMAGE_TOOLS);

export const bindingFor = (slug: string): ImageToolBinding | undefined => IMAGE_TOOLS[slug];

export const notImplementedReason = (slug: string): string | undefined => IMAGE_NOT_IMPLEMENTED[slug];
