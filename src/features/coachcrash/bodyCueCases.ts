export type BodyZone = 'face' | 'shoulders' | 'chest' | 'hands' | 'spine' | 'legs';
export type BodyGroup = 'crash' | 'coach' | 'ambiguous';
export type PoseId =
  | 'hunched' | 'defensive' | 'headtouch' | 'withdrawn' | 'guarded'
  | 'grounded' | 'open' | 'attentive' | 'connected' | 'holding'
  | 'crossed' | 'reading' | 'jaw' | 'lookaside' | 'fidget'
  | 'cold' | 'step' | 'smile' | 'upright' | 'handchest';

export interface BodyCueCase {
  id: number;
  group: BodyGroup;
  pose: PoseId;
  title: string;
  context: string;
  zones: BodyZone[];
  observation: string;
  assumption: string;
  alternative: string;
  question: string;
  bodyPractice: string;
  imageryPractice: string;
}

export const ZONE_LABELS: Record<BodyZone, string> = {
  face: 'ראש ופנים',
  shoulders: 'כתפיים',
  chest: 'חזה ונשימה',
  hands: 'ידיים',
  spine: 'גב ויציבה',
  legs: 'רגליים ובסיס',
};

export const BODY_CUE_CASES: BodyCueCase[] = [
  {
    id: 1, group: 'crash', pose: 'hunched', title: 'התכנסות',
    context: 'דמות שומעת הערה לא צפויה ומצטמצמת מעט בגוף.',
    zones: ['shoulders', 'spine'], observation: 'הכתפיים נוטות קדימה והגב מכונס.',
    assumption: 'הוא בטוח מתבייש בעצמו.', alternative: 'זו יכולה להיות תגובה רגעית, קור, עייפות או תנוחה נוחה.',
    question: 'מה משתנה בגוף כשנותנים לרגליים לשאת קצת יותר מן המשקל?',
    bodyPractice: 'שב/י או עמוד/י בנוח, הרגש/י את כפות הרגליים והרפה/י מעט את הכתפיים, בלי לכפות זקיפות.',
    imageryPractice: 'דמיין/י משטח יציב מתחת לרגליים, כזה שמאפשר לגוף להניח עליו קצת מהמשקל.',
  },
  {
    id: 2, group: 'crash', pose: 'defensive', title: 'ידיים מגוננות',
    context: 'דמות עומדת מול שיחה שנחווית כמאתגרת.',
    zones: ['hands', 'chest'], observation: 'הזרועות צמודות לגוף וכפות הידיים קרובות לחזה.',
    assumption: 'היא בהכרח כועסת על מי שמולה.', alternative: 'אולי קר לה, אולי היא מקשיבה, ואולי זו תנוחה רגילה עבורה.',
    question: 'איך נראה מרווח קטן של בחירה בין גירוי לתגובה?',
    bodyPractice: 'נסו לרכך מעט את כפות הידיים, ולהשאיר את המרחק מן האחר בדיוק כפי שנוח לכם.',
    imageryPractice: 'דמיין/י שיש סביבך מרחב אישי שמותר לך לפתוח או לסגור לפי בחירתך.',
  },
  {
    id: 3, group: 'crash', pose: 'headtouch', title: 'יד על הראש',
    context: 'דמות שמה יד על המצח אחרי שקיבלה מידע מורכב.',
    zones: ['face', 'hands'], observation: 'כף יד נוגעת במצח והראש נוטה מעט מטה.',
    assumption: 'הוא לא מסוגל להתמודד עם המצב.', alternative: 'ייתכן שהוא מרוכז, מתכנן, עייף או פשוט מסדר את השיער.',
    question: 'איך אפשר להפחית עומס בלי לבטל את הבעיה?',
    bodyPractice: 'הניחו ליד לנוח, הביטו סביב ובחרו פרט אחד שאתם רואים בבירור.',
    imageryPractice: 'דמיינו שולחן עבודה ועליו רק הדבר הבא שתרצו לבחון, לא את כל המשימות בבת אחת.',
  },
  {
    id: 4, group: 'crash', pose: 'withdrawn', title: 'מבט מושפל',
    context: 'דמות אינה פונה במבט למי שמולה.',
    zones: ['face', 'spine'], observation: 'המבט פונה כלפי מטה והראש מתכופף מעט.',
    assumption: 'היא ודאי מנותקת ולא מעוניינת בשיחה.', alternative: 'ייתכן שהיא חושבת, קוראת, מכבדת את פרטיותה או נמנעת מסנוור.',
    question: 'איך מזהים מתי המבט חוזר למרחב, בלי לכפות קשר עין?',
    bodyPractice: 'הפנו מבט לנקודה נעימה בחדר, ואז תנו לעיניים לנוח. קשר עין אינו חובה.',
    imageryPractice: 'דמיינו חלון רחב אל החדר: איזה פרט חדש מתגלה כשמרחיבים את שדה הראייה?',
  },
  {
    id: 5, group: 'crash', pose: 'guarded', title: 'אגרופים קפוצים',
    context: 'דמות עומדת ומחזיקה את כפות ידיה סגורות.',
    zones: ['hands', 'shoulders'], observation: 'כפות הידיים קפוצות והכתפיים נראות מתוחות.',
    assumption: 'הוא תוקפני ולכן מסוכן.', alternative: 'זו עשויה להיות דריכות, התרגשות, קור או מאמץ גופני.',
    question: 'אפשר להרגיש כוח בלי להפעיל לחץ?',
    bodyPractice: 'סגרו בעדינות אגרוף, שחררו אותו והבחינו בהבדל בין כוח לבין כיווץ.',
    imageryPractice: 'דמיינו את כוח האחיזה הופך לאחיזה בטוחה במשהו שחשוב לכם, בלי להילחם.',
  },
  {
    id: 6, group: 'coach', pose: 'grounded', title: 'בסיס יציב',
    context: 'דמות עומדת בכפות רגליים מאוזנות.',
    zones: ['legs', 'spine'], observation: 'הרגליים מונחות במרחק נוח זו מזו והגוף מאוזן.',
    assumption: 'היא בהכרח רגועה ובעלת ביטחון.', alternative: 'יציבה יציבה אינה מוכיחה דבר על מה שהיא מרגישה מבפנים.',
    question: 'מה מאפשר לך לחוש בסיס בלי להחזיק את הגוף בכוח?',
    bodyPractice: 'הרגישו את שתי כפות הרגליים, העבירו משקל מעט מצד לצד וחזרו לאמצע נוח.',
    imageryPractice: 'דמיינו עץ שיכול להתנועע ברוח בלי לאבד את הקשר שלו לקרקע.',
  },
  {
    id: 7, group: 'coach', pose: 'open', title: 'כפות ידיים פתוחות',
    context: 'דמות מציגה רעיון בפני קבוצה ומחזיקה ידיים פתוחות.',
    zones: ['hands', 'chest'], observation: 'כפות הידיים פתוחות והזרועות אינן צמודות לגוף.',
    assumption: 'הוא תמיד כן ואפשר לסמוך עליו.', alternative: 'זו יכולה להיות מחווה מכוונת או הרגל דיבור, לא סימן לאמינות.',
    question: 'האם פתיחות יכולה לדור יחד עם גבולות?',
    bodyPractice: 'פתחו את כפות הידיים ברוחב נוח, ואז החזירו אותן למצב שהכי מתאים לכם.',
    imageryPractice: 'דמיינו דלת שאפשר לפתוח מעט ולסגור כרצונכם. בחירה היא חלק מפתיחות.',
  },
  {
    id: 8, group: 'coach', pose: 'attentive', title: 'מבט קשוב',
    context: 'דמות מתבוננת בפרט בחדר בזמן שהיא מקשיבה.',
    zones: ['face', 'spine'], observation: 'הראש זקוף יחסית והעיניים פונות קדימה.',
    assumption: 'היא מודעת לגמרי לכל מה שמתרחש.', alternative: 'גם מבט ממוקד יכול להיות מאמץ, חלימה בהקיץ או תנוחה מקרית.',
    question: 'מה אתה יכול לשים לב אליו בלי לנתח אותו?',
    bodyPractice: 'הביטו סביב ובחרו צבע, צליל ותחושת מגע אחת. אין צורך לשנות אותם.',
    imageryPractice: 'דמיינו שאתם יושבים ליד חלון ומבחינים בתנועה הרחבה של החיים בחוץ.',
  },
  {
    id: 9, group: 'coach', pose: 'connected', title: 'מחווה של קשר',
    context: 'דמות מפנה יד קדימה ומותירה מרחב בין האנשים.',
    zones: ['hands', 'face'], observation: 'כף יד מופנית קדימה והפנים לכיוון בן השיח.',
    assumption: 'הוא באמת מרגיש חיבור עמוק.', alternative: 'מחווה חברתית אינה מוכיחה קִרבה או הסכמה.',
    question: 'איך אפשר להציע קשר בלי לדרוש אותו?',
    bodyPractice: 'בחרו מחווה קטנה שמתאימה לכם כדי לסמן הקשבה, גם בלי לגעת באדם אחר.',
    imageryPractice: 'דמיינו אדם תומך במרחק הנכון עבורכם. מה הופך קשר למכבד?',
  },
  {
    id: 10, group: 'coach', pose: 'holding', title: 'החזקה רכה',
    context: 'דמות מניחה כף יד בעדינות על אזור החזה.',
    zones: ['hands', 'chest'], observation: 'כף היד נוגעת בבית החזה והכתפיים אינן מורמות במיוחד.',
    assumption: 'היא כבר עיבדה את כל הרגשות הקשים.', alternative: 'יכול להיות שזו מחוות נחמה, כאב, הרגל או תנועה חולפת.',
    question: 'מהי דרך עדינה לתת מקום לחוויה בלי להכריח אותה להשתנות?',
    bodyPractice: 'אם נעים לכם, הניחו יד על אזור נוח בגוף, או פשוט הרגישו את הכיסא.',
    imageryPractice: 'דמיינו כלי רחב שמאפשר להכיל גם חוויה נעימה וגם חוויה לא נעימה.',
  },
  {
    id: 11, group: 'ambiguous', pose: 'crossed', title: 'ידיים שלובות',
    context: 'דמות מחזיקה זרועות משולבות בזמן המתנה.',
    zones: ['hands', 'chest'], observation: 'הזרועות שלובות על החזה.',
    assumption: 'היא לא פתוחה לשום דבר.', alternative: 'יכול להיות שפשוט נוח לה, קר לה, או שהיא מחזיקה את עצמה בזמן הקשבה.',
    question: 'איזה פרט בהקשר יעזור להבחין בין נוחות לבין הסתגרות?',
    bodyPractice: 'נסו לרגע שילוב ידיים ואז הניחו אותן בנוחות. האם משהו משתנה? גם תשובת לא היא תשובה.',
    imageryPractice: 'דמיינו שיש לכם שליטה מלאה על הגבול האישי. מתי מתאים לשמור אותו קרוב?',
  },
  {
    id: 12, group: 'ambiguous', pose: 'reading', title: 'ראש מוטה לעבר ספר',
    context: 'דמות מביטה מטה כדי לקרוא.',
    zones: ['face', 'spine'], observation: 'הראש מוטה קדימה והעיניים פונות מטה.',
    assumption: 'הוא עצוב ומסתגר.', alternative: 'הפעם ההקשר מסביר את המבט: הוא פשוט קורא.',
    question: 'איזה הבדל עושה ידיעת ההקשר?',
    bodyPractice: 'התבוננו לרגע מטה על טקסט, ואז הרימו מבט. שימו לב לנוחות ולא לאבחון.',
    imageryPractice: 'דמיינו את התמונה מתרחבת וכוללת את הספר, השולחן והסיבה לתנוחה.',
  },
  {
    id: 13, group: 'ambiguous', pose: 'jaw', title: 'לסת מהודקת',
    context: 'דמות מתרכזת בפעולה שדורשת דיוק.',
    zones: ['face'], observation: 'השפתיים צמודות והלסת נראית מהודקת.',
    assumption: 'היא כועסת.', alternative: 'ריכוז, מאמץ, הרגל, כאב או צילום רגעי עשויים להיראות דומים.',
    question: 'מה אפשר לתאר בלי לקרוא מחשבות?',
    bodyPractice: 'שימו לב אם הלסת מתוחה; אפשר לאפשר לשיניים להיפרד מעט, ללא מאמץ.',
    imageryPractice: 'דמיינו שהפנים מקבלות רשות להיות נינוחות גם בזמן שממשיכים להתרכז.',
  },
  {
    id: 14, group: 'ambiguous', pose: 'lookaside', title: 'מבט לצד',
    context: 'דמות מסיטה מבט בזמן שיחה.',
    zones: ['face'], observation: 'העיניים פונות הצידה ולא ישירות אל הדובר.',
    assumption: 'הוא משקר.', alternative: 'אין בסיס לקבוע שקר מכיוון המבט. אפשר לחשוב, להקשיב או להימנע מסנוור.',
    question: 'אילו שאלות יבדקו את השיחה עצמה במקום לנסות לפענח אדם ממבט?',
    bodyPractice: 'הסיטו את העיניים בין כמה נקודות נוחות. מצאו כיוון שמסייע להקשבה עבורכם.',
    imageryPractice: 'דמיינו את סיפורו של האדם כמפה עם פרטים חסרים; לא חייבים למלא אותם בניחוש.',
  },
  {
    id: 15, group: 'ambiguous', pose: 'fidget', title: 'תנועה בכפות הידיים',
    context: 'דמות מניעה אצבעות כשהיא מספרת משהו חשוב.',
    zones: ['hands'], observation: 'האצבעות נעות זו ביחס לזו.',
    assumption: 'היא לחוצה וחסרת ביטחון.', alternative: 'זו יכולה להיות התרגשות, הרגל, ויסות עצמי או סתם תנועה.',
    question: 'האם תנועה קטנה יכולה לפעמים לעזור לחשוב?',
    bodyPractice: 'תנו לאצבעות תנועה קלה ואז עצרו. בדקו איזו אפשרות נוחה יותר לכם.',
    imageryPractice: 'דמיינו קצב עדין שמאפשר לאנרגיה לנוע בלי שצריך לשפוט אותו.',
  },
  {
    id: 16, group: 'ambiguous', pose: 'cold', title: 'כתפיים מורמות',
    context: 'דמות ממתינה בחוץ ביום קר.',
    zones: ['shoulders'], observation: 'הכתפיים מורמות והצוואר מכונס מעט.',
    assumption: 'היא מפחדת.', alternative: 'קור פיזי הוא הסבר פשוט וסביר באותה מידה.',
    question: 'מה ההבדל בין תיאור גופני לבין פירוש פסיכולוגי?',
    bodyPractice: 'כיווצו כתפיים בעדינות והרפו. הרגישו את השינוי בלי לתת לו תווית רגשית.',
    imageryPractice: 'דמיינו שמיכה חמימה או מקום נעים שתומך בכם.',
  },
  {
    id: 17, group: 'ambiguous', pose: 'step', title: 'רגל בתנועה',
    context: 'דמות נעה ממקום למקום בזמן רעיון חדש.',
    zones: ['legs', 'spine'], observation: 'רגל אחת נמצאת לפני השנייה והגוף נוטה קלות.',
    assumption: 'הוא לא מסוגל להישאר רגוע.', alternative: 'ייתכן שהוא נמרץ, הולך, מחפש נוחות או מתכונן לפעולה.',
    question: 'מתי תנועה תומכת ביכולת שלך להיות נוכח?',
    bodyPractice: 'אם מתאים, עשו שני צעדים איטיים והרגישו את כפות הרגליים. אפשר גם בישיבה.',
    imageryPractice: 'דמיינו מסלול קצר עם מקום לעצור בכל שלב ולבחור את הצעד הבא.',
  },
  {
    id: 18, group: 'ambiguous', pose: 'smile', title: 'חיוך',
    context: 'דמות מחייכת במהלך מפגש חברתי.',
    zones: ['face'], observation: 'זוויות הפה מורמות ונראה חיוך.',
    assumption: 'היא מאושרת ואין לה שום קושי.', alternative: 'חיוך יכול להיות שמחה, נימוס, מבוכה או תגובה חברתית.',
    question: 'איך בודקים חוויה פנימית בלי להסתמך רק על הבעות?',
    bodyPractice: 'נסו להבחין בשרירי הפנים בלי לחייב את עצמכם לחייך או לשנות הרגשה.',
    imageryPractice: 'דמיינו שלכל פנים יש גם סיפור פנימי שלא רואים מבחוץ.',
  },
  {
    id: 19, group: 'ambiguous', pose: 'upright', title: 'יציבה זקופה',
    context: 'דמות עומדת זקוף מול קהל.',
    zones: ['spine', 'legs'], observation: 'הגב זקוף יחסית והרגליים יציבות.',
    assumption: 'הוא בטוח בעצמו במאה אחוז.', alternative: 'גם אדם לחוץ יכול לבחור ביציבה זקופה, ואדם רגוע יכול לשבת כפוף.',
    question: 'האם אפשר לתרגל יציבה בלי לכפות על עצמנו תחושת ביטחון?',
    bodyPractice: 'הגיעו לזקיפות נוחה בלי לנעול ברכיים; בדקו אם צריך להתרכך מעט.',
    imageryPractice: 'דמיינו עמוד גמיש שיכול לשאת משקל וגם לנוע.',
  },
  {
    id: 20, group: 'ambiguous', pose: 'handchest', title: 'יד על הלב',
    context: 'דמות מניחה יד על החזה במהלך שיחה.',
    zones: ['hands', 'chest'], observation: 'כף היד מונחת על מרכז החזה.',
    assumption: 'היא בהכרח כנה ומחוברת לעצמה.', alternative: 'זו עשויה להיות מחווה טבעית, הרגל תרבותי, התרגשות או אי־נוחות.',
    question: 'מה אפשר לשאול במקום להעניק למחווה משמעות אחת?',
    bodyPractice: 'אם נוח, הניחו יד באזור הגוף שנותן תחושת יציבות; אפשר גם להימנע ממגע.',
    imageryPractice: 'דמיינו מקור תמיכה עדין שאינו מצפה מכם להרגיש משהו מסוים.',
  },
];

export const BODY_CUE_COUNT = BODY_CUE_CASES.length;
