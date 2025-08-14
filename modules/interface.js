// V8 Gestion des interfaces : popins, logos, extras, equip, option, horaires, téléphone bouton etc
class InterfaceManager {
  constructor() {
    this.init();
  }

  init() {
    this.setupMainImages();
    this.setupPlatformLogos();
    this.setupExtras();
    this.setupEquipements();
    this.setupOptionsAccueil();
    this.setupHoraires();
    const hasReductions = this.setupReductions();
    const hasCadeaux = this.setupCadeaux();
    this.updateBlocentierAvantages(hasReductions, hasCadeaux);
    this.setupInclus();
    this.setupAnnonces();
    this.setupTelephone();
    this.setupPlatformLinks();
    this.setupPopins();
  }
  // 🆕 NOUVELLE MÉTHODE À AJOUTER JUSTE APRÈS init()
  setupMainImages() {
    console.log('🖼️ Configuration des images principales depuis la galerie...');
    
    // Chercher l'élément qui contient la galerie
    const galerieElement = document.querySelector('[data-photos-du-logement]');
    
    if (!galerieElement) {
      console.warn('⚠️ Élément data-photos-du-logement non trouvé');
      return;
    }
    
    // Récupérer et parser le JSON de la galerie
    let images = [];
    try {
      const galerieData = galerieElement.getAttribute('data-photos-du-logement');
      images = JSON.parse(galerieData);
    } catch (e) {
      console.error('❌ Erreur parsing galerie:', e);
      return;
    }
    
    if (!Array.isArray(images) || images.length === 0) {
      console.log('📋 Galerie vide');
      return;
    }
    
    console.log(`📸 ${images.length} image(s) dans la galerie`);
    
    // Remplacer les 3 images principales
    for (let i = 1; i <= 3; i++) {
      const imageElements = document.querySelectorAll(`[data-main-image="${i}"]`);
      
      if (images[i - 1] && images[i - 1].url) {
        const imageUrl = images[i - 1].url;
        
        imageElements.forEach(element => {
          if (element.tagName === 'IMG') {
            element.src = imageUrl;
          } else {
            element.style.backgroundImage = `url('${imageUrl}')`;
          }
        });
        
        console.log(`✅ Image ${i} mise à jour`);
      }
    }
  }

