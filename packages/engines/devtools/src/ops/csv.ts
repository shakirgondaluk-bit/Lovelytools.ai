// lovelytools.ai — JSON ⇄ CSV. RFC 4180-ish: quoted fields, embedded commas/
// quotes/newlines, CRLF or LF rows.
import { defineDevOp, DevError, type DevOptions, type DevResult } from '../types';

function parseCsv(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let i = 0;
  const n = text.length;
  while (i < n) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false; i++; continue;
      }
      field += ch; i++; continue;
    }
    if (ch === '"') { inQuotes = true; i++; continue; }
    if (ch === delimiter) { row.push(field); field = ''; i++; continue; }
    if (ch === '\r') { i++; continue; }
    if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; i++; continue; }
    field += ch; i++;
  }
  if (field !== '' || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

function csvField(v: string, delimiter: string): string {
  if (v.includes(delimiter) || v.includes('"') || v.includes('\n') || v.includes('\r')) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}

export const csvToJson = defineDevOp({
  slug: 'csv-to-json',
  name: 'CSV to JSON',
  description: 'Convert CSV data into structured JSON — first row as headers.',
  options: [
    { id: 'delimiter', label: 'Delimiter', kind: 'select', default: ',', options: [
      { value: ',', label: 'Comma' }, { value: ';', label: 'Semicolon' }, { value: '\t', label: 'Tab' },
    ] },
    { id: 'indent', label: 'Indent', kind: 'select', default: '2', options: [
      { value: '2', label: '2 spaces' }, { value: '4', label: '4 spaces' },
    ] },
  ],
  run(input: string, options: DevOptions): DevResult {
    if (input.trim() === '') return { output: '' };
    const rows = parseCsv(input, String(options.delimiter)).filter((r) => !(r.length === 1 && r[0] === ''));
    if (rows.length === 0) return { output: '[]' };
    const header = rows[0] ?? [];
    const body = rows.slice(1);
    const records = body.map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ''])));
    return {
      output: JSON.stringify(records, null, Number(options.indent) || 2),
      notes: [`${body.length} row(s), ${header.length} column(s).`],
    };
  },
  vectors: [
    { input: 'name,age\nAda,36\n"Grace, Jr.",85', options: { delimiter: ',', indent: '2' }, expect: JSON.stringify([{ name: 'Ada', age: '36' }, { name: 'Grace, Jr.', age: '85' }], null, 2) },
  ],
});

export const jsonToCsv = defineDevOp({
  slug: 'json-to-csv',
  name: 'JSON to CSV',
  description: 'Convert a JSON array of objects into a CSV spreadsheet.',
  options: [
    { id: 'delimiter', label: 'Delimiter', kind: 'select', default: ',', options: [
      { value: ',', label: 'Comma' }, { value: ';', label: 'Semicolon' }, { value: '\t', label: 'Tab' },
    ] },
  ],
  run(input: string, options: DevOptions): DevResult {
    if (input.trim() === '') return { output: '' };
    let value: unknown;
    try {
      value = JSON.parse(input);
    } catch (e) {
      throw new DevError('parse-error', `Invalid JSON: ${(e as Error).message}`);
    }
    if (!Array.isArray(value)) throw new DevError('invalid-input', 'Expected a JSON array of objects.');
    const delimiter = String(options.delimiter);
    const columns: string[] = [];
    for (const rec of value) {
      if (rec === null || typeof rec !== 'object') continue;
      for (const k of Object.keys(rec as Record<string, unknown>)) if (!columns.includes(k)) columns.push(k);
    }
    const lines = [columns.map((c) => csvField(c, delimiter)).join(delimiter)];
    for (const rec of value as Array<Record<string, unknown>>) {
      lines.push(columns.map((c) => {
        const v = rec?.[c];
        return csvField(v === undefined || v === null ? '' : String(v), delimiter);
      }).join(delimiter));
    }
    return { output: lines.join('\r\n'), notes: [`${value.length} row(s), ${columns.length} column(s).`] };
  },
  vectors: [
    { input: JSON.stringify([{ name: 'Ada', age: 36 }, { name: 'Grace, Jr.', age: 85 }]), options: { delimiter: ',' }, expect: 'name,age\r\nAda,36\r\n"Grace, Jr.",85' },
  ],
});
