(function attachPrismNecessityMap() {
    'use strict';

    const scope = typeof globalThis !== 'undefined' ? globalThis : window;
    const ROOT_SELECTOR = '[data-prism-necessity-app]';
    const DATA_PATH = 'data/prism-necessity.json';
    const STYLE_PATH = 'css/prism-necessity.css';

    const LEVELS = Object.freeze([
        Object.freeze({ id: 'environment', label: 'סביבה', color: '#85B7EB', fill: '#E6F1FB', dark: '#0C447C' }),
        Object.freeze({ id: 'behavior', label: 'התנהגות', color: '#5DCAA5', fill: '#E1F5EE', dark: '#085041' }),
        Object.freeze({ id: 'capability', label: 'יכולת', color: '#EF9F27', fill: '#FAEEDA', dark: '#633806' }),
        Object.freeze({ id: 'values_beliefs', label: 'ערכים ואמונות', color: '#ED93B1', fill: '#FBEAF0', dark: '#72243E' }),
        Object.freeze({ id: 'identity', label: 'זהות', color: '#AFA9EC', fill: '#EEEDFE', dark: '#26215C' }),
        Object.freeze({ id: 'purpose_meaning', label: 'ייעוד ומשמעות', color: '#F0997B', fill: '#FAECE7', dark: '#4A1B0C' })
    ]);

    const LEVEL_BY_ID = Object.freeze(
        LEVELS.reduce((acc, level) => {
            acc[level.id] = level;
            return acc;
        }, {})
    );

    const CATEGORY_LABELS = Object.freeze({
        cause_effect: 'סיבה ותוצאה',
        complex_equivalence: 'שקילות מורכבת',
        comparison: 'השוואה סמויה',
        universal_quantifier: 'כמת כולל',
        mind_reading: 'קריאת מחשבות',
        modal_operator: 'אופרטור מודלי',
        nominalization: 'נומינליזציה',
        unspecified_verb: 'פועל לא מוגדר',
        time_place: 'זמן ומקום',
        lost_performative: 'שיפוט בלי שופט'
    });

    const STAGES = Object.freeze([
        Object.freeze({ id: 'intro', label: 'פתיחה' }),
        Object.freeze({ id: 'build', label: 'בנייה' }),
        Object.freeze({ id: 'reflect', label: 'שיקוף' }),
        Object.freeze({ id: 'summary', label: 'סיכום' })
    ]);
    const EMBEDDED_STAGES = Object.freeze(STAGES.filter((stage) => stage.id !== 'intro'));

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

    function resolveAssetPath(path) {
        if (typeof scope.__withAssetVersion === 'function') {
            try {
                return scope.__withAssetVersion(path);
            } catch (error) {
                console.warn('[prism-necessity] asset version helper failed', error);
            }
        }

        const version = String(
            scope.__PRISM_LAB_ASSET_V__
            || scope.__PRISM_RESEARCH_ASSET_V__
            || scope.__META_MODEL_ASSET_V__
            || ''
        ).trim();

        if (!version) return path;
        const glue = path.includes('?') ? '&' : '?';
        return `${path}${glue}v=${encodeURIComponent(version)}`;
    }

    function ensureStylesheet() {
        if (document.querySelector('link[data-prism-necessity-style="true"]')) return;
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = resolveAssetPath(STYLE_PATH);
        link.setAttribute('data-prism-necessity-style', 'true');
        document.head.appendChild(link);
    }

    function getLevel(levelId) {
        return LEVEL_BY_ID[levelId] || LEVELS[0];
    }

    function getCategoryLabel(categoryId) {
        return CATEGORY_LABELS[String(categoryId || '').trim()] || String(categoryId || 'קטגוריה');
    }

    function getQuestionKey(question) {
        return `${question.level}:${question.side}`;
    }

    function getInitialStage(mode = 'embedded') {
        return mode === 'standalone' ? 'intro' : 'build';
    }

    function getVisibleStages(state) {
        return state.mode === 'standalone' ? STAGES : EMBEDDED_STAGES;
    }

    function getEffectiveStage(state) {
        if (state.mode !== 'standalone' && state.stage === 'intro') return 'build';
        return state.stage;
    }

    function sortQuestions(rawQuestions) {
        const levelOrder = LEVELS.reduce((acc, level, index) => {
            acc[level.id] = index;
            return acc;
        }, {});

        return (Array.isArray(rawQuestions) ? rawQuestions : [])
            .map((question) => ({
                level: String(question?.level || '').trim(),
                side: question?.side === 'b' ? 'b' : 'a',
                question: normalizeText(question?.question),
                answer: normalizeText(question?.answer),
                score: Number(question?.score) || 0
            }))
            .filter((question) => question.level && question.question && question.answer)
            .sort((a, b) => {
                const levelDiff = (levelOrder[a.level] ?? 99) - (levelOrder[b.level] ?? 99);
                if (levelDiff !== 0) return levelDiff;
                return (a.side === 'a' ? 0 : 1) - (b.side === 'a' ? 0 : 1);
            });
    }

    function normalizeExercise(rawItem, index) {
        const questions = sortQuestions(rawItem?.questions);
        if (!questions.length) return null;

        return {
            id: String(rawItem?.id || index + 1),
            sentence: normalizeText(rawItem?.sentence),
            category: normalizeText(rawItem?.category),
            keyPhrase: normalizeText(rawItem?.keyPhrase),
            sideA: normalizeText(rawItem?.sideA_label) || 'הצד החיצוני',
            sideB: normalizeText(rawItem?.sideB_label) || 'הצד הפנימי',
            questions,
            core: normalizeText(rawItem?.core),
            crack: normalizeText(rawItem?.crack),
            reflectCore: normalizeText(rawItem?.reflectCore),
            reflectCrack: normalizeText(rawItem?.reflectCrack),
            punchQ: normalizeText(rawItem?.punchQ),
            punchA: normalizeText(rawItem?.punchA)
        };
    }

    async function loadExercises() {
        const response = await fetch(resolveAssetPath(DATA_PATH), { cache: 'no-store' });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const payload = await response.json();
        const items = Array.isArray(payload) ? payload : Array.isArray(payload?.exercises) ? payload.exercises : [];
        const exercises = items
            .map((item, index) => normalizeExercise(item, index))
            .filter(Boolean);

        if (!exercises.length) {
            throw new Error('No exercises found in prism necessity dataset');
        }

        return exercises;
    }

    function buildReflectionScript(exercise) {
        return [
            { kind: 'label', text: 'שיקוף הגרעין' },
            { kind: 'therapist', text: exercise.reflectCore },
            { kind: 'client', text: 'כן... זה נשמע בדיוק כמו מה שקורה שם מבפנים.' },
            { kind: 'label', text: 'פתח לשינוי' },
            { kind: 'therapist', text: exercise.reflectCrack },
            { kind: 'client', text: 'זה קצת פותח אוויר. זה לא מבטל, אבל זה כבר פחות סגור.' },
            { kind: 'label', text: 'שאלת פאנץ׳' },
            { kind: 'therapist', text: exercise.punchQ },
            { kind: 'client', text: exercise.punchA }
        ];
    }

    function createState(root) {
        const mode = root.getAttribute('data-prism-necessity-mode') || 'embedded';
        return {
            root,
            mode,
            loaded: false,
            error: '',
            exercises: [],
            exerciseIndex: 0,
            stage: getInitialStage(mode),
            questionIndex: 0,
            reflectionIndex: 0,
            cells: {},
            mapOverlayOpen: false
        };
    }

    function getCurrentExercise(state) {
        return state.exercises[state.exerciseIndex] || null;
    }

    function getCurrentQuestion(state) {
        const exercise = getCurrentExercise(state);
        return exercise?.questions?.[state.questionIndex] || null;
    }

    function getAnsweredCount(state) {
        return Object.keys(state.cells).length;
    }

    function isBuildComplete(state) {
        const exercise = getCurrentExercise(state);
        return !!exercise && state.questionIndex >= exercise.questions.length;
    }

    function connectorTone(avgScore) {
        if (avgScore >= 4) return 'strong';
        if (avgScore >= 3) return 'steady';
        return 'crack';
    }

    function getStageIndex(state) {
        const stages = getVisibleStages(state);
        const activeStage = getEffectiveStage(state);
        return Math.max(0, stages.findIndex((item) => item.id === activeStage));
    }

    function resetExercise(state, nextIndex) {
        if (Number.isInteger(nextIndex)) {
            state.exerciseIndex = ((nextIndex % state.exercises.length) + state.exercises.length) % state.exercises.length;
        }
        state.stage = getInitialStage(state.mode);
        state.questionIndex = 0;
        state.reflectionIndex = 0;
        state.cells = {};
        state.mapOverlayOpen = false;
    }

    function revealAnswer(state) {
        const question = getCurrentQuestion(state);
        if (!question) return;
        state.cells[getQuestionKey(question)] = {
            answer: question.answer,
            score: question.score
        };
        state.questionIndex += 1;
    }

    function renderLoading() {
        return `
            <section class="pnm-shell pnm-shell--loading" dir="rtl" lang="he">
                <div class="pnm-stage-card pnm-stage-card--loading">
                    <p class="pnm-kicker">Prism Lab</p>
                    <h1>מפת ההכרח</h1>
                    <p class="pnm-copy">טוענים את מסלול העבודה החדש, את המפה ואת התרגילים...</p>
                </div>
            </section>
        `;
    }

    function renderError(state) {
        return `
            <section class="pnm-shell" dir="rtl" lang="he">
                <div class="pnm-stage-card pnm-stage-card--error">
                    <p class="pnm-kicker">Prism Lab</p>
                    <h1>מפת ההכרח לא נטענה</h1>
                    <p class="pnm-copy">לא הצלחנו לטעון את התרגילים מ־<code>${escapeHtml(DATA_PATH)}</code>.</p>
                    <p class="pnm-copy pnm-copy--muted">${escapeHtml(state.error || 'שגיאה לא ידועה')}</p>
                    <button type="button" class="pnm-btn pnm-btn--primary" data-action="retry-load">נסה שוב</button>
                </div>
            </section>
        `;
    }

    function renderStageRail(state, exercise) {
        const stages = getVisibleStages(state);
        const stageIndex = getStageIndex(state);
        const questionTotal = exercise.questions.length;
        const answeredCount = getAnsweredCount(state);

        return `
            <div class="pnm-stage-rail" aria-label="מפת שלבים">
                ${stages.map((stage, index) => `
                    <div class="pnm-stage-pill${index < stageIndex ? ' is-done' : ''}${index === stageIndex ? ' is-active' : ''}">
                        <span class="pnm-stage-pill-index">${index + 1}</span>
                        <strong>${escapeHtml(stage.label)}</strong>
                    </div>
                `).join('')}
                <div class="pnm-stage-progress">
                    <span>שאלות שנחשפו</span>
                    <strong>${answeredCount}/${questionTotal}</strong>
                </div>
            </div>
        `;
    }

    function renderIntro(state, exercise) {
        const categoryLabel = getCategoryLabel(exercise.category);
        return `
            <section class="pnm-stage-card pnm-stage-card--intro">
                <div class="pnm-hero">
                    <div>
                        <p class="pnm-kicker">Prism Lab · route חי</p>
                        <h1>מפת ההכרח</h1>
                        <p class="pnm-copy">לא מאתגרים מיד. קודם בונים לאט את המבנה שגורם למשפט להרגיש הכרחי, מחייב או בלתי נמנע.</p>
                    </div>
                    <div class="pnm-count-chip">${state.exerciseIndex + 1}/${state.exercises.length}</div>
                </div>

                ${renderStageRail(state, exercise)}

                <div class="pnm-intro-grid">
                    <article class="pnm-focus-card">
                        <span class="pnm-label">המשפט שממנו נתחיל</span>
                        <strong class="pnm-focus-sentence">"${escapeHtml(exercise.sentence)}"</strong>
                        <div class="pnm-chip-row">
                            <span class="pnm-chip">${escapeHtml(categoryLabel)}</span>
                            <span class="pnm-chip pnm-chip--warm">ביטוי מפתח: ${escapeHtml(exercise.keyPhrase)}</span>
                        </div>
                    </article>

                    <div class="pnm-side-pair">
                        <article class="pnm-side-card">
                            <span class="pnm-label">צד A</span>
                            <strong>${escapeHtml(exercise.sideA)}</strong>
                            <small>מה בחוץ, מה קורה, מה מפעיל.</small>
                        </article>
                        <article class="pnm-side-card pnm-side-card--alt">
                            <span class="pnm-label">צד B</span>
                            <strong>${escapeHtml(exercise.sideB)}</strong>
                            <small>מה נהיה בפנים, מה זה אומר, מה המחיר.</small>
                        </article>
                    </div>
                </div>

                <div class="pnm-outline">
                    <div class="pnm-outline-item"><strong>1</strong><span>שאלה אחת בכל רגע</span></div>
                    <div class="pnm-outline-item"><strong>2</strong><span>שתי עמודות שנבנות בהדרגה</span></div>
                    <div class="pnm-outline-item"><strong>3</strong><span>שיקוף, גרעין, סדק ושאלת פאנץ׳</span></div>
                </div>

                <details class="pnm-info-toggle">
                    <summary>מה העיקרון כאן?</summary>
                    <p>המרכז הוא המפה, לא התאוריה: סביבה, התנהגות, יכולת, ערכים ואמונות, זהות, וייעוד או משמעות. בכל שלב נחשפת רק חוליה אחת, עד שרואים איפה ההכרח מתחזק ואיפה נפתח סדק.</p>
                </details>

                <div class="pnm-actions">
                    <button type="button" class="pnm-btn pnm-btn--primary" data-action="start-build">התחל לבנות</button>
                    <button type="button" class="pnm-btn pnm-btn--ghost" data-action="next-exercise">תרגיל אחר</button>
                </div>
            </section>
        `;
    }

    function renderConnector(level, leftCell, rightCell) {
        if (!leftCell || !rightCell) {
            return `
                <div class="pnm-connector-row">
                    <div class="pnm-connector pnm-connector--empty" aria-hidden="true"></div>
                </div>
            `;
        }

        const avgScore = (Number(leftCell.score) + Number(rightCell.score)) / 2;
        const tone = connectorTone(avgScore);
        return `
            <div class="pnm-connector-row">
                <div class="pnm-connector pnm-connector--${tone}" style="--pnm-tone:${level.color};" aria-hidden="true"></div>
            </div>
        `;
    }

    function renderCell(level, side, state, exercise, showBadges) {
        const key = `${level.id}:${side}`;
        const entry = state.cells[key];
        const isCore = showBadges && exercise.core === level.id;
        const isCrack = showBadges && exercise.crack === level.id;
        return `
            <article class="pnm-map-cell${entry ? ' is-filled' : ''}${isCore ? ' is-core' : ''}${isCrack ? ' is-crack' : ''}"
                style="--pnm-tone:${level.color};--pnm-fill:${level.fill};--pnm-dark:${level.dark};">
                ${isCore ? '<span class="pnm-map-badge">גרעין</span>' : ''}
                ${isCrack ? '<span class="pnm-map-badge pnm-map-badge--crack">סדק</span>' : ''}
                <span class="pnm-map-level">${escapeHtml(level.label)}</span>
                <strong class="pnm-map-value">${entry ? escapeHtml(entry.answer) : '...'}</strong>
            </article>
        `;
    }

    function renderMap(state, exercise, options = {}) {
        const showBadges = !!options.showBadges;
        const mapClass = `pnm-map-card${options.compact ? ' pnm-map-card--compact' : ''}${options.overlay ? ' pnm-map-card--overlay' : ''}`;
        return `
            <section class="${mapClass}">
                <div class="pnm-map-sentence">
                    <span class="pnm-label">המשפט במרכז</span>
                    <strong>"${escapeHtml(exercise.sentence)}"</strong>
                    <small>${escapeHtml(getCategoryLabel(exercise.category))} · ${escapeHtml(exercise.keyPhrase)}</small>
                </div>

                <div class="pnm-map-shell">
                    <div class="pnm-map-side">
                        <div class="pnm-map-side-head">
                            <span>צד A</span>
                            <strong>${escapeHtml(exercise.sideA)}</strong>
                        </div>
                        ${LEVELS.map((level) => renderCell(level, 'a', state, exercise, showBadges)).join('')}
                    </div>

                    <div class="pnm-connector-column">
                        ${LEVELS.map((level) => renderConnector(
                            level,
                            state.cells[`${level.id}:a`],
                            state.cells[`${level.id}:b`]
                        )).join('')}
                    </div>

                    <div class="pnm-map-side">
                        <div class="pnm-map-side-head pnm-map-side-head--alt">
                            <span>צד B</span>
                            <strong>${escapeHtml(exercise.sideB)}</strong>
                        </div>
                        ${LEVELS.map((level) => renderCell(level, 'b', state, exercise, showBadges)).join('')}
                    </div>
                </div>

                <div class="pnm-legend">
                    <span><i class="pnm-legend-line pnm-legend-line--strong"></i> חיבור חזק</span>
                    <span><i class="pnm-legend-line pnm-legend-line--steady"></i> חיבור תומך</span>
                    <span><i class="pnm-legend-line pnm-legend-line--crack"></i> סדק או חוליה חלשה</span>
                </div>
            </section>
        `;
    }

    function renderActionButtons(actions, className = '') {
        const safeActions = Array.isArray(actions) ? actions.filter(Boolean) : [];
        if (!safeActions.length) return '';
        const safeClass = className ? ` ${className}` : '';
        return `
            <div class="pnm-actions${safeClass}">
                ${safeActions.map((action) => `
                    <button
                        type="button"
                        class="pnm-btn ${action.tone === 'ghost' ? 'pnm-btn--ghost' : 'pnm-btn--primary'}"
                        data-action="${escapeHtml(action.id)}"
                    >${escapeHtml(action.label)}</button>
                `).join('')}
            </div>
        `;
    }

    function renderToolbar(copy, actions) {
        return `
            <section class="pnm-toolbar">
                <div class="pnm-toolbar-copy">
                    <span class="pnm-toolbar-kicker">${escapeHtml(copy?.kicker || 'מסלול עבודה')}</span>
                    <strong>${escapeHtml(copy?.title || '')}</strong>
                    ${copy?.detail ? `<small>${escapeHtml(copy.detail)}</small>` : ''}
                </div>
                ${renderActionButtons(actions, 'pnm-actions--desktop pnm-actions--toolbar')}
            </section>
        `;
    }

    function getBuildActions(state, exercise) {
        if (!getCurrentQuestion(state)) {
            return [
                { id: 'go-reflect', label: 'שיקוף + גרעין + סדק', tone: 'primary' },
                { id: 'restart-exercise', label: 'התחל מחדש', tone: 'ghost' },
                { id: 'next-exercise', label: 'משפט אחר', tone: 'ghost' }
            ];
        }
        return [
            { id: 'reveal-answer', label: 'חשוף את התשובה במפה', tone: 'primary' },
            { id: 'restart-exercise', label: 'התחל מחדש', tone: 'ghost' },
            { id: 'next-exercise', label: 'משפט אחר', tone: 'ghost' }
        ];
    }

    function getReflectionActions(state, exercise) {
        const script = buildReflectionScript(exercise);
        const isDone = state.reflectionIndex >= script.length;
        return [
            { id: isDone ? 'go-summary' : 'reveal-reflection', label: isDone ? 'לסיכום' : 'הודעה הבאה', tone: 'primary' },
            { id: 'open-map-overlay', label: 'מפת הרמות', tone: 'ghost' },
            { id: 'restart-exercise', label: 'התחל מחדש', tone: 'ghost' }
        ];
    }

    function getSummaryActions() {
        return [
            { id: 'next-exercise', label: 'משפט הבא', tone: 'primary' },
            { id: 'open-map-overlay', label: 'מפת הרמות', tone: 'ghost' },
            { id: 'restart-exercise', label: 'נסה שוב', tone: 'ghost' }
        ];
    }

    function renderQuestionCard(state, exercise, options = {}) {
        const question = getCurrentQuestion(state);
        const mobileActions = Array.isArray(options.actions) ? options.actions : [];
        if (!question) {
            return `
                <section class="pnm-question-card pnm-question-card--done">
                    <div class="pnm-question-head">
                        <div>
                            <span class="pnm-label">המפה הושלמה</span>
                            <h2>עכשיו קוראים את מה שנבנה</h2>
                        </div>
                        <div class="pnm-progress-ring">${exercise.questions.length}/${exercise.questions.length}</div>
                    </div>
                    <p class="pnm-copy">כל 12 החוליות נחשפו. אפשר לעבור לשיקוף, לזהות את הגרעין, ולחפש איפה כבר יש סדק לשינוי.</p>
                    ${renderActionButtons(mobileActions, 'pnm-actions--mobile')}
                </section>
            `;
        }

        const level = getLevel(question.level);
        const currentIndex = state.questionIndex + 1;
        return `
            <section class="pnm-question-card" style="--pnm-tone:${level.color};--pnm-fill:${level.fill};--pnm-dark:${level.dark};">
                <div class="pnm-question-head">
                    <div>
                        <span class="pnm-label">שאלה אחת כרגע</span>
                        <h2>${escapeHtml(level.label)} · צד ${question.side === 'a' ? 'A' : 'B'}</h2>
                    </div>
                    <div class="pnm-progress-ring">${currentIndex}/${exercise.questions.length}</div>
                </div>

                <p class="pnm-question-text">"${escapeHtml(question.question)}"</p>

                <div class="pnm-question-hint">
                    <span>העיקרון:</span>
                    <strong>נחשפת רק חוליה אחת, ואז היא נכנסת ישר למפה.</strong>
                </div>

                ${renderActionButtons(mobileActions, 'pnm-actions--mobile')}
            </section>
        `;
    }

    function renderBuild(state, exercise) {
        const actions = getBuildActions(state, exercise);
        const question = getCurrentQuestion(state);
        const toolbarCopy = question
            ? {
                kicker: 'כפתורי העבודה עברו למעלה',
                title: `חוליה ${state.questionIndex + 1}/${exercise.questions.length} · ${getLevel(question.level).label} · צד ${question.side === 'a' ? 'A' : 'B'}`,
                detail: 'כך המפה נשארת פתוחה במסך המחשב בלי לרדת לסוף העמוד בכל צעד.'
            }
            : {
                kicker: 'המפה הושלמה',
                title: 'כל 12 החוליות נחשפו',
                detail: 'מכאן עוברים לשיח, לגרעין, לסדק ולשאלת הפאנץ׳.'
            };
        return `
            <section class="pnm-stage-card pnm-stage-card--build">
                <div class="pnm-hero pnm-hero--compact">
                    <div>
                        <p class="pnm-kicker">Prism Lab · מפת ההכרח</p>
                        <h1>הבנייה מתקדמת חוליה אחר חוליה</h1>
                    </div>
                    <div class="pnm-chip-row">
                        <span class="pnm-chip">תרגיל ${state.exerciseIndex + 1}</span>
                        <span class="pnm-chip pnm-chip--warm">${getAnsweredCount(state)}/${exercise.questions.length} תשובות</span>
                    </div>
                </div>
                ${renderStageRail(state, exercise)}
                ${renderToolbar(toolbarCopy, actions)}
                <div class="pnm-stage-layout pnm-stage-layout--build">
                    <div class="pnm-stage-main">
                        ${renderMap(state, exercise, { showBadges: isBuildComplete(state), compact: state.mode !== 'standalone' })}
                    </div>
                    <aside class="pnm-stage-side">
                        ${renderQuestionCard(state, exercise, { actions })}
                    </aside>
                </div>
            </section>
        `;
    }

    function renderFocusStack(exercise) {
        const coreLevel = getLevel(exercise.core);
        const crackLevel = getLevel(exercise.crack);
        return `
            <aside class="pnm-insight-stack">
                <div class="pnm-insight-intro">
                    <span class="pnm-label">מוקד העבודה עכשיו</span>
                    <strong>המפה כבר עשתה את שלה. עכשיו נשארים עם השיחה, הגרעין, הסדק והפאנץ׳.</strong>
                    <p class="pnm-copy pnm-copy--muted">מפת הרמות נשארה זמינה ב־overlay דרך הכפתור למעלה, בלי לתפוס את כל המסך.</p>
                </div>
                <article class="pnm-insight-card pnm-insight-card--core" style="--pnm-tone:${coreLevel.color};--pnm-fill:${coreLevel.fill};">
                    <span class="pnm-label">גרעין</span>
                    <strong>${escapeHtml(coreLevel.label)}</strong>
                    <p>${escapeHtml(exercise.reflectCore)}</p>
                </article>
                <article class="pnm-insight-card pnm-insight-card--crack" style="--pnm-tone:${crackLevel.color};--pnm-fill:${crackLevel.fill};">
                    <span class="pnm-label">סדק</span>
                    <strong>${escapeHtml(crackLevel.label)}</strong>
                    <p>${escapeHtml(exercise.reflectCrack)}</p>
                </article>
                <article class="pnm-insight-card pnm-insight-card--punch">
                    <span class="pnm-label">שאלת פאנץ׳</span>
                    <strong>${escapeHtml(exercise.punchQ)}</strong>
                    <p>${escapeHtml(exercise.punchA)}</p>
                </article>
            </aside>
        `;
    }

    function getExerciseQuestion(exercise, levelId, side) {
        return (exercise?.questions || []).find((question) => question.level === levelId && question.side === side) || null;
    }

    function getCellEntry(state, exercise, levelId, side) {
        const key = `${levelId}:${side}`;
        if (state.cells[key]) return state.cells[key];
        const question = getExerciseQuestion(exercise, levelId, side);
        return question ? { answer: question.answer, score: question.score } : null;
    }

    function getLevelPair(state, exercise, levelId) {
        return {
            level: getLevel(levelId),
            a: getCellEntry(state, exercise, levelId, 'a'),
            b: getCellEntry(state, exercise, levelId, 'b')
        };
    }

    function getPreferredPair(state, exercise, levelIds) {
        const candidates = Array.isArray(levelIds) && levelIds.length ? levelIds : [LEVELS[0].id];
        for (const levelId of candidates) {
            const pair = getLevelPair(state, exercise, levelId);
            if (pair.a || pair.b) return pair;
        }
        return getLevelPair(state, exercise, candidates[0]);
    }

    function buildSummaryExplanation(exercise, corePair) {
        const parts = [
            `במפה הזו ההכרח מתחזק במיוחד ברמת ${corePair.level.label}.`,
            corePair.a?.answer ? `מבחוץ הוא נאסף סביב: ${corePair.a.answer}` : '',
            corePair.b?.answer ? `מבפנים הוא נסגר סביב: ${corePair.b.answer}` : '',
            `לכן "${exercise.keyPhrase || exercise.sentence}" כבר לא נשמע כאן רק כמו תיאור, אלא כמו מבנה שמרגיש מחייב כמעט מעצמו.`
        ];
        return parts.filter(Boolean).join(' ');
    }

    function renderHierarchicalSummary(state, exercise) {
        const corePair = getLevelPair(state, exercise, exercise.core);
        const concretePair = getPreferredPair(state, exercise, ['behavior', 'environment']);
        const coreLevel = getLevel(exercise.core);
        const crackLevel = getLevel(exercise.crack);
        const explanation = buildSummaryExplanation(exercise, corePair);

        return `
            <section class="pnm-story-flow"
                style="--pnm-core-tone:${coreLevel.color};--pnm-core-fill:${coreLevel.fill};--pnm-core-dark:${coreLevel.dark};--pnm-crack-tone:${crackLevel.color};--pnm-crack-fill:${crackLevel.fill};--pnm-crack-dark:${crackLevel.dark};--pnm-concrete-tone:${concretePair.level.color};--pnm-concrete-fill:${concretePair.level.fill};--pnm-concrete-dark:${concretePair.level.dark};">
                <article class="pnm-story-step pnm-story-step--title">
                    <span class="pnm-story-chip">מפת ההכרח המלאה</span>
                    <strong>"${escapeHtml(exercise.sentence)}"</strong>
                    <p>${escapeHtml(getCategoryLabel(exercise.category))} · ${escapeHtml(exercise.keyPhrase)}</p>
                </article>

                <article class="pnm-story-step pnm-story-step--core">
                    <span class="pnm-story-chip pnm-story-chip--core">גרעין · ${escapeHtml(coreLevel.label)}</span>
                    <h2>ליבת ההכרח</h2>
                    <p>${escapeHtml(exercise.reflectCore)}</p>
                </article>

                <section class="pnm-story-step pnm-story-step--split">
                    <div class="pnm-story-head">
                        <h2>מה קורה לי בפועל</h2>
                        <p>כאן רואים את הצמד שהחזיק את הסצנה ברמה הקונקרטית יותר של המפה.</p>
                    </div>
                    <div class="pnm-story-split">
                        <article class="pnm-story-mini pnm-story-mini--outside">
                            <span class="pnm-story-mini__eyebrow">בחוץ</span>
                            <strong>${escapeHtml(exercise.sideA)}</strong>
                            <p>${escapeHtml(concretePair.a?.answer || 'הצד החיצוני עוד לא קיבל ניסוח כאן.')}</p>
                            <small>רמת ${escapeHtml(concretePair.level.label)}</small>
                        </article>
                        <article class="pnm-story-mini pnm-story-mini--inside">
                            <span class="pnm-story-mini__eyebrow">בפנים</span>
                            <strong>${escapeHtml(exercise.sideB)}</strong>
                            <p>${escapeHtml(concretePair.b?.answer || 'הצד הפנימי עוד לא קיבל ניסוח כאן.')}</p>
                            <small>רמת ${escapeHtml(concretePair.level.label)}</small>
                        </article>
                    </div>
                </section>

                <article class="pnm-story-step pnm-story-step--explain">
                    <h2>הסבר</h2>
                    <p>${escapeHtml(explanation)}</p>
                </article>

                <article class="pnm-story-step pnm-story-step--next">
                    <span class="pnm-story-chip pnm-story-chip--crack">סדק · ${escapeHtml(crackLevel.label)}</span>
                    <h2>הצעד הבא</h2>
                    <p class="pnm-story-question">${escapeHtml(exercise.punchQ)}</p>
                    <p class="pnm-story-answer">${escapeHtml(exercise.punchA)}</p>
                </article>

                <article class="pnm-story-step pnm-story-step--integrated">
                    <h2>מה כבר מתחיל לזוז</h2>
                    <p>${escapeHtml(exercise.reflectCrack)}</p>
                </article>
            </section>
        `;
    }

    function renderMapOverlay(state, exercise, options = {}) {
        if (!state.mapOverlayOpen) return '';
        return `
            <div class="pnm-overlay">
                <button type="button" class="pnm-overlay-backdrop" data-action="close-map-overlay" aria-label="סגירת מפת הרמות"></button>
                <article class="pnm-overlay-panel" role="dialog" aria-modal="true" aria-labelledby="pnm-overlay-title">
                    <header class="pnm-overlay-head">
                        <div class="pnm-overlay-copy">
                            <span class="pnm-label">מפת הרמות</span>
                            <h2 id="pnm-overlay-title">${escapeHtml(options.title || 'המפה שמאחורי השיח')}</h2>
                            <p class="pnm-copy pnm-copy--muted">כאן אפשר לחזור לרמות הלוגיות בלי לאבד את המסך המרכזי של השיחה.</p>
                        </div>
                        <button type="button" class="pnm-overlay-close" data-action="close-map-overlay">סגור</button>
                    </header>
                    <div class="pnm-overlay-body">
                        ${renderMap(state, exercise, { showBadges: options.showBadges, overlay: true })}
                    </div>
                </article>
            </div>
        `;
    }

    function renderReflection(state, exercise) {
        const script = buildReflectionScript(exercise);
        const visibleItems = script.slice(0, state.reflectionIndex);
        const isDone = state.reflectionIndex >= script.length;
        const actions = getReflectionActions(state, exercise);

        return `
            <section class="pnm-stage-card pnm-stage-card--reflect">
                <div class="pnm-hero pnm-hero--compact">
                    <div>
                        <p class="pnm-kicker">שלב השיקוף</p>
                        <h1>קוראים את המפה כמו שיחה טיפולית</h1>
                    </div>
                    <div class="pnm-count-chip">${state.reflectionIndex}/${script.length}</div>
                </div>
                ${renderStageRail(state, exercise)}
                ${renderToolbar({
                    kicker: 'שלב השיקוף',
                    title: isDone ? 'השיחה הושלמה, אפשר לעבור לסיכום' : 'הטבלה ירדה לרקע, והשיחה עלתה למרכז',
                    detail: 'במחשב הכפתורים נשארים למעלה, והמפה נגישה רק כשצריך.'
                }, actions)}

                <div class="pnm-stage-layout pnm-stage-layout--reflect">
                    <section class="pnm-chat-card pnm-chat-card--conversation">
                        <div class="pnm-chat-head">
                            <div>
                                <span class="pnm-label">שיח עם המטופל/ת</span>
                                <h2>הודעה אחר הודעה, כמו רצף ווטסאפ טיפולי</h2>
                            </div>
                            <div class="pnm-progress-ring">${state.reflectionIndex}/${script.length}</div>
                        </div>
                        <div class="pnm-chat-thread">
                            ${visibleItems.map((item) => {
                                if (item.kind === 'label') {
                                    return `<div class="pnm-chat-label">${escapeHtml(item.text)}</div>`;
                                }
                                return `
                                    <article class="pnm-chat-bubble pnm-chat-bubble--${item.kind}">
                                        <span class="pnm-chat-role">${item.kind === 'therapist' ? 'מטפל/ת' : 'מטופל/ת'}</span>
                                        <p>${escapeHtml(item.text)}</p>
                                    </article>
                                `;
                            }).join('')}
                        </div>
                        ${renderActionButtons(actions, 'pnm-actions--mobile')}
                    </section>

                    ${renderFocusStack(exercise)}
                </div>
                ${renderMapOverlay(state, exercise, { showBadges: true, title: 'מפת הרמות שמאחורי השיח' })}
            </section>
        `;
    }

    function renderSummary(state, exercise) {
        const actions = getSummaryActions();
        return `
            <section class="pnm-stage-card pnm-stage-card--summary">
                <div class="pnm-hero">
                    <div>
                        <p class="pnm-kicker">סיכום עבודה</p>
                        <h1>הגרעין והסדק כבר נראים במפה</h1>
                        <p class="pnm-copy">המסלול לא ניסה לתקן מהר. הוא איפשר לראות איפה המבנה מחזיק חזק, ואיפה כבר יש נקודת תנועה.</p>
                    </div>
                    <div class="pnm-count-chip">סיום תרגיל</div>
                </div>
                ${renderStageRail(state, exercise)}
                ${renderToolbar({
                    kicker: 'שלושת מוקדי היציאה',
                    title: 'הגרעין, הסדק והפאנץ׳ נשארים במרכז',
                    detail: 'המפה עדיין שם אם צריך לחזור אליה, אבל לא תופסת את כל המסך.'
                }, actions)}

                ${renderHierarchicalSummary(state, exercise)}

                ${renderActionButtons(actions, 'pnm-actions--mobile')}
                ${renderMapOverlay(state, exercise, { showBadges: true, title: 'המפה המלאה של התרגיל' })}
            </section>
        `;
    }

    function renderApp(state) {
        if (!state.loaded) return renderLoading();
        if (state.error) return renderError(state);

        const exercise = getCurrentExercise(state);
        if (!exercise) return renderError({ error: 'לא נמצא תרגיל זמין בנתונים.' });

        const shellClass = state.mode === 'standalone' ? 'pnm-shell pnm-shell--standalone' : 'pnm-shell pnm-shell--embedded';
        const stage = getEffectiveStage(state);
        let body = renderIntro(state, exercise);

        if (stage === 'build') body = renderBuild(state, exercise);
        if (stage === 'reflect') body = renderReflection(state, exercise);
        if (stage === 'summary') body = renderSummary(state, exercise);

        return `
            <section class="${shellClass}" dir="rtl" lang="he">
                ${body}
            </section>
        `;
    }

    function render(state) {
        state.root.innerHTML = renderApp(state);
    }

    async function retryLoad(state) {
        state.loaded = false;
        state.error = '';
        render(state);

        try {
            state.exercises = await loadExercises();
            state.loaded = true;
            state.error = '';
            resetExercise(state, state.exerciseIndex);
        } catch (error) {
            state.loaded = true;
            state.error = error instanceof Error ? error.message : String(error || 'Unknown error');
        }

        render(state);
    }

    function handleAction(state, action) {
        if (!action) return;

        if (action === 'retry-load') {
            retryLoad(state);
            return;
        }

        if (!state.loaded || state.error) return;

        if (action === 'start-build') {
            state.stage = 'build';
            state.mapOverlayOpen = false;
            render(state);
            return;
        }

        if (action === 'reveal-answer') {
            revealAnswer(state);
            render(state);
            return;
        }

        if (action === 'go-reflect') {
            state.stage = 'reflect';
            state.reflectionIndex = 0;
            state.mapOverlayOpen = false;
            render(state);
            return;
        }

        if (action === 'reveal-reflection') {
            const script = buildReflectionScript(getCurrentExercise(state));
            state.reflectionIndex = Math.min(script.length, state.reflectionIndex + 1);
            render(state);
            return;
        }

        if (action === 'go-summary') {
            state.stage = 'summary';
            state.mapOverlayOpen = false;
            render(state);
            return;
        }

        if (action === 'open-map-overlay') {
            state.mapOverlayOpen = true;
            render(state);
            return;
        }

        if (action === 'close-map-overlay') {
            state.mapOverlayOpen = false;
            render(state);
            return;
        }

        if (action === 'restart-exercise') {
            resetExercise(state, state.exerciseIndex);
            render(state);
            return;
        }

        if (action === 'next-exercise') {
            resetExercise(state, state.exerciseIndex + 1);
            render(state);
        }
    }

    function bindRoot(state) {
        state.root.addEventListener('click', (event) => {
            const actionEl = event.target.closest('[data-action]');
            if (!actionEl) return;
            handleAction(state, actionEl.getAttribute('data-action'));
        });
        document.addEventListener('keydown', (event) => {
            if (event.key !== 'Escape' || !state.mapOverlayOpen) return;
            state.mapOverlayOpen = false;
            render(state);
        });
    }

    async function mountRoot(root) {
        if (!root || root.dataset.prismNecessityMounted === 'true') return;
        root.dataset.prismNecessityMounted = 'true';

        const state = createState(root);
        bindRoot(state);
        render(state);

        try {
            state.exercises = await loadExercises();
            state.loaded = true;
            state.error = '';
        } catch (error) {
            state.loaded = true;
            state.error = error instanceof Error ? error.message : String(error || 'Unknown error');
        }

        render(state);
    }

    function mountAll() {
        ensureStylesheet();
        const roots = Array.from(document.querySelectorAll(ROOT_SELECTOR));
        roots.forEach((root) => {
            mountRoot(root);
        });
    }

    scope.PrismNecessityMap = Object.freeze({
        mountAll
    });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', mountAll, { once: true });
    } else {
        mountAll();
    }
})();
