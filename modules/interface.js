// LOG production V1.24
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
    // Récupérer le slug depuis l'URL (même méthode que reservation-data.js)
    const slug = window.location.pathname.split("/").pop();
    if (!slug) return;

    try {
      const response = await fetch(`${window.CONFIG.API_URL}/property-rooms/${slug}`);
      if (!response.ok) return;
      
      const data = await response.json();
      const rooms = data.rooms || [];
      
      if (rooms.length === 0) return;

      this.displayRoomsOnDetail(rooms);
    } catch (error) {
      console.error('❌ Erreur chargement chambres:', error);
    }
  }


  displayRoomsOnDetail(rooms) {
    const bloc = document.getElementById('bloc-chambres-hotes');
    if (!bloc) return;

    // Masquer tous les blocs de chambres par défaut (1 à 5)
    for (let i = 1; i <= 5; i++) {
      const chambreBloc = document.getElementById(`chambre-hote-${i}`);
      if (chambreBloc) chambreBloc.style.display = 'none';
    }

    // Remplir et afficher les blocs correspondant aux chambres existantes
    rooms.forEach((room, index) => {
      const chambreBloc = document.getElementById(`chambre-hote-${index + 1}`);
      if (!chambreBloc) return;

      chambreBloc.style.display = 'flex';

      // 1. Image (première photo)
      const imageEl = document.getElementById(`image-chambre-${index + 1}`);
      if (imageEl) {
        const photos = room.photos || [];
        if (photos.length > 0) {
          const photoUrl = typeof photos[0] === 'object' ? photos[0].url : photos[0];
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

      // 2. Voyageurs
      const voyageursEl = document.getElementById(`voyageurs-chambre-${index + 1}`);
      if (voyageursEl) {
        const match = (room.taille_chambre || '').match(/^(\d+)/);
        const voyageurs = match ? parseInt(match[1]) : 0;
        voyageursEl.textContent = `${voyageurs} voyageur${voyageurs > 1 ? 's' : ''}`;
      }

      // 3. Nom
      const nomEl = document.getElementById(`nom-chambre-${index + 1}`);
      if (nomEl) {
        nomEl.textContent = room.name || 'Chambre';
      }

      // 4. Taille m²
      const tailleEl = document.getElementById(`taille-chambre-${index + 1}`);
      if (tailleEl) {
        const tailleMatch = (room.taille_chambre || '').match(/(\d+)\s*m²/);
        const m2 = tailleMatch ? tailleMatch[1] : '0';
        tailleEl.textContent = `${m2} m²`;
      }

      // 5. Types de lits
      const litsEl = document.getElementById(`lits-chambre-${index + 1}`);
      if (litsEl) {
        const detailsLits = room.details_lits || '';
        if (detailsLits) {
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
          litsEl.textContent = expandedTypes.join(', ');
        } else {
          litsEl.textContent = '';
        }
      }

      // 6. Prix avec pourcentage et prix barré
      const prixEl = document.getElementById(`prix-chambre-${index + 1}`);
      const pourcentageEl = document.getElementById(`pourcentage-chambre-${index + 1}`);
      
      if (prixEl && room.pricing_data) {
        const pricingData = room.pricing_data;
        const defaultPricing = pricingData.defaultPricing;
        
        if (defaultPricing) {
          let displayPrice = 0;

          if (defaultPricing.mode === 'per_guest') {
            const prices = defaultPricing.pricesPerGuest || [];
            displayPrice = prices.length > 0 ? prices[prices.length - 1] : (defaultPricing.price || 0);
          } else {
            displayPrice = defaultPricing.price || 0;
          }

          // Calculer le prix plateforme
          let platformPrice = displayPrice;
          let hasDiscount = false;

          if (defaultPricing.platformPrices) {
            const prices = Object.values(defaultPricing.platformPrices).filter(p => p > 0);
            if (prices.length > 0) {
              platformPrice = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
              hasDiscount = true;
            }
          }

          if (!hasDiscount) {
            const defaultDiscount = (pricingData.platformPricing && pricingData.platformPricing.defaultDiscount) 
              ? pricingData.platformPricing.defaultDiscount 
              : 17;
            platformPrice = Math.round(displayPrice * (100 / (100 - defaultDiscount)));
            hasDiscount = true;
          }

          // Affichage
          prixEl.textContent = '';
          prixEl.style.setProperty('display', 'flex', 'important');
          prixEl.style.setProperty('flex-direction', 'row', 'important');
          prixEl.style.setProperty('align-items', 'baseline', 'important');
          prixEl.style.setProperty('gap', '4px', 'important');

          if (hasDiscount && platformPrice > displayPrice) {
            // Prix barré
            const del = document.createElement('del');
            del.textContent = `${Math.round(platformPrice)}€`;
            del.style.setProperty('text-decoration', 'line-through', 'important');
            del.style.setProperty('color', '#778183', 'important');
            del.style.setProperty('font-size', '14px', 'important');
            del.style.setProperty('font-weight', 'normal', 'important');
            prixEl.appendChild(del);

            // Prix chez nous (bold)
            const strong = document.createElement('strong');
            strong.textContent = `${Math.round(displayPrice)}€`;
            strong.style.setProperty('font-weight', '600', 'important');
            strong.style.setProperty('font-size', '16px', 'important');
            prixEl.appendChild(strong);

            // / nuit (regular)
            const suffix = document.createElement('span');
            suffix.textContent = '/ nuit';
            suffix.style.setProperty('font-weight', '400', 'important');
            suffix.style.setProperty('font-size', '16px', 'important');
            prixEl.appendChild(suffix);

            // Pourcentage
            if (pourcentageEl) {
              const discount = Math.round(((platformPrice - displayPrice) / platformPrice) * 100);
              pourcentageEl.textContent = `-${discount}%`;
              pourcentageEl.style.display = 'block';
            }
          } else {
            // Prix (bold)
            const strong = document.createElement('strong');
            strong.textContent = `${Math.round(displayPrice)}€`;
            strong.style.setProperty('font-weight', '600', 'important');
            strong.style.setProperty('font-size', '16px', 'important');
            prixEl.appendChild(strong);

            // / nuit (regular)
            const suffix = document.createElement('span');
            suffix.textContent = '/ nuit';
            suffix.style.setProperty('font-weight', '400', 'important');
            suffix.style.setProperty('font-size', '16px', 'important');
            prixEl.appendChild(suffix);

            if (pourcentageEl) {
              pourcentageEl.style.display = 'none';
            }
          }
        }
      }

    });

    // Afficher le bloc parent
    bloc.style.display = 'block';
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
