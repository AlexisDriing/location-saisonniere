// Gestionnaire de profil - gestion de boutons intégré et création de logement V8
class ProfileManager {
  constructor() {
    this.currentUser = null;
    this.userProperties = [];
    this.init();
  }

  async init() {
    console.log('👤 Initialisation ProfileManager...');
    
    // Attendre Memberstack
    await this.waitForMemberstack();
    
    // Charger l'utilisateur connecté
    await this.loadCurrentUser();
    
    if (!this.currentUser) {
      console.error('❌ Utilisateur non connecté');
      return;
    }
    
    console.log('✅ Utilisateur connecté:', this.currentUser);
    
    // Charger les logements de l'utilisateur
    await this.loadUserProperties();
    
    // Afficher les logements
    this.displayProperties();

    // NOUVEAU : Configurer le formulaire de création
    this.setupCreatePropertyForm();
    
    console.log('✅ ProfileManager initialisé');
    
    // Export global
    window.profileManager = this;
  }

  async waitForMemberstack() {
    return new Promise((resolve) => {
      const checkMemberstack = () => {
        if (window.$memberstackDom) {
          resolve();
        } else {
          setTimeout(checkMemberstack, 100);
        }
      };
      checkMemberstack();
    });
  }

  async loadCurrentUser() {
    try {
      if (window.$memberstackDom) {
        const member = await window.$memberstackDom.getCurrentMember();
        if (member && member.data) {
          this.currentUser = member.data;
          console.log('📊 Données utilisateur:', this.currentUser);
        }
      }
    } catch (error) {
      console.error('❌ Erreur chargement utilisateur:', error);
    }
  }

  async loadUserProperties() {
    if (!this.currentUser || !this.currentUser.id) {
      console.error('❌ Pas d\'ID utilisateur disponible');
      return;
    }
    
    try {
      console.log('🔍 Recherche des logements pour l\'utilisateur:', this.currentUser.id);
      
      // Appel à votre API pour récupérer les logements de l'utilisateur
      const response = await fetch(`${window.CONFIG.API_URL}/user-properties?member_id=${this.currentUser.id}`);
      
      if (!response.ok) {
        throw new Error(`Erreur API: ${response.status}`);
      }
      
      const data = await response.json();
      this.userProperties = data.properties || data || [];
      
      console.log('🏠 Logements trouvés:', this.userProperties);
      
    } catch (error) {
      console.error('❌ Erreur chargement logements:', error);
      this.userProperties = []; // Aucun logement si erreur
    }
  }

  displayProperties() {
    console.log('🎨 Affichage des logements...');
    
    if (this.userProperties.length === 0) {
      this.showEmptyState();
      return;
    }
    
    // Pour commencer, afficher le premier logement
    const property = this.userProperties[0];
    this.displayProperty(property);

    this.updateButtonsVisibility(property);
  }

  displayProperty(property) {
  console.log('🏠 Affichage du logement:', property);
  
  // 1. Afficher le bon bloc selon le statut
  this.showCorrectStatusBlock(property);
  
  // 2. Remplir les informations du logement
  this.fillPropertyInfo(property);
  
  // 3. Remplir les images
  this.fillPropertyImages(property);
  
  // 4. Configurer le bouton modifier
  this.setupModifyButton(property);

  this.setupDisableButton(property);
}

// 🆕 NOUVELLE MÉTHODE à ajouter après fillPropertyImages
setupModifyButton(property) {
  const status = this.getPropertyStatus(property);
  const modifyButton = document.querySelector(`#${status} .brouillon-modifier`);
  
  if (modifyButton) {
    // 🆕 MODIFIÉ : Utiliser l'ID Webflow
    const webflowId = property.webflow_item_id;
    
    if (!webflowId) {
      console.error('❌ ID Webflow manquant pour', property.name);
      return;
    }
    
    const modifyUrl = `/mon-espace/modification-logement?id=${webflowId}`;
    
    if (modifyButton.tagName === 'A') {
      modifyButton.href = modifyUrl;
    } else {
      modifyButton.addEventListener('click', () => {
        window.location.href = modifyUrl;
      });
    }
    
    console.log(`✅ Bouton modifier configuré avec ID Webflow: ${webflowId}`);
  } else {
    console.warn(`❌ Bouton .brouillon-modifier non trouvé dans le bloc ${status}`);
  }
}

// 🆕 NOUVELLE MÉTHODE : Désactiver le bouton dans pending-none
setupDisableButton(property) {
  const status = this.getPropertyStatus(property);
  
  // Seulement si le statut est pending-none
  if (status === 'pending-none') {
    const disableButton = document.getElementById('button-disable');
    
    if (disableButton) {
      // Désactiver le clic sans changer l'apparence
      disableButton.style.pointerEvents = 'none';
      disableButton.style.cursor = 'not-allowed';
    }
  }
}

