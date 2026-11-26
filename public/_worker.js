/**
 * Cloudflare Pages advanced-mode worker. public/_routes.json limits it to the Join the Sewa
 * pages and /videos/*; every other request is served as a static asset without running this code.
 *
 * It tags <html> with data-region="in" or "us" so join.css shows only that region's way to
 * contribute. Order of precedence: ?from=in|us (sets a cookie), the dgrls-region cookie, then
 * Cloudflare's country for the request (IN → in, anything else → us). Without this worker
 * (local preview, tests) there is no tag and the page shows both regions, as before.
 *
 * It also answers HTTP Range requests for /videos/*. Pages static assets always send the whole
 * file with a 200, and Safari (every iOS browser) will not play a <video> without 206 partial
 * responses. Files there stay under the 25 MB Pages limit, so slicing in memory is cheap.
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

const VIDEO = /^\/videos\/[\w-]+\.mp4$/;

/** One byte range from a Range header, or null when absent, multi-range or malformed. */
function parseRange(header, size) {
  const m = /^bytes=(\d*)-(\d*)$/.exec((header || '').trim());
  if (!m || (m[1] === '' && m[2] === '')) return null;
  let start;
  let end;
  if (m[1] === '') {
    start = Math.max(0, size - Number(m[2]));
    end = size - 1;
  } else {
    start = Number(m[1]);
    end = m[2] === '' ? size - 1 : Math.min(Number(m[2]), size - 1);
  }
  return { start, end };
}

async function serveVideo(request, env) {
  const headers = new Headers(request.headers);
  headers.delete('Range');
  headers.delete('If-None-Match');
  headers.delete('If-Modified-Since');
  const asset = await env.ASSETS.fetch(new Request(request.url, { method: 'GET', headers }));
  if (asset.status !== 200) return asset;
  const out = new Headers(asset.headers);
  out.set('Accept-Ranges', 'bytes');
  const rangeHeader = request.headers.get('Range');
  if (!rangeHeader) {
    return new Response(request.method === 'HEAD' ? null : asset.body, {
      status: 200,
      headers: out,
    });
  }
  const body = await asset.arrayBuffer();
  const size = body.byteLength;
  const range = parseRange(rangeHeader, size);
  if (!range) return new Response(body, { status: 200, headers: out });
  if (range.start >= size || range.start > range.end) {
    out.set('Content-Range', `bytes */${size}`);
    out.delete('Content-Length');
    return new Response(null, { status: 416, headers: out });
  }
  out.set('Content-Range', `bytes ${range.start}-${range.end}/${size}`);
  out.set('Content-Length', String(range.end - range.start + 1));
  const slice = body.slice(range.start, range.end + 1);
  return new Response(request.method === 'HEAD' ? null : slice, { status: 206, headers: out });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if ((request.method === 'GET' || request.method === 'HEAD') && VIDEO.test(url.pathname)) {
      return serveVideo(request, env);
    }
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
