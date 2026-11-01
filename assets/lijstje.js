// Boodschappenlijstje: één doorlopend, gedeeld lijstje (Firestore lijstje/gedeeld), zoals Bring!.
// Item: { naam, spec, sommen: {eenheid: getal}, tekst: [vrije hoeveelheden], voor: [recepttitels], af: ms|null, t: ms, cat? }
// Zelfde naam + zelfde specificatie = één regel; hoeveelheden worden opgeteld via Boodschappen.toon.
(() => {
  const B = window.Boodschappen;
  const LS = 'lijstje';
  const MAX_RECENT = 30;
  let staat = { items: {}, cats: {} };
  try { const x = JSON.parse(localStorage.getItem(LS) || 'null'); if (x && x.items) staat = { items: x.items, cats: x.cats || {} }; } catch (e) {}
  const luisteraars = [];
  let online = null, fout = false;
  const melden = () => luisteraars.forEach(f => f());
  const bewaarLokaal = () => { try { localStorage.setItem(LS, JSON.stringify(staat)); } catch (e) {} };

  const schoon = s => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
  const naamVan = s => { const n = B.naamVan(String(s || '')); return n || schoon(s); };
  const sleutel = (naam, spec) => (naam + '|' + schoon(spec)).replace(/[.\/#$\[\]]/g, '_');
  const kopie = o => JSON.parse(JSON.stringify(o));

  // hoeveelheid als tekst ("250 g", "2", "1 pot") → { sommen, tekst }
  function leesHoeveel(q, naam) {
    q = String(q || '').trim();
    if (!q) return { sommen: {}, tekst: [] };
    const r = B.lees(q + ' ' + naam);
    // "10 sneetjes" niet ombouwen tot "10 stuks": stuks enkel bij een kaal getal
    if (r && r.length === 1 && r[0].n !== null && (r[0].eenheid !== 'stuk' || /^[\d.,½¼¾\/\s]+$/.test(q))) return { sommen: { [r[0].eenheid]: r[0].n }, tekst: [] };
    return { sommen: {}, tekst: [q] };
  }
  const hoeveel = it => {
    const s = { ...(it.sommen || {}) }, l = it.leeg || 0;
    if (l && (s.stuk || l > 1)) s.stuk = (s.stuk || 0) + l; // één keer zonder aantal: geen getal tonen
    return [B.toon(it.naam, s), ...(it.tekst || [])].filter(Boolean).join(' + ');
  };
  const catVan = (naam, it) => (it && it.cat) || staat.cats[naam] || B.categorie(naam);

  // één item (nieuw of bijtellen) in een items-object zetten
  function bij(items, e, nu) {
    const k = sleutel(e.naam, e.spec);
    const oud = items[k];
    if (!oud || oud.af) {
      items[k] = { naam: e.naam, spec: schoon(e.spec), sommen: { ...(e.sommen || {}) }, tekst: [...(e.tekst || [])], leeg: e.leeg || 0, voor: [...(e.voor || [])], af: null, t: nu };
      if (oud && oud.cat) items[k].cat = oud.cat;
      return;
    }
    for (const [u, n] of Object.entries(e.sommen || {})) oud.sommen[u] = (oud.sommen[u] || 0) + n;
    if (e.leeg) oud.leeg = (oud.leeg || 0) + e.leeg;
    (e.tekst || []).forEach(x => oud.tekst.push(x));
    (e.voor || []).forEach(v => { if (!oud.voor.includes(v)) oud.voor.push(v); });
  }
  function snoei(items) {
    const af = Object.entries(items).filter(([, it]) => it.af).sort((a, b) => b[1].af - a[1].af);
    af.slice(MAX_RECENT).forEach(([k]) => delete items[k]);
  }

  // wijziging: meteen lokaal, daarna als transactie online (zodat jullie elkaar niet overschrijven)
  function wijzig(fn) {
    const nu = Date.now();
    fn(staat, nu); snoei(staat.items); bewaarLokaal(); melden();
    if (!online) return Promise.resolve();
    return online(s => { fn(s, nu); snoei(s.items); });
  }

  // icoon per product: alleen een emoji als die het product echt toont, anders null (de tegel toont dan de beginletter)
  const ICONEN = [
    [/^(olijfolie|olijven|olijf|zwarte olijven|groene olijven|kalamata-olijven)$/, '🫒'], [/^(grof |fijn |zee)?zout$/, '🧂'], [/^(kokos|kokosmelk|kokosrasp|kokosroom)$/, '🥥'], [/^(pinda|pindas|pindakaas)$/, '🥜'],
    [/(^|\s)(kip|kipfilet|kippendij|kippendijfilet|kippengehakt|kipgehakt|kipreepjes|kipfiletreepjes|kippenbout|kipgyros|kipgehaktballetjes|gegrilde kip)$/, '🍗'],
    [/^(spek|spekblokjes|spekjes|bacon|ontbijtspek|pancetta|gerookt spek)$/, '🥓'],
    [/(gehakt|rundergehakt|biefstuk|steak|rundvlees|varkenshaas|kogelbiefstuk|biefstukreepjes|gehaktballetjes)$/, '🥩'],
    [/^(zalm|zalmfilet|kabeljauw|vis|visfilet|tonijn|witvis|pangasius)/, '🐟'], [/garnaal|garnalen|scampi/, '🦐'],
    [/^(ei|eieren|eidooier|eiwit)$/, '🥚'], [/^(boter|roomboter|ongezouten boter)$/, '🧈'],
    [/(kaas|kaasvlokken)$|^(parmezaan|mozzarella|feta|cheddar|burrata|ricotta|halloumi|mascarpone|brie|pecorino|gouda|emmentaler|gruyère|provolone|camembert|verkruimelde feta|franse roombrie)/, '🧀'],
    [/^(halfvolle |volle |magere |half )?melk$/, '🥛'],
    [/^(aubergine)$/, '🍆'], [/^(avocado)$/, '🥑'], [/^(banaan|bananen)$/, '🍌'], [/^(appel|appels|zure appel|jonagold|elstar)$/, '🍎'],
    [/^(peer|peren)$/, '🍐'], [/^(citroen)$/, '🍋'], [/^(sinaasappel|mandarijn|clementine|mineola)$/, '🍊'], [/^(mango)$/, '🥭'],
    [/^(ananas)$/, '🍍'], [/^(aardbei|aardbeien)$/, '🍓'], [/^(blauwe bessen|bosbessen)$/, '🫐'], [/^(druif|druiven)$/, '🍇'],
    [/^(kers|kersen)$/, '🍒'], [/^(perzik|perziken|nectarine)$/, '🍑'], [/^(meloen|galiameloen|cantaloupe)$/, '🍈'], [/^watermeloen$/, '🍉'], [/^kiwi$/, '🥝'],
    [/^(tomaat|tomaten|kerstomaat|kerstomaten|cherrytomaten|trostomaat|trostomaten|romatomaat|pruimtomaat|vleestomaat)$/, '🍅'],
    [/^(wortel|wortels|winterwortel|bospeen|peen)$/, '🥕'], [/^(maïs|mais|maïskolf|maïskolven)$/, '🌽'],
    [/^(aardappel|aardappelen|krieltjes|kriel)$/, '🥔'], [/^zoete aardappel$/, '🍠'], [/^(broccoli)$/, '🥦'], [/^(komkommer|minikomkommer)$/, '🥒'],
    [/^(paprika|rode paprika|gele paprika|groene paprika|puntpaprika|zoete puntpaprika)$/, '🫑'],
    [/^(chili|rode peper|spaanse peper|jalapeño|jalapeno)$/, '🌶️'], [/^(knoflook|knoflookteen|knoflooktenen)$/, '🧄'],
    [/^(ui|uien|rode ui|witte ui|gele ui|sjalot|sjalotten)$/, '🧅'], [/^gember$/, '🫚'],
    [/^(champignons?|kastanjechampignons?|paddenstoelen|oesterzwammen|shiitake)$/, '🍄'],
    [/^(sla|ijsbergsla|romeinse sla|romainesla|botersla|veldsla|rucola|spinazie|paksoi|spitskool|witte kool|rode kool|kool|savooiekool)$/, '🥬'],
    [/^(erwten|doperwten|edamame|peultjes|sugarsnaps)$/, '🫛'], [/^(kikkererwten|kidneybonen|bruine bonen|witte bonen|zwarte bonen|linzen|sojabonen)$/, '🫘'],
    [/^(pompoen|butternut|flespompoen|pompoenblokjes)$/, '🎃'],
    [/^(basilicum|peterselie|bladpeterselie|koriander|munt|dille|bieslook|tijm|rozemarijn|salie|oregano|dragon|salieblaadjes)$/, '🌿'],
    [/^(brood|broodjes|bruin brood|wit brood|desembrood|turks brood|turks broodje)$/, '🍞'], [/^(stokbrood|baguette|ciabatta|witte ciabatta)$/, '🥖'],
    [/^croissants?$/, '🥐'], [/^(wrap|wraps|tortilla|tortillas|mini-tortillas|naan|pita|pitabroodje)$/, '🫓'], [/^(pannenkoek|pannenkoeken)$/, '🥞'],
    [/^(pasta|spaghetti|penne|fusilli|farfalle|linguine|tagliatelle|fettuccine|rigatoni|macaroni|orzo|conchiglie|casarecce|spirelli|lasagnevellen|vlinderpasta|volkoren spaghetti|volkoren penne)$/, '🍝'],
    [/^(noedels|mienoedels|rijstnoedels|udonnoedels|mie|eiernoedels|ramen)$/, '🍜'],
    [/^(rijst|basmatirijst|jasmijnrijst|zilvervliesrijst|risottorijst|witte rijst|zilvervlies rijst|bruine snelkookrijst)$/, '🍚'],
    [/^honing$/, '🍯'], [/(chocolade|chocoladedruppels)$/, '🍫'], [/^(koekjes|speculooskoekjes|speculoos|digestives)$/, '🍪'], [/^(roomijs|ijs|vanille-ijs)$/, '🍨'],
    [/(^|\s)wijn$|^witte wijn$|^rode wijn$|^droge witte wijn$/, '🍷'], [/^bier$/, '🍺'], [/^koffie$/, '☕'], [/^thee$/, '🍵'],
    [/^(appelsap|sinaasappelsap|fruitsap|sap)$/, '🧃'], [/^(water|kookwater|bruiswater|spuitwater)$/, '💧'],
    [/^(wc-papier|toiletpapier|keukenrol|keukenpapier)$/, '🧻'], [/^(zeep|handzeep|afwasmiddel)$/, '🧼'], [/^(spons|sponzen)$/, '🧽'], [/^tandpasta$/, '🪥']
  ];
  const icoon = naam => {
    naam = String(naam || '').toLowerCase().trim();
    const r = ICONEN.find(([re]) => re.test(naam));
    return r ? r[1] : null;
  };
  const letter = naam => (String(naam || '').trim()[0] || '?').toUpperCase();

  const api = {
    icoon, letter,
    get items() { return staat.items; },
    get fout() { return fout; },
    onChange: f => { luisteraars.push(f); f(); },
    naamVan, sleutel, hoeveel, catVan, leesHoeveel,
    open: () => Object.entries(staat.items).filter(([, it]) => !it.af),
    recent: () => Object.entries(staat.items).filter(([, it]) => it.af).sort((a, b) => b[1].af - a[1].af),
    // entries: [{ naam, spec, sommen, tekst, voor }]
    voegToe: entries => wijzig((s, nu) => entries.forEach(e => bij(s.items, e, nu))),
    // zonder hoeveelheid telt elke keer toevoegen als 1 extra (2x "ui" = 2 stuks)
    voegToeTekst: (naam, spec, q) => { const n = B.enkelvoud(naam); if (!n) return Promise.resolve(); return api.voegToe([{ naam: n, spec, ...leesHoeveel(q, n), leeg: String(q || '').trim() ? 0 : 1, voor: [] }]); },
    afvinken: k => wijzig((s, nu) => { if (s.items[k]) s.items[k].af = nu; }),
    terug: k => wijzig(s => { if (s.items[k]) s.items[k].af = null; }),
    verwijder: k => wijzig(s => { delete s.items[k]; }),
    bewerk: (k, { naam, spec, q, cat }) => wijzig((s, nu) => {
      const it = s.items[k]; if (!it) return;
      const n = B.enkelvoud(naam) || it.naam;
      const nieuw = { ...kopie(it), naam: n, spec: schoon(spec), ...(q === null || q === undefined ? {} : { ...leesHoeveel(q, n), leeg: 0 }) };
      if (cat) { nieuw.cat = cat; s.cats[n] = cat; }
      delete s.items[k];
      const k2 = sleutel(n, spec);
      if (s.items[k2] && !s.items[k2].af) { const doel = s.items[k2]; bij(s.items, nieuw, nu); if (cat) doel.cat = cat; }
      else s.items[k2] = nieuw;
    }),
    alleNamen: () => [...new Set([...Object.values(staat.items).map(it => it.naam), ...Object.keys(staat.cats)])].sort()
  };
  window.Lijstje = api;

  window.dbKlaar.then(d => {
    if (!d) return;
    const { fs, db } = d;
    const ref = fs.doc(db, 'lijstje', 'gedeeld');
    online = fn => fs.runTransaction(db, async tx => {
      const snap = await tx.get(ref);
      const s = { items: (snap.exists() && snap.data().items) || {}, cats: (snap.exists() && snap.data().cats) || {} };
      fn(s);
      tx.set(ref, { items: s.items, cats: s.cats });
    }).then(() => { if (fout) { fout = false; melden(); } })
      .catch(e => { console.warn('Lijstje niet online bewaard', e); fout = true; melden(); });
    let eerste = true;
    fs.onSnapshot(ref, snap => {
      const online_ = { items: (snap.exists() && snap.data().items) || {}, cats: (snap.exists() && snap.data().cats) || {} };
      if (eerste) {
        eerste = false;
        // wat enkel in deze browser stond (bv. zonder verbinding toegevoegd), één keer mee online
        const enkelHier = Object.entries(staat.items).filter(([k]) => !online_.items[k]);
        if (enkelHier.length && snap.exists()) { online(s => enkelHier.forEach(([k, it]) => { if (!s.items[k]) s.items[k] = it; })); }
        else if (!snap.exists() && Object.keys(staat.items).length) { online(s => { Object.assign(s.items, staat.items); Object.assign(s.cats, staat.cats); }); return; }
      }
      staat = online_; bewaarLokaal(); melden();
    }, e => { console.warn('Gedeeld lijstje niet bereikbaar', e); fout = true; melden(); });
  });

  // ---- venster "Op boodschappenlijstje" (receptpagina, weekmenu) ----
  // recepten: [{ titel, regels: [...] }]
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  api.kies = (recepten, klaar) => {
    let dlg = document.getElementById('lijstkeuze');
    if (!dlg) {
      dlg = document.createElement('dialog'); dlg.id = 'lijstkeuze';
      document.body.appendChild(dlg);
    }
    const rijen = [];
    recepten.forEach((r, ri) => r.regels.forEach(regel => {
      const delen = B.lees(regel); if (!delen) return;
      // "peper en zout" wordt 2 producten: toon dan per product de eigen naam i.p.v. 2x de hele regel
      delen.forEach(d => rijen.push({ ri, regel: delen.length > 1 ? (d.n !== null ? B.toon(d.naam, { [d.eenheid]: d.n }) + ' ' : '') + d.naam : regel, d, voorraad: /^(zout|peper)$/.test(d.naam) }));
    }));
    dlg.innerHTML = '<form method="dialog" class="kieskop"><strong>🛒 Op boodschappenlijstje</strong><button class="tag" value="x" aria-label="Sluiten">✕</button></form>'
      + '<p class="uitleg">Vink uit wat je al in huis hebt. Zout en peper staan standaard uit.</p>'
      + '<div class="kiesregels">' + recepten.map((r, ri) => {
        const mijn = rijen.map((x, i) => [x, i]).filter(([x]) => x.ri === ri);
        if (!mijn.length) return '';
        return (recepten.length > 1 ? '<h3>' + esc(r.titel) + '</h3>' : '') + mijn.map(([x, i]) => '<label class="kiesregel' + (x.voorraad ? ' voorraad' : '') + '"><input type="checkbox" data-i="' + i + '"' + (x.voorraad ? '' : ' checked') + '><span>' + esc(x.regel) + '</span></label>').join('');
      }).join('') + '</div>'
      + '<p class="knoppen"><button class="knop" id="lijstok">Toevoegen</button><button class="knop licht" id="lijstalles" type="button">Alles aan/uit</button></p>';
    const ok = dlg.querySelector('#lijstok');
    const tel = () => { const n = dlg.querySelectorAll('.kiesregels input:checked').length; ok.textContent = n ? 'Voeg ' + n + ' toe' : 'Niets aangeduid'; ok.disabled = !n; };
    dlg.querySelector('.kiesregels').addEventListener('change', tel);
    dlg.querySelector('#lijstalles').addEventListener('click', () => { const v = [...dlg.querySelectorAll('.kiesregels input')]; const aan = v.some(c => !c.checked); v.forEach(c => c.checked = aan); tel(); });
    ok.addEventListener('click', e => {
      e.preventDefault();
      const gekozen = [...dlg.querySelectorAll('.kiesregels input:checked')].map(c => rijen[+c.dataset.i]);
      const entries = gekozen.map(x => ({ naam: x.d.naam, spec: '', sommen: x.d.n === null ? {} : { [x.d.eenheid]: x.d.n }, tekst: [], voor: [recepten[x.ri].titel] }));
      api.voegToe(entries); dlg.close();
      if (klaar) klaar(entries.length);
    });
    tel();
    dlg.showModal();
  };
})();
