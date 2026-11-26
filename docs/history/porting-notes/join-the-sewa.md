# Open items: Join the Sewa

Page: `/join-the-sewa/` and `/pa/join-the-sewa/` · component `src/components/pages/JoinPage.astro` · strings `src/content/i18n/parts/joinTheSewa.{en,pa}.json` · bank details `src/content/bank-india.json`.

## Needs a decision or a native speaker

| Item                                                                                                                                                                 | Where                                                   | Status                                                               |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- | -------------------------------------------------------------------- |
| Punjabi label for the "Donate online" button is still the English string. The reference has no such button, so there is no approved translation to copy.             | `joinTheSewa.donateOnline` in `joinTheSewa.pa.json`     | Needs a native-speaker translation before the button is switched on. |
| Punjabi meta description was assembled from phrases already on the page (hero lede and jump-link labels), not copied from the reference, which has no per-page meta. | `joinTheSewa.meta.description` in `joinTheSewa.pa.json` | Native-speaker review recommended.                                   |
| English meta description was assembled the same way from on-page words.                                                                                              | `joinTheSewa.meta.description` in `joinTheSewa.en.json` | Review wording.                                                      |

## Donations, prepared but off

- `site.donations.india.paymentPageUrl` and `site.donations.international.paymentPageUrl` are both empty, so no button renders and the page is one for one with the reference.
- When the India URL is set, a `cbtn cbtn-y` "Donate online" link renders at the bottom of the Bank transfer card inside a `<div style="margin-top: 14px">` wrapper (the card is a block container, so the wrapper gives the button its own line).
- When the international URL is set, a navy `cbtn` "Donate online" link renders beside the "Email info@langarsewa.org" button at the end of Step 3 (the outside-India step). There is no separate international card in the reference; this placement is a judgement call.
- Both open in a new tab with `rel="noopener"`. No payment code exists in the repo.

## Test-harness note (shared files, not changed)

`tests/visual/compare.mjs` shoots every page in one browser context. The first (EN) visit stores `dgrls-lang=en` in `localStorage`; the later direct visit to `/pa/...` has no same-origin referrer, so `src/scripts/lang.ts` redirects it to the English page and the PA pairs compare English against Punjabi. Running the PA pass in its own process (`node tests/visual/compare.mjs join-the-sewa pa`) avoids it. A fix in the harness (new context per shot, or `context.clearCookies()` plus `localStorage.clear()` before each shot) is for the owner of `tests/`.

## Verified

- `node tests/content/parity.mjs join-the-sewa`: EN 128/128, PA 111/111 strings present.
- `node tests/visual/compare.mjs join-the-sewa en`: desktop 0.01% / height 0.00%, mobile 0.00% / 0.00%.
- `node tests/visual/compare.mjs join-the-sewa pa`: desktop 0.02% / 0.00%, mobile 0.01% / 0.00%.
- `tests/e2e/join-copy.spec.ts`: copy buttons flip to the copied label and back in both languages.
