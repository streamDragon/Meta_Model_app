// Original educational prompts based on the 14 pattern names in Robert Dilts'
// Sleight of Mouth and the user's "Sleight_of_Mouth_Content_System_HE" booklet.
// This is a rule-based offline teaching simulation, not an NLP or clinical assessment.
export type PatternFamily = 'משמעות ומטרה' | 'רזולוציה והקשר' | 'מבט והשלכות' | 'בדיקת הכלל';

export interface SleightPattern {
  id: number;
  name: string;
  english: string;
  family: PatternFamily;
  movement: string;
  line: string;
  patientReply: string;
  change: 'opening' | 'mixed' | 'resistance';
}

export const SLEIGHT_PATTERNS: SleightPattern[] = [
  { id: 1, name: 'כוונה', english: 'Intention', family: 'משמעות ומטרה',
    movement: 'לפגוש את הערך שהטענה מגינה עליו',
    line: 'נשמע שכבוד הדדי חשוב לך. איך היית רוצה שהחתן יבטא אותו?',
    patientReply: 'נכון, חשוב לי כבוד. אולי לא רק השעון מעניין אותי.',
    change: 'opening' },
  { id: 2, name: 'הגדרה מחדש', english: 'Redefine', family: 'משמעות ומטרה',
    movement: 'לבדוק פירוש אחר, בלי למחוק את העובדה',
    line: 'הוא איחר. האם איחור בהכרח אומר זלזול, או שאולי פירושו קושי בהתארגנות?',
    patientReply: 'אני לא בטוח. לפעמים הוא גם באמת לא מאורגן.',
    change: 'opening' },
  { id: 3, name: 'השלכות', english: 'Consequence', family: 'מבט והשלכות',
    movement: 'לבחון מה האמונה יוצרת בהמשך',
    line: 'מה קורה לקשר ביניכם כשכל איחור מתפרש כחוסר כבוד?',
    patientReply: 'אני נעשה כועס עוד לפני שהוא נכנס. זה לא מועיל.',
    change: 'opening' },
  { id: 4, name: 'פירוט', english: 'Chunk Down', family: 'רזולוציה והקשר',
    movement: 'לרדת לפרט שממנו נעשתה הקפיצה למשמעות',
    line: 'האם דווקא 25 הדקות, אי־ההודעה או משהו אחר גרם לך להרגיש שלא מכבדים אותך?',
    patientReply: 'בעיקר זה שההודעה הגיעה מאוחר מדי, לא מספר הדקות.',
    change: 'opening' },
  { id: 5, name: 'הרחבה לרמה כללית', english: 'Chunk Up', family: 'רזולוציה והקשר',
    movement: 'לעלות לערך או לקטגוריה רחבה יותר',
    line: 'מהו כבוד במשפחה מעבר להגעה מדויקת בשעה?',
    patientReply: 'גם אכפתיות, התעניינות ועזרה. הוא דווקא עוזר הרבה.',
    change: 'opening' },
  { id: 6, name: 'אנלוגיה', english: 'Analogy', family: 'מבט והשלכות',
    movement: 'להציע סיטואציה דומה לבדיקת כלל',
    line: 'אם רופא מאחר כי טיפל במטופל חירום, האם האיחור עצמו מעיד על יחס מזלזל?',
    patientReply: 'זה מקרה אחר. אבל אני מבין למה אתה משווה.',
    change: 'mixed' },
  { id: 7, name: 'שינוי גודל המסגרת', english: 'Change Frame Size', family: 'רזולוציה והקשר',
    movement: 'לשנות את תקופת הזמן או היקף הבדיקה',
    line: 'אם מסתכלים על כל השנה, ולא רק על ערב אחד, איזו תמונה מתקבלת?',
    patientReply: 'ברוב השנה היחסים טובים. העניין של האיחורים חוזר.',
    change: 'opening' },
  { id: 8, name: 'תוצאה נוספת', english: 'Another Outcome', family: 'משמעות ומטרה',
    movement: 'לנסח תוצאה שהאדם עצמו עשוי לרצות',
    line: 'מעבר לשאלה אם הוא מכבד אותך, מה היית רוצה שיקרה בארוחות המשפחתיות?',
    patientReply: 'הייתי רוצה שנגיע רגועים ושאף אחד לא ייעלב.',
    change: 'opening' },
  { id: 9, name: 'מפת עולם נוספת', english: 'Model of the World', family: 'מבט והשלכות',
    movement: 'להכיר בכך שלאחרים עשויה להיות משמעות אחרת',
    line: 'איך לדעתך אדם שגדל בבית עם שעות גמישות מבין את ההגעה לארוחה?',
    patientReply: 'אצלם אולי זה הרבה פחות טעון. עדיין קשה לי עם זה.',
    change: 'mixed' },
  { id: 10, name: 'בירור בסיס המסקנה', english: 'Reality Strategy', family: 'בדיקת הכלל',
    movement: 'לבדוק לפי מה האדם יודע שהפירוש נכון',
    line: 'מה היית צריך לראות או לשמוע כדי לדעת בוודאות שהוא מזלזל, ולא פשוט מאחר?',
    patientReply: 'אולי לשמוע ממנו במפורש. כרגע אני בעיקר מסיק.',
    change: 'opening' },
  { id: 11, name: 'דוגמה נגדית', english: 'Counterexample', family: 'בדיקת הכלל',
    movement: 'לחפש חריג אמיתי לכלל',
    line: 'היה אדם שאיחר לך ובכל זאת הרגשת שהוא מכבד אותך?',
    patientReply: 'כן, חבר טוב שלי. גם הוא מאחר לפעמים.',
    change: 'opening' },
  { id: 12, name: 'היררכיית קריטריונים', english: 'Hierarchy of Criteria', family: 'משמעות ומטרה',
    movement: 'לבחון איזה ערך חשוב יותר בהקשר הזה',
    line: 'מה חשוב יותר לך בערב המשפחתי: הדיוק של כל אחד או החום והקשר ביניכם?',
    patientReply: 'שניהם חשובים. אני לא רוצה לוותר לגמרי על דיוק.',
    change: 'mixed' },
  { id: 13, name: 'החלה עצמית', english: 'Apply to Self', family: 'בדיקת הכלל',
    movement: 'לבדוק בעדינות האם הכלל חל גם על עצמו',
    line: 'כשאתה מאחר לפעמים, האם זה תמיד אומר שאינך מכבד את מי שממתין?',
    patientReply: 'לא. כשהדבר קורה לי יש לי סיבות. זו נקודה.',
    change: 'opening' },
  { id: 14, name: 'מסגרת על', english: 'Meta Frame', family: 'בדיקת הכלל',
    movement: 'לבחון את הכלל שמארגן את השיפוט',
    line: 'יכול להיות שבמשפחה שלך דיוק בזמנים הוא המדד העיקרי לכבוד. האם זה המדד היחיד המתאים כאן?',
    patientReply: 'אולי אני משתמש בכלל של הבית שגדלתי בו.',
    change: 'opening' },
];

