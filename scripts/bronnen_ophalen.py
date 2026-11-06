#!/usr/bin/env python3
"""Haalt de bronsites op voor een lijst pins (eenmalige bulkimport).

Invoer:  _import/pins.json   [{id, bord, link, titel, besch, foto}, ...]
Uitvoer: _import/bronnen.json {pin_id: {url, titel, foto, recept (JSON-LD) | null, tekst, fout?}}
Draait in de GitHub Action 'Bronsites ophalen' (de cloud van Claude mag die sites niet bereiken).
"""
import json
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from links_ophalen import website  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
IN = ROOT / "_import" / "pins.json"
UIT = ROOT / "_import" / "bronnen.json"


def een(pin):
    url = pin.get("link") or ""
    if not url.startswith("http") or "pinterest." in url:
        return pin["id"], None
    try:
        data = website(url)
        data["tekst"] = data.get("tekst", "")[:8000]
        return pin["id"], data
    except Exception as e:  # noqa: BLE001
        return pin["id"], {"url": url, "fout": str(e)[:200]}


def main():
    pins = json.loads(IN.read_text(encoding="utf-8"))
    al = json.loads(UIT.read_text(encoding="utf-8")) if UIT.exists() else {}
    todo = [p for p in pins if p["id"] not in al]
    with ThreadPoolExecutor(8) as ex:
        for pid, data in ex.map(een, todo):
            al[pid] = data
            print(pid, "ok" if data and not data.get("fout") else (data or {}).get("fout", "geen bronsite"))
    UIT.write_text(json.dumps(al, ensure_ascii=False, indent=1), encoding="utf-8")


if __name__ == "__main__":
    main()
