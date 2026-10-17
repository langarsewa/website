/**
 * Contact form behaviour, as in the reference: an empty submit is rejected with the
 * in-page-language message and `.invalid` on the required fields; a valid submit opens a
 * `mailto:` window and shows the "opening your email app" message.
 *
 *   pnpm build && pnpm exec playwright test tests/e2e/contact-form.spec.ts
 */
import { test, expect, type Page } from '@playwright/test';
import { serve } from '../lib/static-server.mjs';

type Served = Awaited<ReturnType<typeof serve>>;
let site: Served;

declare global {
  interface Window {
    /** URLs passed to window.open, recorded by the init script in the mailto test. */
    __opened?: string[];
  }
}

test.beforeAll(async () => {
  site = await serve('dist');
});

test.afterAll(async () => {
  await new Promise<void>((done) => site.server.close(() => done()));
});

const pages = [
  {
    lang: 'en',
    path: '/contact/',
    invalid: 'Please add your name, a valid email and a message.',
    sent: 'Opening your email app with the message ready to send.',
  },
  {
    lang: 'pa',
    path: '/pa/contact/',
    invalid: 'ਕਿਰਪਾ ਕਰਕੇ ਆਪਣਾ ਨਾਮ, ਸਹੀ ਈਮੇਲ ਅਤੇ ਸੁਨੇਹਾ ਲਿਖੋ।',
    sent: 'ਤੁਹਾਡੀ ਈਮੇਲ ਐਪ ਸੁਨੇਹੇ ਸਮੇਤ ਖੁੱਲ੍ਹ ਰਹੀ ਹੈ।',
  },
] as const;

async function open(page: Page, path: string) {
  await page.goto(`${site.url}${path}`, { waitUntil: 'load' });
  await expect(page.locator('#contact-form')).toBeVisible();
}

for (const p of pages) {
  test.describe(`contact form [${p.lang}]`, () => {
    test('empty submit shows the invalid message and marks the required fields', async ({
      page,
    }) => {
      await open(page, p.path);
      await page.locator('#contact-form button[type="submit"]').click();

      await expect(page.locator('#form-note')).toHaveText(p.invalid);
      for (const name of ['name', 'email', 'message']) {
        await expect(page.locator(`#contact-form [name="${name}"]`)).toHaveClass(/\binvalid\b/);
      }
      await expect(page.locator('#contact-form [name="phone"]')).not.toHaveClass(/\binvalid\b/);
      expect(page.url()).toBe(`${site.url}${p.path}`);
    });

    test('a bad email alone keeps the form on the invalid message', async ({ page }) => {
      await open(page, p.path);
      await page.fill('#contact-form [name="name"]', 'Test Visitor');
      await page.fill('#contact-form [name="email"]', 'not-an-email');
      await page.fill('#contact-form [name="message"]', 'Hello');
      await page.locator('#contact-form button[type="submit"]').click();

      await expect(page.locator('#form-note')).toHaveText(p.invalid);
      await expect(page.locator('#contact-form [name="email"]')).toHaveClass(/\binvalid\b/);
      await expect(page.locator('#contact-form [name="name"]')).not.toHaveClass(/\binvalid\b/);
    });

    test('a valid submit opens a mailto: window and shows the sent message', async ({ page }) => {
      // Chromium hands a mailto: window straight to the OS mail handler: the window target is
      // created (visible over CDP with an empty URL) but never commits a navigation, so
      // Playwright emits no 'popup' / 'page' event for it. The real window.open call is
      // observed instead: an init script records its arguments and still calls through.
      await page.addInitScript(() => {
        const original = window.open.bind(window);
        const opened: string[] = [];
        window.__opened = opened;
        window.open = (url?: string | URL, target?: string, features?: string) => {
          opened.push(String(url ?? ''));
          return original(url, target, features);
        };
      });
      await open(page, p.path);
      await page.fill('#contact-form [name="name"]', 'Test Visitor');
      await page.fill('#contact-form [name="email"]', 'visitor@example.com');
      await page.fill('#contact-form [name="phone"]', '+91 00000 00000');
      await page.selectOption('#contact-form [name="topic"]', { index: 1 }); // "Volunteer" in both languages
      await page.fill('#contact-form [name="message"]', 'I would like to help on Sundays.');

      const popup = page.waitForEvent('popup', { timeout: 3_000 }).catch(() => null);
      await page.locator('#contact-form button[type="submit"]').click();

      await expect(page.locator('#form-note')).toHaveText(p.sent);
      const opened = await page.evaluate(() => window.__opened ?? []);
      expect(opened).toHaveLength(1);
      const url = opened[0] ?? '';
      expect(url.startsWith('mailto:info@langarsewa.org?')).toBe(true);
      const decoded = decodeURIComponent(url);
      expect(decoded).toContain('subject=Website enquiry: Volunteer');
      expect(decoded).toContain('Name: Test Visitor');
      expect(decoded).toContain('Email: visitor@example.com');
      expect(decoded).toContain('I would like to help on Sundays.');
      // If the browser does surface the window, its URL must be the same mailto: link.
      const mail = await popup;
      if (mail) {
        expect(mail.url().startsWith('mailto:')).toBe(true);
        await mail.close().catch(() => {});
      }
      for (const name of ['name', 'email', 'message']) {
        await expect(page.locator(`#contact-form [name="${name}"]`)).not.toHaveClass(/\binvalid\b/);
      }
    });
  });
}
