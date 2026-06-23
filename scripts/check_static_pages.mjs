import { readdir, readFile } from "node:fs/promises";

const baseUrl = "https://forage-berkeley.vercel.app";
const safetyText = "This page is a recognition practice aid, not an eating guide. Never eat anything based on this page or the app alone.";
const failures = [];

async function readText(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

function fail(message) {
  failures.push(message);
}

function includes(html, needle, message) {
  if (!html.includes(needle)) fail(message);
}

function jsonLdBlocks(html, path) {
  const blocks = [...html.matchAll(/<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  if (!blocks.length) fail(`${path}: missing JSON-LD block`);
  return blocks.map((match) => match[1].trim());
}

function checkJsonLd(html, path) {
  for (const block of jsonLdBlocks(html, path)) {
    try {
      JSON.parse(block);
    } catch (error) {
      fail(`${path}: invalid JSON-LD (${error.message})`);
    }
  }
}

function sitemapUrls(xml) {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
}

const plants = JSON.parse(await readText("data/berkeley.json"));
const speciesHtml = await readText("species/index.html");
const sitemap = await readText("sitemap.xml");
const urls = sitemapUrls(sitemap);
const plantDirs = (await readdir(new URL("../species/", import.meta.url), { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

if (plants.length !== 73) fail(`data/berkeley.json: expected 73 plants, found ${plants.length}`);
if (plantDirs.length !== plants.length) fail(`species/: expected ${plants.length} plant page directories, found ${plantDirs.length}`);

checkJsonLd(await readText("index.html"), "index.html");
checkJsonLd(speciesHtml, "species/index.html");
checkJsonLd(await readText("berkeley-plant-identification/index.html"), "berkeley-plant-identification/index.html");

const plantIds = new Set(plants.map((plant) => plant.id));
for (const dir of plantDirs) {
  if (!plantIds.has(dir)) fail(`species/${dir}/: page directory has no matching plant id`);
}

for (const plant of plants) {
  const plantPath = `species/${plant.id}/index.html`;
  const plantUrl = `${baseUrl}/species/${plant.id}/`;
  let pageHtml = "";

  try {
    pageHtml = await readText(plantPath);
  } catch (error) {
    fail(`${plantPath}: missing page (${error.message})`);
    continue;
  }

  includes(speciesHtml, `href="${plant.id}/"`, `species/index.html: missing directory link for ${plant.id}`);
  includes(sitemap, `<loc>${plantUrl}</loc>`, `sitemap.xml: missing URL for ${plant.id}`);
  includes(pageHtml, safetyText, `${plantPath}: missing safety language`);
  includes(pageHtml, `href="../../#plant/${plant.id}"`, `${plantPath}: missing plant-specific app link`);
  includes(pageHtml, `<link rel="canonical" href="${plantUrl}"`, `${plantPath}: missing canonical URL`);
  checkJsonLd(pageHtml, plantPath);
}

const expectedUrls = 3 + plants.length;
if (urls.length !== expectedUrls) fail(`sitemap.xml: expected ${expectedUrls} URLs, found ${urls.length}`);

for (const url of [`${baseUrl}/`, `${baseUrl}/berkeley-plant-identification/`, `${baseUrl}/species/`]) {
  if (!urls.includes(url)) fail(`sitemap.xml: missing URL ${url}`);
}

if (failures.length) {
  console.error(`Static page check failed with ${failures.length} issue${failures.length === 1 ? "" : "s"}:`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Static page check passed: ${plants.length} plant pages and ${urls.length} sitemap URLs verified.`);
