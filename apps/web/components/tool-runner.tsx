'use client';

import { useState } from 'react';
import type { Category, ToolDefinition } from '@lovelytools/registry';
import {
  bindingFor as conversionBinding,
  notImplementedReason as conversionNotImplemented,
} from '@lovelytools/engine-conversion';
import { getCalculator, notImplementedReason as calculatorNotImplemented } from '@lovelytools/engine-calculator';
import { getDevOp } from '@lovelytools/engine-devtools';
import { bindingFor as imageBinding, notImplementedReason as imageNotImplemented } from '@lovelytools/engine-image';
import { bindingFor as pdfBinding, notImplementedReason as pdfNotImplemented } from '@lovelytools/engine-pdf';
import { getTextOp } from '@lovelytools/engine-text';
import { Button, ProgressBar, UploadZone } from '@lovelytools/ui';
import { CalculatorRunner } from '@/components/calculator-runner';
import { SocialRunner } from '@/components/social-runner';
import { ConversionRunner } from '@/components/conversion-runner';
import { DevToolsRunner } from '@/components/devtools-runner';
import { ImageRunner } from '@/components/image-runner';
import { PdfRunner } from '@/components/pdf-runner';
import { TextRunner } from '@/components/text-runner';
import { useMediaTool } from '@/lib/use-media-tool';

/**
 * ToolRunner — the island (RFC-001 §9).
 * Owns the whole interactive lifecycle: dropzone → queue → progress → done.
 * Everything around it on the page is static server-rendered HTML.
 *
 * The engine module is imported dynamically inside the hook, so the WASM core is
 * fetched only once the user commits to a job — never on page load.
 */
