'use client';

// lovelytools.ai — pieces shared by the social-media runner and the transcribe
// view. Split out so transcribe-view.tsx and social-runner.tsx can both use
// them without importing each other.
import { formatBytes } from '@lovelytools/engines-core';
import { ProgressBar } from '@lovelytools/ui';

export interface MediaSource {
  file: File;
  origin: 'url' | 'file';
  url?: string;
}

export function SourceCard({ source, onReset }: { source: MediaSource; onReset: () => void }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-line bg-bg2 px-4 py-3">
      <div className="flex min-w-0 flex-col">
        <span className="truncate text-sm text-fg2">{source.file.name}</span>
        {source.url && <span className="truncate text-[12px] text-fg3">{source.url}</span>}
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <span className="text-[12.5px] text-fg3">
          {formatBytes(source.file.size)}
          {source.file.type ? ` · ${source.file.type}` : ''}
        </span>
        <button
          type="button"
          onClick={onReset}
          className="text-[12.5px] font-medium text-accent transition-colors hover:text-fg"
        >
          Change
        </button>
      </div>
    </div>
  );
}

export function ProgressBlock({
  progress,
  loadingEngine,
  note,
}: {
  progress: { pct: number; stage: string } | null;
  loadingEngine: boolean;
  note?: string;
}) {
  if (!progress) return null;
  return (
    <div aria-live="polite" className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-[12.5px] text-fg2">
        <span>{progress.stage}</span>
        <span className="font-grotesk">{progress.pct}%</span>
      </div>
      <ProgressBar value={progress.pct} />
      {loadingEngine && note && <p className="text-[12.5px] text-fg3">{note}</p>}
    </div>
  );
}

export const stemOf = (name: string): string => name.replace(/\.[^./\\]+$/, '');

export const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1_000);
};

export const downloadText = (content: string, filename: string, mime: string) =>
  downloadBlob(new Blob([content], { type: mime }), filename);
