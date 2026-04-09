// LOG production V1.38.1
// Page google
class InterfaceManager {
  constructor() {
    this.init();
  }

  setTextWithBreak(element, text1, text2) {
    element.textContent = ''; // Vider
    element.appendChild(document.createTextNode(text1));
    element.appendChild(document.createElement('br'));
    const strong = document.createElement('strong');
    strong.textContent = text2;
    element.appendChild(strong);
  }
  
  init() {
    this.setupMainImages();
    this.setupPlatformLogos();
    this.setupAdresse();
    this.setupItineraireButton();
    this.setupSeasonButton();
    this.setupConditionsReservation();
    this.setupConditionsAnnulation();
    this.setupExtras();
    this.setupEquipements();
    this.setupOptionsAccueil();
    this.setupHoraires();
    this.setupChambreHoteDisplay();
    const hasReductions = this.setupReductions();
    const hasCadeaux = this.setupCadeaux();
    this.updateBlocentierAvantages(hasReductions, hasCadeaux);
    this.setupInclus();
    this.setupAnnonces();
    this.setupImmatriculation();
    this.setupTelephone();
    this.setupPlatformLinks();
    this.setupPopins();
  }

  // Gestion du bouton saisons
  setupSeasonButton() {
    const btnSeason = document.getElementById('btn-season');
    if (!btnSeason) return;
    
    // Récupérer le JSON des tarifs
    const jsonElement = document.querySelector('[data-json-tarifs-line]');
    if (!jsonElement) {
      btnSeason.style.display = 'none';
      return;
    }
    
    try {
      const jsonString = jsonElement.getAttribute('data-json-tarifs-line');
      if (!jsonString || jsonString.trim() === '') {
        btnSeason.style.display = 'none';
        return;
      }
      
      const pricingData = JSON.parse(jsonString);
      
      // Vérifier s'il y a des saisons
      if (pricingData.seasons && pricingData.seasons.length > 0) {
        // Il y a des saisons, laisser le bouton visible
        btnSeason.style.display = ''; // ou 'block' selon votre CSS
      } else {
        // Pas de saisons, cacher le bouton
        btnSeason.style.display = 'none';
      }
    } catch (error) {
      // En cas d'erreur, cacher le bouton
      btnSeason.style.display = 'none';
    }
  }
  
  setupAdresse() {
    const adresseElement = document.getElementById('adresse-logement');
    
    if (!adresseElement) {
      return;
    }
    
    const adresseOriginale = adresseElement.textContent.trim();
    const parties = adresseOriginale.split(',').map(p => p.trim());
    
    // Réorganiser SEULEMENT si on a exactement 3 parties
    if (parties.length === 3) {
      // Ordre actuel : [ville, pays, rue]
      // Ordre voulu : [rue, ville, pays]
      const adresseReorganisee = `${parties[2]}, ${parties[0]}, ${parties[1]}`;
      adresseElement.textContent = adresseReorganisee;
    }
  }

  setupItineraireButton() {
    const button = document.getElementById('lien-itineraire');
    const adresseElement = document.getElementById('adresse-logement');
    
    if (!button || !adresseElement) {
      return;
    }
    
    const adresse = adresseElement.textContent.trim();
    if (!adresse) {
      return;
    }
    
    // Créer l'URL Google Maps
    const googleMapsUrl = 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(adresse);
    
    // Configurer le bouton
    button.href = googleMapsUrl;
    button.target = '_blank';
    button.rel = 'noopener noreferrer';
  }

  // Nouvelle méthode à ajouter dans la classe :
  setupConditionsReservation() {
    const conditionsElement = document.querySelector('[data-conditions-reservation]');
    const blocConditions = document.getElementById('bloc-conditions');
    
    if (!conditionsElement || !blocConditions) {
      return;
    }
    
    const conditionsText = conditionsElement.textContent.trim();
    
    // Si le texte est vide, masquer le bloc entier
    if (!conditionsText || conditionsText === '') {
      blocConditions.style.display = 'none';
      return;
    }
    
    // Il y a du contenu, afficher le bloc
    blocConditions.style.display = 'bloc';
    
    // Vérifier si on a "Caution" ET "Acompte" dans le texte
    if (conditionsText.includes('Caution') && conditionsText.includes('Acompte')) {
      const htmlContent = conditionsText.replace(/\n/g, '<br>');
      conditionsElement.innerHTML = htmlContent;
    }
  }

setupConditionsAnnulation() {
    // Récupérer la valeur depuis le CMS
    const conditionsElement = document.querySelector('[data-conditions-annulation]');
    if (!conditionsElement) return;
    
    const value = conditionsElement.getAttribute('data-conditions-annulation') || 
                  conditionsElement.textContent.trim();
    
    if (!value) return;
    
    const predefinedPolicies = ['flexible', 'moderate', 'limited', 'strict'];
    
    // Masquer tous les blocs par défaut
    ['flexible', 'moderate', 'limited', 'strict', 'custom'].forEach(policy => {
      const bloc = document.getElementById(`annulation-${policy}`);
      if (bloc) bloc.style.display = 'none';
    });
    
    if (predefinedPolicies.includes(value)) {
      // Choix prédéfini : afficher le bloc correspondant
      const bloc = document.getElementById(`annulation-${value}`);
      if (bloc) bloc.style.display = 'block';
    } else {
      // Texte personnalisé : afficher le bloc custom avec le texte
      const customBloc = document.getElementById('annulation-custom');
      if (customBloc) {
        customBloc.style.display = 'block';
        // Mettre le texte dans le bloc
        const textElement = customBloc.querySelector('[data-custom-annulation-text]') || customBloc;
        textElement.textContent = value;
      }
    }
  }
  
  setupMainImages() {
  
  // Utiliser les classes que vous avez données
  const allImages = document.querySelectorAll('.collection-item-2 .image-list-logement');
  
  
  if (allImages.length < 3) {
    console.warn(`⚠️ Seulement ${allImages.length} images trouvées (minimum 3 requis)`);
    return;
  }
  
  // Récupérer les URLs des 3 premières images
  const imageUrls = [
    allImages[0]?.src || allImages[0]?.getAttribute('src'),
    allImages[1]?.src || allImages[1]?.getAttribute('src'),
    allImages[2]?.src || allImages[2]?.getAttribute('src')
  ];
    
  // 1️⃣ Première image → background-image de .main-image
  const mainImage = document.querySelector('.main-image');
  if (mainImage && imageUrls[0]) {
    mainImage.style.backgroundImage = `url('${imageUrls[0]}')`;
    mainImage.style.backgroundSize = 'cover';
    mainImage.style.backgroundPosition = 'center';
  }
  
  // 2️⃣ Deuxième image → src de .secondary-image
  const secondaryImage = document.querySelector('.secondary-image');
  if (secondaryImage && imageUrls[1]) {
    secondaryImage.src = imageUrls[1];
  }
  
  // 3️⃣ Troisième image → src de .third-image  
  const thirdImage = document.querySelector('.third-image');
  if (thirdImage && imageUrls[2]) {
    thirdImage.src = imageUrls[2];
  }
}

