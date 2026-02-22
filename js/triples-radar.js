(function attachTriplesRadarModule(rootFactory) {
    const root = typeof globalThis !== 'undefined'
        ? globalThis
        : (typeof window !== 'undefined' ? window : this);
    const api = rootFactory(root);
    root.setupTriplesRadarModule = api.setupTriplesRadarModule;
})(function createTriplesRadarModule(root) {
    const STORAGE_KEY = 'triples_radar_progress_v1';

    const ROW_META = Object.freeze({
        row1: Object.freeze({ colorClass: 'row-sky', heLabel: 'שלשה 1 — שכבת מקור' }),
        row2: Object.freeze({ colorClass: 'row-teal', heLabel: 'שלשה 2 — שכבת חוקים' }),
        row3: Object.freeze({ colorClass: 'row-amber', heLabel: 'שלשה 3 — שכבת משמעות' }),
        row4: Object.freeze({ colorClass: 'row-violet', heLabel: 'שלשה 4 — שכבת הקשר' }),
        row5: Object.freeze({ colorClass: 'row-rose', heLabel: 'שלשה 5 — שכבת קרקע' })
    });

    const state = {
        data: null,
        scenarios: [],
        index: 0,
        score: 0,
        solvedCount: 0,
        attemptsInScenario: 0,
        rowHintUsed: false,
        categoryHintUsed: false,
        solved: false,
        selectedCategory: '',
        elements: null
    };

    function escapeHtml(value) {
        if (typeof root.escapeHtml === 'function') return root.escapeHtml(value);
        if (value === null || value === undefined) return '';
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function getDefaultProgress() {
        return {
            score: 0,
            solvedCount: 0
        };
    }

    function loadProgress() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return getDefaultProgress();
            const parsed = JSON.parse(raw);
            return {
                ...getDefaultProgress(),
                ...(parsed || {})
            };
        } catch (error) {
            return getDefaultProgress();
        }
    }

    function saveProgress() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                score: state.score,
                solvedCount: state.solvedCount
            }));
        } catch (error) {
            // Ignore storage errors (private mode / quota).
        }
    }

    function getCurrentScenario() {
        return state.scenarios[state.index] || null;
    }

    function getCategoryLabelHe(categoryId) {
        const normalized = root.triplesRadarCore.normalizeCategoryId(categoryId);
        const found = (state.data?.categories || []).find((category) => {
            return root.triplesRadarCore.normalizeCategoryId(category.id) === normalized;
        });
        return found?.labelHe || found?.label || normalized;
    }

    function setFeedback(message, tone) {
        if (!state.elements?.feedback) return;
        state.elements.feedback.textContent = message || '';
        state.elements.feedback.dataset.tone = tone || 'info';
    }

    function setStepStatus(message) {
        if (!state.elements?.step) return;
        state.elements.step.textContent = message || '';
    }

    function renderBoard() {
        const current = getCurrentScenario();
        if (!current || !state.elements) return;

        const rows = root.triplesRadarCore.ROWS;
        const currentEvaluation = state.selectedCategory
            ? root.triplesRadarCore.evaluateSelection(current.correctCategory, state.selectedCategory)
            : null;
        const correctCategoryNormalized = root.triplesRadarCore.normalizeCategoryId(current.correctCategory);
        const correctRowId = root.triplesRadarCore.getRowIdByCategory(current.correctCategory);

        state.elements.statement.textContent = current.clientText || '';
        state.elements.focusHint.textContent = current.focusHint ? `רמז מיקוד: ${current.focusHint}` : '';
        state.elements.counter.textContent = `${state.index + 1}/${state.scenarios.length}`;
        state.elements.score.textContent = `${state.score}`;
        state.elements.solvedCount.textContent = `${state.solvedCount}`;

        state.elements.rows.innerHTML = rows.map((row) => {
            const rowMeta = ROW_META[row.id] || ROW_META.row1;
            const isCorrectRow = correctRowId === row.id;
            const isHintRow = !state.solved && state.rowHintUsed && isCorrectRow;
            const isSolvedRow = state.solved && isCorrectRow;
            const rowClass = [
                'triples-radar-row',
                rowMeta.colorClass,
                isHintRow ? 'is-hint' : '',
                isSolvedRow ? 'is-solved' : ''
            ].filter(Boolean).join(' ');

            // Display order is reversed for RTL training scan (e.g., Mind Reading on the right in Row 1).
            const displayCategories = [...row.categories].reverse();
            const cards = displayCategories.map((categoryId) => {
                const normalizedCategory = root.triplesRadarCore.normalizeCategoryId(categoryId);
                const isSelected = root.triplesRadarCore.normalizeCategoryId(state.selectedCategory) === normalizedCategory;
                const isCorrectCategory = correctCategoryNormalized === normalizedCategory;
                const shouldRevealCorrectCategory = !state.solved && state.categoryHintUsed && isCorrectCategory;

                const categoryClass = [
                    'triples-radar-cat-btn',
                    isSelected ? 'is-selected' : '',
                    state.solved && isCorrectCategory ? 'is-correct' : '',
                    shouldRevealCorrectCategory ? 'is-reveal' : '',
                    (!state.solved && isSelected && currentEvaluation?.status === 'same_row') ? 'is-close' : '',
                    (!state.solved && isSelected && currentEvaluation?.status === 'wrong_row') ? 'is-wrong' : ''
                ].filter(Boolean).join(' ');

                return `
                    <button
                        type="button"
                        class="${categoryClass}"
                        data-category-id="${escapeHtml(normalizedCategory)}"
                        ${state.solved ? 'disabled' : ''}>
                        <span class="cat-label">${escapeHtml(getCategoryLabelHe(normalizedCategory))}</span>
                    </button>
                `;
            }).join('');

            return `
                <article class="${rowClass}" data-row-id="${row.id}">
                    <div class="triples-radar-row-head">
                        <strong>${escapeHtml(rowMeta.heLabel)}</strong>
                    </div>
                    <div class="triples-radar-row-cats">
                        ${cards}
                    </div>
                </article>
            `;
        }).join('');
    }

    function updateHintControls() {
        if (!state.elements?.rowHintBtn) return;
        if (!state.elements?.catHintBtn) return;
        state.elements.rowHintBtn.disabled = state.solved || state.rowHintUsed;
        state.elements.catHintBtn.disabled = state.solved || state.categoryHintUsed;
    }

    function handleAutoHints(result) {
        if (state.solved) return;
        if (state.attemptsInScenario >= 2 && !state.rowHintUsed) {
            state.rowHintUsed = true;
            setFeedback('❌ עדיין לא מדויק. הדלקתי לך את השורה הנכונה כדי לחדד מיקוד.', 'warn');
        }
        if (state.attemptsInScenario >= 3 && result.status !== 'exact' && !state.categoryHintUsed) {
            state.categoryHintUsed = true;
            setFeedback('❌ ניסיון שלישי: הדלקתי גם את הקטגוריה המדויקת. עכשיו סמן אותה.', 'warn');
        }
    }

    function evaluatePick(categoryId) {
        if (state.solved) return;
        const current = getCurrentScenario();
        if (!current) return;

        state.selectedCategory = categoryId;
        state.attemptsInScenario += 1;

        const result = root.triplesRadarCore.evaluateSelection(current.correctCategory, categoryId);
        if (result.status === 'exact') {
            state.solved = true;
            state.solvedCount += 1;
            state.score += Math.max(1, 4 - Math.max(1, state.attemptsInScenario));
            saveProgress();
            setFeedback('✅ מדויק. פגעת בקטגוריה הנכונה בתוך השלשה.', 'success');
            setStepStatus('סגור/י סצנה: לחץ/י "הבא" כדי לעבור למשפט הבא.');
            if (typeof root.playUISound === 'function') root.playUISound('success');
        } else if (result.status === 'same_row') {
            setFeedback('🟨 קרוב מאוד. זו השלשה הנכונה, אבל לא האחות המדויקת.', 'warn');
            setStepStatus('עדיין בתוך אותה סצנה: בחר/י קטגוריה אחרת באותה שלשה.');
            if (typeof root.playUISound === 'function') root.playUISound('warning');
            handleAutoHints(result);
        } else if (result.status === 'wrong_row') {
            setFeedback('❌ לא בשורה הנכונה. נסה/י שלשה אחרת.', 'danger');
            setStepStatus('נסה/י שוב: חפש/י קודם שורה נכונה, אחר כך קטגוריה.');
            if (typeof root.playUISound === 'function') root.playUISound('error');
            handleAutoHints(result);
        } else {
            setFeedback('⚠️ לא הצלחתי לזהות את הבחירה. נסה/י שוב.', 'warn');
            setStepStatus('בחר/י קטגוריה מתוך אחת מהשלשות.');
        }

        updateHintControls();
        renderBoard();
    }

    function nextScenario() {
        if (!state.scenarios.length) return;
        state.index = (state.index + 1) % state.scenarios.length;
        state.attemptsInScenario = 0;
        state.rowHintUsed = false;
        state.categoryHintUsed = false;
        state.solved = false;
        state.selectedCategory = '';
        setFeedback('בחר/י קטגוריה אחת מתוך הטבלה.', 'info');
        setStepStatus('שלב 1: קרא/י את המשפט. שלב 2: בחר/י קטגוריה.');
        updateHintControls();
        renderBoard();
    }

    function restartRun() {
        state.index = 0;
        state.attemptsInScenario = 0;
        state.rowHintUsed = false;
        state.categoryHintUsed = false;
        state.solved = false;
        state.selectedCategory = '';
        setFeedback('איפוס ריצה: חזרנו לסצנה הראשונה.', 'info');
        setStepStatus('שלב 1: קרא/י את המשפט. שלב 2: בחר/י קטגוריה.');
        updateHintControls();
        renderBoard();
    }

    function revealRowHint() {
        if (state.solved || state.rowHintUsed) return;
        state.rowHintUsed = true;
        setFeedback('רמז: סימנתי לך את השלשה הנכונה.', 'info');
        updateHintControls();
        renderBoard();
    }

    function revealCategoryHint() {
        if (state.solved || state.categoryHintUsed) return;
        state.categoryHintUsed = true;
        setFeedback('רמז מדויק: סימנתי את הקטגוריה הנכונה.', 'info');
        updateHintControls();
        renderBoard();
    }

    function bindEvents() {
        const rootEl = state.elements?.root;
        if (!rootEl || rootEl.dataset.boundTriplesRadar === 'true') return;
        rootEl.dataset.boundTriplesRadar = 'true';

        rootEl.addEventListener('click', (event) => {
            const categoryBtn = event.target.closest('[data-category-id]');
            if (categoryBtn) {
                const categoryId = categoryBtn.getAttribute('data-category-id') || '';
                evaluatePick(categoryId);
                return;
            }

            const actionBtn = event.target.closest('[data-tr-action]');
            if (!actionBtn) return;
            const action = actionBtn.getAttribute('data-tr-action');
            if (action === 'next') nextScenario();
            if (action === 'restart') restartRun();
            if (action === 'hint-row') revealRowHint();
            if (action === 'hint-category') revealCategoryHint();
        });
    }

    async function loadData() {
        const response = await fetch('data/triples-radar-scenarios.json');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const raw = await response.json();
        const scenarios = Array.isArray(raw.scenarios) ? raw.scenarios : [];
        const categories = Array.isArray(raw.categories) ? raw.categories : [];
        return { scenarios, categories };
    }

    function setupElements() {
        state.elements = {
            root: document.getElementById('triples-radar-root'),
            statement: document.getElementById('triples-radar-statement'),
            focusHint: document.getElementById('triples-radar-focus-hint'),
            rows: document.getElementById('triples-radar-rows'),
            feedback: document.getElementById('triples-radar-feedback'),
            counter: document.getElementById('triples-radar-counter'),
            score: document.getElementById('triples-radar-score'),
            solvedCount: document.getElementById('triples-radar-solved-count'),
            step: document.getElementById('triples-radar-step'),
            rowHintBtn: document.querySelector('[data-tr-action="hint-row"]'),
            catHintBtn: document.querySelector('[data-tr-action="hint-category"]')
        };
    }

    async function setupTriplesRadarModule() {
        setupElements();
        if (!state.elements?.root) return;
        if (!root.triplesRadarCore) {
            state.elements.root.innerHTML = '<p class="triples-radar-error">שגיאה: מנוע Triples Radar לא נטען.</p>';
            return;
        }

        if (!state.data) {
            try {
                state.data = await loadData();
                state.scenarios = [...state.data.scenarios];
            } catch (error) {
                state.elements.root.innerHTML = `<p class="triples-radar-error">שגיאה בטעינת הסצנות: ${escapeHtml(error.message || 'לא ידוע')}</p>`;
                return;
            }
        }

        const saved = loadProgress();
        state.score = Number(saved.score) || 0;
        state.solvedCount = Number(saved.solvedCount) || 0;
        state.index = 0;
        state.attemptsInScenario = 0;
        state.rowHintUsed = false;
        state.categoryHintUsed = false;
        state.solved = false;
        state.selectedCategory = '';

        bindEvents();
        setFeedback('בחר/י קטגוריה אחת מתוך הטבלה.', 'info');
        setStepStatus('שלב 1: קרא/י את המשפט. שלב 2: בחר/י קטגוריה.');
        updateHintControls();
        renderBoard();
    }

    return Object.freeze({
        setupTriplesRadarModule
    });
});
