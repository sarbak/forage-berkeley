#!/usr/bin/env python3
"""Fetch leaf-focused photos per plant from Wikimedia Commons (all free-culture licenses),
save to img/<id>/, and record attribution + license in photo_meta.json.

Three slots per plant:
  leaf   -> the HERO (big) image: a close-up of the foliage
  plant  -> the whole plant / habit (leaves in context)
  detail -> a distinguishing detail (fruit / bark / flower), useful for ID

Commons is preferred over iNaturalist here because (a) its descriptive filenames let us
target leaf shots, and (b) everything on Commons is freely licensed (no CC-BY-NC).
"""
import json, os, re, time, html, urllib.parse, urllib.request, sys

ROOT = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(ROOT, "data", "berkeley.json")
IMG = os.path.join(ROOT, "img")
META_OUT = os.path.join(ROOT, "photo_meta.json")
UA = "ForageBerkeley/1.0 (personal noncommercial field-guide; contact emre.sarbak@gmail.com)"

# slot -> ordered search-term templates (filled with the scientific name) and the
# filename keywords that make a candidate a GOOD fit for that slot. The leaf slot is the
# HERO; a second leaf slot keeps the gallery leaf-forward, then plant/flower/fruit/bark.
LEAF_Q = ["{n} leaf", "{n} foliage", "{n} leaves"]
LEAF_GOOD = ["foliage", "leaves", "leaf", "frond"]
# for a clean leaf macro, push DOWN files that are really whole-plant / flower shots
LEAF_AVOID = ["flower", "bloom", "blossom", "whole", "habit", "habitus", "fruit",
              "berr", "seed", "infloresc", "infructesc", "plant -"]
SLOTS = [
    {"key": "leaf",   "label": "leaves",       "queries": LEAF_Q, "good": LEAF_GOOD, "avoid": LEAF_AVOID},
    {"key": "leaf2",  "label": "leaves",       "queries": LEAF_Q, "good": LEAF_GOOD, "avoid": LEAF_AVOID},
    {"key": "plant",  "label": "whole plant",  "queries": ["{n} plant", "{n} habit", "{n} habitus", "{n}"],
     "good": ["plant", "habit", "whole", "growing", "shrub", "tree", "bush"], "avoid": []},
    {"key": "flower", "label": "flower",       "queries": ["{n} flower", "{n} flowers", "{n} blossom", "{n} inflorescence"],
     "good": ["flower", "blossom", "bloom", "infloresc", "floret"], "avoid": ["bark", "fruit", "seed", "leaf only"]},
    {"key": "fruit",  "label": "fruit / seed", "queries": ["{n} fruit", "{n} berries", "{n} seed pod", "{n} cone", "{n} acorn", "{n} nut"],
     "good": ["fruit", "berr", "seed pod", "cone", "nut", "acorn", "drupe", "pod", "hip"], "avoid": ["bark", "flower only"]},
    {"key": "bark",   "label": "bark / stem",  "queries": ["{n} bark", "{n} trunk", "{n} stem"],
     "good": ["bark", "trunk", "stem"], "avoid": ["leaf", "flower", "fruit"]},
]
MIN_PHOTOS, MAX_PHOTOS = 3, 6

# accepted synonyms / alternate binomials Commons often files the SAME species under,
# used when the primary scientific name yields too few (or no leaf) photos.
SYNONYMS = {
    "yerba-buena": ["Clinopodium douglasii", "Satureja douglasii", "Micromeria douglasii"],
    "blue-elderberry": ["Sambucus mexicana", "Sambucus caerulea", "Sambucus nigra", "Sambucus cerulea"],
    "california-rose": ["Rosa californica"],
    "mugwort": ["Artemisia douglasiana"],
    "california-blackberry": ["Rubus ursinus"],
    "black-walnut": ["Juglans hindsii", "Juglans californica"],
    "prickly-pear": ["Opuntia ficus-indica", "Opuntia"],
    "manzanita": ["Arctostaphylos"],
}

