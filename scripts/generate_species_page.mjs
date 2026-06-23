import { mkdir, readFile, writeFile } from "node:fs/promises";

const plants = JSON.parse(await readFile(new URL("../data/berkeley.json", import.meta.url), "utf8"));
const photoMeta = JSON.parse(await readFile(new URL("../photo_meta.json", import.meta.url), "utf8"));
const baseUrl = "https://forage-berkeley.vercel.app";
const lastmod = "2026-06-23";

const labels = {
  edible: "Edible",
  care: "Use with care",
  no: "Recognition only"
};

const descriptions = {
  edible: "Plants in this group have edible uses in the app, but still need confident identification and clean harvesting conditions.",
  care: "Plants in this group need preparation, restraint, or extra caution. Read the warning before treating them as food.",
  no: "Plants in this group are included so learners recognize what to avoid. Do not eat them."
};

const poisonousCoreIds = [
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
  "horsechestnut"
];

const poisonousCautionIds = [
  "wild-fennel",
  "blue-elderberry",
  "black-locust",
  "coast-live-oak",
  "valley-oak",
  "blue-gum-eucalyptus"
];

const guidePages = [
  {
    path: "poisonous-plants/",
    title: "Poisonous plants in Berkeley and the East Bay",
    description: "Practice recognizing poisonous, recognition-only, and look-alike plants from the Forage Berkeley local photo deck.",
    id: "poisonous-plants"
  },
  {
    path: "poison-hemlock-identification/",
    title: "Poison hemlock identification in Berkeley",
    description: "Compare Poison Hemlock and Wild Fennel using Forage Berkeley deck notes and field photos. Recognition practice only.",
    id: "poison-hemlock-identification"
  }
];

const guideSafetyText = "This page is a recognition practice aid, not a safety authority. Never eat, touch, harvest, remove, or prepare any plant based on this page or the app alone.";

const counts = plants.reduce((acc, plant) => {
  acc[plant.edibility] = (acc[plant.edibility] || 0) + 1;
  return acc;
}, {});

