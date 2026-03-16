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
const MODE_COPY = Object.freeze({
        learn: Object.freeze({ label: 'ליווי', hint: 'ששת השלבים נשארים גלויים לאורך כל העבודה.' }),
        practice: Object.freeze({ label: 'תרגול', hint: 'בחרו מקרה, סמנו מוקד, והתקדמו.' })
    });
    const HEADER_COPY = Object.freeze({
        title: 'מפת המשפט',
        leadTitle: 'מפת העבודה',
        concept: 'בחרו מקרה אחד והתקדמו דרך ששת השלבים: משפט, שכבות, מוקד, שאלה וניסוח חדש.',
        stepperTitle: 'ששת השלבים',
        casesTitle: 'מקרי תרגול',
        casesSubtitle: 'שלושה מקרים קבועים, אותה מפה.',
        summaryButton: 'נסה מקרה נוסף →',
        empty: 'מפת המשפט לא זמינה כרגע. נסו לרענן את המסך.'
    });
    const LAYER_META = Object.freeze({
        outside: Object.freeze({ icon: '🌍', name: 'חוץ', tag: '🌍 חוץ', title: 'מה קרה בפועל?', description: 'מה קרה בפועל, פיזי, כאן ועכשיו' }),
        inside: Object.freeze({ icon: '🧠', name: 'פנים', tag: '🧠 פנים', title: 'מה הסיפור הפנימי?', description: 'הסיפור הפנימי, רגש, תמונה, ערכים' }),
        relational: Object.freeze({ icon: '🔗', name: 'פונקציה', tag: '🔗 פונקציה', title: 'מה המשפט עושה בשיחה?', description: 'מה המשפט עושה בתוך השיחה' })
    });

    function clampStep(value) {
        const raw = Number(value);
        if (!Number.isFinite(raw)) return 0;
        return Math.max(0, Math.min(STEP_ORDER.length - 1, Math.floor(raw)));
    }

    function splitIntoParagraphs(text, maxSentences = 2) {
        const normalized = String(text || '').replace(/\s+/g, ' ').trim();
        if (!normalized) return [];
        const sentences = normalized.match(/[^.!?]+(?:[.!?]+|$)/g) || [normalized];
        const cleaned = sentences.map((item) => item.trim()).filter(Boolean);
        const paragraphs = [];
        for (let index = 0; index < cleaned.length; index += maxSentences) {
            paragraphs.push(cleaned.slice(index, index + maxSentences).join(' ').trim());
        }
        return paragraphs.filter(Boolean);
    }

    function setupSentenceMap() {
        const root = document.getElementById('sentence-map-app');
        if (!root || root.dataset.sentenceMapBound === 'true') return;
        root.dataset.sentenceMapBound = 'true';

        const cases = Array.isArray(global.MetaSentenceMapCases) ? global.MetaSentenceMapCases.filter(Boolean) : [];
        if (!cases.length) {
            root.innerHTML = `<div class="sentence-map-empty">${HEADER_COPY.empty}</div>`;
            return;
        }

        const caseIds = cases.map((item) => String(item.id || '').trim()).filter(Boolean);
        const escapeHtml = (value) => {
            if (typeof global.escapeHtml === 'function') return global.escapeHtml(value);
            return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
        };
        const caseById = (caseId) => cases.find((item) => item.id === String(caseId || '').trim()) || cases[0];
        const hasCaseId = (caseId) => caseIds.includes(String(caseId || '').trim());
        const hasLayerId = (layerId) => Object.prototype.hasOwnProperty.call(LAYER_META, String(layerId || '').trim());
        const hasFocusId = (focusId) => Object.prototype.hasOwnProperty.call(LAYER_META, String(focusId || '').trim());
        const createCaseUiState = () => ({ stepIndex: 0, maxVisitedStep: 0, awardedStepIndex: 0, openLayer: 'outside', selectedFocus: '', showExampleParagraph: false });

        function sanitizeCaseUi(raw) {
            const safe = raw && typeof raw === 'object' ? raw : {};
            const stepIndex = clampStep(safe.stepIndex);
            return {
                stepIndex,
                maxVisitedStep: Math.max(stepIndex, clampStep(safe.maxVisitedStep)),
                awardedStepIndex: Math.max(stepIndex, clampStep(safe.awardedStepIndex)),
                openLayer: hasLayerId(safe.openLayer) ? String(safe.openLayer).trim() : 'outside',
                selectedFocus: hasFocusId(safe.selectedFocus) ? String(safe.selectedFocus).trim() : '',
                showExampleParagraph: safe.showExampleParagraph === true
            };
        }

        function sanitizeState(raw) {
            const safe = raw && typeof raw === 'object' ? raw : {};
            const selectedCaseId = hasCaseId(safe.selectedCaseId) ? String(safe.selectedCaseId).trim() : caseIds[0];
            const caseUiById = {};
            caseIds.forEach((caseId) => { caseUiById[caseId] = sanitizeCaseUi(safe.caseUiById?.[caseId]); });
            return { mode: safe.mode === 'practice' ? 'practice' : 'learn', selectedCaseId, caseUiById };
        }

        let state;
        try { state = sanitizeState(JSON.parse(global.localStorage.getItem(STORAGE_KEY) || '{}')); }
        catch (_error) { state = sanitizeState({}); }

        const persistState = () => { try { global.localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (_error) {} };
        const getCaseUi = (caseId = state.selectedCaseId) => {
            const safeCaseId = hasCaseId(caseId) ? String(caseId).trim() : caseIds[0];
            if (!state.caseUiById[safeCaseId]) state.caseUiById[safeCaseId] = createCaseUiState();
            return state.caseUiById[safeCaseId];
        };
        const getCurrentCase = () => caseById(state.selectedCaseId);
        const getCurrentCaseUi = () => getCaseUi(state.selectedCaseId);
        const ensureStepUnlocked = (caseUi, targetStepIndex) => { if (caseUi) caseUi.maxVisitedStep = Math.max(caseUi.maxVisitedStep, clampStep(targetStepIndex)); };
        const awardStepCompletion = (caseUi, targetStepIndex) => {
            const resolvedStep = clampStep(targetStepIndex);
            if (!caseUi || resolvedStep <= 0 || resolvedStep <= caseUi.awardedStepIndex) return;
            caseUi.awardedStepIndex = resolvedStep;
            if (global.MetaGamification && typeof global.MetaGamification.addXP === 'function') {
                global.MetaGamification.addXP(10, 'sentenceMap');
            }
        };
        const canAdvance = (caseUi) => !(caseUi.stepIndex === 3 && !caseUi.selectedFocus) && caseUi.stepIndex < STEP_ORDER.length - 1;
        const getProgressLabel = (caseUi) => `${STEP_ORDER[caseUi.stepIndex]?.label || STEP_ORDER[0].label} · ${caseUi.stepIndex + 1}/${STEP_ORDER.length}`;
        const renderParagraphs = (text, className = '') => splitIntoParagraphs(text).map((item) => `<p${className ? ` class="${escapeHtml(className)}"` : ''}>${escapeHtml(item)}</p>`).join('');
        const renderSentenceBubble = (sentence, caseTitle) => `<article class="sentence-map-sentence-bubble" aria-label="משפט לתרגול"><div class="sentence-map-sentence-bubble__head"><span>${escapeHtml(caseTitle || 'מקרה לתרגול')}</span></div><p>"${escapeHtml(sentence)}"</p></article>`;
        const renderStageHeader = (stepIndex, title, note) => `<div class="sentence-map-stage-header"><div><p class="sentence-map-stage-kicker">שלב ${stepIndex + 1}</p><h2>${escapeHtml(title)}</h2></div>${note ? `<p class="sentence-map-stage-note">${escapeHtml(note)}</p>` : ''}</div>`;
        const renderFocusBadge = (focusId) => LAYER_META[focusId] ? `<span class="sentence-map-focus-pill sentence-map-focus-pill--${escapeHtml(focusId)}">${escapeHtml(LAYER_META[focusId].icon)} ${escapeHtml(LAYER_META[focusId].name)}</span>` : '';
        const renderWorkbench = (label, innerHtml, tone = 'map') => `<div class="sentence-map-workbench sentence-map-workbench--${escapeHtml(tone)}"><div class="sentence-map-workbench__label">${escapeHtml(label)}</div>${innerHtml}</div>`;
        const renderSidePanel = (label, innerHtml, tone = 'feedback') => `<aside class="sentence-map-side-panel sentence-map-side-panel--${escapeHtml(tone)}"><div class="sentence-map-side-panel__label">${escapeHtml(label)}</div>${innerHtml}</aside>`;

        function setMode(mode) { state.mode = mode === 'practice' ? 'practice' : 'learn'; render(); }
        function setCase(caseId) { if (hasCaseId(caseId)) { state.selectedCaseId = String(caseId).trim(); render(); } }
        function setStep(stepIndex) {
            const caseUi = getCurrentCaseUi();
            const nextStep = clampStep(stepIndex);
            if (nextStep > caseUi.maxVisitedStep) return;
            if (nextStep >= 4 && !caseUi.selectedFocus) return;
            caseUi.stepIndex = nextStep;
            awardStepCompletion(caseUi, nextStep);
            render();
        }
        function goNext() { const caseUi = getCurrentCaseUi(); if (canAdvance(caseUi)) { const next = clampStep(caseUi.stepIndex + 1); ensureStepUnlocked(caseUi, next); caseUi.stepIndex = next; awardStepCompletion(caseUi, next); render(); } }
        function goBack() { const caseUi = getCurrentCaseUi(); caseUi.stepIndex = clampStep(caseUi.stepIndex - 1); render(); }
        function startMapping() { const caseUi = getCurrentCaseUi(); ensureStepUnlocked(caseUi, 1); caseUi.stepIndex = 1; awardStepCompletion(caseUi, 1); render(); }
        function toggleLayer(layerId) { if (hasLayerId(layerId)) { const caseUi = getCurrentCaseUi(); caseUi.openLayer = caseUi.openLayer === layerId ? '' : layerId; render(); } }
        function selectFocus(focusId) { if (hasFocusId(focusId)) { const caseUi = getCurrentCaseUi(); caseUi.selectedFocus = String(focusId).trim(); ensureStepUnlocked(caseUi, 4); render(); } }
        function toggleExampleParagraph() { const caseUi = getCurrentCaseUi(); caseUi.showExampleParagraph = !caseUi.showExampleParagraph; render(); }
        function goToNextCase() {
            const currentIndex = Math.max(0, caseIds.indexOf(state.selectedCaseId));
            const nextCaseId = caseIds[(currentIndex + 1) % caseIds.length] || caseIds[0];
            state.selectedCaseId = nextCaseId;
            state.caseUiById[nextCaseId] = createCaseUiState();
            render({ forceFocus: true });
        }

        function renderModeToggle() {
            return `<div class="sentence-map-mode-toggle" aria-label="מצב עבודה"><div class="sentence-map-mode-toggle__buttons">${Object.entries(MODE_COPY).map(([modeId, copy]) => `<button type="button" class="sentence-map-segment${state.mode === modeId ? ' is-active' : ''}" data-action="set-mode" data-mode="${escapeHtml(modeId)}" aria-pressed="${state.mode === modeId ? 'true' : 'false'}">${escapeHtml(copy.label)}</button>`).join('')}</div><p class="sentence-map-toolbar-note">${escapeHtml(MODE_COPY[state.mode].hint)}</p></div>`;
        }

        function renderHeader(caseUi) {
            return `<section class="sentence-map-header"><div class="sentence-map-header__copy"><p class="sentence-map-header__eyebrow">${escapeHtml(HEADER_COPY.title)}</p><h3 data-feature-title="${escapeHtml(HEADER_COPY.title)}">${escapeHtml(HEADER_COPY.leadTitle)}</h3><p class="sentence-map-header__subtitle" data-feature-subtitle="${escapeHtml(HEADER_COPY.concept)}">${escapeHtml(HEADER_COPY.concept)}</p></div></section>`;
        }

        function renderExerciseHeader() {
            const caseData = getCurrentCase();
            const caseUi = getCurrentCaseUi();
            return `<div class="sentence-map-exercise-header"><div class="sentence-map-exercise-header__info"><p class="sentence-map-header__eyebrow">${escapeHtml(HEADER_COPY.title)}</p><strong>${escapeHtml(caseData.title)}</strong></div><span class="sentence-map-exercise-header__step">${escapeHtml(getProgressLabel(caseUi))}</span></div>`;
        }

        function renderStepper(caseUi) {
            return `<section class="sentence-map-stepper-block" aria-label="${escapeHtml(HEADER_COPY.stepperTitle)}"><div class="sentence-map-stepper-block__head"><span>${escapeHtml(HEADER_COPY.stepperTitle)}</span><strong>${escapeHtml(getProgressLabel(caseUi))}</strong></div><nav class="sentence-map-stepper" aria-label="${escapeHtml(HEADER_COPY.stepperTitle)}">${STEP_ORDER.map((step, index) => {
                const active = index === caseUi.stepIndex;
                const done = index < caseUi.stepIndex;
                const unlocked = index <= caseUi.maxVisitedStep;
                const inner = `<span class="sentence-map-stepper__count">${index + 1}</span><span class="sentence-map-stepper__label">${escapeHtml(step.label)}</span>`;
                return unlocked
                    ? `<button type="button" class="sentence-map-stepper__item${active ? ' is-active' : ''}${done ? ' is-done' : ''}" data-action="go-step" data-step="${index}" aria-current="${active ? 'step' : 'false'}">${inner}</button>`
                    : `<div class="sentence-map-stepper__item is-locked" aria-disabled="true">${inner}</div>`;
            }).join('')}</nav></section>`;
        }

        function renderCaseSelector() {
            const currentCase = getCurrentCase();
            return `<section class="sentence-map-case-selector" aria-label="בחירת מקרה"><div class="sentence-map-section-heading"><div><span>${escapeHtml(HEADER_COPY.casesTitle)}</span><strong>${escapeHtml(HEADER_COPY.casesSubtitle)}</strong></div>${renderModeToggle()}</div><div class="sentence-map-case-grid">${cases.map((item) => `<button type="button" class="sentence-map-case-card${item.id === currentCase.id ? ' is-active' : ''}" data-action="select-case" data-case="${escapeHtml(item.id)}" aria-pressed="${item.id === currentCase.id ? 'true' : 'false'}"><span class="sentence-map-case-card__tag">${escapeHtml(item.title)}</span><strong>${escapeHtml(item.sentence)}</strong></button>`).join('')}</div></section>`;
        }

        function renderMethodNote(options = {}) {
            const opts = options && typeof options === 'object' ? options : {};
            const hiddenAttr = opts.hidden ? ' hidden aria-hidden="true"' : '';
            return `<section class="sentence-map-method-note" aria-label="${escapeHtml(HEADER_COPY.methodTitle)}"${hiddenAttr}><div class="sentence-map-section-heading"><div><span>${escapeHtml(HEADER_COPY.methodKicker)}</span><strong>${escapeHtml(HEADER_COPY.methodTitle)}</strong></div></div><p>${escapeHtml(HEADER_COPY.methodBody)}</p></section>`;
        }

        function renderLayerExplorerCard(layerId, caseData, caseUi) {
            const meta = LAYER_META[layerId];
            const layer = caseData.layers?.[layerId] || {};
            const isOpen = caseUi.openLayer === layerId;
            return `<article class="sentence-map-layer-card sentence-map-layer-card--${escapeHtml(layerId)}${isOpen ? ' is-open' : ''}" aria-label="${escapeHtml(meta.title)}"><div class="sentence-map-layer-card__tag">${escapeHtml(meta.tag)}</div><button type="button" class="sentence-map-layer-card__toggle" data-action="toggle-layer" data-layer="${escapeHtml(layerId)}" aria-expanded="${isOpen ? 'true' : 'false'}"><div class="sentence-map-layer-card__head"><strong>${escapeHtml(meta.title)}</strong><p class="sentence-map-layer-card__summary">${escapeHtml(meta.description)}</p></div><span class="sentence-map-layer-card__chevron" aria-hidden="true">${isOpen ? '−' : '+'}</span></button>${isOpen ? `<div class="sentence-map-layer-card__details"><div class="sentence-map-layer-card__detail-block"><span>שאלה</span><strong>${escapeHtml(layer.question || meta.title)}</strong></div><div class="sentence-map-layer-card__detail-block"><span>דוגמה</span><strong>${escapeHtml(layer.sampleAnswer || '')}</strong></div></div>` : ''}</article>`;
        }

        function renderCurrentStep(caseData, caseUi) {
            if (caseUi.stepIndex === 0) return `<section class="sentence-map-stage-card sentence-map-stage-card--intro">${renderStageHeader(0, 'בוחרים משפט אחד לעבוד איתו', 'בחרו מקרה אחד והתחילו את המיפוי.')}${renderSentenceBubble(caseData.sentence, caseData.title)}<div class="sentence-map-stage-actions"><button type="button" class="btn btn-primary sentence-map-btn-main" data-action="start">התחל/י</button></div></section>`;
            if (caseUi.stepIndex === 1) return `<section class="sentence-map-stage-card">${renderStageHeader(1, 'המשפט כמו שהוא', 'משאירים את המשפט מול העיניים ועובדים ממנו.')}${renderWorkbench('לוח המשפט', renderSentenceBubble(caseData.sentence, caseData.title))}</section>`;
            if (caseUi.stepIndex === 2) return `<section class="sentence-map-stage-card">${renderStageHeader(2, 'פותחים שכבה אחרי שכבה', 'המשפט ושלוש השכבות נשארים בתוך אותו לוח עבודה.')}${renderWorkbench('לוח העבודה', `${renderSentenceBubble(caseData.sentence, caseData.title)}<div class="sentence-map-layer-stack">${LAYER_ORDER.map((layerId) => renderLayerExplorerCard(layerId, caseData, caseUi)).join('')}</div>`)}</section>`;
            if (caseUi.stepIndex === 3) {
                const selectedFocus = caseUi.selectedFocus;
                const feedbackText = selectedFocus ? String(caseData.hotFocusFeedback?.[selectedFocus] || '').trim() : '';
                return `<section class="sentence-map-stage-card">${renderStageHeader(3, 'איפה הלב של המקרה?', 'לוח העבודה והפידבק מופרדים כדי שיהיה ברור מה ממפים ומה כבר מסיקים.')}<div class="sentence-map-stage-split">${renderWorkbench('מפת המשפט והשכבות', `${renderSentenceBubble(caseData.sentence, caseData.title)}<div class="sentence-map-focus-grid" role="list">${LAYER_ORDER.map((focusId) => `<button type="button" class="sentence-map-focus-card sentence-map-focus-card--${escapeHtml(focusId)}${selectedFocus === focusId ? ' is-selected' : ''}${caseData.hotFocus === focusId ? ' is-recommended' : ''}" data-action="select-focus" data-focus="${escapeHtml(focusId)}" aria-pressed="${selectedFocus === focusId ? 'true' : 'false'}"><span>${escapeHtml(LAYER_META[focusId].icon)} ${escapeHtml(LAYER_META[focusId].name)}</span><strong>${escapeHtml(LAYER_META[focusId].title)}</strong><p>${escapeHtml(LAYER_META[focusId].description)}</p></button>`).join('')}</div>`)}${selectedFocus ? renderSidePanel('פידבק על הבחירה', `<div class="sentence-map-feedback-card${selectedFocus === caseData.hotFocus ? ' is-right' : ''}" role="status" aria-live="polite"><span>המוקד שנבחר</span><strong>${renderFocusBadge(selectedFocus)}</strong>${renderParagraphs(feedbackText)}</div>`) : renderSidePanel('פידבק יופיע כאן', '<p class="sentence-map-soft-note">בחרו כיוון אחד כדי לראות פידבק נפרד וברור.</p>', 'placeholder')}</div></section>`;
            }
            if (caseUi.stepIndex === 4) {
                const activeFocus = caseUi.selectedFocus || caseData.hotFocus;
                return `<section class="sentence-map-stage-card">${renderStageHeader(4, 'מה נכון לשאול עכשיו?', 'המשפט, המוקד והתגובה נשמרים בתוך אותו לוח עבודה ברור.')}<div class="sentence-map-stage-split">${renderWorkbench('לוח ההתערבות', `${renderSentenceBubble(caseData.sentence, caseData.title)}<div class="sentence-map-intervention-status"><span>המוקד שעליו עובדים</span><strong>${renderFocusBadge(activeFocus)}</strong></div><div class="sentence-map-intervention-grid"><article class="sentence-map-info-card sentence-map-info-card--warm"><span>מה מתאים עכשיו</span><strong>${escapeHtml(caseData.intervention?.title || '')}</strong></article><article class="sentence-map-info-card sentence-map-info-card--rose"><span>מה לא עכשיו</span><strong>${escapeHtml(caseData.intervention?.notThis || '')}</strong></article></div>`)}${renderSidePanel('שאלה להמשך השיחה', `<article class="sentence-map-example-card"><span>שאלה שאפשר לומר עכשיו</span><strong>${escapeHtml(caseData.intervention?.example || '')}</strong></article>`, 'guidance')}</div></section>`;
            }
            const parts = caseData.reformulation?.parts || {};
            const showExampleParagraph = state.mode === 'learn' || caseUi.showExampleParagraph;
            const selectedFocus = caseUi.selectedFocus || caseData.hotFocus;
            return `<section class="sentence-map-stage-card sentence-map-stage-card--reformulation">${renderStageHeader(5, 'ניסוח חדש שמחזיק את התמונה', 'המפה נשארת בלוח אחד, והסיכום הסופי יושב בפאנל נפרד.')}${renderWorkbench('לוח הניסוח', `${renderSentenceBubble(caseData.sentence, caseData.title)}<div class="sentence-map-reform-grid"><article class="sentence-map-part-card sentence-map-part-card--inside"><span>בפנים</span><strong>${escapeHtml(parts.inner || '')}</strong></article><article class="sentence-map-part-card sentence-map-part-card--outside"><span>בחוץ</span><strong>${escapeHtml(parts.outer || '')}</strong></article><article class="sentence-map-part-card sentence-map-part-card--relational"><span>הפער</span><strong>${escapeHtml(parts.gap || '')}</strong></article><article class="sentence-map-part-card sentence-map-part-card--action"><span>הצעד הבא</span><strong>${escapeHtml(parts.action || '')}</strong></article></div><article class="sentence-map-paragraph-card"><div class="sentence-map-paragraph-card__head"><span>ניסוח משולב</span>${state.mode === 'practice' ? `<button type="button" class="btn btn-secondary sentence-map-inline-btn" data-action="toggle-example-paragraph">${showExampleParagraph ? 'הסתר ניסוח לדוגמה' : 'הצג ניסוח לדוגמה'}</button>` : ''}</div>${showExampleParagraph ? renderParagraphs(caseData.reformulation?.integratedParagraph || '') : ''}</article>`, 'summary')}${renderSidePanel('סיכום נפרד', `<article class="sentence-map-summary-card" aria-label="סיכום התרגיל"><span>סיכום קצר</span><blockquote class="sentence-map-summary-card__quote">"${escapeHtml(caseData.sentence)}"</blockquote><div class="sentence-map-summary-card__focus"><span>המוקד שנבחר</span><strong>${renderFocusBadge(selectedFocus)}</strong></div><div class="sentence-map-summary-card__reframe"><span>הניסוח החדש</span>${renderParagraphs(caseData.reformulation?.integratedParagraph || '', 'sentence-map-summary-card__reframe-line')}</div><button type="button" class="btn btn-primary sentence-map-summary-card__button" data-action="next-case">${escapeHtml(HEADER_COPY.summaryButton)}</button></article>`, 'summary')}</section>`;
        }

        function renderFooter(caseUi) {
            const isIntro = caseUi.stepIndex === 0;
            const isLast = caseUi.stepIndex === STEP_ORDER.length - 1;
            return `<div class="sentence-map-footer"><button type="button" class="btn btn-secondary sentence-map-footer__btn" data-action="go-back" ${isIntro ? 'disabled' : ''}>חזרה</button><button type="button" class="btn btn-primary sentence-map-footer__btn" data-action="go-next" ${canAdvance(caseUi) ? '' : 'disabled'}>${isLast ? 'סיימנו' : 'המשך'}</button></div>`;
        }

        function maybeBringSectionIntoView(force = false) {
            const section = document.getElementById('sentence-map');
            if (!section || !section.classList.contains('active')) return;
            if (section.dataset.metaFeatureStage === 'welcome') return;
            if (typeof global.matchMedia === 'function' && !global.matchMedia('(max-width: 900px)').matches) return;
            if (!force && section.getBoundingClientRect().top <= 32) return;
            try { section.scrollIntoView({ behavior: 'auto', block: 'start', inline: 'nearest' }); }
            catch (_error) { try { section.scrollIntoView(); } catch (_ignored) {} }
        }

        function render(options = {}) {
            const opts = options && typeof options === 'object' ? options : {};
            const caseData = getCurrentCase();
            const caseUi = getCurrentCaseUi();
            const isIntro = caseUi.stepIndex === 0;
            root.className = `sentence-map-root sentence-map-root--${escapeHtml(state.mode)}${isIntro ? ' is-intro' : ' is-exercise'}`;
            if (isIntro) {
                root.innerHTML = `<div class="sentence-map-shell">${renderHeader(caseUi)}${renderStepper(caseUi)}${renderCaseSelector()}${renderCurrentStep(caseData, caseUi)}</div>`;
            } else {
                root.innerHTML = `<div class="sentence-map-shell">${renderExerciseHeader()}${renderStepper(caseUi)}${renderCurrentStep(caseData, caseUi)}${renderFooter(caseUi)}</div>`;
            }
            persistState();
            if (typeof global.requestAnimationFrame === 'function') global.requestAnimationFrame(() => maybeBringSectionIntoView(opts.forceFocus === true));
            else maybeBringSectionIntoView(opts.forceFocus === true);
        }

        root.addEventListener('click', (event) => {
            const button = event.target instanceof Element ? event.target.closest('[data-action]') : null;
            if (!button) return;
            const action = String(button.getAttribute('data-action') || '').trim();
            if (action === 'set-mode') return void setMode(button.getAttribute('data-mode') || 'learn');
            if (action === 'select-case') return void setCase(button.getAttribute('data-case') || '');
            if (action === 'go-step') return void setStep(button.getAttribute('data-step') || 0);
            if (action === 'start') return void startMapping();
            if (action === 'go-next') return void goNext();
            if (action === 'go-back') return void goBack();
            if (action === 'toggle-layer') return void toggleLayer(button.getAttribute('data-layer') || '');
            if (action === 'select-focus') return void selectFocus(button.getAttribute('data-focus') || '');
            if (action === 'toggle-example-paragraph') return void toggleExampleParagraph();
            if (action === 'next-case') return void goToNextCase();
        });

        render();
    }

    global.setupSentenceMap = setupSentenceMap;
})(typeof window !== 'undefined' ? window : globalThis);
