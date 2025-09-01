// Gestionnaire complet des filtres - VERSION CORRIGÉE Vbiz
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
    
    // État des filtres CONFIRMÉS (après validation)
    this.state = {
      equipements: [],
      optionsAccueil: [],
      modesLocation: [],
      prixMax: null,
      adultes: 1,
      enfants: 0,
      capaciteMax: 10
    };
    
    // État temporaire (pendant la sélection)
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
    this.setupDropdownListeners();
    this.updateAllUI();
    this.updateMobileFilterIndicator();
    console.log('✅ FiltersManager initialisé');
    
    // Export global
    window.filtersManager = this;
  }

  updateMobileFilterIndicator() {
    // Compter les filtres actifs individuellement (sans dates ni localisation)
    let count = 0;
    
    // Compter CHAQUE équipement sélectionné
    count += this.state.equipements.length;
    
    // Compter CHAQUE option d'accueil sélectionnée
    count += this.state.optionsAccueil.length;
    
    // Compter CHAQUE mode de location sélectionné
    count += this.state.modesLocation.length;
    
    // Compter prix max comme 1 filtre (1 si défini)
    if (this.state.prixMax !== null) {
      count++;
    }
    
    // Compter voyageurs comme 1 filtre (1 si différent du défaut)
    if (this.state.adultes !== 1 || this.state.enfants !== 0) {
      count++;
    }
    
    // Mettre à jour l'interface mobile
    const numberFilter = document.querySelector('.number-filter');
    const buttonFilterMobile = document.querySelector('.button-filter-mobile');
    const textFiltre = document.querySelector('.text-filtre');
    
    if (count > 0) {
      // Afficher le bloc number-filter
      if (numberFilter) {
        numberFilter.style.display = 'flex'; // ou 'block' selon votre layout
      }
      
      // Changer la couleur de la bordure du bouton
      if (buttonFilterMobile) {
        buttonFilterMobile.style.borderColor = '#235B59';
        buttonFilterMobile.style.borderWidth = '1px';
        buttonFilterMobile.style.borderStyle = 'solid';
      }
      
      // Mettre à jour le texte avec le nombre total de filtres
      if (textFiltre) {
        textFiltre.textContent = count.toString();
      }
    } else {
      // Masquer si aucun filtre
      if (numberFilter) {
        numberFilter.style.display = 'none';
      }
      
      if (buttonFilterMobile) {
        // Réinitialiser le style du bouton
        buttonFilterMobile.style.borderColor = '';
        buttonFilterMobile.style.borderWidth = '';
        buttonFilterMobile.style.borderStyle = '';
      }
      
      if (textFiltre) {
        textFiltre.textContent = '0';
      }
    }
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
    // Équipements - Mise à jour de l'état temporaire seulement
    this.equipementCheckboxes.forEach(container => {
      const checkbox = container.querySelector('input[type="checkbox"]');
      if (checkbox) {
        checkbox.addEventListener('change', () => {
          this.updateTempEquipements();
        });
      }
    });

    // Options et modes - Mise à jour de l'état temporaire seulement
    this.optionAccueilCheckboxes.forEach(container => {
      const checkbox = container.querySelector('input[type="checkbox"]');
      if (checkbox) {
        checkbox.addEventListener('change', () => {
          this.updateTempPreferences();
        });
      }
    });

    this.modeLocationCheckboxes.forEach(container => {
      const checkbox = container.querySelector('input[type="checkbox"]');
      if (checkbox) {
        checkbox.addEventListener('change', () => {
          this.updateTempPreferences();
        });
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
        // IMPORTANT : Mettre à jour l'état temporaire avant de confirmer
        this.updateTempEquipements();
        this.confirmEquipementsChanges();
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

    // Préférences
    if (this.elements.boutonValiderPreferences) {
      this.elements.boutonValiderPreferences.addEventListener('click', () => {
        // IMPORTANT : Mettre à jour l'état temporaire avant de confirmer
        this.updateTempPreferences();
        this.confirmPreferencesChanges();
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
    document.body.addEventListener('click', (e) => {
      if (e.target.id === 'bouton-valider-mobile') {
        e.preventDefault();
        
        // IMPORTANT : Toujours confirmer les changements basés sur l'état actuel des checkboxes
        this.updateTempEquipements();
        this.updateTempPreferences();
        
        // Confirmer tous les changements
        this.confirmEquipementsChanges();
        this.confirmPreferencesChanges();
        
        // Gérer le prix
        const mobileSlider = document.querySelector('.bloc-slider.mobile-slider[fs-rangeslider-max="500"]');
        if (mobileSlider) {
          const displayElement = mobileSlider.querySelector('[fs-rangeslider-element="display-value"]');
          if (displayElement) {
            const match = displayElement.textContent.match(/(\d+)/);
            if (match) {
              const sliderValue = parseInt(match[1], 10);
              if (sliderValue < 500) {
                this.updatePriceFromSlider(true);
              }
            }
          }
        }
        
        // Gérer les voyageurs
        if (this.state.adultes !== 1 || this.state.enfants !== 0) {
          this.updateVoyageursFilter();
        }
        
        this.triggerPropertyManagerFilter();
        this.closeMobilePopup();
        this.updateMobileFilterIndicator();
      }
      
      if (e.target.id === 'bouton-effacer-mobile') {
        e.preventDefault();
        this.clearAllFilters();
        this.triggerPropertyManagerFilter();
      }
    });
  }

  // ================================
  // ÉTAT TEMPORAIRE
  // ================================

  updateTempEquipements() {
    const equipementsSet = new Set();
    
    this.equipementCheckboxes.forEach(container => {
      // IMPORTANT : Ne traiter que les éléments visibles
      if (container.offsetParent === null) {
        return; // Ignorer les éléments invisibles
      }
      
      const checkbox = container.querySelector('input[type="checkbox"]');
      const label = container.querySelector('.w-form-label');
      
      if (checkbox && label && checkbox.checked) {
        const equipementName = label.textContent.trim();
        equipementsSet.add(equipementName);
      }
    });
    
    this.tempState.equipements = Array.from(equipementsSet);
    console.log('État temporaire équipements:', this.tempState.equipements);
  }

  updateTempPreferences() {
    const optionsSet = new Set();
    const modesSet = new Set();
    
    this.optionAccueilCheckboxes.forEach(container => {
      // IMPORTANT : Ne traiter que les éléments visibles
      if (container.offsetParent === null) {
        return; // Ignorer les éléments invisibles
      }
      
      const checkbox = container.querySelector('input[type="checkbox"]');
      const label = container.querySelector('.w-form-label');
      
      if (checkbox && label && checkbox.checked) {
        const optionName = label.textContent.trim();
        optionsSet.add(optionName);
      }
    });
    
    this.modeLocationCheckboxes.forEach(container => {
      // IMPORTANT : Ne traiter que les éléments visibles
      if (container.offsetParent === null) {
        return; // Ignorer les éléments invisibles
      }
      
      const checkbox = container.querySelector('input[type="checkbox"]');
      const label = container.querySelector('.w-form-label');
      
      if (checkbox && label && checkbox.checked) {
        const modeName = label.textContent.trim();
        modesSet.add(modeName);
      }
    });
    
    this.tempState.optionsAccueil = Array.from(optionsSet);
    this.tempState.modesLocation = Array.from(modesSet);
    
    console.log('État temporaire préférences:', {
      options: this.tempState.optionsAccueil,
      modes: this.tempState.modesLocation
    });
  }

  // ================================
  // CONFIRMATION DES CHANGEMENTS
  // ================================

  confirmEquipementsChanges() {
    // Copier l'état temporaire vers l'état confirmé
    this.state.equipements = [...this.tempState.equipements];
    
    // Mettre à jour le bouton
    this.updateEquipementsButton(this.state.equipements.length);
    this.updateMobileFilterIndicator();
    
    console.log('✅ Équipements confirmés:', this.state.equipements);
  }

  confirmPreferencesChanges() {
    // Copier l'état temporaire vers l'état confirmé
    this.state.optionsAccueil = [...this.tempState.optionsAccueil];
    this.state.modesLocation = [...this.tempState.modesLocation];
    
    // Mettre à jour le bouton
    const totalPreferences = this.state.optionsAccueil.length + this.state.modesLocation.length;
    this.updatePreferencesButton(totalPreferences);
    this.updateMobileFilterIndicator();
    
    console.log('✅ Préférences confirmées:', {
      options: this.state.optionsAccueil,
      modes: this.state.modesLocation
    });
  }

  // ================================
  // SYNCHRONISATION À L'OUVERTURE - CORRIGÉ
  // ================================

  syncCheckboxesWithState() {
    // IMPORTANT : D'abord copier l'état confirmé vers l'état temporaire
    this.tempState.equipements = [...this.state.equipements];
    this.tempState.optionsAccueil = [...this.state.optionsAccueil];
    this.tempState.modesLocation = [...this.state.modesLocation];
    
    // Puis synchroniser les checkboxes avec l'état temporaire
    this.syncEquipementCheckboxes();
    this.syncPreferenceCheckboxes();
  }

  syncEquipementCheckboxes() {
    this.equipementCheckboxes.forEach(container => {
      const checkbox = container.querySelector('input[type="checkbox"]');
      const label = container.querySelector('.w-form-label');
      
      if (checkbox && label) {
        const isChecked = this.tempState.equipements.includes(label.textContent.trim());
        checkbox.checked = isChecked;
        
        const webflowCheckbox = container.querySelector('.w-checkbox-input');
        if (webflowCheckbox) {
          if (isChecked) {
            webflowCheckbox.classList.add('w--redirected-checked');
          } else {
            webflowCheckbox.classList.remove('w--redirected-checked');
          }
        }
      }
    });
  }

  syncPreferenceCheckboxes() {
    // Options d'accueil
    this.optionAccueilCheckboxes.forEach(container => {
      const checkbox = container.querySelector('input[type="checkbox"]');
      const label = container.querySelector('.w-form-label');
      
      if (checkbox && label) {
        const isChecked = this.tempState.optionsAccueil.includes(label.textContent.trim());
        checkbox.checked = isChecked;
        
        const webflowCheckbox = container.querySelector('.w-checkbox-input');
        if (webflowCheckbox) {
          if (isChecked) {
            webflowCheckbox.classList.add('w--redirected-checked');
          } else {
            webflowCheckbox.classList.remove('w--redirected-checked');
          }
        }
      }
    });
    
    // Modes de location
    this.modeLocationCheckboxes.forEach(container => {
      const checkbox = container.querySelector('input[type="checkbox"]');
      const label = container.querySelector('.w-form-label');
      
      if (checkbox && label) {
        const isChecked = this.tempState.modesLocation.includes(label.textContent.trim());
        checkbox.checked = isChecked;
        
        const webflowCheckbox = container.querySelector('.w-checkbox-input');
        if (webflowCheckbox) {
          if (isChecked) {
            webflowCheckbox.classList.add('w--redirected-checked');
          } else {
            webflowCheckbox.classList.remove('w--redirected-checked');
          }
        }
      }
    });
  }

  // ================================
  // ÉCOUTEURS DROPDOWN - CORRIGÉ
  // ================================

  setupDropdownListeners() {
    // Écouter l'ouverture du dropdown équipements
    if (this.elements.boutonFiltreEquipements) {
      this.elements.boutonFiltreEquipements.addEventListener('click', () => {
        setTimeout(() => {
          // Synchroniser les checkboxes avec l'état confirmé
          this.syncCheckboxesWithState();
        }, 50);
      });
    }
    
    // Écouter l'ouverture du dropdown préférences
    if (this.elements.boutonFiltrePreferences) {
      this.elements.boutonFiltrePreferences.addEventListener('click', () => {
        setTimeout(() => {
          // Synchroniser les checkboxes avec l'état confirmé
          this.syncCheckboxesWithState();
        }, 50);
      });
    }
  }

  // ================================
  // GESTION DES ÉQUIPEMENTS
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
    // Décocher toutes les checkboxes
    this.equipementCheckboxes.forEach(container => {
      const checkbox = container.querySelector('input[type="checkbox"]');
      if (checkbox) {
        checkbox.checked = false;
        this.triggerCheckboxChange(checkbox);
      }
    });
    
    // Réinitialiser les états
    this.state.equipements = [];
    this.tempState.equipements = [];
    
    // Mettre à jour le bouton
    this.updateEquipementsButton(0);
    this.updateMobileFilterIndicator();
  }

  // ================================
  // GESTION DES PRÉFÉRENCES
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
    // Décocher toutes les checkboxes
    [...this.optionAccueilCheckboxes, ...this.modeLocationCheckboxes].forEach(container => {
      const checkbox = container.querySelector('input[type="checkbox"]');
      if (checkbox) {
        checkbox.checked = false;
        this.triggerCheckboxChange(checkbox);
      }
    });
    
    // Réinitialiser les états
    this.state.optionsAccueil = [];
    this.state.modesLocation = [];
    this.tempState.optionsAccueil = [];
    this.tempState.modesLocation = [];
    
    // Mettre à jour le bouton
    this.updatePreferencesButton(0);
    this.updateMobileFilterIndicator();
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
          
          if (isMobile && this.elements.texteFiltrePrice_mobile) {
            this.elements.texteFiltrePrice_mobile.textContent = `${prix}€ / nuit maximum`;
          }
          this.updateMobileFilterIndicator();
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
    
    if (window.propertyManager && window.propertyManager.currentFilters) {
      delete window.propertyManager.currentFilters.price_max;
    }
    this.updateMobileFilterIndicator();
  }

  resetSliders() {
    try {
      // Réinitialiser tous les sliders d'un coup
      document.querySelectorAll('.bloc-slider[fs-rangeslider-max="500"]').forEach(slider => {
        const input = slider.querySelector('input[fs-rangeslider-element="input"]');
        if (input) {
          input.value = 500;
          input.dispatchEvent(new Event('input', { bubbles: true }));
        }
      });
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
    ['chiffres-adultes', 'chiffres-adultes-mobile'].forEach(id => {
      const element = document.getElementById(id);
      if (element) element.textContent = this.state.adultes;
    });

    ['chiffres-enfants', 'chiffres-enfants-mobile'].forEach(id => {
      const element = document.getElementById(id);
      if (element) element.textContent = this.state.enfants;
    });

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
    this.updateMobileFilterIndicator();
  }

  resetVoyageursFilter() {
    this.state.adultes = 1;
    this.state.enfants = 0;
    this.updateTravelersUI();
    
    if (this.elements.texteFiltreVoyageurs) {
      this.elements.texteFiltreVoyageurs.textContent = "Voyageurs";
      this.resetButtonStyle(this.elements.boutonFiltreVoyageurs);
    }
    this.updateMobileFilterIndicator();
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
    this.updateEquipementsButton(this.state.equipements.length);
    this.updatePreferencesButton(this.state.optionsAccueil.length + this.state.modesLocation.length);
    this.updateTravelersUI();
    
    // Synchroniser les checkboxes avec l'état confirmé au démarrage
    this.syncCheckboxesWithState();
    this.updateMobileFilterIndicator();
  }

  // ================================
  // INTÉGRATION AVEC PROPERTYMANAGER
  // ================================

  triggerPropertyManagerFilter() {
    if (window.propertyManager) {
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

  // Méthode de debug pour voir les états
  debugStates() {
    return {
      confirmedState: { ...this.state },
      tempState: { ...this.tempState },
      equipementsButtonText: this.elements.texteFiltreEquipements?.textContent || '',
      preferencesButtonText: this.elements.texteFiltrePreferences?.textContent || ''
    };
  }
}

// Export global
window.FiltersManager = FiltersManager;