function esc(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function json(value) {
  return JSON.stringify(value);
}

function plantUrl(plant) {
  return `${baseUrl}/species/${plant.id}/`;
}

function appPlantHash(plant) {
  return `#plant/${plant.id}`;
}

function titleCase(value) {
  return String(value).replace(/\b\w/g, (match) => match.toUpperCase());
}

function plantMetaDescription(plant) {
  return `${plant.commonName} (${plant.scientificName}) in Forage Berkeley: ${labels[plant.edibility]} notes, season, identification cues, warnings, and uses from the local photo quiz.`;
}

function photoEntries(plant) {
  return (photoMeta[plant.id] || []).map((photo) => ({
    ...photo,
    src: `/img/${plant.id}/${photo.slot}.jpg`,
    alt: `${plant.commonName} ${photo.label || "photo"}`
  }));
}

function plantById(id) {
  const plant = plants.find((candidate) => candidate.id === id);
  if (!plant) throw new Error(`Missing plant id: ${id}`);
  return plant;
}

function guideUrl(page) {
  return `${baseUrl}/${page.path}`;
}

function guidePageById(id) {
  const page = guidePages.find((candidate) => candidate.id === id);
  if (!page) throw new Error(`Missing guide page: ${id}`);
  return page;
}

function guidePhoto(plant, eager = false) {
  const photo = photoEntries(plant)[0];
  if (!photo) {
    return `<div class="guide-photo" aria-hidden="true">${esc(plant.commonName)}</div>`;
  }

  return `<img src="${esc(photo.src)}" alt="${esc(photo.alt)}" loading="${eager ? "eager" : "lazy"}" decoding="async" />`;
}

function plantRow(plant) {
  return `          <li class="plant-row" data-edibility="${esc(plant.edibility)}" data-search="${esc(`${plant.commonName} ${plant.scientificName}`)}">
            <div>
              <h3><a href="${esc(plant.id)}/">${esc(plant.commonName)}</a></h3>
              <p><i>${esc(plant.scientificName)}</i> · ${esc(plant.category)}</p>
            </div>
            <span>${esc(labels[plant.edibility])}</span>
          </li>`;
}

function groupSection(edibility) {
  const rows = plants.filter((plant) => plant.edibility === edibility).map(plantRow).join("\n");
  return `      <section class="species-group" id="${edibility}">
        <div class="group-head">
          <h2>${esc(labels[edibility])}</h2>
          <p>${esc(descriptions[edibility])}</p>
          <b>${counts[edibility] || 0} plants</b>
        </div>
        <ol>
${rows}
        </ol>
      </section>`;
}

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Berkeley plant species directory | Forage Berkeley</title>
  <meta name="description" content="Browse the 73 local plant species in Forage Berkeley, grouped by edible, use-with-care, and recognition-only safety labels." />
  <meta name="theme-color" content="#f7f3ec" />
  <link rel="icon" href="../favicon.svg" type="image/svg+xml" />
  <link rel="apple-touch-icon" href="../apple-touch-icon.png" />
  <link rel="canonical" href="https://forage-berkeley.vercel.app/species/" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://forage-berkeley.vercel.app/species/" />
  <meta property="og:title" content="Berkeley plant species directory | Forage Berkeley" />
  <meta property="og:description" content="A crawlable list of the 73 local plant species in Forage Berkeley, grouped by edible, use-with-care, and recognition-only labels." />
  <meta property="og:image" content="https://forage-berkeley.vercel.app/og.png" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="Berkeley plant species directory | Forage Berkeley" />
  <meta name="twitter:description" content="Browse 73 Berkeley and East Bay plants by edible, use-with-care, and recognition-only labels." />
  <meta name="twitter:image" content="https://forage-berkeley.vercel.app/og.png" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,400&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": "https://forage-berkeley.vercel.app/species/#webpage",
    "url": "https://forage-berkeley.vercel.app/species/",
    "name": "Berkeley plant species directory",
    "description": "A crawlable list of the 73 local plant species in Forage Berkeley, grouped by edible, use-with-care, and recognition-only labels.",
    "isPartOf": {
      "@id": "https://forage-berkeley.vercel.app/#website"
    },
    "about": {
      "@id": "https://forage-berkeley.vercel.app/#app"
    },
    "publisher": {
      "@id": "https://forage-berkeley.vercel.app/#organization"
    }
  }
  </script>
  <style>
    :root {
      --paper: #f7f3ec; --card: #fffdf9; --ink: #2b2118; --ink-soft: #7b6c57;
      --rust: #a8421f; --rust-deep: #7d2f14; --sage: #5e6b43; --sage-deep:#46512f;
      --amber: #8f5a10; --line: #e6dccb; --serif: "Fraunces", Georgia, serif;
      --mono: "JetBrains Mono", ui-monospace, Menlo, monospace;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0; background: var(--paper); color: var(--ink); font-family: var(--serif);
      -webkit-font-smoothing: antialiased;
    }
    a { color: var(--rust-deep); text-decoration-thickness: 1px; text-underline-offset: 3px; }
    .wrap { width: min(920px, calc(100% - 32px)); margin: 0 auto; padding: 22px 0 40px; }
    .top { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 24px; }
    .brand { font-weight: 600; font-size: 18px; color: var(--ink); text-decoration: none; }
    .brand b { color: var(--sage-deep); }
    .app-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 14px; }
    .app-link { font-family: var(--mono); font-size: 12px; letter-spacing: .05em; text-transform: uppercase; }
    .hero { display: grid; gap: 14px; margin-bottom: 26px; }
    h1 { margin: 0; max-width: 760px; font-size: clamp(34px, 6vw, 56px); line-height: 1; font-weight: 600; }
    .lede { margin: 0; max-width: 680px; color: var(--ink-soft); font-size: 18px; line-height: 1.45; }
    .safety {
      max-width: 680px; padding: 10px 12px; border: 1px solid rgba(168,66,31,.25);
      border-radius: 8px; color: var(--rust-deep); background: rgba(168,66,31,.06);
      font-size: 15px; line-height: 1.4;
    }
    .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin: 8px 0 22px; }
    .stat {
      border: 1px solid var(--line); border-radius: 8px; background: rgba(255,253,249,.7);
      padding: 10px; font-family: var(--mono); color: var(--ink-soft); font-size: 11px;
    }
    .stat b { display: block; color: var(--ink); font-size: 20px; font-weight: 500; line-height: 1.1; }
    .directory-controls {
      display: grid; gap: 10px; margin: 0 0 24px; padding: 12px;
      border: 1px solid var(--line); border-radius: 8px; background: rgba(255,253,249,.62);
    }
    .directory-label { font-family: var(--mono); font-size: 11px; letter-spacing: .08em; text-transform: uppercase; color: var(--ink-soft); }
    .directory-search {
      width: 100%; min-height: 44px; padding: 10px 12px; border: 1px solid var(--line); border-radius: 8px;
      background: var(--card); color: var(--ink); font: 16px var(--serif);
    }
    .filter-row { display: flex; flex-wrap: wrap; gap: 8px; }
    .filter-chip {
      min-height: 34px; padding: 0 12px; border-radius: 999px; border: 1px solid var(--line);
      background: transparent; color: var(--ink-soft); font-family: var(--mono); font-size: 11px;
      letter-spacing: .05em; text-transform: uppercase; cursor: pointer;
    }
    .filter-chip[aria-pressed="true"] { background: var(--ink); color: var(--paper); border-color: var(--ink); }
    .filter-status, .no-results { margin: 0; color: var(--ink-soft); font-size: 14px; line-height: 1.4; }
    .species-group { margin-top: 18px; }
    .group-head {
      display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 6px 16px; align-items: start;
      border-bottom: 1px solid var(--line); padding-bottom: 9px; margin-bottom: 8px;
    }
    .group-head h2 { margin: 0; font-size: 24px; font-weight: 600; }
    .group-head p { grid-column: 1 / -1; margin: 0; color: var(--ink-soft); line-height: 1.4; }
    .group-head b { font-family: var(--mono); font-size: 11px; color: var(--ink-soft); white-space: nowrap; }
    ol { list-style: none; margin: 0; padding: 0; display: grid; gap: 7px; }
    .plant-row {
      display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 12px; align-items: center;
      padding: 10px 12px; border: 1px solid var(--line); border-left: 4px solid var(--accent);
      border-radius: 8px; background: var(--card);
    }
    .plant-row[data-edibility="edible"] { --accent: var(--sage); }
    .plant-row[data-edibility="care"] { --accent: var(--amber); }
    .plant-row[data-edibility="no"] { --accent: var(--rust); }
    .plant-row h3 { margin: 0 0 2px; font-size: 18px; font-weight: 500; }
    .plant-row h3 a { color: inherit; text-decoration-color: rgba(125,47,20,.35); }
    .plant-row h3 a:hover { text-decoration-color: currentColor; }
    .plant-row p { margin: 0; color: var(--ink-soft); font-size: 14px; }
    .plant-row span {
      border-radius: 999px; color: white; background: var(--accent); padding: 4px 8px;
      font-family: var(--mono); font-size: 10px; letter-spacing: .05em; text-transform: uppercase;
    }
    .foot { margin-top: 28px; color: var(--ink-soft); font-size: 14px; line-height: 1.5; }
    @media (max-width: 640px) {
      .top { align-items: flex-start; flex-direction: column; }
      .app-actions { justify-content: flex-start; }
      .stats { grid-template-columns: 1fr; }
      .plant-row { grid-template-columns: 1fr; }
      .plant-row span { width: fit-content; }
    }
  </style>
