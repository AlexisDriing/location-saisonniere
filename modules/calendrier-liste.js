// Gestionnaire du calendrier pour la page liste
class CalendarListManager {
  constructor() {
    this.dateButton = null;
    this.textDatesSearch = null;
    this.picker = null;
    this.isInitialized = false;
    this.init();
  }

  init() {
    console.log('📅 Initialisation CalendarListManager...');
    
    // Attendre que jQuery et DateRangePicker soient disponibles
    this.waitForDependencies();
    
    // Export global
    window.calendarListManager = this;
  }

  // ================================
  // ATTENTE DES DÉPENDANCES
  // ================================

  waitForDependencies() {
    console.log('⏳ Attente des dépendances...');
    
    // Vérifier que jQuery et DateRangePicker sont disponibles
    if (typeof jQuery === 'undefined') {
      console.log('❌ jQuery non disponible, retry dans 100ms');
      setTimeout(() => this.waitForDependencies(), 100);
      return;
    }
    
    if (typeof jQuery.fn.daterangepicker === 'undefined') {
      console.log('❌ DateRangePicker non disponible, retry dans 100ms');
      setTimeout(() => this.waitForDependencies(), 100);
      return;
    }
    
    // Vérifier que les éléments DOM sont présents
    const dateButton = document.querySelector('.dates-button-search');
    if (!dateButton) {
      console.log('❌ Bouton de dates non trouvé, retry dans 100ms');
      setTimeout(() => this.waitForDependencies(), 100);
      return;
    }
    
    console.log('✅ Toutes les dépendances sont prêtes');
    this.initializeCalendar();
  }

  // ================================
  // INITIALISATION DU CALENDRIER
  // ================================

  initializeCalendar() {
    if (this.isInitialized) {
      console.log('📅 Calendrier déjà initialisé');
      return;
    }
    
    const $ = jQuery;
    
    // Sélectionner les éléments
    this.dateButton = $('.dates-button-search');
    this.textDatesSearch = $('#text-dates-search');
    
    if (this.dateButton.length === 0) {
      console.error("❌ Élément avec classe 'dates-button-search' non trouvé");
      return;
    }
    
    console.log('🎯 Éléments trouvés:', {
      dateButton: this.dateButton.length,
      textDatesSearch: this.textDatesSearch.length
    });
    
    // S'assurer que Moment est en français
    if (typeof moment !== 'undefined' && typeof moment.locale === 'function') {
      moment.locale('fr');
    }
    
    // Configuration du daterangepicker
    try {
      this.dateButton.daterangepicker({
        autoApply: false,
        opens: 'center',
        autoUpdateInput: false,
        locale: {
          format: 'DD/MM/YYYY',
          separator: ' - ',
          applyLabel: 'Valider',
          cancelLabel: 'Effacer les dates',
          fromLabel: 'Du',
          toLabel: 'Au',
          customRangeLabel: 'Personnalisé',
          weekLabel: 'S',
          daysOfWeek: ['Di', 'Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa'],
          monthNames: ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'],
          firstDay: 1
        },
        minDate: moment().startOf('day')
      });
      
      console.log('✅ DateRangePicker initialisé avec succès');
      
      // Récupérer l'instance du picker
      this.picker = this.dateButton.data('daterangepicker');
      
      if (!this.picker) {
        console.error('❌ Impossible de récupérer l\'instance DateRangePicker');
        return;
      }
      
      console.log('✅ Instance DateRangePicker récupérée');
      
      // Configuration des événements
      this.setupEvents();
      
      // Améliorer l'UI du calendrier
      this.enhanceCalendarUI();
      
      // Support mobile
      if (window.innerWidth < 768) {
        this.enhanceMobileCalendar();
      }
      
      this.isInitialized = true;
      console.log('✅ CalendarListManager initialisé avec succès');
      
    } catch (error) {
      console.error('❌ Erreur lors de l\'initialisation du DateRangePicker:', error);
    }
  }

  // ================================
  // CONFIGURATION DES ÉVÉNEMENTS
  // ================================

