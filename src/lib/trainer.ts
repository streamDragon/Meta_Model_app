import type { PracticeStatement, ViolationFamily } from '../types';
import { shuffle, type Rng } from './random';

export const CATEGORY_ID_TO_NAME: Record<string, ViolationFamily> = {
  deletion: 'DELETION',
  distortion: 'DISTORTION',
  generalization: 'GENERALIZATION',
};

export const CATEGORY_LABELS: Record<ViolationFamily, string> = {
  DELETION: 'מחיקה (Deletion)',
  DISTORTION: 'עיוות (Distortion)',
  GENERALIZATION: 'הכללה (Generalization)',
};

export const CATEGORY_HINTS: Record<ViolationFamily, string> = {
  DELETION: '🔍 המידע חסר - מי? מה? כמה? לפי מי? איפה?',
  DISTORTION: '🔄 יש כאן הנחה או שינוי בלי ראיות - מה מניחים? אילו מילים חשודות?',
  GENERALIZATION: '📈 יש הכללה חזקה - באמת תמיד? באמת אף פעם? תמיד לכולם?',
};

export const DIFFICULTY_HINTS: Record<PracticeStatement['difficulty'], string> = {
  easy: 'הפרה בסיסית - חשוב על השפה',
  medium: 'הפרה בינונית - צריך להעמיק',
  hard: 'הפרה מורכבת - נדרשת הקשבה',
};

export const SESSION_SIZE = 10;
export const XP_PER_CORRECT = 10;

// Fixes audit bug B2: the legacy app took statements.slice(0, 10) in file
// order, so every session was identical. Filter -> shuffle -> sample.
export function buildTrainerQuestions(
  statements: readonly PracticeStatement[],
  categoryId: string,
  rng: Rng = Math.random,
  max: number = SESSION_SIZE,
): PracticeStatement[] {
  const categoryName = categoryId ? CATEGORY_ID_TO_NAME[categoryId] : undefined;
  const pool = categoryName
    ? statements.filter((s) => s.category === categoryName)
    : statements.slice();
  return shuffle(pool, rng).slice(0, max);
}

export function buildMcqOptions(
  correct: ViolationFamily,
  rng: Rng = Math.random,
): ViolationFamily[] {
  const all: ViolationFamily[] = ['DELETION', 'DISTORTION', 'GENERALIZATION'];
  if (!all.includes(correct)) {
    throw new Error(`Unknown violation family: ${correct}`);
  }
  return shuffle(all, rng);
}

export function successRate(correctCount: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((correctCount / total) * 100);
}

export function completionMessage(rate: number): string {
  if (rate === 100) return 'מושלם, זיהית הכל נכון';
  if (rate >= 80) return 'מעולה, הזיהוי כבר חד';
  if (rate >= 60) return 'טוב, עוד סיבוב יחזק את הדיוק';
  return 'יש כאן בסיס טוב להמשך תרגול';
}

export function completionNextFocus(rate: number): string {
  return rate >= 80
    ? 'נסה עכשיו Blueprint כדי להפוך זיהוי טוב לתוכנית פעולה.'
    : 'פתח את הקטגוריות וחזק את ההבדל בין מחיקה, עיוות והכללה.';
}
