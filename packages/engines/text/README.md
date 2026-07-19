# lovelytools.ai — Text Engine (`engine/text/`)

Pure-TypeScript engine powering the Text Tools family (28 tools). No canvas, no
workers for the common ops (they run in <1 ms on keystroke); only diff and large
transforms yield to `requestIdleCallback`. Nothing leaves the tab.

## Layout

```
engine/text/
├── types.ts          # op contract, TextResult, segmentation helpers
├── segment.ts        # Intl.Segmenter graphemes/words/sentences + locale rules
├── registry.ts       # op registry: slug → definition (drives tool pages + SEO)
├── use-text-tool.ts  # React hook: live input → result, debounced heavy ops
└── ops/
    ├── stats.ts      # word / char / sentence / paragraph / reading-time counts
    ├── case.ts       # upper / lower / title / sentence / camel / snake / kebab…
    ├── clean.ts      # trim, collapse spaces, strip HTML, smart-quote fix, dedupe
    ├── sort.ts       # line sort (alpha / natural / length / numeric), reverse
    ├── diff.ts       # Myers line + word diff → change ops for the UI
    ├── encode.ts     # base64 / URL / HTML-entity / hex — encode + decode
    ├── slugify.ts    # URL slugs with Unicode transliteration
    └── lorem.ts      # deterministic lorem ipsum (seeded, so output is stable)
```

## The op contract

```ts
(input: string, options: TOptions) => TextResult
```

- Pure and synchronous — no I/O, no randomness (lorem takes a seed).
- `TextResult` carries `output` plus `stats` (before/after counts) and optional
  `segments` (for diff highlighting). The UI reads counts from here — it never
  re-counts.
- Every op is reversible where it makes sense (`encode` ⇄ `decode` share a
  definition with a `direction` option) so one tool page serves both.

## Unicode correctness

- **Counting uses `Intl.Segmenter`**, not `.length` or `.split('')`. "👨‍👩‍👧‍👦"
  is one grapheme, "café" is 4 characters, CJK counts by character not by
  whitespace-delimited words. Locale drives word/sentence boundaries.
- **Case transforms are locale-aware** (`toLocaleUpperCase`) — Turkish dotless-ı,
  German ß handled by the platform, not a hand-rolled map.
- **Slugify transliterates** via `String.normalize('NFKD')` + combining-mark
  strip, with a small curated map for characters NFKD doesn't decompose (ø, ł,
  đ, ß, æ) so slugs are stable and readable.

## Performance

- Common ops (stats, case, clean, sort, slugify) run synchronously on every
  keystroke — measured <1 ms up to ~100 k chars.
- `diff` is O(ND) Myers; inputs over ~20 k chars per side are debounced and run
  in an idle callback with a "computing diff…" state (real, not simulated).
- No dependencies. Reading time uses 238 wpm (Medium's figure); configurable.
