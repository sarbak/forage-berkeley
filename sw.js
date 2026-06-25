/* Forage Berkeley service worker — full offline support.
   Shell cache is versioned (bump SHELL_VERSION to ship updates).
   Image + font caches are stable so an app update never re-downloads the photo set. */
"use strict";

var SHELL_VERSION = "fb-shell-v8";
var IMG_CACHE = "fb-img-v1";
var FONT_CACHE = "fb-fonts-v1";

var SHELL = [
  "./",
  "app.js",
  "data/berkeley.json",
  "photo_meta.json",
  "manifest.json",
  "favicon.svg",
  "apple-touch-icon.png",
  "icon-192.png",
  "icon-512.png",
  "icon-maskable-512.png",
  "berkeley-plant-identification/",
  "berkeley-plant-identification/index.html",
  "edible-weeds-berkeley-east-bay/",
  "edible-weeds-berkeley-east-bay/index.html",
  "common-east-bay-weeds/",
  "common-east-bay-weeds/index.html",
  "berkeley-plant-walk/",
  "berkeley-plant-walk/index.html",
  "poisonous-plants/",
  "poisonous-plants/index.html",
  "poison-hemlock-identification/",
  "poison-hemlock-identification/index.html",
  "species/",
  "species/index.html",
  "CREDITS.md"
];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(SHELL_VERSION).then(function (c) { return c.addAll(SHELL); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k.indexOf("fb-shell-") === 0 && k !== SHELL_VERSION) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

function cacheFirst(req, cacheName) {
  return caches.open(cacheName).then(function (c) {
    return c.match(req).then(function (hit) {
      if (hit) return hit;
      return fetch(req).then(function (res) {
        if (res.ok) c.put(req, res.clone());
        return res;
      });
    });
  });
}

/* serve cached immediately, refresh the cache in the background */
function staleWhileRevalidate(req, cacheName) {
  return caches.open(cacheName).then(function (c) {
    return c.match(req).then(function (hit) {
      var refresh = fetch(req).then(function (res) {
        if (res.ok) c.put(req, res.clone());
        return res;
      }).catch(function () { return hit; });
      return hit || refresh;
    });
  });
}

function cachedNavigation(req) {
  var url = new URL(req.url);
  var path = url.pathname.replace(/^\/+/, "");
  var fallbacks = [req];

  if (path && url.pathname.slice(-1) === "/") {
    fallbacks.push(path + "index.html");
  } else if (path) {
    fallbacks.push(path + "/");
    fallbacks.push(path + "/index.html");
  }

  fallbacks.push("./");

  return fallbacks.reduce(function (promise, candidate) {
    return promise.then(function (hit) {
      return hit || caches.match(candidate);
    });
  }, Promise.resolve());
}

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);

  if (url.origin === self.location.origin) {
    if (url.pathname.indexOf("/img/") === 0) {
      e.respondWith(cacheFirst(req, IMG_CACHE));
    } else if (req.mode === "navigate") {
      e.respondWith(
        fetch(req).then(function (res) {
          if (res.ok) caches.open(SHELL_VERSION).then(function (c) { c.put(req, res.clone()); });
          return res;
        }).catch(function () { return cachedNavigation(req); })
      );
    } else {
      e.respondWith(staleWhileRevalidate(req, SHELL_VERSION));
    }
  } else if (url.hostname === "fonts.gstatic.com") {
    e.respondWith(cacheFirst(req, FONT_CACHE));
  } else if (url.hostname === "fonts.googleapis.com") {
    e.respondWith(staleWhileRevalidate(req, FONT_CACHE));
  }
});
