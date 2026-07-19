// lovelytools.ai — Conversion Engine · shared types

export type FormatId =
  | 'pdf'
  | 'doc'
  | 'docx'
  | 'xls'
  | 'xlsx'
  | 'ppt'
  | 'pptx'
  | 'txt'
  | 'html'
  | 'csv'
  | 'xml'
  | 'json';

export type FormatFamily = 'document' | 'spreadsheet' | 'presentation' | 'data' | 'text';

/** Result quality contract — the UI must surface anything below `high`. */
export type Fidelity = 'high' | 'good' | 'text-only';

export type JobStatus = 'queued' | 'detecting' | 'converting' | 'done' | 'error' | 'cancelled';

export interface ConversionRequest {
  file: File;
  /** Omit to auto-detect via magic bytes (recommended — extensions lie). */
  from?: FormatId;
  to: FormatId;
}

export interface ConversionResult {
  blob: Blob;
  filename: string;
  fidelity: Fidelity;
  /** Human-readable caveats, e.g. "Images were dropped (text-only extract)". */
  warnings: string[];
  /** Milliseconds spent converting (for tool_stats beacons — counts only, never content). */
  elapsedMs: number;
}

export interface ConversionJob {
  id: string;
  file: File;
  from: FormatId;
  to: FormatId;
  status: JobStatus;
  /** 0–100. Real progress from the converter — never simulated (RFC-001 §3). */
  progress: number;
  /** Current stage label for the UI, e.g. "Extracting text". */
  stage: string;
  result?: ConversionResult;
  error?: EngineError;
}

export type EngineErrorCode =
  | 'unsupported-route'
  | 'undetectable-format'
  | 'corrupt-file'
  | 'password-protected'
  | 'too-large'
  | 'too-many-files'
  | 'same-format'
  | 'cancelled'
  | 'internal';

export class EngineError extends Error {
  constructor(
    public code: EngineErrorCode,
    /** Friendly, actionable message — shown verbatim in the UI (DS §12). */
    message: string,
  ) {
    super(message);
    this.name = 'EngineError';
  }
}

export interface ProgressEvent {
  jobId: string;
  pct: number;
  stage: string;
}

export type ProgressFn = (e: ProgressEvent) => void;

export interface EngineLimits {
  maxFiles: number;
  maxBytesPerFile: number;
}

export const FREE_LIMITS: EngineLimits = { maxFiles: 10, maxBytesPerFile: 200 * 1024 * 1024 };
export const PRO_LIMITS: EngineLimits = { maxFiles: 200, maxBytesPerFile: 2 * 1024 * 1024 * 1024 };

/* ---------------- worker protocol ---------------- */

export interface WorkerConvertMsg {
  kind: 'convert';
  jobId: string;
  buf: ArrayBuffer;
  name: string;
  from: FormatId;
  to: FormatId;
}

export interface WorkerCancelMsg {
  kind: 'cancel';
  jobId: string;
}

export type WorkerInMsg = WorkerConvertMsg | WorkerCancelMsg;

export type WorkerOutMsg =
  | { kind: 'progress'; jobId: string; pct: number; stage: string }
  | {
      kind: 'done';
      jobId: string;
      buf: ArrayBuffer;
      mime: string;
      filename: string;
      fidelity: Fidelity;
      warnings: string[];
      elapsedMs: number;
    }
  | { kind: 'error'; jobId: string; code: EngineErrorCode; message: string };