</head>
<body>
  <main class="wrap">
    <nav class="top" aria-label="Species directory navigation">
      <a class="brand" href="../">Forage <b>Berkeley</b></a>
      <div class="app-actions">
        <a class="app-link" href="../#quiz">Start quiz</a>
        <a class="app-link" href="../#browse">Browse plants</a>
      </div>
    </nav>

    <header class="hero">
      <h1>Berkeley plant species directory</h1>
      <p class="lede">Browse the ${plants.length} local wild plants, common trees, garden escapes, and toxic look-alikes in Forage Berkeley. The app uses this catalog for its photo quiz and field-guide browse mode.</p>
      <p class="safety">This is a learning aid, not a safety guide. Never eat anything based on this directory or the app alone.</p>
    </header>

    <section class="stats" aria-label="Directory summary">
      <div class="stat"><b>${plants.length}</b> local species</div>
      <div class="stat"><b>${counts.edible || 0}</b> edible-use cards</div>
      <div class="stat"><b>${(counts.care || 0) + (counts.no || 0)}</b> caution or avoid cards</div>
    </section>

    <section class="directory-controls" aria-label="Search and filter species">
      <label class="directory-label" for="species-search">Find a plant</label>
      <input class="directory-search" id="species-search" type="search" placeholder="Search by common or scientific name" autocomplete="off" />
      <div class="filter-row" role="group" aria-label="Filter by safety label">
        <button class="filter-chip" type="button" data-filter="all" aria-pressed="true">All</button>
        <button class="filter-chip" type="button" data-filter="edible" aria-pressed="false">Edible</button>
        <button class="filter-chip" type="button" data-filter="care" aria-pressed="false">Use with care</button>
        <button class="filter-chip" type="button" data-filter="no" aria-pressed="false">Recognition only</button>
      </div>
      <p class="filter-status" id="species-status" aria-live="polite">Showing all ${plants.length} plants.</p>
      <p class="no-results" id="species-no-results" hidden>No plants match that search.</p>
    </section>

${["edible", "care", "no"].map(groupSection).join("\n\n")}

    <p class="foot">Want to practice from photos instead of reading the list? <a href="../#quiz">Start the Forage Berkeley quiz</a> or use the app's <a href="../#browse">Browse plants</a> tab.</p>
  </main>
  <script>
    (function () {
      var search = document.getElementById("species-search");
      var status = document.getElementById("species-status");
      var noResults = document.getElementById("species-no-results");
      var rows = Array.prototype.slice.call(document.querySelectorAll(".plant-row"));
      var groups = Array.prototype.slice.call(document.querySelectorAll(".species-group"));
      var chips = Array.prototype.slice.call(document.querySelectorAll(".filter-chip"));
      var activeFilter = "all";
      var labels = { all: "all labels", edible: "edible", care: "use with care", no: "recognition only" };

      function applyFilters() {
        var query = search.value.trim().toLowerCase();
        var visible = 0;
        rows.forEach(function (row) {
          var edibility = row.getAttribute("data-edibility");
          var matchesFilter = activeFilter === "all" || edibility === activeFilter;
          var matchesQuery = !query || row.getAttribute("data-search").toLowerCase().indexOf(query) !== -1;
          var show = matchesFilter && matchesQuery;
          row.hidden = !show;
          if (show) visible++;
        });
        groups.forEach(function (group) {
          var hasVisible = !!group.querySelector(".plant-row:not([hidden])");
          group.hidden = !hasVisible;
        });
        status.textContent = query || activeFilter !== "all"
          ? "Showing " + visible + " of " + rows.length + " plants for " + labels[activeFilter] + "."
          : "Showing all " + rows.length + " plants.";
        noResults.hidden = visible !== 0;
      }

      search.addEventListener("input", applyFilters);
      chips.forEach(function (chip) {
        chip.addEventListener("click", function () {
          activeFilter = chip.getAttribute("data-filter");
          chips.forEach(function (button) {
            button.setAttribute("aria-pressed", button === chip ? "true" : "false");
          });
          applyFilters();
        });
      });

      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.register("../sw.js").catch(function () {});
      }
    }());
  </script>
