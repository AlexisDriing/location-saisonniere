// LOG production V1.75 - chambres d'hôtes v1.065
// Gestionnaire de la page de modification de logement
class PropertyEditor {

  // Helpers statiques pour parser/construire taille_chambre
  static parseTailleChambre(taille) {
    const voyageursMatch = (taille || '').match(/^(\d+)/);
    const litsMatch = (taille || '').match(/(\d+)\s*lit/);
    const tailleMatch = (taille || '').match(/(\d+)\s*m²/);
    return {
      voyageurs: voyageursMatch ? voyageursMatch[1] : '0',
      lits: litsMatch ? litsMatch[1] : '0',
      tailleM2: tailleMatch ? tailleMatch[1] : '0'
    };
  }

  static buildTailleChambre(voyageurs, lits, tailleM2) {
    const v = parseInt(voyageurs) || 0;
    const l = parseInt(lits) || 0;
    return `${v} voyageur${v > 1 ? 's' : ''} - ${l} lit${l > 1 ? 's' : ''} - ${tailleM2 || 0} m²`;
  }

  // Mapping unique des équipements chambre
  static ROOM_EQUIPEMENTS_MAPPING = {
    'Climatisation': 'checkbox-climatisation-chambre',
    'Télévision': 'checkbox-television',
    'Bureau': 'checkbox-bureau',
    'Salle de bain privée': 'checkbox-salle-de-bain-privee',
    'Toilettes privées': 'checkbox-toilettes-prive',
    'Wifi': 'checkbox-wifi-chambre',
    'Balcon': 'checkbox-balcon',
    'Micro-ondes': 'checkbox-micro-ondes',
    'Sèche cheveux': 'checkbox-seche-cheveux',
    'Machine à café': 'checkbox-machine-cafe'
  };

  constructor() {
    this.propertyId = null;
    this.propertyData = null;
    this.initialValues = {};
    this.editingSeasonIndex = null;
    this.originalImagesGallery = [];
    this.currentImagesGallery = [];
    this.sortableInstance = null;
    this.roomData = null;
    this.roomOriginalPhotos = [];
    this.roomCurrentPhotos = [];
    this.roomSortableInstance = null;
        this.editingRoomSeasonIndex = null;
    this.roomsCount = 0;

    this.icalUrls = []; // Stockage des URLs iCal
    this.DEFAULT_ICAL_URL = 'https://calendar.google.com/calendar/ical/c_20c899760ed3ef0d0fb0db69c71909b19c0584bbbdf32e9714b224fc005ae2c0%40group.calendar.google.com/public/basic.ics';
    this.icalFieldMapping = [
    'url-calendrier',    // Position 0 → Premier iCal
    'ical-booking',      // Position 1 → Deuxième iCal
    'ical-autres',       // Position 2 → Troisième iCal
    'ical-abritel'       // Position 3 → Quatrième iCal
  ];
    // Mapping iCal chambre (noms des champs CMS)
    this.roomIcalFieldMapping = ['ical-1', 'ical-2', 'ical-3', 'ical-4'];
    this.extras = [];
    this.init();
  }

  // 📍 À AJOUTER après constructor() et avant init()
  showNotification(type, message) {
    // Sélectionner le bon bloc
    const notificationId = type === 'success' ? 'notification-success' : 'notification-error';
    const textId = type === 'success' ? 'success-message-text' : 'error-message-text';
    
    const notification = document.getElementById(notificationId);
    const textElement = document.getElementById(textId);
    
    if (!notification || !textElement) {
      // Fallback si les éléments n'existent pas
      alert(message);
      return;
    }
    
    // Mettre à jour le texte
    textElement.textContent = message;
    
    // Afficher la notification
    notification.style.display = 'flex';
    notification.classList.add('show');
    
    // Fermeture automatique après 3 secondes
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => {
        notification.style.display = 'none';
      }, 300); // Délai pour l'animation de sortie
    }, 3000);
  }
  
  async init() {
    
    // 1. Récupérer l'ID depuis l'URL
  this.propertyId = this.getPropertyIdFromUrl();
  this.roomId = this.getRoomIdFromUrl();
  this.isRoomEdit = !!this.roomId;
  
  if (!this.propertyId) {
    console.error('❌ Aucun ID de logement dans l\'URL');
    return;
  }
  
  
  // 2. Charger les données du logement
  await this.loadPropertyData();
  
  if (this.propertyData) {
    this.setupTabsDisplay();
    
    if (this.isRoomEdit) {
      await this.loadRoomData();
    } else {
      this.loadPricingData();
      this.prefillForm();
      this.setupSaveButton();
      this.setupTallyButton();
      
      // Adapter l'affichage si logement parent chambre d'hôtes
      const isChambreHote = (this.propertyData.mode_location || '') === "Chambre d'hôtes";
      
      if (isChambreHote) {
        await this.setupParentChambreHoteDisplay();
      } else {

        this.initSeasonManagement();
        this.initDiscountManagement();
        this.initIcalManagement();
        this.initExtrasManagement();
        this.initImageManagement();
        this.updatePlatformBlocksVisibility();
      }
    }
  }
  this.validationManager = new ValidationManager(this);
  
  // Vérifier l'iCal par défaut (après init du validationManager)
  if (this.isRoomEdit) {
    this.checkDefaultRoomIcalWarning();
  } else {
    this.checkDefaultIcalWarning();
  }
  
  // 🆕 Validation silencieuse au chargement pour afficher les pastilles
  // d'erreur sur les onglets et les champs (même timing que checkDefaultIcalWarning)
  if (!this.isRoomEdit) {
    this.validationManager.validateAllFields();
  }
    
  window.propertyEditor = this;
}

  getPropertyIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
  }

  getRoomIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('room');
  }

  setupTabsDisplay() {
  const modeLocation = this.propertyData.mode_location || '';
  const isChambreHote = modeLocation === "Chambre d'hôtes";
  
  // Tag chambres d'hôtes
  const tagChambres = document.getElementById('tag-chambres');
  if (tagChambres) {
    tagChambres.style.display = isChambreHote ? 'flex' : 'none';
  }
  
  // Gestion des tabs
  const tabsLogement = document.getElementById('tabs-logement-entier');
  const tabsChambres = document.getElementById('tabs-chambres-hotes');
  
  if (this.isRoomEdit) {
    if (tabsLogement) tabsLogement.style.display = 'none';
    if (tabsChambres) tabsChambres.style.display = 'flex';
  } else {
    if (tabsLogement) tabsLogement.style.display = 'flex';
    if (tabsChambres) tabsChambres.style.display = 'none';
  }
}

async setupParentChambreHoteDisplay() {
  // 1. Masquer la tab 3 (tarification)
  const tabTarification = document.getElementById('tab-tarification');
  if (tabTarification) tabTarification.style.display = 'none';
  
  // 2. Masquer le bloc taille maison
  const blocTailleMaison = document.getElementById('bloc-taille-maison');
  if (blocTailleMaison) blocTailleMaison.style.display = 'none';
  
  // 3. Afficher le bloc liens plateformes
  const blocLiens = document.getElementById('bloc-liens-plateformes');
  if (blocLiens) blocLiens.style.display = 'block';
  
  // 4. Pré-remplir les liens plateformes
  this.prefillLiensPlateformes();
  
  // 5. Configurer les listeners des liens
  this.setupLiensPlateformesListeners();
  
  // 6. Initialiser les formatters (heures, suffixes €/%)
  this.initFormFormatters();
  
  // 7. Initialiser les éléments communs (images, extras, etc.)
  this.initImageManagement();
  this.initExtrasManagement();

  
  // 7. Charger le nombre de chambres pour le calcul du statut au save
  try {
    const response = await fetch(`${window.CONFIG.API_URL}/property-rooms/${this.propertyId}`);
    if (response.ok) {
      const data = await response.json();
      this.roomsCount = (data.rooms || []).length;
    }
  } catch (error) {
    console.error('⚠️ Erreur chargement nombre chambres:', error);
  }
}

prefillLiensPlateformes() {
  const liens = {
    'lien-airbnb-input': this.propertyData.annonce_airbnb || '',
    'lien-booking-input': this.propertyData.annonce_booking || '',
    'lien-autre-input': this.propertyData.annonce_gites || ''
  };
  
  Object.entries(liens).forEach(([id, value]) => {
    const input = document.getElementById(id);
    if (input) {
      input.value = value;
      this.initialValues[`lien_${id}`] = value;
    }
  });
}

setupLiensPlateformesListeners() {
  ['lien-airbnb-input', 'lien-booking-input', 'lien-autre-input'].forEach(id => {
    const input = document.getElementById(id);
    if (input) {
      input.addEventListener('input', () => {
        this.enableButtons();
      });
    }
  });
}
  
async loadRoomData() {
  if (!this.roomId) return;
  
  try {
    const response = await fetch(`${window.CONFIG.API_URL}/property-rooms/${this.propertyId}`);
    if (!response.ok) throw new Error(`Erreur: ${response.status}`);
    
    const data = await response.json();
    const rooms = data.rooms || [];
    
    // Stocker les liens plateformes du parent
    this.parentPlatformLinks = data.parentPlatformLinks || {};
    
    this.roomData = rooms.find(r => r.id === this.roomId);
    
    if (!this.roomData) {
      console.error('❌ Chambre non trouvée:', this.roomId);
      return;
    }
    
    console.log('✅ Données chambre chargées:', this.roomData.name);
    
    // Titre
    const titleElement = document.getElementById('logement-name-edit');
    if (titleElement) titleElement.textContent = this.roomData.name;
    
    // Pré-remplir les champs
    this.prefillRoomFields();
    
    // Afficher les photos
    this.initRoomImageManagement();
    
    // Configurer la sauvegarde
    this.setupRoomSaveButton();
    
    // Initialiser la tarification
    this.initRoomPricing();
    
    // Initialiser les iCal
    this.initRoomIcalManagement();
    
    // Initialiser les saisons
    this.initRoomSeasonManagement();
    
    // Afficher les blocs plateformes selon les liens du parent
    this.updateRoomPlatformBlocksVisibility();
    
  } catch (error) {
    console.error('❌ Erreur chargement chambre:', error);
  }
}

prefillRoomFields() {
  if (!this.roomData) return;
  
  // Nom
  const nameInput = document.getElementById('name-input-chambre');
  if (nameInput) {
    nameInput.value = this.roomData.name || '';
    this.initialValues.room_name = this.roomData.name || '';
  }
  
  // Parser taille via helper
  const parsed = PropertyEditor.parseTailleChambre(this.roomData.taille_chambre);
  
  const voyageursInput = document.getElementById('voyageurs-input-chambre');
  if (voyageursInput) {
    voyageursInput.value = parsed.voyageurs;
    this.initialValues.room_voyageurs = parsed.voyageurs;
  }
  
  const litsInput = document.getElementById('lits-input-chambre');
  if (litsInput) {
    litsInput.value = parsed.lits;
    this.initialValues.room_lits = parsed.lits;
  }
  
  const tailleInput = document.getElementById('taille-chambre');
  if (tailleInput) {
    tailleInput.value = parsed.tailleM2;
    this.initialValues.room_taille_m2 = parsed.tailleM2;
  }
  
  // Description
  const descInput = document.getElementById('texte-chambre');
  if (descInput) {
    descInput.value = this.roomData.description || '';
    this.initialValues.room_description = this.roomData.description || '';
  }
  
  // Équipements
  this.prefillRoomEquipements();
  
  // Sauvegarder taille initiale
  this.initialValues.room_taille_chambre = this.roomData.taille_chambre || '';
  
  // Détails des lits
  this.initialValues.room_details_lits = this.roomData.details_lits || '';
  
  // Listeners
  this.setupRoomFieldListeners();
  
  // Détails des lits (après les listeners)
  this.initLitsDetails();
}

prefillRoomEquipements() {
  const equipementsStr = this.roomData?.equipements || '';
  const equipementsArray = equipementsStr ? equipementsStr.split(',').map(e => e.trim()) : [];
  
  Object.entries(PropertyEditor.ROOM_EQUIPEMENTS_MAPPING).forEach(([value, id]) => {
    const checkbox = document.getElementById(id);
    if (checkbox) {
      checkbox.checked = equipementsArray.includes(value);
      const checkboxDiv = checkbox.previousElementSibling;
      if (checkboxDiv && checkboxDiv.classList.contains('w-checkbox-input')) {
        if (checkbox.checked) {
          checkboxDiv.classList.add('w--redirected-checked');
        } else {
          checkboxDiv.classList.remove('w--redirected-checked');
        }
      }
    }
  });
  
  this.initialValues.room_equipements = equipementsArray;
}

// ================================
// 📷 GESTION DES PHOTOS CHAMBRE
// ================================

initRoomImageManagement() {
  this.roomOriginalPhotos = JSON.parse(JSON.stringify(this.roomData.photos || []));
  this.roomCurrentPhotos = JSON.parse(JSON.stringify(this.roomData.photos || []));
  this.initialValues.room_photos = JSON.parse(JSON.stringify(this.roomOriginalPhotos));
  
  this.displayRoomEditableGallery();
  
    // SortableJS sur desktop
  if (window.innerWidth > 768) {
    setTimeout(() => this.initRoomSortable(), 100);
  }
  
    // Bouton ajout photos (upload custom)
  const addPhotosButton = document.querySelector('.add-photos.chambre');
  if (addPhotosButton) {
    const newButton = addPhotosButton.cloneNode(true);
    addPhotosButton.parentNode.replaceChild(newButton, addPhotosButton);
    
    newButton.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (this.roomCurrentPhotos.length >= 5) {
        this.showNotification('error', 'Limite de 5 photos maximum atteinte');
      } else {
        this.handlePhotoSelection('chambre');
      }
    });
  }
  
  this.updateRoomAddPhotosButtonState();
  
  // Bloc published
  const blocPublished = document.getElementById('bloc-photos-chambre-published');
  if (blocPublished) {
    const status = this.propertyData.verification_status || 'pending-none';
    const hasPhotos = this.roomCurrentPhotos && this.roomCurrentPhotos.length > 0;
    blocPublished.style.display = (status === 'published' && !hasPhotos) ? 'flex' : 'none';
  }
}

initRoomSortable() {
  const container = document.querySelector('.images-grid.chambre');
  if (!container || this.roomCurrentPhotos.length === 0) return;
  
  if (this.roomSortableInstance) {
    this.roomSortableInstance.destroy();
  }
  
  this.roomSortableInstance = new Sortable(container, {
    animation: 150,
    ghostClass: 'sortable-ghost',
    filter: '.button-delete-photo',
    onEnd: (evt) => {
      const movedItem = this.roomCurrentPhotos.splice(evt.oldIndex, 1)[0];
      this.roomCurrentPhotos.splice(evt.newIndex, 0, movedItem);
      this.enableButtons();
    }
  });
}

displayRoomEditableGallery() {
  const blocPhotos = document.getElementById('bloc-photos-logement-chambre');
  
  if (!Array.isArray(this.roomCurrentPhotos) || this.roomCurrentPhotos.length === 0) {
    if (blocPhotos) blocPhotos.style.display = 'none';
    return;
  } else {
    if (blocPhotos) blocPhotos.style.display = 'block';
  }
  
  // Masquer tous les blocs
  for (let i = 1; i <= 5; i++) {
    const imageBlock = document.getElementById(`image-block-${i}-chambre`);
    if (imageBlock) {
      imageBlock.style.display = 'none';
      const oldBtn = imageBlock.querySelector('.button-delete-photo');
      if (oldBtn) oldBtn.remove();
    }
  }
  
  const maxImages = Math.min(this.roomCurrentPhotos.length, 5);
  
  for (let i = 0; i < maxImages; i++) {
    const imageData = this.roomCurrentPhotos[i];
    const imageBlock = document.getElementById(`image-block-${i + 1}-chambre`);
    
    if (imageBlock && imageData) {
      let imageUrl = null;
      if (typeof imageData === 'object' && imageData.url) {
        imageUrl = imageData.url;
      } else if (typeof imageData === 'string') {
        imageUrl = imageData;
      }
      
      if (imageUrl) {
        const imgElement = imageBlock.querySelector('img');
        if (imgElement) {
          imgElement.src = imageUrl;
          imgElement.alt = `Image chambre ${i + 1}`;
        }
        
        this.addRoomDeleteButton(imageBlock, i);
        imageBlock.style.cursor = 'move';
        imageBlock.classList.add('sortable-item');
        imageBlock.style.display = 'block';
      }
    }
  }
}

addRoomDeleteButton(imageBlock, index) {
  let deleteBtn = imageBlock.querySelector('.button-delete-photo');
  
  if (!deleteBtn) {
    const template = document.getElementById('template-delete-button');
    if (template) {
      deleteBtn = template.cloneNode(true);
      deleteBtn.style.display = 'block';
      deleteBtn.id = '';
      deleteBtn.style.position = 'absolute';
      deleteBtn.style.top = '8px';
      deleteBtn.style.right = '8px';
      deleteBtn.style.zIndex = '20';
      imageBlock.style.position = 'relative';
      imageBlock.appendChild(deleteBtn);
    } else {
      return;
    }
  }
  
  deleteBtn.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    this.removeRoomImage(index);
  };
}

removeRoomImage(index) {
  const imageBlock = document.getElementById(`image-block-${index + 1}-chambre`);
  if (!imageBlock) return;
  
  const imgElement = imageBlock.querySelector('img');
  if (!imgElement) return;
  
  const imageUrl = imgElement.src;
  
  const realIndex = this.roomCurrentPhotos.findIndex(img => {
    if (typeof img === 'string') return img === imageUrl;
    if (img && img.url) return img.url === imageUrl;
    return false;
  });
  
  if (realIndex === -1) {
    console.error('❌ Image non trouvée dans le tableau');
    return;
  }
  
  // Pas de minimum pour les chambres (on peut avoir 0 photos)
  this.roomCurrentPhotos.splice(realIndex, 1);
  
  this.displayRoomEditableGallery();
  this.initRoomSortable();
  this.updateRoomAddPhotosButtonState();
  this.enableButtons();
}

updateRoomAddPhotosButtonState() {
  const addPhotosButton = document.querySelector('.add-photos.chambre');
  if (!addPhotosButton) return;
  
  if (this.roomCurrentPhotos.length >= 5) {
    addPhotosButton.style.opacity = '0.5';
    addPhotosButton.style.cursor = 'not-allowed';
  } else {
    addPhotosButton.style.opacity = '1';
    addPhotosButton.style.cursor = 'pointer';
  }
}

// ================================
// 📸 UPLOAD PHOTOS CUSTOM (remplace Tally)
// ================================

ensureSkeletonStyles() {
  if (document.getElementById('photo-upload-skeleton-styles')) return;
  const style = document.createElement('style');
  style.id = 'photo-upload-skeleton-styles';
  style.textContent = `
    @keyframes photoSkeletonPulse {
      0%, 100% { background-color: #d0d0d0; }
      50%     { background-color: #eaeaea; }
    }
    .image-block.is-loading-photo {
      animation: photoSkeletonPulse 1.3s infinite ease-in-out;
      border-radius: 8px;
      overflow: hidden;
    }
    .image-block.is-loading-photo img {
      opacity: 0 !important;
    }
    .image-block.is-loading-photo .button-delete-photo {
      display: none !important;
    }
  `;
  document.head.appendChild(style);
}

applyLoadingStateToBlocks(isRoom, startIdx, count) {
  for (let i = 0; i < count; i++) {
    const idx = startIdx + i + 1;
    const selector = isRoom ? `#image-block-${idx}-chambre` : `#image-block-${idx}`;
    const block = document.querySelector(selector);
    if (block) block.classList.add('is-loading-photo');
  }
}

async loadImageCompressionLib() {
  if (window.imageCompression) return;
  if (this._compressionLibPromise) return this._compressionLibPromise;
  this._compressionLibPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/browser-image-compression@2.0.2/dist/browser-image-compression.js';
    script.onload = resolve;
    script.onerror = () => {
      this._compressionLibPromise = null;
      reject(new Error('Impossible de charger la librairie de compression'));
    };
    document.head.appendChild(script);
  });
  return this._compressionLibPromise;
}

async compressImage(file) {
  const baseOptions = {
    maxSizeMB: 0.08,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
    initialQuality: 0.8
  };
  try {
    const avif = await window.imageCompression(file, { ...baseOptions, fileType: 'image/avif' });
    if (avif && avif.type === 'image/avif') return avif;
  } catch (e) {
    console.warn('Encodage AVIF indisponible, bascule en WebP :', e.message);
  }
  return await window.imageCompression(file, { ...baseOptions, fileType: 'image/webp' });
}

fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async handlePhotoSelection(type) {
  const isRoom = type === 'chambre';
  const max = isRoom ? 5 : 20;
  const gallery = isRoom ? this.roomCurrentPhotos : this.currentImagesGallery;
  const available = max - gallery.length;

  if (available <= 0) {
    this.showNotification('error', `Limite de ${max} photos atteinte. Supprimez-en avant d'ajouter.`);
    return;
  }

  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/jpeg,image/png,image/webp';
  input.multiple = true;
  input.style.display = 'none';
  document.body.appendChild(input);

  input.addEventListener('change', async (e) => {
    const files = Array.from(e.target.files || []);
    document.body.removeChild(input);
    if (files.length === 0) return;

    if (files.length > available) {
      this.showNotification('error',
        `Vous pouvez ajouter ${available} photo(s) maximum. Vous en avez sélectionné ${files.length}. Veuillez réessayer.`);
      return;
    }

    try {
      this.ensureSkeletonStyles();
      await this.loadImageCompressionLib();

      // Phase 1 — Insérer N squelettes dans la galerie
      const SKELETON_SRC = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>';
      const startIdx = gallery.length;
      for (let i = 0; i < files.length; i++) {
        gallery.push({
          url: SKELETON_SRC,
          _staged: true,
          _loading: true,
          _fileName: files[i].name
        });
      }

      // Rendu initial avec squelettes
      if (isRoom) {
        this.displayRoomEditableGallery();
        if (window.innerWidth > 768) this.initRoomSortable();
        this.updateRoomAddPhotosButtonState();
      } else {
        this.displayEditableGallery();
        if (window.innerWidth > 768) this.initSortable();
        this.updateAddPhotosButtonState();
      }
      this.applyLoadingStateToBlocks(isRoom, startIdx, files.length);

      // Phase 2 — Compresser chaque fichier et remplacer le squelette correspondant
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const compressed = await this.compressImage(file);
        const ext = compressed.type === 'image/avif' ? 'avif' : 'webp';
        const baseName = file.name.replace(/\.[^.]+$/, '') || 'photo';
        const blobUrl = URL.createObjectURL(compressed);

        gallery[startIdx + i] = {
          url: blobUrl,
          _staged: true,
          _file: compressed,
          _fileName: `${baseName}.${ext}`
        };

        // Mise à jour directe du DOM pour un feedback immédiat
        const selector = isRoom
          ? `#image-block-${startIdx + i + 1}-chambre`
          : `#image-block-${startIdx + i + 1}`;
        const block = document.querySelector(selector);
        if (block) {
          const imgEl = block.querySelector('img');
          if (imgEl) imgEl.src = blobUrl;
          block.classList.remove('is-loading-photo');
        }
      }

      this.enableButtons();
      this.showNotification('success', `${files.length} photo(s) ajoutée(s). Cliquez sur Enregistrer pour valider.`);
    } catch (err) {
      console.error('Erreur sélection photos :', err);
      this.showNotification('error', 'Erreur : ' + err.message);
    }
  });

  input.click();
}

async uploadStagedPhotos(gallery, type) {
  const stagedIndices = [];
  const stagedFiles = [];
  for (let i = 0; i < gallery.length; i++) {
    if (gallery[i]._staged) {
      stagedIndices.push(i);
      stagedFiles.push(gallery[i]);
    }
  }
  if (stagedIndices.length === 0) return;

  const payload = {
    photos: await Promise.all(stagedFiles.map(async entry => ({
      fileName: entry._fileName,
      dataBase64: await this.fileToBase64(entry._file),
      mimeType: entry._file.type || 'image/avif'
    })))
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120000);

  let result;
  try {
    const response = await fetch(`${window.CONFIG.API_URL}/stage-photos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.error || 'Erreur serveur lors du staging');
    }
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('Upload trop long (timeout 2 min). Vérifiez votre connexion.');
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!Array.isArray(result.tempUrls) || result.tempUrls.length !== stagedIndices.length) {
    throw new Error('Réponse serveur incohérente (nombre d\'URLs incorrect)');
  }

  // Remplacer les entrées staged par les URLs temp et révoquer les blob URLs
  for (let i = 0; i < stagedIndices.length; i++) {
    const idx = stagedIndices[i];
    if (gallery[idx].url?.startsWith('blob:')) {
      URL.revokeObjectURL(gallery[idx].url);
    }
    gallery[idx] = { url: result.tempUrls[i] };
  }

    // 🔧 Fix du bug delete : re-render pour synchroniser DOM et tableau
  if (type === 'chambre') {
    this.displayRoomEditableGallery();
    if (window.innerWidth > 768) this.initRoomSortable();
  } else {
    this.displayEditableGallery();
    if (window.innerWidth > 768) this.initSortable();
  }
}

// ================================
// 👤 UPLOAD PHOTO DE PROFIL (une seule photo)
// ================================

setupHostPhotoButton() {
  // 2 boutons possibles : "Ajouter" (si pas de photo) et "Modifier" (si photo présente)
  ['button-add-host-photo', 'button-change-host-photo'].forEach(buttonId => {
    const button = document.getElementById(buttonId);
    if (!button) return;
    
    // Cloner pour retirer tout ancien listener
    const newButton = button.cloneNode(true);
    button.parentNode.replaceChild(newButton, button);
    
    newButton.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.handleProfilePhotoSelection();
    });
  });
}

async handleProfilePhotoSelection() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/jpeg,image/png,image/webp';
  input.style.display = 'none';
  document.body.appendChild(input);
  
  input.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    document.body.removeChild(input);
    if (!file) return;
    
    try {
      await this.loadImageCompressionLib();
      this.showNotification('success', 'Compression de la photo...');
      
      const compressed = await this.compressImage(file);
      const ext = compressed.type === 'image/avif' ? 'avif' : 'webp';
      const baseName = file.name.replace(/\.[^.]+$/, '') || 'photo-profil';
      const blobUrl = URL.createObjectURL(compressed);
      
      // Révoquer l'ancien blob URL éventuel
      if (this.stagedHostImage?.url?.startsWith('blob:')) {
        URL.revokeObjectURL(this.stagedHostImage.url);
      }
      
      // Stage la nouvelle photo
      this.stagedHostImage = {
        url: blobUrl,
        _staged: true,
        _file: compressed,
        _fileName: `${baseName}.${ext}`
      };
      
      // Mise à jour immédiate de l'aperçu dans le DOM
      const imageHoteElement = document.getElementById('image-hote');
      if (imageHoteElement) {
        if (imageHoteElement.tagName === 'IMG') {
          imageHoteElement.src = blobUrl;
        } else {
          const imgEl = imageHoteElement.querySelector('img');
          if (imgEl) imgEl.src = blobUrl;
        }
      }
      
      this.enableButtons();
      this.showNotification('success', 'Photo de profil prête. Cliquez sur Enregistrer pour valider.');
    } catch (err) {
      console.error('Erreur photo profil :', err);
      this.showNotification('error', 'Erreur : ' + err.message);
    }
  });
  
  input.click();
}

async uploadStagedHostImage() {
  if (!this.stagedHostImage?._staged || !this.stagedHostImage._file) return null;
  
  const payload = {
    photos: [{
      fileName: this.stagedHostImage._fileName,
      dataBase64: await this.fileToBase64(this.stagedHostImage._file),
      mimeType: this.stagedHostImage._file.type || 'image/avif'
    }]
  };
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120000);
  
  let result;
  try {
    const response = await fetch(`${window.CONFIG.API_URL}/stage-photos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.error || 'Erreur serveur');
    }
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('Upload trop long (timeout 2 min)');
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
  
  if (!Array.isArray(result.tempUrls) || result.tempUrls.length !== 1) {
    throw new Error('Réponse serveur incohérente (photo profil)');
  }
  
  if (this.stagedHostImage.url?.startsWith('blob:')) {
    URL.revokeObjectURL(this.stagedHostImage.url);
  }
  
  return result.tempUrls[0];
}

// ================================
// 🛏️ LISTENERS, SAVE, CANCEL CHAMBRE
// ================================

setupRoomFieldListeners() {
  // Champs texte
  const roomFields = [
    'name-input-chambre',
    'voyageurs-input-chambre',
    'lits-input-chambre',
    'taille-chambre',
    'texte-chambre'
  ];
  
  roomFields.forEach(id => {
    const input = document.getElementById(id);
    if (input) {
      input.addEventListener('input', () => this.enableButtons());
    }
  });
  
  // Champs numériques
  ['voyageurs-input-chambre', 'lits-input-chambre', 'taille-chambre', 'default-min-nights-input-chambre', 'season-min-nights-input-chambre', 'season-min-nights-input-edit-chambre'].forEach(id => {
    const input = document.getElementById(id);
    if (input) {
      input.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/\D/g, '');
      });
    }
  });

  
  // Équipements
  Object.values(PropertyEditor.ROOM_EQUIPEMENTS_MAPPING).forEach(id => {
    const checkbox = document.getElementById(id);
    if (checkbox) {
      checkbox.addEventListener('change', () => this.enableButtons());
    }
  });
}

// ================================
// 🛏️ GESTION DES DÉTAILS DE LITS
// ================================

initLitsDetails() {
  // Écouter les changements du nombre de lits
  const litsInput = document.getElementById('lits-input-chambre');
  if (!litsInput) return;
  
  litsInput.addEventListener('input', () => {
    this.updateLitsBlocs();
    this.enableButtons();
  });
  
  // Afficher les blocs existants au chargement
  this.prefillLitsDetails();
}

prefillLitsDetails() {
  const detailsStr = this.roomData?.details_lits || '';
  
  if (!detailsStr) {
    // Pas de détails, juste afficher les blocs vides selon le nombre de lits
    this.updateLitsBlocs();
    return;
  }
  
  // Parser "2 Lit simple, 1 Lit double" → [{type: 'Lit simple', count: 2}, ...]
  const groups = detailsStr.split(',').map(part => part.trim()).filter(Boolean);
  const expandedTypes = [];
  
  groups.forEach(group => {
    const match = group.match(/^(\d+)\s+(.+)$/);
    if (match) {
      const count = parseInt(match[1]);
      const type = match[2].trim();
      for (let i = 0; i < count; i++) {
        expandedTypes.push(type);
      }
    }
  });
  
  // Stocker pour comparaison au save
  this.initialValues.room_details_lits = detailsStr;
  
  // Afficher les blocs et remplir les selects
  this.showLitsBlocs(expandedTypes.length);
  
  expandedTypes.forEach((type, index) => {
    const bloc = this.getLitBloc(index);
    if (bloc) {
      const select = bloc.querySelector('[data-lit="type"]');
      if (select) select.value = type;
    }
  });
}

updateLitsBlocs() {
  const litsInput = document.getElementById('lits-input-chambre');
  const count = parseInt(litsInput?.value) || 0;
  this.showLitsBlocs(count);
}

showLitsBlocs(count) {
  const blocGlobal = document.getElementById('bloc-details-lits');
  
  if (count <= 0) {
    if (blocGlobal) blocGlobal.style.display = 'none';
    // Masquer tous les blocs
    for (let i = 0; i < 10; i++) {
      const bloc = this.getLitBloc(i);
      if (bloc) bloc.style.display = 'none';
    }
    return;
  }
  
  if (blocGlobal) blocGlobal.style.display = 'block';
  
  for (let i = 0; i < 10; i++) {
    const bloc = this.getLitBloc(i);
    if (bloc) {
      if (i < count) {
        bloc.style.display = 'flex';
        // Ajouter listener sur le select si pas déjà fait
        const select = bloc.querySelector('[data-lit="type"]');
        if (select && !select.dataset.listenerAdded) {
          select.addEventListener('change', () => this.enableButtons());
          select.dataset.listenerAdded = 'true';
        }
      } else {
        bloc.style.display = 'none';
        // Réinitialiser le select des blocs masqués
        const select = bloc.querySelector('[data-lit="type"]');
        if (select) select.selectedIndex = 0;
      }
    }
  }
}

getLitBloc(index) {
  if (index === 0) {
    return document.querySelector('.bloc-detail-lit:not(.next)');
  } else {
    const nextBlocs = document.querySelectorAll('.bloc-detail-lit.next');
    return nextBlocs[index - 1] || null;
  }
}

collectLitsDetails() {
  // Collecter tous les types sélectionnés dans les blocs visibles
  const types = [];
  const litsInput = document.getElementById('lits-input-chambre');
  const count = parseInt(litsInput?.value) || 0;
  
  for (let i = 0; i < count; i++) {
    const bloc = this.getLitBloc(i);
    if (bloc && bloc.style.display !== 'none') {
      const select = bloc.querySelector('[data-lit="type"]');
      if (select && select.value) {
        types.push(select.value);
      }
    }
  }
  
  // Regrouper les types identiques : ['Lit simple', 'Lit simple', 'Lit double'] → "2 Lit simple, 1 Lit double"
  const counts = {};
  types.forEach(type => {
    counts[type] = (counts[type] || 0) + 1;
  });
  
  return Object.entries(counts)
    .map(([type, nb]) => `${nb} ${type}`)
    .join(', ');
}

