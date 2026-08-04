// lovelytools.ai — PDF → TableIR: rebuilding the page as a grid from text positions.
//
// A PDF has no notion of a table. It has glyphs at coordinates, and whatever grid a
// human sees is an artifact of how those coordinates line up. So this reads the
// geometry back out, in three passes per page:
//
//   1. rows      — text items sharing a baseline (within a tolerance derived from
//                  the font size, not a magic constant, so 8pt and 24pt text both
//                  group correctly).
//   2. cells     — items merged left-to-right while the gap between them looks like
//                  a word space rather than a column gutter.
//   3. columns   — cell left-edges clustered across the whole page, then every cell
//                  snapped to its nearest column. This is the pass that matters:
//                  aligning every row to one page-wide column model is what turns
//                  ragged per-row cell lists into a rectangular sheet.
//
// The whole page goes through this, not just the parts that look like a table. An
// earlier version hunted for table-shaped blocks and dumped everything else into a
// single text column — which meant one undetected block turned a whole document into
// a column of sentences, losing the layout entirely. Reproducing the page as a grid
// degrades far better: a real table lands in real columns, prose lands in the first
// column, and reading order and page order survive either way.
//
// Ruling lines are deliberately ignored. Plenty of real tables have no borders at
// all (financial statements, invoices), and plenty of bordered layouts aren't
// tables, so the text geometry is the more reliable signal in both directions.
//
// Fidelity is 'text-only' by contract: fonts, colours, merged cells and rotated text
// cannot be recovered from coordinates, and cells wrapped over several lines stay
// several rows. What is preserved is structure — columns, reading order, pagination.
import type { CellValue, Sheet, TableIR } from '../ir';
// pdfjs.ts is imported lazily, not at module scope. Its worker-mode fix runs on
// import (`self.window = self`) and throws anywhere `self` doesn't exist — which
// includes plain Node, where pdf-table.test.ts exercises the geometry below.
// Keeping the import inside the one function that opens a document means the pure
// pipeline stays importable without a browser-like global.

type Progress = (pct: number, stage: string) => void;

// pdf.js text-content transforms are always the 6-element PDF matrix [a,b,c,d,e,f]:
// e/f are the translation (x/y) and d carries the vertical scale, i.e. the rendered
// font size. Same tuple type as document.ts uses, for the same reason — plain
// number[] would make every element `number | undefined`.
type PdfMatrix = [number, number, number, number, number, number];

export interface RawItem {
  str: string;
  transform: PdfMatrix;
  width: number;
  height: number;
}

interface Item {
  text: string;
  x: number;
  /** Right edge — the gap to the next item is measured from here. */
  end: number;
  y: number;
  size: number;
}

interface Cell {
  text: string;
  x: number;
  /** Font size of the text in this cell — the unit the column tolerance is in. */
  size: number;
}

interface Row {
  cells: Cell[];
  /** Baseline, for reading the vertical gap to the row above. */
  y: number;
  size: number;
}

/**
 * Two items on the same baseline belong to the same cell if the space between them
 * could plausibly be a word space. A space glyph is roughly a quarter of the font
 * size; a column gutter in a real table is rarely under a full em. 0.55em sits
 * between the two with room on both sides — wide enough to survive justified text
 * (which stretches spaces), narrow enough that a genuine gutter still splits.
 */
const WORD_GAP_EM = 0.55;

/** Baseline tolerance for "same row", as a fraction of font size. */
const ROW_TOLERANCE_EM = 0.5;

/** Two column candidates merge if their left edges are within this fraction of an em. */
const COLUMN_TOLERANCE_EM = 1.2;

/**
 * A vertical gap larger than this many times the local line pitch reads as
 * deliberate separation — the space between a heading and its table, or between two
 * blocks — and becomes one blank row so the sheet keeps the page's visual grouping.
 */
const BLANK_ROW_PITCH = 1.8;

/**
 * Converts a PDF to a workbook: one sheet per page, each page's lines laid out on
 * that page's own column model.
 *
 * One sheet per page rather than one per detected table, because page order and
 * reading order are most of what "keeping the format" means for a document, and
 * because per-page column models are what let a two-column invoice and a five-column
 * schedule live in the same file without either being forced into the other's grid.
 */
export async function pdfToTable(buf: ArrayBuffer, name: string, p: Progress): Promise<TableIR> {
  p(5, 'Opening PDF');
  const { openPdfDocument } = await import('../pdfjs');
  const doc = await openPdfDocument(buf);
  const sheets: Sheet[] = [];

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    // pdf.js's TextItem union includes TextMarkedContent (no str/transform). The
    // cast asserts the shape the text layer actually emits for real glyph runs;
    // items without a string are filtered out in toItems().
    const rows = extractPage(content.items as unknown as RawItem[]);
    sheets.push({ name: pageSheetName(name, i, doc.numPages), rows });
    p(5 + Math.round((i / doc.numPages) * 80), `Reading page ${i} of ${doc.numPages}`);
  }

  if (sheets.length === 0) sheets.push({ name: baseName(name), rows: [] });
  p(90, 'Building workbook');
  return { kind: 'table', sheets };
}

