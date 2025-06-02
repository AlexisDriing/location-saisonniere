// Améliorations spécifiques mobile
class MobileEnhancementsManager {
  constructor() {
    this.init();
  }

  init() {
    this.setupMobileCalendar();
  }

  setupMobileCalendar() {
    setTimeout(() => {
      if (typeof jQuery === 'undefined') return;
      
      const $ = jQuery;
      
      const isMobile = () => window.innerWidth < 768;
      
      const enhanceMobileCalendar = () => {
        if (!$.fn.daterangepicker) return;
        
        const mobileCalendar = $('#input-calendar-mobile');
        if (!mobileCalendar.length) return;
        
        const picker = mobileCalendar.data('daterangepicker');
        if (!picker || picker.enhanced) return;
        
        let nextUnavailableDate = null;
        
        // Améliorer la validation des dates
        const originalIsInvalidDate = picker.isInvalidDate;
        picker.isInvalidDate = function(date) {
          if (this.startDate && !this.endDate) {
            if (date.isBefore(this.startDate, 'day')) return true;
            if (nextUnavailableDate && date.isSameOrAfter(nextUnavailableDate, 'day')) return true;
          }
          
          const result = originalIsInvalidDate.call(this, date);
          if (result && this.startDate && date.isAfter(this.startDate, 'day') && !nextUnavailableDate) {
            nextUnavailableDate = date.clone();
          }
          return result;
        };
        
        // Améliorer le rendu du calendrier
        const originalRenderCalendar = picker.renderCalendar;
        picker.renderCalendar = function(side) {
          originalRenderCalendar.call(this, side);
          
          if (this.startDate && !this.endDate && !nextUnavailableDate) {
            const calendar = $(this.container).find('.calendar.' + side);
            const dates = calendar.find('td:not(.off)');
            let foundStart = false;
            let foundUnavailable = false;
            
            dates.each(function() {
              const dateStr = $(this).attr('data-date');
              const date = moment(dateStr, 'YYYY-MM-DD');
              
              if (foundStart && !foundUnavailable) {
                if (originalIsInvalidDate.call(picker, date)) {
                  foundUnavailable = true;
                  nextUnavailableDate = date.clone();
                }
              }
              
              if (picker.startDate && date.isSame(picker.startDate, 'day')) {
                foundStart = true;
              }
            });
          }
        };
        
        // Gestion de l'affichage mobile
        const originalHide = picker.hide;
        const originalShow = picker.show;
        const originalUpdateElement = picker.updateElement;
        
        let isShowingMobile = false;
        
        picker.hide = function() {
          isShowingMobile = false;
          $(this.container).removeClass('mobile-fullscreen');
          document.body.classList.remove("no-scroll");
          originalHide.apply(this, arguments);
        };
        
        picker.show = function() {
          isShowingMobile = true;
          originalShow.apply(this, arguments);
          
          if (isMobile()) {
            const container = $(this.container);
            document.body.classList.add("no-scroll");
            container.addClass('mobile-fullscreen');
            
            // Créer la structure mobile si nécessaire
            if (!container.find('.drp-calendars').length) {
              const calendars = container.find('.drp-calendar');
              const calendarsContainer = $('<div class="drp-calendars"></div>');
              calendars.first().before(calendarsContainer);
              calendarsContainer.append(calendars);
            }
            
            if (!container.hasClass('mobile-enhanced')) {
              container.addClass('mobile-enhanced');
              
              // Header mobile
              const header = $('<div class="mobile-calendar-header"></div>');
              const title = $('<div class="mobile-calendar-title">Vos dates de séjour</div>');
              header.append(title);
              
              // Bouton de fermeture
              const closeBtn = $('<div class="mobile-calendar-close">×</div>');
              closeBtn.css({
                "font-size": "24px",
                "cursor": "pointer",
                "padding": "0 10px"
              });
              
              closeBtn.on("click", (e) => {
                e.preventDefault();
                e.stopImmediatePropagation();
                picker.isShowing = false;
                originalHide.call(picker);
                document.body.classList.remove("no-scroll");
                $(picker.container).removeClass('mobile-fullscreen').hide();
              });
              
              header.append(closeBtn);
              container.prepend(header);
              
              // Boutons fixes en bas
              const buttons = container.find('.drp-buttons');
              buttons.addClass('mobile-fixed-buttons');
              
              // Gestionnaires des boutons
              buttons.find('.applyBtn').off('click').on('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (picker.startDate && picker.endDate) {
                  picker.clickApply();
                }
                picker.isShowing = false;
                originalHide.call(picker);
                document.body.classList.remove("no-scroll");
                $(picker.container).hide();
              });
              
              buttons.find('.cancelBtn').off('click').on('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                picker.clickCancel();
                nextUnavailableDate = null;
                picker.isShowing = false;
                originalHide.call(picker);
                document.body.classList.remove("no-scroll");
                $(picker.container).hide();
              });
            }
          }
        };
        
        // Gestion des dates
        const originalSetStartDate = picker.setStartDate;
        picker.setStartDate = function(date) {
          nextUnavailableDate = null;
          originalSetStartDate.call(this, date);
          if (this.startDate) {
            this.updateView();
          }
        };
        
        picker.updateElement = function() {
          originalUpdateElement.apply(this, arguments);
          if (!isShowingMobile && this.isShowing) {
            $(picker.container).hide();
            picker.isShowing = false;
          }
        };
        
        picker.enhanced = true;
      };
      
      // Initialiser
      enhanceMobileCalendar();
      
      // Réessayer périodiquement
      const retryInterval = setInterval(() => {
        if ($('#input-calendar-mobile').data('daterangepicker')) {
          enhanceMobileCalendar();
          clearInterval(retryInterval);
        }
      }, 1000);
      
      // Arrêter après 10 secondes
      setTimeout(() => clearInterval(retryInterval), 10000);
    }, 1000);
  }
}

// Initialisation automatique
document.addEventListener('DOMContentLoaded', () => {
  window.mobileEnhancementsManager = new MobileEnhancementsManager();
  console.log('✅ Mobile Enhancements Manager initialisé');
});

// Export global
window.MobileEnhancementsManager = MobileEnhancementsManager;
