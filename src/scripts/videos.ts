/** "Show 5 more videos" toggle on the Impact page. The grid is the toggle's previous sibling. */
export function initVideoToggle(): void {
  document.addEventListener('click', (e) => {
    const b = (e.target as Element | null)?.closest<HTMLElement>('[data-vmore]');
    if (!b) return;
    const grid = b.parentElement?.previousElementSibling;
    if (!grid) return;
    grid.classList.toggle('open');
    if (!grid.classList.contains('open')) grid.scrollIntoView({ block: 'nearest' });
  });
}

/**
 * Click-to-play YouTube tiles (`a[data-yt]`). The link to YouTube stays the no-JS fallback;
 * with JS the tile is swapped for a privacy-enhanced embed that starts and stops on the
 * clip's `data-start` / `data-end` seconds. Nothing loads from YouTube until the click.
 */
export function initInlineVideos(): void {
  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
      return;
    const a = (e.target as Element | null)?.closest<HTMLAnchorElement>('a[data-yt]');
    if (!a) return;
    const id = a.dataset.yt ?? '';
    if (!/^[\w-]{11}$/.test(id)) return;
    e.preventDefault();
    const q = new URLSearchParams({ autoplay: '1', rel: '0', playsinline: '1' });
    if (a.dataset.start) q.set('start', a.dataset.start);
    if (a.dataset.end) q.set('end', a.dataset.end);
    const frame = document.createElement('iframe');
    frame.src = `https://www.youtube-nocookie.com/embed/${id}?${q}`;
    frame.title = a.getAttribute('aria-label') ?? 'YouTube video';
    frame.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    frame.referrerPolicy = 'strict-origin-when-cross-origin';
    const box = document.createElement('div');
    box.className = `${a.className.replace(/\bvtile\b/, '').trim()} vembed`;
    const style = a.getAttribute('style');
    if (style) box.setAttribute('style', style);
    box.appendChild(frame);
    a.replaceWith(box);
    frame.focus();
  });
}
