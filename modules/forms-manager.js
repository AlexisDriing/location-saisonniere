// Gestionnaire des formulaires - Dev - Safari correction 2
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
  
  if (form) {
    // Méthode 1: addEventListener avec capture (plus fiable que onsubmit)
    form.addEventListener('submit', this.blockSubmit, true);
    
    // Méthode 2: Bloquer la touche Entrée sur l'input (FIX SAFARI)
    if (searchInput) {
      searchInput.addEventListener('keydown', this.blockEnterKey, true);
    }
  } else {
    console.warn("Formulaire desktop introuvable.");
  }
  
  // Faire de même pour le formulaire mobile
  const formMobile = document.getElementById('form-mobile');
  const searchInputMobile = document.getElementById('search-input-mobile');
  
  if (formMobile) {
    form.addEventListener('submit', this.blockSubmit, true);
    
    if (searchInputMobile) {
      searchInputMobile.addEventListener('keydown', this.blockEnterKey, true);
    }
  }
  
  // Page accueil - Mobile (FIX SAFARI)
  const searchInputHomeMobile = document.getElementById('search-input-home-mobile');
  if (searchInputHomeMobile) {
    searchInputHomeMobile.addEventListener('keydown', this.blockEnterKey, true);
  }
}

// NOUVELLE MÉTHODE À AJOUTER
blockSubmit(e) {
  e.preventDefault();
  e.stopPropagation();
  e.stopImmediatePropagation();
  return false;
}

// NOUVELLE MÉTHODE À AJOUTER (FIX SAFARI)
blockEnterKey(e) {
  if (e.key === 'Enter' || e.keyCode === 13) {
    e.preventDefault();
    e.stopPropagation();
    return false;
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
