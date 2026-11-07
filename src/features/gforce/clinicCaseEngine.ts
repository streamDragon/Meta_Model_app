/**
 * Authored, deterministic case simulation. No model API and no user-provided case data.
 * Scene cards are deliberately NOT available to the therapist at the beginning.
 * Only concrete sensory questions (Meta Model row 5) reveal visual scene cards.
 */
export type SceneId = 'room' | 'goal' | 'tools' | 'collect' | 'sweep' | 'stuck' | 'scope' | 'fatigue' | 'toolgap' | 'choice' | 'permission' | 'maintenance';
export type Focus = 'opening' | 'present' | 'goal' | 'preparation' | 'first-action' | 'next-action' | 'barrier' | 'values' | 'time';
export type Family = 'rapport' | 'row4' | 'row5' | 'gforce' | 'barrier' | 'future';
export type QuestionId =
  | 'reflect' | 'now-sense' | 'time-before' | 'time-after' | 'goal' | 'goal-sense'
  | 'prepare' | 'prepare-sense' | 'first-action' | 'first-sense' | 'next-action'
  | 'next-sense' | 'barrier' | 'stuck-sense' | 'all-or-nothing' | 'scope-sense'
  | 'values' | 'alternative' | 'state' | 'compare' | 'smart' | 'sequence-check'
  | 'push' | 'repair' | 'return-goal'
  | 'fatigue-context' | 'fatigue-sense' | 'tool-hurdle' | 'toolgap-sense'
  | 'decision-burden' | 'choice-sense' | 'permission-belief' | 'permission-sense'
  | 'sustainability' | 'maintenance-sense';

export interface Scene {
  id: SceneId;
  title: string;
  observation: string;
  art: 'clutter' | 'clean' | 'tools' | 'basket' | 'sweep' | 'stuck' | 'scope' | 'fatigue' | 'toolgap' | 'choice' | 'permission' | 'maintenance';
  kind: 'spine' | 'branch';
  /** Branches connect to a main visual only when that parent has itself been revealed. */
  parent?: SceneId;
}

export const SCENES: Record<SceneId, Scene> = {
  room: { id: 'room', title: 'מה רואים עכשיו', observation: 'בגדים ושקית על הרצפה, חפצים בפינה. זו רצפה עמוסה, לא בהכרח בית שלם שצריך לפרק.', art: 'clutter', kind: 'spine' },
  goal: { id: 'goal', title: 'התמונה של מספיק טוב', observation: 'הרצפה הגלויה פנויה, אפשר לעבור בלי להיתקל בדברים. המיטה והארונות אינם חלק מהיעד הפעם.', art: 'clean', kind: 'spine' },
  tools: { id: 'tools', title: 'כלים מוכנים', observation: 'פח, מטאטא ויעה ליד הכניסה, לפני שמתחילים לפנות.', art: 'tools', kind: 'spine' },
  collect: { id: 'collect', title: 'חפץ אחד למקום ביניים', observation: 'חפץ אחד עובר מהרצפה לסל ביניים, בלי לסדר את כל הארון.', art: 'basket', kind: 'spine' },
  sweep: { id: 'sweep', title: 'טאטוא השטח הגלוי', observation: 'אחרי שהרצפה פנויה מחפצים, המטאטא עובר על האריחים הנגישים.', art: 'sweep', kind: 'spine' },
  stuck: { id: 'stuck', title: 'רגע התקיעות', observation: 'הוא מרים בגד, מסתכל אל הארון, נעצר מול עוד עשר אפשרויות ולא מניח את הבגד.', art: 'stuck', kind: 'branch', parent: 'collect' },
  scope: { id: 'scope', title: 'המלכודת של הכול או כלום', observation: 'המשימה מתרחבת מהרצפה אל המיטה, הארון וכל הבית; היעד המקורי נעלם.', art: 'scope', kind: 'branch', parent: 'goal' },
  fatigue: { id: 'fatigue', title: 'ערב אחרי יום עמוס', observation: 'הוא יושב על קצה הכיסא עם התיק, והחדר נשאר כמו שהיה. המשאב החסר עשוי להיות זמן התאוששות.', art: 'fatigue', kind: 'branch', parent: 'room' },
  toolgap: { id: 'toolgap', title: 'היעה לא נמצא', observation: 'המטאטא ליד הקיר, אבל היעה חסר. בלי פתרון קטן יש מסלול שמסתיים בטאטוא בלי איסוף.', art: 'toolgap', kind: 'branch', parent: 'tools' },
  choice: { id: 'choice', title: 'יותר מדי מקומות לכל חפץ', observation: 'שלושה ערימות זמניות מתחרות על אותו בגד. הוא נתקע בבחירה של מקום קבוע, עוד לפני שהרצפה מתפנה.', art: 'choice', kind: 'branch', parent: 'collect' },
  permission: { id: 'permission', title: 'מותר לעצור כשהרצפה פנויה?', observation: 'הוא עומד על רצפה פנויה אבל מסתכל אל הארון הפתוח; מבחינתו ההצלחה עוד אינה שלמה.', art: 'permission', kind: 'branch', parent: 'goal' },
  maintenance: { id: 'maintenance', title: 'מה יישאר גם מחר?', observation: 'ביום הבא שקית חדשה מונחת ליד הדלת. צריך פתרון שהאדם מוכן לחיות איתו, לא רק תמונת ניצחון.', art: 'maintenance', kind: 'branch', parent: 'sweep' },
};

