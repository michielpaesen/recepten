// Gedeelde lijsten van recept-URL's (favorieten, verwijderde recepten): via Firebase als die ingesteld is, anders enkel in deze browser.
(() => {
  function maakLijst(LS, collectie) {
    let lokaal = [];
    try { lokaal = JSON.parse(localStorage.getItem(LS) || '[]'); } catch (e) {}
    const lijst = new Set(lokaal);
    const luisteraars = [];
    const melden = () => luisteraars.forEach(f => f());
    const bewaarLokaal = () => { try { localStorage.setItem(LS, JSON.stringify([...lijst])); } catch (e) {} };
    let online = null;

    window.dbKlaar.then(d => {
      if (!d) return;
      const { fs, db } = d;
      const ref = fs.doc(db, collectie, 'gedeeld');
      online = {
        zet: (id, aan) => fs.setDoc(ref, { lijst: aan ? fs.arrayUnion(id) : fs.arrayRemove(id) }, { merge: true })
          .catch(e => console.warn('Niet online bewaard: ' + LS, e))
      };
      let eerste = true;
      fs.onSnapshot(ref, snap => {
        const gedeeld = (snap.exists() && snap.data().lijst) || [];
        if (eerste) {
          eerste = false;
          // wat enkel in deze browser stond, één keer mee naar de gedeelde lijst
          const nieuw = lokaal.filter(id => !gedeeld.includes(id));
          if (nieuw.length) { fs.setDoc(ref, { lijst: fs.arrayUnion(...nieuw) }, { merge: true }).catch(e => console.warn(e)); return; }
        }
        lijst.clear(); gedeeld.forEach(id => lijst.add(id));
        bewaarLokaal(); melden();
      }, e => console.warn('Gedeelde lijst niet bereikbaar: ' + LS, e));
    });

    return {
      has: id => lijst.has(id),
      get size() { return lijst.size; },
      get alle() { return [...lijst]; },
      onChange: f => { luisteraars.push(f); f(); },
      toggle(id, aan = !lijst.has(id)) {
        aan ? lijst.add(id) : lijst.delete(id);
        bewaarLokaal(); melden();
        return online ? online.zet(id, aan) : Promise.resolve();
      }
    };
  }
  window.Fav = maakLijst('favorieten', 'favorieten');
  window.Weg = maakLijst('verborgen', 'verborgen');
})();
