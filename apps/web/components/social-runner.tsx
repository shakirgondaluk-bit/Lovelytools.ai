'use client';

import { useId, useRef, useState } from 'react';
import type { Category, ToolDefinition } from '@lovelytools/registry';
import {
  useAudioTool,
  type AudioFormat,
  type AudioQuality,
} from '@lovelytools/engine-audio';
import {
  DEFAULT_MODEL_TIER,
  SPEECH_ACCEPT,
  SPEECH_LANGUAGES,
  SPEECH_MODELS,
  formatTimestamp,
  toSrt,
  toTxt,
  toVtt,
  useSpeechTool,
  type SpeechLanguage,
  type TranscriptSegment,
} from '@lovelytools/engine-speech';
import { FREE_LIMITS, formatBytes } from '@lovelytools/engines-core';
import { Button, ProgressBar, SegmentedToggle, UploadZone } from '@lovelytools/ui';
import {
  downloadText,
  ProgressBlock,
  SourceCard,
  stemOf,
  type MediaSource,
} from '@/components/social-shared';
import { TranscribeFlow } from '@/components/transcribe-view';
import {
  fetchMediaUrl,
  UrlIngestError,
  validateMediaUrl,
  type UrlIngestProgress,
} from '@/lib/url-ingest';

/**
 * SocialRunner — the island for the social-media-tools category (RFC-001 §9).
 *
 * All four tools share one acquisition step (paste a direct media link, or drop
 * a file) and then split: the extract tools hand the File to the audio engine,
 * the caption tools to the speech engine. The URL fetch happens right here in
 * the user's browser — there is no server in this path, which is both the
 * privacy story and the honest limit (platform pages can't work; the UI says so).
 */

const EXTRACT_TOOLS = new Set(['video-url-to-audio', 'video-audio-downloader']);
/** Tools whose page leads with the URL input; the rest lead with the dropzone. */
const URL_FIRST = new Set(['video-url-to-audio', 'video-url-caption-generator']);

const MEDIA_ACCEPT = `${SPEECH_ACCEPT},.mkv,.avi,.3gp`;

export function SocialRunner({ tool, category }: { tool: ToolDefinition; category: Category }) {
  const [source, setSource] = useState<MediaSource | null>(null);

  return (
    <div className="flex flex-col gap-5 rounded-2xl border border-line bg-surface p-6 sm:p-8">
      {!source ? (
        <SourceStep tool={tool} category={category} onSource={setSource} />
      ) : tool.slug === 'transcribe' ? (
        <TranscribeFlow tool={tool} source={source} onReset={() => setSource(null)} />
      ) : EXTRACT_TOOLS.has(tool.slug) ? (
        <ExtractStep tool={tool} source={source} onReset={() => setSource(null)} />
      ) : (
        <CaptionStep tool={tool} source={source} onReset={() => setSource(null)} />
      )}
    </div>
  );
}

/* ── Step 1 · get the media ─────────────────────────────────────────────────── */

