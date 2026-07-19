// lovelytools.ai — Video Engine (RFC-001 §3).
//
// ffmpeg.wasm, multithreaded where SharedArrayBuffer is available. Files are read
// into the ffmpeg FS, processed, and read back — nothing crosses the network. The
// heaviest engine in the platform: the core alone is ~31 MB, which is why init is
// lazy and dispose() matters.
import {
  EngineError,
  FREE_LIMITS,
  formatBytes,
  probeContext,
  type EngineContext,
  type EngineLimits,
  type Job,
  type ProgressFn,
  type ToolEngine,
} from '@lovelytools/engines-core';
import { FFmpegHost } from './ffmpeg-host';
import { planOp } from './ops';
import { MIME, VIDEO_CAPABILITIES, type VideoInput, type VideoResult, type VideoFormat } from './types';

const extOf = (name: string): string => name.split('.').pop()?.toLowerCase() || 'mp4';
const stemOf = (name: string): string => name.replace(/\.[^./\\]+$/, '');

export class VideoEngine implements ToolEngine<VideoInput, VideoResult> {
  readonly id = 'video' as const;
  readonly capabilities = VIDEO_CAPABILITIES;
  readonly wasm = [
    { url: '/wasm/ffmpeg-core-mt/ffmpeg-core.wasm', version: '0.12.10', approxBytes: 31_000_000 },
  ];

  private host = new FFmpegHost();
  private ctx: EngineContext | null = null;

  constructor(private limits: EngineLimits = FREE_LIMITS) {}

  /** Lazy — never called on page load, only when a user commits to a job. */
  async init(ctx?: EngineContext): Promise<void> {
    this.ctx = ctx ?? (await probeContext());
    await this.host.load(this.ctx);
  }

  /** True when the multithreaded core loaded. Surfaced in the UI as a speed note. */
  get isThreaded(): boolean {
    return this.host.isThreaded;
  }

  async run(
    job: Job<VideoInput>,
    signal: AbortSignal,
    onProgress: ProgressFn,
  ): Promise<VideoResult> {
    const started = performance.now();
    const { file, capability, options = {}, extraFiles = [] } = job.input;

    if (file.size > this.limits.maxBytesPerFile) {
      throw new EngineError(
        'too-large',
        `${file.name} is ${formatBytes(file.size)} — the limit is ${formatBytes(this.limits.maxBytesPerFile)}. Pro raises it to 2 GB.`,
      );
    }
    if (!this.ctx) await this.init();
    if (signal.aborted) throw new EngineError('cancelled', 'Cancelled.');

    if (capability === 'video.merge') {
      return this.merge([file, ...extraFiles], signal, onProgress, started);
    }

    const inExt = extOf(file.name);
    const input = `input.${inExt}`;
    const written = [input];

    onProgress({ pct: 0, stage: 'Reading file' });
    await this.host.write(input, new Uint8Array(await file.arrayBuffer()));

    if (options.subtitles) {
      await this.host.write('subs.srt', new TextEncoder().encode(options.subtitles));
      written.push('subs.srt');
    }

    // Duration drives real progress; if the probe fails we fall back to ffmpeg's
    // own progress event rather than inventing a timer.
    const duration = await this.host.probeDuration(input);

    const plan = planOp(capability, options, inExt, duration);
    const output = `output.${plan.outExt}`;
    written.push(output);

    try {
      await this.host.exec(plan.args, onProgress, plan.stage, signal, duration);
      const bytes = await this.host.read(output);

      const format = plan.outExt as VideoFormat;
      const blob = new Blob([bytes as BlobPart], {
        type: MIME[format] ?? (plan.outExt === 'mp3' ? 'audio/mpeg' : 'application/octet-stream'),
      });

      const warnings = [...plan.warnings];
      // Compression that made the file bigger is a real outcome, not a failure —
      // say so rather than quietly hand back a worse file.
      if (capability === 'video.compress' && blob.size >= file.size) {
        warnings.push(
          `This file was already well compressed — the result (${formatBytes(blob.size)}) is no smaller than the original. Keep the original.`,
        );
      }
      if (!this.host.isThreaded) {
        warnings.push('Running single-threaded — this browser blocks multithreading, so it took longer.');
      }

      return {
        blob,
        filename: `${stemOf(file.name)}.${plan.outExt}`,
        inputBytes: file.size,
        outputBytes: blob.size,
        warnings,
        elapsedMs: Math.round(performance.now() - started),
      };
    } finally {
      await this.host.cleanup(written);
    }
  }

  /** Concat demuxer — stream-copies when codecs match, so merging is fast. */
  private async merge(
    files: File[],
    signal: AbortSignal,
    onProgress: ProgressFn,
    started: number,
  ): Promise<VideoResult> {
    if (files.length < 2) {
      throw new EngineError('internal', 'Merging needs at least two clips.');
    }
    if (files.length > this.limits.maxFiles) {
      throw new EngineError(
        'too-many-files',
        `That's ${files.length} clips — the limit is ${this.limits.maxFiles}.`,
      );
    }

    const written: string[] = [];
    const names: string[] = [];
    let inputBytes = 0;

    for (const [i, file] of files.entries()) {
      const name = `merge-${i}.${extOf(file.name)}`;
      await this.host.write(name, new Uint8Array(await file.arrayBuffer()));
      written.push(name);
      names.push(name);
      inputBytes += file.size;
      onProgress({ pct: Math.round(((i + 1) / files.length) * 20), stage: 'Reading files' });
    }

    const list = names.map((n) => `file '${n}'`).join('\n');
    await this.host.write('concat.txt', new TextEncoder().encode(list));
    written.push('concat.txt', 'output.mp4');

    try {
      await this.host.exec(
        ['-f', 'concat', '-safe', '0', '-i', 'concat.txt', '-c', 'copy', 'output.mp4'],
        onProgress,
        'Merging',
        signal,
      );
      const bytes = await this.host.read('output.mp4');
      const blob = new Blob([bytes as BlobPart], { type: MIME.mp4 });

      return {
        blob,
        filename: 'merged.mp4',
        inputBytes,
        outputBytes: blob.size,
        warnings: ['Clips were joined without re-encoding. If they had different codecs or sizes, re-encode them to match first.'],
        elapsedMs: Math.round(performance.now() - started),
      };
    } finally {
      await this.host.cleanup(written);
    }
  }

  dispose(): void {
    this.host.dispose();
    this.ctx = null;
  }
}
