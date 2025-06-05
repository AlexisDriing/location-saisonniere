// Gestionnaire du calendrier pour la page liste
class CalendarListManager {
  constructor() {
    this.dateButton = null;
    this.textDatesSearch = null;
    this.picker = null;
    this.init();
  }

  init() {
    console.log('📅 Initialisation CalendarListManager...');
    this.waitForDependencies();
    console.log('✅ CalendarListManager initialisé');
    
    // Export global
    window.calendarListManager = this;
  }

  // ================================
  // ATTENTE DES DÉPENDANCES
  // ================================

  waitForDependencies() {
    if (typeof jQuery === 'undefined' || typeof jQuery.fn.daterangepicker === 'undefined') {
      setTimeout(() => this.waitForDependencies(), 100);
      return;
    }
    
    this.initializeCalendar();
  }

  // ================================
  // INITIALISATION DU CALENDRIER
  // ================================

  initializeCalendar() {
    const $ = jQuery;
    this.dateButton = $('.dates-button-search');
    this.textDatesSearch = $('#text-dates-search');
    
    if (this.dateButton.length === 0) {
      console.warn("Élément avec classe 'dates-button-search' non trouvé");
      return;
    }
    
    // Configuration du daterangepicker
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
    
    // Récupérer l'instance du picker
    this.picker = this.dateButton.data('daterangepicker');
    
    // Configuration des événements
    this.setupEvents();
    
    // Améliorer l'UI du calendrier
    this.enhanceCalendarUI();
    
    // Support mobile
    if (window.innerWidth < 768) {
      this.enhanceMobileCalendar();
    }
  }

  // ================================
  // CONFIGURATION DES ÉVÉNEMENTS
  // ================================

  setupEvents() {
    const self = this;
    
    // Événement d'application des dates
    this.dateButton.on('apply.daterangepicker', function(e, picker) {
      if (picker.startDate && picker.endDate) {
        const formattedDates = self.formatDateRange(picker.startDate, picker.endDate);
        
        if (self.textDatesSearch.length > 0) {
          self.textDatesSearch.text(formattedDates);
          self.textDatesSearch.css('color', '#272A2B');
        }
        
        // Communiquer avec PropertyManager
        if (window.propertyManager) {
          window.propertyManager.startDate = picker.startDate.format('YYYY-MM-DD');
          window.propertyManager.endDate = picker.endDate.format('YYYY-MM-DD');
          
          // Sauvegarder dans localStorage
          self.saveToLocalStorage(picker.startDate, picker.endDate);
          
          // Appliquer les filtres
          window.propertyManager.applyFilters();
          
          // Mettre à jour les prix
          window.propertyManager.updatePricesForDates(
            window.propertyManager.startDate, 
            window.propertyManager.endDate
          );
        }
      }
    });
    
    // Événement d'annulation
    this.dateButton.on('cancel.daterangepicker', function(e, picker) {
      // Réinitialiser l'affichage
      if (self.textDatesSearch.length > 0) {
        self.textDatesSearch.text('Dates');
        self.textDatesSearch.css('color', '');
      }
      
      // Communiquer avec PropertyManager
      if (window.propertyManager) {
        window.propertyManager.startDate = null;
        window.propertyManager.endDate = null;
        
        // Supprimer de localStorage
        localStorage.removeItem('selected_search_data');
        
        // Réinitialiser les filtres
        window.propertyManager.resetFilters();
        window.propertyManager.resetPriceDisplay();
      }
      
      console.log('🗑️ Dates effacées, filtres réinitialisés');
    });
  }

  // ================================
  // AMÉLIORATION DE L'INTERFACE
  // ================================

  enhanceCalendarUI() {
    if (!this.picker) return;
    
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
  }

