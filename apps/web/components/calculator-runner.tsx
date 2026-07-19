'use client';

import type { ToolDefinition } from '@lovelytools/registry';
import {
  getCalculator,
  useCalculator,
  type CalculatorDef,
  type FieldSpec,
  type ResultValue,
  type ValueFormat,
} from '@lovelytools/engine-calculator';

/**
 * CalculatorRunner — the client island for every calculator (RFC-001 §9).
 *
 * One component covers 31 tools because a calculator is data + a pure function:
 * the definition declares its fields, the hook validates and computes on every
 * keystroke, and this renders both generically. No per-calculator UI exists —
 * adding a calculator is one engine file, zero components.
 */
export function CalculatorRunner({ tool }: { tool: ToolDefinition }) {
  const def = getCalculator(tool.slug)!;
  return <CalculatorForm def={def} />;
}

function CalculatorForm({ def }: { def: CalculatorDef }) {
  const calc = useCalculator(def);
  const bannerError = calc.errors.find((e) => !def.fields.some((f) => f.id === e.fieldId));

  return (
    <div className="flex flex-col gap-6 rounded-2xl border border-line bg-surface p-8">
      {/* Inputs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {def.fields.map((f) => (
          <Field
            key={f.id}
            spec={f}
            value={calc.raw[f.id] ?? String(f.default)}
            error={calc.errors.find((e) => e.fieldId === f.id)?.message}
            onChange={(v) => calc.setField(f.id, v)}
          />
        ))}
      </div>

      {bannerError && (
        <p className="text-[13.5px]" style={{ color: 'var(--error)' }}>
          {bannerError.message}
        </p>
      )}

      {/* Results — live; recomputed on every keystroke */}
      {calc.result && (
        <div className="flex flex-col gap-4 border-t border-line pt-6">
          <div>
            <p className="text-[13px] text-fg3">{calc.result.primary.label}</p>
            <p
              className="font-grotesk text-[34px] font-bold tracking-[-0.02em] text-fg"
              style={toneStyle(calc.result.primary.tone)}
            >
              {formatValue(calc.result.primary)}
            </p>
          </div>

          {calc.result.secondary.length > 0 && (
            <dl className="grid grid-cols-1 gap-x-8 gap-y-2 sm:grid-cols-2">
              {calc.result.secondary.map((row) => (
                <div key={row.label} className="flex items-baseline justify-between gap-4 border-b border-line/60 pb-1.5">
                  <dt className="text-[13px] text-fg3">{row.label}</dt>
                  <dd className="text-right font-grotesk text-[15px] font-semibold text-fg2" style={toneStyle(row.tone)}>
                    {formatValue(row)}
                  </dd>
                </div>
              ))}
            </dl>
          )}

          {calc.result.schedule && (
            <div className="overflow-x-auto rounded-lg border border-line">
              <table className="w-full text-[13px]">
                <caption className="px-3 py-2 text-left text-[12.5px] font-medium text-fg2">
                  {calc.result.schedule.title}
                </caption>
                <thead>
                  <tr className="border-b border-line bg-bg2 text-left text-fg3">
                    {calc.result.schedule.columns.map((c) => (
                      <th key={c.label} className="px-3 py-2 font-medium">{c.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {calc.result.schedule.rows.slice(0, 50).map((row, i) => (
                    <tr key={i} className="border-b border-line/40 last:border-0">
                      {row.map((cell, j) => (
                        <td key={j} className="px-3 py-1.5 text-fg2">
                          {formatCell(cell, calc.result!.schedule!.columns[j]?.format)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {calc.result.schedule.rows.length > 50 && (
                <p className="px-3 py-2 text-[12px] text-fg3">
                  and {calc.result.schedule.rows.length - 50} more rows…
                </p>
              )}
            </div>
          )}

          {/* Show your work */}
          <details className="rounded-lg border border-line bg-bg2 px-4 py-3">
            <summary className="cursor-pointer text-[13px] font-medium text-fg2">
              How this is calculated
            </summary>
            <div className="flex flex-col gap-1.5 pt-3">
              <p className="font-mono text-[12.5px] text-fg">{calc.result.formula}</p>
              {calc.result.steps.map((s) => (
                <p key={s} className="text-[12.5px] leading-[1.6] text-fg3">{s}</p>
              ))}
            </div>
          </details>
        </div>
      )}

      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={calc.reset}
          className="text-[12.5px] text-fg3 transition-colors hover:text-fg"
        >
          Reset to defaults
        </button>
        <p className="text-[12.5px] text-fg3">
          Computed on your device — nothing is sent anywhere.
        </p>
      </div>
    </div>
  );
}

/* ---------------- fields ---------------- */

const inputClass =
  'rounded-lg border border-line bg-bg2 px-3.5 py-2.5 font-sans text-[14px] text-fg placeholder:text-fg3 focus:border-accent focus:outline-none';

function Field({
  spec,
  value,
  error,
  onChange,
}: {
  spec: FieldSpec;
  value: string;
  error?: string;
  onChange: (v: string) => void;
}) {
  const id = `calc-${spec.id}`;
  return (
    <label htmlFor={id} className="flex flex-col gap-1.5">
      <span className="text-[13px] font-medium text-fg">
        {spec.label}
        {spec.suffix && <span className="ml-1.5 font-normal text-fg3">({spec.suffix})</span>}
      </span>

      {spec.kind === 'select' || spec.kind === 'unit' ? (
        <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={inputClass}>
          {(spec.options ?? []).map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      ) : spec.kind === 'date' ? (
        <input
          id={id}
          type="date"
          // 'today' is the engine-level default; the picker needs a concrete ISO date.
          value={value === 'today' ? todayIso() : value}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
        />
      ) : (
        <input
          id={id}
          // Deliberately not type=number even for numeric kinds: the engine
          // forgives "$1,250.50", and number inputs silently discard what they
          // can't parse — inputMode still raises the numeric keyboard on mobile.
          type="text"
          inputMode={spec.kind === 'text' ? undefined : 'decimal'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
          style={error ? { borderColor: 'var(--error)' } : undefined}
        />
      )}

      {error ? (
        <span className="text-[12px]" style={{ color: 'var(--error)' }}>{error}</span>
      ) : (
        spec.hint && <span className="text-[12px] text-fg3">{spec.hint}</span>
      )}
    </label>
  );
}

function todayIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/* ---------------- formatting ---------------- */

function toneStyle(tone: ResultValue['tone']): React.CSSProperties | undefined {
  if (tone === 'positive') return { color: 'var(--green)' };
  if (tone === 'negative') return { color: 'var(--error)' };
  return undefined;
}

function formatValue(rv: ResultValue): string {
  return formatCell(rv.value, rv.format);
}

function formatCell(value: unknown, format?: ValueFormat): string {
  if (value === null || value === undefined) return '';
  if (format?.kind === 'duration' && typeof value === 'object') {
    const d = value as { years: number; months: number; days: number };
    return `${d.years}y ${d.months}m ${d.days}d`;
  }
  if (typeof value === 'object' && !isDecimalish(value)) return String(value);

  const num = isDecimalish(value) ? Number(value.toString()) : typeof value === 'number' ? value : NaN;

  if (format?.kind === 'money' && Number.isFinite(num)) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: format.currency,
      minimumFractionDigits: format.precision ?? 2,
      maximumFractionDigits: format.precision ?? 2,
    }).format(num);
  }
  if (format?.kind === 'percent') return `${String(value)}%`;
  if (format?.kind === 'number') {
    const text = Number.isFinite(num) && Math.abs(num) >= 1000 ? withThousands(String(value)) : String(value);
    return format.unit ? `${text} ${format.unit}` : text;
  }
  return String(value);
}

/** Decimal without importing its class — anything exposing toString + toNumber-ish shape. */
function isDecimalish(v: unknown): v is { toString(): string } {
  return typeof v === 'object' && v !== null && 'toDecimalPlaces' in v;
}

/** Thousands separators on the integer part only, sign and decimals preserved. */
function withThousands(s: string): string {
  const [int = '', frac] = s.replace(/^-/, '').split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${s.startsWith('-') ? '-' : ''}${grouped}${frac ? `.${frac}` : ''}`;
}
