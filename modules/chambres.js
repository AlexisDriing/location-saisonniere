// Gestion des chambres d'hotes sur la page detail logement
class ChambresManager {
  constructor() {
    this.propertyId = null;
    this.chambres = [];
    this.selectedChambres = new Set();
    this.isChambresHotes = false;
    this.chambresData = null;
    this.init();
  }

  init() {
    // Detecter si le logement est de type "Chambre d'hotes"
    const typeElement = document.querySelector('[data-mode-location]');
    if (!typeElement) return;

    const typeLogement = typeElement.getAttribute('data-mode-location');
    if (typeLogement !== "Chambre d'hôtes") return;

    this.isChambresHotes = true;

    // Recuperer l'ID du logement depuis l'URL ou le DOM
    this.propertyId = this.getPropertyId();
    if (!this.propertyId) {
      console.warn('ChambresManager: property ID non trouve');
      return;
    }

    this.loadChambres();
  }

  getPropertyId() {
    // Essayer depuis un attribut data
    const el = document.querySelector('[data-property-id]');
    if (el) return el.getAttribute('data-property-id');

    // Essayer depuis l'URL du slug + API
    const slug = window.location.pathname.split('/').filter(Boolean).pop();
    if (slug) {
      this.propertySlug = slug;
    }

    return null;
  }

  async loadChambres() {
    try {
      const apiUrl = window.CONFIG?.API_URL || 'https://ical-proxy-stdn.onrender.com';

      // Si on a un propertyId, charger directement
      let url = `${apiUrl}/property-chambres/${this.propertyId}`;

      // Ajouter les dates si disponibles
      const savedDates = localStorage.getItem('current_detail_dates');
      if (savedDates) {
        try {
          const dates = JSON.parse(savedDates);
          if (dates.startDate && dates.endDate) {
            url += `?start=${dates.startDate}&end=${dates.endDate}`;
            if (dates.adultes) url += `&adults=${dates.adultes}`;
            if (dates.adultes && dates.enfants) {
              url += `&total_guests=${dates.adultes + dates.enfants}`;
            }
          }
        } catch (e) { /* ignore */ }
      }

      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      this.chambresData = await response.json();
      this.chambres = this.chambresData.chambres || [];

      if (this.chambres.length > 0) {
        this.renderChambresSection();
        this.setupEventListeners();
      }

    } catch (error) {
      console.error('Erreur chargement chambres:', error);
    }
  }

  renderChambresSection() {
    // Trouver ou creer le container des chambres
    let container = document.querySelector('.chambres-selection-container');
    if (!container) {
      // Creer le container apres le bloc de prix ou avant le calendrier
      const insertPoint = document.querySelector('.bloc-chambres') ||
                          document.querySelector('#bloc-calcul-prix') ||
                          document.querySelector('.w-container');
      if (!insertPoint) return;

      container = document.createElement('div');
      container.className = 'chambres-selection-container';
      insertPoint.parentNode.insertBefore(container, insertPoint);
    }

    container.innerHTML = '';

    // Titre
    const title = document.createElement('h3');
    title.className = 'chambres-title';
    title.textContent = `${this.chambres.length} chambre${this.chambres.length > 1 ? 's' : ''} disponible${this.chambres.length > 1 ? 's' : ''}`;
    title.style.cssText = 'font-family: Inter, sans-serif; font-size: 20px; font-weight: 600; margin-bottom: 16px; color: #1a1a1a;';
    container.appendChild(title);

    // Sous-titre
    const subtitle = document.createElement('p');
    subtitle.className = 'chambres-subtitle';
    subtitle.textContent = 'Selectionnez les chambres souhaitees pour votre sejour';
    subtitle.style.cssText = 'font-family: Inter, sans-serif; font-size: 14px; color: #666; margin-bottom: 20px;';
    container.appendChild(subtitle);

    // Grille de chambres
    const grid = document.createElement('div');
    grid.className = 'chambres-grid';
    grid.style.cssText = 'display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px;';

    for (const chambre of this.chambres) {
      grid.appendChild(this.createChambreCard(chambre));
    }

    container.appendChild(grid);

    // Resume de la selection
    const summary = document.createElement('div');
    summary.className = 'chambres-summary';
    summary.style.cssText = 'margin-top: 20px; padding: 16px; background: #f8f9fa; border-radius: 12px; display: none;';
    summary.innerHTML = `
      <div style="font-family: Inter, sans-serif; font-size: 14px; color: #666;">
        <span class="chambres-summary-count">0 chambre(s) selectionnee(s)</span> -
        Capacite totale : <strong class="chambres-summary-capacity">0</strong> voyageur(s)
      </div>
    `;
    container.appendChild(summary);
  }

