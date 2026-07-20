// Custom Node entry point for hosts that run a plain `node <file>` instead of
// `next start` (e.g. Hostinger's Node app hosting, which asks for an "Entry
// file" rather than a start command). Boots Next's production server
// programmatically against the build already produced by `next build`.
const { createServer } = require('node:http');
const next = require('next');

const port = Number(process.env.PORT) || 3210;
const app = next({ dev: false, dir: __dirname });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer((req, res) => handle(req, res)).listen(port, () => {
    console.log(`lovelytools.ai listening on ${port}`);
  });
});
