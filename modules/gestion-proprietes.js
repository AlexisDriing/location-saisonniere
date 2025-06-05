// Gestionnaire principal des propriétés pour la page liste
class PropertyManager {
  constructor() {
    this.propertiesRegistered = false;
    this.registeredCount = 0;
    this.propertyElements = document.querySelectorAll('.lien-logement');
    this.isFiltering = false;
    
    // Éléments de l'interface pour les filtres
    this.dateButton = document.querySelector('.dates-button-search');
    this.textDatesSearch = document.getElementById('text-dates-search');
    
    // Variables pour la pagination
    this.currentPage = 1;
    this.totalPages = 1;
    this.totalResults = 0;
    this.pageSize = 16;
    this.currentFilters = {};
    
    // Variables pour les dates et la localisation
    this.startDate = null;
    this.endDate = null;
    this.searchLocation = null;
    
    this.initialPriceStates = new Map();
    this.init();
  }

  async init() {
    console.log('🏠 Initialisation PropertyManager...');
    
    // Enregistrer toutes les propriétés
    await this.registerAllProperties();
    
    // Stocker l'état initial des prix
    this.storeInitialPriceStates();
    
    // Initialiser les écouteurs d'événements pour les filtres
    this.setupFilterListeners();
    
    console.log('✅ PropertyManager initialisé');
    
    // Initialiser la pagination après un court délai
    setTimeout(() => {
      this.applyInitialPagination();
    }, 1000);

    // Export global
    window.propertyManager = this;
  }

  // ================================
  // ENREGISTREMENT DES PROPRIÉTÉS
  // ================================

  async registerAllProperties() {
    console.log('📝 Enregistrement des propriétés...');
    let promises = [];
    
    this.propertyElements.forEach(element => {
      const propertyLink = element;
      if (!propertyLink) return;
      
      const href = propertyLink.getAttribute('href');
      const propertyId = href.split('/').pop();
      
      if (propertyId) {
        // Récupérer les métadonnées de la propriété
        const metadata = this.extractPropertyMetadata(element);
        
        // Stocker l'ID de propriété comme attribut
        element.setAttribute('data-property-id', propertyId);
        
        // Enregistrer la propriété
        const promise = this.registerProperty(propertyId, metadata);
        promises.push(promise);
      }
    });
    try {
      await Promise.all(promises);
      this.propertiesRegistered = true;
      console.log(`✅ ${this.registeredCount} propriétés enregistrées`);
    } catch (error) {
      console.error('❌ Erreur lors de l\'enregistrement des propriétés:', error);
    }
  }

  extractPropertyMetadata(element) {
    // Récupérer les URLs iCal
    const icalUrls = [];
    for (let i = 1; i <= 4; i++) {
      const icalElement = element.querySelector(`[data-ical-${i}]`);
      if (icalElement) {
        const icalAttr = icalElement.getAttribute(`data-ical-${i}`);
        if (icalAttr && icalAttr.trim() !== '') {
          icalUrls.push(icalAttr.trim());
        }
      }
    }

    // Capacité
    const capacityElement = element.querySelector('[data-voyageurs]');
    const capacity = capacityElement ? parseInt(capacityElement.getAttribute('data-voyageurs'), 10) : 1;
    
    // Prix
    const priceElement = element.querySelector('.texte-prix');
    let price = 0;
    if (priceElement) {
      const priceText = priceElement.textContent;
      const matches = priceText.match(/\d+/g);
      if (matches && matches.length > 0) {
        price = parseInt(matches[matches.length - 1], 10);
      }
    }
    
    // Équipements
    const amenitiesElement = element.querySelector('[data-equipements]');
    const amenities = amenitiesElement ? 
      amenitiesElement.getAttribute('data-equipements').split(',').map(item => item.trim()) : [];
    
    // Options
    const optionsElement = element.querySelector('[data-option-accueil]');
    const options = optionsElement ? 
      optionsElement.getAttribute('data-option-accueil').split(',').map(item => item.trim()) : [];
    
    // Type de logement
    const typeElement = element.querySelector('[data-mode-location]');
    const type = typeElement ? typeElement.getAttribute('data-mode-location') : '';
    
    // Adresse
    const housingItem = element.closest('.housing-item');
    let address = '';
    if (housingItem) {
      const addressElement = housingItem.querySelector('.adresse');
      if (addressElement) {
        address = addressElement.textContent.trim();
      }
    }
    
    // Données de tarification
    let pricingData = null;
    if (housingItem) {
      const jsonElement = housingItem.querySelector('[data-json-tarifs-line], [data-json-tarifs]');
      if (jsonElement) {
        const jsonAttr = jsonElement.getAttribute('data-json-tarifs-line') || 
                        jsonElement.getAttribute('data-json-tarifs');
        if (jsonAttr) {
          try {
            pricingData = JSON.parse(jsonAttr);
          } catch (error) {
            console.error(`Erreur parsing tarification pour ${propertyId}:`, error);
          }
        }
      }
    }

    return {
      ical_urls: icalUrls,
      capacity,
      price,
      amenities,
      options,
      type,
      address,
      pricing_data: pricingData
    };
  }

