// Page accueil - Point d'entrée principal
class AccueilPage {
  constructor() {
    this.managers = {};
    this.init();
  }

  async init() {
    console.log('🏠 Initialisation de la page accueil...');
    
    // Charger les dépendances externes
    await this.loadExternalDependencies();
    
    // Initialiser les gestionnaires
    this.initializeManagers();
    
    console.log('✅ Page accueil initialisée');
  }

  async loadExternalDependencies() {
    // Charger jQuery si pas disponible
    if (typeof jQuery === 'undefined') {
      await this.loadScript('https://code.jquery.com/jquery-3.6.0.min.js');
    }
    
    // Charger Moment.js
    if (typeof moment === 'undefined') {
      await this.loadScript('https://cdn.jsdelivr.net/momentjs/latest/moment.min.js');
      await this.loadScript('https://cdn.jsdelivr.net/momentjs/latest/locale/fr.js');
    }
    
    // Charger DateRangePicker
    if (typeof jQuery !== 'undefined' && !jQuery.fn.daterangepicker) {
      await this.loadScript('https://cdn.jsdelivr.net/npm/daterangepicker/daterangepicker.min.js');
      this.loadStylesheet('https://cdn.jsdelivr.net/npm/daterangepicker/daterangepicker.css');
    }
  }

  loadScript(url) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = url;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  loadStylesheet(url) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = url;
    document.head.appendChild(link);
  }

  initializeManagers() {
    try {
      // Initialiser les modules
      this.managers.searchMap = new SearchMapManager();
      this.managers.calendarList = new CalendarListManager();
      this.managers.homeSearch = new HomeSearch();
      
      console.log('✅ Modules initialisés:', Object.keys(this.managers));
      
    } catch (error) {
      console.error('❌ Erreur initialisation:', error);
    }
  }
}

// Initialisation automatique
document.addEventListener('DOMContentLoaded', () => {
  // Vérifier qu'on est sur la page d'accueil
  if (document.getElementById('button-search-home')) {
    setTimeout(() => {
      window.accueilPage = new AccueilPage();
    }, 100);
  }
});

// Export global
window.AccueilPage = AccueilPage;
