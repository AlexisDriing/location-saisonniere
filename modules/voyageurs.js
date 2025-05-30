// Gestion des voyageurs (adultes, enfants, bébés)
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
    }
  }

  decrementAdults() {
    if (this.adults > 1) {
      this.adults--;
      this.updateUI();
      this.notifyPriceCalculator();
    }
  }

  incrementChildren() {
    if (this.adults + this.children < this.maxCapacity) {
      this.children++;
      this.updateUI();
      this.notifyPriceCalculator();
    }
  }

  decrementChildren() {
    if (this.children > 0) {
      this.children--;
      this.updateUI();
      this.notifyPriceCalculator();
    }
  }

  incrementBabies() {
    this.babies++;
    this.updateUI();
    this.notifyPriceCalculator();
  }

  decrementBabies() {
    if (this.babies > 0) {
      this.babies--;
      this.updateUI();
      this.notifyPriceCalculator();
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

  getTravelersData() {
    return {
      adults: this.adults,
      children: this.children,
      babies: this.babies,
      total: this.adults + this.children
    };
  }
}

// Initialisation automatique
document.addEventListener('DOMContentLoaded', () => {
  window.travelersManager = new TravelersManager();
  console.log('✅ Travelers Manager initialisé');
});

// Export global
window.TravelersManager = TravelersManager;
