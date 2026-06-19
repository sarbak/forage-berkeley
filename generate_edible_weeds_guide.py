#!/usr/bin/env python3
"""Generate the crawlable Berkeley edible weeds guide."""

from __future__ import annotations

import json
from html import escape
from pathlib import Path


ROOT = Path(__file__).resolve().parent
DATA_PATH = ROOT / "data" / "berkeley.json"
META_PATH = ROOT / "photo_meta.json"
OUT_PATH = ROOT / "edible-weeds-berkeley-east-bay.html"
SITE_ORIGIN = "https://forage-berkeley.vercel.app"

EDIBILITY_LABELS = {
    "edible": "Edible",
    "care": "Eat with care",
    "no": "Do not eat",
}

GUIDE_GROUPS = [
    {
        "id": "sidewalk-lawns",
        "label": "Sidewalk, lawn, and hard-packed edges",
        "intro": (
            "Common plants learners tend to notice in paths, parking strips, "
            "lawns, and disturbed ground."
        ),
        "plant_ids": [
            "dandelion",
            "common-mallow",
            "broadleaf-plantain",
            "sow-thistle",
            "pineapple-weed",
        ],
    },
    {
        "id": "garden-weeds",
        "label": "Cool-season garden weeds",
        "intro": (
            "Fast-growing herbs that show up in beds, lots, and spring growth "
            "around Berkeley."
        ),
        "plant_ids": [
            "chickweed",
            "purslane",
            "lambs-quarters",
            "shepherds-purse",
            "black-mustard",
            "wild-radish",
        ],
    },
    {
        "id": "shade-trail-edges",
        "label": "Moist shade and trail-edge plants",
        "intro": (
            "Plants from the deck that need extra attention because habitat, "
            "stings, or toxic look-alikes can change the learning context."
        ),
        "plant_ids": [
            "miners-lettuce",
            "stinging-nettle",
            "three-cornered-leek",
            "wild-fennel",
        ],
    },
]

