import { PRISM_LEVELS, type PivotRecommendation, type PrismSession } from '../types';

// Ported verbatim from the legacy heuristic (app.js computePivotRecommendation):
// - identity-heavy answers + high resistance -> recommend a lower level (B/C/E)
//   for a "small win" entry point;
// - otherwise the level with the most answers, ties broken toward lower levels.
export function computePivotRecommendation(session: PrismSession): PivotRecommendation {
  const counts: Record<string, number> = Object.fromEntries(
    PRISM_LEVELS.map((level) => [level.id, 0]),
  );
  session.answers.forEach((a) => {
    if (counts[a.level] !== undefined) counts[a.level]++;
  });

  if (counts['I'] > 0 && session.resistance >= 4) {
    for (const l of ['B', 'C', 'E'] as const) {
      if (counts[l] > 0) {
        return {
          pivot: l,
          reason: 'מאמץ מזערי — מומלץ להתחיל ברמה נמוכה כדי ליצור Small Win',
        };
      }
    }
  }

  let best: PivotRecommendation['pivot'] = 'E';
  let bestCount = -1;
  for (const level of PRISM_LEVELS) {
    if (counts[level.id] > bestCount) {
      best = level.id;
      bestCount = counts[level.id];
    }
  }

  const levelNames = Object.fromEntries(
    PRISM_LEVELS.map((level) => [level.id, `${level.label} (${level.id})`]),
  );
  const reason =
    bestCount > 0
      ? `הרבה תשובות נופלות ב${levelNames[best]} — זהו מקום הגיוני למקד Small Win`
      : 'לא נמצאו תשובות — שקול להתחיל ב-B או ב-E עם צעד קטן';
  return { pivot: best, reason };
}
