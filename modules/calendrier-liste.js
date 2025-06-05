// Gestionnaire de calendrier pour la page liste des logements
class ListCalendarManager {
  constructor() {
    this.picker = null;
    this.startDate = null;
    this.endDate = null;
    this.init();
  }

  init() {
    console.log('📅 Initialisation ListCalendarManager...');
    this.initListPageCalendar();
    this.setupMobileSynchronization();
    console.log('✅ ListCalendarManager initialisé');
    
    // Export global
    window.listCalendarManager = this;
  }

  // ================================
  // INITIALISATION DU CALENDRIER
  // ================================

  initListPageCalendar() {
    if (typeof jQuery === 'undefined' || typeof jQuery.fn.daterangepicker === 'undefined') {
      setTimeout(() => this.initListPageCalendar(), 100);
      return;
    }
    
    const $ = jQuery;
    const dateButtonSearch = $('.dates-button-search');
    const textDatesSearch = $('#text-dates-search');
    
    if (dateButtonSearch.length === 0) {
      console.warn("Élément avec classe 'dates-button-search' non trouvé");
      return;
    }
    
    // Configuration du DateRangePicker
    dateButtonSearch.daterangepicker({
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
    
    this.picker = dateButtonSearch.data('daterangepicker');
    
    // Événements
    this.setupCalendarEvents(dateButtonSearch, textDatesSearch);
    
    // Améliorer l'interface
    this.enhanceCalendarUI();
    
    // Support mobile
    if (window.innerWidth < 768) {
      this.enhanceMobileCalendar();
    }
  }

  // ================================
  // ÉVÉNEMENTS DU CALENDRIER
  // ================================

  setupCalendarEvents(dateButtonSearch, textDatesSearch) {
    const $ = jQuery;
    
    // Application des dates
    dateButtonSearch.on('apply.daterangepicker', (e, picker) => {
      if (picker.startDate && picker.endDate) {
        const formattedDates = this.formatDateRange(picker.startDate, picker.endDate);
        
        if (textDatesSearch.length > 0) {
          textDatesSearch.text(formattedDates);
          textDatesSearch.css('color', '#272A2B');
        }
        
        // Stocker les dates
        this.startDate = picker.startDate.format('YYYY-MM-DD');
        this.endDate = picker.endDate.format('YYYY-MM-DD');
        
        dateButtonSearch.data('startDate', this.startDate);
        dateButtonSearch.data('endDate', this.endDate);
        
        // Notifier PropertyManager si disponible
        if (window.propertyManager) {
          window.propertyManager.startDate = this.startDate;
          window.propertyManager.endDate = this.endDate;
          window.propertyManager.applyFilters();
          window.propertyManager.updatePricesForDates(this.startDate, this.endDate);
        }
        
        console.log('📅 Dates sélectionnées:', this.startDate, 'à', this.endDate);
      }
    });
    
    // Annulation des dates
    dateButtonSearch.on('cancel.daterangepicker', (e, picker) => {
      if (textDatesSearch.length > 0) {
        textDatesSearch.text('Dates');
        textDatesSearch.css('color', '');
      }
      
      this.startDate = null;
      this.endDate = null;
      
      dateButtonSearch.removeData('startDate');
      dateButtonSearch.removeData('endDate');
      
      // Notifier PropertyManager
      if (window.propertyManager) {
        window.propertyManager.startDate = null;
        window.propertyManager.endDate = null;
        window.propertyManager.resetFilters();
        window.propertyManager.resetPriceDisplay();
      }
      
      console.log('🗑️ Dates annulées');
    });
  }

  // ================================
  // AMÉLIORATION DE L'INTERFACE
  // ================================

  enhanceCalendarUI() {
    if (!this.picker) return;
    
    const originalRenderCalendar = this.picker.renderCalendar;
    this.picker.renderCalendar = (side) => {
      originalRenderCalendar.call(this.picker, side);
      this.updateCalendarUI();
    };
    
    const originalUpdateView = this.picker.updateView;
    this.picker.updateView = () => {
      originalUpdateView.call(this.picker);
      this.updateCalendarUI();
    };
    
    this.updateCalendarUI();
  }

  updateCalendarUI() {
    if (!this.picker) return;
    
    const $ = jQuery;
    const buttons = $(this.picker.container).find('.drp-buttons');
    
    if (!buttons.find('.left-section').length) {
      const cancelBtn = buttons.find('.cancelBtn').detach();
      const applyBtn = buttons.find('.applyBtn').detach();
      
      buttons.empty();
      
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
      
      const rightSection = $('<div class="right-section"></div>');
      rightSection.append(cancelBtn).append(applyBtn);
      
      buttons.append(leftSection).append(rightSection);
    }
    
    const nightsCount = buttons.find('.nights-count');
    const minNightsText = buttons.find('.min-nights-text');
    const divider = buttons.find('.calendar-state-divider');
    const selectedDates = buttons.find('.drp-selected');
    
    if (this.picker.startDate && !this.picker.endDate) {
      nightsCount.hide();
      minNightsText.text('1 nuit minimum de séjour');
      minNightsText.show();
      divider.hide();
      selectedDates.hide();
      buttons.find('.left-section').css('flex-direction', 'column');
    } else if (this.picker.startDate && this.picker.endDate) {
      const nights = this.picker.endDate.diff(this.picker.startDate, 'days');
      
      if (nights > 0) {
        nightsCount.text(nights + (nights > 1 ? ' nuits' : ' nuit'));
        const startDateText = this.picker.startDate.format('ddd').toLowerCase() + '. ' + this.picker.startDate.format('DD/MM');
        const endDateText = this.picker.endDate.format('ddd').toLowerCase() + '. ' + this.picker.endDate.format('DD/MM');
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
          header.append(title);
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
  }

  // ================================
  // SYNCHRONISATION MOBILE/DESKTOP
  // ================================

  setupMobileSynchronization() {
    setTimeout(() => {
      if (typeof jQuery === 'undefined') return;
      
      const $ = jQuery;
      const desktopCalendar = $('.dates-button-search:not(.calendar-mobile)');
      const mobileCalendar = $('.dates-button-search.calendar-mobile');
      
      if (desktopCalendar.length === 0 || mobileCalendar.length === 0) return;
      
      // Synchroniser desktop vers mobile
      desktopCalendar.on('apply.daterangepicker', (e, picker) => {
        this.syncCalendars(true, picker);
      });
      
      // Synchroniser mobile vers desktop
      mobileCalendar.on('apply.daterangepicker', (e, picker) => {
        this.syncCalendars(false, picker);
        
        // Déclencher l'événement sur le calendrier desktop
        try {
          const desktopPicker = desktopCalendar.data('daterangepicker');
          if (desktopPicker) {
            desktopPicker.setStartDate(picker.startDate);
            desktopPicker.setEndDate(picker.endDate);
            desktopCalendar.trigger('apply.daterangepicker', {
              startDate: picker.startDate,
              endDate: picker.endDate
            });
          }
        } catch (error) {
          console.log('Erreur de synchronisation des dates:', error);
        }
      });
      
      // Synchronisation des annulations
      desktopCalendar.on('cancel.daterangepicker', () => {
        this.syncCalendars(true);
      });
      
      mobileCalendar.on('cancel.daterangepicker', () => {
        try {
          const desktopPicker = desktopCalendar.data('daterangepicker');
          if (desktopPicker) {
            desktopPicker.setStartDate(moment());
            desktopPicker.setEndDate(moment());
            desktopCalendar.trigger('cancel.daterangepicker');
          }
        } catch (error) {
          console.log('Erreur de réinitialisation des dates:', error);
        }
        
        const textMobile = $('#text-dates-search-mobile');
        if (textMobile.length > 0) {
          textMobile.text('Dates').css('color', '');
        }
      });
      
      console.log('✅ Synchronisation mobile-desktop installée');
    }, 1000);
  }

  syncCalendars(isDesktopSource, picker = null) {
    const $ = jQuery;
    
    if (isDesktopSource) {
      const desktopPicker = $('.dates-button-search:not(.calendar-mobile)').data('daterangepicker');
      if (!desktopPicker) return;
      
      const mobilePicker = $('.dates-button-search.calendar-mobile').data('daterangepicker');
      if (mobilePicker && desktopPicker.startDate && desktopPicker.endDate) {
        mobilePicker.setStartDate(desktopPicker.startDate);
        mobilePicker.setEndDate(desktopPicker.endDate);
        
        const textMobile = $('#text-dates-search-mobile');
        if (textMobile.length > 0) {
          if (moment(desktopPicker.startDate).isSame(moment(desktopPicker.endDate), 'day')) {
            textMobile.text('Dates').css('color', '');
          } else {
            const formattedDates = this.formatDateRange(desktopPicker.startDate, desktopPicker.endDate);
            textMobile.text(formattedDates).css('color', '#272A2B');
          }
        }
      }
    }
  }

  // ================================
  // GESTION MOBILE AVANCÉE
  // ================================

  setupAdvancedMobileHandling() {
    if (typeof jQuery === 'undefined') return;
    
    const $ = jQuery;
    
    const enhanceMobileDisplay = () => {
      const visibleCalendar = $('.daterangepicker:visible');
      if (visibleCalendar.length === 0 || window.innerWidth >= 768) return;
      
      document.body.classList.add("no-scroll");
      visibleCalendar.addClass("mobile-fullscreen");
      
      if (!visibleCalendar.find(".drp-calendars").length) {
        const calendars = visibleCalendar.find(".drp-calendar");
        const calendarsContainer = $('<div class="drp-calendars"></div>');
        calendars.first().before(calendarsContainer);
        calendarsContainer.append(calendars);
      }
      
      if (!visibleCalendar.find(".mobile-calendar-header").length) {
        const header = $('<div class="mobile-calendar-header"></div>');
        const title = $('<div class="mobile-calendar-title">Vos dates de séjour</div>');
        const closeBtn = $('<div class="mobile-calendar-close">×</div>');
        
        closeBtn.css({
          "font-size": "24px",
          "cursor": "pointer", 
          "padding": "0 10px"
        });
        
        closeBtn.on("click", (e) => {
          e.preventDefault();
          e.stopImmediatePropagation();
          document.body.classList.remove("no-scroll");
          visibleCalendar.removeClass("mobile-fullscreen");
          visibleCalendar.hide();
        });
        
        header.append(title).append(closeBtn);
        visibleCalendar.prepend(header);
      }
      
      visibleCalendar.find(".drp-buttons").addClass("mobile-fixed-buttons");
    };
    
    // Surveiller l'ouverture du calendrier
    $('.dates-button-search.calendar-mobile').on('show.daterangepicker', () => {
      setTimeout(enhanceMobileDisplay, 0);
    });
    
    $(document).on('click', '.dates-button-search', () => {
      setTimeout(enhanceMobileDisplay, 0);
    });
    
    // Surveillance périodique
    setInterval(() => {
      if ($('.daterangepicker:visible').length > 0) {
        enhanceMobileDisplay();
      }
    }, 300);
    
    // Observer les changements DOM
    if (typeof MutationObserver !== 'undefined') {
      new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.addedNodes && mutation.addedNodes.length > 0) {
            for (let i = 0; i < mutation.addedNodes.length; i++) {
              const node = mutation.addedNodes[i];
              if (node.classList && node.classList.contains('daterangepicker')) {
                setTimeout(enhanceMobileDisplay, 0);
                break;
              }
            }
          }
        });
      }).observe(document.body, { childList: true, subtree: true });
    }
    
