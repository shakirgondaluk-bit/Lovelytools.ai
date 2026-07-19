// Asserts the calculator engine and the registry agree, and that every
// definition's CI vectors compute string-exact. Same contract as the other
// engines' coverage tests: every tool on this engine must have a working
// definition or an explicit "not implemented" reason — silence is what
// produced 59 pages saying "not wired up".
import { TOOLS } from '@lovelytools/registry';
import { allCalculators, CALCULATOR_NOT_IMPLEMENTED, getCalculator, runVectors } from './registry';

const failures: string[] = [];

const engineSlugs = TOOLS.filter((t) => t.engine === 'calculator').map((t) => t.slug).sort();

// 1 · Every calculator-engine tool is accounted for — defined or declared.
for (const slug of engineSlugs) {
  const isDefined = !!getCalculator(slug);
  const isDeclared = slug in CALCULATOR_NOT_IMPLEMENTED;
  if (!isDefined && !isDeclared) {
    failures.push(`registry tool "${slug}" has engine=calculator but is neither defined nor declared unimplemented`);
  }
  if (isDefined && isDeclared) {
    failures.push(`"${slug}" is both defined and declared unimplemented — pick one`);
  }
}

// 2 · Nothing is defined or declared that isn't a real registry tool.
//    'unit-converter' is the one allowed orphan: the generic dimension
//    machinery the per-slug converters are built on; it powers no page.
const ALLOWED_ORPHANS = new Set(['unit-converter']);
for (const def of allCalculators()) {
  const tool = TOOLS.find((t) => t.slug === def.slug);
  if (!tool && !ALLOWED_ORPHANS.has(def.slug)) {
    failures.push(`"${def.slug}" is defined but is not a tool in the registry`);
  }
}
for (const slug of Object.keys(CALCULATOR_NOT_IMPLEMENTED)) {
  if (!TOOLS.some((t) => t.slug === slug)) {
    failures.push(`"${slug}" is declared unimplemented but is not a tool in the registry`);
  }
}

// 3 · Every definition ships vectors, and every vector computes exactly.
for (const def of allCalculators()) {
  if (def.vectors.length === 0) failures.push(`"${def.slug}" has no CI vectors`);
}
const vectors = runVectors();
for (const v of vectors) {
  if (!v.pass) failures.push(`vector failed for "${v.slug}": got ${v.got}, want ${v.want}`);
}

const defined = engineSlugs.filter((s) => getCalculator(s)).length;
const declared = Object.keys(CALCULATOR_NOT_IMPLEMENTED).length;
console.log(
  `calculator engine coverage: ${engineSlugs.length} registry tools · ${defined} defined · ${declared} declared unimplemented · ${vectors.length} vectors run`,
);

if (failures.length) {
  console.error(`\n${failures.length} coverage failure(s):`);
  for (const f of failures) console.error(`  ✕ ${f}`);
  process.exit(1);
}
console.log('✓ every calculator-engine tool computes (or says why not), and every vector is exact');
