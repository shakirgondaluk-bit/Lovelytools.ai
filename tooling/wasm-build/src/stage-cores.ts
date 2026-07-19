// lovelytools.ai — stages WASM cores into apps/web/public/wasm (RFC-001 §11).
//
// The cores ship as npm packages but must be served as static assets, not bundled:
// they're ~31 MB each and load lazily at runtime. This copies them out of
// node_modules so they're self-hosted, and content-hashes each one.
//
// Self-hosting is not incidental. A platform whose whole promise is "your files
// never leave your device" cannot fetch its engine from a third-party CDN — that CDN
// would see the IP of every visitor and which tool they opened. It wouldn't see the
// files, but it would see enough, and the promise is meant to survive inspection.
//
// CONTENT HASHING IS NOT OPTIONAL. The cores are served `immutable, max-age=1y`,
// so a URL's bytes may never change. Serving a new core at an old URL is invisible
// to every browser that cached the old one — they keep the stale copy for a year.
// (This bit during development: a UMD core stayed cached after the ESM one replaced
// it, and the engine failed with "failed to import ffmpeg-core.js" while the correct
// file sat on disk.) The hash is what makes the immutable cache safe.
//
// The manifest is read at build time by next.config.ts and baked into the bundle,
// so engines resolve hashed paths with no runtime lookup. In production
// NEXT_PUBLIC_WASM_BASE points at R2 (wasm.lovelytools.ai); this script feeds it.
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const here = dirname(fileURLToPath(import.meta.url));
const PUBLIC_WASM = resolve(here, '../../../apps/web/public/wasm');
const MANIFEST = join(PUBLIC_WASM, 'manifest.json');

interface CoreSpec {
  /** Package to resolve. */
  pkg: string;
  /** Logical name engines ask for. */
  key: string;
  label: string;
}

const CORES: CoreSpec[] = [
  { pkg: '@ffmpeg/core', key: 'ffmpeg-core', label: 'single-threaded (audio + fallback)' },
  { pkg: '@ffmpeg/core-mt', key: 'ffmpeg-core-mt', label: 'multithreaded (video)' },
];

const bytes = (n: number): string =>
  n >= 1_048_576 ? `${(n / 1_048_576).toFixed(1)} MB` : `${Math.round(n / 1024)} KB`;

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });

const dirSize = (dir: string): number =>
  walk(dir).reduce((total, file) => total + statSync(file).size, 0);

/** Hash of every file's contents, so any change produces a new directory name. */
const hashDir = (dir: string): string => {
  const hash = createHash('sha256');
  for (const file of walk(dir).sort()) {
    hash.update(file.replace(dir, ''));
    hash.update(readFileSync(file));
  }
  return hash.digest('hex').slice(0, 8);
};

console.log('staging WASM cores → apps/web/public/wasm');
// Wipe first: stale hashed directories from earlier builds would accumulate forever.
rmSync(PUBLIC_WASM, { recursive: true, force: true });
mkdirSync(PUBLIC_WASM, { recursive: true });

const manifest: Record<string, string> = {};

for (const core of CORES) {
  let sourceDir: string;
  try {
    // Resolve the package entry, not a deep path: these packages declare an
    // "exports" map, so any deep specifier is ERR_PACKAGE_PATH_NOT_EXPORTED.
    //
    // Under Node's "require" condition that lands on dist/umd — the WRONG build.
    // @ffmpeg/ffmpeg's worker is a *module* worker, where importScripts() doesn't
    // exist, so it falls back to `import(coreURL)` and reads `.default`. The UMD
    // build has no default export, so load() fails with "failed to import
    // ffmpeg-core.js". The esm build ends in `export default createFFmpegCore`,
    // which is what the worker is reaching for.
    sourceDir = dirname(require.resolve(core.pkg)).replace(/[\\/]umd$/, '/esm');
    if (!existsSync(join(sourceDir, 'ffmpeg-core.js'))) {
      throw new Error(`no esm build at ${sourceDir}`);
    }
  } catch (cause) {
    console.warn(`  ⚠ ${core.pkg}: ${(cause as Error).message} — skipping ${core.label}`);
    continue;
  }

  const hash = hashDir(sourceDir);
  const dest = `${core.key}-${hash}`;
  const destDir = join(PUBLIC_WASM, dest);
  cpSync(sourceDir, destDir, { recursive: true, filter: (src) => !src.endsWith('.d.ts') });
  manifest[core.key] = dest;
  console.log(`  ✓ ${dest.padEnd(24)} ${bytes(dirSize(destDir)).padStart(8)}  ${core.label}`);
}

