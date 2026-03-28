(function attachSentenceMapModule(global) {
    if (!global || typeof global.setupSentenceMap === 'function') return;

    const STORAGE_KEY = 'meta_sentence_map_state_v1';
    const STEP_ORDER = Object.freeze([
        Object.freeze({ id: 'intro', label: 'פתיחה' }),
        Object.freeze({ id: 'sentence', label: 'המשפט' }),
        Object.freeze({ id: 'layers', label: 'כיוונים' }),
        Object.freeze({ id: 'focus', label: 'מוקד' }),
        Object.freeze({ id: 'intervention', label: 'כיוון טיפולי' }),
        Object.freeze({ id: 'reformulation', label: 'שיקוף וניסוח' })
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
        focusLabel: 'מוקד העבודה שנבחר',
        doNow: 'מה לעשות עכשיו',
        avoidNow: 'ממה להימנע עכשיו',
        whyTitle: 'למה זה הכיוון',
        nextQuestionTitle: 'שאלת ההמשך המומלצת',
        questionPurposeLabel: 'מטרת השאלה',
        questionPurposeText: 'להזיז את השיחה צעד אחד קדימה בלי לאבד את המפה.',
        processTitle: 'מה התהליך הזה אמור לעשות',
        processIntro: 'כל משפחת התערבות עושה משהו אחר. בוחרים רק את מה שמתכתב עם ניתוח המצב, עם מטרת העבודה ועם העומס שהמטופל/ת יכול/ה לשאת כרגע.',
        clinicalTitle: 'הערה קלינית חשובה',
        clinicalNote: 'חשוב: ההמלצה כאן היא כיוון עבודה אפשרי. הצעד הבא נכון רק אם הוא מתכתב עם מצב המטופל, העומס הרגשי, שלב הטיפול, והמטרה שאליה הולכים.'
    });
    const INTERVENTION_FAMILY_COPY = Object.freeze({
        imagery: Object.freeze({
            title: 'דמיון או דימוי מודרך',
            description: 'נשאר עם התמונה, התחושה או חוויית הגוף במקום למהר להסביר אותן.',
            purpose: 'מטפל בחוויה הפנימית עצמה ומכניס בה מעט תנועה לפני ויכוח על התוכן.'
        }),
        clarification: Object.freeze({
            title: 'שאלות הבהרה',
            description: 'מחזיר את השיחה לעובדות, לרצף, ולרגע אחד שאפשר לראות ולבדוק.',
            purpose: 'מטפל בערפול, בכלליות ובהסקות מהירות על ידי דיוק של מה קרה בפועל.'
        }),
        reframing: Object.freeze({
            title: 'מסגור מחדש',
            description: 'מרחיב את המשמעות בלי למחוק את הכאב או להפוך אותו ל"טעות".',
            purpose: 'מטפל בפרשנות היחידה ומאפשר לראות עוד דרך להבין את מה שקורה.'
        }),
        reflective: Object.freeze({
            title: 'שיקוף ותיקוף',
            description: 'נותן שם למה שנחווה ועוזר למטופל/ת להרגיש שנקלט/ה לפני שמזיזים משהו.',
            purpose: 'מטפל בחוסר נראות, בבושה או בעומס רגשי דרך ביסוס ברית, הכרה ונשיאה משותפת.'
        })
    });
    const REFORMULATION_COPY = Object.freeze({
        title: 'ניסוח אפשרי להמשך',
        subtitle: 'אחרי שהבנו את המפה ובחרנו כיוון, זהו ניסוח אפשרי שמחזיק את הכיוון הטיפולי.',
        strengthsTitle: 'מה המהלך מחזק',
        paragraphTitle: 'ניסוח אפשרי למטפל',
        paragraphLabel: 'דוגמה — לא נוסח חובה',
        nextStepTitle: 'הצעד הבא ולמה הוא חשוב',
        paragraphToggleShow: 'הצג ניסוח לדוגמה',
        paragraphToggleHide: 'הסתר ניסוח לדוגמה',
        paragraphPlaceholder: 'כאן יופיע ניסוח לדוגמה שמחזיק יחד את מה שקורה בפנים, בחוץ, בקשר, ואת הצעד הבא.',
        checklistKicker: 'בדיקת איכות קצרה',
        checklistTitle: 'מה הניסוח החדש צריך להחזיק',
        closingNote: 'הצעד הבא חשוב רק אם הוא מתכתב עם ניתוח המצב ועם המטרה שאליה הולכים.'
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
        const renderInlineNote = (title, body) => `<div class="sentence-map-inline-note"><strong>${escapeHtml(title)}</strong><p>${escapeHtml(body)}</p></div>`;
        const renderIntroOverview = () => `<div class="sentence-map-overview-grid">${LAYER_ORDER.map((layerId) => {
            const meta = LAYER_META[layerId];
            return `<article class="sentence-map-overview-layer sentence-map-overview-layer--${escapeHtml(layerId)}"><div class="sentence-map-overview-layer__icon" aria-hidden="true">${escapeHtml(meta.icon)}</div><strong>${escapeHtml(meta.title)}</strong><p>${escapeHtml(meta.description)}</p></article>`;
        }).join('')}</div>`;
        const cleanDirectiveText = (text, prefix) => String(text || '').replace(prefix, '').replace(/\s+/g, ' ').trim();
        const stripQuestionMark = (text) => String(text || '').replace(/[?؟]+\s*$/u, '').trim();
        const getRecommendedFocus = (caseData) => hasFocusId(caseData?.hotFocus) ? String(caseData.hotFocus).trim() : 'inside';
        const getFocusFeedbackMeta = (caseData, selectedFocus) => {
            const recommendedFocusId = getRecommendedFocus(caseData);
            const isRight = selectedFocus === recommendedFocusId;
            return {
                isRight,
                recommendedFocusId,
                statusTitle: isRight ? 'כאן כדאי להתחיל' : 'יש כאן כיוון אפשרי, אבל לא המוקד הראשון',
                statusBody: isRight ? 'הבחירה הזו תוביל לשאלה או להתערבות שהכי מחזיקות את המקרה בתחילת הסבב.' : 'כדי להיכנס מהר ללב המקרה, עדיף להתחיל קודם באזור המומלץ ואז לחזור לכאן אם צריך.'
            };
        };
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
        const getInterventionPurposeRows = (familyKeys) => familyKeys
            .map((familyId) => {
                const family = INTERVENTION_FAMILY_COPY[familyId];
                if (!family) return null;
                return Object.freeze({
                    id: familyId,
                    title: family.title,
                    text: family.purpose,
                    note: family.description
                });
            })
            .filter(Boolean);
        const renderChecklistCard = (items) => {
            const safeItems = Array.isArray(items) ? items.filter(Boolean) : [];
            if (!safeItems.length) return '';
            return `<article class="sentence-map-checklist-card"><span>${escapeHtml(REFORMULATION_COPY.checklistKicker)}</span><strong>${escapeHtml(REFORMULATION_COPY.checklistTitle)}</strong><ul>${safeItems.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul></article>`;
        };
        const renderResultContext = (caseData, focusId, options = {}) => {
            const secondaryLabel = String(options.secondaryLabel || DECISION_COPY.focusLabel).trim();
            const secondaryValue = String(options.secondaryValue || '').trim();
            const secondaryDetail = String(options.secondaryDetail || '').trim();
            const sentenceText = String(caseData?.sentence || '').trim();
            const secondaryMarkup = secondaryValue ? escapeHtml(secondaryValue) : renderFocusBadge(focusId);
            return `<section class="sentence-map-result-context" aria-label="עוגן ניתוח"><article class="sentence-map-result-context__item"><span>${escapeHtml(DECISION_COPY.sentenceLabel)}</span><strong>"${escapeHtml(sentenceText)}"</strong></article><article class="sentence-map-result-context__item sentence-map-result-context__item--focus"><span>${escapeHtml(secondaryLabel)}</span><strong>${secondaryMarkup}</strong>${secondaryDetail ? `<p>${escapeHtml(secondaryDetail)}</p>` : ''}</article></section>`;
        };
        const renderPrimaryRecommendation = (caseData) => {
            const doNow = String(caseData?.intervention?.title || '').trim();
            const avoidNow = cleanDirectiveText(caseData?.intervention?.notThis || '', /^לא עכשיו:\s*/u);
            return `<section class="sentence-map-decision-primary" aria-label="ההחלטה המרכזית"><article class="sentence-map-decision-card sentence-map-decision-card--do"><div class="sentence-map-decision-card__top"><span class="sentence-map-decision-card__icon" aria-hidden="true">✓</span><span class="sentence-map-decision-card__label">${escapeHtml(DECISION_COPY.doNow)}</span></div><strong class="sentence-map-decision-card__value">${escapeHtml(doNow || 'להישאר עם ההמלצה הקלינית המרכזית של המפה')}</strong><p class="sentence-map-decision-card__hint">צעד אחד ברור, ממוקד וקל לסריקה כבר במבט ראשון.</p></article><article class="sentence-map-decision-card sentence-map-decision-card--avoid"><div class="sentence-map-decision-card__top"><span class="sentence-map-decision-card__icon" aria-hidden="true">✕</span><span class="sentence-map-decision-card__label">${escapeHtml(DECISION_COPY.avoidNow)}</span></div><strong class="sentence-map-decision-card__value">${escapeHtml(avoidNow || 'לא למהר לתקן, להתווכח או לתת פתרון לפני שהמוקד התבהר.')}</strong><p class="sentence-map-decision-card__hint">לא כי זה לעולם לא נכון, אלא כי זה לא משרת את המפה בשלב הזה.</p></article></section>`;
        };
        const renderRationale = (rows) => `<section class="sentence-map-decision-rationale" aria-label="${escapeHtml(DECISION_COPY.whyTitle)}"><div class="sentence-map-decision-block__head"><span>${escapeHtml(DECISION_COPY.whyTitle)}</span></div><div class="sentence-map-decision-rationale__rows">${rows.map((row) => `<article class="sentence-map-decision-rationale__row"><strong>${escapeHtml(row.label)}</strong><p>${escapeHtml(row.text)}</p></article>`).join('')}</div></section>`;
        const renderRecommendedQuestion = (questionText, purposeText) => `<section class="sentence-map-decision-question" aria-label="${escapeHtml(DECISION_COPY.nextQuestionTitle)}"><div class="sentence-map-decision-block__head"><span>${escapeHtml(DECISION_COPY.nextQuestionTitle)}</span></div><blockquote class="sentence-map-decision-question__text">"${escapeHtml(questionText || 'מה נכון לשאול כאן כדי להישאר קרוב ללב המקרה?')}"</blockquote><p class="sentence-map-decision-question__purpose"><strong>${escapeHtml(DECISION_COPY.questionPurposeLabel)}:</strong> ${escapeHtml(DECISION_COPY.questionPurposeText)}</p>${purposeText ? `<p class="sentence-map-decision-question__helper">${escapeHtml(purposeText)}</p>` : ''}</section>`;
        const renderInterventionPurpose = (familyKeys) => {
            const rows = getInterventionPurposeRows(familyKeys);
            return `<section class="sentence-map-decision-purpose" aria-label="${escapeHtml(DECISION_COPY.processTitle)}"><div class="sentence-map-decision-block__head"><span>${escapeHtml(DECISION_COPY.processTitle)}</span><small>${escapeHtml(DECISION_COPY.processIntro)}</small></div><div class="sentence-map-decision-purpose__rows">${rows.map((row) => `<article class="sentence-map-decision-purpose__row sentence-map-decision-purpose__row--${escapeHtml(row.id)}"><strong>${escapeHtml(row.title)}</strong><p>${escapeHtml(row.text)}</p><small>${escapeHtml(row.note)}</small></article>`).join('')}</div></section>`;
        };
        const renderClinicalNote = () => `<section class="sentence-map-decision-note" aria-label="${escapeHtml(DECISION_COPY.clinicalTitle)}"><div class="sentence-map-decision-block__head"><span>${escapeHtml(DECISION_COPY.clinicalTitle)}</span></div><p>${escapeHtml(DECISION_COPY.clinicalNote)}</p></section>`;
        const renderReformulationStrengths = (parts) => {
            const cards = [
                Object.freeze({ id: 'inside', title: 'בפנים', text: String(parts.inner || '').trim() }),
                Object.freeze({ id: 'outside', title: 'בחוץ', text: String(parts.outer || '').trim() }),
                Object.freeze({ id: 'gap', title: 'הפער', text: String(parts.gap || '').trim() }),
                Object.freeze({ id: 'action', title: 'הצעד הבא', text: String(parts.action || '').trim() })
            ];
            return `<section class="sentence-map-reform-zone sentence-map-reform-zone--strengths" aria-label="${escapeHtml(REFORMULATION_COPY.strengthsTitle)}"><div class="sentence-map-reform-zone__head"><span>${escapeHtml(REFORMULATION_COPY.strengthsTitle)}</span></div><div class="sentence-map-reform-strengths">${cards.map((card) => `<article class="sentence-map-reform-strength-card sentence-map-reform-strength-card--${escapeHtml(card.id)}"><span>${escapeHtml(card.title)}</span><strong>${escapeHtml(card.text || 'עדיין לא הוגדר כאן טקסט.')}</strong></article>`).join('')}</div></section>`;
        };
        const renderReformulationWording = (integratedParagraph, showExampleParagraph) => {
            const body = showExampleParagraph
                ? renderParagraphs(integratedParagraph || '')
                : `<p class="sentence-map-soft-note">${escapeHtml(REFORMULATION_COPY.paragraphPlaceholder)}</p>`;
            return `<section class="sentence-map-reform-zone sentence-map-reform-zone--wording" aria-label="${escapeHtml(REFORMULATION_COPY.paragraphTitle)}"><div class="sentence-map-reform-zone__head sentence-map-reform-zone__head--paragraph"><div><span>${escapeHtml(REFORMULATION_COPY.paragraphTitle)}</span><strong>${escapeHtml(REFORMULATION_COPY.paragraphLabel)}</strong></div>${state.mode === 'practice' ? `<button type="button" class="btn btn-secondary sentence-map-inline-btn" data-action="toggle-example-paragraph">${showExampleParagraph ? escapeHtml(REFORMULATION_COPY.paragraphToggleHide) : escapeHtml(REFORMULATION_COPY.paragraphToggleShow)}</button>` : ''}</div><article class="sentence-map-therapist-wording">${body}</article></section>`;
        };
        const renderReformulationNextStep = (parts, checklistItems) => `<section class="sentence-map-reform-zone sentence-map-reform-zone--next" aria-label="${escapeHtml(REFORMULATION_COPY.nextStepTitle)}"><div class="sentence-map-reform-zone__head"><span>${escapeHtml(REFORMULATION_COPY.nextStepTitle)}</span></div><article class="sentence-map-reform-next-step"><span>הצעד הבא</span><strong>${escapeHtml(parts.action || 'להישאר עם הכיוון שנבחר ולבדוק מהו הצעד הבא שנשען על המפה.')}</strong><p>${escapeHtml(REFORMULATION_COPY.closingNote)}</p></article>${renderChecklistCard(checklistItems)}<div class="sentence-map-reform-actions"><button type="button" class="btn btn-primary sentence-map-summary-card__button" data-action="next-case">${escapeHtml(HEADER_COPY.summaryButton)}</button></div></section>`;
        const renderReformulationSummary = (caseData, focusId, showExampleParagraph) => {
            const parts = caseData?.reformulation?.parts || {};
            return `${renderResultContext(caseData, focusId, {
                secondaryLabel: 'הכיוון שנבחר',
                secondaryValue: String(caseData?.intervention?.title || '').trim(),
                secondaryDetail: getFocusPurpose(focusId)
            })}<div class="sentence-map-reform-summary">${renderReformulationStrengths(parts)}${renderReformulationWording(caseData?.reformulation?.integratedParagraph || '', showExampleParagraph)}${renderReformulationNextStep(parts, caseData?.reformulation?.checklistItems || [])}</div>`;
        };

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
        function canStepBack() {
            const caseUi = getCurrentCaseUi();
            return Boolean(caseUi && caseUi.stepIndex > 0);
        }
        function restartCurrentCase() {
            state.caseUiById[state.selectedCaseId] = createCaseUiState();
            render({ forceFocus: true });
            return true;
        }
        function registerShellController() {
            global.__metaFeatureControllers = global.__metaFeatureControllers || {};
            global.__metaFeatureControllers['sentence-map'] = {
                canStepBack() {
                    return canStepBack();
                },
                stepBack() {
                    if (!canStepBack()) return false;
                    goBack();
                    return true;
                },
                restart() {
                    return restartCurrentCase();
                }
            };
        }

        function renderModeToggle() {
            return `<div class="sentence-map-mode-toggle" aria-label="מצב עבודה"><div class="sentence-map-mode-toggle__buttons">${Object.entries(MODE_COPY).map(([modeId, copy]) => `<button type="button" class="sentence-map-segment${state.mode === modeId ? ' is-active' : ''}" data-action="set-mode" data-mode="${escapeHtml(modeId)}" aria-pressed="${state.mode === modeId ? 'true' : 'false'}">${escapeHtml(copy.label)}</button>`).join('')}</div><p class="sentence-map-toolbar-note">${escapeHtml(MODE_COPY[state.mode].hint)}</p></div>`;
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

        function renderCaseSelector(options = {}) {
            const currentCase = getCurrentCase();
            const compact = options && options.compact === true;
            const title = compact ? 'בחרו מקרה' : HEADER_COPY.casesTitle;
            const subtitle = compact ? 'שלושה מקרים קצרים לסבב ראשון.' : HEADER_COPY.casesSubtitle;
            const shellClass = compact ? 'sentence-map-case-selector sentence-map-case-selector--compact' : 'sentence-map-case-selector';
            return `<section class="${shellClass}" aria-label="בחירת מקרה"><div class="sentence-map-section-heading"><div><span>${escapeHtml(title)}</span><strong>${escapeHtml(subtitle)}</strong></div>${renderModeToggle()}</div><div class="sentence-map-case-grid">${cases.map((item) => `<button type="button" class="sentence-map-case-card${item.id === currentCase.id ? ' is-active' : ''}" data-action="select-case" data-case="${escapeHtml(item.id)}" aria-pressed="${item.id === currentCase.id ? 'true' : 'false'}"><span class="sentence-map-case-card__tag">${escapeHtml(item.title)}</span><strong>${escapeHtml(item.sentence)}</strong></button>`).join('')}</div></section>`;
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

        function renderFocusCard(focusId, caseData, selectedFocus) {
            const meta = LAYER_META[focusId];
            const isSelected = selectedFocus === focusId;
            const isRecommended = caseData.hotFocus === focusId;
            const actionText = isSelected ? 'נבחר כרגע' : (isRecommended ? 'מומלץ להתחיל כאן' : 'אפשר לבדוק גם מכאן');
            return `<button type="button" class="sentence-map-focus-card sentence-map-focus-card--${escapeHtml(focusId)}${isSelected ? ' is-selected' : ''}${isRecommended ? ' is-recommended' : ''}" data-action="select-focus" data-focus="${escapeHtml(focusId)}" aria-pressed="${isSelected ? 'true' : 'false'}"><span>${escapeHtml(meta.icon)} ${escapeHtml(meta.name)}</span>${isRecommended ? '<small class="sentence-map-focus-card__badge">מומלץ להתחלה</small>' : ''}<strong>${escapeHtml(meta.title)}</strong><p>${escapeHtml(meta.description)}</p><small class="sentence-map-focus-card__action">${escapeHtml(actionText)}</small></button>`;
        }

        function renderFocusFeedbackPanel(caseData, selectedFocus) {
            const feedbackText = String(caseData.hotFocusFeedback?.[selectedFocus] || '').trim();
            const meta = getFocusFeedbackMeta(caseData, selectedFocus);
            const recommendedBadge = meta.isRight ? '' : `<div class="sentence-map-feedback-card__recommendation"><span>עדיף להתחיל ב</span>${renderFocusBadge(meta.recommendedFocusId)}</div>`;
            const correctionAction = meta.isRight ? '' : `<div class="sentence-map-feedback-card__actions"><button type="button" class="btn btn-secondary sentence-map-inline-btn" data-action="select-focus" data-focus="${escapeHtml(meta.recommendedFocusId)}">עבור/י למוקד המומלץ</button></div>`;
            return renderSidePanel(
                'פידבק על הבחירה',
                `<div class="sentence-map-feedback-card${meta.isRight ? ' is-right' : ' is-soft-correction'}" role="status" aria-live="polite"><span class="sentence-map-feedback-card__status">${escapeHtml(meta.statusTitle)}</span><strong>${renderFocusBadge(selectedFocus)}</strong>${recommendedBadge}${renderParagraphs(feedbackText)}<p class="sentence-map-soft-note">${escapeHtml(meta.statusBody)}</p>${correctionAction}</div>`
            );
        }

        function renderCurrentStep(caseData, caseUi) {
            if (caseUi.stepIndex === 0) {
                return `<section class="sentence-map-stage-card sentence-map-stage-card--intro">${renderStageHeader(0, 'בחרו משפט אחד ונתחיל', 'מתחילים ממשפט אחד. אחר כך בוחרים איפה נמצא מוקד העבודה הראשון.')}${renderSentenceBubble(caseData.sentence, caseData.title)}${renderIntroOverview()}<div class="sentence-map-bridge"><div class="sentence-map-bridge__icon" aria-hidden="true">↺</div><p class="sentence-map-bridge__text">בכל סבב רואים את המשפט, ממפים שלוש שכבות, ואז בוחרים בלחיצה מאיפה נכון לפתוח את העבודה.</p></div><div class="sentence-map-stage-actions"><button type="button" class="btn btn-primary sentence-map-btn-main" data-action="start">התחל/י</button></div></section>`;
            }
            if (caseUi.stepIndex === 1) {
                return `<section class="sentence-map-stage-card">${renderStageHeader(1, 'המשפט כמו שהוא', 'משאירים את המשפט מול העיניים ועובדים ממנו.')}${renderWorkbench('לוח המשפט', `${renderSentenceBubble(caseData.sentence, caseData.title)}${renderInlineNote('מה עושים כאן', 'קוראים את המשפט כמו שהוא, בלי לתקן ובלי למהר להסיק. בשלב הבא נפתח את שלוש השכבות שלו.')}`)}</section>`;
            }
            if (caseUi.stepIndex === 2) {
                return `<section class="sentence-map-stage-card">${renderStageHeader(2, 'פותחים שכבה אחרי שכבה', 'המשפט ושלוש השכבות נשארים בתוך אותו לוח עבודה.')}${renderWorkbench('לוח העבודה', `${renderSentenceBubble(caseData.sentence, caseData.title)}${renderInlineNote('פתחו כרטיס אחד בכל פעם', 'כל לחיצה חושפת את השאלה, הדוגמה והפירוש של אותה שכבה. כך רואים מהר מה חסר בחוץ, מה נהיה בפנים, ומה המשפט מבקש בקשר.')}<div class="sentence-map-layer-stack">${LAYER_ORDER.map((layerId) => renderLayerExplorerCard(layerId, caseData, caseUi)).join('')}</div>`)}</section>`;
            }
            if (caseUi.stepIndex === 3) {
                const selectedFocus = caseUi.selectedFocus;
                return `<section class="sentence-map-stage-card">${renderStageHeader(3, 'איפה הלב של המקרה?', 'בוחרים בלחיצה אזור אחד ומקבלים מיד פידבק אם נכון להתחיל ממנו עכשיו.')}<div class="sentence-map-stage-split">${renderWorkbench('מפת המשפט והשכבות', `${renderSentenceBubble(caseData.sentence, caseData.title)}${renderInlineNote('בחרו מוקד אחד בלחיצה', 'המטרה כאן היא לא למצוא “תשובה מושלמת”, אלא לזהות מאיפה הכי נכון לפתוח את הסבב הראשון: בחוץ, בפנים, או בקשר.')}<div class="sentence-map-focus-grid" role="list">${LAYER_ORDER.map((focusId) => renderFocusCard(focusId, caseData, selectedFocus)).join('')}</div>`)}${selectedFocus ? renderFocusFeedbackPanel(caseData, selectedFocus) : renderSidePanel('פידבק יופיע כאן', '<p class="sentence-map-soft-note">בחרו אזור אחד כדי לראות מיד האם זה המוקד הנכון להתחלה, או מאיפה עדיף להתחיל.</p>', 'placeholder')}</div></section>`;
            }
            if (caseUi.stepIndex === 4) {
                const focusId = caseUi.selectedFocus || getRecommendedFocus(caseData);
                const familyKeys = inferInterventionFamilies(caseData, focusId);
                const rationaleRows = getDecisionRationaleRows(caseData, focusId);
                const questionPurpose = getQuestionPurpose(focusId, familyKeys);
                return `<section class="sentence-map-stage-card sentence-map-stage-card--decision">${renderStageHeader(4, DECISION_COPY.title, DECISION_COPY.subtitle)}${renderResultContext(caseData, focusId)}${renderPrimaryRecommendation(caseData)}${renderRecommendedQuestion(caseData.intervention?.example || '', questionPurpose)}<div class="sentence-map-decision-detail-grid">${renderRationale(rationaleRows)}${renderInterventionPurpose(familyKeys)}</div>${renderClinicalNote()}</section>`;
            }
            const focusId = caseUi.selectedFocus || getRecommendedFocus(caseData);
            const showExampleParagraph = state.mode === 'learn' || caseUi.showExampleParagraph;
            return `<section class="sentence-map-stage-card sentence-map-stage-card--reformulation">${renderStageHeader(5, REFORMULATION_COPY.title, REFORMULATION_COPY.subtitle)}${renderReformulationSummary(caseData, focusId, showExampleParagraph)}</section>`;
        }

        function renderFooter(caseUi) {
            const isIntro = caseUi.stepIndex === 0;
            const isLast = caseUi.stepIndex === STEP_ORDER.length - 1;
            return `<div class="sentence-map-footer"><button type="button" class="btn btn-secondary sentence-map-footer__btn" data-action="go-back" ${isIntro ? 'disabled' : ''}>חזרה</button><button type="button" class="btn btn-primary sentence-map-footer__btn" data-action="go-next" ${canAdvance(caseUi) ? '' : 'disabled'}>${isLast ? 'סיימנו' : 'המשך'}</button></div>`;
        }

        function maybeBringSectionIntoView(force = false) {
            const section = document.getElementById('sentence-map');
            if (!section || !section.classList.contains('active')) return;
            if (root.classList.contains('is-intro')) return;
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
                root.innerHTML = `<div class="sentence-map-shell sentence-map-shell--intro-compact">${renderStepper(caseUi)}${renderCaseSelector({ compact: true })}${renderCurrentStep(caseData, caseUi)}</div>`;
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

        registerShellController();
        render();
    }

    global.setupSentenceMap = setupSentenceMap;
})(typeof window !== 'undefined' ? window : globalThis);
