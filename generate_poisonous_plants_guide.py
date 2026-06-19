#!/usr/bin/env python3
"""Generate the crawlable poisonous plants guide from data/berkeley.json."""

from __future__ import annotations

import json
from html import escape
from pathlib import Path


ROOT = Path(__file__).resolve().parent
DATA_PATH = ROOT / "data" / "berkeley.json"
META_PATH = ROOT / "photo_meta.json"
OUT_PATH = ROOT / "poisonous-plants.html"

CORE_IDS = [
    "poison-oak",
    "poison-hemlock",
    "datura",
    "oleander",
    "foxglove",
    "castor-bean",
    "english-yew",
    "privet",
    "firethorn",
    "cotoneaster",
    "horsechestnut",
]

CAUTION_IDS = [
    "wild-fennel",
    "blue-elderberry",
    "black-locust",
    "coast-live-oak",
    "valley-oak",
    "blue-gum-eucalyptus",
]

EDIBILITY_LABELS = {
    "edible": "Edible entry",
    "care": "Caution entry",
    "no": "Do not eat",
}

WARNING_OVERRIDES = {
    "wild-fennel": "Included because it can be confused with deadly poison hemlock. Use the scent and stem clues as a classroom check, not a field decision.",
    "blue-elderberry": "Included because some plant parts and unripe berries can be harmful. Treat it as a plant to confirm with a qualified local source before any real-world use.",
    "black-locust": "Included because most of the plant is toxic and the flowers can be confused with other pea-family trees. Use this page for recognition only.",
    "coast-live-oak": "Included because acorns are not casual snacks and oak species take practice to tell apart. Use this page to recognize the tree, not to prepare food.",
    "valley-oak": "Included because acorns are not casual snacks and oak species take practice to tell apart. Use this page to recognize the tree, not to prepare food.",
    "blue-gum-eucalyptus": "Included because aromatic leaves are easy to notice but concentrated oils can be dangerous. Use this page for recognition only, not remedies.",
}

SECTION_COPY = {
    "do-not-eat": {
        "title": "Toxic plants to recognize first",
        "intro": "These are the deck entries Forage Berkeley marks as do not eat. Learn them as recognition cards before you practice edible plants.",
    },
    "caution": {
        "title": "Common caution and look-alike traps",
        "intro": "These plants are not a green light to harvest. They are here because the wrong plant part, preparation, or look-alike can turn a casual nibble into a real risk.",
    },
}


def text(value: object) -> str:
    return escape(str(value or ""), quote=True)


def sentence_case(value: object) -> str:
    raw = str(value or "")
    return raw[:1].upper() + raw[1:]


def plant_by_id(plants: list[dict], plant_id: str) -> dict:
    for plant in plants:
        if plant["id"] == plant_id:
            return plant
    raise KeyError(f"Missing plant id: {plant_id}")


def local_photo(plant_id: str, meta: dict) -> tuple[str | None, str]:
    for photo in meta.get(plant_id, []):
        path = ROOT / "img" / plant_id / f"{photo['slot']}.jpg"
        if path.exists():
            return f"img/{plant_id}/{photo['slot']}.jpg", str(photo.get("label") or "photo")
    return None, ""


def plant_card(plant: dict, meta: dict) -> str:
    common = text(plant["commonName"])
    scientific = text(plant["scientificName"])
    category = text(sentence_case(plant.get("category")))
    season = text(plant.get("season"))
    features = text(plant.get("idFeatures"))
    warning = text(WARNING_OVERRIDES.get(plant["id"], plant.get("warning")))
    plant_id = text(plant["id"])
    edibility = text(EDIBILITY_LABELS.get(plant.get("edibility"), plant.get("edibility")))
    origin = text(sentence_case(plant.get("origin")))
    photo, photo_label = local_photo(plant["id"], meta)
    if photo:
        media = f'<img src="{text(photo)}" alt="{common} {text(photo_label)}" loading="lazy" width="360" height="270" />'
    else:
        media = f'<div class="plant-photo" aria-hidden="true">{common}</div>'

    return f"""
          <article class="plant-card" id="{plant_id}">
            {media}
            <div class="plant-copy">
              <p class="eyebrow">{edibility} / {origin} / {category}</p>
              <h3>{common}</h3>
              <p class="latin">{scientific}</p>
              <dl>
                <div><dt>Season</dt><dd>{season}</dd></div>
                <div><dt>How to recognize it</dt><dd>{features}</dd></div>
                <div><dt>Why it matters</dt><dd>{warning}</dd></div>
                <div><dt>Recognition boundary</dt><dd>This guide is for recognition practice only, not field use. Confirm real plants with a qualified local source before touching or using them.</dd></div>
              </dl>
              <a class="plant-link" href="berkeley-plants.html#{plant_id}">Open this plant in the 73-species guide</a>
            </div>
          </article>"""


