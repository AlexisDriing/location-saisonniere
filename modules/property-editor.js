// Gestionnaire de la page de modification de logement - V4
class PropertyEditor {
  constructor() {
    this.propertyId = null;
    this.propertyData = null;
    this.initialValues = {}; // Stockage de TOUTES les valeurs initiales
    this.init();
  }

  async init() {
    console.log('✏️ Initialisation PropertyEditor...');
    
    // 1. Récupérer l'ID depuis l'URL
    this.propertyId = this.getPropertyIdFromUrl();
    
    if (!this.propertyId) {
      console.error('❌ Aucun ID de logement dans l\'URL');
      return;
    }
    
    console.log('🏠 ID du logement à modifier:', this.propertyId);
    
    // 2. Charger les données du logement
    await this.loadPropertyData();
    
    // 3. Pré-remplir les champs
    if (this.propertyData) {
      this.prefillForm();
      this.setupSaveButton();
      this.initSeasonManagement();
    }
    
    console.log('✅ PropertyEditor initialisé');
    window.propertyEditor = this;
  }

  getPropertyIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
  }

  async loadPropertyData() {
    try {
      console.log('📡 Chargement des données du logement...');
      
      const response = await fetch(`${window.CONFIG.API_URL}/property-details-by-id/${this.propertyId}`);
      
      if (!response.ok) {
        throw new Error(`Erreur serveur: ${response.status}`);
      }
      
      this.propertyData = await response.json();
      console.log('✅ Données reçues:', this.propertyData);
      
    } catch (error) {
      console.error('❌ Erreur chargement:', error);
    }
  }

  initFormFormatters() {
    console.log('📝 Initialisation des formatters...');
    
    // Attendre que Cleave soit chargé
    if (typeof Cleave === 'undefined') {
      // Le script est déjà dans Webflow, on attend juste qu'il soit prêt
      setTimeout(() => this.initFormFormatters(), 100);
      return;
    }
    
    this.setupDateFormatters();
    this.setupSuffixFormatters();
  }
  
  setupDateFormatters() {
    const dateInputs = document.querySelectorAll('[data-format="date-jour-mois"]');
    
    dateInputs.forEach(input => {
      new Cleave(input, {
        date: true,
        delimiter: '/',
        datePattern: ['d', 'm'],
        blocks: [2, 2],
        numericOnly: true
      });
      
      // 🆕 Ajouter la conversion en texte au blur
    input.addEventListener('blur', function() {
      const value = this.value;
      if (value && value.includes('/')) {
        const [jour, mois] = value.split('/');
        const moisNoms = ['', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 
                         'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
        
        const moisNum = parseInt(mois);
        if (moisNum >= 1 && moisNum <= 12) {
          // Stocker la valeur originale
          this.setAttribute('data-date-value', value);
          // Afficher en format texte
          this.value = `${parseInt(jour)} ${moisNoms[moisNum]}`;
        }
      }
    });
    
    // 🆕 Restaurer le format au focus
    input.addEventListener('focus', function() {
      const originalValue = this.getAttribute('data-date-value');
      if (originalValue) {
        this.value = originalValue;
      }
    });
  });
}
  
  setupSuffixFormatters() {
    // Euros
    document.querySelectorAll('[data-suffix="euro"], [data-suffix="euro-nuit"]').forEach(input => {
      input.addEventListener('blur', function() {
        const value = this.value.replace(/[^\d]/g, '');
        if (value) {
          this.setAttribute('data-raw-value', value);
          const suffix = this.getAttribute('data-suffix') === 'euro' ? ' €' : ' € / nuit';
          this.value = value + suffix;
        }
      });
      
      input.addEventListener('focus', function() {
        const rawValue = this.getAttribute('data-raw-value');
        if (rawValue) {
          this.value = rawValue;
        }
      });
    });
  }
  
  // Méthodes utilitaires
  getRawValue(input) {
    return input.getAttribute('data-raw-value') || input.value.replace(/[^\d]/g, '');
  }
  
  getDateValue(input) {
    const dateValue = input.getAttribute('data-date-value');
    if (dateValue && dateValue.includes('/')) {
      return dateValue.replace('/', '-'); // "15/07" → "15-07"
    }
    return null;
  }
  
  prefillForm() {
    console.log('📝 Pré-remplissage des champs...');
    
    // 1. Afficher le nom du logement
    const titleElement = document.getElementById('logement-name-edit');
    if (titleElement && this.propertyData.name) {
      titleElement.textContent = this.propertyData.name;
    }
    
    // 2. Configuration des champs (facilement extensible)
    const fields = [
      { id: 'adresse-input', dataKey: 'address' },
      { id: 'cadeaux-input', dataKey: 'cadeaux' }
    ];
    
    // 3. Pré-remplir et sauvegarder les valeurs initiales
    fields.forEach(field => {
      const input = document.getElementById(field.id);
      if (input) {
        const value = this.propertyData[field.dataKey] || '';
        input.value = value;
        this.initialValues[field.dataKey] = value;
        console.log(`✅ Champ ${field.id} pré-rempli:`, value || '(vide)');
      }
    });
    
    // 4. Écouter les changements
    this.setupFieldListeners();
  }

  initSeasonManagement() {
    console.log('🌞 Initialisation gestion des saisons...');
    
    // Initialiser les formatters
    this.initFormFormatters();
    
    // Charger ou initialiser les données tarifaires
    this.loadPricingData();
    
    // Configuration des boutons
    this.setupSeasonButtons();
    
    // Cacher tous les blocs saison par défaut
    this.hideAllSeasonBlocks();
    
    // Afficher les saisons existantes
    this.displayExistingSeasons();
  }
  
  loadPricingData() {
    // Charger le JSON existant ou créer une structure vide
    if (this.propertyData.pricing_data) {
      this.pricingData = this.propertyData.pricing_data;
    } else {
      this.pricingData = {
        seasons: [],
        cleaning: { included: true },
        discounts: [],
        capacity: 4,
        caution: 0,
        acompte: 30
      };
    }
    
    console.log('📊 Données tarifaires chargées:', this.pricingData);
  }
  
  hideAllSeasonBlocks() {
    for (let i = 1; i <= 4; i++) {
      const block = document.getElementById(`season-${i}`);
      if (block) {
        block.style.display = 'none';
      }
    }
  }
  
  displayExistingSeasons() {
    if (this.pricingData.seasons && this.pricingData.seasons.length > 0) {
      this.pricingData.seasons.forEach((season, index) => {
        this.displaySeasonBlock(season, index);
      });
    }
  }
  
  displaySeasonBlock(season, index) {
    const seasonBlock = document.getElementById(`season-${index + 1}`);
    if (!seasonBlock) return;
    
    seasonBlock.style.display = 'flex'; // ou 'block' selon votre CSS
    
    // Utiliser la même logique que gestion-tarifs.js
    const nameElement = seasonBlock.querySelector("#name-season");
    if (nameElement) {
      nameElement.textContent = season.name;
    }
    
    const priceElement = seasonBlock.querySelector("#prix-nuit-season");
    if (priceElement) {
      priceElement.textContent = season.price;
    }
    
    // Dates
    const datesElement = seasonBlock.querySelector("#dates-season");
    if (datesElement && season.periods && season.periods.length > 0) {
      const dateRanges = season.periods.map(period => 
        this.formatDateRange(period.start, period.end)
      );
      datesElement.textContent = dateRanges.join(" et ");
    }
    
    // Nuits minimum
    const minNightsElement = seasonBlock.querySelector("#nuit-minimum");
    if (minNightsElement) {
      minNightsElement.textContent = season.minNights || 1;
    }
  }
  
  formatDateRange(start, end) {
    // Convertir "15-07" en "du 15 juillet au 20 août"
    const months = [
      "janvier", "février", "mars", "avril", "mai", "juin",
      "juillet", "août", "septembre", "octobre", "novembre", "décembre"
    ];
    
    const [startDay, startMonth] = start.split("-");
    const [endDay, endMonth] = end.split("-");
    
    return `du ${parseInt(startDay)} ${months[parseInt(startMonth) - 1]} au ${parseInt(endDay)} ${months[parseInt(endMonth) - 1]}`;
  }
  
  setupSeasonButtons() {
    // Bouton ajouter saison
    const addSeasonBtn = document.getElementById('button-add-season');
    if (addSeasonBtn) {
      addSeasonBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.openAddSeasonModal();
      });
    }
    
    // Boutons dans la modal d'ajout
    const validateAddBtn = document.getElementById('button-validate-add-season');
    if (validateAddBtn) {
      validateAddBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.validateAndAddSeason();
      });
    }
  }

  // Méthode pour ouvrir la modal (vous l'avez déjà, mais au cas où)
