// Gestionnaire de validation pour la page modification de logement - LOG production
class ValidationManager {
  constructor(propertyEditor) {
    this.editor = propertyEditor;
    this.errors = new Map();
    this.tabErrors = new Map();
    this.setupValidationConfig();
    this.init();
  }

  init() {
    this.setupCharacterCounters();
  }

  setupValidationConfig() {
    this.validationConfig = {
      // TAB 1 : Informations du logement
      tab1: {
        fields: {
          'name-input': {
            required: true,
            minLength: 5,
            maxLength: 80,
            messages: {
              empty: "Le nom du logement est obligatoire",
              minLength: "Le nom doit contenir au moins 3 caractères",
              maxLength: "Le nom ne peut pas dépasser 80 caractères"
            }
          },
          'ville-input': {
            required: true,
            messages: { empty: "La ville est obligatoire" }
          },
          'pays-input': {
            required: true,
            messages: { empty: "Le pays est obligatoire" }
          },
          'rue-input': {
            required: false  // Pas obligatoire
          },
          'voyageurs-input': {
            required: true,
            min: 1,
            messages: { 
              empty: "Le nombre de voyageurs est obligatoire",
              min: "Minimum 1 voyageur"
            }
          },
          'description-logement-input': {
            required: true,
            maxLength: 1000,
            messages: {
              empty: "La description du logement est obligatoire",
              maxLength: "Maximum 1000 caractères (actuellement: {count})"
            }
          },
          'description-alentours-input': {
            required: true,
            maxLength: 1000,
            messages: {
              empty: "La description des alentours est obligatoire",
              maxLength: "Maximum 1000 caractères (actuellement: {count})"
            }
          },
          'mode-location': {
            required: true,
            type: 'radio',
            messages: { empty: "Le mode de location est obligatoire" }
          },
          'code-enregistrement-input': {
            required: true,
            pattern: /^[A-Z0-9]{13}$/,
            messages: {
              empty: "Le code d'enregistrement est obligatoire",
              invalid: "Le code doit contenir exactement 13 caractères (lettres et chiffres)"
            }
          }
        },
        tabIndicatorId: 'error-indicator-tab1'
      },
      
      // TAB 3 : Tarification
      tab3: {
        fields: {
          'default-price-input': {
            required: true,
            min: 10,
            messages: {
              empty: "Le prix en direct est obligatoire",
              min: "Le prix minimum est de 10€"
            }
          },
          'default-min-nights-input': {
            required: true,
            min: 1,
            messages: {
              empty: "Le nombre de nuits minimum est obligatoire",
              min: "Minimum 1 nuit"
            }
          },
          'cleaning-option': {
            required: true,
            type: 'radio-group',
            messages: { empty: "Les frais de ménage doivent être définis" }
          },
          'ical-url-1': {
            required: true,
            pattern: /\b(?:https?|webcal):\/\/[^\s]*\.ics(?:[^\s]*)?\b/i,
            messages: { 
              empty: "Au moins un lien calendrier est obligatoire",
              invalid: "Le lien doit être une URL iCal valide (doit contenir .ics)"
            }
          },
          'ical-url-2': {
            required: false,
            pattern: /\b(?:https?|webcal):\/\/[^\s]*\.ics(?:[^\s]*)?\b/i,
            messages: { 
              invalid: "Le lien doit être une URL iCal valide (doit contenir .ics)"
            }
          },
          'ical-url-3': {
            required: false,
            pattern: /\b(?:https?|webcal):\/\/[^\s]*\.ics(?:[^\s]*)?\b/i,
            messages: { 
              invalid: "Le lien doit être une URL iCal valide (doit contenir .ics)"
            }
          },
          'ical-url-4': {
            required: false,
            pattern: /\b(?:https?|webcal):\/\/[^\s]*\.ics(?:[^\s]*)?\b/i,
            messages: { 
              invalid: "Le lien doit être une URL iCal valide (doit contenir .ics)"
            }
          },
          'discounts': {
            required: false,
            type: 'custom-discounts',
            messages: {
              duplicate: "Ce nombre de nuits existe déjà",
              incomplete: "Les deux champs (nuits et réduction) doivent être remplis"
            }
          },
          'annonce-airbnb-input': {
          required: false,
          pattern: /^https?:\/\/.*airbnb.*/i,
          customValidation: 'coherencePrixLien',
          messages: {
            invalid: "L'URL doit être un lien Airbnb",
            coherence: "Un prix Airbnb nécessite un lien d'annonce (et inversement)"
          }
        },
        'annonce-booking-input': {
          required: false,
          pattern: /^https?:\/\/.*booking.*/i,
          customValidation: 'coherencePrixLien',
          messages: {
            invalid: "L'URL doit être un lien Booking",
            coherence: "Un prix Booking nécessite un lien d'annonce (et inversement)"
          }
        },
        'annonce-gites-input': {
          required: false,
          customValidation: 'coherencePrixLien',
          messages: {
            coherence: "Un prix autre plateforme nécessite un lien d'annonce (et inversement)"
          }
        }
        },
        tabIndicatorId: 'error-indicator-tab3'
      },
      
      // TAB 4 : Conditions
      tab4: {
        fields: {
          'heure-arrivee-input': {
            required: true,
            messages: {
              empty: "L'heure d'arrivée est obligatoire"
            }
          },
          'heure-depart-input': {
            required: true,
            messages: {
              empty: "L'heure de départ est obligatoire"
            }
          },
          'caution-input': {
            required: true,
            min: 0,
            messages: {
              empty: "Le montant de la caution est obligatoire",
              min: "La caution ne peut pas être négative"
            }
          },
          'conditions-annulation-input': {
            required: true,
            maxLength: 1000,
            messages: {
              empty: "Les conditions d'annulation sont obligatoires",
              maxLength: "Maximum 1000 caractères (actuellement: {count})"
            }
          },
          'inclus-reservation-input': {
            required: false,
            maxLength: 500,
            messages: {
              maxLength: "Maximum 500 caractères (actuellement: {count})"
            }
          },
          'cadeaux-input': {
            required: false,
            maxLength: 250,
            messages: {
              maxLength: "Maximum 250 caractères (actuellement: {count})"
            }
          },
          'payment-methods': {
            required: true,
            type: 'checkbox-group',
            minChecked: 1,
            messages: {
              empty: "Au moins un moyen de paiement doit être sélectionné"
            }
          }
        },
        tabIndicatorId: 'error-indicator-tab4'
      },
      
      // TAB 5 : Hôte
      tab5: {
        fields: {
          'hote-input': {
            required: true,
            messages: { empty: "Le prénom de l'hôte est obligatoire" }
          },
          'email-input': {
            required: true,
            pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
            messages: {
              empty: "L'email est obligatoire",
              invalid: "Format d'email invalide"
            }
          },
          'telephone-input': {
            required: true,
            pattern: /^\+?\d{10,15}$/,
            messages: {
              empty: "Le téléphone est obligatoire",
              invalid: "Numéro de téléphone invalide"
            }
          }
        },
        tabIndicatorId: 'error-indicator-tab5'
      }
    };
  }

