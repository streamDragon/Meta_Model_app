(function initQuestionDrillEngine(global) {
    'use strict';

    const VALID_DIFFICULTIES = Object.freeze(['easy', 'medium', 'hard']);

    function normalizeDifficulty(value) {
        const key = String(value || '').trim().toLowerCase();
        return VALID_DIFFICULTIES.includes(key) ? key : 'easy';
    }

    function selectItemsByDifficulty(items, difficulty) {
        if (!Array.isArray(items)) return [];
        const level = normalizeDifficulty(difficulty);
        const filtered = items.filter((item) => String(item?.difficulty || '').toLowerCase() === level);
        return filtered.length ? filtered : items.slice();
    }

    function clampReactionTimeMs(value) {
        const raw = Number(value);
        if (!Number.isFinite(raw)) return 0;
        if (raw < 0) return 0;
        return Math.round(raw);
    }

    function computeTestScoreDelta({ correct = false, rtMs = 0, streak = 0 } = {}) {
        if (!correct) {
            return Object.freeze({
                total: -50,
                base: 0,
                speedBonus: 0,
                streakBonus: 0
            });
        }

        const reactionTime = clampReactionTimeMs(rtMs);
        const normalizedStreak = Math.max(0, Math.floor(Number(streak) || 0));
        const base = 100;
        const speedBonus = Math.max(0, Math.round((2000 - reactionTime) / 20));
        const streakBonus = normalizedStreak * 10;
        return Object.freeze({
            total: base + speedBonus + streakBonus,
            base,
            speedBonus,
            streakBonus
        });
    }

    const engine = Object.freeze({
        VALID_DIFFICULTIES,
        normalizeDifficulty,
        selectItemsByDifficulty,
        clampReactionTimeMs,
        computeTestScoreDelta
    });

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = engine;
        return;
    }

    global.QuestionDrillEngine = engine;
})(typeof window !== 'undefined' ? window : globalThis);
