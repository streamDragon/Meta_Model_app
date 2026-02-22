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
        uiMessage: ''
    };

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
        state.session = core.createSession({
            baseStoryText: String(baseStoryText || '').trim(),
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
        state.uiMessage = 'AFAQ Report הופק מהסשן הנוכחי.';
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
                lastReport: state.lastReport
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
        createFreshSession(DEMO_STORY);
    }

    function setBaseStoryFromTextarea() {
        const input = document.getElementById('prm-base-input');
        if (!input) return;
        const value = String(input.value || '').trim();
        createFreshSession(value || DEMO_STORY);
    }

    function loadDemoStory() {
        const input = document.getElementById('prm-base-input');
        if (input) input.value = DEMO_STORY;
        createFreshSession(DEMO_STORY);
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
            return `
                <button
                    type="button"
                    class="prm-cat-btn"
                    data-action="pick-category"
                    data-category-id="${escapeHtml(category.categoryId)}"
                    ${disabled ? 'disabled' : ''}
                    title="${escapeHtml(category.definition || '')}"
                >
                    <span class="prm-cat-name">${escapeHtml(category.labelHe)}</span>
                    <span class="prm-cat-meta">${escapeHtml((category.family || '').toUpperCase())} · ${count}</span>
                </button>
            `;
        }).join('');
    }

    function renderPendingQa() {
        if (!state.pendingQA) {
            return `
                <div class="prm-card prm-qa-panel is-empty">
                    <h3>Question Console</h3>
                    <p>בחר/י קטגוריה אחרי סימון כדי לייצר שאלה + תשובת המשך.</p>
                </div>
            `;
        }
        return `
            <div class="prm-card prm-qa-panel">
                <h3>Question Console</h3>
                <p class="prm-kicker">קטגוריה: ${escapeHtml(state.pendingQA.categoryLabelHe)}</p>
                <div class="prm-qa-block">
                    <div><strong>Q:</strong> ${escapeHtml(state.pendingQA.questionText)}</div>
                    <div><strong>A:</strong> ${escapeHtml(state.pendingQA.answerText)}</div>
                    <div><strong>New Sentence:</strong> ${escapeHtml(state.pendingQA.generatedSentence)}</div>
                </div>
                <div class="prm-nav-actions">
                    <button type="button" class="prm-big-btn secondary" data-action="back-base">חזור לבסיס</button>
                    <button type="button" class="prm-big-btn primary" data-action="continue-answer">המשך מהתשובה ➜</button>
                </div>
            </div>
        `;
    }

    function renderPathLog() {
        const nodes = state.session && Array.isArray(state.session.nodes) ? state.session.nodes : [];
        if (!nodes.length) {
            return '<p class="prm-empty">עדיין אין צמתים. התחילו סימון + פריזמה.</p>';
        }
        const items = nodes.slice().reverse().slice(0, 14).map((node, idx) => `
            <li class="prm-log-item">
                <div class="prm-log-head">
                    <span>#${nodes.length - idx}</span>
                    <span>${escapeHtml(node.categoryLabelHe)}</span>
                    <span class="prm-tagline">${escapeHtml((node.tags || []).join(', '))}</span>
                </div>
                <div class="prm-log-line"><strong>Selection:</strong> ${escapeHtml(node.selection && node.selection.text)}</div>
                <div class="prm-log-line"><strong>A:</strong> ${escapeHtml(node.answerText)}</div>
            </li>
        `).join('');
        return `<ol class="prm-log-list">${items}</ol>`;
    }

    function renderReportPanel() {
        if (!state.lastReport) {
            return `
                <div class="prm-card prm-report-panel is-empty">
                    <h3>AFAQ Report</h3>
                    <p>הדוח יופק כאן אחרי לפחות ${core.MIN_REPORT_NODES} צמתים.</p>
                </div>
            `;
        }
        const r = state.lastReport;
        const renderList = (items) => {
            if (!Array.isArray(items) || !items.length) return '<li>(none yet)</li>';
            return items.map(item => `<li>${escapeHtml(item)}</li>`).join('');
        };

        return `
            <div class="prm-card prm-report-panel">
                <h3>AFAQ Report</h3>
                <div class="prm-report-actions">
                    <button type="button" class="prm-small-btn" data-action="copy-report-json">Copy JSON</button>
                    <button type="button" class="prm-small-btn" data-action="copy-report-md">Copy Markdown</button>
                </div>
                <div class="prm-report-grid">
                    <section><h4>Causal Chains</h4><ul>${renderList(r.sections.causalChains)}</ul></section>
                    <section><h4>Meaning Chains</h4><ul>${renderList(r.sections.meaningChains)}</ul></section>
                    <section><h4>Evidence / Criteria</h4><ul>${renderList(r.sections.evidenceCriteria)}</ul></section>
                    <section><h4>Conditions / Scope</h4><ul>${renderList(r.sections.conditionsScope)}</ul></section>
                    <section><h4>Modal Constraints</h4><ul>${renderList(r.sections.modalConstraints)}</ul></section>
                    <section><h4>Generalizations</h4><ul>${renderList(r.sections.generalizations)}</ul></section>
                </div>
                <section>
                    <h4>Insights</h4>
                    <ul>${renderList(r.insights)}</ul>
                </section>
                <section>
                    <h4>Next Step</h4>
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
                <span class="prm-chip">Steps: <strong>${stats.totalNodes}</strong></span>
                <span class="prm-chip">Depth: <strong>${stats.maxDepth}</strong></span>
                <span class="prm-chip">Branches: <strong>${stats.branchCount}</strong></span>
                <span class="prm-chip">Avg: <strong>${stats.avgDepth.toFixed(1)}</strong></span>
                <button type="button" class="prm-small-btn ${reportEnabled ? '' : 'is-disabled'}" data-action="generate-report" ${reportEnabled ? '' : 'disabled'}>
                    AFAQ Report
                </button>
            </div>
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

                <section class="prm-card prm-base-config">
                    <label for="prm-base-input"><strong>Base Story</strong> (אפשר לערוך ואז ללחוץ "סשן חדש")</label>
                    <textarea id="prm-base-input" rows="4" spellcheck="false">${escapeHtml(state.session ? state.session.baseStoryText : DEMO_STORY)}</textarea>
                    <div class="prm-inline-actions">
                        <button type="button" class="prm-small-btn" data-action="apply-base">סשן חדש מהטקסט</button>
                        <button type="button" class="prm-small-btn" data-action="back-base">חזור לבסיס</button>
                        <button type="button" class="prm-small-btn" data-action="generate-report" ${reportEnabled ? '' : 'disabled'}>AFAQ Report</button>
                    </div>
                    ${renderStatsChips()}
                    <p class="prm-message" aria-live="polite">${escapeHtml(state.uiMessage || '')}</p>
                </section>

                <section class="prm-layout">
                    <div class="prm-column">
                        <section class="prm-card">
                            <h2>Base / Current Text</h2>
                            <p class="prm-kicker">Context: ${state.currentContextType === 'continued' ? 'Continue From Answer' : 'Base Story'}</p>
                            <div class="prm-context-text">${renderTokenizedContext()}</div>
                            <div class="prm-selection-box ${state.selection ? 'has-selection' : ''}">
                                <strong>Selection:</strong>
                                <span>${escapeHtml(selectedText || 'No selection yet')}</span>
                                ${state.selection ? `<small> [${state.selection.start}-${state.selection.end}]</small>` : ''}
                            </div>
                        </section>

                        <section class="prm-card">
                            <h2>Breen Categories (15)</h2>
                            <p class="prm-kicker">מבוסס <code>data/metaModelPatterns.he.json</code></p>
                            <div class="prm-categories-grid">
                                ${renderCategoryButtons()}
                            </div>
                        </section>

                        ${renderPendingQa()}
                    </div>

                    <div class="prm-column">
                        <section class="prm-card">
                            <h2>Research Path Log</h2>
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
        if (action === 'apply-base') return setBaseStoryFromTextarea();
        if (action === 'reset-session') return createFreshSession((document.getElementById('prm-base-input') || {}).value || state.session.baseStoryText || DEMO_STORY);
        if (action === 'clear-session') return clearSavedSession();
    }

    async function boot() {
        appEl.addEventListener('click', onAppClick);
        render();
        try {
            const data = await fetchJson('data/metaModelPatterns.he.json');
            const categories = (Array.isArray(data && data.patterns) ? data.patterns : [])
                .map((pattern, idx) => core.normalizeCategoryFromPattern(pattern, idx))
                .filter(Boolean)
                .slice(0, 15);
            state.categories = categories;
            state.categoriesById = categories.reduce((acc, category) => {
                acc[category.categoryId] = category;
                return acc;
            }, {});
            state.loaded = true;

            if (!restoreState()) {
                createFreshSession(DEMO_STORY);
            } else {
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
