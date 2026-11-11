#!/usr/bin/env python3
"""Haalt geüploade pdf's (Firestore `pdfs` + `pdfdelen`) op en zet ze in _wachtlijst/.

De pagina /toevoegen/ uploadt een pdf als base64 in stukjes: eerst `pdfdelen/<id>-<nr>`, daarna pas
`pdfs/<id>` (naam, grootte, delen). Per pdf maakt dit script:
  _wachtlijst/<id>.pdf    de pdf zelf
  _wachtlijst/<id>.json   soort "pdf", naam, aantal pagina's en de tekst (als die erin zit)
Status in _data/links.json (zelfde lijst als de geplakte links): "pdf": <naam>, status opgehaald | mislukt.
Claude maakt er 's avonds recepten van (zie _wachtlijst/README.md).
"""
import base64
import io
import json
import re
from datetime import datetime, timezone

from links_ophalen import API_KEY, MAX_POGINGEN, PROJECT, STATUS, WACHT, get

BASIS = f"https://firestore.googleapis.com/v1/projects/{PROJECT}/databases/(default)/documents"
MAX_TEKST = 150_000


def veld(doc, naam):
    v = doc.get("fields", {}).get(naam, {})
    return v.get("stringValue", v.get("integerValue"))


def alle_pdfs():
    docs, token = [], None
    while True:
        url = f"{BASIS}/pdfs?pageSize=300&key={API_KEY}" + (f"&pageToken={token}" if token else "")
        data = json.loads(get(url)[0])
        docs += data.get("documents", [])
        token = data.get("nextPageToken")
        if not token:
            return docs


def pdf_bytes(doc_id, delen):
    stukken = []
    for nr in range(delen):
        doc = json.loads(get(f"{BASIS}/pdfdelen/{doc_id}-{nr}?key={API_KEY}", timeout=60)[0])
        stukken.append(veld(doc, "data") or "")
    data = base64.b64decode("".join(stukken))
    if not data.startswith(b"%PDF"):
        raise ValueError("geen geldige pdf")
    return data


def tekst_uit(data):
    """(aantal pagina's, tekst). Zonder pypdf of bij een scan: tekst leeg, Claude leest dan de pagina's als beeld."""
    try:
        from pypdf import PdfReader
    except ImportError:
        return None, ""
    lezer = PdfReader(io.BytesIO(data))
    delen = []
    for i, pagina in enumerate(lezer.pages, 1):
        try:
            t = (pagina.extract_text() or "").strip()
        except Exception:  # noqa: BLE001 - één slechte pagina mag de rest niet tegenhouden
            t = ""
        delen.append(f"--- pagina {i} ---\n{t}")
    return len(lezer.pages), "\n\n".join(delen)[:MAX_TEKST]


def main():
    WACHT.mkdir(exist_ok=True)
    status = json.loads(STATUS.read_text(encoding="utf-8")) if STATUS.exists() else {}
    if not isinstance(status, dict):
        status = {}
    nu = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    for doc in alle_pdfs():
        doc_id = doc["name"].rsplit("/", 1)[-1]
        st = status.get(doc_id, {})
        if not re.fullmatch(r"[A-Za-z0-9]+", doc_id) or st.get("status") in ("opgehaald", "klaar"):
            continue
        if st.get("status") == "mislukt" and st.get("pogingen", 0) >= MAX_POGINGEN:
            continue
        naam = veld(doc, "naam") or "pdf"
        print("pdf", doc_id, naam)
        try:
            data = pdf_bytes(doc_id, int(veld(doc, "delen") or 0))
            (WACHT / f"{doc_id}.pdf").write_bytes(data)
            paginas, tekst = tekst_uit(data)
            info = {"soort": "pdf", "naam": naam, "grootte": len(data), "paginas": paginas,
                    "tekst": tekst, "gescand": len(re.sub(r"--- pagina \d+ ---|\s", "", tekst)) < 50}
            (WACHT / f"{doc_id}.json").write_text(json.dumps(info, ensure_ascii=False, indent=1), encoding="utf-8")
            status[doc_id] = {"pdf": naam, "status": "opgehaald", "opgehaald": nu}
        except Exception as e:  # noqa: BLE001
            n = st.get("pogingen", 0) + 1
            status[doc_id] = {"pdf": naam, "status": "mislukt", "reden": "De pdf kon niet gelezen worden.",
                              "pogingen": n, "fout": str(e)[:200]}
        print("  →", status[doc_id]["status"])
    STATUS.write_text(json.dumps(status, ensure_ascii=False, indent=1, sort_keys=True) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
