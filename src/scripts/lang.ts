import { track } from '@/lib/analytics';

const KEY = 'dgrls-lang';
type Locale = 'en' | 'pa';

function pageLocale(): Locale {
  return document.documentElement.getAttribute('data-lang') === 'pa' ? 'pa' : 'en';
}

function read(): Locale | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'pa' || v === 'en' ? v : null;
  } catch {
    return null;
  }
}

function store(l: Locale): void {
  try {
    localStorage.setItem(KEY, l);
  } catch {
    /* private mode or storage disabled: the choice simply does not persist */
  }
}

function alternateUrl(): string {
  const href = document.querySelector<HTMLAnchorElement>('[data-togglelang]')?.getAttribute('href');
  return (href || '/') + location.hash;
}

/**
 * Applies the language rules and returns true when it navigated away:
 *  1. `?lang=pa` / `?lang=en` on any page opens that language, and is remembered.
 *  2. A direct visit to the front door (/ or /pa/) opens the remembered language.
 *  3. Otherwise the page's own language is remembered.
 */
export function initLang(): boolean {
  const locale = pageLocale();
  const params = new URLSearchParams(location.search);
  const q = params.get('lang');

  if (q === 'pa' || q === 'en') {
    store(q);
    if (q !== locale) {
      location.replace(alternateUrl());
      return true;
    }
    params.delete('lang');
    const search = params.toString();
    history.replaceState(
      null,
      '',
      location.pathname + (search ? `?${search}` : '') + location.hash,
    );
  } else {
    let internal = false;
    try {
      internal = !!document.referrer && new URL(document.referrer).origin === location.origin;
    } catch {
      internal = false;
    }
    // The remembered language applies to direct visits to the front door only (/ or /pa/).
    // A shared deep link always opens in the language it was shared in.
    const frontDoor = location.pathname === '/' || location.pathname === '/pa/';
    const remembered = read();
    if (!internal && frontDoor && remembered && remembered !== locale) {
      location.replace(alternateUrl());
      return true;
    }
    store(locale);
  }

  // Language links: remember the choice and carry the current section anchor across.
  document.addEventListener('click', (e) => {
    const a = (e.target as Element | null)?.closest<HTMLAnchorElement>(
      '[data-setlang], [data-togglelang]',
    );
    if (!a) return;
    const next =
      (a.getAttribute('data-setlang') as Locale | null) || (locale === 'pa' ? 'en' : 'pa');
    store(next);
    track('lang_toggle', { from: locale, to: next });
    if (location.hash && !a.hash) a.href = a.href.split('#')[0] + location.hash;
  });
  return false;
}
