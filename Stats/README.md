# MASSIVE — Stats

V04 is the venue report for the Museum of the Moving Image, 15–18 October 2026. The library lists it as **In review**. V01–V03 are the original design studies. V01 and V02 combine Claude’s Rev 3 with Codex integration. V03 is the Codex comparison.

| Option | Page | Data and design approach |
| --- | --- | --- |
| V04 · In review | [Review V04](v04/?review=1) · [Venue report](v04/) | Reads the event JSON and aggregates whole dates. Match starts, player entries and cabinet match time lead the report. |
| V01 · Claude, Rev 3 | [Open V01](index.html) | Computes totals, outcomes and stage rates from an embedded copy of the JSON. A compact grid pairs the native field model with daily counts, selected-stage footage and a sortable comparison table. |
| V02 · Claude, Rev 3 | [Open V02](v02.html) | Uses the same embedded data for outcome readouts, daily counts and inactivity records. Isolated native stage animations rotate through the hero; instrument panels and adjacent stage details organize the report. |
| V03 · Codex | [Open V03](v03/index.html) | Loads the original JSON directly for daily counts, mode outcomes, sortable stages and inactivity records. A large animation hero, slow crossfades and selected-stage loops provide the visual focus. |

## Run

Serve `Stats` with a static HTTP server. V03 and V04 read their data over HTTP. V01 is the default page at `Stats/`.

## V04 · Museum report

The event report opens on all four dates. Daily starts, mode counts, player entries, completions, inactivity exits and active match time respond to whole-day selection. Full-event player time, average play time per entry, level totals and kills require the complete window. The report excludes those measures from partial ranges and their printouts. [Event data and metric definitions](SOURCE.json)

The full event recorded 228 match starts and 530 player entries across 191 one-on-one matches and 37 two-on-two matches. One entry is one player slot in one match, including repeat plays. Combined player time was 25h 39m across slots and active match time was 11h 03m on the cabinet. The four daily tables in the source use local EDT dates. [Source JSON](v03/snapshot.json)

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

The source counts player slots. It contains no individual completed-match records. Exposure rates do not control for skill, mode mix or stage mechanics. The footage shows native MASSIVE assets.
