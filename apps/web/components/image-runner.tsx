'use client';

import { useEffect, useState } from 'react';
import type { Category, ToolDefinition } from '@lovelytools/registry';
import {
  bindingFor,
  ImageError,
  useImageTool,
  type DecodedImage,
  type EncodeOptions,
  type ImageEngine,
  type ImageFormat,
  type ImageJob,
  type ImageToolBinding,
  type ResizeMode,
  type RotateDeg,
} from '@lovelytools/engine-image';
import { Button, ProgressBar, UploadZone } from '@lovelytools/ui';
import { emptyControlState, ImageControls, type ImageControlState } from '@/components/image-controls';

/**
 * ImageRunner — the client island for every image tool (RFC-001 §9).
 *
 * One component covers 27 tools the same way PdfRunner covers 18: the engine's
 * ops share a result shape (ImageOpResult) and the binding declares what each
 * needs collected first. base64-to-image is the one tool whose primary input
 * isn't a dropped file — it gets its own small branch below.
 */
export function ImageRunner({ tool, category }: { tool: ToolDefinition; category: Category }) {
  const binding = bindingFor(tool.slug)!;

  if (binding.control.kind === 'paste-base64') {
    return <PasteBase64Runner binding={binding} action={binding.action} />;
  }

  return <FileRunner tool={tool} category={category} binding={binding} />;
}

