'use client';

import { useEffect, useState } from 'react';
import { readFormFields, type FormField, type PdfControl, type PdfInput } from '@lovelytools/engine-pdf';

/** Everything the runner collects before an op can start. */
export interface ControlState {
  /** range / order / text / password / number — whatever the single input holds. */
  value: string;
  /** The signature image or comparison document. */
  secondFile: File | null;
  /** fill-pdf-form: field name → value. */
  fields: Record<string, string>;
}

export const emptyControlState = (): ControlState => ({ value: '', secondFile: null, fields: {} });

const inputClass =
  'rounded-lg border border-line bg-bg2 px-3.5 py-2.5 font-sans text-[14px] text-fg placeholder:text-fg3 focus:border-accent focus:outline-none disabled:opacity-40';

/**
 * Renders whatever a PDF op needs before it can run.
 *
 * One component per control kind, switched on the binding's declared control — so a
 * tool page never has to know what a "crop margin" is, only that its binding asks
 * for a number.
 */
export function PdfControls({
  control,
  state,
  onChange,
  file,
  disabled,
}: {
  control: PdfControl;
  state: ControlState;
  onChange: (next: ControlState) => void;
  /** The main input — form fields are read out of it. */
  file: File | null;
  disabled: boolean;
}) {
  if (control.kind === 'none') return null;

  const set = (patch: Partial<ControlState>) => onChange({ ...state, ...patch });

  if (control.kind === 'form-fields') {
    return <FormFieldControl control={control} state={state} onChange={onChange} file={file} disabled={disabled} />;
  }

  if (control.kind === 'second-file') {
    return (
      <label className="flex flex-col gap-2">
        <span className="text-[13.5px] font-medium text-fg">{control.label}</span>
        <input
          type="file"
          accept={control.accept}
          disabled={disabled}
          onChange={(e) => set({ secondFile: e.target.files?.[0] ?? null })}
          className={`${inputClass} file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-surface2 file:px-3 file:py-1 file:font-sans file:text-[13px] file:text-fg2`}
        />
        {state.secondFile && (
          <span className="text-[12.5px] text-fg2">Selected: {state.secondFile.name}</span>
        )}
        {control.hint && <span className="text-[12.5px] text-fg3">{control.hint}</span>}
      </label>
    );
  }

  if (control.kind === 'password') {
    return (
      <label className="flex flex-col gap-2">
        <span className="text-[13.5px] font-medium text-fg">
          {control.label}
          {control.optional && <span className="ml-1.5 font-normal text-fg3">(optional)</span>}
        </span>
        <input
          // type=password so it isn't shoulder-surfed. It never leaves this tab
          // either — see packages/engines/pdf/src/ops/security.ts.
          type="password"
          autoComplete="new-password"
          value={state.value}
          onChange={(e) => set({ value: e.target.value })}
          placeholder={control.placeholder}
          disabled={disabled}
          className={inputClass}
        />
        {control.hint && <span className="text-[12.5px] text-fg3">{control.hint}</span>}
      </label>
    );
  }

  if (control.kind === 'number') {
    return (
      <label className="flex flex-col gap-2">
        <span className="text-[13.5px] font-medium text-fg">{control.label}</span>
        <input
          type="number"
          inputMode="numeric"
          min={control.min}
          max={control.max}
          step={control.step ?? 1}
          value={state.value}
          onChange={(e) => set({ value: e.target.value })}
          placeholder={control.placeholder}
          disabled={disabled}
          className={`${inputClass} max-w-[160px]`}
        />
        {control.hint && <span className="text-[12.5px] text-fg3">{control.hint}</span>}
      </label>
    );
  }

  // range | order | text — one line of free input.
  return (
    <label className="flex flex-col gap-2">
      <span className="text-[13.5px] font-medium text-fg">{control.label}</span>
      <input
        value={state.value}
        onChange={(e) => set({ value: e.target.value })}
        placeholder={control.placeholder}
        disabled={disabled}
        className={inputClass}
      />
      {control.hint && <span className="text-[12.5px] text-fg3">{control.hint}</span>}
    </label>
  );
}

/**
 * fill-pdf-form's control: the fields come out of the user's own document, so the
 * form has to be read before it can be drawn. Reading happens on the device like
 * everything else.
 */
function FormFieldControl({
  control,
  state,
  onChange,
  file,
  disabled,
}: {
  control: Extract<PdfControl, { kind: 'form-fields' }>;
  state: ControlState;
  onChange: (next: ControlState) => void;
  file: File | null;
  disabled: boolean;
}) {
  const [fields, setFields] = useState<FormField[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!file) {
      setFields(null);
      return;
    }
    (async () => {
      try {
        const input: PdfInput = { buf: await file.arrayBuffer(), name: file.name };
        const found = await readFormFields(input);
        if (cancelled) return;
        setFields(found);
        setError(
          found.length === 0
            ? "This PDF has no fillable fields. If it's a flat scan there's nothing to fill in — try OCR instead."
            : null,
        );
        onChange({
          ...state,
          fields: Object.fromEntries(found.map((f) => [f.name, f.value])),
        });
      } catch {
        if (!cancelled) setError("Couldn't read the form fields out of that file.");
      }
    })();
    return () => {
      cancelled = true;
    };
    // Only re-read when the file changes; `state` would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

  if (!file) return null;
  if (error) {
    return <p className="text-[13.5px]" style={{ color: 'var(--error)' }}>{error}</p>;
  }
  if (!fields) {
    return <p className="text-[13px] text-fg3">Reading the form…</p>;
  }

  const set = (name: string, value: string) =>
    onChange({ ...state, fields: { ...state.fields, [name]: value } });

  return (
    <div className="flex flex-col gap-3">
      <span className="text-[13.5px] font-medium text-fg">
        {control.label} <span className="font-normal text-fg3">({fields.length})</span>
      </span>
      <div className="flex max-h-[320px] flex-col gap-3 overflow-y-auto pr-1">
        {fields.map((field) => (
          <label key={field.name} className="flex flex-col gap-1.5">
            <span className="text-[12.5px] text-fg2">
              {field.name}
              {field.readOnly && <span className="ml-1.5 text-fg3">· read-only</span>}
            </span>

            {field.kind === 'checkbox' ? (
              <input
                type="checkbox"
                checked={state.fields[field.name] === 'true'}
                disabled={disabled || field.readOnly}
                onChange={(e) => set(field.name, String(e.target.checked))}
                className="size-4 accent-[var(--accent)]"
              />
            ) : field.options && field.options.length > 0 ? (
              <select
                value={state.fields[field.name] ?? ''}
                disabled={disabled || field.readOnly}
                onChange={(e) => set(field.name, e.target.value)}
                className={inputClass}
              >
                <option value="">— none —</option>
                {field.options.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            ) : (
              <input
                value={state.fields[field.name] ?? ''}
                disabled={disabled || field.readOnly || field.kind === 'other'}
                onChange={(e) => set(field.name, e.target.value)}
                className={inputClass}
              />
            )}
          </label>
        ))}
      </div>
      {control.hint && <span className="text-[12.5px] text-fg3">{control.hint}</span>}
    </div>
  );
}
