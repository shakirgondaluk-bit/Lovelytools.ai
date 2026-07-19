# Reconciliation notes

What changed when the four source archives were merged into one codebase, and why.
Written for the next person who wonders "why isn't this the way I left it?"

Sources:

| Archive | Role it played |
|---|---|
| Design System v1.0 | Visual authority — tokens, 17 JSX components, guidelines |
| Technical Architecture (RFC-001) | Structural authority — Next.js 15, Turborepo, engine contract |
| Tool Registry v1.0 | Data authority — the catalog |
| UI Components | Code authority — 15 TSX components, ~6,000 LOC of engines |

The four disagreed with each other in specific, load-bearing ways. Where they did,
the rule was: **the source with authority over that concern wins, and the number
that can be derived is never stored.**

---

## Conflicts resolved

### 1 · Two component libraries

The Design System shipped 17 components as inline-style JSX; the UI Components
archive shipped 15 as Tailwind TSX. Ten overlapped.

**Resolution:** the TSX implementations won — they match the RFC-001 stack (Next.js,
Tailwind, RSC boundaries). The 12 DS-only components (`Button`, `Badge`, `Avatar`,
`Kbd`, `SegmentedToggle`, `Accordion`, `StatCounter`, `PricingCard`,
`TestimonialCard`, `BlogCard`, `CollectionCard`, `FloatingCard`) were ported to
Tailwind with their spec values intact. Nothing was dropped.

`Logo` existed twice — once as a DS primitive, once inlined in `header.tsx`. The
footer imported the header's copy, which made a static mark ship client JS while its
own doc comment claimed "Pure RSC — zero client JS". Both now use the primitive.

### 2 · The font tokens were broken

Ten TSX files and the Tailwind preset consumed `--font-grotesk` and
`--font-instrument`. **Nothing defined them** — the Design System defines
`--font-display` and `--font-body`. Every `font-grotesk` class in the codebase was
silently falling back to the system sans.

**Resolution:** `next/font` publishes `--font-grotesk` / `--font-instrument`;
`tokens/typography.css` folds them into the DS names, which stay canonical; the
preset resolves through the DS names. Both spellings now exist and agree.

Radius tokens also disagreed (DS `--r-lg: 12px` vs preset `lg: 13px`). The DS wins;
the preset now resolves through the token variables rather than restating values.

### 3 · Three different tool counts

The registry had 229 tools. `lib/categories.ts` hardcoded per-category counts summing
to 260. The homepage said "250+".

**Resolution:** the registry is the only source derived from actual tool definitions,
so it wins. `lib/categories.ts` is now a thin adapter over it, and **counts are
derived, never stored**. The homepage renders `TOTAL_TOOLS` — so the headline cannot
drift from the catalog again.

The count is rendered without a "+". "230+" would be the same overclaim as the old
"250+", and the DS voice is explicit: *numerals are content; stats must inform*.

### 4 · A dangling internal link

`pdf-to-png.related` pointed at `png-to-pdf`, which did not exist. Every other
conversion in the catalog has its inverse.

**Resolution:** added `png-to-pdf` as a real tool (the Conversion engine already
covers it via `pdf/ops/images-to-pdf`). Catalog: 229 → **230**.

15 further tools had no inbound links at all — invisible to crawlers, which RFC-001
§6 forbids. Each one's strongest outbound edge was made reciprocal.

### 5 · Compression was an engine that didn't exist

RFC-001 §3 specifies nine engines including a standalone Compression engine
(mozjpeg/oxipng/brotli/fflate). It was never built: image compression lives in the
image engine, PDF compression in `pdf/ops/compress.ts`.

**Resolution:** the four tools claiming `compression` now name the engine that does
their work. Compression is a capability, not an engine. **This is a deviation from
the approved RFC** — recorded here because it describes what shipped.

### 6 · 21 media tools pointed at a document-only engine

`extract-audio`, `mp4-to-gif`, `wav-to-mp3` and 18 others declared
`engine: 'conversion'`. The conversion engine's format set is
`pdf|doc|docx|xls|xlsx|ppt|pptx|txt|html|csv|xml|json` — **it cannot decode a video
or an audio file at all.** These tools could never have run.

**Resolution:** routed to the video/audio engines by category. Coverage tests in both
engines now assert the registry and the capability map agree *in both directions*, so
neither a tool without a capability nor a capability without a tool can survive CI.