  // Gestion des logos des plateformes
  setupPlatformLogos() {
    document.querySelectorAll("#logo-plateformes").forEach(container => {
      const airbnbField = container.getAttribute("data-airbnb");
      const bookingField = container.getAttribute("data-booking");
      const gitesField = container.getAttribute("data-gites");
      
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
      console.log('📋 Aucun extra défini');
      return;
    }
    
    // 🆕 AJOUTER : Il y a des extras, afficher le bloc parent
    const blocExtras = document.querySelector('.blocentier-extras');
    if (blocExtras) {
      blocExtras.style.display = 'block'; // ou 'block' selon votre design
      console.log('✅ Bloc extras affiché');
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
          namePriceElement.innerHTML = `${title} <br> <strong>${price}</strong>`;
        }
        
        extrasGrid.appendChild(extraElement);
      } catch (error) {
        console.error("Erreur lors du traitement de l'extra :", extra, error);
      }
    });
  }

  // Gestion des équipements
  setupEquipements() {
    console.log('🏊 Configuration des équipements...');
    
    // Mapping entre les noms d'équipements et leurs IDs
    const equipementMapping = {
      'Piscine': 'piscine',
      'Jacuzzi': 'jacuzzi',
      'Climatisation': 'climatisation',
      'Barbecue': 'barbecue',
      'Équipement bébé': 'baby',
      'Parking gratuit': 'parking'
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
      console.log('📋 Aucun équipement défini pour ce logement');
      return;
    }

    const blocEquipements = document.querySelector('.blocentier-equipements');
    if (blocEquipements) {
      blocEquipements.style.display = 'block'; // ou 'block' selon votre design
    }
    
    // Parser les équipements (séparés par des virgules)
    const equipements = equipementsString.split(',').map(eq => eq.trim());
    console.log('📋 Équipements trouvés:', equipements);
    
    // Afficher chaque équipement trouvé
    let equipementsAffiches = 0;
    equipements.forEach(equipement => {
      const elementId = equipementMapping[equipement];
      
      if (elementId) {
        const element = document.getElementById(elementId);
        if (element) {
          element.style.display = ''; // Utiliser le display par défaut
          equipementsAffiches++;
          console.log(`✅ Affichage de l'équipement: ${equipement} (ID: ${elementId})`);
        } else {
          console.warn(`⚠️ Élément non trouvé pour l'ID: ${elementId}`);
        }
      } else {
        console.warn(`⚠️ Équipement non reconnu: "${equipement}"`);
      }
    });
    
    console.log(`✅ ${equipementsAffiches} équipements affichés`);
  }

  // Gestion des options d'accueil
  setupOptionsAccueil() {
    console.log('🏠 Configuration des options d\'accueil...');
    
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
      console.log('📋 Aucune option d\'accueil définie pour ce logement');
      return;
    }
    
    // Parser les options (séparées par des virgules)
    const options = optionsString.split(',').map(opt => opt.trim());
    console.log('📋 Options d\'accueil trouvées:', options);
    
    // Afficher chaque option trouvée
    let optionsAffichees = 0;
    options.forEach(option => {
      const elementId = optionsMapping[option];
      
      if (elementId) {
        const element = document.getElementById(elementId);
        if (element) {
          element.style.display = ''; // Utiliser le display par défaut
          optionsAffichees++;
          console.log(`✅ Affichage de l'option: ${option} (ID: ${elementId})`);
        } else {
          console.warn(`⚠️ Élément non trouvé pour l'ID: ${elementId}`);
        }
      } else {
        console.warn(`⚠️ Option non reconnue: "${option}"`);
      }
    });
    
    console.log(`✅ ${optionsAffichees} options d'accueil affichées`);
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
      console.log('📋 Aucun horaire personnalisé défini');
      return;
    }
    
    // Parser les horaires (séparés par une virgule)
    const horaires = horairesString.split(',').map(h => h.trim());
    
    if (horaires.length !== 2) {
      console.warn('⚠️ Format d\'horaires incorrect. Attendu: "HH:MM,HH:MM"');
      return;
    }
    
    // NOUVEAU : Formater de HH:MM vers HHhMM
    const formatHeure = (heure) => {
      // Si c'est déjà au format HH:MM
      if (/^\d{1,2}:\d{2}$/.test(heure)) {
        return heure.replace(':', 'h');
      }
      // Si c'est juste un nombre (ancien format)
      if (/^\d+$/.test(heure)) {
        return `${heure}h00`;
      }
      // Si c'est au format XXh sans minutes
      if (/^\d+h$/.test(heure)) {
        return `${heure}00`;
      }
      // Si c'est au format XXhYY
      if (/^\d+h\d+$/.test(heure)) {
        return heure;
      }
      return heure;
    };
    
    const heureArrivee = formatHeure(horaires[0]);
    const heureDepart = formatHeure(horaires[1]);
    
    console.log(`📋 Horaires formatés: Arrivée ${heureArrivee}, Départ ${heureDepart}`);
    
    const textHorairesElement = document.querySelector('.text-horaires');
    
    if (!textHorairesElement) {
      console.warn('⚠️ Élément .text-horaires non trouvé');
      return;
    }
    
    let texteActuel = textHorairesElement.textContent;
    const heuresExistantes = texteActuel.match(/\d+h\d+/g) || [];
    
    if (heuresExistantes.length >= 2) {
      texteActuel = texteActuel.replace(heuresExistantes[0], heureArrivee);
      texteActuel = texteActuel.replace(heuresExistantes[1], heureDepart);
    } else {
      console.warn('⚠️ Impossible de trouver 2 horaires dans le texte');
      return;
    }
    
    textHorairesElement.textContent = texteActuel;
    console.log(`✅ Horaires mis à jour: ${texteActuel}`);
  }

  // Gestion des réductions
  setupReductions() {
  console.log('💰 Configuration des réductions...');
  
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
      console.log('📋 Aucune donnée tarifaire');
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
    console.log('📋 Aucune réduction définie');
    // Le bloc reste caché (état par défaut Webflow)
    return false; // 🆕 MODIFIÉ : return false au lieu de return
  }
  
  // Trier les réductions par nombre de nuits croissant
  const sortedDiscounts = [...pricingData.discounts]
    .sort((a, b) => a.nights - b.nights)
    .slice(0, 5); // Limiter à 5 maximum
  
  console.log(`📋 ${sortedDiscounts.length} réduction(s) trouvée(s):`, sortedDiscounts);
  
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
console.log('🎁 Configuration des cadeaux...');

// Chercher l'élément qui contient les cadeaux
const cadeauxElement = document.querySelector('[data-cadeaux]');

if (!cadeauxElement) {
  console.warn('⚠️ Élément data-cadeaux non trouvé');
  return false; // Retourne false = pas visible
}

// Récupérer la valeur
const cadeauxValue = cadeauxElement.getAttribute('data-cadeaux');

if (!cadeauxValue || cadeauxValue.trim() === '') {
  console.log('📋 Aucun cadeau défini');
  return false; // Retourne false = pas visible
}