  // Configurer les compteurs de caractères
  setupCharacterCounters() {
    const textareasWithLimit = [
      { id: 'description-logement-input', limit: 1000 },
      { id: 'description-alentours-input', limit: 1000 },
      { id: 'conditions-annulation-input', limit: 1000 },
      { id: 'inclus-reservation-input', limit: 500 },
      { id: 'cadeaux-input', limit: 250 }
    ];

    textareasWithLimit.forEach(({ id, limit }) => {
      const textarea = document.getElementById(id);
      const counter = textarea?.nextElementSibling;
      
      if (textarea && counter && counter.classList.contains('character-counter')) {
        // Affichage initial
        this.updateCharacterCounter(textarea, counter, limit);
        
        // Mise à jour en temps réel
        textarea.addEventListener('input', () => {
          this.updateCharacterCounter(textarea, counter, limit);
        });
      }
    });
  }

  updateCharacterCounter(textarea, counter, limit) {
    const count = textarea.value.length;
    counter.textContent = `${count} / ${limit}`;
    
    // Gestion des classes CSS
    counter.classList.remove('warning', 'error');
    
    if (count > limit) {
      counter.classList.add('error');
    } else if (count > limit * 0.9) {
      counter.classList.add('warning');
    }
  }

  // Validation au blur (formats seulement)
  validateFieldOnBlur(fieldId) {
    // Trouver la config de ce champ
    let fieldConfig = null;
    let tabKey = null;
    
    for (const [tab, config] of Object.entries(this.validationConfig)) {
      if (config.fields[fieldId]) {
        fieldConfig = config.fields[fieldId];
        tabKey = tab;
        break;
      }
    }
    
    if (!fieldConfig) return;
    
    const field = document.getElementById(fieldId);
    if (!field) return;
    
    const value = this.getFieldValue(fieldId, fieldConfig.type);
    
    // Au blur, on ne valide que les formats et règles, PAS les champs vides
    if (value === '' || value === null) {
      this.hideFieldError(fieldId);
      return;
    }
    
    // Validation pattern
    if (fieldConfig.pattern && !fieldConfig.pattern.test(value)) {
      this.showFieldError(fieldId, fieldConfig.messages.invalid);
      return;
    }
    
    // Validation min/max pour les nombres
    if (fieldConfig.min !== undefined && parseFloat(value) < fieldConfig.min) {
      this.showFieldError(fieldId, fieldConfig.messages.min);
      return;
    }
    
    // Validation longueur max
    if (fieldConfig.maxLength && value.length > fieldConfig.maxLength) {
      const message = fieldConfig.messages.maxLength.replace('{count}', value.length);
      this.showFieldError(fieldId, message);
      return;
    }
    
    // Si on arrive ici, pas d'erreur
    this.hideFieldError(fieldId);
  }