export function ToolRunner({ tool, category }: { tool: ToolDefinition; category: Category }) {
  const [file, setFile] = useState<File | null>(null);
  const media = useMediaTool(tool);

  // The social-media tools share one acquisition step (paste a direct media
  // link, or drop a file) before splitting across the audio and speech engines —
  // a different lifecycle from the plain dropzone islands, so they get their own.
  if (tool.category === 'social-media-tools') {
    return <SocialRunner tool={tool} category={category} />;
  }

  // PDF has its own island: its ops take options (page ranges, watermark text) that
  // the media tools don't, and some produce many files rather than one.
  if (tool.engine === 'pdf') {
    const reason = pdfNotImplemented(tool.slug);
    if (reason) {
      return (
        <NotBuiltYet
          engineName="PDF"
          reason={reason}
          tryHrefs={[
            ['/merge-pdf', 'merge PDF'],
            ['/split-pdf', 'split PDF'],
            ['/compress-pdf', 'compress PDF'],
          ]}
        />
      );
    }
    if (pdfBinding(tool.slug)) return <PdfRunner tool={tool} category={category} />;
  }

  // The document conversion tools (word-to-pdf, pdf-to-word, …) are each a single
  // fixed direction with no options to configure — auto-runs on drop rather than
  // needing a page-range or watermark-text step first, so they get the simpler
  // batch-job island instead of PdfRunner's per-op control system.
  if (tool.engine === 'conversion') {
    const reason = conversionNotImplemented(tool.slug);
    if (reason) {
      return (
        <NotBuiltYet
          engineName="conversion"
          reason={reason}
          tryHrefs={[
            ['/word-to-pdf', 'Word to PDF'],
            ['/pdf-to-word', 'PDF to Word'],
            ['/excel-to-pdf', 'Excel to PDF'],
          ]}
        />
      );
    }
    if (conversionBinding(tool.slug)) return <ConversionRunner tool={tool} category={category} />;
  }

  // Image tools take options per op (crop rect, resize dims, watermark text, …)
  // the same way PDF does, so they get their own island rather than the generic
  // batch-job one below.
  if (tool.engine === 'image') {
    const reason = imageNotImplemented(tool.slug);
    if (reason) {
      return (
        <NotBuiltYet
          engineName="image"
          reason={reason}
          tryHrefs={[
            ['/resize-image', 'resize an image'],
            ['/convert-image', 'convert an image'],
            ['/image-compressor', 'compress an image'],
          ]}
        />
      );
    }
    if (imageBinding(tool.slug)) return <ImageRunner tool={tool} category={category} />;
  }

  // Calculators are forms, not dropzones — structured numeric inputs computed
  // live on the device. Covers both the calculators and unit-converters
  // categories; currency-converter is honestly declared unbuildable offline.
  if (tool.engine === 'calculator') {
    const reason = calculatorNotImplemented(tool.slug);
    if (reason) {
      return (
        <NotBuiltYet
          engineName="calculator"
          reason={reason}
          tryHrefs={[
            ['/length-converter', 'convert lengths'],
            ['/temperature-converter', 'convert temperatures'],
            ['/loan-calculator', 'work out a loan'],
          ]}
        />
      );
    }
    if (getCalculator(tool.slug)) return <CalculatorRunner tool={tool} />;
  }

  // Text tools are live-on-keystroke transforms, not file jobs — same
  // "definition + generic form" shape as calculators, but text in and out.
  if (tool.engine === 'text') {
    if (getTextOp(tool.slug)) return <TextRunner tool={tool} />;
  }

  // Developer tools: the same live-on-keystroke shape as text tools, plus
  // labeled fields (JWT claims, color spaces), a two-pane diff, and an image
  // preview (QR code) that the generic text form doesn't need.
  if (tool.engine === 'developer') {
    if (getDevOp(tool.slug)) return <DevToolsRunner tool={tool} />;
  }

  // Engines the browser runs but this pass hasn't wired a UI for yet. Saying so is
  // better than rendering a dropzone that silently does nothing.
  if (!media.supported) {
    return (
      <NotWiredUp
        engineName={tool.engine}
        tryHrefs={[
          ['/merge-pdf', 'merge PDF'],
          ['/word-to-pdf', 'Word to PDF'],
          ['/compress-video', 'compress video'],
          ['/trim-audio', 'trim audio'],
        ]}
      />
    );
  }

  const busy = media.state === 'running' || media.state === 'loading-engine';

  return (
    <div className="flex flex-col gap-5 rounded-2xl border border-line bg-surface p-5 sm:p-8">
      {!file && (
        <UploadZone
          accept={media.accept}
          maxFiles={1}
          label={`Drop a ${category.id === 'video-tools' ? 'video' : 'file'} here`}
          onFiles={(files) => {
            const next = files[0];
            if (next) setFile(next);
          }}
          categoryCode={category.code}
          categoryHue={category.hue}
          categoryHueOnLight={category.hueOnLight}
        />
      )}

      {file && (
        <div className="flex flex-col gap-5">
          <div className="flex items-center justify-between gap-4 rounded-lg border border-line bg-bg2 px-4 py-3">
            <span className="truncate text-sm text-fg2">{file.name}</span>
            <span className="shrink-0 text-[12.5px] text-fg3">{formatBytes(file.size)}</span>
          </div>

          {busy && media.progress && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-[12.5px] text-fg2">
                <span>{media.progress.stage}</span>
                <span className="font-grotesk">{media.progress.pct}%</span>
              </div>
              <ProgressBar value={media.progress.pct} />
              {media.state === 'loading-engine' && (
                <p className="text-[12.5px] text-fg3">
                  Loading the engine — this happens once, then it&rsquo;s cached.
                </p>
              )}
            </div>
          )}

          {media.error && (
            <p className="text-[13.5px]" style={{ color: 'var(--error)' }}>
              {media.error}
            </p>
          )}

          {media.result && (
            <div className="flex flex-col gap-3 rounded-lg border border-line bg-bg2 p-4">
              <p className="flex items-center gap-2 text-sm text-fg">
                <span aria-hidden="true" className="text-success">
                  ✓
                </span>
                Done in {(media.result.elapsedMs / 1000).toFixed(1)}s ·{' '}
                {formatBytes(media.result.inputBytes)} → {formatBytes(media.result.outputBytes)}
                {media.result.outputBytes < media.result.inputBytes && (
                  <span className="text-success">
                    ({Math.round((1 - media.result.outputBytes / media.result.inputBytes) * 100)}%
                    smaller)
                  </span>
                )}
              </p>
              {media.result.warnings.map((warning) => (
                <p key={warning} className="text-[12.5px] text-fg3">
                  {warning}
                </p>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            {media.state === 'done' && media.result ? (
              <>
                <Button asChild>
                  <a href={URL.createObjectURL(media.result.blob)} download={media.result.filename}>
                    Download {media.result.filename}
                  </a>
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    media.reset();
                    setFile(null);
                  }}
                >
                  Do another
                </Button>
              </>
            ) : busy ? (
              <Button variant="secondary" onClick={media.cancel}>
                Cancel
              </Button>
            ) : (
              <>
                <Button onClick={() => media.run(file)}>{tool.name}</Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    media.reset();
                    setFile(null);
                  }}
                >
                  Choose another file
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

function formatBytes(n: number): string {
  if (n >= 1_073_741_824) return `${(n / 1_073_741_824).toFixed(1)} GB`;
  if (n >= 1_048_576) return `${(n / 1_048_576).toFixed(1)} MB`;
  if (n >= 1024) return `${Math.round(n / 1024)} KB`;
  return `${n} B`;
}

type TryLink = [href: string, label: string];

function TryLinks({ links }: { links: TryLink[] }) {
  return (
    <>
      {links.map(([href, label], i) => (
        <span key={href}>
          <a href={href} className="text-accent hover:text-fg">
            {label}
          </a>
          {i < links.length - 2 ? ', ' : i === links.length - 2 ? ' or ' : ''}
        </span>
      ))}
    </>
  );
}

/** A capability the engine genuinely doesn't have yet — see each engine's registry.ts. */
function NotBuiltYet({
  engineName,
  reason,
  tryHrefs,
}: {
  engineName: string;
  reason: string;
  tryHrefs: TryLink[];
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-5 sm:p-8">
      <h2 className="font-grotesk text-lg font-bold text-fg">Not built yet</h2>
      <p className="max-w-[560px] text-sm leading-[1.6] text-fg2">
        This one isn&rsquo;t a wiring job — the {engineName} engine {reason}. Saying so beats a
        dropzone that quietly does nothing.
      </p>
      <p className="max-w-[560px] text-sm leading-[1.6] text-fg2">
        The rest are live — try <TryLinks links={tryHrefs} />.
      </p>
    </div>
  );
}

/** An engine that runs but has no page UI wired up in this pass — a wiring gap, not a capability gap. */
function NotWiredUp({ engineName, tryHrefs }: { engineName: string; tryHrefs: TryLink[] }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-5 sm:p-8">
      <h2 className="font-grotesk text-lg font-bold text-fg">Not wired up yet</h2>
      <p className="max-w-[560px] text-sm leading-[1.6] text-fg2">
        The <strong className="text-fg">{engineName}</strong> engine runs in your browser and this
        tool is defined against it, but its interface hasn&rsquo;t been built in this pass. Try{' '}
        <TryLinks links={tryHrefs} />.
      </p>
    </div>
  );
}
