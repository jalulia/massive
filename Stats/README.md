# MASSIVE — Stats options

Three design options using Matt’s 15–18 October 2026 match data. V01 and V02 contain Claude’s Rev 3 and the final integration changes listed below. V03 remains the earlier Codex comparison. The small **V01 / V02 / V03** links at the bottom right switch between options.

| Option | Page | Data and design approach |
| --- | --- | --- |
| V01 · Claude, Rev 3 | [Open V01](index.html) | Computes totals, outcomes and stage rates from an embedded copy of the JSON. A restrained grid, native level-select imagery, a stage navigator and a sortable comparison table prioritize inspection. |
| V02 · Claude, Rev 3 | [Open V02](v02.html) | Uses the same embedded data for outcome readouts, daily activity and the 17 inactivity records. A native carousel hero, instrument panels and a stage navigator with adjacent detail make the report more visual; the illustrative field has been removed. |
| V03 · Codex | [Open V03](v03/index.html) | Loads the original JSON directly and presents daily counts, mode outcomes, sortable stages and the 17 inactivity records. A large native-animation hero, slow crossfades and selected-stage loops provide the visual focus. |

## Run

Serve `Stats` with a static HTTP server. No build step or package installation is needed. V03 fetches its JSON, so use HTTP rather than opening the HTML with `file://`.

Relative links support deployment under `/massive/Stats/`, another subdirectory, or a local server. V01 is the directory’s default page.

## Current V01 and V02

The stage section now separates selection, selected-stage detail and comparison. It includes all nine stage names, previous/next controls, sortable columns and stage deep links. The selected item stays visible in the horizontal navigator. Mobile comparisons keep all nine rows visible and retain stage names, starts, completed matches, exits and PvP counts.

The revisions correct the HIGGS median to **1:18.1**, distinguish completed from decided-match denominators, and use player-minutes for exposure rates. Inactivity is described as the recorded end reason, without assigning a cause. The seven-record difference between the selection count and window starts remains unexplained. Empty outcome bars, hidden mobile stage names, score-energy units on win counts and invented gauge ceilings have been removed or corrected.

One motion control governs playback and transitions, with the initial preference taken from the operating system. V02 navigator animations load and play on hover or focus instead of starting all nine clips at once. Selected-stage footage loops; duplicate inset videos have been removed. The V02 hero preserves the full frame.

The short, tightly cropped stage icons have been replaced with isolated native MASSIVE animations already used in V03. The nine delivery files are 720 × 720 H.264 with fast-start metadata and total **40.3 MB**, down from 82.7 MB for those source files. Original poster files are preserved. Source frame counts are retained; SINGULARITY’s container timing normalizes by approximately one frame. [Media provenance](media-delivery.json) records hashes, dimensions and timing. Playback retains the source sequence boundaries; this encoding pass does not establish seamless animation cycles.

The footer states the reporting dates and identifies the footage as captured in MASSIVE. Revised assets live in `assets-r3/`, separately from the original comparison assets.

## Original comparisons

[V01 original](v01-original.html) and [V02 original](v02-original.html), together with `assets/`, are unchanged from the first published comparison package. They retain their bottom-right links to the three current options.

These originals retain the issues identified in the first review: incorrect HIGGS median and causal copy, zero-width V01 outcome bars, missing mobile stage names, motion-preference conflicts, V02 score units on win counts, an unclear illustrative field, a remote stage drawer, and tightly cropped 480px stage excerpts. Those findings describe the archived originals, not the current Rev 3 pages.

## V03 review notes

V03 is unchanged in this release. It still emphasizes average duration despite fixed three-minute regulation, shows raw stage combat totals, places selected-stage detail below the table on mobile, and uses some very small mobile headers. Its nine stage videos still total 82.7 MB; the smaller delivery files are used by V01 and V02 only.

## Data and provenance

- Reporting window: **15–18 October 2026, EDT**.
- Original export: `MASSIVEmatch-snapshot-20261015-18.json`. The copies in `assets/`, `assets-r3/` and `v03/snapshot.json` preserve the original bytes.
- Current V01/V02 use an equivalent embedded copy in `assets-r3/massive-data.js`; the originals use `assets/massive-data.js`.
- Current Claude source: Rev 3 from `Sites/massive-stats/`. The original comparison source was the supplied `MASSIVE-match-telemetry.zip`.
- Codex V03 source: `Sites/massive-state/dist`. Site-hosting configuration and nested Git metadata are excluded.
- [SOURCE.json](SOURCE.json) records original and revised source hashes and the final integration changes.
- Game art illustrates MASSIVE. It is not a replay of these match records.

All options remain design comparisons. Player slots are not unique people, completed-match records are not included individually, and the export does not establish the causes of exits or side/stage differences. Rates normalize exposure; they do not control for skill, mode mix or stage mechanics. Per-day activity spans are recorded timestamp bounds, not cabinet utilization.
