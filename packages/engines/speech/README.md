# @lovelytools/engine-speech

On-device speech recognition: Whisper (multilingual) running in the browser via
`@huggingface/transformers`, at the best build each device supports. Powers the
transcription tools in the social-media-tools category:

- `/transcribe` (flagship — model tier picker, streaming, document exports)
- `/video-url-caption-generator`
- `/video-subtitle-generator`

## Model tiers and devices

Four tiers (SPEECH_MODELS), each an onnx-community ONNX export; `balanced` is
the default:

| Tier | Model | WASM (q8) | WebGPU |
| --- | --- | --- | --- |
| fast | whisper-tiny | ~42 MB | ~60 MB |
| balanced | whisper-base | ~75 MB | ~200 MB |
| high | whisper-small | ~190 MB | ~290 MB |
| max | whisper-large-v3-turbo | — refused | ~725 MB |

WebGPU runs 10–40× faster than WASM and is tried first, falling back
automatically. `max` is WebGPU-only: turbo on CPU WASM would take longer than
re-recording the audio, so it isn't offered there.

**The dtype recipe is load-bearing.** On WebGPU a whole-model `fp16` makes the
*decoder* fp16, which is broken — Whisper degenerates into repetition loops
("I think I think I think…"; reproduced here before the fix). Per the official
realtime-whisper-webgpu example: encoder fp32 (fp16 also works; fp32 used where
affordable), decoder **q4**, never fp16. turbo uses q4 for both (its fp32
encoder is 2.4 GB).

## How it holds the platform invariant

The governing rule (engines-core): no engine sends file bytes anywhere. This
engine **receives** ~40 MB of model weights from the Hugging Face CDN on first
use — cached by the browser after that — and sends nothing. The audio being
transcribed is decoded, resampled and transcribed entirely on the device. Weights
coming in are not user data going out, and the tool pages say exactly that.

This is also why these routes must NOT carry `COEP: require-corp` (only video
routes do): the model download is a cross-origin fetch.

## Pipeline

1. **Decode** (`decode.ts`) — `AudioContext.decodeAudioData` opens anything the
   browser's media stack plays (MP3/WAV/AAC/OGG and the audio inside
   MP4/WebM/MOV), then an `OfflineAudioContext` renders it to mono 16 kHz
   Float32 PCM — Whisper's native input. No WASM core needed for this stage.
2. **Transcribe** (`transcribe.ts`) — the pipeline's own 30 s chunking with 5 s
   stride, so words at window edges are merged instead of cut. A
   `WhisperTextStreamer` provides token-level partial text (surfaced live in
   the UI) and real progress from the chunk offset the model is actually at;
   abort is checked inside the streamer callbacks and unwinds generation.
3. **Serialize** (`format.ts`) — pure functions to SRT / VTT / TXT, unit-tested
   at the byte level in Node.

## Limits and honesty

- 60-minute hard cap (`too-large`); a long-file warning fires only on WASM,
  where inference runs near real time — a progress bar that outlives patience
  is a lie of omission.
- Results carry `model` and `device` so the UI can say what actually ran.
- `auto` language adds a warning that detection ran automatically.
- Empty transcription is an error with a suggestion (set the language), not a
  silent empty file.
- Recognition output is a *draft* — the UI puts an editor in front of every
  export for exactly that reason.

## Tests

- `coverage.test.ts` — registry ↔ engine agreement, both directions (the same
  contract every engine asserts).
- `format.test.ts` — byte-exact SRT/VTT/TXT serialization, including empty-line
  dropping and SRT renumbering.

Decode and transcription are exercised in the browser (they need an
`AudioContext` and the model), not in Node — see the repo README's Verified
section for what was actually driven.
