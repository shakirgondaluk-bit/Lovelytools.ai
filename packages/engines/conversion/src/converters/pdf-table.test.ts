// lovelytools.ai — PDF page → grid, driven by hand-placed glyph coordinates.
//
// extractPage() is the part of pdf-to-excel with all the judgement in it, and it is
// a pure function of pdf.js text items — so these cases are the real geometry, not a
// mock of it. Each case builds the item list a PDF text layer would emit for a known
// layout and asserts the grid that comes back.
import { extractPage, type RawItem } from './pdf-table';

const SIZE = 10;
const LINE = 20; // baseline pitch used by these fixtures; wide gaps are multiples
const failures: string[] = [];

/** One text run at (x, y), sized like 10pt body text. Width tracks the string so
 *  the word-gap rule sees realistic right edges. */
function at(x: number, y: number, str: string, size = SIZE): RawItem {
  return {
    str,
    transform: [size, 0, 0, size, x, y],
    width: str.length * size * 0.5,
    height: size,
  };
}

function check(name: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) failures.push(`${name}\n      expected ${e}\n      actual   ${a}`);
}

/* 1 · A plain three-column table: header + two data rows, all columns present. */
{
  const items = [
    at(50, 700, 'Item'), at(200, 700, 'Qty'), at(300, 700, 'Price'),
    at(50, 680, 'Widget'), at(200, 680, '12'), at(300, 680, '9.99'),
    at(50, 660, 'Gadget'), at(200, 660, '3'), at(300, 660, '24.50'),
  ];
  check('plain 3-column table', extractPage(items), [
    ['Item', 'Qty', 'Price'],
    ['Widget', 12, 9.99],
    ['Gadget', 3, 24.5],
  ]);
}

/* 2 · The case naive extractors get wrong: a row with a missing middle value must
 *     leave a hole, not shift the remaining cells left. */
{
  const items = [
    at(50, 700, 'Item'), at(200, 700, 'Qty'), at(300, 700, 'Price'),
    at(50, 680, 'Widget'), at(300, 680, '9.99'),
    at(50, 660, 'Gadget'), at(200, 660, '3'), at(300, 660, '24.50'),
  ];
  check('missing middle cell → blank in place', extractPage(items)[1], ['Widget', null, 9.99]);
}

/* 3 · Multi-word cells: a word space must not split a cell, but a column gutter must.
 *     "Blue Widget" is one cell; the gap to "12" is a gutter. */
{
  const items = [
    at(50, 700, 'Name'), at(200, 700, 'Qty'),
    at(50, 680, 'Blue'), at(74, 680, 'Widget'), at(200, 680, '12'),
  ];
  check('word space keeps one cell', extractPage(items)[1], ['Blue Widget', 12]);
}

/* 4 · Prose still converts. Running text has no columns to find, so it comes back as
 *     one cell per line — in reading order, never dropped, never an error. */
{
  const items = [
    at(50, 700, 'This is a paragraph of ordinary running text that happens'),
    at(50, 686, 'to span two lines and contains no tabular structure at all.'),
  ];
  check('prose → one column, in order', extractPage(items), [
    ['This is a paragraph of ordinary running text that happens'],
    ['to span two lines and contains no tabular structure at all.'],
  ]);
}

/* 5 · Typing is conservative. Quantities become numbers so Excel can sum them;
 *     identifiers, currency and dates stay strings so nothing is silently corrupted. */
{
  const items = [
    at(50, 700, 'A'), at(200, 700, 'B'),
    at(50, 680, '0012'), at(200, 680, '1,234.5'),
    at(50, 660, '£13.99'), at(200, 660, '3/4'),
    at(50, 640, '-42'), at(200, 640, '15%'),
  ];
  const grid = extractPage(items);
  check('leading zero stays a string', grid[1]?.[0], '0012');
  check('thousands separator parses', grid[1]?.[1], 1234.5);
  check('currency stays a string', grid[2]?.[0], '£13.99');
  check('fraction stays a string', grid[2]?.[1], '3/4');
  check('negative parses', grid[3]?.[0], -42);
  check('percent becomes a ratio', grid[3]?.[1], 0.15);
}

