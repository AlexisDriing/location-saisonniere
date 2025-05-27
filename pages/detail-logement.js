/**
 * Code spécifique à la page détail d'un logement
 * Utilise le module de calcul des prix
 */

document.addEventListener('DOMContentLoaded', function() {
  // Charger les données de tarification
  const pricingElement = document.querySelector('[data-json-tarifs-line], [data-json-tarifs]');
  const typeElement = document.querySelector('[data-type-logement]');
  
  if (!pricingElement) {
    console.error('Données de tarification non trouvées');
    return;
  }
  
  try {
    // Parser les données
    const pricingData = JSON.parse(
      pricingElement.getAttribute('data-json-tarifs-line') || 
      pricingElement.getAttribute('data-json-tarifs')
    );
    
    const logementType = typeElement?.getAttribute('data-type-logement') || 'standard';
    
    // Initialiser le calculateur de prix
    const calculator = new PriceCalculator();
    calculator.init(pricingData, logementType);
    
    // Écouter les changements de dates
    if (typeof jQuery !== 'undefined') {
      jQuery('#input-calendar, #input-calendar-mobile').on('apply.daterangepicker', function(ev, picker) {
        if (picker.startDate && picker.endDate) {
          calculator.calculatePrices(picker.startDate, picker.endDate);
        }
      });
      
      jQuery('#input-calendar, #input-calendar-mobile').on('cancel.daterangepicker', function() {
        calculator.resetDisplay();
      });
    }
    
    // Rendre le calculateur disponible globalement si nécessaire
    window.priceCalculator = calculator;
    
  } catch (error) {
    console.error('Erreur lors de l\'initialisation du calculateur de prix:', error);
  }
});
