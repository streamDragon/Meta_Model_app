import type { SuggestedMove, SuggestedMoveType, ThoughtAnalysis } from '../../types/cbt';
import { detectHighRiskExposure, detectPotentialCrisis, getSafetyMessageHe } from './cbtSafety';

interface PatternRule {
  id: string;
  cbt: string[];
  meta: string[];
  test: RegExp;
  missing?: string[];
  moves: SuggestedMoveType[];
}

const RULES: PatternRule[] = [
  {
    id: 'should_must',
    cbt: ['should_must'],
    meta: ['modal_operator'],
    test: /חייב|מוכרח|צריך|אסור|אי אפשר|must|should|have to|can't/i,
    missing: ['מקור הכלל', 'מה יקרה אם לא'],
    moves: ['missing_information_question', 'values_clarification', 'behavioral_experiment'],
  },
  {
    id: 'universal',
    cbt: ['overgeneralization'],
    meta: ['universal_quantifier'],
    test: /כולם|אף אחד|תמיד|לעולם|כל פעם|אף פעם|everyone|nobody|always|never/i,
    missing: ['יוצאי דופן', 'מי בדיוק'],
    moves: ['missing_information_question', 'reality_check'],
  },
  {
    id: 'mind_reading',
    cbt: ['mind_reading', 'fortune_telling'],
    meta: ['mind_reading', 'missing_referential_index'],
    test: /בטח|ברור ש|חושבים|יודע ש|לא רוצים אותי|they think|he knows|she knows|doesn't want/i,
    missing: ['ראיות חושיות', 'אפשרויות הסבר נוספות'],
    moves: ['missing_information_question', 'reality_check'],
  },
  {
    id: 'if_then',
    cbt: ['fortune_telling', 'catastrophizing'],
    meta: ['cause_effect'],
    test: /אם .*(אז|יכעסו|יקרה|לא ירצו)|if .* then/i,
    missing: ['שרשרת הסיבה והתוצאה', 'טווח תוצאות אפשרי'],
    moves: ['behavioral_experiment', 'ecology_check'],
  },
  {
    id: 'meaning',
    cbt: ['emotional_reasoning'],
    meta: ['complex_equivalence'],
    test: /זה אומר ש|סימן ש|מרגיש .*סימן|this means/i,
    missing: ['מה הופך תחושה לראיה', 'משמעויות חלופיות'],
    moves: ['reality_check', 'meaning_reframe'],
  },
  {
    id: 'identity',
    cbt: ['labeling', 'fixed_identity'],
    meta: ['nominalization', 'identity_compression'],
    test: /אני כזה|אני פשוט|אני אדם ש|זה האופי שלי|I am just|kind of person/i,
    missing: ['התנהגויות ספציפיות', 'יוצאי דופן לזהות'],
    moves: ['context_reframe', 'behavioral_experiment'],
  },
  {
    id: 'capability',
    cbt: ['capability_belief'],
    meta: ['modal_operator'],
    test: /לא מסוגל|אין לי יכולת|אין סיכוי|can't cope|no chance/i,
    missing: ['גרסה קטנה יותר', 'תנאים שבהם כן אפשר'],
    moves: ['action_step', 'behavioral_experiment'],
  },
  {
    id: 'approval',
    cbt: ['approval_belief'],
    meta: ['missing_referential_index'],
    test: /כולם אומרים|לא ירצו אותי|ידחו אותי|שייכ|approval|reject/i,
    missing: ['מי קובע', 'איזה ערך מנסה להישמר'],
    moves: ['values_clarification', 'behavioral_experiment'],
  },
];

const MOVE_COPY: Record<SuggestedMoveType, SuggestedMove> = {
  missing_information_question: {
    type: 'missing_information_question',
    titleHe: 'שאלת מידע חסר',
    detailHe: 'להחזיר שמות, ראיות, הקשר וזמן במקום להישאר עם ענן כללי.',
  },
  reality_check: {
    type: 'reality_check',
    titleHe: 'בדיקת מציאות עדינה',
    detailHe: 'לא להתווכח עם המחשבה; לבדוק איזו ראיה תומכת ואיזו ראיה מסבכת.',
  },
  meaning_reframe: {
    type: 'meaning_reframe',
    titleHe: 'ריפריימינג משמעות',
    detailHe: 'לשאול באיזה מסגרת אחרת אותו אירוע יכול לקבל משמעות פחות צרה.',
  },
  context_reframe: {
    type: 'context_reframe',
    titleHe: 'ריפריימינג הקשר',
    detailHe: 'לבדוק איפה הדפוס הזה כן משרת, ואיפה הוא יקר מדי.',
  },
  behavioral_experiment: {
    type: 'behavioral_experiment',
    titleHe: 'ניסוי מציאות קטן',
    detailHe: 'לבנות פעולה בטוחה וזעירה שבודקת ניבוי במקום להילחם בו.',
  },
  action_step: {
    type: 'action_step',
    titleHe: 'פעולה קטנה',
    detailHe: 'להתחיל בתנועה של כמה דקות לפני שמחכים למוטיבציה מלאה.',
  },
  values_clarification: {
    type: 'values_clarification',
    titleHe: 'בירור ערך',
    detailHe: 'לשאול איזה ערך או שייכות המשפט מנסה לשמור.',
  },
  safety_support: {
    type: 'safety_support',
    titleHe: 'תמיכה ובטיחות',
    detailHe: 'כאשר יש סיכון גבוה, לא בונים ניסוי לבד ופונים לתמיכה מתאימה.',
  },
  ecology_check: {
    type: 'ecology_check',
    titleHe: 'בדיקת אקולוגיה',
    detailHe: 'לבדוק אם חלק פנימי מתנגד לשינוי ומה הוא מנסה להגן.',
  },
};

