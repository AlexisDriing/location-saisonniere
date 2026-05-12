// Helper Memberstack v2 — fournit le token et les headers Authorization à utiliser pour tous les fetch backend
window.AuthHelper = {
  _ready: false,

  // À appeler UNE FOIS au démarrage de la page (avant les premiers fetchs protégés)
  async init() {
    if (this._ready) return;
    await new Promise((resolve) => {
      const startTime = Date.now();
      const check = () => {
        if (window.$memberstackDom) {
          this._ready = true;
          resolve();
        } else if (Date.now() - startTime > 5000) {
          console.warn('⚠️ Memberstack non chargé après 5s, on continue sans');
          resolve(); // on résout sans bloquer pour éviter une page figée
        } else {
          setTimeout(check, 100);
        }
      };
      check();
    });
  },

  // Récupère le token JWT Memberstack (méthode officielle documentée)
  getToken() {
    if (!window.$memberstackDom) return null;
    try {
      return window.$memberstackDom.getMemberCookie() || null;
    } catch (err) {
      console.error('❌ Token Memberstack indisponible:', err);
      return null;
    }
  },

  // Construit les headers HTTP avec l'Authorization Bearer (ajoute aux headers existants)
  getAuthHeaders(extraHeaders = {}) {
    const token = this.getToken();
    return {
      ...extraHeaders,
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
  }
};

// Auto-init au chargement (les modules peuvent quand même await pour être sûr)
window.AuthHelper.init();
