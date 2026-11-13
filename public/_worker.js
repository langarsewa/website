/**
 * Cloudflare Pages advanced-mode worker. public/_routes.json limits it to the Join the Sewa
 * pages; every other request is served as a static asset without running this code.
 *
 * It tags <html> with data-region="in" or "us" so join.css shows only that region's way to
 * contribute. Order of precedence: ?from=in|us (sets a cookie), the dgrls-region cookie, then
 * Cloudflare's country for the request (IN → in, anything else → us). Without this worker
 * (local preview, tests) there is no tag and the page shows both regions, as before.
 */
const JOIN_PAGE = /^\/(pa\/)?join-the-sewa\/?$/;
const COOKIE = 'dgrls-region';
const REGIONS = new Set(['in', 'us']);

function regionFor(request, url) {
  const asked = url.searchParams.get('from');
  if (REGIONS.has(asked)) return { region: asked, remember: true };
  const match = new RegExp(`(?:^|;\\s*)${COOKIE}=(in|us)(?:;|$)`).exec(
    request.headers.get('Cookie') || '',
  );
  if (match) return { region: match[1], remember: false };
  const country = request.cf && request.cf.country;
  return { region: country === 'IN' ? 'in' : 'us', remember: false };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const isPage =
      (request.method === 'GET' || request.method === 'HEAD') && JOIN_PAGE.test(url.pathname);
    const asset = await env.ASSETS.fetch(request);
    if (!isPage || !(asset.headers.get('content-type') || '').includes('text/html')) return asset;

    const { region, remember } = regionFor(request, url);
    const tagged = new HTMLRewriter()
      .on('html', {
        element(el) {
          el.setAttribute('data-region', region);
        },
      })
      .on(`a[data-region-opt="${region}"]`, {
        element(el) {
          el.setAttribute('aria-current', 'true');
        },
      })
      .transform(asset);

    const res = new Response(tagged.body, tagged);
    // The page differs by visitor, so no shared caching of this HTML.
    res.headers.set('Cache-Control', 'private, no-cache');
    res.headers.append('Vary', 'Cookie');
    if (remember) {
      res.headers.append(
        'Set-Cookie',
        `${COOKIE}=${region}; Path=/; Max-Age=31536000; SameSite=Lax; Secure`,
      );
    }
    return res;
  },
};
