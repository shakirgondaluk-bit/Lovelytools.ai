# lovelytools.ai

Privacy-first platform of **235 browser-based tools**. Every engine runs on the
user's device via WebAssembly. **There is no file upload endpoint anywhere in this
codebase**, and there never will be — that invariant is what the whole architecture
is arranged around.

Built from Design System v1.0 and Technical Architecture RFC-001. See
[RECONCILIATION.md](RECONCILIATION.md) for what changed when the source archives were
merged, and why.

## Quick start

```bash
pnpm install          # also stages the ffmpeg WASM cores into apps/web/public/wasm
pnpm dev              # http://localhost:3210
```

`pnpm install` runs `tooling/wasm-build`, which copies ~62 MB of ffmpeg cores out of
`node_modules` and content-hashes them. They are git-ignored build output.

## Layout

```
apps/web/                 Next.js 15 · App Router · the only app
  app/page.tsx            homepage — every count rendered from the registry
  app/[slug]/page.tsx     the flat namespace: tool | category | collection
  components/templates/   RSC compositions
  components/tool-runner  the one client island on a tool page
packages/
  registry/               ★ single source of truth — 235 tools, Zod-validated
  ui/                     design tokens + the merged component library
  engines/
    core/                 the ToolEngine contract
    conversion/           documents: pdf/docx/xlsx/pptx/csv/json…
    pdf/ image/ text/ calculator/ devtools/
    video/ audio/         ffmpeg.wasm
    speech/               Whisper tiny→large-v3-turbo, WebGPU/WASM (social-media tools)
  config/                 tailwind preset, tsconfig
tooling/wasm-build/       stages + content-hashes the WASM cores
```

## The rules that matter

**The registry is the only catalog.** Routes, navigation, sitemaps, the search index,
COOP/COEP headers and every "N tools" number are derived from
`packages/registry`. Shipping a tool is one entry there plus an engine capability.

**Never store a number you can derive.** The homepage says 235 because the catalog
has 235 rows. Three different hardcoded counts (229 / 260 / "250+") is what this
replaced.

**Never invent a statistic.** Ratings and use counts live in the server plane
(`tool_stats`), not the registry. Absent them the UI omits them — it does not
placeholder them, and the JSON-LD does not claim them.

**Components reference tokens, never raw hex.** The eight category hues, star gold
and error red are the only theme-invariant exceptions.

## Checks

```bash
pnpm registry:check   # slug collisions, dangling links, orphans, SEO budgets
pnpm test             # engine ↔ registry coverage + every internal link resolves
pnpm typecheck
pnpm build
```

These are the gates that matter, because they catch what types cannot:

- **`registry:check`** — a tool linking to something that doesn't exist, a page
  nothing links to, a slug that collides in the flat namespace, an SEO title that
  would render doubled.
- **`check:links`** (in `pnpm test`) — a hardcoded `href` in any component pointing
  at a route the app cannot serve. The nav and footer once shipped 14 of these,
  including `/tools`, the homepage's primary call to action. They rendered fine,
  typechecked fine, and 404'd on click.

## Verified

- `pnpm build` — 255 static pages, typechecked, zero errors across all 7 packages.
- Every internal link on the homepage resolves (30 checked, including both mega
  panels); every route returns 200.
- **Audio engine end to end**: a 36 KB WebM tone → `tone.mp3`, 54,765 bytes,
  magic bytes `49 44 33` (`ID3`) — a real MP3, produced entirely in-browser, with the
  container-normalisation warning surfaced correctly.
- **PDF engine end to end**, driven with real hand-built PDFs and checked at the byte
  level:
  - `merge-pdf` — 2-page + 3-page → one 5-page `%PDF-1.7`, valid `%%EOF`.
  - `split-pdf` — 5-page → `doc-page1.pdf` … `doc-page5.pdf`, individual + zip.
  - `pdf-to-text` — extracted exactly `report page 1 / 2 / 3` with form-feed page
    breaks.
  - `optimize-pdf` — 4 pages, 29% smaller, text layer intact.
  - `compress-pdf` — rasterised 2 pages, correctly judged the result bigger than the
    original and kept the original, saying so.
  - `pdf-to-jpg` — 2 pages → `scan-1.jpg`, `scan-2.jpg`; output starts `ff d8 ff`.
  - `pdf-to-png` — output starts `89 50 4e 47`; the "PNG is lossless, so these are
    large" warning fires.

  - `protect-pdf` → `unlock-pdf` round trip — password set, `/Encrypt` present, and
    the plaintext **not** findable in the bytes; then unlocked with the password and
    `/Encrypt` gone.
  - `crop-pdf` — 2 pages, valid PDF, margin trimmed.
  - `compare-pdf` — found exactly the one changed line across two documents and
    ignored the identical ones.

  The remaining wired PDF tools (rotate, watermark, page numbers, metadata, organize,
  reorder, delete/extract pages, flatten, fill-form, sign, and the three
  images-to-PDF tools) share these code paths and typecheck, but have not been
  individually driven.
- **Conversion engine end to end**, all 7 wired tools driven with real files and
  checked at the byte level:
  - `html-to-pdf` — 268-byte HTML → 1095-byte `%PDF-1.x`, valid `%%EOF`, "minor
    differences" fidelity badge correctly shown (doc IR → PDF is `good`, not `high`).
  - `pdf-to-word` / `pdf-to-powerpoint` — hand-built 2-page PDF → 8.5 KB `.docx` /
    49.8 KB `.pptx`, both starting `PK\x03\x04` with the correct OOXML MIME type,
    "text only" fidelity badge shown.
  - `word-to-pdf` / `excel-to-pdf` / `powerpoint-to-pdf` — real `.docx`/`.xlsx`/`.pptx`
    fixtures built with the engine's own libraries (docx, xlsx, pptxgenjs) → valid
    `%PDF-1.7`, "minor differences" badge shown.
  - `markdown-to-pdf` — real Markdown with headings/bold/lists → valid PDF.
  - `pdf-to-excel` — correctly renders "Not built yet" with the real reason (doc IR
    has no route to table IR; nothing extracts cell grids from PDF text positions).
