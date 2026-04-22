/**
 * type-a.js
 * Renders a Type A Standard Math Exercise (multiple-choice + Procedure template)
 * Olimpiadas Matemáticas Colombo
 */

class TypeAExercise {
  /**
   * @param {HTMLElement} container
   * @param {object}      activity   - activity data from activities.json
   * @param {function}    onComplete - callback(answerData) when student submits
   */
  constructor(container, activity, onComplete) {
    this.container = container;
    this.activity = activity;
    this.onComplete = onComplete;
    this.startedAt = Date.now();
    this.selected = null;
    this.proc = null;
    this.render();
  }

  render() {
    const a = this.activity;
    this.container.innerHTML = `
      <div class="type-a-wrap">

        <!-- Question -->
        <div class="question-block">
          <div class="type-badge type-a-badge">🔢 Ejercicio Tipo A</div>
          <h3 class="question-text">${escHtml(a.question)}</h3>
          ${a.image ? `<img src="${a.image}" alt="Imagen del ejercicio" class="question-img">` : ''}
        </div>

        <!-- Multiple choice -->
        <div class="mc-section">
          <div class="mc-label">Selecciona la respuesta correcta:</div>
          <div class="mc-options" id="mc-options">
            ${a.options.map((opt, i) => {
      const letter = ['A', 'B', 'C', 'D'][i];
      return `
                <button type="button" class="mc-option" data-letter="${letter}" onclick="typeASelectOption(this)">
                  <span class="mc-letter">${letter}</span>
                  <span class="mc-text">${escHtml(opt)}</span>
                </button>`;
    }).join('')}
          </div>
        </div>

        <!-- Procedure -->
        <div class="proc-section">
          <div id="proc-container"></div>
        </div>

        <!-- Submit -->
        <div class="submit-section">
          <button type="button" class="btn btn-primary btn-lg w-full" id="btn-submit-a"
            onclick="typeAHandleSubmitClick()">
            Confirmar y continuar →
          </button>
          <p class="submit-hint">Una vez que continúes, no podrás volver a este ejercicio.</p>
        </div>
      </div>
    `;

    // Mount procedure template
    const procContainer = this.container.querySelector('#proc-container');
    this.proc = new ProcedureTemplate(procContainer, a.procedure, a.question);

    // Watch procedure changes to update submit btn
    this._watchInputs();

    // Expose instance globally for onclick handlers
    window._currentTypeA = this;
  }

  _watchInputs() {
    // Poll every 500ms for procedure completion (simple approach without events)
    this._watchInterval = setInterval(() => this._checkCanSubmit(), 500);
  }

  _checkCanSubmit() {
    const btn = this.container.querySelector('#btn-submit-a');
    if (!btn) { clearInterval(this._watchInterval); return; }
    btn.disabled = !(this.selected && this.proc && this.proc.isComplete());
  }

  selectOption(el) {
    this.container.querySelectorAll('.mc-option').forEach(b => b.classList.remove('selected'));
    el.classList.add('selected');
    this.selected = el.dataset.letter;
    this._checkCanSubmit();
  }

  submit() {
    clearInterval(this._watchInterval);
    const procAnswer = this.proc ? this.proc.getAnswer() : null;
    const { score, breakdown } = scoreTypeA(this.activity, this.selected, procAnswer);

    this.onComplete({
      answer: this.selected,
      procedure: procAnswer,
      score,
      breakdown,
      startedAt: this.startedAt,
    });
  }

  destroy() {
    clearInterval(this._watchInterval);
  }
}

// Global handlers for onclick (needed because of dynamic HTML)
function typeASelectOption(el) {
  if (window._currentTypeA) window._currentTypeA.selectOption(el);
}
function typeASubmit() {
  if (window._currentTypeA) window._currentTypeA.submit();
}
function typeAHandleSubmitClick() {
  const inst = window._currentTypeA;
  if (!inst) return;

  const hasOption = !!inst.selected;
  const hasProc = inst.proc && inst.proc.isComplete();

  if (!hasOption && !hasProc) {
    showToast('⚠️ Debes seleccionar una respuesta Y completar el procedimiento matemático.', 'error', 4000);
    return;
  }
  if (!hasOption) {
    showToast('⚠️ Selecciona una opción de respuesta antes de continuar.', 'error', 3500);
    return;
  }
  if (!hasProc) {
    showToast('⚠️ Completa el procedimiento matemático (números, operación y resultado).', 'error', 3500);
    return;
  }

  inst.submit();
}

// ── Inject Type A CSS ─────────────────────────────────────────
const typeACSS = `
.type-a-wrap { display:flex; flex-direction:column; gap:1.75rem; }

.type-badge {
  display:inline-flex; align-items:center; gap:0.35rem;
  padding:0.3rem 0.8rem; border-radius:999px;
  font-size:0.75rem; font-weight:700; letter-spacing:0.05em;
  width:fit-content; margin-bottom:0.75rem;
}
.type-a-badge { background:rgba(99,102,241,0.15); color:var(--blue); border:1px solid rgba(99,102,241,0.3); }

.question-block {}
.question-text {
  font-size:clamp(1.1rem,3vw,1.35rem);
  font-weight:600; line-height:1.5;
  color:var(--text-primary);
}
.question-img {
  max-width:100%; max-height:220px; object-fit:contain;
  border-radius:var(--radius-md); margin-top:0.75rem;
  border:1px solid var(--border);
}

.mc-label {
  font-size:0.8rem; font-weight:600;
  color:var(--text-secondary); letter-spacing:0.08em;
  margin-bottom:0.75rem;
}
.mc-options { display:flex; flex-direction:column; gap:0.6rem; }
.mc-option {
  display:flex; align-items:center; gap:0.75rem;
  padding:0.85rem 1rem; border-radius:var(--radius-md);
  border:2px solid var(--border); background:var(--bg-card);
  color:var(--text-primary); text-align:left;
  cursor:pointer; transition:all 0.18s; width:100%;
}
.mc-option:hover { border-color:rgba(255,255,255,0.22); background:rgba(255,255,255,0.07); }
.mc-option.selected {
  border-color:var(--orange);
  background:rgba(249,115,22,0.12);
  box-shadow:0 0 0 3px rgba(249,115,22,0.1);
}
.mc-option.selected .mc-letter { background:var(--orange); color:#fff; }
.mc-letter {
  width:32px; height:32px; border-radius:8px;
  background:rgba(255,255,255,0.07); border:1px solid var(--border);
  display:flex; align-items:center; justify-content:center;
  font-family:var(--font-mono); font-weight:700; font-size:0.875rem;
  flex-shrink:0; transition:all 0.18s;
}
.mc-text { font-size:0.95rem; font-weight:500; flex:1; }

.submit-hint {
  text-align:center; font-size:0.75rem;
  color:var(--text-muted); margin-top:0.5rem;
}
`;

(function injectTypeACSS() {
  if (document.getElementById('type-a-styles')) return;
  const s = document.createElement('style');
  s.id = 'type-a-styles'; s.textContent = typeACSS;
  document.head.appendChild(s);
})();

function escHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
