// Gestion des voyageurs (adultes, enfants, bébés) Develop V4
class TravelersManager {
  constructor() {
    this.adults = 1;
    this.children = 0;
    this.babies = 0;
    this.maxCapacity = 8;
    
    this.init();
  }

  init() {
    this.loadCapacityFromData();

    let cache = null;
    let mostRecentTime = 0;
    
    ['current_detail_dates', 'selected_search_data'].forEach(key => {
      const data = localStorage.getItem(key);
      if (data) {
        const parsed = JSON.parse(data);
        if (parsed.timestamp > mostRecentTime) {
          mostRecentTime = parsed.timestamp;
          cache = data;
        }
      }
    });
    
    if (cache) {
      try {
        const data = JSON.parse(cache);
        // Si trop vieux OU trop de voyageurs
        if ((Date.now() - data.timestamp > 30*60*1000) || 
            ((data.adultes + data.enfants) > this.maxCapacity)) {
          // Réinitialiser à 1 adulte
          this.adults = 1;
          this.children = 0;
          this.babies = 0;
        } else {
          // Utiliser les valeurs du cache
          this.adults = data.adultes || 1;
          this.children = data.enfants || 0;
          this.babies = data.bebes || 0;
        }
      } catch(e) {
        // En cas d'erreur, valeurs par défaut
      }
    }
    
    this.setupEventListeners();
    this.updateUI();
  }

  loadCapacityFromData() {
    try {
      let element = document.querySelector("[data-json-tarifs-line]") || document.querySelector("[data-json-tarifs]");
      if (element) {
        const data = JSON.parse(element.getAttribute(element.hasAttribute("data-json-tarifs-line") ? "data-json-tarifs-line" : "data-json-tarifs"));
        this.maxCapacity = data.capacity || 8;
      }
    } catch (e) {
      console.log("Capacité par défaut utilisée");
    }
  }

  setupEventListeners() {
    // Desktop
    this.addClickListener("adultes-moins", () => this.decrementAdults());
    this.addClickListener("adultes-plus", () => this.incrementAdults());
    this.addClickListener("enfants-moins", () => this.decrementChildren());
    this.addClickListener("enfants-plus", () => this.incrementChildren());
    this.addClickListener("bebes-moins", () => this.decrementBabies());
    this.addClickListener("bebes-plus", () => this.incrementBabies());
    
    // Mobile
    this.addClickListener("adultes-moins-mobile", () => this.decrementAdults());
    this.addClickListener("adultes-plus-mobile", () => this.incrementAdults());
    this.addClickListener("enfants-moins-mobile", () => this.decrementChildren());
    this.addClickListener("enfants-plus-mobile", () => this.incrementChildren());
    this.addClickListener("bebes-moins-mobile", () => this.decrementBabies());
    this.addClickListener("bebes-plus-mobile", () => this.incrementBabies());
  }

  addClickListener(elementId, callback) {
    const element = document.getElementById(elementId);
    if (element) {
      element.style.cursor = "pointer";
      element.addEventListener("click", callback);
    }
  }

  incrementAdults() {
    if (this.adults + this.children < this.maxCapacity) {
      this.adults++;
      this.updateUI();
      this.notifyPriceCalculator();
      this.saveCurrentTravelers();
    }
  }

  decrementAdults() {
    if (this.adults > 1) {
      this.adults--;
      this.updateUI();
      this.notifyPriceCalculator();
      this.saveCurrentTravelers();
    }
  }

  incrementChildren() {
    if (this.adults + this.children < this.maxCapacity) {
      this.children++;
      this.updateUI();
      this.notifyPriceCalculator();
      this.saveCurrentTravelers();
    }
  }

  decrementChildren() {
    if (this.children > 0) {
      this.children--;
      this.updateUI();
      this.notifyPriceCalculator();
      this.saveCurrentTravelers();
    }
  }

  incrementBabies() {
    if (this.babies < 10) {  // Limite à 10 bébés maximum
      this.babies++;
      this.updateUI();
      this.notifyPriceCalculator();
      this.saveCurrentTravelers();
    } else {
      // Force la mise à jour de l'UI même si on ne peut plus incrémenter
      this.updateUI();
    }
  }

