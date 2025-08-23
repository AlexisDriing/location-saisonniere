// Gestionnaire de recherche pour la page d'accueil
class HomeSearch {
  constructor() {
    this.adultes = 1;
    this.enfants = 0;
    this.startDate = null;
    this.endDate = null;
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

  setupDateListener() {
    // Écouter les changements du DateRangePicker
    if (typeof jQuery !== 'undefined') {
      jQuery('.dates-button-home').on('apply.daterangepicker', (e, picker) => {
        this.startDate = picker.startDate.format('YYYY-MM-DD');
        this.endDate = picker.endDate.format('YYYY-MM-DD');
        console.log('📅 Dates sélectionnées:', this.startDate, 'à', this.endDate);
      });
      
      jQuery('.dates-button-home').on('cancel.daterangepicker', () => {
        this.startDate = null;
        this.endDate = null;
        console.log('📅 Dates effacées');
      });
    }
  }

  setupSearchButton() {
    const searchButton = document.getElementById('button-search-home');
    if (!searchButton) return;
    
    searchButton.addEventListener('click', (e) => {
      e.preventDefault();
      this.handleSearch();
    });
  }

  handleSearch() {
    console.log('🔍 Recherche lancée depuis la page d\'accueil');
    
    // Récupérer le lieu depuis SearchMapManager
    let location = null;
    const searchInput = document.getElementById('search-input-home');
    if (searchInput && searchInput.value.trim()) {
      // SearchMapManager aura déjà géocodé via getCurrentSearch()
      location = window.searchMapManager?.getCurrentSearch();
      
      // Si pas de coordonnées mais un texte, on garde le texte pour géocoder côté liste
      if (!location && searchInput.value.trim()) {
        location = { name: searchInput.value.trim(), needsGeocoding: true };
      }
    }
    
    // Construire l'objet de données
    const searchData = {
      location: location,
      startDate: this.startDate,
      endDate: this.endDate,
      adultes: this.adultes,
      enfants: this.enfants,
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
