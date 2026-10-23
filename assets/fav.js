// Favorieten: gedeeld via Firebase als die ingesteld is, anders enkel in deze browser.
(() => {
  const LS = 'favorieten';
  let lokaal = [];
  try { lokaal = JSON.parse(localStorage.getItem(LS) || '[]'); } catch (e) {}
  const lijst = new Set(lokaal);
  const luisteraars = [];
  const melden = () => luisteraars.forEach(f => f());
  const bewaarLokaal = () => { try { localStorage.setItem(LS, JSON.stringify([...lijst])); } catch (e) {} };
  let online = null;

  window.Fav = {
    has: id => lijst.has(id),
    get size() { return lijst.size; },
    onChange: f => { luisteraars.push(f); f(); },
    toggle(id) {
      const aan = !lijst.has(id);
      aan ? lijst.add(id) : lijst.delete(id);
      bewaarLokaal(); melden();
      if (online) online.zet(id, aan);
    }
  };

  window.dbKlaar.then(d => {
    if (!d) return;
    const { fs, db } = d;
    const ref = fs.doc(db, 'favorieten', 'gedeeld');
    online = {
      zet: (id, aan) => fs.setDoc(ref, { lijst: aan ? fs.arrayUnion(id) : fs.arrayRemove(id) }, { merge: true })
        .catch(e => console.warn('Favoriet niet bewaard', e))
    };
    let eerste = true;
    fs.onSnapshot(ref, snap => {
      const gedeeld = (snap.exists() && snap.data().lijst) || [];
      if (eerste) {
        eerste = false;
        // hartjes die enkel in deze browser stonden, één keer mee naar de gedeelde lijst
        const nieuw = lokaal.filter(id => !gedeeld.includes(id));
        if (nieuw.length) fs.setDoc(ref, { lijst: fs.arrayUnion(...nieuw) }, { merge: true });
        try { localStorage.setItem(LS + '-gedeeld', '1'); } catch (e) {}
      }
      lijst.clear(); gedeeld.forEach(id => lijst.add(id));
      bewaarLokaal(); melden();
    }, e => console.warn('Gedeelde favorieten niet bereikbaar', e));
  });
})();
