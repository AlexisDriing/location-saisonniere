/**
 * Module de gestion des voyageurs
 * Gère le nombre d'adultes, enfants et bébés avec mise à jour du calcul des prix
 */

class VoyageursManager {
  constructor() {
    // Variables globales pour compatibilité avec l'ancien code
    window.a = 1; // adultes
    window.b = 0; // enfants  
    window.c = 0; // bébés
    
    this.adultes = 1;
    this.enfants = 0;
    this.bebes = 0;
    this.capaciteMax = 8;
    
    this.init();
  }

  init() {
    // Charger la capacité depuis les données de tarification
    this.loadCapacite();
    
    // Mettre à jour l'affichage initial
    this.updateDisplay();
    
    // Ajouter les écouteurs d'événements
    this.setupEventListeners();
    
    // Exposer la fonction globalement pour compatibilité
    window.e = () => this.updateDisplay();
  }

  loadCapacite() {
    try {
      const pricingElement = document.querySelector('[data-json-tarifs-line]') || 
                            document.querySelector('[data-json-tarifs]');
      
      if (pricingElement) {
        const attr = pricingElement.hasAttribute('data-json-tarifs-line') 
          ? 'data-json-tarifs-line' 
          : 'data-json-tarifs';
        
        const pricingData = JSON.parse(pricingElement.getAttribute(attr));
        this.capaciteMax = pricingData.capacity || 8;
      }
    } catch (error) {
      console.error('Erreur lors du chargement de la capacité:', error);
    }
  }

