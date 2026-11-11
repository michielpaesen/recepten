# Wachtlijst: geplakte links en geüploade pdf's verwerken tot recepten

Werkinstructie voor Claude (geplande taak, elke avond rond 21 uur). Communiceer met Michiel altijd in het Nederlands.

## Hoe links hier terechtkomen

1. Michiel of zijn vriendin plakt een link op /toevoegen/ → Firestore-collectie `links`.
2. De GitHub Action `.github/workflows/eigen-recepten.yml` (elk halfuur) draait `scripts/links_ophalen.py`:
   - `_wachtlijst/<id>.json` met wat er achter de link zit (zie hieronder),
   - eventueel `_wachtlijst/<id>.jpg|webp|png` (foto, vooral Instagram),
   - status in `_data/links.json`: `opgehaald`, `browser` (Instagram, zie onder), `mislukt` (+ `reden`), of `klaar` (+ `recept`).
3. Pdf's: op /toevoegen/ geüpload → Firestore `pdfdelen` (stukjes) + `pdfs`. Dezelfde Action draait
   `scripts/pdfs_ophalen.py` → `_wachtlijst/<id>.pdf` + `_wachtlijst/<id>.json`, status in `_data/links.json`
   met `"pdf": "<bestandsnaam>"` in plaats van `"url"`.
4. Claude zet elke `opgehaald` link of pdf om naar een recept en zet de status op `klaar`.
   De site toont op /toevoegen/ een wachtlijst van alles wat niet `klaar` is.

## Wat er in `<id>.json` staat

- `soort: pinterest` → `pin.link` (bronsite, kan leeg zijn), `pin.beschrijving` (kan het volledige recept bevatten), `pin.foto` (i.pinimg.com 564x), `bron` = opgehaalde bronsite (`recept` = schema.org Recipe JSON-LD of null, `tekst` = paginatekst, `titel`, `foto`).
- `soort: instagram` → `code`, `tekst` (posttekst), `foto` (bestandsnaam in deze map).
- `soort: website` → `bron` zoals hierboven.
- `soort: pdf` → `naam` (bestandsnaam), `paginas`, `tekst` (per pagina, `--- pagina N ---`), `gescand` (true = er
  zit bijna geen tekst in; lees dan `_wachtlijst/<id>.pdf` zelf, pagina per pagina als beeld).

## Een recept maken (vaste regels van Michiel)

- Eén bestand `_recepten/<slug>.md`, slug zonder accenten, uniek.
- Front matter: `title`, `bron` (de geplakte link of de echte bronsite), `afbeelding`, `porties`/`tijd` als bekend, `tags`, `bord`, en **`link_id: <id>`**.
- **Titel** in de oorspronkelijke taal en vorm (naam op de bronsite, zonder sitenaam of SEO-staartjes; Instagram: gerechtnaam uit de post, zonder emoji of HOOFDLETTERS).
- **Ingrediënten en bereiding in het Nederlands**, onder `## Ingrediënten` (lijst `- `) en `## Bereiding` (genummerd). Vertaald? Noot bovenaan: `> Vertaald uit het Engels.` (of Frans, …).
- **Niets verzinnen.** Bereiding of hoeveelheden die nergens staan blijven weg. Staat het recept niet in de post maar wel op een bronsite waarnaar de post verwijst, gebruik die en vermeld de link in de noot. Geen recept te vinden → enkel foto + link met de noot `> Het recept staat niet in de posttekst. Bekijk het via de link hieronder.`
- **Bord**: kies het best passende bestaande bord uit `_config.yml` → `borden:`. Maak geen nieuw bord zonder Michiel.
- **Tags**: gebruik bestaande tags (vegetarisch, kip, gehakt, rund, varken & spek, vis, ovenschotel, …) waar ze kloppen.
- **Foto**:
  - Pinterest/website: de URL van `pin.foto` of `bron.foto` mag rechtstreeks in `afbeelding`.
  - Instagram: zet de foto om naar `assets/ig/<code>.webp` (480×360, bijgesneden) en gebruik `afbeelding: /recepten/assets/ig/<code>.webp`.
- Dubbel (zelfde bron al op de site)? Geen nieuw bestand; zet de status op `klaar` met `recept` naar het bestaande recept.

## Pdf's (`soort: pdf`)

- Lees `_wachtlijst/<id>.pdf` zelf (ook als er tekst in de json staat: foto's en opmaak zie je alleen in de pdf).
- **Elk recept in de pdf wordt een apart bestand**, allemaal met `link_id: <id>`. Geen recept in de pdf →
  status `mislukt` met reden `In deze pdf staat geen recept.`
- Geen `bron` in de front matter (er is geen link). Noot bovenaan: `> Uit de pdf "<naam>".` (bij vertaling op de
  regel eronder ook `> Vertaald uit het Engels.`).
- Dezelfde regels als hierboven: titel in de oorspronkelijke taal, niets verzinnen, bestaand bord en bestaande tags.
- **Foto**: staat er een foto van het gerecht in de pdf, snij die bij naar `assets/pdf/<slug>.webp` (640×480) en zet
  `afbeelding: /recepten/assets/pdf/<slug>.webp`. Geen foto → geen `afbeelding`, nooit een foto van ergens anders.
- Status: `"status": "klaar"`, `"recept"` = het eerste recept, en `"recepten"` = lijst van alle recept-URL's.

## Instagram (status `browser`)

Instagram blokkeert GitHub en de cloud (getest 2026-11-05). Daarom draaien er twee geplande taken:

- **20:38 "Receptlinks verwerken"** (cloud): alle links én pdf's met status `opgehaald`. Laat `browser` staan.
- **20:52 "Instagram-links verwerken"** (op Michiels computer, ingebouwde browser van de Claude-app): alle links met status `browser`. Staat de computer uit of is de browser niet bereikbaar, dan niets wijzigen; de link blijft op de wachtlijst tot de volgende avond.

Werkwijze in de browser: open een tab op `https://www.instagram.com/`, en lees vanaf die pagina met
`fetch('/p/<code>/embed/captioned/')` de HTML; de posttekst staat in `<div class="Caption">` (zonder de
gebruikersnaam-link), de foto in `img.EmbeddedMediaImage`. Lukt de foto niet als bestand, gebruik dan
`afbeelding` niet en meld het in de samenvatting. Verwijst de post naar een receptsite, haal de bereiding
daar (Firecrawl). Daarna dezelfde regels als hierboven.

## Na het verwerken

- `_data/links.json`: per verwerkte link `"status": "klaar", "recept": "/recepten/recepten/<slug>/"`.
- Lukt een link echt niet (login, geen recept, verwijderd): `"status": "mislukt", "reden": "<korte uitleg in het Nederlands>"`, met `"pogingen": 3`.
- `mislukt` met een netwerkreden mag Claude zelf nog proberen (receptsites via Firecrawl; Instagram via de ingebouwde browser als die bereikbaar is). Pinterest en Instagram kan Firecrawl niet lezen.
- `_wachtlijst/<id>.*` mag blijven staan (historiek); verwijder niets uit `_recepten/`.
- Eén commit, bericht bv. `Links van de wachtlijst verwerkt (3 recepten)`, en push naar `main`.
