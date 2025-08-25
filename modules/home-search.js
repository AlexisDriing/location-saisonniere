// Gestionnaire de recherche pour la page d'accueil V6
class HomeSearch {
  constructor() {
    this.adultes = 1;
    this.enfants = 0;
    this.startDate = null;
    this.endDate = null;
    this.init();

    this.adultesMobile = 1;
    this.enfantsMobile = 0;
    this.startDateMobile = null;
    this.endDateMobile = null;
    this.init();
  }

  init() {
    console.log('🏠 Initialisation HomeSearch...');
    
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
    
    console.log('✅ HomeSearch initialisé');
  }

  setupVoyageurs() {
    // Adultes
    document.getElementById('adultes-plus-home')?.addEventListener('click', () => {
      if (this.adultes + this.enfants < 10) {
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
      if (this.adultes + this.enfants < 10) {
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
    
    const isMax = this.adultes + this.enfants >= 10;
    if (adultePlus) adultePlus.style.opacity = isMax ? '0.3' : '1';
    if (enfantPlus) enfantPlus.style.opacity = isMax ? '0.3' : '1';
  }

  setupVoyageursMobile() {
    // Adultes mobile
    document.getElementById('adultes-plus-home-mobile')?.addEventListener('click', () => {
      if (this.adultesMobile + this.enfantsMobile < 10) {
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
      if (this.adultesMobile + this.enfantsMobile < 10) {
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
    
    const isMax = this.adultesMobile + this.enfantsMobile >= 10;
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
        console.log('📅 Dates desktop sélectionnées:', this.startDate, 'à', this.endDate);
      });
      
      $('.dates-button-home:not(.mobile)').on('cancel.daterangepicker', () => {
        this.startDate = null;
        this.endDate = null;
        console.log('📅 Dates desktop effacées');
      });
      
      // Mobile - Configurer le fullscreen
      const mobileButton = $('.dates-button-home.mobile');
      if (mobileButton.length > 0 && window.innerWidth < 768) {
        // Attendre que le picker soit initialisé
        setTimeout(() => {
          const picker = mobileButton.data('daterangepicker');
          if (picker) {
            // Ajouter le comportement fullscreen
            const originalShow = picker.show;
            picker.show = function() {
              originalShow.call(this);
              document.body.classList.add("no-scroll");
              $(this.container).addClass('mobile-fullscreen');
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
        console.log('📅 Dates mobile sélectionnées:', this.startDateMobile, 'à', this.endDateMobile);
      });
      
      $('.dates-button-home.mobile').on('cancel.daterangepicker', () => {
        this.startDateMobile = null;
        this.endDateMobile = null;
        console.log('📅 Dates mobile effacées');
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
    console.log(`🔍 Recherche lancée depuis la page d'accueil (${isMobile ? 'mobile' : 'desktop'})`);
    
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
    
    console.log('📦 Données à transférer:', searchData);
    
    // Sauvegarder dans localStorage
    localStorage.setItem('home_search_data', JSON.stringify(searchData));
    
    // Rediriger vers la page liste
    window.location.href = '/locations-vacances-sans-commission';
  }
}

// Export global
window.HomeSearch = HomeSearch;