/* 6 · A title, a table and a footnote on one page. The point of the page-grid
 *     approach: the surrounding prose keeps its place in reading order instead of
 *     being exiled to a separate sheet, and the table below it still lines up. */
{
  const items = [
    at(50, 740, 'Quarterly summary'),
    at(50, 700, 'Region'), at(300, 700, 'Revenue'),
    at(50, 680, 'North'), at(300, 680, '1,204'),
    at(50, 660, 'South'), at(300, 660, '812'),
    at(50, 620, 'Figures in GBP.'),
  ];
  check('title + table + note keep reading order', extractPage(items), [
    ['Quarterly summary', null],
    [null, null],                       // blank row for the gap under the title
    ['Region', 'Revenue'],
    ['North', 1204],
    ['South', 812],
    [null, null],                       // blank row before the footnote
    ['Figures in GBP.', null],
  ]);
}

/* 7 · Rows survive slight baseline drift (sub/superscripts, rounding in the matrix)
 *     without splitting into separate rows. */
{
  const items = [
    at(50, 700, 'Item'), at(200, 700.4, 'Qty'),
    at(50, 680, 'Widget'), at(200, 679.6, '12'),
  ];
  check('baseline drift stays one row', extractPage(items), [
    ['Item', 'Qty'],
    ['Widget', 12],
  ]);
}

/* 8 · The tight case that pins WORD_GAP_EM. Elsewhere the gutters are generous, so
 *     almost any threshold passes. Here a word space (2pt) and a column gutter (10pt)
 *     are only 8pt apart — the split has to land between them or the row collapses to
 *     one cell / explodes into three. */
{
  // "Net" ends at 65, "profit" starts at 67 (2pt word space) and ends at 97;
  // the figures column starts at 107, so the tightest gutter on the page is 10pt.
  const items = [
    at(50, 700, 'Gross'), at(107, 700, '980'),
    at(50, 680, 'Net'), at(67, 680, 'profit'), at(107, 680, '1,240'),
  ];
  check('tight gutter → 2 cells per row', extractPage(items), [
    ['Gross', 980],
    ['Net profit', 1240],
  ]);
}

/* 9 · Right-aligned figures — how every financial table on earth sets its numbers.
 *     The left edges fan out by digit count (a 9-char figure starts 30pt left of a
 *     3-char one), so left-edge clustering alone reads them as separate columns.
 *     They must still come back as one. */
{
  const right = (edge: number, y: number, str: string) => at(edge - str.length * 5, y, str);
  const items = [
    at(50, 700, 'Revenue'), right(400, 700, '1,204,880'),
    at(50, 680, 'Costs'), right(400, 680, '812'),
    at(50, 660, 'Profit'), right(400, 660, '48,120'),
  ];
  check('right-aligned figures → one column', extractPage(items), [
    ['Revenue', 1204880],
    ['Costs', 812],
    ['Profit', 48120],
  ]);
}

/* 10 · Vertical rhythm: once the page has established a line pitch, a gap much larger
 *      than it becomes exactly one blank row, however large — structure, not
 *      whitespace to scale. */
{
  const items = [
    at(50, 700, 'Line one'),
    at(50, 700 - LINE, 'Line two'),
    at(50, 700 - LINE * 8, 'Far below'),
  ];
  check('one blank row per gap, regardless of size', extractPage(items), [
    ['Line one'],
    ['Line two'],
    [null],
    ['Far below'],
  ]);
}

/* 11 · An empty page yields an empty sheet rather than throwing — scanned pages with
 *      no text layer are common in the middle of otherwise-fine documents. */
{
  check('no text → empty grid', extractPage([]), []);
}

/* ---------------- report ---------------- */

console.log('pdf → page grid: 11 layout cases');

if (failures.length) {
  console.error(`\n${failures.length} extraction failure(s):`);
  for (const f of failures) console.error(`  ✕ ${f}`);
  process.exit(1);
}

console.log('✓ pdf pages rebuild as aligned grids from glyph coordinates');
