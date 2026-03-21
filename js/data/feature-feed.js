(function attachMetaModelFeatureFeed(global) {
    if (!global || global.MetaModelFeatureFeedItems) return;

    var FEED_ITEMS = Object.freeze([
        Object.freeze({
            id: 'sentence-map',
            titleHe: 'מפת המשפט',
            descHe: 'לפני שמאתגרים - ממפים: חוץ, פנים והפונקציה של המשפט בתוך הקשר.',
            route: '/feature/sentence-map',
            tab: 'sentence-map',
            tagHe: 'מעבדה',
            category: 'lab',
            thumbType: 'svg',
            thumbSrc: '',
            icon: '🗺️',
            accentFrom: '#0ea5e9',
            accentTo: '#fb7185'
        }),
        Object.freeze({
            id: 'practice-question',
            titleHe: 'תרגול זיהוי המטה-מודל',
            descHe: 'משפט אחד, זיהוי מהיר, ופידבק ברור לכל סבב.',
            route: '/feature/practice-question',
            tab: 'practice-question',
            tagHe: 'תרגול',
            category: 'exercises',
            thumbType: 'svg',
            thumbSrc: '',
            icon: 'ז',
            accentFrom: '#0ea5e9',
            accentTo: '#1d4ed8'
        }),
        Object.freeze({
            id: 'practice-radar',
            titleHe: 'מכ"ם מטה-מודל',
            descHe: 'זיהוי דפוסים בקצב מהיר, עם מדד התקדמות בזמן אמת.',
            route: '/feature/practice-radar',
            tab: 'practice-radar',
            tagHe: 'תרגול',
            category: 'exercises',
            thumbType: 'svg',
            thumbSrc: '',
            icon: 'מ',
            accentFrom: '#14b8a6',
            accentTo: '#0f766e'
        }),
        Object.freeze({
            id: 'practice-triples-radar',
            titleHe: 'מכ"ם שלשות',
            descHe: 'תרגול עם שלשות ברין לזיהוי משפחות דפוס מתקדמות.',
            route: '/feature/practice-triples-radar',
            tab: 'practice-triples-radar',
            tagHe: 'מעבדה',
            category: 'lab',
            thumbType: 'svg',
            thumbSrc: '',
            icon: 'ש',
            accentFrom: '#0ea5e9',
            accentTo: '#0369a1'
        }),
        Object.freeze({
            id: 'practice-wizard',
            titleHe: 'גשר תחושה-שפה',
            descHe: 'הלימה בין המשפט, החוויה והמציאות. רק אחר כך בודקים מה התבהר על המשפט.',
            route: '/feature/practice-wizard',
            tab: 'practice-wizard',
            tagHe: 'הלימה',
            category: 'exercises',
            thumbType: 'svg',
            thumbSrc: '',
            icon: 'ג',
            accentFrom: '#4f46e5',
            accentTo: '#f59e0b'
        }),
        Object.freeze({
            id: 'scenario-trainer',
            titleHe: 'סימולטור סצנות',
            descHe: 'סימולציית שיחה מלאה במסלול עצמאי: בחירה, תוצאה ולמידה מכל מהלך.',
            route: '/scenario_trainer.html',
            tab: '',
            tagHe: 'ביצוע',
            category: 'exercises',
            thumbType: 'svg',
            thumbSrc: '',
            icon: 'ס',
            accentFrom: '#f59e0b',
            accentTo: '#d97706'
        }),
        Object.freeze({
            id: 'comic-engine',
            titleHe: 'במת קומיקס רגשי',
            descHe: 'תרגול תגובות דרך סצנות ויזואליות עם דיאלוג המשך.',
            route: '/feature/comic-engine',
            tab: 'comic-engine',
            tagHe: 'תרגול',
            category: 'exercises',
            thumbType: 'svg',
            thumbSrc: '',
            icon: 'ב',
            accentFrom: '#f97316',
            accentTo: '#c2410c'
        }),
        Object.freeze({
            id: 'prismlab',
            titleHe: 'מעבדת רמות לוגיות',
            descHe: 'חקירה שכבתית ברמות לוגיות ובחירת צעד המשך פרקטי.',
            route: '/feature/prismlab',
            tab: 'prismlab',
            tagHe: 'מעבדה',
            category: 'lab',
            thumbType: 'svg',
            thumbSrc: '',
            icon: 'פ',
            accentFrom: '#8b5cf6',
            accentTo: '#6d28d9'
        }),
        Object.freeze({
            id: 'categories',
            titleHe: 'מילון הקטגוריות',
            descHe: 'מרכז ידע מהיר עם דוגמאות ושאלות המשך לכל קטגוריה.',
            route: '/feature/categories',
            tab: 'categories',
            tagHe: 'ידע',
            category: 'knowledge',
            thumbType: 'svg',
            thumbSrc: '',
            icon: 'י',
            accentFrom: '#0ea5e9',
            accentTo: '#1e3a8a'
        }),
        Object.freeze({
            id: 'blueprint',
            titleHe: 'בונה מהלך',
            descHe: 'הפיכת תובנה לתכנית שיחה: מטרה, טקטיקה, ומה עושים אם זה נתקע.',
            route: '/feature/blueprint',
            tab: 'blueprint',
            tagHe: 'מעבדה',
            category: 'lab',
            thumbType: 'svg',
            thumbSrc: '',
            icon: 'מ',
            accentFrom: '#06b6d4',
            accentTo: '#0e7490'
        }),
        Object.freeze({
            id: 'about',
            titleHe: 'הגדרות ומידע',
            descHe: 'סיכום יכולות, גרסה, וקישורי מידע על הפרויקט.',
            route: '/feature/about',
            tab: 'about',
            tagHe: 'הגדרות',
            category: 'settings',
            thumbType: 'svg',
            thumbSrc: '',
            icon: 'ע',
            accentFrom: '#64748b',
            accentTo: '#334155'
        })
    ]);

    var TICKER_MESSAGES = Object.freeze([
        'חדש: מפת המשפט עוזרת למפות חוץ, פנים וקשר לפני שמאתגרים את מה שנאמר.',
        'הבית נשאר שער פתיחה קצר, והמסלולים המלאים נפתחים בנתיב החי שלהם.',
        'טיפ: אם המשפט מרגיש דחוס, ממפים קודם את שלוש השכבות ורק אחר כך בוחרים שאלה או התערבות.',
        'עדכון: סימולטור הסצנות נפתח עכשיו במסלול עצמאי, והבית נשאר משגר נקי.'
    ]);

    var FEED_CATEGORIES = Object.freeze([
        Object.freeze({ key: 'all', label: 'הכול' }),
        Object.freeze({ key: 'exercises', label: 'תרגול' }),
        Object.freeze({ key: 'lab', label: 'מעבדה' }),
        Object.freeze({ key: 'knowledge', label: 'ידע' }),
        Object.freeze({ key: 'settings', label: 'הגדרות' })
    ]);

    global.MetaModelFeatureFeedItems = FEED_ITEMS;
    global.MetaModelFeatureFeedTickerMessages = TICKER_MESSAGES;
    global.MetaModelFeatureFeedCategories = FEED_CATEGORIES;
})(window);
