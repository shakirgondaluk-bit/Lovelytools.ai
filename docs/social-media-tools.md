# Social Media Tools — architecture

The ninth category: `/social-media-tools`, four tools, two engines. This
document is the deliverable set that doesn't live in code: the architecture
decisions, the server-plane schema these tools would use when that plane is
built, the security posture, and the testing strategy.

## The one decision everything follows from

lovelytools.ai has a governing invariant (README, engines-core): **every engine
runs on the user's device; there is no upload endpoint anywhere in the
codebase**. "Accept a public video URL" therefore means:

> The **user's browser** fetches a **direct media file URL** and hands the
> engine a `File` — exactly as if it had been dropped. No server proxy exists,
> because a proxy would put user media on our servers.

Two honest consequences, both surfaced in the UI instead of papered over:

1. **Platform pages cannot work.** A YouTube/TikTok/Instagram link is an HTML
   page, not a media file; extracting its streams requires server-side scraping
   that violates those platforms' terms and, for DRM'd media, the law. The URL
   validator detects 13 platform host families and explains the export-then-drop
   path for the user's own content. This is "when legally permitted" made
   concrete rather than left as a disclaimer.
2. **The host must allow CORS reads.** When it doesn't, the error says exactly
   what to do (download the file, drop it in) and why the result is identical.

## Component architecture

```
packages/registry                      ★ category + 4 tools (data, Zod-validated)
packages/engines/speech                NEW — Whisper tiny via @huggingface/transformers
  src/types.ts                         capabilities, segments, languages, limits
  src/decode.ts                        File → mono 16 kHz PCM (browser decoder, no WASM)
  src/transcribe.ts                    model host; 30 s windows; real progress both phases
  src/format.ts                        segments → SRT / VTT / TXT (pure, byte-tested)
  src/speech-engine.ts                 ToolEngine<SpeechInput, SpeechResult>
  src/use-speech-tool.ts               React binding (create-with-island, dispose-with-island)
packages/engines/audio                 EXISTING — gained 2 slug bindings (audio.extract)
apps/web
  lib/url-ingest.ts                    validation · platform detection · streaming fetch
  components/social-runner.tsx         the island: source step → extract | caption step
  components/social-category-search.tsx  in-category live search island
  components/templates/social-category-template.tsx  hub: hero/search/featured/FAQ/SEO/related
  app/[slug]/page.tsx                  + CUSTOM_CATEGORY_TEMPLATES map
```

Routing is untouched: the flat namespace serves `/social-media-tools` and all
four tool slugs from the registry via `generateStaticParams`, and the sitemap,
nav, footer, mega-menu and homepage counts derive automatically.

### Tool → engine mapping

| Tool | Engine | Capability |
| --- | --- | --- |
| `/video-url-to-audio` | audio (ffmpeg.wasm) | `audio.extract` → MP3 |
| `/video-audio-downloader` | audio (ffmpeg.wasm) | `audio.extract` + format/quality options |
| `/video-url-caption-generator` | speech (Whisper) | `speech.transcribe` |
| `/video-subtitle-generator` | speech (Whisper) | `speech.transcribe` |
| `/transcribe` | speech (Whisper) | `speech.transcribe`, auto language; inline transcript + Copy + TXT/PDF/DOCX/SRT/VTT exports; cross-listed on video-tools and audio-tools via `alsoIn` |

PDF export note (`apps/web/lib/transcript-export.ts`): pdf-lib's standard fonts
only encode WinAnsi, and no Unicode font ships offline — so Latin transcripts get
a real selectable-text PDF, and every other script (Urdu, Arabic, CJK, …) gets
pages the browser rendered to canvas and embedded as images. Correct glyphs and
bidi everywhere; the trade is selectability, taken deliberately over a PDF that
throws on non-Latin text.

The URL fetch is app-layer, shared by all four. By the time an engine runs,
both input paths have converged on a `File`.

## API architecture

**There are no new API routes, deliberately.** Serverless media downloading,
proxying, or transcription would each violate the platform invariant. The API
posture is:

- URL ingest: `fetch()` from the client, `mode: 'cors'`, `credentials: 'omit'`,
  streamed with byte-accurate progress and a hard size cap.
