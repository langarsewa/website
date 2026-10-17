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
