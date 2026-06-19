#!/usr/bin/env python3
"""Generate crawlable species pages from data/berkeley.json."""

from __future__ import annotations

import json
from html import escape
from pathlib import Path


ROOT = Path(__file__).resolve().parent
DATA_PATH = ROOT / "data" / "berkeley.json"
META_PATH = ROOT / "photo_meta.json"
OUT_DIR = ROOT / "plants"
SITE_ORIGIN = "https://forage-berkeley.vercel.app"

EDIBILITY_LABELS = {
    "edible": "Edible",
    "care": "Eat with care",
    "no": "Do not eat",
}

EDIBILITY_NOTES = {
    "edible": "This entry describes common uses from the learning deck. It is not eating advice.",
    "care": "This plant needs extra plant-part knowledge, preparation, or caution before anyone thinks about use.",
    "no": "This is a recognition-only plant for local learners to spot and avoid.",
}


def text(value: object) -> str:
    return escape(str(value or ""), quote=True)


def sentence_case(value: object) -> str:
    raw = str(value or "")
    return raw[:1].upper() + raw[1:]


def local_photo(plant_id: str, meta: dict) -> tuple[str | None, str]:
    for photo in meta.get(plant_id, []):
        path = ROOT / "img" / plant_id / f"{photo['slot']}.jpg"
        if path.exists():
            return f"../img/{plant_id}/{photo['slot']}.jpg", str(photo.get("label") or "photo")
    return None, ""


def page_url(plant_id: str) -> str:
    return f"{SITE_ORIGIN}/plants/{plant_id}.html"


