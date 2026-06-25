import { readdir, readFile } from "node:fs/promises";

const baseUrl = "https://forage-berkeley.vercel.app";
const supportHref = "mailto:forage-berkeley@support.tin.computer";
const safetyText = "This page is a recognition practice aid, not an eating guide. Never eat anything based on this page or the app alone.";
const guideSafetyText = "This page is a recognition practice aid, not a safety authority. Never eat, touch, harvest, remove, or prepare any plant based on this page or the app alone.";
const analyticsPrivacyText = "Privacy: we measure only simple product events";
const edibleWeedIds = [
  "dandelion",
  "common-mallow",
  "broadleaf-plantain",
  "sow-thistle",
  "pineapple-weed",
  "chickweed",
  "purslane",
  "lambs-quarters",
  "shepherds-purse",
  "black-mustard",
  "wild-radish",
  "miners-lettuce",
  "stinging-nettle",
  "three-cornered-leek",
  "wild-fennel"
];
const commonWeedIds = [
  "dandelion",
  "common-mallow",
  "broadleaf-plantain",
  "sow-thistle",
  "chickweed",
  "purslane",
  "lambs-quarters",
  "prickly-lettuce",
  "shepherds-purse",
  "black-mustard",
  "wild-radish",
  "sourgrass"
];
const plantWalkIds = [
  "dandelion",
  "common-mallow",
  "broadleaf-plantain",
  "black-mustard",
  "poison-oak",
  "poison-hemlock"
];
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

