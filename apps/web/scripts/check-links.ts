// lovelytools.ai — internal link checker.
//
// The registry validator proves the *catalog's* link graph is sound. It says nothing
// about hrefs hardcoded in components, and that is where the rot was: the header,
// footer and mega-nav shipped 14 links to routes that never existed — including
// /tools, the homepage's primary call to action. Every one rendered fine, typechecked
// fine, and 404'd on click.
//
// So: gather every literal internal href in the source, gather every route the app
// can actually serve, and fail on the difference.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { allSlugs, RESERVED_SLUGS } from '@lovelytools/registry';

const ROOT = resolve(import.meta.dirname, '../..' , '..');
const APP_DIR = join(ROOT, 'apps/web/app');

const SOURCE_DIRS = [
  join(ROOT, 'apps/web/app'),
  join(ROOT, 'apps/web/components'),
  join(ROOT, 'packages/ui/src'),
];

const walk = (dir: string): string[] => {
  try {
    return readdirSync(dir).flatMap((entry) => {
      const path = join(dir, entry);
      if (entry === 'node_modules' || entry === '.next') return [];
      return statSync(path).isDirectory() ? walk(path) : [path];
    });
  } catch {
    return [];
  }
};

// ── Routes the app can serve ─────────────────────────────────────────────────

const routes = new Set<string>(['/']);

// Static routes: every app/<segment>/page.tsx that isn't dynamic.
for (const entry of readdirSync(APP_DIR)) {
  if (entry.startsWith('[') || entry.startsWith('(') || entry.startsWith('_')) continue;
  const path = join(APP_DIR, entry);
  if (!statSync(path).isDirectory()) continue;
  try {
    statSync(join(path, 'page.tsx'));
    routes.add(`/${entry}`);
  } catch {
    /* not a route directory */
  }
}

// Dynamic routes: everything the registry pre-renders through app/[slug].
for (const { slug } of allSlugs()) routes.add(`/${slug}`);

// ── Links the source claims ──────────────────────────────────────────────────

const HREF = /href=(?:"(\/[^"#?]*)"|\{`(\/[^`$]*)`\})/g;

interface Found {
  href: string;
  file: string;
  line: number;
}

const found: Found[] = [];

for (const dir of SOURCE_DIRS) {
  for (const file of walk(dir)) {
    if (!/\.tsx?$/.test(file)) continue;
    if (file.endsWith('check-links.ts')) continue;

    const lines = readFileSync(file, 'utf8').split('\n');
    lines.forEach((text, i) => {
      for (const match of text.matchAll(HREF)) {
        const href = (match[1] ?? match[2])!.replace(/\/$/, '') || '/';
        found.push({ href, file: file.replace(ROOT + '\\', '').replace(/\\/g, '/'), line: i + 1 });
      }
    });
  }
}

// ── Report ───────────────────────────────────────────────────────────────────

const broken = found.filter((f) => !routes.has(f.href));

console.log('lovelytools link-check');
console.log(`  ${routes.size} routes · ${found.length} literal internal links in source`);

if (broken.length) {
  console.error(`\n${broken.length} link(s) point at routes that do not exist:`);
  for (const b of broken) {
    const reserved = (RESERVED_SLUGS as readonly string[]).includes(b.href.slice(1));
    const hint = reserved ? ' (reserved slug — the page is not built yet)' : '';
    console.error(`  ✕ ${b.href}${hint}\n      ${b.file}:${b.line}`);
  }
  console.error('\nBuild the page, or stop linking to it. A link to a 404 is a bug.');
  process.exit(1);
}

console.log('\n✓ every internal link resolves');
