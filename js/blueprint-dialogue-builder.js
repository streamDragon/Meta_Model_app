(function () {
    const ROOT_ID = 'blueprint-builder-root';
    const ROLE_LABELS = Object.freeze({ therapist: 'מטפל/ת', patient: 'מטופל/ת', system: 'המפה' });
    const STATUS_LABELS = Object.freeze({ locked: 'נעול', available: 'זמין', partial: 'חלקי', complete: 'מלא' });

    const NODES = Object.freeze([
        Object.freeze({
            id: 'desiredOutcome',
            icon: '🎯',
            label: 'יעד רצוי',
            shortLabel: 'יעד',
            phase: 'target',
            recommendedOrder: 1,
            hardPrerequisites: Object.freeze([]),
            orderPrerequisites: Object.freeze([]),
            questionTemplates: Object.freeze([
                'אם זה יתחיל לעבוד טוב יותר, מה תרצה/י לראות או לשמוע במקום המשפט הגולמי?',
                'מה תהיה הגרסה החיובית, המדויקת והמציאותית של מה שהמטופל/ת רוצה שיקרה?'
            ]),
            followUpTemplates: Object.freeze([
                'מה עוד צריך להיות שם כדי שהיעד יישמע חיובי, ברור ובן-השגה?'
            ]),
            composerPlaceholder: 'כתבו יעד חיובי, ברור, ולא רק מה לא רוצים.',
            captureKey: 'desiredOutcome',
            minWords: 5,
            minChars: 22,
            wrongOrderPenalty: 0,
            help: 'מנסחים תוצאה חיובית במקום להישאר עם תלונה או הימנעות.'
        }),
        Object.freeze({
            id: 'visibleAction',
            icon: '👁️',
            label: 'פעולה נראית לעין',
            shortLabel: 'פעולה',
            phase: 'behavior',
            recommendedOrder: 2,
            hardPrerequisites: Object.freeze([]),
            orderPrerequisites: Object.freeze(['desiredOutcome']),
            questionTemplates: Object.freeze([
                'כשזה יקרה בפועל, מה מישהו מבחוץ יוכל לראות או לשמוע שאת/ה עושה?',
                'איזו פעולה קונקרטית תראה שהכוונה באמת ירדה לקרקע?'
            ]),
            followUpTemplates: Object.freeze([
                'אפשר לדייק את הפעולה עוד צעד אחד כך שהיא תהיה ממש נראית או נשמעת?'
            ]),
            composerPlaceholder: 'כתבו פעולה שאפשר לזהות במציאות, לא רק כוונה כללית.',
            captureKey: 'visibleAction',
            minWords: 5,
            minChars: 20,
            wrongOrderPenalty: 6,
            help: 'מורידים את הכוונה מהראש להתנהגות שאפשר לראות.'
        }),
        Object.freeze({
            id: 'emotionalLever',
            icon: '❤️',
            label: 'מניע רגשי',
            shortLabel: 'מניע',
            phase: 'motivation',
            recommendedOrder: 3,
            hardPrerequisites: Object.freeze([]),
            orderPrerequisites: Object.freeze(['desiredOutcome', 'visibleAction']),
            questionTemplates: Object.freeze([
                'למה זה חשוב עכשיו? מה נהיה אחרת בפנים אם זה יקרה?',
                'איזה צורך, ערך או הקלה רגשית יושבים מתחת לרצון הזה?'
            ]),
            followUpTemplates: Object.freeze([
                'מה עוד הופך את זה למשמעותי מספיק כדי שהגוף יסכים לזוז?'
            ]),
            composerPlaceholder: 'כתבו למה זה חשוב, איזה ערך זה ישרת, או מה ישתנה בפנים.',
            captureKey: 'emotionalLever',
            minWords: 4,
            minChars: 18,
            wrongOrderPenalty: 8,
            help: 'מחברים את התוכנית למשמעות, לא רק למשימה.'
        }),
        Object.freeze({
            id: 'obstacles',
            icon: '🪨',
            label: 'חסמים צפויים',
            shortLabel: 'חסמים',
            phase: 'resistance',
            recommendedOrder: 4,
            hardPrerequisites: Object.freeze([]),
            orderPrerequisites: Object.freeze(['desiredOutcome', 'visibleAction']),
            questionTemplates: Object.freeze([
                'איפה זה בדרך כלל נתקע? מה עלול לחסום את זה ברגע הביצוע?',
                'מה הסצנה הרגילה שבה התוכנית מתמסמסת או נופלת?'
            ]),
            followUpTemplates: Object.freeze([
                'איזה חסם הוא הכי ריאלי כרגע, ואיך הוא נראה בזמן אמת?'
            ]),
            composerPlaceholder: 'כתבו חסם סביר אחד או שניים, לא רשימת סכנות כללית.',
            captureKey: 'obstacles',
            minWords: 4,
            minChars: 18,
            wrongOrderPenalty: 12,
            help: 'מזהים איפה זה נופל לפני שמתחייבים מדי.'
        }),
        Object.freeze({
            id: 'alternatives',
            icon: '🔁',
            label: 'חלופה / Plan B',
            shortLabel: 'חלופה',
            phase: 'flexibility',
            recommendedOrder: 5,
            hardPrerequisites: Object.freeze([]),
            orderPrerequisites: Object.freeze(['desiredOutcome', 'visibleAction', 'obstacles']),
            questionTemplates: Object.freeze([
                'אם זה נתקע, מה גרסת ה-Plan B ששומרת על הכיוון בלי לוותר עליו?',
                'איזו תגובה גמישה תאפשר להישאר בתנועה גם אם החסם מופיע?'
            ]),
            followUpTemplates: Object.freeze([
                'אפשר לדייק חלופה קטנה יותר, נגישה יותר, שלא דורשת להתחיל הכול מהתחלה?'
            ]),
            composerPlaceholder: 'כתבו חלופה שממשיכה את הכיוון ולא בריחה מהתוכנית.',
            captureKey: 'alternatives',
            minWords: 4,
            minChars: 18,
            wrongOrderPenalty: 12,
            help: 'בונים גמישות: אם לא דרך A, מהי דרך B.'
        }),
        Object.freeze({
            id: 'executionConditions',
            icon: '📍',
            label: 'תנאי ביצוע',
            shortLabel: 'תנאים',
            phase: 'conditions',
            recommendedOrder: 6,
            hardPrerequisites: Object.freeze([]),
            orderPrerequisites: Object.freeze(['desiredOutcome', 'visibleAction']),
            questionTemplates: Object.freeze([
                'מתי, איפה, עם מי ובאיזה חלון זמן זה באמת אמור לקרות?',
                'באילו תנאים הפעולה הזאת תהיה מציאותית ולא רק נכונה על הנייר?'
            ]),
            followUpTemplates: Object.freeze([
                'מה עוד צריך להיות ברור בתנאי ההתחלה כדי שהביצוע יחזיק?'
            ]),
            composerPlaceholder: 'כתבו זמן, מקום, אדם, או הקשר שבו המהלך אמור לקרות.',
            captureKey: 'executionConditions',
            minWords: 5,
            minChars: 20,
            wrongOrderPenalty: 8,
            help: 'מכניסים את התוכנית לקונטקסט אמיתי של ביצוע.'
        }),
        Object.freeze({
            id: 'firstStep',
            icon: '🟢',
            label: 'צעד ראשון',
            shortLabel: 'צעד ראשון',
            phase: 'commitment',
            recommendedOrder: 7,
            hardPrerequisites: Object.freeze([]),
            orderPrerequisites: Object.freeze(['desiredOutcome', 'visibleAction', 'executionConditions']),
            questionTemplates: Object.freeze([
                'מה הצעד הראשון הקטן והברור שאפשר לבצע בלי להתווכח עם עצמך?',
                'אם יוצאים מכאן רק עם התחלה אחת, מה בדיוק יקרה קודם?'
            ]),
            followUpTemplates: Object.freeze([
                'אפשר לנסח את הצעד הראשון כך שיהיה קטן, ברור ומיידי עוד יותר?'
            ]),
            composerPlaceholder: 'כתבו צעד ראשון קטן, מעשי, וניתן לביצוע.',
            captureKey: 'firstStep',
            minWords: 4,
            minChars: 16,
            wrongOrderPenalty: 14,
            help: 'סוגרים מחויבות רק כשהתוכנית כבר מחזיקה.'
        }),
        Object.freeze({
            id: 'finalTest',
            icon: '✅',
            label: 'בדיקת סיום',
            shortLabel: 'בדיקה',
            phase: 'validation',
            recommendedOrder: 8,
            hardPrerequisites: Object.freeze(['desiredOutcome', 'visibleAction', 'firstStep']),
            orderPrerequisites: Object.freeze(['desiredOutcome', 'visibleAction', 'firstStep']),
            questionTemplates: Object.freeze([
                'לפני שסוגרים: איך נדע שהתוכנית הזאת ברורה, מציאותית וניתנת למדידה?',
                'מה המשפט שבודק אם המהלך מספיק חד כדי לצאת איתו לשבוע הקרוב?'
            ]),
            followUpTemplates: Object.freeze([
                'מה עוד צריך בבדיקת הסיום כדי להרגיש שהתוכנית באמת מחזיקה ברגע אמת?'
            ]),
            composerPlaceholder: 'כתבו משפט שבודק בהירות, מציאותיות ומדד הצלחה.',
            captureKey: 'finalTest',
            minWords: 5,
            minChars: 22,
            wrongOrderPenalty: 16,
            help: 'הצומת הזה נפתח רק אחרי שיש יעד, פעולה וצעד ראשון.'
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
        return text.length <= max ? text : `${text.slice(0, max - 1).trim()}…`;
    }

    function joinNatural(items) {
        const cleanItems = (items || []).map((item) => clean(item)).filter(Boolean);
        if (!cleanItems.length) return '';
        if (cleanItems.length === 1) return cleanItems[0];
        if (cleanItems.length === 2) return `${cleanItems[0]} ו-${cleanItems[1]}`;
        return `${cleanItems.slice(0, -1).join(', ')} ו-${cleanItems[cleanItems.length - 1]}`;
    }

    function timebox(value) {
        const text = clean(value);
        const match = text.match(/(\d+\s*(?:דקות|דקה|שעות|שעה|ימים|יום))/);
        return match ? match[1] : text;
    }

    function msg(role, text, opts = {}) {
        messageId += 1;
        return { id: `bp-msg-${messageId}`, role, text: clean(text), nodeId: clean(opts.nodeId), tone: clean(opts.tone) || 'default' };
    }

    function initialState() {
        messageId = 0;
        return {
            rawStatement: '',
            activeNodeId: '',
            nodeAnswers: {},
            askedOrder: [],
            orderEvents: {},
            messages: [
                msg('therapist', 'הביאו לכאן תלונה, משאלה, הימנעות או פועל עמום. משם נבנה מהלך טיפולי צעד-צעד.', { tone: 'intro' }),
                msg('system', 'אחרי המשפט הגולמי לוחצים על צומת במפה. כל לחיצה מייצרת שאלה בצ׳אט, וכל תשובה נשמרת חזרה למפה.', { tone: 'info' })
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
        if (!raw) return 'איסוף משפט גולמי';
        if (completeness < 25) return 'מגדירים יעד ופעולה';
        if (completeness < 50) return 'מוצאים מניע וחסמים';
        if (completeness < 75) return 'בונים חלופות ותנאים';
        if (completeness < 100) return 'סוגרים צעד ראשון ובדיקת סיום';
        return 'מפת פעולה מוכנה';
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
                ? `השאלה "${node.label}" נשאלה לפני שנסגרו ${formattedLabels(misses)}. זה אפשרי, אבל מפחית את ציון הסדר.`
                : `בחירה טובה: "${node.label}" נשאלה בזמן שמקדם מהלך טיפולי יציב.`
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
        if (clean(data.rawStatement)) return `במקום "${data.rawStatement}" עדיין צריך לנסח יעד חיובי וברור יותר.`;
        return 'היעד החיובי עוד לא נוסח.';
    }

    function commitment(data) {
        const parts = [];
        if (data.desiredOutcome) parts.push(data.desiredOutcome);
        if (data.firstStep) parts.push(`מתחיל/ה ב-${data.firstStep}`);
        if (data.executionConditions) parts.push(`בתוך ${data.executionConditions}`);
        return parts.length ? parts.join(' • ') : 'כשהיעד, הפעולה והצעד הראשון ייסגרו, כאן תופיע שורת המחויבות.';
    }

    function therapistSummary(data) {
        const lines = [];
        if (data.rawStatement) lines.push(`המשפט הגולמי הוא "${data.rawStatement}".`);
        if (data.desiredOutcome) lines.push(`היעד שנבנה הוא "${data.desiredOutcome}".`);
        if (data.visibleAction) lines.push(`הפעולה הגלויה נראית כך: ${data.visibleAction}.`);
        if (data.emotionalLever) lines.push(`המשמעות הרגשית שמחזיקה את המהלך: ${data.emotionalLever}.`);
        if (data.obstacles) lines.push(`החסם המרכזי כרגע: ${data.obstacles}.`);
        if (data.alternatives) lines.push(`חלופה אפשרית אם תהיה תקיעה: ${data.alternatives}.`);
        if (data.executionConditions) lines.push(`תנאי הביצוע שנאספו: ${data.executionConditions}.`);
        if (data.firstStep) lines.push(`הצעד הראשון שנבחר: "${data.firstStep}".`);
        if (data.finalTest) lines.push(`בדיקת הסיום אומרת: ${data.finalTest}.`);
        return lines.join(' ') || 'המפה עדיין נבנית מתוך השיחה.';
    }

    function guidedImagery(data) {
        return [
            'קח/י נשימה אחת איטית.',
            `דמיין/י את עצמך מגיע/ה לרגע שבו מתחיל/ים ב-"${data.firstStep || 'הצעד הראשון'}".`,
            `שימי/ם לב איך ${data.emotionalLever || 'המשמעות שנאספה כאן'} מחזיקה את הכיוון בפנים.`,
            `ועכשיו ראה/י איך "${data.desiredOutcome || 'הכיוון הרצוי'}" מתחיל לקבל צורה במציאות.`
        ].join(' ');
    }

    function snapshot() {
        const rawStatement = clean(state?.rawStatement);
        const data = {
            rawStatement,
            action: rawStatement,
            desiredOutcome: clean(answer('desiredOutcome').text),
            success: clean(answer('desiredOutcome').text),
            visibleAction: clean(answer('visibleAction').text),
            emotionalLever: clean(answer('emotionalLever').text),
            obstacles: clean(answer('obstacles').text),
            friction: clean(answer('obstacles').text),
            alternatives: clean(answer('alternatives').text),
            executionConditions: clean(answer('executionConditions').text),
            firstStep: clean(answer('firstStep').text),
            finalTest: clean(answer('finalTest').text),
            time: timebox(answer('executionConditions').text) || 'חלון זמן שעדיין דורש דיוק',
            prerequisites: clean(answer('executionConditions').text),
            resourceBlockers: clean(answer('obstacles').text),
            resourceEnablers: clean(answer('executionConditions').text),
            resourceImportance: clean(answer('emotionalLever').text),
            valuesIfYes: clean(answer('emotionalLever').text),
            valuesIfNo: clean(answer('alternatives').text),
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
            queue('system', 'קודם שומרים כאן את המשפט הגולמי, ורק אחר כך המפה נפתחת לשאלות.', { tone: 'warn' });
            return render();
        }
        if (!unlocked(node)) {
            queue('system', `הצומת "${node.label}" נפתח רק אחרי ${formattedLabels(node.hardPrerequisites)}.`, { tone: 'warn', nodeId: node.id });
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
            queue('system', 'כדי לשמור משהו במפה צריך תשובה אחת ברורה בצ׳אט.', { tone: 'warn' });
            return render();
        }
        if (!clean(state.rawStatement)) {
            state.rawStatement = value;
            queue('patient', value, { tone: 'statement' });
            const nextId = recommendedNextId();
            if (nextId) queue('system', `המשפט נשמר. עכשיו לחצו על "${NODE_BY_ID[nextId].label}" כדי שהשאלה הבאה תצא מהמפה ולא מטופס.`, { tone: 'info', nodeId: nextId });
            return render();
        }
        if (!state.activeNodeId) {
            queue('system', 'אין כרגע שאלה פתוחה. לחצו על צומת במפה כדי לייצר את השאלה הבאה.', { tone: 'warn' });
            return render();
        }
        const node = NODE_BY_ID[state.activeNodeId];
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
            ? `${node.label} נסגר/ה היטב ונכנס/ה למפה.`
            : `נאסף חומר חלקי על "${node.label}". יש כבר אחיזה, אבל שווה לחזור ולדייק.`, { tone: result.status === 'complete' ? 'success' : 'info', nodeId: node.id });
        const nextId = recommendedNextId();
        if (nextId) queue('system', `הצומת המומלץ הבא: "${NODE_BY_ID[nextId].label}".`, { tone: 'hint', nodeId: nextId });
        render();
    }

    function lastOrderNote() {
        if (!clean(state?.rawStatement)) return 'התחילו במשפט גולמי אחד. אחר כך סדר השאלות יקבל משמעות טיפולית.';
        const lastId = state.askedOrder[state.askedOrder.length - 1];
        if (!lastId) {
            const nextId = recommendedNextId();
            return nextId ? `עדיין לא נשאלה שאלה מתוך המפה. מומלץ להתחיל ב-"${NODE_BY_ID[nextId].label}".` : 'הצמתים פתוחים לבחירה.';
        }
        return state.orderEvents[lastId]?.note || 'המפה ממשיכה להתעדכן.';
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
            help: node.help,
            recommendedOrder: node.recommendedOrder,
            active: state.activeNodeId === node.id,
            recommended: nextId === node.id,
            status: currentStatus,
            statusLabel: STATUS_LABELS[currentStatus] || currentStatus,
            quality: Math.round((current.score || 0) * 100),
            preview: current.text ? shorten(current.text) : node.help,
            orderLabel: orderEvent
                ? (orderEvent.wasEarly ? 'נשאל מוקדם' : 'נשאל בזמן טוב')
                : (nextId === node.id ? 'מומלץ עכשיו' : `סדר ${node.recommendedOrder}`),
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
        const summaryReady = Boolean(rawStatement && data.desiredOutcome && data.visibleAction && data.firstStep);
        return {
            rawStatement,
            data,
            nextNode,
            activeNode,
            nodes: NODES.map(nodeView),
            messages: state.messages.slice(),
            stageLabel: stageLabel(),
            completenessScore: data.completenessScore,
            orderScore: data.orderScore,
            combinedScore: data.combinedScore,
            summaryReady,
            composerEnabled: !rawStatement || Boolean(activeNode),
            composerPlaceholder: !rawStatement
                ? 'כתבו כאן את המשפט הגולמי של המטופל/ת: תלונה, משאלה, הימנעות או פועל עמום.'
                : activeNode
                    ? activeNode.composerPlaceholder
                    : 'לחצו על צומת במפה כדי לייצר את השאלה הבאה בצ׳אט.',
            composerHint: !rawStatement
                ? 'בלי המשפט הגולמי המפה נשארת סגורה.'
                : activeNode
                    ? `התשובה שתיכתב עכשיו תישמר בצומת "${activeNode.label}".`
                    : 'כרגע אין שאלה פתוחה. המפה היא משטח השליטה בשיחה.',
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
                        <span class="blueprint-bubble-role">${esc(ROLE_LABELS[entry.role] || 'המפה')}</span>
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
                    <span class="blueprint-node-chip" data-tone="${node.status === 'complete' ? 'success' : node.status === 'partial' ? 'info' : 'neutral'}">${esc(String(node.quality))}% מידע</span>
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
                <p class="blueprint-summary-value"${contentId ? ` id="${esc(contentId)}"` : ''}>${esc(text || 'עדיין לא נבנה')}</p>
                ${note ? `<p class="blueprint-summary-note">${esc(note)}</p>` : ''}
            </article>
        `;
    }

    function render() {
        if (!root) return false;
        const view = currentView();
        root.innerHTML = `
            <section class="blueprint-progress-strip" aria-live="polite">
                <article class="blueprint-progress-highlight">
                    <span class="blueprint-panel-kicker">שלב נוכחי</span>
                    <strong>${esc(view.stageLabel)}</strong>
                    <p>המערכת בודקת גם כמה מידע נאסף וגם האם השאלות נשאלו בסדר שעוזר טיפולית.</p>
                </article>
                ${metric('שלמות מידע', `${view.completenessScore}%`, `${view.data.completedNodes}/${NODES.length} צמתים מלאים`, view.completenessScore >= 70 ? 'success' : 'info')}
                ${metric('סדר שאלות', `${view.orderScore}%`, view.orderScore >= 85 ? 'מהלך יציב' : 'יש קפיצות מוקדמות', view.orderScore >= 85 ? 'success' : 'warn')}
                ${metric('ציון משולב', `${view.combinedScore}%`, 'משוב מאמן, לא משחק', view.combinedScore >= 80 ? 'success' : 'neutral')}
                ${metric('צומת מומלץ', view.nextNode ? view.nextNode.shortLabel : 'קודם משפט', view.nextNode ? view.nextNode.label : 'שומרים משפט גולמי', 'neutral')}
            </section>

            <section class="blueprint-dialogue-stage">
                <aside class="blueprint-stage-card blueprint-stage-card--context">
                    <span class="blueprint-panel-kicker">עוגן השיחה</span>
                    <h3>מה הגיע מהמטופל/ת</h3>
                    <blockquote class="blueprint-raw-quote">${esc(view.rawStatement || 'עדיין לא נשמר כאן משפט גולמי.')}</blockquote>
                    <p class="blueprint-stage-note">${esc(view.rawStatement ? 'המשפט הזה נשאר גלוי לאורך כל המהלך כדי שלא נחליק חזרה לטופס.' : 'התחילו במשפט אחד. ממנו המפה תיפתח ותציע סדר שאלות.' )}</p>
                    ${view.nextNode ? `<div class="blueprint-stage-highlight"><span>מומלץ עכשיו</span><strong>${esc(view.nextNode.label)}</strong></div>` : ''}
                </aside>

                <section class="blueprint-phone-shell" aria-label="שיחה טיפולית">
                    <div class="blueprint-phone-card">
                        <div class="blueprint-phone-head">
                            <div>
                                <span class="blueprint-panel-kicker">דיאלוג מונחה</span>
                                <h3>מטפל/ת ↔ מטופל/ת</h3>
                            </div>
                            <span class="blueprint-phone-status">${esc(view.activeNode ? `שאלה פתוחה: ${view.activeNode.label}` : 'ממתין לבחירת צומת')}</span>
                        </div>
                        <div class="blueprint-chat-thread" data-blueprint-chat-thread="1" role="log" aria-live="polite">
                            ${view.messages.map(bubble).join('')}
                        </div>
                        <form class="blueprint-composer" data-blueprint-composer="1">
                            <textarea name="reply"
                                      rows="${view.rawStatement ? 2 : 3}"
                                      placeholder="${esc(view.composerPlaceholder)}"
                                      ${view.composerEnabled ? '' : 'disabled'}></textarea>
                            <div class="blueprint-composer-footer">
                                <span class="blueprint-composer-hint">${esc(view.composerHint)}</span>
                                <button type="submit" class="btn btn-primary" ${view.composerEnabled ? '' : 'disabled'}>${esc(view.rawStatement ? 'שמור תשובה' : 'שמור משפט')}</button>
                            </div>
                        </form>
                    </div>
                </section>

                <aside class="blueprint-stage-card blueprint-stage-card--feedback">
                    <span class="blueprint-panel-kicker">משוב מאמן</span>
                    <h3>מה איכות המהלך כרגע</h3>
                    <p class="blueprint-stage-note">${esc(view.lastOrderNote)}</p>
                    <div class="blueprint-feedback-grid">
                        <div><strong>${esc(String(view.data.completedNodes))}</strong><span>צמתים מלאים</span></div>
                        <div><strong>${esc(String(view.data.partialNodes))}</strong><span>צמתים חלקיים</span></div>
                        <div><strong>${esc(String(view.orderScore))}%</strong><span>איכות סדר</span></div>
                    </div>
                    <div class="blueprint-stage-highlight blueprint-stage-highlight--soft">
                        <span>${view.activeNode ? 'הצומת הפעיל' : 'איך עובדים'}</span>
                        <strong>${esc(view.activeNode ? view.activeNode.label : 'הצ׳אט לא חופשי לגמרי')}</strong>
                        <p>${esc(view.activeNode ? view.activeNode.help : 'המפה מייצרת את השאלה, הצ׳אט מחזיק את התשובה, והסיכום נבנה משניהם יחד.')}</p>
                    </div>
                </aside>
            </section>

            <section class="blueprint-flow-shell" aria-label="מפת פעולה אינטראקטיבית">
                <div class="blueprint-section-head">
                    <div>
                        <span class="blueprint-panel-kicker">TOTE / Action Flow</span>
                        <h3>המפה שמייצרת את השאלות</h3>
                    </div>
                    <div class="blueprint-flow-legend" aria-hidden="true">
                        <span data-tone="locked">נעול</span>
                        <span data-tone="available">זמין</span>
                        <span data-tone="partial">חלקי</span>
                        <span data-tone="complete">מלא</span>
                    </div>
                </div>
                <div class="blueprint-flow-board">
                    ${view.nodes.map(nodeCard).join('')}
                </div>
            </section>

            <section class="blueprint-summary-shell ${view.summaryReady ? 'is-ready' : 'is-building'}" aria-label="מפת פעולה סופית">
                <div class="blueprint-section-head">
                    <div>
                        <span class="blueprint-panel-kicker">המפה שבנינו</span>
                        <h3>סיכום מהלך / תוכנית ביצוע</h3>
                    </div>
                    <span class="blueprint-summary-state">${esc(view.summaryReady ? 'מוכן לביצוע' : 'עדיין בבנייה')}</span>
                </div>
                <div class="blueprint-commitment-banner">
                    <span class="blueprint-panel-kicker">משפט מחויבות קצר</span>
                    <strong>${esc(view.data.conciseCommitment)}</strong>
                </div>
                <div id="final-blueprint" class="blueprint-summary-grid">
                    ${summaryCard('המשפט הגולמי', view.data.rawStatement, 'מאיפה יצאנו', 'raw')}
                    ${summaryCard('היעד שעבר טרנספורמציה', view.data.transformedOutcome, 'מה רוצים שיקרה במקום', 'success')}
                    ${summaryCard('הפעולה הנראית', view.data.visibleAction, 'מה אפשר לראות או לשמוע במציאות', 'default')}
                    ${summaryCard('המניע הרגשי', view.data.emotionalLever, 'למה זה באמת חשוב', 'default')}
                    ${summaryCard('החסם הצפוי', view.data.obstacles, 'איפה זה עלול להיתקע', 'warn')}
                    ${summaryCard('חלופה / Plan B', view.data.alternatives, 'מה עושים אם יש תקיעה', 'info', 'if-stuck-content')}
                    ${summaryCard('תנאי ביצוע', view.data.executionConditions, 'מתי, איפה ועם מי זה קורה', 'default')}
                    ${summaryCard('הצעד הראשון', view.data.firstStep, 'הצעד הכי קטן שאפשר לבצע עכשיו', 'success', 'next-physical-action')}
                    ${summaryCard('בדיקת סיום', view.data.finalTest, 'איך נדע שהתוכנית ברורה, מציאותית ומדידה', 'default')}
                </div>
                <div class="blueprint-summary-note">${esc(view.data.therapistSummary)}</div>
                <div class="blueprint-action-row">
                    <button id="export-json-btn" type="button" class="btn btn-secondary" data-blueprint-action="export">📥 ייצא JSON</button>
                    <button id="start-over-btn" type="button" class="btn btn-secondary" data-blueprint-action="reset">🔄 מהלך חדש</button>
                    <button id="do-it-now-btn" type="button" class="btn btn-primary" data-blueprint-action="start">⏱️ להתחיל בצעד הראשון</button>
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
        return render();
    }

    function reset() {
        state = initialState();
        return render();
    }

    function startNow() {
        const data = snapshot();
        if (!data.firstStep) {
            alert('כדי להתחיל עכשיו צריך קודם לסגור צעד ראשון ברור במפה.');
            return false;
        }
        alert(`מתחילים עכשיו.\n\nהצעד הראשון שלך: ${data.firstStep}\n\nהחזיקו את הכיוון: ${data.desiredOutcome || data.transformedOutcome}`);
        return true;
    }

    function exportJson() {
        const data = snapshot();
        if (!data.rawStatement) {
            alert('כדאי להתחיל ממשפט גולמי אחד לפני ייצוא.');
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
