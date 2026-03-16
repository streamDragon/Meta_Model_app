(function attachComicEngineEscalation(global) {
    'use strict';
    const ROOT_ID = 'comicEngine';
    const FEATURE_ID = 'comic-engine';
    const STORAGE_KEY = 'comic_engine_progress_v2';
    const PREFS_KEY = 'comic_engine_prefs_v2';
    const PHASES = Object.freeze({
        DECISION: 'decision',
        PREVIEW: 'preview',
        SENDING: 'sending',
        ANALYSIS: 'analysis'
    });
    const LAYER_META = Object.freeze([
        Object.freeze({ key: 'opening', label: 'שכבה 1', title: 'פתיחה', color: 'green', timerSeconds: 16 }),
        Object.freeze({ key: 'escalation', label: 'שכבה 2', title: 'הסלמה', color: 'orange', timerSeconds: 14 }),
        Object.freeze({ key: 'breakpoint', label: 'שכבה 3', title: 'נקודת אל-חזור', color: 'red', timerSeconds: 12 })
    ]);
    const METRIC_META = Object.freeze([
        Object.freeze({
            key: 'flow',
            label: 'זרימה',
            description: 'כמה השיחה עדיין זזה קדימה ולא נתקעת סביב מאבק זהות או כוח.'
        }),
        Object.freeze({
            key: 'agency',
            label: 'סוכנות',
            description: 'כמה הילד עדיין מרגיש שיש לו יכולת להשתתף ולבחור צעד קטן.'
        }),
        Object.freeze({
            key: 'shame',
            label: 'בושה',
            description: 'כמה הטון מעביר לילד שהוא הבעיה, במקום לעזור לפרק את הקושי.'
        }),
        Object.freeze({
            key: 'reactivity',
            label: 'תגובתיות',
            description: 'כמה הבחירה נולדת מלחץ, צעקה, הכללה או שאלה רטורית במקום מסקרנות.'
        })
    ]);
    const ISSUE_META = Object.freeze([
        Object.freeze({
            key: 'Universal Quantifier',
            he: 'כמת כולל',
            patterns: [/תמיד/g, /אף פעם/g, /כולם/g, /כלום/g, /כל הזמן/g, /שוב ושוב/g]
        }),
        Object.freeze({
            key: 'Modal Operator',
            he: 'אופרטור מודאלי',
            patterns: [/אי אפשר/g, /אי-אפשר/g, /חייב/g, /צריך/g, /אסור/g, /לא יכול/g, /לא מסוגל/g]
        }),
        Object.freeze({
            key: 'Lost Performative',
            he: 'שיפוט בלי מקור',
            patterns: [/זה לא בסדר/g, /זה לא נורמלי/g, /זה פשוט נכון/g, /ככה צריך/g, /ככה לא מדברים/g]
        }),
        Object.freeze({
            key: 'Comparative Deletion',
            he: 'השוואה חסרה',
            patterns: [/יותר/g, /פחות/g, /גרוע יותר/g, /טוב יותר/g, /קשה יותר/g]
        }),
        Object.freeze({
            key: 'Simple Deletion',
            he: 'מחיקה פשוטה',
            patterns: [/ככה/g, /זה/g, /הכול/g, /משהו שם/g]
        }),
        Object.freeze({
            key: 'Unspecified Verb',
            he: 'פועל לא מפורט',
            patterns: [/לעשות/g, /לטפל/g, /לסדר/g, /לגמור/g, /להסתדר/g, /להרוס/g]
        })
    ]);

    let payloadPromise = null;

    function escapeHtml(value) {
        if (typeof global.escapeHtml === 'function') return global.escapeHtml(value);
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function normalizePayload(value) {
        if (typeof global.deepNormalizeUiPayload === 'function') {
            return global.deepNormalizeUiPayload(value);
        }
        return value;
    }

    function withAssetVersion(path) {
        if (typeof global.resolveVersionedAssetPath === 'function') {
            return global.resolveVersionedAssetPath(path);
        }
        if (typeof global.__withAssetVersion === 'function') {
            return global.__withAssetVersion(path);
        }
        return path;
    }

    function compact(value) {
        return String(value || '').trim().replace(/\s+/g, ' ');
    }

    function safeArray(value) {
        return Array.isArray(value) ? value : [];
    }

    function prefersReducedMotion() {
        try {
            return !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches);
        } catch (_error) {
            return false;
        }
    }

    function shortDelay(ms) {
        return prefersReducedMotion() ? 18 : ms;
    }

    function wait(ms) {
        return new Promise((resolve) => global.setTimeout(resolve, shortDelay(ms)));
    }

    function clone(value) {
        return JSON.parse(JSON.stringify(value));
    }

    function clamp(value, min = 0, max = 100) {
        const numeric = Number(value);
        if (!Number.isFinite(numeric)) return min;
        return Math.max(min, Math.min(max, Math.round(numeric)));
    }

    function currentLayerMeta(layerIndex) {
        return LAYER_META[layerIndex] || LAYER_META[0];
    }

    function readPrefs() {
        try {
            return JSON.parse(global.localStorage.getItem(PREFS_KEY) || '{}') || {};
        } catch (_error) {
            return {};
        }
    }

    function writePrefs(nextPrefs) {
        try {
            global.localStorage.setItem(PREFS_KEY, JSON.stringify({
                ...nextPrefs,
                updatedAt: new Date().toISOString()
            }));
        } catch (_error) {
            // ignore storage issues
        }
    }

    function writeProgress(state) {
        try {
            global.localStorage.setItem(STORAGE_KEY, JSON.stringify({
                layerIndex: state.layerIndex,
                branchKey: state.branchKey,
                metrics: state.metrics,
                path: state.path,
                outcome: state.outcome,
                updatedAt: new Date().toISOString()
            }));
        } catch (_error) {
            // ignore storage issues
        }
    }

    async function loadPayloads() {
        if (!payloadPromise) {
            payloadPromise = Promise.all([
                fetch(withAssetVersion('data/comic-scenarios.json'), { cache: 'no-store' })
                    .then((response) => {
                        if (!response.ok) throw new Error(`comic-scenarios ${response.status}`);
                        return response.json();
                    }),
                fetch(withAssetVersion('data/scenario-trainer-scenarios.json'), { cache: 'no-store' })
                    .then((response) => {
                        if (!response.ok) throw new Error(`scenario-trainer ${response.status}`);
                        return response.json();
                    })
            ]).then(([comicPayload, trainerPayload]) => ({
                comicPayload: normalizePayload(comicPayload),
                trainerPayload: normalizePayload(trainerPayload)
            }));
        }
        return payloadPromise;
    }

    function findComicScenario(payload) {
        return safeArray(payload?.scenarios).find((entry) => String(entry?.id || '') === 'parent_homework_01')
            || safeArray(payload?.scenarios)[0]
            || null;
    }

    function findTrainerScenario(payload) {
        return safeArray(payload?.scenarios).find((entry) => String(entry?.scenarioId || '') === 'parenting_homework_001')
            || safeArray(payload?.scenarios)[0]
            || null;
    }

    function makeChoice(definition) {
        return {
            id: compact(definition.id),
            emoji: compact(definition.emoji),
            label: compact(definition.label),
            sentence: compact(definition.sentence),
            tone: compact(definition.tone),
            rhetorical: !!definition.rhetorical,
            explanation: compact(definition.explanation),
            childLine: compact(definition.childLine),
            narratorLine: compact(definition.narratorLine),
            summary: compact(definition.summary),
            whyItMatters: compact(definition.whyItMatters),
            repairMove: compact(definition.repairMove),
            metaModelExplanation: compact(definition.metaModelExplanation),
            metrics: {
                flow: clamp(definition.metrics?.flow ?? 0, -100, 100),
                agency: clamp(definition.metrics?.agency ?? 0, -100, 100),
                shame: clamp(definition.metrics?.shame ?? 0, -100, 100),
                reactivity: clamp(definition.metrics?.reactivity ?? 0, -100, 100)
            },
            result: {
                nextBranch: compact(definition.result?.nextBranch),
                outcome: compact(definition.result?.outcome),
                endEarly: !!definition.result?.endEarly,
                childState: compact(definition.result?.childState),
                consequence: compact(definition.result?.consequence)
            }
        };
    }

    function buildScenario(trainerScenario, comicScenario) {
        const redResponses = safeArray(trainerScenario?.responseSet?.red);
        const byTone = {
            shame: redResponses.find((entry) => compact(entry?.tone) === 'shame') || {},
            control: redResponses.find((entry) => compact(entry?.tone) === 'impatient_control') || {},
            rescue: redResponses.find((entry) => compact(entry?.tone) === 'over_helping') || {},
            dismiss: redResponses.find((entry) => compact(entry?.tone) === 'dismissive_reassurance') || {}
        };
        const green = trainerScenario?.responseSet?.green || {};
        const childName = compact(trainerScenario?.role?.other || comicScenario?.characters?.left?.name || 'הילד');
        const parentName = compact(trainerScenario?.role?.player || comicScenario?.characters?.right?.name || 'הורה');
        const openingLine = compact(trainerScenario?.openingLine || comicScenario?.dialog?.[0]?.text || 'אני לא יודע מאיפה להתחיל.');
        const contextIntro = compact(trainerScenario?.contextIntro || trainerScenario?.surfaceConflict || '');
        const hiddenGap = compact(trainerScenario?.metaModelCore?.hiddenGap || green.metaModelExplanation || '');
        const whyItSticks = compact(trainerScenario?.metaModelCore?.whyItSticks || green.learningTakeaway || '');
        const domainLabel = compact(trainerScenario?.domainLabel || trainerScenario?.domain || comicScenario?.domain || 'הורות');
        const title = compact(trainerScenario?.sceneTitle || comicScenario?.title || 'שיעורים למחר');
        const parentSprite = compact(comicScenario?.characters?.right?.sprite || '');
        const childSprite = compact(comicScenario?.characters?.left?.sprite || '');
        const greenSentence = compact(green?.speakerLine);

        return {
            id: compact(trainerScenario?.scenarioId || comicScenario?.id || 'parenting_homework_001'),
            title,
            domainLabel,
            contextIntro,
            hiddenGap,
            whyItSticks,
            openingLine,
            parentName,
            childName,
            parentSprite,
            childSprite,
            learningFocus: compact(trainerScenario?.learningFocus || whyItSticks),
            supportPrompt: compact(trainerScenario?.supportPrompt || green.repairMove || ''),
            metaModelCore: {
                unspecifiedVerb: compact(trainerScenario?.metaModelCore?.unspecifiedVerb || 'לעשות שיעורים'),
                hiddenGap,
                whyItSticks
            },
            layers: [
                Object.freeze({
                    key: 'opening',
                    prompt: 'הילד פותח בקושי. עכשיו הכיוון שלך יקבע אם הוא יסביר, יתגונן או יקפא.',
                    childState: 'open',
                    timeout: makeChoice({
                        id: 'timeout_opening',
                        emoji: '⏳',
                        label: 'קיפאון',
                        sentence: 'את/ה קופא/ת ולא מגיב/ה.',
                        tone: 'freeze',
                        childLine: 'טוב... אם גם עכשיו אין תגובה, כנראה אני שוב לבד עם זה.',
                        narratorLine: 'גם לא להגיב זה להגיב.',
                        summary: 'השתיקה משדרת היעלמות רגשית, והילד נשאר לבד מול הגוש.',
                        whyItMatters: 'כשאין תגובה, הילד ממלא לבד את החלל בפרשנות של נטישה או חוסר עניין.',
                        repairMove: compact(green.repairMove || byTone.dismiss.repairMove),
                        metaModelExplanation: compact(byTone.dismiss.metaModelExplanation || hiddenGap),
                        metrics: { flow: -18, agency: -16, shame: 10, reactivity: 14 },
                        result: { nextBranch: 'frozen', outcome: 'ongoing', childState: 'withdrawn', consequence: 'הילד קפא מהשתיקה והקשר התרופף.' }
                    }),
                    choices: [
                        makeChoice({
                            id: 'rhetorical_many_times',
                            emoji: '😤',
                            label: 'שאלה תוקפת',
                            sentence: 'כמה פעמים צריך להגיד לך?!',
                            tone: 'hot',
                            rhetorical: true,
                            explanation: 'שאלה רטורית שלא מחפשת מידע.',
                            childLine: 'טוב, הבנתי... אז אני פשוט אשתוק.',
                            narratorLine: 'שאלה רטורית נשמעת כמו התקפה. היא לא פותחת מידע, היא סוגרת אותו.',
                            summary: 'הילד עובר להגנה ולא חושב יחד איתך על התרגיל.',
                            whyItMatters: compact(byTone.shame.whyItHurts),
                            repairMove: compact(byTone.shame.repairMove),
                            metaModelExplanation: compact(byTone.shame.metaModelExplanation || hiddenGap),
                            metrics: { flow: -24, agency: -18, shame: 26, reactivity: 24 },
                            result: { nextBranch: 'defensive', outcome: 'ongoing', childState: 'defensive', consequence: 'הילד מתכווץ ומתחיל להתגונן.' }
                        }),
                        makeChoice({
                            id: 'rhetorical_always',
                            emoji: '🫠',
                            label: 'הכללה צורבת',
                            sentence: 'למה אתה תמיד ככה?',
                            tone: 'hot',
                            rhetorical: true,
                            explanation: 'שאלה רטורית עם כמת כולל.',
                            childLine: 'כי אצלך אני תמיד הבעיה, אז למה שאני אסביר בכלל?',
                            narratorLine: 'כאן הכאב עובר מהמשימה לזהות: "אני הבעיה".',
                            summary: 'ההכללה מגדילה בושה, והילד מפסיק לחפש איתך פתרון.',
                            whyItMatters: compact(byTone.shame.emotionalImpact || byTone.shame.whyItHurts),
                            repairMove: compact(byTone.shame.repairMove),
                            metaModelExplanation: compact(byTone.shame.metaModelExplanation || hiddenGap),
                            metrics: { flow: -22, agency: -16, shame: 28, reactivity: 20 },
                            result: { nextBranch: 'defensive', outcome: 'ongoing', childState: 'hurt', consequence: 'הילד מתבצר בתחושה שהוא הבעיה.' }
                        }),
                        makeChoice({
                            id: 'control_command',
                            emoji: '🪑',
                            label: 'שליטה',
                            sentence: compact(byTone.control.speakerLine || 'שב עכשיו ואל תקום עד שתסיים.'),
                            tone: 'control',
                            childLine: 'אני יושב, אבל אני עדיין לא יודע מה לעשות.',
                            narratorLine: 'הגבול ברור, אבל המסלול עדיין עמום. יש ביצוע בלי מיפוי.',
                            summary: 'יש ציות חלקי, אבל אין התחלה אמיתית של המשימה.',
                            whyItMatters: compact(byTone.control.processImpact || byTone.control.whyItHurts),
                            repairMove: compact(byTone.control.repairMove),
                            metaModelExplanation: compact(byTone.control.metaModelExplanation || hiddenGap),
                            metrics: { flow: -14, agency: -18, shame: 14, reactivity: 16 },
                            result: { nextBranch: 'frozen', outcome: 'ongoing', childState: 'withdrawn', consequence: 'הילד מציית כלפי חוץ אך נשאר תקוע מבפנים.' }
                        }),
                        makeChoice({
                            id: 'repair_open',
                            emoji: '🟢',
                            label: 'עצירה ותיקון',
                            sentence: compact(greenSentence || 'בוא נעצור רגע ונפרק את זה לחתיכה אחת.'),
                            tone: 'repair',
                            childLine: compact(green.likelyOtherReply || 'ניסיתי את התרגיל השני ולא הבנתי מה רוצים. אולי נתחיל מהראשון.'),
                            narratorLine: 'הטון יורד, הבעיה מקבלת צורה, ונפתח צעד ראשון שאפשר להחזיק.',
                            summary: compact(green.feedbackHeadline || 'הקשר נשמר והמשימה מתפרקת לצעד ראשון.'),
                            whyItMatters: compact(green.whyItWorks || green.processImpact),
                            repairMove: compact(green.repairMove),
                            metaModelExplanation: compact(green.metaModelExplanation || hiddenGap),
                            metrics: { flow: 18, agency: 20, shame: -12, reactivity: -18 },
                            result: { nextBranch: 'repair', outcome: 'repair', endEarly: true, childState: 'open', consequence: 'ההסלמה נעצרת כבר בשכבה הראשונה.' }
                        })
                    ]
                }),
                Object.freeze({
                    key: 'escalation',
                    prompt: 'השכבה השנייה כבר לא עוסקת רק בשיעורים, אלא גם במה שהילד מרגיש על עצמו מולך.',
                    variants: Object.freeze({
                        defensive: Object.freeze({
                            childState: 'defensive',
                            timeout: makeChoice({
                                id: 'timeout_defensive',
                                emoji: '⏳',
                                label: 'היעלמות',
                                sentence: 'את/ה שוב שותק/ת.',
                                tone: 'freeze',
                                childLine: 'בסדר, אני כבר אפסיק לבקש.',
                                narratorLine: 'גם לא להגיב זה להגיב.',
                                summary: 'השתיקה מאשרת לילד שאין על מי להישען ברגע הזה.',
                                whyItMatters: 'אחרי שכבר עלתה הגנה, שתיקה נתפסת כמו ניתוק ולא כמו ויסות.',
                                repairMove: compact(green.repairMove || byTone.control.repairMove),
                                metaModelExplanation: compact(hiddenGap),
                                metrics: { flow: -18, agency: -18, shame: 12, reactivity: 10 },
                                result: { nextBranch: 'shutdown', outcome: 'ongoing', childState: 'closed', consequence: 'הילד מפסיק לנסות להסביר.' }
                            }),
                            choices: [
                                makeChoice({
                                    id: 'rhetorical_forbidden',
                                    emoji: '🔥',
                                    label: 'שאלה מאשימה',
                                    sentence: 'אז עכשיו גם אסור לי להגיד לך משהו?',
                                    tone: 'hot',
                                    rhetorical: true,
                                    explanation: 'השאלה מייצרת קרב על אשמה, לא שיתוף פעולה.',
                                    childLine: 'לא, פשוט אי אפשר לדבר איתך בלי להיענש.',
                                    narratorLine: 'כאן הוויכוח כבר עבר לתחושת סכנה בקשר.',
                                    summary: 'הילד עובר ממגננה לסדק עמוק יותר באמון.',
                                    whyItMatters: 'כששאלה משמשת כנשק, הילד מפסיק לשמוע תוכן ומתחיל להתמגן מפני הטון.',
                                    repairMove: compact(byTone.shame.repairMove),
                                    metaModelExplanation: 'שאלה רטורית לא אוספת מידע חדש. היא דוחפת את הילד להסביר את עצמו במקום לפרק את המשימה.',
                                    metrics: { flow: -18, agency: -16, shame: 20, reactivity: 18 },
                                    result: { nextBranch: 'fracture', outcome: 'ongoing', childState: 'angry', consequence: 'הקשר נסדק והוויכוח מתחמם.' }
                                }),
                                makeChoice({
                                    id: 'generalization_drama',
                                    emoji: '🧨',
                                    label: 'הכללה חמה',
                                    sentence: 'אתה תמיד הופך כל דבר לדרמה.',
                                    tone: 'hot',
                                    childLine: 'אם ככה, אני לא אומר כלום יותר.',
                                    narratorLine: 'הכללה כוללת מוחקת את הרגע הספציפי ומגדילה ריחוק.',
                                    summary: 'הילד מפסיק לתת מידע ומתחיל להסתגר.',
                                    whyItMatters: 'כשהכול נהיה "תמיד", אין מקום למידע חדש או לתיקון נקודתי.',
                                    repairMove: compact(byTone.shame.repairMove),
                                    metaModelExplanation: 'כמת אוניברסלי הופך תקיעה רגעית לזהות קבועה. זה מעלה חיכוך ומקטין סיכוי לשיתוף.',
                                    metrics: { flow: -16, agency: -14, shame: 18, reactivity: 16 },
                                    result: { nextBranch: 'fracture', outcome: 'ongoing', childState: 'hurt', consequence: 'הילד נסגר עוד צעד.' }
                                }),
                                makeChoice({
                                    id: 'rescue_takeover',
                                    emoji: '🛟',
                                    label: 'הצלה',
                                    sentence: compact(byTone.rescue.speakerLine || 'עזוב, אני אעשה איתך את הכול כי אין זמן.'),
                                    tone: 'rescue',
                                    childLine: compact(byTone.rescue.likelyOtherReply || 'טוב... אז תגידי לי מה לכתוב.'),
                                    narratorLine: 'יש הקלה רגעית, אבל הסוכנות עוברת למבוגר ולא לילד.',
                                    summary: 'המשימה נעה, אבל הילד נשאר בלי אחיזה משלו.',
                                    whyItMatters: compact(byTone.rescue.processImpact || byTone.rescue.whyItHurts),
                                    repairMove: compact(byTone.rescue.repairMove),
                                    metaModelExplanation: compact(byTone.rescue.metaModelExplanation || hiddenGap),
                                    metrics: { flow: -4, agency: -22, shame: 6, reactivity: 8 },
                                    result: { nextBranch: 'shutdown', outcome: 'ongoing', childState: 'withdrawn', consequence: 'הילד מוותר על השתתפות אמיתית.' }
                                }),
                                makeChoice({
                                    id: 'repair_defensive',
                                    emoji: '🫶',
                                    label: 'עצירה חמה',
                                    sentence: 'רגע. זה יצא חד. מה בתרגיל הראשון הכי לא ברור לך?',
                                    tone: 'repair',
                                    childLine: 'אני לא מבין מה שואלים בתרגיל השני.',
                                    narratorLine: 'הודאה קצרה בטון + שאלה קטנה אחת מחזירות את השיחה לעובדות.',
                                    summary: 'נעצרה הסלמה בשכבה השנייה ונפתח בירור אמיתי.',
                                    whyItMatters: compact(green.whyItWorks || green.processImpact),
                                    repairMove: compact(green.repairMove),
                                    metaModelExplanation: compact(green.metaModelExplanation || hiddenGap),
                                    metrics: { flow: 16, agency: 16, shame: -10, reactivity: -14 },
                                    result: { nextBranch: 'repair', outcome: 'repair', endEarly: true, childState: 'open', consequence: 'הקשר ניצל לפני שכבת השבר.' }
                                })
                            ]
                        }),
                        frozen: Object.freeze({
                            childState: 'withdrawn',
                            timeout: makeChoice({
                                id: 'timeout_frozen',
                                emoji: '⏳',
                                label: 'היסוס',
                                sentence: 'את/ה שומר/ת על שתיקה.',
                                tone: 'freeze',
                                childLine: 'טוב, אני פשוט אחכה שיהיה מאוחר מדי.',
                                narratorLine: 'גם לא לעשות זה לעשות.',
                                summary: 'אין מאבק גלוי, אבל הזמן נהיה חלק מההסלמה.',
                                whyItMatters: 'כשאין מילים, הילד לומד שהעומס רק מחכה להתפוצץ אחר כך.',
                                repairMove: compact(green.repairMove || byTone.dismiss.repairMove),
                                metaModelExplanation: compact(hiddenGap),
                                metrics: { flow: -16, agency: -14, shame: 8, reactivity: 10 },
                                result: { nextBranch: 'shutdown', outcome: 'ongoing', childState: 'closed', consequence: 'הילד מתנתק ומחכה לסוף.' }
                            }),
                            choices: [
                                makeChoice({
                                    id: 'rhetorical_all_evening',
                                    emoji: '⌛',
                                    label: 'לחץ בזמן',
                                    sentence: 'אז אתה מתכוון פשוט לשבת ככה כל הערב?',
                                    tone: 'hot',
                                    rhetorical: true,
                                    explanation: 'הזמן נהיה נשק, לא הקשר.',
                                    childLine: 'כן, כי גם ככה אני לא אצליח.',
                                    narratorLine: 'השאלה לא פותחת צעד ראשון; היא רק דוחפת את הילד להסביר כישלון.',
                                    summary: 'הקיפאון הופך לייאוש מוצהר.',
                                    whyItMatters: 'דחיפות בלי כיוון מייצרת תחושת חוסר-אונים, לא פעולה.',
                                    repairMove: compact(byTone.control.repairMove),
                                    metaModelExplanation: 'המשימה נשארת "גוש" אחד גדול. אין פירוק לצעד שאפשר להתחיל.',
                                    metrics: { flow: -18, agency: -16, shame: 16, reactivity: 16 },
                                    result: { nextBranch: 'shutdown', outcome: 'ongoing', childState: 'hurt', consequence: 'הילד מוותר בקול.' }
                                }),
                                makeChoice({
                                    id: 'rhetorical_basic',
                                    emoji: '😶',
                                    label: 'בושה שקטה',
                                    sentence: 'באמת כזה קשה לעשות משהו בסיסי?',
                                    tone: 'hot',
                                    rhetorical: true,
                                    explanation: 'שאלה שמקטינה את הילד במקום למפות את הקושי.',
                                    childLine: 'כולם מצליחים חוץ ממני.',
                                    narratorLine: 'כאן הקושי נהיה סיפור על ערך עצמי, לא על תרגיל מסוים.',
                                    summary: 'הבושה גדלה והילד מפנים שהוא "פחות".',
                                    whyItMatters: compact(byTone.shame.emotionalImpact || byTone.shame.whyItHurts),
                                    repairMove: compact(byTone.shame.repairMove),
                                    metaModelExplanation: 'השוואה סמויה מגדילה חיכוך ומנתקת את השיחה מהשאלה מה לא ברור במשימה.',
                                    metrics: { flow: -18, agency: -14, shame: 20, reactivity: 14 },
                                    result: { nextBranch: 'fracture', outcome: 'ongoing', childState: 'hurt', consequence: 'הילד מפנים עלבון ונשבר עוד צעד.' }
                                }),
                                makeChoice({
                                    id: 'rescue_finish',
                                    emoji: '📝',
                                    label: 'לעשות במקומו',
                                    sentence: 'טוב, תן לי. אני גומר את זה במקומך.',
                                    tone: 'rescue',
                                    childLine: 'אז למה בכלל ניסיתי.',
                                    narratorLine: 'יש סוף מהיר לרגע הזה, אבל גם מסר שאין לילד דרך משלו לעבור את המחסום.',
                                    summary: 'המשימה נסגרת טכנית, אבל האמון ביכולת נחתך.',
                                    whyItMatters: compact(byTone.rescue.learningTakeaway || byTone.rescue.whyItHurts),
                                    repairMove: compact(byTone.rescue.repairMove),
                                    metaModelExplanation: compact(byTone.rescue.metaModelExplanation || hiddenGap),
                                    metrics: { flow: -2, agency: -22, shame: 10, reactivity: 6 },
                                    result: { nextBranch: 'shutdown', outcome: 'ongoing', childState: 'withdrawn', consequence: 'הילד מפסיק להיות שותף.' }
                                }),
                                makeChoice({
                                    id: 'repair_freeze',
                                    emoji: '🌱',
                                    label: 'צעד קטן',
                                    sentence: 'אני איתך. בוא נסמן רק את התרגיל הראשון, לא את כל המחברת.',
                                    tone: 'repair',
                                    childLine: 'אוקיי... התרגיל הראשון עוד איכשהו אפשר.',
                                    narratorLine: 'הגודל של כל המשימה מתכווץ ליחידה אחת שאפשר להחזיק.',
                                    summary: 'נעצרה הידרדרות בשכבה השנייה והילד חוזר לקשר.',
                                    whyItMatters: compact(green.processImpact || green.whyItWorks),
                                    repairMove: compact(green.repairMove),
                                    metaModelExplanation: compact(green.metaModelExplanation || hiddenGap),
                                    metrics: { flow: 18, agency: 18, shame: -10, reactivity: -14 },
                                    result: { nextBranch: 'repair', outcome: 'repair', endEarly: true, childState: 'open', consequence: 'ההסלמה נבלמה דרך פירוק למשימה קטנה.' }
                                })
                            ]
                        })
                    })
                }),
                Object.freeze({
                    key: 'breakpoint',
                    prompt: 'השכבה השלישית היא כבר סף השבר. גם תיקון כאן מגיע מאוחר ובמחיר כבד.',
                    variants: Object.freeze({
                        fracture: Object.freeze({
                            childState: 'angry',
                            timeout: makeChoice({
                                id: 'timeout_fracture',
                                emoji: '⏳',
                                label: 'קריסה',
                                sentence: 'את/ה לא אומר/ת כלום.',
                                tone: 'freeze',
                                childLine: 'עזוב, אני כבר לא פותח את זה.',
                                narratorLine: 'גם לא להגיב זה להגיב.',
                                summary: 'הקשר נסגר. השתיקה כאן נשמעת כמו ויתור הדדי.',
                                whyItMatters: 'בנקודת השבר, היעדר תגובה נקלט כסיום הקשר ולא כזמן לחשוב.',
                                repairMove: compact(green.repairMove),
                                metaModelExplanation: compact(hiddenGap),
                                metrics: { flow: -20, agency: -18, shame: 10, reactivity: 8 },
                                result: { nextBranch: 'fracture', outcome: 'explosion', endEarly: true, childState: 'closed', consequence: 'הסצנה נסגרת בפיצוץ שקט.' }
                            }),
                            choices: [
                                makeChoice({
                                    id: 'breakpoint_attack',
                                    emoji: '💥',
                                    label: 'פיצוץ',
                                    sentence: 'אתה שומע את עצמך בכלל?!',
                                    tone: 'hot',
                                    rhetorical: true,
                                    explanation: 'כאן כבר לא נשאלת שאלה, אלא נזרקת התקפה.',
                                    childLine: 'ברור. אתה תמיד בטוח שאני הבעיה, אז אין לי למה לנסות.',
                                    narratorLine: 'השיחה עברה סופית מהמשימה לזהות וליחס.',
                                    summary: 'הקשר מתפוצץ והילד מסיק מסקנה כוללת על עצמו מולך.',
                                    whyItMatters: 'זה השלב שבו שאלה רטורית הופכת לפסק-דין על הקשר.',
                                    repairMove: compact(byTone.shame.repairMove),
                                    metaModelExplanation: 'כאן כבר שומעים גם כמת כולל, גם מודאליות, וגם מחיקה של המשימה עצמה.',
                                    metrics: { flow: -20, agency: -18, shame: 24, reactivity: 18 },
                                    result: { nextBranch: 'fracture', outcome: 'explosion', endEarly: true, childState: 'angry', consequence: 'פיצוץ מלא.' }
                                }),
                                makeChoice({
                                    id: 'breakpoint_judgment',
                                    emoji: '⛔',
                                    label: 'פסק דין',
                                    sentence: 'אי אפשר לדבר איתך.',
                                    tone: 'hot',
                                    childLine: 'אז גם אני לא אדבר. יותר קל ככה.',
                                    narratorLine: 'המשפט סוגר את היחסים, לא רק את הסצנה.',
                                    summary: 'הילד בוחר ניתוק במקום קשר.',
                                    whyItMatters: 'מודליות מוחלטת מוחקת אפשרות לתיקון בזמן אמת.',
                                    repairMove: compact(byTone.control.repairMove),
                                    metaModelExplanation: '״אי אפשר״ סוגר את כל המרחב האפשרי. אין יותר בירור, רק סיום.',
                                    metrics: { flow: -18, agency: -16, shame: 18, reactivity: 14 },
                                    result: { nextBranch: 'fracture', outcome: 'explosion', endEarly: true, childState: 'closed', consequence: 'ניתוק גלוי.' }
                                }),
                                makeChoice({
                                    id: 'breakpoint_withdraw',
                                    emoji: '🚪',
                                    label: 'נטישה',
                                    sentence: 'סיימנו. תתמודד לבד.',
                                    tone: 'hot',
                                    childLine: 'יופי. אני גם ככה לא יכול לעשות כלום.',
                                    narratorLine: 'המסר לילד: אתה לבד מול הבעיה ומול הבושה.',
                                    summary: 'הילד קורס לתחושת חוסר-אונים מלאה.',
                                    whyItMatters: 'כשהמבוגר עוזב את הקשר, המשימה נשארת גוש בלתי פתיר והילד לבד איתו.',
                                    repairMove: compact(green.repairMove),
                                    metaModelExplanation: '״לעשות כלום״ נשאר פועל עמום וכבד. אין צעד, אין אחיזה, רק ויתור.',
                                    metrics: { flow: -22, agency: -20, shame: 16, reactivity: 16 },
                                    result: { nextBranch: 'fracture', outcome: 'explosion', endEarly: true, childState: 'withdrawn', consequence: 'ויתור מלא.' }
                                }),
                                makeChoice({
                                    id: 'breakpoint_late_repair',
                                    emoji: '🟡',
                                    label: 'תיקון מאוחר',
                                    sentence: 'עצור. אני מגזים. מה הדבר הראשון שצריך להבין כאן?',
                                    tone: 'repair',
                                    childLine: 'מאוחר מדי... עכשיו אני כבר סגור.',
                                    narratorLine: 'יש ניסיון תיקון, אבל הוא מגיע אחרי שהאמון כבר נחתך.',
                                    summary: 'התיקון חשוב פדגוגית, אבל הוא כבר לא מחזיר את השיחה לירוק.',
                                    whyItMatters: 'תיקון מאוחר מלמד אחריות, אך לא מוחק את הפגיעה שכבר נבנתה בשכבה השלישית.',
                                    repairMove: compact(green.repairMove),
                                    metaModelExplanation: compact(green.metaModelExplanation || hiddenGap),
                                    metrics: { flow: 2, agency: 2, shame: -4, reactivity: -6 },
                                    result: { nextBranch: 'fracture', outcome: 'late_repair', endEarly: true, childState: 'closed', consequence: 'תיקון מאוחר מדי.' }
                                })
                            ]
                        }),
                        shutdown: Object.freeze({
                            childState: 'closed',
                            timeout: makeChoice({
                                id: 'timeout_shutdown',
                                emoji: '⏳',
                                label: 'קיפאון מלא',
                                sentence: 'שוב אין תגובה.',
                                tone: 'freeze',
                                childLine: 'בסדר, גם ככה אי אפשר כבר להתחיל.',
                                narratorLine: 'גם לא לעשות זה לעשות.',
                                summary: 'ההיסוס הפך להכרעת-ברירת-מחדל: לא מתחילים בכלל.',
                                whyItMatters: 'כאן הזמן עצמו נהיה חלק מהפגיעה.',
                                repairMove: compact(green.repairMove),
                                metaModelExplanation: compact(hiddenGap),
                                metrics: { flow: -18, agency: -16, shame: 8, reactivity: 8 },
                                result: { nextBranch: 'shutdown', outcome: 'explosion', endEarly: true, childState: 'closed', consequence: 'סגירה מלאה.' }
                            }),
                            choices: [
                                makeChoice({
                                    id: 'shutdown_command',
                                    emoji: '🧱',
                                    label: 'כפייה',
                                    sentence: 'פשוט תעשה מה שאמרתי וזהו.',
                                    tone: 'hot',
                                    childLine: 'אני לא יודע איך, אז אני פשוט לא עושה.',
                                    narratorLine: 'הציווי נשמע חד, אבל לא פותח שום נתיב ביצועי.',
                                    summary: 'הילד נשאר בלי מפת דרכים ובלי חיבור.',
                                    whyItMatters: 'דרישה כללית בלי פירוק רק מחריפה את תחושת חוסר-היכולת.',
                                    repairMove: compact(byTone.control.repairMove),
                                    metaModelExplanation: compact(byTone.control.metaModelExplanation || hiddenGap),
                                    metrics: { flow: -18, agency: -18, shame: 14, reactivity: 12 },
                                    result: { nextBranch: 'shutdown', outcome: 'explosion', endEarly: true, childState: 'closed', consequence: 'שיתוק תחת כפייה.' }
                                }),
                                makeChoice({
                                    id: 'shutdown_guilt',
                                    emoji: '🫥',
                                    label: 'אשמה',
                                    sentence: 'בגללך כל הבית תקוע עכשיו.',
                                    tone: 'hot',
                                    childLine: 'כולם תמיד נתקעים בגללי. עדיף שאשתוק.',
                                    narratorLine: 'המשימה נעלמה; נשארה רק אשמה על עצם הקיום בשיחה.',
                                    summary: 'הילד בולע מסקנה כוללת ומתרחק עוד יותר.',
                                    whyItMatters: 'האשמה מעבירה את הילד למאבק על ערך עצמי במקום על צעד ראשון.',
                                    repairMove: compact(byTone.shame.repairMove),
                                    metaModelExplanation: 'כאן מצטברים גם כמת כולל וגם שיפוט בלי מקור. זה מייצר פגיעה רחבה יותר מהאירוע עצמו.',
                                    metrics: { flow: -18, agency: -16, shame: 22, reactivity: 14 },
                                    result: { nextBranch: 'shutdown', outcome: 'explosion', endEarly: true, childState: 'hurt', consequence: 'בושה עמוקה.' }
                                }),
                                makeChoice({
                                    id: 'shutdown_avoid',
                                    emoji: '🌫️',
                                    label: 'דחייה',
                                    sentence: 'עזוב, נדבר מחר.',
                                    tone: 'avoid',
                                    childLine: 'מחר זה שוב יהיה יותר גרוע.',
                                    narratorLine: 'ההקלה מיידית, אבל המחיר נדחה לרגע עם פחות כוח ויותר בושה.',
                                    summary: 'הילד לומד שהקושי רק נדחה, לא נפתר.',
                                    whyItMatters: compact(byTone.dismiss.processImpact || byTone.dismiss.whyItHurts),
                                    repairMove: compact(byTone.dismiss.repairMove),
                                    metaModelExplanation: compact(byTone.dismiss.metaModelExplanation || hiddenGap),
                                    metrics: { flow: -14, agency: -12, shame: 10, reactivity: 8 },
                                    result: { nextBranch: 'shutdown', outcome: 'explosion', endEarly: true, childState: 'withdrawn', consequence: 'דחייה שמחמירה את מחר.' }
                                }),
                                makeChoice({
                                    id: 'shutdown_late_repair',
                                    emoji: '🟡',
                                    label: 'תיקון מאוחר',
                                    sentence: 'אני לא רוצה להמשיך ככה. בוא נקרא רק את השאלה הראשונה.',
                                    tone: 'repair',
                                    childLine: 'אולי... אבל כבר ירד לי כל האוויר.',
                                    narratorLine: 'יש חזרה חלקית לקשר, אבל לא לפני שהשיחה כבר עברה את סף השחיקה.',
                                    summary: 'התיקון ראוי, אבל הנזק כבר הורגש בגוף השיחה.',
                                    whyItMatters: 'שכבה שלישית היא שיעור חשוב לאחריות, לא תמיד רגע שאפשר להפוך לירוק.',
                                    repairMove: compact(green.repairMove),
                                    metaModelExplanation: compact(green.metaModelExplanation || hiddenGap),
                                    metrics: { flow: 4, agency: 4, shame: -4, reactivity: -6 },
                                    result: { nextBranch: 'shutdown', outcome: 'late_repair', endEarly: true, childState: 'hurt', consequence: 'תיקון אחרי נקודת האל-חזור.' }
                                })
                            ]
                        })
                    })
                })
            ]
        };
    }

    function assetMarkup(src, alt, fallbackText) {
        const safeAlt = escapeHtml(alt || fallbackText || 'דמות');
        const safeFallback = escapeHtml(fallbackText || alt || 'דמות');
        if (!compact(src)) {
            return `<span class="ceflow-v3-avatar-fallback" aria-hidden="true">${safeFallback.slice(0, 1)}</span>`;
        }
        return `<img src="${escapeHtml(withAssetVersion(src))}" alt="${safeAlt}" loading="lazy" decoding="async" onerror="this.style.display='none'; this.nextElementSibling && (this.nextElementSibling.hidden=false);" /><span class="ceflow-v3-avatar-fallback" hidden aria-hidden="true">${safeFallback.slice(0, 1)}</span>`;
    }

    function buildShellMarkup(scenario) {
        const childAvatar = assetMarkup(scenario.childSprite, scenario.childName, scenario.childName);
        const parentAvatar = assetMarkup(scenario.parentSprite, scenario.parentName, scenario.parentName);
        return `
            <div class="ceflow-v3" dir="rtl">
                <div class="ceflow-floating-note hidden" id="ceflow-floating-note" aria-live="polite"></div>
                <div class="ceflow-distractor hidden" id="ceflow-distractor" aria-live="polite"></div>
                <header class="ceflow-v3-top">
                    <div class="ceflow-v3-shotclock-wrap" id="ceflow-shotclock-shell" aria-live="polite">
                        <div id="ceflow-shotclock" class="ceflow-shotclock" role="timer" aria-label="שעון בחירה">
                            <div id="ceflow-shotclock-ring" class="ceflow-shotclock-ring">
                                <span id="ceflow-shotclock-seconds">16</span>
                            </div>
                            <div class="ceflow-shotclock-copy">
                                <strong>לחץ זמן</strong>
                                <small id="ceflow-shotclock-label">זמן לבחירה</small>
                            </div>
                        </div>
                    </div>
                    <div class="ceflow-v3-headline">
                        <div class="ceflow-v3-headline-top">
                            <button id="ceflow-step-back" class="btn btn-secondary ceflow-small-btn" type="button" disabled>↩ חזרה צעד</button>
                            <button id="ceflow-info-btn" class="btn btn-secondary ceflow-small-btn" type="button">למה זה עובד?</button>
                        </div>
                        <div class="ceflow-chip-row">
                            <span id="ceflow-domain" class="ceflow-chip">${escapeHtml(scenario.domainLabel)}</span>
                            <span id="ceflow-progress" class="ceflow-chip">1 / 3</span>
                            <span id="ceflow-level" class="ceflow-chip">שכבה 1</span>
                        </div>
                        <div id="ceflow-progress-dots" class="ceflow-progress-dots" aria-label="התקדמות שכבות"></div>
                        <h3 id="ceflow-title" class="ceflow-title">${escapeHtml(scenario.title)}</h3>
                        <p id="ceflow-scene-subtitle" class="ceflow-scene-subtitle">${escapeHtml(scenario.contextIntro)}</p>
                    </div>
                </header>

                <button id="ceflow-overlay" class="ceflow-overlay ceflow-metrics-banner" type="button" aria-expanded="false">
                    <div class="ceflow-hud-head">
                        <span class="ceflow-hud-kicker">מדדים חיים</span>
                        <strong id="ceflow-banner-title">חום נמוך, חלון תיקון פתוח</strong>
                    </div>
                    <div class="ceflow-metrics-chips">
                        <span id="ceflow-banner-heat" class="ceflow-chip">חום 0</span>
                        <span id="ceflow-banner-friction" class="ceflow-chip">חיכוך 0</span>
                        <span id="ceflow-banner-state" class="ceflow-chip">פתיחה</span>
                    </div>
                    <span class="ceflow-hud-link">לחץ/י לפירוט המדדים</span>
                </button>

                <section id="ceflow-metrics-panel" class="ceflow-metrics-panel hidden" aria-live="polite"></section>

                <section class="ceflow-v3-stage-shell">
                    <div class="ceflow-v3-character-strip">
                        <article class="ceflow-v3-character-card is-child">
                            <div class="ceflow-v3-avatar">${childAvatar}</div>
                            <div>
                                <strong>${escapeHtml(scenario.childName)}</strong>
                                <small>הילד/ה</small>
                            </div>
                        </article>
                        <article class="ceflow-v3-character-card is-parent">
                            <div class="ceflow-v3-avatar">${parentAvatar}</div>
                            <div>
                                <strong>${escapeHtml(scenario.parentName)}</strong>
                                <small>הורה</small>
                            </div>
                        </article>
                    </div>

                    <section id="ceflow-consequence-banner" class="ceflow-consequence-banner" aria-live="polite"></section>
                    <section class="ceflow-stage ceflow-stage--chat">
                        <header id="ceflow-stage-status" class="ceflow-stage-status" aria-live="polite"></header>
                        <div id="ceflow-turn-transition-layer" class="ceflow-turn-transition-layer" aria-live="polite"></div>
                        <div id="ceflow-dialog" class="ceflow-dialog ceflow-dialog--chat"></div>
                    </section>
                </section>

                <section id="ceflow-timeout" class="ceflow-timeout hidden" aria-live="polite"></section>

                <section class="ceflow-choice-panel ceflow-choice-panel--arc">
                    <div class="ceflow-choice-panel-head">
                        <h4 id="ceflow-choice-title" class="ceflow-block-title">בחר/י תגובה עם כיוון</h4>
                        <p id="ceflow-choice-copy" class="ceflow-choice-copy">כל בחירה כאן לא רק נשמעת אחרת, אלא דוחפת את הילד לשיתוף, הגנה או קיפאון.</p>
                        <p id="ceflow-choice-affordance" class="ceflow-choice-affordance" data-state="ready">בחר/י אחת מארבע התגובות בקשת כדי לכוון את הרגע הבא.</p>
                    </div>
                    <section id="ceflow-scene-rail" class="ceflow-scene-rail" aria-live="polite"></section>
                    <div id="ceflow-choice-deck" class="ceflow-choice-deck ceflow-choice-deck--arc" role="group" aria-label="אפשרויות תגובה"></div>
                    <section id="ceflow-reply-box" class="ceflow-reply-box hidden" aria-live="polite">
                        <div class="ceflow-section-head">
                            <p class="ceflow-section-kicker">תצוגה מקדימה</p>
                            <h4 id="ceflow-reply-title" class="ceflow-block-title">כך תישמע/י לפני שליחה</h4>
                        </div>
                        <div id="ceflow-reply-quick" class="ceflow-reply-quick"></div>
                        <label for="ceflow-reply-input" class="ceflow-input-label">התגובה שבחרת</label>
                        <textarea id="ceflow-reply-input" rows="2" readonly></textarea>
                        <div class="ceflow-inline-actions">
                            <button id="ceflow-reply-step-back" class="btn btn-secondary" type="button" disabled>↩ חזרה</button>
                            <button id="ceflow-reply-confirm" class="btn btn-primary" type="button">שלח</button>
                            <small id="ceflow-reply-status" aria-live="polite"></small>
                        </div>
                    </section>
                </section>

                <section id="ceflow-feedback" class="ceflow-feedback hidden" aria-live="polite"></section>
                <section id="ceflow-turn-snapshot" class="ceflow-turn-snapshot hidden" aria-live="polite"></section>
                <section id="ceflow-analysis" class="ceflow-analysis hidden" aria-live="polite"></section>

                <footer class="ceflow-controls">
                    <button id="ceflow-retry" class="btn btn-secondary" type="button">↻ התחל מחדש</button>
                    <button id="ceflow-next-scene" class="btn btn-primary hidden" type="button">לניתוח</button>
                </footer>
            </div>
        `;
    }

    function collectEls(root) {
        return {
            root,
            infoBtn: root.querySelector('#ceflow-info-btn'),
            stepBack: root.querySelector('#ceflow-step-back'),
            domain: root.querySelector('#ceflow-domain'),
            progress: root.querySelector('#ceflow-progress'),
            level: root.querySelector('#ceflow-level'),
            progressDots: root.querySelector('#ceflow-progress-dots'),
            title: root.querySelector('#ceflow-title'),
            sceneSubtitle: root.querySelector('#ceflow-scene-subtitle'),
            shotClock: root.querySelector('#ceflow-shotclock'),
            shotClockRing: root.querySelector('#ceflow-shotclock-ring'),
            shotClockSeconds: root.querySelector('#ceflow-shotclock-seconds'),
            shotClockLabel: root.querySelector('#ceflow-shotclock-label'),
            banner: root.querySelector('#ceflow-overlay'),
            bannerTitle: root.querySelector('#ceflow-banner-title'),
            bannerHeat: root.querySelector('#ceflow-banner-heat'),
            bannerFriction: root.querySelector('#ceflow-banner-friction'),
            bannerState: root.querySelector('#ceflow-banner-state'),
            metricsPanel: root.querySelector('#ceflow-metrics-panel'),
            consequence: root.querySelector('#ceflow-consequence-banner'),
            stageStatus: root.querySelector('#ceflow-stage-status'),
            turnLayer: root.querySelector('#ceflow-turn-transition-layer'),
            dialog: root.querySelector('#ceflow-dialog'),
            timeout: root.querySelector('#ceflow-timeout'),
            choiceTitle: root.querySelector('#ceflow-choice-title'),
            choiceCopy: root.querySelector('#ceflow-choice-copy'),
            choiceAffordance: root.querySelector('#ceflow-choice-affordance'),
            sceneRail: root.querySelector('#ceflow-scene-rail'),
            deck: root.querySelector('#ceflow-choice-deck'),
            replyBox: root.querySelector('#ceflow-reply-box'),
            replyTitle: root.querySelector('#ceflow-reply-title'),
            replyQuick: root.querySelector('#ceflow-reply-quick'),
            replyInput: root.querySelector('#ceflow-reply-input'),
            replyStepBack: root.querySelector('#ceflow-reply-step-back'),
            replyConfirm: root.querySelector('#ceflow-reply-confirm'),
            replyStatus: root.querySelector('#ceflow-reply-status'),
            feedback: root.querySelector('#ceflow-feedback'),
            turnSnapshot: root.querySelector('#ceflow-turn-snapshot'),
            analysis: root.querySelector('#ceflow-analysis'),
            retry: root.querySelector('#ceflow-retry'),
            next: root.querySelector('#ceflow-next-scene'),
            floatingNote: root.querySelector('#ceflow-floating-note')
        };
    }

    function buildInitialTranscript(scenario) {
        return [
            {
                id: 'opening-child',
                side: 'left',
                role: 'child',
                speaker: scenario.childName,
                text: scenario.openingLine,
                tone: 'open'
            }
        ];
    }

    function getBranchLayerData(scenario, layerIndex, branchKey) {
        const layer = scenario.layers[layerIndex];
        if (!layer) return null;
        if (layerIndex === 0) return layer;
        const key = compact(branchKey) || 'defensive';
        return layer.variants?.[key] || layer.variants?.defensive || layer.variants?.fracture || null;
    }

    function deriveMetrics(metrics, layerIndex, outcome) {
        const heat = clamp(((metrics.shame + metrics.reactivity) / 2) + (layerIndex * 10));
        const friction = clamp(((100 - metrics.flow) * 0.45) + (metrics.shame * 0.35) + (metrics.reactivity * 0.2));
        const stateLabel = outcome === 'repair'
            ? 'יציאה מהסלמה'
            : outcome === 'explosion' || outcome === 'late_repair'
                ? 'התפוצצות'
                : currentLayerMeta(layerIndex).title;
        return { heat, friction, stateLabel };
    }

    function detectIssues(text) {
        const source = compact(text);
        return ISSUE_META.filter((issue) => issue.patterns.some((pattern) => {
            pattern.lastIndex = 0;
            return pattern.test(source);
        }))
            .map((issue) => ({
                key: issue.key,
                he: issue.he
            }));
    }

    function toneClass(choice) {
        const tone = compact(choice?.tone || 'neutral');
        if (tone === 'repair') return 'ceflow-tone-good';
        if (tone === 'hot') return 'ceflow-tone-danger';
        if (tone === 'control') return 'ceflow-tone-warn';
        if (tone === 'rescue') return 'ceflow-tone-purple';
        if (tone === 'avoid' || tone === 'freeze') return 'ceflow-tone-muted';
        return 'ceflow-tone-muted';
    }

    function bubbleTone(line) {
        if (line.role === 'narrator') return 'soft';
        if (line.tone === 'repair' || line.tone === 'open') return 'open';
        if (line.tone === 'hot') return 'escalated';
        if (line.tone === 'angry') return 'escalated';
        if (line.tone === 'control') return 'defensive';
        if (line.tone === 'defensive') return 'defensive';
        if (line.tone === 'withdrawn' || line.tone === 'closed') return 'hurt';
        if (line.tone === 'rescue') return 'hurt';
        return 'soft';
    }

    function createState(scenario) {
        return {
            phase: PHASES.DECISION,
            layerIndex: 0,
            branchKey: 'opening',
            selectedChoiceId: '',
            selectedChoice: null,
            transcript: buildInitialTranscript(scenario),
            path: [],
            metrics: {
                flow: 58,
                agency: 56,
                shame: 28,
                reactivity: 30
            },
            outcome: 'ongoing',
            consequenceCopy: 'עדיין יש חלון פתוח להכוונה בלי פיצוץ.',
            metricsOpen: false,
            history: [],
            pendingTimers: [],
            timerHandle: 0,
            timerStartedAt: 0,
            timerRemainingMs: currentLayerMeta(0).timerSeconds * 1000,
            analysisFocus: null,
            floatingMessage: ''
        };
    }

    function makeSnapshot(state) {
        return clone({
            phase: state.phase,
            layerIndex: state.layerIndex,
            branchKey: state.branchKey,
            selectedChoiceId: state.selectedChoiceId,
            selectedChoice: state.selectedChoice,
            transcript: state.transcript,
            path: state.path,
            metrics: state.metrics,
            outcome: state.outcome,
            consequenceCopy: state.consequenceCopy,
            metricsOpen: state.metricsOpen,
            timerRemainingMs: state.timerRemainingMs,
            analysisFocus: state.analysisFocus,
            floatingMessage: state.floatingMessage
        });
    }

    function restoreSnapshot(runtime, snapshot) {
        if (!snapshot) return;
        stopTimer(runtime);
        clearPendingTimers(runtime);
        runtime.state.phase = snapshot.phase;
        runtime.state.layerIndex = snapshot.layerIndex;
        runtime.state.branchKey = snapshot.branchKey;
        runtime.state.selectedChoiceId = snapshot.selectedChoiceId;
        runtime.state.selectedChoice = snapshot.selectedChoice;
        runtime.state.transcript = snapshot.transcript;
        runtime.state.path = snapshot.path;
        runtime.state.metrics = snapshot.metrics;
        runtime.state.outcome = snapshot.outcome;
        runtime.state.consequenceCopy = snapshot.consequenceCopy;
        runtime.state.metricsOpen = snapshot.metricsOpen;
        runtime.state.timerRemainingMs = snapshot.timerRemainingMs;
        runtime.state.analysisFocus = snapshot.analysisFocus;
        runtime.state.floatingMessage = snapshot.floatingMessage;
        render(runtime);
    }

    function pushHistory(runtime) {
        runtime.state.history.push(makeSnapshot(runtime.state));
        if (runtime.state.history.length > 24) {
            runtime.state.history.splice(0, runtime.state.history.length - 24);
        }
    }

    function clearPendingTimers(runtime) {
        runtime.state.pendingTimers.forEach((handle) => global.clearTimeout(handle));
        runtime.state.pendingTimers = [];
    }

    function schedule(runtime, fn, delayMs) {
        const handle = global.setTimeout(() => {
            runtime.state.pendingTimers = runtime.state.pendingTimers.filter((item) => item !== handle);
            fn();
        }, shortDelay(delayMs));
        runtime.state.pendingTimers.push(handle);
        return handle;
    }

    function visibleChoiceSet(runtime) {
        const layerData = getBranchLayerData(runtime.scenario, runtime.state.layerIndex, runtime.state.branchKey);
        return safeArray(layerData?.choices);
    }

    function currentTimeoutChoice(runtime) {
        const layerData = getBranchLayerData(runtime.scenario, runtime.state.layerIndex, runtime.state.branchKey);
        return layerData?.timeout || null;
    }

    function isTabActive() {
        const section = global.document.getElementById(FEATURE_ID);
        return !!section && section.classList.contains('active');
    }

    function stopTimer(runtime) {
        if (runtime.state.timerHandle) {
            global.clearInterval(runtime.state.timerHandle);
            runtime.state.timerHandle = 0;
        }
    }

    function pauseTimer(runtime) {
        if (!runtime || !runtime.state) return;
        if (runtime.state.timerHandle) {
            const elapsed = Math.max(0, Date.now() - (runtime.state.timerStartedAt || Date.now()));
            runtime.state.timerRemainingMs = Math.max(0, runtime.state.timerRemainingMs - elapsed);
        }
        stopTimer(runtime);
        renderShotClock(runtime);
    }

    function updateTimer(runtime) {
        const { state } = runtime;
        if (!isTabActive() || global.document.hidden) {
            pauseTimer(runtime);
            return;
        }
        if (state.phase !== PHASES.DECISION) {
            stopTimer(runtime);
            renderShotClock(runtime);
            return;
        }
        const remaining = Math.max(0, state.timerRemainingMs - (Date.now() - state.timerStartedAt));
        state.timerRemainingMs = remaining;
        state.timerStartedAt = Date.now();
        renderShotClock(runtime);
        if (remaining <= 0) {
            stopTimer(runtime);
            handleTimeout(runtime);
        }
    }

    function startTimer(runtime, reset = false) {
        stopTimer(runtime);
        if (!isTabActive()) return;
        if (reset) {
            runtime.state.timerRemainingMs = currentLayerMeta(runtime.state.layerIndex).timerSeconds * 1000;
        }
        runtime.state.timerStartedAt = Date.now();
        renderShotClock(runtime);
        runtime.state.timerHandle = global.setInterval(() => updateTimer(runtime), 200);
    }

    function resetForNextLayer(runtime) {
        runtime.state.phase = PHASES.DECISION;
        runtime.state.selectedChoiceId = '';
        runtime.state.selectedChoice = null;
        runtime.state.timerRemainingMs = currentLayerMeta(runtime.state.layerIndex).timerSeconds * 1000;
    }

    function applyMetricDelta(metrics, delta) {
        return {
            flow: clamp(metrics.flow + (delta.flow || 0)),
            agency: clamp(metrics.agency + (delta.agency || 0)),
            shame: clamp(metrics.shame + (delta.shame || 0)),
            reactivity: clamp(metrics.reactivity + (delta.reactivity || 0))
        };
    }

    function consequenceForChoice(choice) {
        return compact(choice?.result?.consequence || choice?.summary || '');
    }

    function showFloatingMessage(runtime, message) {
        runtime.state.floatingMessage = compact(message);
        if (runtime.els.floatingNote) {
            runtime.els.floatingNote.textContent = runtime.state.floatingMessage;
            runtime.els.floatingNote.classList.toggle('hidden', !runtime.state.floatingMessage);
        }
    }

    function clearFloatingMessage(runtime) {
        runtime.state.floatingMessage = '';
        if (runtime.els.floatingNote) {
            runtime.els.floatingNote.textContent = '';
            runtime.els.floatingNote.classList.add('hidden');
        }
    }

    function renderShotClock(runtime) {
        const { els, state } = runtime;
        if (!els.shotClock || !els.shotClockSeconds || !els.shotClockLabel) return;
        const seconds = Math.max(0, Math.ceil((state.timerRemainingMs || 0) / 1000));
        els.shotClockSeconds.textContent = String(seconds);
        const urgent = state.phase === PHASES.DECISION && seconds <= 3 && seconds > 0;
        const warning = state.phase === PHASES.DECISION && seconds <= 6 && seconds > 3;
        els.shotClock.classList.toggle('is-closing', urgent);
        els.shotClock.classList.toggle('is-warning', warning);
        els.shotClock.classList.toggle('is-locked', state.phase !== PHASES.DECISION);
        els.shotClockLabel.textContent = state.phase === PHASES.DECISION ? 'זמן לבחירה' : 'הבחירה נעולה';
    }

    function renderProgress(runtime) {
        const { els, state } = runtime;
        const meta = currentLayerMeta(state.layerIndex);
        const layerData = getBranchLayerData(runtime.scenario, state.layerIndex, state.branchKey);
        if (els.progress) els.progress.textContent = `${state.layerIndex + 1} / 3`;
        if (els.level) els.level.textContent = `${meta.label} · ${meta.title}`;
        if (els.title) els.title.textContent = runtime.scenario.title;
        if (els.sceneSubtitle) {
            els.sceneSubtitle.textContent = compact(layerData?.prompt || runtime.scenario.contextIntro);
        }
        if (els.choiceTitle) {
            els.choiceTitle.textContent = state.phase === PHASES.ANALYSIS
                ? 'מסלול ההסלמה הושלם'
                : `בחר/י תגובה לשלב ${meta.label}`;
        }
        if (els.choiceCopy) {
            els.choiceCopy.textContent = state.phase === PHASES.ANALYSIS
                ? 'הקשת נסגרה ועכשיו אפשר לראות איך השפה בנתה את התוצאה.'
                : compact(layerData?.prompt || runtime.scenario.supportPrompt);
        }
        if (els.progressDots) {
            els.progressDots.innerHTML = LAYER_META.map((layer, index) => `
                <span class="ceflow-progress-dot${index === state.layerIndex ? ' is-current' : ''}${index < state.layerIndex ? ' is-past' : ''}" data-color="${escapeHtml(layer.color)}" aria-hidden="true"></span>
            `).join('');
        }
        runtime.els.root.dataset.ceflowLayerColor = meta.color;
    }

    function renderBanner(runtime) {
        const { els, state } = runtime;
        const derived = deriveMetrics(state.metrics, state.layerIndex, state.outcome);
        if (els.bannerTitle) {
            els.bannerTitle.textContent = state.outcome === 'repair'
                ? 'הצלחת לעצור את ההסלמה בזמן'
                : state.outcome === 'explosion' || state.outcome === 'late_repair'
                    ? 'הקשר כבר עבר את סף השבר'
                    : `חום ${derived.heat} · חלון התיקון עדיין פתוח`;
        }
        if (els.bannerHeat) els.bannerHeat.textContent = `חום ${derived.heat}`;
        if (els.bannerFriction) els.bannerFriction.textContent = `חיכוך ${derived.friction}`;
        if (els.bannerState) els.bannerState.textContent = derived.stateLabel;
        if (els.banner) els.banner.setAttribute('aria-expanded', state.metricsOpen ? 'true' : 'false');
    }

    function renderMetricsPanel(runtime) {
        const { els, state } = runtime;
        if (!els.metricsPanel) return;
        els.metricsPanel.classList.toggle('hidden', !state.metricsOpen);
        if (!state.metricsOpen) return;
        const derived = deriveMetrics(state.metrics, state.layerIndex, state.outcome);
        const cards = METRIC_META.map((metric) => `
            <article class="ceflow-metric-card">
                <div class="ceflow-metric-card-head">
                    <strong>${escapeHtml(metric.label)}</strong>
                    <span>${escapeHtml(String(state.metrics[metric.key]))}</span>
                </div>
                <p>${escapeHtml(metric.description)}</p>
            </article>
        `).join('');
        els.metricsPanel.innerHTML = `
            <div class="ceflow-metrics-panel-head">
                <div>
                    <strong>מה זז מתחת לפני השטח</strong>
                    <p>חום = כמה הלחץ מורגש בגוף השיחה. חיכוך = כמה קשה כבר להזיז מידע וקשר.</p>
                </div>
                <div class="ceflow-metrics-chips">
                    <span class="ceflow-chip">חום ${derived.heat}</span>
                    <span class="ceflow-chip">חיכוך ${derived.friction}</span>
                    <span class="ceflow-chip">${escapeHtml(derived.stateLabel)}</span>
                </div>
            </div>
            <div class="ceflow-metrics-grid">${cards}</div>
        `;
    }

    function renderConsequence(runtime) {
        if (!runtime.els.consequence) return;
        runtime.els.consequence.innerHTML = `
            <p class="ceflow-consequence-kicker">תוצאה נראית לעין</p>
            <strong>${escapeHtml(runtime.state.consequenceCopy || 'הבחירה הקרובה תקבע את הטון.')}</strong>
        `;
    }

    function renderStageStatus(runtime) {
        if (!runtime.els.stageStatus) return;
        const layerMeta = currentLayerMeta(runtime.state.layerIndex);
        const childState = getBranchLayerData(runtime.scenario, runtime.state.layerIndex, runtime.state.branchKey)?.childState || 'open';
        runtime.els.stageStatus.innerHTML = `
            <div class="ceflow-stage-status-copy">
                <strong>${escapeHtml(layerMeta.title)}</strong>
                <p>מצב הילד כרגע: ${escapeHtml(childState === 'open' ? 'עדיין זמין לשיחה' : childState === 'defensive' ? 'הגנתי' : childState === 'withdrawn' ? 'קפוא' : childState === 'angry' ? 'כועס' : 'סגור')}</p>
            </div>
        `;
    }

    function renderTurnLayer(runtime) {
        if (!runtime.els.turnLayer) return;
        const choice = runtime.state.path[runtime.state.path.length - 1];
        runtime.els.turnLayer.innerHTML = choice
            ? `<span class="ceflow-turn-pill">${escapeHtml(choice.summary || choice.choiceLabel || '')}</span>`
            : '';
    }

    function renderDialog(runtime) {
        if (!runtime.els.dialog) return;
        runtime.els.dialog.innerHTML = runtime.state.transcript.map((line) => `
            <article class="ceflow-bubble is-${escapeHtml(line.side)} ${line.role === 'narrator' ? 'is-counter' : line.side === 'right' ? 'is-reply' : ''} is-tone-${escapeHtml(bubbleTone(line))}">
                <p class="ceflow-bubble-speaker">${escapeHtml(line.speaker)}</p>
                <p class="ceflow-bubble-text">${escapeHtml(line.text)}</p>
            </article>
        `).join('');
    }

    function renderChoiceAffordance(runtime) {
        if (!runtime.els.choiceAffordance) return;
        let text = 'בחר/י אחת מארבע התגובות בקשת כדי לכוון את הרגע הבא.';
        let stateKey = 'ready';
        if (runtime.state.phase === PHASES.PREVIEW) {
            text = 'התגובה נבחרה. בדוק/י איך היא נשמעת ולחץ/י "שלח".';
            stateKey = 'locked';
        } else if (runtime.state.phase === PHASES.SENDING) {
            text = 'השיחה מתגלגלת. רגע אחד.';
            stateKey = 'locked';
        } else if (runtime.state.phase === PHASES.ANALYSIS) {
            text = 'הסימולציה הסתיימה. אפשר לנתח את מסלול ההסלמה ולנסות שוב.';
            stateKey = 'locked';
        }
        runtime.els.choiceAffordance.dataset.state = stateKey;
        runtime.els.choiceAffordance.textContent = text;
    }

    function renderSceneRail(runtime) {
        if (!runtime.els.sceneRail) return;
        if (runtime.state.phase === PHASES.ANALYSIS) {
            runtime.els.sceneRail.classList.add('hidden');
            runtime.els.sceneRail.innerHTML = '';
            return;
        }
        const layerData = getBranchLayerData(runtime.scenario, runtime.state.layerIndex, runtime.state.branchKey);
        const prompt = compact(layerData?.prompt || runtime.scenario.contextIntro || runtime.scenario.supportPrompt);
        const latestChild = [...runtime.state.transcript].reverse().find((line) => line.role === 'child') || runtime.state.transcript[0];
        runtime.els.sceneRail.classList.remove('hidden');
        runtime.els.sceneRail.innerHTML = `
            ${prompt ? `
                <article class="ceflow-bubble is-left is-counter ceflow-scene-rail-bubble">
                    <p class="ceflow-bubble-speaker">המערכת</p>
                    <p class="ceflow-bubble-text">${escapeHtml(prompt)}</p>
                </article>
            ` : ''}
            ${latestChild ? `
                <article class="ceflow-bubble is-left is-tone-${escapeHtml(bubbleTone(latestChild))} ceflow-scene-rail-bubble is-scene-line">
                    <p class="ceflow-bubble-speaker">${escapeHtml(latestChild.speaker)}</p>
                    <p class="ceflow-bubble-text">${escapeHtml(latestChild.text)}</p>
                </article>
            ` : ''}
        `;
    }

    function renderChoiceDeck(runtime) {
        if (!runtime.els.deck) return;
        if (runtime.state.phase === PHASES.ANALYSIS) {
            runtime.els.deck.innerHTML = '';
            return;
        }
        const disabled = runtime.state.phase !== PHASES.DECISION;
        const choices = visibleChoiceSet(runtime);
        runtime.els.deck.innerHTML = `
            <div class="ceflow-choice-target" aria-hidden="true">
                <span class="ceflow-choice-target-icon">💬</span>
                <small>מכוונים את התגובה</small>
            </div>
        ` + choices.map((choice, index) => `
            <button
                type="button"
                class="ceflow-choice ceflow-choice--arc ${toneClass(choice)}${runtime.state.selectedChoiceId === choice.id ? ' is-selected' : ''}${choice.rhetorical ? ' is-rhetorical' : ''}"
                data-choice-id="${escapeHtml(choice.id)}"
                data-choice-slot="${index + 1}"
                ${disabled && runtime.state.selectedChoiceId !== choice.id ? 'disabled' : ''}
                aria-pressed="${runtime.state.selectedChoiceId === choice.id ? 'true' : 'false'}"
            >
                <span class="ceflow-choice-top">
                    <strong>${escapeHtml(choice.emoji)} ${escapeHtml(choice.label)}</strong>
                    ${choice.rhetorical ? '<span class="ceflow-choice-flag">לא באמת שאלה</span>' : ''}
                </span>
                <span class="ceflow-choice-line">${escapeHtml(choice.sentence)}</span>
            </button>
        `).join('');
    }

    function renderReply(runtime) {
        const { els, state } = runtime;
        const open = state.phase === PHASES.PREVIEW && !!state.selectedChoice;
        els.replyBox?.classList.toggle('hidden', !open);
        if (!open) return;
        if (els.replyQuick) {
            els.replyQuick.innerHTML = `
                <article class="ceflow-bubble is-right is-reply is-selected">
                    <p class="ceflow-bubble-speaker">${escapeHtml(runtime.scenario.parentName)}</p>
                    <p class="ceflow-bubble-text">${escapeHtml(state.selectedChoice.sentence)}</p>
                </article>
                ${state.selectedChoice.rhetorical ? `<p class="ceflow-rhetorical-note">שאלה רטורית — לא מחפשת מידע, מייצרת חיכוך.</p>` : ''}
            `;
        }
        if (els.replyInput) els.replyInput.value = state.selectedChoice.sentence;
        if (els.replyStatus) els.replyStatus.textContent = state.selectedChoice.explanation || '';
        if (els.replyStepBack) els.replyStepBack.disabled = state.history.length === 0;
    }

    function renderFeedback(runtime) {
        const item = runtime.state.path[runtime.state.path.length - 1];
        runtime.els.feedback?.classList.toggle('hidden', !item);
        if (!item || !runtime.els.feedback) return;
        runtime.els.feedback.innerHTML = `
            <div class="ceflow-feedback-left">
                <div class="ceflow-feedback-quote">
                    <strong>מה עבד כאן בפועל</strong>
                    <p>${escapeHtml(item.summary)}</p>
                </div>
            </div>
            <div class="ceflow-feedback-right">
                <p class="ceflow-language-effect-line">${escapeHtml(item.whyItMatters)}</p>
                <p class="ceflow-language-effect-takeaway">${escapeHtml(item.metaModelExplanation)}</p>
                ${item.repairMove ? `<p class="ceflow-feedback-note">${escapeHtml(`מה היה יכול לפתוח יותר: ${item.repairMove}`)}</p>` : ''}
            </div>
        `;
    }

    function renderSnapshot(runtime) {
        const item = runtime.state.path[runtime.state.path.length - 1];
        runtime.els.turnSnapshot?.classList.toggle('hidden', !item);
        if (!item || !runtime.els.turnSnapshot) return;
        const derived = deriveMetrics(runtime.state.metrics, runtime.state.layerIndex, runtime.state.outcome);
        runtime.els.turnSnapshot.innerHTML = `
            <div class="ceflow-section-head">
                <p class="ceflow-section-kicker">צילום מצב</p>
                <h4 class="ceflow-block-title">מה השתנה בעקבות הבחירה</h4>
            </div>
            <div class="ceflow-turn-snapshot-grid">
                <article class="ceflow-turn-snapshot-card"><strong>חום</strong><p>${derived.heat}</p></article>
                <article class="ceflow-turn-snapshot-card"><strong>חיכוך</strong><p>${derived.friction}</p></article>
                <article class="ceflow-turn-snapshot-card"><strong>מצב</strong><p>${escapeHtml(derived.stateLabel)}</p></article>
            </div>
            <p class="ceflow-turn-snapshot-note">${escapeHtml(item.result?.consequence || item.summary)}</p>
        `;
    }

    function renderTimeout(runtime) {
        if (!runtime.els.timeout) return;
        const item = runtime.state.path[runtime.state.path.length - 1];
        const open = !!item && String(item.choiceId || '').indexOf('timeout_') === 0;
        runtime.els.timeout.classList.toggle('hidden', !open);
        if (!open) {
            runtime.els.timeout.innerHTML = '';
            return;
        }
        runtime.els.timeout.innerHTML = `
            <p class="ceflow-section-kicker">קפאת בזמן אמת</p>
            <strong>גם לא להגיב זה להגיב.</strong>
            <p>${escapeHtml(item.childLine)}</p>
        `;
    }

    function renderAnalysis(runtime) {
        const { els, state } = runtime;
        const open = state.phase === PHASES.ANALYSIS;
        els.analysis?.classList.toggle('hidden', !open);
        if (!open || !els.analysis) return;
        const lastTurn = state.path[state.path.length - 1] || {};
        const finalSentence = compact(lastTurn.childLine || runtime.scenario.openingLine);
        const issues = detectIssues(finalSentence);
        const treeMarkup = state.path.map((turn, index) => `
            <article class="ceflow-analysis-step">
                <div class="ceflow-analysis-step-head">
                    <span class="ceflow-chip">שכבה ${index + 1}</span>
                    <strong>${escapeHtml(turn.choiceLabel)}</strong>
                </div>
                <p><strong>${escapeHtml(runtime.scenario.parentName)}:</strong> ${escapeHtml(turn.parentLine)}</p>
                <p><strong>${escapeHtml(runtime.scenario.childName)}:</strong> ${escapeHtml(turn.childLine)}</p>
                ${turn.narratorLine ? `<p class="ceflow-analysis-narrator">${escapeHtml(turn.narratorLine)}</p>` : ''}
            </article>
        `).join('');
        const issuesMarkup = issues.length
            ? issues.map((issue, index) => `<span class="ceflow-analysis-issue" style="--issue-index:${index};">${escapeHtml(issue.key)}</span>`).join('')
            : '<span class="ceflow-analysis-issue is-empty">בלי זיהוי בולט</span>';
        const summaryClass = state.outcome === 'repair' ? 'is-good' : 'is-bad';
        const summaryText = state.outcome === 'repair'
            ? 'יצאת מההסלמה לפני הפיצוץ. ההורה החזיק גם קשר וגם פירוק של המשימה.'
            : 'השיחה הגיעה לנקודת שבר. גם אם היה ניסיון תיקון מאוחר, הילד כבר נשאר עם מסר של סגירה או בושה.';
        els.analysis.innerHTML = `
            <div class="ceflow-section-head">
                <p class="ceflow-section-kicker">ניתוח סופי</p>
                <h4 class="ceflow-block-title">איך המסלול נבנה שכבה אחר שכבה</h4>
            </div>
            <div class="ceflow-analysis-tree">${treeMarkup}</div>
            <section class="ceflow-analysis-focus ${summaryClass}">
                <div class="ceflow-analysis-center">
                    <p class="ceflow-analysis-center-kicker">משפט הילד שנשאר במרכז</p>
                    <div class="ceflow-analysis-sentence">${escapeHtml(finalSentence)}</div>
                    <div class="ceflow-analysis-issues">${issuesMarkup}</div>
                </div>
                <div class="ceflow-analysis-summary ${summaryClass}">
                    <strong>${state.outcome === 'repair' ? 'סיום ירוק' : 'סיום אדום'}</strong>
                    <p>${escapeHtml(summaryText)}</p>
                    <p>${escapeHtml(runtime.scenario.metaModelCore.hiddenGap)}</p>
                </div>
            </section>
        `;
    }

    function renderControls(runtime) {
        if (runtime.els.stepBack) runtime.els.stepBack.disabled = runtime.state.history.length === 0;
        if (runtime.els.replyStepBack) runtime.els.replyStepBack.disabled = runtime.state.history.length === 0;
        if (runtime.els.next) runtime.els.next.classList.toggle('hidden', true);
    }

    function render(runtime) {
        renderProgress(runtime);
        renderShotClock(runtime);
        renderBanner(runtime);
        renderMetricsPanel(runtime);
        renderConsequence(runtime);
        renderStageStatus(runtime);
        renderTurnLayer(runtime);
        renderDialog(runtime);
        renderChoiceAffordance(runtime);
        renderSceneRail(runtime);
        renderChoiceDeck(runtime);
        renderReply(runtime);
        renderTimeout(runtime);
        renderFeedback(runtime);
        renderSnapshot(runtime);
        renderAnalysis(runtime);
        renderControls(runtime);
        writeProgress(runtime.state);
    }

    function choose(runtime, choiceId) {
        if (runtime.state.phase !== PHASES.DECISION && runtime.state.phase !== PHASES.PREVIEW) return;
        const choice = visibleChoiceSet(runtime).find((item) => item.id === choiceId);
        if (!choice) return;
        pushHistory(runtime);
        stopTimer(runtime);
        runtime.state.selectedChoiceId = choice.id;
        runtime.state.selectedChoice = choice;
        runtime.state.phase = PHASES.PREVIEW;
        runtime.state.timerRemainingMs = Math.max(0, runtime.state.timerRemainingMs);
        render(runtime);
        runtime.els.replyConfirm?.focus();
    }

    function stepBack(runtime) {
        const snapshot = runtime.state.history.pop();
        if (!snapshot) return;
        restoreSnapshot(runtime, snapshot);
        if (runtime.state.phase === PHASES.DECISION) startTimer(runtime, false);
    }

    function finalizeAnalysis(runtime) {
        runtime.state.phase = PHASES.ANALYSIS;
        runtime.state.selectedChoice = null;
        runtime.state.selectedChoiceId = '';
        stopTimer(runtime);
        render(runtime);
        runtime.els.analysis?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
    }

    function makePathEntry(choice) {
        return {
            choiceId: choice.id,
            choiceLabel: choice.label,
            parentLine: choice.sentence,
            childLine: choice.childLine,
            narratorLine: choice.narratorLine,
            summary: choice.summary,
            whyItMatters: choice.whyItMatters,
            repairMove: choice.repairMove,
            metaModelExplanation: choice.metaModelExplanation,
            metrics: choice.metrics,
            result: choice.result
        };
    }

    async function playChoice(runtime, choice) {
        clearPendingTimers(runtime);
        runtime.state.phase = PHASES.SENDING;
        runtime.state.selectedChoice = choice;
        runtime.state.selectedChoiceId = choice.id;
        runtime.state.metrics = applyMetricDelta(runtime.state.metrics, choice.metrics);
        runtime.state.consequenceCopy = consequenceForChoice(choice);
        runtime.state.path.push(makePathEntry(choice));

        runtime.state.transcript.push({
            id: `parent-${runtime.state.path.length}`,
            side: 'right',
            role: 'parent',
            speaker: runtime.scenario.parentName,
            text: choice.sentence,
            tone: choice.tone
        });
        render(runtime);
        await wait(240);

        runtime.state.transcript.push({
            id: `child-${runtime.state.path.length}`,
            side: 'left',
            role: 'child',
            speaker: runtime.scenario.childName,
            text: choice.childLine,
            tone: choice.result?.childState || choice.tone
        });
        render(runtime);

        if (choice.narratorLine) {
            await wait(200);
            runtime.state.transcript.push({
                id: `narrator-${runtime.state.path.length}`,
                side: 'left',
                role: 'narrator',
                speaker: 'מערכת',
                text: choice.narratorLine,
                tone: 'narrator'
            });
            render(runtime);
        }

        runtime.state.branchKey = compact(choice.result?.nextBranch || runtime.state.branchKey);
        runtime.state.outcome = compact(choice.result?.outcome || 'ongoing');

        if (choice.result?.endEarly || runtime.state.layerIndex >= 2) {
            await wait(180);
            finalizeAnalysis(runtime);
            return;
        }

        await wait(180);
        runtime.state.layerIndex += 1;
        resetForNextLayer(runtime);
        render(runtime);
        startTimer(runtime, true);
    }

    function confirmSelection(runtime) {
        const choice = runtime.state.selectedChoice;
        if (!choice || runtime.state.phase !== PHASES.PREVIEW) return;
        pushHistory(runtime);
        playChoice(runtime, choice).catch((error) => {
            console.error('Comic escalation send failed:', error);
            runtime.state.phase = PHASES.PREVIEW;
            showFloatingMessage(runtime, 'הייתה תקלה בהצגת הסבב. אפשר לנסות שוב.');
            render(runtime);
        });
    }

    function handleTimeout(runtime) {
        const timeoutChoice = currentTimeoutChoice(runtime);
        if (!timeoutChoice) return;
        pushHistory(runtime);
        runtime.els.timeout?.classList.remove('hidden');
        if (runtime.els.timeout) {
            runtime.els.timeout.innerHTML = `<p>גם לא להגיב זה להגיב.</p>`;
        }
        playChoice(runtime, timeoutChoice).catch((error) => {
            console.error('Comic escalation timeout failed:', error);
        });
    }

    function retry(runtime) {
        clearPendingTimers(runtime);
        stopTimer(runtime);
        runtime.state = createState(runtime.scenario);
        clearFloatingMessage(runtime);
        runtime.els.timeout?.classList.add('hidden');
        render(runtime);
        startTimer(runtime, true);
    }

    function toggleMetrics(runtime) {
        runtime.state.metricsOpen = !runtime.state.metricsOpen;
        renderMetricsPanel(runtime);
        renderBanner(runtime);
    }

    function bindEvents(runtime) {
        runtime.els.deck?.addEventListener('click', (event) => {
            const button = event.target.closest('button[data-choice-id]');
            if (!button) return;
            choose(runtime, button.getAttribute('data-choice-id') || '');
        });
        runtime.els.stepBack?.addEventListener('click', () => stepBack(runtime));
        runtime.els.replyStepBack?.addEventListener('click', () => stepBack(runtime));
        runtime.els.replyConfirm?.addEventListener('click', () => confirmSelection(runtime));
        runtime.els.retry?.addEventListener('click', () => retry(runtime));
        runtime.els.banner?.addEventListener('click', () => toggleMetrics(runtime));
        runtime.els.infoBtn?.addEventListener('click', () => {
            if (runtime.state.floatingMessage) {
                clearFloatingMessage(runtime);
                return;
            }
            showFloatingMessage(runtime, runtime.scenario.learningFocus || runtime.scenario.supportPrompt || 'התרגול כאן הוא לזהות טון, לחץ ומבנה שפה לפני שמאוחר מדי.');
        });
        runtime.onVisibilityChange = () => {
            if (global.document.hidden || !isTabActive()) {
                pauseTimer(runtime);
                return;
            }
            if (runtime.state.phase === PHASES.DECISION && isTabActive()) {
                startTimer(runtime, false);
            }
        };
        global.document.addEventListener('visibilitychange', runtime.onVisibilityChange);
    }

    function buildRuntime(root, scenario) {
        root.innerHTML = buildShellMarkup(scenario);
        if (typeof global.repairMojibakeDomSubtree === 'function') {
            global.repairMojibakeDomSubtree(root);
        }
        const runtime = {
            root,
            scenario,
            state: createState(scenario),
            els: collectEls(root)
        };
        bindEvents(runtime);
        render(runtime);
        startTimer(runtime, true);
        return runtime;
    }

    function destroyRuntime(runtime) {
        if (!runtime) return;
        clearPendingTimers(runtime);
        stopTimer(runtime);
        if (runtime.onVisibilityChange) {
            global.document.removeEventListener('visibilitychange', runtime.onVisibilityChange);
        }
    }

    async function ensureReady({ force = false } = {}) {
        const root = global.document.getElementById(ROOT_ID);
        if (!root) return null;
        if (force && global.__comicEngineEscalationRuntime) {
            destroyRuntime(global.__comicEngineEscalationRuntime);
            global.__comicEngineEscalationRuntime = null;
        }
        if (global.__comicEngineEscalationRuntime) {
            if (isTabActive() && global.__comicEngineEscalationRuntime.state.phase === PHASES.DECISION) {
                startTimer(global.__comicEngineEscalationRuntime, false);
            }
            render(global.__comicEngineEscalationRuntime);
            return global.__comicEngineEscalationRuntime;
        }

        root.dataset.ceflowBootState = 'loading';
        try {
            const payloads = await loadPayloads();
            const scenario = buildScenario(findTrainerScenario(payloads.trainerPayload), findComicScenario(payloads.comicPayload));
            const runtime = buildRuntime(root, scenario);
            global.__comicEngineEscalationRuntime = runtime;
            root.dataset.ceflowBootState = 'ready';
            return runtime;
        } catch (error) {
            console.error('Comic escalation bootstrap failed:', error);
            root.dataset.ceflowBootState = 'error';
            root.innerHTML = `
                <div class="ceflow-v3">
                    <article class="ceflow-bubble is-left is-counter">
                        <p class="ceflow-bubble-speaker">מערכת</p>
                        <p class="ceflow-bubble-text">טעינת סימולטור ההסלמה נכשלה. נסה/י לרענן את העמוד.</p>
                    </article>
                </div>
            `;
            return null;
        }
    }

    global.ComicEngineEscalationV3 = Object.freeze({
        ensureReady
    });

    global.ensureComicEngineFlowReady = ensureReady;
    global.setupComicEngine2 = ensureReady;
    try {
        ensureComicEngineFlowReady = ensureReady;
        setupComicEngine2 = ensureReady;
    } catch (_error) {
        // fall back to window bindings when lexical bindings are unavailable
    }

    if (isTabActive()) {
        if (typeof global.queueMicrotask === 'function') {
            global.queueMicrotask(() => ensureReady({ force: true }));
        } else {
            global.setTimeout(() => ensureReady({ force: true }), 0);
        }
    }
})(typeof window !== 'undefined' ? window : globalThis);