# filenames containing any of these are almost never a useful field photo
BAD = re.compile(r"(map|distribution|range|locator|herbarium|specimen|microscop|stoma|"
                 r"spalt[oö]ffnung|mehltau|mildew|powdery|rust fungus|disease|gall|"
                 r"illustration|drawing|engraving|lithograph|botanical art|diagram|chart|"
                 r"chromosome|pollen|\bsem\b|electron|label|signage|museum|stamp|coin|"
                 r"\bseedling|\bseed tray|\.svg|\.tif|\.pdf|herbier|skeleton|cross section|"
                 r"cross-section|anatomy|histolog|cell\b|tissue|"
                 # product / food / prepared / cultural shots, not field photos:
                 r"\btea\b|salad|\bjam\b|jelly|juice|syrup|soup|dish|recipe|cooked|cuisine|"
                 r"tincture|extract|\boil\b|bottle|jar|packet|basket|market|grocery|"
                 r"grinding|mortar|pestle|\bstone|sculpture|statue|painting|"
                 r"potted|\bpot\b|nursery|garden cent|dried|drying|harvest|plate|bowl|"
                 r"\bfood\b|wine|cider|vinegar|powder|capsule|supplement|product|"
                 r"pasta|noodle|vermicelli|spaghetti|risotto|pizza|sauce|pesto|cheese|"
                 r"pecorino|fonduta|risott|served|plated|garnish|cooking|kitchen|\bmeal\b|"
                 r"breakfast|lunch|dinner|\bsnack|drink|cocktail|smoothie|fritter|saut|"
                 r"\bbread\b|cake|pastr|omelet|fonduta|infus|brewed|beverage|"
                 # fauna visiting the plant — not a clean ID photo:
                 r"caterpillar|butterfly|\bmoth|\bbee\b|\bbees\b|bumblebee|insect|beetle|"
                 r"\bbug\b|spider|larva|\bant\b|wasp|hoverfly|\bfly\b|snail|slug|aphid|"
                 r"\bbird|finch|sparrow|squirrel|lizard|host of|visited by|"
                 r"epidermis|cuticle|adaxial|abaxial|collage|montage|\bplate\b|"
                 r"poisonous plants|multiple|comparison|various)", re.I)

# common-name words too generic to confirm the species in a filename
NAME_STOP = {"common", "california", "californian", "coastal", "coast", "pacific", "wild",
             "blue", "black", "red", "white", "yellow", "giant", "sacred", "three",
             "cornered", "bermuda", "redstem", "broadleaf", "tree", "shrub", "weed",
             "plant", "berry", "laurel", "valley", "sow"}

LIC = {  # commons License value -> (display, rank: lower=more permissive)
    "pd": ("Public domain", 0), "cc0": ("CC0", 0),
    "cc-by-4.0": ("CC BY 4.0", 1), "cc-by-3.0": ("CC BY 3.0", 1),
    "cc-by-2.5": ("CC BY 2.5", 1), "cc-by-2.0": ("CC BY 2.0", 1),
    "cc-by-sa-4.0": ("CC BY-SA 4.0", 2), "cc-by-sa-3.0": ("CC BY-SA 3.0", 2),
    "cc-by-sa-2.5": ("CC BY-SA 2.5", 2), "cc-by-sa-2.0": ("CC BY-SA 2.0", 2),
    "cc-sa-1.0": ("CC SA 1.0", 3),
}


def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=40) as r:
        return json.load(r)


def download(url, dest):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as r:
        data = r.read()
    with open(dest, "wb") as f:
        f.write(data)
    return len(data)


def strip_html(s):
    return html.unescape(re.sub(r"<[^>]+>", "", s or "")).strip()


_SEARCH_CACHE = {}


def search(term):
    if term in _SEARCH_CACHE:
        return _SEARCH_CACHE[term]
    url = "https://commons.wikimedia.org/w/api.php?" + urllib.parse.urlencode({
        "action": "query", "generator": "search", "gsrsearch": term,
        "gsrnamespace": "6", "gsrlimit": "15", "prop": "imageinfo",
        "iiprop": "url|extmetadata|mime|size", "iiurlwidth": "1100", "format": "json",
    })
    try:
        d = get(url)
        pages = list((d.get("query") or {}).get("pages", {}).values())
    except Exception as e:
        sys.stderr.write("  search fail %r: %s\n" % (term, e))
        pages = []
    _SEARCH_CACHE[term] = pages
    time.sleep(0.35)
    return pages


def candidate(page, good_words, name_tokens, avoid_words=()):
    ii = (page.get("imageinfo") or [{}])[0]
    if ii.get("mime") not in ("image/jpeg", "image/png"):
        return None
    title = page.get("title", "")
    if BAD.search(title):
        return None
    tl_check = title.lower()
    # safety: the species must be named in the filename, else we risk a wrong-species photo
    if not any(tok in tl_check for tok in name_tokens):
        return None
    em = ii.get("extmetadata", {})
    lic_val = (em.get("License") or {}).get("value", "").lower()
    if lic_val not in LIC:
        return None
    w = ii.get("thumbwidth") or ii.get("width") or 0
    h = ii.get("thumbheight") or ii.get("height") or 0
    if (ii.get("width") or 0) < 500:   # original too small
        return None
    disp, rank = LIC[lic_val]
    tl = title.lower()
    score = -rank   # license is only a minor tiebreaker; framing matters more
    score += sum(4 for g in good_words if g in tl)
    score -= sum(5 for a in avoid_words if a in tl)   # penalise mixed/off-subject shots
    if min(w, h) and 0.5 <= w / max(h, 1) <= 2.0:   # reasonably framed, not a banner
        score += 1
    artist = strip_html((em.get("Artist") or {}).get("value", "")) or "Wikimedia Commons"
    artist = re.sub(r"\s+", " ", artist)[:80]
    return {
        "score": score, "url": ii.get("thumburl") or ii.get("url"),
        "license": disp, "license_code": lic_val, "attribution": artist,
        "title": title.replace("File:", ""),
        "source": "https://commons.wikimedia.org/wiki/" + urllib.parse.quote(title),
    }


