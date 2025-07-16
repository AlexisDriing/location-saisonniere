// Gestionnaire de la page de modification de logement - V2
class PropertyEditor {
  constructor() {
    this.propertyId = null;
    this.propertyData = null;
    this.initialValues = {}; // Stockage de TOUTES les valeurs initiales
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

  initFormFormatters() {
    console.log('📝 Initialisation des formatters...');
    
    // Attendre que Cleave soit chargé
    if (typeof Cleave === 'undefined') {
      // Le script est déjà dans Webflow, on attend juste qu'il soit prêt
      setTimeout(() => this.initFormFormatters(), 100);
      return;
    }
    
    this.setupDateFormatters();
    this.setupSuffixFormatters();
  }
  
  setupDateFormatters() {
    const dateInputs = document.querySelectorAll('[data-format="date-jour-mois"]');
    
    dateInputs.forEach(input => {
      new Cleave(input, {
        date: true,
        delimiter: '/',
        datePattern: ['d', 'm'],
        blocks: [2, 2],
        numericOnly: true
      });
      
      input.addEventListener('blur', () => {
        if (input.value) {
          input.setAttribute('data-date-value', input.value);
        }
      });
    });
  }
  
  setupSuffixFormatters() {
    // Euros
    document.querySelectorAll('[data-suffix="euro"], [data-suffix="euro-nuit"]').forEach(input => {
      input.addEventListener('blur', function() {
        const value = this.value.replace(/[^\d]/g, '');
        if (value) {
          this.setAttribute('data-raw-value', value);
          const suffix = this.getAttribute('data-suffix') === 'euro' ? ' €' : ' € / nuit';
          this.value = value + suffix;
        }
      });
      
      input.addEventListener('focus', function() {
        const rawValue = this.getAttribute('data-raw-value');
        if (rawValue) {
          this.value = rawValue;
        }
      });
    });
  }
  
  // Méthodes utilitaires
  getRawValue(input) {
    return input.getAttribute('data-raw-value') || input.value.replace(/[^\d]/g, '');
  }
  
  getDateValue(input) {
    const dateValue = input.getAttribute('data-date-value');
    if (dateValue && dateValue.includes('/')) {
      return dateValue.replace('/', '-'); // "15/07" → "15-07"
    }
    return null;
  }
  
  prefillForm() {
    console.log('📝 Pré-remplissage des champs...');
    
    // 1. Afficher le nom du logement
    const titleElement = document.getElementById('logement-name-edit');
    if (titleElement && this.propertyData.name) {
      titleElement.textContent = this.propertyData.name;
    }
    
    // 2. Configuration des champs (facilement extensible)
    const fields = [
      { id: 'adresse-input', dataKey: 'address' },
      { id: 'cadeaux-input', dataKey: 'cadeaux' }
    ];
    
    // 3. Pré-remplir et sauvegarder les valeurs initiales
    fields.forEach(field => {
      const input = document.getElementById(field.id);
      if (input) {
        const value = this.propertyData[field.dataKey] || '';
        input.value = value;
        this.initialValues[field.dataKey] = value;
        console.log(`✅ Champ ${field.id} pré-rempli:`, value || '(vide)');
      }
    });
    
    // 4. Écouter les changements
    this.setupFieldListeners();
  }

  setupFieldListeners() {
    const fields = [
      { id: 'adresse-input' },
      { id: 'cadeaux-input' }
    ];
    
    fields.forEach(field => {
      const input = document.getElementById(field.id);
      if (input) {
        // Dès qu'on tape = activer les boutons (logique simple)
        input.addEventListener('input', () => {
          this.enableButtons();
        });
      }
    });
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
      cancelButton.style.display = 'block';
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
    
    // Configuration des champs à réinitialiser
    const fields = [
      { id: 'adresse-input', dataKey: 'address' },
      { id: 'cadeaux-input', dataKey: 'cadeaux' }
    ];
    
    // Remettre les valeurs initiales
    fields.forEach(field => {
      const input = document.getElementById(field.id);
      if (input) {
        input.value = this.initialValues[field.dataKey] || '';
      }
    });
    
    // Désactiver les boutons
    this.disableButtons();
  }

  async saveModifications() {
    console.log('💾 Sauvegarde des modifications...');
    
    // Configuration du mapping des champs
    const fieldMapping = [
      { id: 'adresse-input', dataKey: 'address', dbKey: 'adresse' },
      { id: 'cadeaux-input', dataKey: 'cadeaux', dbKey: 'cadeaux' }
    ];
    
    // Collecter les valeurs actuelles
    const currentValues = {};
    fieldMapping.forEach(field => {
      const input = document.getElementById(field.id);
      if (input) {
        currentValues[field.dataKey] = input.value.trim();
      }
    });
    
    // 🎯 OPTIMISATION : Ne prendre que les champs modifiés
    const updates = {};
    Object.keys(currentValues).forEach(key => {
      if (currentValues[key] !== this.initialValues[key]) {
        updates[key] = currentValues[key];
      }
    });
    
    // Si aucune modification
    if (Object.keys(updates).length === 0) {
      alert('Aucune modification détectée');
      return;
    }
    
    console.log(`📤 Envoi de ${Object.keys(updates).length} champ(s) modifié(s):`, updates);
    
    // Désactiver le bouton pendant la sauvegarde
    const saveButton = document.getElementById('button-save-modifications');
    const originalText = saveButton.textContent;
    saveButton.disabled = true;
    saveButton.textContent = 'Enregistrement...';
    
    try {
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
        
        // Mettre à jour les valeurs initiales avec les nouvelles valeurs
        Object.keys(updates).forEach(key => {
          this.initialValues[key] = updates[key];
        });
        
        // Désactiver les boutons
        this.disableButtons();
        
        // Message de succès
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
