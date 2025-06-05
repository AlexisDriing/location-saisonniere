// Page liste des logements - Point d'entrée principal qui orchestre tous les modules
class ListeLogementsPage {
  constructor() {
    this.managers = {};
    this.initialized = false;
    this.init();
  }

  async init() {
    console.log('🏠 Initialisation de la page liste des logements...');
    
    // Charger les dépendances externes si nécessaires
    await this.loadExternalDependencies();
    
    // Initialiser tous les gestionnaires dans le bon ordre
    this.initializeManagers();
    
    // Configuration finale
    this.setupFinalConfiguration();
    
    this.initialized = true;
    console.log('✅ Page liste initialisée avec succès');
  }

  async loadExternalDependencies() {
    console.log('📦 Chargement des dépendances externes...');
    
    // Charger Moment.js si pas disponible
    if (typeof moment === 'undefined') {
      await this.loadScript('https://cdn.jsdelivr.net/momentjs/latest/moment.min.js');
      await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.29.1/locale/fr.js');
      moment.locale('fr');
    } else {
      if (typeof moment.locale === 'function' && moment.locale() !== 'fr') {
        await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.29.1/locale/fr.js');
        moment.locale('fr');
      }
    }
    
    // Charger DateRangePicker si pas disponible
    if (typeof jQuery !== 'undefined' && typeof jQuery.fn.daterangepicker === 'undefined') {
      await this.loadScript('https://cdn.jsdelivr.net/npm/daterangepicker/daterangepicker.min.js');
      this.loadStylesheet('https://cdn.jsdelivr.net/npm/daterangepicker/daterangepicker.css');
    }
    
    console.log('✅ Dépendances externes chargées');
  }

  initializeManagers() {
    try {
      console.log('🔧 Initialisation des gestionnaires...');
      
      // 1. Interface et formulaires de base - PREMIER
      this.setupBasicInterface();
      
      // 2. Gestionnaire d'interface (popins, etc.) - DEUXIÈME
      this.managers.interface = new InterfaceManager();
      
      // 3. Calculateur de prix pour cartes - TROISIÈME
      this.managers.priceCalculator = new ListPriceCalculator();
      
      // 4. Calendrier pour la liste - QUATRIÈME
      this.managers.calendar = new ListCalendarManager();
      
      // 5. Recherche géographique - CINQUIÈME
      this.managers.searchMap = new SearchMapManager();
      
      // 6. Gestionnaire de filtres - SIXIÈME
      this.managers.filters = new FiltersManager();
      
      // 7. Gestionnaire principal des propriétés - SEPTIÈME (dépend de tous les autres)
      this.managers.properties = new PropertyManager();
      
      // 8. Améliorations mobile - DERNIER
      this.managers.mobileEnhancements = new MobileEnhancementsManager();
      this.setupMobileSpecificFeatures();
      
      console.log('✅ Tous les gestionnaires initialisés:', Object.keys(this.managers));
      
    } catch (error) {
      console.error('❌ Erreur lors de l\'initialisation des gestionnaires:', error);
    }
  }

  setupBasicInterface() {
    console.log('🎨 Configuration de l\'interface de base...');
    
    // Désactiver la soumission des formulaires
    this.preventFormSubmissions();
    
    // Nettoyer les adresses
    this.cleanAddresses();
    
    // Ajouter les éléments d'interface nécessaires
    this.createUIElements();
  }

  preventFormSubmissions() {
    // Bloquer la soumission du formulaire desktop
    const formDesktop = document.getElementById('form-desktop');
    const searchInput = document.getElementById('search-input');

    if (formDesktop && searchInput) {
      formDesktop.onsubmit = function (e) {
        e.preventDefault();
        e.stopPropagation();
        console.log("Soumission bloquée");
        return false;
      };
    }
    
    // Bloquer les autres formulaires de recherche
    document.querySelectorAll('form').forEach(form => {
      if (form.querySelector('#search-input') || form.querySelector('#search-input-mobile')) {
        form.addEventListener('submit', (e) => {
          e.preventDefault();
          e.stopPropagation();
          return false;
        });
      }
    });
  }

  cleanAddresses() {
    // Nettoyer l'affichage des adresses
    document.querySelectorAll(".adresse").forEach(el => {
      const adresseTexte = el.textContent.trim();
      const adresseParts = adresseTexte.split(",").map(part => part.trim());
      if (adresseParts.length < 2) return;

      const villePays = adresseParts.slice(-2).join(", ");
      el.textContent = villePays;
    });
  }