GUIDE_WARNING_OVERRIDES = {
    "dandelion": (
        "Avoid sprayed lawns and roadsides when studying real plants. "
        "The deck notes that several yellow composite flowers can look similar."
    ),
    "common-mallow": (
        "Avoid plants from contaminated soil. This guide treats mallow as "
        "recognition practice, not eating clearance."
    ),
    "broadleaf-plantain": (
        "Older leaves get tough. The deck does not flag a local toxic look-alike, "
        "but real plants still need independent confirmation."
    ),
    "black-mustard": (
        "Highly invasive in the deck; learn its four-petal mustard flowers and "
        "upright seed pods without treating this page as harvesting advice."
    ),
    "stinging-nettle": (
        "Stings when raw; use gloves if handling a real plant. The deck notes that "
        "heat or drying neutralizes the sting."
    ),
    "three-cornered-leek": (
        "The deck's allium rule is strict: a true onion or garlic smell matters. "
        "No smell means do not treat the plant as an allium."
    ),
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
            return f"img/{plant_id}/{photo['slot']}.jpg", str(photo.get("label") or "photo")
    return None, ""


def species_page_path(plant_id: str) -> str:
    return f"plants/{plant_id}.html"


def guide_warning(plant: dict) -> str:
    plant_id = str(plant["id"])
    return GUIDE_WARNING_OVERRIDES.get(plant_id, str(plant.get("warning") or ""))


def plant_card(plant: dict, meta: dict) -> str:
    common = text(plant["commonName"])
    scientific = text(plant["scientificName"])
    plant_id = text(plant["id"])
    species_href = text(species_page_path(plant["id"]))
    edibility = text(EDIBILITY_LABELS.get(plant.get("edibility"), plant.get("edibility")))
    season = text(plant.get("season"))
    features = text(plant.get("idFeatures"))
    warning = text(guide_warning(plant))
    story = text(plant.get("story"))
    category = text(sentence_case(plant.get("category")))
    photo, photo_label = local_photo(plant["id"], meta)

    if photo:
        media = (
            f'<img src="{text(photo)}" alt="{common} {text(photo_label)}" '
            'loading="lazy" width="320" height="240" />'
        )
    else:
        media = f'<div class="plant-photo" aria-hidden="true">{common}</div>'

    return f"""
          <article class="weed-card" id="{plant_id}">
            {media}
            <div class="weed-copy">
              <p class="eyebrow">{edibility} · {category} · {season}</p>
              <h3><a href="{species_href}">{common}</a></h3>
              <p class="latin">{scientific}</p>
              <dl>
                <div><dt>How to recognize it</dt><dd>{features}</dd></div>
                <div><dt>Watch for</dt><dd>{warning}</dd></div>
                <div><dt>Deck note</dt><dd>{story}</dd></div>
              </dl>
              <a class="species-link" href="{species_href}">Open species page</a>
            </div>
          </article>"""


def render(plants: list[dict], meta: dict) -> str:
    by_id = {plant["id"]: plant for plant in plants}
    selected_ids = [plant_id for group in GUIDE_GROUPS for plant_id in group["plant_ids"]]
    selected_plants = [by_id[plant_id] for plant_id in selected_ids]
    edible_count = sum(1 for plant in selected_plants if plant.get("edibility") == "edible")
    care_count = sum(1 for plant in selected_plants if plant.get("edibility") == "care")

    item_list = {
        "@context": "https://schema.org",
        "@type": "ItemList",
        "name": "Edible weeds in Berkeley and the East Bay",
        "numberOfItems": len(selected_plants),
        "itemListElement": [
            {
                "@type": "ListItem",
                "position": index + 1,
                "name": plant["commonName"],
                "url": f"{SITE_ORIGIN}/{species_page_path(plant['id'])}",
            }
            for index, plant in enumerate(selected_plants)
        ],
    }

    group_sections = []
    for group in GUIDE_GROUPS:
        cards = "\n".join(plant_card(by_id[plant_id], meta) for plant_id in group["plant_ids"])
        group_sections.append(
            f"""
      <section class="weed-group" aria-labelledby="{text(group['id'])}-title">
        <div class="group-head">
          <p class="eyebrow">{len(group['plant_ids'])} deck entries</p>
          <h2 id="{text(group['id'])}-title">{text(group['label'])}</h2>
          <p>{text(group['intro'])}</p>
        </div>
        <div class="weed-grid">
{cards}
        </div>
      </section>"""
        )

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <title>Edible weeds in Berkeley and the East Bay | Forage Berkeley</title>
  <meta name="description" content="Learn 15 common edible and caution weeds around Berkeley and the East Bay with Forage Berkeley's local plant deck. A recognition guide, not eating-safety advice." />
  <link rel="canonical" href="{SITE_ORIGIN}/edible-weeds-berkeley-east-bay.html" />
  <link rel="icon" href="favicon.svg" type="image/svg+xml" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,400&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
  <script type="application/ld+json">{json.dumps(item_list, ensure_ascii=False)}</script>
  <style>
    :root {{
      --paper: #f7f3ec; --card: #fffdf9; --ink: #2b2118; --ink-soft: #6f624f;
      --sage: #4f6339; --sage-soft: #dde6cf; --rust: #a8421f; --ochre: #b9791b;
      --blue: #2f6470; --line: #e6dccb;
      --serif: "Fraunces", Georgia, serif; --mono: "JetBrains Mono", ui-monospace, Menlo, monospace;
    }}
    * {{ box-sizing: border-box; }}
    body {{ margin: 0; background: var(--paper); color: var(--ink); font-family: var(--serif); line-height: 1.5; }}
    a {{ color: var(--rust); }}
    .wrap {{ width: min(1120px, calc(100% - 32px)); margin: 0 auto; }}
    header {{ padding: 22px 0 14px; border-bottom: 1px solid var(--line); }}
    nav {{ display: flex; justify-content: space-between; gap: 18px; align-items: center; font-family: var(--mono); font-size: 13px; }}
    nav a {{ text-decoration: none; }}
    .hero {{ padding: 54px 0 34px; display: grid; gap: 28px; grid-template-columns: minmax(0, 1.18fr) minmax(280px, .82fr); align-items: start; }}
    h1 {{ font-size: clamp(38px, 7vw, 76px); line-height: .95; max-width: 820px; margin: 0 0 18px; font-weight: 600; }}
    h2 {{ font-size: clamp(28px, 4vw, 44px); line-height: 1; margin: 0 0 10px; }}
    h3 {{ font-size: 24px; line-height: 1.1; margin: 0; }}
    p {{ margin: 0; }}
    h3 a {{ color: inherit; text-decoration-color: rgba(168,66,31,.35); text-underline-offset: 4px; }}
    .lede {{ font-size: 20px; max-width: 760px; color: var(--ink-soft); }}
    .eyebrow {{ font-family: var(--mono); text-transform: uppercase; letter-spacing: 0; font-size: 11px; color: var(--ink-soft); }}
    .safety {{ padding: 17px 18px; border: 1px solid rgba(168,66,31,.25); background: rgba(168,66,31,.07); border-radius: 10px; color: var(--rust); }}
    .quick {{ display: grid; gap: 10px; }}
    .quick-card {{ border: 1px solid var(--line); border-radius: 10px; padding: 16px; background: var(--card); }}
    .quick-card b {{ display: block; font-size: 30px; line-height: 1; margin-bottom: 4px; }}
    .jump {{ display: flex; flex-wrap: wrap; gap: 8px; margin: 22px 0 42px; }}
    .jump a {{ border: 1px solid var(--line); border-radius: 999px; padding: 8px 12px; background: var(--card); text-decoration: none; font-family: var(--mono); font-size: 12px; }}
    .note-band {{ margin: 24px 0 44px; padding: 18px; border: 1px solid rgba(47,100,112,.26); background: rgba(47,100,112,.08); border-radius: 10px; }}
    .note-band h2 {{ font-size: 27px; }}
    .note-band p {{ color: var(--ink-soft); max-width: 760px; }}
    .weed-group {{ padding: 38px 0; border-top: 1px solid var(--line); }}
    .group-head {{ max-width: 720px; margin-bottom: 20px; }}
    .group-head p:last-child {{ color: var(--ink-soft); font-size: 17px; }}
    .weed-grid {{ display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }}
    .weed-card {{ display: grid; grid-template-rows: 190px 1fr; background: var(--card); border: 1px solid var(--line); border-radius: 10px; overflow: hidden; }}
    .weed-card img {{ width: 100%; height: 100%; object-fit: cover; background: #efe7d8; }}
    .plant-photo {{ min-height: 190px; display: grid; place-items: center; padding: 18px; background: #efe7d8; color: var(--ink-soft); font-family: var(--mono); font-size: 13px; text-align: center; }}
    .weed-copy {{ padding: 16px; }}
    .latin {{ color: var(--ink-soft); font-style: italic; margin: 2px 0 12px; }}
    dl {{ margin: 0; display: grid; gap: 11px; }}
    dt {{ font-family: var(--mono); text-transform: uppercase; letter-spacing: 0; font-size: 10px; color: var(--ink-soft); }}
    dd {{ margin: 0; font-size: 15px; }}
    .species-link {{ display: inline-flex; width: fit-content; margin-top: 14px; border: 1px solid var(--line); border-radius: 999px; padding: 7px 10px; background: #f8f1e7; text-decoration: none; font-family: var(--mono); font-size: 11px; }}
    .avoid {{ padding: 34px 0 22px; border-top: 1px solid var(--line); }}
    .avoid-grid {{ display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 16px; }}
    .avoid-card {{ background: var(--sage-soft); border: 1px solid rgba(79,99,57,.24); border-radius: 10px; padding: 16px; }}
    .avoid-card h3 {{ font-size: 21px; margin-bottom: 8px; }}
    .avoid-card p {{ color: #43502f; }}
    .cta {{ margin: 20px 0 42px; padding: 18px; border: 1px solid rgba(79,99,57,.26); background: rgba(79,99,57,.08); border-radius: 10px; }}
    .cta h2 {{ font-size: 28px; }}
    .cta p {{ color: var(--ink-soft); max-width: 700px; }}
    .cta a {{ display: inline-flex; margin-top: 12px; border: 1px solid var(--sage); border-radius: 999px; padding: 9px 13px; background: var(--sage); color: var(--card); text-decoration: none; font-family: var(--mono); font-size: 12px; }}
    footer {{ border-top: 1px solid var(--line); margin-top: 28px; padding: 28px 0 42px; color: var(--ink-soft); }}
    @media (max-width: 940px) {{
      .hero, .weed-grid, .avoid-grid {{ grid-template-columns: 1fr; }}
      .weed-card {{ grid-template-rows: 230px 1fr; }}
    }}
  </style>
</head>
<body>
  <header>
    <nav class="wrap" aria-label="Main navigation">
      <a href="./">Forage Berkeley</a>
      <a href="berkeley-plants.html">All Berkeley plants</a>
    </nav>
  </header>
  <main>
    <section class="hero wrap">
      <div>
        <p class="eyebrow">Berkeley and East Bay edible weed recognition</p>
        <h1>Edible weeds to learn before you forage.</h1>
        <p class="lede">This guide pulls common edible and caution weeds from the Forage Berkeley deck so local learners can practice recognition before making any real-world decision.</p>
      </div>
      <div class="quick">
        <p class="safety"><strong>Safety note:</strong> Forage Berkeley is a learning aid, not a safety authority. Do not eat anything based on this guide alone.</p>
        <div class="quick-card"><b>{len(selected_plants)}</b><span>deck-backed plants in this guide</span></div>
        <div class="quick-card"><b>{edible_count}</b><span>edible deck entries</span></div>
        <div class="quick-card"><b>{care_count}</b><span>caution entries</span></div>
      </div>
    </section>
    <section class="wrap" aria-label="Guide overview">
      <div class="jump" aria-label="Jump to guide sections">
        <a href="#sidewalk-lawns-title">Sidewalk and lawn weeds</a>
        <a href="#garden-weeds-title">Garden weeds</a>
        <a href="#shade-trail-edges-title">Shade and trail edges</a>
      </div>
      <section class="note-band" aria-labelledby="how-to-use-title">
        <h2 id="how-to-use-title">Use this as a recognition checklist.</h2>
        <p>The plants below are not a permission slip to harvest or eat. They are a local study set: learn the names, field marks, season, and warnings, then open each species page or practice in the quiz.</p>
      </section>
    </section>
{''.join(group_sections)}
    <section class="wrap avoid" aria-labelledby="avoid-title">
      <p class="eyebrow">Boundaries</p>
      <h2 id="avoid-title">What this page avoids</h2>
      <div class="avoid-grid">
        <article class="avoid-card">
          <h3>No eating-safety claims</h3>
          <p>The deck can help you learn plants. It cannot tell you a real plant in front of you is safe to eat.</p>
        </article>
        <article class="avoid-card">
          <h3>No harvesting locations</h3>
          <p>This guide does not list places to pick plants or imply that collecting is legal, clean, or appropriate.</p>
        </article>
        <article class="avoid-card">
          <h3>No affiliation claims</h3>
          <p>Forage Berkeley is independent and unaffiliated with UC Berkeley or any official safety reviewer.</p>
        </article>
      </div>
    </section>
    <section class="wrap cta" aria-labelledby="practice-title">
      <h2 id="practice-title">Practice the plants in the app.</h2>
      <p>The guide points back to the same learning deck, so you can move from reading to quiz practice without changing the safety boundary.</p>
      <a href="./#learn">Start the learning quiz</a>
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
    OUT_PATH.write_text(render(plants, meta), encoding="utf-8")
    print(f"Wrote {OUT_PATH.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