if (Object.keys(manifest).length === 0) {
  console.error('\nNo cores staged. Video and audio tools will fail to load.');
  process.exit(1);
}

/**
 * @ffmpeg/ffmpeg spawns its wrapper worker with
 *   new Worker(new URL('./worker.js', import.meta.url), { type: 'module' })
 * which webpack does not reliably emit. Self-hosting it and passing `classWorkerURL`
 * is the library's own escape hatch.
 *
 * Runtime files only — no .d.ts. worker.d.ts carries `/// <reference lib="webworker" />`,
 * and public/ sits inside the app's tsconfig glob, so staging it injected the
 * WebWorker lib into the whole program and silently broke DOM types in unrelated
 * files. The browser only ever fetches the .js.
 */
function stageClassWorker(): boolean {
  let sourceDir: string;
  try {
    sourceDir = dirname(require.resolve('@ffmpeg/ffmpeg'));
  } catch {
    console.warn('  ⚠ @ffmpeg/ffmpeg is not installed — engines cannot start');
    return false;
  }
  if (!existsSync(join(sourceDir, 'worker.js'))) {
    console.warn(`  ⚠ no worker.js beside ${sourceDir} — engines cannot start`);
    return false;
  }

  const hash = hashDir(sourceDir);
  const dest = `ffmpeg-${hash}`;
  const destDir = join(PUBLIC_WASM, dest);
  cpSync(sourceDir, destDir, {
    recursive: true,
    filter: (src) => !src.endsWith('.d.ts') && !src.endsWith('.d.mts'),
  });
  manifest['ffmpeg'] = dest;
  console.log(`  ✓ ${dest.padEnd(24)} ${bytes(dirSize(destDir)).padStart(8)}  class worker + imports`);
  return true;
}

if (!stageClassWorker()) {
  console.error('\nThe ffmpeg class worker is required — engines cannot start without it.');
  process.exit(1);
}

/**
 * pdf.js parses documents in its own worker and will not start without
 * GlobalWorkerOptions.workerSrc pointing at that script. Self-hosted for the same
 * reason as the ffmpeg cores: pdf.js's docs suggest a CDN, and a CDN would learn
 * which of our visitors opened a PDF tool.
 */
