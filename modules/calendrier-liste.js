// Gestion du calendrier pour la page liste des logements - LOG production V2
class CalendarListManager {
  constructor() {
    this.dateButton = null;
    this.textDatesSearch = null;
    this.init();
  }

  init() {    
    // Attendre que DateRangePicker soit chargé
    if (typeof jQuery === 'undefined' || typeof jQuery.fn.daterangepicker === 'undefined') {
      setTimeout(() => this.init(), 100);
      return;
    }
    
    this.setupDateRangePicker();    
    // Export global
    window.calendarListManager = this;
  }

  setupDateRangePicker() {
  const $ = jQuery;
  // Support des deux pages : liste et accueil
  this.dateButton = $('.dates-button-search, .dates-button-home');
  this.textDatesSearch = $('#text-dates-search, #text-dates-home');
  
  if (this.dateButton.length === 0) {
    console.warn("Élément avec classe 'dates-button-search' ou 'dates-button-home' non trouvé");
    return;
  }
    
    // Configuration du DateRangePicker
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
      minDate: moment().startOf('day'),
      maxDate: moment().add(2, 'years').endOf('day')
    });
    
    // Améliorer l'interface du picker
    const picker = this.dateButton.data('daterangepicker');
    this.enhancePickerUI(picker);
    
    // Gestion des événements
    this.setupPickerEvents();
    
    // Améliorer pour mobile si nécessaire
    if (window.innerWidth < 768) {
      this.enhanceMobileCalendar(picker);
    }
  }

  setupPickerEvents() {
    const self = this;
    
    this.dateButton.on('apply.daterangepicker', function(e, picker) {
      if (picker.startDate && picker.endDate) {
        const formattedDates = self.formatDateRange(picker.startDate, picker.endDate);
        
        if (self.textDatesSearch.length > 0) {
          self.textDatesSearch.text(formattedDates);
          self.textDatesSearch.css('color', '#272A2B');
        }
        
        // Stocker les dates
        self.dateButton.data('startDate', picker.startDate.format('YYYY-MM-DD'));
        self.dateButton.data('endDate', picker.endDate.format('YYYY-MM-DD'));
        
        // Notifier PropertyManager si disponible
        if (window.propertyManager) {
          window.propertyManager.startDate = picker.startDate.format('YYYY-MM-DD');
          window.propertyManager.endDate = picker.endDate.format('YYYY-MM-DD');
          
          // Stocker dans localStorage
          const adultsElement = document.getElementById('chiffres-adultes');
          const enfantsElement = document.getElementById('chiffres-enfants');
          
          localStorage.setItem('selected_search_data', JSON.stringify({
            startDate: window.propertyManager.startDate,
            endDate: window.propertyManager.endDate,
            adultes: parseInt(adultsElement ? adultsElement.textContent : '1', 10),
            enfants: parseInt(enfantsElement ? enfantsElement.textContent : '0', 10),
            timestamp: Date.now()
          }));
          
          // Appliquer les filtres SEULEMENT si on n'attend pas un géocodage en cours
          // (évite le bug des 0km quand on vient de la page d'accueil avec lieu + dates)
          const isWaitingForGeocode = window.propertyManager._waitingForGeocode;
          
          if (!isWaitingForGeocode) {
            window.propertyManager.applyFilters();
            window.propertyManager.updatePricesForDates(
              window.propertyManager.startDate, 
              window.propertyManager.endDate
            );
          }
        }
      }
    });
    
    this.dateButton.on('cancel.daterangepicker', function(e, picker) {
      // Réinitialiser l'affichage
      if (self.textDatesSearch.length > 0) {
        self.textDatesSearch.text('Dates');
        self.textDatesSearch.css('color', '');
      }
      
      // Effacer les dates stockées
      self.dateButton.removeData('startDate');
      self.dateButton.removeData('endDate');
      
      // Notifier PropertyManager
      if (window.propertyManager) {
        window.propertyManager.startDate = null;
        window.propertyManager.endDate = null;
        localStorage.removeItem('selected_search_data');
        window.propertyManager.resetFilters();
        window.propertyManager.resetPriceDisplay();
      }
      
      // Forcer la réinitialisation du picker
      picker.setStartDate(moment());
      picker.setEndDate(moment());
      
    });
  }

  formatDateRange(startDate, endDate) {
    const startDay = startDate.format('D');
    const endDay = endDate.format('D');
    let month = endDate.format('MMM').toLowerCase();
    
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

  enhancePickerUI(picker) {
    if (!picker) return;
    
    const originalRenderCalendar = picker.renderCalendar;
    picker.renderCalendar = function(side) {
      originalRenderCalendar.call(this, side);
      updateCalendarUI(this);
    };
    
    const originalUpdateView = picker.updateView;
    picker.updateView = function() {
      originalUpdateView.call(this);
      updateCalendarUI(this);
    };
    
    // Ajouter le callback en premier
    updateCalendarUI(picker);
    
    function updateCalendarUI(picker) {
      const buttons = picker.container.find('.drp-buttons');
      
      if (!buttons.find('.left-section').length) {
        const cancelBtn = buttons.find('.cancelBtn').detach();
        const applyBtn = buttons.find('.applyBtn').detach();
        
        buttons.empty();
        const leftSection = jQuery('<div class="left-section"></div>');
        const nightsCount = jQuery('<span class="nights-count"></span>');
        const minNightsText = jQuery('<span class="min-nights-text"></span>');
        const divider = jQuery('<div class="calendar-state-divider"></div>');
        const selectedDates = jQuery('<span class="drp-selected"></span>');
        
        nightsCount.hide();
        minNightsText.hide();
        divider.hide();
        selectedDates.hide();
        
        leftSection.append(nightsCount).append(minNightsText).append(divider).append(selectedDates);
        const rightSection = jQuery('<div class="right-section"></div>');
        rightSection.append(cancelBtn).append(applyBtn);
        
        buttons.append(leftSection).append(rightSection);
      }
      
      const nightsCount = buttons.find('.nights-count');
      const minNightsText = buttons.find('.min-nights-text');
      const divider = buttons.find('.calendar-state-divider');
      const selectedDates = buttons.find('.drp-selected');
      
      if (picker.startDate && !picker.endDate) {
        nightsCount.hide();
        minNightsText.text('1 nuit minimum de séjour');
        minNightsText.show();
        divider.hide();
        selectedDates.hide();
        buttons.find('.left-section').css('flex-direction', 'column');
      } else if (picker.startDate && picker.endDate) {
        const nights = picker.endDate.diff(picker.startDate, 'days');
        
        if (nights > 0) {
          nightsCount.text(nights + (nights > 1 ? ' nuits' : ' nuit'));
          const startDateText = picker.startDate.format('ddd').toLowerCase() + ' ' + picker.startDate.format('DD/MM');
          const endDateText = picker.endDate.format('ddd').toLowerCase() + ' ' + picker.endDate.format('DD/MM');
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
        nightsCount.hide();
        minNightsText.hide();
        divider.hide();
        selectedDates.hide();
      }
    }
  }

  enhanceMobileCalendar(picker) {
    const container = jQuery(picker.container);
    
    const originalShow = picker.show;
    const originalHide = picker.hide;
    
    picker.show = function() {
      originalShow.call(this);
      
      document.body.classList.add("no-scroll");
      container.addClass('mobile-fullscreen');
      
      if (!container.find('.drp-calendars').length) {
        const calendars = container.find('.drp-calendar');
        const calendarsContainer = jQuery('<div class="drp-calendars"></div>');
        calendars.first().before(calendarsContainer);
        calendarsContainer.append(calendars);
      }
      
      if (!container.hasClass('mobile-enhanced')) {
        container.addClass('mobile-enhanced');
        const header = jQuery('<div class="mobile-calendar-header"></div>');
        const title = jQuery('<div class="mobile-calendar-title">Vos dates de séjour</div>');
        header.append(title);
        container.prepend(header);
        const buttons = container.find('.drp-buttons');
        buttons.addClass('mobile-fixed-buttons');
      }
    };
    
    picker.hide = function() {
      originalHide.call(this);
      document.body.classList.remove("no-scroll");
      container.removeClass('mobile-fullscreen');
    };
  }

  // Méthodes publiques
  getDates() {
    if (this.dateButton) {
      return {
        start: this.dateButton.data('startDate'),
        end: this.dateButton.data('endDate')
      };
    }
    return { start: null, end: null };
  }

  setDates(startDate, endDate) {
    if (this.dateButton && this.dateButton.data('daterangepicker')) {
      const picker = this.dateButton.data('daterangepicker');
      picker.setStartDate(moment(startDate));
      picker.setEndDate(moment(endDate));
      picker.clickApply();
    }
  }

  reset() {
    if (this.dateButton && this.dateButton.data('daterangepicker')) {
      const picker = this.dateButton.data('daterangepicker');
      picker.clickCancel();
    }
  }
}

// Export global
window.CalendarListManager = CalendarListManager;