  showCorrectStatusBlock(property) {
    // Masquer tous les blocs d'état (vos IDs réels)
    const allStatusBlocks = [
      'pending-none',
      'pending', 
      'verified',
      'published' // Corrigé
    ];
    
    allStatusBlocks.forEach(blockId => {
      const block = document.getElementById(blockId);
      if (block) {
        block.style.display = 'none';
      }
    });
    
    // Déterminer le statut actuel
    const status = this.getPropertyStatus(property);
    console.log('📊 Statut du logement:', status);
    
    // Afficher le bon bloc
    const targetBlock = document.getElementById(status);
    if (targetBlock) {
      targetBlock.style.display = 'block';
      console.log(`✅ Bloc ${status} affiché`);
    } else {
      console.error(`❌ Bloc ${status} non trouvé`);
    }
  }

  getPropertyStatus(property) {
    // Utiliser directement la valeur du champ CMS "verification_status"
    const status = property.verification_status;
    
    console.log('📊 Statut du champ CMS verification_status:', status);
    
    // Vérifier que le statut existe et correspond à un de vos blocs
    const validStatuses = ['pending-none', 'pending', 'verified', 'published'];
    
    if (validStatuses.includes(status)) {
      return status;
    } else {
      console.warn(`⚠️ Statut "${status}" non reconnu, utilisation de "pending-none" par défaut`);
      return 'pending-none'; // Valeur par défaut si le statut n'est pas reconnu
    }
  }

  fillPropertyInfo(property) {
    // Déterminer le statut pour construire les IDs corrects
    const status = this.getPropertyStatus(property);
  
    // 🆕 AJOUTER : Afficher l'ID Webflow pour debug
    console.log('🔍 Property data:', {
      webflow_item_id: property.webflow_item_id,
      name: property.name,
      status: status
    });
    // Remplir le nom du logement avec l'ID spécifique au bloc
    const nameElement = document.getElementById(`property-name-${status}`);
    if (nameElement) {
      nameElement.textContent = property.name || 'Nom non défini';
      console.log(`✅ Nom rempli dans #property-name-${status}:`, property.name);
    } else {
      console.warn(`❌ Élément #property-name-${status} non trouvé`);
    }
    
    // Remplir l'adresse (formatée) avec l'ID spécifique au bloc
    const addressElement = document.getElementById(`property-address-${status}`);
    if (addressElement) {
      addressElement.textContent = this.formatAddress(property.address);
      console.log(`✅ Adresse remplie dans #property-address-${status}:`, property.address);
    } else {
      console.warn(`❌ Élément #property-address-${status} non trouvé`);
    }
  }

  fillPropertyImages(property) {
    // Déterminer le statut pour construire les IDs corrects
    const status = this.getPropertyStatus(property);
    
    // Remplir les 3 images avec les IDs spécifiques au bloc
    for (let i = 1; i <= 3; i++) {
      const imageElement = document.getElementById(`image-${i}-${status}`);
      const imageUrl = property[`image${i}`];
      
      if (imageElement && imageUrl) {
        // Si c'est un élément img
        if (imageElement.tagName === 'IMG') {
          imageElement.src = imageUrl;
          imageElement.style.display = 'block';
        } 
        // Si c'est un div avec background-image (plus courant dans Webflow)
        else {
          imageElement.style.backgroundImage = `url(${imageUrl})`;
          imageElement.style.backgroundSize = 'cover';
          imageElement.style.backgroundPosition = 'center';
        }
        
        console.log(`✅ Image ${i} remplie dans #image-${i}-${status}:`, imageUrl);
      } else {
        console.log(`⚠️ Image ${i} non trouvée ou élément #image-${i}-${status} manquant`);
        if (imageElement) {
          imageElement.style.display = 'none';
        }
      }
    }
  }

