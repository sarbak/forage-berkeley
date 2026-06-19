#!/usr/bin/env python3
"""Generate the poison oak and blackberry comparison guide."""

from __future__ import annotations

import json
from html import escape
from pathlib import Path


ROOT = Path(__file__).resolve().parent
DATA_PATH = ROOT / "data" / "berkeley.json"
META_PATH = ROOT / "photo_meta.json"
OUT_PATH = ROOT / "poison-oak-identification.html"
SITE_ORIGIN = "https://forage-berkeley.vercel.app"

GUIDE_IDS = ("poison-oak", "california-blackberry", "himalayan-blackberry")
EDIBILITY_LABELS = {
    "edible": "Edible entry",
    "care": "Caution entry",
    "no": "Do not eat entry",
}


def text(value: object) -> str:
    return escape(str(value or ""), quote=True)


def local_photo(plant_id: str, meta: dict, slot: str = "leaf") -> tuple[str, str]:
    for photo in meta.get(plant_id, []):
        if photo.get("slot") != slot:
            continue
        path = ROOT / "img" / plant_id / f"{slot}.jpg"
        if path.exists():
            return f"img/{plant_id}/{slot}.jpg", str(photo.get("label") or "photo")

    for photo in meta.get(plant_id, []):
        path = ROOT / "img" / plant_id / f"{photo['slot']}.jpg"
        if path.exists():
            return f"img/{plant_id}/{photo['slot']}.jpg", str(photo.get("label") or "photo")

    return "", ""


def load_plants() -> tuple[dict[str, dict], dict]:
    plants = {plant["id"]: plant for plant in json.loads(DATA_PATH.read_text())}
    meta = json.loads(META_PATH.read_text())
    return plants, meta


def species_page_path(plant_id: str) -> str:
    return f"plants/{plant_id}.html"


def image_card(plant: dict, meta: dict, slot: str = "leaf") -> str:
    plant_id = plant["id"]
    common = text(plant["commonName"])
    scientific = text(plant["scientificName"])
    photo, photo_label = local_photo(plant_id, meta, slot=slot)
    media = (
        f'<img src="{text(photo)}" alt="{common} {text(photo_label)}" width="720" height="540" loading="eager" />'
        if photo
        else f'<div class="plant-photo" aria-hidden="true">{common}</div>'
    )

    return f"""
        <article class="image-card">
          {media}
          <div>
            <p class="eyebrow">{text(plant.get("season"))}</p>
            <h3>{common}</h3>
            <p class="latin">{scientific}</p>
          </div>
        </article>"""


def comparison_row(label: str, oak: str, california: str, himalayan: str) -> str:
    return f"""
          <tr>
            <th scope="row">{text(label)}</th>
            <td>{text(oak)}</td>
            <td>{text(california)}</td>
            <td>{text(himalayan)}</td>
          </tr>"""


def plant_note(plant: dict, eyebrow: str, summary: str) -> str:
    common = text(plant["commonName"])
    scientific = text(plant["scientificName"])
    plant_id = text(plant["id"])
    href = text(species_page_path(plant["id"]))

    return f"""
      <article class="panel plant-note">
        <p class="eyebrow">{text(eyebrow)}</p>
        <h3>{common}</h3>
        <p class="latin">{scientific}</p>
        <p>{text(summary)}</p>
        <a href="{href}">Open {common} species page</a>
      </article>"""


