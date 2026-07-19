// Asserts the conversion engine and the registry agree, in both directions, and
// that every bound tool's route actually resolves through planRoute(). That last
// check is the one that would have caught pdf-to-excel before it shipped: the
// registry can claim any FormatId pair, but only planRoute() knows whether the IR
// graph actually connects them.
import { TOOLS } from '@lovelytools/registry';
import { CONVERSION_NOT_IMPLEMENTED, CONVERSION_TOOLS } from './registry';
import { planRoute } from './routes';

const failures: string[] = [];

const registrySlugs = TOOLS.filter((t) => t.engine === 'conversion').map((t) => t.slug).sort();
const bound = Object.keys(CONVERSION_TOOLS);
const declared = Object.keys(CONVERSION_NOT_IMPLEMENTED);

// 1 · Every registry tool on this engine is accounted for — bound or declared.
for (const slug of registrySlugs) {
  const isBound = slug in CONVERSION_TOOLS;
  const isDeclared = slug in CONVERSION_NOT_IMPLEMENTED;
  if (!isBound && !isDeclared) {
    failures.push(`registry tool "${slug}" has engine=conversion but is neither bound nor declared unimplemented`);
  }
  if (isBound && isDeclared) {
    failures.push(`"${slug}" is both bound and declared unimplemented — pick one`);
  }
}

// 2 · Nothing is bound or declared that isn't a real conversion-engine tool.
for (const slug of [...bound, ...declared]) {
  const tool = TOOLS.find((t) => t.slug === slug);
  if (!tool) failures.push(`"${slug}" is not a tool in the registry`);
  else if (tool.engine !== 'conversion') {
    failures.push(`"${slug}" is mapped here but the registry says engine=${tool.engine}`);
  }
}

// 3 · Every bound tool's target format is actually producible, and — this is the
//    check that matters — SOME source format actually routes to it. A binding that
//    only declares `to` is silently trusting that some caller's detected `from` will
//    connect; this proves at least one plausible source does.
const ALL_FROM: Array<import('./types').FormatId> = [
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'html', 'csv', 'xml', 'json',
];
for (const [slug, binding] of Object.entries(CONVERSION_TOOLS)) {
  const reachable = ALL_FROM.some((from) => from !== binding.to && planRoute(from, binding.to) !== null);
  if (!reachable) {
    failures.push(`"${slug}" targets "${binding.to}", but no source format has a route to it`);
  }
}

console.log(
  `conversion engine coverage: ${registrySlugs.length} registry tools · ${bound.length} wired · ${declared.length} declared unimplemented`,
);

if (failures.length) {
  console.error(`\n${failures.length} coverage failure(s):`);
  for (const f of failures) console.error(`  ✕ ${f}`);
  process.exit(1);
}

console.log('✓ every conversion-engine tool is either wired up or explicitly declared unbuilt');
