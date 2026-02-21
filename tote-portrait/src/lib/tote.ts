import type { AnswerBlock, OpeningSuggestion, PredicateType, Question, Slot, ToteMap, Utterance } from '../types';

const MISSING_PRIORITY: number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const EPISODE_QUESTION_IDS = new Set(['q1', 'q2', 'q3']);
const IDENTITY_OR_BELIEF_REGEX = /(טיפש|כישלון|אפס|גרוע|לא שווה|תמיד|אף פעם|אין סיכוי)/;

export const buildSlotsRecord = (blocks: AnswerBlock[]): Record<number, AnswerBlock[]> => {
  const record: Record<number, AnswerBlock[]> = {
    1: [],
    2: [],
    3: [],
    4: [],
    5: [],
    6: [],
    7: [],
    8: [],
    9: [],
  };

  blocks.forEach((block) => {
    block.slotIds.forEach((slotId) => {
      if (!record[slotId]) {
        record[slotId] = [];
      }
      record[slotId].push(block);
    });
  });

  return record;
};

export const nextMissingSlotId = (slotsRecord: Record<number, AnswerBlock[]>): number => {
  for (const slotId of MISSING_PRIORITY) {
    if ((slotsRecord[slotId] ?? []).length === 0) {
      return slotId;
    }
  }
  return 9;
};

export const suggestOpeningQuestions = (
  predicateType: PredicateType,
  slotsRecord: Record<number, AnswerBlock[]>,
  questionBank: Question[],
  usedQuestionIds: string[],
  stuck: boolean,
): OpeningSuggestion => {
  const usedSet = new Set(usedQuestionIds);
  const eligible = questionBank.filter((q) => q.predicateTypes.includes(predicateType));

  if (stuck) {
    const episodeQuestions = eligible.filter((q) => EPISODE_QUESTION_IDS.has(q.id)).slice(0, 3);
    return {
      title: 'בוא נתחיל מאירוע אחד ספציפי',
      questions: episodeQuestions,
    };
  }

  const targetSlotId = nextMissingSlotId(slotsRecord);
  const primary = eligible.filter((q) => q.suggestedSlotId === targetSlotId && !usedSet.has(q.id));
  const fallback = eligible.filter((q) => q.suggestedSlotId === targetSlotId);
  const questions = (primary.length > 0 ? primary : fallback).slice(0, 3);

  return {
    title: `פתח עוד: חסר מידע ב-${targetSlotId}`,
    questions,
  };
};

export const computeSlotFit = (
  block: AnswerBlock,
  slot: Slot,
  sourceQuestion?: Question,
): { fit: number; suggested: boolean } => {
  let fit = 30;
  const normalizedAllowed = slot.allowedTags.map((tag) => tag.toLowerCase());
  const tagHits = block.tags.reduce((count, tag) => {
    const low = tag.toLowerCase();
    const matched = normalizedAllowed.some((allowed) => low.includes(allowed) || allowed.includes(low));
    return matched ? count + 1 : count;
  }, 0);

  fit += tagHits * 15;
  if (sourceQuestion?.suggestedSlotId === slot.id) {
    fit += 20;
  }
  if (block.suggestedSlotId === slot.id) {
    fit += 20;
  }

  const clamped = Math.max(5, Math.min(99, fit));
  const suggested = block.suggestedSlotId === slot.id || sourceQuestion?.suggestedSlotId === slot.id;
  return { fit: clamped, suggested: Boolean(suggested) };
};

export const loopArrowState = (slotsRecord: Record<number, AnswerBlock[]>): 'idle' | 'redPulse' | 'greenPulse' => {
  const hasExit = (slotsRecord[9] ?? []).length > 0;
  const hasLoop = (slotsRecord[7] ?? []).length > 0 || (slotsRecord[8] ?? []).length > 0;

  if (hasExit) return 'greenPulse';
  if (hasLoop) return 'redPulse';
  return 'idle';
};

export const generateKnifePrompts = (slotsRecord: Record<number, AnswerBlock[]>): string[] => {
  const loopText = (slotsRecord[7] ?? []).map((block) => block.text).join(' | ');
  const snippet = loopText.split(/[.!?]/)[0]?.slice(0, 70).trim() || 'האמונה הנוכחית';
  const focus = IDENTITY_OR_BELIEF_REGEX.test(loopText) ? snippet : 'הקישור בין האירוע למסקנה';

  return [
    `מה גורם לך להסיק ש"${focus}"?`,
    `באיזה הקשר זה דווקא עובד/מגן עליך?`,
    'מה יקרה אם תאפשר לעצמך צעד קטן/גרסה גרועה?',
  ];
};

export const buildToteMapExport = (
  utterance: Utterance,
  slotsRecord: Record<number, AnswerBlock[]>,
  arrowState: 'idle' | 'redPulse' | 'greenPulse',
  simulateCycles: number,
): ToteMap => ({
  utteranceId: utterance.id,
  slots: slotsRecord,
  centralCircle: {
    predicate: utterance.predicate,
    predicateType: utterance.predicateType,
    normalizedVerb: utterance.normalizedVerb,
  },
  loopArrows: {
    state: arrowState,
    simulateCycles,
  },
});

