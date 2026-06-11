(function attachWr2wPathCore(rootFactory) {
    const root = typeof globalThis !== 'undefined'
        ? globalThis
        : (typeof window !== 'undefined' ? window : this);
    const api = rootFactory();
    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    }
    root.wr2wPathCore = api;
})(function createWr2wPathCore() {
    const ABSOLUTE_REGEX = /(תמיד|אף פעם|בשום|כולם|אין מצב|לגמרי|לעולם)/;
    const CONDITION_REGEX = /(בעיקר כש|לפעמים|בתנאים|כאשר|כש)/;
    const OUTSIDE_PATTERN_REGEX = /(דפוס|לא עקבי|בפועל|באינטראקציה|ביחסים|בגבול|בבקשה|בפתרון|בהתנהגות)/;
    const INSIDE_PATTERN_REGEX = /(מרגיש|בפנים|בעוצמה|בגוף|אצלי|רגש)/;

    function createDefaultAnalytics(seed) {
        const source = seed && typeof seed === 'object' ? seed : {};
        const pathChoices = source.pathChoices && typeof source.pathChoices === 'object'
            ? source.pathChoices
            : {};
        const stuck = source.stuck && typeof source.stuck === 'object'
            ? source.stuck
            : {};
        const recentPaths = Array.isArray(source.recentPaths)
            ? source.recentPaths
            : [];
        return {
            pathChoices: {
                outside: Math.max(0, Math.floor(Number(pathChoices.outside) || 0)),
                inside: Math.max(0, Math.floor(Number(pathChoices.inside) || 0)),
                both: Math.max(0, Math.floor(Number(pathChoices.both) || 0))
            },
            stuck: {
                H: Math.max(0, Math.floor(Number(stuck.H) || 0)),
                C: Math.max(0, Math.floor(Number(stuck.C) || 0))
            },
            recentPaths: recentPaths.slice(-30)
        };
    }

    function markStuck(analytics, step) {
        const next = createDefaultAnalytics(analytics);
        if (step === 'H' || step === 'C') {
            next.stuck[step] += 1;
        }
        return next;
    }

    function recordPathChoice(analytics, path, sceneId) {
        const next = createDefaultAnalytics(analytics);
        if (path === 'outside' || path === 'inside' || path === 'both') {
            next.pathChoices[path] += 1;
            next.recentPaths.push({
                path,
                sceneId: String(sceneId || ''),
                at: Date.now()
            });
            next.recentPaths = next.recentPaths.slice(-30);
        }
        return next;
    }

    function canEnterPath(roundState) {
        return Boolean(roundState && roundState.confirmResolved);
    }

    function canEnterException(roundState) {
        return canEnterPath(roundState) && Boolean(roundState && roundState.pathChoice);
    }

    function evaluateLearningByPath(pathChoice, payload) {
        const path = String(pathChoice || '').toLowerCase();
        const outsideText = String(payload && payload.outsideText || '').trim();
        const insideText = String(payload && payload.insideText || '').trim();
        const singleText = String(payload && payload.singleText || '').trim();

        function evaluateOutside(text) {
            const normalized = String(text || '');
            const hasCondition = CONDITION_REGEX.test(normalized);
            const hasPattern = OUTSIDE_PATTERN_REGEX.test(normalized) || /לא עקבי/.test(normalized);
            const avoidsRigidAbsolute = !ABSOLUTE_REGEX.test(normalized)
                || /לא בהכרח/.test(normalized)
                || /זה לא/.test(normalized);
            return {
                ok: hasCondition && hasPattern && avoidsRigidAbsolute,
                hasCondition,
                hasPattern,
                avoidsRigidAbsolute
            };
        }

        function evaluateInside(text) {
            const normalized = String(text || '');
            const hasCondition = CONDITION_REGEX.test(normalized);
            const hasInnerFrame = INSIDE_PATTERN_REGEX.test(normalized);
            return {
                ok: hasCondition && hasInnerFrame,
                hasCondition,
                hasInnerFrame
            };
        }

        if (path === 'outside') {
            const outside = evaluateOutside(singleText || outsideText);
            return {
                ok: outside.ok,
                mode: 'outside',
                outside,
                inside: null,
                bothComplete: false
            };
        }

        if (path === 'inside') {
            const inside = evaluateInside(singleText || insideText);
            return {
                ok: inside.ok,
                mode: 'inside',
                outside: null,
                inside,
                bothComplete: false
            };
        }

        const outside = evaluateOutside(outsideText);
        const inside = evaluateInside(insideText);
        const bothComplete = outside.ok && inside.ok;
        return {
            ok: bothComplete,
            mode: 'both',
            outside,
            inside,
            bothComplete
        };
    }

    function computeRoundScore(params) {
        const criteria = params && params.criteria && typeof params.criteria === 'object'
            ? params.criteria
            : {};
        const pathChoice = String(params && params.pathChoice || '').toLowerCase();
        const bothLearningComplete = Boolean(params && params.bothLearningComplete);
        const completed = Object.values(criteria).filter(Boolean).length;
        const base = (completed * 6) + (completed === 6 ? 8 : 0);
        const pathPoint = criteria.path ? 1 : 0;
        const bothBonus = pathChoice === 'both' && bothLearningComplete ? 1 : 0;
        return {
            completed,
            base,
            pathPoint,
            bothBonus,
            total: base + pathPoint + bothBonus
        };
    }

    return Object.freeze({
        createDefaultAnalytics,
        markStuck,
        recordPathChoice,
        canEnterPath,
        canEnterException,
        evaluateLearningByPath,
        computeRoundScore
    });
});
