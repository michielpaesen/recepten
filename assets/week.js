// Weekmenu: één lijst van 7 gerechten (ma–zo) per week, gedeeld via Firebase, anders enkel in deze browser.
// Weken worden bewaard onder de datum van hun maandag, bv. "2026-10-19".
(() => {
  const LS = 'weekmenu';
  let weken = {};
  try { weken = JSON.parse(localStorage.getItem(LS) || '{}'); } catch (e) {}
  const luisteraars = [];
  const melden = () => luisteraars.forEach(f => f(weken));
  const bewaarLokaal = () => { try { localStorage.setItem(LS, JSON.stringify(weken)); } catch (e) {} };
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
    get alle() { return weken; },
    get fout() { return fout; },
    onChange: f => { luisteraars.push(f); f(weken); },
    zet(k, dagen) {
      weken[k] = dagen.slice(0, 7);
      bewaarLokaal(); melden();
      if (online) online.zet(k, weken[k]);
    }
  };

  window.dbKlaar.then(d => {
    if (!d) return;
    const { fs, db } = d;
    const col = fs.collection(db, 'weekmenu');
    online = {
      zet: (k, dagen) => fs.setDoc(fs.doc(col, k), { dagen })
        .then(() => { if (fout) { fout = null; melden(); } })
        .catch(e => { console.warn('Weekmenu niet online bewaard', e); fout = e; melden(); })
    };
    let eerste = true;
    fs.onSnapshot(col, snap => {
      const gedeeld = {};
      snap.forEach(doc => { const v = doc.data().dagen; if (Array.isArray(v)) gedeeld[doc.id] = v; });
      if (eerste) {
        eerste = false;
        // weken die enkel in deze browser stonden, één keer mee naar de gedeelde lijst
        Object.keys(weken).forEach(k => { if (!gedeeld[k] && weken[k].some(Boolean)) { gedeeld[k] = weken[k]; online.zet(k, weken[k]); } });
      }
      weken = gedeeld; bewaarLokaal(); melden();
    }, e => { console.warn('Gedeeld weekmenu niet bereikbaar', e); fout = e; melden(); });
  });
})();
