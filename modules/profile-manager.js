// Gestionnaire de profil - gestion de boutons intégré et création de logement V14 v3
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
    // Vérifier si on revient d'un paiement Stripe
    this.checkPaymentSuccess();
    
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
    
    // NOUVEAU : Récupérer le conteneur
    const container = document.getElementById('all-properties-container');
    if (!container) {
      console.error('❌ Conteneur all-properties-container non trouvé');
      return;
    }
    
    // NOUVEAU : Vider le conteneur
    container.innerHTML = '';
    
    if (this.userProperties.length === 0) {
      this.showEmptyState();
      return;
    }
    
    // NOUVEAU : Masquer tous les templates originaux
    ['pending-none', 'pending-verif', 'pending', 'verified', 'published'].forEach(id => {
      const template = document.getElementById(`template-${id}`);
      if (template) template.style.display = 'none';
    });
    
    // MODIFIÉ : Au lieu d'afficher UN logement, on les affiche TOUS
    this.userProperties.forEach((property, index) => {
      // Récupérer le template correspondant au statut
      const status = this.getPropertyStatus(property);
      const template = document.getElementById(`template-${status}`);
      
      if (!template) {
        console.error(`Template template-${status} non trouvé`);
        return;
      }
      
      // Cloner le template
      const clone = template.cloneNode(true);
      clone.id = `property-${index}`;
      clone.style.display = 'block'; // ou 'flex' selon votre CSS
      
      // Ajouter au conteneur
      container.appendChild(clone);
      
      // RÉUTILISER vos méthodes existantes sur le clone
      this.displayProperty(property, clone); // MODIFIÉ : passer le clone
    });
    
    // Gérer les boutons avec le PREMIER logement (le plus récent après tri)
    const newestProperty = this.userProperties[0];
    this.updateButtonsVisibility(newestProperty);
  }

  displayProperty(property, element = null) {  // AJOUT du paramètre element
  console.log('🏠 Affichage du logement:', property);
  
  // Si pas d'élément fourni, utiliser l'ancienne logique (pour compatibilité)
  if (!element) {
    this.showCorrectStatusBlock(property);
  }
  
  // MODIFIÉ : Utiliser element au lieu de document si fourni
  const targetElement = element || document;
  
  // 2. Remplir les informations - MODIFIÉ pour passer targetElement
  this.fillPropertyInfo(property, targetElement);
  
  // 3. Remplir les images
  const status = this.getPropertyStatus(property);
  if (status === 'verified' || status === 'published') {
    this.fillPropertyImages(property, targetElement);
  }
  
  // 4. Configurer le bouton modifier
  this.setupModifyButton(property, targetElement);
  
  // 5. Désactiver le bouton si pending-none
  this.setupDisableButton(property, targetElement);
  this.setupViewPropertyButton(property, targetElement);
  // Ligne existante qui passe déjà targetElement
  this.setupVerificationButton(property, targetElement);
  this.setupPaymentButton(property, targetElement);
}

