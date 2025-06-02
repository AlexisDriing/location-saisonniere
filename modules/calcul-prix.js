// modules/calcul-prix.js - VERSION CORRIGÉE SANS AUTO-INITIALISATION
class PriceCalculator {
  constructor() {
    console.log('🔧 PriceCalculator constructor appelé');
    this.elements = {
      calcNuit: Utils.getAllElementsById("calcul-nuit"),
      prixNuit: Utils.getAllElementsById("prix-nuit"),
      prixTaxe: Utils.getAllElementsById("prix-taxe"),
      prixMenage: Utils.getAllElementsById("prix-menage"),
      totalPrix: Utils.getAllElementsById("total-prix"),
      textPourcentage: Utils.getAllElementsById("text-pourcentage"),
      prixDirect: Utils.getAllElementsById("prix-direct"),
      prixReduction: Utils.getAllElementsById("prix-reduction"),
      blocReduction: Utils.getAllElementsById("bloc-reduction")
    };
    
    this.pricingData = null;
    this.logementType = "";
    this.startDate = null;
    this.endDate = null;
    
    this.init();
  }

  init() {
    this.loadPricingData();
    this.loadLogementType();
    
    // Masquer les blocs de prix initialement
    const blocPrix = document.getElementById("bloc-calcul-prix");
    if (blocPrix) blocPrix.style.display = "none";
    
    const blocPrixMobile = document.getElementById("bloc-calcul-prix-mobile");
    if (blocPrixMobile) blocPrixMobile.style.display = "none";
    
    // ✅ ÉTAT PAR DÉFAUT : Les styles CSS gèrent l'opacité 0.3
    console.log('🔒 Boutons désactivés par défaut via CSS');
    
    this.resetPrices();
    this.listenForDateChanges();
    
    // Export global pour autres modules
    window.priceCalculator = this;
    console.log('✅ PriceCalculator initialisé');
  }

  loadPricingData() {
    let element = document.querySelector("[data-json-tarifs-line]");
    let attribute = "data-json-tarifs-line";
    
    if (!element) {
      element = document.querySelector("[data-json-tarifs]");
      attribute = "data-json-tarifs";
    }
    
    if (element) {
      try {
        const jsonData = element.getAttribute(attribute);
        this.pricingData = JSON.parse(jsonData);
        console.log('✅ Données tarifaires chargées');
      } catch (error) {
        console.error("❌ Erreur lors du chargement des données tarifaires:", error);
      }
    } else {
      console.warn("⚠️ Aucun élément avec data-json-tarifs trouvé");
    }
  }

  loadLogementType() {
    const element = document.querySelector("[data-type-logement]");
    if (element) {
      this.logementType = element.getAttribute("data-type-logement");
    } else {
      this.logementType = "standard";
    }
    console.log('🏠 Type de logement:', this.logementType);
  }

  listenForDateChanges() {
    if (typeof jQuery !== 'undefined' && jQuery("#input-calendar, #input-calendar-mobile").length) {
      jQuery("#input-calendar, #input-calendar-mobile").on("apply.daterangepicker", (e, picker) => {
        if (picker.startDate && picker.endDate) {
          this.startDate = picker.startDate;
          this.endDate = picker.endDate;
          console.log('📅 Dates sélectionnées:', this.startDate.format('YYYY-MM-DD'), 'à', this.endDate.format('YYYY-MM-DD'));
          this.calculateAndDisplayPrices();
        } else {
          this.resetPrices();
        }
      });
      
      jQuery("#input-calendar, #input-calendar-mobile").on("cancel.daterangepicker", () => {
        console.log('❌ Dates annulées');
        this.resetPrices();
      });
    } else {
      console.warn("⚠️ jQuery ou DateRangePicker non disponible pour PriceCalculator");
    }
  }

  getReserverButtons() {
    return document.querySelectorAll('.button.homepage.site-internet[class*="button-reserver"]');
  }

  setReservationButtonsState(state) {
    const reserverButtons = this.getReserverButtons();
    
    reserverButtons.forEach((button, index) => {
      // Supprimer toutes les classes d'état
      button.classList.remove('dates-selected', 'min-nights-error');
      
      switch(state) {
        case 'enabled':
          button.classList.add('dates-selected');
          console.log(`✅ Bouton ${index + 1} activé`);
          break;
          
        case 'min-nights-error':
          button.classList.add('min-nights-error');
          console.log(`⚠️ Bouton ${index + 1} erreur nuits minimum`);
          break;
          
        case 'disabled':
        default:
          console.log(`🔒 Bouton ${index + 1} désactivé`);
          break;
      }
    });
  }