  async registerProperty(propertyId, metadata) {
    try {
      console.log(`📝 Enregistrement: ${propertyId}`, metadata);
      
      const response = await fetch(`${window.CONFIG.API_URL}/register-property`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          property_id: propertyId,
          ...metadata
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        this.registeredCount++;
        return true;
      } else {
        console.error(`❌ Erreur enregistrement ${propertyId}:`, data.error);
        return false;
      }
    } catch (error) {
      console.error(`❌ Erreur enregistrement ${propertyId}:`, error);
      return false;
    }
  }

  // ================================
  // GESTION DES PRIX
  // ================================

  storeInitialPriceStates() {
    document.querySelectorAll('.housing-item').forEach(item => {
      const propertyId = item.querySelector('.lien-logement')?.getAttribute('data-property-id');
      if (propertyId) {
        const textePrix = item.querySelector('.texte-prix')?.innerHTML || '';
        const pourcentage = item.querySelector('.pourcentage');
        
        this.initialPriceStates.set(propertyId, {
          textePrix,
          pourcentage: pourcentage?.textContent || '',
          pourcentageDisplay: pourcentage?.style.display || 'none'
        });
      }
    });
  }

  async updatePricesForDates(startDate, endDate) {
    if (!this.propertiesRegistered) return;
    
    try {
      console.log('💰 Mise à jour des prix pour:', startDate, 'à', endDate);
      
      // Récupérer les propriétés visibles
      const visiblePropertyIds = [];
      const visibleElements = document.querySelectorAll('.housing-item:not([style*="display: none"]) .lien-logement[data-property-id]');
      
      visibleElements.forEach(element => {
        const propertyId = element.getAttribute('data-property-id');
        if (propertyId) visiblePropertyIds.push(propertyId);
      });
      
      if (visiblePropertyIds.length === 0) return;
      
      // Récupérer le nombre d'adultes
      const adultsElement = document.getElementById('chiffres-adultes');
      const adultsCount = adultsElement ? parseInt(adultsElement.textContent, 10) : 1;
      
      // Construire l'URL pour la requête
      let url = `${window.CONFIG.API_URL}/calculate-prices?start_date=${startDate}&end_date=${endDate}&adults=${adultsCount}`;
      visiblePropertyIds.forEach(id => {
        url += `&property_ids=${encodeURIComponent(id)}`;
      });
      
      // Effectuer la requête
      const response = await fetch(url);
      const data = await response.json();
      
      if (!data.prices) {
        console.error('Format de réponse inattendu:', data);
        return;
      }
      
      console.log('💰 Prix calculés:', data);
      
      // Mettre à jour l'affichage des prix
      Object.entries(data.prices).forEach(([propertyId, priceInfo]) => {
        this.updatePropertyPriceDisplay(propertyId, priceInfo, data.nights);
      });
      
    } catch (error) {
      console.error('❌ Erreur mise à jour prix:', error);
    }
  }

