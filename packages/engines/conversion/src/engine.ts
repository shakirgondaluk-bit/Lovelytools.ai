// lovelytools.ai — public engine facade. Everything runs on-device; the only
// network side effect anywhere is the caller's anonymous usage beacon (counts,
// never content — RFC-001 §3).
import { detectFormat } from './detect';
import { FORMATS } from './formats';
import { planRoute, suggestModern, targetsFor } from './routes';
import {
  EngineError,
  FREE_LIMITS,
  type ConversionJob,
  type ConversionRequest,
  type ConversionResult,
  type EngineLimits,
  type FormatId,
  type ProgressFn,
} from './types';
import { supportsWorkers, WorkerPool } from './worker-pool';

export { detectFormat } from './detect';
export { acceptString, FORMATS, outputFilename } from './formats';
export { planRoute, suggestModern, targetsFor } from './routes';
export * from './types';

let uid = 0;
const newId = () => `job-${Date.now().toString(36)}-${++uid}`;

export class ConversionEngine {
  private pool: WorkerPool | null = null;

  constructor(private limits: EngineLimits = FREE_LIMITS) {}

  /** Validate + detect + plan for a batch. Throws EngineError on limit breaches. */
  async prepare(files: File[], to: FormatId): Promise<ConversionJob[]> {
    if (!FORMATS[to].producible) {
      const modern = suggestModern(to);
      throw new EngineError(
        'unsupported-route',
        modern
          ? `We don't produce legacy .${to} files — convert to .${modern} instead.`
          : `.${to} output isn't supported.`,
      );
    }
    if (files.length > this.limits.maxFiles) {
      throw new EngineError(
        'too-many-files',
        `That's ${files.length} files — the limit is ${this.limits.maxFiles}. Pro raises it to 200.`,
      );
    }
    const jobs: ConversionJob[] = [];
    for (const file of files) {
      if (file.size > this.limits.maxBytesPerFile) {
        throw new EngineError(
          'too-large',
          `${file.name} is over ${Math.round(this.limits.maxBytesPerFile / 1048576)} MB. Pro raises the limit to 2 GB.`,
        );
      }
      const from = await detectFormat(file);
      if (from === to) {
        throw new EngineError('same-format', `${file.name} is already ${FORMATS[to].label}.`);
      }
      if (!planRoute(from, to)) {
        const alternatives = targetsFor(from).slice(0, 3).map((r) => FORMATS[r.to].label).join(', ');
        throw new EngineError(
          'unsupported-route',
          `${FORMATS[from].label} → ${FORMATS[to].label} isn't supported. From ${FORMATS[from].label} you can convert to: ${alternatives}.`,
        );
      }
      jobs.push({ id: newId(), file, from, to, status: 'queued', progress: 0, stage: 'Queued' });
    }
    return jobs;
  }

  /** Convert one prepared job. Progress is real converter progress. */
  async convert(job: ConversionJob, onProgress: ProgressFn, signal?: AbortSignal): Promise<ConversionResult> {
    const buf = await job.file.arrayBuffer();
    if (signal?.aborted) throw new EngineError('cancelled', 'Cancelled.');

    if (supportsWorkers()) {
      this.pool ??= new WorkerPool();
      signal?.addEventListener('abort', () => this.pool?.cancel(job.id), { once: true });
      const r = await this.pool.run(
        { kind: 'convert', jobId: job.id, buf, name: job.file.name, from: job.from, to: job.to },
        onProgress,
      );
      return {
        blob: new Blob([r.buf], { type: r.mime }),
        filename: r.filename,
        fidelity: r.fidelity,
        warnings: r.warnings,
        elapsedMs: r.elapsedMs,
      };
    }

    // Main-thread fallback (no Worker support): same converter code, same contract.
    const started = performance.now();
    const { produce, consume } = await import('./converters');
    const route = planRoute(job.from, job.to)!;
    const progress = (pct: number, stage: string) => {
      if (signal?.aborted) throw new EngineError('cancelled', 'Cancelled.');
      onProgress({ jobId: job.id, pct, stage });
    };
    const ir = await produce(route.ir, job.from, buf, job.file.name, progress);
    const bytes = await consume(ir, job.to, progress);
    return {
      blob: new Blob([bytes as BlobPart], { type: FORMATS[job.to].mimes[0] }),
      filename: job.file.name.replace(/\.[^./\\]+$/, `.${FORMATS[job.to].extensions[0]}`),
      fidelity: route.fidelity,
      warnings: route.warnings,
      elapsedMs: Math.round(performance.now() - started),
    };
  }

  /** Zip a batch of results for "Download all" (lazy JSZip). */
  async zipResults(results: ConversionResult[]): Promise<Blob> {
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();
    const seen = new Set<string>();
    for (const r of results) {
      let name = r.filename;
      for (let n = 2; seen.has(name); n++) name = r.filename.replace(/(\.[^.]+)$/, ` (${n})$1`);
      seen.add(name);
      zip.file(name, r.blob);
    }
    return zip.generateAsync({ type: 'blob' });
  }

  destroy(): void {
    this.pool?.destroy();
    this.pool = null;
  }
}
