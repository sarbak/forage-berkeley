import { mkdir, readFile, writeFile } from "node:fs/promises";

const plants = JSON.parse(await readFile(new URL("../data/berkeley.json", import.meta.url), "utf8"));

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

function plantRow(plant) {
  return `          <li class="plant-row" data-edibility="${esc(plant.edibility)}" data-search="${esc(`${plant.commonName} ${plant.scientificName}`)}">
            <div>
              <h3>${esc(plant.commonName)}</h3>
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

await mkdir(new URL("../species", import.meta.url), { recursive: true });
await writeFile(new URL("../species/index.html", import.meta.url), html);
