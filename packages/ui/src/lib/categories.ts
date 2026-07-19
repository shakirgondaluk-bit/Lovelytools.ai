// lovelytools.ai — the UI's view of the catalog.
//
// This file used to hardcode its own 8 categories with its own tool counts, which
// drifted from the registry (it claimed 260 tools; the registry has 230). It is now
// a thin adapter: every value comes from @lovelytools/registry, and toolCount is
// derived from the actual tool set. There is one catalog, and it lives in the
// registry (RFC-001 §1).
import {
  categoriesWithCounts,
  COLLECTIONS,
  type Category as RegistryCategory,
  type CategoryId,
  type ToolDefinition,
} from '@lovelytools/registry';

/** Kept as an alias so component code reads naturally; ids are the category slugs. */
export type CategorySlug = CategoryId;

export interface Category {
  slug: CategorySlug;
  code: string;
  name: string;
  description: string;
  hue: string;
  hueOnLight: string;
  /** Derived from the registry — never stored. */
  toolCount: number;
  href: string;
}

const toUiCategory = (c: RegistryCategory & { toolCount: number }): Category => ({
  slug: c.id,
  code: c.code,
  name: c.name,
  description: c.description,
  hue: c.hue,
  hueOnLight: c.hueOnLight,
  toolCount: c.toolCount,
  href: c.path,
});

export const CATEGORIES: Category[] = categoriesWithCounts().map(toUiCategory);

const bySlug = new Map<CategorySlug, Category>(CATEGORIES.map((c) => [c.slug, c]));

export const categoryBySlug = (slug: CategorySlug): Category => {
  const category = bySlug.get(slug);
  if (!category) throw new Error(`Unknown category: ${slug}`);
  return category;
};

/**
 * A tool as the UI consumes it: the registry definition plus optional runtime
 * stats. Stats live in the server plane (RFC-001 §4 tool_stats) and are absent on
 * a static render — cards must degrade gracefully rather than show invented numbers.
 */
export interface Tool extends ToolDefinition {
  rating?: number;
  ratingCount?: number;
  uses?: number;
}

/** §9 solutions — audience collections, sourced from the registry. */
export const AUDIENCES = COLLECTIONS.map((c) => ({
  slug: c.slug,
  name: c.name,
  label: c.label,
  description: c.description,
  hue: c.hue,
}));
