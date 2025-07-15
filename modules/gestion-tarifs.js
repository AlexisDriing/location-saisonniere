// Gestion de l'affichage des tarifs par saison v2
class TariffsDisplayManager {
  constructor() {
    this.init();
  }

  init() {
    this.displaySeasonsPricing();
  }

  formatDate(dateStr) {
    const parts = dateStr.split("-");
    const months = [
      "janvier", "février", "mars", "avril", "mai", "juin",
      "juillet", "août", "septembre", "octobre", "novembre", "décembre"
    ];
    
    let day = parseInt(parts[0], 10).toString();
    if (day === "1") {
      day = "1er";
    }
    
    return day + " " + months[parseInt(parts[1], 10) - 1];
  }

  formatDateRange(start, end) {
    return "du " + this.formatDate(start) + " au " + this.formatDate(end);
  }

  calculateWeekPrice(nightlyPrice, discounts) {
    let weekPrice = nightlyPrice * 7;
    
    if (discounts && discounts.length > 0) {
      const weekDiscount = discounts.find(discount => discount.nights <= 7);
      if (weekDiscount) {
        weekPrice = weekPrice * (1 - weekDiscount.percentage / 100);
      }
    }
    
    return Math.round(weekPrice);
  }

  calculatePlatformDiscount(basePrice, platformPrices) {
    if (!platformPrices) return 0;
    
    const prices = Object.values(platformPrices);
    if (prices.length === 0) return 0;
    
    const avgPlatformPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    
    if (avgPlatformPrice <= basePrice) return 0;
    
    return Math.round(100 * ((avgPlatformPrice - basePrice) / avgPlatformPrice));
  }

  displaySeasonInfo(season, seasonIndex, discounts) {
    const seasonElement = document.getElementById("season-" + (seasonIndex + 1));
    if (!seasonElement) return;
    
    seasonElement.style.display = "flex";
    
    // Nom de la saison
    const nameElement = seasonElement.querySelector("#name-season");
    if (nameElement) {
      nameElement.textContent = season.name;
    }
    
    // Dates de la saison
    const datesElement = seasonElement.querySelector("#dates-season");
    if (datesElement && season.periods && season.periods.length > 0) {
      const dateRanges = season.periods.map(period => 
        this.formatDateRange(period.start, period.end)
      );
      datesElement.textContent = dateRanges.join(" et ");
    }
    
    // Pourcentage de réduction
    const percentageElement = seasonElement.querySelector("#text-pourcentage-season");
    if (percentageElement) {
      let discount = 0;
      
      // D'abord essayer de calculer avec les prix plateformes
      if (season.platformPrices) {
        discount = this.calculatePlatformDiscount(season.price, season.platformPrices);
      } 
      // 🆕 Si pas de prix plateformes, utiliser 17%
      else if (discounts && Array.isArray(discounts) && discounts.length > 0) {
        // On a accès à pricingData via le parent
        const pricingDataElement = document.querySelector("[data-json-tarifs-line], [data-json-tarifs]");
        if (pricingDataElement) {
          const jsonData = JSON.parse(pricingDataElement.getAttribute("data-json-tarifs-line") || pricingDataElement.getAttribute("data-json-tarifs"));
          if (jsonData.platformPricing && jsonData.platformPricing.defaultDiscount) {
            discount = jsonData.platformPricing.defaultDiscount;
          }
        }
      }
      
      percentageElement.textContent = discount > 0 ? `-${discount}%` : "";
    }
    
    // Nuits minimum
    const minNightsElement = seasonElement.querySelector("#nuit-minimum");
    if (minNightsElement) {
      minNightsElement.textContent = season.minNights || 1;
    }
    
    // Prix par nuit
    const pricePerNightElement = seasonElement.querySelector("#prix-nuit-season");
    if (pricePerNightElement) {
      pricePerNightElement.textContent = Math.round(season.price);
    }
    
    // Prix par semaine
    const weekPriceElement = seasonElement.querySelector("#prix-semaine-season");
    if (weekPriceElement) {
      weekPriceElement.textContent = this.calculateWeekPrice(season.price, discounts);
    }
  }

  displaySeasonsPricing() {
    const dataElement = document.querySelector("[data-json-tarifs-line]") || 
                       document.querySelector("[data-json-tarifs]");
    
    if (!dataElement) return;
    
    try {
      const attribute = dataElement.hasAttribute("data-json-tarifs-line") ? 
                       "data-json-tarifs-line" : "data-json-tarifs";
      const jsonData = dataElement.getAttribute(attribute);
      const pricingData = JSON.parse(jsonData);
      
      if (pricingData.seasons && pricingData.seasons.length > 0) {
        // Afficher chaque saison
        pricingData.seasons.forEach((season, index) => {
          this.displaySeasonInfo(season, index, pricingData.discounts);
        });
        
        // Masquer les saisons non utilisées
        for (let i = pricingData.seasons.length; i < 4; i++) {
          const seasonElement = document.getElementById("season-" + (i + 1));
          if (seasonElement) {
            seasonElement.style.display = "none";
          }
        }
      }
    } catch (error) {
      console.error("Erreur lors du traitement des données tarifaires :", error);
    }
  }
}


// Export global
window.TariffsDisplayManager = TariffsDisplayManager;
