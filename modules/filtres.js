// Gestionnaire complet des filtres
class FiltersManager {
  constructor() {
    this.equipementCheckboxes = document.querySelectorAll('#filtre-equipements .w-checkbox');
    this.optionAccueilCheckboxes = document.querySelectorAll('#filtre-option-accueil .w-checkbox');
    this.modeLocationCheckboxes = document.querySelectorAll('#filtre-mode-location .w-checkbox');
    
    // Éléments de l'interface
    this.elements = {
      // Équipements
      texteFiltreEquipements: document.querySelector('#text-filtre-equipements'),
      boutonFiltreEquipements: document.querySelector('#button-filtre-equipements'),
      boutonValiderEquipements: document.querySelector('#bouton-valider-equipements'),
      boutonEffacerEquipements: document.querySelector('#bouton-effacer-equipements'),
      
      // Prix
      textePrixFiltre: document.querySelector('#text-prix-filtre'),
      texteFiltrePrice: document.querySelector('#text-filtre-tarif'),
      texteFiltrePrice_mobile: document.querySelector('#text-filtre-tarif-mobile'),
      boutonFiltrePrice: document.querySelector('#button-filtre-tarif'),
      boutonValiderTarif: document.querySelector('#bouton-valider-tarif'),
      boutonEffacerTarif: document.querySelector('#bouton-effacer-tarif'),
      
      // Préférences
      texteFiltrePreferences: document.querySelector('#text-filtre-preferences'),
      boutonFiltrePreferences: document.querySelector('#button-filtre-preferences'),
      boutonValiderPreferences: document.querySelector('#bouton-valider-preferences'),
      boutonEffacerPreferences: document.querySelector('#bouton-effacer-preferences'),
      
      // Voyageurs
      texteFiltreVoyageurs: document.querySelector('#text-filtre-voyageurs'),
      boutonFiltreVoyageurs: document.querySelector('#button-filtre-voyageurs'),
      boutonValiderVoyageurs: document.querySelector('#bouton-valider-voyageurs'),
      boutonEffacerVoyageurs: document.querySelector('#bouton-effacer-voyageurs')
    };
    
    // État des filtres
    this.state = {
      equipements: [],
      optionsAccueil: [],
      modesLocation: [],
      prixMax: null,
      adultes: 1,
      enfants: 0,
      capaciteMax: 8
    };
    
    this.init();
  }

  init() {
    console.log('🔧 Initialisation FiltersManager...');
    this.loadCapacityFromData();
    this.setupEventListeners();
    this.updateAllUI();
    console.log('✅ FiltersManager initialisé');
    
    // Export global
    window.filtersManager = this;
  }

  // ================================
  // CONFIGURATION INITIALE
  // ================================

  loadCapacityFromData() {
    try {
      let element = document.querySelector("[data-json-tarifs-line]") || document.querySelector("[data-json-tarifs]");
      if (element) {
        const data = JSON.parse(element.getAttribute(element.hasAttribute("data-json-tarifs-line") ? "data-json-tarifs-line" : "data-json-tarifs"));
        this.state.capaciteMax = data.capacity || 8;
      }
    } catch (e) {
      console.log("Capacité par défaut utilisée");
    }
  }

  // ================================
  // GESTION DES ÉVÉNEMENTS
  // ================================

  setupEventListeners() {
    // Équipements
    this.equipementCheckboxes.forEach(container => {
      const checkbox = container.querySelector('input[type="checkbox"]');
      if (checkbox) {
        checkbox.addEventListener('change', () => this.updateEquipementsFilter());
      }
    });

    // Options et modes
    this.optionAccueilCheckboxes.forEach(container => {
      const checkbox = container.querySelector('input[type="checkbox"]');
      if (checkbox) {
        checkbox.addEventListener('change', () => this.updatePreferencesFilter());
      }
    });

    this.modeLocationCheckboxes.forEach(container => {
      const checkbox = container.querySelector('input[type="checkbox"]');
      if (checkbox) {
        checkbox.addEventListener('change', () => this.updatePreferencesFilter());
      }
    });

    // Boutons d'action
    this.setupActionButtons();
    
    // Compteurs voyageurs
    this.setupTravelersCounters();
    
    // Boutons mobiles
    this.setupMobileButtons();
  }

