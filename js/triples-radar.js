(function attachTriplesRadarModule(rootFactory) {
    const root = typeof globalThis !== 'undefined'
        ? globalThis
        : (typeof window !== 'undefined' ? window : this);
    const api = rootFactory(root);
    root.setupTriplesRadarModule = api.setupTriplesRadarModule;
})(function createTriplesRadarModule(root) {
    const STORAGE_KEY = 'triples_radar_progress_v1';
    const UI_MODE_STORAGE_KEY = 'triples_radar_ui_mode_v2';
    const SESSION_MODE_STORAGE_KEY = 'triples_radar_session_mode_v1';
    const EXAM_TIME_LIMIT_SECONDS = 75;
    const EXAM_WARNING_SECONDS = 15;
    const GAME_HINT_TIME_PENALTY_SECONDS = 8;
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
            step: 'קרא/י את המשפט, בחר/י שורה, ואז דייק/י לתבנית המתאימה.',
            solvedStep: 'הכיוון ברור. עכשיו אפשר לראות מה חסר או לעבור למקרה הבא.',
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
            step: 'קרא/י את המשפט, בחר/י שורה, ואז דייק/י למסגרת המתאימה.',
            solvedStep: 'המסגרת ברורה. עכשיו אפשר לנסח איזה כלל מנהל את המשפט.',
            introFeedback: 'מצב כללים: עובדים מלמעלה ובודקים איזה כלל, שיפוט או פירוש מחזיקים את האמירה במקום.',
            strongestTitle: 'מה המסגרת החזקה כאן?',
            strongestLead: 'במצב כללים זה הכיוון שמסביר איזה כלל או פירוש מארגנים את האמירה.',
            nextMoveLabel: 'איך מפרקים את הכלל',
            rowBadge: 'מסגרת חזקה'
        })
    });

    const SESSION_MODE_META = Object.freeze({
        learn: Object.freeze({
            label: 'למידה',
            badge: 'למידה',
            timerLabel: 'קצב',
            timerIdle: 'פתוח',
            feedbackIntro: 'מצב למידה: הטבלה פתוחה להבנה, אפשר להעמיק בכל שורה, ויש גם רמזים אם צריך.',
            summaryLead: 'כאן מותר לעצור, לקרוא, ולהבין למה הבחירה עובדת לפני שעוברים הלאה.'
        }),
        exam: Object.freeze({
            label: 'משחק',
            badge: 'משחק',
            timerLabel: 'זמן',
            timerIdle: '01:15',
            feedbackIntro: 'מצב משחק: יש שעון, נקודות וצלילי זמן. רמזון קיים, אבל עולה בזמן.',
            summaryLead: 'כאן עובדים מהר ונקי: הטיימר דוחף קדימה, ורמזון נותן כיוון במחיר של זמן.'
        })
    });

    const ROW_META = Object.freeze({
        row1: Object.freeze({
            colorClass: 'row-sky',
            canonicalLabel: 'שלשה ראשונה',
            directionLabel: 'תוכן חסר',
            heading: 'מקור, הנחה וכוונה',
            directions: Object.freeze({
                details: 'בודקים מי קבע, מה הונח מראש, ואיזו כוונה יוחסה בלי ראיה.',
                rules: 'בודקים איזה שיפוט סמוי, הנחת יסוד או ייחוס כוונה מארגנים את המשפט.'
            }),
            examples: Object.freeze({
                details: 'דוגמה: מי בדיוק אמר שזה נכון, ולפי איזה בסיס?',
                rules: 'דוגמה: איזה כלל סמוי קובע כאן מה נחשב נכון?'
            })
        }),
        row2: Object.freeze({
            colorClass: 'row-teal',
            canonicalLabel: 'שלשה שנייה',
            directionLabel: 'חוק/סיבה',
            heading: 'חוקי משחק וגבולות',
            directions: Object.freeze({
                details: 'בודקים מה בדיוק חייב, אפשר או גורם למה, ואיפה חסר תנאי ברור.',
                rules: 'בודקים איזה חוק משחק, מגבלה או חוק סיבתי קובעים כאן את הסיפור.'
            }),
            examples: Object.freeze({
                details: 'דוגמה: מה בדיוק מונע? ומה צריך כדי שזה כן יתאפשר?',
                rules: 'דוגמה: איזה חוק סיבה-תוצאה מנהל את המשפט?'
            })
        }),
        row3: Object.freeze({
            colorClass: 'row-amber',
            canonicalLabel: 'שלשה שלישית',
            directionLabel: 'פירוש וזהות',
            heading: 'משמעות, זהות והסקה',
            directions: Object.freeze({
                details: 'בודקים איפה פעולה חיה הפכה לשם, לזהות או למסקנה רחבה מדי.',
                rules: 'בודקים איזה פירוש הופך אירוע למשמעות, לזהות או להוכחה.'
            }),
            examples: Object.freeze({
                details: 'דוגמה: מה הפעולה המדויקת שקורית כאן בפועל?',
                rules: 'דוגמה: איך אירוע אחד הופך כאן לזהות או הוכחה?'
            })
        }),
        row4: Object.freeze({
            colorClass: 'row-violet',
            canonicalLabel: 'שלשה רביעית',
            directionLabel: 'הקשר וזמן',
            heading: 'הקשר, זמן וייחוס',
            directions: Object.freeze({
                details: 'בודקים מי בדיוק, מתי בדיוק, איפה בדיוק וביחס למה.',
                rules: 'בודקים איזו מסגרת הקשר גורמת לטענה להישמע מוחלטת למרות שהיא תלויה בזמן, מקום או ייחוס.'
            }),
            examples: Object.freeze({
                details: 'דוגמה: מתי זה כן קורה ומתי לא?',
                rules: 'דוגמה: איזה הקשר חסר גורם לטענה להישמע מוחלטת?'
            })
        }),
        row5: Object.freeze({
            colorClass: 'row-rose',
            canonicalLabel: 'שלשה חמישית',
            directionLabel: 'חוויה ופעולה',
            heading: 'קרקע חושית ופעולה',
            directions: Object.freeze({
                details: 'בודקים מה רואים, שומעים או מרגישים בפועל, ומה קורה צעד-צעד.',
                rules: 'בודקים לאיזה מבחן מציאות או צעד התנהגותי צריך להחזיר את המשפט.'
            }),
            examples: Object.freeze({
                details: 'דוגמה: מה רואים או שומעים ממש, בלי פרשנות?',
                rules: 'דוגמה: איזה צעד קטן בודק אם הפירוש נכון?'
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

    const ROW_DETAIL_META = Object.freeze({
        row1: Object.freeze({
            lead: 'השורה הראשונה בודקת מי קבע את הסטנדרט, מה כבר הונח מראש, ואיזו כוונה יוחסה בלי ראיה.',
            impact: 'כשבוחרים את השורה הזו נכון, מתברר שהמשפט לא נשען על עובדה מוצקה אלא על מקור סמוי, הנחה או קריאת כוונה.',
            videoPrep: 'לפני וידאו או הדגמה, שימו לב אם המטופל מצטט אמת מוחלטת, קופץ לכוונת האחר, או בונה את הכול על הנחה שטרם נאמרה.',
            bridge: 'זו נקודת הכניסה העליונה של המפה: לפני שמגיעים לחוקים, סיבות או זהויות, בודקים קודם מי אמר, מה הונח, ומה יוחס.'
        }),
        row2: Object.freeze({
            lead: 'השורה השנייה עוסקת בכלל שמארגן את המשפט: מה חייב לקרות, מה אי אפשר, ומה כביכול גורם למה.',
            impact: 'בחירה בשורה הזאת אומרת שהבעיה אינה רק פרט חסר, אלא חוק משחק, גבול או סיבתיות קשיחה שתופסים את כל המרחב.',
            videoPrep: 'לפני וידאו או הדגמה, חפשו מילים של חובה, אי-אפשר, תמיד, או קשר אוטומטי בין אירוע אחד לתוצאה אחרת.',
            bridge: 'אחרי שבודקים מקור/הנחה, המפה יורדת לחוקי המשחק. מכאן אפשר להמשיך למישור של זהות ומשמעות או לחזור להקשר ממשי.'
        }),
        row3: Object.freeze({
            lead: 'השורה השלישית עוסקת ברגע שבו פעולה חיה הופכת למשמעות קבועה, לזהות או למסקנה.',
            impact: 'בחירה כאן מצביעה על כך שהמטופל כבר לא רק מתאר מה קרה, אלא מסיק מי הוא, מה זה אומר, או מה זה מוכיח.',
            videoPrep: 'לפני וידאו או הדגמה, בדקו אם פעולה הוקפאה לשם עצם, אם מקרה אחד הפך לזהות, או אם אירוע אחד נהיה הוכחה רחבה.',
            bridge: 'זו שורת האמצע: היא מחברת בין חוקים וסיבות לבין הקשר, זמן וייחוס. כאן נבנה הסיפור על "מה זה אומר עליי".'
        }),
        row4: Object.freeze({
            lead: 'השורה הרביעית מחזירה את המשפט לזמן, מקום, מדד וייחוס: מי בדיוק, מתי בדיוק, ביחס למה בדיוק.',
            impact: 'כשזו השורה הנכונה, המשמעות משתנה ברגע שמחזירים את ההקשר החסר. הטענה נשמעה מוחלטת רק כי המסגרת נעלמה.',
            videoPrep: 'לפני וידאו או הדגמה, חפשו השוואה בלי מדד, זמן/מקום שלא נאמרו, או קבוצה עמומה כמו "הם" או "כולם".',
            bridge: 'כאן המפה כבר יורדת לקרקע: מה שהתחיל כפירוש או זהות מתגלה כתלוי הקשר, זמן, מקום או ייחוס חסר.'
        }),
        row5: Object.freeze({
            lead: 'השורה החמישית מחזירה את השפה לחושים ולפעולה: מה באמת רואים, שומעים, מרגישים, ומה קורה צעד-צעד.',
            impact: 'בחירה בשורה הזאת אומרת שהעבודה המרכזית היא להפסיק לדבר באוויר ולהחזיר את המשפט לקרקע חושית והתנהגותית.',
            videoPrep: 'לפני וידאו או הדגמה, בדקו אם יש "זה", "משהו", פועל כללי מדי, או חוויה שאין לה מבחן מציאות קונקרטי.',
            bridge: 'זו תחתית המפה: אחרי פירושים, חוקים והקשרים, כאן בודקים מה בכלל ניתן לראות, לשמוע או לעשות בפועל.'
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
        expandedRowId: '',
        inlineHintRowId: '',
        elements: null,
        uiMode: 'details',
        sessionMode: 'learn',
        examDeadlineTs: 0,
        examSecondsLeft: EXAM_TIME_LIMIT_SECONDS,
        examExpired: false,
        lastTimerSoundSecond: null,
        timerInterval: null,
        overlay: {
            type: '',
            rowId: '',
            locked: false
        },
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

    function getDefaultSessionMode() {
        return 'learn';
    }

    function normalizeSessionMode(value) {
        const raw = String(value || '').trim().toLowerCase();
        if (!raw) return getDefaultSessionMode();
        if (raw === 'learn' || raw === 'learning' || raw === 'לימוד' || raw === 'למידה') return 'learn';
        if (raw === 'exam' || raw === 'test' || raw === 'quiz' || raw === 'מבחן' || raw === 'משחק' || raw === 'game') return 'exam';
        return getDefaultSessionMode();
    }

    function loadSessionModePreference() {
        try {
            return normalizeSessionMode(localStorage.getItem(SESSION_MODE_STORAGE_KEY) || '');
        } catch (error) {
            return getDefaultSessionMode();
        }
    }

    function saveSessionModePreference() {
        try {
            localStorage.setItem(SESSION_MODE_STORAGE_KEY, state.sessionMode);
        } catch (error) {
            // Ignore storage errors.
        }
    }

    function getSessionModeMeta() {
        return SESSION_MODE_META[state.sessionMode] || SESSION_MODE_META.learn;
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

        const sessionSwitch = document.getElementById('triples-radar-session-switch');
        if (sessionSwitch) {
            sessionSwitch.querySelectorAll('[data-tr-session-mode]').forEach((btn) => {
                const isActive = normalizeSessionMode(btn.getAttribute('data-tr-session-mode') || '') === state.sessionMode;
                btn.classList.toggle('is-active', isActive);
                btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
            });
        }

        const sessionMeta = getSessionModeMeta();
        if (state.elements?.sessionBadge) state.elements.sessionBadge.textContent = sessionMeta.badge;
        if (state.elements?.timerLabel) state.elements.timerLabel.textContent = sessionMeta.timerLabel;
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

    function getRowDetailMeta(rowId) {
        return ROW_DETAIL_META[rowId] || ROW_DETAIL_META.row1;
    }

    function getRowById(rowId) {
        return (root.triplesRadarCore?.ROWS || []).find((row) => row.id === rowId) || null;
    }

    function formatSeconds(totalSeconds) {
        const safe = Math.max(0, Math.floor(Number(totalSeconds) || 0));
        const minutes = Math.floor(safe / 60);
        const seconds = safe % 60;
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    function updateTimerUI() {
        if (!state.elements?.timer || state.uiMode === 'phone') return;
        if (state.sessionMode === 'exam') {
            state.elements.timer.textContent = formatSeconds(state.examSecondsLeft);
            state.elements.timer.closest('span')?.setAttribute('data-time-state', state.examSecondsLeft <= EXAM_WARNING_SECONDS ? 'warning' : 'active');
            return;
        }
        state.elements.timer.textContent = getSessionModeMeta().timerIdle;
        state.elements.timer.closest('span')?.setAttribute('data-time-state', 'idle');
    }

    function stopExamTimer() {
        if (state.timerInterval) {
            clearInterval(state.timerInterval);
            state.timerInterval = null;
        }
        state.examDeadlineTs = 0;
        state.lastTimerSoundSecond = null;
    }

    function emitExamTimerSoundTick(next) {
        if (state.sessionMode !== 'exam' || typeof root.playUISound !== 'function') return;
        const safeSecond = Math.max(0, Math.floor(Number(next) || 0));
        if (safeSecond === state.lastTimerSoundSecond) return;
        state.lastTimerSoundSecond = safeSecond;

        if (safeSecond <= 0) return;
        if (safeSecond <= 10) {
            root.playUISound('warning');
            return;
        }
        if (safeSecond % 15 === 0) {
            root.playUISound('tap_soft');
        }
    }

    function applyExamTimeout() {
        if (state.sessionMode !== 'exam' || state.solved || state.examExpired) return;
        const current = getCurrentScenario();
        if (!current || !root.triplesRadarCore) return;

        state.examExpired = true;
        state.rowHintUsed = true;
        state.categoryHintUsed = true;
        stopExamTimer();
        state.examSecondsLeft = 0;
        updateTimerUI();
        setFeedback('הזמן הסתיים. אפשר לראות עכשיו מה היה הדיוק המתאים ולעבור למקרה הבא.', 'danger');
        renderBoard();
        openOverlay('timeout');
        if (typeof root.playUISound === 'function') root.playUISound('error');
    }

    function startExamTimer() {
        stopExamTimer();
        if (state.sessionMode !== 'exam' || state.solved || state.examExpired || !state.scenarios.length) {
            updateTimerUI();
            return;
        }

        state.examSecondsLeft = EXAM_TIME_LIMIT_SECONDS;
        state.examDeadlineTs = Date.now() + (EXAM_TIME_LIMIT_SECONDS * 1000);
        state.lastTimerSoundSecond = null;
        updateTimerUI();
        state.timerInterval = setInterval(() => {
            if (state.sessionMode !== 'exam') {
                stopExamTimer();
                return;
            }
            const next = Math.max(0, Math.ceil((state.examDeadlineTs - Date.now()) / 1000));
            state.examSecondsLeft = next;
            emitExamTimerSoundTick(next);
            updateTimerUI();
            if (state.uiMode === 'phone' && state.elements?.root) renderBoard();
            if (next <= 0) applyExamTimeout();
        }, 1000);
    }

    function playResultSound(tone) {
        if (state.sessionMode !== 'exam' || typeof root.playUISound !== 'function') return;
        if (tone === 'success') root.playUISound('success');
        if (tone === 'warn') root.playUISound('warning');
        if (tone === 'danger') root.playUISound('error');
    }

    function closeOverlay() {
        const overlay = state.elements?.overlay;
        if (!overlay) return;
        state.overlay = { type: '', rowId: '', locked: false };
        overlay.hidden = true;
        overlay.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('triples-radar-overlay-open');
    }

    function renderOverlay(type) {
        const overlay = state.elements?.overlay;
        const titleEl = state.elements?.overlayTitle;
        const kickerEl = state.elements?.overlayKicker;
        const bodyEl = state.elements?.overlayBody;
        const actionsEl = state.elements?.overlayActions;
        if (!overlay || !titleEl || !kickerEl || !bodyEl || !actionsEl) return;

        const current = getCurrentScenario();
        const correctCategoryId = root.triplesRadarCore?.normalizeCategoryId(current?.correctCategory || '') || '';
        const correctRowId = root.triplesRadarCore?.getRowIdByCategory(correctCategoryId) || '';
        const correctRow = getRowById(correctRowId);
        const correctRowMeta = getRowMeta(correctRowId);
        const correctRowDetail = getRowDetailMeta(correctRowId);
        const categoryMeta = getCategoryMeta(correctCategoryId);

        if (type === 'concept') {
            const focusRowId = state.overlay.rowId || correctRowId || 'row1';
            const focusRow = getRowById(focusRowId);
            const focusMeta = getRowMeta(focusRowId);
            const focusDetail = getRowDetailMeta(focusRowId);
            const rowCards = (root.triplesRadarCore?.ROWS || []).map((row) => {
                const meta = getRowMeta(row.id);
                const categories = row.categories.map((categoryId) => getCategoryLabelHe(categoryId)).reverse().join(' · ');
                return `
                    <article class="triples-radar-overlay-row-card ${escapeHtml(meta.colorClass)} ${row.id === focusRowId ? 'is-active' : ''}">
                        <strong>${escapeHtml(`${meta.canonicalLabel} · ${meta.heading}`)}</strong>
                        <p>${escapeHtml(meta.directions[state.uiMode] || meta.directions.details)}</p>
                        <small>${escapeHtml(categories)}</small>
                    </article>
                `;
            }).join('');

            titleEl.textContent = 'רקע מושגי + טבלת ברין';
            kickerEl.textContent = 'הכנה לעבודה על השלשה והקשר שלה בתוך המפה';
            bodyEl.innerHTML = `
                <section class="triples-radar-overlay-block">
                    <p>${escapeHtml(getSessionModeMeta().summaryLead)}</p>
                    <div class="triples-radar-overlay-bullets">
                        <p><strong>לפני וידאו/הדגמה:</strong> ${escapeHtml(focusDetail.videoPrep)}</p>
                        <p><strong>השורה הפעילה כרגע:</strong> ${escapeHtml(`${focusMeta.canonicalLabel} · ${focusMeta.heading}`)}</p>
                        <p><strong>למה היא חשובה:</strong> ${escapeHtml(focusDetail.impact)}</p>
                    </div>
                </section>
                <section class="triples-radar-overlay-block">
                    <h4>טבלת ברין - המפה המלאה</h4>
                    <div class="triples-radar-overlay-row-grid">${rowCards}</div>
                </section>
                <section class="triples-radar-overlay-block triples-radar-overlay-block--focus">
                    <h4>${escapeHtml(`${focusMeta.canonicalLabel} · ${focusMeta.heading}`)}</h4>
                    <p>${escapeHtml(focusDetail.lead)}</p>
                    <p>${escapeHtml(focusDetail.bridge)}</p>
                    <figure class="triples-radar-overlay-figure">
                        <img src="assets/svg/meta-model-breen-table.svg" data-versioned-src="assets/svg/meta-model-breen-table.svg" alt="טבלת המטה-מודל של מייקל ברין עם חמש שורות של שלשות קשורות" loading="lazy" decoding="async">
                        <figcaption>טבלת ברין המלאה - חמש שורות, שלוש קטגוריות בכל שורה.</figcaption>
                    </figure>
                </section>
            `;
            actionsEl.innerHTML = `
                ${focusRow ? `<button type="button" class="btn btn-secondary" data-tr-action="row-detail" data-row-id="${escapeHtml(focusRow.id)}">העמקה על השורה הפעילה</button>` : ''}
                <a class="btn btn-secondary" href="assets/svg/meta-model-breen-table.svg" data-versioned-href="assets/svg/meta-model-breen-table.svg" target="_blank" rel="noopener noreferrer">פתח את הטבלה המלאה</a>
                <button type="button" class="btn btn-primary" data-tr-action="close-overlay">חזרה ללוח</button>
            `;
            return;
        }

        if (type === 'row-detail') {
            const rowId = state.overlay.rowId || correctRowId || 'row1';
            const row = getRowById(rowId);
            const rowMeta = getRowMeta(rowId);
            const rowDetail = getRowDetailMeta(rowId);
            const rowIndex = Math.max(0, (root.triplesRadarCore?.ROWS || []).findIndex((item) => item.id === rowId));
            const prevRow = root.triplesRadarCore?.ROWS?.[rowIndex - 1] || null;
            const nextRow = root.triplesRadarCore?.ROWS?.[rowIndex + 1] || null;
            const categoryCards = (row?.categories || []).map((categoryId) => {
                const category = getCategoryMeta(categoryId);
                return `
                    <article class="triples-radar-overlay-category-card">
                        <strong>${escapeHtml(getCategoryLabelHe(categoryId))}</strong>
                        <p>${escapeHtml(state.uiMode === 'rules' ? (category?.rulesWhy || '') : (category?.detailsWhy || ''))}</p>
                        <small>${escapeHtml(category?.nextPrompt || '')}</small>
                    </article>
                `;
            }).reverse().join('');

            titleEl.textContent = `${rowMeta.canonicalLabel} · ${rowMeta.heading}`;
            kickerEl.textContent = 'העמקה על השורה, המשמעות שלה, והקשר לשורות הסמוכות';
            bodyEl.innerHTML = `
                <section class="triples-radar-overlay-block">
                    <p>${escapeHtml(rowDetail.lead)}</p>
                    <div class="triples-radar-overlay-bullets">
                        <p><strong>מה אומרת בחירה בשורה הזו:</strong> ${escapeHtml(rowDetail.impact)}</p>
                        <p><strong>ככה מזהים אותה מהר:</strong> ${escapeHtml(rowDetail.videoPrep)}</p>
                        <p><strong>הקשר בתוך המפה:</strong> ${escapeHtml(rowDetail.bridge)}</p>
                    </div>
                </section>
                <section class="triples-radar-overlay-block">
                    <h4>שלוש הקטגוריות של השורה</h4>
                    <div class="triples-radar-overlay-category-grid">${categoryCards}</div>
                </section>
                <section class="triples-radar-overlay-block">
                    <h4>שכנים במפה</h4>
                    <div class="triples-radar-overlay-neighbors">
                        <article class="triples-radar-overlay-neighbor ${prevRow ? '' : 'is-empty'}">
                            <span>לפני</span>
                            <strong>${escapeHtml(prevRow ? getRowMeta(prevRow.id).heading : 'זו שורת הפתיחה של המפה')}</strong>
                            <p>${escapeHtml(prevRow ? getRowMeta(prevRow.id).directions[state.uiMode] || getRowMeta(prevRow.id).directions.details : 'מכאן מתחילים בבדיקת מקור, הנחה וכוונה לפני שיורדים לחוקים ולהקשרים.')}</p>
                        </article>
                        <article class="triples-radar-overlay-neighbor ${nextRow ? '' : 'is-empty'}">
                            <span>אחרי</span>
                            <strong>${escapeHtml(nextRow ? getRowMeta(nextRow.id).heading : 'זו שורת הקרקע של המפה')}</strong>
                            <p>${escapeHtml(nextRow ? getRowMeta(nextRow.id).directions[state.uiMode] || getRowMeta(nextRow.id).directions.details : 'מכאן כבר מחזירים את הכול למה שניתן לראות, לשמוע או לעשות בפועל.')}</p>
                        </article>
                    </div>
                </section>
            `;
            actionsEl.innerHTML = `
                <button type="button" class="btn btn-secondary" data-tr-action="open-concept" data-row-id="${escapeHtml(rowId)}">חזרה לטבלת ברין</button>
                <button type="button" class="btn btn-primary" data-tr-action="close-overlay">סגור</button>
            `;
            return;
        }

        if (type === 'result' || type === 'timeout') {
            const selectedLabel = getCategoryLabelHe(type === 'timeout' ? correctCategoryId : state.selectedCategory || correctCategoryId);
            const nextPrompt = normalizeSpaces(current?.focusHint || categoryMeta?.nextPrompt || '');
            titleEl.textContent = type === 'timeout' ? 'סיכום סבב: הזמן הסתיים' : 'בחירה מדויקת';
            kickerEl.textContent = type === 'timeout'
                ? 'הנה המיקוד שהיה סוגר את הסבב הזה בצורה הכי נקייה'
                : 'הבחירה נסגרה. עכשיו אפשר לראות למה היא משמעותית';
            bodyEl.innerHTML = `
                <section class="triples-radar-overlay-block">
                    <p><strong>המשפט:</strong> ${escapeHtml(current?.clientText || '')}</p>
                    <p><strong>השורה שנושאת את המשקל:</strong> ${escapeHtml(`${correctRowMeta.canonicalLabel} · ${correctRowMeta.heading}`)}</p>
                    <p><strong>התבנית המדויקת:</strong> ${escapeHtml(selectedLabel)}</p>
                </section>
                <section class="triples-radar-overlay-block">
                    <h4>מה המשמעות של הבחירה הזו</h4>
                    <p>${escapeHtml(correctRowDetail.impact)}</p>
                    <p>${escapeHtml(state.uiMode === 'rules' ? (categoryMeta?.rulesWhy || correctRowMeta.directions.rules) : (categoryMeta?.detailsWhy || correctRowMeta.directions.details))}</p>
                </section>
                <section class="triples-radar-overlay-block">
                    <h4>מה כדאי לעשות עם זה בשיחה</h4>
                    <p>${escapeHtml(nextPrompt || correctRowMeta.examples[state.uiMode] || '')}</p>
                    <p>${escapeHtml(correctRowDetail.bridge)}</p>
                </section>
            `;
            actionsEl.innerHTML = `
                <button type="button" class="btn btn-secondary" data-tr-action="open-concept" data-row-id="${escapeHtml(correctRowId)}">היזכר/י בטבלת ברין</button>
                <button type="button" class="btn btn-secondary" data-tr-action="row-detail" data-row-id="${escapeHtml(correctRowId)}">העמקה על השורה</button>
                <button type="button" class="btn btn-primary" data-tr-action="next">המקרה הבא</button>
            `;
        }
    }

    function openOverlay(type, options = {}) {
        const overlay = state.elements?.overlay;
        if (!overlay) return;
        state.overlay = {
            type,
            rowId: String(options.rowId || state.overlay.rowId || ''),
            locked: options.locked === true
        };
        renderOverlay(type);
        overlay.hidden = false;
        overlay.setAttribute('aria-hidden', 'false');
        document.body.classList.add('triples-radar-overlay-open');
    }

    function getIntroFeedbackText() {
        return `${getModeMeta().introFeedback} ${getSessionModeMeta().feedbackIntro}`;
    }

    function getStepText() {
        if (state.examExpired) {
            return 'הזמן הסתיים. אפשר לעבור דרך הסיכום ולסגור את הסבב הבא.';
        }
        if (state.sessionMode === 'exam' && !state.solved) {
            return `${getModeMeta().step} במצב משחק אפשר להפעיל רמזון, אבל הוא מוריד ${GAME_HINT_TIME_PENALTY_SECONDS} שניות מהשעון.`;
        }
        return state.solved ? getModeMeta().solvedStep : getModeMeta().step;
    }

    function getGameStripText(currentEvaluation) {
        if (state.sessionMode !== 'exam') return '';
        if (state.examExpired) {
            return 'הסבב נסגר כי הזמן נגמר. אפשר לראות את הסיכום ולהמשיך למקרה הבא.';
        }
        if (state.solved) {
            return `הסבב נסגר. נשארו ${formatSeconds(state.examSecondsLeft)} על השעון.`;
        }
        if (state.rowHintUsed) {
            return `רמזון הופעל. השורה המובילה הודגשה, והשעון ירד ב-${GAME_HINT_TIME_PENALTY_SECONDS} שניות.`;
        }
        if (currentEvaluation?.status === 'same_row') {
            return 'הכיוון כבר קרוב. נשאר לדייק בתוך אותה שורה לפני שהשעון ייגמר.';
        }
        if (currentEvaluation?.status === 'wrong_row') {
            return 'השעון רץ. שחרר/י את הבחירה האחרונה וחפש/י שורה אחרת לפני שימוש ברמזון.';
        }
        return `משחק מהיר: הזמן רץ. רמזון קיים, אבל עולה ${GAME_HINT_TIME_PENALTY_SECONDS} שניות.`;
    }

    function getFocusHintText(current) {
        if (!state.solved && !state.categoryHintUsed && !state.examExpired) return '';
        const hint = normalizeSpaces(current?.focusHint || '');
        if (!hint) return '';
        return `שאלת הכוונה: ${hint}`;
    }

    function buildDirectionSummary(currentEvaluation) {
        const current = getCurrentScenario();
        if (!current || !root.triplesRadarCore) return null;

        if (!currentEvaluation && !state.rowHintUsed && !state.solved && !state.examExpired) {
            return {
                colorClass: '',
                title: state.sessionMode === 'exam'
                    ? `מצב ${getSessionModeMeta().label} · בוחרים לפני שהשעון יכריע`
                    : 'חמש שורות, שלוש אפשרויות בכל שורה',
                subtitle: state.sessionMode === 'exam'
                    ? 'הטבלה נשארת נקייה. רק רמזון זמין אם צריך כיוון מהיר'
                    : 'לחיצה על "העמקה" תפתח הסבר על כל שורה',
                lead: getSessionModeMeta().summaryLead,
                reason: state.uiMode === 'rules'
                    ? 'במבט כללים מחפשים איזה חוק, פירוש או מסגרת מחזיקים את המשפט כולו.'
                    : 'במבט פרטים מחפשים איפה חסר מקור, זמן, ייחוס, שלב ביניים או עוגן חושי.',
                nextPrompt: state.sessionMode === 'exam'
                    ? `קרא/י את המשפט, בחר/י שורה, ואז דייק/י לתבנית. רמזון יעלה ${GAME_HINT_TIME_PENALTY_SECONDS} שניות אם מפעילים אותו.`
                    : 'לא בטוח/ה? פתח/י העמקה על השורה שמסקרנת אותך, ואז חזור/י ללוח.',
                selectionNote: ''
            };
        }

        if (state.sessionMode === 'exam' && !state.solved && !state.examExpired) {
            return {
                colorClass: '',
                title: `מצב ${getSessionModeMeta().label} · הטבלה עוד פתוחה`,
                subtitle: 'הפידבק המלא נפתח רק אחרי דיוק או בסיום הזמן',
                lead: getSessionModeMeta().summaryLead,
                reason: state.uiMode === 'rules'
                    ? 'כרגע בודקים איזה כלל או פירוש מחזיקים את המשפט, בלי לחשוף את השורה המובילה.'
                    : 'כרגע בודקים איפה חסר מידע, בלי לחשוף מראש איפה המרכז של המקרה.',
                nextPrompt: `אם צריך דחיפה, אפשר להפעיל רמזון חד-פעמי. הוא יאיר את הכיוון, אבל יוריד ${GAME_HINT_TIME_PENALTY_SECONDS} שניות.`,
                selectionNote: state.selectedCategory ? `הבחירה שלך כרגע: ${getCategoryLabelHe(state.selectedCategory)}.` : ''
            };
        }

        if (currentEvaluation?.status === 'wrong_row' && !state.rowHintUsed && !state.categoryHintUsed && !state.solved) {
            return {
                colorClass: '',
                title: 'הבחירה סומנה, אבל המפה עוד לא נפתחה',
                subtitle: 'כרגע עדיף להישאר עם המשוב הקצר ולבדוק שוב',
                lead: 'אם צריך, אפשר לפתוח "העמקה" על שורה מסוימת בלי לחשוף מיד את השורה הנכונה.',
                reason: state.uiMode === 'rules'
                    ? 'במבט כללים שואלים איזה חוק או פירוש מחזיקים את המשפט, ורק אחר כך סוגרים על התבנית.'
                    : 'במבט פרטים שואלים איזה מידע חסר במשפט, ורק אחר כך מצמידים לו קטגוריה מדויקת.',
                nextPrompt: 'אפשר לבחור שוב, או להשתמש ברמז ממוקד אם זה מצב למידה.',
                selectionNote: state.selectedCategory ? `הבחירה שלך כרגע: ${getCategoryLabelHe(state.selectedCategory)}.` : ''
            };
        }

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
        state.elements.modeSummary.innerHTML = '';
        state.elements.modeSummary.hidden = true;
    }

    function normalizeSpaces(text) {
        return String(text || '').replace(/\s+/g, ' ').trim();
    }

    function getScenarioContext(current) {
        const context = normalizeSpaces(current?.contextHe || '');
        if (context) return context;
        const categoryMeta = getCategoryMeta(current?.correctCategory || '');
        return normalizeSpaces(categoryMeta?.detailsWhy || 'קרא/י את הסיטואציה ואז בדוק/י איזה חלק במשפט מבקש דיוק.');
    }

    function getScenarioHighlightEntries(current) {
        const rawGroups = current?.highlightGroups && typeof current.highlightGroups === 'object'
            ? current.highlightGroups
            : {};
        const entries = [];
        Object.entries(rawGroups).forEach(([rowId, values]) => {
            const rowMeta = getRowMeta(rowId);
            uniqueStrings(values).forEach((text) => {
                entries.push({
                    text,
                    rowId,
                    colorClass: rowMeta.colorClass
                });
            });
        });
        return entries.sort((left, right) => right.text.length - left.text.length);
    }

    function renderHighlightedSentence(text, entries, activeRowId = '') {
        const source = String(text || '');
        if (!source) return '';

        const safeEntries = Array.isArray(entries) ? entries.filter((entry) => normalizeSpaces(entry?.text)) : [];
        if (!safeEntries.length) return escapeHtml(source);

        let output = '';
        let cursor = 0;
        while (cursor < source.length) {
            let match = null;
            for (const entry of safeEntries) {
                const term = entry.text;
                const hit = source.indexOf(term, cursor);
                if (hit === -1) continue;
                if (!match || hit < match.index || (hit === match.index && term.length > match.entry.text.length)) {
                    match = { index: hit, entry };
                }
            }

            if (!match) {
                output += escapeHtml(source.slice(cursor));
                break;
            }

            if (match.index > cursor) {
                output += escapeHtml(source.slice(cursor, match.index));
            }

            const isActive = activeRowId && activeRowId === match.entry.rowId;
            output += `<mark class="triples-radar-highlight ${escapeHtml(match.entry.colorClass)}${isActive ? ' is-active' : ''}">${escapeHtml(match.entry.text)}</mark>`;
            cursor = match.index + match.entry.text.length;
        }

        return output;
    }

    function getActiveRowId(currentEvaluation) {
        if (state.expandedRowId) return state.expandedRowId;
        if (state.inlineHintRowId) return state.inlineHintRowId;
        if (state.selectedCategory) {
            return root.triplesRadarCore?.getRowIdByCategory(state.selectedCategory) || '';
        }
        if (state.rowHintUsed || state.solved || state.examExpired) {
            const current = getCurrentScenario();
            return root.triplesRadarCore?.getRowIdByCategory(current?.correctCategory || '') || '';
        }
        if (currentEvaluation?.correctRowId) return currentEvaluation.correctRowId;
        return '';
    }

    function getFocusStripText(currentEvaluation) {
        const activeRowId = getActiveRowId(currentEvaluation);
        if (!activeRowId) return 'בחר/י שורה כדי לראות איזה חלק במשפט היא בודקת.';
        const rowMeta = getRowMeta(activeRowId);
        return `כעת בודקים: ${rowMeta.directionLabel} / ${rowMeta.heading}`;
    }

    function getRowDetailContent(row, current) {
        const rowMeta = getRowMeta(row?.id);
        const rowDetail = getRowDetailMeta(row?.id);
        const correctCategoryId = root.triplesRadarCore?.normalizeCategoryId(current?.correctCategory || '') || '';
        const correctRowId = root.triplesRadarCore?.getRowIdByCategory(correctCategoryId) || '';
        const detailCategoryId = row?.id === correctRowId
            ? correctCategoryId
            : root.triplesRadarCore?.normalizeCategoryId(row?.categories?.[0] || '');
        const categoryMeta = getCategoryMeta(detailCategoryId);

        return {
            whatCheck: rowMeta.directions[state.uiMode] || rowMeta.directions.details,
            whyImportant: state.uiMode === 'rules'
                ? (categoryMeta?.rulesWhy || rowDetail.impact)
                : (categoryMeta?.detailsWhy || rowDetail.impact),
            missing: state.uiMode === 'rules'
                ? 'בדרך כלל חסרים כאן הקריטריון, החוק, השיפוט או המסגרת שמחזיקים את המשפט.'
                : `בדרך כלל חסרים כאן ${rowMeta.directionLabel.toLowerCase ? rowMeta.directionLabel.toLowerCase() : rowMeta.directionLabel}, תנאים, או שלב ביניים שאפשר לבדוק.`,
            example: rowMeta.examples?.[state.uiMode] || rowMeta.examples?.details || '',
            question: normalizeSpaces(
                row?.id === correctRowId
                    ? (current?.focusHint || categoryMeta?.nextPrompt || '')
                    : (categoryMeta?.nextPrompt || rowMeta.examples?.[state.uiMode] || rowMeta.examples?.details || '')
            )
        };
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
            lost_performative: 'לפי איזה סטנדרט זה נשפט כאן?',
            assumptions: 'איזו הנחה כאן חייבת להיות נכונה כדי שזה יחזיק?',
            mind_reading: 'איך אתה יודע/ת מה הצד השני חושב או מתכוון?',
            universal_quantifier: 'תמיד? אין אפילו יוצא דופן אחד?',
            modal_operator: 'מה עוצר אותך בפועל? מה בדיוק מונע?',
            cause_effect: 'איך בדיוק X מוביל ל-Y, שלב אחרי שלב?',
            nominalisations: 'מה קורה כאן בפועל (כפעולה) ולא כשם עצם?',
            identity_predicates: 'באיזה תחום זה נכון, ובאיזה תחום לא בהכרח?',
            complex_equivalence: 'איך האירוע הזה אומר את המסקנה הזאת?',
            comparative_deletion: 'ביחס למה בדיוק? ומה המדד?',
            time_space_predicates: 'מתי/איפה בדיוק זה קורה (ומתי לא)?',
            lack_referential_index: 'מי בדיוק זה "הם/כולם" כאן?',
            non_referring_nouns: 'למה בדיוק מתכוונים במילה הזאת?',
            sensory_predicates: 'מה בדיוק רואים/שומעים/מרגישים בגוף?',
            unspecified_verbs: 'מה קורה כאן צעד-צעד בפועל?'
        };

        return promptMap[normalized] || `מה יעזור לדייק כאן דרך ${getShortCategoryChip(normalized)}?`;
    }

    
    function buildPhoneAnswer(categoryId) {
        const current = getCurrentScenario();
        const anchor = getPhoneSelectedAnchor();
        const anchorText = clipText(anchor?.text || current?.clientText || '', 72);
        const chip = getShortCategoryChip(categoryId);
        const variants = [
            `כש"${anchorText}" קורה, אני ישר קורא/ת את זה דרך ${chip} ומגיב/ה מהר.`,
            `ברגע הזה "${anchorText}" מרגיש לי כמו הוכחה, לפני שבדקתי פרטים.`,
            `כשאני נתפס/ת על "${anchorText}", הכול מצטמצם למשמעות אחת ואני מפספס/ת הקשר.`
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
        const mirror = `שיקוף: "כש'${anchorText}' פוגש אותך, זה יכול להרגיש סופי וכבד."`;
        const gap = 'תובנת מטפל: "כרגע יש קפיצה מהאירוע למשמעות. נבדוק חלק אחד במקום את כל הסיפור יחד."';
        const next = 'שאלת העדפה: "מה הכי נכון לך לבדוק עכשיו ג€” עובדה, משמעות, או תנאי?"';
        return {
            bullets,
            mirror,
            gap,
            next,
            actions: ['בדיקת עובדות', 'ויסות/האטה']
        };
    }

    
    function buildPhoneChallengeDraft() {
        const phone = ensurePhoneScenarioFlow();
        const qaFeed = Array.isArray(phone.qaFeed) ? phone.qaFeed : [];
        const challengeByCategory = {
            lost_performative: 'לפי מי בדיוק זה "לא בסדר" או "צריך" כאן?',
            assumptions: 'איזו הנחה כאן הכי כדאי לבדוק קודם מול המציאות?',
            mind_reading: 'איך נבדוק מה באמת נאמר/נעשה בלי לנחש כוונה?',
            universal_quantifier: 'מה יוצא הדופן הראשון שמחליש את ה"תמיד/אף פעם"?',
            modal_operator: 'מה מונע בפועל, ומה צעד קטן שכן אפשרי?',
            cause_effect: 'מה השרשרת בפועל, ומה עוד יכול להסביר את אותה תוצאה?',
            nominalisations: 'מה קורה בפועל צעד-צעד במקום שם עצם כללי?',
            identity_predicates: 'באיזה תחום זה נכון, ובאיזה תחום זה לא בהכרח נכון?',
            complex_equivalence: 'איך בדיוק X אומר Y? מה הקריטריון או הראיה?',
            comparative_deletion: 'ביחס למה/למי? ומה המדד?',
            time_space_predicates: 'מתי/איפה בדיוק זה קורה, ומתי לא?',
            lack_referential_index: 'מי בדיוק זה "הם" / "כולם" במקרה הזה?',
            non_referring_nouns: 'למה בדיוק מתכוונים במילה הזו?',
            sensory_predicates: 'מה ראית/שמעת/הרגשת בגוף באופן קונקרטי?',
            unspecified_verbs: 'מה קורה בפועל צעד-צעד בתוך הפועל הזה?'
        };

        const items = qaFeed.slice(0, 3).map((item) => ({
            letter: item.letter,
            categoryLabel: item.categoryLabel,
            challenge: challengeByCategory[item.categoryId] || 'מה השאלה המדויקת הבאה שתבדוק את זה מול המציאות?'
        }));

        return {
            intro: 'שלב אתגר: אחרי החשיפה, בודקים כל אחד משלושת הפריטים שנאספו.',
            items,
            therapistChoice: 'מה המטופל מעדיף לחקור עכשיו: ראיה? משמעות? תנאים?'
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
            showPhoneToast('כרגע בחר/י אחד משלושת העוגנים המובילים כדי לפתוח עבודה מדויקת.', 'warn');
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
            anchors: 'בחר/י קטע בולט מתוך שלושת העוגנים המרכזיים במשפט.',
            focus: 'הקטע נבחר. עכשיו נפתח עבודה על שלוש התבניות השכנות באותה שורה.',
            qa: `בונים 3 שאלות ותשובות משלימות (שכן/תבנית/שכן) ֲ· ${qaFeed.length}/3`,
            done: phone.challenge
                ? 'שלב בדיקת ההמשך פעיל: בודקים את שלוש הנקודות שעלו'
                : (phone.reply ? 'שלב החשיפה הושלם ֲ· יש שיקוף והצעת המשך' : '3/3 הושלם ֲ· בנה/י שיקוף')
        };
        const headerTitleMap = {
            anchors: 'מבט שלשה ֲ· עוגנים מהמשפט',
            focus: 'בחרנו נקודת פתיחה לעבודה',
            qa: 'שואלים ומדייקים בתוך אותה משפחה',
            done: phone.challenge ? 'בדיקת המשך ל-3 הנקודות' : (phone.reply ? 'שיקוף + ניסוח המשך' : '3/3 הושלם')
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
                    ${anchor.isTop ? '<span class="tr-phone-badge">עוגן מוביל</span>' : ''}
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
                    ${used ? '<span class="tr-phone-card-used">נשאל ג“</span>' : ''}
                </button>
            `;
        }).join('');

        const qaFeedHtml = qaFeed.length
            ? qaFeed.map((item) => `
                <article class="tr-phone-qa-item">
                    <div class="tr-phone-qa-kicker">שאלה/תשובה ${escapeHtml(item.letter)} ֲ· ${escapeHtml(item.categoryLabel)}</div>
                    <p class="tr-phone-q-line"><strong>שאלה:</strong> ${escapeHtml(item.question)}</p>
                    <p class="tr-phone-a-line"><strong>תגובה:</strong> ${escapeHtml(item.answer)}</p>
                </article>
            `).join('')
            : '<p class="tr-phone-muted">בחר/י כרטיס אחד מתוך השלשה כדי ליצור שאלה ותשובת מטופל.</p>';

        const collectedHtml = qaFeed.length
            ? qaFeed.map((item) => `<li><strong>${escapeHtml(item.letter)}</strong> ֲ· ${escapeHtml(getShortCategoryChip(item.categoryId))}: ${escapeHtml(clipText(item.answer, 56))}</li>`).join('')
            : '';

        const wordBoardHtml = `
            <section class="tr-phone-panel tr-phone-wordboard">
                <div class="tr-phone-panel-title">עוגנים בולטים מתוך משפט המטופל</div>
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
                <p class="tr-phone-wordboard-note"><strong>3 עוגנים מובילים:</strong> ${escapeHtml(topAnchors.map((item) => item.text).join(' | '))}</p>
            </section>
        `;

        const breenTableHtml = `
            <section class="tr-phone-panel tr-phone-breen-panel">
                <div class="tr-phone-panel-title">טבלת ברין (מפת הדפוסים המלאה)</div>
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
                    <div class="tr-phone-panel-title">אתגור 3 הדברים שנחשפו</div>
                    <p class="tr-phone-challenge-intro">${escapeHtml(phone.challenge.intro || '')}</p>
                    <div class="tr-phone-challenge-list">
                        ${(phone.challenge.items || []).map((item) => `
                            <article class="tr-phone-challenge-item">
                                <div class="tr-phone-qa-kicker">אתגור ${escapeHtml(item.letter)} ֲ· ${escapeHtml(item.categoryLabel)}</div>
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
                    <div class="tr-phone-panel-title">שיקוף + תובנה של המטפל (טיוטה)</div>
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
                    <div class="tr-phone-panel-title">תמליל הסבב</div>
                    <div class="tr-phone-transcript-block"><strong>מטופל</strong><p>${escapeHtml(current.clientText || '')}</p></div>
                    <div class="tr-phone-transcript-block"><strong>קטע שנבחר</strong><p>${escapeHtml(selectedAnchor?.text || '')}</p></div>
                    ${qaFeed.map((item) => `
                        <div class="tr-phone-transcript-block">
                            <strong>שאלה/תשובה ${escapeHtml(item.letter)}</strong>
                            <p><em>שאלה:</em> ${escapeHtml(item.question)}</p>
                            <p><em>תגובה:</em> ${escapeHtml(item.answer)}</p>
                        </div>
                    `).join('')}
                    ${phone.reply ? `
                        <div class="tr-phone-transcript-block">
                            <strong>שיקוף/תובנה</strong>
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
                    <div class="tr-phone-panel-title">הקטע שבחרת לעבודה</div>
                    <p class="tr-phone-anchor-text">${escapeHtml(selectedAnchor.text)}</p>
                    ${phone.phase === 'focus' ? `
                        <button type="button" class="tr-phone-meta-btn" data-tr-phone-action="meta">פתח/י עבודה על השלשה</button>
                    ` : ''}
                </section>
            `
            : '';

        const qaPanelHtml = selectedAnchor && (phone.phase === 'qa' || phone.phase === 'done' || phone.reply)
            ? `
                <section class="tr-phone-panel tr-phone-locked-panel">
                    <div class="tr-phone-panel-title">השלשה הפעילה (התבנית והשכנים שלה)</div>
                    <div class="tr-phone-row-note">
                        <strong>${escapeHtml(rowMeta.heLabel || '')}</strong>
                        <small>${escapeHtml(rowMeta.heInsight || '')}</small>
                    </div>
                    <div class="tr-phone-cards">${tripleCards}</div>
                    <div class="tr-phone-panel-title">רצף העבודה (3 שאלות ותשובות)</div>
                    <div class="tr-phone-qa-feed">${qaFeedHtml}</div>
                </section>
            `
            : '';

        const donePanelHtml = selectedAnchor && phone.phase === 'done'
            ? `
                <section class="tr-phone-panel tr-phone-done-panel">
                    <div class="tr-phone-header-row">
                        <div class="tr-phone-panel-title">3/3 הושלם (שלב חשיפה)</div>
                        <div class="tr-phone-done-micro">סצנה ${state.index + 1}/${state.scenarios.length}</div>
                    </div>
                    <div class="tr-phone-inline-actions">
                        <button type="button" class="tr-phone-primary-btn" data-tr-phone-action="generate" ${canGenerate ? '' : 'disabled'}>בנה/י שיקוף והצעת המשך</button>
                        <button type="button" class="tr-phone-secondary-btn" data-tr-phone-action="transcript">${phone.transcriptOpen ? 'הסתר תמליל' : 'תמליל'}</button>
                    </div>
                    ${phone.reply ? `
                        <div class="tr-phone-inline-actions">
                            <button type="button" class="tr-phone-primary-btn" data-tr-phone-action="challenge">בדיקת המשך ל-3 הנקודות</button>
                            <button type="button" class="tr-phone-secondary-btn" disabled>קודם בונים שיקוף, ואז בודקים המשך</button>
                        </div>
                    ` : ''}
                    <div class="tr-phone-panel-title">מה נאסף עד עכשיו</div>
                    <ul class="tr-phone-collected-list">${collectedHtml}</ul>
                </section>
            `
            : '';

        rootEl.innerHTML = `
            <div class="triples-radar-phone-shell">
                <div class="triples-radar-phone-header">
                    <div>
                        <h4>${escapeHtml(headerTitleMap[phone.phase] || 'מבט שלשה ֲ· חשיפה ובדיקת המשך')}</h4>
                        <p>${escapeHtml(stepSubtitleMap[phone.phase] || '')}</p>
                    </div>
                    <div class="triples-radar-phone-stats">
                        <span>מקרה ${state.index + 1}/${state.scenarios.length}</span>
                        <span>${escapeHtml(getSessionModeMeta().badge)} ${escapeHtml(state.sessionMode === 'exam' ? formatSeconds(state.examSecondsLeft) : getSessionModeMeta().timerIdle)}</span>
                        <span>נקודות ${state.score}</span>
                    </div>
                </div>

                <section class="tr-phone-panel tr-phone-client-panel">
                    <div class="tr-phone-panel-title">משפט המטופל + עוגנים לעבודה</div>
                    <p class="tr-phone-client-text">${escapeHtml(current.clientText || '')}</p>
                    <div class="tr-phone-highlights">${highlightButtons}</div>
                    <div class="tr-phone-top3-line">
                        <strong>3 עוגנים מובילים:</strong>
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
                    <button type="button" class="tr-phone-secondary-btn" data-tr-phone-action="restart">להתחיל מחדש</button>
                    <button type="button" class="tr-phone-primary-btn" data-tr-phone-action="next">המקרה הבא</button>
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
        const showSolvedDetails = state.solved || state.examExpired;
        const activeRowId = getActiveRowId(currentEvaluation);
        const highlightEntries = getScenarioHighlightEntries(current);

        if (state.elements.contextLine) state.elements.contextLine.textContent = getScenarioContext(current);
        state.elements.statement.innerHTML = renderHighlightedSentence(current.clientText || '', highlightEntries, activeRowId);
        state.elements.focusHint.textContent = getFocusStripText(currentEvaluation);
        if (state.elements.gameLine) state.elements.gameLine.textContent = getGameStripText(currentEvaluation);
        if (state.elements.gameStrip) state.elements.gameStrip.hidden = state.sessionMode !== 'exam';
        state.elements.counter.textContent = `${state.index + 1}/${state.scenarios.length}`;
        state.elements.score.textContent = `${state.score}`;
        state.elements.solvedCount.textContent = `${state.solvedCount}`;
        if (state.elements.sessionBadge) state.elements.sessionBadge.textContent = getSessionModeMeta().badge;
        if (state.elements.step) state.elements.step.textContent = getStepText();
        updateTimerUI();
        renderDirectionSummary(currentEvaluation);

        state.elements.rows.innerHTML = rows.map((row) => {
            const rowMeta = getRowMeta(row.id);
            const isCorrectRow = correctRowId === row.id;
            const isHintRow = !state.solved && state.rowHintUsed && isCorrectRow;
            const isSolvedRow = showSolvedDetails && isCorrectRow;
            const isStrongestRow = (state.rowHintUsed || showSolvedDetails) && isCorrectRow;
            const isExpanded = state.expandedRowId === row.id;
            const showInlineHint = state.inlineHintRowId === row.id;
            const detail = getRowDetailContent(row, current);
            const rowClass = [
                'triples-radar-row',
                rowMeta.colorClass,
                isStrongestRow ? 'is-strongest' : '',
                isHintRow ? 'is-hint' : '',
                isSolvedRow ? 'is-solved' : '',
                isExpanded ? 'is-expanded' : ''
            ].filter(Boolean).join(' ');

            // Display order is reversed for RTL training scan (e.g., Mind Reading on the right in Triple 1).
            const displayCategories = [...row.categories].reverse();
            const cards = displayCategories.map((categoryId) => {
                const normalizedCategory = root.triplesRadarCore.normalizeCategoryId(categoryId);
                const isSelected = root.triplesRadarCore.normalizeCategoryId(state.selectedCategory) === normalizedCategory;
                const isCorrectCategory = correctCategoryNormalized === normalizedCategory;
                const shouldRevealCorrectCategory = ((state.categoryHintUsed && !state.solved) || showSolvedDetails) && isCorrectCategory;

                const categoryClass = [
                    'triples-radar-cat-btn',
                    isSelected ? 'is-selected' : '',
                    showSolvedDetails && isCorrectCategory ? 'is-correct' : '',
                    shouldRevealCorrectCategory ? 'is-reveal' : '',
                    (!state.solved && isSelected && currentEvaluation?.status === 'same_row') ? 'is-close' : '',
                    (!state.solved && !state.examExpired && isSelected && currentEvaluation?.status === 'wrong_row') ? 'is-wrong' : ''
                ].filter(Boolean).join(' ');

                return `
                    <button
                        type="button"
                        class="${categoryClass}"
                        data-category-id="${escapeHtml(normalizedCategory)}"
                        title="${escapeHtml(getCategoryMeta(normalizedCategory)?.nextPrompt || getCategoryLabelHe(normalizedCategory))}"
                        aria-label="${escapeHtml(`${getCategoryLabelHe(normalizedCategory)}. ${getCategoryMeta(normalizedCategory)?.nextPrompt || ''}`.trim())}"
                        ${state.solved || state.examExpired ? 'disabled' : ''}>
                        <span class="cat-label">${escapeHtml(getCategoryLabelHe(normalizedCategory))}</span>
                    </button>
                `;
            }).join('');

            return `
                <article class="${rowClass}" data-row-id="${row.id}">
                    <div class="triples-radar-row-head">
                        <div class="triples-radar-row-headline">
                            <strong>${escapeHtml(`${rowMeta.directionLabel} · ${rowMeta.heading}`)}</strong>
                            ${isStrongestRow ? `<span class="triples-radar-row-badge">${escapeHtml(getModeMeta().rowBadge)}</span>` : ''}
                        </div>
                        <div class="triples-radar-row-meta">
                            <small>${escapeHtml(`${rowMeta.canonicalLabel} בטבלת ברין`)}</small>
                        </div>
                    </div>
                    <div class="triples-radar-row-cats">
                        ${cards}
                    </div>
                    <div class="triples-radar-row-actions">
                        <button type="button" class="triples-radar-row-detail-btn" data-tr-action="row-detail" data-row-id="${escapeHtml(row.id)}" aria-expanded="${isExpanded ? 'true' : 'false'}">העמקה</button>
                        ${state.sessionMode === 'learn' ? `<button type="button" class="triples-radar-row-hint-btn" data-tr-action="row-hint" data-row-id="${escapeHtml(row.id)}" aria-expanded="${showInlineHint ? 'true' : 'false'}">רמז</button>` : ''}
                    </div>
                    ${showInlineHint ? `
                        <div class="triples-radar-row-inline-hint">
                            <strong>רמז קצר</strong>
                            <p>${escapeHtml(detail.question || detail.example)}</p>
                        </div>
                    ` : ''}
                    ${isExpanded ? `
                        <div class="triples-radar-row-accordion">
                            <div class="triples-radar-row-accordion-item">
                                <strong>מה בודקים כאן</strong>
                                <p>${escapeHtml(detail.whatCheck)}</p>
                            </div>
                            <div class="triples-radar-row-accordion-item">
                                <strong>למה זה חשוב</strong>
                                <p>${escapeHtml(detail.whyImportant)}</p>
                            </div>
                            <div class="triples-radar-row-accordion-item">
                                <strong>מה בדרך כלל חסר</strong>
                                <p>${escapeHtml(detail.missing)}</p>
                            </div>
                            <div class="triples-radar-row-accordion-item">
                                <strong>דוגמה קצרה</strong>
                                <p>${escapeHtml(detail.example)}</p>
                            </div>
                            <div class="triples-radar-row-accordion-item">
                                <strong>שאלה מומלצת</strong>
                                <p>${escapeHtml(detail.question)}</p>
                            </div>
                        </div>
                    ` : ''}
                </article>
            `;
        }).join('');
    }

    function updateHintControls() {
        if (state.uiMode === 'phone') return;
        if (state.elements?.rowHintBtn) {
            state.elements.rowHintBtn.hidden = state.sessionMode !== 'exam';
            state.elements.rowHintBtn.disabled = state.solved || state.rowHintUsed || state.examExpired;
        }
        if (state.elements?.catHintBtn) {
            state.elements.catHintBtn.hidden = state.sessionMode === 'exam';
            state.elements.catHintBtn.disabled = state.sessionMode === 'exam' || state.solved || state.examExpired || state.categoryHintUsed;
        }
    }

    function handleAutoHints(result) {
        if (state.solved || state.sessionMode === 'exam') return;
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
        if (state.solved || state.examExpired) return;
        const current = getCurrentScenario();
        if (!current) return;

        state.selectedCategory = categoryId;
        state.attemptsInScenario += 1;

        const result = root.triplesRadarCore.evaluateSelection(current.correctCategory, categoryId);
        const correctRowMeta = getRowMeta(result.correctRowId);
        const correctLabel = getCategoryLabelHe(current.correctCategory);
        if (result.status === 'exact') {
            state.solved = true;
            state.expandedRowId = result.correctRowId;
            state.inlineHintRowId = '';
            state.solvedCount += 1;
            stopExamTimer();
            const baseScore = Math.max(1, 4 - Math.max(1, state.attemptsInScenario));
            const timeBonus = state.sessionMode === 'exam' ? Math.max(0, Math.ceil(state.examSecondsLeft / 15)) : 0;
            state.score += baseScore + timeBonus;
            saveProgress();
            setFeedback(
                state.sessionMode === 'exam'
                    ? `בחירה מדויקת: ${correctLabel}. נסגרו ${baseScore + timeBonus} נקודות בסבב הזה.`
                    : `בחירה מדויקת: ${correctLabel}. זה הדיוק המתאים בתוך ${correctRowMeta.heading}.`,
                'success'
            );
            setStepStatus(getStepText());
            playResultSound('success');
            renderBoard();
            openOverlay('result', { rowId: result.correctRowId, locked: true });
            updateHintControls();
            return;
        } else if (result.status === 'same_row') {
            setFeedback(`הכיוון נכון, אבל עדיין לא התבנית המדויקת. הישאר/י בתוך ${correctRowMeta.heading}.`, 'warn');
            setStepStatus(state.uiMode === 'rules'
                ? `המסגרת נכונה. עכשיו צריך לדייק איזה כלל או פירוש הוא המרכזי בתוך ${correctRowMeta.heading}.`
                : `הכיוון נכון. עכשיו צריך לדייק איזה פרט חסר בדיוק בתוך ${correctRowMeta.heading}.`);
            playResultSound('warn');
            handleAutoHints(result);
        } else if (result.status === 'wrong_row') {
            setFeedback(`זה עדיין לא הכיוון המרכזי. המשפט הזה נשען יותר על ${correctRowMeta.heading}.`, 'danger');
            setStepStatus(state.uiMode === 'rules'
                ? 'חפש/י את הכיוון שמסביר איזה כלל, שיפוט או פירוש מארגנים את המשפט.'
                : 'חפש/י את הכיוון שמחזיר למשפט את המידע שחסר כדי להבין מה באמת נאמר.');
            playResultSound('danger');
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
        closeOverlay();
        state.index = (state.index + 1) % state.scenarios.length;
        state.attemptsInScenario = 0;
        state.rowHintUsed = false;
        state.categoryHintUsed = false;
        state.solved = false;
        state.selectedCategory = '';
        state.expandedRowId = '';
        state.inlineHintRowId = '';
        state.examExpired = false;
        state.examSecondsLeft = EXAM_TIME_LIMIT_SECONDS;
        if (state.uiMode === 'phone') resetPhoneScenarioFlow();
        setFeedback('מקרה חדש נטען. קרא/י את המשפט ובחר/י את כיוון החשיבה שנכון לפתוח ממנו.', 'info');
        setStepStatus(getStepText());
        if (state.sessionMode === 'exam') startExamTimer();
        else updateTimerUI();
        updateHintControls();
        renderBoard();
    }

    function restartRun() {
        closeOverlay();
        state.index = 0;
        state.attemptsInScenario = 0;
        state.rowHintUsed = false;
        state.categoryHintUsed = false;
        state.solved = false;
        state.selectedCategory = '';
        state.expandedRowId = '';
        state.inlineHintRowId = '';
        state.examExpired = false;
        state.examSecondsLeft = EXAM_TIME_LIMIT_SECONDS;
        if (state.uiMode === 'phone') resetPhoneScenarioFlow();
        setFeedback('התחלנו מחדש מההתחלה, עם אותו מבנה עבודה ובלי בחירות קודמות.', 'info');
        setStepStatus(getStepText());
        if (state.sessionMode === 'exam') startExamTimer();
        else updateTimerUI();
        updateHintControls();
        renderBoard();
    }

    function revealRowHint() {
        if (state.solved || state.rowHintUsed || state.examExpired) return;
        state.rowHintUsed = true;
        if (state.sessionMode === 'exam') {
            state.examDeadlineTs = Math.max(Date.now(), state.examDeadlineTs - (GAME_HINT_TIME_PENALTY_SECONDS * 1000));
            state.examSecondsLeft = Math.max(0, Math.ceil((state.examDeadlineTs - Date.now()) / 1000));
            updateTimerUI();
            if (state.examSecondsLeft <= 0) {
                applyExamTimeout();
                return;
            }
            if (typeof root.playUISound === 'function') root.playUISound('warning');
            setFeedback(`רמזון הופעל. השורה החזקה הודגשה והשעון ירד ב-${GAME_HINT_TIME_PENALTY_SECONDS} שניות.`, 'warn');
        } else {
            setFeedback('הכיוון החזק כבר הודגש בטבלה. עכשיו אפשר להישאר בתוכו ולדייק לתבנית.', 'info');
        }
        updateHintControls();
        renderBoard();
    }

    function revealCategoryHint() {
        if (state.solved || state.categoryHintUsed || state.examExpired || state.sessionMode === 'exam') return;
        state.categoryHintUsed = true;
        setFeedback('סימנתי את התבנית המדויקת בתוך הכיוון החזק, כדי שאפשר יהיה לראות למה היא בולטת כאן.', 'info');
        updateHintControls();
        renderBoard();
    }

    function toggleRowDetail(rowId) {
        const nextRowId = String(rowId || '').trim();
        state.expandedRowId = state.expandedRowId === nextRowId ? '' : nextRowId;
        if (state.expandedRowId && state.inlineHintRowId === state.expandedRowId) {
            state.inlineHintRowId = '';
        }
        closeOverlay();
        renderBoard();
    }

    function toggleRowHint(rowId) {
        const nextRowId = String(rowId || '').trim();
        state.inlineHintRowId = state.inlineHintRowId === nextRowId ? '' : nextRowId;
        renderBoard();
    }

    function stepBackInsideTriplesRadar() {
        if (state.elements?.overlay && !state.elements.overlay.hidden) {
            closeOverlay();
            return true;
        }
        if (state.expandedRowId) {
            state.expandedRowId = '';
            renderBoard();
            return true;
        }
        if (state.inlineHintRowId) {
            state.inlineHintRowId = '';
            renderBoard();
            return true;
        }
        return false;
    }

    function registerShellController() {
        root.__metaFeatureControllers = root.__metaFeatureControllers || {};
        root.__metaFeatureControllers['practice-triples-radar'] = {
            stepBack() {
                return stepBackInsideTriplesRadar();
            },
            restart() {
                restartRun();
                return true;
            }
        };
    }

    function bindEvents() {
        const hostEl = document.getElementById('practice-triples-radar');
        if (!hostEl || hostEl.dataset.boundTriplesRadar === 'true') return;
        hostEl.dataset.boundTriplesRadar = 'true';

        hostEl.addEventListener('click', (event) => {
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
            if (action === 'open-concept') {
                openOverlay('concept', { rowId: actionBtn.getAttribute('data-row-id') || '' });
                return;
            }
            if (action === 'row-detail') {
                toggleRowDetail(actionBtn.getAttribute('data-row-id') || '');
                return;
            }
            if (action === 'row-hint') {
                toggleRowHint(actionBtn.getAttribute('data-row-id') || '');
                return;
            }
            if (action === 'close-overlay') {
                closeOverlay();
                return;
            }
            if (action === 'next') nextScenario();
            if (action === 'restart') restartRun();
            if (action === 'hint-row') revealRowHint();
            if (action === 'hint-category') revealCategoryHint();
        });

        document.addEventListener('keydown', (event) => {
            if (event.key !== 'Escape') return;
            if (!state.elements?.overlay || state.elements.overlay.hidden) return;
            closeOverlay();
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
            contextLine: document.getElementById('triples-radar-context-line'),
            statement: document.getElementById('triples-radar-statement'),
            statementHelper: document.getElementById('triples-radar-statement-helper'),
            focusHint: document.getElementById('triples-radar-focus-hint'),
            modeSummary: document.getElementById('triples-radar-mode-summary'),
            rows: document.getElementById('triples-radar-rows'),
            feedback: document.getElementById('triples-radar-feedback'),
            counter: document.getElementById('triples-radar-counter'),
            score: document.getElementById('triples-radar-score'),
            solvedCount: document.getElementById('triples-radar-solved-count'),
            sessionBadge: document.getElementById('triples-radar-session-badge'),
            timer: document.getElementById('triples-radar-timer'),
            timerLabel: document.getElementById('triples-radar-timer-label'),
            step: document.getElementById('triples-radar-step'),
            gameStrip: document.getElementById('triples-radar-game-strip'),
            gameLine: document.getElementById('triples-radar-game-line'),
            rowHintBtn: document.querySelector('[data-tr-action="hint-row"]'),
            catHintBtn: document.querySelector('[data-tr-action="hint-category"]'),
            overlay: document.getElementById('triples-radar-overlay'),
            overlayTitle: document.getElementById('triples-radar-overlay-title'),
            overlayKicker: document.getElementById('triples-radar-overlay-kicker'),
            overlayBody: document.getElementById('triples-radar-overlay-body'),
            overlayActions: document.getElementById('triples-radar-overlay-actions')
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
            state.elements = {
                root: rootEl,
                overlay: document.getElementById('triples-radar-overlay'),
                overlayTitle: document.getElementById('triples-radar-overlay-title'),
                overlayKicker: document.getElementById('triples-radar-overlay-kicker'),
                overlayBody: document.getElementById('triples-radar-overlay-body'),
                overlayActions: document.getElementById('triples-radar-overlay-actions')
            };
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

    function bindSessionToggleEvents() {
        const sessionSwitch = document.getElementById('triples-radar-session-switch');
        if (!sessionSwitch || sessionSwitch.dataset.boundTriplesSession === 'true') return;
        sessionSwitch.dataset.boundTriplesSession = 'true';

        sessionSwitch.addEventListener('click', (event) => {
            const btn = event.target.closest('[data-tr-session-mode]');
            if (!btn) return;
            const nextMode = normalizeSessionMode(btn.getAttribute('data-tr-session-mode') || '');
            setSessionMode(nextMode);
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

        closeOverlay();
        state.uiMode = normalizedMode;
        saveUiModePreference();
        state.expandedRowId = '';
        state.inlineHintRowId = '';
        setupElementsForCurrentMode();
        bindEvents();
        registerShellController();
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

    function setSessionMode(nextMode, options = {}) {
        const normalizedMode = normalizeSessionMode(nextMode);
        const force = options.force === true;
        if (!force && normalizedMode === state.sessionMode) {
            updateModeToggleUI();
            updateHintControls();
            updateTimerUI();
            return;
        }

        state.sessionMode = normalizedMode;
        saveSessionModePreference();
        state.attemptsInScenario = 0;
        state.rowHintUsed = false;
        state.categoryHintUsed = false;
        state.solved = false;
        state.examExpired = false;
        state.examSecondsLeft = EXAM_TIME_LIMIT_SECONDS;
        state.selectedCategory = '';
        state.expandedRowId = '';
        state.inlineHintRowId = '';
        if (state.uiMode === 'phone' && state.scenarios.length) resetPhoneScenarioFlow();
        closeOverlay();
        updateModeToggleUI();

        if (state.sessionMode === 'exam' && state.scenarios.length) startExamTimer();
        else {
            stopExamTimer();
            updateTimerUI();
        }

        if (!state.scenarios.length || !state.elements?.root) return;

        setFeedback(getIntroFeedbackText(), 'info');
        setStepStatus(getStepText());
        updateHintControls();
        renderBoard();
    }

    async function setupTriplesRadarModule() {
        bindModeToggleEvents();
        bindSessionToggleEvents();
        state.uiMode = loadUiModePreference();
        state.sessionMode = loadSessionModePreference();
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
        state.expandedRowId = '';
        state.inlineHintRowId = '';
        state.examExpired = false;
        state.examSecondsLeft = EXAM_TIME_LIMIT_SECONDS;
        if (state.uiMode === 'phone') resetPhoneScenarioFlow();

        bindEvents();
        registerShellController();
        if (state.sessionMode === 'exam') startExamTimer();
        else updateTimerUI();
        setFeedback(getIntroFeedbackText(), 'info');
        setStepStatus(getStepText());
        updateHintControls();
        renderBoard();
    }

    return Object.freeze({
        setupTriplesRadarModule
    });
});

