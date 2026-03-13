(function attachMetaRedesignShell(window, document) {
    if (!window || !document || window.__metaRedesignShellAttached) return;
    window.__metaRedesignShellAttached = true;

    var HOME_SHELL_ID = 'meta-home-shell';
    var SHELL_ROOT_ID = 'meta-shell-root';
    var FEATURE_STATE_KEY = 'meta_feature_shell_v3';
    var HOME_VIEW_KEY = 'meta_home_shell_ui_v2';
    var PREFS_KEY = 'meta_shell_preferences_v1';
    var MANAGED_TABS = ['sentence-map', 'practice-question', 'practice-triples-radar', 'practice-radar'];
    var FEATURE_CHROME_TABS = ['sentence-map', 'practice-question', 'practice-triples-radar', 'practice-radar', 'practice-wizard', 'practice-verb-unzip', 'blueprint', 'prismlab', 'categories', 'comic-engine', 'about'];
    var HOME_VIEWS = ['home', 'stats', 'theory', 'settings', 'help'];
    var CTA_LABELS = ['יאללה, בואו נתחיל', 'אני מוכן — קדימה', 'בואו נצלול פנימה'];
    var QUESTION_PROMPTS = [
        'הקשיבו טוב למשפט הזה — מה מסתתר בפנים?',
        'תקראו ותחשבו — איזה דפוס שפה תופסים כאן?',
        'הנה אחד מעניין — מה דעתכם?',
        'שימו לב למילים — מה חסר כאן?'
    ];
    var RAPID_PROMPTS = [
        'קוראים מהר, אבל מקשיבים לעומק — מה מסומן כאן?',
        'תנו לאוזן לעבוד: איזו תבנית יושבת על הביטוי המודגש?',
        'זה רגע של דיוק מהיר — מה הדפוס שקופץ לעין?',
        'עוד משפט קטן, עוד זיהוי חד — מה מסתתר כאן?'
    ];
    var LEVEL_TITLES = {
        1: 'צעד ראשון',
        2: 'מתחיל סקרן',
        3: 'מזהה דפוסים',
        4: 'חוקר שפה',
        5: 'מאתגר מחשבות',
        6: 'פורץ גבולות',
        7: 'מאסטר מטא-מודל',
        8: 'גורו השפה',
        9: 'מגלה אמיתות',
        10: 'ברמה אחרת לגמרי'
    };
    var SETTING_LABELS = {
        adaptiveDifficulty: 'קצב אדפטיבי',
        showHints: 'רמזים עדינים',
        advancedMode: 'אתגר מתקדם',
        timer: 'טיימר'
    };
    var FEATURE_META = {
        'sentence-map': {
            tab: 'sentence-map', navKey: 'sentenceMap', progressKey: 'sentenceMap', progressTotal: 20, unlockLevel: 1,
            icon: '🗺️', title: 'מפת המשפט', badge: 'למתחילים', tone: 'beginner', color: '#1D9E75', soft: '#E1F5EE',
            homeDescription: 'בואו נלמד לקרוא בין השורות — מה באמת קרה, מה אנחנו מרגישים, ומה אנחנו באמת מבקשים.',
            description: 'כאן תלמדו לפרק כל משפט לשלוש שכבות: מה קרה בעולם החיצוני, מה קורה בתוכנו, ומה אנחנו באמת מבקשים.',
            philosopher: { name: 'סוקרטס', avatar: '🏛️', quote: 'דע את עצמך — כל שאלה טובה מתחילה מהקשבה עמוקה.', deep: 'סוקרטס האמין שרוב הסבל האנושי נובע מחוסר בהירות. כשאנחנו מפרקים משפט לשכבות, אנחנו שואלים "מה באמת קורה כאן?" במקום לקבל את פני השטח כמובן מאליו.' },
            example: { sentence: 'אף אחד לא מבין אותי', type: 'הכללה (universal quantifier)', challenge: 'אף אחד? ממש אף אחד? מי ספציפית לא מבין?' },
            demo: [{ role: 'אדם', text: 'אף אחד לא מבין אותי בבית.' }, { role: 'מאמן', text: 'מה קרה בחוץ, מה קרה בפנים, ומה בעצם היית רוצה שיקרה?' }, { role: 'אדם', text: 'בחוץ שתקו, בפנים הרגשתי לבד, ובאמת רציתי שישאלו אותי מה עובר עליי.' }],
            settings: { adaptiveDifficulty: { enabled: true, defaultValue: true }, showHints: { enabled: true, defaultValue: true }, advancedMode: { enabled: false, defaultValue: false }, timer: { enabled: false, defaultValue: false } }
        },
        'practice-question': {
            tab: 'practice-question', navKey: 'practiceQuestion', progressKey: 'practiceQuestion', progressTotal: 30, unlockLevel: 1,
            icon: '🧩', title: 'תרגול זיהוי', badge: 'לביניים', tone: 'intermediate', color: '#378ADD', soft: '#E6F1FB',
            homeDescription: 'תשמעו משפט — ותזהו מה מתחבא בתוכו. מחיקה? עיוות? הכללה? הבחירה שלכם.',
            description: 'שמעתם משפט? מצוין. עכשיו תגידו לנו — מה הדפוס שמסתתר בפנים? תרגול מהיר וממוקד.',
            philosopher: { name: 'ויטגנשטיין', avatar: '📘', quote: 'גבולות שפתי הם גבולות עולמי.', deep: 'השפה שלנו לא רק מתארת את העולם — היא יוצרת אותו. כשאנחנו מזהים דפוסי שפה, אנחנו מרחיבים את גבולות העולם שלנו.' },
            example: { sentence: 'הוא תמיד מתעלם ממני', type: 'הכללה + מחיקה', challenge: 'תמיד? בכל רגע? ואיך בדיוק הוא "מתעלם"?' },
            demo: [{ role: 'אדם', text: 'הוא תמיד מתעלם ממני.' }, { role: 'מאמן', text: 'יש כאן גם הכללה וגם משהו לא מפורט. מה בדיוק קורה כשהוא "מתעלם"?' }, { role: 'אדם', text: 'בעצם הוא לא עונה מהר להודעות, ואז אני ישר מרגיש לא חשוב.' }],
            settings: { adaptiveDifficulty: { enabled: true, defaultValue: true }, showHints: { enabled: true, defaultValue: true }, advancedMode: { enabled: false, defaultValue: false }, timer: { enabled: false, defaultValue: false } }
        },
        'practice-triples-radar': {
            tab: 'practice-triples-radar', navKey: 'practiceTriplesRadar', progressKey: 'triplesRadar', progressTotal: 25, unlockLevel: 2,
            icon: '📡', title: 'מכ״ם שלשות', badge: 'לביניים', tone: 'advanced', color: '#7F77DD', soft: '#EEEDFE',
            homeDescription: 'כל משפט מסתיר משפחה שלמה של דפוסים. כאן תלמדו לגלות את כולם, לא רק אחד.',
            description: 'ברמה הזו לא מחפשים דפוס אחד — מחפשים את כל המשפחה. כל משפט יכול להכיל מחיקה, עיוות והכללה בו־זמנית.',
            philosopher: { name: 'בנדלר', avatar: '🧠', quote: 'המפה אינה השטח — אבל אפשר לצייר מפה טובה יותר.', deep: 'כשמוצאים שלשות של דפוסים, מזהים את כל הדרכים שבהן המפה שלנו שונה מהשטח, ולא רק טריגר לשוני אחד.' },
            example: { sentence: 'כולם יודעים שזה בלתי אפשרי', type: 'הכללה + מחיקה + עיוות', challenge: 'כולם — מי? יודעים — מאיפה? בלתי אפשרי — מה בדיוק מונע?' },
            demo: [{ role: 'אדם', text: 'כולם יודעים שזה בלתי אפשרי.' }, { role: 'מאמן', text: 'יש כאן משפחה שלמה: מי זה כולם, איך יודעים, ומה הופך את זה לבלתי אפשרי?' }, { role: 'אדם', text: 'פתאום אני קולט שאני מערבב הנחה, הכללה וחוק נוקשה באותו משפט.' }],
            settings: { adaptiveDifficulty: { enabled: true, defaultValue: true }, showHints: { enabled: false, defaultValue: false }, advancedMode: { enabled: true, defaultValue: false }, timer: { enabled: false, defaultValue: false } }
        },
        'practice-radar': {
            tab: 'practice-radar', navKey: 'practiceRadar', progressKey: 'practiceRadar', progressTotal: 15, unlockLevel: 5,
            icon: '🎯', title: 'מכ״ם מטה-מודל', badge: 'למתקדמים', tone: 'challenge', color: '#D85A30', soft: '#FFF0E8',
            homeDescription: 'המסלול המהיר — זיהוי ושאילת שאלות מפרקות תחת לחץ זמן. למי שמוכן לאתגר האמיתי.',
            description: 'המסלול המתקדם ביותר: זיהוי מהיר ושאילת שאלות מפרקות תחת לחץ זמן. כאן הכל מתחבר.',
            philosopher: { name: 'גרינדר', avatar: '🪄', quote: 'בין המילים למשמעות יש דלת — שאלות הן המפתח.', deep: 'כשאתם שואלים "מי ספציפית?" או "איך בדיוק?", אתם מחזירים לאנשים את הבחירה ומוציאים את המשפט מערפל אוטומטי.' },
            example: { sentence: 'אי אפשר להצליח בארץ הזו', type: 'הכללה + מחיקה + modal operator', challenge: 'אי אפשר — מה מונע? להצליח — במה? בארץ הזו — לעומת איפה?' },
            demo: [{ role: 'אדם', text: 'אי אפשר להצליח בארץ הזו.' }, { role: 'מאמן', text: 'מה בדיוק אי אפשר, להצליח במה, ולפי מה החלטת שזה נכון לכל הארץ?' }, { role: 'אדם', text: 'פתאום זה נשמע פחות כמו עובדה ויותר כמו ייאוש של הרגע.' }],
            settings: { adaptiveDifficulty: { enabled: true, defaultValue: true }, showHints: { enabled: false, defaultValue: false }, advancedMode: { enabled: true, defaultValue: true }, timer: { enabled: true, defaultValue: true } }
        }
    };
    var STATIC_VIEWS = {
        theory: { title: 'רקע תיאורטי', kicker: 'איך לחשוב עם המטא-מודל', body: 'המטא-מודל לא מחפש "לתפוס טעויות", אלא להחזיר בחירה, דיוק והקשר.', bullets: ['מחיקה: מה חסר כדי להבין את התמונה?', 'עיוות: איזו משמעות נוספה בלי בדיקה?', 'הכללה: איפה מקרה אחד הפך לחוק על הכל?'] },
        help: { title: 'עזרה קצרה', kicker: 'איך משתמשים בבית החדש', body: 'הבית מציג ארבעה מסלולי ליבה. בכל כניסה למסלול יש warm-up קצר, ואז רק התרגול עצמו בלי עומס מיותר.', bullets: ['כוכבים מצטברים בכל פיצ׳ר.', 'ני״ק מעלים רמות ופותחים מסלולים.', 'כשתצאו מפיצ׳ר ותחזרו, תתחילו שוב ממסך ה-welcome.'] }
    };

    var featureState = loadFeatureState();
    var homeUi = loadHomeUi();
    var prefs = loadPrefs();
    var drawerOpen = false;
    var pendingNav = null;
    var activeTabObserver = null;
    var feedbackObserver = null;
    var activeTab = '';

    function escapeHtml(value) {
        return String(value == null ? '' : value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
    function normalizeTab(tabName) { return typeof window.normalizeRequestedTab === 'function' ? String(window.normalizeRequestedTab(tabName) || '').trim() : String(tabName || '').trim(); }
    function parseJson(raw, fallback) { try { return JSON.parse(raw); } catch (_error) { return fallback; } }
    function isManaged(tabName) { return MANAGED_TABS.indexOf(normalizeTab(tabName)) !== -1; }
    function getMeta(tabName) { return FEATURE_META[normalizeTab(tabName)] || null; }
    function hashValue(value) { var hash = 0; var input = String(value || ''); for (var i = 0; i < input.length; i += 1) { hash = ((hash << 5) - hash) + input.charCodeAt(i); hash |= 0; } return Math.abs(hash); }
    function pick(list, seed) { return Array.isArray(list) && list.length ? list[hashValue(seed + '|' + new Date().toDateString()) % list.length] : ''; }

    function normalizeFeatureSettings(meta, raw) {
        var source = raw && typeof raw === 'object' ? raw : {};
        var out = {};
        Object.keys(meta.settings || {}).forEach(function (key) {
            var config = meta.settings[key];
            out[key] = config.enabled ? Boolean(source[key] !== undefined ? source[key] : config.defaultValue) : Boolean(config.defaultValue);
        });
        return out;
    }
    function defaultFeatureState() {
        return MANAGED_TABS.reduce(function (acc, tab) {
            var meta = getMeta(tab);
            acc[tab] = { stage: 'welcome', settings: normalizeFeatureSettings(meta, {}) };
            return acc;
        }, {});
    }
    function loadFeatureState() {
        var defaults = defaultFeatureState();
        var source = parseJson(window.localStorage.getItem(FEATURE_STATE_KEY) || '{}', {});
        Object.keys(defaults).forEach(function (tab) {
            var meta = getMeta(tab);
            var raw = source[tab] && typeof source[tab] === 'object' ? source[tab] : {};
            defaults[tab] = { stage: raw.stage === 'feature' ? 'feature' : 'welcome', settings: normalizeFeatureSettings(meta, raw.settings) };
        });
        return defaults;
    }
    function saveFeatureState() { try { window.localStorage.setItem(FEATURE_STATE_KEY, JSON.stringify(featureState)); } catch (_error) {} }
    function loadHomeUi() { var raw = parseJson(window.localStorage.getItem(HOME_VIEW_KEY) || '{}', {}); return { view: HOME_VIEWS.indexOf(String(raw.view || '').trim()) !== -1 ? String(raw.view).trim() : 'home' }; }
    function saveHomeUi() { try { window.localStorage.setItem(HOME_VIEW_KEY, JSON.stringify(homeUi)); } catch (_error) {} }
    function loadPrefs() { var raw = parseJson(window.localStorage.getItem(PREFS_KEY) || '{}', {}); return { reduceMotion: Boolean(raw.reduceMotion), quietCelebrations: Boolean(raw.quietCelebrations) }; }
    function savePrefs() { try { window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch (_error) {} }
    function applyPrefs() { document.documentElement.setAttribute('data-meta-reduce-motion', prefs.reduceMotion ? '1' : '0'); }
    function getTabState(tab) { return featureState[normalizeTab(tab)] || defaultFeatureState()[normalizeTab(tab)]; }
    function setOnboardingFlags() {
        var flags = {
            onboarding_complete: 'true',
            mm_onboarding_done: 'true',
            mm_onboarding_dismissed_v1: '1'
        };
        Object.keys(flags).forEach(function (key) {
            try { window.localStorage.setItem(key, flags[key]); } catch (_error) {}
        });
    }
    function getAppContainer() { return document.querySelector('.container') || document.body; }
    function getShellRoot() {
        var mount = document.getElementById(SHELL_ROOT_ID);
        var container;
        if (mount) return mount;
        container = getAppContainer();
        if (!container) return null;
        mount = document.createElement('section');
        mount.id = SHELL_ROOT_ID;
        mount.className = 'meta-shell-root';
        if (container.firstChild) container.insertBefore(mount, container.firstChild);
        else container.appendChild(mount);
        return mount;
    }
    function isShellHomeView() { return currentTabName() === 'home'; }
    function updateBodyState(tabName) {
        var safeTab = normalizeTab(tabName) || 'home';
        var body = document.body;
        if (!body) return;
        body.classList.add('meta-shell-mode');
        body.classList.toggle('shell-home-active', safeTab === 'home');
        body.classList.toggle('shell-feature-active', safeTab !== 'home');
        body.classList.toggle('shell-managed-feature-active', safeTab !== 'home' && isManaged(safeTab));
        body.setAttribute('data-shell-active-tab', safeTab);
    }

    function coachApi() {
        return {
            getLevelTitle: function (level) { return LEVEL_TITLES[Math.max(1, Math.floor(Number(level) || 1))] || 'מומחה'; },
            getQuestionFeedbackHeading: function (tone, completed) { if (completed) return 'הסשן הושלם'; if (tone === 'success') return 'כל הכבוד!'; if (tone === 'danger') return 'עוד רגע מנסים שוב'; if (tone === 'warn') return 'בואו נדייק'; return 'מה עושים עכשיו'; },
            getQuestionHintLocked: function () { return 'במשחק מהיר אין רמזים. אם תרצו, עברו ללימוד ונפרק את זה יחד.'; },
            getQuestionHint: function (ctx) { return 'כיוון קטן: חפשו שאלה שמחזירה ' + ctx.target + '. מילים שכדאי לשים אליהן לב: ' + ctx.starters + '.'; },
            getQuestionRoundClosed: function () { return 'את השאלה הזו כבר סגרנו. נמשיך לבאה ונשמור על הקצב.'; },
            getQuestionNeedSelection: function (testMode) { return testMode ? 'בחרו קטגוריה אחת ותנו לאינטואיציה לעבוד.' : 'בחרו תשובה אחת, ואז נבדוק יחד מה מסתתר במשפט.'; },
            buildQuestionSuccess: function (ctx) { var intro = pick(['בול. עין חדה.', 'מדויק, כל הכבוד.', 'יופי של זיהוי.', 'בדיוק ככה — כאן מתחדדת האוזן.'], 'q-success-' + ctx.expectedLabel); return intro + (ctx.mode === 'test' ? ' ' + ctx.expectedLabel + ' · ' + ctx.rtText + 'ש׳ · +' + ctx.scoreDelta : '') + (ctx.takeaway ? ' ' + ctx.takeaway : ''); },
            buildQuestionWrong: function (ctx) { var intro = pick(['קרוב, אבל לא בדיוק.', 'לא נורא — בואו נסתכל שוב.', 'כמעט. שווה לבדוק עוד מילה אחת.', 'טעות היא חלק מהלמידה — הנה הכיוון.'], 'q-wrong-' + ctx.expectedLabel); return ctx.mode === 'test' ? intro + ' כאן התשובה היא ' + ctx.expectedLabel + '.' : intro + ' בחרתם ' + ctx.selectedLabel + ', וכאן כדאי לכוון ל' + ctx.expectedLabel + '. ' + ctx.reasonLine; },
            getQuestionStreakBadge: function (streak) { return '🔥 רצף ' + streak + '! ממשיכים להתחמם.'; },
            getRapidPrompt: function () { return pick(RAPID_PROMPTS, 'rapid-prompt'); },
            getRapidResumePrompt: function () { return 'המשיכו: זהו את התבנית לפני שנגמר הזמן.'; },
            buildRapidInlineFeedback: function (ctx) {
                if (ctx.success) return pick(['בול. זיהוי חד.', 'מעולה, תפיסה מהירה.', 'יפה מאוד — זה בדיוק זה.', 'יופי, התבנית נתפסה בזמן.'], 'rapid-ok-' + ctx.label) + ' +' + ctx.gained + ' נק׳.';
                if (ctx.timeout) return pick(['עוד שנייה וזה היה שם.', 'לא נורא, חוזרים לעוד דיוק.', 'כמעט — תנו עוד מבט אחד.', 'ממשיכים רגוע.'], 'rapid-time-' + ctx.label) + ' נגמר הזמן — התשובה היא ' + ctx.label + '.';
                if (ctx.final) return pick(['עוד שנייה וזה היה שם.', 'לא נורא, חוזרים לעוד דיוק.', 'כמעט — תנו עוד מבט אחד.', 'ממשיכים רגוע.'], 'rapid-final-' + ctx.label) + ' הפעם התשובה הייתה ' + ctx.label + '.';
                return pick(['עוד שנייה וזה היה שם.', 'לא נורא, חוזרים לעוד דיוק.', 'כמעט — תנו עוד מבט אחד.', 'ממשיכים רגוע.'], 'rapid-try') + ' נסו שוב לפני שהזמן בורח.';
            },
            getRapidResultTitle: function (tone) { if (tone === 'success') return 'בול'; if (tone === 'danger') return 'עוד ניסיון'; if (tone === 'warn') return 'כמעט'; return 'מה קרה עכשיו'; },
            buildRapidRound: function (ctx) { return ctx.success ? { title: 'בול', body: ctx.label + '. יופי של זיהוי, ממשיכים.', tone: 'success' } : (ctx.timeout ? { title: 'נגמר הזמן', body: 'התשובה הנכונה היא ' + ctx.label + '. בפעם הבאה נקשיב מהר יותר ונישאר מדויקים.', tone: 'danger' } : { title: 'כמעט', body: 'התשובה הנכונה היא ' + ctx.label + '. עוד סבב קטן והדפוס הזה ירגיש ברור יותר.', tone: 'danger' }); },
            buildRapidSessionDone: function (correctCount, total) { return 'סיימתם ' + correctCount + '/' + total + ' נכונות. יפה, זו כבר אוזן שעובדת.'; }
        };
    }
    window.MetaRedesignCoach = coachApi();

    function readGamification() {
        if (window.MetaGamification && typeof window.MetaGamification.getSummary === 'function') return window.MetaGamification.getSummary();
        return { xp: 0, streak: 0, bestStreak: 0, totalStars: 0, level: 1, levelTitle: LEVEL_TITLES[1], nextLevelXp: 50, xpProgressPct: 0, starsPerFeature: {} };
    }
    function featureProgress(meta) {
        var summary = readGamification();
        var stars = Math.max(0, Math.floor(Number((summary.starsPerFeature || {})[meta.progressKey]) || 0));
        return { stars: stars, pct: meta.progressTotal ? Math.max(0, Math.min(100, Math.round((stars / meta.progressTotal) * 100))) : 0 };
    }
    function featureLocked(meta) { return readGamification().level < meta.unlockLevel; }
    function greeting(summary) {
        var hour = new Date().getHours();
        var title = hour >= 5 && hour < 12 ? 'בוקר טוב! ☀️' : hour >= 12 && hour < 17 ? 'צהריים טובים!' : hour >= 17 && hour < 21 ? 'ערב טוב! 🌆' : 'לילה טוב! 🌙';
        var streak = Math.max(0, Math.floor(Number(summary.streak) || 0));
        var subtitle = streak === 0 ? 'מוכנים להתחיל מסע של הבנה עמוקה יותר? נבחר מסלול אחד וניכנס בקצב נעים.' : streak === 1 ? 'יום שני ברצף — ההרגל מתחיל להיבנות, וזה כבר מורגש.' : streak < 7 ? streak + ' ימים ברצף. אתם על גל יפה, בואו נמשיך לשמור עליו.' : streak < 30 ? streak + ' ימים ברצף — וואו, איזו התמדה. האוזן שלכם כבר נהיית חדה.' : streak + ' ימים ברצף — אתם ממש מכונה של דיוק ושפה.';
        return { title: title, subtitle: subtitle };
    }
    function resumeState() { return typeof window.loadHomeLastVisitedTab === 'function' ? window.loadHomeLastVisitedTab() : null; }
    function resumeTitle(resume) { if (!resume || !resume.tab) return 'בחרו מסלול קטן ונתחיל'; if (typeof window.getTabTitleForHome === 'function') return window.getTabTitleForHome(resume.tab); return getMeta(resume.tab) ? getMeta(resume.tab).title : 'המסלול האחרון'; }
    function resumeCopy(resume) { if (!resume || !resume.tab) return 'הבית מחזיק את ארבעת מסלולי הליבה, וכל שאר הכלים נשארים זמינים מהתפריט.'; if (typeof window.formatRelativeTimeShort === 'function') { var rel = String(window.formatRelativeTimeShort(resume.at) || '').trim(); if (rel) return 'הייתם שם ' + rel + '. אפשר לחזור ישר בדיוק מאותה נקודה.'; } return 'אפשר לחזור בדיוק מהמקום שבו עצרתם, בלי לחפש שוב את הדרך פנימה.'; }
    function nextUnlock(summary) {
        var found = null;
        Object.keys(FEATURE_META).forEach(function (tab) { var meta = getMeta(tab); if (summary.level < meta.unlockLevel && (!found || meta.unlockLevel < found.unlockLevel)) found = meta; });
        return found;
    }
    function homeCard(meta, index) {
        var progress = featureProgress(meta);
        var locked = featureLocked(meta);
        var cta = locked ? ('🔒 נפתח ברמה ' + meta.unlockLevel + ' — ממשיכים לתרגל!') : pick(CTA_LABELS, meta.tab + '-card');
        return [
            '<article class="meta-home-feature-card' + (locked ? ' is-locked' : '') + '" style="--meta-feature-accent:' + escapeHtml(meta.color) + ';--meta-feature-soft:' + escapeHtml(meta.soft) + ';animation-delay:' + (index * 80) + 'ms;">',
            '<div class="meta-home-feature-card__head"><span class="meta-home-feature-card__badge" data-tone="' + escapeHtml(meta.tone) + '">' + escapeHtml(meta.badge) + '</span><span class="meta-home-feature-card__icon">' + meta.icon + '</span></div>',
            '<h3>' + escapeHtml(meta.title) + '</h3>',
            '<p>' + escapeHtml(meta.homeDescription) + '</p>',
            '<div class="meta-home-feature-card__progress" aria-hidden="true"><span style="width:' + progress.pct + '%;"></span></div>',
            '<div class="meta-home-feature-card__meta"><span>⭐ ' + progress.stars + ' / ' + meta.progressTotal + '</span><span>' + (locked ? ('נפתח ברמה ' + meta.unlockLevel) : (progress.pct + '%')) + '</span></div>',
            '<button type="button" class="btn ' + (locked ? 'btn-secondary' : 'btn-primary') + ' meta-home-feature-card__cta" data-open-feature="' + escapeHtml(meta.tab) + '"' + (locked ? ' disabled' : '') + '>' + escapeHtml(cta) + '</button>',
            '</article>'
        ].join('');
    }
    function withAssetVersion(path) {
        return typeof window.__withAssetVersion === 'function' ? window.__withAssetVersion(path) : path;
    }
    function navTitle(tab) {
        if (typeof window.getTabTitleForHome === 'function') return window.getTabTitleForHome(tab);
        return getMeta(tab) ? getMeta(tab).title : tab;
    }
    function bonusCard(config, index) {
        var href = config.href ? ' data-home-href="' + escapeHtml(withAssetVersion(config.href)) + '"' : '';
        var tab = config.tab ? ' data-home-nav="' + escapeHtml(config.tab) + '"' : '';
        return [
            '<article class="meta-home-bonus-card" style="--meta-feature-accent:' + escapeHtml(config.color) + ';animation-delay:' + (index * 80) + 'ms;">',
            '<div class="meta-home-bonus-card__head"><span class="meta-home-bonus-card__badge">' + escapeHtml(config.badge) + '</span><span class="meta-home-bonus-card__icon">' + escapeHtml(config.icon) + '</span></div>',
            '<h3>' + escapeHtml(config.title) + '</h3>',
            '<p>' + escapeHtml(config.copy) + '</p>',
            '<button type="button" class="btn btn-secondary meta-home-bonus-card__cta"' + tab + href + '>' + escapeHtml(config.cta) + '</button>',
            '</article>'
        ].join('');
    }
    function homeBonusSection() {
        var cards = [
            {
                icon: '🎭',
                badge: 'בונוס',
                title: 'סימולטור סצנות',
                copy: 'כשרוצים לתרגם את הזיהוי לתגובה חיה בתוך שיחה אמיתית.',
                cta: 'פתחו סצנה',
                href: 'scenario_trainer.html',
                color: '#b45309'
            },
            {
                icon: '🔬',
                badge: 'בונוס',
                title: navTitle('prismlab'),
                copy: 'שכבת חקירה עמוקה למי שרוצה להאט, לפרק, ולעבוד עם רמות.',
                cta: 'פתחו מעבדה',
                tab: 'prismlab',
                color: '#2563eb'
            }
        ];
        return [
            '<section class="meta-home-shell__bonus">',
            '<div class="meta-home-shell__section-head"><span>המשך והעמקה</span><strong>שני שערים נוספים כשצריך סימולציה חיה או חקירה עמוקה.</strong></div>',
            '<div class="meta-home-shell__bonus-grid">' + cards.map(function (card, index) { return bonusCard(card, index); }).join('') + '</div>',
            '</section>'
        ].join('');
    }
    function homeHero(summary) {
        var copy = greeting(summary);
        var unlock = nextUnlock(summary);
        var note = unlock ? ('עוד ' + Math.max(0, unlock.unlockLevel - summary.level) + ' רמות ל-' + unlock.title + '.') : 'כל מסלולי הליבה כבר פתוחים — עכשיו נשאר להעמיק.';
        return [
            '<section class="meta-home-shell__hero">',
            '<span class="meta-home-shell__hero-kicker">Duolingo למטא-מודל, אבל עם נשימה אנושית</span>',
            '<h2>' + escapeHtml(copy.title) + '</h2>',
            '<p>' + escapeHtml(copy.subtitle) + '</p>',
            '<div class="meta-home-shell__hero-note"><strong>' + escapeHtml(summary.levelTitle || LEVEL_TITLES[summary.level] || 'צעד ראשון') + '</strong><span>' + escapeHtml(note) + '</span></div>',
            '</section>'
        ].join('');
    }
    function homeStats(summary) {
        var note = summary.xpToNextLevel > 0 ? ('עוד ' + summary.xpToNextLevel + ' ני״ק לרמה הבאה') : 'הרמה הבאה כבר פתוחה';
        return [
            '<section class="meta-home-shell__stats">',
            '<article class="meta-home-shell__stat meta-home-shell__stat--level"><span class="meta-home-shell__stat-label">רמה</span><strong>' + summary.level + '</strong><small>' + escapeHtml(summary.levelTitle || LEVEL_TITLES[summary.level] || 'צעד ראשון') + '</small><div class="meta-home-shell__level-bar" aria-hidden="true"><span style="width:' + Math.max(0, Math.min(100, Number(summary.xpProgressPct) || 0)) + '%;"></span></div><small>' + escapeHtml(note) + '</small></article>',
            '<article class="meta-home-shell__stat"><span class="meta-home-shell__stat-label">כוכבים</span><strong>⭐ ' + summary.totalStars + '</strong><small>נאספים מכל פיצ׳ר ונותנים תחושה של דרך.</small></article>',
            '<article class="meta-home-shell__stat"><span class="meta-home-shell__stat-label">רצף</span><strong>🔥 ' + summary.streak + '</strong><small>שומר את הקצב שלכם חי מיום ליום.</small></article>',
            '</section>'
        ].join('');
    }
    function homeResume() {
        var resume = resumeState();
        return [
            '<section class="meta-home-shell__resume">',
            '<div><span class="meta-home-shell__resume-kicker">המשך מאיפה שעצרתם</span><strong>' + escapeHtml(resumeTitle(resume)) + '</strong><p>' + escapeHtml(resumeCopy(resume)) + '</p></div>',
            '<button type="button" class="btn btn-secondary" data-home-resume' + (!resume || !resume.tab ? ' disabled' : '') + '>פתחו המשך</button>',
            '</section>'
        ].join('');
    }
    function statsRow(meta) {
        var progress = featureProgress(meta);
        var locked = featureLocked(meta);
        return [
            '<article class="meta-home-progress-row' + (locked ? ' is-locked' : '') + '">',
            '<div class="meta-home-progress-row__head"><strong>' + meta.icon + ' ' + escapeHtml(meta.title) + '</strong><span>' + (locked ? ('נפתח ברמה ' + meta.unlockLevel) : (progress.pct + '%')) + '</span></div>',
            '<div class="meta-home-progress-row__bar" aria-hidden="true"><span style="width:' + progress.pct + '%;"></span></div>',
            '<small>' + progress.stars + ' / ' + meta.progressTotal + ' תרגילים</small>',
            '</article>'
        ].join('');
    }
    function achievement(label, detail, unlocked) {
        return '<article class="meta-home-achievement' + (unlocked ? ' is-unlocked' : '') + '"><span>' + (unlocked ? '🏅' : '⏳') + '</span><div><strong>' + escapeHtml(label) + '</strong><small>' + escapeHtml(detail) + '</small></div></article>';
    }
    function statsView(summary) {
        return [
            '<div class="meta-home-screen__frame">',
            '<header class="meta-home-screen__header"><button type="button" class="btn btn-secondary" data-home-view="home">↩ חזרה</button><div><span class="meta-home-screen__kicker">המסע שלכם</span><h2>הסטטיסטיקות שלי</h2></div></header>',
            '<section class="meta-home-screen__stats-grid"><article class="meta-home-screen__mini-stat"><span>⭐</span><strong>' + summary.totalStars + '</strong><small>כוכבים</small></article><article class="meta-home-screen__mini-stat"><span>🔥</span><strong>' + summary.streak + '</strong><small>ימים</small></article><article class="meta-home-screen__mini-stat"><span>📈</span><strong>רמה ' + summary.level + '</strong><small>' + escapeHtml(summary.levelTitle || LEVEL_TITLES[summary.level] || 'צעד ראשון') + '</small></article></section>',
            '<section class="meta-home-screen__panel"><div class="meta-home-screen__section-head"><span>התקדמות בפיצ׳רים</span><strong>ככל שמצטברים כוכבים, הדרך נעשית ברורה יותר</strong></div>' + Object.keys(FEATURE_META).map(function (tab) { return statsRow(FEATURE_META[tab]); }).join('') + '</section>',
            '<section class="meta-home-screen__panel"><div class="meta-home-screen__section-head"><span>הישגים</span><strong>אבני דרך קטנות שמראות שאתם באמת בתנועה</strong></div>' +
            achievement('צעד ראשון', 'תרגיל ראשון או כוכב ראשון במערכת', summary.totalStars > 0 || summary.xp > 0) +
            achievement('שבוע של רצף', '7 ימים של נוכחות והקשבה', summary.streak >= 7 || summary.bestStreak >= 7) +
            achievement('100 כוכבים', 'עוד ' + Math.max(0, 100 - summary.totalStars) + ' עד למאה עגולה', summary.totalStars >= 100) +
            achievement('רמה 5', 'מכ״ם מטה-מודל נפתח כאן', summary.level >= 5) + '</section>',
            '</div>'
        ].join('');
    }
    function infoView(key) {
        var meta = STATIC_VIEWS[key] || STATIC_VIEWS.help;
        return [
            '<div class="meta-home-screen__frame">',
            '<header class="meta-home-screen__header"><button type="button" class="btn btn-secondary" data-home-view="home">↩ חזרה</button><div><span class="meta-home-screen__kicker">' + escapeHtml(meta.kicker) + '</span><h2>' + escapeHtml(meta.title) + '</h2></div></header>',
            '<section class="meta-home-screen__panel"><p>' + escapeHtml(meta.body) + '</p><div class="meta-home-screen__bullet-list">' + meta.bullets.map(function (item) { return '<article class="meta-home-screen__bullet"><span>•</span><p>' + escapeHtml(item) + '</p></article>'; }).join('') + '</div></section>',
            '</div>'
        ].join('');
    }
    function prefToggle(key, label, detail) {
        var on = Boolean(prefs[key]);
        return '<button type="button" class="meta-home-pref-toggle' + (on ? ' is-on' : '') + '" data-home-pref="' + escapeHtml(key) + '"><div class="meta-home-pref-toggle__copy"><strong>' + escapeHtml(label) + '</strong><small>' + escapeHtml(detail) + '</small></div><span class="meta-home-pref-toggle__track"><span class="meta-home-pref-toggle__thumb"></span></span></button>';
    }
    function settingsView() {
        return [
            '<div class="meta-home-screen__frame">',
            '<header class="meta-home-screen__header"><button type="button" class="btn btn-secondary" data-home-view="home">↩ חזרה</button><div><span class="meta-home-screen__kicker">כוונון קטן</span><h2>הגדרות כלליות</h2></div></header>',
            '<section class="meta-home-screen__panel"><div class="meta-home-screen__section-head"><span>איך החוויה מרגישה לכם</span><strong>שתי העדפות קטנות שמרככות את המסע</strong></div>' +
            prefToggle('reduceMotion', 'להפחית תנועה', 'טוב למי שמעדיפים ממשק שקט ויציב יותר.') +
            prefToggle('quietCelebrations', 'לחגוג בשקט', 'מכבה confetti וטוסטים חגיגיים, אבל משאיר את ההתקדמות עצמה.') + '</section>',
            '</div>'
        ].join('');
    }
    function drawerHtml() {
        var viewItems = [
            { icon: '🏠', label: 'דף הבית', view: 'home' },
            { icon: '📊', label: 'הסטטיסטיקות שלי', view: 'stats' },
            { icon: '⚙️', label: 'הגדרות כלליות', view: 'settings' },
            { icon: '❓', label: 'עזרה', view: 'help' }
        ];
        var navItems = [
            { icon: '🧠', label: navTitle('about'), tab: 'about' },
            { icon: '📚', label: navTitle('categories'), tab: 'categories' },
            { icon: '🧰', label: navTitle('practice-verb-unzip'), tab: 'practice-verb-unzip' }
        ];
        var version = String(document.documentElement.getAttribute('data-app-version') || '').trim() || 'dev';
        return '<div class="meta-home-drawer' + (drawerOpen ? ' is-open' : '') + '"><button type="button" class="meta-home-drawer__backdrop" data-home-drawer-close></button><aside class="meta-home-drawer__panel"><div class="meta-home-drawer__head"><strong>תפריט</strong><button type="button" class="meta-home-drawer__close" data-home-drawer-close>×</button></div><div class="meta-home-drawer__group">' + viewItems.map(function (item) { return '<button type="button" class="meta-home-drawer__item" data-home-view="' + item.view + '"><span>' + item.icon + '</span><strong>' + escapeHtml(item.label) + '</strong></button>'; }).join('') + '</div><div class="meta-home-drawer__group meta-home-drawer__group--links">' + navItems.map(function (item) { return '<button type="button" class="meta-home-drawer__item" data-home-nav="' + escapeHtml(item.tab) + '"><span>' + item.icon + '</span><strong>' + escapeHtml(item.label) + '</strong></button>'; }).join('') + '</div><div class="meta-home-drawer__footer"><span>גרסה</span><strong>' + escapeHtml(version) + '</strong></div></aside></div>';
    }
    function homeViewHtml() {
        var summary = readGamification();
        if (homeUi.view === 'stats') return statsView(summary);
        if (homeUi.view === 'theory') return infoView('theory');
        if (homeUi.view === 'settings') return settingsView();
        if (homeUi.view === 'help') return infoView('help');
        return [
            '<div class="meta-home-shell__frame">',
            '<header class="meta-home-shell__topbar"><button type="button" class="meta-home-shell__menu btn btn-secondary" data-home-menu>☰ תפריט</button><div class="meta-home-shell__brand"><span class="meta-home-shell__eyebrow">מטען עבודה</span><strong>Meta Model בעברית</strong></div></header>',
            homeHero(summary), homeStats(summary), homeResume(),
            '<section class="meta-home-shell__cards">' + Object.keys(FEATURE_META).map(function (tab, index) { return homeCard(FEATURE_META[tab], index); }).join('') + '</section>',
            '<div class="meta-home-shell__divider" aria-hidden="true"></div>',
            homeBonusSection(),
            '</div>'
        ].join('');
    }
    function settingToggle(tab, key, config, state) {
        var enabled = Boolean(config && config.enabled);
        var value = Boolean(state.settings[key]);
        return '<button type="button" class="meta-feature-shell__toggle' + (value ? ' is-on' : '') + (enabled ? '' : ' is-disabled') + '" data-feature-toggle="' + escapeHtml(key) + '"' + (enabled ? '' : ' disabled') + '><span class="meta-feature-shell__toggle-copy"><strong>' + escapeHtml(SETTING_LABELS[key] || key) + '</strong><small>' + escapeHtml(enabled ? (value ? 'פעיל כרגע' : 'כבוי כרגע') : 'ייפתח ברמות הבאות') + '</small></span><span class="meta-feature-shell__toggle-track"><span class="meta-feature-shell__toggle-thumb"></span></span></button>';
    }
    function demoTurns(meta) {
        return (Array.isArray(meta.demo) ? meta.demo : []).map(function (turn) { return '<article class="meta-feature-shell__dialogue-turn"><span>' + escapeHtml(turn.role || 'דובר') + '</span><p>' + escapeHtml(turn.text || '') + '</p></article>'; }).join('');
    }
    function compactExampleAnalysis(example) {
        var type = String(example && example.type || '').trim();
        var challenge = String(example && example.challenge || '').replace(/^שאלת דיוק[:\s]*/i, '').replace(/\s+/g, ' ').trim();
        if (challenge.length > 58) challenge = challenge.slice(0, 55).trim() + '...';
        if (type && challenge) return type + ' → ' + challenge;
        return type || challenge || '';
    }
    function featureActionButton(name, icon, label) {
        return '<button type="button" class="meta-feature-shell__action-btn" data-feature-modal="' + escapeHtml(name) + '"><span class="meta-feature-shell__action-icon">' + escapeHtml(icon) + '</span><span class="meta-feature-shell__action-label">' + escapeHtml(label) + '</span></button>';
    }
    function featureModalSheet(name, title, bodyHtml, extraClass) {
        return '<div class="meta-feature-modal hidden" data-feature-modal-box="' + escapeHtml(name) + '" hidden><div class="meta-feature-modal__backdrop" data-feature-close></div><article class="meta-feature-modal__dialog meta-feature-modal__dialog--sheet' + (extraClass ? ' ' + extraClass : '') + '"><header class="meta-feature-modal__header"><strong class="meta-feature-modal__title">' + escapeHtml(title) + '</strong><button type="button" class="meta-feature-modal__close" data-feature-close>✕</button></header><div class="meta-feature-modal__content">' + bodyHtml + '</div></article></div>';
    }
    function featureShellHtml(meta) {
        var state = getTabState(meta.tab);
        var locked = featureLocked(meta);
        var cta = locked ? ('נפתח ברמה ' + meta.unlockLevel) : pick(CTA_LABELS, meta.tab + '-cta');
        var exampleSummary = compactExampleAnalysis(meta.example || {});
        var philosopherSheet = featureModalSheet('philosopher', 'העמקה פילוסופית', '<div class="meta-feature-modal__philosopher"><span class="meta-feature-modal__avatar">' + meta.philosopher.avatar + '</span><h3>' + escapeHtml(meta.philosopher.name) + '</h3><p>' + escapeHtml(meta.philosopher.deep) + '</p></div>');
        var videoSheet = featureModalSheet('demo', 'סרטון הדגמה', '<div class="meta-feature-modal__video"><div class="meta-feature-modal__video-frame"><span class="meta-feature-modal__video-play">▶</span></div><p class="meta-feature-modal__video-note">הסרטון יהיה זמין בקרוב. בינתיים אפשר לפתוח את התרגול ולהתחיל ישר בעבודה.</p></div>');
        var settingsSheet = featureModalSheet('settings', 'הגדרות למשימה', '<div class="meta-feature-modal__settings">' + Object.keys(meta.settings).map(function (key) { return settingToggle(meta.tab, key, meta.settings[key], state); }).join('') + '</div>');
        return [
            '<div class="meta-feature-shell__frame" style="--meta-feature-accent:' + escapeHtml(meta.color) + ';--meta-feature-soft:' + escapeHtml(meta.soft) + ';">',
            '<section class="meta-feature-shell__hero"><div class="meta-feature-shell__icon-wrap"><span class="meta-feature-shell__icon">' + meta.icon + '</span></div><div class="meta-feature-shell__hero-copy"><span class="meta-feature-shell__badge" data-tone="' + escapeHtml(meta.tone) + '">' + escapeHtml(meta.badge) + '</span><h2>' + escapeHtml(meta.title) + '</h2><p class="meta-feature-shell__hero-desc">' + escapeHtml(meta.description) + '</p></div></section>',
            '<article class="meta-feature-shell__example-card"><p class="meta-feature-shell__example-sentence">' + escapeHtml(meta.example.sentence) + '</p><p class="meta-feature-shell__example-analysis">' + escapeHtml(exampleSummary) + '</p></article>',
            '<div class="meta-feature-shell__actions meta-feature-shell__actions--welcome">' + featureActionButton('philosopher', '💭', 'העמקה') + featureActionButton('demo', '▶', 'סרטון') + featureActionButton('settings', '⚙', 'הגדרות') + '</div>',
            '<blockquote class="meta-feature-shell__quote meta-feature-shell__quote--compact"><p>' + escapeHtml(meta.philosopher.quote) + '</p><cite>' + escapeHtml(meta.philosopher.name) + '</cite></blockquote>',
            '<button type="button" class="btn btn-primary meta-feature-shell__cta" data-feature-enter="' + escapeHtml(meta.tab) + '"' + (locked ? ' disabled' : '') + '>' + escapeHtml(cta) + '</button>',
            philosopherSheet,
            videoSheet,
            settingsSheet,
            '</div>'
        ].join('');
    }
    function setPendingNav(target, direction) { pendingNav = { target: normalizeTab(target), direction: direction === 'back' ? 'back' : 'forward' }; }
    function takePendingDirection(target) { if (!pendingNav || pendingNav.target !== normalizeTab(target)) return ''; var direction = pendingNav.direction; pendingNav = null; return direction; }
    function applyEntry(node, direction) {
        if (!node) return;
        node.classList.remove('meta-screen-enter-forward', 'meta-screen-enter-back');
        void node.offsetWidth;
        node.classList.add(direction === 'back' ? 'meta-screen-enter-back' : 'meta-screen-enter-forward');
        window.setTimeout(function () { node.classList.remove('meta-screen-enter-forward', 'meta-screen-enter-back'); }, 380);
    }
    function animateOut(node, direction, done) {
        if (!node) { if (typeof done === 'function') done(); return; }
        node.classList.remove('meta-screen-out-forward', 'meta-screen-out-back');
        void node.offsetWidth;
        node.classList.add(direction === 'back' ? 'meta-screen-out-back' : 'meta-screen-out-forward');
        window.setTimeout(function () { node.classList.remove('meta-screen-out-forward', 'meta-screen-out-back'); if (typeof done === 'function') done(); }, 220);
    }
    function closeFeatureModals(shell) {
        if (!shell) return;
        shell.querySelectorAll('.meta-feature-modal').forEach(function (node) { node.classList.add('hidden'); node.hidden = true; });
    }
    function openFeatureModal(shell, name) {
        if (!shell) return;
        closeFeatureModals(shell);
        var node = shell.querySelector('[data-feature-modal-box="' + name + '"]');
        if (!node) return;
        node.hidden = false;
        node.classList.remove('hidden');
    }
    function openHomeView(view) {
        homeUi.view = HOME_VIEWS.indexOf(view) !== -1 ? view : 'home';
        drawerOpen = false;
        saveHomeUi();
        renderHome(homeUi.view === 'home' ? 'back' : 'forward');
    }
    function navigateExternalFromHome(href) {
        var nextHref = String(href || '').trim();
        if (!nextHref) return;
        drawerOpen = false;
        homeUi.view = 'home';
        saveHomeUi();
        window.location.href = nextHref;
    }
    function navigateFromHome(targetTab) {
        var root = document.getElementById(HOME_SHELL_ID);
        setPendingNav(targetTab, 'forward');
        homeUi.view = 'home';
        drawerOpen = false;
        saveHomeUi();
        animateOut(root ? root.querySelector('[data-home-surface]') : null, 'forward', function () {
            if (typeof window.navigateTo === 'function') window.navigateTo(targetTab, { playSound: true, scrollToTop: true });
        });
    }
    function navigateHome(shell) {
        setPendingNav('home', 'back');
        homeUi.view = 'home';
        saveHomeUi();
        animateOut(shell, 'back', function () {
            if (typeof window.navigateTo === 'function') window.navigateTo('home', { playSound: true, scrollToTop: true });
        });
    }
    function transitionWelcomeToFeature(tabName) {
        var section = document.getElementById(normalizeTab(tabName));
        if (!section) return;
        var shell = section.querySelector('.meta-feature-welcome-shell');
        var liveNodes = Array.prototype.slice.call(section.children || []).filter(function (node) { return node !== shell; });
        if (!shell || !liveNodes.length) {
            section.dataset.metaFeatureStage = 'feature';
            renderFeatureChrome(normalizeTab(tabName));
            return;
        }
        var clone = shell.cloneNode(true);
        clone.classList.add('meta-feature-stage-clone');
        section.appendChild(clone);
        clone.classList.add('meta-screen-out-forward');
        section.dataset.metaFeatureStage = 'feature';
        renderFeatureChrome(normalizeTab(tabName));
        liveNodes.forEach(function (node) { node.classList.add('meta-screen-enter-forward', 'meta-screen-scale-in'); });
        window.setTimeout(function () {
            if (clone.parentNode) clone.parentNode.removeChild(clone);
            liveNodes.forEach(function (node) { node.classList.remove('meta-screen-enter-forward', 'meta-screen-scale-in'); });
        }, 420);
    }
    function bindHome(root) {
        if (!root) return;
        root.onclick = function (event) {
            var openFeature = event.target.closest('[data-open-feature]');
            if (openFeature) { navigateFromHome(openFeature.getAttribute('data-open-feature') || ''); return; }
            var openNav = event.target.closest('[data-home-nav]');
            if (openNav) { navigateFromHome(openNav.getAttribute('data-home-nav') || ''); return; }
            var openHref = event.target.closest('[data-home-href]');
            if (openHref) { navigateExternalFromHome(openHref.getAttribute('data-home-href') || ''); return; }
            if (event.target.closest('[data-home-menu]')) { drawerOpen = true; renderHome('forward'); return; }
            if (event.target.closest('[data-home-drawer-close]')) { drawerOpen = false; renderHome('back'); return; }
            var viewBtn = event.target.closest('[data-home-view]');
            if (viewBtn) { openHomeView(viewBtn.getAttribute('data-home-view') || 'home'); return; }
            var prefBtn = event.target.closest('[data-home-pref]');
            if (prefBtn) {
                var key = prefBtn.getAttribute('data-home-pref') || '';
                if (key) { prefs[key] = !prefs[key]; savePrefs(); applyPrefs(); renderHome('forward'); }
                return;
            }
            if (event.target.closest('[data-home-resume]')) {
                var resume = resumeState();
                if (!resume || !resume.tab || typeof window.navigateTo !== 'function') return;
                setPendingNav(resume.tab, 'forward');
                animateOut(root.querySelector('[data-home-surface]'), 'forward', function () { window.navigateTo(resume.tab, { playSound: true, scrollToTop: true }); });
            }
        };
    }
    function renderHome(direction) {
        var mount = getShellRoot();
        if (!mount) return;
        var root = document.getElementById(HOME_SHELL_ID);
        if (!root) {
            root = document.createElement('section');
            root.id = HOME_SHELL_ID;
            root.className = 'meta-home-shell';
            mount.appendChild(root);
        } else if (root.parentNode !== mount) {
            mount.appendChild(root);
        }
        root.innerHTML = '<div class="meta-home-shell__surface" data-home-surface>' + homeViewHtml() + '</div>' + drawerHtml();
        root.setAttribute('data-view', homeUi.view);
        bindHome(root);
        applyEntry(root.querySelector('[data-home-surface]') || root, direction || 'forward');
    }
    function featureChromeHtml(tabName) {
        var safeTab = normalizeTab(tabName);
        var summary = readGamification();
        var title = navTitle(safeTab);
        var isWelcome = isManaged(safeTab) && getTabState(safeTab).stage !== 'feature';
        if (isWelcome) {
            return {
                top: [
                    '<div class="meta-feature-chrome__bar meta-feature-chrome__bar--top meta-feature-chrome__bar--welcome">',
                    '<button type="button" class="btn btn-secondary meta-feature-chrome__btn" data-shell-chrome-back="' + escapeHtml(safeTab) + '">↩ חזרה</button>',
                    '<div class="meta-feature-chrome__title"><strong>' + escapeHtml(title) + '</strong></div>',
                    '</div>'
                ].join(''),
                bottom: [
                    '<div class="meta-feature-chrome__bar meta-feature-chrome__bar--bottom meta-feature-chrome__bar--welcome">',
                    '<div class="meta-feature-chrome__meta meta-feature-chrome__meta--welcome"><span>רמה ' + escapeHtml(summary.level) + '</span><span>⭐ ' + escapeHtml(summary.totalStars) + '</span><span>🔥 ' + escapeHtml(summary.streak) + '</span></div>',
                    '</div>'
                ].join('')
            };
        }
        return {
            top: [
                '<div class="meta-feature-chrome__bar meta-feature-chrome__bar--top">',
                '<button type="button" class="btn btn-secondary meta-feature-chrome__btn" data-shell-chrome-back="' + escapeHtml(safeTab) + '">↩ חזרה</button>',
                '<div class="meta-feature-chrome__title"><span class="meta-feature-chrome__kicker">מסלול פעיל</span><strong>' + escapeHtml(title) + '</strong></div>',
                '<button type="button" class="btn btn-secondary meta-feature-chrome__btn" data-shell-chrome-stats="' + escapeHtml(safeTab) + '">📊 סטטיסטיקות</button>',
                '</div>'
            ].join(''),
            bottom: [
                '<div class="meta-feature-chrome__bar meta-feature-chrome__bar--bottom">',
                '<div class="meta-feature-chrome__meta"><span>🔥 ' + escapeHtml(summary.streak) + '</span><span>⭐ ' + escapeHtml(summary.totalStars) + '</span><span>רמה ' + escapeHtml(summary.level) + '</span></div>',
                '<div class="meta-feature-chrome__actions"><button type="button" class="btn btn-secondary meta-feature-chrome__btn" data-shell-chrome-home="' + escapeHtml(safeTab) + '">⌂ בית</button><button type="button" class="btn btn-primary meta-feature-chrome__btn" data-shell-chrome-restart="' + escapeHtml(safeTab) + '">↺ התחלה מחדש</button></div>',
                '</div>'
            ].join('')
        };
    }
    function restartTab(tabName) {
        var safeTab = normalizeTab(tabName);
        if (!safeTab) return;
        if (isManaged(safeTab)) {
            getTabState(safeTab).stage = 'welcome';
            saveFeatureState();
            renderFeature(safeTab, 'back');
            if (typeof window.scrollTo === 'function') window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }
        if (typeof window.navigateTo === 'function') {
            window.navigateTo(safeTab, { playSound: false, scrollToTop: true, updateHistory: false, trackStepBack: false });
        }
    }
    function goHome(view) {
        homeUi.view = HOME_VIEWS.indexOf(view) !== -1 ? view : 'home';
        drawerOpen = false;
        saveHomeUi();
        setPendingNav('home', 'back');
        if (typeof window.navigateTo === 'function') window.navigateTo('home', { playSound: true, scrollToTop: true, trackStepBack: false });
    }
    function bindFeatureChrome(section, tabName) {
        if (!section || section.__metaFeatureChromeBound) return;
        section.__metaFeatureChromeBound = true;
        section.addEventListener('click', function (event) {
            var backBtn = event.target.closest('[data-shell-chrome-back]');
            if (backBtn) {
                if (typeof window.navigateFeatureStepBack === 'function' && window.navigateFeatureStepBack()) return;
                goHome('home');
                return;
            }
            if (event.target.closest('[data-shell-chrome-home]')) { goHome('home'); return; }
            if (event.target.closest('[data-shell-chrome-stats]')) { goHome('stats'); return; }
            if (event.target.closest('[data-shell-chrome-restart]')) { restartTab(tabName); }
        });
    }
    function renderFeatureChrome(tabName) {
        var safeTab = normalizeTab(tabName);
        var section, chrome, html, top, bottom;
        if (!safeTab || FEATURE_CHROME_TABS.indexOf(safeTab) === -1) return;
        section = document.getElementById(safeTab);
        if (!section) return;
        html = featureChromeHtml(safeTab);
        top = section.querySelector('[data-meta-feature-chrome="top"]');
        bottom = section.querySelector('[data-meta-feature-chrome="bottom"]');
        if (!top) {
            top = document.createElement('div');
            top.className = 'meta-feature-chrome meta-feature-chrome--top';
            top.setAttribute('data-meta-feature-chrome', 'top');
            section.insertBefore(top, section.firstChild);
        }
        if (!bottom) {
            bottom = document.createElement('div');
            bottom.className = 'meta-feature-chrome meta-feature-chrome--bottom';
            bottom.setAttribute('data-meta-feature-chrome', 'bottom');
            section.appendChild(bottom);
        }
        top.innerHTML = html.top;
        bottom.innerHTML = html.bottom;
        section.classList.add('is-meta-shell-chrome-ready');
        bindFeatureChrome(section, safeTab);
    }
    function renderFeatureChromes() {
        FEATURE_CHROME_TABS.forEach(function (tab) { renderFeatureChrome(tab); });
    }
    function syncActiveShellState() {
        updateBodyState(currentTabName());
    }
    function bindFeatureShell(shell, meta) {
        if (!shell) return;
        shell.onclick = function (event) {
            if (event.target.closest('[data-feature-enter]')) {
                if (!featureLocked(meta)) {
                    getTabState(meta.tab).stage = 'feature';
                    saveFeatureState();
                    if (typeof window.playUISound === 'function') window.playUISound('success');
                    transitionWelcomeToFeature(meta.tab);
                    var section = document.getElementById(meta.tab);
                    if (section && typeof section.scrollIntoView === 'function') section.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
                return;
            }
            if (event.target.closest('[data-feature-home]')) { navigateHome(shell); return; }
            var toggle = event.target.closest('[data-feature-toggle]');
            if (toggle) {
                var key = toggle.getAttribute('data-feature-toggle') || '';
                var config = meta.settings[key];
                if (config && config.enabled) {
                    var reopenModal = toggle.closest('[data-feature-modal-box="settings"]') ? 'settings' : '';
                    getTabState(meta.tab).settings[key] = !getTabState(meta.tab).settings[key];
                    saveFeatureState();
                    renderFeature(meta.tab, 'forward');
                    if (reopenModal) {
                        var section = document.getElementById(meta.tab);
                        var nextShell = section ? section.querySelector('.meta-feature-welcome-shell') : null;
                        if (nextShell) openFeatureModal(nextShell, reopenModal);
                    }
                }
                return;
            }
            var modalOpen = event.target.closest('[data-feature-modal]');
            if (modalOpen) { openFeatureModal(shell, modalOpen.getAttribute('data-feature-modal') || ''); return; }
            if (event.target.closest('[data-feature-close]')) closeFeatureModals(shell);
        };
    }
    function applyFeatureStage(tabName, direction) {
        var meta = getMeta(tabName);
        var section = document.getElementById(normalizeTab(tabName));
        if (!meta || !section) return;
        var stage = featureLocked(meta) ? 'welcome' : getTabState(meta.tab).stage;
        section.dataset.metaFeatureStage = stage;
        if (stage === 'welcome') applyEntry(section.querySelector('.meta-feature-welcome-shell'), direction || 'forward');
    }
    function renderFeature(tabName, direction) {
        var meta = getMeta(tabName);
        var section = document.getElementById(normalizeTab(tabName));
        if (!meta || !section) return;
        section.classList.add('is-meta-feature-shell-ready');
        section.querySelectorAll('.feature-onboarding-card, .screen-read-guide').forEach(function (node) { node.remove(); });
        var shell = section.querySelector('.meta-feature-welcome-shell');
        if (!shell) { shell = document.createElement('section'); shell.className = 'meta-feature-welcome-shell'; section.insertBefore(shell, section.firstChild); }
        shell.innerHTML = featureShellHtml(meta);
        bindFeatureShell(shell, meta);
        applyFeatureStage(meta.tab, direction || 'forward');
        renderFeatureChrome(meta.tab);
    }
    function renderAllFeatures(direction) { MANAGED_TABS.forEach(function (tab) { renderFeature(tab, direction); }); }
    function syncShells(direction) {
        renderHome(direction || 'forward');
        renderAllFeatures(direction || 'forward');
        renderFeatureChromes();
        syncActiveShellState();
        refreshPracticeCopy();
    }
    function spawnStars(anchor) {
        if (!anchor || typeof anchor.getBoundingClientRect !== 'function') return;
        var rect = anchor.getBoundingClientRect();
        var colors = ['#EF9F27', '#FAC775', '#1D9E75', '#7F77DD', '#378ADD'];
        for (var i = 0; i < 8; i += 1) {
            var particle = document.createElement('div');
            particle.className = 'meta-star-particle';
            particle.style.cssText = 'position:fixed;pointer-events:none;z-index:9999;left:' + (rect.left + rect.width / 2 + (Math.random() - 0.5) * 88) + 'px;top:' + (rect.top + rect.height / 2 + (Math.random() - 0.5) * 56) + 'px;width:' + (4 + Math.random() * 6) + 'px;height:' + (4 + Math.random() * 6) + 'px;background:' + colors[Math.floor(Math.random() * colors.length)] + ';border-radius:' + (Math.random() > 0.55 ? '50%' : '4px') + ';animation:starBurst 0.82s ease forwards;animation-delay:' + (i * 0.04) + 's';
            document.body.appendChild(particle);
            window.setTimeout((function (node) { return function () { if (node.parentNode) node.parentNode.removeChild(node); }; }(particle)), 960);
        }
    }
    function observeBursts() {
        if (feedbackObserver || !document.body || typeof MutationObserver !== 'function') return;
        feedbackObserver = new MutationObserver(function (mutations) {
            mutations.forEach(function (mutation) {
                var target = mutation.target;
                if (!(target instanceof HTMLElement)) return;
                if (!target.matches('.question-drill-option.is-correct, .rapid-pattern-btn.is-correct, .triples-radar-cat-btn.is-correct')) return;
                if (target.dataset.metaBurstSeen === '1') return;
                target.dataset.metaBurstSeen = '1';
                spawnStars(target);
                window.setTimeout(function () { if (target && target.dataset) delete target.dataset.metaBurstSeen; }, 1000);
            });
        });
        feedbackObserver.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['class'] });
    }
    function spawnConfetti(container) {
        if (!container) return;
        var colors = ['#EF9F27', '#1D9E75', '#7F77DD', '#378ADD', '#D85A30', '#FAC775'];
        for (var i = 0; i < 36; i += 1) {
            var node = document.createElement('div');
            node.className = 'meta-confetti';
            node.style.cssText = '--endX:' + (Math.random() * 100) + '%;--endY:' + (-20 - Math.random() * 90) + 'px;--rotation:' + (Math.random() * 720) + 'deg;left:' + (40 + (Math.random() - 0.5) * 30) + '%;bottom:38%;width:' + (4 + Math.random() * 8) + 'px;height:' + (4 + Math.random() * 8) + 'px;background:' + colors[Math.floor(Math.random() * colors.length)] + ';animation-delay:' + (Math.random() * 0.2) + 's';
            container.appendChild(node);
            window.setTimeout((function (particle) { return function () { if (particle.parentNode) particle.parentNode.removeChild(particle); }; }(node)), 2200);
        }
    }
    function showLevelUp(detail) {
        if (prefs.quietCelebrations || !detail) return;
        var mount = document.getElementById('app') || document.body;
        if (!mount) return;
        var overlay = document.createElement('div');
        overlay.className = 'meta-level-up-overlay';
        overlay.innerHTML = '<div class="meta-level-up-card"><div class="meta-level-up-particles"></div><div class="meta-level-up-badge">' + escapeHtml(detail.level) + '</div><h2 class="meta-level-up-title">עליתם רמה!</h2><p class="meta-level-up-subtitle">רמה ' + escapeHtml(detail.level) + ' — ' + escapeHtml(detail.title || LEVEL_TITLES[detail.level] || 'מומחה') + '</p>' + (Array.isArray(detail.unlockedFeatures) && detail.unlockedFeatures.length ? ('<div class="meta-level-up-unlock"><span>' + detail.unlockedFeatures[0].icon + '</span><span>נפתח: ' + escapeHtml(detail.unlockedFeatures[0].label) + '</span></div>') : '') + '<button type="button" class="meta-level-up-btn">יאללה, ממשיכים</button></div>';
        mount.appendChild(overlay);
        spawnConfetti(overlay.querySelector('.meta-level-up-particles'));
        overlay.addEventListener('click', function (event) { if (event.target.closest('.meta-level-up-btn') || event.target === overlay) { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); } });
    }
    function showStreak(detail) {
        if (prefs.quietCelebrations || !detail || detail.previous === detail.streak) return;
        var mount = document.getElementById('app') || document.body;
        if (!mount) return;
        var toast = document.createElement('div');
        toast.className = 'meta-streak-toast';
        toast.textContent = '🔥 ' + detail.streak + ' ימים ברצף! ממשיכים לשמור על הקצב.';
        mount.appendChild(toast);
        window.setTimeout(function () { toast.classList.add('is-exiting'); window.setTimeout(function () { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 320); }, 2500);
    }
    function refreshPracticeCopy() {
        var coach = window.MetaRedesignCoach || coachApi();
        var qTitle = document.getElementById('question-drill-main-title');
        var qSub = document.getElementById('question-drill-subtitle');
        var qStart = document.getElementById('question-drill-start-session');
        var rapidPrompt = document.querySelector('.rapid-radar-prompt-label');
        var rapidStart = document.getElementById('rapid-start-btn');
        if (qTitle) qTitle.textContent = 'זיהוי מטה-מודל עם אוזן חדה';
        if (qSub) qSub.textContent = 'קוראים משפט קטן, מקשיבים למה שחסר בו, ובוחרים את השאלה שמחזירה בהירות.';
        if (qStart) qStart.textContent = 'יאללה, בואו נתחיל';
        if (rapidPrompt) rapidPrompt.textContent = coach.getRapidPrompt();
        if (rapidStart) rapidStart.textContent = 'יאללה, בואו נתחיל';
    }
    function currentTabName() { return normalizeTab(document.body.dataset.activeTab || (typeof window.getCurrentActiveTabName === 'function' ? window.getCurrentActiveTabName() : 'home')) || 'home'; }
    function observeActiveTab() {
        if (activeTabObserver || !document.body || typeof MutationObserver !== 'function') return;
        activeTab = currentTabName();
        activeTabObserver = new MutationObserver(function () {
            var next = currentTabName();
            var prev = activeTab;
            if (!next || next === prev) return;
            if (isManaged(prev)) { getTabState(prev).stage = 'welcome'; saveFeatureState(); applyFeatureStage(prev, 'back'); }
            activeTab = next;
            if (next === 'home') renderHome(takePendingDirection('home') || (isManaged(prev) ? 'back' : 'forward'));
            else if (isManaged(next)) renderFeature(next, takePendingDirection(next) || 'forward');
            else renderHome('forward');
            renderFeatureChrome(next);
            syncActiveShellState();
            refreshPracticeCopy();
        });
        activeTabObserver.observe(document.body, { attributes: true, attributeFilter: ['data-active-tab'] });
    }
    function bindRealtime() {
        if (window.__metaRedesignShellSyncBound) return;
        window.__metaRedesignShellSyncBound = true;
        observeActiveTab();
        observeBursts();
        window.addEventListener('meta-xp-gained', function () { syncShells('forward'); });
        window.addEventListener('meta-stars-gained', function () { syncShells('forward'); });
        window.addEventListener('meta-level-up', function (event) { syncShells('forward'); showLevelUp(event && event.detail ? event.detail : null); });
        window.addEventListener('meta-streak-updated', function (event) { syncShells('forward'); showStreak(event && event.detail ? event.detail : null); });
        window.addEventListener('storage', function (event) {
            if (!event) return;
            if (event.key === FEATURE_STATE_KEY) featureState = loadFeatureState();
            if (event.key === HOME_VIEW_KEY) homeUi = loadHomeUi();
            if (event.key === PREFS_KEY) { prefs = loadPrefs(); applyPrefs(); }
            syncShells('forward');
        });
        document.addEventListener('visibilitychange', function () { if (document.hidden) return; featureState = loadFeatureState(); homeUi = loadHomeUi(); prefs = loadPrefs(); applyPrefs(); syncShells('forward'); });
        window.addEventListener('focus', function () { featureState = loadFeatureState(); homeUi = loadHomeUi(); prefs = loadPrefs(); applyPrefs(); syncShells('forward'); });
    }
    function boot() { setOnboardingFlags(); applyPrefs(); bindRealtime(); syncShells('forward'); }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true }); else window.setTimeout(boot, 0);
}(window, document));
