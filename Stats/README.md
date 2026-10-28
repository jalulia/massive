# MASSIVE — Stats options

Three design options using Matt’s 15–18 October 2026 match data. V01 and V02 combine Claude’s Rev 3 with Codex integration and the editorial and visual pass below. V03 remains the earlier Codex comparison. The small **V01 / V02 / V03** links at the bottom right switch between options.

| Option | Page | Data and design approach |
| --- | --- | --- |
| V01 · Claude, Rev 3 | [Open V01](index.html) | Computes totals, outcomes and stage rates from an embedded copy of the JSON. A compact grid pairs the native field model with daily counts, selected-stage footage and a sortable comparison table. |
| V02 · Claude, Rev 3 | [Open V02](v02.html) | Uses the same embedded data for outcome readouts, daily counts and inactivity records. Isolated native stage animations rotate through the hero; instrument panels and adjacent stage details organize the report. |
| V03 · Codex | [Open V03](v03/index.html) | Loads the original JSON directly for daily counts, mode outcomes, sortable stages and inactivity records. A large animation hero, slow crossfades and selected-stage loops provide the visual focus. |

## Run

Serve `Stats` with a static HTTP server. No build step or package installation is needed. V03 fetches its JSON, so use HTTP rather than `file://`. Relative links support deployment under `/massive/Stats/` or another subdirectory; V01 is the default page.

## Current V01 and V02

Both pages retain all nine stages and 17 inactivity records. Outcome shares consistently use completed matches, including ties. Combat totals and rates per player-minute remain available. Inactivity is presented as the recorded end reason without assigning a cause.

The editorial pass removes Notes, Reads, Definitions and Provenance sections, production captions, advice, repeated hero prose, timestamp-span displays and duplicate denominator explanations. Reporting dates and concise metric labels remain.

Stage selection, previous/next controls, deep links and table sorting are retained. Mobile comparisons show four columns: stage, starts, completed and exits. Combat metrics remain in selected-stage detail. The four-day plot adapts to its container; the exit plot scrolls horizontally and has a supporting table.

`refinement.css` increases label readability, reduces nested card padding and preserves native media framing with `object-fit: contain`. The masthead motion control governs playback and transitions, initially following the operating-system preference.

V02’s hero uses the existing higher-resolution V03 stage sources, advancing every 10 seconds with crossfades and no hero controls or readout. V01’s C12 delivery starts at source time **0.50 seconds** and runs for **12.97 seconds** to remove editorial fades. Selected-stage footage loops; playback does not imply a seamless source animation cycle.

The nine 720 × 720 stage delivery files total **40.3 MB**, compared with 82.7 MB for their V03 sources. They serve the stage views; V02’s hero uses the higher-resolution sources. Posters are preserved. [Media provenance](media-delivery.json) records encoding, hashes and timing; revised assets remain separate in `assets-r3/`.

Verification covered widths of **360, 768, 1280 and 1512px**: no page overflow, all stage media loading and looping, all 17 exit rows, and table sorting.

## Preserved comparisons

[V01 original](v01-original.html), [V02 original](v02-original.html), their `assets/` directory and V03 are unchanged. The originals retain the issues from the first review, including the incorrect HIGGS median, causal copy, empty outcome bars, hidden mobile stage names, motion conflicts and cropped stage excerpts. V03 retains its earlier duration emphasis, raw combat totals and small mobile headers.

## Data and provenance

- Reporting window: **15–18 October 2026, EDT**.
- The JSON copies in `assets/`, `assets-r3/` and `v03/snapshot.json` preserve the original bytes.
- Current V01/V02 use the equivalent embedded data in `assets-r3/massive-data.js`; the originals use `assets/massive-data.js`.
- Claude’s Rev 3 came from `Sites/massive-stats/`; the original comparison came from `MASSIVE-match-telemetry.zip`. V03 came from `Sites/massive-state/dist`.
- [SOURCE.json](SOURCE.json) records source hashes and integration changes.

All options remain design comparisons. Player slots are not unique people, and individual completed-match records are unavailable. Exposure rates do not control for skill, mode mix or stage mechanics. Game footage illustrates MASSIVE; it is not a replay of these records.
