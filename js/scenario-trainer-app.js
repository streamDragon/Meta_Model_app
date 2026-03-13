(function attachScenarioTrainerApp() {
    const root = typeof globalThis !== 'undefined' ? globalThis : window;
    const trainerContract = typeof root.getMetaTrainerPlatformContract === 'function'
        ? root.getMetaTrainerPlatformContract('scenario-trainer')
        : null;
    const mountId = trainerContract?.wrapper?.mountId || 'scenario-trainer-root';
    const mount = document.getElementById(mountId);
    if (!mount || !trainerContract) return;

    const STORAGE_KEYS = Object.freeze({
        settings: 'scenario_trainer_settings_v1',
        progress: 'scenario_trainer_progress_v1'
    });
    const DEFAULT_MOBILE_ZONE_ORDER = Object.freeze(['purpose', 'start', 'helper-steps', 'main', 'support']);
    const MOBILE_ZONE_ALIASES = Object.freeze({
        purpose: 'purpose',
        start: 'start',
        helper: 'helper-steps',
        'helper-steps': 'helper-steps',
        main: 'main',
        support: 'support'
    });
    const OPTION_IDS = Object.freeze(['A', 'B', 'C', 'D']);
    const SCREEN_IDS = Object.freeze({
        home: 'home',
        play: 'play',
        feedback: 'feedback',
        blueprint: 'blueprint',
        score: 'score',
        history: 'history',
        help: 'help'
    });
    const PROCESS_STEP_BY_SCREEN = Object.freeze({
        home: null,
        play: 'reply',
        feedback: 'impact',
        blueprint: 'clarify',
        score: 'continue',
        history: null,
        help: null
    });
    const TONE_LABELS = Object.freeze({
        defensive_attack: 'התגוננות תוקפת',
        minimize: 'מזעור',
        shutdown: 'סגירה',
        false_fix: 'תיקון מדומה',
        pseudo_apology: 'סליחה חצי-סגורה',
        stonewall: 'קיר אטום',
        blame_reversal: 'החזרת אשמה',
        vague_yes: 'כן בלי תוכן',
        fake_agreement: 'הסכמה בלי בהירות',
        passive_aggressive: 'עקיצה פסיבית',
        panic: 'לחץ מיידי',
        blame: 'אשמה',
        self_attack: 'הלקאה עצמית',
        collapse: 'קריסה',
        rage: 'זעם על המערכת',
        magical_thinking: 'ניחוש',
        random_guessing: 'ניסוי אקראי',
        overconfidence: 'ביטחון מופרז',
        false_confidence: 'ביטחון מופרז',
        avoidance: 'דחייה והימנעות',
        panic_reinstall: 'פתרון כבד מתוך לחץ',
        criticism: 'ביקורת אישית',
        comparison: 'השוואה לוחצת',
        shame: 'בושה והשוואה',
        over_helping: 'הצלת יתר',
        impatient_control: 'שליטה לחוצה',
        clarify_process: 'שאלה שמדייקת תהליך',
        contain_and_clarify: 'הרגעה + פירוק',
        contain_and_sequence: 'סדר צעדים',
        validate_and_repair: 'הכרה + תיקון',
        validate_and_specify: 'תיקוף + דיוק',
        clarify_deliverable: 'דיוק תוצר',
        clarify_format_and_ownership: 'פורמט + בעלות',
        define_done_and_owner: 'הגדרת Done',
        organize_requirements: 'ארגון דרישות',
        reduce_ambiguity: 'צמצום עמימות',
        clarify_required_fields: 'מיון חובה מול עמום',
        diagnose_then_act: 'אבחון לפני פעולה',
        smallest_safe_step: 'צעד בטוח קטן',
        diagnose_scope_first: 'בודקים היקף תקלה',
        default_red: 'תגובה תחת לחץ',
        default_green: 'תגובה שמקדמת בהירות'
    });
    const DOMAIN_PROCESS_FOCUS = Object.freeze({
        parenting: 'איפה הילד נתקע, מה עדיין לא ברור לו, ומהו הצעד הראשון שאפשר להתחיל ממנו בלי להציף אותו',
        relationships: 'איפה נוצר הפקק ביניכם בפועל, ואיזה תיאום רגשי או מעשי חסר בין שניכם',
        work: 'מהו התוצר המדויק, מי הבעלים שלו, ובאיזה פורמט או דדליין צריך למסור אותו',
        bureaucracy: 'איזה מסמך, שדה או תנאי בדיוק חסר כדי להתקדם בלי להיתקע שוב מול המערכת',
        home_tech: 'מהו היקף התקלה, מה בטוח לבדוק קודם, ואיזה צעד קטן לא יסכן מידע או זמן'
    });
    const OPTION_HINTS = Object.freeze({
        defensive_attack: 'מחזיר את השיחה למאבק',
        minimize: 'מקטין את החוויה שמולך',
        shutdown: 'סוגר את המגע ברגע הקריטי',
        false_fix: 'מרגיע לרגע בלי לפתוח בהירות',
        pseudo_apology: 'נשמע כמו תיקון בלי תיקון',
        stonewall: 'עוצר את הקשר והבירור',
        blame_reversal: 'מעביר את הדיון לאשמה',
        vague_yes: 'נשמע מסכים בלי כיוון',
        fake_agreement: 'כן בלי לפרק מה צריך לקרות',
        passive_aggressive: 'מוסיף עקיצה במקום בהירות',
        panic: 'מגיב מהלחץ ולא מהמשימה',
        blame: 'צובע את האדם כבעיה',
        collapse: 'משאיר אותך מוצף בלי סדר',
        rage: 'שופך תסכול על המערכת',
        magical_thinking: 'מקווה שזה יסתדר מעצמו',
        random_guessing: 'קופץ לפעולה בלי אבחון',
        self_attack: 'הופך קושי להלקאה עצמית',
        overconfidence: 'בטוח מדי בלי בדיקה',
        avoidance: 'דוחה את הבעיה במקום לארגן אותה',
        panic_reinstall: 'קופץ לפתרון כבד מדי',
        criticism: 'פוגע בערך של האדם',
        comparison: 'מעלה בושה ותחרות',
        shame: 'מקטין ומכווץ',
        over_helping: 'מציל את הרגע אבל לא בונה יכולת',
        impatient_control: 'לוחץ בלי לפרק את המשימה',
        rescue: 'לוקח את המשימה מהצד השני',
        dismissive_reassurance: 'מרגיע בלי להתמודד',
        global_pressure: 'מגדיל מתח בלי יעד ברור',
        control: 'שולט בלי לייצר בהירות',
        false_confidence: 'קופץ למסקנה מוקדמת',
        clarify_process: 'מעביר מהמופשט למה שקורה בפועל',
        contain_and_clarify: 'מחזיק רגש ואז מדייק',
        contain_and_sequence: 'בונה סדר שאפשר לבצע',
        validate_and_repair: 'מכיר בפגיעה ומברר תיקון',
        validate_and_specify: 'מתקף ואז שואל מדויק',
        clarify_deliverable: 'מגדיר תוצר במקום ניחוש',
        clarify_format_and_ownership: 'מגדיר פורמט ובעלות',
        define_done_and_owner: 'מבהיר מה נחשב גמור',
        organize_requirements: 'מסדר דרישות במקום עומס',
        reduce_ambiguity: 'מוריד עמימות מהשלב הבא',
        clarify_required_fields: 'מפריד בין חובה ללא ברור',
        diagnose_then_act: 'בודק לפני שנוגעים במערכת',
        smallest_safe_step: 'מתחיל מצעד בטוח וקטן',
        diagnose_scope_first: 'ממפה היקף לפני פתרון',
        default_red: 'מגיב מתוך לחץ',
        default_green: 'פותח בהירות שאפשר לבדוק'
    });

    const state = {
        loading: true,
        loadError: '',
        data: { domains: [], difficulties: [], scenarios: [], prismWheel: [] },
        screen: SCREEN_IDS.home,
        settingsOpen: false,
        settings: loadSettings(),
        settingsDraft: null,
        homeFilters: null,
        progress: loadProgress(),
        session: null,
        activeScenario: null,
        selectedOption: null,
        lastEntry: null,
        selectedPrismId: '',
        toastMessage: '',
        toastTimer: null
    };
    state.homeFilters = {
        domain: state.settings.defaultDomain,
        difficulty: state.settings.defaultDifficulty,
        runSize: clampRunSize(state.settings.defaultRunSize)
    };

    mount.addEventListener('click', handleClick);
    mount.addEventListener('change', handleChange);
    mount.addEventListener('input', handleInput);

    init().catch((error) => {
        state.loading = false;
        state.loadError = error?.message || 'שגיאה לא מזוהה';
        render();
    });

    async function init() {
        render();
        state.data = await loadData();
        state.loading = false;
        render();
    }

    function escapeHtml(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function normalizeText(value, fallback = '') {
        const raw = String(value == null ? fallback : value);
        const compact = raw.replace(/\s+/g, ' ').trim();
        return compact || String(fallback || '').trim();
    }

    function clampRunSize(value) {
        const parsed = Number.parseInt(String(value ?? ''), 10);
        if (!Number.isFinite(parsed)) return 6;
        return Math.max(3, Math.min(10, parsed));
    }

    function getDefaultSettings() {
        return {
            soundEnabled: true,
            defaultDifficulty: 'all',
            defaultDomain: 'all',
            defaultRunSize: 6,
            prismWheelEnabled: true
        };
    }

    function loadSettings() {
        const defaults = getDefaultSettings();
        try {
            const raw = localStorage.getItem(STORAGE_KEYS.settings);
            if (!raw) return defaults;
            return { ...defaults, ...(JSON.parse(raw) || {}) };
        } catch (_error) {
            return defaults;
        }
    }

    function saveSettings() {
        localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(state.settings));
    }

    function getDefaultProgress() {
        return {
            completed: 0,
            greenCount: 0,
            stars: 0,
            currentGreenStreak: 0,
            bestGreenStreak: 0,
            history: [],
            updatedAt: null
        };
    }

    function loadProgress() {
        const defaults = getDefaultProgress();
        try {
            const raw = localStorage.getItem(STORAGE_KEYS.progress);
            if (!raw) return defaults;
            const parsed = JSON.parse(raw);
            return {
                ...defaults,
                ...(parsed || {}),
                history: Array.isArray(parsed?.history) ? parsed.history.slice(0, 300) : []
            };
        } catch (_error) {
            return defaults;
        }
    }

    function saveProgress() {
        state.progress.updatedAt = new Date().toISOString();
        localStorage.setItem(STORAGE_KEYS.progress, JSON.stringify(state.progress));
    }

    function getMobileZoneOrder() {
        const raw = Array.isArray(trainerContract.mobilePriorityOrder) ? trainerContract.mobilePriorityOrder : [];
        const seen = new Set();
        const resolved = [];
        raw.forEach((item) => {
            const key = MOBILE_ZONE_ALIASES[String(item || '').trim()];
            if (!key || seen.has(key)) return;
            seen.add(key);
            resolved.push(key);
        });
        DEFAULT_MOBILE_ZONE_ORDER.forEach((key) => {
            if (seen.has(key)) return;
            seen.add(key);
            resolved.push(key);
        });
        return resolved;
    }

    function buildRootStyle() {
        return getMobileZoneOrder().map((zoneId, index) => `--scenario-mobile-order-${zoneId}:${index + 1}`).join(';');
    }

    function getZoneStyle(zoneId) {
        const ordered = getMobileZoneOrder();
        const index = ordered.indexOf(zoneId);
        const order = index === -1 ? DEFAULT_MOBILE_ZONE_ORDER.indexOf(zoneId) + 1 : index + 1;
        return `--scenario-mobile-order:${order}`;
    }

    function normalizeScenarioOption(raw, fallbackId, isGreen) {
        const line = normalizeText(raw?.speakerLine || raw?.text || raw?.say, isGreen ? 'בוא/י נבדוק מה קורה כאן בפועל.' : 'אני מגיב/ה מתוך לחץ.');
        const why = normalizeText(
            isGreen ? (raw?.whyItWorks || raw?.feedback) : (raw?.whyItHurts || raw?.feedback),
            isGreen
                ? 'התגובה הזו מחזירה את השיחה למה שקורה בפועל ומאפשרת להתחיל לפרק את הבעיה.'
                : 'התגובה הזו מחליפה בירור ממשי בלחץ, התגוננות או סתימה.'
        );
        return {
            ...raw,
            id: normalizeText(raw?.id, fallbackId),
            tone: normalizeText(raw?.tone, isGreen ? 'default_green' : 'default_red'),
            speakerLine: line,
            choiceHint: normalizeText(raw?.choiceHint, OPTION_HINTS[normalizeText(raw?.tone, isGreen ? 'default_green' : 'default_red')] || OPTION_HINTS[isGreen ? 'default_green' : 'default_red']),
            feedback: why,
            whyItHurts: normalizeText(raw?.whyItHurts, isGreen ? '' : why),
            whyItWorks: normalizeText(raw?.whyItWorks, isGreen ? why : ''),
            likelyOtherReply: normalizeText(
                raw?.likelyOtherReply || raw?.counterReply,
                isGreen ? 'אוקיי, עכשיו אפשר לראות מה בדיוק קורה.' : 'רגע, זה עדיין לא עוזר לי להבין מה קורה.'
            ),
            feedbackHeadline: normalizeText(raw?.feedbackHeadline, ''),
            emotionalImpact: normalizeText(raw?.emotionalImpact, ''),
            processImpact: normalizeText(raw?.processImpact, ''),
            repairMove: normalizeText(raw?.repairMove || raw?.nextMove, ''),
            learningTakeaway: normalizeText(raw?.learningTakeaway, ''),
            metaModelExplanation: normalizeText(raw?.metaModelExplanation, ''),
            consequenceAction: normalizeText(raw?.consequenceAction, ''),
            consequenceResult: normalizeText(raw?.consequenceResult, ''),
            score: isGreen ? 1 : 0
        };
    }

    function normalizeScenarioResponseSet(rawScenario) {
        const responseSet = rawScenario?.responseSet && typeof rawScenario.responseSet === 'object' ? rawScenario.responseSet : {};
        const legacyOptions = Array.isArray(rawScenario?.options) ? rawScenario.options : [];
        const legacyRed = legacyOptions.filter((item) => Number(item?.score) !== 1).slice(0, 4);
        const legacyGreen = legacyOptions.find((item) => Number(item?.score) === 1);
        const redPool = Array.isArray(responseSet.red) && responseSet.red.length ? responseSet.red : legacyRed;
        const red = redPool.slice(0, 4).map((item, index) => normalizeScenarioOption(item, OPTION_IDS[index] || String(index + 1), false));
        const green = normalizeScenarioOption(responseSet.green || legacyGreen || { speakerLine: rawScenario?.greenSentence }, 'E', true);
        return { red, green };
    }

    function normalizeScenario(rawScenario, index, domainLabels) {
        const responseSet = normalizeScenarioResponseSet(rawScenario);
        const metaModelCore = {
            unspecifiedVerb: normalizeText(rawScenario?.metaModelCore?.unspecifiedVerb || rawScenario?.unspecifiedVerb, 'לעשות את זה'),
            hiddenGap: normalizeText(rawScenario?.metaModelCore?.hiddenGap || rawScenario?.stuckPointHint, 'עדיין לא ברור מה בדיוק קורה בפועל.'),
            whyItSticks: normalizeText(rawScenario?.metaModelCore?.whyItSticks || rawScenario?.expectation?.belief, 'הבקשה נשמעת פשוטה, אבל חסר פירוק של מה שקורה בדרך.')
        };
        const greenBlueprint = rawScenario?.greenBlueprint && typeof rawScenario.greenBlueprint === 'object' ? rawScenario.greenBlueprint : {};
        const microPlan = rawScenario?.microPlan && typeof rawScenario.microPlan === 'object' ? rawScenario.microPlan : {};
        return {
            ...rawScenario,
            scenarioId: normalizeText(rawScenario?.scenarioId || rawScenario?.id, `scenario_${index + 1}`),
            title: normalizeText(rawScenario?.sceneTitle || rawScenario?.title, `סצנה ${index + 1}`),
            sceneTitle: normalizeText(rawScenario?.sceneTitle || rawScenario?.title, `סצנה ${index + 1}`),
            domain: normalizeText(rawScenario?.domain, 'general'),
            domainLabel: normalizeText(rawScenario?.domainLabel, domainLabels[normalizeText(rawScenario?.domain, 'general')] || 'כללי'),
            difficulty: normalizeText(rawScenario?.difficulty, 'medium'),
            role: {
                player: normalizeText(rawScenario?.role?.player, 'את/ה'),
                other: normalizeText(rawScenario?.role?.other, 'הצד השני')
            },
            contextIntro: normalizeText(rawScenario?.contextIntro || rawScenario?.story?.[0], ''),
            openingLine: normalizeText(rawScenario?.openingLine || rawScenario?.story?.[1], ''),
            humanNeed: normalizeText(rawScenario?.humanNeed, 'יש כאן צורך בקשר ובהירות במקום לחץ.'),
            surfaceConflict: normalizeText(rawScenario?.surfaceConflict, normalizeText(rawScenario?.sceneTitle || rawScenario?.title, '')),
            learningFocus: normalizeText(rawScenario?.learningFocus, `כאן מתרגלים איך לקחת את "${metaModelCore.unspecifiedVerb}" ולתרגם אותו למה שאפשר לזהות ולבדוק במציאות.`),
            supportPrompt: normalizeText(rawScenario?.supportPrompt, ''),
            metaModelCore,
            responseSet,
            deepeningQuestion: normalizeText(rawScenario?.deepeningQuestion, 'מה בדיוק קורה כאן בפועל?'),
            microPlan: {
                firstStep: normalizeText(microPlan.firstStep || greenBlueprint.firstStep, 'להגדיר צעד ראשון קטן וברור.'),
                bottleneck: normalizeText(microPlan.bottleneck || greenBlueprint.stuckPoint || metaModelCore.hiddenGap, 'עדיין לא ברור איפה נוצר הפקק.'),
                successSign: normalizeText(microPlan.successSign || greenBlueprint.doneDefinition, 'יש סימן קטן שאפשר לראות במציאות.')
            },
            greenBlueprint: {
                goal: normalizeText(greenBlueprint.goal, rawScenario?.humanNeed || rawScenario?.surfaceConflict || rawScenario?.sceneTitle || ''),
                firstStep: normalizeText(greenBlueprint.firstStep || microPlan.firstStep, 'להגדיר צעד ראשון קטן וברור.'),
                steps: Array.isArray(greenBlueprint.steps) ? greenBlueprint.steps.map((item) => normalizeText(item)).filter(Boolean).slice(0, 4) : [],
                stuckPoint: normalizeText(greenBlueprint.stuckPoint || microPlan.bottleneck || metaModelCore.hiddenGap, metaModelCore.hiddenGap),
                planB: normalizeText(greenBlueprint.planB, ''),
                doneDefinition: normalizeText(greenBlueprint.doneDefinition || microPlan.successSign, microPlan.successSign || 'יש סימן שאפשר למדוד.')
            },
            greenSentence: responseSet.green?.speakerLine || ''
        };
    }

    async function loadData() {
        const response = await fetch('data/scenario-trainer-scenarios.json', { cache: 'no-store' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        const domains = Array.isArray(data?.domains) ? data.domains : [];
        const domainLabels = domains.reduce((acc, item) => {
            const id = normalizeText(item?.id);
            if (id) acc[id] = normalizeText(item?.label, id);
            return acc;
        }, {});
        return {
            domains,
            difficulties: Array.isArray(data?.difficulties) ? data.difficulties : [],
            prismWheel: Array.isArray(data?.prismWheel) ? data.prismWheel : [],
            scenarios: Array.isArray(data?.scenarios) ? data.scenarios.map((item, index) => normalizeScenario(item, index, domainLabels)) : []
        };
    }

    function getDomainLabel(id) {
        if (id === 'all') return 'כל התחומים';
        return normalizeText(state.data.domains.find((item) => item.id === id)?.label, 'כל התחומים');
    }

    function getDifficultyLabel(id) {
        if (id === 'all') return 'כל הרמות';
        return normalizeText(state.data.difficulties.find((item) => item.id === id)?.label, 'כל הרמות');
    }

    function buildSummary(config) {
        const resolved = config || state.homeFilters;
        return `${clampRunSize(resolved.runSize)} סצנות · ${getDomainLabel(resolved.domain)} · ${getDifficultyLabel(resolved.difficulty)}`;
    }

    function getCurrentSummary() {
        if (state.session) {
            return `${state.session.queue.length} סצנות · ${getDomainLabel(state.session.domain)} · ${getDifficultyLabel(state.session.difficulty)}`;
        }
        return buildSummary(state.homeFilters);
    }

    function getSettingsDraft() {
        return state.settingsDraft || {
            defaultDomain: state.homeFilters.domain,
            defaultDifficulty: state.homeFilters.difficulty,
            defaultRunSize: state.homeFilters.runSize,
            soundEnabled: state.settings.soundEnabled,
            prismWheelEnabled: state.settings.prismWheelEnabled
        };
    }

    function createSessionQueue(domain, difficulty, runSize) {
        const queue = state.data.scenarios.filter((scenario) => {
            const domainMatch = domain === 'all' || scenario.domain === domain;
            const difficultyMatch = difficulty === 'all' || scenario.difficulty === difficulty;
            return domainMatch && difficultyMatch;
        });
        return queue.slice().sort(() => Math.random() - 0.5).slice(0, clampRunSize(runSize));
    }

    function openScreen(screenId, options = {}) {
        state.screen = screenId;
        render();
        if (options.scrollTarget) {
            const target = mount.querySelector(options.scrollTarget);
            if (target && typeof target.scrollIntoView === 'function') {
                target.scrollIntoView({ block: 'start', behavior: 'auto' });
                return;
            }
        }
        if (options.preserveScroll) return;
        window.scrollTo({ top: 0, behavior: 'auto' });
    }

    function startSession(config) {
        const next = config || state.homeFilters;
        const queue = createSessionQueue(next.domain, next.difficulty, next.runSize);
        if (!queue.length) {
            showToast('לא נמצאו סצנות למסנן שבחרת.');
            return;
        }
        state.settings.defaultDomain = next.domain;
        state.settings.defaultDifficulty = next.difficulty;
        state.settings.defaultRunSize = clampRunSize(next.runSize);
        saveSettings();
        state.homeFilters = { ...next, runSize: clampRunSize(next.runSize) };
        state.session = {
            domain: next.domain,
            difficulty: next.difficulty,
            queue,
            index: 0,
            score: 0,
            stars: 0,
            streak: 0,
            completed: []
        };
        state.activeScenario = queue[0];
        state.selectedOption = null;
        state.lastEntry = null;
        state.selectedPrismId = '';
        openScreen(SCREEN_IDS.play);
    }

    function toneLabel(option, isGreen) {
        const tone = normalizeText(option?.tone, isGreen ? 'default_green' : 'default_red');
        return TONE_LABELS[tone] || (isGreen ? TONE_LABELS.default_green : TONE_LABELS.default_red);
    }

    function getGreenOptionText(scenario) {
        return normalizeText(scenario?.responseSet?.green?.speakerLine || scenario?.greenSentence, '');
    }

    function getOptionToneGroup(tone, isGreen) {
        const normalizedTone = normalizeText(tone, isGreen ? 'default_green' : 'default_red');
        if (isGreen) {
            if (['clarify_process', 'contain_and_clarify', 'validate_and_specify'].includes(normalizedTone)) return 'clarify';
            if (['contain_and_sequence', 'clear_done_definition', 'define_done_and_owner', 'clarify_format_and_ownership'].includes(normalizedTone)) return 'sequence';
            if (['validate_and_repair'].includes(normalizedTone)) return 'repair';
            if (['clarify_deliverable', 'organize_requirements', 'reduce_ambiguity', 'clarify_required_fields'].includes(normalizedTone)) return 'organize';
            if (['diagnose_then_act', 'smallest_safe_step', 'diagnose_scope_first'].includes(normalizedTone)) return 'diagnose';
            return 'clarify';
        }
        if (['defensive_attack', 'blame_reversal', 'blame', 'criticism', 'comparison', 'shame'].includes(normalizedTone)) return 'blame';
        if (['shutdown', 'stonewall', 'collapse'].includes(normalizedTone)) return 'shutdown';
        if (['impatient_control', 'control', 'global_pressure', 'panic', 'panic_fix'].includes(normalizedTone)) return 'control';
        if (['over_helping', 'rescue', 'takeover'].includes(normalizedTone)) return 'rescue';
        if (['minimize', 'dismissive_reassurance', 'false_fix', 'pseudo_apology', 'pseudo_solution', 'magical_thinking'].includes(normalizedTone)) return 'dismiss';
        if (['vague_yes', 'fake_agreement', 'passive_aggressive', 'false_confidence', 'random_guessing', 'rage', 'avoidance', 'overconfidence', 'panic_reinstall', 'self_attack'].includes(normalizedTone)) return 'blur';
        return 'default';
    }

    function getDomainProcessFocus(domain) {
        return DOMAIN_PROCESS_FOCUS[normalizeText(domain, 'relationships')] || DOMAIN_PROCESS_FOCUS.relationships;
    }

    function buildScenarioLearningFocus(scenario) {
        const custom = normalizeText(scenario?.learningFocus, '');
        if (custom) return custom;
        return `כאן מחפשים את השלב שבו "${scenario?.metaModelCore?.unspecifiedVerb || 'לעשות את זה'}" מפסיק להיות כותרת כללית ומתחיל לקבל צורה שאפשר לבדוק.`;
    }

    function buildFeedbackHeadline(scenario, option, isGreen, toneGroup) {
        const custom = normalizeText(option?.feedbackHeadline, '');
        if (custom) return custom;
        if (isGreen) {
            if (toneGroup === 'repair') return 'כאן יש גם הכרה בפגיעה וגם פתיחה לתיקון שאפשר לבדוק';
            if (toneGroup === 'sequence') return 'כאן השיחה עוברת מהלחץ אל רצף צעדים שאפשר להחזיק';
            if (toneGroup === 'organize') return 'כאן נוצר סדר במקום עומס וערפל';
            if (toneGroup === 'diagnose') return 'כאן בוחרים לעצור, לבדוק, ורק אז לפעול';
            return 'כאן השיחה זזה מהרגשה כללית אל משהו שאפשר לברר באמת';
        }
        if (toneGroup === 'blame') return 'כאן הדיון זז מהבעיה אל השאלה מי אשם';
        if (toneGroup === 'control') return 'כאן יש יותר לחץ, אבל לא יותר בהירות';
        if (toneGroup === 'rescue') return 'כאן אולי נרגע הרגע, אבל היכולת עצמה לא נבנית';
        if (toneGroup === 'shutdown') return 'כאן הקשר נסגר בדיוק כשצריך אותו';
        if (toneGroup === 'dismiss') return 'כאן המצוקה מצטמצמת, אבל התהליך נשאר עמום';
        if (toneGroup === 'blur') return 'כאן נשמעת תגובה, אבל עדיין לא ברור מה עושים';
        return 'כאן השיחה נתקעת סביב תגובה אוטומטית במקום סביב מה שקורה בפועל';
    }

    function buildEmotionalImpact(scenario, option, isGreen, toneGroup) {
        const custom = normalizeText(option?.emotionalImpact, '');
        if (custom) return custom;
        const other = normalizeText(scenario?.role?.other, 'הצד השני');
        const domain = normalizeText(scenario?.domain, 'relationships');
        if (isGreen) {
            if (domain === 'parenting') return `${other} כנראה ישמע כאן שיש לידו מבוגר שמחזיק גם את הלחץ וגם את המשימה. זה בדרך כלל מוריד בושה ומחזיר קצת תחושת מסוגלות.`;
            if (domain === 'relationships') return `${other} שומע כאן לא רק ניסיון להירגע, אלא גם רצון להבין באמת מה קורה ביניכם. זה מקטין צורך להתגונן ומגדיל סיכוי לשיתוף כן.`;
            if (domain === 'work') return `${other} שומע כאן מישהו שמנסה לייצר בהירות מקצועית במקום להעמיד פנים שהכול ברור. זה בונה אמון גם כשהמצב לחוץ.`;
            if (domain === 'bureaucracy') return `התגובה הזו מחזירה תחושת שליטה. במקום להרגיש אבוד/ה מול מערכת או נציג, אפשר לנשום ולהחזיק שוב סדר.`;
            if (domain === 'home_tech') return `${other} שומע כאן גישה עניינית וזהירה: לא מנחשים ולא נבהלים, אלא בודקים מה בטוח ומה קודם למה.`;
            return `${other} כנראה ישמע כאן ניסיון להבין ולא רק להגיב. זה מרכך התנגדות ופותח מקום לשיתוף.`;
        }
        if (domain === 'parenting') {
            if (toneGroup === 'rescue') return `${other} אולי נרגע לרגע, אבל גם שומע שלא באמת סומכים עליו להחזיק את המשימה בעצמו.`;
            return `${other} כנראה ישמע כאן שהוא עצמו הבעיה או שהוא שוב מאכזב. זה בקלות הופך לקיפאון, בכי, התנגדות או "לא רוצה".`;
        }
        if (domain === 'relationships') {
            if (toneGroup === 'shutdown') return `${other} יחווה כאן דלת נסגרת ברגע פגיע. זה מגדיל בדידות ומחזק את התחושה ש"איתך אי אפשר לדבר".`;
            return `${other} ישמע כאן מאבק על אשמה או ביטול של החוויה שלו. במקום להתקרב, הוא ייטה להתכווץ, להחזיר אש או להיסגר.`;
        }
        if (domain === 'work') {
            return `${other} ישמע כאן לחץ, הגנה או עמימות מקצועית. גם אם הטון נשאר מנומס, האמון ביכולת להחזיק את המשימה נחלש.`;
        }
        if (domain === 'bureaucracy') {
            return `התגובה הזאת מחזקת תחושת הצפה. במקום להרגיש שיש דרך להתקדם, הכול נשמע כמו עוד שכבה של בלגן או ייאוש.`;
        }
        if (domain === 'home_tech') {
            return `${other} שומע כאן או ניחוש או לחץ. זה מעלה חרדה סביב התקלה ויכול לגרום לפעולה לא בטוחה או להימנעות מוחלטת.`;
        }
        return `${other} כנראה ישמע כאן יותר לחץ מבהירות, ולכן ייטה להתגונן, להתרחק או להישאר סגור.`;
    }

    function buildProcessImpact(scenario, option, isGreen, toneGroup) {
        const custom = normalizeText(option?.processImpact, '');
        if (custom) return custom;
        const hiddenGap = normalizeText(scenario?.metaModelCore?.hiddenGap, 'מה בדיוק קורה בפועל');
        const domainFocus = getDomainProcessFocus(scenario?.domain);
        if (isGreen) {
            return `מבחינת התהליך, השיחה מפסיקה להסתובב סביב תחושה כללית ומתחילה להתקרב ל-${domainFocus}. כך אפשר לראות סוף סוף ${hiddenGap}.`;
        }
        const endings = {
            blame: 'מאבק על זהות, אשמה או צדק',
            control: 'ציות רגעי בלי הבנה או אחיזה',
            rescue: 'תלות במישהו אחר שייקח את המשימה',
            shutdown: 'עצירה של הקשר ושל הבירור',
            dismiss: 'הרגעה רגעית בלי תנועה אמיתית',
            blur: 'עמימות שנשמעת כמו תגובה אבל לא כמו דרך'
        };
        return `מבחינת התהליך, ${hiddenGap} נשאר עמום. במקום להתקרב ל-${domainFocus}, השיחה גולשת אל ${endings[toneGroup] || 'תגובה אוטומטית'} ולכן קשה יותר לדעת מה לעשות עכשיו.`;
    }

    function buildNextMove(scenario, option, isGreen) {
        const custom = normalizeText(option?.repairMove, '');
        if (custom) return custom;
        if (isGreen) {
            return `המשך טבעי מכאן הוא לעצור על שאלה אחת מדויקת: ${normalizeText(scenario?.deepeningQuestion, 'מה בדיוק קורה כאן בפועל?')}`;
        }
        return `אם רוצים לתקן את המסלול, כדאי לחזור לשאלה שמייצרת בהירות במקום תגובת נגד: ${normalizeText(scenario?.deepeningQuestion, 'מה בדיוק קורה כאן בפועל?')}`;
    }

    function buildLearningTakeaway(scenario, option, isGreen, toneGroup) {
        const custom = normalizeText(option?.learningTakeaway, '');
        if (custom) return custom;
        if (isGreen) {
            return `השורה התחתונה כאן: כשמחברים הכרה אנושית עם שאלה מדויקת, קל יותר להגיע לצעד ראשון שאפשר לבדוק במציאות ולא רק להירגע לרגע.`;
        }
        if (toneGroup === 'rescue') return 'השורה התחתונה כאן: הצלה מהירה יכולה להרגיע רגע, אבל היא משאירה את הכישורים והבהירות מחוץ לשיחה.';
        return `השורה התחתונה כאן: ברגע שהתגובה נוגעת באשמה, לחץ או ערפל, הבעיה עצמה נשארת בלי שם ולכן גם בלי דרך מעשית להתקדם.`;
    }

    function buildMetaCardText(scenario, option, isGreen) {
        if (normalizeText(option?.metaModelExplanation, '')) return normalizeText(option.metaModelExplanation, '');
        const meta = scenario?.metaModelCore || {};
        if (isGreen) {
            return normalizeText(
                `כאן עברת מהכותרת הכללית "${meta.unspecifiedVerb || 'לעשות את זה'}" אל מה שאפשר לבדוק במציאות. במקום להישאר עם בקשה כללית, השיחה נפתחת אל ${meta.hiddenGap || 'השלב המדויק שבו נתקעים'}.`
            );
        }
        return normalizeText(
            `העמימות נשארת במקום: עדיין לא ברור ${meta.hiddenGap || 'מה בדיוק קורה בפועל'}, ולכן השיחה מחליקה להגנה, האשמה או הימנעות במקום לבדיקה.`
        );
    }

    function buildFeedbackGuide(scenario, option, isGreen) {
        const toneGroup = getOptionToneGroup(option?.tone, isGreen);
        return {
            headline: buildFeedbackHeadline(scenario, option, isGreen, toneGroup),
            emotionalImpact: buildEmotionalImpact(scenario, option, isGreen, toneGroup),
            processImpact: buildProcessImpact(scenario, option, isGreen, toneGroup),
            nextMove: buildNextMove(scenario, option, isGreen),
            learningTakeaway: buildLearningTakeaway(scenario, option, isGreen, toneGroup),
            metaModelExplanation: buildMetaCardText(scenario, option, isGreen),
            action: normalizeText(option?.consequenceAction, buildEmotionalImpact(scenario, option, isGreen, toneGroup)),
            result: normalizeText(option?.consequenceResult, buildProcessImpact(scenario, option, isGreen, toneGroup))
        };
    }

    function pickOption(optionId) {
        const scenario = state.activeScenario;
        if (!scenario) return;
        const allOptions = [...scenario.responseSet.red, scenario.responseSet.green];
        const option = allOptions.find((item) => item.id === optionId);
        if (!option) return;
        state.selectedOption = option;
        state.selectedPrismId = '';
        openScreen(SCREEN_IDS.feedback);
    }

    function buildHistoryEntry() {
        const scenario = state.activeScenario;
        const option = state.selectedOption;
        if (!scenario || !option) return null;
        const isGreen = Number(option.score) === 1;
        return {
            timestamp: new Date().toISOString(),
            scenarioId: scenario.scenarioId,
            domain: scenario.domainLabel || scenario.domain,
            difficulty: scenario.difficulty,
            title: scenario.title,
            selectedOptionId: option.id,
            selectedOptionText: option.speakerLine,
            feedback: buildLearningTakeaway(scenario, option, isGreen, getOptionToneGroup(option?.tone, isGreen)),
            score: isGreen ? 1 : 0,
            stars: isGreen ? 1 : 0,
            greenSentence: getGreenOptionText(scenario),
            goalGeneral: normalizeText(scenario.greenBlueprint?.goal, ''),
            successMetric: normalizeText(scenario.greenBlueprint?.doneDefinition || scenario.microPlan?.successSign, '')
        };
    }

    function commitCurrentResult() {
        if (!state.session || !state.selectedOption || state.lastEntry) return state.lastEntry;
        const entry = buildHistoryEntry();
        if (!entry) return null;
        state.lastEntry = entry;
        state.session.completed.push(entry);
        state.session.score += entry.score;
        state.session.stars += entry.stars;
        state.session.streak = entry.score ? state.session.streak + 1 : 0;
        state.progress.completed += 1;
        state.progress.greenCount += entry.score;
        state.progress.stars += entry.stars;
        state.progress.currentGreenStreak = entry.score ? state.progress.currentGreenStreak + 1 : 0;
        state.progress.bestGreenStreak = Math.max(state.progress.bestGreenStreak || 0, state.progress.currentGreenStreak);
        state.progress.history.unshift(entry);
        state.progress.history = state.progress.history.slice(0, 300);
        saveProgress();
        return entry;
    }

    function continueFromResult() {
        const entry = commitCurrentResult();
        if (!entry) return;
        openScreen(SCREEN_IDS.score);
    }

    function toggleBlueprintScreen() {
        if (!state.activeScenario || !state.selectedOption) return;
        const nextScreen = state.screen === SCREEN_IDS.blueprint ? SCREEN_IDS.feedback : SCREEN_IDS.blueprint;
        openScreen(nextScreen, {
            scrollTarget: nextScreen === SCREEN_IDS.blueprint ? '[data-scenario-analysis="1"]' : '[data-scenario-feedback-thread="1"]'
        });
    }

    function continueToNextScene() {
        if (!state.session) {
            state.lastEntry = null;
            state.selectedOption = null;
            state.activeScenario = null;
            openScreen(SCREEN_IDS.home);
            return;
        }
        const isLast = state.session.index >= state.session.queue.length - 1;
        if (isLast) {
            state.session = null;
            state.activeScenario = null;
            state.selectedOption = null;
            state.lastEntry = null;
            showToast('הסשן הסתיים. אפשר להתחיל סשן חדש.');
            openScreen(SCREEN_IDS.home);
            return;
        }
        state.session.index += 1;
        state.activeScenario = state.session.queue[state.session.index];
        state.selectedOption = null;
        state.lastEntry = null;
        state.selectedPrismId = '';
        openScreen(SCREEN_IDS.play);
    }

    function applyPreset(kind) {
        const defaults = getDefaultSettings();
        const current = getSettingsDraft();
        if (kind === 'compact') {
            state.settingsDraft = {
                ...current,
                defaultRunSize: 4,
                prismWheelEnabled: false
            };
        } else {
            state.settingsDraft = {
                ...current,
                defaultDomain: defaults.defaultDomain,
                defaultDifficulty: defaults.defaultDifficulty,
                defaultRunSize: defaults.defaultRunSize,
                soundEnabled: defaults.soundEnabled,
                prismWheelEnabled: defaults.prismWheelEnabled
            };
        }
        render();
    }

    function openSettings() {
        state.settingsOpen = true;
        state.settingsDraft = {
            defaultDomain: state.homeFilters.domain,
            defaultDifficulty: state.homeFilters.difficulty,
            defaultRunSize: state.homeFilters.runSize,
            soundEnabled: state.settings.soundEnabled,
            prismWheelEnabled: state.settings.prismWheelEnabled
        };
        render();
    }

    function closeSettings() {
        state.settingsOpen = false;
        state.settingsDraft = null;
        render();
    }

    function saveSettingsFromDraft(startAfterSave) {
        const draft = getSettingsDraft();
        state.settings = {
            defaultDomain: draft.defaultDomain,
            defaultDifficulty: draft.defaultDifficulty,
            defaultRunSize: clampRunSize(draft.defaultRunSize),
            soundEnabled: !!draft.soundEnabled,
            prismWheelEnabled: !!draft.prismWheelEnabled
        };
        state.homeFilters = {
            domain: state.settings.defaultDomain,
            difficulty: state.settings.defaultDifficulty,
            runSize: clampRunSize(state.settings.defaultRunSize)
        };
        saveSettings();
        state.settingsOpen = false;
        state.settingsDraft = null;
        render();
        if (startAfterSave) {
            startSession(state.homeFilters);
            return;
        }
        showToast('הגדרות הסימולטור נשמרו.');
    }

    function updateHomeFilter(key, value) {
        if (key === 'runSize') state.homeFilters.runSize = clampRunSize(value);
        else state.homeFilters[key] = value;
        render();
    }

    function updateDraft(key, value) {
        const draft = getSettingsDraft();
        if (key === 'defaultRunSize') draft.defaultRunSize = clampRunSize(value);
        else draft[key] = value;
        state.settingsDraft = draft;
        render();
    }

    function exportHistory() {
        const payload = {
            exportedAt: new Date().toISOString(),
            progress: state.progress,
            history: state.progress.history || []
        };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `scenario_trainer_history_${Date.now()}.json`;
        anchor.click();
        URL.revokeObjectURL(url);
    }

    function clearHistory() {
        const ok = window.confirm('לנקות את כל היסטוריית הסצנות?');
        if (!ok) return;
        state.progress = getDefaultProgress();
        saveProgress();
        render();
    }

    function showToast(message) {
        window.clearTimeout(state.toastTimer);
        state.toastMessage = normalizeText(message, '');
        render();
        if (!state.toastMessage) return;
        state.toastTimer = window.setTimeout(() => {
            state.toastMessage = '';
            render();
        }, 2400);
    }

    function processStepState(stepId) {
        const currentId = PROCESS_STEP_BY_SCREEN[state.screen];
        if (!currentId) return '';
        const steps = Array.isArray(trainerContract.processSteps) ? trainerContract.processSteps.map((item) => item.id) : [];
        const currentIndex = steps.indexOf(currentId);
        const stepIndex = steps.indexOf(stepId);
        if (stepIndex === -1 || currentIndex === -1) return '';
        if (stepIndex < currentIndex) return 'is-done';
        if (stepIndex === currentIndex) return 'is-active';
        return 'is-upcoming';
    }

    function getScenarioDisplayFamilyLabel() {
        if (trainerContract?.id === 'scenario-trainer') return 'שיחה חיה';
        return normalizeText(trainerContract?.familyLabel || '', '');
    }

    function getScenarioDisplaySubtitle() {
        if (trainerContract?.id === 'scenario-trainer') {
            return 'נכנסים לסצנה אנושית, בוחרים תגובה אחת, ורואים איך היא נוחתת רגשית ומה היא פותחת בהמשך השיחה.';
        }
        return normalizeText(trainerContract?.subtitle || '', '');
    }

    function getScenarioHomeEntryHint() {
        return 'כניסה ראשונה? אפשר פשוט ללחוץ "התחל סשן". אם כבר ידוע מה רוצים לתרגל, פתחו הגדרות וכווננו תחום, רמה ואורך סשן.';
    }

    function getScenarioScoreNextHint(isLast) {
        return isLast
            ? 'להמשך: אפשר לפתוח סשן חדש, או לעבור לגשר תחושה-שפה אם צריך לדייק את המשפט לפני שיחה אמיתית.'
            : 'להמשך: אם המשפט הירוק כבר יושב, המשיכו לסצנה הבאה. אם עדיין יש עמימות, פתחו שוב את הפירוק לפני שממשיכים.';
    }

    function render() {
        mount.innerHTML = renderApp();
    }

    function renderApp() {
        const currentSummary = getCurrentSummary();
        const sessionMeta = state.session
            ? `<span class="scenario-home-tag">סצנה ${escapeHtml(state.session.index + 1)}/${escapeHtml(state.session.queue.length)}</span><span class="scenario-home-tag">נקודות: ${escapeHtml(state.session.score)}</span>`
            : `<span class="scenario-home-tag">${escapeHtml(trainerContract.quickStartLabel || '')}</span>`;
        return `
          <div id="scenario-trainer" class="scenario-platform-root" dir="rtl" lang="he" data-trainer-platform="1" data-trainer-id="scenario-trainer" data-screen="${state.screen}" data-trainer-mobile-order="${escapeHtml(getMobileZoneOrder().join(','))}" style="${escapeHtml(buildRootStyle())}">
            <div class="scenario-platform-header">
              <div class="scenario-platform-header-copy">
                <p class="scenario-platform-family">${escapeHtml(getScenarioDisplayFamilyLabel())}</p>
                <h1>${escapeHtml(trainerContract.title || 'סימולטור סצנות')}</h1>
                <p class="scenario-platform-subtitle">${escapeHtml(getScenarioDisplaySubtitle())}</p>
              </div>
              <div class="scenario-platform-header-meta">${sessionMeta}</div>
            </div>
            ${state.screen !== SCREEN_IDS.home ? `
            <div class="scenario-session-bar" role="toolbar" aria-label="ניהול סשן">
              <span class="scenario-session-bar-info">
                ${state.session ? `סצנה ${escapeHtml(String(state.session.index + 1))}/${escapeHtml(String(state.session.queue.length))} · ${escapeHtml(String(state.session.score))} נק׳` : ''}
              </span>
              <button type="button" class="scenario-session-bar-end" data-scenario-action="go-home">↩ חזרה לבית</button>
            </div>` : ''}
            <div class="scenario-platform-shell">
              <section class="scenario-home-purpose-card" data-trainer-zone="purpose" style="${escapeHtml(getZoneStyle('purpose'))}">
                <p class="scenario-home-kicker">מה עושים כאן?</p>
                <h3>סימולטור דיאלוג אנושי עם גב מטה-מודלי</h3>
                <p class="scenario-home-lead">נכנסים לסצנה קצרה, שומעים משפט אמיתי מהצד השני, בוחרים תגובה אחת, ורואים איך היא מתקבלת רגשית ומה היא פותחת או סוגרת בתהליך.</p>
                <div class="scenario-home-tag-row">
                  <span class="scenario-home-tag">הורות · זוגיות · עבודה · ביורוקרטיה · בית/טק</span>
                  <span class="scenario-home-tag">בחירה אחת בכל רגע</span>
                  <span class="scenario-home-tag">קודם דיאלוג, אחר כך ניתוח</span>
                </div>
              </section>
              <section class="scenario-home-start-strip" data-trainer-zone="start" style="${escapeHtml(getZoneStyle('start'))}">
                <div class="scenario-home-start-copy">
                  <p class="scenario-home-kicker">${escapeHtml(trainerContract.quickStartLabel || 'מתחילים מכאן')}</p>
                  <h3>אפשר להיכנס ישר לשיחה</h3>
                  <p>ברירת המחדל כבר מכוונת לסשן שימושי. אם רוצים, אפשר לשנות תחום, רמה או כלים נוספים לפני ההתחלה.</p>
                </div>
                <div class="scenario-start-actions">
                  <button id="scenario-start-run-btn" type="button" class="btn btn-primary" data-trainer-action="start-session">${escapeHtml(trainerContract.startActionLabel || 'התחל סשן')}</button>
                  <button id="scenario-home-settings" type="button" class="btn btn-secondary" data-trainer-action="open-settings">הגדרות</button>
                  <span id="scenario-home-summary-pill" class="scenario-summary-pill" data-trainer-summary="current">${escapeHtml(currentSummary)}</span>
                </div>
                <div class="scenario-home-inline-actions">
                  <button type="button" class="btn btn-secondary" data-scenario-action="open-help">איך זה עובד</button>
                  <button type="button" class="btn btn-secondary" data-scenario-action="open-history">היסטוריה</button>
                </div>
              </section>
              <section class="scenario-home-helper-strip" aria-label="מהלך האימון" data-trainer-zone="helper-steps" style="${escapeHtml(getZoneStyle('helper-steps'))}">
                ${renderHelperSteps()}
              </section>
              <div class="scenario-standalone-layout">
                <main class="scenario-standalone-main" data-trainer-zone="main" style="${escapeHtml(getZoneStyle('main'))}">
                  ${renderMain()}
                </main>
                <aside class="scenario-platform-support" data-trainer-zone="support" data-trainer-support-mode="${escapeHtml(trainerContract.supportRailMode || 'dialogue-meta')}" style="${escapeHtml(getZoneStyle('support'))}">
                  ${renderSupportRail()}
                </aside>
              </div>
            </div>
            ${state.settingsOpen ? renderSettingsModal() : ''}
            ${state.toastMessage ? `<div class="scenario-toast">${escapeHtml(state.toastMessage)}</div>` : ''}
          </div>
        `;
    }

    function renderMain() {
        if (state.loading) {
            return `<section class="scenario-overlay-card scenario-workspace-card"><p class="scenario-panel-kicker">טוען</p><h3>מכין את הסימולטור</h3><p>עוד רגע יופיעו הסצנות, התחומים והגדרות הסשן.</p></section>`;
        }
        if (state.loadError) {
            return `<section class="scenario-overlay-card scenario-workspace-card"><p class="scenario-panel-kicker">שגיאה</p><h3>לא הצלחנו לטעון את הסימולטור</h3><p>${escapeHtml(state.loadError)}</p></section>`;
        }
        switch (state.screen) {
            case SCREEN_IDS.play:
                return renderPlayScreen();
            case SCREEN_IDS.feedback:
                return renderFeedbackScreen();
            case SCREEN_IDS.blueprint:
                return renderBlueprintScreen();
            case SCREEN_IDS.score:
                return renderScoreScreen();
            case SCREEN_IDS.history:
                return renderHistoryScreen();
            case SCREEN_IDS.help:
                return renderHelpScreen();
            default:
                return renderHomeScreen();
        }
    }

    function renderHelperSteps() {
        const steps = Array.isArray(trainerContract.helperSteps) ? trainerContract.helperSteps : [];
        return steps.map((step) => `
          <article class="scenario-home-helper-step">
            <strong>${escapeHtml(step.title)}</strong>
            <span>${escapeHtml(step.description)}</span>
          </article>
        `).join('');
    }

    function getFlowGuideContent() {
        if (state.screen === SCREEN_IDS.play) {
            return {
                id: 'play',
                kicker: 'מה קודם ומה אחר כך',
                title: 'קודם בוחרים תגובה אחת, אחר כך רואים איך היא נוחתת',
                body: 'אין כאן כמה מסלולים במקביל. בוחרים תשובה אחת, ואז מקבלים משוב על ההשפעה שלה.',
                currentLabel: 'עכשיו',
                currentText: 'קרא/י את פתיחת הסצנה ובחר/י תגובה אחת בלבד.',
                nextLabel: 'מיד אחר כך',
                nextText: 'ייפתח משוב קצר: איך זה נחת בצד השני ומה זה עושה לשיחה.'
            };
        }
        if (state.screen === SCREEN_IDS.feedback) {
            return {
                id: 'feedback',
                kicker: 'מה קודם ומה אחר כך',
                title: 'קודם רואים את ההשפעה, ורק אחר כך מחליטים אם צריך ניתוח',
                body: 'השלב הראשי כאן הוא להבין מה נפתח או נסגר. הניתוח המעמיק הוא שכבה משנית שנפתחת רק אם היא תעזור.',
                currentLabel: 'עכשיו',
                currentText: 'הסתכל/י על התגובה שמולך ועל שני כרטיסי ההשפעה.',
                nextLabel: 'השלב הבא',
                nextText: 'אפשר לסכם את הסצנה, או לפתוח ניתוח מעמיק בלי לעזוב את החוט הנוכחי.'
            };
        }
        if (state.screen === SCREEN_IDS.blueprint) {
            return {
                id: 'blueprint',
                kicker: 'מה קודם ומה אחר כך',
                title: 'הניתוח נפתח בתוך אותה סצנה',
                body: 'אין מעבר למסך אחר. המשוב, התגובה והעוגנים נשארים במקום, והניתוח נפתח מתחתיהם.',
                currentLabel: 'עכשיו',
                currentText: 'עבר/י על מפת הפעולה, המשפט הירוק והעוגנים שעוזרים לדייק את הסצנה.',
                nextLabel: 'השלב הבא',
                nextText: 'כשמספיק ברור, סוגרים את הניתוח או עוברים ישר לסיכום הסצנה.'
            };
        }
        if (state.screen === SCREEN_IDS.score) {
            return {
                id: 'score',
                kicker: 'מה קודם ומה אחר כך',
                title: 'הסצנה נסגרת, והדיוק עובר הלאה',
                body: 'כאן עוצרים רגע, לוקחים את המשפט הירוק ואת הלקח, ואז מחליטים אם להמשיך או לחזור לבית.',
                currentLabel: 'עכשיו',
                currentText: 'קרא/י את הסיכום הקצר ומה כדאי לקחת לסצנה הבאה.',
                nextLabel: 'השלב הבא',
                nextText: 'הכפתור הראשי ממשיך למסך הבא. הכפתור המשני מחזיר לבית הסצנות.'
            };
        }
        return null;
    }

    function renderFlowGuide() {
        const flow = getFlowGuideContent();
        if (!flow) return '';
        return `
          <section class="scenario-flow-guide" data-scenario-flow-guide="${escapeHtml(flow.id)}">
            <div class="scenario-flow-guide-head">
              <p class="scenario-panel-kicker">${escapeHtml(flow.kicker)}</p>
              <h4>${escapeHtml(flow.title)}</h4>
              <p>${escapeHtml(flow.body)}</p>
            </div>
            <div class="scenario-flow-guide-grid">
              <article class="scenario-flow-guide-card is-current">
                <strong>${escapeHtml(flow.currentLabel)}</strong>
                <span>${escapeHtml(flow.currentText)}</span>
              </article>
              <article class="scenario-flow-guide-card is-next">
                <strong>${escapeHtml(flow.nextLabel)}</strong>
                <span>${escapeHtml(flow.nextText)}</span>
              </article>
            </div>
          </section>
        `;
    }

    function renderHomeScreen() {
        return `
          <section class="scenario-start-card scenario-home-setup-card scenario-workspace-card">
            <div class="scenario-home-section-head">
              <div>
                <p class="scenario-home-kicker">כיוון הסשן</p>
                <h4>כך ייראה הסבב הבא</h4>
              </div>
              <div class="scenario-home-stats">
                <div class="scenario-stat-item">סצנות שהושלמו: ${escapeHtml(state.progress.completed)}</div>
                <div class="scenario-stat-item">בחירות ירוקות: ${escapeHtml(state.progress.greenCount)}</div>
                <div class="scenario-stat-item">רצף ירוק נוכחי: ${escapeHtml(state.progress.currentGreenStreak)}</div>
                <div class="scenario-stat-item">רצף ירוק מיטבי: ${escapeHtml(state.progress.bestGreenStreak)}</div>
              </div>
            </div>
            <div class="blueprint-questions scenario-pick-grid scenario-start-grid">
              <div class="q-card">
                <label for="scenario-domain-select">תחום</label>
                <select id="scenario-domain-select">${renderDomainOptions(state.homeFilters.domain)}</select>
              </div>
              <div class="q-card">
                <label for="scenario-difficulty-select">רמה</label>
                <select id="scenario-difficulty-select">${renderDifficultyOptions(state.homeFilters.difficulty)}</select>
              </div>
              <div class="q-card">
                <label for="scenario-run-size">כמה סצנות?</label>
                <input type="range" id="scenario-run-size" min="3" max="10" value="${escapeHtml(state.homeFilters.runSize)}" />
                <span id="scenario-run-size-value">${escapeHtml(state.homeFilters.runSize)}</span>
              </div>
            </div>
            <p class="scenario-home-footnote">הצלחה בסשן אחד נראית כמו תגובה שמקדמת יותר קשר, פחות עמימות, וצעד הבא שאפשר לבדוק במציאות.</p>
            <p class="scenario-feedback-next-hint">${escapeHtml(getScenarioHomeEntryHint())}</p>
          </section>
        `;
    }

    function renderOptionButton(option, isGreen) {
        return `
          <button type="button" class="scenario-option-btn ${isGreen ? 'green' : 'red'}" data-scenario-action="pick-option" data-option-id="${escapeHtml(option.id)}">
            <span class="scenario-option-kind">${escapeHtml(toneLabel(option, isGreen))}</span>
            <span class="scenario-option-main">${escapeHtml(option.speakerLine)}</span>
            <span class="scenario-option-hint">${escapeHtml(option.choiceHint || (isGreen ? option.whyItWorks : option.whyItHurts))}</span>
          </button>
        `;
    }

    function renderPlayScreen() {
        const scenario = state.activeScenario || state.session?.queue?.[state.session.index];
        if (!scenario) return renderHomeScreen();
        const options = [...scenario.responseSet.red, scenario.responseSet.green];
        const currentIndex = (state.session?.index || 0) + 1;
        const total = state.session?.queue?.length || 0;
        const progress = total > 0 ? Math.round(((currentIndex - 1) / total) * 100) : 0;
        return `
          <section class="scenario-workspace-card">
            <div class="scenario-session-header">
              <p class="scenario-counter">סצנה <span>${escapeHtml(currentIndex)}</span>/<span>${escapeHtml(total)}</span></p>
              <p class="scenario-session-meta">נקודות: <span>${escapeHtml(state.session?.score || 0)}</span> | רצף ירוק: <span>${escapeHtml(state.session?.streak || 0)}</span></p>
            </div>
            <div class="progress-bar"><div class="progress-fill" style="width:${escapeHtml(progress)}%"></div></div>
            ${renderFlowGuide()}
            <div class="scenario-chat-shell">
              <div class="scenario-scene-card">
                <p class="scenario-scene-kicker">${escapeHtml(`${scenario.domainLabel} · בתפקיד ${scenario.role.player}`)}</p>
                <h3>${escapeHtml(scenario.sceneTitle)}</h3>
                <p class="scenario-context-intro">${escapeHtml(scenario.contextIntro)}</p>
                <div class="scenario-relationship-row">
                  <span class="scenario-role-chip">${escapeHtml(scenario.role.player)}</span>
                  <span class="scenario-role-chip other">${escapeHtml(scenario.role.other)}</span>
                </div>
                <div class="scenario-scene-meta">
                  <div class="scenario-scene-meta-card">
                    <span class="label">מה חשוב כאן</span>
                    <p>${escapeHtml(scenario.humanNeed)}</p>
                  </div>
                  <div class="scenario-scene-meta-card">
                    <span class="label">הקונפליקט הגלוי</span>
                    <p>${escapeHtml(scenario.surfaceConflict)}</p>
                  </div>
                </div>
              </div>
              <div class="scenario-story-card">
                <div class="scenario-chat-thread">
                  <div class="scenario-bubble other">
                    <span class="scenario-bubble-speaker">${escapeHtml(scenario.role.other)}</span>
                    <p>${escapeHtml(scenario.openingLine)}</p>
                  </div>
                </div>
              </div>
            </div>
            <h4 class="scenario-options-title">מה תגיד/י עכשיו?</h4>
            <p class="scenario-options-subtitle">בחר/י תגובה אחת שהכי מקדמת קשר, בהירות וצעד בדיקה.</p>
            <div id="scenario-options-container" class="scenario-options-container">
              ${options.map((option) => renderOptionButton(option, Number(option.score) === 1)).join('')}
            </div>
          </section>
        `;
    }

    function renderFeedbackActionBar(analysisOpen) {
        return `
          <div class="scenario-flow-actions">
            <div class="scenario-flow-actions-copy">
              <strong>${escapeHtml(analysisOpen ? 'הניתוח פתוח בתוך אותה סצנה' : 'השלב הבא נשאר ברור וקרוב')}</strong>
              <span>${escapeHtml(analysisOpen
                  ? 'הסצנה עדיין נשארת מולך. אפשר לסגור את הניתוח או לעבור ישר לסיכום.'
                  : 'הכפתור הראשי ממשיך לסיכום הסצנה. הניתוח המעמיק נפתח כאן רק אם צריך עוד שכבה אחת.')}</span>
            </div>
            <div class="scenario-feedback-actions scenario-feedback-actions--flow">
              <button type="button" class="btn btn-primary" data-scenario-action="continue-result">לסיכום הסצנה</button>
              <button type="button" class="btn btn-secondary" data-scenario-action="show-blueprint">${escapeHtml(analysisOpen ? 'סגור/י ניתוח מעמיק' : 'פתח/י ניתוח מעמיק')}</button>
            </div>
          </div>
        `;
    }

    function renderBlueprintDetails(scenario, isGreen) {
        const bp = scenario.greenBlueprint || {};
        const prismItems = state.settings.prismWheelEnabled && isGreen && Array.isArray(state.data.prismWheel) ? state.data.prismWheel : [];
        const selectedPrism = prismItems.find((item) => item.id === state.selectedPrismId) || null;
        return `
          <section class="scenario-analysis-panel" data-scenario-analysis="1">
            <div class="scenario-analysis-head">
              <p class="scenario-panel-kicker">ניתוח מעמיק</p>
              <h4>מפת פעולה קצרה מתוך אותה סצנה</h4>
              <p>כאן פותחים את מה שהיה עמום, בלי לעזוב את התגובה, את המשוב ואת הכיוון שכבר נבנו.</p>
            </div>
            <div class="scenario-tote-grid">
              <div class="scenario-tote-slot"><h5>פתיחת הסצנה</h5><p>${escapeHtml(scenario.openingLine)}</p></div>
              <div class="scenario-tote-slot"><h5>מה נשאר עמום</h5><p>${escapeHtml(scenario.metaModelCore.hiddenGap)}</p></div>
              <div class="scenario-tote-slot"><h5>צעד ראשון קטן</h5><p>${escapeHtml(scenario.microPlan.firstStep)}</p></div>
              <div class="scenario-tote-slot"><h5>צוואר הבקבוק</h5><p>${escapeHtml(scenario.microPlan.bottleneck)}</p></div>
              <div class="scenario-tote-slot"><h5>סימן הצלחה</h5><p>${escapeHtml(scenario.microPlan.successSign)}</p></div>
              <div class="scenario-tote-slot"><h5>שאלת ההעמקה</h5><p>${escapeHtml(scenario.deepeningQuestion)}</p></div>
            </div>
            <div class="final-blueprint-display scenario-blueprint-display">
              <div class="blueprint-section"><h4>מטרה</h4><p>${escapeHtml(bp.goal || scenario.humanNeed)}</p></div>
              <div class="blueprint-section"><h4>צעד ראשון</h4><p>${escapeHtml(bp.firstStep || scenario.microPlan.firstStep)}</p></div>
              <div class="blueprint-section"><h4>שלבים</h4><ul>${(bp.steps || [scenario.microPlan.firstStep]).map((step) => `<li>${escapeHtml(step)}</li>`).join('')}</ul></div>
              <div class="blueprint-section"><h4>נקודת תקיעה</h4><p>${escapeHtml(bp.stuckPoint || scenario.microPlan.bottleneck)}</p></div>
              <div class="blueprint-section"><h4>חלופה / תחליף</h4><p>${escapeHtml(bp.planB || 'אם נתקעים שוב, חוזרים לשאלה אחת שמבהירה מה בדיוק קורה בפועל.')}</p></div>
              <div class="blueprint-section"><h4>מדד הצלחה</h4><p>${escapeHtml(bp.doneDefinition || scenario.microPlan.successSign)}</p></div>
            </div>
            <div class="scenario-green-box">
              <h4>המשפט הירוק המוצע</h4>
              <p>${escapeHtml(getGreenOptionText(scenario))}</p>
              <button type="button" class="btn btn-secondary" data-scenario-action="copy-green">העתק משפט ירוק</button>
            </div>
            ${prismItems.length ? renderPrismWheel(prismItems, selectedPrism) : ''}
          </section>
        `;
    }

    function renderFeedbackScreen(forceAnalysisOpen = false) {
        const scenario = state.activeScenario;
        const option = state.selectedOption;
        if (!scenario || !option) return renderPlayScreen();
        const isGreen = Number(option.score) === 1;
        const guide = buildFeedbackGuide(scenario, option, isGreen);
        const analysisOpen = forceAnalysisOpen || state.screen === SCREEN_IDS.blueprint;
        return `
          <section class="scenario-workspace-card" data-scenario-feedback-thread="1">
            <p class="scenario-panel-kicker">אחרי הבחירה</p>
            <div class="scenario-feedback-mark ${isGreen ? 'green' : 'red'}" style="opacity:1;transform:scale(1);">${isGreen ? '✓' : '!'}</div>
            <div class="scenario-feedback-summary-card">
              <p class="scenario-feedback-kind">${escapeHtml(isGreen ? 'התגובה הזו פותחת מקום לבדיקה' : 'התגובה הזו כנראה תסגור את השיחה')}</p>
              <h3>${escapeHtml(guide.headline)}</h3>
              <p>${escapeHtml(isGreen ? option.whyItWorks : option.whyItHurts)}</p>
            </div>
            ${renderFlowGuide()}
            <div class="scenario-feedback-thread">
              <div class="scenario-bubble player selected ${isGreen ? 'green' : 'red'}">
                <span class="scenario-bubble-speaker">התשובה שלך</span>
                <p id="scenario-feedback-choice-bubble">${escapeHtml(option.speakerLine)}</p>
              </div>
              <div class="scenario-bubble other followup">
                <span class="scenario-bubble-speaker">התגובה שמולך</span>
                <p id="scenario-feedback-other-bubble">${escapeHtml(option.likelyOtherReply)}</p>
              </div>
            </div>
            <div class="scenario-impact-grid">
              <article class="scenario-impact-card" data-scenario-impact="emotion">
                <p class="scenario-panel-kicker">איך זה נחת בצד השני</p>
                <h4>${escapeHtml(isGreen ? 'יש כאן מקום לנשום ולהקשיב' : 'התגובה הזאת כנראה תלחיץ או תכווץ')}</h4>
                <p>${escapeHtml(guide.emotionalImpact)}</p>
              </article>
              <article class="scenario-impact-card" data-scenario-impact="process">
                <p class="scenario-panel-kicker">מה זה עושה לשיחה</p>
                <h4>${escapeHtml(isGreen ? 'השיחה עוברת למה שאפשר לבדוק' : 'הבעיה נשארת בלי שם ברור')}</h4>
                <p>${escapeHtml(guide.processImpact)}</p>
              </article>
            </div>
            <div id="scenario-consequence-box" class="scenario-consequence-box ${isGreen ? 'green' : 'red'}" data-scenario-consequence="1">
              <h4>${escapeHtml(isGreen ? 'איך ממשיכים מכאן' : 'מה אפשר לנסות במקום')}</h4>
              <p>${escapeHtml(guide.nextMove)}</p>
              <p>${escapeHtml(guide.learningTakeaway)}</p>
            </div>
            <details class="scenario-meta-accordion">
              <summary>מה היה עמום / מה נפתח כאן</summary>
              <div class="scenario-meta-accordion-body">
                <p class="scenario-meta-card-text">${escapeHtml(guide.metaModelExplanation)}</p>
                <div class="scenario-predicate-panel">
                  <p><strong>הפועל/המהלך העמום:</strong> ${escapeHtml(scenario.metaModelCore.unspecifiedVerb)}</p>
                  <p><strong>מה נשאר חסר או נפתח כאן:</strong> ${escapeHtml(scenario.metaModelCore.hiddenGap)}</p>
                  <p><strong>שאלת ההעמקה הבאה:</strong> ${escapeHtml(scenario.deepeningQuestion)}</p>
                </div>
              </div>
            </details>
            <div class="scenario-feedback-note">${escapeHtml(isGreen ? 'כדאי לקחת את אותו קו לשאלה אחת נוספת או לפתוח את מפת הפעולה הקצרה.' : 'כדאי לעצור על מה שנסגר כאן, ואז לעבור לשאלה שמחזירה את השיחה לתהליך במקום לאשמה או לחץ.')}</div>
            ${analysisOpen ? renderBlueprintDetails(scenario, isGreen) : ''}
            ${renderFeedbackActionBar(analysisOpen)}
          </section>
        `;
    }

    function renderSupportRail() {
        const currentStepId = PROCESS_STEP_BY_SCREEN[state.screen];
        const scenario = state.activeScenario;
        const option = state.selectedOption;
        const isGreen = Number(option?.score) === 1;
        const guide = scenario && option ? buildFeedbackGuide(scenario, option, isGreen) : null;
        const statusText = state.session
            ? `סצנה ${state.session.index + 1}/${state.session.queue.length} · ${state.session.score} נקודות · רצף ${state.session.streak}`
            : `התקדמות כוללת · ${state.progress.completed} סצנות · ${state.progress.greenCount} בחירות ירוקות`;
        const cueTitle = scenario
            ? (state.screen === SCREEN_IDS.feedback || state.screen === SCREEN_IDS.blueprint ? (isGreen ? 'מה לחזק מכאן' : 'מה לתקן מכאן') : 'מה להחזיק בסצנה')
            : 'מה ייחשב הצלחה';
        const cueBody = scenario
            ? (state.screen === SCREEN_IDS.feedback || state.screen === SCREEN_IDS.blueprint
                ? (guide ? guide.learningTakeaway : (isGreen ? scenario.microPlan.firstStep : scenario.deepeningQuestion))
                : (normalizeText(scenario.supportPrompt, '') || buildScenarioLearningFocus(scenario)))
            : 'תגובה אחת שמורידה לחץ, מייצרת בהירות, ופותחת צעד שאפשר לבדוק בפועל.';
        return `
          <div class="scenario-support-intro">
            <p class="scenario-panel-kicker">עוגנים ברקע</p>
            <h3>מה מחזיקים לידך בלי לאבד את חוט השיחה</h3>
            <p>המסלול הראשי נשאר למעלה. כאן נשמרים מצב הסשן, מפת התהליך והעוגן המטה-מודלי.</p>
          </div>
          <section class="scenario-support-card" data-support-kind="status">
            <p class="scenario-panel-kicker">מצב נוכחי</p>
            <h4>הסשן שלך</h4>
            <p>${escapeHtml(statusText)}</p>
          </section>
          <section class="scenario-support-card" data-support-kind="process">
            <p class="scenario-panel-kicker">מפת התהליך</p>
            <h4>איפה אתה/את נמצא/ת עכשיו</h4>
            <div class="scenario-process-rail">
              ${(Array.isArray(trainerContract.processSteps) ? trainerContract.processSteps : []).map((step) => `
                <div class="scenario-process-step ${processStepState(step.id)}">
                  <strong>${escapeHtml(step.label)}</strong>
                  <span>${escapeHtml(step.description)}</span>
                </div>
              `).join('')}
            </div>
          </section>
          <section class="scenario-support-card" data-support-kind="cue">
            <p class="scenario-panel-kicker">${escapeHtml(cueTitle)}</p>
            <h4>${escapeHtml(scenario ? scenario.sceneTitle : 'כך נראה סשן טוב')}</h4>
            <p>${escapeHtml(cueBody)}</p>
          </section>
          ${currentStepId && scenario ? `
            <section class="scenario-support-card" data-support-kind="anchor">
              <p class="scenario-panel-kicker">עוגן לשיחה</p>
              <h4>מה היה עמום כאן</h4>
              <p><strong>הפועל/המהלך:</strong> ${escapeHtml(scenario.metaModelCore.unspecifiedVerb)}</p>
              <p><strong>החסר בפועל:</strong> ${escapeHtml(scenario.metaModelCore.hiddenGap)}</p>
            </section>
          ` : ''}
        `;
    }

    function renderSettingsModal() {
        const draft = getSettingsDraft();
        return `
          <div class="scenario-settings-backdrop">
            <div class="scenario-settings-shell scenario-settings-modal" data-trainer-settings-shell="1" data-trainer-id="scenario-trainer">
              <div class="scenario-settings-head">
                <div>
                  <p class="scenario-home-kicker">לוח בקרה</p>
                  <h3>${escapeHtml(trainerContract.settingsTitle || 'הגדרות')}</h3>
                  <p class="scenario-settings-subtitle">${escapeHtml(trainerContract.settingsSubtitle || '')}</p>
                </div>
                <div id="scenario-settings-summary-pill" class="scenario-summary-pill" data-trainer-summary="preview">${escapeHtml(buildSummary({ domain: draft.defaultDomain, difficulty: draft.defaultDifficulty, runSize: draft.defaultRunSize }))}</div>
              </div>
              <div class="scenario-settings-grid">
                <section class="scenario-settings-card" data-kind="basic">
                  <div class="scenario-home-section-head">
                    <div>
                      <p class="scenario-home-kicker">בסיס הסשן</p>
                      <h4>מה לתרגל</h4>
                    </div>
                  </div>
                  <div class="blueprint-questions">
                    <div class="q-card">
                      <label for="scenario-setting-domain">תחום ברירת מחדל</label>
                      <select id="scenario-setting-domain">${renderDomainOptions(draft.defaultDomain)}</select>
                    </div>
                    <div class="q-card">
                      <label for="scenario-setting-difficulty">רמת ברירת מחדל</label>
                      <select id="scenario-setting-difficulty">${renderDifficultyOptions(draft.defaultDifficulty)}</select>
                    </div>
                    <div class="q-card">
                      <label for="scenario-setting-run-size">כמה סצנות כברירת מחדל?</label>
                      <input type="range" id="scenario-setting-run-size" min="3" max="10" value="${escapeHtml(clampRunSize(draft.defaultRunSize))}" />
                      <span id="scenario-setting-run-size-value">${escapeHtml(clampRunSize(draft.defaultRunSize))}</span>
                    </div>
                  </div>
                </section>
                <section class="scenario-settings-card" data-kind="advanced">
                  <div class="scenario-home-section-head">
                    <div>
                      <p class="scenario-home-kicker">כלי עזר</p>
                      <h4>מה יישאר פתוח במהלך האימון</h4>
                    </div>
                  </div>
                  <div class="q-card scenario-toggle-row">
                    <label><input type="checkbox" id="scenario-setting-sound" ${draft.soundEnabled ? 'checked' : ''} /> צלילים במסך הסצנות</label>
                    <label><input type="checkbox" id="scenario-setting-prism" ${draft.prismWheelEnabled ? 'checked' : ''} /> גלגל פריזמות אחרי תשובה ירוקה</label>
                  </div>
                </section>
              </div>
              <div class="scenario-feedback-actions scenario-settings-actions">
                <button type="button" class="btn btn-secondary" data-trainer-action="close-settings">ביטול</button>
                <button type="button" class="btn btn-secondary" data-trainer-preset="compact">סשן קצר</button>
                <button type="button" class="btn btn-secondary" data-trainer-preset="standard">ברירת מחדל</button>
                <button type="button" class="btn btn-secondary" data-trainer-action="save-settings">שמור הגדרות</button>
                <button type="button" class="btn btn-primary" data-trainer-action="save-start">שמור והתחל סשן</button>
              </div>
            </div>
          </div>
        `;
    }

    function renderDomainOptions(currentValue) {
        const items = [{ id: 'all', label: 'כל התחומים' }, ...state.data.domains];
        return items.map((item) => `<option value="${escapeHtml(item.id)}" ${item.id === currentValue ? 'selected' : ''}>${escapeHtml(item.label)}</option>`).join('');
    }

    function renderDifficultyOptions(currentValue) {
        const items = [{ id: 'all', label: 'כל הרמות' }, ...state.data.difficulties];
        return items.map((item) => `<option value="${escapeHtml(item.id)}" ${item.id === currentValue ? 'selected' : ''}>${escapeHtml(item.label)}</option>`).join('');
    }

    function renderPrismWheel(prismItems, selectedPrism) {
        return `
          <div class="scenario-prism-wheel">
            <h4>גלגל פריזמות מהיר</h4>
            <div class="scenario-prism-items">
              ${prismItems.map((item) => `<button type="button" class="scenario-prism-item" data-scenario-action="pick-prism" data-prism-id="${escapeHtml(item.id)}">${escapeHtml(item.label || item.id)}</button>`).join('')}
            </div>
            ${selectedPrism ? `
              <div class="scenario-prism-detail">
                <p><strong>שאלת Meta:</strong> ${escapeHtml(selectedPrism.question || '')}</p>
                <p><strong>דוגמה:</strong> ${escapeHtml(selectedPrism.example || '')}</p>
              </div>
            ` : ''}
          </div>
        `;
    }

    function renderBlueprintScreen() {
        return renderFeedbackScreen(true);
    }

    function renderScoreScreen() {
        const entry = state.lastEntry;
        if (!entry || !state.session) return renderHomeScreen();
        const playedCount = state.session.index + 1;
        const starVisual = '⭐'.repeat(state.session.stars) + '☆'.repeat(Math.max(playedCount - state.session.stars, 0));
        const isLast = state.session.index >= state.session.queue.length - 1;
        return `
          <section class="scenario-workspace-card">
            <div class="scenario-stars-row">${escapeHtml(starVisual || '☆☆☆☆☆')}</div>
            <p class="scenario-score-line">סיימת סצנה ${escapeHtml(playedCount)}/${escapeHtml(state.session.queue.length)}. נקודות סשן: ${escapeHtml(state.session.score)}</p>
            <p class="scenario-next-green-line">בפעם הבאה: "${escapeHtml(entry.greenSentence)}"</p>
            ${(entry.goalGeneral || entry.successMetric) ? `
              <div class="scenario-result-summary">
                <p><strong>מטרה כללית:</strong> ${escapeHtml(entry.goalGeneral || 'לא הוגדר')}</p>
                <p><strong>מדד הצלחה:</strong> ${escapeHtml(entry.successMetric || 'לא הוגדר')}</p>
              </div>
            ` : ''}
            ${renderFlowGuide()}
            <p class="scenario-feedback-next-hint">${escapeHtml(getScenarioScoreNextHint(isLast))}</p>
            <div class="scenario-flow-actions">
              <div class="scenario-flow-actions-copy">
                <strong>${escapeHtml(isLast ? 'זה סוף הסשן הנוכחי' : 'מכאן ממשיכים או עוצרים מסודר')}</strong>
                <span>${escapeHtml(isLast
                    ? 'הכפתור הראשי יסגור את הסשן ויחזיר לבית. אם צריך לעצור עכשיו בלי לסגור את המסלול, אפשר לחזור לבית באופן ידני.'
                    : 'הכפתור הראשי ממשיך ישר לסצנה הבאה. הכפתור המשני מחזיר לבית אם רוצים לעצור כאן.')}</span>
              </div>
              <div class="scenario-feedback-actions scenario-feedback-actions--flow">
                <button type="button" class="btn btn-primary" data-scenario-action="next-scene">${isLast ? 'סיום סשן וחזרה לבית' : 'המשך לסצנה הבאה'}</button>
                <button type="button" class="btn btn-secondary" data-scenario-action="go-home">חזרה לבית הסצנות</button>
              </div>
            </div>
          </section>
        `;
    }

    function renderHistoryScreen() {
        const history = Array.isArray(state.progress.history) ? state.progress.history : [];
        return `
          <section class="scenario-workspace-card">
            <p class="scenario-panel-kicker">היסטוריה</p>
            <h3>היסטוריית סצנות</h3>
            <div class="scenario-feedback-actions">
              <button type="button" class="btn btn-secondary" data-scenario-action="export-history">ייצא JSON</button>
              <button type="button" class="btn btn-secondary" data-scenario-action="clear-history">נקה היסטוריה</button>
              <button type="button" class="btn btn-primary" data-scenario-action="go-home">חזרה</button>
            </div>
            <div class="scenario-history-list">
              ${history.length ? history.map((entry) => `
                <div class="scenario-history-item">
                  <strong>${escapeHtml(`${entry.title} (${entry.domain})`)}</strong>
                  <p class="meta">${escapeHtml(`${entry.score ? '✓ ירוק' : '✕ אדום'} | ${entry.selectedOptionText} | ${new Date(entry.timestamp).toLocaleString('he-IL')}`)}</p>
                </div>
              `).join('') : `<div class="scenario-history-empty">עדיין אין היסטוריה. סצנה ראשונה תתחיל את היומן.</div>`}
            </div>
          </section>
        `;
    }

    function renderHelpScreen() {
        return `
          <section class="scenario-overlay-card scenario-workspace-card">
            <p class="scenario-panel-kicker">עזרה</p>
            <h3>איך עובדים כאן?</h3>
            <ol class="scenario-help-list">
              <li>קוראים את הסצנה הקצרה ושומעים את המשפט הפותח.</li>
              <li>בוחרים תגובה אחת שהכי מקדמת קשר, בהירות וצעד בדיקה.</li>
              <li>רואים קודם איך זה נחת, ורק אחר כך פותחים את הניתוח העמוק.</li>
            </ol>
            <p class="scenario-help-note">המשימה כאן היא לא “להישמע טוב”, אלא לזהות איזו תגובה באמת מזיזה את השיחה מהמופשט אל מה שאפשר לבדוק.</p>
            <div class="scenario-feedback-actions">
              <button type="button" class="btn btn-primary" data-scenario-action="go-home">חזרה</button>
            </div>
          </section>
        `;
    }

    function handleClick(event) {
        const button = event.target.closest('button, [data-scenario-action]');
        if (!button) return;
        const trainerAction = button.getAttribute('data-trainer-action');
        const scenarioAction = button.getAttribute('data-scenario-action');
        const preset = button.getAttribute('data-trainer-preset');
        if (preset) {
            applyPreset(preset);
            return;
        }
        if (trainerAction === 'start-session') return void startSession(state.homeFilters);
        if (trainerAction === 'open-settings') return void openSettings();
        if (trainerAction === 'close-settings') return void closeSettings();
        if (trainerAction === 'save-settings') return void saveSettingsFromDraft(false);
        if (trainerAction === 'save-start') return void saveSettingsFromDraft(true);
        if (scenarioAction === 'open-help') return void openScreen(SCREEN_IDS.help);
        if (scenarioAction === 'open-history') return void openScreen(SCREEN_IDS.history);
        if (scenarioAction === 'pick-option') return void pickOption(button.getAttribute('data-option-id'));
        if (scenarioAction === 'show-blueprint') return void toggleBlueprintScreen();
        if (scenarioAction === 'continue-result') return void continueFromResult();
        if (scenarioAction === 'next-scene') return void continueToNextScene();
        if (scenarioAction === 'go-home') return void openScreen(SCREEN_IDS.home);
        if (scenarioAction === 'export-history') return void exportHistory();
        if (scenarioAction === 'clear-history') return void clearHistory();
        if (scenarioAction === 'pick-prism') {
            state.selectedPrismId = button.getAttribute('data-prism-id') || '';
            render();
            return;
        }
        if (scenarioAction === 'copy-green') {
            const text = getGreenOptionText(state.activeScenario);
            if (!text) return;
            navigator.clipboard?.writeText(text).then(() => showToast('המשפט הירוק הועתק')).catch(() => showToast('לא הצלחנו להעתיק.'));
            return;
        }
        if (scenarioAction === 'back-to-feedback') {
            return void openScreen(SCREEN_IDS.feedback, { scrollTarget: '[data-scenario-feedback-thread="1"]' });
        }
    }

    function handleChange(event) {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;
        if (target.id === 'scenario-domain-select') updateHomeFilter('domain', target.value);
        if (target.id === 'scenario-difficulty-select') updateHomeFilter('difficulty', target.value);
        if (target.id === 'scenario-run-size') updateHomeFilter('runSize', target.value);
        if (target.id === 'scenario-setting-domain') updateDraft('defaultDomain', target.value);
        if (target.id === 'scenario-setting-difficulty') updateDraft('defaultDifficulty', target.value);
        if (target.id === 'scenario-setting-run-size') updateDraft('defaultRunSize', target.value);
        if (target.id === 'scenario-setting-sound') updateDraft('soundEnabled', target.checked);
        if (target.id === 'scenario-setting-prism') updateDraft('prismWheelEnabled', target.checked);
    }

    function handleInput(event) {
        handleChange(event);
    }
})();
