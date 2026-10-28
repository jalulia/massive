# MASSIVE — Library

[Open the library](https://jalulia.github.io/massive/) · [Compare stats options](https://jalulia.github.io/massive/#stats) · [Presentation archive](https://jalulia.github.io/massive/#presentations)

**All presentations in section 01 are archived and not approved.** The six entries and their linked documents remain accessible for version reference. This status applies to the presentation documents and notes; it does not change the status of the underlying game art, fonts or video assets.

MASSIVE: Making the invisible playable. A 26-board HTML presentation by Matt Fry for the Museum of the Moving Image, 17 October 2026. Suggested speaking time: 17 minutes 45 seconds, plus transitions.

The standalone presentation is preserved at `momi.html`. It includes the 1920 × 1080 layout, keyboard controls and speaker notes. `presentation-assets/` contains the game fonts, supplied book photographs, original reference material and approved Unity captures. There are no runtime libraries or third-party services.

## Library index

The root `index.html` is a compact visual directory of every standalone HTML page, presentation direction, stats option, media set, study and the linked GDD. Section 01 is a collapsed presentation archive; section 02 links the three stats design options. Archive and approval labels also appear in **All files** and are searchable. All repository files, all assets from all five GitHub releases, and the 35 linked Drive masters are searchable under **All files**. Dates come from Git history, release asset updates or the dated master manifest; filesystem modification times are not used. Live external documents have no invented version date.

The original MOMI presentation is preserved at `momi.html`; old numeric slide bookmarks at the root redirect there. The withdrawn Cosmic Atlas PDF is omitted; its PowerPoint remains available. Archive labels are library metadata; the original presentation files and downloads are unchanged.

## Stats options

[V01 — Match telemetry](https://jalulia.github.io/massive/Stats/) and [V02 — Stage report](https://jalulia.github.io/massive/Stats/v02.html) use an embedded copy of Matt’s match snapshot, with a comparison grid and rotating native stage animations with stage comparisons respectively. [V03 — Match statistics](https://jalulia.github.io/massive/Stats/v03/index.html) loads the JSON file directly and pairs the report with native stage animations. All three are design options; [review notes and source details](Stats/README.md) record the known limitations.

To refresh the index after adding or changing material:

```sh
python3 tools/build-library.py --refresh-releases
python3 tools/verify-library.py
```

Omit `--refresh-releases` to rebuild offline using `data/library-releases.json`. The generator inventories tracked and non-ignored files, so keep scratch files outside the repository. `data/library.json` is the complete machine-readable inventory. The page renders its links without JavaScript; search and file filters use a small local script.

## Presenting

- Arrow keys / Page Up / Page Down / Space: move between boards.
- Home / End: first / last board.
- F: fullscreen.
- P: pause or resume the current video.
- R: replay the current clip.
- B: black the screen.
- N: show notes on this same screen; intended for rehearsal, not a separate presenter display.

Videos are silent and start on arrival. Click once if the browser requires initial interaction. The game and scientific-reference sequences repeat with their existing brief black editorial reset. The two Sagan gestures play once and hold; R replays them. The archival footage is intentionally shown modestly. Source credits and distinctions are in `Speaker-notes.md` and the N view, not on the projected boards.

The web edition uses the approved 1080p H.264 delivery encodes, with fast-start metadata for browser playback. The supplied cover and signature photographs and the fonts are unchanged. `presentation-assets/manifest.json` records exact published hashes. Download this repository and open `momi.html` to present offline; keep its folders intact.

## Previous material

The previous visual catalogue is deprecated as the homepage and preserved at [archive/](https://jalulia.github.io/massive/archive/). Its recordings, source notes, download links and styles remain in their existing locations so older media URLs keep working. The [screensavers](https://jalulia.github.io/massive/screensavers/) and Windows packaging sources remain available as legacy material.

This repository hosts presentation and media material. It is separate from the MASSIVE Unity game repository.

## Reference motion

[Open the standalone reference gallery](https://jalulia.github.io/massive/reference-motion/): eight Powers of Ten excerpts with full-frame and square MP4/GIF downloads, plus five revised Sagan gesture cuts. Source and edit notes accompany the assets. The Sagan cuts play once; the Powers of Ten previews have visible editorial resets.

## Presentation directions

[Open the archived visual directions](https://jalulia.github.io/massive/presentation-directions/): Field Study, Cosmic Atlas and Big / Small. Each direction demonstrates nine screen types using MASSIVE imagery and scientific references. The page includes a visual audit, silent motion samples, source credits, PDF previews and editable PowerPoint downloads. All three directions and the MOMI talk at `momi.html` are archived and not approved.

## COSMOS and ORBITAL capture revision

COSMOS now presents a CMB / present-day cosmic-web comparison, a six-second background-only Unity Preview Age scrub, and a separate 40-second native gameplay capture. ORBITAL has a closer UI-free Unity capture with changing configurations. These three captures play once and hold their last frame; R replays. Slide links update correctly within an already open presentation.

Slide 24 uses a fresh 40-second capture of Unity’s native Game view, with its saved camera, full game HUD and unchanged goal anchors. It fills the slide at 1920 × 1080.

## Explorations

[Open the standalone index](https://jalulia.github.io/massive/explorations/): the MOMI presentation, visual directions, Full Spectrum, Powers of Ten, Flatland and the attract cabinet. The index has no global navigation or back-links. Supporting pages keep playback and downloads without the earlier review commentary.

## MOMI video assets

[Open the standalone video library](https://jalulia.github.io/massive/video-assets/): 28 silent MP4s, three GIF downloads and four stills, grouped by system. Reference footage, isolated models and gameplay are labelled separately. The page includes individual downloads, full-quality Drive master links, source and capture notes, and a manifest with web/master hashes. Larger recordings use lighter H.264 web copies at their original dimensions. Clips play once and hold.
