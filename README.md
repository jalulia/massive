# MASSIVE — Visual catalogue

A growing library of real MASSIVE recordings. Browse clips, choose portrait / square / landscape, switch optional text, and download MP4s or the portrait batch. Each clip keeps capture provenance and source recordings. Trailer entries also include their frame-by-frame cut lists. The Loops filter finds visual studies with edited wrap joins or full native cycles; gameplay and trailers may finish with a cut. Saved clips are personal to the current browser.

## Enable the site

In **Settings → Pages**, select **Deploy from a branch → main → /(root)**.
The project address is **https://jalulia.github.io/massive/**.

The site uses relative paths and needs no build step or server. GitHub Pages holds the interface and lightweight previews. Full-quality exports, source recordings and ZIPs live in GitHub Releases; content hashes in filenames preserve earlier editions.

## Keep adding clips

The local capture library remains the editing workspace. Finish and review a capture there, give it three MP4 sizes with clean/text variants, then enable its `sitePreview` selection. Archived and on-hold items are excluded. The publisher reads the library’s `data/catalog.json`; it does not copy private notes, research dossiers, capture scripts or game code.

From this checkout, publish the full current selection:

```sh
python3 tools/publish.py --library /path/to/massive-library
```

Requires Python 3.9+, Node (syntax check), FFmpeg (the library’s bundled binary is used if available) and GitHub authentication through your existing Git credential helper or `GH_TOKEN`. The command prepares playback previews, verifies local media hashes, uploads missing release assets, verifies their sizes/digests, and commits/pushes the site. Run it again to resume an interrupted upload; completed matching assets are reused. Earlier release files are retained. A clip removed from the published selection leaves the current gallery but remains in release history.

Prepare without publishing:

```sh
python3 tools/prepare.py --library /path/to/massive-library
python3 -m http.server 8080
```

Inspect `data/catalogue.json`, then run `python3 tools/publish.py --prepared` to publish exactly that prepared selection. Never commit `.publish/`: it contains local source paths. No credentials are stored by these scripts.

Supabase is not required for browsing, downloading or repeatable updates. A future shared upload/editor can write this same catalogue shape while preserving clip IDs and provenance; the public interface does not depend on the local capture server.

## Media conventions

Exports are silent, 30 fps, with clean and optional text editions in three sizes. BTS entries are labelled engine diagnostic passes. The game build, input method, loop join and any capture compatibility adjustments are recorded per clip. This catalogue does not modify or deploy the game repository.
