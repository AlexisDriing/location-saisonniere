/**
 * Module de calcul des prix pour les locations saisonnières
 * Ce module gère tous les calculs de tarifs, réductions, taxes et frais
 */

class PriceCalculator {
  constructor() {
    this.pricingData = null;
    this.logementType = '';
    this.startDate = null;
    this.endDate = null;
    
    // Cache pour les éléments DOM
    this.elements = {
      calcNuit: this.getAllElements('calcul-nuit'),
      prixNuit: this.getAllElements('prix-nuit'),
      prixTaxe: this.getAllElements('prix-taxe'),
      prixMenage: this.getAllElements('prix-menage'),
      totalPrix: this.getAllElements('total-prix'),
      textPourcentage: this.getAllElements('text-pourcentage'),
      prixDirect: this.getAllElements('prix-direct'),
      prixReduction: this.getAllElements('prix-reduction'),
      blocReduction: this.getAllElements('bloc-reduction')
    };
  }

  /**
   * Récupère tous les éléments (desktop et mobile)
   */
  getAllElements(baseId) {
    const elements = [];
    const desktop = document.getElementById(baseId);
    const mobile = document.getElementById(`${baseId}-mobile`);
    
    if (desktop) elements.push(desktop);
    if (mobile) elements.push(mobile);
    
    return elements;
  }

  /**
   * Initialise le calculateur avec les données de tarification
   */
  init(pricingData, logementType) {
    this.pricingData = pricingData;
    this.logementType = logementType || 'standard';
    
    // Masquer le bloc de calcul au départ
    this.togglePriceDisplay(false);
    
    // Afficher le prix de base
    this.displayBasePrices();
    
    return this;
  }

  /**
   * Affiche les prix de base (sans dates sélectionnées)
   */
  displayBasePrices() {
    if (!this.pricingData || !this.pricingData.seasons) return;
    
    let lowestPrice = Infinity;
    let lowestSeason = null;
    let platformPrice = 0;
    
    // Trouver le prix le plus bas
    for (const season of this.pricingData.seasons) {
      if (season.price < lowestPrice) {
        lowestPrice = season.price;
        lowestSeason = season;
        platformPrice = this.getPlatformPrice(season);
      }
    }
    
    if (!isFinite(lowestPrice) || !lowestSeason) return;
    
    // Afficher le prix de base
    this.elements.prixDirect.forEach(element => {
      element.innerHTML = `À partir de<br><strong style="font-weight:bold;font-family:Inter;font-size:24px">${Math.round(lowestPrice)}€ / nuit</strong>`;
    });
    
    // Afficher le pourcentage de réduction si applicable
    if (platformPrice > lowestPrice) {
      const discount = Math.round(100 * (platformPrice - lowestPrice) / platformPrice);
      this.elements.textPourcentage.forEach(element => {
        element.textContent = `-${discount}%`;
      });
    }
  }

  /**
   * Calcule et affiche les prix pour une période donnée
   */
  calculatePrices(startDate, endDate) {
    this.startDate = startDate;
    this.endDate = endDate;
    
    if (!this.pricingData || !startDate || !endDate) {
      this.resetDisplay();
      return;
    }
    
    const stayDetails = this.calculateStayDetails();
    
    if (!stayDetails) {
      this.showMinNightsError();
      return;
    }
    
    this.updatePricesDisplay(stayDetails);
    this.hideMinNightsError();
    this.togglePriceDisplay(true);
  }

  /**
   * Calcule les détails du séjour
   */
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
      // Calculer le nombre de nuits
      details.nights = this.endDate.diff(this.startDate, 'days');
      if (details.nights <= 0) return null;
      
      // Vérifier le nombre minimum de nuits
      const firstNightSeason = this.getSeason(this.startDate);
      if (firstNightSeason && firstNightSeason.minNights && details.nights < firstNightSeason.minNights) {
        return null;
      }
      
      // Calculer le prix pour chaque nuit
      let currentDate = moment(this.startDate);
      const endDate = moment(this.endDate);
      
      while (currentDate.isBefore(endDate)) {
        const season = this.getSeason(currentDate);
        if (!season) {
          currentDate.add(1, 'day');
          continue;
        }
        
        const nightDetail = {
          date: currentDate.format('YYYY-MM-DD'),
          season: season.name,
          price: season.price,
          platformPrice: this.getPlatformPrice(season)
        };
        
        details.nightsBreakdown.push(nightDetail);
        details.nightsPrice += season.price;
        details.platformPrice += nightDetail.platformPrice;
        
        currentDate.add(1, 'day');
      }
      
      details.originalNightsPrice = details.nightsPrice;
      
