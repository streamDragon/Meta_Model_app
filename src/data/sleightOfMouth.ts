/**
 * Three Hebrew, human-curated language structures for the first Sleight of Mouth
 * practice release. No NLP classifier, model API or automatic therapeutic scoring.
 *
 * Derived as original training examples from the course's October 2026 booklet:
 * "זריזות הלשון", Center OMEK, Haggai Sofer & Haim Perkel, edition 05.
 * The distinctions between questioning and reframing also follow the 2024
 * "שילוב זריזות לשון ומטה מודל" course note.
 */
export type StructureId = 'generalization' | 'causality' | 'equivalence';
export type MoveId = 'counterexample' | 'redefinition' | 'consequence';

export interface WordSlot {
  text: string;
  role: string;
  explanation: string;
  metaQuestion: string;
  choices: string[];
}

export interface LanguageCase {
  id: StructureId;
  title: string;
  situation: string;
  words: WordSlot[];
  event: string;
  relationship: string;
  conclusion: string;
  firstQuestion: string;
  examples: Record<MoveId, string>;
  caution: string;
}

export const REFRAIMING_MOVES: ReadonlyArray<{
  id: MoveId; label: string; cue: string; family: string;
}> = [
  { id: 'counterexample', label: 'דוגמה נגדית', cue: 'מתי זה לא היה נכון?', family: 'בדיקת הכלל' },
  { id: 'redefinition', label: 'הגדרה מחדש', cue: 'איזו משמעות נוספת אפשר להציע?', family: 'משמעות ומטרה' },
  { id: 'consequence', label: 'השלכות', cue: 'מה המחיר או התועלת של הכלל?', family: 'מבט והשלכות' },
];

