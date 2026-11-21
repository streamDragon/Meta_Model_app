export const HIDDEN_BELIEF_TYPES = {
  limiting: 'אמונה מגבילה',
  fused: 'קולות שהתערבבו',
  hidden_equation: 'משוואת משמעות נסתרת',
  hidden_cause: 'קשר סיבתי משוער',
  presupposition: 'הנחת יסוד',
} as const;

export type HiddenBeliefType = keyof typeof HIDDEN_BELIEF_TYPES;
export type MismatchType =
  | 'stated_belief_vs_reaction_intensity'
  | 'value_vs_behavior'
  | 'reaction_too_big'
  | 'voice_shift'
  | 'within_sentence';
export type EvidenceRole = 'stated_belief' | 'reaction' | 'value' | 'behavior' | 'voice' | 'trigger' | 'language';
export type HypothesisReview = 'hypothesis' | 'confirmed' | 'rejected' | 'unsure';

export interface BeliefHypothesis {
  hidden_belief: string;
  missing_link_sentence: string;
  type: HiddenBeliefType;
  evidence: { quote: string; role: EvidenceRole }[];
  mismatch: MismatchType;
  breen_row: number | null;
  question_to_surface_it: string;
  alternative_questions: string[];
  body_check_prompt: string;
  confidence: 'low' | 'medium' | 'high';
  confidence_reason: string;
  status: 'hypothesis';
}

export interface BeliefAnalysisInput {
  text: string;
  goal?: string;
  nonverbal?: string;
  context?: string;
}

/** Row references from the approved feature spec; the legacy Breen bundle is not a verified 7-row source. */
export const BREEn_REFERENCE: Readonly<Record<HiddenBeliefType, number | null>> = {
  limiting: 2, fused: 1, hidden_equation: 3, hidden_cause: 3, presupposition: 1,
};
export const BODY_PROMPT = 'אפשר לבדוק בעדינות עם האדם אם ההשערה מתאימה לחוויה שלו. שים לב גם לדבריו, לנשימה ולתגובה הגופנית כפי שהוא מתאר אותם; אל תסיק מתנועה או שתיקה מה הוא מרגיש.';

const RISK_WORDS = [
  /(?:רוצה|מתכוון|מתכנן|הולך)\s+(?:להתאבד|לפגוע בעצמי|להרוג|לפגוע\s+במישהו)/i,
  /(?:suicide|kill myself|hurt myself|kill (?:him|her|them))/i,
];
export function safetyRequiresReferral(text: string): boolean {
  return RISK_WORDS.some((rx) => rx.test(text));
}
function splitStatements(text: string): string[] {
  return text.split(/\r?\n|(?<=[.!?])\s+/).map(x => x.trim().replace(/^\d+[.)]\s*/, '')).filter(Boolean).slice(0,40);
}
function sentence(lines: string[], pattern: RegExp): string | undefined { return lines.find(s => pattern.test(s)); }
function make(type: HiddenBeliefType, hidden: string, link: string, evidence: BeliefHypothesis['evidence'], mismatch: MismatchType, question: string, why: string, confidence: BeliefHypothesis['confidence'] = 'low'): BeliefHypothesis {
  return {
    hidden_belief: hidden, missing_link_sentence: link, type, evidence, mismatch,
    breen_row: BREEn_REFERENCE[type], question_to_surface_it: question,
    alternative_questions: [], body_check_prompt: BODY_PROMPT,
    confidence, confidence_reason: why, status: 'hypothesis',
  };
}

/**
 * Offline pattern cues, NOT semantic inference or an LLM. Doesn't pretend to know
 * anyone's private belief. Evidence is verbatim, and no input is persisted.
 */