  // Gestion des logos des plateformes
  setupPlatformLogos() {
    document.querySelectorAll("#logo-plateformes").forEach(container => {
      const airbnbField = container.getAttribute("data-airbnb");
      const bookingField = container.getAttribute("data-booking");
      const gitesField = container.getAttribute("data-gites");
      const googleField = container.getAttribute("data-google");
      
      container.innerHTML = "";
      
      if (airbnbField && airbnbField.trim() !== "") {
        const img = document.createElement("img");
        img.src = "https://cdn.prod.website-files.com/631204438bf0c14f7ab24dd6/6798ece4dae6603f53158511_image%209913.jpg";
        img.alt = "Logo Airbnb";
        container.appendChild(img);
      }
      
      if (bookingField && bookingField.trim() !== "") {
        const img = document.createElement("img");
        img.src = "https://cdn.prod.website-files.com/631204438bf0c14f7ab24dd6/6798ece5b5a9bc2b661b6fdd_image%209911.jpg";
        img.alt = "Logo Booking";
        container.appendChild(img);
      }
      
      if (gitesField && gitesField.trim() !== "") {
        const img = document.createElement("img");
        img.src = "https://cdn.prod.website-files.com/631204438bf0c14f7ab24dd6/688b2ed71694b8ab6ae9f4a9_other-icon.jpg";
        img.alt = "Logo Gîtes de France";
        container.appendChild(img);
      }

       if (googleField && googleField.trim() !== "") {
        const img = document.createElement("img");
        img.src = "https://cdn.prod.website-files.com/631204438bf0c14f7ab24dd6/68d6899911953c716d7ad252_icon-google.jpg";
        img.alt = "Logo Google";
        container.appendChild(img);
      }
      
      const images = container.querySelectorAll("img");
      images.forEach((img) => {
        img.style.width = "24px";
        img.style.height = "24px";
        img.style.marginRight = "6px";
      });
      
      if (images.length > 0) {
        images[images.length - 1].style.marginRight = "0";
      }
    });
  }

  // Gestion des extras
  setupExtras() {
    const extrasGrid = document.querySelector(".blocextras");
    const exampleElement = extrasGrid?.querySelector(".element-extra");
    
    if (!extrasGrid || !exampleElement) return;
    
    const extrasData = extrasGrid.getAttribute("data-extras");
    if (!extrasData || extrasData.trim() === "") {
      // 🆕 AJOUTER : Laisser le bloc parent caché
      return;
    }
    
    // 🆕 AJOUTER : Il y a des extras, afficher le bloc parent
    const blocExtras = document.querySelector('.blocentier-extras');
    if (blocExtras) {
      blocExtras.style.display = 'block'; // ou 'block' selon votre design
    }
    
    extrasGrid.innerHTML = "";
    const extrasList = extrasData.split(",").map(extra => extra.trim());
    
    extrasList.forEach(extra => {
      try {
        const emojiMatch = extra.match(/^(\p{Emoji_Presentation}|\p{Extended_Pictographic})/u);
        if (!emojiMatch) return;
        
        const emoji = emojiMatch[0];
        const textWithoutEmoji = extra.substring(emoji.length).trim();
        const match = textWithoutEmoji.match(/(.+?)(\d+€)$/);
        
        if (!match) return;
        
        const title = match[1].trim();
        const price = match[2].trim();
        
        const extraElement = exampleElement.cloneNode(true);
        const emojiElement = extraElement.querySelector("#emoji");
        if (emojiElement) emojiElement.textContent = emoji;
        
        const namePriceElement = extraElement.querySelector("#name-price-extras");
        if (namePriceElement) {
          this.setTextWithBreak(namePriceElement, title, price);
        }
        
        extrasGrid.appendChild(extraElement);
      } catch (error) {
        console.error("Erreur lors du traitement de l'extra :", extra, error);
      }
    });
  }

  // Gestion des équipements
  setupEquipements() {
    
    // Mapping entre les noms d'équipements et leurs IDs
    const equipementMapping = {
      'Piscine': 'piscine',
      'Jacuzzi': 'jacuzzi',
      'Climatisation': 'climatisation',
      'Barbecue': 'barbecue',
      'Équipement bébé': 'baby',
      'Parking gratuit': 'parking',
      'Wifi': 'wifi',
      'Four': 'four',
      'Lave-vaisselle': 'lave-vaisselle',
      'Sèche-linge': 'seche-linge',
      'Machine à laver': 'machine-a-laver',
      'Borne électrique': 'borne-electrique'
    };
    
    // Masquer tous les équipements au départ
    Object.values(equipementMapping).forEach(elementId => {
      const element = document.getElementById(elementId);
      if (element) {
        element.style.display = 'none';
      }
    });
    
    // Chercher l'élément qui contient les équipements
    const equipementsElement = document.querySelector('[data-equipements-principaux]');
    
    if (!equipementsElement) {
      console.warn('⚠️ Élément data-equipements-principaux non trouvé');
      return;
    }
    
    // Récupérer la valeur du champ
    const equipementsString = equipementsElement.getAttribute('data-equipements-principaux');
    
    if (!equipementsString || equipementsString.trim() === '') {
      return;
    }

    const blocEquipements = document.querySelector('.blocentier-equipements');
    if (blocEquipements) {
      blocEquipements.style.display = 'block'; // ou 'block' selon votre design
    }
    
    // Parser les équipements (séparés par des virgules)
    const equipements = equipementsString.split(',').map(eq => eq.trim());
    
    // Afficher chaque équipement trouvé
    let equipementsAffiches = 0;
    equipements.forEach(equipement => {
      const elementId = equipementMapping[equipement];
      
      if (elementId) {
        const element = document.getElementById(elementId);
        if (element) {
          element.style.display = ''; // Utiliser le display par défaut
          equipementsAffiches++;
        } else {
          console.warn(`⚠️ Élément non trouvé pour l'ID: ${elementId}`);
        }
      } else {
        console.warn(`⚠️ Équipement non reconnu: "${equipement}"`);
      }
    });
    
  }

  // Gestion des options d'accueil
  setupOptionsAccueil() {
    
    // Mapping entre les noms d'options et leurs IDs
    const optionsMapping = {
      'Animaux autorisés': 'animaux',
      'Accès PMR': 'pmr',
      'Fumeurs autorisés': 'fumeurs'
    };
    
    // Masquer toutes les options au départ
    Object.values(optionsMapping).forEach(elementId => {
      const element = document.getElementById(elementId);
      if (element) {
        element.style.display = 'none';
      }
    });
    
    // Chercher l'élément qui contient les options
    const optionsElement = document.querySelector('[data-option-accueil]');
    
    if (!optionsElement) {
      console.warn('⚠️ Élément data-option-accueil non trouvé');
      return;
    }
    
    // Récupérer la valeur du champ
    const optionsString = optionsElement.getAttribute('data-option-accueil');
    
    if (!optionsString || optionsString.trim() === '') {
      return;
    }
    
    // Parser les options (séparées par des virgules)
    const options = optionsString.split(',').map(opt => opt.trim());
    
    // Afficher chaque option trouvée
    let optionsAffichees = 0;
    options.forEach(option => {
      const elementId = optionsMapping[option];
      
      if (elementId) {
        const element = document.getElementById(elementId);
        if (element) {
          element.style.display = ''; // Utiliser le display par défaut
          optionsAffichees++;
        } else {
          console.warn(`⚠️ Élément non trouvé pour l'ID: ${elementId}`);
        }
      } else {
        console.warn(`⚠️ Option non reconnue: "${option}"`);
      }
    });
    
  }

  // Gestion de l'affichage conditionnel pour Chambre d'hôtes
  setupChambreHoteDisplay() {
    const typeElement = document.querySelector('[data-mode-location]');
    
    if (typeElement) {
      const typeLogement = typeElement.getAttribute('data-mode-location');
      
      // Afficher/masquer le tag chambre d'hôtes
      const chambreHoteElement = document.querySelector('.chambres-hote');
      if (chambreHoteElement) {
        if (typeLogement === "Chambre d'hôtes") {
          chambreHoteElement.style.display = 'inline-flex';
        } else {
          chambreHoteElement.style.display = 'none';
        }
      }

      // Si chambre d'hôtes, charger et afficher les chambres
      if (typeLogement === "Chambre d'hôtes") {
        this.loadAndDisplayRooms();
      }
    }
  }

