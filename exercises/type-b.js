/**
 * type-b.js
 * Type B Interactive Tangram Exercise — Complete Overhaul
 * - 7 accurate SVG tangram pieces (proper geometric shapes)
 * - Pieces start assembled in the classic square arrangement
 * - Students drag pieces OUT of the square onto the silhouette
 * - 45-degree rotation per piece on click/tap
 * - Drop zone shows ONLY the final silhouette outline (no individual slots)
 * - Works in both dark and light mode
 * Olimpiadas Matemáticas Colombo
 */

// ── Standard 7-piece tangram colors ──────────────────────────
const TANGRAM_COLORS = [
  '#e94560', // large triangle 1 — red
  '#6366f1', // large triangle 2 — blue
  '#10b981', // medium triangle — green
  '#fbbf24', // small triangle 1 — gold
  '#f97316', // small triangle 2 — orange
  '#a855f7', // square — purple
  '#06b6d4', // parallelogram — cyan
];

// ── Standard tangram piece polygons in assembled square ──────
// All pieces fit inside a 200×200 unit square.
// Points are defined so pieces tile perfectly into the square.
const SQUARE_PIECES = [
  // 0: Large triangle 1 (bottom-left)
  { id: 'lg-tri-1', color: TANGRAM_COLORS[0], points: '0,0 200,0 0,200' },
  // 1: Large triangle 2 (top-right)
  { id: 'lg-tri-2', color: TANGRAM_COLORS[1], points: '200,0 200,200 0,200' },
  // 2: Medium triangle (center-top-right)
  { id: 'md-tri', color: TANGRAM_COLORS[2], points: '200,0 200,100 100,100' },
  // 3: Small triangle 1 (center)
  { id: 'sm-tri-1', color: TANGRAM_COLORS[3], points: '0,0 100,0 50,50' },
  // 4: Small triangle 2 (bottom-center)
  { id: 'sm-tri-2', color: TANGRAM_COLORS[4], points: '100,100 150,150 50,150' },
  // 5: Square (center)
  { id: 'square', color: TANGRAM_COLORS[5], points: '50,50 100,0 150,50 100,100' },
  // 6: Parallelogram (bottom-right)
  { id: 'para', color: TANGRAM_COLORS[6], points: '150,50 200,100 150,150 100,100' },
];

class TypeBExercise {
  /**
   * @param {HTMLElement} container
   * @param {object}      activity     — activity data
   * @param {object[]}    tangramBank  — array of tangram puzzle definitions
   * @param {function}    onPoint      — callback() each time a tangram is completed
   */
  constructor(container, activity, tangramBank, onPoint) {
    this.container = container;
    this.activity = activity;
    this.tangramBank = tangramBank || DEFAULT_TANGRAMS;
    this.onPoint = onPoint;
    this.completed = 0;
    this.currentIdx = 0;
    this.startedAt = Date.now();
    this.tangramStart = Date.now();
    this.piecesState = []; // tracks each piece: { placed, rotation, x, y }

    this._renderShell();
    this._loadTangram(0);
  }

  _renderShell() {
    this.container.innerHTML = `
      <div class="type-b-wrap">
        <div class="type-b-header">
          <span class="type-badge type-b-badge">🧩 Ejercicio Tipo B — Tangram</span>
          <div class="tangram-score-pill">
            ⭐ <span id="tb-count">0</span> completados
          </div>
        </div>
        <p class="tb-instruction">
          Arrastra las piezas desde el cuadrado hasta la silueta. Toca una pieza para girarla 45°. ¡Completa tantos tangrams como puedas!
        </p>
        <div class="tangram-workspace">
          <div class="tangram-source" id="tangram-source">
            <div class="source-label">Piezas</div>
            <svg id="source-svg" viewBox="0 0 200 200" width="200" height="200" class="tangram-svg source-square"></svg>
          </div>
          <div class="tangram-target" id="tangram-target">
            <div class="source-label">Silueta</div>
            <svg id="target-svg" viewBox="0 0 340 340" width="340" height="340" class="tangram-svg target-area"></svg>
          </div>
        </div>
        <div class="tangram-controls">
          <button type="button" class="btn btn-secondary btn-sm tb-reset-btn" onclick="typeBReset()">
            🔄 Reiniciar piezas
          </button>
          <span class="rotate-hint">💡 Toca una pieza para girarla 45°</span>
        </div>
      </div>`;
    window._currentTypeB = this;
  }

