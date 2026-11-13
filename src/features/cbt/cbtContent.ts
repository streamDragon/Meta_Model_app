import cbtCore from '../../../packs/cbt-core.json';
import cbtPractice from '../../../packs/cbt-practice.json';
import type { CbtLesson, CbtPattern, CbtPracticeItem } from '../../types/cbt';

export const cbtPatterns = cbtCore.patterns as CbtPattern[];
export const cbtLessons = cbtCore.lessons as CbtLesson[];
export const cbtPracticeItems = cbtPractice.practiceItems as CbtPracticeItem[];

export const CBT_PACKS_META = [
  { id: cbtCore.id, name: cbtCore.name, sourceValidation: cbtCore.sourceValidation },
  { id: cbtPractice.id, name: cbtPractice.name, sourceValidation: cbtPractice.sourceValidation },
] as const;

/** Hebrew labels for CBT tags the engine emits that are not described in packs/cbt-core.json. */
const EXTRA_CBT_LABELS_HE: Record<string, string> = {
  catastrophizing: 'תרחיש אסון',
  fixed_identity: 'זהות קבועה',
  capability_belief: 'אמונת "לא מסוגל"',
  approval_belief: 'צורך באישור',
};

/** Hebrew label for a CBT pattern tag, or '' when there is none (callers hide empty labels). */
export function patternLabel(patternId: string): string {
  return cbtPatterns.find((pattern) => pattern.id === patternId)?.labelHe ?? EXTRA_CBT_LABELS_HE[patternId] ?? '';
}

export const META_PATTERN_LABELS_HE: Record<string, string> = {
  modal_operator: 'חייב / לא יכול',
  universal_quantifier: 'הכללה (כולם, תמיד)',
  missing_referential_index: 'חסר "מי בדיוק"',
  mind_reading: 'קריאת מחשבות',
  cause_effect: 'סיבה ותוצאה',
  complex_equivalence: '"זה אומר ש..."',
  nominalization: 'פעולה שקפאה לשם עצם',
  identity_compression: 'זהות במילה אחת',
  lost_performative: 'שיפוט בלי שופט',
  deletion_of_tiny_steps: 'צעדים קטנים שנמחקו',
  parts_ecology: 'חלקים ואקולוגיה',
};

/** Hebrew label for a Meta Model tag, or '' when there is none (callers hide empty labels). */
export function metaPatternLabel(patternId: string): string {
  return META_PATTERN_LABELS_HE[patternId] ?? '';
}