  createChambreCard(chambre) {
    const card = document.createElement('div');
    card.className = 'chambre-card';
    card.dataset.chambreId = chambre.id;
    card.style.cssText = `
      border: 2px solid #e0e0e0;
      border-radius: 12px;
      overflow: hidden;
      cursor: pointer;
      transition: border-color 0.2s, box-shadow 0.2s;
      background: white;
    `;

    // Disponibilite
    const isAvailable = chambre.is_available !== false;
    const meetsMinNights = chambre.meets_min_nights !== false;
    const canSelect = isAvailable && meetsMinNights;

    if (!canSelect) {
      card.style.opacity = '0.5';
      card.style.cursor = 'not-allowed';
    }

    // Image
    const imageUrl = chambre.image || chambre.images_gallery?.[0] || '';
    if (imageUrl) {
      const img = document.createElement('div');
      img.style.cssText = `
        width: 100%; height: 160px;
        background-image: url('${imageUrl}');
        background-size: cover; background-position: center;
      `;
      card.appendChild(img);
    }

    // Contenu
    const content = document.createElement('div');
    content.style.cssText = 'padding: 14px;';

    // Nom + checkbox
    const header = document.createElement('div');
    header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;';

    const name = document.createElement('span');
    name.style.cssText = 'font-family: Inter, sans-serif; font-size: 16px; font-weight: 600; color: #1a1a1a;';
    name.textContent = chambre.name;
    header.appendChild(name);

    if (canSelect) {
      const checkbox = document.createElement('div');
      checkbox.className = 'chambre-checkbox';
      checkbox.style.cssText = `
        width: 24px; height: 24px;
        border: 2px solid #ccc; border-radius: 6px;
        display: flex; align-items: center; justify-content: center;
        transition: all 0.2s;
      `;
      header.appendChild(checkbox);
    } else {
      const badge = document.createElement('span');
      badge.style.cssText = 'font-size: 11px; color: #e74c3c; font-weight: 500;';
      badge.textContent = !isAvailable ? 'Indisponible' : 'Sejour trop court';
      header.appendChild(badge);
    }

    content.appendChild(header);

    // Details
    const details = document.createElement('div');
    details.style.cssText = 'font-family: Inter, sans-serif; font-size: 13px; color: #666; line-height: 1.6;';
    details.innerHTML = `
      <div>${chambre.capacity} voyageur${chambre.capacity > 1 ? 's' : ''} max</div>
      ${chambre.price ? `<div style="font-weight: 600; color: #1a1a1a; font-size: 15px; margin-top: 4px;">${chambre.price}\u20AC / nuit</div>` : ''}
      ${chambre.price_details ? `<div style="color: #27ae60; font-size: 12px;">Total: ${chambre.price_details.total_price}\u20AC</div>` : ''}
    `;
    content.appendChild(details);

    // Description courte
    if (chambre.description) {
      const desc = document.createElement('p');
      desc.style.cssText = 'font-family: Inter, sans-serif; font-size: 12px; color: #999; margin-top: 8px; line-height: 1.4;';
      desc.textContent = chambre.description.substring(0, 100) + (chambre.description.length > 100 ? '...' : '');
      content.appendChild(desc);
    }

    // Equipements
    if (chambre.amenities && chambre.amenities.length > 0) {
      const amenities = document.createElement('div');
      amenities.style.cssText = 'margin-top: 8px; display: flex; flex-wrap: wrap; gap: 4px;';
      chambre.amenities.slice(0, 4).forEach(a => {
        const tag = document.createElement('span');
        tag.style.cssText = 'font-size: 11px; background: #f0f0f0; padding: 2px 8px; border-radius: 4px; color: #555;';
        tag.textContent = a;
        amenities.appendChild(tag);
      });
      content.appendChild(amenities);
    }

    card.appendChild(content);

    return card;
  }

  setupEventListeners() {
    // Click sur les cartes de chambres
    document.querySelectorAll('.chambre-card').forEach(card => {
      if (card.style.opacity === '0.5') return; // Non selectionnable

      card.addEventListener('click', () => {
        const chambreId = card.dataset.chambreId;
        this.toggleChambre(chambreId, card);
      });
    });
  }