    async loadAndDisplayRooms() {
    const slug = window.location.pathname.split("/").pop();
    if (!slug) return;

    try {
      const response = await fetch(`${window.CONFIG.API_URL}/property-rooms/${slug}`);
      if (!response.ok) return;
      
      const data = await response.json();
      const rooms = data.rooms || [];
      
      if (rooms.length === 0) return;

      this.displayRoomsOnDetail(rooms);

      // Initialiser l'état B&B immédiatement (prix, capacité, boutons)
      this.initBnbDefaultState(rooms);

      // Précharger les calendriers en arrière-plan
      this.preloadRoomsCalendarData(rooms);

    } catch (error) {
      console.error('❌ Erreur chargement chambres:', error);
    }
  }



    displayRoomsOnDetail(rooms) {
    const bloc = document.getElementById('bloc-chambres-hotes');
    if (!bloc) return;

    // Stocker les données des chambres pour la modale
    this._roomsData = [];

    // Masquer tous les blocs de chambres par défaut (1 à 5)
    for (let i = 1; i <= 5; i++) {
      const chambreBloc = document.getElementById(`chambre-hote-${i}`);
      if (chambreBloc) chambreBloc.style.display = 'none';
    }

    // Filtrer : ne garder que les chambres avec au moins une photo
    const roomsWithPhotos = rooms.filter(room => {
      const photos = room.photos || [];
      if (photos.length === 0) return false;
      const firstPhoto = typeof photos[0] === 'object' ? photos[0].url : photos[0];
      return firstPhoto && firstPhoto.trim() !== '';
    });

    if (roomsWithPhotos.length === 0) return;

    let slotIndex = 0;

    roomsWithPhotos.forEach((room) => {
      if (slotIndex >= 5) return;
      slotIndex++;

      const chambreBloc = document.getElementById(`chambre-hote-${slotIndex}`);
      if (!chambreBloc) return;

      chambreBloc.style.display = 'flex';

      // Stocker les données pour la modale
      this._roomsData[slotIndex] = room;

      // 1. Image (première photo)
      const imageEl = document.getElementById(`image-chambre-${slotIndex}`);
      if (imageEl) {
        const photoUrl = typeof room.photos[0] === 'object' ? room.photos[0].url : room.photos[0];
        if (imageEl.tagName === 'IMG') {
          imageEl.src = photoUrl;
        } else {
          imageEl.style.backgroundImage = `url(${photoUrl})`;
          imageEl.style.backgroundSize = 'cover';
          imageEl.style.backgroundPosition = 'center';
        }
      }

      // 2. Voyageurs
      const voyageursEl = document.getElementById(`voyageurs-chambre-${slotIndex}`);
      if (voyageursEl) {
        const match = (room.taille_chambre || '').match(/^(\d+)/);
        const voyageurs = match ? parseInt(match[1]) : 0;
        voyageursEl.textContent = `${voyageurs} voyageur${voyageurs > 1 ? 's' : ''}`;
      }

      // 3. Nom
      const nomEl = document.getElementById(`nom-chambre-${slotIndex}`);
      if (nomEl) {
        nomEl.textContent = room.name || 'Chambre';
      }

      // 4. Taille m²
      const tailleEl = document.getElementById(`taille-chambre-${slotIndex}`);
      if (tailleEl) {
        const tailleMatch = (room.taille_chambre || '').match(/(\d+)\s*m²/);
        const m2 = tailleMatch ? tailleMatch[1] : '0';
        tailleEl.textContent = `${m2} m²`;
      }

      // 5. Types de lits
      const litsEl = document.getElementById(`lits-chambre-${slotIndex}`);
      if (litsEl) {
        litsEl.textContent = this.formatDetailsLits(room.details_lits);
      }

      // 6. Prix avec pourcentage et prix barré
      const prixEl = document.getElementById(`prix-chambre-${slotIndex}`);
      const pourcentageEl = document.getElementById(`pourcentage-chambre-${slotIndex}`);
      
      if (prixEl && room.pricing_data) {
        this.displayRoomPrice(prixEl, pourcentageEl, room.pricing_data);
      }

            // 7. Clic → ouvrir la modale
      chambreBloc.style.cursor = 'pointer';
      const currentSlot = slotIndex;
      chambreBloc.addEventListener('click', () => {
        this.openRoomModal(this._roomsData[currentSlot]);
      });

      // 8. Boutons sélection
      const selectBtn = document.getElementById(`button-select-${slotIndex}`);
      const selectedBtn = document.getElementById(`button-selected-${slotIndex}`);

      if (selectBtn) {
        selectBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.selectRoom(currentSlot);
        });
      }

            // 9. Élément au survol sur l'image
      const hoverEl = document.getElementById(`hover-image-${slotIndex}`);
      if (hoverEl) {
        hoverEl.style.display = 'none';
        hoverEl.style.position = 'absolute';
        hoverEl.style.bottom = '10px';
        hoverEl.style.right = '10px';
        hoverEl.style.zIndex = '2';

        chambreBloc.addEventListener('mouseenter', () => {
          if (chambreBloc.style.opacity !== '0.3') {
            hoverEl.style.display = 'flex';
          }
        });
        chambreBloc.addEventListener('mouseleave', () => {
          hoverEl.style.display = 'none';
        });
      }




      if (selectedBtn) {
        selectedBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.deselectRoom();
        });
      }
    });


    // Configurer la fermeture de la modale
    this.setupRoomModalClose();

    // Afficher le bloc parent
    bloc.style.display = 'block';
  }

    setupCarousel(photos) {
    const container = document.getElementById('carousel-chambre');
    const imageEl = document.getElementById('modal-chambre-image');
    const prevBtn = document.getElementById('carousel-prev');
    const nextBtn = document.getElementById('carousel-next');
    const dotsContainer = document.getElementById('carousel-dots');

    if (!container || !imageEl || !photos || photos.length === 0) return;

    // Extraire les URLs
    const urls = photos
      .map(p => typeof p === 'object' ? p.url : p)
      .filter(url => url && url.trim() !== '');

    if (urls.length === 0) return;

    let currentIndex = 0;

    // Positionner le conteneur
    container.style.position = 'relative';
    container.style.overflow = 'hidden';

    // Fonction pour afficher une image
    const showImage = (index) => {
      currentIndex = index;
      if (imageEl.tagName === 'IMG') {
        imageEl.src = urls[currentIndex];
      } else {
        imageEl.style.backgroundImage = `url(${urls[currentIndex]})`;
        imageEl.style.backgroundSize = 'cover';
        imageEl.style.backgroundPosition = 'center';
      }
      // Mettre à jour les dots
      if (dotsContainer) {
        Array.from(dotsContainer.children).forEach((dot, i) => {
          dot.style.opacity = i === currentIndex ? '1' : '0.6';
        });
      }
    };

    // Positionner et configurer les flèches
        const styleArrow = (btn, side) => {
      if (!btn) return;
      btn.style.setProperty('position', 'absolute', 'important');
      btn.style.setProperty('top', '50%', 'important');
      btn.style.setProperty(side, '8px', 'important');
      btn.style.setProperty('transform', 'translateY(-50%)', 'important');
      btn.style.setProperty('z-index', '2', 'important');
      btn.style.setProperty('cursor', 'pointer', 'important');
      btn.style.display = urls.length > 1 ? 'flex' : 'none';
    };


    styleArrow(prevBtn, 'left');
    styleArrow(nextBtn, 'right');

    if (prevBtn) {
      const newPrev = prevBtn.cloneNode(true);
      prevBtn.parentNode.replaceChild(newPrev, prevBtn);
      styleArrow(newPrev, 'left');
      newPrev.addEventListener('click', (e) => {
        e.stopPropagation();
        showImage(currentIndex === 0 ? urls.length - 1 : currentIndex - 1);
      });
    }

    if (nextBtn) {
      const newNext = nextBtn.cloneNode(true);
      nextBtn.parentNode.replaceChild(newNext, nextBtn);
      styleArrow(newNext, 'right');
      newNext.addEventListener('click', (e) => {
        e.stopPropagation();
        showImage(currentIndex === urls.length - 1 ? 0 : currentIndex + 1);
      });
    }

        // Générer les dots
    if (dotsContainer) {
      dotsContainer.innerHTML = '';
      dotsContainer.style.cssText = `
        position:absolute;bottom:8px;left:50%;transform:translateX(-50%);
        display:${urls.length > 1 ? 'flex' : 'none'};
        gap:6px;z-index:2;
      `;

      urls.forEach((_, i) => {
        const dot = document.createElement('div');
        dot.style.cssText = `
          width:10px;height:10px;border-radius:50%;
          background:#fff;cursor:pointer;
          opacity:${i === 0 ? '1' : '0.6'};
          transition:opacity 0.2s;
        `;
        dot.addEventListener('click', (e) => {
          e.stopPropagation();
          showImage(i);
        });
        dotsContainer.appendChild(dot);
      });
    }

    // Afficher la première image
    showImage(0);
  }

    // Précharger les données iCal de toutes les chambres
  async preloadRoomsCalendarData(rooms) {
    // Attendre que le CalendarManager soit prêt (picker initialisé)
    let calendarManager = null;
    for (let i = 0; i < 30; i++) {
      calendarManager = window.detailLogementPage?.managers?.calendar;
      if (calendarManager?.picker) break;
      await new Promise(r => setTimeout(r, 200));
    }

    if (!calendarManager?.icalManager) return;

    const icalManager = calendarManager.icalManager;
    const today = moment().startOf('day');
    const twoYears = moment().add(2, 'year').endOf('month');

    // Collecter toutes les URLs iCal de toutes les chambres
    const allUrls = [];
    rooms.forEach(room => {
      (room.ical_urls || []).forEach(url => {
        if (url && url.trim() !== '') allUrls.push(url);
      });
    });

    if (allUrls.length === 0) {
      this._combinedUnavailableDates = new Set();
      this._roomsUnavailableDates = {};
      return;
    }

    // Charger tout (chaque URL est mise en cache par ICalManager)
    await icalManager.loadAllUnavailableDates(allUrls);
    this._combinedUnavailableDates = new Set(icalManager.unavailableDates);

    // Construire les Sets par chambre
    this._roomsUnavailableDates = {};
    const roomsWithPhotos = rooms.filter(room => {
      const photos = room.photos || [];
      if (photos.length === 0) return false;
      const firstPhoto = typeof photos[0] === 'object' ? photos[0].url : photos[0];
      return firstPhoto && firstPhoto.trim() !== '';
    });

    for (let i = 0; i < roomsWithPhotos.length; i++) {
      const roomUrls = (roomsWithPhotos[i].ical_urls || []).filter(u => u && u.trim() !== '');
      if (roomUrls.length > 0) {
        const events = await Promise.all(
          roomUrls.map(url => icalManager.getICalData(url, today, twoYears))
        );
        this._roomsUnavailableDates[i + 1] = new Set(events.flat().map(e => e.date));
      } else {
        this._roomsUnavailableDates[i + 1] = new Set();
      }
    }

    // Mettre à jour le picker avec les dates combinées
    if (calendarManager.picker) {
      calendarManager.picker.updateCalendars();
    }
  }

  // Initialiser l'état par défaut pour un logement chambre d'hôtes
  initBnbDefaultState(rooms) {
    this._bnbMode = true;
    this._selectedRoomIndex = null;

    // Trouver le prix le plus bas parmi toutes les chambres
    let lowestPrice = Infinity;
    let lowestPricingData = null;

    rooms.forEach(room => {
      if (!room.pricing_data?.defaultPricing) return;
      const dp = room.pricing_data.defaultPricing;
      // dp.price = prix chambre pleine (même en mode per_guest)
      let price = dp.price || Infinity;

      if (price < lowestPrice) {

        lowestPrice = price;
        lowestPricingData = room.pricing_data;
      }
    });

    // Afficher "À partir de" avec le prix le plus bas
    if (isFinite(lowestPrice) && lowestPricingData) {
      const prixDirectEls = Utils.getAllElementsById("prix-direct");
      const pourcentageEls = Utils.getAllElementsById("text-pourcentage");

      // Calculer le prix plateforme
      let platformPrice = lowestPrice;
      const dp = lowestPricingData.defaultPricing;
      if (dp.platformPrices) {
        const prices = Object.values(dp.platformPrices).filter(p => p > 0);
        if (prices.length > 0) {
          platformPrice = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
        }
      }
      if (platformPrice === lowestPrice) {
        const defaultDiscount = lowestPricingData.platformPricing?.defaultDiscount || 17;
        platformPrice = Math.round(lowestPrice * (100 / (100 - defaultDiscount)));
      }

      prixDirectEls.forEach(element => {
        element.textContent = '';
        element.appendChild(document.createTextNode('À partir de'));
        element.appendChild(document.createElement('br'));
        const strong = document.createElement('strong');
        strong.style.fontWeight = 'bold';
        strong.style.fontFamily = 'Inter';
        strong.style.fontSize = '24px';
        strong.textContent = `${Math.round(lowestPrice)}€ / nuit`;
        element.appendChild(strong);
      });

      if (platformPrice > lowestPrice) {
        const discount = Math.round(100 * (platformPrice - lowestPrice) / platformPrice);
        pourcentageEls.forEach(el => {
          el.textContent = discount > 0 ? `-${discount}%` : '';
        });
      }
    }

    // Bouton réserver désactivé tant qu'aucune chambre n'est sélectionnée
    const reserverButtons = document.querySelectorAll('.button.homepage.site-internet[class*="button-reserver"]:not(.chambre)');
    reserverButtons.forEach(btn => {
      btn.style.opacity = '0.5';
      btn.style.pointerEvents = 'none';
      btn.style.cursor = 'not-allowed';
    });

        // Afficher le message "sélectionner 1 chambre" (desktop + mobile)
    const blocSelectChambre = document.getElementById('bloc-error-select-chambre');
    const blocSelectChambreMobile = document.getElementById('bloc-error-select-chambre-mobile');
    if (blocSelectChambre) blocSelectChambre.style.display = 'block';
    if (blocSelectChambreMobile) blocSelectChambreMobile.style.display = 'block';



    // Capacité max = chambre avec le plus de voyageurs
    let maxCapacity = 1;
    rooms.forEach(room => {
      const match = (room.taille_chambre || '').match(/^(\d+)/);
      const voyageurs = match ? parseInt(match[1]) : 0;
      if (voyageurs > maxCapacity) maxCapacity = voyageurs;
    });
    this._bnbMaxCapacity = maxCapacity;
    
    const travelersManager = window.travelersManager;
    if (travelersManager) {
      travelersManager.maxCapacity = maxCapacity;
      travelersManager.updateUI();
    }

    // Vérifier la disponibilité initiale des chambres
    this.updateRoomAvailability();
    // Masquer la ligne ménage pour les chambres d'hôtes
    document.querySelectorAll('.ligne-menage').forEach(el => {
      el.style.display = 'none';
    });

  }


  // Sélectionner une chambre
  selectRoom(slotIndex) {
    const room = this._roomsData[slotIndex];
    if (!room) return;

    // Si même chambre déjà sélectionnée → désélectionner
    if (this._selectedRoomIndex === slotIndex) {
      this.deselectRoom();
      return;
    }

    // Désélectionner la chambre précédente (visuel)
    if (this._selectedRoomIndex) {
      const prevBloc = document.getElementById(`chambre-hote-${this._selectedRoomIndex}`);
      const prevSelect = document.getElementById(`button-select-${this._selectedRoomIndex}`);
      const prevSelected = document.getElementById(`button-selected-${this._selectedRoomIndex}`);
      if (prevBloc) prevBloc.style.border = '';
      if (prevSelect) prevSelect.style.display = '';
      if (prevSelected) prevSelected.style.display = 'none';
    }

    this._selectedRoomIndex = slotIndex;

    // 1. Visuel : bordure + boutons
    const bloc = document.getElementById(`chambre-hote-${slotIndex}`);
    const selectBtn = document.getElementById(`button-select-${slotIndex}`);
    const selectedBtn = document.getElementById(`button-selected-${slotIndex}`);

    if (bloc) bloc.style.border = '2px solid #235B59';
    if (selectBtn) selectBtn.style.display = 'none';
    if (selectedBtn) selectedBtn.style.display = 'flex';

    // Masquer les messages d'erreur AVANT le calcul
    document.querySelectorAll('.bloc-error-days').forEach(el => {
      if (el) el.style.display = 'none';
    });

    // 2. Prix : injecter le pricingData de la chambre
    if (window.priceCalculator && room.pricing_data) {
      window.priceCalculator.pricingData = room.pricing_data;
      if (window.priceCalculator.startDate && window.priceCalculator.endDate) {
        window.priceCalculator.calculateAndDisplayPrices();
      } else {
        window.priceCalculator.resetPrices();
      }
    }

    const blocSelectChambre = document.getElementById('bloc-error-select-chambre');
    const blocSelectChambreMobile = document.getElementById('bloc-error-select-chambre-mobile');
    if (blocSelectChambre) blocSelectChambre.style.display = 'none';
    if (blocSelectChambreMobile) blocSelectChambreMobile.style.display = 'none';



    // 3. Calendrier : switcher sur les dates de cette chambre
    const calendarManager = window.detailLogementPage?.managers?.calendar;
    if (calendarManager?.icalManager && this._roomsUnavailableDates) {
      calendarManager.icalManager.unavailableDates = this._roomsUnavailableDates[slotIndex] || new Set();
      if (calendarManager.picker) {
        calendarManager.picker.updateCalendars();
      }
    }

    // 4. Tarifs saisons : mettre à jour avec les données de la chambre
    const tariffsManager = window.detailLogementPage?.managers?.tariffs;
    if (tariffsManager && room.pricing_data) {
      // Masquer toutes les saisons d'abord
      for (let i = 1; i <= 4; i++) {
        const seasonEl = document.getElementById(`season-${i}`);
        if (seasonEl) seasonEl.style.display = 'none';
      }
      tariffsManager.displaySeasonsPricing(room.pricing_data);
    }

    // 5. Capacité voyageurs
    const travelersManager = window.travelersManager;
    if (travelersManager) {
      const match = (room.taille_chambre || '').match(/^(\d+)/);
      travelersManager.maxCapacity = match ? parseInt(match[1]) : 8;
      travelersManager.updateUI();
    }

    // 6. Réactiver le bouton réserver (PriceCalculator gère le reste)
    // Le bouton sera activé quand des dates valides seront sélectionnées
  }

  // Désélectionner la chambre active
  deselectRoom() {
    if (!this._selectedRoomIndex) return;

    // 1. Visuel : retirer bordure + remettre boutons
    const bloc = document.getElementById(`chambre-hote-${this._selectedRoomIndex}`);
    const selectBtn = document.getElementById(`button-select-${this._selectedRoomIndex}`);
    const selectedBtn = document.getElementById(`button-selected-${this._selectedRoomIndex}`);

    if (bloc) bloc.style.border = '';
    if (selectBtn) selectBtn.style.display = '';
    if (selectedBtn) selectedBtn.style.display = 'none';

    this._selectedRoomIndex = null;

    // 2. Prix : remettre pricingData à null et réafficher "À partir de" combiné
    if (window.priceCalculator) {
      window.priceCalculator.pricingData = null;
      window.priceCalculator.resetPrices();
    }
    // Réafficher le prix le plus bas manuellement
    this.initBnbDefaultState(
      Object.values(this._roomsData).filter(Boolean)
    );

    // 3. Calendrier : remettre les dates combinées
    const calendarManager = window.detailLogementPage?.managers?.calendar;
    if (calendarManager?.icalManager && this._combinedUnavailableDates) {
      calendarManager.icalManager.unavailableDates = this._combinedUnavailableDates;
      if (calendarManager.picker) {
        calendarManager.picker.updateCalendars();
      }
    }

    // 4. Tarifs saisons : masquer (pas de saisons en mode combiné)
    for (let i = 1; i <= 4; i++) {
      const seasonEl = document.getElementById(`season-${i}`);
      if (seasonEl) seasonEl.style.display = 'none';
    }

    // 5. Capacité : remettre le max global
    const travelersManager = window.travelersManager;
    if (travelersManager) {
      let maxCapacity = 1;
      Object.values(this._roomsData).filter(Boolean).forEach(room => {
        const match = (room.taille_chambre || '').match(/^(\d+)/);
        const voyageurs = match ? parseInt(match[1]) : 0;
        if (voyageurs > maxCapacity) maxCapacity = voyageurs;
      });
      travelersManager.maxCapacity = maxCapacity;
      travelersManager.updateUI();
    }

    // 6. Reset dates sélectionnées
    if (calendarManager?.picker) {
      calendarManager.resetDatePicker(calendarManager.picker);
    }
  }


  
    // Formater les détails de lits
  formatDetailsLits(detailsLits) {
    if (!detailsLits) return '';
    const groups = detailsLits.split(',').map(part => part.trim()).filter(Boolean);
    const expandedTypes = [];
    groups.forEach(group => {
      const groupMatch = group.match(/^(\d+)\s+(.+)$/);
      if (groupMatch) {
        const count = parseInt(groupMatch[1]);
        const type = groupMatch[2].trim();
        for (let i = 0; i < count; i++) {
          expandedTypes.push(type);
        }
      } else {
        expandedTypes.push(group);
      }
    });
    return expandedTypes.join(', ');
  }

    displayRoomPrice(prixEl, pourcentageEl, pricingData) {
    const defaultPricing = pricingData.defaultPricing;
    if (!defaultPricing) return;

    let displayPrice = 0;

    // Vérifier si des dates sont sélectionnées pour trouver la bonne saison
    const pc = window.priceCalculator;
    let activeSeason = defaultPricing;

    if (pc?.startDate && pricingData.seasons?.length > 0) {
      const month = pc.startDate.month() + 1;
      const day = pc.startDate.date();
      for (const season of pricingData.seasons) {
        if (!season.periods) continue;
        for (const period of season.periods) {
          const [startDay, startMonth] = period.start.split("-").map(Number);
          const [endDay, endMonth] = period.end.split("-").map(Number);
          if (startMonth < endMonth || (startMonth === endMonth && startDay <= endDay)) {
            if ((month > startMonth || (month === startMonth && day >= startDay)) &&
                (month < endMonth || (month === endMonth && day <= endDay))) {
              activeSeason = season;
            }
          } else {
            if ((month > startMonth || (month === startMonth && day >= startDay)) ||
                (month < endMonth || (month === endMonth && day <= endDay))) {
              activeSeason = season;
            }
          }
        }
      }
    }

    // Vérifier le week-end
    let seasonPrice = activeSeason.price || 0;
    if (pc?.startDate && activeSeason === defaultPricing && 
        defaultPricing.weekend?.enabled && defaultPricing.weekend?.price > 0) {
      const dayOfWeek = pc.startDate.day();
      if (dayOfWeek === 5 || dayOfWeek === 6) {
        seasonPrice = defaultPricing.weekend.price;
      }
    }

    // Mode per_guest
    if (defaultPricing.mode === 'per_guest') {
      const prices = activeSeason.pricesPerGuest || defaultPricing.pricesPerGuest || [];
      if (prices.length > 0) {
        const adultsCount = parseInt(document.getElementById('chiffres-adultes')?.textContent || '1');
        const childrenCount = parseInt(document.getElementById('chiffres-enfants')?.textContent || '0');
        const totalGuests = Math.max(1, adultsCount + childrenCount);
        const index = Math.min(totalGuests - 1, prices.length - 1);
        displayPrice = prices[Math.max(0, index)];
      } else {
        displayPrice = seasonPrice;
      }
    } else {
      displayPrice = seasonPrice;
    }

    // Pourcentage (toujours basé sur le prix max de la saison)
    const baseForPlatform = activeSeason.price || defaultPricing.price || displayPrice;
    let platformPrice = baseForPlatform;
    if (defaultPricing.platformPrices) {
      const prices = Object.values(defaultPricing.platformPrices).filter(p => p > 0);
      if (prices.length > 0) {
        platformPrice = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
      }
    }
    if (platformPrice === baseForPlatform) {
      const defaultDiscount = (pricingData.platformPricing && pricingData.platformPricing.defaultDiscount) 
        ? pricingData.platformPricing.defaultDiscount : 17;
      platformPrice = Math.round(baseForPlatform * (100 / (100 - defaultDiscount)));
    }

    // Affichage
    prixEl.textContent = '';
    prixEl.style.setProperty('display', 'flex', 'important');
    prixEl.style.setProperty('flex-direction', 'row', 'important');
    prixEl.style.setProperty('align-items', 'baseline', 'important');
    prixEl.style.setProperty('gap', '4px', 'important');

    const strong = document.createElement('strong');
    strong.textContent = `${Math.round(displayPrice)}€`;
    strong.style.setProperty('font-weight', '600', 'important');
    strong.style.setProperty('font-size', '16px', 'important');
    prixEl.appendChild(strong);

    const suffix = document.createElement('span');
    suffix.textContent = '/ nuit';
    suffix.style.setProperty('font-weight', '400', 'important');
    suffix.style.setProperty('font-size', '16px', 'important');
    prixEl.appendChild(suffix);

    if (pourcentageEl) {
      if (platformPrice > baseForPlatform) {
        const discount = Math.round(((platformPrice - baseForPlatform) / platformPrice) * 100);
        pourcentageEl.textContent = `-${discount}%`;
        pourcentageEl.style.display = 'block';
      } else {
        pourcentageEl.style.display = 'none';
      }
    }
  }



  // Mettre à jour les prix de TOUS les blocs chambres selon le nombre de voyageurs
  updateAllRoomBlockPrices() {
    if (!this._roomsData) return;

    Object.keys(this._roomsData).forEach(slotIndex => {
      const room = this._roomsData[slotIndex];
      if (!room?.pricing_data?.defaultPricing) return;

      const prixEl = document.getElementById(`prix-chambre-${slotIndex}`);
      const pourcentageEl = document.getElementById(`pourcentage-chambre-${slotIndex}`);

      if (prixEl) {
        this.displayRoomPrice(prixEl, pourcentageEl, room.pricing_data);
      }
    });
  }

  syncSelectedRoomPrice() {
    if (!this._selectedRoomIndex) return;
    
    const prixDirect = document.querySelector('[id="prix-direct"]');
    const prixChambre = document.getElementById(`prix-chambre-${this._selectedRoomIndex}`);
    if (!prixDirect || !prixChambre) return;

    // Extraire le prix depuis prix-direct (chercher le strong qui contient le prix)
    const strongEl = prixDirect.querySelector('strong');
    if (!strongEl) return;

    const priceText = strongEl.textContent; // ex: "408€ / nuit" ou "408€"

    // Mettre à jour le bloc chambre
    prixChambre.textContent = '';
    prixChambre.style.setProperty('display', 'flex', 'important');
    prixChambre.style.setProperty('flex-direction', 'row', 'important');
    prixChambre.style.setProperty('align-items', 'baseline', 'important');
    prixChambre.style.setProperty('gap', '4px', 'important');

    // Extraire juste le nombre
    const priceMatch = priceText.match(/(\d+)/);
    if (!priceMatch) return;

    const strong = document.createElement('strong');
    strong.textContent = `${priceMatch[1]}€`;
    strong.style.setProperty('font-weight', '600', 'important');
    strong.style.setProperty('font-size', '16px', 'important');
    prixChambre.appendChild(strong);

    const suffix = document.createElement('span');
    suffix.textContent = '/ nuit';
    suffix.style.setProperty('font-weight', '400', 'important');
    suffix.style.setProperty('font-size', '16px', 'important');
    prixChambre.appendChild(suffix);
  }

  
  updateRoomAvailability() {
    if (!this._roomsData) return;

    // Récupérer le nombre de voyageurs actuel
    const adultsCount = parseInt(document.getElementById('chiffres-adultes')?.textContent || '1');
    const childrenCount = parseInt(document.getElementById('chiffres-enfants')?.textContent || '0');
    const totalGuests = adultsCount + childrenCount;

    // Récupérer les dates sélectionnées
    const pc = window.priceCalculator;
    const hasSelectedDates = pc?.startDate && pc?.endDate;

    Object.keys(this._roomsData).forEach(slotIndex => {
      const room = this._roomsData[slotIndex];
      if (!room) return;

      const chambreBloc = document.getElementById(`chambre-hote-${slotIndex}`);
      const selectBtn = document.getElementById(`button-select-${slotIndex}`);
      if (!chambreBloc) return;

      let isUnavailable = false;

      // 1. Vérifier la capacité
      const match = (room.taille_chambre || '').match(/^(\d+)/);
      const roomCapacity = match ? parseInt(match[1]) : 0;
      if (totalGuests > roomCapacity) {
        isUnavailable = true;
      }

      // 2. Vérifier les dates (si des dates sont sélectionnées)
      if (!isUnavailable && hasSelectedDates && this._roomsUnavailableDates) {
        const roomDates = this._roomsUnavailableDates[slotIndex];
        if (roomDates) {
          let checkDate = moment(pc.startDate).startOf('day');
          const endDate = moment(pc.endDate).startOf('day');
          while (checkDate.isBefore(endDate)) {
            if (roomDates.has(checkDate.format('YYYY-MM-DD'))) {
              isUnavailable = true;
              break;
            }
            checkDate.add(1, 'day');
          }
        }
      }

      // Ne pas toucher la chambre actuellement sélectionnée
      if (this._selectedRoomIndex === parseInt(slotIndex)) return;

      // Appliquer l'état
      const prixEl = document.getElementById(`prix-chambre-${slotIndex}`);
      const pourcentageEl = document.getElementById(`pourcentage-chambre-${slotIndex}`);

      if (isUnavailable) {
        chambreBloc.style.opacity = '0.3';
        chambreBloc.style.pointerEvents = 'none';
        if (selectBtn) selectBtn.style.display = 'none';
        if (prixEl) prixEl.textContent = 'Chambre indisponible';
        if (pourcentageEl) pourcentageEl.style.display = 'none';
      } else {
        chambreBloc.style.opacity = '';
        chambreBloc.style.pointerEvents = '';
        if (selectBtn) selectBtn.style.display = '';
        // Restaurer le prix
        if (prixEl) this.displayRoomPrice(prixEl, pourcentageEl, room.pricing_data);
      }
    });
  }

  
  // Ouvrir la modale avec les infos d'une chambre
  openRoomModal(room) {
    const modal = document.getElementById('modal-chambre-hote');
    if (!modal || !room) return;

        // Carrousel images
    this.setupCarousel(room.photos || []);


    // Voyageurs
    const voyageursEl = document.getElementById('modal-chambre-voyageurs');
    if (voyageursEl) {
      const match = (room.taille_chambre || '').match(/^(\d+)/);
      const voyageurs = match ? parseInt(match[1]) : 0;
      voyageursEl.textContent = `${voyageurs} voyageur${voyageurs > 1 ? 's' : ''}`;
    }

    // Nom
    const nomEl = document.getElementById('modal-chambre-nom');
    if (nomEl) {
      nomEl.textContent = room.name || 'Chambre';
    }

    // Taille
    const tailleEl = document.getElementById('modal-chambre-taille');
    if (tailleEl) {
      const tailleMatch = (room.taille_chambre || '').match(/(\d+)\s*m²/);
      const m2 = tailleMatch ? tailleMatch[1] : '0';
      tailleEl.textContent = `${m2} m²`;
    }

    // Lits
    const litsEl = document.getElementById('modal-chambre-lits');
    if (litsEl) {
      litsEl.textContent = this.formatDetailsLits(room.details_lits);
    }

    // Description
    const descEl = document.getElementById('modal-chambre-description');
    if (descEl) {
      descEl.textContent = room.description || '';
    }

    // Équipements — même logique que setupEquipements()
    const equipementMapping = {
      'Climatisation': 'equip-chambre-climatisation',
      'Télévision': 'equip-chambre-television',
      'Bureau': 'equip-chambre-bureau',
      'Salle de bain privée': 'equip-chambre-salle-de-bain',
      'Toilettes privées': 'equip-chambre-toilettes',
      'Wifi': 'equip-chambre-wifi',
      'Micro-ondes': 'equip-chambre-micro-ondes',
      'Sèche cheveux': 'equip-chambre-seche-cheveux',
      'Balcon': 'equip-chambre-balcon',
      'Machine à café': 'equip-chambre-machine-cafe'
    };

    // Masquer tous les équipements
    Object.values(equipementMapping).forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });

    // Afficher ceux de la chambre
    const equipStr = room.equipements || '';
    if (equipStr) {
      const equipList = equipStr.split(',').map(e => e.trim());
      equipList.forEach(equip => {
        const id = equipementMapping[equip];
        if (id) {
          const el = document.getElementById(id);
          if (el) el.style.display = '';
        }
      });
    }

    // Afficher la modale
    modal.style.display = 'flex';
    modal.style.opacity = '1';
    document.body.classList.add('no-scroll');
  }

  // Fermeture de la modale
    setupRoomModalClose() {
    const modal = document.getElementById('modal-chambre-hote');
    if (!modal) return;

    // Fermeture par nos boutons
    const closeBtns = modal.querySelectorAll('.close-modal-chambre');
    closeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        modal.style.display = 'none';
        document.body.classList.remove('no-scroll');
      });
    });

    // Observer les changements de display (couvre les fermetures Webflow)
    const observer = new MutationObserver(() => {
      if (modal.style.display === 'none' || getComputedStyle(modal).display === 'none') {
        document.body.classList.remove('no-scroll');
      }
    });
    observer.observe(modal, { attributes: true, attributeFilter: ['style', 'class'] });
  }

  
  // Gestion des horaires d'arrivée et de départ
  setupHoraires() {
    const horairesElement = document.querySelector('[data-heure-arrivee-depart]');
    
    if (!horairesElement) {
      console.warn('⚠️ Élément data-heure-arrivee-depart non trouvé');
      return;
    }
    
    const horairesString = horairesElement.getAttribute('data-heure-arrivee-depart');
    
    if (!horairesString || horairesString.trim() === '') {
      return;
    }
    
    const horaires = horairesString.split(',').map(h => h.trim());
    
    if (horaires.length !== 2) {
      return;
    }
    
    const formatHeure = (heure) => {
      if (/^\d{1,2}:\d{2}$/.test(heure)) return heure.replace(':', 'h');
      if (/^\d+$/.test(heure)) return `${heure}h00`;
      if (/^\d+h$/.test(heure)) return `${heure}00`;
      if (/^\d+h\d+$/.test(heure)) return heure;
      return heure;
    };
    
    const partieArrivee = horaires[0];
    const heureDepart = formatHeure(horaires[1]);
    
    // Construire le texte d'arrivée selon le format
    let texteArrivee = '';
    
    if (partieArrivee.includes('-')) {
      // Créneau : "14:00-18:00" → "Entre 14h00 et 18h00"
      const [debut, fin] = partieArrivee.split('-').map(h => formatHeure(h.trim()));
      texteArrivee = `Arrivée entre ${debut} et ${fin}`;
    } else {
      // Heure fixe : "16:00" → "Arrivée à partir de 16h00"
      texteArrivee = `Arrivée à partir de ${formatHeure(partieArrivee)}`;
    }
    
    const textHorairesElement = document.querySelector('.text-horaires');
    
    if (!textHorairesElement) {
      return;
    }
    
    textHorairesElement.textContent = `${texteArrivee} - Départ avant ${heureDepart}`;
  }

  // Gestion des réductions
  setupReductions() {
  
  // Chercher l'élément qui contient le JSON
  const jsonElement = document.querySelector('[data-json-tarifs-line]');
  
  if (!jsonElement) {
    console.warn('⚠️ Élément data-json-tarifs-line non trouvé');
    // Le bloc reste caché (état par défaut Webflow)
    return false; // 🆕 MODIFIÉ : return false au lieu de return
  }
  
  // Récupérer et parser le JSON
  let pricingData;
  try {
    const jsonString = jsonElement.getAttribute('data-json-tarifs-line');
    if (!jsonString || jsonString.trim() === '') {
      // Le bloc reste caché (état par défaut Webflow)
      return false; // 🆕 MODIFIÉ : return false au lieu de return
    }
    
    pricingData = JSON.parse(jsonString);
  } catch (error) {
    console.error('❌ Erreur parsing JSON:', error);
    // Le bloc reste caché (état par défaut Webflow)
    return false; // 🆕 MODIFIÉ : return false au lieu de return
  }
  
  // Vérifier s'il y a des réductions
  if (!pricingData.discounts || !Array.isArray(pricingData.discounts) || pricingData.discounts.length === 0) {
    // Le bloc reste caché (état par défaut Webflow)
    return false; // 🆕 MODIFIÉ : return false au lieu de return
  }
  
  // Trier les réductions par nombre de nuits croissant
  const sortedDiscounts = [...pricingData.discounts]
    .sort((a, b) => a.nights - b.nights)
    .slice(0, 5); // Limiter à 5 maximum
  
  
  // Construire la phrase dynamique
  let phraseReduction = '';
  
  if (sortedDiscounts.length === 1) {
    // Une seule réduction
    const discount = sortedDiscounts[0];
    const nuitText = discount.nights === 1 ? 'nuit' : 'nuits';
    phraseReduction = `En réservant ${discount.nights} ${nuitText} ou plus, profitez de ${discount.percentage}% de remise.`;
    
  } else {
    // Plusieurs réductions
    // Construire la liste des nuits
    const nightsList = sortedDiscounts.map(d => d.nights);
    let nightsText = '';
    
    if (nightsList.length === 2) {
      // 2 réductions : "7 ou 14"
      nightsText = nightsList.join(' ou ');
    } else {
      // 3+ réductions : "7, 14 ou 30"
      const lastNight = nightsList.pop();
      nightsText = nightsList.join(', ') + ' ou ' + lastNight;
    }
    
    // Construire la liste des pourcentages
    const percentagesList = sortedDiscounts.map(d => d.percentage + '%');
    let percentagesText = '';
    
    if (percentagesList.length === 2) {
      // 2 réductions : "10% ou 15%"
      percentagesText = percentagesList.join(' ou ');
    } else {
      // 3+ réductions : "10%, 15% ou 20%"
      const lastPercentage = percentagesList.pop();
      percentagesText = percentagesList.join(', ') + ' ou ' + lastPercentage;
    }
    
    // Déterminer le texte pour "nuit(s)"
    const allSingleNight = sortedDiscounts.every(d => d.nights === 1);
    const nuitText = allSingleNight ? 'nuit' : 'nuits';
    
    // Construire la phrase complète
    phraseReduction = `En réservant ${nightsText} ${nuitText} ou plus, profitez respectivement de ${percentagesText} de remise.`;
  }
  
  // Chercher l'élément texte à modifier
  const textReducElement = document.querySelector('.text-reduc');
  
  if (!textReducElement) {
    console.warn('⚠️ Élément .text-reduc non trouvé');
    return false; // 🆕 MODIFIÉ : return false au lieu de return
  }
  
  // Mettre à jour le texte
  textReducElement.textContent = phraseReduction;
  
  // Afficher le bloc (qui est caché par défaut dans Webflow)
  const blocReduc = document.querySelector('.bloc-reduc');
  if (blocReduc) {
    blocReduc.style.display = 'flex'; // Affiche le bloc
  }
  
  return true;
}

