// Gestionnaire de validation pour la page modification de logement V7
class ValidationManager {
  constructor(propertyEditor) {
    this.editor = propertyEditor;
    this.errors = new Map();
    this.tabErrors = new Map();
    this.setupValidationConfig();
    this.init();
  }

  init() {
    console.log('✅ ValidationManager initialisé');
    this.setupCharacterCounters();
  }

  setupValidationConfig() {
    this.validationConfig = {
      // TAB 1 : Informations du logement
      tab1: {
        fields: {
          'adresse-input': {
            required: true,
            messages: { empty: "L'adresse est obligatoire" }
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
            pattern: /^\d{13}$/,
            messages: {
              empty: "Le code d'enregistrement est obligatoire",
              invalid: "Le code doit contenir exactement 13 chiffres"
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
            type: 'custom',
            customValidation: 'validateDiscounts',
            messages: {
              duplicate: "Ce nombre de nuits existe déjà",
              incomplete: "Veuillez remplir le nombre de nuits et le pourcentage de réduction"
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
            pattern: /^\d{2}:\d{2}$/,
            messages: {
              empty: "L'heure d'arrivée est obligatoire",
              invalid: "Format attendu: HH:MM"
            }
          },
          'heure-depart-input': {
            required: true,
            pattern: /^\d{2}:\d{2}$/,
            messages: {
              empty: "L'heure de départ est obligatoire",
              invalid: "Format attendu: HH:MM"
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
      { id: 'conditions-annulation-input', limit: 1000 }
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


  // Validation des réductions (doublons et champs incomplets)
  validateDiscounts() {
    let hasError = false;
    const nightsMap = new Map(); // Pour détecter les doublons
    
    // Récupérer TOUS les inputs nights visibles
    const allNightsInputs = document.querySelectorAll('[data-discount="nights"]');
    const allPercentageInputs = document.querySelectorAll('[data-discount="percentage"]');
    
    // D'abord, nettoyer toutes les erreurs
    allNightsInputs.forEach(input => {
      const block = input.closest('.bloc-reduction, .bloc-reduction.next');
      if (block && block.style.display !== 'none') {
        this.hideFieldError(input);
      }
    });
    
    allPercentageInputs.forEach(input => {
      const block = input.closest('.bloc-reduction, .bloc-reduction.next');
      if (block && block.style.display !== 'none') {
        this.hideFieldError(input);
      }
    });
    
    // Ensuite, valider chaque bloc visible
    allNightsInputs.forEach((nightsInput, index) => {
      const block = nightsInput.closest('.bloc-reduction, .bloc-reduction.next');
      if (!block || block.style.display === 'none') return;
      
      const percentageInput = block.querySelector('[data-discount="percentage"]');
      if (!percentageInput) return;
      
      const nights = nightsInput.value.trim();
      const percentage = this.editor.getRawValue(percentageInput) || percentageInput.value.replace(/[^\d]/g, '');
      
      // Vérifier si les deux champs sont remplis ou les deux vides
      if ((nights && !percentage) || (!nights && percentage)) {
        // Un seul champ rempli = erreur
        if (!nights) {
          this.showDiscountError(nightsInput, this.validationConfig.tab3.fields.discounts.messages.incomplete);
        }
        if (!percentage) {
          this.showDiscountError(percentageInput, this.validationConfig.tab3.fields.discounts.messages.incomplete);
        }
        hasError = true;
      }
      
      // Vérifier les doublons seulement si nights est rempli
      if (nights) {
        if (nightsMap.has(nights)) {
          // Doublon trouvé
          this.showDiscountError(nightsInput, this.validationConfig.tab3.fields.discounts.messages.duplicate);
          hasError = true;
        } else {
          nightsMap.set(nights, index);
        }
      }
    });
    
    return !hasError;
  }
  
  // Nouvelle méthode spécifique pour les erreurs de réduction
  showDiscountError(input, message) {
    // Border rouge sur l'input
    input.style.borderColor = '#E53131';
    
    // Chercher la div error juste après cet input spécifique
    let errorDiv = input.nextElementSibling;
    
    if (errorDiv && errorDiv.classList.contains('error')) {
      errorDiv.textContent = message;
      errorDiv.classList.add('show');
    }
  }
  
  // Cacher l'erreur d'un champ de réduction
  hideFieldError(input) {
    // Si on reçoit un ID string, chercher l'élément
    if (typeof input === 'string') {
      input = document.getElementById(input);
      if (!input) return;
    }
    
    // Retirer le border rouge
    input.style.borderColor = '';
    
    // Chercher et masquer l'erreur
    let errorDiv = input.nextElementSibling;
    
    if (errorDiv && errorDiv.classList.contains('error')) {
      errorDiv.textContent = '';
      errorDiv.classList.remove('show');
    }
  }
  
  // Validation d'une réduction au blur
  validateDiscountOnBlur(nightsInput) {
    const block = nightsInput.closest('.bloc-reduction, .bloc-reduction.next');
    if (!block || block.style.display === 'none') return;
    
    const nights = nightsInput.value.trim();
    
    // Si le champ est vide, pas d'erreur au blur
    if (!nights) {
      this.hideFieldError(nightsInput);
      return;
    }
    
    // Vérifier les doublons
    let hasDuplicate = false;
    
    document.querySelectorAll('[data-discount="nights"]').forEach(input => {
      if (input !== nightsInput && input.value.trim() === nights) {
        const parentBlock = input.closest('.bloc-reduction, .bloc-reduction.next');
        if (parentBlock && parentBlock.style.display !== 'none') {
          hasDuplicate = true;
        }
      }
    });
    
    if (hasDuplicate) {
      this.showDiscountError(nightsInput, this.validationConfig.tab3.fields.discounts.messages.duplicate);
    } else {
      this.hideFieldError(nightsInput);
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

    // Cas spécial pour les réductions
    if (fieldId === 'discounts') {
      this.validateDiscounts();
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

  // Validation complète (au save)
  validateAllFields() {
    console.log('🔍 Validation complète des champs...');
    
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

    // Validation spéciale réductions
    if (!this.validateDiscounts()) {
      isValid = false;
      this.showTabError('error-indicator-tab3');
    }
    
    // Validation spéciale prix plateformes
    if (!this.validatePlatformPrices()) {
      isValid = false;
      this.showTabError('error-indicator-tab3');
    }
    
    // Validation spéciale prix plateformes
    if (!this.validatePlatformPrices()) {
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
    
    ['airbnb', 'booking', 'gites', 'other'].forEach(platform => {
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

  // Afficher une erreur sur un champ
  showFieldError(fieldId, message) {
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
