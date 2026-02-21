export type PredicateType = 'Action' | 'Process' | 'State';

export interface Utterance {
  id: string;
  text: string;
  predicate: string;
  predicateType: PredicateType;
  normalizedVerb: string;
}

export interface Slot {
  id: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
  category: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  allowedTags: string[];
}

export interface Question {
  id: string;
  text: string;
  predicateTypes: PredicateType[];
  suggestedSlotId: Slot['id'];
}

export interface AnswerBlock {
  id: string;
  text: string;
  sourceQuestionId?: string;
  tags: string[];
  confidence: number;
  slotId?: number;
  slotIds: number[];
  notes?: string;
  suggestedSlotId?: number;
  duplicateOf?: string;
}

export interface ToteMap {
  utteranceId: string;
  slots: Record<number, AnswerBlock[]>;
  centralCircle: {
    predicate: string;
    predicateType: PredicateType;
    normalizedVerb: string;
  };
  loopArrows: {
    state: 'idle' | 'redPulse' | 'greenPulse';
    simulateCycles: number;
  };
}

export interface OpeningSuggestion {
  title: string;
  questions: Question[];
}