  resetPrices() {
    this.startDate = null;
    this.endDate = null;
    
    // Masquer les blocs de calcul
    const blocPrix = document.getElementById("bloc-calcul-prix");
    if (blocPrix) blocPrix.style.display = "none";
    
    const blocPrixMobile = document.getElementById("bloc-calcul-prix-mobile");
    if (blocPrixMobile) blocPrixMobile.style.display = "none";
    
    // Désactiver les boutons
    this.setReservationButtonsState('disabled');
    
    // Réinitialiser les éléments de réduction
    const reductionElements = [
      ...this.elements.prixReduction,
      ...document.querySelectorAll('#prix-reduction-mobile')
    ];
    
    reductionElements.forEach(element => {
      if (element) {
        element.textContent = "";
        element.style.display = "none";
      }
    });
    
    const blocReductionElements = [
      ...this.elements.blocReduction,
      ...document.querySelectorAll('#bloc-reduction-mobile')
    ];
    
    blocReductionElements.forEach(element => {
      if (element) {
        element.style.display = "none";
      }
    });
    
    // Réinitialiser les autres éléments
    [this.elements.calcNuit, this.elements.prixNuit, this.elements.prixTaxe, 
     this.elements.prixMenage, this.elements.totalPrix].forEach(elementArray => {
      elementArray.forEach(element => {
        if (element) element.textContent = "-";
      });
    });
    
    // Afficher prix "À partir de" si données disponibles
    if (this.elements.prixDirect.length || this.elements.textPourcentage.length) {
      this.displayStartingPrice();
    }
    
    this.hideMinNightsError();
  }

  displayStartingPrice() {
    let minPrice = Infinity;
    let platformPrice = 0;
    let bestSeason = null;
    
    if (this.pricingData && this.pricingData.seasons) {
      for (const season of this.pricingData.seasons) {
        if (season.price < minPrice) {
          minPrice = season.price;
          bestSeason = season;
          platformPrice = this.getPlatformPrice(season);
        }
      }
    }
    
    if (isFinite(minPrice) && bestSeason) {
      if (this.elements.prixDirect.length) {
        this.elements.prixDirect.forEach(element => {
          element.innerHTML = `À partir de<br><strong style="font-weight:bold;font-family:Inter;font-size:24px">${Math.round(minPrice)}€ / nuit</strong>`;
        });
      }
      
      if (this.elements.textPourcentage.length) {
        if (platformPrice > minPrice) {
          this.elements.textPourcentage.forEach(element => {
            element.textContent = `-${Math.round(100 * (platformPrice - minPrice) / platformPrice)}%`;
          });
        } else {
          this.elements.textPourcentage.forEach(element => {
            element.textContent = "";
          });
        }
      }
    }
  }

  calculateAndDisplayPrices() {
    console.log('💰 Calcul des prix démarré');
    if (!this.pricingData || !this.startDate || !this.endDate) {
      console.warn('⚠️ Données manquantes pour le calcul');
      return;
    }
    
    const stayDetails = this.calculateStayDetails();
    if (stayDetails) {
      console.log('✅ Détails du séjour calculés');
      this.updateUI(stayDetails);
      this.hideMinNightsError();
    } else {
      console.warn('❌ Erreur nuits minimum');
      this.showMinNightsError();
    }
  }