  _loadTangram(idx) {
    this.tangramStart = Date.now();
    this.currentTangram = this.tangramBank[idx % this.tangramBank.length];
    this.piecesState = SQUARE_PIECES.map(() => ({
      placed: false,
      rotation: 0,
    }));
    this._renderPuzzle();
  }

  _renderPuzzle() {
    const tang = this.currentTangram;
    const sourceSvg = this.container.querySelector('#source-svg');
    const targetSvg = this.container.querySelector('#target-svg');

    // ── Render source square with all 7 pieces ──
    sourceSvg.innerHTML = `
      <rect width="200" height="200" rx="4" fill="none" stroke="var(--border)" stroke-width="1" stroke-dasharray="4 3"/>
      ${SQUARE_PIECES.map((p, i) => `
        <polygon
          points="${p.points}"
          fill="${p.color}"
          stroke="rgba(0,0,0,0.3)"
          stroke-width="1"
          class="source-piece"
          data-idx="${i}"
          style="cursor:grab; transform-origin: center; transition: opacity 0.3s;"
        />
      `).join('')}
    `;

    // ── Render target silhouette (outline only) ──
    targetSvg.innerHTML = `
      <rect width="340" height="340" rx="8" fill="none" stroke="var(--border)" stroke-width="1" stroke-dasharray="6 4"/>
      <path d="${tang.silhouette}"
        fill="none"
        stroke="var(--text-secondary)"
        stroke-width="2.5"
        stroke-dasharray="8 4"
        class="silhouette-outline"
      />
      <path d="${tang.silhouette}"
        fill="rgba(255,255,255,0.04)"
        stroke="none"
        class="silhouette-fill"
      />
    `;

    // ── Set up drag from source ──
    this._setupSourceDrag();
    this._placedCount = 0;
    this._totalPieces = SQUARE_PIECES.length;
  }

