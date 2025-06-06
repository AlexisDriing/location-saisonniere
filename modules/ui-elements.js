// Gestionnaire des éléments d'interface utilisateur
class UIElementsManager {
  constructor() {
    this.init();
  }

  init() {
    console.log('🎨 Initialisation UIElementsManager...');
    this.setupUIElements();
    console.log('✅ UIElementsManager initialisé');
    
    // Export global
    window.uiElementsManager = this;
  }

  setupUIElements() {
    // Créer les éléments d'interface nécessaires
    this.createPaginationContainer();
    this.createLoadingIndicator();
    this.createNoResultsMessage();
    this.createErrorMessage();
  }

  createPaginationContainer() {
    if (!document.querySelector('.custom-pagination')) {
      const collectionList = document.querySelector('.collection-list-wrapper');
      if (collectionList) {
        const paginationContainer = document.createElement('div');
        paginationContainer.className = 'custom-pagination';
        collectionList.parentNode.insertBefore(paginationContainer, collectionList.nextSibling);
        console.log('✅ Conteneur de pagination créé');
      }
    }
  }

  createLoadingIndicator() {
    if (!document.querySelector('.loading-indicator')) {
      const collectionList = document.querySelector('.collection-list-wrapper');
      if (collectionList) {
        const loadingIndicator = document.createElement('div');
        loadingIndicator.className = 'loading-indicator';
        loadingIndicator.innerHTML = '<div class="spinner"></div>';
        loadingIndicator.style.display = 'none';
        collectionList.parentNode.insertBefore(loadingIndicator, collectionList);
        console.log('✅ Indicateur de chargement créé');
      }
    }
  }

  createNoResultsMessage() {
    if (!document.querySelector('.no-results-message')) {
      const collectionList = document.querySelector('.collection-list-wrapper');
      if (collectionList) {
        const noResultsMessage = document.createElement('div');
        noResultsMessage.className = 'no-results-message';
        noResultsMessage.innerHTML = 'Aucun logement ne correspond à vos critères de recherche.<br>Essayez de modifier vos filtres.';
        noResultsMessage.style.display = 'none';
        collectionList.parentNode.insertBefore(noResultsMessage, collectionList);
        console.log('✅ Message "aucun résultat" créé');
      }
    }
  }

  createErrorMessage() {
    if (!document.querySelector('.error-message')) {
      const collectionList = document.querySelector('.collection-list-wrapper');
      if (collectionList) {
        const errorMessage = document.createElement('div');
        errorMessage.className = 'error-message';
        errorMessage.innerHTML = 'Une erreur est survenue lors du chargement des logements.<br>Veuillez réessayer ultérieurement.';
        errorMessage.style.display = 'none';
        collectionList.parentNode.insertBefore(errorMessage, collectionList);
        console.log('✅ Message d\'erreur créé');
      }
    }
  }

  // Méthodes publiques
  showLoading() {
    const loadingIndicator = document.querySelector('.loading-indicator');
    if (loadingIndicator) {
      loadingIndicator.style.display = 'flex';
    }
  }

  hideLoading() {
    const loadingIndicator = document.querySelector('.loading-indicator');
    if (loadingIndicator) {
      loadingIndicator.style.display = 'none';
    }
  }

  showNoResults() {
    const noResultsMessage = document.querySelector('.no-results-message');
    if (noResultsMessage) {
      noResultsMessage.style.display = 'block';
    }
  }

  hideNoResults() {
    const noResultsMessage = document.querySelector('.no-results-message');
    if (noResultsMessage) {
      noResultsMessage.style.display = 'none';
    }
  }

  showError() {
    const errorMessage = document.querySelector('.error-message');
    if (errorMessage) {
      errorMessage.style.display = 'block';
    }
  }

  hideError() {
    const errorMessage = document.querySelector('.error-message');
    if (errorMessage) {
      errorMessage.style.display = 'none';
    }
  }

  // Méthode pour créer un élément personnalisé
  createElement(type, className, innerHTML, parent) {
    const element = document.createElement(type);
    if (className) element.className = className;
    if (innerHTML) element.innerHTML = innerHTML;
    if (parent) parent.appendChild(element);
    return element;
  }
}

// Export global
window.UIElementsManager = UIElementsManager;