function stagePdfWorker(): boolean {
  let pkgRoot: string;
  try {
    // pdfjs-dist's "exports" map hides deep paths, so resolve the package entry and
    // walk up to the package root rather than asking for files directly.
    pkgRoot = join(dirname(require.resolve('pdfjs-dist')), '..');
    if (!existsSync(join(pkgRoot, 'build/pdf.worker.min.mjs'))) {
      throw new Error('pdf.worker.min.mjs not found');
    }
  } catch (cause) {
    console.warn(`  ⚠ pdfjs-dist: ${(cause as Error).message} — PDF tools cannot parse documents`);
    return false;
  }

  const worker = join(pkgRoot, 'build/pdf.worker.min.mjs');
  const fonts = join(pkgRoot, 'standard_fonts');
  const cmaps = join(pkgRoot, 'cmaps');

  // standard_fonts is not optional. Without it pdf.js PARSES fine but RENDERING a
  // page using one of the 14 standard fonts never resolves — pdf-to-text passes
  // while pdf-to-jpg hangs at page 1 with no error. cmaps is what keeps CJK text
  // from extracting as mojibake.
  const hash = createHash('sha256')
    .update(readFileSync(worker))
    .update(existsSync(fonts) ? String(dirSize(fonts)) : '')
    .digest('hex')
    .slice(0, 8);

  const dest = `pdfjs-${hash}`;
  const destDir = join(PUBLIC_WASM, dest);
  mkdirSync(destDir, { recursive: true });
  cpSync(worker, join(destDir, 'pdf.worker.min.mjs'));

  if (existsSync(fonts)) cpSync(fonts, join(destDir, 'standard_fonts'), { recursive: true });
  else console.warn('  ⚠ pdfjs standard_fonts missing — page rendering will hang on standard fonts');

  if (existsSync(cmaps)) cpSync(cmaps, join(destDir, 'cmaps'), { recursive: true });
  else console.warn('  ⚠ pdfjs cmaps missing — CJK text may extract incorrectly');

  manifest['pdfjs'] = dest;
  console.log(
    `  ✓ ${dest.padEnd(24)} ${bytes(dirSize(destDir)).padStart(8)}  pdf.js worker + standard fonts + cmaps`,
  );
  return true;
}

if (!stagePdfWorker()) {
  console.error('\nThe pdf.js worker is required — PDF tools cannot start without it.');
  process.exit(1);
}

/**
 * Tesseract: worker, WASM core and English language data.
 *
 * tesseract.js defaults to fetching all three from a CDN, and for this product that
 * is the one thing that cannot happen. A scanned PDF is a passport or a payslip; a
 * CDN learning that one of our visitors OCR'd something today is precisely the leak
 * the architecture exists to prevent. The bytes would stay on the device either way —
 * the fact of it would not.
 *
 * The language data is the bulk of it (~11 MB) and is fetched lazily, only when
 * someone actually runs OCR.
 */
function stageTesseract(): boolean {
  let workerSrc: string;
  let coreDir: string;
  let langFile: string;
  try {
    // tesseract.js resolves to src/index.js, so the shipped worker is a sibling
    // directory up — resolve to the package root rather than guessing from the entry.
    workerSrc = join(dirname(require.resolve('tesseract.js')), '../dist/worker.min.js');
    coreDir = dirname(require.resolve('tesseract.js-core'));
    // The package ships several revisions; 4.0.0 is the standard model tesseract.js
    // itself defaults to. `_best_int` is a third of the size and slower — worth
    // revisiting if the download becomes a complaint.
    langFile = join(
      dirname(require.resolve('@tesseract.js-data/eng')),
      '4.0.0/eng.traineddata.gz',
    );
    if (!existsSync(workerSrc)) throw new Error(`no worker.min.js at ${workerSrc}`);
    if (!existsSync(langFile)) throw new Error(`no eng.traineddata.gz at ${langFile}`);
  } catch (cause) {
    console.warn(`  ⚠ tesseract: ${(cause as Error).message} — ocr-pdf cannot run`);
    return false;
  }

  const hash = createHash('sha256')
    .update(readFileSync(workerSrc))
    .update(readFileSync(langFile))
    .digest('hex')
    .slice(0, 8);

  const dest = `tesseract-${hash}`;
  const destDir = join(PUBLIC_WASM, dest);
  mkdirSync(join(destDir, 'core'), { recursive: true });
  mkdirSync(join(destDir, 'lang'), { recursive: true });

  cpSync(workerSrc, join(destDir, 'worker.min.js'));
  // Runtime files only — the .map files are ~10 MB of debug data nobody fetches.
  cpSync(coreDir, join(destDir, 'core'), {
    recursive: true,
    filter: (src) => !src.endsWith('.map') && !src.endsWith('.d.ts'),
  });
  cpSync(langFile, join(destDir, 'lang/eng.traineddata.gz'));

  manifest['tesseract'] = dest;
  console.log(
    `  ✓ ${dest.padEnd(24)} ${bytes(dirSize(destDir)).padStart(8)}  tesseract worker + core + eng data`,
  );
  return true;
}

