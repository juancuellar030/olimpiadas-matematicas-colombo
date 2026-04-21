/**
 * timer.js
 * Synchronized countdown timer — uses Firebase server time as source of truth
 * Olimpiadas Matemáticas Colombo
 */

class SyncTimer {
    /**
     * @param {object} opts
     * @param {string}   opts.sessionId
     * @param {function} opts.onTick        - called every second with { elapsed, remaining, total }
     * @param {function} opts.onFinish      - called when timer reaches zero
     * @param {function} opts.onStateChange - called with 'safe' | 'warn' | 'danger'
     */
    constructor({ sessionId, onTick, onFinish, onStateChange }) {
        this.sessionId = sessionId;
        this.onTick = onTick || (() => { });
        this.onFinish = onFinish || (() => { });
        this.onStateChange = onStateChange || (() => { });

        this._interval = null;
        this._startedAt = null;
        this._duration = 0;
        this._state = 'safe'; // 'safe' | 'warn' | 'danger'
        this._finished = false;
    }

    /**
     * Start listening to Firebase timer updates.
     * Automatically ticks locally for smooth display.
     */
    start() {
        dbListen(`sessions/${this.sessionId}/timer`, (timerData) => {
            if (!timerData) return;

            this._duration = timerData.duration || 1800;
            this._startedAt = timerData.startedAt || null;

            if (timerData.endedAt && !this._finished) {
                this._handleFinish();
                return;
            }

            if (this._startedAt && !this._interval) {
                this._startTicking();
            }
        });
    }

    _startTicking() {
        // Clear any existing interval
        if (this._interval) clearInterval(this._interval);

        this._interval = setInterval(() => {
            const now = Date.now();
            const elapsed = Math.floor((now - this._startedAt) / 1000);
            const remaining = Math.max(0, this._duration - elapsed);

            // Update display state
            const pct = remaining / this._duration;
            let newState = 'safe';
            if (pct <= 0.1) newState = 'danger';
            else if (pct <= 0.25) newState = 'warn';

            if (newState !== this._state) {
                this._state = newState;
                this.onStateChange(newState);
            }

            this.onTick({ elapsed, remaining, total: this._duration });

            if (remaining <= 0) {
                this._handleFinish();
            }
        }, 1000);
    }

    _handleFinish() {
        if (this._finished) return;
        this._finished = true;
        if (this._interval) {
            clearInterval(this._interval);
            this._interval = null;
        }
        this.onFinish();
    }

    destroy() {
        if (this._interval) clearInterval(this._interval);
    }
}

// ── Countdown overlay (3-2-1-¡YA!) ──────────────────────────
/**
 * Shows full-screen 3-2-1 countdown then calls callback.
 * @param {function} onComplete
 */
function showCountdown(onComplete) {
    const overlay = document.createElement('div');
    overlay.className = 'countdown-overlay';
    document.body.appendChild(overlay);

    const steps = ['3', '2', '1', '¡YA!'];
    let i = 0;

    function next() {
        overlay.innerHTML = '';
        if (i >= steps.length) {
            overlay.remove();
            onComplete();
            return;
        }
        const el = document.createElement('div');
        el.className = 'countdown-number';
        el.textContent = steps[i];
        overlay.appendChild(el);
        i++;
        setTimeout(next, 900);
    }

    next();
}

// ── Format seconds to MM:SS ──────────────────────────────────
/**
 * @param {number} seconds
 * @returns {string} "MM:SS"
 */
function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
