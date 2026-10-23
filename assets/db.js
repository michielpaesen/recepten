// Gedeelde opslag via Firebase Firestore. window.dbKlaar = Promise met { fs, db } of null als Firebase niet ingesteld is.
(() => {
  const cfg = window.FIREBASE_CONFIG;
  if (!cfg || !cfg.apiKey) { window.dbKlaar = Promise.resolve(null); return; }
  const v = '10.12.2';
  window.dbKlaar = Promise.all([
    import(`https://www.gstatic.com/firebasejs/${v}/firebase-app.js`),
    import(`https://www.gstatic.com/firebasejs/${v}/firebase-firestore.js`)
  ]).then(([app, fs]) => ({ fs, db: fs.getFirestore(app.initializeApp(cfg)) }))
    .catch(e => { console.warn('Firebase niet geladen', e); return null; });
})();
