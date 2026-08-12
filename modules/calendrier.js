// Gestion complète du calendrier : iCal + DateRangePicker - LOG production V1.07
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
      
      // Récupérer les URLs iCal (utilisées en fallback)
      const icalUrls = Array.from(document.querySelectorAll('[data-ical-url]'))
        .map(e => e.getAttribute('data-ical-url'))
        .filter(e => e && e.trim() !== '');

      // 🆕 Extraire le slug du logement depuis l'URL de la page détail
      // ex: https://www.driing.co/logements/mon-logement → "mon-logement"
      const propertyId = window.location.pathname.split('/').filter(Boolean).pop() || null;
    
      
      // Initialiser le DateRangePicker
            const manager = this;

      $('#input-calendar, #input-calendar-mobile').daterangepicker({
        autoApply: false,
        opens: 'left',
        autoUpdateInput: false,
        // ⚠️ fonction classique et non fléchée : daterangepicker appelle
        // isInvalidDate avec `this` = le picker concerné. C'est ce qui permet
        // au desktop et au mobile de partager exactement la même règle.
        isInvalidDate: function (date) {
          return manager.isDateInvalid(date, this);
        },
        // Marque les jours « départ uniquement ». La lib ajoute elle-même
        // la classe retournée sur la cellule, aucun DOM à parcourir.
        isCustomDate: function (date) {
          // Une plage complète est posée : ses extrémités gardent leur
          // surlignage de sélection, pas de demi-case par-dessus.
          if (this.endDate && this.endDate.isAfter(this.startDate, 'day')) {
            if (date.isSame(this.startDate, 'day')) return false;
            if (date.isSame(this.endDate, 'day')) return false;
          }
          return manager.getCustomDateClass(date, this);
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
        minDate: moment().startOf('day'),
        maxDate: moment().add(2, 'years').endOf('day')
      });

      this.picker = $('#input-calendar').data('daterangepicker');
      this.setupPickerEvents();
      this.enhancePickerUI();
      
            // Charger les données indisponibilité (route unifiée + fallback)
      try {
        if (propertyId) {
          // ✅ Mode optimisé : 1 seul appel JSON compact
          await this.icalManager.loadFromUnavailabilityEndpoint(propertyId, icalUrls);
        } else {
          // Fallback historique si data-property-id absent
          console.warn('[calendrier.js] data-property-id introuvable, fallback iCal classique');
          await this.icalManager.loadAllUnavailableDates(icalUrls);
        }
        if (this.picker && this.picker.leftCalendar && this.picker.rightCalendar) {
          this.picker.updateCalendars();
          this.updateCalendarUI();
        }
      } catch (e) {
        console.error('Erreur de chargement disponibilités:', e);
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
  if (picker.startDate && picker.startDate.isValid() &&
      picker.endDate && picker.endDate.isValid()) {
    $(e.target).val(picker.startDate.format('DD/MM/YYYY') + ' - ' + picker.endDate.format('DD/MM/YYYY'));
    this.updateDatesText(picker.startDate, picker.endDate);
    this.nextUnavailableDate = null;
    
    // 🆕 NOUVEAU : Sauvegarder les dates modifiées pour les retours
    const adultsElement = Utils.getElementByIdWithFallback("chiffres-adultes");
    const childrenElement = Utils.getElementByIdWithFallback("chiffres-enfants");
    const babiesElement = Utils.getElementByIdWithFallback("chiffres-bebes");
    
    // Récupérer les données existantes si elles existent
    let currentData = {};
    const existingData = localStorage.getItem('current_detail_dates');
    if (existingData) {
      try {
        currentData = JSON.parse(existingData);
      } catch (e) {
        currentData = {};
      }
    }
    
    // Mettre à jour avec les nouvelles dates
    const newData = {
      startDate: picker.startDate.format('YYYY-MM-DD'),
      endDate: picker.endDate.format('YYYY-MM-DD'),
      adultes: parseInt(adultsElement?.textContent || "1"),
      enfants: parseInt(childrenElement?.textContent || "0"),
      bebes: parseInt(babiesElement?.textContent || "0"),
      timestamp: Date.now()
    };
    // Fusionner avec les données existantes
    Object.assign(currentData, newData);
    
    localStorage.setItem('current_detail_dates', JSON.stringify(currentData));
    
  } else {
    $(e.target).val('');
    this.updateDatesText(null, null);
  }
});

    // 🔧 VERSION AMÉLIORÉE du cancel
    $('#input-calendar, #input-calendar-mobile').on('cancel.daterangepicker', (e, picker) => {
      
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
            this.updateCalendarUI();
          }
                }, 50); // 50ms pour laisser le picker se mettre à jour
      }
    };

    // ✅ FIX : "Fermer" doit fermer le calendrier même avec une seule date.
    // daterangepicker désactive ce bouton tant que la plage est incomplète →
    // on le ré-active et on gère nous-mêmes la fermeture.
    const originalUpdateFormInputs = this.picker.updateFormInputs;
    this.picker.updateFormInputs = function () {
      originalUpdateFormInputs.call(this);
      this.container.find('button.applyBtn').prop('disabled', false);
    };

    // Infobulle « Départ uniquement » au doigt : pas de survol sur mobile.
    // Délégué sur document → couvre le picker desktop ET le picker mobile.
    jQuery(document).off('click.drpTip').on('click.drpTip', '.daterangepicker td.drp-depart-only', function () {
      const $cell = jQuery(this);
      // En phase « départ » la case est cliquable : le clic sélectionne
      if ($cell.hasClass('available')) return;
      const wasOpen = $cell.hasClass('drp-tip-open');
      jQuery('.daterangepicker td.drp-tip-open').removeClass('drp-tip-open');
      if (!wasOpen) $cell.addClass('drp-tip-open');
    });
    
    // NB : posé directement sur le bouton (survit au detach() de updateCalendarUI,
    // s'exécute avant le handler natif délégué).
    this.picker.container.find('button.applyBtn').on('click', (e) => {
      // Plage complète ET valide → comportement natif (applique + ferme)
      if (this.picker.startDate && this.picker.startDate.isValid() &&
          this.picker.endDate && this.picker.endDate.isValid()) return;
      // Incomplète OU date invalide (ex. après "Effacer les dates") → on ferme simplement
      e.stopImmediatePropagation();
      e.preventDefault();
      this.picker.hide();
    });
  }

  // À ajouter dans votre CalendarManager après l'initialisation du picker
