(function attachSentenceMapModule(global) {
    if (!global || typeof global.setupSentenceMap === 'function') return;

    const STORAGE_KEY = 'meta_sentence_map_state_v1';
    const STEP_ORDER = Object.freeze([
        Object.freeze({ id: 'intro', label: 'פתיחה' }),
        Object.freeze({ id: 'sentence', label: 'המשפט' }),
        Object.freeze({ id: 'layers', label: 'כיוונים' }),
        Object.freeze({ id: 'focus', label: 'מוקד' }),
        Object.freeze({ id: 'intervention', label: 'מה לשאול' }),
        Object.freeze({ id: 'reformulation', label: 'ניסוח חדש' })
    ]);
    const LAYER_ORDER = Object.freeze(['outside', 'inside', 'relational']);
    const FOCUS_OPTIONS = Object.freeze([
        Object.freeze({ id: 'outside', label: 'במה שקרה בחוץ' }),
        Object.freeze({ id: 'inside', label: 'במה שנהיה בפנים' }),
        Object.freeze({ id: 'relational', label: 'במה שהמשפט מבקש בקשר' })
    ]);
    const MODE_COPY = Object.freeze({
        learn: Object.freeze({
            label: 'לימוד',
            hint: 'יותר הסברים, יותר הכוונה, פחות עומס.'
        }),
        practice: Object.freeze({
            label: 'תרגול',
            hint: 'פחות פיגומים, יותר ניווט עצמי בתוך המפה.'
        })
    });
    const BRANCH_COPY = Object.freeze({
        sentence: Object.freeze({
            eyebrow: 'המשפט שנאמר',
            description: 'מתחילים ממנו כמו שהוא, בלי לתקן ובלי להתווכח.'
        }),
        summary: Object.freeze({
            eyebrow: 'איך קוראים את המפה',
            text: 'אותו משפט יכול לדבר בבת אחת גם על מה שקרה בחוץ וגם על מה שנהיה בפנים. לפעמים הוא גם מבקש שמשהו יקרה בקשר. בשלב הזה לא בוחרים צד, רק ממפים.'
        }),
        outside: Object.freeze({
            eyebrow: 'החוצה',
            description: 'מה אפשר היה לראות או לשמוע בעולם החיצוני.'
        }),
        inside: Object.freeze({
            eyebrow: 'פנימה',
            description: 'מה נהיה בפנים: רגש, דימוי, משמעות או כיווץ.'
        }),
        relational: Object.freeze({
            eyebrow: 'ביניכם',
            description: 'מה המשפט מבקש שיקרה בשיחה או בקשר.'
        })
    });
    const LAYER_COPY = Object.freeze({
        outside: Object.freeze({
            title: 'מה קרה בפועל?',
            shortQuestion: 'אם היתה מצלמה - מה היא היתה רואה?',
            meaning: 'מה אפשר היה לראות או לשמוע בלי לפרש',
            eyebrow: 'כיוון חיצוני',
            tone: 'outside'
        }),
        inside: Object.freeze({
            title: 'מה הסיפור הפנימי?',
            shortQuestion: 'מה אתה רואה או מרגיש בפנים כשאתה אומר את זה?',
            meaning: 'מה נהיה בפנים: רגש, דימוי, משמעות או כיווץ',
            eyebrow: 'כיוון פנימי',
            tone: 'inside'
        }),
        relational: Object.freeze({
            title: 'מה המשפט מבקש שיקרה ביניכם?',
            shortQuestion: 'מה הכי חשוב שיקרה כאן?',
            meaning: 'מה המשפט מבקש מהקשר או מהשיחה',
            eyebrow: 'כיוון יחסי',
            tone: 'relational'
        })
    });

    function clampStep(value) {
        const raw = Number(value);
        if (!Number.isFinite(raw)) return 0;
        return Math.max(0, Math.min(STEP_ORDER.length - 1, Math.floor(raw)));
    }

    function setupSentenceMap() {
        const root = document.getElementById('sentence-map-app');
        if (!root || root.dataset.sentenceMapBound === 'true') return;
        root.dataset.sentenceMapBound = 'true';

        const cases = Array.isArray(global.MetaSentenceMapCases) ? global.MetaSentenceMapCases.filter(Boolean) : [];
        if (!cases.length) {
            root.innerHTML = '<div class="sentence-map-empty">מפת המשפט לא זמינה כרגע. נסו לרענן את המסך.</div>';
            return;
        }

        const caseIds = cases.map((item) => String(item.id || '').trim()).filter(Boolean);

        const escapeHtml = (value) => {
            if (typeof global.escapeHtml === 'function') return global.escapeHtml(value);
            return String(value || '')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        };

        const caseById = (caseId) => cases.find((item) => item.id === String(caseId || '').trim()) || cases[0];
        const hasCaseId = (caseId) => caseIds.includes(String(caseId || '').trim());
        const hasLayerId = (layerId) => Object.prototype.hasOwnProperty.call(LAYER_COPY, String(layerId || '').trim());
        const hasFocusId = (focusId) => FOCUS_OPTIONS.some((item) => item.id === String(focusId || '').trim());

        function createCaseUiState() {
            return {
                stepIndex: 0,
                maxVisitedStep: 0,
                openLayer: 'inside',
                selectedFocus: '',
                showExampleParagraph: false
            };
        }

        function sanitizeCaseUi(raw) {
            const safe = raw && typeof raw === 'object' ? raw : {};
            const stepIndex = clampStep(safe.stepIndex);
            const maxVisitedStep = Math.max(stepIndex, clampStep(safe.maxVisitedStep));
            return {
                stepIndex,
                maxVisitedStep,
                openLayer: hasLayerId(safe.openLayer) ? String(safe.openLayer).trim() : 'inside',
                selectedFocus: hasFocusId(safe.selectedFocus) ? String(safe.selectedFocus).trim() : '',
                showExampleParagraph: safe.showExampleParagraph === true
            };
        }

        function sanitizeState(raw) {
            const safe = raw && typeof raw === 'object' ? raw : {};
            const selectedCaseId = hasCaseId(safe.selectedCaseId) ? String(safe.selectedCaseId).trim() : caseIds[0];
            const mode = safe.mode === 'practice' ? 'practice' : 'learn';
            const caseUiById = {};
            caseIds.forEach((caseId) => {
                caseUiById[caseId] = sanitizeCaseUi(safe.caseUiById?.[caseId]);
            });
            return {
                mode,
                selectedCaseId,
                caseUiById
            };
        }

        let state;
        try {
            state = sanitizeState(JSON.parse(global.localStorage.getItem(STORAGE_KEY) || '{}'));
        } catch (_error) {
            state = sanitizeState({});
        }

        function persistState() {
            try {
                global.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
            } catch (_error) {
                // ignore persistence failures
            }
        }

        function getCaseUi(caseId = state.selectedCaseId) {
            const safeCaseId = hasCaseId(caseId) ? String(caseId).trim() : caseIds[0];
            if (!state.caseUiById[safeCaseId]) {
                state.caseUiById[safeCaseId] = createCaseUiState();
            }
            return state.caseUiById[safeCaseId];
        }

        function getCurrentCase() {
            return caseById(state.selectedCaseId);
        }

        function getCurrentCaseUi() {
            return getCaseUi(state.selectedCaseId);
        }

        function ensureStepUnlocked(caseUi, targetStepIndex) {
            if (!caseUi) return;
            const target = clampStep(targetStepIndex);
            if (target > caseUi.maxVisitedStep) caseUi.maxVisitedStep = target;
        }

        function getFocusLabel(focusId) {
            return FOCUS_OPTIONS.find((item) => item.id === focusId)?.label || '';
        }

        function getProgressLabel(caseUi) {
            const currentStep = STEP_ORDER[caseUi.stepIndex] || STEP_ORDER[0];
            return `${caseUi.stepIndex + 1} / ${STEP_ORDER.length} · ${currentStep.label}`;
        }

        function canAdvance(caseUi) {
            if (caseUi.stepIndex === 3 && !caseUi.selectedFocus) return false;
            return caseUi.stepIndex < STEP_ORDER.length - 1;
        }

        function setMode(mode) {
            state.mode = mode === 'practice' ? 'practice' : 'learn';
            render();
        }

        function setCase(caseId) {
            if (!hasCaseId(caseId)) return;
            state.selectedCaseId = String(caseId).trim();
            render();
        }

        function setStep(stepIndex) {
            const caseUi = getCurrentCaseUi();
            const nextStep = clampStep(stepIndex);
            if (nextStep > caseUi.maxVisitedStep) return;
            if (nextStep === 4 && !caseUi.selectedFocus) return;
            caseUi.stepIndex = nextStep;
            render();
        }

        function goNext() {
            const caseUi = getCurrentCaseUi();
            if (!canAdvance(caseUi)) return;
            const nextStep = clampStep(caseUi.stepIndex + 1);
            ensureStepUnlocked(caseUi, nextStep);
            caseUi.stepIndex = nextStep;
            render();
        }

        function goBack() {
            const caseUi = getCurrentCaseUi();
            caseUi.stepIndex = clampStep(caseUi.stepIndex - 1);
            render();
        }

        function startMapping() {
            const caseUi = getCurrentCaseUi();
            ensureStepUnlocked(caseUi, 1);
            caseUi.stepIndex = 1;
            render();
        }

        function toggleLayer(layerId) {
            if (!hasLayerId(layerId)) return;
            const caseUi = getCurrentCaseUi();
            caseUi.openLayer = caseUi.openLayer === layerId ? '' : layerId;
            render();
        }

        function selectFocus(focusId) {
            if (!hasFocusId(focusId)) return;
            const caseUi = getCurrentCaseUi();
            caseUi.selectedFocus = String(focusId).trim();
            ensureStepUnlocked(caseUi, 4);
            render();
        }

        function toggleExampleParagraph() {
            const caseUi = getCurrentCaseUi();
            caseUi.showExampleParagraph = !caseUi.showExampleParagraph;
            render();
        }

        function renderModeToggle() {
            return `
                <section class="sentence-map-mode-toggle" aria-label="מצב שימוש">
                    <div class="sentence-map-mode-toggle__buttons">
                        ${Object.entries(MODE_COPY).map(([modeId, modeCopy]) => `
                            <button
                                type="button"
                                class="sentence-map-segment${state.mode === modeId ? ' is-active' : ''}"
                                data-action="set-mode"
                                data-mode="${escapeHtml(modeId)}"
                                aria-pressed="${state.mode === modeId ? 'true' : 'false'}"
                            >
                                ${escapeHtml(modeCopy.label)}
                            </button>
                        `).join('')}
                    </div>
                    <p class="sentence-map-mode-toggle__hint">${escapeHtml(MODE_COPY[state.mode].hint)}</p>
                </section>
            `;
        }

        function renderCaseSelector() {
            const currentCase = getCurrentCase();
            return `
                <section class="sentence-map-case-selector" aria-label="בחירת מקרה">
                    <div class="sentence-map-section-heading">
                        <span>מקרים לתרגול</span>
                        <strong>${escapeHtml(currentCase.title)}</strong>
                    </div>
                    <div class="sentence-map-case-grid">
                        ${cases.map((item) => {
                            const active = item.id === currentCase.id;
                            return `
                                <button
                                    type="button"
                                    class="sentence-map-case-card${active ? ' is-active' : ''}"
                                    data-action="select-case"
                                    data-case="${escapeHtml(item.id)}"
                                    aria-pressed="${active ? 'true' : 'false'}"
                                >
                                    <span class="sentence-map-case-card__tag">${escapeHtml(item.title)}</span>
                                    <strong>${escapeHtml(item.sentence)}</strong>
                                </button>
                            `;
                        }).join('')}
                    </div>
                </section>
            `;
        }

        function renderStepper(caseUi) {
            return `
                <nav class="sentence-map-stepper" aria-label="שלבי המודול">
                    ${STEP_ORDER.map((step, index) => {
                        const active = index === caseUi.stepIndex;
                        const done = index < caseUi.stepIndex;
                        const unlocked = index <= caseUi.maxVisitedStep;
                        return `
                            <button
                                type="button"
                                class="sentence-map-stepper__item${active ? ' is-active' : ''}${done ? ' is-done' : ''}"
                                data-action="go-step"
                                data-step="${index}"
                                ${unlocked ? '' : 'disabled'}
                                aria-current="${active ? 'step' : 'false'}"
                            >
                                <span class="sentence-map-stepper__count">${index + 1}</span>
                                <span class="sentence-map-stepper__label">${escapeHtml(step.label)}</span>
                            </button>
                        `;
                    }).join('')}
                </nav>
            `;
        }

        function renderSentenceBubble(sentence) {
            return `
                <article class="sentence-map-sentence-bubble" aria-label="משפט לתרגול">
                    <span class="sentence-map-sentence-bubble__mark">"</span>
                    <p>${escapeHtml(sentence)}</p>
                    <span class="sentence-map-sentence-bubble__mark sentence-map-sentence-bubble__mark--end">"</span>
                </article>
            `;
        }

        function renderLayerPreviewCard(layerId, caseData, { interactive = false, openLayer = '', showSamples = false } = {}) {
            const copy = LAYER_COPY[layerId];
            const layer = caseData.layers?.[layerId] || {};
            const tone = copy.tone || 'outside';
            const isOpen = interactive && openLayer === layerId;
            const body = `
                <div class="sentence-map-layer-card__body">
                    <p class="sentence-map-layer-card__question">${escapeHtml(layer.question || copy.shortQuestion)}</p>
                    ${showSamples ? `
                        <div class="sentence-map-layer-card__sample">
                            <span>דוגמה</span>
                            <strong>${escapeHtml(layer.sampleAnswer || '')}</strong>
                        </div>
                    ` : `
                        <p class="sentence-map-layer-card__meaning">${escapeHtml(copy.meaning)}</p>
                    `}
                    ${isOpen ? `
                        <div class="sentence-map-layer-card__details">
                            <div class="sentence-map-layer-card__detail-block">
                                <span>שאלת כניסה</span>
                                <strong>${escapeHtml(layer.question || copy.shortQuestion)}</strong>
                            </div>
                            <div class="sentence-map-layer-card__detail-block">
                                <span>תשובת לקוח לדוגמה</span>
                                <strong>${escapeHtml(layer.sampleAnswer || '')}</strong>
                            </div>
                            ${state.mode === 'learn' ? `
                                <p class="sentence-map-layer-card__explanation">${escapeHtml(layer.explanation || copy.meaning)}</p>
                            ` : ''}
                        </div>
                    ` : ''}
                </div>
            `;

            if (!interactive) {
                return `
                    <article class="sentence-map-layer-card sentence-map-layer-card--${tone} sentence-map-layer-card--${layerId}" aria-label="${escapeHtml(copy.title)}">
                        <div class="sentence-map-layer-card__head">
                            <span>${escapeHtml(copy.eyebrow)}</span>
                            <strong>${escapeHtml(copy.title)}</strong>
                        </div>
                        ${body}
                    </article>
                `;
            }

            return `
                <article class="sentence-map-layer-card sentence-map-layer-card--${tone} sentence-map-layer-card--${layerId}${isOpen ? ' is-open' : ''}" aria-label="${escapeHtml(copy.title)}">
                    <button
                        type="button"
                        class="sentence-map-layer-card__toggle"
                        data-action="toggle-layer"
                        data-layer="${escapeHtml(layerId)}"
                        aria-expanded="${isOpen ? 'true' : 'false'}"
                    >
                        <div class="sentence-map-layer-card__head">
                            <span>${escapeHtml(copy.eyebrow)}</span>
                            <strong>${escapeHtml(copy.title)}</strong>
                        </div>
                        <span class="sentence-map-layer-card__chevron" aria-hidden="true">${isOpen ? '−' : '+'}</span>
                    </button>
                    ${body}
                </article>
            `;
        }

        function renderBranchLane(layerId, caseData, options = {}) {
            const branchCopy = BRANCH_COPY[layerId] || {};
            return `
                <div class="sentence-map-branch-lane sentence-map-branch-lane--${escapeHtml(layerId)}">
                    <div class="sentence-map-branch-lane__head">
                        <span>${escapeHtml(branchCopy.eyebrow || '')}</span>
                        <strong>${escapeHtml(branchCopy.description || '')}</strong>
                    </div>
                    ${renderLayerPreviewCard(layerId, caseData, options)}
                </div>
            `;
        }

        function renderSentenceBranchMap(caseData, options = {}) {
            const opts = options && typeof options === 'object' ? options : {};
            const interactive = opts.interactive === true;
            const openLayer = String(opts.openLayer || '').trim();
            const showSamples = opts.showSamples === true;
            return `
                <section class="sentence-map-branch-map" aria-label="מפת המשפט">
                    <div class="sentence-map-branch-map__sentence">
                        <div class="sentence-map-branch-map__sentence-head">
                            <span>${escapeHtml(BRANCH_COPY.sentence.eyebrow)}</span>
                            <strong>${escapeHtml(BRANCH_COPY.sentence.description)}</strong>
                        </div>
                        ${renderSentenceBubble(caseData.sentence)}
                    </div>
                    <div class="sentence-map-branch-map__fork" aria-hidden="true">
                        <span class="sentence-map-branch-map__fork-line sentence-map-branch-map__fork-line--outside"></span>
                        <span class="sentence-map-branch-map__fork-line sentence-map-branch-map__fork-line--inside"></span>
                    </div>
                    <div class="sentence-map-branch-map__summary">
                        <span>${escapeHtml(BRANCH_COPY.summary.eyebrow)}</span>
                        <p>${escapeHtml(BRANCH_COPY.summary.text)}</p>
                    </div>
                    <section class="sentence-map-hierarchy" aria-label="מפת הכיוונים של המשפט">
                        ${LAYER_ORDER.map((layerId) => renderBranchLane(layerId, caseData, { interactive, openLayer, showSamples })).join('')}
                    </section>
                </section>
            `;
        }

        function renderIntroStep(caseData) {
            return `
                <section class="sentence-map-stage-card sentence-map-stage-card--intro">
                    <div class="sentence-map-stage-copy">
                        <p class="sentence-map-stage-kicker">מפת המשפט</p>
                        <h2>לפני שמאתגרים — ממפים</h2>
                        <p class="sentence-map-stage-lead">במטה מודל אנחנו לפעמים מפרטים, מערערים או בודקים מחדש את מה שנאמר. אבל לפני האתגר, חשוב קודם לשקף את המפה שהמשפט כבר מחזיק בתוכו.</p>
                        <p class="sentence-map-stage-subcopy">אותו משפט יכול לדבר בבת אחת גם על מה שקרה בחוץ וגם על מה שנהיה בפנים. לפעמים הוא גם מנסה לגרום למשהו לקרות ביניכם. כאן עובדים עם המורכבות הזאת לפני שבוחרים שאלה.</p>
                    </div>
                    <div class="sentence-map-preview-note">
                        <strong>למה לא למהר לאתגר?</strong>
                        <p>אם מדייקים או מערערים מוקדם מדי, זה עלול להישמע כאילו מתווכחים עם החוויה של האדם. כשממפים קודם, אפשר לשקף, להבין, ורק אחר כך לבחור התערבות מדויקת ועדינה יותר.</p>
                    </div>
                    ${renderSentenceBranchMap(caseData, { interactive: false, showSamples: false })}
                    <div class="sentence-map-stage-actions">
                        <button type="button" class="btn btn-primary sentence-map-btn-main" data-action="start">התחל/י למפות</button>
                    </div>
                </section>
            `;
        }

        function renderSentenceStep(caseData) {
            return `
                <section class="sentence-map-stage-card">
                    <div class="sentence-map-stage-header">
                        <div>
                            <p class="sentence-map-stage-kicker">שלב 2</p>
                            <h2>${escapeHtml(caseData.title)}</h2>
                            <p>המשפט נשאר כמו שנאמר. עכשיו בודקים לאן הוא מצביע בחוץ, בפנים, ולפעמים גם בקשר.</p>
                        </div>
                        <div class="sentence-map-progress-pill">${escapeHtml(getProgressLabel(getCurrentCaseUi()))}</div>
                    </div>
                    <div class="sentence-map-preview-note">
                        <strong>עדיין לא מתקנים</strong>
                        <p>בשלב הזה לא שואלים מי צודק. שואלים מה כאן נצפה בחוץ, מה כאן נחווה בפנים, ומה המשפט מנסה להזיז בשיחה או בקשר.</p>
                    </div>
                    ${renderSentenceBranchMap(caseData, { interactive: false, showSamples: false })}
                </section>
            `;
        }

        function renderLayersStep(caseData, caseUi) {
            return `
                <section class="sentence-map-stage-card">
                    <div class="sentence-map-stage-header">
                        <div>
                            <p class="sentence-map-stage-kicker">שלב 3</p>
                            <h2>פותחים את כיווני המשפט</h2>
                            <p>${state.mode === 'learn'
                                ? 'פתחו כל כיוון כדי לראות שאלת כניסה, תשובת לקוח לדוגמה והסבר קצר. אין צורך לבחור עדיין מה קודם.'
                                : 'פתחו את הכיוונים שנראים לכם רלוונטיים. במצב תרגול יש פחות הסבר ויותר התמצאות בתוך המפה.'}</p>
                        </div>
                    </div>
                    ${renderSentenceBranchMap(caseData, { interactive: true, openLayer: caseUi.openLayer, showSamples: true })}
                </section>
            `;
        }

        function renderFocusStep(caseData, caseUi) {
            const selectedFocus = caseUi.selectedFocus;
            const feedbackText = selectedFocus ? String(caseData.hotFocusFeedback?.[selectedFocus] || '').trim() : '';
            const recommendedLabel = getFocusLabel(caseData.hotFocus);
            return `
                <section class="sentence-map-stage-card">
                    <div class="sentence-map-stage-header">
                        <div>
                            <p class="sentence-map-stage-kicker">שלב 4</p>
                            <h2>מאיפה נכון להתחיל?</h2>
                            <p>אחרי שהחזקנו על המסך את החוץ, הפנים והקשר, בוחרים את הכיוון שהכי זקוק עכשיו להצטרפות, בדיקה או התערבות.</p>
                        </div>
                    </div>
                    <div class="sentence-map-focus-grid" role="list">
                        ${FOCUS_OPTIONS.map((option) => `
                            <button
                                type="button"
                                class="sentence-map-focus-card${selectedFocus === option.id ? ' is-selected' : ''}${caseData.hotFocus === option.id ? ' is-recommended' : ''}"
                                data-action="select-focus"
                                data-focus="${escapeHtml(option.id)}"
                                aria-pressed="${selectedFocus === option.id ? 'true' : 'false'}"
                            >
                                <span>${escapeHtml(option.label)}</span>
                                <strong>${escapeHtml(LAYER_COPY[option.id].title)}</strong>
                            </button>
                        `).join('')}
                    </div>
                    ${selectedFocus ? `
                        <div class="sentence-map-feedback-card${selectedFocus === caseData.hotFocus ? ' is-right' : ''}" role="status" aria-live="polite">
                            <span>${selectedFocus === caseData.hotFocus ? 'בחירה טובה' : 'יש כאן משהו נכון, ובכל זאת'}</span>
                            <strong>${escapeHtml(recommendedLabel)}</strong>
                            <p>${escapeHtml(feedbackText)}</p>
                        </div>
                    ` : `
                        <p class="sentence-map-soft-note">בחרו כיוון אחד כדי לראות מה כרגע הכי מבקש התערבות.</p>
                    `}
                </section>
            `;
        }

        function renderInterventionStep(caseData, caseUi) {
            const selectedFocus = caseUi.selectedFocus;
            const aligned = selectedFocus === caseData.hotFocus;
            const selectedLabel = getFocusLabel(selectedFocus);
            const recommendedLabel = getFocusLabel(caseData.hotFocus);
            return `
                <section class="sentence-map-stage-card">
                    <div class="sentence-map-stage-header">
                        <div>
                            <p class="sentence-map-stage-kicker">שלב 5</p>
                            <h2>מה נכון לשאול עכשיו?</h2>
                            <p>כאן בוחרים שאלה שמתאימה למפה שנפתחה, ולא רק למה שהכי מפתה לתקן בניסוח.</p>
                        </div>
                    </div>
                    <div class="sentence-map-intervention-status${aligned ? ' is-aligned' : ''}">
                        <span>המוקד שנבחר</span>
                        <strong>${escapeHtml(selectedLabel || 'עדיין לא נבחר')}</strong>
                        <p>${aligned
                            ? 'הבחירה שלך יושבת טוב עם המוקד המרכזי של המקרה.'
                            : `יש משהו נכון גם ב"${escapeHtml(selectedLabel)}", ובכל זאת ההמלצה כאן נשענת יותר על ${escapeHtml(recommendedLabel)}.`}</p>
                    </div>
                    <div class="sentence-map-intervention-grid">
                        <article class="sentence-map-info-card sentence-map-info-card--warm">
                            <span>התערבות מתאימה</span>
                            <strong>${escapeHtml(caseData.intervention.title)}</strong>
                            <p>${escapeHtml(caseData.intervention.explanation)}</p>
                        </article>
                        <article class="sentence-map-info-card sentence-map-info-card--rose">
                            <span>לא עכשיו</span>
                            <strong>${escapeHtml(caseData.intervention.notThis)}</strong>
                        </article>
                    </div>
                    <article class="sentence-map-example-card">
                        <span>שאלה שאפשר לומר עכשיו</span>
                        <strong>${escapeHtml(caseData.intervention.example)}</strong>
                    </article>
                </section>
            `;
        }

        function renderReformulationStep(caseData, caseUi) {
            const parts = caseData.reformulation?.parts || {};
            const showExampleParagraph = state.mode === 'learn' || caseUi.showExampleParagraph;
            return `
                <section class="sentence-map-stage-card sentence-map-stage-card--reformulation">
                    <div class="sentence-map-stage-header">
                        <div>
                            <p class="sentence-map-stage-kicker">שלב 6</p>
                            <h2>ניסוח חדש שמחזיק גם פנים וגם חוץ</h2>
                            <p>המטרה כאן היא לא למחוק את החוויה או את המציאות, אלא לנסח אותן בצורה רחבה, מדויקת וישימה יותר.</p>
                        </div>
                    </div>
                    <div class="sentence-map-original-line">
                        <span>המשפט המקורי</span>
                        <strong>${escapeHtml(caseData.sentence)}</strong>
                    </div>
                    <div class="sentence-map-reform-grid">
                        <article class="sentence-map-part-card sentence-map-part-card--inside">
                            <span>בפנים אני מרגיש</span>
                            <strong>${escapeHtml(parts.inner || '')}</strong>
                        </article>
                        <article class="sentence-map-part-card sentence-map-part-card--outside">
                            <span>בחוץ אני רואה</span>
                            <strong>${escapeHtml(parts.outer || '')}</strong>
                        </article>
                        <article class="sentence-map-part-card sentence-map-part-card--relational">
                            <span>מה משפיע על הפער</span>
                            <strong>${escapeHtml(parts.gap || '')}</strong>
                        </article>
                        <article class="sentence-map-part-card sentence-map-part-card--action">
                            <span>מה אני יכול/ה לעשות עכשיו</span>
                            <strong>${escapeHtml(parts.action || '')}</strong>
                        </article>
                    </div>
                    <article class="sentence-map-paragraph-card">
                        <div class="sentence-map-paragraph-card__head">
                            <span>פסקה משולבת</span>
                            ${state.mode === 'practice' ? `
                                <button type="button" class="btn btn-secondary sentence-map-inline-btn" data-action="toggle-example-paragraph">
                                    ${showExampleParagraph ? 'הסתר ניסוח לדוגמה' : 'הצג ניסוח לדוגמה'}
                                </button>
                            ` : ''}
                        </div>
                        ${showExampleParagraph ? `
                            <p>${escapeHtml(caseData.reformulation.integratedParagraph || '')}</p>
                        ` : `
                            <p class="sentence-map-soft-note">במצב תרגול אפשר לעצור קודם על ארבעת החלקים, ואז לפתוח את הפסקה לדוגמה רק אם צריך.</p>
                        `}
                    </article>
                    <article class="sentence-map-checklist-card">
                        <span>מה השתפר בניסוח?</span>
                        <ul>
                            ${(caseData.reformulation?.checklistItems || []).map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
                        </ul>
                    </article>
                </section>
            `;
        }

        function renderMethodNote() {
            return `
                <aside class="sentence-map-method-note" aria-label="עיקרון העבודה">
                    <span>עיקרון העבודה</span>
                    <strong>לפני בדיקה או ערעור, משקפים את המפה שהמשפט מחזיק.</strong>
                    <p>במטה מודל יש רגעים שבהם נכון להחזיר פירוט, לבדוק הכללה או לאתגר ניסוח. אבל אם עושים את זה לפני שהאדם מרגיש שנקלטו גם החוץ וגם הפנים, ההתערבות עלולה להישמע כמו ויכוח. מפת המשפט עוזרת להחזיק יחד את המציאות החיצונית, את החוויה הפנימית ואת הצורך היחסי, ואז לבחור שאלה מדויקת יותר.</p>
                </aside>
            `;
        }

        function renderFooterNavigation(caseUi) {
            const isIntro = caseUi.stepIndex === 0;
            const isLast = caseUi.stepIndex === STEP_ORDER.length - 1;
            return `
                <div class="sentence-map-footer">
                    <button type="button" class="btn btn-secondary sentence-map-footer__btn" data-action="go-back" ${isIntro ? 'disabled' : ''}>חזרה</button>
                    <button type="button" class="btn btn-primary sentence-map-footer__btn" data-action="go-next" ${canAdvance(caseUi) ? '' : 'disabled'}>
                        ${isLast ? 'סיימנו' : 'המשך'}
                    </button>
                </div>
            `;
        }

        function renderCurrentStep(caseData, caseUi) {
            if (caseUi.stepIndex === 0) return renderIntroStep(caseData);
            if (caseUi.stepIndex === 1) return renderSentenceStep(caseData);
            if (caseUi.stepIndex === 2) return renderLayersStep(caseData, caseUi);
            if (caseUi.stepIndex === 3) return renderFocusStep(caseData, caseUi);
            if (caseUi.stepIndex === 4) return renderInterventionStep(caseData, caseUi);
            return renderReformulationStep(caseData, caseUi);
        }

        function render() {
            const caseData = getCurrentCase();
            const caseUi = getCurrentCaseUi();
            root.className = `sentence-map-root sentence-map-root--${escapeHtml(state.mode)}`;
            root.innerHTML = `
                <div class="sentence-map-shell">
                    <section class="practice-section-header sentence-map-header">
                        <div class="sentence-map-header__copy">
                            <p class="sentence-map-header__eyebrow">מפת המשפט</p>
                            <h3 data-feature-title="מפת המשפט">לפני שמאתגרים — ממפים</h3>
                            <p class="sentence-map-header__subtitle" data-feature-subtitle="לפני שמדייקים או מערערים, ממפים איך אותו משפט מחזיק יחד חוץ, פנים ולפעמים גם בקשה ביחסים.">לפני שמדייקים או מערערים, ממפים איך אותו משפט מחזיק יחד חוץ, פנים ולפעמים גם בקשה ביחסים.</p>
                        </div>
                        ${renderModeToggle()}
                    </section>
                    ${renderCaseSelector()}
                    ${renderStepper(caseUi)}
                    ${renderCurrentStep(caseData, caseUi)}
                    ${renderMethodNote()}
                    ${renderFooterNavigation(caseUi)}
                </div>
            `;
            persistState();
        }

        root.addEventListener('click', (event) => {
            const button = event.target instanceof Element ? event.target.closest('[data-action]') : null;
            if (!button) return;
            const action = String(button.getAttribute('data-action') || '').trim();
            if (action === 'set-mode') {
                setMode(button.getAttribute('data-mode') || 'learn');
                return;
            }
            if (action === 'select-case') {
                setCase(button.getAttribute('data-case') || '');
                return;
            }
            if (action === 'go-step') {
                setStep(button.getAttribute('data-step') || 0);
                return;
            }
            if (action === 'start') {
                startMapping();
                return;
            }
            if (action === 'go-next') {
                goNext();
                return;
            }
            if (action === 'go-back') {
                goBack();
                return;
            }
            if (action === 'toggle-layer') {
                toggleLayer(button.getAttribute('data-layer') || '');
                return;
            }
            if (action === 'select-focus') {
                selectFocus(button.getAttribute('data-focus') || '');
                return;
            }
            if (action === 'toggle-example-paragraph') {
                toggleExampleParagraph();
            }
        });

        render();
    }

    global.setupSentenceMap = setupSentenceMap;
})(typeof window !== 'undefined' ? window : globalThis);
