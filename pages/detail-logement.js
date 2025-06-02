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

  // Dans pages/detail-logement.js - MODIFIER l'ordre d'initialisation

initializeManagers() {
  try {
    console.log('🚀 Début initialisation des managers...');
    
    // 1. Interface (logos, popins, extras) - PREMIER
    this.managers.interface = new InterfaceManager();
    console.log('✅ InterfaceManager initialisé');
    
    // 2. Voyageurs (adultes, enfants, bébés) - DEUXIÈME  
    this.managers.travelers = new TravelersManager();
    window.travelersManager = this.managers.travelers;
    console.log('✅ TravelersManager initialisé');
    
    // 3. Calculateur de prix - TROISIÈME (dépend des voyageurs)
    this.managers.priceCalculator = new PriceCalculator();
    console.log('✅ PriceCalculator initialisé');
    
    // 4. Calendrier (dates + iCal) - QUATRIÈME (dépend du calculateur)
    this.managers.calendar = new CalendarManager();
    console.log('✅ CalendarManager initialisé');
    
    // 5. Affichage des tarifs par saison - CINQUIÈME
    this.managers.tariffs = new TariffsDisplayManager();
    console.log('✅ TariffsDisplayManager initialisé');
    
    // 6. Améliorations mobile - SIXIÈME
    this.managers.mobileEnhancements = new MobileEnhancementsManager();
    console.log('✅ MobileEnhancementsManager initialisé');
    
    // 7. Données de réservation - DERNIER (peut changer l'état des boutons)
    this.managers.reservationData = new ReservationDataManager();
    console.log('✅ ReservationDataManager initialisé');
    
    // 8. FORCER l'état initial des boutons EN DERNIER
    setTimeout(() => {
      console.log('🔧 Application finale de l\'état des boutons...');
      this.forceButtonState();
    }, 100);
    
    console.log('✅ Tous les gestionnaires initialisés:', Object.keys(this.managers));
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation des gestionnaires:', error);
  }
}

// NOUVELLE MÉTHODE pour forcer l'état des boutons
forceButtonState() {
  const reserverButtons = document.querySelectorAll('.button.homepage.site-internet[class*="button-reserver"]');
  
  console.log(`🎯 Forçage de l'état pour ${reserverButtons.length} boutons...`);
  
  reserverButtons.forEach((button, index) => {
    // Vérifier si on a des dates sélectionnées
    const priceCalculator = window.priceCalculator;
    const hasDates = priceCalculator && priceCalculator.startDate && priceCalculator.endDate;
    
    if (hasDates) {
      // Dates sélectionnées = boutons actifs
      button.style.opacity = "1";
      button.style.pointerEvents = "auto";
      button.style.cursor = "pointer";
      console.log(`✅ Bouton ${index + 1} activé (dates sélectionnées)`);
    } else {
      // Pas de dates = boutons désactivés
      button.style.opacity = "0.5";
      button.style.pointerEvents = "none";
      button.style.cursor = "not-allowed";
      console.log(`🔒 Bouton ${index + 1} désactivé (pas de dates)`);
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
