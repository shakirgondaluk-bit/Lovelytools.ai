'use client';

import type { ToolDefinition } from '@lovelytools/registry';
import { getDevOp, useDevTool, type DevDiffOp, type DevField, type DevOpDef, type OptionSpec } from '@lovelytools/engine-devtools';
import { Button } from '@lovelytools/ui';

/**
 * DevToolsRunner — the client island for every developer tool (RFC-001 §9).
 * Same shape as TextRunner: the definition declares its options (and whether
 * it's a generator, a two-pane diff, or an image preview), the hook computes
 * live on every keystroke (debounced for async ops), and this renders all of it.
 */
export function DevToolsRunner({ tool }: { tool: ToolDefinition }) {
  const def = getDevOp(tool.slug)!;
  return <DevToolsForm def={def} />;
}

function DevToolsForm({ def }: { def: DevOpDef }) {
  const t = useDevTool(def);
  const isDiff = def.inputs === 2;

  return (
    <div className="flex flex-col gap-6 rounded-2xl border border-line bg-surface p-8">
      {def.options.length > 0 && (
        <div className="flex flex-wrap items-end gap-4">
          {def.options
            .filter((spec) => !(def.generator && spec.id === 'seed'))
            .map((spec) => (
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
            <span className="text-[13px] font-medium text-fg">{isDiff ? 'Original' : 'Input'}</span>
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
          {t.error.message}
          {t.error.position && ` (line ${t.error.position.line}, column ${t.error.position.column})`}
        </p>
      )}

      {t.result?.fields && t.result.fields.length > 0 && <FieldsView fields={t.result.fields} />}

      {t.result?.diff ? (
        <DiffView ops={t.result.diff} />
      ) : def.preview === 'qrcode' ? (
        <QrPreview dataUri={t.result?.output ?? ''} />
      ) : (
        t.result &&
        t.result.output !== '' && (
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
  const id = `dev-opt-${spec.id}`;

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
          className={`${inputClass} font-mono`}
        />
      )}
    </label>
  );
}

/* ---------------- fields ---------------- */

function FieldsView({ fields }: { fields: DevField[] }) {
  return (
    <dl className="flex flex-col gap-2 border-t border-line pt-4">
      {fields.map((f, i) => (
        <div key={`${f.label}-${i}`} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <dt className="text-[12.5px] text-fg3">{f.label}</dt>
          <dd
            className={`${f.mono === false ? 'font-sans' : 'font-mono'} break-all text-[13.5px] text-right`}
            style={
              f.tone === 'positive'
                ? { color: 'var(--green)' }
                : f.tone === 'negative'
                  ? { color: 'var(--error)' }
                  : f.tone === 'muted'
                    ? { color: 'var(--fg3)' }
                    : undefined
            }
          >
            {f.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/* ---------------- diff ---------------- */

function DiffView({ ops }: { ops: DevDiffOp[] }) {
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

/* ---------------- QR preview ---------------- */

function QrPreview({ dataUri }: { dataUri: string }) {
  if (!dataUri) return null;
  const download = () => {
    const a = document.createElement('a');
    a.href = dataUri;
    a.download = 'qr-code.svg';
    a.click();
  };
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[13px] font-medium text-fg">QR code</span>
      <div className="flex w-fit items-center justify-center rounded-lg border border-line bg-white p-4">
        {/* eslint-disable-next-line @next/next/no-img-element -- data URI, no optimization to gain */}
        <img src={dataUri} alt="Generated QR code" width={200} height={200} />
      </div>
      <div>
        <Button variant="secondary" size="sm" onClick={download}>
          Download SVG
        </Button>
      </div>
    </div>
  );
}