  // Validation de cohérence prix/lien plateformes
  validateCoherencePrixLien() {
    let hasError = false;
    const platforms = [
      { price: 'default-airbnb-price-input', link: 'annonce-airbnb-input', name: 'Airbnb' },
      { price: 'default-booking-price-input', link: 'annonce-booking-input', name: 'Booking' },
      { price: 'default-other-price-input', link: 'annonce-gites-input', name: 'autre plateforme' }
    ];
    
    platforms.forEach(({ price, link, name }) => {
      const priceInput = document.getElementById(price);
      const linkInput = document.getElementById(link);
      
      if (!priceInput || !linkInput) return;
      
      const priceValue = parseFloat(this.editor.getRawValue(priceInput)) || 0;
      const linkValue = linkInput.value.trim();
      
      // Si prix sans lien OU lien sans prix
      if ((priceValue > 0 && !linkValue) || (linkValue && priceValue === 0)) {
        const message = `Un prix ${name} nécessite un lien d'annonce (et inversement)`;
        
        if (priceValue > 0 && !linkValue) {
          this.showFieldError(link, message);
        } else {
          this.showFieldError(price, message);
        }
        
        hasError = true;
      } else {
        // Nettoyer les erreurs si tout est OK
        this.hideFieldError(price);
        this.hideFieldError(link);
      }
    });
    
    return !hasError;
  }
  
  
  // Validation complète (au save)
  validateAllFields() {
    
    this.errors.clear();
    this.tabErrors.clear();
    let isValid = true;
    
    // Parcourir toutes les tabs
    for (const [tabKey, tabConfig] of Object.entries(this.validationConfig)) {
      let tabHasErrors = false;
      
      // Parcourir tous les champs de la tab
      for (const [fieldId, fieldConfig] of Object.entries(tabConfig.fields)) {
        const error = this.validateField(fieldId, fieldConfig);
        
        if (error) {
          this.errors.set(fieldId, error);
          this.showFieldError(fieldId, error);
          tabHasErrors = true;
          isValid = false;
        } else {
          this.hideFieldError(fieldId);
        }
      }
      
      // Mettre à jour l'indicateur de la tab
      if (tabHasErrors) {
        this.tabErrors.set(tabKey, true);
        this.showTabError(tabConfig.tabIndicatorId);
      } else {
        this.hideTabError(tabConfig.tabIndicatorId);
      }
    }

    // NOUVEAU : Validation spéciale de l'adresse combinée
    const ville = document.getElementById('ville-input')?.value.trim() || '';
    const pays = document.getElementById('pays-input')?.value.trim() || '';
    
    // Si ville ou pays manque, l'adresse sera invalide
    if (!ville || !pays) {
      // Les erreurs sont déjà affichées par champ individuel
      // Mais on s'assure que la tab a l'indicateur d'erreur
      this.showTabError('error-indicator-tab1');
      isValid = false;
    }
    
    // Validation spéciale prix plateformes
    if (!this.validatePlatformPrices()) {
      isValid = false;
      this.showTabError('error-indicator-tab3');
    }

    if (!this.validateCoherencePrixLien()) {
      isValid = false;
      this.showTabError('error-indicator-tab3');
    }
    
    // Validation des réductions
    if (!this.validateDiscounts()) {
      isValid = false;
      this.showTabError('error-indicator-tab3');
    }
    
    console.log(isValid ? '✅ Validation réussie' : '❌ Validation échouée');
    return isValid;
  }