  decrementBabies() {
    if (this.babies > 0) {
      this.babies--;
      this.updateUI();
      this.notifyPriceCalculator();
      this.saveCurrentTravelers();
    }
  }

  updateUI() {
    // Mettre à jour les chiffres
    this.updateElement("chiffres-adultes", this.adults);
    this.updateElement("chiffres-adultes-mobile", this.adults);
    this.updateElement("chiffres-enfants", this.children);
    this.updateElement("chiffres-enfants-mobile", this.children);
    this.updateElement("chiffres-bebes", this.babies);
    this.updateElement("chiffres-bebes-mobile", this.babies);

    // Mettre à jour le texte des voyageurs
    const totalTravelers = this.adults + this.children;
    let travelersText = (totalTravelers === 1 ? "1 voyageur" : `${totalTravelers} voyageurs`);
    if (this.babies > 0) {
      travelersText += `, ${this.babies}${this.babies === 1 ? " bébé" : " bébés"}`;
    }
    
    this.updateElement("voyageurs-texte", travelersText);
    this.updateElement("voyageurs-texte-mobile", travelersText);

    // Mettre à jour les opacités des boutons
    this.updateButtonOpacity("adultes-moins", this.adults <= 1 ? "0.2" : "1");
    this.updateButtonOpacity("adultes-moins-mobile", this.adults <= 1 ? "0.2" : "1");
    this.updateButtonOpacity("enfants-moins", this.children <= 0 ? "0.2" : "1");
    this.updateButtonOpacity("enfants-moins-mobile", this.children <= 0 ? "0.2" : "1");
    this.updateButtonOpacity("bebes-moins", this.babies <= 0 ? "0.2" : "1");
    this.updateButtonOpacity("bebes-moins-mobile", this.babies <= 0 ? "0.2" : "1");

    const isAtCapacity = totalTravelers >= this.maxCapacity;
    this.updateButtonOpacity("adultes-plus", isAtCapacity ? "0.2" : "1");
    this.updateButtonOpacity("adultes-plus-mobile", isAtCapacity ? "0.2" : "1");
    this.updateButtonOpacity("enfants-plus", isAtCapacity ? "0.2" : "1");
    this.updateButtonOpacity("enfants-plus-mobile", isAtCapacity ? "0.2" : "1");
    this.updateButtonOpacity("bebes-plus", "1");
    this.updateButtonOpacity("bebes-plus-mobile", "1");
  }

  updateElement(id, value) {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = value;
    }
  }

  updateButtonOpacity(id, opacity) {
    const element = document.getElementById(id);
    if (element) {
      element.style.opacity = opacity;
    }
  }

  notifyPriceCalculator() {
    if (window.priceCalculator && window.priceCalculator.calculateAndDisplayPrices) {
      if (window.priceCalculator.pricingData) {
        window.priceCalculator.pricingData.capacity = this.adults + this.children;
      }
      if (window.priceCalculator.startDate && window.priceCalculator.endDate) {
        window.priceCalculator.calculateAndDisplayPrices();
      }
    }
  }

// 🆕 NOUVEAU : Sauvegarder les voyageurs modifiés
saveCurrentTravelers() {
  // Récupérer les dates actuelles du cache si elles existent
  let currentData = {};
  const existingData = localStorage.getItem('current_detail_dates');
  if (existingData) {
    currentData = JSON.parse(existingData);
  }
  
  // Mettre à jour avec les voyageurs actuels
  currentData.adultes = this.adults;
  currentData.enfants = this.children;
  currentData.bebes = this.babies;
  currentData.timestamp = Date.now();
  
  localStorage.setItem('current_detail_dates', JSON.stringify(currentData));
  console.log('👥 Voyageurs modifiés sauvegardés pour retour navigation');
}
  
  getTravelersData() {
    return {
      adults: this.adults,
      children: this.children,
      babies: this.babies,
      total: this.adults + this.children
    };
  }
}

// Export global
window.TravelersManager = TravelersManager;
