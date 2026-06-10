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

## Offline

The app works fully offline once you've visited it. Two layers:

- **Service worker (`sw.js`).** The app shell (page, code, plant data, fonts) is cached on
  first visit, so the site opens with no connection. Images are served cache-first; the
  shell is stale-while-revalidate, so an update lands on the *next* visit.
- **Background photo download.** After the page loads, `app.js` quietly fetches every photo
  in the deck (4 at a time) into the cache, with a progress line in the footer
  ("saving for offline · n/405" → "✓ works offline"). The download resumes across visits —
  it checks the cache and only fetches what's missing — and is skipped when the phone's
  Data Saver is on (photos then cache as you browse). Plants the download hasn't reached
  yet show the striped placeholder offline instead of breaking.

Caches are split on purpose: the shell cache is versioned (`fb-shell-v*` — bump
`SHELL_VERSION` in `sw.js` whenever you ship a change), while the image and font caches
(`fb-img-v1`, `fb-fonts-v1`) are stable, so an app update never re-downloads the ~334MB
photo set. The page also asks for persistent storage so the browser won't evict the cache
under pressure.

It's an installable PWA (`manifest.json` + icons): "Add to Home Screen" gives it an app
icon and a fullscreen window, which is the nicest way to use it in the field.

## Deploy

Hosted on Vercel (static, no build):

```sh
vercel --prod --yes   # deploys to https://forage-berkeley.vercel.app
```

`vercel.json` sets cache headers — images are immutable for a week, `/sw.js` is
`must-revalidate` so a new service worker is picked up right away. Note that
`photo_meta.json` must be deployed (the app reads it for each plant's photo slots);
only the Python scripts are in `.vercelignore`.

## Structure

```
forage-berkeley/
  index.html        # markup + inlined CSS (design system)
  app.js            # quiz + browse + lightbox + offline download driver
  sw.js             # service worker (offline caching)
  manifest.json     # PWA manifest (+ icon-192/512/maskable, from favicon.svg via rsvg-convert)
  data/
    berkeley.json   # the 73-plant dataset
  photo_meta.json   # per-plant photo slots, labels, licenses (app reads this)
  img/
    <id>/leaf.jpg, leaf2.jpg, plant.jpg, flower.jpg, fruit.jpg, bark.jpg   # up to 6 per plant
  CREDITS.md        # per-image photographer + license
  fetch_photos.py   # pulls photos from Wikimedia Commons / iNaturalist
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
