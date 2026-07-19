// lovelytools.ai — Audio Engine (RFC-001 §3).
//
// ffmpeg audio profile (~6 MB core). Covers all 20 tools in the audio category,
// 10 of which previously pointed at the document-only conversion engine.
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
import { FFmpegAudioHost } from './ffmpeg-host';
import { planOp } from './ops';
import {
  AUDIO_CAPABILITIES,
  LOSSLESS,
  MIME,
  type AudioFormat,
  type AudioInput,
  type AudioResult,
} from './types';

const extOf = (name: string): string => name.split('.').pop()?.toLowerCase() || 'mp3';
const stemOf = (name: string): string => name.replace(/\.[^./\\]+$/, '');

export class AudioEngine implements ToolEngine<AudioInput, AudioResult> {
  readonly id = 'audio' as const;
  readonly capabilities = AUDIO_CAPABILITIES;
  // Shares the standard core until an audio-profile build exists — see ffmpeg-host.ts.
  readonly wasm = [
    { url: '/wasm/ffmpeg-core/ffmpeg-core.wasm', version: '0.12.10', approxBytes: 25_000_000 },
  ];

  private host = new FFmpegAudioHost();
  private ready = false;

  constructor(private limits: EngineLimits = FREE_LIMITS) {}

  /** Lazy — the core never loads on page load, only when a job starts. */
  async init(_ctx?: EngineContext): Promise<void> {
    await this.host.load();
    this.ready = true;
  }

  async run(
    job: Job<AudioInput>,
    signal: AbortSignal,
    onProgress: ProgressFn,
  ): Promise<AudioResult> {
    const started = performance.now();
    const { file, capability, options = {}, extraFiles = [] } = job.input;

    if (file.size > this.limits.maxBytesPerFile) {
      throw new EngineError(
        'too-large',
        `${file.name} is ${formatBytes(file.size)} — the limit is ${formatBytes(this.limits.maxBytesPerFile)}. Pro raises it to 2 GB.`,
      );
    }
    if (!this.ready) await this.init();
    if (signal.aborted) throw new EngineError('cancelled', 'Cancelled.');

    if (capability === 'audio.merge') {
      return this.merge([file, ...extraFiles], signal, onProgress, started);
    }

    const inExt = extOf(file.name);
    const input = `input.${inExt}`;
    const written = [input];

    onProgress({ pct: 0, stage: 'Reading file' });
    await this.host.write(input, new Uint8Array(await file.arrayBuffer()));

    const duration = await this.host.probeDuration(input);
    const plan = planOp(capability, options, inExt, duration);
    const output = `output.${plan.outExt}`;
    written.push(output);

    try {
      await this.host.exec(plan.args, onProgress, plan.stage, signal, duration);
      const bytes = await this.host.read(output);

      const format = plan.outExt as AudioFormat;
      const blob = new Blob([bytes as BlobPart], { type: MIME[format] ?? 'application/octet-stream' });

      const warnings = [...plan.warnings];
      // Say so when "compression" made things worse rather than quietly returning
      // a bigger file. Converting an MP3 to FLAC does exactly this.
      if (capability === 'audio.compress' && blob.size >= file.size) {
        warnings.push(
          `This file was already compressed — the result (${formatBytes(blob.size)}) is no smaller. Keep the original.`,
        );
      }
      if (capability === 'audio.convert' && LOSSLESS.has(format) && !LOSSLESS.has(inExt as AudioFormat)) {
        warnings.push(
          "Converting a lossy file to a lossless one can't recover what was already discarded — it only makes the file bigger.",
        );
      }

      return {
        blob,
        filename: `${stemOf(file.name)}.${plan.outExt}`,
        inputBytes: file.size,
        outputBytes: blob.size,
        durationSec: duration,
        warnings,
        elapsedMs: Math.round(performance.now() - started),
      };
    } finally {
      await this.host.cleanup(written);
    }
  }

  /**
   * Concat filter rather than the concat demuxer: tracks routinely differ in
   * sample rate and channel count, and the filter resamples them to match.
   */
  private async merge(
    files: File[],
    signal: AbortSignal,
    onProgress: ProgressFn,
    started: number,
  ): Promise<AudioResult> {
    if (files.length < 2) throw new EngineError('internal', 'Merging needs at least two tracks.');
    if (files.length > this.limits.maxFiles) {
      throw new EngineError(
        'too-many-files',
        `That's ${files.length} tracks — the limit is ${this.limits.maxFiles}.`,
      );
    }

    const written: string[] = [];
    let inputBytes = 0;
    const args: string[] = [];

    for (const [i, file] of files.entries()) {
      const name = `merge-${i}.${extOf(file.name)}`;
      await this.host.write(name, new Uint8Array(await file.arrayBuffer()));
      written.push(name);
      args.push('-i', name);
      inputBytes += file.size;
      onProgress({ pct: Math.round(((i + 1) / files.length) * 20), stage: 'Reading files' });
    }

    const inputs = files.map((_, i) => `[${i}:a]`).join('');
    args.push(
      '-filter_complex',
      `${inputs}concat=n=${files.length}:v=0:a=1[out]`,
      '-map',
      '[out]',
      '-c:a',
      'libmp3lame',
      '-b:a',
      '192k',
      'output.mp3',
    );
    written.push('output.mp3');

    try {
      await this.host.exec(args, onProgress, 'Merging', signal);
      const bytes = await this.host.read('output.mp3');
      const blob = new Blob([bytes as BlobPart], { type: MIME.mp3 });

      return {
        blob,
        filename: 'merged.mp3',
        inputBytes,
        outputBytes: blob.size,
        warnings: ['Tracks were joined in the order given and re-encoded to MP3 so they line up.'],
        elapsedMs: Math.round(performance.now() - started),
      };
    } finally {
      await this.host.cleanup(written);
    }
  }

  dispose(): void {
    this.host.dispose();
    this.ready = false;
  }
}
