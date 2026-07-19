// lovelytools.ai — registry validator (RFC-001 §11: `registry-check` gates every PR).
//
// Catches what a type system can't: slug collisions across a flat namespace,
// reserved-slug squatting, dangling internal links, orphan pages, engine coverage
// and SEO budget overruns. Exits non-zero on any error.
//
// This is the check that would have caught `pdf-to-png → png-to-pdf` dangling.
import { CATEGORIES } from './categories';
import { COLLECTIONS } from './collections';
import { TOOLS } from './tools';
import {
  categorySchema,
  collectionSchema,
  RESERVED_SLUGS,
  toolSchema,
  type CategoryId,
} from './types';

const errors: string[] = [];
const warnings: string[] = [];

const err = (m: string) => errors.push(m);
const warn = (m: string) => warnings.push(m);

// ── 1 · Schema ────────────────────────────────────────────────────────────────

for (const tool of TOOLS) {
  const parsed = toolSchema.safeParse(tool);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      err(`tool "${tool.slug}": ${issue.path.join('.')} — ${issue.message}`);
    }
  }
}
for (const category of CATEGORIES) {
  const parsed = categorySchema.safeParse(category);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      err(`category "${category.id}": ${issue.path.join('.')} — ${issue.message}`);
    }
  }
}
for (const collection of COLLECTIONS) {
  const parsed = collectionSchema.safeParse(collection);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      err(`collection "${collection.slug}": ${issue.path.join('.')} — ${issue.message}`);
    }
  }
}

// ── 2 · Flat namespace: no slug may collide with any other (RFC-001 §2) ───────

const namespace = new Map<string, string>();
const claim = (slug: string, owner: string) => {
  const existing = namespace.get(slug);
  if (existing) err(`slug collision on "/${slug}": ${existing} vs ${owner}`);
  else namespace.set(slug, owner);
};

for (const tool of TOOLS) claim(tool.slug, `tool:${tool.slug}`);
for (const category of CATEGORIES) claim(category.path.slice(1), `category:${category.id}`);
for (const collection of COLLECTIONS) claim(collection.slug, `collection:${collection.slug}`);

for (const reserved of RESERVED_SLUGS) {
  const owner = namespace.get(reserved);
  if (owner) err(`reserved slug "/${reserved}" is claimed by ${owner}`);
}

// ── 3 · Link graph: every `related` edge must resolve (no dangling, no orphans) ──

const toolSlugs = new Set(TOOLS.map((t) => t.slug));

for (const tool of TOOLS) {
  for (const target of tool.related) {
    if (!toolSlugs.has(target)) {
      err(`dangling link: "${tool.slug}".related → "${target}" does not exist`);
    }
    if (target === tool.slug) {
      err(`self-link: "${tool.slug}".related includes itself`);
    }
  }
  if (new Set(tool.related).size !== tool.related.length) {
    err(`duplicate entries in "${tool.slug}".related`);
  }
  // Cross-listing sanity: alsoIn may not repeat the home category or itself.
  const alsoIn = tool.alsoIn ?? [];
  if (alsoIn.includes(tool.category)) {
    err(`"${tool.slug}".alsoIn repeats its own category "${tool.category}"`);
  }
  if (new Set(alsoIn).size !== alsoIn.length) {
    err(`duplicate entries in "${tool.slug}".alsoIn`);
  }
}

// Inbound links — a tool nobody links to is invisible to crawlers (RFC-001 §6).
const inbound = new Map<string, number>(TOOLS.map((t) => [t.slug, 0]));
for (const tool of TOOLS) {
  for (const target of tool.related) {
    inbound.set(target, (inbound.get(target) ?? 0) + 1);
  }
}
for (const collection of COLLECTIONS) {
  for (const target of collection.tools) {
    if (!toolSlugs.has(target)) {
      err(`dangling link: collection "${collection.slug}" → "${target}" does not exist`);
    } else {
      inbound.set(target, (inbound.get(target) ?? 0) + 1);
    }
  }
}
for (const [slug, count] of inbound) {
  if (count === 0) warn(`orphan: no tool or collection links to "${slug}"`);
}

// ── 4 · Category integrity ────────────────────────────────────────────────────

const categoryIds = new Set<CategoryId>(CATEGORIES.map((c) => c.id));
for (const tool of TOOLS) {
  if (!categoryIds.has(tool.category)) err(`tool "${tool.slug}" has unknown category "${tool.category}"`);
}
for (const category of CATEGORIES) {
  const count = TOOLS.filter((t) => t.category === category.id).length;
  if (count === 0) err(`category "${category.id}" has no tools`);
}

const hues = new Set(CATEGORIES.map((c) => c.hue));
if (hues.size !== CATEGORIES.length) err('category hues must be unique — one hue per category (DS §2)');

const codes = new Set(CATEGORIES.map((c) => c.code));
if (codes.size !== CATEGORIES.length) err('monogram codes must be unique (DS §Iconography)');

// ── 5 · Engine coverage ───────────────────────────────────────────────────────

const enginesInUse = new Set(TOOLS.map((t) => t.engine));
for (const category of CATEGORIES) {
  for (const engine of category.primaryEngines) {
    if (!enginesInUse.has(engine)) {
      warn(`category "${category.id}" lists primary engine "${engine}" that no tool uses`);
    }
  }
}

// ── 6 · SEO budgets (RFC-001 §6) ──────────────────────────────────────────────

const seoTitles = new Map<string, string>();
for (const tool of TOOLS) {
  const existing = seoTitles.get(tool.seo.title);
  if (existing) err(`duplicate SEO title on "${tool.slug}" and "${existing}"`);
  else seoTitles.set(tool.seo.title, tool.slug);
}

// These titles are complete <title> strings, brand suffix included. Next's title
// template would append the suffix a second time unless the page opts out with
// `title: { absolute }` — which is easy to forget and invisible until you read a
// rendered tab. Assert the shape the templates rely on.
const BRAND_SUFFIX = ' | lovelytools.ai';
for (const tool of TOOLS) {
  const occurrences = tool.seo.title.split(BRAND_SUFFIX).length - 1;
  if (occurrences === 0) {
    err(`"${tool.slug}" seo.title is missing the "${BRAND_SUFFIX.trim()}" suffix`);
  } else if (occurrences > 1) {
    err(`"${tool.slug}" seo.title repeats the brand suffix: ${tool.seo.title}`);
  } else if (!tool.seo.title.endsWith(BRAND_SUFFIX)) {
    err(`"${tool.slug}" seo.title must end with the brand suffix: ${tool.seo.title}`);
  }
}

// ── Report ────────────────────────────────────────────────────────────────────

const byCategory = CATEGORIES.map(
  (c) => `${c.code} ${c.name}: ${TOOLS.filter((t) => t.category === c.id).length}`,
).join(' · ');

console.log('lovelytools registry-check');
console.log(`  ${TOOLS.length} tools · ${CATEGORIES.length} categories · ${COLLECTIONS.length} collections`);
console.log(`  ${byCategory}`);
console.log(`  ${namespace.size} slugs in the flat namespace`);

if (warnings.length) {
  console.log(`\n${warnings.length} warning(s):`);
  for (const w of warnings) console.log(`  ⚠ ${w}`);
}

if (errors.length) {
  console.error(`\n${errors.length} error(s):`);
  for (const e of errors) console.error(`  ✕ ${e}`);
  process.exit(1);
}

console.log('\n✓ registry valid');