setupCadeaux() {

// Chercher l'élément qui contient les cadeaux
const cadeauxElement = document.querySelector('[data-cadeaux]');

if (!cadeauxElement) {
  console.warn('⚠️ Élément data-cadeaux non trouvé');
  return false; // Retourne false = pas visible
}

// Récupérer la valeur
const cadeauxValue = cadeauxElement.getAttribute('data-cadeaux');

if (!cadeauxValue || cadeauxValue.trim() === '') {
  return false; // Retourne false = pas visible
}

// Il y a des cadeaux, afficher le bloc
const blocCadeaux = document.querySelector('.cadeaux');
if (blocCadeaux) {
  blocCadeaux.style.display = 'flex'; // ou 'block' selon votre design
}

return true; // Retourne true = visible
}

updateBlocentierAvantages(hasReductions, hasCadeaux) {
  
  const blocAvantages = document.querySelector('.blocentier-avantages');
  if (!blocAvantages) {
    console.warn('⚠️ Bloc .blocentier-avantages non trouvé');
    return;
  }
  
  // Si au moins un des deux est visible
  if (hasReductions || hasCadeaux) {
    blocAvantages.style.display = 'block'; // ou 'block' selon votre design
  } else {
    // Les deux sont vides, laisser caché (déjà caché par défaut dans Webflow)
    console.log('❌ Bloc avantages reste caché (aucun contenu)');
  }
}

