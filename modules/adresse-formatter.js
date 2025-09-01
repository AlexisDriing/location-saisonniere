// Gestionnaire de formatage des adresses LOG production
class AddressFormatterManager {
  constructor() {
    this.init();
  }

  init() {
    this.formatAllAddresses();
    
    // Export global
    window.addressFormatterManager = this;
  }

  formatAllAddresses() {
    // Sélectionner tous les éléments d'adresse
    const addressElements = document.querySelectorAll(".adresse");
    
    addressElements.forEach(element => {
      this.formatAddress(element);
    });
  }

  formatAddress(element) {
    const fullAddress = element.textContent.trim();
    const addressParts = fullAddress.split(",").map(part => part.trim());
    
    if (addressParts.length < 2) {
      // Si l'adresse n'a pas assez de parties, on la laisse telle quelle
      return;
    }
    
    // Extraire ville et pays (les 2 premières parties)
    const cityCountry = addressParts.slice(0, 2).join(", ");
    
    // Mettre à jour l'élément avec la version formatée
    element.textContent = cityCountry;
  }

  // Méthodes publiques
  format(addressString) {
    const addressParts = addressString.split(",").map(part => part.trim());
    
    if (addressParts.length < 2) {
      return addressString;
    }
    
    return addressParts.slice(-2).join(", ");
  }

  // Méthode pour reformatter toutes les adresses (utile après un chargement dynamique)
  refresh() {
    this.formatAllAddresses();
  }
}

// Export global
window.AddressFormatterManager = AddressFormatterManager;
