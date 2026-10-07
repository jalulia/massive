# MASSIVE — Visual catalogue

A growing library of real MASSIVE recordings. Browse clips, choose portrait / square / landscape, switch optional text, and download MP4s or the portrait batch. Each clip keeps capture provenance and source recordings. Trailer entries also include their frame-by-frame cut lists. The Loops filter finds visual studies with edited wrap joins or full native cycles; gameplay and trailers may finish with a cut. Saved clips are personal to the current browser. Clips are silent, 30 fps, with clean and optional text editions in three sizes. BTS entries are labelled engine diagnostic passes. The game build, input method, loop join and any capture compatibility adjustments are recorded per clip. This catalogue does not modify or deploy the game repository.


## Latest additions

The homepage includes a dated source review of LATTICE, COSMOS, ORBITAL encounters and Repulsor, checked against `mattfryed/massive` branch `v5` at `3d9127b1ef95c90ff1f4999497b7789eda50040b` on 2026-10-05. Feature links are pinned to that revision. Existing video provenance is unchanged; this update adds notes, not fresh captures. COSMOS runtime/balance/performance qualifications remain as stated in its feature documentation.

The update lives in `index.html`, with styling in `assets/styles.css`. Future media preparation through `tools/prepare.py` updates the clip JSON and previews without replacing these notes.

## Full-spectrum exploration — 7 October 2026

`#latest` now leads with Study 02: an 80-second native Unity render study covering
COSMOS, SINGULARITY, NOVA, DYNAMO, PULSAR, ORBITAL, HIGGS and LATTICE. It uses authored
scale connections and is separate from the gameplay capture catalogue. The earlier
5 October source review and all recordings remain unchanged below it.

The compact film, poster, board and curated public review/source bundle are under
`media/explorations/full-spectrum-v2/`; their hashes are recorded in `manifest.json`.
Higher-detail parts use the established `catalogue-media` release. The public ZIP
contains only authored orchestration/compositing/encoding/input-test files, not
copied game or vendor assets, workstation paths or private capture logs. It is not
a standalone Unity project. Production integration, physical input checks, target
hardware qualification and a moving Starfield alternate remain unfinished.

Run `python3 tools/verify-spectrum.py` to check this feature's files, hashes, source
bundle privacy boundaries and links. `node --check assets/spectrum.js` checks its
small chapter-control script. No screen saver or game code is changed by this update.
