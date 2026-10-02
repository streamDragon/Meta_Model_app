// "Why it matters" — big-picture reasons shown by the WhyItMatters button.
// Each feature gets its own pool; GENERAL_REASONS apply everywhere and are
// mixed in so every press can surface a fresh angle.

export interface WhyReason {
  /** Short headline — the big-picture hook. */
  title: string;
  /** One or two sentences connecting the exercise to real life. */
  body: string;
}

export const GENERAL_REASONS: WhyReason[] = [
  { title: 'שאלה אחת שמתאימה למטרה', body: 'קודם בודקים מה האדם מבקש. אפשר לבחור להקשיב, לברר פרט או להציע צעד; אין צורך לחפש פגם בכל משפט.' },
  { title: 'להפריד מידע מפרשנות', body: 'מה נאמר או קרה, ומה השלמנו בעצמנו? המשמעות שלנו היא אפשרות לבדיקה עם האדם.' },
];
export const FEATURE_REASONS: Record<string, WhyReason[]> = {
  home: [{ title: 'למצוא את האימון הבא', body: 'הבית מרכז תרגול מומלץ, חזרות וניסיון בשיחה. בחר אימון אחד; אין צורך לעבוד בכל המעבדות יחד.' }],
  conversation: [{ title: 'לבחור תגובה בהקשר', body: 'מתרגלים הקשבה, בירור, הסכמה ותזמון. המשוב מסביר את הבחירה בדוגמה הבדיונית; בשיחה אמיתית בודקים מה מתאים לאדם.' }],
  categories: [{ title: 'מילון לעזרה כשמילה תופסת אותך', body: 'חפש דוגמה או מונח, קרא מה אולי כדאי לברר והמשך לתרגול. הקטגוריה היא כלי עזר לשאלה, ולא תווית על האדם.' }],
  practice: [{ title: 'להבחין בין מילים לבין השלמה', body: 'השלב הראשון בודק דפוס במשפט. השלב השני משתמש בהשלמה שניתנה בתרגיל; הוא אינו מלמד לקרוא מחשבות.' }],
  blueprint: [{ title: 'להפוך כוונה לצעד שאפשר לבצע', body: 'תוצאה, צעד ראשון ומועד הם לב התוכנית. אפשר להוסיף חסמים, תנאים וחלופה לפי הצורך.' }],
  prismlab: [{ title: 'לבחור איפה לשאול', body: 'עובדים על משפט מסוים, בוחרים שכבות רלוונטיות ומקבלים שאלה. נקודת ההתחלה היא הצעה לבדיקת ההבנה, ולא אבחון אוטומטי.' }],
  valueslab: [{ title: 'לברר התנגשות לפני שמציעים פתרון', body: 'מבדילים בין העדפה לבין תנאי מחייב, ובוחרים מה לבדוק. דירוג חשיבות אינו מבטל מגבלה אמיתית.' }],
  'beliefs-reality-lab': [{ title: 'לחזור מניבוי לתצפית', body: 'מפה או יומן מבהירים את המחשבה. ניסוי קטן מאפשר לרשום מה קרה ומה עדיין לא ברור. התוצאה אינה חייבת להתאים לציפייה שלנו.' }],
  'michael-hall-daily-gym': [{ title: 'מקריאה להתנסות אחת', body: 'בחר כרטיס, נסה פעולות ורשום מה שמת לב. השלמה דורשת סימון התנסות; מספר הכרטיס אינו תאריך או מדד לשליטה.' }],
  about: [{ title: 'להבין מה המוצר יכול להראות', body: 'המקורות מסבירים את הרכיבים ואת גבולות הראיות. נקודות תרגול אינן הוכחה ליעילות טיפולית.' }],
  'legacy-tools': [{ title: 'לבחור כלי משלים לפי משימה', body: 'כל כלי שמור מפתח יכולת אחרת, למשל פירוק פועל או שינוי ניסוח. התרגילים המתקדמים משלימים את המסלול הראשי; הם אינם חובה להתחלה.' }],
};

/**
 * Pick a random big-picture reason for a feature: its own pool mixed with the
 * general pool. Avoids repeating `exclude` when more than one option exists.
 */
export function pickReason(
  featureId: string,
  exclude?: WhyReason,
  rng: () => number = Math.random,
): WhyReason {
  const pool = [...(FEATURE_REASONS[featureId] ?? []), ...GENERAL_REASONS];
  const candidates =
    exclude && pool.length > 1 ? pool.filter((r) => r.title !== exclude.title) : pool;
  return candidates[Math.floor(rng() * candidates.length)];
}
