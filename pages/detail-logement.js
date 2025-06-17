// Page détail - Point d'entrée principal qui orchestre tous les modules
class DetailLogementPage {
  constructor() {
    this.managers = {};
    this.init();
  }

  async init() {
    console.log('🏠 Initialisation de la page détail du logement...');
    
    // Charger les dépendances externes si nécessaires
    await this.loadExternalDependencies();
    
    // Initialiser tous les gestionnaires dans le bon ordre
    this.initializeManagers();
    
    console.log('✅ Page détail initialisée avec succès');
    // Attendre que les données soient chargées puis cacher le loader
    setTimeout(() => {
      // Vérifier si des dates de recherche existent
      const hasStoredData = localStorage.getItem('selected_search_data');
      const datesTexte = document.getElementById('dates-texte');
      const totalPrix = document.getElementById('total-prix');
      
      // Si pas de données sauvegardées OU si les éléments sont déjà mis à jour
      if (!hasStoredData || 
          (datesTexte && datesTexte.textContent !== 'Sélectionner une date') ||
          (totalPrix && totalPrix.textContent !== '-')) {
        console.log('✅ Page prête, on cache le loader');
        window.hidePageLoader();
      } else {
        // Les données existent mais pas encore appliquées, attendre un peu plus
        console.log('⏳ Données en cours de chargement, on attend...');
        setTimeout(() => {
          console.log('⏱️ Timeout final, on cache le loader');
          window.hidePageLoader();
        }, 1000);
      }
    }, 800);
  }

  async loadExternalDependencies() {
    // Charger Moment.js si pas disponible
    if (typeof moment === 'undefined') {
      await this.loadScript('https://cdn.jsdelivr.net/momentjs/latest/moment.min.js');
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
      // 1. Interface (logos, popins, extras) - PREMIER
      this.managers.interface = new InterfaceManager();
      
      // 2. Voyageurs (adultes, enfants, bébés) - DEUXIÈME  
      this.managers.travelers = new TravelersManager();
      window.travelersManager = this.managers.travelers;
      
      // 3. Calculateur de prix - TROISIÈME (dépend des voyageurs)
      this.managers.priceCalculator = new PriceCalculator();
      
      // 4. Calendrier (dates + iCal) - QUATRIÈME (dépend du calculateur)
      this.managers.calendar = new CalendarManager();
      
      // 5. Affichage des tarifs par saison - CINQUIÈME
      this.managers.tariffs = new TariffsDisplayManager();
      
      // 6. Données de réservation - SIXIÈME 
      this.managers.reservationData = new ReservationDataManager();
      
      // 7. Améliorations mobile - DERNIER
      this.managers.mobileEnhancements = new MobileEnhancementsManager();
      
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
}

// Initialisation automatique quand le DOM est prêt
document.addEventListener('DOMContentLoaded', () => {
  // Petit délai pour s'assurer que tous les modules sont chargés
  setTimeout(() => {
    window.detailLogementPage = new DetailLogementPage();
  }, 100);
});

// Export global pour debugging
window.DetailLogementPage = DetailLogementPage;
