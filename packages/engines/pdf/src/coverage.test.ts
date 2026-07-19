// Asserts the PDF engine and the registry agree, in both directions.
//
// Same contract as the video/audio coverage tests. Every tool with engine === 'pdf'
// must either have a binding or an explicit "not implemented" reason — silence is
// not an option, because silence is what produced a tool page with a dropzone that
// did nothing.
import { TOOLS } from '@lovelytools/registry';
import { PDF_NOT_IMPLEMENTED, PDF_TOOLS } from './registry';

const failures: string[] = [];

const registrySlugs = TOOLS.filter((t) => t.engine === 'pdf').map((t) => t.slug).sort();
const bound = Object.keys(PDF_TOOLS);
const declared = Object.keys(PDF_NOT_IMPLEMENTED);

// 1 · Every registry tool on this engine is accounted for — implemented or declared.
for (const slug of registrySlugs) {
  const isBound = slug in PDF_TOOLS;
  const isDeclared = slug in PDF_NOT_IMPLEMENTED;
  if (!isBound && !isDeclared) {
    failures.push(`registry tool "${slug}" has engine=pdf but is neither bound nor declared unimplemented`);
  }
  if (isBound && isDeclared) {
    failures.push(`"${slug}" is both bound and declared unimplemented — pick one`);
  }
}

// 2 · Nothing is bound or declared that isn't a real pdf-engine tool.
for (const slug of [...bound, ...declared]) {
  const tool = TOOLS.find((t) => t.slug === slug);
  if (!tool) failures.push(`"${slug}" is not a tool in the registry`);
  else if (tool.engine !== 'pdf') {
    failures.push(`"${slug}" is mapped here but the registry says engine=${tool.engine}`);
  }
}

// 3 · Multi-file ops must accept multiple files, and single-file ops must not
//     silently ignore extras.
for (const [slug, b] of Object.entries(PDF_TOOLS)) {
  if (b.capability === 'pdf.merge' && b.arity !== 'multi') {
    failures.push(`"${slug}" merges but only accepts one file`);
  }
  if (b.capability === 'pdf.images-to-pdf' && b.arity !== 'multi') {
    failures.push(`"${slug}" builds a PDF from images but only accepts one`);
  }
}

const implemented = registrySlugs.filter((s) => s in PDF_TOOLS).length;

console.log(
  `pdf engine coverage: ${registrySlugs.length} registry tools · ${implemented} wired · ${declared.length} declared unimplemented`,
);

if (failures.length) {
  console.error(`\n${failures.length} coverage failure(s):`);
  for (const f of failures) console.error(`  ✕ ${f}`);
  process.exit(1);
}
console.log('✓ every pdf-engine tool is either wired up or explicitly declared unbuilt');