</body>
</html>
`;

function plantPage(plant) {
  const url = plantUrl(plant);
  const metaDescription = plantMetaDescription(plant);
  const safetyDescription = descriptions[plant.edibility] || "Use this page as a learning aid, not a safety authority.";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(plant.commonName)} | Forage Berkeley plant guide</title>
  <meta name="description" content="${esc(metaDescription)}" />
  <meta name="theme-color" content="#f7f3ec" />
  <link rel="icon" href="../../favicon.svg" type="image/svg+xml" />
  <link rel="apple-touch-icon" href="../../apple-touch-icon.png" />
  <link rel="canonical" href="${esc(url)}" />
  <meta property="og:type" content="article" />
  <meta property="og:url" content="${esc(url)}" />
  <meta property="og:title" content="${esc(plant.commonName)} | Forage Berkeley plant guide" />
  <meta property="og:description" content="${esc(metaDescription)}" />
  <meta property="og:image" content="${baseUrl}/og.png" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${esc(plant.commonName)} | Forage Berkeley" />
  <meta name="twitter:description" content="${esc(metaDescription)}" />
  <meta name="twitter:image" content="${baseUrl}/og.png" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,400&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": ${json(`${url}#webpage`)},
    "url": ${json(url)},
    "name": ${json(`${plant.commonName} | Forage Berkeley plant guide`)},
    "description": ${json(metaDescription)},
    "isPartOf": {
      "@id": "https://forage-berkeley.vercel.app/species/#webpage"
    },
    "about": {
      "@type": "Thing",
      "name": ${json(plant.commonName)},
      "alternateName": ${json(plant.scientificName)}
    },
    "publisher": {
      "@id": "https://forage-berkeley.vercel.app/#organization"
    }
  }
  </script>
  <style>
    :root {
      --paper: #f7f3ec; --card: #fffdf9; --ink: #2b2118; --ink-soft: #7b6c57;
      --rust: #a8421f; --rust-deep: #7d2f14; --sage: #5e6b43; --sage-deep:#46512f;
      --amber: #8f5a10; --line: #e6dccb; --serif: "Fraunces", Georgia, serif;
      --mono: "JetBrains Mono", ui-monospace, Menlo, monospace;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0; background: var(--paper); color: var(--ink); font-family: var(--serif);
      -webkit-font-smoothing: antialiased;
    }
    a { color: var(--rust-deep); text-decoration-thickness: 1px; text-underline-offset: 3px; }
    .wrap { width: min(900px, calc(100% - 32px)); margin: 0 auto; padding: 22px 0 42px; }
    .top { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 24px; }
    .brand { font-weight: 600; font-size: 18px; color: var(--ink); text-decoration: none; }
    .brand b { color: var(--sage-deep); }
    .app-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 14px; }
    .app-link, .back-link {
      font-family: var(--mono); font-size: 12px; letter-spacing: .05em; text-transform: uppercase;
    }
    .breadcrumbs { margin: 0 0 18px; color: var(--ink-soft); font-size: 14px; }
    .hero { display: grid; gap: 12px; margin-bottom: 24px; }
    h1 { margin: 0; max-width: 760px; font-size: clamp(34px, 6vw, 58px); line-height: 1; font-weight: 600; }
    .sci { margin: 0; color: var(--ink-soft); font-size: 20px; line-height: 1.3; }
    .badges { display: flex; flex-wrap: wrap; gap: 8px; }
    .badge {
      width: fit-content; border-radius: 999px; color: white; background: var(--accent); padding: 5px 9px;
      font-family: var(--mono); font-size: 11px; letter-spacing: .05em; text-transform: uppercase;
    }
    .badge.origin {
      color: var(--ink-soft); background: transparent; border: 1px solid var(--line);
    }
    .plant-page[data-edibility="edible"] { --accent: var(--sage); }
    .plant-page[data-edibility="care"] { --accent: var(--amber); }
    .plant-page[data-edibility="no"] { --accent: var(--rust); }
    .safety {
      margin: 0 0 22px; padding: 11px 12px; border: 1px solid rgba(168,66,31,.25);
      border-radius: 8px; color: var(--rust-deep); background: rgba(168,66,31,.06);
      font-size: 15px; line-height: 1.45;
    }
    .summary {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin: 0 0 22px;
    }
    .stat {
      border: 1px solid var(--line); border-radius: 8px; background: rgba(255,253,249,.72);
      padding: 10px; font-family: var(--mono); color: var(--ink-soft); font-size: 11px;
    }
    .stat b { display: block; color: var(--ink); font-size: 18px; font-weight: 500; line-height: 1.2; }
    .details { display: grid; gap: 10px; }
    .detail {
      display: grid; grid-template-columns: 140px minmax(0, 1fr); gap: 14px;
      padding: 13px 0; border-top: 1px solid var(--line);
    }
    .detail:last-child { border-bottom: 1px solid var(--line); }
    .detail b {
      color: var(--ink-soft); font-family: var(--mono); font-size: 11px; letter-spacing: .07em;
      text-transform: uppercase; font-weight: 500;
    }
    .detail p { margin: 0; font-size: 17px; line-height: 1.5; }
    .story { margin-top: 18px; color: var(--ink-soft); font-style: italic; font-size: 16px; line-height: 1.5; }
    .foot {
      display: flex; flex-wrap: wrap; gap: 14px 18px; margin-top: 28px; color: var(--ink-soft);
      font-size: 14px; line-height: 1.5;
    }
    .photos {
      margin: 0 0 22px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;
    }
    .photo-card {
      margin: 0; border: 1px solid var(--line); border-radius: 8px; background: var(--card);
      overflow: hidden;
    }
    .photo-card img {
      display: block; width: 100%; aspect-ratio: 4 / 3; object-fit: cover; background: #efe7d8;
    }
    .photo-card figcaption {
      padding: 7px 8px; color: var(--ink-soft); font-family: var(--mono); font-size: 10px;
      letter-spacing: .05em; text-transform: uppercase;
    }
    @media (max-width: 640px) {
      .top { align-items: flex-start; flex-direction: column; }
      .app-actions { justify-content: flex-start; }
      .summary { grid-template-columns: 1fr; }
      .photos { grid-template-columns: 1fr 1fr; }
      .detail { grid-template-columns: 1fr; gap: 4px; }
    }
  </style>