export interface Question {
  id: QuestionId;
  label: string;
  family: Family;
}
export const QUESTIONS: Question[] = [
  { id: 'reflect', family: 'rapport', label: 'מה הכי מכביד עליך כשאתה מנסה להתחיל?' },
  { id: 'now-sense', family: 'row5', label: 'כשאתה אומר ״בלגן״, מה בדיוק היינו רואים בחדר?' },
  { id: 'time-before', family: 'row4', label: 'מתי זה קורה? מה קורה ממש לפני שאתה נתקע?' },
  { id: 'time-after', family: 'row4', label: 'ומה קורה מיד אחרי שאתה מתחיל לסדר?' },
  { id: 'goal', family: 'gforce', label: 'מה היית רוצה שיהיה אחרת בסוף היום?' },
  { id: 'goal-sense', family: 'row5', label: 'איך ספציפית נראית הרצפה כשהיא מסודרת מספיק?' },
  { id: 'prepare', family: 'gforce', label: 'מה כדאי שיהיה מוכן לפני הפעולה הראשונה?' },
  { id: 'prepare-sense', family: 'row5', label: 'איך בדיוק נראית ההכנה הזאת בחדר?' },
  { id: 'first-action', family: 'gforce', label: 'מה עשוי להיות הצעד הראשון, הקטן באמת?' },
  { id: 'first-sense', family: 'row5', label: 'תראה לי בדיוק מה אתה עושה בצעד הראשון.' },
  { id: 'next-action', family: 'row4', label: 'מה יקרה אחר כך, אחרי הצעד הראשון?' },
  { id: 'next-sense', family: 'row5', label: 'איך בדיוק נראית הפעולה שבאה אחר כך?' },
  { id: 'barrier', family: 'barrier', label: 'באיזה רגע אתה נעצר, ומה עובר לך בראש?' },
  { id: 'stuck-sense', family: 'row5', label: 'אם אצפה ברגע התקיעות, מה בדיוק אראה אותך עושה?' },
  { id: 'all-or-nothing', family: 'barrier', label: 'מה המשמעות בשבילך של לסדר רק את הרצפה?' },
  { id: 'scope-sense', family: 'row5', label: 'כשהמשימה פתאום גדלה, איך זה נראה ממש?' },
  { id: 'values', family: 'gforce', label: 'מה חשוב לך בסדר, מעבר לרצפה הנקייה?' },
  { id: 'alternative', family: 'barrier', label: 'מה יכול להיות ״טוב דיו״ בלי לעשות הכול?' },
  { id: 'state', family: 'future', label: 'כשאתה מדמיין את התוצאה, איך זה מרגיש לך?' },
  { id: 'compare', family: 'future', label: 'שים רגע רק את ההתחלה ואת הסוף מול העיניים. מה קורה לך?' },
  { id: 'smart', family: 'future', label: 'מה תהיה תוצאה מוגדרת שאפשר לבדוק היום?' },
  { id: 'sequence-check', family: 'row4', label: 'האם הרצף הזה באמת מתאים לך, או שאתה רואה סדר אחר?' },
  { id: 'push', family: 'gforce', label: 'אז תגיד לי מיד את כל השלבים, לפי הסדר.' },
  { id: 'repair', family: 'rapport', label: 'נראה שרצתי קדימה. מה חשוב שאבין לפני שממשיכים?' },
  { id: 'return-goal', family: 'future', label: 'בוא נחזור למה שאתה רוצה להשיג הפעם, לא לכל הבית.' },
  { id: 'fatigue-context', family: 'row4', label: 'באיזה שעה זה קורה, ומה הייתה לך האנרגיה רגע קודם?' },
  { id: 'fatigue-sense', family: 'row5', label: 'אם הייתי מצלם את הרגע שלפני ההתחלה, מה הייתי רואה?' },
  { id: 'tool-hurdle', family: 'barrier', label: 'האם באמת יש לך את כל הכלים זמינים? מה עלול להיות חסר?' },
  { id: 'toolgap-sense', family: 'row5', label: 'איפה בדיוק המטאטא והיעה נמצאים עכשיו, מה היית רואה?' },
  { id: 'decision-burden', family: 'barrier', label: 'מה מכביד עליך כשאתה צריך להחליט לאן הולך כל חפץ?' },
  { id: 'choice-sense', family: 'row5', label: 'כשיש לך כמה אפשרויות, מה רואים אותך עושה עם החפץ?' },
  { id: 'permission-belief', family: 'barrier', label: 'מי קבע שסיום חלקי אינו נחשב? ומה יהיה אם תעצור?' },
  { id: 'permission-sense', family: 'row5', label: 'איך זה ממש נראה כשסיימת את הרצפה ועדיין לא הרשית לעצמך לעצור?' },
  { id: 'sustainability', family: 'future', label: 'ומה יקרה מחר, אחרי שהרצפה כבר פנויה?' },
  { id: 'maintenance-sense', family: 'row5', label: 'איך ייראה המבחן הראשון לשמירת הסדר ביום שאחרי?' },
];

