// lovelytools.ai — table converters (TableIR ⇄ XLS/XLSX/CSV/JSON/XML/HTML/TXT)
// via SheetJS CE. Legacy XLS reads at full fidelity.
import { cellToString, escapeHtml, type Sheet, type TableIR } from '../ir';
import { EngineError } from '../types';

type Progress = (pct: number, stage: string) => void;
type SheetJS = typeof import('xlsx');

async function sheetjs(): Promise<SheetJS> {
  return import('xlsx');
}

/* ================= producers: format → TableIR ================= */

/** XLS + XLSX + CSV + HTML tables — SheetJS auto-detects the container. */
export async function workbookToTable(buf: ArrayBuffer, p: Progress): Promise<TableIR> {
  p(15, 'Reading workbook');
  const XLSX = await sheetjs();
  const wb = XLSX.read(buf, { type: 'array', cellDates: true });
  if (wb.SheetNames.length === 0) throw new EngineError('corrupt-file', 'No sheets found.');
  p(55, 'Reading sheets');
  const sheets: Sheet[] = wb.SheetNames.map((name) => {
    // wb.Sheets is keyed by exactly the names in wb.SheetNames, so this lookup
    // cannot miss — SheetJS's own types just don't encode that relationship.
    const sheet = wb.Sheets[name];
    if (!sheet) throw new EngineError('corrupt-file', `Workbook is missing the "${name}" sheet.`);
    return {
      name,
      rows: XLSX.utils.sheet_to_json<unknown[]>(sheet, {
        header: 1,
        defval: null,
        raw: true,
      }) as Sheet['rows'],
    };
  });
  return { kind: 'table', sheets };
}

export async function csvToTable(buf: ArrayBuffer, p: Progress): Promise<TableIR> {
  return workbookToTable(buf, p); // SheetJS handles CSV/TSV with type inference
}

/** JSON: array-of-objects → rows (nested objects flattened to dot-paths). */
export async function jsonToTable(buf: ArrayBuffer, p: Progress): Promise<TableIR> {
  p(20, 'Parsing JSON');
  const value = JSON.parse(new TextDecoder().decode(buf));
  const records: Record<string, unknown>[] = Array.isArray(value)
    ? value.map((v) => (typeof v === 'object' && v !== null ? flatten(v as object) : { value: v }))
    : [flatten(value as object)];
  const headers = [...new Set(records.flatMap((r) => Object.keys(r)))];
  const rows: Sheet['rows'] = [
    headers,
    ...records.map((r) => headers.map((h) => normalizeCell(r[h]))),
  ];
  return { kind: 'table', sheets: [{ name: 'Sheet1', rows }] };
}

/** XML: repeated sibling elements become rows. */
export async function xmlToTable(buf: ArrayBuffer, p: Progress): Promise<TableIR> {
  p(20, 'Parsing XML');
  const { xmlToValue } = await import('./data');
  const value = xmlToValue(new TextDecoder().decode(buf));
  // Find the first array of records anywhere in the tree.
  const arr = findRecordArray(value);
  if (!arr) throw new EngineError('unsupported-route', 'No repeating records found in the XML.');
  return jsonToTable(new TextEncoder().encode(JSON.stringify(arr)).buffer, p);
}

/* ================= consumers: TableIR → format ================= */

export async function tableToXlsx(t: TableIR, p: Progress): Promise<Uint8Array> {
  p(70, 'Building workbook');
  const XLSX = await sheetjs();
  const wb = XLSX.utils.book_new();
  for (const s of t.sheets) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(s.rows), s.name.slice(0, 31));
  }
  return new Uint8Array(XLSX.write(wb, { type: 'array', bookType: 'xlsx' }));
}

export async function tableToCsv(t: TableIR, p: Progress): Promise<Uint8Array> {
  p(75, 'Writing CSV');
  const [first] = t.sheets;
  if (!first) throw new EngineError('corrupt-file', 'This workbook has no sheets to export.');
  const XLSX = await sheetjs();
  const csv = XLSX.utils.sheet_to_csv(XLSX.utils.aoa_to_sheet(first.rows));
  return new TextEncoder().encode(csv);
}

export async function tableToJson(t: TableIR, p: Progress): Promise<Uint8Array> {
  p(75, 'Writing JSON');
  const [first] = t.sheets;
  if (!first) throw new EngineError('corrupt-file', 'This workbook has no sheets to export.');
  const out =
    t.sheets.length === 1
      ? sheetToRecords(first)
      : Object.fromEntries(t.sheets.map((s) => [s.name, sheetToRecords(s)]));
  return new TextEncoder().encode(JSON.stringify(out, null, 2));
}

export async function tableToXml(t: TableIR, p: Progress): Promise<Uint8Array> {
  p(75, 'Writing XML');
  const rowsXml = t.sheets
    .map((s) => {
      const records = sheetToRecords(s);
      const items = records
        .map(
          (r) =>
            `    <row>\n${Object.entries(r)
              .map(([k, v]) => `      <${xmlName(k)}>${escapeHtml(String(v ?? ''))}</${xmlName(k)}>`)
              .join('\n')}\n    </row>`,
        )
        .join('\n');
      return `  <sheet name="${escapeHtml(s.name)}">\n${items}\n  </sheet>`;
    })
    .join('\n');
  return new TextEncoder().encode(`<?xml version="1.0" encoding="UTF-8"?>\n<workbook>\n${rowsXml}\n</workbook>\n`);
}

export async function tableToHtml(t: TableIR, p: Progress): Promise<Uint8Array> {
  p(75, 'Writing HTML');
  const body = t.sheets
    .map(
      (s) =>
        `<h2>${escapeHtml(s.name)}</h2>\n<table border="1" cellspacing="0" cellpadding="4">\n${s.rows
          .map((r) => `<tr>${r.map((c) => `<td>${escapeHtml(cellToString(c))}</td>`).join('')}</tr>`)
          .join('\n')}\n</table>`,
    )
    .join('\n');
  return new TextEncoder().encode(
    `<!DOCTYPE html>\n<html><head><meta charset="utf-8"></head><body>\n${body}\n</body></html>`,
  );
}

export async function tableToTxt(t: TableIR): Promise<Uint8Array> {
  const text = t.sheets
    .map((s) => s.rows.map((r) => r.map(cellToString).join('\t')).join('\n'))
    .join('\n\n');
  return new TextEncoder().encode(text);
}

/* ================= internals ================= */

function sheetToRecords(s: Sheet): Record<string, unknown>[] {
  const [head, ...rows] = s.rows;
  if (!head) return [];
  const keys = head.map((h, i) => (h === null || h === '' ? `col${i + 1}` : String(h)));
  return rows.map((r) => Object.fromEntries(keys.map((k, i) => [k, r[i] ?? null])));
}

function flatten(obj: object, prefix = ''): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) Object.assign(out, flatten(v, key));
    else out[key] = Array.isArray(v) ? JSON.stringify(v) : v;
  }
  return out;
}

function normalizeCell(v: unknown): string | number | boolean | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return v;
  return JSON.stringify(v);
}

function findRecordArray(value: unknown): unknown[] | null {
  if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object') return value;
  if (value !== null && typeof value === 'object') {
    for (const v of Object.values(value)) {
      const hit = findRecordArray(v);
      if (hit) return hit;
    }
  }
  return null;
}

function xmlName(k: string): string {
  const clean = k.replace(/[^\w.-]/g, '_');
  return /^[A-Za-z_]/.test(clean) ? clean : `_${clean}`;
}
