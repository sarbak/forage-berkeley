/* Forage Berkeley — single-card swipe deck. Vanilla JS, no deps.
   Swipe right = next, swipe left = previous, tap = flip. Tap a thumbnail to enlarge it. */
(function () {
  "use strict";

  var EDIB = { edible: "Edible", care: "Eat with care", no: "Don't eat" };
  var ORIG = { native: "Native", introduced: "Introduced" };

  var stage = document.getElementById("stage");
  var pnum = document.getElementById("pnum");
  var pbar = document.getElementById("pbar");
  var chips = [].slice.call(document.querySelectorAll(".chip"));

  var plants = [];      // joined plant + photos
  var view = [];        // current filtered list
  var idx = 0;          // index into view
  var hero = 0;         // active photo within current card
  var filter = "all";
  var card = null;      // the single live card element

  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function photosFor(p) {
    // p.photos = [{slot,label}]; build src paths. Fallback to legacy 3 slots.
    if (p.photos && p.photos.length) {
      return p.photos.map(function (ph) {
        return { src: "img/" + p.id + "/" + ph.slot + ".jpg", label: ph.label || "" };
      });
    }
    return ["whole", "leaf", "detail"].map(function (s) {
      return { src: "img/" + p.id + "/" + s + ".jpg", label: s };
    });
  }

  function imgTag(src, alt, cls) {
    return '<img src="' + src + '" alt="' + esc(alt) + '" class="' + (cls || "") +
      '" onload="this.classList.add(\'ok\')" onerror="this.remove()" />';
  }

  function cardInner(p) {
    var ph = photosFor(p);
    if (hero >= ph.length) hero = 0;
    var active = ph[hero] || ph[0] || { src: "", label: "" };

    var thumbs = ph.map(function (x, i) {
      return '<button type="button" class="thumb" data-i="' + i +
        '" aria-label="Show photo ' + (i + 1) + '"' +
        (i === hero ? ' aria-current="true"' : "") + ">" +
        imgTag(x.src, p.commonName + " thumbnail") +
        '<span class="ph" aria-hidden="true"></span></button>';
    }).join("");

    var front =
      '<div class="face front">' +
        '<div class="front-top"><span>What is this?</span>' +
          '<span class="hint">tap to reveal &rsaquo;</span></div>' +
        '<div class="hero">' + imgTag(active.src, p.commonName + " " + active.label) +
          '<span class="ph" aria-hidden="true">' + esc(active.label || "photo") + "</span>" +
          (active.label ? '<span class="slotcap">' + esc(active.label) + "</span>" : "") +
        "</div>" +
        '<div class="thumbs">' + thumbs + "</div>" +
      "</div>";

    var back =
      '<div class="face back">' +
        '<div class="badges">' +
          '<span class="badge edibility">' + esc(EDIB[p.edibility] || p.edibility) + "</span>" +
          '<span class="badge origin">' + esc(ORIG[p.origin] || p.origin) + "</span>" +
          '<span class="badge">' + esc(p.category) + "</span>" +
        "</div>" +
        "<h2>" + esc(p.commonName) + "</h2>" +
        '<p class="sci">' + esc(p.scientificName) + "</p>" +
        '<p class="row"><span class="lab">Season</span>' + esc(p.season) + "</p>" +
        '<p class="row"><span class="lab">How to ID</span>' + esc(p.idFeatures) + "</p>" +
        '<p class="row watch"><span class="lab">Watch</span>' + esc(p.warning) + "</p>" +
        '<p class="row"><span class="lab">Uses</span>' + esc(p.uses) + "</p>" +
        '<p class="story">' + esc(p.story) + "</p>" +
        '<p class="flip-hint">&lsaquo; tap to flip back</p>' +
      "</div>";

    return front + back;
  }

  function render() {
    if (!view.length) {
      stage.innerHTML = '<div class="empty">No plants in this filter.</div>';
      card = null;
      pnum.textContent = "0 / 0";
      pbar.style.width = "0%";
      return;
    }
    if (idx < 0) idx = view.length - 1;
    if (idx >= view.length) idx = 0;
    var p = view[idx];

    if (!card) {
      stage.innerHTML = '<article class="card" tabindex="0" role="group"></article>';
      card = stage.querySelector(".card");
    }
    card.dataset.edibility = p.edibility;
    card.classList.remove("flipped");
    card.innerHTML = cardInner(p);

    pnum.textContent = (idx + 1) + " / " + view.length;
    pbar.style.width = ((idx + 1) / view.length * 100) + "%";
  }

  function setHero(i) {
    hero = i;
    if (card) {
      var p = view[idx];
      var wasFlipped = card.classList.contains("flipped");
      card.innerHTML = cardInner(p);
      if (wasFlipped) card.classList.add("flipped");
    }
  }

  function flip() {
    if (card) card.classList.toggle("flipped");
  }

  function go(dir) {
    if (!card || view.length < 2) { snapBack(); return; }
    card.classList.add("anim");
    card.style.transform = "translateX(" + (dir > 0 ? 120 : -120) + "%) rotate(" + (dir > 0 ? 8 : -8) + "deg)";
    card.style.opacity = "0";
    var done = function () {
      card.removeEventListener("transitionend", done);
      idx += dir;
      hero = 0;
      card.classList.remove("anim");
      render();
      // place incoming from opposite side, then animate to center
      card.style.transform = "translateX(" + (dir > 0 ? -120 : 120) + "%)";
      card.style.opacity = "0";
      // force reflow
      void card.offsetWidth;
      card.classList.add("anim");
      card.style.transform = "translateX(0)";
      card.style.opacity = "1";
      setTimeout(function () { if (card) { card.classList.remove("anim"); card.style.transform = ""; } }, 340);
    };
    card.addEventListener("transitionend", done);
  }

  function snapBack() {
    if (!card) return;
    card.classList.add("anim");
    card.style.transform = "";
    card.style.opacity = "1";
    setTimeout(function () { if (card) card.classList.remove("anim"); }, 340);
  }

  // ---- Pointer drag / tap handling ----
  var down = null;
  stage.addEventListener("pointerdown", function (e) {
    if (!card || e.button === 1 || e.button === 2) return;
    down = { x: e.clientX, y: e.clientY, t: Date.now(), drag: false, thumb: e.target.closest(".thumb") };
  });
  stage.addEventListener("pointermove", function (e) {
    if (!down || !card) return;
    var dx = e.clientX - down.x, dy = e.clientY - down.y;
    if (!down.drag && Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) down.drag = true;
    if (down.drag) {
      e.preventDefault();
      card.style.transform = "translateX(" + dx + "px) rotate(" + (dx * 0.03) + "deg)";
      card.style.opacity = String(Math.max(0.55, 1 - Math.abs(dx) / 600));
    }
  }, { passive: false });
  function endDrag(e) {
    if (!down || !card) return;
    var dx = e.clientX - down.x, dy = e.clientY - down.y;
    var dist = Math.abs(dx), small = dist < 8 && Math.abs(dy) < 8;
    var d = down; down = null;
    if (small) {
      if (d.thumb) setHero(+d.thumb.getAttribute("data-i"));
      else flip();
      return;
    }
    if (d.drag && dist > 70) go(dx > 0 ? 1 : -1);   // swipe right => next
    else snapBack();
  }
  stage.addEventListener("pointerup", endDrag);
  stage.addEventListener("pointercancel", function () { if (down) { down = null; snapBack(); } });

  // ---- Buttons ----
  document.getElementById("prev").addEventListener("click", function () { go(-1); });
  document.getElementById("next").addEventListener("click", function () { go(1); });
  document.getElementById("flip").addEventListener("click", flip);
  document.getElementById("shuffle").addEventListener("click", shuffle);
  document.getElementById("info").addEventListener("click", showInfo);

  function shuffle() {
    for (var i = view.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = view[i]; view[i] = view[j]; view[j] = t;
    }
    idx = 0; hero = 0; render();
  }

  // ---- Keyboard ----
  document.addEventListener("keydown", function (e) {
    if (e.key === "ArrowRight") { e.preventDefault(); go(1); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); go(-1); }
    else if (e.key === " " || e.key === "Enter") { e.preventDefault(); flip(); }
    else if (e.key.toLowerCase() === "s") shuffle();
  });

  // ---- Filters ----
  chips.forEach(function (chip) {
    chip.addEventListener("click", function () {
      filter = chip.getAttribute("data-filter");
      chips.forEach(function (c) { c.setAttribute("aria-pressed", c === chip ? "true" : "false"); });
      applyFilter();
    });
  });
  function applyFilter() {
    view = filter === "all" ? plants.slice()
      : plants.filter(function (p) { return p.edibility === filter; });
    idx = 0; hero = 0; render();
  }

  // ---- Info overlay (no native dialog) ----
  function showInfo() {
    var o = document.createElement("div");
    o.style.cssText = "position:fixed;inset:0;background:rgba(43,33,24,.55);display:flex;" +
      "align-items:center;justify-content:center;padding:24px;z-index:50;";
    o.innerHTML = '<div style="background:var(--card);max-width:380px;border-radius:18px;' +
      'padding:22px;box-shadow:0 20px 50px rgba(0,0,0,.3);font-size:14px;line-height:1.5">' +
      '<strong>A learning aid, not a safety guide.</strong><br><br>' +
      'Never eat anything identified from this app alone. Cross-check several sources and ' +
      'ideally a knowledgeable person before tasting any wild plant. The toxic cards are here ' +
      'so you learn what to avoid.<br><br>' +
      'Plant photos from <a href="https://commons.wikimedia.org" style="color:var(--rust-deep)">Wikimedia Commons</a> ' +
      'and <a href="https://www.inaturalist.org" style="color:var(--rust-deep)">iNaturalist</a> ' +
      '(open licenses) — see <a href="CREDITS.md" style="color:var(--rust-deep)">CREDITS</a>.<br><br>' +
      '<button type="button" style="font-family:var(--mono);font-size:12px;padding:8px 16px;' +
      'border-radius:999px;border:1px solid var(--line);background:var(--ink);color:var(--paper);' +
      'cursor:pointer">Got it</button></div>';
    o.addEventListener("click", function () { document.body.removeChild(o); });
    document.body.appendChild(o);
  }

  // ---- Load ----
  Promise.all([
    fetch("data/berkeley.json").then(function (r) { if (!r.ok) throw new Error("data " + r.status); return r.json(); }),
    fetch("photo_meta.json").then(function (r) { return r.ok ? r.json() : {}; }).catch(function () { return {}; })
  ]).then(function (res) {
    var data = res[0], meta = res[1] || {};
    plants = data.map(function (p) {
      var m = meta[p.id] || [];
      return Object.assign({}, p, {
        photos: m.map(function (x) { return { slot: x.slot, label: x.label }; })
      });
    });
    applyFilter();
  }).catch(function (err) {
    stage.innerHTML = '<div class="empty">Could not load the deck (' + esc(err.message) +
      ').<br>Serve over http, e.g. <code>python3 -m http.server</code>.</div>';
  });
})();
