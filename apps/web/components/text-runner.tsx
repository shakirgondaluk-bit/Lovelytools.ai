'use client';

import { useEffect, useRef, useState } from 'react';
import type { ToolDefinition } from '@lovelytools/registry';
import { getTextOp, useTextTool, type DiffOp, type OptionSpec, type TextOpDef } from '@lovelytools/engine-text';
import { Button } from '@lovelytools/ui';

/**
 * TextRunner — the client island for every text tool (RFC-001 §9).
 * One component covers 26 tools: the definition declares its options (and
 * whether it's a generator, a two-pane diff, or a canvas preview), the hook
 * computes live on every keystroke, and this renders all three shapes.
 */
export function TextRunner({ tool }: { tool: ToolDefinition }) {
  const def = getTextOp(tool.slug)!;
  return <TextForm def={def} />;
}

function TextForm({ def }: { def: TextOpDef }) {
  const t = useTextTool(def);
  const isDiff = def.inputs === 2;

  return (
    <div className="flex flex-col gap-6 rounded-2xl border border-line bg-surface p-8">
      {def.options.length > 0 && (
        <div className="flex flex-wrap items-end gap-4">
          {def.options.map((spec) => (
            <OptionField key={spec.id} spec={spec} value={t.options[spec.id] ?? spec.default} onChange={(v) => t.setOption(spec.id, v)} />
          ))}
          {def.generator && 'seed' in t.options && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => t.setOption('seed', Math.floor(Math.random() * 999999))}
            >
              Generate again
            </Button>
          )}
        </div>
      )}

      {!def.generator && (
        <div className={isDiff ? 'grid grid-cols-1 gap-4 md:grid-cols-2' : ''}>
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium text-fg">{isDiff ? 'Original' : 'Your text'}</span>
            <textarea
              value={t.input}
              onChange={(e) => t.setInput(e.target.value)}
              rows={8}
              placeholder="Paste or type here…"
              className={textareaClass}
            />
          </label>
          {isDiff && (
            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] font-medium text-fg">Changed</span>
              <textarea
                value={t.secondary}
                onChange={(e) => t.setSecondary(e.target.value)}
                rows={8}
                placeholder="Paste or type here…"
                className={textareaClass}
              />
            </label>
          )}
        </div>
      )}

      {t.computing && <p className="text-[12.5px] text-fg3">Computing…</p>}

      {t.error && (
        <p className="text-[13.5px]" style={{ color: 'var(--error)' }}>
          {t.error}
        </p>
      )}

      {t.result?.stats && <StatsRow stats={t.result.stats} />}

      {t.result?.diff ? (
        <DiffView ops={t.result.diff} />
      ) : def.preview === 'handwriting' ? (
        <HandwritingPreview text={t.result?.output ?? ''} options={t.options} />
      ) : (
        t.result && (
          <div className="flex flex-col gap-2">
            <span className="text-[13px] font-medium text-fg">Result</span>
            <textarea readOnly value={t.result.output} rows={8} className={`${textareaClass} bg-bg2`} />
          </div>
        )
      )}

      {t.result?.notes && t.result.notes.length > 0 && (
        <div className="flex flex-col gap-1">
          {t.result.notes.map((n) => (
            <p key={n} className="text-[12.5px] text-fg3">{n}</p>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-3">
          <Button variant="secondary" size="sm" onClick={t.copy} disabled={!t.result?.output}>
            Copy
          </Button>
          <Button variant="ghost" size="sm" onClick={t.download} disabled={!t.result?.output}>
            Download .txt
          </Button>
        </div>
        <p className="text-[12.5px] text-fg3">Computed on your device — nothing is sent anywhere.</p>
      </div>
    </div>
  );
}

/* ---------------- options ---------------- */

const textareaClass =
  'rounded-lg border border-line bg-bg2 px-3.5 py-2.5 font-mono text-[13.5px] leading-[1.6] text-fg placeholder:text-fg3 focus:border-accent focus:outline-none';
const inputClass =
  'rounded-lg border border-line bg-bg2 px-3.5 py-2.5 font-sans text-[14px] text-fg placeholder:text-fg3 focus:border-accent focus:outline-none';

function OptionField({
  spec,
  value,
  onChange,
}: {
  spec: OptionSpec;
  value: string | boolean | number;
  onChange: (v: string | boolean | number) => void;
}) {
  const id = `text-opt-${spec.id}`;

  if (spec.kind === 'toggle') {
    return (
      <label htmlFor={id} className="flex items-center gap-2 pb-2.5">
        <input
          id={id}
          type="checkbox"
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked)}
          className="h-4 w-4 accent-[var(--accent)]"
        />
        <span className="text-[13px] font-medium text-fg">{spec.label}</span>
      </label>
    );
  }

  return (
    <label htmlFor={id} className="flex flex-col gap-1.5">
      <span className="text-[13px] font-medium text-fg">{spec.label}</span>
      {spec.kind === 'select' ? (
        <select id={id} value={String(value)} onChange={(e) => onChange(e.target.value)} className={inputClass}>
          {spec.options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      ) : spec.kind === 'number' ? (
        <input
          id={id}
          type="number"
          value={String(value)}
          min={spec.min}
          max={spec.max}
          onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
          className={`${inputClass} w-24`}
        />
      ) : (
        <input
          id={id}
          type="text"
          value={String(value)}
          placeholder={spec.placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
        />
      )}
    </label>
  );
}

/* ---------------- stats ---------------- */

function StatsRow({ stats }: { stats: NonNullable<ReturnType<typeof useTextTool>['result']>['stats'] }) {
  if (!stats) return null;
  const items: Array<[string, number | string]> = [
    ['Characters', stats.characters],
    ['No spaces', stats.charactersNoSpaces],
    ['Words', stats.words],
    ['Sentences', stats.sentences],
    ['Paragraphs', stats.paragraphs],
    ['Lines', stats.lines],
    ['Reading time', `${stats.readingTimeMin} min`],
  ];
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-2 border-t border-line pt-4 sm:grid-cols-4">
      {items.map(([label, value]) => (
        <div key={label}>
          <dt className="text-[12px] text-fg3">{label}</dt>
          <dd className="font-grotesk text-[18px] font-bold text-fg">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

/* ---------------- diff ---------------- */

function DiffView({ ops }: { ops: DiffOp[] }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[13px] font-medium text-fg">Diff</span>
      <pre className="whitespace-pre-wrap break-words rounded-lg border border-line bg-bg2 p-4 font-mono text-[13px] leading-[1.7]">
        {ops.map((op, i) => (
          <span
            key={i}
            style={
              op.type === 'insert'
                ? { background: 'color-mix(in srgb, var(--green) 22%, transparent)', color: 'var(--green)' }
                : op.type === 'delete'
                  ? { background: 'color-mix(in srgb, var(--error) 22%, transparent)', color: 'var(--error)', textDecoration: 'line-through' }
                  : undefined
            }
          >
            {op.value}
          </span>
        ))}
      </pre>
    </div>
  );
}

/* ---------------- handwriting preview ---------------- */

const INK: Record<string, string> = { blue: '#2c4a9e', black: '#1a1a1a', red: '#9e2c2c' };
const FONT_STACK: Record<string, string> = {
  casual: '"Segoe Print", "Bradley Hand", "Comic Sans MS", cursive',
  neat: '"Segoe Script", "Lucida Handwriting", cursive',
  marker: '"Marker Felt", "Segoe Print", cursive',
};

function HandwritingPreview({ text, options }: { text: string; options: Record<string, string | boolean | number> }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = 800;
    const fontSize = Number(options.fontSize) || 28;
    const lineHeight = fontSize * 1.6;
    const paper = String(options.paper || 'lined');
    const style = String(options.style || 'casual');
    const ink = INK[String(options.ink)] ?? INK.blue!;

    ctx.font = `${fontSize}px ${FONT_STACK[style] ?? FONT_STACK.casual}`;
    const words = text.split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let current = '';
    for (const word of words) {
      const trial = current ? `${current} ${word}` : word;
      if (ctx.measureText(trial).width > width - 80) {
        if (current) lines.push(current);
        current = word;
      } else {
        current = trial;
      }
    }
    if (current) lines.push(current);
    if (lines.length === 0) lines.push('');

    const height = Math.max(240, lines.length * lineHeight + 80);
    canvas.width = width;
    canvas.height = height;

    ctx.fillStyle = '#fffdf7';
    ctx.fillRect(0, 0, width, height);

    if (paper === 'lined') {
      ctx.strokeStyle = '#cfd8e8';
      ctx.lineWidth = 1;
      for (let y = lineHeight + 20; y < height; y += lineHeight) {
        ctx.beginPath();
        ctx.moveTo(40, y);
        ctx.lineTo(width - 40, y);
        ctx.stroke();
      }
    } else if (paper === 'grid') {
      ctx.strokeStyle = '#dde3ee';
      ctx.lineWidth = 1;
      for (let y = 20; y < height; y += 28) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      for (let x = 20; x < width; x += 28) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
    }

    ctx.font = `${fontSize}px ${FONT_STACK[style] ?? FONT_STACK.casual}`;
    ctx.fillStyle = ink;
    ctx.textBaseline = 'alphabetic';
    lines.forEach((line, i) => {
      ctx.fillText(line, 40, lineHeight + 20 + i * lineHeight - 8);
    });
  }, [text, options]);

  const download = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'handwriting.png';
      a.click();
      URL.revokeObjectURL(url);
    }, 'image/png');
  };

  return (
    <div className="flex flex-col gap-2">
      <span className="text-[13px] font-medium text-fg">Preview</span>
      <div className="overflow-x-auto rounded-lg border border-line">
        <canvas ref={canvasRef} className="block max-w-full" />
      </div>
      <div>
        <Button variant="secondary" size="sm" onClick={download}>
          Download PNG
        </Button>
      </div>
    </div>
  );
}