  updateCalendarUI(picker) {
    const $ = jQuery;
    const buttons = picker.container.find('.drp-buttons');
    
    if (!buttons.find('.left-section').length) {
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
    
    const $ = jQuery;
    const container = $(this.picker.container);
    
    const originalShow = this.picker.show;
    const originalHide = this.picker.hide;
    
    this.picker.show = function() {
      originalShow.call(this);
      
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
        header.append(title);
        container.prepend(header);
        
        const buttons = container.find('.drp-buttons');
        buttons.addClass('mobile-fixed-buttons');
      }
    };
    
    this.picker.hide = function() {
      originalHide.call(this);
      document.body.classList.remove("no-scroll");
      container.removeClass('mobile-fullscreen');
    };
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
  // SYNCHRONISATION MOBILE/DESKTOP
  // ================================

  setupMobileDesktopSync() {
    const $ = jQuery;
    const desktopButton = $('.dates-button-search:not(.calendar-mobile)');
    const mobileButton = $('.dates-button-search.calendar-mobile');
    
    if (desktopButton.length && mobileButton.length) {
      // Synchroniser desktop → mobile
      desktopButton.on('apply.daterangepicker', function(e, picker) {
        this.syncCalendars(picker, mobileButton, $('#text-dates-search-mobile'));
      }.bind(this));
      
      // Synchroniser mobile → desktop
      mobileButton.on('apply.daterangepicker', function(e, picker) {
        this.syncCalendars(picker, desktopButton, $('#text-dates-search'));
      }.bind(this));
      
      // Synchroniser les annulations
      desktopButton.on('cancel.daterangepicker', () => {
        this.syncCancelation(mobileButton, $('#text-dates-search-mobile'));
      });
      
      mobileButton.on('cancel.daterangepicker', () => {
        this.syncCancelation(desktopButton, $('#text-dates-search'));
      });
    }
  }

  syncCalendars(sourcePicker, targetButton, targetText) {
    try {
      const targetPicker = targetButton.data('daterangepicker');
      if (targetPicker && sourcePicker.startDate && sourcePicker.endDate) {
        targetPicker.setStartDate(sourcePicker.startDate);
        targetPicker.setEndDate(sourcePicker.endDate);
        
        if (targetText.length > 0) {
          const formattedDates = this.formatDateRange(sourcePicker.startDate, sourcePicker.endDate);
          targetText.text(formattedDates);
          targetText.css('color', '#272A2B');
        }
      }
    } catch (error) {
      console.error('Erreur de synchronisation:', error);
    }
  }

  syncCancelation(targetButton, targetText) {
    try {
      const targetPicker = targetButton.data('daterangepicker');
      if (targetPicker) {
        targetPicker.setStartDate(moment());
        targetPicker.setEndDate(moment());
      }
      
      if (targetText.length > 0) {
        targetText.text('Dates');
        targetText.css('color', '');
      }
    } catch (error) {
      console.error('Erreur de synchronisation annulation:', error);
    }
  }

  // ================================
  // MÉTHODES PUBLIQUES
  // ================================

  // Définir des dates programmatiquement
  setDates(startDate, endDate) {
    if (this.picker) {
      this.picker.setStartDate(moment(startDate));
      this.picker.setEndDate(moment(endDate));
      
      const formattedDates = this.formatDateRange(moment(startDate), moment(endDate));
      if (this.textDatesSearch.length > 0) {
        this.textDatesSearch.text(formattedDates);
        this.textDatesSearch.css('color', '#272A2B');
      }
    }
  }

  // Réinitialiser le calendrier
  clearDates() {
    if (this.picker) {
      this.picker.setStartDate(moment());
      this.picker.setEndDate(moment());
      
      if (this.textDatesSearch.length > 0) {
        this.textDatesSearch.text('Dates');
        this.textDatesSearch.css('color', '');
      }
    }
  }

  // Obtenir les dates actuelles
  getCurrentDates() {
    if (this.picker && this.picker.startDate && this.picker.endDate) {
      return {
        startDate: this.picker.startDate.format('YYYY-MM-DD'),
        endDate: this.picker.endDate.format('YYYY-MM-DD')
      };
    }
    return null;
  }

  // Vérifier si des dates sont sélectionnées
  hasDatesSelected() {
    return this.picker && this.picker.startDate && this.picker.endDate;
  }
}

// Export global
window.CalendarListManager = CalendarListManager;
