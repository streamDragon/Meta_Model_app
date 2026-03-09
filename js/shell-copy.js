(function initMetaShellCopy(global) {
    'use strict';

    if (!global) return;
    if (global.MetaShellCopy) return;

    const ACTIONS = Object.freeze({
        menu: 'תפריט',
        guide: 'היגיון',
        help: 'עזרה',
        theory: 'רקע',
        details: 'פרטים',
        stats: 'נתונים',
        history: 'היסטוריה',
        settings: 'הגדרות',
        schema: 'סכימה',
        export: 'ייצוא',
        about: 'על המוצר',
        resume: 'המשך',
        legacy: 'מצב ישן',
        close: 'סגירה',
        startSession: 'התחל סשן'
    });

    const GROUPS = Object.freeze({
        home: 'בית',
        exercises: 'תרגול',
        lab: 'מעבדה',
        knowledge: 'ידע',
        settings: 'הגדרות'
    });

    const SHELL = Object.freeze({
        kicker: 'מעטפת עבודה',
        bottomSummary: 'המשך ומצב',
        fallbackTitle: 'המעבר למעטפת נכשל',
        fallbackBody: 'אפשר לעבור זמנית למצב הישן בלי לאבד את התרגול.',
        openLegacy: 'פתח מצב ישן',
        continueNone: 'אין נקודת המשך שמורה עדיין.',
        lastPanelNone: 'עדיין לא נפתח חלון משנה.',
        lastOpenedAtNone: 'עדיין לא נרשמה פתיחה של חלון משנה.'
    });

    const PANELS = Object.freeze({
        guideKicker: 'לפני שמתחילים',
        menuKicker: 'תפריט',
        detailsKicker: 'משטח משנה',
        statsKicker: 'נתונים',
        aboutKicker: 'רקע',
        stateKicker: 'מצב'
    });

    const SCREENS = Object.freeze({
        home: Object.freeze({
            title: 'מסך הבית',
            subtitle: 'בחירה מהירה של מסלול. תפריט, רקע ועזרה נפתחים בשכבה.'
        }),
        'practice-question': Object.freeze({
            title: 'תרגול זיהוי',
            subtitle: 'משפט אחד בכל סבב. הסבר ונתוני סשן נפתחים בשכבה.'
        }),
        'practice-radar': Object.freeze({
            title: 'מכ"ם מטה-מודל',
            subtitle: 'זיהוי מהיר במרכז. עזרה ומשוב מצטבר נפתחים בשכבה.'
        }),
        'practice-triples-radar': Object.freeze({
            title: 'מכ"ם שלשות',
            subtitle: 'הטבלה והעקרונות זמינים בשכבה. משטח הבחירה נשאר במרכז.'
        }),
        'practice-wizard': Object.freeze({
            title: 'גשר תחושה-שפה',
            subtitle: 'בונים הלימה בין משפט, חוויה ומציאות; תובנת Meta Model נפתחת רק אחרי הנחיתה.'
        }),
        'practice-verb-unzip': Object.freeze({
            title: 'מרכז כלים',
            subtitle: 'מסך העבודה נשאר יציב. הגדרות, עזרה ונתונים נפתחים בשכבה.'
        }),
        'scenario-trainer': Object.freeze({
            title: 'סימולטור סצנות',
            subtitle: 'הסצנה הפעילה נשארת במרכז. מסכי עזר נפתחים בשכבה.'
        }),
        'comic-engine': Object.freeze({
            title: 'במת קומיקס רגשי',
            subtitle: 'הבמה נשארת חיה. רקע והסבר נפתחים בשכבה.'
        }),
        categories: Object.freeze({
            title: 'מילון הקטגוריות',
            subtitle: 'רשימת הקטגוריות נשארת פתוחה. מבוא והיגיון נפתחים בשכבה.'
        }),
        blueprint: Object.freeze({
            title: 'בונה מהלך',
            subtitle: 'השלבים נשארים רציפים. היגיון וייצוא נפתחים בשכבה.'
        }),
        prismlab: Object.freeze({
            title: 'מעבדת פריזמות',
            subtitle: 'מפת העבודה נשארת במרכז. עומק, הסבר וייצוא נפתחים בשכבה.'
        }),
        about: Object.freeze({
            title: 'על המוצר',
            subtitle: 'הקהילה נשארת במרכז. הרקע והשפה המתודולוגית נפתחים בשכבה.'
        })
    });

    global.MetaShellCopy = Object.freeze({
        ACTIONS,
        GROUPS,
        SHELL,
        PANELS,
        SCREENS
    });
})(typeof window !== 'undefined' ? window : globalThis);
