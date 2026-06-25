import { readFile } from "node:fs/promises";

const failures = [];

async function readText(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

function fail(message) {
  failures.push(message);
}

function includes(text, needle, message) {
  if (!text.includes(needle)) fail(message);
}

const analytics = await readText("analytics.js");
const app = await readText("app.js");
const index = await readText("index.html");
const sw = await readText("sw.js");

for (const event of [
  "app_loaded",
  "quiz_started",
  "browse_opened",
  "plant_detail_opened",
  "quiz_answered",
  "quiz_progress_milestone"
]) {
  includes(app, `"${event}"`, `app.js: missing ${event} event`);
}

includes(index, "window.FB_ANALYTICS_CONFIG", "index.html: missing analytics config");
includes(index, "analytics.js", "index.html: missing analytics script");
includes(sw, "analytics.js", "sw.js: analytics helper is not precached");
includes(analytics, "/capture/", "analytics.js: missing PostHog capture endpoint");
includes(analytics, "$process_person_profile: false", "analytics.js: missing person-profile opt out");
includes(analytics, "sessionStorage", "analytics.js: should use session-scoped identity storage");
includes(analytics, "same_site_referrer_path", "analytics.js: missing same-site-only referrer path");
includes(analytics, "viewport_width", "analytics.js: missing viewport width context");

if (/posthog-js|\bgtag\(|googletagmanager|plausible|mixpanel|\banalytics\.identify|autocapture|session[_-]?record/i.test(analytics + app + index)) {
  fail("analytics: found SDK, autocapture, session recording, or identify-style tracking");
}

if (/\b(email|phone|customer|user_name|full_name|message_body|prompt_text)\b/i.test(analytics + app)) {
  fail("analytics: found a likely personal-data property or signup field");
}

if (/plant_common_name|plant_scientific_name|page_title/i.test(app + analytics)) {
  fail("analytics: event properties should use stable ids and buckets, not names or titles");
}

if (/properties:\s*merge\([^]*distinct_id:/m.test(analytics)) {
  fail("analytics: distinct_id should stay top-level, not inside event properties");
}

if (failures.length) {
  console.error(`Analytics check failed with ${failures.length} issue${failures.length === 1 ? "" : "s"}:`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Analytics check passed: explicit product events only.");
