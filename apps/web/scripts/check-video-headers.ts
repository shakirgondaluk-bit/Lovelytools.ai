// lovelytools.ai — guard for apps/web/video-slugs.json.
//
// next.config.ts used to derive its cross-origin-isolation routes from the registry.
// That import is what forced Next to compile the config with SWC on every server
// boot, and SWC's tokio runtime opened 64 idle threads per instance against
// Hostinger's 200-thread account limit. The list is now a literal JSON file, so this
// check is the thing standing between "someone adds a video tool" and "that tool
// silently loses SharedArrayBuffer and runs on the single-threaded ffmpeg core".
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { TOOLS } from '@lovelytools/registry';

const SLUGS_FILE = resolve(import.meta.dirname, '../video-slugs.json');
const VIDEO_SLUGS: string[] = JSON.parse(readFileSync(SLUGS_FILE, 'utf8'));

const expected = TOOLS.filter((tool) => tool.engine === 'video').map((tool) => tool.slug).sort();
const actual = [...VIDEO_SLUGS].sort();

const missing = expected.filter((slug) => !actual.includes(slug));
const extra = actual.filter((slug) => !expected.includes(slug));

console.log('lovelytools video-header check');
console.log(`  ${expected.length} video tools in registry · ${actual.length} slugs in video-slugs.json`);

if (missing.length || extra.length) {
  if (missing.length) {
    console.error(`\n${missing.length} video tool(s) missing from apps/web/video-slugs.json:`);
    for (const slug of missing) console.error(`  ✕ ${slug}`);
    console.error('\nAdd them. Without COOP/COEP the page has no SharedArrayBuffer and');
    console.error('ffmpeg.wasm drops to its single-threaded core — slow, but not obviously broken.');
  }
  if (extra.length) {
    console.error(`\n${extra.length} slug(s) in video-slugs.json are not video tools:`);
    for (const slug of extra) console.error(`  ✕ ${slug}`);
    console.error('\nRemove them. COEP: require-corp on a page that does not need it only breaks subresources.');
  }
  process.exit(1);
}

console.log('\n✓ video-slugs.json matches the registry');
