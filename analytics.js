/* First-party activation analytics for Forage Berkeley.
   Sends only public, product-behavior events to the managed PostHog ingest host. */
(function () {
  "use strict";

  var config = window.FB_ANALYTICS_CONFIG || {};
  var key = config.posthogKey;
  var host = (config.posthogHost || "").replace(/\/$/, "");
  var STORAGE_KEY = "fb-analytics-id-v1";

  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return "fb-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  function distinctId() {
    try {
      var existing = localStorage.getItem(STORAGE_KEY);
      if (existing) return existing;
      var id = uuid();
      localStorage.setItem(STORAGE_KEY, id);
      return id;
    } catch (e) {
      return uuid();
    }
  }

  function context() {
    return {
      app: "forage-berkeley",
      environment: location.hostname === "forage-berkeley.vercel.app" ? "production" : "local",
      page_path: location.pathname || "/",
      page_title: document.title,
      viewport_width: window.innerWidth,
      viewport_height: window.innerHeight
    };
  }

  function merge(a, b) {
    var out = {}, k;
    for (k in a) if (Object.prototype.hasOwnProperty.call(a, k)) out[k] = a[k];
    for (k in b || {}) if (Object.prototype.hasOwnProperty.call(b, k)) out[k] = b[k];
    return out;
  }

  function capture(event, properties) {
    if (!key || !host || !event) return;
    var payload = JSON.stringify({
      api_key: key,
      event: event,
      distinct_id: distinctId(),
      properties: merge(context(), properties)
    });
    var endpoint = host + "/capture/";

    if (navigator.sendBeacon) {
      var queued = navigator.sendBeacon(endpoint, new Blob([payload], { type: "application/json" }));
      if (queued) return;
    }

    fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      credentials: "omit",
      keepalive: true,
      mode: "cors"
    }).catch(function () {});
  }

  window.fbAnalytics = { capture: capture, distinctId: distinctId };
})();
