import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { TOOLS } from '@lovelytools/registry';
import type { NextConfig } from 'next';

/**
 * The WASM asset manifest, written by tooling/wasm-build. Maps a logical core name
 * to its content-hashed directory. Read at build time and baked into the client
 * bundle, so engines resolve hashed URLs with no runtime lookup — and a new core
 * lands on a new URL, which is what makes the immutable cache safe.
 */
function readWasmManifest(): Record<string, string> {
  try {
    return JSON.parse(readFileSync(join(process.cwd(), 'public/wasm/manifest.json'), 'utf8'));
  } catch {
    // Not fatal at build time: the engines surface a clear error, and `pnpm install`
    // regenerates it. Failing the build would block anyone not touching video/audio.
    console.warn('[lovelytools] public/wasm/manifest.json is missing — run `pnpm --filter @lovelytools/wasm-build build`. Video and audio tools will not load.');
    return {};
  }
}

/**
 * Cross-origin isolation. ffmpeg.wasm's multithreaded core needs SharedArrayBuffer,
 * which the browser only exposes on a cross-origin-isolated document (RFC-001 §3).
 *
 * These headers are deliberately NOT global. COEP: require-corp breaks any
 * cross-origin subresource that doesn't opt in, so applying it site-wide would be a
 * standing hazard on pages that gain nothing from it. Only tool routes get it, and
 * the video engine falls back to the single-threaded core anywhere it's absent.
 */
const ISOLATION_HEADERS = [
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
];

const SECURITY_HEADERS = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  // Required by the COEP routes below. Under `COEP: require-corp` the browser
  // blocks every subresource that doesn't explicitly opt in — including our own
  // same-origin JS chunks. Without this, the ffmpeg chunk fails with
  // ERR_BLOCKED_BY_RESPONSE and the video engine never loads: the header meant to
  // enable threading is what breaks it. Declaring CORP on everything we serve is
  // the counterpart that makes isolation work.
  { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,

  env: {
    NEXT_PUBLIC_WASM_MANIFEST: JSON.stringify(readWasmManifest()),
  },

  // The speech engine imports @huggingface/transformers dynamically, in the
  // browser, on user action. Webpack still walks the import for the SSR pass of
  // the client island, where the package's `node` entry pulls in
  // onnxruntime-node's native .node binding and breaks the build.
  // serverExternalPackages can't help here — the import arrives through a
  // transpiled workspace package — so the node-only backends are stubbed out at
  // resolution. The browser path uses onnxruntime-web and never touches them,
  // and nothing executes this module during prerender.
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      'onnxruntime-node': false,
      sharp: false,
    };
    return config;
  },

  // The registry and UI are TS source, not built artifacts — Next compiles them.
  transpilePackages: [
    '@lovelytools/registry',
    '@lovelytools/ui',
    '@lovelytools/engines-core',
    '@lovelytools/engine-video',
    '@lovelytools/engine-audio',
    '@lovelytools/engine-pdf',
    '@lovelytools/engine-conversion',
    // engine-image reads NEXT_PUBLIC_WASM_MANIFEST at module scope
    // (ops/background-remove.ts) — it must go through Next's compiler for that
    // env to be inlined, same as engine-pdf's pdfjs.ts.
    '@lovelytools/engine-image',
    '@lovelytools/engine-calculator',
    '@lovelytools/engine-text',
    '@lovelytools/engine-devtools',
    '@lovelytools/engine-speech',
  ],

  async headers() {
    return [
      { source: '/:path*', headers: SECURITY_HEADERS },
      // The manifest maps logical names to hashed directories, so it is the one
      // file here whose URL is stable and whose contents change. It must never be
      // cached immutably or every deploy would point at last deploy's cores.
      {
        source: '/wasm/manifest.json',
        headers: [{ key: 'Cache-Control', value: 'no-cache' }],
      },
      // Everything else under /wasm is content-hashed, so the bytes at a given URL
      // can never change — safe to keep for a year.
      {
        source: '/wasm/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      // Isolate exactly the routes whose engine needs threads — derived from the
      // registry, so a new video tool gets its headers by existing. A hand-kept
      // list here would silently drop threading the first time someone forgot it.
      ...TOOLS.filter((tool) => tool.engine === 'video').map((tool) => ({
        source: `/${tool.slug}`,
        headers: ISOLATION_HEADERS,
      })),
    ];
  },
};

export default nextConfig;
