// lovelytools.ai — AcroForm reading, filling and flattening.
//
// Both of these were declared unbuildable ("needs AcroForm field reading and
// filling" / "needs AcroForm flattening"). pdf-lib has `getForm()`, `getFields()`
// and `form.flatten()` — the capability was already installed.
import { PDFCheckBox, PDFDropdown, PDFRadioGroup, PDFTextField } from 'pdf-lib';
import {
  checkCancelled,
  outName,
  PdfError,
  type OpContext,
  type PdfInput,
  type PdfOpResult,
} from '../types';
import { openPdf } from './merge';

export type FormFieldKind = 'text' | 'checkbox' | 'dropdown' | 'radio' | 'other';

export interface FormField {
  name: string;
  kind: FormFieldKind;
  /** Current value: text content, "true"/"false" for checkboxes, or the selection. */
  value: string;
  /** For dropdown/radio — what the user may pick. */
  options?: string[];
  readOnly: boolean;
}

/** Reads the fillable fields out of a PDF so the UI can render a form for them. */
export async function readFormFields(input: PdfInput): Promise<FormField[]> {
  const doc = await openPdf(input.buf, input.name);
  const form = doc.getForm();

  return form.getFields().map((field): FormField => {
    const name = field.getName();
    const readOnly = field.isReadOnly();

    if (field instanceof PDFTextField) {
      return { name, kind: 'text', value: field.getText() ?? '', readOnly };
    }
    if (field instanceof PDFCheckBox) {
      return { name, kind: 'checkbox', value: String(field.isChecked()), readOnly };
    }
    if (field instanceof PDFDropdown) {
      return {
        name,
        kind: 'dropdown',
        value: field.getSelected()[0] ?? '',
        options: field.getOptions(),
        readOnly,
      };
    }
    if (field instanceof PDFRadioGroup) {
      return {
        name,
        kind: 'radio',
        value: field.getSelected() ?? '',
        options: field.getOptions(),
        readOnly,
      };
    }
    // Buttons and signature fields — listed so the UI can show them greyed rather
    // than pretending the document has fewer fields than it does.
    return { name, kind: 'other', value: '', readOnly: true };
  });
}

export interface FillFormOptions {
  /** field name → new value. Checkboxes take "true"/"false". */
  values: Record<string, string>;
  /** Bake the values in so they can't be edited afterwards. */
  flatten?: boolean;
}

export async function fillForm(
  input: PdfInput,
  opts: FillFormOptions,
  ctx: OpContext,
): Promise<PdfOpResult> {
  const bytesIn = input.buf.byteLength;
  const doc = await openPdf(input.buf, input.name);
  const form = doc.getForm();
  const fields = form.getFields();

  if (fields.length === 0) {
    throw new PdfError(
      'internal',
      "This PDF has no fillable form fields. If it's a flat scan, there's nothing here to fill in.",
    );
  }

  const entries = Object.entries(opts.values);
  let filled = 0;

  for (const [i, [name, value]] of entries.entries()) {
    checkCancelled(ctx);
    ctx.progress(Math.round((i / Math.max(1, entries.length)) * 80), `Filling ${name}`);

    const field = fields.find((f) => f.getName() === name);
    if (!field) {
      ctx.warn(`No field called "${name}" — skipped.`);
      continue;
    }
    if (field.isReadOnly()) {
      ctx.warn(`"${name}" is read-only in this document — skipped.`);
      continue;
    }

    try {
      if (field instanceof PDFTextField) field.setText(value);
      else if (field instanceof PDFCheckBox) value === 'true' ? field.check() : field.uncheck();
      else if (field instanceof PDFDropdown) field.select(value);
      else if (field instanceof PDFRadioGroup) field.select(value);
      else {
        ctx.warn(`"${name}" isn't a fillable kind of field — skipped.`);
        continue;
      }
      filled++;
    } catch {
      // A select() with a value outside the field's option list throws. That's the
      // user's mistake, not a broken document — name it and carry on.
      ctx.warn(`"${value}" isn't an allowed value for "${name}" — skipped.`);
    }
  }

  if (opts.flatten) {
    ctx.progress(88, 'Flattening');
    form.flatten();
  }

  ctx.progress(94, 'Saving');
  const bytes = await doc.save({ useObjectStreams: true });
  const pages = doc.getPageCount();

  return {
    files: [{ bytes, name: outName(input.name, opts.flatten ? '-filled' : '-filled'), mime: 'application/pdf' }],
    fidelity: 'high',
    warnings: filled === 0 ? ['Nothing was filled in — check the field names.'] : [],
    stats: { pagesIn: pages, pagesOut: pages, bytesIn, bytesOut: bytes.byteLength },
  };
}

/**
 * Flattens form fields into the page.
 *
 * "Flatten" means the boxes stop being editable and become part of the artwork. It
 * does NOT rasterise the page — text stays selectable. compress-pdf is the tool that
 * turns pages into images.
 */
export async function flatten(input: PdfInput, ctx: OpContext): Promise<PdfOpResult> {
  const bytesIn = input.buf.byteLength;
  const doc = await openPdf(input.buf, input.name);
  const form = doc.getForm();
  const fieldCount = form.getFields().length;

  checkCancelled(ctx);
  ctx.progress(40, fieldCount ? `Flattening ${fieldCount} fields` : 'Checking for form fields');

  if (fieldCount === 0) {
    throw new PdfError(
      'internal',
      'This PDF has no form fields to flatten — it is already flat.',
    );
  }

  form.flatten();

  ctx.progress(90, 'Saving');
  const bytes = await doc.save({ useObjectStreams: true });
  const pages = doc.getPageCount();

  return {
    files: [{ bytes, name: outName(input.name, '-flat'), mime: 'application/pdf' }],
    fidelity: 'high',
    warnings: [
      `${fieldCount} field${fieldCount === 1 ? '' : 's'} baked into the page — the values are now permanent and can't be edited.`,
    ],
    stats: { pagesIn: pages, pagesOut: pages, bytesIn, bytesOut: bytes.byteLength },
  };
}