### 7 · Video and audio engines didn't exist

RFC-001 §3 specified them; nothing implemented them. 43 tools had no engine.

**Resolution:** both built on ffmpeg.wasm — see `packages/engines/{video,audio}`.
Video uses the multithreaded core where `crossOriginIsolated` allows, and falls back
to single-threaded rather than failing.

---

## Known gaps

- **The audio-profile core.** RFC-001 §3 budgets "~6 MB". No such core is published;
  `@ffmpeg/core` is a single ~31 MB build. Producing an audio-only core means
  compiling ffmpeg with emscripten and a trimmed configure line, which belongs in
  `tooling/wasm-build`. Until then audio shares the standard core: correct output,
  ~25 MB more than budgeted.
- **Ratings and use counts.** These live in `tool_stats` (RFC-001 §4), not the
  registry. With no database connected they are absent, and `ToolCard` collapses its
  footer rather than showing invented numbers. `SoftwareApplication` JSON-LD emits no
  `aggregateRating` for the same reason.
- **UI for the other six engines.** `pdf`, `image`, `text`, `calculator`, `developer`
  and `conversion` are ported and typechecked, but only video and audio have a
  `ToolRunner` binding in this pass. Their tool pages say so plainly rather than
  rendering a dropzone that does nothing.
- **Not built:** auth, billing, the PWA service worker, i18n, sitemaps, blog. All
  specified in RFC-001; none in scope here.

---

### 8 · The nav and footer linked to 14 pages that didn't exist

The homepage rendered perfectly and its links went nowhere. `/pricing`, `/privacy`,
`/about`, `/terms`, `/contact`, `/login`, `/signup`, `/blog`, `/guides`,
`/tutorials`, `/comparisons`, `/help`, `/faq`, `/security` — and **`/tools`**, which
is the homepage's primary call to action ("Browse all tools", "All 230 tools →").
`/tools` was not even in `RESERVED_SLUGS`, so a tool could have claimed it and
shadowed the CTA.

**Resolution:** built `/tools`, `/pricing`, `/privacy`, `/about`, `/terms`,
`/contact`. For the rest, the honest move was to stop linking to them:

- **`/login`** — NextAuth is unbuilt. Link removed until it exists.
- **`/signup`** — "Get started" now points at `/tools`. Not a stopgap: RFC-001 §5 is
  anonymous-first and tool pages are never gated, so for this product getting
  started *is* opening a tool.
- **Editorial** (`/blog`, `/guides`, `/tutorials`, `/comparisons`, `/help`, `/faq`) —
  served from Postgres per RFC-001 §2; there is no database. The footer's Resources
  column and the Resources mega-panel were removed wholesale rather than shipping
  seven 404s.
- **`/ai-tool-finder`** — the `AIToolFinder` component exists, but neither the page
  nor its LLM route (`/api/v1/finder`) does. The Products panel's one accent CTA
  pointed at it; it now points at `/tools`.

`apps/web/scripts/check-links.ts` now fails the build on any hardcoded href that
doesn't resolve. This class of bug is invisible to TypeScript and to `next dev`.

### 9 · The Products mega-menu was empty

`mega-nav.tsx` partitioned categories with
`['pdf', 'image', 'video', 'audio'].includes(c.slug)` — slugs from the pre-merge
catalog. The registry renamed them to `pdf-tools`, `image-tools` and so on, so the
filter matched **nothing**: the Files & Media column was empty and Utilities held one
item. `string[].includes(string)` is legal, so TypeScript said nothing.

**Resolution:** the list is typed `CategorySlug[]` (a wrong slug is now a compile
error), and the second column is the *complement* of the first rather than a second
hand-kept list — so a new category must appear in one column or the other.

### 10 · Copy that had drifted from the truth

- The footer said **"250+ tools"**; the search bar's aria-label said
  **"Search 250+ tools"**; the AI finder said **"250+ tools is a lot of menu"**. All
  three now render `TOTAL_TOOLS`.
- The footer claimed **"Works offline · PWA"**. There is no service worker
  (RFC-001 §7 is unbuilt), so nothing works offline. Badge removed until it is true.
- The homepage FAQ said tools were "free to sign up for" on a site whose whole point
  is that there is nothing to sign up for.

### 11 · The ported engines were never typechecked

