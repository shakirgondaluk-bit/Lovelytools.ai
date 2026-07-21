// Custom Node entry point for hosts that run a plain `node <file>` instead of
// `next start` (e.g. Hostinger's Node app hosting, which asks for an "Entry
// file" rather than a start command). Boots Next's production server
// programmatically against the build already produced by `next build`.
const { createServer } = require('node:http');
const next = require('next');

const port = Number(process.env.PORT) || 3210;
const app = next({ dev: false, dir: __dirname });
const handle = app.getRequestHandler();

// Paths whose bytes are content-hashed and may be cached forever. Everything else
// is a document/data response that must be revalidated. /wasm/* is hashed too, with
// one exception: manifest.json has a STABLE url but changes every deploy (it maps
// logical core names to the current hashed dirs), so it must revalidate like a
// document — caching it immutably would pin engines to a past deploy's cores.
const WASM_MANIFEST = '/wasm/manifest.json';
const IMMUTABLE_PREFIXES = ['/_next/static', '/_next/image', '/wasm'];

function isImmutable(path) {
  if (path === WASM_MANIFEST) return false;
  return IMMUTABLE_PREFIXES.some((p) => path.startsWith(p));
}

/**
 * Force HTML/RSC documents to revalidate instead of being cached for a year.
 *
 * Next marks fully-static App Router pages `Cache-Control: s-maxage=31536000`,
 * assuming the CDN in front is purged on every deploy. Hostinger's `hcdn` caches
 * per that header but does NOT purge on our deploys, so it served a year-old
 * homepage after each release — the new build's HTML (and the JS hashes it points
 * at) never reached visitors until the TTL expired. Overriding the header here, in
 * our own server, is the one place that reliably wins: `headers()` in
 * next.config.ts cannot override the framework's cache-control on static pages.
 *
 * Content-hashed assets keep their immutable cache — their URL changes when their
 * bytes do, so caching them forever is safe and desirable.
 */
function withRevalidatingDocuments(req, res) {
  const path = (req.url || '').split('?')[0];
  if (isImmutable(path)) return;

  const originalSetHeader = res.setHeader.bind(res);
  res.setHeader = (name, value) => {
    if (name.toLowerCase() === 'cache-control') {
      // Allow the CDN/browser to keep a copy but revalidate every time, so a new
      // deploy is picked up immediately (via ETag) rather than after a year.
      return originalSetHeader(name, 'public, max-age=0, must-revalidate');
    }
    return originalSetHeader(name, value);
  };
}

app.prepare().then(() => {
  createServer((req, res) => {
    withRevalidatingDocuments(req, res);
    handle(req, res);
  }).listen(port, () => {
    console.log(`lovelytools.ai listening on ${port}`);
  });
});
