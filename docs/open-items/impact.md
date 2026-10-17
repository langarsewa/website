# Impact page: open items

Carried over from the approved reference (`reference/index.html`, `#page-impact`). Nothing
here was changed in the port; each item needs content from the organisation.

| #   | Where                          | Item                                                                                                                                                                                                          | Needed                                                                                         |
| --- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| 1   | Voices, first figure (`.vo-q`) | Placeholder quote `“[Selected line from Giani Pinderpal Singh Ji’s message]”` / `“[ਗਿਆਨੀ ਪਿੰਦਰਪਾਲ ਸਿੰਘ ਜੀ ਦੇ ਸੁਨੇਹੇ ਵਿੱਚੋਂ ਇੱਕ ਲਾਈਨ]”` (`impact.voices.main.quote` in `src/content/i18n/parts/impact.*.json`) | The chosen line from the message, in both languages                                            |
| 2   | Voices, both figures (`.vo-v`) | The two video tiles ("Message from Giani Pinderpal Singh Ji", "D.C. Varinder Kumar Sharma") are static panels in the reference: no `href`, no video ID                                                        | YouTube URLs, so the tiles can become outbound links like the gallery cards                    |
| 3   | Crisis cards                   | The reference markup has no "soon" line (`.cr-soon` exists in the CSS but no element uses it on this page), so none was ported                                                                                | Confirm whether a "more stories coming soon" line is wanted; if so, its text in both languages |
| 4   | Crisis, Punjab Floods          | The card carries the chip "Floods" with no year                                                                                                                                                               | The year, if one should be shown like "2020" on the COVID-19 card                              |
| 5   | Metrics strip                  | `Figures as of October 2026` (`impact.metrics.note`) is a dated claim                                                                                                                                         | Owner and refresh cadence for the four figures                                                 |
| 6   | Video gallery                  | Ten videos are identified only by YouTube ID; alt text is the generic "Video from the sewa" for all ten                                                                                                       | Per-video titles for `alt`/`aria-label` (`src/content/videos.json`)                            |

Content source for structured lists: `src/content/milestones.json` (`impact` key),
`src/content/crisis.json`, `src/content/photo-stories.json`, `src/content/videos.json`.
