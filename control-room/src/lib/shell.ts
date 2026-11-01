/**
 * Shared page behaviour: identity in the header, the error banner with retry, the 403 screen.
 * Every page calls `boot(load)` where `load` fetches its data and paints.
 */
import { ApiError, accessIdentityEmail, api, emailIn, isMockMode, mockScene } from './api';
import { firstName, initials } from './people';
import { byId, h, replaceChildren, show } from './dom';
import type { Me } from './types';

let cachedMe: Promise<Me | null> | null = null;

/** The signed-in person, or null when /api/me is unavailable. Fills the header avatar as a side effect. */
export function whoAmI(): Promise<Me | null> {
  if (!cachedMe) {
    cachedMe = api
      .me()
      .then((me) => {
        paintIdentity(me);
        return me;
      })
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.isForbidden) showForbidden(err);
        return null;
      });
  }
  return cachedMe;
}

function paintIdentity(me: Me): void {
  const name = firstName(me.email);
  for (const el of document.querySelectorAll<HTMLElement>('[data-me-initials]')) {
    el.textContent = initials(me.email) || '?';
    el.setAttribute('title', me.email);
    el.setAttribute('aria-label', `Signed in as ${me.email}`);
  }
  for (const el of document.querySelectorAll<HTMLElement>('[data-me-name]')) {
    el.textContent = name;
  }
  for (const el of document.querySelectorAll<HTMLElement>('[data-me-line]')) {
    el.textContent = `Signed in as ${name}`;
  }
  document.documentElement.dataset.role = me.role;
}

export async function showForbidden(err: ApiError): Promise<void> {
  const screen = byId('forbidden');
  const emailEl = byId('forbidden-email');
  const email = emailIn(err.message) ?? (await accessIdentityEmail());
  emailEl.textContent = email ?? 'the account you signed in with';
  document.body.dataset.state = 'forbidden';
  show(screen);
  for (const main of document.querySelectorAll<HTMLElement>('[data-page]')) show(main, false);
  for (const el of document.querySelectorAll<HTMLElement>('[data-page-footer]')) show(el, false);
}

export function showErrorBanner(err: unknown, retry: () => void): void {
  const banner = byId('error-banner');
  const text = byId('error-banner-text');
  const message =
    err instanceof ApiError
      ? err.isNetwork
        ? 'Could not reach the control room. Check your connection and try again.'
        : `Could not reach the control room. ${err.message}`
      : 'Could not reach the control room.';
  text.textContent = message;
  const button = byId<HTMLButtonElement>('error-banner-retry');
  const fresh = button.cloneNode(true) as HTMLButtonElement;
  fresh.addEventListener('click', () => {
    hideErrorBanner();
    retry();
  });
  button.replaceWith(fresh);
  show(banner);
}

export function hideErrorBanner(): void {
  show(byId('error-banner'), false);
}

/**
 * Runs a page's loader with the standard error handling: 403 shows the not-on-the-list screen,
 * anything else shows the banner with a retry that re-runs the loader.
 */
export async function boot(load: () => Promise<void>): Promise<void> {
  paintMockBadge();
  const run = async () => {
    hideErrorBanner();
    try {
      await load();
    } catch (err) {
      if (err instanceof ApiError && err.isForbidden) {
        await showForbidden(err);
        return;
      }
      console.error(err);
      showErrorBanner(err, () => void run());
    }
  };
  await run();
}

function paintMockBadge(): void {
  if (!isMockMode()) return;
  const slot = document.getElementById('mock-badge');
  if (!slot) return;
  replaceChildren(slot, h('span', { class: 'mock-badge' }, `Sample data: ${mockScene()}`));
  show(slot);
}