  updatePropertyPriceDisplay(propertyId, priceInfo, nights) {
    const lienLogement = document.querySelector(`.lien-logement[data-property-id="${propertyId}"]`);
    if (!lienLogement) return;
    
    const housingItem = lienLogement.closest('.housing-item');
    if (!housingItem) return;
    
    const textePrix = housingItem.querySelector('.texte-prix');
    const texteTotal = housingItem.querySelector('.text-total');
    const pourcentage = housingItem.querySelector('.pourcentage');
    
    if (nights > 1) {
      // AVEC dates - Afficher prix/nuit + total
      if (textePrix) {
        textePrix.innerHTML = `<strong>${priceInfo.price_per_night}€</strong> / nuit`;
      }
      
      if (texteTotal) {
        const totalPrice = priceInfo.total_price;
        const totalPlatformPrice = priceInfo.platform_price;
        
        const totalText = totalPlatformPrice > totalPrice ? 
          `<del>${totalPlatformPrice}€</del> <strong>${totalPrice}€</strong> au total` : 
          `<strong>${totalPrice}€</strong> au total`;
        
        texteTotal.innerHTML = totalText;
        texteTotal.style.display = 'block';
      }
    } else {
      // SANS dates ou 1 nuit - Format standard
      if (textePrix) {
        const discountText = priceInfo.platform_price_per_night > priceInfo.price_per_night ? 
          `<del>${priceInfo.platform_price_per_night}€</del> ` : '';
        
        textePrix.innerHTML = `Dès ${discountText}<strong>${priceInfo.price_per_night}€ / nuit</strong>`;
      }
      
      if (texteTotal) {
        texteTotal.style.display = 'none';
      }
    }
    
    // Mettre à jour le pourcentage de réduction
    if (pourcentage) {
      if (priceInfo.platform_discount_percentage > 0) {
        pourcentage.textContent = `-${priceInfo.platform_discount_percentage}%`;
        pourcentage.style.display = 'block';
      } else {
        pourcentage.style.display = 'none';
      }
    }
  }

  resetPriceDisplay() {
    console.log('🔄 Réinitialisation des prix...');
    
    document.querySelectorAll('.housing-item').forEach(item => {
      const propertyId = item.querySelector('.lien-logement')?.getAttribute('data-property-id');
      const texteTotal = item.querySelector('.text-total');
      const textePrix = item.querySelector('.texte-prix');
      const pourcentage = item.querySelector('.pourcentage');
      
      // Masquer l'élément du total
      if (texteTotal) {
        texteTotal.style.display = 'none';
      }
      
      // Restaurer l'état initial
      if (propertyId && this.initialPriceStates.has(propertyId)) {
        const initialState = this.initialPriceStates.get(propertyId);
        
        if (textePrix) {
          textePrix.innerHTML = initialState.textePrix;
        }
        
        if (pourcentage) {
          pourcentage.textContent = initialState.pourcentage;
          pourcentage.style.display = initialState.pourcentageDisplay;
        }
      }
    });
  }

  // ================================
  // FILTRAGE ET PAGINATION
  // ================================

  updateCurrentFilters(filters) {
    this.currentFilters = filters;
  }

