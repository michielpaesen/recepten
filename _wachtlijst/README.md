# Wachtlijst: geplakte links verwerken tot recepten

Werkinstructie voor Claude (geplande taak, elke avond rond 21 uur). Communiceer met Michiel altijd in het Nederlands.

## Hoe links hier terechtkomen

1. Michiel of zijn vriendin plakt een link op /toevoegen/ → Firestore-collectie `links`.
2. De GitHub Action `.github/workflows/eigen-recepten.yml` (elk halfuur) draait `scripts/links_ophalen.py`:
   - `_wachtlijst/<id>.json` met wat er achter de link zit (zie hieronder),
   - eventueel `_wachtlijst/<id>.jpg|webp|png` (foto, vooral Instagram),
   - status in `_data/links.json`: `opgehaald`, `mislukt` (+ `reden`), of `klaar` (+ `recept`).
3. Claude zet elke `opgehaald` link om naar een recept en zet de status op `klaar`.
   De site toont op /toevoegen/ een wachtlijst van alles wat niet `klaar` is.

## Wat er in `<id>.json` staat

- `soort: pinterest` → `pin.link` (bronsite, kan leeg zijn), `pin.beschrijving` (kan het volledige recept bevatten), `pin.foto` (i.pinimg.com 564x), `bron` = opgehaalde bronsite (`recept` = schema.org Recipe JSON-LD of null, `tekst` = paginatekst, `titel`, `foto`).
- `soort: instagram` → `code`, `tekst` (posttekst), `foto` (bestandsnaam in deze map).
- `soort: website` → `bron` zoals hierboven.

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

## Na het verwerken

- `_data/links.json`: per verwerkte link `"status": "klaar", "recept": "/recepten/recepten/<slug>/"`.
- Lukt een link echt niet (login, geen recept, verwijderd): `"status": "mislukt", "reden": "<korte uitleg in het Nederlands>"`, met `"pogingen": 3`.
- `mislukt` met een netwerkreden mag Claude zelf nog proberen (receptsites via Firecrawl; Instagram via de ingebouwde browser als die bereikbaar is). Pinterest en Instagram kan Firecrawl niet lezen.
- `_wachtlijst/<id>.*` mag blijven staan (historiek); verwijder niets uit `_recepten/`.
- Eén commit, bericht bv. `Links van de wachtlijst verwerkt (3 recepten)`, en push naar `main`.
