// lovelytools.ai — document converters (DocIR ⇄ PDF/DOC/DOCX/PPT/PPTX/HTML/TXT).
// Heavy libraries are dynamic imports so each format family lazy-loads once
// per worker. All code paths are worker-safe (no DOM except DOMParser polyfill
// guards where noted).
import {
  blocksToHtml,
  blocksToText,
  escapeHtml,
  type DocBlock,
  type DocIR,
} from '../ir';
import { openPdfDocument } from '../pdfjs';
import { EngineError } from '../types';

type Progress = (pct: number, stage: string) => void;

/* ================= producers: format → DocIR ================= */

export async function docxToDoc(buf: ArrayBuffer, name: string, p: Progress): Promise<DocIR> {
  p(10, 'Reading Word document');
  const mammoth = await import('mammoth');
  const { value: html, messages } = await mammoth.convertToHtml({ arrayBuffer: buf });
  p(60, 'Structuring content');
  return { kind: 'doc', title: baseName(name), html, blocks: htmlToBlocks(html) };
}

export async function pdfToDoc(buf: ArrayBuffer, name: string, p: Progress): Promise<DocIR> {
  p(5, 'Opening PDF');
  const doc = await openPdfDocument(buf);
  const blocks: DocBlock[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    // Group text items into lines by their Y position, then lines → paragraphs.
    // pdf.js types `transform` as plain `number[]`, but every TextItem it emits
    // carries exactly 6 elements (the PDF matrix) — a fact the library's own types
    // don't encode. The double cast says explicitly "known invariant, not proven
    // by the structural checker" rather than silently widening past `unknown`.
    const lines = groupPdfLines(
      content.items as unknown as Array<{ str: string; transform: PdfMatrix }>,
    );
    for (const line of paragraphsFromLines(lines)) {
      blocks.push({ type: 'paragraph', text: line });
    }
    if (i < doc.numPages) blocks.push({ type: 'pagebreak' });
    p(5 + Math.round((i / doc.numPages) * 70), `Extracting page ${i} of ${doc.numPages}`);
  }
  const title = baseName(name);
  return { kind: 'doc', title, blocks, html: blocksToHtml(blocks, title) };
}

export async function htmlToDoc(buf: ArrayBuffer, name: string, p: Progress): Promise<DocIR> {
  p(20, 'Parsing HTML');
  const html = new TextDecoder().decode(buf);
  const sanitized = sanitizeHtml(html);
  return { kind: 'doc', title: baseName(name), html: sanitized, blocks: htmlToBlocks(sanitized) };
}

export async function txtToDoc(buf: ArrayBuffer, name: string): Promise<DocIR> {
  const text = new TextDecoder().decode(buf);
  const blocks: DocBlock[] = text
    .split(/\n{2,}/)
    .map((para) => ({ type: 'paragraph' as const, text: para.trim() }))
    .filter((b) => b.text.length > 0);
  const title = baseName(name);
  return { kind: 'doc', title, blocks, html: blocksToHtml(blocks, title) };
}

/** Legacy .doc — CFB stream text extraction (text-only fidelity by contract). */
export async function legacyDocToDoc(buf: ArrayBuffer, name: string, p: Progress): Promise<DocIR> {
  p(15, 'Reading legacy Word file');
  const CFB = await import('cfb');
  const cfb = CFB.read(new Uint8Array(buf), { type: 'buffer' });
  const entry = CFB.find(cfb, 'WordDocument');
  if (!entry?.content) throw new EngineError('corrupt-file', `${name} has no readable text stream.`);
  p(50, 'Extracting text');
  const text = extractWordStreamText(entry.content as Uint8Array);
  return txtToDoc(new TextEncoder().encode(text).buffer, name);
}

