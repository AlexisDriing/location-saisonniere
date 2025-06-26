// Gestionnaire principal des propriétés pour la page liste - VERSION OPTIMISÉE AVEC CHARGEMENT AUTOMATIQUEv2
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
    
    // 🆕 NOUVEAU : Propriétés pour la pagination dynamique
    this.allPropertiesData = [];     // Données complètes du serveur
    this.propertiesDataMap = new Map(); // 🔧 FIX : Map pour accès rapide
    this.templateCard = null;        // Template pour clonage
    this.visibleCards = [];          // Cartes Webflow existantes
    this.clonedCards = [];           // Track des cartes clonées
    this.initialLoadComplete = false; // État de chargement initial
    
    this.init();
  }

  async init() {
    console.log('🏠 Initialisation PropertyManager...');
    const startTime = performance.now();
    
    // 1. D'abord, récupérer TOUTES les données du serveur
    await this.registerAllProperties();
    
    // 2. Ensuite, configurer les cartes et template
    this.setupCardsAndTemplate();
    
    // 3. 🆕 Afficher la première page avec pagination
    await this.displayInitialPage();
    
    // 4. Initialiser les écouteurs d'événements
    this.setupFilterListeners();
    
    // 5. Marquer comme chargé
    this.initialLoadComplete = true;
    
    const initTime = Math.round(performance.now() - startTime);
    console.log(`✅ PropertyManager initialisé en ${initTime}ms avec pagination`);
    
    // Export global
    window.propertyManager = this;
    
    // Nettoyage automatique du cache
    this.setupCacheCleanup();
  }

  setupCardsAndTemplate() {
    // Récupérer toutes les cartes visibles créées par Webflow
    this.visibleCards = Array.from(document.querySelectorAll('.housing-item'));
    console.log(`📦 ${this.visibleCards.length} cartes Webflow trouvées`);
    
    // Prendre la première carte comme template
    if (this.visibleCards.length > 0) {
      this.templateCard = this.visibleCards[0].cloneNode(true);
      this.cleanTemplate(this.templateCard);
      console.log('✅ Template de carte créé');
    }
  }

  cleanTemplate(template) {
    // Nettoyer le template pour réutilisation
    template.style.display = 'none';
    template.classList.add('template-card');
    
    const link = template.querySelector('.lien-logement');
    if (link) {
      link.href = '#';
      link.removeAttribute('data-property-id');
    }
  }

  async displayInitialPage() {
    if (this.allPropertiesData.length === 0) {
      console.warn('⚠️ Aucune donnée de propriété disponible');
      return;
    }
    
    console.log(`📄 Affichage initial: ${this.allPropertiesData.length} propriétés au total`);
    
    // Réinitialiser la pagination
    this.currentPage = 1;
    this.totalResults = this.allPropertiesData.length;
    this.totalPages = Math.ceil(this.totalResults / this.pageSize);
    
    // Afficher la première page
    const firstPageProperties = this.allPropertiesData.slice(0, this.pageSize);
    
    this.displayFilteredProperties(firstPageProperties);
    this.renderPagination();
    
    console.log(`✅ Page 1/${this.totalPages} affichée (${firstPageProperties.length} logements)`);
  }

  cleanupClonedCards() {
    // Supprimer toutes les cartes clonées précédentes
    this.clonedCards.forEach(card => {
      if (card && card.parentNode) {
        card.parentNode.removeChild(card);
      }
    });
    this.clonedCards = [];
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
  // ENREGISTREMENT DES PROPRIÉTÉS
  // ================================

  async registerAllProperties() {
    console.log('📝 Synchronisation des propriétés avec Webflow...');
    
    try {
      const response = await fetch(`${window.CONFIG.API_URL}/sync-webflow-properties`);
      const data = await response.json();
      
      if (data.success) {
        this.propertiesRegistered = true;
        this.registeredCount = data.count;
        
        // 🆕 CRUCIAL : Stocker TOUTES les propriétés
        if (data.properties && data.properties.length > 0) {
          this.allPropertiesData = data.properties;
          console.log(`✅ ${data.properties.length} propriétés complètes reçues du serveur`);
          
          // 🔧 FIX : Créer une map pour accès rapide par ID
          this.propertiesDataMap = new Map();
          data.properties.forEach(prop => {
            this.propertiesDataMap.set(prop.id, prop);
          });
          
          // Précharger quelques images
          this.preloadImages();
          
          // 🔧 FIX : Stocker l'état initial des prix APRÈS avoir reçu les données
          this.storeInitialPriceStates();
        } else {
          console.error('❌ Aucune propriété reçue du serveur');
        }
        
        // Scanner quand même le DOM pour les éléments visibles
        this.scanVisibleProperties();
      } else {
        throw new Error(data.error || 'Erreur de synchronisation');
      }
      
    } catch (error) {
      console.error('❌ Erreur sync Webflow:', error);
    }
  }

  preloadImages() {
    if (!this.allPropertiesData || this.allPropertiesData.length === 0) return;
    
    // Précharger les images des 32 premières propriétés (2 pages)
    const imagesToPreload = this.allPropertiesData
      .slice(0, 32)
      .filter(p => p.image_url)
      .map(p => p.image_url);
    
    imagesToPreload.forEach(url => {
      const img = new Image();
      img.src = url;
    });
    
    console.log(`🖼️ Préchargement de ${imagesToPreload.length} images`);
  }

  // Nouvelle fonction avec l'ancienne méthode en cas de fallback
  async registerAllPropertiesOldWay() {
    // Votre ancien code de registerAllProperties
    let promises = [];
    
    this.propertyElements.forEach(element => {
      const href = element.getAttribute('href');
      const propertyId = href.split('/').pop();
      
      if (propertyId) {
        const metadata = this.extractPropertyMetadata(element);
        element.setAttribute('data-property-id', propertyId);
        const promise = this.registerProperty(propertyId, metadata);
        promises.push(promise);
      }
    });
    
    try {
      await Promise.all(promises);
      this.propertiesRegistered = true;
      console.log(`✅ ${this.registeredCount} propriétés enregistrées (méthode classique)`);
    } catch (error) {
      console.error('❌ Erreur lors de l\'enregistrement des propriétés:', error);
    }
  }

  // 🆕 Nouvelle méthode pour scanner les éléments visibles
  scanVisibleProperties() {
    // Juste pour marquer les éléments visibles avec leur ID
    this.propertyElements.forEach(element => {
      const href = element.getAttribute('href');
      const propertyId = href.split('/').pop();
      element.setAttribute('data-property-id', propertyId);
    });
    console.log(`✅ ${this.propertyElements.length} éléments DOM marqués`);
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
    console.log('💾 Stockage des états initiaux des prix...');
    
    // Pour les cartes Webflow existantes
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
    
    // 🔧 FIX : Pour toutes les propriétés depuis les données serveur
    if (this.allPropertiesData && this.allPropertiesData.length > 0) {
      this.allPropertiesData.forEach(prop => {
        if (!this.initialPriceStates.has(prop.id)) {
          // Calculer le prix initial pour les propriétés non visibles
          let priceText = 'Dès ';
          let discountText = '';
          
          if (prop.pricing_data && prop.pricing_data.seasons) {
            let minPrice = Infinity;
            let platformPrice = 0;
            
            prop.pricing_data.seasons.forEach(season => {
              if (season.price < minPrice) {
                minPrice = season.price;
                if (season.platformPrices) {
                  const prices = Object.values(season.platformPrices);
                  platformPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
                }
              }
            });
            
            if (platformPrice > minPrice) {
              priceText += `<del>${Math.round(platformPrice)}€</del> `;
              discountText = `-${Math.round((platformPrice - minPrice) / platformPrice * 100)}%`;
            }
            priceText += `<strong>${Math.round(minPrice)}€ / nuit</strong>`;
          } else if (prop.price) {
            priceText += `<strong>${prop.price}€ / nuit</strong>`;
          }
          
          this.initialPriceStates.set(prop.id, {
            textePrix: priceText,
            pourcentage: discountText,
            pourcentageDisplay: discountText ? 'block' : 'none'
          });
        }
      });
    }
    
    console.log(`✅ ${this.initialPriceStates.size} états de prix stockés`);
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
      
      // Vérifier le cache d'abord
      const cacheKey = `prices_${startDate}_${endDate}_${adultsCount}_${visiblePropertyIds.join(',')}`;
      const cachedPrices = this.getFromCache(cacheKey);
      
      if (cachedPrices) {
        console.log('🚀 Utilisation du cache pour les prix');
        this.updatePriceDisplays(cachedPrices.prices, cachedPrices.nights);
        return;
      }
      
      // Construire l'URL pour la requête
      let url = `${window.CONFIG.API_URL}/calculate-prices?start_date=${startDate}&end_date=${endDate}&adults=${adultsCount}`;
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
      
      console.log('💰 Prix calculés:', data);
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
      if (textePrix) {
        const discountText = priceInfo.platform_price_per_night > priceInfo.price_per_night ? 
          `<del>${priceInfo.platform_price_per_night}€</del> ` : '';
        
        textePrix.innerHTML = `Dès ${discountText}<strong>${priceInfo.price_per_night}€ / nuit</strong>`;
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

  updateExistingCard(card, propertyData) {
    // 🔧 FIX : Utiliser la map pour un accès plus rapide et fiable
    const fullData = this.propertiesDataMap ? 
      this.propertiesDataMap.get(propertyData.id) || propertyData : 
      propertyData;
    
    // Lien principal
    const link = card.querySelector('.lien-logement');
    if (link) {
      link.href = `/locations-saisonnieres/${fullData.id}`;
      link.setAttribute('data-property-id', fullData.id);
    }
    
    // 🆕 METTRE À JOUR TOUTES LES DONNÉES (pas seulement le prix)
    
    // Images
    const mainImage = card.querySelector('.image-main');
    if (mainImage) {
      if (fullData.image_url) {
        mainImage.src = fullData.image_url;
        mainImage.alt = fullData.name || 'Logement';
      } else {
        console.warn(`Image manquante pour ${fullData.id}`);
      }
    }
    
    const hostImage = card.querySelector('.image-hote-main');
    if (hostImage) {
      if (fullData.host_image_url) {
        hostImage.src = fullData.host_image_url;
      } else {
        // Image par défaut pour l'hôte
        hostImage.src = 'https://cdn.prod.website-files.com/631204438bf0c14f7ab24dd6/default-host.jpg';
      }
    }
    
    // Nom du logement
    const nameElement = card.querySelector('.text-nom-logement-card');
    if (nameElement && fullData.name) {
      const readableName = fullData.name
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      nameElement.textContent = readableName;
    }
    
    // Adresse - IMPORTANT : Formater l'adresse ici
    const addressElement = card.querySelector('.adresse');
    if (addressElement && fullData.address) {
      addressElement.textContent = fullData.address;
      // 🔧 FIX : Appliquer le formatage d'adresse
      if (window.addressFormatterManager) {
        window.addressFormatterManager.formatAddress(addressElement);
      }
    }
    
    // Nom de l'hôte
    const hostNameElement = card.querySelector('.bloc-h-te-main div:last-child');
    if (hostNameElement) {
      hostNameElement.textContent = fullData.host_name || 'Hôte';
    }
    
    // Prix
    this.updateCardPrice(card, fullData);
    
    // Données cachées
    this.updateHiddenElements(card, fullData);
    
    // Distance - FIX : Ne pas afficher si pas de recherche géo
    if (this.searchLocation && propertyData.distance !== undefined) {
      this.updateDistanceDisplay(card, propertyData.distance);
    } else {
      // Masquer la distance si pas de recherche
      const distanceElement = card.querySelector('.distance');
      const separateurElement = card.querySelector('.separateur');
      if (distanceElement) {
        distanceElement.style.display = 'none';
        distanceElement.classList.remove('visible');
      }
      if (separateurElement) {
        separateurElement.style.display = 'none';
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
      
      if (texteTotal) {
        texteTotal.style.display = 'none';
      }
      
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
    console.log('🧹 Nettoyage du cache...');
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
    console.log(`🧹 ${expiredKeys.length} entrées expirées supprimées, taille cache: ${this.requestCache.size}`);
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
      if (window.CONFIG?.PERFORMANCE?.logTimings) {
        console.log(`🌐 Exécution requête (${this.activeRequests}/${window.CONFIG?.PERFORMANCE?.maxConcurrentRequests || 5})`);
      }
      
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
    // 🆕 TEMPORAIRE : Debug
    console.log('🔍 Debug applyFilters:');
    console.log('- propertiesRegistered:', this.propertiesRegistered);
    console.log('- registeredCount:', this.registeredCount);
    console.log('- totalResults:', this.totalResults);
    console.log('- DOM elements:', document.querySelectorAll('.housing-item').length);
    
    if (this.isFiltering || !this.propertiesRegistered) return;

    if (this.filterTimeout) {
        clearTimeout(this.filterTimeout);
    }
    
    this.filterTimeout = setTimeout(async () => {
    
    this.isFiltering = true;
    console.log('🔍 Application des filtres...');
    const filterStartTime = performance.now();
    
    if (resetPage) {
      this.currentPage = 1;
    }
    
    const filters = this.getFilterValues();
    
    // 🆕 AJOUTER cette vérification :
    const hasActiveFilters = filters.start || filters.end || filters.capacity || 
                           filters.price_max || filters.latitude || 
                           (filters.amenities && filters.amenities.length > 0) ||
                           (filters.options && filters.options.length > 0) ||
                           (filters.types && filters.types.length > 0);
    
    if (!hasActiveFilters && this.allPropertiesData.length > 0) {
      // Pas de filtres = afficher toutes les propriétés avec pagination
      console.log('📊 Aucun filtre actif, affichage de toutes les propriétés');
      
      if (resetPage) this.currentPage = 1;
      
      this.totalResults = this.allPropertiesData.length;
      this.totalPages = Math.ceil(this.totalResults / this.pageSize);
      
      const startIndex = (this.currentPage - 1) * this.pageSize;
      const endIndex = startIndex + this.pageSize;
      const pageProperties = this.allPropertiesData.slice(startIndex, endIndex);
      
      this.displayFilteredProperties(pageProperties);
      this.renderPagination();
      
      this.isFiltering = false;
      return;
    }
    
    this.updateCurrentFilters(filters);
    
    try {
      // Vérifier le cache d'abord
      const cacheKey = this.buildCacheKey(filters);
      const cachedData = this.getFromCache(cacheKey);
      
      if (cachedData) {
        console.log('🚀 Utilisation du cache pour les filtres');
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
        console.log(`✅ Filtres appliqués depuis le cache en ${cacheTime}ms`);
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
      
      url += `page=${this.currentPage}&limit=${this.pageSize}`;
      
      if (window.CONFIG?.PERFORMANCE?.logTimings) {
        console.log('🌐 URL requête:', url);
      }
      
      // Afficher indicateur de chargement
      this.showLoading(true);
      
      // Utiliser la queue de requêtes
      const response = await this.queueRequest(url);
      const data = await response.json();
      
      if (window.CONFIG?.PERFORMANCE?.logTimings) {
        console.log('📊 Réponse serveur:', data);
      }
      
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
      console.log(`✅ Filtres appliqués en ${totalTime}ms`);
      
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
    const container = document.querySelector('.collection-grid, .collection-list');
    if (!container) {
      console.error('❌ Conteneur de collection non trouvé');
      return;
    }
    
    // Nettoyer les cartes clonées précédentes
    this.cleanupClonedCards();
    
    // Cacher toutes les cartes existantes
    this.visibleCards.forEach(card => {
      card.style.display = 'none';
    });
    
    if (properties.length === 0) {
      this.showNoResults(true);
      return;
    }
    
    this.showNoResults(false);
    
    // 🔧 FIX : Tracker les cartes affichées pour reformatage
    const displayedCards = [];
    
    // Afficher les propriétés
    properties.forEach((propertyData, index) => {
      let card;
      
      if (index < this.visibleCards.length) {
        // Réutiliser une carte Webflow existante
        card = this.visibleCards[index];
        this.updateExistingCard(card, propertyData);
        card.style.display = '';
        displayedCards.push(card);
      } else if (this.templateCard) {
        // Cloner le template pour les résultats > 16
        card = this.createCardFromTemplate(propertyData);
        if (card) {
          container.appendChild(card);
          this.clonedCards.push(card);
          displayedCards.push(card);
        }
      }
    });
    
    // 🔧 FIX : Reformater toutes les adresses après affichage
    setTimeout(() => {
      if (window.addressFormatterManager) {
        displayedCards.forEach(card => {
          const addressElement = card.querySelector('.adresse');
          if (addressElement) {
            window.addressFormatterManager.formatAddress(addressElement);
          }
        });
      }
    }, 50);
    
    console.log(`✅ Affiché: ${Math.min(properties.length, this.visibleCards.length)} réutilisées + ${this.clonedCards.length} clonées`);
  }

  createCardFromTemplate(propertyData) {
    if (!this.templateCard) {
      console.error('❌ Pas de template disponible');
      return null;
    }
    
    const newCard = this.templateCard.cloneNode(true);
    newCard.style.display = '';
    newCard.classList.remove('template-card');
    newCard.classList.add('cloned-card');
    
    // 🔧 FIX : Utiliser la map pour un accès plus fiable
    const fullData = this.propertiesDataMap ? 
      this.propertiesDataMap.get(propertyData.id) || propertyData : 
      propertyData;
    
    // Lien principal
    const link = newCard.querySelector('.lien-logement');
    if (link) {
      link.href = `/locations-saisonnieres/${fullData.id}`;
      link.setAttribute('data-property-id', fullData.id);
    }
    
    // Images
    const mainImage = newCard.querySelector('.image-main');
    if (mainImage) {
      if (fullData.image_url) {
        mainImage.src = fullData.image_url;
        mainImage.alt = fullData.name || 'Logement';
      } else {
        console.warn(`Image manquante pour ${fullData.id}`);
      }
    }
    
    const hostImage = newCard.querySelector('.image-hote-main');
    if (hostImage) {
      if (fullData.host_image_url) {
        hostImage.src = fullData.host_image_url;
      } else {
        // Image par défaut pour l'hôte
        hostImage.src = 'https://cdn.prod.website-files.com/631204438bf0c14f7ab24dd6/default-host.jpg';
      }
    }
    
    // Nom du logement
    const nameElement = newCard.querySelector('.text-nom-logement-card');
    if (nameElement && fullData.name) {
      const readableName = fullData.name
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      nameElement.textContent = readableName;
    }
    
    // Adresse - IMPORTANT : Formater l'adresse ici
    const addressElement = newCard.querySelector('.adresse');
    if (addressElement && fullData.address) {
      addressElement.textContent = fullData.address;
      // 🔧 FIX : Appliquer le formatage d'adresse
      if (window.addressFormatterManager) {
        window.addressFormatterManager.formatAddress(addressElement);
      }
    }
    
    // Nom de l'hôte
    const hostNameElement = newCard.querySelector('.bloc-h-te-main div:last-child');
    if (hostNameElement) {
      hostNameElement.textContent = fullData.host_name || 'Hôte';
    }
    
    // Prix
    this.updateCardPrice(newCard, fullData);
    
    // Données cachées
    this.updateHiddenElements(newCard, fullData);
    
    // Distance - FIX : Ne pas afficher si pas de recherche géo
    if (this.searchLocation && propertyData.distance !== undefined) {
      this.updateDistanceDisplay(newCard, propertyData.distance);
    } else {
      // Masquer la distance si pas de recherche
      const distanceElement = newCard.querySelector('.distance');
      const separateurElement = newCard.querySelector('.separateur');
      if (distanceElement) {
        distanceElement.style.display = 'none';
        distanceElement.classList.remove('visible');
      }
      if (separateurElement) {
        separateurElement.style.display = 'none';
      }
    }
    
    return newCard;
  }

  updateCardPrice(card, propertyData) {
    const priceElement = card.querySelector('.texte-prix');
    const percentageElement = card.querySelector('.pourcentage');
    
    if (!priceElement) return;
    
    if (propertyData.pricing_data && propertyData.pricing_data.seasons) {
      let minPrice = Infinity;
      let platformPrice = 0;
      
      propertyData.pricing_data.seasons.forEach(season => {
        if (season.price < minPrice) {
          minPrice = season.price;
          if (season.platformPrices) {
            const prices = Object.values(season.platformPrices);
            platformPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
          }
        }
      });
      
      if (platformPrice > minPrice) {
        priceElement.innerHTML = `Dès <del>${Math.round(platformPrice)}€</del> <strong>${Math.round(minPrice)}€ / nuit</strong>`;
        
        if (percentageElement) {
          const discount = Math.round((platformPrice - minPrice) / platformPrice * 100);
          percentageElement.textContent = `-${discount}%`;
          percentageElement.style.display = 'block';
        }
      } else {
        priceElement.innerHTML = `Dès <strong>${Math.round(minPrice)}€ / nuit</strong>`;
        if (percentageElement) {
          percentageElement.style.display = 'none';
        }
      }
    } else if (propertyData.price) {
      priceElement.innerHTML = `Dès <strong>${propertyData.price}€ / nuit</strong>`;
      if (percentageElement) {
        percentageElement.style.display = 'none';
      }
    }
  }

  updateHiddenElements(card, propertyData) {
    // Options d'accueil
    const optionElement = card.querySelector('[data-option-accueil]');
    if (optionElement && propertyData.options && propertyData.options.length > 0) {
      optionElement.setAttribute('data-option-accueil', propertyData.options.join(', '));
      optionElement.textContent = propertyData.options.join(', ');
    }
    
    // Mode de location
    const modeElement = card.querySelector('[data-mode-location]');
    if (modeElement && propertyData.type) {
      modeElement.setAttribute('data-mode-location', propertyData.type);
      modeElement.textContent = propertyData.type;
    }
    
    // Capacité
    const capacityElement = card.querySelector('[data-voyageurs]');
    if (capacityElement && propertyData.capacity) {
      capacityElement.setAttribute('data-voyageurs', propertyData.capacity);
      capacityElement.textContent = propertyData.capacity;
    }
    
    // Équipements
    const equipmentElement = card.querySelector('[data-equipements]');
    if (equipmentElement && propertyData.amenities) {
      const amenitiesText = propertyData.amenities.join(', ');
      equipmentElement.setAttribute('data-equipements', amenitiesText);
      equipmentElement.textContent = amenitiesText;
    }
    
    // JSON tarifs
    const jsonElement = card.querySelector('[data-json-tarifs-line]');
    if (jsonElement && propertyData.pricing_data) {
      jsonElement.setAttribute('data-json-tarifs-line', JSON.stringify(propertyData.pricing_data));
    }
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
    if (adultsElement) {
      filters.adults = parseInt(adultsElement.textContent, 10) || 1;
    }
    
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
    
    // 🆕 AJOUTER : Vérifier s'il y a des filtres actifs
    const hasActiveFilters = Object.keys(this.currentFilters).length > 0;
    
    if (!hasActiveFilters && this.allPropertiesData.length > 0) {
      // Pagination simple sur toutes les propriétés
      const startIndex = (this.currentPage - 1) * this.pageSize;
      const endIndex = startIndex + this.pageSize;
      const pageProperties = this.allPropertiesData.slice(startIndex, endIndex);
      
      this.displayFilteredProperties(pageProperties);
      this.renderPagination();
    } else {
      // Pagination avec filtres
      this.applyFilters(false);
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
    
    const prevButton = this.createPaginationButton('Précédent', 'prev', this.currentPage <= 1);
    paginationList.appendChild(prevButton);
    
    this.addPageNumbers(paginationList);
    
    const nextButton = this.createPaginationButton('Suivant', 'next', this.currentPage >= this.totalPages);
    paginationList.appendChild(nextButton);
    
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

  applyInitialPagination() {
    console.log('📄 Pagination initiale déjà appliquée dans displayInitialPage()');
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
        
        console.log('🗑️ Dates effacées, filtres réinitialisés');
      });
    } else {
      console.warn('⚠️ DateRangePicker non trouvé, les filtres de dates ne fonctionneront pas');
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
    console.log('📍 Localisation de recherche définie:', location);
  }

  // ================================
  // RÉINITIALISATION
  // ================================

  resetFilters() {
    console.log('🔄 Réinitialisation complète des filtres...');
    
    // Réinitialiser les variables
    this.currentFilters = {};
    this.searchLocation = null;
    this.startDate = null;
    this.endDate = null;
    this.currentPage = 1;
    
    // Masquer TOUTES les distances et séparateurs
    document.querySelectorAll('.distance').forEach(element => {
      element.classList.remove('visible');
      element.style.display = 'none';
      element.textContent = '';
    });
    
    document.querySelectorAll('.separateur').forEach(element => {
      element.style.display = 'none';
    });
    
    // Masquer les messages d'erreur
    this.showNoResults(false);
    this.showError(false);
    
    // 🔧 FIX : Réinitialiser le texte des dates
    if (this.textDatesSearch) {
      this.textDatesSearch.textContent = 'Dates';
      this.textDatesSearch.style.color = '';
    }
    
    // 🔧 FIX : Afficher toutes les propriétés sans filtres
    if (this.allPropertiesData && this.allPropertiesData.length > 0) {
      const startIndex = 0;
      const endIndex = this.pageSize;
      const firstPageProperties = this.allPropertiesData.slice(startIndex, endIndex);
      
      this.totalResults = this.allPropertiesData.length;
      this.totalPages = Math.ceil(this.totalResults / this.pageSize);
      
      this.displayFilteredProperties(firstPageProperties);
      this.renderPagination();
      
      // 🔧 FIX : Reformater toutes les adresses après reset
      setTimeout(() => {
        if (window.addressFormatterManager) {
          window.addressFormatterManager.formatAllAddresses();
        }
      }, 100);
    } else {
      // Si pas de données, afficher un message approprié
      this.showError(true);
    }
    
    console.log('✅ Filtres réinitialisés complètement');
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
    console.log('🧹 Cache entièrement vidé');
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
      propertiesRegistered: this.propertiesRegistered,
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

window.PropertyManager = PropertyManager;
