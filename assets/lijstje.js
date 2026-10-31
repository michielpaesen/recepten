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
  const hoeveel = it => [B.toon(it.naam, it.sommen || {}), ...(it.tekst || [])].filter(Boolean).join(' + ');
  const catVan = (naam, it) => (it && it.cat) || staat.cats[naam] || B.categorie(naam);

  // één item (nieuw of bijtellen) in een items-object zetten
  function bij(items, e, nu) {
    const k = sleutel(e.naam, e.spec);
    const oud = items[k];
    if (!oud || oud.af) {
      items[k] = { naam: e.naam, spec: schoon(e.spec), sommen: { ...(e.sommen || {}) }, tekst: [...(e.tekst || [])], voor: [...(e.voor || [])], af: null, t: nu };
      if (oud && oud.cat) items[k].cat = oud.cat;
      return;
    }
    for (const [u, n] of Object.entries(e.sommen || {})) oud.sommen[u] = (oud.sommen[u] || 0) + n;
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

  // icoon per product (eerste treffer telt), anders per categorie
  const ICONEN = [
    [/chili|jalape|spaanse peper/, '🌶️'], [/zout|peper$|kaneel|paprikapoeder|komijn|garam|curry|oregano|nootmuskaat|bouillon/, '🧂'], [/paprika/, '🫑'], [/aubergine/, '🍆'], [/^(rode |witte |sjalot|lente)?ui(en)?$|sjalot|lente-?ui/, '🧅'], [/knoflook/, '🧄'],
    [/avocado/, '🥑'], [/citroen|limoen/, '🍋'], [/tomaat|tomaten(?!blokjes|saus|puree)/, '🍅'], [/aardappel|krieltje/, '🥔'], [/wortel/, '🥕'],
    [/komkommer|courgette/, '🥒'], [/broccoli/, '🥦'], [/sla$|spinazie|rucola|kool|andijvie|prei|selder|bladgroen/, '🥬'], [/mais|maïs/, '🌽'],
    [/champignon|paddenstoel/, '🍄'], [/appel/, '🍎'], [/peer/, '🍐'], [/banaan/, '🍌'], [/aardbei/, '🍓'], [/framboos|bes(sen)?$|bosbes/, '🫐'], [/druif/, '🍇'],
    [/sinaasappel|mandarijn/, '🍊'], [/ananas/, '🍍'], [/mango/, '🥭'], [/kokos/, '🥥'], [/gember|kurkuma/, '🫚'], [/koriander|peterselie|basilicum|munt|bieslook|dille|tijm|rozemarijn|kruiden/, '🌿'],
    [/kip|kalkoen/, '🍗'], [/spek|bacon|ham$|pancetta|chorizo|salami/, '🥓'], [/gehakt|rund|steak|biefstuk|varken|lam|worst|vlees/, '🥩'], [/zalm|vis|kabeljauw|tonijn|scampi|garnaal|mosselen/, '🐟'],
    [/ei(eren)?$/, '🥚'], [/boter/, '🧈'], [/kaas|feta|mozzarella|parmezaan|ricotta|mascarpone/, '🧀'], [/melk|room|yoghurt|kwark|skyr/, '🥛'],
    [/naan|pita|wrap|tortilla/, '🫓'], [/brood|stokbrood|baguette|toast/, '🍞'], [/croissant/, '🥐'], [/deeg/, '🥧'],
    [/pasta|spaghetti|penne|linguine|tagliatelle|orzo|macaroni|lasagne|noedel|tortellini|gnocchi/, '🍝'], [/rijst|risotto|couscous|bulgur|quinoa/, '🍚'],
    [/pesto|saus|passata|tomatenblokjes|tapenade|puree/, '🫙'], [/kikkererwt|linzen|bonen/, '🫘'], [/noot|noten|cashew|amandel|pinda|walnoot/, '🥜'],
    [/olie|azijn/, '🫒'], [/suiker|honing|siroop/, '🍯'], [/bloem|meel/, '🌾'], [/chocolade|choco/, '🍫'],
    [/koffie/, '☕'], [/thee/, '🍵'], [/sap|limonade/, '🧃'], [/water|frisdrank|cola/, '🥤'], [/wijn/, '🍷'], [/bier/, '🍺'], [/chips|snack/, '🍿'], [/koek|cake|taart/, '🍪'], [/ijs$|roomijs/, '🍦'],
    [/wc-papier|toiletpapier|keukenrol|tissue/, '🧻'], [/zeep|shampoo|tandpasta|douche/, '🧴'], [/afwas|spons|schoonmaak|vaatwas|wasmiddel/, '🧽']
  ];
  const CAT_ICOON = { 'Groenten & fruit': '🥬', 'Vlees & vis': '🥩', 'Zuivel, kaas & eieren': '🧀', 'Brood & deeg': '🍞', 'Pasta, rijst & granen': '🍝', 'Diepvries': '🧊', 'Dranken': '🥤', 'Snacks & zoet': '🍫', 'Voorraadkast & kruiden': '🧂', 'Huishouden & verzorging': '🧽', 'Overige': '🛒' };
  const icoon = (naam, cat) => (ICONEN.find(([re]) => re.test(naam)) || [0, CAT_ICOON[cat] || '🛒'])[1];

  const api = {
    icoon,
    get items() { return staat.items; },
    get fout() { return fout; },
    onChange: f => { luisteraars.push(f); f(); },
    naamVan, sleutel, hoeveel, catVan, leesHoeveel,
    open: () => Object.entries(staat.items).filter(([, it]) => !it.af),
    recent: () => Object.entries(staat.items).filter(([, it]) => it.af).sort((a, b) => b[1].af - a[1].af),
    // entries: [{ naam, spec, sommen, tekst, voor }]
    voegToe: entries => wijzig((s, nu) => entries.forEach(e => bij(s.items, e, nu))),
    voegToeTekst: (naam, spec, q) => { const n = schoon(naam); if (!n) return Promise.resolve(); return api.voegToe([{ naam: n, spec, ...leesHoeveel(q, n), voor: [] }]); },
    afvinken: k => wijzig((s, nu) => { if (s.items[k]) s.items[k].af = nu; }),
    terug: k => wijzig(s => { if (s.items[k]) s.items[k].af = null; }),
    verwijder: k => wijzig(s => { delete s.items[k]; }),
    bewerk: (k, { naam, spec, q, cat }) => wijzig((s, nu) => {
      const it = s.items[k]; if (!it) return;
      const n = schoon(naam) || it.naam;
      const nieuw = { ...kopie(it), naam: n, spec: schoon(spec), ...(q === null || q === undefined ? {} : leesHoeveel(q, n)) };
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