export async function pptxToDoc(buf: ArrayBuffer, name: string, p: Progress): Promise<DocIR> {
  p(10, 'Unpacking presentation');
  const JSZip = (await import('jszip')).default;
  const zip = await JSZip.loadAsync(buf);
  const slidePaths = Object.keys(zip.files)
    .filter((f) => /^ppt\/slides\/slide\d+\.xml$/.test(f))
    .sort((a, b) => slideNum(a) - slideNum(b));
  const blocks: DocBlock[] = [];
  for (const [i, path] of slidePaths.entries()) {
    // path came straight out of Object.keys(zip.files) two lines up, so the entry
    // is guaranteed to exist — JSZip's own index signature just doesn't say so.
    const entry = zip.files[path];
    if (!entry) throw new EngineError('corrupt-file', `${name}: slide entry "${path}" went missing while reading.`);
    const xml = await entry.async('string');
    const texts = [...xml.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map((m) => decodeXml(m[1] ?? ''));
    const [first, ...restTexts] = texts;
    if (first !== undefined) {
      blocks.push({ type: 'heading', level: 2, text: first });
      if (restTexts.length > 0) blocks.push({ type: 'list', ordered: false, items: restTexts });
    }
    p(10 + Math.round(((i + 1) / slidePaths.length) * 70), `Reading slide ${i + 1}`);
  }
  const title = baseName(name);
  return { kind: 'doc', title, blocks, html: blocksToHtml(blocks, title) };
}

/** Legacy .ppt — CFB text extraction. */
export async function legacyPptToDoc(buf: ArrayBuffer, name: string, p: Progress): Promise<DocIR> {
  p(15, 'Reading legacy PowerPoint file');
  const CFB = await import('cfb');
  const cfb = CFB.read(new Uint8Array(buf), { type: 'buffer' });
  const entry = CFB.find(cfb, 'PowerPoint Document');
  if (!entry?.content) throw new EngineError('corrupt-file', `${name} has no readable text stream.`);
  const text = extractPptStreamText(entry.content as Uint8Array);
  return txtToDoc(new TextEncoder().encode(text).buffer, name);
}

/* ================= consumers: DocIR → format ================= */

export async function docToHtml(ir: DocIR): Promise<Uint8Array> {
  return new TextEncoder().encode(
    ir.html.startsWith('<!DOCTYPE') ? ir.html : blocksToHtml(ir.blocks, ir.title),
  );
}

export async function docToTxt(ir: DocIR): Promise<Uint8Array> {
  return new TextEncoder().encode(blocksToText(ir.blocks));
}

export async function docToDocx(ir: DocIR, p: Progress): Promise<Uint8Array> {
  p(70, 'Building Word document');
  const docx = await import('docx');
  const children = ir.blocks.flatMap((b) => blockToDocx(b, docx));
  const file = new docx.Document({ sections: [{ children }] });
  const blob = await docx.Packer.toBlob(file);
  return new Uint8Array(await blob.arrayBuffer());
}

export async function docToPdf(ir: DocIR, p: Progress): Promise<Uint8Array> {
  p(70, 'Laying out PDF');
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const layout = new PdfFlow(pdf, font, bold);
  for (const b of ir.blocks) layout.writeBlock(b);
  p(92, 'Encoding PDF');
  return pdf.save();
}

export async function docToPptx(ir: DocIR, p: Progress): Promise<Uint8Array> {
  p(70, 'Building slides');
  const PptxGen = (await import('pptxgenjs')).default;
  const pres = new PptxGen();
  let slide = pres.addSlide();
  let y = 0.5;
  let started = false;
  for (const b of ir.blocks) {
    if (b.type === 'heading' || b.type === 'pagebreak') {
      if (started) {
        slide = pres.addSlide();
        y = 0.5;
      }
      started = true;
      if (b.type === 'heading') {
        slide.addText(b.text, { x: 0.5, y, w: 9, h: 0.8, fontSize: 28, bold: true });
        y += 1;
      }
      continue;
    }
    const text =
      b.type === 'list' ? b.items.map((t) => ({ text: t, options: { bullet: true } })) :
      b.type === 'table' ? b.rows.map((r) => r.join('  ·  ')).join('\n') :
      b.text;
    slide.addText(text as never, { x: 0.5, y, w: 9, h: 1.2, fontSize: 16 });
    y += 1.3;
    started = true;
  }
  const blob = (await pres.write({ outputType: 'blob' })) as Blob;
  return new Uint8Array(await blob.arrayBuffer());
}

/* ================= internals ================= */

function baseName(name: string): string {
  return name.replace(/\.[^./\\]+$/, '');
}

function slideNum(path: string): number {
  return parseInt(path.match(/slide(\d+)\.xml$/)?.[1] ?? '0', 10);
}

function decodeXml(s: string): string {
  return s
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(+d)).replace(/&amp;/g, '&');
}

