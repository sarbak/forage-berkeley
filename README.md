# Forage Berkeley

A single-page, mobile-first app for **learning** the forageable wild plants and common trees
of the Berkeley / East Bay area — ~73 species in all.

**Learn (the home screen):** a spaced-repetition quiz. You see 2 photos of a plant and pick
its name from 4 options. Right or wrong, a Leitner schedule (saved on your device) decides
when each plant comes back, so you review what you keep missing. The 2 photos are picked at
random from each plant's gallery, so you learn the *plant* rather than memorizing one image.

**Browse:** the full field guide — search/filter every species and open a detail sheet with
the whole photo gallery plus season, ID notes, a warning, and uses.

**Berkeley plant guide:** a crawlable HTML hub generated from `data/berkeley.json`, linked
from the home screen so search engines can read the same 73-species deck people practice
in the app.

**Species pages:** one static page per plant under `plants/`, generated from the same deck
so specific Berkeley plant searches can land on the exact lesson.

**Poisonous plants guide:** a crawlable safety-first guide generated from the same deck,
focused on do-not-eat plants and common look-alike traps around Berkeley and the East Bay.

**Look-alike guides:** crawlable safety-first lessons, starting with poison hemlock vs wild
fennel, use the same deck facts without adding eating, touching, or removal advice.

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

## Signup capture

The app includes a first lightweight email capture for people who want Forage Berkeley
progress notes and new Berkeley plant lessons. Submitting the form fires
`signup_capture_submitted` through the managed PostHog path in `analytics.js`.

Email handling is intentionally small: there is no account system, backend database, or
new vendor. The submitted email is saved on the visitor's device so the form can show a
joined state, and it is sent as the `email` property on the PostHog event with
`source=app_signup_card` and the visible consent copy.

## Offline

The app shell opens offline once you've visited it, and full-photo offline mode is opt-in.
Two layers:

- **Service worker (`sw.js`).** The app shell (page, code, plant data, fonts) is cached on
  first visit, so the site opens with no connection. Images are served cache-first; the
  shell is stale-while-revalidate, so an update lands on the *next* visit.
- **Photo caching.** Photos are cached as you browse them. The full 335 MB gallery download
  is opt-in from the footer ("save all for offline") so first visits do not start pulling
  hundreds of images in the background. Once someone opts in, the download resumes across
  visits, checks the cache, and only fetches what's missing. Data Saver still skips bulk
  download; photos then cache as you browse. Plants that are not cached yet show the striped
  placeholder offline instead of breaking.

Caches are split on purpose: the shell cache is versioned (`fb-shell-v*` — bump
`SHELL_VERSION` in `sw.js` whenever you ship a change), while the image and font caches
(`fb-img-v1`, `fb-fonts-v1`) are stable, so an app update never re-downloads the ~335MB
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
  berkeley-plants.html # crawlable 73-species hub
  poison-hemlock-identification.html # generated look-alike guide
  app.js            # quiz + browse + lightbox + offline download driver
  sw.js             # service worker (offline caching)
  manifest.json     # PWA manifest (+ icon-192/512/maskable, from favicon.svg via rsvg-convert)
  data/
    berkeley.json   # the 73-plant dataset
  plants/
    <id>.html       # generated species pages, one per plant
  photo_meta.json   # per-plant photo slots, labels, licenses (app reads this)
  img/
    <id>/leaf.jpg, leaf2.jpg, plant.jpg, flower.jpg, fruit.jpg, bark.jpg   # up to 6 per plant
  CREDITS.md        # per-image photographer + license
  fetch_photos.py   # pulls photos from Wikimedia Commons / iNaturalist
  generate_plant_hub.py
  generate_hemlock_fennel_guide.py
  generate_species_pages.py
  generate_sitemap.py
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

## Plant hub

The search-facing hub is generated from the plant data:

```sh
python3 generate_plant_hub.py
python3 generate_species_pages.py
python3 generate_poisonous_plants_guide.py
python3 generate_edible_weeds_guide.py
python3 generate_hemlock_fennel_guide.py
python3 generate_sitemap.py
```

Commit the regenerated `berkeley-plants.html`, topic guide HTML, `plants/*.html`,
and `sitemap.xml` whenever `data/berkeley.json` changes.

## Adding a region (roadmap)

Data lives in JSON, not code, on purpose: a new region is a new `data/<region>.json` with
the same schema. A large core of cosmopolitan weeds repeats across regions; only the
regional supplement changes.

## Safety

Foraging carries real risk and misidentification can be fatal. The deck deliberately
includes toxic "recognition only" cards (poison hemlock, poison oak, datura, oleander,
foxglove, castor bean) so you learn the dangerous look-alikes. Fact-check every entry
against a regional flora before relying on it.