</head>
<body class="plant-page" data-edibility="${esc(plant.edibility)}">
  <main class="wrap">
    <nav class="top" aria-label="Plant page navigation">
      <a class="brand" href="../../">Forage <b>Berkeley</b></a>
      <div class="app-actions">
        <a class="app-link" href="../../#quiz">Start quiz</a>
        <a class="app-link" href="../../${esc(appPlantHash(plant))}">Open photo guide</a>
      </div>
    </nav>

    <p class="breadcrumbs"><a href="../">Species directory</a> / ${esc(plant.commonName)}</p>

    <header class="hero">
      <h1>${esc(plant.commonName)}</h1>
      <p class="sci"><i>${esc(plant.scientificName)}</i></p>
      <div class="badges">
        <span class="badge">${esc(labels[plant.edibility])}</span>
        <span class="badge origin">${esc(titleCase(plant.origin))}</span>
      </div>
    </header>

    <p class="safety">This page is a recognition practice aid, not an eating guide. Never eat anything based on this page or the app alone. ${esc(safetyDescription)}</p>

    ${photoGallery(plant)}

    <section class="summary" aria-label="Plant summary">
      <div class="stat"><b>${esc(titleCase(plant.category))}</b> plant type</div>
      <div class="stat"><b>${esc(labels[plant.edibility])}</b> safety label</div>
      <div class="stat"><b>${esc(titleCase(plant.origin))}</b> origin</div>
    </section>

    <section class="details" aria-label="${esc(plant.commonName)} details">
      <div class="detail">
        <b>Season</b>
        <p>${esc(plant.season)}</p>
      </div>
      <div class="detail">
        <b>How to ID</b>
        <p>${esc(plant.idFeatures)}</p>
      </div>
      <div class="detail">
        <b>Watch</b>
        <p>${esc(plant.warning)}</p>
      </div>
      <div class="detail">
        <b>Uses</b>
        <p>${esc(plant.uses)}</p>
      </div>
    </section>

    <p class="story">${esc(plant.story)}</p>

    <footer class="foot">
      <a class="back-link" href="../">All species</a>
      <a class="back-link" href="../../${esc(appPlantHash(plant))}">Open photo guide</a>
      <a class="back-link" href="../../#quiz">Practice this catalog</a>
      <a class="back-link" href="../../berkeley-plant-identification/">Plant identification guide</a>
      <a class="back-link" href="../../CREDITS.md">Photo credits</a>
    </footer>
  </main>
  <script>
    (function () {
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.register("../../sw.js").catch(function () {});
      }
    }());
  </script>
</body>
</html>
`;
}

function photoGallery(plant) {
  const photos = photoEntries(plant);
  if (!photos.length) {
    return "";
  }

  return `<section class="photos" aria-label="${esc(plant.commonName)} field photos">
