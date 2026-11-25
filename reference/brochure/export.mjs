// Renders brochure.html to brochure.pdf (2 pages, Letter landscape) and PNG previews.
// Run from the repo root: node reference/brochure/export.mjs
import { chromium } from '@playwright/test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
const dir = dirname(fileURLToPath(import.meta.url));
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1056, height: 816 }, deviceScaleFactor: 2 });
await p.goto(pathToFileURL(join(dir, 'brochure.html')).href, { waitUntil: 'networkidle' });
await p.evaluate(() => document.fonts.ready);
await p.pdf({ path: join(dir, 'brochure.pdf'), width: '11in', height: '8.5in', printBackground: true, preferCSSPageSize: true });
const sheets = p.locator('.sheet');
await sheets.nth(0).screenshot({ path: join(dir, 'preview-outside.png') });
await sheets.nth(1).screenshot({ path: join(dir, 'preview-inside.png') });
await b.close();
console.log('ok');
