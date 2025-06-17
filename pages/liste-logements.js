// Page liste - Point d'entrée principal qui orchestre tous les modules - VERSION CORRIGÉE
class ListeLogementsPage {
  constructor() {
    this.managers = {};
    this.lazyModules = {
      filters: false,
      searchMap: false,
      calendarList: false,
      propertyManager: false // On garde le tracking mais PropertyManager va se charger automatiquement
    };
    this.initStartTime = performance.now();
    this.init();
  }

  async init() {
    console.log('🏘️ Initialisation de la page liste des logements...');
    
    // Charger les dépendances externes si nécessaires
    await this.loadExternalDependencies();
    
    // Initialiser tous les gestionnaires dans le bon ordre
    this.initializeManagers();
    
    const totalTime = Math.round(performance.now() - this.initStartTime);
    console.log(`✅ Page liste initialisée avec succès en ${totalTime}ms`);
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

  // 🚀 NOUVELLE MÉTHODE : Initialisation intelligente par phases
  initializeManagers() {
    try {
      // 🚀 PHASE 1 : Modules essentiels (chargement immédiat)
      this.loadEssentialModules();
      
      // 🚀 PHASE 2 : Modules secondaires (chargement différé)
      const delay = window.CONFIG?.PERFORMANCE?.lazyLoadDelay || 100;
      setTimeout(() => {
        this.loadSecondaryModules();
      }, delay);
      
      // 🚀 PHASE 3 : Configuration du chargement à la demande SAUF PropertyManager
      this.setupLazyLoading();
      
      // 🚀 FIX : PropertyManager se charge automatiquement après les autres modules
      setTimeout(() => {
        this.loadPropertyManagerAutomatically();
      }, delay + 200); // 300ms après le début
      
      console.log('✅ Gestionnaires initialisés en mode optimisé');
      
    } catch (error) {
      console.error('❌ Erreur lors de l\'initialisation des gestionnaires:', error);
    }
  }

  // 🚀 PHASE 1 : Modules indispensables pour l'affichage de base
  loadEssentialModules() {
    console.log('🚀 Phase 1: Chargement modules essentiels...');
    const startTime = performance.now();
    
    // Ces modules sont nécessaires pour que la page s'affiche correctement
    this.managers.uiElements = new UIElementsManager();
    this.managers.addressFormatter = new AddressFormatterManager();
    this.managers.forms = new FormsManager();
    
    const loadTime = Math.round(performance.now() - startTime);
    if (window.CONFIG?.PERFORMANCE?.logTimings) {
      console.log(`✅ Modules essentiels chargés en ${loadTime}ms`);
    }
  }

  // 🚀 PHASE 2 : Modules pour les fonctionnalités avancées
  loadSecondaryModules() {
    console.log('🚀 Phase 2: Chargement modules secondaires...');
    const startTime = performance.now();
    
    // Ces modules améliorent l'expérience mais ne sont pas critiques
    this.managers.priceList = new PriceListManager();
    this.managers.mobileSync = new MobileSyncManager();
    
    const loadTime = Math.round(performance.now() - startTime);
    if (window.CONFIG?.PERFORMANCE?.logTimings) {
      console.log(`✅ Modules secondaires chargés en ${loadTime}ms`);
    }
  }

  // 🚀 FIX : PropertyManager se charge automatiquement (pas à la demande)
  async loadPropertyManagerAutomatically() {
    if (!this.lazyModules.propertyManager) {
      console.log('🏠 Chargement automatique de PropertyManager...');
      const startTime = performance.now();
      
      // S'assurer que les dépendances optionnelles sont chargées
      await this.loadFiltersIfNeeded();
      await this.loadSearchAndCalendarIfNeeded();
      
      this.managers.propertyManager = new PropertyManager();
      this.lazyModules.propertyManager = true;
      
      const loadTime = Math.round(performance.now() - startTime);
      if (window.CONFIG?.PERFORMANCE?.logTimings) {
        console.log(`✅ PropertyManager chargé automatiquement en ${loadTime}ms`);
      }
    }
    return this.managers.propertyManager;
  }

  // 🚀 PHASE 3 : Configuration du chargement à la demande (sans PropertyManager)
  setupLazyLoading() {
    console.log('🚀 Phase 3: Configuration chargement à la demande...');
    
    // Écouter les interactions utilisateur pour charger les modules au bon moment
    this.setupUserInteractionListeners();
    
    // Pré-charger après un délai si l'utilisateur reste sur la page
    setTimeout(() => {
      this.preloadIfUserStaysOnPage();
    }, 3000); // Après 3 secondes
  }

  // 🚀 NOUVEAU : Écouter les interactions pour charger les modules
  setupUserInteractionListeners() {
    // Charger les filtres seulement si l'utilisateur interagit avec
    document.addEventListener('click', (e) => {
      // Détection des clics sur les filtres
      if (e.target.closest('[id*="filtre-"], .button-filtre, .w-checkbox, .bloc-slider')) {
        this.loadFiltersIfNeeded();
      }
      
      // Détection des clics sur la recherche ou les dates
      if (e.target.closest('#search-input, #search-input-mobile, .dates-button-search')) {
        this.loadSearchAndCalendarIfNeeded();
      }
    });
    
    // Charger au focus sur les champs de recherche
    document.addEventListener('focusin', (e) => {
      if (e.target.matches('#search-input, #search-input-mobile')) {
        this.loadSearchAndCalendarIfNeeded();
      }
    });
  }

  // 🚀 NOUVEAU : Pré-chargement si l'utilisateur reste sur la page
  preloadIfUserStaysOnPage() {
    console.log('⏰ Utilisateur présent depuis 3s, pré-chargement des modules...');
    
    // Si l'utilisateur est toujours là après 3 secondes, on peut pré-charger
    this.loadFiltersIfNeeded();
    this.loadSearchAndCalendarIfNeeded();
  }

  // 🚀 CHARGEMENT À LA DEMANDE : Filtres
  async loadFiltersIfNeeded() {
    if (!this.lazyModules.filters) {
      console.log('🔄 Chargement FiltersManager à la demande...');
      const startTime = performance.now();
      
      this.managers.filters = new FiltersManager();
      this.lazyModules.filters = true;
      
      const loadTime = Math.round(performance.now() - startTime);
      if (window.CONFIG?.PERFORMANCE?.logTimings) {
        console.log(`✅ FiltersManager chargé en ${loadTime}ms`);
      }
    }
    return this.managers.filters;
  }

  // 🚀 CHARGEMENT À LA DEMANDE : Recherche et Calendrier
  async loadSearchAndCalendarIfNeeded() {
    if (!this.lazyModules.searchMap) {
      console.log('🔄 Chargement SearchMap et Calendar à la demande...');
      const startTime = performance.now();
      
      this.managers.searchMap = new SearchMapManager();
      this.managers.calendarList = new CalendarListManager();
      this.lazyModules.searchMap = true;
      this.lazyModules.calendarList = true;
      
      const loadTime = Math.round(performance.now() - startTime);
      if (window.CONFIG?.PERFORMANCE?.logTimings) {
        console.log(`✅ Search et Calendar chargés en ${loadTime}ms`);
      }
    }
  }

  // 🚀 MÉTHODE PUBLIQUE : Accès sécurisé au PropertyManager
  async getPropertyManager() {
    // PropertyManager se charge automatiquement maintenant, donc on attend qu'il soit prêt
    let attempts = 0;
    const maxAttempts = 50; // 5 secondes max
    
    while (!this.managers.propertyManager && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    return this.managers.propertyManager;
  }

  // 🚀 MÉTHODE PUBLIQUE : Vérifier si un module est chargé
  isModuleLoaded(moduleName) {
    return this.lazyModules[moduleName] || false;
  }

  // 🚀 MÉTHODE PUBLIQUE : Forcer le chargement de tous les modules
  async loadAllModules() {
    console.log('🚀 Chargement forcé de tous les modules...');
    await this.loadFiltersIfNeeded();
    await this.loadSearchAndCalendarIfNeeded();
    await this.loadPropertyManagerAutomatically();
    console.log('✅ Tous les modules chargés');
  }

  // Méthodes utilitaires pour débuggage (inchangées)
  getManager(name) {
    return this.managers[name];
  }

  getAllManagers() {
    return this.managers;
  }

  // 🚀 AMÉLIORÉ : Redémarrage avec nettoyage
  restart() {
    console.log('🔄 Redémarrage de la page...');
    
    // Nettoyer les anciens managers
    Object.values(this.managers).forEach(manager => {
      if (manager && typeof manager.destroy === 'function') {
        manager.destroy();
      }
    });
    
    this.managers = {};
    this.lazyModules = {
      filters: false,
      searchMap: false,
      calendarList: false,
      propertyManager: false
    };
    
    this.initializeManagers();
  }

  // 🚀 NOUVEAU : Méthode pour obtenir les stats de performance
  getPerformanceStats() {
    const loadedModules = Object.keys(this.lazyModules).filter(key => this.lazyModules[key]);
    const totalModules = Object.keys(this.lazyModules).length;
    
    return {
      totalInitTime: Math.round(performance.now() - this.initStartTime),
      loadedModules: loadedModules,
      loadedCount: loadedModules.length,
      totalModules: totalModules,
      loadingPercentage: Math.round((loadedModules.length / totalModules) * 100),
      managers: Object.keys(this.managers),
      propertyManagerReady: !!this.managers.propertyManager
    };
  }

  // Méthode pour rafraîchir les données (inchangée)
  refresh() {
    console.log('🔄 Rafraîchissement des données...');
    
    if (this.managers.propertyManager) {
      this.managers.propertyManager.applyFilters();
    }
    
    if (this.managers.addressFormatter) {
      this.managers.addressFormatter.refresh();
    }
    
    if (this.managers.priceList) {
      this.managers.priceList.resetAllPrices();
    }
  }
}

// Initialisation automatique quand le DOM est prêt
document.addEventListener('DOMContentLoaded', () => {
  // Petit délai pour s'assurer que CONFIG est chargé
  setTimeout(() => {
    window.listeLogementsPage = new ListeLogementsPage();
    
    // 🚀 NOUVEAU : Debugging global
    if (window.CONFIG?.PERFORMANCE?.enableDebug) {
      // Ajouter des méthodes globales pour le debugging
      window.debugListePage = {
        stats: () => window.listeLogementsPage.getPerformanceStats(),
        loadAll: () => window.listeLogementsPage.loadAllModules(),
        restart: () => window.listeLogementsPage.restart(),
        getManager: (name) => window.listeLogementsPage.getManager(name),
        getPropertyManager: () => window.listeLogementsPage.getPropertyManager()
      };
      console.log('🐛 Mode debug activé. Utilisez window.debugListePage pour débugger');
    }
  }, 100);
});

// Export global pour debugging
window.ListeLogementsPage = ListeLogementsPage;