  // Valider un champ spécifique
  validateField(fieldId, fieldConfig) {
    const value = this.getFieldValue(fieldId, fieldConfig.type);
    
    // Validation required
    if (fieldConfig.required) {
      if (value === '' || value === null || value === undefined) {
        return fieldConfig.messages.empty;
      }
      
      // Pour les groupes checkbox
      if (fieldConfig.type === 'checkbox-group' && value.length === 0) {
        return fieldConfig.messages.empty;
      }
    }
    
    // Si le champ est vide et non requis, pas d'autres validations
    if (!value) return null;
    
    // Validation pattern
    if (fieldConfig.pattern && !fieldConfig.pattern.test(value)) {
      return fieldConfig.messages.invalid;
    }
    
    // Validation min
    if (fieldConfig.min !== undefined && parseFloat(value) < fieldConfig.min) {
      return fieldConfig.messages.min;
    }
    
    // Validation max length
    if (fieldConfig.maxLength && value.length > fieldConfig.maxLength) {
      return fieldConfig.messages.maxLength.replace('{count}', value.length);
    }
    
    // Validation minChecked pour checkbox groups
    if (fieldConfig.minChecked && value.length < fieldConfig.minChecked) {
      return fieldConfig.messages.empty;
    }

    // Validation min length
    if (fieldConfig.minLength && value.length < fieldConfig.minLength) {
      return fieldConfig.messages.minLength;
    }
    
    // Validation max length (déjà existant)
    if (fieldConfig.maxLength && value.length > fieldConfig.maxLength) {
      return fieldConfig.messages.maxLength.replace('{count}', value.length);
    }
    
    return null;
  }

  // Obtenir la valeur d'un champ selon son type
  getFieldValue(fieldId, type) {
    switch (type) {
      case 'radio':
        const checkedRadio = document.querySelector(`input[name="${fieldId}"]:checked`);
        return checkedRadio ? checkedRadio.value : '';
        
      case 'radio-group':
        // Pour les options de ménage
        if (fieldId === 'cleaning-option') {
          const inclus = document.getElementById('inclus');
          const nonInclus = document.getElementById('non-inclus');
          return (inclus?.checked || nonInclus?.checked) ? 'selected' : '';
        }
        return '';
        
      case 'checkbox-group':
        // Pour les moyens de paiement
        if (fieldId === 'payment-methods') {
          const checkboxes = document.querySelectorAll('[id^="checkbox-"][id$="visa"], [id^="checkbox-"][id$="mastercard"], [id^="checkbox-"][id$="especes"], [id^="checkbox-"][id$="virement"], [id^="checkbox-"][id$="paypal"], [id^="checkbox-"][id$="paylib"], [id^="checkbox-"][id$="amex"], [id^="checkbox-"][id$="cheques"], [id^="checkbox-"][id$="cheques-vacances"]');
          const checked = Array.from(checkboxes).filter(cb => cb.checked);
          return checked;
        }
        return [];
        
      default:
        const field = document.getElementById(fieldId);
        if (!field) return '';
        
        // Pour les champs avec suffixes, utiliser getRawValue
        if (field.hasAttribute('data-raw-value')) {
          return this.editor.getRawValue(field);
        }
        
        return field.value;
    }
  }

