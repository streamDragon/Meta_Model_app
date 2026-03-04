(function attachMetaModelFeatureFeed(global) {
    if (!global || global.MetaModelFeatureFeedItems) return;

    var FEED_ITEMS = Object.freeze([
        Object.freeze({
            id: 'practice-question',
            titleHe: 'תרגול זיהוי Meta-Model',
            descHe: 'משפט אחד, זיהוי מהיר, ופידבק ברור לכל סבב.',
            route: '/feature/practice-question',
            tab: 'practice-question',
            tagHe: 'Exercises',
            category: 'exercises',
            thumbType: 'svg',
            thumbSrc: '',
            icon: 'Q',
            accentFrom: '#0ea5e9',
            accentTo: '#1d4ed8'
        }),
        Object.freeze({
            id: 'practice-radar',
            titleHe: 'Meta Radar',
            descHe: 'זיהוי דפוסים בקצב מהיר, עם מדד התקדמות בזמן אמת.',
            route: '/feature/practice-radar',
            tab: 'practice-radar',
            tagHe: 'Exercises',
            category: 'exercises',
            thumbType: 'svg',
            thumbSrc: '',
            icon: 'R',
            accentFrom: '#14b8a6',
            accentTo: '#0f766e'
        }),
        Object.freeze({
            id: 'practice-triples-radar',
            titleHe: 'Triples Radar',
            descHe: 'תרגול עם שלשות ברין לזיהוי משפחות דפוס מתקדמות.',
            route: '/feature/practice-triples-radar',
            tab: 'practice-triples-radar',
            tagHe: 'Lab',
            category: 'lab',
            thumbType: 'svg',
            thumbSrc: '',
            icon: '3',
            accentFrom: '#0ea5e9',
            accentTo: '#0369a1'
        }),
        Object.freeze({
            id: 'practice-wizard',
            titleHe: 'גשר תחושה-שפה',
            descHe: 'תהליך מובנה לאיסוף חוויה ולהפיכה לשפה מדויקת.',
            route: '/feature/practice-wizard',
            tab: 'practice-wizard',
            tagHe: 'Exercises',
            category: 'exercises',
            thumbType: 'svg',
            thumbSrc: '',
            icon: 'W',
            accentFrom: '#22c55e',
            accentTo: '#15803d'
        }),
        Object.freeze({
            id: 'scenario-trainer',
            titleHe: 'Scenario Trainer',
            descHe: 'סימולציות שיחה מלאות: בחירה, תוצאה, ולמידה מכל מהלך.',
            route: '/feature/scenario-trainer',
            tab: 'scenario-trainer',
            tagHe: 'Execution',
            category: 'exercises',
            thumbType: 'svg',
            thumbSrc: '',
            icon: 'S',
            accentFrom: '#f59e0b',
            accentTo: '#d97706'
        }),
        Object.freeze({
            id: 'comic-engine',
            titleHe: 'Comic Engine',
            descHe: 'תרגול תגובות דרך סצנות ויזואליות עם דיאלוג המשך.',
            route: '/feature/comic-engine',
            tab: 'comic-engine',
            tagHe: 'Exercises',
            category: 'exercises',
            thumbType: 'svg',
            thumbSrc: '',
            icon: 'C',
            accentFrom: '#f97316',
            accentTo: '#c2410c'
        }),
        Object.freeze({
            id: 'prismlab',
            titleHe: 'Prism Lab',
            descHe: 'חקירה שכבתית ברמות לוגיות ובחירת צעד המשך פרקטי.',
            route: '/feature/prismlab',
            tab: 'prismlab',
            tagHe: 'Lab',
            category: 'lab',
            thumbType: 'svg',
            thumbSrc: '',
            icon: 'P',
            accentFrom: '#8b5cf6',
            accentTo: '#6d28d9'
        }),
        Object.freeze({
            id: 'categories',
            titleHe: 'מילון קטגוריות',
            descHe: 'מרכז ידע מהיר עם דוגמאות ושאלות המשך לכל קטגוריה.',
            route: '/feature/categories',
            tab: 'categories',
            tagHe: 'Knowledge',
            category: 'knowledge',
            thumbType: 'svg',
            thumbSrc: '',
            icon: 'K',
            accentFrom: '#0ea5e9',
            accentTo: '#1e3a8a'
        }),
        Object.freeze({
            id: 'blueprint',
            titleHe: 'Blueprint Builder',
            descHe: 'הפיכת תובנה לתכנית שיחה: מטרה, טקטיקה, ו-Plan B.',
            route: '/feature/blueprint',
            tab: 'blueprint',
            tagHe: 'Lab',
            category: 'lab',
            thumbType: 'svg',
            thumbSrc: '',
            icon: 'B',
            accentFrom: '#06b6d4',
            accentTo: '#0e7490'
        }),
        Object.freeze({
            id: 'about',
            titleHe: 'הגדרות ומידע',
            descHe: 'סיכום יכולות, גרסה, וקישורי מידע על הפרויקט.',
            route: '/feature/about',
            tab: 'about',
            tagHe: 'Settings',
            category: 'settings',
            thumbType: 'svg',
            thumbSrc: '',
            icon: 'I',
            accentFrom: '#64748b',
            accentTo: '#334155'
        })
    ]);

    var TICKER_MESSAGES = Object.freeze([
        'חדש: ניווט Route-based מלא - כל פיצ׳ר נפתח במסך נפרד.',
        'טיפ: לחצו על כרטיס כדי להיכנס ישר לתרגול הרלוונטי.',
        'עדכון: מצב מובייל מותאם לגלילה מהירה וכניסה בלחיצה אחת.'
    ]);

    var FEED_CATEGORIES = Object.freeze([
        Object.freeze({ key: 'all', label: 'All' }),
        Object.freeze({ key: 'exercises', label: 'Exercises' }),
        Object.freeze({ key: 'lab', label: 'Lab' }),
        Object.freeze({ key: 'knowledge', label: 'Knowledge' }),
        Object.freeze({ key: 'settings', label: 'Settings' })
    ]);

    global.MetaModelFeatureFeedItems = FEED_ITEMS;
    global.MetaModelFeatureFeedTickerMessages = TICKER_MESSAGES;
    global.MetaModelFeatureFeedCategories = FEED_CATEGORIES;
})(window);
