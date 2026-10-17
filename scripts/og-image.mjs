#!/usr/bin/env node
/**
 * Renders public/og.png (1200×630) for Open Graph / Twitter cards from the Home hero: the
 * Punjab outline from the reference map, the organisation name in the site's own fonts.
 * Run after changing the name or tagline:  node scripts/og-image.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';

const root = resolve(new URL('..', import.meta.url).pathname);
const ref = readFileSync(resolve(root, 'reference/index.html'), 'utf8');
const site = JSON.parse(readFileSync(resolve(root, 'src/content/site.json'), 'utf8'));
const en = JSON.parse(readFileSync(resolve(root, 'src/content/i18n/en.json'), 'utf8'));

// The first polygon of the hero map is the state outline.
const outline = ref.match(/<polygon[^>]*points="([^"]+)"/)?.[1];
if (!outline) throw new Error('Punjab outline polygon not found in reference/index.html');

const font = (file) => pathToFileURL(resolve(root, 'src/styles/fonts', file)).href;
const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:'Newsreader';src:url(${font('newsreader-latin-opsz-normal.woff2')}) format('woff2-variations');font-weight:200 800}
@font-face{font-family:'Public Sans';src:url(${font('public-sans-latin-wght-normal.woff2')}) format('woff2-variations');font-weight:100 900}
@font-face{font-family:'Noto Sans Gurmukhi';src:url(${font('noto-sans-gurmukhi-gurmukhi-wght-normal.woff2')}) format('woff2-variations');font-weight:100 900}
html,body{margin:0;width:1200px;height:630px;background:#102B4E;color:#fff;font-family:'Public Sans',sans-serif;overflow:hidden}
.wrap{position:relative;width:1200px;height:630px;padding:72px 80px;box-sizing:border-box;display:flex;flex-direction:column;justify-content:space-between}
.k{display:flex;align-items:center;gap:14px;font-size:20px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:#F4C430}
.k::before{content:"";width:40px;height:4px;background:#F4C430}
h1{font-family:'Newsreader',serif;font-weight:500;font-size:84px;line-height:1.02;letter-spacing:-.02em;margin:22px 0 0;max-width:720px}
p{font-size:26px;line-height:1.4;color:#DCE3EC;margin:0;max-width:560px}
.url{font-size:22px;font-weight:600;color:#F4C430}
svg{position:absolute;right:60px;top:50%;transform:translateY(-50%);height:540px;width:auto}
.mark{position:absolute;right:80px;top:64px;width:64px;height:64px;border-radius:50%;background:#F4C430;display:flex;align-items:center;justify-content:center;font-family:'Noto Sans Gurmukhi',sans-serif;font-size:30px;font-weight:700;color:#0A1E37}
</style></head><body><div class="wrap">
<svg viewBox="-6 -24 594 660" aria-hidden="true"><polygon points="${outline}" fill="#F4C430" fill-opacity=".10" stroke="#F4C430" stroke-opacity=".7" stroke-width="2.4" stroke-linejoin="round"/></svg>
<div class="mark">ੴ</div>
<div><div class="k">Serving Punjab since ${site.founded}</div><h1>${en.common.orgName}</h1></div>
<div><p>${en.common.metaDescription}</p><div class="url" style="margin-top:18px">langarsewa.org</div></div>
</div></body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1200, height: 630 },
  deviceScaleFactor: 1,
});
await page.setContent(html, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
const png = await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: 1200, height: 630 } });
await browser.close();
writeFileSync(resolve(root, 'public/og.png'), png);
console.log(`public/og.png written (${(png.length / 1024).toFixed(0)} KB)`);
