(function () {
  const conteneur = document.getElementById('map-logements');
  if (!conteneur) return; // ← inerte si la div n'est pas là

  // Sur mobile : on n'initialise pas encore (bascule mobile = étape suivante).
  if (window.innerWidth < 768) return;

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

  // ── Mise en page : carte fixée à droite, contenu de la page décalé à gauche ──
  function poserStyles() {
    const s = document.createElement('style');
    s.id = 'carte-logements-styles';
    s.textContent = `
      body { padding-right: 44vw; }
      #map-logements {
        position: fixed; top: 0; right: 0; width: 44vw; height: 100vh; z-index: 40;
        background: #eceae6;
      }
      #map-logements .cl-compteur {
        position: absolute; top: 14px; left: 50%; transform: translateX(-50%); z-index: 3;
        background: #fff; border: 1px solid rgba(0,0,0,.08); box-shadow: 0 2px 10px rgba(0,0,0,.15);
        border-radius: 22px; padding: 8px 16px; font-size: 13px; font-weight: 600; color: #1a1a1a;
        white-space: nowrap;
      }
      #map-logements .cl-message {
        position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
        text-align: center; padding: 30px; font-size: 14px; color: #555; line-height: 1.6;
      }
      .cl-prix-pill {
        display: inline-flex; align-items: center; background: #fff; color: #1a1a1a;
        font-size: 13px; font-weight: 700; line-height: 1; padding: 7px 11px; border-radius: 22px;
        border: 1px solid rgba(0,0,0,.08); box-shadow: 0 2px 6px rgba(0,0,0,.18);
        cursor: pointer; white-space: nowrap; user-select: none;
        transition: transform .12s ease, background .12s ease, color .12s ease;
      }
      .cl-prix-pill:hover, .cl-prix-pill.actif { background: #1a1a1a; color: #fff; transform: scale(1.06); z-index: 5; }
      .cl-cluster {
        display: flex; align-items: center; justify-content: center; background: #fff; color: #1a1a1a;
        font-weight: 700; border-radius: 50%; border: 1px solid rgba(0,0,0,.08);
        box-shadow: 0 2px 8px rgba(0,0,0,.2); cursor: pointer; user-select: none;
      }
      #map-logements .mapboxgl-popup { max-width: none !important; }
      #map-logements .mapboxgl-popup-content {
        padding: 0; border-radius: 16px; overflow: hidden; width: 220px;
        box-shadow: 0 8px 28px rgba(0,0,0,.22); font-family: inherit;
      }
      #map-logements .mapboxgl-popup-close-button {
        font-size: 20px; color: #fff; right: 6px; top: 4px; z-index: 2; text-shadow: 0 1px 3px rgba(0,0,0,.5);
      }
      .cl-popup img { width: 100%; height: 130px; object-fit: cover; display: block; background: #eee; }
      .cl-popup .infos { padding: 10px 12px 12px; }
      .cl-popup .titre { font-size: 14px; font-weight: 600; margin: 0 0 4px; color: #1a1a1a; }
      .cl-popup .prix { font-size: 13px; margin: 0; color: #1a1a1a; }
      @media (max-width: 767px) { body { padding-right: 0; } #map-logements { display: none; } }
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

    const compteur = document.createElement('div');
    compteur.className = 'cl-compteur';
    compteur.textContent = '…';
    conteneur.appendChild(compteur);

    map = new mapboxgl.Map({ container: 'map-logements', style: STYLE, center: [2.2, 46.6], zoom: 5 });
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'bottom-right');

    const limites = new mapboxgl.LngLatBounds();
    tousLesPoints.forEach(p => limites.extend([p.lng, p.lat]));
    map.fitBounds(limites, { padding: 60, maxZoom: 12, duration: 0 });

    map.on('load', () => {
      map.addSource('logements', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: tousLesPoints.map(p => ({
          type: 'Feature', geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
          properties: { id: p.id, prix: p.prix }
        })) },
        cluster: true, clusterMaxZoom: 13, clusterRadius: 55
      });
      map.addLayer({ id: 'ancre-clusters', type: 'circle', source: 'logements',
        filter: ['has', 'point_count'], paint: { 'circle-radius': 12, 'circle-opacity': 0.01 } });
      map.addLayer({ id: 'ancre-points', type: 'circle', source: 'logements',
        filter: ['!', ['has', 'point_count']], paint: { 'circle-radius': 10, 'circle-opacity': 0.01 } });

      // Synchronisation en fin de déplacement uniquement → pastilles fixes
      map.on('moveend', synchroniser);
      map.on('idle', synchroniser);
      map.on('moveend', () => majCompteur(compteur));
      synchroniser();
      majCompteur(compteur);
    });
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
            if (!err) map.easeTo({ center: f.geometry.coordinates, zoom: zoom + 0.3 });
          });
        });
      } else {
        const id = f.properties.id, prix = f.properties.prix, coords = f.geometry.coordinates;
        el.className = 'cl-prix-pill';
        el.textContent = euros(prix);
        el.addEventListener('click', () => ouvrirFiche(id, prix, coords, el));
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
    el.textContent = `${n} logement${n > 1 ? 's' : ''} dans cette zone`;
  }

  async function ouvrirFiche(id, prix, coords, el) {
    if (pillActive) pillActive.classList.remove('actif');
    el.classList.add('actif'); pillActive = el;

    let fiche = {};
    if (!MODE_DEMO) {
      if (cacheFiches.has(id)) fiche = cacheFiches.get(id);
      else {
        try {
          const r = await fetch(`${API}/property-metadata/${encodeURIComponent(id)}`);
          if (r.ok) { fiche = await r.json(); cacheFiches.set(id, fiche); }
        } catch (e) { /* fiche minimale */ }
      }
    }
    const img = fiche.image || fiche.image1 || '';
    new mapboxgl.Popup({ offset: 18 })
      .setLngLat(coords)
      .setHTML(`<div class="cl-popup">
          ${img ? `<img src="${img}" alt="" loading="lazy" />` : ''}
          <div class="infos">
            <p class="titre">${fiche.name || 'Logement'}</p>
            <p class="prix"><b>${euros(prix)}</b> / nuit</p>
          </div></div>`)
      .addTo(map);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
