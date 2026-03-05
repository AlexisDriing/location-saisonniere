// Gestionnaire de recherche géographique avec Mapbox - LOG production map
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
    const userLocation = await this.getCoordinatesFromAddress(city);
  
    // Réinitialiser le flag d'attente de géocodage et annuler le timeout de sécurité
    if (window.propertyManager) {
      window.propertyManager._waitingForGeocode = false;
      if (window.propertyManager._geocodeTimeout) {
        clearTimeout(window.propertyManager._geocodeTimeout);
        window.propertyManager._geocodeTimeout = null;
      }
    }
  
    if (userLocation) {    
      if (window.propertyManager) {
        window.propertyManager.setSearchLocation(userLocation);
        window.propertyManager.applyFilters();
      }
    } else {
      console.error('Impossible de récupérer les coordonnées de la ville recherchée.');
      // Appliquer quand même les filtres (sans coordonnées) si on a des dates
      if (window.propertyManager && window.propertyManager.startDate) {
        window.propertyManager.applyFilters();
      }
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
    const seen = new Set(); // Anti-doublons
    
    return features
      .map((feature) => {
        const placeType = feature.place_type?.[0] || 'place';
        const name = feature.text || '';
        const placeName = feature.place_name || '';
        
        // Extraire les parties du contexte Mapbox
        // place_name = "Chambord, Loir-et-Cher, Centre-Val de Loire, France"
        const contextParts = placeName.split(',').map(p => p.trim());
        
        // Construire la ligne 2 selon le type
        let subtitle = '';
        let country = contextParts.length > 0 ? contextParts[contextParts.length - 1] : '';
        
        if (placeType === 'region') {
          // Région → "Région, France"
          subtitle = `Région, ${country}`;
        } else if (placeType === 'district') {
          // Département → "Département, France"
          subtitle = `Département, ${country}`;
        } else if (placeType === 'poi') {
          // POI → "Paris, France" (ville + pays)
          if (contextParts.length >= 3) {
            // Chercher la ville dans le contexte (généralement le 2e élément)
            subtitle = `${contextParts[1]}, ${country}`;
          } else {
            subtitle = country;
          }
        } else {
          // Ville / locality / neighborhood → "Département, Pays"
          if (contextParts.length >= 3) {
            subtitle = `${contextParts[1]}, ${country}`;
          } else if (contextParts.length === 2) {
            subtitle = country;
          } else {
            subtitle = '';
          }
        }
        
        // Déduplication par nom + subtitle
        const dedupeKey = `${name.toLowerCase()}|${subtitle.toLowerCase()}`;
        if (seen.has(dedupeKey)) {
          return null;
        }
        seen.add(dedupeKey);
        
        // Déterminer le template à utiliser
        let templateType = 'city';
        if (placeType === 'poi') {
          templateType = 'poi';
        } else if (placeType === 'region' || placeType === 'district') {
          templateType = 'region';
        }
        
        return {
          name: name,
          subtitle: subtitle,
          context: placeName,
          coordinates: feature.geometry?.coordinates || [0, 0],
          placeType: placeType,
          templateType: templateType,
          fullContext: placeName // Pour la recherche quand on clique
        };
      })
      .filter(item => item !== null)
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
