(function attachMetaRedesignShell(window, document) {
    if (!window || !document) return;
    if (window.__metaRedesignShellAttached === true) return;
    window.__metaRedesignShellAttached = true;

    var HOME_SHELL_ID = 'meta-home-shell';
    var FEATURE_SHELL_STORAGE_KEY = 'meta_feature_shell_v2';
    var GAMIFICATION_STORAGE_KEY = 'meta_gamification_v1';
    var MANAGED_TABS = ['sentence-map', 'practice-question', 'practice-triples-radar', 'practice-radar'];
    var LEVEL_THRESHOLDS = [
        0, 40, 95, 165, 250,
        350, 465, 595, 740, 900,
        1075, 1265, 1470, 1690, 1925,
        2175, 2440, 2720, 3015, 3325
    ];
    var SETTING_LABELS = Object.freeze({
        adaptiveDifficulty: 'רמת קושי אדפטיבית',
        showHints: 'הצג רמזים',
        advancedMode: 'מצב מתקדם',
        timer: 'טיימר'
    });
    var FEATURE_META = Object.freeze({
        'sentence-map': Object.freeze({
            tab: 'sentence-map',
            navKey: 'sentenceMap',
            progressKey: 'sentenceMap',
            progressTotal: 20,
            unlockLevel: 1,
            icon: '🗺️',
            title: 'מפת המשפט',
            levelLabel: 'למתחילים',
            badgeTone: 'beginner',
            color: '#1D9E75',
            softColor: '#E1F5EE',
            description: 'ממפים מה קרה בחוץ, מה קורה בפנים, ומה המשפט מבקש בתוך הקשר לפני שבוחרים התערבות.',
            homeBlurb: 'מיפוי חוץ, פנים ובקשה נסתרת.',
            philosopher: 'סוקרטס',
            philosophyBody: 'לפני שמתקנים ניסוח, בודקים באיזו מפה האדם חי כרגע: מה קרה, מה קיבל משמעות, ומה המשפט מנסה להשיג בקשר.',
            quote: 'לא כל משפט צריך אתגור מידי. לפעמים צריך קודם מפה נקייה.',
            quoteAuthor: 'סוקרטס',
            exampleSentence: '“אף אחד לא מבין אותי”',
            exampleType: 'הכללה',
            exampleQuestion: 'אף אחד? מי ספציפית לא מבין אותך?',
            settings: Object.freeze({
                adaptiveDifficulty: Object.freeze({ enabled: true, defaultValue: true }),
                showHints: Object.freeze({ enabled: true, defaultValue: true }),
                advancedMode: Object.freeze({ enabled: false, defaultValue: false }),
                timer: Object.freeze({ enabled: false, defaultValue: false })
            })
        }),
        'practice-question': Object.freeze({
            tab: 'practice-question',
            navKey: 'practiceQuestion',
            progressKey: 'practiceQuestion',
            progressTotal: 30,
            unlockLevel: 1,
            icon: '🧩',
            title: 'תרגול זיהוי',
            levelLabel: 'לביניים',
            badgeTone: 'intermediate',
            color: '#378ADD',
            softColor: '#E6F1FB',
            description: 'תרגול מהיר של זיהוי מחיקה, עיוות או הכללה, עם משוב מיידי ושאלה שמפרקת את הערפל.',
            homeBlurb: 'משפט אחד. זיהוי אחד. שאלה מדויקת.',
            philosopher: 'ויטגנשטיין',
            philosophyBody: 'המשפט לא רק מתאר מציאות; הוא יוצר מרחב פעולה. כשמנסחים במדויק, גם אפשרויות הפעולה משתנות.',
            quote: 'גבולות השפה הם גם גבולות הפעולה. דיוק קטן פותח מרחב חדש.',
            quoteAuthor: 'ויטגנשטיין',
            exampleSentence: '“כולם חושבים שאני לא מספיק טוב”',
            exampleType: 'קריאת מחשבות + הכללה',
            exampleQuestion: 'מי בדיוק “כולם”, ועל סמך מה אתה יודע מה הם חושבים?',
            settings: Object.freeze({
                adaptiveDifficulty: Object.freeze({ enabled: true, defaultValue: true }),
                showHints: Object.freeze({ enabled: true, defaultValue: true }),
                advancedMode: Object.freeze({ enabled: false, defaultValue: false }),
                timer: Object.freeze({ enabled: false, defaultValue: false })
            })
        }),
        'practice-triples-radar': Object.freeze({
            tab: 'practice-triples-radar',
            navKey: 'practiceTriplesRadar',
            progressKey: 'triplesRadar',
            progressTotal: 25,
            unlockLevel: 1,
            icon: '📡',
            title: 'מכ״ם שלשות',
            levelLabel: 'לביניים',
            badgeTone: 'advanced',
            color: '#7F77DD',
            softColor: '#EEEDFE',
            description: 'לא רק לזהות תבנית אחת, אלא לראות שלשה שלמה: מה ידוע, מה מונח, ולפי איזה כלל המשפט עובד.',
            homeBlurb: 'משפחה של דפוסים, לא רק טריגר אחד.',
            philosopher: 'בנדלר',
            philosophyBody: 'כשעובדים על שלשה שלמה, לא מתקנים רק ניסוח. רואים את המנגנון שמחזיק את הניסוח ומבינים איך הוא משכפל את עצמו.',
            quote: 'הדיוק האמיתי קורה כשמפסיקים להסתפק בשם התבנית ורואים את כל המערכת שהיא מפעילה.',
            quoteAuthor: 'בנדלר',
            exampleSentence: '“אני יודע שהוא חושב שאני לא מספיק טוב, אז אני חייב להוכיח את עצמי”',
            exampleType: 'שלשה',
            exampleQuestion: 'מה אתה יודע, מה אתה מניח, ולפי איזה כלל אתה שופט את עצמך כאן?',
            settings: Object.freeze({
                adaptiveDifficulty: Object.freeze({ enabled: true, defaultValue: true }),
                showHints: Object.freeze({ enabled: true, defaultValue: false }),
                advancedMode: Object.freeze({ enabled: true, defaultValue: true }),
                timer: Object.freeze({ enabled: false, defaultValue: false })
            })
        }),
        'practice-radar': Object.freeze({
            tab: 'practice-radar',
            navKey: 'practiceRadar',
            progressKey: 'practiceRadar',
            progressTotal: 15,
            unlockLevel: 5,
            icon: '🎯',
            title: 'מכ״ם מטה-מודל',
            levelLabel: 'למתקדמים',
            badgeTone: 'challenge',
            color: '#D85A30',
            softColor: '#FFF0E8',
            description: 'לחץ זמן, זיהוי תבנית, ותשובה מהירה. זה המסלול שבו האוזן לדפוסים צריכה כבר לעבוד כמעט בזמן אמת.',
            homeBlurb: 'מסלול מהיר ומתקדם תחת לחץ.',
            philosopher: 'גרינדר',
            philosophyBody: 'ברגע האמת אין זמן להסביר הכול לעצמך. האימון כאן בונה רפלקס: לזהות מהר את הפתח הלשוני שממנו אפשר להתחיל לעבוד.',
            quote: 'כשהאוזן מתחדדת, אתה שומע לא רק מה נאמר אלא מה ננעל בתוך הדרך שזה נאמר.',
            quoteAuthor: 'גרינדר',
            exampleSentence: '“אני תמיד הורס את זה בסוף”',
            exampleType: 'הכללה גורפת',
            exampleQuestion: 'תמיד? באילו מצבים כן קורה אחרת?',
            settings: Object.freeze({
                adaptiveDifficulty: Object.freeze({ enabled: true, defaultValue: true }),
                showHints: Object.freeze({ enabled: true, defaultValue: false }),
                advancedMode: Object.freeze({ enabled: true, defaultValue: true }),
                timer: Object.freeze({ enabled: true, defaultValue: true })
            })
        })
    });

    var activeTabObserver = null;
    var feedbackObserver = null;
    var currentObservedTab = '';
    var featureShellState = loadFeatureShellState();

    function escapeHtml(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function normalizeTab(tabName) {
        if (typeof window.normalizeRequestedTab === 'function') {
            return String(window.normalizeRequestedTab(tabName) || '').trim();
        }
        return String(tabName || '').trim();
    }

    function safeParseJson(raw, fallback) {
        try {
            return JSON.parse(raw);
        } catch (_error) {
            return fallback;
        }
    }

    function isManagedTab(tabName) {
        return MANAGED_TABS.indexOf(normalizeTab(tabName)) !== -1;
    }

    function getFeatureMeta(tabName) {
        return FEATURE_META[normalizeTab(tabName)] || null;
    }

    function buildDefaultFeatureState() {
        return MANAGED_TABS.reduce(function reduceState(acc, tabName) {
            var meta = getFeatureMeta(tabName);
            if (!meta) return acc;
            acc[tabName] = {
                stage: 'welcome',
                settings: normalizeFeatureSettings(meta, {})
            };
            return acc;
        }, {});
    }

    function normalizeFeatureSettings(meta, rawSettings) {
        var source = rawSettings && typeof rawSettings === 'object' ? rawSettings : {};
        var normalized = {};
        Object.keys(meta.settings || {}).forEach(function eachKey(settingKey) {
            var config = meta.settings[settingKey];
            normalized[settingKey] = config.enabled
                ? Boolean(source[settingKey] !== undefined ? source[settingKey] : config.defaultValue)
                : Boolean(config.defaultValue);
        });
        return normalized;
    }

    function normalizeFeatureShellState(raw) {
        var defaults = buildDefaultFeatureState();
        var source = raw && typeof raw === 'object' ? raw : {};
        Object.keys(defaults).forEach(function eachTab(tabName) {
            var meta = getFeatureMeta(tabName);
            if (!meta) return;
            var rawTab = source[tabName] && typeof source[tabName] === 'object' ? source[tabName] : {};
            defaults[tabName] = {
                stage: rawTab.stage === 'feature' ? 'feature' : 'welcome',
                settings: normalizeFeatureSettings(meta, rawTab.settings)
            };
        });
        return defaults;
    }

    function loadFeatureShellState() {
        try {
            var raw = window.localStorage.getItem(FEATURE_SHELL_STORAGE_KEY);
            return normalizeFeatureShellState(safeParseJson(raw || '{}', {}));
        } catch (_error) {
            return normalizeFeatureShellState({});
        }
    }

    function saveFeatureShellState() {
        try {
            window.localStorage.setItem(FEATURE_SHELL_STORAGE_KEY, JSON.stringify(featureShellState));
        } catch (_error) {
            // ignore storage write failures
        }
    }

    function getTabShellState(tabName) {
        var tab = normalizeTab(tabName);
        var current = featureShellState[tab];
        if (current) return current;
        featureShellState = normalizeFeatureShellState(featureShellState);
        return featureShellState[tab];
    }

    function setTabShellStage(tabName, stage) {
        var tab = normalizeTab(tabName);
        if (!isManagedTab(tab)) return;
        var current = getTabShellState(tab);
        if (!current) return;
        current.stage = stage === 'feature' ? 'feature' : 'welcome';
        saveFeatureShellState();
        applyFeatureShellStage(tab);
    }

    function toggleTabShellSetting(tabName, settingKey) {
        var tab = normalizeTab(tabName);
        var meta = getFeatureMeta(tab);
        var state = getTabShellState(tab);
        if (!meta || !state) return;
        var config = meta.settings[settingKey];
        if (!config || !config.enabled) return;
        state.settings[settingKey] = !state.settings[settingKey];
        saveFeatureShellState();
        renderFeatureShell(tab);
    }

    function readGamificationState() {
        if (window.MetaGamification && typeof window.MetaGamification.getSummary === 'function') {
            return window.MetaGamification.getSummary();
        }

        var fallback = safeParseJson(window.localStorage.getItem(GAMIFICATION_STORAGE_KEY) || '{}', {});
        var xp = Math.max(0, Math.floor(Number(fallback.xp) || 0));
        var streak = Math.max(0, Math.floor(Number(fallback.streak) || 0));
        var starsPerFeature = fallback.starsPerFeature && typeof fallback.starsPerFeature === 'object'
            ? fallback.starsPerFeature
            : {};
        var totalStars = Object.keys(starsPerFeature).reduce(function sum(total, key) {
            return total + Math.max(0, Math.floor(Number(starsPerFeature[key]) || 0));
        }, 0);
        return {
            xp: xp,
            streak: streak,
            starsPerFeature: starsPerFeature,
            totalStars: totalStars,
            level: resolveLevelForXp(xp)
        };
    }

    function resolveLevelForXp(xpTotal) {
        var xp = Math.max(0, Math.floor(Number(xpTotal) || 0));
        for (var index = LEVEL_THRESHOLDS.length - 1; index >= 0; index -= 1) {
            if (xp >= LEVEL_THRESHOLDS[index]) return index + 1;
        }
        return 1;
    }

    function getLevelMeta() {
        var summary = readGamificationState();
        var xp = Math.max(0, Math.floor(Number(summary.xp) || 0));
        var level = Math.max(1, Math.floor(Number(summary.level) || resolveLevelForXp(xp)));
        var levelStart = LEVEL_THRESHOLDS[Math.max(0, level - 1)] || 0;
        var nextLevel = LEVEL_THRESHOLDS[Math.min(LEVEL_THRESHOLDS.length - 1, level)] || levelStart;
        var span = Math.max(1, nextLevel - levelStart);
        var progressPct = nextLevel <= levelStart
            ? 100
            : Math.max(0, Math.min(100, Math.round(((xp - levelStart) / span) * 100)));
        return {
            xp: xp,
            level: level,
            streak: Math.max(0, Math.floor(Number(summary.streak) || 0)),
            totalStars: Math.max(0, Math.floor(Number(summary.totalStars) || 0)),
            nextLevelXp: nextLevel,
            progressPct: progressPct
        };
    }

    function getFeatureProgress(meta) {
        var summary = readGamificationState();
        var perFeature = summary.starsPerFeature && typeof summary.starsPerFeature === 'object'
            ? summary.starsPerFeature
            : {};
        var stars = Math.max(0, Math.floor(Number(perFeature[meta.progressKey]) || 0));
        var progressPct = meta.progressTotal > 0
            ? Math.max(0, Math.min(100, Math.round((stars / meta.progressTotal) * 100)))
            : 0;
        return {
            stars: stars,
            progressPct: progressPct
        };
    }

    function isFeatureLocked(meta) {
        return getLevelMeta().level < Math.max(1, Math.floor(Number(meta.unlockLevel) || 1));
    }

    function getResumeState() {
        if (typeof window.loadHomeLastVisitedTab !== 'function') return null;
        return window.loadHomeLastVisitedTab();
    }

    function buildHomeCardHtml(meta, index) {
        var progress = getFeatureProgress(meta);
        var locked = isFeatureLocked(meta);
        var ctaLabel = locked ? ('נפתח ברמה ' + meta.unlockLevel) : 'פתיחה';
        return [
            '<article class="meta-home-feature-card' + (locked ? ' is-locked' : '') + '"',
            ' style="--meta-feature-accent:' + escapeHtml(meta.color) + ';--meta-feature-soft:' + escapeHtml(meta.softColor) + ';animation-delay:' + (index * 90) + 'ms;">',
            '  <div class="meta-home-feature-card__head">',
            '    <span class="meta-home-feature-card__badge" data-tone="' + escapeHtml(meta.badgeTone) + '">' + escapeHtml(meta.levelLabel) + '</span>',
            '    <span class="meta-home-feature-card__icon" aria-hidden="true">' + meta.icon + '</span>',
            '  </div>',
            '  <h3>' + escapeHtml(meta.title) + '</h3>',
            '  <p>' + escapeHtml(meta.homeBlurb || meta.description) + '</p>',
            '  <div class="meta-home-feature-card__progress" aria-hidden="true"><span style="width:' + progress.progressPct + '%;"></span></div>',
            '  <div class="meta-home-feature-card__meta">',
            '    <span>⭐ ' + progress.stars + ' / ' + meta.progressTotal + '</span>',
            '    <span>' + progress.progressPct + '%</span>',
            '  </div>',
            '  <button type="button" class="btn ' + (locked ? 'btn-secondary' : 'btn-primary') + ' meta-home-feature-card__cta" data-nav-key="' + escapeHtml(meta.navKey) + '"' + (locked ? ' disabled' : '') + '>',
            locked ? '🔒 ' : '← ',
            escapeHtml(ctaLabel),
            '  </button>',
            '</article>'
        ].join('');
    }

    function buildHomeShellHtml() {
        var levelMeta = getLevelMeta();
        var resume = getResumeState();
        var resumeTitle = resume && resume.tab && typeof window.getTabTitleForHome === 'function'
            ? window.getTabTitleForHome(resume.tab)
            : 'בחרו מסלול להתחלה';
        var resumeCopy = resume && resume.tab
            ? ((typeof window.formatRelativeTimeShort === 'function' ? window.formatRelativeTimeShort(resume.at) : '') || 'אפשר לחזור מאותה נקודה')
            : 'הבית מציג רק ארבעה מסלולי ליבה. שאר הכלים נשארים זמינים מתוך התפריט.';
        var levelNote = levelMeta.nextLevelXp > levelMeta.xp
            ? ('עוד ' + Math.max(0, levelMeta.nextLevelXp - levelMeta.xp) + ' ני״ק לרמה הבאה')
            : 'הרמה הבאה כבר פתוחה';

        return [
            '<div class="meta-home-shell__frame">',
            '  <header class="meta-home-shell__topbar">',
            '    <button type="button" class="meta-home-shell__menu btn btn-secondary" data-home-shell-menu>☰ תפריט</button>',
            '    <div class="meta-home-shell__brand">',
            '      <span class="meta-home-shell__eyebrow">מטען עבודה</span>',
            '      <strong>Meta Model בעברית</strong>',
            '    </div>',
            '  </header>',
            '  <section class="meta-home-shell__stats" aria-label="סטטוס אישי">',
            '    <article class="meta-home-shell__stat meta-home-shell__stat--level">',
            '      <span class="meta-home-shell__stat-label">רמה ' + levelMeta.level + '</span>',
            '      <strong>' + levelMeta.xp + ' ני״ק</strong>',
            '      <div class="meta-home-shell__level-bar" aria-hidden="true"><span style="width:' + levelMeta.progressPct + '%;"></span></div>',
            '      <small>' + escapeHtml(levelNote) + '</small>',
            '    </article>',
            '    <article class="meta-home-shell__stat"><span class="meta-home-shell__stat-label">כוכבים</span><strong>⭐ ' + levelMeta.totalStars + '</strong><small>נצברים מכל פיצ׳ר</small></article>',
            '    <article class="meta-home-shell__stat"><span class="meta-home-shell__stat-label">רצף</span><strong>🔥 ' + levelMeta.streak + '</strong><small>ימי אימון רצופים</small></article>',
            '  </section>',
            '  <section class="meta-home-shell__hero">',
            '    <span class="meta-home-shell__hero-kicker">שלום וברוך השב</span>',
            '    <h2>Duolingo למטה-מודל, אבל עם אוזן טיפולית</h2>',
            '    <p>בית נקי. פיצ׳ר אחד בכל פעם. כל כניסה נפתחת קודם ב־welcome קצר, ואז רק התרגיל נשאר על המסך.</p>',
            '  </section>',
            '  <section class="meta-home-shell__resume">',
            '    <div>',
            '      <span class="meta-home-shell__resume-kicker">המשך מאיפה שעצרת</span>',
            '      <strong>' + escapeHtml(resumeTitle) + '</strong>',
            '      <p>' + escapeHtml(resumeCopy) + '</p>',
            '    </div>',
            '    <button type="button" class="btn btn-secondary" data-home-shell-resume' + (!resume || !resume.tab ? ' disabled' : '') + '>פתח/י המשך</button>',
            '  </section>',
            '  <section class="meta-home-shell__cards" aria-label="מסלולי ליבה">',
            Object.keys(FEATURE_META).map(function renderCard(tabName, index) {
                return buildHomeCardHtml(FEATURE_META[tabName], index);
            }).join(''),
            '  </section>',
            '</div>'
        ].join('');
    }

    function bindHomeShellInteractions(root) {
        if (!root) return;
        root.querySelectorAll('[data-nav-key]').forEach(function bindNav(node) {
            if (typeof window.bindElementToNavKey === 'function') {
                window.bindElementToNavKey(node, node.getAttribute('data-nav-key') || '');
            }
        });

        var menuBtn = root.querySelector('[data-home-shell-menu]');
        if (menuBtn) {
            menuBtn.onclick = function openMenu() {
                if (typeof window.openFeatureMapMenu === 'function') {
                    window.openFeatureMapMenu();
                }
            };
        }

        var resumeBtn = root.querySelector('[data-home-shell-resume]');
        if (resumeBtn) {
            resumeBtn.onclick = function resumePractice() {
                var resume = getResumeState();
                if (!resume || !resume.tab || typeof window.navigateTo !== 'function') return;
                window.navigateTo(resume.tab, { playSound: true, scrollToTop: true });
            };
        }
    }

    function renderHomeShell() {
        var home = document.getElementById('home');
        if (!home) return;

        var root = document.getElementById(HOME_SHELL_ID);
        if (!root) {
            root = document.createElement('section');
            root.id = HOME_SHELL_ID;
            root.className = 'meta-home-shell';
            home.insertBefore(root, home.firstChild);
        }

        root.innerHTML = buildHomeShellHtml();
        bindHomeShellInteractions(root);
    }

    function buildSettingToggleHtml(tabName, settingKey, config, state) {
        var isEnabled = Boolean(config && config.enabled);
        var value = Boolean(state.settings[settingKey]);
        return [
            '<button type="button" class="meta-feature-shell__toggle' + (value ? ' is-on' : '') + (isEnabled ? '' : ' is-disabled') + '"',
            ' data-feature-shell-toggle="' + escapeHtml(settingKey) + '"',
            ' data-feature-shell-tab="' + escapeHtml(tabName) + '"',
            isEnabled ? '' : ' disabled',
            '>',
            '  <span class="meta-feature-shell__toggle-copy">',
            '    <strong>' + escapeHtml(SETTING_LABELS[settingKey] || settingKey) + '</strong>',
            '    <small>' + escapeHtml(isEnabled ? (value ? 'פעיל' : 'כבוי') : 'נעול כרגע') + '</small>',
            '  </span>',
            '  <span class="meta-feature-shell__toggle-track" aria-hidden="true"><span class="meta-feature-shell__toggle-thumb"></span></span>',
            '</button>'
        ].join('');
    }

    function buildDemoTurnsHtml(demo) {
        var turns = Array.isArray(demo && demo.turns) ? demo.turns : [];
        return turns.map(function renderTurn(turn) {
            return [
                '<article class="meta-feature-shell__dialogue-turn">',
                '  <span>' + escapeHtml(turn.role || 'דובר') + '</span>',
                '  <p>' + escapeHtml(turn.text || '') + '</p>',
                '</article>'
            ].join('');
        }).join('');
    }

    function buildFeatureShellHtml(meta) {
        var state = getTabShellState(meta.tab);
        var locked = isFeatureLocked(meta);
        var progress = getFeatureProgress(meta);
        var levelMeta = getLevelMeta();
        var guide = {
            logic: meta.philosophyBody,
            goal: meta.description,
            approach: 'קודם welcome קצר, אחר כך סבב עבודה נקי בלי עומס טקסט.',
            expected: 'ביציאה מהסבב אפשר להסביר מה זיהית ומה השאלה המדויקת שפתחה תנועה.'
        };
        var demo = typeof window.getTherapeuticDemoContent === 'function'
            ? window.getTherapeuticDemoContent(meta.tab, meta.title, guide)
            : { turns: [], outcomes: [] };

        return [
            '<div class="meta-feature-shell__frame" style="--meta-feature-accent:' + escapeHtml(meta.color) + ';--meta-feature-soft:' + escapeHtml(meta.softColor) + ';">',
            '  <div class="meta-feature-shell__topbar">',
            '    <button type="button" class="btn btn-secondary meta-feature-shell__back" data-feature-shell-home>↩ חזרה לבית</button>',
            '    <div class="meta-feature-shell__mini">',
            '      <span>⭐ ' + progress.stars + '</span>',
            '      <span>🔥 ' + levelMeta.streak + '</span>',
            '      <span>רמה ' + levelMeta.level + '</span>',
            '    </div>',
            '  </div>',
            '  <section class="meta-feature-shell__hero">',
            '    <div class="meta-feature-shell__icon-wrap"><span class="meta-feature-shell__icon" aria-hidden="true">' + meta.icon + '</span></div>',
            '    <div class="meta-feature-shell__hero-copy">',
            '      <span class="meta-feature-shell__badge" data-tone="' + escapeHtml(meta.badgeTone) + '">' + escapeHtml(meta.levelLabel) + '</span>',
            '      <h2>' + escapeHtml(meta.title) + '</h2>',
            '      <p>' + escapeHtml(meta.description) + '</p>',
            (locked ? ('<p class="meta-feature-shell__lock-note">המסלול הזה נפתח ברמה ' + meta.unlockLevel + '. כרגע אתם ברמה ' + levelMeta.level + '.</p>') : ''),
            '    </div>',
            '  </section>',
            '  <section class="meta-feature-shell__example">',
            '    <div class="meta-feature-shell__section-head"><span>דוגמה טיפולית</span><strong>כך נראה הפתח הלשוני</strong></div>',
            '    <article class="meta-feature-shell__example-card">',
            '      <p class="meta-feature-shell__example-sentence">' + escapeHtml(meta.exampleSentence) + '</p>',
            '      <div class="meta-feature-shell__example-meta"><span>סוג: ' + escapeHtml(meta.exampleType) + '</span><span>שאלה: ' + escapeHtml(meta.exampleQuestion) + '</span></div>',
            '    </article>',
            '  </section>',
            '  <div class="meta-feature-shell__actions">',
            '    <button type="button" class="btn btn-secondary" data-feature-shell-modal-open="demo">כך זה נראה בשיחה</button>',
            '    <button type="button" class="btn btn-secondary" data-feature-shell-modal-open="philosopher">העמקה פילוסופית</button>',
            '  </div>',
            '  <section class="meta-feature-shell__settings">',
            '    <div class="meta-feature-shell__section-head"><span>הגדרות למסימה</span><strong>אותה מסגרת, תלוי במה פתוח כאן</strong></div>',
            Object.keys(meta.settings).map(function renderSetting(settingKey) {
                return buildSettingToggleHtml(meta.tab, settingKey, meta.settings[settingKey], state);
            }).join(''),
            '  </section>',
            '  <blockquote class="meta-feature-shell__quote">',
            '    <p>' + escapeHtml(meta.quote) + '</p>',
            '    <cite>' + escapeHtml(meta.quoteAuthor) + '</cite>',
            '  </blockquote>',
            '  <button type="button" class="btn btn-primary meta-feature-shell__cta"' + (locked ? ' disabled' : '') + ' data-feature-shell-enter="' + escapeHtml(meta.tab) + '">',
            escapeHtml(locked ? ('נפתח ברמה ' + meta.unlockLevel) : 'הבנתי, אני מוכן/ה'),
            '  </button>',
            '  <div class="meta-feature-modal hidden" data-feature-modal="philosopher" hidden>',
            '    <div class="meta-feature-modal__backdrop" data-feature-shell-modal-close></div>',
            '    <article class="meta-feature-modal__dialog">',
            '      <button type="button" class="meta-feature-modal__close" data-feature-shell-modal-close aria-label="סגירה">×</button>',
            '      <span class="meta-feature-modal__avatar" aria-hidden="true">🧠</span>',
            '      <strong>' + escapeHtml(meta.philosopher) + '</strong>',
            '      <p>' + escapeHtml(meta.philosophyBody) + '</p>',
            '    </article>',
            '  </div>',
            '  <div class="meta-feature-modal hidden" data-feature-modal="demo" hidden>',
            '    <div class="meta-feature-modal__backdrop" data-feature-shell-modal-close></div>',
            '    <article class="meta-feature-modal__dialog meta-feature-modal__dialog--wide">',
            '      <button type="button" class="meta-feature-modal__close" data-feature-shell-modal-close aria-label="סגירה">×</button>',
            '      <strong>כך זה נראה בשיחה</strong>',
            '      <div class="meta-feature-shell__dialogue">' + buildDemoTurnsHtml(demo) + '</div>',
            '    </article>',
            '  </div>',
            '</div>'
        ].join('');
    }

    function closeFeatureShellModals(shell) {
        if (!shell) return;
        shell.querySelectorAll('.meta-feature-modal').forEach(function closeModal(node) {
            node.classList.add('hidden');
            node.hidden = true;
        });
    }

    function openFeatureShellModal(shell, modalName) {
        if (!shell) return;
        var target = shell.querySelector('.meta-feature-modal[data-feature-modal="' + modalName + '"]');
        if (!target) return;
        closeFeatureShellModals(shell);
        target.hidden = false;
        target.classList.remove('hidden');
        if (typeof window.playUISound === 'function') {
            window.playUISound('hint');
        }
    }

    function bindFeatureShellInteractions(shell, meta) {
        if (!shell) return;
        shell.onclick = function handleShellClick(event) {
            var enterBtn = event.target.closest('[data-feature-shell-enter]');
            if (enterBtn) {
                if (!isFeatureLocked(meta)) {
                    setTabShellStage(meta.tab, 'feature');
                    if (typeof window.playUISound === 'function') {
                        window.playUISound('success');
                    }
                    var section = document.getElementById(meta.tab);
                    if (section && typeof section.scrollIntoView === 'function') {
                        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                }
                return;
            }

            if (event.target.closest('[data-feature-shell-home]')) {
                if (typeof window.navigateTo === 'function') {
                    window.navigateTo('home', { playSound: true, scrollToTop: true, trackStepBack: false });
                }
                return;
            }

            var toggleBtn = event.target.closest('[data-feature-shell-toggle]');
            if (toggleBtn) {
                toggleTabShellSetting(meta.tab, toggleBtn.getAttribute('data-feature-shell-toggle') || '');
                return;
            }

            var modalTrigger = event.target.closest('[data-feature-shell-modal-open]');
            if (modalTrigger) {
                openFeatureShellModal(shell, modalTrigger.getAttribute('data-feature-shell-modal-open') || '');
                return;
            }

            if (event.target.closest('[data-feature-shell-modal-close]')) {
                closeFeatureShellModals(shell);
            }
        };
    }

    function renderFeatureShell(tabName) {
        var tab = normalizeTab(tabName);
        var meta = getFeatureMeta(tab);
        var section = document.getElementById(tab);
        if (!meta || !section) return;

        section.classList.add('is-meta-feature-shell-ready');
        section.querySelectorAll('.feature-onboarding-card, .screen-read-guide').forEach(function removeLegacy(node) {
            node.remove();
        });

        var shell = section.querySelector('.meta-feature-welcome-shell');
        if (!shell) {
            shell = document.createElement('section');
            shell.className = 'meta-feature-welcome-shell';
            section.insertBefore(shell, section.firstChild);
        }

        shell.innerHTML = buildFeatureShellHtml(meta);
        bindFeatureShellInteractions(shell, meta);
        applyFeatureShellStage(tab);
    }

    function applyFeatureShellStage(tabName) {
        var tab = normalizeTab(tabName);
        var meta = getFeatureMeta(tab);
        var section = document.getElementById(tab);
        if (!meta || !section) return;

        var stage = getTabShellState(tab).stage;
        if (isFeatureLocked(meta)) {
            stage = 'welcome';
        }
        section.dataset.metaFeatureStage = stage;
    }

    function renderAllFeatureShells() {
        MANAGED_TABS.forEach(function eachTab(tabName) {
            renderFeatureShell(tabName);
        });
    }

    function syncHomeAndFeatureShells() {
        renderHomeShell();
        renderAllFeatureShells();
    }

    function observeActiveTabChanges() {
        if (activeTabObserver || !document.body || typeof MutationObserver !== 'function') return;
        currentObservedTab = normalizeTab(document.body.dataset.activeTab || (typeof window.getCurrentActiveTabName === 'function' ? window.getCurrentActiveTabName() : 'home')) || 'home';

        activeTabObserver = new MutationObserver(function onActiveTabMutation() {
            var nextTab = normalizeTab(document.body.dataset.activeTab || (typeof window.getCurrentActiveTabName === 'function' ? window.getCurrentActiveTabName() : 'home')) || 'home';
            if (!nextTab || nextTab === currentObservedTab) return;
            if (isManagedTab(currentObservedTab)) {
                setTabShellStage(currentObservedTab, 'welcome');
            }
            currentObservedTab = nextTab;
            if (isManagedTab(nextTab)) {
                applyFeatureShellStage(nextTab);
            }
            renderHomeShell();
        });

        activeTabObserver.observe(document.body, {
            attributes: true,
            attributeFilter: ['data-active-tab']
        });
    }

    function spawnStars(anchorElement) {
        if (!anchorElement || typeof anchorElement.getBoundingClientRect !== 'function') return;
        var rect = anchorElement.getBoundingClientRect();
        var colors = ['#EF9F27', '#FAC775', '#1D9E75', '#7F77DD', '#378ADD'];
        for (var i = 0; i < 7; i += 1) {
            var particle = document.createElement('div');
            var size = 4 + Math.random() * 6;
            particle.className = 'meta-star-particle';
            particle.style.cssText = [
                'position:fixed',
                'width:' + size + 'px',
                'height:' + size + 'px',
                'left:' + (rect.left + rect.width / 2 + (Math.random() - 0.5) * 80) + 'px',
                'top:' + (rect.top + rect.height / 2 + (Math.random() - 0.5) * 56) + 'px',
                'background:' + colors[Math.floor(Math.random() * colors.length)],
                'border-radius:' + (Math.random() > 0.55 ? '50%' : '3px'),
                'pointer-events:none',
                'z-index:9999',
                'animation:starBurst 0.72s ease forwards',
                'animation-delay:' + (i * 0.05) + 's'
            ].join(';');
            document.body.appendChild(particle);
            window.setTimeout((function cleanup(node) {
                return function removeNode() {
                    if (node && node.parentNode) node.parentNode.removeChild(node);
                };
            }(particle)), 920);
        }
    }

    function observeCorrectAnswerBursts() {
        if (feedbackObserver || !document.body || typeof MutationObserver !== 'function') return;
        feedbackObserver = new MutationObserver(function handleMutations(mutations) {
            mutations.forEach(function eachMutation(mutation) {
                var target = mutation.target;
                if (!(target instanceof HTMLElement)) return;
                if (!target.matches('.question-drill-option.is-correct, .rapid-pattern-btn.is-correct, .triples-radar-cat-btn.is-correct')) return;
                if (target.dataset.metaBurstSeen === '1') return;
                target.dataset.metaBurstSeen = '1';
                spawnStars(target);
                window.setTimeout(function clearFlag() {
                    if (target && target.dataset) delete target.dataset.metaBurstSeen;
                }, 950);
            });
        });

        feedbackObserver.observe(document.body, {
            subtree: true,
            attributes: true,
            attributeFilter: ['class']
        });
    }

    function patchStarAwardSync() {
        if (window.MetaGamification && typeof window.MetaGamification.addStars === 'function' && window.MetaGamification.__metaRedesignWrapped !== true) {
            var originalAddStars = window.MetaGamification.addStars;
            window.MetaGamification.addStars = function wrappedAddStars(amount, featureName) {
                var result = originalAddStars.apply(this, arguments);
                try {
                    window.dispatchEvent(new window.CustomEvent('meta-stars-gained', {
                        detail: { amount: amount, feature: featureName }
                    }));
                } catch (_error) {
                    // ignore dispatch issues
                }
                return result;
            };
            window.MetaGamification.__metaRedesignWrapped = true;
        }
    }

    function bindRealtimeSync() {
        if (window.__metaRedesignShellSyncBound === true) return;
        window.__metaRedesignShellSyncBound = true;

        patchStarAwardSync();
        observeActiveTabChanges();
        observeCorrectAnswerBursts();

        window.addEventListener('meta-xp-gained', syncHomeAndFeatureShells);
        window.addEventListener('meta-stars-gained', syncHomeAndFeatureShells);
        window.addEventListener('storage', function handleStorage(event) {
            if (!event) return;
            if (event.key !== FEATURE_SHELL_STORAGE_KEY && event.key !== GAMIFICATION_STORAGE_KEY) return;
            featureShellState = loadFeatureShellState();
            syncHomeAndFeatureShells();
        });
        document.addEventListener('visibilitychange', function onVisibilityChange() {
            if (document.hidden) return;
            patchStarAwardSync();
            featureShellState = loadFeatureShellState();
            syncHomeAndFeatureShells();
        });
        window.addEventListener('focus', function onFocus() {
            patchStarAwardSync();
            featureShellState = loadFeatureShellState();
            syncHomeAndFeatureShells();
        });
    }

    function boot() {
        bindRealtimeSync();
        syncHomeAndFeatureShells();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot, { once: true });
    } else {
        window.setTimeout(boot, 0);
    }
}(window, document));
