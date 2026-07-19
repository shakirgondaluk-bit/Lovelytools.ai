// lovelytools.ai — content sniffing. Extensions lie; magic bytes don't.
// ZIP and CFB containers are inspected to tell DOCX/XLSX/PPTX and DOC/XLS/PPT apart.
import { formatByExtension } from './formats';
import { EngineError, type FormatId } from './types';

const HEAD_BYTES = 8 * 1024; // enough for magic + OOXML content-type hints
const TAIL_BYTES = 64 * 1024; // ZIP central directory lives at the end

export async function detectFormat(file: File): Promise<FormatId> {
  const head = new Uint8Array(await file.slice(0, HEAD_BYTES).arrayBuffer());
  if (head.length === 0) throw new EngineError('corrupt-file', `${file.name} is empty.`);

  // --- PDF: "%PDF" ---
  if (startsWith(head, [0x25, 0x50, 0x44, 0x46])) return 'pdf';

  // --- ZIP container: "PK\x03\x04" → OOXML (docx/xlsx/pptx) ---
  if (startsWith(head, [0x50, 0x4b, 0x03, 0x04])) {
    return sniffZip(file, head);
  }

  // --- CFB container: D0 CF 11 E0 A1 B1 1A E1 → legacy Office ---
  if (startsWith(head, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) {
    return sniffCfb(file);
  }

  // --- Text-based formats ---
  const text = safeDecode(head);
  if (text !== null) return sniffText(text, file.name);

  const byExt = formatByExtension(file.name);
  if (byExt) return byExt;
  throw new EngineError(
    'undetectable-format',
    `Couldn't recognize ${file.name}. Supported: PDF, Word, Excel, PowerPoint, TXT, HTML, CSV, XML, JSON.`,
  );
}

/* ---------------- helpers ---------------- */

function startsWith(bytes: Uint8Array, magic: number[]): boolean {
  return magic.every((b, i) => bytes[i] === b);
}

/** OOXML: the part names in the zip identify the app. Scan head + central directory. */
async function sniffZip(file: File, head: Uint8Array): Promise<FormatId> {
  const tail = new Uint8Array(
    await file.slice(Math.max(0, file.size - TAIL_BYTES)).arrayBuffer(),
  );
  const haystack = latin1(head) + latin1(tail);
  if (haystack.includes('word/document.xml') || haystack.includes('word/')) return 'docx';
  if (haystack.includes('xl/workbook.xml') || haystack.includes('xl/')) return 'xlsx';
  if (haystack.includes('ppt/presentation.xml') || haystack.includes('ppt/slides')) return 'pptx';
  // Encrypted OOXML hides part names inside a CFB wrapper — but plain zip with none
  // of the markers is most likely not an Office file at all.
  const byExt = formatByExtension(file.name);
  if (byExt === 'docx' || byExt === 'xlsx' || byExt === 'pptx') return byExt;
  throw new EngineError('undetectable-format', `${file.name} is a ZIP archive, not an Office document.`);
}

/** CFB: stream names ("WordDocument", "Workbook", "PowerPoint Document") are stored
 *  UTF-16LE in the directory. Scan the raw bytes for them — cheap and reliable. */
async function sniffCfb(file: File): Promise<FormatId> {
  const bytes = new Uint8Array(
    await file.slice(0, Math.min(file.size, 512 * 1024)).arrayBuffer(),
  );
  const wide = utf16le(bytes);
  if (wide.includes('WordDocument')) return 'doc';
  if (wide.includes('Workbook') || wide.includes('Book')) return 'xls';
  if (wide.includes('PowerPoint Document')) return 'ppt';
  if (wide.includes('EncryptedPackage')) {
    throw new EngineError('password-protected', `${file.name} is password-protected. Remove the password first.`);
  }
  return formatByExtension(file.name) === 'xls' ? 'xls' : 'doc';
}

function sniffText(text: string, name: string): FormatId {
  const t = text.trimStart();
  const lower = t.slice(0, 512).toLowerCase();

  if (lower.startsWith('<!doctype html') || lower.startsWith('<html') || /<(body|head|div|p|table)[\s>]/.test(lower)) {
    return 'html';
  }
  if (t.startsWith('<?xml') || (t.startsWith('<') && !lower.includes('<html'))) return 'xml';
  if (t.startsWith('{') || t.startsWith('[')) {
    try {
      JSON.parse(sampleJson(t));
      return 'json';
    } catch {
      /* fall through */
    }
  }
  if (looksLikeCsv(t)) return 'csv';
  return formatByExtension(name) ?? 'txt';
}

/** Validate JSON on a sample: if the head parses or the file is small enough, trust it. */
function sampleJson(t: string): string {
  return t.length < HEAD_BYTES ? t : t; // full head slice; large files re-validated in converter
}

function looksLikeCsv(t: string): boolean {
  const lines = t.split(/\r?\n/, 5).filter((l) => l.length > 0);
  const [firstLine] = lines;
  // The length check below guarantees firstLine exists — TS just can't carry that
  // fact through the array's general index type, so it's read out explicitly.
  if (lines.length < 2 || !firstLine) return false;
  const delim = [',', ';', '\t'].find((d) => firstLine.includes(d));
  if (!delim) return false;
  const [firstCount, ...rest] = lines.map((l) => l.split(delim).length);
  return firstCount !== undefined && firstCount > 1 && rest.every((c) => c === firstCount);
}

function safeDecode(bytes: Uint8Array): string | null {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    // Not valid UTF-8 — could still be latin-1 text; treat as binary-unknown.
    return null;
  }
}

const latin1 = (b: Uint8Array) => Array.from(b, (c) => String.fromCharCode(c)).join('');

function utf16le(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i + 1 < bytes.length; i += 2) {
    // The loop condition guarantees both indices are in range; read once so TS
    // narrows to `number` for the rest of the branch instead of re-checking
    // `bytes[i]` against `undefined` on every use.
    const lo = bytes[i];
    const hi = bytes[i + 1];
    if (lo === undefined || hi === undefined) break;
    if (hi === 0 && lo >= 0x20 && lo < 0x7f) out += String.fromCharCode(lo);
    else out += '\u0000';
  }
  return out;
}