// ================================
// 💰 TARIFICATION CHAMBRE
// ================================

initRoomPricing() {
  this.loadRoomPricingData();
  this.prefillRoomPricing();
  this.prefillRoomWeekend();
  this.initRoomDiscounts();
  this.setupSuffixFormatters();
  this.setupRoomPricingListeners();
  this.setupRoomWeekendListeners();
  setTimeout(() => this.formatRoomPricingFields(), 200);
}

loadRoomPricingData() {
  if (this.roomData.pricing_data) {
    this.roomPricingData = JSON.parse(JSON.stringify(this.roomData.pricing_data));
  } else {
    this.roomPricingData = {
      defaultPricing: {
        mode: 'fixed',
        price: 0,
        minNights: 1,
        pricesPerGuest: []
      },
      seasons: [],
      discounts: [],
      cleaning: { included: true }
    };
  }
}

prefillRoomPricing() {
  const pricing = this.roomPricingData.defaultPricing || {};
  const mode = pricing.mode || 'fixed';
  
  // Radio buttons
  const radioFixe = document.getElementById('radio-prix-fixe-chambre');
  const radioVoyageur = document.getElementById('radio-prix-voyageur-chambre');
  const labelFixe = document.getElementById('label-prix-fixe-chambre');
  const labelVoyageur = document.getElementById('label-prix-voyageur-chambre');
  
  // Reset visuel des radios
  if (labelFixe) labelFixe.querySelector('.w-radio-input')?.classList.remove('w--redirected-checked');
  if (labelVoyageur) labelVoyageur.querySelector('.w-radio-input')?.classList.remove('w--redirected-checked');
  
  // Blocs
  const blocFixe = document.getElementById('bloc-prix-fixe-chambre');
  const blocVoyageur = document.getElementById('bloc-prix-voyageur-chambre');
  
  if (mode === 'per_guest') {
    // Mode prix par voyageur
    if (radioVoyageur) radioVoyageur.checked = true;
    if (radioFixe) radioFixe.checked = false;
    if (labelVoyageur) labelVoyageur.querySelector('.w-radio-input')?.classList.add('w--redirected-checked');
    
    if (blocFixe) blocFixe.style.display = 'none';
    if (blocVoyageur) blocVoyageur.style.display = 'flex';
    
    // Afficher les blocs prix voyageur et remplir les valeurs
    this.displayPricesPerGuest(pricing.pricesPerGuest || []);
    
  } else {
    // Mode prix fixe (par défaut)
    if (radioFixe) radioFixe.checked = true;
    if (radioVoyageur) radioVoyageur.checked = false;
    if (labelFixe) labelFixe.querySelector('.w-radio-input')?.classList.add('w--redirected-checked');
    
    if (blocFixe) blocFixe.style.display = 'block';
    if (blocVoyageur) blocVoyageur.style.display = 'none';
    
    // Remplir le prix fixe
    const priceInput = document.getElementById('default-price-input-chambre');
    if (priceInput) {
      if (pricing.price && pricing.price > 0) {
        priceInput.value = pricing.price;
        priceInput.setAttribute('data-raw-value', pricing.price);
      } else {
        priceInput.value = '';
        priceInput.removeAttribute('data-raw-value');
      }
    }
  }
  
  // Nuits minimum (commun aux deux modes)
  const minNightsInput = document.getElementById('default-min-nights-input-chambre');
  if (minNightsInput) {
    minNightsInput.value = pricing.minNights || 1;
  }
  
  // Sauvegarder les valeurs initiales
  this.initialValues.room_pricing_mode = mode;
  this.initialValues.room_pricing_price = pricing.price || 0;
  this.initialValues.room_pricing_min_nights = pricing.minNights || 1;
  this.initialValues.room_pricing_prices_per_guest = JSON.stringify(pricing.pricesPerGuest || []);
  
  // Prix plateformes
  if (pricing.platformPrices) {
    ['airbnb', 'booking', 'other'].forEach(platform => {
      const input = document.getElementById(`default-${platform}-price-input-chambre`);
      if (input) {
        const value = pricing.platformPrices[platform] || 0;
        if (value > 0) {
          input.value = value;
          input.setAttribute('data-raw-value', value);
        } else {
          input.value = '';
          input.removeAttribute('data-raw-value');
        }
      }
    });
  }
}

displayPricesPerGuest(pricesArray) {
  // Récupérer le nombre de voyageurs depuis l'input
  const voyageursInput = document.getElementById('voyageurs-input-chambre');
  const maxGuests = parseInt(voyageursInput?.value) || 1;
  
  // Afficher/masquer les blocs
  for (let i = 0; i < 10; i++) {
    const bloc = this.getPrixVoyageurBloc(i);
    if (!bloc) continue;
    
    if (i < maxGuests) {
      bloc.style.display = 'flex';
      
      // Remplir le prix si disponible
      const priceInput = bloc.querySelector('[data-prix-voyageur="price"]');
      if (priceInput) {
        const price = (pricesArray && pricesArray[i]) ? pricesArray[i] : 0;
        if (price > 0) {
          priceInput.value = price;
          priceInput.setAttribute('data-raw-value', price);
        } else {
          priceInput.value = '';
          priceInput.removeAttribute('data-raw-value');
        }
        
        // Ajouter listener si pas déjà fait
        if (!priceInput.dataset.listenerAdded) {
          priceInput.addEventListener('input', () => {
            const cleanValue = priceInput.value.replace(/[^\d]/g, '');
            priceInput.setAttribute('data-raw-value', cleanValue || '0');
            this.enableButtons();
          });
          
          priceInput.addEventListener('blur', () => {
            const value = priceInput.value.replace(/[^\d]/g, '');
            if (value) {
              priceInput.setAttribute('data-raw-value', value);
              priceInput.value = value + ' € / nuit';
            } else {
              priceInput.removeAttribute('data-raw-value');
              priceInput.value = '';
            }
          });
          
          priceInput.addEventListener('focus', () => {
            const rawValue = priceInput.getAttribute('data-raw-value');
            if (rawValue) {
              priceInput.value = rawValue;
            } else {
              priceInput.value = priceInput.value.replace(/[^\d]/g, '');
            }
          });
          
          priceInput.dataset.listenerAdded = 'true';
        }
      }
    } else {
      bloc.style.display = 'none';
      // Réinitialiser le prix des blocs masqués
      const priceInput = bloc.querySelector('[data-prix-voyageur="price"]');
      if (priceInput) {
        priceInput.value = '';
        priceInput.removeAttribute('data-raw-value');
      }
    }
  }
}

getPrixVoyageurBloc(index) {
  if (index === 0) {
    return document.querySelector('.bloc-flex-input.tarifs.voyageurs:not(.next):not(.saison)');
  } else {
    const nextBlocs = document.querySelectorAll('.bloc-flex-input.tarifs.voyageurs.next:not(.saison)');
    return nextBlocs[index - 1] || null;
  }
}

collectPricesPerGuest() {
  const voyageursInput = document.getElementById('voyageurs-input-chambre');
  const maxGuests = parseInt(voyageursInput?.value) || 1;
  const prices = [];
  
  for (let i = 0; i < maxGuests; i++) {
    const bloc = this.getPrixVoyageurBloc(i);
    if (bloc && bloc.style.display !== 'none') {
      const priceInput = bloc.querySelector('[data-prix-voyageur="price"]');
      if (priceInput) {
        const rawValue = priceInput.getAttribute('data-raw-value');
        prices.push(parseInt(rawValue) || 0);
      } else {
        prices.push(0);
      }
    }
  }
  
  return prices;
}

setupRoomPricingListeners() {
  // Radio buttons
  const radioFixe = document.getElementById('radio-prix-fixe-chambre');
  const radioVoyageur = document.getElementById('radio-prix-voyageur-chambre');
  const labelFixe = document.getElementById('label-prix-fixe-chambre');
  const labelVoyageur = document.getElementById('label-prix-voyageur-chambre');
  const blocFixe = document.getElementById('bloc-prix-fixe-chambre');
  const blocVoyageur = document.getElementById('bloc-prix-voyageur-chambre');
  
  if (radioFixe) {
    radioFixe.addEventListener('change', () => {
      if (radioFixe.checked) {
        if (labelFixe) labelFixe.querySelector('.w-radio-input')?.classList.add('w--redirected-checked');
        if (labelVoyageur) labelVoyageur.querySelector('.w-radio-input')?.classList.remove('w--redirected-checked');
        if (blocFixe) blocFixe.style.display = 'block';
        if (blocVoyageur) blocVoyageur.style.display = 'none';
        this.enableButtons();
      }
    });
  }
  
  if (radioVoyageur) {
    radioVoyageur.addEventListener('change', () => {
      if (radioVoyageur.checked) {
        if (labelVoyageur) labelVoyageur.querySelector('.w-radio-input')?.classList.add('w--redirected-checked');
        if (labelFixe) labelFixe.querySelector('.w-radio-input')?.classList.remove('w--redirected-checked');
        if (blocVoyageur) blocVoyageur.style.display = 'flex';
        if (blocFixe) blocFixe.style.display = 'none';
        // Afficher les blocs prix voyageur selon le nombre actuel
        this.displayPricesPerGuest(this.roomPricingData?.defaultPricing?.pricesPerGuest || []);
        this.enableButtons();
      }
    });
  }
  
  // Prix fixe
  const priceInput = document.getElementById('default-price-input-chambre');
  if (priceInput) {
    priceInput.addEventListener('input', () => {
      const cleanValue = priceInput.value.replace(/[^\d]/g, '');
      priceInput.setAttribute('data-raw-value', cleanValue || '0');
      this.enableButtons();
    });
  }
  
  // Nuits minimum
  const minNightsInput = document.getElementById('default-min-nights-input-chambre');
  if (minNightsInput) {
    minNightsInput.addEventListener('input', () => {
      this.enableButtons();
    });
  }
  
  // Écouter les changements du nombre de voyageurs pour mettre à jour les blocs prix
  const voyageursInput = document.getElementById('voyageurs-input-chambre');
  if (voyageursInput) {
    // Ajouter un listener SUPPLÉMENTAIRE (celui de base gère déjà enableButtons)
    voyageursInput.addEventListener('input', () => {
      const radioVoyageurEl = document.getElementById('radio-prix-voyageur-chambre');
      if (radioVoyageurEl && radioVoyageurEl.checked) {
        // Recalculer l'affichage des blocs prix voyageur
        this.displayPricesPerGuest(this.collectPricesPerGuest());
      }
    });
  }
  // Prix plateformes chambre
  ['airbnb', 'booking', 'other'].forEach(platform => {
    const input = document.getElementById(`default-${platform}-price-input-chambre`);
    if (input) {
      input.addEventListener('input', () => {
        const cleanValue = input.value.replace(/[^\d]/g, '');
        input.setAttribute('data-raw-value', cleanValue || '0');
        this.enableButtons();
      });
      
      input.addEventListener('blur', () => {
        if (this.validationManager) {
          const directPriceInput = document.getElementById('default-price-input-chambre');
          const radioVoyageur = document.getElementById('radio-prix-voyageur-chambre');
          let directPrice = 0;
          
          if (radioVoyageur && radioVoyageur.checked) {
            // En mode per_guest, le prix de référence est le dernier prix voyageur
            const prices = this.collectPricesPerGuest();
            directPrice = prices.length > 0 ? prices[prices.length - 1] : 0;
          } else {
            directPrice = parseInt(this.getRawValue(directPriceInput)) || 0;
          }
          
          if (directPrice > 0) {
            this.validationManager.validateRoomDefaultPlatformPrices(directPrice);
          }
        }
      });
    }
  });
}

formatRoomPricingFields() {
  // Formater le prix fixe
  const priceInput = document.getElementById('default-price-input-chambre');
  if (priceInput) {
    const value = priceInput.value.replace(/[^\d]/g, '');
    if (value && value !== '0') {
      priceInput.setAttribute('data-raw-value', value);
      priceInput.value = value + ' € / nuit';
    }
  }
  
  // Formater les prix par voyageur
  document.querySelectorAll('[data-prix-voyageur="price"]').forEach(input => {
    const value = input.value.replace(/[^\d]/g, '');
    if (value && value !== '0') {
      input.setAttribute('data-raw-value', value);
      input.value = value + ' € / nuit';
    }
  });
  
  // Formater les prix plateformes chambre
  ['airbnb', 'booking', 'other'].forEach(platform => {
    const input = document.getElementById(`default-${platform}-price-input-chambre`);
    if (input) {
      const value = input.value.replace(/[^\d]/g, '');
      if (value && value !== '0') {
        input.setAttribute('data-raw-value', value);
        input.value = value + ' € / nuit';
      }
    }
  });
}

// ================================
// 🗓️ WEEK-END CHAMBRE
// ================================

prefillRoomWeekend() {
  const yesRadio = document.getElementById('weekend-oui-chambre');
  const noRadio = document.getElementById('weekend-non-chambre');
  const priceInput = document.getElementById('weekend-price-input-chambre');
  const yesLabel = document.getElementById('label-weekend-oui-chambre');
  const noLabel = document.getElementById('label-weekend-non-chambre');
  
  if (!yesRadio || !noRadio || !priceInput) return;
  
  const weekend = this.roomPricingData.defaultPricing?.weekend;
  
  if (weekend && weekend.enabled) {
    yesRadio.checked = true;
    noRadio.checked = false;
    if (yesLabel) yesLabel.querySelector('.w-radio-input')?.classList.add('w--redirected-checked');
    if (noLabel) noLabel.querySelector('.w-radio-input')?.classList.remove('w--redirected-checked');
    
    priceInput.style.display = 'block';
    if (weekend.price && weekend.price > 0) {
      priceInput.value = weekend.price;
      priceInput.setAttribute('data-raw-value', weekend.price);
    } else {
      priceInput.value = '';
      priceInput.removeAttribute('data-raw-value');
    }
  } else {
    yesRadio.checked = false;
    noRadio.checked = true;
    if (yesLabel) yesLabel.querySelector('.w-radio-input')?.classList.remove('w--redirected-checked');
    if (noLabel) noLabel.querySelector('.w-radio-input')?.classList.add('w--redirected-checked');
    
    priceInput.style.display = 'none';
    priceInput.value = '';
  }
  
  this.initialValues.room_weekend_enabled = weekend?.enabled ?? false;
  this.initialValues.room_weekend_price = weekend?.price || 0;
}

setupRoomWeekendListeners() {
  const yesRadio = document.getElementById('weekend-oui-chambre');
  const noRadio = document.getElementById('weekend-non-chambre');
  const yesLabel = document.getElementById('label-weekend-oui-chambre');
  const noLabel = document.getElementById('label-weekend-non-chambre');
  const priceInput = document.getElementById('weekend-price-input-chambre');
  
  if (!yesRadio || !noRadio || !priceInput) return;
  
  yesRadio.addEventListener('change', () => {
    if (yesRadio.checked) {
      if (yesLabel) yesLabel.querySelector('.w-radio-input')?.classList.add('w--redirected-checked');
      if (noLabel) noLabel.querySelector('.w-radio-input')?.classList.remove('w--redirected-checked');
      priceInput.style.display = 'block';
      setTimeout(() => priceInput.focus(), 100);
      
      if (!this.roomPricingData.defaultPricing.weekend) {
        this.roomPricingData.defaultPricing.weekend = {};
      }
      this.roomPricingData.defaultPricing.weekend.enabled = true;
      this.enableButtons();
    }
  });
  
  noRadio.addEventListener('change', () => {
    if (noRadio.checked) {
      if (yesLabel) yesLabel.querySelector('.w-radio-input')?.classList.remove('w--redirected-checked');
      if (noLabel) noLabel.querySelector('.w-radio-input')?.classList.add('w--redirected-checked');
      priceInput.style.display = 'none';
      priceInput.value = '';
      priceInput.removeAttribute('data-raw-value');
      
      if (!this.roomPricingData.defaultPricing.weekend) {
        this.roomPricingData.defaultPricing.weekend = {};
      }
      this.roomPricingData.defaultPricing.weekend.enabled = false;
      this.roomPricingData.defaultPricing.weekend.price = 0;
      this.enableButtons();
    }
  });
  
  priceInput.addEventListener('blur', () => {
    const price = parseInt(this.getRawValue(priceInput)) || 0;
    if (!this.roomPricingData.defaultPricing.weekend) {
      this.roomPricingData.defaultPricing.weekend = {};
    }
    this.roomPricingData.defaultPricing.weekend.price = price;
    this.enableButtons();
  });
}

// ================================
// 🎯 RÉDUCTIONS CHAMBRE
// ================================

initRoomDiscounts() {
  // Masquer tous les blocs réduction chambre au départ
  document.querySelectorAll('.bloc-reduction.chambre').forEach(bloc => {
    bloc.style.display = 'none';
  });
  
  // Bouton ajouter
  const addButton = document.getElementById('button-add-reduction-chambre');
  if (addButton) {
    addButton.addEventListener('click', (e) => {
      e.preventDefault();
      this.addRoomDiscount();
    });
  }
  
  // Initialiser le tableau si absent
  if (!this.roomPricingData.discounts) {
    this.roomPricingData.discounts = [];
  }
  
  // Afficher les réductions existantes
  this.displayRoomDiscounts();
}

displayRoomDiscounts() {
  // Masquer tous les blocs chambre
  document.querySelectorAll('.bloc-reduction.chambre').forEach(bloc => {
    bloc.style.display = 'none';
  });
  
  if (!this.roomPricingData.discounts || this.roomPricingData.discounts.length === 0) {
    return;
  }
  
  this.roomPricingData.discounts.forEach((discount, index) => {
    const blocElement = this.getRoomDiscountBloc(index);
    
    if (blocElement) {
      blocElement.style.display = 'flex';
      
      const nightsInput = blocElement.querySelector('[data-discount="nights"]');
      const percentageInput = blocElement.querySelector('[data-discount="percentage"]');
      
      if (nightsInput) nightsInput.value = discount.nights || '';
      if (percentageInput) percentageInput.value = discount.percentage || '';
      
      this.setupRoomDiscountListeners(blocElement, index);
      
      const deleteButton = blocElement.querySelector('.button-delete-reduction');
      if (deleteButton) {
        deleteButton.onclick = (e) => {
          e.preventDefault();
          this.removeRoomDiscount(index);
        };
      }
    }
  });
  
  this.updateRoomAddDiscountButtonState();
}

getRoomDiscountBloc(index) {
  if (index === 0) {
    return document.querySelector('.bloc-reduction.chambre:not(.next)');
  } else {
    const nextBlocs = document.querySelectorAll('.bloc-reduction.chambre.next');
    return nextBlocs[index - 1] || null;
  }
}

addRoomDiscount() {
  if (this.roomPricingData.discounts.length >= 5) {
    this.showNotification('error', 'Maximum 5 réductions autorisées');
    return;
  }
  
  const newIndex = this.roomPricingData.discounts.length;
  this.roomPricingData.discounts.push({ nights: 0, percentage: 0 });
  
  const blocElement = this.getRoomDiscountBloc(newIndex);
  
  if (blocElement) {
    blocElement.style.display = 'flex';
    
    const nightsInput = blocElement.querySelector('[data-discount="nights"]');
    const percentageInput = blocElement.querySelector('[data-discount="percentage"]');
    
    if (nightsInput) {
      nightsInput.value = '';
      nightsInput.removeAttribute('data-raw-value');
    }
    if (percentageInput) {
      percentageInput.value = '';
      percentageInput.removeAttribute('data-raw-value');
    }
    
    this.setupRoomDiscountListeners(blocElement, newIndex);
    
    const deleteButton = blocElement.querySelector('.button-delete-reduction');
    if (deleteButton) {
      deleteButton.onclick = (e) => {
        e.preventDefault();
        this.removeRoomDiscount(newIndex);
      };
    }
  }
  
  this.updateRoomAddDiscountButtonState();
  this.enableButtons();
}

removeRoomDiscount(index) {
  this.roomPricingData.discounts.splice(index, 1);
  this.displayRoomDiscounts();
  this.enableButtons();
}

setupRoomDiscountListeners(blocElement, index) {
  const nightsInput = blocElement.querySelector('[data-discount="nights"]');
  const percentageInput = blocElement.querySelector('[data-discount="percentage"]');
  
  if (nightsInput) {
    nightsInput.oninput = (e) => {
      e.target.value = e.target.value.replace(/\D/g, '');
      const value = parseInt(e.target.value) || 0;
      this.roomPricingData.discounts[index].nights = value;
      this.enableButtons();
    };
  }

  
  if (percentageInput) {
    percentageInput.oninput = (e) => {
      let value = parseInt(e.target.value.replace(/[^\d]/g, '')) || 0;
      if (value > 100) {
        value = 100;
        e.target.value = '100';
      }
      this.roomPricingData.discounts[index].percentage = value;
      this.enableButtons();
    };
    
    percentageInput.onblur = function() {
      const value = this.value.replace(/[^\d]/g, '');
      if (value) {
        this.value = value + ' %';
      }
    };
    
    percentageInput.onfocus = function() {
      this.value = this.value.replace(/[^\d]/g, '');
    };
  }
}

updateRoomAddDiscountButtonState() {
  const addButton = document.getElementById('button-add-reduction-chambre');
  if (addButton) {
    if (this.roomPricingData.discounts.length >= 5) {
      addButton.disabled = true;
      addButton.style.opacity = '0.5';
      addButton.style.cursor = 'not-allowed';
    } else {
      addButton.disabled = false;
      addButton.style.opacity = '1';
      addButton.style.cursor = 'pointer';
    }
  }
}

// ================================
// 📅 GESTION DES ICAL CHAMBRE
// ================================

initRoomIcalManagement() {
  // Masquer tous les blocs sauf le premier
  for (let i = 2; i <= 4; i++) {
    const bloc = document.getElementById(`ical-${i}-chambre`);
    if (bloc) bloc.style.display = 'none';
  }
  
  // Le premier bloc est toujours visible
  const firstBloc = document.getElementById('ical-1-chambre');
  if (firstBloc) firstBloc.style.display = 'flex';
  
  // Bouton ajouter
  const addButton = document.getElementById('button-add-ical-chambre');
  if (addButton) {
    addButton.addEventListener('click', (e) => {
      e.preventDefault();
      this.addRoomIcal();
    });
  }
  
  // Afficher les iCals existants
  this.displayRoomIcals();
  
  // Vérifier l'iCal par défaut
  this.checkDefaultRoomIcalWarning();
}

displayRoomIcals() {
  // Le premier bloc est TOUJOURS visible
  const firstBloc = document.getElementById('ical-1-chambre');
  if (firstBloc) firstBloc.style.display = 'flex';
  
  // Masquer les blocs 2 à 4
  for (let i = 2; i <= 4; i++) {
    const bloc = document.getElementById(`ical-${i}-chambre`);
    if (bloc) bloc.style.display = 'none';
  }
  
  // Collecter les URLs non vides depuis les données de la chambre
  const icalUrls = this.roomData?.ical_urls || [];
  const allUrls = [];
  
  icalUrls.forEach(url => {
    if (url && url.trim() !== '') {
      allUrls.push(url);
    }
  });
  
  // Réafficher les URLs dans l'ordre (compactées)
  allUrls.forEach((url, index) => {
    const input = document.getElementById(`ical-url-${index + 1}-chambre`);
    const bloc = document.getElementById(`ical-${index + 1}-chambre`);
    
    if (input && bloc) {
      input.value = url;
      bloc.style.display = 'flex';
    }
  });
  
  // Sauvegarder l'état initial pour chaque position
  this.roomIcalFieldMapping.forEach((fieldName, index) => {
    this.initialValues[`room_${fieldName}`] = allUrls[index] || '';
  });
  
  // Configurer les listeners
  this.setupRoomIcalListeners();
  
  // Mettre à jour l'état du bouton d'ajout
  this.updateRoomAddIcalButton();
}

checkDefaultRoomIcalWarning() {
  const icalInput = document.getElementById('ical-url-1-chambre');
  if (!icalInput) return;
  
  if (icalInput.value.trim() === this.DEFAULT_ICAL_URL) {
    if (this.validationManager) {
      this.validationManager.showFieldWarning('ical-url-1-chambre', "Ce lien iCal a été ajouté par défaut et n'est pas valide. Remplacez-le pour synchroniser votre calendrier.");
      this.validationManager.showTabWarning('error-indicator-tab3-chambre');
    }
  }
}

addRoomIcal() {
  // Trouver le premier bloc caché
  for (let i = 2; i <= 4; i++) {
    const bloc = document.getElementById(`ical-${i}-chambre`);
    if (bloc && bloc.style.display === 'none') {
      bloc.style.display = 'flex';
      
      const input = document.getElementById(`ical-url-${i}-chambre`);
      if (input) {
        setTimeout(() => input.focus(), 100);
      }
      
      break;
    }
  }
  
  this.updateRoomAddIcalButton();
  this.enableButtons();
}

removeRoomIcal(index) {
  // On ne peut pas supprimer le premier
  if (index === 1) return;
  
  // Récupérer toutes les valeurs actuelles
  const currentValues = [];
  for (let i = 1; i <= 4; i++) {
    const input = document.getElementById(`ical-url-${i}-chambre`);
    if (input) {
      currentValues.push(input.value.trim());
    }
  }
  
  // Supprimer la valeur à l'index donné
  currentValues.splice(index - 1, 1);
  
  // Ajouter une valeur vide à la fin pour maintenir 4 éléments
  currentValues.push('');
  
  // Réaffecter toutes les valeurs
  for (let i = 1; i <= 4; i++) {
    const input = document.getElementById(`ical-url-${i}-chambre`);
    const bloc = document.getElementById(`ical-${i}-chambre`);
    
    if (input && bloc) {
      input.value = currentValues[i - 1] || '';
      
      if (i === 1 || (currentValues[i - 1] && currentValues[i - 1].length > 0)) {
        bloc.style.display = 'flex';
      } else {
        bloc.style.display = 'none';
      }
    }
  }
  
  this.updateRoomAddIcalButton();
  this.enableButtons();
}

setupRoomIcalListeners() {
  for (let i = 1; i <= 4; i++) {
    const input = document.getElementById(`ical-url-${i}-chambre`);
    if (input) {
      // Cloner pour retirer les anciens listeners
      const newInput = input.cloneNode(true);
      input.parentNode.replaceChild(newInput, input);
      
      newInput.addEventListener('input', () => {
        // Masquer l'avertissement si c'est ical-url-1-chambre
        if (newInput.id === 'ical-url-1-chambre' && this.validationManager) {
          this.validationManager.hideFieldWarning('ical-url-1-chambre');
          this.validationManager.hideTabWarning('error-indicator-tab3-chambre');
        }
        this.enableButtons();
      });
    }
    
    // Boutons de suppression (sauf pour le premier)
    if (i > 1) {
      const deleteBtn = document.querySelector(`#ical-${i}-chambre .button-delete-ical`);
      if (deleteBtn) {
        const newBtn = deleteBtn.cloneNode(true);
        deleteBtn.parentNode.replaceChild(newBtn, deleteBtn);
        
        newBtn.onclick = (e) => {
          e.preventDefault();
          this.removeRoomIcal(i);
        };
      }
    }
  }
}

updateRoomAddIcalButton() {
  const addButton = document.getElementById('button-add-ical-chambre');
  if (!addButton) return;
  
  let visibleCount = 0;
  for (let i = 1; i <= 4; i++) {
    const bloc = document.getElementById(`ical-${i}-chambre`);
    if (bloc && bloc.style.display !== 'none') {
      visibleCount++;
    }
  }
  
  if (visibleCount >= 4) {
    addButton.disabled = true;
    addButton.style.opacity = '0.5';
    addButton.style.cursor = 'not-allowed';
  } else {
    addButton.disabled = false;
    addButton.style.opacity = '1';
    addButton.style.cursor = 'pointer';
  }
}

collectRoomIcalValues() {
  const currentIcalValues = [];
  for (let i = 1; i <= 4; i++) {
    const input = document.getElementById(`ical-url-${i}-chambre`);
    currentIcalValues.push(input ? input.value.trim() : '');
  }
  return currentIcalValues;
}

// ================================
// 📅 GESTION DES SAISONS CHAMBRE
// ================================

initRoomSeasonManagement() {
  this.setupRoomSeasonButtons();
  this.setupRoomSeasonPeriodButtons();
  this.hideAllRoomSeasonBlocks();
  this.displayRoomExistingSeasons();
  
  // Initialiser Cleave sur les inputs date de la modale saison chambre
  this.initRoomSeasonDateFormatters();
}

initRoomSeasonDateFormatters() {
  if (typeof Cleave === 'undefined') {
    setTimeout(() => this.initRoomSeasonDateFormatters(), 100);
    return;
  }
  
  // Initialiser les inputs date des modales saison chambre
  const dateInputs = document.querySelectorAll('#modal-add-season-chambre [data-format="date-jour-mois"], #modal-edit-season-chambre [data-format="date-jour-mois"]');
  
  dateInputs.forEach(input => {
    // Vérifier que Cleave n'est pas déjà initialisé
    if (input.dataset.cleaveInit) return;
    
    new Cleave(input, {
      date: true,
      delimiter: '/',
      datePattern: ['d', 'm'],
      blocks: [2, 2],
      numericOnly: true
    });
    
    input.addEventListener('blur', function() {
      const value = this.value;
      if (value && value.includes('/')) {
        const [jour, mois] = value.split('/');
        const moisNoms = ['', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 
                         'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
        const moisNum = parseInt(mois);
        if (moisNum >= 1 && moisNum <= 12) {
          this.setAttribute('data-date-value', value);
          this.value = `${parseInt(jour)} ${moisNoms[moisNum]}`;
        }
      }
    });
    
    input.addEventListener('focus', function() {
      const originalValue = this.getAttribute('data-date-value');
      if (originalValue) {
        this.value = originalValue;
      }
    });
    
    input.dataset.cleaveInit = 'true';
  });
}
  
setupRoomSeasonButtons() {
  // Bouton ajouter saison
  const addSeasonBtn = document.getElementById('button-add-season-chambre');
  if (addSeasonBtn) {
    addSeasonBtn.addEventListener('click', (e) => {
      e.preventDefault();
      this.openAddRoomSeasonModal();
    });
  }
  
  // Bouton valider ajout
  const validateAddBtn = document.getElementById('button-validate-add-season-chambre');
  if (validateAddBtn) {
    validateAddBtn.addEventListener('click', (e) => {
      e.preventDefault();
      this.validateAndAddRoomSeason();
    });
  }
  
  // Boutons modifier/supprimer pour chaque saison (1 à 4)
  for (let i = 1; i <= 4; i++) {
    const editBtn = document.getElementById(`edit-${i}-chambre`);
    if (editBtn) {
      editBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.openEditRoomSeasonModal(i - 1);
      });
    }
    
    const deleteBtn = document.getElementById(`delete-${i}-chambre`);
    if (deleteBtn) {
      deleteBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.removeRoomSeason(i - 1);
      });
    }
  }
  
  // Bouton valider modification
  const validateEditBtn = document.getElementById('button-validate-edit-season-chambre');
  if (validateEditBtn) {
    validateEditBtn.addEventListener('click', (e) => {
      e.preventDefault();
      this.validateAndEditRoomSeason();
    });
  }
}

setupRoomSeasonPeriodButtons() {
  // Modal AJOUT — bouton ajouter plage
  const addPlageBtn = document.getElementById('btn-add-plage-dates-chambre');
  if (addPlageBtn) {
    addPlageBtn.addEventListener('click', (e) => {
      e.preventDefault();
      this.addRoomPlageDates(false);
    });
  }
  
  // Boutons supprimer plages 2 à 5 (modal ajout)
  for (let i = 2; i <= 5; i++) {
    const deleteBtn = document.getElementById(`btn-delete-plage-${i}-chambre`);
    if (deleteBtn) {
      deleteBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.removeRoomPlageDates(i, false);
      });
    }
  }
  
  // Modal EDIT — bouton ajouter plage
  const addPlageBtnEdit = document.getElementById('btn-add-plage-dates-edit-chambre');
  if (addPlageBtnEdit) {
    addPlageBtnEdit.addEventListener('click', (e) => {
      e.preventDefault();
      this.addRoomPlageDates(true);
    });
  }
  
  // Boutons supprimer plages 2 à 5 (modal edit)
  for (let i = 2; i <= 5; i++) {
    const deleteBtn = document.getElementById(`btn-delete-plage-${i}-edit-chambre`);
    if (deleteBtn) {
      deleteBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.removeRoomPlageDates(i, true);
      });
    }
  }
}

