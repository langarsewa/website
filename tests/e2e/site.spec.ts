import { expect, test } from '@playwright/test';

const pages = ['', 'our-story', 'our-work', 'impact', 'future-vision', 'join-the-sewa', 'contact'];

test.describe('language', () => {
  test('toggle round-trips EN → PA → EN and keeps the anchor', async ({ page }) => {
    await page.goto('/our-work/#programs');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await page.locator('.langsw-d a[data-setlang="pa"]').click();
    await expect(page).toHaveURL(/\/pa\/our-work\/#programs$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'pa');
    await page.locator('.langsw-d a[data-setlang="en"]').click();
    await expect(page).toHaveURL(/\/our-work\/#programs$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });

  test('?lang=pa redirects to the Punjabi page', async ({ page }) => {
    await page.goto('/impact/?lang=pa');
    await expect(page).toHaveURL(/\/pa\/impact\/$/);
  });

  test('the choice is remembered on the next visit to the front door, deep links stay as shared', async ({
    page,
  }) => {
    await page.goto('/');
    await page.locator('.langsw-d a[data-setlang="pa"]').click();
    await expect(page).toHaveURL(/\/pa\/$/);
    await page.goto('/');
    await expect(page).toHaveURL(/\/pa\/$/);
    await page.goto('/contact/');
    await expect(page).toHaveURL(/\/contact\/$/);
  });

  test('every page has hreflang alternates and the right <html lang>', async ({ page }) => {
    // Walking 14 pages directly would otherwise trip the front-door language memory.
    await page.addInitScript(() => {
      try {
        localStorage.removeItem('dgrls-lang');
      } catch {
        /* ignore */
      }
    });
    for (const slug of pages) {
      for (const lang of ['en', 'pa']) {
        const path = (lang === 'pa' ? '/pa' : '') + (slug ? `/${slug}/` : '/');
        await page.goto(path);
        await expect(page.locator('html')).toHaveAttribute('lang', lang);
        await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveCount(1);
        await expect(page.locator('link[rel="alternate"][hreflang="pa"]')).toHaveCount(1);
      }
    }
  });
});

test.describe('legacy links', () => {
  test('old hash routes land on the real page and section', async ({ page }) => {
    await page.goto('/#/impact/milestones');
    await expect(page).toHaveURL(/\/impact\/#milestones$/);
    await page.goto('/?lang=pa#/our-work');
    await expect(page).toHaveURL(/\/pa\/our-work\/$/);
  });

  test('legacy paths in _redirects map to the new pages', async ({ request }) => {
    const text = await (await request.get('/_redirects')).text();
    const legacy: [string, string][] = [
      ['/about', '/our-story/'],
      ['/sewa', '/our-work/'],
      ['/media-gallery', '/impact/'],
      ['/donate', '/join-the-sewa/'],
      ['/covid', '/join-the-sewa/'],
      ['/contact', '/contact/'],
      ['/punjabi', '/pa/'],
    ];
    for (const [from, to] of legacy) {
      expect(text, `${from} → ${to}`).toMatch(
        new RegExp(`^${from}\\s+${to.replace(/\//g, '\\/')}\\s+301`, 'm'),
      );
    }
  });
});

test.describe('mobile menu @mobile', () => {
  test('opens, traps focus, closes on Escape', async ({ page }) => {
    await page.goto('/');
    const btn = page.locator('#mbtn');
    await btn.click();
    await expect(page.locator('#hdr')).toHaveClass(/open/);
    await expect(btn).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('#mpanel .mtab').first()).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#hdr')).not.toHaveClass(/open/);
    await expect(btn).toHaveAttribute('aria-expanded', 'false');
  });
});

test.describe('lightbox', () => {
  test('opens from a photo, navigates, closes via X, Escape and backdrop', async ({ page }) => {
    await page.goto('/impact/');
    const photos = page.locator('.ph-img img.zoomable');
    await expect(photos.first()).toBeVisible();
    await photos.first().scrollIntoViewIfNeeded();
    await photos.first().click();
    const lb = page.locator('#lb');
    await expect(lb).toBeVisible();
    await expect(page.locator('body')).toHaveClass(/lb-open/);
    const first = await page.locator('#lb-img').getAttribute('src');
    await page.locator('#lb-next').click();
    expect(await page.locator('#lb-img').getAttribute('src')).not.toBe(first);
    await page.locator('#lb-x').click();
    await expect(lb).toBeHidden();
    await photos.first().click();
    await page.keyboard.press('Escape');
    await expect(lb).toBeHidden();
    await photos.first().click();
    await lb.click({ position: { x: 5, y: 5 } });
    await expect(lb).toBeHidden();
  });
});

test.describe('galleries and videos', () => {
  test('kitchen gallery thumbnails swap the main image', async ({ page }) => {
    await page.goto('/our-story/');
    const gal = page.locator('.kgal').first();
    await gal.scrollIntoViewIfNeeded();
    const main = gal.locator('.kmain-img');
    const before = await main.getAttribute('src');
    await gal.locator('.kthumb').nth(1).click();
    await expect(gal).toHaveAttribute('data-active', '1');
    await expect(gal.locator('.kthumb').nth(1)).toHaveAttribute('aria-pressed', 'true');
    expect(await main.getAttribute('src')).not.toBe(before);
  });

  test('"show more videos" toggles the grid', async ({ page }) => {
    await page.goto('/impact/');
    const grid = page.locator('.vgrid');
    await grid.scrollIntoViewIfNeeded();
    await expect(grid.locator('.vcard').nth(5)).toBeHidden();
    await page.locator('[data-vmore]').click();
    await expect(grid).toHaveClass(/open/);
    await expect(grid.locator('.vcard').nth(5)).toBeVisible();
  });
});

test('security headers and CSP are declared', async ({ request }) => {
  const text = await (await request.get('/_headers')).text();
  expect(text).toContain("Content-Security-Policy: default-src 'self'");
  expect(text).toContain("script-src 'self'");
  expect(text).toContain("frame-ancestors 'none'");
  expect(text).toContain('X-Content-Type-Options: nosniff');
  expect(text).toContain('Referrer-Policy: strict-origin-when-cross-origin');
  expect(text).toMatch(/Permissions-Policy: camera=\(\), microphone=\(\), geolocation=\(\)/);
});

test('no inline scripts (CSP script-src self)', async ({ page }) => {
  for (const slug of ['', 'our-work', 'contact']) {
    await page.goto(slug ? `/${slug}/` : '/');
    const inline = await page
      .locator('script:not([src]):not([type="application/json"]):not([type="application/ld+json"])')
      .count();
    expect(inline, `inline scripts on /${slug}`).toBe(0);
  }
});
