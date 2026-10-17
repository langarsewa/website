import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parse } from 'node-html-parser';
import { root } from '../lib/reference.mjs';

const dist = resolve(root, 'dist');

function htmlFiles(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) htmlFiles(p, out);
    else if (name.endsWith('.html')) out.push(p);
  }
  return out;
}

function targetFile(pathname) {
  const clean = decodeURIComponent(pathname.split('?')[0]);
  const candidates = [
    join(dist, clean),
    join(dist, clean, 'index.html'),
    join(dist, `${clean.replace(/\/$/, '')}.html`),
  ];
  return candidates.find((c) => existsSync(c) && statSync(c).isFile());
}

test('no broken internal links, assets or anchors in dist/', () => {
  assert.ok(existsSync(dist), 'dist/ missing: run pnpm build');
  const problems = [];
  for (const file of htmlFiles(dist)) {
    const doc = parse(readFileSync(file, 'utf8'));
    const ids = new Set(doc.querySelectorAll('[id]').map((el) => el.getAttribute('id')));
    const refs = [
      ...doc.querySelectorAll('a[href]').map((a) => ['href', a.getAttribute('href')]),
      ...doc.querySelectorAll('[src]').map((el) => ['src', el.getAttribute('src')]),
      ...doc.querySelectorAll('link[href]').map((el) => ['link', el.getAttribute('href')]),
    ];
    for (const [kind, raw] of refs) {
      if (!raw || /^(https?:|mailto:|tel:|data:|#$)/.test(raw)) continue;
      const rel = file.slice(dist.length);
      if (raw.startsWith('#')) {
        if (!ids.has(raw.slice(1))) problems.push(`${rel}: missing anchor ${raw}`);
        continue;
      }
      const [pathname, hash] = raw.split('#');
      if (!pathname.startsWith('/')) continue; // Astro emits absolute paths; skip odd relative ones
      const target = targetFile(pathname);
      if (!target) {
        problems.push(`${rel}: ${kind} ${raw} not found`);
        continue;
      }
      if (hash && target.endsWith('.html')) {
        const tdoc = parse(readFileSync(target, 'utf8'));
        if (!tdoc.querySelector(`[id="${hash}"]`))
          problems.push(`${rel}: ${raw} anchor #${hash} missing in target`);
      }
    }
  }
  assert.deepEqual(problems, []);
});
