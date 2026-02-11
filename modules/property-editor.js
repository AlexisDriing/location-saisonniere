// Gestionnaire de la page de modification de logement - Features condition annulation - Plages saisons - Week-ends v4 - prix supplémentaire V3
class PropertyEditor {
  constructor() {
    this.propertyId = null;
    this.propertyData = null;
    this.initialValues = {}; // Stockage de TOUTES les valeurs initiales
    this.editingSeasonIndex = null;
    this.originalImagesGallery = [];
    this.currentImagesGallery = [];
    this.sortableInstance = null;

    this.icalUrls = []; // Stockage des URLs iCal
    this.icalFieldMapping = [
    'url-calendrier',    // Position 0 → Premier iCal
    'ical-booking',      // Position 1 → Deuxième iCal
    'ical-autres',       // Position 2 → Troisième iCal
    'ical-abritel'       // Position 3 → Quatrième iCal
  ];
    this.extras = [];
    this.init();
  }

  // 📍 À AJOUTER après constructor() et avant init()
  showNotification(type, message) {
    // Sélectionner le bon bloc
    const notificationId = type === 'success' ? 'notification-success' : 'notification-error';
    const textId = type === 'success' ? 'success-message-text' : 'error-message-text';
    
    const notification = document.getElementById(notificationId);
    const textElement = document.getElementById(textId);
    
    if (!notification || !textElement) {
      // Fallback si les éléments n'existent pas
      alert(message);
      return;
    }
    
    // Mettre à jour le texte
    textElement.textContent = message;
    
    // Afficher la notification
    notification.style.display = 'flex';
    notification.classList.add('show');
    
    // Fermeture automatique après 3 secondes
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => {
        notification.style.display = 'none';
      }, 300); // Délai pour l'animation de sortie
    }, 3000);
  }
  
  async init() {
    
    // 1. Récupérer l'ID depuis l'URL
  this.propertyId = this.getPropertyIdFromUrl();
  
  if (!this.propertyId) {
    console.error('❌ Aucun ID de logement dans l\'URL');
    return;
  }
  
  
  // 2. Charger les données du logement
  await this.loadPropertyData();
  
  // 3. Si les données sont chargées
  if (this.propertyData) {
    // 🆕 IMPORTANT : Charger les données pricing AVANT prefillForm
    this.loadPricingData();
    
    // ENSUITE seulement pré-remplir les champs
    this.prefillForm();
    this.setupSaveButton();
    this.setupTallyButton();
    // Et finir par l'init des saisons
    this.initSeasonManagement();

    this.initDiscountManagement();
    this.initIcalManagement();
    this.initExtrasManagement();
    this.initImageManagement();
    this.updatePlatformBlocksVisibility();
  }
  this.validationManager = new ValidationManager(this);
    
  window.propertyEditor = this;
}

  getPropertyIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
  }

  async loadPropertyData() {
    try {
      
      const response = await fetch(`${window.CONFIG.API_URL}/property-details-by-id/${this.propertyId}`);
      
      if (!response.ok) {
        throw new Error(`Erreur serveur: ${response.status}`);
      }
      
      this.propertyData = await response.json();
      
    } catch (error) {
      console.error('❌ Erreur chargement:', error);
    }
  }

  initFormFormatters() {
    
    // Attendre que Cleave soit chargé
    if (typeof Cleave === 'undefined') {
      // Le script est déjà dans Webflow, on attend juste qu'il soit prêt
      setTimeout(() => this.initFormFormatters(), 100);
      return;
    }
    
    this.setupDateFormatters();
    this.setupTimeFormatters();
    this.setupSuffixFormatters();

    // 🆕 NOUVEAU : Formater tous les champs au chargement
    setTimeout(() => {
    this.formatAllSuffixFields();
    }, 200);
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
    // Configuration Cleave pour le formatage de base
    const cleaveInstance = new Cleave(input, {
      blocks: [2, 2],
      delimiter: ':',
      numericOnly: true,
      delimiterLazyShow: true
    });
    
    input.placeholder = '00:00';
    
    // Fonction de validation réutilisable
    const validateAndCorrectTime = (value) => {
      if (!value) return value;
      
      // Extraire heures et minutes
      const parts = value.split(':');
      let heures = parseInt(parts[0]) || 0;
      let minutes = parseInt(parts[1]) || 0;
      
      // Appliquer les limites
      heures = Math.min(heures, 23);
      minutes = Math.min(minutes, 59);
      
      // Retourner le format correct
      return heures.toString().padStart(2, '0') + ':' + 
             minutes.toString().padStart(2, '0');
    };
    
    // Validation en temps réel (légère)
    input.addEventListener('input', function(e) {
      let value = e.target.value;
      
      // Validation rapide des heures si on a tapé 3 chiffres sans ':'
      if (value.length === 3 && !value.includes(':')) {
        const heures = parseInt(value.substring(0, 2));
        if (heures > 23) {
          // Insérer le ':' et corriger
          e.target.value = '23:' + value.charAt(2);
          // Mettre à jour Cleave
          cleaveInstance.setRawValue(e.target.value);
        }
      }
    });
    
    // Validation complète au blur
    input.addEventListener('blur', function() {
      let value = this.value;
      
      if (value) {
        // Format court (ex: "14" → "14:00")
        if (value.length <= 2 && !value.includes(':')) {
          value = value + ':00';
        }
        // Format incomplet (ex: "14:" → "14:00")
        else if (value.endsWith(':')) {
          value = value + '00';
        }
        
        // Valider et corriger
        this.value = validateAndCorrectTime(value);
      }
    });
  });
}
  
  setupSuffixFormatters() {
   // Euros
    document.querySelectorAll('[data-suffix="euro"], [data-suffix="euro-nuit"]').forEach(input => {
      // NOUVEAU : Mettre à jour data-raw-value aussi sur input
      input.addEventListener('input', function() {
        const value = this.value.replace(/[^\d]/g, '');
        this.setAttribute('data-raw-value', value || '0');
      });
      
      input.addEventListener('blur', function() {
        const value = this.value.replace(/[^\d]/g, '');
        if (value) {
          this.setAttribute('data-raw-value', value);
          const suffix = this.getAttribute('data-suffix') === 'euro' ? ' €' : ' € / nuit';
          this.value = value + suffix;
        } else {
          this.removeAttribute('data-raw-value');
          this.value = '';
        }
        
        // 🆕 NOUVEAU : Ajouter la validation
        if (window.propertyEditor && window.propertyEditor.validationManager) {
          window.propertyEditor.validationManager.validateFieldOnBlur(this.id);
        }
      });
      
      input.addEventListener('focus', function() {
        const rawValue = this.getAttribute('data-raw-value');
        if (rawValue) {
          this.value = rawValue;
        } else {
          this.value = this.value.replace(/[^\d]/g, '');
        }
      });
    });
  }
  
  getRawValue(input) {
  // D'abord vérifier data-raw-value
  const dataValue = input.getAttribute('data-raw-value');
  if (dataValue) {
    return dataValue;
  }
  
  // Sinon extraire la valeur numérique actuelle
  const currentValue = input.value.replace(/[^\d]/g, '');
  return currentValue || '';
}
  
  getDateValue(input) {
    const dateValue = input.getAttribute('data-date-value');
    if (dateValue && dateValue.includes('/')) {
      return dateValue.replace('/', '-'); // "15/07" → "15-07"
    }
    return null;
  }
  
  getActivePlatforms() {
    const activePlatforms = [];
    
    // Vérifier chaque plateforme
    const platforms = [
      { id: 'airbnb', priceId: 'default-airbnb-price-input', linkId: 'annonce-airbnb-input' },
      { id: 'booking', priceId: 'default-booking-price-input', linkId: 'annonce-booking-input' },
      { id: 'other', priceId: 'default-other-price-input', linkId: 'annonce-gites-input' }
    ];
    
    platforms.forEach(({ id, priceId, linkId }) => {
      const priceInput = document.getElementById(priceId);
      const linkInput = document.getElementById(linkId);
      
      const price = parseInt(this.getRawValue(priceInput)) || 0;
      const link = linkInput?.value?.trim() || '';
      
      // La plateforme est active si elle a un prix ET un lien
      if (price > 0 && link !== '') {
        activePlatforms.push(id);
      }
    });
    
    return activePlatforms;
  }
  
  updatePlatformBlocksVisibility() {
    const activePlatforms = this.getActivePlatforms();
    
    // Pour les deux modales (add et edit)
    ['add', 'edit'].forEach(modalType => {
      const mainBloc = document.getElementById(`bloc-plateforme-${modalType}`);
      
      if (activePlatforms.length === 0) {
        // Aucune plateforme active : masquer le bloc entier
        if (mainBloc) mainBloc.style.display = 'none';
      } else {
        // Au moins une plateforme active : afficher le bloc principal
        if (mainBloc) mainBloc.style.display = 'block';
        
        // Gérer chaque plateforme individuellement
        ['airbnb', 'booking', 'other'].forEach(platform => {
          const platformBloc = document.getElementById(`bloc-${platform}-${modalType}`);
          if (platformBloc) {
            platformBloc.style.display = activePlatforms.includes(platform) ? 'flex' : 'none';
          }
        });
      }
    });
  }
  
  
  prefillForm() {
    
    // 1. Afficher le nom du logement
    const titleElement = document.getElementById('logement-name-edit');
    if (titleElement && this.propertyData.name) {
      titleElement.textContent = this.propertyData.name;
    }

    // NOUVEAU : Pré-remplir aussi l'input de modification du nom
    const nameInput = document.getElementById('name-input');
    if (nameInput && this.propertyData.name) {
      nameInput.value = this.propertyData.name;
    }


    this.displayStatusTag();
    
    // 2. Configuration des champs (facilement extensible)
    const fields = [
      { id: 'name-input', dataKey: 'name' },
      { id: 'cadeaux-input', dataKey: 'cadeaux' },
      { id: 'extras-field', dataKey: 'extras' },
      { id: 'description-logement-input', dataKey: 'description_logement' },
      { id: 'description-alentours-input', dataKey: 'description_alentours' },
      { id: 'code-enregistrement-input', dataKey: 'code_enregistrement' },
      { id: 'site-internet-input', dataKey: 'site_internet' },
      { id: 'inclus-reservation-input', dataKey: 'inclus_reservation' },
      { id: 'hote-input', dataKey: 'host_name' },
      { id: 'email-input', dataKey: 'email' },
      { id: 'telephone-input', dataKey: 'telephone' },
      { id: 'annonce-airbnb-input', dataKey: 'annonce_airbnb' },
      { id: 'annonce-booking-input', dataKey: 'annonce_booking' },
      { id: 'annonce-gites-input', dataKey: 'annonce_gites' },
      { id: 'page-google', dataKey: 'page_google' }
    ];
    
    // 3. Pré-remplir et sauvegarder les valeurs initiales
    fields.forEach(field => {
      const input = document.getElementById(field.id);
      if (input) {
        const value = this.propertyData[field.dataKey] || '';
        input.value = value;
        this.initialValues[field.dataKey] = value;
      }
    });

    this.initialValues.extras = this.propertyData.extras || '';
    this.prefillAddress();
    this.prefillDefaultPricing();

     // NOUVEAU : Pré-remplir les options de ménage
    this.prefillCleaningOptions();
    // NOUVEAU : Pré-remplir l'option prix week-end
    this.prefillWeekendOptions();
    this.prefillExtraGuestsOptions();
    this.prefillHoraires();
    this.prefillCancellationPolicy();
    this.prefillComplexFields();

    // Pré-remplir les autres champs simples
    //this.prefillSimpleFields();
    
    this.setupFieldListeners();
    this.displayImageGallery();
    this.displayHostImage();

    // 🆕 Appliquer l'opacité initiale après un court délai
    setTimeout(() => {
      this.setupPriceOpacityHandlers();
    }, 100);
  }

  // 🆕 NOUVELLE MÉTHODE : Configurer TOUS les boutons Tally avec les paramètres
setupTallyButton() {
  
  // Chercher TOUS les boutons avec l'attribut data-tally-url
  const tallyButtons = document.querySelectorAll('[data-tally-url]');
  
  if (tallyButtons.length === 0) {
    console.log('Pas de bouton Tally sur cette page');
    return;
  }
  
  // Préparer les paramètres à passer aux formulaires
  const params = new URLSearchParams({
    property_id: this.propertyId || '',
    property_name: this.propertyData.name || '',
    email: this.propertyData.email || ''
  });
  
  // Configurer chaque bouton
  tallyButtons.forEach((button, index) => {
    // Récupérer l'URL de base depuis l'attribut de CE bouton
    const tallyBaseUrl = button.dataset.tallyUrl;
    
    if (!tallyBaseUrl) {
      console.warn(`⚠️ Bouton ${index + 1} sans URL Tally`);
      return;
    }
    
    // Construire l'URL finale avec les paramètres
    const finalUrl = `${tallyBaseUrl}?${params.toString()}`;
    
    // Ajouter le listener pour ouvrir le formulaire avec les paramètres
    button.addEventListener('click', function(e) {
      e.preventDefault();
      window.open(finalUrl, '_blank');
    });
  });
}
  
  prefillAddress() {
    
    const address = this.propertyData.address || '';
    
    if (address) {
      // Parser l'adresse "Ville, Pays, Rue"
      const parts = address.split(',').map(part => part.trim());
      
      if (parts.length >= 2) {
        const villeInput = document.getElementById('ville-input');
        const paysInput = document.getElementById('pays-input');
        const rueInput = document.getElementById('rue-input');
        
        if (villeInput) villeInput.value = parts[0] || '';
        if (paysInput) paysInput.value = parts[1] || '';
        if (rueInput) rueInput.value = parts.slice(2).join(', ') || ''; // Au cas où la rue contient des virgules
      }
    }
    
    this.initialValues.address = address;
  }

  // 🆕 NOUVELLE MÉTHODE : Afficher le bon tag selon le statut
  displayStatusTag() {
    const status = this.propertyData.verification_status || 'pending-none';
    
    // Récupérer les deux tags
    const tagPublished = document.getElementById('tag-published');
    const tagPending = document.getElementById('tag-pending');
    
    if (!tagPublished || !tagPending) {
      console.warn('⚠️ Tags de statut non trouvés dans le DOM');
      return;
    }
    
    // Afficher le bon tag selon le statut
    if (status === 'published') {
      tagPublished.style.display = 'block'; // ou 'flex' selon votre CSS
      tagPending.style.display = 'none';
    } else {
      tagPublished.style.display = 'none';
      tagPending.style.display = 'block'; // ou 'flex' selon votre CSS
    }
  }
    
  initSeasonManagement() {
    
    // Initialiser les formatters
    this.initFormFormatters();
    
    // Configuration des boutons
    this.setupSeasonButtons();

    this.setupSeasonPeriodButtons();
    
    // Cacher tous les blocs saison par défaut
    this.hideAllSeasonBlocks();
    
    // Afficher les saisons existantes
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
      caution: '',
      acompte: 0
    };
  }
  
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
    
    if (this.pricingData && this.pricingData.seasons && this.pricingData.seasons.length > 0) {

      
      this.pricingData.seasons.forEach((season, index) => {

        this.displaySeasonBlock(season, index);
      });
    } else {
      console.log('❌ Aucune saison à afficher');
    }
  }
  
  displaySeasonBlock(season, index) {
    const seasonNum = index + 1;

    
    const seasonBlock = document.getElementById(`season-${seasonNum}`);
    
    if (!seasonBlock) {
      console.log(`❌ Bloc season-${seasonNum} non trouvé dans le DOM`);
      return;
    }
    

    seasonBlock.style.display = 'flex'; // ou 'block' selon votre CSS
    
    // Utiliser des IDs uniques avec le numéro
    const nameElement = document.getElementById(`name-season-${seasonNum}`);
    if (nameElement) {
      nameElement.textContent = season.name;

    } else {
      console.log(`❌ Élément name-season-${seasonNum} non trouvé`);
    }
    
    const priceElement = document.getElementById(`prix-nuit-season-${seasonNum}`);
    if (priceElement) {
      priceElement.textContent = season.price;
    }
    
    // Prix par semaine
    const weekPriceElement = document.getElementById(`prix-semaine-season-${seasonNum}`);
    if (weekPriceElement) {
      const weekPrice = this.calculateWeekPrice(season.price, this.pricingData.discounts);
      weekPriceElement.textContent = weekPrice;
    }
    
    // Dates — trier chronologiquement puis afficher avec séparateur " - "
    const datesElement = document.getElementById(`dates-season-${seasonNum}`);
    if (datesElement && season.periods && season.periods.length > 0) {
      // Trier les périodes chronologiquement pour l'affichage
      const sortedPeriods = [...season.periods].sort((a, b) => {
        const [dayA, monthA] = a.start.split('-').map(Number);
        const [dayB, monthB] = b.start.split('-').map(Number);
        return (monthA * 100 + dayA) - (monthB * 100 + dayB);
      });
      
      const dateRanges = sortedPeriods.map(period => 
        this.formatDateRange(period.start, period.end)
      );
      datesElement.textContent = dateRanges.join(" - ");
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

  calculateWeekPrice(nightlyPrice, discounts) {
      let weekPrice = nightlyPrice * 7;
      
      if (discounts && discounts.length > 0) {
        const applicableDiscounts = discounts.filter(discount => discount.nights <= 7);
  
        if (applicableDiscounts.length > 0) {
          // Trier par nombre de nuits décroissant pour prendre la plus élevée
          applicableDiscounts.sort((a, b) => b.nights - a.nights);
          
          // Prendre la première (qui sera la plus élevée après le tri)
          const weekDiscount = applicableDiscounts[0];
          weekPrice = weekPrice * (1 - weekDiscount.percentage / 100);
        }
      }
      
      return Math.round(weekPrice);
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
        this.openEditSeasonModal(i - 1);
      });
    }
    
    // 🆕 NOUVEAU : Boutons supprimer pour chaque saison
    const deleteBtn = document.getElementById(`delete-${i}`);
    if (deleteBtn) {
      deleteBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.removeSeason(i - 1);
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

  // === GESTION DES PLAGES DE DATES MULTIPLES ===

setupSeasonPeriodButtons() {
  // --- Modal AJOUT ---
  const addPlageBtn = document.getElementById('btn-add-plage-dates');
  if (addPlageBtn) {
    addPlageBtn.addEventListener('click', (e) => {
      e.preventDefault();
      this.addPlageDates(false);
    });
  }
  
  // Boutons supprimer pour plages 2 à 5 (modal ajout)
  for (let i = 2; i <= 5; i++) {
    const deleteBtn = document.getElementById(`btn-delete-plage-${i}`);
    if (deleteBtn) {
      deleteBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.removePlageDates(i, false);
      });
    }
  }

  // --- Modal EDIT ---
  const addPlageBtnEdit = document.getElementById('btn-add-plage-dates-edit');
  if (addPlageBtnEdit) {
    addPlageBtnEdit.addEventListener('click', (e) => {
      e.preventDefault();
      this.addPlageDates(true);
    });
  }
  
  // Boutons supprimer pour plages 2 à 5 (modal edit)
  for (let i = 2; i <= 5; i++) {
    const deleteBtn = document.getElementById(`btn-delete-plage-${i}-edit`);
    if (deleteBtn) {
      deleteBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.removePlageDates(i, true);
      });
    }
  }
}

