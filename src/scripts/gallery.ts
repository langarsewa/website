/**
 * Kitchen galleries: a main image plus a thumbnail strip. Each `.kthumb` carries
 * `data-full` (the full-size URL) so the main image never shows an upscaled thumbnail.
 */
export function initGalleries(): void {
  document.querySelectorAll<HTMLElement>('.kgal').forEach((g) => {
    const main = g.querySelector<HTMLImageElement>('.kmain-img');
    const thumbs = [...g.querySelectorAll<HTMLButtonElement>('.kthumb')];
    if (!main || !thumbs.length) return;

    function set(n: number): void {
      const t = thumbs[n]!;
      const img = t.querySelector('img');
      const full = t.dataset.full || img?.currentSrc || img?.src || '';
      if (main!.getAttribute('src') !== full) {
        main!.removeAttribute('srcset');
        main!.src = full;
      }
      main!.alt = img?.getAttribute('alt') || '';
      g.setAttribute('data-active', String(n));
      thumbs.forEach((b, k) => {
        b.classList.toggle('on', k === n);
        b.setAttribute('aria-pressed', k === n ? 'true' : 'false');
      });
    }
    thumbs.forEach((b, n) => b.addEventListener('click', () => set(n)));
    set(Number(g.getAttribute('data-active') || 0));
  });
}
