// Asserts the video engine and the registry agree, in both directions.
//
// This is the check that would have caught the original defect: 11 video tools
// declared `engine: 'conversion'`, an engine whose format set is documents only —
// they could never have run. A tool pointing at a missing capability is a broken
// page; a capability no tool uses is dead weight. Neither survives this test.
import { TOOLS } from '@lovelytools/registry';
import { VIDEO_TOOLS } from './registry';
import { VIDEO_CAPABILITIES } from './types';

const failures: string[] = [];

const registrySlugs = TOOLS.filter((t) => t.engine === 'video').map((t) => t.slug).sort();
const boundSlugs = Object.keys(VIDEO_TOOLS).sort();

// 1 · Every registry tool on this engine has a binding.
for (const slug of registrySlugs) {
  if (!VIDEO_TOOLS[slug]) {
    failures.push(`registry tool "${slug}" has engine=video but no capability binding`);
  }
}

// 2 · Every binding corresponds to a real registry tool on this engine.
for (const slug of boundSlugs) {
  const tool = TOOLS.find((t) => t.slug === slug);
  if (!tool) failures.push(`binding "${slug}" is not a tool in the registry`);
  else if (tool.engine !== 'video') {
    failures.push(`binding "${slug}" is bound here but the registry says engine=${tool.engine}`);
  }
}

// 3 · Every bound capability is implemented.
for (const [slug, binding] of Object.entries(VIDEO_TOOLS)) {
  if (!VIDEO_CAPABILITIES.includes(binding.capability)) {
    failures.push(`"${slug}" binds unimplemented capability "${binding.capability}"`);
  }
}

// 4 · No capability is dead.
for (const capability of VIDEO_CAPABILITIES) {
  const used = Object.values(VIDEO_TOOLS).some((b) => b.capability === capability);
  if (!used) failures.push(`capability "${capability}" is implemented but no tool uses it`);
}

console.log(
  `video engine coverage: ${registrySlugs.length} registry tools · ${boundSlugs.length} bindings · ${VIDEO_CAPABILITIES.length} capabilities`,
);

if (failures.length) {
  console.error(`\n${failures.length} coverage failure(s):`);
  for (const f of failures) console.error(`  ✕ ${f}`);
  process.exit(1);
}
console.log('✓ video engine covers the registry exactly');
