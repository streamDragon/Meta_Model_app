(function initMetaProductGuidance(global) {
    'use strict';

    if (!global || global.MetaProductGuidance) return;

    console.log('[product-guidance] boot start');

    // ── Module-level guards ──────────────────────────────────────────
    var observer = null;
    var observerDisabled = false; // permanently disable after standalone-only pages insert their block
    var isApplying = false;
    var isScheduled = false;
    var lastApplyReason = '';
    var mutationCount = 0;
    var mutationWindowStart = 0;
    var MUTATION_STORM_THRESHOLD = 100; // mutations per second

    const INLINE_MENU_BUTTON_TEXT = 'תפריט מלא';
    const FEATURE_META = Object.freeze({
        'practice-question': Object.freeze({
            containerSelector: '#practice-question .practice-intro-card',
            familyLabel: 'Practice',
            familyName: 'תרגול',
            title: 'תרגול זיהוי',
            trail: ['בית', 'תרגול', 'תרגול זיהוי'],
            summary: 'מסך קצר לחידוד האוזן: שומעים משפט אחד ומחזירים אותו לבדיקה מדויקת.',
            what: 'מזהה אם המשפט נשען על מחיקה, עיוות או הכללה, ומה סוג השאלה שמחזירה מידע חסר.',
            trains: 'שמיעה קלינית של מבנה לשוני, ולא רק תגובה לתוכן.',
            when: 'כשרוצים לבנות רפלקס מהיר לזיהוי לפני שעוברים להתערבות מלאה.',
            why: 'למטפל/ת ולסטודנט/ית ל-NLP זה הבסיס: בלי זיהוי מדויק, גם שאלה טובה נשמעת אקראית.',
            example: '״הוא לא מכבד אותי״ → לפני שמגיבים, בודקים: מה בדיוק הוא עושה או לא עושה?'
        }),
        'practice-radar': Object.freeze({
            containerSelector: '#practice-radar .practice-intro-card',
            familyLabel: 'Practice',
            familyName: 'תרגול',
            title: 'מכ"ם מטה-מודל',
            trail: ['בית', 'תרגול', 'מכ"ם מטה-מודל'],
            summary: 'תרגול מהיר שמדמה רגע אמת: זיהוי תחת קצב, בלי לאבד דיוק.',
            what: 'מציג ביטוי מודגש ומבקש לזהות במהירות את התבנית המרכזית שמנהלת אותו.',
            trains: 'זיהוי תחת לחץ זמן, מעבר בין הקטגוריה לשאלת הבירור, ושמירה על פוקוס.',
            when: 'כשרוצים לתרגל מהירות תגובה בלי לוותר על חשיבה מבנית.',
            why: 'בקליניקה או באימון, הדפוס לא מחכה. צריך לראות אותו בזמן אמת ולדעת איפה לפתוח.',
            example: '״כולם תמיד נגדי״ → מזהים הכללה, ואז שואלים איפה זה קורה, עם מי, ומתי לא.'
        }),
        'practice-triples-radar': Object.freeze({
            containerSelector: '#practice-triples-radar .practice-intro-card',
            familyLabel: 'Practice',
            familyName: 'תרגול',
            title: 'מכ"ם שלשות',
            trail: ['בית', 'תרגול', 'מכ"ם שלשות'],
            summary: 'כאן עובדים בשני שלבים: קודם משפחת הדפוס, ואז התבנית המדויקת בתוך המשפחה.',
            what: 'מסדר את העבודה דרך טבלאות ברין: מאיזה כיוון כדאי לפתוח את המשפט, ואיזו שאלה תשרת זאת.',
            trains: 'מעבר מסריקה רחבה להבחנה דקה בין תבניות קרובות.',
            when: 'כשרוצים לעבוד בצורה שיטתית ולא להתבלבל בין מחיקה, עיוות והכללה.',
            why: 'זה עוזר לבנות חשיבה דיאגנוסטית: לא רק לזהות שמשהו לא מדויק, אלא לדעת מאיפה להתחיל.',
            example: '״ברור שהם יכעסו״ → קודם מזהים עיוות, ואז בודקים אם זו קריאת מחשבות או הנחת יסוד.'
        }),
        'sentence-map': Object.freeze({
            containerSelector: '#sentence-map .practice-intro-card',
            familyLabel: 'Analysis',
            familyName: 'ניתוח',
            title: 'מפת המשפט',
            trail: ['בית', 'ניתוח', 'מפת המשפט'],
            summary: 'לפני שמאתגרים, ממפים: מה קרה בחוץ, מה נהיה בפנים, ומה המשפט מנסה לעשות ביחסים.',
            what: 'מפריד בין עובדה, חוויה, ותפקיד היחסים של המשפט כדי שלא נתערב מוקדם מדי.',
            trains: 'חשיבה רב-שכבתית והשהיית תגובתיות טיפולית.',
            when: 'כשמשפט נשמע טעון, גדול או דרמטי מדי, ועדיין לא ברור איפה באמת הלב של המקרה.',
            why: 'למטפל/ת זה מונע קפיצה לפרשנות. לסטודנט/ית זה בונה עין קלינית לפני שאלה או תיקוף.',
            example: '״הוא לא רואה אותי״ → מפרידים בין מה הוא עשה בפועל, מה נחווה בפנים, ומה זה עושה לקשר.'
        }),
        'practice-wizard': Object.freeze({
            containerSelector: '#practice-wizard .practice-intro-card',
            familyLabel: 'Learning',
            familyName: 'למידה',
            title: 'גשר תחושה-שפה',
            trail: ['בית', 'למידה', 'גשר תחושה-שפה'],
            summary: 'המסך הזה מלמד להחזיק יחד משפט, חוויה פנימית ומציאות חיצונית.',
            what: 'בונה ניסוח ביניים שמדייק גם את מה שקרה וגם את מה שנחווה.',
            trains: 'הלימה, ויסות, ושפה טיפולית שלא מוחקת חוויה או מתרחקת לעמימות.',
            when: 'כשמשפט נשמע נכון רגשית אבל עדיין לא יושב טוב במציאות, או להפך.',
            why: 'זה כלי מעבר חשוב בין Meta Model יבש לבין שפה שעובדת באמת עם אדם חי.',
            example: '״הוא לא רואה אותי״ → ״כשאני משתפת והוא לא מגיב, אני נהיית קטנה ולא חשובה״.'
        }),
        'practice-verb-unzip': Object.freeze({
            containerSelector: '#practice-verb-unzip .practice-intro-card',
            familyLabel: 'Learning',
            familyName: 'למידה',
            title: 'מרכז כלים',
            trail: ['בית', 'למידה', 'מרכז כלים'],
            summary: 'מרכז ניווט מסודר: בוחרים משפחת עבודה אחת ונכנסים לכלי המתאים במקום לשוטט בין מסכים.',
            what: 'מרכז גישה לכל המאמנים והמעבדות, עכשיו לפי משפחות עבודה ולא כרשימת כפתורים שטוחה.',
            trains: 'בחירת כלי לפי מטרה טיפולית או לימודית, ולא לפי שם אקראי.',
            when: 'כשרוצים לבחור לאן ממשיכים עכשיו: תרגול, ניתוח, סימולציה, למידה או כלי מטפל.',
            why: 'כך האפליקציה מרגישה כמו מערכת עבודה אחת ולא כמו אוסף מודולים מנותקים.',
            example: 'צריך לבחור צעד? אם יש משפט עמום מתחילים בניתוח, ואם יש אינטראקציה חיה עוברים לסימולציה.'
        }),
        'comic-engine': Object.freeze({
            containerSelector: '#comic-engine .comic-engine-shell',
            familyLabel: 'Simulation',
            familyName: 'סימולציה',
            title: 'במת קומיקס רגשי',
            trail: ['בית', 'סימולציה', 'במת קומיקס רגשי'],
            summary: 'סימולטור שמראה איך ניסוח משפיע על זרימה, בושה, סוכנות ותגובתיות בשיחה חיה.',
            what: 'מציג בחירה בזמן אמת ואת המחיר הרגשי והיחסי של כל תגובה.',
            trains: 'קריאת השלכות, שפת תיקוף מול לחץ, ובחירה מודעת יותר תחת טעינה רגשית.',
            when: 'כשצריך לראות לא רק האם משפט "נכון", אלא איך הוא נוחת אצל האדם שמולך.',
            why: 'זה מחבר את המטה-מודל להתערבות טיפולית בפועל: שפה משנה state, לא רק מבנה.',
            example: 'במקום ״למה את תמיד ככה?״ בודקים תגובה שמחזיקה קושי ופותחת בדיקה.'
        }),
        categories: Object.freeze({
            containerSelector: '#categories .card',
            familyLabel: 'Learning',
            familyName: 'למידה',
            title: 'מילון הקטגוריות',
            trail: ['בית', 'למידה', 'מילון הקטגוריות'],
            summary: 'ספריית היסוד: מונחים, הבדלים, ודוגמאות לשאלות שאפשר לקחת ישר לשיחה.',
            what: 'מסביר מה כל קטגוריה בודקת, למה היא חשובה, ואיזו שאלה מטה-מודלית בדרך כלל פותחת אותה.',
            trains: 'דיוק מושגי והבחנה בין תבניות קרובות.',
            when: 'כשצריך לחזור לבסיס, לחדד מונח, או להכין שאלה טיפולית מדויקת.',
            why: 'זה מונע עבודה מכנית: לא רק לשנן שמות, אלא להבין למה הדפוס משנה את החקירה.',
            example: 'Lost Performative → במקום לקבל שיפוט כעובדה, שואלים: לפי מי? לפי איזה קריטריון?'
        }),
        blueprint: Object.freeze({
            containerSelector: '#blueprint .blueprint-shell',
            familyLabel: 'Therapist Tools',
            familyName: 'כלי מטפל',
            title: 'בונה מהלך',
            trail: ['בית', 'כלי מטפל', 'בונה מהלך'],
            summary: 'כאן מתרגמים אמירה עמומה או תקיעות לשורת צעדים טיפולית שאפשר באמת להחזיק.',
            what: 'מארגן מהלך: מה שמענו, מה חסר, מה נשאל, ומה הצעד המעשי הבא.',
            trains: 'תכנון התערבות, רצף שיחה, והפיכת כוונה כללית לפעולה קלינית ברורה.',
            when: 'כשיש הבנה טובה של המשפט אבל עדיין לא ברור מה לעשות איתו בחדר.',
            why: 'מטפלים וסטודנטים ל-NLP צריכים לא רק לזהות דפוס, אלא גם לבנות מהלך בטוח, מדויק והדרגתי.',
            example: '״אני חייב להפסיק לפחד״ → מפרקים מה בדיוק מפחיד, מה חסר, ומה תהיה שאלת ההמשך הראשונה.'
        }),
        prismlab: Object.freeze({
            containerSelector: '#prismlab',
            familyLabel: 'Therapist Tools',
            familyName: 'כלי מטפל',
            title: 'מפת רמות ומטה-מודל',
            trail: ['בית', 'כלי מטפל', 'מפת רמות ומטה-מודל'],
            summary: 'מעבדת עומק למטפלים: בודקים באיזו שכבה המשפט יושב, ואיך נכון להצטרף אליו.',
            what: 'פורס את המשפט לרמות, משפחות דפוס וצירי התערבות כדי לבחור תגובה ולא לנחש אותה.',
            trains: 'חשיבה טיפולית שכבתית, הצטרפות לפני אתגור, ושאלת המשך מותאמת לרמה.',
            when: 'כשמשפט אחד מחזיק עולם שלם, וצריך לדעת איפה לעבוד עכשיו.',
            why: 'זה מחבר בין NLP, לוגיקה טיפולית ופרקטיקה של שאלת המשך בטוחה.',
            example: '״אני פשוט לא מסוגל״ → בודקים אם זו זהות, יכולת, כלל, או פחד שמתחפש ליכולת.'
        }),
        about: Object.freeze({
            containerSelector: '#about .card',
            familyLabel: 'Learning',
            familyName: 'למידה',
            title: 'על המוצר',
            trail: ['בית', 'למידה', 'על המוצר'],
            summary: 'כאן מקבלים את ההקשר: איך כל המסלולים מתחברים למערכת אחת של למידה ותרגול.',
            what: 'מסביר את השפה של המוצר, את המשפחות המרכזיות, ואת הקשר בין מטה-מודל, טיפול ו-NLP.',
            trains: 'בחירה מודעת של מסלול עבודה והבנה מערכתית של הכלים.',
            when: 'בכניסה ראשונה, או כשמרגישים שהאפליקציה נהיית גדולה מדי וצריך מפה.',
            why: 'בלי הקשר, גם כלי טוב מרגיש אקראי. ההקשר הופך אותו לשלב בתוך תהליך למידה אמיתי.',
            example: 'אם יש שיחה חיה בוערת → סימולציה. אם יש משפט עמום → ניתוח. אם צריך מהלך → כלי מטפל.'
        }),
        'scenario-trainer': Object.freeze({
            familyLabel: 'Simulation',
            familyName: 'סימולציה',
            title: 'סימולטור סצנות',
            trail: ['בית', 'סימולציה', 'סימולטור סצנות'],
            summary: 'סימולציה חיה לבחירת תגובה בתוך סיטואציה אנושית טעונה.',
            what: 'מראה איך תגובה אחת משנה את החוויה, את התהליך, ואת מה שנפתח או נסגר אחריה.',
            trains: 'תיקוף, דיוק, קריאת השפעה, ושאלת המשך טיפולית בתוך שיחה.',
            when: 'כשצריך לתרגל לא רק "איזו קטגוריה יש כאן", אלא "מה להגיד עכשיו".',
            why: 'זה מחבר בין Meta Model לבין מיומנות קלינית: להבין למה תגובה עוזרת, מתי היא מסלימה, ואיך לתקן.',
            example: '״אני לא מתווכח עכשיו״ → בודקים האם התגובה לוחצת, מצילה, או פותחת מקום לבדיקה.',
            stateLabels: Object.freeze({
                home: 'פתיחה',
                play: 'סצנה',
                feedback: 'משוב',
                blueprint: 'העמקה',
                score: 'סיכום',
                history: 'היסטוריה',
                help: 'עזרה'
            })
        }),
        'classic-classic': Object.freeze({
            familyLabel: 'Practice',
            familyName: 'תרגול',
            title: 'Classic Classic',
            trail: ['בית', 'תרגול', 'Classic Classic'],
            summary: 'אימון תבניות קלאסי עם מעבר שיטתי בין שאלה, מבנה ויעד הבירור.',
            what: 'מסדר את העבודה לפי שלבי מטה-מודל קלאסיים במקום לדלג ישר לתשובה.',
            trains: 'שפה מבנית, זיהוי משפחות דפוס, וניסוח יעד מידע מדויק.',
            when: 'כשרוצים לחזק שלד קליני ברור, שאלה אחרי שאלה.',
            why: 'זה בונה יסודות יציבים לסטודנט/ית ומחדד חשיבה של "מה חסר כאן" למטפל/ת.',
            example: 'משפט כמו ״אני חייב״ עובר דרך שם המבנה, ואז ליעד המידע שחסר כדי לפתוח אותו.'
        }),
        classic2: Object.freeze({
            familyLabel: 'Practice',
            familyName: 'תרגול',
            title: 'Classic 2',
            trail: ['בית', 'תרגול', 'Classic 2'],
            summary: 'גרסת אימון מתקדמת יותר שממשיכה את העבודה הקלאסית במבנה חי ודינמי.',
            what: 'מתרגלת זיהוי ושאילת Meta Model במבנה מתקדם יותר, עם יותר רצף ויותר שונות.',
            trains: 'מעבר מהיר בין זיהוי, בחירה ושמירה על כיוון שיחה.',
            when: 'כשכבר יש בסיס ורוצים להגביר קצב ומורכבות.',
            why: 'עוזר לעבור מלמידה מושגית ליכולת עבודה רציפה יותר.',
            example: 'אותו משפט יכול לדרוש כאן לא רק זיהוי, אלא בחירה בין כמה פתיחות אפשריות.'
        }),
        'iceberg-templates': Object.freeze({
            familyLabel: 'Analysis',
            familyName: 'ניתוח',
            title: 'קצה הקרחון',
            trail: ['בית', 'ניתוח', 'קצה הקרחון'],
            summary: 'מפרק אמירה לעץ הבחנה: מה מעל פני השטח, מה מתחת, ואילו ענפים כדאי לבדוק.',
            what: 'בונה הסתעפות של פירושים, הנחות ושאלות במקום להינעל על קריאה אחת.',
            trains: 'חשיבת ענפים, בדיקת חלופות, והשהיית ודאות מוקדמת.',
            when: 'כשרוצים לראות מה עוד יכול להיות מתחת למשפט אחד שנשמע סגור.',
            why: 'זה חשוב לטיפול ול-NLP כי המשמעות היא לא רק "מה נאמר", אלא גם מה עוד לא נבדק.',
            example: '״הוא פשוט אדיש״ → מפרקים בין אדישות, עייפות, הימנעות, או חוסר כלים.'
        }),
        'prism-research': Object.freeze({
            familyLabel: 'Analysis',
            familyName: 'ניתוח',
            title: 'מחקר פריזמות',
            trail: ['בית', 'ניתוח', 'מחקר פריזמות'],
            summary: 'חקירה בשרשרת של מושגים ודפוסים עד שנבנית מפה עמוקה יותר של המשפט.',
            what: 'פותח את ההנחות שמתחבאות בתוך מילה או ציר משמעות אחד.',
            trains: 'חקירת עומק, מעבר בין שכבות, והרחבת אפשרויות קריאה.',
            when: 'כשרוצים לאתגר הנחה מרכזית בלי לקפוץ ישר לעימות.',
            why: 'מאפשר עבודה טיפולית עדינה: לא "להוכיח שהמטופל טועה", אלא להרחיב את המפה.',
            example: '״אם אני לא מושלם, אין לי ערך״ → בודקים איך המושגים "מושלם" ו"ערך" מחזיקים זה את זה.'
        }),
        'living-triples': Object.freeze({
            familyLabel: 'Practice',
            familyName: 'תרגול',
            title: 'שלשות חיות',
            trail: ['בית', 'תרגול', 'שלשות חיות'],
            summary: 'תרגול חי למשפחות ברין, עם רצף עבודה שמדגיש קרבה בין קטגוריות.',
            what: 'מאמן זיהוי משפחה ותבנית דרך שלשות חיות ולא רק דרך שם קטגוריה.',
            trains: 'הבחנה בתוך משפחות קרובות ושאלת המשך מותאמת.',
            when: 'כשרוצים להעמיק בעבודה עם טבלאות ברין בלי להישאר ברמת זיכרון.',
            why: 'המעבר ממשפחה לשאלה הוא לב העבודה הקלינית.',
            example: 'אותה אמירה יכולה לדרוש קודם בירור על השמטה, ורק אחר כך את שם התבנית המדויק.'
        }),
        'practice-verb-unzip-standalone': Object.freeze({
            familyLabel: 'Analysis',
            familyName: 'ניתוח',
            title: 'מאמן פועל לא מפורט',
            trail: ['בית', 'ניתוח', 'פועל לא מפורט'],
            summary: 'מסך שמתמקד בפעלים עמומים כמו "להסתדר" או "לטפל" ומחזיר אותם לפעולות בנות בדיקה.',
            what: 'מפרק מילה כללית לרצף פעולות, תנאים ומדדים.',
            trains: 'שאלת דיוק, פירוק לעשייה, והמרת כוונה כללית להתנהגות.',
            when: 'כששומעים פועל גדול מדי שאין דרך לדעת מה הוא אומר בפועל.',
            why: 'זו אחת המיומנויות השימושיות ביותר גם בטיפול וגם באימון ביצועי.',
            example: '״אני רוצה להסתדר איתו״ → מה תעשה/י בפועל? מה הוא יראה או ישמע?'
        }),
        'sentence-morpher': Object.freeze({
            familyLabel: 'Learning',
            familyName: 'למידה',
            title: 'מעבדת שינוי ניסוח',
            trail: ['בית', 'למידה', 'שינוי ניסוח'],
            summary: 'מעבדת ניסוח שמלמדת איך להזיז משפט בלי למחוק את הכוונה המקורית שלו.',
            what: 'בודקת חלופות ניסוח, עידון עוצמה, והעברה משפה כללית לשפה שמחזיקה יותר דיוק.',
            trains: 'שכתוב טיפולי, שמירה על כוונה, וגמישות לשונית.',
            when: 'כשכבר הבנו את הדפוס ועכשיו צריך לנסח אחרת.',
            why: 'היכולת לנסח מחדש היא הגשר בין אבחון לשינוי בפועל.',
            example: '״אף אחד לא מבין אותי״ → מחפשים ניסוח שעדיין שומר על החוויה אבל פותח אפשרות לשיחה.'
        }),
        'context-radar': Object.freeze({
            familyLabel: 'Therapist Tools',
            familyName: 'כלי מטפל',
            title: 'מכ"ם הקשר',
            trail: ['בית', 'כלי מטפל', 'מכ"ם הקשר'],
            summary: 'כלי מטפל למיפוי הקשר, תנאים ומרחב פעולה סביב משפט או דילמה.',
            what: 'מרחיב את המבט מהמשפט הבודד אל המסגרת שבה הוא נאמר ונחווה.',
            trains: 'עיגון הקשר, בדיקת תנאים, והימנעות מהסקה מהירה מדי.',
            when: 'כשברור שיש כאן יותר ממשפט אחד, וצריך להבין את המערכת שסביבו.',
            why: 'מטפלים צריכים לא רק דיוק לשוני אלא גם קריאת הקשר; אחרת השאלה נכונה תאורטית אך לא פוגשת את האדם.',
            example: 'לפני ששואלים "מי בדיוק?", בודקים גם באיזה מצב, עם מי, ובאיזו רמת איום זה קורה.'
        })
    });

    const STANDALONE_PATH_MAP = Object.freeze({
        '/scenario_trainer.html': 'scenario-trainer',
        '/classic_classic_trainer.html': 'classic-classic',
        '/classic2_trainer.html': 'classic2',
        '/iceberg_templates_trainer.html': 'iceberg-templates',
        '/prism_research_trainer.html': 'prism-research',
        '/living_triples_trainer.html': 'living-triples',
        '/verb_unzip_trainer.html': 'practice-verb-unzip-standalone',
        '/sentence_morpher_trainer.html': 'sentence-morpher',
        '/lab/context-radar/': 'context-radar',
        '/lab/context-radar/index.html': 'context-radar'
    });

    function escapeHtml(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function normalizePath(value) {
        const raw = String(value || '').trim();
        if (!raw) return '';
        try {
            const url = new URL(raw, global.location && global.location.href ? global.location.href : 'https://example.invalid/');
            const pathname = String(url.pathname || '/').replace(/\/{2,}/g, '/');
            return pathname === '/index.html' ? '/' : pathname;
        } catch (_error) {
            return raw;
        }
    }

    function getStandaloneKey() {
        const liveRoot = document.querySelector('[data-trainer-platform="1"][data-trainer-id]');
        if (liveRoot) {
            const trainerId = String(liveRoot.getAttribute('data-trainer-id') || '').trim();
            if (trainerId && FEATURE_META[trainerId]) return trainerId;
        }
        return STANDALONE_PATH_MAP[normalizePath(global.location && global.location.pathname)] || '';
    }

    function renderOrientation(meta, currentLabel, includeActions) {
        const trail = Array.isArray(meta.trail) ? meta.trail : ['בית', meta.familyName || '', meta.title || ''];
        const actionHtml = includeActions ? `
            <div class="product-orientation__actions">
                <button type="button" class="btn btn-secondary" data-product-guidance-action="home">חזרה לבית</button>
                <button type="button" class="btn btn-secondary" data-product-guidance-action="menu">${INLINE_MENU_BUTTON_TEXT}</button>
            </div>
        ` : '';
        return `
            <div class="product-orientation">
                <div class="product-orientation__copy">
                    <span class="product-orientation__kicker">${escapeHtml(meta.familyLabel || meta.familyName || '')}</span>
                    <div class="product-orientation__trail">${trail.map((item) => `<span>${escapeHtml(item)}</span>`).join('')}</div>
                    ${currentLabel ? `<span class="product-orientation__now">כעת: ${escapeHtml(currentLabel)}</span>` : ''}
                </div>
                ${actionHtml}
            </div>
        `;
    }

    function renderIntro(meta) {
        return `
            <div class="product-intro">
                <div class="product-intro__head">
                    <span class="product-intro__eyebrow">לפני שמתחילים</span>
                    <p>${escapeHtml(meta.summary || '')}</p>
                </div>
                <div class="product-intro__grid">
                    <div class="product-intro__item">
                        <strong>מה הכלי הזה עושה</strong>
                        <p>${escapeHtml(meta.what || '')}</p>
                    </div>
                    <div class="product-intro__item">
                        <strong>מה הוא מאמן</strong>
                        <p>${escapeHtml(meta.trains || '')}</p>
                    </div>
                    <div class="product-intro__item">
                        <strong>מתי משתמשים בו</strong>
                        <p>${escapeHtml(meta.when || '')}</p>
                    </div>
                    <div class="product-intro__item">
                        <strong>למה זה חשוב למטפל/ת או לסטודנט/ית ל-NLP</strong>
                        <p>${escapeHtml(meta.why || '')}</p>
                    </div>
                </div>
                <div class="product-intro__example">
                    <span>דוגמה קצרה</span>
                    ${escapeHtml(meta.example || '')}
                </div>
            </div>
        `;
    }

    function bindInlineActions(scope) {
        if (!scope) return;
        scope.querySelectorAll('[data-product-guidance-action]').forEach((button) => {
            if (button.dataset.productGuidanceBound === '1') return;
            button.dataset.productGuidanceBound = '1';
            button.addEventListener('click', () => {
                const action = String(button.getAttribute('data-product-guidance-action') || '').trim();
                if (action === 'home') {
                    if (typeof global.navigateTo === 'function') {
                        global.navigateTo('home');
                        return;
                    }
                    global.location.href = 'index.html';
                    return;
                }

                if (action === 'menu') {
                    const featureMap = document.getElementById('feature-map-toggle');
                    if (featureMap) {
                        featureMap.setAttribute('open', '');
                        featureMap.scrollIntoView({ block: 'start', behavior: 'smooth' });
                        return;
                    }
                    if (typeof global.navigateTo === 'function') {
                        global.navigateTo('home');
                        global.setTimeout(() => {
                            const nextFeatureMap = document.getElementById('feature-map-toggle');
                            if (!nextFeatureMap) return;
                            nextFeatureMap.setAttribute('open', '');
                            nextFeatureMap.scrollIntoView({ block: 'start', behavior: 'smooth' });
                        }, 60);
                    }
                }
            });
        });
    }

    // ── Idempotent DOM write: skip innerHTML if content unchanged ─────
    function upsertGuidanceBlock(container, featureKey, html, className) {
        if (!container) return null;
        let block = container.querySelector(`[data-product-guidance="${featureKey}"]`);
        if (!block) {
            block = document.createElement('section');
            block.setAttribute('data-product-guidance', featureKey);
            block.className = className;
            const subtitle = container.querySelector('.subtitle');
            if (subtitle && subtitle.parentElement === container) {
                subtitle.insertAdjacentElement('afterend', block);
            } else {
                const heading = container.querySelector('h1, h2, h3');
                if (heading && heading.parentElement === container) {
                    heading.insertAdjacentElement('afterend', block);
                } else {
                    container.insertBefore(block, container.firstChild || null);
                }
            }
            block.innerHTML = html;
            return block;
        }
        if (block.className !== className) {
            block.className = className;
        }
        // Only write innerHTML if content actually changed
        if (block.innerHTML !== html) {
            block.innerHTML = html;
        }
        return block;
    }

    function enhanceInlineFeatures() {
        Object.keys(FEATURE_META).forEach((featureKey) => {
            const meta = FEATURE_META[featureKey];
            if (!meta || !meta.containerSelector) return;
            const container = document.querySelector(meta.containerSelector);
            if (!container) return;
            const html = `${renderOrientation(meta, '', true)}${renderIntro(meta)}`;
            const block = upsertGuidanceBlock(container, featureKey, html, 'product-feature-guidance');
            bindInlineActions(block);
        });
    }

    function getStandaloneStateLabel(meta) {
        if (!meta || !meta.stateLabels) return '';
        const root = document.querySelector('[data-trainer-platform="1"][data-trainer-id]');
        const screenId = root ? String(root.getAttribute('data-screen') || '').trim() : '';
        return meta.stateLabels[screenId] || '';
    }

    function enhanceStandaloneFeature() {
        const featureKey = getStandaloneKey();
        const meta = FEATURE_META[featureKey];
        const nav = document.querySelector('.trainer-shell-nav');
        if (!meta || !nav || !nav.parentNode) return;
        let block = document.querySelector(`[data-product-guidance="${featureKey}"]`);
        if (!block) {
            block = document.createElement('section');
            block.setAttribute('data-product-guidance', featureKey);
            block.className = 'product-feature-guidance product-feature-guidance--standalone';
            nav.insertAdjacentElement('afterend', block);
        }
        const stateLabel = getStandaloneStateLabel(meta);
        const html = `${renderOrientation(meta, stateLabel, false)}${renderIntro(meta)}`;
        if (block.innerHTML !== html) {
            block.innerHTML = html;
        }
        // On standalone pages without dynamic state labels, stop observing after
        // the block is inserted — the orientation content never changes, so
        // continued observation only causes a mutation-storm loop.
        if (!meta.stateLabels) {
            if (observer) { observer.disconnect(); observer = null; }
            observerDisabled = true;
        }
    }

    function applyEnhancements(reason) {
        if (isApplying) return;
        isApplying = true;
        lastApplyReason = reason || 'unknown';
        var t0 = Date.now();
        console.log('[product-guidance] apply start reason=' + lastApplyReason);
        try {
            // Disconnect observer before DOM writes to prevent mutation storm
            if (observer) observer.disconnect();
            enhanceInlineFeatures();
            enhanceStandaloneFeature();
            console.log('[product-guidance] apply done duration=' + (Date.now() - t0) + 'ms');
        } catch (error) {
            console.error('[product-guidance] apply failed', error);
        } finally {
            isApplying = false;
            // Reconnect observer after DOM writes complete
            if (observer) {
                try { reconnectObserver(); } catch (_e) { /* ignore */ }
            }
        }
    }

    function scheduleApply(reason) {
        if (isScheduled) return;
        isScheduled = true;
        console.log('[product-guidance] scheduleApply reason=' + (reason || 'unknown'));
        global.requestAnimationFrame(function () {
            isScheduled = false;
            applyEnhancements(reason);
        });
    }

    function reconnectObserver() {
        if (!observer) return;
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class', 'data-screen', 'hidden', 'open']
        });
    }

    function boot() {
        console.log('[product-guidance] boot');
        // Initial synchronous apply (no observer yet, safe)
        applyEnhancements('boot');

        // Set up observer with storm protection (skip on standalone-only pages)
        if (observerDisabled) return;
        observer = new MutationObserver(function (mutations) {
            // Mutation storm detection
            var now = Date.now();
            if (now - mutationWindowStart > 1000) {
                mutationCount = 0;
                mutationWindowStart = now;
            }
            mutationCount += mutations.length;
            if (mutationCount > MUTATION_STORM_THRESHOLD) {
                console.warn('[product-guidance] mutation storm detected: ' + mutationCount + ' mutations in 1s, skipping');
                return;
            }
            scheduleApply('observer');
        });
        reconnectObserver();
    }

    global.MetaProductGuidance = Object.freeze({
        FEATURE_META,
        apply: applyEnhancements
    });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot, { once: true });
    } else {
        boot();
    }

    console.log('[product-guidance] module loaded');
})(typeof window !== 'undefined' ? window : globalThis);