function FileRunner({
  tool,
  category,
  binding,
}: {
  tool: ToolDefinition;
  category: Category;
  binding: ImageToolBinding;
}) {
  const [files, setFiles] = useState<File[]>([]);
  // Several tools share a capability but bind different defaults (ico-converter
  // vs favicon-generator's size lists, convert-image vs webp-converter's format
  // order) — seed those from the binding, or emptyControlState()'s one generic
  // default would silently win for every tool on that capability, not just the
  // first one built. "WebP Converter" defaulting to a JPEG output was exactly
  // this bug.
  const [control, setControl] = useState<ImageControlState>(() => {
    const base = emptyControlState();
    if (binding.capability === 'image.ico') return { ...base, icoSizes: binding.options.sizes };
    if (binding.control.kind === 'format') return { ...base, format: binding.control.formats[0] ?? base.format };
    return base;
  });
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const imageTool = useImageTool();

  const multi = binding.arity === 'multi';
  const needsControl = binding.control.kind !== 'none';
  const busy = imageTool.jobs.some((j) => j.status === 'queued' || j.status === 'working');
  const allDone = imageTool.jobs.length > 0 && imageTool.jobs.every((j) => j.status === 'done' || j.status === 'error');

  useEffect(() => {
    const f = files[0];
    if (!f) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(f);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [files]);

  const reset = () => {
    imageTool.reset();
    setFiles([]);
    setControl(emptyControlState());
  };

  const run = () => {
    void imageTool.runBatch(files, (engine, img, source, onProgress, signal) =>
      dispatch(engine, binding, img, source, control, onProgress, signal),
    );
  };

  return (
    <div className="flex flex-col gap-5 rounded-2xl border border-line bg-surface p-8">
      {files.length === 0 && (
        <UploadZone
          accept={binding.accept}
          maxFiles={multi ? 20 : 1}
          label={multi ? 'Drop your images here' : 'Drop your image here'}
          onFiles={setFiles}
          categoryCode={category.code}
          categoryHue={category.hue}
          categoryHueOnLight={category.hueOnLight}
        />
      )}

      {imageTool.batchError && (
        <p className="text-[13.5px]" style={{ color: 'var(--error)' }}>
          {imageTool.batchError}
        </p>
      )}

      {files.length > 0 && (
        <div className="flex flex-col gap-5">
          <ul className="flex flex-col gap-2">
            {files.map((file, i) => (
              <li
                key={`${file.name}-${i}`}
                className="flex items-center justify-between gap-4 rounded-lg border border-line bg-bg2 px-4 py-3"
              >
                <span className="truncate text-sm text-fg2">{file.name}</span>
                <span className="shrink-0 text-[12.5px] text-fg3">{formatBytes(file.size)}</span>
              </li>
            ))}
          </ul>

          {needsControl && imageTool.jobs.length === 0 && (
            <ImageControls
              control={binding.control}
              state={control}
              onChange={setControl}
              previewUrl={previewUrl}
              disabled={busy}
            />
          )}

          {imageTool.jobs.map((job) => (
            <JobRow key={job.id} job={job} />
          ))}

          <div className="flex flex-wrap items-center gap-3">
            {allDone ? (
              <>
                <Button onClick={() => void imageTool.downloadAll()}>
                  {imageTool.jobs.filter((j) => j.result).flatMap((j) => j.result!.files).length > 1
                    ? 'Download all (.zip)'
                    : 'Download'}
                </Button>
                <Button variant="ghost" onClick={reset}>
                  Do another
                </Button>
              </>
            ) : busy ? (
              <Button variant="secondary" onClick={imageTool.cancel}>
                Cancel
              </Button>
            ) : imageTool.jobs.length === 0 ? (
              <>
                <Button onClick={run}>{binding.action}</Button>
                <Button variant="ghost" onClick={reset}>
                  Choose other files
                </Button>
              </>
            ) : null}
          </div>

          <p className="text-[12.5px] text-fg3">
            This runs on your device. Open your network inspector and watch — nothing is uploaded.
          </p>
        </div>
      )}
    </div>
  );
}

function JobRow({ job }: { job: ImageJob }) {
  const busy = job.status === 'queued' || job.status === 'working';
  const textResult = job.result?.files.length === 1 && job.result.files[0]?.blob.type === 'text/plain';

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-line bg-bg2 px-4 py-3">
      <div className="flex items-center justify-between gap-4">
        <span className="truncate text-sm text-fg2">{job.name}</span>
        {job.status === 'done' && <span className="shrink-0 text-success">✓</span>}
      </div>

      {busy && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-[11.5px] text-fg3">
            <span>{job.stage}</span>
            <span className="font-grotesk">{job.progress}%</span>
          </div>
          <ProgressBar value={job.progress} />
        </div>
      )}

      {job.status === 'error' && (
        <p className="text-[12.5px]" style={{ color: 'var(--error)' }}>
          {job.error}
        </p>
      )}

      {job.status === 'done' && job.result && (
        <div className="flex flex-col gap-2">
          <p className="text-[12.5px] text-fg3">
            {formatBytes(job.result.stats.bytesIn)} → {formatBytes(job.result.stats.bytesOut)}
            {job.result.stats.bytesOut < job.result.stats.bytesIn && (
              <span className="text-success">
                {' '}
                ({Math.round((1 - job.result.stats.bytesOut / job.result.stats.bytesIn) * 100)}% smaller)
              </span>
            )}
          </p>
          {job.result.warnings.map((w) => (
            <p key={w} className="text-[12.5px] text-fg3">
              {w}
            </p>
          ))}
          {textResult && job.result.files[0] && <TextResultPanel blob={job.result.files[0].blob} />}
        </div>
      )}
    </div>
  );
}

/** image-to-base64's output — shown inline (copyable) rather than just downloadable. */
function TextResultPanel({ blob }: { blob: Blob }) {
  const [text, setText] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void blob.text().then((t) => {
      if (!cancelled) setText(t);
    });
    return () => {
      cancelled = true;
    };
  }, [blob]);

  return (
    <div className="flex flex-col gap-2">
      <textarea
        readOnly
        value={text}
        rows={4}
        className="w-full resize-none rounded-lg border border-line bg-bg px-3 py-2 font-mono text-[11.5px] text-fg2"
      />
      <Button
        variant="ghost"
        onClick={() => {
          void navigator.clipboard.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          });
        }}
      >
        {copied ? 'Copied!' : 'Copy to clipboard'}
      </Button>
    </div>
  );
}

