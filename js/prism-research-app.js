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
        '׳׳—׳¨ ׳™׳© ׳׳™ ׳©׳™׳—׳” ׳¢׳ ׳”׳׳ ׳”׳ ׳•׳׳ ׳™ ׳›׳‘׳¨ ׳׳¨׳’׳™׳©/׳” ׳©׳–׳” ׳”׳•׳׳ ׳׳”׳™׳’׳׳¨ ׳¨׳¢.',
        '׳”׳•׳ ׳‘׳˜׳— ׳—׳•׳©׳‘ ׳©׳׳ ׳™ ׳׳ ׳׳§׳¦׳•׳¢׳™/׳× ׳›׳™ ׳‘׳©׳‘׳•׳¢ ׳©׳¢׳‘׳¨ ׳ ׳×׳§׳¢׳×׳™ ׳‘׳×׳©׳•׳‘׳” ׳׳—׳×.',
        '׳׳ ׳™ ׳—׳™׳™׳‘/׳× ׳׳”׳™׳•׳× ׳׳•׳©׳׳/׳× ׳©׳, ׳׳—׳¨׳× ׳–׳” ׳׳•׳׳¨ ׳©׳׳ ׳™ ׳›׳™׳©׳׳•׳.',
        '׳›׳ ׳₪׳¢׳ ׳©׳™׳© ׳©׳™׳—׳” ׳›׳–׳׳× ׳׳ ׳™ ׳ ׳¡׳’׳¨/׳× ׳•׳׳ ׳׳¦׳׳™׳—/׳” ׳׳”׳¡׳‘׳™׳¨ ׳׳× ׳¢׳¦׳׳™.'
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
            titleHe: '׳׳—׳™׳§׳” ׳©׳™׳₪׳•׳˜׳™׳× (Lost Performative)',
            shortLine: '׳׳™ ׳§׳‘׳¢? ׳¢׳ ׳¡׳׳ ׳׳”?'
        }),
        universal_quantifiers: Object.freeze({
            side: 'outside',
            titleHe: '׳›׳׳×׳™׳ ׳›׳•׳׳׳ ׳™׳™׳ (Universal Quantifier)',
            shortLine: '׳×׳׳™׳“/׳׳£ ׳₪׳¢׳? ׳”׳™׳§׳£ ׳•׳—׳¨׳™׳’׳™׳'
        }),
        nominalization: Object.freeze({
            side: 'outside',
            titleHe: '׳ ׳•׳׳™׳ ׳׳™׳–׳¦׳™׳” (Nominalisation)',
            shortLine: '׳׳”׳—׳–׳™׳¨ ׳×׳”׳׳™׳ ׳‘׳׳§׳•׳ ׳©׳ ׳¢׳¦׳ ׳§׳₪׳•׳'
        }),
        comparative_deletion: Object.freeze({
            side: 'outside',
            titleHe: '׳”׳©׳•׳•׳׳” ׳—׳¡׳¨׳” (Comparative Deletion)',
            shortLine: '׳‘׳™׳—׳¡ ׳׳׳”? ׳׳₪׳™ ׳׳™׳–׳” ׳§׳¨׳™׳˜׳¨׳™׳•׳?'
        }),
        unspecified_noun: Object.freeze({
            side: 'outside',
            titleHe: '׳©׳ ׳¢׳¦׳ ׳׳-׳׳₪׳ ׳” / ׳׳ ׳׳₪׳•׳¨׳˜',
            shortLine: '׳׳™/׳׳” ׳‘׳“׳™׳•׳§ ׳–׳”?'
        }),
        simple_deletion: Object.freeze({
            side: 'outside',
            titleHe: '׳׳—׳™׳§׳” ׳₪׳©׳•׳˜׳” (׳›׳•׳׳ ׳–׳׳/׳׳¨׳—׳‘ ׳—׳¡׳¨)',
            shortLine: '׳׳” ׳—׳¡׳¨ ׳›׳“׳™ ׳׳”׳‘׳™׳ ׳׳× ׳”׳×׳׳•׳ ׳”?'
        }),
        presuppositions: Object.freeze({
            side: 'outside',
            titleHe: '׳”׳ ׳—׳•׳× ׳¡׳׳•׳™׳•׳× (Presuppositions)',
            shortLine: '׳׳” ׳—׳™׳™׳‘ ׳׳”׳™׳•׳× ׳ ׳›׳•׳ ׳›׳“׳™ ׳©׳”׳׳©׳₪׳˜ ׳™׳—׳–׳™׳§?'
        }),
        mind_reading: Object.freeze({
            side: 'inside',
            titleHe: '׳§׳¨׳™׳׳× ׳׳—׳©׳‘׳•׳× / ׳§׳₪׳™׳¦׳” ׳׳׳¡׳§׳ ׳•׳×',
            shortLine: '׳›׳•׳׳ Mind-Reading ׳¢׳¦׳׳™: "׳׳™׳ ׳׳ ׳™ ׳™׳•׳“׳¢/׳×?"'
        }),
        modal_necessity: Object.freeze({
            side: 'inside',
            titleHe: '׳׳•׳₪׳¨׳˜׳•׳¨ ׳׳•׳“׳׳™ - ׳”׳›׳¨׳— (Modal)',
            shortLine: '׳—׳™׳™׳‘/׳¦׳¨׳™׳ - ׳׳” ׳”׳׳—׳™׳¨ ׳׳ ׳׳?'
        }),
        modal_possibility: Object.freeze({
            side: 'inside',
            titleHe: '׳׳•׳₪׳¨׳˜׳•׳¨ ׳׳•׳“׳׳™ - ׳׳₪׳©׳¨׳•׳× (Modal)',
            shortLine: '׳׳ ׳™׳›׳•׳/׳” - ׳׳” ׳׳•׳ ׳¢ ׳•׳׳” ׳™׳׳₪׳©׳¨?'
        }),
        cause_effect: Object.freeze({
            side: 'inside',
            titleHe: '׳¡׳™׳‘׳” ׳•׳×׳•׳¦׳׳” (Cause & Effect)',
            shortLine: '׳׳™׳ ׳‘׳“׳™׳•׳§ X ׳’׳•׳¨׳ ׳-Y?'
        }),
        complex_equivalence: Object.freeze({
            side: 'inside',
            titleHe: '׳©׳§׳™׳׳•׳× ׳׳•׳¨׳›׳‘׳× (Complex Equivalence)',
            shortLine: '׳׳™׳ X ׳׳•׳׳¨ ׳©-Y?'
        }),
        lack_ref_index: Object.freeze({
            side: 'inside',
            titleHe: '׳—׳•׳¡׳¨ ׳׳™׳ ׳“׳§׳¡ ׳™׳™׳—׳•׳¡ (Referential Index)',
            shortLine: '׳׳׳™/׳׳׳” ׳‘׳“׳™׳•׳§ ׳–׳” ׳׳×׳™׳™׳—׳¡?'
        }),
        unspecified_verb: Object.freeze({
            side: 'inside',
            titleHe: '׳₪׳•׳¢׳ ׳׳ ׳׳₪׳•׳¨׳˜ (Unspecified Verb)',
            shortLine: '׳׳” ׳‘׳“׳™׳•׳§ ׳§׳•׳¨׳” ׳‘׳₪׳•׳¢׳?'
        }),
        rules_generalization: Object.freeze({
            side: 'inside',
            titleHe: '׳›׳׳׳™׳/׳—׳•׳§׳™׳ ׳₪׳ ׳™׳׳™׳™׳ (Rules)',
            shortLine: '׳׳” ׳”׳›׳׳, ׳•׳׳×׳™ ׳”׳•׳ ׳׳ ׳¢׳•׳‘׳“?'
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
        return String((override && override.titleHe) || (category && category.labelHe) || (category && category.categoryId) || '׳§׳˜׳’׳•׳¨׳™׳”');
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
        return 'Mind Reading ׳›׳•׳׳ ׳’׳ ׳§׳¨׳™׳׳× ׳׳—׳©׳‘׳•׳× ׳¢׳¦׳׳™׳× ("׳׳ ׳™ ׳¨׳¢׳‘/׳₪׳’׳•׳¢/׳׳ ׳׳¡׳•׳’׳" - ׳׳™׳ ׳׳ ׳™ ׳™׳•׳“׳¢/׳×?) ׳•׳’׳ ׳§׳₪׳™׳¦׳” ׳׳׳¡׳§׳ ׳•׳×.';
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

        const firstBase = baseQuestions[0] || normalizeQuestionVariantText(fallbackCoreQuestion) || '׳׳” ׳‘׳“׳™׳•׳§ ׳§׳•׳¨׳” ׳›׳׳?';
        const shortSelection = selection.length > 44 ? `${selection.slice(0, 41)}...` : selection;
        const shortContext = context.length > 64 ? `${context.slice(0, 61)}...` : context;

        const wrappedVariants = [];
        if (shortSelection) {
            wrappedVariants.push(`׳›׳©׳׳×/׳” ׳׳•׳׳¨/׳× "${shortSelection}" ג€” ${firstBase}`);
            wrappedVariants.push(`׳‘׳•׳/׳™ ׳ ׳“׳™׳™׳§ ׳׳× "${shortSelection}": ${firstBase}`);
            wrappedVariants.push(`׳›׳“׳™ ׳׳”׳‘׳™׳ ׳׳× "${shortSelection}" ׳˜׳•׳‘ ׳™׳•׳×׳¨: ${firstBase}`);
        }
        if (shortContext) {
            wrappedVariants.push(`׳‘׳×׳•׳ ׳”׳”׳§׳©׳¨ ׳”׳–׳”, ${firstBase}`);
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
        state.uiMessage = '׳ ׳•׳¦׳¨ ׳¡׳©׳ ׳—׳“׳©. ׳¡׳׳/׳™ ׳§׳˜׳¢ ׳•׳‘׳—׳¨/׳™ ׳₪׳¨׳™׳–׳׳”.';
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
            state.uiMessage = '׳‘׳—׳¨/׳™ ׳§׳•׳“׳ ׳—׳–׳•׳¨ ׳׳‘׳¡׳™׳¡ ׳׳• ׳”׳׳©׳ ׳׳”׳×׳©׳•׳‘׳”.';
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
            state.uiMessage = '׳”׳¡׳™׳׳•׳ ׳¢׳•׳“׳›׳. ׳¢׳›׳©׳™׳• ׳‘׳—׳¨/׳™ ׳§׳˜׳’׳•׳¨׳™׳” ׳׳©׳•׳ ׳™׳×-׳׳•׳’׳™׳×.';
        } else {
            updateSelectionFromTokenRange(visualIndex, visualIndex);
            state.selectionAnchorTokenIndex = visualIndex;
            state.selectionAwaitingEnd = true;
            state.uiMessage = '׳׳—׳™׳¦׳” ׳ ׳•׳¡׳₪׳× ׳×׳¨׳—׳™׳‘ ׳׳¡׳₪׳׳ ׳¨׳¦׳™׳£. ׳׳₪׳©׳¨ ׳’׳ ׳׳‘׳—׳•׳¨ ׳§׳˜׳’׳•׳¨׳™׳” ׳›׳‘׳¨ ׳¢׳›׳©׳™׳•.';
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
            state.uiMessage = '׳§׳™׳™׳ ׳¦׳¢׳“ ׳₪׳×׳•׳—. ׳‘׳—׳¨/׳™ ׳—׳–׳•׳¨ ׳׳‘׳¡׳™׳¡ ׳׳• ׳”׳׳©׳ ׳׳”׳×׳©׳•׳‘׳” ׳׳₪׳ ׳™ ׳©׳׳׳” ׳ ׳•׳¡׳₪׳×.';
            render();
            return;
        }
        if (!state.selection) {
            state.uiMessage = '׳¦׳¨׳™׳ ׳¡׳™׳׳•׳ ׳˜׳§׳¡׳˜ ׳׳₪׳ ׳™ ׳‘׳—׳™׳¨׳× ׳₪׳¨׳™׳–׳׳”.';
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
        state.uiMessage = '׳ ׳•׳¦׳¨ ׳¦׳¢׳“ ׳—׳“׳©. ׳‘׳—׳¨/׳™ ׳—׳–׳•׳¨ ׳׳‘׳¡׳™׳¡ ׳׳• ׳”׳׳©׳ ׳׳”׳×׳©׳•׳‘׳”.';

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
        state.uiMessage = '׳—׳–׳¨׳ ׳• ׳׳‘׳¡׳™׳¡. ׳¡׳׳/׳™ ׳§׳˜׳¢ ׳—׳“׳© ׳•׳‘׳—׳¨/׳™ ׳₪׳¨׳™׳–׳׳”.';
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
        state.uiMessage = '׳”׳׳©׳›׳ ׳• ׳׳”׳×׳©׳•׳‘׳”. ׳¢׳›׳©׳™׳• ׳׳₪׳©׳¨ ׳׳¡׳׳ ׳׳× ׳”׳׳©׳₪׳˜ ׳”׳—׳“׳©.';
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

        state.uiMessage = '׳¢׳•׳“׳›׳ ׳ ׳™׳¡׳•׳— ׳”׳©׳׳׳” ׳׳׳•׳×׳” ׳§׳˜׳’׳•׳¨׳™׳” (׳׳•׳×׳” ׳›׳•׳•׳ ׳” ׳˜׳™׳₪׳•׳׳™׳×, ׳ ׳™׳¡׳•׳— ׳׳—׳¨).';
        render();
        persistState();
    }

    function generateReport() {
        if (!state.session) return;
        state.lastReport = core.buildAfaqReport(state.session, { categoriesById: state.categoriesById });
        state.uiMessage = '׳¡׳™׳›׳•׳ ׳”׳—׳§׳™׳¨׳” ׳”׳•׳₪׳§ ׳׳”׳¡׳©׳ ׳”׳ ׳•׳›׳—׳™.';
        render();
        persistState();
    }

    function copyReportJson() {
        if (!state.lastReport) return;
        copyText(JSON.stringify({
            session: state.session,
            report: state.lastReport
        }, null, 2), '׳”׳“׳•׳— ׳”׳•׳¢׳×׳§ ׳›-JSON.');
    }

    function copyReportMarkdown() {
        if (!state.lastReport) return;
        const markdown = core.reportToMarkdown(state.lastReport);
        copyText(markdown, '׳”׳“׳•׳— ׳”׳•׳¢׳×׳§ ׳›-Markdown.');
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
            state.uiMessage = '׳©׳•׳—׳–׳¨ ׳¡׳©׳ ׳§׳•׳“׳.';
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
        state.uiMessage = '׳”׳˜׳§׳¡׳˜ ׳”׳—׳“׳© ׳”׳•׳˜׳׳¢ ׳•׳¢׳‘׳¨ ׳׳—׳׳•׳ ׳”׳׳¨׳›׳–׳™.';
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
        if (!source) return '<p class="prm-empty">׳׳™׳ ׳˜׳§׳¡׳˜ ׳₪׳¢׳™׳. ׳”׳›׳ ׳¡/׳™ ׳‘׳¡׳™׳¡ ׳•׳”׳×׳—׳/׳™ ׳¡׳©׳.</p>';
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
            <div class="prm-breen-5x3-wrap" aria-label="׳˜׳‘׳׳× ׳‘׳¨׳™׳ ׳§׳׳׳¡׳™׳× 5x3">
                <div class="prm-breen-5x3-title">׳˜׳‘׳׳× ׳‘׳¨׳™׳ ׳”׳§׳׳׳¡׳™׳× (5ֳ—3) ג€” ׳׳₪׳× ׳¢׳•׳’׳</div>
                <p class="prm-breen-5x3-note">׳–׳•׳”׳™ ׳׳₪׳× ׳”׳™׳™׳—׳•׳¡ ׳”׳§׳‘׳•׳¢׳” ׳©׳ ׳§׳˜׳’׳•׳¨׳™׳•׳× ׳”׳׳˜׳”-׳׳•׳“׳ ׳׳×׳¨׳’׳•׳ ׳•׳׳ ׳™׳•׳•׳˜.</p>
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
            : '׳׳” ׳‘׳“׳™׳•׳§ ׳§׳•׳¨׳” ׳›׳׳?';
        return {
            ask3x: fallbackQuestion,
            school: '׳“׳™׳•׳§ ׳׳©׳•׳ ׳™ ׳•׳—׳§׳™׳¨׳” ׳₪׳ ׳•׳׳ ׳•׳׳•׳’׳™׳×',
            why: '׳”׳§׳˜׳’׳•׳¨׳™׳” ׳”׳–׳• ׳¢׳•׳–׳¨׳× ׳׳”׳₪׳•׳ ׳ ׳™׳¡׳•׳— ׳¢׳׳•׳ ׳׳׳‘׳ ׳” ׳©׳ ׳™׳×׳ ׳׳‘׳“׳•׳§ ׳©׳׳‘-׳©׳׳‘.',
            creates: '׳™׳•׳×׳¨ ׳₪׳™׳¨׳•׳˜, ׳×׳ ׳׳™׳, ׳¨׳׳™׳•׳× ׳׳• ׳׳ ׳’׳ ׳•׳ - ׳•׳₪׳—׳•׳× ׳׳¡׳§׳ ׳•׳× ׳׳•׳˜׳•׳׳˜׳™׳•׳×.',
            therapistCalm: '׳׳ ׳—׳™׳™׳‘׳™׳ ׳׳“׳¢׳× ׳׳¨׳׳© ׳׳× ׳”׳×׳©׳•׳‘׳”; ׳׳¡׳₪׳™׳§ ׳׳”׳—׳–׳™׳§ ׳©׳׳׳” ׳™׳¦׳™׳‘׳”.',
            patientGain: '׳™׳•׳×׳¨ ׳‘׳”׳™׳¨׳•׳× ׳•׳™׳•׳×׳¨ ׳׳₪׳©׳¨׳•׳™׳•׳× ׳₪׳¢׳•׳׳”.',
            trap: '׳׳§׳₪׳•׳¥ ׳׳”׳¨ ׳׳“׳™ ׳׳₪׳×׳¨׳•׳.',
            fix: '׳׳”׳™׳©׳׳¨ ׳¢׳•׳“ ׳—׳₪׳™׳¨׳” ׳׳—׳× ׳¢׳ ׳׳•׳×׳” ׳¢׳“׳©׳”.',
            tooltip: '׳₪׳¨׳™׳–׳׳” ׳׳—׳×, ׳©׳׳•׳© ׳—׳₪׳™׳¨׳•׳×, ׳™׳•׳×׳¨ ׳©׳˜׳— ׳₪׳ ׳™׳׳™.'
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
                        <p class="prm-philosophy-q"><strong>׳”׳©׳׳׳” ׳”׳—׳•׳–׳¨׳× (3ֳ—):</strong> ${escapeHtml(ph.ask3x || '')}</p>
                        <p><strong>׳©׳׳׳× ׳‘׳¡׳™׳¡ ׳׳”׳׳₪׳׳™׳§׳¦׳™׳”:</strong> ${escapeHtml(appQuestion || '')}</p>
                        <p><strong>׳”׳‘׳¡׳™׳¡ ׳”׳₪׳™׳׳•׳¡׳•׳₪׳™:</strong> ${escapeHtml(ph.why || '')}</p>
                        <p><strong>׳׳” ׳–׳” ׳׳™׳™׳¦׳¨ ׳‘׳₪׳•׳¢׳:</strong> ${escapeHtml(ph.creates || '')}</p>
                        <p><strong>׳”׳©׳§׳˜ ׳©׳ ׳”׳׳˜׳₪׳:</strong> ${escapeHtml(ph.therapistCalm || '')}</p>
                        <p><strong>׳”׳¨׳•׳•׳— ׳׳׳˜׳•׳₪׳:</strong> ${escapeHtml(ph.patientGain || '')}</p>
                        <p><strong>׳׳׳›׳•׳“׳× ׳ ׳₪׳•׳¦׳”:</strong> ${escapeHtml(ph.trap || '')}</p>
                        <p><strong>׳×׳™׳§׳•׳/׳›׳•׳•׳ ׳•׳:</strong> ${escapeHtml(ph.fix || '')}</p>
                        <p class="prm-philosophy-tooltip"><strong>Tooltip:</strong> ${escapeHtml(ph.tooltip || '')}</p>
                    </div>
                </details>
            `;
        }).join('');

        return `
            <section class="prm-card prm-philosophy-panel">
                <details class="prm-philosophy-library">
                    <summary class="prm-philosophy-library-summary">
                        <span>׳₪׳™׳׳•׳¡׳•׳₪׳™׳” ׳׳׳—׳•׳¨׳™ 15 ׳”׳₪׳¨׳™׳–׳׳•׳× (׳׳•׳¨׳—׳‘)</span>
                        <small>׳׳׳” ׳׳•׳×׳¨ ׳׳©׳׳•׳ ׳׳× ׳׳•׳×׳” ׳©׳׳׳” ׳©׳•׳‘ ׳•׳©׳•׳‘ ֲ· 3ֳ—</small>
                    </summary>
                    <div class="prm-philosophy-library-body">
                        <p class="prm-philosophy-intro">
                            <strong>Prism Research = Chain / ׳—׳§׳™׳¨׳” ׳׳•׳¨׳›׳™׳×:</strong> ׳‘׳•׳—׳¨׳™׳ ׳¢׳“׳©׳” ׳׳—׳× ׳•׳׳׳©׳™׳›׳™׳ ׳§׳“׳™׳׳” ׳¢׳ ׳”׳׳©׳₪׳˜ ׳”׳—׳“׳© ׳©׳ ׳•׳׳“.
                            <strong>Prism Lab = Vertical Stack:</strong> ׳׳•׳“׳•׳ ׳׳©׳׳™׳ ׳׳¢׳•׳׳§ ׳¢׳ ׳¢׳•׳’׳ ׳׳—׳“ ׳“׳¨׳ E/B/C/V/I/S.
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
                <h3>׳×׳™׳׳•׳¨׳™׳” ׳•׳₪׳™׳׳•׳¡׳•׳₪׳™׳” ׳©׳ ׳”׳₪׳¨׳™׳–׳׳•׳×</h3>
                <p>
                    ׳”׳”׳¡׳‘׳¨ ׳”׳׳¢׳׳™׳§ ׳¢׳ ׳›׳ ׳₪׳¨׳™׳–׳׳” (׳©׳׳׳•׳× / ׳׳˜׳¨׳” / ׳₪׳™׳׳•׳¡׳•׳₪׳™׳” / ׳׳׳›׳•׳“׳•׳×) ׳¢׳‘׳¨ ׳׳“׳£ ׳ ׳₪׳¨׳“ ׳›׳“׳™ ׳׳©׳׳•׳¨ ׳›׳׳ ׳¢׳ ׳׳¡׳ ׳×׳¨׳’׳•׳ ׳ ׳§׳™.
                </p>
                <p class="prm-kicker">
                    ׳₪׳×׳—/׳™ ׳׳× ׳“׳£ ׳§׳˜׳’׳•׳¨׳™׳•׳× ׳‘׳¨׳™׳ ׳׳”׳׳₪׳׳™׳§׳¦׳™׳” ׳”׳¨׳׳©׳™׳× ׳›׳“׳™ ׳׳׳׳•׳“ ׳©׳›׳‘׳•׳× ׳×׳׳•׳¨׳™׳” ׳‘׳׳™ ׳׳”׳¢׳׳™׳¡ ׳¢׳ ׳”׳—׳§׳™׳¨׳” ׳¢׳¦׳׳”.
                </p>
                <div class="prm-inline-actions">
                    <a class="prm-small-btn prm-link-btn" href="index.html?tab=categories" target="_blank" rel="noopener">׳₪׳×׳—/׳™ ׳§׳˜׳’׳•׳¨׳™׳•׳× ׳‘׳¨׳™׳ (׳×׳׳•׳¨׳™׳”)</a>
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
            <section class="prm-card prm-recursive-guide" aria-label="׳”׳¡׳‘׳¨ ׳¨׳§׳•׳¨׳¡׳™׳‘׳™ ׳•-Next Step Function">
                <div class="prm-recursive-guide-head">
                    <h2>׳׳” ׳–׳” "׳¨׳§׳•׳¨׳¡׳™׳‘׳™" ׳•׳׳׳” ׳–׳” ׳—׳©׳•׳‘ ׳›׳׳?</h2>
                    <p class="prm-kicker">׳‘-Prism Research ׳׳ "׳¨׳¦׳™׳" ׳׳¢׳•׳“ ׳×׳™׳׳•׳¨׳™׳”. ׳©׳•׳׳׳™׳, ׳׳§׳‘׳׳™׳ ׳×׳©׳•׳‘׳” ׳—׳“׳©׳”, ׳•׳׳– ׳‘׳•׳“׳§׳™׳ ׳׳•׳×׳” ׳©׳•׳‘ ׳¢׳ ׳׳•׳×׳” ׳¢׳“׳©׳”.</p>
                </div>

                <div class="prm-recursive-flow" aria-hidden="true">
                    <span>׳׳©׳₪׳˜/׳§׳˜׳¢</span>
                    <span class="prm-recursive-flow-arrow">ג†</span>
                    <span>׳©׳׳׳” ׳׳“׳•׳™׳§׳×</span>
                    <span class="prm-recursive-flow-arrow">ג†</span>
                    <span>׳×׳©׳•׳‘׳” ׳—׳“׳©׳”</span>
                    <span class="prm-recursive-flow-arrow">ג†</span>
                    <span>׳‘׳—׳™׳¨׳× ׳¦׳¢׳“ ׳”׳‘׳</span>
                </div>

                <div class="prm-recursive-grid">
                    <article class="prm-recursive-step">
                        <div class="prm-recursive-step-index">1</div>
                        <h3>׳×׳׳•׳ ׳” ׳›׳׳׳™׳× + ׳׳•׳§׳“ ׳ ׳•׳›׳—׳™</h3>
                        <p>׳׳—׳–׳™׳§׳™׳ ׳×׳׳•׳ ׳” ׳›׳׳׳™׳× ׳©׳ ׳”׳¡׳™׳₪׳•׳¨, ׳׳‘׳ ׳‘׳›׳ ׳¨׳’׳¢ ׳¢׳•׳‘׳“׳™׳ ׳¨׳§ ׳¢׳ ׳§׳˜׳¢ ׳׳¡׳•׳™׳ ׳©׳ ׳‘׳—׳¨. ׳–׳” ׳׳•׳ ׳¢ ׳”׳¦׳₪׳” ׳•׳׳׳§׳“ ׳׳× ׳”׳—׳§׳™׳¨׳”.</p>
                    </article>
                    <article class="prm-recursive-step">
                        <div class="prm-recursive-step-index">2</div>
                        <h3>Next Step Function (׳”׳¦׳¢׳“ ׳”׳‘׳)</h3>
                        <p>׳‘׳¡׳₪׳¨׳™׳ ׳”׳¨׳׳©׳•׳ ׳™׳ ׳©׳ NLP ׳“׳™׳‘׳¨׳• ׳¢׳ <strong>Next Step Function</strong>: ׳׳ ׳—׳™׳™׳‘׳™׳ ׳׳“׳¢׳× ׳׳× ׳›׳ ׳”׳׳¡׳׳•׳ ׳׳¨׳׳©, ׳׳׳ ׳׳‘׳—׳•׳¨ ׳׳× ׳”׳¦׳¢׳“ ׳”׳‘׳ ׳”׳›׳™ ׳˜׳•׳‘ ׳׳₪׳™ ׳׳” ׳©׳ ׳׳¦׳ ׳¢׳›׳©׳™׳•.</p>
                    </article>
                    <article class="prm-recursive-step">
                        <div class="prm-recursive-step-index">3</div>
                        <h3>׳₪׳™׳“׳‘׳§ (׳§׳™׳‘׳¨׳ ׳˜׳™׳§׳”) ׳‘׳׳§׳•׳ ׳ ׳™׳—׳•׳©</h3>
                        <p>׳׳×׳—׳•׳ ׳”׳§׳™׳‘׳¨׳ ׳˜׳™׳§׳”: ׳›׳ ׳₪׳¢׳•׳׳” ׳׳™׳™׳¦׳¨׳× ׳”׳™׳–׳•׳ ׳—׳•׳–׳¨. ׳׳›׳ ׳׳ ׳׳’׳™׳‘׳™׳ ׳¨׳§ ׳׳׳” ׳©׳—׳©׳‘׳ ׳• ׳©׳™׳”׳™׳”, ׳׳׳ ׳׳׳” ׳©׳‘׳׳׳× ׳—׳–׳¨ ׳׳”׳©׳׳׳” - ׳•׳׳©׳ ׳‘׳•׳—׳¨׳™׳ ׳׳× ׳”׳¦׳¢׳“ ׳”׳‘׳.</p>
                    </article>
                </div>

                <div class="prm-recursive-note">
                    <strong>׳׳׳” ׳–׳” ׳¨׳׳•׳•׳ ׳˜׳™ ׳׳¢׳‘׳•׳“׳” ׳˜׳™׳₪׳•׳׳™׳×?</strong>
                    <p>׳›׳™ ׳–׳” ׳׳©׳׳‘ ׳’׳ ׳›׳™׳•׳•׳ (׳׳׳ ׳׳ ׳—׳ ׳• ׳—׳•׳§׳¨׳™׳) ׳•׳’׳ ׳’׳׳™׳©׳•׳× (׳׳” ׳¢׳•׳©׳™׳ ׳¢׳›׳©׳™׳• ׳‘׳₪׳•׳¢׳ ׳׳₪׳™ ׳”׳×׳’׳•׳‘׳” ׳©׳§׳™׳‘׳׳ ׳•), ׳‘׳׳§׳•׳ ׳׳”׳™׳¦׳׳“ ׳׳₪׳¨׳©׳ ׳•׳× ׳׳•׳§׳“׳׳×.</p>
                </div>
            </section>
        `;
    }

    function renderPendingQa() {
        if (!state.pendingQA) {
            return `
                <div class="prm-card prm-qa-panel is-empty">
                    <h3>׳׳”׳׳ ׳—׳§׳™׳¨׳” ׳”׳‘׳</h3>
                    <p>׳‘׳—׳¨׳• ׳§׳˜׳’׳•׳¨׳™׳” ׳׳—׳¨׳™ ׳¡׳™׳׳•׳ ׳›׳“׳™ ׳׳§׳‘׳ ׳©׳׳׳” ׳׳“׳•׳™׳§׳× ׳•׳×׳©׳•׳‘׳× ׳”׳׳©׳.</p>
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
                    <strong>׳ ׳™׳¡׳•׳—׳™׳ ׳—׳׳•׳₪׳™׳™׳ ׳׳׳•׳×׳” ׳©׳׳׳” (׳׳•׳×׳” ׳›׳•׳•׳ ׳” ׳˜׳™׳₪׳•׳׳™׳×)</strong>
                    <small>׳׳₪׳©׳¨ ׳׳‘׳—׳•׳¨ ׳ ׳™׳¡׳•׳— ׳©׳׳¨׳’׳™׳© ׳׳ ׳˜׳‘׳¢׳™ ׳™׳•׳×׳¨ ׳׳•׳ ׳”׳׳˜׳•׳₪׳/׳×.</small>
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
                <h3>׳׳”׳׳ ׳—׳§׳™׳¨׳” ׳”׳‘׳</h3>
                <p class="prm-kicker">׳₪׳¨׳™׳–׳׳” ׳©׳ ׳‘׳—׳¨׳”: ${escapeHtml(state.pendingQA.categoryLabelHe)}</p>
                <div class="prm-qa-block">
                    <div><strong>׳”׳©׳׳׳” ׳©׳ ׳‘׳—׳¨׳” ׳›׳¨׳’׳¢:</strong> ${escapeHtml(state.pendingQA.questionText)}</div>
                    <div><strong>׳×׳©׳•׳‘׳× ׳”׳׳©׳:</strong> ${escapeHtml(state.pendingQA.answerText)}</div>
                    <div><strong>׳׳©׳₪׳˜ ׳—׳“׳© ׳©׳ ׳•׳׳“:</strong> ${escapeHtml(state.pendingQA.generatedSentence)}</div>
                </div>
                ${variantsHtml}
                <div class="prm-nav-actions">
                    <button type="button" class="prm-big-btn secondary" data-action="back-base">׳—׳–׳¨׳” ׳׳˜׳§׳¡׳˜ ׳”׳׳¨׳›׳–׳™</button>
                    <button type="button" class="prm-big-btn primary" data-action="continue-answer">׳”׳׳©׳ ׳׳×׳•׳ ׳×׳©׳•׳‘׳× ׳”׳”׳׳©׳</button>
                </div>
            </div>
        `;
    }

    function renderPathLog() {
        const nodes = state.session && Array.isArray(state.session.nodes) ? state.session.nodes : [];
        if (!nodes.length) {
            return '<p class="prm-empty">׳¢׳•׳“ ׳׳ ׳”׳×׳—׳™׳׳” ׳©׳¨׳©׳¨׳× ׳—׳§׳™׳¨׳”. ׳¡׳׳ ׳• ׳§׳˜׳¢ ׳‘׳˜׳§׳¡׳˜ ׳•׳‘׳—׳¨׳• ׳₪׳¨׳™׳–׳׳” ׳¨׳׳©׳•׳ ׳”.</p>';
        }
        const items = nodes.slice().reverse().slice(0, 14).map((node, idx) => `
            <li class="prm-log-item">
                <div class="prm-log-head">
                    <span>#${nodes.length - idx}</span>
                    <span>${escapeHtml(node.categoryLabelHe)}</span>
                    <span class="prm-tagline">${escapeHtml((node.tags || []).join(', '))}</span>
                </div>
                <div class="prm-log-line"><strong>׳§׳˜׳¢ ׳©׳ ׳‘׳“׳§:</strong> ${escapeHtml(node.selection && node.selection.text)}</div>
                <div class="prm-log-line"><strong>׳×׳©׳•׳‘׳× ׳”׳׳©׳:</strong> ${escapeHtml(node.answerText)}</div>
            </li>
        `).join('');
        return `<ol class="prm-log-list">${items}</ol>`;
    }

    function renderReportPanel() {
        if (!state.lastReport) {
            return `
                <div class="prm-card prm-report-panel is-empty">
                    <h3>׳¡׳™׳›׳•׳ ׳×׳•׳‘׳ ׳•׳× ׳׳”׳—׳§׳™׳¨׳”</h3>
                    <p>׳”׳¡׳™׳›׳•׳ ׳™׳•׳₪׳™׳¢ ׳›׳׳ ׳׳—׳¨׳™ ׳׳₪׳—׳•׳× ${core.MIN_REPORT_NODES} ׳¦׳¢׳“׳™ ׳—׳§׳™׳¨׳”.</p>
                </div>
            `;
        }
        const r = state.lastReport;
        const renderList = (items) => {
            if (!Array.isArray(items) || !items.length) return '<li>׳¢׳“׳™׳™׳ ׳׳™׳ ׳׳¡׳₪׳™׳§ ׳×׳•׳›׳</li>';
            return items.map(item => `<li>${escapeHtml(item)}</li>`).join('');
        };

        return `
            <div class="prm-card prm-report-panel">
                <h3>׳¡׳™׳›׳•׳ ׳×׳•׳‘׳ ׳•׳× ׳׳”׳—׳§׳™׳¨׳”</h3>
                <div class="prm-report-actions">
                    <button type="button" class="prm-small-btn" data-action="copy-report-json">׳”׳¢׳×׳§ JSON</button>
                    <button type="button" class="prm-small-btn" data-action="copy-report-md">׳”׳¢׳×׳§ ׳¡׳™׳›׳•׳</button>
                </div>
                <div class="prm-report-grid">
                    <section><h4>׳©׳¨׳©׳¨׳׳•׳× ׳¡׳™׳‘׳”</h4><ul>${renderList(r.sections.causalChains)}</ul></section>
                    <section><h4>׳©׳¨׳©׳¨׳׳•׳× ׳׳©׳׳¢׳•׳×</h4><ul>${renderList(r.sections.meaningChains)}</ul></section>
                    <section><h4>׳¨׳׳™׳•׳× / ׳§׳¨׳™׳˜׳¨׳™׳•׳ ׳™׳</h4><ul>${renderList(r.sections.evidenceCriteria)}</ul></section>
                    <section><h4>׳×׳ ׳׳™׳ / ׳”׳™׳§׳£</h4><ul>${renderList(r.sections.conditionsScope)}</ul></section>
                    <section><h4>׳׳™׳׳•׳¦׳™׳ ׳׳•׳“׳׳™׳™׳</h4><ul>${renderList(r.sections.modalConstraints)}</ul></section>
                    <section><h4>׳”׳›׳׳׳•׳×</h4><ul>${renderList(r.sections.generalizations)}</ul></section>
                </div>
                <section>
                    <h4>׳×׳•׳‘׳ ׳•׳×</h4>
                    <ul>${renderList(r.insights)}</ul>
                </section>
                <section>
                    <h4>׳¦׳¢׳“ ׳”׳׳©׳</h4>
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
                <span class="prm-chip">׳¦׳׳×׳™׳: <strong>${stats.totalNodes}</strong></span>
                <span class="prm-chip">׳¢׳•׳׳§: <strong>${stats.maxDepth}</strong></span>
                <span class="prm-chip">׳¢׳ ׳₪׳™׳: <strong>${stats.branchCount}</strong></span>
                <span class="prm-chip">׳׳׳•׳¦׳¢ ׳¢׳•׳׳§: <strong>${stats.avgDepth.toFixed(1)}</strong></span>
                <button type="button" class="prm-small-btn ${reportEnabled ? '' : 'is-disabled'}" data-action="generate-report" ${reportEnabled ? '' : 'disabled'}>
                    ׳”׳₪׳§ ׳¡׳™׳›׳•׳ ׳—׳§׳™׳¨׳”
                </button>
            </div>
        `;
    }

    function renderBaseStoryPanel(reportEnabled) {
        const draftText = String(state.baseStoryDraft || (state.session && state.session.baseStoryText) || DEMO_STORY);
        const activeBase = String((state.session && state.session.baseStoryText) || '');
        const hasDraftChanges = draftText.trim() && draftText.trim() !== activeBase.trim();
        const draftPreview = draftText.trim() || '׳׳™׳ ׳˜׳§׳¡׳˜ ׳˜׳™׳•׳˜׳” ׳¢׳“׳™׳™׳.';

        return `
            <section class="prm-card prm-base-config ${state.baseStoryEditorOpen ? 'is-open' : 'is-collapsed'}">
                <div class="prm-base-head">
                    <div>
                        <h2>׳¡׳™׳₪׳•׳¨ ׳‘׳¡׳™׳¡ (׳׳˜׳™׳•׳˜׳” / ׳׳™׳׳•׳©)</h2>
                        <p class="prm-kicker">
                            ׳‘׳ ׳• ׳׳• ׳¢׳¨׳›׳• ׳˜׳§׳¡׳˜ ׳‘׳¡׳™׳¡׳™, ׳•׳׳– ׳׳—׳¦׳• "׳׳™׳׳•׳© ׳׳˜׳§׳¡׳˜ ׳”׳׳¨׳›׳–׳™". ׳“׳£ ׳”׳×׳¨׳’׳•׳ ׳ ׳©׳׳¨ ׳§׳•׳׳₪׳§׳˜׳™ ׳›׳©׳”׳¢׳•׳¨׳ ׳¡׳’׳•׳¨.
                        </p>
                    </div>
                    <div class="prm-hero-actions">
                        <button type="button" class="prm-small-btn" data-action="toggle-base-editor">
                            ${state.baseStoryEditorOpen ? '׳¡׳’׳•׳¨ ׳¢׳•׳¨׳ ׳¡׳™׳₪׳•׳¨' : '׳₪׳×׳— ׳¢׳•׳¨׳ ׳¡׳™׳₪׳•׳¨'}
                        </button>
                        <button type="button" class="prm-small-btn" data-action="apply-base">׳׳™׳׳•׳© ׳׳˜׳§׳¡׳˜ ׳”׳׳¨׳›׳–׳™</button>
                        <button type="button" class="prm-small-btn" data-action="back-base">׳—׳–׳¨׳” ׳׳‘׳¡׳™׳¡</button>
                    </div>
                </div>

                <div class="prm-base-preview ${hasDraftChanges ? 'has-draft-changes' : ''}">
                    <strong>׳˜׳™׳•׳˜׳” ׳ ׳•׳›׳—׳™׳×:</strong>
                    <span>${escapeHtml(draftPreview.length > 240 ? `${draftPreview.slice(0, 237)}...` : draftPreview)}</span>
                    ${hasDraftChanges ? '<small class="prm-badge-draft">׳™׳© ׳©׳™׳ ׳•׳™׳™׳ ׳©׳˜׳¨׳ ׳׳•׳׳©׳•</small>' : ''}
                </div>

                ${state.baseStoryEditorOpen ? `
                    <label for="prm-base-input" class="prm-base-editor-label"><strong>׳¢׳•׳¨׳ ׳¡׳™׳₪׳•׳¨ ׳‘׳¡׳™׳¡</strong></label>
                    <textarea id="prm-base-input" rows="4" spellcheck="false">${escapeHtml(draftText)}</textarea>
                    <div class="prm-inline-actions">
                        <button type="button" class="prm-small-btn" data-action="load-demo">׳˜׳¢׳ ׳“׳•׳’׳׳”</button>
                        <button type="button" class="prm-small-btn" data-action="reset-session">׳¡׳©׳ ׳—׳“׳© ׳׳”׳˜׳™׳•׳˜׳”</button>
                        <button type="button" class="prm-small-btn" data-action="toggle-base-editor">׳¡׳’׳•׳¨ ׳¢׳•׳¨׳</button>
                    </div>
                ` : ''}

                ${renderStatsChips()}
                <p class="prm-message" aria-live="polite">${escapeHtml(state.uiMessage || '')}</p>
            </section>
        `;
    }

    function render() {
        if (!state.loaded) {
            const msg = state.loadError ? escapeHtml(state.loadError) : '׳˜׳•׳¢׳ Prism Research Mode...';
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
                        <h1>׳׳•׳“׳ ׳”׳₪׳¨׳™׳–׳׳”: ׳—׳§׳™׳¨׳× ׳˜׳§׳¡׳˜ ׳“׳¨׳ ׳§׳˜׳’׳•׳¨׳™׳•׳× ׳׳©׳•׳ ׳™׳•׳×-׳׳•׳’׳™׳•׳×</h1>
                        <p class="prm-subtitle">׳׳•׳׳׳” ׳§׳‘׳•׳¢׳”: ׳¡׳™׳׳•׳ ג†’ ׳§׳˜׳’׳•׳¨׳™׳” ג†’ ׳©׳׳׳” ג†’ ׳×׳©׳•׳‘׳” ג†’ ׳—׳–׳•׳¨ ׳׳‘׳¡׳™׳¡ / ׳”׳׳©׳ ׳׳”׳×׳©׳•׳‘׳”.</p>
                        <div class="prm-hero-help-row">
                            <button
                                type="button"
                                class="prm-small-btn prm-small-btn-help"
                                data-action="toggle-recursive-guide"
                                aria-expanded="${state.showRecursiveGuide ? 'true' : 'false'}"
                            >
                                ${state.showRecursiveGuide ? '׳¡׳’׳•׳¨ ׳”׳¡׳‘׳¨ "׳¨׳§׳•׳¨׳¡׳™׳‘׳™"' : '׳׳” ׳–׳” "׳¨׳§׳•׳¨׳¡׳™׳‘׳™"?'}
                            </button>
                            <small>׳”׳¡׳‘׳¨ ׳§׳¦׳¨ ׳¢׳ Next Step Function + ׳”׳™׳–׳•׳ ׳—׳•׳–׳¨ (׳§׳™׳‘׳¨׳ ׳˜׳™׳§׳”)</small>
                        </div>
                    </div>
                    <div class="prm-hero-actions">
                        <button type="button" class="prm-small-btn" data-action="load-demo">׳˜׳¢׳ ׳“׳•׳’׳׳”</button>
                        <button type="button" class="prm-small-btn" data-action="reset-session">׳¡׳©׳ ׳—׳“׳©</button>
                        <button type="button" class="prm-small-btn" data-action="clear-session">׳ ׳§׳” ׳©׳׳™׳¨׳”</button>
                    </div>
                </header>
                ${state.showRecursiveGuide ? renderRecursiveGuidePanel() : ''}
                ${renderBaseStoryPanel(reportEnabled)}

                <section class="prm-layout">
                    <div class="prm-column">
                        <section class="prm-card">
                             <h2>׳˜׳§׳¡׳˜ ׳‘׳¡׳™׳¡ / ׳˜׳§׳¡׳˜ ׳₪׳¢׳™׳</h2>
                            <p class="prm-kicker">׳”׳§׳©׳¨ ׳ ׳•׳›׳—׳™: ${state.currentContextType === 'continued' ? '׳”׳׳©׳ ׳׳×׳©׳•׳‘׳× ׳”׳”׳׳©׳' : '׳˜׳§׳¡׳˜ ׳‘׳¡׳™׳¡'}</p>
                            <div class="prm-context-text">${renderTokenizedContext()}</div>
                            <div class="prm-selection-box ${state.selection ? 'has-selection' : ''}">
                                <strong>׳§׳˜׳¢ ׳׳¡׳•׳׳:</strong>
                                <span>${escapeHtml(selectedText || '׳¢׳“׳™׳™׳ ׳׳ ׳¡׳•׳׳ ׳§׳˜׳¢')}</span>
                                ${state.selection ? `<small> [${state.selection.start}-${state.selection.end}]</small>` : ''}
                            </div>
                        </section>

                        
                        <section class="prm-card">
                            <h2>׳˜׳‘׳׳× ׳‘׳¨׳™׳ - 15 ׳§׳˜׳’׳•׳¨׳™׳•׳× (׳¡׳“׳¨ ׳¢׳‘׳•׳“׳”)</h2>
                            ${renderBreenCategoryBoard()}
                        </section>

                        ${renderPendingQa()}
                    </div>

                    <div class="prm-column">
                        <section class="prm-card">
                            <h2>׳™׳•׳׳ ׳׳¡׳׳•׳ ׳”׳—׳§׳™׳¨׳”</h2>
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
            state.loadError = `׳˜׳¢׳™׳ ׳× ׳ ׳×׳•׳ ׳™׳ ׳ ׳›׳©׳׳”: ${error && error.message ? error.message : String(error)}`;
            render();
        }
    }

    boot();
})();

