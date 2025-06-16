// Gestionnaire complet des filtres - VERSION CORRIGÉE avec validation différée
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
    
    // 🔧 NOUVEAU : État avec validation différée
    this.state = {
      // État VALIDÉ (appliqué aux filtres)
      equipements: [],
      optionsAccueil: [],
      modesLocation: [],
      prixMax: null,
      adultes: 1,
      enfants: 0,
      capaciteMax: 10
    };
    
    // 🔧 NOUVEAU : État TEMPORAIRE (dans les modals, pas encore validé)
    this.tempState = {
      equipements: [],
      optionsAccueil: [],
      modesLocation: []
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
    this.state.capaciteMax = 10;
  }

  // ================================
  // GESTION DES ÉVÉNEMENTS
  // ================================

  setupEventListeners() {
    // 🔧 MODIFIÉ : Les checkboxes ne mettent plus à jour l'affichage immédiatement
    this.equipementCheckboxes.forEach(container => {
      const checkbox = container.querySelector('input[type="checkbox"]');
      if (checkbox) {
        // 🔧 NOUVEAU : Seulement mettre à jour l'état temporaire
        checkbox.addEventListener('change', () => this.updateTempEquipementsState());
      }
    });

    // Options et modes
    this.optionAccueilCheckboxes.forEach(container => {
      const checkbox = container.querySelector('input[type="checkbox"]');
      if (checkbox) {
        // 🔧 NOUVEAU : Seulement mettre à jour l'état temporaire
        checkbox.addEventListener('change', () => this.updateTempPreferencesState());
      }
    });

    this.modeLocationCheckboxes.forEach(container => {
      const checkbox = container.querySelector('input[type="checkbox"]');
      if (checkbox) {
        // 🔧 NOUVEAU : Seulement mettre à jour l'état temporaire
        checkbox.addEventListener('change', () => this.updateTempPreferencesState());
      }
    });

    // Boutons d'action
    this.setupActionButtons();
    
    // Compteurs voyageurs
    this.setupTravelersCounters();
    
    // Boutons mobiles
    this.setupMobileButtons();
    
    // 🔧 NOUVEAU : Gestion fermeture des modals
    this.setupModalCloseHandlers();
  }

  // 🔧 NOUVELLE MÉTHODE : Gestion fermeture modals
  setupModalCloseHandlers() {
    // Détecter fermeture des dropdowns sans validation
    document.addEventListener('click', (e) => {
      // Si clic en dehors des modals de filtres
      const isClickInsideEquipements = e.target.closest('#filtre-equipements') || 
                                      e.target.closest('#button-filtre-equipements');
      const isClickInsidePreferences = e.target.closest('#filtre-option-accueil') || 
                                      e.target.closest('#filtre-mode-location') ||
                                      e.target.closest('#button-filtre-preferences');
      
      if (!isClickInsideEquipements) {
        this.resetTempEquipementsToValidated();
      }
      
      if (!isClickInsidePreferences) {
        this.resetTempPreferencesToValidated();
      }
    });
  }

  setupActionButtons() {
    // 🔧 MODIFIÉ : Équipements - Validation différée
    if (this.elements.boutonValiderEquipements) {
      this.elements.boutonValiderEquipements.addEventListener('click', () => {
        this.validateEquipementsFilter(); // 🔧 NOUVELLE méthode
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

    // 🔧 MODIFIÉ : Préférences - Validation différée
    if (this.elements.boutonValiderPreferences) {
      this.elements.boutonValiderPreferences.addEventListener('click', () => {
        this.validatePreferencesFilter(); // 🔧 NOUVELLE méthode
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

    // Prix - utiliser event delegation pour capturer tous les clics
    document.body.addEventListener('click', (e) => {
      // Bouton valider tarif
      const targetValider = e.target.closest('#bouton-valider-tarif');
      if (targetValider) {
        e.preventDefault();
        this.updatePriceFromSlider(false); // desktop
        this.triggerPropertyManagerFilter();
        return;
      }
      
      // Bouton effacer tarif
      if (e.target.id === 'bouton-effacer-tarif' || e.target.closest('#bouton-effacer-tarif')) {
        e.preventDefault();
        e.stopPropagation();
        this.resetPriceFilter();
        this.triggerPropertyManagerFilter();
        return false;
      }
    });

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
  // 🔧 NOUVELLES MÉTHODES : GESTION ÉTAT TEMPORAIRE
  // ================================

  updateTempEquipementsState() {
    this.tempState.equipements = [];
    
    this.equipementCheckboxes.forEach(container => {
      const checkbox = container.querySelector('input[type="checkbox"]');
      const label = container.querySelector('.w-form-label');
      
      if (checkbox && label && checkbox.checked) {
        this.tempState.equipements.push(label.textContent.trim());
      }
    });
    
    console.log('🔧 État temporaire équipements:', this.tempState.equipements);
    // 🔧 IMPORTANT : NE PAS mettre à jour l'affichage du bouton ici !
  }

  updateTempPreferencesState() {
    this.tempState.optionsAccueil = [];
    this.tempState.modesLocation = [];
    
    this.optionAccueilCheckboxes.forEach(container => {
      const checkbox = container.querySelector('input[type="checkbox"]');
      const label = container.querySelector('.w-form-label');
      
      if (checkbox && label && checkbox.checked) {
        this.tempState.optionsAccueil.push(label.textContent.trim());
      }
    });
    
    this.modeLocationCheckboxes.forEach(container => {
      const checkbox = container.querySelector('input[type="checkbox"]');
      const label = container.querySelector('.w-form-label');
      
      if (checkbox && label && checkbox.checked) {
        this.tempState.modesLocation.push(label.textContent.trim());
      }
    });
    
    console.log('🔧 État temporaire préférences:', this.tempState.optionsAccueil, this.tempState.modesLocation);
    // 🔧 IMPORTANT : NE PAS mettre à jour l'affichage du bouton ici !
  }

  // 🔧 NOUVELLE MÉTHODE : Valider les équipements
  validateEquipementsFilter() {
    // Copier l'état temporaire vers l'état validé
    this.state.equipements = [...this.tempState.equipements];
    
    // MAINTENANT mettre à jour l'affichage
    this.updateEquipementsButton(this.state.equipements.length);
    
    console.log('✅ Équipements validés:', this.state.equipements);
  }

  // 🔧 NOUVELLE MÉTHODE : Valider les préférences
  validatePreferencesFilter() {
    // Copier l'état temporaire vers l'état validé
    this.state.optionsAccueil = [...this.tempState.optionsAccueil];
    this.state.modesLocation = [...this.tempState.modesLocation];
    
    // MAINTENANT mettre à jour l'affichage
    const totalPreferences = this.state.optionsAccueil.length + this.state.modesLocation.length;
    this.updatePreferencesButton(totalPreferences);
    
    console.log('✅ Préférences validées:', this.state.optionsAccueil, this.state.modesLocation);
  }

  // 🔧 NOUVELLE MÉTHODE : Reset temp vers validé (fermeture sans validation)
  resetTempEquipementsToValidated() {
    // Restaurer les checkboxes selon l'état validé
    this.equipementCheckboxes.forEach(container => {
      const checkbox = container.querySelector('input[type="checkbox"]');
      const label = container.querySelector('.w-form-label');
      
      if (checkbox && label) {
        const labelText = label.textContent.trim();
        checkbox.checked = this.state.equipements.includes(labelText);
        this.triggerCheckboxChange(checkbox);
      }
    });
    
    // Mettre à jour l'état temporaire
    this.tempState.equipements = [...this.state.equipements];
    
    console.log('🔄 État temporaire équipements restauré vers état validé');
  }

  resetTempPreferencesToValidated() {
    // Restaurer les checkboxes selon l'état validé
    [...this.optionAccueilCheckboxes, ...this.modeLocationCheckboxes].forEach(container => {
      const checkbox = container.querySelector('input[type="checkbox"]');
      const label = container.querySelector('.w-form-label');
      
      if (checkbox && label) {
        const labelText = label.textContent.trim();
        const isInValidatedState = this.state.optionsAccueil.includes(labelText) || 
                                  this.state.modesLocation.includes(labelText);
        checkbox.checked = isInValidatedState;
        this.triggerCheckboxChange(checkbox);
      }
    });
    
    // Mettre à jour l'état temporaire
    this.tempState.optionsAccueil = [...this.state.optionsAccueil];
    this.tempState.modesLocation = [...this.state.modesLocation];
    
    console.log('🔄 État temporaire préférences restauré vers état validé');
  }

  // ================================
  // GESTION DES ÉQUIPEMENTS (modifiée)
  // ================================

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
    
    // 🔧 MODIFIÉ : Reset des deux états
    this.state.equipements = [];
    this.tempState.equipements = [];
    this.updateEquipementsButton(0);
  }

  // ================================
  // GESTION DES PRÉFÉRENCES (modifiée)
  // ================================

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
    
    // 🔧 MODIFIÉ : Reset des deux états
    this.state.optionsAccueil = [];
    this.state.modesLocation = [];
    this.tempState.optionsAccueil = [];
    this.tempState.modesLocation = [];
    this.updatePreferencesButton(0);
  }

  // ================================
  // GESTION DU PRIX (inchangée)
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
  // GESTION DES VOYAGEURS (inchangée)
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
  // ACTIONS GLOBALES (modifiées)
  // ================================

  clearAllFilters() {
    this.clearEquipementsFilter();
    this.clearPreferencesFilter();
    this.resetPriceFilter();
    this.resetVoyageursFilter();
  }

  updateAllUI() {
    // 🔧 MODIFIÉ : Mettre à jour selon l'état VALIDÉ seulement
    this.updateEquipementsButton(this.state.equipements.length);
    this.updatePreferencesButton(this.state.optionsAccueil.length + this.state.modesLocation.length);
    this.updateTravelersUI();
  }

  // ================================
  // INTÉGRATION AVEC PROPERTYMANAGER (inchangée)
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

  // 🔧 NOUVELLE MÉTHODE : Debug pour voir les états
  debugStates() {
    return {
      validatedState: { ...this.state },
      tempState: { ...this.tempState },
      equipementsButtonText: this.elements.texteFiltreEquipements?.textContent || '',
      preferencesButtonText: this.elements.texteFiltrePreferences?.textContent || ''
    };
  }
}

// Export global
window.FiltersManager = FiltersManager;