${photos.map((photo, index) => `      <figure class="photo-card">
        <img src="${esc(photo.src)}" alt="${esc(photo.alt)}" loading="${index === 0 ? "eager" : "lazy"}" decoding="async" />
        <figcaption>${esc(photo.label || "photo")}</figcaption>
      </figure>`).join("\n")}
    </section>`;
}

function guideStyles() {
  return `    :root {
      --paper: #f7f3ec; --card: #fffdf9; --ink: #2b2118; --ink-soft: #7b6c57;
      --rust: #a8421f; --rust-deep: #7d2f14; --sage: #5e6b43; --sage-deep:#46512f;
      --amber: #8f5a10; --line: #e6dccb; --serif: "Fraunces", Georgia, serif;
      --mono: "JetBrains Mono", ui-monospace, Menlo, monospace;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0; background: var(--paper); color: var(--ink); font-family: var(--serif);
      -webkit-font-smoothing: antialiased;
    }
    a { color: var(--rust-deep); text-decoration-thickness: 1px; text-underline-offset: 3px; }
    .wrap { width: min(1040px, calc(100% - 32px)); margin: 0 auto; padding: 22px 0 42px; }
    .top { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 34px; }
    .brand { font-weight: 600; font-size: 18px; color: var(--ink); text-decoration: none; }
    .brand b { color: var(--sage-deep); }
    .navlinks { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 14px; font-family: var(--mono); font-size: 12px; letter-spacing: .05em; text-transform: uppercase; }
    .hero { display: grid; gap: 16px; margin-bottom: 28px; }
    .eyebrow { margin: 0; color: var(--sage-deep); font-family: var(--mono); font-size: 12px; letter-spacing: .1em; text-transform: uppercase; }
    h1 { margin: 0; max-width: 820px; font-size: clamp(38px, 7vw, 70px); line-height: .98; font-weight: 600; }
    h2 { margin: 0; font-size: clamp(26px, 4vw, 42px); line-height: 1.02; font-weight: 600; }
    h3 { margin: 0; font-size: 22px; line-height: 1.08; font-weight: 600; }
    p { margin: 0; }
    .lede { max-width: 760px; color: var(--ink-soft); font-size: 19px; line-height: 1.45; }
    .safety {
      max-width: 760px; padding: 11px 13px; border: 1px solid rgba(168,66,31,.25);
      border-radius: 8px; color: var(--rust-deep); background: rgba(168,66,31,.06);
      font-size: 15px; line-height: 1.45;
    }
    .actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 6px; }
    .button {
      display: inline-flex; align-items: center; justify-content: center; min-height: 42px; padding: 0 16px;
      border-radius: 999px; border: 1px solid var(--ink); background: var(--ink); color: var(--paper);
      font-family: var(--mono); font-size: 12px; letter-spacing: .06em; text-transform: uppercase; text-decoration: none;
    }
    .button.secondary { background: transparent; color: var(--ink); border-color: var(--line); }
    .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin: 8px 0 28px; }
    .stat {
      border: 1px solid var(--line); border-radius: 8px; background: rgba(255,253,249,.7);
      padding: 11px; font-family: var(--mono); color: var(--ink-soft); font-size: 11px;
    }
    .stat b { display: block; color: var(--ink); font-size: 22px; font-weight: 500; line-height: 1.1; }
    .section { padding: 26px 0; border-top: 1px solid var(--line); }
    .section-head { display: grid; gap: 8px; max-width: 760px; margin-bottom: 16px; }
    .section-head p { color: var(--ink-soft); font-size: 17px; line-height: 1.45; }
    .guide-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
    .guide-card {
      display: grid; grid-template-columns: 150px minmax(0, 1fr); min-height: 240px;
      border: 1px solid var(--line); border-left: 4px solid var(--accent);
      border-radius: 8px; background: var(--card); overflow: hidden;
    }
    .guide-card[data-edibility="edible"] { --accent: var(--sage); }
    .guide-card[data-edibility="care"] { --accent: var(--amber); }
    .guide-card[data-edibility="no"] { --accent: var(--rust); }
    .guide-card img, .guide-photo { width: 100%; height: 100%; min-height: 240px; object-fit: cover; background: #efe7d8; }
    .guide-photo { display: grid; place-items: center; padding: 14px; color: var(--ink-soft); font-family: var(--mono); font-size: 12px; text-align: center; }
    .guide-copy { display: grid; gap: 9px; padding: 14px; }
    .latin { margin: -5px 0 0; color: var(--ink-soft); font-style: italic; }
    .meta { color: var(--ink-soft); font-family: var(--mono); font-size: 10px; letter-spacing: .06em; text-transform: uppercase; }
    .guide-copy dl { display: grid; gap: 9px; margin: 0; }
    .guide-copy dt {
      color: var(--ink-soft); font-family: var(--mono); font-size: 10px; letter-spacing: .06em;
      text-transform: uppercase;
    }
    .guide-copy dd { margin: 1px 0 0; color: var(--ink); font-size: 15px; line-height: 1.42; }
    .guide-links { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 2px; font-family: var(--mono); font-size: 12px; }
    .compare-panel {
      border: 1px solid var(--line); border-radius: 8px; background: var(--card);
      padding: 16px; overflow-x: auto;
    }
    table { width: 100%; min-width: 720px; border-collapse: collapse; }
    th, td { border-bottom: 1px solid var(--line); padding: 12px; text-align: left; vertical-align: top; }
    tr:last-child th, tr:last-child td { border-bottom: 0; }
    th { width: 22%; color: var(--ink-soft); font-family: var(--mono); font-size: 10px; letter-spacing: .06em; text-transform: uppercase; }
    thead th { color: var(--ink); font-size: 12px; }
    .photo-pair { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin: 0 0 18px; }
    .photo-card {
      border: 1px solid var(--line); border-radius: 8px; background: var(--card); overflow: hidden;
    }
    .photo-card img, .photo-card .guide-photo { display: block; width: 100%; aspect-ratio: 4 / 3; min-height: 0; object-fit: cover; }
    .photo-card div { padding: 12px; }
    .note-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
    .note {
      display: grid; gap: 9px; border: 1px solid var(--line); border-radius: 8px;
      background: rgba(255,253,249,.72); padding: 15px;
    }
    .note p { color: var(--ink-soft); font-size: 16px; line-height: 1.45; }
    .foot { margin-top: 28px; color: var(--ink-soft); font-size: 14px; line-height: 1.5; }
    .foot a + a { margin-left: 10px; }
    @media (max-width: 780px) {
      .top { align-items: flex-start; flex-direction: column; margin-bottom: 28px; }
      .navlinks { justify-content: flex-start; }
      .stats, .guide-grid, .photo-pair, .note-grid { grid-template-columns: 1fr; }
      .guide-card { grid-template-columns: 1fr; }
      .guide-card img, .guide-photo { height: 260px; min-height: 0; }
      .button { width: 100%; }
    }`;
}

function guideHead(page, relativeRoot = "../") {
  const url = guideUrl(page);
  return `<meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(page.title)} | Forage Berkeley</title>
  <meta name="description" content="${esc(page.description)}" />
  <meta name="theme-color" content="#f7f3ec" />
  <link rel="icon" href="${relativeRoot}favicon.svg" type="image/svg+xml" />
  <link rel="apple-touch-icon" href="${relativeRoot}apple-touch-icon.png" />
  <link rel="canonical" href="${esc(url)}" />
  <meta property="og:type" content="article" />
  <meta property="og:url" content="${esc(url)}" />
  <meta property="og:title" content="${esc(page.title)} | Forage Berkeley" />
  <meta property="og:description" content="${esc(page.description)}" />
  <meta property="og:image" content="${baseUrl}/og.png" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${esc(page.title)} | Forage Berkeley" />
  <meta name="twitter:description" content="${esc(page.description)}" />
  <meta name="twitter:image" content="${baseUrl}/og.png" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,400&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />`;
}

function guideNav(label = "Guide page navigation") {
  return `<nav class="top" aria-label="${esc(label)}">
      <a class="brand" href="../">Forage <b>Berkeley</b></a>
      <div class="navlinks">
        <a href="../#quiz">Start quiz</a>
        <a href="../#browse">Browse plants</a>
        <a href="../species/">Species catalog</a>
      </div>
    </nav>`;
}

function guidePlantCard(plant, eager = false) {
  return `<article class="guide-card" id="${esc(plant.id)}" data-edibility="${esc(plant.edibility)}">
            ${guidePhoto(plant, eager)}
            <div class="guide-copy">
              <p class="meta">${esc(labels[plant.edibility])} / ${esc(titleCase(plant.origin))} / ${esc(titleCase(plant.category))}</p>
              <h3>${esc(plant.commonName)}</h3>
              <p class="latin">${esc(plant.scientificName)}</p>
              <dl>
                <div><dt>Season</dt><dd>${esc(plant.season)}</dd></div>
                <div><dt>How to recognize it</dt><dd>${esc(plant.idFeatures)}</dd></div>
                <div><dt>Deck warning</dt><dd>${esc(plant.warning)}</dd></div>
              </dl>
              <div class="guide-links">
                <a href="../species/${esc(plant.id)}/">Species page</a>
                <a href="../#plant/${esc(plant.id)}">Open photo guide</a>
              </div>
            </div>
          </article>`;
}

function poisonousSection(sectionId, title, intro, plantIds) {
  const cards = plantIds.map((id, index) => guidePlantCard(plantById(id), index === 0)).join("\n");
  return `<section class="section" id="${esc(sectionId)}" aria-labelledby="${esc(sectionId)}-title">
      <div class="section-head">
        <p class="eyebrow">${plantIds.length} deck entries</p>
        <h2 id="${esc(sectionId)}-title">${esc(title)}</h2>
        <p>${esc(intro)}</p>
      </div>
      <div class="guide-grid">
