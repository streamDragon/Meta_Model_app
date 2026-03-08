export interface TrainerHelperStepContract {
  title: string;
  description: string;
}

export interface TrainerProcessStepContract {
  id: string;
  label: string;
  description: string;
  shortLabel?: string;
}

export interface TrainerStandaloneWrapperContract {
  pageTitle: string;
  mountId: string;
  loadingTitle: string;
  loadingText: string;
  errorTitle: string;
  navLinks: ReadonlyArray<{ href: string; label: string }>;
  accent?: {
    primary?: string;
    border?: string;
    glow?: string;
    background?: string;
  };
}

export interface TrainerPlatformContract {
  id: string;
  title: string;
  subtitle: string;
  familyLabel: string;
  quickStartLabel: string;
  startActionLabel: string;
  settingsTitle: string;
  settingsSubtitle: string;
  helperSteps: ReadonlyArray<TrainerHelperStepContract>;
  processSteps?: ReadonlyArray<TrainerProcessStepContract>;
  supportRailMode?: string;
  settingsGroups?: ReadonlyArray<string>;
  mobilePriorityOrder?: ReadonlyArray<string>;
  wrapper: TrainerStandaloneWrapperContract;
}

declare global {
  interface Window {
    MetaTrainerPlatformContracts?: Record<string, TrainerPlatformContract>;
  }
}

