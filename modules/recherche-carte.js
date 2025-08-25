// Gestionnaire de recherche géographique avec Mapbox - V3 accueil
class SearchMapManager {
  constructor() {
    // 🔒 CLÉS API SUPPRIMÉES - Maintenant côté serveur pour la sécurité
    // this.apiKey = null; // Clé maintenant côté serveur
    this.init();
  }

  init() {
    console.log('🗺️ Initialisation SearchMapManager...');
    this.setupSearchForms();
    this.hideSuggestionsOnLoad();
    this.setupClickOutside();
    console.log('✅ SearchMapManager initialisé');
    
    // Export global
    window.searchMapManager = this;
  }

  // ================================
  // INITIALISATION
  // ================================

  hideSuggestionsOnLoad() {
    const suggestionsList = document.querySelector('#suggestions');
    const suggestionsListMobile = document.querySelector('#suggestions-mobile');
    const suggestionsListHome = document.querySelector('#suggestions-home');
    
    if (suggestionsList) {
      suggestionsList.style.display = 'none';
    }
    if (suggestionsListMobile) {
      suggestionsListMobile.style.display = 'none';
    }
    if (suggestionsListHome) {
      suggestionsListHome.style.display = 'none';
    }
  }

  setupClickOutside() {
    document.addEventListener('click', (event) => {
      const searchInput = document.querySelector('#search-input');
      const suggestionsList = document.querySelector('#suggestions');
      const searchInputMobile = document.querySelector('#search-input-mobile');
      const suggestionsListMobile = document.querySelector('#suggestions-mobile');
      
      // Desktop
      if (suggestionsList && 
          !searchInput?.contains(event.target) && 
          !suggestionsList.contains(event.target)) {
        suggestionsList.style.display = 'none';
      }
      
      // Mobile
      if (suggestionsListMobile && 
          !searchInputMobile?.contains(event.target) && 
          !suggestionsListMobile.contains(event.target)) {
        suggestionsListMobile.style.display = 'none';
      }
    });
  }

  // ================================
  // CONFIGURATION DES FORMULAIRES
  // ================================