The first pass reported "typechecked clean across all six packages". Those six were
registry, ui, engines-core, engine-video, engine-audio and web — **not** the six
engines ported from the UI Components archive. Those had **101 errors** between them,
found only when someone asked whether PDF tools worked.

Most are `noUncheckedIndexedAccess` strictness the original code predates. Two are
real breakage from the port itself: `pdf-engine.ts`, `use-pdf-tool.ts` and
`image-engine.ts` import `EngineLimits` and `FREE_LIMITS` from `'../types'` — the old
flat `engine/types.ts`, which the RFC-001 package layout replaced with
`@lovelytools/engines-core`.

**Resolution:** engine-pdf is fixed and at zero. conversion (31), image (20),
devtools (21), text (9) and calculator (6) are still failing and are not in any CI
gate. `@lovelytools/engine-image` also imports `onnxruntime-web`, which isn't a
dependency — background removal cannot have ever run.

### 12 · Five more media tools on the document-only engine

Same defect as §6, found later: `jpg-to-pdf`, `png-to-pdf`, `image-to-pdf`,
`pdf-to-jpg` and `pdf-to-png` all declared `engine: 'conversion'`, whose FormatId has
no jpg and no png. One of them — `png-to-pdf` — was added *by this reconciliation* in
§4 and given the wrong engine, which is a good argument for the coverage tests that
now exist.

**Resolution:** routed to the pdf engine, which has `imagesToPdf()` and a pdfjs
rasteriser. The PDF engine now covers 27 tools; conversion drops to 19 genuine
document tools.

### 13 · The mega panels were transparent enough to read the hero through

The DS §Transparency rule is "only nav surfaces (`--nav-bg` at 82–85% + 18–24px
backdrop blur)". The mega panels followed it exactly, and the hero's 72px headline
showed straight through them — menu labels sitting on ghosted display type.

Nothing was implemented wrong: `backdrop-filter: blur(24px)` was computing, no
ancestor was breaking it, the token was correct. **The rule was written for the 64px
header bar and doesn't survive being applied to a 330px sheet that opens over the
hero.** At 82% the headline composites to ~`rgb(52,52,56)` on a `rgb(10,10,14)`
panel; at 97% it's still ~`rgb(19,19,24)`, a delta of ~7/255 the eye picks up across
a large flat area; and below ~1% bleed there's nothing left for the blur to blur.
Blur can't rescue it either — a 24px radius is small next to 72px glyphs, so it
smears the letters without hiding them.

**Resolution:** the panels get their own token, `--nav-panel-bg` — an opaque vertical
gradient. Frosted glass isn't see-through in the first place, so the glass now reads
through devices the DS already owns: the gradient for depth, the inset top highlight
and the float shadow (§Borders & shadows). `backdrop-filter` is dropped, which also
spares a repaint of the whole panel on scroll. `--nav-bg` stays exactly as specified
and is now used only by the 64px bar, where it works.

### 14 · Seven of the nine "unbuildable" PDF tools were buildable all along

This reconciliation declared nine PDF tools unimplementable, each with a reason. Seven
of those reasons were wrong — not subtly, but "I didn't look up the API" wrong:

| Tool | The claim | The reality |
|---|---|---|
| `crop-pdf` | "needs page-box manipulation" | `page.setCropBox()`, shipped in pdf-lib 1.x |
| `flatten-pdf` | "needs AcroForm flattening" | `form.flatten()` |
| `fill-pdf-form` | "needs AcroForm field reading and filling" | `form.getFields()`, `field.setText()` |
| `unlock-pdf` | "needs PDF decryption, which pdf-lib cannot do" | `load(bytes, { ignoreEncryption })` then re-save |
| `sign-pdf` | "needs digital signature support" | conflated a visible signature (embedPng + drawImage) with a cryptographic one |
| `redact-pdf` | "needs true redaction" | rasterise the page and the text is genuinely gone |
| `compare-pdf` | "needs a text-diff pass" | `extractText` already existed; the diff is ~40 lines |

Only two needed anything new: **tesseract.js** for OCR (RFC-001 §3 specified it and
nobody added it) and **@cantoo/pdf-lib** for `protect-pdf` — stock pdf-lib genuinely
has no `userPassword` option on save, so that one claim was correct.