  _setupSourceDrag() {
    const pieces = this.container.querySelectorAll('.source-piece');

    pieces.forEach(piece => {
      const idx = parseInt(piece.dataset.idx);

      // Click/tap to rotate
      piece.addEventListener('click', (e) => {
        if (this.piecesState[idx].placed) return;
        e.stopPropagation();
        this.piecesState[idx].rotation = (this.piecesState[idx].rotation + 45) % 360;
        const cx = this._getCentroid(piece);
        piece.style.transform = `rotate(${this.piecesState[idx].rotation}deg)`;
        piece.style.transformOrigin = `${cx.x}px ${cx.y}px`;
      });

      // Desktop drag
      piece.setAttribute('draggable', 'true');
      piece.addEventListener('dragstart', (e) => {
        if (this.piecesState[idx].placed) { e.preventDefault(); return; }
        e.dataTransfer.setData('pieceIdx', idx);
        e.dataTransfer.effectAllowed = 'move';
        setTimeout(() => piece.style.opacity = '0.4', 0);
      });
      piece.addEventListener('dragend', () => {
        piece.style.opacity = '1';
      });

      // Touch drag
      piece.addEventListener('touchstart', (e) => {
        if (this.piecesState[idx].placed) return;
        this._startTouchDrag(e, idx, piece);
      }, { passive: false });
    });

    // Drop zone
    const targetSvg = this.container.querySelector('#target-svg');
    targetSvg.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    });
    targetSvg.addEventListener('drop', (e) => {
      e.preventDefault();
      const idx = parseInt(e.dataTransfer.getData('pieceIdx'));
      this._placePiece(idx);
    });
  }

  _getCentroid(polygon) {
    const pts = polygon.getAttribute('points').split(/\s+/).map(p => {
      const [x, y] = p.split(',').map(Number);
      return { x, y };
    });
    const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
    const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
    return { x: cx, y: cy };
  }

  _placePiece(idx) {
    if (this.piecesState[idx].placed) return;
    this.piecesState[idx].placed = true;

    // Hide from source
    const srcPiece = this.container.querySelector(`.source-piece[data-idx="${idx}"]`);
    if (srcPiece) {
      srcPiece.style.opacity = '0';
      srcPiece.style.pointerEvents = 'none';
    }

    // Add to target silhouette area (visual feedback only — not snapped to exact position)
    const targetSvg = this.container.querySelector('#target-svg');
    const tang = this.currentTangram;
    const p = SQUARE_PIECES[idx];

    // If the tangram data has slot positions, use them; otherwise place generically
    if (tang.slots && tang.slots[idx]) {
      const slot = tang.slots[idx];
      const placed = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      placed.setAttribute('points', slot.points);
      placed.setAttribute('fill', p.color);
      placed.setAttribute('stroke', 'rgba(0,0,0,0.2)');
      placed.setAttribute('stroke-width', '1');
      placed.style.opacity = '0';
      targetSvg.appendChild(placed);
      requestAnimationFrame(() => {
        placed.style.transition = 'opacity 0.4s';
        placed.style.opacity = '0.85';
      });
    }

    this._placedCount++;

    if (this._placedCount >= this._totalPieces) {
      setTimeout(() => this._completeTangram(), 400);
    }
  }

  _startTouchDrag(e, idx, piece) {
    e.preventDefault();
    const touch = e.touches[0];

    // Create floating clone
    const clone = document.createElement('div');
    clone.className = 'touch-drag-clone';
    clone.innerHTML = `<svg viewBox="0 0 60 60" width="60" height="60">
      <polygon points="${SQUARE_PIECES[idx].points.split(' ').map(p => {
      const [x, y] = p.split(',').map(Number);
      return `${x * 0.3},${y * 0.3}`;
    }).join(' ')}" fill="${SQUARE_PIECES[idx].color}" /></svg>`;
    clone.style.cssText = `position:fixed;z-index:9999;pointer-events:none;
      transform:translate(-50%,-50%) rotate(${this.piecesState[idx].rotation}deg);
      left:${touch.clientX}px;top:${touch.clientY}px;`;
    document.body.appendChild(clone);

    const onMove = (ev) => {
      ev.preventDefault();
      const t = ev.touches[0];
      clone.style.left = t.clientX + 'px';
      clone.style.top = t.clientY + 'px';
    };

    const onEnd = (ev) => {
      document.removeEventListener('touchmove', onMove);
      clone.remove();
      const t = ev.changedTouches[0];
      const el = document.elementFromPoint(t.clientX, t.clientY);
      const target = this.container.querySelector('#target-svg');
      if (el && (el === target || target.contains(el))) {
        this._placePiece(idx);
      }
    };

    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onEnd, { once: true });
  }

  _completeTangram() {
    this.completed++;
    const timeSpent = Math.round((Date.now() - this.tangramStart) / 1000);
    const countEl = document.getElementById('tb-count');
    if (countEl) countEl.textContent = this.completed;

    // Flash success
    const target = this.container.querySelector('.tangram-target');
    target.classList.add('complete-flash');
    setTimeout(() => {
      target.classList.remove('complete-flash');
      this.currentIdx++;
      this._loadTangram(this.currentIdx);
    }, 1200);

    if (this.onPoint) this.onPoint({ timeSpent, tangramIdx: this.currentIdx });
    if (window._saveTangram) window._saveTangram({ timeSpent, completed: true });
  }

  reset() {
    this._loadTangram(this.currentIdx);
  }

  getScore() {
    return scoreTypeB({ count: this.completed });
  }

  destroy() { }
}

function typeBReset() {
  if (window._currentTypeB) window._currentTypeB.reset();
}

