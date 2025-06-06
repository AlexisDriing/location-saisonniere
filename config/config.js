// Configuration globale avec optimisations
const CONFIG = {
  API_URL: 'https://ical-proxy-stdn.onrender.com',
  MAPBOX_API_KEY: null,
  UPDATE_INTERVAL: 4 * 60 * 60 * 1000, // 4 heures
  CACHE_PREFIX: 'calendar_cache_',
  
  // 🚀 NOUVELLES OPTIONS DE PERFORMANCE
  PERFORMANCE: {
    enableDebug: false,              // false en production
    logTimings: true,               // mesurer les temps de chargement
    maxConcurrentRequests: 5,       // limite les requêtes simultanées
    lazyLoadDelay: 100,             // délai avant chargement automatique
    moduleLoadTimeout: 5000,        // timeout pour le chargement des modules
    cacheSize: 100,                 // taille max du cache en mémoire
    debounceDelay: 300              // délai pour les recherches (anti-spam)
  }
};

// Export pour utilisation dans d'autres modules
window.CONFIG = CONFIG;
console.log('✅ Config chargée:', CONFIG);
