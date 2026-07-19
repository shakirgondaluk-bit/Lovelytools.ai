// lovelytools.ai — Speech Engine · Whisper host.
//
// Wraps @huggingface/transformers with the most capable configuration each
// device honestly supports:
//   · model tiers from whisper-tiny up to whisper-large-v3-turbo (SPEECH_MODELS)
//   · WebGPU inference (fp16 / q4f16) with automatic fallback to WASM (q8)
//   · the pipeline's own 30 s chunking with 5 s stride — overlapping windows
//     merged by the library, so words at window edges aren't cut the way naive
//     back-to-back windowing cuts them
//   · WhisperTextStreamer for token-level streaming: live partial text for the
//     UI and real progress from the chunk offsets the model is actually at
//
// The library and model load dynamically — no page pays for them until the
// user commits to a transcription (RFC-001 §3: lazy init).
import { EngineError, type ProgressFn } from '@lovelytools/engines-core';
import {
  SPEECH_MODELS,
  type SpeechDevice,
  type SpeechLanguage,
  type SpeechModelTier,
  type TranscriptSegment,
} from './types';

interface ChunkOutput {
  timestamp: [number, number | null];
  text: string;
}

interface AsrOutput {
  text: string;
  chunks?: ChunkOutput[];
}

/* Loose structural types for the transformers.js pipeline — the library's own
   types are too entangled with its generics to import across the boundary. */
type Transcriber = ((
  audio: Float32Array,
  options: Record<string, unknown>,
) => Promise<AsrOutput | AsrOutput[]>) & {
  tokenizer: unknown;
  processor: { feature_extractor: { config: { chunk_length: number } } };
  model: { config: { max_source_positions: number } };
  dispose?: () => Promise<void>;
};

interface DownloadEvent {
  status: string;
  file?: string;
  loaded?: number;
  total?: number;
}

interface Loaded {
  transcriber: Transcriber;
  device: SpeechDevice;
  tier: SpeechModelTier;
}

/** WebGPU probe, cached — an adapter request is not free. */
let webgpuProbe: Promise<boolean> | null = null;
export const webgpuAvailable = (): Promise<boolean> => {
  webgpuProbe ??= (async () => {
    try {
      const gpu = (navigator as Navigator & { gpu?: { requestAdapter(): Promise<unknown> } }).gpu;
      return gpu ? (await gpu.requestAdapter()) !== null : false;
    } catch {
      return false;
    }
  })();
  return webgpuProbe;
};

export class WhisperHost {
  private loaded: Loaded | null = null;
  private loading: Promise<Loaded> | null = null;
  private loadingTier: SpeechModelTier | null = null;

  /** Loads (or reuses) the pipeline for a tier. Switching tiers swaps models. */
  async load(tier: SpeechModelTier, onProgress: ProgressFn): Promise<Loaded> {
    if (this.loaded?.tier === tier) return this.loaded;
    if (this.loading && this.loadingTier === tier) return this.loading;

    // A different model was loaded or loading — replace it.
    this.dispose();
    this.loadingTier = tier;
    this.loading = this.doLoad(tier, onProgress);
    try {
      this.loaded = await this.loading;
      return this.loaded;
    } catch (cause) {
      this.loading = null;
      this.loadingTier = null;
      throw cause;
    }
  }

