import type { PracticeStatement, ViolationFamily, ViolationLayer } from '../types';
import { buildMcqOptions, successRate, XP_PER_CORRECT } from './trainer';
import type { Rng } from './random';
import { content } from '../data/content';

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

// Some pack entries carry a generated placeholder instead of a real completion:
// 'המשפט המלא כאילו מוסיף: "<statement>" - וזה נכון גם מעבר למה שנאמר בפועל.'
// The UI already labels this line, so the label prefix is stripped; and when
// what is left only repeats the statement, there is nothing to show.
const FULL_TEXT_PREFIX = /^\s*המשפט המלא כאילו(?:\s+מוסיף)?\s*:?\s*/;
const FULL_TEXT_BOILERPLATE = /\s*[-–—]\s*וזה נכון גם מעבר למה שנאמר בפועל\.?\s*$/;
const normalizeForCompare = (text: string) =>
  text.replace(/["״“”'׳.,!?\s]/g, '');

export function cleanImpliedFullText(
  text: string | undefined,
  statement: string,
): string | undefined {
  if (!text) return undefined;
  const withoutPrefix = text.replace(FULL_TEXT_PREFIX, '').trim();
  if (!withoutPrefix) return undefined;
  const core = withoutPrefix.replace(FULL_TEXT_BOILERPLATE, '').trim();
  if (normalizeForCompare(core) === normalizeForCompare(statement)) return undefined;
  return withoutPrefix;
}

export function toLayeredStatement(
  statement: PracticeStatement,
): LayeredPracticeStatement {
  return {
    ...statement,
    surfaceViolation: surfaceLayer(statement),
    hiddenViolations: statement.hiddenViolations ?? [],
    impliedFullTextHe: cleanImpliedFullText(statement.impliedFullTextHe, statement.statement),
    layeringNoteHe: statement.layeringNoteHe ?? DEFAULT_LAYERING_NOTE,
  };
}

const SUBCATEGORY_HEBREW: Record<string, string> = Object.fromEntries(
  content.categories.flatMap((category) =>
    category.subcategories.map((sub) => [sub.id, sub.hebrew] as const),
  ),
);

/** Hebrew pattern name for a layer; falls back to the stored (English) name. */
export function patternNameHe(layer: Pick<ViolationLayer, 'subcategory' | 'violation'>): string {
  return SUBCATEGORY_HEBREW[layer.subcategory] || layer.violation;
}

export interface LayeredScoreSummary {
  full: number;
  partial: number;
  /** Success rate in percent; a partial answer counts as half. */
  rate: number;
  /** Short Hebrew line, e.g. "2 מלאות · 3 חלקיות". */
  labelHe: string;
}

export function layeredScoreSummary(
  full: number,
  partial: number,
  total: number,
): LayeredScoreSummary {
  const parts = [`${full} מלאות`];
  if (partial > 0) parts.push(`${partial} חלקיות`);
  return {
    full,
    partial,
    rate: successRate(full * 2 + partial, total * 2),
    labelHe: parts.join(' · '),
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
