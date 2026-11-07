import type { ConversationScenario, ResponseQuality } from './conversationSkills';

/**
 * Separate authored decision practice from the Meta Model pattern trainer.
 * The first two choices teach timing / intention and method selection;
 * the final two reuse the established dialogue-response curriculum.
 * Correctness is contextual, not a claim about clinical outcomes.
 */
export type ConversationDecisionStage = 'direction' | 'method';
export interface ConversationPathChoice {
  id: string;
  text: string;
  quality: ResponseQuality;
  feedback: string;
}
export interface ConversationPathQuestion {
  prompt: string;
  hint: string;
  choices: [ConversationPathChoice, ConversationPathChoice, ConversationPathChoice];
}
export interface ConversationDecisionPath {
  focus: string;
  summary: string;
  direction: ConversationPathQuestion;
  method: ConversationPathQuestion;
}
const choice = (id: string, text: string, quality: ResponseQuality, feedback: string): ConversationPathChoice => ({ id, text, quality, feedback });

export const CONVERSATION_DECISION_PATHS: Record<string, ConversationDecisionPath> = {
  meeting: {
    focus: 'תזמון · שיקוף או בירור',
    summary: 'הכללה היא הזדמנות לשאלה, אבל לא בהכרח עכשיו.',
    direction: {
      prompt: 'מה הכיוון כרגע?',
      hint: 'הוא ביקש שיקשיבו לו, לא פתרון.',
      choices: [
        choice('meeting-d-attune', 'להצטרף ולהקשיב', 'helpful', 'מתחילים בחוויה לפני בירור ההכללה.'),
        choice('meeting-d-clarify', 'לברר מי הקשיב', 'mixed', 'פרטים עשויים לעזור בהמשך; כרגע זה עלול להישמע כוויכוח.'),
        choice('meeting-d-lead', 'להוביל לפתרון', 'unhelpful', 'הוא עדיין לא ביקש תוכנית פעולה.'),
      ],
    },
    method: {
      prompt: 'באיזה כלי תשתמש?',
      hint: 'שאלה מדויקת יכולה להגיע גם אחר כך.',
      choices: [
        choice('meeting-m-reflect', 'שיקוף והצטרפות', 'helpful', 'שיקוף מאפשר להכיר בחוויה בלי לאשר את ההכללה.'),
        choice('meeting-m-meta', 'מטה־מודל: ״אף אחד?״', 'mixed', 'זו שאלה אפשרית, אך התזמון עלול להיתפס כעימות.'),
        choice('meeting-m-advice', 'המלצה לפעולה', 'unhelpful', 'עצה מוקדמת פוסחת על מה שהאדם צריך כרגע.'),
      ],
    },
  },
  reply: {
    focus: 'מטה־מודל · עובדה ופירוש',
    summary: 'הפרד בין מה שקרה לבין המשמעות שהאדם ייחס לו.',
    direction: {
      prompt: 'מה הכיוון כרגע?',
      hint: 'היא פתוחה לבירור, בלי לקבוע מראש מה נכון.',
      choices: [
        choice('reply-d-check', 'לברר יחד', 'helpful', 'יש הסכמה לבדוק את האירוע והמשמעות.'),
        choice('reply-d-soothe', 'רק להרגיע', 'mixed', 'הרגעה יכולה לעזור, אך אינה מבררת את הפער.'),
        choice('reply-d-correct', 'להוכיח שהיא טועה', 'unhelpful', 'אין לנו מידע שמאפשר לשפוט את הפרשנות שלה.'),
      ],
    },
    method: {
      prompt: 'באיזה כלי תשתמש?',
      hint: 'מה ידוע בפועל על ההודעה?',
      choices: [
        choice('reply-m-detail', 'מטה־מודל: פרטים', 'helpful', 'מבקשים עובדות לפני שמסיקים מסקנות.'),
        choice('reply-m-reflect', 'שיקוף הרגש בלבד', 'mixed', 'שיקוף מתאים, אך היא כבר ביקשה להבין מה קרה.'),
        choice('reply-m-guess', 'ניחוש כוונתה', 'unhelpful', 'החלפת פרשנות אחת בניחוש אחר אינה אימות.'),
      ],
    },
  },
  presentation: {
    focus: 'מטה־מודל · גבולות ויוצאי דופן',
    summary: 'מזהים תנאים ויכולות בלי לבטל קושי אמיתי.',
    direction: {
      prompt: 'מה הכיוון כרגע?',
      hint: 'הוא מבקש להבין מה יעזור לו במצגת.',
      choices: [
        choice('presentation-d-explore', 'לברר תנאים', 'helpful', 'מבררים מתי הקושי מופיע ומה כבר עוזר.'),
        choice('presentation-d-encourage', 'לעודד בלי לברר', 'mixed', 'עידוד יכול לתמוך אך לא מבהיר מה צריך לעשות.'),
        choice('presentation-d-push', 'לדחוף להתנסות', 'unhelpful', 'אין הצדקה לכפות פעולה לפני בירור והסכמה.'),
      ],
    },
    method: {
      prompt: 'באיזה כלי תשתמש?',
      hint: '״לא יכול״ באילו נסיבות?',
      choices: [
        choice('presentation-m-meta', 'מטה־מודל: מתי ועם מי?', 'helpful', 'מגלים תנאים ויוצאי דופן במקום להתווכח עם הקושי.'),
        choice('presentation-m-reflect', 'שיקוף בלבד', 'mixed', 'שיקוף חשוב, אך הוא ביקש לתכנן התמודדות.'),
        choice('presentation-m-force', 'אתגר מידי', 'unhelpful', 'הצבת מבחן אינה תחליף להבנת התנאים.'),
      ],
    },
  },
  study: {
    focus: 'צ׳אנק־דאון · מרעיון לצעד',
    summary: 'מפרקים כוונה גדולה לצעד קטן שאפשר לבדוק.',
    direction: {
      prompt: 'מה הכיוון כרגע?',
      hint: 'יש הסכמה לחפש צעד מעשי.',
      choices: [
        choice('study-d-plan', 'לרדת לפעולה קטנה', 'helpful', 'הוא רוצה לעבור מכוונה להתנסות אפשרית.'),
        choice('study-d-comfort', 'להישאר רק בשיקוף', 'mixed', 'שיקוף תומך, אך הוא ביקש עזרה בארגון הפעולה.'),
        choice('study-d-demand', 'לדרוש משמעת', 'unhelpful', 'דרישה אינה יוצרת צעד שמתאים לו.'),
      ],
    },
    method: {
      prompt: 'באיזה כלי תשתמש?',
      hint: 'מה, מתי וכמה מעט אפשר להתחיל?',
      choices: [
        choice('study-m-chunk', 'צ׳אנק־דאון לצעד', 'helpful', 'מפרקים רעיון כללי לפעולה, זמן ומדד.'),
        choice('study-m-reflect', 'שיקוף הרצון', 'mixed', 'שיקוף אינו מספיק כדי לתכנן התנסות.'),
        choice('study-m-prescribe', 'תוכנית מוכתבת', 'unhelpful', 'התוכנית צריכה להתאים לבחירה ולזמן הפנוי שלו.'),
      ],
    },
  },
  repair: {
    focus: 'תזמון · תיקון לפני שאלה',
    summary: 'כששאלה פוגעת בקשר, מתקנים את השיחה לפני המשך הבירור.',
    direction: {
      prompt: 'מה הכיוון כרגע?',
      hint: 'הוא אמר שהרגיש שלא הבנת אותו.',
      choices: [
        choice('repair-d-repair', 'לעצור ולתקן', 'helpful', 'הקשר וההבנה חשובים יותר מהשאלה המתוכננת.'),
        choice('repair-d-explain', 'להסביר את הכוונה', 'mixed', 'אפשר להסביר אחר כך, אך קודם כדאי להתייחס להשפעה.'),
        choice('repair-d-prove', 'להוכיח שהשאלה טובה', 'unhelpful', 'הגנה על טכניקה לא עונה לבקשה שלו.'),
      ],
    },
    method: {
      prompt: 'באיזה כלי תשתמש?',
      hint: 'לא כל רגע מתאים לשאלת מטה־מודל.',
      choices: [
        choice('repair-m-join', 'הצטרפות ושיקוף', 'helpful', 'מכירים בפער ובחוויה, ומחזירים לו בחירה.'),
        choice('repair-m-meta', 'עוד שאלת מטה־מודל', 'mixed', 'שאלה מדויקת יכולה להמתין עד שתהיה הסכמה.'),
        choice('repair-m-confront', 'עימות עם הטענה', 'unhelpful', 'העימות צפוי להרחיק מהקשבה ומהבקשה.'),
      ],
    },
  },
  boundary: {
    focus: 'כוונה · בירור תוך כיבוד גבול',
    summary: 'הרחבת אפשרויות אינה מחייבת פיוס או ויתור על גבול.',
    direction: {
      prompt: 'מה הכיוון כרגע?',
      hint: 'הוא ביקש לשמור על גבול, לא להכריע מי צודק.',
      choices: [
        choice('boundary-d-protect', 'לכבד את הגבול', 'helpful', 'מתחילים במה שהאדם רוצה לשמור.'),
        choice('boundary-d-motive', 'לבדוק את מניעי האחר', 'mixed', 'ייתכן שזה רלוונטי בהמשך, אך לא למטרה שהתבקשה.'),
        choice('boundary-d-reconcile', 'לשכנע להתפייס', 'unhelpful', 'הרחבת מפה אינה רשות לבטל גבול.'),
      ],
    },
    method: {
      prompt: 'באיזה כלי תשתמש?',
      hint: 'אימות הבקשה אינו עימות עם האדם.',
      choices: [
        choice('boundary-m-verify', 'אימות המטרה ושיקוף', 'helpful', 'מוודאים מה הוא רוצה לפני שמציעים אפשרויות.'),
        choice('boundary-m-argue', 'עימות עם הפרשנות', 'unhelpful', 'התמקדות בצדקת האחר עוקפת את בקשתו.'),
        choice('boundary-m-command', 'הוראה חד־משמעית', 'unhelpful', 'בחירת הגבול והדרך ליישומו נשארת בידיו.'),
      ],
    },
  },
};

export function getConversationDecisionPath(scenario: ConversationScenario): ConversationDecisionPath {
  const path = CONVERSATION_DECISION_PATHS[scenario.id];
  if (!path) throw new Error('Missing decision path for scenario ' + scenario.id);
  return path;
}
