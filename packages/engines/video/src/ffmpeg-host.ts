// lovelytools.ai — ffmpeg.wasm host for the video engine (RFC-001 §3).
//
// Threading: the multithreaded core needs SharedArrayBuffer, which needs COOP/COEP
// on the document. next.config.ts sets those headers on tool routes. When isolation
// is unavailable (an embedded webview, an old browser), we fall back to the
// single-threaded core rather than fail — slower, same output.
//
// Cores are self-hosted. `tooling/wasm-build` copies them out of node_modules and
// content-hashes them; in production NEXT_PUBLIC_WASM_BASE points at R2
// (wasm.lovelytools.ai, 1y immutable). Nothing is fetched from a third-party CDN at
// runtime — a font CDN seeing your visitors is bad enough; a WASM CDN seeing which
// tool they opened would undercut the whole promise.
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { EngineError, type EngineContext, type ProgressFn } from '@lovelytools/engines-core';

const WASM_BASE =
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_WASM_BASE) || '/wasm';

/**
 * Content-hashed directories, written by tooling/wasm-build and baked in at build
 * time by next.config.ts. The hash is what lets the cores be served immutable for a
 * year: change the bytes, change the URL. Without it a redeployed core is invisible
 * to every browser holding the old one.
 */
const MANIFEST: Record<string, string> = (() => {
  try {
    return JSON.parse(process.env.NEXT_PUBLIC_WASM_MANIFEST || '{}');
  } catch {
    return {};
  }
})();

const coreDir = (key: string): string => {
  const hashed = MANIFEST[key];
  if (!hashed) {
    throw new EngineError(
      'internal',
      'The video engine assets are missing from this build. Run `pnpm install` to stage them.',
    );
  }
  return `${WASM_BASE}/${hashed}`;
};

/**
 * @ffmpeg/ffmpeg spawns its wrapper worker with `new Worker(new URL('./worker.js',
 * import.meta.url))`, which webpack does not emit — the worker never spawns and
 * load() waits forever on a message that never comes. tooling/wasm-build self-hosts
 * the wrapper, and `classWorkerURL` points the library at it.
 *
 * It MUST be an absolute URL. The library resolves it with
 * `new URL(classWorkerURL, import.meta.url)`, and under webpack import.meta.url is
 * a file:// URL — so a root-relative "/wasm/…" resolves against the filesystem
 * (file:///D:/wasm/…) and the Worker constructor throws SecurityError. An absolute
 * URL ignores the base entirely, which is the point.
 */
const absoluteUrl = (path: string): string => {
  const base = typeof location !== 'undefined' ? location.href : 'http://localhost/';
  return new URL(path, base).href;
};

/**
 * A load that hasn't finished in this long is not going to. The library exposes no
 * timeout of its own, and a hang here is indistinguishable from a slow download to
 * anyone watching a progress bar, so bound it and say something true instead.
 */
const LOAD_TIMEOUT_MS = 90_000;

const withTimeout = <T>(promise: Promise<T>, ms: number, message: string): Promise<T> =>
  Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new EngineError('internal', message)), ms),
    ),
  ]);

export interface FFmpegHostOptions {
  /** Force the single-threaded core (tests, debugging). */
  forceSingleThread?: boolean;
}

/**
 * Owns one FFmpeg instance and its WASM heap. One host per engine instance;
 * dispose() frees the heap — a leaked ffmpeg core is ~30 MB of retained memory.
 */
export class FFmpegHost {
  private ffmpeg: FFmpeg | null = null;
  private loading: Promise<FFmpeg> | null = null;
  private threaded = false;

  constructor(private options: FFmpegHostOptions = {}) {}

  get isThreaded(): boolean {
    return this.threaded;
  }

  /** Lazy, idempotent, and safe to call concurrently. */
  async load(ctx: EngineContext): Promise<FFmpeg> {
    if (this.ffmpeg) return this.ffmpeg;
    this.loading ??= this.doLoad(ctx);
    return this.loading;
  }

  private async doLoad(ctx: EngineContext): Promise<FFmpeg> {
    const useThreads = ctx.crossOriginIsolated && !this.options.forceSingleThread;
    const base = coreDir(useThreads ? 'ffmpeg-core-mt' : 'ffmpeg-core');

    const ffmpeg = new FFmpeg();
    try {
      await withTimeout(
        ffmpeg.load({
          classWorkerURL: absoluteUrl(`${coreDir('ffmpeg')}/worker.js`),
          coreURL: absoluteUrl(`${base}/ffmpeg-core.js`),
          wasmURL: absoluteUrl(`${base}/ffmpeg-core.wasm`),
          // The MT core needs its own worker shim; the ST core does not.
          ...(useThreads ? { workerURL: absoluteUrl(`${base}/ffmpeg-core.worker.js`) } : {}),
        }),
        LOAD_TIMEOUT_MS,
        'The video engine took too long to start. Check your connection and try again.',
      );
    } catch (cause) {
      // The user-facing message is deliberately vague, but the cause must not be
      // swallowed — an engine that fails silently is undebuggable in the field, and
      // this is where a Sentry breadcrumb belongs (RFC-001: workers tagged with
      // engine + wasm_version).
      console.error(`[lovelytools] video engine failed to load (threads=${useThreads})`, cause);

      // A threaded load can fail even when crossOriginIsolated is true (memory
      // pressure, a blocked worker). Retry single-threaded before giving up.
      if (useThreads) {
        this.options.forceSingleThread = true;
        this.loading = null;
        return this.doLoad(ctx);
      }
      if (cause instanceof EngineError) throw cause;
      throw new EngineError(
        'unsupported-browser',
        "This browser can't run the video engine. Chrome, Edge, Firefox and Safari 17+ all work.",
      );
    }

    this.threaded = useThreads;
    this.ffmpeg = ffmpeg;
    return ffmpeg;
  }

  /**
   * Runs one ffmpeg invocation, reporting real progress.
   *
   * ffmpeg's own `progress` event is unreliable for stream-copy operations (it can
   * report 0 until completion), so when the input duration is known we derive
   * progress from the encoder's output timestamp instead. Both are real signals
   * from the WASM layer — neither is a simulated timer (RFC-001 §3).
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
      let pct: number;
      if (durationSec && durationSec > 0) {
        // `time` is microseconds of output written.
        pct = Math.min(99, Math.round((time / 1_000_000 / durationSec) * 100));
      } else {
        pct = Math.min(99, Math.round(progress * 100));
      }
      if (pct >= 0) onProgress({ pct, stage });
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
      throw new EngineError('internal', 'The video engine stopped unexpectedly. Try again.');
    } finally {
      ffmpeg.off('progress', onTick);
      signal.removeEventListener('abort', abort);
      // terminate() destroys the instance; force a reload on next use.
      if (signal.aborted) {
        this.ffmpeg = null;
        this.loading = null;
      }
    }
  }

  /**
   * Reads the input's duration by parsing ffmpeg's own stderr. ffmpeg exits
   * non-zero when given no output file, which is expected here.
   */
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
      /* expected — no output file specified */
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

  /** Frees FS entries between jobs so the heap doesn't grow across a queue. */
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
