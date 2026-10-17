import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const pages = ['', 'our-story', 'our-work', 'impact', 'future-vision', 'join-the-sewa', 'contact'];

/**
 * Known exceptions, each a conscious decision recorded in OPEN-ITEMS.md. Every exception names
 * the rule and the element it covers, so a new violation anywhere else still fails the gate.
 */
const exceptions: { rule: string; target: RegExp; reason: string }[] = [
  {
    rule: 'color-contrast',
    target: /^\.door\[/,
    reason:
      'Approved design: the gold "Explore →" (#B08A00 on white, 3.24:1) on the four Home door cards. Decision pending with the sewa; see OPEN-ITEMS.md.',
  },
];

function isExcepted(ruleId: string, target: string): boolean {
  return exceptions.some((e) => e.rule === ruleId && e.target.test(target));
}

for (const lang of ['en', 'pa'] as const) {
  for (const slug of pages) {
    const path = (lang === 'pa' ? '/pa' : '') + (slug ? `/${slug}/` : '/');
    test(`axe: ${path}`, async ({ page }) => {
      await page.goto(path);
      // The page fades in on load; sample colours only once every animation has finished.
      await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished)));
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice'])
        .analyze();
      const serious = results.violations
        .filter((v) => v.impact === 'serious' || v.impact === 'critical')
        .map((v) => ({
          ...v,
          nodes: v.nodes.filter((n) => !isExcepted(v.id, String(n.target[0]))),
        }))
        .filter((v) => v.nodes.length > 0);
      expect(
        serious.map(
          (v) =>
            `${v.id} (${v.impact}): ${v.nodes.length} nodes, e.g. ${v.nodes[0]?.target.join(' ')}`,
        ),
      ).toEqual([]);
    });
  }
}
