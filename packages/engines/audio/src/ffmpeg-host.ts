// lovelytools.ai — ffmpeg.wasm host for the audio engine (RFC-001 §3).
//
// Deliberately not shared with the video engine: engines never import each other
// (§1), and the two are meant to load different cores (§3).
//
// Audio work is single-threaded. Encoding an MP3 is fast enough that the COOP/COEP
// isolation the threaded core demands isn't worth the constraint it puts on the page.
//
// KNOWN GAP — core size. RFC-001 §3 specifies a "~6 MB audio profile" core. No such
// core is published: @ffmpeg/core is a single ~25 MB build with every decoder in it.
// Producing an audio-only core means compiling ffmpeg with emscripten and a trimmed
// configure line, which belongs in tooling/wasm-build and hasn't been done. Until it
// is, audio loads the standard single-threaded core — correct output, ~19 MB more
// than the RFC budgeted. Pointing at a core that doesn't exist would 404 at runtime,
// so this shares the real one and the deviation stays visible.
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { EngineError, type ProgressFn } from '@lovelytools/engines-core';

const WASM_BASE =
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_WASM_BASE) || '/wasm';

/**
 * Content-hashed directories, written by tooling/wasm-build and baked in at build
 * time by next.config.ts. The hash is what lets the cores be served immutable for a
 * year: change the bytes, change the URL.
 */
const MANIFEST: Record<string, string> = (() => {
  try {
    return JSON.parse(process.env.NEXT_PUBLIC_WASM_MANIFEST || '{}');
  } catch {
    return {};
  }
})();

const assetDir = (key: string): string => {
  const hashed = MANIFEST[key];
  if (!hashed) {
    throw new EngineError(
      'internal',
      'The audio engine assets are missing from this build. Run `pnpm install` to stage them.',
    );
  }
  return `${WASM_BASE}/${hashed}`;
};

/**
 * @ffmpeg/ffmpeg spawns its wrapper worker with `new Worker(new URL('./worker.js',
 * import.meta.url))`, which webpack does not emit. tooling/wasm-build self-hosts the
 * wrapper, and `classWorkerURL` points the library at it.
 *
 * It MUST be absolute: the library resolves it against import.meta.url, which
 * webpack makes a file:// URL, so a root-relative path becomes file:///D:/wasm/…
 * and the Worker constructor throws SecurityError.
 */
const absoluteUrl = (path: string): string => {
  const base = typeof location !== 'undefined' ? location.href : 'http://localhost/';
  return new URL(path, base).href;
};

const LOAD_TIMEOUT_MS = 90_000;

const withTimeout = <T>(promise: Promise<T>, ms: number, message: string): Promise<T> =>
  Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new EngineError('internal', message)), ms),
    ),
  ]);

export class FFmpegAudioHost {
  private ffmpeg: FFmpeg | null = null;
  private loading: Promise<FFmpeg> | null = null;

  async load(): Promise<FFmpeg> {
    if (this.ffmpeg) return this.ffmpeg;
    this.loading ??= this.doLoad();
    return this.loading;
  }

  private async doLoad(): Promise<FFmpeg> {
    const ffmpeg = new FFmpeg();
    try {
      // Standard single-threaded core — swap to ffmpeg-core-audio once one is built.
      const core = assetDir('ffmpeg-core');
      await withTimeout(
        ffmpeg.load({
          classWorkerURL: absoluteUrl(`${assetDir('ffmpeg')}/worker.js`),
          coreURL: absoluteUrl(`${core}/ffmpeg-core.js`),
          wasmURL: absoluteUrl(`${core}/ffmpeg-core.wasm`),
        }),
        LOAD_TIMEOUT_MS,
        'The audio engine took too long to start. Check your connection and try again.',
      );
    } catch (cause) {
      console.error('[lovelytools] audio engine failed to load', cause);
      if (cause instanceof EngineError) throw cause;
      throw new EngineError(
        'unsupported-browser',
        "This browser can't run the audio engine. Chrome, Edge, Firefox and Safari 17+ all work.",
      );
    }
    this.ffmpeg = ffmpeg;
    return ffmpeg;
  }

