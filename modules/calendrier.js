// Gestion complète du calendrier : iCal + DateRangePicker
class CalendarManager {
  constructor() {
    this.UPDATE_INTERVAL = window.CONFIG.UPDATE_INTERVAL;
    this.CACHE_PREFIX = window.CONFIG.CACHE_PREFIX;
    this.cache = new CalendarCache();
    this.icalManager = new ICalManager();
    this.nextUnavailableDate = null;
    
    // ✅ FIX: Délai pour s'assurer que tout est prêt
    setTimeout(() => {
      this.init();
    }, 100);
  }

  init() {
    console.log('📅 Initialisation du CalendarManager...');
    this.initDateRangePicker();
  }

  initDateRangePicker() {
    // ✅ FIX: Attendre plus longtemps et vérifier les dépendances
    setTimeout(async () => {
      console.log('🔍 Vérification des dépendances...');
      console.log('- jQuery disponible:', typeof jQuery !== 'undefined');
      console.log('- DateRangePicker disponible:', typeof jQuery !== 'undefined' && typeof jQuery.fn.daterangepicker !== 'undefined');
      
      if (typeof jQuery === 'undefined' || typeof jQuery.fn.daterangepicker === 'undefined') {
        console.log('⏳ Chargement de DateRangePicker...');
        await this.loadDateRangePicker();
      }
      
      const $ = jQuery;
      this.updateDatesText(null, null);
      
      // Récupérer les URLs iCal
      const icalUrls = Array.from(document.querySelectorAll('[data-ical-url]'))
        .map(e => e.getAttribute('data-ical-url'))
        .filter(e => e && e.trim() !== '');
      
      console.log('📡 URLs iCal trouvées:', icalUrls.length);
      
      if (!icalUrls.length) {
        console.warn('⚠️ Aucune URL iCal trouvée');
        return;
      }
      
      // ✅ FIX: Vérifier que les éléments existent
      const calendarInputs = $('#input-calendar, #input-calendar-mobile');
      if (calendarInputs.length === 0) {
        console.error('❌ Aucun élément input-calendar trouvé !');
        return;
      }
      
      console.log('🎯 Éléments calendrier trouvés:', calendarInputs.length);
      
      // Initialiser le DateRangePicker
      calendarInputs.daterangepicker({
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
      
      if (!this.picker) {
        console.error('❌ Impossible d\'initialiser le DateRangePicker !');
        return;
      }
      
      console.log('✅ DateRangePicker initialisé avec succès');
      
      this.setupPickerEvents();
      this.enhancePickerUI();
      
      // Charger les données iCal
      try {
        await this.icalManager.loadAllUnavailableDates(icalUrls);
        if (this.picker && this.picker.leftCalendar && this.picker.rightCalendar) {
          this.picker.updateCalendars();
          this.updateCalendarUI();
        }
        console.log('✅ Données iCal chargées');
      } catch (e) {
        console.error('❌ Erreur de chargement iCal:', e);
      }
    }, 1000); // ✅ FIX: Délai plus long
  }

  async loadDateRangePicker() {
    return new Promise((resolve) => {
      // Vérifier si déjà chargé
      if (typeof jQuery !== 'undefined' && typeof jQuery.fn.daterangepicker !== 'undefined') {
        console.log('✅ DateRangePicker déjà disponible');
        resolve();
        return;
      }
      
      console.log('📦 Chargement des assets DateRangePicker...');
      
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://cdn.jsdelivr.net/npm/daterangepicker/daterangepicker.css';
      document.head.appendChild(link);

      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/daterangepicker/daterangepicker.min.js';
      script.onload = () => {
        console.log('✅ DateRangePicker chargé');
        resolve();
      };
      script.onerror = () => {
        console.error('❌ Erreur chargement DateRangePicker');
        resolve(); // Continue quand même
      };
      document.head.appendChild(script);
    });
  }

  setupPickerEvents() {
    const $ = jQuery;
    
    $('#input-calendar, #input-calendar-mobile').on('apply.daterangepicker', (e, picker) => {
      console.log('📅 Dates appliquées:', picker.startDate?.format('YYYY-MM-DD'), 'à', picker.endDate?.format('YYYY-MM-DD'));
      
      if (picker.startDate && picker.endDate) {
        $(e.target).val(picker.startDate.format('DD/MM/YYYY') + ' - ' + picker.endDate.format('DD/MM/YYYY'));
        this.updateDatesText(picker.startDate, picker.endDate);
        this.nextUnavailableDate = null;
      } else {
        $(e.target).val('');
        this.updateDatesText(null, null);
      }
    });

    $('#input-calendar, #input-calendar-mobile').on('cancel.daterangepicker', (e, picker) => {
      console.log('❌ Dates annulées');
      this.nextUnavailableDate = null;
      this.resetDatePicker(picker);
    });

    $('#input-calendar, #input-calendar-mobile').on('hide.daterangepicker', (e, picker) => {
      if (!picker.startDate || !picker.endDate) {
        this.nextUnavailableDate = null;
      }
    });

    $('#input-calendar, #input-calendar-mobile').on('show.daterangepicker', (e, picker) => {
      console.log('👁️ Calendrier ouvert');
    });
  }

  enhancePickerUI() {
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

    const originalShow = this.picker.show;
    this.picker.show = () => {
      originalShow.call(this.picker);
      this.updateCalendarUI();
    };

    // Correction du positionnement
    const originalMove = this.picker.move;
    this.picker.move = () => {
      if (!this.picker.element || !this.picker.element.length) return;
      
      const input = this.picker.element[0];
      const rect = input.getBoundingClientRect();
      const container = this.picker.container;
      
      // Vérifier si on est en mobile
      if (window.innerWidth < 768) {
        originalMove.call(this.picker);
        return;
      }
      
      // Desktop : positionnement fixe avec gestion du scroll
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
      
      container.css({
        position: 'absolute',
        top: (rect.bottom + scrollTop + 5) + 'px',
        left: (rect.left + scrollLeft) + 'px',
        'z-index': '10000',
        'max-width': '100vw',
        'max-height': '100vh'
      });
      
      // Ajuster si le calendrier sort de l'écran
      const containerWidth = container.outerWidth();
      const containerHeight = container.outerHeight();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      // Ajustement horizontal
      if (rect.left + containerWidth > viewportWidth) {
        container.css('left', (rect.right + scrollLeft - containerWidth) + 'px');
      }
      
      // Ajustement vertical
      if (rect.bottom + containerHeight > viewportHeight + scrollTop) {
        container.css('top', (rect.top + scrollTop - containerHeight - 5) + 'px');
      }
    };

    // Écouter les événements de scroll et resize
    const handleReposition = () => {
      if (this.picker && this.picker.isShowing) {
        clearTimeout(this.repositionTimeout);
        this.repositionTimeout = setTimeout(() => {
          this.picker.move();
        }, 10);
      }
    };

    $(window).on('resize.daterangepicker scroll.daterangepicker', handleReposition);
    
    const originalHide = this.picker.hide;
    this.picker.hide = function() {
      $(window).off('resize.daterangepicker scroll.daterangepicker');
      originalHide.call(this);
    };

    const originalClear = this.picker.clear;
    this.picker.clear = () => {
      this.nextUnavailableDate = null;
      originalClear.call(this.picker);
    };
  }

  updateCalendarUI() {
    if (!this.picker) return;
    
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
      console.log('✅ Texte de dates mis à jour:', combinedText);
    } else {
      datesTextElements.forEach(element => {
        element.textContent = "Sélectionner une date";
      });
      console.log('📝 Texte de dates réinitialisé');
    }
  }

  resetDatePicker(picker) {
    picker.setStartDate(moment().startOf('day'));
    picker.setEndDate(null);
    jQuery('#input-calendar, #input-calendar-mobile').val('');
    this.updateDatesText(null, null);
  }
}

// Classes de gestion du cache et iCal (inchangées)
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