addRoomPlageDates(isEdit = false) {
  const suffix = isEdit ? '-edit-chambre' : '-chambre';
  
  for (let i = 2; i <= 5; i++) {
    const block = document.getElementById(`bloc-plage-dates-${i}${suffix}`);
    if (block && block.style.display === 'none') {
      block.style.display = 'flex';
      
      // Initialiser Cleave sur les nouveaux inputs
      const startInput = document.getElementById(`season-date-start-input-${i}${suffix}`);
      const endInput = document.getElementById(`season-date-end-input-${i}${suffix}`);
      
      [startInput, endInput].forEach(input => {
        if (input && typeof Cleave !== 'undefined') {
          new Cleave(input, {
            date: true,
            delimiter: '/',
            datePattern: ['d', 'm'],
            blocks: [2, 2],
            numericOnly: true
          });
          
          input.addEventListener('blur', function() {
            const value = this.value;
            if (value && value.includes('/')) {
              const [jour, mois] = value.split('/');
              const moisNoms = ['', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 
                               'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
              const moisNum = parseInt(mois);
              if (moisNum >= 1 && moisNum <= 12) {
                this.setAttribute('data-date-value', value);
                this.value = `${parseInt(jour)} ${moisNoms[moisNum]}`;
              }
            }
          });
          
          input.addEventListener('focus', function() {
            const originalValue = this.getAttribute('data-date-value');
            if (originalValue) {
              this.value = originalValue;
            }
          });
        }
      });
      
      break;
    }
  }
  
  // Masquer le bouton si 5 plages
  const visibleCount = this.countRoomVisiblePlages(isEdit);
  if (visibleCount >= 5) {
    const addBtn = document.getElementById(isEdit ? 'btn-add-plage-dates-edit-chambre' : 'btn-add-plage-dates-chambre');
    if (addBtn) addBtn.style.display = 'none';
  }
}

removeRoomPlageDates(index, isEdit = false) {
  const suffix = isEdit ? '-edit-chambre' : '-chambre';
  const block = document.getElementById(`bloc-plage-dates-${index}${suffix}`);
  
  if (block) {
    const startInput = document.getElementById(`season-date-start-input-${index}${suffix}`);
    const endInput = document.getElementById(`season-date-end-input-${index}${suffix}`);
    
    [startInput, endInput].forEach(input => {
      if (input) {
        input.value = '';
        input.removeAttribute('data-raw-value');
        input.removeAttribute('data-date-value');
      }
    });
    
    block.style.display = 'none';
    
    if (this.validationManager) {
      this.validationManager.hideFieldError(`season-date-start-input-${index}${suffix}`);
      this.validationManager.hideFieldError(`season-date-end-input-${index}${suffix}`);
    }
  }
  
  // Réafficher le bouton ajouter
  const addBtn = document.getElementById(isEdit ? 'btn-add-plage-dates-edit-chambre' : 'btn-add-plage-dates-chambre');
  if (addBtn) addBtn.style.display = '';
}

countRoomVisiblePlages(isEdit = false) {
  const suffix = isEdit ? '-edit-chambre' : '-chambre';
  let count = 0;
  for (let i = 1; i <= 5; i++) {
    const block = document.getElementById(`bloc-plage-dates-${i}${suffix}`);
    if (block && block.style.display !== 'none') {
      count++;
    }
  }
  return count;
}

hideAllRoomSeasonBlocks() {
  for (let i = 1; i <= 4; i++) {
    const block = document.getElementById(`season-${i}-chambre`);
    if (block) block.style.display = 'none';
  }
}

displayRoomExistingSeasons() {
  if (this.roomPricingData && this.roomPricingData.seasons && this.roomPricingData.seasons.length > 0) {
    this.roomPricingData.seasons.forEach((season, index) => {
      this.displayRoomSeasonBlock(season, index);
    });
  }
}

displayRoomSeasonBlock(season, index) {
  const seasonNum = index + 1;
  const seasonBlock = document.getElementById(`season-${seasonNum}-chambre`);
  
  if (!seasonBlock) return;
  
  seasonBlock.style.display = 'flex';
  
  // Nom
  const nameElement = document.getElementById(`name-season-${seasonNum}-chambre`);
  if (nameElement) nameElement.textContent = season.name;
  
  // Prix par nuit
  const priceElement = document.getElementById(`prix-nuit-season-${seasonNum}-chambre`);
  if (priceElement) priceElement.textContent = season.price;
  
  // Prix par semaine
  const weekPriceElement = document.getElementById(`prix-semaine-season-${seasonNum}-chambre`);
  if (weekPriceElement) {
    const weekPrice = this.calculateWeekPrice(season.price, this.roomPricingData.discounts);
    weekPriceElement.textContent = weekPrice;
  }
  
  // Dates — trier chronologiquement puis afficher
  const datesElement = document.getElementById(`dates-season-${seasonNum}-chambre`);
  if (datesElement && season.periods && season.periods.length > 0) {
    const sortedPeriods = [...season.periods].sort((a, b) => {
      const [dayA, monthA] = a.start.split('-').map(Number);
      const [dayB, monthB] = b.start.split('-').map(Number);
      return (monthA * 100 + dayA) - (monthB * 100 + dayB);
    });
    
    const dateRanges = sortedPeriods.map(period => 
      this.formatDateRange(period.start, period.end)
    );
    datesElement.textContent = dateRanges.join(" - ");
  }
  
  // Nuits minimum
  const minNightsElement = document.getElementById(`nuit-minimum-${seasonNum}-chambre`);
  if (minNightsElement) minNightsElement.textContent = season.minNights || 1;
}

// --- MODALE AJOUT ---

openAddRoomSeasonModal() {
  if (this.roomPricingData.seasons.length >= 4) {
    this.showNotification('error', 'Maximum 4 saisons autorisées');
    return;
  }
  
  this.resetRoomSeasonModal();
  this.setupRoomSeasonModalPricing(false);
  this.setupRoomSeasonValidationListeners(false);
  
  const modal = document.getElementById('modal-add-season-chambre');
  if (modal) {
    modal.style.display = 'flex';
    modal.style.opacity = '1';
    const popup = modal.querySelector('.bloc-popup');
    if (popup) {
      popup.style.opacity = '1';
      popup.style.transform = 'none';
    }
  }
}

resetRoomSeasonModal() {
  const fields = [
    'season-name-input-chambre',
    'season-price-input-chambre',
    'season-min-nights-input-chambre'
  ];
  
  fields.forEach(fieldId => {
    const input = document.getElementById(fieldId);
    if (input) {
      input.value = '';
      input.removeAttribute('data-raw-value');
      input.removeAttribute('data-date-value');
    }
  });
  
  // Réinitialiser toutes les plages de dates
  for (let i = 1; i <= 5; i++) {
    const startInput = document.getElementById(`season-date-start-input-${i}-chambre`);
    const endInput = document.getElementById(`season-date-end-input-${i}-chambre`);
    
    [startInput, endInput].forEach(input => {
      if (input) {
        input.value = '';
        input.removeAttribute('data-raw-value');
        input.removeAttribute('data-date-value');
      }
    });
    
    if (i > 1) {
      const block = document.getElementById(`bloc-plage-dates-${i}-chambre`);
      if (block) block.style.display = 'none';
    }
  }
  
  // Réafficher le bouton ajouter plage
  const addBtn = document.getElementById('btn-add-plage-dates-chambre');
  if (addBtn) addBtn.style.display = '';
  
  // Réinitialiser les prix plateformes
  ['season-airbnb-price-input-chambre', 'season-booking-price-input-chambre', 'season-other-price-input-chambre'].forEach(id => {
    const input = document.getElementById(id);
    if (input) {
      input.value = '';
      input.removeAttribute('data-raw-value');
    }
  });
  
  // Réinitialiser les prix par voyageur
  this.resetRoomSeasonPricesPerGuest(false);
}

setupRoomSeasonModalPricing(isEdit) {
  const suffix = isEdit ? '-edit-chambre' : '-chambre';
  const radioVoyageur = document.getElementById('radio-prix-voyageur-chambre');
  const isPerGuest = radioVoyageur && radioVoyageur.checked;
  
  const blocFixe = document.getElementById(`bloc-prix-fixe-saison${suffix}`);
  const blocVoyageur = document.getElementById(`bloc-prix-voyageur-saison${suffix}`);
  
  if (isPerGuest) {
    if (blocFixe) blocFixe.style.display = 'none';
    if (blocVoyageur) blocVoyageur.style.display = 'flex';
    this.displayRoomSeasonPricesPerGuest([], isEdit);
  } else {
    if (blocFixe) blocFixe.style.display = 'block';
    if (blocVoyageur) blocVoyageur.style.display = 'none';
  }
}

displayRoomSeasonPricesPerGuest(pricesArray, isEdit) {
  const voyageursInput = document.getElementById('voyageurs-input-chambre');
  const maxGuests = parseInt(voyageursInput?.value) || 1;
  
  for (let i = 0; i < 10; i++) {
    const bloc = this.getRoomSeasonPrixVoyageurBloc(i, isEdit);
    if (!bloc) continue;
    
    if (i < maxGuests) {
      bloc.style.display = 'flex';
      
      const priceInput = bloc.querySelector('[data-prix-voyageur="price"]');
      if (priceInput) {
        const price = (pricesArray && pricesArray[i]) ? pricesArray[i] : 0;
        if (price > 0) {
          priceInput.value = price;
          priceInput.setAttribute('data-raw-value', price);
        } else {
          priceInput.value = '';
          priceInput.removeAttribute('data-raw-value');
        }
        
        // Listeners (si pas déjà ajoutés)
        if (!priceInput.dataset.listenerAdded) {
          priceInput.addEventListener('input', () => {
            const cleanValue = priceInput.value.replace(/[^\d]/g, '');
            priceInput.setAttribute('data-raw-value', cleanValue || '0');
          });
          
          priceInput.addEventListener('blur', () => {
            const value = priceInput.value.replace(/[^\d]/g, '');
            if (value) {
              priceInput.setAttribute('data-raw-value', value);
              priceInput.value = value + ' € / nuit';
            } else {
              priceInput.removeAttribute('data-raw-value');
              priceInput.value = '';
            }
          });
          
          priceInput.addEventListener('focus', () => {
            const rawValue = priceInput.getAttribute('data-raw-value');
            if (rawValue) {
              priceInput.value = rawValue;
            } else {
              priceInput.value = priceInput.value.replace(/[^\d]/g, '');
            }
          });
          
          priceInput.dataset.listenerAdded = 'true';
        }
      }
    } else {
      bloc.style.display = 'none';
      const priceInput = bloc.querySelector('[data-prix-voyageur="price"]');
      if (priceInput) {
        priceInput.value = '';
        priceInput.removeAttribute('data-raw-value');
      }
    }
  }
}

getRoomSeasonPrixVoyageurBloc(index, isEdit) {
  if (isEdit) {
    if (index === 0) {
      return document.querySelector('.bloc-flex-input.tarifs.voyageurs.saison.edit:not(.next)');
    } else {
      const nextBlocs = document.querySelectorAll('.bloc-flex-input.tarifs.voyageurs.saison.edit.next');
      return nextBlocs[index - 1] || null;
    }
  } else {
    if (index === 0) {
      return document.querySelector('.bloc-flex-input.tarifs.voyageurs.saison:not(.edit):not(.next)');
    } else {
      const nextBlocs = document.querySelectorAll('.bloc-flex-input.tarifs.voyageurs.saison:not(.edit).next');
      return nextBlocs[index - 1] || null;
    }
  }
}

resetRoomSeasonPricesPerGuest(isEdit) {
  for (let i = 0; i < 10; i++) {
    const bloc = this.getRoomSeasonPrixVoyageurBloc(i, isEdit);
    if (bloc) {
      const priceInput = bloc.querySelector('[data-prix-voyageur="price"]');
      if (priceInput) {
        priceInput.value = '';
        priceInput.removeAttribute('data-raw-value');
      }
    }
  }
}

collectRoomSeasonPricesPerGuest(isEdit) {
  const voyageursInput = document.getElementById('voyageurs-input-chambre');
  const maxGuests = parseInt(voyageursInput?.value) || 1;
  const prices = [];
  
  for (let i = 0; i < maxGuests; i++) {
    const bloc = this.getRoomSeasonPrixVoyageurBloc(i, isEdit);
    if (bloc && bloc.style.display !== 'none') {
      const priceInput = bloc.querySelector('[data-prix-voyageur="price"]');
      if (priceInput) {
        const rawValue = priceInput.getAttribute('data-raw-value');
        prices.push(parseInt(rawValue) || 0);
      } else {
        prices.push(0);
      }
    }
  }
  
  return prices;
}

validateAndAddRoomSeason() {
  if (this.validationManager && !this.validationManager.validateRoomSeason(false)) {
    return;
  }
  
  const seasonData = this.getRoomSeasonFormData();
  
  const sortedPeriods = [...seasonData.periods].sort((a, b) => {
    const [dayA, monthA] = a.start.split('-').map(Number);
    const [dayB, monthB] = b.start.split('-').map(Number);
    return (monthA * 100 + dayA) - (monthB * 100 + dayB);
  });
  
  const newSeason = {
    name: seasonData.name,
    price: parseInt(seasonData.price),
    minNights: parseInt(seasonData.minNights) || 1,
    periods: sortedPeriods
  };
  
  // Prix par voyageur si mode per_guest
  if (seasonData.pricesPerGuest && seasonData.pricesPerGuest.length > 0) {
    newSeason.pricesPerGuest = seasonData.pricesPerGuest;
    newSeason.price = seasonData.pricesPerGuest[seasonData.pricesPerGuest.length - 1];
  }
  
  // Prix plateformes
  const airbnb = parseInt(seasonData.airbnbPrice) || 0;
  const booking = parseInt(seasonData.bookingPrice) || 0;
  const other = parseInt(seasonData.otherPrice) || 0;
  
  if (airbnb > 0 || booking > 0 || other > 0) {
    newSeason.platformPrices = { airbnb, booking, other };
  }
  
  this.roomPricingData.seasons.push(newSeason);
  
  const seasonIndex = this.roomPricingData.seasons.length - 1;
  this.displayRoomSeasonBlock(newSeason, seasonIndex);
  
  this.closeRoomSeasonModal();
  this.enableButtons();
}

getRoomSeasonFormData() {
  const radioVoyageur = document.getElementById('radio-prix-voyageur-chambre');
  const isPerGuest = radioVoyageur && radioVoyageur.checked;
  
  // Plages de dates
  const periods = [];
  for (let i = 1; i <= 5; i++) {
    const block = document.getElementById(`bloc-plage-dates-${i}-chambre`);
    if (!block || block.style.display === 'none') continue;
    
    const startInput = document.getElementById(`season-date-start-input-${i}-chambre`);
    const endInput = document.getElementById(`season-date-end-input-${i}-chambre`);
    
    const start = this.getDateValue(startInput);
    const end = this.getDateValue(endInput);
    
    if (start && end) {
      periods.push({ start, end });
    }
  }
  
  const data = {
    name: document.getElementById('season-name-input-chambre')?.value.trim(),
    periods: periods,
    minNights: this.getRawValue(document.getElementById('season-min-nights-input-chambre')) || '1',
    airbnbPrice: this.getRawValue(document.getElementById('season-airbnb-price-input-chambre')) || '0',
    bookingPrice: this.getRawValue(document.getElementById('season-booking-price-input-chambre')) || '0',
    otherPrice: this.getRawValue(document.getElementById('season-other-price-input-chambre')) || '0'
  };
  
  if (isPerGuest) {
    data.pricesPerGuest = this.collectRoomSeasonPricesPerGuest(false);
    data.price = data.pricesPerGuest.length > 0 ? data.pricesPerGuest[data.pricesPerGuest.length - 1] : 0;
  } else {
    data.price = this.getRawValue(document.getElementById('season-price-input-chambre'));
  }
  
  return data;
}

closeRoomSeasonModal() {
  const modal = document.getElementById('modal-add-season-chambre');
  if (modal) {
    modal.style.display = 'none';
    modal.style.opacity = '1';
    const popup = modal.querySelector('.bloc-popup');
    if (popup) {
      popup.style.opacity = '1';
      popup.style.transform = 'none';
    }
  }
  this.resetRoomSeasonModal();
  
  if (this.validationManager) {
    const fieldsToClean = [
      'season-name-input-chambre', 'season-price-input-chambre', 'season-min-nights-input-chambre',
      'season-airbnb-price-input-chambre', 'season-booking-price-input-chambre', 'season-other-price-input-chambre'
    ];
    for (let i = 1; i <= 5; i++) {
      fieldsToClean.push(`season-date-start-input-${i}-chambre`);
      fieldsToClean.push(`season-date-end-input-${i}-chambre`);
    }
    fieldsToClean.forEach(id => this.validationManager.hideFieldError(id));
  }
}

// --- MODALE EDIT ---

openEditRoomSeasonModal(seasonIndex) {
  this.resetEditRoomSeasonModal();
  
  if (!this.roomPricingData.seasons[seasonIndex]) {
    console.error('❌ Saison chambre non trouvée à l\'index', seasonIndex);
    return;
  }
  
  if (this.validationManager) {
    const editFields = [
      'season-name-input-edit-chambre', 'season-price-input-edit-chambre', 'season-min-nights-input-edit-chambre',
      'season-airbnb-price-input-edit-chambre', 'season-booking-price-input-edit-chambre', 'season-other-price-input-edit-chambre'
    ];
    for (let i = 1; i <= 5; i++) {
      editFields.push(`season-date-start-input-${i}-edit-chambre`);
      editFields.push(`season-date-end-input-${i}-edit-chambre`);
    }
    editFields.forEach(id => this.validationManager.hideFieldError(id));
  }
  
  this.editingRoomSeasonIndex = seasonIndex;
  const season = this.roomPricingData.seasons[seasonIndex];
  
  // Nom
  const nameInput = document.getElementById('season-name-input-edit-chambre');
  if (nameInput) nameInput.value = season.name;
  
  // Plages de dates
  if (season.periods && season.periods.length > 0) {
    season.periods.forEach((period, i) => {
      const index = i + 1;
      
      if (index > 1) {
        const block = document.getElementById(`bloc-plage-dates-${index}-edit-chambre`);
        if (block) block.style.display = 'flex';
      }
      
      const startInput = document.getElementById(`season-date-start-input-${index}-edit-chambre`);
      const endInput = document.getElementById(`season-date-end-input-${index}-edit-chambre`);
      
      if (startInput) {
        const [day, month] = period.start.split('-');
        startInput.value = `${day}/${month}`;
        startInput.setAttribute('data-date-value', `${day}/${month}`);
      }
      
      if (endInput) {
        const [day, month] = period.end.split('-');
        endInput.value = `${day}/${month}`;
        endInput.setAttribute('data-date-value', `${day}/${month}`);
      }
    });
    
    if (season.periods.length >= 5) {
      const addBtn = document.getElementById('btn-add-plage-dates-edit-chambre');
      if (addBtn) addBtn.style.display = 'none';
    }
  }
  
  // Prix et mode
  this.setupRoomSeasonModalPricing(true);
  
  const radioVoyageur = document.getElementById('radio-prix-voyageur-chambre');
  const isPerGuest = radioVoyageur && radioVoyageur.checked;
  
  if (isPerGuest && season.pricesPerGuest) {
    this.displayRoomSeasonPricesPerGuest(season.pricesPerGuest, true);
  } else {
    const priceInput = document.getElementById('season-price-input-edit-chambre');
    if (priceInput) {
      priceInput.value = season.price;
      priceInput.setAttribute('data-raw-value', season.price);
    }
  }
  
  // Nuits minimum
  const minNightsInput = document.getElementById('season-min-nights-input-edit-chambre');
  if (minNightsInput) {
    minNightsInput.value = season.minNights || 1;
    minNightsInput.setAttribute('data-raw-value', season.minNights || 1);
  }
  
  // Prix plateformes
  if (season.platformPrices) {
    const platformInputs = {
      'season-airbnb-price-input-edit-chambre': season.platformPrices.airbnb || 0,
      'season-booking-price-input-edit-chambre': season.platformPrices.booking || 0,
      'season-other-price-input-edit-chambre': season.platformPrices.other || 0
    };
    
    Object.entries(platformInputs).forEach(([inputId, value]) => {
      const input = document.getElementById(inputId);
      if (input) {
        input.value = value;
        input.setAttribute('data-raw-value', value);
      }
    });
  }
  
  this.setupRoomSeasonValidationListeners(true);
  
  const modal = document.getElementById('modal-edit-season-chambre');
  if (modal) {
    modal.style.display = 'flex';
    modal.style.opacity = '1';
    const popup = modal.querySelector('.bloc-popup');
    if (popup) {
      popup.style.opacity = '1';
      popup.style.transform = 'none';
    }
  }
}

resetEditRoomSeasonModal() {
  const fields = [
    'season-name-input-edit-chambre',
    'season-price-input-edit-chambre',
    'season-min-nights-input-edit-chambre'
  ];
  
  fields.forEach(fieldId => {
    const input = document.getElementById(fieldId);
    if (input) {
      input.value = '';
      input.removeAttribute('data-raw-value');
      input.removeAttribute('data-date-value');
    }
  });
  
  // Plages de dates
  for (let i = 1; i <= 5; i++) {
    const startInput = document.getElementById(`season-date-start-input-${i}-edit-chambre`);
    const endInput = document.getElementById(`season-date-end-input-${i}-edit-chambre`);
    
    [startInput, endInput].forEach(input => {
      if (input) {
        input.value = '';
        input.removeAttribute('data-raw-value');
        input.removeAttribute('data-date-value');
      }
    });
    
    if (i > 1) {
      const block = document.getElementById(`bloc-plage-dates-${i}-edit-chambre`);
      if (block) block.style.display = 'none';
    }
  }
  
  const addBtn = document.getElementById('btn-add-plage-dates-edit-chambre');
  if (addBtn) addBtn.style.display = '';
  
  // Prix plateformes
  ['season-airbnb-price-input-edit-chambre', 'season-booking-price-input-edit-chambre', 'season-other-price-input-edit-chambre'].forEach(id => {
    const input = document.getElementById(id);
    if (input) {
      input.value = '';
      input.removeAttribute('data-raw-value');
    }
  });
  
  // Prix par voyageur
  this.resetRoomSeasonPricesPerGuest(true);
}

validateAndEditRoomSeason() {
  if (this.editingRoomSeasonIndex === undefined || this.editingRoomSeasonIndex === null) {
    console.error('❌ Aucune saison chambre en cours de modification');
    return;
  }
  
  if (this.validationManager && !this.validationManager.validateRoomSeason(true)) {
    return;
  }
  
  const seasonData = this.getEditRoomSeasonFormData();
  
  const sortedPeriods = [...seasonData.periods].sort((a, b) => {
    const [dayA, monthA] = a.start.split('-').map(Number);
    const [dayB, monthB] = b.start.split('-').map(Number);
    return (monthA * 100 + dayA) - (monthB * 100 + dayB);
  });
  
  const updatedSeason = {
    name: seasonData.name,
    price: parseInt(seasonData.price),
    minNights: parseInt(seasonData.minNights) || 1,
    periods: sortedPeriods
  };
  
  // Prix par voyageur si mode per_guest
  if (seasonData.pricesPerGuest && seasonData.pricesPerGuest.length > 0) {
    updatedSeason.pricesPerGuest = seasonData.pricesPerGuest;
    updatedSeason.price = seasonData.pricesPerGuest[seasonData.pricesPerGuest.length - 1];
  }
  
  // Prix plateformes
  const airbnb = parseInt(seasonData.airbnbPrice) || 0;
  const booking = parseInt(seasonData.bookingPrice) || 0;
  const other = parseInt(seasonData.otherPrice) || 0;
  
  if (airbnb > 0 || booking > 0 || other > 0) {
    updatedSeason.platformPrices = { airbnb, booking, other };
  }
  
  this.roomPricingData.seasons[this.editingRoomSeasonIndex] = updatedSeason;
  this.displayRoomSeasonBlock(updatedSeason, this.editingRoomSeasonIndex);
  
  this.closeEditRoomSeasonModal();
  this.enableButtons();
}

getEditRoomSeasonFormData() {
  const radioVoyageur = document.getElementById('radio-prix-voyageur-chambre');
  const isPerGuest = radioVoyageur && radioVoyageur.checked;
  
  const periods = [];
  for (let i = 1; i <= 5; i++) {
    const block = document.getElementById(`bloc-plage-dates-${i}-edit-chambre`);
    if (!block || block.style.display === 'none') continue;
    
    const startInput = document.getElementById(`season-date-start-input-${i}-edit-chambre`);
    const endInput = document.getElementById(`season-date-end-input-${i}-edit-chambre`);
    
    const start = this.getDateValue(startInput);
    const end = this.getDateValue(endInput);
    
    if (start && end) {
      periods.push({ start, end });
    }
  }
  
  const data = {
    name: document.getElementById('season-name-input-edit-chambre')?.value.trim(),
    periods: periods,
    minNights: this.getRawValue(document.getElementById('season-min-nights-input-edit-chambre')) || '1',
    airbnbPrice: this.getRawValue(document.getElementById('season-airbnb-price-input-edit-chambre')) || '0',
    bookingPrice: this.getRawValue(document.getElementById('season-booking-price-input-edit-chambre')) || '0',
    otherPrice: this.getRawValue(document.getElementById('season-other-price-input-edit-chambre')) || '0'
  };
  
  if (isPerGuest) {
    data.pricesPerGuest = this.collectRoomSeasonPricesPerGuest(true);
    data.price = data.pricesPerGuest.length > 0 ? data.pricesPerGuest[data.pricesPerGuest.length - 1] : 0;
  } else {
    data.price = this.getRawValue(document.getElementById('season-price-input-edit-chambre'));
  }
  
  return data;
}

closeEditRoomSeasonModal() {
  const modal = document.getElementById('modal-edit-season-chambre');
  if (modal) {
    modal.style.display = 'none';
    modal.style.opacity = '1';
    const popup = modal.querySelector('.bloc-popup');
    if (popup) {
      popup.style.opacity = '1';
      popup.style.transform = 'none';
    }
  }
  
  if (this.validationManager) {
    const editFields = [
      'season-name-input-edit-chambre', 'season-price-input-edit-chambre', 'season-min-nights-input-edit-chambre',
      'season-airbnb-price-input-edit-chambre', 'season-booking-price-input-edit-chambre', 'season-other-price-input-edit-chambre'
    ];
    for (let i = 1; i <= 5; i++) {
      editFields.push(`season-date-start-input-${i}-edit-chambre`);
      editFields.push(`season-date-end-input-${i}-edit-chambre`);
    }
    editFields.forEach(id => this.validationManager.hideFieldError(id));
  }
  
  this.resetEditRoomSeasonModal();
  this.editingRoomSeasonIndex = null;
}

removeRoomSeason(index) {
  this.roomPricingData.seasons.splice(index, 1);
  this.hideAllRoomSeasonBlocks();
  this.displayRoomExistingSeasons();
  this.enableButtons();
}

setupRoomSeasonValidationListeners(isEdit) {
  const suffix = isEdit ? '-edit-chambre' : '-chambre';
  
  // Prix direct — validation au blur
  const priceInput = document.getElementById(`season-price-input${suffix}`);
  if (priceInput) {
    priceInput.addEventListener('blur', () => {
      if (this.validationManager) {
        const price = parseInt(this.getRawValue(priceInput)) || 0;
        if (price > 0) {
          this.validationManager.validateRoomSeasonPlatformPrices(price, suffix);
        }
      }
    });
  }
  
  // Nuits minimum
  const minNightsInput = document.getElementById(`season-min-nights-input${suffix}`);
  if (minNightsInput) {
    minNightsInput.addEventListener('input', (e) => {
      const value = e.target.value.replace(/[^\d]/g, '');
      e.target.setAttribute('data-raw-value', value || '1');
    });
  }
  
  // Prix plateformes — validation au blur
  ['airbnb', 'booking', 'other'].forEach(platform => {
    const input = document.getElementById(`season-${platform}-price-input${suffix}`);
    if (input) {
      input.addEventListener('blur', () => {
        if (this.validationManager) {
          const directPrice = parseInt(this.getRawValue(priceInput)) || 0;
          if (directPrice > 0) {
            this.validationManager.validateRoomSeasonPlatformPrices(directPrice, suffix);
          }
        }
      });
    }
  });
}

// ================================
// 💰 PLATEFORMES CHAMBRE
// ================================

updateRoomPlatformBlocksVisibility() {
  const links = this.parentPlatformLinks || {};
  
  const hasAirbnb = links.airbnb && links.airbnb.trim() !== '';
  const hasBooking = links.booking && links.booking.trim() !== '';
  const hasOther = links.other && links.other.trim() !== '';
  const hasAnyLink = hasAirbnb || hasBooking || hasOther;
  
  // Bloc global tarif par défaut
  const blocGlobal = document.getElementById('bloc-tarifs-plateformes-chambre');
  if (blocGlobal) blocGlobal.style.display = hasAnyLink ? 'block' : 'none';
  
  // Blocs individuels tarif par défaut
  const blocAirbnb = document.getElementById('bloc-airbnb-chambre');
  const blocBooking = document.getElementById('bloc-booking-chambre');
  const blocOther = document.getElementById('bloc-other-chambre');
  if (blocAirbnb) blocAirbnb.style.display = hasAirbnb ? 'flex' : 'none';
  if (blocBooking) blocBooking.style.display = hasBooking ? 'flex' : 'none';
  if (blocOther) blocOther.style.display = hasOther ? 'flex' : 'none';
  
  // Bloc global modale ajout
  const blocGlobalAdd = document.getElementById('bloc-plateforme-add-chambre');
  if (blocGlobalAdd) blocGlobalAdd.style.display = hasAnyLink ? 'block' : 'none';
  
  // Blocs individuels modale ajout
  const blocAirbnbAdd = document.getElementById('bloc-airbnb-chambre-add');
  const blocBookingAdd = document.getElementById('bloc-booking-chambre-add');
  const blocOtherAdd = document.getElementById('bloc-other-chambre-add');
  if (blocAirbnbAdd) blocAirbnbAdd.style.display = hasAirbnb ? 'flex' : 'none';
  if (blocBookingAdd) blocBookingAdd.style.display = hasBooking ? 'flex' : 'none';
  if (blocOtherAdd) blocOtherAdd.style.display = hasOther ? 'flex' : 'none';
  
  // Bloc global modale edit
  const blocGlobalEdit = document.getElementById('bloc-plateforme-edit-chambre');
  if (blocGlobalEdit) blocGlobalEdit.style.display = hasAnyLink ? 'block' : 'none';
  
  // Blocs individuels modale edit
  const blocAirbnbEdit = document.getElementById('bloc-airbnb-chambre-edit');
  const blocBookingEdit = document.getElementById('bloc-booking-chambre-edit');
  const blocOtherEdit = document.getElementById('bloc-other-chambre-edit');
  if (blocAirbnbEdit) blocAirbnbEdit.style.display = hasAirbnb ? 'flex' : 'none';
  if (blocBookingEdit) blocBookingEdit.style.display = hasBooking ? 'flex' : 'none';
  if (blocOtherEdit) blocOtherEdit.style.display = hasOther ? 'flex' : 'none';
}
  
collectRoomPricingData() {
  // Construire l'objet pricing complet
  const pricingData = JSON.parse(JSON.stringify(this.roomPricingData || {}));
  
  // Déterminer le mode
  const radioVoyageur = document.getElementById('radio-prix-voyageur-chambre');
  const mode = (radioVoyageur && radioVoyageur.checked) ? 'per_guest' : 'fixed';
  
  if (!pricingData.defaultPricing) {
    pricingData.defaultPricing = {};
  }
  
  pricingData.defaultPricing.mode = mode;
  
  if (mode === 'per_guest') {
    pricingData.defaultPricing.pricesPerGuest = this.collectPricesPerGuest();
    // En mode per_guest, le prix "principal" est celui pour 1 voyageur (pour l'affichage liste)
    const prices = pricingData.defaultPricing.pricesPerGuest;
    pricingData.defaultPricing.price = prices.length > 0 ? prices[prices.length - 1] : 0;
  } else {
    const priceInput = document.getElementById('default-price-input-chambre');
    pricingData.defaultPricing.price = parseInt(this.getRawValue(priceInput)) || 0;
  }
  
  // Nuits minimum
  const minNightsInput = document.getElementById('default-min-nights-input-chambre');
  pricingData.defaultPricing.minNights = parseInt(minNightsInput?.value) || 1;
  
  // Week-end
  const weekendOui = document.getElementById('weekend-oui-chambre');
  if (weekendOui && weekendOui.checked) {
    const weekendPriceInput = document.getElementById('weekend-price-input-chambre');
    if (!pricingData.defaultPricing.weekend) {
      pricingData.defaultPricing.weekend = {};
    }
    pricingData.defaultPricing.weekend.enabled = true;
    pricingData.defaultPricing.weekend.price = parseInt(this.getRawValue(weekendPriceInput)) || 0;
  } else {
    if (pricingData.defaultPricing.weekend) {
      pricingData.defaultPricing.weekend.enabled = false;
      pricingData.defaultPricing.weekend.price = 0;
    }
  }
  
  // Réductions
  pricingData.discounts = JSON.parse(JSON.stringify(this.roomPricingData.discounts || []));
  
  // Prix plateformes par défaut
  const platformPrices = {};
  let hasPlatformPrices = false;
  
  ['airbnb', 'booking', 'other'].forEach(platform => {
    const input = document.getElementById(`default-${platform}-price-input-chambre`);
    if (input) {
      const value = parseInt(this.getRawValue(input)) || 0;
      if (value > 0) {
        platformPrices[platform] = value;
        hasPlatformPrices = true;
      }
    }
  });
  
  if (hasPlatformPrices) {
    pricingData.defaultPricing.platformPrices = platformPrices;
  }
  
  return pricingData;
}
  
setupRoomSaveButton() {
  const saveButton = document.getElementById('button-save-modifications');
  const cancelButton = document.getElementById('annulation');
  
  this.disableButtons();
  
  if (saveButton) {
    const newSaveBtn = saveButton.cloneNode(true);
    saveButton.parentNode.replaceChild(newSaveBtn, saveButton);
    newSaveBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      await this.saveRoomModifications();
    });
  }
  
  if (cancelButton) {
    const newCancelBtn = cancelButton.cloneNode(true);
    cancelButton.parentNode.replaceChild(newCancelBtn, cancelButton);
    newCancelBtn.addEventListener('click', (e) => {
      e.preventDefault();
      this.cancelRoomModifications();
    });
  }
}