  // Validation spéciale des prix plateformes
  validatePlatformPrices() {
    const directPriceInput = document.getElementById('default-price-input');
    if (!directPriceInput) return true;
    
    const directPrice = parseFloat(this.editor.getRawValue(directPriceInput)) || 0;
    if (directPrice === 0) return true; // Pas de validation si pas de prix direct
    
    const minPlatformPrice = directPrice * 1.10; // +10%
    let hasError = false;
    
    ['airbnb', 'booking', 'other'].forEach(platform => {
      const input = document.getElementById(`default-${platform}-price-input`);
      if (input) {
        const platformPrice = parseFloat(this.editor.getRawValue(input)) || 0;
        
        if (platformPrice > 0 && platformPrice < minPlatformPrice) {
          this.showFieldError(
            `default-${platform}-price-input`, 
            `Le prix doit être au moins ${Math.ceil(minPlatformPrice)}€ (10% de plus que le prix direct)`
          );
          hasError = true;
        } else {
          this.hideFieldError(`default-${platform}-price-input`);
        }
      }
    });
    
    return !hasError;
  }


  // Validation des doublons au blur
  validateDiscountDuplicateOnBlur(inputElement, currentIndex) {
    // Récupérer la valeur actuelle
    const currentValue = parseInt(inputElement.value) || 0;
    if (currentValue === 0) {
      this.hideDiscountError(inputElement);
      return;
    }
    
    // Parcourir toutes les autres réductions
    const allDiscounts = this.editor.pricingData.discounts || [];
    
    for (let i = 0; i < allDiscounts.length; i++) {
      if (i !== currentIndex && allDiscounts[i].nights === currentValue) {
        this.showDiscountError(inputElement, this.validationConfig.tab3.fields.discounts.messages.duplicate);
        return;
      }
    }
    
    // Pas de doublon
    this.hideDiscountError(inputElement);
  }
  
  // Validation complète des réductions (au save)
  validateDiscounts() {
    const discounts = this.editor.pricingData.discounts || [];
    let hasError = false;
    
    // Map pour stocker les nombres de nuits et détecter les doublons
    const nightsMap = new Map();
    
    discounts.forEach((discount, index) => {
      let blocElement;
      if (index === 0) {
        blocElement = document.querySelector('.bloc-reduction:not(.next)');
      } else {
        const nextBlocs = document.querySelectorAll('.bloc-reduction.next');
        blocElement = nextBlocs[index - 1];
      }
      
      if (!blocElement) return;
      
      const nightsInput = blocElement.querySelector('[data-discount="nights"]');
      const percentageInput = blocElement.querySelector('[data-discount="percentage"]');
      
      if (!nightsInput || !percentageInput) return;
      
      const nights = parseInt(nightsInput.value) || 0;
      const percentage = parseInt(this.editor.getRawValue(percentageInput)) || 0;
      
      // Vérifier si les deux champs sont remplis ou vides
      if ((nights > 0 && percentage === 0) || (nights === 0 && percentage > 0)) {
        // Un seul champ est rempli
        if (nights === 0) {
          this.showDiscountError(nightsInput, this.validationConfig.tab3.fields.discounts.messages.incomplete);
        }
        if (percentage === 0) {
          this.showDiscountError(percentageInput, this.validationConfig.tab3.fields.discounts.messages.incomplete);
        }
        hasError = true;
      } else {
        // Les deux sont OK, vérifier les doublons uniquement si nights > 0
        if (nights > 0) {
          if (nightsMap.has(nights)) {
            this.showDiscountError(nightsInput, this.validationConfig.tab3.fields.discounts.messages.duplicate);
            hasError = true;
          } else {
            nightsMap.set(nights, index);
            this.hideDiscountError(nightsInput);
          }
        }
        this.hideDiscountError(percentageInput);
      }
    });
    
    return !hasError;
  }
  
