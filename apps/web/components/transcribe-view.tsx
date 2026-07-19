'use client';

// lovelytools.ai — the Transcribe Video/Audio/URL flow.
//
// After the shared source step (paste a link / drop a file), this runs the
// speech engine with language auto-detection and renders the transcript INLINE,
// right below the input — a reading surface with inline timestamp markers, a
// Copy button on the panel's top-right, and an export rail beside it
// (TXT / PDF / DOCX / SRT / VTT), plus a timestamps toggle and an edit mode.
import { useEffect, useId, useState } from 'react';
import type { ToolDefinition } from '@lovelytools/registry';
import {
  DEFAULT_MODEL_TIER,
  SPEECH_LANGUAGES,
  SPEECH_MODELS,
  toSrt,
  toVtt,
  useSpeechTool,
  webgpuAvailable,
  type SpeechDevice,
  type SpeechLanguage,
  type SpeechModelTier,
  type TranscriptSegment,
} from '@lovelytools/engine-speech';
import { formatBytes } from '@lovelytools/engines-core';
import { Button, SegmentedToggle } from '@lovelytools/ui';
import {
  downloadBlob,
  downloadText,
  ProgressBlock,
  SourceCard,
  stemOf,
  type MediaSource,
} from '@/components/social-shared';
import {
  shortTimestamp,
  transcriptText,
  transcriptToDocx,
  transcriptToPdf,
} from '@/lib/transcript-export';

const TIER_LABELS: Record<SpeechModelTier, string> = {
  fast: 'Fast',
  balanced: 'Balanced',
  high: 'High',
  max: 'Max',
};

export function TranscribeFlow({
  tool,
  source,
  onReset,
}: {
  tool: ToolDefinition;
  source: MediaSource;
  onReset: () => void;
}) {
  const [language, setLanguage] = useState<SpeechLanguage>('auto');
  const [tier, setTier] = useState<SpeechModelTier>(DEFAULT_MODEL_TIER);
  const [gpu, setGpu] = useState(false);
  const [segments, setSegments] = useState<TranscriptSegment[] | null>(null);
  const speech = useSpeechTool(tool.slug);
  const languageId = useId();

  // Max (large-v3-turbo) only exists as a WebGPU build — offering it on a CPU
  // device would be a button that ends in an error, so it appears when the
  // probe says it can actually run.
  useEffect(() => {
    let cancelled = false;
    void webgpuAvailable().then((ok) => {
      if (!cancelled) setGpu(ok);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const device: SpeechDevice = gpu ? 'webgpu' : 'wasm';
  const tiers = (Object.keys(TIER_LABELS) as SpeechModelTier[]).filter(
    (t) => SPEECH_MODELS[t].bytes[device] !== null,
  );
  const modelBytes = SPEECH_MODELS[tier].bytes[device];

  const busy = speech.state === 'running' || speech.state === 'loading-engine';
  const reset = () => {
    speech.reset();
    setSegments(null);
    onReset();
  };

  // Adopt the engine's segments once; after that the editor owns them.
  if (speech.result && segments === null) setSegments(speech.result.segments);

  return (
    <div className="flex flex-col gap-5">
      <SourceCard source={source} onReset={reset} />

      {!segments && (
        <>
          {!busy && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <span className="text-[13.5px] font-medium text-fg2">Accuracy</span>
                <SegmentedToggle
                  aria-label="Transcription accuracy"
                  options={tiers.map((t) => ({ value: t, label: TIER_LABELS[t] }))}
                  value={tier}
                  onChange={setTier}
                  className="self-start"
                />
                <p className="text-[12.5px] text-fg3">
                  {SPEECH_MODELS[tier].label}
                  {modelBytes !== null && ` · one-time download ≈ ${formatBytes(modelBytes)}`}
                  {gpu ? ' · GPU-accelerated' : ' · runs on CPU (no WebGPU here)'}
                </p>
              </div>

              <div className="flex max-w-[320px] flex-col gap-1.5">
                <label htmlFor={languageId} className="text-[13.5px] font-medium text-fg2">
                  Spoken language
                </label>
                <select
                  id={languageId}
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as SpeechLanguage)}
                  className="rounded-lg border border-line bg-bg2 px-3.5 py-2.5 font-sans text-[14px] text-fg focus:border-accent focus:outline-none"
                >
                  {SPEECH_LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code}>{lang.label}</option>
                  ))}
                </select>
                <p className="text-[12.5px] text-fg3">
                  Leave on auto-detect — the model senses the language on its own.
                </p>
              </div>
            </div>
          )}

          {busy && (
            <ProgressBlock
              progress={speech.progress}
              loadingEngine={speech.progress?.stage.startsWith('Downloading') ?? false}
              note={`${SPEECH_MODELS[tier].label} downloads once from the Hugging Face CDN, then it's cached. Your media never leaves this device.`}
            />
          )}

          {busy && speech.partial && (
            <div
              aria-live="polite"
              className="max-h-[200px] overflow-y-auto rounded-lg border border-line bg-bg2 p-4"
            >
              <p dir="auto" className="text-[14px] leading-[1.8] text-fg2">
                {speech.partial}
                <span aria-hidden="true" className="animate-lt-pulse text-fg3">▍</span>
              </p>
            </div>
          )}

          {speech.error && (
            <p role="alert" className="text-[13.5px]" style={{ color: 'var(--error)' }}>
              {speech.error}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3">
            {busy ? (
              <Button variant="secondary" onClick={speech.cancel}>Cancel</Button>
            ) : (
              <Button onClick={() => void speech.run(source.file, { language, model: tier })}>
                Transcribe
              </Button>
            )}
          </div>
        </>
      )}

      {segments && speech.result && (
        <TranscriptPanel
          segments={segments}
          setSegments={setSegments}
          stem={stemOf(source.file.name)}
          durationSec={speech.result.durationSec}
          model={speech.result.model}
          device={speech.result.device}
          warnings={speech.result.warnings}
          onReset={reset}
        />
      )}

      <p className="text-[12.5px] text-fg3">
        Transcription happens on your device. The model downloads once; your{' '}
        {source.origin === 'url' ? 'fetched media' : 'file'} never goes anywhere.
      </p>
    </div>
  );
}

