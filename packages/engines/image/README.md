# lovelytools.ai — Image Engine (`engine/image/`)

Client-side engine powering the Image Tools family (38 tools). Everything runs
on-device: `createImageBitmap` + OffscreenCanvas for decode/raster work,
capability-detected encoders, WebGPU (with WASM fallback) for background
removal. No image ever leaves the tab.

## Layout

```
engine/image/
├── types.ts             # op contracts, options, results, errors
├── decode.ts            # sniff + decode + EXIF orientation normalization
├── capabilities.ts      # what THIS browser can encode/accelerate (probed once)
├── image-engine.ts      # facade: validate → decode → op → encode (+ limits, cancel)
├── use-image-tool.ts    # React hook wiring UploadZone/ProgressRow to any op
└── ops/
    ├── resize.ts        # fit / fill / exact / long-edge; stepped half-downscale
    ├── crop.ts          # rect crop + aspect presets
    ├── transform.ts     # rotate 90/180/270, flip H/V
    ├── convert.ts       # JPEG / PNG / WebP (+ AVIF when the browser can)
    ├── compress.ts      # target-size binary search over quality
    ├── adjust.ts        # brightness / contrast / saturation (CSS filter pipeline)
    ├── watermark.ts     # text watermark: corner / center / tile
    ├── strip-metadata.ts# EXIF/GPS removal via re-encode (explicitly documented)
    └── background-remove.ts # segmentation model, lazy-loaded, WebGPU→WASM
```

## The op contract (same shape as the PDF Engine)

```ts
(input: DecodedImage, options: TOptions, ctx: OpContext) => Promise<ImageOpResult>
```

- `DecodedImage` — `ImageBitmap` + source metadata (format, bytes, EXIF orientation applied)
- `OpContext` — `progress(pct, stage)`, `signal`, `warn(msg)`
- `ImageOpResult` — output files + `stats` (dimensions and bytes before/after —
  powers the "2.4 MB → 380 KB" moment) + warnings

Decode happens **once** per file in the facade; ops receive pixels, not bytes.
Chained ops (resize → convert → compress is one tool page) reuse the same bitmap.

## Capability detection, not user agents

`capabilities.ts` probes at startup (cached):
- **Encoders**: AVIF/WebP encode support via a 1×1 `convertToBlob` probe.
  Unsupported target → the format picker disables the option with a reason,
  never a runtime failure.
- **WebGPU**: `navigator.gpu` + adapter request. Background removal picks
  WebGPU (~0.4 s/image) or WASM (~3 s/image) and tells the UI which it chose.
- **OffscreenCanvas**: main-thread `<canvas>` fallback for older Safari.

## Background removal honesty

`background-remove.ts` lazy-loads a quantized segmentation model (~6 MB,
`onnxruntime-web`, RMBG-class) **only when the user opens that tool**, shows
real download progress for the model fetch (a static asset from our origin —
still no user data in flight), caches it in the Cache API, and reports
`fidelity: 'good'` — matting isn't pixel-perfect on hair/fur and the UI says so.

## EXIF policy

- All re-encodes **drop** EXIF (canvas pipeline) — orientation is applied to
  pixels first, so images never come out sideways.
- `strip-metadata.ts` makes that the explicit product feature (GPS/EXIF removal)
  with a byte-count receipt.
- Lossless "keep EXIF" copy modes are intentionally out of scope for v1 —
  documented, not half-shipped.

## Limits

Registry limits: Free 10 files / 200 MB each · Pro 200 / 2 GB. Dimension guard:
inputs above 12k × 12k px are rejected with a friendly error (canvas memory).
All ops cancellable; progress is real (per file, per stage), never simulated.
