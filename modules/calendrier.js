// Gestion complète du calendrier : iCal + DateRangePicker - VERSION CORRIGÉE
class CalendarManager {
  constructor() {
    this.UPDATE_INTERVAL = window.CONFIG.UPDATE_INTERVAL;
    this.CACHE_PREFIX = window.CONFIG.CACHE_PREFIX;
    this.cache = new CalendarCache();
    this.icalManager = new ICalManager();
    this.nextUnavailableDate = null;
    this.isCalculatingNextDate = false; // 🔧 NOUVEAU : Protection contre doubles calculs
    this.init();
  }

  init() {
    this.initDateRangePicker();
  }

  initDateRangePicker() {
    setTimeout(async () => {
      if (typeof jQuery === 'undefined' || typeof jQuery.fn.daterangepicker === 'undefined') {
        // Charger DateRangePicker si nécessaire
        await this.loadDateRangePicker();
      }
      
      const $ = jQuery;
      this.updateDatesText(null, null);
      
      // Récupérer les URLs iCal
      const icalUrls = Array.from(document.querySelectorAll('[data-ical-url]'))
        .map(e => e.getAttribute('data-ical-url'))
        .filter(e => e && e.trim() !== '');
      
      if (!icalUrls.length) return;
      
      // Initialiser le DateRangePicker
      $('#input-calendar, #input-calendar-mobile').daterangepicker({
        autoApply: false,
        opens: 'left',
        autoUpdateInput: false,
        isInvalidDate: (date) => {
          if (this.picker && this.picker.startDate && !this.picker.endDate) {
            const startDate = this.picker.startDate;
            if (date.isBefore(startDate, 'day')) return true;
            if (this.nextUnavailableDate && date.isSameOrAfter(this.nextUnavailableDate, 'day')) return true;
          }
          return this.icalManager.isDateUnavailable(date);
        },
        locale: {
          format: 'DD/MM/YYYY',
          separator: ' - ',
          applyLabel: 'Fermer',
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

      this.picker = $('#input-calendar').data('daterangepicker');
      this.setupPickerEvents();
      this.enhancePickerUI();
      
      // Charger les données iCal
      try {
        await this.icalManager.loadAllUnavailableDates(icalUrls);
        if (this.picker && this.picker.leftCalendar && this.picker.rightCalendar) {
          this.picker.updateCalendars();
          this.updateCalendarUI();
        }
      } catch (e) {
        console.error('Erreur de chargement iCal:', e);
      }
    }, 500);
  }

  async loadDateRangePicker() {
    return new Promise((resolve) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://cdn.jsdelivr.net/npm/daterangepicker/daterangepicker.css';
      document.head.appendChild(link);

      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/daterangepicker/daterangepicker.min.js';
      script.onload = resolve;
      document.head.appendChild(script);
    });
  }

  setupPickerEvents() {
    const $ = jQuery;
    
    $('#input-calendar, #input-calendar-mobile').on('apply.daterangepicker', (e, picker) => {
  if (picker.startDate && picker.endDate) {
    $(e.target).val(picker.startDate.format('DD/MM/YYYY') + ' - ' + picker.endDate.format('DD/MM/YYYY'));
    this.updateDatesText(picker.startDate, picker.endDate);
    this.nextUnavailableDate = null;
    
    // 🆕 NOUVEAU : Sauvegarder les dates modifiées pour les retours
    const adultsElement = Utils.getElementByIdWithFallback("chiffres-adultes");
    const childrenElement = Utils.getElementByIdWithFallback("chiffres-enfants");
    
    localStorage.setItem('current_detail_dates', JSON.stringify({
      startDate: picker.startDate.format('YYYY-MM-DD'),
      endDate: picker.endDate.format('YYYY-MM-DD'),
      adultes: parseInt(adultsElement?.textContent || "1"),
      enfants: parseInt(childrenElement?.textContent || "0"),
      timestamp: Date.now()
    }));
    console.log('📅 Dates modifiées sauvegardées pour retour navigation');
  } else {
    $(e.target).val('');
    this.updateDatesText(null, null);
  }
});

    // 🔧 VERSION AMÉLIORÉE du cancel
    $('#input-calendar, #input-calendar-mobile').on('cancel.daterangepicker', (e, picker) => {
      console.log('🔧 cancel.daterangepicker déclenché');
      
      // Reset complet des variables
      this.nextUnavailableDate = null;
      this.isCalculatingNextDate = false;
      
      // 🔧 NOUVEAU : Reset explicite du picker state AVANT resetDatePicker
      picker.startDate = null;
      picker.endDate = null;
      
      this.resetDatePicker(picker);
      
      // 🔧 NOUVEAU : Forcer un re-render après reset
      setTimeout(() => {
        if (this.picker && this.picker.updateCalendars) {
          this.picker.updateCalendars();
        }
      }, 100);
    });

    $('#input-calendar, #input-calendar-mobile').on('hide.daterangepicker', (e, picker) => {
      if (!picker.startDate || !picker.endDate) {
        this.nextUnavailableDate = null;
      }
    });

    $('#input-calendar, #input-calendar-mobile').on('apply.daterangepicker', (e, picker) => {
      if (picker.startDate && !picker.endDate) {
        this.findNextUnavailableDate(picker.startDate);
        picker.leftCalendar.month = moment(picker.startDate).clone();
        picker.rightCalendar.month = moment(picker.startDate).clone().add(1, 'month');
        picker.updateCalendars();
      }
    });
  }

  enhancePickerUI() {
    if (!this.picker) return;

    this.enhancePickerPositioning();
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

    const originalShow = this.picker.show;
    this.picker.show = () => {
      originalShow.call(this.picker);
      this.updateCalendarUI();
    };

    const originalClear = this.picker.clear;
    this.picker.clear = () => {
      this.nextUnavailableDate = null;
      originalClear.call(this.picker);
    };

    // 🔧 VERSION AMÉLIORÉE de setStartDate override
    const originalSetStartDate = this.picker.setStartDate;
    this.picker.setStartDate = (date) => {
      console.log('🔧 setStartDate appelé avec:', date ? date.format('YYYY-MM-DD') : 'null');
      
      // 🔧 RESET systématique des variables
      this.nextUnavailableDate = null;
      this.isCalculatingNextDate = false;
      
      // Appel original
      originalSetStartDate.call(this.picker, date);
      
      // 🔧 NOUVEAU : Recalcul différé pour éviter race condition
      if (date && date.isValid()) {
        setTimeout(() => {
          if (this.picker.startDate && 
              this.picker.startDate.isSame(date, 'day') && 
              !this.picker.endDate) {
            console.log('🔧 Recalcul nextUnavailableDate pour:', date.format('YYYY-MM-DD'));
            this.updateCalendarUI();
          }
        }, 50); // 50ms pour laisser le picker se mettre à jour
      }
    };
  }

  // À ajouter dans votre CalendarManager après l'initialisation du picker
enhancePickerPositioning() {
  if (!this.picker) return;

  const $ = jQuery;
  
  // Sauvegarder la fonction move originale
  const originalMove = this.picker.move;
  
  this.picker.move = function() {
    originalMove.call(this);
    
    // Récupérer la position du champ input
    const inputElement = $('#input-calendar');
    const rect = inputElement[0].getBoundingClientRect();
    
    // Calculer les positions
    const currentTop = parseInt(this.container.css('top'), 10);
    const currentLeft = parseInt(this.container.css('left'), 10);
    const offset = currentTop - (rect.bottom + window.pageYOffset);
    
    // Repositionner en position fixe sous l'input
    this.container.css({
      position: 'fixed',
      top: (rect.bottom + offset) + 'px',
      left: currentLeft + 'px'
    });
  };
  
  // Repositionner lors du redimensionnement de la fenêtre
  $(window).on('resize', () => {
    if (this.picker.isShowing) {
      this.picker.move();
    }
  });
}
  
  updateCalendarUI() {
    if (!this.picker) return;
    
    const $ = jQuery;
    const buttons = this.picker.container.find('.drp-buttons');
    
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
      let minNights = 1;
      if (window.priceCalculator && this.picker.startDate) {
        const season = window.priceCalculator.getSeason(this.picker.startDate);
        if (season && season.minNights) {
          minNights = season.minNights;
        }
      }
      
      minNightsText.text(minNights + (minNights > 1 ? ' nuits minimum de séjour' : ' nuit minimum de séjour'));
      nightsCount.hide();
      minNightsText.show();
      divider.hide();
      selectedDates.hide();
      buttons.find('.left-section').css('flex-direction', 'column');
      
      if (this.nextUnavailableDate === null) {
        this.findNextUnavailableDate(this.picker.startDate);
      }
    } else if (this.picker.startDate && this.picker.endDate) {
      const nights = this.picker.endDate.diff(this.picker.startDate, 'days');
      
      if (nights > 0) {
        nightsCount.text(nights + (nights > 1 ? ' nuits' : ' nuit'));
        const startDateText = this.picker.startDate.format('ddd').toLowerCase() + ' ' + this.picker.startDate.format('DD/MM');
        const endDateText = this.picker.endDate.format('ddd').toLowerCase() + ' ' + this.picker.endDate.format('DD/MM');
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
      this.nextUnavailableDate = null;
    }
  }

  findNextUnavailableDate(startDate) {
    this.nextUnavailableDate = null;
    if (!startDate || !startDate.isValid()) return null;
    
    let checkDate = moment(startDate).add(1, 'day');
    for (let i = 0; i < 90; i++) {
      if (this.icalManager.isDateUnavailable(checkDate)) {
        this.nextUnavailableDate = moment(checkDate);
        setTimeout(() => {
          if (this.picker) {
            this.picker.updateView();
            this.picker.renderCalendar('left');
            this.picker.renderCalendar('right');
          }
        }, 0);
        return this.nextUnavailableDate;
      }
      checkDate.add(1, 'day');
    }
    return null;
  }

  updateDatesText(startDate, endDate) {
    const datesTextElements = Utils.getAllElementsById('dates-texte');
    
    if (startDate && endDate) {
      const formattedStartDate = Utils.formatDateCustom(startDate);
      const formattedEndDate = Utils.formatDateCustom(endDate);
      const combinedText = formattedStartDate + ' - ' + formattedEndDate;
      
      datesTextElements.forEach(element => {
        element.textContent = combinedText;
      });
      console.log('Texte de dates mis à jour:', combinedText);
    } else {
      datesTextElements.forEach(element => {
        element.textContent = "Sélectionner une date";
      });
      console.log('Texte de dates réinitialisé à la valeur par défaut');
    }
  }

  // 🔧 MODIFIÉ : resetDatePicker avec ordre sécurisé
  resetDatePicker(picker) {
    // 🔧 ORDRE SÉCURISÉ : Reset AVANT setStartDate
    picker.startDate = null;        // ← Reset AVANT
    picker.endDate = null;          // ← Reset AVANT  
    this.nextUnavailableDate = null;
    this.isCalculatingNextDate = false;
    
    // Puis les appels pour compatibilité DateRangePicker
    picker.setStartDate(moment().startOf('day')); // ← APRÈS les resets
    picker.setEndDate(null);
    
    jQuery('#input-calendar, #input-calendar-mobile').val('');
    this.updateDatesText(null, null);
    
    console.log('🔧 resetDatePicker : state complètement nettoyé');
  }

  // 🔧 BONUS : Méthode de debug pour vérifier l'état
  debugPickerState() {
    const picker = this.picker;
    return {
      hasPickerStartDate: !!(picker && picker.startDate),
      pickerStartDate: picker && picker.startDate ? picker.startDate.format('YYYY-MM-DD') : null,
      hasPickerEndDate: !!(picker && picker.endDate),
      nextUnavailableDate: this.nextUnavailableDate ? this.nextUnavailableDate.format('YYYY-MM-DD') : null,
      isCalculating: this.isCalculatingNextDate,
      // Détecter l'état "buggé"
      isProbablyInBuggedState: picker && picker.startDate && 
                              picker.startDate.isSame(moment().startOf('day'), 'day') && 
                              !this.nextUnavailableDate
    };
  }
}

// Classes de gestion du cache et iCal
class CalendarCache {
  constructor() {
    this.cleanup();
  }

  getKey(icalUrl, periodKey) {
    return `${window.CONFIG.CACHE_PREFIX}${icalUrl}_${periodKey}`;
  }

  get(icalUrl, periodKey) {
    try {
      const key = this.getKey(icalUrl, periodKey);
      const data = localStorage.getItem(key);
      if (!data) return null;
      
      const cached = JSON.parse(data);
      if (Date.now() - cached.timestamp > window.CONFIG.UPDATE_INTERVAL) {
        return null;
      }
      
      return cached.events;
    } catch (error) {
      console.error('Erreur de lecture du cache:', error);
      return null;
    }
  }

  set(icalUrl, periodKey, events) {
    try {
      const key = this.getKey(icalUrl, periodKey);
      const data = { events, timestamp: Date.now() };
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error('Erreur d\'écriture du cache:', error);
    }
  }

  cleanup() {
    try {
      const keys = Object.keys(localStorage);
      const now = Date.now();
      let cleanedCount = 0;
      
      keys.forEach(key => {
        if (key.startsWith(window.CONFIG.CACHE_PREFIX)) {
          try {
            const data = JSON.parse(localStorage.getItem(key));
            if (now - data.timestamp > window.CONFIG.UPDATE_INTERVAL) {
              localStorage.removeItem(key);
              cleanedCount++;
            }
          } catch (e) {
            localStorage.removeItem(key);
            cleanedCount++;
          }
        }
      });
    } catch (error) {
      console.error('Erreur de nettoyage du cache:', error);
    }
  }
}

class ICalManager {
  constructor() {
    this.cache = new CalendarCache();
    this.proxyUrl = window.CONFIG.API_URL + '/get-ical';
    this.loadingPromises = new Map();
    this.unavailableDates = new Set();
    this.initialDataLoaded = false;
    this.loadingError = null;
  }

  async getICalData(icalUrl, start, end) {
    const cacheKey = `${start.format('YYYY-MM-DD')}_${end.format('YYYY-MM-DD')}`;
    const cachedData = this.cache.get(icalUrl, cacheKey);
    
    if (cachedData) {
      return cachedData;
    }
    
    const promiseKey = `${icalUrl}_${cacheKey}`;
    if (this.loadingPromises.has(promiseKey)) {
      return await this.loadingPromises.get(promiseKey);
    }
    
    const loadingPromise = this.fetchAndCacheData(icalUrl, start, end, cacheKey);
    this.loadingPromises.set(promiseKey, loadingPromise);
    
    try {
      const result = await loadingPromise;
      this.loadingPromises.delete(promiseKey);
      return result;
    } catch (error) {
      this.loadingPromises.delete(promiseKey);
      this.loadingError = error.message || "Erreur de chargement";
      throw error;
    }
  }

  async fetchAndCacheData(icalUrl, start, end, cacheKey) {
    try {
      const urlWithTimestamp = `${this.proxyUrl}?url=${encodeURIComponent(icalUrl)}&_t=${Date.now()}`;
      
      const response = await fetch(urlWithTimestamp);
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }
      
      const icalData = await response.text();
      if (!icalData || icalData.trim() === '') {
        console.warn(`iCal vide ou invalide pour ${icalUrl}`);
        return [];
      }
      
      const events = this.parseICalEvents(icalData, start, end);
      this.cache.set(icalUrl, cacheKey, events);
      return events;
    } catch (error) {
      console.error('Erreur pour URL:', icalUrl, error);
      this.loadingError = error.message || "Erreur de connexion";
      return [];
    }
  }

  parseICalEvents(icalData, start, end) {
    if (!icalData) return [];
    
    const events = [];
    const eventStrings = icalData.split('BEGIN:VEVENT');
    const startDate = moment(start);
    const endDate = moment(end);
    
    eventStrings.forEach((eventString, index) => {
      if (index === 0) return;
      
      const eventStart = eventString.match(/DTSTART(?:;VALUE=DATE)?:(\d{8})/);
      const eventEnd = eventString.match(/DTEND(?:;VALUE=DATE)?:(\d{8})/);
      
      if (eventStart && eventEnd) {
        const eventStartDate = moment(eventStart[1], 'YYYYMMDD');
        const eventEndDate = moment(eventEnd[1], 'YYYYMMDD').subtract(1, 'day');
        
        if (eventStartDate.isBefore(endDate) && eventEndDate.isAfter(startDate)) {
          let currentDate = moment(eventStartDate);
          while (currentDate.isSameOrBefore(eventEndDate, 'day')) {
            if (currentDate.isSameOrAfter(startDate) && currentDate.isSameOrBefore(endDate)) {
              events.push({ date: currentDate.format('YYYY-MM-DD') });
            }
            currentDate.add(1, 'day');
          }
        }
      }
    });
    
    return events;
  }

  async loadAllUnavailableDates(icalUrls) {
    this.loadingError = null;
    const today = moment().startOf('day');
    const twoYearsLater = moment().add(2, 'year').endOf('month');
    
    try {
      const allEventsPromises = icalUrls.map(url => this.getICalData(url, today, twoYearsLater));
      const allEvents = await Promise.all(allEventsPromises);
      const unavailableDates = allEvents.flat().map(event => event.date);
      
      this.unavailableDates = new Set(unavailableDates);
      this.initialDataLoaded = true;
      console.log(`[Client] Chargement terminé: ${this.unavailableDates.size} dates indisponibles`);
      return this.unavailableDates;
    } catch (error) {
      console.error('Erreur lors du chargement des événements iCal:', error);
      this.loadingError = error.message || "Erreur de chargement";
      return new Set();
    }
  }

  isDateUnavailable(date) {
    return this.unavailableDates.has(date.format('YYYY-MM-DD'));
  }

  getLastError() {
    return this.loadingError;
  }
}

// Export global
window.CalendarManager = CalendarManager;