export interface Turn {
  id: number;
  question: string;
  answer: string;
  family: Family;
  newlyRevealed?: SceneId;
}

export interface Session {
  focus: Focus;
  response: string;
  turns: Turn[];
  /** Order of discovery, editable by therapist; not the secret solution. */
  sceneOrder: SceneId[];
  facts: string[];
  rapport: number;
  load: number;
  energy: number;
  lastReveal: SceneId | null;
  /** Per-card observations collected in a dialogue, not clinical measurements. */
  probes: Partial<Record<SceneId, Partial<Record<'imagine' | 'comfort' | 'micro', 'ready' | 'blocked' | 'uncertain'>>>>;
}

export const FICTIONAL_CASE = {
  name: 'איתן',
  age: 41,
  introduction: '״אני רוצה לסדר את החדר, אבל כל פעם שאני מתחיל זה נהיה גדול עליי. בסוף אני פשוט עוזב הכול.״',
  disclaimer: 'דמות בדיונית לתרגול שיחה, לא מטופל אמיתי ולא אבחון.',
};

export function createSession(): Session {
  return {
    focus: 'opening', response: FICTIONAL_CASE.introduction,
    turns: [], sceneOrder: [], facts: [],
    rapport: 3, load: 2, energy: 2, lastReveal: null, probes: {},
  };
}

const clamp = (n: number) => Math.max(0, Math.min(5, n));
const has = (s: Session, f: string) => s.facts.includes(f);
const seen = (s: Session, id: SceneId) => s.sceneOrder.includes(id);

export function suggestedQuestions(s: Session): Question[] {
  const byFocus: Record<Focus, QuestionId[]> = {
    opening: ['reflect', 'now-sense', 'goal', 'time-before', 'fatigue-context'],
    present: ['goal', 'time-after', 'prepare', 'barrier', 'fatigue-context'],
    goal: ['goal-sense', 'state', 'first-action', 'compare', 'permission-belief'],
    preparation: ['prepare-sense', 'tool-hurdle', 'first-action', 'barrier'],
    'first-action': ['first-sense', 'next-action', 'decision-burden', 'stuck-sense'],
    'next-action': ['next-sense', 'sustainability', 'sequence-check', 'barrier'],
    barrier: ['reflect', 'stuck-sense', 'all-or-nothing', 'alternative', 'decision-burden', 'permission-belief'],
    values: ['state', 'compare', 'alternative', 'goal-sense', 'permission-belief'],
    time: ['time-after', 'fatigue-sense', 'now-sense', 'first-action', 'goal'],
  };
  return byFocus[s.focus].map(id => QUESTIONS.find(q => q.id === id)!);
}

