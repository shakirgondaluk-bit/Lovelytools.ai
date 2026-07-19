// lovelytools.ai — data converters (DataIR ⇄ JSON/XML/CSV). Pure TS, zero deps,
// worker-safe (hand-rolled XML parse — no DOMParser in workers).
import { escapeHtml, type DataIR } from '../ir';
import { EngineError } from '../types';

/* ================= producers: format → DataIR ================= */

export function jsonToData(buf: ArrayBuffer): DataIR {
  try {
    return { kind: 'data', value: JSON.parse(new TextDecoder().decode(buf)) };
  } catch (e) {
    throw new EngineError('corrupt-file', `Invalid JSON: ${(e as Error).message}`);
  }
}

export function xmlToData(buf: ArrayBuffer): DataIR {
  return { kind: 'data', value: xmlToValue(new TextDecoder().decode(buf)) };
}

export function csvToData(buf: ArrayBuffer): DataIR {
  const text = new TextDecoder().decode(buf);
  const rows = parseCsv(text);
  const [head, ...rest] = rows;
  // rows.length < 1 already rules this out, but the destructure can't carry that
  // proof through to the type — TS sees `head: string[] | undefined` regardless.
  if (!head) throw new EngineError('corrupt-file', 'CSV file is empty.');
  const value = rest.map((r) => Object.fromEntries(head.map((k, i) => [k || `col${i + 1}`, coerce(r[i])])));
  return { kind: 'data', value };
}

/* ================= consumers: DataIR → format ================= */

export function dataToJson(d: DataIR): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(d.value, null, 2));
}

export function dataToXml(d: DataIR): Uint8Array {
  return new TextEncoder().encode(
    `<?xml version="1.0" encoding="UTF-8"?>\n${valueToXml(d.value, 'root', 0)}\n`,
  );
}

export function dataToCsv(d: DataIR): Uint8Array {
  const v = d.value;
  let rows: string[][];
  if (Array.isArray(v) && v.every((r) => r !== null && typeof r === 'object')) {
    const records = v as Record<string, unknown>[];
    const keys = [...new Set(records.flatMap((r) => Object.keys(r)))];
    rows = [keys, ...records.map((r) => keys.map((k) => stringify(r[k])))];
  } else if (v !== null && typeof v === 'object') {
    rows = [['key', 'value'], ...Object.entries(v as object).map(([k, val]) => [k, stringify(val)])];
  } else {
    rows = [['value'], [stringify(v)]];
  }
  return new TextEncoder().encode(rows.map((r) => r.map(csvEscape).join(',')).join('\r\n'));
}

/* ================= XML parser (worker-safe, attribute-aware) ================= */

/** Attributes → "@name" keys, text content → "#text", repeats → arrays. */
export function xmlToValue(xml: string): unknown {
  const src = xml.replace(/<\?xml[\s\S]*?\?>/, '').replace(/<!--[\s\S]*?-->/g, '').trim();
  const parser = new XmlCursor(src);
  const root = parser.parseElement();
  if (!root) throw new EngineError('corrupt-file', 'Invalid XML: no root element.');
  return { [root.name]: root.value };
}

class XmlCursor {
  private i = 0;
  constructor(private s: string) {}

  parseElement(): { name: string; value: unknown } | null {
    this.skipWs();
    if (this.s[this.i] !== '<') return null;
    const open = /^<([\w:.-]+)((?:\s+[\w:.-]+\s*=\s*"(?:[^"]*)")*)\s*(\/?)>/.exec(this.s.slice(this.i));
    if (!open) throw new EngineError('corrupt-file', `Invalid XML near position ${this.i}.`);
    const [full, name, attrStr = '', selfClose = ''] = open;
    // Group 1 is `[\w:.-]+` — required, so it is always populated whenever the regex
    // matches at all. TS can't see that from the exec() result type, so it's asserted
    // explicitly rather than silently falling back to an empty tag name.
    if (!name) throw new EngineError('corrupt-file', `Invalid XML near position ${this.i}: missing tag name.`);
    this.i += full.length;

    const obj: Record<string, unknown> = {};
    for (const [, k, v] of attrStr.matchAll(/([\w:.-]+)\s*=\s*"([^"]*)"/g)) {
      obj[`@${k}`] = coerce(decodeEntities(v ?? ''));
    }
    if (selfClose) return { name, value: Object.keys(obj).length ? obj : null };

