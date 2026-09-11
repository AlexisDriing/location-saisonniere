(function () {
  const conteneur = document.getElementById('map-logements');
  if (!conteneur) return; // ← inerte si la div n'est pas là

  // Sur mobile, la carte existe mais n'est chargée qu'au premier tap sur "Carte"
  const MOBILE = window.innerWidth < 768;

  const STYLE = 'mapbox://styles/alexisdriing/cmr6hgcc1001901r1bmcg5x8r';
  const TOKEN = (window.MAPBOX_TOKEN || '').trim();
  const API = (window.CONFIG && window.CONFIG.API_URL) || 'https://ical.driing.co';
  const MODE_DEMO = new URLSearchParams(location.search).get('points') === 'demo';

  const GL_JS = 'https://api.mapbox.com/mapbox-gl-js/v3.9.0/mapbox-gl.js';
  const GL_CSS = 'https://api.mapbox.com/mapbox-gl-js/v3.9.0/mapbox-gl.css';

  let map = null;
  let tousLesPoints = [];
  const marqueurs = new Map();
  const cacheFiches = new Map();
  let pillActive = null;
  let popupActive = null;    // une seule fiche ouverte à la fois
  let panPourPopup = false;  // recadrage pour que la fiche tienne à l'écran
  let clicOuverture = null;  // le clic qui vient d'ouvrir une fiche (à ne pas confondre avec un clic extérieur)
  let idSurvole = null;      // logement actuellement survolé dans la liste
  let clusterSurvole = null; // élément du cluster mis en avant
  const cacheLeaves = new Map(); // cluster → logements qu'il contient (vidé à chaque déplacement)
  let carteOuverte = false;  // mobile : carte affichée en plein écran
  let carteADeplace = false; // mobile : la carte a bougé, la liste devra se recaler
  let ficheMobile = null;    // mobile : la fiche en bas de l'écran
  let ficheMobileId = null;  // logement affiché dedans
  let compteurEl = null;
  let moveDepuisCarte = false; // évite que le flyTo se déclenche quand c'est la carte qui filtre
  let pointsEnAttente = null;  // points reçus avant que la carte soit prête
  let rechercheEnCours = false; // une recherche de lieu repositionne la carte : on laisse la carte piloter
  let rechercheTimeout = null;
  let tempoCarte = null;   // regroupe les gestes enchaînés en un seul chargement

  function enGeoJSON(points) {
    return {
      type: 'FeatureCollection',
      features: points.map(p => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
        properties: { id: p.id, prix: p.prix }
      }))
    };
  }

  // Reçoit les logements filtrés (mêmes filtres que la liste) et met à jour les pastilles
  function majPointsCarte(points) {
    tousLesPoints = points;
    const src = map && map.getSource('logements');
    if (!src) { pointsEnAttente = points; return; }
    src.setData(enGeoJSON(points));
    if (compteurEl) majCompteur(compteurEl);
  }

    let scrollAvantRendu = null;

  // Le navigateur nous a-t-il déplacés parce que la page a raccourci ?
  function corrigerScrollListe() {
    if (scrollAvantRendu === null) return;
    if (window.scrollY >= scrollAvantRendu - 5) return; // personne ne nous a déplacés → rien à faire
    const wrapper = document.querySelector('.collection-list-wrapper');
    if (!wrapper) return;
    const hautListe = wrapper.getBoundingClientRect().top + window.scrollY;
    scrollAvantRendu = null;
    window.scrollTo({ top: Math.max(0, hautListe - 20), behavior: 'auto' });
  }
  
  // 🔗 Les filtres de la liste pilotent aussi la carte (événement émis par gestion-proprietes.js)
      let plusProchesCarte = null;

  window.addEventListener('driing:resultats-filtres', (e) => {
    const pts = e.detail && e.detail.map_points;
    plusProchesCarte = (e.detail && e.detail.plus_proches) || null;
    if (Array.isArray(pts)) majPointsCarte(pts);
  });

  // Utilisé par le bloc "aucun logement" de la liste
  window.driingCarte = {
    allerVers(bbox) {
      if (!map || !Array.isArray(bbox) || bbox.length !== 4) return false;
      // Carte vraiment affichée ? Une carte masquée mesure 0 × 0.
      // (offsetParent vaut null en position:fixed, donc en plein écran mobile.)
      const r = conteneur.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return false;
      map.fitBounds([[bbox[0], bbox[1]], [bbox[2], bbox[3]]], { padding: 60, maxZoom: 12 });
      return true;
    }
  };

  // Correction de scroll : on note la position AVANT le re-rendu, on vérifie après
  window.addEventListener('driing:resultats-filtres', () => {
    scrollAvantRendu = window.scrollY;           // position avant que la liste change
    requestAnimationFrame(corrigerScrollListe);  // contrôle avant le prochain affichage
    setTimeout(corrigerScrollListe, 200);        // filet si la mise en page tarde
  });


    // Allume / éteint la pastille d'un logement, ou le cluster qui le contient
  function surligner(id, actif) {
    const marqueur = marqueurs.get('p' + id);
    if (!actif) {
      if (marqueur && marqueur.getElement()) marqueur.getElement().classList.remove('survol');
      if (clusterSurvole) { clusterSurvole.classList.remove('survol'); clusterSurvole = null; }
      return;
    }
    if (marqueur && marqueur.getElement()) { marqueur.getElement().classList.add('survol'); return; }
    surlignerCluster(id); // le logement est regroupé : on allume son cluster
  }

  // Trouve le cluster qui contient réellement ce logement et le met en avant
  function surlignerCluster(id) {
    const src = map && map.getSource('logements');
    const point = tousLesPoints.find(p => p.id === id);
    if (!src || !point) return;

    // Clusters à l'écran, du plus proche du logement au plus lointain
    const ecran = map.project([point.lng, point.lat]);
    const candidats = [];
    for (const [cle, marqueur] of marqueurs) {
      if (cle[0] !== 'c') continue;
      const pos = map.project(marqueur.getLngLat());
      const d = Math.hypot(pos.x - ecran.x, pos.y - ecran.y);
      if (d < 220) candidats.push({ clusterId: Number(cle.slice(1)), el: marqueur.getElement(), d });
    }
    candidats.sort((a, b) => a.d - b.d);

    const essayer = (i) => {
      if (i >= candidats.length || idSurvole !== id) return; // souris déjà partie ailleurs
      const c = candidats[i];
      const connu = cacheLeaves.get(c.clusterId);
      if (connu) {
        if (connu.has(id)) { c.el.classList.add('survol'); clusterSurvole = c.el; }
        else essayer(i + 1);
        return;
      }
      src.getClusterLeaves(c.clusterId, 1000, 0, (err, feuilles) => {
        if (err) return essayer(i + 1);
        const ids = new Set(feuilles.map(f => f.properties.id));
        cacheLeaves.set(c.clusterId, ids);
        if (idSurvole !== id) return;
        if (ids.has(id)) { c.el.classList.add('survol'); clusterSurvole = c.el; }
        else essayer(i + 1);
      });
    };
    essayer(0);
  }

  // Survol d'une card de la liste → pastille correspondante mise en avant
  function brancherSurvolListe() {
    document.addEventListener('mouseover', (e) => {
      const card = e.target.closest && e.target.closest('.lien-logement[data-property-id]');
      const id = card ? card.getAttribute('data-property-id') : null;
      if (id === idSurvole) return;           // rien n'a changé, on ne fait rien
      if (idSurvole) surligner(idSurvole, false);
      idSurvole = id;
      if (id) surligner(id, true);
    });
  }


  const ICONE_OUVRIR = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10V4h6M20 14v6h-6M4 4l6 6M20 20l-6-6"/></svg>';
  const ICONE_FERMER = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 4v6H4M14 20v-6h6M10 10L4 4M14 14l6 6"/></svg>';

  // Bouton "carte en pleine largeur" (la liste disparaît)
  function brancherAgrandir() {
    const bloc = conteneur.closest('.bloc-logement-map');
    if (!bloc) return;

    const bouton = document.createElement('button');
    bouton.type = 'button';
    bouton.className = 'cl-agrandir';
    bouton.innerHTML = ICONE_OUVRIR;
    bouton.setAttribute('aria-label', 'Agrandir la carte');
    conteneur.appendChild(bouton);

    bouton.addEventListener('click', () => {
      carteAgrandie = bloc.classList.toggle('carte-agrandie');
      bouton.innerHTML = carteAgrandie ? ICONE_FERMER : ICONE_OUVRIR;
      bouton.setAttribute('aria-label', carteAgrandie ? 'Réduire la carte' : 'Agrandir la carte');

      // La carte suit sa nouvelle largeur image par image, sinon elle saute à la fin
      const debut = performance.now();
      const suivre = () => {
        map.resize();
        if (performance.now() - debut < 480) requestAnimationFrame(suivre);
        else if (!carteAgrandie) filtrerListeParCarte(); // la liste est revenue : on la recale
      };
      requestAnimationFrame(suivre);
    });
  }


  // ── Mobile : bascule liste ↔ carte plein écran ─────────────────────────────
  const ICONE_CARTE = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3 3 5.5v15L9 18l6 3 6-2.5v-15L15 6 9 3zM9 3v15M15 6v15"/></svg>';
  const ICONE_LISTE = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>';
  let boutonBascule = null;


    // Hauteur réelle du bandeau du haut (nav + recherche + filtres)
   function hauteurEntete() {
    let bas = 0;
    ['.nav.logement', '.bloc-search-mobile', '.container-filtres-logements'].forEach(sel => {
      document.querySelectorAll(sel).forEach(el => {
        // On ignore ce qui est masqué (display:none)
        if (!el.offsetParent && getComputedStyle(el).position !== 'fixed') return;
        const r = el.getBoundingClientRect();
        if (r.height && r.top < 250 && r.bottom > bas) bas = r.bottom;
      });
    });
    return Math.round(bas) || 219;
  }


  // Mobile : on ne recharge la liste que si l'utilisateur le demande
  function brancherBoutonZone() {
    boutonZone = document.createElement('button');
    boutonZone.type = 'button';
    boutonZone.className = 'cl-zone';
    boutonZone.textContent = 'Rechercher dans cette zone';
    boutonZone.addEventListener('click', () => {
      afficherBoutonZone(false);
      forcerChargementZone = true;
      filtrerListeParCarte();
    });
    conteneur.appendChild(boutonZone);
  }

  function afficherBoutonZone(visible) {
    if (boutonZone) boutonZone.classList.toggle('visible', visible);
    if (compteurEl) compteurEl.classList.toggle('cache', visible);
  }
  
  
  function brancherBasculeMobile() {
    boutonBascule = document.createElement('button');
    boutonBascule.type = 'button';
    boutonBascule.className = 'cl-bascule-mobile';
    boutonBascule.addEventListener('click', () => {
      if (carteOuverte) fermerCarteMobile(); else ouvrirCarteMobile();
    });
    document.body.appendChild(boutonBascule);
    majBoutonBascule();

    // La fenêtre de filtres retire "no-scroll" en se fermant : on le remet si la carte est ouverte
    document.addEventListener('click', (e) => {
      if (carteOuverte && e.target.closest('.button-modal-prix.close, #bouton-valider-mobile')) {
        setTimeout(() => document.body.classList.add('no-scroll'), 50);
      }
    });

    // iOS : le pincement doit zoomer la carte, pas la page
    ['gesturestart', 'gesturechange', 'gestureend'].forEach(type =>
      conteneur.addEventListener(type, (e) => e.preventDefault(), { passive: false })
    );

    // Le bouton retour du navigateur ferme la carte au lieu de quitter la page
    window.addEventListener('popstate', () => { if (carteOuverte) fermerCarteMobile(true); });
  }

  function majBoutonBascule() {
    if (!boutonBascule) return;
    boutonBascule.innerHTML = carteOuverte
      ? ICONE_LISTE + '<span>Liste</span>'
      : ICONE_CARTE + '<span>Carte</span>';
    boutonBascule.setAttribute('aria-label', carteOuverte ? 'Revenir à la liste' : 'Voir la carte');
  }

  function ouvrirCarteMobile() {
    carteOuverte = true;
    document.body.classList.add('no-scroll');
    document.body.classList.add('cl-carte-ouverte');   // nav masquée, barre de recherche fixée
    conteneur.style.setProperty('--cl-haut', hauteurEntete() + 'px'); // mesuré APRÈS, la barre est en haut
    conteneur.classList.add('cl-plein-ecran');
    majBoutonBascule();
    history.pushState({ carteDriing: true }, ''); // pour intercepter le retour

    if (!map) {
      conteneur.classList.add('cl-chargement');   // premier tap : Mapbox se télécharge
      init().then(() => conteneur.classList.remove('cl-chargement'));
    } else {
      requestAnimationFrame(() => map.resize());
    }
  }

  function fermerCarteMobile(depuisHistorique) {
    carteOuverte = false;
    fermerFicheMobile();
    document.body.classList.remove('no-scroll');
    document.body.classList.remove('cl-carte-ouverte');
    conteneur.classList.remove('cl-plein-ecran');
    majBoutonBascule();
    if (!depuisHistorique) history.back();        // on retire notre entrée d'historique
  }
  


  // ── Mobile : fiche en bas de l'écran ────────────────────────────────────────
  function creerFicheMobile() {
    ficheMobile = document.createElement('div');
    ficheMobile.className = 'cl-fiche-mobile';
    conteneur.appendChild(ficheMobile);

    // Croix
    ficheMobile.addEventListener('click', (e) => {
      if (e.target.closest('.cl-fermer')) { e.preventDefault(); fermerFicheMobile(); }
    });

    // Glissement horizontal : logement précédent / suivant parmi ceux à l'écran
    let x0 = 0, y0 = 0;
    ficheMobile.addEventListener('touchstart', (e) => {
      x0 = e.touches[0].clientX; y0 = e.touches[0].clientY;
    }, { passive: true });
    ficheMobile.addEventListener('touchend', (e) => {
      const dx = e.changedTouches[0].clientX - x0;
      const dy = e.changedTouches[0].clientY - y0;
      if (Math.abs(dx) > 40 && Math.abs(dy) < 30) {
        e.preventDefault();               // un glissement n'ouvre pas la page du logement
        voisinFiche(dx < 0 ? 1 : -1);
      }
    });
  }

  function afficherFicheMobile(d) {
    if (!ficheMobile) creerFicheMobile();
    ficheMobileId = String(d.id);
    const photo = d.photos[0] || '';
    const adresse = d.fiche.address ? villePays(d.fiche.address) : '';
    ficheMobile.innerHTML = `
      <a class="cl-fm-card" href="${d.lien || '#'}"${d.lien ? ' target="_blank"' : ''}>
        ${photo ? `<img class="cl-fm-photo" src="${photo}" alt="" />` : '<div class="cl-fm-photo"></div>'}
          <div class="cl-fm-infos">
          ${d.fiche.type === "Chambre d'hôtes" ? `<span class="cl-tag">Chambre d'hôtes</span>` : ''}
          ${adresse ? `<p class="lieu">${adresse}</p>` : ''}
          <p class="titre">${d.fiche.name || 'Logement'}</p>
          ${d.fiche.host_name ? `<p class="hote">Hôte : ${d.fiche.host_name}</p>` : ''}
          <p class="prix">
            Dès ${d.barre ? `<del>${euros(d.barre)}</del>` : ''} <b>${euros(d.direct)}</b> / nuit
            ${d.reduc ? `<span class="badge">-${d.reduc}%</span>` : ''}
          </p>
        </div>
        <span class="cl-fermer" role="button" aria-label="Fermer">×</span>
      </a>`;
    ficheMobile.classList.add('visible');
    document.body.classList.add('cl-fiche-ouverte');
  }

  function fermerFicheMobile() {
    if (!ficheMobile) return;
    ficheMobile.classList.remove('visible');
    document.body.classList.remove('cl-fiche-ouverte');
    ficheMobileId = null;
    if (pillActive) { pillActive.classList.remove('actif'); pillActive = null; }
  }

  // Logement voisin, à gauche (-1) ou à droite (+1), parmi les pastilles à l'écran
  function voisinFiche(sens) {
    const pastilles = [];
    for (const [cle, m] of marqueurs) {
      if (cle[0] !== 'p') continue;
      const pos = m.getLngLat();
      pastilles.push({ id: cle.slice(1), x: map.project(pos).x, el: m.getElement(), pos });
    }
    if (pastilles.length < 2) return;
    pastilles.sort((a, b) => a.x - b.x);
    const i = pastilles.findIndex(p => p.id === ficheMobileId);
    const v = pastilles[(i + sens + pastilles.length) % pastilles.length];
    ouvrirFiche(v.id, Number(v.el.dataset.prix), [v.pos.lng, v.pos.lat], v.el);
  }
  
  
  
  
  // 🔗 La recherche de lieu déplace la carte (on enrobe setSearchLocation sans modifier le module)
    function brancherRecherche() {
    const attente = setInterval(() => {
      if (!window.propertyManager) return;
      clearInterval(attente);
      const pm = window.propertyManager;

      // 1) La recherche de lieu repositionne la carte
      const setOrig = pm.setSearchLocation.bind(pm);
      pm.setSearchLocation = function (location, searchType, zoneInfo) {
        setOrig(location, searchType, zoneInfo);
        if (moveDepuisCarte || !map || !location) return;
        rechercheEnCours = true; // la carte va bouger : c'est elle qui fera l'unique chargement
        pm.showLoading(true);    // la liste va changer : on le montre sans attendre la carte
        const bbox = zoneInfo && zoneInfo.bbox
          ? (Array.isArray(zoneInfo.bbox) ? zoneInfo.bbox : String(zoneInfo.bbox).split(',').map(Number))
          : null;
        // Déplacement court : la liste attend la fin du mouvement, autant qu'il soit bref
        if (bbox && bbox.length === 4 && bbox.every(isFinite)) {
          map.fitBounds([[bbox[0], bbox[1]], [bbox[2], bbox[3]]], { padding: 40, duration: 400 });
        } else {
          map.easeTo({ center: [location.lng, location.lat], zoom: 11, duration: 400 });
        }
        // Filet de sécurité si la carte ne bouge pas (déjà au bon endroit)
        clearTimeout(rechercheTimeout);
        rechercheTimeout = setTimeout(() => { if (rechercheEnCours) filtrerListeParCarte(); }, 900);
      };

      // 2) On neutralise le chargement "100 km" que la recherche déclenche elle-même :
      //    seul le déplacement de carte (bbox) fera le chargement → plus de double affichage.
      const applyOrig = pm.applyFilters.bind(pm);
      pm.applyFilters = function (reset) {
        if (rechercheEnCours && !moveDepuisCarte) return Promise.resolve();
        return applyOrig(reset);
      };
    }, 200);
  }

  // ── Mise en page : carte fixée à droite, contenu de la page décalé à gauche ──
  function poserStyles() {
    const s = document.createElement('style');
    s.id = 'carte-logements-styles';
    s.textContent = `
      #map-logements { position: relative; background: #eceae6; }
      #map-logements .cl-compteur {
        position: absolute; top: 14px; left: 50%; transform: translateX(-50%); z-index: 3;
        background: #fff; border: 1px solid rgba(0,0,0,.08); box-shadow: 0 2px 10px rgba(0,0,0,.15);
        border-radius: 22px; padding: 8px 16px; font-size: 13px; font-weight: 600; color: #272A2B;
        white-space: nowrap;
      }
      #map-logements .cl-message {
        position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
        text-align: center; padding: 30px; font-size: 14px; color: #555; line-height: 1.6;
      }
      .cl-prix-pill {
        display: inline-flex; align-items: center; background: #fff; color: #272A2B;
        font-size: 13px; font-weight: 700; line-height: 1; padding: 7px 11px; border-radius: 22px;
        border: 1px solid rgba(0,0,0,.08); box-shadow: 0 2px 6px rgba(0,0,0,.18);
        cursor: pointer; white-space: nowrap; user-select: none;
        transition: transform .12s ease, background .12s ease, color .12s ease;
      }
      .cl-prix-pill:hover, .cl-prix-pill.actif { background: #235B59; color: #fff; transform: scale(1.06); z-index: 5; }
      .cl-cluster {
        display: flex; align-items: center; justify-content: center; background: #fff; color: #272A2B;
        font-weight: 700; border-radius: 50%; border: 1px solid rgba(0,0,0,.08);
        box-shadow: 0 2px 8px rgba(0,0,0,.2); cursor: pointer; user-select: none;
      }
      #map-logements .mapboxgl-popup { max-width: none !important; }
      #map-logements .mapboxgl-popup-content {
        padding: 0; border-radius: 16px; overflow: hidden; width: 300px;
        box-shadow: 0 8px 28px rgba(0,0,0,.22); font-family: Inter;
      }
      #map-logements .mapboxgl-popup-close-button {
        font-size: 20px; background-color: #fff; width: 32px; height: 32px; border-radius: 24px; color: #272A2B; right: 6px; top: 6px; z-index: 2;
      }
      .cl-popup img, .cl-popup .cl-noimg { width: 100%; height: 200px; object-fit: cover; display: block; background: #e6e4e0; }
      .cl-popup .infos { padding: 12px 12px 12px; }
      .cl-popup .lieu { font-size: 14px; line-heigh: 20px; color: #778183; margin: 0 0 2px; }
      .cl-popup .titre { font-size: 16px; line-heigh: 22px; font-weight: 600; margin: 0 0 4px; color: #272A2B;
        display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; }
      .cl-popup .hote { font-size: 14px; line-heigh: 20px; color: #778183; margin: 0 0 8px; }
      .cl-popup .prix { font-size: 16px; margin: 0; color: #272A2B; display: flex; align-items: center; flex-wrap: wrap; gap: 4px; }
      .cl-popup .prix del { font-size: 14px; color: #778183; }
      .cl-popup .prix b { font-weight: 600; }
      .cl-tag {
        display: inline-block; background: #f0f7ff; color: #15394c; font-weight: 500; font-size: 12px;
        border-radius: 8px; padding: 10px 10px; margin-bottom: 0px;
      }
      .cl-popup .badge { background: #EBF1F0; color: #235B59; font-weight: 600; font-size: 14px;
        border-radius: 6px; padding: 4px; margin-left: 6px; }
    `;
    document.head.appendChild(s);
  }

  function message(html) { conteneur.innerHTML = `<div class="cl-message">${html}</div>`; }

  function chargerScript(src) {
    return new Promise((resolve, reject) => {
      const el = document.createElement('script');
      el.src = src; el.onload = resolve; el.onerror = reject;
      document.head.appendChild(el);
    });
  }
  function chargerCSS(href) {
    const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = href; document.head.appendChild(l);
  }

  async function chargerPoints() {
    if (MODE_DEMO) {
      const foyers = [[2.35,48.85],[1.77,48.63],[4.84,45.76],[-0.58,44.84],[5.37,43.3],[-1.55,47.22],[7.26,43.71],[3.88,43.61]];
      const pts = []; let g = 7;
      const alea = () => { g = (g * 16807) % 2147483647; return g / 2147483647; };
      for (let i = 1; i <= 150; i++) {
        const f = foyers[Math.floor(alea() * foyers.length)];
        pts.push({ id: 'demo-' + i, lng: +(f[0] + (alea()-0.5)*0.9).toFixed(5), lat: +(f[1] + (alea()-0.5)*0.6).toFixed(5), prix: 60 + Math.round(alea()*300) });
      }
      return pts;
    }
    const r = await fetch(`${API}/map-points`);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const data = await r.json();
    return data.points || [];
  }

  function euros(n) { return Number(n).toLocaleString('fr-FR') + ' €'; }

  async function init() {
    poserStyles();

    if (!TOKEN || !TOKEN.startsWith('pk.')) {
      message('⚠️ Token Mapbox manquant.<br>Ajoute <b>window.MAPBOX_TOKEN</b> dans le code custom de la page.');
      return;
    }

    chargerCSS(GL_CSS);
    await chargerScript(GL_JS);
    mapboxgl.accessToken = TOKEN;

    try {
      tousLesPoints = await chargerPoints();
    } catch (e) {
      message(`⚠️ Impossible de charger les logements (<b>${e.message}</b>).<br>
        Le serveur est peut-être en train de se réveiller (Render) — réessaie dans 30 s.`);
      return;
    }
    if (!tousLesPoints.length) { message('Aucun logement géolocalisé pour le moment.'); return; }

    compteurEl = document.createElement('div');
    compteurEl.className = 'cl-compteur';
    compteurEl.textContent = '…';
    conteneur.appendChild(compteurEl);

    map = new mapboxgl.Map({
      container: 'map-logements', style: STYLE, projection: 'mercator',
      center: [2.2, 46.6], zoom: 5,
      pitchWithRotate: false,   // pas d'inclinaison
      touchPitch: false         // pas d'inclinaison à deux doigts
    });
    if (MOBILE) map.touchZoomRotate.disableRotation(); // le pincement zoome, sans faire tourner
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');

    const limites = new mapboxgl.LngLatBounds();
    tousLesPoints.forEach(p => limites.extend([p.lng, p.lat]));
    map.fitBounds(limites, { padding: 60, maxZoom: 12, duration: 0 });

    map.on('load', () => {
      map.addSource('logements', {
        type: 'geojson',
        data: enGeoJSON(tousLesPoints),
        cluster: true,
        clusterMaxZoom: 13,
        clusterRadius: MOBILE ? 65 : 45,
        clusterMinPoints: 3        // un duo reste affiché en deux prix
      });
      map.addLayer({ id: 'ancre-clusters', type: 'circle', source: 'logements',
        filter: ['has', 'point_count'], paint: { 'circle-radius': 12, 'circle-opacity': 0.01 } });
      map.addLayer({ id: 'ancre-points', type: 'circle', source: 'logements',
        filter: ['!', ['has', 'point_count']], paint: { 'circle-radius': 10, 'circle-opacity': 0.01 } });

      // Synchronisation en fin de déplacement uniquement → pastilles fixes
      map.on('moveend', synchroniser);
      map.on('idle', synchroniser);
      map.on('moveend', () => majCompteur(compteurEl));
            // La liste suit la carte, mais des gestes enchaînés ne déclenchent qu'un chargement
      map.on('moveend', () => {
        if (panPourPopup) { panPourPopup = false; return; } // recadrage de fiche : rien à charger
        clearTimeout(tempoCarte);
        tempoCarte = setTimeout(filtrerListeParCarte, 200);
      });
      map.on('moveend', () => cacheLeaves.clear()); // les clusters changent : on repart à zéro
      map.on('movestart', () => {
        plusProchesCarte = null;
        if (!panPourPopup) clearTimeout(tempoCarte); // un recadrage de fiche n'annule pas un chargement prévu
      });

      // Fermer la fiche au clic ailleurs — en ignorant le clic qui vient de l'ouvrir
      map.on('click', (e) => {
        if (e.originalEvent === clicOuverture) return;                          // c'est le clic d'ouverture
        const cible = e.originalEvent && e.originalEvent.target;
        if (cible && cible.closest && cible.closest('.mapboxgl-popup')) return; // clic dans la fiche
        if (popupActive) { popupActive.remove(); popupActive = null; }
        if (MOBILE) fermerFicheMobile();
      });
      synchroniser();
      majCompteur(compteurEl);

      // Des résultats filtrés sont arrivés avant que la carte soit prête ?
      if (pointsEnAttente) { majPointsCarte(pointsEnAttente); pointsEnAttente = null; }
    });

    brancherRecherche();
    brancherSurvolListe();
    if (!MOBILE) brancherAgrandir(); // agrandissement : desktop uniquement
  }

  // Fait suivre la liste de gauche au rectangle visible de la carte,
  // en réutilisant le filtrage par bbox déjà géré par ton serveur.
  function filtrerListeParCarte() {
    clearTimeout(tempoCarte);       // appelée directement (recherche, agrandissement) : pas de doublon
    if (!window.propertyManager) return;
    rechercheEnCours = false;      // la carte a bougé : on peut charger (une seule fois)
    clearTimeout(rechercheTimeout);
    const b = map.getBounds();
    const c = map.getCenter();
    moveDepuisCarte = true; // ne pas re-déclencher un flyTo : c'est la carte qui parle
    window.propertyManager.setSearchLocation(
      { lat: c.lat, lng: c.lng },
      'region',
      {
        polygon_source: 'bbox',
        bbox: [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()],
        geo_feature_name: null,
        geo_feature_code: null
      }
    );
    moveDepuisCarte = false;
    window.propertyManager.applyFilters(true);
  }

  function synchroniser() {
    if (!map || !map.getSource('logements') || !map.isSourceLoaded('logements')) return;
    const features = map.queryRenderedFeatures({ layers: ['ancre-clusters', 'ancre-points'] });
    const presents = new Set();

    for (const f of features) {
      const estCluster = f.properties.cluster === true;
      const cle = estCluster ? 'c' + f.properties.cluster_id : 'p' + f.properties.id;
      if (presents.has(cle)) continue;
      presents.add(cle);
      if (marqueurs.has(cle)) continue;

      const el = document.createElement('div');
      if (estCluster) {
        const n = f.properties.point_count;
        const taille = n >= 100 ? 52 : n >= 25 ? 44 : 36;
        el.className = 'cl-cluster';
        el.style.width = el.style.height = taille + 'px';
        el.style.fontSize = (n >= 100 ? 15 : 13) + 'px';
        el.textContent = n;
        el.addEventListener('click', () => {
          map.getSource('logements').getClusterExpansionZoom(f.properties.cluster_id, (err, zoom) => {
            if (err) return;
            map.easeTo({
              center: f.geometry.coordinates,
              zoom: zoom + 0.3,
              duration: 900,                          // 500 ms par défaut
              easing: t => 1 - Math.pow(1 - t, 3)     // départ franc, arrivée en douceur
            });
          });
        });
      } else {
        const id = f.properties.id, prix = f.properties.prix, coords = f.geometry.coordinates;
        el.className = 'cl-prix-pill';
        el.dataset.prix = prix;      // relu par le glissement d'une fiche à l'autre
        if (idSurvole && String(idSurvole) === String(id)) el.classList.add('survol');
        el.textContent = euros(prix);
        el.addEventListener('click', (ev) => { clicOuverture = ev; ouvrirFiche(id, prix, coords, el); });
      }
      marqueurs.set(cle, new mapboxgl.Marker({ element: el }).setLngLat(f.geometry.coordinates).addTo(map));
    }
    for (const [cle, m] of marqueurs) {
      if (!presents.has(cle)) { m.remove(); marqueurs.delete(cle); }
    }
  }

  function majCompteur(el) {
    if (!map) return;
    const b = map.getBounds();
    const n = tousLesPoints.filter(p =>
      p.lng >= b.getWest() && p.lng <= b.getEast() && p.lat >= b.getSouth() && p.lat <= b.getNorth()).length;
    // Mobile seulement : la liste est masquée, la pastille est la seule sortie.
    // Sur ordinateur, le bloc "aucun logement" de la liste s'en charge.
    if (MOBILE && n === 0 && plusProchesCarte && plusProchesCarte.bbox) {
      el.textContent = '';
      el.appendChild(document.createTextNode('Aucun logement ici'));
      const go = document.createElement('button');
      go.type = 'button';
      go.className = 'cl-compteur-action';
      go.textContent = 'Voir les plus proches';
      go.addEventListener('click', () => window.driingCarte.allerVers(plusProchesCarte.bbox));
      el.appendChild(go);
      el.classList.add('avec-action');
      return;
    }

    el.classList.remove('avec-action');
    el.textContent = `${n} logement${n > 1 ? 's' : ''} dans cette zone`;
  }

  // Première image du champ "photos du logement" (même logique que la liste),
  // avec repli sur image/image1 pour les anciens logements.
  function premiereImage(fiche) {
    const galerie = fiche.images_gallery;
    if (Array.isArray(galerie) && galerie.length > 0) {
      const premiere = galerie[0];
      let url = null;
      if (premiere && typeof premiere === 'object' && premiere.url) url = premiere.url;
      else if (typeof premiere === 'string') url = premiere;
      if (url && url.startsWith('http')) return url;
    }
    return fiche.image || fiche.image1 || '';
  }

    // Toutes les photos du logement (champ "photos du logement"), avec repli
  function toutesLesPhotos(fiche) {
    const g = Array.isArray(fiche.images_gallery) ? fiche.images_gallery : [];
    const urls = g.map(p => (p && typeof p === 'object' ? p.url : p))
                  .filter(u => typeof u === 'string' && u.startsWith('http'));
    if (urls.length) return urls;
    const seul = fiche.image || fiche.image1 || '';
    return seul ? [seul] : [];
  }

    // Carrousel : 2 images (l'affichée + celle qui glisse) et des points animés.
  // Préchargement limité à la photo suivante → pas d'image vide, coût minimal.
  function activerCarrousel(photos) {
    if (!popupActive || photos.length < 2) return;
    const racine = popupActive.getElement();
    if (!racine) return;
    const imgA = racine.querySelector('.cl-photo');
    const imgB = racine.querySelector('.cl-photo-anim');
    const dotsWrap = racine.querySelector('.cl-dots');
    const piste = racine.querySelector('.cl-dots-piste');
    if (!imgA || !imgB) return;

    // ⚠️ À garder synchronisé avec le CSS (.cl-dot width et .cl-dots-piste gap)
    const TAILLE_DOT = 6, ESPACE_DOT = 5;
    const PAS = TAILLE_DOT + ESPACE_DOT;

    const nbDots = Math.min(5, photos.length);
    let index = 0;
    let enCours = false;

    if (dotsWrap) dotsWrap.style.width = (nbDots * TAILLE_DOT + (nbDots - 1) * ESPACE_DOT) + 'px';

    const debutFenetre = () => {
      if (photos.length <= nbDots) return 0;
      return Math.max(0, Math.min(index - Math.floor(nbDots / 2), photos.length - nbDots));
    };

    const majDots = () => {
      if (!piste) return;
      const debut = debutFenetre();
      piste.style.transform = `translateX(${-debut * PAS}px)`;
      Array.from(piste.children).forEach((d, k) => {
        const pos = k - debut;                       // position dans la fenêtre visible
        const visible = pos >= 0 && pos < nbDots;
        const petit = visible && (
             (pos === 0 && debut > 0)                            // il reste des photos avant
          || (pos === nbDots - 1 && debut + nbDots < photos.length)); // il en reste après
        d.className = 'cl-dot' + (k === index ? ' actif' : '') + (petit ? ' petit' : '');
      });
    };

    // Précharge discrètement la photo suivante (l'arrière est déjà en cache)
    const prechargerSuivante = () => {
      const im = new Image();
      im.src = photos[(index + 1) % photos.length];
    };

    // Garantit qu'on n'anime jamais vers une image non chargée
    const attendreImage = (url) => new Promise(res => {
      const im = new Image();
      let fini = false;
      const ok = () => { if (!fini) { fini = true; res(); } };
      im.onload = ok; im.onerror = ok;
      im.src = url;
      setTimeout(ok, 400); // filet : on n'attend jamais plus de 400 ms
    });

    // Glissement animé. sens = +1 (flèche droite) ou -1 (flèche gauche)
    const glisser = async (sens) => {
      if (enCours) return;
      enCours = true;
      const suivant = (index + sens + photos.length) % photos.length;

      await attendreImage(photos[suivant]);

      imgB.src = photos[suivant];
      imgB.style.transition = 'none';
      imgB.style.transform = `translateX(${sens * 100}%)`;
      imgB.style.visibility = 'visible';
      void imgB.offsetWidth; // fige la position de départ avant d'animer

      imgA.style.transition = 'transform .35s ease';
      imgB.style.transition = 'transform .35s ease';
      imgA.style.transform = `translateX(${-sens * 100}%)`;
      imgB.style.transform = 'translateX(0)';

      index = suivant;
      majDots(); // les points glissent en même temps que l'image

      setTimeout(() => {
        imgA.style.transition = 'none';
        imgA.src = photos[index];
        imgA.style.transform = 'translateX(0)';
        imgB.style.visibility = 'hidden';
        imgB.style.transition = 'none';
        enCours = false;
        prechargerSuivante();
      }, 360);
    };

    // Saut direct au clic sur un point (sans glissement d'image)
    const allerA = (i) => {
      if (enCours) return;
      index = (i + photos.length) % photos.length;
      imgA.src = photos[index];
      majDots();
      prechargerSuivante();
    };

    racine.querySelectorAll('.cl-nav').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();   // ne pas ouvrir la page du logement
        e.stopPropagation();  // ne pas fermer la fiche
        glisser(btn.classList.contains('cl-next') ? 1 : -1);
      });
    });

    if (piste) {
      Array.from(piste.children).forEach((d, k) => {
        d.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          allerA(k);
        });
      });
    }

    majDots();
    setTimeout(prechargerSuivante, 400); // seulement si la fiche reste ouverte
  }

    // Ville + pays uniquement (l'adresse est stockée "Ville, Pays, Rue…"),
  // même règle que la liste (adresse-formatter.js)
  function villePays(adresse) {
    const parties = String(adresse).split(',').map(p => p.trim()).filter(Boolean);
    return parties.length >= 2 ? parties.slice(0, 2).join(', ') : String(adresse);
  }

  // Exactement le calcul des cartes de la liste : prix le plus bas selon le nombre
  // de voyageurs, puis prix barré au même ratio plein/plateforme.
  function prixCommeLaListe(pd, prixPastille) {
    if (!pd) return { direct: prixPastille, barre: null, reduc: null };

    const adultes = parseInt(document.getElementById('chiffres-adultes')?.textContent || '1', 10);
    const enfants = parseInt(document.getElementById('chiffres-enfants')?.textContent || '0', 10);
    const voyageurs = Math.max(1, adultes + enfants);

    const prixSaison = (s) => {
      if (pd.defaultPricing && pd.defaultPricing.mode === 'per_guest') {
        const ppg = (s.pricesPerGuest?.length ? s.pricesPerGuest : pd.defaultPricing.pricesPerGuest) || [];
        if (ppg.length > 0) return ppg[Math.min(voyageurs - 1, ppg.length - 1)];
      }
      return s.price;
    };

    let bas = Infinity, saisonBasse = null;
    if (pd.defaultPricing) {
      const p = prixSaison(pd.defaultPricing);
      if (p > 0 && p < bas) { bas = p; saisonBasse = pd.defaultPricing; }
    }
    if (Array.isArray(pd.seasons)) {
      for (const s of pd.seasons) {
        const p = prixSaison(s);
        if (p > 0 && p < bas) { bas = p; saisonBasse = s; }
      }
    }
    const direct = bas !== Infinity ? Math.round(bas) : prixPastille;

    const plein = saisonBasse?.price || direct;
    const tarifsPlateforme = saisonBasse?.platformPrices
      ? Object.values(saisonBasse.platformPrices).filter(v => v > 0) : [];
    const pleinPlateforme = tarifsPlateforme.length
      ? tarifsPlateforme.reduce((a, b) => a + b, 0) / tarifsPlateforme.length
      : plein * (100 / (100 - (pd.platformPricing?.defaultDiscount || 17)));

    const barre = Math.round(direct * (plein > 0 ? pleinPlateforme / plein : 1));
    if (barre <= direct) return { direct, barre: null, reduc: null };
    return { direct, barre, reduc: Math.round((barre - direct) / barre * 100) };
  }

  async function ouvrirFiche(id, prix, coords, el) {
    // On ferme nous-mêmes la fiche précédente (Mapbox ne le fera plus)
    if (popupActive) { popupActive.remove(); popupActive = null; }
    if (pillActive) pillActive.classList.remove('actif');
    el.classList.add('actif'); pillActive = el;

    let fiche = {};
    if (!MODE_DEMO) {
      if (cacheFiches.has(id)) fiche = cacheFiches.get(id);
      else {
        try {
          const r = await fetch(`${API}/map-card/${encodeURIComponent(id)}`);
          if (r.ok) { fiche = await r.json(); cacheFiches.set(id, fiche); }
        } catch (e) { /* fiche minimale : on affiche quand même le prix */ }
      }
    }

    const photos = toutesLesPhotos(fiche);
    const { direct, barre, reduc } = prixCommeLaListe(fiche.pricing_data_carte || fiche.pricing_data, prix);
    const lien = String(id).startsWith('demo-') ? null : `/locations-saisonnieres/${id}`;

    // Mobile : fiche en bas de l'écran, pas de bulle accrochée à la pastille
    if (MOBILE) { afficherFicheMobile({ id, fiche, photos, direct, barre, reduc, lien }); return; }

    const contenu = `
      ${photos.length ? `
        <div class="cl-media">
          <img class="cl-photo" src="${photos[0]}" alt="" />
          ${photos.length > 1 ? `
            <span class="cl-nav cl-prev" role="button" aria-label="Photo précédente">‹</span>
            <span class="cl-nav cl-next" role="button" aria-label="Photo suivante">›</span>
            <img class="cl-photo-anim" alt="" />
            <div class="cl-dots"><div class="cl-dots-piste">${photos.map(() => `<span class="cl-dot"></span>`).join('')}</div></div>
          ` : ''}
        </div>` : `<div class="cl-noimg"></div>`}
        <div class="infos">
        ${fiche.type === "Chambre d'hôtes" ? `<span class="cl-tag">Chambre d'hôtes</span>` : ''}
        ${fiche.address ? `<p class="lieu">${villePays(fiche.address)}</p>` : ''}
        <p class="titre">${fiche.name || 'Logement'}</p>
        ${fiche.host_name ? `<p class="hote">Hôte : ${fiche.host_name}</p>` : ''}
        <p class="prix">
          Dès ${barre ? `<del>${euros(barre)}</del>` : ''} <b>${euros(direct)}</b> / nuit
          ${reduc ? `<span class="badge">-${reduc}%</span>` : ''}
        </p>
      </div>`;

        // closeOnClick: false → on gère la fermeture nous-mêmes, sans la course qui tuait la fiche
    popupActive = new mapboxgl.Popup({ offset: 30, closeOnClick: false })
      .setLngLat(coords)
      .setHTML(lien
        ? `<a class="cl-popup" href="${lien}" target="_blank" style="text-decoration:none;display:block">${contenu}</a>`
        : `<div class="cl-popup">${contenu}</div>`)
      .addTo(map);

    // Remettre l'état à zéro à la fermeture (croix ou clic extérieur)
    popupActive.on('close', () => {
      if (pillActive) pillActive.classList.remove('actif');
      pillActive = null;
      popupActive = null;
    });

    activerCarrousel(photos);

    // Recadrer si la fiche dépasse du cadre de la carte
    requestAnimationFrame(ajusterVuePopup);
  }

  // Décale la carte du minimum nécessaire pour que la fiche soit entièrement visible
  function ajusterVuePopup() {
    if (!popupActive || !map) return;
    const el = popupActive.getElement();
    if (!el) return;
    const f = el.getBoundingClientRect();
    const c = conteneur.getBoundingClientRect();
    const marge = 12;
    let dx = 0, dy = 0;
    if (f.top < c.top + marge) dy = f.top - (c.top + marge);
    else if (f.bottom > c.bottom - marge) dy = f.bottom - (c.bottom - marge);
    if (f.left < c.left + marge) dx = f.left - (c.left + marge);
    else if (f.right > c.right - marge) dx = f.right - (c.right - marge);
    if (dx || dy) { panPourPopup = true; map.panBy([dx, dy], { duration: 250 }); }
  }

  const demarrer = () => (MOBILE ? brancherBasculeMobile() : init());
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', demarrer);
  else demarrer();
})();
