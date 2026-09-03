// Améliorations spécifiques mobile - LOG production V1.02
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
        
                // ❌ La règle de sélection vivait ici en double. Elle est désormais
        // dans CalendarManager.isDateInvalid() (calendrier.js) et s'applique
        // au picker mobile via `this`, sans duplication.
        //
        // ❌ La boucle de rendu qui suivait lisait un attribut `data-date`
        // que daterangepicker n'écrit pas (il écrit data-title="rXcY") :
        // elle ne s'est jamais exécutée. Supprimée.

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
                // ✅ FIX : passer par le hide() complet du picker.
                // Il restaure endDate quand une seule date est sélectionnée,
                // ce qui évite le crash de show() (endDate.clone() sur null) à la ré-ouverture.
                picker.hide();
              });
              
              header.append(closeBtn);
              container.prepend(header);
              
              // Boutons fixes en bas
              const buttons = container.find('.drp-buttons');
              buttons.addClass('mobile-fixed-buttons');
              
              // Gestionnaires des boutons
              const applyBtn = buttons.find('.applyBtn');
              applyBtn.prop('disabled', false); // "Fermer" toujours cliquable
              applyBtn.off('click').on('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (picker.startDate && picker.startDate.isValid() &&
                    picker.endDate && picker.endDate.isValid()) {
                  picker.clickApply();  // plage complète ET valide : applique + ferme
                } else {
                  picker.hide();        // incomplète OU invalide : ferme sans rien enregistrer
                }
              });
              
              buttons.find('.cancelBtn').off('click').on('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                picker.clickCancel();
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
        
        // ✅ FIX : garder le bouton "Fermer" (applyBtn) actif même avec une seule
        // date (daterangepicker le désactive à chaque updateView sinon)
        const originalUpdateFormInputs = picker.updateFormInputs;
        picker.updateFormInputs = function () {
          originalUpdateFormInputs.call(this);
          this.container.find('button.applyBtn').prop('disabled', false);
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

// Export global
window.MobileEnhancementsManager = MobileEnhancementsManager;
