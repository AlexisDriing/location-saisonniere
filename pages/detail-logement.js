// pages/detail-logement.js - VERSION CORRIGÉE
class DetailLogementPage {
  constructor() {
    this.managers = {};
    this.init();
  }

  async init() {
    console.log('🏠 Initialisation de la page détail du logement...');
    
    // Vérifier que jQuery et Moment sont disponibles
    this.checkDependencies();
    
    // Petit délai pour s'assurer que tous les modules sont chargés
    setTimeout(() => {
      this.initializeManagers();
    }, 200);
    
    console.log('✅ Page détail initialisée avec succès');
  }

  checkDependencies() {
    if (typeof jQuery === 'undefined') {
      console.error('❌ jQuery non disponible');
      return false;
    }
    
    if (typeof moment === 'undefined') {
      console.error('❌ Moment.js non disponible');
      return false;
    }
    
    if (typeof jQuery.fn.daterangepicker === 'undefined') {
      console.error('❌ DateRangePicker non disponible');
      return false;
    }
    
    // Configurer la locale française pour Moment
    if (typeof moment.locale === 'function') {
      moment.locale('fr');
    }
    
    console.log('✅ Dépendances vérifiées:', {
      jQuery: typeof jQuery !== 'undefined',
      moment: typeof moment !== 'undefined',
      daterangepicker: typeof jQuery.fn.daterangepicker !== 'undefined'
    });
    
    return true;
  }

  initializeManagers() {
    try {
      console.log('🚀 Début initialisation des managers...');
      
      // 1. Interface (logos, popins, extras) - PREMIER
      if (typeof InterfaceManager !== 'undefined') {
        this.managers.interface = new InterfaceManager();
        console.log('✅ InterfaceManager initialisé');
      } else {
        console.warn('⚠️ InterfaceManager non disponible');
      }
      
      // 2. Voyageurs (adultes, enfants, bébés) - DEUXIÈME
      if (typeof TravelersManager !== 'undefined') {
        this.managers.travelers = new TravelersManager();
        window.travelersManager = this.managers.travelers;
        console.log('✅ TravelersManager initialisé');
      } else {
        console.warn('⚠️ TravelersManager non disponible');
      }
      
      // 3. Calculateur de prix - TROISIÈME (dépend des voyageurs)
      if (typeof PriceCalculator !== 'undefined') {
        this.managers.priceCalculator = new PriceCalculator();
        console.log('✅ PriceCalculator initialisé');
      } else {
        console.warn('⚠️ PriceCalculator non disponible');
      }
      
      // 4. Calendrier (dates + iCal) - QUATRIÈME (dépend du calculateur)
      if (typeof CalendarManager !== 'undefined') {
        this.managers.calendar = new CalendarManager();
        console.log('✅ CalendarManager initialisé');
      } else {
        console.warn('⚠️ CalendarManager non disponible');
      }
      
      // 5. Affichage des tarifs par saison - CINQUIÈME
      if (typeof TariffsDisplayManager !== 'undefined') {
        this.managers.tariffs = new TariffsDisplayManager();
        console.log('✅ TariffsDisplayManager initialisé');
      } else {
        console.warn('⚠️ TariffsDisplayManager non disponible');
      }
      
      // 6. Améliorations mobile - SIXIÈME
      if (typeof MobileEnhancementsManager !== 'undefined') {
        this.managers.mobileEnhancements = new MobileEnhancementsManager();
        console.log('✅ MobileEnhancementsManager initialisé');
      } else {
        console.warn('⚠️ MobileEnhancementsManager non disponible');
      }
      
      // 7. Données de réservation - DERNIER
      if (typeof ReservationDataManager !== 'undefined') {
        this.managers.reservationData = new ReservationDataManager();
        console.log('✅ ReservationDataManager initialisé');
      } else {
        console.warn('⚠️ ReservationDataManager non disponible');
      }
      
      console.log('✅ Gestionnaires initialisés:', Object.keys(this.managers));
      
      // Test du calendrier
      this.testCalendar();
      
    } catch (error) {
      console.error('❌ Erreur lors de l\'initialisation des gestionnaires:', error);
    }
  }

  testCalendar() {
    setTimeout(() => {
      const calendarInput = document.getElementById('input-calendar');
      if (calendarInput && typeof jQuery !== 'undefined') {
        console.log('🧪 Test du calendrier...');
        const $input = jQuery(calendarInput);
        
        if ($input.data('daterangepicker')) {
          console.log('✅ DateRangePicker correctement attaché');
        } else {
          console.warn('⚠️ DateRangePicker non attaché - Tentative de réinitialisation...');
          
          // Tentative de réinitialisation
          if (this.managers.calendar && this.managers.calendar.initDateRangePicker) {
            this.managers.calendar.initDateRangePicker();
          }
        }
      } else {
        console.warn('⚠️ Input calendrier non trouvé ou jQuery indisponible');
      }
    }, 1000);
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

  // Méthode pour tester manuellement le calendrier
  testCalendarManually() {
    const calendarInput = document.getElementById('input-calendar');
    if (calendarInput && typeof jQuery !== 'undefined') {
      const $input = jQuery(calendarInput);
      
      console.log('État du calendrier:', {
        element: !!calendarInput,
        jQuery: typeof jQuery !== 'undefined',
        daterangepicker: typeof jQuery.fn.daterangepicker !== 'undefined',
        attached: !!$input.data('daterangepicker')
      });
      
      // Tentative de clic pour ouvrir
      try {
        calendarInput.click();
        console.log('✅ Clic sur le calendrier effectué');
      } catch (error) {
        console.error('❌ Erreur lors du clic:', error);
      }
    }
  }
}

// Initialisation automatique quand le DOM est prêt
document.addEventListener('DOMContentLoaded', () => {
  // Délai plus long pour s'assurer que tous les modules sont chargés
  setTimeout(() => {
    window.detailLogementPage = new DetailLogementPage();
    
    // Debug global
    window.debugCalendar = () => {
      if (window.detailLogementPage) {
        window.detailLogementPage.testCalendarManually();
      }
    };
    
  }, 300);
});

// Export global pour debugging
window.DetailLogementPage = DetailLogementPage;
