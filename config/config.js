// Configuration globale avec optimisations
const CONFIG = {
  API_URL: 'https://ical-proxy-stdn.onrender.com',
  MAPBOX_API_KEY: null,
  UPDATE_INTERVAL: 4 * 60 * 60 * 1000, // 4 heures
  CACHE_PREFIX: 'calendar_cache_',
};

// Export pour utilisation dans d'autres modules
window.CONFIG = CONFIG;
console.log('✅ Config chargée:', CONFIG);
