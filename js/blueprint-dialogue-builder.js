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
