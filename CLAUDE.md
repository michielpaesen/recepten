# Receptensite Michiel – overdracht (stand 11-11-2026)

Je neemt het werk aan mijn receptensite over. Communiceer altijd in het Nederlands, ook na lang technisch werk.

## Eerst doen
1. Doe een `git pull` op main, zodat je met de nieuwste versie werkt (de GitHub Action en de geplande taken pushen zelf ook).
2. Lees _wachtlijst/README.md en firestore.rules: daar staan de volledige regels en de geschiedenis.
3. Geef me een kort overzicht van de open punten (onderaan) en vraag waaraan ik wil werken. Begin niet zelf.

## Basis
- Site: https://michielpaesen.github.io/recepten/ (Jekyll op GitHub Pages; push naar main = publiceren, build duurt ±2 min)
- Repo: michielpaesen/recepten. NOOIT de repo "test" gebruiken.
- Lokale kopie staat in OneDrive (04 Claude\recepten): niet tegelijk op twee computers in deze map werken.
- Firebase-project recepten-d1c0a (Firestore, publiek leesbaar). In de console logt Michiel zelf in; Claude vult nooit wachtwoorden in.

## Werkafspraken
- Visuele wijzigingen: EERST voorbeelden tonen, Michiel keurt goed, PAS DAN publiceren (pushen).
- Recepten: titel in de oorspronkelijke taal; ingrediënten en bereiding vertaald naar het Nederlands met de noot "> Vertaald uit het Engels." (of Frans, ...).
- Niets verzinnen: geen bereiding of hoeveelheden die niet in de bron staan. Geen bereiding te vinden → leeg laten of enkel bronlink + foto.
- Vult Claude toch iets aan: bovenaan "⚠️ Nakijken voor je begint" en achter elke aangevulde stap "(aangevuld door Claude)".
- Recepten met alleen een bronlink blijven zo (link + foto), niet zelf invullen.
- Klantenkaarten blijven per toestel (localStorage), nooit in Firestore.
- Op het einde van een werksessie: open punten in dit bestand bijwerken.

## Structuur
- Eén recept = _recepten/<slug>.md met front matter: title, bron, afbeelding, porties, tijd, tags, bord (+ optioneel pin, eigen_id, link_id), daarna "## Ingrediënten" (lijst) en "## Bereiding" (genummerd).
- _config.yml: borden: (slug + naam), groepen: (8 groepen met hun borden), filters: (enkel nog voor het weekmenu). Nieuw bord = toevoegen aan borden: EN aan een groep. Nu 75 borden.
- Bestandsnamen/URL's van bestaande recepten niet wijzigen (weekmenu en favorieten verwijzen ernaar).
- Firestore: favorieten/gedeeld, verborgen/gedeeld, weekmenu/<maandag> (dagen + optioneel middag), lijstje/gedeeld, eigen/<id> (formulier), links/<id> (geplakte links). Aanpassen/wissen van eigen en links mag niet volgens de regels.
- Belangrijke bestanden: index.html (startpagina), weekmenu.html, boodschappen.html, toevoegen.html, eigen.html, klantenkaarten.html, _layouts/default.html (kop + menu), assets/style.css, assets/lijstje.js, week.js, db.js.
- Dit bestand (CLAUDE.md) staat in exclude: van _config.yml en komt dus niet op de site.

## Wat er op de site staat
- Startpagina: zoekbalk + per groep fototegels per bord met aantal (bordfoto wordt in de browser gekozen: topper eerst). Tik op tegel → #<bord>. Ook #groep-<slug>, #favorieten, #verwijderd.
- Menu (☰ Menu, tegels MET symbolen): In huis, Weekmenu, Boodschappenlijstje, Klantenkaarten, Favorieten, Verwijderde recepten, Recept toevoegen.
- Weekmenu: standaard enkel avond, "+ Middag" optioneel, 🎲, zelf ingetypte gerechten (tellen niet mee in top 20/historiek). De knop naar het boodschappenlijstje neemt enkel recepten MET ingrediënten mee.
- Boodschappenlijstje: tegels in Bring!-stijl (rood = te kopen, groen = recent), enkel tekst, geen symbolen; elk woord op een eigen regel, nooit afgebroken (een te lang woord wordt kleiner gezet).
- Klantenkaarten: enkel Aldi (QR uit screenshot, groot op wit scherm, scherm blijft aan).
- Recept toevoegen: bovenaan "Plak een link" + wachtlijst; daaronder een inklapbaar formulier om zelf een recept in te vullen.

## Automatisering
- GitHub Action .github/workflows/eigen-recepten.yml (elk halfuur, :07 en :37):
  - scripts/eigen_naar_repo.py: formulierrecepten (Firestore eigen) → _recepten/ met eigen_id en tag "eigen recept".
  - scripts/links_ophalen.py: geplakte links → _wachtlijst/<id>.json; status in _data/links.json (opgehaald / browser / mislukt / klaar). Instagram krijgt meteen status "browser" (Instagram blokkeert GitHub en de cloud).
- Geplande Claude-taken:
  - "Receptlinks verwerken": dagelijks 20:38, in de cloud → links met status "opgehaald" worden een recept.
  - "Instagram-links verwerken": dagelijks 20:52, op Michiels computer via de ingebouwde browser van de Claude-app → status "browser". Computer uit = link blijft wachten.
- .github/workflows/bronnen-ophalen.yml + scripts/bronnen_ophalen.py: bulkimport van bronsites (_import/pins.json → _import/bronnen.json). De cloud van Claude kan receptsites niet zelf bereiken; Claude Code op de computer wel.

## Lessen uit eerder werk
- Geen Liquid-filters met where/where_exp per bord in index.html: de build werd zo traag dat GitHub Pages afbrak. Ook geen '{}' binnen {{ }}.
- Klassenamen niet hergebruiken tussen pagina's (.kaart van klantenkaarten brak zoeken en favorieten).
- Pinterest zonder login geeft max ±50 pins per bord. Alle pins ophalen kan ingelogd via /resource/BoardFeedResource/get/ (Britts account). Op 06-11 zijn alle 1101 pins van de 81 eetborden nagekeken.

## Open punten
1. Voorstel wacht op goedkeuring: in het venster "Op boodschappenlijstje" (vanuit het weekmenu) een geel blok "Niet meegenomen (geen ingrediënten)" met per gerecht de reden (zelf ingetypt / enkel een link). Voorbeeld: https://claude.ai/artifact/PopxHsBU4P84Q4ut6nMQxn
2. De Aldi-kaart aan de kassa testen.
3. Eventueel extra winkels bij Klantenkaarten.
4. Nieuwe pins van Britt komen niet vanzelf op de site: plakken op "Recept toevoegen" of de borden opnieuw laten vergelijken.
