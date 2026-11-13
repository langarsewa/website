# Events page: spec

Status: design approved, not built (Nov 13, 2026). Audience: whoever builds it.
Design: https://claude.ai/artifact/Fh6c1s63mVePSgyR3g82vj, option A (desktop and phone boards, both
clickable in Play mode). Options B and C on the same canvas were not chosen.

## What it is

A page for the sewa's 3–4 major events a year: the next event first, then past events on a
year-by-year timeline. Each past event's live broadcast plays inside its card.

## Decisions

| Decision     | Choice                                                                                                                                                                        |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Layout       | Option A: timeline rail on the left, one gold dot and year label per year, that year's events in a grid of upright cards                                                      |
| Desktop      | Content column 1,040px; two cards per row (`repeat(auto-fill, minmax(min(100%, 420px), 1fr))`). Wide single-row cards felt stretched                                          |
| Phone        | One card per row, rail on the left edge, year buttons scroll sideways                                                                                                         |
| Card         | 16:9 video thumbnail with gold play button and "Full broadcast · [duration]", then date · place, title, one or two lines. Nothing else                                        |
| Video        | Click to play in the card. Facade first (site photo or YouTube thumbnail), YouTube player (youtube-nocookie.com) only after the click. "Close video" returns to the thumbnail |
| Social links | Once, in a "Follow every event: YouTube · Instagram · Facebook" row under the page title. Not on cards                                                                        |
| Next event   | Navy banner above the timeline: "Next event" chip, name, date · time · place, "Watch live on YouTube" and "Get directions"                                                    |
| Navigation   | New "Events" item between Impact and Future Vision; a small "Next event" strip on Home                                                                                        |

## Content model

One entry per event in `src/content/events.json` (same pattern as `milestones.json`):

| Field           | Notes                                                                |
| --------------- | -------------------------------------------------------------------- |
| `title`         | `{ en, pa }`                                                         |
| `date`          | ISO date; upcoming vs past is derived from it at build time          |
| `time`          | Optional, for the Next event banner                                  |
| `place`         | `{ en, pa }`                                                         |
| `summary`       | `{ en, pa }`, one or two lines                                       |
| `youtubeId`     | The broadcast's video ID; the live stream link for an upcoming event |
| `image`         | Optional file in `src/assets/images/`; else the YouTube thumbnail    |
| `directionsUrl` | Optional, upcoming events only                                       |

Social channel links come from `src/content/site.json` (`social.*`), not per event.

## Site changes it needs

1. Content Security Policy: allow `frame-src https://www.youtube-nocookie.com` on `/events/` and
   `/pa/events/` only (`public/_headers`); the rest of the site keeps no frames.
2. A small script for the play facade (swap the button for the iframe with `autoplay=1`), in
   `src/scripts/`, wired in `init.ts`.
3. Because the Next event banner depends on the build date, the site must rebuild after each event
   date passes (a scheduled CI build, or a rebuild when the next event is added).
4. Reference parity: the page is new, so `reference/index.html` needs a matching `#page-events`
   section (or the page is excluded from the parity list in `tests/lib/reference.mjs`).

## Needed from the sewa before building

- 3–5 past events: title, date, place, one or two lines, YouTube link, optional photo.
- The next event, if one is scheduled.
- Punjabi titles and summaries, or approval for drafts reviewed by a native speaker.