/**
 * The whole geometry pipeline for one page, as a pure function of pdf.js text items:
 * items → rows → cells → a rectangular grid on the page's own column model.
 *
 * Split out from pdfToTable so the part with all the judgement in it — row banding,
 * word-gap merging, column snapping — is testable against hand-placed coordinates
 * without a PDF, a worker, or pdf.js. See pdf-table.test.ts.
 */
export function extractPage(raw: RawItem[]): CellValue[][] {
  const rows = groupRows(toItems(raw));
  if (rows.length === 0) return [];
  return withBlankRows(squareOff(rows.map((r) => r.cells)), rows);
}

/* ================= internals ================= */

function toItems(raw: RawItem[]): Item[] {
  const items: Item[] = [];
  for (const it of raw) {
    if (typeof it.str !== 'string' || !it.str.trim()) continue;
    const t = it.transform;
    if (!Array.isArray(t) || t.length < 6) continue;
    // transform[3] is the vertical scale; for the overwhelmingly common
    // unrotated case it IS the rendered font size. Fall back to the reported
    // height, then to a sane default, so a degenerate matrix can't produce a
    // zero-size tolerance that puts every item in its own row.
    const size = Math.abs(t[3]) || it.height || 10;
    const x = t[4];
    items.push({ text: it.str, x, end: x + (it.width || 0), y: t[5], size });
  }
  return items;
}

/**
 * Items → rows of cells, top to bottom. Rows are found by baseline, then each row's
 * items are merged into cells on the word-gap rule. The baseline comes back with the
 * row so vertical spacing can be read afterwards.
 */
function groupRows(items: Item[]): Row[] {
  if (items.length === 0) return [];
  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x);
  const bands: Item[][] = [];
  let current: Item[] = [];
  let baseline = sorted[0]?.y ?? 0;

  for (const it of sorted) {
    const tolerance = it.size * ROW_TOLERANCE_EM;
    if (current.length > 0 && Math.abs(it.y - baseline) > tolerance) {
      bands.push(current);
      current = [];
    }
    if (current.length === 0) baseline = it.y;
    current.push(it);
  }
  if (current.length > 0) bands.push(current);

  return bands
    .map((band) => ({
      cells: mergeRowIntoCells(band),
      y: band[0]?.y ?? 0,
      size: Math.max(...band.map((it) => it.size)),
    }))
    .filter((row) => row.cells.length > 0);
}

/**
 * Reinstates the page's vertical rhythm: a gap noticeably larger than the page's own
 * line pitch becomes one blank row. Without this every block runs together and a
 * reader loses the boundary between a heading, its table, and the next section.
 *
 * The pitch is measured from the page, not from the font size. Leading is a choice
 * the document makes — the same 10pt text can be set at 11pt or 20pt line spacing —
 * so a font-derived threshold inserts a blank between every line of a loosely set
 * page and none at all on a tight one.
 *
 * One blank row per gap, never a proportional run of them: a spreadsheet's job is to
 * show structure, not to reproduce whitespace to scale.
 */
function withBlankRows(grid: CellValue[][], rows: Row[]): CellValue[][] {
  const width = grid[0]?.length ?? 1;
  const pitch = linePitch(rows);
  const out: CellValue[][] = [];
  for (const [i, row] of grid.entries()) {
    const prev = rows[i - 1];
    const here = rows[i];
    if (prev && here && pitch > 0 && prev.y - here.y > pitch * BLANK_ROW_PITCH) {
      out.push(new Array(width).fill(null));
    }
    out.push(row);
  }
  return out;
}

/**
 * The page's normal line spacing, as the 25th-percentile gap between baselines.
 *
 * Not the median: on a page that is half table and half prose the median sits between
 * the two spacings and every prose line then looks like a deliberate break. Not the
 * minimum either, which one tight pair anywhere on the page would drag down. The
 * lower quartile lands on "the tightest spacing this page uses routinely", which is
 * what a gap has to beat to count as a real separation.
 */
function linePitch(rows: Row[]): number {
  const gaps: number[] = [];
  for (let i = 1; i < rows.length; i++) {
    const prev = rows[i - 1];
    const here = rows[i];
    if (prev && here) gaps.push(prev.y - here.y);
  }
  if (gaps.length === 0) return 0;
  gaps.sort((a, b) => a - b);
  return gaps[Math.floor(gaps.length * 0.25)] ?? 0;
}

function mergeRowIntoCells(band: Item[]): Cell[] {
  const ordered = [...band].sort((a, b) => a.x - b.x);
  const cells: Cell[] = [];
  let text = '';
  let left = 0;
  let right = 0;
  let size = 10;

  for (const it of ordered) {
    if (text === '') {
      text = it.text;
      left = it.x;
      right = it.end;
      size = it.size;
      continue;
    }
    const gap = it.x - right;
    if (gap <= size * WORD_GAP_EM) {
      // pdf.js emits its own explicit space items; joining with a single space
      // regardless keeps "12" + " " + "%" from becoming "12  %".
      text = `${text.trimEnd()} ${it.text.trimStart()}`;
      right = Math.max(right, it.end);
      size = Math.max(size, it.size);
    } else {
      cells.push({ text: text.trim(), x: left, size });
      text = it.text;
      left = it.x;
      right = it.end;
      size = it.size;
    }
  }
  if (text.trim()) cells.push({ text: text.trim(), x: left, size });
  return cells.filter((c) => c.text.length > 0);
}

