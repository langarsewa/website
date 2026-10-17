/**
 * Locations map on Our Work: filter chips, search, pin and list selection, keyboard activation
 * and the collapsed list on small screens. Self-contained: serves dist/ itself, so run
 * `pnpm build` first. Works with or without a playwright.config (baseURL is set here).
 *
 *   npx playwright test tests/e2e/our-work-map.spec.ts
 */
import { expect, test, type Page } from '@playwright/test';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../lib/static-server.mjs';

const root = resolve(fileURLToPath(import.meta.url), '..', '..', '..');
let server: { server: { close(): void }; url: string };

test.beforeAll(async () => {
  server = await serve(resolve(root, 'dist'));
});
test.afterAll(() => server.server.close());

async function open(page: Page, path: string): Promise<void> {
  await page.goto(server.url + path, { waitUntil: 'load' });
  await expect(page.locator('#loccount')).not.toHaveText(/^32 /); // map.ts has run
}

test('renders all 38 locations as pins and rows', async ({ page }) => {
  await open(page, '/our-work/');
  await expect(page.locator('.pin')).toHaveCount(38);
  await expect(page.locator('.loc')).toHaveCount(38);
  await expect(page.locator('#loccount')).toHaveText('38 locations');
  for (let i = 0; i < 38; i++) {
    await expect(page.locator(`.pin[data-i="${i}"]`)).toHaveCount(1);
    await expect(page.locator(`.loc[data-i="${i}"]`)).toHaveCount(1);
  }
});

test('region chips filter pins and rows and update the count', async ({ page }) => {
  await open(page, '/our-work/');
  await page.locator('.rchip[data-r="Doaba"]').click();
  await expect(page.locator('.rchip.on')).toHaveAttribute('data-r', 'Doaba');
  await expect(page.locator('#loccount')).toHaveText('13 locations');
  await expect(page.locator('.loc:visible')).toHaveCount(13);
  await expect(page.locator('.pin.dim')).toHaveCount(25);
  await page.locator('.rchip[data-r="Chandigarh"]').click();
  await expect(page.locator('#loccount')).toHaveText('1 location');
  await page.locator('.rchip[data-r="All"]').click();
  await expect(page.locator('#loccount')).toHaveText('38 locations');
});

test('search matches English and Punjabi names', async ({ page }) => {
  await open(page, '/our-work/');
  await page.locator('#locq').fill('ludhiana');
  await expect(page.locator('#loccount')).toHaveText('2 locations');
  await expect(page.locator('.loc:visible')).toHaveCount(2);
  await page.locator('#locq').fill('ਲੁਧਿਆਣਾ');
  await expect(page.locator('#loccount')).toHaveText('2 locations');
  await page.locator('#locq').fill('');
  await expect(page.locator('#loccount')).toHaveText('38 locations');
});

test('clicking a pin selects the row and fills the info panel', async ({ page }) => {
  await open(page, '/our-work/');
  await page.locator('.pin[data-i="31"]').click();
  await expect(page.locator('.pin.sel')).toHaveAttribute('data-i', '31');
  await expect(page.locator('.loc.sel')).toHaveAttribute('data-i', '31');
  await expect(page.locator('#mapinfo .mi-k')).toHaveText('Doaba · Kitchen');
  await expect(page.locator('#mapinfo .mi-n')).toHaveText('Pur Heeran Kitchen, Hoshiarpur');
  await expect(page.locator('#mapinfo .mi-d')).toHaveText('Fresh Langar prepared here daily.');
});

test('clicking a row selects the pin and shows hospital hours', async ({ page }) => {
  await open(page, '/our-work/');
  await page.locator('.loc[data-i="0"]').click();
  await expect(page.locator('.pin.sel')).toHaveAttribute('data-i', '0');
  await expect(page.locator('#mapinfo .mi-k')).toHaveText('Chandigarh · Hospital');
  await expect(page.locator('#mapinfo .mi-n')).toHaveText('PGI Chandigarh');
  await expect(page.locator('#mapinfo .mi-d')).toHaveText('Langar served 10:00 AM – 4:00 PM');
  await page.locator('.loc[data-i="33"]').click();
  await expect(page.locator('#mapinfo .mi-k')).toHaveText('Doaba · School & community');
});

test('Enter and Space on a focused pin select it', async ({ page }) => {
  await open(page, '/our-work/');
  await page.locator('.pin[data-i="2"]').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#mapinfo .mi-n')).toHaveText('DMC, Ludhiana');
  await page.locator('.pin[data-i="4"]').focus();
  await page.keyboard.press(' ');
  await expect(page.locator('#mapinfo .mi-n')).toHaveText('Guru Nanak Dev Hospital, Amritsar');
});

test('Punjabi page uses Punjabi labels', async ({ page }) => {
  await open(page, '/pa/our-work/');
  await expect(page.locator('#loccount')).toHaveText('38 ਸਥਾਨ');
  await page.locator('.rchip[data-r="Majha"]').click();
  await expect(page.locator('#loccount')).toHaveText('7 ਸਥਾਨ');
  await page.locator('.pin[data-i="36"]').click();
  await expect(page.locator('#mapinfo .mi-k')).toHaveText('ਮਾਝਾ · ਸਕੂਲ ਅਤੇ ਭਾਈਚਾਰਾ');
  await expect(page.locator('#mapinfo .mi-n')).toHaveText('ਬੱਸ ਅੱਡਾ ਅਤੇ ਰੇਲਵੇ ਸਟੇਸ਼ਨ, ਅੰਮ੍ਰਿਤਸਰ');
  await expect(page.locator('#mapinfo .mi-d')).toHaveText('ਲੰਗਰ ਸਵੇਰੇ 10:00 ਤੋਂ ਸ਼ਾਮ 4:00 ਵਜੇ ਤੱਕ');
});

test('on a phone the list is collapsed until "Show all locations"', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await open(page, '/our-work/');
  await expect(page.locator('#loclist')).toHaveClass(/collapsed/);
  await expect(page.locator('.loc:visible')).toHaveCount(8);
  await expect(page.locator('#locmore')).toBeVisible();
  await page.locator('#locmore').click();
  await expect(page.locator('#loclist')).not.toHaveClass(/collapsed/);
  await expect(page.locator('.loc:visible')).toHaveCount(38);
  await expect(page.locator('#locmore')).toBeHidden();
});
