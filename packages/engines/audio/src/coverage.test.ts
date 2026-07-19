// Asserts the audio engine and the registry agree, in both directions.
// See video/src/coverage.test.ts — same contract, same reason.
import { TOOLS } from '@lovelytools/registry';
import { AUDIO_TOOLS } from './registry';
import { AUDIO_CAPABILITIES } from './types';

const failures: string[] = [];

const registrySlugs = TOOLS.filter((t) => t.engine === 'audio').map((t) => t.slug).sort();
const boundSlugs = Object.keys(AUDIO_TOOLS).sort();

for (const slug of registrySlugs) {
  if (!AUDIO_TOOLS[slug]) {
    failures.push(`registry tool "${slug}" has engine=audio but no capability binding`);
  }
}

for (const slug of boundSlugs) {
  const tool = TOOLS.find((t) => t.slug === slug);
  if (!tool) failures.push(`binding "${slug}" is not a tool in the registry`);
  else if (tool.engine !== 'audio') {
    failures.push(`binding "${slug}" is bound here but the registry says engine=${tool.engine}`);
  }
}

for (const [slug, binding] of Object.entries(AUDIO_TOOLS)) {
  if (!AUDIO_CAPABILITIES.includes(binding.capability)) {
    failures.push(`"${slug}" binds unimplemented capability "${binding.capability}"`);
  }
}

for (const capability of AUDIO_CAPABILITIES) {
  const used = Object.values(AUDIO_TOOLS).some((b) => b.capability === capability);
  if (!used) failures.push(`capability "${capability}" is implemented but no tool uses it`);
}

console.log(
  `audio engine coverage: ${registrySlugs.length} registry tools · ${boundSlugs.length} bindings · ${AUDIO_CAPABILITIES.length} capabilities`,
);

if (failures.length) {
  console.error(`\n${failures.length} coverage failure(s):`);
  for (const f of failures) console.error(`  ✕ ${f}`);
  process.exit(1);
}
console.log('✓ audio engine covers the registry exactly');
