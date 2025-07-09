// Page modification de logement
class ModificationLogementPage {
  constructor() {
    this.init();
  }

  async init() {
    console.log('📝 Initialisation page modification logement...');
    
    // Initialiser le gestionnaire d'édition
    this.propertyEditor = new PropertyEditor();
    
    console.log('✅ Page modification initialisée');
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
