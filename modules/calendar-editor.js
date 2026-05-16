// LOG production V1.01
// Module : gestion du calendrier de blocage manuel des dates (tab Calendrier)
// Instancié par PropertyEditor pour les logements ET les chambres
class CalendarEditor {
  static MONTH_NAMES = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
  static WEEKDAYS_SHORT = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];
  static CSS_INJECTED = false;

  constructor(options = {}) {
    this.containerSelector = options.containerSelector;
    this.propertyId = options.propertyId || null;
    this.isRoom = !!options.isRoom;
    this.roomId = options.roomId || null;
    this.icalExportUrl = options.icalExportUrl || '';
    this.onChange = options.onChange || (() => {});

    this.container = null;
    this.blockedDates = new Set();       // dates manuelles courantes "YYYY-MM-DD"
    this.initialBlockedDates = new Set(); // baseline pour hasChanges/restore
    this.externalDates = new Map();      // "YYYY-MM-DD" → "Source"

    const today = new Date();
    this.today = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    this.currentMonth = new Date(this.today.getFullYear(), this.today.getMonth(), 1);
    this.maxMonth = new Date(this.today.getFullYear() + 2, this.today.getMonth(), 1);

    // Drag state
    this.isDragging = false;
    this.dragStartDate = null;
    this.dragAction = null;
    this.dragSelection = new Set();

    this._boundMouseDown = null;
    this._boundMouseMove = null;
    this._boundMouseUp = null;
    this._boundTouchStart = null;
    this._boundTouchMove = null;
    this._boundTouchEnd = null;
  }

  // ===== API publique =====

  init(data) {
    this.container = document.querySelector(this.containerSelector);
    if (!this.container) {
      console.error('[calendar-editor] Container introuvable:', this.containerSelector);
      return;
    }
    this.setData(data);
    this.injectStyles();
    this.buildDOM();
    this.render();
    this.setupInteractions();
    this.setupExportBlock();
  }

  setData(data) {
    const ranges = (data && Array.isArray(data.blockedDates)) ? data.blockedDates : [];
    this.blockedDates = this.rangesToSet(ranges);
    this.initialBlockedDates = new Set(this.blockedDates);

    const ext = (data && data.externalDates && typeof data.externalDates === 'object') ? data.externalDates : {};
    this.externalDates = new Map(Object.entries(ext));

    if (data && data.icalExportUrl) {
      this.icalExportUrl = data.icalExportUrl;
    }
  }

  getBlockedDatesJson() {
    const ranges = this.setToRanges(this.blockedDates);
    return JSON.stringify(ranges);
  }

  hasChanges() {
    if (this.blockedDates.size !== this.initialBlockedDates.size) return true;
    for (const d of this.blockedDates) {
      if (!this.initialBlockedDates.has(d)) return true;
    }
    return false;
  }

  restoreInitialState() {
    this.blockedDates = new Set(this.initialBlockedDates);
    this.render();
  }

  commitChanges() {
    this.initialBlockedDates = new Set(this.blockedDates);
    this.render();
  }

    destroy() {
    if (this.container) {
      if (this._boundMouseDown) this.container.removeEventListener('mousedown', this._boundMouseDown);
      if (this._boundTouchStart) this.container.removeEventListener('touchstart', this._boundTouchStart);
    }
    if (this._boundMouseMove) document.removeEventListener('mousemove', this._boundMouseMove);
    if (this._boundMouseUp) document.removeEventListener('mouseup', this._boundMouseUp);
    if (this._boundTouchMove) document.removeEventListener('touchmove', this._boundTouchMove);
    if (this._boundTouchEnd) document.removeEventListener('touchend', this._boundTouchEnd);
    if (this.container) this.container.innerHTML = '';
  }

  // ===== Helpers internes =====

  rangesToSet(ranges) {
    const set = new Set();
    for (const r of ranges) {
      if (!r || !r.s || !r.e) continue;
      const cursor = new Date(r.s + 'T00:00:00');
      const end = new Date(r.e + 'T00:00:00');
      while (cursor <= end) {
        set.add(this.fmtKey(cursor));
        cursor.setDate(cursor.getDate() + 1);
      }
    }
    return set;
  }

  setToRanges(set) {
    const dates = Array.from(set).sort();
    if (dates.length === 0) return [];
    const ranges = [];
    let start = dates[0];
    let prev = dates[0];
    for (let i = 1; i < dates.length; i++) {
      const cur = dates[i];
      const prevDate = new Date(prev + 'T00:00:00');
      prevDate.setDate(prevDate.getDate() + 1);
      const expected = this.fmtKey(prevDate);
      if (cur === expected) {
        prev = cur;
      } else {
        ranges.push({ s: start, e: prev });
        start = cur;
        prev = cur;
      }
    }
    ranges.push({ s: start, e: prev });
    return ranges;
  }

  fmtKey(date) {
    return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
  }

  isPast(date) {
    return date.getTime() < this.today.getTime();
  }

  isInteractable(dateKey) {
    if (!dateKey) return false;
    if (this.externalDates.has(dateKey)) return false;
    const [y, m, d] = dateKey.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    if (this.isPast(dt)) return false;
    return true;
  }

  // ===== Rendu =====

  injectStyles() {
    if (CalendarEditor.CSS_INJECTED) return;
    const style = document.createElement('style');
    style.id = 'calendar-editor-styles';
        style.textContent = `
.cale-wrap {
  --cale-primary: #235B59;
  --cale-primary-hover: #1a4544;
  --cale-select-bg: #EDF1F0;
  --cale-select-text: #235B59;
  --cale-closed-bg: #FDE7E7;
  --cale-closed-text: #B34040;
  --cale-closed-line: #B34040;
  --cale-external-bg-1: #E3E3E7;
  --cale-external-bg-2: #F0F0F3;
  --cale-external-text: #7A7A7A;
  --cale-text: #1A1A1A;
  --cale-text-soft: #6A6A6A;
  --cale-text-muted: #C8C8CC;
  --cale-border: #E8E8EB;
  font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, sans-serif;
  color: var(--cale-text);
}
.cale-helper { background: #FEFAEE; border: 1px solid #F5E8B8; border-radius: 10px; padding: 14px 16px; font-size: 13px; line-height: 1.6; margin-bottom: 20px; color: #6B5400; }
.cale-helper strong { color: #4A3A00; }
.cale-legend { display: flex; flex-wrap: wrap; gap: 14px 22px; align-items: center; padding: 14px 16px; background: #FAFAFB; border: 1px solid #ECECEF; border-radius: 12px; margin-bottom: 20px; font-size: 13px; }
.cale-legend-item { display: flex; align-items: center; gap: 8px; }
.cale-legend-swatch { width: 18px; height: 18px; border-radius: 5px; border: 1px solid #E0E0E3; flex-shrink: 0; }
.cale-legend-swatch.libre { background: #fff; }
.cale-legend-swatch.ferme { background: var(--cale-closed-bg); border-color: #F5B8B8; position: relative; }
.cale-legend-swatch.ferme::after { content: ""; position: absolute; inset: 0; background: linear-gradient(135deg, transparent calc(50% - 1px), var(--cale-closed-line) calc(50% - 1px), var(--cale-closed-line) calc(50% + 1px), transparent calc(50% + 1px)); opacity: 0.4; border-radius: 4px; }
.cale-legend-swatch.externe { background-image: repeating-linear-gradient(45deg, var(--cale-external-bg-1) 0 4px, var(--cale-external-bg-2) 4px 8px); }
.cale-legend-swatch.passe { background: #F4F4F6; opacity: 0.6; }
.cale-legend-swatch.today { background: #fff; border: 2px solid var(--cale-primary); }
.cale-nav { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; gap: 12px; }
.cale-nav-btn { width: 36px; height: 36px; border: 1px solid var(--cale-border); background: #fff; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.15s, border-color 0.15s, transform 0.05s; color: var(--cale-text); flex-shrink: 0; padding: 0; }
.cale-nav-btn:hover:not(:disabled) { background: #f4f4f6; border-color: #d4d4d8; }
.cale-nav-btn:active:not(:disabled) { transform: scale(0.92); }
.cale-nav-btn:disabled { opacity: 0.3; cursor: not-allowed; }
.cale-nav-btn svg { width: 14px; height: 14px; }
.cale-nav-titles { display: flex; flex: 1; justify-content: space-around; gap: 32px; }
.cale-nav-title { font-size: 16px; font-weight: 600; text-transform: capitalize; text-align: center; flex: 1; }
.cale-months { display: grid; grid-template-columns: repeat(2, 1fr); gap: 32px; }
.cale-month-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; }
.cale-weekday { text-align: center; font-size: 11px; font-weight: 500; color: #8A8A8A; padding: 6px 0; text-transform: uppercase; letter-spacing: 0.5px; }
.cale-day { aspect-ratio: 1; display: flex; align-items: center; justify-content: center; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; position: relative; transition: background 0.12s, color 0.12s, transform 0.05s; user-select: none; -webkit-user-select: none; }
.cale-day:hover:not(.cale-day--passe):not(.cale-day--externe):not(.cale-day--empty) { background: #F0F0F3; }
.cale-day--empty { cursor: default; }
.cale-day--passe { color: var(--cale-text-muted); cursor: not-allowed; text-decoration: line-through; text-decoration-thickness: 1px; }
.cale-day--today { border: 2px solid var(--cale-primary); font-weight: 700; color: var(--cale-primary); }
.cale-day--ferme { background: var(--cale-closed-bg); color: var(--cale-closed-text); }
.cale-day--ferme::after { content: ""; position: absolute; left: 8px; right: 8px; top: 50%; height: 1.5px; background: var(--cale-closed-line); opacity: 0.55; transform: rotate(-12deg); }
.cale-day--ferme:hover { background: #FBD4D4; }
.cale-day--externe { background-image: repeating-linear-gradient(45deg, var(--cale-external-bg-1) 0 5px, var(--cale-external-bg-2) 5px 10px); color: var(--cale-external-text); cursor: help; }
.cale-day--externe .cale-lock { position: absolute; top: 4px; right: 5px; width: 9px; height: 9px; opacity: 0.55; }
.cale-day--externe:hover .cale-tooltip { opacity: 1; transform: translateX(-50%) translateY(-4px); pointer-events: none; }
.cale-tooltip { position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%) translateY(4px); background: #1A1A1A; color: #fff; font-size: 11px; font-weight: 500; padding: 6px 10px; border-radius: 6px; white-space: nowrap; opacity: 0; transition: opacity 0.15s, transform 0.15s; z-index: 10; }
.cale-tooltip::after { content: ""; position: absolute; top: 100%; left: 50%; margin-left: -4px; border: 4px solid transparent; border-top-color: #1A1A1A; }
.cale-day--selecting { background: var(--cale-select-bg) !important; color: var(--cale-select-text) !important; }
.cale-day--selecting::after { display: none !important; }
@media (max-width: 720px) {
  .cale-months { grid-template-columns: 1fr; gap: 0; }
  .cale-nav-titles { gap: 0; }
  .cale-nav-title { font-size: 15px; }
  .cale-nav-title.cale-nav-title--second { display: none; }
  .cale-month-container--second { display: none; }
  .cale-day { font-size: 13px; }
}
`;
    document.head.appendChild(style);
    CalendarEditor.CSS_INJECTED = true;
  }

  buildDOM() {
    this.container.innerHTML = `
      <div class="cale-wrap">
        <div class="cale-helper">
          <strong>💡 Comment ça marche</strong> — Cliquez sur une date pour la fermer (rouge). Cliquez à nouveau pour la rouvrir. Cliquez et glissez pour appliquer l'action à une plage entière. Les dates rayées grises sont verrouillées car réservées sur une plateforme externe.
        </div>
        <div class="cale-legend">
          <div class="cale-legend-item"><div class="cale-legend-swatch libre"></div>Disponible</div>
          <div class="cale-legend-item"><div class="cale-legend-swatch ferme"></div>Fermée manuellement</div>
          <div class="cale-legend-item"><div class="cale-legend-swatch externe"></div>Réservée sur une plateforme</div>
          <div class="cale-legend-item"><div class="cale-legend-swatch passe"></div>Passée</div>
          <div class="cale-legend-item"><div class="cale-legend-swatch today"></div>Aujourd'hui</div>
        </div>
        <div class="cale-nav">
          <button class="cale-nav-btn" data-action="prev" aria-label="Mois précédent" type="button">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <div class="cale-nav-titles">
            <div class="cale-nav-title cale-nav-title--first" data-role="title-1">—</div>
            <div class="cale-nav-title cale-nav-title--second" data-role="title-2">—</div>
          </div>
          <button class="cale-nav-btn" data-action="next" aria-label="Mois suivant" type="button">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>
        <div class="cale-months">
          <div class="cale-month-container cale-month-container--first">
            <div class="cale-month-grid">
              <div class="cale-weekday">Lun</div><div class="cale-weekday">Mar</div><div class="cale-weekday">Mer</div><div class="cale-weekday">Jeu</div><div class="cale-weekday">Ven</div><div class="cale-weekday">Sam</div><div class="cale-weekday">Dim</div>
            </div>
            <div class="cale-month-grid" data-role="grid-1"></div>
          </div>
          <div class="cale-month-container cale-month-container--second">
            <div class="cale-month-grid">
              <div class="cale-weekday">Lun</div><div class="cale-weekday">Mar</div><div class="cale-weekday">Mer</div><div class="cale-weekday">Jeu</div><div class="cale-weekday">Ven</div><div class="cale-weekday">Sam</div><div class="cale-weekday">Dim</div>
            </div>
            <div class="cale-month-grid" data-role="grid-2"></div>
          </div>
        </div>
      </div>
    `;
    const prevBtn = this.container.querySelector('[data-action="prev"]');
    const nextBtn = this.container.querySelector('[data-action="next"]');
    prevBtn.addEventListener('click', () => {
      this.currentMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() - 1, 1);
      this.render();
    });
    nextBtn.addEventListener('click', () => {
      this.currentMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() + 1, 1);
      this.render();
    });
  }

  renderMonth(grid, year, month) {
    grid.innerHTML = '';
    const firstDay = new Date(year, month, 1);
    const offset = (firstDay.getDay() + 6) % 7; // Lun=0
    for (let i = 0; i < offset; i++) {
      const empty = document.createElement('div');
      empty.className = 'cale-day cale-day--empty';
      grid.appendChild(empty);
    }
    const lastDay = new Date(year, month + 1, 0).getDate();
    for (let d = 1; d <= lastDay; d++) {
      const date = new Date(year, month, d);
      const key = this.fmtKey(date);
      const cell = document.createElement('div');
      cell.className = 'cale-day';
      cell.dataset.date = key;
      cell.textContent = String(d);

      if (this.isPast(date)) cell.classList.add('cale-day--passe');
      if (date.getTime() === this.today.getTime()) cell.classList.add('cale-day--today');

      if (this.externalDates.has(key)) {
        cell.classList.add('cale-day--externe');
        const lock = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        lock.setAttribute('class', 'cale-lock');
        lock.setAttribute('viewBox', '0 0 24 24');
        lock.setAttribute('fill', 'currentColor');
        lock.innerHTML = '<path d="M12 2a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5zm-3 8V7a3 3 0 0 1 6 0v3H9z"/>';
        cell.appendChild(lock);
        const tip = document.createElement('span');
        tip.className = 'cale-tooltip';
        tip.textContent = 'Réservé via ' + this.externalDates.get(key);
        cell.appendChild(tip);
      } else if (this.blockedDates.has(key) && !this.isPast(date)) {
        cell.classList.add('cale-day--ferme');
      }

      if (this.dragSelection.has(key)) cell.classList.add('cale-day--selecting');

      grid.appendChild(cell);
    }
  }

  render() {
    if (!this.container) return;
    const y1 = this.currentMonth.getFullYear();
    const m1 = this.currentMonth.getMonth();
    const next = new Date(y1, m1 + 1, 1);
    const y2 = next.getFullYear();
    const m2 = next.getMonth();

    this.container.querySelector('[data-role="title-1"]').textContent = CalendarEditor.MONTH_NAMES[m1] + ' ' + y1;
    this.container.querySelector('[data-role="title-2"]').textContent = CalendarEditor.MONTH_NAMES[m2] + ' ' + y2;

    this.renderMonth(this.container.querySelector('[data-role="grid-1"]'), y1, m1);
    this.renderMonth(this.container.querySelector('[data-role="grid-2"]'), y2, m2);

    const prevBtn = this.container.querySelector('[data-action="prev"]');
    const nextBtn = this.container.querySelector('[data-action="next"]');
    prevBtn.disabled = (this.currentMonth.getFullYear() === this.today.getFullYear() && this.currentMonth.getMonth() === this.today.getMonth());
    nextBtn.disabled = (next.getFullYear() > this.maxMonth.getFullYear()) || (next.getFullYear() === this.maxMonth.getFullYear() && next.getMonth() > this.maxMonth.getMonth());
  }

  // ===== Interactions (souris + tactile) =====

  setupInteractions() {
    this._boundMouseDown = (e) => {
      if (e.button !== 0) return;
      const k = this.getDateFromEvent(e);
      if (!k || !this.isInteractable(k)) return;
      e.preventDefault();
      this.startDrag(k);
    };
    this._boundMouseMove = (e) => {
      if (!this.isDragging) return;
      const k = this.getDateFromEvent(e);
      if (k) this.extendDrag(k);
    };
    this._boundMouseUp = () => {
      if (this.isDragging) this.endDrag();
    };
    this._boundTouchStart = (e) => {
      const k = this.getDateFromEvent(e);
      if (!k || !this.isInteractable(k)) return;
      this.startDrag(k);
    };
    this._boundTouchMove = (e) => {
      if (!this.isDragging) return;
      const k = this.getDateFromEvent(e);
      if (k) {
        this.extendDrag(k);
        e.preventDefault();
      }
    };
    this._boundTouchEnd = () => {
      if (this.isDragging) this.endDrag();
    };

        // mousedown / touchstart : uniquement sur le container (on ne peut démarrer un drag que dans la grille)
    this.container.addEventListener('mousedown', this._boundMouseDown);
    this.container.addEventListener('touchstart', this._boundTouchStart, { passive: true });
    // mousemove / mouseup / touchmove / touchend : sur document (pour suivre le drag même hors zone)
    document.addEventListener('mousemove', this._boundMouseMove);
    document.addEventListener('mouseup', this._boundMouseUp);
    document.addEventListener('touchmove', this._boundTouchMove, { passive: false });
    document.addEventListener('touchend', this._boundTouchEnd);
  }

  getDateFromEvent(e) {
    let target;
    if (e.touches && e.touches.length) {
      const t = e.touches[0];
      target = document.elementFromPoint(t.clientX, t.clientY);
    } else if (e.changedTouches && e.changedTouches.length) {
      const t = e.changedTouches[0];
      target = document.elementFromPoint(t.clientX, t.clientY);
    } else {
      target = e.target;
    }
    while (target && !(target.classList && target.classList.contains('cale-day'))) target = target.parentElement;
    if (!target) return null;
    if (!this.container.contains(target)) return null;
    return target.dataset.date || null;
  }

  startDrag(dateKey) {
    if (!this.isInteractable(dateKey)) return;
    this.isDragging = true;
    this.dragStartDate = dateKey;
    this.dragAction = this.blockedDates.has(dateKey) ? 'open' : 'close';
    this.dragSelection = new Set([dateKey]);
    this.render();
  }

  extendDrag(dateKey) {
    if (!this.isDragging || !dateKey) return;
    const [y1, m1, d1] = this.dragStartDate.split('-').map(Number);
    const [y2, m2, d2] = dateKey.split('-').map(Number);
    let start = new Date(y1, m1 - 1, d1);
    let end = new Date(y2, m2 - 1, d2);
    if (end < start) { const t = start; start = end; end = t; }
    this.dragSelection = new Set();
    const cursor = new Date(start);
    while (cursor <= end) {
      const k = this.fmtKey(cursor);
      if (this.isInteractable(k)) this.dragSelection.add(k);
      cursor.setDate(cursor.getDate() + 1);
    }
    this.render();
  }

  endDrag() {
    if (!this.isDragging) return;
    for (const k of this.dragSelection) {
      if (this.dragAction === 'close') this.blockedDates.add(k);
      else this.blockedDates.delete(k);
    }
    this.isDragging = false;
    this.dragStartDate = null;
    this.dragAction = null;
    this.dragSelection = new Set();
    this.render();
    if (this.onChange) {
      try { this.onChange(this.hasChanges()); } catch (e) { console.error('[calendar-editor] onChange error:', e); }
    }
  }

  // ===== Bloc URL d'export iCal driing =====

  setupExportBlock() {
    const urlInput = document.getElementById('ical-export-url');
    const copyBtn = document.getElementById('ical-export-copy-btn');
    if (urlInput) {
      urlInput.value = this.icalExportUrl || '';
      urlInput.readOnly = true;
    }
    if (copyBtn) {
      const newBtn = copyBtn.cloneNode(true);
      copyBtn.parentNode.replaceChild(newBtn, copyBtn);
      const originalLabel = newBtn.textContent;
      newBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        if (!this.icalExportUrl) return;
        try {
          await navigator.clipboard.writeText(this.icalExportUrl);
          newBtn.textContent = '✓ Copié';
          setTimeout(() => { newBtn.textContent = originalLabel; }, 1800);
        } catch (err) {
          if (urlInput) { urlInput.select(); document.execCommand('copy'); }
        }
      });
    }
  }
}

window.CalendarEditor = CalendarEditor;
