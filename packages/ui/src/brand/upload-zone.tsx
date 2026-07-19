'use client';

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { cn } from '../lib/utils';
import { KbdHint } from './kbd-hint';
import { MonogramChip } from './monogram-chip';

interface UploadZoneProps {
  /** e.g. "application/pdf" or ".png,.jpg,.webp". Omit to accept anything. */
  accept?: string;
  /** Free plan default per registry limits. */
  maxFiles?: number;
  maxMb?: number;
  /** Files never leave the device — this hands them to the local engine layer. */
  onFiles: (files: File[]) => void;
  /** Center headline, e.g. "Drop PDFs here". */
  label?: string;
  /** Category monogram shown in the chip. */
  categoryCode?: string;
  categoryHue?: string;
  categoryHueOnLight?: string;
  className?: string;
}

/**
 * UploadZone — the tool-page dropzone (DS §12).
 * 2px dashed --border2, r-20, min-height 320px. Accepts drag & drop, paste
 * (⌘V), and click/Enter to browse. Dragover: border → --accent + accent wash.
 * The shell is static server-renderable HTML in production (LCP budget);
 * this island hydrates the interactions.
 */
export function UploadZone({
  accept,
  maxFiles = 10,
  maxMb = 200,
  onFiles,
  label = 'Drop files here',
  categoryCode = 'PD',
  categoryHue = '#FF6B6B',
  categoryHueOnLight,
  className,
}: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const admit = useCallback(
    (list: FileList | File[] | null) => {
      if (!list) return;
      const files = Array.from(list);
      if (files.length === 0) return;
      if (files.length > maxFiles) {
        setError(
          maxFiles === 1
            ? 'This tool takes one file at a time.'
            : `That's ${files.length} files — the free limit is ${maxFiles}. Pro raises it to 200.`,
        );
        return;
      }
      const tooBig = files.find((f) => f.size > maxMb * 1024 * 1024);
      if (tooBig) {
        setError(`${tooBig.name} is over ${maxMb} MB. Pro raises the limit to 2 GB.`);
        return;
      }
      setError(null);
      onFiles(files);
    },
    [maxFiles, maxMb, onFiles],
  );

  // ⌘V — paste a file from the clipboard (DS §12 shortcuts)
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const files = e.clipboardData?.files;
      if (files && files.length > 0) {
        e.preventDefault();
        admit(files);
      }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [admit]);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      inputRef.current?.click();
    }
  };

  return (
    <div className={className}>
      <div
        role="button"
        tabIndex={0}
        aria-label={`${label} — or press Enter to browse`}
        onClick={() => inputRef.current?.click()}
        onKeyDown={onKeyDown}
        onDragEnter={(e) => {
          e.preventDefault();
          dragDepth.current += 1;
          setDragging(true);
        }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={() => {
          dragDepth.current -= 1;
          if (dragDepth.current <= 0) {
            dragDepth.current = 0;
            setDragging(false);
          }
        }}
        onDrop={(e) => {
          e.preventDefault();
          dragDepth.current = 0;
          setDragging(false);
          admit(e.dataTransfer.files);
        }}
        className={cn(
          'flex min-h-[320px] cursor-pointer flex-col items-center justify-center gap-4 rounded-[20px] border-2 border-dashed p-8 text-center',
          'transition-colors duration-150',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
          dragging ? 'border-accent bg-accent-soft' : 'border-line2 bg-surface',
        )}
      >
        <MonogramChip
          code={categoryCode}
          hue={categoryHue}
          hueOnLight={categoryHueOnLight}
          size={40}
        />
        <div className="flex flex-col gap-1.5">
          <p className="font-grotesk text-[20px] font-semibold tracking-[-0.01em] text-fg">
            {dragging ? 'Let go — it stays on your device' : label}
          </p>
          <p className="text-[13px] text-fg3">
            or browse · paste ·{' '}
            {maxFiles === 1
              ? `up to ${maxMb >= 1024 ? `${maxMb / 1024} GB` : `${maxMb} MB`}`
              : `up to ${maxFiles} files (${maxMb >= 1024 ? `${maxMb / 1024} GB` : `${maxMb} MB`} each)`}
          </p>
        </div>
        <p className="flex items-center gap-2 text-[12.5px] text-fg3">
          <KbdHint keys="⌘V" /> paste a file from your clipboard
        </p>
      </div>

      {error && (
        <p role="alert" className="mt-3 animate-lt-fadeup text-[13px]" style={{ color: 'var(--error)' }}>
          {error}
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={accept}
        className="sr-only"
        aria-hidden="true"
        tabIndex={-1}
        onChange={(e) => {
          admit(e.target.files);
          e.target.value = ''; // allow re-selecting the same file
        }}
      />
    </div>
  );
}
