/**
 * Initial Image vs Deep Structure Engine
 * מתמונת שטח למבנה עומק
 *
 * Three-phase engine: guess → reveal → complete
 * Data-driven: exercises defined in EXERCISES array below.
 */
(function attachInitialImageEngine(window, document) {
    'use strict';
    if (!window || !document || window.__initialImageEngineAttached) return;
    window.__initialImageEngineAttached = true;

    var ROOT_ID = 'initial-image-engine-root';
    var STORAGE_KEY = 'initial_image_deep_state_v2';
    var CSS_PREFIX = 'iids';

    // ─── EXERCISE DATA ───────────────────────────────────────
    var EXERCISES = [
        {
            id: 'initial-image-vs-deep-structure-couple-01',
            feature: 'initial-image-vs-deep-structure',
            title: 'מתמונת שטח למבנה עומק',
            originalSentence: 'כשהיא אמרה את זה ככה, הרגשתי מושפל ופשוט נאטמתי.',
            subjectName: 'אורי',
            hypothesisImages: [
                {
                    id: 'h1',
                    label: 'היא תוקפת אותו',
                    subtitle: 'הוא חווה אותה כתוקפת ומאשימה',
                    image: 'assets/images/initial-image-vs-deep-structure/couples_scene/couple_guess_1.jpg'
                },
                {
                    id: 'h2',
                    label: 'היא משפילה אותו',
                    subtitle: 'ביקורת נחווית אצלו כהשפלה',
                    image: 'assets/images/initial-image-vs-deep-structure/couples_scene/couple_guess_2.jpg'
                },
                {
                    id: 'h3',
                    label: 'אין לו סיכוי מולה',
                    subtitle: 'מולה הוא מרגיש שאין תשובה נכונה',
                    image: 'assets/images/initial-image-vs-deep-structure/couples_scene/couple_guess_3.jpg'
                }
            ],
            truthImage: 'assets/images/initial-image-vs-deep-structure/couples_scene/couple_truth.jpg',
            imageGrid: { rows: 3, cols: 3 },
            textSlots: [
                { id: 'd1', category: 'deletion', order: 1, row: 0, col: 0 },
                { id: 'd2', category: 'deletion', order: 2, row: 0, col: 1 },
                { id: 'd3', category: 'deletion', order: 3, row: 0, col: 2 },
                { id: 'x1', category: 'distortion', order: 1, row: 1, col: 0 },
                { id: 'x2', category: 'distortion', order: 2, row: 1, col: 1 },
                { id: 'x3', category: 'distortion', order: 3, row: 1, col: 2 },
                { id: 'g1', category: 'generalization', order: 1, row: 2, col: 0 },
                { id: 'g2', category: 'generalization', order: 2, row: 2, col: 1 },
                { id: 'g3', category: 'generalization', order: 3, row: 2, col: 2 }
            ],
            reveals: {
                deletion: [
                    {
                        id: 'deletion-1',
                        text: 'היא אמרה: ״אי אפשר לדבר איתך על שום דבר רציני.״',
                        question: 'מה בדיוק היא אמרה שגרם לך להיסגר?',
                        rationale: 'השאלה מחזירה את המשפט המדויק במקום הכותרת הכללית ״היא השפילה אותי״.',
                        targetTextSlot: 'd1'
                    },
                    {
                        id: 'deletion-2',
                        text: 'זה היה בערב, אחרי כמה ימים של מתח בינינו.',
                        question: 'באיזה הקשר זה קרה?',
                        rationale: 'הקשר מחזיר רצף ונותן עומק למה שנשמע קודם כמו אירוע מבודד.',
                        targetTextSlot: 'd2'
                    },
                    {
                        id: 'deletion-3',
                        text: 'באותו רגע הגוף שלי נסגר והלב התחיל לדפוק.',
                        question: 'מה קרה לך בפנים באותו רגע?',
                        rationale: 'השאלה מחזירה את החוויה הפנימית שהושמטה מהמשפט.',
                        targetTextSlot: 'd3'
                    }
                ],
                distortion: [
                    {
                        id: 'distortion-1',
                        text: 'לא שמעתי בזה רק תסכול — שמעתי בזה שאני קטן ולא ראוי.',
                        question: 'איך זה נהיה אצלך השפלה ולא רק ביקורת?',
                        rationale: 'כאן נחשף הפירוש שנכנס בין מה שהיא אמרה לבין מה שהוא הרגיש.',
                        targetTextSlot: 'x1'
                    },
                    {
                        id: 'distortion-2',
                        text: 'אצלי ביקורת בלי ריכוך נחווית כמעט מיד כהשפלה.',
                        question: 'איזה כלל פנימי הופך ביקורת להשפלה?',
                        rationale: 'השאלה חושפת את העיוות: הביקורת נחווית כאמירה על הערך העצמי.',
                        targetTextSlot: 'x2'
                    },
                    {
                        id: 'distortion-3',
                        text: 'בתוכי זה נהיה כאילו היא לא מדברת איתי — אלא פוסקת על הערך שלי.',
                        question: 'מה המשמעות שנתת למילים שלה?',
                        rationale: 'השאלה מפרידה בין דבריה לבין המשמעות שהוא בנה סביבם.',
                        targetTextSlot: 'x3'
                    }
                ],
                generalization: [
                    {
                        id: 'generalization-1',
                        text: 'יש בי כלל ישן: כשאישה מאוכזבת ממני, עדיף להיסגר.',
                        question: 'איזה חוק פעל אצלך ברגע הזה?',
                        rationale: 'כאן מתגלה הכלל הרחב שמכוון את התגובה.',
                        targetTextSlot: 'g1'
                    },
                    {
                        id: 'generalization-2',
                        text: 'אני מכיר את התחושה הזו ממקומות מוקדמים שבהם לא היה לי איך לענות.',
                        question: 'מאיפה הדפוס הזה מוכר לך?',
                        rationale: 'השאלה מחברת את ההווה לדפוס ישן ולא משאירה הכול רק בזוגיות העכשווית.',
                        targetTextSlot: 'g2'
                    },
                    {
                        id: 'generalization-3',
                        text: 'לכן השתיקה הרגישה לא כמו בחירה, אלא כמו מנגנון ישן שקפץ לבד.',
                        question: 'איך זה נהיה כמעט בלתי נמנע?',
                        rationale: 'כאן רואים שה״אין ברירה״ הוא מבנה פנימי, לא חוק טבע.',
                        targetTextSlot: 'g3'
                    }
                ]
            },
            completionPrompt: {
                title: 'עכשיו רואים את המעבר מן החוץ אל הפנים',
                text: 'עכשיו כבר לא רואים רק את הסיפור החיצוני. רואים גם את הפירוש, את החוק, ואת החלק הפנימי שהופעל ברגע הזה.',
                closing: 'המטרה כאן איננה לבטל את החוויה החיצונית, אלא לראות איך היא נשענת על מבנה עומק שאפשר להבין, לשאול עליו, ולעבוד איתו טיפולית.'
            }
        },
        {
            id: 'initial-image-vs-deep-structure-obesity-01',
            feature: 'initial-image-vs-deep-structure',
            title: 'מתמונת שטח למבנה עומק',
            originalSentence: "כשהיא אמרה לי 'אתה שוב אוכל בלי שליטה', ישר רציתי לקחת משהו מתוק.",
            subjectName: 'רן',
            hypothesisImages: [
                {
                    id: 'h1',
                    label: 'הוא פשוט לא שולט',
                    subtitle: 'האוכל תופס אותו מיד',
                    image: 'assets/images/initial-image-vs-deep-structure/obesity_scene/obesity_guess_1.jpg'
                },
                {
                    id: 'h2',
                    label: 'הוא מורד בביקורת',
                    subtitle: 'ההערה מפעילה דווקא',
                    image: 'assets/images/initial-image-vs-deep-structure/obesity_scene/obesity_guess_2.jpg'
                },
                {
                    id: 'h3',
                    label: 'האוכל מנחם אותו',
                    subtitle: 'הוא מרכך בדידות וריקנות',
                    image: 'assets/images/initial-image-vs-deep-structure/obesity_scene/obesity_guess_3.jpg'
                }
            ],
            truthImage: 'assets/images/initial-image-vs-deep-structure/obesity_scene/obesity_truth.jpg',
            imageGrid: { rows: 3, cols: 3 },
            textSlots: [
                { id: 'd1', category: 'deletion', order: 1, row: 0, col: 0 },
                { id: 'd2', category: 'deletion', order: 2, row: 0, col: 1 },
                { id: 'd3', category: 'deletion', order: 3, row: 0, col: 2 },
                { id: 'x1', category: 'distortion', order: 1, row: 1, col: 0 },
                { id: 'x2', category: 'distortion', order: 2, row: 1, col: 1 },
                { id: 'x3', category: 'distortion', order: 3, row: 1, col: 2 },
                { id: 'g1', category: 'generalization', order: 1, row: 2, col: 0 },
                { id: 'g2', category: 'generalization', order: 2, row: 2, col: 1 },
                { id: 'g3', category: 'generalization', order: 3, row: 2, col: 2 }
            ],
            reveals: {
                deletion: [
                    {
                        id: 'obesity-deletion-1',
                        text: "היא אמרה: 'אתה שוב אוכל בלי שליטה.'",
                        question: 'מה בדיוק היא אמרה שגרם לך לרצות לקחת משהו מתוק?',
                        rationale: "השאלה מחזירה את המשפט המדויק, במקום להישאר רק עם הכותרת הכללית ש'היא הפעילה אותי'.",
                        targetTextSlot: 'd1'
                    },
                    {
                        id: 'obesity-deletion-2',
                        text: 'זה קרה מיד אחרי רגע של מתח וביקורת.',
                        question: 'מה היה ההקשר המדויק של הרגע הזה?',
                        rationale: 'ההקשר מחזיר רצף, ולא משאיר את האכילה כאירוע מבודד וחסר היסטוריה.',
                        targetTextSlot: 'd2'
                    },
                    {
                        id: 'obesity-deletion-3',
                        text: 'באותו רגע הגוף שלו התכווץ והופיע דחף מיידי למתוק.',
                        question: 'מה קרה לך בגוף באותו רגע?',
                        rationale: 'השאלה מחזירה את החוויה הפנימית והגופנית שנמחקה מן הסיפור.',
                        targetTextSlot: 'd3'
                    }
                ],
                distortion: [
                    {
                        id: 'obesity-distortion-1',
                        text: 'הוא לא שמע בזה רק הערה על אוכל — אלא כאילו אומרים עליו שהוא חלש ועלוב.',
                        question: 'איך זה נהיה אצלך הערה על הערך שלך — ולא רק על האוכל?',
                        rationale: 'כאן נחשף הפירוש שנכנס בין דבריה לבין החוויה שלו.',
                        targetTextSlot: 'x1'
                    },
                    {
                        id: 'obesity-distortion-2',
                        text: 'אצלו ביקורת על אכילה נהיית מהר מאוד בושה.',
                        question: 'איזה פירוש הופך ביקורת על אוכל לבושה?',
                        rationale: 'השאלה חושפת את העיוות: הביקורת נחווית כאמירה על הערך העצמי.',
                        targetTextSlot: 'x2'
                    },
                    {
                        id: 'obesity-distortion-3',
                        text: 'האוכל נהיה לא רק פיתוי — אלא דרך לא להרגיש מושפל.',
                        question: 'מה האוכל עושה בשבילך ברגע הזה?',
                        rationale: 'כאן מתגלה שתפקיד האוכל איננו רק סיפוק, אלא הגנה מפני פגיעה פנימית.',
                        targetTextSlot: 'x3'
                    }
                ],
                generalization: [
                    {
                        id: 'obesity-generalization-1',
                        text: 'יש בו כלל ישן: כששופטים אותי, אוכל מגן עליי.',
                        question: 'איזה חוק פעל אצלך ברגע הזה?',
                        rationale: 'כאן מתגלה הכלל הרחב שמארגן את התגובה.',
                        targetTextSlot: 'g1'
                    },
                    {
                        id: 'obesity-generalization-2',
                        text: 'הוא מכיר את התחושה ממקומות מוקדמים שבהם הרגיש שמבקרים את הגוף שלו.',
                        question: 'מאיפה הדפוס הזה מוכר לך?',
                        rationale: 'השאלה מחברת את ההווה לניסיון קודם ולא משאירה הכול רק סביב האוכל הנוכחי.',
                        targetTextSlot: 'g2'
                    },
                    {
                        id: 'obesity-generalization-3',
                        text: 'לכן האכילה הרגישה כמעט אוטומטית — כמו הגנה, לא כמו בחירה.',
                        question: 'איך זה נהיה כמעט בלתי נמנע?',
                        rationale: "כאן רואים שה'אין ברירה' הוא מנגנון פנימי שנבנה לאורך זמן, ולא חוק טבע.",
                        targetTextSlot: 'g3'
                    }
                ]
            },
            completionPrompt: {
                title: 'עכשיו רואים את האוכל אחרת',
                text: 'מה התברר עכשיו על הבושה, על ההגנה, ועל התפקיד שהאוכל ממלא ברגע הזה?',
                closing: 'כאן כבר לא רואים רק אכילה — רואים מנגנון פנימי שמנסה להגן מפני פגיעה בערך העצמי.'
            }
        },
        {
            id: 'initial-image-vs-deep-structure-social-anxiety-01',
            feature: 'initial-image-vs-deep-structure',
            title: 'מתמונת שטח למבנה עומק',
            originalSentence: 'כשביקשו ממני להגיד כמה מילים על עצמי, פשוט נמחקתי.',
            subjectName: 'תמר',
            hypothesisImages: [
                {
                    id: 'h1',
                    label: 'כולן שופטות אותי',
                    subtitle: 'כל המבטים מרגישים עליה',
                    image: 'assets/images/initial-image-vs-deep-structure/social_anxiety_scene/social_guess_1.jpg'
                },
                {
                    id: 'h2',
                    label: 'אסור לי לטעות',
                    subtitle: 'הבקשה נחווית כמבחן',
                    image: 'assets/images/initial-image-vs-deep-structure/social_anxiety_scene/social_guess_2.jpg'
                },
                {
                    id: 'h3',
                    label: 'היא רק צריכה עידוד קטן',
                    subtitle: 'מבחוץ זה נראה כמו קושי קל וביישני',
                    image: 'assets/images/initial-image-vs-deep-structure/social_anxiety_scene/social_guess_3.jpg'
                }
            ],
            truthImage: 'assets/images/initial-image-vs-deep-structure/social_anxiety_scene/social_truth.jpg',
            imageGrid: { rows: 3, cols: 3 },
            textSlots: [
                { id: 'd1', category: 'deletion', order: 1, row: 0, col: 0 },
                { id: 'd2', category: 'deletion', order: 2, row: 0, col: 1 },
                { id: 'd3', category: 'deletion', order: 3, row: 0, col: 2 },
                { id: 'x1', category: 'distortion', order: 1, row: 1, col: 0 },
                { id: 'x2', category: 'distortion', order: 2, row: 1, col: 1 },
                { id: 'x3', category: 'distortion', order: 3, row: 1, col: 2 },
                { id: 'g1', category: 'generalization', order: 1, row: 2, col: 0 },
                { id: 'g2', category: 'generalization', order: 2, row: 2, col: 1 },
                { id: 'g3', category: 'generalization', order: 3, row: 2, col: 2 }
            ],
            reveals: {
                deletion: [
                    {
                        id: 'social-deletion-1',
                        text: "ביקשו ממנה בעדינות: 'אולי תגידי כמה מילים על עצמך?'",
                        question: 'מה בדיוק ביקשו ממך באותו רגע?',
                        rationale: "השאלה מחזירה את הניסוח המדויק במקום ההרגשה הכללית ש'זה היה גדול עליי'.",
                        targetTextSlot: 'd1'
                    },
                    {
                        id: 'social-deletion-2',
                        text: 'כל המעגל עבר להביט בה באותו רגע.',
                        question: 'מה קרה סביבך בדיוק כשהפנו אלייך את תשומת הלב?',
                        rationale: 'ההקשר החברתי מחזיר את תנאי הרגע ולא משאיר רק כותרת רגשית מופשטת.',
                        targetTextSlot: 'd2'
                    },
                    {
                        id: 'social-deletion-3',
                        text: 'הגרון נסגר, המחשבות נעלמו, והגוף קפא.',
                        question: 'מה קרה לך בפנים באותו רגע?',
                        rationale: 'השאלה מחזירה את החוויה הגופנית והמיידית שנמחקה מן המשפט.',
                        targetTextSlot: 'd3'
                    }
                ],
                distortion: [
                    {
                        id: 'social-distortion-1',
                        text: 'היא לא שמעה בזה רק הזמנה — אלא מבחן.',
                        question: 'איך ההזמנה נהייתה אצלך מבחן?',
                        rationale: 'כאן נחשף הפירוש שנכנס בין מה שנאמר לבין מה שנחווה.',
                        targetTextSlot: 'x1'
                    },
                    {
                        id: 'social-distortion-2',
                        text: 'המבט של הקבוצה נהיה אצלה סימן לסכנה.',
                        question: 'מה המשמעות שמבט של הקבוצה מקבל אצלך?',
                        rationale: 'השאלה מפרידה בין המבט עצמו לבין המשמעות שנכנסה אליו.',
                        targetTextSlot: 'x2'
                    },
                    {
                        id: 'social-distortion-3',
                        text: 'בתוכה זה נהיה כאילו אם יראו אותה באמת — משהו בה יקרוס.',
                        question: 'מה היה קורה, מבחינתך, אם באמת היו רואים אותך?',
                        rationale: 'כאן נחשפת המשמעות העמוקה שנכנסת לעצם החשיפה.',
                        targetTextSlot: 'x3'
                    }
                ],
                generalization: [
                    {
                        id: 'social-generalization-1',
                        text: 'יש בה כלל ישן: עדיף להיעלם מאשר להיחשף.',
                        question: 'איזה חוק פעל אצלך ברגע הזה?',
                        rationale: 'כאן מתגלה הכלל הרחב שמכוון את המחיקה.',
                        targetTextSlot: 'g1'
                    },
                    {
                        id: 'social-generalization-2',
                        text: 'התחושה מוכרת לה ממקומות מוקדמים של מבוכה וחשיפה.',
                        question: 'מאיפה הדפוס הזה מוכר לך?',
                        rationale: 'השאלה מחברת את ההווה לניסיון קודם ולא משאירה הכול רק סביב הסיטואציה הנוכחית.',
                        targetTextSlot: 'g2'
                    },
                    {
                        id: 'social-generalization-3',
                        text: 'לכן המחיקה הרגישה לא כמו בחירה — אלא כמו מנגנון הצלה.',
                        question: 'איך זה נהיה כמעט בלתי נמנע?',
                        rationale: "כאן רואים שה'אין ברירה' הוא מנגנון פנימי שנבנה לאורך זמן.",
                        targetTextSlot: 'g3'
                    }
                ]
            },
            completionPrompt: {
                title: 'עכשיו רואים שהקושי איננו רק חברתי',
                text: 'מה התברר עכשיו על החשיפה, על המבט, ועל החוק הפנימי שפועל כשמבקשים ממנה להיראות?',
                closing: 'כאן כבר לא רואים רק ביישנות או צורך בעידוד — רואים מבנה פנימי שבו עצם החשיפה נחווית כסכנה.'
            }
        }
    ];

    // ─── STATE ────────────────────────────────────────────────
    var currentExercise = null;
    var phase = 'pick';                    // 'pick' | 'guess' | 'reveal' | 'complete'
    var pickerIndex = 0;                   // which exercise is shown in topic picker
    var selectedHypothesisIndex = -1;      // confirmed choice
    var viewingHypothesisIndex = 0;        // currently browsed
    var revealedIds = [];
    var currentReveal = null;              // last committed reveal (for display)
    var pendingAskReveal = null;           // reveal staged but not yet confirmed with ASK
    var revealedTileIndexes = [];
    var tileRevealOrder = [];
    var pendingTileReveal = -1;
    var rootEl = null;
    var mounted = false;

    // ─── HELPERS ──────────────────────────────────────────────
    function resolveAssetPath(path) {
        if (typeof window.__withAssetVersion === 'function') {
            try { return window.__withAssetVersion(path); } catch (e) { /* fall through */ }
        }
        return path;
    }

    function shuffleArray(arr) {
        var a = arr.slice();
        for (var i = a.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
        }
        return a;
    }

    function initTileRevealOrder() {
        if (!currentExercise) return;
        var total = currentExercise.imageGrid.rows * currentExercise.imageGrid.cols;
        var indices = [];
        for (var i = 0; i < total; i++) indices.push(i);
        tileRevealOrder = shuffleArray(indices);
    }

    function esc(value) {
        return String(value == null ? '' : value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function getRevealedCount(category) {
        if (!currentExercise) return 0;
        var reveals = currentExercise.reveals[category] || [];
        var count = 0;
        for (var i = 0; i < reveals.length; i++) {
            if (revealedIds.indexOf(reveals[i].id) !== -1) count++;
        }
        return count;
    }

    function getNextReveal(category) {
        if (!currentExercise) return null;
        var reveals = currentExercise.reveals[category] || [];
        for (var i = 0; i < reveals.length; i++) {
            if (revealedIds.indexOf(reveals[i].id) === -1) return reveals[i];
        }
        return null;
    }

    function getTotalReveals() {
        if (!currentExercise) return 0;
        return (currentExercise.reveals.deletion || []).length +
               (currentExercise.reveals.distortion || []).length +
               (currentExercise.reveals.generalization || []).length;
    }

    function isComplete() {
        return revealedIds.length >= getTotalReveals();
    }

    function isSlotRevealed(slotId) {
        if (!currentExercise) return false;
        var categories = ['deletion', 'distortion', 'generalization'];
        for (var c = 0; c < categories.length; c++) {
            var reveals = currentExercise.reveals[categories[c]] || [];
            for (var r = 0; r < reveals.length; r++) {
                if (reveals[r].targetTextSlot === slotId && revealedIds.indexOf(reveals[r].id) !== -1) {
                    return reveals[r];
                }
            }
        }
        return false;
    }

    function isTileRevealed(tileIndex) {
        return revealedTileIndexes.indexOf(tileIndex) !== -1;
    }

    function getActiveImage() {
        if (!currentExercise) return '';
        if (phase === 'guess') {
            var hyps = currentExercise.hypothesisImages;
            var idx = viewingHypothesisIndex >= 0 && viewingHypothesisIndex < hyps.length ? viewingHypothesisIndex : 0;
            return hyps[idx].image;
        }
        // reveal / complete: use selected hypothesis
        var hyps2 = currentExercise.hypothesisImages;
        var si = selectedHypothesisIndex >= 0 && selectedHypothesisIndex < hyps2.length ? selectedHypothesisIndex : 0;
        return hyps2[si].image;
    }

    function saveState() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                exerciseId: currentExercise ? currentExercise.id : null,
                phase: phase,
                selectedHypothesisIndex: selectedHypothesisIndex,
                viewingHypothesisIndex: viewingHypothesisIndex,
                revealedIds: revealedIds,
                currentRevealId: currentReveal ? currentReveal.id : null,
                revealedTileIndexes: revealedTileIndexes,
                tileRevealOrder: tileRevealOrder
            }));
        } catch (e) { /* ignore */ }
    }

    function loadState() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch (e) { return null; }
    }

    // ─── TILE POSITION MATH ──────────────────────────────────
    // For a 3x3 grid with background-size: 300% 300%
    // each tile shows exactly 1/9 of the image.
    // RTL fix: CSS grid lays columns right-to-left in RTL,
    // so col 0 is visually on the RIGHT. We flip the X axis
    // so the rightmost tile shows the rightmost part of the image.

    function tileBgPos(row, col, rows, cols) {
        var flippedCol = cols - 1 - col; // RTL: flip horizontal
        var pctX = cols > 1 ? (flippedCol / (cols - 1)) * 100 : 50;
        var pctY = rows > 1 ? (row / (rows - 1)) * 100 : 50;
        return pctX + '% ' + pctY + '%';
    }

    // ─── TOPIC PICKER OVERLAY ───────────────────────────────
    function renderPicker() {
        if (!rootEl) return;
        var ex = EXERCISES[pickerIndex];
        var previewImage = resolveAssetPath(ex.hypothesisImages[0].image);
        var total = EXERCISES.length;

        var dotsHtml = '';
        for (var d = 0; d < total; d++) {
            dotsHtml += '<button type="button" class="' + CSS_PREFIX + '-picker-dot' + (d === pickerIndex ? ' is-active' : '') + '" data-picker-dot="' + d + '"></button>';
        }

        var html = [];
        html.push('<div class="' + CSS_PREFIX + '-picker-overlay">');
        html.push('<div class="' + CSS_PREFIX + '-picker-card">');

        // Sentence at top
        html.push('<p class="' + CSS_PREFIX + '-picker-sentence">' + esc(ex.originalSentence) + '</p>');

        // Large image
        html.push('<div class="' + CSS_PREFIX + '-picker-image-wrap">');
        html.push('<img class="' + CSS_PREFIX + '-picker-image" src="' + esc(previewImage) + '" alt="">');
        html.push('</div>');

        // Subject name
        html.push('<p class="' + CSS_PREFIX + '-picker-subject">' + esc(ex.subjectName) + '</p>');

        // Navigation row: arrows + dots
        html.push('<div class="' + CSS_PREFIX + '-picker-nav">');
        html.push('<button type="button" class="' + CSS_PREFIX + '-picker-arrow" data-picker-dir="prev">&#8250;</button>');
        html.push('<div class="' + CSS_PREFIX + '-picker-dots">' + dotsHtml + '</div>');
        html.push('<button type="button" class="' + CSS_PREFIX + '-picker-arrow" data-picker-dir="next">&#8249;</button>');
        html.push('</div>');

        // Counter
        html.push('<p class="' + CSS_PREFIX + '-picker-counter">' + (pickerIndex + 1) + ' / ' + total + '</p>');

        // Confirm button
        html.push('<button type="button" class="' + CSS_PREFIX + '-picker-confirm">' + esc('כן, זה הנושא שלי') + '</button>');

        html.push('</div>'); // card
        html.push('</div>'); // overlay

        rootEl.innerHTML = html.join('');
        bindPickerEvents();
    }

    function bindPickerEvents() {
        if (!rootEl) return;

        var arrows = rootEl.querySelectorAll('.' + CSS_PREFIX + '-picker-arrow');
        for (var i = 0; i < arrows.length; i++) {
            arrows[i].addEventListener('click', function (e) {
                var dir = e.currentTarget.getAttribute('data-picker-dir');
                var len = EXERCISES.length;
                if (dir === 'next') {
                    pickerIndex = (pickerIndex + 1) % len;
                } else {
                    pickerIndex = (pickerIndex - 1 + len) % len;
                }
                renderPicker();
            });
        }

        var dots = rootEl.querySelectorAll('.' + CSS_PREFIX + '-picker-dot');
        for (var d = 0; d < dots.length; d++) {
            dots[d].addEventListener('click', function (e) {
                var idx = parseInt(e.currentTarget.getAttribute('data-picker-dot'), 10);
                if (idx >= 0 && idx < EXERCISES.length) {
                    pickerIndex = idx;
                    renderPicker();
                }
            });
        }

        var confirmBtn = rootEl.querySelector('.' + CSS_PREFIX + '-picker-confirm');
        if (confirmBtn) {
            confirmBtn.addEventListener('click', function () {
                currentExercise = EXERCISES[pickerIndex];
                phase = 'guess';
                viewingHypothesisIndex = 0;
                selectedHypothesisIndex = -1;
                revealedIds = [];
                revealedTileIndexes = [];
                currentReveal = null;
                pendingTileReveal = -1;
                initTileRevealOrder();
                saveState();
                renderAll();
            });
        }
    }

    // ─── RENDER ───────────────────────────────────────────────
    function renderAll() {
        if (!rootEl) return;
        if (phase === 'pick') { renderPicker(); return; }
        if (!currentExercise) return;
        var ex = currentExercise;
        var grid = ex.imageGrid;
        var totalTiles = grid.rows * grid.cols;
        var complete = phase === 'complete';

        var html = [];
        var hyps = ex.hypothesisImages;
        var viewIdx = viewingHypothesisIndex;
        if (viewIdx < 0 || viewIdx >= hyps.length) viewIdx = 0;

        // ══════════════════════════════════════════════════
        // TOP ROW: image (right) + side controls (left)
        // ══════════════════════════════════════════════════
        html.push('<div class="' + CSS_PREFIX + '-top-row">');

        // ── Image column (right in RTL) ──
        html.push('<div class="' + CSS_PREFIX + '-image-col">');

        // Hypothesis carousel nav (guess phase)
        if (phase === 'guess') {
            var dotsHtml = '';
            for (var d = 0; d < hyps.length; d++) {
                dotsHtml += '<button type="button" class="' + CSS_PREFIX + '-dot' + (d === viewIdx ? ' is-active' : '') + '" data-dot="' + d + '"></button>';
            }
            html.push(
                '<div class="' + CSS_PREFIX + '-hyp-bar">' +
                '<div class="' + CSS_PREFIX + '-hyp-nav-row">' +
                '<button type="button" class="' + CSS_PREFIX + '-nav-arrow" data-dir="prev">&#8250;</button>' +
                '<div class="' + CSS_PREFIX + '-dots">' + dotsHtml + '</div>' +
                '<button type="button" class="' + CSS_PREFIX + '-nav-arrow" data-dir="next">&#8249;</button>' +
                '</div>' +
                '<span class="' + CSS_PREFIX + '-hyp-label">' + esc(hyps[viewIdx].label) + '</span>' +
                '</div>'
            );
        } else {
            var labelText = complete ? 'מבנה העומק נחשף' : 'התמונה מתחילה להתחלף';
            html.push('<div class="' + CSS_PREFIX + '-image-label">' + esc(labelText) + '</div>');
        }

        // Image grid
        var resolvedSurface = resolveAssetPath(getActiveImage());
        var resolvedTruth = resolveAssetPath(ex.truthImage);

        html.push('<div class="' + CSS_PREFIX + '-image-grid' + (complete ? ' is-complete' : '') + '" style="--iids-grid-rows:' + grid.rows + ';--iids-grid-cols:' + grid.cols + ';">');

        var capturedPending = pendingTileReveal;
        pendingTileReveal = -1;

        for (var t = 0; t < totalTiles; t++) {
            var tileIsRevealed = isTileRevealed(t) && t !== capturedPending;
            var row = Math.floor(t / grid.cols);
            var col = t % grid.cols;
            var bgPos = tileBgPos(row, col, grid.rows, grid.cols);
            html.push(
                '<div class="' + CSS_PREFIX + '-tile' + (tileIsRevealed ? ' is-revealed' : '') + '" data-tile="' + t + '">' +
                '<div class="' + CSS_PREFIX + '-tile-inner">' +
                '<div class="' + CSS_PREFIX + '-tile-face ' + CSS_PREFIX + '-tile-a" style="background-image:url(\'' + esc(resolvedSurface) + '\');background-position:' + bgPos + ';"></div>' +
                '<div class="' + CSS_PREFIX + '-tile-face ' + CSS_PREFIX + '-tile-b" style="background-image:url(\'' + esc(resolvedTruth) + '\');background-position:' + bgPos + ';"></div>' +
                '</div></div>'
            );
        }
        html.push('</div>'); // grid

        html.push('</div>'); // image-col

        // ── Side controls column (left in RTL) ──
        html.push('<div class="' + CSS_PREFIX + '-side-controls">');

        if (phase === 'guess') {
            // Confirm button in side panel
            html.push(
                '<button type="button" class="' + CSS_PREFIX + '-confirm-btn">' + esc('בחרתי ✓') + '</button>'
            );
        } else {
            // Reveal-phase: 3 stacked category buttons (TV remote style)
            var categories = [
                { key: 'deletion', label: 'השמטה', sub: 'מה חסר?' },
                { key: 'distortion', label: 'עיוות', sub: 'מה נכנס?' },
                { key: 'generalization', label: 'הכללה', sub: 'איזה חוק?' }
            ];
            for (var b = 0; b < categories.length; b++) {
                var cat = categories[b];
                var catReveals = (ex.reveals[cat.key] || []).length;
                var catDone = getRevealedCount(cat.key);
                var catExhausted = catDone >= catReveals;
                html.push(
                    '<button type="button" class="' + CSS_PREFIX + '-side-btn' +
                    (catExhausted ? ' is-exhausted' : '') +
                    '" data-category="' + cat.key + '"' +
                    (catExhausted ? ' disabled' : '') + '>' +
                    '<span class="' + CSS_PREFIX + '-side-btn-label">' + esc(cat.label) + '</span>' +
                    '<span class="' + CSS_PREFIX + '-side-btn-sub">' + esc(cat.sub) + '</span>' +
                    '<span class="' + CSS_PREFIX + '-side-btn-count">' + catDone + '/' + catReveals + '</span>' +
                    '</button>'
                );
            }
        }

        html.push('</div>'); // side-controls
        html.push('</div>'); // top-row

        // ── Instruction line
        if (phase === 'guess') {
            html.push('<p class="' + CSS_PREFIX + '-guess-instruction">' + esc('החליפו בין התמונות עם החצים — ובחרו את תמונת השטח') + '</p>');
        } else if (phase === 'reveal' && !complete) {
            html.push('<p class="' + CSS_PREFIX + '-reveal-instruction">' + esc('לחצו על הכפתורים אחד אחד כדי לחשוף את התמונה האמיתית') + '</p>');
        }

        // ══════════════════════════════════════════════════
        // BOTTOM: Text panel (bigger, clearer)
        // ══════════════════════════════════════════════════
        html.push('<div class="' + CSS_PREFIX + '-text-panel">');
        html.push(
            '<div class="' + CSS_PREFIX + '-text-cell ' + CSS_PREFIX + '-text-core">' +
            '<span class="' + CSS_PREFIX + '-core-label">מבנה השטח — המשפט הנאמר:</span>' +
            '<span class="' + CSS_PREFIX + '-core-sentence">' + esc(ex.originalSentence) + '</span>' +
            '</div>'
        );
        html.push('<div class="' + CSS_PREFIX + '-text-grid">');
        var slots = ex.textSlots;
        var maxRow = 0; var maxCol = 0;
        for (var s = 0; s < slots.length; s++) {
            if (slots[s].row > maxRow) maxRow = slots[s].row;
            if (slots[s].col > maxCol) maxCol = slots[s].col;
        }
        html.push('<div class="' + CSS_PREFIX + '-text-cells" style="--iids-text-rows:' + (maxRow + 1) + ';--iids-text-cols:' + (maxCol + 1) + ';">');
        for (var si = 0; si < slots.length; si++) {
            var slot = slots[si];
            var revealData = isSlotRevealed(slot.id);
            var catClass = slot.category === 'deletion' ? 'del' : slot.category === 'distortion' ? 'dis' : 'gen';
            html.push(
                '<div class="' + CSS_PREFIX + '-text-cell ' + CSS_PREFIX + '-text-slot ' + CSS_PREFIX + '-cat-' + catClass +
                (revealData ? ' is-revealed' : '') +
                '" data-slot="' + esc(slot.id) + '" style="grid-row:' + (slot.row + 1) + ';grid-column:' + (slot.col + 1) + ';">' +
                (revealData ? '<span class="' + CSS_PREFIX + '-slot-text">' + esc(revealData.text) + '</span>' : '<span class="' + CSS_PREFIX + '-slot-placeholder">?</span>') +
                '</div>'
            );
        }
        html.push('</div></div></div>');

        // ── Ask popup (opens when category button clicked, closes on ASK)
        if (phase === 'reveal' && pendingAskReveal && !complete) {
            html.push(
                '<div class="' + CSS_PREFIX + '-ask-popup">' +
                '<div class="' + CSS_PREFIX + '-box-yellow">' +
                '<span class="' + CSS_PREFIX + '-box-label">שאלת העומק הנוכחית</span>' +
                '<p>' + esc(pendingAskReveal.question) + '</p>' +
                '</div>' +
                '<div class="' + CSS_PREFIX + '-box-blue">' +
                '<span class="' + CSS_PREFIX + '-box-label">מה השאלה הזאת מחזירה למפה</span>' +
                '<p>' + esc(pendingAskReveal.rationale) + '</p>' +
                '</div>' +
                '<button type="button" class="' + CSS_PREFIX + '-ask-btn">ASK — שאל!</button>' +
                '</div>'
            );
        }

        // ── Completion card
        if (complete) {
            var cp = ex.completionPrompt;
            html.push(
                '<div class="' + CSS_PREFIX + '-completion">' +
                '<div class="' + CSS_PREFIX + '-completion-card">' +
                '<h3>' + esc(cp.title) + '</h3>' +
                '<p class="' + CSS_PREFIX + '-completion-text">' + esc(cp.text) + '</p>' +
                '<p class="' + CSS_PREFIX + '-completion-closing">' + esc(cp.closing) + '</p>' +
                '<button type="button" class="' + CSS_PREFIX + '-restart-btn">תרגול נוסף</button>' +
                '</div>' +
                '</div>'
            );
        }

        // ── Progress
        html.push(
            '<div class="' + CSS_PREFIX + '-progress">' +
            '<span>' + revealedIds.length + ' / ' + getTotalReveals() + ' חשיפות</span>' +
            '<div class="' + CSS_PREFIX + '-progress-bar"><div class="' + CSS_PREFIX + '-progress-fill" style="width:' + (getTotalReveals() > 0 ? Math.round((revealedIds.length / getTotalReveals()) * 100) : 0) + '%;"></div></div>' +
            '</div>'
        );

        rootEl.innerHTML = html.join('');

        // ── Trigger CSS transition for pending tile
        if (capturedPending >= 0) {
            (function (idx) {
                requestAnimationFrame(function () {
                    requestAnimationFrame(function () {
                        if (!rootEl) return;
                        var el = rootEl.querySelector('[data-tile="' + idx + '"]');
                        if (el) el.classList.add('is-revealed');
                    });
                });
            })(capturedPending);
        }

        bindEvents();
    }

    // ─── EVENTS ──────────────────────────────────────────────
    function bindEvents() {
        if (!rootEl) return;

        // Category reveal buttons (side panel)
        var btns = rootEl.querySelectorAll('.' + CSS_PREFIX + '-side-btn');
        for (var i = 0; i < btns.length; i++) {
            btns[i].addEventListener('click', handleCategoryClick);
        }

        // Confirm button
        var confirmBtn = rootEl.querySelector('.' + CSS_PREFIX + '-confirm-btn');
        if (confirmBtn) {
            confirmBtn.addEventListener('click', handleConfirm);
        }

        // Nav arrows (in hyp-bar)
        var navArrows = rootEl.querySelectorAll('.' + CSS_PREFIX + '-nav-arrow');
        for (var a = 0; a < navArrows.length; a++) {
            navArrows[a].addEventListener('click', handleArrow);
        }

        // Dot navigation
        var dots = rootEl.querySelectorAll('.' + CSS_PREFIX + '-dot');
        for (var d = 0; d < dots.length; d++) {
            dots[d].addEventListener('click', handleDot);
        }

        // ASK button
        var askBtn = rootEl.querySelector('.' + CSS_PREFIX + '-ask-btn');
        if (askBtn) {
            askBtn.addEventListener('click', handleAsk);
        }

        // Restart button
        var restartBtn = rootEl.querySelector('.' + CSS_PREFIX + '-restart-btn');
        if (restartBtn) {
            restartBtn.addEventListener('click', handleRestart);
        }
    }

    function handleArrow(event) {
        if (phase !== 'guess' || !currentExercise) return;
        var dir = event.currentTarget.getAttribute('data-dir');
        var len = currentExercise.hypothesisImages.length;
        if (dir === 'next') {
            viewingHypothesisIndex = (viewingHypothesisIndex + 1) % len;
        } else {
            viewingHypothesisIndex = (viewingHypothesisIndex - 1 + len) % len;
        }
        renderAll();
    }

    function handleDot(event) {
        if (phase !== 'guess' || !currentExercise) return;
        var idx = parseInt(event.currentTarget.getAttribute('data-dot'), 10);
        if (idx >= 0 && idx < currentExercise.hypothesisImages.length) {
            viewingHypothesisIndex = idx;
            renderAll();
        }
    }

    function handleConfirm() {
        if (phase !== 'guess') return;
        selectedHypothesisIndex = viewingHypothesisIndex;
        phase = 'reveal';
        saveState();
        renderAll();
    }

    function handleCategoryClick(event) {
        if (phase !== 'reveal') return;
        var btn = event.currentTarget;
        var category = btn.getAttribute('data-category');
        if (!category) return;

        var reveal = getNextReveal(category);
        if (!reveal) return;

        // Stage the reveal — show popup but don't commit yet
        pendingAskReveal = reveal;
        renderAll();

        var popup = rootEl.querySelector('.' + CSS_PREFIX + '-ask-popup');
        if (popup) {
            setTimeout(function () {
                popup.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }, 60);
        }
    }

    function handleAsk() {
        if (!pendingAskReveal) return;

        var reveal = pendingAskReveal;
        pendingAskReveal = null;

        revealedIds.push(reveal.id);
        currentReveal = reveal;

        // Reveal next random tile
        var tileIdx = revealedTileIndexes.length;
        if (tileIdx < tileRevealOrder.length) {
            revealedTileIndexes.push(tileRevealOrder[tileIdx]);
            pendingTileReveal = tileRevealOrder[tileIdx];
        }

        // Check completion
        if (isComplete()) {
            phase = 'complete';
        }

        saveState();

        if (typeof window.awardMetaGamificationXp === 'function') {
            window.awardMetaGamificationXp(5, 'initial-image-vs-deep-structure');
        }

        renderAll();
    }

    function handleRestart() {
        phase = 'pick';
        currentExercise = null;
        selectedHypothesisIndex = -1;
        viewingHypothesisIndex = 0;
        revealedIds = [];
        revealedTileIndexes = [];
        currentReveal = null;
        pendingAskReveal = null;
        pendingTileReveal = -1;
        tileRevealOrder = [];
        try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* ignore */ }
        renderAll();
    }

    // ─── MOUNT ────────────────────────────────────────────────
    function mount() {
        rootEl = document.getElementById(ROOT_ID);
        if (!rootEl || mounted) return;
        mounted = true;

        // Restore state
        var saved = loadState();
        if (saved && saved.exerciseId) {
            // Find the saved exercise
            var foundEx = null;
            for (var ei = 0; ei < EXERCISES.length; ei++) {
                if (EXERCISES[ei].id === saved.exerciseId) {
                    foundEx = EXERCISES[ei];
                    pickerIndex = ei;
                    break;
                }
            }
            if (foundEx) {
                currentExercise = foundEx;
                phase = saved.phase || 'guess';
                if (phase === 'pick') phase = 'guess'; // don't restore back to picker
                selectedHypothesisIndex = typeof saved.selectedHypothesisIndex === 'number' ? saved.selectedHypothesisIndex : -1;
                viewingHypothesisIndex = typeof saved.viewingHypothesisIndex === 'number' ? saved.viewingHypothesisIndex : 0;
                revealedIds = Array.isArray(saved.revealedIds) ? saved.revealedIds : [];
                revealedTileIndexes = Array.isArray(saved.revealedTileIndexes) ? saved.revealedTileIndexes : [];
                tileRevealOrder = Array.isArray(saved.tileRevealOrder) ? saved.tileRevealOrder : [];
                if (saved.currentRevealId) {
                    var categories = ['deletion', 'distortion', 'generalization'];
                    for (var c = 0; c < categories.length; c++) {
                        var reveals = currentExercise.reveals[categories[c]] || [];
                        for (var r = 0; r < reveals.length; r++) {
                            if (reveals[r].id === saved.currentRevealId) {
                                currentReveal = reveals[r];
                            }
                        }
                    }
                }

                if (!tileRevealOrder.length) {
                    initTileRevealOrder();
                }

                // Sync tiles with reveals (migration from old state)
                while (revealedTileIndexes.length < revealedIds.length && revealedTileIndexes.length < tileRevealOrder.length) {
                    revealedTileIndexes.push(tileRevealOrder[revealedTileIndexes.length]);
                }

                // Fix phase consistency
                if (isComplete() && phase !== 'complete') phase = 'complete';
                if (revealedIds.length > 0 && phase === 'guess') phase = 'reveal';
            } else {
                phase = 'pick';
            }
        } else {
            phase = 'pick';
        }

        renderAll();
    }

    // ─── CONTROLLER ──────────────────────────────────────────
    window.__metaFeatureControllers = window.__metaFeatureControllers || {};
    window.__metaFeatureControllers['initial-image-vs-deep-structure'] = {
        stepBack: function () { return false; },
        canRestart: function () { return true; },
        restart: function () {
            handleRestart();
            return true;
        }
    };

    // ─── BOOT ────────────────────────────────────────────────
    function tryMount() {
        if (document.getElementById(ROOT_ID)) mount();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', tryMount, { once: true });
    } else {
        tryMount();
    }

    if (typeof MutationObserver === 'function' && document.body) {
        var observer = new MutationObserver(function () {
            if (!mounted && document.getElementById(ROOT_ID)) {
                mount();
            }
        });
        observer.observe(document.body, { attributes: true, attributeFilter: ['data-active-tab'] });
    }

})(window, document);