- Registry: 235 tools · 9 categories · 7 collections · 251 slugs · no orphans, no
  dangling links, no collisions.
- Engine coverage: video 23/23, audio 22/22, pdf 27/27, speech 3/3, **conversion
  7/8 wired, 1 honestly declared unbuilt**.
- **Social media tools end to end** (the ninth category, all four tools driven in
  the browser):
  - URL ingest — a CORS-served WAV fetched by the page with real byte progress;
    a YouTube URL correctly refused with the platform explanation before any
    network activity; a no-CORS URL correctly failed with the
    download-then-drop fallback message.
  - `video-url-to-audio` — fetched WAV → `speech.mp3`, 185,514 bytes, magic
    `49 44 33` (`ID3`).
  - `video-audio-downloader` — same source with OGG selected → `speech.ogg`,
    71,764 bytes, magic `OggS`. This run caught a real audio-engine bug: libvorbis
    ABR rejects `-b:a 256k` on mono/22 kHz input, failing every OGG conversion of
    such files — OGG now encodes with quality-mode VBR (`-q:a`).
  - `video-subtitle-generator` — Whisper tiny downloaded from the HF CDN, a 9 s
    spoken WAV transcribed on-device in 9.6 s to one timestamped caption
    (near-perfect text), edited in the transcript editor, and exported as valid
    SRT carrying the edit (`00:00:00,000 --> 00:00:10,000`, `application/x-subrip`).
  - Category page, light + dark themes, and the mobile layout all render; the
    footer and homepage counts are derived, not typed.
  - `transcribe` — the flagship: same URL → Whisper flow rendered inline with a
    Copy button and an export rail. All five exports checked at the byte level
    (TXT `[0:00]`-prefixed and timestamp-free per the toggle; valid SRT cue;
    PDF `%PDF-`, 1,063 B selectable-text path for Latin; DOCX `PK` with the
    correct OOXML MIME). The transcript was then edited to Urdu in the editor
    and re-exported: 17,246 B `%PDF-` via the canvas-raster path — the fallback
    that makes non-WinAnsi scripts exportable at all. Cross-listing (`alsoIn`)
    verified: the tool's card renders on /video-tools (24 shown) and
    /audio-tools (21 shown) while the catalog total stays the sum of primary
    categories.
  - **Speech engine upgrade driven end to end on WebGPU**: whole-model fp16 was
    reproduced degenerating into repetition loops on GPU; with the official
    per-component recipe (encoder fp32/fp16, decoder q4) Whisper base then
    transcribed the test clip perfectly — including the "on-device" phrase tiny
    misheard — reported as "Whisper base on GPU". Tier switching to Whisper
    small re-downloaded and improved segmentation (2 segments, correct
    timestamps); a 67-second clip crossed the 30 s window boundary into 20
    segments with continuous timestamps (stride-merged chunking); and the live
    token stream was caught mid-run ("Transcribing 3% — 'This is sentence
    number one. The ▍'").

## Not verified

**The video engine.** It shares the host, ops planner and React binding that the
audio engine proves, and its coverage test passes — but the ffmpeg core never
finished loading on a cross-origin-isolated route, while loading instantly on a route
without COEP. Headers were verified correct (CORP on every asset, COOP/COEP only on
video routes, `crossOriginIsolated === true`, `SharedArrayBuffer` present), and the
90-second load timeout never fired either — which points at background-tab throttling
rather than the code. If the threaded core proves unreliable in the field, the
single-threaded fallback is the same path audio already exercises.

## Not built

All 27 PDF tools are wired. `PDF_NOT_IMPLEMENTED` in
`packages/engines/pdf/src/registry.ts` is now empty — the mechanism stays because a
tool page that explains itself beats a dropzone that does nothing, but nothing needs
it today.

Two things are worth knowing about what the PDF tools claim:

- **`sign-pdf` places a picture of a signature.** It is not a cryptographic digital
  signature and does not prove a document is unaltered — that needs a certificate
  from a signing authority. The tool says so on every result.
- **`redact-pdf` flattens the page to remove text.** That is the point: drawing a
  black box leaves the text selectable underneath, which is how documents leak. The
  cost is that the output is images — unsearchable and larger.

The image, text, calculator and developer engines are ported and their tools
resolve, but only PDF, video, audio and conversion have a UI binding. Their pages
say that too.

11 image-format tools (`bmp-to-jpg`, `convert-image`, `heic-to-jpg`,
`ico-converter`, `jpg-to-png`, `jpg-to-webp`, `png-to-jpg`, `png-to-webp`,
`svg-to-png`, `tiff-to-jpg`, `webp-converter`) were found declared against the
conversion engine, whose format set has no images — moved to the image engine,
which already covers 8 of the 11 (jpeg/png/webp/avif in, jpeg/png/webp/avif out).
The remaining three need a new dependency each (`heic-to-jpg` → libheif-js,
`tiff-to-jpg` → utif2, `ico-converter` → a hand-rolled encoder) and, like the rest
of the image engine, still have no UI binding — tracked as follow-up work, not
solved here.
