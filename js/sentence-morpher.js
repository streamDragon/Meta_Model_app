(function attachSentenceMorpherModule(rootFactory) {
    const root = typeof globalThis !== 'undefined'
        ? globalThis
        : (typeof window !== 'undefined' ? window : this);
    const api = rootFactory(root);
    root.SentenceMorpher = api.SentenceMorpher;
    root.createSentenceMorpher = api.createSentenceMorpher;
    root.setupSentenceMorpherDemo = api.setupSentenceMorpherDemo;
})(function createSentenceMorpherModule(root) {
    const STORAGE_KEY = 'sentence_morpher_demo_state_v1';
    const MAX_HISTORY = 80;

    function safeText(value) {
        if (value === null || value === undefined) return '';
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function clone(value) {
        if (value === null || value === undefined) return value;
        return JSON.parse(JSON.stringify(value));
    }

    function hasAnySelection(selectedChips) {
        if (!selectedChips || typeof selectedChips !== 'object') return false;
        return Object.values(selectedChips).some((list) => Array.isArray(list) && list.length > 0);
    }

    function normalizeSelectedState(initialSelectedChips, axes, core) {
        const defaultState = core.createInitialSelectedState(axes);
        if (!initialSelectedChips || typeof initialSelectedChips !== 'object') return defaultState;
        const normalized = core.cloneSelectedChips(initialSelectedChips);
        Object.keys(defaultState).forEach((axisId) => {
            if (!Array.isArray(normalized[axisId])) normalized[axisId] = [];
        });
        return normalized;
    }

    class SentenceMorpher {
        constructor(options) {
            const core = root.sentenceMorpherCore;
            if (!core) throw new Error('sentenceMorpherCore is required');

            const settings = options && typeof options === 'object' ? options : {};
            if (!(settings.container instanceof HTMLElement)) {
                throw new Error('SentenceMorpher requires a valid container element');
            }

            this.core = core;
            this.container = settings.container;
            this.baseSentence = String(settings.baseSentence || '').trim();
            this.axes = Array.isArray(settings.axes) ? settings.axes : [];
            this.autoGrammarRules = settings.autoGrammarRules || null;
            this.onChange = typeof settings.onChange === 'function' ? settings.onChange : null;
            this.history = [];
            this.selectedChips = normalizeSelectedState(settings.initialSelectedChips, this.axes, this.core);
            this.lastCompose = null;

            this.renderShell();
            this.bindEvents();
            this.composeAndRender(true);
        }

        renderShell() {
            const axisRowsHtml = this.axes.map((axis) => {
                const axisId = safeText(axis.id);
                const axisLabel = safeText(axis.label || axis.id);
                const chipsHtml = (Array.isArray(axis.chips) ? axis.chips : []).map((chip) => {
                    const chipId = safeText(chip.id);
                    const chipText = safeText(chip.text);
                    return `
                        <button
                            type="button"
                            class="sentence-chip"
                            data-axis-id="${axisId}"
                            data-chip-id="${chipId}">
                            ${chipText}
                        </button>
                    `;
                }).join('');

                return `
                    <div class="sentence-axis-row" data-axis-row="${axisId}">
                        <div class="sentence-axis-label">${axisLabel}</div>
                        <div class="sentence-axis-chips" role="group" aria-label="${axisLabel}">
                            ${chipsHtml}
                        </div>
                    </div>
                `;
            }).join('');

            this.container.innerHTML = `
                <div class="sentence-morpher-card">
                    <div class="sentence-morpher-title-row">
                        <h3>משפט גדול</h3>
                        <p>לחץ/י על צ׳יפים כדי לחשוף את הכמתים הנסתרים בתוך המשפט.</p>
                    </div>

                    <div class="sentence-morpher-sentence-wrap">
                        <p class="sentence-morpher-sentence" id="sentence-morpher-live" aria-live="polite"></p>
                        <p class="sentence-morpher-hint hidden" id="sentence-morpher-hint"></p>
                    </div>

                    <div class="sentence-morpher-toolbar">
                        <button type="button" class="btn btn-secondary sentence-mini-btn" data-action="undo">חזרה צעד</button>
                        <button type="button" class="btn btn-secondary sentence-mini-btn" data-action="reset">איפוס</button>
                        <span class="sentence-morpher-progress" id="sentence-morpher-progress">0/0</span>
                    </div>

                    <div class="sentence-axes" id="sentence-morpher-axes">
                        ${axisRowsHtml}
                    </div>
                </div>
            `;

            this.elements = {
                sentence: this.container.querySelector('#sentence-morpher-live'),
                hint: this.container.querySelector('#sentence-morpher-hint'),
                progress: this.container.querySelector('#sentence-morpher-progress'),
                axesRoot: this.container.querySelector('#sentence-morpher-axes'),
                undoBtn: this.container.querySelector('[data-action="undo"]'),
                resetBtn: this.container.querySelector('[data-action="reset"]')
            };
        }

        bindEvents() {
            this.boundClick = (event) => {
                const chipBtn = event.target.closest('.sentence-chip');
                if (chipBtn) {
                    const axisId = chipBtn.getAttribute('data-axis-id') || '';
                    const chipId = chipBtn.getAttribute('data-chip-id') || '';
                    this.toggleChip(axisId, chipId);
                    return;
                }

                const actionBtn = event.target.closest('[data-action]');
                if (!actionBtn) return;
                const action = actionBtn.getAttribute('data-action');
                if (action === 'undo') this.undo();
                if (action === 'reset') this.reset();
            };

            this.container.addEventListener('click', this.boundClick);
        }

        pushHistory() {
            this.history.push(clone(this.selectedChips));
            if (this.history.length > MAX_HISTORY) {
                this.history = this.history.slice(this.history.length - MAX_HISTORY);
            }
        }

        toggleChip(axisId, chipId) {
            this.pushHistory();
            this.selectedChips = this.core.toggleChipSelection(this.selectedChips, this.axes, axisId, chipId);
            this.composeAndRender();
        }

        undo() {
            if (!this.history.length) return;
            this.selectedChips = this.history.pop();
            this.composeAndRender();
        }

        reset() {
            if (!hasAnySelection(this.selectedChips)) return;
            this.pushHistory();
            this.selectedChips = this.core.createInitialSelectedState(this.axes);
            this.composeAndRender();
        }

        renderSentence(tokens) {
            if (!this.elements.sentence) return;
            const html = tokens.map((token) => {
                const classes = ['sentence-morpher-token'];
                if (token.highlighted) classes.push('sentence-morpher-token-highlight');
                if (token.kind === 'implied') classes.push('sentence-morpher-token-implied');
                return `<span class="${classes.join(' ')}">${safeText(token.text)}</span>`;
            }).join(' ');

            this.elements.sentence.classList.remove('sentence-morpher-sentence-animate');
            this.elements.sentence.innerHTML = html;
            void this.elements.sentence.offsetWidth;
            this.elements.sentence.classList.add('sentence-morpher-sentence-animate');
        }

        renderHint(hints) {
            const hint = Array.isArray(hints) && hints.length ? hints[0] : '';
            if (!this.elements.hint) return;
            if (!hint) {
                this.elements.hint.textContent = '';
                this.elements.hint.classList.add('hidden');
                return;
            }
            this.elements.hint.textContent = hint;
            this.elements.hint.classList.remove('hidden');
        }

        renderSelectedChips() {
            const selectedByAxis = this.selectedChips || {};
            const chipButtons = this.container.querySelectorAll('.sentence-chip');
            chipButtons.forEach((button) => {
                const axisId = button.getAttribute('data-axis-id') || '';
                const chipId = button.getAttribute('data-chip-id') || '';
                const selected = Array.isArray(selectedByAxis[axisId]) && selectedByAxis[axisId].includes(chipId);
                button.classList.toggle('is-selected', selected);
            });
        }

        renderToolbarState() {
            const selectedCount = Object.values(this.selectedChips || {}).reduce((sum, list) => {
                return sum + (Array.isArray(list) ? list.length : 0);
            }, 0);
            const totalAxes = this.axes.length;

            if (this.elements.progress) {
                this.elements.progress.textContent = `${selectedCount}/${totalAxes} צירים פעילים`;
            }
            if (this.elements.undoBtn) {
                this.elements.undoBtn.disabled = this.history.length === 0;
            }
            if (this.elements.resetBtn) {
                this.elements.resetBtn.disabled = selectedCount === 0;
            }
        }

        composeAndRender(skipHistory) {
            this.lastCompose = this.core.composeSentence({
                baseSentence: this.baseSentence,
                axes: this.axes,
                selectedChips: this.selectedChips,
                autoGrammarRules: this.autoGrammarRules
            });

            this.renderSentence(this.lastCompose.tokens);
            this.renderHint(this.lastCompose.hints);
            this.renderSelectedChips();
            this.renderToolbarState();

            const snapshot = this.getState();
            this.container.dispatchEvent(new CustomEvent('sentence-morpher:change', { detail: snapshot }));
            if (this.onChange) this.onChange(snapshot);

            if (!skipHistory && typeof root.playUISound === 'function') {
                root.playUISound('click');
            }
        }

        getState() {
            return {
                currentComposedSentence: this.lastCompose ? this.lastCompose.plainSentence : this.baseSentence,
                selectedChips: clone(this.selectedChips),
                hints: this.lastCompose ? [...this.lastCompose.hints] : [],
                tokens: this.lastCompose ? clone(this.lastCompose.tokens) : []
            };
        }

        destroy() {
            if (this.boundClick) this.container.removeEventListener('click', this.boundClick);
            this.container.innerHTML = '';
            this.history = [];
            this.lastCompose = null;
        }
    }

    function createSentenceMorpher(options) {
        return new SentenceMorpher(options);
    }

    async function loadDemoExercise() {
        const response = await fetch('data/sentence-morpher-exercises.json');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        const exercise = Array.isArray(data.exercises) ? data.exercises[0] : null;
        if (!exercise) throw new Error('No sentence morpher demo exercise found');
        return exercise;
    }

    function loadStoredSelection() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            return parsed && typeof parsed === 'object' ? parsed.selectedChips || null : null;
        } catch (error) {
            return null;
        }
    }

    function saveStoredSelection(selectedChips) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ selectedChips }));
        } catch (error) {
            // Ignore storage errors (private mode/quota).
        }
    }

    function setDemoFeedback(message, tone) {
        const feedback = document.getElementById('sentence-morpher-cta-feedback');
        if (!feedback) return;
        feedback.textContent = message || '';
        feedback.dataset.tone = tone || 'info';
        if (!message) {
            feedback.classList.add('hidden');
            return;
        }
        feedback.classList.remove('hidden');
    }

    async function setupSentenceMorpherDemo() {
        const rootEl = document.getElementById('sentence-morpher-demo-root');
        if (!rootEl) return;
        if (rootEl.dataset.sentenceMorpherBound === 'true') return;
        rootEl.dataset.sentenceMorpherBound = 'true';

        if (!root.sentenceMorpherCore) {
            rootEl.innerHTML = '<p class="sentence-morpher-error">שגיאה: מנוע SentenceMorpher לא נטען.</p>';
            return;
        }

        try {
            const exercise = await loadDemoExercise();
            const storedSelection = loadStoredSelection();
            const morpher = createSentenceMorpher({
                container: rootEl,
                baseSentence: exercise.baseSentence,
                axes: Array.isArray(exercise.axes) ? exercise.axes : [],
                initialSelectedChips: storedSelection,
                onChange: (snapshot) => {
                    saveStoredSelection(snapshot.selectedChips);
                }
            });

            root.sentenceMorpherDemo = morpher;

            const ctaBtn = document.getElementById('sentence-morpher-cta-btn');
            if (ctaBtn && ctaBtn.dataset.bound !== 'true') {
                ctaBtn.dataset.bound = 'true';
                ctaBtn.addEventListener('click', () => {
                    const state = morpher.getState();
                    setDemoFeedback(`יפה. הניסוח עכשיו: "${state.currentComposedSentence}"`, 'success');
                    if (typeof root.playUISound === 'function') root.playUISound('success');
                });
            }
        } catch (error) {
            rootEl.innerHTML = `<p class="sentence-morpher-error">שגיאה בטעינת תרגיל: ${safeText(error.message || 'לא ידוע')}</p>`;
        }
    }

    return Object.freeze({
        SentenceMorpher,
        createSentenceMorpher,
        setupSentenceMorpherDemo
    });
});
