// Asserts the text engine and the registry agree, and that every definition's
// CI vectors compute string-exact. Same contract as the other engines'
// coverage tests: every tool on this engine must have a working definition or
// an explicit "not implemented" reason — silence is what produced 26 pages
// with no engine behind them at all.
import { TOOLS } from '@lovelytools/registry';
import { allTextOps, getTextOp, runVectors } from './registry';

const failures: string[] = [];

const engineSlugs = TOOLS.filter((t) => t.engine === 'text').map((t) => t.slug).sort();

// 1 · Every text-engine tool is accounted for — defined (none are declared
//    unimplemented; the engine has no capability gap for any of the 26).
for (const slug of engineSlugs) {
  if (!getTextOp(slug)) {
    failures.push(`registry tool "${slug}" has engine=text but no definition`);
  }
}

// 2 · Nothing is defined that isn't a real registry tool.
for (const def of allTextOps()) {
  if (!TOOLS.some((t) => t.slug === def.slug)) {
    failures.push(`"${def.slug}" is defined but is not a tool in the registry`);
  }
}

// 3 · Every definition ships vectors, and every vector computes exactly.
for (const def of allTextOps()) {
  if (!def.vectors || def.vectors.length === 0) failures.push(`"${def.slug}" has no CI vectors`);
}
const vectors = runVectors();
for (const v of vectors) {
  if (!v.pass) failures.push(`vector failed for "${v.slug}": got ${JSON.stringify(v.got)}, want ${JSON.stringify(v.want)}`);
}

console.log(
  `text engine coverage: ${engineSlugs.length} registry tools · ${allTextOps().length} defined · ${vectors.length} vectors run`,
);

if (failures.length) {
  console.error(`\n${failures.length} coverage failure(s):`);
  for (const f of failures) console.error(`  ✕ ${f}`);
  process.exit(1);
}
console.log('✓ every text-engine tool computes, and every vector is exact');