export function ask(s: Session, id: QuestionId): Session {
  const question = QUESTIONS.find(q => q.id === id);
  if (!question) return s;
  // Asking the identical question repeatedly cannot generate infinite motivation points.
  // A patient may repeat an answer or experience the repetition as pressure.
  const repeatableWhenPrepared: Partial<Record<QuestionId, boolean>> = {
    'prepare-sense': has(s, 'prepare') && !seen(s, 'tools'),
    'first-sense': has(s, 'first') && !seen(s, 'collect'),
    'next-sense': has(s, 'next') && !seen(s, 'sweep'),
    'stuck-sense': (has(s, 'barrier') || has(s, 'after')) && !seen(s, 'stuck'),
    'scope-sense': has(s, 'belief') && !seen(s, 'scope'),
    'fatigue-sense': (has(s, 'fatigue-context') || has(s, 'before')) && !seen(s, 'fatigue'),
    'toolgap-sense': (has(s, 'tool-hurdle') || has(s, 'prepare')) && !seen(s, 'toolgap'),
    'choice-sense': (has(s, 'choice-burden') || has(s, 'after')) && !seen(s, 'choice'),
    'permission-sense': (has(s, 'permission') || has(s, 'belief')) && !seen(s, 'permission'),
    'maintenance-sense': has(s, 'sustain') && seen(s, 'goal') && !seen(s, 'maintenance'),
  };
  if (s.turns.some(t => t.question === question.label) && !repeatableWhenPrepared[id]) {
    const justAsked = s.turns[s.turns.length - 1]?.question === question.label;
    const answer = justAsked
      ? 'אני כבר עניתי על זה. אולי ננסה להתקרב מכיוון אחר?'
      : 'אני חושב שכבר דיברנו על זה; לא עלה לי מידע חדש כרגע.';
    return { ...s, response: answer, lastReveal: null, rapport: clamp(s.rapport - Number(justAsked)),
      turns: [...s.turns, { id: s.turns.length + 1, question: question.label, answer, family: question.family }] };
  }
  let focus: Focus = s.focus;
  let answer = '';
  let changeRapport = 0;
  let changeLoad = 0;
  let changeEnergy = 0;
  let fact: string | undefined;
  let reveal: SceneId | undefined;

  switch (id) {
    case 'reflect':
      focus = 'barrier'; changeRapport = 1; changeLoad = -1; fact = 'felt-heard';
      answer = 'זה נהיה לי גדול מדי. אני מסתכל על משהו קטן, אבל בראש שלי אני כבר צריך לטפל בכל החדר. תודה שאתה לא ישר נותן לי רשימה.';
      break;
    case 'now-sense':
      focus = 'present'; reveal = 'room';
      answer = 'כרגע יש שני בגדים על הרצפה, שקית בפינה וכמה דברים ליד הכיסא. אני אומר ״כל הבית״ אבל למעשה אני רואה רק את הפינה הזו.';
      break;
    case 'time-before':
      focus = 'time'; fact = 'before';
      answer = 'זה לרוב בערב, אחרי העבודה. אני נכנס לחדר עייף, רואה את הרצפה, ומיד חושב על כל מה שלא הספקתי.';
      break;
    case 'time-after':
      focus = 'first-action'; fact = 'after';
      answer = 'אני מרים משהו, פתאום שם לב שגם הארון מבולגן, והדבר שהתחלתי נשאר לי ביד. ואז אני מפסיק.';
      break;
    case 'goal':
      focus = 'goal'; fact = 'goal';
      answer = 'אני רוצה להיכנס לחדר ולא לדרוך על כלום. לא חייב שהבית יהיה מושלם, אבל קשה לי להאמין שמותר לעצור באמצע.';
      break;
    case 'goal-sense':
      focus = 'goal'; fact = 'goal-sensory'; reveal = 'goal'; changeEnergy = 1;
      answer = 'אני רואה אריחים פנויים, אין בגדים או שקיות מתחת לרגליים, ואני יכול לעבור מהדלת לכיסא. הארון עדיין יכול להיות מבולגן. זו התמונה שאני רוצה.';
      break;
    case 'prepare':
      focus = 'preparation'; fact = 'prepare';
      answer = 'כנראה פח, מטאטא ויעה. אם הם בחדר, לא אסתובב באמצע לחפש אותם. אולי גם סל לדברים שאני לא יודע לאן להחזיר.';
      break;
    case 'prepare-sense':
      focus = 'preparation';
      if (has(s, 'prepare')) {
        reveal = 'tools';
        answer = 'כן, אני רואה את הפח, המטאטא והיעה ליד הדלת, ואת סל הביניים מוכן. רק אחר כך מתחיל. זה כבר מרגיש הרבה פחות מעורפל.';
      } else {
        answer = 'קשה לי לצייר את ההכנה כי עוד לא החלטתי מה בכלל אצטרך להביא.';
      }
      break;
    case 'first-action':
      focus = 'first-action'; fact = 'first';
      answer = 'אולי להרים פריט אחד מהרצפה ולשים בסל. לא לפתוח ארון ולסדר הכול, רק פריט אחד.';
      break;
    case 'first-sense':
      focus = 'first-action';
      if (has(s, 'first')) {
        reveal = 'collect';
        answer = 'אני עומד ליד הכיסא, מתכופף, מרים בגד אחד ומניח אותו בסל שמולי. זה הכול. אני רואה את החלק הקטן של הרצפה שהתפנה.';
      } else {
        answer = 'אני עוד לא יודע מה יהיה הדבר הראשון; כרגע הראש קופץ ישר לכל החדר.';
      }
      break;
    case 'next-action':
      if (has(s, 'first')) {
        focus = 'next-action'; fact = 'next';
        answer = 'אחרי שהחפצים שעל הרצפה בסל, אני יכול לטאטא רק את האזור שאפשר להגיע אליו. לא חייב לפתוח גם את המגירות.';
      } else {
        focus = 'first-action';
        answer = 'אחרי מה? אני עדיין לא בטוח מה תהיה הפעולה הראשונה שלי.';
      }
      break;
    case 'next-sense':
      focus = 'next-action';
      if (has(s, 'next')) {
        reveal = 'sweep';
        answer = 'אני מחזיק מטאטא, עובר על האריחים שבין הדלת לכיסא, אוסף את הלכלוך ליעה, ועוצר. ככה זה נראה.';
      } else {
        answer = 'אני יכול לדמיין רצפה נקייה, אבל לא את הפעולה שבאה אחרי. עוד חסר לי צעד.';
      }
      break;
    case 'barrier':
      focus = 'barrier'; fact = 'barrier';
      answer = 'בדיוק כשאני מרים פריט, אני חושב: ״אם כבר התחלת, אתה חייב לעשות יסודי״. ואז אני רואה עוד המון עבודה ואין לי כוח.';
      break;
    case 'stuck-sense':
      focus = 'barrier';
      if (has(s, 'barrier') || has(s, 'after')) {
        reveal = 'stuck';
        answer = 'רואים אותי עומד עם בגד ביד, מסתכל לארון, לא שם את הבגד בשום מקום. אני כאילו קופא מול כל האפשרויות.';
      } else {
        answer = 'אני רק יודע שאני נתקע. עוד לא ברור לי איפה זה קורה ממש.';
      }
      break;
    case 'all-or-nothing':
      focus = 'barrier'; fact = 'belief';
      if (s.rapport <= 1) {
        changeLoad = 1;
        answer = 'אני לא יודע להסביר עכשיו. כשאתה שואל את זה ככה אני מרגיש שאני צריך להוכיח שאני לא עצלן.';
      } else {
        answer = 'אם אני עושה רק חצי, אני מרגיש שעבדתי על עצמי. אבל אולי אני מערבב בין ״החדר מושלם״ לבין ״אפשר ללכת על הרצפה״.';
      }
      break;
    case 'scope-sense':
      focus = 'barrier';
      if (has(s, 'belief')) {
        reveal = 'scope';
        answer = 'התמונה משתנה: אני כבר מושך את כל הבגדים מהארון אל המיטה, מחפש קופסאות, ואז אין אפילו מקום להניח דברים. הרצפה כבר לא המטרה.';
      } else {
        answer = 'אני מרגיש שזה גדול יותר, אבל עוד לא הבנתי מה בדיוק גדל.';
      }
      break;
    case 'values':
      focus = 'values'; fact = 'value'; changeEnergy = 1; changeRapport = 1;
      answer = 'אני רוצה שקט, מרחב, ותחושה שאני בוחר מה לעשות. לא רק ניקיון. אני לא רוצה להפוך כל ערב לעוד משמרת.';
      break;
    case 'alternative':
      focus = 'goal'; fact = 'boundary'; changeLoad = -1;
      answer = 'יכול להיות שניקוי הרצפה הגלויה לבדו הוא הישג אמיתי. המיטה והארון יחכו. נראה לי שצריך לתת לזה שם אחר כדי שאוכל לעצור.';
      break;
    case 'state':
      focus = 'values';
      if (seen(s, 'goal')) {
        changeEnergy = 1; fact = 'state';
        answer = 'כשאני חושב על התמונה הסופית אני מרגיש קצת הקלה, אבל גם ספק אם אצליח. הקלה 3 מתוך 5; זה עוד לא ממש מושך אותי לפעול.';
      } else {
        answer = 'עדיין אין לי תמונה מספיק ברורה של הסוף כדי לדעת איך ארגיש שם.';
      }
      break;
    case 'compare':
      focus = 'values';
      if (seen(s, 'room') && seen(s, 'goal')) {
        fact = 'contrast'; changeEnergy = 1;
        answer = 'כשאני רואה רק את ההתחלה ואת הסוף, דווקא יש לי חשק. אבל כשאני מכניס בראש גם ארונות ומיטה, החשק נעלם. אולי חסר לי שלב קטן בדרך.';
      } else {
        answer = 'אני לא באמת רואה עדיין את שתי התמונות. קשה לי להשוות את מה שלא הגדרנו.';
      }
      break;
    case 'smart':
      focus = 'goal';
      if (seen(s, 'goal')) {
        fact = 'smart'; changeEnergy = 1;
        answer = 'היום, במשך 15 דקות, רק הרצפה בין הדלת לכיסא תהיה פנויה ומטואטאת. אדע שסיימתי כשאפשר ללכת עליה בלי להזיז דברים.';
      } else {
        answer = 'אני יכול להגיד 15 דקות, אבל מה בדיוק צריך לקרות בזמן הזה? עוד לא ברור לי מה ייחשב לסיום.';
      }
      break;
    case 'sequence-check':
      focus = 'next-action';
      if (s.sceneOrder.filter(scene => SCENES[scene].kind === 'spine').length >= 2) {
        fact = 'sequence-reviewed';
        answer = 'מבחינתי עדיף קודם להביא את הכלים ורק אז לפנות את החפצים. אבל אם כבר יש סל ליד הכיסא, אולי ארים קודם דבר אחד. יש יותר ממסלול אחד.';
      } else {
        answer = 'קשה לי לבחור רצף כשעוד לא ברור אילו מצבים או פעולות יש ביניהם.';
      }
      break;
    case 'push':
      focus = 'barrier'; changeRapport = -2; changeLoad = 2;
      answer = 'אני מרגיש שאתה כבר יודע מה אני צריך לעשות, אבל אני עדיין לא שם. אם זה רק לתת רשימת משימות, אני כבר מכיר את הרשימה.';
      break;
    case 'repair':
      focus = 'barrier'; changeRapport = 2; changeLoad = -1; fact = 'repair';
      answer = 'תודה. הכי קשה לי זה שאני כבר מתבייש בעצמי, ואני לא רוצה שגם פה אקבל ציון על כמה מהר אני מסדר.';
      break;
    case 'return-goal':
      focus = 'goal'; changeLoad = -1;
      answer = 'בדיוק. לא צריך לפתור את כל החיים שלי עכשיו. אם נצליח להגדיר סיום קטן וברור להיום, זה כבר משהו.';
      break;
    case 'fatigue-context':
      focus = 'time'; fact = 'fatigue-context';
      answer = 'זה בעיקר אחרי שמונה בערב. רגע לפני כן אני זורק את התיק ליד הכיסא ומרגיש שאין לי כמעט כוח. בבוקר זה סיפור אחר.';
      break;
    case 'fatigue-sense':
      focus = 'time';
      if (has(s, 'fatigue-context') || has(s, 'before')) {
        reveal = 'fatigue';
        answer = 'רואים אותי מתיישב ליד התיק, נשען לאחור ומסתכל על הבגדים שעל הרצפה. עוברות כמה דקות ואני עדיין על הכיסא.';
      } else answer = 'לא כל כך ברור לי מה הרגע שלפני, כי כל פעם זה קורה בזמן אחר.';
      break;
    case 'tool-hurdle':
      focus = 'preparation'; fact = 'tool-hurdle';
      answer = 'המטאטא נמצא, אבל אני לא בטוח איפה היעה. אם הוא חסר, אני יכול לעשות את כל הטאטוא ולהיתקע בסוף.';
      break;
    case 'toolgap-sense':
      focus = 'preparation';
      if (has(s, 'tool-hurdle') || has(s, 'prepare')) {
        reveal = 'toolgap';
        answer = 'אני רואה את המטאטא ליד הקיר. המקום שבו אמור להיות היעה ריק, ואני מתחיל לחפש בארונות במקום להתחיל.';
      } else answer = 'אני עוד לא יודע אילו כלים בכלל דרושים, אז קשה לי לתאר איפה הם.';
      break;
    case 'decision-burden':
      focus = 'barrier'; fact = 'choice-burden';
      answer = 'אני מחזיק בגד אבל מתלבט: לכביסה, לארון, לתרומה? ברגע שאני חייב להכריע הכול, גם הבגד האחד נעשה גדול מדי.';
      break;
    case 'choice-sense':
      focus = 'barrier';
      if (has(s, 'choice-burden') || has(s, 'after')) {
        reveal = 'choice';
        answer = 'יש מולי שלוש ערימות לא מוגדרות. אני מעביר את אותו הבגד ביניהן ואז פשוט משאיר אותו על הכיסא.';
      } else answer = 'אני חושב שאני מתלבט, אבל עדיין לא פירטתי אילו בחירות בדיוק.';
      break;
    case 'permission-belief':
      focus = 'barrier'; fact = 'permission';
      answer = 'גדלתי עם הרעיון שאם לא סיימתי הכול, אז לא עשיתי כלום. אולי זה לא חוק, אבל זו התחושה שמגיעה בסוף.';
      break;
    case 'permission-sense':
      focus = 'barrier';
      if (has(s, 'permission') || has(s, 'belief')) {
        reveal = 'permission';
        answer = 'אני עומד על רצפה פנויה, מסתכל לארון הפתוח וחושב: ״אסור לי לנוח עדיין״. אז אני פותח עוד ארון.';
      } else answer = 'אני עדיין לא יכול לתאר את הרגע הזה בלי להבין למה קשה לי לקרוא לזה סיום.';
      break;
    case 'sustainability':
      focus = 'goal'; fact = 'sustain';
      answer = 'אם מחר תהיה שוב שקית ליד הדלת, אני עלול להגיד ״הנה הכול חזר״. אולי כדאי שההישג יהיה פשוט ושאפשר לתחזק אותו.';
      break;
    case 'maintenance-sense':
      focus = 'goal';
      if (has(s, 'sustain') && seen(s, 'goal')) {
        reveal = 'maintenance';
        answer = 'מחר אני רואה שקית אחת ליד הדלת. במקום להיבהל, אני שם אותה בסל במשך דקה וממשיך. זה לא חוזר להיות פרויקט ענק.';
      } else answer = 'אני עוד לא יודע איך נראה מחר, כי אפילו התוצאה של היום לא ממש מוגדרת אצלי.';
      break;
  }
  // The sensory row is not magic. When the relationship is strained,
  // pushing for visual detail may elicit withdrawal rather than a picture.
  if (s.rapport <= 1 && question.family === 'row5' && reveal && !seen(s, reveal)) {
    reveal = undefined;
    fact = undefined;
    changeLoad += 1;
    answer = 'אני מתקשה לתאר את זה עכשיו. אני מרגיש שבודקים אם אני עונה נכון, ואני לא רוצה להמשיך לפרט לפני שנבין אחד את השני.';
  }
  const newlyRevealed = reveal && !seen(s, reveal) ? reveal : undefined;
  const sceneOrder = newlyRevealed ? [...s.sceneOrder, newlyRevealed] : s.sceneOrder;
  const facts = fact && !has(s, fact) ? [...s.facts, fact] : s.facts;
  return {
    ...s, focus, response: answer,
    sceneOrder, facts,
    rapport: clamp(s.rapport + changeRapport),
    load: clamp(s.load + changeLoad),
    energy: clamp(s.energy + changeEnergy),
    lastReveal: newlyRevealed ?? null,
    turns: [...s.turns, { id: s.turns.length + 1, question: question.label, answer, family: question.family, newlyRevealed }],
  };
}

