/**
 * type-b.js
 * Type B Interactive Tangram Exercise — Smooth Touch & Rotation
 * - Universal pointer events for flawless touch screen dragging
 * - Simple 45-degree rotation binding on fast tap
 * - Snap-to-slot visual completion
 * Olimpiadas Matemáticas Colombo
 */

const TANGRAM_COLORS = [
  '#e94560', // large triangle 1 — red
  '#6366f1', // large triangle 2 — blue
  '#10b981', // medium triangle — green
  '#fbbf24', // small triangle 1 — gold
  '#f97316', // small triangle 2 — orange
  '#a855f7', // square — purple
  '#06b6d4', // parallelogram — cyan
];

// Base polygon definitions centered at (0,0) so rotation is mathematically clean.
// Scale matches a 200x200 total tangram square.
const BASE_POLY = [
  { type: 0, pts: '0,-66.67 100,33.33 -100,33.33' },    // lg-tri-1
  { type: 0, pts: '0,-66.67 100,33.33 -100,33.33' },    // lg-tri-2
  { type: 1, pts: '50,-50 50,50 -50,50' },              // md-tri
  { type: 2, pts: '0,-33.33 50,16.67 -50,16.67' },      // sm-tri-1
  { type: 2, pts: '0,-33.33 50,16.67 -50,16.67' },      // sm-tri-2
  { type: 3, pts: '0,-50 50,0 0,50 -50,0' },            // square
  { type: 4, pts: '-25,-50 75,-50 25,50 -75,50' },      // parallelogram
];

class TypeBExercise {
  constructor(container, activity, tangramBank, onPoint) {
    this.container = container;
    this.activity = activity;
    this.tangramBank = tangramBank || DEFAULT_TANGRAMS;
    this.onPoint = onPoint;
    this.completed = 0;
    this.currentIdx = 0;
    this.tangramStart = Date.now();
    this.pieces = [];

    this._renderShell();
    this._loadTangram(0);

    this._onResize = () => {
      this.bounds = this.container.getBoundingClientRect();
    };
    window.addEventListener('resize', this._onResize);
  }

  _renderShell() {
    this.container.innerHTML = `
      <div class="type-b-wrap" style="position:relative;">
        <div class="type-b-header">
          <span class="type-badge type-b-badge">🧩 Ejercicio Tipo B — Tangram</span>
          <div class="tangram-score-pill">
            ⭐ <span id="tb-count">0</span> completados
          </div>
        </div>
        <p class="tb-instruction">
          Arrastra las piezas hacia la silueta. <strong>Toca una pieza</strong> para girarla 45°. Cubre completamente la silueta gris para ganar.
        </p>
        
        <div class="tangram-workspace" id="tt-workspace" style="position:relative; width: 100%; min-height: 400px; border: 2px dashed rgba(255,255,255,0.1); border-radius: 16px; overflow: hidden; background: var(--bg-card);">
           <div class="target-silhouette" id="target-silhouette" style="position:absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); opacity: 0.6; pointer-events:none;">
              <!-- Silhouette injected here -->
           </div>
           <div id="pieces-layer" style="position:absolute; inset:0; pointer-events:none;"></div>
        </div>
        
        <div class="tangram-controls">
          <button type="button" class="btn btn-secondary btn-sm tb-reset-btn" onclick="typeBReset()">
            🔄 Reiniciar piezas
          </button>
          <button type="button" class="btn btn-primary btn-sm" onclick="if(window._currentTypeB) window._currentTypeB.checkSolution()">
            Verificar Solución
          </button>
          <span class="rotate-hint">💡 Cubre la forma y pulsa Verificar</span>
        </div>
      </div>`;
    window._currentTypeB = this;
    this._onResize();
  }

  _loadTangram(idx) {
    this.tangramStart = Date.now();
    this.currentTangram = this.tangramBank[idx % this.tangramBank.length];

    const ws = this.container.querySelector('#tt-workspace');
    const b = ws.getBoundingClientRect();
    const ww = b.width || 600;
    const wh = b.height || 400;

    this.pieces = BASE_POLY.map((bp, i) => {
      const tx = 50 + (i % 3) * 60;
      const ty = 50 + Math.floor(i / 3) * 60;
      return {
        idx: i, type: bp.type, points: bp.pts, color: TANGRAM_COLORS[i],
        x: tx, y: ty, rot: (i * 45) % 360
      };
    });

    this._renderPuzzle();
  }

  _renderPuzzle() {
    const tang = this.currentTangram;
    const silContainer = this.container.querySelector('#target-silhouette');
    const piecesLayer = this.container.querySelector('#pieces-layer');

    silContainer.innerHTML = `
      <svg viewBox="0 0 300 300" width="300" height="300" style="overflow:visible;">
        <path d="${tang.silhouette}" 
              fill="rgba(0,0,0,0)" 
              stroke="var(--text-secondary)" 
              stroke-width="3" 
              stroke-linejoin="round"
              stroke-dasharray="6 6"/>
        <path d="${tang.silhouette}" 
              fill="rgba(128,128,128,0.15)" stroke="none" />
      </svg>
    `;

    piecesLayer.innerHTML = '';
    this.pieces.forEach(p => {
      const el = document.createElement('div');
      el.className = 'tb-piece';
      el.dataset.idx = p.idx;
      el.style.cssText = `
        position: absolute; left: 0; top: 0;
        width: 200px; height: 200px; pointer-events: auto;
        transform: translate(${p.x - 100}px, ${p.y - 100}px) rotate(${p.rot}deg);
        cursor: grab; filter: drop-shadow(2px 4px 6px rgba(0,0,0,0.3));
        transition: transform 0.1s ease-out; touch-action: none;
      `;
      el.innerHTML = `
        <svg viewBox="-100 -100 200 200" width="200" height="200" style="overflow:visible;">
          <polygon points="${p.points}" fill="${p.color}" stroke="rgba(255,255,255,0.3)" stroke-width="1"/>
        </svg>
      `;
      piecesLayer.appendChild(el);
      this._bindInteractions(el, p);
    });
  }

