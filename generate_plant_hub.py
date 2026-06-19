#!/usr/bin/env python3
"""Generate the crawlable Berkeley plant hub from data/berkeley.json."""

from __future__ import annotations

import json
from collections import Counter, defaultdict
from html import escape
from pathlib import Path


ROOT = Path(__file__).resolve().parent
DATA_PATH = ROOT / "data" / "berkeley.json"
META_PATH = ROOT / "photo_meta.json"
OUT_PATH = ROOT / "berkeley-plants.html"
SPECIES_DIR = "plants"

EDIBILITY_LABELS = {
    "edible": "Edible",
    "care": "Eat with care",
    "no": "Do not eat",
}

GROUP_INTROS = {
    "edible": "Plants with commonly eaten parts, still listed here as learning material rather than eating advice.",
    "care": "Plants that need preparation, plant-part knowledge, or extra caution before anyone thinks about use.",
    "no": "Toxic or recognition-only plants that local learners should be able to spot and avoid.",
}

TOPIC_GUIDES = [
    {
        "href": "poison-hemlock-identification.html",
        "label": "Look-alike guide",
        "title": "Poison hemlock vs wild fennel",
        "copy": (
            "A recognition-only Berkeley and East Bay lesson for the deck's clearest "
            "deadly look-alike pair."
        ),
    },
]


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
    return f"{SPECIES_DIR}/{plant_id}.html"


def plant_card(plant: dict, meta: dict) -> str:
    common = text(plant["commonName"])
    scientific = text(plant["scientificName"])
    category = text(sentence_case(plant.get("category")))
    season = text(plant.get("season"))
    features = text(plant.get("idFeatures"))
    warning = text(plant.get("warning"))
    uses = text(plant.get("uses"))
    plant_id = text(plant["id"])
    species_href = text(species_page_path(plant["id"]))
    edibility = text(EDIBILITY_LABELS.get(plant.get("edibility"), plant.get("edibility")))
    origin = text(sentence_case(plant.get("origin")))
    photo, photo_label = local_photo(plant["id"], meta)
    if photo:
        media = f'<img src="{text(photo)}" alt="{common} {text(photo_label)}" loading="lazy" width="320" height="240" />'
    else:
        media = f'<div class="plant-photo" aria-hidden="true">{common}</div>'

    return f"""
          <article class="plant-card" id="{plant_id}">
            {media}
            <div class="plant-copy">
              <p class="eyebrow">{edibility} · {origin} · {category}</p>
              <h3><a href="{species_href}">{common}</a></h3>
              <p class="latin">{scientific}</p>
              <dl>
                <div><dt>Season</dt><dd>{season}</dd></div>
                <div><dt>How to identify it</dt><dd>{features}</dd></div>
                <div><dt>Watch for</dt><dd>{warning}</dd></div>
                <div><dt>Common uses</dt><dd>{uses}</dd></div>
              </dl>
              <a class="species-link" href="{species_href}">Open the species page</a>
            </div>
          </article>"""


