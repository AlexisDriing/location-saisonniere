// Configuration globale avec optimisations - LOG production
const CONFIG = {
  API_URL: window.location.hostname.includes('webflow.io') 
    ? 'https://ical-develop.onrender.com'      // Serveur staging pour webflow.io
    : 'https://ical.driing.co',  // Serveur production pour driing.co
    
  MAPBOX_API_KEY: null,
  UPDATE_INTERVAL: 4 * 60 * 60 * 1000, // 4 heures
  CACHE_PREFIX: 'calendar_cache_',
  
  // 🚀 NOUVELLES OPTIONS DE PERFORMANCE
  PERFORMANCE: {
    enableDebug: false,              // false en production
    logTimings: true,               // mesurer les temps de chargement
    maxConcurrentRequests: 50,       // limite les requêtes simultanées
    lazyLoadDelay: 100,             // délai avant chargement automatique
    moduleLoadTimeout: 5000,        // timeout pour le chargement des modules
    cacheSize: 100,                 // taille max du cache en mémoire
    debounceDelay: 300              // délai pour les recherches (anti-spam)
  }
};

// Export pour utilisation dans d'autres modules
window.CONFIG = CONFIG;

// =============================================================
// 🌐 LANGUE DU SITE — version anglaise servie sous /en par Webflow Localize
// =============================================================
// Point unique pour les textes, les montants et les liens du site côté voyageurs.
// Sur les pages françaises, chaque fonction renvoie exactement ce que le site
// affichait avant : rien ne change tant qu'un module ne l'utilise pas.
(function () {
  const chemin = window.location.pathname;
  const langHtml = (document.documentElement.getAttribute('lang') || '').toLowerCase();
  const LANG = (chemin === '/en' || chemin.startsWith('/en/') || langHtml.startsWith('en')) ? 'en' : 'fr';

    // Dictionnaire : chaque clé donne [français, anglais].
  // {n}, {prix}… sont remplacés par les valeurs passées à t().
  const DICO = {
    // — Fiche logement : prix et calcul —
    aPartirDe:            ['À partir de', 'From'],
    prixParNuit:          ['{prix} / nuit', '{prix} / night'],
    calculNuit:           ['{prix} x {n} nuit', '{prix} x {n} night'],
    calculNuits:          ['{prix} x {n} nuits', '{prix} x {n} nights'],
    supplementVoyageurs:  ['Supplément voyageurs ({n} pers.)', 'Extra guests ({n})'],
    taxeSejour:           ['Taxe de séjour ({adultes} × {nuits})', 'Tourist tax ({adultes} × {nuits})'],
    enOption:             ['(en option)', '(optional)'],
    inclus:               ['Inclus', 'Included'],
    nuitMinimum:          ['{n} nuit minimum', '{n}-night minimum'],
    nuitsMinimum:         ['{n} nuits minimum', '{n}-night minimum'],

    // — Mots avec nombre (pluriel géré par I18N.pluriel) —
    nuit:                 ['{n} nuit', '{n} night'],
    nuits:                ['{n} nuits', '{n} nights'],
    adulte:               ['{n} adulte', '{n} adult'],
    adultes:              ['{n} adultes', '{n} adults'],
    voyageur:             ['{n} voyageur', '{n} guest'],
    voyageurs:            ['{n} voyageurs', '{n} guests'],
    bebe:                 ['{n} bébé', '{n} infant'],
    bebes:                ['{n} bébés', '{n} infants'],
    motNuit:              ['nuit', 'night'],
    motNuits:             ['nuits', 'nights'],
    ou:                   ['ou', 'or'],

    // — Fiche logement : textes —
    villegiatureOblig:    ['L’assurance villégiature est obligatoire pour réserver ce logement.', 'Holiday rental insurance is required to book this property.'],
    villegiatureNonOblig: ['L’assurance villégiature n’est pas obligatoire pour réserver ce logement.', 'Holiday rental insurance is not required to book this property.'],
    prixSurDemande:       ['Prix sur demande', 'Price on request'],
    chambre:              ['Chambre', 'Room'],
    chambreIndisponible:  ['Chambre indisponible', 'Room unavailable'],
    nonDisponible:        ['Non disponible', 'Not available'],
    arriveeEntre:         ['Arrivée entre {debut} et {fin}', 'Check-in between {debut} and {fin}'],
    arriveeAPartirDe:     ['Arrivée à partir de {heure}', 'Check-in from {heure}'],
    horaires:             ['{arrivee} - Départ avant {heure}', '{arrivee} - Check-out before {heure}'],
    remiseUne:            ['En réservant {nuits} ou plus, profitez de {remise} de remise.', 'Book {nuits} or more and get {remise} off.'],
    remisePlusieurs:      ['En réservant {nuits} {mot} ou plus, profitez respectivement de {remises} de remise.', 'Book {nuits} {mot} or more and get {remises} off respectively.'],
    montantRemise:        ['{m} €', '€{m}'],

    // — Types de lits (codes enregistrés par l'éditeur hôte) —
    'lit-simple':         ['lit-simple', 'single bed'],
    'lit-double':         ['lit-double', 'double bed'],
    'lit-queen-size':     ['lit-queen-size', 'queen-size bed'],
    'lit-king-size':      ['lit-king-size', 'king-size bed'],
    'lit-bebe':           ['lit-bebe', 'cot'],
    'canape-lit':         ['canape-lit', 'sofa bed'],
    'canape-convertible': ['canape-convertible', 'sofa bed'],
    'lit-dappoint':       ['lit-dappoint', 'extra bed'],
    'lit-superpose':      ['lit-superpose', 'bunk bed'],

    // — Calendrier —
    fermer:               ['Fermer', 'Close'],
    effacerDates:         ['Effacer les dates', 'Clear dates'],
    du:                   ['Du', 'From'],
    au:                   ['Au', 'To'],
    personnalise:         ['Personnalisé', 'Custom'],
    semaineCourt:         ['S', 'W'],
    joursCourts:          [['Di', 'Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa'], ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']],
    moisCalendrier:       [['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'],
                           ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']],
    moisTarifs:           [['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'],
                           ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']],
    periodeDuAu:          ['du {debut} au {fin}', 'from {debut} to {fin}'],
    nuitMinSejour:        ['{n} nuit minimum de séjour', '{n}-night minimum stay'],
    nuitsMinSejour:       ['{n} nuits minimum de séjour', '{n}-night minimum stay'],
    selectionnerDate:     ['Sélectionner une date', 'Select a date'],
    vosDates:             ['Vos dates de séjour', 'Your dates'],
    choisirDatesAvant:    ['Veuillez sélectionner des dates de séjour avant de réserver.', 'Please select your dates before booking.'],

    // — Page liste : cartes de logements —
    des:                  ['Dès', 'From'],
    parNuit:              ['/ nuit', '/ night'],
    auTotal:              ['au total', 'total'],
    logement:             ['Logement', 'Property'],
    dates:                ['Dates', 'Dates'],
    valider:              ['Valider', 'Apply'],
    precedent:            ['Précédent', 'Previous'],
    suivant:              ['Suivant', 'Next'],
    affichageResultats:   ['Affichage de {debut}-{fin} sur {total} logements', 'Showing {debut}-{fin} of {total} properties'],
    aucunLogementRecherche: ['Aucun logement ne correspond à cette recherche', 'No properties match this search'],
    aucunLogementZone:    ['Aucun logement dans cette zone', 'No properties in this area'],
    aucunResultatListe:   ['Aucun logement ne correspond à vos critères de recherche.<br>Essayez de modifier vos filtres.', 'No properties match your search.<br>Try changing your filters.'],
    erreurChargement:     ['Une erreur est survenue lors du chargement des logements.<br>Veuillez réessayer ultérieurement.', 'Something went wrong while loading the properties.<br>Please try again later.'],

    // — Filtres —
    equipements:          ['Équipements', 'Amenities'],
    equipementN1:         ['{n} équipement', '{n} amenity'],
    equipementsN:         ['{n} équipements', '{n} amenities'],
    preferences:          ['Préférences', 'Preferences'],
    preferenceN1:         ['{n} préférence', '{n} preference'],
    preferencesN:         ['{n} préférences', '{n} preferences'],
    prixMaxNuit:          ['{prix} / nuit maximum', '{prix} / night max'],
    tarifParNuitee:       ['Tarif par nuitée', 'Price per night'],
    voyageursFiltre:      ['Voyageurs', 'Guests'],

    // — Recherche par lieu —
    departementPays:      ['Département, {pays}', 'Department, {pays}'],
    regionPays:           ['Région, {pays}', 'Region, {pays}'],
    region:               ['Région', 'Region'],

    // — Carte —
    agrandirCarte:        ['Agrandir la carte', 'Expand map'],
    reduireCarte:         ['Réduire la carte', 'Collapse map'],
    rechercherZone:       ['Rechercher dans cette zone', 'Search this area'],
    liste:                ['Liste', 'List'],
    carte:                ['Carte', 'Map'],
    revenirListe:         ['Revenir à la liste', 'Back to list'],
    voirCarte:            ['Voir la carte', 'Show map'],
    tagChambreHotes:      ["Chambre d'hôtes", 'Bed & breakfast'],
    hote:                 ['Hôte : {nom}', 'Host: {nom}'],
    photoPrecedente:      ['Photo précédente', 'Previous photo'],
    photoSuivante:        ['Photo suivante', 'Next photo'],
    aucunGeolocalise:     ['Aucun logement géolocalisé pour le moment.', 'No properties on the map yet.'],
    aucunLogementIci:     ['Aucun logement ici', 'No properties here'],
    voirPlusProches:      ['Voir les plus proches', 'Show the nearest'],
    logementZone1:        ['{n} logement dans cette zone', '{n} property in this area'],
    logementsZoneN:       ['{n} logements dans cette zone', '{n} properties in this area']
    // ↑ Les lots suivants ajouteront leurs clés au-dessus de cette ligne.
  };

  const TEXTES = { fr: {}, en: {} };
  for (const cle in DICO) {
    TEXTES.fr[cle] = DICO[cle][0];
    TEXTES.en[cle] = DICO[cle][1];
  }

  // Texte dans la langue de la page. Une clé absente en anglais retombe sur le
  // français, puis sur la clé elle-même : jamais de trou à l'écran.
  function t(cle, valeurs) {
    let texte = TEXTES[LANG][cle];
    if (texte === undefined) texte = TEXTES.fr[cle];
    if (texte === undefined) texte = cle;
    if (valeurs) {
      texte = texte.replace(/\{(\w+)\}/g, (m, nom) => (valeurs[nom] !== undefined ? valeurs[nom] : m));
    }
    return texte;
  }

  // Singulier ou pluriel selon la langue : en français 0 et 1 sont au singulier
  // (« 0 nuit », « 1 nuit »), en anglais seul 1 l'est (« 0 nights », « 1 night »).
  function pluriel(n, cleUn, clePlusieurs, valeurs) {
    const un = LANG === 'fr' ? n < 2 : n === 1;
    return t(un ? cleUn : clePlusieurs, Object.assign({ n: n }, valeurs));
  }

  // Nombre formaté à la façon du pays : « 1 250 » en français, « 1,250 » en anglais.
  function nombre(n, options) {
    return Number(n).toLocaleString(LANG === 'en' ? 'en-GB' : 'fr-FR', options);
  }

  // Place le symbole euro : « 80€ » en français (format actuel du site), « €80 » en anglais.
  // Le montant arrive déjà arrondi ou formaté par l'appelant.
  function prix(montant) {
    return LANG === 'en' ? `€${montant}` : `${montant}€`;
  }

  // Lien interne dans la langue de la page : « /locations-saisonnieres/x » devient
  // « /en/locations-saisonnieres/x » sur une page anglaise. Les liens externes,
  // les ancres et les liens déjà préfixés ne sont pas touchés.
  function lien(url) {
    if (LANG !== 'en' || typeof url !== 'string') return url;
    if (!url.startsWith('/') || url.startsWith('//')) return url;
    if (url === '/en' || url.startsWith('/en/')) return url;
    return url === '/' ? '/en' : `/en${url}`;
  }

  window.I18N = {
    LANG: LANG,
    locale: LANG === 'en' ? 'en-GB' : 'fr-FR',
    momentLocale: LANG === 'en' ? 'en' : 'fr',
    t: t,
    pluriel: pluriel,
    nombre: nombre,
    prix: prix,
    lien: lien,
    _textes: TEXTES
  };
})();

console.log(`🌐 Langue: ${window.I18N.LANG}`);

console.log(`🌍 Environnement: ${window.location.hostname.includes('webflow.io') ? 'STAGING' : 'PRODUCTION'}`);
