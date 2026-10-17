#!/usr/bin/env node
/**
 * Content parity: every visible English text node and every Punjabi (`.l-pa`) text node in
 * the reference must appear, unchanged, in the built HTML of the matching page and language.
 * Also checks alt, aria-label and placeholder attribute values.
 *
 *   node tests/content/parity.mjs             all pages, both languages
 *   node tests/content/parity.mjs our-work    one page
 *   node tests/content/parity.mjs our-work pa one page, one language
 *
 * Exit code 1 when anything is missing; the missing list is printed per page.
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'node-html-parser';
import {
  hasLetterOrDigit,
  langs,
  loadReference,
  norm,
  pageId,
  pages,
  root,
  sitePath,
} from '../lib/reference.mjs';

const [, , onlyPage, onlyLang] = process.argv;
const doc = loadReference();

// Dynamic UI strings produced by the reference's JavaScript (not in markup) are out of scope.
const SKIP = new Set(['Copy', 'Copied']);

function isSkipped(el) {
  // Elements never shown: scripts, styles, the lightbox dialog (hidden) and unused hero options.
  return (
    el.rawTagName === 'script' ||
    el.rawTagName === 'style' ||
    el.rawTagName === 'template' ||
    (el.hasAttribute?.('hidden') && el.rawTagName !== 'main') ||
    (el.classList?.contains('hopt') && !el.classList.contains('hopt-c'))
  );
}

function walk(el, lang, out) {
  if (isSkipped(el)) return;
  const isPa = el.classList?.contains('l-pa');
  const isEn = el.classList?.contains('l-en');
  for (const child of el.childNodes) {
    if (child.nodeType === 3) {
      const text = norm(child.rawText.replace(/&nbsp;/g, ' '));
      if (!text || !hasLetterOrDigit(text) || SKIP.has(text)) continue;
      // Text inside `.l-pa` belongs to Punjabi; everything else is English (also when inside `.l-en`).
      const belongs = lang === 'pa' ? isPa : !isPa;
      if (belongs) out.text.add(decode(text));
    } else if (child.nodeType === 1) {
      if (lang === 'pa' && isEn) continue;
      if (lang === 'en' && isPa) continue;
      walk(child, lang, out);
    }
  }
  for (const attr of ['alt', 'aria-label', 'placeholder']) {
    const key = lang === 'pa' ? `data-pa-${attr}` : attr;
    const v = el.getAttribute?.(key);
    if (v && hasLetterOrDigit(v)) out.attrs.add(decode(norm(v)));
  }
  if (el.rawTagName === 'option') {
    const v = el.getAttribute(`data-${lang}`);
    if (v) out.text.add(decode(norm(v)));
  }
}

function decode(s) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

function expected(slug, lang) {
  const out = { text: new Set(), attrs: new Set() };
  const main = doc.getElementById(pageId(slug));
  if (!main) throw new Error(`Reference has no #${pageId(slug)}`);
  // Shared chrome is checked on every page because every built page renders it.
  for (const sel of ['header.hdr', 'footer', 'a.skip']) {
    const el = doc.querySelector(sel);
    if (el) walk(el, lang, out);
  }
  walk(main, lang, out);
  return out;
}

function built(slug, lang) {
  const file = resolve(
    root,
    'dist',
    ...sitePath(slug, lang).split('/').filter(Boolean),
    'index.html',
  );
  if (!existsSync(file)) return null;
  const html = parse(readFileSync(file, 'utf8'));
  html.querySelectorAll('script, style').forEach((n) => n.remove());
  const text = decode(norm(html.querySelector('body')?.structuredText ?? html.structuredText));
  const attrs = new Set();
  for (const el of html.querySelectorAll('[alt], [aria-label], [placeholder]')) {
    for (const a of ['alt', 'aria-label', 'placeholder']) {
      const v = el.getAttribute(a);
      if (v) attrs.add(decode(norm(v)));
    }
  }
  return { text, attrs };
}

let failed = false;
let totalChecked = 0;
for (const slug of pages) {
  if (onlyPage !== undefined && onlyPage !== (slug || 'home') && onlyPage !== slug) continue;
  for (const lang of langs) {
    if (onlyLang && onlyLang !== lang) continue;
    const want = expected(slug, lang);
    const have = built(slug, lang);
    const label = `${sitePath(slug, lang)} [${lang}]`;
    if (!have) {
      console.log(`✗ ${label}: not built (run pnpm build)`);
      failed = true;
      continue;
    }
    const missingText = [...want.text].filter((s) => !have.text.includes(s));
    const missingAttrs = [...want.attrs].filter((s) => !have.attrs.has(s));
    const checked = want.text.size + want.attrs.size;
    totalChecked += checked;
    if (missingText.length || missingAttrs.length) {
      failed = true;
      console.log(`✗ ${label}: ${missingText.length + missingAttrs.length} of ${checked} missing`);
      for (const s of missingText) console.log(`    text: ${s}`);
      for (const s of missingAttrs) console.log(`    attr: ${s}`);
    } else {
      console.log(
        `✓ ${label}: ${checked} strings present (${want.text.size} text, ${want.attrs.size} attributes)`,
      );
    }
  }
}
console.log(`\n${failed ? 'FAIL' : 'PASS'}: ${totalChecked} strings checked`);
process.exit(failed ? 1 : 0);
