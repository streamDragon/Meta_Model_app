(function attachSentenceMapModule(global) {
    if (!global || typeof global.setupSentenceMap === 'function') return;

    const STORAGE_KEY = 'meta_sentence_map_state_v1';
    const STEP_ORDER = Object.freeze([
        Object.freeze({ id: 'intro', label: 'פתיחה' }),
        Object.freeze({ id: 'sentence', label: 'המשפט' }),
        Object.freeze({ id: 'layers', label: 'כיוונים' }),
        Object.freeze({ id: 'focus', label: 'מוקד' }),
        Object.freeze({ id: 'intervention', label: 'ההמלצה' }),
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
        concept: 'בחרו מקרה אחד והתקדמו דרך ששת השלבים: משפט, שכבות, מוקד, המלצה וניסוח חדש.',
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
    const DECISION_COPY = Object.freeze({
        title: 'ההמלצה כרגע',
        subtitle: 'על בסיס ניתוח המשפט, זהו הצעד הבא המומלץ — בכפוף למצב המטופל, למטרה, ולשיקול הדעת הקליני שלך.',
        sentenceLabel: 'המשפט שנבדק',
        focusLabel: 'מוקד העבודה כרגע',
        doNow: 'מה לעשות עכשיו',
        avoidNow: 'ממה להימנע עכשיו',
        whyTitle: 'למה זה הכיוון כרגע',
        nextQuestionTitle: 'שאלת ההמשך המומלצת',
        questionPurposeLabel: 'מטרת השאלה',
        wordingTitle: 'ניסוח אפשרי למטפל',
        wordingHint: 'דוגמה — לא נוסח חובה',
        processTitle: 'מה התהליך הזה אמור לעשות',
        clinicalNote: 'חשוב: ההמלצה כאן היא כיוון עבודה אפשרי. הצעד הבא נכון רק אם הוא מתכתב עם מצב המטופל, העומס הרגשי, שלב הטיפול, והמטרה שאליה הולכים.'
    });
    const INTERVENTION_FAMILY_COPY = Object.freeze({
        imagery: Object.freeze({
            title: 'עבודה עם דימוי מודרך',
            description: 'עבודה עם דימוי מודרך פועלת על החוויה הפנימית ועל הייצוג החושי שלה.'
        }),
        clarification: Object.freeze({
            title: 'שאלות הבהרה',
            description: 'שאלות הבהרה עובדות על דיוק, רצף והבחנה בין הכללה לבין רגע קונקרטי.'
        }),
        reframing: Object.freeze({
            title: 'מסגור מחדש',
            description: 'מסגור מחדש משנה משמעות בלי למחוק את החוויה ופותח מרחב לתגובה אחרת.'
        }),
        reflective: Object.freeze({
            title: 'שפה רפלקטיבית ותיקוף',
            description: 'שפה רפלקטיבית מייצבת ביטחון וברית טיפולית לפני אתגור או תיקון.'
        })
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
        const cleanDirectiveText = (text, prefix) => String(text || '').replace(prefix, '').replace(/\s+/g, ' ').trim();
        const stripQuestionMark = (text) => String(text || '').replace(/[?؟]+\s*$/u, '').trim();
        const getRecommendedFocus = (caseData) => hasFocusId(caseData?.hotFocus) ? String(caseData.hotFocus).trim() : 'inside';
        const getFocusSummary = (focusId) => {
            if (focusId === 'outside') return 'זוהה כאן קודם כל צורך בדיוק וברצף נצפה, לפני פרשנות או הכללה.';
            if (focusId === 'relational') return 'זוהתה כאן קודם כל פונקציה יחסית: המשפט מנסה להשיג נראות, הכרה או תגובה אחרת בקשר.';
            return 'זוהתה כאן קודם כל חוויה פנימית שמארגנת את המשמעות: דימוי, תחושת גוף או סיפור פנימי.';
        };
        const getFocusPurpose = (focusId) => {
            if (focusId === 'outside') return 'כאן ההתערבות מכוונת קודם לעובדות, לרצף ולרגע קונקרטי שאפשר לבדוק.';
            if (focusId === 'relational') return 'כאן ההתערבות מכוונת קודם למה שהמשפט עושה בקשר, לפני ויכוח על העובדות.';
            return 'כאן ההתערבות מכוונת קודם למה שקורה בתוך החוויה, לפני תיקון מהיר של הניסוח.';
        };
        const getClinicalRisk = (focusId) => {
            if (focusId === 'outside') return 'אם נשארים רק עם התחושה או הפרשנות, קל לפספס את הרצף הקונקרטי שממנו אפשר לייצר דיוק ושינוי.';
            if (focusId === 'relational') return 'אם מתקנים את העובדות מוקדם מדי, קל להחריף נתק, עלבון או תחושת חוסר נראות.';
            return 'אם עוברים מהר מדי לאתגר או לעצה, קל לפספס את הדימוי והעומס שמחזיקים את התקיעות מבפנים.';
        };
        const inferInterventionFamilies = (caseData, focusId) => {
            const haystack = `${caseData?.intervention?.title || ''} ${caseData?.intervention?.explanation || ''} ${caseData?.intervention?.example || ''}`;
            const families = [];
            if (focusId === 'inside' || /ייצוג|תמונה|דימוי|חוויה פנימית|סרט/i.test(haystack)) families.push('imagery');
            if (focusId === 'outside' || /מצלמה|לדייק|דיוק|להבהיר|בפועל/i.test(haystack)) families.push('clarification');
            if (focusId === 'relational' || /תיקוף|שומע|נראות|קשר|ביניכם/i.test(haystack)) families.push('reflective');
            if (/משמעות|מסגור|הכללה|לדייק את ההכללה/i.test(haystack)) families.push('reframing');
            if (!families.length) families.push(focusId === 'outside' ? 'clarification' : focusId === 'relational' ? 'reflective' : 'imagery');
            return Array.from(new Set(families));
        };
        const getQuestionPurpose = (focusId, familyKeys) => {
            if (familyKeys.includes('imagery') && familyKeys.includes('reflective')) return 'לתקף את החוויה, להאט הצפה, ואז להבדיל בין מה שנחווה בפנים לבין מה שנצפה בחוץ.';
            if (familyKeys.includes('imagery')) return 'לגעת בדימוי או בתחושת הגוף שמחזיקים את התקיעות, ולהכניס בהם מעט תנועה.';
            if (familyKeys.includes('clarification') && focusId === 'relational') return 'להבין מה המשפט מנסה להשיג בקשר לפני שמבררים אם התיאור שלו מדויק.';
            if (familyKeys.includes('clarification')) return 'להעביר את השיחה מהכללה לרגע אחד מדויק שאפשר לבדוק ולבנות ממנו עבודה.';
            if (familyKeys.includes('reframing')) return 'להרחיב את המשמעות בלי למחוק את החוויה, כדי לא להיתקע בפרשנות יחידה.';
            if (focusId === 'relational') return 'להבין מה המטופל צריך שייקלט או ישתנה בקשר לפני כל תיקון אחר.';
            return 'להחזיק את החוויה באופן שמאפשר המשך חקירה מדויק ובטוח יותר.';
        };
        const getTherapistWording = (caseData, focusId, familyKeys) => {
            const focusQuestion = stripQuestionMark(caseData?.layers?.[focusId]?.question || '');
            if (focusId === 'relational') return focusQuestion ? `לפני שנבדוק אם זה תמיד כך, ${focusQuestion}?` : 'לפני שנבדוק את העובדות, מה הכי חשוב שייקלט כאן בקשר?';
            if (familyKeys.includes('imagery') && familyKeys.includes('reflective')) return focusQuestion ? `אני לא ממהר להתווכח עם החוויה. ${focusQuestion}?` : 'אני רוצה קודם לתת מקום לחוויה, ואז לבדוק בעדינות מה הסרט הפנימי עושה כאן.';
            if (familyKeys.includes('imagery')) return focusQuestion ? `אם נישאר רגע עם מה שקורה בפנים לפני שנפתור, ${focusQuestion}?` : 'אם נישאר רגע עם התמונה או התחושה מבפנים, מה הדבר הראשון שכדאי להזיז בעדינות?';
            if (familyKeys.includes('clarification')) return focusQuestion ? `כדי לדייק בלי למהר לפרשנות, ${focusQuestion}?` : 'אם נחזור לרגע אחד מדויק, מה בעצם קרה שם בפועל?';
            return 'אני רוצה להתקדם בקצב שמחזיק גם את החוויה וגם את הדיוק. מאיפה נכון להתחיל עכשיו?';
        };
        const getDecisionRationaleRows = (caseData, focusId) => {
            const avoidText = cleanDirectiveText(caseData?.intervention?.notThis || '', /^לא עכשיו:\s*/u);
            return [
                Object.freeze({ label: 'מה זוהה', text: getFocusSummary(focusId) }),
                Object.freeze({ label: 'למה זה מתאים', text: String(caseData?.intervention?.explanation || '').trim() || getFocusPurpose(focusId) }),
                Object.freeze({ label: 'למה לא מסלול אחר עדיין', text: avoidText || 'עדיין לא נכון לעבור לאתגר, עצה או דיוק עובדתי לפני שיש מגע עם לב החוויה.' }),
                Object.freeze({ label: 'הסיכון אם זזים מהר מדי', text: getClinicalRisk(focusId) })
            ];
        };
        const renderDecisionPrimary = (caseData) => {
            const doNow = String(caseData?.intervention?.title || '').trim();
            const avoidNow = cleanDirectiveText(caseData?.intervention?.notThis || '', /^לא עכשיו:\s*/u);
            return `<section class="sentence-map-decision-primary" aria-label="ההחלטה המרכזית"><article class="sentence-map-decision-card sentence-map-decision-card--do"><span class="sentence-map-decision-card__label">${escapeHtml(DECISION_COPY.doNow)}</span><strong class="sentence-map-decision-card__value">${escapeHtml(doNow || 'להישאר עם ההמלצה הקלינית המרכזית של המפה')}</strong><p class="sentence-map-decision-card__hint">צעד אחד ברור, לפני הרחבות ולפני פיצול לכמה כיוונים.</p></article><article class="sentence-map-decision-card sentence-map-decision-card--avoid"><span class="sentence-map-decision-card__label">${escapeHtml(DECISION_COPY.avoidNow)}</span><strong class="sentence-map-decision-card__value">${escapeHtml(avoidNow || 'לא למהר לתקן, להתווכח או לתת פתרון לפני שהמוקד התבהר.')}</strong><p class="sentence-map-decision-card__hint">זה לא "לעולם לא", זה פשוט לא הצעד הבא כרגע.</p></article></section>`;
        };
        const renderDecisionRationale = (rows) => `<section class="sentence-map-decision-rationale" aria-label="${escapeHtml(DECISION_COPY.whyTitle)}"><div class="sentence-map-decision-block__head"><span>${escapeHtml(DECISION_COPY.whyTitle)}</span></div><div class="sentence-map-decision-rationale__rows">${rows.map((row) => `<article class="sentence-map-decision-rationale__row"><strong>${escapeHtml(row.label)}</strong><p>${escapeHtml(row.text)}</p></article>`).join('')}</div></section>`;
        const renderDecisionQuestion = (questionText, purposeText) => `<section class="sentence-map-decision-question" aria-label="${escapeHtml(DECISION_COPY.nextQuestionTitle)}"><div class="sentence-map-decision-block__head"><span>${escapeHtml(DECISION_COPY.nextQuestionTitle)}</span></div><blockquote class="sentence-map-decision-question__text">"${escapeHtml(questionText || 'מה נכון לשאול כאן כדי להישאר קרוב ללב המקרה?')}"</blockquote><p class="sentence-map-decision-question__purpose"><strong>${escapeHtml(DECISION_COPY.questionPurposeLabel)}:</strong> ${escapeHtml(purposeText)}</p></section>`;
        const renderDecisionWording = (wordingText) => `<section class="sentence-map-decision-wording" aria-label="${escapeHtml(DECISION_COPY.wordingTitle)}"><div class="sentence-map-decision-block__head"><span>${escapeHtml(DECISION_COPY.wordingTitle)}</span><small>${escapeHtml(DECISION_COPY.wordingHint)}</small></div><p class="sentence-map-decision-wording__text">${escapeHtml(wordingText)}</p></section>`;
        const renderDecisionFamilies = (familyKeys) => `<section class="sentence-map-decision-families" aria-label="${escapeHtml(DECISION_COPY.processTitle)}"><div class="sentence-map-decision-block__head"><span>${escapeHtml(DECISION_COPY.processTitle)}</span></div><div class="sentence-map-decision-family-list">${Object.entries(INTERVENTION_FAMILY_COPY).map(([familyId, family]) => `<article class="sentence-map-decision-family-item${familyKeys.includes(familyId) ? ' is-active' : ''}"><div class="sentence-map-decision-family-item__head"><strong>${escapeHtml(family.title)}</strong>${familyKeys.includes(familyId) ? '<span class="sentence-map-decision-family-item__badge">רלוונטי כאן</span>' : ''}</div><p>${escapeHtml(family.description)}</p></article>`).join('')}</div></section>`;
        const renderDecisionNote = () => `<section class="sentence-map-decision-note" aria-label="הערה קלינית"><p>${escapeHtml(DECISION_COPY.clinicalNote)}</p></section>`;

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
                const focusId = getRecommendedFocus(caseData);
                const familyKeys = inferInterventionFamilies(caseData, focusId);
                const rationaleRows = getDecisionRationaleRows(caseData, focusId);
                const questionPurpose = getQuestionPurpose(focusId, familyKeys);
                const therapistWording = getTherapistWording(caseData, focusId, familyKeys);
                return `<section class="sentence-map-stage-card sentence-map-stage-card--decision">${renderStageHeader(4, DECISION_COPY.title, DECISION_COPY.subtitle)}<div class="sentence-map-decision-context"><article class="sentence-map-decision-context__card"><span>${escapeHtml(DECISION_COPY.sentenceLabel)}</span><strong>"${escapeHtml(caseData.sentence || '')}"</strong></article><article class="sentence-map-decision-context__card sentence-map-decision-context__card--focus"><span>${escapeHtml(DECISION_COPY.focusLabel)}</span><strong>${renderFocusBadge(focusId)}</strong><p>${escapeHtml(getFocusPurpose(focusId))}</p></article></div>${renderDecisionPrimary(caseData)}${renderDecisionRationale(rationaleRows)}${renderDecisionQuestion(caseData.intervention?.example || '', questionPurpose)}<div class="sentence-map-decision-secondary">${renderDecisionWording(therapistWording)}${renderDecisionFamilies(familyKeys)}</div>${renderDecisionNote()}</section>`;
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
