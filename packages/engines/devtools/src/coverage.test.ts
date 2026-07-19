// Asserts the devtools engine and the registry agree, and that every
// definition's CI vectors compute string-exact. Same contract as the other
// engines' coverage tests: every tool on this engine must have a working
// definition — silence is what let two ops sit dangling under the wrong
// slugs (number-base-converter, url-parser) with zero registry tools behind
// them at all.
import { TOOLS } from '@lovelytools/registry';
import { allDevOps, getDevOp, runVectors } from './registry';

const failures: string[] = [];

const engineSlugs = TOOLS.filter((t) => t.engine === 'developer').map((t) => t.slug).sort();

// 1 · Every developer-engine tool is accounted for.
for (const slug of engineSlugs) {
  if (!getDevOp(slug)) {
    failures.push(`registry tool "${slug}" has engine=developer but no definition`);
  }
}

// 2 · Nothing is defined that isn't a real registry tool.
for (const def of allDevOps()) {
  if (!TOOLS.some((t) => t.slug === def.slug)) {
    failures.push(`"${def.slug}" is defined but is not a tool in the registry`);
  }
}

// 3 · Every definition ships vectors (or is explicitly nondeterministic), and
//    every vector computes exactly.
for (const def of allDevOps()) {
  if (!def.nondeterministic && (!def.vectors || def.vectors.length === 0)) {
    failures.push(`"${def.slug}" has no CI vectors`);
  }
}
const vectors = await runVectors();
for (const v of vectors) {
  if (!v.pass) failures.push(`vector failed for "${v.slug}": got ${JSON.stringify(v.got)}, want ${JSON.stringify(v.want)}`);
}

// 4 · Nondeterministic ops still get a smoke test — must run without throwing.
for (const def of allDevOps()) {
  if (!def.nondeterministic) continue;
  try {
    const options = Object.fromEntries(def.options.map((o) => [o.id, o.default]));
    const result = await def.run('', options);
    if (!result.output) failures.push(`"${def.slug}" (nondeterministic) produced empty output on a smoke run`);
  } catch (e) {
    failures.push(`"${def.slug}" (nondeterministic) threw on a smoke run: ${(e as Error).message}`);
  }
}

console.log(
  `devtools engine coverage: ${engineSlugs.length} registry tools · ${allDevOps().length} defined · ${vectors.length} vectors run`,
);

if (failures.length) {
  console.error(`\n${failures.length} coverage failure(s):`);
  for (const f of failures) console.error(`  ✕ ${f}`);
  process.exit(1);
}
console.log('✓ every developer-engine tool computes, and every vector is exact');
