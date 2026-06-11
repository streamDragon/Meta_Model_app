// Shared content-pack types (packs/*.json).

export type ViolationFamily = 'DELETION' | 'DISTORTION' | 'GENERALIZATION';

export interface Subcategory {
  id: string;
  name: string;
  hebrew: string;
  description: string;
  example: string;
  question: string;
  category: ViolationFamily;
}

export interface Category {
  id: string;
  name: string;
  hebrew_name: string;
  description: string;
  icon: string;
  subcategories: Subcategory[];
}

export interface PracticeStatement {
  id: number;
  statement: string;
  category: ViolationFamily;
  subcategory: string;
  violation: string;
  suggested_question: string;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface ReframeTemplate {
  gap_hint: string;
  reframe: string;
}

export interface ChoiceOption {
  id: string;
  label: string;
  question?: string;
}

export interface PrismBreenPack {
  id: string;
  name: string;
  mode: string;
  description: string;
  levels: Record<string, ChoiceOption[]>;
}

export interface BlueprintPack {
  id: string;
  name: string;
  mode: string;
  fields: Record<string, ChoiceOption[]>;
}

export interface Prism {
  id: string;
  name_he: string;
  name_en: string;
  meta_model_category: ViolationFamily;
  linguistic_triggers: string[];
  anchor_question_templates: string[];
  philosophy_core: string;
  trainer_intent: string;
  examples: string[];
  anti_patterns: string[];
  level_hints: Record<string, string>;
  recommended_interventions_by_level: Record<string, string>;
  tags: string[];
}

export interface MetaModelContent {
  categories: Category[];
  practice_statements: PracticeStatement[];
  blueprint_builder: {
    framing: string;
    state_machine: { state: string; description: string; next: string }[];
    reframe_templates: ReframeTemplate[];
  };
  choice_packs: {
    prism_breen: PrismBreenPack;
    blueprint: BlueprintPack;
  };
  prisms: Prism[];
}

export interface PrismLevel {
  id: 'E' | 'B' | 'C' | 'V' | 'I';
  label: string;
  detail: string;
}

// NOTE (audit §4.2): these E/B/C/V/I rows are Dilts-style logical levels.
// The legacy data labels them "Breen"; treat as placeholder pending source validation.
export const PRISM_LEVELS: PrismLevel[] = [
  { id: 'E', label: 'הקשר', detail: 'סביבה, זמן, מקום' },
  { id: 'B', label: 'התנהגות', detail: 'פעולות ותגובות' },
  { id: 'C', label: 'יכולת', detail: 'מיומנות או אסטרטגיה' },
  { id: 'V', label: 'אמונה / ערך', detail: 'כלל פנימי או משמעות' },
  { id: 'I', label: 'זהות / שייכות', detail: 'מי אני ביחס לזה' },
];

export interface PrismAnswer {
  level: PrismLevel['id'];
  label: string;
  text: string;
  choice_id: string;
  recovery_question: string;
}

export interface PrismSession {
  datetime: string;
  prism_id: string;
  prism_name: string;
  anchor: string;
  answers: PrismAnswer[];
  emotion: number;
  resistance: number;
}

export interface PivotRecommendation {
  pivot: PrismLevel['id'];
  reason: string;
}
