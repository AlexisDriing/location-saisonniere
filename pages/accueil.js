// Page accueil - Point d'entrée principal V5
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
  
  // Au moment où le calendrier s'ouvre
  $('.dates-button-home').on('show.daterangepicker', function(e, picker) {
    const button = this; // Le bouton qui a déclenché l'ouverture
    const buttonRect = button.getBoundingClientRect();
    
    // Positionner directement sous le bouton
    picker.container.css({
      position: 'fixed',
      top: (buttonRect.bottom + 10) + 'px',
      left: buttonRect.left + 'px',
      transform: 'none'
    });
    
    // Sauvegarder la référence du bouton pour le repositionnement
    picker.anchorButton = button;
  });
    
     // Repositionner lors du scroll
    $(window).on('scroll resize', function() {
      $('.daterangepicker').each(function() {
        const $picker = $(this);
        if ($picker.is(':visible')) {
          // Retrouver le picker via le bouton
          const picker = $('.dates-button-home').data('daterangepicker');
          if (picker && picker.anchorButton) {
            const buttonRect = picker.anchorButton.getBoundingClientRect();
            
            $picker.css({
              top: (buttonRect.bottom + 10) + 'px',
              left: buttonRect.left + 'px'
            });
          }
        }
      });
    });
  }
}// Fin de la classe AccueilPage

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
