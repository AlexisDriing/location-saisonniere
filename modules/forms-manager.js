// Gestionnaire des formulaires
class FormsManager {
  constructor() {
    this.init();
  }

  init() {
    console.log('📝 Initialisation FormsManager...');
    this.preventFormSubmission();
    console.log('✅ FormsManager initialisé');
    
    // Export global
    window.formsManager = this;
  }

  preventFormSubmission() {
    const form = document.getElementById('form-desktop');
    const searchInput = document.getElementById('search-input');
    
    if (form && searchInput) {
      form.onsubmit = function(e) {
        e.preventDefault();
        e.stopPropagation();
        console.log("Soumission du formulaire desktop bloquée");
        return false;
      };
    } else {
      console.warn("Formulaire desktop ou champ de recherche introuvable.");
    }
    
    // Faire de même pour le formulaire mobile si présent
    const formMobile = document.getElementById('form-mobile');
    const searchInputMobile = document.getElementById('search-input-mobile');
    
    if (formMobile && searchInputMobile) {
      formMobile.onsubmit = function(e) {
        e.preventDefault();
        e.stopPropagation();
        console.log("Soumission du formulaire mobile bloquée");
        return false;
      };
    }
  }

  // Méthodes publiques
  enableFormSubmission(formId) {
    const form = document.getElementById(formId);
    if (form) {
      form.onsubmit = null;
      console.log(`Soumission activée pour le formulaire ${formId}`);
    }
  }

  disableFormSubmission(formId) {
    const form = document.getElementById(formId);
    if (form) {
      form.onsubmit = function(e) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      };
      console.log(`Soumission désactivée pour le formulaire ${formId}`);
    }
  }

  // Méthode pour gérer la soumission personnalisée d'un formulaire
  handleCustomSubmission(formId, callback) {
    const form = document.getElementById(formId);
    if (form) {
      form.onsubmit = function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        // Appeler la fonction callback avec les données du formulaire
        const formData = new FormData(form);
        callback(formData, form);
        
        return false;
      };
    }
  }
}

// Export global
window.FormsManager = FormsManager;
