// Gestionnaire de la page de modification de logement V2
class PropertyEditor {
  constructor() {
    this.propertyId = null;
    this.propertyData = null;
    this.initialAddress = null; // Pour le bouton annuler
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
    }
  }

  prefillForm() {
    console.log('📝 Pré-remplissage des champs...');
    
    // 1. Afficher le nom du logement
    const titleElement = document.getElementById('logement-name-edit');
    if (titleElement && this.propertyData.name) {
      titleElement.textContent = this.propertyData.name;
    }
    
    // 2. Pré-remplir le champ adresse
    const addressInput = document.getElementById('adresse-input');
    if (addressInput && this.propertyData.address) {
      addressInput.value = this.propertyData.address;
      
      // Sauvegarder la valeur initiale (pour le bouton annuler)
      this.initialAddress = this.propertyData.address;
    }
    
    // 3. Écouter les changements
    this.setupFieldListeners();
  }

  setupFieldListeners() {
    const addressInput = document.getElementById('adresse-input');
    
    if (addressInput) {
      // Dès qu'on tape = activer les boutons
      addressInput.addEventListener('input', () => {
        this.enableButtons();
      });
    }
  }

  enableButtons() {
    const saveButton = document.getElementById('button-save-modifications');
    const cancelButton = document.getElementById('annulation');
    
    if (saveButton) {
      saveButton.disabled = false;
      saveButton.style.opacity = '1';
      saveButton.style.cursor = 'pointer';
    }
    
    if (cancelButton) {
      cancelButton.style.display = 'block'; // ou 'flex' selon votre CSS
    }
  }

  disableButtons() {
    const saveButton = document.getElementById('button-save-modifications');
    const cancelButton = document.getElementById('annulation');
    
    if (saveButton) {
      saveButton.disabled = true;
      saveButton.style.opacity = '0.5';
      saveButton.style.cursor = 'not-allowed';
    }
    
    if (cancelButton) {
      cancelButton.style.display = 'none';
    }
  }

  setupSaveButton() {
    console.log('💾 Configuration des boutons...');
    
    const saveButton = document.getElementById('button-save-modifications');
    const cancelButton = document.getElementById('annulation');
    
    // Désactiver par défaut
    this.disableButtons();
    
    // Bouton Enregistrer
    if (saveButton) {
      saveButton.addEventListener('click', async (e) => {
        e.preventDefault();
        await this.saveModifications();
      });
    }
    
    // Bouton Annuler
    if (cancelButton) {
      cancelButton.addEventListener('click', (e) => {
        e.preventDefault();
        this.cancelModifications();
      });
    }
    
    console.log('✅ Boutons configurés');
  }

  cancelModifications() {
    console.log('❌ Annulation des modifications');
    
    // Remettre la valeur initiale
    const addressInput = document.getElementById('adresse-input');
    if (addressInput && this.initialAddress !== undefined) {
      addressInput.value = this.initialAddress;
    }
    
    // Désactiver les boutons
    this.disableButtons();
  }

  async saveModifications() {
    console.log('💾 Sauvegarde des modifications...');
    
    // Récupérer la nouvelle adresse
    const addressInput = document.getElementById('adresse-input');
    const newAddress = addressInput ? addressInput.value.trim() : '';
    
    if (!newAddress) {
      alert('Veuillez remplir l\'adresse');
      return;
    }
    
    // Désactiver le bouton pendant la sauvegarde
    const saveButton = document.getElementById('button-save-modifications');
    const originalText = saveButton.textContent;
    saveButton.disabled = true;
    saveButton.textContent = 'Enregistrement...';
    
    try {
      // Préparer les données à envoyer
      const updates = {
        address: newAddress
      };
      
      console.log('📤 Envoi des modifications:', updates);
      
      // Appeler la route de mise à jour
      const response = await fetch(`${window.CONFIG.API_URL}/update-property/${this.propertyId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        console.log('✅ Sauvegarde réussie');
        
        // Mettre à jour la valeur initiale
        this.initialAddress = newAddress;
        
        // Désactiver les boutons
        this.disableButtons();
        
        // Afficher un message de succès
        alert('Modifications enregistrées avec succès !');
        
      } else {
        throw new Error(result.error || 'Erreur lors de la sauvegarde');
      }
      
    } catch (error) {
      console.error('❌ Erreur sauvegarde:', error);
      alert('Erreur lors de la sauvegarde : ' + error.message);
    } finally {
      // Réactiver le bouton
      saveButton.disabled = false;
      saveButton.textContent = originalText;
    }
  }
}

// Export global
window.PropertyEditor = PropertyEditor;