// Il y a des cadeaux, afficher le bloc
const blocCadeaux = document.querySelector('.cadeaux');
if (blocCadeaux) {
  blocCadeaux.style.display = 'flex'; // ou 'block' selon votre design
  console.log('✅ Bloc cadeaux affiché');
}

return true; // Retourne true = visible
}

updateBlocentierAvantages(hasReductions, hasCadeaux) {
  console.log('📦 Mise à jour bloc avantages...');
  
  const blocAvantages = document.querySelector('.blocentier-avantages');
  if (!blocAvantages) {
    console.warn('⚠️ Bloc .blocentier-avantages non trouvé');
    return;
  }
  
  // Si au moins un des deux est visible
  if (hasReductions || hasCadeaux) {
    blocAvantages.style.display = 'block'; // ou 'block' selon votre design
    console.log('✅ Bloc avantages affiché (réductions:', hasReductions, ', cadeaux:', hasCadeaux, ')');
  } else {
    // Les deux sont vides, laisser caché (déjà caché par défaut dans Webflow)
    console.log('❌ Bloc avantages reste caché (aucun contenu)');
  }
}

setupInclus() {
  console.log('✅ Configuration du bloc inclus...');
  
  // Chercher l'élément qui contient les inclus
  const inclusElement = document.querySelector('[data-inclus-reservation]');
  
  if (!inclusElement) {
    console.warn('⚠️ Élément data-inclus-reservation non trouvé');
    return;
  }
  
  // Récupérer la valeur
  const inclusValue = inclusElement.getAttribute('data-inclus-reservation');
  
  if (!inclusValue || inclusValue.trim() === '') {
    console.log('📋 Aucun inclus défini - bloc reste caché');
    return;
  }
  
  // Il y a du contenu, afficher le bloc
  const blocInclus = document.querySelector('.inclus');
  if (blocInclus) {
    blocInclus.style.display = 'flex'; // ou 'block' selon votre design
    console.log('✅ Bloc inclus affiché');
  }
}

setupAnnonces() {
  console.log('📢 Configuration du bloc annonces...');
  
  // Vérifier les 3 champs d'annonces
  const airbnbElement = document.querySelector('[data-airbnb-link]');
  const bookingElement = document.querySelector('[data-booking-link]');
  const gitesElement = document.querySelector('[data-gites-link]');
  
  // Récupérer les valeurs
  const airbnbValue = airbnbElement ? airbnbElement.getAttribute('data-airbnb-link') : '';
  const bookingValue = bookingElement ? bookingElement.getAttribute('data-booking-link') : '';
  const gitesValue = gitesElement ? gitesElement.getAttribute('data-gites-link') : '';
  
  // Vérifier si au moins une annonce existe
  const hasAnnonces = (airbnbValue && airbnbValue.trim() !== '') ||
                      (bookingValue && bookingValue.trim() !== '') ||
                      (gitesValue && gitesValue.trim() !== '');
  
  if (!hasAnnonces) {
    console.log('📋 Aucune annonce définie - bloc reste caché');
    return;
  }
  
  // Au moins une annonce existe, afficher le bloc
  const blocAnnonces = document.querySelector('.annonces');
  if (blocAnnonces) {
    blocAnnonces.style.display = 'block'; // ou 'block' selon votre design
    console.log('✅ Bloc annonces affiché');
  }
}
  // Gestion du téléphone cliquable
  setupTelephone() {
    console.log('📞 Configuration du téléphone...');
    
    // Chercher l'élément qui contient le numéro de téléphone
    const telephoneElement = document.querySelector('[data-telephone]');
    
    if (!telephoneElement) {
      console.warn('⚠️ Élément data-telephone non trouvé');
      return;
    }
    
    // Récupérer le numéro de téléphone
    const numeroTelephone = telephoneElement.getAttribute('data-telephone');
    
    if (!numeroTelephone || numeroTelephone.trim() === '') {
      console.log('📋 Aucun numéro de téléphone défini');
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
      console.log('📞 Numéro révélé:', numeroTelephone);
    });
    
    console.log('✅ Bouton téléphone configuré');
  }

  // Gestion des liens vers plateformes
  setupPlatformLinks() {
    const plateformes = [
      { id: "airbnb", cmsField: "data-airbnb-link" },
      { id: "booking", cmsField: "data-booking-link" },
      { id: "gites", cmsField: "data-gites-link" }
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
      console.log("Popin ouverte :", popinSelector);
      document.body.classList.add("no-scroll");
      popin.style.display = "block";
    });
    
    closeBtns.forEach(btn => {
      btn.addEventListener("click", function() {
        console.log("Popin fermée :", popinSelector);
        document.body.classList.remove("no-scroll");
        popin.style.display = "none";
      });
    });
  }
}
// Export global
window.InterfaceManager = InterfaceManager;
