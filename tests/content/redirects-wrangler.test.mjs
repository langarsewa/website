import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { root } from '../lib/reference.mjs';

/**
 * Runs the built site under `wrangler pages dev` (the same runtime Cloudflare Pages uses) and
 * checks that public/_redirects and public/_headers behave as declared.
 */
const PORT = 8788;
const base = `http://127.0.0.1:${PORT}`;

async function waitForServer(proc) {
  for (let i = 0; i < 120; i++) {
    if (proc.exitCode !== null) throw new Error(`wrangler exited early (${proc.exitCode})`);
    try {
      const res = await fetch(`${base}/`, { redirect: 'manual' });
      if (res.status > 0) return;
    } catch {
      /* not up yet */
    }
    await sleep(500);
  }
  throw new Error('wrangler pages dev did not start within 60s');
}

test('legacy paths redirect (301) and security headers are served under wrangler pages dev', async (t) => {
  const proc = spawn(
    'pnpm',
    [
      'exec',
      'wrangler',
      'pages',
      'dev',
      'dist',
      '--port',
      String(PORT),
      '--ip',
      '127.0.0.1',
      '--log-level',
      'error',
    ],
    {
      cwd: root,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, CI: '1', WRANGLER_SEND_METRICS: 'false' },
    },
  );
  let output = '';
  proc.stdout.on('data', (d) => (output += d));
  proc.stderr.on('data', (d) => (output += d));
  t.after(() => proc.kill('SIGTERM'));

  try {
    await waitForServer(proc);
  } catch (err) {
    throw new Error(`${err.message}\n${output.slice(-2000)}`);
  }

  const cases = [
    ['/about', '/our-story/'],
    ['/sewa', '/our-work/'],
    ['/media-gallery', '/impact/'],
    ['/donate', '/join-the-sewa/'],
    ['/covid', '/join-the-sewa/'],
    ['/contact', '/contact/'],
    ['/punjabi', '/pa/'],
  ];
  for (const [from, to] of cases) {
    const res = await fetch(base + from, { redirect: 'manual' });
    assert.equal(res.status, 301, `${from} status`);
    assert.equal(new URL(res.headers.get('location'), base).pathname, to, `${from} → ${to}`);
  }

  const home = await fetch(`${base}/`);
  assert.equal(home.status, 200);
  assert.match(home.headers.get('content-security-policy') || '', /default-src 'self'/);
  assert.equal(home.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(home.headers.get('referrer-policy'), 'strict-origin-when-cross-origin');
  assert.match(home.headers.get('permissions-policy') || '', /camera=\(\)/);

  const missing = await fetch(`${base}/no-such-page/`);
  assert.equal(missing.status, 404, 'custom 404 is served with a 404 status');

  // Location-aware Join page (public/_worker.js, limited by public/_routes.json).
  const regionOf = (html) => /<html[^>]*\sdata-region="(in|us)"/.exec(html)?.[1];
  for (const path of ['/join-the-sewa/', '/pa/join-the-sewa/']) {
    const auto = await fetch(base + path);
    assert.equal(auto.status, 200, `${path} status`);
    assert.ok(regionOf(await auto.text()), `${path} is tagged with a region`);
    assert.match(
      auto.headers.get('content-security-policy') || '',
      /default-src 'self'/,
      `${path} keeps _headers`,
    );
    assert.match(
      auto.headers.get('cache-control') || '',
      /private/,
      `${path} is not shared-cached`,
    );

    const india = await fetch(`${base}${path}?from=in`);
    const indiaHtml = await india.text();
    assert.equal(regionOf(indiaHtml), 'in', `${path}?from=in`);
    assert.match(
      indiaHtml,
      /<a[^>]*data-region-opt="in"[^>]*aria-current="true"|<a[^>]*aria-current="true"[^>]*data-region-opt="in"/,
      `${path} marks the current region in the toggle`,
    );
    assert.match(
      india.headers.get('set-cookie') || '',
      /dgrls-region=in/,
      `${path}?from=in remembers the choice`,
    );

    const us = await fetch(`${base}${path}?from=us`);
    assert.equal(regionOf(await us.text()), 'us', `${path}?from=us`);

    const remembered = await fetch(base + path, { headers: { cookie: 'dgrls-region=in' } });
    assert.equal(regionOf(await remembered.text()), 'in', `${path} honours the cookie`);
  }
  const homeHtml = await (await fetch(`${base}/`)).text();
  assert.equal(regionOf(homeHtml), undefined, 'other pages are untouched by the worker');
});