  /**
   * Runs one ffmpeg invocation with real progress. Where the input duration is
   * known, progress comes from the encoder's output timestamp; otherwise from
   * ffmpeg's own progress event. Never a simulated timer (RFC-001 §3).
   */
  async exec(
    args: string[],
    onProgress: ProgressFn,
    stage: string,
    signal: AbortSignal,
    durationSec?: number,
  ): Promise<void> {
    const ffmpeg = this.ffmpeg;
    if (!ffmpeg) throw new EngineError('internal', 'Engine used before init.');

    const onTick = ({ progress, time }: { progress: number; time: number }) => {
      const pct =
        durationSec && durationSec > 0
          ? Math.min(99, Math.round((time / 1_000_000 / durationSec) * 100))
          : Math.min(99, Math.round(progress * 100));
      onProgress({ pct: Math.max(0, pct), stage });
    };

    ffmpeg.on('progress', onTick);
    const abort = () => ffmpeg.terminate();
    signal.addEventListener('abort', abort, { once: true });

    try {
      const code = await ffmpeg.exec(args);
      if (signal.aborted) throw new EngineError('cancelled', 'Cancelled.');
      if (code !== 0) {
        throw new EngineError(
          'corrupt-input',
          "That file couldn't be decoded — it may be damaged or use an unsupported codec.",
        );
      }
      onProgress({ pct: 100, stage: 'Done' });
    } catch (error) {
      if (signal.aborted) throw new EngineError('cancelled', 'Cancelled.');
      if (error instanceof EngineError) throw error;
      throw new EngineError('internal', 'The audio engine stopped unexpectedly. Try again.');
    } finally {
      ffmpeg.off('progress', onTick);
      signal.removeEventListener('abort', abort);
      if (signal.aborted) {
        this.ffmpeg = null;
        this.loading = null;
      }
    }
  }

  /** Parses duration out of ffmpeg's stderr. A missing output file is expected here. */
  async probeDuration(filename: string): Promise<number | undefined> {
    const ffmpeg = this.ffmpeg;
    if (!ffmpeg) return undefined;

    let seconds: number | undefined;
    const onLog = ({ message }: { message: string }) => {
      const match = /Duration:\s*(\d+):(\d+):(\d+)\.(\d+)/.exec(message);
      if (match) {
        const [, h, m, s, cs] = match;
        seconds = Number(h) * 3600 + Number(m) * 60 + Number(s) + Number(cs) / 100;
      }
    };

    ffmpeg.on('log', onLog);
    try {
      await ffmpeg.exec(['-i', filename]);
    } catch {
      /* expected */
    } finally {
      ffmpeg.off('log', onLog);
    }
    return seconds;
  }

  async write(name: string, data: Uint8Array): Promise<void> {
    const ffmpeg = this.ffmpeg;
    if (!ffmpeg) throw new EngineError('internal', 'Engine used before init.');
    await ffmpeg.writeFile(name, data);
  }

  async read(name: string): Promise<Uint8Array> {
    const ffmpeg = this.ffmpeg;
    if (!ffmpeg) throw new EngineError('internal', 'Engine used before init.');
    const data = await ffmpeg.readFile(name);
    if (typeof data === 'string') {
      throw new EngineError('internal', 'Expected binary output from the engine.');
    }
    return data;
  }

  async cleanup(names: string[]): Promise<void> {
    const ffmpeg = this.ffmpeg;
    if (!ffmpeg) return;
    for (const name of names) {
      try {
        await ffmpeg.deleteFile(name);
      } catch {
        /* already gone */
      }
    }
  }

  dispose(): void {
    try {
      this.ffmpeg?.terminate();
    } catch {
      /* already down */
    }
    this.ffmpeg = null;
    this.loading = null;
  }
}