/** base64-to-image: the only tool whose primary input is pasted text, not a file. */
function PasteBase64Runner({ binding, action }: { binding: ImageToolBinding; action: string }) {
  const [text, setText] = useState('');
  const imageTool = useImageTool();
  const busy = imageTool.jobs.some((j) => j.status === 'queued' || j.status === 'working');
  const job = imageTool.jobs[0];

  const run = () => {
    let file: File;
    try {
      file = buildFileFromPastedBase64(text);
    } catch {
      imageTool.reset();
      return;
    }
    void imageTool.runBatch([file], (engine, img, source, onProgress, signal) =>
      dispatch(engine, binding, img, source, emptyControlState(), onProgress, signal),
    );
  };

  return (
    <div className="flex flex-col gap-5 rounded-2xl border border-line bg-surface p-8">
      {!job && (
        <>
          <label className="flex flex-col gap-2">
            <span className="text-[13.5px] font-medium text-fg">Base64 string or data: URI</span>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="data:image/png;base64,iVBORw0KGgo…"
              rows={6}
              className="w-full resize-y rounded-lg border border-line bg-bg2 px-3.5 py-2.5 font-mono text-[12.5px] text-fg placeholder:text-fg3 focus:border-accent focus:outline-none"
            />
          </label>
          <div>
            <Button onClick={run} disabled={!text.trim()}>
              {action}
            </Button>
          </div>
        </>
      )}

      {job && <JobRow job={job} />}

      {job && (job.status === 'done' || job.status === 'error') && (
        <div className="flex flex-wrap items-center gap-3">
          {job.status === 'done' && job.result && (
            <Button onClick={() => imageTool.download(job.result!.files[0]!)}>Download</Button>
          )}
          <Button
            variant="ghost"
            onClick={() => {
              imageTool.reset();
              setText('');
            }}
          >
            Do another
          </Button>
        </div>
      )}

      <p className="text-[12.5px] text-fg3">
        This runs on your device. Open your network inspector and watch — nothing is uploaded.
      </p>
    </div>
  );
}