  // Afficher l'erreur sur un input de réduction
  showDiscountError(input, message) {
    // Border rouge
    input.style.borderColor = '#E53131';
    
    // Chercher la div error existante (créée dans Webflow)
    let errorDiv = input.nextElementSibling;
    
    // Si c'est dans un flex-error, chercher différemment
    if (!errorDiv?.classList.contains('error')) {
      const flexErrorParent = input.closest('.flex-error');
      if (flexErrorParent) {
        errorDiv = flexErrorParent.querySelector('.error');
      }
    }
    
    if (errorDiv && errorDiv.classList.contains('error')) {
      errorDiv.textContent = message;
      errorDiv.classList.add('show');
    }
  }
  
  // Masquer l'erreur d'un input de réduction
  hideDiscountError(input) {
    // Retirer le border rouge
    input.style.borderColor = '';
    
    // Chercher la div error existante
    let errorDiv = input.nextElementSibling;
    
    // Si c'est dans un flex-error, chercher différemment
    if (!errorDiv?.classList.contains('error')) {
      const flexErrorParent = input.closest('.flex-error');
      if (flexErrorParent) {
        errorDiv = flexErrorParent.querySelector('.error');
      }
    }
    
    if (errorDiv && errorDiv.classList.contains('error')) {
      errorDiv.textContent = '';
      errorDiv.classList.remove('show');
    }
  }
  

  // Validation d'une saison (ajout ou modification)
  validateSeason(isEdit = false) {
    
    const suffix = isEdit ? '-edit' : '';
    let hasError = false;
    
    // Récupérer les champs
    const nameInput = document.getElementById(`season-name-input${suffix}`);
    const startInput = document.getElementById(`season-date-start-input${suffix}`);
    const endInput = document.getElementById(`season-date-end-input${suffix}`);
    const priceInput = document.getElementById(`season-price-input${suffix}`);
    const minNightsInput = document.getElementById(`season-min-nights-input${suffix}`);
    
    // Validation du nom
    if (!nameInput || !nameInput.value.trim()) {
      this.showFieldError(`season-name-input${suffix}`, "Le nom de la saison est obligatoire");
      hasError = true;
    } else {
      this.hideFieldError(`season-name-input${suffix}`);
    }
    
    // Validation des dates
    const startDate = this.editor.getDateValue(startInput);
    const endDate = this.editor.getDateValue(endInput);
    
    if (!startDate) {
      this.showFieldError(`season-date-start-input${suffix}`, "La date de début est obligatoire");
      hasError = true;
    } else {
      this.hideFieldError(`season-date-start-input${suffix}`);
    }
    
    if (!endDate) {
      this.showFieldError(`season-date-end-input${suffix}`, "La date de fin est obligatoire");
      hasError = true;
    } else {
      this.hideFieldError(`season-date-end-input${suffix}`);
    }
    
    // Validation du prix
    const price = parseInt(this.editor.getRawValue(priceInput)) || 0;
    if (price < 10) {
      this.showFieldError(`season-price-input${suffix}`, "Le prix minimum est de 10€");
      hasError = true;
    } else {
      this.hideFieldError(`season-price-input${suffix}`);
    }
    
    // Validation des nuits minimum
    const minNights = parseInt(this.editor.getRawValue(minNightsInput)) || 0;
    if (minNights < 1) {
      this.showFieldError(`season-min-nights-input${suffix}`, "Minimum 1 nuit");
      hasError = true;
    } else {
      this.hideFieldError(`season-min-nights-input${suffix}`);
    }
    
    // Si pas d'erreur de base, vérifier les chevauchements de dates
    if (!hasError && startDate && endDate) {
      const overlap = this.checkSeasonDateOverlap(startDate, endDate, isEdit);
      if (overlap) {
        this.showFieldError(`season-date-start-input${suffix}`, overlap);
        this.showFieldError(`season-date-end-input${suffix}`, overlap);
        hasError = true;
      }
    }
    
    // Validation des prix plateformes (si renseignés)
    if (!hasError && price > 0) {
      hasError = !this.validateSeasonPlatformPrices(price, suffix);
    }
    
    return !hasError;
  }
  
