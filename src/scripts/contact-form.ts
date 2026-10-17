import { track } from '@/lib/analytics';

/**
 * Contact form: validates name, email and message, then opens the visitor's email app with
 * the message filled in (a mailto: URL in a new window, as in the reference). Messages and
 * the destination address come from data attributes rendered in the page language.
 */
export function initContactForm(): void {
  const form = document.getElementById('contact-form') as HTMLFormElement | null;
  const note = document.getElementById('form-note');
  if (!form || !note) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    let ok = true;
    for (const n of ['name', 'email', 'message'] as const) {
      const f = form.elements.namedItem(n) as HTMLInputElement | HTMLTextAreaElement | null;
      if (!f) continue;
      const bad = !f.value.trim() || (n === 'email' && !/^\S+@\S+\.\S+$/.test(f.value));
      f.classList.toggle('invalid', bad);
      if (bad) ok = false;
    }
    if (!ok) {
      note.textContent = form.dataset.msgInvalid || '';
      note.style.color = '#B23A2A';
      return;
    }
    const v = (n: string) => (form.elements.namedItem(n) as HTMLInputElement | null)?.value || '';
    const body = `Name: ${v('name')}\nEmail: ${v('email')}\nPhone: ${v('phone')}\n\n${v('message')}`;
    const to = form.dataset.email || '';
    window.open(
      `mailto:${to}?subject=${encodeURIComponent(`Website enquiry: ${v('topic')}`)}&body=${encodeURIComponent(body)}`,
      '_blank',
    );
    track('contact_send', { topic: v('topic') });
    note.style.color = '#2E7D46';
    note.textContent = form.dataset.msgSent || '';
  });

  document
    .querySelectorAll<HTMLAnchorElement>('[data-directions]')
    .forEach((a) => a.addEventListener('click', () => track('directions_click')));
}