setupInclus() {
  
  // Chercher l'élément qui contient les inclus
  const inclusElement = document.querySelector('[data-inclus-reservation]');
  
  if (!inclusElement) {
    console.warn('⚠️ Élément data-inclus-reservation non trouvé');
    return;
  }
  
  // Récupérer la valeur
  const inclusValue = inclusElement.getAttribute('data-inclus-reservation');
  
  if (!inclusValue || inclusValue.trim() === '') {
    return;
  }
  
  // Il y a du contenu, afficher le bloc
  const blocInclus = document.querySelector('.inclus');
  if (blocInclus) {
    blocInclus.style.display = 'flex'; // ou 'block' selon votre design
  }
}

setupAnnonces() {
  
  // Vérifier les 3 champs d'annonces
  const airbnbElement = document.querySelector('[data-airbnb-link]');
  const bookingElement = document.querySelector('[data-booking-link]');
  const gitesElement = document.querySelector('[data-gites-link]');
  const googleElement = document.querySelector('[data-google-link]');
  
  // Récupérer les valeurs
  const airbnbValue = airbnbElement ? airbnbElement.getAttribute('data-airbnb-link') : '';
  const bookingValue = bookingElement ? bookingElement.getAttribute('data-booking-link') : '';
  const gitesValue = gitesElement ? gitesElement.getAttribute('data-gites-link') : '';
  const googleValue = googleElement ? googleElement.getAttribute('data-google-link') : '';
  
  // Vérifier si au moins une annonce existe
  const hasAnnonces = (airbnbValue && airbnbValue.trim() !== '') ||
                      (bookingValue && bookingValue.trim() !== '') ||
                      (gitesValue && gitesValue.trim() !== '') ||
                      (googleValue && googleValue.trim() !== '');
  
  if (!hasAnnonces) {
    return;
  }
  
  // Au moins une annonce existe, afficher le bloc
  const blocAnnonces = document.querySelector('.annonces');
  if (blocAnnonces) {
    blocAnnonces.style.display = 'block'; // ou 'block' selon votre design
  }
}

