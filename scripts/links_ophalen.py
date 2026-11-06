#!/usr/bin/env python3
"""Haalt geplakte links (Firestore-collectie `links`) op en bewaart wat erachter zit in _wachtlijst/.

Draait in de GitHub Action, die wel overal mag surfen. Claude verwerkt _wachtlijst/ 's avonds tot
recepten (zie _wachtlijst/README.md). Per link:
  _wachtlijst/<id>.json   bron-URL, recept-JSON-LD (als de site dat heeft), paginatekst, foto-URL
  _wachtlijst/<id>.<ext>  de foto (Instagram-fotolinks vervallen, dus meteen bewaren)
Status per link in _data/links.json: opgehaald | browser (Instagram: Claude haalt het 's avonds via de
browser op Michiels computer) | mislukt (+ reden) | klaar (+ recept, gezet door Claude).
"""
import html
import json
import re
import sys
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path

PROJECT = "recepten-d1c0a"
API_KEY = "AIzaSyBJfXCfyCB2RNuzviMIDQcEQNXCOUxiZHM"  # publieke webconfig, staat ook in _config.yml
ROOT = Path(__file__).resolve().parent.parent
WACHT = ROOT / "_wachtlijst"
STATUS = ROOT / "_data" / "links.json"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
MAX_POGINGEN = 3


def get(url, binair=False, timeout=30):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept-Language": "nl-BE,nl;q=0.9,en;q=0.8"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        data = r.read(8_000_000)
        return (data if binair else data.decode(r.headers.get_content_charset() or "utf-8", "replace")), r.geturl()


def firestore_links():
    docs, token = [], None
    while True:
        url = f"https://firestore.googleapis.com/v1/projects/{PROJECT}/databases/(default)/documents/links?pageSize=300&key={API_KEY}"
        if token:
            url += "&pageToken=" + token
        data = json.loads(get(url)[0])
        docs += data.get("documents", [])
        token = data.get("nextPageToken")
        if not token:
            return docs


class Tekst(HTMLParser):
    """Zichtbare tekst van een pagina, zonder scripts, stijl en navigatie."""
    SKIP = {"script", "style", "noscript", "nav", "footer", "header", "svg", "form"}

    def __init__(self):
        super().__init__()
        self.diep, self.delen = 0, []

    def handle_starttag(self, tag, attrs):
        if tag in self.SKIP:
            self.diep += 1
        elif tag in ("p", "li", "br", "h1", "h2", "h3", "h4", "tr", "div"):
            self.delen.append("\n")

    def handle_endtag(self, tag):
        if tag in self.SKIP and self.diep:
            self.diep -= 1

    def handle_data(self, data):
        if not self.diep:
            self.delen.append(data)


def paginatekst(h, maxlen=20000):
    p = Tekst()
    p.feed(h)
    t = re.sub(r"[ \t\r\f\v]+", " ", "".join(p.delen))
    return re.sub(r"\n\s*\n+", "\n", t).strip()[:maxlen]


def recept_jsonld(h):
    for blok in re.findall(r'<script[^>]+application/ld\+json[^>]*>(.*?)</script>', h, re.S | re.I):
        try:
            data = json.loads(blok.strip())
        except ValueError:
            continue
        stapel = [data]
        while stapel:
            x = stapel.pop()
            if isinstance(x, list):
                stapel += x
            elif isinstance(x, dict):
                t = x.get("@type")
                if t == "Recipe" or (isinstance(t, list) and "Recipe" in t):
                    return x
                stapel += [v for k, v in x.items() if k in ("@graph", "mainEntity", "itemListElement")]
    return None


