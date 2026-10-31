// Boodschappenlijst: ingrediëntregels uitlezen, gelijke ingrediënten samenvoegen en omrekenen.
(() => {
  // ---- eenheden: [soort, factor naar basis] ----
  const EENHEID = {
    g: ['g', 1], gr: ['g', 1], gram: ['g', 1], grams: ['g', 1], kg: ['g', 1000], kilo: ['g', 1000],
    ml: ['ml', 1], cl: ['ml', 10], dl: ['ml', 100], l: ['ml', 1000], liter: ['ml', 1000],
    el: ['ml', 15], eetlepel: ['ml', 15], eetlepels: ['ml', 15], tbsp: ['ml', 15], soeplepel: ['ml', 15], soeplepels: ['ml', 15],
    tl: ['ml', 5], theelepel: ['ml', 5], theelepels: ['ml', 5], tsp: ['ml', 5], kl: ['ml', 5], koffielepel: ['ml', 5], koffielepels: ['ml', 5],
    kopje: ['ml', 240], kopjes: ['ml', 240], cup: ['ml', 240], cups: ['ml', 240], glas: ['ml', 200], glazen: ['ml', 200],
    teen: ['teen', 1], teentje: ['teen', 1], teentjes: ['teen', 1], tenen: ['teen', 1], knoflookteen: ['teen', 1], knoflookteentje: ['teen', 1], knoflookteentjes: ['teen', 1], knoflooktenen: ['teen', 1], lookteen: ['teen', 1], lookteentje: ['teen', 1], lookteentjes: ['teen', 1], looktenen: ['teen', 1],
    blik: ['blik', 1], blikje: ['blik', 1], blikken: ['blik', 1], blikjes: ['blik', 1],
    pot: ['pot', 1], potje: ['pot', 1], potten: ['pot', 1], potjes: ['pot', 1],
    pak: ['pak', 1], pakje: ['pak', 1], pakken: ['pak', 1], pakjes: ['pak', 1], doos: ['pak', 1], doosje: ['pak', 1],
    zak: ['zak', 1], zakje: ['zak', 1], zakken: ['zak', 1], zakjes: ['zak', 1],
    bos: ['bos', 1], brik: ['pak', 1], brikje: ['pak', 1], bakje: ['pak', 1], bakjes: ['pak', 1], rol: ['pak', 1], blokje: ['stuk', 1], blokjes: ['stuk', 1], krop: ['stuk', 1], kroppen: ['stuk', 1], kropje: ['stuk', 1], stronk: ['stuk', 1], stronkjes: ['stuk', 1], plantje: ['stuk', 1], head: ['stuk', 1], hand: ['handje', 1], klontje: ['vaag', 0], beetje: ['vaag', 0], bosje: ['bos', 1], bosjes: ['bos', 1],
    stuk: ['stuk', 1], stuks: ['stuk', 1], stuk: ['stuk', 1], stukje: ['stuk', 1], stukjes: ['stuk', 1],
    bol: ['bol', 1], bollen: ['bol', 1], bolletje: ['bol', 1],
    cm: ['cm', 1],
    plak: ['plak', 1], plakje: ['plak', 1], plakjes: ['plak', 1], plakken: ['plak', 1],
    takje: ['takje', 1], takjes: ['takje', 1], stengel: ['stengel', 1], stengels: ['stengel', 1], blaadjes: ['blaadje', 1], blaadje: ['blaadje', 1],
    snuf: ['vaag', 0], snufje: ['vaag', 0], snufjes: ['vaag', 0], mespunt: ['vaag', 0], mespuntje: ['vaag', 0], scheut: ['vaag', 0], scheutje: ['vaag', 0], scheutjes: ['vaag', 0],
    handje: ['handje', 1], handjes: ['handje', 1], handvol: ['handje', 1], handjevol: ['handje', 1]
  };

  // ---- namen ----
  const WEG_WOORDEN = new Set(('verse vers versgeraspte versgemalen vers gemalen geraspte geraspt grote groot kleine klein middelgrote middelgroot rijpe rijp biologische biologisch ' +
    'zoutarme zoutarm ongezouten gezouten fijngehakte fijngesneden gesneden gehakte grof grove fijne fijn koude warme lauwwarme gesmolten zachte ' +
    'extra vierge zwarte gedroogde gedroogd halve hele ca. ongeveer bevroren diepvries diepvriesverse gekookte gekookt uitgelekte gemengde heel ' +
    'plantaardige plantaardig geroosterde geroosterd ontpitte gepelde gepeld').split(' '));
  const ENKELVOUD = {
    tomaten: 'tomaat', uien: 'ui', uitjes: 'ui', uitje: 'ui', sjalotje: 'sjalot', tomaatje: 'tomaat', eieren: 'ei', wortelen: 'wortel', wortels: 'wortel', worteltjes: 'wortel', courgettes: 'courgette',
    citroenen: 'citroen', limoenen: 'limoen', sjalotten: 'sjalot', sjalotjes: 'sjalot', paprikas: 'paprika', avocados: 'avocado',
    aubergines: 'aubergine', aardappelen: 'aardappel', aardappels: 'aardappel', kipfilets: 'kipfilet', kippendijen: 'kippendij', appels: 'appel',
    komkommers: 'komkommer', preien: 'prei', mangos: 'mango', bananen: 'banaan', peren: 'peer', puntpaprikas: 'puntpaprika',
    'lente-uitjes': 'lente-ui', lenteuitjes: 'lente-ui', 'lente-uien': 'lente-ui', bosuitjes: 'lente-ui', chilipepers: 'rode peper', pepers: 'peper',
    kerstomaatjes: 'kerstomaten', cherrytomaten: 'kerstomaten', cherrytomaatjes: 'kerstomaten', snoeptomaten: 'kerstomaten', snoeptomaatjes: 'kerstomaten',
    wraps: 'wrap', tortillas: 'wrap', tortillawraps: 'wrap', naanbroden: 'naan', pitas: 'pita', pitabroodjes: 'pita', hamburgerbroodjes: 'hamburgerbroodje',
    zoeteaardappelen: 'zoete aardappel', 'zoete aardappelen': 'zoete aardappel', 'gebakken ui': 'gebakken uitjes', 'geplette tomaat': 'tomatenblokjes', 'gepelde tomaat': 'tomatenblokjes', 'tomaat in blokjes': 'tomatenblokjes', 'gehakte tomaat': 'tomatenblokjes', 'zoete aardappels': 'zoete aardappel', kippendijfilets: 'kippendijfilet',
    lasagnevellen: 'lasagnevellen', limoen: 'limoen', bieten: 'biet', radijsjes: 'radijs', champignon: 'champignons'
  };
  const SYNONIEM = {
    'olijfolie extra': 'olijfolie', 'olijfolie': 'olijfolie', 'olie': 'olie', 'peper': 'peper', 'zeezout': 'zout', 'grof zout': 'zout', 'fleur de sel': 'zout',
    'look': 'knoflook', 'knoflook': 'knoflook', 'parmezaanse kaas': 'parmezaan', 'parmigiano reggiano': 'parmezaan', 'parmigiano reggiano dop': 'parmezaan', 'parmigiano': 'parmezaan', 'parmesan': 'parmezaan', 'grana padano': 'parmezaan',
    'peterselie': 'peterselie', 'bladpeterselie': 'peterselie', 'platte peterselie': 'peterselie', 'krulpeterselie': 'peterselie',
    'roomboter': 'boter', 'boter': 'boter', 'kookroom': 'room', 'culinaire room': 'room', 'room': 'room', 'room om te koken': 'room', 'slagroom': 'slagroom', 'vloeibare room': 'room',
    'kerstomaten': 'kerstomaten', 'rode kerstomaten': 'kerstomaten', 'komijnpoeder': 'komijn', 'gemalen komijn': 'komijn', 'komijnzaad': 'komijn',
    'basilicumblaadjes': 'basilicum', 'korianderblaadjes': 'koriander', 'groentebouillonblokje': 'groentebouillon', 'groentebouillonblokjes': 'groentebouillon', 'bouillonblokje': 'groentebouillon',
    'kippenbouillonblokje': 'kippenbouillon', 'kippenbouillonblokjes': 'kippenbouillon', 'runderbouillonblokje': 'runderbouillon', 'bouillon': 'groentebouillon',
    'griekse yoghurt': 'griekse yoghurt', 'volle yoghurt': 'yoghurt', 'mozzarella': 'mozzarella', 'mozzarellabol': 'mozzarella', 'bol mozzarella': 'mozzarella', 'burrata': 'burrata',
    'kipfilethaasjes': 'kipfilet', 'kippenfilet': 'kipfilet', 'kipfilet': 'kipfilet', 'kippenborst': 'kipfilet', 'kipblokjes': 'kipfilet', 'kipreepjes': 'kipfilet', 'kippenreepjes': 'kipfilet',
    'gele ui': 'ui', 'witte ui': 'ui', 'ajuin': 'ui', 'sjalot': 'sjalot', 'rode ui': 'rode ui', 'lente-ui': 'lente-ui', 'bosui': 'lente-ui',
    'rode paprika': 'paprika', 'gele paprika': 'paprika', 'groene paprika': 'paprika', 'oranje paprika': 'paprika', 'gekleurde paprika': 'paprika', 'rode puntpaprika': 'puntpaprika',
    'panko': 'panko', 'panko paneermeel': 'panko', 'tomatenblokjes': 'tomatenblokjes', 'gepelde tomaten': 'tomatenblokjes', 'tomaten in blokjes': 'tomatenblokjes', 'gehakte tomaten': 'tomatenblokjes',
    'rode peper': 'rode peper', 'chilipeper': 'rode peper', 'rode chilipeper': 'rode peper', 'gember': 'gember', 'gemberwortel': 'gember',
    'crème fraîche': 'crème fraîche', 'creme fraiche': 'crème fraîche', 'mayonaise': 'mayonaise', 'mayo': 'mayonaise',
    'water': 'water', 'kraantjeswater': 'water', 'heet water': 'water', 'kokend water': 'water', 'spinazie': 'spinazie', 'babyspinazie': 'spinazie', 'jonge spinazie': 'spinazie',
    'kristalsuiker': 'suiker', 'maïzena': 'maizena', 'dijon-mosterd': 'dijonmosterd', 'balsamico-azijn': 'balsamicoazijn', 'tomaatjes': 'kerstomaten', 'trostomaten': 'tomaat', 'pruimtomaat': 'tomaat', 'mini-romatomaten': 'kerstomaten', 'bosuien': 'lente-ui', 'naanbrood': 'naan', 'naan plain': 'naan', 'witte tortilla': 'wrap', 'bruine tortilla': 'wrap', 'tortilla': 'wrap', 'maïs in blik': 'maïs', 'mais': 'maïs', 'broccoliroosjes': 'broccoli', 'bloemkoolroosjes': 'bloemkool', 'achterham': 'ham', 'witte rijst': 'rijst', 'tomatenpassata': 'passata', 'tomatenpulp': 'passata', 'bladspinazie': 'spinazie', 'groene asperges': 'groene asperge', 'mini-komkommer': 'minikomkommer', 'minikomkommers': 'minikomkommer', 'mini-komkommers': 'minikomkommer', 'handjevol peterselie': 'peterselie', 'perzik': 'perzik', perziken: 'perzik', 'lange rode peper': 'rode peper', 'lange rode peper': 'rode peper', 'limoensap': 'limoen', 'citroensap': 'citroen', 'pesto genovese': 'pesto', 'groene pesto': 'pesto', 'basilicumpesto': 'pesto', 'vloeibare honing': 'honing', 'magere griekse yoghurt': 'griekse yoghurt', 'rood pepertje': 'rode peper', 'pepertje': 'rode peper', 'buffelmozzarella': 'mozzarella', 'bolletjes burrata': 'burrata', 'kippenbouillonpoeder': 'kippenbouillon', 'kippendijreepjes': 'kippendijfilet', 'kippendij': 'kippendijfilet', 'kipstukjes': 'kipfilet', 'vanille extract': 'vanille-extract', 'belegen cheddar': 'cheddar', 'witte langgraanrijst': 'rijst', 'langgraanrijst': 'rijst', 'kippenkruiden': 'kipkruiden', 'tijmblaadjes': 'tijm', 'oreganoblaadjes': 'oregano', 'lichte room': 'room', 'champignon': 'champignons', 'kastanjechampignons': 'champignons', 'witte suiker': 'suiker', 'fijne suiker': 'suiker', 'basterdsuiker': 'bruine suiker', 'bruine basterdsuiker': 'bruine suiker', 'lichtbruine suiker': 'bruine suiker',
    'rundergehakt': 'rundergehakt', 'gemengd gehakt': 'gehakt', 'gehakt': 'gehakt', 'half-om-half gehakt': 'gehakt', 'varkens- en rundsgehakt': 'gehakt',
    'citroensap': 'citroen', 'limoensap': 'limoen', 'citroenrasp': 'citroen', 'limoenrasp': 'limoen', 'citroenzeste': 'citroen',
    'wittewijnazijn': 'witte wijnazijn', 'witte wijnazijn': 'witte wijnazijn', 'rodewijnazijn': 'rode wijnazijn', 'rode wijnazijn': 'rode wijnazijn',
    'balsamicoazijn': 'balsamicoazijn', 'balsamico': 'balsamicoazijn', 'witte balsamicoazijn': 'witte balsamicoazijn',
    'sojasaus': 'sojasaus', 'ketjap': 'ketjap manis', 'ketjap manis': 'ketjap manis', 'tijm': 'tijm', 'oregano': 'oregano', 'basilicum': 'basilicum', 'munt': 'munt', 'bieslook': 'bieslook',
    'cheddar': 'cheddar', 'belegen kaas': 'geraspte kaas', 'kaas': 'geraspte kaas', 'gemalen kaas': 'geraspte kaas', 'italiaanse kaas': 'geraspte kaas', 'emmentaler': 'geraspte kaas', 'gruyère': 'geraspte kaas',
    'witte kaas': 'feta', 'fetakaas': 'feta', 'feta': 'feta', 'krieltjes': 'krieltjes', 'kriel': 'krieltjes', 'nootmuskaat': 'nootmuskaat', 'melk': 'melk', 'volle melk': 'melk', 'halfvolle melk': 'melk',
    'kokosmelk': 'kokosmelk', 'paprikapoeder': 'paprikapoeder', 'gerookt paprikapoeder': 'gerookt paprikapoeder', 'gerookte paprikapoeder': 'gerookt paprikapoeder',
    'eidooier': 'ei', 'eidooiers': 'ei', 'eigeel': 'ei', 'eiwit': 'ei', 'eiwitten': 'ei', 'spekblokjes': 'spekblokjes', 'spekjes': 'spekblokjes', 'spekreepjes': 'spekblokjes', 'gerookte spekblokjes': 'spekblokjes'
  };
  // gewicht van één stuk (g), om stuks en grammen op te tellen
  const STUK_G = {
    minikomkommer: 100, perzik: 150, sinaasappel: 200, tomaat: 120, ui: 150, 'rode ui': 150, sjalot: 30, paprika: 160, puntpaprika: 120, courgette: 300, wortel: 100, aardappel: 150, 'zoete aardappel': 300,
    komkommer: 350, aubergine: 300, avocado: 170, citroen: 120, limoen: 70, appel: 180, peer: 180, banaan: 120, prei: 250, mango: 300, venkel: 250,
    broccoli: 400, bloemkool: 700, 'rode peper': 15, 'lente-ui': 15, kipfilet: 150, kippendijfilet: 100, kippendij: 120, ei: 55, champignons: 20,
    mozzarella: 125, burrata: 125, feta: 200, halloumi: 225, knoflook: 5, 'rode kool': 1000, spitskool: 600, ijsbergsla: 400, 'romaine sla': 300, paksoi: 250,
    wrap: 60, naan: 120, pita: 70, hamburgerbroodje: 70, biet: 150, radijs: 10, gember: 30, kerstomaten: 15, krieltjes: 30, selder: 40, 'groene asperge': 20
  };
  // inhoud van één blik / pak / pot / zak / bol / bos, als die afwijkt van de algemene waarde
  const VERPAKKING = {
    blik: { _: 400, kokosmelk: 400, mais: 285, 'maïs': 285, kikkererwten: 400, tomatenpuree: 70, tonijn: 160, 'zwarte bonen': 400, 'kidneybonen': 400, 'witte bonen': 400, linzen: 400 },
    pot: { _: 200, pesto: 190, 'rode pesto': 190, 'groene pesto': 190, passata: 700, tomatenpuree: 140 },
    pak: { _: 500, kerstomaten: 250, champignons: 250, pindakaas: 350, pizzadeeg: 400, passata: 500, room: 200, kookroom: 200, slagroom: 200, kokosmelk: 400, bladerdeeg: 275, feta: 200, roomkaas: 150 },
    zak: { _: 150, spinazie: 300, rucola: 75, veldsla: 100, 'geraspte kaas': 150, 'geraspte mozzarella': 150, mozzarella: 125, gnocchi: 500 },
    bol: { _: 125, mozzarella: 125, burrata: 125, knoflook: 50 },
    bos: { _: 25, 'lente-ui': 120, radijs: 200, wortel: 500 },
    teen: { _: 5 }, cm: { _: 5 }, plak: { _: 20 }, takje: { _: 2 }, stengel: { _: 40 }, handje: { _: 25 }, blaadje: { _: 1 }
  };
  // ml sap per stuk
  const SAP_ML = { citroen: 40, limoen: 25, sinaasappel: 80 };
  // gram per ml voor droge dingen die in lepels gemeten worden
  const DICHTHEID = { bloem: 0.6, suiker: 0.85, 'bruine suiker': 0.8, poedersuiker: 0.55, boter: 0.95, havermout: 0.4, rijst: 0.85, couscous: 0.7, paneermeel: 0.45, panko: 0.3, parmezaan: 0.4, 'geraspte kaas': 0.4, honing: 1.4, cacaopoeder: 0.45, maizena: 0.6, bakpoeder: 0.9, kokosrasp: 0.35 };

  const CATEGORIE = [
    ['Voorraadkast & kruiden', /^(zout|peper|olie|olijfolie|zonnebloemolie|sesamolie|kokosolie|arachideolie|frituurolie|.*azijn|.*poeder|komijn|kaneel|kurkuma|nootmuskaat|oregano|tijm|rozemarijn|.*kruiden.*|.*kruidenmix|ras el hanout|chilivlokken|cayennepeper|laurier.*|suiker|bruine suiker|poedersuiker|bloem|maizena|bakpoeder|bakingsoda|zuiveringszout|vanille.*|sojasaus|ketjap manis|vissaus|oestersaus|worcestersaus|tabasco|sriracha|.*bouillon|mosterd|dijonmosterd|honing|ketchup|mayonaise|tomatenpuree|sesamzaad|paneermeel|panko|water|gochujang|harissa|sambal.*|teriyakisaus|.*chilisaus|.*saus|ahornsiroop|siroop.*|gist)$/],
    ['Voorraadkast & kruiden', /^(pindakaas|kokosmelk|kokosroom)$/],
    ['Pasta, rijst & granen', /^(pesto|rode pesto|groene pesto|tapenade|passata|tomatenblokjes|tomatensaus|pastasaus|kikkererwten|linzen)$/],
    ['Groenten & fruit', /(perzik|citroengras|edamame|sugarsnaps|peultjes|olijven|tomaat|tomaten|ui$|sjalot|knoflook|paprika$|courgette|wortel|aardappel|krieltjes|komkommer|aubergine|avocado|citroen|limoen|appel|peer|banaan|prei|mango|venkel|broccoli|bloemkool|peper$|gember|spinazie|sla$|rucola|veldsla|kool|paksoi|champignons|biet|radijs|selder|asperge|bonen$|erwten|mais|maïs|peterselie|basilicum|koriander|munt|bieslook|dille|lente-ui|fruit|bessen|aardbeien|frambozen|blauwe bessen|druiven|ananas|granaatappel|sperzie|pompoen|zoete aardappel|rode biet|groente)/],
    ['Vlees & vis', /(kip|gehakt|spek|ham$|worst|chorizo|salami|rund|biefstuk|steak|varken|kalkoen|\blams?(vlees|kotelet)?\b|zalm|tonijn|garnalen|vis|kabeljauw|pancetta|prosciutto|serrano|bacon|shoarma|gyros|scampi|mosselen|vlees|filet)/],
    ['Zuivel, kaas & eieren', /(^ei$|kaas|parmezaan|mozzarella|burrata|feta|halloumi|ricotta|mascarpone|cheddar|room|yoghurt|melk|boter|crème fraîche|kwark|skyr|zure room|platte kaas)/],
    ['Pasta, rijst & granen', /(pasta|spaghetti|penne|rigatoni|farfalle|fusilli|linguine|tagliatelle|fettuc|macaroni|orzo|lasagne|tortellini|ravioli|gnocchi|noedels|noodles|mie|rijst|couscous|bulgur|quinoa|ebly|havermout|conchiglie|cannelloni)/],
    ['Brood & deeg', /(brood|wrap|naan|pita|tortilla|bladerdeeg|deeg|ciabatta|baguette|focaccia|pizza|pistolet|croissant|beschuit|toast)/],
    ['Diepvries', /(diepvries|^ijs$|ijsjes|roomijs|frieten|kroketten|vissticks)/],
    ['Dranken', /(^cola|frisdrank|^bier|^wijn|^sap$|appelsap|sinaasappelsap|fruitsap|spuitwater|plat water|bruiswater|^koffie|^thee|limonade|siroop)/],
    ['Snacks & zoet', /(chocolade|choco|chips|koek|snoep|nootjes|noten|cake|wafel|speculoos|confituur|jam)/],
    ['Huishouden & verzorging', /(wc-papier|toiletpapier|keukenrol|afwas|vaatwas|wasmiddel|wasverzachter|tandpasta|tandenborstel|shampoo|douchegel|zeep|deo|vuilniszak|vuilniszakken|aluminiumfolie|bakpapier|huishoudfolie|batterij|scheermes|maandverband|tampons|luiers|sponsje|schoonmaak|allesreiniger|handzeep)/]
  ];
  const categorie = n => (CATEGORIE.find(([, re]) => re.test(n)) || ['Overige'])[0];
  const VOLGORDE = ['Groenten & fruit', 'Vlees & vis', 'Zuivel, kaas & eieren', 'Brood & deeg', 'Pasta, rijst & granen', 'Diepvries', 'Dranken', 'Snacks & zoet', 'Voorraadkast & kruiden', 'Huishouden & verzorging', 'Overige'];

  // ---- één regel uitlezen ----
  const BREUK = { '½': '.5', '¼': '.25', '¾': '.75', '⅓': '.33', '⅔': '.67' };
  function getal(s) {
    s = s.replace(',', '.');
    let m = s.match(/^(\d+)\s+(\d+)\/(\d+)$/); if (m) return +m[1] + m[2] / m[3];
    m = s.match(/^(\d+)\/(\d+)$/); if (m) return m[1] / m[2];
    return parseFloat(s);
  }
  function naamVan(s) {
    s = s.toLowerCase().replace(/[’']/g, '').replace(/\s+/g, ' ').trim();
    s = s.replace(/^(van |de |het |een )+/, '');
    s = s.replace(/^in (blokjes|reepjes|plakjes|ringen|stukjes) /, '');
    s = s.split(/,| of | van | voor | naar | om | als | \+ | met (?!kip|spek|kaas)|\/|;/)[0].trim();
    let w = s.split(' ').filter(x => x && !WEG_WOORDEN.has(x));
    let n = w.join(' ');
    if (SYNONIEM[n]) return SYNONIEM[n];
    w = w.map(x => ENKELVOUD[x] || x); n = w.join(' ');
    if (ENKELVOUD[n]) n = ENKELVOUD[n];
    if (SYNONIEM[n]) return SYNONIEM[n];
    // "tros tomaten" → tomaat, maar "zongedroogde tomaten" blijft apart
    if (w.length === 2 && STUK_G[w[1]] && /^(tros|trostomaten|gele|witte|groene|oranje|gekleurde|grote|kleine|stevige|bloemige|vastkokende|kruimige|kleurige)$/.test(w[0])) return w[1];
    return n;
  }

  // enkel meervoud → enkelvoud, zonder synoniemen (voor zelf getypte namen)
  function enkelvoud(s) {
    const w = String(s || '').toLowerCase().replace(/[’']/g, '').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean).map(x => ENKELVOUD[x] || x);
    const n = w.join(' ');
    return ENKELVOUD[n] || n;
  }

  function lees(regel) {
    let s = ' ' + regel.replace(/\*\*/g, '').replace(/[½¼¾⅓⅔]/g, c => BREUK[c]).replace(/(\d)\.(\d)/g, '$1.$2').toLowerCase() + ' ';
    s = s.replace(/(\d) \.(\d)/g, '$1$2').replace(/ \.(\d)/g, ' 0.$1');
    if (/[:?]\s*$/.test(regel)) return null; // tussentitel of reclame
    // "(400 g)" of "(ca. 300 g)" na een verpakking
    let inhoud = null;
    const ph = s.match(/\((?:ca\.? |ongeveer |± )?(\d+[.,]?\d*)\s*(g|gr|gram|ml|kg|l|cl)\b[^)]*\)/);
    if (ph) inhoud = getal(ph[1]) * EENHEID[ph[2]][1];
    s = s.replace(/\(.*?\)/g, ' ').replace(/\s+/g, ' ');
    // "sap van 1 citroen", "rasp van een halve citroen"
    s = s.replace(/^ (sap|rasp|zeste|schil|het sap|de rasp) (en (sap|rasp) )?van (een |(\d+(?:\.\d+)?) )?(halve )?/, (m, a, b, c, een, getal, half) => ' ' + (half ? '0.5 ' : getal ? getal + ' ' : '1 '));
    s = s.replace(/^ (optioneel|eventueel|hoeveelheid|extra)\s*:?\s*/, ' ');
    s = s.replace(/^ (ca\.?|circa|ongeveer|±|\+\/-|max\.?|minstens) /, ' ');
    s = s.replace(/^ (een |1 )?halve /, ' 0.5 ').replace(/^ een /, ' 1 ').replace(/^ twee /, ' 2 ').replace(/^ drie /, ' 3 ').replace(/^ vier /, ' 4 ');
    let n = null, eenheid = 'stuk';
    const m = s.match(/^ (\d+ \d+\/\d+|\d+\/\d+|\d+(?:[.,]\d+)?)(?:de)?(?:\s*(?:-|à|a|tot|of|–)\s*(\d+(?:[.,]\d+)?))?\s*/);
    if (m) { n = getal(m[2] || m[1]); s = s.slice(m[0].length); }
    const keer = s.match(/^(?:x|×|keer)\s*(\d+(?:[.,]\d+)?)\s*/); // "2 x 180 g"
    if (keer && n !== null) { n *= getal(keer[1]); s = s.slice(keer[0].length); }
    s = s.trim() + ' ';
    while (true) { const w = s.match(/^([a-zë.]+) /); if (w && WEG_WOORDEN.has(w[1]) && !/^(gedroogde|gerookte)$/.test(w[1])) s = s.slice(w[0].length); else break; }
    // eenheid (ook "200g")
    const e = s.match(/^([a-zë]+)\.?\s+/);
    if (e && EENHEID[e[1]]) {
      const [soort, f] = EENHEID[e[1]];
      s = s.slice(e[0].length);
      if (/^(knof)?look/.test(e[1])) s = 'knoflook ' + s;
      if (soort === 'vaag') n = null; else { eenheid = soort; if (n === null) n = 1; n *= f; }
    } else if (n === null && /^(snuf|snufje|scheut|scheutje|beetje|wat|handje|klein beetje|naar smaak)\b/.test(s)) {
      s = s.replace(/^(snufje|snuf|scheutje|scheut|beetje|wat|klein beetje)\s+/, '');
    }
    s = s.replace(/^(stuk|stuks)\s+/, '').replace(/^(van |de |het )+/, '');
    if (/^(teentjes?|tenen) /.test(s)) { s = s.replace(/^(teentjes?|tenen) /, ''); eenheid = 'teen'; }
    let naam = naamVan(s);
    if (/^knoflook/.test(naam) && eenheid === 'stuk') eenheid = 'teen';
    if (!naam || /keukenmachine|blender|bakpapier|ovenschaal|^aluminium|prikkers|spiesjes|^ijsblokjes|mengkom|grillpan|bakrand|bakvorm|springvorm|^kookvocht/.test(naam)) return null;
    const uit = [];
    // "zout en peper", "peper en zout"
    if (/^(zout|peper|zeezout|zwarte peper)( en | & )(zout|peper|zwarte peper)/.test(naam) || /^(peper|zout)( en | & )/.test(s)) return [{ naam: 'zout', n: null, eenheid: 'vaag' }, { naam: 'peper', n: null, eenheid: 'vaag' }];
    if (inhoud && ['blik', 'pot', 'pak', 'zak', 'bol'].includes(eenheid)) { n = (n || 1) * inhoud; eenheid = /ml|l|cl/.test(ph[2]) ? 'ml' : 'g'; }
    uit.push({ naam, n, eenheid: n === null ? 'vaag' : eenheid });
    return uit;
  }

  // ---- samenvoegen ----
  const rond = (x, stap) => Math.ceil(x / stap - 1e-9) * stap;
  function gram(naam, n, eenheid) {
    if (eenheid === 'g') return n;
    if (eenheid === 'ml') return SAP_ML[naam] ? n / SAP_ML[naam] * STUK_G[naam] : n * (DICHTHEID[naam] || 1);
    if (eenheid === 'stuk') return STUK_G[naam] ? n * STUK_G[naam] : null;
    const v = VERPAKKING[eenheid];
    if (v) return n * (v[naam] || v._);
    return null;
  }
  function toon(naam, sommen) {
    const delen = [];
    const heeft = k => sommen[k] > 0;
    const stuk = STUK_G[naam];
    let rest = { ...sommen };
    // stuks-ingrediënten (groenten, fruit, eieren…): alles naar stuks
    if (stuk && (heeft('stuk') || heeft('teen') || naam === 'knoflook' || SAP_ML[naam])) {
      let g = 0;
      for (const k of Object.keys(rest)) { if (k === 'vaag') continue; const x = gram(naam, rest[k], k); if (x !== null) { g += x; delete rest[k]; } }
      if (naam === 'knoflook') { const t = Math.ceil(g / 5); delen.push(t + (t > 1 ? ' teentjes' : ' teentje') + (t >= 8 ? ' (± ' + rond(t / 10, 0.5).toString().replace('.', ',') + ' bol)' : '')); }
      else { const s = rond(g / stuk, naam === 'ei' || stuk >= 100 ? 1 : 0.5); delen.push(String(s).replace('.', ',') + ' stuk' + (s > 1 ? 's' : '') + (stuk >= 20 && g >= 50 && (heeft('g') || sommen.g) ? ' (± ' + rond(g, 10) + ' g)' : '')); }
    } else if (heeft('g') || (heeft('ml') && heeft('stuk'))) {
      // gewicht als basis; ml enkel omrekenen als we de dichtheid kennen. Verpakkingen (blik, pot, pak…) blijven apart staan: liever "400 g + 1 pak" dan een verkeerd totaal.
      let g = 0;
      for (const k of Object.keys(rest)) { if (k === 'vaag' || ['blik', 'pot', 'pak', 'zak', 'bol'].includes(k)) continue; const x = (k === 'ml' && !DICHTHEID[naam] && !heeft('g')) ? null : gram(naam, rest[k], k); if (x !== null) { g += x; delete rest[k]; } }
      if (g) delen.push(g >= 1000 ? (Math.round(g / 100) / 10).toString().replace('.', ',') + ' kg' : rond(g, g < 50 ? 5 : 10) + ' g');
    } else if (heeft('ml')) {
      const ml = rest.ml; delete rest.ml;
      if (ml >= 100) delen.push(ml >= 1000 ? (Math.round(ml / 100) / 10).toString().replace('.', ',') + ' l' : rond(ml, 10) + ' ml');
      else if (ml >= 15) { const el = rond(ml / 15, 0.5); delen.push(String(el).replace('.', ',') + ' el'); }
      else { const tl = rond(ml / 5, 0.5); delen.push(String(tl).replace('.', ',') + ' tl'); }
    }
    const NAMEN = { stuk: ['stuk', 'stuks'], teen: ['teentje', 'teentjes'], bos: ['bosje', 'bosjes'], takje: ['takje', 'takjes'], plak: ['plakje', 'plakjes'], handje: ['handje', 'handjes'], cm: ['cm', 'cm'], stengel: ['stengel', 'stengels'], blaadje: ['blaadje', 'blaadjes'], ml: ['ml', 'ml'], g: ['g', 'g'], blik: ['blik', 'blikken'], pot: ['pot', 'potten'], pak: ['pak', 'pakken'], zak: ['zakje', 'zakjes'], bol: ['bol', 'bollen'] };
    for (const k of Object.keys(rest)) {
      if (k === 'vaag' || !(rest[k] > 0)) continue;
      const x = rond(rest[k], k === 'g' || k === 'ml' ? 5 : 0.5);
      delen.push(String(x).replace('.', ',') + ' ' + (NAMEN[k] ? NAMEN[k][x > 1 ? 1 : 0] : k));
    }
    return delen.join(' + ');
  }

  // recepten: [{ titel, url, regels: [...] }] → [{ categorie, items: [{ naam, hoeveel, recepten, regels }] }]
  function lijst(recepten) {
    const per = {};
    recepten.forEach(r => r.regels.forEach(regel => {
      const delen = lees(regel); if (!delen) return;
      delen.forEach(d => {
        const it = per[d.naam] || (per[d.naam] = { naam: d.naam, sommen: {}, recepten: [], regels: [] });
        it.sommen[d.eenheid] = (it.sommen[d.eenheid] || 0) + (d.n || 0);
        if (!it.recepten.includes(r.titel)) it.recepten.push(r.titel);
        it.regels.push(regel);
      });
    }));
    const groepen = {};
    Object.values(per).forEach(it => {
      it.hoeveel = toon(it.naam, it.sommen);
      (groepen[categorie(it.naam)] = groepen[categorie(it.naam)] || []).push(it);
    });
    const volgorde = VOLGORDE;
    return volgorde.filter(c => groepen[c]).map(c => ({ categorie: c, items: groepen[c].sort((a, b) => a.naam.localeCompare(b.naam)) }));
  }

  const api = { lees, lijst, toon, naamVan, enkelvoud, categorie, VOLGORDE };
  if (typeof module !== 'undefined') module.exports = api; else window.Boodschappen = api;
})();