def render() -> str:
    plants, meta = load_plants()
    oak = plants["poison-oak"]
    california = plants["california-blackberry"]
    himalayan = plants["himalayan-blackberry"]
    guide_plants = [oak, california, himalayan]

    rows = "\n".join(
        [
            comparison_row(
                "Deck label",
                "Do not eat. Recognition only.",
                "Edible entry in the deck, but not eating permission.",
                "Edible entry in the deck, but not eating permission.",
            ),
            comparison_row("Plant form", oak["category"], california["category"], himalayan["category"]),
            comparison_row("Origin", oak["origin"], california["origin"], himalayan["origin"]),
            comparison_row("Season cue", oak["season"], california["season"], himalayan["season"]),
            comparison_row("Recognition notes", oak["idFeatures"], california["idFeatures"], himalayan["idFeatures"]),
            comparison_row("Where the deck places it", oak["story"], california["story"], himalayan["story"]),
        ]
    )

    json_ld = {
        "@context": "https://schema.org",
        "@type": "LearningResource",
        "name": "Poison oak identification in Berkeley and the East Bay",
        "description": (
            "A recognition-first Berkeley and East Bay guide to poison oak, "
            "with deck-backed blackberry comparison context from Forage Berkeley."
        ),
        "url": f"{SITE_ORIGIN}/poison-oak-identification.html",
        "about": [
            {"@type": "Thing", "name": plant["commonName"], "alternateName": plant["scientificName"]}
            for plant in guide_plants
        ],
        "isPartOf": {"@type": "WebSite", "name": "Forage Berkeley", "url": SITE_ORIGIN},
        "learningResourceType": "Plant identification guide",
        "educationalUse": "Self-guided plant learning",
    }

    notes = "\n".join(
        [
            plant_note(
                oak,
                EDIBILITY_LABELS[oak["edibility"]],
                (
                    "The deck makes Poison Oak a recognition-only card: learn the three glossy, scalloped leaflets, "
                    "the shrub or climbing-vine form, and the seasonal red leaves or bare winter canes."
                ),
            ),
            plant_note(
                california,
                EDIBILITY_LABELS[california["edibility"]],
                (
                    "The native blackberry is included here only as comparison context. Its deck row calls out a "
                    "trailing vine with three leaflets, slender straight thorns, and smaller tart berries."
                ),
            ),
            plant_note(
                himalayan,
                EDIBILITY_LABELS[himalayan["edibility"]],
                (
                    "The introduced blackberry gives learners another bramble reference. The deck describes huge "
                    "arching canes, thick ridged stems, broad curved thorns, five leaflets, and big sweet berries."
                ),
            ),
        ]
    )

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <title>Poison oak identification in Berkeley | Forage Berkeley</title>
  <meta name="description" content="Learn poison oak identification in Berkeley and the East Bay with deck-backed blackberry comparison context. Recognition practice only, not safety, removal, or medical advice." />
  <link rel="canonical" href="{SITE_ORIGIN}/poison-oak-identification.html" />
  <link rel="icon" href="favicon.svg" type="image/svg+xml" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,400&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
  <script type="application/ld+json">{json.dumps(json_ld, ensure_ascii=False)}</script>
  <style>
    :root {{
      --paper: #f7f3ec; --card: #fffdf9; --ink: #2b2118; --ink-soft: #6f624f;
      --sage: #4f6339; --rust: #a8421f; --berry: #5f304d; --line: #e6dccb;
      --serif: "Fraunces", Georgia, serif; --mono: "JetBrains Mono", ui-monospace, Menlo, monospace;
    }}
    * {{ box-sizing: border-box; }}
    body {{ margin: 0; background: var(--paper); color: var(--ink); font-family: var(--serif); line-height: 1.5; }}
    a {{ color: var(--rust); }}
    .wrap {{ width: min(1100px, calc(100% - 32px)); margin: 0 auto; }}
    header {{ padding: 22px 0 14px; border-bottom: 1px solid var(--line); }}
    nav {{ display: flex; justify-content: space-between; gap: 18px; align-items: center; font-family: var(--mono); font-size: 13px; }}
    nav a {{ text-decoration: none; }}
    main {{ padding-bottom: 44px; }}
    .hero {{ padding: 52px 0 32px; display: grid; gap: 28px; grid-template-columns: minmax(0, 1.08fr) minmax(280px, .72fr); align-items: end; }}
    h1 {{ margin: 0 0 18px; font-size: clamp(40px, 7vw, 78px); line-height: .95; font-weight: 600; max-width: 850px; }}
    h2 {{ margin: 0 0 12px; font-size: clamp(28px, 4vw, 44px); line-height: 1; }}
    h3 {{ margin: 0; font-size: 25px; line-height: 1.05; }}
    p {{ margin: 0; }}
    .eyebrow {{ font-family: var(--mono); text-transform: uppercase; letter-spacing: 0; font-size: 11px; color: var(--ink-soft); }}
    .lede {{ color: var(--ink-soft); font-size: 20px; max-width: 740px; }}
    .safety {{ padding: 18px; border: 1px solid rgba(168,66,31,.28); background: rgba(168,66,31,.08); border-radius: 12px; color: var(--rust); }}
    .image-grid {{ display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; margin: 18px 0 34px; }}
    .image-card {{ background: var(--card); border: 1px solid var(--line); border-radius: 12px; overflow: hidden; }}
    .image-card img {{ display: block; width: 100%; aspect-ratio: 4 / 3; object-fit: cover; background: #efe7d8; }}
    .image-card div {{ padding: 15px; }}
    .plant-photo {{ min-height: 260px; display: grid; place-items: center; padding: 24px; background: #efe7d8; color: var(--ink-soft); font-family: var(--mono); font-size: 13px; text-align: center; }}
    .latin {{ color: var(--ink-soft); font-style: italic; margin-top: 2px; }}
    .panel {{ background: var(--card); border: 1px solid var(--line); border-radius: 12px; padding: 20px; margin-bottom: 16px; }}
    .compare {{ overflow-x: auto; }}
    table {{ width: 100%; border-collapse: collapse; min-width: 820px; }}
    th, td {{ border-bottom: 1px solid var(--line); padding: 13px 12px; text-align: left; vertical-align: top; }}
    th {{ font-family: var(--mono); text-transform: uppercase; letter-spacing: 0; font-size: 10px; color: var(--ink-soft); width: 18%; }}
    thead th {{ color: var(--ink); font-size: 12px; }}
    .note-grid {{ display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }}
    .plant-note {{ display: grid; gap: 10px; margin-bottom: 0; }}
    .plant-note p:not(.eyebrow):not(.latin) {{ color: var(--ink-soft); font-size: 16px; }}
    .plant-note a {{ width: fit-content; border: 1px solid var(--line); border-radius: 999px; padding: 8px 11px; background: #f8f1e7; text-decoration: none; font-family: var(--mono); font-size: 11px; }}
    .actions {{ display: flex; flex-wrap: wrap; gap: 9px; margin-top: 18px; }}
    .actions a {{ border: 1px solid var(--line); border-radius: 999px; padding: 9px 12px; background: #f8f1e7; text-decoration: none; font-family: var(--mono); font-size: 12px; }}
    .signup-cta {{ display: grid; gap: 10px; margin-bottom: 16px; border-color: rgba(79,99,57,.26); background: rgba(79,99,57,.08); }}
    .signup-cta h2 {{ font-size: 28px; margin: 0; }}
    .signup-cta p {{ color: var(--ink-soft); max-width: 720px; }}
    .signup-cta a {{ width: fit-content; border: 1px solid var(--sage); border-radius: 999px; padding: 9px 13px; background: var(--sage); color: var(--card); text-decoration: none; font-family: var(--mono); font-size: 12px; }}
    footer {{ border-top: 1px solid var(--line); margin-top: 34px; padding: 28px 0 42px; color: var(--ink-soft); }}
    @media (max-width: 900px) {{
      .hero, .image-grid, .note-grid {{ grid-template-columns: 1fr; }}
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
        <p class="eyebrow">Berkeley and East Bay plant identification</p>
        <h1>Poison oak identification, compared with local blackberries.</h1>
        <p class="lede">Poison oak is one of the highest-fit safety topics left after the launch guide stack. This page turns the deck's Poison Oak, California Blackberry, and Himalayan Blackberry rows into recognition practice for Berkeley and East Bay learners.</p>
      </div>
      <p class="safety"><strong>Safety boundary:</strong> This is a learning page, not eating, touching, removal, rash-treatment, medical, or field-safety advice. It does not tell you what to do around a real plant.</p>
    </section>

    <section class="wrap" aria-label="Plant photos">
      <div class="image-grid">
        {image_card(oak, meta, slot="leaf")}
        {image_card(california, meta, slot="leaf")}
        {image_card(himalayan, meta, slot="leaf")}
      </div>
    </section>

    <section class="wrap panel" aria-labelledby="comparison-title">
      <h2 id="comparison-title">What the deck says to compare</h2>
      <p class="lede">The blackberry rows are here for shape and vocabulary practice, not for eating clearance. Use the linked species pages to keep studying the same source notes from the 73-species deck.</p>
      <div class="compare">
        <table>
          <thead>
            <tr>
              <th scope="col">Deck note</th>
              <th scope="col">{text(oak["commonName"])}</th>
              <th scope="col">{text(california["commonName"])}</th>
              <th scope="col">{text(himalayan["commonName"])}</th>
            </tr>
          </thead>
          <tbody>
{rows}
          </tbody>
        </table>
      </div>
    </section>

    <section class="wrap note-grid" aria-label="Species notes">
{notes}
    </section>

    <section class="wrap panel signup-cta" aria-labelledby="poison-oak-signup-title">
      <h2 id="poison-oak-signup-title">Get local plant-learning updates</h2>
      <p>Leave an email for Forage Berkeley progress notes and new Berkeley plant lessons. Updates only, never safety advice.</p>
      <a href="./?signup_source=poison-oak-guide#signup-capture">Join the update list</a>
    </section>

    <section class="wrap panel" aria-labelledby="practice-title">
      <h2 id="practice-title">Practice from the same local deck</h2>
      <p class="lede">Forage Berkeley is independent, unaffiliated with UC Berkeley, and generated from the current plant deck, not from an expert safety review.</p>
      <div class="actions">
        <a href="berkeley-plants.html#poison-oak">Find Poison Oak in the full guide</a>
        <a href="berkeley-plants.html#california-blackberry">Find California Blackberry in the full guide</a>
        <a href="berkeley-plants.html#himalayan-blackberry">Find Himalayan Blackberry in the full guide</a>
        <a href="./#learn">Practice in the quiz</a>
      </div>
    </section>
  </main>
  <footer>
    <div class="wrap">
      <p>Forage Berkeley is a learning aid, not a safety authority for eating, handling, removal, rash treatment, or medical decisions.</p>
    </div>
  </footer>
</body>
</html>
"""


def main() -> None:
    OUT_PATH.write_text(render(), encoding="utf-8")
    print(f"Wrote {OUT_PATH.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
