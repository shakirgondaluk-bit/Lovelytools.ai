// Asserts the image engine and the registry agree, in both directions.
//
// Same contract as the PDF/conversion coverage tests. Every tool with
// engine === 'image' must either have a binding or an explicit "not implemented"
// reason — silence is not an option, because silence is what produced a tool
// page with a dropzone that did nothing.
import { TOOLS } from '@lovelytools/registry';
import { IMAGE_NOT_IMPLEMENTED, IMAGE_TOOLS } from './registry';

const failures: string[] = [];

const registrySlugs = TOOLS.filter((t) => t.engine === 'image').map((t) => t.slug).sort();
const bound = Object.keys(IMAGE_TOOLS);
const declared = Object.keys(IMAGE_NOT_IMPLEMENTED);

// 1 · Every registry tool on this engine is accounted for — implemented or declared.
for (const slug of registrySlugs) {
  const isBound = slug in IMAGE_TOOLS;
  const isDeclared = slug in IMAGE_NOT_IMPLEMENTED;
  if (!isBound && !isDeclared) {
    failures.push(`registry tool "${slug}" has engine=image but is neither bound nor declared unimplemented`);
  }
  if (isBound && isDeclared) {
    failures.push(`"${slug}" is both bound and declared unimplemented — pick one`);
  }
}

// 2 · Nothing is bound or declared that isn't a real image-engine tool.
for (const slug of [...bound, ...declared]) {
  const tool = TOOLS.find((t) => t.slug === slug);
  if (!tool) failures.push(`"${slug}" is not a tool in the registry`);
  else if (tool.engine !== 'image') {
    failures.push(`"${slug}" is mapped here but the registry says engine=${tool.engine}`);
  }
}

// 3 · The paste-base64 control is a single text box — there's no "queue" of
//    pasted strings the way there's a queue of dropped files.
for (const [slug, b] of Object.entries(IMAGE_TOOLS)) {
  if (b.control.kind === 'paste-base64' && b.arity !== 'single') {
    failures.push(`"${slug}" uses the paste-base64 control but declares arity=${b.arity}`);
  }
}

// 4 · image.ico bindings must actually declare sizes — an empty list would pack
//    a zero-frame .ico that no OS can read.
for (const [slug, b] of Object.entries(IMAGE_TOOLS)) {
  if (b.capability === 'image.ico' && b.options.sizes.length === 0) {
    failures.push(`"${slug}" is an image.ico binding with no sizes`);
  }
}

const implemented = registrySlugs.filter((s) => s in IMAGE_TOOLS).length;

console.log(
  `image engine coverage: ${registrySlugs.length} registry tools · ${implemented} wired · ${declared.length} declared unimplemented`,
);

if (failures.length) {
  console.error(`\n${failures.length} coverage failure(s):`);
  for (const f of failures) console.error(`  ✕ ${f}`);
  process.exit(1);
}
console.log('✓ every image-engine tool is either wired up or explicitly declared unbuilt');
