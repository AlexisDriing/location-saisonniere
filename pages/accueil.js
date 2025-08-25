// Page accueil - Point d'entrée principal V3
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
      this.fixCalendarPosition();
      
      console.log('✅ Modules initialisés:', Object.keys(this.managers));
      
    } catch (error) {
      console.error('❌ Erreur initialisation:', error);
    }
  }

  fixCalendarPosition() {
    if (typeof jQuery === 'undefined') return;
    
    const $ = jQuery;
    
    $('.dates-button-home').on('show.daterangepicker', function(e, picker) {
      // Récupérer le bouton et le bloc parent
      const button = $('.dates-button-home')[0];
      const locationBlock = $('.location-accueil')[0];
      
      if (button && locationBlock) {
        const buttonRect = button.getBoundingClientRect();
        const blockRect = locationBlock.getBoundingClientRect();
        
        // Calculer la position
        const spacing = 50; // 🎯 CHANGEZ CE NOMBRE pour ajuster l'espacement (en pixels)
        
        picker.container.css({
          position: 'fixed',
          top: (blockRect.bottom + spacing) + 'px',
          left: blockRect.left + 'px',
          transform: 'none'
        });
      }
    });
    
    // Repositionner au scroll
    $(window).on('scroll.daterangepicker', function() {
      const picker = $('.dates-button-home').data('daterangepicker');
      if (picker && picker.isShowing) {
        const locationBlock = $('.location-accueil')[0];
        if (locationBlock) {
          const blockRect = locationBlock.getBoundingClientRect();
          const spacing = 50; // 🎯 MÊME VALEUR QU'AU-DESSUS
          
          picker.container.css({
            top: (blockRect.bottom + spacing) + 'px',
            left: blockRect.left + 'px'
          });
        }
      }
    });
  }
} // Fin de la classe AccueilPage

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
