# Forage Berkeley

A single-page, mobile-first app for **learning** the forageable wild plants and common trees
of the Berkeley / East Bay area — ~73 species in all.

**Learn (the home screen):** a spaced-repetition quiz. You see 2 photos of a plant and pick
its name from 4 options. Right or wrong, a Leitner schedule (saved on your device) decides
when each plant comes back, so you review what you keep missing. The 2 photos are picked at
random from each plant's gallery, so you learn the *plant* rather than memorizing one image.

**Browse:** the full field guide — search/filter every species and open a detail sheet with
the whole photo gallery plus season, ID notes, a warning, and uses.

**This is a learning aid, not a safety authority.** Never eat anything identified from this
app alone. The dataset includes toxic "recognition-only" species (poison hemlock, oleander,
English yew, privet, horse chestnut, …) precisely so you learn what to avoid.

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