The lesson isn't about PDFs. Every one of those seven was declared unbuildable
against a library that was **already a dependency**, without reading its API. A
capability claim is a factual claim; check it the way you'd check a bug report.

`@cantoo/pdf-lib` is imported only by `ops/security.ts`. Its `PDFDocument` is a
different class identity from pdf-lib's, and mixing the two inside one document would
be a real bug — but each op loads bytes and returns bytes, so the two never meet.

### 15 · The `PDF_NOT_IMPLEMENTED` mechanism was still right

Worth keeping even though it is now empty. It is what made the tool pages say "this
isn't built and here's what's missing" instead of rendering a dropzone that silently
did nothing, and it is what the coverage test uses to force every tool to be either
wired or explicitly accounted for. The mechanism was sound; the data in it was not.

### 16 · The conversion engine had no UI, 31 type errors, and 11 tools on the wrong engine

Same defect class as §12, still not fully stamped out: `bmp-to-jpg`, `convert-image`,
`heic-to-jpg`, `ico-converter`, `jpg-to-png`, `jpg-to-webp`, `png-to-jpg`,
`png-to-webp`, `svg-to-png`, `tiff-to-jpg` and `webp-converter` all declared
`engine: 'conversion'`, whose `FormatId` has zero image formats — only
`pdf|doc|docx|xls|xlsx|ppt|pptx|txt|html|csv|xml|json`. Routed to the image engine,
which already decodes/encodes 8 of the 11; the remaining three (`heic-to-jpg`,
`ico-converter`, `tiff-to-jpg`) need a new dependency each and are flagged as
follow-up work, not solved here. Conversion drops to 8 genuine document tools.