  setupActionButtons() {
    // Équipements
    if (this.elements.boutonValiderEquipements) {
      this.elements.boutonValiderEquipements.addEventListener('click', () => {
        this.triggerPropertyManagerFilter();
        this.closeDropdown(this.elements.boutonFiltreEquipements);
      });
    }

    if (this.elements.boutonEffacerEquipements) {
      this.elements.boutonEffacerEquipements.addEventListener('click', () => {
        this.clearEquipementsFilter();
        this.triggerPropertyManagerFilter();
      });
    }

    // Prix
    if (this.elements.boutonValiderTarif) {
      this.elements.boutonValiderTarif.addEventListener('click', (e) => {
        e.preventDefault();
        this.updatePriceFromSlider(false); // desktop
        this.triggerPropertyManagerFilter();
      });
    }

    if (this.elements.boutonEffacerTarif) {
      this.elements.boutonEffacerTarif.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.resetPriceFilter();
        this.triggerPropertyManagerFilter();
      });
    }

    // Préférences
    if (this.elements.boutonValiderPreferences) {
      this.elements.boutonValiderPreferences.addEventListener('click', () => {
        this.triggerPropertyManagerFilter();
        this.closeDropdown(this.elements.boutonFiltrePreferences);
      });
    }

    if (this.elements.boutonEffacerPreferences) {
      this.elements.boutonEffacerPreferences.addEventListener('click', () => {
        this.clearPreferencesFilter();
        this.triggerPropertyManagerFilter();
      });
    }

    // Voyageurs
    if (this.elements.boutonValiderVoyageurs) {
      this.elements.boutonValiderVoyageurs.addEventListener('click', () => {
        this.updateVoyageursFilter();
        this.triggerPropertyManagerFilter();
        this.updatePricesIfDatesSelected();
        this.closeDropdown(this.elements.boutonFiltreVoyageurs);
      });
    }

    if (this.elements.boutonEffacerVoyageurs) {
      this.elements.boutonEffacerVoyageurs.addEventListener('click', () => {
        this.resetVoyageursFilter();
        this.triggerPropertyManagerFilter();
        this.updatePricesIfDatesSelected();
      });
    }
  }

  setupTravelersCounters() {
    // Adultes
    this.addClickListener(['adultes-moins', 'adultes-moins-mobile'], () => this.decrementAdults());
    this.addClickListener(['adultes-plus', 'adultes-plus-mobile'], () => this.incrementAdults());
    
    // Enfants
    this.addClickListener(['enfants-moins', 'enfants-moins-mobile'], () => this.decrementChildren());
    this.addClickListener(['enfants-plus', 'enfants-plus-mobile'], () => this.incrementChildren());
  }

  setupMobileButtons() {
    // Bouton valider mobile
    document.body.addEventListener('click', (e) => {
      if (e.target.id === 'bouton-valider-mobile') {
        e.preventDefault();
        this.updatePriceFromSlider(true); // mobile
        this.updateVoyageursFilter();
        this.triggerPropertyManagerFilter();
        this.closeMobilePopup();
      }
      
      if (e.target.id === 'bouton-effacer-mobile') {
        e.preventDefault();
        this.clearAllFilters();
        this.triggerPropertyManagerFilter();
      }
    });
  }

  // ================================
  // GESTION DES ÉQUIPEMENTS
  // ================================

  updateEquipementsFilter() {
    let nombreCochees = 0;
    this.state.equipements = [];
    
    this.equipementCheckboxes.forEach(container => {
      const checkbox = container.querySelector('input[type="checkbox"]');
      const label = container.querySelector('.w-form-label');
      
      if (checkbox && label && checkbox.checked) {
        nombreCochees++;
        this.state.equipements.push(label.textContent.trim());
      }
    });

    this.updateEquipementsButton(nombreCochees);
    return nombreCochees;
  }

  updateEquipementsButton(nombreCochees) {
    if (this.elements.texteFiltreEquipements) {
      if (nombreCochees === 0) {
        this.elements.texteFiltreEquipements.textContent = "Équipements";
        this.resetButtonStyle(this.elements.boutonFiltreEquipements);
      } else {
        this.elements.texteFiltreEquipements.textContent = `${nombreCochees} équipement${nombreCochees > 1 ? 's' : ''}`;
        this.setActiveButtonStyle(this.elements.boutonFiltreEquipements);
      }
    }
  }

  clearEquipementsFilter() {
    this.equipementCheckboxes.forEach(container => {
      const checkbox = container.querySelector('input[type="checkbox"]');
      if (checkbox) {
        checkbox.checked = false;
        this.triggerCheckboxChange(checkbox);
      }
    });
    
    this.state.equipements = [];
    this.updateEquipementsFilter();
  }

  // ================================
  // GESTION DES PRÉFÉRENCES
  // ================================

  updatePreferencesFilter() {
    this.state.optionsAccueil = [];
    this.state.modesLocation = [];
    
    this.optionAccueilCheckboxes.forEach(container => {
      const checkbox = container.querySelector('input[type="checkbox"]');
      const label = container.querySelector('.w-form-label');
      
      if (checkbox && label && checkbox.checked) {
        this.state.optionsAccueil.push(label.textContent.trim());
      }
    });
    
    this.modeLocationCheckboxes.forEach(container => {
      const checkbox = container.querySelector('input[type="checkbox"]');
      const label = container.querySelector('.w-form-label');
      
      if (checkbox && label && checkbox.checked) {
        this.state.modesLocation.push(label.textContent.trim());
      }
    });

    const totalPreferences = this.state.optionsAccueil.length + this.state.modesLocation.length;
    this.updatePreferencesButton(totalPreferences);
    return totalPreferences;
  }

  updatePreferencesButton(totalPreferences) {
    if (this.elements.texteFiltrePreferences) {
      if (totalPreferences === 0) {
        this.elements.texteFiltrePreferences.textContent = "Préférences";
        this.resetButtonStyle(this.elements.boutonFiltrePreferences);
      } else {
        this.elements.texteFiltrePreferences.textContent = `${totalPreferences} préférence${totalPreferences > 1 ? 's' : ''}`;
        this.setActiveButtonStyle(this.elements.boutonFiltrePreferences);
      }
    }
  }

  clearPreferencesFilter() {
    [...this.optionAccueilCheckboxes, ...this.modeLocationCheckboxes].forEach(container => {
      const checkbox = container.querySelector('input[type="checkbox"]');
      if (checkbox) {
        checkbox.checked = false;
        this.triggerCheckboxChange(checkbox);
      }
    });
    
    this.state.optionsAccueil = [];
    this.state.modesLocation = [];
    this.updatePreferencesFilter();
  }

  // ================================
  // GESTION DU PRIX
  // ================================

  updatePriceFromSlider(isMobile) {
    const sliderSelector = isMobile 
      ? '.bloc-slider.mobile-slider[fs-rangeslider-max="500"]'
      : '.bloc-slider:not(.mobile-slider)[fs-rangeslider-max="500"]';
    
    const slider = document.querySelector(sliderSelector);
    if (slider) {
      const displayElement = slider.querySelector('[fs-rangeslider-element="display-value"]');
      if (displayElement) {
        const match = displayElement.textContent.match(/(\d+)/);
        if (match) {
          const prix = parseInt(match[1], 10);
          this.state.prixMax = prix;
          this.updatePriceButton(prix);
          
          // Mettre à jour le texte mobile si c'est mobile
          if (isMobile && this.elements.texteFiltrePrice_mobile) {
            this.elements.texteFiltrePrice_mobile.textContent = `${prix}€ / nuit maximum`;
          }
        }
      }
    }
  }

  updatePriceButton(prix) {
    if (prix !== undefined) {
      this.state.prixMax = prix;
      if (this.elements.texteFiltrePrice) {
        this.elements.texteFiltrePrice.textContent = `${prix}€ / nuit maximum`;
        this.setActiveButtonStyle(this.elements.boutonFiltrePrice);
      }
    }
  }

  resetPriceFilter() {
    this.state.prixMax = null;
    
    if (this.elements.texteFiltrePrice) {
      this.elements.texteFiltrePrice.textContent = "Tarif par nuitée";
      this.resetButtonStyle(this.elements.boutonFiltrePrice);
    }
    
    if (this.elements.texteFiltrePrice_mobile) {
      this.elements.texteFiltrePrice_mobile.textContent = "Tarif par nuitée";
    }
    
    this.resetSliders();
    
    // Nettoyer le filtre dans PropertyManager
    if (window.propertyManager && window.propertyManager.currentFilters) {
      delete window.propertyManager.currentFilters.price_max;
    }
  }

  resetSliders() {
    try {
      const isMobile = window.innerWidth < 768;
      const sliderSelector = isMobile 
        ? '.bloc-slider.mobile-slider[fs-rangeslider-max="500"]'
        : '.bloc-slider:not(.mobile-slider)[fs-rangeslider-max="500"]';
      
      const slider = document.querySelector(sliderSelector);
      if (slider) {
        // Réinitialiser les éléments du slider
        const fillLine = slider.querySelector('[fs-rangeslider-element="fill"]');
        if (fillLine) fillLine.style.width = '100%';
        
        const handle = slider.querySelector('[fs-rangeslider-element="handle"]');
        if (handle) handle.style.left = '100%';
        
        const display = slider.querySelector('[fs-rangeslider-element="display-value"]');
        if (display) display.textContent = '500';
        
        const input = slider.querySelector('input[fs-rangeslider-element="input"]');
        if (input) {
          input.value = 500;
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
    } catch (err) {
      console.error('Erreur réinitialisation slider:', err);
    }
  }

  // ================================
  // GESTION DES VOYAGEURS
  // ================================

  incrementAdults() {
    if (this.state.adultes + this.state.enfants < this.state.capaciteMax) {
      this.state.adultes++;
      this.updateTravelersUI();
    }
  }

  decrementAdults() {
    if (this.state.adultes > 1) {
      this.state.adultes--;
      this.updateTravelersUI();
    }
  }

  incrementChildren() {
    if (this.state.adultes + this.state.enfants < this.state.capaciteMax) {
      this.state.enfants++;
      this.updateTravelersUI();
    }
  }

  decrementChildren() {
    if (this.state.enfants > 0) {
      this.state.enfants--;
      this.updateTravelersUI();
    }
  }

  updateTravelersUI() {
    // Mettre à jour les chiffres
    ['chiffres-adultes', 'chiffres-adultes-mobile'].forEach(id => {
      const element = document.getElementById(id);
      if (element) element.textContent = this.state.adultes;
    });

    ['chiffres-enfants', 'chiffres-enfants-mobile'].forEach(id => {
      const element = document.getElementById(id);
      if (element) element.textContent = this.state.enfants;
    });

    // Mettre à jour les opacités des boutons
    this.updateButtonOpacities();
  }

  updateButtonOpacities() {
    ['adultes-moins', 'adultes-moins-mobile'].forEach(id => {
      const element = document.getElementById(id);
      if (element) element.style.opacity = this.state.adultes <= 1 ? "0.2" : "1";
    });

    ['enfants-moins', 'enfants-moins-mobile'].forEach(id => {
      const element = document.getElementById(id);
      if (element) element.style.opacity = this.state.enfants <= 0 ? "0.2" : "1";
    });

    const isAtCapacity = this.state.adultes + this.state.enfants >= this.state.capaciteMax;
    ['adultes-plus', 'adultes-plus-mobile'].forEach(id => {
      const element = document.getElementById(id);
      if (element) element.style.opacity = isAtCapacity ? "0.2" : "1";
    });

    ['enfants-plus', 'enfants-plus-mobile'].forEach(id => {
      const element = document.getElementById(id);
      if (element) element.style.opacity = isAtCapacity ? "0.2" : "1";
    });
  }

  updateVoyageursFilter() {
    const totalVoyageurs = this.state.adultes + this.state.enfants;
    
    if (this.elements.texteFiltreVoyageurs) {
      if (totalVoyageurs === 1) {
        this.elements.texteFiltreVoyageurs.textContent = "1 voyageur";
      } else {
        this.elements.texteFiltreVoyageurs.textContent = `${totalVoyageurs} voyageurs`;
      }
      this.setActiveButtonStyle(this.elements.boutonFiltreVoyageurs);
    }
  }

  resetVoyageursFilter() {
    this.state.adultes = 1;
    this.state.enfants = 0;
    this.updateTravelersUI();
    
    if (this.elements.texteFiltreVoyageurs) {
      this.elements.texteFiltreVoyageurs.textContent = "Voyageurs";
      this.resetButtonStyle(this.elements.boutonFiltreVoyageurs);
    }
  }

  // ================================
  // ACTIONS GLOBALES
  // ================================

  clearAllFilters() {
    this.clearEquipementsFilter();
    this.clearPreferencesFilter();
    this.resetPriceFilter();
    this.resetVoyageursFilter();
  }

  updateAllUI() {
    this.updateEquipementsFilter();
    this.updatePreferencesFilter();
    this.updateTravelersUI();
  }

  // ================================
  // INTÉGRATION AVEC PROPERTYMANAGER
  // ================================

  triggerPropertyManagerFilter() {
    if (window.propertyManager) {
      // Mettre à jour les filtres de prix si défini
      if (this.state.prixMax !== null) {
        window.propertyManager.currentFilters.price_max = this.state.prixMax;
      }
      window.propertyManager.applyFilters();
    } else {
      console.warn("PropertyManager non initialisé...");
    }
  }

  updatePricesIfDatesSelected() {
    if (window.propertyManager && window.propertyManager.startDate && window.propertyManager.endDate) {
      window.propertyManager.updatePricesForDates(
        window.propertyManager.startDate,
        window.propertyManager.endDate
      );
    }
  }

  // ================================
  // MÉTHODES UTILITAIRES
  // ================================

  addClickListener(elementIds, callback) {
    const ids = Array.isArray(elementIds) ? elementIds : [elementIds];
    ids.forEach(id => {
      const element = document.getElementById(id);
      if (element) {
        element.style.cursor = "pointer";
        element.addEventListener("click", callback);
      }
    });
  }

  triggerCheckboxChange(checkbox) {
    const event = new Event('change', { bubbles: true });
    checkbox.dispatchEvent(event);
    
    const webflowCheckbox = checkbox.closest('.w-checkbox').querySelector('.w-checkbox-input');
    if (webflowCheckbox) {
      webflowCheckbox.classList.remove('w--redirected-checked');
    }
  }

  setActiveButtonStyle(button) {
    if (button) {
      button.style.fontWeight = '600';
      button.style.color = '#272A2B';
      button.style.border = '1px solid #272A2B';
    }
  }

  resetButtonStyle(button) {
    if (button) {
      button.style.fontWeight = '';
      button.style.color = '';
      button.style.border = '';
    }
  }

  closeDropdown(button) {
    if (button) {
      button.click();
    }
  }

  closeMobilePopup() {
    const popup = document.querySelector('.pop-filtres-mobile');
    if (popup) {
      popup.style.display = 'none';
    }
  }

  // ================================
  // MÉTHODES PUBLIQUES
  // ================================

  getFiltersState() {
    return { ...this.state };
  }

  setTravelersCount(adults, children) {
    this.state.adultes = adults;
    this.state.enfants = children;
    this.updateTravelersUI();
  }
}

// Export global
window.FiltersManager = FiltersManager;
