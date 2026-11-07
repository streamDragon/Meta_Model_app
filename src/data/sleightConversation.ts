/**
 * Original Hebrew simulator content. Inspired by the teaching taxonomies of
 * R. Dilts (14 patterns), Hall/Bodenhamer (7 Mind-Lines directions), the
 * OMEK October 2026 course booklet, and conversational aikido practice.
 * Scripts are fictional, not transcripts or clinical outcomes.
 */

export type FamilyId = 'criteria' | 'meaning' | 'context';
export type MoveId =
  | 'intention' | 'redefine' | 'consequence' | 'chunk-down'
  | 'chunk-up' | 'analogy' | 'counterexample' | 'another-outcome'
  | 'criteria-hierarchy' | 'frame-size' | 'reality-strategy'
  | 'model-world' | 'meta-frame' | 'apply-to-self'
  | 'mind-pre' | 'mind-post' | 'mind-re' | 'mind-deframe'
  | 'mind-out' | 'mind-counter' | 'mind-analogy';

export type MoveSystem = 'dilts' | 'mindlines';
export type Tone = 'joining' | 'direct' | 'sharp';
export type MoveEffect = 'opening' | 'mixed' | 'resistant';

export const CHALLENGE_FAMILIES: ReadonlyArray<{
  id: FamilyId; title: string; icon: string; question: string; tint: string;
}> = [
  { id: 'criteria', title: 'מה חשוב באמת?', icon: '◆', question: 'ערך, כוונה או תוצאה אחרת', tint: 'gold' },
  { id: 'meaning', title: 'מה עוד זה אומר?', icon: '◇', question: 'הגדרה, פירוש, אנלוגיה או כלל', tint: 'violet' },
  { id: 'context', title: 'מאיזה מבט?', icon: '↗', question: 'מקרה, זמן, אדם או הוכחה', tint: 'cyan' },
];

export interface DialogueMove {
  id: MoveId;
  title: string;
  family: FamilyId;
  system: MoveSystem;
  direction: string;
  effect: MoveEffect;
  sample: readonly [string, string, string];
}

