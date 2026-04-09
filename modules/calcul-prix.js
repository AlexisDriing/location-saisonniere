// Calculateur de prix principal - LOG production V1.119
class PriceCalculator {
  constructor() {
    this.elements = {
      calcNuit: Utils.getAllElementsById("calcul-nuit"),
      prixNuit: Utils.getAllElementsById("prix-nuit"),
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
    
    // Désactiver les boutons de réservation par défaut (OPACITÉ FAIBLE + PAS DE CLICS)
    const reserverButtons = this.getReserverButtons();
    reserverButtons.forEach(button => {
      button.style.opacity = "0.5";
      button.style.pointerEvents = "none";
      button.style.cursor = "not-allowed";
    });
    
    this.resetPrices();
    this.listenForDateChanges();
    
    // Export global pour autres modules
    window.priceCalculator = this;
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
        if (!jsonData || jsonData.trim() === '') return;
        this.pricingData = JSON.parse(jsonData);
      } catch (error) {
        console.error("❌ Erreur lors du chargement des données tarifaires:", error);
      }
    } else {
      console.warn("⚠️ Aucun élément avec data-json-tarifs-line ou data-json-tarifs trouvé");
    }
  }

  loadLogementType() {
    const element = document.querySelector("[data-type-logement]");
    if (element) {
      this.logementType = element.getAttribute("data-type-logement");
    } else {
      this.logementType = "standard";
    }
  }

  listenForDateChanges() {
    if (typeof jQuery !== 'undefined' && jQuery("#input-calendar, #input-calendar-mobile").length) {
      jQuery("#input-calendar, #input-calendar-mobile").on("apply.daterangepicker", (e, picker) => {
        if (picker.startDate && picker.endDate) {
          this.startDate = picker.startDate;
          this.endDate = picker.endDate;
          this.calculateAndDisplayPrices();
        } else {
          this.resetPrices();
        }
      });
      
      jQuery("#input-calendar, #input-calendar-mobile").on("cancel.daterangepicker", () => {
        this.resetPrices();
      });
    } else {
      console.warn("⚠️ jQuery ou DateRangePicker non disponible");
    }
  }

  getReserverButtons() {
    return document.querySelectorAll('.button.homepage.site-internet[class*="button-reserver"]:not(.chambre)');
  }


  resetPrices() {
    this.startDate = null;
    this.endDate = null;
    
    // Masquer les blocs de calcul
    const blocPrix = document.getElementById("bloc-calcul-prix");
    if (blocPrix) blocPrix.style.display = "none";
    
    const blocPrixMobile = document.getElementById("bloc-calcul-prix-mobile");
    if (blocPrixMobile) blocPrixMobile.style.display = "none";
    
    // Désactiver boutons de réservation (MÊME LOGIQUE QU'À L'INIT)
    const reserverButtons = this.getReserverButtons();
    reserverButtons.forEach(button => {
      button.style.opacity = "0.5";
      button.style.pointerEvents = "none";
      button.style.cursor = "not-allowed";
    });

    // 🆕 Masquer la ligne supplément voyageurs (desktop + mobile)
      const ligneSupplementEls = Utils.getAllElementsById('ligne-supplement-voyageurs');
      ligneSupplementEls.forEach(el => el.style.display = 'none');
    
    // ===== RÉINITIALISER LES RÉDUCTIONS (SIMPLIFIÉ) =====
    this.elements.prixReduction.forEach(element => {
      if (element) {
        element.textContent = "";
        element.style.display = "none";
      }
    });
    
    this.elements.blocReduction.forEach(element => {
      if (element) {
        element.style.display = "none";
      }
    });
        
    // Réinitialiser les autres éléments
    if (this.elements.calcNuit.length) {
      this.elements.calcNuit.forEach(element => {
        element.textContent = "-";
      });
    }
    
    if (this.elements.prixNuit.length) {
      this.elements.prixNuit.forEach(element => {
        element.textContent = "-";
      });
    }
    
    if (this.elements.prixMenage.length) {
      this.elements.prixMenage.forEach(element => {
        element.textContent = "-";
      });
    }
    
    if (this.elements.totalPrix.length) {
      this.elements.totalPrix.forEach(element => {
        element.textContent = "-";
      });
    }
    
    // Afficher prix "À partir de" si données disponibles
    if (this.elements.prixDirect.length || this.elements.textPourcentage.length) {
      let minPrice = Infinity;
      let platformPrice = 0;
      let bestSeason = null;
      
            // Commencer par vérifier le prix par défaut
      if (this.pricingData && this.pricingData.defaultPricing) {
        const perGuestPrice = this.getPerGuestPrice(this.pricingData.defaultPricing);
        minPrice = perGuestPrice || this.pricingData.defaultPricing.price;
        bestSeason = this.pricingData.defaultPricing;
        platformPrice = this.getPlatformPrice(bestSeason, perGuestPrice || null);
      }
      
      // Puis vérifier les saisons pour un prix potentiellement plus bas
      if (this.pricingData && this.pricingData.seasons) {
        for (const season of this.pricingData.seasons) {
          const seasonPerGuestPrice = this.getPerGuestPrice(season);
          const seasonPrice = seasonPerGuestPrice || season.price;
          if (seasonPrice < minPrice) {
            minPrice = seasonPrice;
            bestSeason = season;
            platformPrice = this.getPlatformPrice(season, seasonPerGuestPrice || null);
          }
        }
      }
      
      if (isFinite(minPrice) && bestSeason) {
        if (this.elements.prixDirect.length) {
          this.elements.prixDirect.forEach(element => {
            // ✅ SÉCURISÉ : Vider et reconstruire
            element.textContent = '';
            
            // Ajouter "À partir de"
            element.appendChild(document.createTextNode('À partir de'));
            
            // Ajouter le saut de ligne
            element.appendChild(document.createElement('br'));
            
            // Créer et styler le strong
            const strong = document.createElement('strong');
            strong.style.fontWeight = 'bold';
            strong.style.fontFamily = 'Inter';
            strong.style.fontSize = '24px';
            strong.textContent = `${Math.round(minPrice)}€ / nuit`;
            
            element.appendChild(strong);
          });
        }
        
        // 🆕 MODIFICATION : Toujours afficher le pourcentage grâce à getPlatformPrice modifié
        if (this.elements.textPourcentage.length) {
          // platformPrice sera toujours calculé maintenant (17% par défaut)
          const discount = Math.round(100 * (platformPrice - minPrice) / platformPrice);
          this.elements.textPourcentage.forEach(element => {
            element.textContent = discount > 0 ? `-${discount}%` : "";
          });
        }
      }
    }
    
    // Mettre à jour les prix et la disponibilité des chambres
    const interfaceManager = window.detailLogementPage?.managers?.interface;
    if (interfaceManager?.updateAllRoomBlockPrices) {
      interfaceManager.updateAllRoomBlockPrices();
    }
    if (interfaceManager?.updateRoomAvailability) {
      interfaceManager.updateRoomAvailability();
    }


    this.hideMinNightsError();
  }


  calculateAndDisplayPrices() {
    if (!this.pricingData || !this.startDate || !this.endDate) {
      console.warn('⚠️ Données manquantes pour le calcul:', {
        pricingData: !!this.pricingData,
        startDate: !!this.startDate,
        endDate: !!this.endDate
      });
      return;
    }
    
    const stayDetails = this.calculateStayDetails();
    if (stayDetails) {
      this.updateUI(stayDetails);
      this.hideMinNightsError();
    } else {
      console.warn('❌ Impossible de calculer les détails du séjour');
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
      
      // 🆕 Gestion spéciale si pas de firstSeason
      if (!firstSeason) {
        console.error("Aucune saison trouvée pour la date de début");
        return null;
      }
      
      if (firstSeason.minNights && details.nights < firstSeason.minNights) {
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
        
        // Déterminer le prix de la nuit
        const perGuestPrice = this.getPerGuestPrice(season);
        let nightPrice = perGuestPrice || season.price;
        const dayOfWeek = currentDate.day();
        
        if (season === this.pricingData.defaultPricing && 
            this.pricingData.defaultPricing.weekend?.enabled &&
            this.pricingData.defaultPricing.weekend?.price > 0 &&
            (dayOfWeek === 5 || dayOfWeek === 6)) {
          nightPrice = this.pricingData.defaultPricing.weekend.price;
        }
        
        // Passer en override si le prix est différent du prix de base de la saison
        const overridePrice = nightPrice !== season.price ? nightPrice : null;
        
        const nightInfo = {
          date: currentDate.format("YYYY-MM-DD"),
          formattedDate: currentDate.format("DD/MM/YYYY"),
          season: season.name,
          price: nightPrice,
          platformPrice: this.getPlatformPrice(season, overridePrice)
        };

        
        details.nightsBreakdown.push(nightInfo);
        details.nightsPrice += nightPrice;
        details.platformPrice += nightInfo.platformPrice;
        currentDate.add(1, "day");
      }
      
      details.originalNightsPrice = details.nightsPrice;

      // Supplément voyageurs (pas en mode per_guest, le prix inclut déjà les voyageurs)
      details.extraGuestsFee = 0;
      details.extraGuestsCount = 0;
      if (this.pricingData.defaultPricing?.mode !== 'per_guest') {
      const extraGuests = this.pricingData.extraGuests;
      if (extraGuests && extraGuests.enabled && extraGuests.threshold > 0 && extraGuests.pricePerPerson > 0) {

        const adultsCount = parseInt(Utils.getElementByIdWithFallback("chiffres-adultes")?.textContent || "1");
        const childrenCount = parseInt(Utils.getElementByIdWithFallback("chiffres-enfants")?.textContent || "0");
        const totalGuests = adultsCount + childrenCount;
        
        const extraCount = Math.max(0, totalGuests - extraGuests.threshold);
        if (extraCount > 0) {
          details.extraGuestsCount = extraCount;
          details.extraGuestsFee = extraCount * extraGuests.pricePerPerson * details.nights;
          
          // Ajouter au prix des nuits (AVANT réduction)
          details.nightsPrice += details.extraGuestsFee;
          
          // Ajouter aussi au prix plateforme
          details.platformPrice += details.extraGuestsFee;
        }
      }
      }
      
      // Appliquer les réductions de séjour
      if (this.pricingData.discounts && this.pricingData.discounts.length > 0) {
        const sortedDiscounts = [...this.pricingData.discounts].sort((a, b) => b.nights - a.nights);
        
        for (const discount of sortedDiscounts) {
          if (details.nights >= discount.nights) {
            const discountPercentage = discount.percentage;
            // 🆕 La réduction s'applique sur originalNightsPrice + supplément voyageurs
            const baseForDiscount = details.originalNightsPrice + details.extraGuestsFee;
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
        details.cleaningOptional = this.pricingData.cleaning.optional || false;
      }
      
      // Prix total - Le ménage "en option" n'est PAS ajouté au total
      if (details.cleaningOptional) {
        details.totalPrice = details.originalNightsPrice + details.extraGuestsFee - details.discountAmount;
      } else {
        details.totalPrice = details.originalNightsPrice + details.extraGuestsFee - details.discountAmount + details.cleaningFee;
      }
      
      if (details.cleaningFee > 0 && !details.cleaningOptional) {
        details.platformPrice += details.cleaningFee;
      }
      
      return details;
      
    } catch (error) {
      console.error("Erreur dans calculateStayDetails:", error);
      return null;
    }
  }

  getSeason(date) {
    // 🔧 FIX : Si pas de saisons, retourner directement defaultPricing
    if (!this.pricingData) return null;
    
    if (!this.pricingData.seasons || this.pricingData.seasons.length === 0) {
      // Pas de saisons définies, utiliser defaultPricing
      return this.pricingData.defaultPricing || null;
    }
    
    const month = date.month() + 1;
    const day = date.date();
    
    for (const season of this.pricingData.seasons) {
      // Vérifier que periods existe
      if (!season.periods || !Array.isArray(season.periods)) continue;
      for (const period of season.periods) {
        const [startDay, startMonth] = period.start.split("-").map(Number);
        const [endDay, endMonth] = period.end.split("-").map(Number);
        
        if (startMonth < endMonth || (startMonth === endMonth && startDay <= endDay)) {
          // Période normale dans la même année
          if ((month > startMonth || (month === startMonth && day >= startDay)) &&
              (month < endMonth || (month === endMonth && day <= endDay))) {
            return season;
          }
        } else {
          // Période qui traverse la fin d'année
          if ((month > startMonth || (month === startMonth && day >= startDay)) ||
              (month < endMonth || (month === endMonth && day <= endDay))) {
            return season;
          }
        }
      }
    }
    
    // Si aucune saison ne correspond, utiliser defaultPricing
    if (this.pricingData.defaultPricing) {
      return this.pricingData.defaultPricing;
    }
    
    // Fallback seulement si on a des saisons mais aucune ne correspond
    return this.pricingData.seasons[0];
  }

  getPlatformPrice(season, overridePrice = null) {
    if (!season) return 0;
    
    const usePercentage = this.pricingData.platformPricing && this.pricingData.platformPricing.usePercentage === true;
    
    const basePrice = overridePrice || season.price;
  
    // Si PAS de override (appel normal) → utiliser les prix manuels si disponibles
    if (!overridePrice && season === this.pricingData.defaultPricing && season.platformPrices) {
      const prices = Object.values(season.platformPrices).filter(price => price > 0);
      if (prices.length > 0) {
        return prices.reduce((a, b) => a + b, 0) / prices.length;
      }
    }
    
    if (!overridePrice && !usePercentage && season.platformPrices) {
      const prices = Object.values(season.platformPrices).filter(price => price > 0);
      if (prices.length > 0) {
        return prices.reduce((a, b) => a + b, 0) / prices.length;
      }
    }
    
    // Si override (week-end) → calculer le % depuis les prix manuels du defaultPricing
    if (overridePrice && this.pricingData.defaultPricing?.platformPrices) {
      const manualPrices = Object.values(this.pricingData.defaultPricing.platformPrices).filter(p => p > 0);
      if (manualPrices.length > 0) {
        const avgPlatformPrice = manualPrices.reduce((a, b) => a + b, 0) / manualPrices.length;
        const directPrice = this.pricingData.defaultPricing.price;
        if (directPrice > 0) {
          // Calculer le pourcentage : 122/100 = 1.22
          const ratio = avgPlatformPrice / directPrice;
          // Appliquer ce même ratio au prix week-end : 130 * 1.22 = 158.60
          return overridePrice * ratio;
        }
      }
    }
    
    if (this.pricingData.platformMarkup && this.pricingData.platformMarkup.percentage) {
      return basePrice * (1 + this.pricingData.platformMarkup.percentage / 100);
    }
    
    const defaultDiscount = (this.pricingData.platformPricing && this.pricingData.platformPricing.defaultDiscount) 
      ? this.pricingData.platformPricing.defaultDiscount 
      : 17;
    
    return basePrice * (100 / (100 - defaultDiscount));
  }

    getPerGuestPrice(season = null) {
    if (this.pricingData?.defaultPricing?.mode !== 'per_guest') return null;
    
    const source = (season && season.pricesPerGuest?.length > 0) 
      ? season 
      : this.pricingData.defaultPricing;
    const prices = source.pricesPerGuest;
    
    if (!prices || prices.length === 0) return null;
    
    const adultsCount = parseInt(Utils.getElementByIdWithFallback("chiffres-adultes")?.textContent || "1");
    const childrenCount = parseInt(Utils.getElementByIdWithFallback("chiffres-enfants")?.textContent || "0");
    const totalGuests = Math.max(1, adultsCount + childrenCount);
    const index = Math.min(totalGuests - 1, prices.length - 1);
    return prices[Math.max(0, index)];
  }

  
  updateUI(details) {
    // Afficher les blocs de calcul
    const blocPrix = document.getElementById("bloc-calcul-prix");
    if (blocPrix) blocPrix.style.display = "flex";
    
    const blocPrixMobile = document.getElementById("bloc-calcul-prix-mobile");
    if (blocPrixMobile) blocPrixMobile.style.display = "flex";
    
    // ACTIVER les boutons de réservation (dates valides sélectionnées)
    const reserverButtons = this.getReserverButtons();
    reserverButtons.forEach(button => {
      button.style.opacity = "1";
      button.style.pointerEvents = "auto";
      button.style.cursor = "pointer";
    });
    
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

     // 🆕 NOUVEAU : Supplément voyageurs
      const ligneSupplementEls = Utils.getAllElementsById('ligne-supplement-voyageurs');
      const calculSupplementEls = Utils.getAllElementsById('calcul-supplement');
      const prixSupplementEls = Utils.getAllElementsById('prix-supplement');
      
      if (ligneSupplementEls.length) {
        if (details.extraGuestsFee > 0) {
          ligneSupplementEls.forEach(el => el.style.display = 'flex');
          calculSupplementEls.forEach(el => {
            el.textContent = `Supplément voyageurs (${details.extraGuestsCount} pers.)`;
          });
          prixSupplementEls.forEach(el => {
            el.textContent = `${formatPrice(details.extraGuestsFee)}€`;
          });
        } else {
          ligneSupplementEls.forEach(el => el.style.display = 'none');
        }
      } 
    
    // ===== GESTION DES RÉDUCTIONS (SIMPLIFIÉ) =====
    if (details.discountAmount > 0) {
      // AFFICHER la réduction - Utils.getAllElementsById() gère déjà desktop + mobile
      this.elements.prixReduction.forEach(element => {
        if (element) {
          element.textContent = `-${formatPrice(details.discountAmount)}€`;
          element.style.color = "#2AA551";
          element.style.display = "block";
        }
      });
      
      this.elements.blocReduction.forEach(element => {
        if (element) {
          element.style.display = "flex";
        }
      });
      
    } else {
      // MASQUER la réduction
      this.elements.prixReduction.forEach(element => {
        if (element) {
          element.textContent = "";
          element.style.display = "none";
        }
      });
      
      this.elements.blocReduction.forEach(element => {
        if (element) {
          element.style.display = "none";
        }
      });
      
    }
    
        // Frais de ménage (masquer pour les chambres d'hôtes)
    if (this.elements.prixMenage.length) {
      const hasCleaning = this.pricingData.cleaning !== undefined;
      this.elements.prixMenage.forEach(element => {
        const ligneMenage = element.closest('.ligne-menage') || element.parentElement;
        if (!hasCleaning) {
          if (ligneMenage) ligneMenage.style.display = 'none';
          return;
        }
        if (ligneMenage) ligneMenage.style.display = '';
        if (details.cleaningFee > 0) {
          if (details.cleaningOptional) {
            element.innerHTML = `${formatPrice(details.cleaningFee)}€ <span style="color:#778183">(en option)</span>`;
          } else {
            element.textContent = `${formatPrice(details.cleaningFee)}€`;
          }
        } else {
          element.textContent = "Inclus";
        }
      });
    }

    
    // SOLUTION SIMPLE : Créer les éléments au lieu d'innerHTML
    if (this.elements.totalPrix.length) {
      this.elements.totalPrix.forEach(element => {
        // Vider l'élément
        element.textContent = '';
        
        if (details.platformPrice > details.totalPrice) {
          // Créer le prix barré
          const strikeSpan = document.createElement('span');
          strikeSpan.style.cssText = 'text-decoration:line-through;font-weight:normal;font-family:Inter;font-size:16px;color:#778183';
          strikeSpan.textContent = `${formatPrice(details.platformPrice)}€`;
          
          // Créer l'espace
          const spaceSpan = document.createElement('span');
          spaceSpan.style.cssText = 'display:inline-block;width:4px';
          
          // Créer le prix final
          const priceSpan = document.createElement('span');
          priceSpan.style.cssText = 'font-weight:600;font-family:Inter;font-size:16px;color:#272A2B';
          priceSpan.textContent = `${formatPrice(details.totalPrice)}€`;
          
          // Ajouter tout
          element.appendChild(strikeSpan);
          element.appendChild(spaceSpan);
          element.appendChild(priceSpan);
        } else {
          const priceSpan = document.createElement('span');
          priceSpan.style.cssText = 'font-weight:600;font-family:Inter;font-size:16px;color:#272A2B';
          priceSpan.textContent = `${formatPrice(details.totalPrice)}€`;
          element.appendChild(priceSpan);
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
          // ✅ SÉCURISÉ : Vider et reconstruire
          element.textContent = '';
          
          // Ajouter "À partir de"
          element.appendChild(document.createTextNode('À partir de'));
          
          // Ajouter le saut de ligne
          element.appendChild(document.createElement('br'));
          
          // Créer et styler le strong
          const strong = document.createElement('strong');
          strong.style.fontWeight = 'bold';
          strong.style.fontFamily = 'Inter';
          strong.style.fontSize = '24px';
          strong.textContent = `${avgPricePerNight}€ / nuit`;
          
          element.appendChild(strong);
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

    // Mettre à jour la disponibilité des chambres
    const interfaceManager = window.detailLogementPage?.managers?.interface;
    if (interfaceManager?.updateRoomAvailability) {
      interfaceManager.updateRoomAvailability();
    }
  }


    showMinNightsError() {
    // Masquer les blocs de prix
    const prixBlock = document.getElementById("bloc-calcul-prix");
    if (prixBlock) prixBlock.style.display = "none";
    
    const prixMobileBlock = document.getElementById("bloc-calcul-prix-mobile");
    if (prixMobileBlock) prixMobileBlock.style.display = "none";
    
    // D'abord tout masquer
    document.querySelectorAll('.bloc-error-days').forEach(block => {
      if (block) block.style.display = 'none';
    });

    const season = this.getSeason(this.startDate);
    const minNights = season && season.minNights ? season.minNights : 1;
    const minNightsText = `${minNights} nuit${minNights > 1 ? 's' : ''} minimum`;

    // Déterminer si c'est une chambre
    const isChambre = window.detailLogementPage?.managers?.interface?._selectedRoomIndex;

    if (isChambre) {
      // Blocs chambre (desktop + mobile)
      const blocChambre = document.getElementById('bloc-error-days-chambre');
      const blocChambreMobile = document.getElementById('bloc-error-days-chambre-mobile');
      const textChambre = document.getElementById('text-days-minimum-chambre');
      const textChambreMobile = document.getElementById('text-days-minimum-chambre-mobile');
      if (blocChambre) blocChambre.style.display = 'block';
      if (blocChambreMobile) blocChambreMobile.style.display = 'block';
      if (textChambre) textChambre.textContent = minNightsText;
      if (textChambreMobile) textChambreMobile.textContent = minNightsText;
    } else {
      // Blocs logement (desktop + mobile) — seulement ceux SANS la classe .chambre
      document.querySelectorAll('.bloc-error-days:not(.chambre)').forEach(block => {
        if (block) block.style.display = 'block';
      });
      const textDesktop = document.getElementById('text-days-minimum');
      const textMobile = document.getElementById('text-days-minimum-mobile');
      if (textDesktop) textDesktop.textContent = minNightsText;
      if (textMobile) textMobile.textContent = minNightsText;
    }
    
    // Boutons désactivés
    const reserverButtons = this.getReserverButtons();
    reserverButtons.forEach(button => {
      button.style.opacity = '0.3';
      button.style.pointerEvents = 'none';
      button.style.cursor = 'not-allowed';
    });
  }


  hideMinNightsError() {
    const errorBlocks = document.querySelectorAll('.bloc-error-days');
    errorBlocks.forEach(block => block && (block.style.display = 'none'));
    const blocChambre = document.getElementById('bloc-error-days-chambre');
    if (blocChambre) blocChambre.style.display = 'none';
  }

}

// Export global
window.PriceCalculator = PriceCalculator;