def section(section_id: str, plants: list[dict], meta: dict) -> str:
    copy = SECTION_COPY[section_id]
    cards = "\n".join(plant_card(plant, meta) for plant in plants)
    return f"""
      <section class="plant-group" id="{section_id}" aria-labelledby="{section_id}-title">
        <div class="group-head">
          <p class="eyebrow">{len(plants)} deck entries</p>
          <h2 id="{section_id}-title">{text(copy["title"])}</h2>
          <p>{text(copy["intro"])}</p>
        </div>
        <div class="plant-grid">
{cards}
        </div>
      </section>"""


def render(plants: list[dict], meta: dict) -> str:
    core = [plant_by_id(plants, plant_id) for plant_id in CORE_IDS]
    caution = [plant_by_id(plants, plant_id) for plant_id in CAUTION_IDS]
    featured = core + caution

    item_list = {
        "@context": "https://schema.org",
        "@type": "ItemList",
        "name": "Poisonous plants in Berkeley and the East Bay",
        "numberOfItems": len(featured),
        "itemListElement": [
            {
                "@type": "ListItem",
                "position": index + 1,
                "name": plant["commonName"],
                "url": f"https://forage-berkeley.vercel.app/poisonous-plants.html#{plant['id']}",
            }
            for index, plant in enumerate(featured)
        ],
    }

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <title>Poisonous plants in Berkeley and the East Bay | Forage Berkeley</title>
  <meta name="description" content="Learn poisonous and caution-only Berkeley and East Bay plants from the Forage Berkeley deck, including poison oak, poison hemlock, datura, oleander, foxglove, yew, and common look-alike traps." />
  <link rel="canonical" href="https://forage-berkeley.vercel.app/poisonous-plants.html" />
  <link rel="icon" href="favicon.svg" type="image/svg+xml" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,400&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
  <script type="application/ld+json">{json.dumps(item_list, ensure_ascii=False)}</script>
  <style>
    :root {{
      --paper: #f7f3ec; --card: #fffdf9; --ink: #2b2118; --ink-soft: #6f624f;
      --sage: #4f6339; --rust: #a8421f; --rust-deep: #7d2f14; --amber: #b9791b; --line: #e6dccb;
      --serif: "Fraunces", Georgia, serif; --mono: "JetBrains Mono", ui-monospace, Menlo, monospace;
    }}
    * {{ box-sizing: border-box; }}
    body {{ margin: 0; background: var(--paper); color: var(--ink); font-family: var(--serif); line-height: 1.5; }}
    a {{ color: var(--rust-deep); }}
    .wrap {{ width: min(1120px, calc(100% - 32px)); margin: 0 auto; }}
    header {{ padding: 22px 0 14px; border-bottom: 1px solid var(--line); }}
    nav {{ display: flex; justify-content: space-between; gap: 18px; align-items: center; font-family: var(--mono); font-size: 13px; flex-wrap: wrap; }}
    nav a {{ text-decoration: none; }}
    .nav-links {{ display: flex; flex-wrap: wrap; gap: 14px; }}
    .hero {{ padding: 54px 0 34px; display: grid; gap: 28px; grid-template-columns: minmax(0, 1.25fr) minmax(270px, .75fr); align-items: end; }}
    h1 {{ font-size: clamp(38px, 7vw, 76px); line-height: .96; max-width: 900px; margin: 0 0 18px; font-weight: 600; }}
    h2 {{ font-size: clamp(28px, 4vw, 44px); line-height: 1; margin: 0 0 10px; }}
    h3 {{ font-size: 25px; line-height: 1.1; margin: 0; }}
    p {{ margin: 0; }}
    .lede {{ font-size: 20px; max-width: 780px; color: var(--ink-soft); }}
    .eyebrow {{ font-family: var(--mono); text-transform: uppercase; letter-spacing: 0; font-size: 11px; color: var(--ink-soft); }}
    .safety {{ padding: 18px; border: 1px solid rgba(168,66,31,.28); background: rgba(168,66,31,.08); border-radius: 12px; color: var(--rust-deep); }}
    .summary {{ display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 18px 0 32px; }}
    .stat {{ background: var(--card); border: 1px solid var(--line); border-radius: 10px; padding: 16px; }}
    .stat b {{ display: block; font-size: 29px; line-height: 1; margin-bottom: 5px; }}
    .path {{ display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin: 0 0 42px; }}
    .path a, .path div {{ border: 1px solid var(--line); background: var(--card); border-radius: 12px; padding: 15px; text-decoration: none; }}
    .path strong {{ display: block; color: var(--ink); font-size: 18px; line-height: 1.1; margin-bottom: 6px; }}
    .path span {{ color: var(--ink-soft); }}
    .plant-group {{ padding: 38px 0; border-top: 1px solid var(--line); }}
    .group-head {{ max-width: 760px; margin-bottom: 20px; }}
    .group-head p:last-child {{ color: var(--ink-soft); font-size: 17px; }}
    .plant-grid {{ display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }}
    .plant-card {{ display: grid; grid-template-columns: 170px minmax(0, 1fr); background: var(--card); border: 1px solid var(--line); border-radius: 12px; overflow: hidden; }}
    .plant-card img {{ width: 100%; height: 100%; min-height: 230px; object-fit: cover; background: #efe7d8; }}
    .plant-photo {{ min-height: 230px; display: grid; place-items: center; padding: 18px; background: #efe7d8; color: var(--ink-soft); font-family: var(--mono); font-size: 13px; text-align: center; }}
    .plant-copy {{ padding: 16px; }}
    .latin {{ color: var(--ink-soft); font-style: italic; margin: 2px 0 12px; }}
    dl {{ margin: 0; display: grid; gap: 10px; }}
    dt {{ font-family: var(--mono); text-transform: uppercase; letter-spacing: 0; font-size: 10px; color: var(--ink-soft); }}
    dd {{ margin: 0; font-size: 15px; }}
    .plant-link {{ display: inline-block; margin-top: 12px; font-family: var(--mono); font-size: 12px; }}
    .faq {{ padding: 42px 0; border-top: 1px solid var(--line); }}
    .faq-grid {{ display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin-top: 18px; }}
    .faq article {{ background: var(--card); border: 1px solid var(--line); border-radius: 12px; padding: 18px; }}
    .faq h3 {{ font-size: 20px; margin-bottom: 8px; }}
    footer {{ border-top: 1px solid var(--line); margin-top: 28px; padding: 28px 0 42px; color: var(--ink-soft); }}
    @media (max-width: 850px) {{
      .hero, .plant-grid, .path, .faq-grid {{ grid-template-columns: 1fr; }}
      .summary {{ grid-template-columns: repeat(2, 1fr); }}
    }}
    @media (max-width: 560px) {{
      .plant-card {{ grid-template-columns: 1fr; }}
      .plant-card img {{ height: 250px; }}
      .summary {{ grid-template-columns: 1fr; }}
    }}
  </style>
</head>
<body>
  <header>
    <nav class="wrap" aria-label="Main navigation">
      <a href="./">Forage Berkeley</a>
      <div class="nav-links">
        <a href="berkeley-plants.html">73-species guide</a>
        <a href="./#learn">Open the quiz</a>
      </div>
    </nav>
  </header>
  <main>
    <section class="hero wrap">
      <div>
        <p class="eyebrow">Berkeley and East Bay plant safety practice</p>
        <h1>Poisonous plants in Berkeley and the East Bay.</h1>
        <p class="lede">Start by learning the plants to avoid. This guide pulls the toxic and caution entries from the Forage Berkeley deck so local learners can recognize poison oak, poison hemlock, yew, oleander, and common look-alike traps before practicing edible plants.</p>
      </div>
      <p class="safety"><strong>Learning aid only.</strong> This page is not eating-safety advice, medical advice, or a harvesting guide. Never eat or handle a plant based on Forage Berkeley alone.</p>
    </section>
    <section class="wrap" aria-label="Guide summary">
      <div class="summary">
        <div class="stat"><b>{len(plants)}</b><span>plants in the full deck</span></div>
        <div class="stat"><b>{len(core)}</b><span>do-not-eat entries</span></div>
        <div class="stat"><b>{len(caution)}</b><span>caution and look-alike entries</span></div>
      </div>
      <div class="path" aria-label="Learning path">
        <div>
          <strong>1. Recognize the risky plants</strong>
          <span>Practice names, leaves, flowers, stems, and warning signs before thinking about use.</span>
        </div>
        <a href="berkeley-plants.html#no-plants">
          <strong>2. Cross-check the full deck</strong>
          <span>Every plant on this page links back to the 73-species guide for the same source notes.</span>
        </a>
        <a href="./#learn">
          <strong>3. Practice in the quiz</strong>
          <span>Use the app to recognize photos, but treat the real world as higher stakes than a quiz.</span>
        </a>
      </div>
    </section>
{section("do-not-eat", core, meta)}
{section("caution", caution, meta)}
    <section class="faq wrap" aria-labelledby="faq-title">
      <p class="eyebrow">Safety boundary</p>
      <h2 id="faq-title">What this guide can and cannot do</h2>
      <div class="faq-grid">
        <article>
          <h3>Can I use this to decide what to eat?</h3>
          <p>No. Use it for recognition practice only. Confirm any real plant with a qualified local source before touching, harvesting, or eating it.</p>
        </article>
        <article>
          <h3>Why include edible look-alikes?</h3>
          <p>Some edible or caution entries are useful because learners confuse them with toxic plants. Wild fennel and poison hemlock are the clearest example.</p>
        </article>
        <article>
          <h3>Is this affiliated with UC Berkeley?</h3>
          <p>No. Forage Berkeley is an independent learning tool for people around Berkeley and the East Bay.</p>
        </article>
      </div>
    </section>
  </main>
  <footer>
    <div class="wrap">
      <p>This page uses the same plant data and photo credits as the Forage Berkeley app. Photo credits live in <a href="CREDITS.md">CREDITS.md</a>. Forage Berkeley remains a learning tool, not a food-safety guide.</p>
    </div>
  </footer>
</body>
</html>
"""


def main() -> None:
    plants = json.loads(DATA_PATH.read_text())
    meta = json.loads(META_PATH.read_text())
    OUT_PATH.write_text(render(plants, meta), encoding="utf-8")
    print(f"Wrote {OUT_PATH.relative_to(ROOT)} from {DATA_PATH.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
