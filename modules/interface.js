// Gestion des interfaces : popins, logos, extras, equip, horaires, téléphone bouton etc
class InterfaceManager {
  constructor() {
    this.init();
  }

  init() {
    this.setupPlatformLogos();
    this.setupExtras();
    this.setupEquipements();
    this.setupOptionsAccueil();
    this.setupHoraires();
    this.setupReductions();
    this.setupTelephone();
    this.setupPlatformLinks();
    this.setupPopins();
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
        img.src = "https://cdn.prod.website-files.com/631204438bf0c14f7ab24dd6/6798ece4142552abd72e22c4_Frame%20288955.jpg";
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
    if (!extrasData || extrasData.trim() === "") return;
    
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
      'Équipement Bébé': 'baby',
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
    console.log('🕐 Configuration des horaires...');
    
    // Chercher l'élément qui contient les horaires
    const horairesElement = document.querySelector('[data-heure-arrivee-depart]');
    
    if (!horairesElement) {
      console.warn('⚠️ Élément data-heure-arrivee-depart non trouvé');
      return;
    }
    
    // Récupérer la valeur du champ
    const horairesString = horairesElement.getAttribute('data-heure-arrivee-depart');
    
    if (!horairesString || horairesString.trim() === '') {
      console.log('📋 Aucun horaire personnalisé défini');
      return;
    }
    
    // Parser les horaires (séparés par une virgule)
    const horaires = horairesString.split(',').map(h => h.trim());
    
    if (horaires.length !== 2) {
      console.warn('⚠️ Format d\'horaires incorrect. Attendu: "heureArrivée,heureDépart"');
      return;
    }
    
    // Formater les horaires
    const formatHeure = (heure) => {
      // Si c'est juste un nombre, ajouter h00
      if (/^\d+$/.test(heure)) {
        return `${heure}h00`;
      }
      // Si c'est au format XXh sans minutes, ajouter 00
      if (/^\d+h$/.test(heure)) {
        return `${heure}00`;
      }
      // Si c'est au format XXhYY, le garder tel quel
      if (/^\d+h\d+$/.test(heure)) {
        return heure;
      }
      // Sinon retourner tel quel
      return heure;
    };
    
    const heureArrivee = formatHeure(horaires[0]);
    const heureDepart = formatHeure(horaires[1]);
    
    console.log(`📋 Horaires formatés: Arrivée ${heureArrivee}, Départ ${heureDepart}`);
    
    // Chercher l'élément texte à modifier
    const textHorairesElement = document.querySelector('.text-horaires');
    
    if (!textHorairesElement) {
      console.warn('⚠️ Élément .text-horaires non trouvé');
      return;
    }
    
    // Remplacer les horaires dans le texte
    // Pattern pour trouver les heures (format XXhXX ou XXh00)
    let texteActuel = textHorairesElement.textContent;
    
    // Remplacer toutes les occurrences d'heures
    const heuresExistantes = texteActuel.match(/\d+h\d+/g) || [];
    
    if (heuresExistantes.length >= 2) {
      // Remplacer la première heure (arrivée)
      texteActuel = texteActuel.replace(heuresExistantes[0], heureArrivee);
      // Remplacer la deuxième heure (départ)
      texteActuel = texteActuel.replace(heuresExistantes[1], heureDepart);
    } else {
      console.warn('⚠️ Impossible de trouver 2 horaires dans le texte');
      return;
    }
    
    // Mettre à jour le texte
    textHorairesElement.textContent = texteActuel;
    
    console.log(`✅ Horaires mis à jour: ${texteActuel}`);
  }

  // Gestion des réductions
  setupReductions() {
    console.log('💰 Configuration des réductions...');
    
    // Chercher l'élément qui contient les réductions
    const reductionElement = document.querySelector('[data-reduction]');
    
    if (!reductionElement) {
      console.warn('⚠️ Élément data-reduction non trouvé');
      return;
    }
    
    // Récupérer la valeur du champ
    const reductionString = reductionElement.getAttribute('data-reduction');
    
    if (!reductionString || reductionString.trim() === '') {
      console.log('📋 Aucune réduction personnalisée définie');
      return;
    }
    
    // Parser les valeurs (séparées par une virgule)
    const valeurs = reductionString.split(',').map(v => v.trim());
    
    if (valeurs.length !== 2) {
      console.warn('⚠️ Format de réduction incorrect. Attendu: "nombreJours,pourcentage"');
      return;
    }
    
    const [nombreJours, pourcentage] = valeurs;
    console.log(`📋 Réduction trouvée: ${nombreJours} nuits, ${pourcentage}%`);
    
    // Chercher l'élément texte à modifier
    const textReducElement = document.querySelector('.text-reduc');
    
    if (!textReducElement) {
      console.warn('⚠️ Élément .text-reduc non trouvé');
      return;
    }
    
    // Remplacer les valeurs dans le texte
    let texteActuel = textReducElement.textContent;
    
    // Remplacer le nombre de nuits (premier nombre suivi de "nuits")
    texteActuel = texteActuel.replace(/\d+\s*nuits?/, `${nombreJours} nuits`);
    
    // Remplacer le pourcentage (nombre suivi de %)
    texteActuel = texteActuel.replace(/\d+%/, `${pourcentage}%`);
    
    // Mettre à jour le texte
    textReducElement.textContent = texteActuel;
    
    console.log(`✅ Réduction mise à jour: ${texteActuel}`);
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
      
      // Révéler le numéro
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