function SourceStep({
  tool,
  category,
  onSource,
}: {
  tool: ToolDefinition;
  category: Category;
  onSource: (source: MediaSource) => void;
}) {
  const [mode, setMode] = useState<'url' | 'file'>(URL_FIRST.has(tool.slug) ? 'url' : 'file');
  const [url, setUrl] = useState('');
  const [fetching, setFetching] = useState(false);
  const [progress, setProgress] = useState<UrlIngestProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const inputId = useId();

  const fetchUrl = async () => {
    setError(null);
    let parsed: URL;
    try {
      parsed = validateMediaUrl(url);
    } catch (caught) {
      setError(caught instanceof UrlIngestError ? caught.message : 'That URL could not be read.');
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setFetching(true);
    setProgress({ pct: 0, receivedBytes: 0, totalBytes: null });
    try {
      const fetched = await fetchMediaUrl(parsed, {
        maxBytes: FREE_LIMITS.maxBytesPerFile,
        signal: controller.signal,
        onProgress: setProgress,
      });
      onSource({ file: fetched.file, origin: 'url', url: parsed.href });
    } catch (caught) {
      if (caught instanceof UrlIngestError && caught.kind === 'cancelled') {
        setError(null);
      } else {
        setError(caught instanceof UrlIngestError ? caught.message : 'That URL could not be fetched.');
      }
    } finally {
      setFetching(false);
      setProgress(null);
      abortRef.current = null;
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <SegmentedToggle
        aria-label="How to provide the video"
        options={[
          { value: 'url', label: 'Paste a link' },
          { value: 'file', label: 'Drop a file' },
        ]}
        value={mode}
        onChange={(next) => {
          setMode(next);
          setError(null);
        }}
        className="self-start"
      />

      {mode === 'url' ? (
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!fetching) void fetchUrl();
          }}
        >
          <label htmlFor={inputId} className="text-[13.5px] font-medium text-fg2">
            Direct link to a video or audio file
          </label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              id={inputId}
              type="url"
              inputMode="url"
              autoComplete="off"
              spellCheck={false}
              placeholder="https://example.com/clip.mp4"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={fetching}
              className="flex-1 rounded-lg border border-line bg-bg2 px-3.5 py-2.5 font-sans text-[14px] text-fg placeholder:text-fg3 focus:border-accent focus:outline-none"
            />
            {fetching ? (
              <Button type="button" variant="secondary" onClick={() => abortRef.current?.abort()}>
                Cancel
              </Button>
            ) : (
              <Button type="submit">Fetch it</Button>
            )}
          </div>

          {fetching && progress && (
            <div aria-live="polite" className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-[12.5px] text-fg2">
                <span>Your browser is downloading it — not our servers</span>
                <span className="font-grotesk">
                  {progress.pct !== null
                    ? `${progress.pct}%`
                    : formatBytes(progress.receivedBytes)}
                </span>
              </div>
              <ProgressBar value={progress.pct ?? 0} />
            </div>
          )}

          {error && (
            <p role="alert" className="max-w-[640px] text-[13.5px] leading-[1.6]" style={{ color: 'var(--error)' }}>
              {error}
            </p>
          )}

          <p className="max-w-[640px] text-[12.5px] leading-[1.6] text-fg3">
            Works with direct links to media files — the kind that end in .mp4, .webm or .mp3.
            YouTube, TikTok and Instagram pages aren&rsquo;t files and can&rsquo;t be fetched;
            if the video is yours, use the platform&rsquo;s export and drop the file here instead.
          </p>
        </form>
      ) : (
        <UploadZone
          accept={MEDIA_ACCEPT}
          maxFiles={1}
          label="Drop a video or audio file here"
          onFiles={(files) => {
            const next = files[0];
            if (next) onSource({ file: next, origin: 'file' });
          }}
          categoryCode={category.code}
          categoryHue={category.hue}
          categoryHueOnLight={category.hueOnLight}
        />
      )}
    </div>
  );
}

/* ── Step 2a · extract audio (audio engine) ────────────────────────────────── */

const FORMAT_OPTIONS = [
  { value: 'mp3', label: 'MP3' },
  { value: 'wav', label: 'WAV' },
  { value: 'm4a', label: 'M4A' },
  { value: 'ogg', label: 'OGG' },
] as const;

const QUALITY_OPTIONS = [
  { value: 'high', label: 'High · 256k' },
  { value: 'balanced', label: 'Balanced · 192k' },
  { value: 'small', label: 'Small · 96k' },
] as const;

