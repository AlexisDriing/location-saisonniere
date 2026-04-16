// LOG production V1.16
// Gestion des données de réservation et récupération des informations
class ReservationDataManager {
  constructor() {
    this.init();
  }

  init() {
    this.setupReservationButtons();
    this.loadSearchDataFromStorage();
  }

  setupReservationButtons() {
    
    // Récupérer les informations du logement
    const logementInfo = this.extractLogementInfo();
    const bookButtons = document.querySelectorAll(".button-reserver:not(.chambre), .button-reserver-mobile:not(.chambre)");
    
    if (bookButtons.length === 0) {
      console.warn("⚠️ Aucun bouton de réservation trouvé avec les classes 'button-reserver' ou 'button-reserver-mobile'");
      return;
    }
    
    const propertyId = window.location.pathname.split("/").pop();
    const currentPageUrl = window.location.href;
    
    bookButtons.forEach(bookButton => {
      // Préparer l'URL du bouton
      let targetUrl = bookButton.getAttribute("href");
      const separator = targetUrl.includes("?") ? "&" : "?";
      bookButton.setAttribute("href", `${targetUrl}${separator}logement=${propertyId}`);
      
      // Ajouter les attributs data
      if (logementInfo.nom) bookButton.setAttribute("data-logement-nom", logementInfo.nom);
      if (logementInfo.image) bookButton.setAttribute("data-logement-image", logementInfo.image);
      if (logementInfo.adresse) bookButton.setAttribute("data-logement-adresse", logementInfo.adresse);
      if (logementInfo.reduction) bookButton.setAttribute("data-logement-reduction", logementInfo.reduction);
      bookButton.setAttribute("data-logement-url", currentPageUrl);
      
      // Ajouter l'écouteur d'événement
      bookButton.addEventListener("click", (e) => {
        this.handleReservationClick(e, propertyId, logementInfo, currentPageUrl);
      });
    });
    
  }

  extractLogementInfo() {
    const info = {
      nom: "",
      image: "",
      adresse: "",
      reduction: ""
    };
    
    // Nom du logement
    const nomElement = document.getElementById("nom-logement");
    if (nomElement) {
      info.nom = nomElement.textContent.trim();
    }
    
    // Adresse
    const adresseElement = document.getElementById("adresse-logement");
    if (adresseElement) {
      // Récupérer directement l'adresse déjà réorganisée par interface.js
      const adresseComplete = adresseElement.textContent.trim();
      if (adresseComplete) {
        // On prend l'adresse complète telle qu'elle est affichée
        info.adresse = adresseComplete;
      }
    }
    
    // Pourcentage de réduction
    const pourcentageElement = Utils.getElementByIdWithFallback("text-pourcentage");
    if (pourcentageElement) {
      info.reduction = pourcentageElement.textContent.trim();
    }
    
    // Image
    info.image = this.extractImageUrl();
    
    return info;
  }

