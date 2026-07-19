// lovelytools.ai — Speech Engine · shared types.
//
// On-device speech recognition (Whisper tiny, multilingual, via
// @huggingface/transformers). The model weights (~40 MB) download once from the
// Hugging Face CDN and are cached by the browser; the user's audio never leaves
// the device — the engines-core invariant holds because weights coming IN are not
// file bytes going OUT.

export type SpeechCapability = 'speech.transcribe';

export const SPEECH_CAPABILITIES: SpeechCapability[] = ['speech.transcribe'];

/** One caption line: seconds in, seconds out, what was said. */
export interface TranscriptSegment {
  id: number;
  /** Seconds from the start of the media. */
  start: number;
  end: number;
  text: string;
}

/**
 * Whisper-tiny is multilingual; 'auto' lets the model detect the language per
 * window. The list is the subset with usable tiny-model accuracy — small enough
 * for one <select>, honest about what the model actually does well.
 */
export const SPEECH_LANGUAGES = [
  { code: 'auto', label: 'Detect automatically' },
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'it', label: 'Italian' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'nl', label: 'Dutch' },
  { code: 'pl', label: 'Polish' },
  { code: 'ru', label: 'Russian' },
  { code: 'tr', label: 'Turkish' },
  { code: 'ar', label: 'Arabic' },
  { code: 'hi', label: 'Hindi' },
  { code: 'ur', label: 'Urdu' },
  { code: 'id', label: 'Indonesian' },
  { code: 'ja', label: 'Japanese' },
  { code: 'ko', label: 'Korean' },
  { code: 'zh', label: 'Chinese' },
] as const;

export type SpeechLanguage = (typeof SPEECH_LANGUAGES)[number]['code'];

/** Where inference ran. WebGPU is 10–40× faster; WASM is the universal fallback. */
export type SpeechDevice = 'webgpu' | 'wasm';

/**
 * Model accuracy tiers. Each is a different Whisper build from onnx-community's
 * systematic ONNX exports; bigger is more accurate and slower to download and run.
 */
export type SpeechModelTier = 'fast' | 'balanced' | 'high' | 'max';

export interface SpeechModelSpec {
  tier: SpeechModelTier;
  /** Hugging Face repo id. */
  id: string;
  /** Shown to the user in results and pickers. */
  label: string;
  /**
   * Approximate one-time download per device build (q8 on WASM, fp16/q4f16 on
   * WebGPU). null = not offered on that device: large-v3-turbo on CPU WASM
   * would take longer than re-recording the audio, so we honestly don't.
   */
  bytes: Record<SpeechDevice, number | null>;
}

export const SPEECH_MODELS: Record<SpeechModelTier, SpeechModelSpec> = {
  // webgpu sizes follow the per-component dtype recipe in transcribe.ts
  // (encoder fp32/fp16/q4 + decoder q4), measured from the repos' file listings.
  fast: {
    tier: 'fast',
    id: 'onnx-community/whisper-tiny',
    label: 'Whisper tiny',
    bytes: { wasm: 42_000_000, webgpu: 60_000_000 },
  },
  balanced: {
    tier: 'balanced',
    id: 'onnx-community/whisper-base',
    label: 'Whisper base',
    bytes: { wasm: 75_000_000, webgpu: 200_000_000 },
  },
  high: {
    tier: 'high',
    id: 'onnx-community/whisper-small',
    label: 'Whisper small',
    bytes: { wasm: 190_000_000, webgpu: 290_000_000 },
  },
  max: {
    tier: 'max',
    id: 'onnx-community/whisper-large-v3-turbo',
    label: 'Whisper large-v3-turbo',
    bytes: { wasm: null, webgpu: 725_000_000 },
  },
};

/** The tier used when the caller doesn't choose. base ≫ tiny for the same UX. */
export const DEFAULT_MODEL_TIER: SpeechModelTier = 'balanced';

export interface SpeechOptions {
  /** 'auto' (default) lets Whisper detect the language. */
  language?: SpeechLanguage;
  /** Accuracy tier; DEFAULT_MODEL_TIER when omitted. */
  model?: SpeechModelTier;
}

export interface SpeechInput {
  file: File;
  capability: SpeechCapability;
  options?: SpeechOptions;
  /**
   * Live partial-transcript callback, fired as tokens stream out of the model.
   * UI-only affordance — the authoritative result is still SpeechResult.
   */
  onPartial?: (text: string) => void;
}

export interface SpeechResult {
  segments: TranscriptSegment[];
  /** The full transcript, segments joined. */
  text: string;
  durationSec: number;
  inputBytes: number;
  /** Which model actually ran (label from SPEECH_MODELS). */
  model: string;
  /** Where it ran. */
  device: SpeechDevice;
  warnings: string[];
  elapsedMs: number;
}

/** Anything the browser's audio decoder can open — video containers included. */
export const SPEECH_ACCEPT =
  'video/mp4,video/webm,video/quicktime,audio/mpeg,audio/wav,audio/flac,audio/aac,audio/ogg,audio/mp4,.mp4,.webm,.mov,.m4v,.mp3,.wav,.flac,.aac,.ogg,.m4a';

/** Whisper's native input format. */
export const WHISPER_SAMPLE_RATE = 16_000;

/** Whisper processes 30-second windows natively; we window at that size. */
export const WINDOW_SECONDS = 30;

/**
 * Hard ceiling on media length. Whisper-tiny on WASM runs near real time, so an
 * hour of audio is an hour of fan noise — past this the honest answer is "too
 * long", not a progress bar that outlives the user's patience.
 */
export const MAX_DURATION_SECONDS = 60 * 60;

/** Past this we warn that transcription will take a while before starting. */
export const LONG_DURATION_SECONDS = 10 * 60;