enhancePickerPositioning() {
  if (!this.picker) return;

  const $ = jQuery;
  const GAP = 8; // px - marge entre l'input et le calendrier

  const originalMove = this.picker.move;

  this.picker.move = function() {
    originalMove.call(this);

    const inputElement = $('#input-calendar');
    const rect = inputElement[0].getBoundingClientRect();
    const calWidth  = this.container.outerWidth();
    const calHeight = this.container.outerHeight();
    const vh = window.innerHeight;
    const vw = window.innerWidth;

    // Position par défaut : sous l'input (conversion document → viewport)
    const currentTop  = parseInt(this.container.css('top'),  10);
    const currentLeft = parseInt(this.container.css('left'), 10);
    let top  = currentTop - window.pageYOffset;
    let left = currentLeft;

    // Si le calendrier déborderait en bas, on tente à gauche, puis à droite
    const wouldOverflow = (rect.bottom + calHeight + GAP) > vh;
    if (wouldOverflow) {
      const leftCandidate  = rect.left  - calWidth - GAP;
      const rightCandidate = rect.right + GAP;

      if (leftCandidate >= 0) {
        left = leftCandidate;
        top  = rect.top;
      } else if (rightCandidate + calWidth <= vw) {
        left = rightCandidate;
        top  = rect.top;
      }
      // sinon : pas la place, on garde la position par défaut

      // Recadrage vertical si débordement
      if (top + calHeight > vh) top = Math.max(4, vh - calHeight - 4);
    }

    this.container.css({
      position: 'fixed',
      top:   top  + 'px',
      left:  left + 'px',
      right: 'auto'
    });
  };

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


  // ===== Règle de sélection : on raisonne en NUITS, pas en jours =====
  // Un séjour [arrivée, départ] consomme les nuits arrivée … départ-1.
  // Le jour de départ ne consomme aucune nuit : il reste donc atteignable
  // même si une autre réservation commence ce jour-là.

  hasOccupiedNight(startDate, endDate) {
    const cursor = moment(startDate).startOf('day');
    const end = moment(endDate).startOf('day');
    while (cursor.isBefore(end, 'day')) {
      if (this.icalManager.isDateUnavailable(cursor)) return true;
      cursor.add(1, 'day');
    }
    return false;
  }

  // ⚠️ La condition de phase repose volontairement sur la simple véracité de
  // picker.endDate. Ne pas la « durcir » avec .isValid() : après « Effacer les
  // dates », endDate est un moment invalide mais truthy et startDate vaut
  // aujourd'hui — on basculerait en phase départ avec une arrivée fictive, et
  // si la nuit d'aujourd'hui est occupée le calendrier s'éteindrait en entier.
  isDateInvalid(date, picker) {
    // Phase « départ » : une arrivée est posée, on attend la date de sortie
    if (picker && picker.startDate && !picker.endDate) {
      if (date.isSameOrBefore(picker.startDate, 'day')) return true;
      return this.hasOccupiedNight(picker.startDate, date);
    }
    // Phase « arrivée » : il faut pouvoir dormir la nuit de ce jour-là
    return this.icalManager.isDateUnavailable(date);
  }

  getCustomDateClass(date, picker) {
    // ⚠️ renvoyer false et non '' : la lib teste `isCustom !== false`
    if (!this.icalManager.isDepartureOnly(date)) return false;

    // Phase « départ » : la demi-case ne garde son sens que sur les jours
    // réellement atteignables depuis l'arrivée choisie. Un jour dont le
    // chemin est coupé redevient un jour fermé ordinaire, barré comme
    // les autres.
    if (picker && picker.startDate && !picker.endDate
        && this.isDateInvalid(date, picker)) {
      return false;
    }

    return 'drp-depart-only';
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
    } else {
      datesTextElements.forEach(element => {
        element.textContent = "Sélectionner une date";
      });
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
      
      // 🆕 Tolère tous les paramètres (TZID, VALUE=DATE…) et capture la date (8 chiffres)
      const eventStart = eventString.match(/DTSTART[^:\r\n]*:(\d{8})/);
      const eventEnd = eventString.match(/DTEND[^:\r\n]*:(\d{8})/);
      
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


    // ✅ Charge les dates indisponibles via la route unifiée /property-unavailability/:id
  // Fallback automatique sur loadAllUnavailableDates() si la nouvelle route échoue
  // TODO: supprimer le fallback après ~2 semaines de production sans occurrence dans les logs
  async loadFromUnavailabilityEndpoint(propertyId, fallbackIcalUrls) {
    this.loadingError = null;
    try {
      const url = `${window.CONFIG.API_URL}/property-unavailability/${propertyId}`;
      const response = await fetch(url, { method: 'GET' });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const data = await response.json();

      const unavailableDates = new Set();

      // Dates fermées manuellement (ranges {s, e}) → expanser en jours
      if (Array.isArray(data.blockedDates)) {
        for (const range of data.blockedDates) {
          if (!range || !range.s || !range.e) continue;
          const cursor = moment(range.s, 'YYYY-MM-DD');
          const end = moment(range.e, 'YYYY-MM-DD');
          while (cursor.isSameOrBefore(end, 'day')) {
            unavailableDates.add(cursor.format('YYYY-MM-DD'));
            cursor.add(1, 'day');
          }
        }
      }

      // Dates iCal externes (déjà jour-par-jour : clés "YYYY-MM-DD")
      if (data.externalDates && typeof data.externalDates === 'object') {
        for (const day of Object.keys(data.externalDates)) {
          unavailableDates.add(day);
        }
      }

      this.unavailableDates = unavailableDates;
      this.initialDataLoaded = true;
      return this.unavailableDates;

    } catch (err) {
      console.warn('[calendrier.js] Fallback iCal triggered:', err.message);
      // Fallback sur l'ancien comportement (4 fetchs /get-ical + parsing client)
      return await this.loadAllUnavailableDates(fallbackIcalUrls || []);
    }
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

  // 🆕 Nuit occupée dont la veille est libre : la matinée reste libre,
  // ce jour est donc un départ possible → demi-case.
  isDepartureOnly(date) {
    if (!this.isDateUnavailable(date)) return false;
    if (this.isDateUnavailable(moment(date).subtract(1, 'day'))) return false;
    // Aujourd'hui : personne ne peut en partir (minDate interdit d'arriver
    // avant), la demi-case n'aurait aucun sens.
    if (date.isSameOrBefore(moment(), 'day')) return false;
    return true;
  }

  getLastError() {
    return this.loadingError;
  }
}

// Export global
window.CalendarManager = CalendarManager;
