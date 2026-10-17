/**
 * Analytics is off by default (site.json -> analytics.enabled). When it is on, Base.astro
 * loads the Cloudflare Web Analytics beacon and these helpers forward named events.
 * While it is off every call is a no-op, so components can call track() unconditionally.
 */
export type EventName =
  'lang_toggle' | 'copy_bank_detail' | 'contact_send' | 'directions_click' | 'video_open';

export interface EventProps {
  [key: string]: string | number | boolean;
}

declare global {
  interface Window {
    __dgrlsAnalytics?: { enabled: boolean };
  }
}

export function isEnabled(): boolean {
  return typeof window !== 'undefined' && window.__dgrlsAnalytics?.enabled === true;
}

export function track(name: EventName, props: EventProps = {}): void {
  if (!isEnabled()) return;
  // Cloudflare Web Analytics has no custom-event API; events are emitted as a DOM event
  // so a future collector (or the beacon's successor) can subscribe without code changes.
  document.dispatchEvent(new CustomEvent('dgrls:track', { detail: { name, props } }));
}
