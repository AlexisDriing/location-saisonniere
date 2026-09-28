// Gestion des prix pour les cartes de logements sur la page liste - LOG production
function setPriceListDisplay(element, price, oldPrice = null) {
  element.textContent = '';
  element.appendChild(document.createTextNode(I18N.t('des') + ' '));
  
  if (oldPrice) {
    const del = document.createElement('del');
    del.textContent = I18N.prix(Math.round(oldPrice));
    element.appendChild(del);
    element.appendChild(document.createTextNode(' '));
  }
  
  const strong = document.createElement('strong');
  strong.textContent = I18N.t('prixParNuit', { prix: I18N.prix(Math.round(price)) });
  element.appendChild(strong);
}

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
    
    // 🆕 MODIFICATION : Vérifier aussi defaultPricing
    if (this.pricingData.defaultPricing && this.pricingData.defaultPricing.price) {
      minPrice = this.pricingData.defaultPricing.price;
      bestSeason = this.pricingData.defaultPricing;
      platformPrice = this.getPlatformPrice(bestSeason);
    }
    
    for (const season of this.pricingData.seasons) {
      if (season.price < minPrice) {
        minPrice = season.price;
        bestSeason = season;
        platformPrice = this.getPlatformPrice(season);
      }
    }
    
    if (!isFinite(minPrice) || !bestSeason) return;
    
    // Mise à jour du prix (toujours avec prix barré grâce à getPlatformPrice modifié)
    if (this.elements.textePrix) {
      setPriceListDisplay(this.elements.textePrix, minPrice, platformPrice > minPrice ? platformPrice : null);  // ✅ SÉCURISÉ
    }
    
    // Masquer le total par défaut
    if (this.elements.texteTotal) {
      this.elements.texteTotal.style.display = "none";
    }
    
    // 🆕 MODIFICATION : Toujours afficher le pourcentage
    if (this.elements.pourcentage) {
      const discount = Math.round(100 * (platformPrice - minPrice) / platformPrice);
      if (discount > 0) {
        this.elements.pourcentage.textContent = `-${discount}%`;
        this.elements.pourcentage.style.display = "block";
      } else {
        this.elements.pourcentage.style.display = "none";
      }
    }
  }

  getPlatformPrice(season) {
    if (!season) return 0;
    
    const usePercentage = this.pricingData.platformPricing && this.pricingData.platformPricing.usePercentage === true;
  
    // Si c'est defaultPricing ET qu'il a des prix plateformes
    if (season === this.pricingData.defaultPricing && season.platformPrices) {
      // 🔧 FIX : Filtrer les prix à 0
      const prices = Object.values(season.platformPrices).filter(price => price > 0);
      if (prices.length > 0) {
        return prices.reduce((a, b) => a + b, 0) / prices.length;
      }
    }
    
    if (!usePercentage && season.platformPrices) {
      // 🔧 FIX : Filtrer les prix à 0
      const prices = Object.values(season.platformPrices).filter(price => price > 0);
      if (prices.length > 0) {
        return prices.reduce((a, b) => a + b, 0) / prices.length;
      }
    }
    
    if (this.pricingData.platformMarkup && this.pricingData.platformMarkup.percentage) {
      return season.price * (1 + this.pricingData.platformMarkup.percentage / 100);
    }
    
    // Toujours appliquer la réduction par défaut (17% ou valeur configurée)
    const defaultDiscount = (this.pricingData.platformPricing && this.pricingData.platformPricing.defaultDiscount) 
      ? this.pricingData.platformPricing.defaultDiscount 
      : 17;
    
    return season.price * (100 / (100 - defaultDiscount));
  }
}

// Classe pour gérer tous les calculateurs de prix sur la page
class PriceListManager {
  constructor() {
    this.calculators = [];
    this.init();
  }

  init() {
    this.initializeAllCalculators();
    
    // Export global
    window.priceListManager = this;
  }

  initializeAllCalculators() {
    // Trouver tous les conteneurs de prix
    document.querySelectorAll(".prix-container").forEach(container => {
      const calculator = new PriceListCalculator(container);
      this.calculators.push(calculator);
    });
    
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