  setupEvents() {
    console.log('🔧 Configuration des événements...');
    
    const self = this;
    
    // Événement d'application des dates
    this.dateButton.on('apply.daterangepicker', function(e, picker) {
      console.log('📅 Dates appliquées:', picker.startDate?.format('YYYY-MM-DD'), 'à', picker.endDate?.format('YYYY-MM-DD'));
      
      if (picker.startDate && picker.endDate) {
        const formattedDates = self.formatDateRange(picker.startDate, picker.endDate);
        
        if (self.textDatesSearch.length > 0) {
          self.textDatesSearch.text(formattedDates);
          self.textDatesSearch.css('color', '#272A2B');
        }
        
        // Communiquer avec PropertyManager
        if (window.propertyManager) {
          window.propertyManager.setDates(
            picker.startDate.format('YYYY-MM-DD'),
            picker.endDate.format('YYYY-MM-DD')
          );
          
          // Sauvegarder dans localStorage
          self.saveToLocalStorage(picker.startDate, picker.endDate);
          
          // Appliquer les filtres
          window.propertyManager.applyFilters();
          
          // Mettre à jour les prix
          window.propertyManager.updatePricesForDates(
            picker.startDate.format('YYYY-MM-DD'),
            picker.endDate.format('YYYY-MM-DD')
          );
        } else {
          console.warn('⚠️ PropertyManager non disponible');
        }
      }
    });
    
    // Événement d'annulation
    this.dateButton.on('cancel.daterangepicker', function(e, picker) {
      console.log('❌ Dates annulées');
      
      // Réinitialiser l'affichage
      if (self.textDatesSearch.length > 0) {
        self.textDatesSearch.text('Dates');
        self.textDatesSearch.css('color', '');
      }
      
      // Communiquer avec PropertyManager
      if (window.propertyManager) {
        window.propertyManager.clearDates();
        
        // Supprimer de localStorage
        localStorage.removeItem('selected_search_data');
        
        // Réinitialiser les filtres
        window.propertyManager.resetFilters();
        window.propertyManager.resetPriceDisplay();
      }
      
      console.log('🗑️ Dates effacées, filtres réinitialisés');
    });
    
    // Debug: événement show
    this.dateButton.on('show.daterangepicker', function(e, picker) {
      console.log('👁️ Calendrier ouvert');
    });
    
    // Debug: événement hide  
    this.dateButton.on('hide.daterangepicker', function(e, picker) {
      console.log('👁️ Calendrier fermé');
    });
    
    console.log('✅ Événements configurés');
  }

  // ================================
  // AMÉLIORATION DE L'INTERFACE
  // ================================

  enhanceCalendarUI() {
    if (!this.picker) return;
    
    console.log('🎨 Amélioration de l\'interface...');
    
    const originalRenderCalendar = this.picker.renderCalendar;
    this.picker.renderCalendar = function(side) {
      originalRenderCalendar.call(this, side);
      window.calendarListManager.updateCalendarUI(this);
    };
    
    const originalUpdateView = this.picker.updateView;
    this.picker.updateView = function() {
      originalUpdateView.call(this);
      window.calendarListManager.updateCalendarUI(this);
    };
    
    console.log('✅ Interface améliorée');
  }

  updateCalendarUI(picker) {
    const $ = jQuery;
    const buttons = picker.container.find('.drp-buttons');
    
    if (!buttons.find('.left-section').length) {
      console.log('🔧 Création de la nouvelle interface des boutons...');
      
      const cancelBtn = buttons.find('.cancelBtn').detach();
      const applyBtn = buttons.find('.applyBtn').detach();
      
      buttons.empty();
      
      // Section gauche (informations)
      const leftSection = $('<div class="left-section"></div>');
      const nightsCount = $('<span class="nights-count"></span>');
      const minNightsText = $('<span class="min-nights-text"></span>');
      const divider = $('<div class="calendar-state-divider"></div>');
      const selectedDates = $('<span class="drp-selected"></span>');
      
      nightsCount.hide();
      minNightsText.hide();
      divider.hide();
      selectedDates.hide();
      
      leftSection.append(nightsCount).append(minNightsText).append(divider).append(selectedDates);
      
      // Section droite (boutons)
      const rightSection = $('<div class="right-section"></div>');
      rightSection.append(cancelBtn).append(applyBtn);
      
      buttons.append(leftSection).append(rightSection);
    }
    
    // Mise à jour du contenu selon l'état
    this.updateCalendarState(picker, buttons);
  }

  updateCalendarState(picker, buttons) {
    const $ = jQuery;
    const nightsCount = buttons.find('.nights-count');
    const minNightsText = buttons.find('.min-nights-text');
    const divider = buttons.find('.calendar-state-divider');
    const selectedDates = buttons.find('.drp-selected');
    
    if (picker.startDate && !picker.endDate) {
      // Une seule date sélectionnée
      nightsCount.hide();
      minNightsText.text('1 nuit minimum de séjour');
      minNightsText.show();
      divider.hide();
      selectedDates.hide();
      buttons.find('.left-section').css('flex-direction', 'column');
    } else if (picker.startDate && picker.endDate) {
      // Plage de dates sélectionnée
      const nights = picker.endDate.diff(picker.startDate, 'days');
      
      if (nights > 0) {
        nightsCount.text(nights + (nights > 1 ? ' nuits' : ' nuit'));
        const startDateText = picker.startDate.format('ddd').toLowerCase() + '. ' + picker.startDate.format('DD/MM');
        const endDateText = picker.endDate.format('ddd').toLowerCase() + '. ' + picker.endDate.format('DD/MM');
        selectedDates.text(startDateText + ' - ' + endDateText);
        
        buttons.find('.left-section').css('flex-direction', 'row');
        nightsCount.show();
        minNightsText.hide();
        divider.show();
        selectedDates.show();
      } else {
        nightsCount.hide();
        minNightsText.hide();
        divider.hide();
        selectedDates.hide();
      }
    } else {
      // Aucune date sélectionnée
      nightsCount.hide();
      minNightsText.hide();
      divider.hide();
      selectedDates.hide();
    }
  }