  // Vérifier le chevauchement des dates
  checkSeasonDateOverlap(newStart, newEnd, isEdit) {
    const seasons = this.editor.pricingData.seasons || [];
    const editingIndex = isEdit ? this.editor.editingSeasonIndex : -1;
    
    // Convertir les dates au format comparable
    const [newStartDay, newStartMonth] = newStart.split('-').map(n => parseInt(n));
    const [newEndDay, newEndMonth] = newEnd.split('-').map(n => parseInt(n));
    
    for (let i = 0; i < seasons.length; i++) {
      // Ignorer la saison en cours de modification
      if (i === editingIndex) continue;
      
      const season = seasons[i];
      if (!season.periods || season.periods.length === 0) continue;
      
      for (const period of season.periods) {
        const [startDay, startMonth] = period.start.split('-').map(n => parseInt(n));
        const [endDay, endMonth] = period.end.split('-').map(n => parseInt(n));
        
        // Vérifier le chevauchement (même logique que dans votre serveur)
        if (this.datesOverlap(
          newStartDay, newStartMonth, newEndDay, newEndMonth,
          startDay, startMonth, endDay, endMonth
        )) {
          return `Ces dates chevauchent avec la saison "${season.name}"`;
        }
      }
    }
    
    return null;
  }
  
  // Vérifier si deux périodes se chevauchent
  datesOverlap(start1Day, start1Month, end1Day, end1Month, start2Day, start2Month, end2Day, end2Month) {
    // Convertir en valeur numérique pour comparer (MMDD)
    const start1 = start1Month * 100 + start1Day;
    const end1 = end1Month * 100 + end1Day;
    const start2 = start2Month * 100 + start2Day;
    const end2 = end2Month * 100 + end2Day;
    
    // Gérer les périodes qui traversent l'année
    if (start1 > end1) { // Période 1 traverse l'année
      return (start2 <= end1 || start2 >= start1) || (end2 <= end1 || end2 >= start1);
    }
    
    if (start2 > end2) { // Période 2 traverse l'année
      return (start1 <= end2 || start1 >= start2) || (end1 <= end2 || end1 >= start2);
    }
    
    // Cas normal : chevauchement si une période commence avant la fin de l'autre
    return start1 <= end2 && end1 >= start2;
  }
  
  // Validation des prix plateformes d'une saison
  validateSeasonPlatformPrices(directPrice, suffix) {
    const minPlatformPrice = directPrice * 1.10; // +10%
    let hasError = false;
    
    ['airbnb', 'booking', 'other'].forEach(platform => {
      const input = document.getElementById(`season-${platform}-price-input${suffix}`);
      if (input) {
        const platformPrice = parseFloat(this.editor.getRawValue(input)) || 0;
        
        if (platformPrice > 0 && platformPrice < minPlatformPrice) {
          this.showFieldError(
            `season-${platform}-price-input${suffix}`, 
            `Le prix doit être au moins ${Math.ceil(minPlatformPrice)}€ (10% de plus que le prix direct)`
          );
          hasError = true;
        } else {
          this.hideFieldError(`season-${platform}-price-input${suffix}`);
        }
      }
    });
    
    return !hasError;
  }


  
  