  calculateStayDetails() {
    const details = {
      nights: 0,
      nightsBreakdown: [],
      nightsPrice: 0,
      originalNightsPrice: 0,
      discountAmount: 0,
      cleaningFee: 0,
      touristTax: 0,
      totalPrice: 0,
      platformPrice: 0
    };
    
    try {
      details.nights = this.endDate.diff(this.startDate, "days");
      if (details.nights <= 0) return null;
      
      // Vérifier les nuits minimum
      const firstNight = moment(this.startDate).startOf("day");
      const firstSeason = this.getSeason(firstNight);
      if (firstSeason && firstSeason.minNights && details.nights < firstSeason.minNights) {
        return null;
      }
      
      // Calculer prix par nuit
      let currentDate = moment(this.startDate).startOf("day");
      const endDate = moment(this.endDate).startOf("day");
      
      while (currentDate.isBefore(endDate)) {
        const season = this.getSeason(currentDate);
        if (!season) {
          currentDate.add(1, "day");
          continue;
        }
        
        const nightInfo = {
          date: currentDate.format("YYYY-MM-DD"),
          season: season.name,
          price: season.price,
          platformPrice: this.getPlatformPrice(season)
        };
        
        details.nightsBreakdown.push(nightInfo);
        details.nightsPrice += season.price;
        details.platformPrice += nightInfo.platformPrice;
        currentDate.add(1, "day");
      }
      
      details.originalNightsPrice = details.nightsPrice;
      
      // Appliquer les réductions de séjour
      if (this.pricingData.discounts && this.pricingData.discounts.length > 0) {
        const sortedDiscounts = [...this.pricingData.discounts].sort((a, b) => b.nights - a.nights);
        
        for (const discount of sortedDiscounts) {
          if (details.nights >= discount.nights) {
            const discountPercentage = discount.percentage;
            const nightsDiscount = details.originalNightsPrice * discountPercentage / 100;
            const platformDiscount = details.platformPrice * discountPercentage / 100;
            
            details.discountAmount = nightsDiscount;
            details.platformPrice -= platformDiscount;
            break;
          }
        }
      }
      
      // Frais de ménage
      if (this.pricingData.cleaning && !this.pricingData.cleaning.included) {
        details.cleaningFee = this.pricingData.cleaning.price || 0;
      }
      
      // Taxe de séjour
      const adultsElement = Utils.getElementByIdWithFallback("chiffres-adultes");
      const adultsCount = parseInt(adultsElement?.textContent || "1");
      
      if (this.logementType === "Maison d'hôte") {
        details.touristTax = 0.75 * adultsCount * details.nights;
      } else {
        const priceAfterDiscount = details.originalNightsPrice - details.discountAmount;
        details.touristTax = 0.05 * priceAfterDiscount * adultsCount;
      }
      
      details.touristTax = Math.round(details.touristTax * 100) / 100;
      details.totalPrice = details.originalNightsPrice - details.discountAmount + details.cleaningFee + details.touristTax;
      details.platformPrice += details.touristTax;
      
      if (details.cleaningFee > 0) {
        details.platformPrice += details.cleaningFee;
      }
      
      return details;
      
    } catch (error) {
      console.error("Erreur dans calculateStayDetails:", error);
      return null;
    }
  }

  getSeason(date) {
    if (!this.pricingData || !this.pricingData.seasons || !this.pricingData.seasons.length) {
      return null;
    }
    
    const month = date.month() + 1;
    const day = date.date();
    
    for (const season of this.pricingData.seasons) {
      for (const period of season.periods) {
        const [startDay, startMonth] = period.start.split("-").map(Number);
        const [endDay, endMonth] = period.end.split("-").map(Number);
        
        if (startMonth < endMonth || (startMonth === endMonth && startDay <= endDay)) {
          if ((month > startMonth || (month === startMonth && day >= startDay)) &&
              (month < endMonth || (month === endMonth && day <= endDay))) {
            return season;
          }
        } else {
          if ((month > startMonth || (month === startMonth && day >= startDay)) ||
              (month < endMonth || (month === endMonth && day <= endDay))) {
            return season;
          }
        }
      }
    }
    
    return this.pricingData.seasons[0];
  }

