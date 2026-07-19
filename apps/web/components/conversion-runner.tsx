'use client';

import type { Category, ToolDefinition } from '@lovelytools/registry';
import { bindingFor, FORMATS, useConversion, type ConversionJob } from '@lovelytools/engine-conversion';
import { Button, ProgressBar, UploadZone } from '@lovelytools/ui';

/**
 * ConversionRunner — the client island for the document conversion tools
 * (RFC-001 §9).
 *
 * Every tool here is a single fixed direction (word-to-pdf is always docx→pdf) —
 * there is no target picker, unlike a generic "convert to any format" tool. That
 * makes the binding just `{ to: FormatId }`; the source is auto-detected from
 * magic bytes by the engine itself, never trusted from the extension.
 *
 * useConversion() starts converting the moment a file is dropped — there is no
 * "configure options" step to gate on, unlike the PDF runner's page ranges or
 * watermark text. Everything below is read out of its job array.
 */
export function ConversionRunner({ tool, category }: { tool: ToolDefinition; category: Category }) {
  const binding = bindingFor(tool.slug)!;
  const conv = useConversion({ target: binding.to });

  const targetLabel = FORMATS[binding.to].label;

  return (
    <div className="flex flex-col gap-5 rounded-2xl border border-line bg-surface p-8">
      {conv.jobs.length === 0 && (
        <UploadZone
          accept={binding.accept}
          maxFiles={10}
          label={`Drop a file to convert to ${targetLabel}`}
          onFiles={(files) => void conv.addFiles(files)}
          categoryCode={category.code}
          categoryHue={category.hue}
          categoryHueOnLight={category.hueOnLight}
        />
      )}

      {conv.batchError && (
        <p className="text-[13.5px]" style={{ color: 'var(--error)' }}>
          {conv.batchError}
        </p>
      )}

      {conv.jobs.length > 0 && (
        <div className="flex flex-col gap-5">
          <ul className="flex flex-col gap-2">
            {conv.jobs.map((job) => (
              <JobRow key={job.id} job={job} />
            ))}
          </ul>

          {conv.jobs.length > 1 && (
            <p className="-mt-2 text-[12.5px] text-fg3">
              {conv.summary.done} of {conv.summary.total} done
              {conv.summary.failed > 0 && ` · ${conv.summary.failed} failed`}
            </p>
          )}

          {conv.summary.warnings.length > 0 && (
            <div className="flex flex-col gap-1.5 rounded-lg border border-line bg-bg2 p-3">
              {conv.summary.warnings.map((w) => (
                <p key={w} className="text-[12.5px] text-fg3">
                  {w}
                </p>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            {conv.summary.busy ? (
              <Button variant="secondary" onClick={conv.cancelAll}>
                Cancel
              </Button>
            ) : (
              <>
                {conv.summary.done > 0 && (
                  <Button onClick={() => void conv.downloadAll()}>
                    {conv.summary.done > 1 ? 'Download all (.zip)' : 'Download'}
                  </Button>
                )}
                <Button variant="ghost" onClick={conv.reset}>
                  {conv.summary.done > 0 ? 'Convert more' : 'Choose other files'}
                </Button>
              </>
            )}
          </div>

          <p className="text-[12.5px] text-fg3">
            This runs on your device. Open your network inspector and watch — nothing is uploaded.
          </p>
        </div>
      )}
    </div>
  );
}

function JobRow({ job }: { job: ConversionJob }) {
  const busy = job.status === 'converting' || job.status === 'queued' || job.status === 'detecting';

  return (
    <li className="flex flex-col gap-2 rounded-lg border border-line bg-bg2 px-4 py-3">
      <div className="flex items-center justify-between gap-4">
        <span className="truncate text-sm text-fg2">{job.file.name}</span>
        <span className="shrink-0 text-[12.5px] text-fg3">{formatBytes(job.file.size)}</span>
      </div>

      {busy && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-[11.5px] text-fg3">
            <span>{job.stage || 'Working'}</span>
            <span className="font-grotesk">{job.progress}%</span>
          </div>
          <ProgressBar value={job.progress} />
        </div>
      )}

      {job.status === 'error' && (
        <p className="text-[12.5px]" style={{ color: 'var(--error)' }}>
          {job.error?.message ?? job.stage}
        </p>
      )}

      {job.status === 'done' && job.result && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1.5 text-[12.5px] text-success">
            <span aria-hidden="true">✓</span>
            {job.result.filename}
          </span>
          {/* The engine's own contract (types.ts: ConversionResult) says anything
              below "high" fidelity must be surfaced — a "good" or "text-only" result
              silently handed over as if it were a perfect copy would misrepresent
              what actually happened to the document. */}
          {job.result.fidelity !== 'high' && (
            <span
              className="rounded-full px-2 py-0.5 text-[11px] font-medium"
              style={{
                background:
                  job.result.fidelity === 'good'
                    ? 'color-mix(in srgb, var(--star) 16%, transparent)'
                    : 'color-mix(in srgb, var(--error) 14%, transparent)',
                color: job.result.fidelity === 'good' ? 'var(--star)' : 'var(--error)',
              }}
            >
              {job.result.fidelity === 'good' ? 'minor differences' : 'text only'}
            </span>
          )}
        </div>
      )}
      {job.status === 'done' && job.result && job.result.warnings.length > 0 && (
        <div className="flex flex-col gap-1">
          {job.result.warnings.map((w) => (
            <p key={w} className="text-[11.5px] text-fg3">
              {w}
            </p>
          ))}
        </div>
      )}
    </li>
  );
}

function formatBytes(n: number): string {
  if (n >= 1_048_576) return `${(n / 1_048_576).toFixed(1)} MB`;
  if (n >= 1024) return `${Math.round(n / 1024)} KB`;
  return `${n} B`;
}