addPlageDates(isEdit = false) {
  const suffix = isEdit ? '-edit' : '';
  
  // Trouver le prochain bloc masqué
  for (let i = 2; i <= 5; i++) {
    const block = document.getElementById(`bloc-plage-dates-${i}${suffix}`);
    if (block && block.style.display === 'none') {
      block.style.display = 'flex'; // ou '' selon votre CSS
      
      // Initialiser les formatters Cleave sur les nouveaux inputs
      const startInput = document.getElementById(`season-date-start-input-${i}${suffix}`);
      const endInput = document.getElementById(`season-date-end-input-${i}${suffix}`);
      if (this.initFormFormatters) {
        this.initFormFormatters();
      }
      
      break;
    }
  }
  
  // Masquer le bouton "Ajouter" si on atteint 5 plages
  const visibleCount = this.countVisiblePlages(isEdit);
  if (visibleCount >= 5) {
    const addBtn = document.getElementById(`btn-add-plage-dates${suffix}`);
    if (addBtn) addBtn.style.display = 'none';
  }
}

removePlageDates(index, isEdit = false) {
  const suffix = isEdit ? '-edit' : '';
  const block = document.getElementById(`bloc-plage-dates-${index}${suffix}`);
  
  if (block) {
    // Vider les inputs
    const startInput = document.getElementById(`season-date-start-input-${index}${suffix}`);
    const endInput = document.getElementById(`season-date-end-input-${index}${suffix}`);
    
    [startInput, endInput].forEach(input => {
      if (input) {
        input.value = '';
        input.removeAttribute('data-raw-value');
        input.removeAttribute('data-date-value');
      }
    });
    
    // Masquer le bloc
    block.style.display = 'none';
    
    // Nettoyer les erreurs éventuelles
    if (this.validationManager) {
      this.validationManager.hideFieldError(`season-date-start-input-${index}${suffix}`);
      this.validationManager.hideFieldError(`season-date-end-input-${index}${suffix}`);
    }
  }
  
  // Réafficher le bouton "Ajouter"
  const addBtn = document.getElementById(`btn-add-plage-dates${suffix}`);
  if (addBtn) addBtn.style.display = '';
}

countVisiblePlages(isEdit = false) {
  const suffix = isEdit ? '-edit' : '';
  let count = 0;
  for (let i = 1; i <= 5; i++) {
    const block = document.getElementById(`bloc-plage-dates-${i}${suffix}`);
    if (block && block.style.display !== 'none') {
      count++;
    }
  }
  return count;
}

  displayHostImage() {    
    // Récupérer l'URL de l'image hôte
    const hostImageUrl = this.propertyData.host_image || '';
    
    // Récupérer les blocs
    const blocEmptyHote = document.getElementById('bloc-empty-hote');
    const blocHote = document.getElementById('bloc-hote');
    
    if (!hostImageUrl || hostImageUrl.trim() === '') {
      // Pas d'image hôte : afficher empty, masquer bloc hôte
      if (blocEmptyHote) blocEmptyHote.style.display = 'flex';
      if (blocHote) blocHote.style.display = 'none';
    } else {
      // Il y a une image : masquer empty, afficher bloc hôte
      if (blocEmptyHote) blocEmptyHote.style.display = 'none';
      if (blocHote) {
        blocHote.style.display = 'flex';
        
        // NOUVEAU : Mettre à jour l'image dans le bloc avec l'ID "image-hote"
        const imageHoteElement = document.getElementById('image-hote');
        if (imageHoteElement) {
          // Si c'est directement une image
          if (imageHoteElement.tagName === 'IMG') {
            imageHoteElement.src = hostImageUrl;
            imageHoteElement.alt = 'Photo de l\'hôte';
          } 
          // Si c'est un conteneur avec une image dedans
          else {
            const imgElement = imageHoteElement.querySelector('img');
            if (imgElement) {
              imgElement.src = hostImageUrl;
              imgElement.alt = 'Photo de l\'hôte';
            }
          }
        }
      }
    }
  }

  
  displayImageGallery() { 
  // Récupérer les images depuis propertyData
  const imagesGallery = this.propertyData.images_gallery || [];

  // Gérer l'affichage du bloc empty ET du bloc photos
  const blocEmpty = document.getElementById('bloc-empty-photos');
  const blocPhotos = document.getElementById('bloc-photos-logement');
  
  if (!Array.isArray(imagesGallery) || imagesGallery.length === 0) {
    // Pas d'images : afficher empty, masquer photos
    if (blocEmpty) blocEmpty.style.display = 'flex';
    if (blocPhotos) blocPhotos.style.display = 'none';
  } else {
    // Il y a des images : masquer empty, afficher photos
    if (blocEmpty) blocEmpty.style.display = 'none';
    if (blocPhotos) blocPhotos.style.display = 'block';
  }
  // Masquer tous les blocs image par défaut
  for (let i = 1; i <= 20; i++) {
    const imageBlock = document.getElementById(`image-block-${i}`);
    if (imageBlock) {
      imageBlock.style.display = 'none';
    }
  }
  
  if (!Array.isArray(imagesGallery) || imagesGallery.length === 0) {
    return;
  }
  
  
  // Afficher chaque image (max 20)
  const maxImages = Math.min(imagesGallery.length, 20);
  
  for (let i = 0; i < maxImages; i++) {
    const imageData = imagesGallery[i];
    const imageBlock = document.getElementById(`image-block-${i + 1}`);
    
    if (imageBlock && imageData) {
      // Extraire l'URL de l'image
      let imageUrl = null;
      
      // Format Webflow v2 API
      if (typeof imageData === 'object' && imageData.url) {
        imageUrl = imageData.url;
      } 
      // Si c'est directement une URL string
      else if (typeof imageData === 'string') {
        imageUrl = imageData;
      }
      
      if (imageUrl) {
        // Chercher l'élément img dans le bloc
        const imgElement = imageBlock.querySelector('img');
        
        if (imgElement) {
          imgElement.src = imageUrl;
          imgElement.alt = `Image ${i + 1}`;
          
          // Optionnel : Ajouter lazy loading pour performance
          if (i > 3) { // Lazy load après les 4 premières images
            imgElement.loading = 'lazy';
          }
        }
        
        // Afficher le bloc
        imageBlock.style.display = 'block'; // ou 'flex' selon votre CSS
      }
    }
  }
}

  openAddSeasonModal() {
    // Vérifier qu'on a moins de 4 saisons
    if (this.pricingData.seasons.length >= 4) {
      this.showNotification('error', 'Maximum 4 saisons autorisées');
      return;
    }
    
    // Réinitialiser les champs de la modal
    this.resetSeasonModal();
    
    // NOUVEAU : Mettre à jour la visibilité des blocs plateformes
    this.updatePlatformBlocksVisibility();
    
    // Configurer les listeners de validation
    this.setupSeasonValidationListeners(false);
    
    // Votre code pour afficher la modal
    const modal = document.getElementById('modal-add-season'); // Adaptez l'ID
    if (modal) {
      modal.style.display = 'flex';
    }
  }

  // 🆕 Ouvrir la modal de modification
