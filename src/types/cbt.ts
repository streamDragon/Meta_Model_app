export type MetaModelFamily = 'deletion' | 'distortion' | 'generalization';

export type SuggestedMoveType =
  | 'missing_information_question'
  | 'reality_check'
  | 'meaning_reframe'
  | 'context_reframe'
  | 'behavioral_experiment'
  | 'action_step'
  | 'values_clarification'
  | 'safety_support'
  | 'ecology_check';

export interface CbtPattern {
  id: string;
  labelHe: string;
  labelEn: string;
  descriptionHe: string;
  cbtFamily: string;
  metaModelFamily: MetaModelFamily;
  metaModelPatterns: string[];
  exampleHe: string;
  goodQuestionsHe: string[];
  badResponseExamplesHe: string[];
  suggestedMoveTypes: SuggestedMoveType[];
}

export interface CbtLesson {
  id: string;
  titleHe: string;
  shortTitleHe: string;
  theoryFamily: string;
  conceptTags: string[];
  estimatedMinutes: number;
  explanationHe: string;
  exampleHe: string;
  microExerciseHe: string;
  reflectionQuestionHe: string;
  relatedPracticeRoute: string;
}

export interface CbtPracticeItem {
  id: string;
  statementHe: string;
  cbtPatterns: string[];
  metaModelPatterns: string[];
  metaModelFamily: MetaModelFamily;
  suggestedMoveTypes: SuggestedMoveType[];
  betterQuestionHe: string;
  experimentHe: string;
}

export interface SuggestedMove {
  type: SuggestedMoveType;
  titleHe: string;
  detailHe: string;
}

export interface ThoughtAnalysis {
  input: string;
  paceHe: string;
  cbtPatterns: string[];
  metaModelPatterns: string[];
  missingInformation: string[];
  generatedQuestions: string[];
  cbtQuestions: string[];
  suggestedMoves: SuggestedMove[];
  positiveIntentionHypothesis: string;
  possibleReframeHe: string;
  experimentSuggestion: string | null;
  safetyMessageHe?: string;
}

export interface ThoughtMapSession {
  sessionId: string;
  title: string;
  initialStatement: string;
  situation?: string;
  automaticThought: string;
  emotionLabel?: string;
  emotionIntensity?: number;
  bodySensation?: string;
  behaviorUrge?: string;
  actualBehavior?: string;
  consequence?: string;
  cbtPatterns: string[];
  metaModelPatterns: string[];
  positiveIntentionHypothesis?: string;
  missingInformation: string[];
  generatedQuestions: string[];
  suggestedMoves: string[];
  createdAt: string;
  updatedAt: string;
}

export interface BeliefLensSession {
  sessionId: string;
  statement: string;
  beliefType: string;
  logicalLevel: string;
  tags: string[];
  evidenceFor?: string;
  evidenceAgainst?: string;
  widerBelief?: string;
  experimentSuggestion?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RealityExperimentSession {
  sessionId: string;
  prediction: string;
  beliefStrengthBefore: number;
  fearedOutcome?: string;
  safetyBehaviors: string[];
  experimentAction: string;
  smallestVersion: string;
  whenWhere?: string;
  observationsPlanned: string[];
  result?: string;
  beliefStrengthAfter?: number;
  learning?: string;
  nextStep?: string;
  riskLevel: 'low' | 'medium' | 'high';
  createdAt: string;
  updatedAt: string;
}

export interface ActivationSession {
  sessionId: string;
  currentState: string;
  avoidedAction: string;
  valueLinked?: string;
  smallestAction: string;
  durationMinutes: number;
  friction?: string;
  supportCue?: string;
  completed: boolean;
  moodBefore?: number;
  moodAfter?: number;
  learning?: string;
  nextRepetition?: string;
  createdAt: string;
  updatedAt: string;
}

export type CbtStoredSession =
  | ({ kind: 'thought-map' } & Partial<ThoughtMapSession> & {
      sessionId: string;
      title: string;
      createdAt: string;
      updatedAt: string;
    })
  | ({ kind: 'belief-lens' } & Partial<BeliefLensSession> & {
      sessionId: string;
      title: string;
      createdAt: string;
      updatedAt: string;
    })
  | ({ kind: 'reality-experiment' } & Partial<RealityExperimentSession> & {
      sessionId: string;
      title: string;
      createdAt: string;
      updatedAt: string;
    })
  | ({ kind: 'activation' } & Partial<ActivationSession> & {
      sessionId: string;
      title: string;
      createdAt: string;
      updatedAt: string;
    });
