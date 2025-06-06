// Gestion des prix pour les cartes de logements sur la page liste
class PriceListCalculator {
  constructor(container) {
    this.container = container;
    this.pricingData = null;
    this.logementType = "";
    this.elements = {
      textePrix: container.querySelector(".texte-prix"),
      texteTotal: container.querySelector(".text-total"),
      pourcentage: container.querySelector(".pourcentage")
    };
    this.datesSelected = false;
    
    // Vérifier si des dates sont sélectionnées
    if (window.propertyManager && window.propertyManager.startDate && window.propertyManager.endDate) {
      this.datesSelected = true;
    }
    
    this.init();
  }

  init() {
    this.loadPricingData();
    
    // CORRECTION: Ne pas modifier l'affichage initial !
    // L'affichage des prix vient déjà de Webflow avec les bonnes données
    // PropertyManager doit pouvoir lire ces prix originaux pour l'extraction
    // On ne modifie l'affichage que si des dates sont sélectionnées
    
    if (this.datesSelected) {
      this.updatePriceDisplay();
    }
    
    // Sinon, on laisse l'affichage Webflow original intact
  }

  loadPricingData() {
    const element = this.container.querySelector("[data-json-tarifs-line], [data-json-tarifs]");
    if (element) {
      const attribute = element.getAttribute("data-json-tarifs-line") || element.getAttribute("data-json-tarifs");
      if (attribute) {
        try {
          this.pricingData = JSON.parse(attribute);
        } catch (error) {
          console.error("Erreur lors du parsing des données de tarification:", error);
        }
      }
    }
  }

  updatePriceDisplay() {
    if (!this.pricingData || !this.pricingData.seasons) return;
    
    // CORRECTION: Vérifier qu'on ne interfère pas avec PropertyManager
    // Si PropertyManager n'a pas encore fini l'enregistrement, attendre
    if (window.propertyManager && !window.propertyManager.propertiesRegistered) {
      console.log('⏳ PriceListCalculator: Attente de l\'enregistrement des propriétés...');
      return;
    }
    
    let minPrice = Infinity;
    let platformPrice = 0;
    let bestSeason = null;
    
    for (const season of this.pricingData.seasons) {
      if (season.price < minPrice) {
        minPrice = season.price;
        bestSeason = season;
        platformPrice = this.getPlatformPrice(season);
      }
    }
    
    if (!isFinite(minPrice) || !bestSeason) return;
    
    // Mise à jour du prix
    if (this.elements.textePrix) {
      const discountText = platformPrice > minPrice ? 
        `<del>${Math.round(platformPrice)}€</del> ` : "";
      this.elements.textePrix.innerHTML = `Dès ${discountText}<strong>${Math.round(minPrice)}€ / nuit</strong>`;
    }
    
    // Masquer le total par défaut
    if (this.elements.texteTotal) {
      this.elements.texteTotal.style.display = "none";
    }
    
    // Mise à jour du pourcentage
    if (this.elements.pourcentage) {
      if (platformPrice > minPrice) {
        this.elements.pourcentage.textContent = `-${Math.round(100 * (platformPrice - minPrice) / platformPrice)}%`;
        this.elements.pourcentage.style.display = "block";
      } else {
        this.elements.pourcentage.style.display = "none";
      }
    }
  }

  getPlatformPrice(season) {
    if (!season) return 0;
    
    const usePercentage = this.pricingData.platformPricing && 
                         this.pricingData.platformPricing.usePercentage === true;
    
    if (!usePercentage && season.platformPrices) {
      const prices = Object.values(season.platformPrices);
      if (prices.length > 0) {
        return prices.reduce((a, b) => a + b, 0) / prices.length;
      }
    }
    
    if (this.pricingData.platformMarkup && this.pricingData.platformMarkup.percentage) {
      return season.price * (1 + this.pricingData.platformMarkup.percentage / 100);
    }
    
    return season.price;
  }
}

// Classe pour gérer tous les calculateurs de prix sur la page
class PriceListManager {
  constructor() {
    this.calculators = [];
    this.init();
  }

  init() {
    console.log('💰 Initialisation PriceListManager...');
    
    // CORRECTION: Attendre que PropertyManager ait fini avant d'initialiser
    if (window.propertyManager && !window.propertyManager.propertiesRegistered) {
      console.log('⏳ PriceListManager: Attente de PropertyManager...');
      
      // Attendre que PropertyManager soit prêt
      const checkInterval = setInterval(() => {
        if (window.propertyManager && window.propertyManager.propertiesRegistered) {
          clearInterval(checkInterval);
          this.initializeAllCalculators();
          console.log('✅ PriceListManager initialisé après PropertyManager');
        }
      }, 100);
      
      // Timeout après 10 secondes
      setTimeout(() => {
        clearInterval(checkInterval);
        if (!window.propertyManager || !window.propertyManager.propertiesRegistered) {
          console.warn('⚠️ PriceListManager: Timeout, initialisation forcée');
          this.initializeAllCalculators();
        }
      }, 10000);
    } else {
      // PropertyManager déjà prêt ou inexistant
      this.initializeAllCalculators();
      console.log('✅ PriceListManager initialisé directement');
    }
    
    // Export global
    window.priceListManager = this;
  }

  initializeAllCalculators() {
    // Trouver tous les conteneurs de prix
    document.querySelectorAll(".prix-container").forEach(container => {
      const calculator = new PriceListCalculator(container);
      this.calculators.push(calculator);
    });
    
    console.log(`📊 ${this.calculators.length} calculateurs de prix initialisés`);
  }

  // Méthode pour réinitialiser tous les prix
  resetAllPrices() {
    this.calculators.forEach(calculator => {
      // Ne mettre à jour que si des dates sont sélectionnées
      if (calculator.datesSelected) {
        calculator.updatePriceDisplay();
      }
      // Sinon, laisser l'affichage original
    });
  }

  // Méthode pour forcer la mise à jour (quand des dates sont sélectionnées)
  updateAllPrices() {
    this.calculators.forEach(calculator => {
      calculator.datesSelected = !!(window.propertyManager && 
                                   window.propertyManager.startDate && 
                                   window.propertyManager.endDate);
      calculator.updatePriceDisplay();
    });
  }

  // Méthode pour obtenir le nombre de calculateurs
  getCount() {
    return this.calculators.length;
  }
}

// Export global
window.PriceListManager = PriceListManager;
