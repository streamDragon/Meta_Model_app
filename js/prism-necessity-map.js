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

    function renderSessionNavigator(state) {
        const sessions = getSessions(state);
        if (!sessions.length) return '';

        return `
            <div class="pnm-case-nav">
                <button type="button" class="pnm-mini-btn" data-action="prev-session">הקודם</button>
                <label class="pnm-case-select">
                    <span class="pnm-section-label">מקרה</span>
                    <select data-role="session-picker" aria-label="בחירת מקרה">
                        ${sessions.map((session, index) => `
                            <option value="${index}"${index === state.sessionIndex ? ' selected' : ''}>
                                ${escapeHtml(`${index + 1}. ${shortenText(session.sentence, 72)}`)}
                            </option>
                        `).join('')}
                    </select>
                </label>
                <button type="button" class="pnm-mini-btn" data-action="next-session">הבא</button>
            </div>
        `;
    }

    function renderStageRail(state, session) {
        const reflectAvailable = isSessionComplete(state, session);
        const stages = [
            { id: 'intro', label: 'פתיחה', index: '1', action: 'go-intro', available: true },
            { id: 'build', label: 'בנייה', index: '2', action: 'go-build', available: true },
            { id: 'reflect', label: 'קריאה', index: '3', action: 'go-reflect', available: reflectAvailable }
        ];

        return `
            <div class="pnm-stage-rail" aria-label="שלבי המפה">
                ${stages.map((stageEntry) => {
                    const isCurrent = stageEntry.id === state.stage;
                    const className = [
                        'pnm-stage-pill',
                        stageEntry.available ? 'is-available' : '',
                        isCurrent ? 'is-current' : ''
                    ].filter(Boolean).join(' ');
                    const actionAttr = stageEntry.available ? `data-action="${stageEntry.action}"` : 'disabled';
                    const currentAttr = isCurrent ? ' aria-current="step"' : '';
                    return `
                        <button type="button" class="${className}" ${actionAttr}${currentAttr}>
                            <span class="pnm-stage-pill__index">${stageEntry.index}</span>
                            <span>${escapeHtml(stageEntry.label)}</span>
                        </button>
                    `;
                }).join('')}
            </div>
        `;
    }

    function renderMapCell(question, filledCount, activeOrderIndex) {
        const isFilled = !!question && question.orderIndex < filledCount;
        const isActive = !!question && question.orderIndex === activeOrderIndex;
        const className = [
            'pnm-map-cell',
            isFilled ? 'is-filled' : 'is-empty',
            isActive ? 'is-active-target' : ''
        ].filter(Boolean).join(' ');

        if (!question) {
            return `<div class="${className}" aria-hidden="true"></div>`;
        }

        if (isFilled) {
            return `
                <div class="${className}" title="${escapeHtml(question.answer)}">
                    <p>${escapeHtml(question.answer)}</p>
                </div>
            `;
        }

        return `
            <div class="${className}">
                <span class="pnm-cell-placeholder">${isActive ? 'התא הבא' : 'ממתין'}</span>
            </div>
        `;
    }

    function renderMapRow(session, row, filledCount, activeOrderIndex) {
        const filledA = !!row.a && row.a.orderIndex < filledCount;
        const filledB = !!row.b && row.b.orderIndex < filledCount;
        const activeA = !!row.a && row.a.orderIndex === activeOrderIndex;
        const activeB = !!row.b && row.b.orderIndex === activeOrderIndex;
        const rowClassName = [
            'pnm-map-row',
            session.core === row.levelId ? 'is-core' : '',
            session.crack === row.levelId ? 'is-crack' : '',
            activeA || activeB ? 'is-active-row' : '',
            filledA && filledB ? 'is-complete-row' : ''
        ].filter(Boolean).join(' ');

        return `
            <article class="${rowClassName}">
                ${renderMapCell(row.a, filledCount, activeOrderIndex)}
                <div class="pnm-bridge">
                    <span class="pnm-bridge-half${filledA ? ' is-filled' : ''}" style="--pnm-bridge-weight:${strengthToPx(filledA ? row.a.score : 0)}px"></span>
                    <span class="pnm-bridge-label${filledA || filledB ? ' is-linked' : ''}">${escapeHtml(row.shortLabel)}</span>
                    <span class="pnm-bridge-half${filledB ? ' is-filled' : ''}" style="--pnm-bridge-weight:${strengthToPx(filledB ? row.b.score : 0)}px"></span>
                </div>
                ${renderMapCell(row.b, filledCount, activeOrderIndex)}
            </article>
        `;
    }

    function renderBuilderMap(session, filledCount, options = {}) {
        const activeOrderIndex = Number.isInteger(options.activeOrderIndex) ? options.activeOrderIndex : -1;
        const shellClassName = [
            'pnm-map-shell',
            options.reflectMode ? 'pnm-map-shell--reflect' : ''
        ].filter(Boolean).join(' ');

        return `
            <section class="${shellClassName}">
                <div class="pnm-map-header-row">
                    <div class="pnm-tower-title">
                        <span class="pnm-tower-title__kicker">A · מקור / טריגר</span>
                        <strong>${escapeHtml(session.sideALabel)}</strong>
                    </div>
                    <div class="pnm-map-axis">רמה</div>
                    <div class="pnm-tower-title">
                        <span class="pnm-tower-title__kicker">B · תוצאה / עצמי</span>
                        <strong>${escapeHtml(session.sideBLabel)}</strong>
                    </div>
                </div>
                <div class="pnm-map-grid">
                    ${session.rows.map((row) => renderMapRow(session, row, filledCount, activeOrderIndex)).join('')}
                </div>
            </section>
        `;
    }

    function renderIntroStage(state, session) {
        const filledCount = getFilledCount(state, session);
        const isComplete = isSessionComplete(state, session);
        const primaryAction = isComplete ? 'go-reflect' : 'go-build';
        const primaryLabel = isComplete
            ? 'עוברים לקריאה'
            : filledCount > 0
                ? 'ממשיכים בבנייה'
                : 'מתחילים בבנייה';
        const introCopy = isComplete
            ? 'המפה כבר מלאה. עכשיו קוראים ליבה, סדק ושאלת אגרוף.'
            : filledCount > 0
                ? 'הבנייה מחכה בדיוק מהתא הבא.'
                : 'שאלה אחת בכל פעם. כל תשובה ממלאה תא אחד.';

        return `
            <section class="pnm-view pnm-view--intro">
                ${renderSessionNavigator(state)}
                ${renderStageRail(state, session)}
                <article class="pnm-hero-card">
                    <div class="pnm-stage-head">
                        <div class="pnm-stage-head__copy">
                            <p class="pnm-kicker">Necessity Map</p>
                            <h1 class="pnm-stage-title">"${escapeHtml(session.sentence)}"</h1>
                            <p class="pnm-copy">${escapeHtml(introCopy)}</p>
                        </div>
                        <div class="pnm-inline-actions">
                            <span class="pnm-chip">${filledCount}/${session.questions.length} תאים</span>
                        </div>
                    </div>
                    <div class="pnm-chip-row">
                        <span class="pnm-chip">6 רמות בכל צד</span>
                        <span class="pnm-chip">12 תאים</span>
                        <span class="pnm-chip">חיבורים לפי עוצמה</span>
                    </div>
                    <div class="pnm-action-row">
                        <button type="button" class="pnm-btn pnm-btn--primary" data-action="${primaryAction}">${escapeHtml(primaryLabel)}</button>
                        ${filledCount > 0 ? '<button type="button" class="pnm-btn pnm-btn--ghost" data-action="restart-session">בונים מחדש</button>' : ''}
                    </div>
                </article>
                <div class="pnm-side-preview">
                    <article class="pnm-side-card">
                        <span class="pnm-section-label">A · מקור / טריגר</span>
                        <strong>${escapeHtml(session.sideALabel)}</strong>
                    </article>
                    <article class="pnm-side-card">
                        <span class="pnm-section-label">B · תוצאה / עצמי</span>
                        <strong>${escapeHtml(session.sideBLabel)}</strong>
                    </article>
                </div>
                ${renderBuilderMap(session, filledCount, { activeOrderIndex: -1 })}
            </section>
        `;
    }

    function renderActiveQuestionCard(state, session) {
        const question = getActiveQuestion(state, session);
        if (!question) {
            return `
                <article class="pnm-active-card pnm-active-card--complete">
                    <div class="pnm-question-meta">
                        <span class="pnm-chip">${session.questions.length}/${session.questions.length}</span>
                    </div>
                    <h3>המפה הושלמה.</h3>
                    <p class="pnm-copy">מכאן אפשר לעבור לקריאה של הליבה, הסדק ושאלת האגרוף.</p>
                    <div class="pnm-action-row">
                        <button type="button" class="pnm-btn pnm-btn--primary" data-action="go-reflect">לשלב הקריאה</button>
                        <button type="button" class="pnm-btn pnm-btn--ghost" data-action="step-back">צעד אחורה</button>
                    </div>
                </article>
            `;
        }

        return `
            <article class="pnm-active-card">
                <div class="pnm-question-meta">
                    <span class="pnm-chip">שאלה ${question.orderIndex + 1}/${session.questions.length}</span>
                    <span class="pnm-chip">${escapeHtml(getLevelLabel(question.levelId))}</span>
                    <span class="pnm-chip">${escapeHtml(getSideDescriptor(question.side))}</span>
                </div>
                <strong class="pnm-question-side">${escapeHtml(getSideTitle(session, question.side))}</strong>
                <h3>${escapeHtml(question.question)}</h3>
                <p class="pnm-copy">בלחיצה, התשובה נכנסת ישירות לתא המסומן במפה.</p>
                <div class="pnm-action-row">
                    <button type="button" class="pnm-btn pnm-btn--primary" data-action="fill-active">ממלאים תא</button>
                    ${getFilledCount(state, session) > 0 ? '<button type="button" class="pnm-btn pnm-btn--ghost" data-action="step-back">צעד אחורה</button>' : ''}
                </div>
            </article>
        `;
    }

    function renderBuildStage(state, session) {
        const filledCount = getFilledCount(state, session);
        const progress = session.questions.length
            ? Math.round((filledCount / session.questions.length) * 100)
            : 0;

        return `
            <section class="pnm-view pnm-view--build">
                ${renderSessionNavigator(state)}
                ${renderStageRail(state, session)}
                <article class="pnm-hero-card pnm-hero-card--compact">
                    <div class="pnm-stage-head">
                        <div class="pnm-stage-head__copy">
                            <p class="pnm-kicker">Build</p>
                            <h2 class="pnm-stage-title">"${escapeHtml(session.sentence)}"</h2>
                            <p class="pnm-copy">שאלה אחת בכל פעם. כל תשובה ממלאה תא אחד בתוך המפה.</p>
                        </div>
                        <div class="pnm-inline-actions">
                            <span class="pnm-chip">${filledCount}/${session.questions.length} תאים</span>
                            <button type="button" class="pnm-mini-btn" data-action="go-intro">פתיחה</button>
                        </div>
                    </div>
                    <div class="pnm-progress">
                        <div class="pnm-progress__track">
                            <span style="width:${progress}%"></span>
                        </div>
                    </div>
                </article>
                ${renderBuilderMap(session, filledCount, {
                    activeOrderIndex: filledCount < session.questions.length ? filledCount : -1
                })}
                ${renderActiveQuestionCard(state, session)}
            </section>
        `;
    }

    function buildFinalSummary(session) {
        const coreLabel = getLevelLabel(session.core);
        const crackLabel = getLevelLabel(session.crack);
        if (session.core === session.crack) {
            return `הליבה והסדק יושבים על ${coreLabel}.`;
        }
        return `הליבה: ${coreLabel}. הסדק: ${crackLabel}.`;
    }

    function renderReflectCard(label, body, modifier = '') {
        return `
            <article class="pnm-reflect-card${modifier ? ` ${modifier}` : ''}">
                <span class="pnm-section-label">${escapeHtml(label)}</span>
                <p>${escapeHtml(body)}</p>
            </article>
        `;
    }

    function renderReflectStage(state, session) {
        return `
            <section class="pnm-view pnm-view--reflect">
                ${renderSessionNavigator(state)}
                ${renderStageRail(state, session)}
                <article class="pnm-hero-card pnm-hero-card--compact">
                    <div class="pnm-stage-head">
                        <div class="pnm-stage-head__copy">
                            <p class="pnm-kicker">Reflect</p>
                            <h2 class="pnm-stage-title">"${escapeHtml(session.sentence)}"</h2>
                            <p class="pnm-copy">הליבה והסדק נקראים מתוך המפה שכבר נבנתה.</p>
                        </div>
                        <div class="pnm-inline-actions">
                            <button type="button" class="pnm-mini-btn" data-action="go-build">חזרה לבנייה</button>
                        </div>
                    </div>
                </article>
                ${renderBuilderMap(session, session.questions.length, {
                    activeOrderIndex: -1,
                    reflectMode: true
                })}
                <div class="pnm-reflect-stats">
                    <article class="pnm-reflect-stat pnm-reflect-stat--core">
                        <span class="pnm-section-label">רמת ליבה</span>
                        <strong>${escapeHtml(getLevelLabel(session.core))}</strong>
                    </article>
                    <article class="pnm-reflect-stat pnm-reflect-stat--crack">
                        <span class="pnm-section-label">רמת סדק</span>
                        <strong>${escapeHtml(getLevelLabel(session.crack))}</strong>
                    </article>
                </div>
                <div class="pnm-reflect-grid">
                    ${renderReflectCard('קריאת מטפל/ת', session.reflectCore)}
                    ${renderReflectCard('קריאת הסדק', session.reflectCrack)}
                    ${renderReflectCard('שאלת אגרוף', session.punchQuestion, 'pnm-reflect-card--question')}
                    ${renderReflectCard('תשובת לקוח', session.punchAnswer, 'pnm-reflect-card--answer')}
                </div>
                <article class="pnm-summary-banner">
                    <span class="pnm-section-label">סיכום קצר</span>
                    <strong>${escapeHtml(buildFinalSummary(session))}</strong>
                </article>
                <div class="pnm-action-row">
                    <button type="button" class="pnm-btn pnm-btn--primary" data-action="restart-session">בונים מחדש</button>
                    <button type="button" class="pnm-btn pnm-btn--ghost" data-action="next-session">למקרה הבא</button>
                </div>
            </section>
        `;
    }

    function renderLoading() {
        return '<section class="pnm-view"><div class="pnm-panel pnm-panel--loading">טוענים את מפת ההכרח...</div></section>';
    }

    function renderError(state) {
        return `
            <section class="pnm-view">
                <div class="pnm-panel pnm-panel--error">
                    <strong>מפת ההכרח לא נטענה.</strong>
                    <p>${escapeHtml(state.error || 'תקלה לא ידועה')}</p>
                    <button type="button" class="pnm-btn pnm-btn--primary" data-action="retry-load">נסה שוב</button>
                </div>
            </section>
        `;
    }

    function renderApp(state) {
        const shellClass = state.mode === 'standalone' ? 'pnm-app pnm-app--standalone' : 'pnm-app pnm-app--embedded';
        const session = getSession(state);
        let body = '';

        if (state.error) {
            body = renderError(state);
        } else if (!state.loaded || !state.payload) {
            body = renderLoading();
        } else if (!session) {
            body = renderError({ error: 'No session available.' });
        } else if (state.stage === 'build') {
            body = renderBuildStage(state, session);
        } else if (state.stage === 'reflect') {
            body = renderReflectStage(state, session);
        } else {
            body = renderIntroStage(state, session);
        }

        state.root.innerHTML = `<div class="${shellClass}" data-stage="${escapeHtml(state.stage)}">${body}</div>`;
        registerController(state);

        if (state.scrollToTop) {
            const scroller = state.root.querySelector('.pnm-view');
            if (scroller) {
                global.requestAnimationFrame(() => {
                    scroller.scrollTop = 0;
                });
            }
            state.scrollToTop = false;
        }
    }

    function bindEvents(state) {
        state.root.onclick = async (event) => {
            const actionNode = event.target.closest('[data-action]');
            if (!actionNode) return;

            const action = normalizeText(actionNode.getAttribute('data-action'));

            if (action === 'retry-load') {
                state.error = '';
                state.loaded = false;
                renderApp(state);
                try {
                    state.payload = await loadPayload();
                    state.loaded = true;
                } catch (error) {
                    state.error = error?.message || 'Loading failed';
                }
                renderApp(state);
                return;
            }

            if (!state.loaded || !state.payload) return;

            let handled = false;

            if (action === 'prev-session') handled = openSession(state, state.sessionIndex - 1);
            if (action === 'next-session') handled = openSession(state, state.sessionIndex + 1);
            if (action === 'go-intro') handled = goToIntro(state);
            if (action === 'go-build' || action === 'start-build') handled = goToBuild(state);
            if (action === 'go-reflect') handled = goToReflect(state);
            if (action === 'fill-active') handled = advanceBuild(state);
            if (action === 'restart-session') handled = restartCurrentSession(state);
            if (action === 'step-back') handled = stepBack(state);

            if (handled) renderApp(state);
        };

        state.root.onchange = (event) => {
            if (!state.loaded || !state.payload) return;
            const picker = event.target.closest('[data-role="session-picker"]');
            if (!picker) return;
            const nextIndex = Number(picker.value);
            if (!Number.isInteger(nextIndex)) return;
            if (openSession(state, nextIndex)) renderApp(state);
        };
    }

    async function mount(root) {
        const state = createState(root);
        ensureStylesheet();
        bindEvents(state);
        renderApp(state);

        try {
            state.payload = await loadPayload();
            state.loaded = true;
        } catch (error) {
            state.error = error?.message || 'Loading failed';
        }

        renderApp(state);
    }

    function boot() {
        Array.from(document.querySelectorAll(ROOT_SELECTOR)).forEach((root) => {
            if (root.__prismNecessityMounted) return;
            root.__prismNecessityMounted = true;
            mount(root);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot, { once: true });
    } else {
        boot();
    }
})(typeof window !== 'undefined' ? window : globalThis, typeof document !== 'undefined' ? document : null);
