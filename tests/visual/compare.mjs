#!/usr/bin/env node
/**
 * Visual parity against the approved reference, outside the Playwright runner so a single
 * page can be checked quickly while porting:
 *
 *   node tests/visual/compare.mjs                 every page, both languages, both viewports
 *   node tests/visual/compare.mjs our-work        one page
 *   node tests/visual/compare.mjs our-work pa     one page, one language
 *   node tests/visual/compare.mjs our-work pa mobile
 *
 * Serves reference/ and dist/ itself. Writes screenshots and diffs to tests/visual/__diff__/.
 * Pass rule (from the brief): pixel difference <= 1.5% of the page and height within 2%.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import { serve } from '../lib/static-server.mjs';
import { langs, pages, referenceUrl, root, sitePath } from '../lib/reference.mjs';

const VIEWPORTS = { desktop: { width: 1440, height: 900 }, mobile: { width: 390, height: 844 } };
const PIXEL_LIMIT = 0.015;
const HEIGHT_LIMIT = 0.02;

const [, , onlyPage, onlyLang, onlyViewport] = process.argv;
const outDir = resolve(root, 'tests/visual/__diff__');
mkdirSync(outDir, { recursive: true });

async function settle(page) {
  await page.evaluate(() => document.fonts.ready);
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  const step = Math.max(400, Math.floor(viewportHeight(page) * 0.8));
  for (let y = 0; y < height; y += step) {
    await page.evaluate((top) => window.scrollTo(0, top), y);
    await page.waitForTimeout(40);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page
    .waitForFunction(() => [...document.images].every((img) => img.complete), null, {
      timeout: 15_000,
    })
    .catch(() => console.error('  some images did not finish loading'));
  await page.waitForTimeout(350);
}

function viewportHeight(page) {
  return page.viewportSize()?.height ?? 900;
}

async function shootOnce(context, url, viewport) {
  const page = await context.newPage();
  page.on('crash', () => console.error(`  page crashed: ${url}`));
  try {
    await page.setViewportSize(viewport);
    await page.goto(url, { waitUntil: 'load', timeout: 60_000 });
    await settle(page);
    const buf = await page.screenshot({
      fullPage: true,
      animations: 'disabled',
      caret: 'hide',
      timeout: 60_000,
    });
    return PNG.sync.read(buf);
  } finally {
    await page.close().catch(() => {});
  }
}

async function shoot(context, url, viewport) {
  try {
    return await shootOnce(context, url, viewport);
  } catch (err) {
    console.error(`  retrying after: ${String(err.message || err).split('\n')[0]}`);
    return shootOnce(context, url, viewport);
  }
}

function pad(png, width, height) {
  if (png.width === width && png.height === height) return png;
  const out = new PNG({ width, height, fill: true });
  out.data.fill(255);
  PNG.bitblt(png, out, 0, 0, png.width, png.height, 0, 0);
  return out;
}

const ref = await serve(resolve(root, 'reference'));
// SITE_URL=https://langarsewa.pages.dev compares a live deployment instead of the local dist/.
const site = process.env.SITE_URL
  ? { url: process.env.SITE_URL.replace(/\/$/, ''), server: { close() {} } }
  : await serve(resolve(root, 'dist'));
console.log(`reference ${ref.url}  site ${site.url}`);
const browser = await chromium.launch();

// Every (page, language, viewport) triple is one job. Jobs run in a small pool of browser contexts;
// each job gets a fresh context, so the site's language memory never leaks between pairs.
const jobs = [];
for (const slug of pages) {
  if (onlyPage !== undefined && onlyPage !== (slug || 'home') && onlyPage !== slug) continue;
  for (const lang of langs) {
    if (onlyLang && onlyLang !== lang) continue;
    for (const [vpName, viewport] of Object.entries(VIEWPORTS)) {
      if (onlyViewport && onlyViewport !== vpName) continue;
      jobs.push({ slug, lang, vpName, viewport, name: `${slug || 'home'}-${lang}-${vpName}` });
    }
  }
}

const concurrency = Math.max(1, Math.min(Number(process.env.VISUAL_CONCURRENCY) || 4, jobs.length));
const results = new Array(jobs.length);
let cursor = 0;

async function runJob(i) {
  const { slug, lang, viewport, name } = jobs[i];
  const context = await browser.newContext({ reducedMotion: 'reduce', deviceScaleFactor: 1 });
  try {
    const refPng = await shoot(context, referenceUrl(ref.url, slug, lang), viewport);
    const sitePng = await shoot(context, `${site.url}${sitePath(slug, lang)}`, viewport);
    const width = Math.max(refPng.width, sitePng.width);
    const height = Math.max(refPng.height, sitePng.height);
    const a = pad(refPng, width, height);
    const b = pad(sitePng, width, height);
    const diff = new PNG({ width, height });
    const differing = pixelmatch(a.data, b.data, diff.data, width, height, { threshold: 0.1 });
    const pixelRatio = differing / (width * height);
    const heightRatio = Math.abs(refPng.height - sitePng.height) / refPng.height;
    const pass = pixelRatio <= PIXEL_LIMIT && heightRatio <= HEIGHT_LIMIT;
    writeFileSync(resolve(outDir, `${name}-reference.png`), PNG.sync.write(a));
    writeFileSync(resolve(outDir, `${name}-site.png`), PNG.sync.write(b));
    writeFileSync(resolve(outDir, `${name}-diff.png`), PNG.sync.write(diff));
    results[i] = {
      name,
      pass,
      pixelRatio,
      heightRatio,
      refHeight: refPng.height,
      siteHeight: sitePng.height,
    };
    console.log(
      `${pass ? '✓' : '✗'} ${name.padEnd(30)} pixels ${(pixelRatio * 100).toFixed(2)}%  height ${refPng.height}→${sitePng.height} (${(heightRatio * 100).toFixed(2)}%)`,
    );
  } finally {
    await context.close();
  }
}

async function worker() {
  for (;;) {
    const i = cursor++;
    if (i >= jobs.length) return;
    await runJob(i);
  }
}

console.log(`${jobs.length} pairs, ${concurrency} in parallel`);
await Promise.all(Array.from({ length: concurrency }, worker));

await browser.close();
ref.server.close();
site.server.close();
writeFileSync(resolve(outDir, 'results.json'), JSON.stringify(results, null, 2));
const failed = results.filter((r) => !r.pass);
console.log(
  `\n${failed.length ? 'FAIL' : 'PASS'}: ${results.length - failed.length}/${results.length} pairs within limits`,
);
process.exit(failed.length ? 1 : 0);
