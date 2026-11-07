export type FrameArea = 'context' | 'west' | 'north' | 'east' | 'south' | 'goal' | 'resources';
export type TopicKind = 'problem' | 'goal' | 'resource';
export type FrameClaimKind = 'said' | 'necessary' | 'possible' | 'incompatible';

export interface FrameDiscovery {
  id: string;
  area: FrameArea;
  category: string;
  focus: 'event' | 'meaning' | 'action';
  questions: [string, string, string];
  response: string;
  mapText: string;
  claimKind: FrameClaimKind;
  certainty: number;
  why: string;
}

export const FRAME_TOPIC: Record<TopicKind, { label: string; text: string }> = {
  problem: { label: 'בעיה', text: 'היא לא ענתה להודעה שלי. זה אומר שלא אכפת לה ממני, אז הפסקתי ליזום.' },
  goal: { label: 'מטרה', text: 'אני רוצה קשר שיש בו הדדיות, ולא להיות תמיד היחיד שיוזם.' },
  resource: { label: 'משאב', text: 'כשאני מרגיש בטוח, אני יודע להגיד בצורה ישירה מה חשוב לי בקשר.' },
};

export const FRAME_PARTS = [
  { id: 'event' as const, label: 'מה קרה', text: 'היא לא ענתה להודעה', hint: 'אירוע שהאדם מתאר' },
  { id: 'meaning' as const, label: 'מה זה אומר לו', text: 'לא אכפת לה ממני', hint: 'המשמעות שהאדם נתן' },
  { id: 'action' as const, label: 'מה הוא עושה', text: 'הפסקתי ליזום', hint: 'תגובה או התנהגות' },
];

export const FRAME_AREAS: { id: FrameArea; label: string; subtitle: string; icon: string }[] = [
  { id: 'context', label: 'סיטואציה / הקשר', subtitle: 'מי, מתי, איפה ומה קרה', icon: '◎' },
  { id: 'west', label: 'מסגרת החשיבה', subtitle: 'חייב, אולי, לא מתיישב', icon: '◁' },
  { id: 'north', label: 'כוונה ותפקיד', subtitle: 'מה זה משרת ומה חשוב', icon: '△' },
  { id: 'east', label: 'תוצאות ורווחים', subtitle: 'טווח קצר וארוך', icon: '▷' },
  { id: 'south', label: 'דוגמאות וניסיון', subtitle: 'מקרים וזיכרונות', icon: '▽' },
  { id: 'goal', label: 'תוצאה רצויה', subtitle: 'לאן האדם רוצה להגיע', icon: '◇' },
  { id: 'resources', label: 'משאבים', subtitle: 'מה כבר עומד לרשותו', icon: '✦' },
];

/*
 * All conversation lines and certainty numbers below are invented for this
 * educational demo. They are not taken from any real person or client.
 * A rating records the fictional speaker's reported certainty, not objective
 * truth, statistical probability, or a clinical measure.
 */
