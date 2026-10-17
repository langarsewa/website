// Shared helpers for reading the approved reference (reference/index.html) in tests.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { parse } from 'node-html-parser';

export const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const referencePath = resolve(root, 'reference', 'index.html');

/** Page slugs as used in URLs; '' is Home. Reference ids are `page-${slug || 'home'}`. */
export const pages = [
  '',
  'our-story',
  'our-work',
  'impact',
  'future-vision',
  'join-the-sewa',
  'contact',
];
export const langs = ['en', 'pa'];

export function pageId(slug) {
  return `page-${slug || 'home'}`;
}

export function sitePath(slug, lang) {
  const p = slug ? `/${slug}/` : '/';
  return lang === 'pa' ? `/pa${p}` : p;
}

export function referenceUrl(base, slug, lang) {
  return `${base}/index.html?lang=${lang}#/${slug}`;
}

export function loadReference() {
  return parse(readFileSync(referencePath, 'utf8'), { comment: false });
}

/** Collapses whitespace and normalises Unicode so strings compare the way a reader sees them. */
export function norm(s) {
  return s.normalize('NFC').replace(/\s+/g, ' ').trim();
}

export function hasLetterOrDigit(s) {
  return /[\p{L}\p{N}]/u.test(s);
}
