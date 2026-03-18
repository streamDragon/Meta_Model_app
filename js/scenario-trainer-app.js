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
    const OPTION_IDS = Object.freeze(['A', 'B', 'C', 'D']);
    const STORY_FRAME_LABELS = Object.freeze({
        setup: 'פתיחה',
        trigger: 'רגע מפעיל',
        'under-surface': 'מתחת לפני השטח',
        response: 'כיוון תגובה'
    });
    const FEATURED_SCENARIO_IDS = Object.freeze(['driver-update', 'couple-shutdown', 'boss-feedback']);
    const DIALOGUE_MAX_TURNS = 3;
    const SCREEN_HISTORY_LIMIT = 16;
    const FEATURE_START_LABEL = 'פתיחה';
    const RETURN_TO_FEATURE_START_LABEL = 'חזרה לפתיחה';
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
        activeStorySlideId: '',
        selectedScenarioId: '',
        conversationTrail: [],
        selectedOption: null,
        lastEntry: null,
        selectedPrismId: '',
        screenHistory: [],
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
    registerStandaloneController();

    init().catch((error) => {
        state.loading = false;
        state.loadError = error?.message || 'שגיאה לא מזוהה';
        render();
    });

    async function init() {
        render();
        state.data = await loadData();
        syncSelectedScenarioId();
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

    function escapeRegExp(value) {
        return String(value == null ? '' : value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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

    function buildDefaultStorySlides(rawScenario, responseSet, metaModelCore) {
        const greenLine = normalizeText(responseSet?.green?.speakerLine || rawScenario?.greenSentence, '');
        return [
            {
                id: 'setup',
                frame: 'setup',
                label: STORY_FRAME_LABELS.setup,
                title: normalizeText(rawScenario?.sceneTitle || rawScenario?.title, 'פתיחה'),
                image: normalizeText(rawScenario?.coverImage || rawScenario?.sceneArt, ''),
                caption: normalizeText(rawScenario?.contextIntro, ''),
                quote: ''
            },
            {
                id: 'trigger',
                frame: 'trigger',
                label: STORY_FRAME_LABELS.trigger,
                title: 'מה נאמר ברגע הזה',
                image: normalizeText(rawScenario?.sceneArt || rawScenario?.coverImage, ''),
                caption: normalizeText(rawScenario?.surfaceConflict || rawScenario?.openingLine, ''),
                quote: normalizeText(rawScenario?.openingLine, '')
            },
            {
                id: 'under-surface',
                frame: 'under-surface',
                label: STORY_FRAME_LABELS['under-surface'],
                title: 'מה יושב מתחת לפני השטח',
                image: normalizeText(rawScenario?.sceneArt || rawScenario?.coverImage, ''),
                caption: normalizeText(rawScenario?.humanNeed || metaModelCore?.hiddenGap, ''),
                quote: normalizeText(metaModelCore?.hiddenGap, '')
            },
            {
                id: 'response',
                frame: 'response',
                label: STORY_FRAME_LABELS.response,
                title: 'לאן כדאי לכוון את התגובה',
                image: normalizeText(rawScenario?.sceneArt || rawScenario?.coverImage, ''),
                caption: normalizeText(rawScenario?.deepeningQuestion || rawScenario?.supportPrompt, ''),
                quote: greenLine
            }
        ];
    }

    function normalizeStorySlides(rawScenario, responseSet, metaModelCore) {
        const rawSlides = Array.isArray(rawScenario?.storySlides) && rawScenario.storySlides.length
            ? rawScenario.storySlides
            : buildDefaultStorySlides(rawScenario, responseSet, metaModelCore);
        const normalized = rawSlides.map((slide, index) => {
            const frame = normalizeText(slide?.frame || slide?.id, ['setup', 'trigger', 'under-surface', 'response'][index] || `frame-${index + 1}`);
            const id = normalizeText(slide?.id, frame);
            return {
                id,
                frame,
                label: normalizeText(slide?.label, STORY_FRAME_LABELS[frame] || `שלב ${index + 1}`),
                title: normalizeText(slide?.title, normalizeText(rawScenario?.sceneTitle || rawScenario?.title, `שלב ${index + 1}`)),
                image: normalizeText(slide?.image, ''),
                caption: normalizeText(slide?.caption, ''),
                quote: normalizeText(slide?.quote, '')
            };
        }).filter((slide) => slide.id);
        return normalized.length ? normalized : buildDefaultStorySlides(rawScenario, responseSet, metaModelCore);
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
        const coverImage = normalizeText(rawScenario?.coverImage || rawScenario?.sceneArt, '');
        const sceneArt = normalizeText(rawScenario?.sceneArt || rawScenario?.coverImage, '');
        const storySlides = normalizeStorySlides({ ...rawScenario, coverImage, sceneArt }, responseSet, metaModelCore);
        return {
            ...rawScenario,
            scenarioId: normalizeText(rawScenario?.scenarioId || rawScenario?.id, `scenario_${index + 1}`),
            slug: normalizeText(rawScenario?.slug || rawScenario?.scenarioId || rawScenario?.id, `scenario_${index + 1}`),
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
            coverImage,
            sceneArt,
            storySlides,
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

    function getScenarioMenuScenarios() {
        const featured = state.data.scenarios.filter((scenario) => FEATURED_SCENARIO_IDS.includes(scenario.scenarioId));
        return featured.length ? featured : state.data.scenarios.slice(0, 3);
    }

    function syncSelectedScenarioId() {
        const scenarios = getScenarioMenuScenarios();
        if (!scenarios.length) {
            state.selectedScenarioId = '';
            return;
        }
        const exists = scenarios.some((scenario) => scenario.scenarioId === state.selectedScenarioId);
        if (!exists) state.selectedScenarioId = scenarios[0].scenarioId;
    }

    function getSelectedScenarioFromMenu() {
        syncSelectedScenarioId();
        return getScenarioMenuScenarios().find((scenario) => scenario.scenarioId === state.selectedScenarioId) || null;
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

    function createSessionQueue(domain, difficulty, runSize, scenarioId = '') {
        const availableScenarios = getScenarioMenuScenarios();
        if (scenarioId) {
            const selectedScenario = availableScenarios.find((scenario) => scenario.scenarioId === scenarioId);
            return selectedScenario ? [selectedScenario] : [];
        }
        const queue = availableScenarios.filter((scenario) => {
            const domainMatch = domain === 'all' || scenario.domain === domain;
            const difficultyMatch = difficulty === 'all' || scenario.difficulty === difficulty;
            return domainMatch && difficultyMatch;
        });
        return queue.slice().sort(() => Math.random() - 0.5).slice(0, clampRunSize(runSize));
    }

    function pushScreenHistory(nextScreenId, currentScreenId) {
        const next = normalizeText(nextScreenId, '');
        const current = normalizeText(currentScreenId, '');
        if (!current || !next || current === next) return;

        const stack = Array.isArray(state.screenHistory) ? state.screenHistory.slice() : [];
        if (stack[stack.length - 1] !== current) {
            stack.push(current);
        }
        state.screenHistory = stack.slice(-SCREEN_HISTORY_LIMIT);
    }

    function popPreviousScreen(currentScreenId = state.screen) {
        const current = normalizeText(currentScreenId, '');
        const stack = Array.isArray(state.screenHistory) ? state.screenHistory.slice() : [];
        let previous = '';

        while (stack.length) {
            const candidate = normalizeText(stack.pop(), '');
            if (!candidate || candidate === current) continue;
            previous = candidate;
            break;
        }

        state.screenHistory = stack;
        return previous;
    }

    function openScreen(screenId, options = {}) {
        const nextScreenId = normalizeText(screenId, SCREEN_IDS.home);
        const currentScreenId = normalizeText(state.screen, SCREEN_IDS.home);
        if (options.clearHistory === true) {
            state.screenHistory = [];
        } else if (options.trackHistory !== false && nextScreenId !== currentScreenId) {
            pushScreenHistory(nextScreenId, currentScreenId);
        }

        state.screen = nextScreenId;
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

    function goFeatureStart() {
        openScreen(SCREEN_IDS.home, {
            clearHistory: true,
            trackHistory: false
        });
    }

    function goBackScreen() {
        if (state.settingsOpen) {
            closeSettings();
            return true;
        }

        const previousScreen = popPreviousScreen();
        if (previousScreen) {
            openScreen(previousScreen, {
                trackHistory: false,
                preserveScroll: true
            });
            return true;
        }

        if (state.screen !== SCREEN_IDS.home) {
            goFeatureStart();
            return true;
        }

        return false;
    }

    function canRestartCurrentFlow() {
        if (state.settingsOpen) return false;
        if (!state.activeScenario || !state.session) return false;
        return state.screen !== SCREEN_IDS.home;
    }

    function restartCurrentFlow() {
        if (!canRestartCurrentFlow()) return false;
        restartCurrentScene();
        return true;
    }

    function registerStandaloneController() {
        root.__metaFeatureControllers = root.__metaFeatureControllers || {};
        root.__metaFeatureControllers['scenario-trainer'] = {
            stepBack() {
                return goBackScreen();
            },
            restart() {
                return restartCurrentFlow();
            },
            canRestart() {
                return canRestartCurrentFlow();
            }
        };
    }

    function startSession(config) {
        const next = config || state.homeFilters;
        const scenarioId = normalizeText(next?.scenarioId || state.selectedScenarioId, '');
        const queue = createSessionQueue(next.domain, next.difficulty, next.runSize, scenarioId);
        if (!queue.length) {
            showToast('לא נמצאו סצנות למסנן שבחרת.');
            return;
        }
        state.settings.defaultDomain = next.domain;
        state.settings.defaultDifficulty = next.difficulty;
        state.settings.defaultRunSize = clampRunSize(next.runSize);
        saveSettings();
        state.homeFilters = { ...next, runSize: clampRunSize(next.runSize) };
        state.selectedScenarioId = scenarioId || queue[0]?.scenarioId || '';
        state.session = {
            domain: next.domain,
            difficulty: next.difficulty,
            scenarioId: state.selectedScenarioId,
            queue,
            index: 0,
            score: 0,
            stars: 0,
            streak: 0,
            completed: []
        };
        state.activeScenario = queue[0];
        state.activeStorySlideId = normalizeText(queue[0]?.storySlides?.[0]?.id, 'setup');
        state.conversationTrail = [];
        state.selectedOption = null;
        state.lastEntry = null;
        state.selectedPrismId = '';
        state.screenHistory = [];
        openScreen(SCREEN_IDS.play);
    }

    function toneLabel(option, isGreen) {
        const tone = normalizeText(option?.tone, isGreen ? 'default_green' : 'default_red');
        return TONE_LABELS[tone] || (isGreen ? TONE_LABELS.default_green : TONE_LABELS.default_red);
    }

    function getGreenOptionText(scenario) {
        return normalizeText(scenario?.responseSet?.green?.speakerLine || scenario?.greenSentence, '');
    }

    function getScenarioPlayOptions(scenario) {
        return Array.isArray(scenario?.responseSet?.red)
            ? [...scenario.responseSet.red, scenario.responseSet.green].filter(Boolean).slice(0, 5)
            : [];
    }

    function getScenarioStorySlides(scenario) {
        return Array.isArray(scenario?.storySlides) ? scenario.storySlides.filter(Boolean) : [];
    }

    function getActiveStorySlide(scenario) {
        const slides = getScenarioStorySlides(scenario);
        return slides.find((slide) => slide.id === state.activeStorySlideId) || slides[0] || null;
    }

    function getResponseStorySlide(scenario) {
        const slides = getScenarioStorySlides(scenario);
        return slides.find((slide) => normalizeText(slide?.frame || slide?.id, '') === 'response')
            || slides.find((slide) => normalizeText(slide?.id, '') === 'response')
            || slides[slides.length - 1]
            || null;
    }

    function setActiveStorySlide(slideId) {
        const nextId = normalizeText(slideId, '');
        if (!nextId || state.activeStorySlideId === nextId) return;
        state.activeStorySlideId = nextId;
        render();
    }

    function getScenarioSpeechLine(scenario) {
        const rawLine = normalizeText(scenario?.openingLine, '');
        const speaker = normalizeText(scenario?.role?.other, '');
        if (!rawLine || !speaker) return rawLine;
        const speakerPattern = new RegExp(`^${escapeRegExp(speaker)}\\s+אומר(?:ת)?\\s*:\\s*`, 'u');
        return normalizeText(rawLine.replace(speakerPattern, ''), rawLine);
    }

    function trimText(value, maxLength) {
        const text = normalizeText(value, '');
        if (!text || text.length <= maxLength) return text;
        return `${text.slice(0, Math.max(0, maxLength - 1)).trim()}…`;
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

    function buildTherapeuticCaution(option, isGreen, toneGroup) {
        if (isGreen) {
            return 'גם תגובה טובה לא מחליפה בדיקה. לא למהר לפתור או להסכים עם הכול לפני שהחוויה והעובדות התבהרו.';
        }
        if (toneGroup === 'blame') {
            return 'אשמה או ביקורת לרוב מחזקות הגנה ובושה, ולכן מקטינות את הסיכוי לקבל מידע אמיתי.';
        }
        if (toneGroup === 'shutdown') {
            return 'סגירה או קיפאון נשמעים לפעמים כמו ויסות, אבל בפועל הם משאירים את האדם לבד מול העמימות.';
        }
        if (toneGroup === 'control') {
            return 'כשמנסים לשלוט מהר מדי, השיחה נעה לציות או מאבק במקום לבירור משותף.';
        }
        if (toneGroup === 'rescue') {
            return 'הצלה מהירה יכולה להרגיע רגעית, אבל לעיתים משאירה את האדם בלי בעלות על הבדיקה והצעד הבא.';
        }
        if (toneGroup === 'dismiss') {
            return 'הרגעה כללית בלי פירוק קונקרטי עלולה להישמע מנחמת, אבל להשאיר את הבעיה בלי שם ובלי דרך.';
        }
        return 'כדאי להיזהר מכל תגובה שמדלגת מעל החוויה, מפרשת מוקדם מדי, או לא מחזירה את השיחה למה שבאמת קורה.';
    }

    function renderTherapeuticGuideCard(scenario, option, guide, isGreen) {
        const toneGroup = getOptionToneGroup(option?.tone, isGreen);
        const followUpQuestion = getMetaModelRepairQuestion(scenario, option);
        const followUpWhy = getMetaModelRepairBenefit(scenario, option);
        return `
          <section class="product-coach-card" data-scenario-therapeutic-guide="1">
            <div class="product-coach-card__head">
              <span class="product-coach-card__kicker">מדריך עבודה טיפולי</span>
              <h4>${escapeHtml(isGreen ? 'מה לזהות ולשמר כאן' : 'מה לזהות ולתקן כאן')}</h4>
              <p>${escapeHtml(guide.learningTakeaway)}</p>
            </div>
            <div class="product-coach-card__grid">
              <div class="product-coach-card__item">
                <strong>הדפוס שזוהה</strong>
                <p>${escapeHtml(toneLabel(option, isGreen))}</p>
              </div>
              <div class="product-coach-card__item">
                <strong>למה זה חשוב</strong>
                <p>${escapeHtml(followUpWhy || guide.processImpact)}</p>
              </div>
              <div class="product-coach-card__item">
                <strong>שאלת המשך מומלצת</strong>
                <p>${escapeHtml(followUpQuestion)}</p>
              </div>
              <div class="product-coach-card__item" data-tone="caution">
                <strong>זהירות טיפולית</strong>
                <p>${escapeHtml(buildTherapeuticCaution(option, isGreen, toneGroup))}</p>
              </div>
              <div class="product-coach-card__item" data-tone="next">
                <strong>הצעד הבא</strong>
                <p>${escapeHtml(guide.nextMove)}</p>
              </div>
            </div>
          </section>
        `;
    }

    function setSelectedScenario(scenarioId) {
        const nextId = normalizeText(scenarioId, '');
        if (!nextId) return;
        state.selectedScenarioId = nextId;
        render();
    }

    function startSelectedScenario() {
        syncSelectedScenarioId();
        if (!state.selectedScenarioId) {
            showToast('בחר/י סיטואציה כדי להתחיל.');
            return;
        }
        startSession({
            ...state.homeFilters,
            scenarioId: state.selectedScenarioId,
            runSize: 1
        });
    }

    function getConversationTrail() {
        return Array.isArray(state.conversationTrail) ? state.conversationTrail : [];
    }

    function getConversationStepCount() {
        return getConversationTrail().length;
    }

    function isConversationComplete() {
        return getConversationStepCount() >= DIALOGUE_MAX_TURNS;
    }

    function getProgressStorySlideForTurn(scenario, turnCount) {
        const slides = getScenarioStorySlides(scenario);
        if (!slides.length) return null;
        return slides[Math.min(turnCount, slides.length - 1)] || slides[0];
    }

    function buildGreenContinuation(scenario, turnIndex) {
        if (turnIndex === 1) {
            return {
                playerLine: `בוא/י נעצור רגע על הדבר המדויק: ${normalizeText(scenario?.deepeningQuestion, 'מה בדיוק קורה כאן בפועל?')}`,
                otherReply: `מה שהכי חסר לי כרגע זה ${normalizeText(scenario?.metaModelCore?.hiddenGap, 'שעדיין לא ברור לי מה השלב הבא')}.`
            };
        }
        return {
            playerLine: `אז נתקדם רק עם צעד אחד: ${normalizeText(scenario?.microPlan?.firstStep, 'בוא/י נתחיל מצעד קטן וברור.')}`,
            otherReply: `ככה זה כבר מרגיש יותר אפשרי. ${normalizeText(scenario?.microPlan?.successSign, 'עכשיו כבר רואים איך אפשר להתקדם.')}`
        };
    }

    function buildRedContinuation(toneGroup, turnIndex) {
        const variants = {
            blame: {
                secondPlayer: 'אבל גם אתה/את חלק גדול ממה שתקוע כאן.',
                secondOther: 'ככה אני כבר לא מצליח/ה להסביר מה באמת קורה לי.',
                thirdPlayer: 'אם היית מתנהל/ת אחרת לא היינו מגיעים לזה בכלל.',
                thirdOther: 'עכשיו זה כבר הפך להאשמה, לא לשיחה.'
            },
            control: {
                secondPlayer: 'פשוט תעשה/י את זה עכשיו ודי עם כל זה.',
                secondOther: 'כשזה נשמע ככה אני רק נלחץ/ת יותר ולא מבין/ה מה לעשות.',
                thirdPlayer: 'אין זמן להסברים, פשוט תגמור/י עם זה.',
                thirdOther: 'אז שוב נשארתי בלי הבנה ובלי דרך להתחיל.'
            },
            rescue: {
                secondPlayer: 'עזוב/י, אני כבר אטפל בזה בעצמי.',
                secondOther: 'בסדר... אז אני כבר לא באמת חלק מהפתרון.',
                thirdPlayer: 'עדיף שאני אעשה את זה לבד מאשר להיתקע כאן.',
                thirdOther: 'ככה נשארתי בחוץ, וגם לא למדתי מה לעשות בפעם הבאה.'
            },
            shutdown: {
                secondPlayer: 'אין לי כוח לזה עכשיו, די.',
                secondOther: 'אוקיי, אז גם לי אין איפה להמשיך מכאן.',
                thirdPlayer: 'בוא/י נסגור את זה כאן.',
                thirdOther: 'אז נשארנו בדיוק באותו מקום, רק יותר רחוקים.'
            },
            dismiss: {
                secondPlayer: 'זה לא כזה סיפור, באמת לא צריך להיכנס לזה.',
                secondOther: 'אבל אצלי זה כן נשאר חשוב ולא פתור.',
                thirdPlayer: 'נו באמת, נעבור הלאה.',
                thirdOther: 'אז זה נשאר בלי שם ובלי פתרון.'
            },
            blur: {
                secondPlayer: 'נראה כבר אחר כך, עכשיו לא.',
                secondOther: 'ככה שוב לא ברור מה באמת חסר כאן.',
                thirdPlayer: 'נדבר בהמשך, אין לי מה להוסיף.',
                thirdOther: 'שוב דחינו את זה, וזה רק נהיה יותר כבד.'
            }
        };
        const variant = variants[toneGroup] || variants.blur;
        if (turnIndex === 1) {
            return {
                playerLine: variant.secondPlayer,
                otherReply: variant.secondOther
            };
        }
        return {
            playerLine: variant.thirdPlayer,
            otherReply: variant.thirdOther
        };
    }

    function buildConversationTurn(scenario, option, turnIndex) {
        const isGreen = Number(option?.score) === 1;
        if (turnIndex === 0) {
            return {
                id: `${option.id}-turn-1`,
                turnIndex,
                optionId: option.id,
                option,
                isGreen,
                label: getReactionButtonLabel(option),
                playerLine: normalizeText(option?.speakerLine, ''),
                otherReply: normalizeText(option?.likelyOtherReply, '')
            };
        }
        const toneGroup = getOptionToneGroup(option?.tone, isGreen);
        const continuation = isGreen
            ? buildGreenContinuation(scenario, turnIndex)
            : buildRedContinuation(toneGroup, turnIndex);
        return {
            id: `${option.id}-turn-${turnIndex + 1}`,
            turnIndex,
            optionId: option.id,
            option,
            isGreen,
            label: getReactionButtonLabel(option),
            playerLine: normalizeText(continuation?.playerLine, option?.speakerLine || ''),
            otherReply: normalizeText(continuation?.otherReply, option?.likelyOtherReply || '')
        };
    }

    function getConversationOutcome(scenario = state.activeScenario) {
        const trail = getConversationTrail();
        const greenCount = trail.filter((turn) => turn.isGreen).length;
        const complete = trail.length >= DIALOGUE_MAX_TURNS;
        if (!trail.length) {
            return {
                status: 'idle',
                headline: 'המסלול עוד פתוח',
                summary: 'בחר/י תגובה רגשית מתחת למסך כדי לראות איך השיחה זזה.',
                score: 0,
                stars: 0
            };
        }
        if (!complete) {
            return {
                status: 'building',
                headline: `מהלך ${trail.length} מתוך ${DIALOGUE_MAX_TURNS}`,
                summary: trail[trail.length - 1]?.isGreen
                    ? 'נפתח כאן חלון קטן של בהירות. אפשר לבחור אם להמשיך לבנות אותו או לסגור אותו.'
                    : 'המסלול מתחיל להיסגר, אבל אפשר עדיין לשנות כיוון במהלך הבא.',
                score: 0,
                stars: 0
            };
        }
        if (greenCount >= 2) {
            return {
                status: 'resolved',
                headline: 'הסיטואציה מתחילה להיפתח',
                summary: normalizeText(scenario?.microPlan?.successSign, 'בסוף המסלול כבר רואים צעד קטן שאפשר להחזיק בבטחה.'),
                score: 1,
                stars: 1
            };
        }
        if (greenCount === 1) {
            return {
                status: 'mixed',
                headline: 'המסלול נשאר מעורבב',
                summary: 'היו כאן גם רגעים שפתחו וגם רגעים שסגרו. צריך עוד דיוק כדי שלא להחליק חזרה ללחץ.',
                score: 0,
                stars: 0
            };
        }
        return {
            status: 'closed',
            headline: 'הסיטואציה נסגרת ומתקשחת',
            summary: normalizeText(scenario?.metaModelCore?.hiddenGap, 'מה שחסר נשאר בלי שם, ולכן גם בלי דרך להתקדם.'),
            score: 0,
            stars: 0
        };
    }

    function openInvestigationScreen() {
        if (!state.activeScenario || !getConversationTrail().length) {
            showToast('בחר/י לפחות תגובה אחת לפני שנכנסים לחקירה.');
            return;
        }
        openScreen(SCREEN_IDS.feedback);
    }

    function getMetaModelRepairQuestion(scenario, option) {
        const isGreen = Number(option?.score) === 1;
        const toneGroup = getOptionToneGroup(option?.tone, isGreen);
        if (toneGroup === 'blame') return 'מה בדיוק קרה או נאמר כאן בפועל, לפני שזה נהיה ויכוח על מי אשם?';
        if (toneGroup === 'control') return 'מה בדיוק חסר כרגע כדי שאפשר יהיה לעשות רק צעד אחד, בלי להילחץ מכל התמונה?';
        if (toneGroup === 'rescue') return 'מה האדם שמולי כן יכול לעשות בעצמו, אם נפרק את זה לצעד ראשון קטן?';
        if (toneGroup === 'shutdown') return 'מה הכי קשה כאן כרגע, ומה צריך כדי שאפשר יהיה להישאר עוד רגע בשיחה בלי להיסגר?';
        if (toneGroup === 'dismiss' || toneGroup === 'blur') return 'מה בדיוק עדיין מעורפל או לא ברור כאן כרגע, במקום רק להרגיע את הרגע?';
        return normalizeText(scenario?.deepeningQuestion, 'מה בדיוק קורה כאן בפועל?');
    }

    function getMetaModelRepairBenefit(scenario, option) {
        const isGreen = Number(option?.score) === 1;
        const toneGroup = getOptionToneGroup(option?.tone, isGreen);
        if (toneGroup === 'blame') return 'היתרון הרגשי: השאלה מחזירה את השיחה מאשמה לבירור, ולכן מורידה התגוננות.';
        if (toneGroup === 'control') return 'היתרון הרגשי: במקום לחץ כללי, השאלה יוצרת תחושת אפשרות וצעד ראשון שאפשר להחזיק.';
        if (toneGroup === 'rescue') return 'היתרון הרגשי: השאלה משאירה את האדם השני בפנים, לא רק מרגיעה אותו מבחוץ.';
        if (toneGroup === 'shutdown') return 'היתרון הרגשי: השאלה מאפשרת להישאר בקשר בלי להציף, ולכן פותחת מקום לנשימה.';
        if (toneGroup === 'dismiss' || toneGroup === 'blur') return 'היתרון הרגשי: במקום טשטוש, השאלה נותנת שם למה שחסר וכך מפחיתה חוסר אונים.';
        return `היתרון הרגשי: שאלת מטה־מודל טובה פותחת בהירות ומחזירה את השיחה למה שאפשר לזהות, לשחזר ולבדוק. ${normalizeText(scenario?.metaModelCore?.hiddenGap, '')}`;
    }

    function getMetaModelRepairReply(option) {
        const isGreen = Number(option?.score) === 1;
        const toneGroup = getOptionToneGroup(option?.tone, isGreen);
        if (toneGroup === 'blame') return 'כששואלים אותי ככה, יותר קל לי להסביר מה באמת קרה ולא רק להתגונן.';
        if (toneGroup === 'control') return 'ככה אני מצליח/ה לראות צעד אחד, במקום להילחץ מכל מה שפתוח.';
        if (toneGroup === 'rescue') return 'זה עוזר לי להישאר חלק מהפתרון, ולא רק שמישהו אחר יציל את המצב.';
        if (toneGroup === 'shutdown') return 'השאלה הזאת מרגיעה אותי כי היא לא דוחפת, אבל גם לא נעלמת מהבעיה.';
        if (toneGroup === 'dismiss' || toneGroup === 'blur') return 'עכשיו זה כבר נשמע יותר ברור, ואני יכול/ה להגיד מה באמת חסר לי כאן.';
        return 'השאלה הזאת עוזרת לי לדייק מה חסר, ולא להישאר רק בתוך התגובה הרגשית.';
    }

    function buildMetaModelRepairTurn(scenario, sourceOption, turnIndex) {
        const question = getMetaModelRepairQuestion(scenario, sourceOption);
        const reply = getMetaModelRepairReply(sourceOption);
        return {
            id: `MM-${turnIndex + 1}`,
            turnIndex,
            optionId: `MM-${turnIndex + 1}`,
            option: {
                id: `MM-${turnIndex + 1}`,
                tone: 'meta_model_question',
                speakerLine: question,
                likelyOtherReply: reply,
                whyItWorks: getMetaModelRepairBenefit(scenario, sourceOption),
                score: 1
            },
            isGreen: true,
            label: 'מטה־מודל',
            playerLine: question,
            otherReply: reply
        };
    }

    function addMetaModelTurn() {
        const scenario = state.activeScenario;
        const trail = getConversationTrail();
        if (!scenario || !trail.length) {
            showToast('בחר/י קודם תגובה אחת, ואז אפשר להזרים פנימה שאלת מטה־מודל.');
            return;
        }
        if (isConversationComplete()) {
            showToast('המסלול הושלם. אפשר להיכנס לחקירה או לחזור בזמן.');
            return;
        }
        const sourceOption = trail[trail.length - 1]?.option || state.selectedOption || scenario.responseSet.green;
        const turn = buildMetaModelRepairTurn(scenario, sourceOption, getConversationStepCount());
        state.conversationTrail = [...trail, turn];
        state.selectedOption = turn.option;
        state.selectedPrismId = '';
        const responseSlide = getProgressStorySlideForTurn(scenario, getConversationStepCount());
        if (responseSlide?.id) state.activeStorySlideId = responseSlide.id;
        render();
        const lastBubble = mount.querySelector('.scenario-chat-thread .scenario-bubble:last-child');
        if (lastBubble && typeof lastBubble.scrollIntoView === 'function') {
            lastBubble.scrollIntoView({ block: 'end', behavior: 'smooth' });
        }
    }

    function pickOption(optionId) {
        const scenario = state.activeScenario;
        if (!scenario) return;
        if (isConversationComplete()) {
            showToast('המסלול הזה כבר הושלם. אפשר לחזור בזמן או לעבור לחקירה.');
            return;
        }
        const allOptions = [...scenario.responseSet.red, scenario.responseSet.green];
        const option = allOptions.find((item) => item.id === optionId);
        if (!option) return;
        const nextTurn = buildConversationTurn(scenario, option, getConversationStepCount());
        state.conversationTrail = [...getConversationTrail(), nextTurn];
        state.selectedOption = option;
        state.selectedPrismId = '';
        const responseSlide = getProgressStorySlideForTurn(scenario, getConversationStepCount());
        if (responseSlide?.id) state.activeStorySlideId = responseSlide.id;
        render();
        const lastBubble = mount.querySelector('.scenario-chat-thread .scenario-bubble:last-child');
        if (lastBubble && typeof lastBubble.scrollIntoView === 'function') {
            lastBubble.scrollIntoView({ block: 'end', behavior: 'smooth' });
        }
    }

    function restartCurrentScene() {
        if (!state.activeScenario) return;
        state.conversationTrail = [];
        state.selectedOption = null;
        state.lastEntry = null;
        state.selectedPrismId = '';
        state.activeStorySlideId = normalizeText(state.activeScenario?.storySlides?.[0]?.id, 'setup');
        openScreen(SCREEN_IDS.play, { trackHistory: false });
    }

    function buildHistoryEntry() {
        const scenario = state.activeScenario;
        const option = state.selectedOption;
        if (!scenario || !option) return null;
        const trail = getConversationTrail();
        const outcome = getConversationOutcome(scenario);
        const isGreen = Number(option.score) === 1;
        return {
            timestamp: new Date().toISOString(),
            scenarioId: scenario.scenarioId,
            domain: scenario.domainLabel || scenario.domain,
            difficulty: scenario.difficulty,
            title: scenario.title,
            selectedOptionId: trail.map((turn) => turn.optionId).join('>'),
            selectedOptionText: trail.map((turn) => turn.label).join(' → '),
            feedback: outcome.summary || buildLearningTakeaway(scenario, option, isGreen, getOptionToneGroup(option?.tone, isGreen)),
            score: outcome.score,
            stars: outcome.stars,
            greenSentence: getGreenOptionText(scenario),
            goalGeneral: normalizeText(scenario.greenBlueprint?.goal, ''),
            successMetric: normalizeText(scenario.greenBlueprint?.doneDefinition || scenario.microPlan?.successSign, '')
        };
    }

    function commitCurrentResult() {
        if (!state.session || !state.selectedOption || state.lastEntry || !isConversationComplete()) return state.lastEntry;
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
        if (!isConversationComplete()) {
            showToast(`כדי לראות לאן הסיטואציה הולכת צריך להשלים ${DIALOGUE_MAX_TURNS} מהלכים.`);
            return;
        }
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
            state.conversationTrail = [];
            state.lastEntry = null;
            state.selectedOption = null;
            state.activeScenario = null;
            state.activeStorySlideId = '';
            goFeatureStart();
            return;
        }
        const isLast = state.session.index >= state.session.queue.length - 1;
        if (isLast) {
            state.session = null;
            state.activeScenario = null;
            state.activeStorySlideId = '';
            state.conversationTrail = [];
            state.selectedOption = null;
            state.lastEntry = null;
            showToast('הסשן הסתיים. אפשר להתחיל סשן חדש.');
            goFeatureStart();
            return;
        }
        state.session.index += 1;
        state.activeScenario = state.session.queue[state.session.index];
        state.activeStorySlideId = normalizeText(state.activeScenario?.storySlides?.[0]?.id, 'setup');
        state.conversationTrail = [];
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
            startSession({ ...state.homeFilters, scenarioId: state.selectedScenarioId });
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

    function getHomePreviewScenario(config) {
        const resolved = config || state.homeFilters;
        const scenarios = Array.isArray(state.data?.scenarios) ? state.data.scenarios : [];
        return scenarios.find((scenario) => {
            const domainMatch = resolved.domain === 'all' || scenario.domain === resolved.domain;
            const difficultyMatch = resolved.difficulty === 'all' || scenario.difficulty === resolved.difficulty;
            return domainMatch && difficultyMatch;
        }) || scenarios[0] || null;
    }

    function getScenarioHomeToolRows(draft) {
        const resolved = draft || getSettingsDraft();
        return [
            resolved.prismWheelEnabled
                ? 'גלגל פריזמות ייפתח אחרי תשובה ירוקה כדי להציע שאלת Meta והמחשה מהירה מתוך הסצנה.'
                : 'גלגל פריזמות כבוי כרגע, כדי להשאיר את הסשן ממוקד רק בדיאלוג ובמשוב הראשוני.',
            resolved.soundEnabled
                ? 'צלילים קצרים נשארים פעילים במסך הסצנות ונותנים סימון עדין למעבר בין שלבים.'
                : 'הצלילים כבויים כרגע, אם מעדיפים סשן שקט יותר או אימון ללא גירויים נוספים.'
        ];
    }

    /* renderHomePreviewCards, renderHomeClarityCards — removed: replaced by integrated home sections */

    function getScenarioScoreNextHint(isLast) {
        return isLast
            ? 'להמשך: אפשר לפתוח סשן חדש, או לעבור לגשר תחושה-שפה אם צריך לדייק את המשפט לפני שיחה אמיתית.'
            : 'להמשך: אם המשפט הירוק כבר יושב, המשיכו לסצנה הבאה. אם עדיין יש עמימות, פתחו שוב את הפירוק לפני שממשיכים.';
    }

    function getMobileOrderAttr() {
        return getMobileZoneOrder().join(',');
    }

    function getCurrentFlowGuideMode() {
        if (state.screen === SCREEN_IDS.play) return 'play';
        if (state.screen === SCREEN_IDS.feedback || state.screen === SCREEN_IDS.blueprint) return 'feedback';
        if (state.screen === SCREEN_IDS.score) return 'score';
        return 'home';
    }

    function renderFlowGuideSteps() {
        const steps = Array.isArray(trainerContract.processSteps) ? trainerContract.processSteps : [];
        if (!steps.length) return '';
        return `
          <div class="scenario-flow-guide-steps" aria-label="רצף שלבי האימון">
            ${steps.map((step, index) => {
                const stateClass = processStepState(step.id);
                const className = ['scenario-flow-guide-step', stateClass].filter(Boolean).join(' ');
                return `<span class="${className}">${escapeHtml(step.shortLabel || step.label || String(index + 1))}</span>`;
            }).join('')}
          </div>
        `;
    }

    function renderSupportRail() {
        const flowMode = getCurrentFlowGuideMode();
        const scenario = state.activeScenario || state.session?.queue?.[state.session.index] || getHomePreviewScenario(state.homeFilters);
        const option = state.selectedOption;
        const isGreen = !!option && Number(option.score) === 1;
        const guide = scenario && option ? buildFeedbackGuide(scenario, option, isGreen) : null;
        const toolRows = getScenarioHomeToolRows();
        const isLast = !!state.session && state.session.index >= state.session.queue.length - 1;
        const summaryTitle = flowMode === 'play'
            ? 'מה לבדוק לפני שבוחרים תגובה'
            : flowMode === 'feedback'
                ? 'מה התגובה עשתה לשיחה'
                : flowMode === 'score'
                    ? 'איך לוקחים את זה לסצנה הבאה'
                    : 'איך נכנסים נכון לסשן';
        const summaryText = flowMode === 'play'
            ? escapeHtml(buildScenarioLearningFocus(scenario))
            : flowMode === 'feedback'
                ? escapeHtml(guide?.nextMove || 'כאן רואים קודם איך זה נחת, ואז פותחים את הניתוח המעמיק רק אם צריך.')
                : flowMode === 'score'
                    ? escapeHtml(getScenarioScoreNextHint(isLast))
                    : escapeHtml(getScenarioHomeEntryHint());
        const detailTitle = flowMode === 'feedback'
            ? 'לקחת מהמסך הזה'
            : flowMode === 'play'
                ? 'שאלת הדיוק של הסצנה'
                : flowMode === 'score'
                    ? 'המשפט הירוק הנוכחי'
                    : 'כלי העזר הפעילים';
        const detailBody = flowMode === 'feedback'
            ? `
              <ul class="scenario-support-list">
                <li>${escapeHtml(guide?.learningTakeaway || 'מזהים איפה השיחה נפתחה או נסגרה.')}</li>
                <li>${escapeHtml(guide?.metaModelExplanation || 'מחפשים מה נשאר עמום ואיך מחזירים אותו לבירור.')}</li>
              </ul>
            `
            : flowMode === 'play'
                ? `
                  <div class="scenario-support-quote">${escapeHtml(scenario?.deepeningQuestion || 'מה בדיוק קורה כאן בפועל?')}</div>
                  <p class="scenario-support-note">${escapeHtml(getDomainProcessFocus(scenario?.domain))}</p>
                `
                : flowMode === 'score'
                    ? `
                      <div class="scenario-support-quote">${escapeHtml(state.lastEntry?.greenSentence || getGreenOptionText(scenario) || 'המשפט הירוק יופיע כאן אחרי הסצנה.')}</div>
                      <p class="scenario-support-note">${escapeHtml(state.lastEntry?.feedback || 'זה המשפט שאפשר לקחת קדימה לשיחה אמיתית.')}</p>
                    `
                    : `
                      <ul class="scenario-support-list">
                        ${toolRows.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
                      </ul>
                    `;

        return `
          <section class="scenario-support-card" data-scenario-flow-guide="${escapeHtml(flowMode)}">
            <p class="scenario-panel-kicker">מצפן התהליך</p>
            <h4>${summaryTitle}</h4>
            ${renderFlowGuideSteps()}
            <p class="scenario-support-note">${summaryText}</p>
          </section>
          <section class="scenario-support-card">
            <p class="scenario-panel-kicker">פוקוס עכשיו</p>
            <h4>${detailTitle}</h4>
            ${detailBody}
          </section>
        `;
    }

    function syncScenarioChrome() {
        const startButtons = Array.from(mount.querySelectorAll('[data-scenario-action="go-home"]'));
        startButtons.forEach((button) => {
            if (!(button instanceof HTMLElement)) return;
            const inTopbar = !!button.closest('.scenario-play-topbar');
            const inSessionBar = !!button.closest('.scenario-session-bar');
            const inPrimaryActions = !!button.closest('.scenario-feedback-actions--primary');

            if (state.screen === SCREEN_IDS.help || state.screen === SCREEN_IDS.history) {
                if (!inSessionBar) {
                    button.setAttribute('data-scenario-action', 'go-back');
                    button.textContent = 'חזרה';
                }
                return;
            }

            if (inTopbar) {
                const icon = button.querySelector('.scenario-play-topbar-icon');
                const label = button.querySelector('span:last-child');
                if (icon) icon.textContent = '↩';
                if (label) label.textContent = FEATURE_START_LABEL;
                button.setAttribute('aria-label', 'חזרה לפתיחת הסימולטור');
                return;
            }

            if (inSessionBar || inPrimaryActions) {
                button.textContent = RETURN_TO_FEATURE_START_LABEL;
            }
        });
    }

    function render() {
        mount.innerHTML = renderAppV2();
        syncScenarioChrome();
    }

    function renderAppV2() {
        const isRuntimeScreen = state.screen === SCREEN_IDS.play || state.screen === SCREEN_IDS.feedback;
        return `
          <div id="scenario-trainer" class="scenario-platform-root" dir="rtl" lang="he" data-trainer-platform="1" data-trainer-id="scenario-trainer" data-screen="${state.screen}">
            ${isRuntimeScreen ? renderPlayTopBar() : ''}
            ${state.screen !== SCREEN_IDS.home && !isRuntimeScreen ? `
            <div class="scenario-session-bar" role="toolbar" aria-label="ניהול סשן">
              <span class="scenario-session-bar-info">
                ${state.session ? `סצנה ${escapeHtml(String(state.session.index + 1))}/${escapeHtml(String(state.session.queue.length))} · ${escapeHtml(String(state.session.score))} נק׳` : ''}
              </span>
              <button type="button" class="scenario-session-bar-end" data-scenario-action="go-home">חזרה לבית</button>
            </div>` : ''}
            <div class="scenario-standalone-shell ${isRuntimeScreen ? 'scenario-standalone-shell--play' : ''}">
              <main class="scenario-main-area scenario-standalone-main" data-trainer-zone="main">
                ${renderMain()}
              </main>
            </div>
            ${state.settingsOpen ? renderSettingsModal() : ''}
            ${state.toastMessage ? `<div class="scenario-toast">${escapeHtml(state.toastMessage)}</div>` : ''}
          </div>
        `;
    }

    function renderApp() {
        const isPlayScreen = state.screen === SCREEN_IDS.play;
        return `
          <div id="scenario-trainer" class="scenario-platform-root" dir="rtl" lang="he" data-trainer-platform="1" data-trainer-id="scenario-trainer" data-screen="${state.screen}">
            ${isPlayScreen ? '' : `
            <div class="scenario-summary-strip" data-trainer-zone="start">
              <div class="scenario-summary-pill" data-trainer-summary="current">${escapeHtml(getCurrentSummary())}</div>
              ${state.screen === SCREEN_IDS.home ? `
              <div class="scenario-summary-actions">
                <button type="button" class="btn btn-primary" data-trainer-action="start-session">התחל סשן</button>
                <button type="button" class="btn btn-secondary" data-trainer-action="open-settings">הגדרות</button>
              </div>` : ''}
            </div>`}
            ${isPlayScreen ? renderPlayTopBar() : ''}
            ${state.screen !== SCREEN_IDS.home && !isPlayScreen ? `
            <div class="scenario-session-bar" role="toolbar" aria-label="ניהול סשן">
              <span class="scenario-session-bar-info">
                ${state.session ? `סצנה ${escapeHtml(String(state.session.index + 1))}/${escapeHtml(String(state.session.queue.length))} · ${escapeHtml(String(state.session.score))} נק׳` : ''}
              </span>
              <button type="button" class="scenario-session-bar-end" data-scenario-action="go-home">↩ חזרה לבית</button>
            </div>` : ''}
            <div class="scenario-standalone-shell ${isPlayScreen ? 'scenario-standalone-shell--play' : ''}">
              <main class="scenario-main-area scenario-standalone-main" data-trainer-zone="main">
                ${renderMain()}
              </main>
              <aside class="${isPlayScreen ? 'scenario-play-support' : 'scenario-platform-support'}" aria-label="תמיכה והדרכת תהליך" data-trainer-zone="support">
                ${renderSupportRail()}
              </aside>
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
                return renderScenarioRuntimePlayScreen();
            case SCREEN_IDS.feedback:
                return renderScenarioRuntimeFeedbackScreen();
            case SCREEN_IDS.blueprint:
                return renderBlueprintScreen();
            case SCREEN_IDS.score:
                return renderScoreScreen();
            case SCREEN_IDS.history:
                return renderHistoryScreen();
            case SCREEN_IDS.help:
                return renderHelpScreen();
            default:
                return renderHomeScreenV2();
        }
    }

    /* renderHelperSteps, getFlowGuideContent, renderFlowGuide — removed: replaced by inline progressive disclosure */

    function renderHomeScreen() {
        const hasHistory = state.progress.completed > 0;
        const previewScenario = getHomePreviewScenario(state.homeFilters);
        const processSteps = Array.isArray(trainerContract.processSteps) ? trainerContract.processSteps : [];
        return `
          <section class="scenario-workspace-card scenario-home-card">

            <div class="scenario-home-hero">
              <h2>סימולטור סצנות</h2>
              <p>נכנסים לסצנה, בוחרים תגובה אחת, רואים איך היא נוחתת.</p>
            </div>

            <div class="scenario-home-section">
              <h4>מה הבעיה שמנסים לפתור?</h4>
              <p>הבעיה היא שברגע אנושי טעון מגיבים אוטומטית, ואז הדיון זז לאשמה, לחץ או ערפל במקום לקבל שם ברור למה שקורה ולבחור תגובה שמקדמת את השיחה.</p>
            </div>

            <div class="scenario-home-section">
              <h4>למה זה חשוב</h4>
              <p>רוב הטעויות בשיחה קורות לא בגלל כוונה רעה, אלא בגלל תגובה אוטומטית ברגע לחוץ. כאן מתרגלים לזהות את הרגע הזה ולבחור אחרת — בלי סיכון.</p>
            </div>

            <div class="scenario-home-section">
              <h4>מה עושים כאן</h4>
              <div class="scenario-home-steps">
                <div class="scenario-home-step"><span class="scenario-home-step-num">1</span><div><strong>נכנסים לסצנה</strong><p>שומעים משפט אמיתי מהצד השני.</p></div></div>
                <div class="scenario-home-step"><span class="scenario-home-step-num">2</span><div><strong>בוחרים תגובה</strong><p>אחת מתוך חמש — רק אחת פותחת בהירות.</p></div></div>
                <div class="scenario-home-step"><span class="scenario-home-step-num">3</span><div><strong>רואים מה קרה</strong><p>פידבק מיידי על ההשפעה ועל מה שנפתח או נסגר.</p></div></div>
              </div>
            </div>

            ${previewScenario ? `
            <div class="scenario-home-section scenario-home-example">
              <h4>דוגמה קצרה</h4>
              <p class="scenario-home-example-title">${escapeHtml(previewScenario.sceneTitle)} · ${escapeHtml(previewScenario.domainLabel)}</p>
              ${previewScenario.openingLine ? `<blockquote class="scenario-home-example-quote">"${escapeHtml(previewScenario.openingLine)}"</blockquote>` : ''}
              <p class="scenario-home-example-note">בסשן אמיתי תראו 5 תגובות אפשריות ותבחרו אחת.</p>
            </div>` : ''}

            <details class="scenario-home-details">
              <summary>איך זה עובד — מפת התהליך</summary>
              <div class="scenario-home-details-body">
                ${processSteps.map((step) => `
                  <div class="scenario-home-process-step">
                    <strong>${escapeHtml(step.label)}</strong>
                    <span>${escapeHtml(step.description)}</span>
                  </div>
                `).join('')}
              </div>
            </details>

            <div class="scenario-home-section">
              <h4>מה בונים כאן</h4>
              <div class="scenario-home-skills">
                <span class="scenario-home-skill-chip">זיהוי תגובות אוטומטיות</span>
                <span class="scenario-home-skill-chip">בחירת תגובה שפותחת בהירות</span>
                <span class="scenario-home-skill-chip">קריאת השפעה רגשית</span>
                <span class="scenario-home-skill-chip">בניית משפט ירוק לשיחה אמיתית</span>
              </div>
            </div>

            <div class="scenario-home-cta-section">
              <div class="scenario-home-filter-row">
                <label for="scenario-domain-select">תחום:</label>
                <select id="scenario-domain-select">${renderDomainOptions(state.homeFilters.domain)}</select>
                <label for="scenario-difficulty-select">רמה:</label>
                <select id="scenario-difficulty-select">${renderDifficultyOptions(state.homeFilters.difficulty)}</select>
                <label for="scenario-run-size">${escapeHtml(state.homeFilters.runSize)} סצנות:</label>
                <input type="range" id="scenario-run-size" min="3" max="10" value="${escapeHtml(state.homeFilters.runSize)}" />
              </div>
              <div class="scenario-home-cta-row">
                <button id="scenario-start-run-btn" type="button" class="btn btn-primary" data-trainer-action="start-session">התחל סשן</button>
                <button type="button" class="btn btn-secondary" data-trainer-action="open-settings">הגדרות</button>
                ${hasHistory ? `<button type="button" class="btn btn-secondary" data-scenario-action="open-history">היסטוריה (${escapeHtml(state.progress.completed)})</button>` : ''}
              </div>
              ${hasHistory ? `
              <div class="scenario-home-stats-row">
                <span>${escapeHtml(state.progress.greenCount)} ירוקות</span>
                <span>רצף: ${escapeHtml(state.progress.currentGreenStreak)}</span>
                <span>שיא: ${escapeHtml(state.progress.bestGreenStreak)}</span>
              </div>` : ''}
            </div>

          </section>
        `;
    }

    function renderPlayTopBar() {
        const currentIndex = (state.session?.index || 0) + 1;
        const total = state.session?.queue?.length || 0;
        const score = state.session?.score || 0;
        const streak = state.session?.streak || 0;
        return `
          <div class="scenario-play-topbar" role="toolbar" aria-label="ניווט בסצנה">
            <button type="button" class="scenario-play-topbar-btn scenario-play-topbar-btn--ghost" data-scenario-action="go-home" aria-label="חזרה לבית">
              <span class="scenario-play-topbar-icon" aria-hidden="true">⌂</span>
              <span>בית</span>
            </button>
            <div class="scenario-play-topbar-status" aria-live="polite">
              <span class="scenario-play-status-pill">${escapeHtml(String(currentIndex))}/${escapeHtml(String(total))}</span>
              <span class="scenario-play-status-pill">נק׳ ${escapeHtml(String(score))}</span>
              <span class="scenario-play-status-pill">רצף ${escapeHtml(String(streak))}</span>
              <span class="scenario-play-status-pill" data-trainer-summary="current">${escapeHtml(getCurrentSummary())}</span>
            </div>
            <button type="button" class="scenario-play-topbar-btn" data-scenario-action="open-help" aria-label="עזרה קצרה">
              <span aria-hidden="true">?</span>
            </button>
          </div>
        `;
    }

    function getPlayOptionVisual(option, isGreen) {
        const toneGroup = getOptionToneGroup(option?.tone, isGreen);
        if (isGreen) {
            if (toneGroup === 'sequence') return { label: 'סדר', icon: '1', support: 'מארגן צעד ראשון' };
            if (toneGroup === 'repair') return { label: 'תיקון', icon: '+', support: 'מכיר ופותח תיקון' };
            if (toneGroup === 'organize') return { label: 'ארגון', icon: '=', support: 'מסדר את הערפל' };
            if (toneGroup === 'diagnose') return { label: 'אבחון', icon: '*', support: 'בודק לפני שפועלים' };
            return { label: 'דיוק', icon: '?', support: 'מקרב למה שקורה בפועל' };
        }
        if (toneGroup === 'blame') return { label: 'אשמה', icon: '!', support: 'מעביר להתגוננות' };
        if (toneGroup === 'shutdown') return { label: 'סגירה', icon: 'X', support: 'סוגר את המגע' };
        if (toneGroup === 'control') return { label: 'לחץ', icon: '>>', support: 'דוחף בלי לפרק' };
        if (toneGroup === 'rescue') return { label: 'הצלה', icon: '+/-', support: 'לוקח את המשימה' };
        if (toneGroup === 'dismiss') return { label: 'טשטוש', icon: '~', support: 'מרגיע בלי לברר' };
        if (toneGroup === 'blur') return { label: 'עמימות', icon: '...', support: 'תגובה בלי כיוון' };
        return { label: trimText(toneLabel(option, isGreen), 18), icon: '-', support: 'תגובה אוטומטית' };
    }

    function getPlayOptionEffect(option, isGreen) {
        const toneGroup = getOptionToneGroup(option?.tone, isGreen);
        if (isGreen) {
            if (toneGroup === 'sequence') return 'מפרק את הרגע לרצף קצר שאפשר להתחיל ממנו כבר עכשיו.';
            if (toneGroup === 'repair') return 'מכיר בפגיעה או בקושי ואז פותח מרחב לתיקון מדויק.';
            if (toneGroup === 'organize') return 'אוסף את הפרטים החסרים ומחליף עומס במבנה ברור.';
            if (toneGroup === 'diagnose') return 'עוצר את הדחף לפעול מהר מדי ובודק מה בטוח ומה באמת ידוע.';
            return 'מחזיר את השיחה ממשפט כללי למה שאפשר לזהות, לתחום ולבדוק.';
        }
        if (toneGroup === 'blame') return 'מזיז את השיחה מהקושי עצמו לשאלה מי אשם ומי הבעיה.';
        if (toneGroup === 'shutdown') return 'מוריד את האפשרות לקשר ולבירור בדיוק כשצריך לפתוח אותם.';
        if (toneGroup === 'control') return 'לוחץ לזוז מהר, אבל לא מגלה איפה באמת נתקעים.';
        if (toneGroup === 'rescue') return 'מרגיע את הרגע על חשבון היכולת של הצד השני להחזיק את הצעד הבא.';
        if (toneGroup === 'dismiss') return 'נותן הקלה רגעית בלי לגעת במה שחסר כדי להתקדם.';
        if (toneGroup === 'blur') return 'נשמע כמו תגובה, אבל משאיר את המשימה או הקושי עמומים.';
        return 'מגיב מתוך עומס ולחץ במקום לייצר בהירות בתוך הסיטואציה.';
    }

    function getPlayOptionWhenItFits(scenario, option, isGreen) {
        const toneGroup = getOptionToneGroup(option?.tone, isGreen);
        if (isGreen) return `כשחשוב להחזיק גם את ${normalizeText(scenario?.humanNeed, 'הקושי האנושי שמולך')} וגם את הבדיקה של מה שקורה בפועל.`;
        if (toneGroup === 'blame') return 'מפתה במיוחד כשמרגישים מותקפים ורוצים להחזיר את הכאב החוצה.';
        if (toneGroup === 'shutdown') return 'מופיע הרבה כשאין כוח להיכנס לעוד שיחה או לעוד אי-ודאות.';
        if (toneGroup === 'control') return 'מפתה ברגעים של לחץ זמן, עומס, או רצון "שזה כבר יזוז".';
        if (toneGroup === 'rescue') return 'עולה כשקשה לראות את הצד השני נאבק ורוצים להוציא אותו מזה מהר.';
        if (toneGroup === 'dismiss') return 'מופיע כשמנסים להרגיע מהר כדי לא להישאר בתוך האי-נוחות של הרגע.';
        if (toneGroup === 'blur') return 'מופיע כשצריך להשיב מיד אבל עדיין אין בהירות אמיתית על המצב.';
        return 'זו תגובה נפוצה כשיש מתח, עומס או רצון להחזיר שליטה מיידית.';
    }

    function getPlayOptionRisk(option, isGreen) {
        const toneGroup = getOptionToneGroup(option?.tone, isGreen);
        if (isGreen) {
            if (toneGroup === 'repair') return 'אם קופצים ישר לתיקון בלי להחזיק את הרגש, זה יכול להישמע מנומס אבל לא מורגש.';
            if (toneGroup === 'sequence') return 'אם מפרקים מהר מדי בלי לעצור רגע עם הלחץ, זה עלול להישמע טכני או ניהולי.';
            if (toneGroup === 'diagnose') return 'אם נשארים רק באבחון בלי להציע צעד ראשון, השיחה עלולה להרגיש תקועה וקרה.';
            return 'אם משתמשים במהלך הזה כתבנית מוכנה בלי להקשיב באמת, הוא יאבד את האמון והחדות שלו.';
        }
        return trimText(option?.whyItHurts || option?.feedback, 160);
    }

    function renderSpeechBubble(scenario) {
        return `
          <div class="scenario-stage-bubble-wrap">
            <div class="scenario-stage-bubble">
              <span class="scenario-stage-bubble-speaker">${escapeHtml(scenario.role.other)}</span>
              <p>${escapeHtml(getScenarioSpeechLine(scenario))}</p>
            </div>
          </div>
        `;
    }

    function renderOptionPreviewCard(scenario, option) {
        const isGreen = Number(option.score) === 1;
        const visual = getPlayOptionVisual(option, isGreen);
        return `
          <article id="scenario-play-preview-card" class="scenario-option-preview-card" data-option-tone="${escapeHtml(getOptionToneGroup(option?.tone, isGreen))}">
            <div class="scenario-option-preview-heading">
              <span class="scenario-option-preview-icon" aria-hidden="true">${escapeHtml(visual.icon)}</span>
              <div>
                <p class="scenario-option-preview-kicker">מהלך אפשרי</p>
                <h3>${escapeHtml(toneLabel(option, isGreen))}</h3>
              </div>
            </div>
            <dl class="scenario-option-preview-list">
              <div>
                <dt>מה זה עושה</dt>
                <dd>${escapeHtml(getPlayOptionEffect(option, isGreen))}</dd>
              </div>
              <div>
                <dt>מתי זה עולה</dt>
                <dd>${escapeHtml(getPlayOptionWhenItFits(scenario, option, isGreen))}</dd>
              </div>
              <div>
                <dt>שאלת המשך</dt>
                <dd>${escapeHtml(normalizeText(scenario?.deepeningQuestion, 'מה בדיוק קורה כאן בפועל?'))}</dd>
              </div>
              <div>
                <dt>סיכון</dt>
                <dd>${escapeHtml(getPlayOptionRisk(option, isGreen))}</dd>
              </div>
            </dl>
          </article>
        `;
    }

    function renderAmbientPreviewCard(scenario) {
        return `
          <article id="scenario-play-preview-card" class="scenario-option-preview-card scenario-option-preview-card--ambient" data-preview-state="idle">
            <p class="scenario-option-preview-kicker">מה מחפשים כאן</p>
            <h3>${escapeHtml(scenario.surfaceConflict)}</h3>
            <dl class="scenario-option-preview-list">
              <div>
                <dt>הצורך האנושי</dt>
                <dd>${escapeHtml(trimText(scenario.humanNeed, 170))}</dd>
              </div>
              <div>
                <dt>השאלה שמקדמת</dt>
                <dd>${escapeHtml(normalizeText(scenario?.deepeningQuestion, 'מה בדיוק קורה כאן בפועל?'))}</dd>
              </div>
              <div>
                <dt>קו מנחה</dt>
                <dd>${escapeHtml(trimText(scenario.supportPrompt || scenario.learningFocus, 170))}</dd>
              </div>
            </dl>
          </article>
        `;
    }

    function getArcRise(index, count) {
        const patterns = {
            3: [26, 8, 26],
            4: [40, 12, 12, 40],
            5: [58, 24, 0, 24, 58]
        };
        return (patterns[count] || patterns[5] || [0])[index] || 0;
    }

    function renderArcOption(option, index, options) {
        const isGreen = Number(option.score) === 1;
        const visual = getPlayOptionVisual(option, isGreen);
        const isPreviewed = state.previewedOptionId === option.id;
        return `
          <button
            type="button"
            class="scenario-arc-option ${isPreviewed ? 'is-previewed' : ''}"
            data-scenario-action="pick-option"
            data-option-id="${escapeHtml(option.id)}"
            data-option-tone="${escapeHtml(getOptionToneGroup(option?.tone, isGreen))}"
            style="--scenario-option-rise:${getArcRise(index, options.length)}px"
            aria-describedby="scenario-play-preview-card"
            aria-pressed="${isPreviewed ? 'true' : 'false'}"
          >
            <span class="scenario-arc-option-icon" aria-hidden="true">${escapeHtml(visual.icon)}</span>
            <span class="scenario-arc-option-copy">
              <span class="scenario-arc-option-label">${escapeHtml(visual.label)}</span>
              <span class="scenario-arc-option-support">${escapeHtml(trimText(option.choiceHint || visual.support, 52))}</span>
            </span>
          </button>
        `;
    }

    function renderPlayScreen() {
        const scenario = state.activeScenario || state.session?.queue?.[state.session.index];
        if (!scenario) return renderHomeScreenV2();
        const options = getScenarioPlayOptions(scenario);
        const currentIndex = (state.session?.index || 0) + 1;
        const total = state.session?.queue?.length || 0;
        const progress = total > 0 ? Math.round(((currentIndex - 1) / total) * 100) : 0;
        const previewOption = getScenarioPlayPreviewOption(scenario);
        return `
          <section class="scenario-play-view" data-scenario-stage="1" data-domain="${escapeHtml(scenario.domain)}">
            <div class="scenario-play-stage" data-domain="${escapeHtml(scenario.domain)}" style="--scenario-progress:${escapeHtml(progress)}%">
              <div class="scenario-play-stage-atmosphere" aria-hidden="true">
                <div class="scenario-play-stage-gradient"></div>
                <div class="scenario-play-stage-glow scenario-play-stage-glow--a"></div>
                <div class="scenario-play-stage-glow scenario-play-stage-glow--b"></div>
                ${scenario.sceneArt ? `<div class="scenario-play-stage-art"><img src="${escapeHtml(scenario.sceneArt)}" alt="" loading="eager" decoding="async" /></div>` : ''}
              </div>
              <div class="scenario-play-stage-overlay">
                <header class="scenario-play-scene-head">
                  <p class="scenario-play-scene-kicker">${escapeHtml(`${scenario.domainLabel} · ${scenario.role.player} מול ${scenario.role.other}`)}</p>
                  <h2>${escapeHtml(scenario.sceneTitle)}</h2>
                  <p class="scenario-play-scene-context">${escapeHtml(trimText(scenario.contextIntro, 220))}</p>
                </header>
                ${renderSpeechBubble(scenario)}
                <div class="scenario-play-preview-slot">
                  ${previewOption ? renderOptionPreviewCard(scenario, previewOption) : renderAmbientPreviewCard(scenario)}
                </div>
                <div class="scenario-play-choice-band">
                  <div class="scenario-play-choice-heading">
                    <span class="scenario-play-choice-kicker">מהלך אפשרי</span>
                    <strong>מה תגיד/י עכשיו?</strong>
                  </div>
                  <div id="scenario-options-container" class="scenario-arc-options" role="list" aria-label="אפשרויות תגובה">
                    ${options.map((option, index) => renderArcOption(option, index, options)).join('')}
                  </div>
                </div>
              </div>
            </div>
          </section>
        `;
    }

    function renderStageImage(frame, scenario) {
        const src = normalizeText(frame?.image || scenario?.coverImage || scenario?.sceneArt, '');
        const fallback = normalizeText(scenario?.sceneArt || scenario?.coverImage, '');
        if (!src && !fallback) {
            return `<div class="scenario-story-stage-image scenario-story-stage-image--placeholder" aria-hidden="true"></div>`;
        }
        const resolvedSrc = src || fallback;
        const onError = fallback && fallback !== resolvedSrc
            ? `this.onerror=null;this.src='${escapeHtml(fallback)}';`
            : '';
        return `<img class="scenario-story-stage-image" src="${escapeHtml(resolvedSrc)}" alt="${escapeHtml(frame?.title || scenario?.sceneTitle || '')}" loading="eager" decoding="async" ${onError ? `onerror="${onError}"` : ''} />`;
    }

    function renderStoryFrameChips(scenario, activeSlide) {
        return getScenarioStorySlides(scenario).map((slide) => `
          <button
            type="button"
            class="scenario-story-chip ${activeSlide?.id === slide.id ? 'is-active' : ''}"
            data-scenario-action="pick-story-slide"
            data-story-slide-id="${escapeHtml(slide.id)}"
            aria-pressed="${activeSlide?.id === slide.id ? 'true' : 'false'}"
          >${escapeHtml(slide.label)}</button>
        `).join('');
    }

    function getReactionButtonLabel(option) {
        const isGreen = Number(option.score) === 1;
        const visual = getPlayOptionVisual(option, isGreen);
        return normalizeText(visual?.label, trimText(toneLabel(option, isGreen), 18));
    }

    function renderReactionButtons(options, selectedOption, disabled = false) {
        const selectedId = normalizeText(selectedOption?.id, '');
        return options.map((option) => {
            const isGreen = Number(option.score) === 1;
            return `
              <button
                type="button"
                class="scenario-reaction-btn ${isGreen ? 'is-green' : 'is-red'} ${selectedId === option.id ? 'is-active' : ''}"
                data-scenario-action="pick-option"
                data-option-id="${escapeHtml(option.id)}"
                data-option-tone="${escapeHtml(getOptionToneGroup(option?.tone, isGreen))}"
                title="${escapeHtml(option.speakerLine)}"
                aria-pressed="${selectedId === option.id ? 'true' : 'false'}"
                ${disabled ? 'disabled' : ''}
              >
                <span class="scenario-reaction-btn-label">${escapeHtml(getReactionButtonLabel(option))}</span>
              </button>
            `;
        }).join('');
    }

    function renderRuntimeChatThread(scenario, option) {
        const openingLine = getScenarioSpeechLine(scenario);
        if (!option) {
            return `
              <div class="scenario-bubble other">
                <span class="scenario-bubble-speaker">${escapeHtml(scenario.role.other)}</span>
                <p>${escapeHtml(openingLine)}</p>
              </div>
              <div class="scenario-bubble scenario-bubble--system">
                <span class="scenario-bubble-speaker">המסלול עוד פתוח</span>
                <p>בחר/י תגובה רגשית למטה כדי לראות איך השיחה זזה, מה נסגר, ומה נפתח.</p>
              </div>
            `;
        }

        const isGreen = Number(option.score) === 1;
        return `
          <div class="scenario-bubble other">
            <span class="scenario-bubble-speaker">${escapeHtml(scenario.role.other)}</span>
            <p>${escapeHtml(openingLine)}</p>
          </div>
          <div id="scenario-feedback-choice-bubble" class="scenario-bubble player selected ${isGreen ? 'green' : 'red'}">
            <span class="scenario-bubble-speaker">התגובה שלך</span>
            <p>${escapeHtml(option.speakerLine)}</p>
          </div>
          <div id="scenario-feedback-other-bubble" class="scenario-bubble other followup">
            <span class="scenario-bubble-speaker">התגובה שמולך</span>
            <p>${escapeHtml(option.likelyOtherReply)}</p>
          </div>
        `;
    }

    function renderRuntimeWorkspace(scenario, options, activeSlide, selectedOption, progress, mode) {
        const isFeedback = mode === 'feedback';
        const statusLine = isFeedback && selectedOption
            ? `נבחרה תגובה: ${getReactionButtonLabel(selectedOption)}`
            : 'בחר/י תגובה רגשית קצרה וראה/י לאן השיחה הולכת.';
        return `
          <section class="scenario-runtime-shell" data-scenario-runtime="1" data-runtime-mode="${escapeHtml(mode)}" style="--scenario-progress:${escapeHtml(progress)}%">
            <article class="scenario-runtime-stage-panel" data-domain="${escapeHtml(scenario.domain)}">
              <div class="scenario-runtime-context-card">
                <p class="scenario-play-scene-kicker">${escapeHtml(`${scenario.domainLabel} · ${scenario.role.player} מול ${scenario.role.other}`)}</p>
                <h2>${escapeHtml(scenario.sceneTitle)}</h2>
                <p class="scenario-runtime-context-text">${escapeHtml(scenario.contextIntro)}</p>
              </div>

              <div class="scenario-tv-card">
                <div class="scenario-tv-frame">
                  <div class="scenario-tv-screen">
                    ${renderStageImage(activeSlide, scenario)}
                  </div>
                </div>
                <div class="scenario-story-chip-row" role="tablist" aria-label="פריימים של הסיפור">
                  ${renderStoryFrameChips(scenario, activeSlide)}
                </div>
              </div>

              <div class="scenario-reaction-dock">
                <div class="scenario-reaction-head">
                  <p class="scenario-panel-kicker">עץ תגובות</p>
                  <p>${escapeHtml(statusLine)}</p>
                </div>
                <div class="scenario-reaction-row" role="list" aria-label="תגובות רגשיות אפשריות">
                  ${renderReactionButtons(options, selectedOption)}
                </div>
              </div>
            </article>

            <article class="scenario-runtime-chat-panel" data-scenario-feedback-thread="${isFeedback ? '1' : '0'}">
              <div class="scenario-runtime-chat-head">
                <p class="scenario-panel-kicker">מסלול השיחה</p>
                <h3>${escapeHtml(isFeedback ? 'כאן רואים מה קורה כשמגיבים כך' : 'בחר/י תגובה כדי לפתוח את המסלול')}</h3>
              </div>
              <div class="scenario-chat-shell">
                <div class="scenario-chat-thread">
                  ${renderRuntimeChatThread(scenario, selectedOption)}
                </div>
              </div>
            </article>
          </section>
        `;
    }

    function renderRuntimeChatThreadV2(scenario) {
        const openingLine = getScenarioSpeechLine(scenario);
        const trail = getConversationTrail();
        const outcome = getConversationOutcome(scenario);
        const chunks = [
            `
              <div class="scenario-bubble other">
                <span class="scenario-bubble-speaker">${escapeHtml(scenario.role.other)}</span>
                <p>${escapeHtml(openingLine)}</p>
              </div>
            `
        ];
        trail.forEach((turn, index) => {
            const isLastTurn = index === trail.length - 1;
            chunks.push(`
              <div ${isLastTurn ? 'id="scenario-feedback-choice-bubble"' : ''} class="scenario-bubble player selected ${turn.isGreen ? 'green' : 'red'}">
                <span class="scenario-bubble-speaker">התגובה שלך</span>
                <p>${escapeHtml(turn.playerLine)}</p>
              </div>
              <div ${isLastTurn ? 'id="scenario-feedback-other-bubble"' : ''} class="scenario-bubble other followup">
                <span class="scenario-bubble-speaker">התגובה שמולך</span>
                <p>${escapeHtml(turn.otherReply)}</p>
              </div>
            `);
        });
        if (!trail.length) {
            chunks.push(`
              <div class="scenario-bubble scenario-bubble--system">
                <span class="scenario-bubble-speaker">המסלול עוד פתוח</span>
                <p>בחר/י תגובה רגשית מתחת למסך כדי לראות איך השיחה נפתחת, ננעלת או משנה כיוון.</p>
              </div>
            `);
        } else if (trail.length < DIALOGUE_MAX_TURNS) {
            chunks.push(`
              <div class="scenario-bubble scenario-bubble--system">
                <span class="scenario-bubble-speaker">מהלך ${trail.length}/${DIALOGUE_MAX_TURNS}</span>
                <p>${escapeHtml(outcome.summary)}</p>
              </div>
            `);
        } else {
            chunks.push(`
              <div class="scenario-bubble scenario-bubble--system">
                <span class="scenario-bubble-speaker">לאן זה הלך</span>
                <p>${escapeHtml(outcome.summary)}</p>
              </div>
            `);
        }
        return chunks.join('');
    }

    function renderMetaModelRepairCard(scenario) {
        const trail = getConversationTrail();
        if (!trail.length || isConversationComplete()) return '';
        const sourceOption = trail[trail.length - 1]?.option || state.selectedOption || scenario.responseSet.green;
        const question = getMetaModelRepairQuestion(scenario, sourceOption);
        const benefit = getMetaModelRepairBenefit(scenario, sourceOption);
        return `
          <div class="scenario-meta-model-repair" data-scenario-meta-model="1">
            <div class="scenario-meta-model-repair-head">
              <p class="scenario-panel-kicker">שאלת מטה־מודל שפותחת כאן</p>
              <button type="button" class="btn btn-secondary scenario-runtime-action" data-scenario-action="add-meta-model-turn">הוסף לשיחה</button>
            </div>
            <p class="scenario-meta-model-repair-question">${escapeHtml(question)}</p>
            <p class="scenario-meta-model-repair-note">${escapeHtml(benefit)}</p>
          </div>
        `;
    }

    function renderRuntimeWorkspaceV2(scenario, options, activeSlide, progress, mode) {
        const trail = getConversationTrail();
        const outcome = getConversationOutcome(scenario);
        const isFeedback = mode === 'feedback';
        const isComplete = isConversationComplete();
        const statusLine = trail.length
            ? `${outcome.headline} · מהלך ${Math.min(trail.length, DIALOGUE_MAX_TURNS)}/${DIALOGUE_MAX_TURNS}`
            : 'בחר/י תגובה רגשית קצרה וראה/י איך השיחה מתחילה לזוז.';
        return `
          <section class="scenario-runtime-shell" data-scenario-runtime="1" data-runtime-mode="${escapeHtml(mode)}" style="--scenario-progress:${escapeHtml(progress)}%">
            <article class="scenario-runtime-stage-panel" data-domain="${escapeHtml(scenario.domain)}">
              <div class="scenario-runtime-context-card">
                <p class="scenario-play-scene-kicker">${escapeHtml(`${scenario.domainLabel} · ${scenario.role.player} מול ${scenario.role.other}`)}</p>
                <h2>${escapeHtml(scenario.sceneTitle)}</h2>
                <p class="scenario-runtime-context-text">${escapeHtml(scenario.contextIntro)}</p>
              </div>

              <div class="scenario-tv-card">
                <div class="scenario-tv-frame">
                  <div class="scenario-tv-screen">
                    ${renderStageImage(activeSlide, scenario)}
                  </div>
                </div>
                <div class="scenario-story-chip-row" role="tablist" aria-label="פריימים של הסיפור">
                  ${renderStoryFrameChips(scenario, activeSlide)}
                </div>
              </div>

              <div class="scenario-reaction-dock">
                <div class="scenario-reaction-head">
                  <p class="scenario-panel-kicker">עץ תגובות</p>
                  <p>${escapeHtml(statusLine)}</p>
                </div>
                <div class="scenario-reaction-row" role="list" aria-label="תגובות רגשיות אפשריות">
                  ${renderReactionButtons(options, state.selectedOption, isComplete && !isFeedback)}
                </div>
                ${renderMetaModelRepairCard(scenario)}
                <div class="scenario-reaction-actions">
                  <button type="button" class="btn btn-secondary scenario-runtime-action" data-scenario-action="open-investigation" ${trail.length ? '' : 'disabled'}>חקירה</button>
                  <button type="button" class="btn btn-secondary scenario-runtime-action" data-scenario-action="restart-scene">חזור בזמן ונסה מהתחלה!</button>
                  ${isComplete ? `<button type="button" class="btn btn-primary scenario-runtime-action" data-scenario-action="continue-result">סיום הסצנה</button>` : `<div class="scenario-runtime-steps-left">עוד ${escapeHtml(String(Math.max(DIALOGUE_MAX_TURNS - trail.length, 0)))} מהלכים כדי לראות לאן זה הולך</div>`}
                </div>
              </div>
            </article>

            <article class="scenario-runtime-chat-panel" data-scenario-feedback-thread="${isFeedback ? '1' : '0'}">
              <div class="scenario-runtime-chat-head">
                <p class="scenario-panel-kicker">מסלול השיחה</p>
                <h3>${escapeHtml(isFeedback ? 'כאן רואים את המסלול שנבנה' : 'כאן נבנה הדיאלוג צעד אחרי צעד')}</h3>
              </div>
              <div class="scenario-chat-shell">
                <div class="scenario-chat-thread">
                  ${renderRuntimeChatThreadV2(scenario)}
                </div>
              </div>
            </article>
          </section>
        `;
    }

    function renderRuntimeProgressCard(scenario) {
        const trail = getConversationTrail();
        const outcome = getConversationOutcome(scenario);
        const trailLabels = trail.map((turn) => turn.label).join(' ← ');
        if (!trail.length) {
            return `
              <section class="scenario-play-options-card scenario-play-options-card--supporting">
                <div class="scenario-play-options-head">
                  <p class="scenario-panel-kicker">מה עושים עכשיו</p>
                  <h3>בוחרים תגובה ראשונה</h3>
                  <p>הלחיצה לא פותחת מסך תוצאה. היא מוסיפה משפט למסלול השיחה, מציגה את תגובת הצד השני, ומקדמת את ה־TV לשלב הבא.</p>
                </div>
              </section>
            `;
        }
        return `
          <section class="scenario-play-options-card scenario-play-options-card--supporting">
            <div class="scenario-play-options-head">
              <p class="scenario-panel-kicker">${escapeHtml(isConversationComplete() ? 'לאן הסיטואציה הלכה' : 'המסלול נבנה')}</p>
              <h3>${escapeHtml(outcome.headline)}</h3>
              <p>${escapeHtml(outcome.summary)}</p>
              ${trailLabels ? `<p class="scenario-runtime-route-line">תגובות שנבחרו: ${escapeHtml(trailLabels)}</p>` : ''}
            </div>
          </section>
        `;
    }

    function renderCompactPlayOption(option) {
        const isGreen = Number(option.score) === 1;
        const visual = getPlayOptionVisual(option, isGreen);
        return `
          <button
            type="button"
            class="scenario-compact-option ${isGreen ? 'is-green' : 'is-red'}"
            data-scenario-action="pick-option"
            data-option-id="${escapeHtml(option.id)}"
            data-option-tone="${escapeHtml(getOptionToneGroup(option?.tone, isGreen))}"
          >
            <span class="scenario-compact-option-head">
              <span class="scenario-compact-option-icon" aria-hidden="true">${escapeHtml(visual.icon)}</span>
              <span class="scenario-compact-option-label">${escapeHtml(toneLabel(option, isGreen))}</span>
            </span>
            <span class="scenario-compact-option-text">${escapeHtml(option.speakerLine)}</span>
            <span class="scenario-compact-option-note">${escapeHtml(trimText(option.choiceHint || visual.support, 84))}</span>
          </button>
        `;
    }

    function renderScenarioRuntimePlayScreen() {
        const scenario = state.activeScenario || state.session?.queue?.[state.session.index];
        if (!scenario) return renderHomeScreenV2();
        const options = getScenarioPlayOptions(scenario);
        const currentIndex = (state.session?.index || 0) + 1;
        const total = state.session?.queue?.length || 0;
        const progress = total > 0 ? Math.round(((currentIndex - 1) / total) * 100) : 0;
        const activeSlide = getActiveStorySlide(scenario) || getProgressStorySlideForTurn(scenario, getConversationStepCount());
        return `
          <section class="scenario-play-view scenario-play-view--story" data-scenario-stage="1" data-domain="${escapeHtml(scenario.domain)}">
            ${renderRuntimeWorkspaceV2(scenario, options, activeSlide, progress, 'play')}
            <section class="scenario-play-options-card scenario-play-options-card--supporting">
              <div class="scenario-play-options-head">
                <p class="scenario-panel-kicker">מה בודקים כאן</p>
                <h3>${escapeHtml(scenario.surfaceConflict)}</h3>
                <p>${escapeHtml(scenario.learningFocus)}</p>
              </div>
              <details class="scenario-meta-accordion scenario-meta-accordion--inline">
                <summary>שאלת העמקה לסצנה הזאת</summary>
                <div class="scenario-meta-accordion-body">
                  <p><strong>השאלה:</strong> ${escapeHtml(scenario.deepeningQuestion)}</p>
                  <p><strong>מה חסר כרגע:</strong> ${escapeHtml(scenario.metaModelCore.hiddenGap)}</p>
                </div>
              </details>
            </section>
          </section>
        `;
    }

    function renderScenarioRuntimeFeedbackScreen(forceAnalysisOpen = false) {
        const scenario = state.activeScenario;
        const option = state.selectedOption;
        if (!scenario || !option) return renderScenarioRuntimePlayScreen();
        const isGreen = Number(option.score) === 1;
        const guide = buildFeedbackGuide(scenario, option, isGreen);
        const analysisOpen = !!forceAnalysisOpen;
        const options = getScenarioPlayOptions(scenario);
        const currentIndex = (state.session?.index || 0) + 1;
        const total = state.session?.queue?.length || 0;
        const progress = total > 0 ? Math.round(((currentIndex - 1) / total) * 100) : 0;
        const activeSlide = getActiveStorySlide(scenario) || getResponseStorySlide(scenario);
        return `
          <section class="scenario-play-view scenario-play-view--story" data-scenario-stage="1" data-domain="${escapeHtml(scenario.domain)}">
            ${renderRuntimeWorkspaceV2(scenario, options, activeSlide, progress, 'feedback')}
            <section class="scenario-workspace-card scenario-runtime-results-card" data-scenario-feedback-thread="1">
              <div class="scenario-feedback-summary-card">
                <p class="scenario-feedback-kind">${escapeHtml(isGreen ? 'כיוון שפותח בדיקה' : 'כיוון שסוגר את השיחה')}</p>
                <h3>${escapeHtml(guide.headline)}</h3>
                <p>${escapeHtml(isGreen ? option.whyItWorks : option.whyItHurts)}</p>
              </div>
              <div class="scenario-impact-grid">
                <article class="scenario-impact-card" data-scenario-impact="emotion">
                  <h4>${escapeHtml(isGreen ? 'יש מקום לנשום ולהקשיב' : 'כנראה תלחיץ או תכווץ')}</h4>
                  <p>${escapeHtml(guide.emotionalImpact)}</p>
                </article>
                <article class="scenario-impact-card" data-scenario-impact="process">
                  <h4>${escapeHtml(isGreen ? 'השיחה עוברת לבדיקה' : 'הבעיה נשארת בלי שם')}</h4>
                  <p>${escapeHtml(guide.processImpact)}</p>
                </article>
              </div>
              <div class="scenario-consequence-box ${isGreen ? 'green' : 'red'}" data-scenario-consequence="1">
                <h4>${escapeHtml(isGreen ? 'איך ממשיכים מכאן' : 'מה אפשר לנסות במקום')}</h4>
                <p>${escapeHtml(guide.nextMove)}</p>
              </div>
              ${renderTherapeuticGuideCard(scenario, option, guide, isGreen)}
              <div class="scenario-meta-model-repair scenario-meta-model-repair--analysis">
                <div class="scenario-meta-model-repair-head">
                  <p class="scenario-panel-kicker">שאלת מטה־מודל שיכולה לשנות את הכיוון</p>
                </div>
                <p class="scenario-meta-model-repair-question">${escapeHtml(getMetaModelRepairQuestion(scenario, option))}</p>
                <p class="scenario-meta-model-repair-note">${escapeHtml(getMetaModelRepairBenefit(scenario, option))}</p>
              </div>
              <div class="scenario-feedback-actions scenario-feedback-actions--primary">
                <button type="button" class="btn btn-secondary" data-scenario-action="show-blueprint">${analysisOpen ? 'סגור מפת פעולה' : 'פתח מפת פעולה'}</button>
                <button type="button" class="btn btn-secondary" data-scenario-action="restart-scene">חזור בזמן ונסה מהתחלה!</button>
                <button type="button" class="btn btn-primary" data-scenario-action="continue-result">לסיכום הסצנה</button>
              </div>
              <details class="scenario-meta-accordion">
                <summary>מה היה עמום / מה נפתח כאן</summary>
                <div class="scenario-meta-accordion-body">
                  <p>${escapeHtml(guide.metaModelExplanation)}</p>
                  <p><strong>הפועל/המהלך העמום:</strong> ${escapeHtml(scenario.metaModelCore.unspecifiedVerb)}</p>
                  <p><strong>מה נשאר חסר:</strong> ${escapeHtml(scenario.metaModelCore.hiddenGap)}</p>
                  <p><strong>שאלת העמקה:</strong> ${escapeHtml(scenario.deepeningQuestion)}</p>
                </div>
              </details>
              <details class="scenario-meta-accordion" ${analysisOpen ? 'open data-scenario-analysis="1"' : ''}>
                <summary>ניתוח מעמיק - מפת פעולה</summary>
                <div class="scenario-meta-accordion-body">
                  ${renderBlueprintDetails(scenario, isGreen)}
                </div>
              </details>
            </section>
          </section>
        `;
    }

    function renderHomeScreenV2() {
        const hasHistory = state.progress.completed > 0;
        const featuredScenarios = getScenarioMenuScenarios();
        const previewScenario = getSelectedScenarioFromMenu() || getHomePreviewScenario(state.homeFilters);
        const processSteps = Array.isArray(trainerContract.processSteps) ? trainerContract.processSteps : [];
        return `
          <section class="scenario-workspace-card scenario-home-card scenario-home-card--landing">
            <div class="scenario-home-hero scenario-home-hero--landing">
              <p class="scenario-panel-kicker">Scenario Simulator</p>
              <h2>סימולטור הסצנות</h2>
              <p class="scenario-home-hero-subtitle">נכנסים לסיטואציה אנושית, רואים איך היא בנויה, ורק אז בוחרים תגובה.</p>
              <p class="scenario-home-hero-note">כל ההסבר וההגדרות נשארים כאן. בזמן הריצה המסך מתפקס רק בסיפור הפעיל.</p>
            </div>

            <section class="scenario-home-setup-card">
              <div class="scenario-home-setup-head">
                <div>
                  <p class="scenario-panel-kicker">הגדרות פתיחה</p>
                  <h3>${escapeHtml(previewScenario ? `מסלול ממוקד · ${previewScenario.sceneTitle}` : getCurrentSummary())}</h3>
                </div>
                ${hasHistory ? `<button type="button" class="btn btn-secondary" data-scenario-action="open-history">היסטוריה (${escapeHtml(state.progress.completed)})</button>` : ''}
              </div>
              <div class="scenario-home-scenario-grid">
                ${featuredScenarios.map((scenario) => `
                  <button
                    type="button"
                    class="scenario-home-scenario-card ${state.selectedScenarioId === scenario.scenarioId ? 'is-active' : ''}"
                    data-scenario-action="select-scenario"
                    data-scenario-id="${escapeHtml(scenario.scenarioId)}"
                    aria-pressed="${state.selectedScenarioId === scenario.scenarioId ? 'true' : 'false'}"
                  >
                    <span class="scenario-home-scenario-kicker">${escapeHtml(scenario.domainLabel)}</span>
                    <strong>${escapeHtml(scenario.sceneTitle)}</strong>
                    <span>${escapeHtml(trimText(scenario.contextIntro, 118))}</span>
                  </button>
                `).join('')}
              </div>
              <div class="scenario-home-filter-row">
                <label for="scenario-domain-select">תחום</label>
                <select id="scenario-domain-select">${renderDomainOptions(state.homeFilters.domain)}</select>
                <label for="scenario-difficulty-select">רמה</label>
                <select id="scenario-difficulty-select">${renderDifficultyOptions(state.homeFilters.difficulty)}</select>
                <label for="scenario-run-size">אורך סשן</label>
                <input type="range" id="scenario-run-size" min="3" max="10" value="${escapeHtml(state.homeFilters.runSize)}" />
                <span class="scenario-home-range-value">${escapeHtml(state.homeFilters.runSize)} סצנות</span>
              </div>
              <div class="scenario-home-cta-row">
                <button id="scenario-start-run-btn" type="button" class="btn btn-primary" data-trainer-action="start-session">התחל סשן</button>
                <button type="button" class="btn btn-secondary" data-trainer-action="open-settings">הגדרות</button>
              </div>
              ${hasHistory ? `
              <div class="scenario-home-stats-row">
                <span>${escapeHtml(state.progress.greenCount)} ירוקות</span>
                <span>רצף: ${escapeHtml(state.progress.currentGreenStreak)}</span>
                <span>שיא: ${escapeHtml(state.progress.bestGreenStreak)}</span>
              </div>` : ''}
            </section>

            ${previewScenario ? `
            <section class="scenario-home-preview-card">
              <div class="scenario-home-preview-copy">
                <p class="scenario-panel-kicker">הצצה לסשן</p>
                <h3>${escapeHtml(previewScenario.sceneTitle)}</h3>
                <p>${escapeHtml(previewScenario.contextIntro)}</p>
                ${previewScenario.openingLine ? `<blockquote class="scenario-home-example-quote">"${escapeHtml(previewScenario.openingLine)}"</blockquote>` : ''}
              </div>
              <div class="scenario-home-preview-media">
                ${renderStageImage({ image: previewScenario.coverImage || previewScenario.sceneArt, title: previewScenario.sceneTitle }, previewScenario)}
              </div>
            </section>` : ''}

            <div class="scenario-home-details-grid">
              <details class="scenario-home-details">
                <summary>מה זה הפיצ'ר</summary>
                <div class="scenario-home-details-body">
                  <p>זהו אימון תגובה חי. לא עוד עמוד הסבר ארוך, אלא כניסה לסצנה, זיהוי עומס, ובחירת תגובה שבונה בהירות במקום לייצר עוד לחץ.</p>
                </div>
              </details>
              <details class="scenario-home-details">
                <summary>איך זה עובד</summary>
                <div class="scenario-home-details-body">
                  ${processSteps.map((step) => `
                    <div class="scenario-home-process-step">
                      <strong>${escapeHtml(step.label)}</strong>
                      <span>${escapeHtml(step.description)}</span>
                    </div>
                  `).join('')}
                </div>
              </details>
              <details class="scenario-home-details">
                <summary>דוגמה קצרה</summary>
                <div class="scenario-home-details-body">
                  <p>בשלב הריצה תרא/י סטייג' קבוע עם פריימים של הסיפור. הצ'יפים למטה מחליפים זווית הסתכלות בלי לפתוח בלוקים ענקיים ובלי לקפוץ במסך.</p>
                </div>
              </details>
              <details class="scenario-home-details">
                <summary>מה מרוויחים</summary>
                <div class="scenario-home-details-body">
                  <ul class="scenario-support-list">
                    <li>לזהות איפה הסצנה ננעלת ולא רק מי צודק.</li>
                    <li>לראות מה חסר לפני שממהרים לענות.</li>
                    <li>לשמור על מסך ריצה נקי שמחזיק רק את הסיפור הפעיל.</li>
                  </ul>
                </div>
              </details>
            </div>
          </section>
        `;
    }

    function renderPlayScreenV2() {
        const scenario = state.activeScenario || state.session?.queue?.[state.session.index];
        if (!scenario) return renderHomeScreenV2();
        const options = getScenarioPlayOptions(scenario);
        const currentIndex = (state.session?.index || 0) + 1;
        const total = state.session?.queue?.length || 0;
        const progress = total > 0 ? Math.round(((currentIndex - 1) / total) * 100) : 0;
        const activeSlide = getActiveStorySlide(scenario);
        return `
          <section class="scenario-play-view scenario-play-view--story" data-scenario-stage="1" data-domain="${escapeHtml(scenario.domain)}">
            <article class="scenario-story-stage" data-domain="${escapeHtml(scenario.domain)}" style="--scenario-progress:${escapeHtml(progress)}%">
              <div class="scenario-story-stage-media">
                ${renderStageImage(activeSlide, scenario)}
              </div>
              <div class="scenario-story-stage-body">
                <div class="scenario-story-stage-head">
                  <p class="scenario-play-scene-kicker">${escapeHtml(`${scenario.domainLabel} · ${scenario.role.player} מול ${scenario.role.other}`)}</p>
                  <h2>${escapeHtml(scenario.sceneTitle)}</h2>
                  <p class="scenario-story-stage-context">${escapeHtml(scenario.contextIntro)}</p>
                </div>
                <div class="scenario-story-frame-card">
                  <div class="scenario-story-frame-copy">
                    <p class="scenario-panel-kicker">${escapeHtml(activeSlide?.label || 'פריים פעיל')}</p>
                    <h3>${escapeHtml(activeSlide?.title || scenario.sceneTitle)}</h3>
                    <p>${escapeHtml(activeSlide?.caption || scenario.surfaceConflict)}</p>
                    ${activeSlide?.quote ? `<blockquote class="scenario-story-quote">"${escapeHtml(activeSlide.quote)}"</blockquote>` : ''}
                  </div>
                  <div class="scenario-story-focus-box">
                    <span class="scenario-story-focus-label">מה מחפשים עכשיו</span>
                    <strong>${escapeHtml(scenario.metaModelCore.hiddenGap)}</strong>
                    <span>${escapeHtml(scenario.deepeningQuestion)}</span>
                  </div>
                </div>
                <div class="scenario-story-chip-row" role="tablist" aria-label="פריימים של הסיפור">
                  ${renderStoryFrameChips(scenario, activeSlide)}
                </div>
              </div>
            </article>

            <section class="scenario-play-options-card">
              <div class="scenario-play-options-head">
                <p class="scenario-panel-kicker">בחירת תגובה</p>
                <h3>מה תגיד/י עכשיו?</h3>
                <p>הסיפור נשאר קבוע למעלה. התגובה שבוחרים כאן קובעת איך הסצנה תזוז הלאה.</p>
              </div>
              <div class="scenario-compact-options-grid">
                ${options.map((option) => renderCompactPlayOption(option)).join('')}
              </div>
              <details class="scenario-meta-accordion scenario-meta-accordion--inline">
                <summary>מה בודקים בסצנה הזאת</summary>
                <div class="scenario-meta-accordion-body">
                  <p>${escapeHtml(scenario.learningFocus)}</p>
                  <p><strong>שאלת דיוק:</strong> ${escapeHtml(scenario.deepeningQuestion)}</p>
                </div>
              </details>
            </section>
          </section>
        `;
    }

    /* renderFeedbackActionBar — removed: action bar is now inline in renderFeedbackScreen */

    function renderBlueprintDetails(scenario, isGreen) {
        const bp = scenario.greenBlueprint || {};
        const prismItems = state.settings.prismWheelEnabled && isGreen && Array.isArray(state.data.prismWheel) ? state.data.prismWheel : [];
        const selectedPrism = prismItems.find((item) => item.id === state.selectedPrismId) || null;
        return `
            <div class="scenario-tote-grid">
              <div class="scenario-tote-slot"><h5>מה נשאר עמום</h5><p>${escapeHtml(scenario.metaModelCore.hiddenGap)}</p></div>
              <div class="scenario-tote-slot"><h5>צעד ראשון קטן</h5><p>${escapeHtml(scenario.microPlan.firstStep)}</p></div>
              <div class="scenario-tote-slot"><h5>צוואר הבקבוק</h5><p>${escapeHtml(scenario.microPlan.bottleneck)}</p></div>
              <div class="scenario-tote-slot"><h5>סימן הצלחה</h5><p>${escapeHtml(scenario.microPlan.successSign)}</p></div>
            </div>
            <div class="scenario-green-box">
              <h4>המשפט הירוק</h4>
              <p>${escapeHtml(getGreenOptionText(scenario))}</p>
              <button type="button" class="btn btn-secondary" data-scenario-action="copy-green">העתק</button>
            </div>
            ${prismItems.length ? renderPrismWheel(prismItems, selectedPrism) : ''}
        `;
    }

    function renderFeedbackScreen(forceAnalysisOpen = false) {
        const scenario = state.activeScenario;
        const option = state.selectedOption;
        if (!scenario || !option) return renderPlayScreenV2();
        const isGreen = Number(option.score) === 1;
        const guide = buildFeedbackGuide(scenario, option, isGreen);
        const analysisOpen = !!forceAnalysisOpen;
        return `
          <section class="scenario-workspace-card" data-scenario-feedback-thread="1">
            <div class="scenario-feedback-mark ${isGreen ? 'green' : 'red'}">${isGreen ? '✓' : '!'}</div>
            <div class="scenario-feedback-summary-card">
              <p class="scenario-feedback-kind">${escapeHtml(isGreen ? 'פותחת מקום לבדיקה' : 'כנראה תסגור את השיחה')}</p>
              <h3>${escapeHtml(guide.headline)}</h3>
              <p>${escapeHtml(isGreen ? option.whyItWorks : option.whyItHurts)}</p>
            </div>
            <div class="scenario-feedback-thread">
              <div id="scenario-feedback-choice-bubble" class="scenario-bubble player selected ${isGreen ? 'green' : 'red'}">
                <span class="scenario-bubble-speaker">התשובה שלך</span>
                <p>${escapeHtml(option.speakerLine)}</p>
              </div>
              <div id="scenario-feedback-other-bubble" class="scenario-bubble other followup">
                <span class="scenario-bubble-speaker">התגובה שמולך</span>
                <p>${escapeHtml(option.likelyOtherReply)}</p>
              </div>
            </div>
            <div class="scenario-impact-grid">
              <article class="scenario-impact-card" data-scenario-impact="emotion">
                <h4>${escapeHtml(isGreen ? 'יש מקום לנשום ולהקשיב' : 'כנראה תלחיץ או תכווץ')}</h4>
                <p>${escapeHtml(guide.emotionalImpact)}</p>
              </article>
              <article class="scenario-impact-card" data-scenario-impact="process">
                <h4>${escapeHtml(isGreen ? 'השיחה עוברת לבדיקה' : 'הבעיה נשארת בלי שם')}</h4>
                <p>${escapeHtml(guide.processImpact)}</p>
              </article>
            </div>
            <div class="scenario-consequence-box ${isGreen ? 'green' : 'red'}" data-scenario-consequence="1">
              <h4>${escapeHtml(isGreen ? 'איך ממשיכים מכאן' : 'מה אפשר לנסות במקום')}</h4>
              <p>${escapeHtml(guide.nextMove)}</p>
            </div>
            ${renderTherapeuticGuideCard(scenario, option, guide, isGreen)}
            <div class="scenario-feedback-actions scenario-feedback-actions--primary">
              <button type="button" class="btn btn-secondary" data-scenario-action="show-blueprint">${analysisOpen ? 'סגור מפת פעולה' : 'פתח מפת פעולה'}</button>
              <button type="button" class="btn btn-primary" data-scenario-action="continue-result">לסיכום הסצנה</button>
            </div>
            <details class="scenario-meta-accordion">
              <summary>מה היה עמום / מה נפתח כאן</summary>
              <div class="scenario-meta-accordion-body">
                <p>${escapeHtml(guide.metaModelExplanation)}</p>
                <p><strong>הפועל/המהלך העמום:</strong> ${escapeHtml(scenario.metaModelCore.unspecifiedVerb)}</p>
                <p><strong>מה נשאר חסר:</strong> ${escapeHtml(scenario.metaModelCore.hiddenGap)}</p>
                <p><strong>שאלת העמקה:</strong> ${escapeHtml(scenario.deepeningQuestion)}</p>
              </div>
            </details>
            <details class="scenario-meta-accordion" ${analysisOpen ? 'open data-scenario-analysis="1"' : ''}>
              <summary>ניתוח מעמיק — מפת פעולה</summary>
              <div class="scenario-meta-accordion-body">
                ${renderBlueprintDetails(scenario, isGreen)}
              </div>
            </details>
          </section>
        `;
    }

    /* renderSupportRail — removed: content moved to collapsible sections in main flow */

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
        if (!entry || !state.session) return renderHomeScreenV2();
        const playedCount = state.session.index + 1;
        const starVisual = '⭐'.repeat(state.session.stars) + '☆'.repeat(Math.max(playedCount - state.session.stars, 0));
        const isLast = state.session.index >= state.session.queue.length - 1;
        return `
          <section class="scenario-workspace-card">
            <div class="scenario-stars-row">${escapeHtml(starVisual || '☆☆☆☆☆')}</div>
            <p class="scenario-score-line">סצנה ${escapeHtml(playedCount)}/${escapeHtml(state.session.queue.length)} · ${escapeHtml(state.session.score)} נקודות</p>
            <div class="scenario-consequence-box green">
              <h4>המשפט הירוק לשיחה אמיתית</h4>
              <p>"${escapeHtml(entry.greenSentence)}"</p>
            </div>
            <div class="scenario-feedback-actions scenario-feedback-actions--primary">
              <button type="button" class="btn btn-primary" data-scenario-action="next-scene">${isLast ? 'סיום סשן' : 'סצנה הבאה'}</button>
              <button type="button" class="btn btn-secondary" data-scenario-action="go-home">חזרה לבית</button>
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
        if (trainerAction === 'start-session') return void startSelectedScenario();
        if (trainerAction === 'open-settings') return void openSettings();
        if (trainerAction === 'close-settings') return void closeSettings();
        if (trainerAction === 'save-settings') return void saveSettingsFromDraft(false);
        if (trainerAction === 'save-start') return void saveSettingsFromDraft(true);
        if (scenarioAction === 'select-scenario') return void setSelectedScenario(button.getAttribute('data-scenario-id'));
        if (scenarioAction === 'open-help') return void openScreen(SCREEN_IDS.help);
        if (scenarioAction === 'open-history') return void openScreen(SCREEN_IDS.history);
        if (scenarioAction === 'pick-story-slide') return void setActiveStorySlide(button.getAttribute('data-story-slide-id'));
        if (scenarioAction === 'pick-option') {
            const optionId = button.getAttribute('data-option-id');
            return void pickOption(optionId);
        }
        if (scenarioAction === 'add-meta-model-turn') return void addMetaModelTurn();
        if (scenarioAction === 'open-investigation') return void openInvestigationScreen();
        if (scenarioAction === 'show-blueprint') return void toggleBlueprintScreen();
        if (scenarioAction === 'continue-result') return void continueFromResult();
        if (scenarioAction === 'restart-scene') return void restartCurrentScene();
        if (scenarioAction === 'next-scene') return void continueToNextScene();
        if (scenarioAction === 'resume-scene') return void openScreen(SCREEN_IDS.play, { preserveScroll: true });
        if (scenarioAction === 'go-home') return void goFeatureStart();
        if (scenarioAction === 'go-back') return void goBackScreen();
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

    function getOptionButtonFromTarget(target) {
        return target instanceof Element
            ? target.closest('button[data-scenario-action="pick-option"][data-option-id]')
            : null;
    }

    function handleMouseOver(event) {
        if (state.screen !== SCREEN_IDS.play || !supportsHoverPreview()) return;
        const button = getOptionButtonFromTarget(event.target);
        if (!button) return;
        setPreviewedOption(button.getAttribute('data-option-id'));
    }

    function handleMouseOut(event) {
        if (state.screen !== SCREEN_IDS.play || !supportsHoverPreview()) return;
        const button = getOptionButtonFromTarget(event.target);
        if (!button) return;
        const nextButton = getOptionButtonFromTarget(event.relatedTarget);
        if (nextButton) return;
        clearPreviewedOption();
    }

    function handleFocusIn(event) {
        if (state.screen !== SCREEN_IDS.play || !supportsHoverPreview()) return;
        const button = getOptionButtonFromTarget(event.target);
        if (!button) return;
        setPreviewedOption(button.getAttribute('data-option-id'));
    }

    function handleFocusOut(event) {
        if (state.screen !== SCREEN_IDS.play || !supportsHoverPreview()) return;
        const nextButton = getOptionButtonFromTarget(event.relatedTarget);
        if (nextButton) return;
        clearPreviewedOption();
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