openAddSeasonModal() {
  console.log('🌞 Ouverture modal ajout saison');
  
  // Vérifier qu'on a moins de 4 saisons
  if (this.pricingData.seasons.length >= 4) {
    alert('Maximum 4 saisons autorisées');
    return;
  }
  
  // Réinitialiser les champs de la modal
  this.resetSeasonModal();
  
  // Votre code pour afficher la modal
  const modal = document.getElementById('modal-add-season'); // Adaptez l'ID
  if (modal) {
    modal.style.display = 'flex';
  }
}

resetSeasonModal() {
  // Réinitialiser tous les champs
  const fields = [
    'season-name-input',
    'season-date-start-input',
    'season-date-end-input',
    'season-price-input',
    'season-min-nights-input'
  ];
  
  fields.forEach(fieldId => {
    const input = document.getElementById(fieldId);
    if (input) {
      input.value = '';
      input.removeAttribute('data-raw-value');
      input.removeAttribute('data-date-value');
    }
  });
}

validateAndAddSeason() {
  console.log('✅ Validation de la nouvelle saison');
  
  // Récupérer les valeurs des champs
  const seasonData = this.getSeasonFormData();
  
  // Validation basique
  if (!seasonData.name || !seasonData.dateStart || !seasonData.dateEnd || !seasonData.price) {
    alert('Veuillez remplir tous les champs obligatoires');
    return;
  }
  
  // Créer l'objet saison pour le JSON
  const newSeason = {
    name: seasonData.name,
    price: parseInt(seasonData.price),
    minNights: parseInt(seasonData.minNights) || 1,
    periods: [{
      start: seasonData.dateStart,
      end: seasonData.dateEnd
    }]
  };
  
  console.log('📊 Nouvelle saison:', newSeason);
  
  // Ajouter au JSON
  this.pricingData.seasons.push(newSeason);
  
  // Afficher immédiatement le bloc
  const seasonIndex = this.pricingData.seasons.length - 1;
  this.displaySeasonBlock(newSeason, seasonIndex);
  
  // Fermer la modal
  this.closeSeasonModal();
  
  // Activer les boutons de sauvegarde
  this.enableButtons();
}

