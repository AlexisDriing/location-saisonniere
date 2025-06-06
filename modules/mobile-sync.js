// Gestion de la synchronisation entre les versions mobile et desktop
class MobileSyncManager {
  constructor() {
    this.init();
  }

  init() {
    console.log('📱 Initialisation MobileSyncManager...');
    this.setupCalendarSync();
    this.setupPopupSync();
    console.log('✅ MobileSyncManager initialisé');
    
    // Export global
    window.mobileSyncManager = this;
  }

  setupCalendarSync() {
    if (typeof jQuery === 'undefined' || typeof jQuery.fn.daterangepicker === 'undefined') {
      setTimeout(() => this.setupCalendarSync(), 100);
      return;
    }
    
    const $ = jQuery;
    const desktopButton = $('.dates-button-search:not(.calendar-mobile)');
    const mobileButton = $('.dates-button-search.calendar-mobile');
    
    if (desktopButton.length === 0 || mobileButton.length === 0) {
      console.log('Boutons desktop/mobile non trouvés pour la synchronisation');
      return;
    }
    
    // Initialiser le texte mobile
    $('#text-dates-search-mobile').text('Dates').css('color', '');
    
    // Synchroniser desktop vers mobile
    desktopButton.on('apply.daterangepicker', (e, picker) => {
      this.syncDates(true, picker);
    });
    
    // Synchroniser mobile vers desktop
    mobileButton.on('apply.daterangepicker', (e, picker) => {
      this.syncDates(false, picker);
      
      // Synchroniser aussi avec le picker desktop
      try {
        const desktopPicker = desktopButton.data('daterangepicker');
        if (desktopPicker && picker.startDate && picker.endDate) {
          desktopPicker.setStartDate(picker.startDate);
          desktopPicker.setEndDate(picker.endDate);
          desktopButton.trigger('apply.daterangepicker', {
            startDate: picker.startDate,
            endDate: picker.endDate
          });
        }
      } catch (error) {
        console.log('Erreur de synchronisation des dates:', error);
      }
    });
    
    // Synchroniser les annulations
    desktopButton.on('cancel.daterangepicker', () => {
      this.syncDates(true);
    });
    
    mobileButton.on('cancel.daterangepicker', () => {
      this.syncDates(false);
      
      // Synchroniser aussi avec le picker desktop
      try {
        const desktopPicker = desktopButton.data('daterangepicker');
        if (desktopPicker) {
          desktopPicker.setStartDate(moment());
          desktopPicker.setEndDate(moment());
          desktopButton.trigger('cancel.daterangepicker');
        }
      } catch (error) {
        console.log('Erreur de réinitialisation des dates:', error);
      }
      
      // Réinitialiser le texte mobile
      const textMobile = $('#text-dates-search-mobile');
      if (textMobile.length > 0) {
        textMobile.text('Dates');
        textMobile.css('color', '');
      }
    });
    
    // Synchronisation initiale
    this.syncDates(true);
    
    // Améliorer l'affichage mobile
    this.enhanceMobileDisplay();
  }