function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

function matchingRules(text: string): PatternRule[] {
  return RULES.filter((rule) => rule.test.test(text));
}

export function detectCbtPatterns(text: string): string[] {
  return unique(matchingRules(text).flatMap((rule) => rule.cbt));
}

export function detectMetaModelPatterns(text: string): string[] {
  return unique(matchingRules(text).flatMap((rule) => rule.meta));
}

export function generateMetaModelQuestions(analysis: ThoughtAnalysis): string[] {
  const questions: string[] = [];
  if (analysis.input.includes('כולם')) questions.push('מי זה "כולם"?');
  if (analysis.input.includes('לא ענו')) questions.push('מי בדיוק לא ענה?');
  if (analysis.metaModelPatterns.includes('missing_referential_index')) {
    questions.push('מי בדיוק?', 'מה בדיוק נאמר או נעשה?');
  }
  if (analysis.metaModelPatterns.includes('mind_reading')) {
    questions.push('לפי מה אתה יודע שזה אומר שלא רוצים אותך?');
  }
  if (analysis.metaModelPatterns.includes('modal_operator')) {
    questions.push('מה יקרה אם לא תעשה את זה?', 'מי קובע שחייבים?');
  }
  if (analysis.metaModelPatterns.includes('universal_quantifier')) {
    questions.push('האם יש אפילו דוגמה אחת שבה זה לא נכון?');
  }
  if (analysis.metaModelPatterns.includes('cause_effect')) {
    questions.push('איך בדיוק פעולה אחת גורמת לתוצאה הזו?');
  }
  if (analysis.metaModelPatterns.includes('complex_equivalence')) {
    questions.push('האם התחושה היא ראיה, או אות שכדאי לבדוק?');
  }
  return unique(questions).slice(0, 8);
}

export function generateCbtQuestions(analysis: ThoughtAnalysis): string[] {
  return unique([
    'איזו ראיה תומכת בזה, ואיזו ראיה מסבכת את זה?',
    'מה עוד יכול להסביר את המצב?',
    'אם חבר היה אומר את זה, איזו מפה רחבה יותר היית מציע לו?',
    analysis.cbtPatterns.includes('fortune_telling')
      ? 'איזו בדיקה קטנה יכולה לבדוק את הניבוי בלי להסתכן?'
      : 'איזה מידע חסר לפני שמחליטים שהמחשבה צודקת?',
  ]);
}

export function suggestMoves(analysis: ThoughtAnalysis): SuggestedMove[] {
  if (analysis.safetyMessageHe) return [MOVE_COPY.safety_support];
  return unique(matchingRules(analysis.input).flatMap((rule) => rule.moves))
    .map((type) => MOVE_COPY[type])
    .slice(0, 5);
}

export function suggestRealityExperiment(analysis: ThoughtAnalysis): string | null {
  if (detectPotentialCrisis(analysis.input) || detectHighRiskExposure(analysis.input)) {
    return null;
  }
  if (analysis.input.includes('אגיד לא') || analysis.input.includes('להגיד לא')) {
    return 'פעם אחת השבוע לא לענות כן מיד. להגיד: "אני צריך לבדוק ואחזור אליך", ואז לבדוק מה באמת קרה.';
  }
  if (analysis.input.includes('כולם') || analysis.input.includes('בטח')) {
    return 'לבחור אדם בטוח אחד ולבדוק איתו עובדה אחת במקום להסיק בשם כולם.';
  }
  if (analysis.cbtPatterns.includes('capability_belief')) {
    return 'לפתוח את המשימה לחמש דקות בלבד, בלי לדרוש מעצמך לסיים.';
  }
  if (analysis.cbtPatterns.length > 0) {
    return 'לבחור מבחן קטן ובטוח: פעולה אחת, אדם אחד, זמן קצר, ותצפית אחת ברורה.';
  }
  return null;
}

export function analyzeThought(text: string): ThoughtAnalysis {
  const input = text.trim();
  const cbtPatterns = detectCbtPatterns(input);
  const metaModelPatterns = detectMetaModelPatterns(input);
  const missingInformation = unique(matchingRules(input).flatMap((rule) => rule.missing ?? []));
  const base: ThoughtAnalysis = {
    input,
    paceHe: 'יש כאן מפה שמנסה לשמור על משהו. לא חייבים להילחם במחשבה; אפשר לפתוח אותה ולבדוק.',
    cbtPatterns,
    metaModelPatterns,
    missingInformation,
    generatedQuestions: [],
    cbtQuestions: [],
    suggestedMoves: [],
    positiveIntentionHypothesis:
      cbtPatterns.includes('approval_belief') || input.includes('כולם')
        ? 'ייתכן שהמשפט מנסה לשמור על שייכות, קבלה וביטחון חברתי.'
        : 'ייתכן שהמשפט מנסה להגן, לחסוך כאב או להכין אותך מראש.',
    possibleReframeHe:
      'היכולת להיזהר היא משאב. השאלה היא אם כרגע היא עובדת כמו יועץ טוב או כמו מנהל קשוח מדי.',
    experimentSuggestion: null,
  };
  if (detectPotentialCrisis(input) || detectHighRiskExposure(input)) {
    base.safetyMessageHe = getSafetyMessageHe();
  }
  base.generatedQuestions = generateMetaModelQuestions(base);
  base.cbtQuestions = generateCbtQuestions(base);
  base.suggestedMoves = suggestMoves(base);
  base.experimentSuggestion = suggestRealityExperiment(base);
  return base;
}
