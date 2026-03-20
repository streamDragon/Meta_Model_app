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
            originalSentence: "כשהיא אמרה לי 'אתה לא באמת רעב', רק רציתי לאכול עוד.",
            subjectName: 'רן',
            hypothesisImages: [
                {
                    id: 'h1',
                    label: 'הוא פשוט לא שולט',
                    subtitle: 'נראה שהוא נמשך מיד לאוכל',
                    image: 'assets/images/initial-image-vs-deep-structure/obesity_scene/obesity_guess_1.jpg'
                },
                {
                    id: 'h2',
                    label: 'הוא מורד בביקורת',
                    subtitle: 'ההערה מפעילה אצלו תגובת נגד',
                    image: 'assets/images/initial-image-vs-deep-structure/obesity_scene/obesity_guess_2.jpg'
                },
                {
                    id: 'h3',
                    label: 'האוכל מנחם אותו',
                    subtitle: 'האכילה נראית כמו נחמה וריכוך',
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
                        text: "היא אמרה: 'אתה לא באמת רעב, אתה שוב בורח לאוכל.'",
                        question: 'מה בדיוק היא אמרה שגרם לך לרצות לאכול עוד?',
                        rationale: "השאלה מחזירה את המשפט המדויק במקום הכותרת הכללית 'זה הפעיל אותי'.",
                        targetTextSlot: 'd1'
                    },
                    {
                        id: 'obesity-deletion-2',
                        text: 'זה היה אחרי יום ארוך, כשהוא כבר הרגיש מותש וריק.',
                        question: 'באיזה הקשר זה קרה?',
                        rationale: 'ההקשר מחזיר עומק לחוויה, ולא משאיר אותה כאירוע מבודד.',
                        targetTextSlot: 'd2'
                    },
                    {
                        id: 'obesity-deletion-3',
                        text: 'באותו רגע הוא הרגיש חום בפנים, כיווץ בחזה, ודחף חזק למתוק.',
                        question: 'מה קרה לך בגוף באותו רגע?',
                        rationale: 'השאלה מחזירה את החוויה הגופנית שנמחקה מן הסיפור.',
                        targetTextSlot: 'd3'
                    }
                ],
                distortion: [
                    {
                        id: 'obesity-distortion-1',
                        text: 'הוא לא שמע בזה רק דאגה — אלא כאילו היא רואה בו כישלון.',
                        question: 'איך זה נהיה אצלך הערה על הערך שלך — ולא רק על האוכל?',
                        rationale: 'כאן נחשף הפירוש שנכנס בין דבריה לבין החוויה שלו.',
                        targetTextSlot: 'x1'
                    },
                    {
                        id: 'obesity-distortion-2',
                        text: 'אצלו הערה על אוכל נחווית כמעט מיד כבושה וגועל עצמי.',
                        question: 'איזה פירוש הופך הערה על אוכל לבושה?',
                        rationale: 'השאלה חושפת את העיוות: ההערה נהיית חוויה של השפלה פנימית.',
                        targetTextSlot: 'x2'
                    },
                    {
                        id: 'obesity-distortion-3',
                        text: 'בתוך שניות האוכל נהיה לא פינוק — אלא דרך לא להרגיש חשוף.',
                        question: 'מה האוכל עושה בשבילך ברגע הזה?',
                        rationale: 'השאלה מגלה שהאכילה ממלאת תפקיד מגן, לא רק תפקיד של תשוקה.',
                        targetTextSlot: 'x3'
                    }
                ],
                generalization: [
                    {
                        id: 'obesity-generalization-1',
                        text: 'יש בו כלל ישן: כשמביישים אותי, אוכל מציל אותי.',
                        question: 'איזה חוק פועל אצלך ברגע הזה?',
                        rationale: 'כאן מתגלה הכלל הרחב שמנהל את התגובה.',
                        targetTextSlot: 'g1'
                    },
                    {
                        id: 'obesity-generalization-2',
                        text: 'הוא מכיר את התחושה ממקומות מוקדמים שבהם העירו על הגוף והאוכל.',
                        question: 'מאיפה הדפוס הזה מוכר לך?',
                        rationale: 'השאלה מחברת את ההווה לחוויה ישנה יותר.',
                        targetTextSlot: 'g2'
                    },
                    {
                        id: 'obesity-generalization-3',
                        text: 'לכן האכילה הרגישה כמעט אוטומטית — כמו הגנה, לא כמו בחירה.',
                        question: 'איך זה נהיה כמעט בלתי נמנע?',
                        rationale: "כאן רואים שה'אין ברירה' הוא מנגנון שנבנה, לא חוק טבע.",
                        targetTextSlot: 'g3'
                    }
                ]
            },
            completionPrompt: {
                title: 'עכשיו רואים את האוכל אחרת',
                text: 'מה התברר עכשיו על הבושה, על ההגנה, ועל התפקיד שהאוכל ממלא בתוך הרגע?',
                closing: 'כאן כבר לא רואים רק אכילה — רואים מנגנון פנימי של הגנה מפני בושה.'
            }
        },
        {
            id: 'initial-image-vs-deep-structure-social-anxiety-01',
            feature: 'initial-image-vs-deep-structure',
            title: 'מתמונת שטח למבנה עומק',
            originalSentence: 'כשביקשו ממני להגיד שתי מילים על עצמי, פשוט נמחקתי.',
            subjectName: 'איתן',
            hypothesisImages: [
                {
                    id: 'h1',
                    label: 'כולם שופטים אותו',
                    subtitle: 'הוא חווה את החדר כעויין',
                    image: 'assets/images/initial-image-vs-deep-structure/social_anxiety_scene/social_guess_1.jpg'
                },
                {
                    id: 'h2',
                    label: 'אסור לו לטעות',
                    subtitle: 'טעות אחת מרגישה אסון',
                    image: 'assets/images/initial-image-vs-deep-structure/social_anxiety_scene/social_guess_2.jpg'
                },
                {
                    id: 'h3',
                    label: 'הוא פשוט ביישן',
                    subtitle: 'על פני השטח זה נראה כמו ביישנות',
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
                        text: "המנחה אמרה בעדינות: 'בוא תספר על עצמך בשתי מילים.'",
                        question: 'מה בדיוק ביקשו ממך?',
                        rationale: "השאלה מחזירה את הניסוח המדויק במקום התחושה הכוללת של 'זה היה נורא'.",
                        targetTextSlot: 'd1'
                    },
                    {
                        id: 'social-deletion-2',
                        text: 'כל העיניים בחדר עברו אליו בבת אחת.',
                        question: 'מה קרה סביבך באותו רגע?',
                        rationale: 'ההקשר החברתי מחזיר את תנאי הרגע ולא משאיר רק כותרת רגשית.',
                        targetTextSlot: 'd2'
                    },
                    {
                        id: 'social-deletion-3',
                        text: 'באותו רגע הגרון נסגר, הראש התרוקן, והוא הפסיק לנשום רגיל.',
                        question: 'מה קרה לך בפנים באותו רגע?',
                        rationale: 'השאלה מחזירה את החוויה הגופנית והמיידית שנמחקה מן המשפט.',
                        targetTextSlot: 'd3'
                    }
                ],
                distortion: [
                    {
                        id: 'social-distortion-1',
                        text: 'הוא לא שמע בזה הזמנה — אלא מבחן.',
                        question: 'איך ההזמנה נהייתה אצלך מבחן?',
                        rationale: 'כאן נחשף הפירוש שנכנס בין מה שנאמר לבין מה שנחווה.',
                        targetTextSlot: 'x1'
                    },
                    {
                        id: 'social-distortion-2',
                        text: 'אצלו מבט של קבוצה נהיה מיד סכנת השפלה.',
                        question: 'מה המשמעות שמבט של קבוצה מקבל אצלך?',
                        rationale: 'השאלה מפרידה בין המבט עצמו לבין המשמעות שנכנסה אליו.',
                        targetTextSlot: 'x2'
                    },
                    {
                        id: 'social-distortion-3',
                        text: 'בתוכו זה נהיה כאילו אם יראה את עצמו — יתגלה שאין לו מקום.',
                        question: 'מה היה קורה, מבחינתך, אם היו באמת רואים אותך?',
                        rationale: 'כאן נחשף הקישור הפנימי בין נראות לבין סכנה.',
                        targetTextSlot: 'x3'
                    }
                ],
                generalization: [
                    {
                        id: 'social-generalization-1',
                        text: 'יש בו כלל ישן: עדיף להיעלם מאשר להיחשף.',
                        question: 'איזה חוק פעל אצלך ברגע הזה?',
                        rationale: 'כאן מתגלה הכלל הרחב שמכוון את המחיקה.',
                        targetTextSlot: 'g1'
                    },
                    {
                        id: 'social-generalization-2',
                        text: 'התחושה מוכרת לו ממקומות מוקדמים של מבוכה ולעג.',
                        question: 'מאיפה הדפוס הזה מוכר לך?',
                        rationale: 'השאלה מחברת את ההווה לניסיון קודם ולא משאירה הכול רק בסיטואציה הנוכחית.',
                        targetTextSlot: 'g2'
                    },
                    {
                        id: 'social-generalization-3',
                        text: 'לכן המחיקה הרגישה לא כמו בחירה — אלא כמו מנגנון הצלה.',
                        question: 'איך זה נהיה כמעט בלתי נמנע?',
                        rationale: "כאן מתגלה שה'אין ברירה' הוא מנגנון פנימי שנבנה לאורך זמן.",
                        targetTextSlot: 'g3'
                    }
                ]
            },
            completionPrompt: {
                title: 'עכשיו רואים שהבעיה אינה רק חברתית',
                text: 'מה התברר עכשיו על החשיפה, על המבט, ועל החוק הפנימי שמופעל כשמסתכלים עליו?',
                closing: 'כאן כבר לא רואים רק ביישנות — רואים מבנה פנימי של סכנה תחת מבט.'
            }
        }
    ];

    // ─── STATE ────────────────────────────────────────────────
    var currentExercise = null;
    var phase = 'guess';                   // 'guess' | 'reveal' | 'complete'
    var selectedHypothesisIndex = -1;      // confirmed choice
    var viewingHypothesisIndex = 0;        // currently browsed
    var revealedIds = [];
    var currentReveal = null;
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

    // ─── RENDER ───────────────────────────────────────────────
    function renderAll() {
        if (!rootEl || !currentExercise) return;
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

        // ── Yellow / blue info boxes
        if (phase === 'reveal' && currentReveal && !complete) {
            html.push(
                '<div class="' + CSS_PREFIX + '-info-boxes">' +
                '<div class="' + CSS_PREFIX + '-box-yellow">' +
                '<span class="' + CSS_PREFIX + '-box-label">שאלת העומק הנוכחית</span>' +
                '<p>' + esc(currentReveal.question) + '</p>' +
                '</div>' +
                '<div class="' + CSS_PREFIX + '-box-blue">' +
                '<span class="' + CSS_PREFIX + '-box-label">מה השאלה הזאת מחזירה למפה</span>' +
                '<p>' + esc(currentReveal.rationale) + '</p>' +
                '</div>' +
                '</div>'
            );
        } else if (phase === 'reveal' && !currentReveal && !complete) {
            html.push(
                '<div class="' + CSS_PREFIX + '-info-boxes">' +
                '<div class="' + CSS_PREFIX + '-box-yellow ' + CSS_PREFIX + '-box-initial">' +
                '<p>לחצו על הכפתורים כדי לחשוף שכבות — השמטה, עיוות והכללה</p>' +
                '</div>' +
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

        var infoBoxes = rootEl.querySelector('.' + CSS_PREFIX + '-info-boxes');
        if (infoBoxes) {
            setTimeout(function () {
                infoBoxes.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }, 100);
        }
    }

    function handleRestart() {
        phase = 'guess';
        selectedHypothesisIndex = -1;
        viewingHypothesisIndex = 0;
        revealedIds = [];
        revealedTileIndexes = [];
        currentReveal = null;
        pendingTileReveal = -1;
        initTileRevealOrder();
        saveState();
        renderAll();
    }

    // ─── MOUNT ────────────────────────────────────────────────
    function mount() {
        rootEl = document.getElementById(ROOT_ID);
        if (!rootEl || mounted) return;
        mounted = true;

        currentExercise = EXERCISES[0];

        // Restore state
        var saved = loadState();
        if (saved && saved.exerciseId === currentExercise.id) {
            phase = saved.phase || 'guess';
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
