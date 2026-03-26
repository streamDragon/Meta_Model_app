import { CANONICAL_BREEN_ORDER, type CanonicalBreenCode } from '../../config/canonicalBreenOrder';
import { BREEN_TABLE_CELL_MAP, BREEN_TABLE_CELLS, type BreenLabDifficulty, type BreenLabMode, type BreenTableCell } from './breenTableLabData';

export interface BreenCellStats {
  seen: number;
  correct: number;
  partial: number;
  wrong: number;
  score: number;
  possible: number;
  responseMs: number;
}

export type BreenCellStatsMap = Record<CanonicalBreenCode, BreenCellStats>;

export interface BreenCellOutcome {
  score: number;
  possible?: number;
  exact?: boolean;
  partial?: boolean;
  responseMs?: number;
}

export interface BuildPlacementScore {
  score: number;
  familyMatch: boolean;
  rowMatch: boolean;
  exactMatch: boolean;
  targetCell: BreenTableCell;
  placedCell: BreenTableCell;
}

export interface BreenHeatCell {
  ratio: number | null;
  tone: 'strong' | 'medium' | 'weak' | 'neutral';
  label: string;
}

export function createEmptyCellStats(): BreenCellStatsMap {
  return CANONICAL_BREEN_ORDER.reduce((acc, code) => {
    acc[code] = {
      seen: 0,
      correct: 0,
      partial: 0,
      wrong: 0,
      score: 0,
      possible: 0,
      responseMs: 0
    };
    return acc;
  }, {} as BreenCellStatsMap);
}

export function applyCellOutcome(stats: BreenCellStatsMap, code: CanonicalBreenCode, outcome: BreenCellOutcome): BreenCellStatsMap {
  const current = stats[code];
  const nextScore = clamp(outcome.score, 0, outcome.possible ?? 1);
  const nextPossible = Math.max(0.0001, outcome.possible ?? 1);
  return {
    ...stats,
    [code]: {
      seen: current.seen + 1,
      correct: current.correct + (outcome.exact ? 1 : 0),
      partial: current.partial + (outcome.partial && !outcome.exact ? 1 : 0),
      wrong: current.wrong + (!outcome.exact && !outcome.partial ? 1 : 0),
      score: current.score + nextScore,
      possible: current.possible + nextPossible,
      responseMs: current.responseMs + Math.max(0, outcome.responseMs ?? 0)
    }
  };
}

export function scoreBuildPlacement(patternCode: CanonicalBreenCode, placedCellCode: CanonicalBreenCode): BuildPlacementScore {
  const targetCell = BREEN_TABLE_CELL_MAP[patternCode];
  const placedCell = BREEN_TABLE_CELL_MAP[placedCellCode];
  const familyMatch = targetCell.family === placedCell.family;
  const rowMatch = targetCell.row === placedCell.row;
  const exactMatch = targetCell.id === placedCell.id;
  let score = 0;
  if (familyMatch) score += 0.3;
  if (rowMatch) score += 0.3;
  if (exactMatch) score += 0.4;
  return {
    score,
    familyMatch,
    rowMatch,
    exactMatch,
    targetCell,
    placedCell
  };
}

export function scoreCompleteChoice(mistakesBeforeCorrect: number): number {
  if (mistakesBeforeCorrect <= 0) return 1;
  if (mistakesBeforeCorrect === 1) return 0.7;
  if (mistakesBeforeCorrect === 2) return 0.45;
  return 0.25;
}

export function scoreQuickLocate(correct: boolean, responseMs: number, difficulty: BreenLabDifficulty): { points: number; bonus: number } {
  if (!correct) return { points: 0, bonus: 0 };
  const safeMs = Math.max(250, responseMs);
  const threshold = difficulty === 1 ? 5400 : difficulty === 2 ? 3800 : 2600;
  const bonus = clamp(Math.round((threshold - safeMs) / 550), 0, difficulty === 1 ? 2 : 4);
  return {
    points: 3 + bonus,
    bonus
  };
}

