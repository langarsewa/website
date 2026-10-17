import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';

/**
 * Runs tests/visual/compare.mjs (28 screenshot pairs against the reference) and asserts every
 * pair is within the brief's limits. Diff images are attached for the CI report.
 */
test('every page matches the reference in both languages at both viewports', async ({}, testInfo) => {
  let failed = false;
  try {
    execFileSync(process.execPath, ['tests/visual/compare.mjs'], { stdio: 'inherit' });
  } catch {
    failed = true;
  }
  const results = JSON.parse(
    readFileSync(resolve('tests/visual/__diff__/results.json'), 'utf8'),
  ) as {
    name: string;
    pass: boolean;
    pixelRatio: number;
    heightRatio: number;
  }[];
  for (const r of results.filter((x) => !x.pass)) {
    await testInfo.attach(`${r.name}-diff`, {
      path: resolve('tests/visual/__diff__', `${r.name}-diff.png`),
      contentType: 'image/png',
    });
  }
  expect(
    results
      .filter((r) => !r.pass)
      .map(
        (r) =>
          `${r.name}: ${(r.pixelRatio * 100).toFixed(2)}% px, ${(r.heightRatio * 100).toFixed(2)}% height`,
      ),
  ).toEqual([]);
  expect(failed).toBe(false);
});
