// lovelytools.ai — registry public API (RFC-001 §1: ★ single source of truth).
//
// Everything downstream reads from here: routes, nav, search, sitemaps, SEO.
// Counts are DERIVED — never stored — so a marketing number can never drift from
// the catalog it describes.
import { CATEGORIES } from './categories';
import { COLLECTIONS } from './collections';
import { TOOLS } from './tools';
import type { Category, CategoryId, Collection, EngineId, ToolDefinition } from './types';

export * from './types';
export { CATEGORIES } from './categories';
export { COLLECTIONS } from './collections';
export { TOOLS } from './tools';

// ── Indexes ───────────────────────────────────────────────────────────────────
// Built once at module load. The catalog is static, so lookups are O(1) forever.

const toolBySlug = new Map<string, ToolDefinition>(TOOLS.map((t) => [t.slug, t]));
const categoryById = new Map<CategoryId, Category>(CATEGORIES.map((c) => [c.id, c]));
const collectionBySlug = new Map<string, Collection>(COLLECTIONS.map((c) => [c.slug, c]));

// A category's grid holds its own tools plus any cross-listed via `alsoIn`.
// TOTAL_TOOLS stays TOOLS.length — cross-listing never double-counts the catalog.
const toolsByCategoryId = new Map<CategoryId, ToolDefinition[]>(
  CATEGORIES.map((c) => [
    c.id,
    TOOLS.filter((t) => t.category === c.id || t.alsoIn?.includes(c.id)),
  ]),
);

// ── Tools ─────────────────────────────────────────────────────────────────────

export const getTool = (slug: string): ToolDefinition | undefined => toolBySlug.get(slug);

export const toolsInCategory = (id: CategoryId): ToolDefinition[] => toolsByCategoryId.get(id) ?? [];

export const toolsForEngine = (engine: EngineId): ToolDefinition[] =>
  TOOLS.filter((t) => t.engine === engine);

/** Resolved `related` edges, skipping anything unknown (validator keeps this empty). */
export const relatedTools = (slug: string): ToolDefinition[] => {
  const tool = toolBySlug.get(slug);
  if (!tool) return [];
  return tool.related.map((s) => toolBySlug.get(s)).filter((t): t is ToolDefinition => !!t);
};

// ── Categories ────────────────────────────────────────────────────────────────

export const getCategory = (id: CategoryId): Category | undefined => categoryById.get(id);

export const categoryByPath = (path: string): Category | undefined =>
  CATEGORIES.find((c) => c.path === path || c.path === `/${path}`);

/** The count is computed from the catalog — the only number we can honestly show. */
export const categoryToolCount = (id: CategoryId): number => toolsInCategory(id).length;

export const categoriesWithCounts = (): Array<Category & { toolCount: number }> =>
  CATEGORIES.map((c) => ({ ...c, toolCount: categoryToolCount(c.id) }));

// ── Collections ───────────────────────────────────────────────────────────────

export const getCollection = (slug: string): Collection | undefined => collectionBySlug.get(slug);

export const collectionTools = (slug: string): ToolDefinition[] => {
  const collection = collectionBySlug.get(slug);
  if (!collection) return [];
  return collection.tools.map((s) => toolBySlug.get(s)).filter((t): t is ToolDefinition => !!t);
};

// ── Counts ────────────────────────────────────────────────────────────────────

export const TOTAL_TOOLS = TOOLS.length;
export const TOTAL_CATEGORIES = CATEGORIES.length;

// ── Routing (RFC-001 §2 — one flat namespace) ─────────────────────────────────

export type SlugKind = 'tool' | 'category' | 'collection';

/** Resolves a root slug to the template that should render it. */
export const resolveSlug = (
  slug: string,
): { kind: SlugKind; tool: ToolDefinition } | { kind: SlugKind; category: Category } | { kind: SlugKind; collection: Collection } | undefined => {
  const tool = toolBySlug.get(slug);
  if (tool) return { kind: 'tool', tool };

  const category = CATEGORIES.find((c) => c.path === `/${slug}`);
  if (category) return { kind: 'category', category };

  const collection = collectionBySlug.get(slug);
  if (collection) return { kind: 'collection', collection };

  return undefined;
};

/** Every statically rendered root slug — feeds generateStaticParams and the sitemap. */
export const allSlugs = (): Array<{ slug: string; kind: SlugKind }> => [
  ...TOOLS.map((t) => ({ slug: t.slug, kind: 'tool' as const })),
  ...CATEGORIES.map((c) => ({ slug: c.path.slice(1), kind: 'category' as const })),
  ...COLLECTIONS.map((c) => ({ slug: c.slug, kind: 'collection' as const })),
];

// ── Search ────────────────────────────────────────────────────────────────────

/** Flat index for the ⌘K palette and /api/v1/search. Tiny — the catalog is 230 rows. */
export const searchIndex = TOOLS.map((t) => ({
  slug: t.slug,
  name: t.name,
  category: t.category,
  description: t.description,
  haystack: `${t.name} ${t.slug.replace(/-/g, ' ')} ${t.description}`.toLowerCase(),
}));

export const searchTools = (query: string, limit = 8): ToolDefinition[] => {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const terms = q.split(/\s+/);

  return searchIndex
    .map((entry) => {
      let score = 0;
      if (entry.name.toLowerCase() === q) score += 100;
      if (entry.slug === q) score += 100;
      if (entry.name.toLowerCase().startsWith(q)) score += 40;
      for (const term of terms) {
        if (entry.haystack.includes(term)) score += 10;
      }
      return { slug: entry.slug, score };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((r) => toolBySlug.get(r.slug)!)
    .filter(Boolean);
};
