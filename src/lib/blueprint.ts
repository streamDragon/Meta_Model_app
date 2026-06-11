import type { ReframeTemplate } from '../types';

export const DEFAULT_REFRAME =
  'זה לא בעיה של אופי - זו הגדרה לא שלמה של המשימה.';

// Legacy gap-hint heuristic (app.js updateReframeBox), ported as-is.
export function resolveGapHint(ability: number, gapText: string): string {
  let gapHint = '';
  if (ability <= 3) gapHint = 'יכולת נמוכה';
  else if (ability <= 6) gapHint = 'חסר כלים';
  else gapHint = 'חסר אישור / הסכמה';

  if (gapText.includes('דקות')) gapHint = 'חסר ידע';
  return gapHint;
}

export function resolveReframe(
  ability: number,
  gapText: string,
  templates: readonly ReframeTemplate[],
): string {
  const hint = resolveGapHint(ability, gapText);
  const template = templates.find((t) => t.gap_hint === hint);
  return template ? template.reframe : DEFAULT_REFRAME;
}

export const WHO_EXPECTS_LABELS: Record<string, string> = {
  self: 'אני בעצמי',
  other: 'מישהו אחר',
  system: 'מערכת / חוק / דדליין',
};