      // Appliquer les réductions long séjour
      if (this.pricingData.discounts && this.pricingData.discounts.length > 0) {
        const sortedDiscounts = [...this.pricingData.discounts].sort((a, b) => b.nights - a.nights);
        
        for (const discount of sortedDiscounts) {
          if (details.nights >= discount.nights) {
            const discountAmount = details.originalNightsPrice * discount.percentage / 100;
            const platformDiscountAmount = details.platformPrice * discount.percentage / 100;
            
            details.discountAmount = discountAmount;
            details.platformPrice -= platformDiscountAmount;
            break;
          }
        }
      }
      
      // Ajouter les frais de ménage
      if (this.pricingData.cleaning && !this.pricingData.cleaning.included) {
        details.cleaningFee = this.pricingData.cleaning.price || 0;
        details.platformPrice += details.cleaningFee;
      }
      
      // Calculer la taxe de séjour
      const adultsCount = this.getAdultsCount();
      details.touristTax = this.calculateTouristTax(details, adultsCount);
      
      // Calculer le prix total
      details.totalPrice = details.originalNightsPrice - details.discountAmount + details.cleaningFee + details.touristTax;
      details.platformPrice += details.touristTax;
      
      return details;
      
    } catch (error) {
      console.error('Erreur dans calculateStayDetails:', error);
      return null;
    }
  }

  /**
   * Détermine la saison pour une date donnée
   */
  getSeason(date) {
    if (!this.pricingData || !this.pricingData.seasons || !this.pricingData.seasons.length) {
      return null;
    }
    
    const month = date.month() + 1;
    const day = date.date();
    
    for (const season of this.pricingData.seasons) {
      for (const period of season.periods) {
        const [startDay, startMonth] = period.start.split('-').map(Number);
        const [endDay, endMonth] = period.end.split('-').map(Number);
        
        // Gestion des périodes qui traversent la fin d'année
        if (startMonth <= endMonth) {
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
    
    // Retourner la première saison par défaut
    return this.pricingData.seasons[0];
  }

  /**
   * Calcule le prix plateforme pour une saison
   */
  getPlatformPrice(season) {
    if (!season) return 0;
    
    // Si des prix plateformes sont définis
    if (season.platformPrices) {
      const prices = Object.values(season.platformPrices);
      if (prices.length > 0) {
        return prices.reduce((a, b) => a + b, 0) / prices.length;
      }
    }
    
    // Sinon utiliser le markup global
    if (this.pricingData.platformMarkup && this.pricingData.platformMarkup.percentage) {
      return season.price * (1 + this.pricingData.platformMarkup.percentage / 100);
    }
    
    return season.price;
  }

  /**
   * Calcule la taxe de séjour
   */
  calculateTouristTax(details, adultsCount) {
    let tax = 0;
    
    if (this.logementType === 'Maison d\'hôte') {
      // Taxe forfaitaire pour maison d'hôte
      tax = 0.75 * adultsCount * details.nights;
    } else {
      // Taxe proportionnelle (5% du prix hors frais)
      const priceAfterDiscount = details.originalNightsPrice - details.discountAmount;
      tax = 0.05 * priceAfterDiscount * adultsCount;
    }
    
    return Math.round(tax * 100) / 100;
  }

  /**
   * Récupère le nombre d'adultes
   */
  getAdultsCount() {
    const adultsElement = document.getElementById('chiffres-adultes') || 
                         document.getElementById('chiffres-adultes-mobile');
    return parseInt(adultsElement?.textContent || '1');
  }

  /**
   * Met à jour l'affichage des prix
   */
  updatePricesDisplay(details) {
    const formatPrice = (price) => Math.round(price).toLocaleString('fr-FR');
    
    // Calcul par nuit
    if (this.elements.calcNuit.length) {
      const pricePerNight = Math.round(details.originalNightsPrice / details.nights);
      this.elements.calcNuit.forEach(el => {
        el.textContent = `${pricePerNight}€ x ${details.nights} nuits`;
      });
    }
    
    // Prix total des nuits
    this.elements.prixNuit.forEach(el => {
      el.textContent = `${formatPrice(details.originalNightsPrice)}€`;
    });
    
    // Réduction
    if (details.discountAmount > 0) {
      this.elements.prixReduction.forEach(el => {
        el.textContent = `-${formatPrice(details.discountAmount)}€`;
        el.style.color = '#2AA551';
        el.style.display = 'block';
      });
      this.elements.blocReduction.forEach(el => {
        el.style.display = 'flex';
      });
    } else {
      this.elements.prixReduction.forEach(el => {
        el.style.display = 'none';
      });
      this.elements.blocReduction.forEach(el => {
        el.style.display = 'none';
      });
    }
    
    // Taxe de séjour
    this.elements.prixTaxe.forEach(el => {
      el.textContent = `${formatPrice(details.touristTax)}€`;
    });
    
    // Frais de ménage
    this.elements.prixMenage.forEach(el => {
      el.textContent = details.cleaningFee > 0 ? `${formatPrice(details.cleaningFee)}€` : 'Inclus';
    });
    
    // Prix total
    this.elements.totalPrix.forEach(el => {
      if (details.platformPrice > details.totalPrice) {
        el.innerHTML = `<span style="text-decoration:line-through;font-weight:normal;font-family:Inter;font-size:16px;color:#778183">${formatPrice(details.platformPrice)}€</span> ` +
                       `<span style="font-weight:600;font-family:Inter;font-size:16px;color:#272A2B">${formatPrice(details.totalPrice)}€</span>`;
      } else {
        el.innerHTML = `<span style="font-weight:600;font-family:Inter;font-size:16px;color:#272A2B">${formatPrice(details.totalPrice)}€</span>`;
      }
    });
    
    // Mettre à jour le prix par nuit avec dates
    const avgPricePerNight = Math.round(details.originalNightsPrice / details.nights);
    const avgPlatformPrice = Math.round(details.platformPrice / details.nights);
    
    this.elements.prixDirect.forEach(el => {
      el.innerHTML = `À partir de<br><strong style="font-weight:bold;font-family:Inter;font-size:24px">${avgPricePerNight}€ / nuit</strong>`;
    });
    
    // Mettre à jour le pourcentage
    if (avgPlatformPrice > avgPricePerNight) {
      const discount = Math.round(100 * (avgPlatformPrice - avgPricePerNight) / avgPlatformPrice);
      this.elements.textPourcentage.forEach(el => {
        el.textContent = `-${discount}%`;
      });
    }
  }

  /**
   * Affiche/masque le bloc de calcul des prix
   */
  togglePriceDisplay(show) {
    const blocCalcul = document.getElementById('bloc-calcul-prix');
    const blocCalculMobile = document.getElementById('bloc-calcul-prix-mobile');
    const reserverButtons = document.querySelectorAll('.button-reserver, .button-reserver-mobile');
    
    if (blocCalcul) blocCalcul.style.display = show ? 'flex' : 'none';
    if (blocCalculMobile) blocCalculMobile.style.display = show ? 'flex' : 'none';
    
    reserverButtons.forEach(btn => {
      btn.style.opacity = show ? '1' : '0.5';
    });
  }

  /**
   * Affiche l'erreur de nombre minimum de nuits
   */
  showMinNightsError() {
    this.togglePriceDisplay(false);
    
    const errorBlocks = document.querySelectorAll('.bloc-error-days');
    const minNightsTexts = [
      document.getElementById('text-days-minimum'),
      document.getElementById('text-days-minimum-mobile')
    ];
    
    const season = this.getSeason(this.startDate);
    const minNights = season && season.minNights ? season.minNights : 1;
    
    errorBlocks.forEach(block => {
      if (block) block.style.display = 'block';
    });
    
    minNightsTexts.forEach(text => {
      if (text) text.textContent = `${minNights} nuits minimum`;
    });
    
    // Désactiver les boutons de réservation
    const reserverButtons = document.querySelectorAll('.button-reserver, .button-reserver-mobile');
    reserverButtons.forEach(btn => {
      btn.style.opacity = '0.3';
      btn.style.pointerEvents = 'none';
    });
  }

  /**
   * Masque l'erreur de nombre minimum de nuits
   */
  hideMinNightsError() {
    const errorBlocks = document.querySelectorAll('.bloc-error-days');
    errorBlocks.forEach(block => {
      if (block) block.style.display = 'none';
    });
    
    // Réactiver les boutons
    const reserverButtons = document.querySelectorAll('.button-reserver, .button-reserver-mobile');
    reserverButtons.forEach(btn => {
      btn.style.opacity = '1';
      btn.style.pointerEvents = 'auto';
    });
  }

  /**
   * Réinitialise l'affichage
   */
  resetDisplay() {
    this.startDate = null;
    this.endDate = null;
    
    this.togglePriceDisplay(false);
    this.hideMinNightsError();
    
    // Réinitialiser tous les affichages
    const defaultValue = '-';
    
    this.elements.calcNuit.forEach(el => el.textContent = defaultValue);
    this.elements.prixNuit.forEach(el => el.textContent = defaultValue);
    this.elements.prixTaxe.forEach(el => el.textContent = defaultValue);
    this.elements.prixMenage.forEach(el => el.textContent = defaultValue);
    this.elements.totalPrix.forEach(el => el.textContent = defaultValue);
    
    this.elements.prixReduction.forEach(el => {
      el.textContent = '';
      el.style.display = 'none';
    });
    
    this.elements.blocReduction.forEach(el => {
      el.style.display = 'none';
    });
    
    // Réafficher les prix de base
    this.displayBasePrices();
  }
}

// Exporter pour utilisation dans d'autres modules
window.PriceCalculator = PriceCalculator;
