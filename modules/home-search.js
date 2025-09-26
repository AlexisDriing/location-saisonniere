// Gestionnaire de recherche pour la page d'accueil - LOG production 26/09
class HomeSearch {
  constructor() {
    // Protection contre double initialisation
    if (window.homeSearchInstance) {
      console.warn('⚠️ HomeSearch déjà initialisé');
      return window.homeSearchInstance;
    }
    
    this.adultes = 1;
    this.enfants = 0;
    this.startDate = null;
    this.endDate = null;
    // Version mobile
    this.adultesMobile = 1;
    this.enfantsMobile = 0;
    this.startDateMobile = null;
    this.endDateMobile = null;
    this.init();
    
    // Stocker l'instance globalement
    window.homeSearchInstance = this;
  }

  init() {
    
    // Vérifier qu'on est sur la page d'accueil
    const searchButton = document.getElementById('button-search-home');
    if (!searchButton) {
      console.log('Pas sur la page d\'accueil, HomeSearch ignoré');
      return;
    }
    
    this.setupVoyageurs();
    this.setupVoyageursMobile();
    this.setupDateListener();
    this.setupSearchButton();
    
  }

  setupVoyageurs() {
    // Adultes
    document.getElementById('adultes-plus-home')?.addEventListener('click', () => {
      if (this.adultes + this.enfants < 50) {
        this.adultes++;
        this.updateVoyageursDisplay();
      }
    });
    
    document.getElementById('adultes-moins-home')?.addEventListener('click', () => {
      if (this.adultes > 1) {
        this.adultes--;
        this.updateVoyageursDisplay();
      }
    });
    
    // Enfants
    document.getElementById('enfants-plus-home')?.addEventListener('click', () => {
      if (this.adultes + this.enfants < 50) {
        this.enfants++;
        this.updateVoyageursDisplay();
      }
    });
    
    document.getElementById('enfants-moins-home')?.addEventListener('click', () => {
      if (this.enfants > 0) {
        this.enfants--;
        this.updateVoyageursDisplay();
      }
    });
    
    // Affichage initial
    this.updateVoyageursDisplay();
  }

  updateVoyageursDisplay() {
    const adulteElement = document.getElementById('chiffres-adultes-home');
    const enfantElement = document.getElementById('chiffres-enfants-home');
    
    if (adulteElement) adulteElement.textContent = this.adultes;
    if (enfantElement) enfantElement.textContent = this.enfants;

    const textFiltreVoyageurs = document.getElementById('text-filtre-voyageurs-home');
      if (textFiltreVoyageurs) {
        const totalVoyageurs = this.adultes + this.enfants;
        let texte = '';
        
        if (totalVoyageurs === 1) {
          texte = '1 voyageur';
        } else {
          texte = `${totalVoyageurs} voyageurs`;
        }
        
        textFiltreVoyageurs.textContent = texte;
        // 🆕 NOUVEAU : Changer la couleur si différent de la valeur par défaut
        if (this.adultes !== 1 || this.enfants !== 0) {
          textFiltreVoyageurs.style.color = '#272A2B';
        } else {
          textFiltreVoyageurs.style.color = ''; // Retour à la couleur par défaut
        }
      }
    
    // Mettre à jour les opacités des boutons
    const adulteMoins = document.getElementById('adultes-moins-home');
    const enfantMoins = document.getElementById('enfants-moins-home');
    const adultePlus = document.getElementById('adultes-plus-home');
    const enfantPlus = document.getElementById('enfants-plus-home');
    
    if (adulteMoins) adulteMoins.style.opacity = this.adultes <= 1 ? '0.3' : '1';
    if (enfantMoins) enfantMoins.style.opacity = this.enfants <= 0 ? '0.3' : '1';
    
    const isMax = this.adultes + this.enfants >= 50;
    if (adultePlus) adultePlus.style.opacity = isMax ? '0.3' : '1';
    if (enfantPlus) enfantPlus.style.opacity = isMax ? '0.3' : '1';
  }