async saveRoomModifications() {
  // 🆕 Validation : 
  // - champ vide → on laisse passer le save (sera complété plus tard)
  // - valeur invalide → on bloque le save (data integrity)
  let fieldsValid = true;
  let hasFormatErrors = false;
  let hasEmptyErrors = false;
  
  if (this.validationManager) {
    fieldsValid = this.validationManager.validateRoomFields();
    
    if (!fieldsValid) {
      const { empty, format } = this.validationManager.categorizeErrors('roomValidationConfig');
      hasEmptyErrors = empty.length > 0;
      hasFormatErrors = format.length > 0;
    }
  }
  
  // Si VALEURS INVALIDES : BLOQUER le save
  if (hasFormatErrors) {
    console.log('❌ Valeurs invalides détectées chambre - sauvegarde annulée');
    this.showNotification('error', 'Certaines valeurs sont invalides, veuillez les corriger avant d\'enregistrer');
    
    const { format } = this.validationManager.categorizeErrors('roomValidationConfig');
    setTimeout(() => {
      if (format[0]) {
        this.validationManager.navigateToField(format[0]);
      }
    }, 100);
    return;
  }
  
  // Si seulement CHAMPS VIDES : on continue le save (mode brouillon)
  if (hasEmptyErrors) {
    console.log('⚠️ Champs vides chambre - sauvegarde en mode brouillon');
  }
  
  const updates = {};
  
  // Nom
  const nameInput = document.getElementById('name-input-chambre');
  const currentName = nameInput?.value?.trim() || '';
  if (currentName !== this.initialValues.room_name) {
    updates.name = currentName;
  }
  
  // Description
  const descInput = document.getElementById('texte-chambre');
  const currentDesc = descInput?.value?.trim() || '';
  if (currentDesc !== this.initialValues.room_description) {
    updates.description = currentDesc;
  }
  
  // Taille chambre via helper
  const voyageurs = document.getElementById('voyageurs-input-chambre')?.value || '0';
  const lits = document.getElementById('lits-input-chambre')?.value || '0';
  const tailleM2 = document.getElementById('taille-chambre')?.value || '0';
  
  const nouvelleTaille = PropertyEditor.buildTailleChambre(voyageurs, lits, tailleM2);
  if (nouvelleTaille !== this.initialValues.room_taille_chambre) {
    updates.taille_chambre = nouvelleTaille;
  }
  
  // Équipements via mapping unique
  const selectedEquipements = [];
  Object.entries(PropertyEditor.ROOM_EQUIPEMENTS_MAPPING).forEach(([value, id]) => {
    const checkbox = document.getElementById(id);
    if (checkbox && checkbox.checked) {
      selectedEquipements.push(value);
    }
  });
  
  const currentEquipStr = selectedEquipements.join(', ');
  const initialEquipStr = (this.initialValues.room_equipements || []).join(', ');
  if (currentEquipStr !== initialEquipStr) {
    updates.equipements = currentEquipStr;
  }
  
  // Détails des lits
  const currentDetailsLits = this.collectLitsDetails();
  if (currentDetailsLits !== (this.initialValues.room_details_lits || '')) {
    updates.details_lits = currentDetailsLits;
  }
  
  // Tarification
  const currentPricingData = this.collectRoomPricingData();
  const originalPricingJson = JSON.stringify(this.roomData.pricing_data || {});
  const currentPricingJson = JSON.stringify(currentPricingData);
  
  if (originalPricingJson !== currentPricingJson) {
    updates.pricing_data = currentPricingData;
  }
  
  // iCal - Injecter l'URL par défaut si aucun iCal n'est rempli
  let hasAnyRoomIcal = false;
  for (let i = 1; i <= 4; i++) {
    const input = document.getElementById(`ical-url-${i}-chambre`);
    if (input && input.value.trim() !== '') {
      hasAnyRoomIcal = true;
      break;
    }
  }
  
  if (!hasAnyRoomIcal) {
    const firstIcalInput = document.getElementById('ical-url-1-chambre');
    if (firstIcalInput) {
      firstIcalInput.value = this.DEFAULT_ICAL_URL;
    }
  }
  
  // Collecter les iCals modifiés
  const currentIcalValues = this.collectRoomIcalValues();
  
    this.roomIcalFieldMapping.forEach((fieldName, index) => {
    const currentValue = currentIcalValues[index] || '';
    const initialValue = this.initialValues[`room_${fieldName}`] || '';
    
    if (currentValue !== initialValue) {
      updates[fieldName] = currentValue;
    }
  });
  
    // 🆕 Upload des photos en staging vers des URLs temporaires (si applicable)
  try {
    if (this.roomCurrentPhotos.some(p => p._staged)) {
      this.showNotification('success', 'Envoi des photos en cours...');
      await this.uploadStagedPhotos(this.roomCurrentPhotos, 'chambre');
    }
  } catch (err) {
    console.error('❌ Erreur upload photos chambre :', err);
    this.showNotification('error', 'Échec de l\'envoi des photos : ' + err.message);
    return;
  }
  
  // Photos
  const originalPhotosJson = JSON.stringify(this.roomOriginalPhotos);
  const currentPhotosJson = JSON.stringify(this.roomCurrentPhotos);
  if (originalPhotosJson !== currentPhotosJson) {
    updates['photos-de-la-chambre'] = this.roomCurrentPhotos;
  }
  
  if (Object.keys(updates).length === 0) {
    this.showNotification('error', 'Aucune modification détectée');
    return;
  }
  
  const saveButton = document.querySelector('#button-save-modifications');
  const originalText = saveButton?.textContent;
  if (saveButton) {
    saveButton.disabled = true;
    saveButton.textContent = 'Enregistrement...';
  }
  
  try {
    const response = await fetch(`${window.CONFIG.API_URL}/update-room/${this.roomId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    
    const result = await response.json();
    
    if (response.ok && result.success) {
      if (updates.name !== undefined) {
        this.initialValues.room_name = updates.name;
        this.roomData.name = updates.name;
        const titleElement = document.getElementById('logement-name-edit');
        if (titleElement) titleElement.textContent = updates.name;
      }
      if (updates.description !== undefined) {
        this.initialValues.room_description = updates.description;
        this.roomData.description = updates.description;
      }
      if (updates.taille_chambre !== undefined) {
        this.initialValues.room_taille_chambre = updates.taille_chambre;
        this.roomData.taille_chambre = updates.taille_chambre;
      }
      if (updates.equipements !== undefined) {
        this.initialValues.room_equipements = selectedEquipements;
        this.roomData.equipements = updates.equipements;
      }
      if (updates.details_lits !== undefined) {
        this.initialValues.room_details_lits = updates.details_lits;
        this.roomData.details_lits = updates.details_lits;
      }
      if (updates.pricing_data !== undefined) {
        this.roomData.pricing_data = JSON.parse(JSON.stringify(updates.pricing_data));
        this.roomPricingData = JSON.parse(JSON.stringify(updates.pricing_data));
        this.initialValues.room_pricing_mode = updates.pricing_data.defaultPricing?.mode || 'fixed';
        this.initialValues.room_pricing_price = updates.pricing_data.defaultPricing?.price || 0;
        this.initialValues.room_pricing_min_nights = updates.pricing_data.defaultPricing?.minNights || 1;
        this.initialValues.room_pricing_prices_per_guest = JSON.stringify(updates.pricing_data.defaultPricing?.pricesPerGuest || []);
      }
            if (updates['photos-de-la-chambre'] !== undefined) {
        // Si le backend renvoie les vraies URLs Webflow (après re-hosting), les utiliser
        const freshPhotos = Array.isArray(result.fieldData?.['photos-de-la-chambre'])
          ? result.fieldData['photos-de-la-chambre']
          : this.roomCurrentPhotos;

        this.roomCurrentPhotos = JSON.parse(JSON.stringify(freshPhotos));
        this.roomOriginalPhotos = JSON.parse(JSON.stringify(freshPhotos));
        this.roomData.photos = JSON.parse(JSON.stringify(freshPhotos));
        this.initialValues.room_photos = JSON.parse(JSON.stringify(freshPhotos));

        // 🔧 Détruire Sortable et réinitialiser l'ordre DOM des blocs chambre
        if (this.roomSortableInstance) {
          this.roomSortableInstance.destroy();
          this.roomSortableInstance = null;
        }
        const container = document.querySelector('.images-grid.chambre');
        if (container) {
          for (let i = 1; i <= 5; i++) {
            const block = document.getElementById(`image-block-${i}-chambre`);
            if (block) container.appendChild(block);
          }
        }

        // Re-render avec les vraies URLs et l'ordre DOM remis à zéro
        this.displayRoomEditableGallery();
        if (window.innerWidth > 768) {
          setTimeout(() => this.initRoomSortable(), 100);
        }
      }
      
      // Mettre à jour les valeurs iCal initiales
      this.roomIcalFieldMapping.forEach((fieldName, index) => {
        const input = document.getElementById(`ical-url-${index + 1}-chambre`);
        if (input) {
          const currentValue = input.value.trim();
          this.initialValues[`room_${fieldName}`] = currentValue;
        }
      });
      // Mettre à jour les ical_urls dans roomData
      const updatedIcalUrls = [];
      for (let i = 1; i <= 4; i++) {
        const input = document.getElementById(`ical-url-${i}-chambre`);
        if (input && input.value.trim()) {
          updatedIcalUrls.push(input.value.trim());
        }
      }
      this.roomData.ical_urls = updatedIcalUrls;
      
      this.disableButtons();
      
      // 🆕 Message de succès combiné (informe sur les champs restants si applicable)
      if (hasEmptyErrors) {
        this.showNotification('success', "Modifications enregistrées, il reste des champs à remplir pour activer la vérification.");
      } else {
        this.showNotification('success', 'Modifications enregistrées avec succès !');
      }
    } else {
      throw new Error(result.error || 'Erreur lors de la sauvegarde');
    }
    
  } catch (error) {
    console.error('❌ Erreur sauvegarde chambre:', error);
    this.showNotification('error', 'Erreur lors de la sauvegarde : ' + error.message);
  } finally {
    if (saveButton) {
      saveButton.disabled = false;
      saveButton.textContent = originalText;
    }
  }
}

cancelRoomModifications() {
  if (this.validationManager) {
    this.validationManager.clearAllErrors();
  }
  
  // Restaurer nom et description
  const nameInput = document.getElementById('name-input-chambre');
  if (nameInput) nameInput.value = this.initialValues.room_name || '';
  
  const descInput = document.getElementById('texte-chambre');
  if (descInput) descInput.value = this.initialValues.room_description || '';
  
  // Restaurer taille via helper
  const parsed = PropertyEditor.parseTailleChambre(this.initialValues.room_taille_chambre || '');
  
  const voyageursInput = document.getElementById('voyageurs-input-chambre');
  if (voyageursInput) voyageursInput.value = parsed.voyageurs;
  
  const litsInput = document.getElementById('lits-input-chambre');
  if (litsInput) litsInput.value = parsed.lits;
  
  const tailleInput = document.getElementById('taille-chambre');
  if (tailleInput) tailleInput.value = parsed.tailleM2;
  
  // Restaurer équipements
  this.prefillRoomEquipements();
  
  // Restaurer détails lits
  this.roomData.details_lits = this.initialValues.room_details_lits || '';
  this.prefillLitsDetails();
  
  // Restaurer iCal
  const icalUrls = this.roomData.ical_urls || [];
  // Vider tous les inputs
  for (let i = 1; i <= 4; i++) {
    const input = document.getElementById(`ical-url-${i}-chambre`);
    if (input) input.value = '';
  }
  // Réafficher depuis les données sauvegardées
  this.displayRoomIcals();
  
  // Restaurer tarification
  if (this.roomData.pricing_data) {
    this.roomPricingData = JSON.parse(JSON.stringify(this.roomData.pricing_data));
  } else {
    this.roomPricingData = {
      defaultPricing: { mode: 'fixed', price: 0, minNights: 1, pricesPerGuest: [] },
      seasons: [],
      discounts: [],
      cleaning: { included: true }
    };
  }
  this.prefillRoomPricing();
  this.prefillRoomWeekend();
  this.displayRoomDiscounts();
  this.formatRoomPricingFields();
  
  // Restaurer la visibilité des blocs plateformes
  this.updateRoomPlatformBlocksVisibility();
  
  // Restaurer saisons
  this.hideAllRoomSeasonBlocks();
  this.displayRoomExistingSeasons();
  
  // Restaurer photos
  this.roomCurrentPhotos = JSON.parse(JSON.stringify(this.initialValues.room_photos || []));
  
  if (this.roomSortableInstance) {
    this.roomSortableInstance.destroy();
    this.roomSortableInstance = null;
  }
  
  const container = document.querySelector('.images-grid.chambre');
  if (container) {
    const blocks = [];
    for (let i = 1; i <= 5; i++) {
      const block = document.getElementById(`image-block-${i}-chambre`);
      if (block) blocks.push(block);
    }
    blocks.forEach(block => container.appendChild(block));
  }
  
  this.displayRoomEditableGallery();
  setTimeout(() => this.initRoomSortable(), 100);
  this.updateRoomAddPhotosButtonState();
  
  // Restaurer titre
  const titleElement = document.getElementById('logement-name-edit');
  if (titleElement) titleElement.textContent = this.initialValues.room_name || '';
  
  this.disableButtons();
}
  
  async loadPropertyData() {
    try {
      
      const response = await fetch(`${window.CONFIG.API_URL}/property-details-by-id/${this.propertyId}`);
      
      if (!response.ok) {
        throw new Error(`Erreur serveur: ${response.status}`);
      }
      
      this.propertyData = await response.json();
      
    } catch (error) {
      console.error('❌ Erreur chargement:', error);
    }
  }

  initFormFormatters() {
    
    // Attendre que Cleave soit chargé
    if (typeof Cleave === 'undefined') {
      // Le script est déjà dans Webflow, on attend juste qu'il soit prêt
      setTimeout(() => this.initFormFormatters(), 100);
      return;
    }
    
    this.setupDateFormatters();
    this.setupTimeFormatters();
    this.setupSuffixFormatters();

    // 🆕 NOUVEAU : Formater tous les champs au chargement
    setTimeout(() => {
    this.formatAllSuffixFields();
    }, 200);
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
      
      // 🆕 Ajouter la conversion en texte au blur
    input.addEventListener('blur', function() {
      const value = this.value;
      if (value && value.includes('/')) {
        const [jour, mois] = value.split('/');
        const moisNoms = ['', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 
                         'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
        
        const moisNum = parseInt(mois);
        if (moisNum >= 1 && moisNum <= 12) {
          // Stocker la valeur originale
          this.setAttribute('data-date-value', value);
          // Afficher en format texte
          this.value = `${parseInt(jour)} ${moisNoms[moisNum]}`;
        }
      }
    });
    
    // 🆕 Restaurer le format au focus
    input.addEventListener('focus', function() {
      const originalValue = this.getAttribute('data-date-value');
      if (originalValue) {
        this.value = originalValue;
      }
    });
  });
}
setupTimeFormatters() {
  const heureInputs = document.querySelectorAll('[data-format="heure-minute"]');
  
  heureInputs.forEach(input => {
    // Configuration Cleave pour le formatage de base
    const cleaveInstance = new Cleave(input, {
      blocks: [2, 2],
      delimiter: ':',
      numericOnly: true,
      delimiterLazyShow: true
    });
    
    input.placeholder = '00:00';
    
    // Fonction de validation réutilisable
    const validateAndCorrectTime = (value) => {
      if (!value) return value;
      
      // Extraire heures et minutes
      const parts = value.split(':');
      let heures = parseInt(parts[0]) || 0;
      let minutes = parseInt(parts[1]) || 0;
      
      // Appliquer les limites
      heures = Math.min(heures, 23);
      minutes = Math.min(minutes, 59);
      
      // Retourner le format correct
      return heures.toString().padStart(2, '0') + ':' + 
             minutes.toString().padStart(2, '0');
    };
    
    // Validation en temps réel (légère)
    input.addEventListener('input', function(e) {
      let value = e.target.value;
      
      // Validation rapide des heures si on a tapé 3 chiffres sans ':'
      if (value.length === 3 && !value.includes(':')) {
        const heures = parseInt(value.substring(0, 2));
        if (heures > 23) {
          // Insérer le ':' et corriger
          e.target.value = '23:' + value.charAt(2);
          // Mettre à jour Cleave
          cleaveInstance.setRawValue(e.target.value);
        }
      }
    });
    
    // Validation complète au blur
    input.addEventListener('blur', function() {
      let value = this.value;
      
      if (value) {
        // Format court (ex: "14" → "14:00")
        if (value.length <= 2 && !value.includes(':')) {
          value = value + ':00';
        }
        // Format incomplet (ex: "14:" → "14:00")
        else if (value.endsWith(':')) {
          value = value + '00';
        }
        
        // Valider et corriger
        this.value = validateAndCorrectTime(value);
      }
    });
  });
}
  
  setupSuffixFormatters() {
   // Euros
    document.querySelectorAll('[data-suffix="euro"], [data-suffix="euro-nuit"]').forEach(input => {
      // NOUVEAU : Mettre à jour data-raw-value aussi sur input
      input.addEventListener('input', function() {
        const value = this.value.replace(/[^\d]/g, '');
        this.setAttribute('data-raw-value', value || '0');
      });
      
      input.addEventListener('blur', function() {
        const value = this.value.replace(/[^\d]/g, '');
        if (value) {
          this.setAttribute('data-raw-value', value);
          const suffix = this.getAttribute('data-suffix') === 'euro' ? ' €' : ' € / nuit';
          this.value = value + suffix;
        } else {
          this.removeAttribute('data-raw-value');
          this.value = '';
        }
        
        // 🆕 NOUVEAU : Ajouter la validation
        if (window.propertyEditor && window.propertyEditor.validationManager) {
          window.propertyEditor.validationManager.validateFieldOnBlur(this.id);
        }
      });
      
      input.addEventListener('focus', function() {
        const rawValue = this.getAttribute('data-raw-value');
        if (rawValue) {
          this.value = rawValue;
        } else {
          this.value = this.value.replace(/[^\d]/g, '');
        }
      });
        });

    // Pourcentage
    document.querySelectorAll('[data-suffix="pourcent"]').forEach(input => {
      input.addEventListener('input', function() {
        const value = this.value.replace(/[^\d]/g, '');
        this.setAttribute('data-raw-value', value || '0');
      });
      
      input.addEventListener('blur', function() {
        const value = this.value.replace(/[^\d]/g, '');
        if (value) {
          this.setAttribute('data-raw-value', value);
          this.value = value + ' %';
        } else {
          this.removeAttribute('data-raw-value');
          this.value = '';
        }
      });
      
      input.addEventListener('focus', function() {
        const rawValue = this.getAttribute('data-raw-value');
        if (rawValue) {
          this.value = rawValue;
        } else {
          this.value = this.value.replace(/[^\d]/g, '');
        }
      });
    });
  }

  
  getRawValue(input) {
  // D'abord vérifier data-raw-value
  const dataValue = input.getAttribute('data-raw-value');
  if (dataValue) {
    return dataValue;
  }
  
  // Sinon extraire la valeur numérique actuelle
  const currentValue = input.value.replace(/[^\d]/g, '');
  return currentValue || '';
}
  
  getDateValue(input) {
    const dateValue = input.getAttribute('data-date-value');
    if (dateValue && dateValue.includes('/')) {
      return dateValue.replace('/', '-'); // "15/07" → "15-07"
    }
    return null;
  }
  
  getActivePlatforms() {
    const activePlatforms = [];
    
    // Vérifier chaque plateforme
    const platforms = [
      { id: 'airbnb', priceId: 'default-airbnb-price-input', linkId: 'annonce-airbnb-input' },
      { id: 'booking', priceId: 'default-booking-price-input', linkId: 'annonce-booking-input' },
      { id: 'other', priceId: 'default-other-price-input', linkId: 'annonce-gites-input' }
    ];
    
    platforms.forEach(({ id, priceId, linkId }) => {
      const priceInput = document.getElementById(priceId);
      const linkInput = document.getElementById(linkId);
      
      const price = parseInt(this.getRawValue(priceInput)) || 0;
      const link = linkInput?.value?.trim() || '';
      
      // La plateforme est active si elle a un prix ET un lien
      if (price > 0 && link !== '') {
        activePlatforms.push(id);
      }
    });
    
    return activePlatforms;
  }
  
  updatePlatformBlocksVisibility() {
    const activePlatforms = this.getActivePlatforms();
    
    // Pour les deux modales (add et edit)
    ['add', 'edit'].forEach(modalType => {
      const mainBloc = document.getElementById(`bloc-plateforme-${modalType}`);
      
      if (activePlatforms.length === 0) {
        // Aucune plateforme active : masquer le bloc entier
        if (mainBloc) mainBloc.style.display = 'none';
      } else {
        // Au moins une plateforme active : afficher le bloc principal
        if (mainBloc) mainBloc.style.display = 'block';
        
        // Gérer chaque plateforme individuellement
        ['airbnb', 'booking', 'other'].forEach(platform => {
          const platformBloc = document.getElementById(`bloc-${platform}-${modalType}`);
          if (platformBloc) {
            platformBloc.style.display = activePlatforms.includes(platform) ? 'flex' : 'none';
          }
        });
      }
    });
  }
  
  
  prefillForm() {
    
    // Masquer le bloc choix type de logement (déjà défini à la création)
    const blocChoixType = document.getElementById('bloc-choix-type-logement');
    if (blocChoixType) blocChoixType.style.display = 'none';
    
    // 1. Afficher le nom du logement
    const titleElement = document.getElementById('logement-name-edit');
    if (titleElement && this.propertyData.name) {
      titleElement.textContent = this.propertyData.name;
    }

    // NOUVEAU : Pré-remplir aussi l'input de modification du nom
    const nameInput = document.getElementById('name-input');
    if (nameInput && this.propertyData.name) {
      nameInput.value = this.propertyData.name;
    }


    this.displayStatusTag();
    
    // 2. Configuration des champs (facilement extensible)
    const fields = [
      { id: 'name-input', dataKey: 'name' },
      { id: 'cadeaux-input', dataKey: 'cadeaux' },
      { id: 'extras-field', dataKey: 'extras' },
      { id: 'description-logement-input', dataKey: 'description_logement' },
      { id: 'description-alentours-input', dataKey: 'description_alentours' },
      { id: 'code-enregistrement-input', dataKey: 'code_enregistrement' },
      { id: 'site-internet-input', dataKey: 'site_internet' },
      { id: 'inclus-reservation-input', dataKey: 'inclus_reservation' },
      { id: 'hote-input', dataKey: 'host_name' },
      { id: 'email-input', dataKey: 'email' },
      { id: 'telephone-input', dataKey: 'telephone' },
      { id: 'annonce-airbnb-input', dataKey: 'annonce_airbnb' },
      { id: 'annonce-booking-input', dataKey: 'annonce_booking' },
      { id: 'annonce-gites-input', dataKey: 'annonce_gites' },
      { id: 'page-google', dataKey: 'page_google' }
    ];
    
    // 3. Pré-remplir et sauvegarder les valeurs initiales
    fields.forEach(field => {
      const input = document.getElementById(field.id);
      if (input) {
        const value = this.propertyData[field.dataKey] || '';
        input.value = value;
        this.initialValues[field.dataKey] = value;
      }
    });

    this.initialValues.extras = this.propertyData.extras || '';
    this.prefillAddress();
    this.prefillDefaultPricing();

     // NOUVEAU : Pré-remplir les options de ménage
    this.prefillCleaningOptions();
    // NOUVEAU : Pré-remplir l'option prix week-end
    this.prefillWeekendOptions();
    this.prefillExtraGuestsOptions();
    this.prefillHoraires();
    this.prefillCancellationPolicy();
    this.prefillComplexFields();

    // Pré-remplir les autres champs simples
    //this.prefillSimpleFields();
    this.setupFieldListeners();
    this.displayImageGallery();
    this.displayHostImage();
    this.setupHostPhotoButton();

    // 🆕 Appliquer l'opacité initiale après un court délai
    setTimeout(() => {
      this.setupPriceOpacityHandlers();
    }, 100);
  }

  // 🆕 NOUVELLE MÉTHODE : Configurer TOUS les boutons Tally avec les paramètres
setupTallyButton() {
  
  // Chercher TOUS les boutons avec l'attribut data-tally-url
  const tallyButtons = document.querySelectorAll('[data-tally-url]:not(.add-photos)');
  
  if (tallyButtons.length === 0) {
    console.log('Pas de bouton Tally sur cette page');
    return;
  }
  
  // Préparer les paramètres à passer aux formulaires
  const params = new URLSearchParams({
    property_id: this.propertyId || '',
    property_name: this.propertyData.name || '',
    email: this.propertyData.email || ''
  });
  
  // Configurer chaque bouton
  tallyButtons.forEach((button, index) => {
    // Récupérer l'URL de base depuis l'attribut de CE bouton
    const tallyBaseUrl = button.dataset.tallyUrl;
    
    if (!tallyBaseUrl) {
      console.warn(`⚠️ Bouton ${index + 1} sans URL Tally`);
      return;
    }
    
    // Construire l'URL finale avec les paramètres
    const finalUrl = `${tallyBaseUrl}?${params.toString()}`;
    
    // Ajouter le listener pour ouvrir le formulaire avec les paramètres
    button.addEventListener('click', function(e) {
      e.preventDefault();
      window.open(finalUrl, '_blank');
    });
  });
}
  
  prefillAddress() {
    
    const address = this.propertyData.address || '';
    
    if (address) {
      // Parser l'adresse "Ville, Pays, Rue"
      const parts = address.split(',').map(part => part.trim());
      
      if (parts.length >= 2) {
        const villeInput = document.getElementById('ville-input');
        const paysInput = document.getElementById('pays-input');
        const rueInput = document.getElementById('rue-input');
        
        if (villeInput) villeInput.value = parts[0] || '';
        if (paysInput) paysInput.value = parts[1] || '';
        if (rueInput) rueInput.value = parts.slice(2).join(', ') || ''; // Au cas où la rue contient des virgules
      }
    }
    
    this.initialValues.address = address;
  }

  // 🆕 NOUVELLE MÉTHODE : Afficher le bon tag selon le statut
  displayStatusTag() {
    const status = this.propertyData.verification_status || 'pending-none';
    
    // Récupérer les deux tags
    const tagPublished = document.getElementById('tag-published');
    const tagPending = document.getElementById('tag-pending');
    
    if (!tagPublished || !tagPending) {
      console.warn('⚠️ Tags de statut non trouvés dans le DOM');
      return;
    }
    
    // Afficher le bon tag selon le statut
    if (status === 'published') {
      tagPublished.style.display = 'block'; // ou 'flex' selon votre CSS
      tagPending.style.display = 'none';
    } else {
      tagPublished.style.display = 'none';
      tagPending.style.display = 'block'; // ou 'flex' selon votre CSS
    }
  }
    
  initSeasonManagement() {
    
    // Initialiser les formatters
    this.initFormFormatters();
    
    // Configuration des boutons
    this.setupSeasonButtons();

    this.setupSeasonPeriodButtons();
    
    // Cacher tous les blocs saison par défaut
    this.hideAllSeasonBlocks();
    
    // Afficher les saisons existantes
    this.displayExistingSeasons();
  }
  
  loadPricingData() {
  if (this.propertyData.pricing_data) {
    this.pricingData = JSON.parse(JSON.stringify(this.propertyData.pricing_data));
  } else {
    // Structure complète avec les bonnes valeurs par défaut
    this.pricingData = {
      defaultPricing: {
        price: 0,
        minNights: 0,
        platformPrices: {
          airbnb: 0,
          booking: 0,
          other: 0
        }
      },
      platformPricing: {
        usePercentage: false,
        defaultDiscount: 17
      },
      seasons: [],
      cleaning: { 
        included: true
      },
      discounts: [],
      capacity: 0,
      caution: '',
      acompte: 0
    };
  }
  
}
  
  hideAllSeasonBlocks() {
    for (let i = 1; i <= 4; i++) {
      const block = document.getElementById(`season-${i}`);
      if (block) {
        block.style.display = 'none';
      }
    }
  }
  
  displayExistingSeasons() {
    
    if (this.pricingData && this.pricingData.seasons && this.pricingData.seasons.length > 0) {

      
      this.pricingData.seasons.forEach((season, index) => {

        this.displaySeasonBlock(season, index);
      });
    } else {
      console.log('❌ Aucune saison à afficher');
    }
  }
  
  displaySeasonBlock(season, index) {
    const seasonNum = index + 1;

    
    const seasonBlock = document.getElementById(`season-${seasonNum}`);
    
    if (!seasonBlock) {
      console.log(`❌ Bloc season-${seasonNum} non trouvé dans le DOM`);
      return;
    }
    

    seasonBlock.style.display = 'flex'; // ou 'block' selon votre CSS
    
    // Utiliser des IDs uniques avec le numéro
    const nameElement = document.getElementById(`name-season-${seasonNum}`);
    if (nameElement) {
      nameElement.textContent = season.name;

    } else {
      console.log(`❌ Élément name-season-${seasonNum} non trouvé`);
    }
    
    const priceElement = document.getElementById(`prix-nuit-season-${seasonNum}`);
    if (priceElement) {
      priceElement.textContent = season.price;
    }
    
    // Prix par semaine
    const weekPriceElement = document.getElementById(`prix-semaine-season-${seasonNum}`);
    if (weekPriceElement) {
      const weekPrice = this.calculateWeekPrice(season.price, this.pricingData.discounts);
      weekPriceElement.textContent = weekPrice;
    }
    
    // Dates — trier chronologiquement puis afficher avec séparateur " - "
    const datesElement = document.getElementById(`dates-season-${seasonNum}`);
    if (datesElement && season.periods && season.periods.length > 0) {
      // Trier les périodes chronologiquement pour l'affichage
      const sortedPeriods = [...season.periods].sort((a, b) => {
        const [dayA, monthA] = a.start.split('-').map(Number);
        const [dayB, monthB] = b.start.split('-').map(Number);
        return (monthA * 100 + dayA) - (monthB * 100 + dayB);
      });
      
      const dateRanges = sortedPeriods.map(period => 
        this.formatDateRange(period.start, period.end)
      );
      datesElement.textContent = dateRanges.join(" - ");
    }
    
    // Nuits minimum
    const minNightsElement = document.getElementById(`nuit-minimum-${seasonNum}`);
    if (minNightsElement) {
      minNightsElement.textContent = season.minNights || 1;
    }
  }
  
  formatDateRange(start, end) {
    // Convertir "15-07" en "du 15 juillet au 20 août"
    const months = [
      "janvier", "février", "mars", "avril", "mai", "juin",
      "juillet", "août", "septembre", "octobre", "novembre", "décembre"
    ];
    
    const [startDay, startMonth] = start.split("-");
    const [endDay, endMonth] = end.split("-");
    
    return `du ${parseInt(startDay)} ${months[parseInt(startMonth) - 1]} au ${parseInt(endDay)} ${months[parseInt(endMonth) - 1]}`;
  }

  calculateWeekPrice(nightlyPrice, discounts) {
      let weekPrice = nightlyPrice * 7;
      
      if (discounts && discounts.length > 0) {
        const applicableDiscounts = discounts.filter(discount => discount.nights <= 7);
  
        if (applicableDiscounts.length > 0) {
          // Trier par nombre de nuits décroissant pour prendre la plus élevée
          applicableDiscounts.sort((a, b) => b.nights - a.nights);
          
          // Prendre la première (qui sera la plus élevée après le tri)
          const weekDiscount = applicableDiscounts[0];
          weekPrice = weekPrice * (1 - weekDiscount.percentage / 100);
        }
      }
      
      return Math.round(weekPrice);
  }
  
  setupSeasonButtons() {
  // Bouton ajouter saison
  const addSeasonBtn = document.getElementById('button-add-season');
  if (addSeasonBtn) {
    addSeasonBtn.addEventListener('click', (e) => {
      e.preventDefault();
      this.openAddSeasonModal();
    });
  }
  
  // Boutons dans la modal d'ajout
  const validateAddBtn = document.getElementById('button-validate-add-season');
  if (validateAddBtn) {
    validateAddBtn.addEventListener('click', (e) => {
      e.preventDefault();
      this.validateAndAddSeason();
    });
  } 
    
  // 🆕 Boutons modifier pour chaque saison (1 à 4)
  for (let i = 1; i <= 4; i++) {
    const editBtn = document.getElementById(`edit-${i}`);
    if (editBtn) {
      editBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.openEditSeasonModal(i - 1);
      });
    }
    
    // 🆕 NOUVEAU : Boutons supprimer pour chaque saison
    const deleteBtn = document.getElementById(`delete-${i}`);
    if (deleteBtn) {
      deleteBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.removeSeason(i - 1);
      });
    }
  }
    
  // 🆕 Bouton valider dans la modal de modification
  const validateEditBtn = document.getElementById('button-validate-edit-season');
  if (validateEditBtn) {
    validateEditBtn.addEventListener('click', (e) => {
      e.preventDefault();
      this.validateAndEditSeason();
    });
  }
}

  // === GESTION DES PLAGES DE DATES MULTIPLES ===

setupSeasonPeriodButtons() {
  // --- Modal AJOUT ---
  const addPlageBtn = document.getElementById('btn-add-plage-dates');
  if (addPlageBtn) {
    addPlageBtn.addEventListener('click', (e) => {
      e.preventDefault();
      this.addPlageDates(false);
    });
  }
  
  // Boutons supprimer pour plages 2 à 5 (modal ajout)
  for (let i = 2; i <= 5; i++) {
    const deleteBtn = document.getElementById(`btn-delete-plage-${i}`);
    if (deleteBtn) {
      deleteBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.removePlageDates(i, false);
      });
    }
  }

  // --- Modal EDIT ---
  const addPlageBtnEdit = document.getElementById('btn-add-plage-dates-edit');
  if (addPlageBtnEdit) {
    addPlageBtnEdit.addEventListener('click', (e) => {
      e.preventDefault();
      this.addPlageDates(true);
    });
  }
  
  // Boutons supprimer pour plages 2 à 5 (modal edit)
  for (let i = 2; i <= 5; i++) {
    const deleteBtn = document.getElementById(`btn-delete-plage-${i}-edit`);
    if (deleteBtn) {
      deleteBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.removePlageDates(i, true);
      });
    }
  }
}

addPlageDates(isEdit = false) {
  const suffix = isEdit ? '-edit' : '';
  
  // Trouver le prochain bloc masqué
  for (let i = 2; i <= 5; i++) {
    const block = document.getElementById(`bloc-plage-dates-${i}${suffix}`);
    if (block && block.style.display === 'none') {
      block.style.display = 'flex';
      
      // Initialiser Cleave UNIQUEMENT sur les 2 nouveaux inputs (pas tout le DOM)
      const startInput = document.getElementById(`season-date-start-input-${i}${suffix}`);
      const endInput = document.getElementById(`season-date-end-input-${i}${suffix}`);
      
      [startInput, endInput].forEach(input => {
        if (input && typeof Cleave !== 'undefined') {
          new Cleave(input, {
            date: true,
            delimiter: '/',
            datePattern: ['d', 'm'],
            blocks: [2, 2],
            numericOnly: true
          });
          
          // Ajouter les mêmes listeners blur/focus que setupDateFormatters
          input.addEventListener('blur', function() {
            const value = this.value;
            if (value && value.includes('/')) {
              const [jour, mois] = value.split('/');
              const moisNoms = ['', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 
                               'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
              const moisNum = parseInt(mois);
              if (moisNum >= 1 && moisNum <= 12) {
                this.setAttribute('data-date-value', value);
                this.value = `${parseInt(jour)} ${moisNoms[moisNum]}`;
              }
            }
          });
          
          input.addEventListener('focus', function() {
            const originalValue = this.getAttribute('data-date-value');
            if (originalValue) {
              this.value = originalValue;
            }
          });
        }
      });
      
      break;
    }
  }
  
  // Masquer le bouton "Ajouter" si on atteint 5 plages
  const visibleCount = this.countVisiblePlages(isEdit);
  if (visibleCount >= 5) {
    const addBtn = document.getElementById(`btn-add-plage-dates${suffix}`);
    if (addBtn) addBtn.style.display = 'none';
  }
}

removePlageDates(index, isEdit = false) {
  const suffix = isEdit ? '-edit' : '';
  const block = document.getElementById(`bloc-plage-dates-${index}${suffix}`);
  
  if (block) {
    // Vider les inputs
    const startInput = document.getElementById(`season-date-start-input-${index}${suffix}`);
    const endInput = document.getElementById(`season-date-end-input-${index}${suffix}`);
    
    [startInput, endInput].forEach(input => {
      if (input) {
        input.value = '';
        input.removeAttribute('data-raw-value');
        input.removeAttribute('data-date-value');
      }
    });
    
    // Masquer le bloc
    block.style.display = 'none';
    
    // Nettoyer les erreurs éventuelles
    if (this.validationManager) {
      this.validationManager.hideFieldError(`season-date-start-input-${index}${suffix}`);
      this.validationManager.hideFieldError(`season-date-end-input-${index}${suffix}`);
    }
  }
  
  // Réafficher le bouton "Ajouter"
  const addBtn = document.getElementById(`btn-add-plage-dates${suffix}`);
  if (addBtn) addBtn.style.display = '';
}

countVisiblePlages(isEdit = false) {
  const suffix = isEdit ? '-edit' : '';
  let count = 0;
  for (let i = 1; i <= 5; i++) {
    const block = document.getElementById(`bloc-plage-dates-${i}${suffix}`);
    if (block && block.style.display !== 'none') {
      count++;
    }
  }
  return count;
}

  displayHostImage() {    
    const hostImageUrl = this.propertyData.host_image || '';
    const blocEmptyHote = document.getElementById('bloc-empty-hote');
    const blocHote = document.getElementById('bloc-hote');
    
    // bloc-empty-hote est obsolète : on le cache s'il existe encore
    if (blocEmptyHote) blocEmptyHote.style.display = 'none';
    
    // bloc-hote toujours visible (pour que les boutons restent accessibles)
    if (blocHote) blocHote.style.display = 'flex';
    
    const hasPhoto = !!(hostImageUrl && String(hostImageUrl).trim());
    
    // 🆕 Afficher le bon bouton selon l'état
    const addButton = document.getElementById('button-add-host-photo');
    const changeButton = document.getElementById('button-change-host-photo');
    if (addButton) addButton.style.display = hasPhoto ? 'none' : '';
    if (changeButton) changeButton.style.display = hasPhoto ? '' : 'none';
    
    // Mettre à jour l'image si présente
    if (hasPhoto) {
      const imageHoteElement = document.getElementById('image-hote');
      if (imageHoteElement) {
        if (imageHoteElement.tagName === 'IMG') {
          imageHoteElement.src = hostImageUrl;
          imageHoteElement.alt = 'Photo de l\'hôte';
        } else {
          const imgElement = imageHoteElement.querySelector('img');
          if (imgElement) {
            imgElement.src = hostImageUrl;
            imgElement.alt = 'Photo de l\'hôte';
          }
        }
      }
    }
  }

  
  displayImageGallery() { 
  const imagesGallery = this.propertyData.images_gallery || [];

  const blocEmpty = document.getElementById('bloc-empty-photos');
  const blocPhotos = document.getElementById('bloc-photos-logement');
  
  // bloc-empty-photos est obsolète : on le cache s'il existe encore
  if (blocEmpty) blocEmpty.style.display = 'none';
  
  // bloc-photos-logement toujours visible (bouton d'ajout accessible même sans photos)
  if (blocPhotos) blocPhotos.style.display = 'block';
  // Masquer tous les blocs image par défaut
  for (let i = 1; i <= 20; i++) {
    const imageBlock = document.getElementById(`image-block-${i}`);
    if (imageBlock) {
      imageBlock.style.display = 'none';
    }
  }
  
  if (!Array.isArray(imagesGallery) || imagesGallery.length === 0) {
    return;
  }
  
  
  // Afficher chaque image (max 20)
  const maxImages = Math.min(imagesGallery.length, 20);
  
  for (let i = 0; i < maxImages; i++) {
    const imageData = imagesGallery[i];
    const imageBlock = document.getElementById(`image-block-${i + 1}`);
    
    if (imageBlock && imageData) {
      // Extraire l'URL de l'image
      let imageUrl = null;
      
      // Format Webflow v2 API
      if (typeof imageData === 'object' && imageData.url) {
        imageUrl = imageData.url;
      } 
      // Si c'est directement une URL string
      else if (typeof imageData === 'string') {
        imageUrl = imageData;
      }
      
      if (imageUrl) {
        // Chercher l'élément img dans le bloc
        const imgElement = imageBlock.querySelector('img');
        
        if (imgElement) {
          imgElement.src = imageUrl;
          imgElement.alt = `Image ${i + 1}`;
          
          // Optionnel : Ajouter lazy loading pour performance
          if (i > 3) { // Lazy load après les 4 premières images
            imgElement.loading = 'lazy';
          }
        }
        
        // Afficher le bloc
        imageBlock.style.display = 'block'; // ou 'flex' selon votre CSS
      }
    }
  }
}

  openAddSeasonModal() {
    // Vérifier qu'on a moins de 4 saisons
    if (this.pricingData.seasons.length >= 4) {
      this.showNotification('error', 'Maximum 4 saisons autorisées');
      return;
    }
    
    // Réinitialiser les champs de la modal
    this.resetSeasonModal();
    
    // NOUVEAU : Mettre à jour la visibilité des blocs plateformes
    this.updatePlatformBlocksVisibility();
    
    // Configurer les listeners de validation
    this.setupSeasonValidationListeners(false);
    
    // Votre code pour afficher la modal
    const modal = document.getElementById('modal-add-season');
    if (modal) {
      modal.style.display = 'flex';
      modal.style.opacity = '1';
      const popup = modal.querySelector('.bloc-popup');
      if (popup) {
        popup.style.opacity = '1';
        popup.style.transform = 'none';
      }
    }
  }

  // 🆕 Ouvrir la modal de modification
openEditSeasonModal(seasonIndex) {

  this.resetEditSeasonModal();
  
  // Vérifier que la saison existe
  if (!this.pricingData.seasons[seasonIndex]) {
    console.error('❌ Saison non trouvée à l\'index', seasonIndex);
    return;
  }

  this.updatePlatformBlocksVisibility();
  
  // NOUVEAU : Nettoyer les erreurs de la modal de modification uniquement
  if (this.validationManager) {
    const editModalFields = [
      'season-name-input-edit',
      'season-date-start-input-edit',
      'season-date-end-input-edit',
      'season-price-input-edit',
      'season-min-nights-input-edit',
      'season-airbnb-price-input-edit',
      'season-booking-price-input-edit',
      'season-other-price-input-edit'
    ];
    
    editModalFields.forEach(id => {
      this.validationManager.hideFieldError(id);
    });
  }
  
  // Stocker l'index de la saison en cours de modification
  this.editingSeasonIndex = seasonIndex;
  const season = this.pricingData.seasons[seasonIndex];
  
  // Pré-remplir les champs avec les valeurs actuelles
  const nameInput = document.getElementById('season-name-input-edit');
  if (nameInput) nameInput.value = season.name;
  
  // Pré-remplir TOUTES les plages de dates
  if (season.periods && season.periods.length > 0) {
    season.periods.forEach((period, i) => {
      const index = i + 1; // bloc-plage-dates-1, bloc-plage-dates-2, etc.
      
      // Afficher le bloc si i > 0 (le bloc 1 est toujours visible)
      if (index > 1) {
        const block = document.getElementById(`bloc-plage-dates-${index}-edit`);
        if (block) block.style.display = 'flex'; // ou '' selon votre CSS
      }
      
      const startInput = document.getElementById(`season-date-start-input-${index}-edit`);
      const endInput = document.getElementById(`season-date-end-input-${index}-edit`);
      
      if (startInput) {
        const [day, month] = period.start.split('-');
        startInput.value = `${day}/${month}`;
        startInput.setAttribute('data-date-value', `${day}/${month}`);
      }
      
      if (endInput) {
        const [day, month] = period.end.split('-');
        endInput.value = `${day}/${month}`;
        endInput.setAttribute('data-date-value', `${day}/${month}`);
      }
    });

    // Masquer le bouton "Ajouter" si 5 plages
    if (season.periods.length >= 5) {
      const addBtn = document.getElementById('btn-add-plage-dates-edit');
      if (addBtn) addBtn.style.display = 'none';
    }
  }
  
  // Prix
  const priceInput = document.getElementById('season-price-input-edit');
  if (priceInput) {
    priceInput.value = season.price;
    priceInput.setAttribute('data-raw-value', season.price);
  }
  
  // Nuits minimum
  const minNightsInput = document.getElementById('season-min-nights-input-edit');
  if (minNightsInput) {
    minNightsInput.value = season.minNights || 1;
    minNightsInput.setAttribute('data-raw-value', season.minNights || 1);
  }

  // NOUVEAU : Pré-remplir les prix plateformes
  if (season.platformPrices) {
    const platformInputs = {
      'season-airbnb-price-input-edit': season.platformPrices.airbnb || 0,
      'season-booking-price-input-edit': season.platformPrices.booking || 0,
      'season-other-price-input-edit': season.platformPrices.other || 0
    };
    
    Object.entries(platformInputs).forEach(([inputId, value]) => {
      const input = document.getElementById(inputId);
      if (input) {
        input.value = value;
        input.setAttribute('data-raw-value', value);
      }
    });
  }
  
  // Configurer les listeners de validation
  this.setupSeasonValidationListeners(true);
  
  // Afficher la modal
  const modal = document.getElementById('modal-edit-season');
  if (modal) {
    modal.style.display = 'flex';
    modal.style.opacity = '1';
    const popup = modal.querySelector('.bloc-popup');
    if (popup) {
      popup.style.opacity = '1';
      popup.style.transform = 'none';
    }
  }
}
  
resetSeasonModal() {
  const fields = [
    'season-name-input',
    'season-price-input',
    'season-min-nights-input'
  ];
  
  fields.forEach(fieldId => {
    const input = document.getElementById(fieldId);
    if (input) {
      input.value = '';
      input.removeAttribute('data-raw-value');
      input.removeAttribute('data-date-value');
    }
  });

  // Réinitialiser TOUTES les plages de dates (1 à 5)
  for (let i = 1; i <= 5; i++) {
    const startInput = document.getElementById(`season-date-start-input-${i}`);
    const endInput = document.getElementById(`season-date-end-input-${i}`);
    
    [startInput, endInput].forEach(input => {
      if (input) {
        input.value = '';
        input.removeAttribute('data-raw-value');
        input.removeAttribute('data-date-value');
      }
    });

    // Masquer les blocs 2 à 5, garder le bloc 1 visible
    if (i > 1) {
      const block = document.getElementById(`bloc-plage-dates-${i}`);
      if (block) block.style.display = 'none';
    }
  }

  // Réafficher le bouton "Ajouter une plage"
  const addBtn = document.getElementById('btn-add-plage-dates');
  if (addBtn) addBtn.style.display = '';

  // Réinitialiser les prix plateformes
  const platformIds = [
    'season-airbnb-price-input',
    'season-booking-price-input',
    'season-other-price-input'
  ];
  platformIds.forEach(id => {
    const input = document.getElementById(id);
    if (input) {
      input.value = '';
      input.removeAttribute('data-raw-value');
    }
  });
}

validateAndAddSeason() {
  
  // Validation complète avec ValidationManager
  if (this.validationManager && !this.validationManager.validateSeason(false)) {
    console.log('❌ Validation échouée');
    return;
  }
  
  // Récupérer les valeurs des champs
  const seasonData = this.getSeasonFormData();
  
  // Créer l'objet saison pour le JSON
  // Trier les périodes chronologiquement (par mois de début)
  const sortedPeriods = [...seasonData.periods].sort((a, b) => {
    const [dayA, monthA] = a.start.split('-').map(Number);
    const [dayB, monthB] = b.start.split('-').map(Number);
    return (monthA * 100 + dayA) - (monthB * 100 + dayB);
  });

  const newSeason = {
    name: seasonData.name,
    price: parseInt(seasonData.price),
    minNights: parseInt(seasonData.minNights) || 1,
    periods: sortedPeriods
  };
  
  // NOUVEAU : Ajouter les prix plateformes s'ils existent
  const airbnb = parseInt(seasonData.airbnbPrice) || 0;
  const booking = parseInt(seasonData.bookingPrice) || 0;
  const other = parseInt(seasonData.otherPrice) || 0;
  
  if (airbnb > 0 || booking > 0 || other > 0) {
    newSeason.platformPrices = {
      airbnb: airbnb,
      booking: booking,
      other: other
    };
  }
  
  // Ajouter au JSON
  this.pricingData.seasons.push(newSeason);
  
  // Afficher immédiatement le bloc
  const seasonIndex = this.pricingData.seasons.length - 1;
  this.displaySeasonBlock(newSeason, seasonIndex);
  
  // Fermer la modal
  this.closeSeasonModal();
  
  // Activer les boutons de sauvegarde
  this.enableButtons();
}

// 🆕 Valider et sauvegarder les modifications de la saison
validateAndEditSeason() {
  
  // Vérifier qu'on a bien un index
  if (this.editingSeasonIndex === undefined || this.editingSeasonIndex === null) {
    console.error('❌ Aucune saison en cours de modification');
    return;
  }
  
  // Validation complète avec ValidationManager
  if (this.validationManager && !this.validationManager.validateSeason(true)) {
    console.log('❌ Validation échouée');
    return;
  }
  
  // Récupérer les valeurs des champs
  const seasonData = this.getEditSeasonFormData();
  
  // Mettre à jour la saison existante
  // Trier les périodes chronologiquement
  const sortedPeriods = [...seasonData.periods].sort((a, b) => {
    const [dayA, monthA] = a.start.split('-').map(Number);
    const [dayB, monthB] = b.start.split('-').map(Number);
    return (monthA * 100 + dayA) - (monthB * 100 + dayB);
  });

  const updatedSeason = {
    name: seasonData.name,
    price: parseInt(seasonData.price),
    minNights: parseInt(seasonData.minNights) || 1,
    periods: sortedPeriods
  };
  
  // NOUVEAU : Ajouter les prix plateformes s'ils existent
  const airbnb = parseInt(seasonData.airbnbPrice) || 0;
  const booking = parseInt(seasonData.bookingPrice) || 0;
  const other = parseInt(seasonData.otherPrice) || 0;
  
  if (airbnb > 0 || booking > 0 || other > 0) {
    updatedSeason.platformPrices = {
      airbnb: airbnb,
      booking: booking,
      other: other
    };
  }
  
  // Remplacer la saison dans le tableau
  this.pricingData.seasons[this.editingSeasonIndex] = updatedSeason;
  
  // Mettre à jour l'affichage
  this.displaySeasonBlock(updatedSeason, this.editingSeasonIndex);
  
  // Fermer la modal
  this.closeEditSeasonModal();
  
  // Activer les boutons de sauvegarde
  this.enableButtons();
}
  
getSeasonFormData() {
  // Récupérer toutes les plages de dates visibles
  const periods = [];
  for (let i = 1; i <= 5; i++) {
    const startInput = document.getElementById(`season-date-start-input-${i}`);
    const endInput = document.getElementById(`season-date-end-input-${i}`);
    
    // Vérifier que le bloc est visible (pas display:none)
    const block = document.getElementById(`bloc-plage-dates-${i}`);
    if (!block || block.style.display === 'none') continue;
    
    const start = this.getDateValue(startInput);
    const end = this.getDateValue(endInput);
    
    if (start && end) {
      periods.push({ start, end });
    }
  }

  return {
    name: document.getElementById('season-name-input')?.value.trim(),
    periods: periods,
    price: this.getRawValue(document.getElementById('season-price-input')),
    minNights: this.getRawValue(document.getElementById('season-min-nights-input')) || '1',
    airbnbPrice: this.getRawValue(document.getElementById('season-airbnb-price-input')) || '0',
    bookingPrice: this.getRawValue(document.getElementById('season-booking-price-input')) || '0',
    otherPrice: this.getRawValue(document.getElementById('season-other-price-input')) || '0'
  };
}

  // 🆕 Récupérer les données du formulaire de modification
getEditSeasonFormData() {
  // Récupérer toutes les plages de dates visibles
  const periods = [];
  for (let i = 1; i <= 5; i++) {
    const startInput = document.getElementById(`season-date-start-input-${i}-edit`);
    const endInput = document.getElementById(`season-date-end-input-${i}-edit`);
    
    // Vérifier que le bloc est visible
    const block = document.getElementById(`bloc-plage-dates-${i}-edit`);
    if (!block || block.style.display === 'none') continue;
    
    const start = this.getDateValue(startInput);
    const end = this.getDateValue(endInput);
    
    if (start && end) {
      periods.push({ start, end });
    }
  }

  return {
    name: document.getElementById('season-name-input-edit')?.value.trim(),
    periods: periods,
    price: this.getRawValue(document.getElementById('season-price-input-edit')),
    minNights: this.getRawValue(document.getElementById('season-min-nights-input-edit')) || '1',
    airbnbPrice: this.getRawValue(document.getElementById('season-airbnb-price-input-edit')) || '0',
    bookingPrice: this.getRawValue(document.getElementById('season-booking-price-input-edit')) || '0',
    otherPrice: this.getRawValue(document.getElementById('season-other-price-input-edit')) || '0'
  };
}
  
closeSeasonModal() {
  const modal = document.getElementById('modal-add-season');
  if (modal) {
    modal.style.display = 'none';
    modal.style.opacity = '1';
    const popup = modal.querySelector('.bloc-popup');
    if (popup) {
      popup.style.opacity = '1';
      popup.style.transform = 'none';
    }
  }
  this.resetSeasonModal();
  
  // Nettoyer les erreurs
  if (this.validationManager) {
    ['season-name-input', 'season-date-start-input', 'season-date-end-input', 
     'season-price-input', 'season-min-nights-input',
     'season-airbnb-price-input', 'season-booking-price-input', 'season-other-price-input'].forEach(id => {
      this.validationManager.hideFieldError(id);
    });
  }
}

  // 🆕 Fermer la modal de modification
  closeEditSeasonModal() {
    const modal = document.getElementById('modal-edit-season');
    if (modal) {
      modal.style.display = 'none';
      modal.style.opacity = '1';
      const popup = modal.querySelector('.bloc-popup');
      if (popup) {
        popup.style.opacity = '1';
        popup.style.transform = 'none';
      }
    }
    
    // NOUVEAU : Nettoyer toutes les erreurs de la modal de modification
    if (this.validationManager) {
      const editModalFields = [
        'season-name-input-edit',
        'season-date-start-input-edit',
        'season-date-end-input-edit',
        'season-price-input-edit',
        'season-min-nights-input-edit',
        'season-airbnb-price-input-edit',
        'season-booking-price-input-edit',
        'season-other-price-input-edit'
      ];
      
      editModalFields.forEach(id => {
        this.validationManager.hideFieldError(id);
      });
    }
    
    this.resetEditSeasonModal();
    this.editingSeasonIndex = null;
  }

// 🆕 Réinitialiser les champs de la modal de modification
resetEditSeasonModal() {
  const fields = [
    'season-name-input-edit',
    'season-price-input-edit',
    'season-min-nights-input-edit'
  ];
  
  fields.forEach(fieldId => {
    const input = document.getElementById(fieldId);
    if (input) {
      input.value = '';
      input.removeAttribute('data-raw-value');
      input.removeAttribute('data-date-value');
    }
  });

  // Réinitialiser TOUTES les plages de dates (1 à 5)
  for (let i = 1; i <= 5; i++) {
    const startInput = document.getElementById(`season-date-start-input-${i}-edit`);
    const endInput = document.getElementById(`season-date-end-input-${i}-edit`);
    
    [startInput, endInput].forEach(input => {
      if (input) {
        input.value = '';
        input.removeAttribute('data-raw-value');
        input.removeAttribute('data-date-value');
      }
    });

    // Masquer les blocs 2 à 5, garder le bloc 1 visible
    if (i > 1) {
      const block = document.getElementById(`bloc-plage-dates-${i}-edit`);
      if (block) block.style.display = 'none';
    }
  }

  // Réafficher le bouton "Ajouter une plage"
  const addBtn = document.getElementById('btn-add-plage-dates-edit');
  if (addBtn) addBtn.style.display = '';

  const platformIds = [
    'season-airbnb-price-input-edit',
    'season-booking-price-input-edit',
    'season-other-price-input-edit'
  ];
  platformIds.forEach(id => {
    const input = document.getElementById(id);
    if (input) {
      input.value = '';
      input.removeAttribute('data-raw-value');
    }
  });
}

// 🆕 NOUVELLE MÉTHODE : Supprimer une saison
removeSeason(index) {
  
  // Supprimer du tableau
  this.pricingData.seasons.splice(index, 1);
  
  // Réafficher toutes les saisons (gère automatiquement la réorganisation)
  this.hideAllSeasonBlocks();
  this.displayExistingSeasons();
  
  // Activer les boutons de sauvegarde
  this.enableButtons();
}

  
  setupSeasonValidationListeners(isEdit = false) {
    const suffix = isEdit ? '-edit' : '';
    
    // Prix direct - validation au blur seulement
    const priceInput = document.getElementById(`season-price-input${suffix}`);
    if (priceInput) {
      priceInput.addEventListener('blur', () => {
        if (this.validationManager) {
          const price = parseInt(this.getRawValue(priceInput)) || 0;
          if (price > 0) {
            this.validationManager.validateSeasonPlatformPrices(price, suffix);
          }
        }
      });
    }

    // 🆕 NOUVEAU : Nuits minimum - ajouter un listener pour mettre à jour data-raw-value
    const minNightsInput = document.getElementById(`season-min-nights-input${suffix}`);
    if (minNightsInput) {
      minNightsInput.addEventListener('input', (e) => {
        const value = e.target.value.replace(/[^\d]/g, '');
        e.target.setAttribute('data-raw-value', value || '1');
      });
    }
    
    // Prix plateformes - validation au blur seulement
    ['airbnb', 'booking', 'other'].forEach(platform => {
      const input = document.getElementById(`season-${platform}-price-input${suffix}`);
      if (input) {
        input.addEventListener('blur', () => {
          if (this.validationManager) {
            const directPrice = parseInt(this.getRawValue(priceInput)) || 0;
            if (directPrice > 0) {
              this.validationManager.validateSeasonPlatformPrices(directPrice, suffix);
            }
          }
        });
      }
    });
  }

  
  prefillDefaultPricing() {
  
  // Prix par défaut
  const defaultPriceInput = document.getElementById('default-price-input');
  if (defaultPriceInput && this.pricingData.defaultPricing) {
    defaultPriceInput.value = this.pricingData.defaultPricing.price || 0;
    defaultPriceInput.setAttribute('data-raw-value', this.pricingData.defaultPricing.price || 0);
  }
  
  // Nuits minimum par défaut
  const defaultMinNightsInput = document.getElementById('default-min-nights-input');
  if (defaultMinNightsInput && this.pricingData.defaultPricing) {
    defaultMinNightsInput.value = this.pricingData.defaultPricing.minNights || 0;
  }
  
  // Prix plateformes (optionnels)
  if (this.pricingData.defaultPricing && this.pricingData.defaultPricing.platformPrices) {
    const platforms = ['airbnb', 'booking', 'other'];
    platforms.forEach(platform => {
      const input = document.getElementById(`default-${platform}-price-input`);
      if (input) {
        const value = this.pricingData.defaultPricing.platformPrices[platform] || 0;
        input.value = value;
        input.setAttribute('data-raw-value', value);
      }
    });
  }
}

prefillComplexFields() {
  // MODE DE LOCATION (Radio buttons)
  const modeLocation = this.propertyData.mode_location || '';
  if (modeLocation) {
    // Chercher le radio button correspondant
    const radios = document.querySelectorAll('input[name="mode-location"]');
    radios.forEach(radio => {
      if (radio.value === modeLocation) {
        radio.checked = true;
        // Mettre à jour le visuel Webflow
        const label = radio.closest('.w-radio');
        if (label) {
          // Retirer la classe checked de tous
          document.querySelectorAll('input[name="mode-location"]').forEach(r => {
            r.closest('.w-radio')?.querySelector('.w-radio-input')?.classList.remove('w--redirected-checked');
          });
          // Ajouter sur le bon
          label.querySelector('.w-radio-input')?.classList.add('w--redirected-checked');
        }
      }
    });
  }
  this.initialValues.mode_location = modeLocation;
  
  // ÉQUIPEMENTS PRINCIPAUX (Checkboxes)
  const equipements = this.propertyData.equipements_principaux || [];
  const equipementsArray = Array.isArray(equipements) ? equipements : [];
  
  // Mapping des valeurs aux IDs des checkboxes
  const equipementsMapping = {
    'Piscine': 'checkbox-piscine',
    'Jacuzzi': 'checkbox-jacuzzi',
    'Barbecue': 'checkbox-barbecue',
    'Climatisation': 'checkbox-climatisation',
    'Équipement bébé': 'checkbox-equipement-bebe',
    'Parking gratuit': 'checkbox-parking',
    'Wifi': 'checkbox-wifi',
    'Four': 'checkbox-four',
    'Lave-vaisselle': 'checkbox-lave-vaisselle',
    'Sèche-linge': 'checkbox-seche-linge',
    'Machine à laver': 'checkbox-machine-a-laver',
    'Borne électrique': 'checkbox-borne-electrique'
  };
  
  // Cocher les bonnes cases
  Object.entries(equipementsMapping).forEach(([value, id]) => {
    const checkbox = document.getElementById(id);
    if (checkbox) {
      checkbox.checked = equipementsArray.includes(value);
      // Mettre à jour le visuel Webflow
      const checkboxDiv = checkbox.previousElementSibling;
      if (checkboxDiv && checkboxDiv.classList.contains('w-checkbox-input')) {
        if (checkbox.checked) {
          checkboxDiv.classList.add('w--redirected-checked');
        } else {
          checkboxDiv.classList.remove('w--redirected-checked');
        }
      }
    }
  });
  this.initialValues.equipements_principaux = equipementsArray;
  
  // OPTIONS D'ACCUEIL (Checkboxes)
  const options = this.propertyData.options_accueil || [];
  const optionsArray = Array.isArray(options) ? options : [];
  
  const optionsMapping = {
    'Animaux autorisés': 'checkbox-animaux',
    'Accès PMR': 'checkbox-pmr',
    'Fumeurs autorisés': 'checkbox-fumeurs'
  };
  
  Object.entries(optionsMapping).forEach(([value, id]) => {
    const checkbox = document.getElementById(id);
    if (checkbox) {
      checkbox.checked = optionsArray.includes(value);
      // Mettre à jour le visuel Webflow
      const checkboxDiv = checkbox.previousElementSibling;
      if (checkboxDiv && checkboxDiv.classList.contains('w-checkbox-input')) {
        if (checkbox.checked) {
          checkboxDiv.classList.add('w--redirected-checked');
        } else {
          checkboxDiv.classList.remove('w--redirected-checked');
        }
      }
    }
  });
  this.initialValues.options_accueil = optionsArray;

  // NOUVEAU : MODES DE PAIEMENT (Checkboxes)
  const modesPaiement = this.propertyData.mode_paiement || [];
  const modesPaiementArray = Array.isArray(modesPaiement) ? modesPaiement : [];
  
  const modesPaiementMapping = {
    'Visa': 'checkbox-visa',
    'Espèces': 'checkbox-especes',
    'MasterCard': 'checkbox-mastercard',
    'Virement bancaire': 'checkbox-virement',
    'PayPal': 'checkbox-paypal',
    'Wero': 'checkbox-wero',
    'American Express': 'checkbox-amex',
    'Chèques acceptés': 'checkbox-cheques',
    'Chèques-vacances': 'checkbox-cheques-vacances'
  };
  
  Object.entries(modesPaiementMapping).forEach(([value, id]) => {
    const checkbox = document.getElementById(id);
    if (checkbox) {
      checkbox.checked = modesPaiementArray.includes(value);
      // Mettre à jour le visuel Webflow
      const checkboxDiv = checkbox.previousElementSibling;
      if (checkboxDiv && checkboxDiv.classList.contains('w-checkbox-input')) {
        if (checkbox.checked) {
          checkboxDiv.classList.add('w--redirected-checked');
        } else {
          checkboxDiv.classList.remove('w--redirected-checked');
        }
      }
    }
  });
  this.initialValues.mode_paiement = modesPaiementArray;
  this.prefillCautionAcompte();
  this.prefillTailleMaison();
}

  prefillCautionAcompte() {  
  // Récupérer les valeurs depuis le JSON pricing
  const caution = this.pricingData?.caution || '';
  const acompte = this.pricingData?.acompte || 0;
  
  // Remplir les inputs
  const cautionInput = document.getElementById('caution-input');
  const acompteInput = document.getElementById('acompte-input');
  
  if (cautionInput) {
    cautionInput.value = caution;
    cautionInput.setAttribute('data-raw-value', caution);
    // S'assurer que l'attribut est là pour votre système
    cautionInput.setAttribute('data-suffix', 'euro');
  }
  
  if (acompteInput) {
    acompteInput.value = acompte;
    acompteInput.setAttribute('data-raw-value', acompte);
    // S'assurer que l'attribut est là pour votre système
    acompteInput.setAttribute('data-suffix', 'pourcent');
  }
  
  // Sauvegarder la valeur initiale du champ texte
  this.initialValues.conditions_reservation = this.propertyData.conditions_reservation || '';
  this.initialValues.caution = caution;
  this.initialValues.acompte = acompte;
  
}
  
prefillTailleMaison() {  
  const tailleStr = this.propertyData.taille_maison || '';
  
  // Parser la chaîne...
  const regex = /(\d+)\s*voyageur[s]?\s*-\s*(\d+)\s*chambre[s]?\s*-\s*(\d+)\s*lit[s]?\s*-\s*(\d+)\s*salle[s]?\s*de\s*bain/i;
  const match = tailleStr.match(regex);
  
  let values = {
    voyageurs: 0,
    chambres: 0,
    lits: 0,
    salles_bain: 0
  };
  
  if (match) {
    values.voyageurs = parseInt(match[1]) || 0;
    values.chambres = parseInt(match[2]) || 0;
    values.lits = parseInt(match[3]) || 0;
    values.salles_bain = parseInt(match[4]) || 0;
  }
  
  // NOUVEAU : Si pas de match mais qu'on a une capacity dans pricingData
  if (!match && this.pricingData && this.pricingData.capacity) {
    values.voyageurs = this.pricingData.capacity;
  }
  
  // Remplir les inputs...
  const voyageursInput = document.getElementById('voyageurs-input');
  const chambresInput = document.getElementById('chambres-input');
  const litsInput = document.getElementById('lits-input');
  const sallesBainInput = document.getElementById('salles-bain-input');
  
  if (voyageursInput) voyageursInput.value = values.voyageurs;
  if (chambresInput) chambresInput.value = values.chambres;
  if (litsInput) litsInput.value = values.lits;
  if (sallesBainInput) sallesBainInput.value = values.salles_bain;
  
  // Sauvegarder les valeurs initiales
  this.initialValues.taille_maison = tailleStr;
  this.initialValues.taille_maison_values = values;
  
  // IMPORTANT : S'assurer que pricingData.capacity est synchronisé
  if (this.pricingData) {
    // Prioriser la valeur parsée de taille_maison
    if (values.voyageurs > 0) {
      this.pricingData.capacity = values.voyageurs;
    } else if (!this.pricingData.capacity) {
      // Si pas de voyageurs dans la chaîne ET pas de capacity, mettre 1 par défaut
      this.pricingData.capacity = 1;
    }
  }
}

prefillHoraires() {  
  const horairesStr = this.propertyData.horaires_arrivee_depart || '';
  
  let heureArrivee = '';
  let heureDepart = '';
  
  if (horairesStr) {
    const horaires = horairesStr.split(',').map(h => h.trim());
    
    if (horaires.length === 2) {
      if (horaires[0].includes(':')) {
        heureArrivee = horaires[0];
        heureDepart = horaires[1];
      } else {
        heureArrivee = horaires[0].padStart(2, '0') + ':00';
        heureDepart = horaires[1].padStart(2, '0') + ':00';
      }
    }
  }
  
  const fixeRadio = document.getElementById('arrivee-fixe');
  const creneauRadio = document.getElementById('arrivee-creneau');
  const fixeLabel = document.getElementById('label-arrivee-fixe');
  const creneauLabel = document.getElementById('label-arrivee-creneau');
  const arriveeInput = document.getElementById('heure-arrivee-input');
  const debutInput = document.getElementById('heure-arrivee-debut-input');
  const finInput = document.getElementById('heure-arrivee-fin-input');
  const departInput = document.getElementById('heure-depart-input');
  
  // Détecter si c'est un créneau (format "14:00-18:00")
  const isCreneau = heureArrivee.includes('-');
  
  if (isCreneau) {
    const [debut, fin] = heureArrivee.split('-').map(h => h.trim());
    
    if (creneauRadio) creneauRadio.checked = true;
    if (fixeRadio) fixeRadio.checked = false;
    if (creneauLabel) creneauLabel.querySelector('.w-radio-input')?.classList.add('w--redirected-checked');
    if (fixeLabel) fixeLabel.querySelector('.w-radio-input')?.classList.remove('w--redirected-checked');
    
    if (arriveeInput) arriveeInput.style.display = 'none';
    const blocCreneau = document.getElementById('bloc-arrivee-creneau');
    if (blocCreneau) blocCreneau.style.display = 'flex';
    if (debutInput) debutInput.value = debut;
    if (finInput) finInput.value = fin;
  } else {
    if (fixeRadio) fixeRadio.checked = true;
    if (creneauRadio) creneauRadio.checked = false;
    if (fixeLabel) fixeLabel.querySelector('.w-radio-input')?.classList.add('w--redirected-checked');
    if (creneauLabel) creneauLabel.querySelector('.w-radio-input')?.classList.remove('w--redirected-checked');
    
    if (arriveeInput) { arriveeInput.style.display = 'block'; arriveeInput.value = heureArrivee; }
    const blocCreneau2 = document.getElementById('bloc-arrivee-creneau');
    if (blocCreneau2) blocCreneau2.style.display = 'none';
  }
  
  if (departInput) {
    departInput.value = heureDepart;
    departInput.setAttribute('data-format', 'heure-minute');
  }
  
  this.initialValues.horaires_arrivee_depart = horairesStr;
}


prefillCancellationPolicy() {
  const value = this.propertyData.conditions_annulation || '';
  const predefinedPolicies = ['flexible', 'moderate', 'limited', 'strict'];
  const customBloc = document.getElementById('bloc-custom-annulation');
  const textarea = document.getElementById('conditions-annulation-input');
  
  // Déterminer si c'est un choix prédéfini ou du texte custom
  let selectedPolicy;
  
  if (predefinedPolicies.includes(value)) {
    selectedPolicy = value;
    if (customBloc) customBloc.style.display = 'none';
  } else {
    // Texte libre (ancien format ou personnalisé)
    selectedPolicy = 'custom';
    if (customBloc) customBloc.style.display = 'block';
    if (textarea) textarea.value = value;
  }
  
  // Cocher le bon radio button
  const radio = document.getElementById(`radio-${selectedPolicy}`);
  if (radio) {
    radio.checked = true;
    // Mettre à jour le visuel Webflow
    document.querySelectorAll('input[name="cancellation-policy"]').forEach(r => {
      r.closest('.w-radio')?.querySelector('.w-radio-input')?.classList.remove('w--redirected-checked');
    });
    radio.closest('.w-radio')?.querySelector('.w-radio-input')?.classList.add('w--redirected-checked');
  }
  
  // Sauvegarder la valeur initiale
  this.initialValues.conditions_annulation = value;
}

  
// 🆕 NOUVELLE MÉTHODE : Pré-remplir les options de ménage
prefillCleaningOptions() {
  
  // Récupérer les éléments du DOM
  const includedRadio = document.getElementById('inclus');
  const notIncludedRadio = document.getElementById('non-inclus');
  const optionalRadio = document.getElementById('option');
  const priceInput = document.getElementById('cleaning-price-input');
  
  if (!includedRadio || !notIncludedRadio || !optionalRadio || !priceInput) {
    console.warn('⚠️ Éléments de ménage non trouvés dans le DOM');
    return;
  }
  
  // Récupérer les labels Webflow
  const includedLabel = document.getElementById('menage-inclus');
  const notIncludedLabel = document.getElementById('menage-non-inclus');
  const optionalLabel = document.getElementById('menage-option');
  
  // Fonction helper pour reset tous les radios visuellement
  const resetAllRadios = () => {
    includedRadio.checked = false;
    notIncludedRadio.checked = false;
    optionalRadio.checked = false;
    if (includedLabel) includedLabel.querySelector('.w-radio-input')?.classList.remove('w--redirected-checked');
    if (notIncludedLabel) notIncludedLabel.querySelector('.w-radio-input')?.classList.remove('w--redirected-checked');
    if (optionalLabel) optionalLabel.querySelector('.w-radio-input')?.classList.remove('w--redirected-checked');
  };
  
  // Définir l'état initial basé sur les données
  const cleaning = this.pricingData.cleaning;
  
  if (cleaning && cleaning.optional) {
    // En option
    resetAllRadios();
    optionalRadio.checked = true;
    if (optionalLabel) optionalLabel.querySelector('.w-radio-input')?.classList.add('w--redirected-checked');
    
    priceInput.style.display = 'block';
    if (cleaning.price) {
      priceInput.value = cleaning.price;
      priceInput.setAttribute('data-raw-value', cleaning.price);
    }
  } else if (cleaning && cleaning.included) {
    // Inclus
    resetAllRadios();
    includedRadio.checked = true;
    if (includedLabel) includedLabel.querySelector('.w-radio-input')?.classList.add('w--redirected-checked');
    
    priceInput.style.display = 'none';
    priceInput.value = '';
  } else {
    // Non inclus (par défaut si included === false)
    resetAllRadios();
    notIncludedRadio.checked = true;
    if (notIncludedLabel) notIncludedLabel.querySelector('.w-radio-input')?.classList.add('w--redirected-checked');
    
    priceInput.style.display = 'block';
    if (cleaning && cleaning.price) {
      priceInput.value = cleaning.price;
      priceInput.setAttribute('data-raw-value', cleaning.price);
    }
  }
  
  // Sauvegarder l'état initial
  this.initialValues.cleaningIncluded = cleaning?.included ?? true;
  this.initialValues.cleaningOptional = cleaning?.optional ?? false;
  this.initialValues.cleaningPrice = cleaning?.price || 0;
}

prefillWeekendOptions() {
  const yesRadio = document.getElementById('weekend-oui');
  const noRadio = document.getElementById('weekend-non');
  const priceInput = document.getElementById('weekend-price-input');
  
  if (!yesRadio || !noRadio || !priceInput) {
    console.warn('⚠️ Éléments week-end non trouvés dans le DOM');
    return;
  }
  
  // Récupérer les labels Webflow
  const yesLabel = document.getElementById('label-weekend-oui');
  const noLabel = document.getElementById('label-weekend-non');
  
  const weekend = this.pricingData.defaultPricing?.weekend;
  
  if (weekend && weekend.enabled) {
    // Activer "Oui"
    yesRadio.checked = true;
    noRadio.checked = false;
    if (yesLabel) yesLabel.querySelector('.w-radio-input')?.classList.add('w--redirected-checked');
    if (noLabel) noLabel.querySelector('.w-radio-input')?.classList.remove('w--redirected-checked');
    
    priceInput.style.display = 'block';
    if (weekend.price) {
      priceInput.value = weekend.price;
      priceInput.setAttribute('data-raw-value', weekend.price);
    }
  } else {
    // "Non" par défaut
    yesRadio.checked = false;
    noRadio.checked = true;
    if (yesLabel) yesLabel.querySelector('.w-radio-input')?.classList.remove('w--redirected-checked');
    if (noLabel) noLabel.querySelector('.w-radio-input')?.classList.add('w--redirected-checked');
    
    priceInput.style.display = 'none';
    priceInput.value = '';
  }
  
  // Sauvegarder l'état initial
  this.initialValues.weekendEnabled = weekend?.enabled ?? false;
  this.initialValues.weekendPrice = weekend?.price || 0;
}

  // 🆕 Pré-remplir les options de supplément voyageurs
prefillExtraGuestsOptions() {
  const yesRadio = document.getElementById('extra-guests-oui');
  const noRadio = document.getElementById('extra-guests-non');
  const yesLabel = document.getElementById('label-extra-guests-oui');
  const noLabel = document.getElementById('label-extra-guests-non');
  const thresholdInput = document.getElementById('extra-guests-threshold-input');
  const priceInput = document.getElementById('extra-guests-price-input');
  const labelThreshold = document.getElementById('label-extra-guests');
  const labelPrice = document.getElementById('label-extra-guests-price');
  if (!yesRadio || !noRadio || !thresholdInput || !priceInput) return;
  // Initialiser si absent
  if (!this.pricingData.extraGuests) {
    this.pricingData.extraGuests = { enabled: false, threshold: 2, pricePerPerson: 0 };
  }
  const extraGuests = this.pricingData.extraGuests;
  if (extraGuests.enabled) {
    yesRadio.checked = true;
    noRadio.checked = false;
    if (yesLabel) yesLabel.querySelector('.w-radio-input')?.classList.add('w--redirected-checked');
    if (noLabel) noLabel.querySelector('.w-radio-input')?.classList.remove('w--redirected-checked');
    thresholdInput.style.display = 'block';
    priceInput.style.display = 'block';
    if (labelThreshold) labelThreshold.style.display = 'block';
    if (labelPrice) labelPrice.style.display = 'block';
    if (extraGuests.threshold) {
      thresholdInput.value = extraGuests.threshold;
      thresholdInput.setAttribute('data-raw-value', extraGuests.threshold);
    }
    if (extraGuests.pricePerPerson) {
      priceInput.value = extraGuests.pricePerPerson;
      priceInput.setAttribute('data-raw-value', extraGuests.pricePerPerson);
    }
  } else {
    yesRadio.checked = false;
    noRadio.checked = true;
    if (yesLabel) yesLabel.querySelector('.w-radio-input')?.classList.remove('w--redirected-checked');
    if (noLabel) noLabel.querySelector('.w-radio-input')?.classList.add('w--redirected-checked');
    thresholdInput.style.display = 'none';
    priceInput.style.display = 'none';
    if (labelThreshold) labelThreshold.style.display = 'none';
    if (labelPrice) labelPrice.style.display = 'none';
  }
  // Sauvegarder les valeurs initiales pour le cancel
  this.initialValues.extraGuestsEnabled = extraGuests.enabled;
  this.initialValues.extraGuestsThreshold = extraGuests.threshold || 2;
  this.initialValues.extraGuestsPrice = extraGuests.pricePerPerson || 0;
}

// 🆕 Configurer les listeners pour le supplément voyageurs
setupExtraGuestsListeners() {
  const yesRadio = document.getElementById('extra-guests-oui');
  const noRadio = document.getElementById('extra-guests-non');
  const yesLabel = document.getElementById('label-extra-guests-oui');
  const noLabel = document.getElementById('label-extra-guests-non');
  const thresholdInput = document.getElementById('extra-guests-threshold-input');
  const priceInput = document.getElementById('extra-guests-price-input');
  const labelThreshold = document.getElementById('label-extra-guests');
  const labelPrice = document.getElementById('label-extra-guests-price');
  if (!yesRadio || !noRadio || !thresholdInput || !priceInput) return;
  // Listener sur le radio "Oui"
  yesRadio.addEventListener('change', () => {
    if (yesRadio.checked) {
      if (yesLabel) yesLabel.querySelector('.w-radio-input')?.classList.add('w--redirected-checked');
      if (noLabel) noLabel.querySelector('.w-radio-input')?.classList.remove('w--redirected-checked');
      thresholdInput.style.display = 'block';
      priceInput.style.display = 'block';
      if (labelThreshold) labelThreshold.style.display = 'block';
      if (labelPrice) labelPrice.style.display = 'block';
      setTimeout(() => thresholdInput.focus(), 100);

      if (!this.pricingData.extraGuests) {
        this.pricingData.extraGuests = {};
      }
      this.pricingData.extraGuests.enabled = true;

      this.enableButtons();
    }
  });

  // Listener sur le radio "Non"
  noRadio.addEventListener('change', () => {
    if (noRadio.checked) {
      if (yesLabel) yesLabel.querySelector('.w-radio-input')?.classList.remove('w--redirected-checked');
      if (noLabel) noLabel.querySelector('.w-radio-input')?.classList.add('w--redirected-checked');
      thresholdInput.style.display = 'none';
      priceInput.style.display = 'none';
      if (labelThreshold) labelThreshold.style.display = 'none';
      if (labelPrice) labelPrice.style.display = 'none';
      thresholdInput.value = '';
      thresholdInput.removeAttribute('data-raw-value');
      priceInput.value = '';
      priceInput.removeAttribute('data-raw-value');

      if (!this.pricingData.extraGuests) {
        this.pricingData.extraGuests = {};
      }
      this.pricingData.extraGuests.enabled = false;
      this.pricingData.extraGuests.threshold = 0;
      this.pricingData.extraGuests.pricePerPerson = 0;

      this.enableButtons();
    }
  });

  // Changement du seuil
  thresholdInput.addEventListener('blur', () => {
    let threshold = parseInt(thresholdInput.value) || 0;
    
    // Valider : min 1, max capacity - 1
    const maxThreshold = (this.pricingData.capacity || 8) - 1;
    if (threshold < 1) threshold = 1;
    if (threshold > maxThreshold) threshold = maxThreshold;
    
    thresholdInput.value = threshold;
    thresholdInput.setAttribute('data-raw-value', threshold);

    if (!this.pricingData.extraGuests) {
      this.pricingData.extraGuests = {};
    }
    this.pricingData.extraGuests.threshold = threshold;

    this.enableButtons();
  });

  // Changement du prix
  priceInput.addEventListener('blur', () => {
    const price = parseInt(this.getRawValue(priceInput)) || 0;
    if (!this.pricingData.extraGuests) {
      this.pricingData.extraGuests = {};
    }
    this.pricingData.extraGuests.pricePerPerson = price;
    this.enableButtons();
  });
}
  
setupWeekendListeners() {
  const yesRadio = document.getElementById('weekend-oui');
  const noRadio = document.getElementById('weekend-non');
  const yesLabel = document.getElementById('label-weekend-oui');
  const noLabel = document.getElementById('label-weekend-non');
  const priceInput = document.getElementById('weekend-price-input');
  
  if (!yesRadio || !noRadio || !priceInput) return;
  
  // Listener sur le radio "Oui"
  yesRadio.addEventListener('change', () => {
    if (yesRadio.checked) {
      if (yesLabel) yesLabel.querySelector('.w-radio-input')?.classList.add('w--redirected-checked');
      if (noLabel) noLabel.querySelector('.w-radio-input')?.classList.remove('w--redirected-checked');
      
      priceInput.style.display = 'block';
      setTimeout(() => priceInput.focus(), 100);
      
      if (!this.pricingData.defaultPricing.weekend) {
        this.pricingData.defaultPricing.weekend = {};
      }
      this.pricingData.defaultPricing.weekend.enabled = true;
      
      this.enableButtons();
    }
  });
  
  // Listener sur le radio "Non"
  noRadio.addEventListener('change', () => {
    if (noRadio.checked) {
      if (yesLabel) yesLabel.querySelector('.w-radio-input')?.classList.remove('w--redirected-checked');
      if (noLabel) noLabel.querySelector('.w-radio-input')?.classList.add('w--redirected-checked');
      
      priceInput.style.display = 'none';
      priceInput.value = '';
      priceInput.removeAttribute('data-raw-value');
      
      if (!this.pricingData.defaultPricing.weekend) {
        this.pricingData.defaultPricing.weekend = {};
      }
      this.pricingData.defaultPricing.weekend.enabled = false;
      this.pricingData.defaultPricing.weekend.price = 0;
      
      this.enableButtons();
    }
  });
  
  // Changement du prix
  priceInput.addEventListener('blur', () => {
    const price = parseInt(this.getRawValue(priceInput)) || 0;
    if (!this.pricingData.defaultPricing.weekend) {
      this.pricingData.defaultPricing.weekend = {};
    }
    this.pricingData.defaultPricing.weekend.price = price;
    this.enableButtons();
  });
}

setupArriveeModelisteners() {
  const fixeRadio = document.getElementById('arrivee-fixe');
  const creneauRadio = document.getElementById('arrivee-creneau');
  const fixeLabel = document.getElementById('label-arrivee-fixe');
  const creneauLabel = document.getElementById('label-arrivee-creneau');
  const arriveeInput = document.getElementById('heure-arrivee-input');
  const debutInput = document.getElementById('heure-arrivee-debut-input');
  const finInput = document.getElementById('heure-arrivee-fin-input');
  
  if (!fixeRadio || !creneauRadio) return;
  
  fixeRadio.addEventListener('change', () => {
    if (fixeRadio.checked) {
      if (fixeLabel) fixeLabel.querySelector('.w-radio-input')?.classList.add('w--redirected-checked');
      if (creneauLabel) creneauLabel.querySelector('.w-radio-input')?.classList.remove('w--redirected-checked');
      
      if (arriveeInput) arriveeInput.style.display = 'block';
      const blocCreneau = document.getElementById('bloc-arrivee-creneau');
      if (blocCreneau) blocCreneau.style.display = 'none';
      if (debutInput) debutInput.value = '';
      if (finInput) finInput.value = '';
      
      setTimeout(() => arriveeInput?.focus(), 100);
      this.enableButtons();
    }
  });
  
  creneauRadio.addEventListener('change', () => {
    if (creneauRadio.checked) {
      if (creneauLabel) creneauLabel.querySelector('.w-radio-input')?.classList.add('w--redirected-checked');
      if (fixeLabel) fixeLabel.querySelector('.w-radio-input')?.classList.remove('w--redirected-checked');
      
      if (arriveeInput) { arriveeInput.style.display = 'none'; arriveeInput.value = ''; }
      const blocCreneau = document.getElementById('bloc-arrivee-creneau');
      if (blocCreneau) blocCreneau.style.display = 'flex';
      
      setTimeout(() => debutInput?.focus(), 100);
      this.enableButtons();
    }
  });
}

// 🆕 NOUVELLE MÉTHODE : Formater tous les champs avec suffixes au chargement
formatAllSuffixFields() {
  
  // Formater directement sans déclencher d'événements
  document.querySelectorAll('[data-suffix="euro"], [data-suffix="euro-nuit"]').forEach(input => {
    const value = input.value.replace(/[^\d]/g, '');
    if (value) {
      input.setAttribute('data-raw-value', value);
      const suffix = input.getAttribute('data-suffix') === 'euro' ? ' €' : ' € / nuit';
      input.value = value + suffix;
    }
  });
  
  document.querySelectorAll('[data-suffix="pourcent"]').forEach(input => {
    const value = input.value.replace(/[^\d]/g, '');
    if (value) {
      input.setAttribute('data-raw-value', value);
      input.value = value + ' %';
    }
  });
}
  
// ================================
// 🎯 GESTION DES RÉDUCTIONS
// ================================

initDiscountManagement() {
  
  // Masquer tous les blocs de réduction au départ
  document.querySelectorAll('.bloc-reduction').forEach(bloc => {
    bloc.style.display = 'none';
  });
  
  // Configuration du bouton d'ajout
  const addButton = document.getElementById('button-add-reduction');
  if (addButton) {
    addButton.addEventListener('click', (e) => {
      e.preventDefault();
      this.addDiscount();
    });
  }
  
  // Afficher les réductions existantes
  this.displayDiscounts();
}
  
displayDiscounts() {
  
  // Masquer tous les blocs d'abord (sauf les iCals)
  document.querySelectorAll('.bloc-reduction:not(.ical)').forEach(bloc => {
    bloc.style.display = 'none';
  });
  
  if (!this.pricingData.discounts || this.pricingData.discounts.length === 0) {
    console.log('❌ Aucune réduction à afficher');
    return;
  }
  
  // Afficher chaque réduction
  this.pricingData.discounts.forEach((discount, index) => {
    
    let blocElement;
    
    if (index === 0) {
        blocElement = document.querySelector('.bloc-reduction:not(.next):not(.ical)');
      } else {
        const nextBlocs = document.querySelectorAll('.bloc-reduction.next:not(.ical)');
        blocElement = nextBlocs[index - 1];
      }
    
    
    if (blocElement) {
      // Afficher le bloc
      blocElement.style.display = 'flex';
      
      // Remplir les valeurs
      const nightsInput = blocElement.querySelector('[data-discount="nights"]');
      const percentageInput = blocElement.querySelector('[data-discount="percentage"]');
      
      if (nightsInput) {
        nightsInput.value = discount.nights || '';
      }
      
      if (percentageInput) {
        percentageInput.value = discount.percentage || '';
      }
      
      // Ajouter les listeners pour modifications
      this.setupDiscountListeners(blocElement, index);
      
      // Configurer le bouton de suppression
      const deleteButton = blocElement.querySelector('.button-delete-reduction');
      if (deleteButton) {
        deleteButton.onclick = (e) => {
          e.preventDefault();
          this.removeDiscount(index);
        };
      }
    }
  });
  
  // Vérifier si on peut encore ajouter des réductions
  this.updateAddButtonState();
}

addDiscount() {
  
  // Vérifier la limite
  if (this.pricingData.discounts.length >= 5) {
    this.showNotification('error', 'Maximum 5 réductions autorisées');
    return;
  }
  
  // Ajouter une nouvelle réduction vide
  const newDiscount = {
    nights: 0,
    percentage: 0
  };
  
  const newIndex = this.pricingData.discounts.length;
  this.pricingData.discounts.push(newDiscount);
  
  // SIMPLE : Afficher juste le nouveau bloc au lieu de tout réafficher
  let blocElement;
  if (newIndex === 0) {
    blocElement = document.querySelector('.bloc-reduction:not(.next):not(.ical)');
  } else {
    const nextBlocs = document.querySelectorAll('.bloc-reduction.next:not(.ical)');
    blocElement = nextBlocs[newIndex - 1];
  }
  
  if (blocElement) {
    blocElement.style.display = 'flex';
    
    // Réinitialiser les valeurs
    const nightsInput = blocElement.querySelector('[data-discount="nights"]');
    const percentageInput = blocElement.querySelector('[data-discount="percentage"]');
    
    if (nightsInput) {
      nightsInput.value = '';
      nightsInput.removeAttribute('data-raw-value');
    }
    if (percentageInput) {
      percentageInput.value = '';
      percentageInput.removeAttribute('data-raw-value');
    }
    
    // Ajouter les listeners
    this.setupDiscountListeners(blocElement, newIndex);
    
    // Configurer le bouton de suppression
    const deleteButton = blocElement.querySelector('.button-delete-reduction');
    if (deleteButton) {
      deleteButton.onclick = (e) => {
        e.preventDefault();
        this.removeDiscount(newIndex);
      };
    }
  }
  
  // Mettre à jour l'état du bouton d'ajout
  this.updateAddButtonState();
  
  // Activer les boutons de sauvegarde
  this.enableButtons();
}

removeDiscount(index) {
  
  // Supprimer du tableau
  this.pricingData.discounts.splice(index, 1);
  
  // Réafficher toutes les réductions (gère automatiquement la réorganisation)
  this.displayDiscounts();
  
  // Activer les boutons de sauvegarde
  this.enableButtons();
}

setupDiscountListeners(blocElement, index) {
  // Listeners pour les modifications
  const nightsInput = blocElement.querySelector('[data-discount="nights"]');
  const percentageInput = blocElement.querySelector('[data-discount="percentage"]');
  
  if (nightsInput) {
    nightsInput.addEventListener('input', (e) => {
      e.target.value = e.target.value.replace(/\D/g, '');
      const value = parseInt(e.target.value) || 0;
      this.pricingData.discounts[index].nights = value;
      this.enableButtons();
    });

    
    // NOUVEAU : Validation au blur pour les doublons
    nightsInput.addEventListener('blur', () => {
      if (this.validationManager) {
        this.validationManager.validateDiscountDuplicateOnBlur(nightsInput, index);
      }
    });
  }
  
  // Version simplifiée :
  if (percentageInput) {
    // Récupérer la valeur en enlevant le %
    percentageInput.addEventListener('input', (e) => {
      let value = parseInt(e.target.value.replace(/[^\d]/g, '')) || 0;
      
      // Limiter entre 1 et 100 si une valeur est entrée
      if (value > 0) {
        if (value > 100) {
          value = 100;
          e.target.value = '100';
        } else if (value < 1) {
          value = 1;
          e.target.value = '1';
        }
      }
      
      this.pricingData.discounts[index].percentage = value;
      this.enableButtons();
    });
    
    // Formatage au blur : ajouter %
    percentageInput.addEventListener('blur', function() {
      const value = this.value.replace(/[^\d]/g, '');
      if (value) {
        this.value = value + ' %';
      }
    });
    
    // Retirer le % au focus
    percentageInput.addEventListener('focus', function() {
      this.value = this.value.replace(/[^\d]/g, '');
    });
  }
}

updateAddButtonState() {
  const addButton = document.getElementById('button-add-reduction');
  if (addButton) {
    if (this.pricingData.discounts.length >= 5) {
      addButton.disabled = true;
      addButton.style.opacity = '0.5';
      addButton.style.cursor = 'not-allowed';
    } else {
      addButton.disabled = false;
      addButton.style.opacity = '1';
      addButton.style.cursor = 'pointer';
    }
  }
}

  // ================================
// 🗓️ GESTION DES LIENS ICAL
// ================================

initIcalManagement() {
  
  // Masquer tous les blocs sauf le premier
  document.querySelectorAll('.bloc-ical.next').forEach(bloc => {
    bloc.style.display = 'none';
  });
  
  // Configuration du bouton d'ajout
  const addButton = document.getElementById('button-add-ical');
  if (addButton) {
    addButton.addEventListener('click', (e) => {
      e.preventDefault();
      this.addIcal();
    });
  }
  
  // Afficher les iCals existants
  this.displayIcals();
}

displayIcals() {
  
  // Le premier bloc est TOUJOURS visible
  const firstBloc = document.getElementById('ical-1');
  if (firstBloc) {
    firstBloc.style.display = 'flex';
  }
  
  // Masquer tous les autres blocs par défaut
  for (let i = 2; i <= 4; i++) {
    const bloc = document.getElementById(`ical-${i}`);
    if (bloc) {
      bloc.style.display = 'none';
    }
  }
  
  // Collecter toutes les URLs non vides depuis les données
  const allUrls = [];
  this.icalFieldMapping.forEach((fieldName) => {
    const value = this.propertyData[fieldName] || '';
    if (value) {
      allUrls.push(value);
    }
  });
  
  // Réafficher les URLs dans l'ordre (compacter les valeurs)
  allUrls.forEach((url, index) => {
    const input = document.getElementById(`ical-url-${index + 1}`);
    const bloc = document.getElementById(`ical-${index + 1}`);
    
    if (input && bloc) {
      input.value = url;
      bloc.style.display = 'flex';
    }
  });
  
  // Sauvegarder l'état initial pour chaque champ
  this.icalFieldMapping.forEach((fieldName) => {
    this.initialValues[fieldName] = this.propertyData[fieldName] || '';
  });
  
  // Configurer les listeners
  this.setupIcalListeners();
  
  // Mettre à jour l'état du bouton d'ajout
  this.updateAddIcalButton();
}

checkDefaultIcalWarning() {
  const icalInput = document.getElementById('ical-url-1');
  if (!icalInput) return;
  
  if (icalInput.value.trim() === this.DEFAULT_ICAL_URL) {
    // Afficher l'avertissement via le validationManager
    if (this.validationManager) {
      this.validationManager.showFieldWarning('ical-url-1', "Ce lien iCal a été ajouté par défaut et n'est pas valide. Remplacez-le pour synchroniser votre calendrier.");
      this.validationManager.showTabWarning('error-indicator-tab3');
    }
  }
}
  
addIcal() {
  
  // Trouver le premier bloc caché
  for (let i = 2; i <= 4; i++) {
    const bloc = document.getElementById(`ical-${i}`);
    if (bloc && bloc.style.display === 'none') {
      // Afficher ce bloc
      bloc.style.display = 'flex';
      
      // Focus sur l'input
      const input = document.getElementById(`ical-url-${i}`);
      if (input) {
        setTimeout(() => input.focus(), 100);
      }
      
      break;
    }
  }
  
  // Mettre à jour l'état du bouton
  this.updateAddIcalButton();
  
  // Activer les boutons de sauvegarde
  this.enableButtons();
}

removeIcal(index) {
  
  // On ne peut pas supprimer le premier
  if (index === 1) return;
  
  // Récupérer toutes les valeurs actuelles
  const currentValues = [];
  for (let i = 1; i <= 4; i++) {
    const input = document.getElementById(`ical-url-${i}`);
    if (input) {
      currentValues.push(input.value.trim());
    }
  }
  
  // Supprimer la valeur à l'index donné
  currentValues.splice(index - 1, 1);
  
  // Ajouter une valeur vide à la fin pour maintenir 4 éléments
  currentValues.push('');
  
  // Réaffecter toutes les valeurs
  for (let i = 1; i <= 4; i++) {
    const input = document.getElementById(`ical-url-${i}`);
    const bloc = document.getElementById(`ical-${i}`);
    
    if (input && bloc) {
      input.value = currentValues[i - 1] || '';
      
      // Afficher/masquer les blocs
      if (i === 1 || (currentValues[i - 1] && currentValues[i - 1].length > 0)) {
        bloc.style.display = 'flex';
      } else {
        bloc.style.display = 'none';
      }
    }
  }
  
  // Mettre à jour l'état du bouton
  this.updateAddIcalButton();
  
  // Activer les boutons de sauvegarde
  this.enableButtons();
}

setupIcalListeners() {
  // Listeners pour tous les inputs
  for (let i = 1; i <= 4; i++) {
    const input = document.getElementById(`ical-url-${i}`);
    if (input) {
      // Retirer les anciens listeners pour éviter les doublons
      const newInput = input.cloneNode(true);
      input.parentNode.replaceChild(newInput, input);
      
      newInput.addEventListener('input', () => {
        // Masquer l'avertissement si c'est ical-url-1 et que la valeur change
        if (newInput.id === 'ical-url-1' && this.validationManager) {
          this.validationManager.hideFieldWarning('ical-url-1');
          this.validationManager.hideTabWarning('error-indicator-tab3');
        }
        this.enableButtons();
      });
    }
    
    // Boutons de suppression (sauf pour le premier)
    if (i > 1) {
      const deleteBtn = document.querySelector(`#ical-${i} .button-delete-ical`);
      if (deleteBtn) {
        // Cloner pour retirer les anciens listeners
        const newBtn = deleteBtn.cloneNode(true);
        deleteBtn.parentNode.replaceChild(newBtn, deleteBtn);
        
        newBtn.onclick = (e) => {
          e.preventDefault();
          this.removeIcal(i);
        };
      }
    }
  }
}

