#!/usr/bin/env python3
"""Zet zelf toegevoegde recepten (Firestore-collectie `eigen`) als bestanden in de repo.

Draait in de GitHub Action .github/workflows/eigen-recepten.yml. Een recept dat al in de
repo staat (front matter `eigen_id`) wordt overgeslagen, dus het script mag zo vaak draaien
als je wil. Firestore is publiek leesbaar, dus er is geen sleutel nodig.
"""
import base64
import json
import re
import sys
import unicodedata
import urllib.request
from pathlib import Path

PROJECT = "recepten-d1c0a"
API_KEY = "AIzaSyBJfXCfyCB2RNuzviMIDQcEQNXCOUxiZHM"  # publieke webconfig, staat ook in _config.yml
ROOT = Path(__file__).resolve().parent.parent
RECEPTEN = ROOT / "_recepten"
FOTOS = ROOT / "assets" / "eigen"


def haal_alle():
    docs, token = [], None
    while True:
        url = f"https://firestore.googleapis.com/v1/projects/{PROJECT}/databases/(default)/documents/eigen?pageSize=300&key={API_KEY}"
        if token:
            url += "&pageToken=" + token
        with urllib.request.urlopen(url, timeout=30) as r:
            data = json.load(r)
        docs += data.get("documents", [])
        token = data.get("nextPageToken")
        if not token:
            return docs


def waarde(v):
    if "stringValue" in v:
        return v["stringValue"]
    if "timestampValue" in v:
        return v["timestampValue"]
    return ""


def bestaande_ids():
    ids = set()
    for f in RECEPTEN.glob("*.md"):
        m = re.search(r"^eigen_id:\s*\"?([A-Za-z0-9]+)\"?\s*$", f.read_text(encoding="utf-8"), re.M)
        if m:
            ids.add(m.group(1))
    return ids


def borden():
    tekst = (ROOT / "_config.yml").read_text(encoding="utf-8")
    deel = tekst.split("\nborden:", 1)[1].split("\ngroepen:", 1)[0]
    return set(re.findall(r"-\s*slug:\s*(\S+)", deel))


def slug(titel):
    s = unicodedata.normalize("NFKD", titel).encode("ascii", "ignore").decode().lower()
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")[:70].strip("-") or "eigen-recept"
    kandidaat, n = s, 2
    while (RECEPTEN / f"{kandidaat}.md").exists():
        kandidaat, n = f"{s}-{n}", n + 1
    return kandidaat


def veilig(t):
    """Geen HTML of Liquid uit het formulier laten uitvoeren (Jekyll verwerkt beide)."""
    return (t.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
             .replace("{", "&#123;").replace("}", "&#125;"))


def regels(tekst):
    uit = [re.sub(r"^\s*(?:[-*•]|\d+[.)])\s*", "", r).strip() for r in tekst.splitlines() if r.strip()]
    return [veilig(r) for r in uit if r]


def schoon(t, maxlen):
    return re.sub(r"[\x00-\x08\x0b-\x1f]", "", t).strip()[:maxlen]


def main():
    al = bestaande_ids()
    geldige_borden = borden()
    FOTOS.mkdir(parents=True, exist_ok=True)
    nieuw = 0
    for doc in haal_alle():
        doc_id = doc["name"].rsplit("/", 1)[1]
        if doc_id in al or not re.fullmatch(r"[A-Za-z0-9]+", doc_id):
            continue
        v = {k: waarde(x) for k, x in doc.get("fields", {}).items()}
        titel = re.sub(r"[<>{}]", "", schoon(v.get("titel", ""), 150)).strip()
        bord = v.get("bord", "")
        ing = regels(schoon(v.get("ingredienten", ""), 5000))
        if not titel or not ing or bord not in geldige_borden:
            print(f"Overgeslagen {doc_id}: titel, ingrediënten of bord ontbreekt", file=sys.stderr)
            continue
        ber = regels(schoon(v.get("bereiding", ""), 10000))
        bron = v.get("bron", "").strip()
        bron = bron if re.match(r"^https?://\S+$", bron) else ""
        naam = slug(titel)

        afbeelding = ""
        m = re.match(r"^data:image/(webp|jpeg|png);base64,(.+)$", v.get("foto", ""), re.S)
        if m:
            ext = "jpg" if m.group(1) == "jpeg" else m.group(1)
            (FOTOS / f"{doc_id}.{ext}").write_bytes(base64.b64decode(m.group(2)))
            afbeelding = f"/recepten/assets/eigen/{doc_id}.{ext}"

        fm = ["---", f"title: {json.dumps(titel, ensure_ascii=False)}"]
        if bron:
            fm.append(f"bron: {json.dumps(bron)}")
        if afbeelding:
            fm.append(f"afbeelding: {afbeelding}")
        porties = re.sub(r"[<>{}]", "", schoon(v.get("porties", ""), 20))
        tijd = re.sub(r"[<>{}]", "", schoon(v.get("tijd", ""), 40))
        if porties:
            fm.append(f"porties: {json.dumps(porties, ensure_ascii=False)}")
        if tijd:
            fm.append(f"tijd: {json.dumps(tijd, ensure_ascii=False)}")
        fm += ["tags: [eigen recept]", f"bord: {bord}", f"eigen_id: {doc_id}", "---", ""]
        body = ["## Ingrediënten", ""] + [f"- {r}" for r in ing] + [""]
        if ber:
            body += ["## Bereiding", ""] + [f"{i}. {r}" for i, r in enumerate(ber, 1)] + [""]
        (RECEPTEN / f"{naam}.md").write_text("\n".join(fm + body), encoding="utf-8")
        print(f"Toegevoegd: {naam} ({doc_id})")
        nieuw += 1
    print(f"{nieuw} nieuwe recepten")


if __name__ == "__main__":
    main()