function ExtractStep({
  tool,
  source,
  onReset,
}: {
  tool: ToolDefinition;
  source: MediaSource;
  onReset: () => void;
}) {
  // The downloader exposes format + quality; the URL-to-audio tool is "one job,
  // one button" and stays fixed on MP3.
  const chooseFormat = tool.slug === 'video-audio-downloader';
  const [format, setFormat] = useState<AudioFormat>('mp3');
  const [quality, setQuality] = useState<AudioQuality>(chooseFormat ? 'high' : 'balanced');
  const audio = useAudioTool(tool.slug);

  const busy = audio.state === 'running' || audio.state === 'loading-engine';
  const reset = () => {
    audio.reset();
    onReset();
  };

  return (
    <div className="flex flex-col gap-5">
      <SourceCard source={source} onReset={reset} />

      {chooseFormat && audio.state !== 'done' && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <span className="text-[13.5px] font-medium text-fg2">Audio format</span>
            <SegmentedToggle
              aria-label="Audio format"
              options={FORMAT_OPTIONS}
              value={format}
              onChange={setFormat}
              className="self-start"
            />
          </div>
          {format !== 'wav' && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[13.5px] font-medium text-fg2">Quality</span>
              <SegmentedToggle
                aria-label="Quality"
                options={QUALITY_OPTIONS}
                value={quality}
                onChange={setQuality}
                className="self-start"
              />
            </div>
          )}
        </div>
      )}

      {busy && (
        <ProgressBlock
          progress={audio.progress}
          loadingEngine={audio.state === 'loading-engine'}
          note="Loading the audio engine — this happens once, then it's cached."
        />
      )}

      {audio.error && (
        <p role="alert" className="text-[13.5px]" style={{ color: 'var(--error)' }}>
          {audio.error}
        </p>
      )}

      {audio.result && (
        <div className="flex flex-col gap-3 rounded-lg border border-line bg-bg2 p-4">
          <p className="flex items-center gap-2 text-sm text-fg">
            <span aria-hidden="true" className="text-success">✓</span>
            Done in {(audio.result.elapsedMs / 1000).toFixed(1)}s ·{' '}
            {formatBytes(audio.result.inputBytes)} → {formatBytes(audio.result.outputBytes)}
          </p>
          {audio.result.warnings.map((warning) => (
            <p key={warning} className="text-[12.5px] text-fg3">{warning}</p>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        {audio.state === 'done' && audio.result ? (
          <>
            <Button asChild>
              <a href={URL.createObjectURL(audio.result.blob)} download={audio.result.filename}>
                Download {audio.result.filename}
              </a>
            </Button>
            <Button variant="ghost" onClick={reset}>Do another</Button>
          </>
        ) : busy ? (
          <Button variant="secondary" onClick={audio.cancel}>Cancel</Button>
        ) : (
          <Button onClick={() => void audio.run(source.file, chooseFormat ? { format, quality } : { quality })}>
            Extract audio
          </Button>
        )}
      </div>

      <p className="text-[12.5px] text-fg3">
        {source.origin === 'url'
          ? 'Your browser fetched that link and converts it right here. Open your network inspector — nothing goes to our servers.'
          : 'This runs on your device. Open your network inspector and watch — nothing is uploaded.'}
      </p>
    </div>
  );
}

/* ── Step 2b · captions & subtitles (speech engine) ────────────────────────── */

function CaptionStep({
  tool,
  source,
  onReset,
}: {
  tool: ToolDefinition;
  source: MediaSource;
  onReset: () => void;
}) {
  const [language, setLanguage] = useState<SpeechLanguage>('auto');
  const [segments, setSegments] = useState<TranscriptSegment[] | null>(null);
  const speech = useSpeechTool(tool.slug);
  const languageId = useId();

  const busy = speech.state === 'running' || speech.state === 'loading-engine';
  const reset = () => {
    speech.reset();
    setSegments(null);
    onReset();
  };

  // Adopt the engine's segments once, then the editor owns them.
  if (speech.result && segments === null) setSegments(speech.result.segments);

  const stem = stemOf(source.file.name);

  return (
    <div className="flex flex-col gap-5">
      <SourceCard source={source} onReset={reset} />

      {!segments && (
        <>
          <div className="flex max-w-[320px] flex-col gap-1.5">
            <label htmlFor={languageId} className="text-[13.5px] font-medium text-fg2">
              Spoken language
            </label>
            <select
              id={languageId}
              value={language}
              onChange={(e) => setLanguage(e.target.value as SpeechLanguage)}
              disabled={busy}
              className="rounded-lg border border-line bg-bg2 px-3.5 py-2.5 font-sans text-[14px] text-fg focus:border-accent focus:outline-none"
            >
              {SPEECH_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>{lang.label}</option>
              ))}
            </select>
          </div>

          {busy && (
            <ProgressBlock
              progress={speech.progress}
              loadingEngine={speech.progress?.stage.startsWith('Downloading') ?? false}
              note={`The speech model (${SPEECH_MODELS[DEFAULT_MODEL_TIER].label}) downloads once from the Hugging Face CDN, then it's cached. Your audio never leaves this device.`}
            />
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
              <Button onClick={() => void speech.run(source.file, { language })}>
                Generate {tool.slug === 'video-subtitle-generator' ? 'subtitles' : 'captions'}
              </Button>
            )}
          </div>
        </>
      )}

      {segments && speech.result && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2 rounded-lg border border-line bg-bg2 p-4">
            <p className="flex items-center gap-2 text-sm text-fg">
              <span aria-hidden="true" className="text-success">✓</span>
              {segments.length} caption{segments.length === 1 ? '' : 's'} from{' '}
              {Math.round(speech.result.durationSec)}s of audio, in{' '}
              {(speech.result.elapsedMs / 1000).toFixed(1)}s
            </p>
            {speech.result.warnings.map((warning) => (
              <p key={warning} className="text-[12.5px] text-fg3">{warning}</p>
            ))}
            <p className="text-[12.5px] text-fg3">
              On-device recognition is a draft, not a court reporter — skim each line below and
              fix what it misheard before exporting.
            </p>
          </div>

          <ol className="flex max-h-[420px] flex-col gap-2 overflow-y-auto pr-1" aria-label="Transcript editor">
            {segments.map((seg, i) => (
              <li key={seg.id} className="flex flex-col gap-1 rounded-lg border border-line bg-bg2 p-3">
                <span className="font-grotesk text-[11.5px] tracking-wide text-fg3">
                  {formatTimestamp(seg.start, '.')} → {formatTimestamp(seg.end, '.')}
                </span>
                <textarea
                  aria-label={`Caption ${i + 1}`}
                  value={seg.text}
                  rows={Math.max(1, Math.ceil(seg.text.length / 80))}
                  onChange={(e) =>
                    setSegments((prev) =>
                      prev ? prev.map((s) => (s.id === seg.id ? { ...s, text: e.target.value } : s)) : prev,
                    )
                  }
                  className="resize-none rounded-md border border-transparent bg-transparent px-1 py-0.5 font-sans text-[14px] leading-[1.5] text-fg focus:border-accent focus:outline-none"
                />
              </li>
            ))}
          </ol>

          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={() => downloadText(toSrt(segments), `${stem}.srt`, 'application/x-subrip')}>
              Download .srt
            </Button>
            <Button variant="secondary" onClick={() => downloadText(toVtt(segments), `${stem}.vtt`, 'text/vtt')}>
              Download .vtt
            </Button>
            <Button variant="secondary" onClick={() => downloadText(toTxt(segments), `${stem}.txt`, 'text/plain')}>
              Download .txt
            </Button>
            <Button
              variant="ghost"
              onClick={() => void navigator.clipboard.writeText(toTxt(segments)).catch(() => undefined)}
            >
              Copy text
            </Button>
            <Button variant="ghost" onClick={reset}>Transcribe another</Button>
          </div>
        </div>
      )}

      <p className="text-[12.5px] text-fg3">
        Transcription happens on your device. The model downloads once; your{' '}
        {source.origin === 'url' ? 'fetched media' : 'file'} never goes anywhere.
      </p>
    </div>
  );
}