  syncDates(fromDesktop, picker) {
    const $ = jQuery;
    const desktopButton = $('.dates-button-search:not(.calendar-mobile)');
    const mobileButton = $('.dates-button-search.calendar-mobile');
    
    if (fromDesktop) {
      // Desktop vers mobile
      const desktopPicker = desktopButton.data('daterangepicker');
      if (!desktopPicker) return;
      
      const mobilePicker = mobileButton.data('daterangepicker');
      if (mobilePicker && desktopPicker.startDate && desktopPicker.endDate) {
        mobilePicker.setStartDate(desktopPicker.startDate);
        mobilePicker.setEndDate(desktopPicker.endDate);
        
        // Mettre à jour le texte mobile
        const textMobile = $('#text-dates-search-mobile');
        if (textMobile.length > 0) {
          if (moment(desktopPicker.startDate).isSame(moment(desktopPicker.endDate), 'day')) {
            textMobile.text('Dates');
            textMobile.css('color', '');
          } else {
            const formattedDates = this.formatDateRange(desktopPicker.startDate, desktopPicker.endDate);
            textMobile.text(formattedDates);
            textMobile.css('color', '#272A2B');
          }
        }
      }
    } else {
      // Mobile vers desktop
      const mobilePicker = mobileButton.data('daterangepicker');
      if (!mobilePicker) return;
      
      const desktopPicker = desktopButton.data('daterangepicker');
      if (desktopPicker && mobilePicker.startDate && mobilePicker.endDate) {
        desktopPicker.setStartDate(mobilePicker.startDate);
        desktopPicker.setEndDate(mobilePicker.endDate);
        
        // Mettre à jour le texte desktop
        const textDesktop = $('#text-dates-search');
        if (textDesktop.length > 0) {
          if (moment(mobilePicker.startDate).isSame(moment(mobilePicker.endDate), 'day')) {
            textDesktop.text('Dates');
            textDesktop.css('color', '');
          } else {
            const formattedDates = this.formatDateRange(mobilePicker.startDate, mobilePicker.endDate);
            textDesktop.text(formattedDates);
            textDesktop.css('color', '#272A2B');
          }
        }
      }
    }
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

  enhanceMobileDisplay() {
    const $ = jQuery;
    const mobileButton = $('.dates-button-search.calendar-mobile');
    
    mobileButton.on('show.daterangepicker', () => {
      setTimeout(() => this.optimizeMobileCalendar(), 0);
    });
    
    // Vérifier périodiquement si le calendrier est visible
    setInterval(() => {
      if ($('.daterangepicker:visible').length > 0) {
        this.optimizeMobileCalendar();
      }
    }, 300);
    
    // Observer les changements DOM pour détecter l'ajout du calendrier
    if (typeof MutationObserver !== 'undefined') {
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.addedNodes && mutation.addedNodes.length > 0) {
            for (let i = 0; i < mutation.addedNodes.length; i++) {
              const node = mutation.addedNodes[i];
              if (node.classList && node.classList.contains('daterangepicker')) {
                setTimeout(() => this.optimizeMobileCalendar(), 0);
                break;
              }
            }
          }
        });
      });
      
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    }
    
    // Gérer le redimensionnement de la fenêtre
    window.addEventListener('resize', () => {
      if ($('.daterangepicker:visible').length > 0) {
        this.optimizeMobileCalendar();
      }
    });
  }

  optimizeMobileCalendar() {
    const $ = jQuery;
    const daterangepicker = $('.daterangepicker:visible');
    
    if (daterangepicker.length === 0 || window.innerWidth >= 768) {
      return;
    }
    
    // Ajouter la classe fullscreen mobile
    document.body.classList.add('no-scroll');
    daterangepicker.addClass('mobile-fullscreen');
    
    // Créer la structure mobile si nécessaire
    if (!daterangepicker.find('.drp-calendars').length) {
      const calendars = daterangepicker.find('.drp-calendar');
      const calendarsContainer = $('<div class="drp-calendars"></div>');
      calendars.first().before(calendarsContainer);
      calendarsContainer.append(calendars);
    }
    
    // Ajouter le header mobile si nécessaire
    if (!daterangepicker.find('.mobile-calendar-header').length) {
      const header = $('<div class="mobile-calendar-header"></div>');
      const title = $('<div class="mobile-calendar-title">Vos dates de séjour</div>');
      const closeBtn = $('<div class="mobile-calendar-close">×</div>');
      
      closeBtn.css({
        'font-size': '24px',
        'cursor': 'pointer',
        'padding': '0 10px'
      });
      
      closeBtn.on('click', (e) => {
        e.preventDefault();
        e.stopImmediatePropagation();
        
        document.body.classList.remove('no-scroll');
        daterangepicker.removeClass('mobile-fullscreen');
        daterangepicker.hide();
        
        // Mettre à jour l'état du picker
        try {
          const mobileButton = $('.dates-button-search.calendar-mobile');
          const picker = mobileButton.data('daterangepicker');
          if (picker && picker.isShowing) {
            picker.isShowing = false;
          }
        } catch (error) {
          console.log('Erreur lors de la mise à jour de l\'état du calendrier:', error);
        }
      });
      
      header.append(title);
      header.append(closeBtn);
      daterangepicker.prepend(header);
    }
    
    // Gérer les boutons fixes en bas
    const buttons = daterangepicker.find('.drp-buttons');
    buttons.addClass('mobile-fixed-buttons');
    
    // Ajouter les gestionnaires d'événements si pas déjà fait
    if (!daterangepicker.hasClass('event-handlers-added')) {
      daterangepicker.addClass('event-handlers-added');
      
      const applyBtn = buttons.find('.applyBtn');
      const cancelBtn = buttons.find('.cancelBtn');
      
      applyBtn.on('click', () => {
        setTimeout(() => {
          document.body.classList.remove('no-scroll');
          daterangepicker.removeClass('mobile-fullscreen');
          daterangepicker.hide();
        }, 50);
      });
      
      cancelBtn.on('click', () => {
        const textMobile = $('#text-dates-search-mobile');
        if (textMobile.length > 0) {
          textMobile.text('Dates');
          textMobile.css('color', '');
        }
        
        setTimeout(() => {
          document.body.classList.remove('no-scroll');
          daterangepicker.removeClass('mobile-fullscreen');
          daterangepicker.hide();
        }, 50);
      });
    }
  }

  setupPopupSync() {
    // Gestion de la popup filtres mobile
    const popupMobile = document.querySelector('.pop-filtres-mobile');
    
    if (popupMobile) {
      // Observer les changements de style
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.attributeName === 'style') {
            if (popupMobile.style.display === 'block') {
              document.body.classList.add('no-scroll');
              document.body.style.overflow = 'hidden';
              document.body.style.position = 'fixed';
              document.body.style.width = '100%';
            } else {
              document.body.classList.remove('no-scroll');
              document.body.style.overflow = '';
              document.body.style.position = '';
              document.body.style.width = '';
            }
          }
        });
      });
      
      observer.observe(popupMobile, { attributes: true });
      
      // Vérifier l'état initial
      if (popupMobile.style.display === 'block') {
        document.body.classList.add('no-scroll');
        document.body.style.overflow = 'hidden';
        document.body.style.position = 'fixed';
        document.body.style.width = '100%';
      }
    }
  }

  // Méthodes publiques
  isMobile() {
    return window.innerWidth < 768;
  }

  syncAllElements() {
    this.syncDates(true);
  }
}

// Export global
window.MobileSyncManager = MobileSyncManager;