  createUIElements() {
    // Créer les éléments d'UI nécessaires pour la pagination et les messages
    setTimeout(() => {
      this.createPaginationContainer();
      this.createLoadingIndicator();
      this.createMessageElements();
    }, 500);
  }

  createPaginationContainer() {
    if (!document.querySelector('.custom-pagination')) {
      const collectionList = document.querySelector('.collection-list-wrapper');
      if (collectionList) {
        const paginationContainer = document.createElement('div');
        paginationContainer.className = 'custom-pagination';
        collectionList.parentNode.insertBefore(paginationContainer, collectionList.nextSibling);
      }
    }
  }

  createLoadingIndicator() {
    if (!document.querySelector('.loading-indicator')) {
      const collectionList = document.querySelector('.collection-list-wrapper');
      if (collectionList) {
        const loadingIndicator = document.createElement('div');
        loadingIndicator.className = 'loading-indicator';
        loadingIndicator.innerHTML = '<div class="spinner"></div>';
        loadingIndicator.style.display = 'none';
        collectionList.parentNode.insertBefore(loadingIndicator, collectionList);
      }
    }
  }

  createMessageElements() {
    const collectionList = document.querySelector('.collection-list-wrapper');
    if (!collectionList) return;
    
    // Message "aucun résultat"
    if (!document.querySelector('.no-results-message')) {
      const noResultsMessage = document.createElement('div');
      noResultsMessage.className = 'no-results-message';
      noResultsMessage.innerHTML = 'Aucun logement ne correspond à vos critères de recherche.<br>Essayez de modifier vos filtres.';
      noResultsMessage.style.display = 'none';
      collectionList.parentNode.insertBefore(noResultsMessage, collectionList);
    }
    
    // Message d'erreur
    if (!document.querySelector('.error-message')) {
      const errorMessage = document.createElement('div');
      errorMessage.className = 'error-message';
      errorMessage.innerHTML = 'Une erreur est survenue lors du chargement des logements.<br>Veuillez réessayer ultérieurement.';
      errorMessage.style.display = 'none';
      collectionList.parentNode.insertBefore(errorMessage, collectionList);
    }
  }

  setupMobileSpecificFeatures() {
    console.log('📱 Configuration des fonctionnalités mobiles...');
    
    // Gestion du scroll pour la popup mobile des filtres
    this.setupMobileFiltersPopup();
    
    // Synchronisation des calendriers mobile/desktop
    this.setupCalendarSynchronization();
  }