export const FRAME_DISCOVERIES: FrameDiscovery[] = [
  {
    id: 'context-message', area: 'context', category: 'האירוע', focus: 'event',
    questions: ['מה בדיוק קרה עם ההודעה?', 'תוכל לתאר את הרגע שבו זה התחיל?', 'כשאתה אומר שהיא לא ענתה, מה קרה בפועל?'],
    response: 'שלחתי לה אתמול הודעה והצעתי להיפגש השבוע. מאז לא קיבלתי תשובה.',
    mapText: 'נשלחה אתמול הצעה להיפגש; עדיין אין תשובה',
    claimKind: 'said', certainty: 10,
    why: 'תיאור של אירוע מסוים. אין כאן עדיין מידע על הסיבה לאי־המענה.',
  },
  {
    id: 'context-emotion', area: 'context', category: 'רגש', focus: 'meaning',
    questions: ['מה הרגשת כשלא הגיעה תשובה?', 'איך הרגע הזה נחווה מבחינתך?', 'מה עלה בך כשבדקת את הטלפון?'],
    response: 'הרגשתי פגוע וקצת חרד. כל פעם שפתחתי את הטלפון זה חזר.',
    mapText: 'פגיעה וחרדה כשאין מענה',
    claimKind: 'said', certainty: 9,
    why: 'זו החוויה הסובייקטיבית שהוא מתאר. אין צורך לתקן אותה.',
  },
  {
    id: 'west-must', area: 'west', category: 'מה חייב להיות נכון במפה', focus: 'meaning',
    questions: ['מה צריך להיות נכון מבחינתך כדי ששתיקה תרגיש כמו חוסר אכפתיות?', 'איזו ציפייה עומדת מאחורי המשמעות הזאת?', 'מה אתה מצפה שיקרה כשמישהו רוצה לשמור על קשר?'],
    response: 'כשמישהו רוצה קשר, אני מצפה שיחזור אליי, אפילו רק עם הודעה קצרה.',
    mapText: 'קשר משמעותי כולל ציפייה למענה',
    claimKind: 'necessary', certainty: 9,
    why: 'זו הנחת יסוד שהדובר אישר. היא אינה עובדה כללית על יחסים.',
  },
  {
    id: 'west-maybe', area: 'west', category: 'מה אולי נכון', focus: 'meaning',
    questions: ['אילו הסברים נוספים אתה עצמו רואה כאפשריים?', 'איזו אפשרות אחרת עולה אצלך, גם אם אינך משוכנע?', 'מה עוד יכול להסביר את חוסר התשובה, לפי מה שאתה יודע?'],
    response: 'אולי היא עסוקה. זה קרה בעבר, אבל הפעם זה עדיין פוגע בי.',
    mapText: 'ייתכן שהיא עסוקה',
    claimKind: 'possible', certainty: 5,
    why: 'אפשרות שהדובר עצמו העלה, לא הסבר שהמנחה הכניס מבחוץ.',
  },
  {
    id: 'west-cannot', area: 'west', category: 'מה לא מתיישב עם המפה', focus: 'meaning',
    questions: ['מה כרגע קשה לך לראות כאפשרי בתוך הסיפור הזה?', 'מה מבחינתך לא מסתדר יחד עם הרצון להיות קרובים?', 'איזו אפשרות מרגישה לך לא הגיונית, גם אם אחרים יראו אותה אחרת?'],
    response: 'קשה לי לדמיין שמישהו רוצה להיות קרוב אליי ומתעלם ממני שוב ושוב.',
    mapText: 'קרבה והתעלמות חוזרת אינן מתיישבות אצלו',
    claimKind: 'incompatible', certainty: 8,
    why: '״לא יכול להיות״ מתאר את גבולות המפה הנוכחית, לא אמת לוגית על העולם.',
  },
  {
    id: 'north-function', area: 'north', category: 'תפקיד ההתנהגות', focus: 'action',
    questions: ['מה ההפסקה ביוזמה נותנת לך באותו רגע?', 'מה אתה מנסה להשיג בכך שאתה מפסיק לכתוב?', 'במה ההתנהגות הזאת מועילה לך בטווח המיידי?'],
    response: 'היא מגינה עליי מהרגשה שעוד פעם מתעלמים ממני.',
    mapText: 'הפסקת היוזמה מגינה מפגיעה נוספת',
    claimKind: 'said', certainty: 9,
    why: 'מבררים את התפקיד החיובי בעיני האדם, בלי להמליץ על ההתנהגות.',
  },
  {
    id: 'north-value', area: 'north', category: 'מה חשוב', focus: 'meaning',
    questions: ['מה כל כך חשוב לך בקשר הזה?', 'כשאתה רוצה מענה, על איזה צורך הוא עונה?', 'מה היית רוצה להרגיש בתוך הקשר?'],
    response: 'חשוב לי לדעת שאני משמעותי גם לאחרים. אני רוצה הדדיות.',
    mapText: 'משמעות והדדיות בקשר',
    claimKind: 'said', certainty: 10,
    why: 'הכוונה והערך עוזרים להבין מדוע אותו אירוע חשוב כל כך.',
  },
  {
    id: 'east-short-cost', area: 'east', category: 'מחיר בטווח הקצר', focus: 'action',
    questions: ['מה קורה מיד אחרי שאתה מפסיק ליזום?', 'איזה מחיר יש לבחירה הזאת כבר עכשיו?', 'מה ההשלכה המיידית של ההתרחקות?'],
    response: 'אני מרגיש בודד יותר ומסתכל אם היא כבר שלחה משהו.',
    mapText: 'בדידות ודריכות אחרי הפסקת היוזמה',
    claimKind: 'said', certainty: 8,
    why: 'תוצאה מיידית שהדובר מדווח עליה, לא ניבוי של המנחה.',
  },
  {
    id: 'east-short-benefit', area: 'east', category: 'רווח בטווח הקצר', focus: 'action',
    questions: ['מה הרווח שאתה מקבל מההתרחקות כרגע?', 'מה נעשה קל יותר כשאתה לא כותב?', 'מה היתרון המיידי מבחינתך?'],
    response: 'אני לא צריך להסתכן בעוד הודעה שלא תיענה. יש הקלה מסוימת.',
    mapText: 'פחות חשיפה לדחייה, הקלה זמנית',
    claimKind: 'said', certainty: 9,
    why: 'גם להתנהגות שמחירה גבוה עשוי להיות רווח שמחזיק אותה.',
  },
  {
    id: 'east-long-cost', area: 'east', category: 'מחיר בטווח הארוך', focus: 'action',
    questions: ['אם הדפוס הזה יימשך, לאן אתה חושב שהוא יוביל?', 'לפי התחושה שלך, מה יהיה בעוד חודש אם שום דבר לא ישתנה?', 'מה יכול להיות המחיר המתמשך של להפסיק ליזום?'],
    response: 'אני חושש שנדבר פחות ופחות, ובסוף הקשר פשוט ייעלם.',
    mapText: 'חשש מהתרחקות ואובדן הקשר',
    claimKind: 'possible', certainty: 7,
    why: 'השלכה צפויה לפי הדובר, ולא גורל בלתי נמנע.',
  },
  {
    id: 'east-long-benefit', area: 'east', category: 'רווח בטווח הארוך', focus: 'action',
    questions: ['והאם אתה רואה גם יתרון אפשרי בטווח הארוך?', 'מה אתה עשוי להרוויח אם תפסיק לרדוף אחרי הקשר?', 'אם תמשיך להתרחק, מה אולי ישרת אותך בהמשך?'],
    response: 'אולי אדע לא להשקיע במקום שרק אני מחזיק בו את הקשר.',
    mapText: 'אולי פחות השקעה בקשר חד־צדדי',
    claimKind: 'possible', certainty: 6,
    why: 'רווח עתידי אפשרי לפי האדם, בלי להסכים שהקשר אכן חד־צדדי.',
  },
  {
    id: 'south-example', area: 'south', category: 'מקרה קודם', focus: 'event',
    questions: ['יש מקרה נוסף שאתה זוכר שבו הרגשת כך?', 'מה מהעבר הזכיר לך את ההודעה הזאת?', 'תוכל להביא דוגמה קונקרטית שהייתה לך?'],
    response: 'לפני חודש שלחתי לה הודעה והיא חזרה אליי רק אחרי יומיים.',
    mapText: 'לפני חודש הייתה תשובה אחרי יומיים',
    claimKind: 'said', certainty: 10,
    why: 'אוספים ניסיון עבר. עדיין לא מסיקים מה הייתה כוונתה.',
  },
  {
    id: 'south-other', area: 'south', category: 'דוגמה אחרת', focus: 'event',
    questions: ['יש לך גם זיכרון שונה מן הקשר הזה?', 'איזה רגע אחר עם אותה חברה עולה לך?', 'מה עוד קרה ביניכם שחשוב למפה, גם אם הוא אחר?'],
    response: 'כשהיינו יחד לפני שבועיים, היא הייתה חמה מאוד, דיברנו הרבה וצחקנו.',
    mapText: 'במפגש קודם חווה חום וקִרבה',
    claimKind: 'said', certainty: 9,
    why: 'לא מאתגרים את ההכללה; פשוט מוסיפים עוד עובדה שהדובר בחר לספר.',
  },
  {
    id: 'goal-desired', area: 'goal', category: 'התוצאה הרצויה', focus: 'meaning',
    questions: ['מה היית רוצה שיקרה במקום זה?', 'לאיזה סוג קשר אתה שואף?', 'אם הדברים היו מתאימים לך, איך זה היה נראה?'],
    response: 'הייתי רוצה שניזום שנינו ושאוכל לשאול בלי לפחד שאצא נזקק.',
    mapText: 'הדדיות ויכולת לשאול בלי פחד',
    claimKind: 'said', certainty: 10,
    why: 'מגדירים יעד במילים של האדם, בלי להפוך אותו להוראה לפעול.',
  },
  {
    id: 'resources-open', area: 'resources', category: 'משאב קיים', focus: 'action',
    questions: ['באיזה מצב כן קל לך לדבר בפתיחות?', 'מתי כבר הצלחת לומר למישהו מה אתה צריך?', 'מה עוזר לך להיות ישיר כשחשוב לך הקשר?'],
    response: 'כשאני רגוע, אני יודע לשאול בצורה פשוטה ולהקשיב לתשובה.',
    mapText: 'מסוגל לדבר ישירות כשהוא רגוע',
    claimKind: 'said', certainty: 8,
    why: 'משאב שהאדם עצמו מזהה. בפריימינג רק מתעדים אותו.',
  },
];

export const CERTAINTY_QUESTIONS = [
  'מ־1 עד 10, עד כמה אתה עומד מאחורי זה?',
  'כשאתה מרגיש את זה עכשיו, עד כמה זה נכון עבורך מ־1 עד 10?',
  'כמה אתה בטוח באמירה הזאת כרגע, בין 1 ל־10?',
  'עד כמה זה משכנע אותך מבפנים, אם 10 זו ודאות מלאה?',
];

export function certaintyBand(value: number | null): 'unknown' | 'low' | 'medium' | 'high' {
  if (value === null) return 'unknown';
  if (value <= 4) return 'low';
  if (value <= 7) return 'medium';
  return 'high';
}