function buildFileFromPastedBase64(input: string): File {
  const trimmed = input.trim();
  const match = /^data:([^;,]*)(;base64)?,([\s\S]*)$/.exec(trimmed);
  let mime = 'application/octet-stream';
  let bytes: Uint8Array;
  if (match) {
    mime = match[1] || mime;
    const payload = match[3] ?? '';
    bytes = match[2] ? base64ToBytes(payload) : new TextEncoder().encode(decodeURIComponent(payload));
  } else {
    bytes = base64ToBytes(trimmed.replace(/\s/g, ''));
  }
  return new File([bytes as BlobPart], 'pasted-image', { type: mime });
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/**
 * Maps a capability to the engine call. Mirrors pdf-runner.tsx's dispatch: no
 * default branch, so a capability added to the union without a case here is a
 * compile error rather than a silent runtime no-op.
 */
async function dispatch(
  engine: ImageEngine,
  binding: ImageToolBinding,
  img: DecodedImage,
  source: File,
  state: ImageControlState,
  onProgress: (pct: number, stage: string) => void,
  signal: AbortSignal,
) {
  switch (binding.capability) {
    case 'image.convert': {
      // Fixed-direction tools (bmp-to-jpg, …) pin `to`; the generic pickers
      // (convert-image, webp-converter) leave it undefined and the control
      // decides — encodeFor()'s "keep the source format" fallback is for the
      // OTHER tools (crop, rotate, …) where format was never the user's choice.
      const format = binding.to ?? state.format;
      return engine.convert(img, { format, quality: Number(state.quality) || 0.85, background: state.background }, onProgress, signal);
    }

    case 'image.crop': {
      const rect = {
        x: Math.round((pct(state.cropX) / 100) * img.width),
        y: Math.round((pct(state.cropY) / 100) * img.height),
        width: Math.round((pct(state.cropW) / 100) * img.width),
        height: Math.round((pct(state.cropH) / 100) * img.height),
      };
      return engine.crop(img, rect, encodeFor(img, state), onProgress, signal);
    }

    case 'image.flip':
      return engine.flip(img, state.flipAxis, encodeFor(img, state), onProgress, signal);

    case 'image.rotate':
      return engine.rotate(img, Number(state.rotateBy) as RotateDeg, encodeFor(img, state), onProgress, signal);

    case 'image.resize': {
      const mode = binding.control.kind === 'upscale' ? upscaleMode(state) : buildResizeMode(state);
      const upscale = binding.control.kind === 'upscale' ? true : state.upscale;
      return engine.resize(img, { mode, upscale, encode: encodeFor(img, state) }, onProgress, signal);
    }

    case 'image.compress': {
      const targetBytes = Math.max(1024, Math.round((Number(state.targetKB) || 500) * 1024));
      return engine.compress(img, { targetBytes }, onProgress, signal, source);
    }

    case 'image.adjust': {
      const opts = binding.preset ?? {
        brightness: Number(state.brightness),
        contrast: Number(state.contrast),
        saturation: Number(state.saturation),
        hueRotate: Number(state.hueRotate),
        grayscale: Number(state.grayscale),
        blur: binding.control.kind === 'blur' ? Number(state.blurRadius) : undefined,
      };
      return engine.adjust(img, opts, encodeFor(img, state), onProgress, signal);
    }

    case 'image.watermark':
      if (!state.text.trim()) throw new ImageError('invalid-options', 'Type the watermark text.');
      return engine.watermark(
        img,
        { text: state.text, anchor: state.anchor, opacity: Number(state.opacity), fontScale: Number(state.fontScale), color: state.color },
        encodeFor(img, state),
        onProgress,
        signal,
      );

    case 'image.pixelate':
      return engine.pixelate(img, { blockSize: Number(state.blockSize) || 12 }, encodeFor(img, state), onProgress, signal);

    case 'image.meme':
      if (!state.topText.trim() && !state.bottomText.trim()) {
        throw new ImageError('invalid-options', 'Type at least one caption.');
      }
      return engine.meme(img, { topText: state.topText, bottomText: state.bottomText }, encodeFor(img, state), onProgress, signal);

    case 'image.ico': {
      const sizes = state.icoSizes.length ? state.icoSizes : binding.options.sizes;
      return engine.ico(img, { sizes }, onProgress, signal);
    }

    case 'image.remove-background':
      return engine.removeBackground(img, {}, onProgress, signal);

    case 'image.to-base64':
      return engine.toBase64(img, source, onProgress, signal);

    case 'image.from-base64':
      return engine.fromBase64(img, source, onProgress, signal);

    // No default — see comment above.
  }
}

function pct(v: string): number {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 0;
}

/** crop/flip/rotate/adjust/watermark/pixelate/meme aren't about picking an output
 *  format — keep the source's own format so the tool does only what it promises. */
function encodeFor(img: DecodedImage, state: ImageControlState, forced?: ImageFormat): EncodeOptions {
  const format = forced ?? (isEncodable(img.sourceFormat) ? img.sourceFormat : 'png');
  return { format, quality: Number(state.quality) || 0.85, background: state.background };
}

function isEncodable(f: DecodedImage['sourceFormat']): f is ImageFormat {
  return f === 'jpeg' || f === 'png' || f === 'webp' || f === 'avif';
}

function buildResizeMode(state: ImageControlState): ResizeMode {
  switch (state.resizeMode) {
    case 'fit':
      return { kind: 'fit', width: Number(state.width) || 0, height: Number(state.height) || 0 };
    case 'fill':
      return { kind: 'fill', width: Number(state.width) || 0, height: Number(state.height) || 0 };
    case 'exact':
      return { kind: 'exact', width: Number(state.width) || 0, height: Number(state.height) || 0 };
    case 'long-edge':
      return { kind: 'long-edge', px: Number(state.longEdge) || 0 };
    case 'scale':
      return { kind: 'scale', factor: Number(state.scaleFactor) || 1 };
  }
}

function upscaleMode(state: ImageControlState): ResizeMode {
  return { kind: 'scale', factor: Math.min(4, Math.max(1, Number(state.scaleFactor) || 2)) };
}

function formatBytes(n: number): string {
  if (n >= 1_048_576) return `${(n / 1_048_576).toFixed(1)} MB`;
  if (n >= 1024) return `${Math.round(n / 1024)} KB`;
  return `${n} B`;
}