  setupVoyageursMobile() {
    // Adultes mobile
    document.getElementById('adultes-plus-home-mobile')?.addEventListener('click', () => {
      if (this.adultesMobile + this.enfantsMobile < 50) {
        this.adultesMobile++;
        this.updateVoyageursDisplayMobile();
      }
    });
    
    document.getElementById('adultes-moins-home-mobile')?.addEventListener('click', () => {
      if (this.adultesMobile > 1) {
        this.adultesMobile--;
        this.updateVoyageursDisplayMobile();
      }
    });
    
    // Enfants mobile
    document.getElementById('enfants-plus-home-mobile')?.addEventListener('click', () => {
      if (this.adultesMobile + this.enfantsMobile < 50) {
        this.enfantsMobile++;
        this.updateVoyageursDisplayMobile();
      }
    });
    
    document.getElementById('enfants-moins-home-mobile')?.addEventListener('click', () => {
      if (this.enfantsMobile > 0) {
        this.enfantsMobile--;
        this.updateVoyageursDisplayMobile();
      }
    });
    
    // Affichage initial mobile
    this.updateVoyageursDisplayMobile();
  }

  updateVoyageursDisplayMobile() {
    const adulteElement = document.getElementById('chiffres-adultes-home-mobile');
    const enfantElement = document.getElementById('chiffres-enfants-home-mobile');
    
    if (adulteElement) adulteElement.textContent = this.adultesMobile;
    if (enfantElement) enfantElement.textContent = this.enfantsMobile;

    const textFiltreVoyageurs = document.getElementById('text-filtre-voyageurs-home-mobile');
    if (textFiltreVoyageurs) {
      const totalVoyageurs = this.adultesMobile + this.enfantsMobile;
      let texte = '';
      
      if (totalVoyageurs === 1) {
        texte = '1 voyageur';
      } else {
        texte = `${totalVoyageurs} voyageurs`;
      }
      
      textFiltreVoyageurs.textContent = texte;
      // Changer la couleur si différent de la valeur par défaut
      if (this.adultesMobile !== 1 || this.enfantsMobile !== 0) {
        textFiltreVoyageurs.style.color = '#272A2B';
      } else {
        textFiltreVoyageurs.style.color = ''; // Retour à la couleur par défaut
      }
    }
    
    // Mettre à jour les opacités des boutons
    const adulteMoins = document.getElementById('adultes-moins-home-mobile');
    const enfantMoins = document.getElementById('enfants-moins-home-mobile');
    const adultePlus = document.getElementById('adultes-plus-home-mobile');
    const enfantPlus = document.getElementById('enfants-plus-home-mobile');
    
    if (adulteMoins) adulteMoins.style.opacity = this.adultesMobile <= 1 ? '0.3' : '1';
    if (enfantMoins) enfantMoins.style.opacity = this.enfantsMobile <= 0 ? '0.3' : '1';
    
    const isMax = this.adultesMobile + this.enfantsMobile >= 50;
    if (adultePlus) adultePlus.style.opacity = isMax ? '0.3' : '1';
    if (enfantPlus) enfantPlus.style.opacity = isMax ? '0.3' : '1';
  }