  async applyFilters(resetPage = true) {
    if (this.isFiltering || !this.propertiesRegistered) return;
    
    this.isFiltering = true;
    console.log('🔍 Application des filtres...');
    
    if (resetPage) {
      this.currentPage = 1;
    }
    
    // Récupérer les valeurs des filtres
    const filters = this.getFilterValues();
    this.updateCurrentFilters(filters);
    
    try {
      // Construire l'URL de la requête
      let url = `${window.CONFIG.API_URL}/filter-properties?`;
      
      if (filters.start && filters.end) {
        url += `start=${filters.start}&end=${filters.end}&`;
      }
      
      if (filters.capacity) {
        url += `capacity=${filters.capacity}&`;
      }
      
      if (filters.price_max) {
        url += `price_max=${filters.price_max}&`;
      }
      
      if (filters.latitude && filters.longitude) {
        url += `latitude=${filters.latitude}&longitude=${filters.longitude}&`;
      }
      
      if (filters.amenities && filters.amenities.length > 0) {
        url += `amenities=${encodeURIComponent(filters.amenities.join(','))}&`;
      }
      
      if (filters.options && filters.options.length > 0) {
        url += `options=${encodeURIComponent(filters.options.join(','))}&`;
      }
      
      if (filters.types && filters.types.length > 0) {
        url += `types=${encodeURIComponent(filters.types.join(','))}&`;
      }
      
      url += `page=${this.currentPage}&limit=${this.pageSize}`;
      
      console.log('🌐 URL requête:', url);
      
      // Afficher indicateur de chargement
      this.showLoading(true);
      
      // Effectuer la requête
      const response = await fetch(url);
      const data = await response.json();
      
      console.log('📊 Réponse serveur:', data);
      
      // Mettre à jour les informations de pagination
      this.totalResults = data.total || 0;
      this.totalPages = data.total_pages || 1;
      this.currentPage = data.page || 1;
      
      // Gérer les résultats
      if (data.properties) {
        this.displayFilteredProperties(data.properties);
        this.renderPagination();
        
        // Mettre à jour les prix si des dates sont sélectionnées
        if (filters.start && filters.end) {
          this.updatePricesForDates(filters.start, filters.end);
        }
      } else {
        this.showNoResults(true);
      }
      
    } catch (error) {
      console.error('❌ Erreur filtrage:', error);
      this.showError(true);
    } finally {
      this.isFiltering = false;
      this.showLoading(false);
    }
  }

  displayFilteredProperties(properties) {
    if (properties.length === 0) {
      // Masquer TOUS les logements quand aucun résultat
      document.querySelectorAll('.housing-item').forEach(item => {
        item.style.display = 'none';
      });
      this.showNoResults(true);
      return;
    }
    
    this.showNoResults(false);
    // Masquer tous les éléments
    document.querySelectorAll('.housing-item').forEach(item => {
      item.style.display = 'none';
    });
    
    // Conteneur parent
    const housingContainer = document.querySelector('.collection-grid');
    if (!housingContainer) {
      console.error('❌ Conteneur de logements non trouvé');
      return;
    }
    
    // Afficher et réorganiser les propriétés filtrées
    properties.forEach(propData => {
      const element = document.querySelector(`.lien-logement[data-property-id="${propData.id}"]`);
      if (element) {
        const housingItem = element.closest('.housing-item');
        if (housingItem) {
          housingItem.style.display = '';
          
          // Mettre à jour la distance si applicable
          if (this.searchLocation && propData.distance !== undefined) {
            this.updateDistanceDisplay(housingItem, propData.distance);
          }
          
          // Réorganiser dans l'ordre trié
          housingContainer.appendChild(housingItem);
        }
      }
    });
    
    console.log(`✅ ${properties.length} propriétés affichées`);
  }

  updateDistanceDisplay(housingItem, distance) {
    const distanceElement = housingItem.querySelector('.distance');
    const separateurElement = housingItem.querySelector('.separateur');
    
    if (distanceElement && separateurElement) {
      distanceElement.textContent = `${Math.round(distance)} km`;
      distanceElement.classList.add('visible');
      distanceElement.style.display = 'inline';
      separateurElement.style.display = 'inline';
    }
  }

