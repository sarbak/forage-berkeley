/* Forage Berkeley — spaced-repetition plant quiz. Vanilla JS, no deps.
   Guess the plant from 2 photos among 4 names. Right/wrong drives a Leitner schedule
   saved on-device. Browse tab = full field guide. */
(function () {
  "use strict";

  var EDIB = { edible: "Edible", care: "Eat with care", no: "Don't eat" };
  var ORIG = { native: "Native", introduced: "Introduced" };
  // edibility-at-a-glance icon: safe to eat / caution (some parts or prep risky) / poisonous
  var EDIB_ICON = { edible: "✅", care: "⚠️", no: "☠️" };
  var EDIB_TITLE = { edible: "Edible — safe to eat", care: "Caution — some parts toxic or needs preparation", no: "Poisonous — do not eat" };
  function ediIcon(e) { return '<span class="edi" title="' + esc(EDIB_TITLE[e] || "") + '" aria-label="' + esc(EDIB_TITLE[e] || "") + '">' + (EDIB_ICON[e] || "") + "</span>"; }

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
  function labelFor(p, slot) {
    var m = (p.photos || []).filter(function (x) { return x.slot === slot; })[0];
    return (m && m.label) || "photo";
  }
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
      var label = labelFor(p, slot);
      return '<div class="shot" data-src="' + esc(srcFor(p, slot)) + '" data-label="' + esc(label) +
        '" data-alt="' + esc(p.commonName) + '">' + imgTag(srcFor(p, slot), p.commonName) +
        '<span class="ph" aria-hidden="true">photo</span></div>';
    }).join("");

    var opts = current.options.map(function (o) {
      return '<button type="button" class="opt" data-id="' + esc(o.id) + '">' +
        ediIcon(o.edibility) + '<span>' + esc(o.commonName) + '</span><span class="mark"></span></button>';
    }).join("");

    $("quiz").innerHTML =
      '<div class="photos">' + photos + "</div>" +
      '<p class="qprompt">Which plant is this?</p>' +
      '<div class="options">' + opts + "</div>" +
      '<div class="reveal hidden" id="reveal"></div>';

    [].forEach.call(document.querySelectorAll(".opt"), function (b) {
      b.addEventListener("click", function () { answer(b.getAttribute("data-id"), b); });
    });
    [].forEach.call(document.querySelectorAll(".shot"), function (s) {
      s.addEventListener("click", function (e) {
        e.stopPropagation();
        openLightbox(s.getAttribute("data-src"), s.getAttribute("data-label"), s.getAttribute("data-alt"));
      });
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
      '<div class="rname">' + (ok ? "✓ " : "") + ediIcon(p.edibility) + esc(p.commonName) + "</div>" +
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
        '<div><div class="lname">' + ediIcon(p.edibility) + esc(p.commonName) + "</div>" +
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
        '<div class="ghero" id="ghero">' + imgTag(srcFor(p, active.slot), p.commonName) +
          (active.label ? '<span class="gcap">' + esc(active.label) + "</span>" : "") + "</div>" +
        '<div class="gthumbs">' + thumbs + "</div>" +
        '<h2>' + ediIcon(p.edibility) + esc(p.commonName) + "</h2>" +
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
      $("ghero").addEventListener("click", function () {
        openLightbox(srcFor(p, active.slot), active.label || "photo", p.commonName);
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

  // ---------- fullscreen photo lightbox (pinch / double-tap / wheel zoom + pan) ----------
  (function () {
    var box = $("lightbox"), stage = $("lbstage"), img = $("lbimg"),
        cap = $("lbcap"), hint = $("lbhint"), closeBtn = $("lbclose");
    var scale = 1, tx = 0, ty = 0;
    var pointers = {}, startDist = 0, startScale = 1, startMid = null, imgAtMid = null, panStart = null;
    var lastTap = 0;

    function apply() { img.style.transform = "translate(" + tx + "px," + ty + "px) scale(" + scale + ")"; }
    function clampPan() {
      var w = stage.clientWidth, h = stage.clientHeight;
      var minX = w * (1 - scale), minY = h * (1 - scale);
      tx = Math.min(0, Math.max(minX, tx));
      ty = Math.min(0, Math.max(minY, ty));
    }
    function reset() { scale = 1; tx = 0; ty = 0; apply(); }

    window.openLightbox = function (src, label, alt) {
      img.src = src; img.alt = alt || "";
      cap.textContent = label && label !== "photo" ? label : "";
      reset();
      box.classList.add("open"); box.setAttribute("aria-hidden", "false");
      hint.classList.remove("gone");
      setTimeout(function () { hint.classList.add("gone"); }, 1800);
    };
    function close() { box.classList.remove("open"); box.setAttribute("aria-hidden", "true"); img.src = ""; }
    closeBtn.addEventListener("click", close);

    function ptlist() { return Object.keys(pointers).map(function (k) { return pointers[k]; }); }
    function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
    function mid(a, b) { return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; }
    function rel(e) { var r = stage.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }

    stage.addEventListener("pointerdown", function (e) {
      stage.setPointerCapture(e.pointerId);
      pointers[e.pointerId] = rel(e);
      var ps = ptlist2();
      if (ps.length === 2) {
        startDist = dist(ps[0], ps[1]); startScale = scale; startMid = mid(ps[0], ps[1]);
        imgAtMid = { x: (startMid.x - tx) / scale, y: (startMid.y - ty) / scale };
      } else if (ps.length === 1) {
        panStart = { x: ps[0].x, y: ps[0].y, tx: tx, ty: ty };
      }
    });
    function ptlist2() { return Object.keys(pointers).map(function (k) { return pointers[k]; }); }

    stage.addEventListener("pointermove", function (e) {
      if (!(e.pointerId in pointers)) return;
      pointers[e.pointerId] = rel(e);
      var ps = ptlist2();
      if (ps.length === 2 && startDist) {
        e.preventDefault();
        var d = dist(ps[0], ps[1]);
        scale = Math.min(6, Math.max(1, startScale * d / startDist));
        var m = mid(ps[0], ps[1]);
        tx = m.x - imgAtMid.x * scale; ty = m.y - imgAtMid.y * scale;
        clampPan(); apply();
      } else if (ps.length === 1 && panStart && scale > 1) {
        e.preventDefault();
        tx = panStart.tx + (ps[0].x - panStart.x); ty = panStart.ty + (ps[0].y - panStart.y);
        clampPan(); apply();
      }
    });
    function up(e) {
      delete pointers[e.pointerId];
      var n = ptlist2().length;
      if (n === 1) { var p = ptlist2()[0]; panStart = { x: p.x, y: p.y, tx: tx, ty: ty }; }
      if (n === 0) {
        var t = now(), wasTap = (t - lastTap) < 300;
        if (wasTap) {                                  // double-tap: toggle zoom at point
          var r = rel(e);
          if (scale > 1) reset();
          else { scale = 2.6; tx = r.x - r.x * scale; ty = r.y - r.y * scale; clampPan(); apply(); }
          lastTap = 0;
        } else lastTap = t;
        startDist = 0; panStart = null;
      }
    }
    stage.addEventListener("pointerup", up);
    stage.addEventListener("pointercancel", up);

    stage.addEventListener("wheel", function (e) {
      e.preventDefault();
      var r = rel(e), prev = scale;
      scale = Math.min(6, Math.max(1, scale * (e.deltaY < 0 ? 1.15 : 0.87)));
      var ix = (r.x - tx) / prev, iy = (r.y - ty) / prev;
      tx = r.x - ix * scale; ty = r.y - iy * scale;
      if (scale === 1) { tx = 0; ty = 0; }
      clampPan(); apply();
    }, { passive: false });

    // tap background (not the image, when not zoomed) closes
    box.addEventListener("click", function (e) {
      if (e.target === box) close();
    });
    document.addEventListener("keydown", function (e) {
      if (box.classList.contains("open") && e.key === "Escape") close();
    });
  })();

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
