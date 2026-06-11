export const MICHAEL_HALL_DAILY_CARD_CATEGORIES = [
  'problem-solving',
  'epistemology',
  'phenomenology',
  'beliefs',
  'meta-programs',
  'coaching',
  'leadership',
  'meaning',
] as const;

export type MichaelHallDailyCardCategory =
  (typeof MICHAEL_HALL_DAILY_CARD_CATEGORIES)[number];

export interface MichaelHallDailyCard {
  id: string;
  dayIndex: number;
  sourceSeries: string;
  sourceTitle: string;
  sourceDate?: string;
  category: MichaelHallDailyCardCategory;
  titleHe: string;
  titleEn: string;
  distilledTeachingHe: string;
  keyDistinctionHe: string;
  dailyQuestionHe: string;
  exercisesHe: string[];
  applyTodayHe: string;
  tags: string[];
  sourceNoteHe: string;
}

const sourceSeries = 'Neurons / Neuro-Semantics';
const sourceNoteHe =
  'פרפרזה קצרה לתרגול פנימי. לא מובא כאן מאמר מלא או ניסוח מקור ארוך.';

export const michaelHallDailyCards: MichaelHallDailyCard[] = [
  {
    id: 'mh-day-01',
    dayIndex: 1,
    sourceSeries,
    sourceTitle: 'The structure of a problem',
    category: 'problem-solving',
    titleHe: 'מבנה של בעיה',
    titleEn: 'What is the structure of a problem?',
    distilledTeachingHe:
      'בעיה אינה רק תחושת אי נוחות. היא בנויה מייצוג פנימי, משמעות, מסגרת, מצב רצוי ותנועה שנחסמה. כשמפרידים את החלקים, הבעיה מפסיקה להיות גוש מעורפל והופכת למפה שאפשר לעבוד איתה.',
    keyDistinctionHe:
      'כאב הוא אות; בעיה היא מבנה של משמעות ותנועה חסומה.',
    dailyQuestionHe:
      'מה בדיוק חסום כאן: מידע, פעולה, מיומנות, רגש, משמעות או בחירה?',
    exercisesHe: [
      'כתוב במשפט אחד מה מפריע לך בלי להסביר עדיין למה.',
      'סמן מה המצב הרצוי במקום המצב הנוכחי.',
      'זהה איזו משמעות נתת למצב שהפכה אותו לבעיה.',
    ],
    applyTodayHe:
      'בחר קושי קטן אחד והפוך אותו למפה: מצב נוכחי, מצב רצוי, חסימה אחת, צעד קטן.',
    tags: ['problem-structure', 'reframing', 'desired-state'],
    sourceNoteHe,
  },
  {
    id: 'mh-day-02',
    dayIndex: 2,
    sourceSeries,
    sourceTitle: 'Creating good and bad problems',
    category: 'problem-solving',
    titleHe: 'בעיה טובה מול בעיה רעה',
    titleEn: 'Good problem vs bad problem',
    distilledTeachingHe:
      'יש בעיות שמנוסחות כך שהן מזמינות פתרון, ויש בעיות שמנוסחות כך שהן יוצרות ערפל, אשמה או חוסר אונים. איכות הניסוח קובעת הרבה לפני שמתחילים לפתור.',
    keyDistinctionHe:
      'בעיה טובה ממקדת נתונים ופעולה; בעיה רעה מערבבת זהות, אשמה וניחוש.',
    dailyQuestionHe:
      'האם ניסחתי כאן שאלה שאפשר לעבוד איתה, או סיפור שמחליש אותי?',
    exercisesHe: [
      'כתוב ניסוח "רע" של הבעיה כפי שהוא מופיע בראש.',
      'נקה ממנו הכללות כמו תמיד, אף פעם, כולם.',
      'נסח מחדש כשאלה מעשית אחת.',
    ],
    applyTodayHe:
      'לפני פתרון, שפר את ניסוח הבעיה עד שהוא מצביע על פעולה אפשרית.',
    tags: ['problem-framing', 'clarity', 'agency'],
    sourceNoteHe,
  },
  {
    id: 'mh-day-03',
    dayIndex: 3,
    sourceSeries,
    sourceTitle: 'The 5-minute problem-solving conversation',
    category: 'problem-solving',
    titleHe: 'שיחת פתרון של חמש דקות',
    titleEn: 'Five-minute problem-solving conversation',
    distilledTeachingHe:
      'שיחה קצרה יכולה להזיז בעיה אם היא שואלת שאלות בעלות מנוף: מה קורה, מה רצוי, מה חסר, מה כבר עובד ומה הצעד הבא. המטרה אינה לדבר הרבה, אלא לחתוך אל המבנה.',
    keyDistinctionHe:
      'משך השיחה פחות חשוב מאיכות השאלות שמכוונות את תשומת הלב.',
    dailyQuestionHe:
      'איזו שאלה אחת תקצר לי את הדרך מהתלונה למבנה?',
    exercisesHe: [
      'הגדר טיימר לחמש דקות.',
      'ענה רק על: מה קורה, מה אני רוצה, מה חסר עכשיו.',
      'סיים בצעד הבא שלא דורש פתרון מושלם.',
    ],
    applyTodayHe:
      'נהל עם עצמך שיחת חמש דקות על בעיה אחת, בכתב וללא דרמה.',
    tags: ['high-leverage-questions', 'coaching', 'next-step'],
    sourceNoteHe,
  },
  {
    id: 'mh-day-04',
    dayIndex: 4,
    sourceSeries,
    sourceTitle: "It's all about your approach",
    category: 'problem-solving',
    titleHe: 'הגישה יוצרת את הדרך',
    titleEn: 'Your approach creates the path',
    distilledTeachingHe:
      'לפני פתרון, בדוק את הגישה שאתה מביא. אם אתה נכנס עם לחץ, האשמה או הוכחה עצמית, תראה אפשרויות אחרות מאשר בגישה של סקרנות, אחריות וניסוי.',
    keyDistinctionHe:
      'המסגרת שממנה ניגשים לבעיה משנה את סוג הפתרונות שנראים זמינים.',
    dailyQuestionHe:
      'מאיזו עמדה פנימית אני פוגש את הבעיה הזאת עכשיו?',
    exercisesHe: [
      'תן שם לגישה הנוכחית שלך: לחץ, סקרנות, אשמה, משחק, אחריות.',
      'כתוב איזו אפשרות הגישה הזאת פותחת או סוגרת.',
      'בחר גישה יעילה יותר למשך עשר דקות בלבד.',
    ],
    applyTodayHe:
      'לפני משימה קשה, אמור: "אני נכנס לזה כניסוי מסודר, לא כמבחן זהות".',
    tags: ['frame', 'attitude', 'approach'],
    sourceNoteHe,
  },
  {
    id: 'mh-day-05',
    dayIndex: 5,
    sourceSeries,
    sourceTitle: 'Problem-solving thinking',
    category: 'problem-solving',
    titleHe: 'חשיבה של פתרון בעיות',
    titleEn: 'Problem-solving thinking',
    distilledTeachingHe:
      'מאמץ נוסף לא תמיד פותר. לפעמים צריך לשדרג את צורת החשיבה: להפריד נתונים מפרשנות, לבדוק הנחות, ליצור אפשרויות ולבחור ניסוי קטן.',
    keyDistinctionHe:
      'פתרון דורש איכות חשיבה, לא רק עוד כוח רצון.',
    dailyQuestionHe:
      'איזה סוג חשיבה חסר כאן: הבחנה, אפשרויות, סדר, בדיקה או החלטה?',
    exercisesHe: [
      'סמן שלוש עובדות ושלוש פרשנויות.',
      'כתוב שתי אפשרויות שלא ניסית.',
      'בחר ניסוי אחד עם מדד הצלחה קטן.',
    ],
    applyTodayHe:
      'כשאתה נתקע, אל תוסיף לחץ. החלף עדשה: עובדות, הנחות, אפשרויות, ניסוי.',
    tags: ['thinking-quality', 'assumptions', 'experiments'],
    sourceNoteHe,
  },
  {
    id: 'mh-day-06',
    dayIndex: 6,
    sourceSeries,
    sourceTitle: 'The Meta Probe for problem-solving',
    category: 'problem-solving',
    titleHe: 'מטא-פרוב',
    titleEn: 'Meta Probe',
    distilledTeachingHe:
      'מטא-פרוב הוא חקירה שמסתכלת מעבר לתלונה. הוא שואל על ההנחות, המשמעויות, הקריטריונים והמסגרות שמחזיקות את הבעיה במקום.',
    keyDistinctionHe:
      'לא חוקרים רק מה קרה; חוקרים איך המוח בנה מזה בעיה.',
    dailyQuestionHe:
      'איזו הנחה נסתרת חייבת להיות נכונה כדי שהבעיה תרגיש כל כך תקועה?',
    exercisesHe: [
      'כתוב את התלונה במשפט אחד.',
      'שאל: מה אני מניח כאן על עצמי, אחרים או העולם?',
      'שאל: איזה קריטריון הופך את זה לבעיה?',
      'נסח מסגרת חלופית אחת.',
    ],
    applyTodayHe:
      'בכל תלונה שתעלה היום, שאל פעם אחת: "מה זה אומר לי, ואיך אני יודע?"',
    tags: ['meta-probe', 'assumptions', 'criteria'],
    sourceNoteHe,
  },
  {
    id: 'mh-day-07',
    dayIndex: 7,
    sourceSeries,
    sourceTitle: 'The secret of effective problem-solving',
    category: 'problem-solving',
    titleHe: 'בעיה פנימית או חיצונית',
    titleEn: 'Internal vs external problem',
    distilledTeachingHe:
      'חלק מהבעיות דורשות ידע, כלי או תהליך חיצוני. אחרות דורשות שינוי משמעות, זהות או מסגרת פנימית. בלבול ביניהן גורם לנו לפתור במקום הלא נכון.',
    keyDistinctionHe:
      'בעיה חיצונית מבקשת מיומנות; בעיה פנימית מבקשת ריפריימינג.',
    dailyQuestionHe:
      'האם חסר לי כלי בעולם, או שאני תקוע במשמעות שנתתי לעולם?',
    exercisesHe: [
      'סמן אם הבעיה בעיקר חיצונית, פנימית או מעורבת.',
      'אם חיצונית: כתוב איזה מידע או כלי חסר.',
      'אם פנימית: כתוב איזו משמעות כדאי לבדוק.',
    ],
    applyTodayHe:
      'אל תפתור רגש עם כלי בלבד, ואל תפתור מחסור בכלי עם ניתוח רגשי בלבד.',
    tags: ['internal-external', 'skill', 'meaning'],
    sourceNoteHe,
  },
  {
    id: 'mh-day-08',
    dayIndex: 8,
    sourceSeries,
    sourceTitle: 'Problem vs symptom',
    category: 'problem-solving',
    titleHe: 'בעיה או סימפטום',
    titleEn: 'Problem or symptom?',
    distilledTeachingHe:
      'הכאב הגלוי הוא לא תמיד הבעיה עצמה. לפעמים הוא סימפטום של מבנה עמוק יותר: כלל, פחד, חוסר בהירות, קונפליקט או מסגרת ישנה.',
    keyDistinctionHe:
      'סימפטום נראה ראשון; הבעיה שמייצרת אותו נמצאת לעיתים שכבה אחת מתחת.',
    dailyQuestionHe:
      'אם זה רק סימפטום, מה יכול להיות המבנה שמייצר אותו?',
    exercisesHe: [
      'כתוב את הסימפטום הגלוי בלי להילחם בו.',
      'שאל: מה הסימפטום הזה מנסה להגן עליו או לסמן?',
      'חפש כלל או פחד שחוזר מתחתיו.',
    ],
    applyTodayHe:
      'כשתרגיש סימפטום, עצור לשתי דקות ואסוף ממנו מידע במקום להדוף אותו.',
    tags: ['symptom', 'system', 'deeper-structure'],
    sourceNoteHe,
  },
  {
    id: 'mh-day-09',
    dayIndex: 9,
    sourceSeries,
    sourceTitle: 'Dealing with symptoms',
    category: 'problem-solving',
    titleHe: 'לעבוד עם סימפטומים',
    titleEn: 'Dealing with symptoms',
    distilledTeachingHe:
      'סימפטומים הם נתונים מהמערכת, לא אויבים. כשמקשיבים להם בלי להפוך אותם לזהות, הם יכולים להצביע על צורך, גבול, חוסר איזון או מסר שלא קיבל מקום.',
    keyDistinctionHe:
      'סימפטום אינו פקודה להיבהל; הוא הזמנה לקרוא מידע.',
    dailyQuestionHe:
      'מה הסימפטום הזה מספר לי אם אני מקשיב לו כמידע ולא כאיום?',
    exercisesHe: [
      'תאר את הסימפטום בגוף או בהתנהגות.',
      'כתוב מה הוא אולי מבקש: מנוחה, בהירות, גבול, פעולה.',
      'בחר תגובה קטנה שמכבדת את המידע.',
    ],
    applyTodayHe:
      'במקום "למה זה קורה לי?", שאל "איזה מידע המערכת נותנת לי עכשיו?"',
    tags: ['symptoms-as-data', 'self-regulation', 'signals'],
    sourceNoteHe,
  },
  {
    id: 'mh-day-10',
    dayIndex: 10,
    sourceSeries,
    sourceTitle: 'When a problem is actually just a symptom',
    category: 'problem-solving',
    titleHe: 'הבעיה שמאחורי הבעיה',
    titleEn: 'Hidden problem behind the problem',
    distilledTeachingHe:
      'השם הראשון שאנחנו נותנים לבעיה הוא לעיתים רק תווית מהירה. אם פותרים מהר מדי את התווית, מפספסים את המנגנון שממשיך לייצר אותה.',
    keyDistinctionHe:
      'אל תאמין מיד לתווית הראשונה; בדוק מה מחזיק אותה.',
    dailyQuestionHe:
      'מה אני ממהר לקרוא לו "הבעיה", ומה עוד יכול להיות מתחת?',
    exercisesHe: [
      'כתוב את תווית הבעיה הראשונה.',
      'שאל שלוש פעמים: ומה גורם לזה?',
      'סמן את השכבה שנראית הכי ניתנת להתערבות.',
    ],
    applyTodayHe:
      'לפני פעולה גדולה, בדוק אם אתה פותר שורש או רק מטפל בכותרת.',
    tags: ['root-cause', 'labels', 'layers'],
    sourceNoteHe,
  },
  {
    id: 'mh-day-11',
    dayIndex: 11,
    sourceSeries,
    sourceTitle: 'Meta-program thinking for outcomes',
    category: 'meta-programs',
    titleHe: 'מטא-פרוגרמים לתוצאה',
    titleEn: 'Meta-program thinking for outcomes',
    distilledTeachingHe:
      'תוצאה טובה נשענת על כמה כיווני חשיבה: לנוע אל מה שרוצים, לקחת בעלות, לחפש אופטימיזציה, לעבוד עם אפשרויות ונהלים, לשתף פעולה ולמדוד התקדמות.',
    keyDistinctionHe:
      'תוצאה אינה רק יעד; היא אופן חשיבה שמארגן פעולה.',
    dailyQuestionHe:
      'איזה מטא-כיוון חסר בתוצאה שלי כרגע?',
    exercisesHe: [
      'נסח תוצאה אחת בכיוון "אל".',
      'כתוב מה בשליטתך ומה לא.',
      'בחר מדד התקדמות אחד שאפשר לראות היום.',
    ],
    applyTodayHe:
      'העבר יעד אחד מניסוח עמום למבנה: כיוון, בעלות, דרך, מדד.',
    tags: ['outcomes', 'meta-programs', 'ownership'],
    sourceNoteHe,
  },
  {
    id: 'mh-day-12',
    dayIndex: 12,
    sourceSeries,
    sourceTitle: 'Meta-program thinking for outcomes',
    category: 'meta-programs',
    titleHe: 'אל מול הרחק',
    titleEn: 'Toward vs away',
    distilledTeachingHe:
      'כשאנחנו חושבים רק ממה לברוח, המערכת מתכווננת לאיום. כשאנחנו מנסחים מה אנחנו רוצים לבנות, הגוף והקשב מקבלים כיוון אחר.',
    keyDistinctionHe:
      '"מה אני רוצה?" יוצר כיוון שונה מ"מה אני חייב למנוע?"',
    dailyQuestionHe:
      'מה אני רוצה ליצור כאן, מעבר למה שאני רוצה להפסיק?',
    exercisesHe: [
      'כתוב ניסוח "הרחק": ממה אני רוצה להימנע.',
      'תרגם אותו לניסוח "אל": מה אני כן רוצה.',
      'בדוק איזה ניסוח נותן יותר אנרגיה לפעולה.',
    ],
    applyTodayHe:
      'בכל פעם שתתפוס ניסוח הימנעות, הוסף מיד ניסוח תוצאה רצויה.',
    tags: ['toward-away', 'motivation', 'outcomes'],
    sourceNoteHe,
  },
  {
    id: 'mh-day-13',
    dayIndex: 13,
    sourceSeries,
    sourceTitle: 'Getting your approach right',
    category: 'meta-programs',
    titleHe: 'אופטימיזציה במקום פרפקציוניזם',
    titleEn: 'Optimizing instead of perfectionism',
    distilledTeachingHe:
      'פרפקציוניזם שואל איך לא לטעות. אופטימיזציה שואלת מה הצעד הטוב הבא ביחס למצב, למשאבים וללמידה. כך התקדמות נשארת אפשרית.',
    keyDistinctionHe:
      'מושלם תוקע; מספיק טוב שמתקדם מלמד.',
    dailyQuestionHe:
      'מהו הצעד הקטן הטוב מספיק שייצר למידה אמיתית?',
    exercisesHe: [
      'זהה מקום שבו אתה מחכה לתנאים מושלמים.',
      'כתוב גרסת 70 אחוז שאפשר לבצע.',
      'קבע מה תלמד מהביצוע, גם אם אינו מושלם.',
    ],
    applyTodayHe:
      'בצע פעולה אחת בגרסת "טוב מספיק", ואז שפר לפי נתונים.',
    tags: ['optimizing', 'perfectionism', 'learning-loop'],
    sourceNoteHe,
  },
  {
    id: 'mh-day-14',
    dayIndex: 14,
    sourceSeries,
    sourceTitle: 'Meta-program thinking for outcomes',
    category: 'meta-programs',
    titleHe: 'ייחוס פנימי ואחריות',
    titleEn: 'Internal reference and responsibility',
    distilledTeachingHe:
      'אחריות בריאה אינה אומרת שאתה שולט בכל. היא אומרת שאתה בוחר את המטרה, את התגובה ואת הצעד הבא שלך בלי למסור את כל הסמכות החוצה.',
    keyDistinctionHe:
      'בעלות על בחירה אינה אשליה של שליטה מלאה.',
    dailyQuestionHe:
      'איזה חלק מהתוצאה הזאת אני בוחר לקחת על עצמי היום?',
    exercisesHe: [
      'כתוב מה תלוי בך ומה תלוי באחרים.',
      'בחר פעולה אחת מתוך החלק שלך.',
      'נסח גבול ברור לגבי מה שאינו בשליטתך.',
    ],
    applyTodayHe:
      'בחר יעד אחד ואמור: "זה הכיוון שלי; אלה התנאים; זה הצעד שלי".',
    tags: ['responsibility', 'internal-reference', 'choice'],
    sourceNoteHe,
  },
  {
    id: 'mh-day-15',
    dayIndex: 15,
    sourceSeries,
    sourceTitle: 'NLP as phenomenology',
    category: 'phenomenology',
    titleHe: 'NLP כפנומנולוגיה',
    titleEn: 'NLP as phenomenology',
    distilledTeachingHe:
      'פנומנולוגיה מתחילה מהחוויה כפי שהיא נחווית, לא מהתיאוריה עליה. במקום למהר להסביר, בודקים איך האדם מייצג, מרגיש, נותן משמעות ופועל.',
    keyDistinctionHe:
      'החוויה החיה קודמת להסבר עליה.',
    dailyQuestionHe:
      'איך אני חווה את זה בפועל לפני שאני מפרש מה זה אומר?',
    exercisesHe: [
      'בחר חוויה אחת מהיום.',
      'תאר אותה בחושים, בגוף וברגש לפני הפרשנות.',
      'רק אחר כך כתוב איזו משמעות נתת לה.',
    ],
    applyTodayHe:
      'כשתספר לעצמך סיפור, עצור ושאל: "מה החוויה הישירה לפני הסיפור?"',
    tags: ['phenomenology', 'experience', 'description'],
    sourceNoteHe,
  },
  {
    id: 'mh-day-16',
    dayIndex: 16,
    sourceSeries,
    sourceTitle: 'Getting to the heart of experience',
    category: 'phenomenology',
    titleHe: 'ללב החוויה',
    titleEn: 'Getting to the heart of experience',
    distilledTeachingHe:
      'חוויה אינה דבר אחד. יש בה תמונות, צלילים, תחושות, רגשות, מושגים, תנוחות גוף ומסקנות. כשמפרקים אותה, אפשר לשנות מרכיב מדויק במקום להילחם בכל החוויה.',
    keyDistinctionHe:
      'חוויה היא מבנה רב-שכבתי, לא ענן אחד.',
    dailyQuestionHe:
      'איזו שכבה בחוויה הזאת הכי משפיעה עלי עכשיו?',
    exercisesHe: [
      'מפה חוויה דרך ארבע שכבות: חוש, רגש, מחשבה, גוף.',
      'סמן איזו שכבה הכי חזקה.',
      'נסה שינוי קטן בשכבה אחת בלבד.',
    ],
    applyTodayHe:
      'לפני תגובה אוטומטית, זהה אם הגוף, התמונה או המחשבה מובילים את החוויה.',
    tags: ['experience-structure', 'embodiment', 'sensory'],
    sourceNoteHe,
  },
  {
    id: 'mh-day-17',
    dayIndex: 17,
    sourceSeries,
    sourceTitle: 'Phenomenology and the Matrix Model',
    category: 'meaning',
    titleHe: 'מודל המטריצה וממדי תוכן',
    titleEn: 'Matrix Model and content dimensions',
    distilledTeachingHe:
      'משמעות בנויה מממדים רבים: עצמי, אחרים, זמן, עולם, כוונה, משאבים ועוד. התנהגות היא רק פני השטח של מערכת משמעויות רחבה יותר.',
    keyDistinctionHe:
      'כדי להבין פעולה, בדוק את המטריצה שמעניקה לה משמעות.',
    dailyQuestionHe:
      'איזה ממד משמעות משפיע כאן: עצמי, אחרים, זמן, עולם או משאבים?',
    exercisesHe: [
      'בחר התנהגות אחת שחוזרת.',
      'כתוב מה היא אומרת עליך, על אחרים ועל העתיד.',
      'שנה ממד משמעות אחד ובדוק מה משתנה.',
    ],
    applyTodayHe:
      'אל תשפוט התנהגות בלבד. שאל איזו מערכת משמעות מזינה אותה.',
    tags: ['matrix-model', 'meaning-dimensions', 'behavior'],
    sourceNoteHe,
  },
  {
    id: 'mh-day-18',
    dayIndex: 18,
    sourceSeries,
    sourceTitle: 'Beliefs and the House of Meaning',
    category: 'beliefs',
    titleHe: 'אמונות ובית המשמעות',
    titleEn: 'Beliefs and the House of Meaning',
    distilledTeachingHe:
      'אמונה אינה רק משפט בראש. היא חיה בתוך בית של משמעויות: ערכים, הוכחות, זהות, רגשות, זיכרונות וציפיות. לכן שינוי אמונה דורש לבדוק את הבית כולו.',
    keyDistinctionHe:
      'משפט אמונה הוא דלת; בית המשמעות הוא המבנה שמחזיק אותה.',
    dailyQuestionHe:
      'מה מחזיק את האמונה הזאת במקומה מלבד המילים שלה?',
    exercisesHe: [
      'כתוב אמונה אחת שמפעילה אותך.',
      'זהה איזו הוכחה אתה נותן לה.',
      'שאל איזה ערך או פחד היא מגנה עליו.',
    ],
    applyTodayHe:
      'כשאמונה עולה, בדוק את הבית שלה: הוכחות, ערכים, זהות וציפייה.',
    tags: ['beliefs', 'house-of-meaning', 'evidence'],
    sourceNoteHe,
  },
  {
    id: 'mh-day-19',
    dayIndex: 19,
    sourceSeries,
    sourceTitle: 'NLP as epistemology',
    category: 'epistemology',
    titleHe: 'NLP כאפיסטמולוגיה',
    titleEn: 'NLP as epistemology',
    distilledTeachingHe:
      'אפיסטמולוגיה שואלת איך אנחנו יודעים את מה שאנחנו חושבים שאנחנו יודעים. ב-NLP ובנוירו-סמנטיקה זו שאלה מעשית: איך יצרתי את המפה, ועד כמה היא שימושית?',
    keyDistinctionHe:
      'לא רק מה אני יודע, אלא איך בניתי את הידיעה.',
    dailyQuestionHe:
      'איך אני יודע שזה נכון, ומה עוד יכול להסביר את הנתונים?',
    exercisesHe: [
      'בחר מסקנה אחת שאתה מחזיק.',
      'הפרד בין ראיות, פרשנות וזיכרון.',
      'כתוב אפשרות הסבר נוספת.',
    ],
    applyTodayHe:
      'בכל ודאות חזקה, שאל: "מה מקור הידיעה ומה איכות הראיה?"',
    tags: ['epistemology', 'knowing', 'maps'],
    sourceNoteHe,
  },
  {
    id: 'mh-day-20',
    dayIndex: 20,
    sourceSeries,
    sourceTitle: 'Epistemological clarity',
    category: 'epistemology',
    titleHe: 'בהירות אפיסטמולוגית',
    titleEn: 'Epistemological clarity',
    distilledTeachingHe:
      'חשיבה נקייה מבדילה בין מפה, ראיה, היסק, אמונה וסיפור. כשהכל מתערבב, המוח מתייחס למסקנה כאילו היא עובדה ומאבד גמישות.',
    keyDistinctionHe:
      'מפה אינה השטח; היסק אינו ראיה; אמונה אינה ודאות.',
    dailyQuestionHe:
      'איזה חלק כאן הוא עובדה, ואיזה חלק הוא היסק שלי?',
    exercisesHe: [
      'כתוב טענה אחת שאתה מאמין לה.',
      'סמן את העובדות הנצפות בלבד.',
      'סמן את ההיסקים שהוספת מעל העובדות.',
      'בדוק אם המפה עדיין מועילה.',
    ],
    applyTodayHe:
      'לפני החלטה, הפרד בכתב בין נתון, פירוש, אמונה ופעולה.',
    tags: ['clarity', 'evidence', 'inference'],
    sourceNoteHe,
  },
  {
    id: 'mh-day-21',
    dayIndex: 21,
    sourceSeries,
    sourceTitle: 'Over-thinking',
    category: 'meaning',
    titleHe: 'חשיבת יתר',
    titleEn: 'Over-thinking',
    distilledTeachingHe:
      'לא כל חשיבה מועילה. חשיבה יעילה צריכה כיוון, מסגרת וכללי עצירה. בלי אלה היא יכולה להפוך לסיבוב פנימי שמייצר עוד משמעות במקום עוד בהירות.',
    keyDistinctionHe:
      'חשיבה טובה מייצרת הבחנה או פעולה; חשיבת יתר מייצרת עוד לולאה.',
    dailyQuestionHe:
      'מה יהיה סימן מספיק טוב שעשיתי מספיק חשיבה ועכשיו צריך פעולה?',
    exercisesHe: [
      'כתוב מה השאלה שאתה באמת מנסה לענות עליה.',
      'קבע מגבלת זמן לחשיבה.',
      'בחר כלל עצירה: נתון מספיק, החלטה קטנה או שיחה אחת.',
    ],
    applyTodayHe:
      'בחר נושא אחד שאתה חושב עליו יותר מדי וקבע לו כלל עצירה ברור.',
    tags: ['over-thinking', 'stopping-rules', 'action'],
    sourceNoteHe,
  },
];

export function getMichaelHallDailyCardById(
  cardId: string,
): MichaelHallDailyCard | undefined {
  return michaelHallDailyCards.find((card) => card.id === cardId);
}