  // Afficher une erreur sur un champ
  showFieldError(fieldId, message) {
    if (fieldId === 'payment-methods') {
      const paymentGroup = document.querySelector('[data-group="payment-methods"]');
      if (paymentGroup) {
        let errorDiv = paymentGroup.nextElementSibling;
        if (errorDiv && errorDiv.classList.contains('error')) {
          errorDiv.textContent = message;
          errorDiv.classList.add('show');
        }
      }
      return;
    }
    const field = document.getElementById(fieldId);
    if (!field) return;
    
    // Border rouge sur l'input
    field.style.borderColor = '#E53131';
    
    // Message d'erreur
    let errorDiv = field.nextElementSibling;
    
    // Pour les caractères counter, prendre le suivant
    if (errorDiv?.classList.contains('character-counter')) {
      errorDiv = errorDiv.nextElementSibling;
    }
    
    // 🆕 NOUVEAU : Pour les inputs dans flex-error
    if (!errorDiv?.classList.contains('error')) {
      const flexErrorParent = field.closest('.flex-error');
      if (flexErrorParent) {
        // Chercher la div error DANS le flex-error
        errorDiv = flexErrorParent.querySelector('.error');
      }
    }
    
    // Pour les groupes, chercher la div error-group
    if (!errorDiv?.classList.contains('error')) {
      const parent = field.closest('[data-group]');
      if (parent) {
        errorDiv = parent.nextElementSibling;
      }
    }
    
    if (errorDiv && errorDiv.classList.contains('error')) {
      errorDiv.textContent = message;
      errorDiv.classList.add('show');
    }
  }

  // Masquer l'erreur d'un champ
  hideFieldError(fieldId) {
    if (fieldId === 'payment-methods') {
      const paymentGroup = document.querySelector('[data-group="payment-methods"]');
      if (paymentGroup) {
        let errorDiv = paymentGroup.nextElementSibling;
        if (errorDiv && errorDiv.classList.contains('error')) {
          errorDiv.textContent = '';
          errorDiv.classList.remove('show');
        }
      }
      return;
    }
    const field = document.getElementById(fieldId);
    if (!field) return;
    
    // Retirer le border rouge
    field.style.borderColor = '';
    
    // Masquer le message
    let errorDiv = field.nextElementSibling;
    
    // Pour les caractères counter
    if (errorDiv?.classList.contains('character-counter')) {
      errorDiv = errorDiv.nextElementSibling;
    }
    
    // 🆕 NOUVEAU : Pour les inputs dans flex-error
    if (!errorDiv?.classList.contains('error')) {
      const flexErrorParent = field.closest('.flex-error');
      if (flexErrorParent) {
        errorDiv = flexErrorParent.querySelector('.error');
      }
    }
    
    // Pour les groupes
    if (!errorDiv?.classList.contains('error')) {
      const parent = field.closest('[data-group]');
      if (parent) {
        errorDiv = parent.nextElementSibling;
      }
    }
    
    if (errorDiv && errorDiv.classList.contains('error')) {
      errorDiv.textContent = '';
      errorDiv.classList.remove('show');
    }
  }

  // Afficher l'indicateur d'erreur sur une tab
  showTabError(indicatorId) {
    const indicator = document.getElementById(indicatorId);
    if (indicator) {
      indicator.style.display = 'block';
    }
  }

  // Masquer l'indicateur d'erreur sur une tab
  hideTabError(indicatorId) {
    const indicator = document.getElementById(indicatorId);
    if (indicator) {
      indicator.style.display = 'none';
    }
  }

  // Nettoyer toutes les erreurs
  clearAllErrors() {
    // Masquer tous les messages d'erreur
    document.querySelectorAll('.error.show').forEach(error => {
      error.textContent = '';
      error.classList.remove('show');
    });
    
    // Retirer les borders rouges
    document.querySelectorAll('input, textarea, select').forEach(field => {
      field.style.borderColor = '';
    });
    
    // Masquer les indicateurs de tabs
    ['error-indicator-tab1', 'error-indicator-tab3', 'error-indicator-tab4', 'error-indicator-tab5'].forEach(id => {
      this.hideTabError(id);
    });
    
    this.errors.clear();
    this.tabErrors.clear();
  }
}

// Export
window.ValidationManager = ValidationManager;
