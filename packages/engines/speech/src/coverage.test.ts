// Asserts the speech engine and the registry agree, in both directions.
// See audio/src/coverage.test.ts — same contract, same reason.
import { TOOLS } from '@lovelytools/registry';
import { SPEECH_TOOLS } from './registry';
import { SPEECH_CAPABILITIES } from './types';

const failures: string[] = [];

const registrySlugs = TOOLS.filter((t) => t.engine === 'speech').map((t) => t.slug).sort();
const boundSlugs = Object.keys(SPEECH_TOOLS).sort();

for (const slug of registrySlugs) {
  if (!SPEECH_TOOLS[slug]) {
    failures.push(`registry tool "${slug}" has engine=speech but no capability binding`);
  }
}

for (const slug of boundSlugs) {
  const tool = TOOLS.find((t) => t.slug === slug);
  if (!tool) failures.push(`binding "${slug}" is not a tool in the registry`);
  else if (tool.engine !== 'speech') {
    failures.push(`binding "${slug}" is bound here but the registry says engine=${tool.engine}`);
  }
}

for (const [slug, binding] of Object.entries(SPEECH_TOOLS)) {
  if (!SPEECH_CAPABILITIES.includes(binding.capability)) {
    failures.push(`"${slug}" binds unimplemented capability "${binding.capability}"`);
  }
}

for (const capability of SPEECH_CAPABILITIES) {
  const used = Object.values(SPEECH_TOOLS).some((b) => b.capability === capability);
  if (!used) failures.push(`capability "${capability}" is implemented but no tool uses it`);
}

console.log(
  `speech engine coverage: ${registrySlugs.length} registry tools · ${boundSlugs.length} bindings · ${SPEECH_CAPABILITIES.length} capabilities`,
);

if (failures.length) {
  console.error(`\n${failures.length} coverage failure(s):`);
  for (const f of failures) console.error(`  ✕ ${f}`);
  process.exit(1);
}
console.log('✓ speech engine covers the registry exactly');