updateAddIcalButton() {
  const addButton = document.getElementById('button-add-ical');
  if (!addButton) return;
  
  // Compter les blocs visibles
  let visibleCount = 0;
  for (let i = 1; i <= 4; i++) {
    const bloc = document.getElementById(`ical-${i}`);
    if (bloc && bloc.style.display !== 'none') {
      visibleCount++;
    }
  }
  
  // Désactiver si on a atteint 4
  if (visibleCount >= 4) {
    addButton.disabled = true;
    addButton.style.opacity = '0.5';
    addButton.style.cursor = 'not-allowed';
  } else {
    addButton.disabled = false;
    addButton.style.opacity = '1';
    addButton.style.cursor = 'pointer';
  }
}

// ================================
// 🎁 GESTION DES EXTRAS
// ================================

initExtrasManagement() {
  
  // Masquer tous les blocs extras au départ
  document.querySelectorAll('.bloc-extra').forEach(bloc => {
    bloc.style.display = 'none';
  });
  
  // Configuration du bouton d'ajout
  const addButton = document.getElementById('button-add-extra');
  if (addButton) {
    addButton.addEventListener('click', (e) => {
      e.preventDefault();
      this.addExtra();
    });
  }
  
  // Parser et afficher les extras existants
  this.parseAndDisplayExtras();
}