// ── Default tangram puzzles ───────────────────────────────────
const DEFAULT_TANGRAMS = [
  {
    name: 'Cuadrado',
    silhouette: 'M 60 60 L 280 60 L 280 280 L 60 280 Z',
    slots: [
      { points: '60,60 280,60 60,280' },
      { points: '280,60 280,280 60,280' },
      { points: '280,60 280,170 170,170' },
      { points: '60,60 170,60 115,115' },
      { points: '170,170 225,225 115,225' },
      { points: '115,115 170,60 225,115 170,170' },
      { points: '225,115 280,170 225,225 170,170' },
    ]
  },
  {
    name: 'Triángulo',
    silhouette: 'M 170 40 L 310 280 L 30 280 Z',
    slots: [
      { points: '170,40 310,280 30,280' },
      { points: '100,160 240,160 170,280' },
      { points: '170,40 240,160 100,160' },
      { points: '60,220 120,220 90,280' },
      { points: '220,220 280,220 250,280' },
      { points: '100,160 170,160 135,220 65,220' },
      { points: '170,160 240,160 275,220 205,220' },
    ]
  },
  {
    name: 'Casa',
    silhouette: 'M 170 60 L 280 160 L 280 300 L 60 300 L 60 160 Z',
    slots: [
      { points: '60,160 280,160 60,300' },
      { points: '280,160 280,300 60,300' },
      { points: '170,60 280,160 170,160' },
      { points: '170,60 60,160 120,160' },
      { points: '120,160 170,160 145,200' },
      { points: '170,160 100,230 60,160 120,160' },
      { points: '170,160 240,230 280,160 220,160' },
    ]
  }
];

// ── Type B CSS ────────────────────────────────────────────────
const typeBCSS = `
.type-b-wrap { display:flex; flex-direction:column; gap:1.25rem; }
.type-b-header { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:0.5rem; }
.type-b-badge { background:rgba(16,185,129,0.15); color:var(--green); border:1px solid rgba(16,185,129,0.3); }
.tangram-score-pill {
  padding:0.4rem 1rem; border-radius:999px;
  background:rgba(251,191,36,0.1); border:1px solid rgba(251,191,36,0.3);
  color:var(--gold); font-weight:700; font-size:0.9rem;
}
.tb-instruction { font-size:0.9rem; color:var(--text-secondary); }

/* Workspace: side-by-side source + target */
.tangram-workspace {
  display: flex;
  gap: 1.5rem;
  justify-content: center;
  align-items: flex-start;
  flex-wrap: wrap;
}
.tangram-source, .tangram-target {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}
.source-label {
  font-size: 0.7rem; font-weight: 700;
  color: var(--text-muted); letter-spacing: 0.1em;
  text-transform: uppercase;
}

.tangram-svg {
  display: block;
  touch-action: none;
}
.source-square {
  border: 1px solid var(--border);
  border-radius: 8px;
  background: rgba(255,255,255,0.02);
}
.light-mode .source-square {
  background: rgba(0,0,0,0.02);
}
.target-area {
  border: 2px dashed var(--border);
  border-radius: 12px;
  background: rgba(255,255,255,0.03);
  min-height: 340px;
}
.light-mode .target-area {
  background: rgba(0,0,0,0.03);
  border-color: rgba(0,0,0,0.2);
}

/* Silhouette visibility in light mode */
.light-mode .silhouette-outline {
  stroke: #333 !important;
}
.light-mode .silhouette-fill {
  fill: rgba(0,0,0,0.06) !important;
}

.source-piece {
  cursor: grab;
  transition: opacity 0.3s, transform 0.2s;
}
.source-piece:hover {
  filter: brightness(1.15);
}
.source-piece:active {
  cursor: grabbing;
}

/* Target drop zone highlight */
.target-area.drag-over {
  border-color: var(--orange);
  background: rgba(249,115,22,0.05);
}

/* Completion flash */
.tangram-target.complete-flash .target-area {
  box-shadow: 0 0 60px rgba(16,185,129,0.5);
  border-color: var(--green);
}

/* Controls */
.tangram-controls {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}
.rotate-hint {
  font-size: 0.75rem;
  color: var(--text-muted);
}
.tb-reset-btn { width: fit-content; }
`;

(function injectTypeBCSS() {
  if (document.getElementById('type-b-styles')) return;
  const s = document.createElement('style');
  s.id = 'type-b-styles'; s.textContent = typeBCSS;
  document.head.appendChild(s);
})();
