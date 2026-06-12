const CRISIS_TERMS = [
  /לפגוע בעצמי/,
  /להרוג את עצמי/,
  /להתאבד/,
  /אובדנ/i,
  /אין טעם לחיות/,
  /self[- ]?harm/i,
  /suicide/i,
  /kill myself/i,
];

const HIGH_RISK_EXPOSURE_TERMS = [
  /אדם אלים/,
  /אלימות/,
  /מסוכן/,
  /לבד בלילה/,
  /להתעמת/,
  /טראומה/,
  /להפסיק תרופה/,
  /סכין/,
  /נשק/,
  /violent/i,
  /danger/i,
  /trauma/i,
];

function matchesAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

export function detectPotentialCrisis(text: string): boolean {
  return matchesAny(text, CRISIS_TERMS);
}

export function detectHighRiskExposure(text: string): boolean {
  return detectPotentialCrisis(text) || matchesAny(text, HIGH_RISK_EXPOSURE_TERMS);
}

export function getSafetyMessageHe(): string {
  return [
    'הכלי נועד לאימון, למידה ורפלקציה. הוא לא מחליף טיפול מקצועי.',
    'במצוקה חריפה, סכנת פגיעה עצמית, טראומה פעילה, פסיכוזה, התמכרות פעילה או חרדה מציפה - פנה לאיש מקצוע או לעזרה דחופה באזור שלך.',
    'במצבים כאלה לא נבנה ניסוי התנהגותי בתוך האפליקציה.',
  ].join(' ');
}