openEditSeasonModal(seasonIndex) {

  this.resetEditSeasonModal();
  
  // Vérifier que la saison existe
  if (!this.pricingData.seasons[seasonIndex]) {
    console.error('❌ Saison non trouvée à l\'index', seasonIndex);
    return;
  }

  this.updatePlatformBlocksVisibility();
  
  // NOUVEAU : Nettoyer les erreurs de la modal de modification uniquement
  if (this.validationManager) {
    const editModalFields = [
      'season-name-input-edit',
      'season-date-start-input-edit',
      'season-date-end-input-edit',
      'season-price-input-edit',
      'season-min-nights-input-edit',
      'season-airbnb-price-input-edit',
      'season-booking-price-input-edit',
      'season-other-price-input-edit'
    ];
    
    editModalFields.forEach(id => {
      this.validationManager.hideFieldError(id);
    });
  }
  
  // Stocker l'index de la saison en cours de modification
  this.editingSeasonIndex = seasonIndex;
  const season = this.pricingData.seasons[seasonIndex];
  
  // Pré-remplir les champs avec les valeurs actuelles
  const nameInput = document.getElementById('season-name-input-edit');
  if (nameInput) nameInput.value = season.name;
  
  // Pré-remplir TOUTES les plages de dates
  if (season.periods && season.periods.length > 0) {
    season.periods.forEach((period, i) => {
      const index = i + 1; // bloc-plage-dates-1, bloc-plage-dates-2, etc.
      
      // Afficher le bloc si i > 0 (le bloc 1 est toujours visible)
      if (index > 1) {
        const block = document.getElementById(`bloc-plage-dates-${index}-edit`);
        if (block) block.style.display = 'flex'; // ou '' selon votre CSS
      }
      
      const startInput = document.getElementById(`season-date-start-input-${index}-edit`);
      const endInput = document.getElementById(`season-date-end-input-${index}-edit`);
      
      if (startInput) {
        const [day, month] = period.start.split('-');
        startInput.value = `${day}/${month}`;
        startInput.setAttribute('data-date-value', `${day}/${month}`);
      }
      
      if (endInput) {
        const [day, month] = period.end.split('-');
        endInput.value = `${day}/${month}`;
        endInput.setAttribute('data-date-value', `${day}/${month}`);
      }
    });

    // Masquer le bouton "Ajouter" si 5 plages
    if (season.periods.length >= 5) {
      const addBtn = document.getElementById('btn-add-plage-dates-edit');
      if (addBtn) addBtn.style.display = 'none';
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

  // NOUVEAU : Pré-remplir les prix plateformes
  if (season.platformPrices) {
    const platformInputs = {
      'season-airbnb-price-input-edit': season.platformPrices.airbnb || 0,
      'season-booking-price-input-edit': season.platformPrices.booking || 0,
      'season-other-price-input-edit': season.platformPrices.other || 0
    };
    
    Object.entries(platformInputs).forEach(([inputId, value]) => {
      const input = document.getElementById(inputId);
      if (input) {
        input.value = value;
        input.setAttribute('data-raw-value', value);
      }
    });
  }
  
  // Configurer les listeners de validation
  this.setupSeasonValidationListeners(true);
  
  // Afficher la modal
  const modal = document.getElementById('modal-edit-season'); // Adaptez l'ID selon votre modal
  if (modal) {
    modal.style.display = 'flex';
  }
}
  
resetSeasonModal() {
  const fields = [
    'season-name-input',
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

  // Réinitialiser TOUTES les plages de dates (1 à 5)
  for (let i = 1; i <= 5; i++) {
    const startInput = document.getElementById(`season-date-start-input-${i}`);
    const endInput = document.getElementById(`season-date-end-input-${i}`);
    
    [startInput, endInput].forEach(input => {
      if (input) {
        input.value = '';
        input.removeAttribute('data-raw-value');
        input.removeAttribute('data-date-value');
      }
    });

    // Masquer les blocs 2 à 5, garder le bloc 1 visible
    if (i > 1) {
      const block = document.getElementById(`bloc-plage-dates-${i}`);
      if (block) block.style.display = 'none';
    }
  }

  // Réafficher le bouton "Ajouter une plage"
  const addBtn = document.getElementById('btn-add-plage-dates');
  if (addBtn) addBtn.style.display = '';

  // Réinitialiser les prix plateformes
  const platformIds = [
    'season-airbnb-price-input',
    'season-booking-price-input',
    'season-other-price-input'
  ];
  platformIds.forEach(id => {
    const input = document.getElementById(id);
    if (input) {
      input.value = '';
      input.removeAttribute('data-raw-value');
    }
  });
}

validateAndAddSeason() {
  
  // Validation complète avec ValidationManager
  if (this.validationManager && !this.validationManager.validateSeason(false)) {
    console.log('❌ Validation échouée');
    return;
  }
  
  // Récupérer les valeurs des champs
  const seasonData = this.getSeasonFormData();
  
  // Créer l'objet saison pour le JSON
  // Trier les périodes chronologiquement (par mois de début)
  const sortedPeriods = [...seasonData.periods].sort((a, b) => {
    const [dayA, monthA] = a.start.split('-').map(Number);
    const [dayB, monthB] = b.start.split('-').map(Number);
    return (monthA * 100 + dayA) - (monthB * 100 + dayB);
  });

  const newSeason = {
    name: seasonData.name,
    price: parseInt(seasonData.price),
    minNights: parseInt(seasonData.minNights) || 1,
    periods: sortedPeriods
  };
  
  // NOUVEAU : Ajouter les prix plateformes s'ils existent
  const airbnb = parseInt(seasonData.airbnbPrice) || 0;
  const booking = parseInt(seasonData.bookingPrice) || 0;
  const other = parseInt(seasonData.otherPrice) || 0;
  
  if (airbnb > 0 || booking > 0 || other > 0) {
    newSeason.platformPrices = {
      airbnb: airbnb,
      booking: booking,
      other: other
    };
  }
  
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
  
  // Vérifier qu'on a bien un index
  if (this.editingSeasonIndex === undefined || this.editingSeasonIndex === null) {
    console.error('❌ Aucune saison en cours de modification');
    return;
  }
  
  // Validation complète avec ValidationManager
  if (this.validationManager && !this.validationManager.validateSeason(true)) {
    console.log('❌ Validation échouée');
    return;
  }
  
  // Récupérer les valeurs des champs
  const seasonData = this.getEditSeasonFormData();
  
  // Mettre à jour la saison existante
  // Trier les périodes chronologiquement
  const sortedPeriods = [...seasonData.periods].sort((a, b) => {
    const [dayA, monthA] = a.start.split('-').map(Number);
    const [dayB, monthB] = b.start.split('-').map(Number);
    return (monthA * 100 + dayA) - (monthB * 100 + dayB);
  });

  const updatedSeason = {
    name: seasonData.name,
    price: parseInt(seasonData.price),
    minNights: parseInt(seasonData.minNights) || 1,
    periods: sortedPeriods
  };
  
  // NOUVEAU : Ajouter les prix plateformes s'ils existent
  const airbnb = parseInt(seasonData.airbnbPrice) || 0;
  const booking = parseInt(seasonData.bookingPrice) || 0;
  const other = parseInt(seasonData.otherPrice) || 0;
  
  if (airbnb > 0 || booking > 0 || other > 0) {
    updatedSeason.platformPrices = {
      airbnb: airbnb,
      booking: booking,
      other: other
    };
  }
  
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
  // Récupérer toutes les plages de dates visibles
  const periods = [];
  for (let i = 1; i <= 5; i++) {
    const startInput = document.getElementById(`season-date-start-input-${i}`);
    const endInput = document.getElementById(`season-date-end-input-${i}`);
    
    // Vérifier que le bloc est visible (pas display:none)
    const block = document.getElementById(`bloc-plage-dates-${i}`);
    if (!block || block.style.display === 'none') continue;
    
    const start = this.getDateValue(startInput);
    const end = this.getDateValue(endInput);
    
    if (start && end) {
      periods.push({ start, end });
    }
  }

  return {
    name: document.getElementById('season-name-input')?.value.trim(),
    periods: periods,
    price: this.getRawValue(document.getElementById('season-price-input')),
    minNights: this.getRawValue(document.getElementById('season-min-nights-input')) || '1',
    airbnbPrice: this.getRawValue(document.getElementById('season-airbnb-price-input')) || '0',
    bookingPrice: this.getRawValue(document.getElementById('season-booking-price-input')) || '0',
    otherPrice: this.getRawValue(document.getElementById('season-other-price-input')) || '0'
  };
}

  // 🆕 Récupérer les données du formulaire de modification
getEditSeasonFormData() {
  // Récupérer toutes les plages de dates visibles
  const periods = [];
  for (let i = 1; i <= 5; i++) {
    const startInput = document.getElementById(`season-date-start-input-${i}-edit`);
    const endInput = document.getElementById(`season-date-end-input-${i}-edit`);
    
    // Vérifier que le bloc est visible
    const block = document.getElementById(`bloc-plage-dates-${i}-edit`);
    if (!block || block.style.display === 'none') continue;
    
    const start = this.getDateValue(startInput);
    const end = this.getDateValue(endInput);
    
    if (start && end) {
      periods.push({ start, end });
    }
  }

  return {
    name: document.getElementById('season-name-input-edit')?.value.trim(),
    periods: periods,
    price: this.getRawValue(document.getElementById('season-price-input-edit')),
    minNights: this.getRawValue(document.getElementById('season-min-nights-input-edit')) || '1',
    airbnbPrice: this.getRawValue(document.getElementById('season-airbnb-price-input-edit')) || '0',
    bookingPrice: this.getRawValue(document.getElementById('season-booking-price-input-edit')) || '0',
    otherPrice: this.getRawValue(document.getElementById('season-other-price-input-edit')) || '0'
  };
}
  
closeSeasonModal() {
  const modal = document.getElementById('modal-add-season');
  if (modal) {
    modal.style.display = 'none';
  }
  this.resetSeasonModal();
  
  // Nettoyer les erreurs
  if (this.validationManager) {
    ['season-name-input', 'season-date-start-input', 'season-date-end-input', 
     'season-price-input', 'season-min-nights-input',
     'season-airbnb-price-input', 'season-booking-price-input', 'season-other-price-input'].forEach(id => {
      this.validationManager.hideFieldError(id);
    });
  }
}

  // 🆕 Fermer la modal de modification
  closeEditSeasonModal() {
    const modal = document.getElementById('modal-edit-season');
    if (modal) {
      modal.style.display = 'none';
    }
    
    // NOUVEAU : Nettoyer toutes les erreurs de la modal de modification
    if (this.validationManager) {
      const editModalFields = [
        'season-name-input-edit',
        'season-date-start-input-edit',
        'season-date-end-input-edit',
        'season-price-input-edit',
        'season-min-nights-input-edit',
        'season-airbnb-price-input-edit',
        'season-booking-price-input-edit',
        'season-other-price-input-edit'
      ];
      
      editModalFields.forEach(id => {
        this.validationManager.hideFieldError(id);
      });
    }
    
    this.resetEditSeasonModal();
    this.editingSeasonIndex = null;
  }

// 🆕 Réinitialiser les champs de la modal de modification
resetEditSeasonModal() {
  const fields = [
    'season-name-input-edit',
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

  // Réinitialiser TOUTES les plages de dates (1 à 5)
  for (let i = 1; i <= 5; i++) {
    const startInput = document.getElementById(`season-date-start-input-${i}-edit`);
    const endInput = document.getElementById(`season-date-end-input-${i}-edit`);
    
    [startInput, endInput].forEach(input => {
      if (input) {
        input.value = '';
        input.removeAttribute('data-raw-value');
        input.removeAttribute('data-date-value');
      }
    });

    // Masquer les blocs 2 à 5, garder le bloc 1 visible
    if (i > 1) {
      const block = document.getElementById(`bloc-plage-dates-${i}-edit`);
      if (block) block.style.display = 'none';
    }
  }

  // Réafficher le bouton "Ajouter une plage"
  const addBtn = document.getElementById('btn-add-plage-dates-edit');
  if (addBtn) addBtn.style.display = '';

  const platformIds = [
    'season-airbnb-price-input-edit',
    'season-booking-price-input-edit',
    'season-other-price-input-edit'
  ];
  platformIds.forEach(id => {
    const input = document.getElementById(id);
    if (input) {
      input.value = '';
      input.removeAttribute('data-raw-value');
    }
  });
}

// 🆕 NOUVELLE MÉTHODE : Supprimer une saison
removeSeason(index) {
  
  // Supprimer du tableau
  this.pricingData.seasons.splice(index, 1);
  
  // Réafficher toutes les saisons (gère automatiquement la réorganisation)
  this.hideAllSeasonBlocks();
  this.displayExistingSeasons();
  
  // Activer les boutons de sauvegarde
  this.enableButtons();
}

  
  setupSeasonValidationListeners(isEdit = false) {
    const suffix = isEdit ? '-edit' : '';
    
    // Prix direct - validation au blur seulement
    const priceInput = document.getElementById(`season-price-input${suffix}`);
    if (priceInput) {
      priceInput.addEventListener('blur', () => {
        if (this.validationManager) {
          const price = parseInt(this.getRawValue(priceInput)) || 0;
          if (price > 0) {
            this.validationManager.validateSeasonPlatformPrices(price, suffix);
          }
        }
      });
    }

    // 🆕 NOUVEAU : Nuits minimum - ajouter un listener pour mettre à jour data-raw-value
    const minNightsInput = document.getElementById(`season-min-nights-input${suffix}`);
    if (minNightsInput) {
      minNightsInput.addEventListener('input', (e) => {
        const value = e.target.value.replace(/[^\d]/g, '');
        e.target.setAttribute('data-raw-value', value || '1');
      });
    }
    
    // Prix plateformes - validation au blur seulement
    ['airbnb', 'booking', 'other'].forEach(platform => {
      const input = document.getElementById(`season-${platform}-price-input${suffix}`);
      if (input) {
        input.addEventListener('blur', () => {
          if (this.validationManager) {
            const directPrice = parseInt(this.getRawValue(priceInput)) || 0;
            if (directPrice > 0) {
              this.validationManager.validateSeasonPlatformPrices(directPrice, suffix);
            }
          }
        });
      }
    });
  }

  
  prefillDefaultPricing() {
  
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
    const platforms = ['airbnb', 'booking', 'other'];
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

prefillComplexFields() {
  // MODE DE LOCATION (Radio buttons)
  const modeLocation = this.propertyData.mode_location || '';
  if (modeLocation) {
    // Chercher le radio button correspondant
    const radios = document.querySelectorAll('input[name="mode-location"]');
    radios.forEach(radio => {
      if (radio.value === modeLocation) {
        radio.checked = true;
        // Mettre à jour le visuel Webflow
        const label = radio.closest('.w-radio');
        if (label) {
          // Retirer la classe checked de tous
          document.querySelectorAll('input[name="mode-location"]').forEach(r => {
            r.closest('.w-radio')?.querySelector('.w-radio-input')?.classList.remove('w--redirected-checked');
          });
          // Ajouter sur le bon
          label.querySelector('.w-radio-input')?.classList.add('w--redirected-checked');
        }
      }
    });
  }
  this.initialValues.mode_location = modeLocation;
  
  // ÉQUIPEMENTS PRINCIPAUX (Checkboxes)
  const equipements = this.propertyData.equipements_principaux || [];
  const equipementsArray = Array.isArray(equipements) ? equipements : [];
  
  // Mapping des valeurs aux IDs des checkboxes
  const equipementsMapping = {
    'Piscine': 'checkbox-piscine',
    'Jacuzzi': 'checkbox-jacuzzi',
    'Barbecue': 'checkbox-barbecue',
    'Climatisation': 'checkbox-climatisation',
    'Équipement bébé': 'checkbox-equipement-bebe',
    'Parking gratuit': 'checkbox-parking',
    'Wifi': 'checkbox-wifi',
    'Four': 'checkbox-four',
    'Lave-vaisselle': 'checkbox-lave-vaisselle',
    'Sèche-linge': 'checkbox-seche-linge',
    'Machine à laver': 'checkbox-machine-a-laver'
  };
  
  // Cocher les bonnes cases
  Object.entries(equipementsMapping).forEach(([value, id]) => {
    const checkbox = document.getElementById(id);
    if (checkbox) {
      checkbox.checked = equipementsArray.includes(value);
      // Mettre à jour le visuel Webflow
      const checkboxDiv = checkbox.previousElementSibling;
      if (checkboxDiv && checkboxDiv.classList.contains('w-checkbox-input')) {
        if (checkbox.checked) {
          checkboxDiv.classList.add('w--redirected-checked');
        } else {
          checkboxDiv.classList.remove('w--redirected-checked');
        }
      }
    }
  });
  this.initialValues.equipements_principaux = equipementsArray;
  
  // OPTIONS D'ACCUEIL (Checkboxes)
  const options = this.propertyData.options_accueil || [];
  const optionsArray = Array.isArray(options) ? options : [];
  
  const optionsMapping = {
    'Animaux autorisés': 'checkbox-animaux',
    'Accès PMR': 'checkbox-pmr',
    'Fumeurs autorisés': 'checkbox-fumeurs'
  };
  
  Object.entries(optionsMapping).forEach(([value, id]) => {
    const checkbox = document.getElementById(id);
    if (checkbox) {
      checkbox.checked = optionsArray.includes(value);
      // Mettre à jour le visuel Webflow
      const checkboxDiv = checkbox.previousElementSibling;
      if (checkboxDiv && checkboxDiv.classList.contains('w-checkbox-input')) {
        if (checkbox.checked) {
          checkboxDiv.classList.add('w--redirected-checked');
        } else {
          checkboxDiv.classList.remove('w--redirected-checked');
        }
      }
    }
  });
  this.initialValues.options_accueil = optionsArray;

  // NOUVEAU : MODES DE PAIEMENT (Checkboxes)
  const modesPaiement = this.propertyData.mode_paiement || [];
  const modesPaiementArray = Array.isArray(modesPaiement) ? modesPaiement : [];
  
  const modesPaiementMapping = {
    'Visa': 'checkbox-visa',
    'Espèces': 'checkbox-especes',
    'MasterCard': 'checkbox-mastercard',
    'Virement bancaire': 'checkbox-virement',
    'PayPal': 'checkbox-paypal',
    'PayLib': 'checkbox-paylib',
    'American Express': 'checkbox-amex',
    'Chèques acceptés': 'checkbox-cheques',
    'Chèques-vacances': 'checkbox-cheques-vacances'
  };
  
  Object.entries(modesPaiementMapping).forEach(([value, id]) => {
    const checkbox = document.getElementById(id);
    if (checkbox) {
      checkbox.checked = modesPaiementArray.includes(value);
      // Mettre à jour le visuel Webflow
      const checkboxDiv = checkbox.previousElementSibling;
      if (checkboxDiv && checkboxDiv.classList.contains('w-checkbox-input')) {
        if (checkbox.checked) {
          checkboxDiv.classList.add('w--redirected-checked');
        } else {
          checkboxDiv.classList.remove('w--redirected-checked');
        }
      }
    }
  });
  this.initialValues.mode_paiement = modesPaiementArray;
  this.prefillCautionAcompte();
  this.prefillTailleMaison();
}

  prefillCautionAcompte() {  
  // Récupérer les valeurs depuis le JSON pricing
  const caution = this.pricingData?.caution || '';
  const acompte = this.pricingData?.acompte || 0;
  
  // Remplir les inputs
  const cautionInput = document.getElementById('caution-input');
  const acompteInput = document.getElementById('acompte-input');
  
  if (cautionInput) {
    cautionInput.value = caution;
    cautionInput.setAttribute('data-raw-value', caution);
    // S'assurer que l'attribut est là pour votre système
    cautionInput.setAttribute('data-suffix', 'euro');
  }
  
  if (acompteInput) {
    acompteInput.value = acompte;
    acompteInput.setAttribute('data-raw-value', acompte);
    // S'assurer que l'attribut est là pour votre système
    acompteInput.setAttribute('data-suffix', 'pourcent');
  }
  
  // Sauvegarder la valeur initiale du champ texte
  this.initialValues.conditions_reservation = this.propertyData.conditions_reservation || '';
  this.initialValues.caution = caution;
  this.initialValues.acompte = acompte;
  
}
  
prefillTailleMaison() {  
  const tailleStr = this.propertyData.taille_maison || '';
  
  // Parser la chaîne...
  const regex = /(\d+)\s*voyageur[s]?\s*-\s*(\d+)\s*chambre[s]?\s*-\s*(\d+)\s*lit[s]?\s*-\s*(\d+)\s*salle[s]?\s*de\s*bain/i;
  const match = tailleStr.match(regex);
  
  let values = {
    voyageurs: 0,
    chambres: 0,
    lits: 0,
    salles_bain: 0
  };
  
  if (match) {
    values.voyageurs = parseInt(match[1]) || 0;
    values.chambres = parseInt(match[2]) || 0;
    values.lits = parseInt(match[3]) || 0;
    values.salles_bain = parseInt(match[4]) || 0;
  }
  
  // NOUVEAU : Si pas de match mais qu'on a une capacity dans pricingData
  if (!match && this.pricingData && this.pricingData.capacity) {
    values.voyageurs = this.pricingData.capacity;
  }
  
  // Remplir les inputs...
  const voyageursInput = document.getElementById('voyageurs-input');
  const chambresInput = document.getElementById('chambres-input');
  const litsInput = document.getElementById('lits-input');
  const sallesBainInput = document.getElementById('salles-bain-input');
  
  if (voyageursInput) voyageursInput.value = values.voyageurs;
  if (chambresInput) chambresInput.value = values.chambres;
  if (litsInput) litsInput.value = values.lits;
  if (sallesBainInput) sallesBainInput.value = values.salles_bain;
  
  // Sauvegarder les valeurs initiales
  this.initialValues.taille_maison = tailleStr;
  this.initialValues.taille_maison_values = values;
  
  // IMPORTANT : S'assurer que pricingData.capacity est synchronisé
  if (this.pricingData) {
    // Prioriser la valeur parsée de taille_maison
    if (values.voyageurs > 0) {
      this.pricingData.capacity = values.voyageurs;
    } else if (!this.pricingData.capacity) {
      // Si pas de voyageurs dans la chaîne ET pas de capacity, mettre 1 par défaut
      this.pricingData.capacity = 1;
    }
  }
}

prefillHoraires() {  
  const horairesStr = this.propertyData.horaires_arrivee_depart || '';
  
  let heureArrivee = '';
  let heureDepart = '';
  
  if (horairesStr) {
    const horaires = horairesStr.split(',').map(h => h.trim());
    
    if (horaires.length === 2) {
      // Nouveau format HH:MM
      if (horaires[0].includes(':')) {
        heureArrivee = horaires[0];
        heureDepart = horaires[1];
      } else {
        // Ancien format (juste les heures)
        heureArrivee = horaires[0].padStart(2, '0') + ':00';
        heureDepart = horaires[1].padStart(2, '0') + ':00';
      }
    }
  }
  
  const arriveeInput = document.getElementById('heure-arrivee-input');
  const departInput = document.getElementById('heure-depart-input');
  
  if (arriveeInput) {
    arriveeInput.value = heureArrivee;
    arriveeInput.setAttribute('data-format', 'heure-minute');
  }
  if (departInput) {
    departInput.value = heureDepart;
    departInput.setAttribute('data-format', 'heure-minute');
  }
  
  this.initialValues.horaires_arrivee_depart = horairesStr;
}


prefillCancellationPolicy() {
  const value = this.propertyData.conditions_annulation || '';
  const predefinedPolicies = ['flexible', 'moderate', 'limited', 'strict'];
  const customBloc = document.getElementById('bloc-custom-annulation');
  const textarea = document.getElementById('conditions-annulation-input');
  
  // Déterminer si c'est un choix prédéfini ou du texte custom
  let selectedPolicy;
  
  if (predefinedPolicies.includes(value)) {
    selectedPolicy = value;
    if (customBloc) customBloc.style.display = 'none';
  } else {
    // Texte libre (ancien format ou personnalisé)
    selectedPolicy = 'custom';
    if (customBloc) customBloc.style.display = 'block';
    if (textarea) textarea.value = value;
  }
  
  // Cocher le bon radio button
  const radio = document.getElementById(`radio-${selectedPolicy}`);
  if (radio) {
    radio.checked = true;
    // Mettre à jour le visuel Webflow
    document.querySelectorAll('input[name="cancellation-policy"]').forEach(r => {
      r.closest('.w-radio')?.querySelector('.w-radio-input')?.classList.remove('w--redirected-checked');
    });
    radio.closest('.w-radio')?.querySelector('.w-radio-input')?.classList.add('w--redirected-checked');
  }
  
  // Sauvegarder la valeur initiale
  this.initialValues.conditions_annulation = value;
}

  
// 🆕 NOUVELLE MÉTHODE : Pré-remplir les options de ménage
prefillCleaningOptions() {
  
  // Récupérer les éléments du DOM
  const includedRadio = document.getElementById('inclus');
  const notIncludedRadio = document.getElementById('non-inclus');
  const optionalRadio = document.getElementById('option');
  const priceInput = document.getElementById('cleaning-price-input');
  
  if (!includedRadio || !notIncludedRadio || !optionalRadio || !priceInput) {
    console.warn('⚠️ Éléments de ménage non trouvés dans le DOM');
    return;
  }
  
  // Récupérer les labels Webflow
  const includedLabel = document.getElementById('menage-inclus');
  const notIncludedLabel = document.getElementById('menage-non-inclus');
  const optionalLabel = document.getElementById('menage-option');
  
  // Fonction helper pour reset tous les radios visuellement
  const resetAllRadios = () => {
    includedRadio.checked = false;
    notIncludedRadio.checked = false;
    optionalRadio.checked = false;
    if (includedLabel) includedLabel.querySelector('.w-radio-input')?.classList.remove('w--redirected-checked');
    if (notIncludedLabel) notIncludedLabel.querySelector('.w-radio-input')?.classList.remove('w--redirected-checked');
    if (optionalLabel) optionalLabel.querySelector('.w-radio-input')?.classList.remove('w--redirected-checked');
  };
  
  // Définir l'état initial basé sur les données
  const cleaning = this.pricingData.cleaning;
  
  if (cleaning && cleaning.optional) {
    // En option
    resetAllRadios();
    optionalRadio.checked = true;
    if (optionalLabel) optionalLabel.querySelector('.w-radio-input')?.classList.add('w--redirected-checked');
    
    priceInput.style.display = 'block';
    if (cleaning.price) {
      priceInput.value = cleaning.price;
      priceInput.setAttribute('data-raw-value', cleaning.price);
    }
  } else if (cleaning && cleaning.included) {
    // Inclus
    resetAllRadios();
    includedRadio.checked = true;
    if (includedLabel) includedLabel.querySelector('.w-radio-input')?.classList.add('w--redirected-checked');
    
    priceInput.style.display = 'none';
    priceInput.value = '';
  } else {
    // Non inclus (par défaut si included === false)
    resetAllRadios();
    notIncludedRadio.checked = true;
    if (notIncludedLabel) notIncludedLabel.querySelector('.w-radio-input')?.classList.add('w--redirected-checked');
    
    priceInput.style.display = 'block';
    if (cleaning && cleaning.price) {
      priceInput.value = cleaning.price;
      priceInput.setAttribute('data-raw-value', cleaning.price);
    }
  }
  
  // Sauvegarder l'état initial
  this.initialValues.cleaningIncluded = cleaning?.included ?? true;
  this.initialValues.cleaningOptional = cleaning?.optional ?? false;
  this.initialValues.cleaningPrice = cleaning?.price || 0;
}

prefillWeekendOptions() {
  const yesRadio = document.getElementById('weekend-oui');
  const noRadio = document.getElementById('weekend-non');
  const priceInput = document.getElementById('weekend-price-input');
  
  if (!yesRadio || !noRadio || !priceInput) {
    console.warn('⚠️ Éléments week-end non trouvés dans le DOM');
    return;
  }
  
  // Récupérer les labels Webflow
  const yesLabel = document.getElementById('label-weekend-oui');
  const noLabel = document.getElementById('label-weekend-non');
  
  const weekend = this.pricingData.defaultPricing?.weekend;
  
  if (weekend && weekend.enabled) {
    // Activer "Oui"
    yesRadio.checked = true;
    noRadio.checked = false;
    if (yesLabel) yesLabel.querySelector('.w-radio-input')?.classList.add('w--redirected-checked');
    if (noLabel) noLabel.querySelector('.w-radio-input')?.classList.remove('w--redirected-checked');
    
    priceInput.style.display = 'block';
    if (weekend.price) {
      priceInput.value = weekend.price;
      priceInput.setAttribute('data-raw-value', weekend.price);
    }
  } else {
    // "Non" par défaut
    yesRadio.checked = false;
    noRadio.checked = true;
    if (yesLabel) yesLabel.querySelector('.w-radio-input')?.classList.remove('w--redirected-checked');
    if (noLabel) noLabel.querySelector('.w-radio-input')?.classList.add('w--redirected-checked');
    
    priceInput.style.display = 'none';
    priceInput.value = '';
  }
  
  // Sauvegarder l'état initial
  this.initialValues.weekendEnabled = weekend?.enabled ?? false;
  this.initialValues.weekendPrice = weekend?.price || 0;
}

  // 🆕 Pré-remplir les options de supplément voyageurs
prefillExtraGuestsOptions() {
  const yesRadio = document.getElementById('extra-guests-oui');
  const noRadio = document.getElementById('extra-guests-non');
  const yesLabel = document.getElementById('label-extra-guests-oui');
  const noLabel = document.getElementById('label-extra-guests-non');
  const thresholdInput = document.getElementById('extra-guests-threshold-input');
  const priceInput = document.getElementById('extra-guests-price-input');
  const labelThreshold = document.getElementById('label-extra-guests');
  const labelPrice = document.getElementById('label-extra-guests-price');
  if (!yesRadio || !noRadio || !thresholdInput || !priceInput) return;
  // Initialiser si absent
  if (!this.pricingData.extraGuests) {
    this.pricingData.extraGuests = { enabled: false, threshold: 2, pricePerPerson: 0 };
  }
  const extraGuests = this.pricingData.extraGuests;
  if (extraGuests.enabled) {
    yesRadio.checked = true;
    noRadio.checked = false;
    if (yesLabel) yesLabel.querySelector('.w-radio-input')?.classList.add('w--redirected-checked');
    if (noLabel) noLabel.querySelector('.w-radio-input')?.classList.remove('w--redirected-checked');
    thresholdInput.style.display = 'block';
    priceInput.style.display = 'block';
    if (labelThreshold) labelThreshold.style.display = 'block';
    if (labelPrice) labelPrice.style.display = 'block';
    if (extraGuests.threshold) {
      thresholdInput.value = extraGuests.threshold;
      thresholdInput.setAttribute('data-raw-value', extraGuests.threshold);
    }
    if (extraGuests.pricePerPerson) {
      priceInput.value = extraGuests.pricePerPerson;
      priceInput.setAttribute('data-raw-value', extraGuests.pricePerPerson);
    }
  } else {
    yesRadio.checked = false;
    noRadio.checked = true;
    if (yesLabel) yesLabel.querySelector('.w-radio-input')?.classList.remove('w--redirected-checked');
    if (noLabel) noLabel.querySelector('.w-radio-input')?.classList.add('w--redirected-checked');
    thresholdInput.style.display = 'none';
    priceInput.style.display = 'none';
    if (labelThreshold) labelThreshold.style.display = 'none';
    if (labelPrice) labelPrice.style.display = 'none';
  }
  // Sauvegarder les valeurs initiales pour le cancel
  this.initialValues.extraGuestsEnabled = extraGuests.enabled;
  this.initialValues.extraGuestsThreshold = extraGuests.threshold || 2;
  this.initialValues.extraGuestsPrice = extraGuests.pricePerPerson || 0;
}

// 🆕 Configurer les listeners pour le supplément voyageurs
setupExtraGuestsListeners() {
  const yesRadio = document.getElementById('extra-guests-oui');
  const noRadio = document.getElementById('extra-guests-non');
  const yesLabel = document.getElementById('label-extra-guests-oui');
  const noLabel = document.getElementById('label-extra-guests-non');
  const thresholdInput = document.getElementById('extra-guests-threshold-input');
  const priceInput = document.getElementById('extra-guests-price-input');
  const labelThreshold = document.getElementById('label-extra-guests');
  const labelPrice = document.getElementById('label-extra-guests-price');
  if (!yesRadio || !noRadio || !thresholdInput || !priceInput) return;
  // Listener sur le radio "Oui"
  yesRadio.addEventListener('change', () => {
    if (yesRadio.checked) {
      if (yesLabel) yesLabel.querySelector('.w-radio-input')?.classList.add('w--redirected-checked');
      if (noLabel) noLabel.querySelector('.w-radio-input')?.classList.remove('w--redirected-checked');
      thresholdInput.style.display = 'block';
      priceInput.style.display = 'block';
      if (labelThreshold) labelThreshold.style.display = 'block';
      if (labelPrice) labelPrice.style.display = 'block';
      setTimeout(() => thresholdInput.focus(), 100);

      if (!this.pricingData.extraGuests) {
        this.pricingData.extraGuests = {};
      }
      this.pricingData.extraGuests.enabled = true;

      this.enableButtons();
    }
  });

  // Listener sur le radio "Non"
  noRadio.addEventListener('change', () => {
    if (noRadio.checked) {
      if (yesLabel) yesLabel.querySelector('.w-radio-input')?.classList.remove('w--redirected-checked');
      if (noLabel) noLabel.querySelector('.w-radio-input')?.classList.add('w--redirected-checked');
      thresholdInput.style.display = 'none';
      priceInput.style.display = 'none';
      if (labelThreshold) labelThreshold.style.display = 'none';
      if (labelPrice) labelPrice.style.display = 'none';
      thresholdInput.value = '';
      thresholdInput.removeAttribute('data-raw-value');
      priceInput.value = '';
      priceInput.removeAttribute('data-raw-value');

      if (!this.pricingData.extraGuests) {
        this.pricingData.extraGuests = {};
      }
      this.pricingData.extraGuests.enabled = false;
      this.pricingData.extraGuests.threshold = 0;
      this.pricingData.extraGuests.pricePerPerson = 0;

      this.enableButtons();
    }
  });

  // Changement du seuil
  thresholdInput.addEventListener('blur', () => {
    let threshold = parseInt(thresholdInput.value) || 0;
    
    // Valider : min 1, max capacity - 1
    const maxThreshold = (this.pricingData.capacity || 8) - 1;
    if (threshold < 1) threshold = 1;
    if (threshold > maxThreshold) threshold = maxThreshold;
    
    thresholdInput.value = threshold;
    thresholdInput.setAttribute('data-raw-value', threshold);

    if (!this.pricingData.extraGuests) {
      this.pricingData.extraGuests = {};
    }
    this.pricingData.extraGuests.threshold = threshold;

    this.enableButtons();
  });

  // Changement du prix
  priceInput.addEventListener('blur', () => {
    const price = parseInt(this.getRawValue(priceInput)) || 0;
    if (!this.pricingData.extraGuests) {
      this.pricingData.extraGuests = {};
    }
    this.pricingData.extraGuests.pricePerPerson = price;
    this.enableButtons();
  });
}
  
setupWeekendListeners() {
  const yesRadio = document.getElementById('weekend-oui');
  const noRadio = document.getElementById('weekend-non');
  const yesLabel = document.getElementById('label-weekend-oui');
  const noLabel = document.getElementById('label-weekend-non');
  const priceInput = document.getElementById('weekend-price-input');
  
  if (!yesRadio || !noRadio || !priceInput) return;
  
  // Listener sur le radio "Oui"
  yesRadio.addEventListener('change', () => {
    if (yesRadio.checked) {
      if (yesLabel) yesLabel.querySelector('.w-radio-input')?.classList.add('w--redirected-checked');
      if (noLabel) noLabel.querySelector('.w-radio-input')?.classList.remove('w--redirected-checked');
      
      priceInput.style.display = 'block';
      setTimeout(() => priceInput.focus(), 100);
      
      if (!this.pricingData.defaultPricing.weekend) {
        this.pricingData.defaultPricing.weekend = {};
      }
      this.pricingData.defaultPricing.weekend.enabled = true;
      
      this.enableButtons();
    }
  });
  
  // Listener sur le radio "Non"
  noRadio.addEventListener('change', () => {
    if (noRadio.checked) {
      if (yesLabel) yesLabel.querySelector('.w-radio-input')?.classList.remove('w--redirected-checked');
      if (noLabel) noLabel.querySelector('.w-radio-input')?.classList.add('w--redirected-checked');
      
      priceInput.style.display = 'none';
      priceInput.value = '';
      priceInput.removeAttribute('data-raw-value');
      
      if (!this.pricingData.defaultPricing.weekend) {
        this.pricingData.defaultPricing.weekend = {};
      }
      this.pricingData.defaultPricing.weekend.enabled = false;
      this.pricingData.defaultPricing.weekend.price = 0;
      
      this.enableButtons();
    }
  });
  
  // Changement du prix
  priceInput.addEventListener('blur', () => {
    const price = parseInt(this.getRawValue(priceInput)) || 0;
    if (!this.pricingData.defaultPricing.weekend) {
      this.pricingData.defaultPricing.weekend = {};
    }
    this.pricingData.defaultPricing.weekend.price = price;
    this.enableButtons();
  });
}

// 🆕 NOUVELLE MÉTHODE : Formater tous les champs avec suffixes au chargement
formatAllSuffixFields() {
  
  // Formater directement sans déclencher d'événements
  document.querySelectorAll('[data-suffix="euro"], [data-suffix="euro-nuit"]').forEach(input => {
    const value = input.value.replace(/[^\d]/g, '');
    if (value) {
      input.setAttribute('data-raw-value', value);
      const suffix = input.getAttribute('data-suffix') === 'euro' ? ' €' : ' € / nuit';
      input.value = value + suffix;
    }
  });
  
  document.querySelectorAll('[data-suffix="pourcent"]').forEach(input => {
    const value = input.value.replace(/[^\d]/g, '');
    if (value) {
      input.setAttribute('data-raw-value', value);
      input.value = value + ' %';
    }
  });
}
  
// ================================
// 🎯 GESTION DES RÉDUCTIONS
// ================================

initDiscountManagement() {
  
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
  
  // Masquer tous les blocs d'abord (sauf les iCals)
  document.querySelectorAll('.bloc-reduction:not(.ical)').forEach(bloc => {
    bloc.style.display = 'none';
  });
  
  if (!this.pricingData.discounts || this.pricingData.discounts.length === 0) {
    console.log('❌ Aucune réduction à afficher');
    return;
  }
  
  // Afficher chaque réduction
  this.pricingData.discounts.forEach((discount, index) => {
    
    let blocElement;
    
    if (index === 0) {
        blocElement = document.querySelector('.bloc-reduction:not(.next):not(.ical)');
      } else {
        const nextBlocs = document.querySelectorAll('.bloc-reduction.next:not(.ical)');
        blocElement = nextBlocs[index - 1];
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
  
  // Vérifier la limite
  if (this.pricingData.discounts.length >= 5) {
    this.showNotification('error', 'Maximum 5 réductions autorisées');
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
    blocElement = document.querySelector('.bloc-reduction:not(.next):not(.ical)');
  } else {
    const nextBlocs = document.querySelectorAll('.bloc-reduction.next:not(.ical)');
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
    
    // NOUVEAU : Validation au blur pour les doublons
    nightsInput.addEventListener('blur', () => {
      if (this.validationManager) {
        this.validationManager.validateDiscountDuplicateOnBlur(nightsInput, index);
      }
    });
  }
  
  // Version simplifiée :
  if (percentageInput) {
    // Récupérer la valeur en enlevant le %
    percentageInput.addEventListener('input', (e) => {
      let value = parseInt(e.target.value.replace(/[^\d]/g, '')) || 0;
      
      // Limiter entre 1 et 100 si une valeur est entrée
      if (value > 0) {
        if (value > 100) {
          value = 100;
          e.target.value = '100';
        } else if (value < 1) {
          value = 1;
          e.target.value = '1';
        }
      }
      
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
    if (this.pricingData.discounts.length >= 5) {
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

  // ================================
// 🗓️ GESTION DES LIENS ICAL
// ================================

initIcalManagement() {
  
  // Masquer tous les blocs sauf le premier
  document.querySelectorAll('.bloc-ical.next').forEach(bloc => {
    bloc.style.display = 'none';
  });
  
  // Configuration du bouton d'ajout
  const addButton = document.getElementById('button-add-ical');
  if (addButton) {
    addButton.addEventListener('click', (e) => {
      e.preventDefault();
      this.addIcal();
    });
  }
  
  // Afficher les iCals existants
  this.displayIcals();
}

displayIcals() {
  
  // Le premier bloc est TOUJOURS visible
  const firstBloc = document.getElementById('ical-1');
  if (firstBloc) {
    firstBloc.style.display = 'flex';
  }
  
  // Masquer tous les autres blocs par défaut
  for (let i = 2; i <= 4; i++) {
    const bloc = document.getElementById(`ical-${i}`);
    if (bloc) {
      bloc.style.display = 'none';
    }
  }
  
  // Collecter toutes les URLs non vides depuis les données
  const allUrls = [];
  this.icalFieldMapping.forEach((fieldName) => {
    const value = this.propertyData[fieldName] || '';
    if (value) {
      allUrls.push(value);
    }
  });
  
  // Réafficher les URLs dans l'ordre (compacter les valeurs)
  allUrls.forEach((url, index) => {
    const input = document.getElementById(`ical-url-${index + 1}`);
    const bloc = document.getElementById(`ical-${index + 1}`);
    
    if (input && bloc) {
      input.value = url;
      bloc.style.display = 'flex';
    }
  });
  
  // Sauvegarder l'état initial pour chaque champ
  this.icalFieldMapping.forEach((fieldName) => {
    this.initialValues[fieldName] = this.propertyData[fieldName] || '';
  });
  
  // Configurer les listeners
  this.setupIcalListeners();
  
  // Mettre à jour l'état du bouton d'ajout
  this.updateAddIcalButton();
}

addIcal() {
  
  // Trouver le premier bloc caché
  for (let i = 2; i <= 4; i++) {
    const bloc = document.getElementById(`ical-${i}`);
    if (bloc && bloc.style.display === 'none') {
      // Afficher ce bloc
      bloc.style.display = 'flex';
      
      // Focus sur l'input
      const input = document.getElementById(`ical-url-${i}`);
      if (input) {
        setTimeout(() => input.focus(), 100);
      }
      
      break;
    }
  }
  
  // Mettre à jour l'état du bouton
  this.updateAddIcalButton();
  
  // Activer les boutons de sauvegarde
  this.enableButtons();
}

removeIcal(index) {
  
  // On ne peut pas supprimer le premier
  if (index === 1) return;
  
  // Récupérer toutes les valeurs actuelles
  const currentValues = [];
  for (let i = 1; i <= 4; i++) {
    const input = document.getElementById(`ical-url-${i}`);
    if (input) {
      currentValues.push(input.value.trim());
    }
  }
  
  // Supprimer la valeur à l'index donné
  currentValues.splice(index - 1, 1);
  
  // Ajouter une valeur vide à la fin pour maintenir 4 éléments
  currentValues.push('');
  
  // Réaffecter toutes les valeurs
  for (let i = 1; i <= 4; i++) {
    const input = document.getElementById(`ical-url-${i}`);
    const bloc = document.getElementById(`ical-${i}`);
    
    if (input && bloc) {
      input.value = currentValues[i - 1] || '';
      
      // Afficher/masquer les blocs
      if (i === 1 || (currentValues[i - 1] && currentValues[i - 1].length > 0)) {
        bloc.style.display = 'flex';
      } else {
        bloc.style.display = 'none';
      }
    }
  }
  
  // Mettre à jour l'état du bouton
  this.updateAddIcalButton();
  
  // Activer les boutons de sauvegarde
  this.enableButtons();
}

setupIcalListeners() {
  // Listeners pour tous les inputs
  for (let i = 1; i <= 4; i++) {
    const input = document.getElementById(`ical-url-${i}`);
    if (input) {
      // Retirer les anciens listeners pour éviter les doublons
      const newInput = input.cloneNode(true);
      input.parentNode.replaceChild(newInput, input);
      
      newInput.addEventListener('input', () => {
        this.enableButtons();
      });
    }
    
    // Boutons de suppression (sauf pour le premier)
    if (i > 1) {
      const deleteBtn = document.querySelector(`#ical-${i} .button-delete-ical`);
      if (deleteBtn) {
        // Cloner pour retirer les anciens listeners
        const newBtn = deleteBtn.cloneNode(true);
        deleteBtn.parentNode.replaceChild(newBtn, deleteBtn);
        
        newBtn.onclick = (e) => {
          e.preventDefault();
          this.removeIcal(i);
        };
      }
    }
  }
}

updateAddIcalButton() {
  const addButton = document.getElementById('button-add-ical');
  if (!addButton) return;
  
  // Compter les blocs visibles
  let visibleCount = 0;
  for (let i = 1; i <= 4; i++) {
    const bloc = document.getElementById(`ical-${i}`);
    if (bloc && bloc.style.display !== 'none') {
      visibleCount++;
    }
  }
  
  // Désactiver si on a atteint 4
  if (visibleCount >= 4) {
    addButton.disabled = true;
    addButton.style.opacity = '0.5';
    addButton.style.cursor = 'not-allowed';
  } else {
    addButton.disabled = false;
    addButton.style.opacity = '1';
    addButton.style.cursor = 'pointer';
  }
}

// ================================
// 🎁 GESTION DES EXTRAS
// ================================

initExtrasManagement() {
  
  // Masquer tous les blocs extras au départ
  document.querySelectorAll('.bloc-extra').forEach(bloc => {
    bloc.style.display = 'none';
  });
  
  // Configuration du bouton d'ajout
  const addButton = document.getElementById('button-add-extra');
  if (addButton) {
    addButton.addEventListener('click', (e) => {
      e.preventDefault();
      this.addExtra();
    });
  }
  
  // Parser et afficher les extras existants
  this.parseAndDisplayExtras();
}

parseAndDisplayExtras() {
  
  // Récupérer la valeur du champ extras
  const extrasValue = this.propertyData.extras || '';
  
  if (!extrasValue) {
    console.log('❌ Aucun extra à afficher');
    this.extras = [];
    return;
  }
  
  // Parser le format "🚴Location de vélos10€/jour, ⏰Départ tardif5€"
  this.extras = this.parseExtrasString(extrasValue);
    
  // Afficher chaque extra
  this.displayExtras();
}

parseExtrasString(extrasString) {
  if (!extrasString) return [];
  
  // Séparer par virgule
  const extrasParts = extrasString.split(',').map(part => part.trim());
  
  return extrasParts.map(part => {
    // Extraire l'emoji (premier caractère unicode étendu)
    const emojiMatch = part.match(/^(\p{Emoji})/u);
    const emoji = emojiMatch ? emojiMatch[1] : '';
    
    // Retirer l'emoji du début
    const withoutEmoji = part.replace(emoji, '');
    
    // Chercher le prix (dernier nombre suivi de €)
    const priceMatch = withoutEmoji.match(/(\d+)€/);
    const price = priceMatch ? priceMatch[1] : '';
    
    // Le nom est ce qui reste après avoir retiré le prix
    const name = withoutEmoji.replace(/\d+€.*$/, '').trim();
    
    return { emoji, name, price };
  }).filter(extra => extra.name); // Filtrer les entrées vides
}

displayExtras() {
  
  // Masquer tous les blocs d'abord
  document.querySelectorAll('.bloc-extra').forEach(bloc => {
    bloc.style.display = 'none';
  });
  
  if (!this.extras || this.extras.length === 0) {
    return;
  }
  
  // Afficher chaque extra
  this.extras.forEach((extra, index) => {
    
    let blocElement;
    
    if (index === 0) {
      // Premier extra : bloc avec labels
      blocElement = document.querySelector('.bloc-extra:not(.next)');
    } else {
      // Extras suivants : blocs sans labels
      const nextBlocs = document.querySelectorAll('.bloc-extra.next');
      if (nextBlocs[index - 1]) {
        blocElement = nextBlocs[index - 1];
      }
    }
    
    if (blocElement) {
      // Afficher le bloc
      blocElement.style.display = 'flex';
      
      // Remplir les valeurs
      const emojiInput = blocElement.querySelector('[data-extra="emoji"]');
      const nameInput = blocElement.querySelector('[data-extra="name"]');
      const priceInput = blocElement.querySelector('[data-extra="price"]');
      
      if (emojiInput) {
        emojiInput.value = extra.emoji || '';
        
        // 🆕 S'assurer que l'input est dans un wrapper
        if (!emojiInput.closest('.emoji-input-wrapper')) {
          const wrapper = document.createElement('div');
          wrapper.className = 'emoji-input-wrapper';
          emojiInput.parentNode.insertBefore(wrapper, emojiInput);
          wrapper.appendChild(emojiInput);
          
          const pickerContainer = document.createElement('div');
          pickerContainer.className = 'emoji-picker-container';
          wrapper.appendChild(pickerContainer);
        }
      }
      if (nameInput) nameInput.value = extra.name || '';
      if (priceInput) {
        priceInput.value = extra.price || '';
        priceInput.setAttribute('data-raw-value', extra.price || '');
      }
      
      // Ajouter les listeners pour modifications
      this.setupExtraListeners(blocElement, index);
      
      // Configurer le bouton de suppression
      const deleteButton = blocElement.querySelector('.button-delete-extra');
      if (deleteButton) {
        deleteButton.onclick = (e) => {
          e.preventDefault();
          this.removeExtra(index);
        };
      }
    }
  });
  
  // Vérifier si on peut encore ajouter des extras
  this.updateAddExtraButtonState();
}

addExtra() {
  
  // Vérifier la limite
  if (this.extras.length >= 10) {
    this.showNotification('error', 'Maximum 10 extras autorisés');
    return;
  }
  
  // Ajouter un nouvel extra vide
  const newExtra = { emoji: '', name: '', price: '' };
  const newIndex = this.extras.length;
  this.extras.push(newExtra);
  
  // Afficher le nouveau bloc
  let blocElement;
  if (newIndex === 0) {
    blocElement = document.querySelector('.bloc-extra:not(.next)');
  } else {
    const nextBlocs = document.querySelectorAll('.bloc-extra.next');
    blocElement = nextBlocs[newIndex - 1];
  }
  
  if (blocElement) {
    blocElement.style.display = 'flex';
    
    // Réinitialiser les valeurs
    const emojiInput = blocElement.querySelector('[data-extra="emoji"]');
    const nameInput = blocElement.querySelector('[data-extra="name"]');
    const priceInput = blocElement.querySelector('[data-extra="price"]');
    
    if (emojiInput) emojiInput.value = '';
    if (nameInput) {
      nameInput.value = '';
      // Focus sur le nom pour commencer
      setTimeout(() => nameInput.focus(), 100);
    }
    if (priceInput) {
      priceInput.value = '';
      priceInput.removeAttribute('data-raw-value');
    }
    
    // Ajouter les listeners
    this.setupExtraListeners(blocElement, newIndex);
    
    // Configurer le bouton de suppression
    const deleteButton = blocElement.querySelector('.button-delete-extra');
    if (deleteButton) {
      deleteButton.onclick = (e) => {
        e.preventDefault();
        this.removeExtra(newIndex);
      };
    }
  }
  
  // Mettre à jour l'état du bouton d'ajout
  this.updateAddExtraButtonState();
  
  // Activer les boutons de sauvegarde
  this.enableButtons();
}

removeExtra(index) {
  
  // Supprimer du tableau
  this.extras.splice(index, 1);
  
  // Réafficher tous les extras (gère automatiquement la réorganisation)
  this.displayExtras();
  
  // Activer les boutons de sauvegarde
  this.enableButtons();
}

setupExtraListeners(blocElement, index) {
  const emojiInput = blocElement.querySelector('[data-extra="emoji"]');
  const nameInput = blocElement.querySelector('[data-extra="name"]');
  const priceInput = blocElement.querySelector('[data-extra="price"]');
  
  if (emojiInput) {
    emojiInput.readOnly = true;
    emojiInput.style.cursor = 'pointer';
    emojiInput.addEventListener('input', (e) => {
      this.extras[index].emoji = e.target.value;
      this.enableButtons();
    });

    // 🆕 NOUVEAU : Gérer le picker emoji
    this.setupEmojiPicker(blocElement, emojiInput, index);
  }
  
  if (nameInput) {
    nameInput.addEventListener('input', (e) => {
      this.extras[index].name = e.target.value;
      this.enableButtons();
    });
  }
  
  if (priceInput) {
    priceInput.addEventListener('input', (e) => {
      const value = e.target.value.replace(/[^\d]/g, '');
      this.extras[index].price = value;
      this.enableButtons();
    });
    
    // Formatage au blur : ajouter €
    priceInput.addEventListener('blur', function() {
      const value = this.value.replace(/[^\d]/g, '');
      if (value) {
        this.setAttribute('data-raw-value', value);
        this.value = value + '€';
      }
    });
    
    // Retirer le suffixe au focus
    priceInput.addEventListener('focus', function() {
      const rawValue = this.getAttribute('data-raw-value');
      if (rawValue) {
        this.value = rawValue;
      } else {
        this.value = this.value.replace(/[^\d]/g, '');
      }
    });
  }
}

setupEmojiPicker(blocElement, emojiInput, index) {
  // Skip sur mobile - utiliser le clavier natif
  if (window.innerWidth < 768) return;
  
  const wrapper = emojiInput.closest('.emoji-input-wrapper');
  if (!wrapper) return;
  
  const pickerContainer = wrapper.querySelector('.emoji-picker-container');
  if (!pickerContainer) return;
  
  let picker = null;
  let isLoading = false;
  
  // Gestionnaire de clic optimisé
  emojiInput.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Si déjà ouvert, fermer
    if (pickerContainer.classList.contains('active')) {
      pickerContainer.classList.remove('active');
      return;
    }
    
    // Fermer tous les autres pickers
    document.querySelectorAll('.emoji-picker-container.active').forEach(container => {
      container.classList.remove('active');
    });
    
    // Créer le picker à la demande (lazy loading)
    if (!picker && !isLoading) {
      isLoading = true;
      
      try {
        // Utiliser le module préchargé si disponible
        const module = await (window.emojiModulePromise || 
                              import('https://cdn.skypack.dev/emoji-picker-element@^1'));
        
        picker = new module.Picker({
          locale: 'fr',
          dataSource: 'https://cdn.jsdelivr.net/npm/emoji-picker-element-data@^1/fr/cldr/data.json',
          skinToneEmoji: '🖐️',
          perLine: 8,
          maxRecents: 20
        });
        
        // Événement de sélection
        picker.addEventListener('emoji-click', (event) => {
          emojiInput.value = event.detail.unicode;
          this.extras[index].emoji = event.detail.unicode;
          this.enableButtons();
          pickerContainer.classList.remove('active');
        });
        
        pickerContainer.appendChild(picker);
      } catch (error) {
        console.error('Erreur chargement emoji picker:', error);
        // Fallback : ouvrir le clavier
        emojiInput.readOnly = false;
        emojiInput.focus();
      }
      
      isLoading = false;
    }
    
    // Afficher le picker
    if (picker) {
      pickerContainer.classList.add('active');
    }
  });
  
  // Fermer au clic extérieur (optimisé avec passive)
  document.addEventListener('click', (e) => {
    if (!wrapper.contains(e.target)) {
      pickerContainer.classList.remove('active');
    }
  }, { passive: true });
  
  // Fermer avec Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && pickerContainer.classList.contains('active')) {
      pickerContainer.classList.remove('active');
    }
  });
}
  
updateAddExtraButtonState() {
  const addButton = document.getElementById('button-add-extra');
  if (addButton) {
    if (this.extras.length >= 10) {
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

// Méthode pour générer la chaîne extras au format attendu
generateExtrasString() {
  return this.extras
    .filter(extra => extra.name && extra.price && extra.emoji) // Ignorer les extras incomplets
    .map(extra => {
      return `${extra.emoji}${extra.name}${extra.price}€`;
    })
    .join(', ');
}


// ================================
// 📷 GESTION DES IMAGES
// ================================

initImageManagement() {
  
  // Copier l'état initial
  this.originalImagesGallery = JSON.parse(JSON.stringify(this.propertyData.images_gallery || []));
  this.currentImagesGallery = JSON.parse(JSON.stringify(this.propertyData.images_gallery || []));
  
  // Sauvegarder dans initialValues pour le système de cancel
  this.initialValues.images_gallery = JSON.parse(JSON.stringify(this.originalImagesGallery));
  
  // Réafficher avec les contrôles
  this.displayEditableGallery();
  
  // Initialiser SortableJS après un court délai (DOM ready)
  if (window.innerWidth > 768) {
    setTimeout(() => {
      this.initSortable();
    }, 100);
  }
}

initSortable() {
  const container = document.querySelector('.images-grid');
  if (!container || this.currentImagesGallery.length === 0) return;
  
  // Détruire l'instance précédente si elle existe
  if (this.sortableInstance) {
    this.sortableInstance.destroy();
  }
  
  // 🎯 SIMPLE comme la démo : juste l'essentiel
  this.sortableInstance = new Sortable(container, {
    animation: 150,
    ghostClass: 'sortable-ghost',
    filter: '.button-delete-photo', 
    
    onEnd: (evt) => {
      // Réorganiser notre tableau de données
      const movedItem = this.currentImagesGallery.splice(evt.oldIndex, 1)[0];
      this.currentImagesGallery.splice(evt.newIndex, 0, movedItem);
      
      
      // Juste activer le bouton save
      this.enableButtons();
    }
  });
}

displayEditableGallery() {
  const blocEmpty = document.getElementById('bloc-empty-photos');
  const blocPhotos = document.getElementById('bloc-photos-logement');
  
  // Gérer l'affichage empty/photos
  if (!Array.isArray(this.currentImagesGallery) || this.currentImagesGallery.length === 0) {
    if (blocEmpty) blocEmpty.style.display = 'flex';
    if (blocPhotos) blocPhotos.style.display = 'none';
    return;
  } else {
    if (blocEmpty) blocEmpty.style.display = 'none';
    if (blocPhotos) blocPhotos.style.display = 'block';
  }
  
  // Masquer tous les blocs d'abord
  for (let i = 1; i <= 20; i++) {
    const imageBlock = document.getElementById(`image-block-${i}`);
    if (imageBlock) {
      imageBlock.style.display = 'none';
      // Nettoyer les anciens boutons clonés
      const oldBtn = imageBlock.querySelector('.button-delete-photo');
      if (oldBtn) {
        oldBtn.remove();
      }
    }
  }
  
  // Afficher les images avec boutons de suppression
  const maxImages = Math.min(this.currentImagesGallery.length, 20);
  
  for (let i = 0; i < maxImages; i++) {
    const imageData = this.currentImagesGallery[i];
    const imageBlock = document.getElementById(`image-block-${i + 1}`);
    
    if (imageBlock && imageData) {
      let imageUrl = null;
      
      if (typeof imageData === 'object' && imageData.url) {
        imageUrl = imageData.url;
      } else if (typeof imageData === 'string') {
        imageUrl = imageData;
      }
      
      if (imageUrl) {
        const imgElement = imageBlock.querySelector('img');
        
        if (imgElement) {
          imgElement.src = imageUrl;
          imgElement.alt = `Image ${i + 1}`;
          
          if (i > 3) {
            imgElement.loading = 'lazy';
          }
        }
        
        // 🆕 HYBRIDE : Ajouter le bouton de suppression depuis le template
        this.addDeleteButtonFromTemplate(imageBlock, i);
        
        // Ajouter les classes pour le drag
        imageBlock.style.cursor = 'move';
        imageBlock.classList.add('sortable-item');
        
        // Afficher le bloc
        imageBlock.style.display = 'block';
      }
    }
  }
}

addDeleteButtonFromTemplate(imageBlock, index) {
  // Vérifier si le bouton existe déjà
  let deleteBtn = imageBlock.querySelector('.button-delete-photo');
  
  if (!deleteBtn) {
    // Récupérer le template depuis Webflow
    const template = document.getElementById('template-delete-button');
    
    if (template) {
      // Cloner le template
      deleteBtn = template.cloneNode(true);
      deleteBtn.style.display = 'block';
      deleteBtn.id = '';
      
      // Position et style
      deleteBtn.style.position = 'absolute';
      deleteBtn.style.top = '8px';
      deleteBtn.style.right = '8px';
      deleteBtn.style.zIndex = '20';
      
      // S'assurer que le bloc parent est en position relative
      imageBlock.style.position = 'relative';
      
      // Ajouter le bouton cloné au bloc image
      imageBlock.appendChild(deleteBtn);
      
    } else {
      console.error('❌ ERREUR : Template de bouton delete non trouvé');
      return;
    }
  }
  
  // 🆕 NOUVEAU : Détecter si on est sur mobile
  const isMobile = window.matchMedia('(max-width: 768px)').matches || 
                   'ontouchstart' in window;
  
  if (isMobile) {
    // 📱 MOBILE : Système de clic
    let clickTimeout;
    let isDragging = false;
    
    imageBlock.onclick = (e) => {
      if (e.target.closest('.button-delete-photo')) return;
      if (isDragging) {
        isDragging = false;
        return;
      }
      
      // Toggle le bouton delete de cette image
      deleteBtn.classList.toggle('show-delete');
      
      // Masquer les autres boutons
      document.querySelectorAll('.button-delete-photo').forEach(btn => {
        if (btn !== deleteBtn) {
          btn.classList.remove('show-delete');
        }
      });
    };
    
    // Détecter le drag
    imageBlock.addEventListener('touchstart', () => {
      clickTimeout = setTimeout(() => {
        isDragging = true;
      }, 200);
    });
    
    imageBlock.addEventListener('touchend', () => {
      clearTimeout(clickTimeout);
      setTimeout(() => {
        isDragging = false;
      }, 100);
    });
  }  
  // Handler pour le bouton delete (mobile + desktop)
  deleteBtn.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    this.removeImage(index);
  };
}

removeImage(index) {  
  // 🆕 NOUVEAU : Récupérer l'image-block qui contient le bouton cliqué
  const imageBlock = document.getElementById(`image-block-${index + 1}`);
  if (!imageBlock) return;
  
  // Récupérer l'URL de l'image dans ce bloc
  const imgElement = imageBlock.querySelector('img');
  if (!imgElement) return;
  
  const imageUrl = imgElement.src;
  
  // 🆕 Trouver le VRAI index de cette image dans le tableau actuel
  const realIndex = this.currentImagesGallery.findIndex(img => {
    if (typeof img === 'string') {
      return img === imageUrl;
    } else if (img && img.url) {
      return img.url === imageUrl;
    }
    return false;
  });
    
  if (realIndex === -1) {
    console.error('❌ Image non trouvée dans le tableau');
    return;
  }
  
  // Vérifier qu'on garde minimum 3 images
  if (this.currentImagesGallery.length <= 3) {
    this.showNotification('error', 'Minimum 3 photos requises pour le logement');
    return;
  }
  
  // 🆕 Supprimer au BON index
  this.currentImagesGallery.splice(realIndex, 1);
  
  // Réafficher la galerie
  this.displayEditableGallery();
  
  // Réinitialiser SortableJS
  this.initSortable();
  
  // Activer les boutons de sauvegarde
  this.enableButtons();
}
  
  
setupFieldListeners() {
  const fields = [
    { id: 'name-input' },
    { id: 'ville-input', type: 'no-numbers' },
    { id: 'pays-input' },
    { id: 'rue-input' },
    { id: 'cadeaux-input' },
    { id: 'description-logement-input' },
    { id: 'description-alentours-input' },
    { id: 'code-enregistrement-input' },
    { id: 'site-internet-input' },
    { id: 'inclus-reservation-input' },
    { id: 'hote-input' },
    { id: 'email-input' },
    { id: 'telephone-input' },
    { id: 'annonce-airbnb-input' },
    { id: 'annonce-booking-input' },
    { id: 'annonce-gites-input' },
    { id: 'page-google' }
  ];
  
  fields.forEach(field => {
    const input = document.getElementById(field.id);
    if (input) {
      // NOUVEAU : Bloquer les chiffres pour le champ ville
      if (field.type === 'no-numbers') {
        input.addEventListener('input', (e) => {
          // Supprimer tous les chiffres
          e.target.value = e.target.value.replace(/\d/g, '');
        });
        
        input.addEventListener('keypress', (e) => {
          // Empêcher la saisie de chiffres
          if (/\d/.test(e.key)) {
            e.preventDefault();
          }
        });
      }
      
      input.addEventListener('input', () => {
        // Validation spéciale pour certains champs
        if (field.id === 'site-internet-input') {
          this.validateURL(input);
        } else if (field.id === 'code-enregistrement-input') {
          this.validateCodeEnregistrement(input);
        } else if (field.id === 'email-input') {
          this.validateEmail(input);
        } else if (field.id === 'telephone-input') {
          this.formatTelephone(input);
        }
        
        // NOUVEAU : Si c'est un lien d'annonce, mettre à jour la visibilité
        if (['annonce-airbnb-input', 'annonce-booking-input', 'annonce-gites-input'].includes(field.id)) {
          this.updatePlatformBlocksVisibility();
        }
        
        this.enableButtons();
      });
      input.addEventListener('blur', () => {
        // NOUVEAU : Si c'est un lien d'annonce, mettre à jour la visibilité
        if (['annonce-airbnb-input', 'annonce-booking-input', 'annonce-gites-input'].includes(field.id)) {
          this.updatePlatformBlocksVisibility();
        }
        
        if (this.validationManager) {
          this.validationManager.validateFieldOnBlur(field.id);
        }
      });
    }
  });

  // NOUVEAU : Listeners pour les radio buttons
  document.querySelectorAll('input[name="mode-location"]').forEach(radio => {
    radio.addEventListener('change', () => {
      this.enableButtons();
    });
  });
  
  // NOUVEAU : Listeners pour les checkboxes équipements
  const equipementIds = ['checkbox-piscine', 'checkbox-jacuzzi', 'checkbox-barbecue', 
                      'checkbox-climatisation', 'checkbox-equipement-bebe', 'checkbox-parking',
                      'checkbox-wifi', 'checkbox-four', 'checkbox-lave-vaisselle',
                      'checkbox-seche-linge', 'checkbox-machine-a-laver'];
  equipementIds.forEach(id => {
    const checkbox = document.getElementById(id);
    if (checkbox) {
      checkbox.addEventListener('change', () => {
        this.enableButtons();
      });
    }
  });

  // NOUVEAU : Listeners pour caution et acompte avec synchronisation JSON
  const cautionAcompteIds = ['caution-input', 'acompte-input'];
  // Version simplifiée :
cautionAcompteIds.forEach(id => {
  const input = document.getElementById(id);
  if (input) {
    input.addEventListener('input', (e) => {
      // Récupérer la valeur SANS suffixe
      const cleanValue = e.target.value.replace(/[^\d]/g, '');
      let rawValue = parseInt(cleanValue) || 0;
      
      // Limitation pour l'acompte (1-100%)
      if (id === 'acompte-input' && rawValue > 0) {
        if (rawValue > 100) {
          rawValue = 100;
          e.target.value = '100';
        } else if (rawValue < 1) {
          rawValue = 1;
          e.target.value = '1';
        }
      }
      
      // Stocker immédiatement dans data-raw-value
      e.target.setAttribute('data-raw-value', rawValue);
      
      // Mettre à jour le JSON pricing
      if (id === 'caution-input') {
        if (this.pricingData) {
          this.pricingData.caution = rawValue;
        }
      } else if (id === 'acompte-input') {
        if (this.pricingData) {
          this.pricingData.acompte = rawValue;
        }
      }
      
      this.enableButtons();
    });
  }
});
  
  // NOUVEAU : Listeners pour les checkboxes options
  const optionIds = ['checkbox-animaux', 'checkbox-pmr', 'checkbox-fumeurs'];
  optionIds.forEach(id => {
    const checkbox = document.getElementById(id);
    if (checkbox) {
      checkbox.addEventListener('change', () => {
        this.enableButtons();
      });
    }
  });
  
  // NOUVEAU : Listeners pour les modes de paiement
  const paiementIds = ['checkbox-visa', 'checkbox-especes', 'checkbox-mastercard', 
                       'checkbox-virement', 'checkbox-paypal', 'checkbox-paylib', 
                       'checkbox-amex', 'checkbox-cheques', 'checkbox-cheques-vacances'];
  paiementIds.forEach(id => {
    const checkbox = document.getElementById(id);
    if (checkbox) {
      checkbox.addEventListener('change', () => {
        this.enableButtons();
      });
    }
  });

  // NOUVEAU : Listeners pour les horaires (Cleave s'occupe de la validation)
  const horaireIds = ['heure-arrivee-input', 'heure-depart-input'];
  horaireIds.forEach(id => {
    const input = document.getElementById(id);
    if (input) {
      input.addEventListener('input', () => {
        this.enableButtons();
      });
      input.addEventListener('blur', () => {
      if (this.validationManager) {
        this.validationManager.validateFieldOnBlur(id);
      }
    });
    }
  });

// Listeners pour la politique d'annulation (radio buttons)
  document.querySelectorAll('input[name="cancellation-policy"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      const customBloc = document.getElementById('bloc-custom-annulation');
      if (customBloc) {
        if (e.target.value === 'custom') {
          customBloc.style.display = 'block';
          const textarea = document.getElementById('conditions-annulation-input');
          if (textarea) setTimeout(() => textarea.focus(), 100);
        } else {
          customBloc.style.display = 'none';
        }
      }
      this.enableButtons();
    });
  });

  // Listener sur le textarea pour le mode personnalisé
  const conditionsTextarea = document.getElementById('conditions-annulation-input');
  if (conditionsTextarea) {
    conditionsTextarea.addEventListener('input', () => {
      this.enableButtons();
    });
    conditionsTextarea.addEventListener('blur', () => {
      if (this.validationManager) {
        this.validationManager.validateFieldOnBlur('conditions-annulation-input');
      }
    });
  }
  
  // NOUVEAU : Listeners pour taille maison avec synchronisation capacity
  const tailleMaisonIds = ['voyageurs-input', 'chambres-input', 'lits-input', 'salles-bain-input'];
  tailleMaisonIds.forEach(id => {
    const input = document.getElementById(id);
    if (input) {
      input.addEventListener('input', (e) => {
        // Limiter aux nombres
        e.target.value = e.target.value.replace(/\D/g, '');
        
        // Si c'est le nombre de voyageurs, synchroniser avec capacity
        if (id === 'voyageurs-input') {
          const newCapacity = parseInt(e.target.value) || 0;
          if (this.pricingData) {
            this.pricingData.capacity = newCapacity;
          }
        }
        
        this.enableButtons();
      });
    }
  });
  
  // 🆕 AJOUTER cet appel
  this.setupDefaultPricingListeners();

  this.setupCleaningListeners();
  this.setupWeekendListeners();
  this.setupExtraGuestsListeners();
  // 🆕 AJOUTER les gestionnaires d'opacité
  this.setupPriceOpacityHandlers();
}

// Validation de l'URL
validateURL(input) {
  const value = input.value.trim();
  if (value === '') return true; // Champ vide OK
  
  // Ajouter http:// si pas de protocole
  if (value && !value.match(/^https?:\/\//)) {
    input.value = 'https://' + value;
  }
  
  // Pattern URL simple
  const urlPattern = /^https?:\/\/([\w\-]+\.)+[\w\-]+(\/[\w\-._~:/?#[\]@!$&'()*+,;=]*)?$/;
  
  if (!urlPattern.test(input.value)) {
    input.style.borderColor = '#ff0000';
    input.setCustomValidity('URL invalide');
    return false;
  } else {
    input.style.borderColor = '';
    input.setCustomValidity('');
    return true;
  }
}

// Validation du code d'enregistrement (alphanumérique, sans limite de longueur)
validateCodeEnregistrement(input) {
  const value = input.value.trim();
  if (value === '') return true; // Champ vide OK (sera géré par required)
  
  // Garder seulement les caractères alphanumériques (lettres et chiffres)
  const alphanumOnly = value.replace(/[^a-zA-Z0-9]/g, '');
  
  if (alphanumOnly !== value) {
    input.value = alphanumOnly;
  }
  
  // Convertir en majuscules pour uniformité
  input.value = input.value.toUpperCase();
  
  // Pas de limitation de longueur, juste reset les styles
  input.style.borderColor = '';
  input.setCustomValidity('');
  return true;
}

  // Validation de l'email
validateEmail(input) {
  const value = input.value.trim();
  if (value === '') return true;
  
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailPattern.test(value)) {
    input.style.borderColor = '#ff0000';
    input.setCustomValidity('Email invalide');
    return false;
  } else {
    input.style.borderColor = '';
    input.setCustomValidity('');
    return true;
  }
}

// Formatage du téléphone
formatTelephone(input) {
  let value = input.value;
  
  // Garder seulement les chiffres et le +
  value = value.replace(/[^\d+]/g, '');
  
  // Limiter à 15 caractères (standard international)
  if (value.length > 15) {
    value = value.substring(0, 15);
  }
  
  input.value = value;
}
  
// 🆕 NOUVELLE MÉTHODE à ajouter après setupFieldListeners()
setupDefaultPricingListeners() {
  const defaultPriceInput = document.getElementById('default-price-input');
  if (defaultPriceInput) {
    defaultPriceInput.addEventListener('input', () => {
      // AJOUTER : Mise à jour immédiate de data-raw-value
      const cleanValue = defaultPriceInput.value.replace(/[^\d]/g, '');
      defaultPriceInput.setAttribute('data-raw-value', cleanValue || '0');
      
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
  const platforms = ['airbnb', 'booking', 'other'];
  platforms.forEach(platform => {
    const input = document.getElementById(`default-${platform}-price-input`);
    if (input) {
      input.addEventListener('input', () => {
        // IMPORTANT : Mettre à jour data-raw-value immédiatement
        const cleanValue = input.value.replace(/[^\d]/g, '');
        input.setAttribute('data-raw-value', cleanValue || '0');
        
        this.updateDefaultPricing();
        this.enableButtons();
        
        // NOUVEAU : Mettre à jour la visibilité des blocs
        this.updatePlatformBlocksVisibility();
      });
      input.addEventListener('blur', () => {
        // Double vérification au blur
        const cleanValue = input.value.replace(/[^\d]/g, '');
        input.setAttribute('data-raw-value', cleanValue || '0');
        
        // NOUVEAU : Mettre à jour la visibilité des blocs
        this.updatePlatformBlocksVisibility();
        
        if (this.validationManager) {
          // Valider le champ individuel
          this.validationManager.validateFieldOnBlur(`default-${platform}-price-input`);
          // Valider aussi la règle des 10%
          this.validationManager.validatePlatformPrices();
        }
      });
    }
  });
}

// 🆕 NOUVELLE MÉTHODE : Configurer les listeners pour le ménage
setupCleaningListeners() {
  
  const includedRadio = document.getElementById('inclus');
  const notIncludedRadio = document.getElementById('non-inclus');
  const optionalRadio = document.getElementById('option');
  const priceInput = document.getElementById('cleaning-price-input');
  
  if (!includedRadio || !notIncludedRadio || !optionalRadio || !priceInput) {
    return;
  }
  
  // Listener pour "Inclus"
  includedRadio.addEventListener('change', () => {
    if (includedRadio.checked) {
      priceInput.style.display = 'none';
      priceInput.value = '';
      priceInput.removeAttribute('data-raw-value');
      
      // Mettre à jour les données
      if (!this.pricingData.cleaning) {
        this.pricingData.cleaning = {};
      }
      this.pricingData.cleaning.included = true;
      this.pricingData.cleaning.optional = false;
      this.pricingData.cleaning.price = 0;
      
      this.enableButtons();
    }
  });
  
  // Listener pour "Non inclus"
  notIncludedRadio.addEventListener('change', () => {
    if (notIncludedRadio.checked) {
      priceInput.style.display = 'block';
      
      // Focus sur le champ prix
      setTimeout(() => priceInput.focus(), 100);
      
      // Mettre à jour les données
      if (!this.pricingData.cleaning) {
        this.pricingData.cleaning = {};
      }
      this.pricingData.cleaning.included = false;
      this.pricingData.cleaning.optional = false;
      
      this.enableButtons();
    }
  });
  
  // Listener pour "En option"
  optionalRadio.addEventListener('change', () => {
    if (optionalRadio.checked) {
      priceInput.style.display = 'block';
      
      // Focus sur le champ prix
      setTimeout(() => priceInput.focus(), 100);
      
      // Mettre à jour les données
      if (!this.pricingData.cleaning) {
        this.pricingData.cleaning = {};
      }
      this.pricingData.cleaning.included = false;
      this.pricingData.cleaning.optional = true;
      
      this.enableButtons();
    }
  });
    
  // Listener pour le prix du ménage
  priceInput.addEventListener('input', () => {
    const value = parseInt(priceInput.value.replace(/[^\d]/g, '')) || 0;
    
    if (!this.pricingData.cleaning) {
      this.pricingData.cleaning = {};
    }
    this.pricingData.cleaning.price = value;
    
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

  // Version corrigée avec cascade des états
  setupPriceOpacityHandlers() {    
    // Configuration centralisée des dépendances
    const dependencies = [
      {
        trigger: 'default-price-input',
        target: 'bloc-tarifs-plateformes',
        condition: (value) => value && parseInt(value) > 0
      }
    ];
    
    // Appliquer la logique pour chaque dépendance
    dependencies.forEach(({ trigger, target, condition }) => {
      const triggerElement = document.getElementById(trigger);
      const targetElement = document.getElementById(target);
      
      if (!triggerElement || !targetElement) return;
      
      // Fonction réutilisable pour la mise à jour
      const updateOpacity = () => {
        const value = this.getRawValue(triggerElement);
        const isActive = condition(value);
        this.setBlockState(targetElement, isActive);
      };
      
      // État initial
      updateOpacity();
      
      // Listeners
      triggerElement.addEventListener('input', updateOpacity);
      triggerElement.addEventListener('blur', updateOpacity);
    });
    
    // 🆕 IMPORTANT : Appliquer l'état initial complet
    this.applyInitialStates();
  }

  applyInitialStates() {
    // 1. D'abord vérifier le prix par défaut
    const defaultPriceInput = document.getElementById('default-price-input');
    const defaultPriceValue = this.getRawValue(defaultPriceInput);
    const hasDefaultPrice = defaultPriceValue && parseInt(defaultPriceValue) > 0;
    
    // 2. Si pas de prix par défaut, désactiver seulement le bloc tarifs plateformes
    if (!hasDefaultPrice) {
      const blocPlateformes = document.getElementById('bloc-tarifs-plateformes');
      if (blocPlateformes) {
        this.setBlockState(blocPlateformes, false);
      }
    }
  }

// Méthode helper améliorée pour gérer l'état d'un bloc
setBlockState(element, isActive) {
  if (!element) return;
  
  element.style.opacity = isActive ? '1' : '0.5';
  
  const inputs = element.querySelectorAll('input');
  inputs.forEach(input => {
    input.disabled = !isActive;
    input.style.cursor = isActive ? 'text' : 'not-allowed';
    
    // 🆕 IMPORTANT : Forcer le style pour être sûr
    if (!isActive) {
      input.style.pointerEvents = 'none';
      input.style.opacity = '0.6';
    } else {
      input.style.pointerEvents = 'auto';
      input.style.opacity = '1';
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
  const platforms = ['airbnb', 'booking', 'other'];
  let hasPlatformPrices = false;
  
  platforms.forEach(platform => {
    const input = document.getElementById(`default-${platform}-price-input`);
    if (input) {
      // IMPORTANT : Forcer la récupération depuis data-raw-value
      let value = input.getAttribute('data-raw-value');
      
      // Si pas de data-raw-value, extraire depuis la valeur actuelle
      if (!value && input.value) {
        value = input.value.replace(/[^\d]/g, '');
      }
      
      const numericValue = parseInt(value) || 0;
      
      if (numericValue > 0) {
        if (!this.pricingData.defaultPricing.platformPrices) {
          this.pricingData.defaultPricing.platformPrices = {};
        }
        this.pricingData.defaultPricing.platformPrices[platform] = numericValue;
        hasPlatformPrices = true;
      } else if (this.pricingData.defaultPricing.platformPrices && this.pricingData.defaultPricing.platformPrices[platform]) {
        // 🆕 Si la valeur est 0 ou vide, supprimer la plateforme
        delete this.pricingData.defaultPricing.platformPrices[platform];
      }
    }
  });
  
  // Si aucun prix plateforme, supprimer l'objet
  if (!hasPlatformPrices && this.pricingData.defaultPricing.platformPrices) {
    delete this.pricingData.defaultPricing.platformPrices;
  }
  
}
  
  setupSaveButton() {
    
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
    
  }

  
  cancelModifications() {

    if (this.validationManager) {
      this.validationManager.clearAllErrors();
    }
    // Configuration des champs à réinitialiser
    const fields = [
      { id: 'name-input', dataKey: 'name' },
      { id: 'cadeaux-input', dataKey: 'cadeaux' },
      { id: 'description-logement-input', dataKey: 'description_logement' },
      { id: 'description-alentours-input', dataKey: 'description_alentours' },
      { id: 'code-enregistrement-input', dataKey: 'code_enregistrement' },
      { id: 'site-internet-input', dataKey: 'site_internet' },
      { id: 'inclus-reservation-input', dataKey: 'inclus_reservation' },
      { id: 'hote-input', dataKey: 'host_name' },
      { id: 'email-input', dataKey: 'email' },
      { id: 'telephone-input', dataKey: 'telephone' },
      { id: 'annonce-airbnb-input', dataKey: 'annonce_airbnb' },
      { id: 'annonce-booking-input', dataKey: 'annonce_booking' },
      { id: 'annonce-gites-input', dataKey: 'annonce_gites' },
      { id: 'page-google', dataKey: 'page_google' }
    ];
    
    // Remettre les valeurs initiales
    fields.forEach(field => {
      const input = document.getElementById(field.id);
      if (input) {
        input.value = this.initialValues[field.dataKey] || '';
      }
    });

    this.prefillComplexFields();
    this.prefillTailleMaison();
    this.prefillHoraires();
    this.prefillCancellationPolicy();
    this.prefillCautionAcompte();
    // Restaurer les saisons d'origine
    if (this.propertyData.pricing_data) {
      // 🔧 COPIE PROFONDE pour éviter les références
      this.pricingData = JSON.parse(JSON.stringify(this.propertyData.pricing_data));
    } else {
      // Si pas de données d'origine, réinitialiser à vide
      this.pricingData = {
        seasons: [],
        cleaning: { included: true, optional: false },
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
    this.prefillWeekendOptions();
    this.prefillExtraGuestsOptions();
    // Réinitialiser les iCals depuis les valeurs initiales
    for (let i = 1; i <= 4; i++) {
      const input = document.getElementById(`ical-url-${i}`);
      if (input) {
        const fieldName = this.icalFieldMapping[i - 1];
        input.value = this.initialValues[fieldName] || '';
      }
    }
    // Pour réafficher les blocs correctement
    this.displayIcals();
    this.prefillAddress();

    this.propertyData.extras = this.initialValues.extras || '';
    this.parseAndDisplayExtras();

    // 🆕 NOUVEAU : Restaurer les images
    this.currentImagesGallery = JSON.parse(JSON.stringify(this.initialValues.images_gallery || []));
    
    // IMPORTANT : Détruire SortableJS pour annuler ses modifications DOM
    if (this.sortableInstance) {
      this.sortableInstance.destroy();
      this.sortableInstance = null;
    }
    
    // Forcer un reset complet du DOM
    const container = document.querySelector('.images-grid');
    if (container) {
      // Sauvegarder tous les image-blocks
      const blocks = [];
      for (let i = 1; i <= 20; i++) {
        const block = document.getElementById(`image-block-${i}`);
        if (block) {
          blocks.push(block);
        }
      }
      
      // Les remettre dans l'ordre numérique original (1, 2, 3, etc.)
      blocks.forEach(block => {
        container.appendChild(block); // appendChild déplace l'élément
      });
    }
    
    // Maintenant réafficher avec les bonnes images
    this.displayEditableGallery();
    
    // Recréer SortableJS
    setTimeout(() => {
      this.initSortable();
    }, 100);
    // Désactiver les boutons
    this.disableButtons();
  }

  async saveModifications() {

  if (this.validationManager && !this.validationManager.validateAllFields()) {
    console.log('❌ Validation échouée - Sauvegarde annulée');
    this.showNotification('error', 'Veuillez corriger les erreurs avant d\'enregistrer');
    
    // Naviguer vers la première erreur
    setTimeout(() => {
      this.validationManager.navigateToFirstError();
    }, 100);
    
    return;
  }
    
 // 🆕 NOUVEAU : Sauvegarder la valeur brute AVANT le blur
  const activeElement = document.activeElement;
  let activeElementValue = null;
  let activeElementId = null;
  
  if (activeElement && activeElement.tagName === 'INPUT') {
    activeElementId = activeElement.id;
    // Capturer la valeur brute AVANT le blur
    if (activeElement.hasAttribute('data-suffix')) {
      activeElementValue = activeElement.value.replace(/[^\d]/g, '');
      // Forcer la mise à jour de data-raw-value
      activeElement.setAttribute('data-raw-value', activeElementValue);
    }
    
    activeElement.blur();
    // Petit délai pour laisser le blur se terminer
    await new Promise(resolve => setTimeout(resolve, 50));
  }
    
    
  // Configuration du mapping des champs
  const fieldMapping = [
    { id: 'name-input', dataKey: 'name', dbKey: 'name' },
    { id: 'cadeaux-input', dataKey: 'cadeaux', dbKey: 'cadeaux' },
    { id: 'description-logement-input', dataKey: 'description_logement', dbKey: 'description_logement' },
    { id: 'description-alentours-input', dataKey: 'description_alentours', dbKey: 'description_alentours' },
    { id: 'code-enregistrement-input', dataKey: 'code_enregistrement', dbKey: 'code_enregistrement' },
    { id: 'site-internet-input', dataKey: 'site_internet', dbKey: 'site_internet' },
    { id: 'inclus-reservation-input', dataKey: 'inclus_reservation', dbKey: 'inclus_reservation' },
    { id: 'hote-input', dataKey: 'host_name', dbKey: 'host_name' },
    { id: 'email-input', dataKey: 'email', dbKey: 'email' },
    { id: 'telephone-input', dataKey: 'telephone', dbKey: 'telephone' },
    { id: 'annonce-airbnb-input', dataKey: 'annonce_airbnb', dbKey: 'annonce_airbnb' },
    { id: 'annonce-booking-input', dataKey: 'annonce_booking', dbKey: 'annonce_booking' },
    { id: 'annonce-gites-input', dataKey: 'annonce_gites', dbKey: 'annonce_gites' },
    { id: 'page-google', dataKey: 'page_google', dbKey: 'page_google' }
  ];
    
  // Collecter les valeurs actuelles
  const currentValues = {};
  fieldMapping.forEach(field => {
    const input = document.getElementById(field.id);
    if (input) {
      currentValues[field.dataKey] = input.value.trim();
    }
  });

  // NOUVEAU : Collecter le mode de location
  const selectedMode = document.querySelector('input[name="mode-location"]:checked');
  if (selectedMode) {
    currentValues.mode_location = selectedMode.value;
  }
  
  // NOUVEAU : Collecter les équipements cochés
  const equipementsMapping = {
    'checkbox-piscine': 'Piscine',
    'checkbox-jacuzzi': 'Jacuzzi',
    'checkbox-barbecue': 'Barbecue',
    'checkbox-climatisation': 'Climatisation',
    'checkbox-equipement-bebe': 'Équipement bébé',
    'checkbox-parking': 'Parking gratuit',
    'checkbox-wifi': 'Wifi',
    'checkbox-four': 'Four',
    'checkbox-lave-vaisselle': 'Lave-vaisselle',
    'checkbox-seche-linge': 'Sèche-linge',
    'checkbox-machine-a-laver': 'Machine à laver'
  };
  
  const selectedEquipements = [];
  Object.entries(equipementsMapping).forEach(([id, value]) => {
    const checkbox = document.getElementById(id);
    if (checkbox && checkbox.checked) {
      selectedEquipements.push(value);
    }
  });
  currentValues.equipements_principaux = selectedEquipements;
  
  // NOUVEAU : Collecter les options cochées
  const optionsMapping = {
    'checkbox-animaux': 'Animaux autorisés',
    'checkbox-pmr': 'Accès PMR',
    'checkbox-fumeurs': 'Fumeurs autorisés'
  };
  
  const selectedOptions = [];
  Object.entries(optionsMapping).forEach(([id, value]) => {
    const checkbox = document.getElementById(id);
    if (checkbox && checkbox.checked) {
      selectedOptions.push(value);
    }
  });
  currentValues.options_accueil = selectedOptions;

  // NOUVEAU : Collecter les modes de paiement cochés
  const modesPaiementMapping = {
    'checkbox-visa': 'Visa',
    'checkbox-especes': 'Espèces',
    'checkbox-mastercard': 'MasterCard',
    'checkbox-virement': 'Virement bancaire',
    'checkbox-paypal': 'PayPal',
    'checkbox-paylib': 'PayLib',
    'checkbox-amex': 'American Express',
    'checkbox-cheques': 'Chèques acceptés',
    'checkbox-cheques-vacances': 'Chèques-vacances'
  };
  
  const selectedModesPaiement = [];
  Object.entries(modesPaiementMapping).forEach(([id, value]) => {
    const checkbox = document.getElementById(id);
    if (checkbox && checkbox.checked) {
      selectedModesPaiement.push(value);
    }
  });
  currentValues.mode_paiement = selectedModesPaiement;
    
  // NOUVEAU : Reconstituer la chaîne taille maison
  const voyageurs = document.getElementById('voyageurs-input')?.value || '0';
  const chambres = document.getElementById('chambres-input')?.value || '0';
  const lits = document.getElementById('lits-input')?.value || '0';
  const sallesBain = document.getElementById('salles-bain-input')?.value || '0';
  
  const pluriel = {
    voyageur: parseInt(voyageurs) > 1 ? 's' : '',
    chambre: parseInt(chambres) > 1 ? 's' : '',
    lit: parseInt(lits) > 1 ? 's' : '',
    salle: parseInt(sallesBain) > 1 ? 's' : ''
  };
  
  const nouvelleTailleMaison = `${voyageurs} voyageur${pluriel.voyageur} - ${chambres} chambre${pluriel.chambre} - ${lits} lit${pluriel.lit} - ${sallesBain} salle${pluriel.salle} de bain`;

  // 🆕 NOUVEAU : Synchroniser capacity MAINTENANT avant toute comparaison
  const nouveauNombreVoyageurs = parseInt(voyageurs) || 0;
  if (this.pricingData && nouveauNombreVoyageurs !== this.pricingData.capacity) {
    this.pricingData.capacity = nouveauNombreVoyageurs;
  }

  // Collecter les horaires
  const heureArrivee = document.getElementById('heure-arrivee-input')?.value || '';
  const heureDepart = document.getElementById('heure-depart-input')?.value || '';
  
  if (heureArrivee && heureDepart) {
    currentValues.horaires_arrivee_depart = `${heureArrivee},${heureDepart}`;
  }

  // NOUVEAU : Construire l'adresse à partir des 3 champs
  const ville = document.getElementById('ville-input')?.value.trim() || '';
  const pays = document.getElementById('pays-input')?.value.trim() || '';
  const rue = document.getElementById('rue-input')?.value.trim() || '';
  
  // Construire l'adresse complète
  let adresseComplete = '';
  if (ville && pays) {
    adresseComplete = ville + ', ' + pays;
    if (rue) {
      adresseComplete += ', ' + rue;
    }
  }
  
  currentValues.address = adresseComplete;
    
  // NOUVEAU : Forcer le blur pour capturer les valeurs avec data-raw-value
  const cautionInput = document.getElementById('caution-input');
  const acompteInput = document.getElementById('acompte-input');
  
  if (cautionInput && document.activeElement === cautionInput) {
    cautionInput.blur();
  }
  if (acompteInput && document.activeElement === acompteInput) {
    acompteInput.blur();
  }
  
  // Petit délai pour laisser le blur se terminer
  await new Promise(resolve => setTimeout(resolve, 50));
  
  // MAINTENANT récupérer les valeurs
  const cautionValue = this.getRawValue(cautionInput) || '0';
  const acompteValue = this.getRawValue(acompteInput) || '0';
  
  let conditionsTexte = '';
  
  if (parseInt(cautionValue) > 0) {
    conditionsTexte = `Caution : Une caution de ${cautionValue}€ vous sera demandée au moment de la réservation`;
  }
  
  if (parseInt(acompteValue) > 0) {
    const acompteTexte = `Acompte : ${acompteValue}% du montant total de la réservation est demandé pour confirmer la réservation.`;
    conditionsTexte = conditionsTexte 
      ? conditionsTexte + '\n' + acompteTexte 
      : acompteTexte;
  }
  
  currentValues.conditions_reservation = conditionsTexte;

// Collecter la politique d'annulation
  const selectedPolicy = document.querySelector('input[name="cancellation-policy"]:checked');
  if (selectedPolicy) {
    if (selectedPolicy.value === 'custom') {
      const customText = document.getElementById('conditions-annulation-input')?.value.trim() || '';
      currentValues.conditions_annulation = customText;
    } else {
      currentValues.conditions_annulation = selectedPolicy.value;
    }
  }
    
  const updates = {};
  // Comparer avec les valeurs initiales
  Object.keys(currentValues).forEach(key => {
    if (key === 'equipements_principaux' || key === 'options_accueil' || key === 'mode_paiement') {
      const currentStr = currentValues[key].join(', ');
      const initialStr = (this.initialValues[key] || []).join(', ');
      if (currentStr !== initialStr) {
        updates[key] = currentStr;
      }
    } else if (currentValues[key] !== this.initialValues[key]) {
      updates[key] = currentValues[key];
    }
  });

  const currentStatus = this.propertyData.verification_status || 'pending-none';
  if (currentStatus === 'pending-none') {
    // C'est le premier enregistrement avec validation réussie
    updates['verification_status'] = 'pending-verif';
  }
    
  // NOUVEAU : Comparaison manuelle pour taille_maison
  if (nouvelleTailleMaison !== this.initialValues.taille_maison) {
    updates.taille_maison = nouvelleTailleMaison;
  }
  
  // Si taille_maison a changé ET contient des voyageurs, forcer l'envoi du JSON
  if (updates.taille_maison && updates.taille_maison.includes('voyageur')) {
    updates.pricing_data = this.pricingData;
  }

  // Si caution ou acompte a changé, forcer l'envoi du JSON
  const cautionChanged = parseInt(cautionValue) !== this.initialValues.caution;
  const acompteChanged = parseInt(acompteValue) !== this.initialValues.acompte;
  
  if ((updates.taille_maison && updates.taille_maison.includes('voyageur')) || 
      cautionChanged || acompteChanged) {
    updates.pricing_data = this.pricingData;
  }
    
  // 🆕 Gérer les extras séparément
  const currentExtrasString = this.generateExtrasString();
  const initialExtrasString = this.initialValues.extras || '';
  
  if (currentExtrasString !== initialExtrasString) {
    updates.extras = currentExtrasString;
  }
    
  // NOUVEAU : Collecter les iCals modifiés avec la bonne logique
  const currentIcalValues = [];
  for (let i = 1; i <= 4; i++) {
    const input = document.getElementById(`ical-url-${i}`);
    currentIcalValues.push(input ? input.value.trim() : '');
  }
  
  // Mapper les valeurs actuelles aux champs CMS
  // IMPORTANT : Les valeurs dans l'ordre des inputs correspondent aux champs CMS dans l'ordre
  this.icalFieldMapping.forEach((fieldName, index) => {
    const currentValue = currentIcalValues[index] || '';
    const initialValue = this.initialValues[fieldName] || '';
    
    // Toujours envoyer la valeur si elle a changé (même si vide)
    if (currentValue !== initialValue) {
      updates[fieldName] = currentValue;
    }
  });
      
  const originalPricingJson = JSON.stringify(this.propertyData.pricing_data || {});
  const currentPricingJson = JSON.stringify(this.pricingData);
  
  if (originalPricingJson !== currentPricingJson) {
    updates.pricing_data = this.pricingData;
  } else {
    console.log('❌ Les données tarifaires sont identiques, pas d\'ajout aux updates');
  }

  // 🆕 NOUVEAU : Vérifier si les images ont changé
  const originalImagesJson = JSON.stringify(this.originalImagesGallery);
  const currentImagesJson = JSON.stringify(this.currentImagesGallery);
  
  if (originalImagesJson !== currentImagesJson) {
    // Vérifier minimum 3 images avant de sauvegarder
    if (this.currentImagesGallery.length < 3) {
      this.showNotification('error', 'Minimum 3 photos requises pour le logement');
      
      // Réactiver le bouton
      saveButton.disabled = false;
      saveButton.textContent = originalText;
      return;
    }
    
    updates['photos-du-logement'] = this.currentImagesGallery;
  }
    
    // Si aucune modification
    if (Object.keys(updates).length === 0) {
      this.showNotification('error', 'Aucune modification détectée');
      return;
    }
    
    
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
      
      // Mettre à jour les valeurs initiales avec les nouvelles valeurs
      Object.keys(updates).forEach(key => {
        if (key !== 'pricing_data') {
          // IMPORTANT : Garder le format Array pour ces champs spécifiques
          if (key === 'equipements_principaux' || key === 'options_accueil' || key === 'mode_paiement') {
            // Utiliser currentValues qui a encore le format Array original
            this.initialValues[key] = currentValues[key];
          } else {
            this.initialValues[key] = updates[key];
          }
          
          // NOUVEAU : Si c'est le nom, mettre à jour aussi l'affichage
          if (key === 'name') {
            this.propertyData.name = updates[key];
            const titleElement = document.getElementById('logement-name-edit');
            if (titleElement) {
              titleElement.textContent = updates[key];
            }
          }
        }
      });
      
      // 🆕 IMPORTANT : Mettre à jour aussi les valeurs iCal dans propertyData
      this.icalFieldMapping.forEach((fieldName, index) => {
        const input = document.getElementById(`ical-url-${index + 1}`);
        if (input) {
          const currentValue = input.value.trim();
          this.propertyData[fieldName] = currentValue;
          this.initialValues[fieldName] = currentValue;
        }
      });
      
      // 🆕 AJOUTER : Mettre à jour les données pricing d'origine
      if (updates.pricing_data) {
        this.propertyData.pricing_data = JSON.parse(JSON.stringify(this.pricingData));
      }

      // 🆕 NOUVEAU : Mettre à jour les images d'origine après sauvegarde réussie
      if (updates['photos-du-logement']) {
        this.originalImagesGallery = JSON.parse(JSON.stringify(this.currentImagesGallery));
        this.propertyData.images_gallery = JSON.parse(JSON.stringify(this.currentImagesGallery));
        this.initialValues.images_gallery = JSON.parse(JSON.stringify(this.currentImagesGallery));
      }
        
      // Désactiver les boutons
      this.disableButtons();
      
      // Message de succès
      this.showNotification('success', 'Modifications enregistrées avec succès !');        
        
      } else {
        throw new Error(result.error || 'Erreur lors de la sauvegarde');
      }
      
     } catch (error) {
    console.error('❌ Erreur sauvegarde:', error);
    this.showNotification('error', 'Erreur lors de la sauvegarde : ' + error.message);
    } finally {
      // Réactiver le bouton
      saveButton.disabled = false;
      saveButton.textContent = originalText;
    }
  }
}

// Export global
window.PropertyEditor = PropertyEditor;
