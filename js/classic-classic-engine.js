(function attachClassicClassicEngine(rootFactory) {
    const root = typeof globalThis !== 'undefined'
        ? globalThis
        : (typeof window !== 'undefined' ? window : this);
    const api = rootFactory(root);
    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    }
    root.classicClassicEngine = api;
})(function createClassicClassicEngine(root) {
    const rngApi = (function resolveRngApi() {
        if (root && root.classicClassicRng) return root.classicClassicRng;
        if (typeof require === 'function') {
            try {
                return require('./classic-classic-rng.js');
            } catch (error) {
                // ignore and fail later
            }
        }
        return null;
    })();

    const configApi = (function resolveConfigApi() {
        if (root && root.classicClassicConfig) return root.classicClassicConfig;
        if (typeof require === 'function') {
            try {
                return require('./classic-classic-config.js');
            } catch (error) {
                // ignore and use fallback
            }
        }
        return null;
    })();

    const FALLBACK_CONFIG = Object.freeze({
        exam: Object.freeze({ sessionSeconds: 180, lives: 3, allowPause: false, allowHints: false, allowExplain: false, timePenaltyOnWrong: 0 }),
        learning: Object.freeze({ sessionSeconds: 600, lives: Infinity, allowPause: true, allowHints: true, allowExplain: true, timePenaltyOnWrong: 3 }),
        optionCounts: Object.freeze({ questionOptions: 5, questionCorrect: 2, problemOptions: 5, goalOptions: 5 }),
        scoring: Object.freeze({ correctStageBase: 10, streakBonusStep: 2, examRoundTimeBonusDivisor: 5 }),
        session: Object.freeze({ patternStrategy: 'random', examEndsRoundOnWrong: false })
    });

    const DEFAULT_CONFIG = (configApi && configApi.GAME_CONFIG) || FALLBACK_CONFIG;
    const STAGES = Object.freeze(['question', 'problem', 'goal', 'summary']);

    function invariant(condition, message) {
        if (!condition) throw new Error(message);
    }

    function normalizeMode(mode) {
        const key = String(mode || 'learning').trim().toLowerCase();
        return key === 'exam' ? 'exam' : 'learning';
    }

    function createRng(seed) {
        invariant(rngApi && typeof rngApi.createSeededRng === 'function', 'classicClassicRng is required');
        return rngApi.createSeededRng(seed);
    }

    function cloneDeep(value) {
        return JSON.parse(JSON.stringify(value));
    }

    function getModeConfig(mode, config) {
        const base = config || DEFAULT_CONFIG;
        const normalized = normalizeMode(mode);
        return {
            mode: normalized,
            modeConfig: base[normalized],
            optionCounts: base.optionCounts,
            scoring: base.scoring,
            session: base.session
        };
    }

    function ensureUniqueIds(items, label) {
        const seen = new Set();
        (items || []).forEach((item) => {
            const id = String(item?.id || '');
            invariant(id, `${label}: option missing id`);
            invariant(!seen.has(id), `${label}: duplicate id ${id}`);
            seen.add(id);
        });
    }

    function shuffle(array, rng) {
        return rngApi.shuffle(array, rng);
    }

    function sampleUnique(array, count, rng) {
        return rngApi.sampleUnique(array, count, rng);
    }

    function pickNextPattern(patterns, strategy, context) {
        const list = Array.isArray(patterns) ? patterns.filter(Boolean) : [];
        invariant(list.length > 0, 'pickNextPattern: patterns list is empty');

        const enabledIds = new Set((context?.enabledPatternIds || []).filter(Boolean));
        const pool = enabledIds.size
            ? list.filter((pattern) => enabledIds.has(pattern.id))
            : list;
        invariant(pool.length > 0, 'pickNextPattern: no enabled patterns left');

        const modeStrategy = String(strategy || context?.strategy || 'random').toLowerCase();
        if (modeStrategy === 'sequential') {
            const lastIndex = Number(context?.lastIndex);
            const nextIndex = Number.isInteger(lastIndex) ? ((lastIndex + 1) % pool.length) : 0;
            return { pattern: pool[nextIndex], index: nextIndex };
        }

        const rng = context?.rng;
        invariant(rng && typeof rng.nextInt === 'function', 'pickNextPattern: rng is required');
        const index = rng.nextInt(0, pool.length);
        return { pattern: pool[index], index };
    }

    function normalizeQuestionOption(option, isCorrect) {
        return {
            id: String(option.id || ''),
            text: String(option.text || ''),
            isCorrect: !!isCorrect,
            explain: isCorrect ? '' : String(option.reason || '')
        };
    }

    function validateQuestionStageOptions(options, config) {
        const counts = config?.optionCounts || DEFAULT_CONFIG.optionCounts;
        invariant(Array.isArray(options), 'Question options must be array');
        invariant(options.length === counts.questionOptions, `Question options must be ${counts.questionOptions}`);
        ensureUniqueIds(options, 'Question stage');
        const correctCount = options.filter((option) => option.isCorrect).length;
        invariant(correctCount === counts.questionCorrect, `Question stage must have ${counts.questionCorrect} correct options`);
    }

    function validateSingleCorrectOptions(options, expectedLength, label) {
        invariant(Array.isArray(options), `${label} options must be array`);
        invariant(options.length === expectedLength, `${label} options must be ${expectedLength}`);
        ensureUniqueIds(options, label);
        const correctCount = options.filter((option) => !!option.correct || !!option.isCorrect).length;
        invariant(correctCount === 1, `${label} options must have exactly one correct`);
    }

    function generateQuestionStageOptions(pattern, rng, config) {
        const counts = config?.optionCounts || DEFAULT_CONFIG.optionCounts;
        invariant(pattern && Array.isArray(pattern.goodQuestions), 'Pattern.goodQuestions is required');
        invariant(pattern && Array.isArray(pattern.trapQuestions), 'Pattern.trapQuestions is required');

        const selectedGood = sampleUnique(pattern.goodQuestions, counts.questionCorrect, rng);
        const selectedTrap = sampleUnique(pattern.trapQuestions, counts.questionOptions - counts.questionCorrect, rng);
        invariant(selectedGood.length === counts.questionCorrect, 'Not enough good questions in pattern');
        invariant(selectedTrap.length === (counts.questionOptions - counts.questionCorrect), 'Not enough trap questions in pattern');

        const options = [
            ...selectedGood.map((item) => normalizeQuestionOption(item, true)),
            ...selectedTrap.map((item) => normalizeQuestionOption(item, false))
        ];
        const shuffled = shuffle(options, rng);
        validateQuestionStageOptions(shuffled, config);
        return shuffled;
    }

    function mapOptionStageOptions(list) {
        return (list || []).map((item) => ({
            id: String(item.id || ''),
            text: String(item.text || ''),
            isCorrect: !!item.correct
        }));
    }

    function generateProblemStageOptions(pattern, rng, config) {
        const counts = config?.optionCounts || DEFAULT_CONFIG.optionCounts;
        validateSingleCorrectOptions(pattern.problemOptions, counts.problemOptions, 'Problem stage');
        return shuffle(mapOptionStageOptions(pattern.problemOptions), rng);
    }

    function generateGoalStageOptions(pattern, rng, config) {
        const counts = config?.optionCounts || DEFAULT_CONFIG.optionCounts;
        validateSingleCorrectOptions(pattern.goalOptions, counts.goalOptions, 'Goal stage');
        return shuffle(mapOptionStageOptions(pattern.goalOptions), rng);
    }

    function buildRound(pattern, rng, config) {
        invariant(pattern && pattern.id, 'buildRound requires a pattern');
        const questionOptions = generateQuestionStageOptions(pattern, rng, config);
        const problemOptions = generateProblemStageOptions(pattern, rng, config);
        const goalOptions = generateGoalStageOptions(pattern, rng, config);

        return {
            patternId: pattern.id,
            pattern,
            stage: 'question',
            status: 'active',
            attemptsByStage: {
                question: 0,
                problem: 0,
                goal: 0
            },
            failuresByStage: {
                question: 0,
                problem: 0,
                goal: 0
            },
            options: {
                question: questionOptions,
                problem: problemOptions,
                goal: goalOptions
            },
            chosen: {
                question: [],
                problem: [],
                goal: []
            }
        };
    }

    function createEmptyFamilyStats() {
        return {
            attempts: 0,
            correctStages: 0,
            wrongStages: 0
        };
    }

    function ensurePatternStats(state, patternId) {
        if (!state.statsByPatternId[patternId]) {
            state.statsByPatternId[patternId] = createEmptyFamilyStats();
        }
        return state.statsByPatternId[patternId];
    }

    function ensureFamilyStats(state, family) {
        if (!state.statsByFamily[family]) {
            state.statsByFamily[family] = createEmptyFamilyStats();
        }
        return state.statsByFamily[family];
    }

    function stagePoints(state) {
        const scoring = state.config.scoring;
        return scoring.correctStageBase + (Math.max(0, state.streak - 1) * scoring.streakBonusStep);
    }

    function currentRound(state) {
        return state.rounds[state.roundIndex] || null;
    }

    function applyStageAdvance(round) {
        if (round.stage === 'question') round.stage = 'problem';
        else if (round.stage === 'problem') round.stage = 'goal';
        else if (round.stage === 'goal') round.stage = 'summary';
    }

    function getStageOption(round, stage, optionId) {
        const options = round?.options?.[stage] || [];
        return options.find((option) => String(option.id) === String(optionId)) || null;
    }

    function submitStageAnswer(state, optionId) {
        invariant(state && !state.ended, 'Session is not active');
        const round = currentRound(state);
        invariant(round, 'No active round');
        invariant(round.stage !== 'summary', 'Cannot answer in summary stage');

        const stage = round.stage;
        const option = getStageOption(round, stage, optionId);
        invariant(option, `Option not found for stage ${stage}`);

        round.attemptsByStage[stage] += 1;
        round.chosen[stage].push(option.id);
        state.totalStageAttempts += 1;

        const patternStats = ensurePatternStats(state, round.pattern.id);
        const familyStats = ensureFamilyStats(state, round.pattern.family);
        patternStats.attempts += 1;
        familyStats.attempts += 1;

        if (option.isCorrect) {
            state.correctCount += 1;
            state.streak += 1;
            patternStats.correctStages += 1;
            familyStats.correctStages += 1;
            state.score += stagePoints(state);
            applyStageAdvance(round);
            const completedRound = round.stage === 'summary';
            if (completedRound) {
                state.completedRounds += 1;
                if (state.mode === 'exam' && state.config.scoring.examRoundTimeBonusDivisor > 0) {
                    state.score += Math.max(0, Math.floor(state.timeLeftSeconds / state.config.scoring.examRoundTimeBonusDivisor));
                }
            }
            return {
                ok: true,
                stage,
                nextStage: round.stage,
                completedRound,
                score: state.score,
                streak: state.streak
            };
        }

        state.wrongCount += 1;
        state.streak = 0;
        patternStats.wrongStages += 1;
        familyStats.wrongStages += 1;
        round.failuresByStage[stage] += 1;

        let explanation = '';
        if (state.mode === 'learning' && stage === 'question') {
            explanation = option.explain || 'זו שאלה שמסיחה מהמידע החסר של התבנית.';
        } else if (state.mode === 'learning') {
            explanation = round.failuresByStage[stage] >= 2
                ? `נסו שוב. תשובה נכונה: ${(round.options[stage].find((entry) => entry.isCorrect) || {}).text || ''}`
                : 'זו תשובה שמתאימה לתבנית אחרת. נסו לדייק את היעד של התבנית.';
        }

        if (state.mode === 'learning') {
            state.timeLeftSeconds = Math.max(0, state.timeLeftSeconds - (state.config[state.mode].timePenaltyOnWrong || 0));
            return {
                ok: false,
                stage,
                nextStage: round.stage,
                retryAllowed: true,
                explanation
            };
        }

        if (Number.isFinite(state.livesLeft)) {
            state.livesLeft = Math.max(0, state.livesLeft - 1);
        }

        let roundEnded = false;
        if (state.config.session.examEndsRoundOnWrong) {
            round.status = 'failed';
            round.stage = 'summary';
            roundEnded = true;
        }

        if (state.livesLeft <= 0) {
            state.ended = true;
            state.endReason = 'lives';
        }

        return {
            ok: false,
            stage,
            nextStage: round.stage,
            retryAllowed: !roundEnded && !state.ended,
            livesLeft: state.livesLeft,
            roundEnded,
            explanation: ''
        };
    }

    function nextRound(state) {
        invariant(state && !state.ended, 'Session is not active');
        const round = currentRound(state);
        if (round && round.stage !== 'summary') {
            throw new Error('Cannot start next round before summary');
        }

        const pick = pickNextPattern(state.patterns, state.config.session.patternStrategy, {
            rng: state.rng,
            lastIndex: state.lastPatternPoolIndex
        });
        state.lastPatternPoolIndex = pick.index;
        const roundData = buildRound(pick.pattern, state.rng, state.config);
        state.rounds.push(roundData);
        state.roundIndex = state.rounds.length - 1;
        return cloneDeep(roundData);
    }

    function tickSession(state, seconds) {
        invariant(state && !state.ended, 'Session is not active');
        const delta = Math.max(0, Number(seconds) || 0);
        state.timeLeftSeconds = Math.max(0, state.timeLeftSeconds - delta);
        if (state.timeLeftSeconds <= 0) {
            state.ended = true;
            state.endReason = 'time';
        }
        return state.timeLeftSeconds;
    }

    function endSession(state, reason) {
        if (!state) return null;
        state.ended = true;
        state.endReason = reason || state.endReason || 'manual';
        return buildEndSessionReport(state);
    }

    function accuracyPercent(correct, total) {
        if (!total) return 0;
        return Math.round((correct / total) * 100);
    }

    function buildEndSessionReport(state) {
        const perFamily = Object.entries(state.statsByFamily).map(([family, stats]) => {
            const total = (stats.correctStages || 0) + (stats.wrongStages || 0);
            return {
                family,
                attempts: stats.attempts || 0,
                correctStages: stats.correctStages || 0,
                wrongStages: stats.wrongStages || 0,
                accuracy: accuracyPercent(stats.correctStages || 0, total)
            };
        }).sort((a, b) => a.family.localeCompare(b.family));

        const weakPatterns = Object.entries(state.statsByPatternId).map(([patternId, stats]) => {
            const total = (stats.correctStages || 0) + (stats.wrongStages || 0);
            return {
                patternId,
                attempts: stats.attempts || 0,
                correctStages: stats.correctStages || 0,
                wrongStages: stats.wrongStages || 0,
                accuracy: accuracyPercent(stats.correctStages || 0, total)
            };
        }).sort((a, b) => (a.accuracy - b.accuracy) || (b.wrongStages - a.wrongStages) || a.patternId.localeCompare(b.patternId))
            .slice(0, 5);

        const totalStageResults = state.correctCount + state.wrongCount;
        return {
            mode: state.mode,
            score: state.score,
            streak: state.streak,
            timeLeftSeconds: state.timeLeftSeconds,
            livesLeft: state.livesLeft,
            endReason: state.endReason || '',
            overall: {
                correctCount: state.correctCount,
                wrongCount: state.wrongCount,
                totalStageResults,
                accuracy: accuracyPercent(state.correctCount, totalStageResults)
            },
            completedRounds: state.completedRounds,
            perFamily,
            weakPatterns
        };
    }

    function createSessionState(input) {
        const payload = input || {};
        const patterns = Array.isArray(payload.patterns) ? payload.patterns.filter(Boolean) : [];
        invariant(patterns.length > 0, 'createSessionState requires patterns');
        const mode = normalizeMode(payload.mode);
        const config = payload.config || DEFAULT_CONFIG;
        const modeSettings = config[mode];
        invariant(modeSettings, `Missing config for mode ${mode}`);
        const rng = createRng(payload.seed ?? 'classic-classic-session');

        const state = {
            mode,
            seed: payload.seed ?? 'classic-classic-session',
            rng,
            config,
            patterns,
            rounds: [],
            roundIndex: -1,
            lastPatternPoolIndex: -1,
            score: 0,
            streak: 0,
            correctCount: 0,
            wrongCount: 0,
            totalStageAttempts: 0,
            completedRounds: 0,
            statsByPatternId: {},
            statsByFamily: {},
            timeLeftSeconds: Number(modeSettings.sessionSeconds) || 0,
            livesLeft: Number.isFinite(modeSettings.lives) ? Number(modeSettings.lives) : Infinity,
            paused: false,
            ended: false,
            endReason: '',
            startedAt: Date.now()
        };

        nextRound(state);
        return state;
    }

    function getPublicRound(round) {
        if (!round) return null;
        return cloneDeep(round);
    }

    function getPublicSession(state) {
        return {
            mode: state.mode,
            score: state.score,
            streak: state.streak,
            correctCount: state.correctCount,
            wrongCount: state.wrongCount,
            timeLeftSeconds: state.timeLeftSeconds,
            livesLeft: state.livesLeft,
            roundIndex: state.roundIndex,
            completedRounds: state.completedRounds,
            ended: state.ended,
            endReason: state.endReason,
            currentRound: getPublicRound(currentRound(state))
        };
    }

    return Object.freeze({
        STAGES,
        DEFAULT_CONFIG,
        normalizeMode,
        pickNextPattern,
        generateQuestionStageOptions,
        generateProblemStageOptions,
        generateGoalStageOptions,
        validateQuestionStageOptions,
        buildRound,
        createSessionState,
        currentRound,
        submitStageAnswer,
        nextRound,
        tickSession,
        endSession,
        buildEndSessionReport,
        getPublicSession,
        getPublicRound
    });
});
