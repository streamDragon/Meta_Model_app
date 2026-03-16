(function prismLabTherapistOverride() {
    if (document.querySelector('[data-prism-necessity-app]') && !document.getElementById('prism-library')) {
        return;
    }

    function therapistGetPrismFamilyInfo(prism) {
        const key = String(prism?.meta_model_category || '').trim().toUpperCase();
        return PRISM_META_MODEL_FAMILY_INFO[key] || PRISM_META_MODEL_FAMILY_INFO.default;
    }

    function therapistGetPrismDisplayName(prism) {
        const id = String(prism?.id || '').trim();
        const override = PRISM_CATEGORY_LABEL_OVERRIDES[id];
        const fallback = normalizeUiText(prism?.name_he || prism?.name_en || 'פריזמה');
        return override || fallback || 'פריזמה';
    }

    function therapistGetPrismCopy(prism) {
        const id = String(prism?.id || '').trim();
        return PRISM_CATEGORY_THERAPIST_COPY[id] || PRISM_CATEGORY_THERAPIST_COPY.default;
    }

    function therapistGetExampleSentence(prism) {
        const story = normalizeUiText(prism?.clinical_story?.statement || '').trim();
        if (story) return story;
        const example = normalizeUiText(prism?.examples?.[0] || '').trim();
        if (example) return example;
        return '';
    }

    function therapistGetDefaultLevel(prism) {
        return PRISM_DEFAULT_LEVEL_BY_ID[String(prism?.id || '').trim()] || 'V';
    }

    function therapistNormalizeLevel(level = '') {
        const safe = String(level || '').trim().toUpperCase();
        return LOGICAL_LEVEL_INFO[safe] ? safe : '';
    }

    function therapistGetSentenceInput() {
        return document.getElementById('prism-client-sentence');
    }

    function therapistGetDirections(level = '') {
        const normalized = therapistNormalizeLevel(level);
        const index = PRISM_LAB_LEVEL_ORDER.indexOf(normalized);
        if (index === -1) return ['expand'];
        const out = [];
        if (index > 0) out.push('ground');
        if (index < PRISM_LAB_LEVEL_ORDER.length - 1) out.push('expand');
        return out;
    }

    function therapistGetSuggestedDirection(level = '') {
        const normalized = therapistNormalizeLevel(level);
        if (!normalized) return 'expand';
        if (normalized === 'E') return 'expand';
        if (normalized === 'S') return 'ground';
        return ['V', 'I'].includes(normalized) ? 'ground' : 'expand';
    }

    function therapistGetTargetLevel(level = '', direction = '') {
        const normalized = therapistNormalizeLevel(level);
        const index = PRISM_LAB_LEVEL_ORDER.indexOf(normalized);
        if (index === -1) return 'V';
        if (direction === 'ground') return PRISM_LAB_LEVEL_ORDER[Math.max(0, index - 1)] || normalized;
        return PRISM_LAB_LEVEL_ORDER[Math.min(PRISM_LAB_LEVEL_ORDER.length - 1, index + 1)] || normalized;
    }

    function therapistDeriveFocus(sentenceText = '', prism) {
        const sentence = normalizeUiText(sentenceText || '').trim();
        if (!sentence) return normalizePrismAnchorText(prism, '');

        const quoted = sentence.match(/[\"״׳']([^\"״׳']{2,48})[\"״׳']/);
        if (quoted?.[1]) return normalizePrismAnchorText(prism, quoted[1]);

        const trigger = (Array.isArray(prism?.linguistic_triggers) ? prism.linguistic_triggers : [])
            .map((item) => normalizeUiText(item || '').trim())
            .find((item) => item && sentence.includes(item));
        if (trigger) return normalizePrismAnchorText(prism, trigger);

        const words = sentence.replace(/[!?.,]/g, '').split(/\s+/).filter(Boolean);
        if (words.length <= 4) return normalizePrismAnchorText(prism, words.join(' '));
        return normalizePrismAnchorText(prism, words.slice(0, 4).join(' '));
    }

    function therapistQuestionForLevel(level = '', focusText = '') {
        const focus = escapeHtml(normalizeUiText(focusText || '').trim() || 'המשפט הזה');
        switch (therapistNormalizeLevel(level)) {
        case 'E':
            return `כשאת/ה אומר/ת "${focus}", איפה, מתי ועם מי זה קורה יותר או פחות?`;
        case 'B':
            return `כשאת/ה אומר/ת "${focus}", מה קורה שם בפועל שאפשר לראות או לשמוע?`;
        case 'C':
            return `כשאת/ה אומר/ת "${focus}", איך את/ה מנסה להתמודד עם זה, ובמה נתקעים?`;
        case 'V':
            return `כשאת/ה אומר/ת "${focus}", מה זה אומר בשבילך ולמה זה כל כך חשוב?`;
        case 'I':
            return `כשאת/ה אומר/ת "${focus}", מה זה גורם לך לחשוב על עצמך כאדם?`;
        case 'S':
            return `כשאת/ה אומר/ת "${focus}", לאיזה סיפור רחב יותר או מקום בקשר זה מתחבר?`;
        default:
            return `כשאת/ה אומר/ת "${focus}", מה הכי חשוב לפתוח כאן עכשיו?`;
        }
    }

    function therapistLeadQuestion(targetLevel = '', focusText = '') {
        const focus = escapeHtml(normalizeUiText(focusText || '').trim() || 'החוויה הזאת');
        switch (therapistNormalizeLevel(targetLevel)) {
        case 'E':
            return `באיזה מצבים "${focus}" קורה יותר, ועם מי זה משתנה?`;
        case 'B':
            return `מה הוא עושה או לא עושה בפועל שגורם ל-"${focus}" להרגיש כך?`;
        case 'C':
            return `איך את/ה מנסה להתמודד עם "${focus}", ומה היה עוזר לעשות זאת אחרת?`;
        case 'V':
            return `כש"${focus}" קורה, מה זה אומר לך ולמה זה כל כך חשוב?`;
        case 'I':
            return `כש"${focus}" קורה, איזה אדם את/ה נהיה/ית בתוך זה?`;
        case 'S':
            return `כש"${focus}" קורה, לאיזה דפוס רחב יותר או מקום בקשר זה מתחבר?`;
        default:
            return `מה עוד מתבהר כשנשארים עם "${focus}" עוד רגע אחד?`;
        }
    }

    function therapistPossibleResponse(targetLevel = '', focusText = '') {
        const normalized = therapistNormalizeLevel(targetLevel);
        const info = LOGICAL_LEVEL_INFO[normalized] || LOGICAL_LEVEL_INFO.V;
        const focus = normalizeUiText(focusText || '').trim() || 'זה';
        const samples = {
            E: `אולי יופיעו זמן, מקום, או אדם מסוים: "זה קורה בעיקר כשעולה ${escapeHtml(focus)} מולו בערב."`,
            B: `אולי יופיע תיאור קונקרטי יותר: "הוא עונה קצר, לא שואל, ואני נסגרת ברגע שעולה ${escapeHtml(focus)}."`,
            C: `אולי יופיע מידע על ניסיון ותקיעות: "אני מנסה לדבר על ${escapeHtml(focus)} אבל לא מצליחה להישאר ברורה."`,
            V: `אולי תעלה משמעות חדשה: "כשעולה ${escapeHtml(focus)}, אני מיד מבינה מזה שאני לא באמת חשובה."`,
            I: `אולי תעלה הבנת זהות: "בתוך ${escapeHtml(focus)} אני נהיית אדם קטן ושקט יותר."`,
            S: `אולי תעלה תמונה רחבה יותר: "זה מחבר אותי לסיפור ישן שאין לי באמת מקום כשעולה ${escapeHtml(focus)}."`
        };
        return {
            sample: samples[normalized] || info.responseSample,
            openings: info.openings || []
        };
    }

    function therapistJoinNote(prism, level = '') {
        const info = LOGICAL_LEVEL_INFO[therapistNormalizeLevel(level)] || LOGICAL_LEVEL_INFO.V;
        const category = therapistGetPrismCopy(prism);
        return `נשאר/ת בתוך ${info.hebrew} כדי שהמטופל/ת ירגיש/תרגיש מובן/ת, ובמקביל פותח/ת בעדינות את ${category.recognition.toLowerCase()}`;
    }

    function therapistLeadNote(currentLevel = '', targetLevel = '', direction = '') {
        const currentInfo = LOGICAL_LEVEL_INFO[therapistNormalizeLevel(currentLevel)] || LOGICAL_LEVEL_INFO.V;
        const targetInfo = LOGICAL_LEVEL_INFO[therapistNormalizeLevel(targetLevel)] || LOGICAL_LEVEL_INFO.V;
        if (direction === 'ground') {
            return `יורדים מעט מ-${currentInfo.hebrew} אל ${targetInfo.hebrew} כדי לקבל יותר דוגמאות, רצף, וקרקע שאפשר לעבוד איתה.`;
        }
        return `עולים מעט מ-${currentInfo.hebrew} אל ${targetInfo.hebrew} כדי לפתוח משמעות, זהות, או תמונה רחבה שעדיין לא נאמרו.`;
    }

    function therapistStateFromUi(prism, options = {}) {
        const detail = document.getElementById('prism-detail');
        const sentenceInput = therapistGetSentenceInput();
        const anchorInput = getPrismAnchorInputEl();

        let sentenceText = normalizeUiText(sentenceInput?.value || '').trim();
        if (!sentenceText) {
            sentenceText = therapistGetExampleSentence(prism) || '';
            if (sentenceInput && options.seedExample !== false) sentenceInput.value = sentenceText;
        }

        let focusText = normalizeUiText(anchorInput?.value || '').trim();
        if (!focusText) {
            focusText = therapistDeriveFocus(sentenceText, prism);
            if (anchorInput && options.syncAnchor !== false) anchorInput.value = focusText;
        }

        const selectedLevel = therapistNormalizeLevel(detail?.dataset.selectedLevel || '') || therapistGetDefaultLevel(prism);
        if (detail) detail.dataset.selectedLevel = selectedLevel;

        const availableDirections = therapistGetDirections(selectedLevel);
        let leadDirection = String(detail?.dataset.leadDirection || '').trim() || therapistGetSuggestedDirection(selectedLevel);
        if (!availableDirections.includes(leadDirection)) {
            leadDirection = availableDirections[0] || 'expand';
            if (detail) detail.dataset.leadDirection = leadDirection;
        }

        const targetLevel = therapistGetTargetLevel(selectedLevel, leadDirection);
        const levelInfo = LOGICAL_LEVEL_INFO[selectedLevel] || LOGICAL_LEVEL_INFO.V;
        const targetInfo = LOGICAL_LEVEL_INFO[targetLevel] || LOGICAL_LEVEL_INFO.V;

        return {
            prism,
            sentenceText,
            focusText,
            selectedLevel,
            levelLabel: levelInfo.hebrew,
            leadDirection,
            availableDirections,
            targetLevel,
            targetLevelLabel: targetInfo.hebrew,
            categoryLabel: therapistGetPrismDisplayName(prism),
            joinQuestion: therapistQuestionForLevel(selectedLevel, focusText),
            joinNotePlain: therapistJoinNote(prism, selectedLevel),
            leadQuestion: therapistLeadQuestion(targetLevel, focusText),
            leadNotePlain: therapistLeadNote(selectedLevel, targetLevel, leadDirection),
            possibleResponse: therapistPossibleResponse(targetLevel, focusText)
        };
    }

    function therapistRenderLevelSelector(selectedLevel = '') {
        const root = document.getElementById('prism-level-grid');
        if (!root) return;
        root.innerHTML = PRISM_LAB_LEVEL_ORDER.map((level) => {
            const info = LOGICAL_LEVEL_INFO[level];
            const isSelected = level === selectedLevel;
            const anchorHtml = (info.anchorQuestions || [])
                .slice(0, 3)
                .map((question) => `<li>${escapeHtml(question)}</li>`)
                .join('');
            return `
                <button type="button" class="prism-level-card${isSelected ? ' is-selected' : ''}" data-prism-level="${level}" aria-pressed="${isSelected ? 'true' : 'false'}">
                    <div class="prism-level-card-head">
                        <span class="prism-level-badge">${isSelected ? 'נבחרה' : 'בחר/י רמה'}</span>
                        <h4>${escapeHtml(info.hebrew)}</h4>
                    </div>
                    <p>${escapeHtml(info.description || info.prompt || '')}</p>
                    <ul class="prism-level-anchors">${anchorHtml}</ul>
                </button>
            `;
        }).join('');
    }

    function therapistRenderActiveSentence(prism, sentenceText = '', focusText = '') {
        const target = document.getElementById('prism-active-sentence');
        if (!target) return;
        const sentence = normalizeUiText(sentenceText || '').trim() || therapistGetExampleSentence(prism) || 'כתבו כאן את המשפט שהמטופל/ת אמר/ה.';
        const focus = normalizeUiText(focusText || '').trim() || therapistDeriveFocus(sentence, prism);
        target.innerHTML = `
            <div class="prism-active-sentence-kicker">המשפט נשאר במרכז לאורך כל העבודה</div>
            <p class="prism-active-sentence-main">"${escapeHtml(sentence)}"</p>
            <p class="prism-active-sentence-sub"><strong>פותחים כרגע:</strong> ${escapeHtml(focus || 'המשפט כולו')} | <strong>מטרה:</strong> להצטרף קודם, ואז להוביל לרמה קרובה.</p>
        `;
    }

    function therapistRenderGuide(prism, state) {
        const guideEl = document.getElementById('prism-deep-guide');
        if (!guideEl || !prism || !state) return;
        const family = therapistGetPrismFamilyInfo(prism);
        const category = therapistGetPrismCopy(prism);
        const levelInfo = LOGICAL_LEVEL_INFO[state.selectedLevel] || LOGICAL_LEVEL_INFO.V;
        guideEl.innerHTML = `
            <div class="prism-helper-callout">
                <p><strong>המטרה איננה לתקן את המטופל/ת - אלא לפתוח את המפה.</strong></p>
                <p>אם יש ספק בקטגוריה, חפש/י מה בדיוק חסר, הוכלל, קובע, או קיבל משמעות גדולה מדי.</p>
            </div>
            <div class="prism-helper-grid">
                <article class="prism-helper-card">
                    <h4>קטגוריית מטה-מודל</h4>
                    <p><strong>${escapeHtml(therapistGetPrismDisplayName(prism))}</strong></p>
                    <p>${escapeHtml(category.recognition)}</p>
                    <p class="prism-helper-card-note">הקטגוריה עונה על השאלה: מה בולט בשפה כאן?</p>
                </article>
                <article class="prism-helper-card">
                    <h4>רמה לוגית</h4>
                    <p><strong>${escapeHtml(levelInfo.hebrew)}</strong></p>
                    <p>${escapeHtml(levelInfo.description || levelInfo.prompt || '')}</p>
                    <p class="prism-helper-card-note">הרמה עונה על השאלה: מאיזו שכבת חוויה המשפט נאמר עכשיו?</p>
                </article>
            </div>
            <p class="prism-helper-line"><strong>משפחת הקטגוריה:</strong> ${escapeHtml(family.label)}. ${escapeHtml(family.therapistCopy)}</p>
        `;
    }

    function therapistRenderRecognition(prism, state) {
        const family = therapistGetPrismFamilyInfo(prism);
        const category = therapistGetPrismCopy(prism);
        const levelInfo = LOGICAL_LEVEL_INFO[state.selectedLevel] || LOGICAL_LEVEL_INFO.V;

        const prismName = document.getElementById('prism-name');
        const prismDesc = document.getElementById('prism-desc');
        const prismAnchor = document.getElementById('prism-anchor');
        const selectedLevelName = document.getElementById('prism-selected-level-name');
        const selectedLevelDesc = document.getElementById('prism-selected-level-desc');
        const selectedLevelAnchors = document.getElementById('prism-selected-level-anchors');

        if (prismName) prismName.textContent = therapistGetPrismDisplayName(prism);
        if (prismDesc) prismDesc.textContent = `${category.recognition} ${category.therapistMove}`;
        if (prismAnchor) prismAnchor.textContent = `משפחת הקטגוריה: ${family.label}. ${family.therapistCopy}`;
        if (selectedLevelName) selectedLevelName.textContent = levelInfo.hebrew;
        if (selectedLevelDesc) selectedLevelDesc.textContent = levelInfo.description || levelInfo.prompt || '';
        if (selectedLevelAnchors) {
            selectedLevelAnchors.innerHTML = (levelInfo.anchorQuestions || [])
                .slice(0, 2)
                .map((question) => `<span>${escapeHtml(question)}</span>`)
                .join('');
        }
    }

    function therapistRenderFlow(state) {
        const joinQuestion = document.getElementById('prism-joining-question');
        const joinNote = document.getElementById('prism-joining-note');
        const leadQuestion = document.getElementById('prism-leading-question');
        const leadNote = document.getElementById('prism-leading-note');
        const targetLevel = document.getElementById('prism-target-level');
        const possibleResponse = document.getElementById('prism-possible-response');
        const openingsList = document.getElementById('prism-openings-list');

        if (joinQuestion) joinQuestion.innerHTML = state.joinQuestion;
        if (joinNote) joinNote.textContent = state.joinNotePlain;
        if (leadQuestion) leadQuestion.innerHTML = state.leadQuestion;
        if (leadNote) leadNote.textContent = state.leadNotePlain;
        if (targetLevel) targetLevel.textContent = state.targetLevelLabel;
        if (possibleResponse) possibleResponse.textContent = state.possibleResponse.sample;
        if (openingsList) {
            openingsList.innerHTML = (state.possibleResponse.openings || [])
                .map((item) => `<li>${escapeHtml(item)}</li>`)
                .join('');
        }

        document.querySelectorAll('[data-prism-direction]').forEach((button) => {
            const direction = String(button.getAttribute('data-prism-direction') || '').trim();
            const available = state.availableDirections.includes(direction);
            button.classList.toggle('is-active', direction === state.leadDirection);
            button.disabled = !available;
        });
    }

    function therapistRenderSummary(state) {
        const out = document.getElementById('prism-result');
        if (!out || !state) return;
        out.innerHTML = `
            <h4>סיכום העבודה הנוכחי</h4>
            <div class="prism-summary-grid">
                <article class="prism-summary-card">
                    <h5>מה זיהינו?</h5>
                    <p><strong>משפט:</strong> "${escapeHtml(state.sentenceText)}"</p>
                    <p><strong>קטגוריה:</strong> ${escapeHtml(state.categoryLabel)}</p>
                    <p><strong>רמה נוכחית:</strong> ${escapeHtml(state.levelLabel)}</p>
                </article>
                <article class="prism-summary-card">
                    <h5>מה נשאל עכשיו?</h5>
                    <p><strong>שאלה מצטרפת:</strong> ${state.joinQuestion}</p>
                    <p><strong>שאלת הובלה:</strong> ${state.leadQuestion}</p>
                </article>
                <article class="prism-summary-card">
                    <h5>מה עשוי להיפתח?</h5>
                    <p>${state.possibleResponse.sample}</p>
                    <p><strong>מוביל אל:</strong> ${escapeHtml(state.targetLevelLabel)}</p>
                </article>
            </div>
            <div class="action-buttons">
                <button class="btn btn-secondary" onclick="exportPrismSession()">ייצא סיכום</button>
            </div>
        `;
    }

    function therapistRenderSecondaryDrawers(prism, state) {
        const deepening = document.getElementById('prism-deepening-body');
        const examples = document.getElementById('prism-examples-body');
        const mistakes = document.getElementById('prism-mistakes-body');
        const category = therapistGetPrismCopy(prism);
        const family = therapistGetPrismFamilyInfo(prism);
        const levelInfo = LOGICAL_LEVEL_INFO[state.selectedLevel] || LOGICAL_LEVEL_INFO.V;
        const targetInfo = LOGICAL_LEVEL_INFO[state.targetLevel] || LOGICAL_LEVEL_INFO.V;

        if (deepening) {
            deepening.innerHTML = `
                <div class="prism-drawer-grid">
                    <article class="prism-drawer-card">
                        <h5>למה הרמה הזו חשובה עכשיו?</h5>
                        <p>${escapeHtml(levelInfo.description || levelInfo.prompt || '')}</p>
                        <p>ברמה הזו אנחנו פוגשים את המשפט מבפנים, בלי לקפוץ מיד להסבר רחב מדי.</p>
                    </article>
                    <article class="prism-drawer-card">
                        <h5>מה מטפלים לעיתים מפספסים כאן?</h5>
                        <p>${escapeHtml(levelInfo.therapistMiss || 'כדאי להישאר קרובים לחוויה לפני שקופצים לפרשנות.')}</p>
                    </article>
                    <article class="prism-drawer-card">
                        <h5>איך הרמה פוגשת את הקטגוריה?</h5>
                        <p><strong>${escapeHtml(therapistGetPrismDisplayName(prism))}</strong> שייכת למשפחת ${escapeHtml(family.label)}.</p>
                        <p>${escapeHtml(category.therapistMove)}</p>
                        <p>כאן בודקים גם את ${escapeHtml(levelInfo.hebrew)} וגם את מה שהשפה מסתירה או מקבעת.</p>
                    </article>
                    <article class="prism-drawer-card">
                        <h5>למה ההובלה הזו נבחרה?</h5>
                        <p>${escapeHtml(state.leadNotePlain)}</p>
                        <p>המטרה היא לפתוח מעבר קטן אל ${escapeHtml(targetInfo.hebrew)}, לא לנתק את המטופל/ת מהחוויה שלו/ה.</p>
                    </article>
                </div>
            `;
        }

        if (examples) {
            const categoryQuestions = (prism.anchor_question_templates || [])
                .slice(0, 3)
                .map((question) => `<li>${escapeHtml(normalizeUiText(question || ''))}</li>`)
                .join('');
            const levelQuestions = (levelInfo.anchorQuestions || [])
                .map((question) => `<li>${escapeHtml(question)}</li>`)
                .join('');
            const exampleItems = Array.from(new Set([
                normalizeUiText(state.sentenceText || '').trim(),
                normalizeUiText(therapistGetExampleSentence(prism) || '').trim(),
                ...((prism.examples || []).map((item) => normalizeUiText(item || '').trim()))
            ].filter(Boolean))).slice(0, 4)
                .map((item) => `<li>${escapeHtml(item)}</li>`)
                .join('');

            examples.innerHTML = `
                <div class="prism-drawer-grid">
                    <article class="prism-drawer-card">
                        <h5>שאלות עוגן ברמת ${escapeHtml(levelInfo.hebrew)}</h5>
                        <ul class="prism-drawer-list">${levelQuestions}</ul>
                    </article>
                    <article class="prism-drawer-card">
                        <h5>שאלות מטה-מודל נוספות ל-${escapeHtml(therapistGetPrismDisplayName(prism))}</h5>
                        <ul class="prism-drawer-list">${categoryQuestions || '<li>אין שאלות נוספות זמינות כרגע.</li>'}</ul>
                    </article>
                    <article class="prism-drawer-card">
                        <h5>דוגמאות לעבודה</h5>
                        <ul class="prism-drawer-list">${exampleItems || '<li>אין דוגמאות זמינות כרגע.</li>'}</ul>
                    </article>
                </div>
            `;
        }

        if (mistakes) {
            const defaultMistakes = [
                'להתווכח עם הניסוח במקום לפתוח אותו.',
                'לקפוץ ישר לרמה גבוהה מדי בלי להצטרף קודם.',
                'לחפש תשובה "נכונה" במקום לחפש מידע חדש.'
            ];
            if (String(prism?.id || '') === 'nominalization' || String(prism?.id || '') === 'nominalisations') {
                defaultMistakes.unshift('להתעקש על הגדרה בלי לחקור מרכיבים, פעולות, ורגעים.');
            }
            const antiPatterns = Array.from(new Set([
                ...((prism.anti_patterns || []).map((item) => normalizeUiText(item || '').trim()).filter(Boolean)),
                ...defaultMistakes
            ])).slice(0, 5)
                .map((item) => `<li>${escapeHtml(item)}</li>`)
                .join('');

            mistakes.innerHTML = `
                <div class="prism-drawer-grid">
                    <article class="prism-drawer-card">
                        <h5>טעויות נפוצות</h5>
                        <ul class="prism-drawer-list">${antiPatterns}</ul>
                    </article>
                    <article class="prism-drawer-card">
                        <h5>טיפ</h5>
                        <p>אם יש ספק ברמה, קצר/י את המשפט לשורה קונקרטית אחת ובדוק/י האם הוא מדבר על מה שקורה, על איך עושים, על מה זה אומר, או על מי האדם נעשה בתוך זה.</p>
                        <p>המטרה איננה לתקן את המטופל/ת - אלא לפתוח את המפה, ולתת לעוד מידע להגיע.</p>
                    </article>
                </div>
            `;
        }

        therapistRenderSummary(state);
    }

    function therapistRenderWorkspace(prism, options = {}) {
        if (!prism) return null;
        const state = therapistStateFromUi(prism, options);
        prismVerticalStackState = Object.assign({}, prismVerticalStackState || {}, state, {
            categoryId: prism.id,
            categoryLabelHe: state.categoryLabel,
            coreQuestion: getPrismCoreQuestion(prism),
            anchorText: state.focusText,
            currentSentence: state.sentenceText,
            targetLevel: state.targetLevel
        });

        therapistRenderActiveSentence(prism, state.sentenceText, state.focusText);
        therapistRenderRecognition(prism, state);
        therapistRenderFlow(state);
        therapistRenderLevelSelector(state.selectedLevel);
        therapistRenderGuide(prism, state);
        therapistRenderSecondaryDrawers(prism, state);
        return state;
    }

    renderPrismActiveSentenceCard = therapistRenderActiveSentence;
    renderPrismDeepGuide = therapistRenderGuide;

    savePrismVerticalStackDraftForCurrentPrism = function savePrismVerticalStackDraftForCurrentPrismTherapist() {
        const prism = getCurrentPrismFromDetail();
        if (!prism) return;
        const detail = document.getElementById('prism-detail');
        if (!detail || detail.classList.contains('hidden')) return;

        const state = therapistStateFromUi(prism, { seedExample: false, syncAnchor: false });
        const draft = {
            categoryId: prism.id,
            categoryLabelHe: state.categoryLabel,
            coreQuestion: getPrismCoreQuestion(prism),
            sentenceText: state.sentenceText,
            anchorText: state.focusText,
            selectedLevel: state.selectedLevel,
            leadDirection: state.leadDirection
        };

        try {
            const store = getPrismVerticalStackDraftStore();
            store[prism.id] = draft;
            localStorage.setItem(PRISM_VERTICAL_STACK_DRAFT_KEY, JSON.stringify(store));
        } catch (error) {
            console.warn('Failed to persist Prism Lab draft', error);
        }
        prismVerticalStackState = Object.assign({}, prismVerticalStackState || {}, draft);
    };

    schedulePrismVerticalStackDraftSave = function schedulePrismVerticalStackDraftSaveTherapist() {
        if (prismDraftSaveTimer) {
            clearTimeout(prismDraftSaveTimer);
            prismDraftSaveTimer = null;
        }
        prismDraftSaveTimer = window.setTimeout(() => {
            prismDraftSaveTimer = null;
            savePrismVerticalStackDraftForCurrentPrism();
        }, PRISM_DRAFT_SAVE_DEBOUNCE_MS);
    };

    flushPrismVerticalStackDraftSave = function flushPrismVerticalStackDraftSaveTherapist() {
        if (prismDraftSaveTimer) {
            clearTimeout(prismDraftSaveTimer);
            prismDraftSaveTimer = null;
        }
        savePrismVerticalStackDraftForCurrentPrism();
    };

    schedulePrismVerticalStackAnchorRefresh = function schedulePrismVerticalStackAnchorRefreshTherapist(options = {}) {
        if (prismAnchorRefreshTimer) {
            clearTimeout(prismAnchorRefreshTimer);
            prismAnchorRefreshTimer = null;
        }
        prismAnchorRefreshTimer = window.setTimeout(() => {
            prismAnchorRefreshTimer = null;
            refreshPrismVerticalStackForCurrentPrism(options);
        }, PRISM_ANCHOR_REFRESH_DEBOUNCE_MS);
    };

    applyVerticalStackStateToUI = function applyVerticalStackStateToUiTherapist(prism, draft) {
        const detail = document.getElementById('prism-detail');
        const sentenceInput = therapistGetSentenceInput();
        const anchorInput = getPrismAnchorInputEl();
        const selectedLevel = therapistNormalizeLevel(draft?.selectedLevel || '') || therapistGetDefaultLevel(prism);
        const sentenceText = normalizeUiText(draft?.sentenceText || '').trim() || therapistGetExampleSentence(prism) || '';
        let anchorText = normalizeUiText(draft?.anchorText || '').trim();
        if (!anchorText) anchorText = therapistDeriveFocus(sentenceText, prism);
        if (detail) {
            detail.dataset.selectedLevel = selectedLevel;
            detail.dataset.leadDirection = String(draft?.leadDirection || '').trim() || therapistGetSuggestedDirection(selectedLevel);
        }
        if (sentenceInput) sentenceInput.value = sentenceText;
        if (anchorInput) anchorInput.value = anchorText;
        therapistRenderWorkspace(prism, { seedExample: true, syncAnchor: true });
    };

    refreshPrismVerticalStackForCurrentPrism = function refreshPrismVerticalStackForCurrentPrismTherapist(options = {}) {
        const prism = getCurrentPrismFromDetail();
        if (!prism) return;
        therapistRenderWorkspace(prism, {
            seedExample: options.seedExample !== false,
            syncAnchor: options.forceDefaultAnchor !== false
        });
        schedulePrismVerticalStackDraftSave();
    };

    applyPrismLabCompactRuntimeCopy = function applyPrismLabCompactRuntimeCopyTherapist() {
        const root = document.getElementById('prismlab');
        const rootCard = root?.querySelector('.prism-container .card');
        const rootTitle = rootCard?.querySelector(':scope > h2');
        const rootIntro = rootCard?.querySelector(':scope > p');
        const shellNote = rootCard?.querySelector('.prism-shell-note');
        if (rootTitle) rootTitle.textContent = 'מעבדת הפריזמות';
        if (rootIntro) rootIntro.textContent = 'כאן עובדים על המשפט עצמו. מזהים מה בולט בשפה, מזהים מאיזו רמה החוויה מדברת, ואז בונים שאלה מצטרפת, שאלת הובלה, ומה עשוי להיפתח בתגובה.';
        if (shellNote) shellNote.textContent = 'המשפט נשאר מולך כל הזמן. העמקה, דוגמאות, טעויות נפוצות וסיכום נפתחים רק כשצריך.';
    };

    ensurePrismLabWorkLayout = function ensurePrismLabWorkLayoutTherapist() {
        return;
    };

    applyPrismLabVisualHierarchyEnhancements = function applyPrismLabVisualHierarchyEnhancementsTherapist() {
        return;
    };

    renderPrismLibrary = function renderPrismLibraryTherapist() {
        const lib = document.getElementById('prism-library');
        if (!lib || !metaModelData?.prisms) return;
        lib.innerHTML = '';
        metaModelData.prisms.forEach((prism) => {
            const family = therapistGetPrismFamilyInfo(prism);
            const category = therapistGetPrismCopy(prism);
            const sentence = therapistGetExampleSentence(prism);
            const div = document.createElement('div');
            div.className = 'prism-card';
            div.innerHTML = `
                <h4>${escapeHtml(therapistGetPrismDisplayName(prism))}</h4>
                <p class="prism-card-subtitle">${escapeHtml(family.label)}</p>
                <p>${escapeHtml(category.recognition)}</p>
                <p class="prism-card-example"><strong>דוגמה:</strong> ${escapeHtml(sentence || normalizeUiText(prism?.examples?.[0] || '') || 'אין דוגמה זמינה')}</p>
                <div style="margin-top:10px"><button class="btn prism-open-btn" data-ui-sound="off" data-id="${escapeHtml(String(prism.id || ''))}">פתח/י קטגוריה</button></div>
            `;
            const openBtn = div.querySelector('.prism-open-btn');
            if (openBtn) {
                openBtn.addEventListener('click', (event) => {
                    event.stopPropagation();
                    openPrism(prism.id);
                });
            }
            lib.appendChild(div);
        });
    };

    setupPrismModule = function setupPrismModuleTherapist() {
        applyPrismLabCompactRuntimeCopy();
        renderPrismLibrary();

        const prismDetail = document.getElementById('prism-detail');
        const prismLibrary = document.getElementById('prism-library');
        if (prismDetail) prismDetail.classList.add('hidden');
        if (prismLibrary) prismLibrary.classList.remove('hidden');

        const sentenceInput = therapistGetSentenceInput();
        if (sentenceInput && sentenceInput.dataset.boundPrismTherapist !== 'true') {
            sentenceInput.dataset.boundPrismTherapist = 'true';
            sentenceInput.addEventListener('input', () => schedulePrismVerticalStackAnchorRefresh({ forceDefaultAnchor: false }));
            sentenceInput.addEventListener('blur', () => {
                refreshPrismVerticalStackForCurrentPrism({ forceDefaultAnchor: false });
                flushPrismVerticalStackDraftSave();
            });
        }

        if (prismDetail && prismDetail.dataset.boundPrismTherapistWorkspace !== 'true') {
            prismDetail.dataset.boundPrismTherapistWorkspace = 'true';
            prismDetail.addEventListener('click', (event) => {
                const levelButton = event.target.closest('[data-prism-level]');
                if (levelButton) {
                    prismDetail.dataset.selectedLevel = String(levelButton.getAttribute('data-prism-level') || '').trim();
                    const available = therapistGetDirections(prismDetail.dataset.selectedLevel);
                    if (!available.includes(prismDetail.dataset.leadDirection || '')) {
                        prismDetail.dataset.leadDirection = available[0] || 'expand';
                    }
                    refreshPrismVerticalStackForCurrentPrism({ forceDefaultAnchor: false });
                    return;
                }

                const directionButton = event.target.closest('[data-prism-direction]');
                if (directionButton) {
                    const direction = String(directionButton.getAttribute('data-prism-direction') || '').trim();
                    if (!direction) return;
                    prismDetail.dataset.leadDirection = direction;
                    refreshPrismVerticalStackForCurrentPrism({ forceDefaultAnchor: false });
                }
            });
        }
    };

    openPrism = function openPrismTherapist(id) {
        const prism = getPrismById(id);
        if (!prism) return alert('הקטגוריה לא נמצאה');
        if (prismAnchorRefreshTimer) {
            clearTimeout(prismAnchorRefreshTimer);
            prismAnchorRefreshTimer = null;
        }

        flushPrismVerticalStackDraftSave();
        document.getElementById('prism-library')?.classList.add('hidden');
        const detail = document.getElementById('prism-detail');
        if (!detail) return;
        detail.classList.remove('hidden');
        detail.setAttribute('data-prism-id', id);

        const draft = loadPrismVerticalStackDraft(id);
        applyVerticalStackStateToUI(prism, draft || {
            categoryId: prism.id,
            categoryLabelHe: therapistGetPrismDisplayName(prism),
            coreQuestion: getPrismCoreQuestion(prism),
            sentenceText: therapistGetExampleSentence(prism),
            anchorText: therapistDeriveFocus(therapistGetExampleSentence(prism), prism),
            selectedLevel: therapistGetDefaultLevel(prism),
            leadDirection: therapistGetSuggestedDirection(therapistGetDefaultLevel(prism))
        });

        const summaryDrawer = document.getElementById('prism-summary-drawer');
        if (summaryDrawer) summaryDrawer.open = false;
        playUISound('prism_open');
    };

    populatePreparedItems = function populatePreparedItemsTherapist(prism) {
        if (!prism) return;
        therapistRenderWorkspace(prism, { seedExample: false, syncAnchor: false });
    };

    attachMappingDropHandlers = function attachMappingDropHandlersTherapist() { return; };
    applyPreparedTextToInput = function applyPreparedTextToInputTherapist() { return; };
    copyPreparedToFocusedOrEmpty = function copyPreparedToFocusedOrEmptyTherapist() { return; };

    handlePrismSubmit = function handlePrismSubmitTherapist() {
        const prism = getCurrentPrismFromDetail();
        if (!prism) return alert('אין קטגוריה פעילה');
        const state = therapistRenderWorkspace(prism, { seedExample: true, syncAnchor: true });
        if (!state?.sentenceText) {
            playUISound('prism_error');
            showHintMessage('כתבו קודם את המשפט שהמטופל/ת אמר/ה, ואז שמרו סיכום עבודה.');
            return;
        }

        const session = {
            datetime: new Date().toISOString(),
            mode: 'therapist_intervention_flow',
            prism_id: prism.id,
            prism_name: state.categoryLabel,
            meta_model_family: therapistGetPrismFamilyInfo(prism).label,
            sentence: state.sentenceText,
            focus: state.focusText,
            current_level: state.selectedLevel,
            current_level_label: state.levelLabel,
            lead_direction: state.leadDirection,
            target_level: state.targetLevel,
            target_level_label: state.targetLevelLabel,
            joining_question: normalizeUiText(String(state.joinQuestion || '').replace(/<[^>]+>/g, '')),
            leading_question: normalizeUiText(String(state.leadQuestion || '').replace(/<[^>]+>/g, '')),
            likely_response: state.possibleResponse.sample,
            likely_openings: state.possibleResponse.openings || []
        };

        savePrismSession(session);
        const summaryDrawer = document.getElementById('prism-summary-drawer');
        if (summaryDrawer) summaryDrawer.open = true;
        showHintMessage('הסיכום נשמר. אפשר לפתוח את "סיכום / ייצוא" כדי לייצא או לעבור שוב על המהלך.');
        playUISound('prism_submit');
    };

    savePrismSession = function savePrismSessionTherapist(session) {
        const key = 'prism_sessions';
        const raw = localStorage.getItem(key);
        const arr = raw ? JSON.parse(raw) : [];
        arr.unshift(session);
        while (arr.length > 10) arr.pop();
        localStorage.setItem(key, JSON.stringify(arr));
    };

    exportPrismSession = function exportPrismSessionTherapist() {
        const key = 'prism_sessions';
        const raw = localStorage.getItem(key) || '[]';
        const blob = new Blob([raw], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `prism_sessions_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    try {
        setupPrismModule();
    } catch (error) {
        console.warn('Prism Lab therapist override init failed', error);
    }

})();
