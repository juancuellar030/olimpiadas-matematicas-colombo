/**
 * firebase-config.js
 * Firebase initialization & shared utilities
 * Olimpiadas Matemáticas Colombo
 *
 * NOTE: Replace the firebaseConfig values with your actual
 * Firebase project credentials from the Firebase Console.
 */

// ── Firebase SDK (via CDN compat mode) ──────────────────────
// Loaded via <script> tags in HTML before this file.

const firebaseConfig = {
    apiKey: "AIzaSyDgOhstW80tmUsrfYNQSrAI5gD0iwScPKk",
    authDomain: "esl-quiz-game.firebaseapp.com",
    databaseURL: "https://esl-quiz-game-default-rtdb.firebaseio.com",
    projectId: "esl-quiz-game",
    storageBucket: "esl-quiz-game.firebasestorage.app",
    messagingSenderId: "33988271478",
    appId: "1:33988271478:web:a53f1b54dd69e3e633ae57"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.database();

// ── Auth helpers ─────────────────────────────────────────────

/**
 * Sign in anonymously and return the user object.
 * @returns {Promise<firebase.User>}
 */
async function signInAnonymously() {
    const result = await auth.signInAnonymously();
    return result.user;
}

/**
 * Get the current signed-in user (or null).
 * @returns {firebase.User|null}
 */
function getCurrentUser() {
    return auth.currentUser;
}

/**
 * Wait for auth to be ready and return the user.
 * @returns {Promise<firebase.User|null>}
 */
function waitForAuth() {
    return new Promise((resolve) => {
        const unsub = auth.onAuthStateChanged((user) => {
            unsub();
            resolve(user);
        });
    });
}

// ── Database helpers ─────────────────────────────────────────

/**
 * Write data to a database path.
 * @param {string} path 
 * @param {*} data 
 */
async function dbSet(path, data) {
    await db.ref(path).set(data);
}

/**
 * Update (merge) data at a database path.
 * @param {string} path 
 * @param {*} data 
 */
async function dbUpdate(path, data) {
    await db.ref(path).update(data);
}

/**
 * Read data once from a path.
 * @param {string} path 
 * @returns {Promise<*>}
 */
async function dbGet(path) {
    const snap = await db.ref(path).once('value');
    return snap.val();
}

/**
 * Listen to real-time updates at a path.
 * @param {string} path 
 * @param {function} callback 
 * @returns {function} unsubscribe function
 */
function dbListen(path, callback) {
    const ref = db.ref(path);
    ref.on('value', (snap) => callback(snap.val()));
    return () => ref.off('value');
}

/**
 * Listen to child_added events at a path.
 * @param {string} path 
 * @param {function} callback 
 * @returns {function} unsubscribe function
 */
function dbListenChildren(path, callback) {
    const ref = db.ref(path);
    ref.on('child_added', (snap) => callback(snap.key, snap.val()));
    ref.on('child_changed', (snap) => callback(snap.key, snap.val()));
    return () => ref.off();
}

/**
 * Push a new item to a list and return its key.
 * @param {string} path 
 * @param {*} data 
 * @returns {Promise<string>} generated key
 */
async function dbPush(path, data) {
    const ref = await db.ref(path).push(data);
    return ref.key;
}

/**
 * Remove data at a path.
 * @param {string} path
 */
async function dbRemove(path) {
    await db.ref(path).remove();
}

/**
 * Get Firebase server timestamp value.
 */
function serverTimestamp() {
    return firebase.database.ServerValue.TIMESTAMP;
}

// ── Session code generator ───────────────────────────────────

/**
 * Generate a random 6-character alphanumeric session code.
 * @returns {string}
 */
function generateSessionCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous chars
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
}

/**
 * Find a session by its join code.
 * @param {string} code 
 * @returns {Promise<{id: string, data: object}|null>}
 */
async function findSessionByCode(code) {
    const snap = await db.ref('sessions')
        .orderByChild('code')
        .equalTo(code.toUpperCase())
        .once('value');

    const val = snap.val();
    if (!val) return null;

    const id = Object.keys(val)[0];
    return { id, data: val[id] };
}

// ── Toast notifications ──────────────────────────────────────

function showToast(message, type = 'info', duration = 3000) {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    requestAnimationFrame(() => {
        requestAnimationFrame(() => toast.classList.add('show'));
    });

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, duration);
}

// ── Export globals ───────────────────────────────────────────
// All functions are global since we're using vanilla JS without bundling.
