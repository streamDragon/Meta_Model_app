import type { PracticeStatement, ViolationFamily, ViolationLayer } from '../types';
import { buildMcqOptions, XP_PER_CORRECT } from './trainer';
import type { Rng } from './random';

export const FULL_LAYERED_XP = XP_PER_CORRECT;
export const PARTIAL_LAYERED_XP = Math.floor(XP_PER_CORRECT / 2);

export type LayeredAnswerStatus = 'full' | 'partial' | 'incorrect';

export interface LayeredPracticeStatement extends PracticeStatement {
  surfaceViolation: ViolationLayer;
  hiddenViolations: ViolationLayer[];
  impliedFullTextHe?: string;
  layeringNoteHe?: string;
}

export interface LayeredAnswerResult {
  status: LayeredAnswerStatus;
  surfaceCorrect: boolean;
  hiddenCorrect: boolean;
  xp: number;
}

const DEFAULT_LAYERING_NOTE =
  'השכבה המסתתרת היא קריאה אפשרית: היא לא כתובה במילים, אלא עולה מהטון, ההשלכה או ההשלמה של המקשיב.';

export function surfaceLayer(statement: PracticeStatement): ViolationLayer {
  return (
    statement.surfaceViolation ?? {
      family: statement.category,
      subcategory: statement.subcategory,
      violation: statement.violation,
      evidenceHe: statement.statement,
      questionHe: statement.suggested_question,
      explanationHe: statement.explanation,
    }
  );
}

export function toLayeredStatement(
  statement: PracticeStatement,
): LayeredPracticeStatement {
  return {
    ...statement,
    surfaceViolation: surfaceLayer(statement),
    hiddenViolations: statement.hiddenViolations ?? [],
    layeringNoteHe: statement.layeringNoteHe ?? DEFAULT_LAYERING_NOTE,
  };
}

export function hiddenFamilies(statement: PracticeStatement): ViolationFamily[] {
  return Array.from(
    new Set(toLayeredStatement(statement).hiddenViolations.map((layer) => layer.family)),
  );
}

export function buildSurfaceMcqOptions(
  statement: PracticeStatement,
  rng: Rng = Math.random,
): ViolationFamily[] {
  return buildMcqOptions(surfaceLayer(statement).family, rng);
}

export function buildHiddenMcqOptions(
  statement: PracticeStatement,
  rng: Rng = Math.random,
): ViolationFamily[] {
  const families = hiddenFamilies(statement);
  return buildMcqOptions(families[0] ?? surfaceLayer(statement).family, rng);
}

export function evaluateLayeredAnswer(
  statement: PracticeStatement,
  surfaceAnswer: ViolationFamily | null,
  hiddenAnswer: ViolationFamily | null,
): LayeredAnswerResult {
  const layered = toLayeredStatement(statement);
  const surfaceCorrect = surfaceAnswer === layered.surfaceViolation.family;
  const hiddenCorrect = hiddenAnswer
    ? layered.hiddenViolations.some((layer) => layer.family === hiddenAnswer)
    : false;

  const status: LayeredAnswerStatus =
    surfaceCorrect && hiddenCorrect
      ? 'full'
      : surfaceCorrect || hiddenCorrect
        ? 'partial'
        : 'incorrect';

  return {
    status,
    surfaceCorrect,
    hiddenCorrect,
    xp:
      status === 'full'
        ? FULL_LAYERED_XP
        : status === 'partial'
          ? PARTIAL_LAYERED_XP
          : 0,
  };
}