${cards}
      </div>
    </section>`;
}

function poisonousPlantsPage() {
  const page = guidePageById("poisonous-plants");
  const core = poisonousCoreIds.map(plantById);
  const caution = poisonousCautionIds.map(plantById);
  const itemList = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${guideUrl(page)}#webpage`,
    "url": guideUrl(page),
    "name": page.title,
    "description": page.description,
    "isPartOf": { "@id": `${baseUrl}/#website` },
    "about": {
      "@type": "ItemList",
      "name": "Forage Berkeley poisonous and caution plant practice list",
      "numberOfItems": core.length + caution.length,
      "itemListElement": [...core, ...caution].map((plant, index) => ({
        "@type": "ListItem",
        "position": index + 1,
        "name": plant.commonName,
        "url": plantUrl(plant)
      }))
    },
    "publisher": { "@id": `${baseUrl}/#organization` }
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
  ${guideHead(page)}
  <script type="application/ld+json">
  ${json(itemList)}
  </script>
  <style>
${guideStyles()}
  </style>
</head>
<body>
  <main class="wrap">
    ${guideNav("Poisonous plants guide navigation")}

    <header class="hero">
      <p class="eyebrow">Berkeley and East Bay safety practice</p>
      <h1>Poisonous plants and toxic look-alikes to recognize first</h1>
      <p class="lede">Use this guide to practice the Forage Berkeley entries that are marked recognition-only, plus a few caution plants whose deck warnings mention look-alikes, plant parts, or preparation risk.</p>
      <div class="actions" aria-label="Guide actions">
        <a class="button" href="../#quiz">Practice the quiz</a>
        <a class="button secondary" href="../species/">Browse all species</a>
      </div>
      <p class="safety">${esc(guideSafetyText)}</p>
    </header>

    <section class="stats" aria-label="Poisonous plants guide summary">
      <div class="stat"><b>${plants.length}</b> plants in the catalog</div>
      <div class="stat"><b>${core.length}</b> recognition-only entries</div>
      <div class="stat"><b>${caution.length}</b> caution and look-alike entries</div>
    </section>

    ${poisonousSection("recognition-only", "Recognition-only plants to learn first", "These are current deck entries marked Recognition only. Treat them as plants to know on sight, not plants to handle or test.", poisonousCoreIds)}

    ${poisonousSection("look-alike-caution", "Caution plants and look-alike traps", "These entries are not a green light to harvest. They are included because the deck warning calls out preparation, plant-part, or look-alike risk.", poisonousCautionIds)}

    <section class="section" aria-labelledby="practice-boundary-title">
      <div class="section-head">
        <p class="eyebrow">How to use this page</p>
        <h2 id="practice-boundary-title">Practice recognition, then stop there</h2>
        <p>Forage Berkeley helps you learn names, field marks, and photos. Real-world plant decisions need qualified local sources, multiple confirmations, and local rules that this app does not provide.</p>
      </div>
      <div class="actions">
        <a class="button" href="../poison-hemlock-identification/">Compare hemlock and fennel</a>
        <a class="button secondary" href="../berkeley-plant-identification/">Berkeley plant ID guide</a>
      </div>
    </section>

    <footer class="foot">
      <a href="../">Home</a>
      <a href="../species/">Species directory</a>
      <a href="../CREDITS.md">Photo credits</a>
    </footer>
  </main>
  <script>
    (function () {
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.register("../sw.js").catch(function () {});
      }
    }());
  </script>
</body>
</html>
`;
}

function comparisonRow(label, hemlock, fennel) {
  return `<tr>
              <th scope="row">${esc(label)}</th>
              <td>${esc(hemlock)}</td>
              <td>${esc(fennel)}</td>
            </tr>`;
}

function hemlockPhotoCard(plant, eager = false) {
  return `<article class="photo-card">
          ${guidePhoto(plant, eager)}
          <div>
            <p class="eyebrow">${esc(plant.season)}</p>
            <h3>${esc(plant.commonName)}</h3>
            <p class="latin">${esc(plant.scientificName)}</p>
          </div>
        </article>`;
}

function hemlockGuidePage() {
  const page = guidePageById("poison-hemlock-identification");
  const hemlock = plantById("poison-hemlock");
  const fennel = plantById("wild-fennel");
  const rows = [
    comparisonRow("Deck label", "Recognition only. Do not eat.", "Edible in the deck, but not eating permission."),
    comparisonRow("Stems", "Smooth hairless stems with purple or maroon blotches.", "Solid green stems."),
    comparisonRow("Leaves", "Fern-like leaves.", "Feathery thread-like leaves."),
    comparisonRow("Flowers", "White flower umbels.", "Yellow flower umbels."),
    comparisonRow("Scent note", "The deck notes a musty or mousy smell and no anise scent.", "The deck notes a strong anise or licorice smell when crushed. Do not handle plants to test this."),
    comparisonRow("Deck story", hemlock.story, fennel.story)
  ].join("\n");
  const learningResource = {
    "@context": "https://schema.org",
    "@type": "LearningResource",
    "@id": `${guideUrl(page)}#webpage`,
    "url": guideUrl(page),
    "name": page.title,
    "description": page.description,
    "isPartOf": { "@id": `${baseUrl}/#website` },
    "about": [
      { "@type": "Thing", "name": hemlock.commonName, "alternateName": hemlock.scientificName },
      { "@type": "Thing", "name": fennel.commonName, "alternateName": fennel.scientificName }
    ],
    "learningResourceType": "Plant identification practice",
    "educationalUse": "Self-guided plant learning",
    "publisher": { "@id": `${baseUrl}/#organization` }
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
  ${guideHead(page)}
  <script type="application/ld+json">
  ${json(learningResource)}
  </script>
  <style>