def name_tokens_for(sci, common):
    toks = set()
    for w in re.split(r"[\s()/]+", sci.lower()):
        if len(w) >= 4:
            toks.add(w)
    for w in re.split(r"[\s()/]+", common.lower()):
        w = w.strip("'s")
        if len(w) >= 3 and w not in NAME_STOP:
            toks.add(w)
    return toks


def pick_for_slot(sci, slot, used_titles, name_tokens):
    best = []
    for tmpl in slot["queries"]:
        for page in search(tmpl.format(n=sci)):
            c = candidate(page, slot["good"], name_tokens, slot.get("avoid", ()))
            if c and c["title"] not in used_titles:
                best.append(c)
        if any(c["score"] >= 5 for c in best):   # a clean keyword hit; stop early
            break
    if not best:
        return None
    best.sort(key=lambda c: c["score"], reverse=True)
    return best[0]


def inat_fallback(sci, n_needed):
    """Species-correct photos from iNaturalist for slots Commons couldn't fill."""
    clean = sci.replace(" ssp.", "").strip()
    try:
        tx = get("https://api.inaturalist.org/v1/taxa?" +
                 urllib.parse.urlencode({"q": clean, "per_page": 3})).get("results", [])
        if not tx:
            return []
        tid = tx[0]["id"]
        detail = get("https://api.inaturalist.org/v1/taxa/%s" % tid)["results"][0]
    except Exception:
        return []
    out = []
    for tp in detail.get("taxon_photos", []):
        p = tp.get("photo", {})
        lic = (p.get("license_code") or "").lower()
        if lic not in ("cc0", "cc-by", "cc-by-sa", "cc-by-nc", "cc-by-nc-sa"):
            continue
        url = (p.get("url") or "").replace("/square.", "/large.").replace("/square?", "/large?")
        out.append({
            "url": url, "license": lic.upper().replace("CC-", "CC ").replace("BY", "BY "),
            "license_code": lic, "attribution": re.sub(r"\s+", " ", p.get("attribution", ""))[:80],
            "title": "iNaturalist photo %s" % p.get("id"),
            "source": "https://www.inaturalist.org/photos/%s" % p.get("id"),
        })
        if len(out) >= n_needed:
            break
    return out


def main():
    plants = json.load(open(DATA))
    meta, summary = {}, []
    for i, p in enumerate(plants, 1):
        pid = p["id"]
        sci = p["scientificName"].replace(" spp.", "").replace(" ssp.", " ")
        tokens = name_tokens_for(sci, p["commonName"])
        folder = os.path.join(IMG, pid)
        os.makedirs(folder, exist_ok=True)
        saved, used = [], set()
        # try the primary name, then any accepted synonyms Commons may file under
        names = [sci] + SYNONYMS.get(pid, [])
        syn_tokens = set(tokens)
        for nm in SYNONYMS.get(pid, []):
            syn_tokens |= name_tokens_for(nm.replace(" ssp.", " "), p["commonName"])
        for slot in SLOTS:
            if len(saved) >= MAX_PHOTOS:
                break
            c = None
            for nm in names:
                c = pick_for_slot(nm, slot, used, syn_tokens)
                if c:
                    break
            if not c:
                continue
            used.add(c["title"])
            dest = os.path.join(folder, slot["key"] + ".jpg")
            try:
                n = download(c["url"], dest)
                if n < 2000:
                    os.remove(dest); continue
                saved.append({"slot": slot["key"], "label": slot["label"],
                              **{k: c[k] for k in
                                 ("url", "license", "license_code", "attribution", "title", "source")}})
            except Exception as e:
                sys.stderr.write("  dl fail %s/%s: %s\n" % (pid, slot["key"], e))
            time.sleep(0.25)
        # only top up to the MINIMUM from iNaturalist (species-correct) — don't over-fill
        if len(saved) < MIN_PHOTOS:
            fb = inat_fallback(p["scientificName"], MIN_PHOTOS - len(saved))
            for j, c in enumerate(fb):
                key = "more%d" % (j + 1)
                dest = os.path.join(folder, key + ".jpg")
                try:
                    n = download(c["url"], dest)
                    if n < 2000:
                        continue
                    saved.append({"slot": key, "label": "plant", **c})
                except Exception as e:
                    sys.stderr.write("  inat dl fail %s/%s: %s\n" % (pid, key, e))
                time.sleep(0.3)
            time.sleep(0.8)
        meta[pid] = saved
        summary.append("%-22s %d  [%s]" % (pid, len(saved),
                       ", ".join("%s:%s" % (s["slot"], s["license_code"]) for s in saved)))
        print("[%2d/49] %s" % (i, summary[-1]), flush=True)
    json.dump(meta, open(META_OUT, "w"), indent=2)
    print("\n=== DONE ===  total images:", sum(len(v) for v in meta.values()))
    missing = [k for k, v in meta.items() if len(v) < 3]
    if missing:
        print("INCOMPLETE (<3 photos):", missing)


if __name__ == "__main__":
    main()