function checkSupportLink(html, path) {
  includes(html, supportHref, `${path}: missing support contact link`);
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

const homeHtml = await readText("index.html");
const plantIdHtml = await readText("berkeley-plant-identification/index.html");
checkJsonLd(homeHtml, "index.html");
includes(homeHtml, analyticsPrivacyText, "index.html: missing analytics privacy note");
includes(homeHtml, "No accounts, names, emails, exact location, ad pixels, session replay, signup fields, or personal profiles.", "index.html: analytics privacy note no longer matches implementation");
checkJsonLd(speciesHtml, "species/index.html");
checkJsonLd(plantIdHtml, "berkeley-plant-identification/index.html");
checkSupportLink(homeHtml, "index.html");
checkSupportLink(speciesHtml, "species/index.html");
checkSupportLink(plantIdHtml, "berkeley-plant-identification/index.html");

const poisonousGuideHtml = await readText("poisonous-plants/index.html");
const hemlockGuideHtml = await readText("poison-hemlock-identification/index.html");
const edibleWeedsGuideHtml = await readText("edible-weeds-berkeley-east-bay/index.html");
const commonWeedsGuideHtml = await readText("common-east-bay-weeds/index.html");
const plantWalkHtml = await readText("berkeley-plant-walk/index.html");
checkJsonLd(poisonousGuideHtml, "poisonous-plants/index.html");
checkJsonLd(hemlockGuideHtml, "poison-hemlock-identification/index.html");
checkJsonLd(edibleWeedsGuideHtml, "edible-weeds-berkeley-east-bay/index.html");
checkJsonLd(commonWeedsGuideHtml, "common-east-bay-weeds/index.html");
checkJsonLd(plantWalkHtml, "berkeley-plant-walk/index.html");
checkSupportLink(poisonousGuideHtml, "poisonous-plants/index.html");
checkSupportLink(hemlockGuideHtml, "poison-hemlock-identification/index.html");
checkSupportLink(edibleWeedsGuideHtml, "edible-weeds-berkeley-east-bay/index.html");
checkSupportLink(commonWeedsGuideHtml, "common-east-bay-weeds/index.html");
checkSupportLink(plantWalkHtml, "berkeley-plant-walk/index.html");
includes(sitemap, `<loc>${baseUrl}/poisonous-plants/</loc>`, "sitemap.xml: missing poisonous plants guide URL");
includes(sitemap, `<loc>${baseUrl}/poison-hemlock-identification/</loc>`, "sitemap.xml: missing hemlock guide URL");
includes(sitemap, `<loc>${baseUrl}/edible-weeds-berkeley-east-bay/</loc>`, "sitemap.xml: missing edible weeds guide URL");
includes(sitemap, `<loc>${baseUrl}/common-east-bay-weeds/</loc>`, "sitemap.xml: missing common East Bay weeds guide URL");
includes(sitemap, `<loc>${baseUrl}/berkeley-plant-walk/</loc>`, "sitemap.xml: missing self-guided plant walk URL");
includes(poisonousGuideHtml, guideSafetyText, "poisonous-plants/index.html: missing safety language");
includes(hemlockGuideHtml, guideSafetyText, "poison-hemlock-identification/index.html: missing safety language");
includes(edibleWeedsGuideHtml, guideSafetyText, "edible-weeds-berkeley-east-bay/index.html: missing safety language");
includes(commonWeedsGuideHtml, guideSafetyText, "common-east-bay-weeds/index.html: missing safety language");
includes(plantWalkHtml, guideSafetyText, "berkeley-plant-walk/index.html: missing safety language");
if (edibleWeedsGuideHtml.includes("signup-capture")) fail("edible-weeds-berkeley-east-bay/index.html: should not link to signup capture");
if (commonWeedsGuideHtml.includes("signup-capture")) fail("common-east-bay-weeds/index.html: should not link to signup capture");
if (plantWalkHtml.includes("signup-capture")) fail("berkeley-plant-walk/index.html: should not link to signup capture");
for (const id of ["poison-oak", "poison-hemlock", "datura", "wild-fennel"]) {
  includes(poisonousGuideHtml, `href="../species/${id}/"`, `poisonous-plants/index.html: missing species link for ${id}`);
  includes(poisonousGuideHtml, `href="../#plant/${id}"`, `poisonous-plants/index.html: missing app link for ${id}`);
}
for (const id of ["poison-hemlock", "wild-fennel"]) {
  includes(hemlockGuideHtml, `href="../species/${id}/"`, `poison-hemlock-identification/index.html: missing species link for ${id}`);
  includes(hemlockGuideHtml, `href="../#plant/${id}"`, `poison-hemlock-identification/index.html: missing app link for ${id}`);
}
for (const id of edibleWeedIds) {
  includes(edibleWeedsGuideHtml, `href="../species/${id}/"`, `edible-weeds-berkeley-east-bay/index.html: missing species link for ${id}`);
  includes(edibleWeedsGuideHtml, `href="../#plant/${id}"`, `edible-weeds-berkeley-east-bay/index.html: missing app link for ${id}`);
}
for (const id of commonWeedIds) {
  includes(commonWeedsGuideHtml, `href="../species/${id}/"`, `common-east-bay-weeds/index.html: missing species link for ${id}`);
  includes(commonWeedsGuideHtml, `href="../#plant/${id}"`, `common-east-bay-weeds/index.html: missing app link for ${id}`);
}
for (const id of plantWalkIds) {
  includes(plantWalkHtml, `href="../species/${id}/"`, `berkeley-plant-walk/index.html: missing species link for ${id}`);
  includes(plantWalkHtml, `href="../#plant/${id}"`, `berkeley-plant-walk/index.html: missing app link for ${id}`);
}
includes(plantWalkHtml, `href="../#quiz"`, "berkeley-plant-walk/index.html: missing quiz link");
includes(plantWalkHtml, `href="../species/"`, "berkeley-plant-walk/index.html: missing species directory link");

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
  checkSupportLink(pageHtml, plantPath);
  checkJsonLd(pageHtml, plantPath);
}

const expectedUrls = 8 + plants.length;
if (urls.length !== expectedUrls) fail(`sitemap.xml: expected ${expectedUrls} URLs, found ${urls.length}`);

for (const url of [`${baseUrl}/`, `${baseUrl}/berkeley-plant-identification/`, `${baseUrl}/species/`, `${baseUrl}/poisonous-plants/`, `${baseUrl}/poison-hemlock-identification/`, `${baseUrl}/edible-weeds-berkeley-east-bay/`, `${baseUrl}/common-east-bay-weeds/`, `${baseUrl}/berkeley-plant-walk/`]) {
  if (!urls.includes(url)) fail(`sitemap.xml: missing URL ${url}`);
}

if (failures.length) {
  console.error(`Static page check failed with ${failures.length} issue${failures.length === 1 ? "" : "s"}:`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Static page check passed: ${plants.length} plant pages and ${urls.length} sitemap URLs verified.`);
