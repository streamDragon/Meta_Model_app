export interface TrainerHelperStepContract {
  title: string;
  description: string;
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
  processSteps?: ReadonlyArray<TrainerHelperStepContract>;
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
    settingsSubtitle: 'מגדירים מה לתרגל, כמה עומס לשים, ואיך טבלת ברין תופיע.',
    helperSteps: [
      { title: '1. בחר/י או השאר/י ברירת מחדל', description: 'אפשר להתחיל ישר או לכוונן עומס, תצוגה וקטגוריות.' },
      { title: '2. קרא/י ועבוד/י בתוך הטקסט', description: 'בחר/י קטגוריה אחת ונסה/י לזהות איפה היא באמת מופיעה.' },
      { title: '3. בדוק/י, למד/י והמשך/י', description: 'קבל/י משוב, פתח/י רמז או פתרון, ואז עבור/י לסבב הבא.' }
    ],
    wrapper: {
      pageTitle: 'Classic 2 - Structure of Magic Trainer',
      mountId: 'classic2-root',
      loadingTitle: 'טוען את Classic 2...',
      loadingText: 'מכין את סביבת האימון של Structure of Magic עם טקסט, קטגוריות ומשוב חי.',
      errorTitle: 'שגיאה בטעינת Classic 2',
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
