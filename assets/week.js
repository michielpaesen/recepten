// Weekmenu: per week 7 avondgerechten (dagen) en optioneel 7 middagen (middag), gedeeld via Firebase, anders enkel in deze browser.
// Waarde: recept-URL, "txt:<zelf ingetypt>", null (leeg). Bij middag betekent null "geen middag" en "" "middag toegevoegd, nog leeg".
// Weken worden bewaard onder de datum van hun maandag, bv. "2026-10-19".
(() => {
  const LS = 'weekmenu';
  let weken = {}, middagen = {};
  try { weken = JSON.parse(localStorage.getItem(LS) || '{}'); middagen = JSON.parse(localStorage.getItem(LS + '-middag') || '{}'); } catch (e) {}
  const luisteraars = [];
  const melden = () => luisteraars.forEach(f => f(weken));
  const bewaarLokaal = () => { try { localStorage.setItem(LS, JSON.stringify(weken)); localStorage.setItem(LS + '-middag', JSON.stringify(middagen)); } catch (e) {} };
  let online = null, fout = null;

  const pad = n => String(n).padStart(2, '0');
  const sleutel = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const maandag = d => { const m = new Date(d); m.setHours(12, 0, 0, 0); m.setDate(m.getDate() - (m.getDay() + 6) % 7); return m; };
  const plusDagen = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const datum = k => new Date(k + 'T12:00:00');

  window.Week = {
    sleutel, maandag, plusDagen, datum,
    deze: () => sleutel(maandag(new Date())),
    plus: (k, n) => sleutel(plusDagen(datum(k), 7 * n)),
    dagen: k => (weken[k] || Array(7).fill(null)).slice(),
    middag: k => (middagen[k] || Array(7).fill(null)).slice(),
    get alle() { return weken; },
    get alleMiddag() { return middagen; },
    isTekst: v => typeof v === 'string' && v.startsWith('txt:'),
    tekst: v => v.slice(4),
    get fout() { return fout; },
    onChange: f => { luisteraars.push(f); f(weken); },
    // middag weglaten = de middagen van die week blijven zoals ze zijn
    zet(k, dagen, middag) {
      weken[k] = dagen.slice(0, 7);
      if (middag) middagen[k] = middag.slice(0, 7);
      bewaarLokaal(); melden();
      if (online) online.zet(k, weken[k], middagen[k]);
    }
  };

  window.dbKlaar.then(d => {
    if (!d) return;
    const { fs, db } = d;
    const col = fs.collection(db, 'weekmenu');
    online = {
      zet: (k, dagen, middag) => fs.setDoc(fs.doc(col, k), middag && middag.some(v => v !== null) ? { dagen, middag } : { dagen })
        .then(() => { if (fout) { fout = null; melden(); } })
        .catch(e => { console.warn('Weekmenu niet online bewaard', e); fout = e; melden(); })
    };
    let eerste = true;
    fs.onSnapshot(col, snap => {
      const gedeeld = {}, gedeeldM = {};
      snap.forEach(doc => { const v = doc.data().dagen, m = doc.data().middag; if (Array.isArray(v)) gedeeld[doc.id] = v; if (Array.isArray(m)) gedeeldM[doc.id] = m; });
      if (eerste) {
        eerste = false;
        // weken die enkel in deze browser stonden, één keer mee naar de gedeelde lijst
        Object.keys(weken).forEach(k => { if (!gedeeld[k] && weken[k].some(Boolean)) { gedeeld[k] = weken[k]; if (middagen[k]) gedeeldM[k] = middagen[k]; online.zet(k, weken[k], middagen[k]); } });
      }
      weken = gedeeld; middagen = gedeeldM; bewaarLokaal(); melden();
    }, e => { console.warn('Gedeeld weekmenu niet bereikbaar', e); fout = e; melden(); });
  });
})();