export const LANGUAGE_CASES: ReadonlyArray<LanguageCase> = [
  {
    id: 'generalization',
    title: 'הכללה',
    situation: 'חדר מורים: מורה לא רוצה להתווכח בישיבת צוות.',
    words: [
      { text: 'תמיד', role: 'כמת כולל', explanation: 'מילה אחת הופכת העדפה לכלל ללא חריגים.', metaQuestion: 'תמיד? יש מצב שבו מחלוקת עניינית עזרה?', choices: ['תמיד', 'לפעמים', 'במצבים מסוימים'] },
      { text: 'עדיף', role: 'הערכה', explanation: 'קריטריון שנשמע מוסכם אף שלא נאמר לפי מה.', metaQuestion: 'עדיף לפי איזה מדד: נוחות, איכות או יחס?', choices: ['עדיף', 'נעים יותר', 'קל יותר'] },
      { text: 'להימנע', role: 'פועל', explanation: 'פעולה שמצמצמת אפשרויות תגובה לשתיקה או הימנעות.', metaQuestion: 'מה עוד אפשר לעשות במקום להימנע?', choices: ['להימנע', 'להיזהר', 'לא למהר להיכנס'] },
      { text: 'ממחלוקת', role: 'תחום הכלל', explanation: 'האם מדובר בכל אי-הסכמה או רק בוויכוח פוגעני?', metaQuestion: 'מאיזו מחלוקת בדיוק?', choices: ['ממחלוקת', 'מוויכוח סוער', 'מעימות פוגעני'] },
    ],
    event: 'יש מחלוקת',
    relationship: 'בכל מצב עדיף',
    conclusion: 'להימנע ממנה',
    firstQuestion: 'מתי דווקא יש ערך למחלוקת מכבדת?',
    examples: {
      counterexample: 'הייתה פעם שבה אי-הסכמה מכבדת עזרה לצוות לקבל החלטה טובה יותר?',
      redefinition: 'אולי מחלוקת עניינית היא דרך לברר רעיונות ולא בהכרח ריב?',
      consequence: 'מה עלול להתפספס בצוות אם כולם יימנעו תמיד מהבעת עמדה?',
    },
    caution: 'אם השיחה מתלהטת, לפעמים עדיף לעצור ולא לחפש ניסוח מתוחכם.',
  },
  {
    id: 'causality',
    title: 'סיבה ותוצאה',
    situation: 'עבודה: אחרי הערה לא נעימה בישיבה, עובד נמנע מלהציע רעיונות.',
    words: [
      { text: 'בגלל', role: 'קשר סיבתי', explanation: 'מילת הקישור מציגה את ההערה כגורם היחיד לבחירה.', metaQuestion: 'איך בדיוק ההערה קשורה להחלטה שלך?', choices: ['בגלל', 'אחרי', 'למרות'] },
      { text: 'ההערה של המנהל,', role: 'אירוע', explanation: 'מה נאמר בפועל, ומה רק פורש מתוך האירוע?', metaQuestion: 'מה בדיוק אמר המנהל?', choices: ['ההערה של המנהל,', 'התגובה בישיבה,', 'המשוב שקיבלתי,'] },
      { text: 'אני', role: 'מבצע הפעולה', explanation: 'נשארת אפשרות בחירה גם כשהרגש ממשי.', metaQuestion: 'איזו אפשרות פעולה עדיין נמצאת בידיך?', choices: ['אני'] },
      { text: 'מפסיק', role: 'פועל', explanation: 'האם ההימנעות היא החלטה סופית או תגובה זמנית?', metaQuestion: 'הפסקת תמיד, או לעת עתה?', choices: ['מפסיק', 'שוקל להפסיק', 'חושש להמשיך'] },
      { text: 'להציע רעיונות', role: 'פעולה בהקשר', explanation: 'מפרידים בין פעולה מסוימת לבין יכולת כללית.', metaQuestion: 'באילו פגישות או עם מי אתה מתלבט לשתף?', choices: ['להציע רעיונות', 'לדבר בישיבות', 'לשתף הצעות חדשות'] },
    ],
    event: 'הערת מנהל',
    relationship: 'גרמה לי / בגלל',
    conclusion: 'להפסיק להציע רעיונות',
    firstQuestion: 'מה בדיוק בהערה הוביל אותך לבחור שלא להציע רעיונות?',
    examples: {
      counterexample: 'האם זכורה לך פעם שבה קיבלת הערה ובכל זאת המשכת להציע רעיונות?',
      redefinition: 'אולי ההערה היא משוב אחד על רעיון מסוים, ולא פסק דין על כל הרעיונות שלך?',
      consequence: 'מה יפסיד הצוות אם תפסיק לשתף אותו ברעיונות שלך?',
    },
    caution: 'אין כאן ניסיון להניח שהמנהל התכוון לטוב; מתחילים ממה שבאמת נאמר.',
  },
  {
    id: 'equivalence',
    title: 'שקילות ומשמעות',
    situation: 'לימודים ועבודה: אדם מפרש בקשת עזרה כסימן לחוסר יכולת.',
    words: [
      { text: 'בקשת עזרה', role: 'אירוע', explanation: 'זו פעולה נצפית. המסקנה עליה אינה חלק מהפעולה.', metaQuestion: 'באיזה חלק של המשימה ביקשת עזרה?', choices: ['בקשת עזרה', 'התייעצות מקצועית', 'פנייה לעזרה'] },
      { text: 'אומרת', role: 'קשר של משמעות', explanation: 'המילה מחברת פעולה אחת לזהות או לכישורים של אדם.', metaQuestion: 'לפי מה הבקשה מוכיחה את המסקנה?', choices: ['אומרת', 'לא בהכרח אומרת'] },
      { text: 'שאני לא מסוגל', role: 'מסקנה', explanation: 'מסקנה על האדם כולו בעקבות מקרה יחיד.', metaQuestion: 'מה בדיוק אינך מסוגל לעשות בלי העזרה?', choices: ['שאני לא מסוגל', 'שאני עדיין לומד', 'שאני נעזר במישהו'] },
    ],
    event: 'ביקשתי עזרה',
    relationship: 'זה אומר ש…',
    conclusion: 'אני לא מסוגל',
    firstQuestion: 'מה בבקשת העזרה עצמה מלמד על היכולת שלך?',
    examples: {
      counterexample: 'אתה מכיר אדם מיומן שנעזר במומחה כשהוא לומד משהו חדש?',
      redefinition: 'ייתכן שבקשת עזרה ממוקדת היא ניהול משאבים, ולא חוסר יכולת?',
      consequence: 'מה קורה להתקדמות שלך כשאתה מחכה לדעת הכול לבד לפני שאתה שואל?',
    },
    caution: 'לא מחליפים קושי אמיתי בסיסמה חיובית. אם יש פער ביכולת, גם אותו אפשר ללמוד.',
  },
];

export function buildStatement(example: LanguageCase, slotIndex: number, choice: string): string {
  return example.words.map((slot, index) => index === slotIndex ? choice : slot.text).join(' ') + '.';
}