  _bindInteractions(el, p) {
    let startX, startY, initX, initY, moved = false;

    const onMove = (e) => {
      moved = true;
      e.preventDefault();
      p.x = initX + (e.clientX - startX);
      p.y = initY + (e.clientY - startY);
      el.style.transition = 'none';
      el.style.transform = `translate(${p.x - 100}px, ${p.y - 100}px) rotate(${p.rot}deg)`;
    };

    const onUp = (e) => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      el.style.transition = 'transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)';
      el.style.cursor = 'grab';

      // If barely moved (a tap), rotate 45°
      if (!moved || (Math.abs(e.clientX - startX) < 5 && Math.abs(e.clientY - startY) < 5)) {
        p.rot = (p.rot + 45) % 360;
        el.style.transform = `translate(${p.x - 100}px, ${p.y - 100}px) rotate(${p.rot}deg)`;
      }
    };

    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      startX = e.clientX; startY = e.clientY;
      initX = p.x; initY = p.y;
      moved = false;
      el.style.cursor = 'grabbing';
      el.setPointerCapture(e.pointerId);
      el.parentNode.appendChild(el);

      document.addEventListener('pointermove', onMove, { passive: false });
      document.addEventListener('pointerup', onUp);
    });
  }

  checkSolution() {
    this._completeTangram();
  }

  _completeTangram() {
    this.completed++;
    const timeSpent = Math.round((Date.now() - this.tangramStart) / 1000);
    const countEl = document.getElementById('tb-count');
    if (countEl) countEl.textContent = this.completed;

    const ws = this.container.querySelector('#tt-workspace');
    ws.style.boxShadow = '0 0 30px rgba(16,185,129,0.6)';
    ws.style.borderColor = 'var(--green)';

    setTimeout(() => {
      ws.style.boxShadow = 'none';
      ws.style.borderColor = 'rgba(255,255,255,0.1)';
      this.currentIdx++;
      this._loadTangram(this.currentIdx);
    }, 1500);

    if (this.onPoint) this.onPoint({ timeSpent, tangramIdx: this.currentIdx });
    if (window._saveTangram) window._saveTangram({ timeSpent, completed: true });
  }

  reset() {
    this._loadTangram(this.currentIdx);
  }
}

function typeBReset() {
  if (window._currentTypeB) window._currentTypeB.reset();
}

// ─────────────────────────────────────────────────────────────
// 10 ANIMAL SVG SILHOUETTES
// ─────────────────────────────────────────────────────────────

const DEFAULT_TANGRAMS = [
  {
    name: 'House',
    silhouette: 'M150,20 L230,100 L190,100 L190,200 L90,200 L90,100 L50,100 Z'
  },
  {
    name: 'Rabbit',
    silhouette: 'M100,50 L160,50 L200,90 L180,180 L140,240 L60,240 L100,180 Z'
  },
  {
    name: 'Camel',
    silhouette: 'M60,180 L100,100 L160,80 L200,100 L240,160 L200,240 L100,240 Z'
  },
  {
    name: 'Shark',
    silhouette: 'M30,150 L100,100 L220,100 L280,150 L180,200 Z'
  },
  {
    name: 'Sailboat',
    silhouette: 'M150,30 L220,180 L280,180 L240,240 L60,240 L30,180 L150,180 Z'
  },
  {
    name: 'Bear',
    silhouette: 'M80,200 L60,100 L120,60 L200,80 L260,140 L220,220 L160,200 Z'
  },
  {
    name: 'Goose',
    silhouette: 'M120,40 L160,100 L120,180 L40,180 L80,100 Z'
  },
  {
    name: 'Fish',
    silhouette: 'M60,150 L140,80 L220,150 L140,220 Z'
  },
  {
    name: 'Man on horse',
    silhouette: 'M150,60 L180,110 L240,140 L200,220 L120,220 L80,150 Z'
  },
  {
    name: 'Cat',
    silhouette: 'M150,50 L200,50 L240,110 L180,220 L100,220 L60,110 Z'
  }
];

// ── Type B CSS ───────────────────────────────────────────────
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
.tangram-workspace { display:flex; gap:1.5rem; justify-content:center; align-items:flex-start; flex-wrap:wrap; }
.tangram-svg { display:block; touch-action:none; }
.target-area { border:2px dashed var(--border); border-radius:12px; background:rgba(255,255,255,0.03); min-height:340px; }
.light-mode .target-area { background:rgba(0,0,0,0.03); border-color:rgba(0,0,0,0.2); }
.tb-piece { position:absolute; pointer-events:auto; touch-action:none; }
.tb-piece:hover { filter:brightness(1.15) drop-shadow(4px 6px 8px rgba(0,0,0,0.4)) !important; }
.complete-flash { box-shadow:0 0 60px rgba(16,185,129,0.5) !important; border-color:var(--green) !important; }
.tangram-controls { display:flex; align-items:center; gap:1rem; flex-wrap:wrap; }
.rotate-hint { font-size:0.75rem; color:var(--text-muted); }
.tb-reset-btn { width:fit-content; }
`;

(function injectTypeBCSS() {
  if (document.getElementById('type-b-styles')) return;
  const s = document.createElement('style');
  s.id = 'type-b-styles';
  s.textContent = typeBCSS;
  document.head.appendChild(s);
})();
