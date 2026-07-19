# lovelytools.ai — Conversion Engine (`engine/`)

Client-side conversion engine per **RFC-001**: files never leave the device.
Detection, route planning, and per-format converters run in a Web Worker pool;
heavy libraries load lazily per format family.

## Architecture

```
UploadZone (File[])
   │
   ▼
detect.ts        magic-byte sniffing (ZIP/CFB container inspection — extensions lie)
   │
   ▼
routes.ts        planner: source → IR → target (≤ 2 hops through an intermediate representation)
   │
   ▼
worker-pool.ts   N = min(hardwareConcurrency, 4) module workers, transferable ArrayBuffers
   │
   ▼
converters/      document.ts (HTML IR) · table.ts (workbook IR) · data.ts (value IR)
   │
   ▼
ConversionResult { blob, filename, warnings, fidelity }   → Download all (zip via client)
```

### Intermediate representations (ir.ts)

- **DocIR** — sanitized HTML + metadata. Producers: PDF (text layer), DOC, DOCX, TXT, HTML, PPT(X) outline. Consumers: PDF, DOCX, TXT, HTML, PPTX.
- **TableIR** — workbook (sheets → rows → typed cells). Producers: XLS, XLSX, CSV, JSON (array), XML (flat), HTML tables, TSV. Consumers: XLSX, CSV, JSON, XML, HTML, TXT, PDF.
- **DataIR** — plain JS value. Producers/consumers: JSON, XML, CSV.

A conversion is legal iff some IR has the source as producer and target as consumer.
`targetsFor(from)` derives the UI's target dropdown from the same graph — the matrix
is never hand-maintained.

### Fidelity contract

Every result carries `fidelity`:
- `high` — structure + styling preserved (e.g. XLSX→CSV, DOCX→HTML, JSON→XML)
- `good` — layout re-flowed (e.g. DOCX→PDF, HTML→DOCX)
- `text-only` — content extracted, layout dropped (e.g. PDF→DOCX, PPT→TXT)

The UI must surface `text-only` before download (DS §12 error/warning pattern).

### Libraries (all lazy `import()`, bundled by Next — nothing fetched at runtime)

- `pdfjs-dist` — PDF text/structure extraction
- `pdf-lib` — PDF generation (text flow + tables)
- `mammoth` — DOCX → HTML
- `docx` — HTML/DocIR → DOCX
- `xlsx` (SheetJS CE) — XLS/XLSX/CSV/HTML-table workbook I/O
- `jszip` — PPTX read; batch download zips
- `pptxgenjs` — DocIR outline → PPTX
- `cfb` — legacy CFB containers (DOC/XLS/PPT stream extraction)

Legacy binary DOC/PPT are **text-only extract** (CFB stream parse). XLS is full
fidelity via SheetJS. Producing legacy formats (→DOC/XLS/PPT) is intentionally
unsupported — modern equivalents are offered instead (`suggestModern()`).

## Wiring into apps/web

```tsx
'use client';
import { useConversion } from '@lovelytools/engine/use-conversion';

const { jobs, addFiles, convertAll, downloadAll } = useConversion({ target: 'pdf' });
// <UploadZone onFiles={addFiles} /> · jobs map 1:1 onto <ProgressRow />
```

## Limits (enforced in engine.ts, mirrors registry)

Free: 10 files / 200 MB each · Pro: 200 files / 2 GB each. Same-format no-ops are
rejected with a friendly error. All processing is cancellable (`AbortSignal`).