  formatAddress(address) {
    if (!address) return 'Adresse non renseignée';
    
    // Formatter l'adresse (garder seulement ville, pays)
    const parts = address.split(',').map(part => part.trim());
    return parts.length >= 2 ? parts.slice(-2).join(', ') : address;
  }

  showEmptyState() {
    console.log('📭 Aucun logement trouvé');
    
    // Masquer tous les blocs de statut
    const allStatusBlocks = ['pending-none', 'pending', 'verified', 'published'];
    allStatusBlocks.forEach(blockId => {
      const block = document.getElementById(blockId);
      if (block) {
        block.style.display = 'none';
      }
    });
    
    // 🆕 NOUVEAU : Gérer l'état vide
    const emptyState = document.getElementById('empty-state');
    const emptyButton = document.getElementById('empty-button');
    const linkPlans = document.getElementById('link-plans');
    const addProperty = document.getElementById('add-property');
    
    if (emptyState) emptyState.style.display = 'flex';
    if (emptyButton) emptyButton.style.display = 'flex';
    if (linkPlans) linkPlans.style.display = 'none';
    if (addProperty) addProperty.style.display = 'none';
  }

  updateButtonsVisibility(property) {
  const status = property.verification_status || 'pending-none';
  
  // Masquer les éléments vides
  const emptyState = document.getElementById('empty-state');
  const emptyButton = document.getElementById('empty-button');
  if (emptyState) emptyState.style.display = 'none';
  if (emptyButton) emptyButton.style.display = 'none';
  
  // Bouton link-plans : visible seulement si published
  const linkPlans = document.getElementById('link-plans');
  if (linkPlans) {
    linkPlans.style.display = status === 'published' ? 'flex' : 'none';
  }
  
  // Bouton add-property : toujours visible, mais ACTIVÉ seulement si published
  const addProperty = document.getElementById('add-property');
  if (addProperty) {
    addProperty.style.display = 'flex';
    
    if (status === 'published') {
      addProperty.style.opacity = '1';
      addProperty.style.pointerEvents = 'auto';
      addProperty.style.cursor = 'pointer';
    } else {
      addProperty.style.opacity = '0.5';
      addProperty.style.pointerEvents = 'none';
      addProperty.style.cursor = 'not-allowed';
    }
  }
}
  
  // Méthodes publiques pour debug et interaction
  debug() {
    return {
      currentUser: this.currentUser,
      userProperties: this.userProperties,
      hasUser: !!this.currentUser,
      propertiesCount: this.userProperties.length
    };
  }

  // Méthode pour recharger manuellement
  async reload() {
    await this.loadUserProperties();
    this.displayProperties();
  }

  // NOUVELLE MÉTHODE À AJOUTER ICI
  setupCreatePropertyForm() {
  // L'ID est sur le div wrapper, pas le form
  const formWrapper = document.getElementById('form-create-logement');
  if (!formWrapper) return;
  
  // Le vrai formulaire est à l'intérieur
  const form = formWrapper.querySelector('form');
  if (!form) {
    console.error('Formulaire non trouvé dans le wrapper');
    return;
  }
  
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    e.stopPropagation(); // Empêche la soumission Webflow
    
    if (!this.currentUser || !this.currentUser.id) {
      return;
    }
    
    const submitButton = form.querySelector('[type="submit"]');
    const originalText = submitButton.value;
    
    // Maintenant FormData fonctionnera
    const formData = new FormData(form);
    const nomLogement = formData.get('nom-logement');
    const adresse = formData.get('adresse');
    
    console.log('Données récupérées:', { nomLogement, adresse }); // Debug
    
    // Désactiver le bouton
    submitButton.disabled = true;
    submitButton.value = 'Création...';
    
    try {
      const response = await fetch(`${window.CONFIG.API_URL}/create-property`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: nomLogement,
          address: adresse,
          memberId: this.currentUser.id
        })
      });
      
      if (response.ok) {
        window.location.reload();
      }
      
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      submitButton.disabled = false;
      submitButton.value = originalText;
    }
    });
  }
}

// Auto-initialisation (comme vos autres modules)
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    if (window.location.pathname.includes('/mon-espace')) {
      new ProfileManager();
    }
  }, 100);
});

// Export global
window.ProfileManager = ProfileManager;
