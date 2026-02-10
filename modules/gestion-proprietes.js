// Gestionnaire principal des propriétés pour la page liste - personnes supplémentaire

// 🔒 FONCTIONS DE SÉCURITÉ POUR L'AFFICHAGE DES PRIX
function setPriceDisplay(element, price, unit = '') {
  element.textContent = ''; // Nettoyer
  const strong = document.createElement('strong');
  strong.textContent = `${price}€`;
  element.appendChild(strong);
  if (unit) {
    element.appendChild(document.createTextNode(` ${unit}`));
  }
}

function setPriceWithStrike(element, oldPrice, newPrice, prefix = '', suffix = '') {
  element.textContent = ''; // Nettoyer
  
  if (prefix) {
    element.appendChild(document.createTextNode(prefix + ' '));
  }
  
  if (oldPrice) {
    const del = document.createElement('del');
    del.textContent = `${oldPrice}€`;
    element.appendChild(del);
    element.appendChild(document.createTextNode(' '));
  }
  
  const strong = document.createElement('strong');
  strong.textContent = `${newPrice}€`;
  element.appendChild(strong);
  
  if (suffix) {
    element.appendChild(document.createTextNode(' ' + suffix));
  }
}

class PropertyManager {
  constructor() {
    // Templates et containers
    this.templateElement = null;
    this.templateClone = null;
    this.containerElement = null;
    
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
    
    // 🚀 Gestionnaire de performance
    this.requestQueue = [];
    this.activeRequests = 0;
    this.requestCache = new Map();
    this.lastCacheCleanup = Date.now();
    this.performanceMetrics = {
      totalRequests: 0,
      cacheHits: 0,
      averageResponseTime: 0,
      responseTimes: []
    };
    
    this.init();
  }

  async init() {
    const startTime = performance.now();
    
    // Récupérer le template et le container
    this.templateElement = document.querySelector('.housing-item');
    this.containerElement = document.querySelector('.collection-grid');
    this.createGridPreloader();
 
    if (this.templateElement) {
      // Cloner le template et cacher l'original
      this.templateClone = this.templateElement.cloneNode(true);
      
      // 🆕 NOUVEAU : Nettoyer le template pour éviter la contamination
      this.cleanTemplate(this.templateClone);      
      this.templateElement.style.display = 'none';
    }
    
    // Initialiser les écouteurs d'événements pour les filtres
    this.setupFilterListeners();
    this.loadHomeSearchData();

    
    const initTime = Math.round(performance.now() - startTime);
    
    // Charger la première page de propriétés
    setTimeout(() => {
      this.applyFilters(true);
    }, window.CONFIG?.PERFORMANCE?.lazyLoadDelay || 100);

    // Export global
    window.propertyManager = this;
    
    // Nettoyage automatique du cache
    this.setupCacheCleanup();
  }

  createGridPreloader() {
    const wrapper = document.querySelector('.collection-list-wrapper');
    if (wrapper && !wrapper.querySelector('.grid-preloader')) {
      const preloader = document.createElement('div');
      preloader.className = 'grid-preloader';
      preloader.innerHTML = '<div class="spinner"></div>';
      wrapper.appendChild(preloader);
    }
  }
  