  setupMobileFiltersPopup() {
    const mobileFiltersPopup = document.querySelector(".pop-filtres-mobile");
    if (!mobileFiltersPopup) return;
    
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === "style") {
          if (mobileFiltersPopup.style.display === "block") {
            document.body.classList.add("no-scroll");
            document.body.style.overflow = "hidden";
            document.body.style.position = "fixed";
            document.body.style.width = "100%";
          } else {
            document.body.classList.remove("no-scroll");
            document.body.style.overflow = "";
            document.body.style.position = "";
            document.body.style.width = "";
          }
        }
      });
    });
    
    observer.observe(mobileFiltersPopup, { attributes: true });
    
    // État initial
    if (mobileFiltersPopup.style.display === "block") {
      document.body.classList.add("no-scroll");
      document.body.style.overflow = "hidden";
      document.body.style.position = "fixed";
      document.body.style.width = "100%";
    }
  }

  setupCalendarSynchronization() {
    // Cette fonction sera gérée par ListCalendarManager
    // mais on peut ajouter une logique supplémentaire ici si nécessaire
    console.log('📅 Synchronisation des calendriers configurée');
  }

  setupFinalConfiguration() {
    console.log('⚙️ Configuration finale...');
    
    // Gestionnaire global des clics de pagination
    this.setupPaginationClickHandler();
    
    // Gestionnaire des changements de voyageurs
    this.setupTravelersUpdateHandler();
    
    // Charger les styles CSS
    this.loadCustomStyles();
    
    // Écouter les données de recherche stockées
    this.loadStoredSearchData();
  }

  setupPaginationClickHandler() {
    // Le gestionnaire est déjà défini dans PropertyManager
    // Mais on s'assure qu'il fonctionne
    document.addEventListener('click', (e) => {
      const link = e.target.closest('.pagination-link');
      if (link && window.propertyManager) {
        e.preventDefault();
        
        const page = link.getAttribute('data-page');
        if (!page) return;
        
        console.log('🖱️ Clic pagination:', page);
        
        if (page === 'prev' && window.propertyManager.currentPage > 1) {
          window.propertyManager.changePage(window.propertyManager.currentPage - 1);
        } else if (page === 'next' && window.propertyManager.currentPage < window.propertyManager.totalPages) {
          window.propertyManager.changePage(window.propertyManager.currentPage + 1);
        } else if (page !== 'prev' && page !== 'next') {
          const pageNum = parseInt(page, 10);
          if (!isNaN(pageNum)) {
            window.propertyManager.changePage(pageNum);
          }
        }
      }
    });
  }

  setupTravelersUpdateHandler() {
    // Gestionnaire pour mettre à jour localStorage quand les voyageurs changent
    document.addEventListener('click', (e) => {
      const buttonId = e.target.id;
      const isCounterButton = [
        'adultes-plus', 'adultes-moins', 'enfants-plus', 'enfants-moins',
        'adultes-plus-mobile', 'adultes-moins-mobile', 
        'enfants-plus-mobile', 'enfants-moins-mobile'
      ].includes(buttonId);
      
      if (isCounterButton) {
        setTimeout(() => {
          const adultsElement = document.getElementById('chiffres-adultes');
          const enfantsElement = document.getElementById('chiffres-enfants');
          
          const storedDataJSON = localStorage.getItem('selected_search_data');
          if (storedDataJSON && adultsElement && enfantsElement) {
            try {
              const storedData = JSON.parse(storedDataJSON);
              
              storedData.adultes = parseInt(adultsElement.textContent, 10);
              storedData.enfants = parseInt(enfantsElement.textContent, 10);
              storedData.timestamp = Date.now();
              
              localStorage.setItem('selected_search_data', JSON.stringify(storedData));
              console.log('👥 Données voyageurs mises à jour:', storedData);
            } catch (error) {
              console.error('❌ Erreur mise à jour voyageurs:', error);
            }
          }
        }, 50);
      }
    });
  }

  loadStoredSearchData() {
    // Charger les données de recherche stockées au démarrage
    const storedData = localStorage.getItem('selected_search_data');
    if (!storedData) return;
    
    try {
      const searchData = JSON.parse(storedData);
      
      // Vérifier si les données ne sont pas trop anciennes (24h)
      if (Date.now() - searchData.timestamp >= 24 * 60 * 60 * 1000) {
        localStorage.removeItem('selected_search_data');
        return;
      }
      
      console.log('💾 Données de recherche trouvées dans localStorage:', searchData);
      
      // Les données seront appliquées par les gestionnaires individuels
      // quand ils seront prêts
      
    } catch (error) {
      console.error('❌ Erreur lors du chargement des données stockées:', error);
      localStorage.removeItem('selected_search_data');
    }
  }

  loadCustomStyles() {
    // Les styles sont maintenant gérés dans Webflow
    console.log('📎 Styles gérés dans Webflow - module allégé');
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

  // ================================
  // MÉTHODES UTILITAIRES POUR DEBUGGING
  // ================================

  getManager(name) {
    return this.managers[name];
  }

  getAllManagers() {
    return this.managers;
  }

  getState() {
    const state = {
      initialized: this.initialized,
      managers: {}
    };
    
    Object.keys(this.managers).forEach(key => {
      const manager = this.managers[key];
      if (manager && typeof manager.getState === 'function') {
        state.managers[key] = manager.getState();
      } else {
        state.managers[key] = 'Initialized';
      }
    });
    
    return state;
  }

  restart() {
    console.log('🔄 Redémarrage de la page...');
    this.managers = {};
    this.initialized = false;
    this.initializeManagers();
    this.setupFinalConfiguration();
    this.initialized = true;
    console.log('✅ Page redémarrée');
  }

  // ================================
  // MÉTHODES DE DIAGNOSTIC
  // ================================

  diagnose() {
    console.log('🔍 Diagnostic de la page liste des logements:');
    console.log('- Initialisée:', this.initialized);
    console.log('- Gestionnaires:', Object.keys(this.managers));
    
    // Vérifier les éléments DOM critiques
    const criticalElements = [
      '.collection-grid',
      '.custom-pagination',
      '.dates-button-search',
      '#search-input',
      '.housing-item'
    ];
    
    criticalElements.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      console.log(`- ${selector}:`, elements.length, 'éléments trouvés');
    });
    
    // Vérifier les gestionnaires
    Object.keys(this.managers).forEach(key => {
      const manager = this.managers[key];
      console.log(`- ${key}:`, manager ? 'OK' : 'MANQUANT');
    });
    
    // Vérifier les exports globaux
    const globalObjects = [
      'window.propertyManager',
      'window.filtersManager', 
      'window.searchMapManager',
      'window.listCalendarManager'
    ];
    
    globalObjects.forEach(objPath => {
      const obj = objPath.split('.').reduce((o, i) => o[i], window);
      console.log(`- ${objPath}:`, obj ? 'OK' : 'MANQUANT');
    });
    
    return this.getState();
  }
}