    // Gestion du redimensionnement
    window.addEventListener('resize', () => {
      if ($('.daterangepicker:visible').length > 0) {
        enhanceMobileDisplay();
      }
    });
  }

  // ================================
  // MÉTHODES UTILITAIRES
  // ================================

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

  loadExternalScripts() {
    return new Promise((resolve) => {
      if (typeof moment === 'undefined') {
        this.loadScript('https://cdn.jsdelivr.net/momentjs/latest/moment.min.js', () => {
          this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.29.1/locale/fr.js', () => {
            this.loadScript('https://cdn.jsdelivr.net/npm/daterangepicker/daterangepicker.min.js', resolve);
            this.loadStylesheet('https://cdn.jsdelivr.net/npm/daterangepicker/daterangepicker.css');
          });
        });
      } else {
        if (typeof moment.locale === 'function' && moment.locale() !== 'fr') {
          this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.29.1/locale/fr.js', () => {
            moment.locale('fr');
            if (typeof jQuery.fn.daterangepicker === 'undefined') {
              this.loadScript('https://cdn.jsdelivr.net/npm/daterangepicker/daterangepicker.min.js', resolve);
            } else {
              resolve();
            }
          });
        } else {
          if (typeof jQuery.fn.daterangepicker === 'undefined') {
            this.loadScript('https://cdn.jsdelivr.net/npm/daterangepicker/daterangepicker.min.js', resolve);
          } else {
            resolve();
          }
        }
      }
    });
  }

  loadScript(url, callback) {
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = url;
    script.onload = callback;
    document.head.appendChild(script);
  }

  loadStylesheet(url) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.type = 'text/css';
    link.href = url;
    document.head.appendChild(link);
  }

  // ================================
  // MÉTHODES PUBLIQUES
  // ================================

  // Obtenir les dates sélectionnées
  getSelectedDates() {
    return {
      startDate: this.startDate,
      endDate: this.endDate,
      formatted: this.startDate && this.endDate ? 
        this.formatDateRange(moment(this.startDate), moment(this.endDate)) : null
    };
  }

  // Définir les dates programmatiquement
  setDates(startDate, endDate) {
    if (this.picker) {
      this.picker.setStartDate(moment(startDate));
      this.picker.setEndDate(moment(endDate));
      
      // Déclencher l'événement apply
      this.picker.clickApply();
    }
  }

  // Effacer les dates
  clearDates() {
    if (this.picker) {
      this.picker.clickCancel();
    }
  }

  // Vérifier si des dates sont sélectionnées
  hasDates() {
    return !!(this.startDate && this.endDate);
  }
}

// Export global
window.ListCalendarManager = ListCalendarManager;