  setupDateListener() {
    // Écouter les changements du DateRangePicker
    if (typeof jQuery !== 'undefined') {
      const $ = jQuery;
      
      // Desktop
      $('.dates-button-home:not(.mobile)').on('apply.daterangepicker', (e, picker) => {
        this.startDate = picker.startDate.format('YYYY-MM-DD');
        this.endDate = picker.endDate.format('YYYY-MM-DD');
      });
      
      $('.dates-button-home:not(.mobile)').on('cancel.daterangepicker', () => {
        this.startDate = null;
        this.endDate = null;
      });
      

     // Mobile - Configurer le fullscreen
      const mobileButton = $('.dates-button-home.mobile');
      if (mobileButton.length > 0 && window.innerWidth < 768) {
        // Attendre que le picker soit initialisé
        setTimeout(() => {
          const picker = mobileButton.data('daterangepicker');
          if (picker) {
            // Ajouter le comportement fullscreen avec structure complète
            const originalShow = picker.show;
            picker.show = function() {
              originalShow.call(this);
              document.body.classList.add("no-scroll");
              $(this.container).addClass('mobile-fullscreen');
              
              // Créer la structure mobile si nécessaire
              if (!$(this.container).find('.drp-calendars').length) {
                const calendars = $(this.container).find('.drp-calendar');
                const calendarsContainer = $('<div class="drp-calendars"></div>');
                calendars.first().before(calendarsContainer);
                calendarsContainer.append(calendars);
              }
              
              // Ajouter le header mobile si nécessaire
              if (!$(this.container).find('.mobile-calendar-header').length) {
                const header = $('<div class="mobile-calendar-header"></div>');
                const title = $('<div class="mobile-calendar-title">Vos dates de séjour</div>');
                const closeBtn = $('<div class="mobile-calendar-close">×</div>');
                
                closeBtn.css({
                  'font-size': '24px',
                  'cursor': 'pointer',
                  'padding': '0 10px'
                });
                
                closeBtn.on('click', (e) => {
                  e.preventDefault();
                  e.stopImmediatePropagation();
                  this.hide();
                  document.body.classList.remove("no-scroll");
                  $(this.container).removeClass('mobile-fullscreen');
                });
                
                header.append(title);
                header.append(closeBtn);
                $(this.container).prepend(header);
              }
              
              // Gérer les boutons fixes en bas
              const buttons = $(this.container).find('.drp-buttons');
              buttons.addClass('mobile-fixed-buttons');
            };
            
            const originalHide = picker.hide;
            picker.hide = function() {
              originalHide.call(this);
              document.body.classList.remove("no-scroll");
              $(this.container).removeClass('mobile-fullscreen');
            };
          }
        }, 500); // Attendre que CalendarListManager ait initialisé le picker
      }
      
      // Mobile - Events
      $('.dates-button-home.mobile').on('apply.daterangepicker', (e, picker) => {
        this.startDateMobile = picker.startDate.format('YYYY-MM-DD');
        this.endDateMobile = picker.endDate.format('YYYY-MM-DD');
      });
      
      $('.dates-button-home.mobile').on('cancel.daterangepicker', () => {
        this.startDateMobile = null;
        this.endDateMobile = null;
      });
    }
  }

  setupSearchButton() {
    // Desktop
    const searchButton = document.getElementById('button-search-home');
    if (searchButton) {
      searchButton.addEventListener('click', (e) => {
        e.preventDefault();
        this.handleSearch(false); // false = desktop
      });
    }
    
    // Mobile
    const searchButtonMobile = document.getElementById('button-search-home-mobile');
    if (searchButtonMobile) {
      searchButtonMobile.addEventListener('click', (e) => {
        e.preventDefault();
        this.handleSearch(true); // true = mobile
      });
    }
  }

  handleSearch(isMobile = false) {    
    // Récupérer le lieu selon la version
    let location = null;
    const searchInput = document.getElementById(isMobile ? 'search-input-home-mobile' : 'search-input-home');
    if (searchInput && searchInput.value.trim()) {
      // SearchMapManager aura déjà géocodé via getCurrentSearch()
      location = window.searchMapManager?.getCurrentSearch();
      
      // Si pas de coordonnées mais un texte, on garde le texte pour géocoder côté liste
      if (!location && searchInput.value.trim()) {
        location = { name: searchInput.value.trim(), needsGeocoding: true };
      }
    }
    
    // Construire l'objet de données selon la version
    const searchData = {
      locationText: searchInput ? searchInput.value : '',
      startDate: isMobile ? this.startDateMobile : this.startDate,
      endDate: isMobile ? this.endDateMobile : this.endDate,
      adultes: isMobile ? this.adultesMobile : this.adultes,
      enfants: isMobile ? this.enfantsMobile : this.enfants,
      timestamp: Date.now()
    };
        
    // Sauvegarder dans localStorage
    localStorage.setItem('home_search_data', JSON.stringify(searchData));
    
    // Rediriger vers la page liste
    window.location.href = '/locations-vacances-sans-commission';
  }
}

// Export global
window.HomeSearch = HomeSearch;
