// lovelytools.ai — worker pool. min(hardwareConcurrency, 4) module workers,
// FIFO queue, transferable buffers, per-job cancel. Falls back to nothing —
// callers check `supportsWorkers()` and use the same converter code on the
// main thread if false (old Safari).
import type { ProgressFn, WorkerConvertMsg, WorkerOutMsg } from './types';
import { EngineError } from './types';

export interface PoolResult {
  buf: ArrayBuffer;
  mime: string;
  filename: string;
  fidelity: 'high' | 'good' | 'text-only';
  warnings: string[];
  elapsedMs: number;
}

interface PendingJob {
  msg: WorkerConvertMsg;
  resolve: (r: PoolResult) => void;
  reject: (e: EngineError) => void;
  onProgress: ProgressFn;
}

export function supportsWorkers(): boolean {
  return typeof Worker !== 'undefined';
}

export class WorkerPool {
  private idle: Worker[] = [];
  private busy = new Map<Worker, PendingJob>();
  private queue: PendingJob[] = [];
  private jobWorker = new Map<string, Worker>();

  constructor(private size = Math.min(navigator.hardwareConcurrency || 2, 4)) {}

  private spawn(): Worker {
    // Next.js bundles this into a static asset; `type: 'module'` enables ESM + dynamic import().
    const w = new Worker(new URL('./workers/convert.worker.ts', import.meta.url), {
      type: 'module',
    });
    w.onmessage = (e: MessageEvent<WorkerOutMsg>) => this.onMessage(w, e.data);
    w.onerror = () => this.onWorkerCrash(w);
    return w;
  }

  run(msg: WorkerConvertMsg, onProgress: ProgressFn): Promise<PoolResult> {
    return new Promise<PoolResult>((resolve, reject) => {
      this.queue.push({ msg, resolve, reject, onProgress });
      this.pump();
    });
  }

  cancel(jobId: string): void {
    const queued = this.queue.findIndex((j) => j.msg.jobId === jobId);
    if (queued >= 0) {
      // findIndex already proved an element exists at this index — splice(i, 1)
      // returning it as PendingJob[] rather than a single item is just how the
      // array method is typed.
      const [job] = this.queue.splice(queued, 1);
      job?.reject(new EngineError('cancelled', 'Cancelled.'));
      return;
    }
    this.jobWorker.get(jobId)?.postMessage({ kind: 'cancel', jobId });
  }

  destroy(): void {
    [...this.idle, ...this.busy.keys()].forEach((w) => w.terminate());
    this.queue.forEach((j) => j.reject(new EngineError('cancelled', 'Engine shut down.')));
    this.idle = [];
    this.busy.clear();
    this.queue = [];
  }

  private pump(): void {
    while (this.queue.length > 0) {
      const worker =
        this.idle.pop() ?? (this.busy.size + this.idle.length < this.size ? this.spawn() : null);
      if (!worker) return;
      const job = this.queue.shift()!;
      this.busy.set(worker, job);
      this.jobWorker.set(job.msg.jobId, worker);
      worker.postMessage(job.msg, [job.msg.buf]);
    }
  }

  private onMessage(worker: Worker, out: WorkerOutMsg): void {
    const job = this.busy.get(worker);
    if (!job) return;
    if (out.kind === 'progress') {
      job.onProgress({ jobId: out.jobId, pct: out.pct, stage: out.stage });
      return;
    }
    this.busy.delete(worker);
    this.jobWorker.delete(out.jobId);
    this.idle.push(worker);
    if (out.kind === 'done') {
      const { buf, mime, filename, fidelity, warnings, elapsedMs } = out;
      job.resolve({ buf, mime, filename, fidelity, warnings, elapsedMs });
    } else {
      job.reject(new EngineError(out.code, out.message));
    }
    this.pump();
  }

  private onWorkerCrash(worker: Worker): void {
    const job = this.busy.get(worker);
    this.busy.delete(worker);
    worker.terminate();
    if (job) {
      this.jobWorker.delete(job.msg.jobId);
      job.reject(new EngineError('internal', 'The converter crashed on this file. It may be corrupt.'));
    }
    this.pump();
  }
}