def render(plants: list[dict], meta: dict) -> str:
    counts = Counter(p["edibility"] for p in plants)
    categories = Counter(p["category"] for p in plants)
    grouped = defaultdict(list)
    for plant in plants:
      grouped[plant["edibility"]].append(plant)

    for values in grouped.values():
      values.sort(key=lambda p: p["commonName"].lower())

    item_list = {
        "@context": "https://schema.org",
        "@type": "ItemList",
        "name": "Berkeley plant identification guide",
        "numberOfItems": len(plants),
        "itemListElement": [
            {
                "@type": "ListItem",
                "position": index + 1,
                "name": plant["commonName"],
                "url": f"https://forage-berkeley.vercel.app/{species_page_path(plant['id'])}",
            }
            for index, plant in enumerate(sorted(plants, key=lambda p: p["commonName"].lower()))
        ],
    }

    category_line = ", ".join(
        f"{count} {name}{'' if count == 1 else 's'}"
        for name, count in sorted(categories.items())
    )

    groups = []
    for edibility in ("edible", "care", "no"):
        plants_html = "\n".join(plant_card(plant, meta) for plant in grouped[edibility])
        groups.append(
            f"""
      <section class="plant-group" aria-labelledby="{edibility}-plants">
        <div class="group-head">
          <p class="eyebrow">{len(grouped[edibility])} species</p>
          <h2 id="{edibility}-plants">{text(EDIBILITY_LABELS[edibility])}</h2>
          <p>{text(GROUP_INTROS[edibility])}</p>
        </div>
        <div class="plant-grid">
{plants_html}
        </div>
      </section>"""
        )

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <title>Berkeley plant identification guide | Forage Berkeley</title>
  <meta name="description" content="A crawlable Berkeley and East Bay plant identification guide with {len(plants)} local species from Forage Berkeley. Learn leaves, seasons, warnings, and common uses safely." />
  <link rel="canonical" href="https://forage-berkeley.vercel.app/berkeley-plants.html" />
  <link rel="icon" href="favicon.svg" type="image/svg+xml" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,400&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
  <script type="application/ld+json">{json.dumps(item_list, ensure_ascii=False)}</script>
  <style>
    :root {{
      --paper: #f7f3ec; --card: #fffdf9; --ink: #2b2118; --ink-soft: #6f624f;
      --sage: #4f6339; --rust: #a8421f; --amber: #b9791b; --line: #e6dccb;
      --serif: "Fraunces", Georgia, serif; --mono: "JetBrains Mono", ui-monospace, Menlo, monospace;
    }}
    * {{ box-sizing: border-box; }}
    body {{ margin: 0; background: var(--paper); color: var(--ink); font-family: var(--serif); line-height: 1.5; }}
    a {{ color: var(--rust); }}
    .wrap {{ width: min(1120px, calc(100% - 32px)); margin: 0 auto; }}
    header {{ padding: 22px 0 14px; border-bottom: 1px solid var(--line); }}
    nav {{ display: flex; justify-content: space-between; gap: 18px; align-items: center; font-family: var(--mono); font-size: 13px; flex-wrap: wrap; }}
    nav a {{ text-decoration: none; }}
    .nav-links {{ display: flex; flex-wrap: wrap; gap: 14px; }}
    .hero {{ padding: 54px 0 36px; display: grid; gap: 28px; grid-template-columns: minmax(0, 1.35fr) minmax(260px, .65fr); align-items: end; }}
    h1 {{ font-size: clamp(38px, 7vw, 76px); line-height: .95; max-width: 850px; margin: 0 0 18px; font-weight: 600; }}
    h2 {{ font-size: clamp(28px, 4vw, 44px); line-height: 1; margin: 0 0 10px; }}
    h3 {{ font-size: 25px; line-height: 1.1; margin: 0; }}
    p {{ margin: 0; }}
    h3 a {{ color: inherit; text-decoration-color: rgba(168,66,31,.35); text-underline-offset: 4px; }}
    .lede {{ font-size: 20px; max-width: 760px; color: var(--ink-soft); }}
    .eyebrow {{ font-family: var(--mono); text-transform: uppercase; letter-spacing: 0; font-size: 11px; color: var(--ink-soft); }}
    .safety {{ padding: 16px 18px; border: 1px solid rgba(168,66,31,.25); background: rgba(168,66,31,.07); border-radius: 12px; color: var(--rust); }}
    .stats {{ display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 18px 0 42px; }}
    .stat {{ background: var(--card); border: 1px solid var(--line); border-radius: 10px; padding: 16px; }}
    .stat b {{ display: block; font-size: 29px; line-height: 1; margin-bottom: 5px; }}
    .jump {{ display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 42px; }}
    .jump a {{ border: 1px solid var(--line); border-radius: 999px; padding: 8px 12px; background: var(--card); text-decoration: none; font-family: var(--mono); font-size: 12px; }}
    .signup-cta {{ display: grid; gap: 10px; margin: 24px 0 42px; padding: 18px; border: 1px solid rgba(79,99,57,.26); background: rgba(79,99,57,.08); border-radius: 12px; }}
    .signup-cta h2 {{ font-size: 28px; margin: 0; }}
    .signup-cta p {{ color: var(--ink-soft); max-width: 700px; }}
    .signup-cta a {{ width: fit-content; border: 1px solid var(--sage); border-radius: 999px; padding: 9px 13px; background: var(--sage); color: var(--card); text-decoration: none; font-family: var(--mono); font-size: 12px; }}
    .guide-links {{ display: grid; gap: 10px; margin: 24px 0 42px; padding: 18px; border: 1px solid rgba(47,100,112,.26); background: rgba(47,100,112,.08); border-radius: 12px; }}
    .guide-links h2 {{ font-size: 28px; margin: 0; }}
    .guide-links p {{ color: var(--ink-soft); max-width: 720px; }}
    .guide-links a {{ width: fit-content; border: 1px solid var(--line); border-radius: 999px; padding: 9px 13px; background: var(--card); text-decoration: none; font-family: var(--mono); font-size: 12px; }}
    .topic-guides {{ margin: 0 0 42px; }}
    .topic-grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 12px; }}
    .topic-card {{ display: grid; gap: 8px; background: var(--card); border: 1px solid var(--line); border-radius: 12px; padding: 18px; text-decoration: none; color: inherit; }}
    .topic-card p:last-child {{ color: var(--ink-soft); }}
    .plant-group {{ padding: 38px 0; border-top: 1px solid var(--line); }}
    .group-head {{ max-width: 720px; margin-bottom: 20px; }}
    .group-head p:last-child {{ color: var(--ink-soft); font-size: 17px; }}
    .plant-grid {{ display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }}
    .plant-card {{ display: grid; grid-template-columns: 150px minmax(0, 1fr); background: var(--card); border: 1px solid var(--line); border-radius: 12px; overflow: hidden; }}
    .plant-card img {{ width: 100%; height: 100%; min-height: 210px; object-fit: cover; background: #efe7d8; }}
    .plant-photo {{ min-height: 210px; display: grid; place-items: center; padding: 18px; background: #efe7d8; color: var(--ink-soft); font-family: var(--mono); font-size: 13px; text-align: center; }}
    .plant-copy {{ padding: 16px; }}
    .latin {{ color: var(--ink-soft); font-style: italic; margin: 2px 0 12px; }}
    dl {{ margin: 0; display: grid; gap: 10px; }}
    dt {{ font-family: var(--mono); text-transform: uppercase; letter-spacing: 0; font-size: 10px; color: var(--ink-soft); }}
    dd {{ margin: 0; font-size: 15px; }}
    .species-link {{ display: inline-flex; width: fit-content; margin-top: 13px; border: 1px solid var(--line); border-radius: 999px; padding: 7px 10px; background: #f8f1e7; text-decoration: none; font-family: var(--mono); font-size: 11px; }}
    footer {{ border-top: 1px solid var(--line); margin-top: 28px; padding: 28px 0 42px; color: var(--ink-soft); }}
    @media (max-width: 850px) {{
      .hero, .plant-grid {{ grid-template-columns: 1fr; }}
      .stats {{ grid-template-columns: repeat(2, 1fr); }}
    }}
    @media (max-width: 560px) {{
      .plant-card {{ grid-template-columns: 1fr; }}
      .plant-card img {{ height: 230px; }}
    }}
  </style>
</head>
<body>
  <header>
    <nav class="wrap" aria-label="Main navigation">
      <a href="./">Forage Berkeley</a>
      <div class="nav-links">
        <a href="./">Open the learning quiz</a>
        <a href="poisonous-plants.html">Poisonous plants guide</a>
      </div>
    </nav>
  </header>
  <main>
    <section class="hero wrap">
      <div>
        <p class="eyebrow">Berkeley and East Bay plant identification</p>
        <h1>Learn the local plants before you forage.</h1>
        <p class="lede">This guide turns the Forage Berkeley plant deck into a crawlable reference for common edible, caution, and toxic plants around Berkeley. Use it to learn names, leaves, seasons, and warnings, then practice in the quiz.</p>
      </div>
      <p class="safety"><strong>Safety note:</strong> Forage Berkeley is a learning aid, not a safety authority. Never eat anything based on this app alone.</p>
    </section>
    <section class="wrap" aria-label="Guide summary">
      <div class="stats">
        <div class="stat"><b>{len(plants)}</b><span>local species</span></div>
        <div class="stat"><b>{counts['edible']}</b><span>edible entries</span></div>
        <div class="stat"><b>{counts['care']}</b><span>care entries</span></div>
        <div class="stat"><b>{counts['no']}</b><span>do-not-eat entries</span></div>
      </div>
      <p class="lede">The deck currently covers {text(category_line)}. Each entry is generated from the same plant data used by the app, so the guide stays tied to the learning deck instead of becoming a separate list.</p>
      <div class="jump" aria-label="Jump to plant groups">
        <a href="#edible-plants">Edible plants</a>
        <a href="#care-plants">Eat with care</a>
        <a href="#no-plants">Do not eat</a>
        <a href="poisonous-plants.html">Poisonous plants guide</a>
      </div>
      <section class="guide-links" aria-labelledby="related-guides-title">
        <h2 id="related-guides-title">Study a focused local guide</h2>
        <p>Start with the common edible and caution weeds Berkeley learners are most likely to notice, then open each species page for the full deck notes.</p>
        <a href="edible-weeds-berkeley-east-bay.html">Read the edible weeds guide</a>
      </section>
      <section class="signup-cta" aria-labelledby="guide-signup-title">
        <h2 id="guide-signup-title">Get local plant-learning updates</h2>
        <p>Leave an email for Forage Berkeley progress notes and new Berkeley plant lessons. Updates only, never safety advice.</p>
        <a href="./?signup_source=plant-guide#signup-capture">Join the update list</a>
      </section>
      <section class="topic-guides" aria-labelledby="topic-guides-title">
        <p class="eyebrow">Recognition-first lessons</p>
        <h2 id="topic-guides-title">Local look-alike guides</h2>
        <div class="topic-grid">
          {''.join(f'<a class="topic-card" href="{text(guide["href"])}"><p class="eyebrow">{text(guide["label"])}</p><h3>{text(guide["title"])}</h3><p>{text(guide["copy"])}</p></a>' for guide in TOPIC_GUIDES)}
        </div>
      </section>
    </section>
{''.join(groups)}
  </main>
  <footer>
    <div class="wrap">
      <p>This guide uses the same plant deck as the Forage Berkeley quiz. For the recognition-first safety page, read the <a href="poisonous-plants.html">poisonous plants guide</a>. Photo credits live in <a href="CREDITS.md">CREDITS.md</a>. Forage Berkeley remains a learning tool, not a food-safety guide.</p>
    </div>
  </footer>
</body>
</html>
"""


def main() -> None:
    plants = json.loads(DATA_PATH.read_text())
    meta = json.loads(META_PATH.read_text())
    OUT_PATH.write_text(render(plants, meta), encoding="utf-8")
    print(f"Wrote {OUT_PATH.relative_to(ROOT)} from {DATA_PATH.relative_to(ROOT)} ({len(plants)} plants)")


if __name__ == "__main__":
    main()