const FALLBACK_CONTRACTS: Record<string, TrainerPlatformContract> = {
  classic2: {
    id: 'classic2',
    title: 'Classic 2 · Structure of Magic',
    subtitle: 'מזהים קטגוריה, מסמנים משפטים, ובודקים מול טבלת ברין אחת בסדר קנוני קבוע.',
    familyLabel: 'משפחת קלאסיק',
    quickStartLabel: 'מתחילים מכאן',
    startActionLabel: 'התחל סבב',
    settingsTitle: 'לוח הבקרה של Classic 2',
    settingsSubtitle: 'מגדירים מה לתרגל, כמה עומס לשים, ואיך טבלת ברין תופיע. ברירת המחדל כבר מוכנה.',
    helperSteps: [
      { title: '1. בחר/י או השאר/י ברירת מחדל', description: 'אפשר להתחיל ישר או לכוונן עומס, תצוגה וקטגוריות.' },
      { title: '2. קרא/י ועבוד/י בתוך הטקסט', description: 'בחר/י קטגוריה אחת ונסה/י לזהות איפה היא באמת מופיעה.' },
      { title: '3. בדוק/י, למד/י והמשך/י', description: 'קבל/י משוב, פתח/י רמז או פתרון, ואז עבור/י לסבב הבא.' }
    ],
    processSteps: [
      { id: 'prepare', label: '1. מכוונים את הסשן', shortLabel: 'מכוונים', description: 'אפשר להישאר עם ברירת המחדל או למקד תחום, עומס ותצוגה.' },
      { id: 'choose-category', label: '2. בוחרים קטגוריה', shortLabel: 'קטגוריה', description: 'עובדים מול מפת ברין קנונית כדי לבנות זיכרון מסך יציב.' },
      { id: 'mark-text', label: '3. מסמנים בתוך הטקסט', shortLabel: 'מסמנים', description: 'מחפשים איפה הקטגוריה באמת מופיעה ולא מסתמכים על תחושה כללית.' },
      { id: 'check', label: '4. בודקים את הבחירה', shortLabel: 'בודקים', description: 'מקבלים משוב, רמז או פתרון ורואים אם הסימון היה מלא ומדויק.' },
      { id: 'continue', label: '5. ממשיכים לסבב הבא', shortLabel: 'ממשיכים', description: 'לוקחים את הדיוק לסשן הבא בלי לאבד את אותו סדר מסך.' }
    ],
    supportRailMode: 'breen-map',
    settingsGroups: ['what-to-practice', 'session-load', 'display-mode', 'categories', 'difficulty', 'text-source'],
    mobilePriorityOrder: ['start', 'helper', 'main', 'support'],
    wrapper: {
      pageTitle: 'Classic 2 - Structure of Magic Trainer',
      mountId: 'classic2-root',
      loadingTitle: 'טוען את Classic 2...',
      loadingText: 'מכין את סביבת האימון של Structure of Magic עם טקסט, קטגוריות ומשוב חי.',
      errorTitle: 'שגיאה בטעינת Classic 2',
      navLinks: []
    }
  },
  'classic-classic': {
    id: 'classic-classic',
    title: 'Classic Classic · זיהוי תבניות',
    subtitle: 'מזהים את המבנה המרכזי, בודקים תשובה, ומבינים למה הבחירה נכונה או שגויה.',
    familyLabel: 'משפחת קלאסיק',
    quickStartLabel: 'פתיחת תרגול',
    startActionLabel: 'התחל תרגול',
    settingsTitle: 'הגדרות Classic Classic',
    settingsSubtitle: 'מכווננים מצב, קושי, עומס ומשפחת תרגול לפני הסשן או במהלכו.',
    helperSteps: [
      { title: '1. משאירים ברירת מחדל או משנים', description: 'אפשר להתחיל מיד או לפתוח הגדרות קצרות לפני הכניסה לסשן.' },
      { title: '2. קוראים ובוחרים תשובה', description: 'קולטים את המשפט, מזהים את השלב, ובוחרים את התשובה המתאימה.' },
      { title: '3. בודקים, מבינים, ממשיכים', description: 'מקבלים הסבר יציב, מסכמים את השאלה, וממשיכים לסבב הבא.' }
    ],
    processSteps: [
      { id: 'context', label: 'שלב 1 — שומעים את המשפט', shortLabel: 'שומעים', description: 'מקבלים הקשר מלא ורואים איפה כדאי לעצור את המבט.' },
      { id: 'question', label: 'שלב 2 — בוחרים שאלת בירור', shortLabel: 'שאלת בירור', description: 'מחזירים מידע חסר במקום לקפוץ לפרשנות או פתרון.' },
      { id: 'problem', label: 'שלב 3 — מזהים את המבנה', shortLabel: 'המבנה', description: 'נותנים שם לפער הלשוני המרכזי.' },
      { id: 'goal', label: 'שלב 4 — מחדדים מה חסר', shortLabel: 'מה חסר', description: 'מנסחים איזה מידע צריך להחזיר כדי שהמפה תהיה בת-בדיקה.' },
      { id: 'summary', label: 'שלב 5 — מסכמים ולוקחים הלאה', shortLabel: 'סיכום', description: 'מחברים את מה שנאמר, מה זוהה, ומה לוקחים לסבב הבא.' }
    ],
    supportRailMode: 'guided-explanation',
    settingsGroups: ['what-to-practice', 'session-load', 'categories', 'advanced'],
    mobilePriorityOrder: ['start', 'main', 'support'],
    wrapper: {
      pageTitle: 'Classic Classic - Meta Model Trainer',
      mountId: 'classic-classic-app',
      loadingTitle: 'טוען את Classic Classic...',
      loadingText: 'מכין את מסך זיהוי התבניות עם שלבים, משוב והסבר יציב.',
      errorTitle: 'שגיאה בטעינת Classic Classic',
      navLinks: []
    }
  },
  'iceberg-templates': {
    id: 'iceberg-templates',
    title: 'קצה קרחון / עצי הבחנה',
    subtitle: 'ממיינים אמירה לתוך מבנה חשיבה, רואים הסתעפויות, ובודקים חלופות במקום להינעל על פירוש אחד.',
    familyLabel: 'משפחת עצים וסכמות',
    quickStartLabel: 'כניסה לאימון',
    startActionLabel: 'התחל אימון',
    settingsTitle: 'הגדרות Iceberg Templates',
    settingsSubtitle: 'בוחרים איך להיכנס לאימון, אילו עזרי עבודה לראות, ואיך ייראה הסבב הבא.',
    helperSteps: [
      { title: '1. קוראים את האמירה', description: 'רואים את המשפט המלא ולא רק טוקן בודד.' },
      { title: '2. בוחרים מבנה וממקמים עוגן', description: 'מחליטים איזה סוג עץ מתאים וממקמים בתוכו עוגן אחד.' },
      { title: '3. פותחים ענף ובודקים חלופה', description: 'רואים הסתעפות, בודקים אפשרות נוספת, ולוקחים כיוון לשיחה אמיתית.' }
    ],
    processSteps: [
      { id: 'read', label: '1. קוראים את האמירה', shortLabel: 'קוראים', description: 'קולטים את המשפט המלא ולא רק טוקן בודד.' },
      { id: 'choose', label: '2. בוחרים מבנה', shortLabel: 'מבנה', description: 'מחליטים איזה סוג עץ מתאים לבדיקה.' },
      { id: 'place', label: '3. משבצים את העוגן', shortLabel: 'משבצים', description: 'ממקמים את המילה או הביטוי בתוך המבנה.' },
      { id: 'reveal', label: '4. רואים את ההסתעפות', shortLabel: 'הסתעפות', description: 'מבינים מה המבנה פותח ומה עוד יכול להתפצל.' },
      { id: 'branch', label: '5. בודקים חלופה', shortLabel: 'חלופה', description: 'שואלים מה קורה אם בוחרים ענף אחר או פירוש אחר.' }
    ],
    supportRailMode: 'branching-tree',
    settingsGroups: ['entry-mode', 'scenario', 'workspace-aids', 'advanced'],
    mobilePriorityOrder: ['start', 'main', 'support'],
    wrapper: {
      pageTitle: 'Iceberg Templates - Iceberg / Branch Trees',
      mountId: 'iceberg-templates-root',
      loadingTitle: 'טוען את קצה הקרחון...',
      loadingText: 'מכין את סביבת העבודה של עצי הבחנה, הסתעפויות וחלופות.',
      errorTitle: 'שגיאה בטעינת Iceberg Templates',
      navLinks: []
    }
  }
};

export function getTrainerContract(id: string): TrainerPlatformContract {
  const key = String(id || '').trim();
  if (typeof window !== 'undefined' && window.MetaTrainerPlatformContracts?.[key]) {
    return window.MetaTrainerPlatformContracts[key];
  }
  if (FALLBACK_CONTRACTS[key]) return FALLBACK_CONTRACTS[key];
  return {
    id: key,
    title: key,
    subtitle: '',
    familyLabel: '',
    quickStartLabel: 'מתחילים',
    startActionLabel: 'התחל',
    settingsTitle: 'הגדרות',
    settingsSubtitle: '',
    helperSteps: [],
    processSteps: [],
    supportRailMode: 'default',
    settingsGroups: [],
    mobilePriorityOrder: ['start', 'main', 'support'],
    wrapper: {
      pageTitle: key,
      mountId: 'trainer-root',
      loadingTitle: 'טוען...',
      loadingText: '',
      errorTitle: 'שגיאה בטעינה',
      navLinks: []
    }
  };
}
