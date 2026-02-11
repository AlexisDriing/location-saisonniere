// Fonctions utilitaires partagées - personnes supplémentaires
class Utils {
  static getElementByIdWithFallback(baseId) {
    const dualIds = [
      "text-pourcentage", "prix-direct", "input-calendar", "dates-texte", 
      "voyageurs-texte", "calcul-nuit", "prix-nuit", "prix-reduction", 
      "prix-taxe", "prix-menage", "total-prix", "adultes-moins", 
      "chiffres-adultes", "adultes-plus", "enfants-moins", "chiffres-enfants", 
      "enfants-plus", "bebes-moins", "chiffres-bebes", "bebes-plus", "bloc-reduction",
      "ligne-supplement-voyageurs", "calcul-supplement", "prix-supplement"
    ];
    
    let element = document.getElementById(baseId);
    if (!element && dualIds.includes(baseId)) {
      element = document.getElementById(`${baseId}-mobile`);
    }
    return element;
  }

  static getAllElementsById(baseId) {
    const dualIds = [
      "text-pourcentage", "prix-direct", "input-calendar", "dates-texte", 
      "voyageurs-texte", "calcul-nuit", "prix-nuit", "prix-reduction", 
      "prix-taxe", "prix-menage", "total-prix", "adultes-moins", 
      "chiffres-adultes", "adultes-plus", "enfants-moins", "chiffres-enfants", 
      "enfants-plus", "bebes-moins", "chiffres-bebes", "bebes-plus", "bloc-reduction",
      "ligne-supplement-voyageurs", "calcul-supplement", "prix-supplement"
    ];
    
    const elements = [];
    const desktop = document.getElementById(baseId);
    if (desktop) elements.push(desktop);
    
    if (dualIds.includes(baseId)) {
      const mobile = document.getElementById(`${baseId}-mobile`);
      if (mobile) elements.push(mobile);
    }
    
    if (baseId === "text-pourcentage" || baseId === "prix-direct") {
      let mobileOff = document.getElementById(`${baseId}-mobile-off`);
      if (mobileOff) elements.push(mobileOff);
    }
    
    return elements;
  }

  static formatDateCustom(date) {
    if (!date || !moment.isMoment(date)) return '';
    const dayOfWeek = date.format('ddd').toLowerCase();
    const dayMonth = date.format('DD/MM');
    return dayOfWeek + ' ' + dayMonth;
  }
}

// Export global
window.Utils = Utils;
