# lovelytools.ai — Developer Tools Engine (`engine/dev/`)

Pure-TypeScript engine powering the Developer Tools family (26 tools).
Everything runs on-device — **secrets never leave the tab**: JWTs are decoded
locally, hashes computed via WebCrypto, no analytics events carry tool input.

## Layout

```
engine/dev/
├── types.ts          # op contract (mirrors engine/text), DevResult, errors
├── registry.ts       # op registry: slug → definition (drives tool pages + SEO)
├── use-dev-tool.ts   # React hook: live input → result, async ops supported
└── ops/
    ├── json.ts       # format / minify / validate with line+column errors, sort keys
    ├── jwt.ts        # decode header/payload, exp/nbf/iat checks — NO verification theater
    ├── hash.ts       # SHA-1/256/384/512 via WebCrypto (async), hex/base64 out
    ├── uuid.ts       # v4 (crypto.getRandomValues) + v7 (time-ordered), bulk
    ├── regex.ts      # live tester: matches, groups, replace preview, safety timeout
    ├── timestamp.ts  # unix ⇄ ISO ⇄ human, ms/s autodetect, timezone table
    ├── color.ts      # hex ⇄ rgb ⇄ hsl ⇄ oklch, contrast ratio (WCAG)
    ├── base-n.ts     # number bases 2–36, two's-complement view for negatives
    └── url-parse.ts  # URL anatomy: origin, path, query params table, punycode
```

## The op contract

Same shape as the Text Engine, plus async support (WebCrypto is async):

```ts
run: (input: string, options: DevOptions) => DevResult | Promise<DevResult>
```

- `DevResult` carries `output` plus optional `fields` (labeled key/value rows —
  JWT claims, URL parts, color spaces) and `annotations` (line/column markers —
  JSON errors, regex match positions). The UI renders these generically.
- Errors are `DevError` with a `position` when known: the editor scrolls to and
  highlights the offending line — "Unexpected , at line 14, column 8", never
  a bare "Invalid JSON".

## Security honesty

- **jwt.ts decodes; it does not verify.** Signature verification without the
  key is theater — the UI says "decoded, not verified" in so many words, and
  shows exp/nbf status from the local clock with a skew warning.
- **hash.ts** uses WebCrypto (`crypto.subtle.digest`) — no JS hash
  implementations to get subtly wrong. MD5 is intentionally absent; the UI
  explains why and offers SHA-256.
- **uuid.ts** uses `crypto.getRandomValues` — never `Math.random`.
- **regex.ts** guards against catastrophic backtracking with a 200 ms budget
  in a disposable Worker — a hostile pattern kills the worker, not the tab.

## Performance

Sync ops (JSON, timestamp, color, base-n, URL) run on keystroke. Async ops
(hash) and guarded ops (regex) debounce 150 ms. JSON formatting streams up to
~10 MB before suggesting the file-based flow.
