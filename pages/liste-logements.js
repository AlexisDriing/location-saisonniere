// Page liste - Point d'entrée principal qui orchestre tous les modules
class ListeLogementsPage {
  constructor() {
    this.managers = {};
    this.init();
  }

  async init() {
    console.log('🏘️ Initialisation de la page liste des logements...');
    
    // Charger les dépendances externes si nécessaires
    await this.loadExternalDependencies();
    
    // Initialiser tous les gestionnaires dans le bon ordre
    this.initializeManagers();
    
    console.log('✅ Page liste initialisée avec succès');
  }

  async loadExternalDependencies() {
    // Charger Moment.js si pas disponible
    if (typeof moment === 'undefined') {
      await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.29.1/moment.min.js');
      await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.29.1/locale/fr.js');
    } else {
      if (typeof moment.locale === 'function' && moment.locale() !== 'fr') {
        await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.29.1/locale/fr.js');
        moment.locale('fr');
      }
    }
    
    // Charger DateRangePicker si pas disponible
    if (typeof jQuery === 'undefined' || typeof jQuery.fn.daterangepicker === 'undefined') {
      if (typeof jQuery === 'undefined') {
        console.log('jQuery déjà chargé dans Webflow');
      }
      await this.loadScript('https://cdn.jsdelivr.net/npm/daterangepicker/daterangepicker.min.js');
      this.loadStylesheet('https://cdn.jsdelivr.net/npm/daterangepicker/daterangepicker.css');
    }
  }

  loadScript(url) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.type = 'text/javascript';
      script.src = url;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  loadStylesheet(url) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.type = 'text/css';
    link.href = url;
    document.head.appendChild(link);
  }

  initializeManagers() {
    try {
      // 1. Éléments UI - PREMIER (création des conteneurs)
      this.managers.uiElements = new UIElementsManager();
      
      // 2. Formatage des adresses - DEUXIÈME
      this.managers.addressFormatter = new AddressFormatterManager();
      
      // 3. Gestion des formulaires - TROISIÈME
      this.managers.forms = new FormsManager();
      
      // 4. Gestion des propriétés - QUATRIÈME (cœur de la page)
      this.managers.propertyManager = new PropertyManager();
      
      // 5. Gestion des filtres - CINQUIÈME
      this.managers.filters = new FiltersManager();
      
      // 6. Recherche géographique - SIXIÈME
      this.managers.searchMap = new SearchMapManager();
      
      // 7. Calendrier liste - SEPTIÈME
      this.managers.calendarList = new CalendarListManager();
      
      // 8. Prix liste - HUITIÈME
      this.managers.priceList = new PriceListManager();
      
      // 9. Synchronisation mobile - NEUVIÈME
      this.managers.mobileSync = new MobileSyncManager();
      
      console.log('✅ Tous les gestionnaires initialisés:', Object.keys(this.managers));
      
    } catch (error) {
      console.error('❌ Erreur lors de l\'initialisation des gestionnaires:', error);
    }
  }

  // Méthodes utilitaires pour débuggage
  getManager(name) {
    return this.managers[name];
  }

  getAllManagers() {
    return this.managers;
  }

  restart() {
    console.log('🔄 Redémarrage de la page...');
    this.managers = {};
    this.initializeManagers();
  }

  // Méthode pour rafraîchir les données
  refresh() {
    console.log('🔄 Rafraîchissement des données...');
    
    // Rafraîchir les propriétés
    if (this.managers.propertyManager) {
      this.managers.propertyManager.applyFilters();
    }
    
    // Rafraîchir les adresses
    if (this.managers.addressFormatter) {
      this.managers.addressFormatter.refresh();
    }
    
    // Rafraîchir les prix
    if (this.managers.priceList) {
      this.managers.priceList.resetAllPrices();
    }
  }
}

// Initialisation automatique quand le DOM est prêt
document.addEventListener('DOMContentLoaded', () => {
  // Petit délai pour s'assurer que tous les modules sont chargés
  setTimeout(() => {
    window.listeLogementsPage = new ListeLogementsPage();
  }, 500);
});

// Export global pour debugging
window.ListeLogementsPage = ListeLogementsPage;
