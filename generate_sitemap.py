#!/usr/bin/env python3
"""Generate sitemap.xml for the public Forage Berkeley pages."""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from xml.sax.saxutils import escape


ROOT = Path(__file__).resolve().parent
DATA_PATH = ROOT / "data" / "berkeley.json"
OUT_PATH = ROOT / "sitemap.xml"
SITE_ORIGIN = "https://forage-berkeley.vercel.app"
LASTMOD = "2026-06-19"


@dataclass(frozen=True)
class SitemapPage:
    path: str
    changefreq: str
    priority: str


STATIC_PAGES = [
    SitemapPage("/", "weekly", "1.0"),
    SitemapPage("/berkeley-plants.html", "monthly", "0.9"),
    SitemapPage("/poisonous-plants.html", "monthly", "0.8"),
    SitemapPage("/edible-weeds-berkeley-east-bay.html", "monthly", "0.8"),
    SitemapPage("/poison-hemlock-identification.html", "monthly", "0.8"),
    SitemapPage("/uc-berkeley-plant-learning.html", "monthly", "0.7"),
]


def species_pages() -> list[SitemapPage]:
    plants = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    return [
        SitemapPage(f"/plants/{plant['id']}.html", "monthly", "0.6")
        for plant in sorted(plants, key=lambda p: p["commonName"].lower())
    ]


def public_pages() -> list[SitemapPage]:
    pages = []
    for page in STATIC_PAGES:
        if page.path == "/" or (ROOT / page.path.lstrip("/")).exists():
            pages.append(page)
    return pages + species_pages()


def page_url(path: str) -> str:
    if path == "/":
        return f"{SITE_ORIGIN}/"
    return f"{SITE_ORIGIN}{path}"


def render() -> str:
    urls = []
    for page in public_pages():
        urls.append(
            "  <url>\n"
            f"    <loc>{escape(page_url(page.path))}</loc>\n"
            f"    <lastmod>{LASTMOD}</lastmod>\n"
            f"    <changefreq>{page.changefreq}</changefreq>\n"
            f"    <priority>{page.priority}</priority>\n"
            "  </url>"
        )

    return (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        + "\n".join(urls)
        + "\n</urlset>\n"
    )


def main() -> None:
    pages = public_pages()
    OUT_PATH.write_text(render(), encoding="utf-8")
    print(f"Wrote {OUT_PATH.relative_to(ROOT)} with {len(pages)} URLs")


if __name__ == "__main__":
    main()
