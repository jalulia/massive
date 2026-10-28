# MASSIVE — Stats options

Three reviewed design options using Matt’s 15–18 October 2026 match snapshot. The small **V01 / V02 / V03** links at the bottom right switch between all options. These are preserved comparison snapshots; the packaging change adds shared navigation and does not apply the design-review recommendations.

| Option | Page | Approach |
| --- | --- | --- |
| V01 · Claude | [Open V01](index.html) | Computes totals, outcomes and stage rates from an embedded copy of the JSON, with the original export available for download. A restrained grid, native plane diagram and aligned stage table prioritize comparison and inspection. |
| V02 · Claude | [Open V02](v02.html) | Uses the same embedded snapshot for a stage field, animated outcome readouts, stage cards and an exit-duration chart. It extends MASSIVE’s instrument and HUD language into a more expressive presentation. |
| V03 · Codex | [Open V03](v03/index.html) | Loads the original JSON directly and presents daily counts, mode outcomes, sortable stages and the 17 available inactivity records. A large native-animation hero, slow crossfades and selected-stage loops provide the visual focus. |

## Run

Serve `Stats` with any static HTTP server. No build step or package installation is needed. V03 fetches its JSON, so use HTTP rather than opening the HTML with `file://`.

The relative links support deployment under `/massive/Stats/`, another subdirectory, or a local server. V01 is the directory’s default page.

## Data and provenance

- Reporting window: 15–18 October 2026, EDT.
- Original export: `MASSIVEmatch-snapshot-20261015-18.json`.
- Both included JSON files preserve the same original bytes. V01 and V02 also contain an equivalent embedded copy in `assets/massive-data.js`.
- Claude V01/V02 source: the user-supplied `MASSIVE-match-telemetry.zip`. Its media is preserved from the ZIP, rather than substituted from the separate local working folder.
- Codex V03 source: the current built `Sites/massive-state/dist` directory. Site-hosting configuration and nested Git metadata are excluded.
- `SOURCE.json` records source hashes and the narrow packaging changes.
- Game art illustrates MASSIVE; it is not a replay of these match records.

## Review status

These are design comparisons, not a corrected production release. Known review findings remain visible so the options can be assessed accurately:

- V01/V02 infer a HIGGS readability problem from inactivity records; those records do not establish cause. Their HIGGS note uses the all-stage median (1:39.7); the HIGGS-specific median is 1:18.1.
- V02 uses score-energy units beneath match-win counts and describes a nonlinear illustrative field as proportional to player-minutes. Several gauges lack a meaningful reference scale.
- V01 outcome bars render empty, mobile hides stage names, and reduced-motion handling is overridden by playback visibility behavior. Some stage details show an empty capture area despite an available stage icon.
- V02’s mobile field hides its readout, and the stage drawer follows all nine cards. Its level-select clips are 480 × 480, 1.3-second excerpts.
- V03 prioritizes average duration despite fixed three-minute regulation, uses raw stage combat totals, and places selected-stage details below the table on mobile. Some mobile headers are 7px.
- V03’s nine videos total 82.7 MB. Native capture masters need smaller delivery encodes before production use.
- Copy such as “controller time,” “last start” and causal stage judgments needs reconciliation with the export’s actual semantics.

All options are limited by the same aggregate export: player slots are not unique people, full completed-match records are unavailable, and observed side/stage differences do not establish causes or game balance.