export type ProbeKind = 'imagine' | 'comfort' | 'micro';
export type ProbeStatus = 'ready' | 'blocked' | 'uncertain';

/** A targeted interview about ONE revealed picture. Image recognition alone isn't readiness. */
export interface ProbeResult {
  session: Session;
  status: ProbeStatus;
  answer: string;
  direction: string;
}

export function probeScene(s: Session, id: SceneId, kind: ProbeKind): ProbeResult {
  if (!seen(s, id)) return { session: s, status: 'uncertain', answer: 'התמונה הזו עוד לא עלתה בשיחה.', direction: 'להמשיך לשאול בלי לחשוף תמונה שלא נבנתה' };
  const existing = s.probes[id]?.[kind];
  if (existing) return {
    session: s, status: existing, answer: 'כבר ביררנו את הכיוון הזה. אפשר לנסות שאלה אחרת או לחזור לתמונה מאוחר יותר.',
    direction: 'לחקור היבט אחר של המפה',
  };
  let status: ProbeStatus = 'uncertain';
  let answer = '';
  let direction = '';
  let load = s.load;
  let energy = s.energy;
  let focus = s.focus;
  if (kind === 'imagine') {
    status = id === 'scope' || id === 'permission' ? 'uncertain' : 'ready';
    answer = status === 'ready'
      ? 'אני יכול לראות את המצב הזה די בבירור. אבל זה שאני רואה אותו לא אומר שאני כבר יודע איך להגיע אליו.'
      : 'יש לי בראש כמה תמונות סותרות, ואני עוד לא יודע איזו מהן מתארת מה שבאמת הייתי רוצה.';
    direction = status === 'ready' ? 'לבדוק האם הדבר גם נוח וגם אפשרי' : 'להבהיר את התמונה, בלי ללחוץ לקבל החלטה';
  } else if (kind === 'comfort') {
    status = ['stuck', 'scope', 'choice', 'permission', 'fatigue'].includes(id) ? 'blocked' : 'ready';
    if (id === 'goal' && !has(s, 'boundary') && !has(s, 'state')) status = 'uncertain';
    answer = status === 'blocked'
      ? 'כשאני מדמיין את זה הגוף שלי מתכווץ. זו לא רק בעיה של לדעת מה עושים, יש כאן תחושה שלא נוח לי להיכנס אליה.'
      : status === 'uncertain'
      ? 'אני מרגיש גם הקלה וגם לחץ. עוד לא ברור לי אם אני באמת מרשה לעצמי להסתפק בתוצאה הזאת.'
      : 'זה יחסית נעים ומאפשר לי לנשום. אני לא חייב להרגיש התלהבות עצומה כדי להתקדם.';
    direction = status === 'blocked' ? 'בירור החסם, הערך או האמונה שמפעילים את התחושה'
      : status === 'uncertain' ? 'לברר מה יאפשר תחושת בחירה וביטחון' : 'לבדוק צעד ראשון בר-ביצוע';
    if (status === 'blocked') { load = clamp(load + 1); focus = 'barrier'; }
    if (status === 'ready') energy = clamp(energy + 1);
  } else {
    status = ['stuck', 'scope', 'choice', 'permission', 'toolgap', 'fatigue'].includes(id) ? 'blocked' : 'ready';
    if (id === 'goal' && !has(s, 'first')) status = 'uncertain';
    answer = status === 'blocked'
      ? id === 'toolgap' ? 'לא, כי בלי היעה אני לא יכול להשלים את האיסוף. אני צריך קודם למצוא אותו או לבחור דרך אחרת לאיסוף.'
      : id === 'fatigue' ? 'לא ממש עכשיו. אני זקוק להפסקה קצרה ולגבול זמן סביר לפני שאבחר צעד.'
      : 'כרגע אני לא מצליח לעשות את המעבר הזה בפשטות. יש פה החלטה או אמונה שכדאי לפרק לפני שנבנה עוד משימות.'
      : status === 'uncertain' ? 'אני רואה את התוצאה, אבל עדיין אין לי מושג מה הפעולה הראשונה שתוביל לשם.'
      : 'כן. אם אני מחלק את זה לחלק קטן אחד, אני יודע מה הידיים שלי עושות ואיך אדע שסיימתי.';
    direction = status === 'ready' ? 'לברר את המעבר הבא, או לעצור עם פעולה אחת ישימה'
      : status === 'blocked' ? 'להוסיף הסתעפות של חסם או משאב ולחקור אותה' : 'לשאול מה יהיה הצעד הראשון הקטן';
    if (status === 'blocked') focus = 'barrier';
  }
  const question = kind === 'imagine' ? 'האם אתה באמת יכול לראות בעיני רוחך את המצב הזה?'
    : kind === 'comfort' ? 'כשאתה מדמיין את התמונה הזאת, עד כמה נוח לך להיות שם?'
    : 'האם אתה יודע איך לעשות את המעבר הזה בפועל, צעד קטן אחד?';
  const updated: Session = { ...s, load, energy, focus,
    probes: { ...s.probes, [id]: { ...s.probes[id], [kind]: status } },
    response: answer, lastReveal: null,
    turns: [...s.turns, { id: s.turns.length + 1, question: `${question} [${SCENES[id].title}]`, answer, family: kind === 'imagine' ? 'row5' : kind === 'comfort' ? 'future' : 'barrier' }],
  };
  return { session: updated, status, answer, direction };
}