    let text = '';
    while (this.i < this.s.length) {
      if (this.s.startsWith(`</${name}`, this.i)) {
        this.i = this.s.indexOf('>', this.i) + 1;
        break;
      }
      if (this.s.startsWith('<![CDATA[', this.i)) {
        const end = this.s.indexOf(']]>', this.i);
        text += this.s.slice(this.i + 9, end);
        this.i = end + 3;
        continue;
      }
      if (this.s[this.i] === '<') {
        const child = this.parseElement();
        if (!child) break;
        if (child.name in obj) {
          const cur = obj[child.name];
          if (Array.isArray(cur)) cur.push(child.value);
          else obj[child.name] = [cur, child.value];
        } else obj[child.name] = child.value;
        continue;
      }
      text += this.s[this.i++];
    }

    const trimmed = decodeEntities(text.trim());
    const hasChildren = Object.keys(obj).length > 0;
    if (!hasChildren) return { name, value: trimmed === '' ? null : coerce(trimmed) };
    if (trimmed !== '') obj['#text'] = coerce(trimmed);
    return { name, value: obj };
  }

  private skipWs() {
    while (this.i < this.s.length && /\s/.test(this.s[this.i] ?? '')) this.i++;
  }
}

function valueToXml(v: unknown, tag: string, depth: number): string {
  const pad = '  '.repeat(depth);
  const safe = tag.replace(/[^\w:.-]/g, '_');
  if (v === null || v === undefined) return `${pad}<${safe}/>`;
  if (Array.isArray(v)) return v.map((item) => valueToXml(item, safe, depth)).join('\n');
  if (typeof v === 'object') {
    const entries = Object.entries(v as Record<string, unknown>);
    const attrs = entries.filter(([k]) => k.startsWith('@'));
    const text = entries.find(([k]) => k === '#text');
    const children = entries.filter(([k]) => !k.startsWith('@') && k !== '#text');
    const attrStr = attrs.map(([k, val]) => ` ${k.slice(1)}="${escapeHtml(String(val))}"`).join('');
    if (children.length === 0) {
      return `${pad}<${safe}${attrStr}>${text ? escapeHtml(String(text[1])) : ''}</${safe}>`;
    }
    const inner = children.map(([k, val]) => valueToXml(val, k, depth + 1)).join('\n');
    return `${pad}<${safe}${attrStr}>\n${inner}\n${pad}</${safe}>`;
  }
  return `${pad}<${safe}>${escapeHtml(String(v))}</${safe}>`;
}

/* ================= CSV parser (RFC 4180: quotes, embedded commas/newlines) ================= */

export function parseCsv(text: string): string[][] {
  const delim = detectDelim(text);
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; }
        else quoted = false;
      } else cell += c;
    } else if (c === '"' && cell === '') quoted = true;
    else if (c === delim) { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      if (row.some((x) => x !== '')) rows.push(row);
      row = [];
    } else cell += c;
  }
  if (cell !== '' || row.length > 0) { row.push(cell); if (row.some((x) => x !== '')) rows.push(row); }
  return rows;
}

function detectDelim(text: string): string {
  const first = text.split(/\r?\n/, 1)[0] ?? '';
  return [',', ';', '\t'].reduce((best, d) =>
    first.split(d).length > first.split(best).length ? d : best,
  );
}

/* ================= scalar coercion ================= */

function coerce(s: string | undefined): string | number | boolean | null {
  if (s === undefined || s === '') return null;
  if (s === 'true') return true;
  if (s === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(s) && s.length < 16) return Number(s);
  return s;
}

function stringify(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

function csvEscape(s: string): string {
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, d) => String.fromCharCode(+d))
    .replace(/&amp;/g, '&');
}
