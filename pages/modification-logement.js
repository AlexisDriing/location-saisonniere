// Page modification de logement - LOG production
class ModificationLogementPage {
  constructor() {
    this.init();
  }

  async init() {
    
    // Initialiser le gestionnaire d'édition
    this.propertyEditor = new PropertyEditor();
    
  }
}

// Initialisation automatique
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    if (window.location.pathname.includes('/modification-logement')) {
      window.modificationLogementPage = new ModificationLogementPage();
    }
  }, 100);
});

// Export global
window.ModificationLogementPage = ModificationLogementPage;