parseAndDisplayExtras() {
  
  // Récupérer la valeur du champ extras
  const extrasValue = this.propertyData.extras || '';
  
  if (!extrasValue) {
    console.log('❌ Aucun extra à afficher');
    this.extras = [];
    return;
  }
  
  // Parser le format "🚴Location de vélos10€/jour, ⏰Départ tardif5€"
  this.extras = this.parseExtrasString(extrasValue);
    
  // Afficher chaque extra
  this.displayExtras();
}

parseExtrasString(extrasString) {
  if (!extrasString) return [];
  
  // Séparer par virgule
  const extrasParts = extrasString.split(',').map(part => part.trim());
  
  return extrasParts.map(part => {
    // Extraire l'emoji (premier caractère unicode étendu)
    const emojiMatch = part.match(/^(\p{Emoji})/u);
    const emoji = emojiMatch ? emojiMatch[1] : '';
    
    // Retirer l'emoji du début
    const withoutEmoji = part.replace(emoji, '');
    
    // Chercher le prix (dernier nombre suivi de €)
    const priceMatch = withoutEmoji.match(/(\d+)€/);
    const price = priceMatch ? priceMatch[1] : '';
    
    // Le nom est ce qui reste après avoir retiré le prix
    const name = withoutEmoji.replace(/\d+€.*$/, '').trim();
    
    return { emoji, name, price };
  }).filter(extra => extra.name); // Filtrer les entrées vides
}