/**
 * Snaps ragged rows onto one column model for the page.
 *
 * The columns come from clustering every cell's left edge, so a row missing its
 * middle value lands a blank in the right place instead of shifting everything left —
 * the failure mode that makes naive extractors useless on any table with empty cells.
 */
function squareOff(rows: Cell[][]): CellValue[][] {
  const tolerance = columnTolerance(rows);
  const edges = rows.flatMap((r) => r.map((c) => c.x)).sort((a, b) => a - b);
  const clustered: number[] = [];
  for (const edge of edges) {
    const last = clustered[clustered.length - 1];
    if (last === undefined || edge - last > tolerance) clustered.push(edge);
  }
  const columns = mergeNonCooccurring(clustered, rows);

  return rows.map((row) => {
    const out: CellValue[] = new Array(columns.length).fill(null);
    for (const cell of row) {
      const idx = nearestColumn(columns, cell.x);
      const existing = out[idx];
      // Two cells snapping to one column means the column model is coarser than
      // this row — joining beats dropping the second value on the floor.
      out[idx] = existing === null || existing === undefined ? typed(cell.text) : `${existing} ${cell.text}`;
    }
    return out;
  });
}

/**
 * Collapses adjacent column candidates that no single row ever uses together.
 *
 * Left-edge clustering alone assumes every column is left-aligned at a fixed x. Real
 * tables break that constantly: a right-aligned figures column starts wherever the
 * number happens to end, and a column whose left neighbour varies in width drifts
 * row by row. Both produce a fan of near-but-not-equal left edges that clustering
 * reads as several columns — one per row — which is how a clean two-column table
 * ends up three columns wide with a diagonal of nulls through it.
 *
 * Two genuinely different columns appear in the same row somewhere; that is what
 * makes them different columns. Two candidates that never co-occur are the same
 * column seen at different offsets, so they merge. The pass repeats because merging
 * can expose a new adjacent pair.
 */
function mergeNonCooccurring(columns: number[], rows: Cell[][]): number[] {
  let current = columns;
  for (let pass = 0; pass < columns.length; pass++) {
    const occupancy = rows.map((row) => new Set(row.map((c) => nearestColumn(current, c.x))));
    let merged: number[] | null = null;
    for (let i = 0; i < current.length - 1; i++) {
      const together = occupancy.some((row) => row.has(i) && row.has(i + 1));
      if (together) continue;
      // Keep the leftmost edge: a merged column starts where its earliest member did.
      merged = [...current.slice(0, i), current[i] as number, ...current.slice(i + 2)];
      break;
    }
    if (!merged) break;
    current = merged;
  }
  return current;
}

/**
 * Column tolerance in points, from the run's median font size — a 6pt footnote
 * table and a 14pt summary table have gutters of very different absolute widths,
 * and a fixed pixel tolerance would over-merge one and split the other.
 */
function columnTolerance(rows: Cell[][]): number {
  const sizes = rows.flatMap((r) => r.map((c) => c.size)).sort((a, b) => a - b);
  const mid = sizes[Math.floor(sizes.length / 2)] ?? 10;
  return mid * COLUMN_TOLERANCE_EM;
}

function nearestColumn(columns: number[], x: number): number {
  let best = 0;
  let bestDist = Infinity;
  for (const [i, c] of columns.entries()) {
    const d = Math.abs(c - x);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  }
  return best;
}

/**
 * Numeric-looking cells become real numbers so Excel can sum them — the whole point
 * of converting to a spreadsheet rather than to text.
 *
 * Deliberately conservative: only plain integers/decimals with optional thousands
 * separators, sign and trailing percent. Currency symbols, dates and codes stay
 * strings, because guessing wrong there silently corrupts data (a part number like
 * "0012" must not become 12, and "3/4" must not become a date).
 */
function typed(text: string): CellValue {
  const t = text.trim();
  if (!/^[-+]?(\d{1,3}(,\d{3})+|\d+)(\.\d+)?%?$/.test(t)) return text;
  if (/^[-+]?0\d/.test(t)) return text; // leading zero — an identifier, not a quantity
  const isPercent = t.endsWith('%');
  const n = Number(t.replace(/[,%]/g, ''));
  if (!Number.isFinite(n)) return text;
  return isPercent ? n / 100 : n;
}

/** "Page 3" for a multi-page document, the filename for a single-page one. */
function pageSheetName(file: string, page: number, total: number): string {
  // 31 chars is Excel's own hard limit; SheetJS would silently truncate anyway.
  return (total > 1 ? `Page ${page}` : baseName(file)).slice(0, 31);
}

function baseName(name: string): string {
  return name.replace(/\.[^./\\]+$/, '').slice(0, 31) || 'Sheet1';
}
