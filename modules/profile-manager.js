// Gestionnaire de profil - chambres d'hôtes v1.038 - LOG production
class ProfileManager {
  constructor() {
    this.currentUser = null;
    this.userProperties = [];
    this.init();
  }

  async init() {
    
    // Attendre Memberstack
    await this.waitForMemberstack();
    
    // Charger l'utilisateur connecté
    await this.loadCurrentUser();
    
    if (!this.currentUser) {
      console.error('❌ Utilisateur non connecté');
      return;
    }
    
    
    // Charger les logements de l'utilisateur
    await this.loadUserProperties();
    
    // Afficher les logements
    this.displayProperties();

    // NOUVEAU : Configurer le formulaire de création
    this.setupCreatePropertyForm();
    // Vérifier si on revient d'un paiement Stripe
    this.checkPaymentSuccess();
    this.checkPopupTrigger();

    // Configurer le bouton de création de chambre
    this.setupAddRoomSubmit();
    
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
      
      // Appel à votre API pour récupérer les logements de l'utilisateur
      const response = await fetch(`${window.CONFIG.API_URL}/user-properties?member_id=${this.currentUser.id}`);
      
      if (!response.ok) {
        throw new Error(`Erreur API: ${response.status}`);
      }
      
      const data = await response.json();
      this.userProperties = data.properties || data || [];
      
      
    } catch (error) {
      console.error('❌ Erreur chargement logements:', error);
      this.userProperties = []; // Aucun logement si erreur
    }
  }

  displayProperties() {
    
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
  
  // 6. Affichage conditionnel chambres d'hôtes
  this.displayChambreHoteElements(property, targetElement);
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
    
    // Afficher le bon bloc
    const targetBlock = document.getElementById(status);
    if (targetBlock) {
      targetBlock.style.display = 'block';
    } else {
      console.error(`❌ Bloc ${status} non trouvé`);
    }
  }

  getPropertyStatus(property) {
    // Utiliser directement la valeur du champ CMS "verification_status"
    const status = property.verification_status;
    
    
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
  
    
    // MODIFIÉ : Utiliser querySelector sur targetElement avec des classes
    const nameElement = targetElement.querySelector('.property-name');
    if (nameElement) {
      nameElement.textContent = property.name || 'Nom non défini';
    } else {
      console.warn(`❌ Élément .property-name non trouvé`);
    }
    
    const addressElement = targetElement.querySelector('.adresse-logement');
    if (addressElement) {
      addressElement.textContent = this.formatAddress(property.address);
    } else {
      console.warn(`❌ Élément .adresse-logement non trouvé`);
    }
  }

  fillPropertyImages(property, targetElement = document) {
  const status = this.getPropertyStatus(property);
  
  // 🆕 NOUVEAU : Utiliser images_gallery au lieu de image1, image2, image3
  const imagesGallery = property.images_gallery || [];
  
  // Extraire les URLs des 3 premières images
  const imageUrls = imagesGallery.slice(0, 3).map(img => {
    // Si c'est un objet avec url
    if (typeof img === 'object' && img.url) {
      return img.url;
    }
    // Si c'est directement une string
    if (typeof img === 'string') {
      return img;
    }
    return null;
  }).filter(url => url !== null);
  
  // Mapper les images aux sélecteurs
  const imageMapping = [
    { selector: '.main', url: imageUrls[0] },
    { selector: '.left', url: imageUrls[1] },
    { selector: '.right', url: imageUrls[2] }
  ];
  
  // Injecter les images
  imageMapping.forEach(({ selector, url }) => {
    const imageElement = targetElement.querySelector(selector);
    
    if (imageElement && url) {
      if (imageElement.tagName === 'IMG') {
        imageElement.src = url;
        imageElement.style.display = 'block';
      } else {
        // Si c'est une div avec background-image
        imageElement.style.backgroundImage = `url(${url})`;
        imageElement.style.backgroundSize = 'cover';
        imageElement.style.backgroundPosition = 'center';
        imageElement.style.display = 'block';
      }
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
    
    // IMPORTANT : Chercher dans targetElement, pas dans document !
    const verificationBtn = targetElement.querySelector('[data-tally-url]');
    
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
      e.preventDefault();
      window.open(finalUrl, '_blank');
    });
    
  }

  setupPaymentButton(property, targetElement = document) {
  
  // Chercher le bouton de paiement (adaptez le sélecteur selon votre HTML)
  const paymentBtn = targetElement.querySelector('[data-stripe-payment]'); // ou autre sélecteur
  
  if (!paymentBtn) {
    return;
  }
  
  // Configuration simple : juste ajouter le lien Stripe avec l'ID du logement
  const STRIPE_PAYMENT_LINK = 'https://buy.stripe.com/8x228q9kP0gp2tqbpYdEs0M';
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

// ================================
// 🛏️ GESTION DES CHAMBRES D'HÔTES
// ================================

displayChambreHoteElements(property, targetElement = document) {
  const isChambreHote = property.mode_location === "Chambre d'hôtes";
  const rooms = property.rooms || [];
  const hasRooms = rooms.length > 0;
  const status = this.getPropertyStatus(property);
  
  // 1. Tag chambre d'hôte
  const tag = targetElement.querySelector('.tag-element.chambres-hote.profile');
  if (tag) {
    tag.style.display = isChambreHote ? 'flex' : 'none';
  }
  
  // 2. Bloc chambres d'hôte
  const bloc = targetElement.querySelector('.bloc-chambres-hote');
  if (bloc) {
    bloc.style.display = isChambreHote ? 'block' : 'none';
  }
  
  // 3. Séparateur
  const separator = targetElement.querySelector('.line-separateur.chambres-hote');
  if (separator) {
    separator.style.display = isChambreHote ? 'block' : 'none';
  }
  
  // Si ce n'est pas une chambre d'hôte, on s'arrête ici
  if (!isChambreHote) return;
  
  // 4. Bloc images des chambres (masqué si pas de chambres)
  const blocCardChambres = targetElement.querySelector('.bloc-card-chambres');
  if (blocCardChambres) {
    blocCardChambres.style.display = hasRooms ? 'flex' : 'none';
  }
  
  // 5. Bouton gérer/modifier (masqué si pas de chambres)
  const buttonEdit = targetElement.querySelector('.button-edit-chambres');
  if (buttonEdit) {
    buttonEdit.style.display = hasRooms ? 'flex' : 'none';
  }
  
  // 6. Bouton ajouter chambre
  // Visible SEULEMENT sur pending-none ET si pas encore de chambres
  const buttonAdd = targetElement.querySelector('.bouton-image.add-chambres:not(.button-edit-chambres)');
  if (buttonAdd) {
    if (status === 'pending-none' && !hasRooms) {
      buttonAdd.style.display = 'flex';
    } else {
      buttonAdd.style.display = 'none';
    }
  }
  
  // 7. Gérer les slots d'images des chambres
  if (hasRooms) {
    this.displayRoomImagesOnCard(rooms, targetElement, status);
  }
  
  // 8. Configurer les boutons
  this.setupRoomButtons(property, targetElement);
}

displayRoomImagesOnCard(rooms, targetElement, status) {
  const showImages = (status === 'verified' || status === 'published');
  
  for (let i = 0; i < 5; i++) {
    const slot = targetElement.querySelector(`.image-chambre-slot-${i + 1}`);
    if (!slot) continue;
    
    if (i < rooms.length) {
      // Slot correspond à une chambre existante : afficher
      slot.style.display = 'flex';
      
      // Remplir l'image seulement si verified ou published
      if (showImages) {
        const room = rooms[i];
        const photos = room.photos || [];
        
        let photoUrl = null;
        if (photos.length > 0) {
          const firstPhoto = photos[0];
          photoUrl = typeof firstPhoto === 'object' ? firstPhoto.url : firstPhoto;
        }
        
        if (photoUrl) {
          if (slot.tagName === 'IMG') {
            slot.src = photoUrl;
          } else {
            slot.style.backgroundImage = `url(${photoUrl})`;
            slot.style.backgroundSize = 'cover';
            slot.style.backgroundPosition = 'center';
          }
        }
      }
    } else {
      // Pas de chambre pour ce slot : masquer
      slot.style.display = 'none';
    }
  }
}

setupRoomButtons(property, targetElement) {
  // Bouton ajouter chambre (sur pending-none seulement, sans chambres)
  const buttonAdd = targetElement.querySelector('.bouton-image.add-chambres:not(.button-edit-chambres)');
  if (buttonAdd) {
    buttonAdd.addEventListener('click', (e) => {
      e.preventDefault();
      this.openAddRoomModal(property);
    });
  }
  
  // Bouton gérer chambres
  const buttonEdit = targetElement.querySelector('.button-edit-chambres');
  if (buttonEdit) {
    buttonEdit.addEventListener('click', (e) => {
      e.preventDefault();
      this.openManageRoomsModal(property);
    });
  }
}

openAddRoomModal(property) {
  this._currentPropertyForRoom = property;
  
  // Réinitialiser les champs
  const nameInput = document.getElementById('nom-chambre');
  const voyageursInput = document.getElementById('voyageurs-input');
  if (nameInput) nameInput.value = '';
  if (voyageursInput) voyageursInput.value = '';
  
  // Afficher la modale (réinitialiser les styles Webflow)
  const modal = document.getElementById('modal-add-chambres');
  if (modal) {
    modal.style.display = 'flex';
    modal.style.opacity = '1';
    const innerBloc = modal.querySelector('.bloc-popup');
    if (innerBloc) {
      innerBloc.style.opacity = '1';
      innerBloc.style.transform = 'translate3d(0px, 0px, 0px) scale3d(1, 1, 1) rotateX(0deg) rotateY(0deg) rotateZ(0deg) skew(0deg, 0deg)';
    }
  }
}

openManageRoomsModal(property) {
  this._currentPropertyForRoom = property;
  const rooms = property.rooms || [];
  
  // Masquer tous les blocs de chambres (1 à 5)
  for (let i = 1; i <= 5; i++) {
    const bloc = document.getElementById(`gerer-chambre-${i}`);
    if (bloc) bloc.style.display = 'none';
  }
  
  // Afficher les chambres existantes
  rooms.forEach((room, index) => {
    const bloc = document.getElementById(`gerer-chambre-${index + 1}`);
    if (!bloc) return;
    
    bloc.style.display = 'flex';
    
    // Image (remplir seulement si verified ou published)
    const imageEl = document.getElementById(`image-chambres-gerer-${index + 1}`);
    if (imageEl) {
      const status = this.getPropertyStatus(property);
      if ((status === 'verified' || status === 'published') && room.photos && room.photos.length > 0) {
        const photoUrl = typeof room.photos[0] === 'object' ? room.photos[0].url : room.photos[0];
        if (photoUrl) {
          if (imageEl.tagName === 'IMG') {
            imageEl.src = photoUrl;
          } else {
            imageEl.style.backgroundImage = `url(${photoUrl})`;
            imageEl.style.backgroundSize = 'cover';
            imageEl.style.backgroundPosition = 'center';
          }
        }
      }
    }
    
    // Nom
    const nameEl = document.getElementById(`nom-chambre-${index + 1}`);
    if (nameEl) nameEl.textContent = room.name || 'Chambre';
    
    // Nombre de voyageurs
    const voyageursEl = document.getElementById(`nombre-voyageurs-${index + 1}`);
    if (voyageursEl) {
      const match = (room.taille_chambre || '').match(/^(\d+)/);
      const voyageurs = match ? match[1] : '0';
      voyageursEl.textContent = `${voyageurs} voyageur${parseInt(voyageurs) > 1 ? 's' : ''}`;
    }
    
    // Bouton modifier — cloner pour éviter doublons de listeners
    const editBtn = document.getElementById(`edit-${index + 1}`);
    if (editBtn) {
      const newEditBtn = editBtn.cloneNode(true);
      editBtn.parentNode.replaceChild(newEditBtn, editBtn);
      
      newEditBtn.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = `/mon-espace/modification-logement?id=${property.webflow_item_id}&room=${room.id}`;
      });
    }
    
    // Bouton supprimer
    const deleteBtn = document.getElementById(`delete-${index + 1}`);
    if (deleteBtn) {
      const newDeleteBtn = deleteBtn.cloneNode(true);
      deleteBtn.parentNode.replaceChild(newDeleteBtn, deleteBtn);
      
      // Masquer si une seule chambre (règle minimum 1)
      if (rooms.length <= 1) {
        newDeleteBtn.style.display = 'none';
      } else {
        newDeleteBtn.style.display = 'flex';
        newDeleteBtn.addEventListener('click', async (e) => {
          e.preventDefault();
          await this.deleteRoom(room.id, property);
        });
      }
    }
  });
  
  // Bouton ajouter dans la modale de gestion
  const addBtn = document.getElementById('button-add-gerer-chambre');
  if (addBtn) {
    addBtn.style.display = rooms.length < 5 ? 'flex' : 'none';
    
    const newAddBtn = addBtn.cloneNode(true);
    addBtn.parentNode.replaceChild(newAddBtn, addBtn);
    
    newAddBtn.addEventListener('click', (e) => {
      e.preventDefault();
      this.closeManageRoomsModal();
      this.openAddRoomModal(property);
    });
  }
  
  // Afficher la modale (réinitialiser les styles Webflow)
  const modal = document.getElementById('modal-edit-chambres');
  if (modal) {
    modal.style.display = 'flex';
    modal.style.opacity = '1';
    const innerBloc = modal.querySelector('.bloc-popup');
    if (innerBloc) {
      innerBloc.style.opacity = '1';
      innerBloc.style.transform = 'translate3d(0px, 0px, 0px) scale3d(1, 1, 1) rotateX(0deg) rotateY(0deg) rotateZ(0deg) skew(0deg, 0deg)';
    }
  }
}