  updateDisplay() {
    // Mettre à jour les compteurs (desktop et mobile)
    this.updateElement('chiffres-adultes', this.adultes);
    this.updateElement('chiffres-adultes-mobile', this.adultes);
    this.updateElement('chiffres-enfants', this.enfants);
    this.updateElement('chiffres-enfants-mobile', this.enfants);
    this.updateElement('chiffres-bebes', this.bebes);
    this.updateElement('chiffres-bebes-mobile', this.bebes);
    
    // Mettre à jour le texte des voyageurs
    const totalVoyageurs = this.adultes + this.enfants;
    let texteVoyageurs = totalVoyageurs === 1 ? '1 voyageur' : `${totalVoyageurs} voyageurs`;
    
    if (this.bebes > 0) {
      texteVoyageurs += `, ${this.bebes}` + (this.bebes === 1 ? ' bébé' : ' bébés');
    }
    
    this.updateElement('voyageurs-texte', texteVoyageurs);
    this.updateElement('voyageurs-texte-mobile', texteVoyageurs);
    
    // Mettre à jour l'opacité des boutons
    this.updateButtonOpacity('adultes-moins', this.adultes <= 1 ? '0.2' : '1');
    this.updateButtonOpacity('adultes-moins-mobile', this.adultes <= 1 ? '0.2' : '1');
    this.updateButtonOpacity('enfants-moins', this.enfants <= 0 ? '0.2' : '1');
    this.updateButtonOpacity('enfants-moins-mobile', this.enfants <= 0 ? '0.2' : '1');
    this.updateButtonOpacity('bebes-moins', this.bebes <= 0 ? '0.2' : '1');
    this.updateButtonOpacity('bebes-moins-mobile', this.bebes <= 0 ? '0.2' : '1');
    
    const capaciteAtteinte = (this.adultes + this.enfants) >= this.capaciteMax;
    this.updateButtonOpacity('adultes-plus', capaciteAtteinte ? '0.2' : '1');
    this.updateButtonOpacity('adultes-plus-mobile', capaciteAtteinte ? '0.2' : '1');
    this.updateButtonOpacity('enfants-plus', capaciteAtteinte ? '0.2' : '1');
    this.updateButtonOpacity('enfants-plus-mobile', capaciteAtteinte ? '0.2' : '1');
    this.updateButtonOpacity('bebes-plus', '1');
    this.updateButtonOpacity('bebes-plus-mobile', '1');
    
    // Mettre à jour les variables globales pour compatibilité
    window.a = this.adultes;
    window.b = this.enfants;
    window.c = this.bebes;
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

  updatePrices() {
    if (window.priceCalculator && window.priceCalculator.calculateAndDisplayPrices) {
      // Mettre à jour la capacité dans les données
      if (window.priceCalculator.pricingData) {
        window.priceCalculator.pricingData.capacity = this.adultes + this.enfants;
      }
      
      // Recalculer les prix si des dates sont sélectionnées
      if (window.priceCalculator.startDate && window.priceCalculator.endDate) {
        window.priceCalculator.calculateAndDisplayPrices();
      }
    }
  }

  setupEventListeners() {
    // Helper pour ajouter un écouteur avec curseur pointer
    const addClickHandler = (id, handler) => {
      const element = document.getElementById(id);
      if (element) {
        element.style.cursor = 'pointer';
        element.addEventListener('click', handler);
      }
    };
    
    // Adultes
    addClickHandler('adultes-moins', () => {
      if (this.adultes > 1) {
        this.adultes--;
        this.updateDisplay();
        this.updatePrices();
      }
    });
    
    addClickHandler('adultes-plus', () => {
      if (this.adultes + this.enfants < this.capaciteMax) {
        this.adultes++;
        this.updateDisplay();
        this.updatePrices();
      }
    });
    
    // Enfants
    addClickHandler('enfants-moins', () => {
      if (this.enfants > 0) {
        this.enfants--;
        this.updateDisplay();
        this.updatePrices();
      }
    });
    
    addClickHandler('enfants-plus', () => {
      if (this.adultes + this.enfants < this.capaciteMax) {
        this.enfants++;
        this.updateDisplay();
        this.updatePrices();
      }
    });
    
    // Bébés
    addClickHandler('bebes-moins', () => {
      if (this.bebes > 0) {
        this.bebes--;
        this.updateDisplay();
        this.updatePrices();
      }
    });
    
    addClickHandler('bebes-plus', () => {
      this.bebes++;
      this.updateDisplay();
      this.updatePrices();
    });
    
    // Version mobile
    addClickHandler('adultes-moins-mobile', () => {
      if (this.adultes > 1) {
        this.adultes--;
        this.updateDisplay();
        this.updatePrices();
      }
    });
    
    addClickHandler('adultes-plus-mobile', () => {
      if (this.adultes + this.enfants < this.capaciteMax) {
        this.adultes++;
        this.updateDisplay();
        this.updatePrices();
      }
    });
    
    addClickHandler('enfants-moins-mobile', () => {
      if (this.enfants > 0) {
        this.enfants--;
        this.updateDisplay();
        this.updatePrices();
      }
    });
    
    addClickHandler('enfants-plus-mobile', () => {
      if (this.adultes + this.enfants < this.capaciteMax) {
        this.enfants++;
        this.updateDisplay();
        this.updatePrices();
      }
    });
    
    addClickHandler('bebes-moins-mobile', () => {
      if (this.bebes > 0) {
        this.bebes--;
        this.updateDisplay();
        this.updatePrices();
      }
    });
    
    addClickHandler('bebes-plus-mobile', () => {
      this.bebes++;
      this.updateDisplay();
      this.updatePrices();
    });
  }

  // Méthodes publiques pour mise à jour externe
  setAdultes(value) {
    this.adultes = Math.max(1, value);
    this.updateDisplay();
  }

  setEnfants(value) {
    this.enfants = Math.max(0, value);
    this.updateDisplay();
  }

  setBebes(value) {
    this.bebes = Math.max(0, value);
    this.updateDisplay();
  }

  getVoyageurs() {
    return {
      adultes: this.adultes,
      enfants: this.enfants,
      bebes: this.bebes,
      total: this.adultes + this.enfants
    };
  }
}

// Initialiser automatiquement
document.addEventListener('DOMContentLoaded', function() {
  window.voyageursManager = new VoyageursManager();
});