export const DIALOGUE_MOVES: ReadonlyArray<DialogueMove> = [
  {
    id: 'intention', title: 'כוונה', family: 'criteria', system: 'dilts',
    direction: 'איזה ערך האמונה מנסה להגן עליו?', effect: 'opening',
    sample: [
      'נשמע שההשקעה שלך במשפחה חשובה לך. מה היית רוצה שהוא יבין על הזמן שהקדשת?',
      'אני שומע שחשוב לך שיסמכו עליך. איך היית רוצה שהמשוב יתייחס למאמץ שלך?',
      'חשוב לך ללמוד ולהצליח. איזה סוג של עזרה יכול לשרת את הרצון הזה?',
    ],
  },
  {
    id: 'redefine', title: 'הגדרה מחדש', family: 'meaning', system: 'dilts',
    direction: 'איזה פירוש נוסף אפשר להציע?', effect: 'opening',
    sample: [
      'יכול להיות שהאיחור הזה היה התנהגות לא מתחשבת, בלי שהוא מגדיר את כל היחס שלו אליך?',
      'האם תיקון של עבודה יכול להיות גם סימן שמישהו משקיע בהתפתחות שלך?',
      'אולי הקושי בשאלה הזו מעיד על פער מסוים שטרם למדת, ולא על היכולת שלך כולה?',
    ],
  },
  {
    id: 'consequence', title: 'השלכות', family: 'criteria', system: 'dilts',
    direction: 'מה יקרה אם נשמור על הכלל הזה?', effect: 'mixed',
    sample: [
      'אם כל איחור יהיה מבחינתך חוסר כבוד, מה זה יעשה לשיחות שלכם בחודשים הקרובים?',
      'מה יקרה אם כל הערה בעבודה תגרום לך להסתיר רעיונות חדשים?',
      'מה המחיר של לוותר מראש על נושאים בגלל שאלה אחת קשה?',
    ],
  },
  {
    id: 'chunk-down', title: 'פירוט', family: 'context', system: 'dilts',
    direction: 'איזה פרט או חריג נשמט?', effect: 'opening',
    sample: [
      'איזה חלק בדיוק פגע בך: האיחור, זה שלא הודיע או האופן שבו נכנס?',
      'באיזה משפט של המשוב שמעת שלא סומכים עליך?',
      'איזה שלב בשאלה היה לך קשה: ההתחלה, החישוב או הסוף?',
    ],
  },
  {
    id: 'chunk-up', title: 'רמה רחבה', family: 'context', system: 'dilts',
    direction: 'איזו תופעה רחבה יותר יש כאן?', effect: 'mixed',
    sample: [
      'במשפחה, האם כבוד מתבטא רק בדייקנות או גם בדרכים אחרות?',
      'ביחסי עבודה טובים, האם משוב הוא בהכרח חוסר אמון?',
      'בלמידה של מקצוע שלם, האם שאלה אחת מייצגת את כל ההתקדמות?',
    ],
  },
  {
    id: 'analogy', title: 'אנלוגיה', family: 'meaning', system: 'dilts',
    direction: 'מה קורה במקרה מקביל?', effect: 'opening',
    sample: [
      'אם חבר טוב שלך מאחר בגלל תקלה בדרך, האם האיחור לבדו יגדיר מה הוא מרגיש כלפיך?',
      'אם מאמן עוצר שחקן ומתקן טכניקה, האם זה אומר שהוא כבר לא מאמין בו?',
      'כשמתאמנים בנגינה ונתקעים בתו אחד, האם זה אומר שלא יודעים לנגן?',
    ],
  },
  {
    id: 'counterexample', title: 'דוגמה נגדית', family: 'context', system: 'dilts',
    direction: 'מתי הכלל לא התקיים?', effect: 'opening',
    sample: [
      'היה פעם שמישהו איחר אליך ובכל זאת ידעת שהוא מעריך אותך?',
      'קיבלת פעם משוב ממישהו שדווקא סמך עליך מאוד?',
      'הצלחת בעבר במקצוע אף שהיו שאלות מסוימות שלא פתרת?',
    ],
  },
  {
    id: 'another-outcome', title: 'תוצאה נוספת', family: 'criteria', system: 'dilts',
    direction: 'איזה יעד אחר חשוב להשיג?', effect: 'opening',
    sample: [
      'מעבר לשאלה אם האיחור מכבד, מה חשוב לך שיקרה בסעודת השבת הבאה?',
      'אולי העניין אינו רק מי צודק, אלא איך תקבל משוב בלי לאבד את היוזמה שלך?',
      'האם המטרה עכשיו היא לדעת הכול, או למצוא דרך ללמוד את מה שעדיין לא ברור?',
    ],
  },
  {
    id: 'criteria-hierarchy', title: 'סדר עדיפויות', family: 'criteria', system: 'dilts',
    direction: 'מה חשוב יותר מהקריטריון הנוכחי?', effect: 'mixed',
    sample: [
      'מה חשוב יותר בקשר: שלא יהיה אף איחור, או שתהיה אפשרות לדבר בכנות על מה שפגע?',
      'מה חשוב יותר: להיראות כמי שלא טועה, או לפתח עבודה טובה יותר?',
      'מה חשוב יותר כעת: לסיים מהר או ללמוד את הרעיון באופן שיישאר איתך?',
    ],
  },
  {
    id: 'frame-size', title: 'שינוי מסגרת', family: 'context', system: 'dilts',
    direction: 'מה משתנה בזמן או בקנה מידה אחר?', effect: 'mixed',
    sample: [
      'אם תסתכל על השנה האחרונה שלכם ולא רק על הערב הזה, איזו תמונה של הכבוד שלו תראה?',
      'אם מסתכלים על כל השנה בעבודה, האם הביקורת הזו מייצגת את האמון שקיבלת?',
      'בעוד חודש של תרגול, עד כמה תרגיש שהשאלה הזו ייצגה אותך?',
    ],
  },
  {
    id: 'reality-strategy', title: 'בסיס המסקנה', family: 'context', system: 'dilts',
    direction: 'איך בדיוק נקבע שהמסקנה נכונה?', effect: 'mixed',
    sample: [
      'מה היית צריך לראות או לשמוע כדי לדעת בוודאות שהוא לא מכבד אותך?',
      'איך אתה מבדיל בין בקשה לתיקון לבין חוסר אמון מצד המנהלת?',
      'מה ההוכחה שמקושי לפתור שאלה אחת אפשר להסיק שאין לך יכולת?',
    ],
  },
  {
    id: 'model-world', title: 'מפה נוספת', family: 'meaning', system: 'dilts',
    direction: 'איך אדם אחר היה מפרש זאת?', effect: 'mixed',
    sample: [
      'איך בת הזוג שלך הייתה מפרשת את אותו איחור, אילו שמעה את הסיפור ממך?',
      'איך עובד ותיק שאתה מעריך היה מפרש בקשה לתקן מסמך?',
      'איך מורה טוב היה מפרש את הקושי שלך בשאלה הזו?',
    ],
  },
  {
    id: 'meta-frame', title: 'מסגרת על', family: 'meaning', system: 'dilts',
    direction: 'איזו הנחה מוקדמת מארגנת את האמונה?', effect: 'resistant',
    sample: [
      'יכול להיות שהקביעה שאיחור הוא זלזול קשורה למה שלמדת בבית על כבוד וזמנים?',
      'אולי עצם ההנחה שמשוב הוא חוסר אמון הופכת את ההערה למאיימת?',
      'כשאתה אומר ״קשה לי״, לפי איזה כלל אתה מחליט מה זה אומר עליך?',
    ],
  },
  {
    id: 'apply-to-self', title: 'החלה עצמית', family: 'meaning', system: 'dilts',
    direction: 'מה קורה כשמחילים את הכלל על עצמו?', effect: 'resistant',
    sample: [
      'אם אתה דורש כבוד דרך דייקנות, האם גם זכותו לבקש כבוד לצורך שלו להסביר מה קרה?',
      'אם כל תיקון מעיד על חוסר אמון, האם גם כשאתה מתקן את העבודה שלך אתה לא סומך על עצמך?',
      'אם שאלה קשה מוכיחה שאין יכולת, האם גם למי שחיבר את השאלה היה אסור להסתבך בה?',
    ],
  },
  {
    id: 'mind-pre', title: 'קדם־מסגרת', family: 'criteria', system: 'mindlines',
    direction: 'מה קדם למסקנה?', effect: 'mixed',
    sample: [
      'לפני שהחלטת שזה זלזול, מה ציפית שיקרה באותו ערב?',
      'איזו ציפייה הייתה לך מהמשוב עוד לפני שהמנהלת דיברה?',
      'כשהתחלת את השאלה, מה ציפית מעצמך לפני שהתעוררה המחשבה?',
    ],
  },
  {
    id: 'mind-post', title: 'מסגרת עתידית', family: 'criteria', system: 'mindlines',
    direction: 'איך ייראה המצב בהמשך?', effect: 'opening',
    sample: [
      'אחרי שיחה שבה אתה מסביר מה הכאיב לך, איך אולי תזכור את האירוע הזה?',
      'אם המשוב יאפשר לך להצליח בפרויקט הבא, מה הוא עשוי לסמן עבורך בעתיד?',
      'בעוד כמה שבועות כשתדע לפתור שאלה דומה, מה תגיד על הרגע הזה?',
    ],
  },
  {
    id: 'mind-re', title: 'שינוי פירוש', family: 'meaning', system: 'mindlines',
    direction: 'מה משמעות נוספת אפשרית?', effect: 'opening',
    sample: [
      'מה אם האיחור אומר שהיה ערב לא מוצלח מבחינתו, אבל לא מבטל את האכפתיות שלו?',
      'אולי המשוב יכול להיות ניסיון להגיע לאיכות גבוהה, ולא הכרזה על חוסר ערך שלך?',
      'מה אם הקושי הזה פשוט מסמן מקום מדויק לאימון?',
    ],
  },
  {
    id: 'mind-deframe', title: 'פירוק המסגרת', family: 'context', system: 'mindlines',
    direction: 'אילו חלקים יוצרים את המסקנה?', effect: 'opening',
    sample: [
      'בוא נפריד: הוא איחר, לא הודיע, ואתה פירשת שלא אכפת לו. איפה בדיוק נוצר הקשר?',
      'נפריד בין מה שנאמר במשוב לבין מה שהסקת ממנו. מה כל חלק מוסיף?',
      'נפריד בין תרגיל אחד, התחושה שנוצרה והמסקנה על עצמך. מה בכל חלק?',
    ],
  },
  {
    id: 'mind-out', title: 'מסגרת־על', family: 'meaning', system: 'mindlines',
    direction: 'מהי המסגרת שדרכה שופטים?', effect: 'resistant',
    sample: [
      'מה המקום שתופס אצלך העיקרון שדייקנות שווה כבוד?',
      'איזו תמונה של מקצועיות מחייבת אותך שלא יקבלו ממך תיקון?',
      'האם יש כלל סמוי שלפיו תלמיד טוב לא אמור להתקשות בכלל?',
    ],
  },
  {
    id: 'mind-counter', title: 'מסגרת נגדית', family: 'context', system: 'mindlines',
    direction: 'איזה מקרה בודק את תוקף הכלל?', effect: 'mixed',
    sample: [
      'אם אתה מאחר לפעמים ובכל זאת אוהב את משפחתך, מה זה אומר על הכלל?',
      'האם ביקורת שנתת בעבר לעובד מוכיחה שלא סמכת עליו?',
      'אם גם מורה מתקשה לפעמים, מה נשאר מהכלל על היכולת שלך?',
    ],
  },
  {
    id: 'mind-analogy', title: 'מסגרת מקבילה', family: 'meaning', system: 'mindlines',
    direction: 'איזה סיפור בעל מבנה דומה?', effect: 'opening',
    sample: [
      'דמיין שאדם מגיע עם מתנה באיחור. האם הזמן מוחק את המשמעות של המתנה?',
      'כמו מוסכניק שמוצא תקלה ברכב טוב: האם עצם התיקון הופך את הרכב לבלתי ראוי?',
      'כמו מישהו שלומד לשחות: רגע של בלבול במים לא מספר על כל מה שהוא כבר למד.',
    ],
  },
];

