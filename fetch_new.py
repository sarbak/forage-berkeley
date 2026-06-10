import json, os, time, sys
import fetch_photos as f

plants = json.load(open(f.DATA))
meta = json.load(open(f.META_OUT)) if os.path.exists(f.META_OUT) else {}
todo = [p for p in plants if p["id"] not in meta]
print("fetching", len(todo), "new plants", flush=True)

for i, p in enumerate(todo, 1):
    pid = p["id"]
    sci = p["scientificName"].replace(" spp.", "").replace(" ssp.", " ")
    tokens = f.name_tokens_for(sci, p["commonName"])
    names = [sci] + f.SYNONYMS.get(pid, [])
    syn_tokens = set(tokens)
    for nm in f.SYNONYMS.get(pid, []):
        syn_tokens |= f.name_tokens_for(nm.replace(" ssp.", " "), p["commonName"])
    folder = os.path.join(f.IMG, pid); os.makedirs(folder, exist_ok=True)
    saved, used = [], set()
    for slot in f.SLOTS:
        if len(saved) >= f.MAX_PHOTOS: break
        c = None
        for nm in names:
            c = f.pick_for_slot(nm, slot, used, syn_tokens)
            if c: break
        if not c: continue
        used.add(c["title"]); dest = os.path.join(folder, slot["key"] + ".jpg")
        try:
            n = f.download(c["url"], dest)
            if n < 2000: os.remove(dest); continue
            saved.append({"slot": slot["key"], "label": slot["label"],
                          **{k: c[k] for k in ("url","license","license_code","attribution","title","source")}})
        except Exception as e:
            sys.stderr.write("  dl fail %s/%s: %s\n" % (pid, slot["key"], e))
        time.sleep(0.25)
    if len(saved) < f.MIN_PHOTOS:
        fb = f.inat_fallback(p["scientificName"], f.MIN_PHOTOS - len(saved))
        for j, c in enumerate(fb):
            key = "more%d" % (j + 1); dest = os.path.join(folder, key + ".jpg")
            try:
                if f.download(c["url"], dest) >= 2000:
                    saved.append({"slot": key, "label": "plant", **c})
            except Exception: pass
            time.sleep(0.3)
    meta[pid] = saved
    noleaf = "" if any(s["slot"] in ("leaf","leaf2") for s in saved) else " NO-LEAF"
    print("[%2d/%d] %-20s %d%s" % (i, len(todo), pid, len(saved), noleaf), flush=True)

json.dump(meta, open(f.META_OUT, "w"), indent=2)
print("=== DONE === total plants in meta:", len(meta), "imgs:", sum(len(v) for v in meta.values()))
