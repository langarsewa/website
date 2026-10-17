/** Reads the analytics flag that Base.astro renders onto <html data-analytics>. */
export function initAnalytics(): void {
  window.__dgrlsAnalytics = {
    enabled: document.documentElement.getAttribute('data-analytics') === 'on',
  };
}
