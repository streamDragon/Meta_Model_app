(function attachClassicClassicConfig(rootFactory) {
    const root = typeof globalThis !== 'undefined'
        ? globalThis
        : (typeof window !== 'undefined' ? window : this);
    const api = rootFactory();
    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    }
    root.classicClassicConfig = api;
})(function createClassicClassicConfig() {
    const GAME_CONFIG = Object.freeze({
        exam: Object.freeze({
            sessionSeconds: 180,
            lives: 3,
            allowPause: false,
            allowHints: false,
            allowExplain: false,
            timePenaltyOnWrong: 0
        }),
        learning: Object.freeze({
            sessionSeconds: 600,
            lives: Infinity,
            allowPause: true,
            allowHints: true,
            allowExplain: true,
            timePenaltyOnWrong: 3
        }),
        optionCounts: Object.freeze({
            questionOptions: 5,
            questionCorrect: 2,
            problemOptions: 5,
            goalOptions: 5
        }),
        scoring: Object.freeze({
            correctStageBase: 10,
            streakBonusStep: 2,
            examRoundTimeBonusDivisor: 5
        }),
        session: Object.freeze({
            patternStrategy: 'random',
            examEndsRoundOnWrong: false
        })
    });

    return Object.freeze({
        GAME_CONFIG
    });
});
