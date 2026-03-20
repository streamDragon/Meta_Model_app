(function attachPrismNecessityMap(global, document) {
    'use strict';

    if (!global || !document) return;

    const ROOT_SELECTOR = '[data-prism-necessity-app]';
    const STYLE_PATH = 'css/prism-necessity.css';
    const DATA_SOURCE = 'data/prism-necessity.json';
    const CATEGORY_SOURCE = 'data/prism-lab-categories.he.json';

    const CATEGORY_ID_MAP = Object.freeze({
        comparison: 'comparative_deletion',
        time_place: 'time_space_predicate',
        modal_operator: 'modal_operators_action',
        cause_effect: 'cause_effect',
        complex_equivalence: 'complex_equivalence',
        mind_reading: 'mind_reading',
        universal_quantifier: 'universal_quantifier',
        nominalization: 'nominalization',
        unspecified_verb: 'unspecified_verb',
        lost_performative: 'lost_performative'
    });

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
        values_beliefs: { label: 'אמונות / ערכים', shortLabel: 'אמונות' },
        identity: { label: 'זהות', shortLabel: 'זהות' },
        purpose_meaning: { label: 'משמעות / שייכות', shortLabel: 'משמעות' }
    });

    const WELCOME_TOPICS = Object.freeze({
        overview: Object.freeze({
            button: 'מה רואים כאן',
            kicker: 'תצוגה מקדימה',
            title: 'מה רואים במסך הזה',
            intro: 'הכלי בונה מפת עומק סביב משפט אחד. בכל שורה רואים את אותו נושא בשתי עמודות של רמות לוגיות.',
            bullets: Object.freeze([
                'עמודה A עוסקת במקור, בטריגר או במה שמפעיל את המערכת.',
                'עמודה B עוסקת בתוצאה, בתחושת העצמי או במה שנבנה מבפנים.',
                'הקווים בין העמודות מתחזקים לפי עוצמת הקשר שנחשפת בתוך הנתונים.',
                'בסיום המפה נפתח חלון תובנה שמדגיש את הגרעין המהותי, את הסדק ואת שאלת הפאנץ\'.'
            ]),
            foot: 'כך אפשר לעבור ממשפט שנשמע מוחלט אל מבנה שאפשר לקרוא, להבין ולעבוד איתו.'
        }),
        method: Object.freeze({
            button: 'איך עובדים',
            kicker: 'שיטת עבודה',
            title: 'איך עובדים עם המפה',
            intro: 'העבודה בנויה בשלושה שלבים קצרים וברורים: פתיחה, בחירת הפרת מטה-מודל ובניית המגדלים.',
            bullets: Object.freeze([
                'בכל רגע מופיעה שאלה אחת בלבד, כדי לשמור על מיקוד ולא להציף.',
                'לחיצה על חשיפת התשובה ממלאת תא אחד בלבד במפה.',
                'אפשר להתקדם צעד-צעד או למלא את כל המפה בבת אחת כשצריך לראות את המבנה השלם.',
                'אחרי שכל התאים מלאים, חלון התובנה מרכז את השיחה הטיפולית סביב הגרעין, הסדק ומה שהשתנה.'
            ]),
            foot: 'המטרה אינה רק להבין את המשפט, אלא לזהות איפה נכון להצטרף, לערער בעדינות או להמשיך לחקירה.'
        }),
        audience: Object.freeze({
            button: 'למי זה מתאים',
            kicker: 'קהל יעד',
            title: 'למי המסך הזה מתאים',
            intro: 'הכלי נכתב בעיקר למטפלים, מנחים ולומדי NLP מתקדמים, אבל הוא נגיש גם למי שרק מתחיל להבין מה הוא רואה.',
            bullets: Object.freeze([
                'למטפלים שרוצים לשלב מטה-מודל עם רמות לוגיות בתוך שיחה חיה.',
                'למנחים שרוצים להראות לסטודנטים איך משפט אחד פועל בכמה שכבות בו-זמנית.',
                'ללומדים שרוצים לעבור מזיהוי קטגוריה לעבודה קלינית, רגשית ומדויקת יותר.',
                'לכל מי שמחפש גשר בין שפה, אינטליגנציה רגשית ובחירת התערבות.'
            ]),
            foot: 'גם אם לא כל המונחים מוכרים עדיין, המבנה הוויזואלי עוזר להבין מהר מה קורה ומה כדאי לעשות עכשיו.'
        })
    });

    const WELCOME_PREVIEW_COPY = Object.freeze({
        purpose_meaning: Object.freeze({ a: 'מה מונח על הכף', b: 'מה זה אומר עליי' }),
        identity: Object.freeze({ a: 'מי הדמות שמולי', b: 'מי אני מול זה' }),
        values_beliefs: Object.freeze({ a: 'איזה כלל הופעל', b: 'במה אני מאמין שם' }),
        capability: Object.freeze({ a: 'מה יש לו', b: 'מה אובד לי' }),
        behavior: Object.freeze({ a: 'מה קורה בפועל', b: 'מה אני עושה' }),
        environment: Object.freeze({ a: 'איפה ומתי זה קורה', b: 'מה מקיף את הרגע' })
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

    function humanizeCategoryId(categoryId) {
        return normalizeText(categoryId)
            .split(/[_-]+/)
            .filter(Boolean)
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
            .join(' ');
    }

    function buildCategoryMeta(rawCategory) {
        return {
            id: normalizeText(rawCategory?.id),
            label: normalizeText(rawCategory?.label_he) || humanizeCategoryId(rawCategory?.id),
            subtitle: normalizeText(rawCategory?.short_subtitle_he),
            tag: normalizeText(rawCategory?.category_tag_he),
            focus: normalizeText(rawCategory?.conceptual_focus_he)
        };
    }

    function mapSession(rawSession, index, categoriesById) {
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

        const rawCategoryId = normalizeText(rawSession?.category);
        const categoryId = CATEGORY_ID_MAP[rawCategoryId] || rawCategoryId;
        const categoryMeta = categoriesById?.[categoryId] || {
            id: categoryId,
            label: humanizeCategoryId(categoryId),
            subtitle: '',
            tag: 'קטגוריה',
            focus: ''
        };

        return {
            id: String(rawSession?.id ?? index + 1),
            sentence: normalizeText(rawSession?.sentence),
            category: rawCategoryId,
            categoryId,
            categoryLabel: categoryMeta.label,
            categorySubtitle: categoryMeta.subtitle,
            categoryTag: categoryMeta.tag,
            categoryFocus: categoryMeta.focus,
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

        payloadPromise = Promise.all([
            fetchJson(DATA_SOURCE),
            fetchJson(CATEGORY_SOURCE)
        ])
            .then(([rawPayload, rawCategoriesPayload]) => {
                const rawCategories = Array.isArray(rawCategoriesPayload?.categories) ? rawCategoriesPayload.categories : [];
                const categoriesById = rawCategories.reduce((acc, entry) => {
                    const category = buildCategoryMeta(entry);
                    if (category.id) acc[category.id] = category;
                    return acc;
                }, {});

                const sessions = (Array.isArray(rawPayload) ? rawPayload : [])
                    .map((entry, index) => mapSession(entry, index, categoriesById))
                    .filter(Boolean);

                if (!sessions.length) {
                    throw new Error('No Necessity Map sessions were found in the dataset.');
                }

                const sessionsByCategory = sessions.reduce((acc, session) => {
                    (acc[session.categoryId] = acc[session.categoryId] || []).push(session);
                    return acc;
                }, {});

                const categories = rawCategories
                    .map((entry) => buildCategoryMeta(entry))
                    .filter((category) => category.id && Array.isArray(sessionsByCategory[category.id]) && sessionsByCategory[category.id].length);

                Object.keys(sessionsByCategory).forEach((categoryId) => {
                    if (categoriesById[categoryId]) return;
                    const fallback = {
                        id: categoryId,
                        label: sessionsByCategory[categoryId][0]?.categoryLabel || humanizeCategoryId(categoryId),
                        subtitle: sessionsByCategory[categoryId][0]?.categorySubtitle || '',
                        tag: sessionsByCategory[categoryId][0]?.categoryTag || 'קטגוריה',
                        focus: sessionsByCategory[categoryId][0]?.categoryFocus || ''
                    };
                    categories.push(fallback);
                    categoriesById[categoryId] = fallback;
                });

                payloadCache = {
                    sessions,
                    categories,
                    categoriesById,
                    sessionsByCategory
                };
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
            stage: 'welcome',
            selectedCategoryId: '',
            sessionIndex: 0,
            stepIndex: 0,
            insightOpen: false,
            scrollToTop: false
        };
    }

    function getCategories(state) {
        return Array.isArray(state.payload?.categories) ? state.payload.categories : [];
    }

    function wrapIndex(index, total) {
        if (!total) return 0;
        return ((index % total) + total) % total;
    }

    function getCategory(state) {
        return state.payload?.categoriesById?.[state.selectedCategoryId] || null;
    }

    function getCategorySessions(state) {
        return state.payload?.sessionsByCategory?.[state.selectedCategoryId] || [];
    }

    function getSession(state) {
        const sessions = getCategorySessions(state);
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

    function openCategory(state, categoryId) {
        const category = state.payload?.categoriesById?.[categoryId];
        if (!category) return false;
        state.selectedCategoryId = categoryId;
        state.sessionIndex = 0;
        state.stepIndex = 0;
        state.insightOpen = false;
        state.stage = 'towers';
        state.scrollToTop = true;
        return true;
    }

    function openCategorySession(state, index) {
        const sessions = getCategorySessions(state);
        if (!sessions.length) return false;
        state.sessionIndex = wrapIndex(index, sessions.length);
        state.stepIndex = 0;
        state.insightOpen = false;
        state.stage = 'towers';
        state.scrollToTop = true;
        return true;
    }

    function goToWelcome(state) {
        state.stage = 'welcome';
        state.insightOpen = false;
        state.scrollToTop = true;
        return true;
    }

    function goToSelect(state) {
        state.stage = 'select';
        state.insightOpen = false;
        state.scrollToTop = true;
        return true;
    }

    function goToTowers(state) {
        if (!state.selectedCategoryId || !getCategorySessions(state).length) return false;
        state.stage = 'towers';
        state.scrollToTop = true;
        return true;
    }

    function closeInsight(state) {
        if (!state.insightOpen) return false;
        state.insightOpen = false;
        return true;
    }

    function resetCurrentTowers(state) {
        if (!getSession(state)) return false;
        state.stage = 'towers';
        state.stepIndex = 0;
        state.insightOpen = false;
        state.scrollToTop = true;
        return true;
    }

    function restartFeature(state) {
        state.stage = 'welcome';
        state.selectedCategoryId = '';
        state.sessionIndex = 0;
        state.stepIndex = 0;
        state.insightOpen = false;
        state.scrollToTop = true;
        return true;
    }

    function advanceBuild(state) {
        const session = getSession(state);
        if (!session) return false;
        const filledCount = getFilledCount(state, session);
        if (filledCount >= session.questions.length) return false;
        state.stepIndex = filledCount + 1;
        if (state.stepIndex >= session.questions.length) {
            state.insightOpen = true;
        }
        return true;
    }

    function restartCurrentSession(state) {
        return restartFeature(state);
    }

    function stepBack(state) {
        if (state.stage === 'towers') {
            if (state.insightOpen) {
                state.insightOpen = false;
                return true;
            }
            const session = getSession(state);
            if (session) {
                const filledCount = getFilledCount(state, session);
                if (filledCount > 0) {
                    state.stepIndex = filledCount - 1;
                    return true;
                }
            }
            state.stage = 'select';
            state.scrollToTop = true;
            return true;
        }

        if (state.stage === 'select') {
            state.stage = 'welcome';
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
                const handled = restartFeature(state);
                if (handled) renderApp(state);
                return handled;
            }
        };
    }

    function renderCategorySessionNavigator(state, category) {
        const sessions = getCategorySessions(state);
        if (!sessions.length) return '';

        return `
            <div class="pnm-case-nav">
                <button type="button" class="pnm-mini-btn" data-action="prev-session">הקודם</button>
                <label class="pnm-case-select">
                    <span class="pnm-section-label">${escapeHtml(category?.label || 'מקרה')}</span>
                    <select data-role="session-picker" aria-label="בחירת מקרה בתוך הקטגוריה">
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

    function renderStageRail(state) {
        const towersAvailable = !!state.selectedCategoryId && getCategorySessions(state).length > 0;
        const stages = [
            { id: 'welcome', label: 'קבלת פנים', index: '1', action: 'go-welcome', available: true },
            { id: 'select', label: 'בחירה', index: '2', action: 'go-select', available: true },
            { id: 'towers', label: 'מגדלים', index: '3', action: 'go-towers', available: towersAvailable }
        ];

        return `
            <div class="pnm-stage-rail" aria-label="שלבי התרגול">
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

    function renderWelcomeStage(state) {
        return `
            <section class="pnm-view pnm-view--welcome">
                ${renderStageRail(state)}
                <article class="pnm-hero-card">
                    <div class="pnm-stage-head">
                        <div class="pnm-stage-head__copy">
                            <p class="pnm-kicker">רמות לוגיות + מטה מודל</p>
                            <h1 class="pnm-stage-title">מפה משולבת של רמות לוגיות וקטגוריות מטה־מודל</h1>
                            <p class="pnm-copy">כאן עובדים עם שני מגדלים של רמות לוגיות ועם הקשרים ביניהם. בוחרים הפרת מטה־מודל, בונים את מגדל A ואת מגדל B, ובסוף פותחים חלון תובנה עם הגרעין המהותי, הסדק והפאנץ'.</p>
                        </div>
                    </div>
                    <div class="pnm-chip-row">
                        <span class="pnm-chip">שלב 1 · קבלת פנים</span>
                        <span class="pnm-chip">שלב 2 · בחירה</span>
                        <span class="pnm-chip">שלב 3 · מגדלים</span>
                    </div>
                    <div class="pnm-action-row">
                        <button type="button" class="pnm-btn pnm-btn--primary" data-action="go-select">עוברים לבחירה</button>
                    </div>
                </article>
                <div class="pnm-welcome-grid">
                    <article class="pnm-side-card">
                        <span class="pnm-section-label">מה בוחנים כאן</span>
                        <strong>איך קטגוריית מטה־מודל פועלת יחד עם הרמות הלוגיות ולא רק ברמת המשפט.</strong>
                    </article>
                    <article class="pnm-side-card">
                        <span class="pnm-section-label">איך בונים</span>
                        <strong>שאלה אחת בכל פעם, תא אחד בכל פעם, עד ששני המגדלים שלמים ומחוברים.</strong>
                    </article>
                    <article class="pnm-side-card">
                        <span class="pnm-section-label">מה נפתח בסוף</span>
                        <strong>חלון שיחה עם הגרעין, הסדק, הפאנץ' ואמירת השינוי של המטופל/ת.</strong>
                    </article>
                </div>
            </section>
        `;
    }

    function renderCategoryCard(category, count) {
        return `
            <button type="button" class="pnm-category-card" data-action="open-category" data-category-id="${escapeHtml(category.id)}">
                <div class="pnm-question-meta">
                    ${category.tag ? `<span class="pnm-chip">${escapeHtml(category.tag)}</span>` : ''}
                    <span class="pnm-chip">${count} מקרים</span>
                </div>
                <strong>${escapeHtml(category.label)}</strong>
                ${category.subtitle ? `<p>${escapeHtml(category.subtitle)}</p>` : ''}
                ${category.focus ? `<small>${escapeHtml(category.focus)}</small>` : ''}
            </button>
        `;
    }

    function renderSelectStage(state) {
        const categories = getCategories(state);
        return `
            <section class="pnm-view pnm-view--select">
                ${renderStageRail(state)}
                <article class="pnm-hero-card pnm-hero-card--compact">
                    <div class="pnm-stage-head">
                        <div class="pnm-stage-head__copy">
                            <p class="pnm-kicker">בחירה</p>
                            <h2 class="pnm-stage-title">בחר מהי הפרת המטה־מודל שאתה רוצה לחקור כיום</h2>
                            <p class="pnm-copy">פה תוכל לבחור איזה שילוב מרתק אתה רוצה לבחון, לשפר וללמוד טוב יותר: קטגוריית מטה־מודל שפועלת יחד עם הרמות הלוגיות.</p>
                        </div>
                    </div>
                </article>
                <div class="pnm-select-intro">
                    <article class="pnm-side-card">
                        <span class="pnm-section-label">הקשר בין השכבות</span>
                        <strong>אותה הפרת מטה־מודל נראית אחרת לגמרי כשהיא נשענת על סביבה, התנהגות, זהות או משמעות.</strong>
                    </article>
                    <article class="pnm-side-card">
                        <span class="pnm-section-label">מכאן ממשיכים</span>
                        <strong>בוחרים קטגוריה, עוברים למגדלים, חושפים תשובות, ובסוף פותחים חלון תובנה.</strong>
                    </article>
                </div>
                <div class="pnm-category-grid">
                    ${categories.map((category) => renderCategoryCard(category, (state.payload?.sessionsByCategory?.[category.id] || []).length)).join('')}
                </div>
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
                    <p class="pnm-copy">המגדלים הושלמו. עכשיו אפשר לפתוח את חלון התובנה עם הגרעין, הסדק והפאנץ'.</p>
                    <div class="pnm-action-row">
                        <button type="button" class="pnm-btn pnm-btn--primary" data-action="open-insight">פתח חלון תובנה</button>
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
                <p class="pnm-copy">בלחיצה חושפים את התשובה, ממלאים תא אחד במגדל, ומחזקים את הקשר בין הצדדים.</p>
                <div class="pnm-action-row">
                    <button type="button" class="pnm-btn pnm-btn--primary" data-action="fill-active">חשוף תשובה</button>
                    ${getFilledCount(state, session) > 0 ? '<button type="button" class="pnm-btn pnm-btn--ghost" data-action="step-back">צעד אחורה</button>' : ''}
                </div>
            </article>
        `;
    }

    function renderTowersStage(state, session, category) {
        const filledCount = getFilledCount(state, session);
        const progress = session.questions.length
            ? Math.round((filledCount / session.questions.length) * 100)
            : 0;

        return `
            <section class="pnm-view pnm-view--towers">
                ${renderStageRail(state)}
                ${renderCategorySessionNavigator(state, category)}
                <article class="pnm-hero-card pnm-hero-card--compact">
                    <div class="pnm-stage-head">
                        <div class="pnm-stage-head__copy">
                            <p class="pnm-kicker">${escapeHtml(category?.label || 'מגדלים')}</p>
                            <h2 class="pnm-stage-title">"${escapeHtml(session.sentence)}"</h2>
                            <p class="pnm-copy">זהו דף המגדלים: חושפים תשובות, ממלאים את שני המגדלים, ורואים איך הקשרים בין הרמות הלוגיות יוצרים את התנועה בין A ל־B.</p>
                        </div>
                        <div class="pnm-inline-actions">
                            <span class="pnm-chip">${filledCount}/${session.questions.length} תאים</span>
                            <button type="button" class="pnm-mini-btn" data-action="go-select">חזרה לבחירה</button>
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
        return `הליבה נשענת על ${coreLabel}, והסדק שדרכו מתחילה התנועה נמצא ב-${crackLabel}.`;
    }

    function renderReflectCard(label, body, modifier = '') {
        return `
            <article class="pnm-reflect-card${modifier ? ` ${modifier}` : ''}">
                <span class="pnm-section-label">${escapeHtml(label)}</span>
                <p>${escapeHtml(body)}</p>
            </article>
        `;
    }

    function renderInsightModal(state, session) {
        if (!state.insightOpen) return '';
        return `
            <div class="pnm-insight-backdrop">
                <div class="pnm-insight-modal" role="dialog" aria-modal="true" aria-label="חלון תובנה">
                    <div class="pnm-stage-head">
                        <div class="pnm-stage-head__copy">
                            <p class="pnm-kicker">חלון תובנה</p>
                            <h3 class="pnm-stage-title">הגרעין, הסדק והפאנץ'</h3>
                            <p class="pnm-copy">אחרי שהמגדלים נבנו, נפתחת כאן שיחה קצרה שמזקקת את מה שנחשף במפה.</p>
                        </div>
                        <div class="pnm-inline-actions">
                            <button type="button" class="pnm-mini-btn" data-action="close-insight">סגור</button>
                        </div>
                    </div>
                    <div class="pnm-reflect-stats">
                        <article class="pnm-reflect-stat pnm-reflect-stat--core">
                            <span class="pnm-section-label">הגרעין המהותי</span>
                            <strong>${escapeHtml(getLevelLabel(session.core))}</strong>
                        </article>
                        <article class="pnm-reflect-stat pnm-reflect-stat--crack">
                            <span class="pnm-section-label">הסדק</span>
                            <strong>${escapeHtml(getLevelLabel(session.crack))}</strong>
                        </article>
                    </div>
                    <div class="pnm-reflect-grid">
                        ${renderReflectCard('מטפל/ת · הגרעין', session.reflectCore)}
                        ${renderReflectCard('מטפל/ת · הסדק', session.reflectCrack)}
                        ${renderReflectCard('הפאנץ׳', session.punchQuestion, 'pnm-reflect-card--question')}
                        ${renderReflectCard('מטופל/ת · מה השתנה', session.punchAnswer, 'pnm-reflect-card--answer')}
                    </div>
                    <article class="pnm-summary-banner">
                        <span class="pnm-section-label">כיוון להמשך</span>
                        <strong>${escapeHtml(buildFinalSummary(session))}</strong>
                    </article>
                    <div class="pnm-action-row">
                        <button type="button" class="pnm-btn pnm-btn--primary" data-action="reset-towers">בונים מחדש</button>
                        <button type="button" class="pnm-btn pnm-btn--ghost" data-action="go-select">חזרה לבחירה</button>
                    </div>
                </div>
            </div>
        `;
    }

    function renderLoading() {
        return '<section class="pnm-view"><div class="pnm-panel pnm-panel--loading">טוענים את המפה המשולבת...</div></section>';
    }

    function renderError(state) {
        return `
            <section class="pnm-view">
                <div class="pnm-panel pnm-panel--error">
                    <strong>המפה לא נטענה.</strong>
                    <p>${escapeHtml(state.error || 'תקלה לא ידועה')}</p>
                    <button type="button" class="pnm-btn pnm-btn--primary" data-action="retry-load">נסה שוב</button>
                </div>
            </section>
        `;
    }

    function renderApp(state) {
        const shellClass = state.mode === 'standalone' ? 'pnm-app pnm-app--standalone' : 'pnm-app pnm-app--embedded';
        const category = getCategory(state);
        const session = getSession(state);
        let body = '';

        if (state.error) {
            body = renderError(state);
        } else if (!state.loaded || !state.payload) {
            body = renderLoading();
        } else if (state.stage === 'welcome') {
            body = renderWelcomeStage(state);
        } else if (state.stage === 'select') {
            body = renderSelectStage(state);
        } else if (!session || !category) {
            body = renderError({ error: 'No session available.' });
        } else {
            body = `${renderTowersStage(state, session, category)}${renderInsightModal(state, session)}`;
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

            if (action === 'prev-session') handled = openCategorySession(state, state.sessionIndex - 1);
            if (action === 'next-session') handled = openCategorySession(state, state.sessionIndex + 1);
            if (action === 'go-welcome') handled = goToWelcome(state);
            if (action === 'go-select') handled = goToSelect(state);
            if (action === 'go-towers') handled = goToTowers(state);
            if (action === 'open-category') handled = openCategory(state, normalizeText(actionNode.getAttribute('data-category-id')));
            if (action === 'open-insight') handled = isSessionComplete(state) ? (state.insightOpen = true, true) : false;
            if (action === 'close-insight') handled = closeInsight(state);
            if (action === 'fill-active') handled = advanceBuild(state);
            if (action === 'restart-session') handled = restartCurrentSession(state);
            if (action === 'reset-towers') handled = resetCurrentTowers(state);
            if (action === 'step-back') handled = stepBack(state);

            if (handled) renderApp(state);
        };

        state.root.onchange = (event) => {
            if (!state.loaded || !state.payload) return;
            const picker = event.target.closest('[data-role="session-picker"]');
            if (!picker) return;
            const nextIndex = Number(picker.value);
            if (!Number.isInteger(nextIndex)) return;
            if (openCategorySession(state, nextIndex)) renderApp(state);
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