getSeasonFormData() {
  return {
    name: document.getElementById('season-name-input')?.value.trim(),
    dateStart: this.getDateValue(document.getElementById('season-date-start-input')),
    dateEnd: this.getDateValue(document.getElementById('season-date-end-input')),
    price: this.getRawValue(document.getElementById('season-price-input')),
    minNights: this.getRawValue(document.getElementById('season-min-nights-input')) || '1'
  };
}

closeSeasonModal() {
  const modal = document.getElementById('modal-add-season');
  if (modal) {
    modal.style.display = 'none';
  }
  this.resetSeasonModal();
}

// 🆕 IMPORTANT : Méthode pour sauvegarder le JSON
async savePricingData() {
  console.log('💾 Sauvegarde des données tarifaires...');
  
  try {
    // Préparer les données
    const updates = {
      pricing_data: this.pricingData
    };
    
    // Utiliser la même route que pour les autres champs
    const response = await fetch(`${window.CONFIG.API_URL}/update-property/${this.propertyId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updates)
    });
    
    const result = await response.json();
    
    if (response.ok && result.success) {
      console.log('✅ Données tarifaires sauvegardées');
      
      // Optionnel : Message de succès discret
      // alert('Saison ajoutée avec succès !');
    } else {
      throw new Error(result.error || 'Erreur lors de la sauvegarde');
    }
    
  } catch (error) {
    console.error('❌ Erreur sauvegarde tarifs:', error);
    alert('Erreur lors de la sauvegarde de la saison');
  }
}
  
  setupFieldListeners() {
    const fields = [
      { id: 'adresse-input' },
      { id: 'cadeaux-input' },
    ];
    
    fields.forEach(field => {
      const input = document.getElementById(field.id);
      if (input) {
        // Dès qu'on tape = activer les boutons (logique simple)
        input.addEventListener('input', () => {
          this.enableButtons();
        });
      }
    });
  }

  enableButtons() {
    const saveButton = document.getElementById('button-save-modifications');
    const cancelButton = document.getElementById('annulation');
    
    if (saveButton) {
      saveButton.disabled = false;
      saveButton.style.opacity = '1';
      saveButton.style.cursor = 'pointer';
    }
    
    if (cancelButton) {
      cancelButton.style.display = 'block';
    }
  }

  disableButtons() {
    const saveButton = document.getElementById('button-save-modifications');
    const cancelButton = document.getElementById('annulation');
    
    if (saveButton) {
      saveButton.disabled = true;
      saveButton.style.opacity = '0.5';
      saveButton.style.cursor = 'not-allowed';
    }
    
    if (cancelButton) {
      cancelButton.style.display = 'none';
    }
  }

  setupSaveButton() {
    console.log('💾 Configuration des boutons...');
    
    const saveButton = document.getElementById('button-save-modifications');
    const cancelButton = document.getElementById('annulation');
    
    // Désactiver par défaut
    this.disableButtons();
    
    // Bouton Enregistrer
    if (saveButton) {
      saveButton.addEventListener('click', async (e) => {
        e.preventDefault();
        await this.saveModifications();
      });
    }
    
    // Bouton Annuler
    if (cancelButton) {
      cancelButton.addEventListener('click', (e) => {
        e.preventDefault();
        this.cancelModifications();
      });
    }
    
    console.log('✅ Boutons configurés');
  }

  cancelModifications() {
    console.log('❌ Annulation des modifications');
    
    // Configuration des champs à réinitialiser
    const fields = [
      { id: 'adresse-input', dataKey: 'address' },
      { id: 'cadeaux-input', dataKey: 'cadeaux' }
    ];
    
    // Remettre les valeurs initiales
    fields.forEach(field => {
      const input = document.getElementById(field.id);
      if (input) {
        input.value = this.initialValues[field.dataKey] || '';
      }
    });

    // 🆕 Restaurer les saisons d'origine
    if (this.propertyData.pricing_data) {
    this.pricingData = JSON.parse(JSON.stringify(this.propertyData.pricing_data)); // Clone profond
    
    // Réafficher les saisons
    this.hideAllSeasonBlocks();
    this.displayExistingSeasons();
  }
    
    // Désactiver les boutons
    this.disableButtons();
  }

  async saveModifications() {
  console.log('💾 Sauvegarde des modifications...');
  
  // Configuration du mapping des champs
  const fieldMapping = [
    { id: 'adresse-input', dataKey: 'address', dbKey: 'adresse' },
    { id: 'cadeaux-input', dataKey: 'cadeaux', dbKey: 'cadeaux' }
  ];
  
  // Collecter les valeurs actuelles
  const currentValues = {};
  fieldMapping.forEach(field => {
    const input = document.getElementById(field.id);
    if (input) {
      currentValues[field.dataKey] = input.value.trim();
    }
  });
  
  // 🎯 OPTIMISATION : Ne prendre que les champs modifiés
  const updates = {};
  Object.keys(currentValues).forEach(key => {
    if (currentValues[key] !== this.initialValues[key]) {
      updates[key] = currentValues[key];
    }
  });
  
  // 🆕 AJOUTER ICI : Vérifier si les données tarifaires ont changé
  const originalPricingJson = JSON.stringify(this.propertyData.pricing_data || {});
  const currentPricingJson = JSON.stringify(this.pricingData);
  
  if (originalPricingJson !== currentPricingJson) {
    updates.pricing_data = this.pricingData;
    console.log('📊 Données tarifaires modifiées');
  }
    
    // Si aucune modification
    if (Object.keys(updates).length === 0) {
      alert('Aucune modification détectée');
      return;
    }
    
    console.log(`📤 Envoi de ${Object.keys(updates).length} champ(s) modifié(s):`, updates);
    
    // Désactiver le bouton pendant la sauvegarde
    const saveButton = document.getElementById('button-save-modifications');
    const originalText = saveButton.textContent;
    saveButton.disabled = true;
    saveButton.textContent = 'Enregistrement...';
    
    try {
      // Appeler la route de mise à jour
      const response = await fetch(`${window.CONFIG.API_URL}/update-property/${this.propertyId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        console.log('✅ Sauvegarde réussie');
        
        // Mettre à jour les valeurs initiales avec les nouvelles valeurs
        Object.keys(updates).forEach(key => {
          if (key !== 'pricing_data') { // Pour les champs normaux
            this.initialValues[key] = updates[key];
          }
        });
        
        // 🆕 AJOUTER : Mettre à jour les données pricing d'origine
        if (updates.pricing_data) {
          this.propertyData.pricing_data = JSON.parse(JSON.stringify(this.pricingData));
        }
              
        // Désactiver les boutons
        this.disableButtons();
        
        // Message de succès
        alert('Modifications enregistrées avec succès !');
        
        
      } else {
        throw new Error(result.error || 'Erreur lors de la sauvegarde');
      }
      
    } catch (error) {
      console.error('❌ Erreur sauvegarde:', error);
      alert('Erreur lors de la sauvegarde : ' + error.message);
    } finally {
      // Réactiver le bouton
      saveButton.disabled = false;
      saveButton.textContent = originalText;
    }
  }
}

// Export global
window.PropertyEditor = PropertyEditor;