- Model delivery: Hugging Face CDN (cross-origin, cached by the browser). This
  is why social routes must **not** carry `COEP: require-corp` — only video
  engine routes do (see next.config.ts).
- The only future server involvement is the stats plane below — counters and
  ratings, never media.

## Database models (server plane, RFC-001 §4)

There is no database in this repo today; the registry is the catalog and stats
are honestly omitted from the UI until this plane exists. When it is built,
these tools need nothing beyond the standard stats tables:

```sql
-- One row per registry slug; the registry stays the source of truth for
-- everything descriptive. Postgres only ever stores what the client can't:
-- aggregate usage.
CREATE TABLE tool_stats (
  slug          text PRIMARY KEY,          -- FK-by-convention to the registry
  uses          bigint      NOT NULL DEFAULT 0,
  rating_sum    bigint      NOT NULL DEFAULT 0,
  rating_count  bigint      NOT NULL DEFAULT 0,
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Anonymous, aggregate-only events. No URL, no filename, no transcript — the
-- payload is the slug and coarse outcome, nothing derived from user media.
CREATE TABLE tool_events (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  slug        text        NOT NULL,
  event       text        NOT NULL CHECK (event IN ('run','done','error','cancelled')),
  engine      text        NOT NULL,        -- 'audio' | 'speech'
  duration_ms integer,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON tool_events (slug, created_at);
```

What is deliberately **not** modeled: transcripts, source URLs, media metadata.
Storing any of them would contradict the product's one promise.

## Security validation

- **URL validation before any network activity**: https-only (http allowed for
  localhost only), platform-host blocklist by registrable-domain suffix,
  content-type/extension media check after response, streamed size enforcement
  against `FREE_LIMITS.maxBytesPerFile` even when Content-Length lies.
- **No credentials attached** to media fetches (`credentials: 'omit'`) — a
  pasted URL can't be used to exfiltrate an authenticated resource the user can
  see but the public can't.
- **Transcript editor renders text as text** (React escaping; no
  `dangerouslySetInnerHTML` anywhere in the runner).
- Existing site headers (nosniff, frame-deny, HSTS, CORP) apply; social routes
  intentionally get no COEP (model CDN fetch).

## Error handling & progress

Every failure path speaks in the user's language with a next step: invalid URL,
platform URL (with the export-then-drop path), CORS, HTTP status, non-media
content type, size cap, decode failure, model download failure, empty
transcription (suggests setting the language). Progress is real in every phase —
fetch bytes, model download bytes, ffmpeg timestamps, transcription windows
completed — never a simulated timer (RFC-001 §3).

## Testing strategy

1. **Registry gates** (`pnpm registry:check`): slug collisions, SEO budgets,
   dangling/orphan links — the 4 tools, their `related` edges and the creator
   collection additions all pass through it.
2. **Coverage tests** (`pnpm test`): speech ↔ registry agreement both
   directions, audio ↔ registry (now including the two new bindings) — the same
   contract every engine asserts.
3. **Unit tests in Node**: `format.test.ts` asserts SRT/VTT/TXT output at the
   byte level, including empty-segment dropping and SRT renumbering.
4. **Link check** (`check:links`): every hardcoded href in the new templates
   resolves against the app's routes.
5. **Browser verification** (what CI can't do): URL fetch of a real
   CORS-enabled media file → MP3 with correct magic bytes; a transcription run
   including the one-time model download; keyboard-only pass through both
   runners; both themes. Nondeterministic model output is checked for shape
   (segments, timestamps monotonic), not exact text — same policy the devtools
   engine set for nondeterministic ops.

## Rollout

1. Land category + engines + UI (this change) behind the existing gates.
2. Watch the model-download failure rate in the field; if the HF CDN proves
   unreliable, self-host the ONNX weights through `tooling/wasm-build` like the
   ffmpeg cores (the engine already resolves assets by URL, so this is a config
   change, not a rewrite).
3. When the stats plane lands, wire `tool_stats` reads into the cards — the UI
   already degrades correctly while they're absent.
4. Candidates for a second pass: word-level timestamps (Whisper supports them),
   burned-in subtitle export via the video engine, and a `speech.translate`
   capability (Whisper can translate to English) — each is one capability plus
   one registry row.
