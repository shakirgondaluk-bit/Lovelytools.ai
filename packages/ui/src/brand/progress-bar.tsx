import { cn } from '../lib/utils';

interface ProgressBarProps {
  /** 0–100. Real WASM progress only — never simulated (RFC-001 §3). */
  value: number;
  className?: string;
  /** Bar height in px. Default 6. */
  height?: number;
}

/**
 * ProgressBar — accent→green gradient fill (DS §7 tool-page motion).
 * Transform-based fill so nothing animates layout.
 */
export function ProgressBar({ value, className, height = 6 }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn('w-full overflow-hidden rounded-full bg-surface2', className)}
      style={{ height }}
    >
      <div
        className="h-full origin-left rounded-full transition-transform duration-200 ease-out"
        style={{
          background: 'linear-gradient(90deg, var(--accent), var(--green))',
          transform: `scaleX(${clamped / 100})`,
        }}
      />
    </div>
  );
}

export type FileStatus = 'queued' | 'processing' | 'done' | 'error';

interface ProgressRowProps {
  name: string;
  /** Human-readable size, e.g. "4.2 MB". */
  size: string;
  value: number;
  status: FileStatus;
  onRemove?: () => void;
  className?: string;
}

/**
 * ProgressRow — one file in the processing queue (DS §12).
 * Percentage numerals are always Space Grotesk.
 */
export function ProgressRow({ name, size, value, status, onRemove, className }: ProgressRowProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-3.5 rounded-lg border border-line bg-surface px-4 py-3',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-surface2 font-grotesk text-[10.5px] font-bold text-fg3"
      >
        {name.split('.').pop()?.toUpperCase().slice(0, 4) ?? 'FILE'}
      </span>
      <div className="min-w-0 flex-1">
        <div className="mb-1.5 flex items-baseline justify-between gap-3">
          <span className="truncate text-[13.5px] font-medium text-fg">{name}</span>
          <span className="shrink-0 text-[12px] text-fg3">{size}</span>
        </div>
        <ProgressBar value={status === 'done' ? 100 : value} height={5} />
      </div>
      <span className="w-12 shrink-0 text-right font-grotesk text-[13px] font-semibold text-fg2">
        {status === 'done' ? (
          <span className="text-success">✓</span>
        ) : status === 'error' ? (
          <span style={{ color: 'var(--error)' }}>!</span>
        ) : (
          `${Math.round(value)}%`
        )}
      </span>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${name}`}
          className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-fg3 transition-colors duration-150 hover:bg-surface2 hover:text-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          ✕
        </button>
      )}
    </div>
  );
}
