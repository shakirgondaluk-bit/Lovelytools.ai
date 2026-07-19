'use client';

import { useState } from 'react';
import type { Category, ToolDefinition } from '@lovelytools/registry';
import {
  bindingFor,
  readMetadata,
  usePdfTool,
  type PdfInput,
  type PdfToolBinding,
} from '@lovelytools/engine-pdf';
import { Button, ProgressBar, UploadZone } from '@lovelytools/ui';
import { emptyControlState, PdfControls, type ControlState } from '@/components/pdf-controls';

/**
 * PdfRunner — the client island for every PDF tool (RFC-001 §9).
 *
 * One component covers 18 tools because the engine ops share a result shape and the
 * binding declares what each needs collected first. Everything around it on the page
 * is static server-rendered HTML; pdf-lib and pdfjs load only when a job starts.
 */
export function PdfRunner({ tool, category }: { tool: ToolDefinition; category: Category }) {
  const binding = bindingFor(tool.slug)!;
  const [files, setFiles] = useState<File[]>([]);
  const [control, setControl] = useState<ControlState>(emptyControlState);
  const pdf = usePdfTool();

  const busy = pdf.status === 'working';
  const needsControl = binding.control.kind !== 'none';
  const multi = binding.arity === 'multi';
  const showsSavings = binding.capability === 'pdf.compress';

  const reset = () => {
    pdf.reset();
    setFiles([]);
    setControl(emptyControlState());
  };

  const run = async () => {
    const inputs = await pdf.toInputs(files);
    // The second file is a separate input, not part of the queue — it's the
    // signature image or the comparison target, never another document to process.
    const second = control.secondFile
      ? { buf: await control.secondFile.arrayBuffer(), name: control.secondFile.name }
      : null;
    await pdf.run((engine, onProgress, signal) =>
      dispatch(engine, binding, inputs, control, second, onProgress, signal),
    );
  };

  return (
    <div className="flex flex-col gap-5 rounded-2xl border border-line bg-surface p-8">
      {files.length === 0 && (
        <UploadZone
          accept={binding.accept}
          maxFiles={multi ? 10 : 1}
          label={multi ? 'Drop your files here' : 'Drop your file here'}
          onFiles={setFiles}
          categoryCode={category.code}
          categoryHue={category.hue}
          categoryHueOnLight={category.hueOnLight}
        />
      )}

      {files.length > 0 && (
        <div className="flex flex-col gap-5">
          {/* Queue */}
          <ul className="flex flex-col gap-2">
            {files.map((file, i) => (
              <li
                key={`${file.name}-${i}`}
                className="flex items-center justify-between gap-4 rounded-lg border border-line bg-bg2 px-4 py-3"
              >
                <span className="flex min-w-0 items-center gap-3">
                  {multi && (
                    <span className="shrink-0 font-grotesk text-[12px] text-fg3">{i + 1}</span>
                  )}
                  <span className="truncate text-sm text-fg2">{file.name}</span>
                </span>
                <span className="shrink-0 text-[12.5px] text-fg3">{formatBytes(file.size)}</span>
              </li>
            ))}
          </ul>
          {multi && files.length > 1 && (
            <p className="-mt-2 text-[12.5px] text-fg3">
              Processed in the order shown, which is the order you picked them.
            </p>
          )}

          {/* Whatever this op needs before it can run */}
          {needsControl && pdf.status !== 'done' && (
            <PdfControls
              control={binding.control}
              state={control}
              onChange={setControl}
              file={files[0] ?? null}
              disabled={busy}
            />
          )}

          {busy && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-[12.5px] text-fg2">
                <span>{pdf.stage || 'Working'}</span>
                <span className="font-grotesk">{pdf.progress}%</span>
              </div>
              <ProgressBar value={pdf.progress} />
            </div>
          )}

          {pdf.error && (
            <p className="text-[13.5px]" style={{ color: 'var(--error)' }}>
              {pdf.error}
            </p>
          )}

          {pdf.result && (
            <div className="flex flex-col gap-3 rounded-lg border border-line bg-bg2 p-4">
              <p className="flex flex-wrap items-center gap-2 text-sm text-fg">
                <span aria-hidden="true" className="text-success">
                  ✓
                </span>
                {pdf.result.files.length === 1
                  ? `1 file · ${formatBytes(pdf.result.stats.bytesOut)}`
                  : `${pdf.result.files.length} files · ${formatBytes(pdf.result.stats.bytesOut)} total`}
                {pdf.result.stats.pagesOut > 0 && (
                  <span className="text-fg3">
                    · {pdf.result.stats.pagesOut} page{pdf.result.stats.pagesOut === 1 ? '' : 's'}
                  </span>
                )}
                {/*
                  "N% smaller" only means something when the output is the same kind
                  of thing as the input. A PDF→TXT extraction is 95% smaller in bytes
                  and that number tells the reader nothing — it isn't a compression
                  result, it's a different file. Only the compress ops claim it.
                */}
                {showsSavings && pdf.savedPct > 0 && (
                  <span className="text-success">· {pdf.savedPct}% smaller</span>
                )}
              </p>
              {pdf.result.warnings.map((w) => (
                <p key={w} className="text-[12.5px] text-fg3">
                  {w}
                </p>
              ))}
              {pdf.result.files.length > 1 && (
                <ul className="flex flex-col gap-1 border-t border-line pt-3">
                  {pdf.result.files.slice(0, 8).map((f) => (
                    <li key={f.name} className="flex items-center justify-between gap-3">
                      <span className="truncate text-[12.5px] text-fg2">{f.name}</span>
                      <button
                        type="button"
                        onClick={() => pdf.download(f)}
                        className="shrink-0 text-[12.5px] text-accent transition-colors hover:text-fg"
                      >
                        Download
                      </button>
                    </li>
                  ))}
                  {pdf.result.files.length > 8 && (
                    <li className="text-[12.5px] text-fg3">
                      and {pdf.result.files.length - 8} more…
                    </li>
                  )}
                </ul>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            {pdf.status === 'done' ? (
              <>
                <Button onClick={() => void pdf.downloadAll()}>
                  {pdf.result && pdf.result.files.length > 1 ? 'Download all (.zip)' : 'Download'}
                </Button>
                <Button variant="ghost" onClick={reset}>
                  Do another
                </Button>
              </>
            ) : busy ? (
              <Button variant="secondary" onClick={pdf.cancel}>
                Cancel
              </Button>
            ) : (
              <>
                <Button onClick={() => void run()}>{binding.action}</Button>
                <Button variant="ghost" onClick={reset}>
                  Choose other files
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

/**
 * Maps a capability to the engine call.
 *
 * The engine's ops each take their own options, so this is where a binding's
 * declared control text becomes a typed argument.
 */
async function dispatch(
  engine: Parameters<Parameters<ReturnType<typeof usePdfTool>['run']>[0]>[0],
  binding: PdfToolBinding,
  inputs: PdfInput[],
  control: ControlState,
  second: PdfInput | null,
  onProgress: (pct: number, stage: string) => void,
  signal: AbortSignal,
) {
  const first = inputs[0];
  if (!first) throw new Error('No file was given.');
  const value = control.value;

  // Narrowing on `binding.capability` gives each branch its op's real option type —
  // no casts, and a wrong option is a compile error rather than a silently wrong PDF.
  switch (binding.capability) {
    case 'pdf.merge':
      return engine.merge(
        inputs.map((input) => ({ input })),
        onProgress,
        signal,
      );

    case 'pdf.split': {
      // An empty range means "every page separately" — the friendliest default for a
      // control the user can legitimately leave blank.
      const specs = splitList(value);
      return engine.split(
        first,
        specs.length ? { kind: 'ranges', specs } : { kind: 'single' },
        onProgress,
        signal,
      );
    }

    case 'pdf.extract-pages':
      return engine.extractPages(first, value, onProgress, signal);

    case 'pdf.delete-pages': {
      // The engine has no "delete" op — organize() takes the pages to KEEP. So read
      // the page count, expand the user's range, and keep the complement.
      const { pageCount } = await readMetadata(first);
      const remove = new Set(parseOneBased(value, pageCount));
      const order = Array.from({ length: pageCount }, (_, i) => i).filter((i) => !remove.has(i));
      if (order.length === 0) throw new Error('That would delete every page.');
      return engine.organize(first, { order }, onProgress, signal);
    }

    case 'pdf.organize': {
      const { pageCount } = await readMetadata(first);
      const order = parseOneBased(value, pageCount);
      if (order.length === 0) throw new Error('Give the page order, e.g. "3, 1, 2".');
      return engine.organize(first, { order }, onProgress, signal);
    }

    case 'pdf.rotate':
      return engine.rotate(first, binding.options.by, onProgress, undefined, signal);

    case 'pdf.compress':
      return engine.compress(first, binding.options, onProgress, signal);

    case 'pdf.watermark':
      return engine.watermark(
        first,
        { ...binding.options, text: value || 'CONFIDENTIAL' },
        onProgress,
        signal,
      );

    case 'pdf.page-numbers':
      return engine.pageNumbers(
        first,
        { ...binding.options, template: value || 'Page {n} of {total}' },
        onProgress,
        signal,
      );

    case 'pdf.metadata':
      return engine.writeMetadata(first, { title: value }, onProgress, signal);

    case 'pdf.extract-text':
      return engine.extractText(first, onProgress, signal);

    case 'pdf.rasterize':
      return engine.rasterize(first, binding.options, onProgress, signal);

    case 'pdf.images-to-pdf':
      return engine.imagesToPdf(inputs, binding.options, onProgress, signal);

    case 'pdf.crop': {
      const marginPt = Number(value);
      if (!Number.isFinite(marginPt) || marginPt <= 0) {
        throw new Error('Enter how many points to trim from each edge.');
      }
      return engine.crop(first, { ...binding.options, marginPt }, onProgress, signal);
    }

    case 'pdf.flatten':
      return engine.flatten(first, onProgress, signal);

    case 'pdf.fill-form':
      return engine.fillForm(first, { values: control.fields }, onProgress, signal);

    case 'pdf.protect':
      return engine.protect(first, { userPassword: value }, onProgress, signal);

    case 'pdf.unlock':
      // Deliberately allowed to be empty: some PDFs carry no open password, only a
      // permissions lock, and those unlock without one.
      return engine.unlock(first, { password: value }, onProgress, signal);

    case 'pdf.sign': {
      if (!second) throw new Error('Choose a signature image to place on the document.');
      return engine.sign(
        first,
        { ...binding.options, image: second.buf, imageName: second.name },
        onProgress,
        signal,
      );
    }

    case 'pdf.redact':
      if (!value.trim()) throw new Error('Type the text you want removed.');
      return engine.redact(first, { ...binding.options, find: value }, onProgress, signal);

    case 'pdf.compare':
      if (!second) throw new Error('Choose a second PDF to compare against.');
      return engine.compare(first, { other: second }, onProgress, signal);

    case 'pdf.ocr':
      return engine.ocr(first, binding.options, onProgress, signal);

    // No default. The switch covers every member of the PdfToolBinding union, so
    // adding a capability without handling it here is a compile error — which is the
    // point. A default branch would turn that into a runtime throw nobody sees until
    // a user hits it.
  }
}

/** "1-3, 4-6" → ["1-3", "4-6"] */
const splitList = (spec: string): string[] =>
  spec
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

/** "3, 1, 2" or "1-3, 7" → zero-based indices, bounds-checked. */
function parseOneBased(spec: string, pageCount: number): number[] {
  const out: number[] = [];
  for (const part of splitList(spec)) {
    const range = /^(\d+)\s*-\s*(\d+)$/.exec(part);
    if (range) {
      const start = Number(range[1]);
      const end = Number(range[2]);
      if (start < 1 || end > pageCount || start > end) {
        throw new Error(`"${part}" isn't a page range in a ${pageCount}-page document.`);
      }
      for (let p = start; p <= end; p++) out.push(p - 1);
      continue;
    }
    const single = /^\d+$/.exec(part);
    if (!single) throw new Error(`"${part}" isn't a page number.`);
    const p = Number(part);
    if (p < 1 || p > pageCount) {
      throw new Error(`Page ${p} doesn't exist — the document has ${pageCount}.`);
    }
    out.push(p - 1);
  }
  return out;
}

function formatBytes(n: number): string {
  if (n >= 1_048_576) return `${(n / 1_048_576).toFixed(1)} MB`;
  if (n >= 1024) return `${Math.round(n / 1024)} KB`;
  return `${n} B`;
}
