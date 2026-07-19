// lovelytools.ai — route planner. A conversion is legal iff some IR has the
// source among its producers and the target among its consumers. The UI's
// target dropdowns and the marketing support matrix derive from this graph —
// nothing is hand-maintained.
import type { Fidelity, FormatId } from './types';
import type { IRKind } from './ir';

interface Edge {
  fidelity: Fidelity;
  warning?: string;
}

type EdgeMap = Partial<Record<FormatId, Edge>>;

interface IRNode {
  ir: IRKind;
  producers: EdgeMap; // format → IR
  consumers: EdgeMap; // IR → format
}

const GRAPH: IRNode[] = [
  {
    ir: 'doc',
    producers: {
      docx: { fidelity: 'high' },
      html: { fidelity: 'high' },
      txt: { fidelity: 'high' },
      pdf: { fidelity: 'text-only', warning: 'PDF layout is not preserved — text and structure are extracted.' },
      doc: { fidelity: 'text-only', warning: 'Legacy .doc: text extracted; images and styling dropped.' },
      ppt: { fidelity: 'text-only', warning: 'Legacy .ppt: slide text extracted as an outline.' },
      pptx: { fidelity: 'good', warning: 'Slides flatten to a heading-per-slide outline.' },
    },
    consumers: {
      pdf: { fidelity: 'good' },
      docx: { fidelity: 'good' },
      html: { fidelity: 'high' },
      txt: { fidelity: 'high' },
      pptx: { fidelity: 'good', warning: 'Headings become slides; long paragraphs are summarized as bullets.' },
    },
  },
  {
    ir: 'table',
    producers: {
      xlsx: { fidelity: 'high' },
      xls: { fidelity: 'high' },
      csv: { fidelity: 'high' },
      json: { fidelity: 'good', warning: 'Arrays of objects map to rows; nested objects are flattened with dot-paths.' },
      xml: { fidelity: 'good', warning: 'Repeated elements map to rows; deep nesting is flattened.' },
      html: { fidelity: 'good', warning: 'Only <table> elements are read.' },
      txt: { fidelity: 'good', warning: 'Parsed as tab/comma-delimited text.' },
    },
    consumers: {
      xlsx: { fidelity: 'high' },
      csv: { fidelity: 'high', warning: 'Only the first sheet exports; formulas become values.' },
      json: { fidelity: 'high' },
      xml: { fidelity: 'high' },
      html: { fidelity: 'high' },
      txt: { fidelity: 'good' },
      pdf: { fidelity: 'good' },
      docx: { fidelity: 'good' },
    },
  },
  {
    ir: 'data',
    producers: {
      json: { fidelity: 'high' },
      xml: { fidelity: 'good', warning: 'Attributes become "@attr" keys; text nodes become "#text".' },
      csv: { fidelity: 'high' },
    },
    consumers: {
      json: { fidelity: 'high' },
      xml: { fidelity: 'high' },
      csv: { fidelity: 'good', warning: 'Non-tabular values flatten to key/value rows.' },
    },
  },
];

export interface Route {
  from: FormatId;
  to: FormatId;
  ir: IRKind;
  fidelity: Fidelity;
  warnings: string[];
}

// A rank map, not an array + indexOf round-trip: looking a Fidelity back up by a
// *computed* numeric index is exactly what noUncheckedIndexedAccess doesn't trust,
// because it can't see that Math.max of two indexOf() results on a 3-item array is
// always 0–2. Indexing by the union key itself carries no such doubt.
const RANK: Record<Fidelity, number> = { high: 0, good: 1, 'text-only': 2 };
const FROM_RANK: Fidelity[] = ['high', 'good', 'text-only'];

const worst = (a: Fidelity, b: Fidelity): Fidelity => {
  const idx = Math.max(RANK[a], RANK[b]);
  // idx is provably 0–2 (RANK only ever holds 0, 1 or 2), but FROM_RANK is still a
  // plain array to TS, so the lookup is asserted rather than left to complain about
  // a case that cannot occur.
  return FROM_RANK[idx] as Fidelity;
};

/** Best route (highest fidelity) or null. Same-format is deliberately illegal. */
export function planRoute(from: FormatId, to: FormatId): Route | null {
  if (from === to) return null;
  let best: Route | null = null;
  for (const node of GRAPH) {
    const p = node.producers[from];
    const c = node.consumers[to];
    if (!p || !c) continue;
    const route: Route = {
      from,
      to,
      ir: node.ir,
      fidelity: worst(p.fidelity, c.fidelity),
      warnings: [p.warning, c.warning].filter((w): w is string => !!w),
    };
    if (!best || betterThan(route.fidelity, best.fidelity)) best = route;
  }
  return best;
}

function betterThan(a: Fidelity, b: Fidelity): boolean {
  return RANK[a] < RANK[b];
}

/** All legal targets for a source, best-fidelity first — drives the UI dropdown. */
export function targetsFor(from: FormatId): Route[] {
  const all: FormatId[] = ['pdf', 'docx', 'xlsx', 'pptx', 'txt', 'html', 'csv', 'xml', 'json'];
  return all
    .map((to) => planRoute(from, to))
    .filter((r): r is Route => r !== null)
    .sort((a, b) => (betterThan(a.fidelity, b.fidelity) ? -1 : 1));
}

/** When someone asks for a legacy target, offer the modern equivalent. */
export function suggestModern(to: FormatId): FormatId | null {
  return ({ doc: 'docx', xls: 'xlsx', ppt: 'pptx' } as Partial<Record<FormatId, FormatId>>)[to] ?? null;
}
