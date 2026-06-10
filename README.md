# Forage Berkeley

A single-page, mobile-first flash-card field guide to ~49 forageable wild plants of the
Berkeley / East Bay area. One card at a time: **swipe right for the next plant, left for the
previous, tap to flip.** The front asks "what is this?" with a leaf-forward photo gallery
(tap a thumbnail to enlarge it); the back gives the answer plus season, ID notes, a warning,
and uses. Also: a progress bar, shuffle, keyboard arrows (←/→ navigate, space flips), and an
edibility filter.

**This is a learning aid, not a safety authority.** Never eat anything identified from this
app alone.

## Run it

`fetch()` of the local JSON needs http(s), not `file://`, so serve the folder:

```sh
cd forage-berkeley
python3 -m http.server 8000
# open http://localhost:8000 on your phone or browser
```

No build step, no framework, no backend, no login.

## Structure

```
forage-berkeley/
  index.html       # markup + inlined CSS (design system)
  app.js           # fetch data, render cards, flip + filter
  data/
    berkeley.json  # the 49-plant dataset
  img/
    <id>/whole.jpg, leaf.jpg, detail.jpg   # photos (optional; placeholders shown until added)
  CREDITS.md       # per-image photographer + license (fill in as photos are added)
```

## Photos

Each plant ships with a small gallery (up to 6 photos: leaf close-up, a second leaf shot,
whole plant, flower, fruit/seed, bark/stem). The **first/large image is always a leaf
close-up** — leaves are the most reliable ID feature, so the deck is deliberately
leaf-forward rather than flower-forward.

Photos come from `fetch_photos.py`, which searches **Wikimedia Commons** (descriptive
filenames let it target "foliage/leaves", and everything on Commons is free-culture, so no
CC-BY-NC). It scores candidates, rejects junk (microscope/herbarium/product/food/fauna
shots and multi-species plates), and — critically — requires the species name in the
filename so it never shows a wrong-species photo. Any slot Commons can't fill safely falls
back to a species-correct iNaturalist photo. Per-photo attribution and source links are in
`CREDITS.md`. Missing images degrade to a labeled placeholder, so the layout never breaks.

To refresh: `python3 fetch_photos.py` (rewrites `photo_meta.json`), then regenerate
`CREDITS.md`. Licenses are overwhelmingly public-domain / CC0 / CC-BY / CC-BY-SA.

## Adding a region (roadmap)

Data lives in JSON, not code, on purpose: a new region is a new `data/<region>.json` with
the same schema. A large core of cosmopolitan weeds repeats across regions; only the
regional supplement changes.

## Safety

Foraging carries real risk and misidentification can be fatal. The deck deliberately
includes toxic "recognition only" cards (poison hemlock, poison oak, datura, oleander,
foxglove, castor bean) so you learn the dangerous look-alikes. Fact-check every entry
against a regional flora before relying on it.
