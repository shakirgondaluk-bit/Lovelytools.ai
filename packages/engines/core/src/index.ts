// @lovelytools/engines-core — the contract every engine implements (RFC-001 §3).
//
// A tool is a thin declaration; the engine does the work. 230 tools reduce to a
// few dozen engine capabilities. Engines never import the app or each other.
//
// The governing invariant: every engine runs on the user's device. No engine may
// open a network connection to send file bytes anywhere. There is no upload
// endpoint to send them to.

/** The engines that exist. See ENGINE_IDS in @lovelytools/registry. */
export type EngineId =
  | 'conversion'
  | 'pdf'
  | 'image'
  | 'video'
  | 'audio'
  | 'calculator'
  | 'text'
  | 'developer'
  | 'speech';

/** e.g. 'pdf.merge', 'image.resize', 'video.trim'. */
export type Capability = string;

export interface WasmAsset {
  /** Content-hashed core served from R2, immutable-cached (RFC-001 §11). */
  url: string;
  /** Pinned by the registry so engines and app deploy independently. */
  version: string;
  approxBytes: number;
}

export interface Progress {
  /** 0–100. Real progress from the engine layer — never simulated (RFC-001 §3). */
  pct: number;
  /** Current stage label for the UI, e.g. "Extracting text". */
  stage: string;
}

export type ProgressFn = (p: Progress) => void;

export interface EngineContext {
  /** True when SharedArrayBuffer is available (COOP/COEP set) — enables threads. */
  crossOriginIsolated: boolean;
  /** True when a WebGPU adapter was acquired. */
  webgpu: boolean;
  /** Hardware threads to use; engines must respect this. */
  threads: number;
}

export interface Job<TInput> {
  id: string;
  input: TInput;
}

/**
 * The one interface every engine implements. `init` is lazy — an engine's WASM
 * core must never load on page load, only when the user commits to a job.
 */
export interface ToolEngine<TInput, TOutput> {
  readonly id: EngineId;
  readonly capabilities: Capability[];
  readonly wasm: WasmAsset[];
  init(ctx: EngineContext): Promise<void>;
  run(job: Job<TInput>, signal: AbortSignal, onProgress: ProgressFn): Promise<TOutput>;
  /** Frees the WASM heap. Callers must invoke this when an island unmounts. */
  dispose(): void;
}

export type EngineErrorCode =
  | 'cancelled'
  | 'too-large'
  | 'too-many-files'
  | 'unsupported-route'
  | 'same-format'
  | 'corrupt-input'
  | 'out-of-memory'
  | 'unsupported-browser'
  | 'internal';

export class EngineError extends Error {
  constructor(
    public code: EngineErrorCode,
    /** Friendly and actionable — this string is shown to the user verbatim. */
    message: string,
  ) {
    super(message);
    this.name = 'EngineError';
  }
}

export interface EngineLimits {
  maxFiles: number;
  maxBytesPerFile: number;
}

/** RFC-001 §3 — free tier. Pro raises these; the plan claim gates client-side. */
export const FREE_LIMITS: EngineLimits = { maxFiles: 10, maxBytesPerFile: 200 * 1024 * 1024 };
export const PRO_LIMITS: EngineLimits = { maxFiles: 200, maxBytesPerFile: 2048 * 1024 * 1024 };

/** Probes the runtime once, so engines can pick a path and fall back gracefully. */
export async function probeContext(): Promise<EngineContext> {
  const isolated = typeof globalThis.crossOriginIsolated === 'boolean' ? globalThis.crossOriginIsolated : false;

  let webgpu = false;
  try {
    const gpu = (navigator as Navigator & { gpu?: { requestAdapter(): Promise<unknown> } }).gpu;
    webgpu = gpu ? (await gpu.requestAdapter()) !== null : false;
  } catch {
    webgpu = false;
  }

  const cores = navigator.hardwareConcurrency || 2;
  return { crossOriginIsolated: isolated, webgpu, threads: Math.max(2, cores - 2) };
}

export const formatBytes = (n: number): string => {
  if (n >= 1_073_741_824) return `${(n / 1_073_741_824).toFixed(1)} GB`;
  if (n >= 1_048_576) return `${(n / 1_048_576).toFixed(1)} MB`;
  if (n >= 1024) return `${Math.round(n / 1024)} KB`;
  return `${n} B`;
};
