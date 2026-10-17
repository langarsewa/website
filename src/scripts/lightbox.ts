import { track } from '@/lib/analytics';

/**
 * Site-wide photo viewer. Every <img> inside a `.ph-img` that is not itself a link becomes
 * zoomable. Kitchen galleries (`.kgal`) browse only their own thumbnails, at full size.
 */
export function initLightbox(): void {
  const lb = document.getElementById('lb');
  const im = document.getElementById('lb-img') as HTMLImageElement | null;
  const cap = document.getElementById('lb-cap');
  const cnt = document.getElementById('lb-count');
  const prev = document.getElementById('lb-prev') as HTMLButtonElement | null;
  const next = document.getElementById('lb-next') as HTMLButtonElement | null;
  const x = document.getElementById('lb-x') as HTMLButtonElement | null;
  if (!lb || !im || !cap || !cnt || !prev || !next || !x) return;

  let list: HTMLImageElement[] = [];
  let idx = 0;
  let last: Element | null = null;
  let tx = 0;
  let ty = 0;

  const fullSrc = (img: HTMLImageElement) =>
    img.closest<HTMLElement>('[data-full]')?.dataset.full || img.currentSrc || img.src;

  function show(i: number): void {
    idx = (i + list.length) % list.length;
    const src = list[idx]!;
    im!.src = fullSrc(src);
    im!.alt = src.alt || '';
    cap!.textContent = src.alt || '';
    cnt!.textContent = list.length > 1 ? `${idx + 1} / ${list.length}` : '';
    prev!.hidden = next!.hidden = list.length < 2;
  }

  function open(img: HTMLImageElement): void {
    const page = img.closest('.page') || document;
    const gallery = img.closest<HTMLElement>('.kgal');
    list = gallery
      ? [...gallery.querySelectorAll<HTMLImageElement>('.kthumb img')]
      : [...page.querySelectorAll<HTMLImageElement>('img.zoomable')];
    last = document.activeElement;
    show(gallery ? Number(gallery.getAttribute('data-active') || 0) : list.indexOf(img));
    lb!.hidden = false;
    document.body.classList.add('lb-open');
    x!.focus();
  }

  function close(): void {
    if (lb!.hidden) return;
    lb!.hidden = true;
    document.body.classList.remove('lb-open');
    im!.src = '';
    if (last instanceof HTMLElement) last.focus();
  }

  x.addEventListener('click', close);
  prev.addEventListener('click', (e) => {
    e.stopPropagation();
    show(idx - 1);
  });
  next.addEventListener('click', (e) => {
    e.stopPropagation();
    show(idx + 1);
  });
  lb.addEventListener('click', (e) => {
    const t = e.target as Element;
    if (t === lb || t.classList.contains('lb-fig')) close();
  });
  document.addEventListener('keydown', (e) => {
    if (lb.hidden) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    } else if (e.key === 'ArrowLeft') show(idx - 1);
    else if (e.key === 'ArrowRight') show(idx + 1);
    else if (e.key === 'Tab') {
      const f = [...lb.querySelectorAll<HTMLButtonElement>('button:not([hidden])')];
      const i = f.indexOf(document.activeElement as HTMLButtonElement);
      e.preventDefault();
      f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length]!.focus();
    }
  });
  lb.addEventListener(
    'touchstart',
    (e) => {
      tx = e.touches[0]!.clientX;
      ty = e.touches[0]!.clientY;
    },
    { passive: true },
  );
  lb.addEventListener(
    'touchend',
    (e) => {
      const dx = e.changedTouches[0]!.clientX - tx;
      const dy = e.changedTouches[0]!.clientY - ty;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) show(idx + (dx < 0 ? 1 : -1));
      else if (dy > 80 && Math.abs(dy) > Math.abs(dx)) close();
    },
    { passive: true },
  );
  window.addEventListener('hashchange', close);

  const hint =
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>';
  document.querySelectorAll<HTMLImageElement>('.ph-img img').forEach((img) => {
    if (img.closest('a')) return;
    img.classList.add('zoomable');
    img.setAttribute('tabindex', '0');
    img.setAttribute('role', 'button');
    const h = document.createElement('span');
    h.className = 'zhint';
    h.setAttribute('aria-hidden', 'true');
    h.innerHTML = hint;
    (img.closest('.ph-img') || img.parentNode!).appendChild(h);
    const go = () => {
      open(img);
      track('video_open', { kind: 'photo' });
    };
    img.addEventListener('click', go);
    img.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        go();
      }
    });
  });
}