export interface MetaQuestion {
  id: string;
  question: string;
  response: string;
  role: string;
}

export interface ConversationCase {
  id: string;
  title: string;
  context: string;
  speaker: string;
  story: string;
  coreBelief: string;
  observable: string;
  inference: string;
  protect: string;
  baseline: { feeling: number; conviction: number; choices: number };
  questions: readonly MetaQuestion[];
  reactions: {
    open: string; mixed: string; resist: string; rupture: string; repair: string;
  };
}

export const CONVERSATION_CASES: ReadonlyArray<ConversationCase> = [
  {
    id: 'son-in-law', title: 'סעודת השבת', context: 'שיחה משפחתית', speaker: 'יוסף',
    story: 'החתן שלי הוזמן לסעודת שבת לשבע. כולם ישבו וחיכו. הוא הגיע באיחור של ארבעים דקות ולא התקשר. האוכל התקרר, ואני עדיין כועס.',
    coreBelief: 'מי שמאחר ולא מודיע לי לא מכבד אותי.',
    observable: 'איחור של ארבעים דקות ללא הודעה',
    inference: 'הוא לא מכבד אותי',
    protect: 'להרגיש שרואים את ההשקעה שלי במשפחה',
    baseline: { feeling: 3, conviction: 9, choices: 2 },
    questions: [
      { id: 'whose', question: 'בעיני מי ספציפית האיחור היה בעיה?', response: 'בעיניי. כולם חיכו, אבל אותי זה ממש הכעיס. הכנתי הכול לקראתו.', role: 'למי / לפי מי' },
      { id: 'details', question: 'מה בדיוק קרה בזמן שחיכיתם?', response: 'קבענו לשבע. הוא נכנס רק בשבע וארבעים ולא שלח הודעה לפני כן.', role: 'פירוט האירוע' },
      { id: 'meaning', question: 'מה זה אומר לך שהוא איחר?', response: 'זה אומר לי שהוא לא מכבד אותי. מבחינתי מי שמכבד פשוט מודיע.', role: 'חשיפת האמונה' },
      { id: 'evidence', question: 'איך אתה יודע שהאיחור מוכיח חוסר כבוד?', response: 'אני לא יכול לדעת בוודאות מה עבר עליו. אני יודע שהוא לא התקשר, וזה מרגיש מזלזל.', role: 'בסיס המסקנה' },
      { id: 'value', question: 'מה חשוב לך שהוא יבין על הסיטואציה?', response: 'שהזמן והמאמץ שלי חשובים. הייתי רוצה שיראה את ההשקעה ושידבר איתי.', role: 'ערך ומטרה' },
    ],
    reactions: {
      open: 'רגע, לא חשבתי על ההפרדה הזאת. האיחור עדיין מפריע לי, אבל אולי אני קופץ מהר מדי למסקנה.',
      mixed: 'אני מבין את הכיוון, אבל מבחינתי הוא עדיין היה צריך להודיע. לא הייתי מוחק את זה.',
      resist: 'אתה מנסה להוכיח שאני טועה במקום לראות כמה זה פגע בי.',
      rupture: 'די. אני מרגיש שאתה מתווכח איתי ולא מקשיב. אני לא רוצה להמשיך ככה.',
      repair: 'תודה שאמרת את זה. כן, קודם רציתי שתבין למה נפגעתי. עכשיו אולי נוכל לדבר.',
    },
  },
  {
    id: 'work-feedback', title: 'הערה בישיבה', context: 'מקום העבודה', speaker: 'נועה',
    story: 'בישיבת הצוות המנהלת אמרה מול כולם שהמסמך שהגשתי דורש תיקונים. הייתי מושקעת בו מאוד. מאז אני חוששת להציג רעיונות.',
    coreBelief: 'כשמתקנים אותי מול כולם זה סימן שלא סומכים עליי.',
    observable: 'בקשה לתקן מסמך בישיבת צוות',
    inference: 'לא סומכים עליי',
    protect: 'להרגיש שמעריכים את המקצועיות שלי',
    baseline: { feeling: 4, conviction: 8, choices: 2 },
    questions: [
      { id: 'details', question: 'מה בדיוק אמרה המנהלת?', response: 'היא אמרה שהמסמך צריך עוד כמה תיקונים. לא אמרה שאני לא מקצועית.', role: 'ביצוע חסר' },
      { id: 'whose', question: 'בעיני מי זה סימן לחוסר אמון?', response: 'בעיניי. אני לא יודעת מה האחרים באמת חשבו.', role: 'מקור ההערכה' },
      { id: 'meaning', question: 'מה זה אומר לך שמבקשים לתקן?', response: 'שלא סומכים עליי לבצע טוב לבד, למרות כל מה שהשקעתי.', role: 'חשיפת האמונה' },
      { id: 'evidence', question: 'איך את יודעת שהיא לא סומכת עלייך?', response: 'האמת שאין לי הוכחה לזה. אבל הטון שלה והעובדה שזה היה בפומבי השפיעו עליי.', role: 'בסיס המסקנה' },
      { id: 'value', question: 'מה היית רוצה שיקרה במצב כזה?', response: 'שהיא תיתן הערות בצורה מכבדת ותראה גם את מה שהיה טוב.', role: 'ערך ומטרה' },
    ],
    reactions: {
      open: 'זאת אפשרות. אני עדיין פגועה, אבל אני לא בטוחה שהמשוב אומר את כל מה שהסקתי ממנו.',
      mixed: 'אולי. בכל זאת, אני צריכה שההערות ייאמרו בצורה מכבדת.',
      resist: 'קל לך להגיד את זה. אתה לא היית שם, וזה נשמע כאילו אתה מצדיק אותה.',
      rupture: 'אני מרגישה שלא מקשיבים לי פה. אני לא רוצה עוד טיעונים.',
      repair: 'עוזר לי שאתה מכיר בכך שזה היה לא נעים. עכשיו אולי אוכל להסתכל על עוד פירוש.',
    },
  },
  {
    id: 'school', title: 'שאלה קשה במתמטיקה', context: 'לימודים', speaker: 'איתי',
    story: 'אתמול במבחן במתמטיקה נתקעתי בשאלה שלא הצלחתי לפתור. כולם נראו לי מהירים ממני. יצאתי בהרגשה ממש לא טובה.',
    coreBelief: 'אם שאלה במתמטיקה קשה לי, זה אומר שאני לא מסוגל ללמוד את המקצוע.',
    observable: 'קושי בפתרון שאלה אחת במבחן',
    inference: 'אני לא מסוגל במקצוע',
    protect: 'להרגיש שיש סיכוי אמיתי להתקדם',
    baseline: { feeling: 3, conviction: 8, choices: 2 },
    questions: [
      { id: 'details', question: 'איזה חלק בשאלה בדיוק היה קשה?', response: 'הצלחתי להבין את הנתונים, אבל לא ידעתי איך להתחיל את הסעיף השני.', role: 'פירוט' },
      { id: 'whose', question: 'מי אמר שזה אומר משהו על כל היכולת שלך?', response: 'אף אחד לא אמר במפורש. זאת המסקנה שלי כשהסתכלתי על האחרים.', role: 'מקור המסקנה' },
      { id: 'meaning', question: 'מה משמעות הקושי הזה מבחינתך?', response: 'שאני כנראה לא מסוגל ללמוד מתמטיקה כמו שצריך.', role: 'חשיפת האמונה' },
      { id: 'evidence', question: 'איך אתה יודע שזה נכון על כל המקצוע?', response: 'אני לא באמת יודע. היו גם שאלות שהצלחתי, אבל זו נתקעה לי בראש.', role: 'בסיס המסקנה' },
      { id: 'value', question: 'מה היית רוצה להיות מסוגל לעשות?', response: 'להתקדם שלב אחרי שלב, בלי שכל תקלה תמוטט לי את הביטחון.', role: 'ערך ומטרה' },
    ],
    reactions: {
      open: 'כשאתה אומר את זה ככה, יכול להיות ששאלה אחת לא מייצגת אותי. עדיין קשה לי.',
      mixed: 'אולי, אבל ההרגשה שאני איטי עדיין חזקה.',
      resist: 'אתה בכלל לא מבין איך זה להיות היחיד שלא הצליח.',
      rupture: 'די, נמאס לי שמסבירים לי שהכול בסדר. לא בא לי לדבר על זה.',
      repair: 'תודה שלא ניסית לשכנע אותי מהר. זה נותן לי מקום לחשוב על השאלה אחרת.',
    },
  },
];

export function movesFor(family: FamilyId, system: MoveSystem): DialogueMove[] {
  return DIALOGUE_MOVES.filter((move) => move.family === family && move.system === system);
}
