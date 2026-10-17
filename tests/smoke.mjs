#!/usr/bin/env node
/**
 * Post-deploy smoke test: node tests/smoke.mjs https://<deployment-url>
 * Fails the deploy job if the live deployment does not answer the way the build did.
 */
const base = (process.argv[2] || '').replace(/\/$/, '');
if (!base) {
  console.error('usage: node tests/smoke.mjs <url>');
  process.exit(2);
}
const failures = [];
const check = (ok, msg) => (ok ? console.log(`✓ ${msg}`) : failures.push(msg));

async function get(path, redirect = 'follow') {
  return fetch(base + path, { redirect });
}

for (const path of ['/', '/pa/', '/our-work/', '/pa/contact/']) {
  const r = await get(path);
  check(r.status === 200, `${path} answers 200 (got ${r.status})`);
  const html = await r.text();
  check(
    html.includes('<html lang="' + (path.startsWith('/pa') ? 'pa' : 'en')),
    `${path} has the right <html lang>`,
  );
}
const home = await get('/');
for (const [h, needle] of [
  ['content-security-policy', "default-src 'self'"],
  ['x-content-type-options', 'nosniff'],
  ['referrer-policy', 'strict-origin-when-cross-origin'],
  ['permissions-policy', 'camera=()'],
]) {
  check((home.headers.get(h) || '').includes(needle), `header ${h}`);
}
const r301 = await get('/about', 'manual');
check(
  r301.status === 301 && /\/our-story\/$/.test(r301.headers.get('location') || ''),
  '/about → 301 /our-story/',
);
const nf = await get('/definitely-missing/');
check(nf.status === 404, 'missing page answers 404');
const sitemap = await get('/sitemap-index.xml');
check(sitemap.status === 200, 'sitemap served');

if (failures.length) {
  console.error('\nSmoke test failed:');
  for (const f of failures) console.error(`✗ ${f}`);
  process.exit(1);
}
console.log(`\nSmoke test passed against ${base}`);
