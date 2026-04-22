/**
 * scoring.js
 * Scoring logic for Type A (Standard Math) and Type B (Tangram)
 * Olimpiadas Matemáticas Colombo
 */

// ── Type A Scoring ────────────────────────────────────────────
const POINTS = {
    MULTIPLE_CHOICE_CORRECT: 1,
    PROCEDURE_CORRECT: 1,
    TANGRAM_PER_COMPLETION: 2
};

/**
 * Calculate score for a Type A (Standard Math) exercise.
 * @param {object} activity   - activity data from activities.json
 * @param {string} answer     - student's multiple-choice answer ('A'|'B'|'C'|'D')
 * @param {object} procedure  - { inputs: [...], operation: '+' | '-' | '×' | '÷', result: number }
 * @returns {{ score: number, breakdown: object }}
 */
function scoreTypeA(activity, answer, procedure) {
    let score = 0;
    const breakdown = {
        multipleChoice: false,
        procedure: false
    };

    // 1. Multiple choice
    if (answer && answer.trim().toUpperCase() === activity.correctAnswer.trim().toUpperCase()) {
        score += POINTS.MULTIPLE_CHOICE_CORRECT;
        breakdown.multipleChoice = true;
    }

    // 2. Procedure template
    if (procedure && activity.procedure) {
        const isCorrect = _checkProcedure(activity.procedure, procedure);
        if (isCorrect) {
            score += POINTS.PROCEDURE_CORRECT;
            breakdown.procedure = true;
        }
    }

    return { score, breakdown };
}

/**
 * Check if the student's procedure matches the expected template.
 * @param {object} expected - { inputs: number[], operation: string, result: number }
 * @param {object} student  - { inputs: number[], operation: string, result: number }
 * @returns {boolean}
 */
function _checkProcedure(expected, student) {
    if (!student) return false;

    // Tolerant comparison — allow minor floating point
    const resultsMatch = Math.abs(Number(student.result) - Number(expected.result)) < 0.01;

    // Check operation if provided
    const opMatch = !expected.operation || student.operation === expected.operation;

    // Check inputs if provided
    let inputsMatch = true;
    if (expected.inputs && student.inputs) {
        inputsMatch = expected.inputs.every((val, idx) =>
            Math.abs(Number(student.inputs[idx]) - Number(val)) < 0.01
        );
    }

    return resultsMatch && opMatch && inputsMatch;
}

/**
 * Calculate total score for a Type B (Tangram) exercise.
 * @param {object} tangramData - { count: number, completions: [...] }
 * @returns {{ score: number, breakdown: object }}
 */
function scoreTypeB(tangramData) {
    const count = tangramData?.count || 0;
    return {
        score: count * POINTS.TANGRAM_PER_COMPLETION,
        breakdown: { tangramsCompleted: count }
    };
}

/**
 * Calculate the total session score for a student.
 * @param {object} exercises    - map of exercise index → exercise data
 * @param {number[]} activityIds - ordered activity IDs for this session
 * @param {object[]} activities  - activity bank array
 * @returns {number} total score
 */
function calculateTotalScore(exercises, activityIds, activities) {
    let total = 0;
    if (!exercises) return 0;

    Object.entries(exercises).forEach(([idx, exData]) => {
        if (exData && exData.score != null) {
            total += exData.score;
        }
    });

    return total;
}

/**
 * Build a rich analytics object for a single student.
 * @param {object} studentData  - from DB
 * @param {number[]} activityIds
 * @param {object[]} activities
 * @returns {object}
 */
function buildStudentAnalytics(studentData, activityIds, activities) {
    const exercises = studentData.exercises || {};
    const result = {
        schoolName: studentData.schoolName,
        totalScore: 0,
        exerciseCount: Object.keys(exercises).length,
        exercises: []
    };

    activityIds.forEach((actId, idx) => {
        const exData = exercises[idx] || {};
        const activity = activities[actId];

        const ex = {
            index: idx + 1,
            activityId: actId,
            type: activity?.type || 'A',
            title: activity?.title || `Ejercicio ${idx + 1}`,
            score: exData.score || 0,
            answer: exData.answer || '—',
            correctAnswer: activity?.correctAnswer || '—',
            isCorrect: exData.answer === activity?.correctAnswer,
            startedAt: exData.startedAt || null,
            completedAt: exData.completedAt || null,
            timeSpent: exData.startedAt && exData.completedAt
                ? Math.round((exData.completedAt - exData.startedAt) / 1000)
                : null,
            procedure: exData.procedure || null,
            tangrams: activity?.type === 'B' ? (exData.tangrams || {}) : null
        };

        result.exercises.push(ex);
        result.totalScore += ex.score;
    });

    return result;
}