async deleteRoom(roomId, property) {
  if (!confirm('Êtes-vous sûr de vouloir supprimer cette chambre ?')) return;
  
  try {
    const response = await fetch(`${window.CONFIG.API_URL}/delete-room/${roomId}`, {
      method: 'DELETE'
    });
    
    const result = await response.json();
    
    if (response.ok && result.success) {
      if (property.rooms) {
        property.rooms = property.rooms.filter(r => r.id !== roomId);
      }
      
      this.closeManageRoomsModal();
      await this.reload();
    } else {
      alert(result.error || 'Erreur lors de la suppression');
    }
  } catch (error) {
    console.error('❌ Erreur suppression chambre:', error);
    alert('Erreur lors de la suppression');
  }
}

setupAddRoomSubmit() {
  const submitBtn = document.getElementById('chambre-creation');
  if (!submitBtn) return;
  
  const newBtn = submitBtn.cloneNode(true);
  submitBtn.parentNode.replaceChild(newBtn, submitBtn);
  
  newBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    
    const property = this._currentPropertyForRoom;
    if (!property) {
      console.error('Aucune propriété sélectionnée');
      return;
    }
    
    const nameInput = document.getElementById('nom-chambre');
    const voyageursInput = document.getElementById('voyageurs-input');
    
    const name = nameInput?.value?.trim();
    const voyageursMax = parseInt(voyageursInput?.value) || 1;
    
    if (!name) {
      alert('Le nom de la chambre est obligatoire');
      return;
    }
    
    newBtn.disabled = true;
    const originalText = newBtn.textContent;
    newBtn.textContent = 'Création...';
    
    try {
      const response = await fetch(`${window.CONFIG.API_URL}/create-room`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name,
          voyageursMax: voyageursMax,
          parentPropertyId: property.webflow_item_id
        })
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        this.closeAddRoomModal();
        
        await this.reload();
      } else {
        alert(result.error || 'Erreur lors de la création');
      }
    } catch (error) {
      console.error('❌ Erreur création chambre:', error);
      alert('Erreur lors de la création');
    } finally {
      newBtn.disabled = false;
      newBtn.textContent = originalText;
    }
  });
}

