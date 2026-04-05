// LOG production V1.49
// Gestionnaire de validation pour la page modification de logement
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
            minLength: 3,
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
            required: false
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
            required: false,
            pattern: /^(?:https?|webcal):\/\/[^\s]+(?:\.ical|\.ics|\/ical|\/calendar|\/export|\/feed)?/i,
            messages: { 
              invalid: "Le lien doit être une URL de calendrier valide"
            }
          },
          'ical-url-2': {
            required: false,
            pattern: /^(?:https?|webcal):\/\/[^\s]+(?:\.ical|\.ics|\/ical|\/calendar|\/export|\/feed)?/i,
            messages: { 
              invalid: "Le lien doit être une URL de calendrier valide"
            }
          },
          'ical-url-3': {
            required: false,
            pattern: /^(?:https?|webcal):\/\/[^\s]+(?:\.ical|\.ics|\/ical|\/calendar|\/export|\/feed)?/i,
            messages: { 
              invalid: "Le lien doit être une URL de calendrier valide"
            }
          },
          'ical-url-4': {
            required: false,
            pattern: /^(?:https?|webcal):\/\/[^\s]+(?:\.ical|\.ics|\/ical|\/calendar|\/export|\/feed)?/i,
            messages: { 
              invalid: "Le lien doit être une URL de calendrier valide"
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
            required: false,
            conditionalRequired: true,
            conditionalCheck: () => document.getElementById('arrivee-fixe')?.checked,
            messages: {
              empty: "L'heure d'arrivée est obligatoire"
            }
          },
          'heure-arrivee-debut-input': {
            required: false,
            conditionalRequired: true,
            conditionalCheck: () => document.getElementById('arrivee-creneau')?.checked,
            messages: {
              empty: "L'heure de début est obligatoire"
            }
          },
          'heure-arrivee-fin-input': {
            required: false,
            conditionalRequired: true,
            conditionalCheck: () => document.getElementById('arrivee-creneau')?.checked,
            messages: {
              empty: "L'heure de fin est obligatoire"
            }
          },
          'heure-depart-input': {
            required: true,
            messages: {
              empty: "L'heure de départ est obligatoire"
            }
          },
          'caution-input': {
            required: false,
            min: 0,
            messages: {
              min: "La caution ne peut pas être négative"
            }
          },
          'cancellation-policy': {
            required: true,
            type: 'radio',
            messages: {
              empty: "Veuillez choisir une politique d'annulation"
            }
          },
          'conditions-annulation-input': {
            required: false,
            maxLength: 1000,
            conditionalRequired: true,
            messages: {
              empty: "Le texte personnalisé est obligatoire",
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
  

  // Config de validation pour les chambres
    this.roomValidationConfig = {
      tab1: {
        fields: {
          'name-input-chambre': {
            required: true,
            minLength: 2,
            maxLength: 80,
            messages: {
              empty: "Le nom de la chambre est obligatoire",
              minLength: "Le nom doit contenir au moins 2 caractères",
              maxLength: "Le nom ne peut pas dépasser 80 caractères"
            }
          },
          'voyageurs-input-chambre': {
            required: true,
            min: 1,
            messages: {
              empty: "Le nombre de voyageurs est obligatoire",
              min: "Minimum 1 voyageur"
            }
          },
          'lits-input-chambre': {
            required: true,
            min: 1,
            messages: {
              empty: "Le nombre de lits est obligatoire",
              min: "Minimum 1 lit"
            }
          },
          'taille-chambre': {
            required: true,
            min: 1,
            messages: {
              empty: "La taille en m² est obligatoire",
              min: "La taille doit être supérieure à 0"
            }
          },
          'texte-chambre': {
            required: true,
            maxLength: 1000,
            messages: {
              empty: "La description de la chambre est obligatoire",
              maxLength: "Maximum 1000 caractères (actuellement: {count})"
            }
          }
        },
        tabIndicatorId: 'error-indicator-tab1-chambre'
      },
      tab3: {
        fields: {
          'ical-url-1-chambre': {
            required: false,
            pattern: /^(?:https?|webcal):\/\/[^\s]+(?:\.ical|\.ics|\/ical|\/calendar|\/export|\/feed)?/i,
            messages: {
              invalid: "Le lien doit être une URL de calendrier valide"
            }
          },
          'ical-url-2-chambre': {
            required: false,
            pattern: /^(?:https?|webcal):\/\/[^\s]+(?:\.ical|\.ics|\/ical|\/calendar|\/export|\/feed)?/i,
            messages: {
              invalid: "Le lien doit être une URL de calendrier valide"
            }
          },
          'ical-url-3-chambre': {
            required: false,
            pattern: /^(?:https?|webcal):\/\/[^\s]+(?:\.ical|\.ics|\/ical|\/calendar|\/export|\/feed)?/i,
            messages: {
              invalid: "Le lien doit être une URL de calendrier valide"
            }
          },
          'ical-url-4-chambre': {
            required: false,
            pattern: /^(?:https?|webcal):\/\/[^\s]+(?:\.ical|\.ics|\/ical|\/calendar|\/export|\/feed)?/i,
            messages: {
              invalid: "Le lien doit être une URL de calendrier valide"
            }
          }
        },
        tabIndicatorId: 'error-indicator-tab3-chambre'
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
      { id: 'cadeaux-input', limit: 250 },
      { id: 'texte-chambre', limit: 1000 }
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
    
    // Chercher dans la config logement
    for (const [tab, config] of Object.entries(this.validationConfig)) {
      if (config.fields[fieldId]) {
        fieldConfig = config.fields[fieldId];
        tabKey = tab;
        break;
      }
    }
    
    // Si pas trouvé, chercher dans la config chambre
    if (!fieldConfig) {
      for (const [tab, config] of Object.entries(this.roomValidationConfig)) {
        if (config.fields[fieldId]) {
          fieldConfig = config.fields[fieldId];
          tabKey = tab;
          break;
        }
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
    
    // Validation créneau arrivée : début doit être avant fin
    if (fieldId === 'heure-arrivee-debut-input' || fieldId === 'heure-arrivee-fin-input') {
      const debutInput = document.getElementById('heure-arrivee-debut-input');
      const finInput = document.getElementById('heure-arrivee-fin-input');
      const debut = debutInput?.value || '';
      const fin = finInput?.value || '';
      
      if (debut && fin && debut >= fin) {
        this.showFieldError('heure-arrivee-debut-input', "L'heure de début doit être avant l'heure de fin");
        return;
      } else {
        this.hideFieldError('heure-arrivee-debut-input');
      }
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
    
    // Si logement parent chambre d'hôtes, skip la tab 3
    const isChambreHote = (this.editor.propertyData?.mode_location || '') === "Chambre d'hôtes";
    
    // Parcourir toutes les tabs
    for (const [tabKey, tabConfig] of Object.entries(this.validationConfig)) {
      // Ignorer la tab 3 pour les logements parent chambre d'hôtes
      if (isChambreHote && tabKey === 'tab3') continue;
      
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
    
    // Validation spéciale prix plateformes (seulement logement entier)
    if (!isChambreHote && !this.validatePlatformPrices()) {
      isValid = false;
      this.showTabError('error-indicator-tab3');
    }

    if (!isChambreHote && !this.validateCoherencePrixLien()) {
      isValid = false;
      this.showTabError('error-indicator-tab3');
    }
    
    // Validation des réductions (seulement logement entier)
    if (!isChambreHote && !this.validateDiscounts()) {
      isValid = false;
      this.showTabError('error-indicator-tab3');
    }

    // Validation du prix week-end (seulement logement entier)
    if (!isChambreHote) {
    const weekendOui = document.getElementById('weekend-oui');
    const weekendPriceInput = document.getElementById('weekend-price-input');
    
    if (weekendOui && weekendOui.checked) {
      const weekendPrice = parseInt(this.editor.getRawValue(weekendPriceInput)) || 0;
      if (weekendPrice < 10) {
        this.showFieldError('weekend-price-input', "Le prix week-end doit être d'au moins 10€");
        hasError = true;
      } else {
        this.hideFieldError('weekend-price-input');
      }
    } else {
      this.hideFieldError('weekend-price-input');
    }
    }
    // Validation créneau arrivée : début < fin
    const creneauRadio = document.getElementById('arrivee-creneau');
    if (creneauRadio && creneauRadio.checked) {
      const debut = document.getElementById('heure-arrivee-debut-input')?.value || '';
      const fin = document.getElementById('heure-arrivee-fin-input')?.value || '';
      
      if (debut && fin && debut >= fin) {
        this.showFieldError('heure-arrivee-debut-input', "L'heure de début doit être avant l'heure de fin");
        isValid = false;
        this.showTabError('error-indicator-tab4');
      }
    }
    
    // Validation du supplément voyageurs (seulement logement entier)
    if (!isChambreHote) {
    const extraGuestsOui = document.getElementById('extra-guests-oui');
    const extraGuestsThresholdInput = document.getElementById('extra-guests-threshold-input');
    const extraGuestsPriceInput = document.getElementById('extra-guests-price-input');
    if (extraGuestsOui && extraGuestsOui.checked) {
      const threshold = parseInt(extraGuestsThresholdInput?.value) || 0;
      const price = parseInt(this.editor.getRawValue(extraGuestsPriceInput)) || 0;
      const maxCapacity = (this.editor.pricingData?.capacity || 8) - 1;
      if (threshold < 1 || threshold > maxCapacity) {
        this.showFieldError('extra-guests-threshold-input', `Le seuil doit être entre 1 et ${maxCapacity}`);
        isValid = false;
        this.showTabError('error-indicator-tab3');
      } else {
        this.hideFieldError('extra-guests-threshold-input');
      }
      if (price < 1) {
        this.showFieldError('extra-guests-price-input', "Le prix par personne doit être d'au moins 1€");
        isValid = false;
        this.showTabError('error-indicator-tab3');
      } else {
        this.hideFieldError('extra-guests-price-input');
      }
    } else {
      this.hideFieldError('extra-guests-threshold-input');
      this.hideFieldError('extra-guests-price-input');
    }
    } // ← fermeture du if (!isChambreHote)
    
    // Validation des liens plateformes pour logement parent chambre d'hôtes
    if (isChambreHote) {
      ['lien-airbnb-input', 'lien-booking-input', 'lien-autre-input'].forEach(id => {
        const input = document.getElementById(id);
        if (input && input.value.trim()) {
          if (!this.validateLienPlateforme(id)) {
            isValid = false;
            this.showTabError('error-indicator-tab1');
          }
        }
      });
    }

    // Validation des liens plateformes pour logement parent chambre d'hôtes
    if (isChambreHote) {
      ['lien-airbnb-input', 'lien-booking-input', 'lien-autre-input'].forEach(id => {
        const input = document.getElementById(id);
        if (input && input.value.trim()) {
          if (!this.validateLienPlateforme(id)) {
            isValid = false;
            this.showTabError('error-indicator-tab1');
          }
        }
      });
    }
    
    console.log(isValid ? '✅ Validation réussie' : '❌ Validation échouée');
    return isValid;
  }

validateRoomFields() {
    this.errors.clear();
    let isValid = true;
    
    for (const [tabKey, tabConfig] of Object.entries(this.roomValidationConfig)) {
      let tabHasErrors = false;
      
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
      
      if (tabHasErrors) {
        this.showTabError(tabConfig.tabIndicatorId);
      } else {
        this.hideTabError(tabConfig.tabIndicatorId);
      }
    }

    // Validation prix plateformes par défaut
    const radioVoyageurCheck = document.getElementById('radio-prix-voyageur-chambre');
    let roomDirectPrice = 0;
    
    if (radioVoyageurCheck && radioVoyageurCheck.checked) {
      const guestPrices = this.editor.collectPricesPerGuest();
      roomDirectPrice = guestPrices.length > 0 ? guestPrices[guestPrices.length - 1] : 0;
    } else {
      const fixePriceInput = document.getElementById('default-price-input-chambre');
      roomDirectPrice = fixePriceInput ? parseInt(this.editor.getRawValue(fixePriceInput)) || 0 : 0;
    }
    
    if (roomDirectPrice > 0) {
      if (!this.validateRoomDefaultPlatformPrices(roomDirectPrice)) {
        isValid = false;
        this.showTabError('error-indicator-tab3-chambre');
      }
    }
  
    // Validation des tarifs chambre
    const radioVoyageur = document.getElementById('radio-prix-voyageur-chambre');
    const mode = (radioVoyageur && radioVoyageur.checked) ? 'per_guest' : 'fixed';
    
    if (mode === 'fixed') {
      // Mode prix fixe : le prix est obligatoire et minimum 10€
      const priceInput = document.getElementById('default-price-input-chambre');
      const price = priceInput ? parseInt(this.editor.getRawValue(priceInput)) || 0 : 0;
      
      if (price < 10) {
        this.showFieldError('default-price-input-chambre', "Le prix minimum est de 10€");
        isValid = false;
        this.showTabError('error-indicator-tab3-chambre');
      } else {
        this.hideFieldError('default-price-input-chambre');
      }
    } else {
      // Mode prix par voyageur : chaque voyageur doit avoir un prix minimum 10€
      const voyageursInput = document.getElementById('voyageurs-input-chambre');
      const maxGuests = parseInt(voyageursInput?.value) || 1;
      let hasPerGuestError = false;
      
      for (let i = 0; i < maxGuests; i++) {
        const bloc = this.editor.getPrixVoyageurBloc(i);
        if (!bloc || bloc.style.display === 'none') continue;
        
        const priceInput = bloc.querySelector('[data-prix-voyageur="price"]');
        if (priceInput) {
          const rawValue = priceInput.getAttribute('data-raw-value');
          const price = parseInt(rawValue) || 0;
          
          if (price < 10) {
            this.showDiscountError(priceInput, "Le prix minimum est de 10€ par voyageur");
            hasPerGuestError = true;
          } else {
            this.hideDiscountError(priceInput);
          }
        }
      }
      
      // Masquer l'erreur du prix fixe si on est en mode voyageur
      this.hideFieldError('default-price-input-chambre');
      
      if (hasPerGuestError) {
        isValid = false;
        this.showTabError('error-indicator-tab3-chambre');
      }
    }
    
    // Nuits minimum obligatoire
    const minNightsInput = document.getElementById('default-min-nights-input-chambre');
    const minNights = minNightsInput ? parseInt(minNightsInput.value) || 0 : 0;
    if (minNights < 1) {
      this.showFieldError('default-min-nights-input-chambre', "Minimum 1 nuit");
      isValid = false;
      this.showTabError('error-indicator-tab3-chambre');
    } else {
      this.hideFieldError('default-min-nights-input-chambre');
    }
    
    console.log(isValid ? '✅ Validation chambre réussie' : '❌ Validation chambre échouée');
    return isValid;
  }

  // Validation d'une saison chambre (ajout ou modification)
  validateRoomSeason(isEdit = false) {
    const suffix = isEdit ? '-edit-chambre' : '-chambre';
    let hasError = false;
    
    // Nom
    const nameInput = document.getElementById(`season-name-input${suffix}`);
    if (!nameInput || !nameInput.value.trim()) {
      this.showFieldError(`season-name-input${suffix}`, "Le nom de la saison est obligatoire");
      hasError = true;
    } else {
      this.hideFieldError(`season-name-input${suffix}`);
    }
    
    // Prix — dépend du mode fixe/voyageur
    const radioVoyageur = document.getElementById('radio-prix-voyageur-chambre');
    const isPerGuest = radioVoyageur && radioVoyageur.checked;
    
    if (isPerGuest) {
      // Valider chaque prix voyageur
      const voyageursInput = document.getElementById('voyageurs-input-chambre');
      const maxGuests = parseInt(voyageursInput?.value) || 1;
      
      for (let i = 0; i < maxGuests; i++) {
        const bloc = this.editor.getRoomSeasonPrixVoyageurBloc(i, isEdit);
        if (!bloc || bloc.style.display === 'none') continue;
        
        const priceInput = bloc.querySelector('[data-prix-voyageur="price"]');
        if (priceInput) {
          const rawValue = priceInput.getAttribute('data-raw-value');
          const price = parseInt(rawValue) || 0;
          
          if (price < 10) {
            this.showDiscountError(priceInput, "Le prix minimum est de 10€ par voyageur");
            hasError = true;
          } else {
            this.hideDiscountError(priceInput);
          }
        }
      }
    } else {
      // Prix fixe
      const priceInput = document.getElementById(`season-price-input${suffix}`);
      const price = priceInput ? parseInt(this.editor.getRawValue(priceInput)) || 0 : 0;
      if (price < 10) {
        this.showFieldError(`season-price-input${suffix}`, "Le prix minimum est de 10€");
        hasError = true;
      } else {
        this.hideFieldError(`season-price-input${suffix}`);
      }
    }
    
    // Nuits minimum
    const minNightsInput = document.getElementById(`season-min-nights-input${suffix}`);
    const minNights = minNightsInput ? parseInt(this.editor.getRawValue(minNightsInput)) || 0 : 0;
    if (minNights < 1) {
      this.showFieldError(`season-min-nights-input${suffix}`, "Minimum 1 nuit");
      hasError = true;
    } else {
      this.hideFieldError(`season-min-nights-input${suffix}`);
    }
    
    // Plages de dates
    const allPeriods = [];
    let hasAtLeastOnePeriod = false;
    
    for (let i = 1; i <= 5; i++) {
      const block = document.getElementById(`bloc-plage-dates-${i}${suffix}`);
      if (!block || block.style.display === 'none') continue;
      
      const startInput = document.getElementById(`season-date-start-input-${i}${suffix}`);
      const endInput = document.getElementById(`season-date-end-input-${i}${suffix}`);
      
      const startDate = startInput ? this.editor.getDateValue(startInput) : null;
      const endDate = endInput ? this.editor.getDateValue(endInput) : null;
      
      if (!startDate) {
        this.showFieldError(`season-date-start-input-${i}${suffix}`, "La date de début est obligatoire");
        hasError = true;
      } else {
        this.hideFieldError(`season-date-start-input-${i}${suffix}`);
      }
      
      if (!endDate) {
        this.showFieldError(`season-date-end-input-${i}${suffix}`, "La date de fin est obligatoire");
        hasError = true;
      } else {
        this.hideFieldError(`season-date-end-input-${i}${suffix}`);
      }
      
      if (startDate && endDate) {
        allPeriods.push({ start: startDate, end: endDate, index: i });
        hasAtLeastOnePeriod = true;
      }
    }
    
    if (!hasAtLeastOnePeriod) {
      this.showFieldError(`season-date-start-input-1${suffix}`, "Au moins une période de dates est obligatoire");
      hasError = true;
    }
    
    // Chevauchements intra-saison
    if (!hasError && allPeriods.length > 1) {
      for (let a = 0; a < allPeriods.length; a++) {
        for (let b = a + 1; b < allPeriods.length; b++) {
          const [dayA1, monthA1] = allPeriods[a].start.split('-').map(Number);
          const [dayA2, monthA2] = allPeriods[a].end.split('-').map(Number);
          const [dayB1, monthB1] = allPeriods[b].start.split('-').map(Number);
          const [dayB2, monthB2] = allPeriods[b].end.split('-').map(Number);
          
          if (this.datesOverlap(dayA1, monthA1, dayA2, monthA2, dayB1, monthB1, dayB2, monthB2)) {
            this.showFieldError(`season-date-start-input-${allPeriods[b].index}${suffix}`, `Cette période chevauche la période n°${allPeriods[a].index}`);
            hasError = true;
          }
        }
      }
    }
    
    // Chevauchements inter-saisons (avec les autres saisons de la chambre)
    if (!hasError) {
      for (const period of allPeriods) {
        const overlap = this.checkRoomSeasonDateOverlap(period.start, period.end, isEdit);
        if (overlap) {
          this.showFieldError(`season-date-start-input-${period.index}${suffix}`, overlap);
          hasError = true;
        }
      }
    }
    
    // Validation prix plateformes
    if (!hasError) {
      const directPrice = isPerGuest 
        ? (this.editor.collectRoomSeasonPricesPerGuest(isEdit).pop() || 0)
        : (parseInt(this.editor.getRawValue(document.getElementById(`season-price-input${suffix}`))) || 0);
      
      if (directPrice > 0) {
        hasError = !this.validateRoomSeasonPlatformPrices(directPrice, suffix);
      }
    }
    
    return !hasError;
  }
  
  // Chevauchements entre saisons chambre
  checkRoomSeasonDateOverlap(newStart, newEnd, isEdit) {
    const seasons = this.editor.roomPricingData?.seasons || [];
    const editingIndex = isEdit ? this.editor.editingRoomSeasonIndex : -1;
    
    const [newStartDay, newStartMonth] = newStart.split('-').map(n => parseInt(n));
    const [newEndDay, newEndMonth] = newEnd.split('-').map(n => parseInt(n));
    
    for (let i = 0; i < seasons.length; i++) {
      if (i === editingIndex) continue;
      
      const season = seasons[i];
      if (!season.periods || season.periods.length === 0) continue;
      
      for (const period of season.periods) {
        const [startDay, startMonth] = period.start.split('-').map(n => parseInt(n));
        const [endDay, endMonth] = period.end.split('-').map(n => parseInt(n));
        
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
  
  // Validation prix plateformes saison chambre
  validateRoomSeasonPlatformPrices(directPrice, suffix) {
    const minPlatformPrice = directPrice * 1.10;
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

  // Validation prix plateformes par défaut chambre
  validateRoomDefaultPlatformPrices(directPrice) {
    const minPlatformPrice = directPrice * 1.10;
    let hasError = false;
    
    ['airbnb', 'booking', 'other'].forEach(platform => {
      const input = document.getElementById(`default-${platform}-price-input-chambre`);
      if (input) {
        const platformPrice = parseFloat(this.editor.getRawValue(input)) || 0;
        
        if (platformPrice > 0 && platformPrice < minPlatformPrice) {
          this.showFieldError(
            `default-${platform}-price-input-chambre`,
            `Le prix doit être au moins ${Math.ceil(minPlatformPrice)}€ (10% de plus que le prix direct)`
          );
          hasError = true;
        } else {
          this.hideFieldError(`default-${platform}-price-input-chambre`);
        }
      }
    });
    
    return !hasError;
  }

  validateLienPlateforme(fieldId) {
    const input = document.getElementById(fieldId);
    if (!input) return true;
    
    const value = input.value.trim();
    
    if (!value) {
      this.hideFieldError(fieldId);
      return true;
    }
    
    const urlPattern = /^https?:\/\/.+/i;
    if (!urlPattern.test(value)) {
      this.showFieldError(fieldId, "Le lien doit être une URL valide (commençant par https://)");
      return false;
    }
    
    if (fieldId === 'lien-airbnb-input') {
      if (!/airbnb/i.test(value)) {
        this.showFieldError(fieldId, "L'URL doit être un lien Airbnb");
        return false;
      }
    } else if (fieldId === 'lien-booking-input') {
      if (!/booking/i.test(value)) {
        this.showFieldError(fieldId, "L'URL doit être un lien Booking");
        return false;
      }
    }
    
    this.hideFieldError(fieldId);
    return true;
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
    
    // Validation conditionnelle (textarea requis seulement si radio "custom" sélectionné)
    if (fieldConfig.conditionalRequired) {
      if (fieldConfig.conditionalCheck) {
        if (fieldConfig.conditionalCheck() && (value === '' || value === null || value === undefined)) {
          return fieldConfig.messages.empty;
        }
      } else {
        const customRadio = document.getElementById('radio-custom');
        if (customRadio && customRadio.checked) {
          if (value === '' || value === null || value === undefined) {
            return fieldConfig.messages.empty;
          }
        }
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
          const option = document.getElementById('option');
          return (inclus?.checked || nonInclus?.checked || option?.checked) ? 'selected' : '';
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

      if (nights === 0 && percentage === 0) {
        this.showDiscountError(nightsInput, "Le nombre de nuits doit être supérieur à 0");
        this.showDiscountError(percentageInput, "La réduction doit être supérieure à 0");
        hasError = true;
        return; // Passer à la réduction suivante
      }
      
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
    
    // Validation du prix
    const price = priceInput ? parseInt(this.editor.getRawValue(priceInput)) || 0 : 0;
    if (price < 10) {
      if (priceInput) {
        this.showFieldError(`season-price-input${suffix}`, "Le prix minimum est de 10€");
      }
      hasError = true;
    } else {
      this.hideFieldError(`season-price-input${suffix}`);
    }
    
    // Validation des nuits minimum
    const minNights = minNightsInput ? parseInt(this.editor.getRawValue(minNightsInput)) || 0 : 0;
    if (minNights < 1) {
      if (minNightsInput) {
        this.showFieldError(`season-min-nights-input${suffix}`, "Minimum 1 nuit");
      }
      hasError = true;
    } else {
      this.hideFieldError(`season-min-nights-input${suffix}`);
    }

    // Validation de TOUTES les plages de dates
    const allPeriods = [];
  let hasAtLeastOnePeriod = false;

  for (let i = 1; i <= 5; i++) {
    const block = document.getElementById(`bloc-plage-dates-${i}${suffix}`);
    if (!block || block.style.display === 'none') continue;

    const startInput = document.getElementById(`season-date-start-input-${i}${suffix}`);
    const endInput = document.getElementById(`season-date-end-input-${i}${suffix}`);
    
    const startDate = startInput ? this.editor.getDateValue(startInput) : null;
    const endDate = endInput ? this.editor.getDateValue(endInput) : null;

    if (!startDate) {
      this.showFieldError(`season-date-start-input-${i}${suffix}`, "La date de début est obligatoire");
      hasError = true;
    } else {
      this.hideFieldError(`season-date-start-input-${i}${suffix}`);
    }

    if (!endDate) {
      this.showFieldError(`season-date-end-input-${i}${suffix}`, "La date de fin est obligatoire");
      hasError = true;
    } else {
      this.hideFieldError(`season-date-end-input-${i}${suffix}`);
    }

    if (startDate && endDate) {
      allPeriods.push({ start: startDate, end: endDate, index: i });
      hasAtLeastOnePeriod = true;
    }
  }

  // Au moins une plage doit exister
  if (!hasAtLeastOnePeriod) {
    this.showFieldError(`season-date-start-input-1${suffix}`, "Au moins une période de dates est obligatoire");
    hasError = true;
  }

  // Vérifier les chevauchements INTRA-saison (entre plages de la même saison)
  if (!hasError && allPeriods.length > 1) {
    for (let a = 0; a < allPeriods.length; a++) {
      for (let b = a + 1; b < allPeriods.length; b++) {
        const [dayA1, monthA1] = allPeriods[a].start.split('-').map(Number);
        const [dayA2, monthA2] = allPeriods[a].end.split('-').map(Number);
        const [dayB1, monthB1] = allPeriods[b].start.split('-').map(Number);
        const [dayB2, monthB2] = allPeriods[b].end.split('-').map(Number);

        if (this.datesOverlap(dayA1, monthA1, dayA2, monthA2, dayB1, monthB1, dayB2, monthB2)) {
          const msg = `Cette période chevauche la période n°${allPeriods[a].index}`;
          this.showFieldError(`season-date-start-input-${allPeriods[b].index}${suffix}`, msg);
          hasError = true;
        }
      }
    }
  }

  // Vérifier les chevauchements INTER-saisons (avec les autres saisons)
  if (!hasError) {
    for (const period of allPeriods) {
      const overlap = this.checkSeasonDateOverlap(period.start, period.end, isEdit);
      if (overlap) {
        this.showFieldError(`season-date-start-input-${period.index}${suffix}`, overlap);
        hasError = true;
      }
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

  // Afficher un avertissement (style warning, non bloquant)
  showFieldWarning(fieldId, message) {
    const field = document.getElementById(fieldId);
    if (!field) return;
    
    field.style.borderColor = '#F67F1D';
    
    let errorDiv = field.nextElementSibling;
    
    if (errorDiv?.classList.contains('character-counter')) {
      errorDiv = errorDiv.nextElementSibling;
    }
    
    if (!errorDiv?.classList.contains('error')) {
      const flexErrorParent = field.closest('.flex-error');
      if (flexErrorParent) {
        errorDiv = flexErrorParent.querySelector('.error');
      }
    }
    
    if (errorDiv && errorDiv.classList.contains('error')) {
      errorDiv.textContent = message;
      errorDiv.style.color = '#F67F1D';
      errorDiv.classList.add('show');
    }
  }

  // Masquer un avertissement
  hideFieldWarning(fieldId) {
    const field = document.getElementById(fieldId);
    if (!field) return;
    
    field.style.borderColor = '';
    
    let errorDiv = field.nextElementSibling;
    
    if (errorDiv?.classList.contains('character-counter')) {
      errorDiv = errorDiv.nextElementSibling;
    }
    
    if (!errorDiv?.classList.contains('error')) {
      const flexErrorParent = field.closest('.flex-error');
      if (flexErrorParent) {
        errorDiv = flexErrorParent.querySelector('.error');
      }
    }
    
    if (errorDiv && errorDiv.classList.contains('error')) {
      errorDiv.textContent = '';
      errorDiv.style.color = '';
      errorDiv.classList.remove('show');
    }
  }

  // Afficher la pastille warning sur un tab
  showTabWarning(indicatorId) {
    const indicator = document.getElementById(indicatorId);
    if (indicator) {
      indicator.style.display = 'block';
      indicator.style.backgroundColor = '#F67F1D';
    }
  }

  // Masquer la pastille warning sur un tab
  hideTabWarning(indicatorId) {
    const indicator = document.getElementById(indicatorId);
    if (indicator) {
      indicator.style.display = 'none';
      indicator.style.backgroundColor = '';
    }
  }
  
  // Afficher l'indicateur d'erreur sur une tab
  showTabError(indicatorId) {
    const indicator = document.getElementById(indicatorId);
    if (indicator) {
      indicator.style.display = 'block';
      indicator.style.backgroundColor = '';
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
    ['error-indicator-tab1', 'error-indicator-tab3', 'error-indicator-tab4', 'error-indicator-tab5',
     'error-indicator-tab1-chambre', 'error-indicator-tab3-chambre'].forEach(id => {
      this.hideTabError(id);
    });
    
    this.errors.clear();
    this.tabErrors.clear();
  }

  // Naviguer vers la première erreur
  navigateToFirstError() {
    // Trouver la première erreur visible
    const firstError = document.querySelector('.error.show');
    if (!firstError) return;
    
    // Trouver le champ associé
    let field = firstError.previousElementSibling;
    
    // Gérer les cas spéciaux
    if (field?.classList.contains('character-counter')) {
      field = field.previousElementSibling;
    }
    
    if (!field || field.classList.contains('error')) {
      const flexParent = firstError.closest('.flex-error');
      if (flexParent) {
        field = flexParent.querySelector('input, textarea, select');
      }
    }
    
    if (!field) return;
    
    // Trouver l'onglet du champ (utiliser la classe w-tab-pane)
    const tabPane = field.closest('.w-tab-pane');
    if (tabPane) {
      // Récupérer le data-w-tab (ex: "Tab 3")
      const tabName = tabPane.getAttribute('data-w-tab');
      
      // Trouver le bouton avec ce data-w-tab
      const tabLink = document.querySelector(`.tab-button[data-w-tab="${tabName}"]`);
      
      // Changer d'onglet si nécessaire
      if (tabLink && !tabLink.classList.contains('w--current')) {
        tabLink.click();
        
        // Attendre puis scroller
        setTimeout(() => {
          this.scrollToField(field);
        }, 200); // Un peu plus de délai pour l'animation Webflow
      } else {
        this.scrollToField(field);
      }
    } else {
      this.scrollToField(field);
    }
  }
  
  // Scroll simple vers le champ
  scrollToField(field) {
    const rect = field.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const targetPosition = rect.top + scrollTop - 150;
    
    window.scrollTo({
      top: targetPosition,
      behavior: 'smooth'
    });
  }
}

// Export
window.ValidationManager = ValidationManager;