export function analyseHiddenBeliefs(input: BeliefAnalysisInput): BeliefHypothesis[] {
  const text = input.text.trim().slice(0,14000);
  if (!text || safetyRequiresReferral(text)) return [];
  const lines = splitStatements(text);
  if (!lines.length) return [];
  const findings: BeliefHypothesis[] = [];
  const father = /(?:father|abba|dad|אבא|אביו|אבי)/i.test(text);
  const praise = sentence(lines, /(?:okay father|good father|אבא טוב|אב טוב|הורה טוב|בסדר כאבא)/i);
  const harsh = sentence(lines, /(?:shout|hate myself|צועק|שונא את עצמי|צעקתי|מתפרץ)/i);
  const critical = sentence(lines, /(?:criticiz|critici|מבקר|ביקורת|אומר לי)/i);
  const voice = sentence(lines, /(?:his voice|real one|stops counting|הקול שלו|הקול של אבא|הקול האמיתי|לא נחשב|לא סופר)/i);
  const never = sentence(lines, /(?:just once|never|אף פעם|רק פעם אחת|הלוואי שפעם)/i);

  if (praise && harsh && (father || critical)) {
    findings.push(make('hidden_equation',
      father ? 'ייתכן שאישור של אבא נעשה מדד לערך שלי כהורה.' : 'ייתכן שהביקורת נתפסת כמדד לערך העצמי.',
      father ? 'כי הביקורת של אבא אולי אומרת שאני אבא לא טוב, אני נפגע ומגיב בכעס.' : 'כי הביקורת אולי אומרת שאני לא מספיק טוב, אני נפגע ומגיב בכעס.',
      [{ quote: praise, role: 'stated_belief' }, { quote: harsh, role: 'reaction' }],
      'stated_belief_vs_reaction_intensity',
      'מה המשמעות של הביקורת הזאת עבורך, מעבר למילים שנאמרו?',
      'שני תיאורים שונים על העצמי והתגובה; הקשר ביניהם עדיין טעון בדיקה.', 'medium'));
  }
  if (voice && father) {
    findings.push(make('fused',
      'ייתכן שקולו או הקריטריון של אבא נחווים כקול שלי.',
      'כי דעתו של אבא אולי נחשבת בעיניי לאמת על עצמי, מה שאני חושב על עצמי מפסיק להיחשב.',
      [{ quote: voice, role: 'voice' }],
      'voice_shift', 'של מי הקול הזה עכשיו, שלך או של אבא?',
      'המשפט מתאר במפורש מעבר ממחשבה אישית לקול של אדם אחר.', 'medium'));
  }
  if (never) {
    findings.push(make('presupposition',
      'ייתכן שהניסוח מניח שהדבר הרצוי לא קרה אף פעם.',
      'כי אני מניח שאף פעם לא ראו אותי כפי שאני רוצה, אני ממשיך לחכות להכרה.',
      [{ quote: never, role: 'language' }],
      'within_sentence', 'האם היו רגעים יוצאי דופן, אפילו בתחום אחר?',
      '״רק פעם אחת״ או ״אף פעם״ עשויים לרמוז על הכללה, שלא בהכרח מדויקת בכל הקשר.'));
  }
  if (!findings.length) {
    const trigger = sentence(lines, /(?:after|because|makes me|when|אחרי|בגלל|כש|גורם לי)/i);
    const react = sentence(lines, /(?:angry|afraid|cry|shout|פוחד|כועס|בוכה|צועק|נפגע|מתעצבן)/i);
    if (trigger && react) findings.push(make('hidden_cause',
      'ייתכן שיש משמעות שלא נאמרה בין האירוע לבין התגובה.',
      'כי האירוע אולי אומר לי משהו חשוב, אני מרגיש או פועל כפי שתיארתי.',
      [{quote:trigger,role:'trigger'}, ...(react!==trigger?[{quote:react,role:'reaction' as const}]:[])],
      'reaction_too_big', 'מה האירוע הזה אומר לך, אם בכלל?', 'נמצא תיאור אירוע לצד תגובה, אך לא הוכח קשר סיבתי.'));
    const limit=sentence(lines, /(?:can't|cannot|must|always|never|חייב|אסור|תמיד|לעולם|לא יכול)/i);
    if(limit) findings.push(make('limiting',
      'ייתכן שהמשפט מציג גבול כאילו הוא מוחלט.',
      'כי אני מאמין שהאפשרות סגורה, אני נמנע מלנסות אותה.',
      [{quote:limit,role:'language'}], 'within_sentence',
      'מתי בדיוק הגבול הזה חל, והאם יש יוצאים מן הכלל?',
      'מילות חובה, איסור או הכללה מאפשרות שאלת בירור, לא קביעה שהאמונה שגויה.'));
  }
  return findings.slice(0,3);
}

export function validateBeliefHypothesis(data: unknown): data is BeliefHypothesis {
  if (!data || typeof data !== 'object') return false;
  const h=data as Partial<BeliefHypothesis>;
  return typeof h.hidden_belief==='string' &&
    typeof h.missing_link_sentence==='string' &&
    typeof h.body_check_prompt==='string' && h.body_check_prompt.length>0 &&
    typeof h.question_to_surface_it==='string' && h.status==='hypothesis' &&
    h.type!==undefined && Object.prototype.hasOwnProperty.call(HIDDEN_BELIEF_TYPES,h.type) &&
    (h.breen_row===null || (typeof h.breen_row==='number' && h.breen_row>=1 && h.breen_row<=7)) &&
    Array.isArray(h.evidence) && h.evidence.length>0 &&
    h.evidence.every(e=>typeof e.quote==='string'&&typeof e.role==='string') &&
    Array.isArray(h.alternative_questions) && ['low','medium','high'].includes(h.confidence??'');
}