// 🆕 NOUVELLE MÉTHODE à ajouter après fillPropertyImages
setupModifyButton(property, targetElement = document) {  // AJOUT du paramètre
  const status = this.getPropertyStatus(property);
  const modifyButton = targetElement.querySelector('.brouillon-modifier');
  
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
setupDisableButton(property, targetElement = document) {  // AJOUT du paramètre
  const status = this.getPropertyStatus(property);
  
  if (status === 'pending-none') {
    const disableButton = targetElement.querySelector('#button-disable');
    
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
      'pending-verif',
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
    const validStatuses = ['pending-none', 'pending-verif', 'pending', 'verified', 'published'];
    
    if (validStatuses.includes(status)) {
      return status;
    } else {
      console.warn(`⚠️ Statut "${status}" non reconnu, utilisation de "pending-none" par défaut`);
      return 'pending-none'; // Valeur par défaut si le statut n'est pas reconnu
    }
  }

  fillPropertyInfo(property, targetElement = document) {  // AJOUT du paramètre
    const status = this.getPropertyStatus(property);
  
    console.log('🔍 Property data:', {
      webflow_item_id: property.webflow_item_id,
      name: property.name,
      status: status
    });
    
    // MODIFIÉ : Utiliser querySelector sur targetElement avec des classes
    const nameElement = targetElement.querySelector('.property-name');
    if (nameElement) {
      nameElement.textContent = property.name || 'Nom non défini';
      console.log(`✅ Nom rempli:`, property.name);
    } else {
      console.warn(`❌ Élément .property-name non trouvé`);
    }
    
    const addressElement = targetElement.querySelector('.adresse-logement');
    if (addressElement) {
      addressElement.textContent = this.formatAddress(property.address);
      console.log(`✅ Adresse remplie:`, property.address);
    } else {
      console.warn(`❌ Élément .adresse-logement non trouvé`);
    }
  }

  fillPropertyImages(property, targetElement = document) {  // AJOUT du paramètre
    const status = this.getPropertyStatus(property);
    
    // MODIFIÉ : Utiliser les classes main, left, right
    const imageMapping = [
      { selector: '.main', property: 'image1' },
      { selector: '.left', property: 'image2' },
      { selector: '.right', property: 'image3' }
    ];
    
    imageMapping.forEach(({ selector, property: prop }) => {
      const imageElement = targetElement.querySelector(selector);
      const imageUrl = property[prop];
      
      if (imageElement && imageUrl) {
        if (imageElement.tagName === 'IMG') {
          imageElement.src = imageUrl;
          imageElement.style.display = 'block';
        } else {
          imageElement.style.backgroundImage = `url(${imageUrl})`;
          imageElement.style.backgroundSize = 'cover';
          imageElement.style.backgroundPosition = 'center';
          imageElement.style.display = 'block';
        }
        console.log(`✅ Image ${prop} remplie:`, imageUrl);
      } else if (imageElement) {
        imageElement.style.display = 'none';
      }
    });
  }

   formatAddress(address) {
    if (!address) return 'Adresse non renseignée';
    
    // Formatter l'adresse (garder seulement ville, pays)
    const parts = address.split(',').map(part => part.trim());
    return parts.length >= 2 ? parts.slice(0, 2).join(', ') : address;
  }

  setupVerificationButton(property, targetElement = document) {
    console.log('⚙️ Setup du bouton vérification pour :', property.name);
    
    // IMPORTANT : Chercher dans targetElement, pas dans document !
    const verificationBtn = targetElement.querySelector('[data-tally-url]');
    console.log('🔍 Bouton trouvé dans le clone :', verificationBtn);
    
    if (!verificationBtn) {
      console.error('❌ Bouton non trouvé dans ce bloc');
      return;
    }
    
    const tallyBaseUrl = verificationBtn.dataset.tallyUrl;
    const memberEmail = this.currentUser?.email || this.currentUser?.auth?.email || '';
    
    const params = new URLSearchParams({
      memberstack_id: this.currentUser?.id || '',
      property_id: property.webflow_item_id || '',
      property_name: property.name || '',
      email: memberEmail
    });
    
    const finalUrl = `${tallyBaseUrl}?${params.toString()}`;
    
    // Attacher le listener sur le bouton DU CLONE
    verificationBtn.addEventListener('click', function(e) {
      console.log('🖱️ Clic détecté !');
      e.preventDefault();
      window.open(finalUrl, '_blank');
    });
    
    console.log('✅ Listener attaché au bouton du clone');
  }

  setupPaymentButton(property, targetElement = document) {
  console.log('💳 Setup du bouton paiement Stripe');
  
  // Chercher le bouton de paiement (adaptez le sélecteur selon votre HTML)
  const paymentBtn = targetElement.querySelector('[data-stripe-payment]'); // ou autre sélecteur
  
  if (!paymentBtn) {
    console.log('Pas de bouton de paiement dans ce bloc');
    return;
  }
  
  // Configuration simple : juste ajouter le lien Stripe avec l'ID du logement
  const STRIPE_PAYMENT_LINK = 'https://buy.stripe.com/test_7sY5kCcx16EN8RO1PodEs00';
  const propertyId = property.webflow_item_id;
  const userEmail = this.currentUser?.email || '';
  
  // Construire l'URL
  const stripeUrl = new URL(STRIPE_PAYMENT_LINK);
  stripeUrl.searchParams.set('client_reference_id', propertyId);
  if (userEmail) {
    stripeUrl.searchParams.set('prefilled_email', userEmail);
  }
  
  // Simple listener
  paymentBtn.addEventListener('click', function(e) {
    e.preventDefault();
    console.log('💳 Paiement pour logement:', propertyId);
    window.location.href = stripeUrl.toString();
  });
}
// 🆕 NOUVELLE MÉTHODE : Configurer le bouton pour voir le logement
setupViewPropertyButton(property, targetElement = document) {
  const viewButton = targetElement.querySelector('#logement-link');
  
  if (!viewButton) return;
  
  // Utiliser webflow_item_id comme dans gestion-proprietes (qui utilise propData.id)
  const propertyUrl = `/locations-saisonnieres/${property.webflow_item_id}`;
  
  viewButton.addEventListener('click', (e) => {
    e.preventDefault();
    window.open(propertyUrl, '_blank');
  });
}
  // Vérifier le retour de paiement
checkPaymentSuccess() {
  const urlParams = new URLSearchParams(window.location.search);
  
  if (urlParams.get('success') !== 'true') return;
  
  console.log('🎉 Retour de paiement détecté');
  
  // Afficher la notification
  const notification = document.getElementById('payment-success-notification');
  if (notification) {
    notification.style.display = 'flex'; // ou 'flex' selon votre design Webflow
    notification.classList.add('show');
    
    // Masquer après 3 secondes
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => {
        notification.style.display = 'none';
      }, 300);
    }, 3000);
  }
  
  // Lancer les confettis
  if (typeof confetti !== 'undefined') {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
  }
  
  // Nettoyer l'URL
  window.history.replaceState({}, document.title, window.location.pathname);
}

  showEmptyState() {
    console.log('📭 Aucun logement trouvé');
    
    // Masquer tous les blocs de statut
    const allStatusBlocks = ['pending-none', 'pending-verif', 'pending', 'verified', 'published'];
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
  // Masquer les éléments vides
  const emptyState = document.getElementById('empty-state');
  const emptyButton = document.getElementById('empty-button');
  if (emptyState) emptyState.style.display = 'none';
  if (emptyButton) emptyButton.style.display = 'none';
  
  // 🆕 NOUVEAU : link-plans visible si AU MOINS UN published dans la liste
  const hasAnyPublished = this.userProperties.some(prop => 
    prop.verification_status === 'published'
  );
  
  const linkPlans = document.getElementById('link-plans');
  if (linkPlans) {
    linkPlans.style.display = hasAnyPublished ? 'flex' : 'none';
  }
  
  // 🆕 add-property : vérifier le statut du plus récent (passé en paramètre)
  const newestStatus = newestProperty?.verification_status || 'pending-none';
  const addProperty = document.getElementById('add-property');
  if (addProperty) {
    addProperty.style.display = 'flex';
    
    if (newestStatus === 'published') {
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

  // NOUVEAU : Bloquer les chiffres dans le champ ville-creation
  const villeCreationInput = document.getElementById('ville-creation');
  if (villeCreationInput) {
    villeCreationInput.addEventListener('input', (e) => {
      // Supprimer tous les chiffres de la valeur
      e.target.value = e.target.value.replace(/\d/g, '');
    });
    
    // Bloquer également au keypress pour une meilleure UX
    villeCreationInput.addEventListener('keypress', (e) => {
      // Si c'est un chiffre, empêcher la saisie
      if (/\d/.test(e.key)) {
        e.preventDefault();
      }
    });
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
    const ville = document.getElementById('ville-creation')?.value?.trim() || '';
    const pays = document.getElementById('pays-creation')?.value?.trim() || '';
    const rue = document.getElementById('rue-creation')?.value?.trim() || '';

    // Construire l'adresse complète
    let adresse = '';
    if (ville && pays) {
      adresse = ville + ', ' + pays;
      if (rue) {
        adresse += ', ' + rue;
      }
    }
    
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
