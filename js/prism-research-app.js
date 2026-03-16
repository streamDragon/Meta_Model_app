(function attachPrismResearchApp() {
    const root = typeof globalThis !== 'undefined' ? globalThis : window;
    const appEl = document.getElementById('prism-research-app');
    if (!appEl) return;

    const core = root.prismResearchCore;
    if (!core) {
        appEl.innerHTML = '<div class="prm-error">Prism Research core failed to load.</div>';
        return;
    }

    const STORAGE_KEY = 'prism_research_mode_v1';
    const DEMO_STORY = [
        'מחר יש לי שיחה עם המנהל ואני כבר מרגיש/ה שזה הולך להיגמר רע.',
        'הוא בטח חושב שאני לא מקצועי/ת כי בשבוע שעבר נתקעתי בתשובה אחת.',
        'אני חייב/ת להיות מושלם/ת שם, אחרת זה אומר שאני כישלון.',
        'כל פעם שיש שיחה כזאת אני נסגר/ת ולא מצליח/ה להסביר את עצמי.'
    ].join(' ');

    const state = {
        loaded: false,
        loadError: '',
        categories: [],
        categoriesById: {},
        session: null,
        currentContextText: '',
        currentContextType: 'base',
        currentParentNodeId: null,
        tokens: [],
        selection: null,
        selectionAnchorTokenIndex: null,
        selectionAwaitingEnd: false,
        pendingNodeId: null,
        pendingQA: null,
        lastReport: null,
        uiMessage: '',
        baseStoryEditorOpen: false,
        baseStoryDraft: '',
        showRecursiveGuide: false
    };

    const PRISM_BREEN_OUTSIDE_ORDER = Object.freeze([
        'lost_performative',
        'universal_quantifiers',
        'nominalization',
        'comparative_deletion',
        'unspecified_noun',
        'simple_deletion',
        'presuppositions'
    ]);

    const PRISM_BREEN_INSIDE_ORDER = Object.freeze([
        'mind_reading',
        'modal_necessity',
        'modal_possibility',
        'cause_effect',
        'complex_equivalence',
        'lack_ref_index',
        'unspecified_verb',
        'rules_generalization'
    ]);

    const PRISM_BREEN_ORDER_INDEX = Object.freeze(
        [...PRISM_BREEN_OUTSIDE_ORDER, ...PRISM_BREEN_INSIDE_ORDER]
            .reduce((acc, id, index) => {
                acc[id] = index;
                return acc;
            }, {})
    );

    const PRISM_CATEGORY_UI_OVERRIDES = Object.freeze({
        lost_performative: Object.freeze({
            side: 'outside',
            titleHe: 'מחיקה שיפוטית (Lost Performative)',
            shortLine: 'מי קבע? על סמך מה?'
        }),
        universal_quantifiers: Object.freeze({
            side: 'outside',
            titleHe: 'כמתים כוללניים (Universal Quantifier)',
            shortLine: 'תמיד/אף פעם? היקף וחריגים'
        }),
        nominalization: Object.freeze({
            side: 'outside',
            titleHe: 'נומינליזציה (Nominalisation)',
            shortLine: 'להחזיר תהליך במקום שם עצם קפוא'
        }),
        comparative_deletion: Object.freeze({
            side: 'outside',
            titleHe: 'השוואה חסרה (Comparative Deletion)',
            shortLine: 'ביחס למה? לפי איזה קריטריון?'
        }),
        unspecified_noun: Object.freeze({
            side: 'outside',
            titleHe: 'שם עצם לא-מפנה / לא מפורט',
            shortLine: 'מי/מה בדיוק זה?'
        }),
        simple_deletion: Object.freeze({
            side: 'outside',
            titleHe: 'מחיקה פשוטה (כולל זמן/מרחב חסר)',
            shortLine: 'מה חסר כדי להבין את התמונה?'
        }),
        presuppositions: Object.freeze({
            side: 'outside',
            titleHe: 'הנחות סמויות (Presuppositions)',
            shortLine: 'מה חייב להיות נכון כדי שהמשפט יחזיק?'
        }),
        mind_reading: Object.freeze({
            side: 'inside',
            titleHe: 'קריאת מחשבות / קפיצה למסקנות',
            shortLine: 'כולל Mind-Reading עצמי: "איך אני יודע/ת?"'
        }),
        modal_necessity: Object.freeze({
            side: 'inside',
            titleHe: 'אופרטור מודלי - הכרח (Modal)',
            shortLine: 'חייב/צריך - מה המחיר אם לא?'
        }),
        modal_possibility: Object.freeze({
            side: 'inside',
            titleHe: 'אופרטור מודלי - אפשרות (Modal)',
            shortLine: 'לא יכול/ה - מה מונע ומה יאפשר?'
        }),
        cause_effect: Object.freeze({
            side: 'inside',
            titleHe: 'סיבה ותוצאה (Cause & Effect)',
            shortLine: 'איך בדיוק X גורם ל-Y?'
        }),
        complex_equivalence: Object.freeze({
            side: 'inside',
            titleHe: 'שקילות מורכבת (Complex Equivalence)',
            shortLine: 'איך X אומר ש-Y?'
        }),
        lack_ref_index: Object.freeze({
            side: 'inside',
            titleHe: 'חוסר אינדקס ייחוס (Referential Index)',
            shortLine: 'למי/למה בדיוק זה מתייחס?'
        }),
        unspecified_verb: Object.freeze({
            side: 'inside',
            titleHe: 'פועל לא מפורט (Unspecified Verb)',
            shortLine: 'מה בדיוק קורה בפועל?'
        }),
        rules_generalization: Object.freeze({
            side: 'inside',
            titleHe: 'כללים/חוקים פנימיים (Rules)',
            shortLine: 'מה הכלל, ומתי הוא לא עובד?'
        })
    });

    function escapeHtml(value) {
        if (value === null || value === undefined) return '';
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function assetUrl(path) {
        const raw = String(path || '');
        const v = root.__PRISM_RESEARCH_ASSET_V__;
        if (!v) return raw;
        const sep = raw.includes('?') ? '&' : '?';
        return `${raw}${sep}v=${encodeURIComponent(v)}`;
    }

    async function fetchJson(path) {
        const response = await fetch(assetUrl(path), { cache: 'no-store' });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status} loading ${path}`);
        }
        return response.json();
    }

    function getCategoryUiOverride(categoryId) {
        return PRISM_CATEGORY_UI_OVERRIDES[String(categoryId || '')] || null;
    }

    function getCategoryDisplayTitle(category) {
        const override = getCategoryUiOverride(category && category.categoryId);
        return String((override && override.titleHe) || (category && category.labelHe) || (category && category.categoryId) || 'קטגוריה');
    }

    function getCategoryDisplayHint(category) {
        const override = getCategoryUiOverride(category && category.categoryId);
        if (override && override.shortLine) return String(override.shortLine);
        const question = Array.isArray(category && category.primaryQuestions) && category.primaryQuestions[0]
            ? String(category.primaryQuestions[0])
            : '';
        return question || String(category && category.definition || '');
    }

    function getMindReadingExtraNote() {
        return 'Mind Reading כולל גם קריאת מחשבות עצמית ("אני רעב/פגוע/לא מסוגל" - איך אני יודע/ת?) וגם קפיצה למסקנות.';
    }

    function normalizeQuestionVariantText(text) {
        let value = String(text || '').trim().replace(/\s+/g, ' ');
        if (!value) return '';
        value = value.replace(/[.:]+$/, '').trim();
        if (!/[?ן¼]$/.test(value)) value = `${value}?`;
        return value;
    }

    function uniqueQuestionList(list) {
        const out = [];
        const seen = new Set();
        (Array.isArray(list) ? list : []).forEach((item) => {
            const value = normalizeQuestionVariantText(item);
            if (!value) return;
            const key = value.toLowerCase();
            if (seen.has(key)) return;
            seen.add(key);
            out.push(value);
        });
        return out;
    }

    function buildQuestionVariantPack({ category, selectionText, contextText, stepIndex }) {
        const selection = String(selectionText || '').trim();
        const context = String(contextText || '').trim();
        const baseQuestions = uniqueQuestionList(category && category.primaryQuestions);
        const fallbackCoreQuestion = String(core.generateQuestion({
            category,
            selectionText,
            contextText,
            stepIndex
        }) || '').trim();

        const firstBase = baseQuestions[0] || normalizeQuestionVariantText(fallbackCoreQuestion) || 'מה בדיוק קורה כאן?';
        const shortSelection = selection.length > 44 ? `${selection.slice(0, 41)}...` : selection;
        const shortContext = context.length > 64 ? `${context.slice(0, 61)}...` : context;

        const wrappedVariants = [];
        if (shortSelection) {
            wrappedVariants.push(`כשאת/ה אומר/ת "${shortSelection}" ג€” ${firstBase}`);
            wrappedVariants.push(`בוא/י נדייק את "${shortSelection}": ${firstBase}`);
            wrappedVariants.push(`כדי להבין את "${shortSelection}" טוב יותר: ${firstBase}`);
        }
        if (shortContext) {
            wrappedVariants.push(`בתוך ההקשר הזה, ${firstBase}`);
        }

        const allVariants = uniqueQuestionList([
            ...baseQuestions,
            ...wrappedVariants,
            fallbackCoreQuestion
        ]).slice(0, 6);

        const selectedIndex = allVariants.length
            ? Math.abs(Number(stepIndex) || 0) % allVariants.length
            : 0;

        return {
            selectedIndex,
            selectedQuestion: allVariants[selectedIndex] || firstBase,
            variants: allVariants
        };
    }

    function tokenizeText(text) {
        const source = String(text || '');
        const out = [];
        const re = /\s+|[^\s]+/g;
        let match;
        while ((match = re.exec(source))) {
            const tokenText = match[0];
            out.push({
                text: tokenText,
                start: match.index,
                end: match.index + tokenText.length,
                isSpace: /^\s+$/.test(tokenText)
            });
        }
        return out;
    }

    function resetSelection() {
        state.selection = null;
        state.selectionAnchorTokenIndex = null;
        state.selectionAwaitingEnd = false;
    }

    function resetPendingQa() {
        state.pendingNodeId = null;
        state.pendingQA = null;
    }

    function createFreshSession(baseStoryText) {
        const normalizedBaseStory = String(baseStoryText || '').trim();
        state.session = core.createSession({
            baseStoryText: normalizedBaseStory,
            language: 'he',
            baseStoryId: 'manual'
        });
        state.currentContextText = state.session.baseStoryText;
        state.currentContextType = 'base';
        state.currentParentNodeId = null;
        resetSelection();
        resetPendingQa();
        state.lastReport = null;
        state.uiMessage = 'נוצר סשן חדש. סמן/י קטע ובחר/י פריזמה.';
        state.baseStoryDraft = normalizedBaseStory || DEMO_STORY;
        syncTokens();
        persistState();
    }

    function syncTokens() {
        state.tokens = tokenizeText(state.currentContextText);
    }

    function getSelectedText() {
        if (!state.selection) return '';
        return String(state.currentContextText || '').slice(state.selection.start, state.selection.end);
    }

    function updateSelectionFromTokenRange(startTokenIndex, endTokenIndex) {
        const left = Math.min(startTokenIndex, endTokenIndex);
        const right = Math.max(startTokenIndex, endTokenIndex);
        const tokens = state.tokens.filter(token => !token.isSpace);
        const leftToken = tokens[left];
        const rightToken = tokens[right];
        if (!leftToken || !rightToken) return;
        state.selection = {
            start: leftToken.start,
            end: rightToken.end,
            text: String(state.currentContextText || '').slice(leftToken.start, rightToken.end)
        };
    }

    function getSelectableTokenIndices() {
        const indices = [];
        state.tokens.forEach((token, idx) => {
            if (!token.isSpace) indices.push(idx);
        });
        return indices;
    }

    function selectTokenByVisualIndex(visualIndex) {
        if (state.pendingNodeId) {
            state.uiMessage = 'בחר/י קודם חזור לבסיס או המשך מהתשובה.';
            render();
            return;
        }
        const selectable = getSelectableTokenIndices();
        if (visualIndex < 0 || visualIndex >= selectable.length) return;
        const tokenIdx = selectable[visualIndex];

        if (state.selectionAwaitingEnd && Number.isInteger(state.selectionAnchorTokenIndex)) {
            updateSelectionFromTokenRange(state.selectionAnchorTokenIndex, visualIndex);
            state.selectionAnchorTokenIndex = null;
            state.selectionAwaitingEnd = false;
            state.uiMessage = 'הסימון עודכן. עכשיו בחר/י קטגוריה לשונית-לוגית.';
        } else {
            updateSelectionFromTokenRange(visualIndex, visualIndex);
            state.selectionAnchorTokenIndex = visualIndex;
            state.selectionAwaitingEnd = true;
            state.uiMessage = 'לחיצה נוספת תרחיב לספאן רציף. אפשר גם לבחור קטגוריה כבר עכשיו.';
        }

        render();
        persistState();
    }

    function getCategory(categoryId) {
        return state.categoriesById[String(categoryId || '')] || null;
    }

    function runPrismStep(categoryId) {
        const category = getCategory(categoryId);
        if (!category) return;
        if (state.pendingNodeId) {
            state.uiMessage = 'קיים צעד פתוח. בחר/י חזור לבסיס או המשך מהתשובה לפני שאלה נוספת.';
            render();
            return;
        }
        if (!state.selection) {
            state.uiMessage = 'צריך סימון טקסט לפני בחירת פריזמה.';
            render();
            return;
        }

        const stepIndex = state.session.nodes.length;
        const selectionText = getSelectedText();
        const questionPack = buildQuestionVariantPack({
            category,
            selectionText,
            contextText: state.currentContextText,
            stepIndex
        });
        const questionText = questionPack.selectedQuestion;
        const answerGen = core.generateContinuityAnswer({
            category,
            selectionText,
            contextText: state.currentContextText,
            stepIndex
        });

        const node = core.appendNode(state.session, {
            parentId: state.currentParentNodeId,
            contextType: state.currentContextType,
            contextText: state.currentContextText,
            selection: {
                start: state.selection.start,
                end: state.selection.end,
                text: selectionText
            },
            category,
            questionText,
            answerText: answerGen.answerText,
            generatedSentence: answerGen.generatedSentence,
            tags: answerGen.tags
        });

        state.pendingNodeId = node.nodeId;
        state.pendingQA = {
            nodeId: node.nodeId,
            categoryLabelHe: node.categoryLabelHe,
            questionText,
            questionVariants: questionPack.variants,
            selectedQuestionIndex: questionPack.selectedIndex,
            answerText: node.answerText,
            generatedSentence: node.generatedSentence
        };
        state.lastReport = null;
        state.uiMessage = 'נוצר צעד חדש. בחר/י חזור לבסיס או המשך מהתשובה.';

        render();
        persistState();
    }

    function backToBase() {
        if (!state.session) return;
        state.currentContextText = state.session.baseStoryText;
        state.currentContextType = 'base';
        state.currentParentNodeId = null;
        syncTokens();
        resetSelection();
        resetPendingQa();
        state.uiMessage = 'חזרנו לבסיס. סמן/י קטע חדש ובחר/י פריזמה.';
        render();
        persistState();
    }

    function continueFromAnswer() {
        if (!state.pendingNodeId || !state.pendingQA) return;
        const node = state.session.nodes.find(item => item.nodeId === state.pendingNodeId);
        if (!node) return;
        state.currentContextText = String(node.generatedSentence || node.answerText || '').trim();
        state.currentContextType = 'continued';
        state.currentParentNodeId = node.nodeId;
        syncTokens();
        resetSelection();
        resetPendingQa();
        state.uiMessage = 'המשכנו מהתשובה. עכשיו אפשר לסמן את המשפט החדש.';
        render();
        persistState();
    }

    function pickPendingQuestionVariant(variantIndex) {
        if (!state.pendingQA || !Array.isArray(state.pendingQA.questionVariants)) return;
        const idx = Number(variantIndex);
        if (!Number.isInteger(idx)) return;
        const nextQuestion = String(state.pendingQA.questionVariants[idx] || '').trim();
        if (!nextQuestion) return;

        state.pendingQA.selectedQuestionIndex = idx;
        state.pendingQA.questionText = nextQuestion;

        const node = state.session && Array.isArray(state.session.nodes)
            ? state.session.nodes.find(item => item.nodeId === state.pendingQA.nodeId)
            : null;
        if (node) {
            node.questionText = nextQuestion;
        }

        state.uiMessage = 'עודכן ניסוח השאלה לאותה קטגוריה (אותה כוונה טיפולית, ניסוח אחר).';
        render();
        persistState();
    }

    function generateReport() {
        if (!state.session) return;
        state.lastReport = core.buildAfaqReport(state.session, { categoriesById: state.categoriesById });
        state.uiMessage = 'סיכום החקירה הופק מהסשן הנוכחי.';
        render();
        persistState();
    }

    function copyReportJson() {
        if (!state.lastReport) return;
        copyText(JSON.stringify({
            session: state.session,
            report: state.lastReport
        }, null, 2), 'הדוח הועתק כ-JSON.');
    }

    function copyReportMarkdown() {
        if (!state.lastReport) return;
        const markdown = core.reportToMarkdown(state.lastReport);
        copyText(markdown, 'הדוח הועתק כ-Markdown.');
    }

    function copyText(text, successMessage) {
        const payload = String(text || '');
        const after = () => {
            state.uiMessage = successMessage;
            render();
        };

        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(payload).then(after).catch(() => {
                fallbackCopy(payload);
                after();
            });
            return;
        }
        fallbackCopy(payload);
        after();
    }

    function fallbackCopy(text) {
        const ta = document.createElement('textarea');
        ta.value = String(text || '');
        document.body.appendChild(ta);
        ta.select();
        try {
            document.execCommand('copy');
        } catch (error) {
            // no-op fallback
        }
        ta.remove();
    }

    function persistState() {
        try {
            const snapshot = {
                session: state.session,
                currentContextText: state.currentContextText,
                currentContextType: state.currentContextType,
                currentParentNodeId: state.currentParentNodeId,
                selection: state.selection,
                selectionAnchorTokenIndex: state.selectionAnchorTokenIndex,
                selectionAwaitingEnd: state.selectionAwaitingEnd,
                pendingNodeId: state.pendingNodeId,
                pendingQA: state.pendingQA,
                lastReport: state.lastReport,
                baseStoryEditorOpen: state.baseStoryEditorOpen,
                baseStoryDraft: state.baseStoryDraft
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
        } catch (error) {
            // localStorage may be unavailable
        }
    }

    function restoreState() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return false;
            const parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== 'object' || !parsed.session || !Array.isArray(parsed.session.nodes)) return false;
            state.session = parsed.session;
            state.currentContextText = String(parsed.currentContextText || parsed.session.baseStoryText || '');
            state.currentContextType = parsed.currentContextType === 'continued' ? 'continued' : 'base';
            state.currentParentNodeId = parsed.currentParentNodeId || null;
            state.selection = parsed.selection || null;
            state.selectionAnchorTokenIndex = Number.isInteger(parsed.selectionAnchorTokenIndex) ? parsed.selectionAnchorTokenIndex : null;
            state.selectionAwaitingEnd = !!parsed.selectionAwaitingEnd;
            state.pendingNodeId = parsed.pendingNodeId || null;
            state.pendingQA = parsed.pendingQA || null;
            state.lastReport = parsed.lastReport || null;
            state.baseStoryEditorOpen = !!parsed.baseStoryEditorOpen;
            state.baseStoryDraft = String(parsed.baseStoryDraft || parsed.session.baseStoryText || '');
            syncTokens();
            state.uiMessage = 'שוחזר סשן קודם.';
            return true;
        } catch (error) {
            return false;
        }
    }

    function clearSavedSession() {
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch (error) {
            // no-op
        }
        state.baseStoryEditorOpen = false;
        state.baseStoryDraft = DEMO_STORY;
        createFreshSession(DEMO_STORY);
    }

    function getBaseStoryEditorValue() {
        const input = document.getElementById('prm-base-input');
        if (input) return String(input.value || '');
        return String(state.baseStoryDraft || (state.session && state.session.baseStoryText) || DEMO_STORY);
    }

    function syncBaseStoryDraftFromInput() {
        state.baseStoryDraft = getBaseStoryEditorValue();
        persistState();
    }

    function toggleBaseStoryEditor(forceOpen) {
        const next = typeof forceOpen === 'boolean' ? forceOpen : !state.baseStoryEditorOpen;
        if (!next) syncBaseStoryDraftFromInput();
        state.baseStoryEditorOpen = next;
        render();
    }

    function setBaseStoryFromTextarea() {
        const value = String(getBaseStoryEditorValue() || '').trim();
        createFreshSession(value || DEMO_STORY);
        state.baseStoryEditorOpen = false;
        state.uiMessage = 'הטקסט החדש הוטמע ועבר לחלון המרכזי.';
        render();
    }

    function loadDemoStory() {
        state.baseStoryDraft = DEMO_STORY;
        createFreshSession(DEMO_STORY);
        state.baseStoryEditorOpen = true;
        render();
    }

    function renderTokenizedContext() {
        const source = String(state.currentContextText || '');
        if (!source) return '<p class="prm-empty">אין טקסט פעיל. הכנס/י בסיס והתחל/י סשן.</p>';
        const tokens = state.tokens;
        const selectableTokenIndices = [];
        tokens.forEach((token, idx) => {
            if (!token.isSpace) selectableTokenIndices.push(idx);
        });
        const tokenIndexToVisual = new Map();
        selectableTokenIndices.forEach((tokenIdx, visualIdx) => tokenIndexToVisual.set(tokenIdx, visualIdx));

        return tokens.map((token, idx) => {
            if (token.isSpace) return escapeHtml(token.text);
            const visualIndex = tokenIndexToVisual.get(idx);
            const inSelection = !!state.selection && token.start < state.selection.end && token.end > state.selection.start;
            const isAnchor = state.selectionAwaitingEnd && state.selectionAnchorTokenIndex === visualIndex;
            const classes = ['prm-token'];
            if (inSelection) classes.push('is-selected');
            if (isAnchor) classes.push('is-anchor');
            return `<button type="button" class="${classes.join(' ')}" data-action="select-token" data-token-index="${visualIndex}">${escapeHtml(token.text)}</button>`;
        }).join('');
    }

    function renderCategoryButtons() {
        return state.categories.map((category) => {
            const disabled = !state.selection || !!state.pendingNodeId;
            const count = state.session ? (core.computeStats(state.session).categoryCounts[category.categoryId] || 0) : 0;
            const title = getCategoryDisplayTitle(category);
            return `
                <button
                    type="button"
                    class="prm-cat-btn"
                    data-action="pick-category"
                    data-category-id="${escapeHtml(category.categoryId)}"
                    ${disabled ? 'disabled' : ''}
                    title="${escapeHtml(category.definition || '')}"
                >
                    <span class="prm-cat-name">${escapeHtml(title)}</span>
                    <span class="prm-cat-meta">${escapeHtml((category.family || '').toUpperCase())} ֲ· ${count}</span>
                </button>
            `;
        }).join('');
    }

    function renderClassicBreenReferenceBoard() {
        const rows = [
            {
                id: 'row1',
                title: 'שלשה 1 | מקור, הנחה וכוונה',
                insight: 'מי קובע אמת, מה מניחים מראש, ואיזו כוונה מיוחסת לאחר.',
                cells: ['חסרון הדובר', 'הנחות מוקדמות', 'קריאת מחשבות']
            },
            {
                id: 'row2',
                title: 'שלשה 2 | חוקי משחק וגבולות',
                insight: 'חייב/יכול/תמיד ותיחום גבולות, כולל שרשראות סיבה-תוצאה.',
                cells: ['הכללה', 'מודל פעולה', 'סיבה ותוצאה']
            },
            {
                id: 'row3',
                title: 'שלשה 3 | משמעות, זהות והסקה',
                insight: 'איך שפה מופשטת וזהויות הופכות למסקנות כוללניות.',
                cells: ['נומינליזציה', 'פרדיקטים של זהות', 'הקבלה מורכבת']
            },
            {
                id: 'row4',
                title: 'שלשה 4 | הקשר, זמן וייחוס',
                insight: 'מול מי, ביחס למה, ובאיזה זמן/מקום הטענה באמת נאמרת.',
                cells: ['השמטה השוואתית', 'פרדיקטים של זמן ומקום', 'אובדן המצביע']
            },
            {
                id: 'row5',
                title: 'שלשה 5 | קרקע חושית ופעולה',
                insight: 'מעבירים לשפה מדידה: מי/מה, חושית, ומה הפעולה בפועל.',
                cells: ['שם עצם לא מפורט', 'פרדיקטים חושיים', 'פועל לא מפורט']
            }
        ];

        return `
            <div class="prm-breen-5x3-wrap" aria-label="טבלת ברין קלאסית 5x3">
                <div class="prm-breen-5x3-title">טבלת ברין הקלאסית (5ֳ—3) ג€” מפת עוגן</div>
                <p class="prm-breen-5x3-note">זוהי מפת הייחוס הקבועה של קטגוריות המטה-מודל לתרגול ולניווט.</p>
                <div class="prm-breen-5x3-grid">
                    ${rows.map((row) => `
                        <div class="prm-breen-5x3-row ${escapeHtml(row.id)}">
                            <div class="prm-breen-5x3-row-head"><strong>${escapeHtml(row.title)}</strong><small>${escapeHtml(row.insight || '')}</small></div>
                            <div class="prm-breen-5x3-row-cells">
                                ${row.cells.map((label) => `
                                    <div class="prm-breen-5x3-cell">
                                        <span>${escapeHtml(label)}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    function renderBreenCategoryBoard() {
        return renderClassicBreenReferenceBoard();
    }

    function getCategoryPhilosophy(category) {
        const lib = root.prismResearchPhilosophyLibrary || {};
        const id = String(category && category.categoryId || '').trim();
        const entry = lib[id];
        if (entry) return entry;
        const fallbackQuestion = Array.isArray(category && category.primaryQuestions) && category.primaryQuestions.length
            ? String(category.primaryQuestions[0])
            : 'מה בדיוק קורה כאן?';
        return {
            ask3x: fallbackQuestion,
            school: 'דיוק לשוני וחקירה פנומנולוגית',
            why: 'הקטגוריה הזו עוזרת להפוך ניסוח עמום למבנה שניתן לבדוק שלב-שלב.',
            creates: 'יותר פירוט, תנאים, ראיות או מנגנון - ופחות מסקנות אוטומטיות.',
            therapistCalm: 'לא חייבים לדעת מראש את התשובה; מספיק להחזיק שאלה יציבה.',
            patientGain: 'יותר בהירות ויותר אפשרויות פעולה.',
            trap: 'לקפוץ מהר מדי לפתרון.',
            fix: 'להישאר עוד חפירה אחת על אותה עדשה.',
            tooltip: 'פריזמה אחת, שלוש חפירות, יותר שטח פנימי.'
        };
    }

    function renderPhilosophyFact(label, value, modifier) {
        if (!value) return '';
        const className = modifier ? ` prm-philosophy-fact--${modifier}` : '';
        return `
            <article class="prm-philosophy-fact${className}">
                <span class="prm-philosophy-fact-label">${escapeHtml(label)}</span>
                <strong class="prm-philosophy-fact-value">${escapeHtml(value)}</strong>
            </article>
        `;
    }

    function renderPhilosophyLibrary() {
        if (!Array.isArray(state.categories) || !state.categories.length) return '';

        const items = state.categories.map((category) => {
            const ph = getCategoryPhilosophy(category);
            const appQuestion = Array.isArray(category.primaryQuestions) && category.primaryQuestions.length
                ? category.primaryQuestions[0]
                : ph.ask3x;
            const facts = [
                renderPhilosophyFact('השאלה החוזרת x3', ph.ask3x, 'question'),
                renderPhilosophyFact('שאלת הבסיס מהאפליקציה', appQuestion, 'question'),
                renderPhilosophyFact('הבסיס הפילוסופי', ph.why),
                renderPhilosophyFact('מה זה מייצר בפועל', ph.creates),
                renderPhilosophyFact('השקט של המטפל', ph.therapistCalm, 'benefit'),
                renderPhilosophyFact('הרווח למטופל', ph.patientGain, 'benefit')
            ].join('');
            return `
                <details class="prm-philosophy-item">
                    <summary class="prm-philosophy-item-summary">
                        <span class="prm-philosophy-item-title">${escapeHtml(category.labelHe || category.categoryId)}</span>
                        <small class="prm-philosophy-item-school">${escapeHtml(ph.school || '')}</small>
                    </summary>
                    <div class="prm-philosophy-item-body">
                        <div class="prm-philosophy-guidance" aria-label="הכוונה מעשית">
                            <article class="prm-philosophy-guidance-card prm-philosophy-guidance-card--avoid">
                                <span class="prm-philosophy-guidance-kicker">מה לא לעשות</span>
                                <strong>${escapeHtml(ph.trap || '')}</strong>
                                <small>הטעות שקל ליפול אליה כשנשארים ברמת הכותרת.</small>
                            </article>
                            <div class="prm-philosophy-guidance-arrow" aria-hidden="true"></div>
                            <article class="prm-philosophy-guidance-card prm-philosophy-guidance-card--do">
                                <span class="prm-philosophy-guidance-kicker">מה כן לעשות</span>
                                <strong>${escapeHtml(ph.fix || '')}</strong>
                                <small>המהלך הקטן שמחזיר את הפריזמה למסלול מדויק ושימושי.</small>
                            </article>
                        </div>
                        <div class="prm-philosophy-facts">
                            ${facts}
                        </div>
                        <p class="prm-philosophy-tooltip"><strong>רעיון קצר:</strong> ${escapeHtml(ph.tooltip || '')}</p>
                    </div>
                </details>
            `;
        }).join('');

        return `
            <section class="prm-card prm-philosophy-panel">
                <details class="prm-philosophy-library">
                    <summary class="prm-philosophy-library-summary">
                        <span>פילוסופיה מאחורי 15 הפריזמות (מורחב)</span>
                        <small>פותחים כל פריזמה: קודם מה לא, מה כן, ואז למה זה עובד.</small>
                    </summary>
                    <div class="prm-philosophy-library-body">
                        <p class="prm-philosophy-intro">
                            <strong>Prism Research = Chain / חקירה אורכית:</strong> בוחרים עדשה אחת וממשיכים קדימה על המשפט החדש שנולד.
                            <strong>Prism Lab = Vertical Stack:</strong> מודול משלים לעומק על עוגן אחד דרך E/B/C/V/I/S.
                        </p>
                        <div class="prm-philosophy-list">
                            ${items}
                        </div>
                    </div>
                </details>
            </section>
        `;
    }

    function renderTheoryBridgeCard() {
        return `
            <section class="prm-card prm-theory-bridge">
                <h3>תיאוריה ופילוסופיה של הפריזמות</h3>
                <p>
                    ההסבר המעמיק על כל פריזמה (שאלות / מטרה / פילוסופיה / מלכודות) עבר לדף נפרד כדי לשמור כאן על מסך תרגול נקי.
                </p>
                <p class="prm-kicker">
                    פתח/י את דף קטגוריות ברין מהאפליקציה הראשית כדי ללמוד שכבות תאוריה בלי להעמיס על החקירה עצמה.
                </p>
                <div class="prm-inline-actions">
                    <a class="prm-small-btn prm-link-btn" href="index.html?tab=categories" target="_blank" rel="noopener">פתח/י קטגוריות ברין (תאוריה)</a>
                </div>
            </section>
        `;
    }

    function cleanupDuplicateReferenceBoards() {
        const shell = appEl.querySelector('.prm-shell');
        if (!shell) return;

        const referenceBoards = Array.from(shell.querySelectorAll('.prm-breen-5x3-wrap'));
        referenceBoards.slice(1).forEach((node) => node.remove());

        const legacyBoardPhrases = [
            'inside their map',
            'outside their map',
            'מפת העולם שלהם',
            'המציאות מחוץ להם'
        ];
        const legacyCategoryPhrases = [
            'lost performative',
            'universal quantifier',
            'nominalisation',
            'comparative deletion',
            'referential index',
            'presuppositions',
            'unspecified verb'
        ];

        const candidates = Array.from(shell.querySelectorAll('.prm-card, section, div'));
        candidates.forEach((node) => {
            if (!(node instanceof HTMLElement)) return;
            if (node.querySelector('.prm-breen-5x3-wrap')) return;

            const text = String(node.textContent || '').toLowerCase().replace(/\s+/g, ' ').trim();
            if (!text) return;

            const hasLegacyMapHeader = legacyBoardPhrases.some((phrase) => text.includes(phrase));
            const legacyCategoryHits = legacyCategoryPhrases.filter((phrase) => text.includes(phrase)).length;
            if (hasLegacyMapHeader && legacyCategoryHits >= 3) {
                node.remove();
            }
        });
    }

    function renderRecursiveGuidePanel() {
        return `
            <section class="prm-card prm-recursive-guide" aria-label="הסבר רקורסיבי ו-Next Step Function">
                <div class="prm-recursive-guide-head">
                    <h2>מה זה "רקורסיבי" ולמה זה חשוב כאן?</h2>
                    <p class="prm-kicker">ב-Prism Research לא "רצים" לעוד תיאוריה. שואלים, מקבלים תשובה חדשה, ואז בודקים אותה שוב עם אותה עדשה.</p>
                </div>

                <div class="prm-recursive-flow" aria-hidden="true">
                    <span>משפט/קטע</span>
                    <span class="prm-recursive-flow-arrow">ג†</span>
                    <span>שאלה מדויקת</span>
                    <span class="prm-recursive-flow-arrow">ג†</span>
                    <span>תשובה חדשה</span>
                    <span class="prm-recursive-flow-arrow">ג†</span>
                    <span>בחירת צעד הבא</span>
                </div>

                <div class="prm-recursive-grid">
                    <article class="prm-recursive-step">
                        <div class="prm-recursive-step-index">1</div>
                        <h3>תמונה כללית + מוקד נוכחי</h3>
                        <p>מחזיקים תמונה כללית של הסיפור, אבל בכל רגע עובדים רק על קטע מסוים שנבחר. זה מונע הצפה וממקד את החקירה.</p>
                    </article>
                    <article class="prm-recursive-step">
                        <div class="prm-recursive-step-index">2</div>
                        <h3>Next Step Function (הצעד הבא)</h3>
                        <p>בספרים הראשונים של NLP דיברו על <strong>Next Step Function</strong>: לא חייבים לדעת את כל המסלול מראש, אלא לבחור את הצעד הבא הכי טוב לפי מה שנמצא עכשיו.</p>
                    </article>
                    <article class="prm-recursive-step">
                        <div class="prm-recursive-step-index">3</div>
                        <h3>פידבק (קיברנטיקה) במקום ניחוש</h3>
                        <p>מתחום הקיברנטיקה: כל פעולה מייצרת היזון חוזר. לכן לא מגיבים רק למה שחשבנו שיהיה, אלא למה שבאמת חזר מהשאלה - ומשם בוחרים את הצעד הבא.</p>
                    </article>
                </div>

                <div class="prm-recursive-note">
                    <strong>למה זה רלוונטי לעבודה טיפולית?</strong>
                    <p>כי זה משלב גם כיוון (לאן אנחנו חוקרים) וגם גמישות (מה עושים עכשיו בפועל לפי התגובה שקיבלנו), במקום להיצמד לפרשנות מוקדמת.</p>
                </div>
            </section>
        `;
    }

    function renderPendingQa() {
        if (!state.pendingQA) {
            return `
                <div class="prm-card prm-qa-panel is-empty">
                    <h3>מהלך חקירה הבא</h3>
                    <p>בחרו קטגוריה אחרי סימון כדי לקבל שאלה מדויקת ותשובת המשך.</p>
                </div>
            `;
        }
        const variants = Array.isArray(state.pendingQA.questionVariants) ? state.pendingQA.questionVariants : [];
        const selectedVariantIndex = Number.isInteger(state.pendingQA.selectedQuestionIndex)
            ? state.pendingQA.selectedQuestionIndex
            : variants.findIndex((item) => String(item || '').trim() === String(state.pendingQA.questionText || '').trim());
        const variantsHtml = variants.length > 1 ? `
            <div class="prm-question-variants">
                <div class="prm-question-variants-head">
                    <strong>ניסוחים חלופיים לאותה שאלה (אותה כוונה טיפולית)</strong>
                    <small>אפשר לבחור ניסוח שמרגיש לך טבעי יותר מול המטופל/ת.</small>
                </div>
                <div class="prm-question-variants-list">
                    ${variants.map((variant, index) => `
                        <button
                            type="button"
                            class="prm-question-variant-btn ${index === selectedVariantIndex ? 'is-active' : ''}"
                            data-action="pick-question-variant"
                            data-variant-index="${index}"
                            aria-pressed="${index === selectedVariantIndex ? 'true' : 'false'}"
                        >
                            <span class="prm-question-variant-index">${index + 1}</span>
                            <span>${escapeHtml(variant)}</span>
                        </button>
                    `).join('')}
                </div>
            </div>
        ` : '';
        return `
            <div class="prm-card prm-qa-panel">
                <h3>מהלך חקירה הבא</h3>
                <p class="prm-kicker">פריזמה שנבחרה: ${escapeHtml(state.pendingQA.categoryLabelHe)}</p>
                <div class="prm-qa-block">
                    <div><strong>השאלה שנבחרה כרגע:</strong> ${escapeHtml(state.pendingQA.questionText)}</div>
                    <div><strong>תשובת המשך:</strong> ${escapeHtml(state.pendingQA.answerText)}</div>
                    <div><strong>משפט חדש שנולד:</strong> ${escapeHtml(state.pendingQA.generatedSentence)}</div>
                </div>
                ${variantsHtml}
                <div class="prm-nav-actions">
                    <button type="button" class="prm-big-btn secondary" data-action="back-base">חזרה לטקסט המרכזי</button>
                    <button type="button" class="prm-big-btn primary" data-action="continue-answer">המשך מתוך תשובת ההמשך</button>
                </div>
            </div>
        `;
    }

    function renderPathLog() {
        const nodes = state.session && Array.isArray(state.session.nodes) ? state.session.nodes : [];
        if (!nodes.length) {
            return '<p class="prm-empty">עוד לא התחילה שרשרת חקירה. סמנו קטע בטקסט ובחרו פריזמה ראשונה.</p>';
        }
        const items = nodes.slice().reverse().slice(0, 14).map((node, idx) => `
            <li class="prm-log-item">
                <div class="prm-log-head">
                    <span>#${nodes.length - idx}</span>
                    <span>${escapeHtml(node.categoryLabelHe)}</span>
                    <span class="prm-tagline">${escapeHtml((node.tags || []).join(', '))}</span>
                </div>
                <div class="prm-log-line"><strong>קטע שנבדק:</strong> ${escapeHtml(node.selection && node.selection.text)}</div>
                <div class="prm-log-line"><strong>תשובת המשך:</strong> ${escapeHtml(node.answerText)}</div>
            </li>
        `).join('');
        return `<ol class="prm-log-list">${items}</ol>`;
    }

    function renderReportPanel() {
        if (!state.lastReport) {
            return `
                <div class="prm-card prm-report-panel is-empty">
                    <h3>סיכום תובנות מהחקירה</h3>
                    <p>הסיכום יופיע כאן אחרי לפחות ${core.MIN_REPORT_NODES} צעדי חקירה.</p>
                </div>
            `;
        }
        const r = state.lastReport;
        const renderList = (items) => {
            if (!Array.isArray(items) || !items.length) return '<li>עדיין אין מספיק תוכן</li>';
            return items.map(item => `<li>${escapeHtml(item)}</li>`).join('');
        };

        return `
            <div class="prm-card prm-report-panel">
                <h3>סיכום תובנות מהחקירה</h3>
                <div class="prm-report-actions">
                    <button type="button" class="prm-small-btn" data-action="copy-report-json">העתק JSON</button>
                    <button type="button" class="prm-small-btn" data-action="copy-report-md">העתק סיכום</button>
                </div>
                <div class="prm-report-grid">
                    <section><h4>שרשראות סיבה</h4><ul>${renderList(r.sections.causalChains)}</ul></section>
                    <section><h4>שרשראות משמעות</h4><ul>${renderList(r.sections.meaningChains)}</ul></section>
                    <section><h4>ראיות / קריטריונים</h4><ul>${renderList(r.sections.evidenceCriteria)}</ul></section>
                    <section><h4>תנאים / היקף</h4><ul>${renderList(r.sections.conditionsScope)}</ul></section>
                    <section><h4>אילוצים מודליים</h4><ul>${renderList(r.sections.modalConstraints)}</ul></section>
                    <section><h4>הכללות</h4><ul>${renderList(r.sections.generalizations)}</ul></section>
                </div>
                <section>
                    <h4>תובנות</h4>
                    <ul>${renderList(r.insights)}</ul>
                </section>
                <section>
                    <h4>צעד המשך</h4>
                    <p>${escapeHtml(r.nextStep)}</p>
                </section>
            </div>
        `;
    }

    function renderStatsChips() {
        const stats = state.session ? core.computeStats(state.session) : { totalNodes: 0, maxDepth: 0, branchCount: 0, avgDepth: 0 };
        const reportEnabled = stats.totalNodes >= core.MIN_REPORT_NODES;
        return `
            <div class="prm-stats">
                <span class="prm-chip">צמתים: <strong>${stats.totalNodes}</strong></span>
                <span class="prm-chip">עומק: <strong>${stats.maxDepth}</strong></span>
                <span class="prm-chip">ענפים: <strong>${stats.branchCount}</strong></span>
                <span class="prm-chip">ממוצע עומק: <strong>${stats.avgDepth.toFixed(1)}</strong></span>
                <button type="button" class="prm-small-btn ${reportEnabled ? '' : 'is-disabled'}" data-action="generate-report" ${reportEnabled ? '' : 'disabled'}>
                    הפק סיכום חקירה
                </button>
            </div>
        `;
    }

    function renderBaseStoryPanel(reportEnabled) {
        const draftText = String(state.baseStoryDraft || (state.session && state.session.baseStoryText) || DEMO_STORY);
        const activeBase = String((state.session && state.session.baseStoryText) || '');
        const hasDraftChanges = draftText.trim() && draftText.trim() !== activeBase.trim();
        const draftPreview = draftText.trim() || 'אין טקסט טיוטה עדיין.';

        return `
            <section class="prm-card prm-base-config ${state.baseStoryEditorOpen ? 'is-open' : 'is-collapsed'}">
                <div class="prm-base-head">
                    <div>
                        <h2>סיפור בסיס (לטיוטה / מימוש)</h2>
                        <p class="prm-kicker">
                            בנו או ערכו טקסט בסיסי, ואז לחצו "מימוש לטקסט המרכזי". דף התרגול נשאר קומפקטי כשהעורך סגור.
                        </p>
                    </div>
                    <div class="prm-hero-actions">
                        <button type="button" class="prm-small-btn" data-action="toggle-base-editor">
                            ${state.baseStoryEditorOpen ? 'סגור עורך סיפור' : 'פתח עורך סיפור'}
                        </button>
                        <button type="button" class="prm-small-btn" data-action="apply-base">מימוש לטקסט המרכזי</button>
                        <button type="button" class="prm-small-btn" data-action="back-base">חזרה לבסיס</button>
                    </div>
                </div>

                <div class="prm-base-preview ${hasDraftChanges ? 'has-draft-changes' : ''}">
                    <strong>טיוטה נוכחית:</strong>
                    <span>${escapeHtml(draftPreview.length > 240 ? `${draftPreview.slice(0, 237)}...` : draftPreview)}</span>
                    ${hasDraftChanges ? '<small class="prm-badge-draft">יש שינויים שטרם מומשו</small>' : ''}
                </div>

                ${state.baseStoryEditorOpen ? `
                    <label for="prm-base-input" class="prm-base-editor-label"><strong>עורך סיפור בסיס</strong></label>
                    <textarea id="prm-base-input" rows="4" spellcheck="false">${escapeHtml(draftText)}</textarea>
                    <div class="prm-inline-actions">
                        <button type="button" class="prm-small-btn" data-action="load-demo">טען דוגמה</button>
                        <button type="button" class="prm-small-btn" data-action="reset-session">סשן חדש מהטיוטה</button>
                        <button type="button" class="prm-small-btn" data-action="toggle-base-editor">סגור עורך</button>
                    </div>
                ` : ''}

                ${renderStatsChips()}
                <p class="prm-message" aria-live="polite">${escapeHtml(state.uiMessage || '')}</p>
            </section>
        `;
    }

    function render() {
        if (!state.loaded) {
            const msg = state.loadError ? escapeHtml(state.loadError) : 'טוען Prism Research Mode...';
            appEl.innerHTML = `<div class="prm-loading">${msg}</div>`;
            return;
        }

        const selectedText = getSelectedText();
        const reportEnabled = state.session && state.session.nodes.length >= core.MIN_REPORT_NODES;

        appEl.innerHTML = `
            <div class="prm-shell" dir="rtl">
                <header class="prm-hero">
                    <div>
                        <p class="prm-eyebrow">Prism Research Mode</p>
                        <h1>מודל הפריזמה: חקירת טקסט דרך קטגוריות לשוניות-לוגיות</h1>
                        <p class="prm-subtitle">לולאה קבועה: סימון ג†’ קטגוריה ג†’ שאלה ג†’ תשובה ג†’ חזור לבסיס / המשך מהתשובה.</p>
                        <div class="prm-hero-help-row">
                            <button
                                type="button"
                                class="prm-small-btn prm-small-btn-help"
                                data-action="toggle-recursive-guide"
                                aria-expanded="${state.showRecursiveGuide ? 'true' : 'false'}"
                            >
                                ${state.showRecursiveGuide ? 'סגור הסבר "רקורסיבי"' : 'מה זה "רקורסיבי"?'}
                            </button>
                            <small>הסבר קצר על Next Step Function + היזון חוזר (קיברנטיקה)</small>
                        </div>
                    </div>
                    <div class="prm-hero-actions">
                        <button type="button" class="prm-small-btn" data-action="load-demo">טען דוגמה</button>
                        <button type="button" class="prm-small-btn" data-action="reset-session">סשן חדש</button>
                        <button type="button" class="prm-small-btn" data-action="clear-session">נקה שמירה</button>
                    </div>
                </header>
                ${state.showRecursiveGuide ? renderRecursiveGuidePanel() : ''}
                ${renderBaseStoryPanel(reportEnabled)}

                <section class="prm-layout">
                    <div class="prm-column">
                        <section class="prm-card">
                             <h2>טקסט בסיס / טקסט פעיל</h2>
                            <p class="prm-kicker">הקשר נוכחי: ${state.currentContextType === 'continued' ? 'המשך מתשובת ההמשך' : 'טקסט בסיס'}</p>
                            <div class="prm-context-text">${renderTokenizedContext()}</div>
                            <div class="prm-selection-box ${state.selection ? 'has-selection' : ''}">
                                <strong>קטע מסומן:</strong>
                                <span>${escapeHtml(selectedText || 'עדיין לא סומן קטע')}</span>
                                ${state.selection ? `<small> [${state.selection.start}-${state.selection.end}]</small>` : ''}
                            </div>
                        </section>

                        
                        <section class="prm-card">
                            <h2>טבלת ברין - 15 קטגוריות (סדר עבודה)</h2>
                            ${renderBreenCategoryBoard()}
                        </section>

                        ${renderPendingQa()}
                    </div>

                    <div class="prm-column">
                        <section class="prm-card">
                            <h2>יומן מסלול החקירה</h2>
                            ${renderPathLog()}
                        </section>
                        ${renderReportPanel()}
                    </div>
                </section>
            </div>
        `;

        cleanupDuplicateReferenceBoards();
    }

    function onAppClick(event) {
        const button = event.target.closest('[data-action]');
        if (!button) return;
        const action = button.dataset.action;
        if (!action) return;

        if (action === 'select-token') {
            const tokenIndex = Number(button.dataset.tokenIndex);
            if (Number.isFinite(tokenIndex)) selectTokenByVisualIndex(tokenIndex);
            return;
        }

        if (action === 'pick-category') {
            runPrismStep(button.dataset.categoryId);
            return;
        }

        if (action === 'toggle-recursive-guide') {
            state.showRecursiveGuide = !state.showRecursiveGuide;
            render();
            return;
        }

        if (action === 'back-base') return backToBase();
        if (action === 'continue-answer') return continueFromAnswer();
        if (action === 'generate-report') return generateReport();
        if (action === 'copy-report-json') return copyReportJson();
        if (action === 'copy-report-md') return copyReportMarkdown();
        if (action === 'load-demo') return loadDemoStory();
        if (action === 'toggle-base-editor') return toggleBaseStoryEditor();
        if (action === 'apply-base') return setBaseStoryFromTextarea();
        if (action === 'pick-question-variant') return pickPendingQuestionVariant(Number(button.dataset.variantIndex));
        if (action === 'reset-session') return createFreshSession(getBaseStoryEditorValue() || ((state.session && state.session.baseStoryText) || DEMO_STORY));
        if (action === 'clear-session') return clearSavedSession();
    }

    function onAppInput(event) {
        const target = event.target;
        if (!target) return;
        if (target.id === 'prm-base-input') {
            syncBaseStoryDraftFromInput();
        }
    }

    async function boot() {
        appEl.addEventListener('click', onAppClick);
        appEl.addEventListener('input', onAppInput);
        render();
        try {
            const data = await fetchJson('data/metaModelPatterns.he.json');
            const categories = (Array.isArray(data && data.patterns) ? data.patterns : [])
                .map((pattern, idx) => core.normalizeCategoryFromPattern(pattern, idx))
                .filter(Boolean)
                .slice(0, 15)
                .sort((a, b) => {
                    const ai = PRISM_BREEN_ORDER_INDEX[a.categoryId];
                    const bi = PRISM_BREEN_ORDER_INDEX[b.categoryId];
                    const aRank = Number.isInteger(ai) ? ai : 999;
                    const bRank = Number.isInteger(bi) ? bi : 999;
                    if (aRank !== bRank) return aRank - bRank;
                    return String(a.labelHe || a.categoryId).localeCompare(String(b.labelHe || b.categoryId), 'he');
                });
            state.categories = categories;
            state.categoriesById = categories.reduce((acc, category) => {
                acc[category.categoryId] = category;
                return acc;
            }, {});
            state.loaded = true;

            if (!restoreState()) {
                createFreshSession(DEMO_STORY);
            } else {
                if (!state.baseStoryDraft) {
                    state.baseStoryDraft = String((state.session && state.session.baseStoryText) || DEMO_STORY);
                }
                syncTokens();
            }
            render();
        } catch (error) {
            state.loaded = false;
            state.loadError = `טעינת נתונים נכשלה: ${error && error.message ? error.message : String(error)}`;
            render();
        }
    }

    boot();
})();