  cleanTemplate(template) {
    
    // Nettoyer TOUTES les images de TOUTES les façons possibles
    const allImages = template.querySelectorAll('img');
    allImages.forEach(img => {
      // Supprimer complètement les attributs d'image
      img.removeAttribute('src');
      img.removeAttribute('srcset');
      img.removeAttribute('data-src');  // Au cas où lazy loading
      img.removeAttribute('style');
      
      // Alternative : mettre un placeholder transparent
      // img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    });
    
    // Nettoyer aussi tout élément avec background-image
    template.querySelectorAll('*').forEach(el => {
      if (el.style.backgroundImage) {
        el.style.backgroundImage = '';
      }
    });
    
    // Nettoyer les liens qui pourraient contenir des hrefs
    const links = template.querySelectorAll('a');
    links.forEach(link => {
      link.href = '#';
      link.removeAttribute('data-property-id');
    });
    
    // Nettoyer les textes
    const textSelectors = [
      '.text-nom-logement-card',
      '.adresse', 
      '.texte-prix',
      '.text-total',
      '.pourcentage',
      '.distance',
      '.bloc-h-te-main div:last-child'
    ];
    
    textSelectors.forEach(selector => {
      const elements = template.querySelectorAll(selector);
      elements.forEach(el => {
        el.textContent = '';
        if (selector === '.text-total' || selector === '.pourcentage' || selector === '.distance') {
          el.style.display = 'none';
        }
      });
    });
    
    // Nettoyer tous les attributs data-*
    template.querySelectorAll('*[data-property-id], *[data-mode-location], *[data-equipements], *[data-option-accueil], *[data-json-tarifs-line], *[data-voyageurs]').forEach(el => {
      Array.from(el.attributes).forEach(attr => {
        if (attr.name.startsWith('data-')) {
          el.removeAttribute(attr.name);
        }
      });
    });
    
}

  
  // Configuration du nettoyage automatique du cache
  setupCacheCleanup() {
    // Nettoyer le cache toutes les 5 minutes
    setInterval(() => {
      this.cleanupCache();
    }, 5 * 60 * 1000);
    
    // Nettoyer quand l'utilisateur quitte la page
    window.addEventListener('beforeunload', () => {
      this.cleanupCache();
    });
  }

  // ================================
  // GESTION DES PRIX
  // ================================

  async updatePricesForDates(startDate, endDate) {
    try {
      
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
      
      // Vérifier le cache d'abord
      const cacheKey = `prices_${startDate}_${endDate}_${adultsCount}_${visiblePropertyIds.join(',')}`;
      const cachedPrices = this.getFromCache(cacheKey);
      
      if (cachedPrices) {
        this.updatePriceDisplays(cachedPrices.prices, cachedPrices.nights);
        return;
      }
      
      // 🆕 Récupérer le nombre total de voyageurs (adultes + enfants, hors bébés)
      const childrenElement = document.getElementById('chiffres-enfants');
      const childrenCount = childrenElement ? parseInt(childrenElement.textContent, 10) : 0;
      const totalGuests = adultsCount + childrenCount;
      
      // Construire l'URL pour la requête
      let url = `${window.CONFIG.API_URL}/calculate-prices?start_date=${startDate}&end_date=${endDate}&adults=${adultsCount}&total_guests=${totalGuests}`;
      visiblePropertyIds.forEach(id => {
        url += `&property_ids=${encodeURIComponent(id)}`;
      });
      
      // Utiliser la queue de requêtes
      const response = await this.queueRequest(url);
      const data = await response.json();
      
      if (!data.prices) {
        console.error('Format de réponse inattendu:', data);
        return;
      }
      
      // Mettre en cache
      this.setInCache(cacheKey, { prices: data.prices, nights: data.nights });
      this.updatePriceDisplays(data.prices, data.nights);
      
    } catch (error) {
      console.error('❌ Erreur mise à jour prix:', error);
    }
  }

  // Méthode séparée pour mettre à jour l'affichage des prix
  updatePriceDisplays(prices, nights) {
    Object.entries(prices).forEach(([propertyId, priceInfo]) => {
      this.updatePropertyPriceDisplay(propertyId, priceInfo, nights);
    });
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
      if (textePrix) {
        setPriceDisplay(textePrix, priceInfo.price_per_night, '/ nuit');  // ✅ SÉCURISÉ
      }
      
      if (texteTotal) {
        const totalPrice = priceInfo.total_price;
        const totalPlatformPrice = priceInfo.platform_price;
        
        // ✅ SÉCURISÉ : Utilisation des helpers
        if (totalPlatformPrice > totalPrice) {
          setPriceWithStrike(texteTotal, totalPlatformPrice, totalPrice, '', 'au total');
        } else {
          setPriceDisplay(texteTotal, totalPrice, 'au total');
        }
        texteTotal.style.display = 'block';
      }
    } else {
    if (textePrix) {
      if (priceInfo.platform_price_per_night > priceInfo.price_per_night) {
        setPriceWithStrike(textePrix, priceInfo.platform_price_per_night, priceInfo.price_per_night, 'Dès', '/ nuit');  // ✅ SÉCURISÉ
      } else {
        // Créer manuellement pour le cas sans réduction
        textePrix.textContent = '';
        textePrix.appendChild(document.createTextNode('Dès '));
        const strong = document.createElement('strong');
        strong.textContent = `${priceInfo.price_per_night}€ / nuit`;
        textePrix.appendChild(strong);
      }
    }
      
      if (texteTotal) {
        texteTotal.style.display = 'none';
      }
    }
    
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
    
    // Masquer tous les totaux
    document.querySelectorAll('.text-total').forEach(element => {
      element.style.display = 'none';
    });
    
    // Si des dates étaient sélectionnées, les effacer et recharger
    if (this.startDate || this.endDate) {
      this.startDate = null;
      this.endDate = null;
      this.applyFilters(true);
    }
  }

  // ================================
  // SYSTÈME DE CACHE OPTIMISÉ
  // ================================

  buildCacheKey(filters) {
    const keyParts = [
      filters.start || 'no-start',
      filters.end || 'no-end',
      filters.capacity || 'no-capacity',
      filters.price_max || 'no-price',
      filters.latitude || 'no-lat',
      filters.longitude || 'no-lng',
      (filters.amenities || []).sort().join(',') || 'no-amenities',
      (filters.options || []).sort().join(',') || 'no-options',
      (filters.types || []).sort().join(',') || 'no-types',
      this.currentPage,
      this.pageSize
    ];
    
    return keyParts.join('|');
  }

  setInCache(key, data) {
    const maxCacheSize = window.CONFIG?.PERFORMANCE?.cacheSize || 100;
    
    // Nettoyer le cache s'il devient trop grand
    if (this.requestCache.size >= maxCacheSize) {
      this.cleanupCache();
    }
    
    this.requestCache.set(key, {
      data: data,
      timestamp: Date.now(),
      accessCount: 1
    });
  }

  getFromCache(key) {
    const cached = this.requestCache.get(key);
    if (!cached) return null;
    
    // Vérifier si le cache n'est pas expiré (30 secondes pour les filtres, 5 minutes pour les prix)
    const maxAge = key.startsWith('prices_') ? 5 * 60 * 1000 : 30 * 1000;
    if (Date.now() - cached.timestamp > maxAge) {
      this.requestCache.delete(key);
      return null;
    }
    
    // Incrémenter le compteur d'accès pour les statistiques
    cached.accessCount++;
    this.performanceMetrics.cacheHits++;
    
    return cached.data;
  }

  cleanupCache() {
    const now = Date.now();
    const expiredKeys = [];
    let oldestTimestamp = now;
    let oldestKey = null;
    
    // Identifier les entrées expirées et la plus ancienne
    for (const [key, value] of this.requestCache.entries()) {
      const maxAge = key.startsWith('prices_') ? 5 * 60 * 1000 : 30 * 1000;
      
      if (now - value.timestamp > maxAge) {
        expiredKeys.push(key);
      } else if (value.timestamp < oldestTimestamp) {
        oldestTimestamp = value.timestamp;
        oldestKey = key;
      }
    }
    
    // Supprimer les entrées expirées
    expiredKeys.forEach(key => this.requestCache.delete(key));
    
    // Si le cache est encore trop grand, supprimer les plus anciennes
    const maxSize = window.CONFIG?.PERFORMANCE?.cacheSize || 100;
    while (this.requestCache.size > maxSize && oldestKey) {
      this.requestCache.delete(oldestKey);
      
      // Trouver la prochaine plus ancienne
      oldestTimestamp = now;
      oldestKey = null;
      for (const [key, value] of this.requestCache.entries()) {
        if (value.timestamp < oldestTimestamp) {
          oldestTimestamp = value.timestamp;
          oldestKey = key;
        }
      }
    }
    
    this.lastCacheCleanup = now;
  }

  // ================================
  // GESTIONNAIRE DE REQUÊTES OPTIMISÉ
  // ================================

  async queueRequest(url) {
    return new Promise((resolve, reject) => {
      const requestItem = { 
        url, 
        resolve, 
        reject,
        timestamp: Date.now()
      };
      
      const maxConcurrent = window.CONFIG?.PERFORMANCE?.maxConcurrentRequests || 5;
      
      if (this.activeRequests < maxConcurrent) {
        this.executeRequest(requestItem);
      } else {
        this.requestQueue.push(requestItem);
        if (window.CONFIG?.PERFORMANCE?.logTimings) {
          console.log(`📋 Requête mise en queue (${this.requestQueue.length} en attente)`);
        }
      }
    });
  }

  async executeRequest({ url, resolve, reject, timestamp }) {
    this.activeRequests++;
    const requestStartTime = performance.now();
    
    try {
      
      const response = await fetch(url);
      
      // Mesurer le temps de réponse
      const responseTime = Math.round(performance.now() - requestStartTime);
      this.recordResponseTime(responseTime);
      
      resolve(response);
      
    } catch (error) {
      const responseTime = Math.round(performance.now() - requestStartTime);
      this.recordResponseTime(responseTime);
      reject(error);
    } finally {
      this.activeRequests--;
      
      // Traiter la prochaine requête en queue
      if (this.requestQueue.length > 0) {
        const nextRequest = this.requestQueue.shift();
        
        // Vérifier que la requête n'est pas trop ancienne (timeout)
        const requestAge = Date.now() - nextRequest.timestamp;
        const timeout = window.CONFIG?.PERFORMANCE?.moduleLoadTimeout || 5000;
        
        if (requestAge < timeout) {
          this.executeRequest(nextRequest);
        } else {
          console.warn('⚠️ Requête expirée, ignorée');
          nextRequest.reject(new Error('Request timeout'));
        }
      }
    }
  }

  recordResponseTime(time) {
    this.performanceMetrics.totalRequests++;
    this.performanceMetrics.responseTimes.push(time);
    
    // Garder seulement les 100 derniers temps pour le calcul de la moyenne
    if (this.performanceMetrics.responseTimes.length > 100) {
      this.performanceMetrics.responseTimes.shift();
    }
    
    // Calculer la moyenne
    const sum = this.performanceMetrics.responseTimes.reduce((a, b) => a + b, 0);
    this.performanceMetrics.averageResponseTime = Math.round(sum / this.performanceMetrics.responseTimes.length);
  }

  // ================================
  // FILTRAGE ET PAGINATION OPTIMISÉS
  // ================================

  updateCurrentFilters(filters) {
    this.currentFilters = filters;
  }

  async applyFilters(resetPage = true) {
    if (this.isFiltering) return;

    if (this.filterTimeout) {
        clearTimeout(this.filterTimeout);
    }
    
    this.filterTimeout = setTimeout(async () => {
    
    this.isFiltering = true;
    const filterStartTime = performance.now();
    
    if (resetPage) {
      this.currentPage = 1;
    }
    
    const filters = this.getFilterValues();
    this.updateCurrentFilters(filters);
    
    try {
      // Vérifier le cache d'abord
      const cacheKey = this.buildCacheKey(filters);
      const cachedData = this.getFromCache(cacheKey);
      
      if (cachedData) {
        this.displayFilteredProperties(cachedData.properties);
        this.totalResults = cachedData.total || 0;
        this.totalPages = cachedData.total_pages || 1;
        this.currentPage = cachedData.page || 1;
        this.renderPagination();
        
        // Mettre à jour les prix si des dates sont sélectionnées
        if (filters.start && filters.end) {
          this.updatePricesForDates(filters.start, filters.end);
        }
        
        const cacheTime = Math.round(performance.now() - filterStartTime);
        return;
      }
      
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
      
      // 🆕 Ajouter le nombre de voyageurs pour le calcul du supplément
      if (filters.totalGuests) {
        url += `adults=${filters.adults}&total_guests=${filters.totalGuests}&`;
      }
      
      url += `page=${this.currentPage}&limit=${this.pageSize}`;


      // Afficher indicateur de chargement
      this.showLoading(true);
      
      // Utiliser la queue de requêtes
      const response = await this.queueRequest(url);
      const data = await response.json();
    
      
      // Mettre en cache la réponse
      this.setInCache(cacheKey, data);
      
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
      
      const totalTime = Math.round(performance.now() - filterStartTime);
      
    } catch (error) {
      console.error('❌ Erreur filtrage:', error);
      this.showError(true);
    } finally {
      this.isFiltering = false;
      this.showLoading(false);
    }
    }, 300); // AJOUT DE CETTE LIGNE
  }

  displayFilteredProperties(properties) {
    if (!this.containerElement || !this.templateClone) {
      console.error('❌ Template ou conteneur non trouvé');
      return;
    }
    
    // Vider le conteneur (sauf le template caché)
    const existingItems = this.containerElement.querySelectorAll('.housing-item:not([style*="display: none"])');
    existingItems.forEach(item => item.remove());
    
    if (properties.length === 0) {
      this.showNoResults(true);
      return;
    }
    
    this.showNoResults(false);
    
    // Créer les nouvelles cards
    properties.forEach(propData => {
      const newCard = this.createPropertyCard(propData);
      if (newCard) {
        this.containerElement.appendChild(newCard);
      }
    });
    
  }

  createPropertyCard(propData) {
    if (!this.templateClone) return null;
    
    const newCard = this.templateClone.cloneNode(true);
    newCard.style.display = '';
    
    // Lien principal
    const linkElement = newCard.querySelector('.lien-logement');
    if (linkElement) {
      linkElement.href = `/locations-saisonnieres/${propData.id}`;
      linkElement.setAttribute('data-property-id', propData.id);
    }
    
    // Nom du logement - CORRECTION du sélecteur
    const nameElement = newCard.querySelector('.text-nom-logement-card');
    if (nameElement) {
      nameElement.textContent = propData.name || 'Logement';
    }

    // Nom de l'hôte
    const hostNameElement = newCard.querySelector('.bloc-h-te-main div:last-child');
    if (hostNameElement && propData.host_name) {
      hostNameElement.textContent = propData.host_name;
    }
    
    // Adresse (formatée ville, pays)
    const addressElement = newCard.querySelector('.adresse');
    if (addressElement && propData.address) {
      const addressParts = propData.address.split(',').map(part => part.trim());
      const cityCountry = addressParts.length >= 2 ? 
        addressParts.slice(0, 2).join(', ') : propData.address;
      addressElement.textContent = cityCountry;
    }
    
   // Prix avec gestion du prix barré
  const priceElement = newCard.querySelector('.texte-prix');
  const pourcentageElement = newCard.querySelector('.pourcentage');
  
  if (priceElement && propData.pricing_data) {
    const pricingData = propData.pricing_data;
    
    // SIMPLIFICATION : Trouver le prix le plus bas
    let lowestPrice = Infinity;
    let lowestPriceData = null;
    
    // Vérifier le prix par défaut
    if (pricingData.defaultPricing && pricingData.defaultPricing.price) {
      if (pricingData.defaultPricing.price < lowestPrice) {
        lowestPrice = pricingData.defaultPricing.price;
        lowestPriceData = pricingData.defaultPricing;
      }
    }
    
    // Vérifier les saisons
    if (pricingData.seasons) {
      for (const season of pricingData.seasons) {
        if (season.price < lowestPrice) {
          lowestPrice = season.price;
          lowestPriceData = season;
        }
      }
    }
    
    // Si on n'a trouvé aucun prix, utiliser le prix du CMS ou 100
    const basePrice = lowestPrice !== Infinity ? lowestPrice : (propData.price || 100);
    
    // Calculer le prix plateforme
    let platformPrice = basePrice;
    let hasDiscount = false;
    
    if (lowestPriceData) {
      // Si on a des prix plateformes pour cette donnée
      if (lowestPriceData.platformPrices) {
        // 🔧 FIX : Filtrer les prix à 0 comme dans les autres modules
        const prices = Object.values(lowestPriceData.platformPrices).filter(price => price > 0);
        if (prices.length > 0) {
          platformPrice = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
          hasDiscount = true;
        }
      }
      
      // Si pas de prix plateformes valides, appliquer 17% par défaut
      if (!hasDiscount) {
        const defaultDiscount = (pricingData.platformPricing && pricingData.platformPricing.defaultDiscount) 
          ? pricingData.platformPricing.defaultDiscount 
          : 17;
        platformPrice = Math.round(basePrice * (100 / (100 - defaultDiscount)));
        hasDiscount = true;
      }
    }
    
    // Afficher avec prix barré si différent
    if (hasDiscount && platformPrice > basePrice) {
      setPriceWithStrike(priceElement, platformPrice, basePrice, 'Dès', '/ nuit');  // ✅ SÉCURISÉ
      
      // Calculer et afficher le pourcentage
      if (pourcentageElement) {
        const discount = Math.round(((platformPrice - basePrice) / platformPrice) * 100);
        pourcentageElement.textContent = `-${discount}%`;
        pourcentageElement.style.display = 'block';
      }
    } else {
      setPriceDisplay(priceElement, basePrice, '/ nuit');  // ✅ SÉCURISÉ
      // Ajouter "Dès" manuellement
      const currentContent = priceElement.innerHTML;
      priceElement.textContent = '';
      priceElement.appendChild(document.createTextNode('Dès '));
      const strong = document.createElement('strong');
      strong.textContent = `${basePrice}€ / nuit`;
      priceElement.appendChild(strong);
      
      if (pourcentageElement) {
        pourcentageElement.style.display = 'none';
      }
    }
  } else if (priceElement && propData.price) {
    // Fallback si pas de pricing_data
    priceElement.textContent = '';  // ✅ SÉCURISÉ
    priceElement.appendChild(document.createTextNode('Dès '));
    const strong = document.createElement('strong');
    strong.textContent = `${propData.price}€ / nuit`;
    priceElement.appendChild(strong);
    
    if (pourcentageElement) {
      pourcentageElement.style.display = 'none';
    }
  }
    
    // Capacité
    const capacityElement = newCard.querySelector('[data-voyageurs]');
    if (capacityElement && propData.capacity) {
      capacityElement.setAttribute('data-voyageurs', propData.capacity);
      const capacityText = propData.capacity > 1 ? 
        `${propData.capacity} voyageurs` : '1 voyageur';
      capacityElement.textContent = capacityText;
    }
    
    // Distance (si recherche géographique)
    if (this.searchLocation && propData.distance !== undefined) {
      const distanceElement = newCard.querySelector('.distance');
      const separatorElement = newCard.querySelector('.separateur');
      
      if (distanceElement) {
        distanceElement.textContent = `${Math.round(propData.distance)} km`;
        distanceElement.style.display = 'inline';
      }
      if (separatorElement) {
        separatorElement.style.display = 'inline';
      }
    }
    
// Utiliser la première image de images_gallery
const imageElement = newCard.querySelector('.image-main');
if (imageElement) {
  // D'ABORD nettoyer complètement
  imageElement.removeAttribute('src');
  imageElement.removeAttribute('srcset');
  imageElement.style.backgroundImage = '';
  
  // Récupérer la première image depuis images_gallery
  let firstImageUrl = null;
  
  if (propData.images_gallery && propData.images_gallery.length > 0) {
    const firstImage = propData.images_gallery[0];
    
    // Extraire l'URL selon le format
    if (typeof firstImage === 'object' && firstImage.url) {
      firstImageUrl = firstImage.url;
    } else if (typeof firstImage === 'string') {
      firstImageUrl = firstImage;
    }
  }
  
  // PUIS ajouter la nouvelle image si elle existe
  if (firstImageUrl && firstImageUrl.startsWith('http')) {
    imageElement.src = firstImageUrl;
    imageElement.style.backgroundImage = `url(${firstImageUrl})`;
  }
}

// Image de l'hôte
const hostImageElement = newCard.querySelector('.image-hote-main');
if (hostImageElement) {
  // 🆕 TOUJOURS nettoyer d'abord
  hostImageElement.src = '';
  hostImageElement.style.backgroundImage = '';
  
  if (propData.host_image) {
    hostImageElement.src = propData.host_image;
  }
}
    
    // Type de logement
    const typeElement = newCard.querySelector('[data-mode-location]');
    if (typeElement && propData.type) {
      typeElement.setAttribute('data-mode-location', propData.type);
    }

    // Afficher/masquer l'élément chambre d'hôtes
    const chambreHoteElement = newCard.querySelector('.chambres-hote');
    if (chambreHoteElement) {
      if (propData.type === "Chambre d'hôtes") {
        chambreHoteElement.style.display = 'block'; // ou 'flex' selon votre CSS
      } else {
        chambreHoteElement.style.display = 'none';
      }
    }
    
    // Équipements
    const amenitiesElement = newCard.querySelector('[data-equipements]');
    if (amenitiesElement && propData.amenities) {
      amenitiesElement.setAttribute('data-equipements', propData.amenities.join(', '));
    }
    
    // Options
    const optionsElement = newCard.querySelector('[data-option-accueil]');
    if (optionsElement && propData.options) {
      optionsElement.setAttribute('data-option-accueil', propData.options.join(', '));
    }
    
    // JSON tarifs pour le calcul des prix
    const tarifElement = newCard.querySelector('[data-json-tarifs-line]');
    if (tarifElement && propData.pricing_data) {
      tarifElement.setAttribute('data-json-tarifs-line', JSON.stringify(propData.pricing_data));
    }
    
    return newCard;
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
    
    if (this.searchLocation) {
      filters.latitude = this.searchLocation.lat;
      filters.longitude = this.searchLocation.lng;
      filters.distance_max = 100;
    }
    
    const adultsElement = document.getElementById('chiffres-adultes');
    const childrenElement = document.getElementById('chiffres-enfants');
    if (adultsElement) {
      filters.adults = parseInt(adultsElement.textContent, 10) || 1;
    }
    filters.children = childrenElement ? parseInt(childrenElement.textContent, 10) : 0;
    filters.totalGuests = (filters.adults || 1) + filters.children;
    
    // Prix maximum - vérifier d'abord FiltersManager
    if (window.filtersManager && window.filtersManager.state.prixMax) {
      filters.price_max = window.filtersManager.state.prixMax;
    } else {
      const texteFiltrePrice = document.querySelector('#text-filtre-tarif');
      if (texteFiltrePrice && texteFiltrePrice.textContent.includes('Max')) {
        const matches = texteFiltrePrice.textContent.match(/\d+/);
        if (matches) {
          filters.price_max = parseInt(matches[0], 10);
        }
      }
      
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
      this.applyFilters(false);
    }
    
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
    
    // Détecter si on est sur mobile
    const isMobile = window.innerWidth < 768;
    
    // SVG pour les flèches (style minimaliste)
    const arrowLeft = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>`;
    const arrowRight = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>`;
    
    // Bouton "Précédent" - flèche sur mobile, texte sur desktop
    const prevText = isMobile ? arrowLeft : 'Précédent';
    const prevButton = this.createPaginationButton(prevText, 'prev', this.currentPage <= 1);
    paginationList.appendChild(prevButton);
    
    this.addPageNumbers(paginationList);
    
    // Bouton "Suivant" - flèche sur mobile, texte sur desktop
    const nextText = isMobile ? arrowRight : 'Suivant';
    const nextButton = this.createPaginationButton(nextText, 'next', this.currentPage >= this.totalPages);
    paginationList.appendChild(nextButton);
    
    const resultsText = document.createElement('div');
    resultsText.className = 'pagination-results-text';
    const start = (this.currentPage - 1) * this.pageSize + 1;
    const end = Math.min(start + this.pageSize - 1, this.totalResults);
    resultsText.textContent = `Affichage de ${start}-${end} sur ${this.totalResults} logements`;
    
    paginationContainer.appendChild(resultsText);
    paginationContainer.appendChild(paginationList);
  }

  createPaginationButton(content, page, disabled) {
    const button = document.createElement('li');
    button.className = `pagination-item pagination-${page} ${disabled ? 'disabled' : ''}`;
    button.innerHTML = `<a href="#" class="pagination-link" data-page="${page}">${content}</a>`;
    return button;
  }

  addPageNumbers(paginationList) {
    const isMobile = window.innerWidth < 768;
    const maxVisiblePages = isMobile ? 4 : 5;
    let startPage = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(this.totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages && startPage > 1) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    if (startPage > 1) {
      this.addPageButton(paginationList, 1);
      if (startPage > 2) {
        const ellipsis = document.createElement('li');
        ellipsis.className = 'pagination-item pagination-ellipsis';
        ellipsis.textContent = '...';
        paginationList.appendChild(ellipsis);
      }
    }
    
    for (let i = startPage; i <= endPage; i++) {
      this.addPageButton(paginationList, i);
    }
    
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

  // ================================
  // GESTION DES DATES
  // ================================

  setupFilterListeners() {
    if (this.dateButton && typeof jQuery !== 'undefined' && jQuery.fn.daterangepicker) {
      const self = this;
      
      jQuery(this.dateButton).on('apply.daterangepicker', function(e, picker) {
        if (picker.startDate && picker.endDate) {
          const formattedDates = self.formatDateRange(picker.startDate, picker.endDate);
          
          if (self.textDatesSearch) {
            self.textDatesSearch.textContent = formattedDates;
            self.textDatesSearch.style.color = '#272A2B';
          }
          
          self.startDate = picker.startDate.format('YYYY-MM-DD');
          self.endDate = picker.endDate.format('YYYY-MM-DD');
          
          localStorage.setItem('selected_search_data', JSON.stringify({
            startDate: self.startDate,
            endDate: self.endDate,
            adultes: parseInt(document.getElementById('chiffres-adultes')?.textContent || '1', 10),
            enfants: parseInt(document.getElementById('chiffres-enfants')?.textContent || '0', 10),
            timestamp: Date.now()
          }));
          
          self.applyFilters();
          self.updatePricesForDates(self.startDate, self.endDate);
        }
      });
      
      jQuery(this.dateButton).on('cancel.daterangepicker', function(e, picker) {
        if (self.textDatesSearch) {
          self.textDatesSearch.textContent = 'Dates';
          self.textDatesSearch.style.color = '';
        }
        
        self.startDate = null;
        self.endDate = null;
        
        localStorage.removeItem('selected_search_data');
        self.resetFilters();
        self.resetPriceDisplay();
        
      });
    } else {
      console.warn('⚠️ DateRangePicker non trouvé, les filtres de dates ne fonctionneront pas');
    }
  }

  // 🆕 NOUVELLE MÉTHODE À AJOUTER
  loadHomeSearchData() {
    const homeSearchData = localStorage.getItem('home_search_data');
    if (!homeSearchData) return;
    
    try {
    const data = JSON.parse(homeSearchData);

    if (data.timestamp && (Date.now() - data.timestamp > 30*60*1000)) {
        localStorage.removeItem('home_search_data');
        return;
    }
      
    // 🆕 NOUVEAU : Mettre le texte du lieu dans l'input et lancer la recherche
    if (data.locationText) {
      const searchInput = document.getElementById('search-input');
      const searchInputMobile = document.getElementById('search-input-mobile');
      
      if (searchInput) {
        searchInput.value = data.locationText; // Afficher le texte desktop
      }
      
      if (searchInputMobile) {
        searchInputMobile.value = data.locationText; // Afficher le texte mobile
      }
      
      // Déclencher la recherche après un court délai
      setTimeout(() => {
        if (window.searchMapManager) {
          // Utiliser l'input visible (mobile ou desktop)
          const activeInput = searchInputMobile && window.innerWidth < 768 ? searchInputMobile : searchInput;
          if (activeInput) {
            window.searchMapManager.handleSearch(activeInput);
          }
        }
      }, 1000);
    }
    
    // 2. Appliquer les dates (INCHANGÉ)
    if (data.startDate && data.endDate && window.calendarListManager) {
      
      // Mettre à jour les variables
      this.startDate = data.startDate;
      this.endDate = data.endDate;
      
      // Mettre à jour le calendrier
      setTimeout(() => {
        window.calendarListManager.setDates(data.startDate, data.endDate);
      }, 500);
    }
      
      // 3. Appliquer le nombre de voyageurs
      if ((data.adultes || data.enfants) && window.filtersManager) {
        
        // Mettre à jour FiltersManager
        window.filtersManager.state.adultes = data.adultes || 1;
        window.filtersManager.state.enfants = data.enfants || 0;
        
        // Mettre à jour l'interface
        window.filtersManager.updateVoyageursFilter();
      }
      
      // Nettoyer après utilisation
      localStorage.removeItem('home_search_data');
      
      // Appeler applyFilters() SEULEMENT s'il n'y a pas de recherche par lieu
      // Car si locationText existe, c'est handleSearch() qui appellera applyFilters()
      // après avoir récupéré les coordonnées (évite la race condition du bug 0km)
      if (!data.locationText) {
        setTimeout(() => {
          this.applyFilters();
        }, 1000);
      }
      
    } catch (error) {
      console.error('❌ Erreur traitement données page accueil:', error);
      localStorage.removeItem('home_search_data');
    }
  }

  formatDateRange(startDate, endDate) {
    const startDay = startDate.format('D');
    const endDay = endDate.format('D');
    let month = endDate.format('MMM').toLowerCase();
    
    const monthAbbr = {
      'jan': 'janv.',
      'fév': 'févr.',
      'mar': 'mars',
      'avr': 'avr.',
      'mai': 'mai',
      'juin': 'juin',
      'juil': 'juil.',
      'aoû': 'août',
      'sep': 'sept.',
      'oct': 'oct.',
      'nov': 'nov.',
      'déc': 'déc.'
    };
    
    for (const key in monthAbbr) {
      if (month.startsWith(key)) {
        month = monthAbbr[key];
        break;
      }
    }
    
    return `${startDay}-${endDay} ${month}`;
  }

  setSearchLocation(location) {
    this.searchLocation = location;
  }

  // ================================
  // RÉINITIALISATION
  // ================================

  resetFilters() {
    this.currentFilters = {};
    this.searchLocation = null;
    
    document.querySelectorAll('.distance').forEach(element => {
      element.classList.remove('visible');
      element.style.display = 'none';
    });
    
    document.querySelectorAll('.separateur').forEach(element => {
      element.style.display = 'none';
    });
    
    this.currentPage = 1;
    this.applyFilters(true);
    this.showNoResults(false);
    this.showError(false);
    
  }

  // ================================
  // INTERFACE UTILISATEUR
  // ================================

  showLoading(show) {
    const preloader = document.querySelector('.grid-preloader');
    if (!preloader) {
      console.warn('⚠️ Preloader non trouvé');
      return;
    }
    
    if (show) {
      // Afficher
      preloader.classList.add('active');
      preloader.classList.remove('hiding');
    } else {
      // Masquer avec animation
      preloader.classList.add('hiding');
      setTimeout(() => {
        preloader.classList.remove('active', 'hiding');
      }, 300);
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
  // MÉTHODES DE DEBUGGING ET STATS
  // ================================

  getPerformanceStats() {
    return {
      ...this.performanceMetrics,
      cacheSize: this.requestCache.size,
      activeRequests: this.activeRequests,
      queueLength: this.requestQueue.length,
      cacheHitRate: this.performanceMetrics.totalRequests > 0 ? 
        Math.round((this.performanceMetrics.cacheHits / this.performanceMetrics.totalRequests) * 100) : 0,
      lastCacheCleanup: new Date(this.lastCacheCleanup).toLocaleTimeString()
    };
  }

  clearCache() {
    this.requestCache.clear();
    this.performanceMetrics.cacheHits = 0;
  }

  // ================================
  // MÉTHODES PUBLIQUES
  // ================================

  triggerFilter() {
    this.applyFilters();
  }

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
      performanceStats: this.getPerformanceStats()
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
        } catch (error) {
          console.error('❌ Erreur mise à jour voyageurs:', error);
        }
      }
    }, 50);
  }
});

window.PropertyManager = PropertyManager;
