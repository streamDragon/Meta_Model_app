import type { DialogueMove, Tone } from '../../data/sleightConversation';

export interface SimulatedState {
  feeling: number; // 0 overwhelmed, 10 comfortable
  conviction: number; // 0 unsure, 10 certain of the original belief
  choices: number; // 0 no positive options, 10 many
  pressure: number;
  turns: number;
}

export type Reaction = 'open' | 'mixed' | 'resist' | 'rupture';

const clamp = (n: number) => Math.max(0, Math.min(10, n));

/**
 * Explicit rules for a fictional training partner, NOT a prediction about a
 * human and NOT a clinical measurement. Opposing moves can backfire.
 */
export function simulateChallenge(
  state: SimulatedState,
  move: Pick<DialogueMove, 'effect'>,
  tone: Tone,
): { next: SimulatedState; reaction: Reaction } {
  let reaction: Reaction;
  if (tone === 'sharp') {
    reaction = 'resist';
  } else if (move.effect === 'resistant' && tone === 'direct') {
    reaction = 'resist';
  } else if (move.effect === 'resistant' || (move.effect === 'mixed' && tone === 'direct')) {
    reaction = 'mixed';
  } else {
    reaction = 'open';
  }

  const next: SimulatedState = { ...state, turns: state.turns + 1 };
  if (reaction === 'open') {
    next.feeling = clamp(next.feeling + 1);
    next.conviction = clamp(next.conviction - 1);
    next.choices = clamp(next.choices + 1);
    next.pressure = Math.max(0, next.pressure - 1);
  } else if (reaction === 'mixed') {
    next.choices = clamp(next.choices + 1);
    next.pressure = Math.max(0, next.pressure - 1);
  } else {
    next.feeling = clamp(next.feeling - (tone === 'sharp' ? 2 : 1));
    next.conviction = clamp(next.conviction + 1);
    next.choices = clamp(next.choices - 1);
    next.pressure += 1;
  }

  if (next.pressure >= 2 && next.feeling <= 2) {
    return { next, reaction: 'rupture' };
  }
  return { next, reaction };
}

export function repairConnection(state: SimulatedState): SimulatedState {
  return {
    ...state,
    feeling: clamp(state.feeling + 3),
    choices: clamp(state.choices + 1),
    pressure: 0,
  };
}

export function readyToChallenge(questionIds: readonly string[]): boolean {
  return questionIds.length >= 2 && questionIds.includes('meaning');
}

export function simulatedChange(previous: SimulatedState, next: SimulatedState) {
  return {
    feeling: next.feeling - previous.feeling,
    conviction: next.conviction - previous.conviction,
    choices: next.choices - previous.choices,
  };
}