  getFilterValues() {
    const filters = {
      start: this.startDate,
      end: this.endDate
    };
    
    // Ajouter coordonnées de recherche si disponibles
    if (this.searchLocation) {
      filters.latitude = this.searchLocation.lat;
      filters.longitude = this.searchLocation.lng;
      filters.distance_max = 100;
    }
    
    // Nombre d'adultes pour calcul taxe de séjour
    const adultsElement = document.getElementById('chiffres-adultes');
    if (adultsElement) {
      filters.adults = parseInt(adultsElement.textContent, 10) || 1;
    }
    
    // Prix maximum - vérifier d'abord FiltersManager
    if (window.filtersManager && window.filtersManager.state.prixMax) {
      filters.price_max = window.filtersManager.state.prixMax;
    }
    // Sinon essayer les éléments de l'interface (fallback)
    else {
      const texteFiltrePrice = document.querySelector('#text-filtre-tarif');
      if (texteFiltrePrice && texteFiltrePrice.textContent.includes('Max')) {
        const matches = texteFiltrePrice.textContent.match(/\d+/);
        if (matches) {
          filters.price_max = parseInt(matches[0], 10);
        }
      }
      
      // Version mobile du prix
      const texteFiltrePrice_mobile = document.querySelector('#text-filtre-tarif-mobile');
      if (texteFiltrePrice_mobile) {
        const matches = texteFiltrePrice_mobile.textContent.match(/\d+/);
        if (matches) {
          filters.price_max = parseInt(matches[0], 10);
        }
      }
    }
    
    // Nombre de voyageurs
    const texteFiltreVoyageurs = document.querySelector('#text-filtre-voyageurs');
    if (texteFiltreVoyageurs) {
      const matches = texteFiltreVoyageurs.textContent.match(/\d+/);
      if (matches) {
        filters.capacity = parseInt(matches[0], 10);
      }
    }
    
    // Équipements sélectionnés
    filters.amenities = [];
    document.querySelectorAll('#filtre-equipements .w-checkbox').forEach(container => {
      const checkbox = container.querySelector('input[type="checkbox"]');
      const label = container.querySelector('.w-form-label');
      
      if (checkbox && label && checkbox.checked) {
        filters.amenities.push(label.textContent.trim());
      }
    });
    
    // Options sélectionnées
    filters.options = [];
    document.querySelectorAll('#filtre-option-accueil .w-checkbox').forEach(container => {
      const checkbox = container.querySelector('input[type="checkbox"]');
      const label = container.querySelector('.w-form-label');
      
      if (checkbox && label && checkbox.checked) {
        filters.options.push(label.textContent.trim());
      }
    });
    
    // Types sélectionnés
    filters.types = [];
    document.querySelectorAll('#filtre-mode-location .w-checkbox').forEach(container => {
      const checkbox = container.querySelector('input[type="checkbox"]');
      const label = container.querySelector('.w-form-label');
      
      if (checkbox && label && checkbox.checked) {
        filters.types.push(label.textContent.trim());
      }
    });
    
    return filters;
  }

  // ================================
  // PAGINATION
  // ================================

  changePage(newPage) {
    if (newPage < 1 || newPage > this.totalPages || newPage === this.currentPage) {
      return;
    }
    
    this.currentPage = newPage;
    
    if (Object.keys(this.currentFilters).length > 0) {
      this.applyFilters(false);
    } else {
      this.applySimplePagination();
    }
    
    // Scroll vers le haut
    window.scrollTo({
      top: document.querySelector('.collection-list-wrapper')?.offsetTop - 100 || 0,
      behavior: 'smooth'
    });
  }

  renderPagination() {
    const paginationContainer = document.querySelector('.custom-pagination');
    if (!paginationContainer) return;
    
    paginationContainer.innerHTML = '';
    
    if (this.totalPages <= 1) {
      paginationContainer.style.display = 'none';
      return;
    }
    
    paginationContainer.style.display = '';
    
    const paginationList = document.createElement('ul');
    paginationList.className = 'pagination-list';
    
    // Bouton précédent
    const prevButton = this.createPaginationButton('Précédent', 'prev', this.currentPage <= 1);
    paginationList.appendChild(prevButton);
    
    // Pages avec ellipses
    this.addPageNumbers(paginationList);
    
    // Bouton suivant
    const nextButton = this.createPaginationButton('Suivant', 'next', this.currentPage >= this.totalPages);
    paginationList.appendChild(nextButton);
    
    // Texte de résultats
    const resultsText = document.createElement('div');
    resultsText.className = 'pagination-results-text';
    const start = (this.currentPage - 1) * this.pageSize + 1;
    const end = Math.min(start + this.pageSize - 1, this.totalResults);
    resultsText.textContent = `Affichage de ${start}-${end} sur ${this.totalResults} logements`;
    
    paginationContainer.appendChild(resultsText);
    paginationContainer.appendChild(paginationList);
  }