  // ================================
  // SUPPORT MOBILE
  // ================================

  enhanceMobileCalendar() {
    if (!this.picker) return;
    
    console.log('📱 Configuration mobile...');
    
    const $ = jQuery;
    const container = $(this.picker.container);
    
    const originalShow = this.picker.show;
    const originalHide = this.picker.hide;
    
    this.picker.show = function() {
      originalShow.call(this);
      
      if (window.innerWidth < 768) {
        document.body.classList.add("no-scroll");
        container.addClass('mobile-fullscreen');
        
        if (!container.find('.drp-calendars').length) {
          const calendars = container.find('.drp-calendar');
          const calendarsContainer = $('<div class="drp-calendars"></div>');
          calendars.first().before(calendarsContainer);
          calendarsContainer.append(calendars);
        }
        
        if (!container.hasClass('mobile-enhanced')) {
          container.addClass('mobile-enhanced');
          const header = $('<div class="mobile-calendar-header"></div>');
          const title = $('<div class="mobile-calendar-title">Vos dates de séjour</div>');
          
          const closeBtn = $('<div class="mobile-calendar-close">×</div>');
          closeBtn.css({
            "font-size": "24px",
            "cursor": "pointer", 
            "padding": "0 10px"
          });
          
          closeBtn.on("click", function(e) {
            e.preventDefault();
            originalHide.call(this.picker);
          }.bind(this));
          
          header.append(title).append(closeBtn);
          container.prepend(header);
          
          const buttons = container.find('.drp-buttons');
          buttons.addClass('mobile-fixed-buttons');
        }
      }
    };
    
    this.picker.hide = function() {
      originalHide.call(this);
      document.body.classList.remove("no-scroll");
      container.removeClass('mobile-fullscreen');
    };
    
    console.log('✅ Configuration mobile terminée');
  }

  // ================================
  // FORMATAGE DES DATES
  // ================================

  formatDateRange(startDate, endDate) {
    const startDay = startDate.format('D');
    const endDay = endDate.format('D');
    let month = endDate.format('MMM').toLowerCase();
    
    // Abréviations des mois en français
    const monthAbbr = {
      'jan': 'janv.',
      'fév': 'févr.',
      'mar': 'mars',
      'avr': 'avr.',
      'mai': 'mai',
      'juin': 'juin',
      'juil': 'juil.',
      'aoû': 'août',
      'sep': 'sept.',
      'oct': 'oct.',
      'nov': 'nov.',
      'déc': 'déc.'
    };
    
    for (const key in monthAbbr) {
      if (month.startsWith(key)) {
        month = monthAbbr[key];
        break;
      }
    }
    
    return `${startDay}-${endDay} ${month}`;
  }

  // ================================
  // GESTION DU LOCALSTORAGE
  // ================================

  saveToLocalStorage(startDate, endDate) {
    try {
      const adultsElement = document.getElementById('chiffres-adultes');
      const enfantsElement = document.getElementById('chiffres-enfants');
      
      const data = {
        startDate: startDate.format('YYYY-MM-DD'),
        endDate: endDate.format('YYYY-MM-DD'),
        adultes: parseInt(adultsElement ? adultsElement.textContent : '1', 10),
        enfants: parseInt(enfantsElement ? enfantsElement.textContent : '0', 10),
        timestamp: Date.now()
      };
      
      localStorage.setItem('selected_search_data', JSON.stringify(data));
      console.log('💾 Données sauvegardées:', data);
    } catch (error) {
      console.error('❌ Erreur sauvegarde localStorage:', error);
    }
  }

  // ================================
  // MÉTHODES PUBLIQUES POUR DEBUG
  // ================================

  // Méthode pour forcer l'ouverture du calendrier (debug)
  openCalendar() {
    if (this.picker) {
      this.picker.show();
    } else {
      console.error('❌ Picker non initialisé');
    }
  }

  // Méthode pour vérifier l'état
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      hasDateButton: !!this.dateButton && this.dateButton.length > 0,
      hasTextElement: !!this.textDatesSearch && this.textDatesSearch.length > 0,
      hasPicker: !!this.picker,
      jQueryAvailable: typeof jQuery !== 'undefined',
      dateRangePickerAvailable: typeof jQuery !== 'undefined' && typeof jQuery.fn.daterangepicker !== 'undefined'
    };
  }

  // Méthode pour redémarrer l'initialisation
  restart() {
    console.log('🔄 Redémarrage du CalendarListManager...');
    this.isInitialized = false;
    this.dateButton = null;
    this.textDatesSearch = null;
    this.picker = null;
    this.waitForDependencies();
  }
}

// Export global
window.CalendarListManager = CalendarListManager;
