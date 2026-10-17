/**
 * Tiny DOM helpers so pages never touch innerHTML with data.
 *
 * `append` and `after` exist because the root tsconfig loads @cloudflare/workers-types for the
 * API, and its HTMLRewriter `Element` hides the DOM `ParentNode.append` / `ChildNode.after`
 * signatures. Going through the base interfaces keeps the DOM types.
 */

type Child = Node | string | null | undefined | false;

export type Attrs = Record<string, string | number | boolean | null | undefined | EventListener>;

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Attrs = {},
  ...children: (Child | Child[])[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === null || value === undefined || value === false) continue;
    if (typeof value === 'function') {
      el.addEventListener(key.replace(/^on/, '').toLowerCase(), value);
    } else if (value === true) {
      el.setAttribute(key, '');
    } else {
      el.setAttribute(key, String(value));
    }
  }
  for (const child of children.flat()) {
    if (child === null || child === undefined || child === false) continue;
    append(el, typeof child === 'string' ? document.createTextNode(child) : child);
  }
  return el;
}

export function append(parent: Node, ...nodes: (Node | string)[]): void {
  (parent as unknown as ParentNode).append(...nodes);
}

export function after(ref: Node, node: Node): void {
  (ref as unknown as ChildNode).after(node);
}

export function clear(el: Element): void {
  while (el.firstChild) el.removeChild(el.firstChild);
}

export function replaceChildren(el: Element, ...children: (Child | Child[])[]): void {
  clear(el);
  for (const child of children.flat()) {
    if (child === null || child === undefined || child === false) continue;
    append(el, typeof child === 'string' ? document.createTextNode(child) : child);
  }
}

export function byId<T extends HTMLElement = HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing element #${id}`);
  return el as T;
}

export function show(el: Element, visible = true): void {
  if (visible) el.removeAttribute('hidden');
  else el.setAttribute('hidden', '');
}

export function hide(el: Element): void {
  show(el, false);
}

/** Inline SVG check mark used by step lists and done cards. */
export function checkIcon(size = 14): SVGSVGElement {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '3');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  const path = document.createElementNS(ns, 'path');
  path.setAttribute('d', 'M5 12l5 5L20 7');
  append(svg, path);
  return svg;
}

/** Inline SVG cross used for failed steps. */
export function crossIcon(size = 14): SVGSVGElement {
  const svg = checkIcon(size);
  const path = svg.querySelector('path');
  path?.setAttribute('d', 'M6 6l12 12M18 6L6 18');
  return svg;
}