  getPlatformPrice(season) {
    if (!season) return 0;
    
    const usePercentage = this.pricingData.platformPricing && this.pricingData.platformPricing.usePercentage === true;
    
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

  updateUI(details) {
    // Afficher les blocs de calcul
    const blocPrix = document.getElementById("bloc-calcul-prix");
    if (blocPrix) blocPrix.style.display = "flex";
    
    const blocPrixMobile = document.getElementById("bloc-calcul-prix-mobile");
    if (blocPrixMobile) blocPrixMobile.style.display = "flex";
    
    // Activer les boutons
    this.setReservationButtonsState('enabled');
    
    const formatPrice = (price) => Math.round(price).toLocaleString("fr-FR");
    
    // Calcul par nuit
    if (this.elements.calcNuit.length) {
      const avgPricePerNight = Math.round(details.originalNightsPrice / details.nights);
      this.elements.calcNuit.forEach(element => {
        element.textContent = `${avgPricePerNight}€ x ${details.nights} nuits`;
      });
    }
    
    // Prix des nuits
    if (this.elements.prixNuit.length) {
      this.elements.prixNuit.forEach(element => {
        element.textContent = `${formatPrice(details.originalNightsPrice)}€`;
      });
    }
    
    // Gestion des réductions
    const reductionPriceElements = [
      ...this.elements.prixReduction,
      ...Array.from(document.querySelectorAll('#prix-reduction-mobile'))
    ].filter(el => el !== null);
    
    const reductionBlockElements = [
      ...this.elements.blocReduction,
      ...Array.from(document.querySelectorAll('#bloc-reduction-mobile'))
    ].filter(el => el !== null);
    
    if (details.discountAmount > 0) {
      reductionPriceElements.forEach(element => {
        if (element) {
          element.textContent = `-${formatPrice(details.discountAmount)}€`;
          element.style.color = "#2AA551";
          element.style.display = "block";
        }
      });
      
      reductionBlockElements.forEach(element => {
        if (element) {
          element.style.display = "flex";
        }
      });
    } else {
      reductionPriceElements.forEach(element => {
        if (element) {
          element.textContent = "";
          element.style.display = "none";
        }
      });
      
      reductionBlockElements.forEach(element => {
        if (element) {
          element.style.display = "none";
        }
      });
    }
    
    // Taxe de séjour
    if (this.elements.prixTaxe.length) {
      this.elements.prixTaxe.forEach(element => {
        element.textContent = `${formatPrice(details.touristTax)}€`;
      });
    }
    
    // Frais de ménage
    if (this.elements.prixMenage.length) {
      this.elements.prixMenage.forEach(element => {
        element.textContent = details.cleaningFee > 0 ? `${formatPrice(details.cleaningFee)}€` : "Inclus";
      });
    }
    
    // Prix total
    if (this.elements.totalPrix.length) {
      this.elements.totalPrix.forEach(element => {
        if (details.platformPrice > details.totalPrice) {
          element.innerHTML = `<span style="text-decoration:line-through;font-weight:normal;font-family:Inter;font-size:16px;color:#778183">${formatPrice(details.platformPrice)}€</span><span style="display:inline-block;width:4px"></span><span style="font-weight:600;font-family:Inter;font-size:16px;color:#272A2B">${formatPrice(details.totalPrice)}€</span>`;
        } else {
          element.innerHTML = `<span style="font-weight:600;font-family:Inter;font-size:16px;color:#272A2B">${formatPrice(details.totalPrice)}€</span>`;
        }
      });
    }
    
    // Mettre à jour prix direct et pourcentage
    if (this.elements.prixDirect.length || this.elements.textPourcentage.length) {
      const avgPricePerNight = Math.round(details.originalNightsPrice / details.nights);
      
      let totalPlatformPrice = 0;
      for (const night of details.nightsBreakdown) {
        totalPlatformPrice += night.platformPrice;
      }
      const avgPlatformPricePerNight = Math.round(totalPlatformPrice / details.nights);
      
      if (this.elements.prixDirect.length) {
        this.elements.prixDirect.forEach(element => {
          element.innerHTML = `À partir de<br><strong style="font-weight:bold;font-family:Inter;font-size:24px">${avgPricePerNight}€ / nuit</strong>`;
        });
      }
      
      if (this.elements.textPourcentage.length) {
        if (avgPlatformPricePerNight > avgPricePerNight) {
          this.elements.textPourcentage.forEach(element => {
            element.textContent = `-${Math.round(100 * (avgPlatformPricePerNight - avgPricePerNight) / avgPlatformPricePerNight)}%`;
          });
        } else {
          this.elements.textPourcentage.forEach(element => {
            element.textContent = "";
          });
        }
      }
    }
  }

  showMinNightsError() {
    const prixBlock = document.getElementById("bloc-calcul-prix");
    if (prixBlock) prixBlock.style.display = "none";
    
    const prixMobileBlock = document.getElementById("bloc-calcul-prix-mobile");
    if (prixMobileBlock) prixMobileBlock.style.display = "none";
    
    this.setReservationButtonsState('min-nights-error');
    
    const errorBlocks = document.querySelectorAll('.bloc-error-days');
    const minNightsTexts = [
      document.getElementById('text-days-minimum'),
      document.getElementById('text-days-minimum-mobile')
    ];
    
    const season = this.getSeason(this.startDate);
    const minNights = season && season.minNights ? season.minNights : 1;
    
    errorBlocks.forEach(block => block && (block.style.display = 'block'));
    minNightsTexts.forEach(text => text && (text.textContent = `${minNights} nuits minimum`));
  }

  hideMinNightsError() {
    const errorBlocks = document.querySelectorAll('.bloc-error-days');
    errorBlocks.forEach(block => block && (block.style.display = 'none'));
  }
}

// Export global uniquement - PAS d'auto-initialisation
window.PriceCalculator = PriceCalculator;
