(function () {
    const ROOT_ID = 'blueprint-builder-root';
    const ROLE_LABELS = Object.freeze({ therapist: '׳׳˜׳₪׳/׳×', patient: '׳׳˜׳•׳₪׳/׳×', system: '׳”׳׳₪׳”' });
    const STATUS_LABELS = Object.freeze({ locked: '׳ ׳¢׳•׳', available: '׳–׳׳™׳', partial: '׳—׳׳§׳™', complete: '׳׳׳' });

    const STAGES = Object.freeze([
        { id: 'test1', label: 'TEST 1 | מה רוצים במקום?', subLabel: 'Clarify outcome', tone: 'cool', defaultOpen: true },
        { id: 'operateBuild', label: 'OPERATE | Build the action', subLabel: 'Make it visible', tone: 'amber', defaultOpen: false },
        { id: 'operateProtect', label: 'OPERATE | Protection & flexibility', subLabel: 'Keep safety', tone: 'sand', defaultOpen: false },
        { id: 'test2', label: 'TEST 2 | Is the plan good?', subLabel: 'Quality checks', tone: 'mint', defaultOpen: false },
        { id: 'exit', label: 'EXIT | Commit & close', subLabel: 'Commitment', tone: 'sage', defaultOpen: false }
    ]);
    const STAGE_BY_ID = Object.freeze(STAGES.reduce((acc, stage) => { acc[stage.id] = stage; return acc; }, {}));
    const SEED_PATH = 'data/action-blueprint/action_verbs_seed_he.json';
    const SUGGESTION_KEY_BY_NODE = Object.freeze({
        rawStatement: 'raw_statement_options',
        desiredOutcome: 'desired_outcome_options',
        successSign: 'success_sign_options',
        positiveIntention: 'positive_intention_options',
        goalImagery: 'goal_imagery_options',
        processImagery: 'process_imagery_options',
        visibleAction: 'visible_action_options',
        emotionalDriver: 'emotional_driver_options',
        executionConditions: 'execution_conditions_options',
        obstacle: 'obstacle_options',
        alternativePlan: 'alternative_plan_options',
        preservePositiveIntention: 'preserve_positive_intention_options',
        clearCheck: 'clear_check_options',
        realisticCheck: 'realistic_check_options',
        measurableCheck: 'measurable_check_options',
        firstStepImagery: 'first_step_imagery_options',
        firstStep: 'first_step_options',
        finalWording: 'final_wording_options'
    });

    const NODES = Object.freeze([
        Object.freeze({
            id: 'desiredOutcome',
            stage: 'test1',
            icon: '📍',
            label: 'Desired Outcome',
            shortLabel: 'יעד',
            subgroup: 'clarify',
            recommendedOrder: 1,
            hardPrerequisites: Object.freeze([]),
            orderPrerequisites: Object.freeze([]),
            wrongOrderPenalty: 0,
            imageryType: '',
            positiveIntentionRelated: false,
            questionTemplates: Object.freeze([
                'אם זה יעבוד טוב יותר, מה בדיוק נראה או נשמע במקום המצב הנוכחי?',
                'מהי גרסה חיובית ומציאותית של מה שהמטופל/ת רוצה?'
            ]),
            followUpTemplates: Object.freeze([
                'מה עוד צריך להיות שם כדי שהיעד יהיה ברור וממשי?'
            ]),
            composerPlaceholder: 'כתבו יעד חיובי, ברור ומציאותי.',
            captureKey: 'desiredOutcome',
            minWords: 4,
            minChars: 18,
            summaryFormatter: (text) => text
        }),
        Object.freeze({
            id: 'successSign',
            stage: 'test1',
            icon: '✅',
            label: 'Success Sign',
            shortLabel: 'סימן הצלחה',
            subgroup: 'clarify',
            recommendedOrder: 2,
            hardPrerequisites: Object.freeze([]),
            orderPrerequisites: Object.freeze(['desiredOutcome']),
            wrongOrderPenalty: 3,
            imageryType: '',
            positiveIntentionRelated: false,
            questionTemplates: Object.freeze([
                'איך נדע שזה מתחיל לעבוד? מה יראו או ישמעו אחרת?',
                'מה הסימן הראשון שמראה שהיעד קורה?'
            ]),
            followUpTemplates: Object.freeze([
                'מה עוד ייחשב הצלחה קטנה ומדידה?'
            ]),
            composerPlaceholder: 'כתבו סימן זיהוי קטן שמראה שזה מתקדם.',
            captureKey: 'successSign',
            minWords: 3,
            minChars: 14,
            summaryFormatter: (text) => text
        }),
        Object.freeze({
            id: 'positiveIntention',
            stage: 'test1',
            icon: '🛡️',
            label: 'Positive Intention (Old Behavior)',
            shortLabel: 'כוונה חיובית',
            subgroup: 'clarify',
            recommendedOrder: 3,
            hardPrerequisites: Object.freeze([]),
            orderPrerequisites: Object.freeze([]),
            wrongOrderPenalty: 4,
            imageryType: '',
            positiveIntentionRelated: true,
            questionTemplates: Object.freeze([
                'מה ההתנהגות הישנה ניסתה להגן או להשיג עבורך?',
                'איזו כוונה טובה הסתתרה מאחורי ההימנעות או הקיפאון?'
            ]),
            followUpTemplates: Object.freeze([
                'איך אפשר לנסח את הכוונה הטובה בשפה שמכבדת את ההגנה?'
            ]),
            composerPlaceholder: 'כתבו את הכוונה הטובה של ההתנהגות הישנה.',
            captureKey: 'positiveIntention',
            minWords: 3,
            minChars: 14,
            summaryFormatter: (text) => text
        }),
        Object.freeze({
            id: 'goalImagery',
            stage: 'test1',
            icon: '🖼️',
            label: 'Goal Imagery',
            shortLabel: 'דימוי יעד',
            subgroup: 'imagery',
            recommendedOrder: 4,
            hardPrerequisites: Object.freeze(['desiredOutcome']),
            orderPrerequisites: Object.freeze(['desiredOutcome']),
            wrongOrderPenalty: 4,
            imageryType: 'goal',
            positiveIntentionRelated: false,
            questionTemplates: Object.freeze([
                'אפשר לדמיין את היעד? איך הוא נראה/נשמע/מרגיש?',
                'אם קשה לדמיין, מהי גרסה קטנה יותר שניתנת לדמיון?'
            ]),
            followUpTemplates: Object.freeze([
                'מה חסר בדימוי כדי שיהיה אמין ובטוח?'
            ]),
            composerPlaceholder: 'תארו תמונה או תחושה של היעד.',
            captureKey: 'goalImagery',
            minWords: 3,
            minChars: 14,
            summaryFormatter: (text) => text
        }),
        Object.freeze({
            id: 'processImagery',
            stage: 'test1',
            icon: '🖼️',
            label: 'Process Imagery',
            shortLabel: 'דימוי תהליך',
            subgroup: 'imagery',
            recommendedOrder: 5,
            hardPrerequisites: Object.freeze(['desiredOutcome']),
            orderPrerequisites: Object.freeze(['desiredOutcome']),
            wrongOrderPenalty: 4,
            imageryType: 'process',
            positiveIntentionRelated: false,
            questionTemplates: Object.freeze([
                'אפשר לדמיין את עצמך עושה את התהליך? מה רואים בגוף או בסביבה?',
                'אם זה גדול מדי, איזה חלק זעיר ניתן לדמיין?'
            ]),
            followUpTemplates: Object.freeze([
                'מה הופך את הדימוי ליותר בטוח ובר-ביצוע?'
            ]),
            composerPlaceholder: 'תארו תמונה או תחושה של הדרך, לא רק היעד.',
            captureKey: 'processImagery',
            minWords: 3,
            minChars: 14,
            summaryFormatter: (text) => text
        }),
        Object.freeze({
            id: 'visibleAction',
            stage: 'operateBuild',
            icon: '👁️',
            label: 'Visible Action',
            shortLabel: 'פעולה',
            subgroup: 'build',
            recommendedOrder: 6,
            hardPrerequisites: Object.freeze([]),
            orderPrerequisites: Object.freeze(['desiredOutcome', 'successSign']),
            wrongOrderPenalty: 6,
            imageryType: '',
            positiveIntentionRelated: false,
            questionTemplates: Object.freeze([
                'מה פעולה נראית או נשמעת שתראה שהכוונה ירדה לקרקע?',
                'איזה צעד קטן ניתן לראות או לשמוע?'
            ]),
            followUpTemplates: Object.freeze([
                'אפשר לחדד כדי שיהיה ברור מבחוץ?'
            ]),
            composerPlaceholder: 'כתבו פעולה נראית או נשמעת, לא רק מחשבה.',
            captureKey: 'visibleAction',
            minWords: 4,
            minChars: 16,
            summaryFormatter: (text) => text
        }),
        Object.freeze({
            id: 'emotionalDriver',
            stage: 'operateBuild',
            icon: '❤️',
            label: 'Emotional Driver',
            shortLabel: 'מניע רגשי',
            subgroup: 'build',
            recommendedOrder: 7,
            hardPrerequisites: Object.freeze([]),
            orderPrerequisites: Object.freeze(['desiredOutcome', 'visibleAction']),
            wrongOrderPenalty: 6,
            imageryType: '',
            positiveIntentionRelated: false,
            questionTemplates: Object.freeze([
                'למה זה חשוב עכשיו? איזה צורך או ערך זה משרת?',
                'מה ירגיש טוב או יקל כשתעשה זאת?'
            ]),
            followUpTemplates: Object.freeze([
                'איזה משפט קצר יחבר אותך למניע ברגע אמת?'
            ]),
            composerPlaceholder: 'כתבו למה זה חשוב, רגשית או ערכית.',
            captureKey: 'emotionalDriver',
            minWords: 3,
            minChars: 14,
            summaryFormatter: (text) => text
        }),
        Object.freeze({
            id: 'executionConditions',
            stage: 'operateBuild',
            icon: '🗓️',
            label: 'Execution Conditions',
            shortLabel: 'תנאים',
            subgroup: 'build',
            recommendedOrder: 8,
            hardPrerequisites: Object.freeze([]),
            orderPrerequisites: Object.freeze(['desiredOutcome', 'visibleAction']),
            wrongOrderPenalty: 6,
            imageryType: '',
            positiveIntentionRelated: false,
            questionTemplates: Object.freeze([
                'מתי, איפה, עם מי ובאיזה הקשר זה יקרה?',
                'מה תנאי ההתחלה שמאפשרים ביצוע בטוח?'
            ]),
            followUpTemplates: Object.freeze([
                'מה עוד צריך להיות ידוע מראש (זמן, מקום, אדם)?'
            ]),
            composerPlaceholder: 'כתבו זמן/מקום/אנשים/טריגר לביצוע.',
            captureKey: 'executionConditions',
            minWords: 4,
            minChars: 16,
            summaryFormatter: (text) => text
        }),
        Object.freeze({
            id: 'obstacle',
            stage: 'operateProtect',
            icon: '⛔',
            label: 'Obstacle',
            shortLabel: 'חסם',
            subgroup: 'protect',
            recommendedOrder: 9,
            hardPrerequisites: Object.freeze([]),
            orderPrerequisites: Object.freeze(['desiredOutcome', 'visibleAction']),
            wrongOrderPenalty: 8,
            imageryType: '',
            positiveIntentionRelated: false,
            questionTemplates: Object.freeze([
                'מה עלול לחסום את זה בזמן אמת?',
                'איפה לרוב זה נתקע עבורך?'
            ]),
            followUpTemplates: Object.freeze([
                'מה החסם הכי סביר וקריטי כרגע?'
            ]),
            composerPlaceholder: 'כתבו חסם אחד או שניים סבירים.',
            captureKey: 'obstacle',
            minWords: 3,
            minChars: 14,
            summaryFormatter: (text) => text
        }),
        Object.freeze({
            id: 'alternativePlan',
            stage: 'operateProtect',
            icon: '🔀',
            label: 'Alternative / Plan B',
            shortLabel: 'חלופה',
            subgroup: 'protect',
            recommendedOrder: 10,
            hardPrerequisites: Object.freeze([]),
            orderPrerequisites: Object.freeze(['obstacle']),
            wrongOrderPenalty: 8,
            imageryType: '',
            positiveIntentionRelated: false,
            questionTemplates: Object.freeze([
                'אם החסם מופיע, מה Plan B שעדיין שומר על כיוון?',
                'מהי גרסה קטנה או גמישה יותר אם המהלך המלא קשה?'
            ]),
            followUpTemplates: Object.freeze([
                'איזו חלופה תהיה נגישה גם בהצפה?'
            ]),
            composerPlaceholder: 'כתבו חלופה גמישה, לא בריחה מוחלטת.',
            captureKey: 'alternativePlan',
            minWords: 3,
            minChars: 14,
            summaryFormatter: (text) => text
        }),
        Object.freeze({
            id: 'preservePositiveIntention',
            stage: 'operateProtect',
            icon: '🧭',
            label: 'Preserve Positive Intention',
            shortLabel: 'שימור הכוונה',
            subgroup: 'protect',
            recommendedOrder: 11,
            hardPrerequisites: Object.freeze(['positiveIntention']),
            orderPrerequisites: Object.freeze(['positiveIntention']),
            wrongOrderPenalty: 10,
            imageryType: '',
            positiveIntentionRelated: true,
            questionTemplates: Object.freeze([
                'איך נשמור על ההגנה או הכוונה הטובה בצורה בריאה יותר?',
                'מה ירגיש עדיין בטוח ומגן בלי ההימנעות הישנה?'
            ]),
            followUpTemplates: Object.freeze([
                'מה העדכון הבריא של ההגנה הישנה בתוך התוכנית החדשה?'
            ]),
            composerPlaceholder: 'תארו איך שומרים על ההגנה אבל בצורה תומכת ובריאה.',
            captureKey: 'preservePositiveIntention',
            minWords: 4,
            minChars: 16,
            summaryFormatter: (text) => text
        }),
        Object.freeze({
            id: 'clearCheck',
            stage: 'test2',
            icon: '✨',
            label: 'Clear?',
            shortLabel: 'בהיר?',
            subgroup: 'quality',
            recommendedOrder: 12,
            hardPrerequisites: Object.freeze([]),
            orderPrerequisites: Object.freeze(['visibleAction']),
            wrongOrderPenalty: 6,
            imageryType: '',
            positiveIntentionRelated: false,
            questionTemplates: Object.freeze([
                'האם התוכנית ספציפית מספיק? מה עוד צריך להבהיר?',
                'אם מישהו אחר יראה את זה, האם יבין מה עושים?'
            ]),
            followUpTemplates: Object.freeze([
                'מה משפט אחד שמחדד את הבהירות?'
            ]),
            composerPlaceholder: 'בדקו בהירות: מה לא ברור עדיין?',
            captureKey: 'clearCheck',
            minWords: 3,
            minChars: 14,
            summaryFormatter: (text) => text
        }),
        Object.freeze({
            id: 'realisticCheck',
            stage: 'test2',
            icon: '📏',
            label: 'Realistic?',
            shortLabel: 'ריאלי?',
            subgroup: 'quality',
            recommendedOrder: 13,
            hardPrerequisites: Object.freeze([]),
            orderPrerequisites: Object.freeze(['visibleAction', 'executionConditions']),
            wrongOrderPenalty: 6,
            imageryType: '',
            positiveIntentionRelated: false,
            questionTemplates: Object.freeze([
                'זה ריאלי בגודל, קצב ותנאים? מה צריך לפשט כדי שיהיה אפשרי השבוע?',
                'איזה חלק קטן יותר אפשרי אם זה גדול מדי?'
            ]),
            followUpTemplates: Object.freeze([
                'מה התאמה קטנה שתהפוך את זה לביצועי?'
            ]),
            composerPlaceholder: 'בדקו ריאליות: מה הופך את זה לאפשרי עכשיו?',
            captureKey: 'realisticCheck',
            minWords: 3,
            minChars: 14,
            summaryFormatter: (text) => text
        }),
        Object.freeze({
            id: 'measurableCheck',
            stage: 'test2',
            icon: '📊',
            label: 'Measurable?',
            shortLabel: 'מדיד?',
            subgroup: 'quality',
            recommendedOrder: 14,
            hardPrerequisites: Object.freeze([]),
            orderPrerequisites: Object.freeze(['successSign']),
            wrongOrderPenalty: 6,
            imageryType: '',
            positiveIntentionRelated: false,
            questionTemplates: Object.freeze([
                'איך נמדוד התקדמות קטנה? מה ייחשב ציון הצלחה?',
                'מה יקרה בגוף או בסביבה שיוכיח שזה נע?'
            ]),
            followUpTemplates: Object.freeze([
                'איזה סמן מדידה יחיד הכי פשוט לעקוב אחריו?'
            ]),
            composerPlaceholder: 'כתבו איך תזהו התקדמות קטנה.',
            captureKey: 'measurableCheck',
            minWords: 3,
            minChars: 14,
            summaryFormatter: (text) => text
        }),
        Object.freeze({
            id: 'firstStepImagery',
            stage: 'test2',
            icon: '🖼️',
            label: 'First Step Imagery',
            shortLabel: 'דימוי צעד ראשון',
            subgroup: 'imagery',
            recommendedOrder: 15,
            hardPrerequisites: Object.freeze(['firstStep']),
            orderPrerequisites: Object.freeze(['firstStep']),
            wrongOrderPenalty: 6,
            imageryType: 'firstStep',
            positiveIntentionRelated: false,
            questionTemplates: Object.freeze([
                'אפשר לדמיין את הצעד הראשון? מה רואים בגוף או בסביבה?',
                'אם לא, מה גרסה עוד יותר קטנה שניתנת לדמיון?'
            ]),
            followUpTemplates: Object.freeze([
                'מה צריך כדי שהדימוי יהיה בטוח וברור?'
            ]),
            composerPlaceholder: 'תארו איך נראה או נשמע צעד ראשון.',
            captureKey: 'firstStepImagery',
            minWords: 3,
            minChars: 14,
            summaryFormatter: (text) => text
        }),
        Object.freeze({
            id: 'firstStep',
            stage: 'exit',
            icon: '🪜',
            label: 'First Step',
            shortLabel: 'צעד ראשון',
            subgroup: 'exit',
            recommendedOrder: 16,
            hardPrerequisites: Object.freeze([]),
            orderPrerequisites: Object.freeze(['visibleAction', 'executionConditions']),
            wrongOrderPenalty: 10,
            imageryType: '',
            positiveIntentionRelated: false,
            questionTemplates: Object.freeze([
                'מה הצעד הראשון הקטן והבטוח שתעשה/י?',
                'מה תעשה/י היום או מחר כדי להתחיל?'
            ]),
            followUpTemplates: Object.freeze([
                'אפשר להפוך אותו לעוד יותר קטן וברור?'
            ]),
            composerPlaceholder: 'כתבו צעד ראשון ברור ובטוח.',
            captureKey: 'firstStep',
            minWords: 3,
            minChars: 14,
            summaryFormatter: (text) => text
        }),
        Object.freeze({
            id: 'finalWording',
            stage: 'exit',
            icon: '📝',
            label: 'Final Wording',
            shortLabel: 'ניסוח סופי',
            subgroup: 'exit',
            recommendedOrder: 17,
            hardPrerequisites: Object.freeze(['firstStep']),
            orderPrerequisites: Object.freeze(['firstStep']),
            wrongOrderPenalty: 6,
            imageryType: '',
            positiveIntentionRelated: false,
            questionTemplates: Object.freeze([
                'נסח/י משפט מחויבות קצר שמחזיק את התוכנית וההגנה הבריאה.',
                'איך תאמר/י את זה בקול לעצמך או למישהו אחר?'
            ]),
            followUpTemplates: Object.freeze([
                'אפשר לקצר עוד יותר כדי שיישמע טבעי?'
            ]),
            composerPlaceholder: 'כתבו ניסוח מחויבות קצר וברור.',
            captureKey: 'finalWording',
            minWords: 3,
            minChars: 12,
            summaryFormatter: (text) => text
        })
    ]);
    const NODE_BY_ID = Object.freeze(NODES.reduce((acc, node) => { acc[node.id] = node; return acc; }, {}));
    let root = null;
    let state = null;
    let messageId = 0;

    function esc(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function clean(value) {
        return String(value || '').replace(/\s+/g, ' ').trim();
    }

    function countWords(value) {
        return clean(value).split(/\s+/).filter(Boolean).length;
    }

    function shorten(value, max = 100) {
        const text = clean(value);
        return text.length <= max ? text : `${text.slice(0, max - 1).trim()}ג€¦`;
    }

    function joinNatural(items) {
        const cleanItems = (items || []).map((item) => clean(item)).filter(Boolean);
        if (!cleanItems.length) return '';
        if (cleanItems.length === 1) return cleanItems[0];
        if (cleanItems.length === 2) return `${cleanItems[0]} ׳•-${cleanItems[1]}`;
        return `${cleanItems.slice(0, -1).join(', ')} ׳•-${cleanItems[cleanItems.length - 1]}`;
    }

    function timebox(value) {
        const text = clean(value);
        const match = text.match(/(\d+\s*(?:׳“׳§׳•׳×|׳“׳§׳”|׳©׳¢׳•׳×|׳©׳¢׳”|׳™׳׳™׳|׳™׳•׳))/);
        return match ? match[1] : text;
    }

    function msg(role, text, opts = {}) {
        messageId += 1;
        return { id: `bp-msg-${messageId}`, role, text: clean(text), nodeId: clean(opts.nodeId), tone: clean(opts.tone) || 'default' };
    }

    let seedsPromise = null;

    function ensureSeedsLoaded() {
        if (state?.seedLoaded) return Promise.resolve(state.verbSeeds);
        if (!seedsPromise) {
            seedsPromise = fetch(SEED_PATH)
                .then((res) => (res.ok ? res.json() : []))
                .catch(() => [])
                .then((list) => (Array.isArray(list) ? list : []));
        }
        return seedsPromise.then((list) => {
            state.verbSeeds = list;
            state.seedLoaded = true;
            if (!state.selectedVerbId && list.length) state.selectedVerbId = clean(list[0].id || '');
            return state.verbSeeds;
        });
    }

    function activeVerb() {
        const verbId = clean(state?.selectedVerbId);
        return (state?.verbSeeds || []).find((item) => clean(item.id) === verbId) || null;
    }

    function optionsForNode(nodeId) {
        const seed = activeVerb();
        const key = SUGGESTION_KEY_BY_NODE[nodeId];
        const values = key && seed ? seed[key] : null;
        return Array.isArray(values) ? values.filter(Boolean) : [];
    }

    function rawStatementOptions() {
        const seed = activeVerb();
        return seed && Array.isArray(seed.raw_statement_options) ? seed.raw_statement_options.filter(Boolean) : [];
    }

    function selectVerb(verbId) {
        const normalized = clean(verbId);
        const next = (state.verbSeeds || []).find((item) => clean(item.id) === normalized);
        if (!next) return false;
        state.selectedVerbId = normalized;
        if (!clean(state.rawStatement) && Array.isArray(next.raw_statement_options) && next.raw_statement_options.length) {
            state.rawStatement = clean(next.raw_statement_options[0]);
            queue('patient', state.rawStatement, { tone: 'statement' });
        }
        render();
        return true;
    }

    function toggleStage(stageId) {
        if (!state?.stageOpen) return;
        if (state.stageOpen[stageId] == null) return;
        state.stageOpen[stageId] = !state.stageOpen[stageId];
        render();
    }

    function initialState() {
        messageId = 0;
        return {
            rawStatement: '',
            activeNodeId: '',
            nodeAnswers: {},
            askedOrder: [],
            orderEvents: {},
            stageOpen: STAGES.reduce((acc, stage) => { acc[stage.id] = Boolean(stage.defaultOpen); return acc; }, {}),
            selectedVerbId: '',
            verbSeeds: [],
            seedLoaded: false,
            messages: [
                msg('therapist', '׳”׳‘׳™׳׳• ׳׳›׳׳ ׳×׳׳•׳ ׳”, ׳׳©׳׳׳”, ׳”׳™׳׳ ׳¢׳•׳× ׳׳• ׳₪׳•׳¢׳ ׳¢׳׳•׳. ׳׳©׳ ׳ ׳‘׳ ׳” ׳׳”׳׳ ׳˜׳™׳₪׳•׳׳™ ׳¦׳¢׳“-׳¦׳¢׳“.', { tone: 'intro' }),
                msg('system', '׳׳—׳¨׳™ ׳”׳׳©׳₪׳˜ ׳”׳’׳•׳׳׳™ ׳׳•׳—׳¦׳™׳ ׳¢׳ ׳¦׳•׳׳× ׳‘׳׳₪׳”. ׳›׳ ׳׳—׳™׳¦׳” ׳׳™׳™׳¦׳¨׳× ׳©׳׳׳” ׳‘׳¦׳³׳׳˜, ׳•׳›׳ ׳×׳©׳•׳‘׳” ׳ ׳©׳׳¨׳× ׳—׳–׳¨׳” ׳׳׳₪׳”.', { tone: 'info' })
            ]
        };
    }

    function answer(id) {
        return state?.nodeAnswers?.[id] || { text: '', status: 'available', score: 0, history: [] };
    }

    function hasMeaning(id) {
        const current = answer(id);
        return current.status === 'partial' || current.status === 'complete';
    }

    function unlocked(node) {
        if (!clean(state?.rawStatement)) return false;
        return (node.hardPrerequisites || []).every((id) => hasMeaning(id));
    }

    function nodeStatus(node) {
        const current = answer(node.id);
        if (current.status === 'complete') return 'complete';
        if (current.status === 'partial') return 'partial';
        return unlocked(node) ? 'available' : 'locked';
    }

    function evaluate(node, value) {
        const text = clean(value);
        if (!text) return { status: 'available', score: 0 };
        let score = 0.38;
        let statusName = 'partial';
        if (countWords(text) >= node.minWords && text.length >= node.minChars) {
            score = 1;
            statusName = 'complete';
        } else if (countWords(text) >= Math.max(3, Math.ceil(node.minWords * 0.6)) || text.length >= Math.max(14, Math.floor(node.minChars * 0.6))) {
            score = 0.58;
        }
        if (clean(state?.rawStatement) && text === clean(state.rawStatement)) {
            score = Math.min(score, 0.42);
            statusName = 'partial';
        }
        return { status: statusName, score };
    }

    function recommendedNextId() {
        if (!clean(state?.rawStatement)) return '';
        const sorted = NODES.slice().sort((a, b) => a.recommendedOrder - b.recommendedOrder);
        for (const node of sorted) {
            const currentStatus = nodeStatus(node);
            if (currentStatus === 'locked') continue;
            if (currentStatus !== 'complete') return node.id;
        }
        return '';
    }

    function completenessScore() {
        return Math.round((NODES.reduce((sum, node) => sum + Number(answer(node.id).score || 0), 0) / NODES.length) * 100);
    }

    function orderScore() {
        if (!state?.askedOrder?.length) return 100;
        const penalty = Object.values(state.orderEvents || {}).reduce((sum, item) => sum + Number(item?.penalty || 0), 0);
        return Math.max(0, 100 - penalty);
    }

    function stageLabel() {
        const raw = clean(state?.rawStatement);
        const completeness = completenessScore();
        if (!raw) return '׳׳™׳¡׳•׳£ ׳׳©׳₪׳˜ ׳’׳•׳׳׳™';
        if (completeness < 25) return '׳׳’׳“׳™׳¨׳™׳ ׳™׳¢׳“ ׳•׳₪׳¢׳•׳׳”';
        if (completeness < 50) return '׳׳•׳¦׳׳™׳ ׳׳ ׳™׳¢ ׳•׳—׳¡׳׳™׳';
        if (completeness < 75) return '׳‘׳•׳ ׳™׳ ׳—׳׳•׳₪׳•׳× ׳•׳×׳ ׳׳™׳';
        if (completeness < 100) return '׳¡׳•׳’׳¨׳™׳ ׳¦׳¢׳“ ׳¨׳׳©׳•׳ ׳•׳‘׳“׳™׳§׳× ׳¡׳™׳•׳';
        return '׳׳₪׳× ׳₪׳¢׳•׳׳” ׳׳•׳›׳ ׳”';
    }

    function formattedLabels(ids) {
        return joinNatural((ids || []).map((id) => NODE_BY_ID[id]?.label || ''));
    }

    function queue(role, text, opts) {
        state.messages.push(msg(role, text, opts));
    }

    function recordOrder(node) {
        if (state.orderEvents[node.id]) return state.orderEvents[node.id];
        const misses = Array.from(new Set([]
            .concat((node.orderPrerequisites || []).filter((id) => !hasMeaning(id)))
            .concat(NODES.filter((entry) => entry.recommendedOrder < node.recommendedOrder).filter((entry) => !hasMeaning(entry.id)).map((entry) => entry.id))
        ));
        const penalty = Math.min(36, misses.length * 4 + (misses.length ? node.wrongOrderPenalty : 0));
        const event = {
            penalty,
            wasEarly: penalty > 0,
            note: penalty > 0
                ? `׳”׳©׳׳׳” "${node.label}" ׳ ׳©׳׳׳” ׳׳₪׳ ׳™ ׳©׳ ׳¡׳’׳¨׳• ${formattedLabels(misses)}. ׳–׳” ׳׳₪׳©׳¨׳™, ׳׳‘׳ ׳׳₪׳—׳™׳× ׳׳× ׳¦׳™׳•׳ ׳”׳¡׳“׳¨.`
                : `׳‘׳—׳™׳¨׳” ׳˜׳•׳‘׳”: "${node.label}" ׳ ׳©׳׳׳” ׳‘׳–׳׳ ׳©׳׳§׳“׳ ׳׳”׳׳ ׳˜׳™׳₪׳•׳׳™ ׳™׳¦׳™׳‘.`
        };
        state.askedOrder.push(node.id);
        state.orderEvents[node.id] = event;
        return event;
    }

    function nextQuestion(node) {
        const current = answer(node.id);
        const pool = current.history && current.history.length && node.followUpTemplates.length ? node.followUpTemplates : node.questionTemplates;
        return pool[(current.history || []).length % pool.length] || pool[0];
    }

    function transformedOutcome(data) {
        if (clean(data.desiredOutcome)) return data.desiredOutcome;
        if (clean(data.rawStatement)) return `׳‘׳׳§׳•׳ "${data.rawStatement}" ׳¢׳“׳™׳™׳ ׳¦׳¨׳™׳ ׳׳ ׳¡׳— ׳™׳¢׳“ ׳—׳™׳•׳‘׳™ ׳•׳‘׳¨׳•׳¨ ׳™׳•׳×׳¨.`;
        return '׳”׳™׳¢׳“ ׳”׳—׳™׳•׳‘׳™ ׳¢׳•׳“ ׳׳ ׳ ׳•׳¡׳—.';
    }

    function commitment(data) {
        const parts = [];
        if (data.desiredOutcome) parts.push(data.desiredOutcome);
        if (data.firstStep) parts.push(`מתחיל/ה ב-${data.firstStep}`);
        if (data.executionConditions) parts.push(`בתנאי ${data.executionConditions}`);
        if (data.preservePositiveIntention) parts.push(`תוך שמירה על ${data.preservePositiveIntention}`);
        if (data.finalWording) parts.push(data.finalWording);
        return parts.length ? parts.join(' · ') : 'כשהיעד, הפעולה והצעד הראשון כתובים, החיבור ביניהם מייצר מחויבות מעשית.';
    }

    function therapistSummary(data) {
        const lines = [];
        if (data.rawStatement) lines.push(`׳”׳׳©׳₪׳˜ ׳”׳’׳•׳׳׳™ ׳”׳•׳ "${data.rawStatement}".`);
        if (data.desiredOutcome) lines.push(`׳”׳™׳¢׳“ ׳©׳ ׳‘׳ ׳” ׳”׳•׳ "${data.desiredOutcome}".`);
        if (data.successSign) lines.push(`׳¡׳™׳׳ן ׳”׳”׳¦׳׳—׳”: ${data.successSign}.`);
        if (data.positiveIntention) lines.push(`׳›׳•׳•׳ ׳” ׳—׳™׳•׳‘׳™׳× ׳©׳ ׳ ׳©׳ž׳¢ ׳׳×׳—׳™׳׳: ${data.positiveIntention}.`);
        if (data.preservePositiveIntention) lines.push(`׳”׳¦׳¢׳ ׳׳©׳׳¨ ׳׳ª ׳”׳›׳•׳•׳ ׳” ׳‘׳×׳•׳¨׳ ׳‚׳׳׳×: ${data.preservePositiveIntention}.`);
        if (data.visibleAction) lines.push(`׳₪׳¢׳•׳׳” ׳ ׳¨׳׳™׳×: ${data.visibleAction}.`);
        if (data.emotionalDriver) lines.push(`׳ž׳ ׳™׳¢ ׳¨׳’׳©׳™: ${data.emotionalDriver}.`);
        if (data.executionConditions) lines.push(`׳×׳ ׳׳™ ׳‘׳™׳¦׳•׳¢: ${data.executionConditions}.`);
        if (data.obstacle) lines.push(`׳—׳¡׳ ׳’׳“׳•׳: ${data.obstacle}.`);
        if (data.alternativePlan) lines.push(`Plan B: ${data.alternativePlan}.`);
        if (data.clearCheck) lines.push(`׳‘׳”׳™׳¨׳•׳×: ${data.clearCheck}.`);
        if (data.realisticCheck) lines.push(`׳¨׳™׳׳׳™׳•׳ª: ${data.realisticCheck}.`);
        if (data.measurableCheck) lines.push(`׳ž׳“׳™׳“׳•׳ª: ${data.measurableCheck}.`);
        if (data.firstStepImagery) lines.push(`׳“׳™׳ž׳•׳™ ׳¦׳¢׳“ ׳¨׳׳©׳•׳: ${data.firstStepImagery}.`);
        if (data.firstStep) lines.push(`׳¦׳¢׳“ ׳¨׳׳©׳•׳: "${data.firstStep}".`);
        if (data.finalWording) lines.push(`׳ ׳™׳¡׳•׳— ׳¡׳•׳£׳™: "${data.finalWording}".`);
        return lines.join(' ') || '׳”׳׳₪׳” ׳¢׳“׳™׳™׳ ׳ ׳‘׳ ׳™׳× ׳׳×׳•׳ ׳”׳©׳™׳—׳”.';
    }

    function guidedImagery(data) {
        return [
            data.goalImagery || 'דמיינו את קצה המסלול אחרי שינוי קטן.',
            data.processImagery || 'ראו אתכם עושים גרסה קטנה ובטוחה של התהליך.',
            data.firstStepImagery || `דמיינו את הצעד הראשון "${data.firstStep || 'קטן וברור'}".`,
            data.preservePositiveIntention || data.positiveIntention
                ? `שימרו בראש את ההגנה: ${data.preservePositiveIntention || data.positiveIntention}.`
                : ''
        ].filter(Boolean).join(' ');
    }

    function snapshot() {
        const rawStatement = clean(state?.rawStatement);
        const data = {
            rawStatement,
            action: rawStatement,
            desiredOutcome: clean(answer('desiredOutcome').text),
            successSign: clean(answer('successSign').text),
            positiveIntention: clean(answer('positiveIntention').text),
            goalImagery: clean(answer('goalImagery').text),
            processImagery: clean(answer('processImagery').text),
            visibleAction: clean(answer('visibleAction').text),
            emotionalDriver: clean(answer('emotionalDriver').text),
            executionConditions: clean(answer('executionConditions').text),
            obstacle: clean(answer('obstacle').text),
            alternativePlan: clean(answer('alternativePlan').text),
            preservePositiveIntention: clean(answer('preservePositiveIntention').text),
            clearCheck: clean(answer('clearCheck').text),
            realisticCheck: clean(answer('realisticCheck').text),
            measurableCheck: clean(answer('measurableCheck').text),
            firstStepImagery: clean(answer('firstStepImagery').text),
            firstStep: clean(answer('firstStep').text),
            finalWording: clean(answer('finalWording').text),
            time: timebox(answer('executionConditions').text) || 'חלון זמן שיתווסף בהמשך',
            completedNodes: NODES.filter((node) => nodeStatus(node) === 'complete').length,
            partialNodes: NODES.filter((node) => nodeStatus(node) === 'partial').length,
            completenessScore: completenessScore(),
            orderScore: orderScore(),
            combinedScore: Math.round((completenessScore() + orderScore()) / 2),
            askedOrder: state?.askedOrder ? state.askedOrder.slice() : [],
            orderEvents: state?.orderEvents ? Object.assign({}, state.orderEvents) : {},
            conversation: state?.messages ? state.messages.slice() : []
        };
        data.transformedOutcome = transformedOutcome(data);
        data.conciseCommitment = commitment(data);
        data.therapistSummary = therapistSummary(data);
        data.guidedImagery = guidedImagery(data);
        return data;
    }

    function askNode(id) {
        const node = NODE_BY_ID[id];
        if (!node) return;
        if (!clean(state.rawStatement)) {
            queue('system', '׳§׳•׳“׳ ׳©׳•׳׳¨׳™׳ ׳›׳׳ ׳׳× ׳”׳׳©׳₪׳˜ ׳”׳’׳•׳׳׳™, ׳•׳¨׳§ ׳׳—׳¨ ׳›׳ ׳”׳׳₪׳” ׳ ׳₪׳×׳—׳× ׳׳©׳׳׳•׳×.', { tone: 'warn' });
            return render();
        }
        if (!unlocked(node)) {
            queue('system', `׳”׳¦׳•׳׳× "${node.label}" ׳ ׳₪׳×׳— ׳¨׳§ ׳׳—׳¨׳™ ${formattedLabels(node.hardPrerequisites)}.`, { tone: 'warn', nodeId: node.id });
            return render();
        }
        state.activeNodeId = node.id;
        const orderEvent = recordOrder(node);
        queue('therapist', nextQuestion(node), { tone: 'prompt', nodeId: node.id });
        queue('system', orderEvent.note, { tone: orderEvent.wasEarly ? 'warn' : 'success', nodeId: node.id });
        render();
    }

    function submit(text) {
        const value = clean(text);
        if (!value) {
            queue('system', '׳›׳“׳™ ׳׳©׳׳•׳¨ ׳׳©׳”׳• ׳‘׳׳₪׳” ׳¦׳¨׳™׳ ׳×׳©׳•׳‘׳” ׳׳—׳× ׳‘׳¨׳•׳¨׳” ׳‘׳¦׳³׳׳˜.', { tone: 'warn' });
            return render();
        }
        if (!clean(state.rawStatement)) {
            state.rawStatement = value;
            queue('patient', value, { tone: 'statement' });
            const nextId = recommendedNextId();
            if (nextId) queue('system', `׳”׳׳©׳₪׳˜ ׳ ׳©׳׳¨. ׳¢׳›׳©׳™׳• ׳׳—׳¦׳• ׳¢׳ "${NODE_BY_ID[nextId].label}" ׳›׳“׳™ ׳©׳”׳©׳׳׳” ׳”׳‘׳׳” ׳×׳¦׳ ׳׳”׳׳₪׳” ׳•׳׳ ׳׳˜׳•׳₪׳¡.`, { tone: 'info', nodeId: nextId });
            return render();
        }
        if (!state.activeNodeId) {
            queue('system', '׳׳™׳ ׳›׳¨׳’׳¢ ׳©׳׳׳” ׳₪׳×׳•׳—׳”. ׳׳—׳¦׳• ׳¢׳ ׳¦׳•׳׳× ׳‘׳׳₪׳” ׳›׳“׳™ ׳׳™׳™׳¦׳¨ ׳׳× ׳”׳©׳׳׳” ׳”׳‘׳׳”.', { tone: 'warn' });
            return render();
        }
        const node = NODE_BY_ID[state.activeNodeId];
        if (!unlocked(node)) {
            queue('system', `הצומת "${node.label}" עדיין נעול. קדימו לפי הסדר: ${formattedLabels(node.hardPrerequisites)}.`, { tone: 'warn', nodeId: node.id });
            return render();
        }
        const current = answer(node.id);
        const result = evaluate(node, value);
        state.nodeAnswers[node.id] = {
            text: value,
            status: result.status,
            score: result.score,
            history: (current.history || []).concat(value)
        };
        state.activeNodeId = '';
        queue('patient', value, { tone: 'response', nodeId: node.id });
        queue('system', result.status === 'complete'
            ? `${node.label} ׳ ׳¡׳’׳¨/׳” ׳”׳™׳˜׳‘ ׳•׳ ׳›׳ ׳¡/׳” ׳׳׳₪׳”.`
            : `׳ ׳׳¡׳£ ׳—׳•׳׳¨ ׳—׳׳§׳™ ׳¢׳ "${node.label}". ׳™׳© ׳›׳‘׳¨ ׳׳—׳™׳–׳”, ׳׳‘׳ ׳©׳•׳•׳” ׳׳—׳–׳•׳¨ ׳•׳׳“׳™׳™׳§.`, { tone: result.status === 'complete' ? 'success' : 'info', nodeId: node.id });
        const nextId = recommendedNextId();
        if (nextId) queue('system', `׳”׳¦׳•׳׳× ׳”׳׳•׳׳׳¥ ׳”׳‘׳: "${NODE_BY_ID[nextId].label}".`, { tone: 'hint', nodeId: nextId });
        render();
    }

    function lastOrderNote() {
        if (!clean(state?.rawStatement)) return '׳”׳×׳—׳™׳׳• ׳‘׳׳©׳₪׳˜ ׳’׳•׳׳׳™ ׳׳—׳“. ׳׳—׳¨ ׳›׳ ׳¡׳“׳¨ ׳”׳©׳׳׳•׳× ׳™׳§׳‘׳ ׳׳©׳׳¢׳•׳× ׳˜׳™׳₪׳•׳׳™׳×.';
        const lastId = state.askedOrder[state.askedOrder.length - 1];
        if (!lastId) {
            const nextId = recommendedNextId();
            return nextId ? `׳¢׳“׳™׳™׳ ׳׳ ׳ ׳©׳׳׳” ׳©׳׳׳” ׳׳×׳•׳ ׳”׳׳₪׳”. ׳׳•׳׳׳¥ ׳׳”׳×׳—׳™׳ ׳‘-"${NODE_BY_ID[nextId].label}".` : '׳”׳¦׳׳×׳™׳ ׳₪׳×׳•׳—׳™׳ ׳׳‘׳—׳™׳¨׳”.';
        }
        return state.orderEvents[lastId]?.note || '׳”׳׳₪׳” ׳׳׳©׳™׳›׳” ׳׳”׳×׳¢׳“׳›׳.';
    }

    function nodeView(node) {
        const current = answer(node.id);
        const currentStatus = nodeStatus(node);
        const nextId = recommendedNextId();
        const orderEvent = state.orderEvents[node.id] || null;
        return {
            id: node.id,
            icon: node.icon,
            label: node.label,
            shortLabel: node.shortLabel,
            help: node.help || node.composerPlaceholder || node.label,
            recommendedOrder: node.recommendedOrder,
            active: state.activeNodeId === node.id,
            recommended: nextId === node.id,
            status: currentStatus,
            statusLabel: STATUS_LABELS[currentStatus] || currentStatus,
            quality: Math.round((current.score || 0) * 100),
            preview: current.text ? shorten(current.text) : (node.help || node.composerPlaceholder || node.label),
            orderLabel: orderEvent
                ? (orderEvent.wasEarly ? '׳ ׳©׳׳ ׳׳•׳§׳“׳' : '׳ ׳©׳׳ ׳‘׳–׳׳ ׳˜׳•׳‘')
                : (nextId === node.id ? '׳׳•׳׳׳¥ ׳¢׳›׳©׳™׳•' : `׳¡׳“׳¨ ${node.recommendedOrder}`),
            orderTone: orderEvent
                ? (orderEvent.wasEarly ? 'warn' : 'success')
                : (nextId === node.id ? 'info' : 'neutral')
        };
    }

    function currentView() {
        const data = snapshot();
        const nextId = recommendedNextId();
        const nextNode = nextId ? NODE_BY_ID[nextId] : null;
        const activeNode = state.activeNodeId ? NODE_BY_ID[state.activeNodeId] : null;
        const rawStatement = clean(state.rawStatement);
        const summaryReady = Boolean(rawStatement && data.desiredOutcome && data.visibleAction && data.firstStep && data.finalWording);
        const stageViews = STAGES.map((stage) => {
            const nodes = NODES.filter((node) => node.stage === stage.id).map(nodeView);
            const complete = nodes.filter((n) => n.status === 'complete').length;
            return Object.assign({}, stage, {
                open: Boolean(state.stageOpen?.[stage.id]),
                nodes,
                complete,
                total: nodes.length
            });
        });
        const suggestedOptions = activeNode ? optionsForNode(activeNode.id) : [];
        const rawOptions = rawStatement ? [] : rawStatementOptions();
        return {
            rawStatement,
            data,
            nextNode,
            activeNode,
            nodes: NODES.map(nodeView),
            stages: stageViews,
            suggestedOptions,
            rawOptions,
            verbSeeds: state.verbSeeds || [],
            selectedVerbId: state.selectedVerbId,
            messages: state.messages.slice(),
            stageLabel: stageLabel(),
            completenessScore: data.completenessScore,
            orderScore: data.orderScore,
            combinedScore: data.combinedScore,
            summaryReady,
            composerEnabled: !rawStatement || Boolean(activeNode),
            composerPlaceholder: !rawStatement
                ? 'כתבו כאן את המשפט הגולמי של המטופל/ת, או בחרו אחד מהשבבים המוצעים.'
                : activeNode
                    ? activeNode.composerPlaceholder
                    : '׳׳—׳¦׳• ׳¢׳ ׳¦׳•׳׳× ׳‘׳׳₪׳” ׳›׳“׳™ ׳׳™׳™׳¦׳¨ ׳׳× ׳”׳©׳׳׳” ׳”׳‘׳׳” ׳‘׳¦׳³׳׳˜.',
            composerHint: !rawStatement
                ? 'בחרו משפט גולמי והתחילו משם.'
                : activeNode
                    ? `׳”׳×׳©׳•׳‘׳” ׳©׳×׳™׳›׳×׳‘ ׳¢׳›׳©׳™׳• ׳×׳™׳©׳׳¨ ׳‘׳¦׳•׳׳× "${activeNode.label}".`
                    : '׳›׳¨׳’׳¢ ׳׳™׳ ׳©׳׳׳” ׳₪׳×׳•׳—׳”. ׳”׳׳₪׳” ׳”׳™׳ ׳׳©׳˜׳— ׳”׳©׳׳™׳˜׳” ׳‘׳©׳™׳—׳”.',
            lastOrderNote: lastOrderNote()
        };
    }

    function metric(label, value, note, tone) {
        return `
            <article class="blueprint-metric" data-tone="${esc(tone || 'neutral')}">
                <span class="blueprint-metric-label">${esc(label)}</span>
                <strong class="blueprint-metric-value">${esc(value)}</strong>
                <span class="blueprint-metric-note">${esc(note)}</span>
            </article>
        `;
    }

    function bubble(entry) {
        const nodeLabel = entry.nodeId && NODE_BY_ID[entry.nodeId] ? NODE_BY_ID[entry.nodeId].shortLabel : '';
        return `
            <div class="blueprint-bubble-row is-${esc(entry.role)}">
                <article class="blueprint-bubble blueprint-bubble--${esc(entry.role)}" data-tone="${esc(entry.tone || 'default')}">
                    <div class="blueprint-bubble-top">
                        <span class="blueprint-bubble-role">${esc(ROLE_LABELS[entry.role] || '׳”׳׳₪׳”')}</span>
                        ${nodeLabel ? `<span class="blueprint-bubble-node">${esc(nodeLabel)}</span>` : ''}
                    </div>
                    <p>${esc(entry.text)}</p>
                </article>
            </div>
        `;
    }

    function nodeCard(node) {
        return `
            <button type="button"
                    class="blueprint-node-card ${node.active ? 'is-active' : ''} ${node.recommended ? 'is-recommended' : ''}"
                    data-blueprint-node="${esc(node.id)}"
                    data-status="${esc(node.status)}"
                    aria-pressed="${node.active ? 'true' : 'false'}"
                    ${node.status === 'locked' ? 'disabled' : ''}>
                <div class="blueprint-node-head">
                    <span class="blueprint-node-order">${esc(String(node.recommendedOrder))}</span>
                    <span class="blueprint-node-icon" aria-hidden="true">${esc(node.icon)}</span>
                    <div class="blueprint-node-title-wrap">
                        <strong>${esc(node.label)}</strong>
                        <span class="blueprint-node-status">${esc(node.statusLabel)}</span>
                    </div>
                </div>
                <p class="blueprint-node-help">${esc(node.help)}</p>
                <div class="blueprint-node-meta">
                    <span class="blueprint-node-chip" data-tone="${esc(node.orderTone)}">${esc(node.orderLabel)}</span>
                    <span class="blueprint-node-chip" data-tone="${node.status === 'complete' ? 'success' : node.status === 'partial' ? 'info' : 'neutral'}">${esc(String(node.quality))}% ׳׳™׳“׳¢</span>
                </div>
                <p class="blueprint-node-preview">${esc(node.preview)}</p>
            </button>
        `;
    }

    function summaryCard(title, value, note, tone, contentId) {
        const text = clean(value);
        return `
            <article class="blueprint-summary-card" data-tone="${esc(tone || 'default')}" data-empty="${text ? 'false' : 'true'}">
                <span class="blueprint-summary-label">${esc(title)}</span>
                <p class="blueprint-summary-value"${contentId ? ` id="${esc(contentId)}"` : ''}>${esc(text || '׳¢׳“׳™׳™׳ ׳׳ ׳ ׳‘׳ ׳”')}</p>
                ${note ? `<p class="blueprint-summary-note">${esc(note)}</p>` : ''}
            </article>
        `;
    }

    function render() {
        if (!root) return false;
        const view = currentView();
        const toteNode = (node) => `
            <button type="button" class="tote-node ${node.status ? 'is-' + node.status : ''} ${node.recommended ? 'is-recommended' : ''}" data-blueprint-node="${esc(node.id)}" aria-label="${esc(node.label)}">
                <div class="tote-node-head">
                    <span class="tote-node-icon">${esc(node.icon || '•')}</span>
                    <span class="tote-node-title">${esc(node.label)}</span>
                    <span class="tote-node-order">#${esc(node.recommendedOrder)}</span>
                </div>
                <div class="tote-node-meta">
                    <span class="tote-node-status">${esc(node.statusLabel)}</span>
                    <span class="tote-node-quality">${esc(String(node.quality))}%</span>
                </div>
                <p class="tote-node-preview">${esc(node.preview)}</p>
            </button>
        `;
        const stageBoard = view.stages.map((stage) => `
            <article class="tote-stage" data-stage="${esc(stage.id)}" data-open="${stage.open ? 'true' : 'false'}">
                <header class="tote-stage-head" data-stage-toggle="${esc(stage.id)}">
                    <div>
                        <span class="tote-stage-kicker">${esc(stage.subLabel)}</span>
                        <h4>${esc(stage.label)}</h4>
                    </div>
                    <div class="tote-stage-count">${esc(stage.complete)}/${esc(stage.total)}</div>
                </header>
                <div class="tote-stage-body"${stage.open ? '' : ' hidden'}>
                    ${stage.nodes.map(toteNode).join('')}
                </div>
            </article>
        `).join('');
        const verbChips = (view.verbSeeds || []).map((seed) => `
            <button type="button" class="chip chip--verb${seed.id === view.selectedVerbId ? ' is-active' : ''}" data-verb-id="${esc(seed.id)}">${esc(seed.verb_he || seed.verb_en || seed.id)}</button>
        `).join('');
        const rawChips = (view.rawOptions || []).map((option) => `
            <button type="button" class="chip chip--raw" data-chip-raw="1" data-chip-value="${esc(option)}">${esc(option)}</button>
        `).join('');
        const suggestionChips = (view.suggestedOptions || []).map((option) => `
            <button type="button" class="chip chip--suggestion" data-chip-node="${esc(view.activeNode ? view.activeNode.id : '')}" data-chip-value="${esc(option)}">${esc(option)}</button>
        `).join('');
        root.innerHTML = `
            <section class="blueprint-progress-strip" aria-live="polite">
                <article class="blueprint-progress-highlight">
                    <span class="blueprint-panel-kicker">שלב נוכחי</span>
                    <strong>${esc(view.stageLabel)}</strong>
                    <p>מסלול TOTE עם כוונה חיובית ושאלות מדודות.</p>
                </article>
                ${metric('שלמות מידע', `${view.completenessScore}%`, `${view.data.completedNodes}/${NODES.length} צמתים מלאים`, view.completenessScore >= 70 ? 'success' : 'info')}
                ${metric('סדר שאלות', `${view.orderScore}%`, view.orderScore >= 85 ? 'מהלך יציב' : 'יש קפיצות מוקדמות', view.orderScore >= 85 ? 'success' : 'warn')}
                ${metric('ציון משולב', `${view.combinedScore}%`, 'מאמן, לא משחק', view.combinedScore >= 80 ? 'success' : 'neutral')}
                ${metric('צומת מומלץ', view.nextNode ? view.nextNode.shortLabel : 'קודם משפט', view.nextNode ? view.nextNode.label : 'שומרים על סדר טיפולי', 'neutral')}
            </section>

            <section class="blueprint-dialogue-stage">
                <aside class="blueprint-stage-card blueprint-stage-card--context">
                    <span class="blueprint-panel-kicker">בחירת פועל / משפט</span>
                    <h3>מה המשפט הגולמי?</h3>
                    <div class="verb-chip-row">${verbChips}</div>
                    <blockquote class="blueprint-raw-quote">${esc(view.rawStatement || 'עדיין אין משפט גולמי')}</blockquote>
                    ${rawChips ? `<div class="chip-cloud chip-cloud--raw">${rawChips}</div>` : ''}
                    <p class="blueprint-stage-note">${esc(view.rawStatement ? 'אפשר לערוך את המשפט או להמשיך לצמתים.' : 'בחרו פועל וקליק על שבב כדי להתחיל')}</p>
                </aside>

                <section class="blueprint-phone-shell" aria-label="שיחה טיפולית">
                    <div class="blueprint-phone-card">
                        <div class="blueprint-phone-head">
                            <div>
                                <span class="blueprint-panel-kicker">דיאלוג מונחה</span>
                                <h3>מטפל/ת ⇄ מטופל/ת</h3>
                            </div>
                            <span class="blueprint-phone-status">${esc(view.activeNode ? `שאלה פתוחה: ${view.activeNode.label}` : 'בחרו צומת במפה')}</span>
                        </div>
                        <div class="blueprint-chat-thread" data-blueprint-chat-thread="1" role="log" aria-live="polite">
                            ${view.messages.map(bubble).join('')}
                        </div>
                        ${suggestionChips ? `<div class="chip-cloud chip-cloud--suggestions">${suggestionChips}</div>` : ''}
                        <form class="blueprint-composer" data-blueprint-composer="1">
                            <textarea name="reply" rows="${view.rawStatement ? 2 : 3}" placeholder="${esc(view.composerPlaceholder)}" ${view.composerEnabled ? '' : 'disabled'}></textarea>
                            <div class="blueprint-composer-footer">
                                <span class="blueprint-composer-hint">${esc(view.composerHint)}</span>
                                <button type="submit" class="btn btn-primary" ${view.composerEnabled ? '' : 'disabled'}>${esc(view.rawStatement ? 'שמור תשובה' : 'שמור משפט')}</button>
                            </div>
                        </form>
                    </div>
                </section>

                <aside class="blueprint-stage-card blueprint-stage-card--feedback">
                    <span class="blueprint-panel-kicker">משוב מאמן</span>
                    <h3>איפה להתמקד עכשיו</h3>
                    <p class="blueprint-stage-note">${esc(view.lastOrderNote)}</p>
                    <div class="blueprint-feedback-grid">
                        <div><strong>${esc(String(view.data.completedNodes))}</strong><span>צמתים מלאים</span></div>
                        <div><strong>${esc(String(view.data.partialNodes))}</strong><span>צמתים חלקיים</span></div>
                        <div><strong>${esc(String(view.orderScore))}%</strong><span>איכות סדר</span></div>
                    </div>
                    <div class="blueprint-stage-highlight blueprint-stage-highlight--soft">
                        <span>${view.activeNode ? 'צומת פעיל' : 'המלצה'}</span>
                        <strong>${esc(view.activeNode ? view.activeNode.label : (view.nextNode ? view.nextNode.label : 'בחרו צומת ראשון'))}</strong>
                        <p>${esc(view.activeNode ? view.activeNode.help : 'המסלול מתקדם לפי שלבים פתוחים. לחצו על שלב כדי לפתוח תתי-שאלות.')}</p>
                    </div>
                </aside>
            </section>

            <section class="blueprint-flow-shell" aria-label="מפת שלבים">
                <div class="blueprint-section-head">
                    <div>
                        <span class="blueprint-panel-kicker">TOTE Flow</span>
                        <h3>מפת שלבים מתכווצת</h3>
                    </div>
                    <div class="blueprint-flow-legend" aria-hidden="true">
                        <span data-tone="locked">נעול</span>
                        <span data-tone="available">זמין</span>
                        <span data-tone="partial">חלקי</span>
                        <span data-tone="complete">מלא</span>
                    </div>
                </div>
                <div class="tote-board">
                    ${stageBoard}
                </div>
            </section>

            <section class="blueprint-summary-shell ${view.summaryReady ? 'is-ready' : 'is-building'}" aria-label="מפת פעולה סופית">
                <div class="blueprint-section-head">
                    <div>
                        <span class="blueprint-panel-kicker">התוצר שבנינו</span>
                        <h3>Therapeutic Action Map</h3>
                    </div>
                    <span class="blueprint-summary-state">${esc(view.summaryReady ? 'מוכן לביצוע' : 'עוד בבנייה')}</span>
                </div>
                <div class="blueprint-commitment-banner">
                    <span class="blueprint-panel-kicker">מחויבות קצרה</span>
                    <strong>${esc(view.data.conciseCommitment)}</strong>
                </div>
                <div id="final-blueprint" class="blueprint-summary-grid">
                    ${summaryCard('Raw Statement', view.data.rawStatement, '', 'raw')}
                    ${summaryCard('Desired Outcome', view.data.desiredOutcome, '', 'success')}
                    ${summaryCard('Success Sign', view.data.successSign, '', 'info')}
                    ${summaryCard('Positive Intention (old)', view.data.positiveIntention, '', 'info')}
                    ${summaryCard('Preserve Intention (updated)', view.data.preservePositiveIntention, '', 'success')}
                    ${summaryCard('Visible Action', view.data.visibleAction, '', 'default')}
                    ${summaryCard('Emotional Driver', view.data.emotionalDriver, '', 'default')}
                    ${summaryCard('Execution Conditions', view.data.executionConditions, '', 'default')}
                    ${summaryCard('Obstacle', view.data.obstacle, '', 'warn')}
                    ${summaryCard('Alternative / Plan B', view.data.alternativePlan, '', 'info')}
                    ${summaryCard('Goal Imagery', view.data.goalImagery, '', 'info')}
                    ${summaryCard('Process Imagery', view.data.processImagery, '', 'info')}
                    ${summaryCard('First Step Imagery', view.data.firstStepImagery, '', 'info')}
                    ${summaryCard('Clear / Realistic / Measurable', [view.data.clearCheck, view.data.realisticCheck, view.data.measurableCheck].filter(Boolean).join(' | '), '', 'neutral')}
                    ${summaryCard('First Step', view.data.firstStep, '', 'success')}
                    ${summaryCard('Final Wording', view.data.finalWording, '', 'success')}
                </div>
                <div class="blueprint-summary-note">${esc(view.data.therapistSummary)}</div>
                <div class="blueprint-action-row">
                    <button id="export-json-btn" type="button" class="btn btn-secondary" data-blueprint-action="export">📥 יצוא JSON</button>
                    <button id="start-over-btn" type="button" class="btn btn-secondary" data-blueprint-action="reset">🔄 מהתחלה</button>
                    <button id="do-it-now-btn" type="button" class="btn btn-primary" data-blueprint-action="start">▶️ צעד ראשון</button>
                </div>
            </section>
        `;
        window.requestAnimationFrame(() => {
            const thread = root.querySelector('[data-blueprint-chat-thread="1"]');
            if (thread) thread.scrollTop = thread.scrollHeight;
        });
        return true;
    }
    function handleClick(event) {
        const stageToggle = event.target.closest('[data-stage-toggle]');
        if (stageToggle) { toggleStage(clean(stageToggle.getAttribute('data-stage-toggle'))); return; }

        const verbButton = event.target.closest('[data-verb-id]');
        if (verbButton) { selectVerb(clean(verbButton.getAttribute('data-verb-id'))); return; }

        const chipRaw = event.target.closest('[data-chip-raw]');
        if (chipRaw) {
            const value = clean(chipRaw.getAttribute('data-chip-value'));
            if (value) {
                state.rawStatement = value;
                queue('patient', value, { tone: 'statement' });
                render();
            }
            return;
        }

        const chipSuggestion = event.target.closest('[data-chip-node]');
        if (chipSuggestion) {
            const value = clean(chipSuggestion.getAttribute('data-chip-value'));
            const nodeId = clean(chipSuggestion.getAttribute('data-chip-node')) || state.activeNodeId;
            if (nodeId) state.activeNodeId = nodeId;
            if (value) submit(value);
            return;
        }

        const nodeButton = event.target.closest('[data-blueprint-node]');
        if (nodeButton) {
            askNode(clean(nodeButton.getAttribute('data-blueprint-node')));
            return;
        }
        const actionButton = event.target.closest('[data-blueprint-action]');
        if (!actionButton) return;
        const action = clean(actionButton.getAttribute('data-blueprint-action'));
        if (action === 'reset') return reset();
        if (action === 'export') return exportJson();
        if (action === 'start') return startNow();
        if (action === 'summary') {
            const summaryEl = root.querySelector('#final-blueprint');
            if (summaryEl) summaryEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
            return true;
        }
    }
    function handleSubmit(event) {
        const form = event.target.closest('[data-blueprint-composer="1"]');
        if (!form) return;
        event.preventDefault();
        submit(form.querySelector('textarea[name="reply"]')?.value || '');
    }

    function setup() {
        root = document.getElementById(ROOT_ID);
        if (!root) return false;
        if (root.dataset.blueprintBound !== 'true') {
            root.dataset.blueprintBound = 'true';
            root.addEventListener('click', handleClick);
            root.addEventListener('submit', handleSubmit);
        }
        if (!state) state = initialState();
        render();
        ensureSeedsLoaded().then(() => {
            if (!clean(state.selectedVerbId) && state.verbSeeds.length) {
                selectVerb(state.verbSeeds[0].id);
            } else {
                render();
            }
        });
        return true;
    }

    function reset() {
        const existingSeeds = state?.verbSeeds || [];
        const loaded = state?.seedLoaded || false;
        state = initialState();
        state.verbSeeds = existingSeeds;
        state.seedLoaded = loaded;
        if (loaded && existingSeeds.length && !state.selectedVerbId) state.selectedVerbId = clean(existingSeeds[0].id || '');
        return render();
    }

    function startNow() {
        const data = snapshot();
        if (!data.firstStep) {
            alert('׳›׳“׳™ ׳׳”׳×׳—׳™׳ ׳¢׳›׳©׳™׳• ׳¦׳¨׳™׳ ׳§׳•׳“׳ ׳׳¡׳’׳•׳¨ ׳¦׳¢׳“ ׳¨׳׳©׳•׳ ׳‘׳¨׳•׳¨ ׳‘׳׳₪׳”.');
            return false;
        }
        alert(`׳׳×׳—׳™׳׳™׳ ׳¢׳›׳©׳™׳•.\n\n׳”׳¦׳¢׳“ ׳”׳¨׳׳©׳•׳ ׳©׳׳: ${data.firstStep}\n\n׳”׳—׳–׳™׳§׳• ׳׳× ׳”׳›׳™׳•׳•׳: ${data.desiredOutcome || data.transformedOutcome}`);
        return true;
    }

    function exportJson() {
        const data = snapshot();
        if (!data.rawStatement) {
            alert('׳›׳“׳׳™ ׳׳”׳×׳—׳™׳ ׳׳׳©׳₪׳˜ ׳’׳•׳׳׳™ ׳׳—׳“ ׳׳₪׳ ׳™ ׳™׳™׳¦׳•׳.');
            return false;
        }
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `blueprint_${Date.now()}.json`;
        link.click();
        URL.revokeObjectURL(url);
        return true;
    }

    window.BlueprintDialogueBuilder = Object.freeze({
        setup,
        reset,
        snapshot,
        exportJson,
        startNow,
        askNode,
        goToRecommended: function () {
            const nextId = recommendedNextId();
            if (nextId) askNode(nextId);
            return nextId;
        },
        buildTherapistSummary: therapistSummary,
        buildGuidedImagery: guidedImagery
    });
})();