def render_page(plant: dict, meta: dict) -> str:
    plant_id = str(plant["id"])
    common = text(plant["commonName"])
    scientific = text(plant["scientificName"])
    season = text(plant.get("season"))
    features = text(plant.get("idFeatures"))
    warning = text(plant.get("warning"))
    uses = text(plant.get("uses"))
    story = text(plant.get("story"))
    category = text(sentence_case(plant.get("category")))
    origin = text(sentence_case(plant.get("origin")))
    edibility_key = str(plant.get("edibility") or "")
    edibility = text(EDIBILITY_LABELS.get(edibility_key, edibility_key))
    edibility_note = text(EDIBILITY_NOTES.get(edibility_key, "Use this as learning material, not eating advice."))
    canonical = page_url(plant_id)
    description = (
        f"Learn {plant['commonName']} around Berkeley with existing Forage Berkeley "
        "season, identification, warning, and use notes."
    )

    photo, photo_label = local_photo(plant_id, meta)
    if photo:
        media = (
            f'<img src="{text(photo)}" alt="{common} {text(photo_label)}" '
            'width="720" height="540" loading="eager" />'
        )
        image_url = f"{SITE_ORIGIN}/{photo[3:]}"
    else:
        media = f'<div class="plant-photo" aria-hidden="true">{common}</div>'
        image_url = None

    json_ld = {
        "@context": "https://schema.org",
        "@type": "LearningResource",
        "name": f"{plant['commonName']} in Berkeley",
        "description": description,
        "url": canonical,
        "about": {
            "@type": "Thing",
            "name": plant["commonName"],
            "alternateName": plant["scientificName"],
        },
        "isPartOf": {
            "@type": "WebSite",
            "name": "Forage Berkeley",
            "url": SITE_ORIGIN,
        },
        "learningResourceType": "Plant identification reference",
        "educationalUse": "Self-guided plant learning",
    }
    if image_url:
        json_ld["image"] = image_url

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <title>{common} in Berkeley | Forage Berkeley</title>
  <meta name="description" content="{text(description)}" />
  <link rel="canonical" href="{text(canonical)}" />
  <link rel="icon" href="../favicon.svg" type="image/svg+xml" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,400&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
  <script type="application/ld+json">{json.dumps(json_ld, ensure_ascii=False)}</script>
  <style>
    :root {{
      --paper: #f7f3ec; --card: #fffdf9; --ink: #2b2118; --ink-soft: #6f624f;
      --sage: #4f6339; --rust: #a8421f; --line: #e6dccb;
      --serif: "Fraunces", Georgia, serif; --mono: "JetBrains Mono", ui-monospace, Menlo, monospace;
    }}
    * {{ box-sizing: border-box; }}
    body {{ margin: 0; background: var(--paper); color: var(--ink); font-family: var(--serif); line-height: 1.5; }}
    a {{ color: var(--rust); }}
    .wrap {{ width: min(1040px, calc(100% - 32px)); margin: 0 auto; }}
    header {{ padding: 22px 0 14px; border-bottom: 1px solid var(--line); }}
    nav {{ display: flex; justify-content: space-between; gap: 18px; align-items: center; font-family: var(--mono); font-size: 13px; }}
    nav a {{ text-decoration: none; }}
    main {{ padding-bottom: 44px; }}
    .hero {{ padding: 48px 0 34px; display: grid; grid-template-columns: minmax(0, .92fr) minmax(320px, .75fr); gap: 28px; align-items: start; }}
    h1 {{ margin: 0 0 8px; font-size: clamp(40px, 7vw, 78px); line-height: .95; font-weight: 600; }}
    h2 {{ margin: 0 0 10px; font-size: clamp(25px, 3vw, 38px); line-height: 1; }}
    p {{ margin: 0; }}
    .eyebrow {{ font-family: var(--mono); text-transform: uppercase; letter-spacing: 0; font-size: 11px; color: var(--ink-soft); }}
    .latin {{ color: var(--ink-soft); font-style: italic; font-size: 21px; }}
    .lede {{ margin-top: 18px; max-width: 720px; color: var(--ink-soft); font-size: 20px; }}
    .hero-media {{ background: var(--card); border: 1px solid var(--line); border-radius: 12px; overflow: hidden; }}
    .hero-media img {{ display: block; width: 100%; aspect-ratio: 4 / 3; object-fit: cover; background: #efe7d8; }}
    .plant-photo {{ min-height: 320px; display: grid; place-items: center; padding: 24px; background: #efe7d8; color: var(--ink-soft); font-family: var(--mono); font-size: 13px; text-align: center; }}
    .caption {{ padding: 10px 12px; color: var(--ink-soft); font-family: var(--mono); font-size: 11px; border-top: 1px solid var(--line); }}
    .summary {{ display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 22px; }}
    .stat {{ background: var(--card); border: 1px solid var(--line); border-radius: 10px; padding: 14px; }}
    .stat span {{ display: block; font-family: var(--mono); text-transform: uppercase; letter-spacing: 0; font-size: 10px; color: var(--ink-soft); }}
    .stat b {{ display: block; margin-top: 4px; font-size: 20px; line-height: 1.15; }}
    .safety {{ padding: 16px 18px; border: 1px solid rgba(168,66,31,.25); background: rgba(168,66,31,.07); border-radius: 12px; color: var(--rust); margin-bottom: 28px; }}
    .details {{ display: grid; grid-template-columns: minmax(0, .9fr) minmax(280px, .55fr); gap: 18px; align-items: start; }}
    .panel {{ background: var(--card); border: 1px solid var(--line); border-radius: 12px; padding: 20px; }}
    dl {{ margin: 0; display: grid; gap: 17px; }}
    dt {{ font-family: var(--mono); text-transform: uppercase; letter-spacing: 0; font-size: 10px; color: var(--ink-soft); }}
    dd {{ margin: 4px 0 0; font-size: 17px; }}
    .story {{ color: var(--ink-soft); font-size: 18px; }}
    .actions {{ display: flex; flex-wrap: wrap; gap: 9px; margin-top: 18px; }}
    .actions a {{ border: 1px solid var(--line); border-radius: 999px; padding: 9px 12px; background: #f8f1e7; text-decoration: none; font-family: var(--mono); font-size: 12px; }}
    footer {{ border-top: 1px solid var(--line); margin-top: 34px; padding: 28px 0 42px; color: var(--ink-soft); }}
    @media (max-width: 820px) {{
      .hero, .details {{ grid-template-columns: 1fr; }}
      .summary {{ grid-template-columns: 1fr; }}
    }}
  </style>
</head>
<body>
  <header>
    <nav class="wrap" aria-label="Main navigation">
      <a href="../">Forage Berkeley</a>
      <a href="../berkeley-plants.html">All Berkeley plants</a>
    </nav>
  </header>
  <main>
    <section class="hero wrap">
      <div>
        <p class="eyebrow">Berkeley plant identification</p>
        <h1>{common}</h1>
        <p class="latin">{scientific}</p>
        <p class="lede">Use this page to learn the season, field marks, warnings, and common uses already in the Forage Berkeley deck.</p>
      </div>
      <figure class="hero-media">
        {media}
        <figcaption class="caption">Generated from the Forage Berkeley plant deck and photo metadata.</figcaption>
      </figure>
    </section>
    <section class="wrap">
      <div class="summary" aria-label="Plant summary">
        <div class="stat"><span>Learning label</span><b>{edibility}</b></div>
        <div class="stat"><span>Origin</span><b>{origin}</b></div>
        <div class="stat"><span>Plant type</span><b>{category}</b></div>
      </div>
      <p class="safety"><strong>Safety note:</strong> Forage Berkeley is a learning aid, not a safety authority. Never eat anything based on this app alone. {edibility_note}</p>
      <div class="details">
        <section class="panel" aria-labelledby="details-title">
          <h2 id="details-title">How to recognize it</h2>
          <dl>
            <div><dt>Season</dt><dd>{season}</dd></div>
            <div><dt>Identification features</dt><dd>{features}</dd></div>
            <div><dt>Watch for</dt><dd>{warning}</dd></div>
            <div><dt>Common uses</dt><dd>{uses}</dd></div>
          </dl>
        </section>
        <aside class="panel" aria-labelledby="story-title">
          <h2 id="story-title">Deck note</h2>
          <p class="story">{story}</p>
          <div class="actions">
            <a href="../berkeley-plants.html#{text(plant_id)}">See it in the full guide</a>
            <a href="../#learn">Practice in the quiz</a>
          </div>
        </aside>
      </div>
    </section>
  </main>
  <footer>
    <div class="wrap">
      <p>Forage Berkeley is independent and unaffiliated with UC Berkeley. This page is generated from the app's current plant deck, not from an expert safety review.</p>
    </div>
  </footer>
</body>
</html>
"""


def main() -> None:
    plants = json.loads(DATA_PATH.read_text())
    meta = json.loads(META_PATH.read_text())
    OUT_DIR.mkdir(exist_ok=True)

    written = 0
    for plant in sorted(plants, key=lambda p: p["commonName"].lower()):
        path = OUT_DIR / f"{plant['id']}.html"
        path.write_text(render_page(plant, meta), encoding="utf-8")
        written += 1

    print(f"Wrote {written} species pages to {OUT_DIR.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
