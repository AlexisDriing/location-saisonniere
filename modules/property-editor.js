// Gestionnaire de la page de modification de logement
class PropertyEditor {
  constructor() {
    this.propertyId = null;
    this.propertyData = null;
    this.init();
  }

  async init() {
    console.log('✏️ Initialisation PropertyEditor...');
    
    // 1. Récupérer l'ID depuis l'URL
    this.propertyId = this.getPropertyIdFromUrl();
    
    if (!this.propertyId) {
      console.error('❌ Aucun ID de logement dans l\'URL');
      return;
    }
    
    console.log('🏠 ID du logement à modifier:', this.propertyId);
    
    // 2. Charger les données du logement
    await this.loadPropertyData();
    
    // 3. Pré-remplir les champs
    if (this.propertyData) {
      this.prefillForm();
      this.setupSaveButton();
    }
    
    console.log('✅ PropertyEditor initialisé');
    window.propertyEditor = this;
  }

  getPropertyIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
  }

  async loadPropertyData() {
    try {
      console.log('📡 Chargement des données du logement...');
      
      const response = await fetch(`${window.CONFIG.API_URL}/property-details-by-id/${this.propertyId}`);
      
      if (!response.ok) {
        throw new Error(`Erreur serveur: ${response.status}`);
      }
      
      this.propertyData = await response.json();
      console.log('✅ Données reçues:', this.propertyData);
      
    } catch (error) {
      console.error('❌ Erreur chargement:', error);
      this.showError('Impossible de charger les données du logement');
    }
  }

  prefillForm() {
    console.log('📝 Pré-remplissage des champs...');
    
    // 1. Afficher le nom du logement
    const titleElement = document.getElementById('logement-name-edit');
    if (titleElement && this.propertyData.name) {
      titleElement.textContent = this.propertyData.name;
      console.log('✅ Nom affiché:', this.propertyData.name);
    }
    
    // 2. Pré-remplir le champ adresse (TEST)
    const addressInput = document.getElementById('adresse-input');
    if (addressInput && this.propertyData.address) {
      addressInput.value = this.propertyData.address;
      console.log('✅ Adresse pré-remplie:', this.propertyData.address);
    } else {
      console.warn('⚠️ Champ adresse non trouvé ou données manquantes');
    }
  }

  setupSaveButton() {
    console.log('💾 Configuration du bouton Enregistrer...');
    
    const saveButton = document.getElementById('button-save-modifications');
    if (!saveButton) {
      console.error('❌ Bouton enregistrer non trouvé');
      return;
    }
    
    saveButton.addEventListener('click', async (e) => {
      e.preventDefault();
      await this.saveModifications();
    });
    
    console.log('✅ Bouton configuré');
  }

  async saveModifications() {
    console.log('💾 Sauvegarde des modifications...');
    
    // Pour le test, on récupère juste l'adresse
    const addressInput = document.getElementById('adresse-input');
    const newAddress = addressInput ? addressInput.value : '';
    
    if (!newAddress) {
      alert('Veuillez remplir l\'adresse');
      return;
    }
    
    console.log('📤 Nouvelle adresse:', newAddress);
    
    // TODO: Implémenter l'appel API pour sauvegarder
    alert(`Test réussi !\n\nNouvelle adresse : ${newAddress}\n\n(La sauvegarde réelle sera implémentée à l'étape suivante)`);
  }

  showError(message) {
  // Juste un log console, pas d'affichage
  console.error('❌', message);
  }

// Export global
window.PropertyEditor = PropertyEditor;
