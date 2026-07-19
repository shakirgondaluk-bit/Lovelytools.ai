// lovelytools.ai — Speech Engine (RFC-001 §3 contract).
//
// Whisper in the browser, at the best build the device supports: model tiers
// from tiny to large-v3-turbo, WebGPU inference with WASM fallback, streamed
// partial text. Three real stages, each with real progress:
//   1. model download (once per tier, then cached) — byte counts from the library
//   2. decode to 16 kHz mono PCM                   — the browser's own decoder
//   3. transcription                               — chunk offsets from the model
import {
  EngineError,
  FREE_LIMITS,
  formatBytes,
  type EngineContext,
  type EngineLimits,
  type Job,
  type ProgressFn,
  type ToolEngine,
} from '@lovelytools/engines-core';
import { decodeToWhisperPcm } from './decode';
import { WhisperHost } from './transcribe';
import {
  DEFAULT_MODEL_TIER,
  LONG_DURATION_SECONDS,
  SPEECH_CAPABILITIES,
  SPEECH_MODELS,
  type SpeechInput,
  type SpeechResult,
} from './types';

export class SpeechEngine implements ToolEngine<SpeechInput, SpeechResult> {
  readonly id = 'speech' as const;
  readonly capabilities = SPEECH_CAPABILITIES;
  // Not a self-hosted WASM core: models stream from the Hugging Face CDN on
  // first use and land in the browser's cache. Declared at the default tier so
  // the size is visible where every engine declares its weight.
  readonly wasm = [
    {
      url: `https://huggingface.co/${SPEECH_MODELS[DEFAULT_MODEL_TIER].id}`,
      version: DEFAULT_MODEL_TIER,
      approxBytes: SPEECH_MODELS[DEFAULT_MODEL_TIER].bytes.wasm ?? 0,
    },
  ];

  private host = new WhisperHost();

  constructor(private limits: EngineLimits = FREE_LIMITS) {}

  /** Lazy — nothing downloads until the user commits to a transcription. */
  async init(_ctx?: EngineContext): Promise<void> {
    // Model load happens in run(), where a ProgressFn exists to report the
    // download honestly. init stays cheap by design.
  }

  async run(
    job: Job<SpeechInput>,
    signal: AbortSignal,
    onProgress: ProgressFn,
  ): Promise<SpeechResult> {
    const started = performance.now();
    const { file, options = {}, onPartial } = job.input;
    const tier = options.model ?? DEFAULT_MODEL_TIER;
    const spec = SPEECH_MODELS[tier];

    if (file.size > this.limits.maxBytesPerFile) {
      throw new EngineError(
        'too-large',
        `${file.name} is ${formatBytes(file.size)} — the limit is ${formatBytes(this.limits.maxBytesPerFile)}. Pro raises it to 2 GB.`,
      );
    }
    if (signal.aborted) throw new EngineError('cancelled', 'Cancelled.');

    const { device } = await this.host.load(tier, onProgress);
    if (signal.aborted) throw new EngineError('cancelled', 'Cancelled.');

    onProgress({ pct: 0, stage: 'Decoding audio' });
    const { pcm, durationSec } = await decodeToWhisperPcm(file);
    if (signal.aborted) throw new EngineError('cancelled', 'Cancelled.');

    const warnings: string[] = [];
    if (durationSec > LONG_DURATION_SECONDS && device === 'wasm') {
      warnings.push(
        `That's ${Math.round(durationSec / 60)} minutes of audio and this device has no GPU acceleration — expect a wait.`,
      );
    }
    if (tier === 'high' && device === 'wasm') {
      warnings.push('The High model runs on CPU here — accurate, but slow. Balanced is the faster trade.');
    }
    if ((options.language ?? 'auto') === 'auto') {
      warnings.push('Language was auto-detected. If a section came out wrong, set the language and run again.');
    }

    const segments = await this.host.transcribe(
      pcm,
      options.language ?? 'auto',
      durationSec,
      signal,
      onProgress,
      onPartial,
    );

    if (segments.length === 0) {
      throw new EngineError(
        'corrupt-input',
        'No speech was found in that audio. If it definitely contains speech, set the language instead of auto-detect.',
      );
    }

    onProgress({ pct: 100, stage: 'Done' });
    return {
      segments,
      text: segments.map((s) => s.text).join(' '),
      durationSec,
      inputBytes: file.size,
      model: spec.label,
      device,
      warnings,
      elapsedMs: Math.round(performance.now() - started),
    };
  }

  dispose(): void {
    this.host.dispose();
  }
}