  private async doLoad(tier: SpeechModelTier, onProgress: ProgressFn): Promise<Loaded> {
    const spec = SPEECH_MODELS[tier];

    let pipeline: unknown;
    try {
      ({ pipeline } = await import('@huggingface/transformers'));
    } catch (cause) {
      console.error('[lovelytools] speech engine failed to import transformers', cause);
      throw new EngineError(
        'unsupported-browser',
        "The speech engine couldn't load in this browser. Chrome, Edge, Firefox and Safari 17+ all work.",
      );
    }

    // Byte-accurate download progress, aggregated across the model's files.
    const perFile = new Map<string, { loaded: number; total: number }>();
    const onDownload = (event: DownloadEvent) => {
      if (event.status !== 'progress' || !event.file || !event.total) return;
      perFile.set(event.file, { loaded: event.loaded ?? 0, total: event.total });
      let loaded = 0;
      let total = 0;
      for (const f of perFile.values()) {
        loaded += f.loaded;
        total += f.total;
      }
      if (total > 0) {
        onProgress({
          pct: Math.min(99, Math.round((loaded / total) * 100)),
          stage: `Downloading ${spec.label} (once — it caches)`,
        });
      }
    };

    const factory = pipeline as (
      task: string,
      model: string,
      options: Record<string, unknown>,
    ) => Promise<Transcriber>;

    // Best build first, honest fallback after: WebGPU with per-component
    // dtypes, then WASM q8. The per-component split is load-bearing, not
    // tuning: a whole-model 'fp16' makes the DECODER fp16, which is broken on
    // WebGPU — Whisper degenerates into repetition loops ("I think I think…").
    // The recipe below matches the official realtime-whisper-webgpu example
    // ("encoder fp32, 'fp16' works too; decoder q4 — 'fp16' is broken"):
    //   tiny/base  → encoder fp32 (affordable), decoder q4
    //   small      → encoder fp16 (fp32 would be ~350 MB), decoder q4
    //   turbo      → encoder q4 (fp32 is 2.4 GB), decoder q4 — 4-bit weights,
    //                fp32 compute, so nothing runs through the broken fp16 path
    const WEBGPU_DTYPE: Record<SpeechModelTier, Record<string, string>> = {
      fast: { encoder_model: 'fp32', decoder_model_merged: 'q4' },
      balanced: { encoder_model: 'fp32', decoder_model_merged: 'q4' },
      high: { encoder_model: 'fp16', decoder_model_merged: 'q4' },
      max: { encoder_model: 'q4', decoder_model_merged: 'q4' },
    };

    const attempts: Array<{ device: SpeechDevice; dtype: string | Record<string, string> }> = [];
    if ((await webgpuAvailable()) && spec.bytes.webgpu !== null) {
      attempts.push({ device: 'webgpu', dtype: WEBGPU_DTYPE[tier] });
    }
    if (spec.bytes.wasm !== null) {
      attempts.push({ device: 'wasm', dtype: 'q8' });
    }
    if (attempts.length === 0) {
      throw new EngineError(
        'unsupported-browser',
        `${spec.label} needs WebGPU, which this browser doesn't expose. Pick a smaller model — High is the best CPU option.`,
      );
    }

    let lastCause: unknown;
    for (const attempt of attempts) {
      try {
        const transcriber = await factory('automatic-speech-recognition', spec.id, {
          device: attempt.device,
          dtype: attempt.dtype,
          progress_callback: onDownload,
        });
        return { transcriber, device: attempt.device, tier };
      } catch (cause) {
        lastCause = cause;
        console.warn(
          `[lovelytools] ${spec.id} failed on ${attempt.device} (${JSON.stringify(attempt.dtype)})`,
          cause,
        );
        perFile.clear();
      }
    }

    console.error('[lovelytools] speech model failed to load', lastCause);
    throw new EngineError(
      'internal',
      `${spec.label} couldn't be downloaded or started. Check your connection and try again — the download only happens once.`,
    );
  }

  /**
   * Transcribes with the pipeline's stride-merged chunking. Progress comes from
   * the chunk offset the model is actually processing; partial text streams
   * token by token. Abort is checked in both callbacks — the throw unwinds the
   * generation loop.
   */
  async transcribe(
    pcm: Float32Array,
    language: SpeechLanguage,
    durationSec: number,
    signal: AbortSignal,
    onProgress: ProgressFn,
    onPartial?: (text: string) => void,
  ): Promise<TranscriptSegment[]> {
    const loaded = this.loaded;
    if (!loaded) throw new EngineError('internal', 'Engine used before init.');
    const { transcriber } = loaded;

    const { WhisperTextStreamer } = await import('@huggingface/transformers');

    const timePrecision =
      transcriber.processor.feature_extractor.config.chunk_length /
      transcriber.model.config.max_source_positions;

    const assertLive = () => {
      if (signal.aborted) throw new EngineError('cancelled', 'Cancelled.');
    };

    let partial = '';
    const streamer = new WhisperTextStreamer(
      transcriber.tokenizer as ConstructorParameters<typeof WhisperTextStreamer>[0],
      {
        time_precision: timePrecision,
        on_chunk_start: (t: number) => {
          assertLive();
          onProgress({
            pct: Math.min(97, Math.max(1, Math.round((t / Math.max(durationSec, 1)) * 100))),
            stage: 'Transcribing',
          });
        },
        callback_function: (text: string) => {
          assertLive();
          if (text) {
            partial += text;
            onPartial?.(partial);
          }
        },
      },
    );

    let output: AsrOutput | AsrOutput[];
    try {
      output = await transcriber(pcm, {
        chunk_length_s: 30,
        stride_length_s: 5,
        return_timestamps: true,
        ...(language !== 'auto' ? { language, task: 'transcribe' } : {}),
        streamer,
      });
    } catch (cause) {
      if (signal.aborted || (cause instanceof EngineError && cause.code === 'cancelled')) {
        throw new EngineError('cancelled', 'Cancelled.');
      }
      console.error('[lovelytools] transcription failed', cause);
      throw new EngineError('internal', 'Transcription stopped unexpectedly. Try again.');
    }

    const first = Array.isArray(output) ? output[0] : output;
    const segments: TranscriptSegment[] = [];
    let nextId = 1;
    for (const chunk of first?.chunks ?? []) {
      const text = chunk.text.trim();
      if (!text) continue;
      const [start, end] = chunk.timestamp;
      segments.push({
        id: nextId++,
        start: start ?? 0,
        // The final chunk's end is open — close it at the media's real length.
        end: end ?? durationSec,
        text,
      });
    }
    return segments;
  }

  dispose(): void {
    void this.loaded?.transcriber.dispose?.().catch(() => undefined);
    this.loaded = null;
    this.loading = null;
    this.loadingTier = null;
  }
}