${guideStyles()}
  </style>
</head>
<body>
  <main class="wrap">
    ${guideNav("Poison hemlock guide navigation")}

    <header class="hero">
      <p class="eyebrow">Berkeley and East Bay plant identification</p>
      <h1>Poison hemlock identification, compared with wild fennel</h1>
      <p class="lede">Poison hemlock and wild fennel can be confusing because the current deck calls out that look-alike risk directly. This page turns those deck notes into recognition practice.</p>
      <div class="actions" aria-label="Hemlock guide actions">
        <a class="button" href="../species/poison-hemlock/">Open Poison Hemlock</a>
        <a class="button secondary" href="../species/wild-fennel/">Open Wild Fennel</a>
      </div>
      <p class="safety">${esc(guideSafetyText)}</p>
    </header>

    <section class="photo-pair" aria-label="Plant photos">
      ${hemlockPhotoCard(hemlock, true)}
      ${hemlockPhotoCard(fennel)}
    </section>

    <section class="section" aria-labelledby="compare-title">
      <div class="section-head">
        <p class="eyebrow">Deck-backed contrast</p>
        <h2 id="compare-title">What to compare in practice</h2>
        <p>The scent row is deck context, not a handling instruction. Learn the contrast here, then practice with the species pages and quiz photos.</p>
      </div>
      <div class="compare-panel">
        <table>
          <thead>
            <tr>
              <th scope="col">Field mark</th>
              <th scope="col">${esc(hemlock.commonName)}</th>
              <th scope="col">${esc(fennel.commonName)}</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    </section>

    <section class="section" aria-labelledby="deck-notes-title">
      <div class="section-head">
        <p class="eyebrow">Current catalog notes</p>
        <h2 id="deck-notes-title">Read the plant pages next</h2>
        <p>These summaries come from the same catalog fields as the app. They are not expert identification keys.</p>
      </div>
      <div class="note-grid">
        <article class="note">
          <p class="eyebrow">${esc(labels[hemlock.edibility])}</p>
          <h3>${esc(hemlock.commonName)}</h3>
          <p>${esc(hemlock.warning)}</p>
          <div class="guide-links">
            <a href="../species/poison-hemlock/">Species page</a>
            <a href="../#plant/poison-hemlock">Open photo guide</a>
          </div>
        </article>
        <article class="note">
          <p class="eyebrow">${esc(labels[fennel.edibility])}</p>
          <h3>${esc(fennel.commonName)}</h3>
          <p>${esc(fennel.warning)}</p>
          <div class="guide-links">
            <a href="../species/wild-fennel/">Species page</a>
            <a href="../#plant/wild-fennel">Open photo guide</a>
          </div>
        </article>
      </div>
    </section>

    <section class="section" aria-labelledby="practice-title">
      <div class="section-head">
        <p class="eyebrow">Practice path</p>
        <h2 id="practice-title">Use the app without turning it into advice</h2>
        <p>Review the plant pages, then practice from photos. Stop before any real-world eating, handling, removal, or preparation decision.</p>
      </div>
      <div class="actions">
        <a class="button" href="../#quiz">Start quiz</a>
        <a class="button secondary" href="../poisonous-plants/">Poisonous plants guide</a>
      </div>
    </section>

    <footer class="foot">
      <a href="../">Home</a>
      <a href="../species/">Species directory</a>
      <a href="../CREDITS.md">Photo credits</a>
    </footer>
  </main>
  <script>
    (function () {
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.register("../sw.js").catch(function () {});
      }
    }());
  </script>
</body>
</html>
`;
}

function sitemapXml() {
  const urls = [
    `${baseUrl}/`,
    `${baseUrl}/berkeley-plant-identification/`,
    `${baseUrl}/species/`,
    ...guidePages.map(guideUrl),
    ...plants.map(plantUrl)
  ];

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((url) => `  <url>
    <loc>${esc(url)}</loc>
    <lastmod>${lastmod}</lastmod>
  </url>`).join("\n")}
</urlset>
`;
}

const speciesDir = new URL("../species/", import.meta.url);
await mkdir(speciesDir, { recursive: true });
await writeFile(new URL("index.html", speciesDir), html);

await mkdir(new URL("../poisonous-plants/", import.meta.url), { recursive: true });
await writeFile(new URL("../poisonous-plants/index.html", import.meta.url), poisonousPlantsPage());

await mkdir(new URL("../poison-hemlock-identification/", import.meta.url), { recursive: true });
await writeFile(new URL("../poison-hemlock-identification/index.html", import.meta.url), hemlockGuidePage());

for (const plant of plants) {
  const plantDir = new URL(`${plant.id}/`, speciesDir);
  await mkdir(plantDir, { recursive: true });
  await writeFile(new URL("index.html", plantDir), plantPage(plant));
}

await writeFile(new URL("../sitemap.xml", import.meta.url), sitemapXml());