closeAddRoomModal() {
  const modal = document.getElementById('modal-add-chambres');
  if (modal) {
    modal.style.display = 'none';
  }
  // Réinitialiser les champs
  const nameInput = document.getElementById('nom-chambre');
  const voyageursInput = document.getElementById('voyageurs-input');
  if (nameInput) nameInput.value = '';
  if (voyageursInput) voyageursInput.value = '';
}

closeManageRoomsModal() {
  const modal = document.getElementById('modal-edit-chambres');
  if (modal) {
    modal.style.display = 'none';
  }
}
  
  // Vérifier le retour de paiement
checkPaymentSuccess() {
  const urlParams = new URLSearchParams(window.location.search);
  
  if (urlParams.get('success') !== 'true') return;
  
  
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

// 🆕 NOUVELLE MÉTHODE : Vérifier si on doit ouvrir la popup
checkPopupTrigger() {
  const urlParams = new URLSearchParams(window.location.search);
  
  if (urlParams.get('popup') === 'true') {
    
    // Attendre que Webflow Interactions soit prêt
    setTimeout(() => {
      const bouton = document.getElementById('empty-button');
      if (bouton) {
        bouton.click();
        // Pas de nettoyage URL - elle se nettoiera après création
      } else {
        console.error('❌ Bouton empty-button non trouvé');
      }
    }, 500); // Délai pour laisser Webflow initialiser ses interactions
  }
}
  
  showEmptyState() {
    
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

  updateButtonsVisibility(newestProperty) {
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
    
    
    // Récupérer le mode de location sélectionné
    const selectedModeLocation = document.querySelector('input[name="mode-location-creation"]:checked');
    const modeLocation = selectedModeLocation ? selectedModeLocation.value : 'Logement entier';
    
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
          memberId: this.currentUser.id,
          modeLocation: modeLocation
        })
      });
      
      if (response.ok) {
      window.location.href = window.location.pathname;
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
