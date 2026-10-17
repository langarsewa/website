import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { root } from '../lib/reference.mjs';

import { existsSync, readdirSync } from 'node:fs';

function deepMerge(target, source) {
  for (const [k, v] of Object.entries(source)) {
    if (v && typeof v === 'object')
      target[k] = deepMerge(target[k] && typeof target[k] === 'object' ? target[k] : {}, v);
    else target[k] = v;
  }
  return target;
}

/** en.json / pa.json plus any per-page parts still under src/content/i18n/parts. */
const load = (l) => {
  const dir = resolve(root, 'src/content/i18n');
  const merged = JSON.parse(readFileSync(resolve(dir, `${l}.json`), 'utf8'));
  const partsDir = resolve(dir, 'parts');
  if (existsSync(partsDir)) {
    for (const f of readdirSync(partsDir)
      .filter((f) => f.endsWith(`.${l}.json`))
      .sort()) {
      deepMerge(merged, JSON.parse(readFileSync(resolve(partsDir, f), 'utf8')));
    }
  }
  return merged;
};

function flatten(obj, prefix = '', out = new Map()) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object') flatten(v, key, out);
    else out.set(key, v);
  }
  return out;
}

test('en.json and pa.json have identical keys', () => {
  const en = flatten(load('en'));
  const pa = flatten(load('pa'));
  const onlyEn = [...en.keys()].filter((k) => !pa.has(k));
  const onlyPa = [...pa.keys()].filter((k) => !en.has(k));
  assert.deepEqual({ onlyEn, onlyPa }, { onlyEn: [], onlyPa: [] });
});

test('no empty values in either language', () => {
  for (const l of ['en', 'pa']) {
    const empty = [...flatten(load(l))].filter(([, v]) => typeof v !== 'string' || v.trim() === '');
    assert.deepEqual(empty, [], `${l}.json has empty values`);
  }
});
