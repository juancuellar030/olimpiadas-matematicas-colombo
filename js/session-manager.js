/**
 * session-manager.js
 * Session lifecycle management
 * Olimpiadas Matemáticas Colombo
 */

// ── Session Status Constants ──────────────────────────────────
const SESSION_STATUS = {
    LOBBY: 'lobby',
    ACTIVE: 'active',
    FINISHED: 'finished'
};

// ── Create a new session (Teacher) ───────────────────────────
/**
 * Creates a new session in Firebase and returns the session ID and code.
 * @param {string} teacherUid
 * @returns {Promise<{sessionId: string, code: string}>}
 */
async function createSession(teacherUid) {
    let code;
    let sessionId;
    let attempts = 0;

    // Ensure unique code
    do {
        code = generateSessionCode();
        const existing = await findSessionByCode(code);
        if (!existing) break;
        attempts++;
        if (attempts > 10) throw new Error('No se pudo generar un código único. Intenta de nuevo.');
    } while (true);

    const sessionData = {
        code,
        hostId: teacherUid,
        status: SESSION_STATUS.LOBBY,
        createdAt: serverTimestamp(),
        assignedActivities: null,
        timer: { duration: 1800, startedAt: null, endedAt: null }
    };

    sessionId = await dbPush('sessions', sessionData);

    // Store in localStorage for teacher reconnect
    localStorage.setItem('hostSessionId', sessionId);
    localStorage.setItem('hostCode', code);

    return { sessionId, code };
}

// ── Join a session (Student) ──────────────────────────────────
/**
 * Joins an existing session as a student.
 * @param {string} code - 6-char session code
 * @param {string} schoolName
 * @param {string} studentUid
 * @returns {Promise<{sessionId: string, sessionData: object}>}
 */
async function joinSession(code, schoolName, studentUid) {
    const session = await findSessionByCode(code.toUpperCase().trim());

    if (!session) {
        throw new Error('Código de sesión no encontrado. Verifica el código e intenta de nuevo.');
    }

    if (session.data.status === SESSION_STATUS.FINISHED) {
        throw new Error('Esta sesión ya ha finalizado.');
    }

    // Count current students
    const students = session.data.students || {};
    const count = Object.keys(students).length;
    if (count >= 20) {
        throw new Error('La sesión está llena (máximo 20 estudiantes).');
    }

    // Register student
    await dbSet(`sessions/${session.id}/students/${studentUid}`, {
        schoolName,
        joinedAt: serverTimestamp(),
        currentExercise: 0,
        connected: true,
        exercises: {}
    });

    // Set disconnect handler
    db.ref(`sessions/${session.id}/students/${studentUid}/connected`)
        .onDisconnect().set(false);

    // Store locally for reconnect
    localStorage.setItem('studentSessionId', session.id);
    localStorage.setItem('studentUid', studentUid);
    localStorage.setItem('studentSchool', schoolName);

    return { sessionId: session.id, sessionData: session.data };
}

// ── Assign activities ─────────────────────────────────────────
/**
 * Teacher assigns a subset of activity indices to the session.
 * @param {string} sessionId
 * @param {number[]} activityIndices - array of 5 activity IDs
 */
async function assignActivities(sessionId, activityIndices) {
    if (activityIndices.length !== 5) {
        throw new Error('Debes seleccionar exactamente 5 actividades.');
    }
    await dbUpdate(`sessions/${sessionId}`, { assignedActivities: activityIndices });
}

// ── Start session ─────────────────────────────────────────────
/**
 * Teacher starts the live session.
 * @param {string} sessionId
 * @param {number} durationSeconds
 */
async function startSession(sessionId, durationSeconds = 1800) {
    await dbUpdate(`sessions/${sessionId}`, {
        status: SESSION_STATUS.ACTIVE,
        'timer/duration': durationSeconds,
        'timer/startedAt': serverTimestamp()
    });
}

// ── Finish session ────────────────────────────────────────────
/**
 * Ends the session (timer expired or teacher manually ends).
 * @param {string} sessionId
 */
async function finishSession(sessionId) {
    await dbUpdate(`sessions/${sessionId}`, {
        status: SESSION_STATUS.FINISHED,
        'timer/endedAt': serverTimestamp()
    });
}

// ── Student advances to next exercise ────────────────────────
/**
 * Saves a student's exercise answer and advances their position.
 * @param {string} sessionId
 * @param {string} studentUid
 * @param {number} exerciseIdx
 * @param {object} answerData - { answer, procedure, score, startedAt, completedAt }
 */
async function submitExercise(sessionId, studentUid, exerciseIdx, answerData) {
    const basePath = `sessions/${sessionId}/students/${studentUid}`;

    await dbUpdate(`${basePath}/exercises/${exerciseIdx}`, {
        ...answerData,
        completedAt: serverTimestamp()
    });

    await dbUpdate(basePath, {
        currentExercise: exerciseIdx + 1
    });
}

// ── Save tangram attempt ──────────────────────────────────────
/**
 * Records a completed tangram for a student.
 * @param {string} sessionId
 * @param {string} studentUid
 * @param {number} exerciseIdx
 * @param {object} tangramData - { tangramId, timeSpent, completed, snapshot }
 */
async function saveTangramAttempt(sessionId, studentUid, exerciseIdx, tangramData) {
    const basePath = `sessions/${sessionId}/students/${studentUid}/exercises/${exerciseIdx}/tangrams`;
    await dbPush(basePath, {
        ...tangramData,
        completedAt: serverTimestamp()
    });

    // Increment count
    const current = await dbGet(`${basePath}/count`) || 0;
    await dbSet(`${basePath}/count`, current + 1);
}

// ── Session reconnect (Teacher) ───────────────────────────────
/**
 * Try to reconnect an existing teacher session from localStorage.
 * @returns {Promise<{sessionId: string, code: string}|null>}
 */
async function reconnectTeacher() {
    const sessionId = localStorage.getItem('hostSessionId');
    const code = localStorage.getItem('hostCode');
    if (!sessionId || !code) return null;

    const data = await dbGet(`sessions/${sessionId}`);
    if (!data || data.status === SESSION_STATUS.FINISHED) {
        localStorage.removeItem('hostSessionId');
        localStorage.removeItem('hostCode');
        return null;
    }

    return { sessionId, code, data };
}

// ── Session reconnect (Student) ───────────────────────────────
/**
 * Try to reconnect an existing student session from localStorage.
 * @returns {Promise<object|null>}
 */
async function reconnectStudent() {
    const sessionId = localStorage.getItem('studentSessionId');
    const studentUid = localStorage.getItem('studentUid');
    if (!sessionId || !studentUid) return null;

    const session = await dbGet(`sessions/${sessionId}`);
    if (!session || session.status === SESSION_STATUS.FINISHED) {
        localStorage.removeItem('studentSessionId');
        localStorage.removeItem('studentUid');
        return null;
    }

    // Re-mark connected
    await dbSet(`sessions/${sessionId}/students/${studentUid}/connected`, true);
    db.ref(`sessions/${sessionId}/students/${studentUid}/connected`)
        .onDisconnect().set(false);

    return { sessionId, studentUid, session };
}

// ── Get all session analytics ─────────────────────────────────
/**
 * Reads all student data for analytics.
 * @param {string} sessionId
 * @returns {Promise<object>}
 */
async function getSessionAnalytics(sessionId) {
    const session = await dbGet(`sessions/${sessionId}`);
    return session;
}
