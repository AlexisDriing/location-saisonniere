// Gestionnaire de recherche géographique avec Mapbox - LOG production map V2
class SearchMapManager {
  constructor() {
    // 🔒 CLÉS API SUPPRIMÉES - Maintenant côté serveur pour la sécurité
    // this.apiKey = null; // Clé maintenant côté serveur
    this.init();
  }

  init() {
    this.setupSearchForms();
    this.hideSuggestionsOnLoad();
    this.setupClickOutside();
    
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
    
    // Mobile - Page accueil
    const searchInputHomeMobile = document.querySelector('#search-input-home-mobile');
    const suggestionsListHomeMobile = document.querySelector('#suggestions-home-mobile');
    // On réutilise suggestionsListHome pour mobile aussi
    
    // Mobile - Page liste
    const searchInputMobile = document.querySelector('#search-input-mobile');
    const suggestionsListMobile = document.querySelector('#suggestions-mobile');
    
    // Utiliser les éléments disponibles
    const searchForm = searchInput?.closest('form');
    const searchFormHome = searchInputHome?.closest('form');
    const searchFormMobile = searchInputMobile ? searchInputMobile.closest('form') : null;
    
    // Prévenir la soumission des formulaires - Page liste
    if (searchForm) {
      searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.handleSearch(searchInput);
      });
    }
    
    // Prévenir la soumission - Page accueil
    if (searchFormHome) {
      searchFormHome.addEventListener('submit', (e) => {
        e.preventDefault();
        e.stopPropagation();
        // Pas de handleSearch ici, c'est HomeSearch qui gère
      });
    }
    
    // Prévenir la soumission - Page accueil MOBILE (FIX SAFARI)
    const searchFormHomeMobile = searchInputHomeMobile ? searchInputHomeMobile.closest('form') : null;
    if (searchFormHomeMobile) {
      searchFormHomeMobile.addEventListener('submit', (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
      
      // Bloquer aussi la touche Entrée (FIX SAFARI)
      searchInputHomeMobile.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.keyCode === 13) {
          e.preventDefault();
          e.stopPropagation();
        }
      }, true);
    }
    
    if (searchFormMobile) {
      searchFormMobile.addEventListener('submit', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.handleSearch(searchInputMobile);
      });
    }
    
    // Gestionnaires de saisie avec debounce
    if (searchInput) {
      let searchTimeout;
      searchInput.addEventListener('input', async (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(async () => {
          await this.handleSearchInput(e.target, suggestionsList);
        }, window.CONFIG?.PERFORMANCE?.debounceDelay || 300);
      });
    }
    
    // Gestionnaire pour la page d'accueil (desktop)
    if (searchInputHome) {
      let searchTimeoutHome;
      searchInputHome.addEventListener('input', async (e) => {
        clearTimeout(searchTimeoutHome);
        searchTimeoutHome = setTimeout(async () => {
          await this.handleSearchInput(e.target, suggestionsListHome);
        }, window.CONFIG?.PERFORMANCE?.debounceDelay || 300);
      });
    }
    
    // Gestionnaire pour la page d'accueil (mobile)
    if (searchInputHomeMobile && suggestionsListHomeMobile) {
      let searchTimeoutHomeMobile;
      searchInputHomeMobile.addEventListener('input', async (e) => {
        clearTimeout(searchTimeoutHomeMobile);
        searchTimeoutHomeMobile = setTimeout(async () => {
          await this.handleSearchInput(e.target, suggestionsListHomeMobile);
        }, window.CONFIG?.PERFORMANCE?.debounceDelay || 300);
      });
    }
    
    if (searchInputMobile) {
      let searchTimeoutMobile;
      searchInputMobile.addEventListener('input', async (e) => {
        clearTimeout(searchTimeoutMobile);
        searchTimeoutMobile = setTimeout(async () => {
          await this.handleSearchInput(e.target, suggestionsListMobile);
        }, window.CONFIG?.PERFORMANCE?.debounceDelay || 300);
      });
    }
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
    const geocodeResult = await this.getCoordinatesFromAddress(city);
  
    if (window.propertyManager) {
      window.propertyManager._waitingForGeocode = false;
      if (window.propertyManager._geocodeTimeout) {
        clearTimeout(window.propertyManager._geocodeTimeout);
        window.propertyManager._geocodeTimeout = null;
      }
    }
  
    if (geocodeResult) {
      let zoneInfo = null;
      if (geocodeResult.search_type === 'region') {
        zoneInfo = {
          polygon_source: geocodeResult.polygon_source || 'bbox',
          geo_feature_name: geocodeResult.geo_feature_name || geocodeResult.display_name,
          geo_feature_code: geocodeResult.geo_feature_code || null,
          bbox: geocodeResult.bbox || null
        };
      }
      
      if (window.propertyManager) {
        window.propertyManager.setSearchLocation(geocodeResult.coordinates, geocodeResult.search_type, zoneInfo);
        window.propertyManager.applyFilters();
      }
    } else {
      console.error('Impossible de recuperer les coordonnees de la ville recherchee.');
      if (window.propertyManager && window.propertyManager.startDate) {
        window.propertyManager.applyFilters();
      }
    }
  }

  async handleSuggestionClick(suggestion) {
    // Les coordonnées sont déjà dans la suggestion → 0 appel Mapbox
    const coordinates = {
      lng: suggestion.coordinates[0],
      lat: suggestion.coordinates[1]
    };
    
    // Réinitialiser le flag de géocodage
    if (window.propertyManager) {
      window.propertyManager._waitingForGeocode = false;
      if (window.propertyManager._geocodeTimeout) {
        clearTimeout(window.propertyManager._geocodeTimeout);
        window.propertyManager._geocodeTimeout = null;
      }
    }
    
    // Déterminer le type de recherche
    const placeType = suggestion.placeType || 'place';
    let searchType = 'place';
    if (placeType === 'region' || placeType === 'district') {
      searchType = 'region';
    }
    
    // Pour les zones, résoudre le polygone via le serveur (SANS appel Mapbox)
    let zoneInfo = null;
    
    if (searchType === 'region') {
      try {
        let resolveUrl = `${window.CONFIG.API_URL}/resolve-zone?name=${encodeURIComponent(suggestion.name)}&type=${encodeURIComponent(placeType)}`;
        if (suggestion.shortCode) {
          resolveUrl += `&code=${encodeURIComponent(suggestion.shortCode)}`;
        }
        
        const response = await fetch(resolveUrl);
        const data = await response.json();
        
        zoneInfo = {
          polygon_source: data.polygon_source || 'bbox',
          geo_feature_name: data.geo_feature_name || suggestion.name,
          geo_feature_code: data.geo_feature_code || null,
          bbox: suggestion.bbox || null
        };
      } catch (error) {
        console.error('Erreur resolve-zone:', error);
        zoneInfo = {
          polygon_source: 'bbox',
          geo_feature_name: suggestion.name,
          geo_feature_code: null,
          bbox: suggestion.bbox || null
        };
      }
    }
    
    if (window.propertyManager) {
      window.propertyManager.setSearchLocation(coordinates, searchType, zoneInfo);
      window.propertyManager.applyFilters();
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
        return {
          coordinates: data.coordinates,
          search_type: data.search_type || 'place',
          display_name: data.display_name || address,
          polygon_source: data.polygon_source || null,
          geo_feature_name: data.geo_feature_name || null,
          geo_feature_code: data.geo_feature_code || null,
          bbox: data.bbox || null
        };
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
    const seen = new Set();
    
    return features
      .map((feature) => {
        const placeType = feature.place_type?.[0] || 'place';
        const name = feature.text || '';
        const placeName = feature.place_name || '';
        
        const contextParts = placeName.split(',').map(p => p.trim());
        
        let subtitle = '';
        let country = contextParts.length > 0 ? contextParts[contextParts.length - 1] : '';
        
        if (placeType === 'region') {
          subtitle = `Région, ${country}`;
        } else if (placeType === 'district') {
          subtitle = `Département, ${country}`;
        } else {
          // Villes, locality, neighborhood : département + pays
          if (contextParts.length >= 3) {
            subtitle = `${contextParts[1]}, ${country}`;
          } else if (contextParts.length === 2) {
            subtitle = country;
          } else {
            subtitle = '';
          }
        }
        
        const dedupeKey = `${name.toLowerCase()}|${subtitle.toLowerCase()}`;
        if (seen.has(dedupeKey)) {
          return null;
        }
        seen.add(dedupeKey);
        
        let templateType = 'city';
        if (placeType === 'region' || placeType === 'district') {
          templateType = 'region';
        }
        
        return {
          name: name,
          subtitle: subtitle,
          context: placeName,
          coordinates: feature.geometry?.coordinates || [0, 0],
          placeType: placeType,
          templateType: templateType,
          fullContext: placeName,
          bbox: feature.bbox || null,
          shortCode: feature.properties?.short_code || null
        };
      })
      .filter(item => item !== null)
      .sort((a, b) => {
        // Régions/départements en premier dans les suggestions
        const priority = { 'region': 0, 'district': 0, 'place': 1, 'locality': 1, 'neighborhood': 2 };
        const prioA = priority[a.placeType] ?? 1;
        const prioB = priority[b.placeType] ?? 1;
        return prioA - prioB;
      })
      .slice(0, 5);
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
    // Déterminer le template selon le type
    let templateId = 'template-city';
    if (suggestion.templateType === 'poi') {
      templateId = 'template-poi';
    } else if (suggestion.templateType === 'region') {
      templateId = 'template-region';
    }
    
    const template = document.getElementById(templateId);
    if (!template) {
      console.error(`Template ${templateId} introuvable`);
      return;
    }
    
    const suggestionItem = template.cloneNode(true);
    suggestionItem.id = '';
    suggestionItem.style.display = 'flex';
    
    // Ligne 1 : Nom du lieu (en gras dans ton design)
    const nameElement = suggestionItem.querySelector('.suggestion-name');
    if (nameElement) {
      nameElement.textContent = suggestion.name;
    }
    
    // Ligne 2 : Contexte (département + pays, ou type + pays)
    const typeElement = suggestionItem.querySelector('.suggestion-type');
    if (typeElement) {
      typeElement.textContent = suggestion.subtitle;
    }
    
    const contextElement = suggestionItem.querySelector('.suggestion-context');
    if (contextElement) {
      contextElement.style.display = 'none';
    }
    
    // Stocker le nom pour remplir l'input quand on clique
    suggestion.fullContext = suggestion.name;
    
    // Gestionnaire de clic
    suggestionItem.addEventListener('click', () => {
      this.selectSuggestion(suggestion, inputElement, suggestionsElement);
    });
    
    suggestionsElement.appendChild(suggestionItem);
  }

  selectSuggestion(suggestion, inputElement, suggestionsElement) {
    inputElement.value = suggestion.name;
    
    suggestionsElement.innerHTML = '';
    suggestionsElement.style.display = 'none';
    
    // Utiliser directement les coordonnées de la suggestion → 0 appel Mapbox
    this.handleSuggestionClick(suggestion);
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
    const result = await this.getCoordinatesFromAddress(address);
    if (result && window.propertyManager) {
      let zoneInfo = null;
      if (result.search_type === 'region') {
        zoneInfo = {
          polygon_source: result.polygon_source || 'bbox',
          geo_feature_name: result.geo_feature_name || result.display_name,
          geo_feature_code: result.geo_feature_code || null,
          bbox: result.bbox || null
        };
      }
      window.propertyManager.setSearchLocation(result.coordinates, result.search_type, zoneInfo);
      window.propertyManager.applyFilters();
    }
    return result ? result.coordinates : null;
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