def meta(h, naam):
    m = re.search(r'<meta[^>]+(?:property|name)=["\']%s["\'][^>]+content=["\']([^"\']+)' % re.escape(naam), h, re.I) \
        or re.search(r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+(?:property|name)=["\']%s["\']' % re.escape(naam), h, re.I)
    return html.unescape(m.group(1)) if m else ""


def titel(h):
    m = re.search(r"<h1[^>]*>(.*?)</h1>", h, re.S | re.I)
    return html.unescape(re.sub(r"<[^>]+>", "", m.group(1))).strip() if m else meta(h, "og:title")


def website(url):
    h, eind = get(url)
    return {"url": eind, "titel": titel(h), "foto": meta(h, "og:image"), "recept": recept_jsonld(h), "tekst": paginatekst(h)}


def bewaar_foto(doc_id, url):
    if not url:
        return ""
    try:
        data, eind = get(url, binair=True)
    except Exception as e:  # noqa: BLE001
        print(f"  foto niet opgehaald: {e}", file=sys.stderr)
        return ""
    ext = "png" if data[:4] == b"\x89PNG" else "webp" if data[8:12] == b"WEBP" else "jpg"
    (WACHT / f"{doc_id}.{ext}").write_bytes(data)
    return f"{doc_id}.{ext}"


def pinterest(url, doc_id):
    _, eind = get(url)  # pin.it-links verwijzen door naar de pin
    m = re.search(r"/pin/(\d+)", eind) or re.search(r"/pin/(\d+)", url)
    if not m:
        raise Fout("dit is geen Pinterest-pin (misschien een bord of profiel)")
    pid = m.group(1)
    info = json.loads(get(f"https://widgets.pinterest.com/v3/pidgets/pins/info/?pin_ids={pid}")[0])
    pin = (info.get("data") or [None])[0]
    if not pin:
        raise Fout("deze pin bestaat niet meer of is privé")
    beelden = pin.get("images") or {}
    foto = (beelden.get("564x") or beelden.get("237x") or {}).get("url", "")
    uit = {"soort": "pinterest", "pin": {"id": pid, "link": pin.get("link") or "", "beschrijving": pin.get("description") or "",
                                       "titel": pin.get("title") or "", "foto": foto,
                                       "rich": pin.get("rich_metadata") or None, "domein": pin.get("domain") or ""}}
    bron = pin.get("link") or ""
    if bron and "pinterest." not in bron:
        try:
            uit["bron"] = website(bron)
        except Exception as e:  # noqa: BLE001
            uit["bron"] = {"url": bron, "fout": str(e)[:200]}
    return uit


def instagram(url, doc_id):
    m = re.search(r"instagram\.com/(?:[^/]+/)?(?:p|reel|reels|tv)/([A-Za-z0-9_-]+)", url)
    if not m:
        raise Fout("dit is geen Instagram-post")
    # Instagram toont GitHub nooit de post (getest 2026-11-05): meteen doorgeven aan de browserverwerking
    raise ViaBrowser(m.group(1))
    code = m.group(1)
    h, _ = get(f"https://www.instagram.com/p/{code}/embed/captioned/")
    cap = re.search(r'<div class="Caption"[^>]*>(.*?)</div>', h, re.S)
    tekst = ""
    if cap:
        c = re.sub(r'<a class="CaptionUsername".*?</a>', "", cap.group(1), flags=re.S)
        tekst = html.unescape(re.sub(r"<br\s*/?>", "\n", c))
        tekst = re.sub(r"<[^>]+>", "", tekst).strip()
    img = re.search(r'class="EmbeddedMediaImage"[^>]+src="([^"]+)"', h) or re.search(r'<img[^>]+class="[^"]*EmbeddedMediaImage[^"]*"[^>]+src="([^"]+)"', h)
    foto = html.unescape(img.group(1)) if img else ""
    if not tekst and not foto:
        raise Fout("Instagram liet de post niet zien (Claude probeert het via de browser)")
    return {"soort": "instagram", "code": code, "tekst": tekst, "foto_url": foto, "foto": bewaar_foto(doc_id, foto)}


class Fout(Exception):
    pass


class ViaBrowser(Exception):
    """Instagram blokkeert GitHub; Claude haalt de post op via de ingebouwde browser."""


def haal(url, doc_id):
    host = urllib.parse.urlparse(url).netloc.lower()
    if "pinterest." in host or host.endswith("pin.it"):
        return pinterest(url, doc_id)
    if "instagram.com" in host:
        return instagram(url, doc_id)
    site = website(url)
    return {"soort": "website", "bron": site}


def main():
    WACHT.mkdir(exist_ok=True)
    status = json.loads(STATUS.read_text(encoding="utf-8")) if STATUS.exists() else {}
    if not isinstance(status, dict):
        status = {}
    nu = datetime.now(timezone.utc).isoformat(timespec="seconds")
    for doc in firestore_links():
        doc_id = doc["name"].rsplit("/", 1)[1]
        url = doc.get("fields", {}).get("url", {}).get("stringValue", "").strip()
        st = status.get(doc_id, {})
        if not re.fullmatch(r"[A-Za-z0-9]+", doc_id) or st.get("status") in ("opgehaald", "klaar", "browser"):
            continue
        if st.get("status") == "mislukt" and st.get("pogingen", 0) >= MAX_POGINGEN:
            continue
        print(f"{doc_id}: {url}")
        try:
            if not re.match(r"^https?://\S+$", url):
                raise Fout("dit is geen geldige link")
            data = haal(url, doc_id)
            data.update({"id": doc_id, "url": url, "opgehaald": nu})
            (WACHT / f"{doc_id}.json").write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")
            status[doc_id] = {"url": url, "status": "opgehaald", "opgehaald": nu}
        except ViaBrowser as e:
            status[doc_id] = {"url": url, "status": "browser", "code": str(e), "opgehaald": nu}
        except Fout as e:
            status[doc_id] = {"url": url, "status": "mislukt", "reden": str(e), "pogingen": MAX_POGINGEN}
        except Exception as e:  # noqa: BLE001  (netwerk: later opnieuw proberen)
            n = st.get("pogingen", 0) + 1
            reden = "de site was niet bereikbaar" if n < MAX_POGINGEN else "de site blokkeert het ophalen; Claude probeert het nog op een andere manier"
            status[doc_id] = {"url": url, "status": "mislukt", "reden": reden, "pogingen": n, "fout": str(e)[:200]}
        print("  →", status[doc_id]["status"], status[doc_id].get("reden", ""))
    STATUS.write_text(json.dumps(status, ensure_ascii=False, indent=1, sort_keys=True) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