// À ajouter après setupAnnonces() par exemple (vers ligne 650)
setupImmatriculation() {
  // Chercher l'élément qui contient le code d'enregistrement
  const codeElement = document.querySelector('[data-code-enregistrement]');
  
  if (!codeElement) {
    console.warn('⚠️ Élément data-code-enregistrement non trouvé');
    return;
  }
  
  // Récupérer la valeur
  const codeValue = codeElement.getAttribute('data-code-enregistrement');
  
  // Chercher le bloc immatriculation
  const blocImmatriculation = document.getElementById('immatriculation');
  
  if (!blocImmatriculation) {
    console.warn('⚠️ Bloc #immatriculation non trouvé');
    return;
  }
  
  // Si le code est vide ou absent, cacher le bloc
  if (!codeValue || codeValue.trim() === '') {
    blocImmatriculation.style.display = 'none';
  } else {
    // Si un code existe, s'assurer que le bloc est visible
    blocImmatriculation.style.display = 'flex'; // ou 'block' selon votre design
  }
}
  
  // Gestion du téléphone cliquable
  setupTelephone() {
    
    // Chercher l'élément qui contient le numéro de téléphone
    const telephoneElement = document.querySelector('[data-telephone]');
    
    if (!telephoneElement) {
      console.warn('⚠️ Élément data-telephone non trouvé');
      return;
    }
    
    // Récupérer le numéro de téléphone
    const numeroTelephone = telephoneElement.getAttribute('data-telephone');
    
    if (!numeroTelephone || numeroTelephone.trim() === '') {
      return;
    }
    
    // Chercher le bouton téléphone et l'élément texte
    const boutonTel = document.querySelector('.bouton-tel');
    const numeroHoteElement = document.getElementById('numero-hote');
    
    if (!boutonTel || !numeroHoteElement) {
      console.warn('⚠️ Bouton .bouton-tel ou élément #numero-hote non trouvé');
      return;
    }
    
    // Ajouter le style cursor pointer
    boutonTel.style.cursor = 'pointer';
    
    // Ajouter l'événement de clic
    boutonTel.addEventListener('click', function(e) {
      e.preventDefault();
      
      // Révéler le numéro de téléphone
      numeroHoteElement.textContent = numeroTelephone;
    });
    
  }

  // Gestion des liens vers plateformes
  setupPlatformLinks() {
    const plateformes = [
      { id: "airbnb", cmsField: "data-airbnb-link" },
      { id: "booking", cmsField: "data-booking-link" },
      { id: "gites", cmsField: "data-gites-link" },
      { id: "google", cmsField: "data-google-link" }
    ];
    
    plateformes.forEach(({ id, cmsField }) => {
      const linkBlock = document.getElementById(id);
      if (linkBlock) {
        const cmsUrl = linkBlock.getAttribute(cmsField);
        if (cmsUrl && cmsUrl.trim() !== "") {
          linkBlock.setAttribute("href", cmsUrl);
        } else {
          linkBlock.style.display = "none";
        }
      }
    });
  }
  // Gestion des popins
  setupPopins() {
    this.setupPopin(".pop-up.photos", ".bloc-link-images", ".button-card, .app, .second, .profile, .conciergerie, .logements");
    this.setupPopin(".popin-price", ".button-modal-prix", ".button-modal-prix, .close");
  }

  setupPopin(popinSelector, openSelector, closeSelectors) {
    const popin = document.querySelector(popinSelector);
    const openBtn = document.querySelector(openSelector);
    const closeBtns = document.querySelectorAll(closeSelectors);
    
    if (!popin || !openBtn) {
      console.error(`Popin (${popinSelector}) ou bouton d'ouverture (${openSelector}) non trouvé.`);
      return;
    }
    
    openBtn.addEventListener("click", function() {
      document.body.classList.add("no-scroll");
      popin.style.display = "block";
    });
    
    closeBtns.forEach(btn => {
      btn.addEventListener("click", function() {
        document.body.classList.remove("no-scroll");
        popin.style.display = "none";
      });
    });
  }
}
// Export global
window.InterfaceManager = InterfaceManager;
