// Gestionnaire de la page de modification de logement - V10 modifié button
class PropertyEditor {
  constructor() {
    this.propertyId = null;
    this.propertyData = null;
    this.initialValues = {}; // Stockage de TOUTES les valeurs initiales
    this.editingSeasonIndex = null;
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
  
  // 3. Si les données sont chargées
  if (this.propertyData) {
    // 🆕 IMPORTANT : Charger les données pricing AVANT prefillForm
    this.loadPricingData();
    
    // ENSUITE seulement pré-remplir les champs
    this.prefillForm();
    this.setupSaveButton();
    
    // Et finir par l'init des saisons
    this.initSeasonManagement();

    this.initDiscountManagement();
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
    this.setupTimeFormatters();
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
setupTimeFormatters() {
  const heureInputs = document.querySelectorAll('[data-format="heure-minute"]');
  
  heureInputs.forEach(input => {
    new Cleave(input, {
      blocks: [2, 2],
      delimiter: ':',
      numericOnly: true,
      delimiterLazyShow: true, // Affiche : automatiquement
      onValueChanged: function(e) {
        // Validation des heures (0-23)
        const value = e.target.value;
        if (value.length >= 2) {
          const heures = parseInt(value.substring(0, 2));
          if (heures > 23) {
            e.target.value = '23' + value.substring(2);
          }
        }
        
        // Validation des minutes (0-59)
        if (value.length >= 5) {
          const minutes = parseInt(value.substring(3, 5));
          if (minutes > 59) {
            e.target.value = value.substring(0, 3) + '59';
          }
        }
      }
    });
    
    // Placeholder explicite
    input.placeholder = '00:00';
    
    // Ajouter zéros automatiquement au blur si nécessaire
    input.addEventListener('blur', function() {
      let value = this.value;
      if (value) {
        // Si seulement l'heure est entrée (ex: "14"), ajouter ":00"
        if (value.length === 2 && !value.includes(':')) {
          this.value = value + ':00';
        }
        // Si format incomplet (ex: "14:5"), ajouter le zéro
        else if (value.includes(':')) {
          const parts = value.split(':');
          const heures = parts[0].padStart(2, '0');
          const minutes = (parts[1] || '00').padStart(2, '0');
          this.value = heures + ':' + minutes;
        }
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
    
    this.prefillDefaultPricing();

     // NOUVEAU : Pré-remplir les options de ménage
    this.prefillCleaningOptions();

    // Pré-remplir les autres champs simples
    //this.prefillSimpleFields();
    
    this.setupFieldListeners();
  }

  initSeasonManagement() {
    console.log('🌞 Initialisation gestion des saisons...');
    
    // Initialiser les formatters
    this.initFormFormatters();
    
    // Configuration des boutons
    this.setupSeasonButtons();
    
    // Cacher tous les blocs saison par défaut
    this.hideAllSeasonBlocks();
    
    // Afficher les saisons existantes
    console.log('📊 Affichage des saisons existantes:', this.pricingData.seasons);
    this.displayExistingSeasons();
  }
  
  loadPricingData() {
  if (this.propertyData.pricing_data) {
    this.pricingData = JSON.parse(JSON.stringify(this.propertyData.pricing_data));
  } else {
    // Structure complète avec les bonnes valeurs par défaut
    this.pricingData = {
      defaultPricing: {
        price: 0,
        minNights: 0,
        platformPrices: {
          airbnb: 0,
          booking: 0,
          gites: 0,
          other: 0
        }
      },
      platformPricing: {
        usePercentage: false,
        defaultDiscount: 17
      },
      seasons: [],
      cleaning: { 
        included: true
      },
      discounts: [],
      capacity: 0,
      caution: 0,
      acompte: 0
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
    console.log('🔍 displayExistingSeasons appelée');
    console.log('📊 pricingData:', this.pricingData);
    
    if (this.pricingData && this.pricingData.seasons && this.pricingData.seasons.length > 0) {
      console.log(`✅ ${this.pricingData.seasons.length} saison(s) trouvée(s)`);
      
      this.pricingData.seasons.forEach((season, index) => {
        console.log(`📅 Affichage saison ${index + 1}:`, season);
        this.displaySeasonBlock(season, index);
      });
    } else {
      console.log('❌ Aucune saison à afficher');
    }
  }
  
  displaySeasonBlock(season, index) {
    const seasonNum = index + 1;
    console.log(`🎯 Tentative d'affichage du bloc season-${seasonNum}`);
    
    const seasonBlock = document.getElementById(`season-${seasonNum}`);
    
    if (!seasonBlock) {
      console.log(`❌ Bloc season-${seasonNum} non trouvé dans le DOM`);
      return;
    }
    
    console.log(`✅ Bloc season-${seasonNum} trouvé, affichage en cours...`);
    seasonBlock.style.display = 'flex'; // ou 'block' selon votre CSS
    
    // Utiliser des IDs uniques avec le numéro
    const nameElement = document.getElementById(`name-season-${seasonNum}`);
    if (nameElement) {
      nameElement.textContent = season.name;
      console.log(`✅ Nom affiché: ${season.name}`);
    } else {
      console.log(`❌ Élément name-season-${seasonNum} non trouvé`);
    }
    
    const priceElement = document.getElementById(`prix-nuit-season-${seasonNum}`);
    if (priceElement) {
      priceElement.textContent = season.price;
    }
    
    // Dates
    const datesElement = document.getElementById(`dates-season-${seasonNum}`);
    if (datesElement && season.periods && season.periods.length > 0) {
      const dateRanges = season.periods.map(period => 
        this.formatDateRange(period.start, period.end)
      );
      datesElement.textContent = dateRanges.join(" et ");
    }
    
    // Nuits minimum
    const minNightsElement = document.getElementById(`nuit-minimum-${seasonNum}`);
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
  
  // 🆕 Boutons modifier pour chaque saison (1 à 4)
  for (let i = 1; i <= 4; i++) {
    const editBtn = document.getElementById(`edit-${i}`);
    if (editBtn) {
      editBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.openEditSeasonModal(i - 1); // index 0-based
      });
    }
  }
  
  // 🆕 Bouton valider dans la modal de modification
  const validateEditBtn = document.getElementById('button-validate-edit-season');
  if (validateEditBtn) {
    validateEditBtn.addEventListener('click', (e) => {
      e.preventDefault();
      this.validateAndEditSeason();
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

  // 🆕 Ouvrir la modal de modification
openEditSeasonModal(seasonIndex) {
  console.log('✏️ Ouverture modal modification saison', seasonIndex + 1);
  
  // Vérifier que la saison existe
  if (!this.pricingData.seasons[seasonIndex]) {
    console.error('❌ Saison non trouvée à l\'index', seasonIndex);
    return;
  }
  
  // Stocker l'index de la saison en cours de modification
  this.editingSeasonIndex = seasonIndex;
  const season = this.pricingData.seasons[seasonIndex];
  
  // Pré-remplir les champs avec les valeurs actuelles
  const nameInput = document.getElementById('season-name-input-edit');
  if (nameInput) nameInput.value = season.name;
  
  // Gérer les dates
  if (season.periods && season.periods[0]) {
    const startInput = document.getElementById('season-date-start-input-edit');
    const endInput = document.getElementById('season-date-end-input-edit');
    
    if (startInput) {
      // Convertir "28-07" en "28/07" pour l'input
      const [day, month] = season.periods[0].start.split('-');
      startInput.value = `${day}/${month}`;
      startInput.setAttribute('data-date-value', `${day}/${month}`);
    }
    
    if (endInput) {
      const [day, month] = season.periods[0].end.split('-');
      endInput.value = `${day}/${month}`;
      endInput.setAttribute('data-date-value', `${day}/${month}`);
    }
  }
  
  // Prix
  const priceInput = document.getElementById('season-price-input-edit');
  if (priceInput) {
    priceInput.value = season.price;
    priceInput.setAttribute('data-raw-value', season.price);
  }
  
  // Nuits minimum
  const minNightsInput = document.getElementById('season-min-nights-input-edit');
  if (minNightsInput) {
    minNightsInput.value = season.minNights || 1;
    minNightsInput.setAttribute('data-raw-value', season.minNights || 1);
  }
  
  // Afficher la modal
  const modal = document.getElementById('modal-edit-season'); // Adaptez l'ID selon votre modal
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

// 🆕 Valider et sauvegarder les modifications de la saison
validateAndEditSeason() {
  console.log('✅ Validation des modifications de la saison', this.editingSeasonIndex + 1);
  
  // Vérifier qu'on a bien un index
  if (this.editingSeasonIndex === undefined || this.editingSeasonIndex === null) {
    console.error('❌ Aucune saison en cours de modification');
    return;
  }
  
  // Récupérer les valeurs des champs
  const seasonData = this.getEditSeasonFormData();
  
  // Validation basique
  if (!seasonData.name || !seasonData.dateStart || !seasonData.dateEnd || !seasonData.price) {
    alert('Veuillez remplir tous les champs obligatoires');
    return;
  }
  
  // Mettre à jour la saison existante
  const updatedSeason = {
    name: seasonData.name,
    price: parseInt(seasonData.price),
    minNights: parseInt(seasonData.minNights) || 1,
    periods: [{
      start: seasonData.dateStart,
      end: seasonData.dateEnd
    }]
  };
  
  console.log('📊 Saison modifiée:', updatedSeason);
  
  // Remplacer la saison dans le tableau
  this.pricingData.seasons[this.editingSeasonIndex] = updatedSeason;
  
  // Mettre à jour l'affichage
  this.displaySeasonBlock(updatedSeason, this.editingSeasonIndex);
  
  // Fermer la modal
  this.closeEditSeasonModal();
  
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

  // 🆕 Récupérer les données du formulaire de modification
getEditSeasonFormData() {
  return {
    name: document.getElementById('season-name-input-edit')?.value.trim(),
    dateStart: this.getDateValue(document.getElementById('season-date-start-input-edit')),
    dateEnd: this.getDateValue(document.getElementById('season-date-end-input-edit')),
    price: this.getRawValue(document.getElementById('season-price-input-edit')),
    minNights: this.getRawValue(document.getElementById('season-min-nights-input-edit')) || '1'
  };
}
  
closeSeasonModal() {
  const modal = document.getElementById('modal-add-season');
  if (modal) {
    modal.style.display = 'none';
  }
  this.resetSeasonModal();
}

  // 🆕 Fermer la modal de modification
closeEditSeasonModal() {
  const modal = document.getElementById('modal-edit-season');
  if (modal) {
    modal.style.display = 'none';
  }
  this.resetEditSeasonModal();
  this.editingSeasonIndex = null;
}

// 🆕 Réinitialiser les champs de la modal de modification
resetEditSeasonModal() {
  const fields = [
    'season-name-input-edit',
    'season-date-start-input-edit',
    'season-date-end-input-edit',
    'season-price-input-edit',
    'season-min-nights-input-edit'
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

  prefillDefaultPricing() {
  console.log('💰 Pré-remplissage defaultPricing...');
  
  // Prix par défaut
  const defaultPriceInput = document.getElementById('default-price-input');
  if (defaultPriceInput && this.pricingData.defaultPricing) {
    defaultPriceInput.value = this.pricingData.defaultPricing.price || 0;
    defaultPriceInput.setAttribute('data-raw-value', this.pricingData.defaultPricing.price || 0);
  }
  
  // Nuits minimum par défaut
  const defaultMinNightsInput = document.getElementById('default-min-nights-input');
  if (defaultMinNightsInput && this.pricingData.defaultPricing) {
    defaultMinNightsInput.value = this.pricingData.defaultPricing.minNights || 0;
  }
  
  // Prix plateformes (optionnels)
  if (this.pricingData.defaultPricing && this.pricingData.defaultPricing.platformPrices) {
    const platforms = ['airbnb', 'booking', 'gites', 'other'];
    platforms.forEach(platform => {
      const input = document.getElementById(`default-${platform}-price-input`);
      if (input) {
        const value = this.pricingData.defaultPricing.platformPrices[platform] || 0;
        input.value = value;
        input.setAttribute('data-raw-value', value);
      }
    });
  }
}

// 🆕 NOUVELLE MÉTHODE : Pré-remplir les options de ménage
prefillCleaningOptions() {
  console.log('🧹 Pré-remplissage options de ménage...');
  
  // Récupérer les éléments du DOM
  const includedRadio = document.getElementById('inclus');
  const notIncludedRadio = document.getElementById('non-inclus');
  const priceInput = document.getElementById('cleaning-price-input');
  
  if (!includedRadio || !notIncludedRadio || !priceInput) {
    console.warn('⚠️ Éléments de ménage non trouvés dans le DOM');
    return;
  }
  
  // Définir l'état initial basé sur les données
if (this.pricingData.cleaning && this.pricingData.cleaning.included) {
  // Cocher "Inclus"
  includedRadio.checked = true;
  notIncludedRadio.checked = false;
  
  // Mettre à jour le visuel Webflow pour "Inclus"
  const includedLabel = document.getElementById('menage-inclus');
  const notIncludedLabel = document.getElementById('menage-non-inclus');
  if (includedLabel && notIncludedLabel) {
    includedLabel.querySelector('.w-radio-input').classList.add('w--redirected-checked');
    notIncludedLabel.querySelector('.w-radio-input').classList.remove('w--redirected-checked');
  }
  
  priceInput.style.display = 'none';
  priceInput.value = '';
} else {
  // Cocher "Non inclus"
  includedRadio.checked = false;
  notIncludedRadio.checked = true;
  
  // Mettre à jour le visuel Webflow pour "Non inclus"
  const includedLabel = document.getElementById('menage-inclus');
  const notIncludedLabel = document.getElementById('menage-non-inclus');
  if (includedLabel && notIncludedLabel) {
    includedLabel.querySelector('.w-radio-input').classList.remove('w--redirected-checked');
    notIncludedLabel.querySelector('.w-radio-input').classList.add('w--redirected-checked');
  }
  
  priceInput.style.display = 'block';
  
  // Afficher le prix si disponible
  if (this.pricingData.cleaning && this.pricingData.cleaning.price) {
    priceInput.value = this.pricingData.cleaning.price;
    priceInput.setAttribute('data-raw-value', this.pricingData.cleaning.price);
  }
}
  
  // Sauvegarder l'état initial
  this.initialValues.cleaningIncluded = this.pricingData.cleaning?.included ?? true;
  this.initialValues.cleaningPrice = this.pricingData.cleaning?.price || 0;
  
  console.log('✅ Options de ménage configurées:', {
    included: this.pricingData.cleaning?.included ?? true,
    price: this.pricingData.cleaning?.price || 0
  });
}
  
// ================================
// 🎯 GESTION DES RÉDUCTIONS
// ================================

initDiscountManagement() {
  console.log('💰 Initialisation gestion des réductions...');
  
  // Masquer tous les blocs de réduction au départ
  document.querySelectorAll('.bloc-reduction').forEach(bloc => {
    bloc.style.display = 'none';
  });
  
  // Configuration du bouton d'ajout
  const addButton = document.getElementById('button-add-reduction');
  if (addButton) {
    addButton.addEventListener('click', (e) => {
      e.preventDefault();
      this.addDiscount();
    });
  }
  
  // Afficher les réductions existantes
  this.displayDiscounts();
}

displayDiscounts() {
  console.log('📊 Affichage des réductions existantes...');
  
  // Masquer tous les blocs d'abord
  document.querySelectorAll('.bloc-reduction').forEach(bloc => {
    bloc.style.display = 'none';
  });
  
  if (!this.pricingData.discounts || this.pricingData.discounts.length === 0) {
    console.log('❌ Aucune réduction à afficher');
    return;
  }
  
  // Afficher chaque réduction
  this.pricingData.discounts.forEach((discount, index) => {
    console.log(`💰 Affichage réduction ${index + 1}:`, discount);
    
    let blocElement;
    
    if (index === 0) {
      // Première réduction : bloc avec labels
      blocElement = document.querySelector('.bloc-reduction:not(.next)');
    } else {
      // Réductions suivantes : blocs sans labels
      const nextBlocs = document.querySelectorAll('.bloc-reduction.next');
      if (nextBlocs[index - 1]) {
        blocElement = nextBlocs[index - 1];
      }
    }
    
    if (blocElement) {
      // Afficher le bloc
      blocElement.style.display = 'flex';
      
      // Remplir les valeurs
      const nightsInput = blocElement.querySelector('[data-discount="nights"]');
      const percentageInput = blocElement.querySelector('[data-discount="percentage"]');
      
      if (nightsInput) {
        nightsInput.value = discount.nights || '';
      }
      
      if (percentageInput) {
        percentageInput.value = discount.percentage || '';
      }
      
      // Ajouter les listeners pour modifications
      this.setupDiscountListeners(blocElement, index);
      
      // Configurer le bouton de suppression
      const deleteButton = blocElement.querySelector('.button-delete-reduction');
      if (deleteButton) {
        deleteButton.onclick = (e) => {
          e.preventDefault();
          this.removeDiscount(index);
        };
      }
    }
  });
  
  // Vérifier si on peut encore ajouter des réductions
  this.updateAddButtonState();
}

addDiscount() {
  console.log('➕ Ajout d\'une nouvelle réduction');
  
  // Vérifier la limite
  if (this.pricingData.discounts.length >= 10) {
    alert('Maximum 10 réductions autorisées');
    return;
  }
  
  // Ajouter une nouvelle réduction vide
  const newDiscount = {
    nights: 0,
    percentage: 0
  };
  
  const newIndex = this.pricingData.discounts.length;
  this.pricingData.discounts.push(newDiscount);
  
  // SIMPLE : Afficher juste le nouveau bloc au lieu de tout réafficher
  let blocElement;
  if (newIndex === 0) {
    blocElement = document.querySelector('.bloc-reduction:not(.next)');
  } else {
    const nextBlocs = document.querySelectorAll('.bloc-reduction.next');
    blocElement = nextBlocs[newIndex - 1];
  }
  
  if (blocElement) {
    blocElement.style.display = 'flex';
    
    // Réinitialiser les valeurs
    const nightsInput = blocElement.querySelector('[data-discount="nights"]');
    const percentageInput = blocElement.querySelector('[data-discount="percentage"]');
    
    if (nightsInput) {
      nightsInput.value = '';
      nightsInput.removeAttribute('data-raw-value');
    }
    if (percentageInput) {
      percentageInput.value = '';
      percentageInput.removeAttribute('data-raw-value');
    }
    
    // Ajouter les listeners
    this.setupDiscountListeners(blocElement, newIndex);
    
    // Configurer le bouton de suppression
    const deleteButton = blocElement.querySelector('.button-delete-reduction');
    if (deleteButton) {
      deleteButton.onclick = (e) => {
        e.preventDefault();
        this.removeDiscount(newIndex);
      };
    }
  }
  
  // Mettre à jour l'état du bouton d'ajout
  this.updateAddButtonState();
  
  // Activer les boutons de sauvegarde
  this.enableButtons();
}

removeDiscount(index) {
  console.log(`🗑️ Suppression de la réduction ${index + 1}`);
  
  // Supprimer du tableau
  this.pricingData.discounts.splice(index, 1);
  
  // Réafficher toutes les réductions (gère automatiquement la réorganisation)
  this.displayDiscounts();
  
  // Activer les boutons de sauvegarde
  this.enableButtons();
}

setupDiscountListeners(blocElement, index) {
  // Listeners pour les modifications
  const nightsInput = blocElement.querySelector('[data-discount="nights"]');
  const percentageInput = blocElement.querySelector('[data-discount="percentage"]');
  
  if (nightsInput) {
    // SIMPLE : Directement récupérer la valeur de l'input
    nightsInput.addEventListener('input', (e) => {
      const value = parseInt(e.target.value) || 0;
      this.pricingData.discounts[index].nights = value;
      this.enableButtons();
    });
  }
  
  if (percentageInput) {
    // Récupérer la valeur en enlevant le %
    percentageInput.addEventListener('input', (e) => {
      const value = parseInt(e.target.value.replace(/[^\d]/g, '')) || 0;
      this.pricingData.discounts[index].percentage = value;
      this.enableButtons();
    });
    
    // Formatage au blur : ajouter %
    percentageInput.addEventListener('blur', function() {
      const value = this.value.replace(/[^\d]/g, '');
      if (value) {
        this.value = value + ' %';
      }
    });
    
    // Retirer le % au focus
    percentageInput.addEventListener('focus', function() {
      this.value = this.value.replace(/[^\d]/g, '');
    });
  }
}

updateAddButtonState() {
  const addButton = document.getElementById('button-add-reduction');
  if (addButton) {
    if (this.pricingData.discounts.length >= 10) {
      addButton.disabled = true;
      addButton.style.opacity = '0.5';
      addButton.style.cursor = 'not-allowed';
    } else {
      addButton.disabled = false;
      addButton.style.opacity = '1';
      addButton.style.cursor = 'pointer';
    }
  }
}
  
setupFieldListeners() {
  // ✅ GARDER le code existant
  const fields = [
    { id: 'adresse-input' },
    { id: 'cadeaux-input' },
  ];
  
  fields.forEach(field => {
    const input = document.getElementById(field.id);
    if (input) {
      input.addEventListener('input', () => {
        this.enableButtons();
      });
    }
  });
  
  // 🆕 AJOUTER cet appel
  this.setupDefaultPricingListeners();

  this.setupCleaningListeners();
}

// 🆕 NOUVELLE MÉTHODE à ajouter après setupFieldListeners()
setupDefaultPricingListeners() {
  // Prix par défaut
  const defaultPriceInput = document.getElementById('default-price-input');
  if (defaultPriceInput) {
    defaultPriceInput.addEventListener('input', () => {
      this.updateDefaultPricing();
      this.enableButtons();
    });
  }
  
  // Nuits minimum
  const defaultMinNightsInput = document.getElementById('default-min-nights-input');
  if (defaultMinNightsInput) {
    defaultMinNightsInput.addEventListener('input', () => {
      this.updateDefaultPricing();
      this.enableButtons();
    });
  }
  
  // Prix plateformes
  const platforms = ['airbnb', 'booking', 'gites', 'other'];
  platforms.forEach(platform => {
    const input = document.getElementById(`default-${platform}-price-input`);
    if (input) {
      input.addEventListener('input', () => {
        this.updateDefaultPricing();
        this.enableButtons();
      });
    }
  });
}

// 🆕 NOUVELLE MÉTHODE : Configurer les listeners pour le ménage
setupCleaningListeners() {
  console.log('🧹 Configuration listeners ménage...');
  
  const includedRadio = document.getElementById('inclus');
  const notIncludedRadio = document.getElementById('non-inclus');
  const priceInput = document.getElementById('cleaning-price-input');
  
  if (!includedRadio || !notIncludedRadio || !priceInput) {
    return;
  }
  
  // Listener pour "Inclus"
  includedRadio.addEventListener('change', () => {
    if (includedRadio.checked) {
      console.log('✅ Ménage inclus sélectionné');
      priceInput.style.display = 'none';
      priceInput.value = '';
      priceInput.removeAttribute('data-raw-value');
      
      // Mettre à jour les données
      if (!this.pricingData.cleaning) {
        this.pricingData.cleaning = {};
      }
      this.pricingData.cleaning.included = true;
      this.pricingData.cleaning.price = 0;
      
      this.enableButtons();
    }
  });
  
  // Listener pour "Non inclus"
  notIncludedRadio.addEventListener('change', () => {
    if (notIncludedRadio.checked) {
      console.log('💰 Ménage non inclus sélectionné');
      priceInput.style.display = 'block';
      
      // Focus sur le champ prix
      setTimeout(() => priceInput.focus(), 100);
      
      // Mettre à jour les données
      if (!this.pricingData.cleaning) {
        this.pricingData.cleaning = {};
      }
      this.pricingData.cleaning.included = false;
      
      this.enableButtons();
    }
  });
    
    // Listener pour le prix du ménage
    priceInput.addEventListener('input', () => {
      const value = parseInt(this.getRawValue(priceInput)) || 0;
      
      if (!this.pricingData.cleaning) {
        this.pricingData.cleaning = {};
      }
      this.pricingData.cleaning.price = value;
      
      console.log('💰 Prix ménage mis à jour:', value);
      this.enableButtons();
    });
    
    // Formatage du prix
    priceInput.addEventListener('blur', function() {
      const value = this.value.replace(/[^\d]/g, '');
      if (value) {
        this.setAttribute('data-raw-value', value);
        this.value = value + '€';
      }
    });
    
    priceInput.addEventListener('focus', function() {
      const rawValue = this.getAttribute('data-raw-value');
      if (rawValue) {
        this.value = rawValue;
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

  updateDefaultPricing() {
  console.log('💰 Mise à jour defaultPricing...');
  
  // S'assurer que la structure existe
  if (!this.pricingData.defaultPricing) {
    this.pricingData.defaultPricing = {
      price: 0,
      minNights: 0,
      platformPrices: {}
    };
  }
  
  // Prix par défaut
  const defaultPriceInput = document.getElementById('default-price-input');
  if (defaultPriceInput) {
    this.pricingData.defaultPricing.price = parseInt(this.getRawValue(defaultPriceInput)) || 0;
  }
  
  // Nuits minimum
  const defaultMinNightsInput = document.getElementById('default-min-nights-input');
  if (defaultMinNightsInput) {
    this.pricingData.defaultPricing.minNights = parseInt(defaultMinNightsInput.value) || 0;
  }
  
  // Prix plateformes
  const platforms = ['airbnb', 'booking', 'gites', 'other'];
  let hasPlatformPrices = false;
  
  platforms.forEach(platform => {
    const input = document.getElementById(`default-${platform}-price-input`);
    if (input) {
      const value = parseInt(this.getRawValue(input)) || 0;
      if (value > 0) {
        if (!this.pricingData.defaultPricing.platformPrices) {
          this.pricingData.defaultPricing.platformPrices = {};
        }
        this.pricingData.defaultPricing.platformPrices[platform] = value;
        hasPlatformPrices = true;
      }
    }
  });
  
  // Si aucun prix plateforme, supprimer l'objet
  if (!hasPlatformPrices && this.pricingData.defaultPricing.platformPrices) {
    delete this.pricingData.defaultPricing.platformPrices;
  }
  
  console.log('✅ defaultPricing mis à jour:', this.pricingData.defaultPricing);
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

    // Restaurer les saisons d'origine
    if (this.propertyData.pricing_data) {
      // 🔧 COPIE PROFONDE pour éviter les références
      this.pricingData = JSON.parse(JSON.stringify(this.propertyData.pricing_data));
    } else {
      // Si pas de données d'origine, réinitialiser à vide
      this.pricingData = {
        seasons: [],
        cleaning: { included: true },
        discounts: [],
        capacity: 4,
        caution: 0,
        acompte: 30
      };
    }
    
    // Réafficher les saisons
    this.hideAllSeasonBlocks();
    this.displayExistingSeasons();

    this.displayDiscounts();
    
    this.prefillDefaultPricing();    
    // 🆕 AJOUTER : Restaurer les options de ménage
    this.prefillCleaningOptions();
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
  
  const originalPricingJson = JSON.stringify(this.propertyData.pricing_data || {});
  const currentPricingJson = JSON.stringify(this.pricingData);
  
  if (originalPricingJson !== currentPricingJson) {
    updates.pricing_data = this.pricingData;
    console.log('📊 Données tarifaires ajoutées aux updates');
  } else {
    console.log('❌ Les données tarifaires sont identiques, pas d\'ajout aux updates');
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