Those 8 had never been typechecked (§11's 31 errors, all `noUncheckedIndexedAccess`)
and had no UI at all — `ToolRunner` had no `engine === 'conversion'` branch. Fixed the
same way as the PDF engine: a `registry.ts` binding, a coverage test that also calls
`planRoute()` for every bound target so a route that doesn't exist fails loudly
instead of shipping (`pdf-to-excel` has no route — doc IR never produces tables — and
is honestly declared unbuilt rather than faked), and a `ConversionRunner` island.

One route, `pdf-to-word`, failed silently even after all of that — see the pdf.js
entry below. All 7 wired tools (`markdown-to-pdf`, `html-to-pdf`, `word-to-pdf`,
`excel-to-pdf`, `powerpoint-to-pdf`, `pdf-to-word`, `pdf-to-powerpoint`) are now
byte-verified: real `.docx`/`.pptx` (`PK\x03\x04`, correct MIME) and real `.pdf`
(`%PDF-1.x` header, `%%EOF` trailer) out the other end, with the fidelity badge
rendering correctly for the `good`/`text-only` routes.

## Traps worth remembering

Four bugs here were invisible to the type system and to `next dev`. They cost hours.

- **COEP blocks your own scripts.** `Cross-Origin-Embedder-Policy: require-corp`
  blocks every subresource that doesn't opt in — including same-origin JS chunks. The
  ffmpeg chunk failed with `ERR_BLOCKED_BY_RESPONSE`: the header meant to *enable*
  threading is what broke it. `Cross-Origin-Resource-Policy: same-origin` on
  everything we serve is the required counterpart.
- **Immutable caching demands content hashing.** The cores are served
  `immutable, max-age=1y`. Serving new bytes at an old URL is invisible to every
  browser holding the old copy — for a year. A stale UMD core survived being replaced
  by the ESM one, and the engine failed with "failed to import ffmpeg-core.js" while
  the correct file sat on disk. `tooling/wasm-build` content-hashes every core; the
  manifest is the only stable URL, and it is `no-cache`.
- **`DOM` and `WebWorker` libs conflict.** A vendored `worker.d.ts` staged into
  `public/` carried `/// <reference lib="webworker" />`. `public/` was inside the
  app's tsconfig glob, so that one line pulled the WebWorker lib into the whole
  program and made `window` and `HTMLInputElement.value` stop existing in files
  nowhere near a worker. `public/` is now excluded and no `.d.ts` is staged.
- **`next/font` + registry SEO titles double the brand suffix.** The registry's
  `seo.title` is a complete `<title>`, suffix included; the layout's `%s |
  lovelytools.ai` template appended it again on all 245 pages. Templates pass
  `title: { absolute }`, and `registry:check` now asserts the suffix appears exactly
  once.
- **pdf.js needs three URLs, and fails differently for each.** Without `workerSrc`
  every call throws immediately. Without `standardFontDataUrl` it *parses* fine but
  *rendering* a page never resolves. Without `cMapUrl` CJK text extracts as mojibake.
  Four call sites each did a bare `await import('pdfjs-dist')` and configured none of
  it, so `pdf-to-text` passed while `pdf-to-jpg` hung — the asymmetry is what made it
  hard to see. Everything now goes through `openPdfDocument()` in
  `packages/engines/pdf/src/pdfjs.ts`, and nothing else may open a document.
- **A hang is worse than a crash.** Three separate bugs in this codebase presented as
  a pending promise with no error, no rejection and no network request: ffmpeg's
  class worker, pdf.js's missing workerSrc, and pdf.js's render. Every await on a
  third-party engine is now bounded by a timeout that fails with a sentence a user
  can act on.
- **pdf.js TRANSFERS the buffer you hand it, detaching yours.** `getDocument({data})`
  gives the bytes to its worker; the caller's ArrayBuffer is empty from that moment.
  It surfaces two ways, and the loud one is the lucky one:
  `new Uint8Array(detached)` throws "Cannot perform Construct on a detached
  ArrayBuffer" (compress-pdf hit this returning the original); but
  `detached.byteLength` just returns **0**, so every op that read
  `input.buf.byteLength` for its stats *after* rendering reported `bytesIn: 0` — a
  silent "100% smaller" on a file that hadn't shrunk. `openPdfDocument()` now hands
  pdf.js a copy, and the ops measure their input before giving it away. Notably
  `optimize-pdf` was always right, because pdf-lib copies rather than transfers —
  the discrepancy between the two compress modes was the tell.
- **pdf.js opened from inside a Worker hijacks its own postMessage channel.** The
  conversion engine, unlike the PDF engine, fans jobs across a pool of its own
  workers — so pdf.js gets asked to open a document from inside one. Its same-origin
  check reads `window.location`, which doesn't exist in a Worker; the resulting
  `ReferenceError` is swallowed by pdf.js's own try/catch, which falls back to a
  same-thread "fake worker" by dynamically `import()`-ing its worker script. That
  script's top level has its own check — `typeof window === "undefined" && typeof
  self.postMessage === "function"` — meant to detect "I was loaded as a real
  worker's entry point." True on a genuine top-level worker; also true here, because
  we're already inside one. It self-installs pdf.js's protocol directly onto *our*
  worker's `self`, and its "ready" handshake lands in our own pool's `onmessage` as
  if it were our job's result — with no `code` or `message`, so `new
  EngineError(undefined, undefined)` rejects the job with an **empty string**, a
  Promise that only settles once, and a UI with no text to show. The fix is a
  one-line polyfill — `(self as any).window = self` — so pdf.js's same-origin check
  resolves and it takes its normal nested-`Worker` path instead of ever reaching the
  fallback. It has to run unconditionally, not behind `typeof window ===
  'undefined'`: Next.js's client webpack build constant-folds that check to `false`
  for every browser-targeted chunk — worker chunks included, since the bundler only
  distinguishes server from client, not main-thread from worker — so a guarded
  version is dead-code-eliminated before it reaches the browser. Unconditional is
  also correct on the main thread, where `window.window === window` already holds.
- **A stat that's meaningless is worse than no stat.** With `bytesIn` fixed,
  `pdf-to-text` started truthfully reporting "95% smaller" — for a PDF→TXT
  extraction, which isn't compression at all. The number was only hidden before
  because it was broken. Savings now render only for the compress ops.
- **Duplicating a loop duplicates everything except the part that mattered.**
  `redact-pdf` was written with its own copy of the pdf.js render loop rather than
  reusing `render.ts`, and inherited every line except the timeout — so it hung
  forever on page 1, the one failure mode the shared helper exists to prevent. It now
  calls `renderPage`/`makeCanvas`/`toBlob` like everything else.
- **A timeout that can't explain itself is half a timeout.** That same render timeout
  threw a plain `Error`, and `usePdfTool` shows a `PdfError`'s message verbatim while
  replacing anything else with "Something went wrong with this file". The useful
  sentence was being thrown away at the last step. It throws a `PdfError` now.