/* ── The output surface + export rail ──────────────────────────────────────── */

type Exporting = 'pdf' | 'docx' | null;

function TranscriptPanel({
  segments,
  setSegments,
  stem,
  durationSec,
  model,
  device,
  warnings,
  onReset,
}: {
  segments: TranscriptSegment[];
  setSegments: React.Dispatch<React.SetStateAction<TranscriptSegment[] | null>>;
  stem: string;
  durationSec: number;
  model: string;
  device: SpeechDevice;
  warnings: string[];
  onReset: () => void;
}) {
  const [showTimestamps, setShowTimestamps] = useState(true);
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState<Exporting>(null);
  const timestampsId = useId();

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(transcriptText(segments, showTimestamps));
      setCopied(true);
      setTimeout(() => setCopied(false), 2_000);
    } catch {
      /* clipboard blocked — the button simply doesn't confirm */
    }
  };

  const exportDoc = async (kind: 'pdf' | 'docx') => {
    setExporting(kind);
    try {
      const options = { title: stem, timestamps: showTimestamps };
      const blob =
        kind === 'pdf'
          ? await transcriptToPdf(segments, options)
          : await transcriptToDocx(segments, options);
      downloadBlob(blob, `${stem}.${kind}`);
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {warnings.map((warning) => (
        <p key={warning} className="text-[12.5px] text-fg3">{warning}</p>
      ))}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_230px]">
        {/* ── Transcript ── */}
        <section
          aria-label="Transcript"
          className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-line bg-bg2"
        >
          <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
            <div className="flex min-w-0 flex-col">
              <h2 className="truncate font-grotesk text-[15px] font-semibold text-fg">{stem}</h2>
              <p className="text-[12px] text-fg3">
                {segments.length} segment{segments.length === 1 ? '' : 's'} ·{' '}
                {shortTimestamp(durationSec)} of audio · {model} on{' '}
                {device === 'webgpu' ? 'GPU' : 'CPU'}
              </p>
            </div>
            <Button variant="secondary" onClick={() => void copy()} className="shrink-0">
              {copied ? '✓ Copied' : 'Copy'}
            </Button>
          </header>

          <div className="max-h-[440px] overflow-y-auto p-5">
            {editing ? (
              <ol className="flex flex-col gap-2" aria-label="Transcript editor">
                {segments.map((seg, i) => (
                  <li key={seg.id} className="flex flex-col gap-1 rounded-lg border border-line bg-surface p-3">
                    <span className="font-grotesk text-[11.5px] tracking-wide text-fg3">
                      {shortTimestamp(seg.start)} → {shortTimestamp(seg.end)}
                    </span>
                    <textarea
                      aria-label={`Segment ${i + 1}`}
                      value={seg.text}
                      dir="auto"
                      rows={Math.max(1, Math.ceil(seg.text.length / 70))}
                      onChange={(e) =>
                        setSegments((prev) =>
                          prev ? prev.map((s) => (s.id === seg.id ? { ...s, text: e.target.value } : s)) : prev,
                        )
                      }
                      className="resize-none rounded-md border border-transparent bg-transparent px-1 py-0.5 font-sans text-[14.5px] leading-[1.6] text-fg focus:border-accent focus:outline-none"
                    />
                  </li>
                ))}
              </ol>
            ) : (
              // dir="auto" lets RTL transcripts (Urdu, Arabic, Hebrew) flow
              // right-to-left with the timestamp markers riding along.
              <p dir="auto" className="text-[15px] leading-[1.9] text-fg">
                {segments.map((seg) => (
                  <span key={seg.id}>
                    {showTimestamps && (
                      <span dir="ltr" className="font-grotesk text-[11.5px] text-fg3">
                        ({shortTimestamp(seg.start)}){' '}
                      </span>
                    )}
                    {seg.text.trim()}{' '}
                  </span>
                ))}
              </p>
            )}
          </div>
        </section>

        {/* ── Export rail ── */}
        <aside className="flex flex-col gap-5" aria-label="Export and options">
          <div className="flex flex-col gap-1 rounded-xl border border-line bg-bg2 p-3">
            <p className="px-2 pb-1 font-grotesk text-[11px] font-semibold uppercase tracking-[0.13em] text-fg3">
              Export
            </p>
            <RailButton onClick={() => downloadText(transcriptText(segments, showTimestamps), `${stem}.txt`, 'text/plain')}>
              Download TXT
            </RailButton>
            <RailButton busy={exporting === 'pdf'} onClick={() => void exportDoc('pdf')}>
              Download PDF
            </RailButton>
            <RailButton busy={exporting === 'docx'} onClick={() => void exportDoc('docx')}>
              Download DOCX
            </RailButton>
            <RailButton onClick={() => downloadText(toSrt(segments), `${stem}.srt`, 'application/x-subrip')}>
              Download SRT
            </RailButton>
            <RailButton onClick={() => downloadText(toVtt(segments), `${stem}.vtt`, 'text/vtt')}>
              Download VTT
            </RailButton>
          </div>

          <div className="flex flex-col gap-1 rounded-xl border border-line bg-bg2 p-3">
            <p className="px-2 pb-1 font-grotesk text-[11px] font-semibold uppercase tracking-[0.13em] text-fg3">
              More
            </p>
            <label
              htmlFor={timestampsId}
              className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-2 text-[13.5px] text-fg2 transition-colors hover:bg-surface2 hover:text-fg"
            >
              <input
                id={timestampsId}
                type="checkbox"
                checked={showTimestamps}
                onChange={(e) => setShowTimestamps(e.target.checked)}
                className="h-4 w-4 accent-[var(--accent)]"
              />
              Show timestamps
            </label>
            <RailButton onClick={() => setEditing((e) => !e)}>
              {editing ? 'Done editing' : 'Edit transcript'}
            </RailButton>
            <RailButton onClick={onReset}>Transcribe another</RailButton>
          </div>

          <p className="px-1 text-[11.5px] leading-[1.55] text-fg3">
            SRT and VTT always carry timestamps. The toggle applies to the view,
            TXT, PDF and DOCX.
          </p>
        </aside>
      </div>
    </div>
  );
}

function RailButton({
  onClick,
  busy = false,
  children,
}: {
  onClick: () => void;
  busy?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="flex w-full items-center rounded-lg px-2 py-2 text-left text-[13.5px] font-medium text-fg2 transition-colors hover:bg-surface2 hover:text-fg focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-1 focus-visible:outline-accent disabled:opacity-60"
    >
      {busy ? 'Preparing…' : children}
    </button>
  );
}
