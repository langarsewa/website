/**
 * Kitchen galleries: a main image plus a thumbnail strip. Each `.kthumb` carries
 * `data-full` (the full-size URL) so the main image never shows an upscaled thumbnail.
 */
export function initGalleries(): void {
  document.querySelectorAll<HTMLElement>('.kgal').forEach((g) => {
    const main = g.querySelector<HTMLImageElement>('.kmain-img');
    const thumbs = [...g.querySelectorAll<HTMLButtonElement>('.kthumb')];
    if (!main || !thumbs.length) return;

    function set(n: number, swap = true): void {
      const t = thumbs[n]!;
      const img = t.querySelector('img');
      const full = t.dataset.full || img?.currentSrc || img?.src || '';
      if (swap && main!.getAttribute('src') !== full) {
        // Photo renders <picture><source type="image/avif">…<img>. The browser paints the
        // <source>, so changing only img.src leaves the old photo on screen. Drop the sources
        // once; from then on the <img> alone decides what is shown.
        main!.parentElement?.querySelectorAll('source').forEach((s) => s.remove());
        main!.removeAttribute('srcset');
        main!.removeAttribute('sizes');
        main!.src = full;
      }
      if (swap) main!.alt = img?.getAttribute('alt') || '';
      g.setAttribute('data-active', String(n));
      thumbs.forEach((b, k) => {
        b.classList.toggle('on', k === n);
        b.setAttribute('aria-pressed', k === n ? 'true' : 'false');
      });
    }
    thumbs.forEach((b, n) => b.addEventListener('click', () => set(n)));
    // On load the server-rendered image is already the active one; only sync the thumb state.
    set(Number(g.getAttribute('data-active') || 0), false);
  });
}
