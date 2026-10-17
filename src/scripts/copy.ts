import { track } from '@/lib/analytics';

/**
 * "Copy" buttons next to bank details. `data-copy` holds the value, `data-copied` the
 * confirmation label in the page language. Falls back to a text selection + execCommand
 * where the Clipboard API is unavailable (older in-app browsers).
 */
export function initCopyButtons(): void {
  document.addEventListener('click', (e) => {
    const b = (e.target as Element | null)?.closest<HTMLButtonElement>('.copy');
    if (!b) return;
    const value = b.getAttribute('data-copy') || '';
    const original = b.dataset.label || (b.dataset.label = b.textContent || '');

    const ok = () => {
      b.textContent = b.dataset.copied || 'Copied';
      b.classList.add('done');
      track('copy_bank_detail', { field: b.dataset.field || '' });
      setTimeout(() => {
        b.textContent = original;
        b.classList.remove('done');
      }, 1600);
    };
    const fallback = () => {
      const v = b.parentElement?.querySelector('.acc-v');
      if (!v) return;
      const r = document.createRange();
      r.selectNodeContents(v);
      const sel = getSelection();
      sel?.removeAllRanges();
      sel?.addRange(r);
      try {
        document.execCommand('copy');
        ok();
      } catch {
        /* nothing more we can do without clipboard permissions */
      }
    };
    try {
      navigator.clipboard.writeText(value).then(ok, fallback);
    } catch {
      fallback();
    }
  });
}
