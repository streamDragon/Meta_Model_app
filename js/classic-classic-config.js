(function attachClassicClassicConfig(rootFactory) {
    const root = typeof globalThis !== 'undefined'
        ? globalThis
        : (typeof window !== 'undefined' ? window : this);
    const api = rootFactory();
    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    }
    root.classicClassicConfig = api;
})(function createClassicClassicConfig() {
    const GAME_CONFIG = Object.freeze({
        exam: Object.freeze({
            sessionSeconds: 180,
            lives: 3,
            allowPause: false,
            allowHints: false,
            allowExplain: false,
            timePenaltyOnWrong: 0
        }),
        learning: Object.freeze({
            sessionSeconds: 600,
            lives: Infinity,
            allowPause: true,
            allowHints: true,
            allowExplain: true,
            timePenaltyOnWrong: 3
        }),
        optionCounts: Object.freeze({
            questionOptions: 5,
            questionCorrect: 2,
            problemOptions: 5,
            goalOptions: 5
        }),
        scoring: Object.freeze({
            correctStageBase: 10,
            streakBonusStep: 2,
            examRoundTimeBonusDivisor: 5
        }),
        session: Object.freeze({
            patternStrategy: 'random',
            examEndsRoundOnWrong: false
        })
    });

    const SCENE_LIBRARY = Object.freeze({
        familyFallbacks: Object.freeze({
            deletion: Object.freeze({
                sceneImagePool: Object.freeze([
                    'assets/images/classic-scenes/hurt-1.webp',
                    'assets/images/classic-scenes/sadness-1.webp'
                ]),
                sceneAlt: 'אדם יושב בשיחה רגישה ומנסה להסביר חוויה שקשה לו לנסח במדויק.',
                sceneLabel: 'רגע שבו משהו נשאר חסר',
                contextLead: 'בתוך שיחה קרובה משהו חשוב נאמר, אבל חלק מהתמונה עדיין נשאר מעורפל.',
                contextAfter: 'כאן לא ממהרים לפרש. קודם מחזירים את הפרטים שחסרים בתוך המילים עצמן.'
            }),
            distortion: Object.freeze({
                sceneImagePool: Object.freeze([
                    'assets/images/classic-scenes/anxiety-1.webp',
                    'assets/images/classic-scenes/anxiety-2.webp',
                    'assets/images/classic-scenes/sadness-2.webp'
                ]),
                sceneAlt: 'אדם דרוך בתוך שיחה רגשית ומחזיק משמעות כואבת כאילו היא עובדה.',
                sceneLabel: 'רגע שבו המשמעות משתלטת',
                contextLead: 'השיחה כבר טעונה, והמשפט נשמע כמו אמת גמורה למרות שהוא מלא בפרשנות או בקשר נסתר.',
                contextAfter: 'המטרה כאן היא להחזיר קרקע מתחת לרגליים ולבדוק מה באמת נאמר, ומה נוסף עליו בדרך.'
            }),
            generalization: Object.freeze({
                sceneImagePool: Object.freeze([
                    'assets/images/classic-scenes/sadness-1.webp',
                    'assets/images/classic-scenes/hurt-2.webp'
                ]),
                sceneAlt: 'אדם עייף נאחז בכלל נוקשה בתוך שיחה פנימית או בין-אישית.',
                sceneLabel: 'רגע שבו כלל קשיח מנהל את השיחה',
                contextLead: 'יש כאן כאב אמיתי, אבל הוא מתלבש על כלל רחב מדי שלוקח ממנו גמישות ובחירה.',
                contextAfter: 'בשלב הזה לא שוברים את החוויה, רק בודקים איפה הכלל נעשה מוחלט מדי.'
            })
        }),
        patterns: Object.freeze({
            unspecified_noun: Object.freeze({
                sceneImage: 'assets/images/classic-scenes/sadness-1.webp',
                sceneAlt: 'אישה יושבת בסוף יום ארוך ומנסה להסביר מה מכביד על האווירה בבית.',
                sceneLabel: 'שיחה זוגית בסוף היום',
                contextLead: 'מיכל מתיישבת בסוף יום ארוך ומנסה להסביר למה האווירה בבית נהיית כבדה.',
                contextAfter: 'התחושה ברורה, אבל עדיין לא ברור למה בדיוק היא מתכוונת כשהיא אומרת את זה.',
                highlightedQuote: 'יש שם בעיה'
            }),
            unspecified_verb: Object.freeze({
                sceneImage: 'assets/images/classic-scenes/hurt-2.webp',
                sceneAlt: 'גבר יושב בשיחה רגישה ומתאר שוב רגע שבו נפגע מקשר עם אביו.',
                sceneLabel: 'שיחה טעונה עם אבא',
                contextLead: 'דני, בן 38, מספר שוב על השיחות עם אבא שלו ועל איך כל ניסיון להתקרב נסגר.',
                contextAfter: 'כאן שווה לעצור רגע על הפעולה עצמה, לפני שמפרשים את כל הסיפור.',
                highlightedQuote: 'פוגע בי'
            }),
            simple_deletion: Object.freeze({
                sceneImage: 'assets/images/classic-scenes/hurt-1.webp',
                sceneAlt: 'אדם עוצר מול חבר קרוב ומנסה להסביר למה הכול מרגיש כבד.',
                sceneLabel: 'משפט קצר מדי ברגע רגיש',
                contextLead: 'ברגע עדין מול אדם קרוב, הדובר מנסה לומר מה עובר עליו אבל נשאר עם ניסוח קצר וסגור.',
                contextAfter: 'הקושי אמיתי, ועדיין חסר כאן משהו שאפשר ממש לאחוז בו.',
                highlightedQuote: 'זה קשה'
            }),
            comparative_deletion: Object.freeze({
                sceneImage: 'assets/images/classic-scenes/sadness-2.webp',
                sceneAlt: 'אישה משווה את עצמה לאחרים ומתקשה להרגיש מספיק טובה.',
                sceneLabel: 'השוואה שחותכת מבפנים',
                contextLead: 'במפגש אישי, הדוברת משווה את עצמה לאחרים ומיד נופלת למטה.',
                contextAfter: 'הכאב עובר חזק, אבל בלי לדעת ביחס למה בדיוק היא משווה, נשארים בערפל.',
                highlightedQuote: 'פחות טוב'
            }),
            lack_ref_index: Object.freeze({
                sceneImage: 'assets/images/classic-scenes/anxiety-1.webp',
                sceneAlt: 'עובדת צעירה יושבת מתוחה ומרגישה שאין לה מקום בצוות.',
                sceneLabel: 'הם, אבל מי בעצם?',
                contextLead: 'נועה מספרת על עבודה חדשה ועל התחושה שהיא לא מצליחה למצוא בה מקום בטוח.',
                contextAfter: 'החוויה מובנת, אבל המילה "הם" עדיין משאירה אותנו בלי דמות ממשית לעבוד איתה.',
                highlightedQuote: 'הם'
            }),
            mind_reading: Object.freeze({
                sceneImage: 'assets/images/classic-scenes/anxiety-2.webp',
                sceneAlt: 'אדם דרוך מפרש מבט של בת זוג כאילו הוא כבר יודע מה היא חושבת עליו.',
                sceneLabel: 'משמעות שנקראה מבפנים',
                contextLead: 'בתוך קשר חשוב, משפט קטן של בת הזוג נדבק ישר לפרשנות כואבת.',
                contextAfter: 'כאן לא מתווכחים עם הכאב, רק בודקים מה באמת ידוע ומה כבר הושלם בדמיון.',
                highlightedQuote: 'אני יודע'
            }),
            cause_effect: Object.freeze({
                sceneImage: 'assets/images/classic-scenes/hurt-1.webp',
                sceneAlt: 'זוג יושב בשקט מתוח, ואחד מהם מרגיש שהשתיקה של השני שוברת את הקשר.',
                sceneLabel: 'כשהשתיקה נהיית סיבה',
                contextLead: 'ברגע מתוח בין בני זוג, הדובר מרגיש שהשתיקה שמולו כבר קובעת את גורל הקשר.',
                contextAfter: 'כאן אנחנו מחפשים את הקשר המדויק בין מה שקורה לבין המשמעות שהודבקה עליו.',
                highlightedQuote: 'הורס את הקשר'
            }),
            complex_equivalence: Object.freeze({
                sceneImage: 'assets/images/classic-scenes/sadness-2.webp',
                sceneAlt: 'אדם מחכה בבית קפה ומתרגם איחור קטן לחוסר אכפתיות עמוק.',
                sceneLabel: 'מאירוע קטן למשמעות גדולה',
                contextLead: 'האיחור עצמו קצר, אבל בתודעה הוא כבר נהיה עדות למשהו כואב הרבה יותר.',
                contextAfter: 'בדיוק כאן בודקים איך אירוע אחד נהיה סימן מוחלט למשמעות אחרת.',
                highlightedQuote: 'זה אומר'
            }),
            presuppositions: Object.freeze({
                sceneImage: 'assets/images/classic-scenes/anxiety-1.webp',
                sceneAlt: 'שיחה טעונה שבה שאלה אחת כבר מכניסה אשמה כאילו היא עובדה.',
                sceneLabel: 'שאלה שסוגרת מראש',
                contextLead: 'הריב עוד לא נרגע, וכבר מגיע משפט שנשמע כמו שאלה אבל מחזיק בתוכו האשמה מוכנה.',
                contextAfter: 'המפתח כאן הוא לזהות מה כבר הונח כאילו אין עליו ויכוח.',
                highlightedQuote: 'תפסיק'
            }),
            nominalization: Object.freeze({
                sceneImage: 'assets/images/classic-scenes/sadness-1.webp',
                sceneAlt: 'שני אנשים יושבים רחוק זה מזה ומרגישים שמילה אחת כללית מחליפה את החוויה החיה.',
                sceneLabel: 'חוויה חיה שננעלה במילה',
                contextLead: 'אחרי תקופה ארוכה של ריחוק, הדובר מנסה לתאר את מה שקורה ביניהם במילה אחת גדולה.',
                contextAfter: 'כאן שווה לפתוח שוב את התהליך החי שמסתתר מאחורי המושג.',
                highlightedQuote: 'ניתוק'
            }),
            universal_quantifiers: Object.freeze({
                sceneImage: 'assets/images/classic-scenes/hurt-2.webp',
                sceneAlt: 'אדם מיואש מתאר שוב ושוב שחוויה קשה קורית לו תמיד.',
                sceneLabel: 'הכול נהיה תמיד',
                contextLead: 'אחרי כמה אכזבות דומות, המשפט כבר נשמע כאילו אין בו שום חריג או נשימה.',
                contextAfter: 'המטרה כאן היא לא לבטל את הכאב, אלא להחזיר אליו טווח ותנועה.',
                highlightedQuote: 'תמיד'
            }),
            modal_necessity: Object.freeze({
                sceneImage: 'assets/images/classic-scenes/sadness-2.webp',
                sceneAlt: 'אדם יושב מול סמכות ומרגיש שאין לו רשות לא להסכים.',
                sceneLabel: 'חובה שננעלה בפנים',
                contextLead: 'ברגע מול סמכות או קרוב משמעותי, הדובר מרגיש שאין באמת מקום לבחירה שלו.',
                contextAfter: 'כאן בודקים מה יוצר את תחושת ה"חייב" ואיפה אולי עוד נשארה אפשרות.',
                highlightedQuote: 'חייב'
            }),
            modal_possibility: Object.freeze({
                sceneImage: 'assets/images/classic-scenes/anxiety-2.webp',
                sceneAlt: 'אדם דרוך לפני עמידה מול קהל ומשוכנע שאין לו שום יכולת לדבר.',
                sceneLabel: 'אי אפשרות שמכווצת את הגוף',
                contextLead: 'לפני רגע של חשיפה, הגוף כבר מתכווץ והמשפט נשמע כמו דלת סגורה.',
                contextAfter: 'אנחנו לא מכריחים אומץ, רק בודקים איפה בדיוק ננעלה היכולת.',
                highlightedQuote: 'לא יכול'
            }),
            lost_performative: Object.freeze({
                sceneImage: 'assets/images/classic-scenes/hurt-1.webp',
                sceneAlt: 'אדם פגוע קובע שמשהו אינו הוגן אבל לא ברור לפי איזה קול או קריטריון.',
                sceneLabel: 'שיפוט בלי כתובת',
                contextLead: 'הפגיעה מורגשת מאוד, אבל המשפט נשמע כמו פסק דין בלי לדעת מי קבע ועל סמך מה.',
                contextAfter: 'כאן מחזירים את הקריטריון ואת הקול שמאחורי השיפוט.',
                highlightedQuote: 'לא הוגן'
            }),
            rules_generalization: Object.freeze({
                sceneImage: 'assets/images/classic-scenes/anxiety-1.webp',
                sceneAlt: 'אדם מחזיק כלל נוקשה שנבנה מתוך פגיעות עבר ומנסה להגן עליו.',
                sceneLabel: 'כלל שנולד מכאב ישן',
                contextLead: 'הדובר למד בדרך הקשה להיזהר, ועכשיו הכלל הישן כבר מתלבש על כל קשר חדש.',
                contextAfter: 'כאן לא שוברים את ההגנה בכוח, רק בודקים איפה הכלל כבר נהיה רחב מדי.',
                highlightedQuote: 'אם אני נפתח'
            })
        })
    });

    return Object.freeze({
        GAME_CONFIG,
        SCENE_LIBRARY
    });
});
