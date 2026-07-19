// lovelytools.ai — intermediate representations. Every conversion is
// source → IR → target; converters never talk to each other directly.

/** DocIR — sanitized HTML + metadata. The lingua franca for documents. */
export interface DocIR {
  kind: 'doc';
  /** Sanitized HTML body (no scripts, no external resources). */
  html: string;
  title: string;
  /** Per-page/section plain text, for PDF/TXT emitters that paginate. */
  blocks: DocBlock[];
}

export type DocBlock =
  | { type: 'heading'; level: 1 | 2 | 3; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; ordered: boolean; items: string[] }
  | { type: 'table'; rows: string[][] }
  | { type: 'pagebreak' };

/** TableIR — workbook of typed sheets. */
export interface TableIR {
  kind: 'table';
  sheets: Sheet[];
}

export interface Sheet {
  name: string;
  /** Row-major cells. null = empty. */
  rows: CellValue[][];
}

export type CellValue = string | number | boolean | Date | null;

/** DataIR — a plain JS value (object / array / scalar tree). */
export interface DataIR {
  kind: 'data';
  value: unknown;
}

export type IR = DocIR | TableIR | DataIR;
export type IRKind = IR['kind'];

/* ---------------- shared IR utilities ---------------- */

export function blocksToText(blocks: DocBlock[]): string {
  return blocks
    .map((b) => {
      switch (b.type) {
        case 'heading':
          return b.text.toUpperCase() + '\n';
        case 'paragraph':
          return b.text;
        case 'list':
          return b.items.map((it, i) => (b.ordered ? `${i + 1}. ${it}` : `• ${it}`)).join('\n');
        case 'table':
          return b.rows.map((r) => r.join('\t')).join('\n');
        case 'pagebreak':
          return '\f';
      }
    })
    .join('\n\n');
}

export function blocksToHtml(blocks: DocBlock[], title: string): string {
  const esc = escapeHtml;
  const body = blocks
    .map((b) => {
      switch (b.type) {
        case 'heading':
          return `<h${b.level}>${esc(b.text)}</h${b.level}>`;
        case 'paragraph':
          return `<p>${esc(b.text)}</p>`;
        case 'list': {
          const tag = b.ordered ? 'ol' : 'ul';
          return `<${tag}>${b.items.map((it) => `<li>${esc(it)}</li>`).join('')}</${tag}>`;
        }
        case 'table':
          return `<table>${b.rows
            .map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`)
            .join('')}</table>`;
        case 'pagebreak':
          return '<hr data-pagebreak="true">';
      }
    })
    .join('\n');
  return `<!DOCTYPE html>\n<html><head><meta charset="utf-8"><title>${esc(title)}</title></head><body>\n${body}\n</body></html>`;
}

/** Table → DocIR bridge (lets spreadsheets flow to PDF/DOCX/HTML). */
export function tableToDoc(t: TableIR, title: string): DocIR {
  const blocks: DocBlock[] = t.sheets.flatMap((s) => [
    { type: 'heading', level: 2, text: s.name } as DocBlock,
    { type: 'table', rows: s.rows.map((r) => r.map(cellToString)) } as DocBlock,
  ]);
  return { kind: 'doc', title, blocks, html: blocksToHtml(blocks, title) };
}

export function cellToString(c: CellValue): string {
  if (c === null || c === undefined) return '';
  if (c instanceof Date) return c.toISOString().slice(0, 10);
  return String(c);
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
