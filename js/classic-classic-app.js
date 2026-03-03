(function attachClassicClassicApp() {
    const root = typeof globalThis !== 'undefined' ? globalThis : window;
    const appEl = document.getElementById('classic-classic-app');
    if (!appEl) return;

    const engine = root.classicClassicEngine;
    const configApi = root.classicClassicConfig;
    if (!engine || !configApi) {
        appEl.innerHTML = '<div class="cc-loading">שגיאה בטעינת מנוע Classic Classic.</div>';
        return;
    }

    const SETTINGS_STORAGE_KEY = 'classic-classic.practice-settings.v2';
    const SESSION_STATE_INTRO = 'intro';
    const SESSION_STATE_PRACTICE = 'practice';
    const SESSION_STATE_SUMMARY = 'summary';

    const state = {
        loaded: false,
        loadError: '',
        data: null,
        copy: null,
        mode: 'learning',
        session: null,
        appStage: SESSION_STATE_INTRO,
        setupOpen: false,
        settingsDrawerOpen: false,
        hasSavedSettings: false,
        settings: null,
        feedback: null,
        hintMessage: '',
        hintUsedByStage: { question: false, problem: false, goal: false },
        lastSelectedOptionId: '',
        lastSelectedWasCorrect: null,
        familyFocus: 'all',
        showPhilosopher: false,
        showRoundGuide: false,
        paused: false,
        timerHandle: null,
        submitInFlight: false,
        lastSubmitAt: 0,
        renderNonce: 0,
        detailsOpenState: Object.create(null),
        stageTransition: null,
        stageTransitionHandle: null
    };

    function escapeHtml(value) {
        if (value === null || value === undefined) return '';
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function detailStateKey(rawKey) {
        return String(rawKey || '').trim();
    }

    function isDetailOpen(rawKey, fallback = false) {
        const key = detailStateKey(rawKey);
        if (!key) return Boolean(fallback);
        if (!Object.prototype.hasOwnProperty.call(state.detailsOpenState, key)) return Boolean(fallback);
        return Boolean(state.detailsOpenState[key]);
    }

    function setDetailOpen(rawKey, isOpen) {
        const key = detailStateKey(rawKey);
        if (!key) return;
        state.detailsOpenState[key] = Boolean(isOpen);
    }

    function clearStageTransition(renderAfter = false) {
        if (state.stageTransitionHandle) {
            clearTimeout(state.stageTransitionHandle);
            state.stageTransitionHandle = null;
        }
        if (!state.stageTransition) return;
        state.stageTransition = null;
        if (renderAfter) render();
    }

    function stageTransitionActionHint(stage) {
        if (stage === 'question') return '\u05de\u05d4 \u05e8\u05d5\u05e6\u05d9\u05dd \u05db\u05e2\u05ea: \u05dc\u05d1\u05d7\u05d5\u05e8 \u05e9\u05d0\u05dc\u05d4 \u05d0\u05d7\u05ea \u05e9\u05de\u05d7\u05d6\u05d9\u05e8\u05d4 \u05de\u05d9\u05d3\u05e2 \u05d7\u05e1\u05e8, \u05dc\u05dc\u05d0 \u05e4\u05ea\u05e8\u05d5\u05df \u05de\u05d9\u05d9\u05d3\u05d9.';
        if (stage === 'problem') return '\u05de\u05d4 \u05e8\u05d5\u05e6\u05d9\u05dd \u05db\u05e2\u05ea: \u05dc\u05d1\u05d7\u05d5\u05e8 \u05d0\u05ea \u05d4\u05d1\u05e2\u05d9\u05d4 \u05d4\u05dc\u05e9\u05d5\u05e0\u05d9\u05ea \u05d4\u05de\u05e8\u05db\u05d6\u05d9\u05ea, \u05dc\u05d0 \u05e4\u05ea\u05e8\u05d5\u05df \u05d5\u05dc\u05d0 \u05e9\u05d9\u05e4\u05d5\u05d8.';
        if (stage === 'goal') return '\u05de\u05d4 \u05e8\u05d5\u05e6\u05d9\u05dd \u05db\u05e2\u05ea: \u05dc\u05d1\u05d7\u05d5\u05e8 \u05de\u05d4 \u05de\u05d9\u05d3\u05e2 \u05d7\u05e1\u05e8 \u05db\u05d3\u05d0\u05d9 \u05dc\u05d1\u05e8\u05e8 \u05e2\u05db\u05e9\u05d9\u05d5.';
        return '\u05d4\u05de\u05e9\u05d9\u05db\u05d5 \u05dc\u05e9\u05dc\u05d1 \u05d4\u05d1\u05d0.';
    }

    function stageTransitionTitle(stage) {
        if (stage === 'question') return '\u05e9\u05dc\u05d1 B - \u05d1\u05d7\u05d9\u05e8\u05ea \u05e9\u05d0\u05dc\u05ea \u05d1\u05d9\u05e8\u05d5\u05e8';
        if (stage === 'problem') return '\u05e9\u05dc\u05d1 C - \u05d6\u05d9\u05d4\u05d5\u05d9 \u05d4\u05d1\u05e2\u05d9\u05d4 \u05d4\u05dc\u05e9\u05d5\u05e0\u05d9\u05ea';
        if (stage === 'goal') return '\u05e9\u05dc\u05d1 D - \u05d1\u05d7\u05d9\u05e8\u05ea \u05d9\u05e2\u05d3 \u05d4\u05d1\u05d9\u05e8\u05d5\u05e8';
        return stageLabel(stage);
    }
    function getStageTransitionForRound(round) {
        const transition = state.stageTransition;
        if (!transition || !round) return null;
        if (transition.stage !== round.stage) return null;
        if (transition.patternId && transition.patternId !== String(round?.pattern?.id || '')) return null;
        if (Date.now() > Number(transition.expiresAt || 0)) return null;
        return transition;
    }

    function activateStageTransition(round, nextStage) {
        const stage = String(nextStage || '').trim();
        if (!stage || !round) return;
        const optionCount = Math.max(0, Number((round.options?.[stage] || []).length));
        clearStageTransition(false);
        state.stageTransition = {
            stage,
            patternId: String(round?.pattern?.id || ''),
            optionCount,
            expiresAt: Date.now() + 2800
        };
        state.stageTransitionHandle = setTimeout(() => {
            clearStageTransition(true);
        }, 2850);
        emitAlchemyFx('whoosh', { text: '\u05de\u05e2\u05d1\u05e8 \u05e9\u05dc\u05d1: ' + stageStepLabel(stage) });
    }
    function focusStageTop() {
        if (typeof window === 'undefined') return;
        window.requestAnimationFrame(() => {
            const anchor = appEl.querySelector('.cc-stage-transition-banner')
                || appEl.querySelector('.cc-question-line')
                || appEl.querySelector('.cc-practice-card-head');
            if (!anchor || typeof anchor.scrollIntoView !== 'function') return;
            try {
                anchor.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' });
            } catch (_error) {
                anchor.scrollIntoView();
            }
        });
    }

    function emitAlchemyFx(type, detail) {
        try {
            if (root.alchemyFx && typeof root.alchemyFx.emit === 'function') {
                root.alchemyFx.emit(type, detail || {});
                return;
            }
            if (typeof CustomEvent === 'function') {
                const payload = Object.assign({ type }, detail || {});
                document.dispatchEvent(new CustomEvent('alchemy:fx', { detail: payload }));
            }
        } catch (e) {}
    }

    function assetUrl(path) {
        const raw = String(path || '');
        const v = root.__CC_ASSET_V__;
        if (!v) return raw;
        const sep = raw.includes('?') ? '&' : '?';
        return `${raw}${sep}v=${encodeURIComponent(v)}`;
    }

    async function fetchJson(path) {
        const response = await fetch(assetUrl(path), { cache: 'no-store' });
        if (!response.ok) throw new Error(`HTTP ${response.status} loading ${path}`);
        return response.json();
    }

    async function gateClassicSentenceConsumption(source = 'classic-classic') {
        const api = root.MetaFreemium;
        if (!api || typeof api.consumeSentenceOrPrompt !== 'function') return true;
        try {
            const allowed = await api.consumeSentenceOrPrompt({ source, count: 1 });
            return allowed !== false;
        } catch (_error) {
            return true;
        }
    }

    function getPatternMap() {
        const map = new Map();
        (state.data?.patterns || []).forEach((pattern) => {
            map.set(pattern.id, pattern);
        });
        return map;
    }

    function normalizeFamilyFocus(family) {
        const value = String(family || '').trim().toLowerCase();
        if (value === 'deletion' || value === 'distortion' || value === 'generalization') return value;
        return 'all';
    }

    function getPatternsForCurrentFocus() {
        const allPatterns = Array.isArray(state.data?.patterns) ? state.data.patterns : [];
        const focus = normalizeFamilyFocus(state.familyFocus);
        const byFamily = focus === 'all'
            ? allPatterns
            : allPatterns.filter((pattern) => String(pattern?.family || '').toLowerCase() === focus);
        const maxDifficulty = normalizeDifficulty(state.settings?.difficulty);
        const byDifficulty = byFamily.filter((pattern) => {
            const level = Number(pattern?.difficulty);
            if (!Number.isFinite(level)) return true;
            return level <= maxDifficulty;
        });
        if (byDifficulty.length) return byDifficulty;
        if (byFamily.length) return byFamily;
        return allPatterns;
    }

    function familyFocusLabel(family) {
        const key = normalizeFamilyFocus(family);
        if (key === 'deletion') return 'DEL / מחיקות';
        if (key === 'distortion') return 'DIS / עיוותים';
        if (key === 'generalization') return 'GEN / הכללות';
        return 'כל המשפחות';
    }

    function familyLabel(family) {
        const f = String(family || '').toLowerCase();
        if (f === 'deletion') return 'DEL / מחיקות';
        if (f === 'distortion') return 'DIS / עיוותים';
        if (f === 'generalization') return 'GEN / הכללות';
        return family || '';
    }

    function stageLabel(stage) {
        if (stage === 'question') return 'שלב B · שאלה';
        if (stage === 'problem') return 'שלב C · הבעיה';
        if (stage === 'goal') return 'שלב D · המטרה';
        if (stage === 'summary') return 'סיכום סבב';
        return '';
    }

    function operationProfileForFamily(family) {
        const key = String(family || '').toLowerCase();
        if (key === 'deletion') {
            return {
                code: 'RECOVER',
                title: 'שחזור מידע',
                desc: 'מחזירים פרטים חסרים כדי להפוך את המפה לספציפית וברת-פעולה.'
            };
        }
        if (key === 'distortion') {
            return {
                code: 'CHECK / CHALLENGE',
                title: 'בדיקת קשר/משמעות',
                desc: 'בודקים ראיות, קריטריון או מנגנון לפני שמקבלים משמעות/סיבתיות.'
            };
        }
        if (key === 'generalization') {
            return {
                code: 'SCOPE / EXCEPTIONS',
                title: 'תיחום וחיפוש חריגים',
                desc: 'מוצאים תנאים, חריגים ומקור-כלל כדי להחזיר גמישות ובחירה.'
            };
        }
        return {
            code: 'META',
            title: 'דיוק מטא-מודלי',
            desc: 'שואלים כדי להחזיר מידע חסר ולבדוק הנחות.'
        };
    }

    function dataTargetLabel(key) {
        const value = String(key || '').trim();
        const map = {
            actors: 'שחקנים / מי מעורב',
            'alternative-meaning': 'משמעות חלופית',
            alternatives: 'חלופות אפשריות',
            assumption: 'הנחה סמויה',
            behavior: 'התנהגות נצפית',
            choice: 'נקודות בחירה',
            'compare-to': 'לעומת מה משווים',
            conditions: 'תנאים',
            consequence: 'תוצאה / מה יקרה אם',
            counterexamples: 'דוגמאות נגד / חריגים',
            criteria: 'קריטריונים',
            criterion: 'קריטריון',
            evidence: 'ראיות',
            'evidence-base': 'בסיס ראיות',
            exceptions: 'יוצאי דופן',
            frame: 'מסגרת / הקשר',
            frequency: 'תדירות',
            group: 'קבוצה ספציפית',
            judge: 'מי שופט / מקור הערכה',
            meaning: 'משמעות',
            'meaning-rule': 'כלל המשמעות (איך X=Y)',
            mechanism: 'מנגנון',
            mediation: 'מה קורה באמצע (תיווך)',
            metric: 'מדד',
            'observable-cues': 'רמזים נצפים',
            premise: 'הנחת יסוד',
            process: 'תהליך',
            referent: 'רפרנט / למה בדיוק הכוונה',
            resources: 'משאבים',
            'rule-source': 'מקור הכלל',
            scope: 'היקף / תיחום',
            sequence: 'רצף / סדר',
            'specific-person': 'אדם מסוים',
            standard: 'סטנדרט',
            steps: 'צעדים',
            what: 'מה בדיוק',
            when: 'מתי',
            who: 'מי'
        };
        return map[value] || value;
    }

    function formatTime(seconds) {
        const value = Math.max(0, Math.floor(Number(seconds) || 0));
        const mm = String(Math.floor(value / 60)).padStart(2, '0');
        const ss = String(value % 60).padStart(2, '0');
        return `${mm}:${ss}`;
    }

    function clampInt(value, min, max, fallback) {
        const n = Number(value);
        if (!Number.isFinite(n)) return fallback;
        return Math.max(min, Math.min(max, Math.round(n)));
    }

    function defaultPracticeSettings() {
        return {
            mode: 'learning',
            difficulty: 3,
            questionCount: 10,
            timerEnabled: true,
            familyFocus: 'all'
        };
    }

    function normalizeModeSetting(mode) {
        return mode === 'exam' ? 'exam' : 'learning';
    }

    function normalizeQuestionCount(count) {
        const allowed = [5, 10, 15];
        const n = clampInt(count, 5, 15, 10);
        return allowed.includes(n) ? n : 10;
    }

    function normalizeDifficulty(value) {
        return clampInt(value, 1, 5, 3);
    }

    function normalizeTimerEnabled(value) {
        if (typeof value === 'boolean') return value;
        if (typeof value === 'number') return value !== 0;
        const normalized = String(value || '').trim().toLowerCase();
        return !(normalized === 'false' || normalized === '0' || normalized === 'off' || normalized === 'no');
    }

    function normalizePracticeSettings(raw) {
        const defaults = defaultPracticeSettings();
        const input = raw && typeof raw === 'object' ? raw : {};
        return {
            mode: normalizeModeSetting(input.mode ?? defaults.mode),
            difficulty: normalizeDifficulty(input.difficulty ?? defaults.difficulty),
            questionCount: normalizeQuestionCount(input.questionCount ?? defaults.questionCount),
            timerEnabled: normalizeTimerEnabled(input.timerEnabled ?? defaults.timerEnabled),
            familyFocus: normalizeFamilyFocus(input.familyFocus ?? defaults.familyFocus)
        };
    }

    function syncLegacyFieldsFromSettings() {
        const settings = state.settings || defaultPracticeSettings();
        state.mode = normalizeModeSetting(settings.mode);
        state.familyFocus = normalizeFamilyFocus(settings.familyFocus);
    }

    function loadSavedPracticeSettings() {
        try {
            const raw = root.localStorage ? root.localStorage.getItem(SETTINGS_STORAGE_KEY) : '';
            if (!raw) {
                state.hasSavedSettings = false;
                return normalizePracticeSettings(defaultPracticeSettings());
            }
            const parsed = JSON.parse(raw);
            state.hasSavedSettings = true;
            return normalizePracticeSettings(parsed);
        } catch (error) {
            state.hasSavedSettings = false;
            return normalizePracticeSettings(defaultPracticeSettings());
        }
    }

    function persistPracticeSettings() {
        if (!state.settings) return;
        try {
            if (!root.localStorage) return;
            root.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(state.settings));
            state.hasSavedSettings = true;
        } catch (error) {}
    }

    function applySettings(nextSettings, options) {
        const cfg = options || {};
        state.settings = normalizePracticeSettings(nextSettings);
        syncLegacyFieldsFromSettings();
        if (cfg.persist !== false) persistPracticeSettings();
        if (cfg.render !== false) render();
    }

    function patchSettings(patch, options) {
        const next = Object.assign({}, state.settings || defaultPracticeSettings(), patch || {});
        applySettings(next, options);
    }

    function buildSessionConfigForSettings() {
        const base = configApi.GAME_CONFIG || engine.DEFAULT_CONFIG;
        const settings = normalizePracticeSettings(state.settings || defaultPracticeSettings());
        const difficulty = normalizeDifficulty(settings.difficulty);
        const questionCount = normalizeQuestionCount(settings.questionCount);
        const timerEnabled = !!settings.timerEnabled;
        const difficultyTimeFactor = ({ 1: 1.25, 2: 1.12, 3: 1, 4: 0.9, 5: 0.8 })[difficulty] || 1;
        const perRoundSecondsLearning = 55;
        const perRoundSecondsExam = 32;
        const learningSeconds = Math.max(180, Math.round(questionCount * perRoundSecondsLearning * difficultyTimeFactor));
        const examSeconds = Math.max(90, Math.round(questionCount * perRoundSecondsExam * difficultyTimeFactor));

        return {
            exam: Object.assign({}, base.exam, {
                sessionSeconds: timerEnabled ? examSeconds : 36000,
                lives: difficulty >= 4 ? 2 : base.exam.lives,
                timePenaltyOnWrong: timerEnabled ? base.exam.timePenaltyOnWrong : 0
            }),
            learning: Object.assign({}, base.learning, {
                sessionSeconds: timerEnabled ? learningSeconds : 36000,
                timePenaltyOnWrong: timerEnabled ? Math.max(0, difficulty - 1) : 0
            }),
            optionCounts: Object.assign({}, base.optionCounts),
            scoring: Object.assign({}, base.scoring),
            session: Object.assign({}, base.session, {
                examEndsRoundOnWrong: difficulty >= 5 ? true : base.session.examEndsRoundOnWrong
            })
        };
    }

    function getQuestionTarget() {
        return normalizeQuestionCount(state.settings?.questionCount);
    }

    function hasReachedQuestionTarget() {
        if (!state.session) return false;
        return Number(state.session.completedRounds || 0) >= getQuestionTarget();
    }

    function currentQuestionPosition() {
        if (!state.session) return { current: 0, total: getQuestionTarget() };
        const total = getQuestionTarget();
        const round = currentRound();
        const completed = Number(state.session.completedRounds || 0);
        const atRoundSummary = round?.stage === 'summary';
        const current = state.session.ended
            ? total
            : Math.min(total, atRoundSummary ? Math.max(1, completed) : Math.max(1, completed + 1));
        return { current, total };
    }

    function timerEnabledForSession() {
        return !!state.settings?.timerEnabled;
    }

    function shouldShowSessionSummary() {
        return !!(state.session && state.session.ended);
    }

    function randomizePracticeSettings() {
        const families = ['all', 'deletion', 'distortion', 'generalization'];
        const questionCounts = [5, 10, 15];
        const picked = {
            mode: Math.random() < 0.3 ? 'exam' : 'learning',
            difficulty: 1 + Math.floor(Math.random() * 5),
            questionCount: questionCounts[Math.floor(Math.random() * questionCounts.length)],
            timerEnabled: Math.random() < 0.7,
            familyFocus: families[Math.floor(Math.random() * families.length)]
        };
        applySettings(picked, { render: false });
    }

    function currentRound() {
        if (!state.session) return null;
        return engine.currentRound(state.session);
    }

    function resetRoundUiState() {
        state.feedback = null;
        state.hintMessage = '';
        state.hintUsedByStage = { question: false, problem: false, goal: false };
        state.lastSelectedOptionId = '';
        state.lastSelectedWasCorrect = null;
        clearStageTransition(false);
    }

    function createSession(seedSuffix) {
        syncLegacyFieldsFromSettings();
        const seed = `classic-classic:${state.mode}:${Date.now()}:${seedSuffix || 0}`;
        const patterns = getPatternsForCurrentFocus();
        state.session = engine.createSessionState({
            patterns,
            mode: state.mode,
            seed,
            config: buildSessionConfigForSettings()
        });
        state.appStage = SESSION_STATE_PRACTICE;
        state.setupOpen = false;
        state.settingsDrawerOpen = false;
        state.showRoundGuide = false;
        state.paused = false;
        resetRoundUiState();
        state.feedback = {
            tone: 'info',
            text: state.mode === 'exam'
                ? 'מצב מבחן פעיל: בלי רמזים/הסברים במהלך הריצה.'
                : 'מצב למידה פעיל: אפשר לעצור, לקבל רמז ולנסות שוב.'
        };
        ensureTimer();
        render();
    }

    function ensureTimer() {
        if (state.timerHandle) return;
        state.timerHandle = setInterval(() => {
            if (!state.session || state.session.ended) return;
            if (state.paused) return;
            if (!timerEnabledForSession()) return;
            engine.tickSession(state.session, 1);
            if (state.session.ended) {
                state.appStage = SESSION_STATE_SUMMARY;
                state.feedback = {
                    tone: state.session.endReason === 'lives' ? 'danger' : 'warn',
                    text: state.session.endReason === 'lives'
                        ? 'החיים נגמרו. מוצג דו"ח סיום.'
                        : 'הזמן הסתיים. מוצג דו"ח סיום.'
                };
            }
            render();
        }, 1000);
    }

    function stopTimer() {
        if (state.timerHandle) {
            clearInterval(state.timerHandle);
            state.timerHandle = null;
        }
        clearStageTransition(false);
    }

    function startNewRound() {
        if (!state.session || state.session.ended) return;
        if (hasReachedQuestionTarget()) {
            endSession('target-rounds');
            return;
        }
        try {
            engine.nextRound(state.session);
            resetRoundUiState();
            state.feedback = null;
            emitAlchemyFx('success', { text: 'Next round' });
        } catch (error) {
            state.feedback = { tone: 'warn', text: error.message || 'לא ניתן להתחיל סבב חדש עדיין.' };
        }
        render();
    }

    function endSession(reason) {
        if (!state.session) return;
        if (!state.session.ended) {
            engine.endSession(state.session, reason || 'manual');
        }
        state.appStage = SESSION_STATE_SUMMARY;
        state.settingsDrawerOpen = false;
        state.paused = false;
        emitAlchemyFx('mastery', { text: 'Session complete' });
        render();
    }

    function buildHintForStage(stage, round) {
        if (!round) return '';
        if (stage === 'question') {
            return 'חפש/י שאלה שמחזירה מידע חסר / קריטריון / תנאים, ולא שאלה שיפוטית או פתרון מוקדם.';
        }
        if (stage === 'problem') {
            return `“בעיה” = מה המבנה הלשוני יוצר במפה. רמז: ${round.pattern.problem?.oneLiner || ''}`;
        }
        if (stage === 'goal') {
            return `“מטרה” = איזה מידע חסר נחפש. רמז: ${round.pattern.goal?.oneLiner || ''}`;
        }
        return '';
    }

    function useHint() {
        const round = currentRound();
        if (!round || round.stage === 'summary') return;
        if (state.mode !== 'learning') return;
        if (state.hintUsedByStage[round.stage]) return;
        state.hintUsedByStage[round.stage] = true;
        state.hintMessage = buildHintForStage(round.stage, round);
        emitAlchemyFx('whoosh', { text: 'Hint' });
        state.feedback = { tone: 'info', text: 'רמז מוצג (פעם אחת לשלב).' };
        render();
    }

    function submitOption(optionId) {
        if (!state.session || state.session.ended) return;
        const round = currentRound();
        if (!round || round.stage === 'summary') return;
        const stageBeforeSubmit = String(round.stage || '');

        const now = Date.now();
        if (state.submitInFlight) return;
        if ((now - Number(state.lastSubmitAt || 0)) < 90) return;

        state.submitInFlight = true;
        state.lastSubmitAt = now;
        try {
            state.lastSelectedOptionId = String(optionId || '');
            const result = engine.submitStageAnswer(state.session, optionId);
            state.lastSelectedWasCorrect = !!result.ok;

            if (result.ok) {
                state.hintMessage = '';
                if (result.completedRound) {
                    state.feedback = {
                        tone: 'success',
                        text: 'סבב הושלם. עברו על הסיכום ואז המשיכו לתבנית הבאה.'
                    };
                } else {
                    const nextRound = currentRound();
                    const nextStage = String(result.nextStage || '');
                    const optionCount = Math.max(0, Number((nextRound?.options?.[nextStage] || []).length));
                    state.feedback = {
                        tone: 'success',
                        text: '\u05e0\u05db\u05d5\u05df! \u05de\u05d4 \u05e7\u05e8\u05d4 \u05e2\u05db\u05e9\u05d9\u05d5: \u05e2\u05d1\u05e8\u05ea \u05dc' + stageTransitionTitle(nextStage) + '. \u05de\u05d4 \u05e2\u05d5\u05e9\u05d9\u05dd \u05e2\u05db\u05e9\u05d9\u05d5: ' + stageTransitionActionHint(nextStage) + ' \u05d4\u05d5\u05e6\u05d2\u05d5 ' + optionCount + ' \u05d0\u05e4\u05e9\u05e8\u05d5\u05d9\u05d5\u05ea \u05d7\u05d3\u05e9\u05d5\u05ea.'
                    };
                    if (stageBeforeSubmit !== nextStage) {
                        activateStageTransition(nextRound, nextStage);
                        focusStageTop();
                    }
                }
            } else if (state.mode === 'learning') {
                state.feedback = {
                    tone: 'warn',
                    text: result.explanation || 'לא מדויק. נסו שוב.'
                };
            } else {
                const livesText = Number.isFinite(result.livesLeft) ? ` | חיים: ${result.livesLeft}` : '';
                state.feedback = {
                    tone: result.livesLeft <= 0 ? 'danger' : 'warn',
                    text: `לא נכון.${livesText}`
                };
            }

            if (state.session.ended) {
                state.appStage = SESSION_STATE_SUMMARY;
            }
            if (state.session.ended && !state.feedback) {
                state.feedback = {
                    tone: 'danger',
                    text: 'הסשן הסתיים.'
                };
            }
        } catch (error) {
            state.feedback = {
                tone: 'danger',
                text: '����� ���� ����� ������ ������. ��� ���.'
            };
            emitAlchemyFx('almost', { text: 'Retry' });
        } finally {
            state.submitInFlight = false;
            render();
        }
    }

    function togglePause() {
        if (!state.session || state.session.ended) return;
        if (state.mode !== 'learning') return;
        state.paused = !state.paused;
        state.feedback = {
            tone: 'info',
            text: state.paused ? 'הטיימר מושהה.' : 'הטיימר חודש.'
        };
        render();
    }

    function setMode(mode) {
        const normalized = mode === 'exam' ? 'exam' : 'learning';
        const currentMode = state.mode;
        patchSettings({ mode: normalized }, { render: false });
        if (normalized === currentMode && state.session) return;
        state.mode = normalized;
        if (state.loaded && state.data) {
            createSession('mode-switch');
        }
        render();
    }

    function setFamilyFocus(family) {
        const normalized = normalizeFamilyFocus(family);
        const nextFocus = normalized === state.familyFocus ? 'all' : normalized;
        patchSettings({ familyFocus: nextFocus }, { render: false });
        state.familyFocus = nextFocus;
        if (state.loaded && state.data) {
            createSession(`focus:${nextFocus}`);
            state.feedback = {
                tone: 'info',
                text: nextFocus === 'all'
                    ? 'פוקוס משפחה בוטל. ממשיכים עם כל התבניות.'
                    : `פוקוס תרגול: ${familyFocusLabel(nextFocus)}. נפתח סשן חדש לפי המשפחה שנבחרה.`
            };
        }
        render();
    }

    function togglePhilosopher(forceValue) {
        if (typeof forceValue === 'boolean') {
            state.showPhilosopher = forceValue;
        } else {
            state.showPhilosopher = !state.showPhilosopher;
        }
        render();
    }

    function toggleRoundGuide(forceValue) {
        if (typeof forceValue === 'boolean') {
            state.showRoundGuide = forceValue;
        } else {
            state.showRoundGuide = !state.showRoundGuide;
        }
        render();
    }

    async function handleAction(action) {
        if (!action) return;
        if (
            action === 'continue-last-settings' ||
            action === 'start-session' ||
            action === 'random-start' ||
            action === 'apply-settings-and-restart' ||
            action === 'restart-session' ||
            action === 'next-round'
        ) {
            const canProceed = await gateClassicSentenceConsumption(`classic-classic:${action}`);
            if (!canProceed) return;
        }
        if (action === 'open-setup') {
            state.setupOpen = true;
            state.settingsDrawerOpen = false;
            render();
            return;
        }
        if (action === 'close-setup') {
            state.setupOpen = false;
            render();
            return;
        }
        if (action === 'continue-last-settings') {
            createSession('continue-last');
            render();
            return;
        }
        if (action === 'start-session') {
            createSession('setup-start');
            render();
            return;
        }
        if (action === 'random-start') {
            randomizePracticeSettings();
            createSession('setup-random');
            render();
            return;
        }
        if (action === 'open-settings-drawer') {
            state.settingsDrawerOpen = true;
            render();
            return;
        }
        if (action === 'close-settings-drawer') {
            state.settingsDrawerOpen = false;
            render();
            return;
        }
        if (action === 'apply-settings-and-restart') {
            createSession('settings-restart');
            render();
            return;
        }
        if (action === 'back-to-intro') {
            state.session = null;
            state.appStage = SESSION_STATE_INTRO;
            state.setupOpen = false;
            state.settingsDrawerOpen = false;
            state.paused = false;
            state.feedback = null;
            resetRoundUiState();
            render();
            return;
        }
        if (action === 'show-before-start') return togglePhilosopher(true);
        if (action === 'mode-learning') return setMode('learning');
        if (action === 'mode-exam') return setMode('exam');
        if (action === 'restart-session') return createSession('restart');
        if (action === 'toggle-pause') return togglePause();
        if (action === 'use-hint') return useHint();
        if (action === 'next-round') return startNewRound();
        if (action === 'end-session') return endSession('manual');
        if (action === 'toggle-round-guide') return toggleRoundGuide();
        if (action === 'toggle-philosopher') return togglePhilosopher();
        if (action === 'close-philosopher') return togglePhilosopher(false);
    }

    function getStageCopy(round) {
        const stage = round?.stage || '';
        if (stage === 'question') {
            return {
                title: 'בחר/י שאלה מתאימה לתבנית',
                desc: 'יש 2 שאלות תקינות מתוך 5. מספיק לבחור אחת טובה כדי לעבור שלב.',
                kicker: stageLabel(stage)
            };
        }
        if (stage === 'problem') {
            return {
                title: 'מה הבעיה בהפרה הזו?',
                desc: 'בחר/י את התיאור שמתאר מה המבנה הלשוני יוצר במפה.',
                kicker: stageLabel(stage)
            };
        }
        if (stage === 'goal') {
            return {
                title: 'מה המטרה / איזה מידע נחפש?',
                desc: 'בחר/י את יעד המידע המדויק שנרצה להחזיר בשאלת המטה-מודל.',
                kicker: stageLabel(stage)
            };
        }
        return {
            title: 'סיכום סבב',
            desc: 'סקירה מהירה של התבנית, השאלות, הבעיה והמטרה לפני המעבר לסבב הבא.',
            kicker: stageLabel(stage)
        };
    }

    function getVisibleOptions(round) {
        if (!round || round.stage === 'summary') return [];
        return round.options[round.stage] || [];
    }

    function getCorrectOptionIds(round, stage) {
        return new Set(((round?.options?.[stage]) || []).filter((opt) => opt.isCorrect).map((opt) => String(opt.id)));
    }

    function getFamilyHelpTexts() {
        return {
            deletion: 'מחיקות: חסר מידע קונקרטי (מי/מה/איך/מתי).',
            distortion: 'עיוותים: פרשנות/קשר/משמעות מוצגים כעובדה.',
            generalization: 'הכללות: כלל רחב/קשיח מוחל על מקרים רבים.'
        };
    }

    function renderHeader(session) {
        const round = currentRound();
        const canPause = state.mode === 'learning';
        const timerTone = session && session.timeLeftSeconds <= 30 ? 'warn' : '';
        const livesChip = state.mode === 'exam'
            ? `<span class="cc-stat-chip" data-tone="${session && session.livesLeft <= 1 ? 'warn' : ''}">
                חיים <strong>${Number.isFinite(session?.livesLeft) ? session.livesLeft : '-'}</strong>
              </span>`
            : '';
        const focusLabel = familyFocusLabel(state.familyFocus);
        const currentStage = session?.ended ? 'סשן הסתיים' : (stageLabel(round?.stage || '') || 'שלב');

        return `
          <header class="cc-panel cc-header">
            <div class="cc-header-row">
              <div class="cc-brand">
                <h1>Classic Classic · מאמן מטא-מודל</h1>
                <p>בוחרים שאלה, מזהים בעיה במפה, מגדירים יעד מידע, ומסכמים את התבנית.</p>
              </div>
              <div class="cc-mode-toggle" role="tablist" aria-label="מצב עבודה">
                <button type="button" class="cc-mode-btn ${state.mode === 'learning' ? 'is-active' : ''}" data-cc-action="mode-learning">למידה</button>
                <button type="button" class="cc-mode-btn ${state.mode === 'exam' ? 'is-active' : ''}" data-cc-action="mode-exam">מבחן</button>
              </div>
            </div>
            <div class="cc-header-row">
              <div class="cc-stats">
                <span class="cc-stat-chip" data-tone="${timerTone}">זמן <strong>${formatTime(session?.timeLeftSeconds || 0)}</strong></span>
                <span class="cc-stat-chip">ניקוד <strong>${session?.score ?? 0}</strong></span>
                <span class="cc-stat-chip">רצף <strong>${session?.streak ?? 0}</strong></span>
                ${livesChip}
              </div>
              <div class="cc-actions">
                <button type="button" class="cc-btn cc-btn-ghost" data-cc-action="toggle-philosopher" aria-pressed="${state.showPhilosopher ? 'true' : 'false'}">הסבר מורחב</button>
                <button type="button" class="cc-btn cc-btn-secondary" data-cc-action="toggle-pause" ${!canPause || !session || session.ended ? 'disabled' : ''}>${state.paused ? 'המשך' : 'השהה'}</button>
                <button type="button" class="cc-btn cc-btn-ghost" data-cc-action="restart-session">סשן חדש</button>
                <button type="button" class="cc-btn cc-btn-primary" data-cc-action="end-session" ${!session || session.ended ? 'disabled' : ''}>סיים סשן</button>
              </div>
            </div>
            <div class="cc-inline-meta" aria-label="מידע על הסבב">
              <span class="cc-focus-chip">פוקוס: <strong>${escapeHtml(focusLabel)}</strong></span>
              <span class="cc-focus-chip">שלב: <strong>${escapeHtml(currentStage)}</strong></span>
              ${round?.pattern ? `<span class="cc-focus-chip">תבנית: <strong>${escapeHtml(round.pattern.name)}</strong></span>` : ''}
            </div>
          </header>
        `;
    }

    function renderBreenPanel(round) {
        const cells = state.data?.breenTable?.cells || [];
        const currentPattern = round?.pattern || null;
        const activeCellId = currentPattern?.breenCellId || '';
        const currentFocus = normalizeFamilyFocus(state.familyFocus);

        return `
          <aside class="cc-panel cc-side" aria-label="מפת Breen למשפחות דפוסים">
            <div>
              <h2>מפת Michael Breen (משפחות דפוסים)</h2>
            </div>

            <div class="cc-breen-toolbar">
              <button type="button" class="cc-tag-btn ${currentFocus === 'all' ? 'is-active' : ''}" data-cc-family-focus="all">כל המשפחות</button>
            </div>

            <div class="cc-breen-grid">
              ${cells.map((cell) => {
                  const familyKey = normalizeFamilyFocus(cell.family);
                  const isActive = String(cell.id) === String(activeCellId);
                  const isFocus = currentFocus !== 'all' && familyKey === currentFocus;
                  return `
                    <button type="button" class="cc-breen-cell ${isActive ? 'is-active' : ''} ${isFocus ? 'is-focus' : ''}" data-cell-id="${escapeHtml(cell.id)}" data-cc-family-focus="${escapeHtml(cell.family || '')}">
                      <span class="cc-cell-code">${escapeHtml(cell.label)}</span>
                      <span class="cc-cell-label">${escapeHtml(cell.labelHe || cell.family || cell.id)}</span>
                    </button>
                  `;
              }).join('')}
            </div>

            <div class="cc-current-pattern-card">
              <small>תבנית פעילה</small>
              <strong>${escapeHtml(currentPattern?.name || 'ממתין לבחירת תבנית')}</strong>
              <span class="cc-sub">${escapeHtml(currentPattern ? familyLabel(currentPattern.family) : familyFocusLabel(state.familyFocus))}</span>
            </div>
          </aside>
        `;
    }

    function renderFlowGuide(round) {
        if (!round) return '';
        const stage = round.stage;
        const steps = [
            { id: 'question', label: '1. שאלה' },
            { id: 'problem', label: '2. בעיה' },
            { id: 'goal', label: '3. מטרה' },
            { id: 'summary', label: '4. סיכום' }
        ];
        const currentIndex = steps.findIndex((step) => step.id === stage);

        return `
          <section class="cc-flow-guide" aria-label="רצף שלבי הסבב">
            <div class="cc-flow-head">
              <strong>איך הסבב מתקדם</strong>
              <span>רואים את סדר השלבים כדי להבין איפה אתם עכשיו ומה יגיע מיד אחר כך.</span>
            </div>
            <div class="cc-flow-steps">
              ${steps.map((step, index) => {
                  const classes = [
                      'cc-flow-step',
                      stage === step.id ? 'is-current' : '',
                      currentIndex > index ? 'is-done' : ''
                  ].filter(Boolean).join(' ');
                  return `<div class="${classes}"><div class="cc-flow-step-title">${escapeHtml(step.label)}</div></div>`;
              }).join('')}
            </div>
          </section>
        `;
    }

    function renderTaskCompass(round) {
        if (!round) return '';
        const stage = round.stage;
        const copy = getStageCopy(round);
        const taskMap = {
            question: {
                action: 'בחר/י שאלה אחת נכונה מתוך 5 אפשרויות.',
                why: 'המטרה היא להחזיר מידע חסר או קריטריון/תנאי, לא פתרון מוקדם או פרשנות.',
                check: 'האם השאלה מבקשת פירוט, עדות, תנאים, או מי/מה/איך/מתי?'
            },
            problem: {
                action: 'בחר/י איזה מבנה לשוני יוצר את הבעיה במפה.',
                why: 'כאן מזהים את סוג ההטיה לפני שבוחרים את השאלה המדויקת.',
                check: 'האם בחרת תיאור של הבעיה (ולא פתרון או המלצה)?'
            },
            goal: {
                action: 'בחר/י איזה מידע חסר נרצה להחזיר דרך שאלת מטא-מודל.',
                why: 'המטרה היא יעד מידע ברור (Data Target): מי/מה/איך/מתי/ראיה/קריטריון.',
                check: 'האם המידע המבוקש הופך את המשפט ליותר מדויק ובר-בדיקה?'
            },
            summary: {
                action: 'עבר/י על הסיכום ואז המשך/י לתבנית הבאה.',
                why: 'הסיכום מחבר בין התבנית, השאלה, הבעיה והמטרה.',
                check: 'האם ברור לך מה מחפשים בשלב הבא לפני מעבר?'
            }
        };
        const task = taskMap[stage] || taskMap.question;
        return `
          <section class="cc-task-compass" aria-label="מצפן הצעד הנוכחי">
            <div class="cc-task-head">
              <strong>מה עושים עכשיו</strong>
              <span>${escapeHtml(copy.kicker || '')}</span>
            </div>
            <div class="cc-task-grid">
              <div class="cc-task-card">
                <div class="cc-task-label">מה עושים</div>
                <div class="cc-task-text">${escapeHtml(task.action)}</div>
              </div>
              <div class="cc-task-card">
                <div class="cc-task-label">למה זה חשוב</div>
                <div class="cc-task-text">${escapeHtml(task.why)}</div>
              </div>
              <div class="cc-task-card">
                <div class="cc-task-label">בדיקת כיוון</div>
                <div class="cc-task-text">${escapeHtml(task.check)}</div>
              </div>
            </div>
          </section>
        `;
    }

    function renderRoundGuidePanel(round) {
        if (!round) return '';
        const copy = getStageCopy(round);
        const stage = round.stage;
        const steps = [
            { id: 'question', label: '1. שאלה' },
            { id: 'problem', label: '2. בעיה' },
            { id: 'goal', label: '3. מטרה' },
            { id: 'summary', label: '4. סיכום' }
        ];
        const currentIndex = steps.findIndex((step) => step.id === stage);
        const examples = Array.isArray(round.pattern?.examples) ? round.pattern.examples.slice(0, 2) : [];

        return `
          <section class="cc-round-guide ${state.showRoundGuide ? 'is-open' : ''}" aria-label="הסבר קצר לתרגיל">
            <div class="cc-round-guide-shell">
              <div class="cc-round-guide-copy">
                <span class="cc-round-guide-kicker">${escapeHtml(copy.kicker || '')}</span>
                <strong>${escapeHtml(copy.title || '')}</strong>
              </div>
              <button
                type="button"
                class="cc-round-guide-btn"
                data-cc-action="toggle-round-guide"
                aria-expanded="${state.showRoundGuide ? 'true' : 'false'}"
                aria-controls="cc-round-guide-body">
                <span class="cc-round-guide-btn-badge">${state.showRoundGuide ? 'פתוח' : 'עזרה'}</span>
                <span class="cc-round-guide-btn-text">${state.showRoundGuide ? 'סגור הסבר ודוגמא' : 'מה עושים פה?'}</span>
              </button>
            </div>

            <div class="cc-round-guide-progress" aria-label="התקדמות בשלבים">
              ${steps.map((step, index) => {
                  const classes = [
                      'cc-round-guide-pill',
                      step.id === stage ? 'is-current' : '',
                      currentIndex > index ? 'is-done' : ''
                  ].filter(Boolean).join(' ');
                  return `<span class="${classes}">${escapeHtml(step.label)}</span>`;
              }).join('')}
            </div>

            ${state.showRoundGuide ? `
              <div id="cc-round-guide-body" class="cc-round-guide-body">
                ${copy.desc ? `<div class="cc-round-guide-intro">${escapeHtml(copy.desc)}</div>` : ''}
                <div class="cc-round-guide-grid">
                  ${renderTaskCompass(round)}
                  ${renderFlowGuide(round)}
                </div>

                <section class="cc-round-guide-example" aria-label="דוגמה והרחבה">
                  <div class="cc-round-guide-example-head">
                    <strong>דוגמה מהתבנית הנוכחית</strong>
                    <span>${escapeHtml(round.pattern?.name || '')}</span>
                  </div>
                  ${examples.length ? `
                    <div class="cc-round-guide-example-list">
                      ${examples.map((example) => `<div class="cc-round-guide-example-item">${escapeHtml(example)}</div>`).join('')}
                    </div>
                  ` : `<div class="cc-round-guide-example-item">אין דוגמה זמינה לתבנית הזו כרגע.</div>`}
                  <div class="cc-round-guide-actions">
                    <button type="button" class="cc-btn cc-btn-ghost" data-cc-action="toggle-philosopher">
                      הסבר מורחב + עקרונות
                    </button>
                  </div>
                </section>
              </div>
            ` : ''}
          </section>
        `;
    }

    function renderPhilosopherOverlay(round) {
        if (!state.showPhilosopher) return '';
        const copy = state.copy || {};
        const operation = operationProfileForFamily(round?.pattern?.family);
        const modeTitle = state.mode === 'exam' ? 'מצב מבחן' : 'מצב למידה';
        const modeText = state.mode === 'exam' ? (copy.examMode || '') : (copy.learningMode || '');

        return `
          <div class="cc-philosopher-overlay" role="dialog" aria-modal="true" aria-label="עקרונות - הסבר">
            <div class="cc-philosopher-dialog">
              <div class="cc-philosopher-head">
                <div>
                  <h3>מה עושים כאן ולמה זה חשוב</h3>
                  <p>מסך עזר קצר: מה לבדוק בכל שלב, ואיך לחשוב לפני בחירת תשובה.</p>
                </div>
                <button type="button" class="cc-btn cc-btn-ghost" data-cc-action="close-philosopher">סגור</button>
              </div>
              <div class="cc-philosopher-grid">
                <div class="cc-summary-block">
                  <h4>מהו Meta Model?</h4>
                  <p>${escapeHtml(copy.metaModelPurpose || '')}</p>
                </div>
                <div class="cc-summary-block">
                  <h4>שלב C - מה הבעיה?</h4>
                  <p>${escapeHtml(copy.problemDefinition || '')}</p>
                </div>
                <div class="cc-summary-block">
                  <h4>שלב D - מה המטרה?</h4>
                  <p>${escapeHtml(copy.goalDefinition || '')}</p>
                </div>
                <div class="cc-summary-block">
                  <h4>${escapeHtml(modeTitle)}</h4>
                  <p>${escapeHtml(modeText)}</p>
                </div>
                <div class="cc-summary-block">
                  <h4>פעולה קלאסית (Structure of Magic)</h4>
                  <p><strong>${escapeHtml(operation.code)}</strong> · ${escapeHtml(operation.title)}</p>
                  <p>${escapeHtml(operation.desc)}</p>
                </div>
              </div>
            </div>
          </div>
        `;
    }

    function renderOptions(round) {
        const stage = round.stage;
        const options = getVisibleOptions(round);
        const correctIds = getCorrectOptionIds(round, stage);
        const showCorrectReveal = stage === 'summary';

        return `
          <div class="cc-options" role="list">
            ${options.map((option, index) => {
                const id = String(option.id);
                const isSelected = state.lastSelectedOptionId === id && round.stage === stage;
                let className = 'cc-option-btn';
                if (isSelected) className += ' is-selected';
                if (state.lastSelectedOptionId && id === state.lastSelectedOptionId && state.lastSelectedWasCorrect === false) className += ' is-wrong';
                if (state.lastSelectedOptionId && id === state.lastSelectedOptionId && state.lastSelectedWasCorrect === true) className += ' is-correct';
                if (showCorrectReveal && correctIds.has(id)) className += ' is-correct';
                return `
                  <button
                    type="button"
                    class="${className}"
                    data-cc-option-id="${escapeHtml(id)}"
                    ${state.session.ended ? 'disabled' : ''}
                    ${state.paused ? 'disabled' : ''}>
                    <span class="cc-option-num">${index + 1}</span>
                    <span>${escapeHtml(option.text)}</span>
                  </button>
                `;
            }).join('')}
          </div>
        `;
    }

    function renderStageCard(round) {
        const stage = round.stage;
        const copy = getStageCopy(round);
        const operation = operationProfileForFamily(round.pattern?.family);
        const canUseHint = state.mode === 'learning'
            && stage !== 'summary'
            && !state.session.ended
            && !state.hintUsedByStage[stage];

        const roundCorrectQuestionTexts = (round.options.question || [])
            .filter((option) => option.isCorrect)
            .map((option) => option.text);

        if (stage === 'summary') {
            return `
              <section class="cc-stage-card">
                <div class="cc-stage-head">
                  <span class="cc-stage-kicker">${escapeHtml(copy.kicker)}</span>
                  <h3>${escapeHtml(copy.title)}</h3>
                  <p>${escapeHtml(copy.desc)}</p>
                </div>
                <div class="cc-summary-grid">
                  <div class="cc-summary-block">
                    <h4>תבנית</h4>
                    <p><strong>${escapeHtml(round.pattern.name)}</strong></p>
                    <p>${escapeHtml(round.pattern.definition || '')}</p>
                  </div>
                  <div class="cc-summary-block">
                    <h4>שתי שאלות מתאימות</h4>
                    <ul>
                      ${roundCorrectQuestionTexts.map((text) => `<li>${escapeHtml(text)}</li>`).join('')}
                    </ul>
                  </div>
                  <div class="cc-summary-block">
                    <h4>הבעיה במפה</h4>
                    <p>${escapeHtml(round.pattern.problem?.oneLiner || '')}</p>
                  </div>
                  <div class="cc-summary-block">
                    <h4>המטרה / יעד מידע</h4>
                    <p>${escapeHtml(round.pattern.goal?.oneLiner || '')}</p>
                    <ul>
                      ${(round.pattern.goal?.dataTargets || []).map((item) => `<li>${escapeHtml(dataTargetLabel(item))}</li>`).join('')}
                    </ul>
                  </div>
                  <div class="cc-summary-block">
                    <h4>פעולה קלאסית (Structure of Magic)</h4>
                    <p><strong>${escapeHtml(operation.code)}</strong> · ${escapeHtml(operation.title)}</p>
                    <p>${escapeHtml(operation.desc)}</p>
                  </div>
                </div>
                <div class="cc-inline-actions">
                  <button type="button" class="cc-btn cc-btn-primary" data-cc-action="next-round" ${state.session.ended ? 'disabled' : ''}>תבנית הבאה</button>
                  <button type="button" class="cc-btn cc-btn-secondary" data-cc-action="end-session">סיים סשן</button>
                </div>
              </section>
            `;
        }

        const examples = Array.isArray(round.pattern.examples) ? round.pattern.examples.slice(0, 3) : [];
        return `
          <section class="cc-stage-card">
            <div class="cc-stage-head">
              <span class="cc-stage-kicker">${escapeHtml(copy.kicker)}</span>
              <h3>${escapeHtml(copy.title)}</h3>
              <p>${escapeHtml(copy.desc)}</p>
            </div>

            <div class="cc-pattern-strip">
              <div class="cc-pattern-family">${escapeHtml(familyLabel(round.pattern.family))}</div>
              <div class="cc-pattern-name">${escapeHtml(round.pattern.name)}</div>
              <div class="cc-pattern-definition">${escapeHtml(round.pattern.definition || '')}</div>
              <div class="cc-pattern-definition"><strong>פעולה:</strong> ${escapeHtml(operation.title)}</div>
            </div>

            <div class="cc-examples" aria-label="דוגמאות">
              ${examples.map((example) => `<div class="cc-example-chip">${escapeHtml(example)}</div>`).join('')}
            </div>

            ${renderOptions(round)}

            ${state.hintMessage ? `<div class="cc-hint-box">${state.hintMessage}</div>` : ''}
            ${state.feedback ? `<div class="cc-feedback" data-tone="${escapeHtml(state.feedback.tone || 'info')}">${escapeHtml(state.feedback.text || '')}</div>` : ''}

            <div class="cc-inline-actions">
              <button type="button" class="cc-btn cc-btn-secondary" data-cc-action="use-hint" ${canUseHint ? '' : 'disabled'}>רמז</button>
              <button type="button" class="cc-btn cc-btn-ghost" data-cc-action="restart-session">התחל מחדש</button>
            </div>
          </section>
        `;
    }

    function renderReport() {
        if (!state.session) return '';
        const report = engine.buildEndSessionReport(state.session);
        const patternMap = getPatternMap();
        const copy = state.copy || {};
        return `
          <section class="cc-stage-card cc-report" aria-label="דוח סיום סשן">
            <div class="cc-stage-head">
              <span class="cc-stage-kicker">דוח סיום</span>
              <h3>דו"ח סשן</h3>
              <p>${escapeHtml(state.mode === 'learning' ? (copy.learningMode || '') : (copy.examMode || ''))}</p>
            </div>

            <div class="cc-report-grid">
              <div class="cc-report-stat"><strong>${report.overall.accuracy}%</strong><span>דיוק כולל</span></div>
              <div class="cc-report-stat"><strong>${report.score}</strong><span>ניקוד</span></div>
              <div class="cc-report-stat"><strong>${report.completedRounds}</strong><span>סבבים שהושלמו</span></div>
            </div>

            <div class="cc-summary-block">
              <h4>דיוק לפי משפחה</h4>
              <table class="cc-table">
                <thead>
                  <tr><th>משפחה</th><th>דיוק</th><th>נכון</th><th>שגוי</th></tr>
                </thead>
                <tbody>
                  ${(report.perFamily || []).map((row) => `
                    <tr>
                      <td>${escapeHtml(familyLabel(row.family))}</td>
                      <td>${row.accuracy}%</td>
                      <td>${row.correctStages}</td>
                      <td>${row.wrongStages}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>

            <div class="cc-summary-block">
              <h4>תבניות חלשות</h4>
              ${(report.weakPatterns || []).length ? `
                <ul class="cc-bullet-list">
                  ${(report.weakPatterns || []).map((row) => {
                      const p = patternMap.get(row.patternId);
                      return `<li><strong>${escapeHtml(p?.name || row.patternId)}</strong> · ${row.accuracy}% · טעויות: ${row.wrongStages}</li>`;
                  }).join('')}
                </ul>
              ` : `<div class="cc-empty">אין מספיק נתונים כדי לזהות דפוסים חלשים.</div>`}
            </div>

            ${state.mode === 'learning' ? `
              <div class="cc-summary-block">
                <h4>טיפים לחזרה</h4>
                <ul class="cc-bullet-list">
                  <li>${escapeHtml(copy.problemDefinition || '')}</li>
                  <li>${escapeHtml(copy.goalDefinition || '')}</li>
                  <li>חפש/י קודם מה חסר במפה לפני פתרון או פרשנות.</li>
                </ul>
              </div>
            ` : ''}

            <div class="cc-inline-actions">
              <button type="button" class="cc-btn cc-btn-primary" data-cc-action="restart-session">סשן חדש</button>
              <button type="button" class="cc-btn cc-btn-secondary" data-cc-action="mode-learning">עבור ללמידה</button>
              <button type="button" class="cc-btn cc-btn-secondary" data-cc-action="mode-exam">עבור למבחן</button>
            </div>
          </section>
        `;
    }

    function renderMainPanel() {
        const session = state.session;
        if (!session) {
            return `<main class="cc-panel cc-main"><div class="cc-loading">מכין סשן...</div></main>`;
        }
        const round = currentRound();
        const stageCard = session.ended ? renderReport() : renderStageCard(round);

        return `
          <main class="cc-panel cc-main" aria-label="פאנל המשחק">
            ${!session.ended && round ? renderRoundGuidePanel(round) : ''}
            ${stageCard}
            ${renderPhilosopherOverlay(round)}
          </main>
        `;
    }

    function renderLoaded() {
        const session = state.session;
        const round = currentRound();
        appEl.innerHTML = `
          ${renderHeader(session)}
          <div class="cc-layout">
            ${renderMainPanel()}
            ${renderBreenPanel(round)}
          </div>
        `;
    }

    function render() {
        state.renderNonce += 1;
        if (!state.loaded) {
            appEl.innerHTML = `<div class="cc-loading">${escapeHtml(state.loadError || 'טוען נתונים…')}</div>`;
            return;
        }
        renderLoaded();
    }

    // New 3-state RTL UI (declared late so it overrides legacy render helpers)
    function familyLabelSimple(family) {
        const key = normalizeFamilyFocus(family);
        if (key === 'deletion') return 'מחיקות';
        if (key === 'distortion') return 'עיוותים';
        if (key === 'generalization') return 'הכללות';
        return 'הכול';
    }

    function stageStepLabel(stage) {
        if (stage === 'question') return 'שאלה';
        if (stage === 'problem') return 'בעיה';
        if (stage === 'goal') return 'מטרה';
        if (stage === 'summary') return 'סיכום';
        return '';
    }

    function getPromptTextForRound(round) {
        const examples = Array.isArray(round?.pattern?.examples) ? round.pattern.examples.filter(Boolean) : [];
        if (examples.length) {
            const idx = Math.max(0, (state.session?.completedRounds || 0) % examples.length);
            return String(examples[idx] || examples[0] || '').trim();
        }
        return String(round?.pattern?.definition || '').trim();
    }

    function feedbackTitleForTone(tone) {
        if (tone === 'success') return 'נכון';
        if (tone === 'warn') return 'כמעט';
        if (tone === 'danger') return 'נעצר';
        return 'המשך';
    }

    function stageQuestionPrompt(round) {
        const stage = round?.stage || '';
        if (stage === 'question') return 'מה השאלה הכי מדויקת כדי להחזיר מידע חסר?';
        if (stage === 'problem') return 'מה הבעיה הלשונית המרכזית כאן?';
        if (stage === 'goal') return 'מה יעד המידע שכדאי לברר עכשיו?';
        return 'מה התבנית המרכזית?';
    }

    function renderSettingsControls(scope) {
        const settings = normalizePracticeSettings(state.settings || defaultPracticeSettings());
        const modeName = `cc-mode-${scope}`;
        const countName = `cc-count-${scope}`;
        const selectId = `cc-family-${scope}`;

        return `
          <div class="cc-settings-stack">
            <div class="cc-form-block">
              <div class="cc-form-label">מצב</div>
              <div class="cc-choice-row">
                <label class="cc-choice-pill ${settings.mode === 'learning' ? 'is-active' : ''}">
                  <input type="radio" name="${modeName}" value="learning" data-cc-setting="mode" ${settings.mode === 'learning' ? 'checked' : ''}>
                  <span>לימוד</span>
                </label>
                <label class="cc-choice-pill ${settings.mode === 'exam' ? 'is-active' : ''}">
                  <input type="radio" name="${modeName}" value="exam" data-cc-setting="mode" ${settings.mode === 'exam' ? 'checked' : ''}>
                  <span>מבחן</span>
                </label>
              </div>
            </div>

            <div class="cc-form-block">
              <div class="cc-form-label-row">
                <span>קושי</span>
                <strong>${settings.difficulty}</strong>
              </div>
              <input class="cc-range" type="range" min="1" max="5" step="1" value="${settings.difficulty}" data-cc-setting="difficulty" aria-label="קושי">
              <div class="cc-range-scale"><span>קל</span><span>בינוני</span><span>מאתגר</span></div>
            </div>

            <div class="cc-form-block">
              <div class="cc-form-label">מספר שאלות</div>
              <div class="cc-choice-row">
                ${[5, 10, 15].map((count) => `
                  <label class="cc-choice-pill ${settings.questionCount === count ? 'is-active' : ''}">
                    <input type="radio" name="${countName}" value="${count}" data-cc-setting="questionCount" ${settings.questionCount === count ? 'checked' : ''}>
                    <span>${count}</span>
                  </label>
                `).join('')}
              </div>
            </div>

            <div class="cc-form-block cc-toggle-row">
              <label class="cc-switch">
                <input type="checkbox" data-cc-setting="timerEnabled" ${settings.timerEnabled ? 'checked' : ''}>
                <span class="cc-switch-track" aria-hidden="true"></span>
                <span class="cc-switch-copy">
                  <strong>טיימר</strong>
                  <small>${settings.timerEnabled ? 'פעיל' : 'כבוי'}</small>
                </span>
              </label>
            </div>

            <details class="cc-advanced-panel" data-cc-details-key="advanced:${escapeHtml(scope)}" ${isDetailOpen(`advanced:${scope}`) ? 'open' : ''}>
              <summary>אפשרויות מתקדמות</summary>
              <div class="cc-advanced-panel-body">
                <label class="cc-field-vertical" for="${selectId}">
                  <span>קטגוריות לתרגול</span>
                  <select id="${selectId}" class="cc-select" data-cc-setting="familyFocus">
                    <option value="all" ${settings.familyFocus === 'all' ? 'selected' : ''}>הכול</option>
                    <option value="deletion" ${settings.familyFocus === 'deletion' ? 'selected' : ''}>מחיקות</option>
                    <option value="distortion" ${settings.familyFocus === 'distortion' ? 'selected' : ''}>עיוותים</option>
                    <option value="generalization" ${settings.familyFocus === 'generalization' ? 'selected' : ''}>הכללות</option>
                  </select>
                </label>
                <div class="cc-advanced-note">ההגדרות נשמרות אוטומטית ויוצעו בפעם הבאה.</div>
              </div>
            </details>
          </div>
        `;
    }

    function renderSettingsSummaryLine() {
        const s = normalizePracticeSettings(state.settings || defaultPracticeSettings());
        return `
          <div class="cc-settings-summary-line">
            <span>${s.mode === 'exam' ? 'מבחן' : 'לימוד'}</span>
            <span>קושי ${s.difficulty}</span>
            <span>${s.questionCount} שאלות</span>
            <span>${s.timerEnabled ? 'עם טיימר' : 'ללא טיימר'}</span>
            <span>${familyLabelSimple(s.familyFocus)}</span>
          </div>
        `;
    }

    function renderSetupModal() {
        if (!state.setupOpen) return '';
        return `
          <div class="cc-layer cc-layer-center" role="dialog" aria-modal="true" aria-label="הגדרות תרגול">
            <div class="cc-modal-card">
              <div class="cc-modal-head">
                <div>
                  <div class="cc-modal-kicker">Classic Meta Model</div>
                  <h2>Classic Meta Model — זיהוי תבניות</h2>
                  <p>אתם מקבלים קטע דיבור קצר. המשימה: לזהות את המבנה המרכזי, לקבל משוב, ולהמשיך בקצב נקי.</p>
                </div>
                <button type="button" class="cc-icon-btn" data-cc-action="close-setup" aria-label="סגור">×</button>
              </div>
              ${renderSettingsControls('setup')}
              <div class="cc-modal-actions">
                <button type="button" class="cc-btn cc-btn-primary" data-cc-action="start-session">התחל</button>
                <button type="button" class="cc-btn cc-btn-secondary" data-cc-action="random-start">הגרל</button>
                <button type="button" class="cc-btn cc-btn-ghost" data-cc-action="close-setup">סגור</button>
              </div>
              ${state.hasSavedSettings ? `<div class="cc-modal-foot"><button type="button" class="cc-link-btn" data-cc-action="continue-last-settings">המשך עם ההגדרות האחרונות</button></div>` : ''}
            </div>
          </div>
        `;
    }

    function renderPhilosopherOverlay(round) {
        if (!state.showPhilosopher) return '';
        const copy = state.copy || {};
        const operation = operationProfileForFamily(round?.pattern?.family);
        const examples = Array.isArray(round?.pattern?.examples) ? round.pattern.examples.slice(0, 2) : [];
        return `
          <div class="cc-layer cc-layer-center" role="dialog" aria-modal="true" aria-label="לפני שמתחילים">
            <div class="cc-modal-card cc-modal-card-wide">
              <div class="cc-modal-head">
                <div>
                  <div class="cc-modal-kicker">לפני שמתחילים (30 שניות)</div>
                  <h2>מה המטרה כאן?</h2>
                  <p>המטרה היא לפתח עין למבנה השפה: לזהות הכללה, מחיקה או עיוות לפני שנכנסים לפרשנות.</p>
                </div>
                <button type="button" class="cc-icon-btn" data-cc-action="close-philosopher" aria-label="סגור">×</button>
              </div>
              <div class="cc-summary-grid">
                <div class="cc-summary-block">
                  <h4>מה עושים בפועל</h4>
                  <p>${escapeHtml(copy.metaModelPurpose || 'מזהים מה חסר/מוכלל/מעוות בשפה ובוחרים תגובה מדויקת יותר.')}</p>
                </div>
                <div class="cc-summary-block">
                  <h4>מה לחפש</h4>
                  <p>${escapeHtml(copy.problemDefinition || 'מה המבנה הלשוני יוצר במפה של הדובר/ת?')}</p>
                </div>
                <div class="cc-summary-block">
                  <h4>מה המטרה בשאלה</h4>
                  <p>${escapeHtml(copy.goalDefinition || 'להחזיר מידע חסר, לבדוק הנחה, או לצמצם הכללה.')}</p>
                </div>
                <div class="cc-summary-block">
                  <h4>כיוון קלאסי</h4>
                  <p><strong>${escapeHtml(operation.code)}</strong> · ${escapeHtml(operation.title)}</p>
                  <p>${escapeHtml(operation.desc)}</p>
                </div>
                ${examples.length ? `<div class="cc-summary-block"><h4>דוגמה מהתרגול</h4><ul>${examples.map((x) => `<li>${escapeHtml(x)}</li>`).join('')}</ul></div>` : ''}
              </div>
            </div>
          </div>
        `;
    }

    function renderOptions(round) {
        const stage = round?.stage;
        const options = getVisibleOptions(round);
        const correctIds = getCorrectOptionIds(round, stage);
        const transition = getStageTransitionForRound(round);
        const optionsClasses = ['cc-options', 'cc-options-grid', transition ? 'is-stage-transition' : ''].filter(Boolean).join(' ');
        return `
          <div class="${optionsClasses}" data-cc-stage="${escapeHtml(stage || '')}" role="list" aria-label="\u05d0\u05e4\u05e9\u05e8\u05d5\u05d9\u05d5\u05ea \u05ea\u05e9\u05d5\u05d1\u05d4">
            ${options.map((option, index) => {
                const id = String(option.id);
                const isSelected = state.lastSelectedOptionId === id;
                let className = 'cc-option-btn';
                if (isSelected) className += ' is-selected';
                if (isSelected && state.lastSelectedWasCorrect === false) className += ' is-wrong';
                if (isSelected && state.lastSelectedWasCorrect === true) className += ' is-correct';
                if (stage === 'summary' && correctIds.has(id)) className += ' is-correct';
                return `
                  <button type="button" class="${className}" data-cc-option-id="${escapeHtml(id)}" ${state.session?.ended ? 'disabled' : ''} ${state.paused ? 'disabled' : ''}>
                    <span class="cc-option-num">${index + 1}</span>
                    <span>${escapeHtml(option.text)}</span>
                  </button>
                `;
            }).join('')}
          </div>
        `;
    }

    function renderStageProgressPills(round) {
        const stage = round?.stage || '';
        const steps = ['question', 'problem', 'goal', 'summary'];
        const currentIndex = steps.indexOf(stage);
        return `
          <div class="cc-mini-steps" aria-label="התקדמות בסבב">
            ${steps.map((id, index) => {
                const classes = ['cc-mini-step', id === stage ? 'is-current' : '', currentIndex > index ? 'is-done' : ''].filter(Boolean).join(' ');
                return `<span class="${classes}">${escapeHtml(stageStepLabel(id))}</span>`;
            }).join('')}
          </div>
        `;
    }

    function renderFeedbackBox(round) {
        if (!state.feedback && !state.hintMessage) return '';
        const tone = state.feedback?.tone || 'info';
        const headline = feedbackTitleForTone(tone);
        const message = state.feedback?.text || state.hintMessage || '';
        const examples = Array.isArray(round?.pattern?.examples) ? round.pattern.examples.slice(0, 2) : [];
        const goodQs = ((round?.options?.question) || []).filter((opt) => opt.isCorrect).map((opt) => opt.text).slice(0, 2);
        const detailsKey = 'feedback:' + Number(state.session?.completedRounds || 0) + ':' + String(round?.pattern?.id || '') + ':' + String(round?.stage || '');
        return `
          <section class="cc-feedback-panel" data-tone="${escapeHtml(tone)}" aria-live="polite">
            <div class="cc-feedback-main"><strong>${escapeHtml(headline)}</strong><span>${escapeHtml(message)}</span></div>
            <details class="cc-feedback-details" data-cc-details-key="${escapeHtml(detailsKey)}" ${isDetailOpen(detailsKey) ? 'open' : ''}>
              <summary>הצג הסבר</summary>
              <div class="cc-feedback-details-body">
                ${state.hintMessage ? `<p>${escapeHtml(state.hintMessage)}</p>` : ''}
                ${round?.pattern?.definition ? `<p><strong>תבנית:</strong> ${escapeHtml(round.pattern.definition)}</p>` : ''}
                ${round?.pattern?.problem?.oneLiner ? `<p><strong>הבעיה:</strong> ${escapeHtml(round.pattern.problem.oneLiner)}</p>` : ''}
                ${round?.pattern?.goal?.oneLiner ? `<p><strong>מטרת בירור:</strong> ${escapeHtml(round.pattern.goal.oneLiner)}</p>` : ''}
                ${goodQs.length ? `<div class="cc-feedback-list"><div class="cc-feedback-list-title">שאלות טובות אפשריות</div>${goodQs.map((x) => `<div class="cc-feedback-list-item">${escapeHtml(x)}</div>`).join('')}</div>` : ''}
                ${examples.length ? `<div class="cc-feedback-list"><div class="cc-feedback-list-title">דוגמאות</div>${examples.map((x) => `<div class="cc-feedback-list-item">${escapeHtml(x)}</div>`).join('')}</div>` : ''}
              </div>
            </details>
          </section>
        `;
    }

    function renderRoundSummaryCard(round) {
        const reachedTarget = hasReachedQuestionTarget();
        const primaryAction = reachedTarget ? 'end-session' : 'next-round';
        const primaryLabel = reachedTarget ? 'לסיכום' : 'לשאלה הבאה';
        const operation = operationProfileForFamily(round?.pattern?.family);
        return `
          <section class="cc-practice-card cc-round-summary-card">
            <div class="cc-practice-card-head">
              <div class="cc-card-kicker">סיום שאלה</div>
              <h2>${escapeHtml(round?.pattern?.name || 'סיכום')}</h2>
              <p>${escapeHtml(round?.pattern?.definition || '')}</p>
            </div>
            <div class="cc-summary-grid">
              <div class="cc-summary-block"><h4>משפחה</h4><p>${escapeHtml(familyLabelSimple(round?.pattern?.family))}</p></div>
              <div class="cc-summary-block"><h4>כיוון עבודה</h4><p>${escapeHtml(operation.title)}</p><p>${escapeHtml(operation.desc)}</p></div>
              <div class="cc-summary-block"><h4>מה חידדנו</h4><p>${escapeHtml(round?.pattern?.problem?.oneLiner || '')}</p></div>
            </div>
            ${renderFeedbackBox(round)}
            <div class="cc-primary-actions">
              <button type="button" class="cc-btn cc-btn-primary cc-btn-big" data-cc-action="${primaryAction}">${primaryLabel}</button>
              <button type="button" class="cc-btn cc-btn-ghost" data-cc-action="end-session">סיום עכשיו</button>
            </div>
          </section>
        `;
    }

    function renderStageTransitionBanner(round) {
        const transition = getStageTransitionForRound(round);
        if (!transition) return '';
        const stageText = stageTransitionTitle(transition.stage);
        const optionCount = Math.max(0, Number(transition.optionCount || 0));
        return `
          <div class="cc-stage-transition-banner" data-cc-stage="${escapeHtml(transition.stage)}" role="status" aria-live="polite">
            <strong>\u05de\u05e2\u05d1\u05e8 \u05d1\u05e8\u05d5\u05e8: ${escapeHtml(stageText)}</strong>
            <span>\u05d4\u05d5\u05d8\u05e2\u05e0\u05d5 ${optionCount} \u05d0\u05e4\u05e9\u05e8\u05d5\u05d9\u05d5\u05ea \u05d7\u05d3\u05e9\u05d5\u05ea. ${escapeHtml(stageTransitionActionHint(transition.stage))}</span>
          </div>
        `;
    }

    function renderPracticeCard(round) {
        if (!round) {
            return `<section class="cc-practice-card"><div class="cc-loading">\u05d8\u05d5\u05e2\u05df \u05ea\u05e8\u05d2\u05d5\u05dc...</div></section>`;
        }
        if (round.stage === 'summary') return renderRoundSummaryCard(round);

        const stageCopy = getStageCopy(round);
        const promptText = getPromptTextForRound(round);
        const operation = operationProfileForFamily(round.pattern?.family);
        const canUseHint = state.mode === 'learning' && !state.session?.ended && !state.hintUsedByStage[round.stage];

        return `
          <section class="cc-practice-card" data-cc-stage="${escapeHtml(round.stage || '')}">
            <div class="cc-practice-card-head">
              <div class="cc-card-kicker">${escapeHtml(stageCopy.kicker || '')}</div>
              <h2>${escapeHtml(stageQuestionPrompt(round))}</h2>
              <p>${escapeHtml(stageCopy.desc || '')}</p>
            </div>
            <div class="cc-client-card" data-cc-stage="${escapeHtml(round.stage || '')}" aria-label="\u05e7\u05d8\u05e2 \u05d3\u05d9\u05d1\u05d5\u05e8">
              <div class="cc-client-card-head"><span>קטע דיבור</span><small>${escapeHtml(familyLabelSimple(round.pattern?.family))}</small></div>
              <div class="cc-client-text">${escapeHtml(promptText || 'אין טקסט לדוגמה')}</div>
            </div>
            <div class="cc-question-line" data-cc-stage="${escapeHtml(round.stage || '')}"><strong>${escapeHtml(stageQuestionPrompt(round))}</strong><span>${escapeHtml(operation.title)}</span></div>
            ${renderStageTransitionBanner(round)}
            ${renderFeedbackBox(round)}
            ${renderOptions(round)}
            <div class="cc-practice-actions">
              <button type="button" class="cc-btn cc-btn-secondary" data-cc-action="use-hint" ${canUseHint ? '' : 'disabled'}>רמז</button>
              <button type="button" class="cc-btn cc-btn-ghost" data-cc-action="toggle-pause" ${state.mode !== 'learning' || state.session?.ended ? 'disabled' : ''}>${state.paused ? 'המשך' : 'השהיה'}</button>
              <button type="button" class="cc-btn cc-btn-ghost" data-cc-action="restart-session">התחל מחדש</button>
            </div>
          </section>
        `;
    }

    function renderPracticeTopBar(session, round) {
        const progress = currentQuestionPosition();
        const timerTone = timerEnabledForSession() && session?.timeLeftSeconds <= 30 ? 'warn' : '';
        const timerText = timerEnabledForSession() ? formatTime(session?.timeLeftSeconds || 0) : 'ללא טיימר';
        const livesChip = state.mode === 'exam'
            ? `<div class="cc-top-chip" data-tone="${session?.livesLeft <= 1 ? 'warn' : ''}"><span>חיים</span><strong>${Number.isFinite(session?.livesLeft) ? session.livesLeft : '-'}</strong></div>`
            : '';
        return `
          <header class="cc-practice-bar">
            <div class="cc-practice-bar-main">
              <div class="cc-top-chip"><span>שאלה</span><strong>${progress.current}/${progress.total}</strong></div>
              <div class="cc-top-chip"><span>ניקוד</span><strong>${session?.score ?? 0}</strong></div>
              <div class="cc-top-chip" data-tone="${timerTone}"><span>זמן</span><strong>${escapeHtml(timerText)}</strong></div>
              ${livesChip}
            </div>
            <div class="cc-practice-bar-actions">
              <button type="button" class="cc-icon-btn" data-cc-action="show-before-start" aria-label="לפני שמתחילים">?</button>
              <button type="button" class="cc-icon-btn" data-cc-action="open-settings-drawer" aria-label="הגדרות">⚙</button>
            </div>
          </header>
        `;
    }

    function renderSettingsDrawer() {
        if (!state.settingsDrawerOpen) return '';
        return `
          <div class="cc-layer cc-layer-side" role="dialog" aria-modal="true" aria-label="הגדרות">
            <div class="cc-drawer">
              <div class="cc-drawer-head">
                <div>
                  <div class="cc-modal-kicker">הגדרות</div>
                  <h2>שינוי הגדרות תרגול</h2>
                  <p>הגדרות נשמרות אוטומטית. כדי להחיל על הסשן הנוכחי, הפעילו מחדש.</p>
                </div>
                <button type="button" class="cc-icon-btn" data-cc-action="close-settings-drawer" aria-label="סגור">×</button>
              </div>
              ${renderSettingsControls('drawer')}
              <div class="cc-modal-actions">
                <button type="button" class="cc-btn cc-btn-primary" data-cc-action="apply-settings-and-restart">הפעל מחדש עם ההגדרות</button>
                <button type="button" class="cc-btn cc-btn-ghost" data-cc-action="close-settings-drawer">סגור</button>
              </div>
            </div>
          </div>
        `;
    }

    function renderPracticeScreen() {
        const session = state.session;
        const round = currentRound();
        return `
          <div class="cc-practice-shell" aria-label="תרגול מטה מודל">
            ${renderPracticeTopBar(session, round)}
            <div class="cc-practice-meta-row">
              <button type="button" class="cc-link-btn" data-cc-action="show-before-start">לפני שמתחילים (30 שניות)</button>
              ${renderSettingsSummaryLine()}
            </div>
            ${round ? renderStageProgressPills(round) : ''}
            ${renderPracticeCard(round)}
            ${renderSettingsDrawer()}
            ${renderPhilosopherOverlay(round)}
          </div>
        `;
    }

    function buildSummarySuggestions(report) {
        const patternMap = getPatternMap();
        const suggestions = [];
        const weakestFamily = (report.perFamily || []).slice().sort((a, b) => a.accuracy - b.accuracy)[0];
        const weakestPattern = (report.weakPatterns || [])[0];
        if (weakestFamily) {
            suggestions.push(`סשן הבא: להתמקד ב-${familyLabelSimple(weakestFamily.family)} כדי לחזק דיוק בסיסי.`);
        }
        if (weakestPattern) {
            const patternName = patternMap.get(weakestPattern.patternId)?.name || weakestPattern.patternId;
            suggestions.push(`חזרה ממוקדת על "${patternName}" לפני העלאת קושי.`);
        }
        if ((report.overall?.accuracy || 0) >= 80) {
            suggestions.push('אפשר לעלות קושי או לעבור למצב מבחן לסשן הבא.');
        } else {
            suggestions.push('עדיף עוד סשן קצר במצב לימוד עם רמז אחד לכל שאלה.');
        }
        while (suggestions.length < 3) {
            suggestions.push('שמרו על קצב קצר ועקבי: עדיף 5–10 שאלות ביום מאשר סשן ארוך ומתיש.');
        }
        return suggestions.slice(0, 3);
    }

    function renderSummaryScreen() {
        if (!state.session) return '';
        const report = engine.buildEndSessionReport(state.session);
        const patternMap = getPatternMap();
        const weakPatterns = (report.weakPatterns || []).slice(0, 3);
        const strongestFamilies = (report.perFamily || []).slice().sort((a, b) => b.accuracy - a.accuracy).slice(0, 2);
        const suggestions = buildSummarySuggestions(report);

        return `
          <div class="cc-summary-shell" aria-label="סיכום תרגול">
            <section class="cc-summary-hero">
              <div class="cc-modal-kicker">סיכום</div>
              <h1>סיכום תרגול Meta Model</h1>
              <p>סיימתם ${report.completedRounds} שאלות. הנה מה השתפר, איפה כדאי לדייק, ומה מומלץ לתרגל בהמשך.</p>
            </section>

            <div class="cc-report-grid cc-report-grid-modern">
              <div class="cc-report-stat"><strong>${report.overall.accuracy}%</strong><span>דיוק כולל</span></div>
              <div class="cc-report-stat"><strong>${report.score}</strong><span>ניקוד</span></div>
              <div class="cc-report-stat"><strong>${report.completedRounds}</strong><span>שאלות שהושלמו</span></div>
            </div>

            <div class="cc-summary-grid">
              <div class="cc-summary-block">
                <h4>3 המלצות אימון</h4>
                <ul>
                  ${suggestions.map((text) => `<li>${escapeHtml(text)}</li>`).join('')}
                </ul>
              </div>

              <div class="cc-summary-block">
                <h4>מה הכי התבלבל</h4>
                ${weakPatterns.length ? `
                  <ul>
                    ${weakPatterns.map((row) => {
                        const p = patternMap.get(row.patternId);
                        return `<li><strong>${escapeHtml(p?.name || row.patternId)}</strong> · ${row.accuracy}% דיוק · טעויות: ${row.wrongStages}</li>`;
                    }).join('')}
                  </ul>
                ` : '<p>אין מספיק נתונים כדי לזהות דפוסים חלשים.</p>'}
              </div>

              <div class="cc-summary-block">
                <h4>מה הלך טוב</h4>
                ${strongestFamilies.length ? `
                  <ul>
                    ${strongestFamilies.map((row) => `<li>${escapeHtml(familyLabelSimple(row.family))} · ${row.accuracy}%</li>`).join('')}
                  </ul>
                ` : '<p>בסשן קצר מאוד עדיין אין מספיק נתונים להשוואה.</p>'}
              </div>
            </div>

            <div class="cc-primary-actions">
              <button type="button" class="cc-btn cc-btn-primary cc-btn-big" data-cc-action="restart-session">תרגול נוסף באותה רמה</button>
              <button type="button" class="cc-btn cc-btn-secondary" data-cc-action="open-setup">שנה הגדרות</button>
              <button type="button" class="cc-btn cc-btn-ghost" data-cc-action="back-to-intro">חזרה לפתיחה</button>
            </div>

            ${renderSetupModal()}
            ${renderPhilosopherOverlay(currentRound())}
          </div>
        `;
    }

    function renderIntroScreen() {
        const settings = normalizePracticeSettings(state.settings || defaultPracticeSettings());
        return `
          <div class="cc-entry-shell" aria-label="פתיחת תרגול">
            <section class="cc-entry-card">
              <div class="cc-modal-kicker">Classic Meta Model</div>
              <h1>Classic Meta Model — זיהוי תבניות</h1>
              <p>אתם מקבלים קטע דיבור של “מטופל”. המשימה: לזהות את המבנה המרכזי, לקבל משוב מיידי, ולהמשיך לשאלה הבאה.</p>
              <p class="cc-entry-sub">פתיח קצר פעם אחת, ואז מסך תרגול נקי בלי בלוקי הגדרות קבועים.</p>
              ${renderSettingsSummaryLine()}
              <div class="cc-primary-actions">
                <button type="button" class="cc-btn cc-btn-primary cc-btn-big" data-cc-action="open-setup">התחל תרגול</button>
                ${state.hasSavedSettings ? `<button type="button" class="cc-btn cc-btn-secondary" data-cc-action="continue-last-settings">המשך עם ההגדרות האחרונות</button>` : ''}
                <button type="button" class="cc-btn cc-btn-ghost" data-cc-action="show-before-start">לפני שמתחילים (30 שניות)</button>
              </div>
              <div class="cc-entry-mini">
                <span>מצב: ${settings.mode === 'exam' ? 'מבחן' : 'לימוד'}</span>
                <span>קושי: ${settings.difficulty}</span>
                <span>קטגוריה: ${familyLabelSimple(settings.familyFocus)}</span>
              </div>
            </section>
            ${renderSetupModal()}
            ${renderPhilosopherOverlay(currentRound())}
          </div>
        `;
    }

    function renderLoaded() {
        if (shouldShowSessionSummary()) {
            state.appStage = SESSION_STATE_SUMMARY;
        } else if (state.session) {
            state.appStage = SESSION_STATE_PRACTICE;
        } else {
            state.appStage = SESSION_STATE_INTRO;
        }

        if (!state.session || state.appStage === SESSION_STATE_INTRO) {
            appEl.innerHTML = renderIntroScreen();
            return;
        }
        if (state.appStage === SESSION_STATE_SUMMARY) {
            appEl.innerHTML = renderSummaryScreen();
            return;
        }
        appEl.innerHTML = renderPracticeScreen();
    }

    function render() {
        state.renderNonce += 1;
        if (!state.loaded) {
            appEl.innerHTML = `<div class="cc-loading">${escapeHtml(state.loadError || 'טוען נתונים...')}</div>`;
            return;
        }
        renderLoaded();
    }

    function bindEvents() {
        appEl.addEventListener('click', (event) => {
            const actionEl = event.target.closest('[data-cc-action]');
            if (actionEl) {
                void handleAction(actionEl.getAttribute('data-cc-action'));
                return;
            }

            const familyFocusEl = event.target.closest('[data-cc-family-focus]');
            if (familyFocusEl) {
                setFamilyFocus(familyFocusEl.getAttribute('data-cc-family-focus'));
                return;
            }

            const optionEl = event.target.closest('[data-cc-option-id]');
            if (optionEl) {
                submitOption(optionEl.getAttribute('data-cc-option-id'));
            }
        });

        appEl.addEventListener('toggle', (event) => {
            const detailsEl = event?.target?.closest?.('details[data-cc-details-key]');
            if (!detailsEl) return;
            const key = detailsEl.getAttribute('data-cc-details-key');
            setDetailOpen(key, !!detailsEl.open);
        });

        function applySettingFromInput(target) {
            const settingKey = target?.getAttribute?.('data-cc-setting');
            if (!settingKey) return;
            let value;
            if (target.type === 'checkbox') {
                value = !!target.checked;
            } else if (target.type === 'radio') {
                if (!target.checked) return;
                value = target.value;
            } else {
                value = target.value;
            }
            patchSettings({ [settingKey]: value });
        }

        appEl.addEventListener('change', (event) => {
            applySettingFromInput(event.target);
        });

        appEl.addEventListener('input', (event) => {
            const target = event.target;
            if (target?.matches?.('input[type="range"][data-cc-setting]')) {
                applySettingFromInput(target);
            }
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                if (state.showPhilosopher) {
                    event.preventDefault();
                    togglePhilosopher(false);
                    return;
                }
                if (state.settingsDrawerOpen) {
                    event.preventDefault();
                    state.settingsDrawerOpen = false;
                    render();
                    return;
                }
                if (state.setupOpen) {
                    event.preventDefault();
                    state.setupOpen = false;
                    render();
                    return;
                }
            }
            if (!state.session || state.session.ended || state.paused) return;
            if (state.setupOpen || state.settingsDrawerOpen || state.showPhilosopher) return;
            const round = currentRound();
            if (!round || round.stage === 'summary') return;
            const digit = Number(event.key);
            if (!Number.isInteger(digit) || digit < 1 || digit > 5) return;
            const options = getVisibleOptions(round);
            const picked = options[digit - 1];
            if (!picked) return;
            event.preventDefault();
            submitOption(picked.id);
        });
    }

    async function init() {
        render();
        bindEvents();
        try {
            const [data, copy] = await Promise.all([
                fetchJson('data/metaModelPatterns.he.json'),
                fetchJson('data/copy.he.json')
            ]);
            state.data = data;
            state.copy = copy;
            state.settings = loadSavedPracticeSettings();
            syncLegacyFieldsFromSettings();
            state.loaded = true;
            state.appStage = SESSION_STATE_INTRO;
            render();
        } catch (error) {
            state.loadError = `שגיאה בטעינת Classic Classic: ${error.message || error}`;
            state.loaded = false;
            render();
        }
    }

    init();

    root.addEventListener('beforeunload', () => {
        stopTimer();
    });
})();