/** Strip scripts/styles/event handlers; keep structural markup. */
export function sanitizeHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/\son\w+\s*=\s*(".*?"|'.*?'|[^\s>]+)/gi, '')
    .replace(/(href|src)\s*=\s*"javascript:[^"]*"/gi, '');
}

/** Regex-based block extraction — worker-safe (no DOMParser in workers). */
export function htmlToBlocks(html: string): DocBlock[] {
  const body = html.match(/<body[^>]*>([\s\S]*)<\/body>/i)?.[1] ?? html;
  const blocks: DocBlock[] = [];
  const re = /<(h[1-3]|p|li|tr)[^>]*>([\s\S]*?)<\/\1>/gi;
  let m: RegExpExecArray | null;
  let list: string[] = [];
  let rows: string[][] = [];
  const flush = () => {
    if (list.length) blocks.push({ type: 'list', ordered: false, items: list }), (list = []);
    if (rows.length) blocks.push({ type: 'table', rows }), (rows = []);
  };
  while ((m = re.exec(body)) !== null) {
    // Groups 1 and 2 are both required by the pattern (no `?` on either), so they
    // are always populated whenever `m` matches at all — the `?? ''` is here only
    // because TS types every capture group as possibly-undefined, not because
    // these can actually be empty.
    const tagRaw = m[1] ?? '';
    const inner = m[2] ?? '';
    const tag = tagRaw.toLowerCase();
    const text = decodeXml(inner.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
    if (!text) continue;
    if (tag === 'li') { list.push(text); continue; }
    if (tag === 'tr') {
      const cells = [...inner.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)]
        .map((c) => (c[1] ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
      if (cells.length) rows.push(cells);
      continue;
    }
    flush();
    if (tag.startsWith('h')) blocks.push({ type: 'heading', level: +(tag[1] ?? '2') as 1 | 2 | 3, text });
    else blocks.push({ type: 'paragraph', text });
  }
  flush();
  if (blocks.length === 0) {
    const plain = body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (plain) blocks.push({ type: 'paragraph', text: plain });
  }
  return blocks;
}

// pdf.js text-content transforms are always the 6-element PDF matrix [a,b,c,d,e,f].
// A tuple type, rather than plain number[], says so — and makes transform[5]
// (the Y translation) a `number`, not `number | undefined`.
type PdfMatrix = [number, number, number, number, number, number];

function groupPdfLines(items: Array<{ str: string; transform: PdfMatrix }>): string[] {
  const byY = new Map<number, string[]>();
  for (const it of items) {
    if (!it.str.trim()) continue;
    const y = Math.round(it.transform[5]);
    const bucket = [...byY.keys()].find((k) => Math.abs(k - y) <= 2) ?? y;
    if (!byY.has(bucket)) byY.set(bucket, []);
    byY.get(bucket)!.push(it.str);
  }
  return [...byY.entries()].sort((a, b) => b[0] - a[0]).map(([, parts]) => parts.join(' ').trim());
}

function paragraphsFromLines(lines: string[]): string[] {
  const paras: string[] = [];
  let cur = '';
  for (const line of lines) {
    if (line === '') { if (cur) paras.push(cur), (cur = ''); continue; }
    cur = cur ? `${cur} ${line}` : line;
    if (/[.!?:]$/.test(line)) { paras.push(cur); cur = ''; }
  }
  if (cur) paras.push(cur);
  return paras;
}

/** Word 97 text: printable runs from the WordDocument stream (cp1252 + utf-16 mixed). */
function extractWordStreamText(bytes: Uint8Array): string {
  const runs: string[] = [];
  let cur = '';
  // for-of over the Uint8Array yields `number` directly — an index loop with
  // bytes[i] gives `number | undefined` under noUncheckedIndexedAccess despite
  // `i` always being in range.
  for (const c of bytes) {
    if ((c >= 0x20 && c < 0x7f) || c === 0x0d) {
      cur += c === 0x0d ? '\n\n' : String.fromCharCode(c);
    } else if (cur.length >= 4) {
      runs.push(cur); cur = '';
    } else cur = '';
  }
  if (cur.length >= 4) runs.push(cur);
  return runs.join(' ').replace(/\s{3,}/g, '\n\n').trim();
}

function extractPptStreamText(bytes: Uint8Array): string {
  // TextCharsAtom (utf-16le) and TextBytesAtom (latin1) both surface as printable runs.
  return extractWordStreamText(bytes);
}

/** Minimal top-down PDF text flow with pagination. */
class PdfFlow {
  private page;
  private y: number;
  private readonly margin = 56;
  private readonly width: number;

  constructor(
    private pdf: import('pdf-lib').PDFDocument,
    private font: import('pdf-lib').PDFFont,
    private bold: import('pdf-lib').PDFFont,
  ) {
    this.page = pdf.addPage([612, 792]); // US Letter
    this.width = 612 - this.margin * 2;
    this.y = 792 - this.margin;
  }

  writeBlock(b: DocBlock) {
    switch (b.type) {
      case 'pagebreak': this.newPage(); return;
      case 'heading': this.writeLines(b.text, this.bold, b.level === 1 ? 20 : b.level === 2 ? 16 : 13.5, 10); return;
      case 'paragraph': this.writeLines(b.text, this.font, 11, 7); return;
      case 'list': b.items.forEach((it) => this.writeLines(`• ${it}`, this.font, 11, 4)); this.y -= 4; return;
      case 'table': b.rows.forEach((r) => this.writeLines(r.join('    '), this.font, 10, 3)); this.y -= 6; return;
    }
  }

  private writeLines(text: string, font: import('pdf-lib').PDFFont, size: number, gapAfter: number) {
    for (const line of this.wrap(text, font, size)) {
      if (this.y < this.margin + size) this.newPage();
      this.page.drawText(line, { x: this.margin, y: this.y - size, size, font });
      this.y -= size * 1.45;
    }
    this.y -= gapAfter;
  }

  private wrap(text: string, font: import('pdf-lib').PDFFont, size: number): string[] {
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let cur = '';
    for (const w of words) {
      const attempt = cur ? `${cur} ${w}` : w;
      if (font.widthOfTextAtSize(attempt, size) > this.width && cur) { lines.push(cur); cur = w; }
      else cur = attempt;
    }
    if (cur) lines.push(cur);
    return lines;
  }

  private newPage() {
    this.page = this.pdf.addPage([612, 792]);
    this.y = 792 - this.margin;
  }
}

// `unknown[]` used to stand in here, which pushed the type error downstream to the
// Document({ sections }) call instead of catching a wrong return shape at its
// source. FileChild is docx's own base class for anything a section can hold
// (Paragraph, Table, …) — the real return type of this function.
function blockToDocx(
  b: DocBlock,
  docx: typeof import('docx'),
): InstanceType<typeof import('docx').FileChild>[] {
  const { Paragraph, HeadingLevel, Table, TableRow, TableCell } = docx;
  switch (b.type) {
    case 'heading': {
      const levels = [HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3];
      return [new Paragraph({ text: b.text, heading: levels[b.level - 1] })];
    }
    case 'paragraph':
      return [new Paragraph({ text: b.text })];
    case 'list':
      return b.items.map((it) => new Paragraph({ text: it, bullet: { level: 0 } }));
    case 'table':
      return [
        new Table({
          rows: b.rows.map(
            (r) =>
              new TableRow({
                children: r.map((c) => new TableCell({ children: [new Paragraph({ text: c })] })),
              }),
          ),
        }),
      ];
    case 'pagebreak':
      return [new Paragraph({ pageBreakBefore: true, text: '' })];
  }
}