displayExtras() {
  
  // Masquer tous les blocs d'abord
  document.querySelectorAll('.bloc-extra').forEach(bloc => {
    bloc.style.display = 'none';
  });
  
  if (!this.extras || this.extras.length === 0) {
    return;
  }
  
  // Afficher chaque extra
  this.extras.forEach((extra, index) => {
    
    let blocElement;
    
    if (index === 0) {
      // Premier extra : bloc avec labels
      blocElement = document.querySelector('.bloc-extra:not(.next)');
    } else {
      // Extras suivants : blocs sans labels
      const nextBlocs = document.querySelectorAll('.bloc-extra.next');
      if (nextBlocs[index - 1]) {
        blocElement = nextBlocs[index - 1];
      }
    }
    
    if (blocElement) {
      // Afficher le bloc
      blocElement.style.display = 'flex';
      
      // Remplir les valeurs
      const emojiInput = blocElement.querySelector('[data-extra="emoji"]');
      const nameInput = blocElement.querySelector('[data-extra="name"]');
      const priceInput = blocElement.querySelector('[data-extra="price"]');
      
      if (emojiInput) {
        emojiInput.value = extra.emoji || '';
        
        // 🆕 S'assurer que l'input est dans un wrapper
        if (!emojiInput.closest('.emoji-input-wrapper')) {
          const wrapper = document.createElement('div');
          wrapper.className = 'emoji-input-wrapper';
          emojiInput.parentNode.insertBefore(wrapper, emojiInput);
          wrapper.appendChild(emojiInput);
          
          const pickerContainer = document.createElement('div');
          pickerContainer.className = 'emoji-picker-container';
          wrapper.appendChild(pickerContainer);
        }
      }
      if (nameInput) nameInput.value = extra.name || '';
      if (priceInput) {
        priceInput.value = extra.price || '';
        priceInput.setAttribute('data-raw-value', extra.price || '');
      }
      
      // Ajouter les listeners pour modifications
      this.setupExtraListeners(blocElement, index);
      
      // Configurer le bouton de suppression
      const deleteButton = blocElement.querySelector('.button-delete-extra');
      if (deleteButton) {
        deleteButton.onclick = (e) => {
          e.preventDefault();
          this.removeExtra(index);
        };
      }
    }
  });
  
  // Vérifier si on peut encore ajouter des extras
  this.updateAddExtraButtonState();
}

addExtra() {
  
  // Vérifier la limite
  if (this.extras.length >= 10) {
    this.showNotification('error', 'Maximum 10 extras autorisés');
    return;
  }
  
  // Ajouter un nouvel extra vide
  const newExtra = { emoji: '', name: '', price: '' };
  const newIndex = this.extras.length;
  this.extras.push(newExtra);
  
  // Afficher le nouveau bloc
  let blocElement;
  if (newIndex === 0) {
    blocElement = document.querySelector('.bloc-extra:not(.next)');
  } else {
    const nextBlocs = document.querySelectorAll('.bloc-extra.next');
    blocElement = nextBlocs[newIndex - 1];
  }
  
  if (blocElement) {
    blocElement.style.display = 'flex';
    
    // Réinitialiser les valeurs
    const emojiInput = blocElement.querySelector('[data-extra="emoji"]');
    const nameInput = blocElement.querySelector('[data-extra="name"]');
    const priceInput = blocElement.querySelector('[data-extra="price"]');
    
    if (emojiInput) emojiInput.value = '';
    if (nameInput) {
      nameInput.value = '';
      // Focus sur le nom pour commencer
      setTimeout(() => nameInput.focus(), 100);
    }
    if (priceInput) {
      priceInput.value = '';
      priceInput.removeAttribute('data-raw-value');
    }
    
    // Ajouter les listeners
    this.setupExtraListeners(blocElement, newIndex);
    
    // Configurer le bouton de suppression
    const deleteButton = blocElement.querySelector('.button-delete-extra');
    if (deleteButton) {
      deleteButton.onclick = (e) => {
        e.preventDefault();
        this.removeExtra(newIndex);
      };
    }
  }
  
  // Mettre à jour l'état du bouton d'ajout
  this.updateAddExtraButtonState();
  
  // Activer les boutons de sauvegarde
  this.enableButtons();
}

removeExtra(index) {
  
  // Supprimer du tableau
  this.extras.splice(index, 1);
  
  // Réafficher tous les extras (gère automatiquement la réorganisation)
  this.displayExtras();
  
  // Activer les boutons de sauvegarde
  this.enableButtons();
}

setupExtraListeners(blocElement, index) {
  const emojiInput = blocElement.querySelector('[data-extra="emoji"]');
  const nameInput = blocElement.querySelector('[data-extra="name"]');
  const priceInput = blocElement.querySelector('[data-extra="price"]');
  
  if (emojiInput) {
    emojiInput.readOnly = true;
    emojiInput.style.cursor = 'pointer';
    emojiInput.addEventListener('input', (e) => {
      this.extras[index].emoji = e.target.value;
      this.enableButtons();
    });

    // 🆕 NOUVEAU : Gérer le picker emoji
    this.setupEmojiPicker(blocElement, emojiInput, index);
  }
  
  if (nameInput) {
    nameInput.addEventListener('input', (e) => {
      this.extras[index].name = e.target.value;
      this.enableButtons();
    });
  }
  
  if (priceInput) {
    priceInput.addEventListener('input', (e) => {
      const value = e.target.value.replace(/[^\d]/g, '');
      this.extras[index].price = value;
      this.enableButtons();
    });
    
    // Formatage au blur : ajouter €
    priceInput.addEventListener('blur', function() {
      const value = this.value.replace(/[^\d]/g, '');
      if (value) {
        this.setAttribute('data-raw-value', value);
        this.value = value + '€';
      }
    });
    
    // Retirer le suffixe au focus
    priceInput.addEventListener('focus', function() {
      const rawValue = this.getAttribute('data-raw-value');
      if (rawValue) {
        this.value = rawValue;
      } else {
        this.value = this.value.replace(/[^\d]/g, '');
      }
    });
  }
}

setupEmojiPicker(blocElement, emojiInput, index) {
  // Skip sur mobile - utiliser le clavier natif
  if (window.innerWidth < 768) return;
  
  const wrapper = emojiInput.closest('.emoji-input-wrapper');
  if (!wrapper) return;
  
  const pickerContainer = wrapper.querySelector('.emoji-picker-container');
  if (!pickerContainer) return;
  
  let picker = null;
  let isLoading = false;
  
  // Gestionnaire de clic optimisé
  emojiInput.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Si déjà ouvert, fermer
    if (pickerContainer.classList.contains('active')) {
      pickerContainer.classList.remove('active');
      return;
    }
    
    // Fermer tous les autres pickers
    document.querySelectorAll('.emoji-picker-container.active').forEach(container => {
      container.classList.remove('active');
    });
    
    // Créer le picker à la demande (lazy loading)
    if (!picker && !isLoading) {
      isLoading = true;
      
      try {
        // Utiliser le module préchargé si disponible
        const module = await (window.emojiModulePromise || 
                              import('https://cdn.skypack.dev/emoji-picker-element@^1'));
        
        picker = new module.Picker({
          locale: 'fr',
          dataSource: 'https://cdn.jsdelivr.net/npm/emoji-picker-element-data@^1/fr/cldr/data.json',
          skinToneEmoji: '🖐️',
          perLine: 8,
          maxRecents: 20
        });
        
        // Événement de sélection
        picker.addEventListener('emoji-click', (event) => {
          emojiInput.value = event.detail.unicode;
          this.extras[index].emoji = event.detail.unicode;
          this.enableButtons();
          pickerContainer.classList.remove('active');
        });
        
        pickerContainer.appendChild(picker);
      } catch (error) {
        console.error('Erreur chargement emoji picker:', error);
        // Fallback : ouvrir le clavier
        emojiInput.readOnly = false;
        emojiInput.focus();
      }
      
      isLoading = false;
    }
    
    // Afficher le picker
    if (picker) {
      pickerContainer.classList.add('active');
    }
  });
  
  // Fermer au clic extérieur (optimisé avec passive)
  document.addEventListener('click', (e) => {
    if (!wrapper.contains(e.target)) {
      pickerContainer.classList.remove('active');
    }
  }, { passive: true });
  
  // Fermer avec Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && pickerContainer.classList.contains('active')) {
      pickerContainer.classList.remove('active');
    }
  });
}
  
updateAddExtraButtonState() {
  const addButton = document.getElementById('button-add-extra');
  if (addButton) {
    if (this.extras.length >= 10) {
      addButton.disabled = true;
      addButton.style.opacity = '0.5';
      addButton.style.cursor = 'not-allowed';
    } else {
      addButton.disabled = false;
      addButton.style.opacity = '1';
      addButton.style.cursor = 'pointer';
    }
  }
}

updateAddPhotosButtonState() {
  const addPhotosButton = document.querySelector('.add-photos');
  if (!addPhotosButton) return;

  const isAtLimit = this.currentImagesGallery.length >= 20;

  if (isAtLimit) {
    addPhotosButton.style.opacity = '0.5';
    addPhotosButton.style.cursor = 'not-allowed';
  } else {
    addPhotosButton.style.opacity = '1';
    addPhotosButton.style.cursor = 'pointer';
  }
}

// Méthode pour générer la chaîne extras au format attendu
generateExtrasString() {
  return this.extras
    .filter(extra => extra.name && extra.price && extra.emoji) // Ignorer les extras incomplets
    .map(extra => {
      return `${extra.emoji}${extra.name}${extra.price}€`;
    })
    .join(', ');
}


// ================================
// 📷 GESTION DES IMAGES
// ================================

initImageManagement() {
  
  // Copier l'état initial
  this.originalImagesGallery = JSON.parse(JSON.stringify(this.propertyData.images_gallery || []));
  this.currentImagesGallery = JSON.parse(JSON.stringify(this.propertyData.images_gallery || []));
  
  // Sauvegarder dans initialValues pour le système de cancel
  this.initialValues.images_gallery = JSON.parse(JSON.stringify(this.originalImagesGallery));
  
  // Réafficher avec les contrôles
  this.displayEditableGallery();
  
    // Initialiser SortableJS après un court délai (DOM ready)
  if (window.innerWidth > 768) {
    setTimeout(() => {
      this.initSortable();
    }, 100);
  }

    // Listener sur le bouton d'ajout de photos (upload custom)
  const addPhotosButton = document.querySelector('.add-photos');
  if (addPhotosButton) {
    const newButton = addPhotosButton.cloneNode(true);
    addPhotosButton.parentNode.replaceChild(newButton, addPhotosButton);

    newButton.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (this.currentImagesGallery.length >= 20) {
        this.showNotification('error', 'Limite de 20 photos maximum atteinte');
      } else {
        this.handlePhotoSelection('logement');
      }
    });
  }

  // Vérification initiale de l'état du bouton
  this.updateAddPhotosButtonState();
}

initSortable() {
  const container = document.querySelector('.images-grid');
  if (!container || this.currentImagesGallery.length === 0) return;
  
  // Détruire l'instance précédente si elle existe
  if (this.sortableInstance) {
    this.sortableInstance.destroy();
  }
  
  // 🎯 SIMPLE comme la démo : juste l'essentiel
  this.sortableInstance = new Sortable(container, {
    animation: 150,
    ghostClass: 'sortable-ghost',
    filter: '.button-delete-photo', 
    
    onEnd: (evt) => {
      // Réorganiser notre tableau de données
      const movedItem = this.currentImagesGallery.splice(evt.oldIndex, 1)[0];
      this.currentImagesGallery.splice(evt.newIndex, 0, movedItem);
      
      
      // Juste activer le bouton save
      this.enableButtons();
    }
  });
}

displayEditableGallery() {
  const blocEmpty = document.getElementById('bloc-empty-photos');
  const blocPhotos = document.getElementById('bloc-photos-logement');
  
  // bloc-empty-photos obsolète, bloc-photos toujours visible
  if (blocEmpty) blocEmpty.style.display = 'none';
  if (blocPhotos) blocPhotos.style.display = 'block';
  
  // Si pas de photos, on ne fait que masquer les blocs image — mais on reste dans la fonction
  if (!Array.isArray(this.currentImagesGallery) || this.currentImagesGallery.length === 0) {
    for (let i = 1; i <= 20; i++) {
      const imageBlock = document.getElementById(`image-block-${i}`);
      if (imageBlock) imageBlock.style.display = 'none';
    }
    return;
  }
  
  // Masquer tous les blocs d'abord
  for (let i = 1; i <= 20; i++) {
    const imageBlock = document.getElementById(`image-block-${i}`);
    if (imageBlock) {
      imageBlock.style.display = 'none';
      // Nettoyer les anciens boutons clonés
      const oldBtn = imageBlock.querySelector('.button-delete-photo');
      if (oldBtn) {
        oldBtn.remove();
      }
    }
  }
  
  // Afficher les images avec boutons de suppression
  const maxImages = Math.min(this.currentImagesGallery.length, 20);
  
  for (let i = 0; i < maxImages; i++) {
    const imageData = this.currentImagesGallery[i];
    const imageBlock = document.getElementById(`image-block-${i + 1}`);
    
    if (imageBlock && imageData) {
      let imageUrl = null;
      
      if (typeof imageData === 'object' && imageData.url) {
        imageUrl = imageData.url;
      } else if (typeof imageData === 'string') {
        imageUrl = imageData;
      }
      
      if (imageUrl) {
        const imgElement = imageBlock.querySelector('img');
        
        if (imgElement) {
          imgElement.src = imageUrl;
          imgElement.alt = `Image ${i + 1}`;
          
          if (i > 3) {
            imgElement.loading = 'lazy';
          }
        }
        
        // 🆕 HYBRIDE : Ajouter le bouton de suppression depuis le template
        this.addDeleteButtonFromTemplate(imageBlock, i);
        
        // Ajouter les classes pour le drag
        imageBlock.style.cursor = 'move';
        imageBlock.classList.add('sortable-item');
        
        // Afficher le bloc
        imageBlock.style.display = 'block';
      }
    }
  }
}

addDeleteButtonFromTemplate(imageBlock, index) {
  // Vérifier si le bouton existe déjà
  let deleteBtn = imageBlock.querySelector('.button-delete-photo');
  
  if (!deleteBtn) {
    // Récupérer le template depuis Webflow
    const template = document.getElementById('template-delete-button');
    
    if (template) {
      // Cloner le template
      deleteBtn = template.cloneNode(true);
      deleteBtn.style.display = 'block';
      deleteBtn.id = '';
      
      // Position et style
      deleteBtn.style.position = 'absolute';
      deleteBtn.style.top = '8px';
      deleteBtn.style.right = '8px';
      deleteBtn.style.zIndex = '20';
      
      // S'assurer que le bloc parent est en position relative
      imageBlock.style.position = 'relative';
      
      // Ajouter le bouton cloné au bloc image
      imageBlock.appendChild(deleteBtn);
      
    } else {
      console.error('❌ ERREUR : Template de bouton delete non trouvé');
      return;
    }
  }
  
    // 📱 MOBILE : Tap simple pour afficher/masquer le bouton delete
  // (Sortable gère le long-press pour le drag via _justDragged)
  const isMobile = window.matchMedia('(max-width: 768px)').matches;
  
  if (isMobile) {
    imageBlock.onclick = (e) => {
      if (e.target.closest('.button-delete-photo')) return;
      // Si on vient de finir un drag, on ignore le click
      if (this._justDragged) return;
      
      // Masquer tous les autres boutons delete ouverts
      document.querySelectorAll('.button-delete-photo.show-delete').forEach(btn => {
        if (btn !== deleteBtn) btn.classList.remove('show-delete');
      });
      
      // Toggle sur celui-ci
      deleteBtn.classList.toggle('show-delete');
    };
    }
  
  // Tap en dehors d'une photo → fermer tous les boutons delete ouverts
  if (!this._globalClickHandlerAdded) {
    this._globalClickHandlerAdded = true;
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.image-block') && !e.target.closest('.button-delete-photo')) {
        document.querySelectorAll('.button-delete-photo.show-delete').forEach(btn => {
          btn.classList.remove('show-delete');
        });
      }
    });
  }
  
  // Handler pour le bouton delete (mobile + desktop)
  deleteBtn.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    this.removeImage(index);
  };
}

removeImage(index) {  
  // 🆕 NOUVEAU : Récupérer l'image-block qui contient le bouton cliqué
  const imageBlock = document.getElementById(`image-block-${index + 1}`);
  if (!imageBlock) return;
  
  // Récupérer l'URL de l'image dans ce bloc
  const imgElement = imageBlock.querySelector('img');
  if (!imgElement) return;
  
  const imageUrl = imgElement.src;
  
  // 🆕 Trouver le VRAI index de cette image dans le tableau actuel
  const realIndex = this.currentImagesGallery.findIndex(img => {
    if (typeof img === 'string') {
      return img === imageUrl;
    } else if (img && img.url) {
      return img.url === imageUrl;
    }
    return false;
  });
    
  if (realIndex === -1) {
    console.error('❌ Image non trouvée dans le tableau');
    return;
  }
  
  // Vérifier qu'on garde minimum 3 images
  if (this.currentImagesGallery.length <= 3) {
    this.showNotification('error', 'Minimum 3 photos requises pour le logement');
    return;
  }
  
  // 🆕 Supprimer au BON index
  this.currentImagesGallery.splice(realIndex, 1);
  
  // Réafficher la galerie
  this.displayEditableGallery();
  
  // Réinitialiser SortableJS
  this.initSortable();

  // Mettre à jour l'état du bouton d'ajout de photos
  this.updateAddPhotosButtonState();
  
  // Activer les boutons de sauvegarde
  this.enableButtons();
}
  
  
setupFieldListeners() {
  const fields = [
    { id: 'name-input' },
    { id: 'ville-input', type: 'no-numbers' },
    { id: 'pays-input' },
    { id: 'rue-input' },
    { id: 'cadeaux-input' },
    { id: 'description-logement-input' },
    { id: 'description-alentours-input' },
    { id: 'code-enregistrement-input' },
    { id: 'site-internet-input' },
    { id: 'inclus-reservation-input' },
    { id: 'hote-input' },
    { id: 'email-input' },
    { id: 'telephone-input' },
    { id: 'annonce-airbnb-input' },
    { id: 'annonce-booking-input' },
    { id: 'annonce-gites-input' },
    { id: 'page-google' },
  ];
  
  fields.forEach(field => {
    const input = document.getElementById(field.id);
    if (input) {
      // NOUVEAU : Bloquer les chiffres pour le champ ville
      if (field.type === 'no-numbers') {
        input.addEventListener('input', (e) => {
          // Supprimer tous les chiffres
          e.target.value = e.target.value.replace(/\d/g, '');
        });
        
        input.addEventListener('keypress', (e) => {
          // Empêcher la saisie de chiffres
          if (/\d/.test(e.key)) {
            e.preventDefault();
          }
        });
      }
      
      input.addEventListener('input', () => {
        // Validation spéciale pour certains champs
        if (field.id === 'site-internet-input') {
          this.validateURL(input);
        } else if (field.id === 'code-enregistrement-input') {
          this.validateCodeEnregistrement(input);
        } else if (field.id === 'email-input') {
          this.validateEmail(input);
        } else if (field.id === 'telephone-input') {
          this.formatTelephone(input);
        }
        
        // NOUVEAU : Si c'est un lien d'annonce, mettre à jour la visibilité
        if (['annonce-airbnb-input', 'annonce-booking-input', 'annonce-gites-input'].includes(field.id)) {
          this.updatePlatformBlocksVisibility();
        }
        
        this.enableButtons();
      });
      input.addEventListener('blur', () => {
        // NOUVEAU : Si c'est un lien d'annonce, mettre à jour la visibilité
        if (['annonce-airbnb-input', 'annonce-booking-input', 'annonce-gites-input'].includes(field.id)) {
          this.updatePlatformBlocksVisibility();
        }
        
        if (this.validationManager) {
          this.validationManager.validateFieldOnBlur(field.id);
        }
      });
    }
  });

  // NOUVEAU : Listeners pour les radio buttons
  document.querySelectorAll('input[name="mode-location"]').forEach(radio => {
    radio.addEventListener('change', () => {
      this.enableButtons();
    });
  });
  
  // NOUVEAU : Listeners pour les checkboxes équipements
  const equipementIds = ['checkbox-piscine', 'checkbox-jacuzzi', 'checkbox-barbecue', 
                      'checkbox-climatisation', 'checkbox-equipement-bebe', 'checkbox-parking',
                      'checkbox-wifi', 'checkbox-four', 'checkbox-lave-vaisselle',
                      'checkbox-seche-linge', 'checkbox-machine-a-laver', 'checkbox-borne-electrique'];
  equipementIds.forEach(id => {
    const checkbox = document.getElementById(id);
    if (checkbox) {
      checkbox.addEventListener('change', () => {
        this.enableButtons();
      });
    }
  });

  // NOUVEAU : Listeners pour caution et acompte avec synchronisation JSON
  const cautionAcompteIds = ['caution-input', 'acompte-input'];
  // Version simplifiée :
cautionAcompteIds.forEach(id => {
  const input = document.getElementById(id);
  if (input) {
    input.addEventListener('input', (e) => {
      // Récupérer la valeur SANS suffixe
      const cleanValue = e.target.value.replace(/[^\d]/g, '');
      let rawValue = parseInt(cleanValue) || 0;
      
      // Limitation pour l'acompte (1-100%)
      if (id === 'acompte-input' && rawValue > 0) {
        if (rawValue > 100) {
          rawValue = 100;
          e.target.value = '100';
        } else if (rawValue < 1) {
          rawValue = 1;
          e.target.value = '1';
        }
      }
      
      // Stocker immédiatement dans data-raw-value
      e.target.setAttribute('data-raw-value', rawValue);
      
      // Mettre à jour le JSON pricing
      if (id === 'caution-input') {
        if (this.pricingData) {
          this.pricingData.caution = rawValue;
        }
      } else if (id === 'acompte-input') {
        if (this.pricingData) {
          this.pricingData.acompte = rawValue;
        }
      }
      
      this.enableButtons();
    });
  }
});
  
  // NOUVEAU : Listeners pour les checkboxes options
  const optionIds = ['checkbox-animaux', 'checkbox-pmr', 'checkbox-fumeurs'];
  optionIds.forEach(id => {
    const checkbox = document.getElementById(id);
    if (checkbox) {
      checkbox.addEventListener('change', () => {
        this.enableButtons();
      });
    }
  });
  
  // NOUVEAU : Listeners pour les modes de paiement
  const paiementIds = ['checkbox-visa', 'checkbox-especes', 'checkbox-mastercard', 
                       'checkbox-virement', 'checkbox-paypal', 'checkbox-wero', 
                       'checkbox-amex', 'checkbox-cheques', 'checkbox-cheques-vacances'];
  paiementIds.forEach(id => {
    const checkbox = document.getElementById(id);
    if (checkbox) {
      checkbox.addEventListener('change', () => {
        this.enableButtons();
      });
    }
  });

  // NOUVEAU : Listeners pour les horaires (Cleave s'occupe de la validation)
  const horaireIds = ['heure-arrivee-input', 'heure-arrivee-debut-input', 'heure-arrivee-fin-input', 'heure-depart-input'];
  horaireIds.forEach(id => {
    const input = document.getElementById(id);
    if (input) {
      input.addEventListener('input', () => {
        this.enableButtons();
      });
      input.addEventListener('blur', () => {
        if (this.validationManager) {
          this.validationManager.validateFieldOnBlur(id);
        }
      });
    }
  });

  // Radio buttons arrivée (mode fixe / créneau)
  this.setupArriveeModelisteners();

// Listeners pour la politique d'annulation (radio buttons)
  document.querySelectorAll('input[name="cancellation-policy"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      const customBloc = document.getElementById('bloc-custom-annulation');
      if (customBloc) {
        if (e.target.value === 'custom') {
          customBloc.style.display = 'block';
          const textarea = document.getElementById('conditions-annulation-input');
          if (textarea) setTimeout(() => textarea.focus(), 100);
        } else {
          customBloc.style.display = 'none';
        }
      }
      this.enableButtons();
    });
  });

  // Listener sur le textarea pour le mode personnalisé
  const conditionsTextarea = document.getElementById('conditions-annulation-input');
  if (conditionsTextarea) {
    conditionsTextarea.addEventListener('input', () => {
      this.enableButtons();
    });
    conditionsTextarea.addEventListener('blur', () => {
      if (this.validationManager) {
        this.validationManager.validateFieldOnBlur('conditions-annulation-input');
      }
    });
  }
  
  // NOUVEAU : Listeners pour taille maison avec synchronisation capacity
  const tailleMaisonIds = ['voyageurs-input', 'chambres-input', 'lits-input', 'salles-bain-input'];
  tailleMaisonIds.forEach(id => {
    const input = document.getElementById(id);
    if (input) {
      input.addEventListener('input', (e) => {
        // Limiter aux nombres
        e.target.value = e.target.value.replace(/\D/g, '');
        
        // Si c'est le nombre de voyageurs, synchroniser avec capacity
        if (id === 'voyageurs-input') {
          const newCapacity = parseInt(e.target.value) || 0;
          if (this.pricingData) {
            this.pricingData.capacity = newCapacity;
          }
        }
        
        this.enableButtons();
      });
    }
  });
  
  // 🆕 AJOUTER cet appel
  this.setupDefaultPricingListeners();

  this.setupCleaningListeners();
  this.setupWeekendListeners();
  this.setupExtraGuestsListeners();
  // 🆕 AJOUTER les gestionnaires d'opacité
  this.setupPriceOpacityHandlers();
}

