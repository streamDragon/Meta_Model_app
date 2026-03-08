(function initMetaTrainerPlatformContracts(global) {
    if (!global || global.MetaTrainerPlatformContracts) return;

    const contracts = Object.freeze({
        'classic2': Object.freeze({
            id: 'classic2',
            title: 'Classic 2 · Structure of Magic',
            subtitle: 'מזהים קטגוריה, מסמנים משפטים, ובודקים מול טבלת ברין אחת בסדר קנוני קבוע.',
            familyLabel: 'משפחת קלאסיק',
            quickStartLabel: 'מתחילים מכאן',
            startActionLabel: 'התחל סבב',
            settingsTitle: 'לוח הבקרה של Classic 2',
            settingsSubtitle: 'מגדירים מה לתרגל, כמה עומס לשים, ואיך טבלת ברין תופיע.',
            helperSteps: Object.freeze([
                Object.freeze({ title: '1. בחר/י או השאר/י ברירת מחדל', description: 'אפשר להתחיל ישר או לכוונן עומס, תצוגה וקטגוריות.' }),
                Object.freeze({ title: '2. קרא/י ועבוד/י בתוך הטקסט', description: 'בחר/י קטגוריה אחת ונסה/י לזהות איפה היא באמת מופיעה.' }),
                Object.freeze({ title: '3. בדוק/י, למד/י והמשך/י', description: 'קבל/י משוב, פתח/י רמז או פתרון, ואז עבור/י לסבב הבא.' })
            ]),
            wrapper: Object.freeze({
                pageTitle: 'Classic 2 - Structure of Magic Trainer',
                mountId: 'classic2-root',
                loadingTitle: 'טוען את Classic 2...',
                loadingText: 'מכין את סביבת האימון של Structure of Magic עם טקסט, קטגוריות ומשוב חי.',
                errorTitle: 'שגיאה בטעינת Classic 2',
                navLinks: Object.freeze([
                    Object.freeze({ href: 'index.html', label: 'חזרה לדף הראשי' }),
                    Object.freeze({ href: 'classic_classic_trainer.html', label: 'Classic Classic' }),
                    Object.freeze({ href: 'iceberg_templates_trainer.html', label: 'Iceberg Templates' })
                ]),
                accent: Object.freeze({
                    primary: '#1d4ed8',
                    border: '#bfdbfe',
                    glow: 'rgba(59,130,246,0.18)',
                    background: 'radial-gradient(circle at 10% 10%, #dbeafe, #f8fafc 45%, #ecfeff)'
                })
            })
        }),
        'classic-classic': Object.freeze({
            id: 'classic-classic',
            title: 'Classic Classic · זיהוי תבניות',
            subtitle: 'מזהים את המבנה המרכזי, בודקים תשובה, ומבינים למה הבחירה נכונה או שגויה.',
            familyLabel: 'משפחת קלאסיק',
            quickStartLabel: 'פתיחת תרגול',
            startActionLabel: 'התחל תרגול',
            settingsTitle: 'הגדרות Classic Classic',
            settingsSubtitle: 'מכווננים מצב, קושי, עומס וסוגי קטגוריות לפני הסשן או במהלכו.',
            helperSteps: Object.freeze([
                Object.freeze({ title: '1. משאירים ברירת מחדל או משנים', description: 'אפשר להתחיל מיד או לפתוח הגדרות קצרות לפני הכניסה לסשן.' }),
                Object.freeze({ title: '2. קוראים ובוחרים תשובה', description: 'קולטים את המשפט, מזהים את השלב, ובוחרים את התשובה המתאימה.' }),
                Object.freeze({ title: '3. בודקים, מבינים, ממשיכים', description: 'מקבלים הסבר יציב, מסכמים את השאלה, וממשיכים לסבב הבא.' })
            ]),
            wrapper: Object.freeze({
                pageTitle: 'Classic Classic - Meta Model Trainer',
                mountId: 'classic-classic-app',
                loadingTitle: 'טוען את Classic Classic...',
                loadingText: 'מכין את מסך זיהוי התבניות עם שלבים, משוב והסבר יציב.',
                errorTitle: 'שגיאה בטעינת Classic Classic',
                navLinks: Object.freeze([
                    Object.freeze({ href: 'index.html', label: 'חזרה לדף הראשי' }),
                    Object.freeze({ href: 'classic2_trainer.html', label: 'Classic 2' }),
                    Object.freeze({ href: 'iceberg_templates_trainer.html', label: 'Iceberg Templates' })
                ]),
                accent: Object.freeze({
                    primary: '#2563eb',
                    border: '#bfdbfe',
                    glow: 'rgba(37,99,235,0.16)',
                    background: 'radial-gradient(circle at 15% 12%, #dbeafe 0%, transparent 38%), radial-gradient(circle at 88% 18%, #e0f2fe 0%, transparent 34%), radial-gradient(circle at 80% 80%, #fef3c7 0%, transparent 30%), linear-gradient(160deg, #eff6ff, #f8fafc 60%, #fff7ed)'
                })
            })
        }),
        'iceberg-templates': Object.freeze({
            id: 'iceberg-templates',
            title: 'קצה קרחון / עצי הבחנה',
            subtitle: 'ממיינים אמירה לתוך מבנה חשיבה, רואים הסתעפויות, ובודקים חלופות במקום להינעל על פירוש אחד.',
            familyLabel: 'משפחת עצים וסכמות',
            quickStartLabel: 'כניסה לאימון',
            startActionLabel: 'התחל אימון',
            settingsTitle: 'הגדרות Iceberg Templates',
            settingsSubtitle: 'בוחרים איך להיכנס לאימון, אילו עזרי עבודה לראות, ואיך ייראה הסבב הבא.',
            helperSteps: Object.freeze([
                Object.freeze({ title: '1. קוראים את האמירה', description: 'רואים את המשפט המלא ולא רק טוקן בודד.' }),
                Object.freeze({ title: '2. בוחרים מבנה וממקמים עוגן', description: 'מחליטים איזה סוג עץ מתאים וממקמים בתוכו עוגן אחד.' }),
                Object.freeze({ title: '3. פותחים ענף ובודקים חלופה', description: 'רואים הסתעפות, בודקים אפשרות נוספת, ולוקחים כיוון לשיחה אמיתית.' })
            ]),
            wrapper: Object.freeze({
                pageTitle: 'Iceberg Templates - Iceberg / Branch Trees',
                mountId: 'iceberg-templates-root',
                loadingTitle: 'טוען את קצה הקרחון...',
                loadingText: 'מכין את סביבת העבודה של עצי הבחנה, הסתעפויות וחלופות.',
                errorTitle: 'שגיאה בטעינת Iceberg Templates',
                navLinks: Object.freeze([
                    Object.freeze({ href: 'index.html', label: 'חזרה לדף הראשי' }),
                    Object.freeze({ href: 'classic2_trainer.html', label: 'Classic 2' }),
                    Object.freeze({ href: 'classic_classic_trainer.html', label: 'Classic Classic' })
                ]),
                accent: Object.freeze({
                    primary: '#92400e',
                    border: '#fde68a',
                    glow: 'rgba(245,158,11,0.16)',
                    background: 'radial-gradient(circle at 10% 8%, #fef3c7, #fffaf0 35%, #f8fafc)'
                })
            })
        })
    });

    global.MetaTrainerPlatformContracts = contracts;
    global.getMetaTrainerPlatformContract = function getMetaTrainerPlatformContract(trainerId) {
        return contracts[String(trainerId || '').trim()] || null;
    };
})(typeof globalThis !== 'undefined' ? globalThis : window);
