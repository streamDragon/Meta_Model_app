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
        return {
            root,
            mode: root.getAttribute('data-prism-necessity-mode') || 'embedded',
            loaded: false,
            error: '',
            exercises: [],
            exerciseIndex: 0,
            stage: 'intro',
            questionIndex: 0,
            reflectionIndex: 0,
            cells: {}
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

    function getStageIndex(stage) {
        return Math.max(0, STAGES.findIndex((item) => item.id === stage));
    }

    function resetExercise(state, nextIndex) {
        if (Number.isInteger(nextIndex)) {
            state.exerciseIndex = ((nextIndex % state.exercises.length) + state.exercises.length) % state.exercises.length;
        }
        state.stage = 'intro';
        state.questionIndex = 0;
        state.reflectionIndex = 0;
        state.cells = {};
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
        const stageIndex = getStageIndex(state.stage);
        const questionTotal = exercise.questions.length;
        const answeredCount = getAnsweredCount(state);

        return `
            <div class="pnm-stage-rail" aria-label="מפת שלבים">
                ${STAGES.map((stage, index) => `
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
        return `
            <section class="pnm-map-card">
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

    function renderQuestionCard(state, exercise) {
        const question = getCurrentQuestion(state);
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
                    <div class="pnm-actions">
                        <button type="button" class="pnm-btn pnm-btn--primary" data-action="go-reflect">שיקוף + גרעין + סדק</button>
                        <button type="button" class="pnm-btn pnm-btn--ghost" data-action="restart-exercise">התחל מחדש</button>
                    </div>
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

                <div class="pnm-actions">
                    <button type="button" class="pnm-btn pnm-btn--primary" data-action="reveal-answer">חשוף את התשובה במפה</button>
                    <button type="button" class="pnm-btn pnm-btn--ghost" data-action="restart-exercise">התחל מחדש</button>
                </div>
            </section>
        `;
    }

    function renderBuild(state, exercise) {
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
                ${renderMap(state, exercise, { showBadges: isBuildComplete(state) })}
                ${renderQuestionCard(state, exercise)}
            </section>
        `;
    }

    function renderReflection(state, exercise) {
        const script = buildReflectionScript(exercise);
        const visibleItems = script.slice(0, state.reflectionIndex);
        const isDone = state.reflectionIndex >= script.length;

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
                ${renderMap(state, exercise, { showBadges: true })}

                <section class="pnm-chat-card">
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

                    <div class="pnm-actions">
                        ${!isDone
                            ? '<button type="button" class="pnm-btn pnm-btn--primary" data-action="reveal-reflection">הודעה הבאה</button>'
                            : '<button type="button" class="pnm-btn pnm-btn--primary" data-action="go-summary">לסיכום</button>'}
                        <button type="button" class="pnm-btn pnm-btn--ghost" data-action="restart-exercise">התחל מחדש</button>
                    </div>
                </section>
            </section>
        `;
    }

    function renderSummary(state, exercise) {
        const coreLevel = getLevel(exercise.core);
        const crackLevel = getLevel(exercise.crack);
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
                ${renderMap(state, exercise, { showBadges: true })}

                <div class="pnm-summary-grid">
                    <article class="pnm-summary-card" style="--pnm-tone:${coreLevel.color};--pnm-fill:${coreLevel.fill};">
                        <span class="pnm-label">גרעין</span>
                        <strong>${escapeHtml(coreLevel.label)}</strong>
                        <p>${escapeHtml(exercise.reflectCore)}</p>
                    </article>
                    <article class="pnm-summary-card" style="--pnm-tone:${crackLevel.color};--pnm-fill:${crackLevel.fill};">
                        <span class="pnm-label">סדק</span>
                        <strong>${escapeHtml(crackLevel.label)}</strong>
                        <p>${escapeHtml(exercise.reflectCrack)}</p>
                    </article>
                    <article class="pnm-summary-card pnm-summary-card--punch">
                        <span class="pnm-label">שאלת פאנץ׳</span>
                        <strong>${escapeHtml(exercise.punchQ)}</strong>
                        <p>${escapeHtml(exercise.punchA)}</p>
                    </article>
                </div>

                <div class="pnm-actions">
                    <button type="button" class="pnm-btn pnm-btn--primary" data-action="next-exercise">משפט הבא</button>
                    <button type="button" class="pnm-btn pnm-btn--ghost" data-action="restart-exercise">נסה שוב</button>
                </div>
            </section>
        `;
    }

    function renderApp(state) {
        if (!state.loaded) return renderLoading();
        if (state.error) return renderError(state);

        const exercise = getCurrentExercise(state);
        if (!exercise) return renderError({ error: 'לא נמצא תרגיל זמין בנתונים.' });

        const shellClass = state.mode === 'standalone' ? 'pnm-shell pnm-shell--standalone' : 'pnm-shell pnm-shell--embedded';
        let body = renderIntro(state, exercise);

        if (state.stage === 'build') body = renderBuild(state, exercise);
        if (state.stage === 'reflect') body = renderReflection(state, exercise);
        if (state.stage === 'summary') body = renderSummary(state, exercise);

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