// Validation de l'URL
validateURL(input) {
  const value = input.value.trim();
  if (value === '') return true; // Champ vide OK
  
  // Ajouter http:// si pas de protocole
  if (value && !value.match(/^https?:\/\//)) {
    input.value = 'https://' + value;
  }
  
  // Pattern URL simple
  const urlPattern = /^https?:\/\/([\w\-]+\.)+[\w\-]+(\/[\w\-._~:/?#[\]@!$&'()*+,;=]*)?$/;
  
  if (!urlPattern.test(input.value)) {
    input.style.borderColor = '#ff0000';
    input.setCustomValidity('URL invalide');
    return false;
  } else {
    input.style.borderColor = '';
    input.setCustomValidity('');
    return true;
  }
}

// Validation du code d'enregistrement (alphanumérique, sans limite de longueur)
validateCodeEnregistrement(input) {
  const value = input.value.trim();
  if (value === '') return true; // Champ vide OK (sera géré par required)
  
  // Garder seulement les caractères alphanumériques (lettres et chiffres)
  const alphanumOnly = value.replace(/[^a-zA-Z0-9]/g, '');
  
  if (alphanumOnly !== value) {
    input.value = alphanumOnly;
  }
  
  // Convertir en majuscules pour uniformité
  input.value = input.value.toUpperCase();
  
  // Pas de limitation de longueur, juste reset les styles
  input.style.borderColor = '';
  input.setCustomValidity('');
  return true;
}

  // Validation de l'email
validateEmail(input) {
  const value = input.value.trim();
  if (value === '') return true;
  
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailPattern.test(value)) {
    input.style.borderColor = '#ff0000';
    input.setCustomValidity('Email invalide');
    return false;
  } else {
    input.style.borderColor = '';
    input.setCustomValidity('');
    return true;
  }
}

// Formatage du téléphone
formatTelephone(input) {
  let value = input.value;
  
  // Garder seulement les chiffres et le +
  value = value.replace(/[^\d+]/g, '');
  
  // Limiter à 15 caractères (standard international)
  if (value.length > 15) {
    value = value.substring(0, 15);
  }
  
  input.value = value;
}
  
// 🆕 NOUVELLE MÉTHODE à ajouter après setupFieldListeners()
setupDefaultPricingListeners() {
  const defaultPriceInput = document.getElementById('default-price-input');
  if (defaultPriceInput) {
    defaultPriceInput.addEventListener('input', () => {
      // AJOUTER : Mise à jour immédiate de data-raw-value
      const cleanValue = defaultPriceInput.value.replace(/[^\d]/g, '');
      defaultPriceInput.setAttribute('data-raw-value', cleanValue || '0');
      
      this.updateDefaultPricing();
      this.enableButtons();
    });
  }
  
  // Nuits minimum
  const defaultMinNightsInput = document.getElementById('default-min-nights-input');
  if (defaultMinNightsInput) {
    defaultMinNightsInput.addEventListener('input', () => {
      this.updateDefaultPricing();
      this.enableButtons();
    });
  }
  
  // Prix plateformes
  const platforms = ['airbnb', 'booking', 'other'];
  platforms.forEach(platform => {
    const input = document.getElementById(`default-${platform}-price-input`);
    if (input) {
      input.addEventListener('input', () => {
        // IMPORTANT : Mettre à jour data-raw-value immédiatement
        const cleanValue = input.value.replace(/[^\d]/g, '');
        input.setAttribute('data-raw-value', cleanValue || '0');
        
        this.updateDefaultPricing();
        this.enableButtons();
        
        // NOUVEAU : Mettre à jour la visibilité des blocs
        this.updatePlatformBlocksVisibility();
      });
      input.addEventListener('blur', () => {
        // Double vérification au blur
        const cleanValue = input.value.replace(/[^\d]/g, '');
        input.setAttribute('data-raw-value', cleanValue || '0');
        
        // NOUVEAU : Mettre à jour la visibilité des blocs
        this.updatePlatformBlocksVisibility();
        
        if (this.validationManager) {
          // Valider le champ individuel
          this.validationManager.validateFieldOnBlur(`default-${platform}-price-input`);
          // Valider aussi la règle des 10%
          this.validationManager.validatePlatformPrices();
        }
      });
    }
  });
}

// 🆕 NOUVELLE MÉTHODE : Configurer les listeners pour le ménage
setupCleaningListeners() {
  
  const includedRadio = document.getElementById('inclus');
  const notIncludedRadio = document.getElementById('non-inclus');
  const optionalRadio = document.getElementById('option');
  const priceInput = document.getElementById('cleaning-price-input');
  
  if (!includedRadio || !notIncludedRadio || !optionalRadio || !priceInput) {
    return;
  }
  
  // Listener pour "Inclus"
  includedRadio.addEventListener('change', () => {
    if (includedRadio.checked) {
      priceInput.style.display = 'none';
      priceInput.value = '';
      priceInput.removeAttribute('data-raw-value');
      
      // Mettre à jour les données
      if (!this.pricingData.cleaning) {
        this.pricingData.cleaning = {};
      }
      this.pricingData.cleaning.included = true;
      this.pricingData.cleaning.optional = false;
      this.pricingData.cleaning.price = 0;
      
      this.enableButtons();
    }
  });
  
  // Listener pour "Non inclus"
  notIncludedRadio.addEventListener('change', () => {
    if (notIncludedRadio.checked) {
      priceInput.style.display = 'block';
      
      // Focus sur le champ prix
      setTimeout(() => priceInput.focus(), 100);
      
      // Mettre à jour les données
      if (!this.pricingData.cleaning) {
        this.pricingData.cleaning = {};
      }
      this.pricingData.cleaning.included = false;
      this.pricingData.cleaning.optional = false;
      
      this.enableButtons();
    }
  });
  
  // Listener pour "En option"
  optionalRadio.addEventListener('change', () => {
    if (optionalRadio.checked) {
      priceInput.style.display = 'block';
      
      // Focus sur le champ prix
      setTimeout(() => priceInput.focus(), 100);
      
      // Mettre à jour les données
      if (!this.pricingData.cleaning) {
        this.pricingData.cleaning = {};
      }
      this.pricingData.cleaning.included = false;
      this.pricingData.cleaning.optional = true;
      
      this.enableButtons();
    }
  });
    
  // Listener pour le prix du ménage
  priceInput.addEventListener('input', () => {
    const value = parseInt(priceInput.value.replace(/[^\d]/g, '')) || 0;
    
    if (!this.pricingData.cleaning) {
      this.pricingData.cleaning = {};
    }
    this.pricingData.cleaning.price = value;
    
    this.enableButtons();
  });
  
  // Formatage du prix
  priceInput.addEventListener('blur', function() {
    const value = this.value.replace(/[^\d]/g, '');
    if (value) {
      this.setAttribute('data-raw-value', value);
      this.value = value + '€';
    }
  });
  
  priceInput.addEventListener('focus', function() {
    const rawValue = this.getAttribute('data-raw-value');
    if (rawValue) {
      this.value = rawValue;
    }
  });
}

  // Version corrigée avec cascade des états
  setupPriceOpacityHandlers() {    
    // Configuration centralisée des dépendances
    const dependencies = [
      {
        trigger: 'default-price-input',
        target: 'bloc-tarifs-plateformes',
        condition: (value) => value && parseInt(value) > 0
      }
    ];
    
    // Appliquer la logique pour chaque dépendance
    dependencies.forEach(({ trigger, target, condition }) => {
      const triggerElement = document.getElementById(trigger);
      const targetElement = document.getElementById(target);
      
      if (!triggerElement || !targetElement) return;
      
      // Fonction réutilisable pour la mise à jour
      const updateOpacity = () => {
        const value = this.getRawValue(triggerElement);
        const isActive = condition(value);
        this.setBlockState(targetElement, isActive);
      };
      
      // État initial
      updateOpacity();
      
      // Listeners
      triggerElement.addEventListener('input', updateOpacity);
      triggerElement.addEventListener('blur', updateOpacity);
    });
    
    // 🆕 IMPORTANT : Appliquer l'état initial complet
    this.applyInitialStates();
  }

  applyInitialStates() {
    // 1. D'abord vérifier le prix par défaut
    const defaultPriceInput = document.getElementById('default-price-input');
    const defaultPriceValue = this.getRawValue(defaultPriceInput);
    const hasDefaultPrice = defaultPriceValue && parseInt(defaultPriceValue) > 0;
    
    // 2. Si pas de prix par défaut, désactiver seulement le bloc tarifs plateformes
    if (!hasDefaultPrice) {
      const blocPlateformes = document.getElementById('bloc-tarifs-plateformes');
      if (blocPlateformes) {
        this.setBlockState(blocPlateformes, false);
      }
    }
  }

// Méthode helper améliorée pour gérer l'état d'un bloc
setBlockState(element, isActive) {
  if (!element) return;
  
  element.style.opacity = isActive ? '1' : '0.5';
  
  const inputs = element.querySelectorAll('input');
  inputs.forEach(input => {
    input.disabled = !isActive;
    input.style.cursor = isActive ? 'text' : 'not-allowed';
    
    // 🆕 IMPORTANT : Forcer le style pour être sûr
    if (!isActive) {
      input.style.pointerEvents = 'none';
      input.style.opacity = '0.6';
    } else {
      input.style.pointerEvents = 'auto';
      input.style.opacity = '1';
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

  updateDefaultPricing() {
  
  // S'assurer que la structure existe
  if (!this.pricingData.defaultPricing) {
    this.pricingData.defaultPricing = {
      price: 0,
      minNights: 0,
      platformPrices: {}
    };
  }
  
  // Prix par défaut
  const defaultPriceInput = document.getElementById('default-price-input');
  if (defaultPriceInput) {
    this.pricingData.defaultPricing.price = parseInt(this.getRawValue(defaultPriceInput)) || 0;
  }
  
  // Nuits minimum
  const defaultMinNightsInput = document.getElementById('default-min-nights-input');
  if (defaultMinNightsInput) {
    this.pricingData.defaultPricing.minNights = parseInt(defaultMinNightsInput.value) || 0;
  }
  
  // Prix plateformes
  const platforms = ['airbnb', 'booking', 'other'];
  let hasPlatformPrices = false;
  
  platforms.forEach(platform => {
    const input = document.getElementById(`default-${platform}-price-input`);
    if (input) {
      // IMPORTANT : Forcer la récupération depuis data-raw-value
      let value = input.getAttribute('data-raw-value');
      
      // Si pas de data-raw-value, extraire depuis la valeur actuelle
      if (!value && input.value) {
        value = input.value.replace(/[^\d]/g, '');
      }
      
      const numericValue = parseInt(value) || 0;
      
      if (numericValue > 0) {
        if (!this.pricingData.defaultPricing.platformPrices) {
          this.pricingData.defaultPricing.platformPrices = {};
        }
        this.pricingData.defaultPricing.platformPrices[platform] = numericValue;
        hasPlatformPrices = true;
      } else if (this.pricingData.defaultPricing.platformPrices && this.pricingData.defaultPricing.platformPrices[platform]) {
        // 🆕 Si la valeur est 0 ou vide, supprimer la plateforme
        delete this.pricingData.defaultPricing.platformPrices[platform];
      }
    }
  });
  
  // Si aucun prix plateforme, supprimer l'objet
  if (!hasPlatformPrices && this.pricingData.defaultPricing.platformPrices) {
    delete this.pricingData.defaultPricing.platformPrices;
  }
  
}
  
  setupSaveButton() {
    
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
    
  }

  
  cancelModifications() {

    if (this.validationManager) {
      this.validationManager.clearAllErrors();
    }
    // Configuration des champs à réinitialiser
    const fields = [
      { id: 'name-input', dataKey: 'name' },
      { id: 'cadeaux-input', dataKey: 'cadeaux' },
      { id: 'description-logement-input', dataKey: 'description_logement' },
      { id: 'description-alentours-input', dataKey: 'description_alentours' },
      { id: 'code-enregistrement-input', dataKey: 'code_enregistrement' },
      { id: 'site-internet-input', dataKey: 'site_internet' },
      { id: 'inclus-reservation-input', dataKey: 'inclus_reservation' },
      { id: 'hote-input', dataKey: 'host_name' },
      { id: 'email-input', dataKey: 'email' },
      { id: 'telephone-input', dataKey: 'telephone' },
      { id: 'annonce-airbnb-input', dataKey: 'annonce_airbnb' },
      { id: 'annonce-booking-input', dataKey: 'annonce_booking' },
      { id: 'annonce-gites-input', dataKey: 'annonce_gites' },
      { id: 'page-google', dataKey: 'page_google' }
    ];
    
    // Remettre les valeurs initiales
    fields.forEach(field => {
      const input = document.getElementById(field.id);
      if (input) {
        input.value = this.initialValues[field.dataKey] || '';
      }
    });

    this.prefillComplexFields();
    this.prefillTailleMaison();
    this.prefillHoraires();
    this.prefillCancellationPolicy();
    this.prefillCautionAcompte();
    // Restaurer les saisons d'origine
    if (this.propertyData.pricing_data) {
      // 🔧 COPIE PROFONDE pour éviter les références
      this.pricingData = JSON.parse(JSON.stringify(this.propertyData.pricing_data));
    } else {
      // Si pas de données d'origine, réinitialiser à vide
      this.pricingData = {
        seasons: [],
        cleaning: { included: true, optional: false },
        discounts: [],
        capacity: 4,
        caution: 0,
        acompte: 30
      };
    }
    
    // Réafficher les saisons
    this.hideAllSeasonBlocks();
    this.displayExistingSeasons();

    this.displayDiscounts();
    
    this.prefillDefaultPricing();    
    // 🆕 AJOUTER : Restaurer les options de ménage
    this.prefillCleaningOptions();
    this.prefillWeekendOptions();
    this.prefillExtraGuestsOptions();
    // Réinitialiser les iCals depuis les valeurs initiales
    for (let i = 1; i <= 4; i++) {
      const input = document.getElementById(`ical-url-${i}`);
      if (input) {
        const fieldName = this.icalFieldMapping[i - 1];
        input.value = this.initialValues[fieldName] || '';
      }
    }
    // Pour réafficher les blocs correctement
    this.displayIcals();
    this.prefillAddress();
    
    // Restaurer les liens plateformes si chambre d'hôtes
    const isChambreHote = (this.propertyData.mode_location || '') === "Chambre d'hôtes";
    if (isChambreHote) {
      ['lien-airbnb-input', 'lien-booking-input', 'lien-autre-input'].forEach(id => {
        const input = document.getElementById(id);
        if (input) {
          input.value = this.initialValues[`lien_${id}`] || '';
        }
      });
    }

    this.propertyData.extras = this.initialValues.extras || '';
    this.parseAndDisplayExtras();

    // 🆕 NOUVEAU : Restaurer les images
    this.currentImagesGallery = JSON.parse(JSON.stringify(this.initialValues.images_gallery || []));
    
    // IMPORTANT : Détruire SortableJS pour annuler ses modifications DOM
    if (this.sortableInstance) {
      this.sortableInstance.destroy();
      this.sortableInstance = null;
    }
    
    // Forcer un reset complet du DOM
    const container = document.querySelector('.images-grid');
    if (container) {
      // Sauvegarder tous les image-blocks
      const blocks = [];
      for (let i = 1; i <= 20; i++) {
        const block = document.getElementById(`image-block-${i}`);
        if (block) {
          blocks.push(block);
        }
      }
      
      // Les remettre dans l'ordre numérique original (1, 2, 3, etc.)
      blocks.forEach(block => {
        container.appendChild(block); // appendChild déplace l'élément
      });
    }
    
    // Maintenant réafficher avec les bonnes images
    this.displayEditableGallery();
    
    // Recréer SortableJS
    setTimeout(() => {
      this.initSortable();
    }, 100);

        // Mettre à jour l'état du bouton d'ajout de photos
    this.updateAddPhotosButtonState();
    
    // 🆕 Annuler la photo de profil staged si existante
    if (this.stagedHostImage?.url?.startsWith('blob:')) {
      URL.revokeObjectURL(this.stagedHostImage.url);
    }
    this.stagedHostImage = null;
    // Re-afficher la photo de profil originale
    this.displayHostImage();
    
    // Désactiver les boutons
    this.disableButtons();
  }

    async saveModifications() {

  // 🆕 Validation : 
  // - champ vide  → on laisse passer le save (sera complété plus tard)
  // - valeur invalide → on bloque le save (data integrity)
  let fieldsValid = true;
  let hasFormatErrors = false;
  let hasEmptyErrors = false;
  
  if (this.validationManager) {
    fieldsValid = this.validationManager.validateAllFields();
    
    if (!fieldsValid) {
      const { empty, format } = this.validationManager.categorizeErrors('validationConfig');
      hasEmptyErrors = empty.length > 0;
      hasFormatErrors = format.length > 0;
    }
  }
  
    // Si VALEURS INVALIDES (mauvais format, hors plage…) : BLOQUER le save
  // Pas de scroll : l'hôte vient de taper, il sait où il est, et les pastilles
  // rouges sur les onglets/champs l'informent visuellement
  if (hasFormatErrors) {
    console.log('❌ Valeurs invalides détectées - sauvegarde annulée');
    this.showNotification('error', 'Certaines valeurs sont invalides, veuillez les corriger avant d\'enregistrer');
    
    // Scroll vers le 1er champ avec valeur invalide (pas vers les champs vides)
    const { format } = this.validationManager.categorizeErrors('validationConfig');
    setTimeout(() => {
      if (format[0]) {
        this.validationManager.navigateToField(format[0]);
      }
    }, 100);
    
    return; // BLOQUE le save
  }
  
  // Si seulement CHAMPS VIDES : on continue le save sans notification ni scroll
  // (les pastilles rouges sur les onglets restent visibles pour informer)
  if (hasEmptyErrors) {
    console.log('⚠️ Champs vides détectés - sauvegarde en mode brouillon');
  }
    
 // 🆕 NOUVEAU : Sauvegarder la valeur brute AVANT le blur
  const activeElement = document.activeElement;
  let activeElementValue = null;
  let activeElementId = null;
  
  if (activeElement && activeElement.tagName === 'INPUT') {
    activeElementId = activeElement.id;
    // Capturer la valeur brute AVANT le blur
    if (activeElement.hasAttribute('data-suffix')) {
      activeElementValue = activeElement.value.replace(/[^\d]/g, '');
      // Forcer la mise à jour de data-raw-value
      activeElement.setAttribute('data-raw-value', activeElementValue);
    }
    
    activeElement.blur();
    // Petit délai pour laisser le blur se terminer
    await new Promise(resolve => setTimeout(resolve, 50));
  }
    
    
  // Configuration du mapping des champs
  const fieldMapping = [
    { id: 'name-input', dataKey: 'name', dbKey: 'name' },
    { id: 'cadeaux-input', dataKey: 'cadeaux', dbKey: 'cadeaux' },
    { id: 'description-logement-input', dataKey: 'description_logement', dbKey: 'description_logement' },
    { id: 'description-alentours-input', dataKey: 'description_alentours', dbKey: 'description_alentours' },
    { id: 'code-enregistrement-input', dataKey: 'code_enregistrement', dbKey: 'code_enregistrement' },
    { id: 'site-internet-input', dataKey: 'site_internet', dbKey: 'site_internet' },
    { id: 'inclus-reservation-input', dataKey: 'inclus_reservation', dbKey: 'inclus_reservation' },
    { id: 'hote-input', dataKey: 'host_name', dbKey: 'host_name' },
    { id: 'email-input', dataKey: 'email', dbKey: 'email' },
    { id: 'telephone-input', dataKey: 'telephone', dbKey: 'telephone' },
    { id: 'annonce-airbnb-input', dataKey: 'annonce_airbnb', dbKey: 'annonce_airbnb' },
    { id: 'annonce-booking-input', dataKey: 'annonce_booking', dbKey: 'annonce_booking' },
    { id: 'annonce-gites-input', dataKey: 'annonce_gites', dbKey: 'annonce_gites' },
    { id: 'page-google', dataKey: 'page_google', dbKey: 'page_google' }
  ];
    
  // Collecter les valeurs actuelles
  const currentValues = {};
  fieldMapping.forEach(field => {
    const input = document.getElementById(field.id);
    if (input) {
      currentValues[field.dataKey] = input.value.trim();
    }
  });

  // NOUVEAU : Collecter le mode de location
  const selectedMode = document.querySelector('input[name="mode-location"]:checked');
  if (selectedMode) {
    currentValues.mode_location = selectedMode.value;
  }
  
  // NOUVEAU : Collecter les équipements cochés
  const equipementsMapping = {
    'checkbox-piscine': 'Piscine',
    'checkbox-jacuzzi': 'Jacuzzi',
    'checkbox-barbecue': 'Barbecue',
    'checkbox-climatisation': 'Climatisation',
    'checkbox-equipement-bebe': 'Équipement bébé',
    'checkbox-parking': 'Parking gratuit',
    'checkbox-wifi': 'Wifi',
    'checkbox-four': 'Four',
    'checkbox-lave-vaisselle': 'Lave-vaisselle',
    'checkbox-seche-linge': 'Sèche-linge',
    'checkbox-machine-a-laver': 'Machine à laver',
    'checkbox-borne-electrique': 'Borne électrique'
  };
  
  const selectedEquipements = [];
  Object.entries(equipementsMapping).forEach(([id, value]) => {
    const checkbox = document.getElementById(id);
    if (checkbox && checkbox.checked) {
      selectedEquipements.push(value);
    }
  });
  currentValues.equipements_principaux = selectedEquipements;
  
  // NOUVEAU : Collecter les options cochées
  const optionsMapping = {
    'checkbox-animaux': 'Animaux autorisés',
    'checkbox-pmr': 'Accès PMR',
    'checkbox-fumeurs': 'Fumeurs autorisés'
  };
  
  const selectedOptions = [];
  Object.entries(optionsMapping).forEach(([id, value]) => {
    const checkbox = document.getElementById(id);
    if (checkbox && checkbox.checked) {
      selectedOptions.push(value);
    }
  });
  currentValues.options_accueil = selectedOptions;

  // NOUVEAU : Collecter les modes de paiement cochés
  const modesPaiementMapping = {
    'checkbox-visa': 'Visa',
    'checkbox-especes': 'Espèces',
    'checkbox-mastercard': 'MasterCard',
    'checkbox-virement': 'Virement bancaire',
    'checkbox-paypal': 'PayPal',
    'checkbox-wero': 'Wero',
    'checkbox-amex': 'American Express',
    'checkbox-cheques': 'Chèques acceptés',
    'checkbox-cheques-vacances': 'Chèques-vacances'
  };
  
  const selectedModesPaiement = [];
  Object.entries(modesPaiementMapping).forEach(([id, value]) => {
    const checkbox = document.getElementById(id);
    if (checkbox && checkbox.checked) {
      selectedModesPaiement.push(value);
    }
  });
  currentValues.mode_paiement = selectedModesPaiement;
    
  // NOUVEAU : Reconstituer la chaîne taille maison
  const voyageurs = document.getElementById('voyageurs-input')?.value || '0';
  const chambres = document.getElementById('chambres-input')?.value || '0';
  const lits = document.getElementById('lits-input')?.value || '0';
  const sallesBain = document.getElementById('salles-bain-input')?.value || '0';
  
  const pluriel = {
    voyageur: parseInt(voyageurs) > 1 ? 's' : '',
    chambre: parseInt(chambres) > 1 ? 's' : '',
    lit: parseInt(lits) > 1 ? 's' : '',
    salle: parseInt(sallesBain) > 1 ? 's' : ''
  };
  
  const nouvelleTailleMaison = `${voyageurs} voyageur${pluriel.voyageur} - ${chambres} chambre${pluriel.chambre} - ${lits} lit${pluriel.lit} - ${sallesBain} salle${pluriel.salle} de bain`;

  // 🆕 NOUVEAU : Synchroniser capacity MAINTENANT avant toute comparaison
  const nouveauNombreVoyageurs = parseInt(voyageurs) || 0;
  if (this.pricingData && nouveauNombreVoyageurs !== this.pricingData.capacity) {
    this.pricingData.capacity = nouveauNombreVoyageurs;
  }

  // Collecter les horaires
  const arriveeMode = document.querySelector('input[name="arrivee-mode"]:checked')?.value || 'fixe';
  let heureArrivee = '';
  
  if (arriveeMode === 'creneau') {
    const debut = document.getElementById('heure-arrivee-debut-input')?.value || '';
    const fin = document.getElementById('heure-arrivee-fin-input')?.value || '';
    if (debut && fin) {
      heureArrivee = `${debut}-${fin}`;
    }
  } else {
    heureArrivee = document.getElementById('heure-arrivee-input')?.value || '';
  }
  
  const heureDepart = document.getElementById('heure-depart-input')?.value || '';
  
  if (heureArrivee && heureDepart) {
    currentValues.horaires_arrivee_depart = `${heureArrivee},${heureDepart}`;
  }

  // NOUVEAU : Construire l'adresse à partir des 3 champs
  const ville = document.getElementById('ville-input')?.value.trim() || '';
  const pays = document.getElementById('pays-input')?.value.trim() || '';
  const rue = document.getElementById('rue-input')?.value.trim() || '';
  
  // Construire l'adresse complète
  let adresseComplete = '';
  if (ville && pays) {
    adresseComplete = ville + ', ' + pays;
    if (rue) {
      adresseComplete += ', ' + rue;
    }
  }
  
  currentValues.address = adresseComplete;
    
  // NOUVEAU : Forcer le blur pour capturer les valeurs avec data-raw-value
  const cautionInput = document.getElementById('caution-input');
  const acompteInput = document.getElementById('acompte-input');
  
  if (cautionInput && document.activeElement === cautionInput) {
    cautionInput.blur();
  }
  if (acompteInput && document.activeElement === acompteInput) {
    acompteInput.blur();
  }
  
  // Petit délai pour laisser le blur se terminer
  await new Promise(resolve => setTimeout(resolve, 50));
  
  // MAINTENANT récupérer les valeurs
  const cautionValue = this.getRawValue(cautionInput) || '0';
  const acompteValue = this.getRawValue(acompteInput) || '0';
  
  let conditionsTexte = '';
  
  if (parseInt(cautionValue) > 0) {
    conditionsTexte = `Caution : Une caution de ${cautionValue}€ est requise. Les modalités de remise (à l’arrivée, empreinte bancaire, etc.) sont précisées par l’hôte.`;
  }
  
  if (parseInt(acompteValue) > 0) {
    const acompteTexte = `Acompte : ${acompteValue}% du montant total de la réservation est demandé pour confirmer la réservation.`;
    conditionsTexte = conditionsTexte 
      ? conditionsTexte + '\n' + acompteTexte 
      : acompteTexte;
  }
  
  currentValues.conditions_reservation = conditionsTexte;

// Collecter la politique d'annulation
  const selectedPolicy = document.querySelector('input[name="cancellation-policy"]:checked');
  if (selectedPolicy) {
    if (selectedPolicy.value === 'custom') {
      const customText = document.getElementById('conditions-annulation-input')?.value.trim() || '';
      currentValues.conditions_annulation = customText;
    } else {
      currentValues.conditions_annulation = selectedPolicy.value;
    }
  }
    
  const updates = {};

  // Liens plateformes pour logement parent chambre d'hôtes
  const isChambreHote = (this.propertyData.mode_location || '') === "Chambre d'hôtes";
  
  if (isChambreHote) {
    const lienAirbnb = document.getElementById('lien-airbnb-input')?.value.trim() || '';
    const lienBooking = document.getElementById('lien-booking-input')?.value.trim() || '';
    const lienAutre = document.getElementById('lien-autre-input')?.value.trim() || '';
    
    if (lienAirbnb !== (this.initialValues['lien_lien-airbnb-input'] || '')) {
      updates.annonce_airbnb = lienAirbnb;
    }
    if (lienBooking !== (this.initialValues['lien_lien-booking-input'] || '')) {
      updates.annonce_booking = lienBooking;
    }
    if (lienAutre !== (this.initialValues['lien_lien-autre-input'] || '')) {
      updates.annonce_gites = lienAutre;
    }
  }
  // Comparer avec les valeurs initiales
  Object.keys(currentValues).forEach(key => {
    if (key === 'equipements_principaux' || key === 'options_accueil' || key === 'mode_paiement') {
      const currentStr = currentValues[key].join(', ');
      const initialStr = (this.initialValues[key] || []).join(', ');
      if (currentStr !== initialStr) {
        updates[key] = currentStr;
      }
    } else if (currentValues[key] !== this.initialValues[key]) {
      updates[key] = currentValues[key];
    }
  });

      const currentStatus = this.propertyData.verification_status || 'pending-none';
  if (currentStatus === 'pending-none') {
    // 🆕 Vérifier que les photos sont complètes (3 logement + 1 profil)
    const galleryCount = Array.isArray(this.currentImagesGallery) ? this.currentImagesGallery.length : 0;
    const hasHostImage = !!(this.propertyData.host_image && String(this.propertyData.host_image).trim())
                        || !!this.stagedHostImage?._staged;
    const photosComplete = galleryCount >= 3 && hasHostImage;
    
    // 🆕 On utilise fieldsValid capturé au début de saveModifications
    if (isChambreHote) {
      // Chambre d'hôtes : champs valides + au moins 1 chambre + photos OK
      if (fieldsValid && this.roomsCount >= 1 && photosComplete) {
        updates['verification_status'] = 'pending-verif';
      }
    } else {
      // Logement entier : champs valides + photos OK
      if (fieldsValid && photosComplete) {
        updates['verification_status'] = 'pending-verif';
      }
    }
  }

    
  // NOUVEAU : Comparaison manuelle pour taille_maison
  if (nouvelleTailleMaison !== this.initialValues.taille_maison) {
    updates.taille_maison = nouvelleTailleMaison;
  }
  
  // Si taille_maison a changé ET contient des voyageurs, forcer l'envoi du JSON
  if (updates.taille_maison && updates.taille_maison.includes('voyageur')) {
    updates.pricing_data = this.pricingData;
  }

  // Si caution ou acompte a changé, forcer l'envoi du JSON
  const cautionChanged = parseInt(cautionValue) !== this.initialValues.caution;
  const acompteChanged = parseInt(acompteValue) !== this.initialValues.acompte;
  
  if ((updates.taille_maison && updates.taille_maison.includes('voyageur')) || 
      cautionChanged || acompteChanged) {
    updates.pricing_data = this.pricingData;
  }
    
  // 🆕 Gérer les extras séparément
  const currentExtrasString = this.generateExtrasString();
  const initialExtrasString = this.initialValues.extras || '';
  
  if (currentExtrasString !== initialExtrasString) {
    updates.extras = currentExtrasString;
  }
    
  // Injecter l'URL par défaut si aucun iCal n'est rempli
  let hasAnyIcal = false;
  for (let i = 1; i <= 4; i++) {
    const input = document.getElementById(`ical-url-${i}`);
    if (input && input.value.trim() !== '') {
      hasAnyIcal = true;
      break;
    }
  }
  
  if (!hasAnyIcal) {
    const firstIcalInput = document.getElementById('ical-url-1');
    if (firstIcalInput) {
      firstIcalInput.value = this.DEFAULT_ICAL_URL;
    }
  }
  
  // NOUVEAU : Collecter les iCals modifiés avec la bonne logique
  const currentIcalValues = [];
  for (let i = 1; i <= 4; i++) {
    const input = document.getElementById(`ical-url-${i}`);
    currentIcalValues.push(input ? input.value.trim() : '');
  }
  
  // Mapper les valeurs actuelles aux champs CMS
  // IMPORTANT : Les valeurs dans l'ordre des inputs correspondent aux champs CMS dans l'ordre
  this.icalFieldMapping.forEach((fieldName, index) => {
    const currentValue = currentIcalValues[index] || '';
    const initialValue = this.initialValues[fieldName] || '';
    
    // Toujours envoyer la valeur si elle a changé (même si vide)
    if (currentValue !== initialValue) {
      updates[fieldName] = currentValue;
    }
  });
      
  const originalPricingJson = JSON.stringify(this.propertyData.pricing_data || {});
  const currentPricingJson = JSON.stringify(this.pricingData);
  
    if (originalPricingJson !== currentPricingJson) {
    updates.pricing_data = this.pricingData;
  } else {
    console.log('❌ Les données tarifaires sont identiques, pas d\'ajout aux updates');
  }

  // 🆕 Upload des photos en staging vers des URLs temporaires (si applicable)
  try {
    if (this.currentImagesGallery.some(p => p._staged)) {
      this.showNotification('success', 'Envoi des photos en cours...');
      await this.uploadStagedPhotos(this.currentImagesGallery, 'logement');
    }
  } catch (err) {
    console.error('❌ Erreur upload photos :', err);
    this.showNotification('error', 'Échec de l\'envoi des photos : ' + err.message);
    return;
  }
  
  // 🆕 Upload de la photo de profil si staged
  let stagedHostUrl = null;
  try {
    if (this.stagedHostImage?._staged) {
      this.showNotification('success', 'Envoi de la photo de profil...');
      stagedHostUrl = await this.uploadStagedHostImage();
    }
  } catch (err) {
    console.error('❌ Erreur upload photo profil :', err);
    this.showNotification('error', 'Échec photo de profil : ' + err.message);
    return;
  }
  if (stagedHostUrl) {
    updates['image-hote'] = { url: stagedHostUrl };
  }

  // 🆕 NOUVEAU : Vérifier si les images ont changé
  const originalImagesJson = JSON.stringify(this.originalImagesGallery);
  const currentImagesJson = JSON.stringify(this.currentImagesGallery);
  
  if (originalImagesJson !== currentImagesJson) {
    // Vérifier minimum 3 images avant de sauvegarder
    if (this.currentImagesGallery.length < 3) {
      this.showNotification('error', 'Minimum 3 photos requises pour le logement');
      
      // Réactiver le bouton
      saveButton.disabled = false;
      saveButton.textContent = originalText;
      return;
    }
    
    updates['photos-du-logement'] = this.currentImagesGallery;
  }
    
    // Si aucune modification
    if (Object.keys(updates).length === 0) {
      this.showNotification('error', 'Aucune modification détectée');
      return;
    }
    
    
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
      
      // Mettre à jour les valeurs initiales avec les nouvelles valeurs
      Object.keys(updates).forEach(key => {
        if (key !== 'pricing_data') {
          // IMPORTANT : Garder le format Array pour ces champs spécifiques
          if (key === 'equipements_principaux' || key === 'options_accueil' || key === 'mode_paiement') {
            // Utiliser currentValues qui a encore le format Array original
            this.initialValues[key] = currentValues[key];
          } else {
            this.initialValues[key] = updates[key];
          }
          
          // NOUVEAU : Si c'est le nom, mettre à jour aussi l'affichage
          if (key === 'name') {
            this.propertyData.name = updates[key];
            const titleElement = document.getElementById('logement-name-edit');
            if (titleElement) {
              titleElement.textContent = updates[key];
            }
          }
        }
      });
      
      // 🆕 IMPORTANT : Mettre à jour aussi les valeurs iCal dans propertyData
      this.icalFieldMapping.forEach((fieldName, index) => {
        const input = document.getElementById(`ical-url-${index + 1}`);
        if (input) {
          const currentValue = input.value.trim();
          this.propertyData[fieldName] = currentValue;
          this.initialValues[fieldName] = currentValue;
        }
      });

      // Mettre à jour les liens plateformes chambre d'hôtes
      if (isChambreHote) {
        ['lien-airbnb-input', 'lien-booking-input', 'lien-autre-input'].forEach(id => {
          const input = document.getElementById(id);
          if (input) {
            this.initialValues[`lien_${id}`] = input.value.trim();
          }
        });
        // Mettre à jour propertyData
        if (updates.annonce_airbnb !== undefined) this.propertyData.annonce_airbnb = updates.annonce_airbnb;
        if (updates.annonce_booking !== undefined) this.propertyData.annonce_booking = updates.annonce_booking;
                if (updates.annonce_gites !== undefined) this.propertyData.annonce_gites = updates.annonce_gites;
        if (updates.verification_status) {
          this.propertyData.verification_status = updates.verification_status;
        }
      }

      
      // 🆕 AJOUTER : Mettre à jour les données pricing d'origine
      if (updates.pricing_data) {
        this.propertyData.pricing_data = JSON.parse(JSON.stringify(this.pricingData));
      }

      // 🆕 Mettre à jour les images d'origine après sauvegarde réussie
      if (updates['photos-du-logement']) {
        // Si le backend renvoie les vraies URLs Webflow (après re-hosting), les utiliser
        const freshPhotos = Array.isArray(result.fieldData?.['photos-du-logement'])
          ? result.fieldData['photos-du-logement']
          : this.currentImagesGallery;

        this.currentImagesGallery = JSON.parse(JSON.stringify(freshPhotos));
        this.originalImagesGallery = JSON.parse(JSON.stringify(freshPhotos));
        this.propertyData.images_gallery = JSON.parse(JSON.stringify(freshPhotos));
        this.initialValues.images_gallery = JSON.parse(JSON.stringify(freshPhotos));

        // 🔧 Détruire Sortable et réinitialiser l'ordre DOM
        // (sinon displayEditableGallery remplit les blocs par ID alors que le DOM a été réordonné par Sortable)
        if (this.sortableInstance) {
          this.sortableInstance.destroy();
          this.sortableInstance = null;
        }
        const container = document.querySelector('.images-grid');
        if (container) {
          for (let i = 1; i <= 20; i++) {
            const block = document.getElementById(`image-block-${i}`);
            if (block) container.appendChild(block);
          }
        }

        // Re-render avec les vraies URLs et l'ordre DOM remis à zéro
        this.displayEditableGallery();
        if (window.innerWidth > 768) {
          setTimeout(() => this.initSortable(), 100);
        }
      }

      // 🆕 Mettre à jour la photo de profil après save réussi
            if (updates['image-hote']) {
              const freshHostUrl = result.fieldData?.['image-hote']?.url 
                || (typeof result.fieldData?.['image-hote'] === 'string' ? result.fieldData['image-hote'] : null)
                || stagedHostUrl; // fallback sur l'URL temp
              
              if (freshHostUrl) {
                this.propertyData.host_image = freshHostUrl;
              }
              this.stagedHostImage = null;
              this.displayHostImage();
            }
        
            // Désactiver les boutons
      this.disableButtons();
      
      // 🆕 Message de succès combiné (informe sur les champs restants si applicable)
      if (hasEmptyErrors) {
        this.showNotification('success', "Modifications enregistrées, il reste des champs à remplir pour activer la vérification.");
      } else {
        this.showNotification('success', 'Modifications enregistrées avec succès !');
      }
        
      } else {
        throw new Error(result.error || 'Erreur lors de la sauvegarde');
      }
      
     } catch (error) {
    console.error('❌ Erreur sauvegarde:', error);
    this.showNotification('error', 'Erreur lors de la sauvegarde : ' + error.message);
    } finally {
      // Réactiver le bouton
      saveButton.disabled = false;
      saveButton.textContent = originalText;
    }
  }
}

// Export global
window.PropertyEditor = PropertyEditor;
