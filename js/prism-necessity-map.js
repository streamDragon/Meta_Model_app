(function attachPrismNecessityMap(global, document) {
    'use strict';

    if (!global || !document) return;

    const ROOT_SELECTOR = '[data-prism-necessity-app]';
    const STYLE_PATH = 'css/prism-necessity.css';
    const DATA_SOURCE = 'data/prism-necessity.json';

    const LEVEL_ORDER = Object.freeze([
        'environment',
        'behavior',
        'capability',
        'values_beliefs',
        'identity',
        'purpose_meaning'
    ]);

    const DISPLAY_LEVEL_ORDER = Object.freeze([...LEVEL_ORDER].reverse());

    const LEVEL_META = Object.freeze({
        environment: { label: 'סביבה', shortLabel: 'סביבה' },
        behavior: { label: 'התנהגות', shortLabel: 'התנהגות' },
        capability: { label: 'יכולת', shortLabel: 'יכולת' },
        values_beliefs: { label: 'אמונות / ערכים', shortLabel: 'אמונה' },
        identity: { label: 'זהות', shortLabel: 'זהות' },
        purpose_meaning: { label: 'משמעות / שייכות', shortLabel: 'משמעות' }
    });

    let payloadPromise = null;
    let payloadCache = null;

    function escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function normalizeText(value) {
        return String(value ?? '').replace(/\s+/g, ' ').trim();
    }

    function normalizeLevel(level) {
        const normalized = normalizeText(level).toLowerCase();
        if (normalized === 'capability_strategy') return 'capability';
        if (normalized === 'beliefs_values') return 'values_beliefs';
        if (normalized === 'belonging_mission') return 'purpose_meaning';
        return LEVEL_META[normalized] ? normalized : 'behavior';
    }

    function normalizeScore(score) {
        const numeric = Number(score);
        if (!Number.isFinite(numeric)) return 0;
        return Math.max(0, Math.min(5, Math.round(numeric)));
    }

    function shortenText(value, maxLength = 64) {
        const safe = normalizeText(value);
        if (!safe || safe.length <= maxLength) return safe;
        return `${safe.slice(0, Math.max(0, maxLength - 1)).trim()}…`;
    }

    function resolveAssetPath(filePath) {
        if (typeof global.__withAssetVersion === 'function') {
            try {
                return global.__withAssetVersion(filePath);
            } catch (_error) {
                return filePath;
            }
        }
        const version = String(global.__META_MODEL_ASSET_V__ || global.__PRISM_LAB_ASSET_V__ || '').trim();
        if (!version) return filePath;
        return `${filePath}${filePath.includes('?') ? '&' : '?'}v=${encodeURIComponent(version)}`;
    }

    function ensureStylesheet() {
        if (document.querySelector('link[data-prism-necessity-style="true"]')) return;
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = resolveAssetPath(STYLE_PATH);
        link.setAttribute('data-prism-necessity-style', 'true');
        document.head.appendChild(link);
    }

    async function fetchJson(sourcePath) {
        const response = await fetch(resolveAssetPath(sourcePath), { cache: 'force-cache' });
        if (!response.ok) {
            throw new Error(`Failed to load ${sourcePath}: HTTP ${response.status}`);
        }
        return response.json();
    }

    function getLevelLabel(levelId) {
        return LEVEL_META[levelId]?.label || 'רמה';
    }

    function getLevelShortLabel(levelId) {
        return LEVEL_META[levelId]?.shortLabel || getLevelLabel(levelId);
    }

    function getSideDescriptor(side) {
        return side === 'b' ? 'B · תוצאה / עצמי' : 'A · מקור / טריגר';
    }

    function getSideTitle(session, side) {
        return side === 'b'
            ? normalizeText(session?.sideBLabel) || 'צד תוצאה / עצמי'
            : normalizeText(session?.sideALabel) || 'צד מקור / טריגר';
    }

    function levelOrderIndex(levelId) {
        const index = LEVEL_ORDER.indexOf(levelId);
        return index === -1 ? LEVEL_ORDER.length : index;
    }

    function sortQuestions(left, right) {
        const levelDiff = levelOrderIndex(left.levelId) - levelOrderIndex(right.levelId);
        if (levelDiff !== 0) return levelDiff;
        return (left.side === 'a' ? 0 : 1) - (right.side === 'a' ? 0 : 1);
    }

    function mapQuestion(rawQuestion, fallbackIndex) {
        const question = normalizeText(rawQuestion?.question);
        const answer = normalizeText(rawQuestion?.answer);
        if (!question || !answer) return null;
        return {
            id: `${fallbackIndex + 1}`,
            side: rawQuestion?.side === 'b' ? 'b' : 'a',
            levelId: normalizeLevel(rawQuestion?.level),
            question,
            answer,
            score: normalizeScore(rawQuestion?.score),
            orderIndex: fallbackIndex
        };
    }

    function mapSession(rawSession, index) {
        const orderedQuestions = (Array.isArray(rawSession?.questions) ? rawSession.questions : [])
            .map((entry, questionIndex) => mapQuestion(entry, questionIndex))
            .filter(Boolean)
            .sort(sortQuestions)
            .map((question, orderIndex) => ({
                ...question,
                orderIndex
            }));

        if (!orderedQuestions.length) return null;

        const rowsByLevel = LEVEL_ORDER.reduce((acc, levelId) => {
            acc[levelId] = {
                levelId,
                label: getLevelLabel(levelId),
                shortLabel: getLevelShortLabel(levelId),
                a: null,
                b: null
            };
            return acc;
        }, {});

        orderedQuestions.forEach((question) => {
            rowsByLevel[question.levelId][question.side] = question;
        });

        return {
            id: String(rawSession?.id ?? index + 1),
            sentence: normalizeText(rawSession?.sentence),
            category: normalizeText(rawSession?.category),
            sideALabel: normalizeText(rawSession?.sideA_label) || 'צד מקור / טריגר',
            sideBLabel: normalizeText(rawSession?.sideB_label) || 'צד תוצאה / עצמי',
            questions: orderedQuestions,
            rows: DISPLAY_LEVEL_ORDER.map((levelId) => rowsByLevel[levelId]),
            core: normalizeLevel(rawSession?.core),
            crack: normalizeLevel(rawSession?.crack),
            reflectCore: normalizeText(rawSession?.reflectCore),
            reflectCrack: normalizeText(rawSession?.reflectCrack),
            punchQuestion: normalizeText(rawSession?.punchQ),
            punchAnswer: normalizeText(rawSession?.punchA)
        };
    }

    async function loadPayload() {
        if (payloadCache) return payloadCache;
        if (payloadPromise) return payloadPromise;

        payloadPromise = fetchJson(DATA_SOURCE)
            .then((rawPayload) => {
                const sessions = (Array.isArray(rawPayload) ? rawPayload : [])
                    .map((entry, index) => mapSession(entry, index))
                    .filter(Boolean);

                if (!sessions.length) {
                    throw new Error('No Necessity Map sessions were found in the dataset.');
                }

                payloadCache = { sessions };
                return payloadCache;
            })
            .finally(() => {
                payloadPromise = null;
            });

        return payloadPromise;
    }

    function createState(root) {
        return {
            root,
            mode: root.getAttribute('data-prism-necessity-mode') || 'embedded',
            loaded: false,
            error: '',
            payload: null,
            stage: 'intro',
            sessionIndex: 0,
            stepIndex: 0,
            scrollToTop: false
        };
    }

    function getSessions(state) {
        return Array.isArray(state.payload?.sessions) ? state.payload.sessions : [];
    }

    function wrapIndex(index, total) {
        if (!total) return 0;
        return ((index % total) + total) % total;
    }

    function getSession(state) {
        const sessions = getSessions(state);
        if (!sessions.length) return null;
        return sessions[wrapIndex(state.sessionIndex, sessions.length)] || null;
    }

    function getFilledCount(state, session = getSession(state)) {
        const totalQuestions = session?.questions?.length || 0;
        return Math.max(0, Math.min(totalQuestions, state.stepIndex || 0));
    }

    function isSessionComplete(state, session = getSession(state)) {
        const totalQuestions = session?.questions?.length || 0;
        return totalQuestions > 0 && getFilledCount(state, session) >= totalQuestions;
    }

    function getActiveQuestion(state, session = getSession(state)) {
        const filledCount = getFilledCount(state, session);
        if (!session || filledCount >= session.questions.length) return null;
        return session.questions[filledCount] || null;
    }

    function strengthToPx(score) {
        return (1.5 + (normalizeScore(score) * 0.85)).toFixed(2);
    }

    function openSession(state, index) {
        const sessions = getSessions(state);
        if (!sessions.length) return false;
        state.sessionIndex = wrapIndex(index, sessions.length);
        state.stage = 'intro';
        state.stepIndex = 0;
        state.scrollToTop = true;
        return true;
    }

    function goToIntro(state) {
        state.stage = 'intro';
        state.scrollToTop = true;
        return true;
    }

    function goToBuild(state) {
        state.stage = 'build';
        state.scrollToTop = true;
        return true;
    }

    function goToReflect(state) {
        if (!isSessionComplete(state)) return false;
        state.stage = 'reflect';
        state.scrollToTop = true;
        return true;
    }

    function advanceBuild(state) {
        const session = getSession(state);
        if (!session) return false;
        const filledCount = getFilledCount(state, session);
        if (filledCount >= session.questions.length) return false;
        state.stepIndex = filledCount + 1;
        return true;
    }

    function restartCurrentSession(state) {
        if (!getSession(state)) return false;
        state.stage = 'intro';
        state.stepIndex = 0;
        state.scrollToTop = true;
        return true;
    }

    function stepBack(state) {
        const session = getSession(state);
        if (!session) return false;

        if (state.stage === 'reflect') {
            state.stage = 'build';
            state.scrollToTop = true;
            return true;
        }

        if (state.stage === 'build') {
            const filledCount = getFilledCount(state, session);
            if (filledCount > 0) {
                state.stepIndex = filledCount - 1;
                return true;
            }
            state.stage = 'intro';
            state.scrollToTop = true;
            return true;
        }

        return false;
    }

    function registerController(state) {
        global.__metaFeatureControllers = global.__metaFeatureControllers || {};
        global.__metaFeatureControllers.prismlab = {
            stepBack() {
                const handled = stepBack(state);
                if (handled) renderApp(state);
                return handled;
            },
            restart() {
                const handled = restartCurrentSession(state);
                if (handled) renderApp(state);
                return handled;
            }
        };
    }
})(typeof window !== 'undefined' ? window : globalThis, typeof document !== 'undefined' ? document : null);
