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

export function patternLabel(patternId: string): string {
  return cbtPatterns.find((pattern) => pattern.id === patternId)?.labelHe ?? patternId;
}

export function metaPatternLabel(patternId: string): string {
  const labels: Record<string, string> = {
    modal_operator: 'modal operator',
    universal_quantifier: 'universal quantifier',
    missing_referential_index: 'missing referential index',
    mind_reading: 'mind reading',
    cause_effect: 'cause-effect',
    complex_equivalence: 'complex equivalence',
    nominalization: 'nominalization',
    identity_compression: 'identity compression',
    lost_performative: 'lost performative',
    deletion_of_tiny_steps: 'deletion of tiny steps',
  };
  return labels[patternId] ?? patternId.replace(/_/g, ' ');
}
