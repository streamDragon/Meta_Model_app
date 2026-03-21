(function attachPrismLogicalLevelsMap(global, document) {
    'use strict';

    if (!global || !document) return;

    const ROOT_SELECTOR = '[data-prism-necessity-app]';
    const STYLE_PATH = 'css/prism-necessity.css';
    const DATA_SOURCE = 'data/prism-necessity.json';
    const STANDALONE_PAGE = '/prism_lab_trainer.html';
    const FONT_STYLESHEET =
        'https://fonts.googleapis.com/css2?family=Frank+Ruhl+Libre:wght@500;700&family=Noto+Sans+Hebrew:wght@300;400;500;700;800&display=swap';

    const FAMILY_ORDER = Object.freeze(['deletion', 'generalization', 'distortion']);
    const DISPLAY_LEVEL_ORDER = Object.freeze([
        'beyond_self',
        'identity',
        'beliefs',
        'capabilities',
        'behavior',
        'environment'
    ]);
    const LEVEL_WIDTHS = Object.freeze({
        beyond_self: '46%',
        identity: '58%',
        beliefs: '70%',
        capabilities: '82%',
        behavior: '92%',
        environment: '100%'
    });

    const FAMILY_META = Object.freeze({
        deletion: Object.freeze({
            id: 'deletion',
            label: 'מחיקות',
            shortLabel: 'מחיקות',
            description: 'מידע שנעלם מהמשפט',
            color: '#B85C38',
            soft: 'rgba(184, 92, 56, 0.11)'
        }),
        generalization: Object.freeze({
            id: 'generalization',
            label: 'הכללות',
            shortLabel: 'הכללות',
            description: 'מקרה אחד שהפך לחוק',
            color: '#2D6A4F',
            soft: 'rgba(45, 106, 79, 0.11)'
        }),
        distortion: Object.freeze({
            id: 'distortion',
            label: 'עיוותים',
            shortLabel: 'עיוותים',
            description: 'המציאות עברה סידור מחדש',
            color: '#5C4B99',
            soft: 'rgba(92, 75, 153, 0.11)'
        })
    });

    const LEVEL_META = Object.freeze({
        environment: Object.freeze({
            id: 'environment',
            label: 'סביבה',
            shortLabel: 'סביבה',
            question: 'איפה, מתי ועם מי זה קורה?',
            color: '#9C8269'
        }),
        behavior: Object.freeze({
            id: 'behavior',
            label: 'התנהגויות',
            shortLabel: 'התנהגויות',
            question: 'מה קורה בפועל?',
            color: '#8D9C70'
        }),
        capabilities: Object.freeze({
            id: 'capabilities',
            label: 'יכולות ומיומנויות',
            shortLabel: 'יכולות',
            question: 'מה אפשר לעשות או ללמוד כאן?',
            color: '#6F968B'
        }),
        beliefs: Object.freeze({
            id: 'beliefs',
            label: 'ערכים ואמונות',
            shortLabel: 'אמונות',
            question: 'למה זה מרגיש נכון, הכרחי או מחייב?',
            color: '#7C7598'
        }),
        identity: Object.freeze({
            id: 'identity',
            label: 'זהות',
            shortLabel: 'זהות',
            question: 'מי אני בתוך הסיפור הזה?',
            color: '#9B6F78'
        }),
        beyond_self: Object.freeze({
            id: 'beyond_self',
            label: 'למען מי?',
            shortLabel: 'מעבר לעצמי',
            question: 'לשם מה זה שייך למשהו רחב יותר?',
            color: '#B68B64'
        })
    });

    const LEVEL_ORDER_INDEX = Object.freeze(
        DISPLAY_LEVEL_ORDER.reduce((acc, levelId, index) => {
            acc[levelId] = DISPLAY_LEVEL_ORDER.length - index;
            return acc;
        }, {})
    );

    const PATTERN_CATALOG = Object.freeze([
        Object.freeze({ id: 'simple_deletion', family: 'deletion', title: 'מחיקה פשוטה', difficulty: 'basic', concept: 'חלק מהמשפט חסר, כך שמידע קריטי נשמט מן התמונה.', keyQuestion: 'מה בדיוק?' }),
        Object.freeze({ id: 'unspecified_verb', family: 'deletion', title: 'פועל לא מפורט', difficulty: 'basic', concept: 'הפעולה מתוארת באופן כללי, בלי לגלות איך היא קורית בפועל.', keyQuestion: 'איך בדיוק?' }),
        Object.freeze({ id: 'comparative_deletion', family: 'deletion', title: 'השוואה חסרה', difficulty: 'advanced', concept: 'יש שיפוט או מדידה, אבל ציר ההשוואה עצמו נשאר חסר.', keyQuestion: 'בהשוואה למה?' }),
        Object.freeze({ id: 'lost_referential_index', family: 'deletion', title: 'חוסר ייחוס', difficulty: 'advanced', concept: 'מישהו, אנשים, הם, זה. הסיפור מדבר על גורם לא מוגדר.', keyQuestion: 'מי בדיוק?' }),
        Object.freeze({ id: 'universal_quantifier', family: 'generalization', title: 'כמת כולל', difficulty: 'basic', concept: 'תמיד, אף פעם, כולם. חריגים נעלמים והמשפט נשמע כמו חוק.', keyQuestion: 'באמת תמיד?' }),
        Object.freeze({ id: 'modal_operator', family: 'generalization', title: 'אופרטור מודלי', difficulty: 'basic', concept: 'חייב, אסור, אי אפשר. גבולות פנימיים מוצגים כאילו היו טבע.', keyQuestion: 'מה יקרה אם כן?' }),
        Object.freeze({ id: 'lost_performative', family: 'generalization', title: 'שיפוט מרוחק', difficulty: 'advanced', concept: 'שיפוט נשמע כמו אמת כללית, בלי מקור, קריטריון או בעל קול.', keyQuestion: 'מי אמר?' }),
        Object.freeze({ id: 'nominalization', family: 'distortion', title: 'שם עצם מופשט', difficulty: 'basic', concept: 'תהליך חי קופא למילה, כאילו אין בו תנועה, זמן או בחירה.', keyQuestion: 'איך זה נראה כשזה עובד?' }),
        Object.freeze({ id: 'cause_effect', family: 'distortion', title: 'סיבה ותוצאה', difficulty: 'basic', concept: 'X גורם ל-Y, בלי לראות את השרשרת, התנאים או התרגום שבאמצע.', keyQuestion: 'איך X גורם ל-Y?' }),
        Object.freeze({ id: 'mind_reading', family: 'distortion', title: 'קריאת מחשבות', difficulty: 'advanced', concept: 'המשפט מציג ידיעה על מחשבה, כוונה או עמדה של האחר.', keyQuestion: 'איך אתה יודע?' }),
        Object.freeze({ id: 'complex_equivalence', family: 'distortion', title: 'שקילות מורכבת', difficulty: 'advanced', concept: 'דבר אחד מתורגם למשמעות אחרת כאילו אלה אותו הדבר.', keyQuestion: 'האם X באמת אומר Y?' }),
        Object.freeze({ id: 'presupposition', family: 'distortion', title: 'הנחות מוקדמות', difficulty: 'advanced', concept: 'בתוך המשפט כבר מתחבאת הנחה סמויה שמארגנת את הסיפור.', keyQuestion: 'מה ההנחה הסמויה?' })
    ]);

    const PATTERN_IMAGE_BASE = '/feature/assets/prismlab/';

    const PATTERN_IMAGE_MAP = Object.freeze({
        simple_deletion: 'book-simple-deletion.webp',
        unspecified_verb: 'book-unspecified-verb.webp',
        comparative_deletion: 'book-comparison-deletion.webp',
        lost_referential_index: 'book-lack-referential.webp',
        universal_quantifier: 'book-universal-quantifier.webp',
        modal_operator: 'book-modal-operator.webp',
        lost_performative: 'book-lost-performative.webp',
        nominalization: 'book-nominalization.webp',
        cause_effect: 'book-cause-effect.webp',
        mind_reading: 'book-mind-reading.webp',
        complex_equivalence: 'book-complex-equivalence.webp',
        presupposition: 'book-presupposition.webp'
    });

    const PATTERN_ID_ALIASES = Object.freeze({
        simple_deletion: 'simple_deletion',
        unspecified_verb: 'unspecified_verb',
        unspecified_verbs: 'unspecified_verb',
        comparison: 'comparative_deletion',
        comparative_deletion: 'comparative_deletion',
        comparisons: 'comparative_deletion',
        lost_referential_index: 'lost_referential_index',
        lack_referential_index: 'lost_referential_index',
        universal_quantifier: 'universal_quantifier',
        universal_quantifiers: 'universal_quantifier',
        modal_operator: 'modal_operator',
        modal_operators_action: 'modal_operator',
        lost_performative: 'lost_performative',
        nominalization: 'nominalization',
        cause_effect: 'cause_effect',
        mind_reading: 'mind_reading',
        complex_equivalence: 'complex_equivalence',
        presupposition: 'presupposition',
        presuppositions: 'presupposition'
    });

    const PATTERN_IDS = Object.freeze(PATTERN_CATALOG.map((pattern) => pattern.id));

    const INTRO_DIALOG = Object.freeze({
        teaser: 'הייתם רוצים את הכוח הזה בחדר הטיפולי? לחצו לדוגמה קצרה',
        title: 'דוגמה קצרה: איך מיפוי רמות לוגיות פותח כיוון טיפולי חדש',
        clientLine: 'אין בינינו תקשורת. פשוט אין. זה מת.',
        classicLine: 'בגישה הרגילה היינו עוצרים ב: "מה בדיוק חסר בתקשורת?"',
        levels: Object.freeze([
            Object.freeze({ levelId: 'environment', question: 'איפה ה"אין תקשורת" הזה קורה הכי חזק? האם יש מקומות שבהם זה אחרת?', answer: 'בעיקר בבית, בערבים. בעבודה דווקא אנחנו מדברים רגיל.' }),
            Object.freeze({ levelId: 'behavior', question: 'מה כל אחד מכם עושה בפועל כשמנסים לדבר?', answer: 'אני מתחיל לדבר והיא ישר בטלפון או עוברת לדבר על משהו אחר.' }),
            Object.freeze({ levelId: 'capabilities', question: 'היה פעם זמן שכן ידעתם לדבר? מה היה שם אחרת?', answer: 'בהתחלה ישבנו שעות. ידענו להקשיב.' }),
            Object.freeze({ levelId: 'beliefs', question: 'מה צריך לקרות כדי שתרגיש שיש ביניכם תקשורת?', answer: 'שמישהו באמת ירצה לשמוע, בלי שזה ירגיש כמו חובה.' }),
            Object.freeze({ levelId: 'identity', question: 'כשאתה אומר "אין תקשורת" - מי אתה בתוך הסיפור הזה?', answer: 'מישהו שלא שווה להקשיב לו.' })
        ]),
        core: 'הגרעין: ברמת הזהות הסיפור מחזיק על "אני מישהו שלא שווה להקשיב לו".',
        crack: 'הסדק: ברמת היכולות יש עדות לכך שהיכולת לדבר ולהקשיב קיימת, רק לא נגישה כרגע.',
        punch: 'הפאנץ׳: אם ידעתם פעם להקשיב - והיכולת עדיין קיימת - מה צריך להשתנות כדי שהיא תחזור?',
        closing: 'זה הכוח שתרכשו כאן: היכולת לראות מעבר למשפט, אל המבנה השלם.'
    });

    const FALLBACK_SESSIONS = Object.freeze([
        Object.freeze({
            id: 'fallback-simple-deletion',
            category: 'simple_deletion',
            sentence: 'אני כבר לא מקבל את מה שאני צריך',
            sideA_label: 'מה קורה בחוץ',
            sideB_label: 'מה נהיה בפנים',
            questions: Object.freeze([
                Object.freeze({ level: 'environment', side: 'a', question: 'מתי המשפט הזה עולה הכי חזק?', answer: 'אחרי שיחות בערב, כשאני מבקש עזרה והנושא מיד זז ללוגיסטיקה.', score: 3 }),
                Object.freeze({ level: 'environment', side: 'b', question: 'איפה את/ה מרגיש/ה את ה"לא מקבל"?', answer: 'בבית, ליד השולחן, בדיוק כשאני צריך להרגיש שמישהו עוצר איתי רגע.', score: 3 }),
                Object.freeze({ level: 'behavior', side: 'a', question: 'מה קורה בפועל במקום לקבל את מה שצריך?', answer: 'אני אומר שאני מותש, ומיד מקבלים תשובה מהירה או פתרון, בלי להישאר איתי.', score: 4 }),
                Object.freeze({ level: 'behavior', side: 'b', question: 'ומה את/ה עושה אז?', answer: 'מהנהן כאילו זה בסדר, ואז נסגר ונשאר עם טינה בפנים.', score: 4 }),
                Object.freeze({ level: 'capability_strategy', side: 'a', question: 'מה לא נבנה שם ברמת היכולת?', answer: 'היכולת לעצור, לדייק ולשאול מה בעצם אני מבקש ברגע הזה.', score: 2 }),
                Object.freeze({ level: 'capability_strategy', side: 'b', question: 'איזו יכולת נעלמת ממך שם?', answer: 'היכולת להגיד את הצורך שלי בלי להתנצל עליו או להקטין אותו.', score: 2 }),
                Object.freeze({ level: 'beliefs_values', side: 'a', question: 'מה חייב לקרות כדי שתרגיש/י שאת/ה "מקבל/ת"?', answer: 'שמישהו יקשיב עד הסוף, בלי למהר לפתור או לעבור הלאה.', score: 4 }),
                Object.freeze({ level: 'beliefs_values', side: 'b', question: 'איזו אמונה הופכת את החסר הזה לכל כך צורב?', answer: 'שאם אני צריך לבקש פעמיים, כנראה שאני לא באמת חשוב.', score: 5 }),
                Object.freeze({ level: 'identity', side: 'a', question: 'מי האחר נהיה בסיפור הזה?', answer: 'מישהו שמחליט אם יש לי מקום לצרכים שלי או לא.', score: 4 }),
                Object.freeze({ level: 'identity', side: 'b', question: 'ומי את/ה נהיה/ית מולו?', answer: 'מישהו שצריך להוכיח שהצורך שלו מוצדק.', score: 5 }),
                Object.freeze({ level: 'belonging_mission', side: 'a', question: 'למה הסצנה הזו שייכת לרמה עמוקה יותר?', answer: 'לשאלה האם בקשר הזה יש בכלל מקום לצרכים אנושיים ופשוטים.', score: 3 }),
                Object.freeze({ level: 'belonging_mission', side: 'b', question: 'מה מונח על הכף אם זה באמת כך?', answer: 'שאני אתחיל להאמין שאין טעם לבקש קרבה, כי ממילא לא יישארו איתי שם.', score: 4 })
            ]),
            core: 'identity',
            crack: 'capability_strategy',
            reflectCore: 'כשהדבר החסר נשאר מחוק, זה כבר לא נשמע כמו צורך רגעי אלא כמו עדות לזה שאין לך באמת מקום לבקש. שם הסיפור מחזיק.',
            reflectCrack: 'ובכל זאת, ברמת היכולת יש פתח: אתה כבר מרגיש שיש משהו מדויק שחסר, ורק עוד לא ניתנה לו שפה רגועה וברורה.',
            punchQ: 'אם היה מותר לך לדייק בלי להתנצל, מה היית מבקש עכשיו במילים פשוטות?',
            punchA: '[נשימה] ...שיישבו איתי שתי דקות לפני שקופצים לפתור. רק שישמעו.'
        }),
        Object.freeze({
            id: 'fallback-lost-referential-index',
            category: 'lost_referential_index',
            sentence: 'הם פשוט נגדי כאן',
            sideA_label: 'ה"הם" המעורפל',
            sideB_label: 'אני מול ה"הם"',
            questions: Object.freeze([
                Object.freeze({ level: 'environment', side: 'a', question: 'איפה בדיוק עולה ה"הם" הזה?', answer: 'בעבודה, בעיקר בישיבות שבועיות כשכמה אנשים בחדר נראים קרים.', score: 3 }),
                Object.freeze({ level: 'environment', side: 'b', question: 'מה קורה סביבך כשאתה אומר "הם נגדי"?', answer: 'אני נכנס דרוך, וכל מבט נראה לי כמו סימן אזהרה.', score: 3 }),
                Object.freeze({ level: 'behavior', side: 'a', question: 'מי עשה מה בפועל לפני שנהיה "הם"?', answer: 'שני מנהלים העירו על הדוח, ועוד קולגה אחת פשוט שתקה.', score: 4 }),
                Object.freeze({ level: 'behavior', side: 'b', question: 'ומה אתה עושה אז?', answer: 'מדבר פחות, מתכווץ, ואוסף בשקט הוכחות לזה שיש נגדי מחנה.', score: 4 }),
                Object.freeze({ level: 'capability_strategy', side: 'a', question: 'מה נאבד כשהכול נהיה "הם" אחד גדול?', answer: 'אי אפשר לראות מי באמת ביקורתי, מי ניטרלי ומי בכלל לא קשור לסיפור.', score: 2 }),
                Object.freeze({ level: 'capability_strategy', side: 'b', question: 'איזו יכולת נעלמת ממך שם?', answer: 'היכולת לבדוק מול אדם אחד, במקום להילחם בקבוצה דמיונית.', score: 2 }),
                Object.freeze({ level: 'beliefs_values', side: 'a', question: 'איזה כלל מופעל כשכמה פרצופים נהיים "הם"?', answer: 'שאם כמה אנשים נראים לא נוחים, כנראה יש כאן מחנה נגדי.', score: 4 }),
                Object.freeze({ level: 'beliefs_values', side: 'b', question: 'איזו אמונה הופכת את זה לכל כך ודאי?', answer: 'שאני חייב לזהות מהר סכנה חברתית כדי לא להיות מושפל שוב.', score: 5 }),
                Object.freeze({ level: 'identity', side: 'a', question: 'מי "הם" נהיים בסיפור הזה?', answer: 'מערכת אחת שסוגרת עליי ולא באמת רוצה אותי בפנים.', score: 4 }),
                Object.freeze({ level: 'identity', side: 'b', question: 'ומי אתה נהיה מולה?', answer: 'הבחור שתמיד צריך להתגונן לפני שקורה משהו רע.', score: 5 }),
                Object.freeze({ level: 'belonging_mission', side: 'a', question: 'למה ה"הם" הזה שייך לרמה עמוקה יותר?', answer: 'לשאלה אם העולם החברתי הוא מקום שאפשר לסמוך עליו או רק להיזהר ממנו.', score: 4 }),
                Object.freeze({ level: 'belonging_mission', side: 'b', question: 'מה מונח על הכף אם זה נכון?', answer: 'שאין לי באמת מקום בטוח באף צוות ושאני תמיד בחוץ.', score: 4 })
            ]),
            core: 'identity',
            crack: 'capability_strategy',
            reflectCore: 'ברגע שהסיפור עובר מ"אנשים מסוימים אמרו משהו" ל"הם נגדי", אתה כבר לא מול אירועים אלא מול מערכת שלמה שסוגרת עליך. שם האחיזה חזקה.',
            reflectCrack: 'ועדיין, ברמת היכולת יש פתח: אתה כבר יכול לראות שהכול התערבב לגוש אחד. עצם הזיהוי הזה אומר שאפשר לפרק מחדש לאנשים, ראיות והקשרים.',
            punchQ: 'אם נפריד עכשיו בין מי שבאמת אמר משהו, מי ששתק ומי בכלל לא היה שם - מה ישתנה בתמונה?',
            punchA: 'זה כבר פחות "הם". יש שם שני אנשים, לא מחנה שלם.'
        }),
        Object.freeze({
            id: 'fallback-presupposition',
            category: 'presupposition',
            sentence: 'איך אני מפסיק לאכזב את כולם?',
            sideA_label: 'ההנחה בתוך השאלה',
            sideB_label: 'אני שנושא את ההנחה',
            questions: Object.freeze([
                Object.freeze({ level: 'environment', side: 'a', question: 'מתי השאלה הזו עולה הכי חזק?', answer: 'אחרי ארוחות משפחתיות, כשאני יוצא משם מותש ומלא אשמה.', score: 3 }),
                Object.freeze({ level: 'environment', side: 'b', question: 'מה קורה סביבך כשאתה שומע "אני מאכזב את כולם"?', answer: 'אני עובר בראש אחד אחד ומרגיש שכבר הפסדתי עוד לפני שבדקתי.', score: 3 }),
                Object.freeze({ level: 'behavior', side: 'a', question: 'מה קרה בפועל לפני שהשאלה הופיעה?', answer: 'אמא אמרה שחבל שלא באתי מוקדם, ואחותי זרקה הערה קטנה על זה שנעלמתי.', score: 4 }),
                Object.freeze({ level: 'behavior', side: 'b', question: 'ומה אתה עושה אז?', answer: 'מתנצל, מבטיח יותר, ואז שוב לא עומד במה שהבטחתי.', score: 4 }),
                Object.freeze({ level: 'capability_strategy', side: 'a', question: 'מה ההנחה הסמויה עושה לקריאת המצב?', answer: 'היא מדלגת ישר למסקנה שכבר אכזבתי, בלי לבדוק מי התאכזב, ממה ובאיזה היקף.', score: 2 }),
                Object.freeze({ level: 'capability_strategy', side: 'b', question: 'איזו יכולת נעלמת ממך שם?', answer: 'להבחין בין מישהו אחד שמתאכזב ברגע מסוים לבין "כולם" שאני אחראי עליהם.', score: 2 }),
                Object.freeze({ level: 'beliefs_values', side: 'a', question: 'איזה כלל עומד מאחורי השאלה?', answer: 'שאם מישהו מעיר או נפגע, כנראה נכשלתי בו.', score: 4 }),
                Object.freeze({ level: 'beliefs_values', side: 'b', question: 'איזו אמונה גורמת לזה להרגיש מובן מאליו?', answer: 'שאני אחראי להחזיק את כולם מרוצים כדי להישאר שייך.', score: 5 }),
                Object.freeze({ level: 'identity', side: 'a', question: 'מי האחרים נהיים בסיפור הזה?', answer: 'ועדת בדיקה שמודדת כל הזמן אם אני מספיק או שוב מאכזב.', score: 4 }),
                Object.freeze({ level: 'identity', side: 'b', question: 'ומי אתה נהיה מול ההנחה הזו?', answer: 'האדם שמאכזב מעצם זה שהוא לא מצליח להחזיק את כולם.', score: 5 }),
                Object.freeze({ level: 'belonging_mission', side: 'a', question: 'למה השאלה הזו שייכת לרמה עמוקה יותר?', answer: 'לשייכות המשפחתית ולשאלה אם מותר לי להיות אני בלי לרצות את כולם.', score: 4 }),
                Object.freeze({ level: 'belonging_mission', side: 'b', question: 'מה מונח על הכף אם זה נכון?', answer: 'שאם אני לא מרצה מספיק - אני פחות שייך, פחות טוב ופחות אהוב.', score: 4 })
            ]),
            core: 'beliefs_values',
            crack: 'capability_strategy',
            reflectCore: 'ההנחה לא רק אומרת שמישהו התאכזב; היא בונה חוק פנימי שלפיו האחריות שלך היא לא לאכזב אף אחד. בתוך החוק הזה, כל הערה נהיית הוכחה.',
            reflectCrack: 'ובכל זאת, ברמת היכולת יש פתח: אתה כבר מסוגל לשמוע שיש הנחה בתוך השאלה. זה אומר שאפשר להתחיל להפריד בין הנחה לעובדה.',
            punchQ: 'אם נחליף לרגע את "איך אני מפסיק לאכזב את כולם?" ב"מי התאכזב ממה, ובאיזה היקף?" - מה יקרה?',
            punchA: 'זה מצטמצם. זה לא כולם, וזה לא על הכול.'
        })
    ]);

    function escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function normalizeText(value) {
        return String(value ?? '').replace(/\s+/g, ' ').trim();
    }

    function normalizeDifficulty(value) {
        return String(value || '').toLowerCase() === 'advanced' ? 'advanced' : 'basic';
    }

    function difficultyLabel(value) {
        return normalizeDifficulty(value) === 'advanced' ? 'מתקדם' : 'בסיסי';
    }

    function normalizeScore(value) {
        const numeric = Number(value);
        if (!Number.isFinite(numeric)) return 3;
        return Math.max(1, Math.min(5, Math.round(numeric)));
    }

    function normalizePatternId(value) {
        const normalized = normalizeText(value).toLowerCase();
        if (!normalized) return '';
        return PATTERN_ID_ALIASES[normalized] || (PATTERN_IDS.includes(normalized) ? normalized : '');
    }

    function normalizeLevel(value) {
        const normalized = normalizeText(value).toLowerCase();
        if (normalized === 'beliefs_values' || normalized === 'values_beliefs') return 'beliefs';
        if (normalized === 'capability_strategy' || normalized === 'capability' || normalized === 'capabilities') return 'capabilities';
        if (normalized === 'belonging_mission' || normalized === 'purpose_meaning' || normalized === 'beyond_self') return 'beyond_self';
        if (normalized === 'environment' || normalized === 'behavior' || normalized === 'identity') return normalized;
        return 'behavior';
    }

    function levelSortIndex(levelId) {
        const normalized = normalizeLevel(levelId);
        return LEVEL_ORDER_INDEX[normalized] || 0;
    }

    function sortQuestions(left, right) {
        const levelDiff = levelSortIndex(left.levelId) - levelSortIndex(right.levelId);
        if (levelDiff !== 0) return levelDiff;
        return (left.side === 'a' ? 0 : 1) - (right.side === 'a' ? 0 : 1);
    }

    function resolveAssetPath(filePath) {
        if (typeof global.__withAssetVersion === 'function') {
            try {
                return global.__withAssetVersion(filePath);
            } catch (_error) {
                return filePath;
            }
        }
        const version = String(global.__META_MODEL_ASSET_V__ || global.__PRISM_LAB_ASSET_V__ || '').trim();
        if (!version) return filePath;
        return `${filePath}${filePath.includes('?') ? '&' : '?'}v=${encodeURIComponent(version)}`;
    }

    function ensureFonts() {
        if (document.querySelector('link[data-prism-logical-fonts="true"]')) return;
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = FONT_STYLESHEET;
        link.setAttribute('data-prism-logical-fonts', 'true');
        document.head.appendChild(link);
    }

    function ensureStylesheet() {
        if (document.querySelector('link[data-prism-necessity-style="true"]')) return;
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = resolveAssetPath(STYLE_PATH);
        link.setAttribute('data-prism-necessity-style', 'true');
        document.head.appendChild(link);
    }

    async function fetchJson(sourcePath) {
        const response = await fetch(resolveAssetPath(sourcePath), { cache: 'force-cache' });
        if (!response.ok) {
            throw new Error(`Failed to load ${sourcePath}: HTTP ${response.status}`);
        }
        return response.json();
    }

    function buildRows(questions) {
        const rowsByLevel = DISPLAY_LEVEL_ORDER.reduce((acc, levelId) => {
            acc[levelId] = { levelId, a: null, b: null };
            return acc;
        }, {});

        questions.forEach((question) => {
            if (!rowsByLevel[question.levelId]) return;
            rowsByLevel[question.levelId][question.side] = question;
        });

        return DISPLAY_LEVEL_ORDER.map((levelId) => rowsByLevel[levelId]);
    }

    function mapQuestion(rawQuestion, fallbackIndex) {
        const question = normalizeText(rawQuestion?.question);
        const answer = normalizeText(rawQuestion?.answer);
        if (!question || !answer) return null;
        return {
            id: `${normalizeLevel(rawQuestion?.level)}-${String(rawQuestion?.side || 'a').toLowerCase()}-${fallbackIndex + 1}`,
            side: String(rawQuestion?.side || '').toLowerCase() === 'b' ? 'b' : 'a',
            levelId: normalizeLevel(rawQuestion?.level),
            question,
            answer,
            score: normalizeScore(rawQuestion?.score),
            orderIndex: fallbackIndex
        };
    }

    function mapSession(rawSession, fallbackIndex) {
        const patternId = normalizePatternId(rawSession?.patternId || rawSession?.category);
        if (!patternId) return null;

        const questions = (Array.isArray(rawSession?.questions) ? rawSession.questions : [])
            .map((entry, questionIndex) => mapQuestion(entry, questionIndex))
            .filter(Boolean)
            .sort(sortQuestions)
            .map((question, orderIndex) => ({ ...question, orderIndex }));

        if (!questions.length) return null;

        return {
            id: normalizeText(rawSession?.id) || `${patternId}-${fallbackIndex + 1}`,
            patternId,
            sentence: normalizeText(rawSession?.sentence) || normalizeText(rawSession?.keyPhrase) || 'משפט לדוגמה',
            sideALabel: normalizeText(rawSession?.sideA_label) || 'מה קורה בחוץ',
            sideBLabel: normalizeText(rawSession?.sideB_label) || 'מה נהיה בפנים',
            questions,
            rows: buildRows(questions),
            core: normalizeLevel(rawSession?.core),
            crack: normalizeLevel(rawSession?.crack),
            reflectCore: normalizeText(rawSession?.reflectCore),
            reflectCrack: normalizeText(rawSession?.reflectCrack),
            punchQuestion: normalizeText(rawSession?.punchQ),
            punchAnswer: normalizeText(rawSession?.punchA)
        };
    }

    let payloadPromise = null;
    let payloadCache = null;

    async function loadPayload() {
        if (payloadCache) return payloadCache;
        if (payloadPromise) return payloadPromise;

        payloadPromise = fetchJson(DATA_SOURCE)
            .then((rawPayload) => {
                const sessionsByPattern = Object.create(null);
                PATTERN_CATALOG.forEach((pattern) => {
                    sessionsByPattern[pattern.id] = [];
                });

                (Array.isArray(rawPayload) ? rawPayload : [])
                    .map((rawSession, index) => mapSession(rawSession, index))
                    .filter(Boolean)
                    .forEach((session) => {
                        sessionsByPattern[session.patternId].push(session);
                    });

                FALLBACK_SESSIONS
                    .map((rawSession, index) => mapSession(rawSession, index))
                    .filter(Boolean)
                    .forEach((session) => {
                        if (!sessionsByPattern[session.patternId].length) {
                            sessionsByPattern[session.patternId].push(session);
                        }
                    });

                const patterns = PATTERN_CATALOG.map((pattern) => Object.freeze({
                    ...pattern,
                    difficulty: normalizeDifficulty(pattern.difficulty),
                    sessionCount: (sessionsByPattern[pattern.id] || []).length,
                    sampleSentence: sessionsByPattern[pattern.id]?.[0]?.sentence || ''
                }));

                const patternsById = patterns.reduce((acc, pattern) => {
                    acc[pattern.id] = pattern;
                    return acc;
                }, Object.create(null));

                payloadCache = Object.freeze({
                    patterns,
                    patternsById,
                    sessionsByPattern
                });
                return payloadCache;
            })
            .finally(() => {
                payloadPromise = null;
            });

        return payloadPromise;
    }

    function wrapIndex(index, total) {
        if (!total) return 0;
        const numeric = Number(index) || 0;
        return ((numeric % total) + total) % total;
    }

    function readInitialRouteState() {
        try {
            const url = new URL(global.location.href);
            const parseInteger = (key) => {
                const numeric = Number(url.searchParams.get(key));
                return Number.isInteger(numeric) ? numeric : null;
            };

            const rawStage = normalizeText(url.searchParams.get('pnmStage')).toLowerCase();
            const rawMode = normalizeText(url.searchParams.get('pnmMode')).toLowerCase();

            let stage = 'landing';
            if (rawStage === 'select' || rawStage === 'categories') stage = 'categories';
            if (rawStage === 'towers' || rawStage === 'workspace' || rawStage === 'preview' || rawStage === 'exercise') stage = 'workspace';

            let workspaceMode = rawMode === 'exercise' ? 'exercise' : 'preview';
            if (rawStage === 'towers' || rawStage === 'exercise') workspaceMode = 'exercise';

            return {
                stage,
                workspaceMode,
                patternId: normalizePatternId(url.searchParams.get('pnmPattern') || url.searchParams.get('pnmCategory')),
                sessionIndex: parseInteger('pnmSession'),
                revealedCount: parseInteger('pnmStep'),
                insightOpen: url.searchParams.get('pnmInsight') === '1'
            };
        } catch (_error) {
            return null;
        }
    }

    function copyBuildQueryParams(sourceUrl, targetUrl) {
        ['v', 't'].forEach((key) => {
            const value = sourceUrl.searchParams.get(key);
            if (value) targetUrl.searchParams.set(key, value);
        });
    }

    function buildStandaloneWindowUrl(state) {
        try {
            const currentUrl = new URL(global.location.href);
            const targetUrl = new URL(STANDALONE_PAGE, currentUrl.origin);
            copyBuildQueryParams(currentUrl, targetUrl);

            targetUrl.searchParams.set('pnmStage', state.stage);
            if (state.selectedPatternId) targetUrl.searchParams.set('pnmCategory', state.selectedPatternId);
            if (state.stage === 'workspace') targetUrl.searchParams.set('pnmMode', state.workspaceMode);
            if (Number.isInteger(state.sessionIndex) && state.sessionIndex > 0) {
                targetUrl.searchParams.set('pnmSession', String(state.sessionIndex));
            }
            if (Number.isInteger(state.revealedCount) && state.revealedCount > 0) {
                targetUrl.searchParams.set('pnmStep', String(state.revealedCount));
            }
            if (state.insightOpen) targetUrl.searchParams.set('pnmInsight', '1');
            return targetUrl.toString();
        } catch (_error) {
            return STANDALONE_PAGE;
        }
    }

    function buildStandaloneWindowFeatures() {
        const screenRef = global.screen || {};
        const availWidth = Number(screenRef.availWidth) || 1440;
        const availHeight = Number(screenRef.availHeight) || 1020;
        const availLeft = Number(screenRef.availLeft) || 0;
        const availTop = Number(screenRef.availTop) || 0;
        const width = Math.max(1120, Math.min(1480, availWidth - 56));
        const height = Math.max(820, Math.min(1040, availHeight - 64));
        const left = Math.max(availLeft, Math.round(availLeft + ((availWidth - width) / 2)));
        const top = Math.max(availTop, Math.round(availTop + ((availHeight - height) / 2)));
        return [
            'popup=yes',
            'resizable=yes',
            'scrollbars=yes',
            `width=${Math.round(width)}`,
            `height=${Math.round(height)}`,
            `left=${left}`,
            `top=${top}`
        ].join(',');
    }

    function openWindowedMode(state) {
        const url = buildStandaloneWindowUrl(state);
        if (typeof global.open === 'function') {
            const opened = global.open(url, 'meta-model-logical-levels-map', buildStandaloneWindowFeatures());
            if (opened) {
                if (typeof opened.focus === 'function') opened.focus();
                return true;
            }
        }
        if (global.location && typeof global.location.assign === 'function') {
            global.location.assign(url);
            return true;
        }
        return false;
    }

    function createState(root) {
        return {
            root,
            mode: root.getAttribute('data-prism-necessity-mode') || 'embedded',
            loaded: false,
            error: '',
            payload: null,
            stage: 'landing',
            workspaceMode: 'preview',
            selectedPatternId: '',
            sessionIndex: 0,
            revealedCount: 0,
            dialogOpen: false,
            reminderOpen: false,
            filter: 'all',
            insightOpen: false,
            scrollToTop: false,
            initialRouteState: readInitialRouteState()
        };
    }

    function getPatterns(state) {
        return Array.isArray(state.payload?.patterns) ? state.payload.patterns : [];
    }

    function getPatternById(state, patternId = state.selectedPatternId) {
        return state.payload?.patternsById?.[patternId] || null;
    }

    function getPatternSessions(state, patternId = state.selectedPatternId) {
        return Array.isArray(state.payload?.sessionsByPattern?.[patternId]) ? state.payload.sessionsByPattern[patternId] : [];
    }

    function getCurrentSession(state) {
        const sessions = getPatternSessions(state);
        if (!sessions.length) return null;
        return sessions[wrapIndex(state.sessionIndex, sessions.length)] || null;
    }

    function getFilledCount(state) {
        const session = getCurrentSession(state);
        if (!session) return 0;
        return Math.max(0, Math.min(session.questions.length, state.revealedCount));
    }

    function getActiveQuestion(state) {
        const session = getCurrentSession(state);
        const filledCount = getFilledCount(state);
        if (!session || filledCount >= session.questions.length) return null;
        return session.questions[filledCount] || null;
    }

    function isSessionComplete(state) {
        const session = getCurrentSession(state);
        return !!session && getFilledCount(state) >= session.questions.length;
    }

    function getCurrentProgressStep(state) {
        if (state.stage === 'landing') return 'landing';
        if (state.stage === 'categories') return 'categories';
        if (state.stage === 'workspace') return state.workspaceMode === 'exercise' ? 'exercise' : 'preview';
        return 'landing';
    }

    function getCurrentLevelLabel(levelId) {
        return LEVEL_META[normalizeLevel(levelId)]?.label || 'רמה';
    }

    function getCurrentLevelShortLabel(levelId) {
        return LEVEL_META[normalizeLevel(levelId)]?.shortLabel || getCurrentLevelLabel(levelId);
    }

    function getSideTitle(session, side) {
        return side === 'b' ? session.sideBLabel : session.sideALabel;
    }

    function startLab(state) {
        state.stage = 'categories';
        state.insightOpen = false;
        state.scrollToTop = true;
        return true;
    }

    function goLanding(state) {
        state.stage = 'landing';
        state.workspaceMode = 'preview';
        state.insightOpen = false;
        state.scrollToTop = true;
        return true;
    }

    function goCategories(state) {
        state.stage = 'categories';
        state.workspaceMode = 'preview';
        state.insightOpen = false;
        state.scrollToTop = true;
        return true;
    }

    function openBook(state, patternId) {
        const pattern = getPatternById(state, patternId);
        if (!pattern) return false;
        state.selectedPatternId = pattern.id;
        state.sessionIndex = 0;
        state.revealedCount = 0;
        state.workspaceMode = 'exercise';
        state.insightOpen = false;
        state.stage = 'workspace';
        state.scrollToTop = true;
        return true;
    }

    function openPattern(state, patternId) {
        const pattern = getPatternById(state, patternId);
        if (!pattern) return false;
        state.selectedPatternId = pattern.id;
        state.sessionIndex = 0;
        state.revealedCount = 0;
        state.workspaceMode = 'preview';
        state.insightOpen = false;
        state.stage = 'workspace';
        state.scrollToTop = true;
        return true;
    }

    function openPreview(state) {
        if (!state.selectedPatternId) return false;
        state.workspaceMode = 'preview';
        state.insightOpen = false;
        state.stage = 'workspace';
        state.scrollToTop = true;
        return true;
    }

    function startExercise(state) {
        if (!state.selectedPatternId) return false;
        state.workspaceMode = 'exercise';
        state.insightOpen = false;
        state.stage = 'workspace';
        state.scrollToTop = true;
        return true;
    }

    function revealAnswer(state) {
        const session = getCurrentSession(state);
        if (!session) return false;
        state.workspaceMode = 'exercise';
        if (state.revealedCount >= session.questions.length) return false;
        state.revealedCount += 1;
        state.insightOpen = false;
        return true;
    }

    function fillAll(state) {
        const session = getCurrentSession(state);
        if (!session) return false;
        state.workspaceMode = 'exercise';
        state.revealedCount = session.questions.length;
        state.insightOpen = false;
        return true;
    }

    function resetExercise(state) {
        if (!state.selectedPatternId) return false;
        state.workspaceMode = 'exercise';
        state.revealedCount = 0;
        state.insightOpen = false;
        state.scrollToTop = true;
        return true;
    }

    function openInsight(state) {
        if (!isSessionComplete(state)) return false;
        state.insightOpen = true;
        return true;
    }

    function closeInsight(state) {
        if (!state.insightOpen) return false;
        state.insightOpen = false;
        return true;
    }

    function toggleDialog(state) {
        state.dialogOpen = !state.dialogOpen;
        return true;
    }

    function toggleReminder(state) {
        state.reminderOpen = !state.reminderOpen;
        return true;
    }

    function setFilter(state, filterId) {
        const normalized = normalizeText(filterId).toLowerCase();
        state.filter = normalized && normalized !== 'all' ? normalized : 'all';
        return true;
    }

    function openRelativeSession(state, direction) {
        const sessions = getPatternSessions(state);
        if (sessions.length < 2) return false;
        state.sessionIndex = wrapIndex(state.sessionIndex + direction, sessions.length);
        state.revealedCount = 0;
        state.workspaceMode = 'preview';
        state.insightOpen = false;
        state.scrollToTop = true;
        return true;
    }

    function applyInitialRouteState(state) {
        const routeState = state.initialRouteState;
        if (!routeState || !state.payload) return;

        state.initialRouteState = null;

        if (routeState.patternId && getPatternById(state, routeState.patternId)) {
            state.selectedPatternId = routeState.patternId;
            const sessions = getPatternSessions(state, routeState.patternId);
            if (sessions.length && Number.isInteger(routeState.sessionIndex)) {
                state.sessionIndex = wrapIndex(routeState.sessionIndex, sessions.length);
            }
        }

        if (routeState.stage === 'categories') {
            state.stage = 'categories';
        } else if (routeState.stage === 'workspace' && state.selectedPatternId) {
            state.stage = 'workspace';
            state.workspaceMode = routeState.workspaceMode === 'exercise' ? 'exercise' : 'preview';
        }

        if (Number.isInteger(routeState.revealedCount) && state.selectedPatternId) {
            const session = getCurrentSession(state);
            if (session) {
                state.revealedCount = Math.max(0, Math.min(session.questions.length, routeState.revealedCount));
                if (state.revealedCount > 0) state.workspaceMode = 'exercise';
            }
        }

        if (routeState.insightOpen && isSessionComplete(state)) {
            state.insightOpen = true;
        }
    }

    function restartFeature(state) {
        state.stage = 'landing';
        state.workspaceMode = 'preview';
        state.selectedPatternId = '';
        state.sessionIndex = 0;
        state.revealedCount = 0;
        state.dialogOpen = false;
        state.reminderOpen = false;
        state.filter = 'all';
        state.insightOpen = false;
        state.scrollToTop = true;
        return true;
    }

    function stepBack(state) {
        if (state.insightOpen) {
            state.insightOpen = false;
            return true;
        }

        if (state.stage === 'workspace') {
            if (state.workspaceMode === 'exercise') {
                if (state.revealedCount > 0) {
                    state.revealedCount -= 1;
                    return true;
                }
                state.workspaceMode = 'preview';
                state.scrollToTop = true;
                return true;
            }
            state.stage = 'categories';
            state.scrollToTop = true;
            return true;
        }

        if (state.stage === 'categories') {
            state.stage = 'landing';
            state.scrollToTop = true;
            return true;
        }

        return false;
    }

    function registerController(state) {
        global.__metaFeatureControllers = global.__metaFeatureControllers || {};
        global.__metaFeatureControllers.prismlab = {
            stepBack() {
                const handled = stepBack(state);
                if (handled) renderApp(state);
                return handled;
            },
            restart() {
                const handled = restartFeature(state);
                if (handled) renderApp(state);
                return handled;
            }
        };
    }

    function renderWindowedAction(state) {
        if (state.mode === 'standalone') return '';
        return '<button type="button" class="pnm-btn pnm-btn--ghost pnm-btn--compact" data-action="open-windowed">פתח בחלון מותאם</button>';
    }

    function renderProgressRail(state) {
        const currentStep = getCurrentProgressStep(state);
        const stepOrder = ['landing', 'categories', 'preview', 'exercise'];
        const currentIndex = stepOrder.indexOf(currentStep);
        const selectedPattern = !!state.selectedPatternId;
        const steps = [
            { id: 'landing', index: 1, label: 'החידוש', enabled: true },
            { id: 'categories', index: 2, label: 'בחירת תבנית', enabled: currentIndex >= 1 },
            { id: 'preview', index: 3, label: 'תצוגה מקדימה', enabled: selectedPattern && currentIndex >= 2 },
            { id: 'exercise', index: 4, label: 'מעבדה', enabled: selectedPattern && currentIndex >= 3 }
        ];

        return `
            <nav class="pnm-progress-rail" aria-label="שלבי התרגול">
                ${steps.map((step) => `
                    <button type="button" class="pnm-progress-step${currentStep === step.id ? ' is-current' : ''}${step.enabled ? ' is-enabled' : ''}" data-action="go-step" data-step="${escapeHtml(step.id)}" ${step.enabled ? '' : 'disabled'} aria-current="${currentStep === step.id ? 'step' : 'false'}">
                        <span class="pnm-progress-step__index">${step.index}</span>
                        <span class="pnm-progress-step__label">${escapeHtml(step.label)}</span>
                    </button>
                `).join('')}
            </nav>
        `;
    }

    function renderLevelPills() {
        return `
            <div class="pnm-level-pill-row">
                ${DISPLAY_LEVEL_ORDER.map((levelId) => `
                    <span class="pnm-level-pill" style="--pnm-level:${escapeHtml(LEVEL_META[levelId].color)}">
                        ${escapeHtml(LEVEL_META[levelId].label)}
                    </span>
                `).join('')}
            </div>
        `;
    }

    function renderIntroDialog() {
        return `
            <article class="pnm-card pnm-card--dialog">
                <div class="pnm-section-head">
                    <div>
                        <span class="pnm-eyebrow">דיאלוג לדוגמה</span>
                        <h2>${escapeHtml(INTRO_DIALOG.title)}</h2>
                    </div>
                    <button type="button" class="pnm-mini-link" data-action="toggle-dialog">סגור</button>
                </div>
                <div class="pnm-chat-thread">
                    <div class="pnm-bubble pnm-bubble--client">
                        <span class="pnm-bubble__speaker">מטופל/ת</span>
                        <p>${escapeHtml(INTRO_DIALOG.clientLine)}</p>
                    </div>
                    <div class="pnm-violation-chip">זוהתה הפרה: נומינליזציה</div>
                    <div class="pnm-bubble pnm-bubble--therapist">
                        <span class="pnm-bubble__speaker">הדרך הרגילה</span>
                        <p>${escapeHtml(INTRO_DIALOG.classicLine)}</p>
                    </div>
                </div>
                <div class="pnm-level-dialog-list">
                    ${INTRO_DIALOG.levels.map((entry) => `
                        <article class="pnm-level-dialog-row" style="--pnm-level:${escapeHtml(LEVEL_META[entry.levelId].color)}">
                            <div class="pnm-level-dialog-row__head">
                                <strong>${escapeHtml(LEVEL_META[entry.levelId].label)}</strong>
                                <span>${escapeHtml(LEVEL_META[entry.levelId].question)}</span>
                            </div>
                            <p class="pnm-level-dialog-row__question">${escapeHtml(entry.question)}</p>
                            <p class="pnm-level-dialog-row__answer">${escapeHtml(entry.answer)}</p>
                        </article>
                    `).join('')}
                </div>
                <div class="pnm-callout-grid">
                    <article class="pnm-callout-card pnm-callout-card--core">
                        <span class="pnm-eyebrow">הגרעין</span>
                        <p>${escapeHtml(INTRO_DIALOG.core)}</p>
                    </article>
                    <article class="pnm-callout-card pnm-callout-card--crack">
                        <span class="pnm-eyebrow">הסדק</span>
                        <p>${escapeHtml(INTRO_DIALOG.crack)}</p>
                    </article>
                    <article class="pnm-callout-card pnm-callout-card--punch">
                        <span class="pnm-eyebrow">הפאנץ׳</span>
                        <p>${escapeHtml(INTRO_DIALOG.punch)}</p>
                    </article>
                </div>
                <p class="pnm-dialog-closing">${escapeHtml(INTRO_DIALOG.closing)}</p>
            </article>
        `;
    }

    function renderFlowCard(title, modifier, items, note) {
        return `
            <article class="pnm-card pnm-card--flow ${modifier}">
                <div class="pnm-section-head">
                    <div><span class="pnm-eyebrow">${escapeHtml(title)}</span></div>
                    ${modifier.includes('innovation') ? '<span class="pnm-badge">חידוש</span>' : ''}
                </div>
                <div class="pnm-flow-line">
                    ${items.map((item, index) => `
                        ${index > 0 ? '<span class="pnm-flow-arrow">←</span>' : ''}
                        <span class="pnm-flow-chip${item.emphasis ? ' is-emphasis' : ''}">${escapeHtml(item.label)}</span>
                    `).join('')}
                </div>
                <p class="pnm-muted">${escapeHtml(note)}</p>
            </article>
        `;
    }

    function renderPyramid() {
        return `
            <article class="pnm-card">
                <div class="pnm-section-head">
                    <div>
                        <span class="pnm-eyebrow">פירמידת הרמות</span>
                        <h2>אותו משפט, שש שכבות הסתכלות</h2>
                    </div>
                </div>
                <div class="pnm-pyramid" aria-label="פירמידת הרמות הלוגיות">
                    ${DISPLAY_LEVEL_ORDER.map((levelId) => `
                        <div class="pnm-pyramid-row" style="--pnm-width:${escapeHtml(LEVEL_WIDTHS[levelId])};--pnm-level:${escapeHtml(LEVEL_META[levelId].color)}">
                            <strong>${escapeHtml(LEVEL_META[levelId].label)}</strong>
                            <span>${escapeHtml(LEVEL_META[levelId].question)}</span>
                        </div>
                    `).join('')}
                </div>
            </article>
        `;
    }

    function renderDiscoveryCards() {
        return `
            <div class="pnm-discovery-grid">
                <article class="pnm-card pnm-card--discovery pnm-card--core">
                    <span class="pnm-eyebrow">הגרעין</span>
                    <p>ברמה מסוימת נמצא מה שמחזיק את הסיפור ומרגיש הכרחי – שם הסיפור אחוז חזק.</p>
                </article>
                <article class="pnm-card pnm-card--discovery pnm-card--crack">
                    <span class="pnm-eyebrow">הסדק</span>
                    <p>ברמה אחרת נפתח פתח קטן – גם אם הכול מרגיש תקוע, שם כבר יש תנועה אפשרית.</p>
                </article>
                <article class="pnm-card pnm-card--discovery pnm-card--punch">
                    <span class="pnm-eyebrow">הפאנץ׳</span>
                    <p>שאלה שמרחיבה מעבר למשפט המקורי ומולידה כיוון טיפולי חדש שנולד מהמטופל/ת עצמם.</p>
                </article>
            </div>
        `;
    }

    // ─── Library: context story hero section ──────────────────────────────────
    function renderContextStory() {
        return `
            <div class="pnm-lib-context">
                <img class="pnm-lib-context__img"
                     src="${PATTERN_IMAGE_BASE}context-therapy-room.webp"
                     alt="חדר טיפולי"
                     onerror="this.style.display='none'">
                <div class="pnm-lib-context__body">
                    <p class="pnm-lib-context__text">
                        דן, בן 42, מגיע לפגישה השלישית. משהו בין הזוג לא זז. בסיום הפגישה, כשהוא כבר בדלת, הוא מסתובב ואומר:
                    </p>
                    <blockquote class="pnm-lib-context__quote">
                        "${escapeHtml(INTRO_DIALOG.clientLine)}"
                    </blockquote>
                    <p class="pnm-lib-context__subtext">
                        משפט אחד, שלוש מילים. נשמע סגור, סופי. אבל הוא מסתיר בתוכו משהו – דרכו אפשר לפתוח את מה שנראה כמחסום.
                    </p>
                </div>
            </div>
        `;
    }

    // ─── Library: expanded dialog content ─────────────────────────────────────
    function renderLibraryDialogExpanded() {
        return `
            <div class="pnm-lib-dialog-body">
                <div class="pnm-lib-bubble">
                    <span class="pnm-lib-bubble__speaker">מטופל/ת</span>
                    <p>"${escapeHtml(INTRO_DIALOG.clientLine)}"</p>
                </div>
                <div class="pnm-lib-id-pill">
                    זוהתה: שם עצם מופשט (Nominalization) – "תקשורת" מקפיאה תהליך חי לדבר
                </div>
                <div class="pnm-lib-sep-note">
                    <span>${escapeHtml(INTRO_DIALOG.classicLine)} – ועוצרים שם.</span>
                    <span class="pnm-lib-sep-note__arrow">↙</span>
                    <span>עם מיפוי רמות לוגיות – ממשיכים:</span>
                </div>
                <div class="pnm-lib-level-rows">
                    ${INTRO_DIALOG.levels.map((entry) => {
                        const lm = LEVEL_META[entry.levelId];
                        return `
                            <div class="pnm-lib-level-row">
                                <span class="pnm-lib-level-pill" style="background:${lm.color}22;color:${lm.color};border:1px solid ${lm.color}55">${escapeHtml(lm.shortLabel)}</span>
                                <span class="pnm-lib-level-row__q">"${escapeHtml(entry.question)}"</span>
                                <span class="pnm-lib-level-row__a">${escapeHtml(entry.answer)}</span>
                            </div>
                        `;
                    }).join('')}
                </div>
                <div class="pnm-lib-discovery-row">
                    <div class="pnm-lib-discovery-card" style="border-right:3px solid #B85C38">
                        <span class="pnm-lib-discovery-card__label" style="color:#B85C38">הגרעין</span>
                        <p>${escapeHtml(INTRO_DIALOG.core)}</p>
                    </div>
                    <div class="pnm-lib-discovery-card" style="border-right:3px solid #5C4B99">
                        <span class="pnm-lib-discovery-card__label" style="color:#5C4B99">הסדק</span>
                        <p>${escapeHtml(INTRO_DIALOG.crack)}</p>
                    </div>
                    <div class="pnm-lib-discovery-card" style="border-right:3px solid #2D6A4F">
                        <span class="pnm-lib-discovery-card__label" style="color:#2D6A4F">הפאנץ׳</span>
                        <p>${escapeHtml(INTRO_DIALOG.punch)}</p>
                    </div>
                </div>
                <p class="pnm-lib-dialog-closing"><em>${escapeHtml(INTRO_DIALOG.closing)}</em></p>
                <button type="button" class="pnm-lib-dialog-close" data-action="toggle-dialog">▴ סגור</button>
            </div>
        `;
    }

    // ─── Library: single book card ─────────────────────────────────────────────
    function renderBookCard(pattern, bookIndex) {
        const family = FAMILY_META[pattern.family];
        const isBasic = pattern.difficulty === 'basic';
        const imgFile = PATTERN_IMAGE_MAP[pattern.id];
        const imgSrc = imgFile ? PATTERN_IMAGE_BASE + imgFile : '';
        return `
            <button type="button"
                    class="pnm-lib-book"
                    style="border-right:4px solid ${escapeHtml(family.color)};animation-delay:${bookIndex * 0.05}s"
                    data-action="open-book"
                    data-book-id="${escapeHtml(pattern.id)}">
                <div class="pnm-lib-book__img-wrap" style="--pnm-book-color:${escapeHtml(family.color)}">
                    ${imgSrc ? `<img class="pnm-lib-book__img" src="${escapeHtml(imgSrc)}" alt="" aria-hidden="true" onerror="this.style.display='none'">` : ''}
                </div>
                <h3 class="pnm-lib-book__title">${escapeHtml(pattern.title)}</h3>
                <span class="pnm-lib-book__level pnm-lib-book__level--${isBasic ? 'basic' : 'advanced'}">${isBasic ? 'בסיסי' : 'מתקדם'}</span>
                <p class="pnm-lib-book__concept">${escapeHtml(pattern.concept)}</p>
                <div class="pnm-lib-book__sep"></div>
                <span class="pnm-lib-book__question" style="color:${escapeHtml(family.color)}">${escapeHtml(pattern.keyQuestion)}</span>
            </button>
        `;
    }

    // ─── Library: one shelf (label + books row + wooden edge) ─────────────────
    function renderShelf(familyId, bookOffset) {
        const family = FAMILY_META[familyId];
        const patterns = PATTERN_CATALOG.filter((p) => p.family === familyId);
        return `
            <section class="pnm-lib-shelf">
                <div class="pnm-lib-shelf-label">
                    <div class="pnm-lib-shelf-accent" style="background:${escapeHtml(family.color)}"></div>
                    <span class="pnm-lib-shelf-name" style="color:${escapeHtml(family.color)}">${escapeHtml(family.label)}</span>
                    <span class="pnm-lib-shelf-tagline">${escapeHtml(family.description)}</span>
                </div>
                <div class="pnm-lib-books">
                    ${patterns.map((p, i) => renderBookCard(p, bookOffset + i)).join('')}
                </div>
                <div class="pnm-lib-shelf-edge"></div>
            </section>
        `;
    }

    // ─── Library: full page (replaces landing + categories) ───────────────────
    function renderLibrary(state) {
        let bookOffset = 0;
        const totalCount = PATTERN_CATALOG.length;

        const shelvesHtml = FAMILY_ORDER.map((familyId) => {
            if (state.filter !== 'all' && state.filter !== familyId) return '';
            const count = PATTERN_CATALOG.filter((p) => p.family === familyId).length;
            const html = renderShelf(familyId, bookOffset);
            bookOffset += count;
            return html;
        }).join('');

        const chips = [
            { id: 'all', label: `הכול ${totalCount}`, color: '#6B5B45', dot: false },
            ...FAMILY_ORDER.map((fid) => ({
                id: fid,
                label: `${FAMILY_META[fid].label} ${PATTERN_CATALOG.filter((p) => p.family === fid).length}`,
                color: FAMILY_META[fid].color,
                dot: true
            }))
        ];

        return `
            <section class="pnm-view pnm-view--library">
                ${renderContextStory()}

                <div class="pnm-lib-dialog-wrap">
                    <button type="button" class="pnm-lib-dialog-toggle" data-action="toggle-dialog" aria-expanded="${state.dialogOpen ? 'true' : 'false'}">
                        <span>מה עושים עם המשפט הזה? לחצו לראות את הכוח בפעולה</span>
                        <strong class="pnm-lib-dialog-indicator">${state.dialogOpen ? '▴' : '▾'}</strong>
                    </button>
                    ${state.dialogOpen ? renderLibraryDialogExpanded() : ''}
                </div>

                <header class="pnm-lib-header">
                    <h1 class="pnm-lib-title">📚 ספריית התבניות</h1>
                    <p class="pnm-lib-subtitle">בחרו תבנית ממשרף – ופתחו דרך חדשה לרמות לוגיות</p>
                </header>

                <div class="pnm-lib-filters" role="tablist" aria-label="סינון לפי משפחה">
                    ${chips.map((chip) => {
                        const isActive = state.filter === chip.id;
                        const activeStyle = isActive ? `background:${chip.color};color:#fff;border-color:transparent;` : '';
                        const dotStyle = isActive ? 'background:#fff;opacity:0.8' : `background:${chip.color}`;
                        return `
                            <button type="button"
                                    class="pnm-lib-filter-chip${isActive ? ' is-active' : ''}"
                                    style="${activeStyle}"
                                    data-action="set-filter"
                                    data-filter="${escapeHtml(chip.id)}">
                                ${chip.dot ? `<span class="pnm-lib-filter-dot" style="${dotStyle}"></span>` : ''}
                                ${escapeHtml(chip.label)}
                            </button>
                        `;
                    }).join('')}
                </div>

                <div class="pnm-lib-shelves">
                    ${shelvesHtml}
                </div>
            </section>
        `;
    }

    function renderLanding(state) {
        return renderLibrary(state);
    }

    function countPatternsByFamily(familyId) {
        return PATTERN_CATALOG.filter((pattern) => pattern.family === familyId).length;
    }

    function renderReminderPanel(state) {
        return `
            <article class="pnm-card pnm-card--toggle">
                <button type="button" class="pnm-toggle-line" data-action="toggle-reminder" aria-expanded="${state.reminderOpen ? 'true' : 'false'}">
                    <span>תזכורת: איך זה עובד?</span>
                    <strong>${state.reminderOpen ? 'סגור' : 'פתח'}</strong>
                </button>
                ${state.reminderOpen ? `
                    <div class="pnm-toggle-body">
                        <div class="pnm-flow-line pnm-flow-line--small">
                            <span class="pnm-flow-chip">זיהוי</span>
                            <span class="pnm-flow-arrow">←</span>
                            <span class="pnm-flow-chip">מיפוי ברמות</span>
                            <span class="pnm-flow-arrow">←</span>
                            <span class="pnm-flow-chip">גרעין</span>
                            <span class="pnm-flow-arrow">←</span>
                            <span class="pnm-flow-chip">סדק</span>
                            <span class="pnm-flow-arrow">←</span>
                            <span class="pnm-flow-chip">פאנץ׳</span>
                        </div>
                    </div>
                ` : ''}
            </article>
        `;
    }

    function renderFilterRow(state) {
        const chips = [
            { id: 'all', label: 'הכול', count: PATTERN_CATALOG.length, color: '#6B5B45' },
            ...FAMILY_ORDER.map((familyId) => ({
                id: familyId,
                label: FAMILY_META[familyId].label,
                count: countPatternsByFamily(familyId),
                color: FAMILY_META[familyId].color
            }))
        ];

        return `
            <div class="pnm-filter-row" role="tablist" aria-label="סינון לפי משפחה">
                ${chips.map((chip) => `
                    <button type="button" class="pnm-filter-chip${state.filter === chip.id ? ' is-active' : ''}" style="--pnm-chip-color:${escapeHtml(chip.color)}" data-action="set-filter" data-filter="${escapeHtml(chip.id)}">
                        <span>${escapeHtml(chip.label)}</span>
                        <strong>${chip.count}</strong>
                    </button>
                `).join('')}
            </div>
        `;
    }

    function renderPatternCard(pattern) {
        const family = FAMILY_META[pattern.family];
        const examplesLabel = `${pattern.sessionCount} ${pattern.sessionCount === 1 ? 'דוגמה' : 'דוגמאות'}`;
        return `
            <button type="button" class="pnm-card pnm-pattern-card" style="--pnm-family:${escapeHtml(family.color)};--pnm-family-soft:${escapeHtml(family.soft)}" data-action="open-category" data-category-id="${escapeHtml(pattern.id)}">
                <div class="pnm-pattern-card__meta">
                    <span class="pnm-pattern-pill pnm-pattern-pill--${escapeHtml(normalizeDifficulty(pattern.difficulty))}">${escapeHtml(difficultyLabel(pattern.difficulty))}</span>
                    <span class="pnm-pattern-pill pnm-pattern-pill--ghost">${escapeHtml(examplesLabel)}</span>
                </div>
                <h3>${escapeHtml(pattern.title)}</h3>
                <p>${escapeHtml(pattern.concept)}</p>
                <div class="pnm-pattern-card__footer">
                    <span class="pnm-key-question">שאלת מפתח: ${escapeHtml(pattern.keyQuestion)}</span>
                    <span class="pnm-pattern-arrow" aria-hidden="true">←</span>
                </div>
            </button>
        `;
    }

    function renderFamilySections(state) {
        return FAMILY_ORDER.map((familyId) => {
            if (state.filter !== 'all' && state.filter !== familyId) return '';
            const family = FAMILY_META[familyId];
            const patterns = getPatterns(state).filter((pattern) => pattern.family === familyId);
            return `
                <section class="pnm-family-section">
                    <header class="pnm-family-section__head" style="--pnm-family:${escapeHtml(family.color)}">
                        <div>
                            <span class="pnm-eyebrow">${escapeHtml(family.label)}</span>
                            <h3>${escapeHtml(family.description)}</h3>
                        </div>
                        <span class="pnm-chip" style="--pnm-chip-accent:${escapeHtml(family.color)}">${patterns.length} תבניות</span>
                    </header>
                    <div class="pnm-pattern-grid">
                        ${patterns.map(renderPatternCard).join('')}
                    </div>
                </section>
            `;
        }).join('');
    }

    function renderCategories(state) {
        return `
            <section class="pnm-view pnm-view--categories">
                ${renderProgressRail(state)}
                <article class="pnm-card">
                    <div class="pnm-section-head">
                        <div>
                            <span class="pnm-eyebrow">שלב 2</span>
                            <h1>בחרו תבנית להעמקה</h1>
                            <p>כל תבנית תיחקר דרך הרמות הלוגיות, מהסביבה ועד הזהות והמעבר לעצמי.</p>
                        </div>
                        ${renderWindowedAction(state)}
                    </div>
                </article>
                ${renderReminderPanel(state)}
                ${renderFilterRow(state)}
                ${renderFamilySections(state)}
            </section>
        `;
    }

    function renderSessionNavigator(state) {
        const sessions = getPatternSessions(state);
        if (sessions.length < 2) return '';
        const index = wrapIndex(state.sessionIndex, sessions.length);
        return `
            <div class="pnm-session-nav">
                <button type="button" class="pnm-mini-link" data-action="prev-session">הקודם</button>
                <span>דוגמה ${index + 1} מתוך ${sessions.length}</span>
                <button type="button" class="pnm-mini-link" data-action="next-session">הבא</button>
            </div>
        `;
    }

    function renderPatternHeaderCard(state, pattern, session) {
        const family = FAMILY_META[pattern.family];
        return `
            <article class="pnm-card pnm-context-card" style="--pnm-family:${escapeHtml(family.color)};--pnm-family-soft:${escapeHtml(family.soft)}">
                <div class="pnm-pattern-header-bar"></div>
                <div class="pnm-section-head">
                    <div>
                        <div class="pnm-chip-row">
                            <span class="pnm-chip" style="--pnm-chip-accent:${escapeHtml(family.color)}">${escapeHtml(family.label)}</span>
                            <span class="pnm-chip">${escapeHtml(difficultyLabel(pattern.difficulty))}</span>
                        </div>
                        <h2>${escapeHtml(pattern.title)}</h2>
                        <p>${escapeHtml(pattern.concept)}</p>
                    </div>
                    ${renderWindowedAction(state)}
                </div>
                ${session ? `<blockquote class="pnm-example-sentence">"${escapeHtml(session.sentence)}"</blockquote>` : ''}
                ${renderSessionNavigator(state)}
            </article>
        `;
    }

    function renderPreviewTimeline() {
        // Items are trusted hardcoded strings – no user input, safe to use as HTML
        const items = [
            '<strong>זיהוי הפרה</strong> – ניתן למשפט את ניסוח המטופל/ת לזהות את התבנית',
            '<strong>מיפוי ברמות</strong> – המשפט מוצג דרך כל אחת משש הרמות הלוגיות',
            '<strong>הגרעין</strong> – נאתר את הרמה שמחזיקה את הסיפור ומרגישה הכרחית',
            '<strong>הסדק</strong> – נחפש את הרמה שבה כבר יש תנועה אפשרית',
            '<strong>הפאנץ׳</strong> – שאלה טיפולית שמרחיבה את המרחב ומולידה כיוון חדש'
        ];

        return `
            <ol class="pnm-timeline">
                ${items.map((item, index) => `
                    <li class="pnm-timeline__item">
                        <span class="pnm-timeline__index">${index + 1}</span>
                        <span>${item}</span>
                    </li>
                `).join('')}
            </ol>
        `;
    }

    function renderPreview(state) {
        const pattern = getPatternById(state);
        const session = getCurrentSession(state);
        if (!pattern) return renderError({ error: 'לא נבחרה תבנית.' });
        const family = FAMILY_META[pattern.family];

        return `
            <section class="pnm-view pnm-view--workspace pnm-view--workspace-preview">
                ${renderProgressRail(state)}
                ${renderPatternHeaderCard(state, pattern, session)}
                <article class="pnm-card pnm-instruction-card">
                    <div class="pnm-key-callout" style="--pnm-family:${escapeHtml(family.color)};--pnm-family-soft:${escapeHtml(family.soft)}">
                        <span class="pnm-key-callout__icon">?</span>
                        <div>
                            <span class="pnm-eyebrow">שאלת מפתח</span>
                            <strong>${escapeHtml(pattern.keyQuestion)}</strong>
                        </div>
                    </div>
                    <div class="pnm-section-head pnm-section-head--compact">
                        <div>
                            <span class="pnm-eyebrow">מה יקרה?</span>
                            <h3>לפני שנכנסים למעבדה</h3>
                        </div>
                    </div>
                    ${renderPreviewTimeline()}
                    ${renderLevelPills()}
                </article>
                <article class="pnm-card pnm-question-card">
                    <div class="pnm-section-head pnm-section-head--compact">
                        <div>
                            <span class="pnm-eyebrow">שלב 3</span>
                            <h3>מוכנים להיכנס לתרגיל?</h3>
                        </div>
                    </div>
                    <p>השלב הבא יציג משפט אחד, ימפה אותו דרך שש הרמות, ויוציא מתוכו גרעין, סדק ופאנץ׳ טיפולי.</p>
                    <div class="pnm-button-row">
                        <button type="button" class="pnm-btn pnm-btn--primary" style="--pnm-btn-accent:${escapeHtml(family.color)}" data-action="start-exercise">התחילו את התרגיל</button>
                        <button type="button" class="pnm-btn pnm-btn--ghost" data-action="go-categories">תבנית אחרת</button>
                    </div>
                </article>
            </section>
        `;
    }

    function buildSummaryLine(session) {
        const core = getCurrentLevelLabel(session.core);
        const crack = getCurrentLevelLabel(session.crack);
        if (session.core === session.crack) {
            return `גם הגרעין וגם הסדק יושבים סביב ${core}, ולכן כדאי להישאר באותה רמה ולדייק מה מחזיק ומה כבר זז.`;
        }
        return `הגרעין מחזיק סביב ${core}, אבל פתח העבודה נחשף דרך ${crack}. זה המקום שבו אפשר להצטרף ולהוביל בעדינות.`;
    }

    function renderMapCell(question, filledCount, reflectMode) {
        const filled = reflectMode || (question && question.orderIndex < filledCount);
        const active = !reflectMode && question && question.orderIndex === filledCount;

        if (!question) {
            return '<div class="pnm-map-cell pnm-map-cell--empty"><span>—</span></div>';
        }

        return `
            <div class="pnm-map-cell${filled ? ' is-filled' : ''}${active ? ' is-active' : ''}">
                <span class="pnm-map-cell__question">${escapeHtml(question.question)}</span>
                ${filled ? `<p>${escapeHtml(question.answer)}</p>` : `<small>${active ? 'התא הבא' : 'ממתין'}</small>`}
            </div>
        `;
    }

    function renderMap(session, filledCount, reflectMode = false) {
        return `
            <article class="pnm-card pnm-map-card${reflectMode ? ' pnm-map-card--reflect' : ''}">
                <div class="pnm-section-head pnm-section-head--compact">
                    <div>
                        <span class="pnm-eyebrow">מפת הרמות</span>
                        <h3>מה קורה בחוץ, ומה נהיה בפנים</h3>
                    </div>
                </div>
                <div class="pnm-map-grid">
                    <div class="pnm-map-grid__head">
                        <strong>${escapeHtml(session.sideALabel)}</strong>
                        <span>רמה לוגית</span>
                        <strong>${escapeHtml(session.sideBLabel)}</strong>
                    </div>
                    ${session.rows.map((row) => {
                        const level = LEVEL_META[row.levelId];
                        const rowClass = ['pnm-map-row', session.core === row.levelId ? 'is-core' : '', session.crack === row.levelId ? 'is-crack' : '']
                            .filter(Boolean)
                            .join(' ');

                        return `
                            <div class="${rowClass}" style="--pnm-level:${escapeHtml(level.color)}">
                                ${renderMapCell(row.a, filledCount, reflectMode)}
                                <div class="pnm-map-row__level">
                                    <strong>${escapeHtml(level.label)}</strong>
                                    <small>${escapeHtml(level.question)}</small>
                                    ${session.core === row.levelId ? '<span class="pnm-row-marker pnm-row-marker--core">הגרעין</span>' : ''}
                                    ${session.crack === row.levelId ? '<span class="pnm-row-marker pnm-row-marker--crack">הסדק</span>' : ''}
                                </div>
                                ${renderMapCell(row.b, filledCount, reflectMode)}
                            </div>
                        `;
                    }).join('')}
                </div>
            </article>
        `;
    }

    function renderExercise(state) {
        const pattern = getPatternById(state);
        const session = getCurrentSession(state);
        if (!pattern || !session) return renderError({ error: 'לא נמצא תרגיל להצגה.' });

        const family = FAMILY_META[pattern.family];
        const activeQuestion = getActiveQuestion(state);
        const filledCount = getFilledCount(state);
        const progress = session.questions.length ? Math.round((filledCount / session.questions.length) * 100) : 0;
        const complete = isSessionComplete(state);

        return `
            <section class="pnm-view pnm-view--workspace pnm-view--workspace-live">
                ${renderProgressRail(state)}
                ${renderPatternHeaderCard(state, pattern, session)}
                <article class="pnm-card pnm-instruction-card">
                    <div class="pnm-section-head pnm-section-head--compact">
                        <div>
                            <span class="pnm-eyebrow">שלב 4</span>
                            <h3>${complete ? 'המפה הושלמה' : 'ממלאים את המפה צעד אחר צעד'}</h3>
                        </div>
                        <span class="pnm-chip" style="--pnm-chip-accent:${escapeHtml(family.color)}">${filledCount}/${session.questions.length}</span>
                    </div>
                    <div class="pnm-stage-progress" aria-hidden="true">
                        <span style="width:${progress}%"></span>
                    </div>
                    ${complete ? `
                        <p>כעת כבר רואים את כל המבנה. אפשר לפתוח את חלון התובנה ולקרוא את הגרעין, את הסדק ואת שאלת הפאנץ׳.</p>
                    ` : `
                        <div class="pnm-chip-row">
                            <span class="pnm-chip">שאלה ${filledCount + 1}/${session.questions.length}</span>
                            ${activeQuestion ? `<span class="pnm-chip">${escapeHtml(getCurrentLevelLabel(activeQuestion.levelId))}</span>` : ''}
                            ${activeQuestion ? `<span class="pnm-chip">${escapeHtml(getSideTitle(session, activeQuestion.side))}</span>` : ''}
                        </div>
                        <p>בכל לחיצה נחשפת תשובה אחת, והיא מתיישבת בתא הבא במפה. כך רואים איך אותו משפט נפרש על פני כל הרמות.</p>
                    `}
                </article>
                <article class="pnm-card pnm-question-card">
                    ${complete ? `
                        <div class="pnm-section-head pnm-section-head--compact">
                            <div>
                                <span class="pnm-eyebrow">גרעין, סדק, פאנץ׳</span>
                                <h3>מוכנים לקרוא את המבנה</h3>
                            </div>
                        </div>
                        <p>${escapeHtml(buildSummaryLine(session))}</p>
                        <div class="pnm-button-row">
                            <button type="button" class="pnm-btn pnm-btn--primary" style="--pnm-btn-accent:${escapeHtml(family.color)}" data-action="go-reflect">פתח תובנה</button>
                            <button type="button" class="pnm-btn pnm-btn--ghost" data-action="reset-exercise">בנה מחדש</button>
                        </div>
                    ` : `
                        <div class="pnm-section-head pnm-section-head--compact">
                            <div>
                                <span class="pnm-eyebrow">${activeQuestion ? escapeHtml(getCurrentLevelShortLabel(activeQuestion.levelId)) : 'שאלה פעילה'}</span>
                                <h3>${activeQuestion ? escapeHtml(getSideTitle(session, activeQuestion.side)) : 'שאלה פעילה'}</h3>
                            </div>
                        </div>
                        <p class="pnm-question-card__text">${activeQuestion ? escapeHtml(activeQuestion.question) : 'אין שאלה להצגה.'}</p>
                        <div class="pnm-button-row">
                            <button type="button" class="pnm-btn pnm-btn--primary" style="--pnm-btn-accent:${escapeHtml(family.color)}" data-action="reveal-answer">חשוף תשובה</button>
                            <button type="button" class="pnm-btn pnm-btn--ghost" data-action="fill-all">מלא הכול</button>
                        </div>
                    `}
                </article>
                ${renderMap(session, filledCount)}
            </section>
        `;
    }

    function renderInsightModal(state) {
        if (!state.insightOpen) return '';
        const session = getCurrentSession(state);
        if (!session) return '';

        return `
            <div class="pnm-insight-backdrop">
                <div class="pnm-insight-modal" role="dialog" aria-modal="true" aria-label="הגרעין, הסדק והפאנץ׳">
                    <div class="pnm-section-head">
                        <div>
                            <span class="pnm-eyebrow">חלון תובנה</span>
                            <h2>הגרעין, הסדק והפאנץ׳</h2>
                            <p>${escapeHtml(buildSummaryLine(session))}</p>
                        </div>
                        <button type="button" class="pnm-mini-link" data-action="close-insight">סגור</button>
                    </div>
                    <div class="pnm-callout-grid">
                        <article class="pnm-callout-card pnm-callout-card--core">
                            <span class="pnm-eyebrow">הגרעין · ${escapeHtml(getCurrentLevelLabel(session.core))}</span>
                            <p>${escapeHtml(session.reflectCore)}</p>
                        </article>
                        <article class="pnm-callout-card pnm-callout-card--crack">
                            <span class="pnm-eyebrow">הסדק · ${escapeHtml(getCurrentLevelLabel(session.crack))}</span>
                            <p>${escapeHtml(session.reflectCrack)}</p>
                        </article>
                        <article class="pnm-callout-card pnm-callout-card--punch">
                            <span class="pnm-eyebrow">הפאנץ׳</span>
                            <p>${escapeHtml(session.punchQuestion)}</p>
                        </article>
                        <article class="pnm-callout-card pnm-callout-card--answer">
                            <span class="pnm-eyebrow">מה נפתח</span>
                            <p>${escapeHtml(session.punchAnswer)}</p>
                        </article>
                    </div>
                    ${renderMap(session, session.questions.length, true)}
                    <div class="pnm-button-row pnm-button-row--modal">
                        <button type="button" class="pnm-btn pnm-btn--primary" data-action="reset-exercise">בנה מחדש</button>
                        <button type="button" class="pnm-btn pnm-btn--ghost" data-action="go-categories">תבנית אחרת</button>
                    </div>
                </div>
            </div>
        `;
    }

    function renderLoading() {
        return `
            <section class="pnm-view">
                <article class="pnm-card pnm-card--status">
                    <h2>טוענים את מפת הרמות והמטה-מודל...</h2>
                </article>
            </section>
        `;
    }

    function renderError(state) {
        return `
            <section class="pnm-view">
                <article class="pnm-card pnm-card--status pnm-card--error">
                    <h2>לא הצלחנו לטעון את המסך</h2>
                    <p>${escapeHtml(state.error || 'תקלה לא ידועה')}</p>
                    <div class="pnm-button-row">
                        <button type="button" class="pnm-btn pnm-btn--primary" data-action="retry-load">נסה שוב</button>
                    </div>
                </article>
            </section>
        `;
    }

    function renderWorkspace(state) {
        return state.workspaceMode === 'exercise' ? renderExercise(state) : renderPreview(state);
    }

    function renderApp(state) {
        const shellClass = state.mode === 'standalone' ? 'pnm-app pnm-app--standalone' : 'pnm-app pnm-app--embedded';
        let body = '';

        if (state.error) body = renderError(state);
        else if (!state.loaded || !state.payload) body = renderLoading();
        else if (state.stage === 'landing' || state.stage === 'categories') body = renderLibrary(state);
        else body = renderWorkspace(state);

        state.root.innerHTML = `<div class="${shellClass}" dir="rtl">${body}${renderInsightModal(state)}</div>`;
        registerController(state);

        if (state.scrollToTop) {
            const scroller = state.root.querySelector('.pnm-view');
            const schedule = typeof global.requestAnimationFrame === 'function'
                ? global.requestAnimationFrame.bind(global)
                : (callback) => global.setTimeout(callback, 16);
            schedule(() => {
                if (scroller) scroller.scrollTop = 0;
                if (typeof global.scrollTo === 'function') {
                    try {
                        global.scrollTo({ top: 0, left: 0, behavior: 'auto' });
                    } catch (_error) {
                        global.scrollTo(0, 0);
                    }
                }
            });
            state.scrollToTop = false;
        }
    }

    function bindEvents(state) {
        state.root.onclick = async (event) => {
            if (event.target.classList.contains('pnm-insight-backdrop')) {
                if (closeInsight(state)) renderApp(state);
                return;
            }

            const actionNode = event.target.closest('[data-action]');
            if (!actionNode) return;

            const action = normalizeText(actionNode.getAttribute('data-action'));
            let handled = false;

            if (action === 'retry-load') {
                state.error = '';
                state.loaded = false;
                renderApp(state);
                try {
                    state.payload = await loadPayload();
                    state.loaded = true;
                    applyInitialRouteState(state);
                } catch (error) {
                    state.error = error?.message || 'Loading failed';
                }
                renderApp(state);
                return;
            }

            if (!state.loaded || !state.payload) return;

            if (action === 'toggle-dialog') handled = toggleDialog(state);
            if (action === 'start-lab') handled = startLab(state);
            if (action === 'toggle-reminder') handled = toggleReminder(state);
            if (action === 'set-filter') handled = setFilter(state, actionNode.getAttribute('data-filter'));
            if (action === 'open-book') handled = openBook(state, actionNode.getAttribute('data-book-id'));
            if (action === 'open-category') handled = openPattern(state, actionNode.getAttribute('data-category-id'));
            if (action === 'go-categories') handled = goCategories(state);
            if (action === 'start-exercise') handled = startExercise(state);
            if (action === 'reveal-answer') handled = revealAnswer(state);
            if (action === 'fill-all') handled = fillAll(state);
            if (action === 'go-reflect') handled = openInsight(state);
            if (action === 'close-insight') handled = closeInsight(state);
            if (action === 'reset-exercise') handled = resetExercise(state);
            if (action === 'prev-session') handled = openRelativeSession(state, -1);
            if (action === 'next-session') handled = openRelativeSession(state, 1);
            if (action === 'open-windowed') handled = openWindowedMode(state);

            if (action === 'go-step') {
                const stepId = normalizeText(actionNode.getAttribute('data-step')).toLowerCase();
                if (stepId === 'landing') handled = goLanding(state);
                if (stepId === 'categories' && getCurrentProgressStep(state) !== 'landing') handled = goCategories(state);
                if (stepId === 'preview' && state.selectedPatternId) handled = openPreview(state);
                if (stepId === 'exercise' && state.selectedPatternId && getCurrentProgressStep(state) === 'exercise') handled = startExercise(state);
            }

            if (handled) renderApp(state);
        };
    }

    async function mount(root) {
        const state = createState(root);
        ensureFonts();
        ensureStylesheet();
        bindEvents(state);
        renderApp(state);

        try {
            state.payload = await loadPayload();
            state.loaded = true;
            applyInitialRouteState(state);
        } catch (error) {
            state.error = error?.message || 'Loading failed';
        }

        renderApp(state);
    }

    function boot() {
        Array.from(document.querySelectorAll(ROOT_SELECTOR)).forEach((root) => {
            if (root.__prismLogicalLevelsMounted) return;
            root.__prismLogicalLevelsMounted = true;
            mount(root);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot, { once: true });
    } else {
        boot();
    }
})(typeof window !== 'undefined' ? window : globalThis, typeof document !== 'undefined' ? document : null);