  toggleChambre(chambreId, cardElement) {
    if (this.selectedChambres.has(chambreId)) {
      this.selectedChambres.delete(chambreId);
      cardElement.style.borderColor = '#e0e0e0';
      cardElement.style.boxShadow = 'none';
      const cb = cardElement.querySelector('.chambre-checkbox');
      if (cb) {
        cb.style.background = 'white';
        cb.style.borderColor = '#ccc';
        cb.innerHTML = '';
      }
    } else {
      this.selectedChambres.add(chambreId);
      cardElement.style.borderColor = '#2c3e50';
      cardElement.style.boxShadow = '0 0 0 1px #2c3e50';
      const cb = cardElement.querySelector('.chambre-checkbox');
      if (cb) {
        cb.style.background = '#2c3e50';
        cb.style.borderColor = '#2c3e50';
        cb.innerHTML = '<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 7l3 3 5-5" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      }
    }

    this.updateSelection();
  }

  updateSelection() {
    // Mettre a jour le resume
    const summary = document.querySelector('.chambres-summary');
    if (!summary) return;

    const count = this.selectedChambres.size;
    if (count === 0) {
      summary.style.display = 'none';
      this.notifySelectionChange();
      return;
    }

    summary.style.display = 'block';

    // Calculer la capacite totale des chambres selectionnees
    let totalCapacity = 0;
    for (const id of this.selectedChambres) {
      const chambre = this.chambres.find(c => c.id === id);
      if (chambre) totalCapacity += chambre.capacity;
    }

    summary.querySelector('.chambres-summary-count').textContent =
      `${count} chambre${count > 1 ? 's' : ''} selectionnee${count > 1 ? 's' : ''}`;
    summary.querySelector('.chambres-summary-capacity').textContent = String(totalCapacity);

    this.notifySelectionChange();
  }

  notifySelectionChange() {
    // Declencher un evenement custom pour que les autres managers reagissent
    const event = new CustomEvent('chambres-selection-changed', {
      detail: {
        selectedChambres: Array.from(this.selectedChambres),
        chambresData: this.getSelectedChambresData(),
        totalCapacity: this.getSelectedTotalCapacity(),
        totalPrice: this.getSelectedTotalPrice()
      }
    });
    window.dispatchEvent(event);
  }

  getSelectedChambresData() {
    return this.chambres.filter(c => this.selectedChambres.has(c.id));
  }

  getSelectedTotalCapacity() {
    return this.getSelectedChambresData().reduce((sum, c) => sum + c.capacity, 0);
  }

  getSelectedTotalPrice() {
    return this.getSelectedChambresData().reduce((sum, c) => sum + (c.price || 0), 0);
  }

  // Retourne les periodes d'indisponibilite (intersection) des chambres selectionnees
  getSelectedUnavailableDates() {
    const selected = this.getSelectedChambresData();
    if (selected.length === 0) return new Set();

    // Collecter toutes les dates indisponibles pour chaque chambre selectionnee
    // Une date est indisponible SI TOUTES les chambres selectionnees sont indisponibles ce jour-la
    // Pour le calendrier: bloquer une date si au moins UNE chambre selectionnee est indisponible
    const unavailableSets = selected.map(chambre => {
      const dates = new Set();
      if (chambre.unavailable_periods) {
        for (const period of chambre.unavailable_periods) {
          // Convertir YYYYMMDD en dates individuelles
          let current = this.parseICalDate(period.start);
          const end = this.parseICalDate(period.end);
          while (current <= end) {
            dates.add(current.toISOString().split('T')[0]);
            current.setDate(current.getDate() + 1);
          }
        }
      }
      return dates;
    });

    // Union de toutes les dates indisponibles (une date est bloquee si UNE chambre selectionnee est indispo)
    const allUnavailable = new Set();
    for (const dateSet of unavailableSets) {
      for (const d of dateSet) {
        allUnavailable.add(d);
      }
    }

    return allUnavailable;
  }

  parseICalDate(dateStr) {
    // YYYYMMDD -> Date
    const year = parseInt(dateStr.substring(0, 4), 10);
    const month = parseInt(dateStr.substring(4, 6), 10) - 1;
    const day = parseInt(dateStr.substring(6, 8), 10);
    return new Date(year, month, day);
  }
}

// Export global
window.ChambresManager = ChambresManager;
