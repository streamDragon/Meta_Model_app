import type { PredicateType } from '../types';

const STATE_WORDS = [
  'תקוע',
  'תקועה',
  'כישלון',
  'טיפש',
  'אבוד',
  'אבודה',
  'חלש',
  'חלשה',
  'רע',
  'גרוע',
  'גרועה',
  'לא',
  'חסום',
  'חסומה',
];

const PROCESS_WORDS = ['מציף', 'מציפה', 'נתקע', 'נתקעת', 'משתלט', 'משתלטת', 'קופא', 'קופאת', 'ננעל', 'ננעלת'];

const PUNCTUATION_REGEX = /[.,!?;:"'()]/g;

const meaningfulToken = (token: string): boolean => {
  const clean = token.replace(PUNCTUATION_REGEX, '').trim();
  return clean.length > 1 && !['אני', 'אתה', 'את', 'היא', 'הוא', 'זה', 'של', 'עם', 'על'].includes(clean);
};

const classifyPredicate = (text: string, predicate: string): PredicateType => {
  const normalizedText = text.toLowerCase();
  const token = predicate.toLowerCase();

  if (/אני\s+מרגיש(?:ה)?/.test(normalizedText) || STATE_WORDS.some((word) => token.includes(word))) {
    return 'State';
  }

  if (PROCESS_WORDS.some((word) => token.includes(word)) || /זה\s+\w+/.test(normalizedText)) {
    return 'Process';
  }

  return 'Action';
};

export const extractPredicate = (text: string): { predicate: string; predicateType: PredicateType } => {
  const raw = text.trim();
  if (!raw) {
    return { predicate: 'תקוע', predicateType: 'State' };
  }

  const feelMatch = raw.match(/אני\s+מרגיש(?:ה)?\s+([^\s.,!?;:"'()]+)/);
  if (feelMatch?.[1]) {
    const predicate = feelMatch[1];
    return { predicate, predicateType: 'State' };
  }

  const aniMatch = raw.match(/אני\s+([^\s.,!?;:"'()]+)/);
  if (aniMatch?.[1]) {
    const predicate = aniMatch[1];
    return { predicate, predicateType: classifyPredicate(raw, predicate) };
  }

  const zeMatch = raw.match(/זה\s+([^\s.,!?;:"'()]+)/);
  if (zeMatch?.[1]) {
    const predicate = zeMatch[1];
    return { predicate, predicateType: classifyPredicate(raw, predicate) };
  }

  const tokens = raw
    .split(/\s+/)
    .map((token) => token.replace(PUNCTUATION_REGEX, '').trim())
    .filter(meaningfulToken);

  const predicate = tokens.at(-1) ?? raw;
  return { predicate, predicateType: classifyPredicate(raw, predicate) };
};

export const buildStateNormalizationSuggestions = (text: string, predicate: string): string[] => {
  const cleanPredicate = predicate.trim();
  if (!cleanPredicate) {
    return ['להיתקע', 'לא להתקדם', 'להיכנס ללופ'];
  }

  const hasFeelPattern = /אני\s+מרגיש(?:ה)?/.test(text.toLowerCase());
  if (hasFeelPattern) {
    return [`להיכנס למצב ${cleanPredicate}`, 'להיתקע', 'לא להתקדם'];
  }

  if (cleanPredicate.includes('תקוע')) {
    return ['להיתקע', 'לא להתקדם', 'להיכנס ללופ'];
  }

  if (cleanPredicate.includes('כישלון') || cleanPredicate.includes('טיפש')) {
    return ['להדביק זהות שלילית', 'להימנע מצעד ראשון', 'לאשר לעצמי שאני נכשל'];
  }

  return [`להיכנס למצב ${cleanPredicate}`, 'להיתקע', 'לא להתקדם'];
};

export const defaultNormalizedVerb = (predicateType: PredicateType, text: string, predicate: string): string => {
  if (predicateType === 'State') {
    return buildStateNormalizationSuggestions(text, predicate)[0];
  }

  if (predicateType === 'Process') {
    return predicate || 'להיכנס לתהליך אוטומטי';
  }

  return predicate || 'לעשות פעולה';
};

