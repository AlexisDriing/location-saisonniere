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
    if (!this.datesSelected) {
      this.updatePriceDisplay();
    }
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
    this.initializeAllCalculators();
    console.log('✅ PriceListManager initialisé');
    
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
