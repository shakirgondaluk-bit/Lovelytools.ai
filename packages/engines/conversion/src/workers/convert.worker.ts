// lovelytools.ai — worker entry. One conversion at a time per worker; the pool
// fans jobs across workers. Buffers arrive and leave as transferables.
/// <reference lib="webworker" />
import { consume, produce } from '../converters';
import { FORMATS, outputFilename } from '../formats';
import { planRoute } from '../routes';
import { EngineError, type WorkerInMsg, type WorkerOutMsg } from '../types';

const cancelled = new Set<string>();

self.onmessage = async (e: MessageEvent<WorkerInMsg>) => {
  const msg = e.data;
  if (msg.kind === 'cancel') {
    cancelled.add(msg.jobId);
    return;
  }

  const { jobId, buf, name, from, to } = msg;
  const started = performance.now();
  const post = (out: WorkerOutMsg, transfer?: Transferable[]) =>
    (self as unknown as Worker).postMessage(out, transfer ?? []);

  const progress = (pct: number, stage: string) => {
    if (cancelled.has(jobId)) throw new EngineError('cancelled', 'Cancelled.');
    post({ kind: 'progress', jobId, pct, stage });
  };

  try {
    const route = planRoute(from, to);
    if (!route) {
      throw new EngineError('unsupported-route', `${from.toUpperCase()} → ${to.toUpperCase()} isn't supported.`);
    }
    progress(2, 'Starting');
    const ir = await produce(route.ir, from, buf, name, progress);
    progress(65, 'Converting');
    const bytes = await consume(ir, to, progress);
    progress(98, 'Finishing');

    const out = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    // Every FORMATS entry declares at least one mime (see formats.ts) — the fallback
    // exists only because a hand-typed `string[]` doesn't carry that guarantee.
    post(
      {
        kind: 'done',
        jobId,
        buf: out,
        mime: FORMATS[to].mimes[0] ?? 'application/octet-stream',
        filename: outputFilename(name, to),
        fidelity: route.fidelity,
        warnings: route.warnings,
        elapsedMs: Math.round(performance.now() - started),
      },
      [out],
    );
  } catch (err) {
    const ee = err instanceof EngineError ? err : new EngineError('internal', friendly(err));
    // The UI only ever sees ee.message — deliberately generic for anything that
    // isn't an EngineError (DS §12: never leak library internals to the user). But
    // an engine that fails with nothing but a shrug is undebuggable, so the real
    // cause goes to the console rather than nowhere.
    if (!(err instanceof EngineError)) console.error('[lovelytools] conversion worker failed', err);
    post({ kind: 'error', jobId, code: ee.code, message: ee.message });
  } finally {
    cancelled.delete(jobId);
  }
};

function friendly(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  // Never leak stack traces or library internals to the UI (DS §12: friendly errors).
  if (/password/i.test(raw)) return 'This file is password-protected. Remove the password and try again.';
  return 'Something went wrong reading this file. It may be corrupt — try re-exporting it.';
}
