// Page détail - Point d'entrée principal qui orchestre tous les modules - LOG production
class DetailLogementPage {
  constructor() {
    this.managers = {};
    this.init();
  }

  async init() {
    
    // Charger les dépendances externes si nécessaires
    await this.loadExternalDependencies();
    
    // Initialiser tous les gestionnaires dans le bon ordre
    this.initializeManagers();

    // 🆕 NOUVEAU : Configurer le nettoyage
    this.setupPageUnloadHandler();
    
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
      
      
    } catch (error) {
      console.error('❌ Erreur lors de l\'initialisation des gestionnaires:', error);
    }
  }
// 🆕 NOUVEAU : Nettoyer les dates modifiées quand on quitte vraiment la page
  setupPageUnloadHandler() {
    // Détecter quand l'utilisateur quitte vraiment (pas juste navigation avant/arrière)
    let isNavigatingToReservation = false;
    
    // Marquer si on va vers la page réservation
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a');
      if (link && link.href && link.href.includes('/reservation')) {
        isNavigatingToReservation = true;
        setTimeout(() => { isNavigatingToReservation = false; }, 100);
      }
    });
    
    // Nettoyer seulement si on ne va pas vers réservation
    window.addEventListener('beforeunload', () => {
      if (!isNavigatingToReservation) {
        localStorage.removeItem("current_detail_dates");
      }
    });
  }
  // Méthodes utilitaires pour débuggage
  getManager(name) {
    return this.managers[name];
  }

  getAllManagers() {
    return this.managers;
  }

  restart() {
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
