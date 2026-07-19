# lovelytools.ai — PDF Engine (`engine/pdf/`)

Client-side engine powering the PDF & Documents tool family (42 tools).
Every operation runs on-device: `pdf-lib` for document surgery, `pdfjs-dist`
for rendering/extraction, OffscreenCanvas in workers for raster work.
Format *conversion* lives in the Conversion Engine — this engine covers
**operations on PDFs**.

## Layout

```
engine/pdf/
├── types.ts            # op contracts, options, results, errors
├── pdf-engine.ts       # facade: validate → open → op → save (+ limits, cancel)
├── render.ts           # pdfjs page rendering: thumbnails, previews, DPI raster
├── use-pdf-tool.ts     # React hook wiring UploadZone/ProgressRow to any op
└── ops/
    ├── merge.ts        # N PDFs → 1 (page ranges per source, outline preserved)
    ├── split.ts        # 1 → N (ranges, every-N-pages, per-bookmark, size cap)
    ├── organize.ts     # reorder / delete / duplicate / extract pages
    ├── rotate.ts       # rotate pages (per-page or all, 90/180/270)
    ├── compress.ts     # lossless (strip+dedupe) or raster (DPI + JPEG quality)
    ├── watermark.ts    # text/diagonal watermark with opacity + tiling
    ├── page-numbers.ts # positioned page numbering with format templates
    ├── metadata.ts     # read/write title, author, subject, keywords; strip all
    ├── images-to-pdf.ts# JPG/PNG/WebP → PDF (page size, margins, fit modes)
    └── extract-text.ts # per-page text extraction (feeds word counts, search)
```

## The op contract

Every operation is a pure async function:

```ts
(input: PdfInput, options: TOptions, ctx: OpContext) => Promise<PdfOpResult>
```

- `PdfInput` — one or more `ArrayBuffer`s + filenames
- `OpContext` — `progress(pct, stage)`, `signal` (AbortSignal), `warn(msg)`
- `PdfOpResult` — output files (a PDF, several PDFs, or text), warnings, stats
  (page counts, bytes before/after — powers the "saved 84%" UI moment)

Ops never touch the DOM (worker-safe). Rendering ops use `OffscreenCanvas`
and fall back to the main thread where unavailable (old Safari).

## Encryption policy

- **Password-protected inputs**: detected up front → `password-protected`
  error with a friendly message. Unlock (with a known password) is supported
  via the qpdf-wasm module — lazy-loaded (~1.1 MB) only when the user opens
  the Unlock tool.
- **Producing encrypted PDFs**: `protect.ts` intentionally deferred to the
  same qpdf-wasm module; pdf-lib cannot write encryption. Flagged in the UI
  as "Pro, coming soon" rather than shipped half-strength.

## Compression honesty

`compress.ts` offers two modes and reports real numbers:
- `lossless` — strip metadata/thumbnails, dedupe objects, re-save with object
  streams. Typical 5–30% on wild PDFs. Fidelity: `high`.
- `raster` — re-render pages at target DPI (default 120) to JPEG (default q=0.7)
  and rebuild. Big wins (60–90%) on scan-heavy files. Fidelity: `text-only`
  (text becomes pixels) — the UI must warn before download, per DS §12.

If a mode *grows* the file, the engine returns the original with a warning
instead of shipping a worse file.

## Limits

Same registry limits as everywhere: Free 10 files / 200 MB each · Pro 200 / 2 GB.
All ops are cancellable; progress is real (per page), never simulated.
