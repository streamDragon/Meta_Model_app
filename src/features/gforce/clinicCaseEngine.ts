/**
 * Authored, deterministic case simulation. No model API and no user-provided case data.
 * Scene cards are deliberately NOT available to the therapist at the beginning.
 * Only concrete sensory questions (Meta Model row 5) reveal visual scene cards.
 */
export type SceneId = 'room' | 'goal' | 'tools' | 'collect' | 'sweep' | 'stuck' | 'scope';
export type Focus = 'opening' | 'present' | 'goal' | 'preparation' | 'first-action' | 'next-action' | 'barrier' | 'values' | 'time';
export type Family = 'rapport' | 'row4' | 'row5' | 'gforce' | 'barrier' | 'future';
export type QuestionId =
  | 'reflect' | 'now-sense' | 'time-before' | 'time-after' | 'goal' | 'goal-sense'
  | 'prepare' | 'prepare-sense' | 'first-action' | 'first-sense' | 'next-action'
  | 'next-sense' | 'barrier' | 'stuck-sense' | 'all-or-nothing' | 'scope-sense'
  | 'values' | 'alternative' | 'state' | 'compare' | 'smart' | 'sequence-check'
  | 'push' | 'repair' | 'return-goal';

export interface Scene {
  id: SceneId;
  title: string;
  observation: string;
  art: 'clutter' | 'clean' | 'tools' | 'basket' | 'sweep' | 'stuck' | 'scope';
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
    rapport: 3, load: 2, energy: 2, lastReveal: null,
  };
}

const clamp = (n: number) => Math.max(0, Math.min(5, n));
const has = (s: Session, f: string) => s.facts.includes(f);
const seen = (s: Session, id: SceneId) => s.sceneOrder.includes(id);

export function suggestedQuestions(s: Session): Question[] {
  const byFocus: Record<Focus, QuestionId[]> = {
    opening: ['reflect', 'now-sense', 'goal', 'time-before'],
    present: ['goal', 'time-after', 'prepare', 'barrier'],
    goal: ['goal-sense', 'state', 'first-action', 'compare'],
    preparation: ['prepare-sense', 'first-action', 'barrier', 'goal-sense'],
    'first-action': ['first-sense', 'next-action', 'stuck-sense', 'barrier'],
    'next-action': ['next-sense', 'goal-sense', 'sequence-check', 'barrier'],
    barrier: ['reflect', 'stuck-sense', 'all-or-nothing', 'alternative'],
    values: ['state', 'compare', 'alternative', 'goal-sense'],
    time: ['time-after', 'now-sense', 'first-action', 'goal'],
  };
  return byFocus[s.focus].map(id => QUESTIONS.find(q => q.id === id)!);
}

export function ask(s: Session, id: QuestionId): Session {
  const question = QUESTIONS.find(q => q.id === id);
  if (!question) return s;
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
    trust: s.rapport <= 1 ? 'נדרשת עדינות' : s.rapport >= 4 ? 'שיתוף פעולה' : 'קשר בתהליך',
    overload: s.load >= 4 ? 'העומס עלה' : s.load <= 1 ? 'עומס נמוך' : 'עומס משתנה',
  };
}