  extractImageUrl() {
    let imageUrl = "";
    
    // Essayer d'abord l'élément avec ID cms-image1
    const imageElement = document.getElementById("cms-image1");
    if (imageElement) {
      if (imageElement.tagName === "IMG" && imageElement.src) {
        imageUrl = imageElement.src;
      } else {
        const style = window.getComputedStyle(imageElement);
        if (style.backgroundImage && style.backgroundImage !== "none") {
          imageUrl = style.backgroundImage.replace(/^url\(['"](.+)['"]\)$/, '$1');
        }
      }
    }
    
    // Si pas trouvé, chercher dans la grille
    if (!imageUrl) {
      const gridCells = document.querySelectorAll(".w-layout-grid > div");
      for (const cell of gridCells) {
        const style = window.getComputedStyle(cell);
        if (style.backgroundImage && style.backgroundImage !== "none") {
          imageUrl = style.backgroundImage.replace(/^url\(['"](.+)['"]\)$/, '$1');
          break;
        }
      }
    }
    
    return imageUrl;
  }

  handleReservationClick(e, propertyId, logementInfo, currentPageUrl) {
    // Vérifier que des dates sont sélectionnées
    const datesTexte = Utils.getElementByIdWithFallback("dates-texte")?.textContent || "";
    if (datesTexte === "Sélectionner une date") {
      alert("Veuillez sélectionner des dates de séjour avant de réserver.");
      e.preventDefault();
      return;
    }
    
    // Récupérer les informations des voyageurs
    const voyageursTexte = Utils.getElementByIdWithFallback("voyageurs-texte")?.textContent || "";
    const countAdultes = parseInt(Utils.getElementByIdWithFallback("chiffres-adultes")?.textContent || "1");
    const countEnfants = parseInt(Utils.getElementByIdWithFallback("chiffres-enfants")?.textContent || "0");
    const countBebes = parseInt(Utils.getElementByIdWithFallback("chiffres-bebes")?.textContent || "0");
    
    // Récupérer les détails de prix
    let prixDetails = {};
    let caution = null;
    let acompte = null;
    
    if (window.priceCalculator) {
      if (window.priceCalculator.pricingData) {
        caution = window.priceCalculator.pricingData.caution;
        acompte = window.priceCalculator.pricingData.acompte;
      }
      // Pour les chambres d'hôtes, caution/acompte sont stockés séparément
      if (window.priceCalculator._parentCautionAcompte) {
        caution = window.priceCalculator._parentCautionAcompte.caution;
        acompte = window.priceCalculator._parentCautionAcompte.acompte;
      }
    }

    
    if (window.priceCalculator && window.priceCalculator.startDate) {
      prixDetails = {
        calcNuit: Utils.getElementByIdWithFallback("calcul-nuit")?.textContent || "",
        prixNuit: Utils.getElementByIdWithFallback("prix-nuit")?.textContent || "",
        prixReduction: Utils.getElementByIdWithFallback("prix-reduction")?.textContent || "",
        prixMenage: Utils.getElementByIdWithFallback("prix-menage")?.innerHTML || "",
        prixSupplement: document.getElementById("prix-supplement")?.textContent || "",
        calculSupplement: document.getElementById("calcul-supplement")?.textContent || "",
        totalPrix: Utils.getElementByIdWithFallback("total-prix")?.innerHTML || "",
        dateDebut: window.priceCalculator.startDate?.format("YYYY-MM-DD") || "",
        dateFin: window.priceCalculator.endDate?.format("YYYY-MM-DD") || "",
        hasReduction: Utils.getElementByIdWithFallback("prix-reduction")?.textContent !== ""
      };
    }
    
    // Récupérer le site internet
    const siteInternetElement = document.querySelector("[data-site-internet]");
    let siteInternet = "";
    if (siteInternetElement) {
      siteInternet = siteInternetElement.getAttribute("data-site-internet") || "";
    }
    
    // Récupérer les infos de la chambre sélectionnée si B&B
    const interfaceManager = window.detailLogementPage?.managers?.interface;
    const selectedRoom = interfaceManager?._selectedRoomIndex 
      ? interfaceManager._roomsData[interfaceManager._selectedRoomIndex] 
      : null;

    const reservationData = {
      logementId: propertyId,
      logementNom: logementInfo.nom,
      logementImage: logementInfo.image,
      logementAdresse: logementInfo.adresse,
      logementReduction: Utils.getElementByIdWithFallback("text-pourcentage")?.textContent?.trim() || logementInfo.reduction,
      logementUrl: currentPageUrl,
      siteInternet: siteInternet,
      datesTexte,
      voyageursTexte,
      voyageurs: {
        adultes: countAdultes,
        enfants: countEnfants,
        bebes: countBebes
      },
      prix: prixDetails,
      caution,
      acompte,
      dateReservation: new Date().toISOString(),
      hoteEmail: document.getElementById("email-hote")?.getAttribute("data-email") || "",
      isChambreHote: !!selectedRoom,
      chambre: selectedRoom ? {
        nom: selectedRoom.name || '',
        image: (() => {
          const photos = selectedRoom.photos || [];
          if (photos.length > 0) {
            return typeof photos[0] === 'object' ? photos[0].url : photos[0];
          }
          return '';
        })(),
        voyageurs: (() => {
          const match = (selectedRoom.taille_chambre || '').match(/^(\d+)/);
          const v = match ? parseInt(match[1]) : 0;
          return `${v} voyageur${v > 1 ? 's' : ''}`;
        })(),
        taille: (() => {
          const match = (selectedRoom.taille_chambre || '').match(/(\d+)\s*m²/);
          return match ? `${match[1]} m²` : '';
        })(),
        lits: interfaceManager?.formatDetailsLits(selectedRoom.details_lits) || ''
      } : null
    };

    
    // Sauvegarder dans localStorage
    localStorage.setItem("reservation_data", JSON.stringify(reservationData));
  }
  
  loadSearchDataFromStorage() {
  // 🆕 NOUVEAU : D'abord vérifier s'il y a des dates modifiées (retour navigation)
  let storedData = localStorage.getItem("current_detail_dates");
  let isUsingModifiedDates = false;
  
  // Si pas de dates modifiées, utiliser les dates de recherche
  if (!storedData) {
    storedData = localStorage.getItem("selected_search_data");
  } else {
    isUsingModifiedDates = true;
  }
  
  if (!storedData) return;
  
  try {
    const searchData = JSON.parse(storedData);
      
      // Vérifier si les données ne sont pas trop anciennes (24h)
      if (Date.now() - searchData.timestamp >= 24 * 60 * 60 * 1000) {
        localStorage.removeItem("selected_search_data");
        return;
      }
      
      if (!searchData.startDate || !searchData.endDate) return;
            
      // Mettre à jour les voyageurs si disponible
      if (window.travelersManager) {
        if (typeof searchData.adultes === "number") {
          window.travelersManager.adults = searchData.adultes;
        }
        if (typeof searchData.enfants === "number") {
          window.travelersManager.children = searchData.enfants;
        }
        // 🆕 NOUVEAU : Charger aussi les bébés s'ils existent
        if (typeof searchData.bebes === "number") {
          window.travelersManager.babies = searchData.bebes;
        }
        window.travelersManager.updateUI();
      } else {
        // Fallback: mettre à jour directement les éléments
        if (typeof searchData.adultes === "number") {
          const adultsElements = [
            document.getElementById("chiffres-adultes"),
            document.getElementById("chiffres-adultes-mobile")
          ];
          adultsElements.forEach(el => {
            if (el) el.textContent = searchData.adultes;
          });
        }
        
        if (typeof searchData.enfants === "number") {
          const childrenElements = [
            document.getElementById("chiffres-enfants"),
            document.getElementById("chiffres-enfants-mobile")
          ];
          childrenElements.forEach(el => {
            if (el) el.textContent = searchData.enfants;
          });
        }
        
        // Mettre à jour le texte des voyageurs
        const totalTravelers = searchData.adultes + searchData.enfants;
        const travelersText = totalTravelers === 1 ? "1 voyageur" : `${totalTravelers} voyageurs`;
        const travelersElements = [
          document.getElementById("voyageurs-texte"),
          document.getElementById("voyageurs-texte-mobile")
        ];
        travelersElements.forEach(el => {
          if (el) el.textContent = travelersText;
        });
      }
      
      const applyDatesToCalendar = () => {
        if (window.jQuery && (jQuery("#input-calendar").data("daterangepicker") || jQuery("#input-calendar-mobile").data("daterangepicker"))) {
          const startDate = moment(searchData.startDate);
          const endDate = moment(searchData.endDate);
          
          // 🔧 FIX: Appliquer aux DEUX calendriers (desktop ET mobile)
          const desktopPicker = jQuery("#input-calendar").data("daterangepicker");
          const mobilePicker = jQuery("#input-calendar-mobile").data("daterangepicker");
          
          // Appliquer au picker desktop s'il existe
          if (desktopPicker) {
            desktopPicker.setStartDate(startDate);
            desktopPicker.setEndDate(endDate);
          }
          
          // 🔧 FIX: Appliquer AUSSI au picker mobile s'il existe
          if (mobilePicker) {
            mobilePicker.setStartDate(startDate);
            mobilePicker.setEndDate(endDate);
          }
          
          // Mettre à jour le calculateur de prix (une seule fois)
          if (window.priceCalculator) {
            window.priceCalculator.startDate = startDate;
            window.priceCalculator.endDate = endDate;
            window.priceCalculator.calculateAndDisplayPrices();
          }
          
          // Mettre à jour manuellement le texte des dates
          const datesElements = [
            document.getElementById("dates-texte"),
            document.getElementById("dates-texte-mobile")
          ];
          
          if (datesElements[0] || datesElements[1]) {
            const startText = startDate.format("ddd").toLowerCase() + " " + startDate.format("DD/MM");
            const endText = endDate.format("ddd").toLowerCase() + " " + endDate.format("DD/MM");
            const combinedText = startText + " - " + endText;
            
            datesElements.forEach(el => {
              if (el) {
                el.textContent = combinedText;
                el.style.color = "#272A2B";
              }
            });
          }
          
          return true;
        }
        return false;
      };
      
      // Essayer d'appliquer immédiatement, sinon attendre
      if (!applyDatesToCalendar()) {
        const checkInterval = setInterval(() => {
          if (applyDatesToCalendar()) {
            clearInterval(checkInterval);
          }
        }, 100);
        
        // Arrêter après 5 secondes max
        setTimeout(() => clearInterval(checkInterval), 5000);
      }
      
    } catch (error) {
      console.error("Erreur lors du traitement des données de recherche:", error);
      localStorage.removeItem("selected_search_data");
    }
    if (isUsingModifiedDates) {
        setTimeout(() => {
          localStorage.removeItem("current_detail_dates");
        }, 1000); // Délai pour s'assurer que tout est bien chargé
      }
  }
}


// Export global
window.ReservationDataManager = ReservationDataManager;
