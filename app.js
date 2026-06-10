/* Forage Berkeley — spaced-repetition plant quiz. Vanilla JS, no deps.
   Guess the plant from 2 photos among 4 names. Right/wrong drives a Leitner schedule
   saved on-device. Browse tab = full field guide. */
(function () {
  "use strict";

  var EDIB = { edible: "Edible", care: "Eat with care", no: "Don't eat" };
  var ORIG = { native: "Native", introduced: "Introduced" };

  // Leitner box -> interval before a card is due again (ms). Box 0 = new/unseen.
  var MIN = 60e3, HOUR = 60 * MIN, DAY = 24 * HOUR;
  var INTERVALS = [0, 8 * HOUR, DAY, 3 * DAY, 8 * DAY, 21 * DAY, 60 * DAY];
  var MAX_BOX = INTERVALS.length - 1;
  var SRS_KEY = "fb-srs-v1";

  var $ = function (id) { return document.getElementById(id); };
  var plants = [], byId = {};
  var srs = loadSRS();
  var streak = 0, lastId = null;
  var current = null;        // current quiz question {plant, slots, options, answered}

  function loadSRS() { try { return JSON.parse(localStorage.getItem(SRS_KEY)) || {}; } catch (e) { return {}; } }
  function saveSRS() { try { localStorage.setItem(SRS_KEY, JSON.stringify(srs)); } catch (e) {} }
  function now() { return Date.now(); }

  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function srcFor(p, slot) { return "img/" + p.id + "/" + slot + ".jpg"; }
  function imgTag(src, alt) { return '<img src="' + src + '" alt="' + esc(alt) + '" onload="this.classList.add(\'ok\')" onerror="this.remove()" />'; }

  // ---------- spaced repetition ----------
  function st(id) { return srs[id] || (srs[id] = { box: 0, due: 0, seen: 0, correct: 0, wrong: 0 }); }
  function grade(id, ok) {
    var s = st(id); s.seen++;
    if (ok) { s.correct++; s.box = Math.min(s.box + 1, MAX_BOX); s.due = now() + INTERVALS[s.box]; }
    else { s.wrong++; s.box = 1; s.due = now() + 5 * MIN; }
    saveSRS();
  }
  function stats() {
    var due = 0, seen = 0, mastered = 0, t = now();
    plants.forEach(function (p) {
      var s = srs[p.id]; if (!s || !s.seen) return;
      seen++; if (s.box >= 5) mastered++; if (s.due <= t) due++;
    });
    return { due: due, seen: seen, mastered: mastered, fresh: plants.length - seen };
  }

  function pickNext() {
    var t = now();
    var dueCards = plants.filter(function (p) { var s = srs[p.id]; return s && s.seen && s.due <= t; });
    dueCards.sort(function (a, b) { return srs[a.id].due - srs[b.id].due; });
    var fresh = plants.filter(function (p) { var s = srs[p.id]; return !s || !s.seen; });
    var pool;
    if (dueCards.length) pool = dueCards;
    else if (fresh.length) pool = shuffle(fresh);
    else pool = shuffle(plants);            // all caught up -> free practice
    var p = pool[0];
    if (p && p.id === lastId && pool.length > 1) p = pool[1];
    return p;
  }

  // ---------- build a question ----------
  function buildQuestion(p) {
    var ph = (p.photos && p.photos.length) ? p.photos : [{ slot: "leaf", label: "leaves" }];
    var twoSlots = shuffle(ph).slice(0, 2).map(function (x) { return x.slot; });
    if (twoSlots.length === 1) twoSlots.push(twoSlots[0]);

    var others = plants.filter(function (q) { return q.id !== p.id; });
    var sameCat = shuffle(others.filter(function (q) { return q.category === p.category; }));
    var rest = shuffle(others.filter(function (q) { return q.category !== p.category; }));
    var distract = (sameCat.concat(rest)).slice(0, 3);
    var options = shuffle([p].concat(distract));
    return { plant: p, slots: twoSlots, options: options, answered: false };
  }

  function renderStats() {
    var s = stats();
    $("stats").innerHTML = "<b>" + s.mastered + "</b> mastered · <b>" + s.seen + "</b> seen";
    $("qcount").textContent = s.due ? (s.due + " due to review") : (s.fresh ? (s.fresh + " new to learn") : "free practice");
    $("qstreak").textContent = streak > 1 ? ("🔥 " + streak) : "";
    $("qbarfill").style.width = (s.mastered / Math.max(1, plants.length) * 100) + "%";
  }

  // ---------- quiz render ----------
  function renderQuiz() {
    var p = pickNext();
    if (!p) { $("quiz").innerHTML = '<div class="done"><h2>No plants loaded.</h2></div>'; return; }
    current = buildQuestion(p);
    lastId = p.id;
    renderStats();

    var photos = current.slots.map(function (slot) {
      return '<div class="shot">' + imgTag(srcFor(p, slot), p.commonName) +
        '<span class="ph" aria-hidden="true">photo</span></div>';
    }).join("");

    var opts = current.options.map(function (o) {
      return '<button type="button" class="opt" data-id="' + esc(o.id) + '">' +
        '<span>' + esc(o.commonName) + '</span><span class="mark"></span></button>';
    }).join("");

    $("quiz").innerHTML =
      '<div class="photos">' + photos + "</div>" +
      '<p class="qprompt">Which plant is this?</p>' +
      '<div class="options">' + opts + "</div>" +
      '<div class="reveal hidden" id="reveal"></div>';

    [].forEach.call(document.querySelectorAll(".opt"), function (b) {
      b.addEventListener("click", function () { answer(b.getAttribute("data-id"), b); });
    });
  }

  function answer(chosenId, btn) {
    if (current.answered) return;
    current.answered = true;
    var p = current.plant, ok = chosenId === p.id;
    grade(p.id, ok);
    streak = ok ? streak + 1 : 0;

    [].forEach.call(document.querySelectorAll(".opt"), function (b) {
      b.disabled = true;
      var id = b.getAttribute("data-id");
      if (id === p.id) { b.classList.add("correct"); b.querySelector(".mark").textContent = "✓"; }
      else if (b === btn) { b.classList.add("wrong"); b.querySelector(".mark").textContent = "✗"; }
      else b.classList.add("dim");
    });

    var watch = (p.edibility === "no" || p.edibility === "care")
      ? '<div class="rwatch"><b>Watch:</b> ' + esc(p.warning) + "</div>" : "";
    var r = $("reveal");
    r.className = "reveal";
    r.innerHTML =
      '<div class="rname">' + (ok ? "✓ " : "") + esc(p.commonName) + "</div>" +
      '<div class="rsci">' + esc(p.scientificName) + " · " + esc(EDIB[p.edibility]) + "</div>" +
      watch +
      '<span class="rmore" id="rmore">See full details &amp; photos ›</span>' +
      '<button type="button" class="next-btn" id="nextbtn">Next plant ›</button>';
    $("nextbtn").addEventListener("click", renderQuiz);
    $("rmore").addEventListener("click", function () { openDetail(p); });
    renderStats();
  }

  // ---------- swipe = advance ----------
  (function () {
    var quiz = $("quiz"), down = null;
    quiz.addEventListener("pointerdown", function (e) { down = { x: e.clientX, y: e.clientY }; });
    quiz.addEventListener("pointerup", function (e) {
      if (!down) return; var dx = e.clientX - down.x, dy = e.clientY - down.y; down = null;
      if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy)) renderQuiz();
    });
    quiz.addEventListener("pointercancel", function () { down = null; });
  })();

  // ---------- browse ----------
  var bfilter = "all", bquery = "";
  function renderList() {
    var q = bquery.trim().toLowerCase();
    var rows = plants.filter(function (p) {
      if (bfilter !== "all" && p.edibility !== bfilter) return false;
      if (q && (p.commonName + " " + p.scientificName).toLowerCase().indexOf(q) < 0) return false;
      return true;
    }).map(function (p) {
      var thumb = (p.photos && p.photos[0]) ? srcFor(p, p.photos[0].slot) : "";
      return '<button type="button" class="lrow" data-id="' + esc(p.id) + '" data-edibility="' + esc(p.edibility) + '">' +
        imgTag(thumb, p.commonName) +
        '<div><div class="lname">' + esc(p.commonName) + "</div>" +
        '<div class="lsci">' + esc(p.scientificName) + "</div></div>" +
        '<span class="ledib">' + esc(EDIB[p.edibility]) + "</span></button>";
    }).join("");
    $("list").innerHTML = rows || '<div style="color:var(--ink-soft);font-style:italic;padding:24px;text-align:center">No matches.</div>';
    [].forEach.call(document.querySelectorAll(".lrow"), function (b) {
      b.addEventListener("click", function () { openDetail(byId[b.getAttribute("data-id")]); });
    });
  }

  // ---------- detail modal ----------
  function openDetail(p) {
    var ph = (p.photos && p.photos.length) ? p.photos : [{ slot: "leaf", label: "" }];
    var heroI = 0;
    function draw() {
      var active = ph[heroI];
      var thumbs = ph.map(function (x, i) {
        return '<button type="button" data-i="' + i + '"' + (i === heroI ? ' aria-current="true"' : "") + ">" + imgTag(srcFor(p, x.slot), p.commonName) + "</button>";
      }).join("");
      $("sheet").innerHTML =
        '<div class="grab"></div>' +
        '<div class="ghero">' + imgTag(srcFor(p, active.slot), p.commonName) +
          (active.label ? '<span class="gcap">' + esc(active.label) + "</span>" : "") + "</div>" +
        '<div class="gthumbs">' + thumbs + "</div>" +
        '<h2>' + esc(p.commonName) + "</h2>" +
        '<p class="dsci">' + esc(p.scientificName) + "</p>" +
        '<div class="dbadges"><span class="rb ' + esc(p.edibility) + '">' + esc(EDIB[p.edibility]) + "</span>" +
          '<span class="rb origin">' + esc(ORIG[p.origin] || p.origin) + "</span>" +
          '<span class="rb origin">' + esc(p.category) + "</span></div>" +
        '<p class="drow"><span class="dl">Season</span>' + esc(p.season) + "</p>" +
        '<p class="drow"><span class="dl">How to ID</span>' + esc(p.idFeatures) + "</p>" +
        '<p class="drow watch"><span class="dl">Watch</span>' + esc(p.warning) + "</p>" +
        '<p class="drow"><span class="dl">Uses</span>' + esc(p.uses) + "</p>" +
        '<p class="dstory">' + esc(p.story) + "</p>" +
        '<button type="button" class="closebtn" id="closebtn">Close</button>';
      [].forEach.call($("sheet").querySelectorAll(".gthumbs button"), function (b) {
        b.addEventListener("click", function () { heroI = +b.getAttribute("data-i"); draw(); });
      });
      $("closebtn").addEventListener("click", closeDetail);
    }
    draw();
    $("modal").classList.add("open");
  }
  function closeDetail() { $("modal").classList.remove("open"); }
  $("modal").addEventListener("click", function (e) { if (e.target === $("modal")) closeDetail(); });

  // ---------- tabs ----------
  function showTab(which) {
    var learn = which === "learn";
    $("tab-learn").setAttribute("aria-selected", learn ? "true" : "false");
    $("tab-browse").setAttribute("aria-selected", learn ? "false" : "true");
    $("learn").classList.toggle("active", learn);
    $("browse").classList.toggle("active", !learn);
    if (!learn) renderList();
  }
  $("tab-learn").addEventListener("click", function () { showTab("learn"); });
  $("tab-browse").addEventListener("click", function () { showTab("browse"); });
  $("search").addEventListener("input", function (e) { bquery = e.target.value; renderList(); });
  [].forEach.call(document.querySelectorAll(".bchip"), function (c) {
    c.addEventListener("click", function () {
      bfilter = c.getAttribute("data-bf");
      [].forEach.call(document.querySelectorAll(".bchip"), function (x) { x.setAttribute("aria-pressed", x === c ? "true" : "false"); });
      renderList();
    });
  });

  document.addEventListener("keydown", function (e) {
    if ($("modal").classList.contains("open")) { if (e.key === "Escape") closeDetail(); return; }
    if (!$("learn").classList.contains("active") || !current) return;
    if (!current.answered && e.key >= "1" && e.key <= "4") {
      var b = document.querySelectorAll(".opt")[+e.key - 1]; if (b) b.click();
    } else if (current.answered && (e.key === "Enter" || e.key === " " || e.key === "ArrowRight")) {
      e.preventDefault(); renderQuiz();
    }
  });

  // ---------- load ----------
  Promise.all([
    fetch("data/berkeley.json").then(function (r) { if (!r.ok) throw new Error("data " + r.status); return r.json(); }),
    fetch("photo_meta.json").then(function (r) { return r.ok ? r.json() : {}; }).catch(function () { return {}; })
  ]).then(function (res) {
    var data = res[0], meta = res[1] || {};
    plants = data.map(function (p) {
      var m = meta[p.id] || [];
      return Object.assign({}, p, { photos: m.map(function (x) { return { slot: x.slot, label: x.label }; }) });
    });
    plants.forEach(function (p) { byId[p.id] = p; });
    renderQuiz();
  }).catch(function (err) {
    $("quiz").innerHTML = '<div class="done"><h2>Could not load.</h2><p>' + esc(err.message) +
      '<br>Serve over http, e.g. <code>python3 -m http.server</code>.</p></div>';
  });
})();
