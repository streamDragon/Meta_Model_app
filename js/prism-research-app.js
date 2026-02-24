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
        baseStoryDraft: ''
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
        const questionText = core.generateQuestion({
            category,
            selectionText,
            contextText: state.currentContextText,
            stepIndex
        });
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
            const hint = getCategoryDisplayHint(category);
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
                    <span class="prm-cat-line">${escapeHtml(hint)}</span>
                    <span class="prm-cat-meta">${escapeHtml((category.family || '').toUpperCase())} · ${count}</span>
                </button>
            `;
        }).join('');
    }

    function getOrderedCategoriesByIds(ids) {
        return (Array.isArray(ids) ? ids : [])
            .map((id) => getCategory(id))
            .filter(Boolean);
    }

    function renderBreenCategoryBoard() {
        const stats = state.session ? core.computeStats(state.session) : { categoryCounts: {} };
        const outside = getOrderedCategoriesByIds(PRISM_BREEN_OUTSIDE_ORDER);
        const inside = getOrderedCategoriesByIds(PRISM_BREEN_INSIDE_ORDER);
        const maxRows = Math.max(outside.length, inside.length);
        const rows = [];

        for (let i = 0; i < maxRows; i += 1) {
            rows.push({
                outside: outside[i] || null,
                inside: inside[i] || null
            });
        }

        const renderCell = (category, sideKey) => {
            if (!category) return '<div class="prm-breen-cell is-empty" aria-hidden="true"></div>';
            const disabled = !state.selection || !!state.pendingNodeId;
            const count = stats.categoryCounts[category.categoryId] || 0;
            const title = getCategoryDisplayTitle(category);
            const hint = getCategoryDisplayHint(category);
            const extraMindReading = category.categoryId === 'mind_reading'
                ? `<div class="prm-breen-note">${escapeHtml(getMindReadingExtraNote())}</div>`
                : '';
            return `
                <button
                    type="button"
                    class="prm-breen-cell ${sideKey}"
                    data-action="pick-category"
                    data-category-id="${escapeHtml(category.categoryId)}"
                    ${disabled ? 'disabled' : ''}
                    title="${escapeHtml(category.definition || '')}"
                >
                    <span class="prm-cat-name">${escapeHtml(title)}</span>
                    <span class="prm-cat-line">${escapeHtml(hint)}</span>
                    <span class="prm-cat-meta">${escapeHtml((category.family || '').toUpperCase())} · ${count}</span>
                    ${extraMindReading}
                </button>
            `;
        };

        return `
            <div class="prm-breen-board-wrap">
                <div class="prm-breen-board-head">
                    <div class="prm-breen-head-col outside">
                        <strong>OUTSIDE THEIR MAP</strong>
                        <small>מחוץ למפה שלהם</small>
                    </div>
                    <div class="prm-breen-head-col inside">
                        <strong>INSIDE THEIR MAP</strong>
                        <small>בתוך המפה שלהם</small>
                    </div>
                </div>
                <div class="prm-breen-board">
                    ${rows.map((row) => `
                        <div class="prm-breen-row">
                            ${renderCell(row.outside, 'outside')}
                            ${renderCell(row.inside, 'inside')}
                        </div>
                    `).join('')}
                </div>
                <p class="prm-breen-footnote">Mind Reading בצד ימין (Inside) וכולל גם קריאת מחשבות עצמית + קפיצה למסקנות.</p>
            </div>
        `;
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

    function renderPhilosophyLibrary() {
        if (!Array.isArray(state.categories) || !state.categories.length) return '';

        const items = state.categories.map((category) => {
            const ph = getCategoryPhilosophy(category);
            const appQuestion = Array.isArray(category.primaryQuestions) && category.primaryQuestions.length
                ? category.primaryQuestions[0]
                : ph.ask3x;
            return `
                <details class="prm-philosophy-item">
                    <summary class="prm-philosophy-item-summary">
                        <span class="prm-philosophy-item-title">${escapeHtml(category.labelHe || category.categoryId)}</span>
                        <small class="prm-philosophy-item-school">${escapeHtml(ph.school || '')}</small>
                    </summary>
                    <div class="prm-philosophy-item-body">
                        <p class="prm-philosophy-q"><strong>השאלה החוזרת (3×):</strong> ${escapeHtml(ph.ask3x || '')}</p>
                        <p><strong>שאלת בסיס מהאפליקציה:</strong> ${escapeHtml(appQuestion || '')}</p>
                        <p><strong>הבסיס הפילוסופי:</strong> ${escapeHtml(ph.why || '')}</p>
                        <p><strong>מה זה מייצר בפועל:</strong> ${escapeHtml(ph.creates || '')}</p>
                        <p><strong>השקט של המטפל:</strong> ${escapeHtml(ph.therapistCalm || '')}</p>
                        <p><strong>הרווח למטופל:</strong> ${escapeHtml(ph.patientGain || '')}</p>
                        <p><strong>מלכודת נפוצה:</strong> ${escapeHtml(ph.trap || '')}</p>
                        <p><strong>תיקון/כוונון:</strong> ${escapeHtml(ph.fix || '')}</p>
                        <p class="prm-philosophy-tooltip"><strong>Tooltip:</strong> ${escapeHtml(ph.tooltip || '')}</p>
                    </div>
                </details>
            `;
        }).join('');

        return `
            <section class="prm-card prm-philosophy-panel">
                <details class="prm-philosophy-library">
                    <summary class="prm-philosophy-library-summary">
                        <span>פילוסופיה מאחורי 15 הפריזמות (מורחב)</span>
                        <small>למה מותר לשאול את אותה שאלה שוב ושוב · 3×</small>
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

    function renderPendingQa() {
        if (!state.pendingQA) {
            return `
                <div class="prm-card prm-qa-panel is-empty">
                    <h3>מהלך חקירה הבא</h3>
                    <p>בחרו קטגוריה אחרי סימון כדי לקבל שאלה מדויקת ותשובת המשך.</p>
                </div>
            `;
        }
        return `
            <div class="prm-card prm-qa-panel">
                <h3>מהלך חקירה הבא</h3>
                <p class="prm-kicker">פריזמה שנבחרה: ${escapeHtml(state.pendingQA.categoryLabelHe)}</p>
                <div class="prm-qa-block">
                    <div><strong>שאלה:</strong> ${escapeHtml(state.pendingQA.questionText)}</div>
                    <div><strong>תשובת המשך:</strong> ${escapeHtml(state.pendingQA.answerText)}</div>
                    <div><strong>משפט חדש שנולד:</strong> ${escapeHtml(state.pendingQA.generatedSentence)}</div>
                </div>
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
                        <p class="prm-subtitle">לולאה קבועה: סימון → קטגוריה → שאלה → תשובה → חזור לבסיס / המשך מהתשובה.</p>
                    </div>
                    <div class="prm-hero-actions">
                        <button type="button" class="prm-small-btn" data-action="load-demo">טען דוגמה</button>
                        <button type="button" class="prm-small-btn" data-action="reset-session">סשן חדש</button>
                        <button type="button" class="prm-small-btn" data-action="clear-session">נקה שמירה</button>
                    </div>
                </header>
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
                            <p class="prm-kicker">ממוין לפי Outside / Inside map. Mind Reading מופיע בצד ימין כחלק מהגעה למסקנות.</p>
                            ${renderBreenCategoryBoard()}
                        </section>

                        ${renderTheoryBridgeCard()}

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

        if (action === 'back-base') return backToBase();
        if (action === 'continue-answer') return continueFromAnswer();
        if (action === 'generate-report') return generateReport();
        if (action === 'copy-report-json') return copyReportJson();
        if (action === 'copy-report-md') return copyReportMarkdown();
        if (action === 'load-demo') return loadDemoStory();
        if (action === 'toggle-base-editor') return toggleBaseStoryEditor();
        if (action === 'apply-base') return setBaseStoryFromTextarea();
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