  createPaginationButton(text, page, disabled) {
    const button = document.createElement('li');
    button.className = `pagination-item pagination-${page} ${disabled ? 'disabled' : ''}`;
    button.innerHTML = `<a href="#" class="pagination-link" data-page="${page}">${text}</a>`;
    return button;
  }

  addPageNumbers(paginationList) {
    const maxVisiblePages = 5;
    let startPage = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(this.totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages && startPage > 1) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    // Page 1 + ellipses si nécessaire
    if (startPage > 1) {
      this.addPageButton(paginationList, 1);
      if (startPage > 2) {
        const ellipsis = document.createElement('li');
        ellipsis.className = 'pagination-item pagination-ellipsis';
        ellipsis.textContent = '...';
        paginationList.appendChild(ellipsis);
      }
    }
    
    // Pages visibles
    for (let i = startPage; i <= endPage; i++) {
      this.addPageButton(paginationList, i);
    }
    
    // Dernière page + ellipses si nécessaire
    if (endPage < this.totalPages) {
      if (endPage < this.totalPages - 1) {
        const ellipsis = document.createElement('li');
        ellipsis.className = 'pagination-item pagination-ellipsis';
        ellipsis.textContent = '...';
        paginationList.appendChild(ellipsis);
      }
      this.addPageButton(paginationList, this.totalPages);
    }
  }

  addPageButton(paginationList, pageNumber) {
    const pageItem = document.createElement('li');
    pageItem.className = `pagination-item pagination-number ${pageNumber === this.currentPage ? 'active' : ''}`;
    
    const pageLink = document.createElement('a');
    pageLink.href = '#';
    pageLink.className = 'pagination-link';
    pageLink.textContent = pageNumber;
    pageLink.setAttribute('data-page', pageNumber);
    
    pageLink.addEventListener('click', (e) => {
      e.preventDefault();
      this.changePage(pageNumber);
    });
    
    pageItem.appendChild(pageLink);
    paginationList.appendChild(pageItem);
  }

  applyInitialPagination() {
    if (!this.propertiesRegistered) return;
    
    const allHousingItems = document.querySelectorAll('.housing-item');
    this.totalResults = this.registeredCount;
    this.totalPages = Math.ceil(this.totalResults / this.pageSize);
    this.currentPage = 1;
    
    console.log(`📄 Pagination initiale: ${allHousingItems.length} visibles sur ${this.totalResults} total`);
    
    if (allHousingItems.length < this.totalResults) {
      this.applyFilters(true);
    } else {
      this.applySimplePagination();
    }
  }

  applySimplePagination() {
    const allHousingItems = document.querySelectorAll('.housing-item');
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    
    allHousingItems.forEach((item, index) => {
      item.style.display = (index >= startIndex && index < endIndex) ? '' : 'none';
    });
    
    this.renderPagination();
  }

  // ================================
  // GESTION DES DATES (DÉLÉGUÉE AU CALENDARLISTMANAGER)
  // ================================

  // Méthode pour définir la localisation de recherche
  setSearchLocation(location) {
    this.searchLocation = location;
    console.log('📍 Localisation de recherche définie:', location);
  }

  // Méthodes appelées par CalendarListManager
  setDates(startDate, endDate) {
    this.startDate = startDate;
    this.endDate = endDate;
    console.log('📅 Dates définies:', startDate, 'à', endDate);
  }

  clearDates() {
    this.startDate = null;
    this.endDate = null;
    console.log('🗑️ Dates effacées');
  }

  // ================================
  // RÉINITIALISATION
  // ================================