if (!stageTesseract()) {
  console.error('\nThe tesseract assets are required — ocr-pdf cannot start without them.');
  process.exit(1);
}

/**
 * onnxruntime-web's WASM execution backend, for remove-background.
 *
 * ORT's default is to fetch these from cdn.jsdelivr.net — the same leak as the
 * tesseract/pdfjs CDNs: a third party learning that one of our visitors opened
 * the background-removal tool. Only the runtime pair each EP actually requests
 * is staged (plain = WASM EP, .jsep = WebGPU EP); the rest of dist/ is other
 * bundle formats nobody fetches at runtime.
 */
function stageOrt(): boolean {
  const FILES = [
    'ort-wasm-simd-threaded.wasm',
    'ort-wasm-simd-threaded.mjs',
    'ort-wasm-simd-threaded.jsep.wasm',
    'ort-wasm-simd-threaded.jsep.mjs',
  ];
  let distDir: string;
  try {
    // The Node entry (dist/ort.node.min.js) sits beside the runtime files.
    distDir = dirname(require.resolve('onnxruntime-web'));
    if (!existsSync(join(distDir, FILES[0]!))) {
      distDir = join(distDir, '..');
      if (!existsSync(join(distDir, FILES[0]!))) throw new Error(`no ${FILES[0]} under ${distDir}`);
    }
  } catch (cause) {
    console.warn(`  ⚠ onnxruntime-web: ${(cause as Error).message} — remove-background cannot run`);
    return false;
  }

  const hash = createHash('sha256');
  for (const f of FILES) hash.update(readFileSync(join(distDir, f)));
  const dest = `ort-${hash.digest('hex').slice(0, 8)}`;
  const destDir = join(PUBLIC_WASM, dest);
  mkdirSync(destDir, { recursive: true });
  for (const f of FILES) cpSync(join(distDir, f), join(destDir, f));

  manifest['ort'] = dest;
  console.log(`  ✓ ${dest.padEnd(24)} ${bytes(dirSize(destDir)).padStart(8)}  onnxruntime wasm + webgpu backends`);
  return true;
}

/**
 * U²-Net (small) salient-object segmentation model, for remove-background.
 *
 * Vendored in assets/ rather than resolved from a package: no npm package ships
 * it. Apache-2.0 (xuebinqin/U-2-Net); the file itself is the u2netp release from
 * github.com/danielgatis/rembg — 4.5 MB, 320×320 input, ImageNet-normalized,
 * fused d0 saliency output. background-remove.ts encodes that contract.
 */
function stageU2Net(): boolean {
  const model = resolve(here, '../assets/u2netp.onnx');
  if (!existsSync(model)) {
    console.warn(`  ⚠ u2netp.onnx missing at ${model} — remove-background cannot run`);
    return false;
  }

  const hash = createHash('sha256').update(readFileSync(model)).digest('hex').slice(0, 8);
  const dest = `u2net-${hash}`;
  const destDir = join(PUBLIC_WASM, dest);
  mkdirSync(destDir, { recursive: true });
  cpSync(model, join(destDir, 'u2netp.onnx'));

  manifest['u2net'] = dest;
  console.log(`  ✓ ${dest.padEnd(24)} ${bytes(dirSize(destDir)).padStart(8)}  u2netp segmentation model`);
  return true;
}

// Warn-only, like the pdf/tesseract guards are hard-fails: those block whole
// engines; missing these degrades exactly one tool, which then explains itself.
stageOrt();
stageU2Net();

writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');
console.log(`\n${Object.keys(manifest).length} asset group(s) staged · manifest.json written`);
console.log('Note: RFC-001 §3 specifies a ~6 MB audio-profile core. No such build is');
console.log('published; audio shares the standard core until one is compiled here.');