/** Reorder only revealed main-path scenes. No solution is enforced. */
export function moveScene(s: Session, id: SceneId, direction: -1 | 1): Session {
  if (!seen(s, id) || SCENES[id].kind !== 'spine') return s;
  const main = s.sceneOrder.filter(x => SCENES[x].kind === 'spine');
  const index = main.indexOf(id);
  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= main.length) return s;
  const reordered = [...main];
  [reordered[index], reordered[nextIndex]] = [reordered[nextIndex], reordered[index]];
  let position = 0;
  return { ...s, sceneOrder: s.sceneOrder.map(x => SCENES[x].kind === 'spine' ? reordered[position++] : x) };
}

export function summarizeSession(s: Session) {
  const main = s.sceneOrder.filter(id => SCENES[id].kind === 'spine');
  return {
    main, branches: s.sceneOrder.filter(id => SCENES[id].kind === 'branch'),
    canCompare: seen(s, 'room') && seen(s, 'goal'),
    hasConcreteBridge: main.some(id => id !== 'room' && id !== 'goal'),
    probedScenes: Object.keys(s.probes).length,
    trust: s.rapport <= 1 ? 'נדרשת עדינות' : s.rapport >= 4 ? 'שיתוף פעולה' : 'קשר בתהליך',
    overload: s.load >= 4 ? 'העומס עלה' : s.load <= 1 ? 'עומס נמוך' : 'עומס משתנה',
  };
}
