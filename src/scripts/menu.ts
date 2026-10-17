const OPEN_ICON = 'M4 7h16M4 12h16M4 17h16';
const CLOSE_ICON = 'M6 6l12 12M18 6L6 18';

/** Mobile hamburger menu: toggle, Escape to close, focus trapped while open. */
export function initMenu(): void {
  const hdr = document.getElementById('hdr');
  const btn = document.getElementById('mbtn') as HTMLButtonElement | null;
  const icon = document.getElementById('mico');
  const panel = document.getElementById('mpanel');
  if (!hdr || !btn || !icon || !panel) return;

  const focusables = () =>
    [...hdr.querySelectorAll<HTMLElement>('a[href], button:not([disabled])')].filter(
      (el) => el.offsetParent !== null,
    );

  function setMenu(open: boolean): void {
    hdr!.classList.toggle('open', open);
    btn!.setAttribute('aria-expanded', open ? 'true' : 'false');
    btn!.setAttribute('aria-label', btn!.dataset[open ? 'labelClose' : 'labelOpen'] || '');
    icon!.setAttribute('d', open ? CLOSE_ICON : OPEN_ICON);
    if (!open && document.activeElement && panel!.contains(document.activeElement)) btn!.focus();
  }

  btn.addEventListener('click', () => setMenu(!hdr.classList.contains('open')));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      setMenu(false);
      return;
    }
    if (e.key !== 'Tab' || !hdr.classList.contains('open')) return;
    const items = focusables();
    if (!items.length) return;
    const first = items[0]!;
    const last = items[items.length - 1]!;
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });
}
