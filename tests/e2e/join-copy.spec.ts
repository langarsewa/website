/**
 * Copy buttons on Join the Sewa: clicking one writes the bank detail to the clipboard, swaps
 * the label to the in-page-language "Copied" text, then restores the original label.
 *
 *   pnpm build && pnpm exec playwright test tests/e2e/join-copy.spec.ts
 */
import { test, expect } from '@playwright/test';
import { serve } from '../lib/static-server.mjs';

type Served = Awaited<ReturnType<typeof serve>>;
let site: Served;

test.beforeAll(async () => {
  site = await serve('dist');
});

test.afterAll(async () => {
  await new Promise<void>((done) => site.server.close(() => done()));
});

test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

const pages = [
  { lang: 'en', path: '/join-the-sewa/', copy: 'Copy', copied: 'Copied' },
  { lang: 'pa', path: '/pa/join-the-sewa/', copy: 'ਕਾਪੀ', copied: 'ਕਾਪੀ ਹੋ ਗਿਆ' },
] as const;

const fields = [
  { field: 'account-name', value: 'Dhan Guru Ramdas Langar Sewa' },
  { field: 'account-number', value: '134005001208' },
  { field: 'ifsc', value: 'ICIC0001340' },
] as const;

for (const p of pages) {
  test.describe(`copy buttons [${p.lang}]`, () => {
    test('three buttons render with the page-language label', async ({ page }) => {
      await page.goto(`${site.url}${p.path}`, { waitUntil: 'load' });
      const buttons = page.locator('#india button.copy');
      await expect(buttons).toHaveCount(3);
      for (const f of fields) {
        const b = page.locator(`button.copy[data-field="${f.field}"]`);
        await expect(b).toHaveText(p.copy);
        await expect(b).toHaveAttribute('data-copy', f.value);
        await expect(b).toHaveAttribute('data-copied', p.copied);
      }
    });

    for (const f of fields) {
      test(`clicking ${f.field} copies the value and flips the label to "copied" and back`, async ({
        page,
      }) => {
        await page.goto(`${site.url}${p.path}`, { waitUntil: 'load' });
        const b = page.locator(`button.copy[data-field="${f.field}"]`);
        await b.scrollIntoViewIfNeeded();
        await b.click();

        await expect(b).toHaveText(p.copied);
        await expect(b).toHaveClass(/\bdone\b/);
        expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(f.value);

        await expect(b).toHaveText(p.copy, { timeout: 5_000 });
        await expect(b).not.toHaveClass(/\bdone\b/);
      });
    }
  });
}