  resetFilters() {
    // Vider les filtres actuels
    this.currentFilters = {};
    
    // Réinitialiser la localisation de recherche
    this.searchLocation = null;
    
    // Masquer les distances affichées
    document.querySelectorAll('.distance').forEach(element => {
      element.classList.remove('visible');
      element.style.display = 'none';
    });
    
    document.querySelectorAll('.separateur').forEach(element => {
      element.style.display = 'none';
    });
    
    // Réinitialiser à la première page
    this.currentPage = 1;
    
    // Revenir à la pagination initiale
    this.applyInitialPagination();
    
    // Masquer les messages d'erreur
    this.showNoResults(false);
    this.showError(false);
    
    console.log('🔄 Filtres réinitialisés');
  }

  // ================================
  // INTERFACE UTILISATEUR
  // ================================

  showLoading(show) {
    const loadingIndicator = document.querySelector('.loading-indicator');
    if (loadingIndicator) {
      loadingIndicator.style.display = show ? 'flex' : 'none';
    }
  }

  showNoResults(show) {
    const noResultsMessage = document.querySelector('.no-results-message');
    if (noResultsMessage) {
      noResultsMessage.style.display = show ? 'block' : 'none';
    }
  }

  showError(show) {
    const errorMessage = document.querySelector('.error-message');
    if (errorMessage) {
      errorMessage.style.display = show ? 'block' : 'none';
    }
  }

  // ================================
  // MÉTHODES PUBLIQUES
  // ================================

  // Méthode pour être appelée par d'autres modules
  triggerFilter() {
    this.applyFilters();
  }

  // Méthode pour obtenir l'état actuel
  getState() {
    return {
      currentPage: this.currentPage,
      totalPages: this.totalPages,
      totalResults: this.totalResults,
      currentFilters: this.currentFilters,
      startDate: this.startDate,
      endDate: this.endDate,
      searchLocation: this.searchLocation,
      isFiltering: this.isFiltering,
      propertiesRegistered: this.propertiesRegistered
    };
  }
}

// Gestionnaire global des clics de pagination
document.addEventListener('click', function(e) {
  const link = e.target.closest('.pagination-link');
  if (link && window.propertyManager) {
    e.preventDefault();
    
    const page = link.getAttribute('data-page');
    if (!page) return;
    
    console.log('🖱️ Clic pagination:', page);
    
    if (page === 'prev' && window.propertyManager.currentPage > 1) {
      window.propertyManager.changePage(window.propertyManager.currentPage - 1);
    } else if (page === 'next' && window.propertyManager.currentPage < window.propertyManager.totalPages) {
      window.propertyManager.changePage(window.propertyManager.currentPage + 1);
    } else if (page !== 'prev' && page !== 'next') {
      const pageNum = parseInt(page, 10);
      if (!isNaN(pageNum)) {
        window.propertyManager.changePage(pageNum);
      }
    }
  }
});

// Gestionnaire pour mettre à jour localStorage quand les voyageurs changent
document.addEventListener('click', function(e) {
  const buttonId = e.target.id;
  const isCounterButton = [
    'adultes-plus', 'adultes-moins', 'enfants-plus', 'enfants-moins',
    'adultes-plus-mobile', 'adultes-moins-mobile', 
    'enfants-plus-mobile', 'enfants-moins-mobile'
  ].includes(buttonId);
  
  if (isCounterButton) {
    setTimeout(function() {
      const adultsElement = document.getElementById('chiffres-adultes');
      const enfantsElement = document.getElementById('chiffres-enfants');
      
      const storedDataJSON = localStorage.getItem('selected_search_data');
      if (storedDataJSON && adultsElement && enfantsElement) {
        try {
          const storedData = JSON.parse(storedDataJSON);
          
          storedData.adultes = parseInt(adultsElement.textContent, 10);
          storedData.enfants = parseInt(enfantsElement.textContent, 10);
          storedData.timestamp = Date.now();
          
          localStorage.setItem('selected_search_data', JSON.stringify(storedData));
          console.log('👥 Données voyageurs mises à jour:', storedData);
        } catch (error) {
          console.error('❌ Erreur mise à jour voyageurs:', error);
        }
      }
    }, 50);
  }
});

// Export global
window.PropertyManager = PropertyManager;