  setupSearchForms() {
    // Desktop - Page liste
    const searchInput = document.querySelector('#search-input');
    const suggestionsList = document.querySelector('#suggestions');
    
    // Desktop - Page accueil  
    const searchInputHome = document.querySelector('#search-input-home');
    const suggestionsListHome = document.querySelector('#suggestions-home');
    
    // Mobile - Page liste
    const searchInputHomeMobile = document.querySelector('#search-input-home-mobile');
    
    // Utiliser les éléments disponibles
    const searchForm = searchInput?.closest('form');  // ⚠️ MODIFICATION ICI
    const searchFormHome = searchInputHome?.closest('form');  // 🆕 AJOUT
    const searchFormMobile = searchInputMobile ? searchInputMobile.closest('form') : null;
    
    // Prévenir la soumission des formulaires - Page liste
    if (searchForm) {
      searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.handleSearch(searchInput);
      });
    }
    
    // 🆕 AJOUT - Prévenir la soumission - Page accueil
    if (searchFormHome) {
      searchFormHome.addEventListener('submit', (e) => {
        e.preventDefault();
        e.stopPropagation();
        // Pas de handleSearch ici, c'est HomeSearch qui gère
      });
    }
    
    if (searchFormMobile) {
      searchFormMobile.addEventListener('submit', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.handleSearch(searchInputMobile);
      });
    }
    
    // 🚀 NOUVEAU : Gestionnaires de saisie avec debounce
    if (searchInput) {
      let searchTimeout;
      searchInput.addEventListener('input', async (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(async () => {
          await this.handleSearchInput(e.target, suggestionsList);
        }, window.CONFIG?.PERFORMANCE?.debounceDelay || 300);
      });
    }
    
    // 🆕 AJOUT - Gestionnaire pour la page d'accueil (desktop)
    if (searchInputHome) {
      let searchTimeoutHome;
      searchInputHome.addEventListener('input', async (e) => {
        clearTimeout(searchTimeoutHome);
        searchTimeoutHome = setTimeout(async () => {
          await this.handleSearchInput(e.target, suggestionsListHome);
        }, window.CONFIG?.PERFORMANCE?.debounceDelay || 300);
      });
    }
    
    // 🆕 AJOUT - Gestionnaire pour la page d'accueil (mobile)
    if (searchInputHomeMobile) {
      let searchTimeoutHomeMobile;
      searchInputHomeMobile.addEventListener('input', async (e) => {
        clearTimeout(searchTimeoutHomeMobile);
        searchTimeoutHomeMobile = setTimeout(async () => {
          await this.handleSearchInput(e.target, suggestionsListHome); // Même liste de suggestions
        }, window.CONFIG?.PERFORMANCE?.debounceDelay || 300);
      });
    }

  // ================================
  // GESTION DE LA SAISIE
  // ================================

  async handleSearchInput(inputElement, suggestionsElement) {
    const query = inputElement.value.trim();
    
    if (query.length >= 2) {
      const suggestions = await this.fetchSuggestions(query);
      this.displaySuggestions(suggestions, inputElement, suggestionsElement);
    } else {
      if (suggestionsElement) {
        suggestionsElement.innerHTML = '';
        suggestionsElement.style.display = 'none';
      }
    }
  }

  async handleSearch(inputElement) {
    const city = inputElement.value;
    const userLocation = await this.getCoordinatesFromAddress(city);

    if (userLocation) {    
      if (window.propertyManager) {
        window.propertyManager.setSearchLocation(userLocation);
        window.propertyManager.applyFilters();
      }
    } else {
      console.error('Impossible de récupérer les coordonnées de la ville recherchée.');
    }
  }

  // ================================
  // 🔒 API MAPBOX SÉCURISÉE - Passe par votre serveur
  // ================================

  async fetchSuggestions(query) {
    try {
      // 🔒 MAINTENANT on utilise VOTRE serveur au lieu de l'API Mapbox directement
      const url = `${window.CONFIG.API_URL}/suggestions?q=${encodeURIComponent(query)}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Erreur serveur: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      if (!data.features || !Array.isArray(data.features)) {
        console.error("Réponse inattendue du serveur:", data);
        return [];
      }
      
      return this.filterAndFormatSuggestions(data.features);
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des suggestions :', error);
      return [];
    }
  }

  async getCoordinatesFromAddress(address) {
    try {
      // 🔒 MAINTENANT on utilise VOTRE serveur au lieu de l'API Mapbox directement
      const url = `${window.CONFIG.API_URL}/geocode?address=${encodeURIComponent(address)}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.coordinates) {
        return data.coordinates;
      } else {
        console.error('Adresse introuvable :', address);
        return null;
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des coordonnées :', error);
      return null;
    }
  }

  filterAndFormatSuggestions(features) {
    const allowedKeywords = ['museum', 'monument', 'tour', 'tower', 'eiffel', 'statue', 'cathedral', 'church', 'attraction'];
    
    return features
      .filter((feature) => {
        const placeType = feature.place_type?.[0];
        const name = feature.text?.toLowerCase() || '';
        const fullName = feature.place_name?.toLowerCase() || '';

        if (placeType === 'poi') {
          return allowedKeywords.some(kw => name.includes(kw) || fullName.includes(kw));
        }

        return placeType === 'place' || placeType === 'region';
      })
      .map((feature) => {
        let placeType = "place";
        if (feature.place_type && Array.isArray(feature.place_type) && feature.place_type.length > 0) {
          placeType = feature.place_type[0];
        }
        
        return {
          name: feature.text,
          context: feature.place_name,
          coordinates: feature.geometry?.coordinates || [0, 0],
          placeType: placeType
        };
      });
  }

  // ================================
  // AFFICHAGE DES SUGGESTIONS
  // ================================

  displaySuggestions(suggestions, inputElement, suggestionsElement) {
    if (!suggestionsElement) return;
    
    suggestionsElement.innerHTML = '';
    
    if (suggestions.length === 0) {
      suggestionsElement.style.display = 'none';
      return;
    }
    
    suggestionsElement.style.display = 'block';
    
    suggestions.forEach((suggestion) => {
      this.createSuggestionItem(suggestion, inputElement, suggestionsElement);
    });
  }

  createSuggestionItem(suggestion, inputElement, suggestionsElement) {
    // Extraire le pays depuis le contexte
    let country = "";
    if (suggestion.context) {
      const contextParts = suggestion.context.split(',').map(part => part.trim());
      if (contextParts.length > 0) {
        country = contextParts[contextParts.length - 1];
      }
    }
    
    const displayName = suggestion.name + (country ? ", " + country : "");
    
    // Déterminer le type et le template
    let templateId = "template-city";
    let typeLabel = "Ville";
    
    switch(suggestion.placeType) {
      case 'city':
      case 'place':
        templateId = "template-city";
        typeLabel = "Ville";
        break;
      case 'poi':
        templateId = "template-poi";
        typeLabel = "Monument";
        break;
      case 'region':
        templateId = "template-region";
        typeLabel = "Région";
        break;
      default:
        templateId = "template-city";
        break;
    }
    
    // Récupérer le template
    const template = document.getElementById(templateId);
    if (!template) {
      console.error(`Template ${templateId} introuvable`);
      return;
    }
    
    // Cloner et configurer l'élément
    const suggestionItem = template.cloneNode(true);
    suggestionItem.id = '';
    suggestionItem.style.display = 'flex';
    
    // Remplir le contenu
    const nameElement = suggestionItem.querySelector('.suggestion-name');
    if (nameElement) {
      nameElement.textContent = displayName;
    }
    
    const typeElement = suggestionItem.querySelector('.suggestion-type');
    if (typeElement) {
      typeElement.textContent = typeLabel;
    }
    
    const contextElement = suggestionItem.querySelector('.suggestion-context');
    if (contextElement) {
      contextElement.style.display = 'none';
    }
    
    // Stocker le contexte complet
    suggestion.fullContext = displayName;
    
    // Gestionnaire de clic
    suggestionItem.addEventListener('click', () => {
      this.selectSuggestion(suggestion, inputElement, suggestionsElement);
    });
    
    // Ajouter à la liste
    suggestionsElement.appendChild(suggestionItem);
  }

  selectSuggestion(suggestion, inputElement, suggestionsElement) {
    // Mettre à jour le champ de saisie
    inputElement.value = suggestion.fullContext;
    
    // Masquer les suggestions
    suggestionsElement.innerHTML = '';
    suggestionsElement.style.display = 'none';
    
    // Déclencher la recherche
    this.handleSearch(inputElement);
  }

  // ================================
  // MÉTHODES UTILITAIRES
  // ================================

  // Fonction Haversine pour calculer la distance
  calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Rayon de la Terre en km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return Math.round(distance);
  }

  // ================================
  // MÉTHODES PUBLIQUES
  // ================================

  // Méthode pour rechercher programmatiquement
  async searchLocation(address) {
    const coordinates = await this.getCoordinatesFromAddress(address);
    if (coordinates && window.propertyManager) {
      window.propertyManager.setSearchLocation(coordinates);
      window.propertyManager.applyFilters();
    }
    return coordinates;
  }

  // Méthode pour nettoyer la recherche
  clearSearch() {
    const searchInput = document.querySelector('#search-input');
    const searchInputMobile = document.querySelector('#search-input-mobile');
    
    if (searchInput) searchInput.value = '';
    if (searchInputMobile) searchInputMobile.value = '';
    
    if (window.propertyManager) {
      window.propertyManager.setSearchLocation(null);
      window.propertyManager.applyFilters();
    }
  }

  // Méthode pour obtenir l'état actuel
  getCurrentSearch() {
    return window.propertyManager ? window.propertyManager.searchLocation : null;
  }
}

// Export global
window.SearchMapManager = SearchMapManager;
