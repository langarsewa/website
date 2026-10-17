import en from '@/content/i18n/en.json';
import pa from '@/content/i18n/pa.json';

export type Locale = 'en' | 'pa';
export const locales: readonly Locale[] = ['en', 'pa'] as const;
export const defaultLocale: Locale = 'en';

type Dict = { [key: string]: string | Dict };

const dictionaries: Record<Locale, Dict> = { en: en as Dict, pa: pa as Dict };

/** Normalises Astro.currentLocale (string | undefined) into a Locale. */
export function getLocale(current: string | undefined): Locale {
  return current === 'pa' ? 'pa' : 'en';
}

export function otherLocale(locale: Locale): Locale {
  return locale === 'pa' ? 'en' : 'pa';
}

function lookup(dict: Dict, key: string): string | undefined {
  let node: string | Dict | undefined = dict;
  for (const part of key.split('.')) {
    if (node === undefined || typeof node === 'string') return undefined;
    node = node[part];
  }
  return typeof node === 'string' ? node : undefined;
}

/**
 * Returns the string for `key` in `locale`. Throws at build time when the key is missing,
 * so a typo never ships as an empty string. Keys are identical in en.json and pa.json;
 * tests/content/i18n-parity.test.mjs enforces that.
 */
export function t(locale: Locale, key: string): string {
  const value = lookup(dictionaries[locale], key);
  if (value === undefined) {
    throw new Error(`Missing i18n key "${key}" for locale "${locale}"`);
  }
  return value;
}

/** Prefixes a site-relative path for the locale: '/our-work/' -> '/pa/our-work/'. */
export function localePath(locale: Locale, path: string): string {
  const clean = path.startsWith('/') ? path : `/${path}`;
  return locale === 'pa' ? `/pa${clean === '/' ? '/' : clean}` : clean;
}

/** The same page in the other language, used by the language switch and hreflang links. */
export function alternatePath(locale: Locale, path: string): string {
  // The 404 page exists once, in the request's language; its language links go to the front door.
  if (/^(\/pa)?\/404(\.html|\/)?$/.test(path)) return localePath(otherLocale(locale), '/');
  const base = locale === 'pa' ? path.replace(/^\/pa(?=\/|$)/, '') || '/' : path;
  return localePath(otherLocale(locale), base);
}

export const siteName: Record<Locale, string> = {
  en: 'Dhan Guru Ramdas Langar Sewa',
  pa: 'ਧੰਨ ਗੁਰੂ ਰਾਮਦਾਸ ਲੰਗਰ ਸੇਵਾ',
};

/** Document title exactly as the reference built it: "Page — Org" or just "Org" on Home. */
export function pageTitle(locale: Locale, pageName: string | null): string {
  return pageName ? `${pageName} — ${siteName[locale]}` : siteName[locale];
}
