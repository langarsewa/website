// Minimal static file server used by the visual tests to serve `reference/` and `dist/`.
import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.woff2': 'font/woff2',
  '.xml': 'application/xml',
  '.txt': 'text/plain; charset=utf-8',
};

/**
 * Serves `dir` on 127.0.0.1. With port 0 (the default) the OS picks a free port; read it from
 * the resolved value: `const { server, url } = await serve('dist')`.
 */
export function serve(dir, port = 0) {
  const base = normalize(dir);
  const server = createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    let file = normalize(join(base, decodeURIComponent(url.pathname)));
    if (!file.startsWith(base)) {
      res.writeHead(403).end();
      return;
    }
    if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
    if (!existsSync(file)) {
      const nf = join(base, '404.html');
      res.writeHead(404, { 'content-type': 'text/html; charset=utf-8' });
      if (existsSync(nf)) createReadStream(nf).pipe(res);
      else res.end('not found');
      return;
    }
    res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' });
    createReadStream(file).pipe(res);
  });
  return new Promise((resolveStart, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => {
      const { port: p } = server.address();
      resolveStart({ server, url: `http://127.0.0.1:${p}`, port: p });
    });
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [, , dir = 'dist', port = '0'] = process.argv;
  serve(dir, Number(port)).then(({ url }) => console.log(`serving ${dir} on ${url}`));
}