// Calculateur de prix simplifié pour les cartes de logement
class ListPriceCalculator {
  constructor() {
    this.init();
  }

  init() {
    console.log('💰 Initialisation ListPriceCalculator...');
    this.setupPriceCalculators();
    console.log('✅ ListPriceCalculator initialisé');
  }

  setupPriceCalculators() {
    document.querySelectorAll(".prix-container").forEach(container => {
      new SinglePropertyPriceCalculator(container);
    });
  }
}

// Calculateur pour une seule propriété
class SinglePropertyPriceCalculator {
  constructor(container) {
    this.container = container;
    this.pricingData = null;
    this.logementType = "";
    this.elements = {
      textePrix: container.querySelector(".texte-prix"),
      texteTotal: container.querySelector(".text-total"),
      pourcentage: container.querySelector(".pourcentage")
    };
    this.datesSelected = false;
    
    // Vérifier si des dates sont déjà sélectionnées
    if (window.propertyManager && window.propertyManager.startDate && window.propertyManager.endDate) {
      this.datesSelected = true;
    }
    
    this.init();
  }

  init() {
    this.loadPricingData();
    if (!this.datesSelected) {
      this.updatePriceDisplay();
    }
  }

  loadPricingData() {
    const element = this.container.querySelector("[data-json-tarifs-line], [data-json-tarifs]");
    if (element) {
      const attribute = element.getAttribute("data-json-tarifs-line") || element.getAttribute("data-json-tarifs");
      if (attribute) {
        try {
          this.pricingData = JSON.parse(attribute);
        } catch (error) {
          console.error("Erreur lors du parsing des données de tarification:", error);
        }
      }
    }
  }

  updatePriceDisplay() {
    if (!this.pricingData || !this.pricingData.seasons) return;
    
    let minPrice = Infinity;
    let platformPrice = 0;
    let bestSeason = null;
    
    for (const season of this.pricingData.seasons) {
      if (season.price < minPrice) {
        minPrice = season.price;
        bestSeason = season;
        platformPrice = this.getPlatformPrice(season);
      }
    }
    
    if (!isFinite(minPrice) || !bestSeason) return;
    
    // Mettre à jour le prix
    if (this.elements.textePrix) {
      const discountText = platformPrice > minPrice ? `<del>${Math.round(platformPrice)}€</del> ` : "";
      this.elements.textePrix.innerHTML = `Dès ${discountText}<strong>${Math.round(minPrice)}€ / nuit</strong>`;
    }
    
    // Masquer le total pour l'affichage par défaut
    if (this.elements.texteTotal) {
      this.elements.texteTotal.style.display = "none";
    }
    
    // Mettre à jour le pourcentage
    if (this.elements.pourcentage) {
      if (platformPrice > minPrice) {
        this.elements.pourcentage.textContent = `-${Math.round(100 * (platformPrice - minPrice) / platformPrice)}%`;
        this.elements.pourcentage.style.display = "block";
      } else {
        this.elements.pourcentage.style.display = "none";
      }
    }
  }

  getPlatformPrice(season) {
    if (!season) return 0;
    
    const usePercentage = this.pricingData.platformPricing && this.pricingData.platformPricing.usePercentage === true;
    
    if (!usePercentage && season.platformPrices) {
      const prices = Object.values(season.platformPrices);
      if (prices.length > 0) {
        return prices.reduce((a, b) => a + b, 0) / prices.length;
      }
    }
    
    if (this.pricingData.platformMarkup && this.pricingData.platformMarkup.percentage) {
      return season.price * (1 + this.pricingData.platformMarkup.percentage / 100);
    }
    
    return season.price;
  }
}

// Initialisation automatique quand le DOM est prêt
document.addEventListener('DOMContentLoaded', () => {
  // Petit délai pour s'assurer que tous les modules sont chargés
  setTimeout(() => {
    window.listeLogementsPage = new ListeLogementsPage();
  }, 100);
});

// Exports globaux pour debugging
window.ListeLogementsPage = ListeLogementsPage;
window.ListPriceCalculator = ListPriceCalculator;
window.SinglePropertyPriceCalculator = SinglePropertyPriceCalculator;
