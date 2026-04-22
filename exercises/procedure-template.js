/**
 * procedure-template.js
 * Interactive "show your work" Procedure component — VERTICAL STACKED layout.
 * Supports 2+ operands stacked vertically with operator on the left side,
 * a horizontal line separator, and the result row at the bottom.
 * Matches the hand-drawn math notebook style.
 * Olimpiadas Matemáticas Colombo
 */

class ProcedureTemplate {
  /**
   * @param {HTMLElement} container
   * @param {object}      procedure - activity.procedure definition
   */
  constructor(container, procedure, questionText) {
    this.container = container;
    this.procedure = procedure;
    this.questionText = questionText || '';
    this.studentAnswer = { inputs: [], operation: null, result: null };
    this.render();
  }

  _inferOperandCount() {
    // Count numbers in the question string to determine how many rows to show
    const matches = this.questionText.match(/\d+[.,]?\d*/g);
    const cnt = matches ? matches.length : 2;
    // Clamp between 2 and 4
    return Math.min(4, Math.max(2, cnt));
  }

  render() {
    const p = this.procedure;
    if (!p) { this.container.innerHTML = ''; return; }

    // Infer operand count from question text (e.g. "12 × 15 + 4" → 3)
    const numCount = this._inferOperandCount();

    this.container.innerHTML = `
      <div class="proc-wrap">
        <div class="proc-label">📝 Procedimiento — muestra cómo llegaste a tu respuesta</div>
        <div class="proc-stack">
          <!-- Operand rows (vertical stack) -->
          <div class="proc-operands">
            ${this._renderOperandRows(numCount)}
          </div>
          <!-- Operator badge on the left side -->
          <div class="proc-op-column">
            <div class="proc-op-arrow">⌃</div>
            ${this._opSelect()}
            <div class="proc-op-arrow down">⌄</div>
          </div>
        </div>
        <!-- Separator line -->
        <div class="proc-separator"></div>
        <!-- Result row -->
        <div class="proc-result-row">
          <input type="number" class="proc-input proc-result" id="proc-result"
            placeholder="Resultado" step="any" inputmode="decimal">
        </div>
      </div>
    `;

    this._attachListeners();
  }

  _renderOperandRows(count) {
    let rows = '';
    for (let i = 0; i < count; i++) {
      rows += `
        <div class="proc-operand-row">
          <input type="number" class="proc-input proc-num" data-idx="${i}"
            placeholder="?" step="any" inputmode="decimal">
        </div>`;
    }
    return rows;
  }

  _opSelect() {
    return `
      <div class="op-select-group">
        ${['+', '−', '×', '÷'].map(op => `
          <button type="button" class="op-btn" data-op="${op}">${op}</button>
        `).join('')}
      </div>`;
  }

  _attachListeners() {
    // Number inputs
    this.container.querySelectorAll('.proc-num').forEach(input => {
      input.addEventListener('input', () => this._collect());
    });

    // Operation selectors
    this.container.querySelectorAll('.op-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const group = btn.closest('.op-select-group');
        group.querySelectorAll('.op-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this._collect();
      });
    });

    // Result input
    const resultInput = this.container.querySelector('#proc-result');
    if (resultInput) resultInput.addEventListener('input', () => this._collect());
  }

  _collect() {
    const nums = [...this.container.querySelectorAll('.proc-num')].map(i => i.value);
    const opBtn = this.container.querySelector('.op-btn.active');
    const resEl = this.container.querySelector('#proc-result');

    this.studentAnswer = {
      inputs: nums.map(Number),
      operation: opBtn ? opBtn.dataset.op : null,
      result: resEl ? Number(resEl.value) : null
    };
  }

  /** Returns the current student answer. */
  getAnswer() {
    this._collect();
    return this.studentAnswer;
  }

  /** Returns true if the student has filled in all required fields. */
  isComplete() {
    const a = this.getAnswer();
    const allInputsFilled = [...this.container.querySelectorAll('.proc-num')].every(
      i => i.value !== '' && !isNaN(Number(i.value))
    );
    const hasOp = a.operation !== null;
    const resultInput = this.container.querySelector('#proc-result');
    const hasRes = resultInput && resultInput.value !== '' && !isNaN(Number(resultInput.value));
    return allInputsFilled && hasOp && hasRes;
  }
}

// ── CSS injected dynamically ────────────────────────────────
const procCSS = `
.proc-wrap {
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 14px;
  padding: 1.25rem 1.5rem;
  display: flex; flex-direction: column; gap: 1rem;
}
.light-mode .proc-wrap {
  background: rgba(0,0,0,0.03);
  border-color: rgba(0,0,0,0.1);
}
.proc-label {
  font-size: 0.8rem; font-weight: 600;
  color: var(--text-secondary); letter-spacing: 0.05em;
}

/* Vertical stacked layout */
.proc-stack {
  display: flex;
  align-items: center;
  gap: 1rem;
}
.proc-op-column {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  flex-shrink: 0;
}
.proc-op-arrow {
  font-size: 1.1rem;
  color: var(--text-muted);
  line-height: 1;
  user-select: none;
}
.proc-operands {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex: 1;
}
.proc-operand-row {
  display: flex;
}

/* Separator line */
.proc-separator {
  height: 3px;
  background: var(--orange);
  border-radius: 2px;
  margin: 0.25rem 0;
}
.light-mode .proc-separator {
  background: var(--orange);
}

/* Result row */
.proc-result-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

/* Inputs */
.proc-input {
  background: rgba(20,20,50,0.8);
  border: 2px solid var(--orange);
  border-radius: 10px;
  color: var(--text-primary);
  font-family: var(--font-mono);
  font-size: 1.25rem; font-weight: 600;
  padding: 0.6rem 0.75rem;
  text-align: center;
  width: 100%;
  transition: border-color 0.2s, box-shadow 0.2s;
  -webkit-appearance: none;
}
.light-mode .proc-input {
  background: #fff;
  border-color: var(--orange);
  color: #1a1a2e;
}
.proc-input:focus {
  outline: none;
  border-color: var(--orange);
  box-shadow: 0 0 0 3px rgba(249,115,22,0.15);
}
.proc-result {
  max-width: 200px;
}

/* Operator buttons */
.op-select-group {
  display: flex; gap: 0.25rem;
}
.op-btn {
  width: 36px; height: 36px;
  border-radius: 8px;
  border: 2px solid rgba(255,255,255,0.12);
  background: rgba(255,255,255,0.05);
  color: var(--text-primary);
  font-size: 1rem; font-weight: 700;
  cursor: pointer;
  transition: all 0.15s;
}
.light-mode .op-btn {
  border-color: rgba(0,0,0,0.15);
  background: rgba(0,0,0,0.04);
  color: #1a1a2e;
}
.op-btn:hover { border-color: var(--orange); color: var(--orange); }
.op-btn.active {
  background: var(--orange);
  border-color: var(--orange);
  color: #fff;
  box-shadow: 0 0 12px var(--orange-glow);
}

/* hide number input arrows */
.proc-input::-webkit-outer-spin-button,
.proc-input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
.proc-input[type=number] { -moz-appearance: textfield; }
`;

(function injectProcCSS() {
  if (document.getElementById('proc-styles')) return;
  const style = document.createElement('style');
  style.id = 'proc-styles';
  style.textContent = procCSS;
  document.head.appendChild(style);
})();
