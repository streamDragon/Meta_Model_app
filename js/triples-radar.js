(function attachTriplesRadarModule(rootFactory) {
    const root = typeof globalThis !== 'undefined'
        ? globalThis
        : (typeof window !== 'undefined' ? window : this);
    const api = rootFactory(root);
    root.setupTriplesRadarModule = api.setupTriplesRadarModule;
})(function createTriplesRadarModule(root) {
    const STORAGE_KEY = 'triples_radar_progress_v1';
    const UI_MODE_STORAGE_KEY = 'triples_radar_ui_mode_v2';
    const UI_MODE_BY_TOGGLE_KEY = Object.freeze({
        details: 'details',
        rules: 'rules'
    });
    const TOGGLE_KEY_BY_UI_MODE = Object.freeze({
        details: 'details',
        rules: 'rules'
    });

    const MODE_META = Object.freeze({
        details: Object.freeze({
            label: 'פרטים',
            title: 'מצב פרטים · מחזירים את המשפט לקרקע',
            note: 'מחפשים מה חסר בתוך המשפט: מי, מה, מתי, איך, ולפי מה.',
            step: 'שלב 1: קרא/י את המשפט. שלב 2: בחר/י את כיוון החשיבה שמחזיר הכי מהר פרטים חסרים, ואז דייק/י לתבנית.',
            solvedStep: 'הכיוון ברור. עכשיו אפשר לנסח מה חסר במשפט, או לעבור למקרה הבא.',
            introFeedback: 'מצב פרטים: עובדים מבפנים ומחזירים למשפט שמות, הקשר, זמן, פעולה ומבחן מציאות.',
            strongestTitle: 'מה הכיוון כאן?',
            strongestLead: 'במצב פרטים זה הכיוון שמחזיר הכי מהר את המידע שחסר בתוך המשפט.',
            nextMoveLabel: 'מה כדאי לשאול עכשיו',
            rowBadge: 'כיוון חזק'
        }),
        rules: Object.freeze({
            label: 'כללים',
            title: 'מצב כללים · רואים את המסגרת שמארגנת את המשפט',
            note: 'מחפשים איזה כלל, פירוש, שיפוט או מסגרת נותנים למשפט את המשמעות שלו.',
            step: 'שלב 1: קרא/י את המשפט. שלב 2: בחר/י את כיוון החשיבה שמארגן את הסיפור לכלל, פירוש או מסגרת, ואז דייק/י לתבנית.',
            solvedStep: 'המסגרת ברורה. עכשיו אפשר לנסח איזה כלל מנהל את המשפט, או לעבור למקרה הבא.',
            introFeedback: 'מצב כללים: עובדים מלמעלה ובודקים איזה כלל, שיפוט או פירוש מחזיקים את האמירה במקום.',
            strongestTitle: 'מה המסגרת החזקה כאן?',
            strongestLead: 'במצב כללים זה הכיוון שמסביר איזה כלל או פירוש מארגנים את האמירה.',
            nextMoveLabel: 'איך מפרקים את הכלל',
            rowBadge: 'מסגרת חזקה'
        })
    });

    const ROW_META = Object.freeze({
        row1: Object.freeze({
            colorClass: 'row-sky',
            canonicalLabel: 'שלשה ראשונה',
            directionLabel: 'כיוון ראשון',
            heading: 'מקור, הנחה וכוונה',
            directions: Object.freeze({
                details: 'בודקים מי קבע, מה הונח מראש, ואיזו כוונה יוחסה בלי ראיה.',
                rules: 'בודקים איזה שיפוט סמוי, הנחת יסוד או ייחוס כוונה מארגנים את המשפט.'
            })
        }),
        row2: Object.freeze({
            colorClass: 'row-teal',
            canonicalLabel: 'שלשה שנייה',
            directionLabel: 'כיוון שני',
            heading: 'חוקי משחק וגבולות',
            directions: Object.freeze({
                details: 'בודקים מה בדיוק חייב, אפשר או גורם למה, ואיפה חסר תנאי ברור.',
                rules: 'בודקים איזה חוק משחק, מגבלה או חוק סיבתי קובעים כאן את הסיפור.'
            })
        }),
        row3: Object.freeze({
            colorClass: 'row-amber',
            canonicalLabel: 'שלשה שלישית',
            directionLabel: 'כיוון שלישי',
            heading: 'משמעות, זהות והסקה',
            directions: Object.freeze({
                details: 'בודקים איפה פעולה חיה הפכה לשם, לזהות או למסקנה רחבה מדי.',
                rules: 'בודקים איזה פירוש הופך אירוע למשמעות, לזהות או להוכחה.'
            })
        }),
        row4: Object.freeze({
            colorClass: 'row-violet',
            canonicalLabel: 'שלשה רביעית',
            directionLabel: 'כיוון רביעי',
            heading: 'הקשר, זמן וייחוס',
            directions: Object.freeze({
                details: 'בודקים מי בדיוק, מתי בדיוק, איפה בדיוק וביחס למה.',
                rules: 'בודקים איזו מסגרת הקשר גורמת לטענה להישמע מוחלטת למרות שהיא תלויה בזמן, מקום או ייחוס.'
            })
        }),
        row5: Object.freeze({
            colorClass: 'row-rose',
            canonicalLabel: 'שלשה חמישית',
            directionLabel: 'כיוון חמישי',
            heading: 'קרקע חושית ופעולה',
            directions: Object.freeze({
                details: 'בודקים מה רואים, שומעים או מרגישים בפועל, ומה קורה צעד-צעד.',
                rules: 'בודקים לאיזה מבחן מציאות או צעד התנהגותי צריך להחזיר את המשפט.'
            })
        })
    });

    const CATEGORY_META = Object.freeze({
        lost_performative: Object.freeze({
            detailsWhy: 'יש כאן שיפוט בלי לציין של מי הסטנדרט או לפי איזה קריטריון הוא נקבע.',
            rulesWhy: 'המשפט מציג כלל ערכי כאילו הוא עובדה אובייקטיבית ולא עמדה של מישהו.',
            nextPrompt: 'לפי מי זה נכון, לא נכון, הוגן או לא הוגן?'
        }),
        assumptions: Object.freeze({
            detailsWhy: 'חסר כאן פרט שמונח מראש כדי שהמשפט יעבוד, אבל הוא לא נאמר ישירות.',
            rulesWhy: 'המשמעות נבנית על הנחה סמויה שמארגנת את כל הקריאה של המשפט.',
            nextPrompt: 'מה חייב להיות נכון כדי שהמשפט הזה יחזיק?'
        }),
        mind_reading: Object.freeze({
            detailsWhy: 'מיוחסת כאן מחשבה, כוונה או עמדה פנימית בלי ראיה ישירה.',
            rulesWhy: 'המשפט נשען על פירוש של העולם הפנימי של האחר במקום על מידע גלוי.',
            nextPrompt: 'איך יודעים מה הצד השני חושב, מרגיש או מתכוון?'
        }),
        universal_quantifier: Object.freeze({
            detailsWhy: 'המילים \"תמיד\", \"אף פעם\" או \"כולם\" מוחקות יוצאי דופן ומצמצמות את המציאות.',
            rulesWhy: 'נבנה כאן כלל גורף שמוחל על כל המקרים בלי בדיקת גבולות.',
            nextPrompt: 'באמת תמיד? מה היוצא מן הכלל הראשון?'
        }),
        modal_operator: Object.freeze({
            detailsWhy: 'יש כאן חובה או מגבלה בלי פירוט של מה בדיוק מחייב או מונע.',
            rulesWhy: 'המשפט מציג כלל של חובה או חוסר אפשרות כאילו הוא קבוע ולא תלוי תנאים.',
            nextPrompt: 'מה בדיוק מונע? ומה יקרה אם כן?'
        }),
        cause_effect: Object.freeze({
            detailsWhy: 'חסרים כאן שלבי הביניים שמחברים בין דבר אחד לתוצאה שמיוחסת לו.',
            rulesWhy: 'המשפט יוצר חוק סיבתי קשיח בין שני דברים כאילו אחד מוכיח את השני.',
            nextPrompt: 'איך בדיוק X מוביל ל-Y, שלב אחרי שלב?'
        }),
        nominalisations: Object.freeze({
            detailsWhy: 'פעולה חיה הוקפאה לשם כללי, ולכן לא רואים מי עושה מה בפועל.',
            rulesWhy: 'תהליך מוצג כישות קבועה, וכך קשה לפרק את הכלל שמחזיק אותו.',
            nextPrompt: 'מה קורה כאן בפועל, ולא רק בשם כללי?'
        }),
        identity_predicates: Object.freeze({
            detailsWhy: 'תיאור רגעי או חלקי מוצג כזהות כוללת של האדם.',
            rulesWhy: 'מקרה אחד הופך כאן לכלל זהות: \"אני כזה\" או \"הוא כזה\".',
            nextPrompt: 'באיזה תחום זה נכון, ובאיזה תחום זה לא בהכרח נכון?'
        }),
        complex_equivalence: Object.freeze({
            detailsWhy: 'המשפט קושר שני דברים כאילו אחד מוכיח את השני, בלי להראות את הקשר.',
            rulesWhy: 'נבנה כאן כלל פרשני מסוג \"אם X אז זה אומר Y\".',
            nextPrompt: 'איך X דווקא אומר Y? מה הקריטריון?'
        }),
        comparative_deletion: Object.freeze({
            detailsWhy: 'יש כאן השוואה בלי נקודת ייחוס, מדד או צד שני ברור.',
            rulesWhy: 'המשמעות נשענת על כלל השוואתי שלא נאמר במפורש.',
            nextPrompt: 'ביחס למה? לפי איזה מדד?'
        }),
        time_space_predicates: Object.freeze({
            detailsWhy: 'חסר מתי, איפה או באיזה הקשר הטענה באמת נכונה.',
            rulesWhy: 'המסגרת של זמן ומקום נעלמה, ולכן הטענה נשמעת מוחלטת יותר ממה שהיא.',
            nextPrompt: 'מתי בדיוק? איפה בדיוק? ובאיזה הקשר?'
        }),
        lack_referential_index: Object.freeze({
            detailsWhy: 'לא ברור מי בדיוק כלול ב\"הם\", \"כולם\" או \"מישהו\".',
            rulesWhy: 'קבוצה עמומה מחזיקה את כל המשמעות בלי ייחוס ברור של אחריות או פעולה.',
            nextPrompt: 'מי בדיוק? על מי זה נאמר?'
        }),
        non_referring_nouns: Object.freeze({
            detailsWhy: 'מופיע כאן \"משהו\", \"עניין\" או \"זה\" בלי אובייקט ברור שאפשר לבדוק.',
            rulesWhy: 'המשפט נשען על שם כללי לא מזוהה, ולכן הכלל נשאר מעורפל.',
            nextPrompt: 'מה בדיוק הדבר הזה? תן/י שם או דוגמה.'
        }),
        sensory_predicates: Object.freeze({
            detailsWhy: 'צריך להחזיר את המשפט למה שנראה, נשמע או מורגש ממש.',
            rulesWhy: 'מבחן המציאות החושי נעלם, והמשמעות נשארת באוויר בלי עוגן.',
            nextPrompt: 'מה רואים, שומעים או מרגישים ממש?'
        }),
        unspecified_verbs: Object.freeze({
            detailsWhy: 'הפועל נשאר עמום, ולכן לא רואים מה באמת קורה בתוך הפעולה.',
            rulesWhy: 'תהליך שלם נדחס לפועל כללי שמסתיר את המנגנון שמאחוריו.',
            nextPrompt: 'מה קורה בפועל, צעד-צעד?'
        })
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
        elements: null,
        uiMode: 'details',
        phone: null,
        desktopRootMarkup: ''
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

    function getCategoryLabelEn(categoryId) {
        const normalized = root.triplesRadarCore.normalizeCategoryId(categoryId);
        const found = (state.data?.categories || []).find((category) => {
            return root.triplesRadarCore.normalizeCategoryId(category.id) === normalized;
        });
        return found?.label || normalized;
    }

    function getDefaultUiMode() {
        return 'details';
    }

    function normalizeUiMode(value) {
        const raw = String(value || '').trim().toLowerCase();
        if (!raw) return getDefaultUiMode();
        if (raw === 'details' || raw === 'detail' || raw === 'פרטים' || raw === 'phone' || raw === 'triple' || raw === 'advanced' || raw === 'row') {
            return 'details';
        }
        if (raw === 'rules' || raw === 'rule' || raw === 'כללים' || raw === 'desktop' || raw === 'single' || raw === 'legacy' || raw === 'category') {
            return 'rules';
        }
        return getDefaultUiMode();
    }

    function loadUiModePreference() {
        try {
            return normalizeUiMode(localStorage.getItem(UI_MODE_STORAGE_KEY) || '');
        } catch (error) {
            return getDefaultUiMode();
        }
    }

    function saveUiModePreference() {
        try {
            localStorage.setItem(UI_MODE_STORAGE_KEY, state.uiMode);
        } catch (error) {
            // Ignore storage errors.
        }
    }

    function getToggleKeyByUiMode() {
        return TOGGLE_KEY_BY_UI_MODE[state.uiMode] || 'details';
    }

    function updateModeToggleUI() {
        const modeSwitch = document.getElementById('triples-radar-mode-switch');
        if (!modeSwitch) return;

        const activeToggleKey = getToggleKeyByUiMode();
        modeSwitch.querySelectorAll('[data-tr-ui-mode]').forEach((btn) => {
            const isActive = (btn.getAttribute('data-tr-ui-mode') || '') === activeToggleKey;
            btn.classList.toggle('is-active', isActive);
            btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        });

        const modeMeta = MODE_META[state.uiMode] || MODE_META.details;
        const titleEl = document.getElementById('triples-radar-mode-title');
        const noteEl = document.getElementById('triples-radar-mode-note');
        if (titleEl) titleEl.textContent = modeMeta.title;
        if (noteEl) noteEl.textContent = modeMeta.note;
    }

    function getModeMeta() {
        return MODE_META[state.uiMode] || MODE_META.details;
    }

    function getRowMeta(rowId) {
        return ROW_META[rowId] || ROW_META.row1;
    }

    function getCategoryMeta(categoryId) {
        const normalized = root.triplesRadarCore.normalizeCategoryId(categoryId);
        return CATEGORY_META[normalized] || null;
    }

    function getIntroFeedbackText() {
        return getModeMeta().introFeedback;
    }

    function getStepText() {
        return state.solved ? getModeMeta().solvedStep : getModeMeta().step;
    }

    function getFocusHintText(current) {
        const hint = normalizeSpaces(current?.focusHint || '');
        if (!hint) return '';
        return `שאלת הכוונה: ${hint}`;
    }

    function buildDirectionSummary(currentEvaluation) {
        const current = getCurrentScenario();
        if (!current || !root.triplesRadarCore) return null;

        const correctCategoryId = root.triplesRadarCore.normalizeCategoryId(current.correctCategory);
        const correctRowId = root.triplesRadarCore.getRowIdByCategory(correctCategoryId);
        const rowMeta = getRowMeta(correctRowId);
        const categoryMeta = getCategoryMeta(correctCategoryId);
        const modeMeta = getModeMeta();
        const nextPrompt = normalizeSpaces(current.focusHint || categoryMeta?.nextPrompt || '');
        let selectionNote = '';

        if (currentEvaluation && state.selectedCategory) {
            const selectedLabel = getCategoryLabelHe(state.selectedCategory);
            if (currentEvaluation.status === 'exact') {
                selectionNote = `הבחירה שלך: ${selectedLabel}. זה הדיוק המתאים בתוך ${rowMeta.heading}.`;
            } else if (currentEvaluation.status === 'same_row') {
                selectionNote = `הבחירה שלך: ${selectedLabel}. הכיוון הכללי נכון, אבל עדיין צריך לדייק בתוך ${rowMeta.heading}.`;
            } else if (currentEvaluation.status === 'wrong_row') {
                selectionNote = `הבחירה שלך: ${selectedLabel}. זה כיוון אחר; הכוח המרכזי במשפט הזה יושב יותר ב-${rowMeta.heading}.`;
            }
        }

        return {
            colorClass: rowMeta.colorClass,
            title: `${modeMeta.strongestTitle} · ${rowMeta.directionLabel} · ${rowMeta.heading}`,
            subtitle: `${rowMeta.canonicalLabel} בטבלת ברין`,
            lead: modeMeta.strongestLead,
            reason: state.uiMode === 'rules'
                ? (categoryMeta?.rulesWhy || rowMeta.directions.rules)
                : (categoryMeta?.detailsWhy || rowMeta.directions.details),
            nextPrompt,
            selectionNote
        };
    }

    function renderDirectionSummary(currentEvaluation) {
        if (!state.elements?.modeSummary) return;
        const summary = buildDirectionSummary(currentEvaluation);
        if (!summary) {
            state.elements.modeSummary.innerHTML = '';
            return;
        }

        state.elements.modeSummary.innerHTML = `
            <article class="triples-radar-summary ${escapeHtml(summary.colorClass)}">
                <p class="triples-radar-summary-kicker">${escapeHtml(summary.subtitle)}</p>
                <h4 class="triples-radar-summary-title">${escapeHtml(summary.title)}</h4>
                <p class="triples-radar-summary-lead">${escapeHtml(summary.lead)}</p>
                <p class="triples-radar-summary-body"><strong>למה דווקא כאן:</strong> ${escapeHtml(summary.reason)}</p>
                ${summary.nextPrompt ? `<p class="triples-radar-summary-body"><strong>${escapeHtml(getModeMeta().nextMoveLabel)}:</strong> ${escapeHtml(summary.nextPrompt)}</p>` : ''}
                ${summary.selectionNote ? `<p class="triples-radar-summary-note">${escapeHtml(summary.selectionNote)}</p>` : ''}
            </article>
        `;
    }

    function normalizeSpaces(text) {
        return String(text || '').replace(/\s+/g, ' ').trim();
    }

    function scoreAnchorCandidate(text) {
        const value = normalizeSpaces(text);
        if (!value) return -Infinity;
        const words = value.split(/\s+/).filter(Boolean);
        let score = 0;
        score += Math.min(words.length, 8) * 2;
        if (words.length < 2) score -= 4;
        if (words.length > 10) score -= (words.length - 10);
        if (/[!?]/.test(value)) score += 1;
        if (/\b(no|not|never|always|every|all|none|won't|can't|done)\b/i.test(value)) score += 2;
        return score;
    }

    function uniqueStrings(list) {
        const out = [];
        const seen = new Set();
        (Array.isArray(list) ? list : []).forEach((item) => {
            const value = normalizeSpaces(item);
            if (!value) return;
            const key = value.toLowerCase();
            if (seen.has(key)) return;
            seen.add(key);
            out.push(value);
        });
        return out;
    }

    function chunkWords(words, targetChunks) {
        const chunks = [];
        if (!Array.isArray(words) || !words.length) return chunks;
        const total = words.length;
        const count = Math.max(1, Math.min(targetChunks || 1, total));
        let cursor = 0;
        for (let i = 0; i < count; i += 1) {
            const remainingWords = total - cursor;
            const remainingChunks = count - i;
            const size = Math.ceil(remainingWords / remainingChunks);
            const slice = words.slice(cursor, cursor + size).join(' ').trim();
            if (slice) chunks.push(slice);
            cursor += size;
        }
        return chunks;
    }

    function buildAnchorCandidates(clientText) {
        const source = normalizeSpaces(clientText);
        if (!source) return [];

        const rawPieces = source
            .split(/[.!?;,\n\r]+/)
            .map((part) => normalizeSpaces(part))
            .filter(Boolean);

        let candidates = [...rawPieces];
        const words = source.split(/\s+/).filter(Boolean);

        if (candidates.length < 5 && words.length >= 4) {
            const chunked = chunkWords(words, Math.min(5, Math.max(3, Math.ceil(words.length / 3))));
            candidates.push(...chunked);
        }

        if (candidates.length < 3 && words.length >= 3) {
            for (let i = 0; i < words.length - 1; i += 1) {
                const phrase = words.slice(i, Math.min(words.length, i + 3)).join(' ');
                candidates.push(phrase);
            }
        }

        candidates = uniqueStrings(candidates)
            .filter((value) => value.length >= 4)
            .slice(0, 8);

        if (!candidates.length) candidates = [source];

        const scored = candidates.map((text, index) => ({
            id: `a${index + 1}`,
            text,
            score: scoreAnchorCandidate(text),
            order: index
        }));

        const topIds = new Set(
            [...scored]
                .sort((a, b) => {
                    if (b.score !== a.score) return b.score - a.score;
                    return a.order - b.order;
                })
                .slice(0, Math.min(3, scored.length))
                .map((item) => item.id)
        );

        return scored.map((item) => ({
            id: item.id,
            text: item.text,
            isTop: topIds.has(item.id)
        }));
    }

    function ensurePhoneState() {
        if (!state.phone || typeof state.phone !== 'object') {
            state.phone = {};
        }
        return state.phone;
    }

    function getPhoneCurrentScenarioKey() {
        const current = getCurrentScenario();
        return current ? String(current.id || `idx_${state.index}`) : '';
    }

    function resetPhoneScenarioFlow() {
        const current = getCurrentScenario();
        const phone = ensurePhoneState();
        const anchors = buildAnchorCandidates(current?.clientText || '');
        phone.scenarioKey = getPhoneCurrentScenarioKey();
        phone.phase = 'anchors';
        phone.anchors = anchors;
        phone.selectedAnchorId = '';
        phone.lockedRowId = current ? root.triplesRadarCore.getRowIdByCategory(current.correctCategory) : '';
        phone.usedCategoryIds = [];
        phone.qaFeed = [];
        phone.completedScenario = false;
        phone.reply = null;
        phone.challenge = null;
        phone.transcriptOpen = false;
        phone.toast = '';
        phone.toastTone = 'info';
        phone.toastNonce = 0;
        if (phone.toastTimer) {
            clearTimeout(phone.toastTimer);
            phone.toastTimer = null;
        }
    }

    function ensurePhoneScenarioFlow() {
        const phone = ensurePhoneState();
        const currentKey = getPhoneCurrentScenarioKey();
        if (phone.scenarioKey !== currentKey) {
            resetPhoneScenarioFlow();
        }
        return phone;
    }

    function getPhoneSelectedAnchor() {
        const phone = ensurePhoneScenarioFlow();
        return (phone.anchors || []).find((anchor) => anchor.id === phone.selectedAnchorId) || null;
    }

    function getPhoneLockedRow() {
        const current = getCurrentScenario();
        if (!current || !root.triplesRadarCore) return null;
        const rowId = root.triplesRadarCore.getRowIdByCategory(current.correctCategory);
        return root.triplesRadarCore.ROWS.find((row) => row.id === rowId) || null;
    }

    function getPhoneCardLetter(index) {
        return ['A', 'B', 'C'][index] || String(index + 1);
    }

    function getShortCategoryChip(categoryId) {
        const label = getCategoryLabelEn(categoryId);
        const map = {
            lost_performative: 'LOST PERFORMATIVE',
            assumptions: 'ASSUMPTIONS',
            mind_reading: 'MIND READING',
            universal_quantifier: 'UNIVERSAL QUANTIFIER',
            modal_operator: 'MODAL OPERATOR',
            cause_effect: 'CAUSE EFFECT',
            nominalisations: 'NOMINALISATIONS',
            identity_predicates: 'IDENTITY PREDICATES',
            complex_equivalence: 'COMPLEX EQUIVALENCE',
            comparative_deletion: 'COMPARATIVE DELETION',
            time_space_predicates: 'TIME SPACE PREDICATES',
            lack_referential_index: 'LACK REFERENTIAL INDEX',
            non_referring_nouns: 'NON REFERRING NOUNS',
            sensory_predicates: 'SENSORY PREDICATES',
            unspecified_verbs: 'UNSPECIFIED VERBS'
        };
        const normalized = root.triplesRadarCore.normalizeCategoryId(categoryId);
        return map[normalized] || label.toUpperCase();
    }

    function clipText(text, maxLen) {
        const value = normalizeSpaces(text);
        if (!value) return '';
        if (value.length <= maxLen) return value;
        return `${value.slice(0, Math.max(0, maxLen - 1)).trim()}ג€¦`;
    }

    function buildPhoneQuestion(categoryId) {
        const current = getCurrentScenario();
        const normalized = root.triplesRadarCore.normalizeCategoryId(categoryId);
        const isCorrect = current && root.triplesRadarCore.normalizeCategoryId(current.correctCategory) === normalized;
        if (isCorrect && normalizeSpaces(current?.focusHint)) {
            return normalizeSpaces(current.focusHint);
        }

        const promptMap = {
            lost_performative: '׳׳₪׳™ ׳׳™׳–׳” ׳¡׳˜׳ ׳“׳¨׳˜ ׳–׳” ׳ ׳©׳₪׳˜ ׳›׳׳?',
            assumptions: '׳׳™׳–׳• ׳”׳ ׳—׳” ׳›׳׳ ׳—׳™׳™׳‘׳× ׳׳”׳™׳•׳× ׳ ׳›׳•׳ ׳” ׳›׳“׳™ ׳©׳–׳” ׳™׳—׳–׳™׳§?',
            mind_reading: '׳׳™׳ ׳׳×׳” ׳™׳•׳“׳¢/׳× ׳׳” ׳”׳¦׳“ ׳”׳©׳ ׳™ ׳—׳•׳©׳‘ ׳׳• ׳׳×׳›׳•׳•׳?',
            universal_quantifier: '׳×׳׳™׳“? ׳׳™׳ ׳׳₪׳™׳׳• ׳™׳•׳¦׳ ׳“׳•׳₪׳ ׳׳—׳“?',
            modal_operator: '׳׳” ׳¢׳•׳¦׳¨ ׳׳•׳×׳ ׳‘׳₪׳•׳¢׳? ׳׳” ׳‘׳“׳™׳•׳§ ׳׳•׳ ׳¢?',
            cause_effect: '׳׳™׳ ׳‘׳“׳™׳•׳§ X ׳׳•׳‘׳™׳ ׳-Y, ׳©׳׳‘ ׳׳—׳¨׳™ ׳©׳׳‘?',
            nominalisations: '׳׳” ׳§׳•׳¨׳” ׳›׳׳ ׳‘׳₪׳•׳¢׳ (׳›׳₪׳¢׳•׳׳”) ׳•׳׳ ׳›׳©׳ ׳¢׳¦׳?',
            identity_predicates: '׳‘׳׳™׳–׳” ׳×׳—׳•׳ ׳–׳” ׳ ׳›׳•׳, ׳•׳‘׳׳™׳–׳” ׳×׳—׳•׳ ׳׳ ׳‘׳”׳›׳¨׳—?',
            complex_equivalence: '׳׳™׳ ׳”׳׳™׳¨׳•׳¢ ׳”׳–׳” ׳׳•׳׳¨ ׳׳× ׳”׳׳¡׳§׳ ׳” ׳”׳–׳׳×?',
            comparative_deletion: '׳‘׳™׳—׳¡ ׳׳׳” ׳‘׳“׳™׳•׳§? ׳•׳׳” ׳”׳׳“׳“?',
            time_space_predicates: '׳׳×׳™/׳׳™׳₪׳” ׳‘׳“׳™׳•׳§ ׳–׳” ׳§׳•׳¨׳” (׳•׳׳×׳™ ׳׳)?',
            lack_referential_index: '׳׳™ ׳‘׳“׳™׳•׳§ ׳–׳” "׳”׳/׳›׳•׳׳" ׳›׳׳?',
            non_referring_nouns: '׳׳׳” ׳‘׳“׳™׳•׳§ ׳׳×׳›׳•׳•׳ ׳™׳ ׳‘׳׳™׳׳” ׳”׳–׳׳×?',
            sensory_predicates: '׳׳” ׳‘׳“׳™׳•׳§ ׳¨׳•׳׳™׳/׳©׳•׳׳¢׳™׳/׳׳¨׳’׳™׳©׳™׳ ׳‘׳’׳•׳£?',
            unspecified_verbs: '׳׳” ׳§׳•׳¨׳” ׳›׳׳ ׳¦׳¢׳“-׳¦׳¢׳“ ׳‘׳₪׳•׳¢׳?'
        };

        return promptMap[normalized] || `׳׳” ׳™׳¢׳–׳•׳¨ ׳׳“׳™׳™׳§ ׳›׳׳ ׳“׳¨׳ ${getShortCategoryChip(normalized)}?`;
    }

    
    function buildPhoneAnswer(categoryId) {
        const current = getCurrentScenario();
        const anchor = getPhoneSelectedAnchor();
        const anchorText = clipText(anchor?.text || current?.clientText || '', 72);
        const chip = getShortCategoryChip(categoryId);
        const variants = [
            `׳›׳©"${anchorText}" ׳§׳•׳¨׳”, ׳׳ ׳™ ׳™׳©׳¨ ׳§׳•׳¨׳/׳× ׳׳× ׳–׳” ׳“׳¨׳ ${chip} ׳•׳׳’׳™׳‘/׳” ׳׳”׳¨.`,
            `׳‘׳¨׳’׳¢ ׳”׳–׳” "${anchorText}" ׳׳¨׳’׳™׳© ׳׳™ ׳›׳׳• ׳”׳•׳›׳—׳”, ׳׳₪׳ ׳™ ׳©׳‘׳“׳§׳×׳™ ׳₪׳¨׳˜׳™׳.`,
            `׳›׳©׳׳ ׳™ ׳ ׳×׳₪׳¡/׳× ׳¢׳ "${anchorText}", ׳”׳›׳•׳ ׳׳¦׳˜׳׳¦׳ ׳׳׳©׳׳¢׳•׳× ׳׳—׳× ׳•׳׳ ׳™ ׳׳₪׳¡׳₪׳¡/׳× ׳”׳§׳©׳¨.`
        ];
        const index = ensurePhoneScenarioFlow().qaFeed.length % variants.length;
        return variants[index];
    }

    
    function buildPhoneReplyDraft() {
        const current = getCurrentScenario();
        const phone = ensurePhoneScenarioFlow();
        const anchor = getPhoneSelectedAnchor();
        const qaFeed = Array.isArray(phone.qaFeed) ? phone.qaFeed : [];
        const bullets = qaFeed.map((item) => {
            const short = clipText(item.answer || '', 64);
            return `${item.letter}: ${short}`;
        });

        const anchorText = clipText(anchor?.text || current?.clientText || '', 80);
        const mirror = `׳©׳™׳§׳•׳£: "׳›׳©'${anchorText}' ׳₪׳•׳’׳© ׳׳•׳×׳, ׳–׳” ׳™׳›׳•׳ ׳׳”׳¨׳’׳™׳© ׳¡׳•׳₪׳™ ׳•׳›׳‘׳“."`;
        const gap = '׳×׳•׳‘׳ ׳× ׳׳˜׳₪׳: "׳›׳¨׳’׳¢ ׳™׳© ׳§׳₪׳™׳¦׳” ׳׳”׳׳™׳¨׳•׳¢ ׳׳׳©׳׳¢׳•׳×. ׳ ׳‘׳“׳•׳§ ׳—׳׳§ ׳׳—׳“ ׳‘׳׳§׳•׳ ׳׳× ׳›׳ ׳”׳¡׳™׳₪׳•׳¨ ׳™׳—׳“."';
        const next = '׳©׳׳׳× ׳”׳¢׳“׳₪׳”: "׳׳” ׳”׳›׳™ ׳ ׳›׳•׳ ׳׳ ׳׳‘׳“׳•׳§ ׳¢׳›׳©׳™׳• ג€” ׳¢׳•׳‘׳“׳”, ׳׳©׳׳¢׳•׳×, ׳׳• ׳×׳ ׳׳™?"';
        return {
            bullets,
            mirror,
            gap,
            next,
            actions: ['׳‘׳“׳™׳§׳× ׳¢׳•׳‘׳“׳•׳×', '׳•׳™׳¡׳•׳×/׳”׳׳˜׳”']
        };
    }

    
    function buildPhoneChallengeDraft() {
        const phone = ensurePhoneScenarioFlow();
        const qaFeed = Array.isArray(phone.qaFeed) ? phone.qaFeed : [];
        const challengeByCategory = {
            lost_performative: '׳׳₪׳™ ׳׳™ ׳‘׳“׳™׳•׳§ ׳–׳” "׳׳ ׳‘׳¡׳“׳¨" ׳׳• "׳¦׳¨׳™׳" ׳›׳׳?',
            assumptions: '׳׳™׳–׳• ׳”׳ ׳—׳” ׳›׳׳ ׳”׳›׳™ ׳›׳“׳׳™ ׳׳‘׳“׳•׳§ ׳§׳•׳“׳ ׳׳•׳ ׳”׳׳¦׳™׳׳•׳×?',
            mind_reading: '׳׳™׳ ׳ ׳‘׳“׳•׳§ ׳׳” ׳‘׳׳׳× ׳ ׳׳׳¨/׳ ׳¢׳©׳” ׳‘׳׳™ ׳׳ ׳—׳© ׳›׳•׳•׳ ׳”?',
            universal_quantifier: '׳׳” ׳™׳•׳¦׳ ׳”׳“׳•׳₪׳ ׳”׳¨׳׳©׳•׳ ׳©׳׳—׳׳™׳© ׳׳× ׳”"׳×׳׳™׳“/׳׳£ ׳₪׳¢׳"?',
            modal_operator: '׳׳” ׳׳•׳ ׳¢ ׳‘׳₪׳•׳¢׳, ׳•׳׳” ׳¦׳¢׳“ ׳§׳˜׳ ׳©׳›׳ ׳׳₪׳©׳¨׳™?',
            cause_effect: '׳׳” ׳”׳©׳¨׳©׳¨׳× ׳‘׳₪׳•׳¢׳, ׳•׳׳” ׳¢׳•׳“ ׳™׳›׳•׳ ׳׳”׳¡׳‘׳™׳¨ ׳׳× ׳׳•׳×׳” ׳×׳•׳¦׳׳”?',
            nominalisations: '׳׳” ׳§׳•׳¨׳” ׳‘׳₪׳•׳¢׳ ׳¦׳¢׳“-׳¦׳¢׳“ ׳‘׳׳§׳•׳ ׳©׳ ׳¢׳¦׳ ׳›׳׳׳™?',
            identity_predicates: '׳‘׳׳™׳–׳” ׳×׳—׳•׳ ׳–׳” ׳ ׳›׳•׳, ׳•׳‘׳׳™׳–׳” ׳×׳—׳•׳ ׳–׳” ׳׳ ׳‘׳”׳›׳¨׳— ׳ ׳›׳•׳?',
            complex_equivalence: '׳׳™׳ ׳‘׳“׳™׳•׳§ X ׳׳•׳׳¨ Y? ׳׳” ׳”׳§׳¨׳™׳˜׳¨׳™׳•׳ ׳׳• ׳”׳¨׳׳™׳”?',
            comparative_deletion: '׳‘׳™׳—׳¡ ׳׳׳”/׳׳׳™? ׳•׳׳” ׳”׳׳“׳“?',
            time_space_predicates: '׳׳×׳™/׳׳™׳₪׳” ׳‘׳“׳™׳•׳§ ׳–׳” ׳§׳•׳¨׳”, ׳•׳׳×׳™ ׳׳?',
            lack_referential_index: '׳׳™ ׳‘׳“׳™׳•׳§ ׳–׳” "׳”׳" / "׳›׳•׳׳" ׳‘׳׳§׳¨׳” ׳”׳–׳”?',
            non_referring_nouns: '׳׳׳” ׳‘׳“׳™׳•׳§ ׳׳×׳›׳•׳•׳ ׳™׳ ׳‘׳׳™׳׳” ׳”׳–׳•?',
            sensory_predicates: '׳׳” ׳¨׳׳™׳×/׳©׳׳¢׳×/׳”׳¨׳’׳©׳× ׳‘׳’׳•׳£ ׳‘׳׳•׳₪׳ ׳§׳•׳ ׳§׳¨׳˜׳™?',
            unspecified_verbs: '׳׳” ׳§׳•׳¨׳” ׳‘׳₪׳•׳¢׳ ׳¦׳¢׳“-׳¦׳¢׳“ ׳‘׳×׳•׳ ׳”׳₪׳•׳¢׳ ׳”׳–׳”?'
        };

        const items = qaFeed.slice(0, 3).map((item) => ({
            letter: item.letter,
            categoryLabel: item.categoryLabel,
            challenge: challengeByCategory[item.categoryId] || '׳׳” ׳”׳©׳׳׳” ׳”׳׳“׳•׳™׳§׳× ׳”׳‘׳׳” ׳©׳×׳‘׳“׳•׳§ ׳׳× ׳–׳” ׳׳•׳ ׳”׳׳¦׳™׳׳•׳×?'
        }));

        return {
            intro: '׳©׳׳‘ ׳׳×׳’׳¨: ׳׳—׳¨׳™ ׳”׳—׳©׳™׳₪׳”, ׳‘׳•׳“׳§׳™׳ ׳›׳ ׳׳—׳“ ׳׳©׳׳•׳©׳× ׳”׳₪׳¨׳™׳˜׳™׳ ׳©׳ ׳׳¡׳₪׳•.',
            items,
            therapistChoice: '׳׳” ׳”׳׳˜׳•׳₪׳ ׳׳¢׳“׳™׳£ ׳׳—׳§׳•׳¨ ׳¢׳›׳©׳™׳•: ׳¨׳׳™׳”? ׳׳©׳׳¢׳•׳×? ׳×׳ ׳׳™׳?'
        };
    }

    function showPhoneToast(message, tone) {
        const phone = ensurePhoneScenarioFlow();
        phone.toast = String(message || '');
        phone.toastTone = tone || 'warn';
        phone.toastNonce = (phone.toastNonce || 0) + 1;
        const currentNonce = phone.toastNonce;
        if (phone.toastTimer) {
            clearTimeout(phone.toastTimer);
        }
        phone.toastTimer = setTimeout(() => {
            const activePhone = ensurePhoneState();
            if (activePhone.toastNonce !== currentNonce) return;
            activePhone.toast = '';
            activePhone.toastTone = 'info';
            activePhone.toastTimer = null;
            if (state.uiMode === 'phone') renderBoard();
        }, 1600);
    }

    function phoneSelectAnchor(anchorId) {
        const phone = ensurePhoneScenarioFlow();
        const anchor = (phone.anchors || []).find((item) => item.id === anchorId);
        if (!anchor) return;
        if (!anchor.isTop) {
            showPhoneToast('׳›׳¨׳’׳¢ ׳‘׳—׳¨/׳™ ׳׳—׳“ ׳׳©׳׳•׳©׳× ׳”׳¢׳•׳’׳ ׳™׳ ׳”׳׳•׳‘׳™׳׳™׳ ׳›׳“׳™ ׳׳₪׳×׳•׳— ׳¢׳‘׳•׳“׳” ׳׳“׳•׳™׳§׳×.', 'warn');
            return;
        }
        phone.selectedAnchorId = anchor.id;
        phone.phase = 'focus';
        phone.reply = null;
        phone.challenge = null;
        phone.transcriptOpen = false;
        phone.toast = '';
        renderBoard();
    }

    function phoneOpenMeta() {
        const phone = ensurePhoneScenarioFlow();
        if (!phone.selectedAnchorId) return;
        phone.phase = 'qa';
        phone.toast = '';
        renderBoard();
    }

    function phoneUseCategory(categoryId) {
        const phone = ensurePhoneScenarioFlow();
        if (!phone.selectedAnchorId) return;
        if (phone.phase !== 'qa' && phone.phase !== 'done') return;
        const normalized = root.triplesRadarCore.normalizeCategoryId(categoryId);
        if (!normalized) return;
        if ((phone.usedCategoryIds || []).includes(normalized)) return;

        const row = getPhoneLockedRow();
        const rowCategories = Array.isArray(row?.categories) ? row.categories.map((id) => root.triplesRadarCore.normalizeCategoryId(id)) : [];
        if (!rowCategories.includes(normalized)) return;

        const letter = getPhoneCardLetter(rowCategories.indexOf(normalized));
        const entry = {
            letter,
            categoryId: normalized,
            categoryLabel: getCategoryLabelHe(normalized),
            question: buildPhoneQuestion(normalized),
            answer: buildPhoneAnswer(normalized)
        };

        phone.usedCategoryIds = [...(phone.usedCategoryIds || []), normalized];
        phone.qaFeed = [...(phone.qaFeed || []), entry];
        phone.transcriptOpen = false;
        phone.challenge = null;
        phone.toast = '';

        state.score += 1;
        if (phone.usedCategoryIds.length >= rowCategories.length && !phone.completedScenario) {
            phone.completedScenario = true;
            phone.phase = 'done';
            state.solvedCount += 1;
        } else {
            phone.phase = 'qa';
        }
        saveProgress();
        renderBoard();
    }

    function phoneGenerateReply() {
        const phone = ensurePhoneScenarioFlow();
        if ((phone.qaFeed || []).length < 3) return;
        phone.reply = buildPhoneReplyDraft();
        phone.challenge = null;
        phone.phase = 'done';
        renderBoard();
    }

    function phoneGenerateChallenge() {
        const phone = ensurePhoneScenarioFlow();
        if (!phone.reply || (phone.qaFeed || []).length < 3) return;
        phone.challenge = buildPhoneChallengeDraft();
        phone.phase = 'done';
        renderBoard();
    }

    function phoneToggleTranscript() {
        const phone = ensurePhoneScenarioFlow();
        phone.transcriptOpen = !phone.transcriptOpen;
        renderBoard();
    }

    function renderPhoneBoard() {
        const current = getCurrentScenario();
        const rootEl = state.elements?.root;
        if (!current || !rootEl) return;

        const phone = ensurePhoneScenarioFlow();
        const selectedAnchor = getPhoneSelectedAnchor();
        const row = getPhoneLockedRow();
        const rowMeta = row ? (ROW_META[row.id] || ROW_META.row1) : ROW_META.row1;
        const rowCategories = Array.isArray(row?.categories) ? row.categories : [];
        const topAnchors = (phone.anchors || []).filter((item) => item.isTop);
        const qaFeed = Array.isArray(phone.qaFeed) ? phone.qaFeed : [];
        const canGenerate = qaFeed.length >= Math.min(3, rowCategories.length || 3);

        const stepSubtitleMap = {
            anchors: '׳‘׳—׳¨/׳™ ׳§׳˜׳¢ ׳‘׳•׳׳˜ ׳׳×׳•׳ ׳©׳׳•׳©׳× ׳”׳¢׳•׳’׳ ׳™׳ ׳”׳׳¨׳›׳–׳™׳™׳ ׳‘׳׳©׳₪׳˜.',
            focus: '׳”׳§׳˜׳¢ ׳ ׳‘׳—׳¨. ׳¢׳›׳©׳™׳• ׳ ׳₪׳×׳— ׳¢׳‘׳•׳“׳” ׳¢׳ ׳©׳׳•׳© ׳”׳×׳‘׳ ׳™׳•׳× ׳”׳©׳›׳ ׳•׳× ׳‘׳׳•׳×׳” ׳©׳•׳¨׳”.',
            qa: `׳‘׳•׳ ׳™׳ 3 ׳©׳׳׳•׳× ׳•׳×׳©׳•׳‘׳•׳× ׳׳©׳׳™׳׳•׳× (׳©׳›׳/׳×׳‘׳ ׳™׳×/׳©׳›׳) ֲ· ${qaFeed.length}/3`,
            done: phone.challenge
                ? '׳©׳׳‘ ׳‘׳“׳™׳§׳× ׳”׳”׳׳©׳ ׳₪׳¢׳™׳: ׳‘׳•׳“׳§׳™׳ ׳׳× ׳©׳׳•׳© ׳”׳ ׳§׳•׳“׳•׳× ׳©׳¢׳׳•'
                : (phone.reply ? '׳©׳׳‘ ׳”׳—׳©׳™׳₪׳” ׳”׳•׳©׳׳ ֲ· ׳™׳© ׳©׳™׳§׳•׳£ ׳•׳”׳¦׳¢׳× ׳”׳׳©׳' : '3/3 ׳”׳•׳©׳׳ ֲ· ׳‘׳ ׳”/׳™ ׳©׳™׳§׳•׳£')
        };
        const headerTitleMap = {
            anchors: '׳׳‘׳˜ ׳©׳׳©׳” ֲ· ׳¢׳•׳’׳ ׳™׳ ׳׳”׳׳©׳₪׳˜',
            focus: '׳‘׳—׳¨׳ ׳• ׳ ׳§׳•׳“׳× ׳₪׳×׳™׳—׳” ׳׳¢׳‘׳•׳“׳”',
            qa: '׳©׳•׳׳׳™׳ ׳•׳׳“׳™׳™׳§׳™׳ ׳‘׳×׳•׳ ׳׳•׳×׳” ׳׳©׳₪׳—׳”',
            done: phone.challenge ? '׳‘׳“׳™׳§׳× ׳”׳׳©׳ ׳-3 ׳”׳ ׳§׳•׳“׳•׳×' : (phone.reply ? '׳©׳™׳§׳•׳£ + ׳ ׳™׳¡׳•׳— ׳”׳׳©׳' : '3/3 ׳”׳•׳©׳׳')
        };

        const highlightButtons = (phone.anchors || []).map((anchor) => {
            const isSelected = selectedAnchor && selectedAnchor.id === anchor.id;
            const disabled = !!selectedAnchor && !isSelected;
            const classes = [
                'tr-phone-highlight',
                anchor.isTop ? 'is-top' : 'is-weak',
                isSelected ? 'is-selected' : '',
                disabled ? 'is-faded' : ''
            ].filter(Boolean).join(' ');
            return `
                <button
                    type="button"
                    class="${classes}"
                    data-tr-phone-anchor-id="${escapeHtml(anchor.id)}"
                    ${disabled ? 'tabindex="-1" disabled' : ''}>
                    ${escapeHtml(anchor.text)}
                    ${anchor.isTop ? '<span class="tr-phone-badge">׳¢׳•׳’׳ ׳׳•׳‘׳™׳</span>' : ''}
                </button>
            `;
        }).join('');

        const tripleCards = rowCategories.map((categoryId, idx) => {
            const normalized = root.triplesRadarCore.normalizeCategoryId(categoryId);
            const used = (phone.usedCategoryIds || []).includes(normalized);
            const classes = [
                'tr-phone-card-btn',
                `row-tone-${escapeHtml(rowMeta.colorClass || 'row-sky')}`,
                used ? 'is-used' : ''
            ].join(' ');
            return `
                <button
                    type="button"
                    class="${classes}"
                    data-tr-phone-cat-id="${escapeHtml(normalized)}"
                    ${phone.phase === 'focus' ? 'disabled' : ''}
                    ${used ? 'disabled' : ''}>
                    <span class="tr-phone-card-letter">${escapeHtml(getPhoneCardLetter(idx))}</span>
                    <span class="tr-phone-card-chip">${escapeHtml(getShortCategoryChip(normalized))}</span>
                    <small class="tr-phone-card-label">${escapeHtml(getCategoryLabelHe(normalized))}</small>
                    ${used ? '<span class="tr-phone-card-used">׳ ׳©׳׳ ג“</span>' : ''}
                </button>
            `;
        }).join('');

        const qaFeedHtml = qaFeed.length
            ? qaFeed.map((item) => `
                <article class="tr-phone-qa-item">
                    <div class="tr-phone-qa-kicker">׳©׳׳׳”/׳×׳©׳•׳‘׳” ${escapeHtml(item.letter)} ֲ· ${escapeHtml(item.categoryLabel)}</div>
                    <p class="tr-phone-q-line"><strong>׳©׳׳׳”:</strong> ${escapeHtml(item.question)}</p>
                    <p class="tr-phone-a-line"><strong>׳×׳’׳•׳‘׳”:</strong> ${escapeHtml(item.answer)}</p>
                </article>
            `).join('')
            : '<p class="tr-phone-muted">׳‘׳—׳¨/׳™ ׳›׳¨׳˜׳™׳¡ ׳׳—׳“ ׳׳×׳•׳ ׳”׳©׳׳©׳” ׳›׳“׳™ ׳׳™׳¦׳•׳¨ ׳©׳׳׳” ׳•׳×׳©׳•׳‘׳× ׳׳˜׳•׳₪׳.</p>';

        const collectedHtml = qaFeed.length
            ? qaFeed.map((item) => `<li><strong>${escapeHtml(item.letter)}</strong> ֲ· ${escapeHtml(getShortCategoryChip(item.categoryId))}: ${escapeHtml(clipText(item.answer, 56))}</li>`).join('')
            : '';

        const wordBoardHtml = `
            <section class="tr-phone-panel tr-phone-wordboard">
                <div class="tr-phone-panel-title">׳¢׳•׳’׳ ׳™׳ ׳‘׳•׳׳˜׳™׳ ׳׳×׳•׳ ׳׳©׳₪׳˜ ׳”׳׳˜׳•׳₪׳</div>
                <div class="tr-phone-wordboard-grid">
                    ${(phone.anchors || []).map((anchor) => {
                        const cls = [
                            'tr-phone-word-chip',
                            anchor.isTop ? 'is-top' : '',
                            selectedAnchor && selectedAnchor.id === anchor.id ? 'is-selected' : ''
                        ].filter(Boolean).join(' ');
                        return `<span class="${cls}">${escapeHtml(anchor.text)}</span>`;
                    }).join('')}
                </div>
                <p class="tr-phone-wordboard-note"><strong>3 ׳¢׳•׳’׳ ׳™׳ ׳׳•׳‘׳™׳׳™׳:</strong> ${escapeHtml(topAnchors.map((item) => item.text).join(' | '))}</p>
            </section>
        `;

        const breenTableHtml = `
            <section class="tr-phone-panel tr-phone-breen-panel">
                <div class="tr-phone-panel-title">׳˜׳‘׳׳× ׳‘׳¨׳™׳ (׳׳₪׳× ׳”׳“׳₪׳•׳¡׳™׳ ׳”׳׳׳׳”)</div>
                <div class="tr-phone-breen-grid">
                    ${root.triplesRadarCore.ROWS.map((r) => {
                        const meta = ROW_META[r.id] || ROW_META.row1;
                        const rowLocked = row && row.id === r.id;
                        const cells = r.categories.map((categoryId) => {
                            const normalized = root.triplesRadarCore.normalizeCategoryId(categoryId);
                            const isUsed = (phone.usedCategoryIds || []).includes(normalized);
                            const isCorrect = root.triplesRadarCore.normalizeCategoryId(current.correctCategory) === normalized;
                            const classes = [
                                'tr-phone-breen-cell',
                                rowLocked ? 'is-row-locked' : '',
                                isUsed ? 'is-used' : '',
                                isCorrect ? 'is-correct' : ''
                            ].filter(Boolean).join(' ');
                            return `
                                <div class="${classes}">
                                    <span class="tr-phone-breen-chip">${escapeHtml(getShortCategoryChip(normalized))}</span>
                                    <small>${escapeHtml(getCategoryLabelHe(normalized))}</small>
                                </div>
                            `;
                        }).join('');
                        return `
                            <div class="tr-phone-breen-row ${escapeHtml(meta.colorClass || '')} ${rowLocked ? 'is-active' : ''}">
                                <div class="tr-phone-breen-row-head">
                                    <strong>${escapeHtml(meta.heLabel || r.label || r.id)}</strong>
                                    <small>${escapeHtml(meta.heInsight || '')}</small>
                                </div>
                                <div class="tr-phone-breen-row-cells">${cells}</div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </section>
        `;

        const challengeHtml = phone.challenge
            ? `
                <section class="tr-phone-panel tr-phone-challenge-panel">
                    <div class="tr-phone-panel-title">׳׳×׳’׳•׳¨ 3 ׳”׳“׳‘׳¨׳™׳ ׳©׳ ׳—׳©׳₪׳•</div>
                    <p class="tr-phone-challenge-intro">${escapeHtml(phone.challenge.intro || '')}</p>
                    <div class="tr-phone-challenge-list">
                        ${(phone.challenge.items || []).map((item) => `
                            <article class="tr-phone-challenge-item">
                                <div class="tr-phone-qa-kicker">׳׳×׳’׳•׳¨ ${escapeHtml(item.letter)} ֲ· ${escapeHtml(item.categoryLabel)}</div>
                                <p>${escapeHtml(item.challenge)}</p>
                            </article>
                        `).join('')}
                    </div>
                    <div class="tr-phone-challenge-next">${escapeHtml(phone.challenge.therapistChoice || '')}</div>
                </section>
            `
            : '';

        const replyHtml = phone.reply
            ? `
                <section class="tr-phone-panel">
                    <div class="tr-phone-panel-title">׳©׳™׳§׳•׳£ + ׳×׳•׳‘׳ ׳” ׳©׳ ׳”׳׳˜׳₪׳ (׳˜׳™׳•׳˜׳”)</div>
                    <p>${escapeHtml(phone.reply.mirror)}</p>
                    <p>${escapeHtml(phone.reply.gap)}</p>
                    <p>${escapeHtml(phone.reply.next)}</p>
                    <div class="tr-phone-inline-actions">
                        ${(phone.reply.actions || []).map((label) => `<button type="button" class="tr-phone-mini-btn" disabled>${escapeHtml(label)}</button>`).join('')}
                    </div>
                </section>
            `
            : '';

        const transcriptHtml = phone.transcriptOpen
            ? `
                <section class="tr-phone-panel tr-phone-transcript">
                    <div class="tr-phone-panel-title">׳×׳׳׳™׳ ׳”׳¡׳‘׳‘</div>
                    <div class="tr-phone-transcript-block"><strong>׳׳˜׳•׳₪׳</strong><p>${escapeHtml(current.clientText || '')}</p></div>
                    <div class="tr-phone-transcript-block"><strong>׳§׳˜׳¢ ׳©׳ ׳‘׳—׳¨</strong><p>${escapeHtml(selectedAnchor?.text || '')}</p></div>
                    ${qaFeed.map((item) => `
                        <div class="tr-phone-transcript-block">
                            <strong>׳©׳׳׳”/׳×׳©׳•׳‘׳” ${escapeHtml(item.letter)}</strong>
                            <p><em>׳©׳׳׳”:</em> ${escapeHtml(item.question)}</p>
                            <p><em>׳×׳’׳•׳‘׳”:</em> ${escapeHtml(item.answer)}</p>
                        </div>
                    `).join('')}
                    ${phone.reply ? `
                        <div class="tr-phone-transcript-block">
                            <strong>׳©׳™׳§׳•׳£/׳×׳•׳‘׳ ׳”</strong>
                            <p>${escapeHtml(phone.reply.mirror)}</p>
                            <p>${escapeHtml(phone.reply.gap)}</p>
                            <p>${escapeHtml(phone.reply.next)}</p>
                        </div>
                    ` : ''}
                </section>
            `
            : '';

        const focusPanelHtml = selectedAnchor
            ? `
                <section class="tr-phone-panel tr-phone-anchor-panel">
                    <div class="tr-phone-panel-title">׳”׳§׳˜׳¢ ׳©׳‘׳—׳¨׳× ׳׳¢׳‘׳•׳“׳”</div>
                    <p class="tr-phone-anchor-text">${escapeHtml(selectedAnchor.text)}</p>
                    ${phone.phase === 'focus' ? `
                        <button type="button" class="tr-phone-meta-btn" data-tr-phone-action="meta">׳₪׳×׳—/׳™ ׳¢׳‘׳•׳“׳” ׳¢׳ ׳”׳©׳׳©׳”</button>
                    ` : ''}
                </section>
            `
            : '';

        const qaPanelHtml = selectedAnchor && (phone.phase === 'qa' || phone.phase === 'done' || phone.reply)
            ? `
                <section class="tr-phone-panel tr-phone-locked-panel">
                    <div class="tr-phone-panel-title">׳”׳©׳׳©׳” ׳”׳₪׳¢׳™׳׳” (׳”׳×׳‘׳ ׳™׳× ׳•׳”׳©׳›׳ ׳™׳ ׳©׳׳”)</div>
                    <div class="tr-phone-row-note">
                        <strong>${escapeHtml(rowMeta.heLabel || '')}</strong>
                        <small>${escapeHtml(rowMeta.heInsight || '')}</small>
                    </div>
                    <div class="tr-phone-cards">${tripleCards}</div>
                    <div class="tr-phone-panel-title">׳¨׳¦׳£ ׳”׳¢׳‘׳•׳“׳” (3 ׳©׳׳׳•׳× ׳•׳×׳©׳•׳‘׳•׳×)</div>
                    <div class="tr-phone-qa-feed">${qaFeedHtml}</div>
                </section>
            `
            : '';

        const donePanelHtml = selectedAnchor && phone.phase === 'done'
            ? `
                <section class="tr-phone-panel tr-phone-done-panel">
                    <div class="tr-phone-header-row">
                        <div class="tr-phone-panel-title">3/3 ׳”׳•׳©׳׳ (׳©׳׳‘ ׳—׳©׳™׳₪׳”)</div>
                        <div class="tr-phone-done-micro">׳¡׳¦׳ ׳” ${state.index + 1}/${state.scenarios.length}</div>
                    </div>
                    <div class="tr-phone-inline-actions">
                        <button type="button" class="tr-phone-primary-btn" data-tr-phone-action="generate" ${canGenerate ? '' : 'disabled'}>׳‘׳ ׳”/׳™ ׳©׳™׳§׳•׳£ ׳•׳”׳¦׳¢׳× ׳”׳׳©׳</button>
                        <button type="button" class="tr-phone-secondary-btn" data-tr-phone-action="transcript">${phone.transcriptOpen ? '׳”׳¡׳×׳¨ ׳×׳׳׳™׳' : '׳×׳׳׳™׳'}</button>
                    </div>
                    ${phone.reply ? `
                        <div class="tr-phone-inline-actions">
                            <button type="button" class="tr-phone-primary-btn" data-tr-phone-action="challenge">׳‘׳“׳™׳§׳× ׳”׳׳©׳ ׳-3 ׳”׳ ׳§׳•׳“׳•׳×</button>
                            <button type="button" class="tr-phone-secondary-btn" disabled>׳§׳•׳“׳ ׳‘׳•׳ ׳™׳ ׳©׳™׳§׳•׳£, ׳•׳׳– ׳‘׳•׳“׳§׳™׳ ׳”׳׳©׳</button>
                        </div>
                    ` : ''}
                    <div class="tr-phone-panel-title">׳׳” ׳ ׳׳¡׳£ ׳¢׳“ ׳¢׳›׳©׳™׳•</div>
                    <ul class="tr-phone-collected-list">${collectedHtml}</ul>
                </section>
            `
            : '';

        rootEl.innerHTML = `
            <div class="triples-radar-phone-shell">
                <div class="triples-radar-phone-header">
                    <div>
                        <h4>${escapeHtml(headerTitleMap[phone.phase] || '׳׳‘׳˜ ׳©׳׳©׳” ֲ· ׳—׳©׳™׳₪׳” ׳•׳‘׳“׳™׳§׳× ׳”׳׳©׳')}</h4>
                        <p>${escapeHtml(stepSubtitleMap[phone.phase] || '')}</p>
                    </div>
                    <div class="triples-radar-phone-stats">
                        <span>׳׳§׳¨׳” ${state.index + 1}/${state.scenarios.length}</span>
                        <span>׳ ׳§׳•׳“׳•׳× ${state.score}</span>
                    </div>
                </div>

                <section class="tr-phone-panel tr-phone-client-panel">
                    <div class="tr-phone-panel-title">׳׳©׳₪׳˜ ׳”׳׳˜׳•׳₪׳ + ׳¢׳•׳’׳ ׳™׳ ׳׳¢׳‘׳•׳“׳”</div>
                    <p class="tr-phone-client-text">${escapeHtml(current.clientText || '')}</p>
                    <div class="tr-phone-highlights">${highlightButtons}</div>
                    <div class="tr-phone-top3-line">
                        <strong>3 ׳¢׳•׳’׳ ׳™׳ ׳׳•׳‘׳™׳׳™׳:</strong>
                        <span>${escapeHtml(topAnchors.map((item) => item.text).join(' | '))}</span>
                    </div>
                </section>

                ${wordBoardHtml}
                ${breenTableHtml}
                ${focusPanelHtml}
                ${qaPanelHtml}
                ${donePanelHtml}
                ${replyHtml}
                ${challengeHtml}
                ${transcriptHtml}

                <div class="tr-phone-footer-actions">
                    <button type="button" class="tr-phone-secondary-btn" data-tr-phone-action="restart">׳׳”׳×׳—׳™׳ ׳׳—׳“׳©</button>
                    <button type="button" class="tr-phone-primary-btn" data-tr-phone-action="next">׳”׳׳§׳¨׳” ׳”׳‘׳</button>
                </div>

                ${phone.toast ? `<div class="tr-phone-toast" data-tone="${escapeHtml(phone.toastTone || 'info')}">${escapeHtml(phone.toast)}</div>` : ''}
            </div>
        `;
    }

    function setFeedback(message, tone) {
        if (!state.elements?.feedback) return;
        state.elements.feedback.textContent = message || '';
        state.elements.feedback.dataset.tone = tone || 'info';
        if (typeof root.triggerPlayfulFeedbackFx === 'function') {
            root.triggerPlayfulFeedbackFx(state.elements.feedback, tone || 'info');
        }
    }

    function setStepStatus(message) {
        if (!state.elements?.step) return;
        state.elements.step.textContent = message || '';
    }

    function renderBoard() {
        const current = getCurrentScenario();
        if (!current || !state.elements) return;
        if (state.uiMode === 'phone') {
            renderPhoneBoard();
            return;
        }

        const rows = root.triplesRadarCore.ROWS;
        const currentEvaluation = state.selectedCategory
            ? root.triplesRadarCore.evaluateSelection(current.correctCategory, state.selectedCategory)
            : null;
        const correctCategoryNormalized = root.triplesRadarCore.normalizeCategoryId(current.correctCategory);
        const correctRowId = root.triplesRadarCore.getRowIdByCategory(current.correctCategory);
        const modeMeta = getModeMeta();

        state.elements.statement.textContent = current.clientText || '';
        state.elements.focusHint.textContent = getFocusHintText(current);
        state.elements.counter.textContent = `${state.index + 1}/${state.scenarios.length}`;
        state.elements.score.textContent = `${state.score}`;
        state.elements.solvedCount.textContent = `${state.solvedCount}`;
        if (state.elements.step) state.elements.step.textContent = getStepText();
        renderDirectionSummary(currentEvaluation);

        state.elements.rows.innerHTML = rows.map((row) => {
            const rowMeta = getRowMeta(row.id);
            const isCorrectRow = correctRowId === row.id;
            const isHintRow = !state.solved && state.rowHintUsed && isCorrectRow;
            const isSolvedRow = state.solved && isCorrectRow;
            const isStrongestRow = isCorrectRow;
            const rowClass = [
                'triples-radar-row',
                rowMeta.colorClass,
                isStrongestRow ? 'is-strongest' : '',
                isHintRow ? 'is-hint' : '',
                isSolvedRow ? 'is-solved' : ''
            ].filter(Boolean).join(' ');

            // Display order is reversed for RTL training scan (e.g., Mind Reading on the right in Triple 1).
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
                        title="${escapeHtml(getCategoryMeta(normalizedCategory)?.nextPrompt || getCategoryLabelHe(normalizedCategory))}"
                        aria-label="${escapeHtml(`${getCategoryLabelHe(normalizedCategory)}. ${getCategoryMeta(normalizedCategory)?.nextPrompt || ''}`.trim())}"
                        ${state.solved ? 'disabled' : ''}>
                        <span class="cat-label">${escapeHtml(getCategoryLabelHe(normalizedCategory))}</span>
                    </button>
                `;
            }).join('');

            return `
                <article class="${rowClass}" data-row-id="${row.id}">
                    <div class="triples-radar-row-head">
                        <div class="triples-radar-row-headline">
                            <strong>${escapeHtml(`${rowMeta.directionLabel} · ${rowMeta.heading}`)}</strong>
                            ${isStrongestRow ? `<span class="triples-radar-row-badge">${escapeHtml(modeMeta.rowBadge)}</span>` : ''}
                        </div>
                        <small>${escapeHtml(`${rowMeta.canonicalLabel} בטבלת ברין · ${rowMeta.directions[state.uiMode] || rowMeta.directions.details}`)}</small>
                    </div>
                    <div class="triples-radar-row-cats">
                        ${cards}
                    </div>
                </article>
            `;
        }).join('');
    }

    function updateHintControls() {
        if (state.uiMode === 'phone') return;
        if (state.elements?.rowHintBtn) {
            state.elements.rowHintBtn.disabled = state.solved || state.rowHintUsed;
        }
        if (state.elements?.catHintBtn) {
            state.elements.catHintBtn.disabled = state.solved || state.categoryHintUsed;
        }
    }

    function handleAutoHints(result) {
        if (state.solved) return;
        if (state.attemptsInScenario >= 2 && !state.rowHintUsed) {
            state.rowHintUsed = true;
            setFeedback('הכיוון החזק כבר מודגש. עכשיו כדאי לדייק בתוך אותה שורה.', 'warn');
        }
        if (state.attemptsInScenario >= 3 && result.status !== 'exact' && !state.categoryHintUsed) {
            state.categoryHintUsed = true;
            setFeedback('אם עדיין קשה לדייק, סימנתי גם את התבנית המתאימה בתוך הכיוון הזה.', 'warn');
        }
    }

    function evaluatePick(categoryId) {
        if (state.solved) return;
        const current = getCurrentScenario();
        if (!current) return;

        state.selectedCategory = categoryId;
        state.attemptsInScenario += 1;

        const result = root.triplesRadarCore.evaluateSelection(current.correctCategory, categoryId);
        const correctRowMeta = getRowMeta(result.correctRowId);
        const correctLabel = getCategoryLabelHe(current.correctCategory);
        if (result.status === 'exact') {
            state.solved = true;
            state.solvedCount += 1;
            state.score += Math.max(1, 4 - Math.max(1, state.attemptsInScenario));
            saveProgress();
            setFeedback(`בחירה מדויקת: ${correctLabel}. זה הדיוק המתאים בתוך ${correctRowMeta.heading}.`, 'success');
            setStepStatus(getStepText());
            if (typeof root.playUISound === 'function') root.playUISound('success');
        } else if (result.status === 'same_row') {
            setFeedback(`הכיוון נכון, אבל עדיין לא התבנית המדויקת. הישאר/י בתוך ${correctRowMeta.heading}.`, 'warn');
            setStepStatus(state.uiMode === 'rules'
                ? `המסגרת נכונה. עכשיו צריך לדייק איזה כלל או פירוש הוא המרכזי בתוך ${correctRowMeta.heading}.`
                : `הכיוון נכון. עכשיו צריך לדייק איזה פרט חסר בדיוק בתוך ${correctRowMeta.heading}.`);
            if (typeof root.playUISound === 'function') root.playUISound('warning');
            handleAutoHints(result);
        } else if (result.status === 'wrong_row') {
            setFeedback(`זה עדיין לא הכיוון המרכזי. המשפט הזה נשען יותר על ${correctRowMeta.heading}.`, 'danger');
            setStepStatus(state.uiMode === 'rules'
                ? 'חפש/י את הכיוון שמסביר איזה כלל, שיפוט או פירוש מארגנים את המשפט.'
                : 'חפש/י את הכיוון שמחזיר למשפט את המידע שחסר כדי להבין מה באמת נאמר.');
            if (typeof root.playUISound === 'function') root.playUISound('error');
            handleAutoHints(result);
        } else {
            setFeedback('לא הצלחתי לזהות בחירה תקפה. בחר/י שוב תבנית מתוך הטבלה.', 'warn');
            setStepStatus(getStepText());
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
        if (state.uiMode === 'phone') resetPhoneScenarioFlow();
        setFeedback('מקרה חדש נטען. קרא/י את המשפט ובחר/י את כיוון החשיבה שנכון לפתוח ממנו.', 'info');
        setStepStatus(getStepText());
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
        if (state.uiMode === 'phone') resetPhoneScenarioFlow();
        setFeedback('התחלנו מחדש מההתחלה, עם אותו מבנה עבודה ובלי בחירות קודמות.', 'info');
        setStepStatus(getStepText());
        updateHintControls();
        renderBoard();
    }

    function revealRowHint() {
        if (state.solved || state.rowHintUsed) return;
        state.rowHintUsed = true;
        setFeedback('הכיוון החזק כבר הודגש בטבלה. עכשיו אפשר להישאר בתוכו ולדייק לתבנית.', 'info');
        updateHintControls();
        renderBoard();
    }

    function revealCategoryHint() {
        if (state.solved || state.categoryHintUsed) return;
        state.categoryHintUsed = true;
        setFeedback('סימנתי את התבנית המדויקת בתוך הכיוון החזק, כדי שאפשר יהיה לראות למה היא בולטת כאן.', 'info');
        updateHintControls();
        renderBoard();
    }

    function bindEvents() {
        const rootEl = state.elements?.root;
        if (!rootEl || rootEl.dataset.boundTriplesRadar === 'true') return;
        rootEl.dataset.boundTriplesRadar = 'true';

        rootEl.addEventListener('click', (event) => {
            const phoneAnchorBtn = event.target.closest('[data-tr-phone-anchor-id]');
            if (phoneAnchorBtn) {
                const anchorId = phoneAnchorBtn.getAttribute('data-tr-phone-anchor-id') || '';
                phoneSelectAnchor(anchorId);
                return;
            }

            const phoneCatBtn = event.target.closest('[data-tr-phone-cat-id]');
            if (phoneCatBtn) {
                const categoryId = phoneCatBtn.getAttribute('data-tr-phone-cat-id') || '';
                phoneUseCategory(categoryId);
                return;
            }

            const phoneActionBtn = event.target.closest('[data-tr-phone-action]');
            if (phoneActionBtn) {
                const action = phoneActionBtn.getAttribute('data-tr-phone-action') || '';
                if (action === 'meta') phoneOpenMeta();
                if (action === 'generate') phoneGenerateReply();
                if (action === 'challenge') phoneGenerateChallenge();
                if (action === 'transcript') phoneToggleTranscript();
                if (action === 'next') nextScenario();
                if (action === 'restart') restartRun();
                return;
            }

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
            modeSummary: document.getElementById('triples-radar-mode-summary'),
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

    function captureDesktopRootMarkup() {
        const rootEl = document.getElementById('triples-radar-root');
        if (!rootEl) return null;
        if (!state.desktopRootMarkup && rootEl.innerHTML) {
            state.desktopRootMarkup = rootEl.innerHTML;
        }
        return rootEl;
    }

    function setupElementsForCurrentMode() {
        const rootEl = captureDesktopRootMarkup();
        if (!rootEl) {
            state.elements = null;
            return;
        }

        if (state.uiMode === 'phone') {
            state.elements = { root: rootEl };
            return;
        }

        const hasDesktopShell = !!rootEl.querySelector('#triples-radar-statement');
        if (!hasDesktopShell && state.desktopRootMarkup) {
            rootEl.innerHTML = state.desktopRootMarkup;
        }
        setupElements();
    }

    function bindModeToggleEvents() {
        const modeSwitch = document.getElementById('triples-radar-mode-switch');
        if (!modeSwitch || modeSwitch.dataset.boundTriplesMode === 'true') return;
        modeSwitch.dataset.boundTriplesMode = 'true';

        modeSwitch.addEventListener('click', (event) => {
            const btn = event.target.closest('[data-tr-ui-mode]');
            if (!btn) return;
            const toggleKey = (btn.getAttribute('data-tr-ui-mode') || '').trim().toLowerCase();
            const nextMode = UI_MODE_BY_TOGGLE_KEY[toggleKey];
            if (!nextMode) return;
            setUiMode(nextMode);
        });
    }

    function setUiMode(nextMode, options = {}) {
        const normalizedMode = normalizeUiMode(nextMode);
        const force = options.force === true;
        if (!force && normalizedMode === state.uiMode) {
            updateModeToggleUI();
            renderBoard();
            return;
        }

        state.uiMode = normalizedMode;
        saveUiModePreference();
        setupElementsForCurrentMode();
        bindEvents();
        updateModeToggleUI();

        if (state.uiMode === 'phone' && state.scenarios.length) {
            resetPhoneScenarioFlow();
        }

        if (!state.scenarios.length || !state.elements?.root) return;

        setFeedback(getIntroFeedbackText(), 'info');
        setStepStatus(getStepText());
        updateHintControls();
        renderBoard();
    }

    async function setupTriplesRadarModule() {
        bindModeToggleEvents();
        state.uiMode = loadUiModePreference();
        setupElementsForCurrentMode();
        updateModeToggleUI();
        if (!state.elements?.root) return;
        if (!root.triplesRadarCore) {
            state.elements.root.innerHTML = '<p class="triples-radar-error">שגיאה: מנוע מכ״ם השלשות לא נטען.</p>';
            return;
        }

        if (!state.data) {
            try {
                state.data = await loadData();
                state.scenarios = [...state.data.scenarios];
            } catch (error) {
                state.elements.root.innerHTML = '<p class="triples-radar-error">לא הצלחנו לטעון את מקרי התרגול כרגע. רעננו את העמוד ונסו שוב.</p>';
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
        if (state.uiMode === 'phone') resetPhoneScenarioFlow();

        bindEvents();
        setFeedback(getIntroFeedbackText(), 'info');
        setStepStatus(getStepText());
        updateHintControls();
        renderBoard();
    }

    return Object.freeze({
        setupTriplesRadarModule
    });
});