export function getHeatCell(stats: BreenCellStats): BreenHeatCell {
  if (!stats.seen || !stats.possible) {
    return {
      ratio: null,
      tone: 'neutral',
      label: 'עוד לא תורגל'
    };
  }
  const ratio = clamp(stats.score / stats.possible, 0, 1);
  if (ratio >= 0.8) {
    return { ratio, tone: 'strong', label: 'יושב חזק' };
  }
  if (ratio >= 0.55) {
    return { ratio, tone: 'medium', label: 'כמעט מתייצב' };
  }
  return { ratio, tone: 'weak', label: 'כדאי לחזור לכאן' };
}

export function buildResultsInsights(stats: BreenCellStatsMap, mode: BreenLabMode): string[] {
  const familyStats = new Map<string, { seen: number; score: number; possible: number }>();
  BREEN_TABLE_CELLS.forEach((cell) => {
    const current = familyStats.get(cell.family) || { seen: 0, score: 0, possible: 0 };
    const entry = stats[cell.id];
    current.seen += entry.seen;
    current.score += entry.score;
    current.possible += entry.possible;
    familyStats.set(cell.family, current);
  });

  const rankedFamilies = Array.from(familyStats.entries())
    .filter(([, value]) => value.seen > 0 && value.possible > 0)
    .map(([family, value]) => ({
      family,
      ratio: value.score / value.possible
    }))
    .sort((a, b) => b.ratio - a.ratio);

  const insights: string[] = [];
  if (rankedFamilies.length) {
    const strongest = familyTitle(rankedFamilies[0].family);
    insights.push(`האזור של ${strongest} נראה כרגע הכי יציב על המפה.`);
    if (rankedFamilies.length > 1) {
      const weakest = familyTitle(rankedFamilies[rankedFamilies.length - 1].family);
      insights.push(`כדאי לחזור במיוחד לאזור של ${weakest} כדי לייצב את המיקום המדויק.`);
    }
  }

  const partialCount = Object.values(stats).reduce((sum, item) => sum + item.partial, 0);
  const exactCount = Object.values(stats).reduce((sum, item) => sum + item.correct, 0);
  if (mode === 'build' && partialCount > exactCount) {
    insights.push('המשפחות והאזורים כבר מתחילים לשבת, ועכשיו נשאר לחדד את התא המדויק.');
  } else if (mode === 'quick') {
    insights.push('ככל שהמפה נהיית מרחבית יותר, שליפת המיקום נעשית מהירה ופחות מאומצת.');
  } else if (mode === 'complete') {
    insights.push('השלמת החורים מחדדת לא רק את השם אלא גם את השכנים והאזור שבו כל תבנית יושבת.');
  }

  if (!insights.length) {
    insights.push('המפה מתחילה להתייצב. עוד סיבוב קצר יחזק את הזיכרון המרחבי.');
  }
  return insights.slice(0, 3);
}

export function pickWeakestCodes(stats: BreenCellStatsMap, limit = 4): CanonicalBreenCode[] {
  return CANONICAL_BREEN_ORDER
    .map((code) => ({
      code,
      ratio: stats[code].possible ? stats[code].score / stats[code].possible : 0
    }))
    .sort((a, b) => a.ratio - b.ratio)
    .slice(0, limit)
    .map((entry) => entry.code);
}

export function accuracyFromStats(stats: BreenCellStatsMap): number {
  let score = 0;
  let possible = 0;
  Object.values(stats).forEach((entry) => {
    score += entry.score;
    possible += entry.possible;
  });
  return possible ? clamp(score / possible, 0, 1) : 0;
}

function familyTitle(family: string): string {
  if (family === 'distortion') return 'עיוות';
  if (family === 'generalization') return 'הכללה';
  if (family === 'deletion') return 'מחיקה';
  return 'עוד קטגוריות';
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