export const SLEIGHT_FAMILIES: PatternFamily[] = [
  'משמעות ומטרה', 'רזולוציה והקשר', 'מבט והשלכות', 'בדיקת הכלל'
];

export const CORE_CASE = {
  title: 'החתן שמאחר',
  story: 'החתן שלי איחר שוב לארוחת שבת. מבחינתי, אם הוא לא מגיע בזמן, הוא לא מכבד אותי.',
  belief: 'אם החתן שלי מאחר, זה אומר שהוא לא מכבד אותי.',
  questions: [
    { question: 'בעיני מי בדיוק האיחור מעיד על חוסר כבוד?', reply: 'בעיניי. הבת שלי אומרת שזה לא נורא בשבילה.', fact: 'הפרשנות היא של האב, לא בהכרח של כל המשפחה.' },
    { question: 'מה ספציפית קרה בפעם האחרונה?', reply: 'הוא הגיע 25 דקות אחרי השעה שקבענו, ושלח הודעה בדרך.', fact: 'איחור של 25 דקות, הודעה בדרך.' },
    { question: 'איך אתה יודע שהאיחור פירושו חוסר כבוד?', reply: 'ככה למדתי בבית. לא שאלתי אותו למה הוא איחר.', fact: 'המשמעות הוסקה, לא נבדקה עם החתן.' },
    { question: 'מתי דווקא הרגשת שהחתן מכבד אותך?', reply: 'כשהוא עזר לי להעביר רהיטים, בלי שביקשתי.', fact: 'יש חוויות אחרות של כבוד ביחסים.' },
  ],
};
