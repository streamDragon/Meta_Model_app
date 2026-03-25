import React, { useEffect, useMemo, useState } from 'react';
import { getTrainerContract } from '../config/trainerContract';
import { TrainerPlatformShell } from './trainer-shell/TrainerPlatformShell';
import { TrainerSettingsShell, type TrainerSettingsSection } from './trainer-shell/TrainerSettingsShell';
import { ActiveStepFlow, ACTIVE_STEP_FLOW_CSS, type ActiveStepFlowStep } from './trainer-shell/ActiveStepFlow';
import { TRAINER_PLATFORM_CSS } from './trainer-shell/trainerPlatformStyles';

type TemplateType = 'CEQ' | 'CAUSE' | 'ASSUMPTIONS1';
type CauseMode = 'CAUSES_OF_TOKEN' | 'EFFECTS_OF_TOKEN';
type PrototypeSchemaId = 'DEBONO_FAN' | 'LOGICAL_LEVELS_STACK' | 'RUSSELL_GRINDER_TYPES';
type RelationalVoiceRoleId = 'PARENT' | 'CHILD' | 'SIBLING' | 'MENTOR' | 'PARTNER' | 'PEER';
type RelationalToneId = 'SUPPORTIVE' | 'CURIOUS' | 'FIRM' | 'PLAYFUL' | 'CALM' | 'CHALLENGING';
type LogicalLevelKey = 'belonging' | 'identity' | 'beliefsValues' | 'capability' | 'behavior' | 'environment';
type DebonoHatKey = 'white' | 'red' | 'black' | 'yellow' | 'green' | 'blue';

type DraggableCandidate = {
  id: string;
  type: 'word' | 'phrase';
  text: string;
  start: number;
  end: number;
  allowed_templates: TemplateType[];
};

type TemplatePayloadBase = {
  question: string;
  sets: string[][];
  reflection_template: string;
};

type CauseTemplatePayload = TemplatePayloadBase & { mode?: CauseMode };
type TokenTemplatePayloads = Partial<Record<TemplateType, TemplatePayloadBase | CauseTemplatePayload>>;

type Scenario = {
  scenario_id: string;
  language: string;
  client_text: string;
  draggables: DraggableCandidate[];
  template_payloads: Record<string, TokenTemplatePayloads>;
};

type ScenarioFile = {
  version: string;
  language: string;
  scenarios: Scenario[];
};

type FeedbackTone = 'info' | 'success' | 'error';
type Feedback = { tone: FeedbackTone; text: string };
type WorkspaceStepId = 'read' | 'choose' | 'place' | 'reveal' | 'branch';
type BranchCardTone = 'neutral' | 'info' | 'positive' | 'warn';
type BranchCard = { label: string; text: string; tone?: BranchCardTone };
type BranchModel = {
  primaryTitle: string;
  primaryItems: string[];
  alternateTitle: string;
  alternateItems: string[];
  impactTitle: string;
  impactItems: BranchCard[];
  structureKind: string;
  distinctionText: string;
  explanationLead: string;
};

type ActiveMapping = { tokenId: string; templateType: TemplateType; setIndex: number };

type TrainerState = {
  currentScenarioIndex: number;
  selectedTokenId: string | null;
  active: ActiveMapping | null;
  completedAtLeastOneDrop: boolean;
  feedback: Feedback | null;
  scoreDrops: number;
  scoreVariants: number;
  variantBonusAwardedKeys: Record<string, true>;
  lastCompletedRecap: string;
};

type IcebergLaunchMode = 'guided' | 'direct';
type IcebergSettings = {
  defaultScenarioIndex: number;
  launchMode: IcebergLaunchMode;
  showFocusGuide: boolean;
  showFocusSketch: boolean;
  autoRevealAfterPlacement: boolean;
};

type TemplateMeta = {
  type: TemplateType;
  code: string;
  titleHe: string;
  titleEn: string;
  shortHelp: string;
  slotCount: 2 | 3;
  gapHint: string;
  factPrompt: string;
};

type PrototypeSchemaMeta = {
  id: PrototypeSchemaId;
  code: string;
  titleHe: string;
  titleEn: string;
  shortHelp: string;
  note: string;
};

type RelationalVoiceRolePreset = {
  id: RelationalVoiceRoleId;
  labelHe: string;
  stanceHe: string;
  careFocusHe: string;
  closenessHe: string;
  boundaryHe: string;
};

type RelationalTonePreset = {
  id: RelationalToneId;
  labelHe: string;
  adverbHe: string;
  openingMoveHe: string;
  riskHe: string;
  benefitHe: string;
  challengeVerbHe: string;
};

type LogicalLevelsDraft = Record<LogicalLevelKey, string>;
type DebonoHatDraft = Record<DebonoHatKey, string>;

type RelationalVoiceDraft = {
  anchor: string;
  roleId: RelationalVoiceRoleId;
  toneId: RelationalToneId;
  voiceLine: string;
  levels: LogicalLevelsDraft;
  deBono: DebonoHatDraft;
  rgChecks: {
    detectedType: string;
    lowerTypeQuestion: string;
    upperTypeQuestion: string;
    splitPrompt: string;
  };
};

type TreeChip = {
  id: string;
  label: string;
  text: string;
};

const TEMPLATE_META: Record<TemplateType, TemplateMeta> = {
  CEQ: {
    type: 'CEQ',
    code: 'CEq',
    titleHe: 'הכללה וקריטריונים',
    titleEn: 'Inclusion / Criteria',
    shortHelp: 'מפרקים שם כללי לסימנים, קריטריונים ודוגמאות כדי להבין מה באמת נחשב בפנים.',
    slotCount: 3,
    gapHint: 'הפער הוא בין שם כללי לבין הקריטריונים שצריכים להתקיים במציאות כדי להכניס משהו לתוך הקטגוריה.',
    factPrompt: 'לפי מה בפועל הדבר הזה נכנס לקטגוריה הזו?'
  },
  CAUSE: {
    type: 'CAUSE',
    code: 'CE',
    titleHe: 'סיבות, תנאים והשלכות',
    titleEn: 'Causes / Conditions / Outcomes',
    shortHelp: 'לא מחפשים חץ אחד. מארגנים כמה גורמים אפשריים, חלופות, ותוצאות שונות.',
    slotCount: 2,
    gapHint: 'הפער הוא בין מה שמרגישים או קובעים לבין כמה גורמים ותנאים שאולי מזינים את זה או נובעים ממנו.',
    factPrompt: 'מה עוד תורם לזה, ומה עוד זה יכול לייצר?'
  },
  ASSUMPTIONS1: {
    type: 'ASSUMPTIONS1',
    code: 'A1',
    titleHe: 'הנחות שמחזיקות את המשפט',
    titleEn: 'Hidden Assumptions',
    shortHelp: 'מוציאים לאור את מה שכבר מונח בפנים בלי להיאמר במפורש.',
    slotCount: 3,
    gapHint: 'הפער הוא בין המשפט הגלוי לבין הנחות נסתרות שמחזיקות אותו בשקט.',
    factPrompt: 'איזו הנחה כדאי לבדוק קודם מול המציאות?'
  }
};

const TEMPLATE_TYPES: TemplateType[] = ['CEQ', 'CAUSE', 'ASSUMPTIONS1'];

const PROTOTYPE_SCHEMAS: PrototypeSchemaMeta[] = [
  {
    id: 'DEBONO_FAN',
    code: 'DB',
    titleHe: 'דה בונו · מניפה/עץ רעיונות',
    titleEn: 'De Bono Idea Fan',
    shortHelp: 'צורה היררכית לריבוי כיווני פיתוח סביב עוגן אחד.',
    note: 'Prototype shape (ויזואלי בלבד כרגע)'
  },
  {
    id: 'LOGICAL_LEVELS_STACK',
    code: 'LL',
    titleHe: 'רמות לוגיות · מגדל/פירמידה',
    titleEn: 'Logical Levels Stack',
    shortHelp: 'סביבה → התנהגות → יכולת → אמונה/ערך → זהות → שייכות.',
    note: 'Prototype shape (בהמשך יחובר ל-Vertical Stack מלא)'
  },
  {
    id: 'RUSSELL_GRINDER_TYPES',
    code: 'RG',
    titleHe: 'Russell / Grinder · טיפוסים לוגיים',
    titleEn: 'Logical Types / Meta-Levels',
    shortHelp: 'צורת רמות/שכבות לחשיפת קפיצה מטיפוס אחד לטיפוס אחר.',
    note: 'Prototype shape (מיפוי חזותי לקפיצות רמה)'
  }
];

const RELATIONAL_ROLE_PRESETS: Record<RelationalVoiceRoleId, RelationalVoiceRolePreset> = {
  PARENT: {
    id: 'PARENT',
    labelHe: 'הורה',
    stanceHe: 'מחזיק/ה ומכוון/ת',
    careFocusHe: 'ביטחון + כיוון',
    closenessHe: 'קשר מגן',
    boundaryHe: 'גבול ברור עם חום'
  },
  CHILD: {
    id: 'CHILD',
    labelHe: 'ילד/ה',
    stanceHe: 'סקרן/ית ומביע/ה צורך',
    careFocusHe: 'נראות + רגש',
    closenessHe: 'בקשת חיבור',
    boundaryHe: 'שאלה במקום קביעה'
  },
  SIBLING: {
    id: 'SIBLING',
    labelHe: 'אח/אחות',
    stanceHe: 'ישיר/ה ושוויוני/ת',
    careFocusHe: 'נאמנות + אמת',
    closenessHe: 'קרבה בגובה העיניים',
    boundaryHe: 'דוגרי בלי לבטל'
  },
  MENTOR: {
    id: 'MENTOR',
    labelHe: 'מנטור/ית',
    stanceHe: 'מחדד/ת כיוון',
    careFocusHe: 'למידה + אחריות',
    closenessHe: 'ליווי מקצועי',
    boundaryHe: 'דיוק לצד תמיכה'
  },
  PARTNER: {
    id: 'PARTNER',
    labelHe: 'בן/בת זוג',
    stanceHe: 'מחובר/ת ומשקף/ת',
    careFocusHe: 'קרבה + תיאום',
    closenessHe: 'שותפות רגשית',
    boundaryHe: 'אותנטיות עם רכות'
  },
  PEER: {
    id: 'PEER',
    labelHe: 'חבר/ה / קולגה',
    stanceHe: 'בגובה העיניים',
    careFocusHe: 'שיתוף + פתרון',
    closenessHe: 'שיתוף פעולה',
    boundaryHe: 'כנות תכל׳ס'
  }
};

const RELATIONAL_TONE_PRESETS: Record<RelationalToneId, RelationalTonePreset> = {
  SUPPORTIVE: {
    id: 'SUPPORTIVE',
    labelHe: 'תומך',
    adverbHe: 'ברכות',
    openingMoveHe: 'לאשר קודם את החוויה',
    riskHe: 'לעטוף יותר מדי ולהשאיר ערפול',
    benefitHe: 'מוריד הגנה ומאפשר שיתוף',
    challengeVerbHe: 'להציע'
  },
  CURIOUS: {
    id: 'CURIOUS',
    labelHe: 'סקרני',
    adverbHe: 'בסקרנות',
    openingMoveHe: 'לשאול לפני פירוש',
    riskHe: 'להישמע מרוחק אם אין אמפתיה',
    benefitHe: 'פותח מידע חדש ומפחית הנחות',
    challengeVerbHe: 'לחקור'
  },
  FIRM: {
    id: 'FIRM',
    labelHe: 'אסרטיבי',
    adverbHe: 'בבהירות',
    openingMoveHe: 'להגדיר גבול ומשמעות',
    riskHe: 'להישמע שיפוטי אם אין קשר',
    benefitHe: 'מייצר כיוון ויציבות',
    challengeVerbHe: 'לחדד'
  },
  PLAYFUL: {
    id: 'PLAYFUL',
    labelHe: 'משחקי',
    adverbHe: 'בקלילות',
    openingMoveHe: 'לפתוח דרך דימוי/הומור קטן',
    riskHe: 'להוזיל נושא רגיש',
    benefitHe: 'משחרר תקיעות ויצירתיות',
    challengeVerbHe: 'לשחק'
  },
  CALM: {
    id: 'CALM',
    labelHe: 'רגוע',
    adverbHe: 'באיטיות',
    openingMoveHe: 'להאט קצב ולייצב נשימה',
    riskHe: 'להיתפס כפסיבי מדי',
    benefitHe: 'מוריד הצפה ומאפשר דיוק',
    challengeVerbHe: 'לייצב'
  },
  CHALLENGING: {
    id: 'CHALLENGING',
    labelHe: 'מאתגר',
    adverbHe: 'בישירות',
    openingMoveHe: 'להצביע על הפער בלי להאשים',
    riskHe: 'להקפיץ התנגדות',
    benefitHe: 'מניע שינוי כשיש תקיעות',
    challengeVerbHe: 'לאתגר'
  }
};

const LOGICAL_LEVEL_FIELDS: Array<{ key: LogicalLevelKey; labelHe: string; hintHe: string }> = [
  { key: 'belonging', labelHe: 'שייכות / שליחות', hintHe: 'אנחנו / קהילה / למה רחב יותר' },
  { key: 'identity', labelHe: 'זהות', hintHe: 'מי אני/אתה בסיפור הזה' },
  { key: 'beliefsValues', labelHe: 'אמונות / ערכים', hintHe: 'מה חשוב / מה נכון כאן' },
  { key: 'capability', labelHe: 'יכולות / אסטרטגיה', hintHe: 'איך אני יודע/ת לעשות' },
  { key: 'behavior', labelHe: 'התנהגות', hintHe: 'מה עושים בפועל' },
  { key: 'environment', labelHe: 'סביבה / הקשר', hintHe: 'מתי/איפה/עם מי' }
];

const DEBONO_FIELDS: Array<{ key: DebonoHatKey; labelHe: string; chip: string }> = [
  { key: 'white', labelHe: 'לבן (עובדות)', chip: 'White' },
  { key: 'red', labelHe: 'אדום (רגש)', chip: 'Red' },
  { key: 'black', labelHe: 'שחור (סיכון)', chip: 'Black' },
  { key: 'yellow', labelHe: 'צהוב (רווח)', chip: 'Yellow' },
  { key: 'green', labelHe: 'ירוק (חלופות)', chip: 'Green' },
  { key: 'blue', labelHe: 'כחול (ניהול)', chip: 'Blue' }
];

const INTRO_COPY =
  'כאן מתאמנים על ארגון פנימי של חשיבה: לוקחים אמירה אחת, בוחרים מבנה מתאים, ורואים איך היא מסתדרת בתוך עץ של הבחנות.';
const DISCLAIMER_COPY = 'זהו מיפוי עבודה אפשרי, לא אמת סופית. המטרה היא לראות מבנה, חלופות וענפים נוספים.';
const OUTRO_COPY = 'בסוף כל סבב בודקים מה נפתח: איזה ענף התחזק, איזו חלופה הופיעה, ומה כדאי לקחת לשיחה אמיתית.';
const PROCESS_STEPS: Array<{ id: WorkspaceStepId; label: string; help: string }> = [
  { id: 'read', label: '1. קוראים את האמירה', help: 'קולטים את המשפט המלא ולא רק טוקן בודד.' },
  { id: 'choose', label: '2. בוחרים מבנה', help: 'מחליטים איזה סוג עץ מתאים לבדיקה.' },
  { id: 'place', label: '3. משבצים את העוגן', help: 'ממקמים את המילה או הביטוי בתוך המבנה.' },
  { id: 'reveal', label: '4. רואים את ההסתעפות', help: 'מבינים מה המבנה פותח ומה עוד יכול להתפצל.' },
  { id: 'branch', label: '5. בודקים חלופה', help: 'שואלים מה קורה אם בוחרים ענף אחר או פירוש אחר.' }
];

const INITIAL_STATE: TrainerState = {
  currentScenarioIndex: 0,
  selectedTokenId: null,
  active: null,
  completedAtLeastOneDrop: false,
  feedback: null,
  scoreDrops: 0,
  scoreVariants: 0,
  variantBonusAwardedKeys: {},
  lastCompletedRecap: ''
};

const ICEBERG_SETTINGS_STORAGE_KEY = 'iceberg_templates_settings_v1';
const DEFAULT_ICEBERG_SETTINGS: IcebergSettings = {
  defaultScenarioIndex: 0,
  launchMode: 'direct',
  showFocusGuide: true,
  showFocusSketch: true,
  autoRevealAfterPlacement: false
};

function normalizeScenarioIndex(value: number, scenarioCount = 0): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  const rounded = Math.max(0, Math.floor(value));
  if (!scenarioCount) return rounded;
  return Math.min(rounded, Math.max(0, scenarioCount - 1));
}

function normalizeIcebergSettings(raw: Partial<IcebergSettings> | null | undefined, scenarioCount = 0): IcebergSettings {
  const input = raw && typeof raw === 'object' ? raw : {};
  return {
    defaultScenarioIndex: normalizeScenarioIndex(Number(input.defaultScenarioIndex ?? DEFAULT_ICEBERG_SETTINGS.defaultScenarioIndex), scenarioCount),
    launchMode: input.launchMode === 'direct' ? 'direct' : DEFAULT_ICEBERG_SETTINGS.launchMode,
    showFocusGuide: typeof input.showFocusGuide === 'boolean' ? input.showFocusGuide : DEFAULT_ICEBERG_SETTINGS.showFocusGuide,
    showFocusSketch: typeof input.showFocusSketch === 'boolean' ? input.showFocusSketch : DEFAULT_ICEBERG_SETTINGS.showFocusSketch,
    autoRevealAfterPlacement: typeof input.autoRevealAfterPlacement === 'boolean' ? input.autoRevealAfterPlacement : DEFAULT_ICEBERG_SETTINGS.autoRevealAfterPlacement
  };
}

function loadIcebergSettings(scenarioCount = 0): IcebergSettings {
  if (typeof window === 'undefined') return normalizeIcebergSettings(DEFAULT_ICEBERG_SETTINGS, scenarioCount);
  try {
    const raw = window.localStorage.getItem(ICEBERG_SETTINGS_STORAGE_KEY);
    if (!raw) return normalizeIcebergSettings(DEFAULT_ICEBERG_SETTINGS, scenarioCount);
    return normalizeIcebergSettings(JSON.parse(raw) as Partial<IcebergSettings>, scenarioCount);
  } catch {
    return normalizeIcebergSettings(DEFAULT_ICEBERG_SETTINGS, scenarioCount);
  }
}

function saveIcebergSettings(settings: IcebergSettings): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(ICEBERG_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}

const css = `
.it-wrap{direction:rtl;font-family:"Assistant","Heebo","Noto Sans Hebrew","Segoe UI",sans-serif;background:radial-gradient(circle at 10% 0%,#fef3c7 0,#fffaf0 36%,#f8fafc 100%);color:#111827;max-width:1420px;margin:0 auto;border:1px solid #fde68a;border-radius:18px;padding:12px;box-shadow:0 16px 32px rgba(17,24,39,.06)}
.it-wrap *{box-sizing:border-box}.it-panel{background:#ffffffde;border:1px solid #fde68a;border-radius:14px;padding:10px;box-shadow:0 8px 24px rgba(17,24,39,.04)}
.it-grid{display:grid;grid-template-columns:minmax(0,1.12fr) minmax(320px,.88fr);gap:12px;align-items:start}.it-stack{display:grid;gap:10px}
.it-workbench-grid{display:grid;grid-template-columns:minmax(0,.95fr) minmax(0,1.05fr);gap:10px;align-items:start}
.it-title{margin:0;font-weight:900;font-size:1.2rem}.it-sub{margin:6px 0 0;color:#6b7280;line-height:1.4}
.it-intro{margin-top:10px;border:1px solid #fde68a;background:#fff7d6;color:#92400e;border-radius:10px;padding:10px;line-height:1.4}
.it-topbar{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}.it-chip{background:#fff;border:1px solid #fde68a;border-radius:999px;padding:6px 10px;font-weight:800;font-size:.82rem}
.it-home-links{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}.it-home-link{display:inline-flex;align-items:center;gap:6px;padding:6px 10px;border-radius:999px;border:1px solid #d1d5db;background:#fff;color:#111827;text-decoration:none;font-weight:800;font-size:.82rem}
.it-home-link:hover{border-color:#2563eb;color:#1d4ed8}
.it-settings-toggle-list{display:grid;gap:8px}
.it-settings-toggle{display:grid;grid-template-columns:auto 1fr;gap:10px;align-items:start;border:1px solid #dce8f6;background:#fff;border-radius:14px;padding:10px 12px}
.it-settings-toggle input{margin-top:4px}
.it-settings-toggle strong{display:block;color:#0f172a;font-size:.9rem}
.it-settings-toggle span{display:block;color:#64748b;font-size:.82rem;line-height:1.45}
.it-textbox{margin-top:8px;border:1px solid #f3e8b3;background:#fff;border-radius:12px;padding:10px;line-height:1.85;min-height:96px}.it-seg{white-space:pre-wrap}
.it-token{display:inline-flex;align-items:center;padding:2px 8px;border-radius:999px;border:1px dashed #f59e0b;background:#fffbeb;color:#92400e;font-weight:800;cursor:grab;user-select:none}
.it-token:hover{background:#fef3c7}.it-token.sel{border-style:solid;border-color:#2563eb;background:#eff6ff;color:#1d4ed8}.it-token.active{border-style:solid;border-color:#059669;background:#ecfdf5;color:#065f46}.it-token.dragging{opacity:.65}
.it-token-dock{margin-top:8px;border:1px dashed #bfdbfe;background:#f8fbff;border-radius:10px;padding:8px}
.it-token-dock-row{display:flex;flex-wrap:wrap;gap:6px}
.it-token-dock .it-token{font-size:.84rem;padding:3px 8px}
.it-help{margin-top:8px;color:#6b7280;font-size:.84rem}.it-help strong{color:#111827}.it-kicker{font-size:.78rem;color:#6b7280}
.it-board{display:grid;gap:10px}.it-board-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.it-board-card{border:1px solid #e5e7eb;border-radius:12px;padding:10px;background:#fff}
.it-board-card h3{margin:0 0 6px;font-size:.95rem;font-weight:900}.it-board-card p{margin:0;color:#4b5563;line-height:1.35}
.it-board-row{display:grid;grid-template-columns:120px 1fr;gap:8px;align-items:flex-start}.it-board-label{font-weight:900;font-size:.82rem;color:#374151}
.it-board-value{border:1px solid #e5e7eb;border-radius:10px;background:#f9fafb;padding:8px;line-height:1.35;min-height:40px}.it-board-value.emph{border-color:#bfdbfe;background:#eff6ff;color:#1e3a8a;font-weight:700}.it-board-value.warn{border-color:#fde68a;background:#fffbeb;color:#92400e}
.it-board-tags{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}.it-mini-tag{padding:4px 8px;border-radius:999px;border:1px solid #d1d5db;background:#fff;font-size:.78rem;font-weight:700}.it-mini-tag.code{background:#111827;color:#fff;border-color:#111827;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
.it-template-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.it-template{border:1px solid #e5e7eb;background:#fff;border-radius:12px;padding:8px;transition:transform .16s ease,border-color .16s ease,box-shadow .16s ease}
.it-template[data-over="1"]{border-color:#2563eb;box-shadow:0 0 0 2px rgba(37,99,235,.14);transform:translateY(-1px)}.it-template.is-active{border-color:#059669;box-shadow:0 0 0 2px rgba(5,150,105,.12)}
.it-template.is-proto{opacity:.9;border-style:dashed;background:linear-gradient(180deg,#fff,#fafafa)}
.it-template.shake{animation:itShake .28s linear 1}@keyframes itShake{0%{transform:translateX(0)}25%{transform:translateX(-3px)}50%{transform:translateX(3px)}75%{transform:translateX(-2px)}100%{transform:translateX(0)}}
.it-template-head{display:flex;justify-content:space-between;gap:8px;align-items:flex-start}.it-template-title{font-weight:900;line-height:1.2}.it-template-mini{font-size:.75rem;color:#6b7280}
.it-template-meta{display:flex;align-items:center;gap:6px;flex-wrap:wrap}.it-template-code{font-size:.72rem;font-weight:900;background:#1f2937;color:#fff;padding:3px 7px;border-radius:999px}
.it-template-help{margin-top:6px;color:#4b5563;font-size:.82rem;line-height:1.3}
.it-dropzone{margin-top:8px;border:1px dashed #d1d5db;border-radius:10px;padding:8px;background:#fafafa;min-height:44px;display:flex;align-items:center;justify-content:center;text-align:center;color:#6b7280;font-weight:700}
.it-dropzone.has-active{background:#f0fdf4;border-color:#86efac;color:#065f46}
.it-sketch{margin-top:6px;border:1px solid #e5e7eb;border-radius:10px;background:linear-gradient(180deg,#fff,#f9fafb);padding:6px}
.it-sketch svg{display:block;width:100%;height:auto}.it-sketch text{font-family:"Assistant","Heebo","Segoe UI",sans-serif;font-size:10px;fill:#374151;font-weight:700}
.it-sketch .s-line{stroke:#475569;stroke-width:1.4;fill:none}.it-sketch .s-box{stroke:#475569;stroke-width:1.3;fill:#fff}.it-sketch .s-soft{stroke:#94a3b8;stroke-width:1.2;fill:#f8fafc;stroke-dasharray:3 3}
.it-slots{margin-top:8px;display:grid;gap:8px}.it-slots.cols-2{grid-template-columns:1fr 1fr}.it-slots.cols-3{grid-template-columns:repeat(3,1fr)}.it-slot{border:1px solid #e5e7eb;border-radius:10px;background:#f9fafb;padding:8px;min-height:58px;display:flex;align-items:center;justify-content:center;text-align:center;font-weight:700;line-height:1.3}
.it-question{margin-top:8px;border:1px solid #dbeafe;background:#eff6ff;border-radius:10px;padding:8px;color:#1e3a8a;font-weight:700;line-height:1.4}
.it-reflection{margin-top:8px;border:1px solid #dcfce7;background:#ecfdf5;border-radius:10px;padding:8px;color:#065f46;line-height:1.4}
.it-disclaimer{margin-top:8px;border:1px solid #fde68a;background:#fff7d6;border-radius:10px;padding:8px;color:#92400e;font-size:.84rem;font-weight:700;line-height:1.3}
.it-actions{margin-top:8px;display:flex;flex-wrap:wrap;gap:8px}.it-btn{border:0;border-radius:10px;padding:9px 12px;font-weight:800;cursor:pointer}.it-btn:disabled{opacity:.55;cursor:not-allowed}
.it-btn.primary{background:#2563eb;color:#fff}.it-btn.secondary{background:#e5e7eb;color:#111827}.it-btn.ghost{background:#fff;border:1px solid #d1d5db;color:#111827}
.it-feedback{margin-top:8px;border-radius:10px;padding:8px 10px;font-weight:700;line-height:1.35}.it-feedback.info{background:#eef2ff;border:1px solid #c7d2fe;color:#3730a3}.it-feedback.success{background:#ecfdf5;border:1px solid #bbf7d0;color:#166534}.it-feedback.error{background:#fef2f2;border:1px solid #fecaca;color:#991b1b}
.it-active{display:grid;gap:10px}.it-empty{color:#6b7280;border:1px dashed #d1d5db;border-radius:10px;padding:12px;background:#fafafa}
.it-recap{margin-top:8px;border:1px solid #bfdbfe;background:#f0f9ff;color:#0c4a6e;border-radius:10px;padding:8px;line-height:1.35}
.it-progress{display:flex;justify-content:space-between;gap:8px;align-items:center}
.it-steps{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
.it-step{display:inline-flex;align-items:center;gap:6px;padding:6px 10px;border-radius:999px;border:1px solid #d1d5db;background:#fff;color:#4b5563;font-weight:800;font-size:.78rem}
.it-step.is-on{border-color:#2563eb;background:#eff6ff;color:#1d4ed8}
.it-step.is-done{border-color:#bbf7d0;background:#ecfdf5;color:#166534}
.it-collapse{border:1px solid #e5e7eb;border-radius:12px;background:#fff}
.it-collapse>summary{list-style:none;cursor:pointer;padding:10px 12px;font-weight:900;color:#1f2937;display:flex;justify-content:space-between;align-items:center}
.it-collapse>summary::-webkit-details-marker{display:none}
.it-collapse-body{padding:0 12px 12px}
.it-focus-panel{border-color:#bfdbfe;background:linear-gradient(180deg,#fff 0%,#f8fbff 100%)}
.it-focus-top{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap}
.it-focus-badge{display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:999px;background:#eff6ff;border:1px solid #bfdbfe;color:#1e3a8a;font-weight:800;font-size:.78rem}
.it-focus-toolbar{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:8px}
.it-focus-mini-btn{border:1px solid #d1d5db;background:#fff;color:#374151;border-radius:999px;padding:5px 9px;font-weight:800;font-size:.76rem;cursor:pointer}
.it-focus-mini-btn:hover{border-color:#2563eb;color:#1d4ed8}
.it-focus-guide{margin-top:8px;border:1px solid #dbeafe;background:#f8fbff;border-radius:10px;padding:8px}
.it-focus-guide summary{cursor:pointer;font-weight:800;color:#1e3a8a;list-style:none}
.it-focus-guide summary::-webkit-details-marker{display:none}
.it-focus-guide-body{margin-top:8px;display:grid;gap:8px}
.it-focus-sketch .it-sketch{margin-top:0;padding:14px}
.it-focus-sketch .it-sketch svg{min-height:140px}
.it-focus-sketch.is-compact .it-sketch{padding:8px}
.it-focus-sketch.is-compact .it-sketch svg{min-height:96px}
.it-proto-note{margin-top:6px;color:#6b7280;font-size:.76rem;line-height:1.35}
.it-role-studio{margin-top:10px;border:1px solid #bfdbfe;background:linear-gradient(180deg,#fff 0,#f8fbff 100%);border-radius:12px;padding:10px;display:grid;gap:10px}
.it-role-studio-head{display:flex;justify-content:space-between;align-items:flex-start;gap:8px;flex-wrap:wrap}
.it-role-studio-title{margin:0;font-weight:900;font-size:.95rem;color:#1e3a8a}
.it-role-studio-sub{margin:4px 0 0;color:#475569;font-size:.82rem;line-height:1.35}
.it-role-chip-row{display:flex;flex-wrap:wrap;gap:6px}
.it-role-chip{display:inline-flex;align-items:center;gap:4px;padding:4px 8px;border-radius:999px;border:1px solid #bfdbfe;background:#eff6ff;color:#1e3a8a;font-size:.75rem;font-weight:800}
.it-role-form{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;align-items:end}
.it-field{display:grid;gap:4px}
.it-field label{font-size:.76rem;font-weight:800;color:#334155}
.it-input,.it-select,.it-textarea{width:100%;border:1px solid #cbd5e1;border-radius:10px;background:#fff;color:#111827;font:inherit}
.it-input,.it-select{padding:7px 9px;min-height:38px}
.it-textarea{padding:8px 9px;line-height:1.35;resize:vertical;min-height:66px}
.it-field-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.it-btn.small{padding:7px 10px;border-radius:8px;font-size:.82rem}
.it-voice-line{border:1px solid #dbeafe;background:#eff6ff;color:#1e3a8a;border-radius:10px;padding:8px;font-weight:700;line-height:1.35}
.it-role-grid{display:grid;grid-template-columns:1.15fr .85fr;gap:10px;align-items:start}
.it-levels-grid{display:grid;gap:8px}
.it-level-card{border:1px solid #e5e7eb;background:#fff;border-radius:10px;padding:8px;display:grid;gap:6px}
.it-level-card-head{display:flex;justify-content:space-between;gap:8px;align-items:center;flex-wrap:wrap}
.it-level-card-head strong{font-size:.84rem}
.it-level-hint{color:#64748b;font-size:.74rem}
.it-side-stack{display:grid;gap:10px}
.it-hat-list{display:grid;gap:8px}
.it-hat-card{border:1px solid #e5e7eb;background:#fff;border-radius:10px;padding:8px;display:grid;gap:6px}
.it-hat-head{display:flex;justify-content:space-between;gap:6px;align-items:center}
.it-rg-card{border:1px solid #e5e7eb;background:#fff;border-radius:10px;padding:8px;display:grid;gap:8px}
.it-rg-card h4{margin:0;font-size:.86rem}
.it-rg-line{border:1px solid #e5e7eb;border-radius:8px;background:#f8fafc;padding:7px 8px;font-size:.82rem;line-height:1.3}
.it-rg-line strong{color:#111827}
.it-reveal-extra{margin-top:8px;border:1px solid #d1d5db;background:#fff;border-radius:10px;padding:8px}
.it-reveal-extra summary{cursor:pointer;font-weight:800;color:#374151;list-style:none}
.it-reveal-extra summary::-webkit-details-marker{display:none}
.it-reveal-extra-body{margin-top:8px;display:grid;gap:8px}
.it-stage-switch{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}
.it-stage-btn{border:1px solid #d1d5db;background:#fff;color:#374151;border-radius:999px;padding:6px 10px;font-weight:800;font-size:.8rem;cursor:pointer}
.it-stage-btn.is-active{border-color:#2563eb;background:#eff6ff;color:#1d4ed8}
.it-stage-btn:disabled{opacity:.5;cursor:not-allowed}
.it-stage-card{border:1px solid #e5e7eb;background:#fff;border-radius:12px;padding:10px;display:grid;gap:10px}
.it-challenge-list{display:grid;gap:8px;margin-top:8px}
.it-challenge-item{border:1px solid #fecaca;background:#fff;border-radius:10px;padding:8px;color:#7f1d1d;line-height:1.35;font-weight:700}
.it-challenge-note{margin-top:8px;border:1px dashed #fca5a5;background:#fff7f7;color:#991b1b;border-radius:10px;padding:8px;font-weight:700;line-height:1.35}
.it-scenario-list{margin:0;padding:0;list-style:none;display:grid;gap:6px}.it-scenario-list li{display:flex;justify-content:space-between;gap:8px;padding:6px 8px;border:1px solid #f3f4f6;border-radius:8px;background:#fff}
@media (min-width:981px){.it-focus-panel{position:sticky;top:10px;align-self:start;max-height:calc(100vh - 20px);overflow:auto}}
@media (max-width:1180px){.it-workbench-grid{grid-template-columns:1fr}.it-template-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:1080px){.it-board-grid{grid-template-columns:1fr}.it-template-grid{grid-template-columns:1fr}}
@media (max-width:980px){.it-grid{grid-template-columns:1fr}.it-slots.cols-3,.it-slots.cols-2{grid-template-columns:1fr}.it-board-row{grid-template-columns:1fr}.it-focus-sketch .it-sketch svg{min-height:120px}.it-role-form{grid-template-columns:1fr 1fr}.it-role-grid{grid-template-columns:1fr}}
@media (max-width:680px){.it-role-form{grid-template-columns:1fr}}
/* UX refinements from user feedback */
.it-grid{grid-template-columns:1fr}
@media (min-width:981px){.it-focus-panel{position:static;top:auto;align-self:stretch;max-height:none;overflow:visible}}
.it-focus-help{border:1px solid #dbeafe;background:#f8fbff;border-radius:10px;padding:8px}
.it-focus-help summary{cursor:pointer;list-style:none;font-weight:900;color:#1e3a8a;display:flex;justify-content:space-between;align-items:center;gap:8px}
.it-focus-help summary::-webkit-details-marker{display:none}
.it-focus-help-body{margin-top:8px;display:grid;gap:8px}
.it-focus-core-layout{display:grid;grid-template-columns:minmax(0,.95fr) minmax(0,1.05fr);gap:10px;align-items:start}
.it-focus-result-column{display:grid;gap:10px}
.it-focus-side-column{display:grid;gap:10px}
.it-reveal-visual{border:1px solid #bfdbfe;background:linear-gradient(180deg,#fff 0,#f0f9ff 100%);border-radius:12px;padding:10px;display:grid;gap:8px}
.it-reveal-visual-head{display:flex;justify-content:space-between;align-items:flex-start;gap:8px;flex-wrap:wrap}
.it-reveal-visual-head h4{margin:0;font-size:.92rem;color:#1e3a8a}
.it-reveal-visual-head p{margin:0;color:#64748b;font-size:.78rem;line-height:1.3}
.it-reveal-figure{border:1px solid #dbeafe;background:#fff;border-radius:12px;padding:10px}
.it-reveal-anchor{display:flex;justify-content:center;margin-bottom:10px}
.it-reveal-node{border:1px solid #d1d5db;background:#f9fafb;border-radius:10px;padding:8px;text-align:center;line-height:1.3;min-height:46px;display:grid;align-content:center;gap:3px}
.it-reveal-node strong{font-size:.75rem;color:#374151}
.it-reveal-node span{font-weight:800;color:#111827;font-size:.84rem;word-break:break-word}
.it-reveal-node.anchor{border-color:#93c5fd;background:#eff6ff}
.it-reveal-node.anchor span{color:#1e3a8a}
.it-reveal-branches{display:grid;gap:8px}
.it-reveal-branches.cols-3{grid-template-columns:repeat(3,minmax(0,1fr))}
.it-reveal-branches.cols-2{grid-template-columns:repeat(2,minmax(0,1fr))}
.it-reveal-connector{height:14px;position:relative}
.it-reveal-connector::before{content:"";position:absolute;inset:6px 10% auto 10%;border-top:2px solid #bfdbfe}
.it-reveal-connector::after{content:"";position:absolute;top:6px;left:50%;height:8px;border-left:2px solid #bfdbfe;transform:translateX(-50%)}
.it-reveal-cause-layout{display:grid;grid-template-columns:minmax(0,.9fr) minmax(0,1.1fr);gap:10px;align-items:center}
.it-reveal-cause-side{display:grid;gap:8px}
.it-reveal-cause-arrow{display:flex;justify-content:center;align-items:center;color:#2563eb;font-weight:900;font-size:1.2rem}
.it-reveal-cause-arrow small{font-size:.72rem;color:#64748b;font-weight:800}
.it-tree-lab{border:1px solid #e5e7eb;background:#fff;border-radius:12px;padding:10px;display:grid;gap:10px}
.it-tree-lab-head{display:flex;justify-content:space-between;align-items:flex-start;gap:8px;flex-wrap:wrap}
.it-tree-lab-head h4{margin:0;font-size:.9rem}
.it-tree-lab-head p{margin:0;color:#64748b;font-size:.78rem;line-height:1.3}
.it-tree-chip-bank{display:flex;flex-wrap:wrap;gap:6px}
.it-tree-chip{border:1px solid #d1d5db;background:#fff;border-radius:999px;padding:6px 10px;font-weight:800;font-size:.78rem;cursor:grab;display:inline-flex;align-items:center;gap:6px}
.it-tree-chip:hover{border-color:#93c5fd;background:#f8fbff}
.it-tree-chip.sel{border-color:#2563eb;background:#eff6ff;color:#1d4ed8}
.it-tree-chip-label{font-size:.68rem;color:#64748b;font-weight:900}
.it-tree-lab-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:10px;align-items:start}
.it-tree-board{border:1px solid #e5e7eb;background:#fafafa;border-radius:12px;padding:8px;display:grid;gap:8px}
.it-tree-board h5{margin:0;font-size:.84rem;color:#334155}
.it-tree-levels{display:grid;gap:7px}
.it-tree-level-slot{border:1px dashed #cbd5e1;background:#fff;border-radius:10px;padding:8px;display:grid;gap:6px;min-height:58px}
.it-tree-level-slot[data-over="1"]{border-style:solid;border-color:#2563eb;box-shadow:0 0 0 2px rgba(37,99,235,.12)}
.it-tree-level-head{display:flex;justify-content:space-between;gap:8px;align-items:center}
.it-tree-level-head strong{font-size:.8rem}
.it-tree-level-head span{font-size:.72rem;color:#64748b}
.it-tree-slot-value{border:1px solid #e5e7eb;background:#f8fafc;border-radius:8px;padding:7px 8px;line-height:1.3;font-weight:700;color:#111827;word-break:break-word}
.it-tree-slot-empty{color:#9ca3af;font-size:.76rem;font-weight:700}
.it-tree-fan{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
.it-tree-fan-slot{border:1px dashed #cbd5e1;background:#fff;border-radius:10px;padding:8px;display:grid;gap:6px;min-height:76px}
.it-tree-fan-slot[data-over="1"]{border-style:solid;border-color:#0ea5a4;box-shadow:0 0 0 2px rgba(14,165,164,.1)}
.it-tree-fan-head{display:flex;justify-content:space-between;gap:8px;align-items:center}
.it-tree-fan-head strong{font-size:.78rem}
.it-tree-fan-head .it-mini-tag{padding:2px 6px;font-size:.68rem}
.it-tree-lab-actions{display:flex;gap:8px;flex-wrap:wrap}
.it-tree-tap-hint{color:#64748b;font-size:.76rem}
@media (max-width:1180px){.it-focus-core-layout{grid-template-columns:1fr}.it-focus-side-column{order:2}.it-focus-result-column{order:1}}
@media (max-width:860px){.it-reveal-branches.cols-3{grid-template-columns:1fr}.it-reveal-cause-layout{grid-template-columns:1fr}.it-tree-lab-grid{grid-template-columns:1fr}}
.it-wrap-refined{background:radial-gradient(circle at top right,#fff4cf 0,#fffaf2 28%,#f7fbff 100%);padding:14px}
.it-hero-panel{padding:16px;background:linear-gradient(180deg,rgba(255,255,255,.96),rgba(247,251,255,.92));border-color:#f3d48e}
.it-hero-top,.it-panel-head,.it-onboarding-head,.it-branch-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap}
.it-start-strip{margin-top:12px;padding:12px 14px;border-radius:16px;border:1px solid #d9e7fb;background:linear-gradient(180deg,#f8fbff,#fff);display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap}
.it-start-copy{display:grid;gap:4px}.it-start-copy strong{font-size:.95rem;color:#0f3e77}.it-start-copy span{color:#475569;line-height:1.45}
.it-start-actions{display:flex;gap:8px;flex-wrap:wrap}
.it-main-layout{display:grid;grid-template-columns:minmax(0,1.08fr) minmax(300px,.72fr);gap:14px;align-items:start;margin-top:14px}
.it-main-column,.it-support-column{display:grid;gap:12px}
.it-panel-badge,.it-branch-badge{display:inline-flex;align-items:center;padding:4px 10px;border-radius:999px;background:#eef4ff;border:1px solid #bfd7ff;color:#1d4ed8;font-size:.76rem;font-weight:900}
.it-textbox-prominent{padding:16px;border-width:1px;border-color:#f0d59a;background:linear-gradient(180deg,#fff,#fff8eb);font-size:1.02rem}
.it-source-foot{display:grid;grid-template-columns:minmax(0,1fr) minmax(220px,.8fr);gap:10px;align-items:start}
.it-selection-card{border:1px solid #cfe0fb;background:#f8fbff;border-radius:14px;padding:12px;display:grid;gap:4px}
.it-selection-card strong{font-size:.82rem;color:#1d4ed8}.it-selection-card span{font-size:1rem;font-weight:900;color:#0f172a}.it-selection-card small{color:#64748b;line-height:1.4}
.it-template-grid-refined{grid-template-columns:repeat(3,minmax(0,1fr))}
.it-template-card{padding:12px;border-radius:16px;border-color:#dde7f0;box-shadow:0 10px 24px rgba(15,23,42,.04)}
.it-template-card.is-active{background:linear-gradient(180deg,#effcf5,#fff);border-color:#8edbb7}
.it-workspace-panel{border-color:#bfd7ee;background:linear-gradient(180deg,#fff,#f8fbff)}
.it-workspace-empty strong{display:block;color:#1d4ed8;margin-bottom:6px}.it-workspace-empty p{margin:0;line-height:1.6}
.it-coach-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;align-items:start}.it-coach-card{border:1px solid #dce7f3;border-radius:14px;background:#fff;padding:12px;display:grid;gap:6px}.it-coach-card strong{font-size:.84rem;color:#244e85}.it-coach-card p{margin:0;color:#334155;line-height:1.45}
.it-branch-panel{border:1px solid #dce9f9;border-radius:16px;background:linear-gradient(180deg,#fff,#f9fbff);padding:12px;display:grid;gap:10px}
.it-branch-head h3{margin:0;font-size:1rem;color:#0f3e77}.it-branch-head p{margin:4px 0 0;color:#516174;line-height:1.45}
.it-branch-note{border:1px solid #dbeafe;background:#eff6ff;border-radius:12px;padding:10px;color:#1e3a8a;line-height:1.45}
.it-branch-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
.it-branch-card{border:1px solid #e2e8f0;border-radius:14px;background:#fff;padding:12px;display:grid;gap:8px}.it-branch-card h4{margin:0;color:#10233f;font-size:.9rem}
.it-branch-list{display:grid;gap:8px}.it-branch-item{border:1px solid #e5e7eb;border-radius:10px;background:#f8fafc;padding:8px;line-height:1.4;color:#334155;font-weight:700}.it-branch-item.is-alt{background:#fffbeb;border-color:#f7d08b;color:#92400e}.it-branch-item.is-empty{color:#94a3b8;font-weight:700}
.it-impact-card{border-radius:12px;padding:10px;display:grid;gap:5px;border:1px solid #e2e8f0;background:#fff}.it-impact-card strong{font-size:.8rem}.it-impact-card p{margin:0;line-height:1.45;color:#334155}.it-impact-card.tone-warn{background:#fff7ed;border-color:#fdba74}.it-impact-card.tone-positive{background:#effcf5;border-color:#86efac}.it-impact-card.tone-info{background:#eff6ff;border-color:#93c5fd}
.it-support-summary{position:sticky;top:12px}.it-support-list{display:grid;gap:8px}.it-support-item{border:1px solid #e2e8f0;border-radius:12px;background:#fff;padding:10px;display:grid;gap:4px}.it-support-item strong{font-size:.8rem;color:#244e85}.it-support-item span{color:#334155;line-height:1.45}
.it-onboarding-layer{position:fixed;inset:0;background:rgba(15,23,42,.48);backdrop-filter:blur(6px);display:grid;place-items:center;padding:18px;z-index:40}
.it-onboarding-card{width:min(980px,100%);max-height:min(92vh,980px);overflow:auto;border-radius:24px;border:1px solid #f1d18b;background:linear-gradient(180deg,#fffaf0,#fff);padding:20px;box-shadow:0 28px 70px rgba(15,23,42,.28);display:grid;gap:16px}
.it-onboarding-head h2{margin:4px 0 0;font-size:1.5rem;color:#0f172a}.it-onboarding-head p,.it-onboarding-copy p{margin:0;color:#4b5563;line-height:1.6}
.it-onboarding-grid,.it-schema-compare{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.it-schema-compare{grid-template-columns:repeat(2,minmax(0,1fr))}
.it-onboarding-note,.it-schema-card{border:1px solid #ecd9a4;border-radius:16px;background:#fff;padding:12px;display:grid;gap:6px}.it-onboarding-note strong,.it-schema-card strong{font-size:.88rem;color:#8a4b07}.it-onboarding-note p,.it-schema-card p{margin:0;color:#4b5563;line-height:1.5}
.it-schema-card.is-part{border-color:#d7e5fb}.it-schema-tree{display:grid;gap:8px}.it-schema-node,.it-schema-child{border:1px solid #e2e8f0;border-radius:999px;background:#f8fafc;padding:6px 10px;text-align:center;font-weight:800;color:#1f2937}.it-schema-node.root{background:#eff6ff;border-color:#bfdbfe;color:#1e3a8a}.it-schema-branches{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.it-schema-child{background:#fffbeb;border-color:#f7d08b;color:#92400e}
.it-onboarding-actions{display:flex;justify-content:flex-start}
@media (max-width:1180px){.it-template-grid-refined{grid-template-columns:1fr 1fr}.it-main-layout{grid-template-columns:1fr}.it-support-summary{position:static}.it-branch-grid,.it-coach-grid,.it-source-foot,.it-onboarding-grid,.it-schema-compare{grid-template-columns:1fr}}
@media (max-width:720px){.it-wrap-refined{padding:10px}.it-hero-panel{padding:12px}.it-textbox-prominent{padding:12px}.it-template-grid-refined{grid-template-columns:1fr}.it-start-strip,.it-onboarding-card{padding:14px}.it-onboarding-head h2{font-size:1.25rem}}
/* Restrained first-pass workspace cleanup */
.mtp-page,.mtp-nav{max-width:min(1520px,calc(100vw - 24px))}
.trp-page{width:100%;max-width:none;padding:0 0 28px}
.trp-shell{gap:16px;padding:16px 18px 20px;border-radius:28px;border-color:#e3ebf4;background:radial-gradient(circle at top right,rgba(245,158,11,.12),transparent 26%),radial-gradient(circle at left top,rgba(59,130,246,.08),transparent 32%),linear-gradient(180deg,#f7f9fc 0%,#fcfdff 100%);box-shadow:0 22px 52px rgba(15,23,42,.06)}
.trp-card,.trp-support-card,.trp-problem-card,.trp-note-card,.trp-clarity-card,.trp-start-strip{box-shadow:none}
.trp-card{padding:14px 16px;border-radius:20px;border-color:#e5edf6;background:rgba(255,255,255,.94)}
.trp-top{align-items:center;gap:10px}
.trp-title-wrap{gap:4px;max-width:880px}
.trp-kicker{font-size:.76rem;letter-spacing:.03em;color:#6280a3}
.trp-title{margin:0;font-size:1.32rem;line-height:1.25}
.trp-subtitle{font-size:.97rem;line-height:1.72;color:#5b6b7f}
.trp-actions,.trp-chip-row,.trp-start-actions{gap:10px}
.trp-btn{padding:10px 14px;border-radius:12px}
.trp-btn.is-primary{box-shadow:0 10px 20px rgba(19,88,211,.14)}
.trp-mode-pill,.trp-summary-pill{min-height:38px;padding:0 12px;font-size:.86rem}
.trp-hero{grid-template-columns:minmax(0,1.28fr) minmax(320px,.72fr);gap:16px}
.trp-purpose{gap:10px}
.trp-purpose-body,.trp-problem-body,.trp-note-card{font-size:1rem;line-height:1.78}
.trp-start-strip{padding:14px 16px;border-radius:20px;gap:10px}
.trp-clarity-strip{gap:12px}
.trp-clarity-card{padding:12px 14px;border-radius:16px;border-color:#e5edf6;background:rgba(255,255,255,.86)}
.trp-clarity-title{font-size:.98rem}
.trp-clarity-body{font-size:.9rem;color:#617285}
.trp-problem-card,.trp-note-card{padding:12px 14px;border-radius:16px;background:rgba(249,251,254,.9)}
.trp-problem-title{font-size:1rem}
.trp-step-strip{gap:12px}
.trp-step{padding:10px 12px;border-radius:14px;border:1px solid #e1e9f3;background:rgba(255,255,255,.66)}
.trp-step strong{font-size:.9rem}
.trp-step span{font-size:.85rem;line-height:1.55}
.trp-layout{grid-template-columns:minmax(0,1.72fr) minmax(290px,.6fr);gap:18px}
.trp-main{gap:16px}
.trp-support{gap:12px}
.trp-support-card{padding:12px 14px;border-radius:18px;border-color:#e7eef6;background:rgba(251,253,255,.94)}
.trp-support-card h3,.trp-support-card h4{font-size:.98rem}
.trp-support-card p{font-size:.88rem;color:#6a7788}
.trp-support-card>.it-panel{padding:0;border:0;border-radius:0;background:transparent;box-shadow:none}
.it-wrap{max-width:none;margin:0;border:0;border-radius:0;padding:0;background:none;box-shadow:none}
.it-wrap-refined{padding:0;background:none}
.it-panel{padding:16px 18px;border-radius:18px;border-color:#e5edf6;background:rgba(255,255,255,.96);box-shadow:none}
.it-title{font-size:1.26rem;line-height:1.3}
.it-sub{margin:8px 0 0;font-size:1rem;line-height:1.7;color:#536476}
.it-kicker{font-size:.74rem;font-weight:800;color:#7a8da6}
.it-kicker code{font-size:.73rem;background:#f6f8fb;border:1px solid #e3eaf2;border-radius:999px;padding:2px 8px;color:#5d6b7d}
.it-panel-head{gap:10px}
.it-panel-badge,.it-branch-badge{padding:4px 9px;border-radius:999px;background:#f4f8ff;border-color:#d9e6fb;color:#476b9c;font-size:.72rem}
.it-chip{display:inline-flex;align-items:center;min-height:32px;padding:6px 12px;border-color:#dbe6f2;background:#f8fafc;color:#42556d;font-size:.82rem;line-height:1.3}
.it-process-rail{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px}
.it-process-step{display:grid;gap:8px;padding:12px;border:1px solid #e3ebf5;border-radius:16px;background:rgba(255,255,255,.86)}
.it-process-step-top{display:flex;align-items:center;gap:8px}
.it-process-step-index{display:inline-grid;place-items:center;width:28px;height:28px;border-radius:999px;background:#eef2f8;color:#566579;font-size:.82rem;font-weight:900}
.it-process-step strong{font-size:.9rem;color:#10233f}
.it-process-step p{margin:0;color:#607287;font-size:.87rem;line-height:1.55}
.it-process-step.is-current{border-color:#bfd7ff;background:linear-gradient(180deg,#eff6ff 0%,#fff 100%)}
.it-process-step.is-current .it-process-step-index{background:#1d4ed8;color:#fff}
.it-process-step.is-done{border-color:#ccebd8;background:linear-gradient(180deg,#effcf5 0%,#fff 100%)}
.it-process-step.is-done .it-process-step-index{background:#16a34a;color:#fff}
.it-textbox{margin-top:10px;padding:14px 16px;border-radius:16px;border-color:#ebe0bf;background:linear-gradient(180deg,#fffefa 0%,#fffdf7 100%);min-height:108px;line-height:1.95;font-size:1rem}
.it-token{padding:4px 10px;font-size:.95rem}
.it-source-foot{margin-top:12px;gap:12px}
.it-help{margin-top:10px;font-size:.92rem;line-height:1.65;color:#67768a}
.it-selection-card{padding:13px 14px;border-radius:16px;border-color:#d8e6f8;background:linear-gradient(180deg,#fbfdff 0%,#f7fbff 100%)}
.it-selection-card strong{font-size:.78rem}
.it-selection-card span{font-size:1.04rem;line-height:1.45}
.it-selection-card small{font-size:.86rem;line-height:1.55}
.it-template-grid-refined{gap:10px}
.it-template-card{padding:14px;border-radius:16px;border-color:#e2e9f2;box-shadow:none}
.it-template-card:hover{border-color:#bfd7ff;background:#fbfdff}
.it-template-head{gap:10px}
.it-template-title{font-size:1rem;line-height:1.35}
.it-template-mini{font-size:.72rem;color:#8a97a8}
.it-template-help{margin-top:8px;font-size:.9rem;line-height:1.55;color:#465569}
.it-template-code{font-size:.68rem;padding:3px 8px;background:#344054}
.it-dropzone{margin-top:10px;padding:10px;border-radius:12px;background:#fcfdff}
.it-workspace-panel{border-color:#c9ddf4;background:linear-gradient(180deg,#ffffff 0%,#f8fbff 100%);box-shadow:0 10px 28px rgba(37,99,235,.06)}
.it-focus-toolbar{margin-top:10px;gap:10px;padding-block-end:2px}
.it-focus-mini-btn{padding:7px 12px;border-color:#d9e4ef;background:#f8fbff;color:#42556d;font-size:.82rem}
.it-focus-help{padding:10px 12px;border-radius:12px}
.it-empty{padding:18px;border-radius:16px;line-height:1.7}
.it-active{gap:12px}
.it-stage-switch{display:inline-flex;flex-wrap:wrap;gap:8px;margin-top:12px;padding:4px;border:1px solid #e1eaf3;background:#f8fbff;border-radius:16px;max-width:100%}
.it-stage-btn{padding:8px 12px;border-radius:999px;border:1px solid transparent;background:transparent;font-size:.84rem}
.it-stage-btn.is-active{border-color:#c8daf7;background:#fff;color:#1d4ed8;box-shadow:0 1px 2px rgba(15,23,42,.05)}
.it-stage-card{padding:16px;border-radius:18px;border-color:#dbe7f5;background:linear-gradient(180deg,#fff 0%,#fbfdff 100%)}
.it-question,.it-reflection,.it-disclaimer,.it-branch-note,.it-impact-card,.it-support-item,.it-board-card,.it-level-card,.it-hat-card,.it-rg-card,.it-tree-lab,.it-reveal-visual,.it-reveal-figure,.it-tree-board,.it-tree-level-slot,.it-tree-fan-slot,.it-branch-card{box-shadow:none}
.it-question,.it-reflection,.it-disclaimer{padding:12px;border-radius:12px;line-height:1.6;font-size:.95rem}
.it-disclaimer{font-size:.88rem}
.it-actions{margin-top:12px;gap:10px}
.it-btn{padding:10px 14px;border-radius:12px;border:1px solid transparent;line-height:1.2}
.it-btn.primary{background:#1d5ed8;box-shadow:0 10px 20px rgba(29,94,216,.14)}
.it-btn.secondary{background:#eef2f7;color:#10233f;border-color:#d8e1eb}
.it-btn.ghost{background:#fff;color:#23436f;border-color:#d8e1eb}
.it-feedback,.it-recap{padding:10px 12px;border-radius:12px;line-height:1.55}
.it-mini-tag{padding:3px 8px;border-color:#d8e1eb;background:#f8fafc;color:#516174;font-size:.73rem}
.it-mini-tag.code{background:#334155;border-color:#334155}
.it-board-card{padding:12px;border-radius:14px;border-color:#e5edf5}
.it-board-card h3{margin:0 0 8px;font-size:1rem}
.it-board-card p{font-size:.95rem;line-height:1.65}
.it-board-row{gap:12px}
.it-board-label{font-size:.8rem;color:#516174}
.it-board-value{padding:10px 12px;border-radius:12px;line-height:1.55}
.it-coach-grid{gap:12px}
.it-coach-card{padding:14px;border-radius:16px;border-color:#dbe7f3}
.it-coach-card strong{font-size:.88rem}
.it-coach-card p{line-height:1.6}
.it-branch-panel{padding:14px;border-radius:18px;border-color:#dbe7f5;background:linear-gradient(180deg,#fff 0%,#fbfdff 100%)}
.it-branch-head h3{font-size:1.06rem}
.it-branch-head p{line-height:1.6}
.it-branch-grid{gap:12px}
.it-branch-card h4{font-size:.95rem}
.it-support-summary{top:16px}
.it-support-list{gap:10px}
.it-support-item{padding:11px 12px;border-radius:14px;border-color:#e6edf5;background:#fff}
.it-support-item strong{font-size:.77rem;color:#60748c}
.it-support-item span{font-size:.95rem;line-height:1.55}
.it-scenario-list li{padding:8px 10px;border-color:#edf2f7}
.trp-page[data-trainer-id="iceberg-templates"] .trp-hero,
.trp-page[data-trainer-id="iceberg-templates"] .trp-problem-card,
.trp-page[data-trainer-id="iceberg-templates"] .trp-clarity-strip,
.trp-page[data-trainer-id="iceberg-templates"] .trp-note-card,
.trp-page[data-trainer-id="iceberg-templates"] .trp-step-strip{display:none}
.trp-page[data-trainer-id="iceberg-templates"] .trp-top{padding:10px 14px;border-radius:18px;min-height:0}
.trp-page[data-trainer-id="iceberg-templates"] .trp-title{font-size:1.02rem}
.trp-page[data-trainer-id="iceberg-templates"] .trp-subtitle{margin-top:4px;font-size:.84rem;line-height:1.45}
.trp-page[data-trainer-id="iceberg-templates"] .trp-actions{gap:8px}
.trp-page[data-trainer-id="iceberg-templates"] .trp-layout{grid-template-columns:minmax(0,1fr)}
.trp-page[data-trainer-id="iceberg-templates"] .trp-support{display:none}
.it-guided-stage{display:grid;gap:14px}
.it-guided-stage-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
.it-context-strip{padding:12px 14px;border:1px solid #dbe7f5;background:linear-gradient(180deg,#f8fbff 0%,#ffffff 100%);border-radius:16px;color:#23436f;font-weight:800}
.it-dialogue-panel{display:grid;gap:14px;padding:18px 20px;border:1px solid #e8eef6;border-radius:22px;background:linear-gradient(180deg,#ffffff 0%,#fbfdff 100%)}
.it-dialogue-label{font-size:.82rem;font-weight:900;color:#6b7c92}
.it-dialogue-quote{margin:0;font-size:1.3rem;line-height:1.85;font-weight:700;color:#0f172a}
.it-dialogue-anchors,.it-workspace-anchors{display:flex;flex-wrap:wrap;gap:10px}
.it-guided-anchor{min-height:40px;padding:8px 14px;border-style:solid;border-color:#ead7a5;background:#fffdf5;color:#8a5200}
.it-guided-selection-card{margin-top:0}
.it-guided-cta-stage{display:grid;justify-items:center;gap:10px;padding:4px 0 2px}
.it-guided-cta{display:inline-flex;align-items:center;justify-content:center;min-width:min(100%,340px);padding:16px 26px;border:0;border-radius:999px;background:linear-gradient(135deg,#1d4ed8 0%,#0f766e 100%);color:#fff;font-size:1.05rem;font-weight:900;cursor:pointer;box-shadow:0 16px 32px rgba(29,78,216,.18)}
.it-guided-cta:disabled{cursor:not-allowed;opacity:.55;box-shadow:none}
.it-guided-cta-note{margin:0;color:#607287;font-size:.92rem;line-height:1.6;text-align:center}
.it-selector-panel{border-color:#d8e6f8}
.it-selector-shell{display:grid;gap:16px;justify-items:center}
.it-selector-nav{display:flex;align-items:center;justify-content:center;gap:12px}
.it-selector-arrow{width:42px;height:42px;border-radius:999px;border:1px solid #d7e3f2;background:#fff;color:#23436f;font-size:1.1rem;font-weight:900;cursor:pointer}
.it-selector-count{min-width:140px;text-align:center;font-weight:800;color:#475569}
.it-selector-card{width:min(100%,560px);display:grid;gap:12px;padding:18px;border:1px solid #dbe7f4;border-radius:24px;background:linear-gradient(180deg,#ffffff 0%,#f9fbff 100%);justify-items:center;text-align:center}
.it-selector-card.is-chosen{border-color:#bfd7ff;box-shadow:0 16px 30px rgba(37,99,235,.08)}
.it-selector-sketch{width:min(100%,420px)}
.it-selector-title{margin:0;font-size:1.18rem;color:#10233f}
.it-selector-note{margin:0;color:#5e7289;line-height:1.65;max-width:44ch}
.it-selector-warning{padding:10px 12px;border-radius:14px;background:#fff7ed;border:1px solid #fed7aa;color:#9a3412;line-height:1.55}
.it-selector-select-btn{min-width:min(100%,280px)}
.it-guided-workspace-panel{border-color:#c9ddf4;background:linear-gradient(180deg,#ffffff 0%,#f8fbff 100%)}
.it-guided-focus-note{padding:12px 14px;border:1px solid #dbe7f4;border-radius:16px;background:#f8fbff;color:#315375;line-height:1.65}
.it-guided-focus-sketch{max-width:520px;margin:0 auto}
.it-guided-tree-drop{display:grid;gap:18px;padding:18px;border:1px dashed #bfd7ff;border-radius:24px;background:linear-gradient(180deg,#fbfdff 0%,#f6faff 100%)}
.it-guided-drop-node{display:grid;gap:8px;align-content:center;justify-items:center;min-height:110px;padding:16px;border:1px solid #dbe6f3;border-radius:18px;background:#fff;color:#10233f;cursor:pointer;text-align:center}
.it-guided-drop-node strong{font-size:1rem}
.it-guided-drop-node span{font-size:.88rem;line-height:1.55;color:#64748b}
.it-guided-drop-node.is-root{min-height:126px;border-color:#bfd7ff;background:linear-gradient(180deg,#ffffff 0%,#eef6ff 100%)}
.it-guided-drop-branches{display:grid;gap:12px}
.it-guided-drop-branches.cols-2{grid-template-columns:repeat(2,minmax(0,1fr))}
.it-guided-drop-branches.cols-3{grid-template-columns:repeat(3,minmax(0,1fr))}
.it-guided-result-stack{display:grid;gap:16px}
.it-guided-reveal-visual{padding:16px;border-radius:22px}
.it-guide-bubble{padding:14px 16px;border-radius:18px;background:linear-gradient(180deg,#eff6ff 0%,#ffffff 100%);border:1px solid #c7dcff;color:#1d4ed8;font-weight:900;line-height:1.6}
.it-guided-insight-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
.it-guided-insight-card{padding:16px;border-radius:18px;border:1px solid #dbe6f3;background:#fff;display:grid;gap:8px}
.it-guided-insight-card.is-secondary{background:#fbfdff}
.it-guided-insight-card strong{font-size:.84rem;color:#516174}
.it-guided-insight-card p{margin:0;line-height:1.7;color:#10233f}
.it-next-actions{display:flex;flex-wrap:wrap;gap:10px}
.it-guided-details{border:1px solid #dbe6f3;border-radius:18px;background:#fbfdff;padding:10px 14px}
.it-guided-details summary{cursor:pointer;font-weight:900;color:#23436f}
.it-guided-details-body{display:grid;gap:14px;margin-top:12px}
@media (min-width:1280px){.trp-layout{grid-template-columns:minmax(0,1.8fr) minmax(300px,.56fr)}.it-source-foot{grid-template-columns:minmax(0,1.3fr) minmax(280px,.7fr)}}
@media (max-width:1100px){.it-process-rail{grid-template-columns:1fr 1fr}.trp-layout{grid-template-columns:minmax(0,1.55fr) minmax(280px,.72fr)}}
@media (max-width:980px){.trp-page{width:100%;max-width:none}.it-panel{padding:14px 15px}.it-stage-switch{width:100%}.it-process-rail{grid-template-columns:1fr}.it-guided-insight-grid{grid-template-columns:1fr}.it-guided-drop-branches.cols-3{grid-template-columns:1fr}.it-dialogue-quote{font-size:1.14rem}}
@media (max-width:720px){.it-wrap-refined{padding:0}.it-stage-switch{display:grid;grid-template-columns:1fr;width:100%}.it-stage-btn{text-align:center}.trp-page[data-trainer-id="iceberg-templates"] .trp-top{padding:10px 12px}.it-guided-stage-head{display:grid}.it-dialogue-panel{padding:16px 14px}.it-guided-cta{width:100%}.it-selector-card{padding:16px}.it-guided-drop-branches.cols-2,.it-guided-drop-branches.cols-3{grid-template-columns:1fr}.it-next-actions{display:grid}.it-selector-count{min-width:0}}
`;

function assetUrl(path: string): string {
  const token = (window as Window & { __ICEBERG_TEMPLATES_ASSET_V__?: string }).__ICEBERG_TEMPLATES_ASSET_V__;
  if (!token) return path;
  const sep = path.includes('?') ? '&' : '?';
  return `${path}${sep}v=${encodeURIComponent(token)}`;
}

function safeString(v: unknown): string {
  return String(v ?? '');
}

function fillPlaceholders(template: string, values: string[]): string {
  let out = safeString(template);
  values.forEach((value, index) => {
    out = out.replace(new RegExp(`\\{${index}\\}`, 'g'), value);
  });
  return out;
}

function getSegments(text: string, draggables: DraggableCandidate[]) {
  const sorted = [...draggables].sort((a, b) => a.start - b.start);
  const parts: Array<{ kind: 'plain'; key: string; text: string } | { kind: 'token'; key: string; candidate: DraggableCandidate }> = [];
  let cursor = 0;
  sorted.forEach((candidate, idx) => {
    if (candidate.start > cursor) parts.push({ kind: 'plain', key: `p-${idx}-${cursor}`, text: text.slice(cursor, candidate.start) });
    parts.push({ kind: 'token', key: `t-${candidate.id}`, candidate });
    cursor = candidate.end;
  });
  if (cursor < text.length) parts.push({ kind: 'plain', key: `p-tail-${cursor}`, text: text.slice(cursor) });
  return parts;
}

function getTemplatePayload(scenario: Scenario, tokenId: string, templateType: TemplateType) {
  const byToken = scenario.template_payloads?.[tokenId];
  if (!byToken) return null;
  return (byToken[templateType] as TemplatePayloadBase | CauseTemplatePayload | undefined) ?? null;
}

function getCurrentSet(payload: TemplatePayloadBase | CauseTemplatePayload, setIndex: number): string[] {
  const sets = Array.isArray(payload?.sets) ? payload.sets : [];
  if (!sets.length) return [];
  const idx = ((setIndex % sets.length) + sets.length) % sets.length;
  return Array.isArray(sets[idx]) ? sets[idx] : [];
}

function buildVariantKey(scenarioId: string, tokenId: string, templateType: TemplateType): string {
  return `${scenarioId}|${tokenId}|${templateType}`;
}

function formatTemplateLabel(type: TemplateType): string {
  return TEMPLATE_META[type].titleHe;
}

function renderCauseDirectionLabel(payload: CauseTemplatePayload | TemplatePayloadBase): string | null {
  if (!('mode' in payload)) return null;
  if (payload.mode === 'CAUSES_OF_TOKEN') return 'כאן שואלים מה מזין את העוגן ומה מחזיק אותו';
  if (payload.mode === 'EFFECTS_OF_TOKEN') return 'כאן שואלים לאן העוגן הזה מתפצל ומה הוא עלול לייצר';
  return null;
}

function getTemplateSlotLabels(templateType: TemplateType, causeMode?: CauseMode | null): string[] {
  if (templateType === 'CEQ') return ['סימן', 'קריטריון', 'דוגמה'];
  if (templateType === 'CAUSE') return causeMode === 'EFFECTS_OF_TOKEN' ? ['אפקט 1', 'אפקט 2'] : ['תנאי 1', 'תנאי 2'];
  return ['הנחה 1', 'הנחה 2', 'הנחה 3'];
}

function boardGapText(templateType: TemplateType | null, tokenText: string | null): string {
  if (!templateType || !tokenText) return 'בחר/י מילה או ביטוי מודגש כדי לראות איזה סוג עץ יעזור לסדר את החשיבה.';
  if (templateType === 'CEQ') return `כאן בודקים לפי מה "${tokenText}" נכנס לקטגוריה, ומה הקריטריונים שמחזיקים את השם הכללי.`;
  return TEMPLATE_META[templateType].gapHint;
}

function boardFactPrompt(templateType: TemplateType | null, tokenText: string | null): string {
  if (!templateType || !tokenText) return 'מה נאמר בפועל, מה הוקפץ כאן, ואיזה מיון כדאי לעשות עכשיו?';
  return `${TEMPLATE_META[templateType].factPrompt} סביב "${tokenText}"`;
}

function buildChallengePrompts(templateType: TemplateType | null, tokenText: string | null): string[] {
  if (!templateType || !tokenText) return [];
  const prompts: Record<TemplateType, string[]> = {
    CEQ: [
      `אם מישהו אחר היה משתמש ב"${tokenText}", לפי איזה קריטריון אחר הוא היה ממיין את זה?`,
      `מה צריך לקרות בפועל כדי שזה כבר לא ייחשב "${tokenText}"?`,
      `האם כאן מדובר בקטגוריה, בדוגמה, או בקריטריון שמגדיר את הקטגוריה?`
    ],
    CAUSE: [
      `איזה גורם נוסף יכול להסביר את "${tokenText}" חוץ מהענף הראשון שעלה?`,
      `אם "${tokenText}" הוא רק תוצאה, מה עוד היה יכול להוביל אליה?`,
      `איזו תוצאה אחרת, אפילו חיובית או מפתיעה, יכולה לצמוח מאותו מצב סביב "${tokenText}"?`
    ],
    ASSUMPTIONS1: [
      `איזו הנחה מתוך מה שנפתח סביב "${tokenText}" באמת כדאי לבדוק ראשונה מול המציאות?`,
      `מה המשפט מניח כאן על אנשים, גבולות או אפשרויות בלי לומר זאת ישירות?`,
      `אם ההנחה הזו נופלת, איזה ענף אחר של פירוש נעשה פתאום אפשרי?`
    ]
  };
  return prompts[templateType];
}

function textWithoutToken(text: string, token: DraggableCandidate | null): string {
  if (!token) return text;
  return `${text.slice(0, token.start)}[ ... ]${text.slice(token.end)}`.replace(/\s+/g, ' ').trim();
}

function TemplateSketch(props: { meta: TemplateMeta; tokenText?: string; causeMode?: CauseMode | null; active?: boolean }) {
  const { meta, tokenText, causeMode, active } = props;
  const token = tokenText || 'טוקן';
  const stroke = active ? '#059669' : '#2563eb';
  const arrow = `M0 0 L8 4 L0 8 Z`;

  if (meta.type === 'CEQ') {
    return (
      <div className="it-sketch" aria-hidden="true">
        <svg viewBox="0 0 300 108" preserveAspectRatio="none">
          <rect className="s-box" x="95" y="8" width="110" height="22" rx="8" />
          <text x="150" y="23" textAnchor="middle">{token}</text>
          <line className="s-line" x1="150" y1="30" x2="150" y2="45" />
          <line className="s-line" x1="150" y1="45" x2="48" y2="58" />
          <line className="s-line" x1="150" y1="45" x2="150" y2="58" />
          <line className="s-line" x1="150" y1="45" x2="252" y2="58" />
          <path d={arrow} fill={stroke} transform="translate(45 56)" />
          <path d={arrow} fill={stroke} transform="translate(147 56)" />
          <path d={arrow} fill={stroke} transform="translate(249 56)" />
          <rect className="s-soft" x="12" y="60" width="72" height="22" rx="8" />
          <rect className="s-soft" x="114" y="60" width="72" height="22" rx="8" />
          <rect className="s-soft" x="216" y="60" width="72" height="22" rx="8" />
          <text x="48" y="75" textAnchor="middle">סימן</text>
          <text x="150" y="75" textAnchor="middle">קריטריון</text>
          <text x="252" y="75" textAnchor="middle">דוגמה</text>
        </svg>
      </div>
    );
  }

  if (meta.type === 'CAUSE') {
    const effectsMode = causeMode === 'EFFECTS_OF_TOKEN';
    return (
      <div className="it-sketch" aria-hidden="true">
        <svg viewBox="0 0 300 108" preserveAspectRatio="none">
          <rect className="s-box" x="103" y="42" width="94" height="24" rx="8" />
          <text x="150" y="58" textAnchor="middle">{token}</text>
          {effectsMode ? (
            <>
              <line className="s-line" x1="198" y1="54" x2="248" y2="38" />
              <line className="s-line" x1="198" y1="54" x2="248" y2="74" />
              <path d={arrow} fill={stroke} transform="translate(245 34)" />
              <path d={arrow} fill={stroke} transform="translate(245 70)" />
              <rect className="s-soft" x="230" y="22" width="58" height="20" rx="8" />
              <rect className="s-soft" x="230" y="66" width="58" height="20" rx="8" />
              <text x="259" y="36" textAnchor="middle">אפקט</text>
              <text x="259" y="80" textAnchor="middle">אפקט</text>
            </>
          ) : (
            <>
              <rect className="s-soft" x="12" y="22" width="58" height="20" rx="8" />
              <rect className="s-soft" x="12" y="66" width="58" height="20" rx="8" />
              <text x="41" y="36" textAnchor="middle">תנאי</text>
              <text x="41" y="80" textAnchor="middle">תנאי</text>
              <line className="s-line" x1="70" y1="32" x2="102" y2="50" />
              <line className="s-line" x1="70" y1="76" x2="102" y2="58" />
              <path d={arrow} fill={stroke} transform="translate(99 46)" />
              <path d={arrow} fill={stroke} transform="translate(99 54)" />
            </>
          )}
        </svg>
      </div>
    );
  }

  return (
    <div className="it-sketch" aria-hidden="true">
      <svg viewBox="0 0 300 108" preserveAspectRatio="none">
        <rect className="s-box" x="95" y="8" width="110" height="22" rx="8" />
        <text x="150" y="23" textAnchor="middle">{token}</text>
        <line className="s-line" x1="150" y1="30" x2="150" y2="42" />
        <rect className="s-soft" x="10" y="48" width="88" height="18" rx="8" />
        <rect className="s-soft" x="106" y="48" width="88" height="18" rx="8" />
        <rect className="s-soft" x="202" y="48" width="88" height="18" rx="8" />
        <line className="s-line" x1="150" y1="42" x2="54" y2="48" />
        <line className="s-line" x1="150" y1="42" x2="150" y2="48" />
        <line className="s-line" x1="150" y1="42" x2="246" y2="48" />
        <text x="54" y="61" textAnchor="middle">הנחה</text>
        <text x="150" y="61" textAnchor="middle">הנחה</text>
        <text x="246" y="61" textAnchor="middle">הנחה</text>
      </svg>
    </div>
  );
}

function ProcessRail(props: { current: WorkspaceStepId; steps: Array<{ id: string; label: string; help?: string; description?: string }> }) {
  const { current, steps } = props;
  const currentIndex = steps.findIndex((step) => step.id === current);

  return (
    <div className="it-process-rail" aria-label="מפת תהליך">
      {steps.map((step, index) => {
        const done = index < currentIndex;
        const isCurrent = index === currentIndex;
        return (
          <div key={step.id} className={`it-process-step${done ? ' is-done' : ''}${isCurrent ? ' is-current' : ''}`}>
            <div className="it-process-step-top">
              <span className="it-process-step-index">{index + 1}</span>
              <strong>{step.label}</strong>
            </div>
            <p>{step.help ?? step.description ?? ''}</p>
          </div>
        );
      })}
    </div>
  );
}

function SchemaComparisonMini(): React.ReactElement {
  return (
    <div className="it-schema-compare" aria-label="הבחנה בין סוגי עצים">
      <div className="it-schema-card">
        <strong>הכללה לוגית</strong>
        <p>קטגוריה רחבה שמצטמצמת כלפי מטה.</p>
        <div className="it-schema-tree">
          <div className="it-schema-node root">חיה</div>
          <div className="it-schema-branches">
            <div className="it-schema-node">כלב</div>
            <div className="it-schema-node">חתול</div>
          </div>
          <div className="it-schema-child">בורדר קולי</div>
        </div>
      </div>

      <div className="it-schema-card is-part">
        <strong>חלקים של שלם</strong>
        <p>אותו שלם, אבל עם רכיבים ולא עם תתי-קטגוריות.</p>
        <div className="it-schema-tree">
          <div className="it-schema-node root">אופניים</div>
          <div className="it-schema-branches">
            <div className="it-schema-node">גלגל</div>
            <div className="it-schema-node">שרשרת</div>
          </div>
          <div className="it-schema-child">כידון</div>
        </div>
      </div>
    </div>
  );
}

function PrototypeSketch(props: { schemaId: PrototypeSchemaId }) {
  const { schemaId } = props;

  if (schemaId === 'DEBONO_FAN') {
    return (
      <div className="it-sketch" aria-hidden="true">
        <svg viewBox="0 0 300 128" preserveAspectRatio="none">
          <circle className="s-box" cx="150" cy="18" r="12" />
          <text x="150" y="21" textAnchor="middle">עוגן</text>
          <line className="s-line" x1="150" y1="30" x2="150" y2="44" />
          <line className="s-line" x1="150" y1="44" x2="78" y2="44" />
          <line className="s-line" x1="150" y1="44" x2="222" y2="44" />
          <rect className="s-soft" x="46" y="44" width="64" height="18" rx="8" />
          <rect className="s-soft" x="190" y="44" width="64" height="18" rx="8" />
          <text x="78" y="56" textAnchor="middle">כיוון A</text>
          <text x="222" y="56" textAnchor="middle">כיוון B</text>
          <line className="s-line" x1="78" y1="62" x2="78" y2="82" />
          <line className="s-line" x1="222" y1="62" x2="222" y2="82" />
          <line className="s-line" x1="78" y1="82" x2="28" y2="82" />
          <line className="s-line" x1="78" y1="82" x2="128" y2="82" />
          <line className="s-line" x1="222" y1="82" x2="172" y2="82" />
          <line className="s-line" x1="222" y1="82" x2="272" y2="82" />
          {[28, 128, 172, 272].map((x) => <circle key={x} className="s-soft" cx={x} cy="98" r="12" />)}
          <text x="28" y="101" textAnchor="middle">1</text>
          <text x="128" y="101" textAnchor="middle">2</text>
          <text x="172" y="101" textAnchor="middle">3</text>
          <text x="272" y="101" textAnchor="middle">4</text>
        </svg>
      </div>
    );
  }

  if (schemaId === 'LOGICAL_LEVELS_STACK') {
    const rows = ['שייכות', 'זהות', 'אמונה/ערך', 'יכולת', 'התנהגות', 'סביבה'];
    return (
      <div className="it-sketch" aria-hidden="true">
        <svg viewBox="0 0 300 140" preserveAspectRatio="none">
          {rows.map((label, idx) => {
            const y = 8 + idx * 21;
            const w = 120 + (rows.length - idx - 1) * 20;
            const x = (300 - w) / 2;
            return (
              <g key={label}>
                <rect className={idx < 2 ? 's-box' : 's-soft'} x={x} y={y} width={w} height="16" rx="8" />
                <text x="150" y={y + 11} textAnchor="middle">{label}</text>
              </g>
            );
          })}
        </svg>
      </div>
    );
  }

  return (
    <div className="it-sketch" aria-hidden="true">
      <svg viewBox="0 0 300 124" preserveAspectRatio="none">
        <rect className="s-box" x="106" y="8" width="88" height="20" rx="8" />
        <text x="150" y="22" textAnchor="middle">משפט</text>
        <line className="s-line" x1="150" y1="28" x2="150" y2="42" />
        <rect className="s-soft" x="24" y="42" width="110" height="18" rx="8" />
        <rect className="s-soft" x="166" y="42" width="110" height="18" rx="8" />
        <text x="79" y="54" textAnchor="middle">טיפוס/רמה A</text>
        <text x="221" y="54" textAnchor="middle">טיפוס/רמה B</text>
        <line className="s-line" x1="79" y1="60" x2="79" y2="82" />
        <line className="s-line" x1="221" y1="60" x2="221" y2="82" />
        <rect className="s-soft" x="24" y="82" width="110" height="18" rx="8" />
        <rect className="s-soft" x="166" y="82" width="110" height="18" rx="8" />
        <text x="79" y="94" textAnchor="middle">נתון/פעולה</text>
        <text x="221" y="94" textAnchor="middle">מסקנה/זהות</text>
      </svg>
    </div>
  );
}

function cleanSnippet(text: string, max = 120): string {
  const trimmed = String(text || '').replace(/\s+/g, ' ').trim();
  if (!trimmed) return '';
  return trimmed.length > max ? `${trimmed.slice(0, max - 1)}…` : trimmed;
}

function deriveWorkspaceStep(args: {
  selectedTokenId: string | null;
  active: ActiveMapping | null;
  focusStage: 'build' | 'reveal' | 'challenge';
}): WorkspaceStepId {
  if (!args.selectedTokenId && !args.active) return 'read';
  if (args.selectedTokenId && !args.active) return 'choose';
  if (args.active && args.focusStage === 'build') return 'place';
  if (args.active && args.focusStage === 'reveal') return 'reveal';
  return 'branch';
}

function collectAlternativeItems(payload: TemplatePayloadBase | CauseTemplatePayload | null, activeSet: string[]): string[] {
  if (!payload) return [];
  const seen = new Set(activeSet.map((item) => String(item || '').trim()).filter(Boolean));
  const alternates: string[] = [];
  (payload.sets || []).forEach((set) => {
    (set || []).forEach((item) => {
      const text = String(item || '').trim();
      if (!text || seen.has(text) || alternates.includes(text)) return;
      alternates.push(text);
    });
  });
  return alternates.slice(0, 4);
}

function buildBranchModel(args: {
  templateType: TemplateType;
  tokenText: string;
  payload: TemplatePayloadBase | CauseTemplatePayload | null;
  activeSet: string[];
}): BranchModel {
  const tokenText = String(args.tokenText || '').trim() || 'העוגן';
  const primaryItems = args.activeSet.map((item) => String(item || '').trim()).filter(Boolean);
  const alternateItems = collectAlternativeItems(args.payload, primaryItems);

  if (args.templateType === 'CEQ') {
    return {
      primaryTitle: 'מה מכניס את זה לקטגוריה',
      primaryItems,
      alternateTitle: 'עוד קריטריונים או דוגמאות אפשריים',
      alternateItems: alternateItems.length
        ? alternateItems
        : [
            `ייתכן שיש עוד סימן קטן שמגדיר מה נחשב "${tokenText}" אצל הדובר/ת.`,
            `אפשר לבדוק אם יש דוגמה קונקרטית שמחזיקה את המילה "${tokenText}".`
          ],
      impactTitle: 'מה משתנה אם ממיינים אחרת',
      impactItems: [
        {
          label: 'אם ההגדרה צרה יותר',
          tone: 'info',
          text: `אז "${tokenText}" ידרוש יותר הוכחות לפני שנקבל אותו כמובן מאליו.`
        },
        {
          label: 'אם ההגדרה רחבה יותר',
          tone: 'positive',
          text: `יכול להיפתח מרחב להבין ש"${tokenText}" נראה אחרת במצבים שונים, ולא רק בצורה אחת.`
        },
        {
          label: 'אם הקריטריון מתחלף',
          tone: 'warn',
          text: `השיחה יכולה לעבור מוויכוח על המילה "${tokenText}" לבדיקה של קריטריון אחר לגמרי.`
        }
      ],
      structureKind: 'הירריית הכללה לוגית',
      distinctionText: 'כאן לא בודקים חלקים של שלם, אלא מה מצרף משהו לקבוצה רחבה יותר ומה מצמצם אותה.',
      explanationLead: `כאן בודקים לפי מה "${tokenText}" שייך לקטגוריה הזו, ואילו קריטריונים מחזיקים את השם הכללי.`
    };
  }

  if (args.templateType === 'CAUSE') {
    const payload = args.payload as CauseTemplatePayload | null;
    const effectsMode = payload?.mode === 'EFFECTS_OF_TOKEN';
    return {
      primaryTitle: effectsMode ? 'מה כבר מסתעף מן העוגן' : 'מה מזין או מאפשר את העוגן',
      primaryItems,
      alternateTitle: effectsMode ? 'עוד כיוונים שאליהם זה עלול להתפתח' : 'עוד הסברים, תנאים וגורמים חלופיים',
      alternateItems: alternateItems.length
        ? alternateItems
        : [
            `אולי יש גורם נוסף סביב "${tokenText}" שלא הופיע בגרסה הראשונה.`,
            `ייתכן שההקשר משנה את הכיוון הסיבתי, ולא רק הסיבה הראשונית.`
          ],
      impactTitle: 'לאן זה עוד יכול ללכת',
      impactItems: [
        {
          label: 'תוצאה מכבידה',
          tone: 'warn',
          text: `אם "${tokenText}" נשאר כשרשרת סיבתית אחת ויחידה, קל לפספס גורמים נוספים ולהחריף את הסיפור.`
        },
        {
          label: 'תוצאה בונה',
          tone: 'positive',
          text: `אם מזהים כמה גורמים או כמה תוצאות סביב "${tokenText}", אפשר לבחור איפה הכי כדאי להתערב קודם.`
        },
        {
          label: 'הפתעה אפשרית',
          tone: 'info',
          text: `לפעמים דווקא "${tokenText}" מגלה שמה שחשבנו שהוא הסיבה הוא רק ענף אחד, ומתחתיו מסתתר כיוון אחר.`
        }
      ],
      structureKind: 'עץ סיבות ותוצאות',
      distinctionText: 'כאן מחפשים הסתעפות: כמה גורמים אפשריים, השפעות הדדיות, וכמה תוצאות אפשריות. לא חץ אחד.',
      explanationLead: effectsMode
        ? `כאן בודקים לאן "${tokenText}" עלול להתפצל ולהשפיע, ולא רק מה קדם לו.`
        : `כאן בודקים מה תורם ל"${tokenText}", אילו תנאים מחזיקים אותו, ואילו כיוונים נוספים יכולים להסביר אותו.`
    };
  }

  return {
    primaryTitle: 'מה כבר מונח בתוך המשפט',
    primaryItems,
    alternateTitle: 'עוד הנחות שאפשר לבדוק',
    alternateItems: alternateItems.length
      ? alternateItems
      : [
          `אפשר לשאול איזו הנחה נוספת מחזיקה את "${tokenText}" גם אם לא נאמרה בקול.`,
          `אולי יש כאן הנחת יסוד על מה נחשב תקין, אפשרי או ראוי.`
        ],
    impactTitle: 'מה קורה אם בודקים את ההנחות',
    impactItems: [
      {
        label: 'אם ההנחה נכונה',
        tone: 'positive',
        text: `השיחה סביב "${tokenText}" נהיית מדויקת יותר, כי יודעים על מה בעצם נשען המשפט.`
      },
      {
        label: 'אם ההנחה חלקית בלבד',
        tone: 'info',
        text: `אפשר להחזיק את "${tokenText}" פחות כעובדה ויותר כהשערה שצריך לברר.`
      },
      {
        label: 'אם ההנחה לא מחזיקה',
        tone: 'warn',
        text: `המשמעות של "${tokenText}" יכולה להשתנות מהר, ולכן שווה לבדוק את היסוד לפני שמגיבים.`
      }
    ],
    structureKind: 'שכבת הנחות תומכת',
    distinctionText: 'כאן לא ממיינים חלקים וגם לא מחפשים סיבתיות ישירה, אלא את מה שהמשפט כבר מניח כדי להישמע הגיוני.',
    explanationLead: `כאן בודקים אילו הנחות שקטות מחזיקות את "${tokenText}" גם בלי שנאמרו במפורש.`
  };
}

function buildRelationalVoiceDraft(input: {
  roleId: RelationalVoiceRoleId;
  toneId: RelationalToneId;
  anchorText: string;
  contextText: string;
}): RelationalVoiceDraft {
  const role = RELATIONAL_ROLE_PRESETS[input.roleId];
  const tone = RELATIONAL_TONE_PRESETS[input.toneId];
  const anchor = String(input.anchorText || '').trim() || 'הנושא';
  const context = cleanSnippet(input.contextText, 110) || 'אין עדיין משפט מקור פעיל';

  const levels: LogicalLevelsDraft = {
    belonging: `בתוך ${role.closenessHe}, המטרה הרחבה היא לשמור על קשר ולגדול סביב "${anchor}" בלי לאבד כבוד הדדי.`,
    identity: `אני מדבר/ת כאן כמו ${role.labelHe}: ${role.stanceHe}, ומביא/ה טון ${tone.labelHe} כדי לעבוד עם "${anchor}".`,
    beliefsValues: `ערך מוביל: ${role.careFocusHe}. לכן חשוב לי ${tone.openingMoveHe} ולשמור על ${role.boundaryHe} סביב "${anchor}".`,
    capability: `יכולות נדרשות: הקשבה, ניסוח מחדש, ${tone.challengeVerbHe} בעדינות, ופירוק "${anchor}" לשאלה אחת או צעד קטן.`,
    behavior: `בפועל אדבר ${tone.adverbHe}, אתן משפט קצר על "${anchor}", אשאל שאלה אחת, ואז אציע פעולה הבאה.`,
    environment: `הקשר מומלץ: זמן קצר ושקט, פנים-אל-פנים או הודעה מדויקת, עם דוגמה מהמשפט: "${context}".`
  };

  const deBono: DebonoHatDraft = {
    white: `מה העובדות שנאמרו בפועל על "${anchor}"? מה מתוך המשפט הוא תיאור ומה פירוש? (קצה משפט: "${context}")`,
    red: `כשאני בתפקיד ${role.labelHe} ובטון ${tone.labelHe}, מה אני מרגיש/ה לגבי "${anchor}" לפני שאני מסביר/ה?`,
    black: `מה הסיכון אם אשתמש בטון ${tone.labelHe} בלי התאמה? (${tone.riskHe}) איפה זה עלול להסלים את "${anchor}"?`,
    yellow: `מה הרווח האפשרי אם אדבר כמו ${role.labelHe} בטון ${tone.labelHe}? (${tone.benefitHe}) מה זה יאפשר סביב "${anchor}"?`,
    green: `איזו חלופה יצירתית יש לאותו מסר על "${anchor}"? דימוי, דוגמה, משחק תפקידים, או ניסוח עדין יותר.`,
    blue: `ניהול שיחה: 1) עוגן "${anchor}" 2) עובדה 3) רגש/צורך 4) שאלה 5) צעד קטן. מה סדר הפעולות הנכון כאן?`
  };

  const rgChecks = {
    detectedType: `בדיקת טיפוסים: האם "${anchor}" מוצג כאן כנתון/התנהגות, או שכבר קפץ לזהות/מהות?`,
    lowerTypeQuestion: `הורדת רמה: מה רואים/שומעים בפועל סביב "${anchor}" בלי תוויות או פרשנות?`,
    upperTypeQuestion: `העלאת רמה: איזה כלל/ערך/זהות מפעילים את האמירה על "${anchor}" מתוך תפקיד ${role.labelHe}?`,
    splitPrompt: `פירוק מומלץ: נתון | פירוש | כוונה | זהות. כתוב/י משפט קצר לכל חלק לפני תגובה מלאה.`
  };

  return {
    anchor,
    roleId: input.roleId,
    toneId: input.toneId,
    voiceLine: `קול ${role.labelHe} בטון ${tone.labelHe}: ${tone.openingMoveHe}, ואז ${tone.challengeVerbHe} סביב "${anchor}" מתוך ${role.boundaryHe}.`,
    levels,
    deBono,
    rgChecks
  };
}

function LogicalLevelsRoleStudio(props: { anchorText: string; contextText: string }) {
  const { anchorText, contextText } = props;
  const [roleId, setRoleId] = useState<RelationalVoiceRoleId>('PARENT');
  const [toneId, setToneId] = useState<RelationalToneId>('SUPPORTIVE');
  const [anchor, setAnchor] = useState(String(anchorText || '').trim());
  const [draft, setDraft] = useState<RelationalVoiceDraft>(() =>
    buildRelationalVoiceDraft({ roleId: 'PARENT', toneId: 'SUPPORTIVE', anchorText: anchorText || '', contextText })
  );

  useEffect(() => {
    setAnchor(String(anchorText || '').trim());
  }, [anchorText]);

  useEffect(() => {
    setDraft(buildRelationalVoiceDraft({ roleId, toneId, anchorText: anchor, contextText }));
  }, [roleId, toneId, anchor, contextText]);

  const rolePreset = RELATIONAL_ROLE_PRESETS[roleId];
  const tonePreset = RELATIONAL_TONE_PRESETS[toneId];

  function regenerate() {
    setDraft(buildRelationalVoiceDraft({ roleId, toneId, anchorText: anchor, contextText }));
  }

  return (
    <section className="it-role-studio" aria-label="Relational logical levels studio">
      <div className="it-role-studio-head">
        <div>
          <h3 className="it-role-studio-title">סטודיו רמות לוגיות + דה בונו + Russell/Grinder (בטא)</h3>
          <p className="it-role-studio-sub">
            בחר/י תפקיד (למשל הורה/ילד/אח) וטון דיבור, והמערכת ממלאת טיוטת רמות לוגיות + שאלות עזר. אפשר לערוך ידנית.
          </p>
        </div>
        <div className="it-role-chip-row" aria-label="preset summary">
          <span className="it-role-chip">{rolePreset.labelHe}</span>
          <span className="it-role-chip">{tonePreset.labelHe}</span>
          <span className="it-role-chip">{rolePreset.boundaryHe}</span>
        </div>
      </div>

      <div className="it-role-form">
        <div className="it-field">
          <label htmlFor="it-role-role">תפקיד / פרספקטיבה</label>
          <select id="it-role-role" className="it-select" value={roleId} onChange={(e) => setRoleId(e.target.value as RelationalVoiceRoleId)}>
            {(Object.values(RELATIONAL_ROLE_PRESETS) as RelationalVoiceRolePreset[]).map((preset) => (
              <option key={preset.id} value={preset.id}>{preset.labelHe}</option>
            ))}
          </select>
        </div>

        <div className="it-field">
          <label htmlFor="it-role-tone">טון דיבור</label>
          <select id="it-role-tone" className="it-select" value={toneId} onChange={(e) => setToneId(e.target.value as RelationalToneId)}>
            {(Object.values(RELATIONAL_TONE_PRESETS) as RelationalTonePreset[]).map((preset) => (
              <option key={preset.id} value={preset.id}>{preset.labelHe}</option>
            ))}
          </select>
        </div>

        <div className="it-field">
          <label htmlFor="it-role-anchor">עוגן / טוקן</label>
          <input
            id="it-role-anchor"
            className="it-input"
            value={anchor}
            onChange={(e) => setAnchor(e.target.value)}
            placeholder="למשל: מנוחה, ביקורת, כסף"
          />
        </div>

        <div className="it-field">
          <label>פעולה</label>
          <div className="it-field-actions">
            <button type="button" className="it-btn secondary small" onClick={regenerate}>מלא מחדש</button>
            <button type="button" className="it-btn ghost small" onClick={() => setAnchor(String(anchorText || '').trim())}>משוך מהטוקן</button>
          </div>
        </div>
      </div>

      <div className="it-voice-line">{draft.voiceLine}</div>

      <div className="it-role-grid">
        <div className="it-levels-grid" aria-label="Logical levels">
          {LOGICAL_LEVEL_FIELDS.map((field) => (
            <div key={field.key} className="it-level-card">
              <div className="it-level-card-head">
                <strong>{field.labelHe}</strong>
                <span className="it-level-hint">{field.hintHe}</span>
              </div>
              <textarea
                className="it-textarea"
                value={draft.levels[field.key]}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    levels: { ...prev.levels, [field.key]: e.target.value }
                  }))
                }
                rows={3}
              />
            </div>
          ))}
        </div>

        <div className="it-side-stack">
          <div className="it-rg-card" aria-label="Russell Grinder logical types prompts">
            <h4>Russell / Grinder · בדיקת טיפוסים ורמות</h4>
            <div className="it-rg-line"><strong>זיהוי:</strong> {draft.rgChecks.detectedType}</div>
            <div className="it-rg-line"><strong>הורדת רמה:</strong> {draft.rgChecks.lowerTypeQuestion}</div>
            <div className="it-rg-line"><strong>העלאת רמה:</strong> {draft.rgChecks.upperTypeQuestion}</div>
            <div className="it-rg-line"><strong>פירוק:</strong> {draft.rgChecks.splitPrompt}</div>
          </div>

          <div className="it-rg-card" aria-label="De Bono hats prompts">
            <h4>דה בונו · מניפת חשיבה סביב אותו עוגן</h4>
            <div className="it-hat-list">
              {DEBONO_FIELDS.map((field) => (
                <div key={field.key} className="it-hat-card">
                  <div className="it-hat-head">
                    <strong>{field.labelHe}</strong>
                    <span className="it-mini-tag">{field.chip}</span>
                  </div>
                  <textarea
                    className="it-textarea"
                    value={draft.deBono[field.key]}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        deBono: { ...prev.deBono, [field.key]: e.target.value }
                      }))
                    }
                    rows={2}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function SentenceBoard(props: {
  scenario: Scenario;
  selectedToken: DraggableCandidate | null;
  activeTemplateType: TemplateType | null;
  activeQuestion: string;
  activeReflection: string;
}) {
  const { scenario, selectedToken, activeTemplateType, activeQuestion, activeReflection } = props;
  const tokenText = selectedToken?.text || null;

  return (
    <section className="it-panel" aria-label="Sentence board">
      <h2 className="it-title" style={{ fontSize: '1.05rem' }}>לוח משפטים / מפת בדיקה</h2>
      <p className="it-sub">מפרידים בין מילה, הקשר, פער לשוני ושאלת עומק (כמו לוח עבודה קלאסי, אבל מותאם לשלדי עומק).</p>

      <div className="it-board">
        <div className="it-board-grid">
          <div className="it-board-card">
            <h3>משפט מקור</h3>
            <p>{scenario.client_text}</p>
            <div className="it-board-tags">
              <span className="it-mini-tag">מועמדים: {scenario.draggables.length}</span>
              {selectedToken ? <span className="it-mini-tag code">{selectedToken.type === 'phrase' ? 'PHR' : 'WORD'}</span> : null}
              {activeTemplateType ? <span className="it-mini-tag code">{TEMPLATE_META[activeTemplateType].code}</span> : null}
            </div>
          </div>

          <div className="it-board-card">
            <h3>פער לשוני-לוגי</h3>
            <p>{boardGapText(activeTemplateType, tokenText)}</p>
            <p style={{ marginTop: 8 }}>{boardFactPrompt(activeTemplateType, tokenText)}</p>
          </div>
        </div>

        <div className="it-board-card">
          <div className="it-board-row">
            <div className="it-board-label">מילה/ביטוי</div>
            <div className="it-board-value emph">{tokenText || 'בחר/י מילה מודגשת'}</div>
          </div>
          <div className="it-board-row" style={{ marginTop: 8 }}>
            <div className="it-board-label">הקשר (בלי הטוקן)</div>
            <div className="it-board-value">{textWithoutToken(scenario.client_text, selectedToken)}</div>
          </div>
          <div className="it-board-row" style={{ marginTop: 8 }}>
            <div className="it-board-label">תבנית</div>
            <div className="it-board-value">{activeTemplateType ? formatTemplateLabel(activeTemplateType) : 'עדיין לא נבחרה תבנית'}</div>
          </div>
          <div className="it-board-row" style={{ marginTop: 8 }}>
            <div className="it-board-label">שאלת עומק</div>
            <div className="it-board-value warn">{activeQuestion || 'אחרי גרירה תקינה תופיע כאן השאלה האוטומטית'}</div>
          </div>
          <div className="it-board-row" style={{ marginTop: 8 }}>
            <div className="it-board-label">שיקוף מבנה</div>
            <div className="it-board-value">{activeReflection || 'כאן יופיע שיקוף קצר של מבנה עומק אפשרי (אילוסטרציה בלבד).'}</div>
          </div>
        </div>
      </div>
    </section>
  );
}

function BranchExplorer(props: {
  templateType: TemplateType;
  tokenText: string;
  payload: TemplatePayloadBase | CauseTemplatePayload | null;
  activeSet: string[];
}) {
  const branchModel = buildBranchModel(props);

  return (
    <section className="it-branch-panel" aria-label="עץ הבחנות והסתעפויות">
      <div className="it-branch-head">
        <div>
          <h3>כאן המבנה מתארגן לעץ</h3>
          <p>{branchModel.explanationLead}</p>
        </div>
        <span className="it-branch-badge">{branchModel.structureKind}</span>
      </div>

      <div className="it-branch-note">
        <strong>הבחנה חשובה:</strong> {branchModel.distinctionText}
      </div>

      <div className="it-branch-grid">
        <article className="it-branch-card">
          <h4>{branchModel.primaryTitle}</h4>
          <div className="it-branch-list">
            {branchModel.primaryItems.length ? branchModel.primaryItems.map((item) => (
              <div key={`primary-${item}`} className="it-branch-item">{item}</div>
            )) : <div className="it-branch-item is-empty">עוד לא נפתחו ענפים לשדה הזה.</div>}
          </div>
        </article>

        <article className="it-branch-card">
          <h4>{branchModel.alternateTitle}</h4>
          <div className="it-branch-list">
            {branchModel.alternateItems.map((item) => (
              <div key={`alt-${item}`} className="it-branch-item is-alt">{item}</div>
            ))}
          </div>
        </article>

        <article className="it-branch-card">
          <h4>{branchModel.impactTitle}</h4>
          <div className="it-branch-list">
            {branchModel.impactItems.map((item) => (
              <div key={`${item.label}-${item.text}`} className={`it-impact-card tone-${item.tone || 'neutral'}`}>
                <strong>{item.label}</strong>
                <p>{item.text}</p>
              </div>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}

function RevealTemplateFigure(props: {
  templateType: TemplateType;
  tokenText: string;
  slots: string[];
  causeMode?: CauseMode | null;
}) {
  const { templateType, tokenText, slots, causeMode } = props;
  const safeSlots = Array.from({ length: templateType === 'CAUSE' ? 2 : 3 }).map((_, idx) => slots[idx] || '');

  const renderNode = (label: string, value: string, key: string) => (
    <div key={key} className="it-reveal-node">
      <strong>{label}</strong>
      <span>{value || '—'}</span>
    </div>
  );

  if (templateType === 'CAUSE') {
    const labels = causeMode === 'EFFECTS_OF_TOKEN' ? ['אפקט 1', 'אפקט 2'] : ['תנאי 1', 'תנאי 2'];
    return (
      <div className="it-reveal-figure" aria-label="מפת שיקוף חזותית">
        <div className="it-reveal-cause-layout">
          <div className="it-reveal-cause-side">
            {labels.map((label, idx) => renderNode(label, safeSlots[idx], `cause-${idx}`))}
          </div>
          <div className="it-reveal-cause-arrow" aria-hidden="true">
            <div>
              <div>{causeMode === 'EFFECTS_OF_TOKEN' ? '⇠' : '⇢'}</div>
              <small>{causeMode === 'EFFECTS_OF_TOKEN' ? 'נובע מ' : 'מוביל ל'}</small>
            </div>
          </div>
          <div className="it-reveal-anchor">
            <div className="it-reveal-node anchor">
              <strong>עוגן</strong>
              <span>{tokenText}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const labels = templateType === 'CEQ' ? ['סימן', 'קריטריון', 'דוגמה'] : ['הנחה 1', 'הנחה 2', 'הנחה 3'];
  return (
    <div className="it-reveal-figure" aria-label="מפת שיקוף חזותית">
      <div className="it-reveal-anchor">
        <div className="it-reveal-node anchor">
          <strong>עוגן</strong>
          <span>{tokenText}</span>
        </div>
      </div>
      <div className="it-reveal-connector" aria-hidden="true" />
      <div className={`it-reveal-branches cols-${labels.length}`}>
        {labels.map((label, idx) => renderNode(label, safeSlots[idx], `slot-${idx}`))}
      </div>
    </div>
  );
}

function LogicalLevelsDebonoDragTree(props: {
  seedKey: string;
  anchorText: string;
  sourceChips: TreeChip[];
}) {
  const { seedKey, anchorText, sourceChips } = props;
  const [selectedChipId, setSelectedChipId] = useState<string | null>(null);
  const [hoverSlotId, setHoverSlotId] = useState<string | null>(null);
  const [levelSlots, setLevelSlots] = useState<Partial<Record<LogicalLevelKey, string>>>({});
  const [hatSlots, setHatSlots] = useState<Partial<Record<DebonoHatKey, string>>>({});

  useEffect(() => {
    setSelectedChipId(null);
    setHoverSlotId(null);
    setLevelSlots({});
    setHatSlots({});
  }, [seedKey]);

  const chipById = useMemo(() => {
    const out: Record<string, TreeChip> = {};
    sourceChips.forEach((chip) => {
      out[chip.id] = chip;
    });
    return out;
  }, [sourceChips]);

  function readDraggedChipId(event: React.DragEvent): string {
    try {
      return event.dataTransfer.getData('text/plain') || '';
    } catch {
      return '';
    }
  }

  function assignToLevel(levelKey: LogicalLevelKey, chipId: string) {
    const chip = chipById[chipId];
    if (!chip) return;
    setLevelSlots((prev) => ({ ...prev, [levelKey]: chip.text }));
    setSelectedChipId(null);
  }

  function assignToHat(hatKey: DebonoHatKey, chipId: string) {
    const chip = chipById[chipId];
    if (!chip) return;
    setHatSlots((prev) => ({ ...prev, [hatKey]: chip.text }));
    setSelectedChipId(null);
  }

  function onSlotClickLevel(levelKey: LogicalLevelKey) {
    if (!selectedChipId) return;
    assignToLevel(levelKey, selectedChipId);
  }

  function onSlotClickHat(hatKey: DebonoHatKey) {
    if (!selectedChipId) return;
    assignToHat(hatKey, selectedChipId);
  }

  const chips = sourceChips.filter((chip) => String(chip.text || '').trim());

  return (
    <section className="it-tree-lab" aria-label="מעבדת גרירה רמות לוגיות ודה בונו">
      <div className="it-tree-lab-head">
        <div>
          <h4>עץ גרירה · רמות לוגיות + דה בונו (בטא)</h4>
          <p>בחר/י צ׳יפ ואז הנח/י באחד המקומות בעץ/מניפה. זה מיועד לארגון חשיבה, לא לתשובה "נכונה".</p>
        </div>
        <span className="it-focus-badge">עוגן: {anchorText || '—'}</span>
      </div>

      <div className="it-tree-chip-bank" aria-label="צ׳יפים לגרירה">
        {chips.map((chip) => (
          <button
            key={chip.id}
            type="button"
            draggable
            className={`it-tree-chip${selectedChipId === chip.id ? ' sel' : ''}`}
            onDragStart={(e) => {
              try {
                e.dataTransfer.setData('text/plain', chip.id);
                e.dataTransfer.effectAllowed = 'copy';
              } catch {
                // ignore
              }
              setSelectedChipId(chip.id);
            }}
            onClick={() => setSelectedChipId((prev) => (prev === chip.id ? null : chip.id))}
            aria-pressed={selectedChipId === chip.id}
            title={chip.text}
          >
            <span className="it-tree-chip-label">{chip.label}</span>
            <span>{chip.text}</span>
          </button>
        ))}
      </div>

      <div className="it-tree-tap-hint">במובייל: הקש/י על צ׳יפ ואז הקש/י על מקום בעץ.</div>

      <div className="it-tree-lab-grid">
        <div className="it-tree-board" aria-label="רמות לוגיות">
          <h5>מגדל רמות לוגיות (דה־בונו סטייל גרירה)</h5>
          <div className="it-tree-levels">
            {LOGICAL_LEVEL_FIELDS.map((field) => {
              const slotId = `ll:${field.key}`;
              const value = levelSlots[field.key] || '';
              return (
                <div
                  key={field.key}
                  className="it-tree-level-slot"
                  data-over={hoverSlotId === slotId ? '1' : '0'}
                  onDragOver={(e) => { e.preventDefault(); setHoverSlotId(slotId); }}
                  onDragLeave={() => setHoverSlotId((prev) => (prev === slotId ? null : prev))}
                  onDrop={(e) => {
                    e.preventDefault();
                    setHoverSlotId(null);
                    const chipId = readDraggedChipId(e) || selectedChipId || '';
                    if (chipId) assignToLevel(field.key, chipId);
                  }}
                  onClick={() => onSlotClickLevel(field.key)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if ((e.key === 'Enter' || e.key === ' ') && selectedChipId) {
                      e.preventDefault();
                      assignToLevel(field.key, selectedChipId);
                    }
                  }}
                  aria-label={`שיבוץ לרמה ${field.labelHe}`}
                >
                  <div className="it-tree-level-head">
                    <strong>{field.labelHe}</strong>
                    <span>{field.hintHe}</span>
                  </div>
                  {value ? <div className="it-tree-slot-value">{value}</div> : <div className="it-tree-slot-empty">גרור/י לכאן</div>}
                  {value ? (
                    <button
                      type="button"
                      className="it-focus-mini-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setLevelSlots((prev) => ({ ...prev, [field.key]: '' }));
                      }}
                    >
                      נקה
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        <div className="it-tree-board" aria-label="דה בונו">
          <h5>מניפת דה בונו (6 כובעים)</h5>
          <div className="it-tree-fan">
            {DEBONO_FIELDS.map((field) => {
              const slotId = `db:${field.key}`;
              const value = hatSlots[field.key] || '';
              return (
                <div
                  key={field.key}
                  className="it-tree-fan-slot"
                  data-over={hoverSlotId === slotId ? '1' : '0'}
                  onDragOver={(e) => { e.preventDefault(); setHoverSlotId(slotId); }}
                  onDragLeave={() => setHoverSlotId((prev) => (prev === slotId ? null : prev))}
                  onDrop={(e) => {
                    e.preventDefault();
                    setHoverSlotId(null);
                    const chipId = readDraggedChipId(e) || selectedChipId || '';
                    if (chipId) assignToHat(field.key, chipId);
                  }}
                  onClick={() => onSlotClickHat(field.key)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if ((e.key === 'Enter' || e.key === ' ') && selectedChipId) {
                      e.preventDefault();
                      assignToHat(field.key, selectedChipId);
                    }
                  }}
                  aria-label={`שיבוץ לכובע ${field.labelHe}`}
                >
                  <div className="it-tree-fan-head">
                    <strong>{field.labelHe}</strong>
                    <span className="it-mini-tag">{field.chip}</span>
                  </div>
                  {value ? <div className="it-tree-slot-value">{value}</div> : <div className="it-tree-slot-empty">גרור/י לכאן</div>}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="it-tree-lab-actions">
        <button
          type="button"
          className="it-btn ghost"
          onClick={() => {
            setLevelSlots({});
            setHatSlots({});
            setSelectedChipId(null);
          }}
        >
          נקה עץ/מניפה
        </button>
      </div>
    </section>
  );
}

export default function IcebergTemplatesTrainer(): React.ReactElement {
  const trainerContract = getTrainerContract('iceberg-templates');
  const [data, setData] = useState<ScenarioFile | null>(null);
  const [loadingError, setLoadingError] = useState('');
  const [loading, setLoading] = useState(true);
  const [draggingTokenId, setDraggingTokenId] = useState<string | null>(null);
  const [hoverTemplate, setHoverTemplate] = useState<TemplateType | null>(null);
  const [shakeTemplate, setShakeTemplate] = useState<TemplateType | null>(null);
  const [focusStage, setFocusStage] = useState<'build' | 'reveal' | 'challenge'>('build');
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [selectorIndex, setSelectorIndex] = useState(0);
  const [selectedTemplateType, setSelectedTemplateType] = useState<TemplateType | null>(null);
  const [selectorTouchStartX, setSelectorTouchStartX] = useState<number | null>(null);
  const [settings, setSettings] = useState<IcebergSettings>(() => loadIcebergSettings());
  const [draftSettings, setDraftSettings] = useState<IcebergSettings>(() => loadIcebergSettings());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [showFocusGuide, setShowFocusGuide] = useState(settings.showFocusGuide);
  const [showFocusSketch, setShowFocusSketch] = useState(settings.showFocusSketch);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [state, setState] = useState<TrainerState>(INITIAL_STATE);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setLoadingError('');
      try {
        const res = await fetch(assetUrl('data/iceberg-templates-scenarios.he.json'), { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as ScenarioFile;
        if (!cancelled) {
          const savedSettings = loadIcebergSettings(json.scenarios.length);
          setData(json);
          setSettings(savedSettings);
          setDraftSettings(savedSettings);
          setShowFocusGuide(savedSettings.showFocusGuide);
          setShowFocusSketch(savedSettings.showFocusSketch);
          setShowOnboarding(false);
          setState({ ...INITIAL_STATE, currentScenarioIndex: normalizeScenarioIndex(savedSettings.defaultScenarioIndex, json.scenarios.length) });
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setLoading(false);
          setLoadingError(`טעינת נתוני קצה-קרחון נכשלה: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    saveIcebergSettings(settings);
  }, [settings]);

  useEffect(() => {
    if (!shakeTemplate) return;
    const t = window.setTimeout(() => setShakeTemplate(null), 320);
    return () => window.clearTimeout(t);
  }, [shakeTemplate]);

  useEffect(() => {
    if (!state.active?.templateType) return;
    const nextIndex = TEMPLATE_TYPES.indexOf(state.active.templateType);
    if (nextIndex >= 0) setSelectorIndex(nextIndex);
    setSelectedTemplateType(state.active.templateType);
    setSelectorOpen(true);
  }, [state.active?.templateType]);

  const scenarios = data?.scenarios ?? [];
  const scenarioCount = scenarios.length;
  const scenario = scenarios[state.currentScenarioIndex] ?? null;

  const activeToken = useMemo(() => {
    if (!scenario || !state.active) return null;
    return scenario.draggables.find((d) => d.id === state.active.tokenId) ?? null;
  }, [scenario, state.active]);

  const activePayload = useMemo(() => {
    if (!scenario || !state.active) return null;
    return getTemplatePayload(scenario, state.active.tokenId, state.active.templateType);
  }, [scenario, state.active]);

  const activeSet = useMemo(() => {
    if (!state.active || !activePayload) return [];
    return getCurrentSet(activePayload, state.active.setIndex);
  }, [activePayload, state.active]);

  const activeReflection = useMemo(() => {
    if (!activePayload) return '';
    return fillPlaceholders(activePayload.reflection_template, activeSet);
  }, [activePayload, activeSet]);

  const activeSlotCount = state.active ? TEMPLATE_META[state.active.templateType].slotCount : 0;
  const activeFilledSlots = useMemo(() => activeSet.filter((item) => String(item || '').trim()).length, [activeSet]);
  const revealReady = !!(state.active && activeToken && activePayload);
  const challengePrompts = useMemo(
    () => buildChallengePrompts(state.active?.templateType ?? null, activeToken?.text ?? null),
    [state.active?.templateType, activeToken?.text]
  );
  const challengeReady = revealReady && activeFilledSlots >= Math.min(2, Math.max(1, activeSlotCount || 0));

  useEffect(() => {
    setFocusStage((prev) => {
      if (!revealReady) return 'build';
      if (!challengeReady && prev === 'challenge') return 'reveal';
      return prev;
    });
  }, [revealReady, challengeReady]);

  const activeVariantKey = useMemo(() => {
    if (!scenario || !state.active) return '';
    return buildVariantKey(scenario.scenario_id, state.active.tokenId, state.active.templateType);
  }, [scenario, state.active]);

  const workspaceStep = useMemo(
    () => deriveWorkspaceStep({ selectedTokenId: state.selectedTokenId, active: state.active, focusStage }),
    [focusStage, state.active, state.selectedTokenId]
  );

  function setFeedback(feedback: Feedback | null) {
    setState((prev) => ({ ...prev, feedback }));
  }

  function failTemplate(templateType: TemplateType, text: string) {
    setShakeTemplate(templateType);
    setFeedback({ tone: 'error', text });
  }

  function applyTokenToTemplate(tokenId: string, templateType: TemplateType) {
    if (!scenario) return;
    const token = scenario.draggables.find((d) => d.id === tokenId);
    if (!token) return failTemplate(templateType, 'הטוקן שנבחר לא נמצא בתרחיש.');
    if (!token.allowed_templates.includes(templateType)) return failTemplate(templateType, 'לא מתאים לתבנית הזו בסבב הזה.');
    const payload = getTemplatePayload(scenario, tokenId, templateType);
    if (!payload) {
      console.error('[IcebergTemplates] Missing payload', { scenarioId: scenario.scenario_id, tokenId, templateType });
      return failTemplate(templateType, 'תוכן חסר בקובץ התרגיל.');
    }
    setShowOnboarding(false);
    setFocusStage(settings.autoRevealAfterPlacement ? 'reveal' : 'build');
    setState((prev) => {
      const sameActive = prev.active?.tokenId === tokenId && prev.active?.templateType === templateType;
      return {
        ...prev,
        active: { tokenId, templateType, setIndex: 0 },
        selectedTokenId: tokenId,
        completedAtLeastOneDrop: true,
        scoreDrops: sameActive ? prev.scoreDrops : prev.scoreDrops + 1,
        feedback: {
          tone: 'success',
          text: settings.autoRevealAfterPlacement
            ? `העוגן "${token.text}" שובץ על ${formatTemplateLabel(templateType)} והעץ כבר פתוח. עכשיו אפשר לבדוק איך ההסתעפות מסדרת את מה שנאמר.`
            : `העוגן "${token.text}" שובץ על ${formatTemplateLabel(templateType)}. עכשיו אפשר לראות איך העץ נפתח ולמה הוא מסודר כך.`
        }
      };
    });
  }

  function cycleVariant() {
    if (!scenario || !state.active || !activePayload) return;
    const sets = Array.isArray(activePayload.sets) ? activePayload.sets : [];
    if (sets.length < 2) return setFeedback({ tone: 'info', text: 'יש כרגע רק סט אילוסטרציה אחד לתבנית הזו.' });
    setState((prev) => {
      if (!prev.active) return prev;
      const nextIndex = (prev.active.setIndex + 1) % sets.length;
      const alreadyAwarded = !!prev.variantBonusAwardedKeys[activeVariantKey];
      return {
        ...prev,
        active: { ...prev.active, setIndex: nextIndex },
        scoreVariants: alreadyAwarded ? prev.scoreVariants : prev.scoreVariants + 1,
        variantBonusAwardedKeys: alreadyAwarded ? prev.variantBonusAwardedKeys : { ...prev.variantBonusAwardedKeys, [activeVariantKey]: true },
        feedback: { tone: 'info', text: 'הוצגה וריאציה של "מטופל אחר" כדי להמחיש שזה לא מוחלט.' }
      };
    });
  }

  function clearActive() {
    setFocusStage('build');
    setState((prev) => ({
      ...prev,
      active: null,
      feedback: { tone: 'info', text: 'האזור הפעיל אופס. אפשר לבחור שוב עוגן ולהחליט מחדש איזה מבנה מתאים לו.' }
    }));
  }

  function nextScenario() {
    if (!scenario) return;
    const recap =
      state.completedAtLeastOneDrop && state.active && activeToken
        ? `נחשף מבנה עבור "${activeToken.text}" בתבנית "${formatTemplateLabel(state.active.templateType)}". ${OUTRO_COPY}`
        : '';

    setState((prev) => ({
      ...prev,
      currentScenarioIndex: scenarioCount ? (prev.currentScenarioIndex + 1) % scenarioCount : 0,
      selectedTokenId: null,
      active: null,
      completedAtLeastOneDrop: false,
      feedback: { tone: 'info', text: 'עברנו לתרחיש הבא. קרא/י את המשפט, בחר/י עוגן אחד, ואז בחרי מבנה שיסדר אותו.' },
      lastCompletedRecap: recap
    }));
    setHoverTemplate(null);
    setDraggingTokenId(null);
    setFocusStage('build');
    setSelectorOpen(false);
    setSelectedTemplateType(null);
    setSelectorIndex(0);
  }

  function onDragStart(event: React.DragEvent<HTMLButtonElement>, tokenId: string) {
    try {
      event.dataTransfer.setData('text/plain', tokenId);
      event.dataTransfer.effectAllowed = 'copyMove';
    } catch {
      // no-op
    }
    setDraggingTokenId(tokenId);
    setState((prev) => ({ ...prev, selectedTokenId: tokenId }));
  }

  function onDragEnd() {
    setDraggingTokenId(null);
    setHoverTemplate(null);
  }

  function onTokenTap(tokenId: string) {
    if (state.active?.tokenId && state.active.tokenId !== tokenId) setFocusStage('build');
    setState((prev) => {
      const same = prev.selectedTokenId === tokenId;
      const changedFromActive = !!prev.active && prev.active.tokenId !== tokenId;
      return {
        ...prev,
        selectedTokenId: same ? null : tokenId,
        active: changedFromActive ? null : prev.active,
        feedback: {
          tone: 'info',
          text: same
            ? 'בוטל סימון העוגן.'
            : changedFromActive
              ? 'נבחר עוגן חדש. העץ הקודם הוסר כדי שתוכל/י לבדוק עכשיו את אותה צורת חשיבה על העוגן החדש.'
              : 'העוגן נבחר. עכשיו בחר/י איזה מבנה יעזור למיין אותו.'
        }
      };
    });
  }

  function handleTemplateDrop(event: React.DragEvent<HTMLDivElement>, templateType: TemplateType) {
    event.preventDefault();
    setHoverTemplate(null);
    let tokenId = '';
    try {
      tokenId = event.dataTransfer.getData('text/plain');
    } catch {
      tokenId = '';
    }
    if (!tokenId) tokenId = draggingTokenId || state.selectedTokenId || '';
    if (tokenId) applyTokenToTemplate(tokenId, templateType);
  }

  function handleTemplateClick(templateType: TemplateType) {
    if (!state.selectedTokenId) {
      setFeedback({ tone: 'info', text: 'במובייל: קודם בחר/י מילה מודגשת, ואז הקש/י על תבנית.' });
      return;
    }
    applyTokenToTemplate(state.selectedTokenId, templateType);
  }

  function moveSelector(offset: number) {
    setSelectorIndex((prev) => {
      const next = (prev + offset + TEMPLATE_TYPES.length) % TEMPLATE_TYPES.length;
      return next;
    });
  }

  function openTreeSelector() {
    if (!selectedToken) {
      setFeedback({ tone: 'info', text: 'בחר/י קודם עוגן אחד מתוך המשפט, ואז אפשר לעבור לבחירת ההיגיון החזותי.' });
      return;
    }
    const preferredType = selectedTemplateType || selectedToken.allowed_templates[0] || selectorTemplateType;
    const preferredIndex = TEMPLATE_TYPES.indexOf(preferredType);
    if (preferredIndex >= 0) setSelectorIndex(preferredIndex);
    setSelectorOpen(true);
    setFeedback({ tone: 'info', text: 'נפתח בוחר ההיגיונות. עוברים על עץ אחד בכל פעם ובוחרים את זה שמסדר הכי טוב את מה שנאמר.' });
  }

  function chooseTemplate(templateType: TemplateType) {
    if (!selectedToken) {
      setFeedback({ tone: 'info', text: 'כדי לבחור היגיון צריך קודם לבחור עוגן אחד לעבוד עליו.' });
      return;
    }
    if (!selectedToken.allowed_templates.includes(templateType)) {
      setFeedback({ tone: 'error', text: `העוגן "${selectedToken.text}" לא יושב בתרחיש הזה על ${formatTemplateLabel(templateType)}.` });
      return;
    }
    setSelectedTemplateType(templateType);
    setFocusStage('build');
    setFeedback({ tone: 'success', text: `נבחר "${formatTemplateLabel(templateType)}". עכשיו גרור/י את "${selectedToken.text}" אל העץ כדי לראות מה נפתח.` });
  }

  function applyTokenToSelectedTemplate(tokenId: string, templateType: TemplateType) {
    setSelectedTemplateType(templateType);
    applyTokenToTemplate(tokenId, templateType);
    setFocusStage('reveal');
  }

  function handleWorkspaceTreeDrop(event: React.DragEvent<HTMLButtonElement | HTMLDivElement>, templateType: TemplateType) {
    event.preventDefault();
    let tokenId = '';
    try {
      tokenId = event.dataTransfer.getData('text/plain');
    } catch {
      tokenId = '';
    }
    if (!tokenId) tokenId = draggingTokenId || state.selectedTokenId || '';
    if (!tokenId) {
      setFeedback({ tone: 'info', text: 'בחר/י או גרור/י עוגן אחד כדי למקם אותו בתוך העץ.' });
      return;
    }
    applyTokenToSelectedTemplate(tokenId, templateType);
  }

  function handleWorkspaceTreeClick(templateType: TemplateType) {
    if (!state.selectedTokenId) {
      setFeedback({ tone: 'info', text: 'במובייל: הקש/י קודם על אחד העוגנים, ואז הקש/י על המקום הרצוי בעץ.' });
      return;
    }
    applyTokenToSelectedTemplate(state.selectedTokenId, templateType);
  }

  function chooseAnotherTree() {
    clearActive();
    setSelectedTemplateType(null);
    setSelectorOpen(true);
  }

  function startIcebergSession(nextSettings?: IcebergSettings) {
    const resolved = normalizeIcebergSettings(nextSettings ?? settings, scenarioCount);
    const nextScenarioIndex = normalizeScenarioIndex(resolved.defaultScenarioIndex, scenarioCount);
    setSettings(resolved);
    setDraftSettings(resolved);
    setSettingsOpen(false);
    setAdvancedOpen(false);
    setHoverTemplate(null);
    setDraggingTokenId(null);
    setShowFocusGuide(resolved.showFocusGuide);
    setShowFocusSketch(resolved.showFocusSketch);
    setShowOnboarding(false);
    setFocusStage('build');
    setSelectorOpen(false);
    setSelectedTemplateType(null);
    setSelectorIndex(0);
    setState({
      ...INITIAL_STATE,
      currentScenarioIndex: nextScenarioIndex,
      feedback: {
        tone: 'info',
        text:
          resolved.launchMode === 'guided'
            ? 'הפתיחה המודרכת מוכנה. קרא/י את המשפט, בחר/י עוגן אחד, ואז תני לעץ להיפתח בקצב מסודר.'
            : 'הסשן מוכן לעבודה ישירה. קרא/י את המשפט, בחר/י עוגן אחד, והתאימי לו את המבנה המדויק ביותר.'
      }
    });
  }

  function openSettings() {
    const snapshot = normalizeIcebergSettings(
      {
        ...settings,
        defaultScenarioIndex: state.currentScenarioIndex,
        showFocusGuide,
        showFocusSketch
      },
      scenarioCount
    );
    setDraftSettings(snapshot);
    setSettingsOpen(true);
    setAdvancedOpen(false);
  }

  function applyDraftSettings(startNow = false) {
    const resolved = normalizeIcebergSettings(draftSettings, scenarioCount);
    setSettings(resolved);
    setDraftSettings(resolved);
    setShowFocusGuide(resolved.showFocusGuide);
    setShowFocusSketch(resolved.showFocusSketch);
    if (startNow) {
      startIcebergSession(resolved);
      return;
    }
    setSettingsOpen(false);
    setFeedback({
      tone: 'success',
      text: 'ההגדרות נשמרו. הסיכום בראש העמוד עודכן מיד, ואת/ה יכול/ה להמשיך או לפתוח סשן חדש עם ההעדפות האלה.'
    });
  }

  function resetDraftSettings() {
    setDraftSettings(normalizeIcebergSettings(DEFAULT_ICEBERG_SETTINGS, scenarioCount));
  }

  function toggleFocusGuidePreference() {
    setShowFocusGuide((prev) => {
      const next = !prev;
      setSettings((current) => ({ ...current, showFocusGuide: next }));
      setDraftSettings((current) => ({ ...current, showFocusGuide: next }));
      return next;
    });
  }

  function toggleFocusSketchPreference() {
    setShowFocusSketch((prev) => {
      const next = !prev;
      setSettings((current) => ({ ...current, showFocusSketch: next }));
      setDraftSettings((current) => ({ ...current, showFocusSketch: next }));
      return next;
    });
  }

  if (loading) {
    return (
      <div className="it-wrap" dir="rtl" lang="he">
        <style>{css}</style>
        <div className="it-panel">
          <h1 className="it-title">קצה קרחון / שלדי עומק</h1>
          <p className="it-sub">טוען תרחישים, תבניות ואיורים…</p>
        </div>
      </div>
    );
  }

  if (loadingError || !scenario) {
    return (
      <div className="it-wrap" dir="rtl" lang="he">
        <style>{css}</style>
        <div className="it-panel">
          <h1 className="it-title">קצה קרחון / שלדי עומק</h1>
          <div className="it-feedback error">{loadingError || 'לא נמצאו תרחישים.'}</div>
        </div>
      </div>
    );
  }

  const selectedToken =
    (scenario.draggables.find((d) => d.id === state.selectedTokenId) ?? null) ||
    activeToken ||
    null;
  const selectorTemplateType = TEMPLATE_TYPES[selectorIndex] ?? TEMPLATE_TYPES[0];
  const selectorMeta = TEMPLATE_META[selectorTemplateType];
  const selectorPayload = selectedToken ? getTemplatePayload(scenario, selectedToken.id, selectorTemplateType) : null;
  const selectorCauseMode = selectorPayload && 'mode' in selectorPayload ? selectorPayload.mode ?? null : null;
  const selectorAllowsToken = !selectedToken || selectedToken.allowed_templates.includes(selectorTemplateType);
  const workspaceTemplateType = selectedTemplateType;
  const workspaceMeta = workspaceTemplateType ? TEMPLATE_META[workspaceTemplateType] : null;
  const workspacePreviewPayload = selectedToken && workspaceTemplateType ? getTemplatePayload(scenario, selectedToken.id, workspaceTemplateType) : null;
  const workspacePreviewCauseMode =
    workspacePreviewPayload && 'mode' in workspacePreviewPayload ? workspacePreviewPayload.mode ?? null : null;
  const workspaceSlotLabels = workspaceTemplateType ? getTemplateSlotLabels(workspaceTemplateType, workspacePreviewCauseMode) : [];
  const activeMatchesWorkspace = !!(revealReady && state.active?.templateType === workspaceTemplateType && activeToken);

  const activeDirectionLabel = activePayload ? renderCauseDirectionLabel(activePayload) : null;
  const selectedTokenLabel = selectedToken?.text ?? activeToken?.text ?? '';
  const selectedTokenTemplateLabels = selectedToken
    ? selectedToken.allowed_templates.map((type) => TEMPLATE_META[type].titleHe).join(' · ')
    : '';
  const processSteps = trainerContract.processSteps?.length
    ? trainerContract.processSteps.map((step) => ({
        id: step.id as WorkspaceStepId,
        label: step.label,
        help: step.description,
        shortLabel: step.shortLabel
      }))
    : PROCESS_STEPS;
  const currentProcessMeta = processSteps.find((step) => step.id === workspaceStep) ?? processSteps[0];
  const launchModeLabel = settings.launchMode === 'guided' ? 'פתיחה מודרכת' : 'כניסה ישירה';
  const draftLaunchModeLabel = draftSettings.launchMode === 'guided' ? 'פתיחה מודרכת' : 'כניסה ישירה';
  const activeAidsLabel = [settings.showFocusGuide ? 'מפת עבודה' : null, settings.showFocusSketch ? 'סכמת מבנה' : null]
    .filter(Boolean)
    .join(' + ') || 'בלי עזרי עבודה';
  const draftAidsLabel = [draftSettings.showFocusGuide ? 'מפת עבודה' : null, draftSettings.showFocusSketch ? 'סכמת מבנה' : null]
    .filter(Boolean)
    .join(' + ') || 'בלי עזרי עבודה';
  const currentScenarioIndexLabel = normalizeScenarioIndex(settings.defaultScenarioIndex, scenarioCount) + 1;
  const draftScenarioIndexLabel = normalizeScenarioIndex(draftSettings.defaultScenarioIndex, scenarioCount) + 1;
  const currentSessionSummary = `תרחיש ${currentScenarioIndexLabel} · ${launchModeLabel} · ${activeAidsLabel}`;
  const previewSummary = `תרחיש ${draftScenarioIndexLabel} · ${draftLaunchModeLabel} · ${draftAidsLabel}`;
  const previewScenario = scenarios[normalizeScenarioIndex(draftSettings.defaultScenarioIndex, scenarioCount)] ?? scenario;
  const liveScenario = scenarios[normalizeScenarioIndex(settings.defaultScenarioIndex, scenarioCount)] ?? scenario;
  const helperSteps = trainerContract.helperSteps?.length ? [...trainerContract.helperSteps] : processSteps.slice(0, 3).map((step) => ({
    title: step.label,
    description: step.help
  }));
  const clarityCards = [
    {
      kicker: 'מה קורה בפועל',
      title: 'קוראים משפט, בוחרים עוגן אחד, ובונים ממנו עץ',
      body: <p>העבודה כאן מתחילה ממשפט אמיתי. לא גוררים סתם טוקנים, אלא בודקים איזה מבנה מחשבתי יושב מתחת למילה או לצירוף שבחרת.</p>
    },
    {
      kicker: 'למה לשים לב',
      title: 'לאיזה ענף המילה פותחת את השיחה',
      body: <p>הצלחת התרגיל נראית כשברור מהו המבנה, איזה עוגן מחזיק אותו, ומה עוד אפשר לבדוק במקום להינעל על פירוש אחד.</p>
    },
    {
      kicker: 'מה מרוויחים',
      title: 'מעבר מפרשנות אחת למפת אפשרויות',
      body: <p>בסוף הסשן לא נשארים עם "נראה לי שזה זה", אלא עם עץ שמראה חלופות, שאלות המשך, וכיוון ברור יותר לשיחה אמיתית.</p>
    }
  ];
  const settingsSectionMap: Record<string, TrainerSettingsSection> = {
    scenario: {
      id: 'scenario',
      title: 'מה לתרגל',
      help: 'בוחרים מאיזה משפט לפתוח את הסשן הבא. אפשר להתחיל גם בלי לגעת בזה.',
      content: (
        <div className="it-field">
          <label htmlFor="iceberg-default-scenario">משפט פתיחה לסשן</label>
          <select
            id="iceberg-default-scenario"
            className="it-select"
            value={String(draftSettings.defaultScenarioIndex)}
            onChange={(event) =>
              setDraftSettings((prev) => ({
                ...prev,
                defaultScenarioIndex: normalizeScenarioIndex(Number(event.target.value), scenarioCount)
              }))
            }
          >
            {scenarios.map((item, index) => (
              <option key={item.scenario_id} value={index}>
                {index + 1}. {cleanSnippet(item.client_text, 72)}
              </option>
            ))}
          </select>
        </div>
      )
    },
    'entry-mode': {
      id: 'entry-mode',
      title: 'איך להיכנס לאימון',
      help: 'האם לפתוח קודם overlay קצר שמכניס אותך לעץ, או להיכנס ישר למרחב העבודה.',
      content: (
        <div className="it-field-actions">
          <button
            type="button"
            className={`trp-btn ${draftSettings.launchMode === 'guided' ? 'is-primary' : 'is-secondary'}`}
            onClick={() => setDraftSettings((prev) => ({ ...prev, launchMode: 'guided' }))}
          >
            פתיחה מודרכת
          </button>
          <button
            type="button"
            className={`trp-btn ${draftSettings.launchMode === 'direct' ? 'is-primary' : 'is-secondary'}`}
            onClick={() => setDraftSettings((prev) => ({ ...prev, launchMode: 'direct' }))}
          >
            כניסה ישר לעבודה
          </button>
        </div>
      )
    },
    'workspace-aids': {
      id: 'workspace-aids',
      title: 'תמיכות עבודה',
      help: 'מגדירים אילו שכבות עזר יופיעו כברירת מחדל בתוך הסשן.',
      content: (
        <div className="it-settings-toggle-list">
          <label className="it-settings-toggle">
            <input
              type="checkbox"
              checked={draftSettings.showFocusGuide}
              onChange={(event) => setDraftSettings((prev) => ({ ...prev, showFocusGuide: event.target.checked }))}
            />
            <span>
              <strong>מפת עבודה</strong>
              <span>פותחת ניסוח קצר של מה עושים עכשיו, לפני שניגשים לענפים עצמם.</span>
            </span>
          </label>
          <label className="it-settings-toggle">
            <input
              type="checkbox"
              checked={draftSettings.showFocusSketch}
              onChange={(event) => setDraftSettings((prev) => ({ ...prev, showFocusSketch: event.target.checked }))}
            />
            <span>
              <strong>סכמת מבנה</strong>
              <span>משאירה לידך ציור קטן של התבנית הפעילה כדי לשמור על אוריינטציה.</span>
            </span>
          </label>
        </div>
      )
    },
    advanced: {
      id: 'advanced',
      title: 'הפעלה מתקדמת',
      help: 'למי שרוצה פחות חיכוך בין השיבוץ לבין חשיפת העץ.',
      advanced: true,
      content: (
        <div className="it-settings-toggle-list">
          <label className="it-settings-toggle">
            <input
              type="checkbox"
              checked={draftSettings.autoRevealAfterPlacement}
              onChange={(event) => setDraftSettings((prev) => ({ ...prev, autoRevealAfterPlacement: event.target.checked }))}
            />
            <span>
              <strong>פתיחה אוטומטית של העץ אחרי שיבוץ</strong>
              <span>מעביר ישירות לשלב ההסתעפות במקום לעצור קודם בכרטיס השיבוץ.</span>
            </span>
          </label>
        </div>
      )
    }
  };
  const orderedSettingsIds = trainerContract.settingsGroups?.length ? trainerContract.settingsGroups : Object.keys(settingsSectionMap);
  const settingsSections: TrainerSettingsSection[] = [
    ...orderedSettingsIds.map((id) => settingsSectionMap[id]).filter(Boolean),
    ...Object.values(settingsSectionMap).filter((section) => !orderedSettingsIds.includes(section.id))
  ];

  const compactFlowStepId: 'read' | 'choose' | 'reveal' = revealReady ? 'reveal' : selectedToken ? 'choose' : 'read';
  const selectedTemplateLabel = selectedTemplateType ? formatTemplateLabel(selectedTemplateType) : 'טרם נבחר היגיון';
  const currentFeedbackNode = state.feedback ? <div className={`it-feedback ${state.feedback.tone}`}>{state.feedback.text}</div> : null;

  const selectorPanel = selectorOpen ? (
    <section className="it-panel it-guided-stage it-selector-panel" aria-label="בחירת עץ לוגי">
      <div className="it-guided-stage-head">
        <div>
          <div className="it-kicker">שלב 2</div>
          <h2 className="it-title" style={{ fontSize: '1.06rem', marginTop: 4 }}>בוחרים היגיון חזותי אחד</h2>
          <p className="it-sub">לא רואים ספריית עצים שלמה. מתקדמים היגיון אחד בכל פעם עד שמרגיש שזה המבנה הנכון.</p>
        </div>
        <span className="it-panel-badge">עץ {selectorIndex + 1} מתוך {TEMPLATE_TYPES.length}</span>
      </div>

      <div
        className="it-selector-shell"
        onTouchStart={(event) => setSelectorTouchStartX(event.changedTouches[0]?.clientX ?? null)}
        onTouchEnd={(event) => {
          if (selectorTouchStartX === null) return;
          const delta = (event.changedTouches[0]?.clientX ?? selectorTouchStartX) - selectorTouchStartX;
          if (Math.abs(delta) > 40) moveSelector(delta > 0 ? -1 : 1);
          setSelectorTouchStartX(null);
        }}
      >
        <div className="it-selector-nav" aria-label="ניווט בין עצים">
          <button type="button" className="it-selector-arrow" onClick={() => moveSelector(-1)} aria-label="העץ הקודם">
            {'<'}
          </button>
          <div className="it-selector-count">היגיון {selectorIndex + 1} / {TEMPLATE_TYPES.length}</div>
          <button type="button" className="it-selector-arrow" onClick={() => moveSelector(1)} aria-label="העץ הבא">
            {'>'}
          </button>
        </div>

        <div className={`it-selector-card${selectedTemplateType === selectorTemplateType ? ' is-chosen' : ''}`}>
          <div className="it-selector-sketch">
            <TemplateSketch meta={selectorMeta} tokenText={selectedToken?.text} causeMode={selectorCauseMode} active={selectedTemplateType === selectorTemplateType} />
          </div>
          <h3 className="it-selector-title">{selectorMeta.titleHe}</h3>
          <p className="it-selector-note">{selectorMeta.shortHelp}</p>
          {selectedToken && !selectorAllowsToken ? (
            <div className="it-selector-warning">העוגן "{selectedToken.text}" לא משויך כרגע להיגיון הזה בתרחיש הזה. אפשר לעבור לעץ הבא או לבחור עוגן אחר.</div>
          ) : null}
          <div className="it-actions">
            <button
              type="button"
              className="it-btn primary it-selector-select-btn"
              onClick={() => chooseTemplate(selectorTemplateType)}
              disabled={!selectedToken || !selectorAllowsToken}
            >
              בחר את ההיגיון הזה
            </button>
          </div>
        </div>
      </div>
    </section>
  ) : null;

  const workspacePanel = workspaceMeta ? (
    <section className="it-panel it-guided-stage it-guided-workspace-panel" aria-label="אזור העבודה עם העץ שנבחר">
      <div className="it-guided-stage-head">
        <div>
          <div className="it-kicker">שלב 3</div>
          <h2 className="it-title" style={{ fontSize: '1.08rem', marginTop: 4 }}>{workspaceMeta.titleHe}</h2>
          <p className="it-sub">גרור את המושג שאתה רוצה לתוך המקום הרצוי בעץ וגלה איזו אינפורמציה נוספת מופיעה כשחושבים כך.</p>
        </div>
        <span className="it-panel-badge">{workspaceMeta.code}</span>
      </div>

      {showFocusGuide ? (
        <div className="it-guided-focus-note">כאן אנחנו לא מחפשים תשובה אחת "נכונה", אלא בודקים איזה מבנה מחשבתי גורם למשפט להיראות אחרת.</div>
      ) : null}

      {showFocusSketch ? (
        <div className="it-guided-focus-sketch">
          <TemplateSketch meta={workspaceMeta} tokenText={selectedToken?.text} causeMode={workspacePreviewCauseMode} active />
        </div>
      ) : null}

      <div className="it-workspace-anchors" aria-label="עוגנים לגרירה">
        {scenario.draggables.map((candidate) => {
          const isSelected = state.selectedTokenId === candidate.id;
          const isActive = state.active?.tokenId === candidate.id;
          return (
            <button
              key={`workspace-${candidate.id}`}
              type="button"
              draggable
              className={['it-token', 'it-guided-anchor', isSelected ? 'sel' : '', isActive ? 'active' : ''].filter(Boolean).join(' ')}
              onDragStart={(e) => onDragStart(e, candidate.id)}
              onDragEnd={onDragEnd}
              onClick={() => onTokenTap(candidate.id)}
              aria-pressed={isSelected}
            >
              {candidate.text}
            </button>
          );
        })}
      </div>

      {!activeMatchesWorkspace || !state.active || !activeToken ? (
        <div className="it-guided-tree-drop" data-template={workspaceTemplateType}>
          <button
            type="button"
            className="it-guided-drop-node is-root"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => handleWorkspaceTreeDrop(event, workspaceTemplateType)}
            onClick={() => handleWorkspaceTreeClick(workspaceTemplateType)}
          >
            <strong>{selectedToken ? selectedToken.text : 'גרור/י עוגן לכאן'}</strong>
            <span>{selectedToken ? 'אפשר לשחרר את העוגן במרכז העץ או באחד הענפים.' : 'בחר/י עוגן אחד ואז שחרר/י אותו כאן.'}</span>
          </button>

          <div className={`it-guided-drop-branches cols-${workspaceSlotLabels.length || 1}`}>
            {workspaceSlotLabels.map((label) => (
              <button
                key={`${workspaceTemplateType}-${label}`}
                type="button"
                className="it-guided-drop-node"
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => handleWorkspaceTreeDrop(event, workspaceTemplateType)}
                onClick={() => handleWorkspaceTreeClick(workspaceTemplateType)}
              >
                <strong>{label}</strong>
                <span>{selectedToken ? `שחרר/י כאן את "${selectedToken.text}"` : 'בחר/י עוגן כדי להתקדם'}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="it-guided-result-stack">
          <section className="it-reveal-visual it-guided-reveal-visual" aria-label="העץ שנפתח">
            <div className="it-reveal-visual-head">
              <div>
                <h4>כך ההיגיון שנבחר מסדר כרגע את המשפט</h4>
                <p>המערכת ממלאת את ההסתעפות לפי המבנה שבחרת, כדי שאפשר יהיה לראות מה הופך גלוי.</p>
              </div>
              <span className="it-mini-tag code">{workspaceMeta.code}</span>
            </div>
            <RevealTemplateFigure
              templateType={state.active.templateType}
              tokenText={activeToken.text}
              slots={activeSet}
              causeMode={'mode' in activePayload ? activePayload.mode ?? null : null}
            />
          </section>

          <div className="it-guide-bubble">שים לב — מה אנו יכולים ללמוד כעת מצורת החשיבה הזאת?</div>

          <div className="it-guided-insight-grid">
            <article className="it-guided-insight-card">
              <strong>מה נהיה ברור יותר</strong>
              <p>{activeReflection}</p>
            </article>

            <article className="it-guided-insight-card is-secondary">
              <strong>מה ההיגיון הזה בודק</strong>
              <p>{activeDirectionLabel || workspaceMeta.shortHelp}</p>
            </article>

            <article className="it-guided-insight-card is-secondary">
              <strong>שאלת המשך אפשרית</strong>
              <p>{activePayload?.question || 'איך היית בודק/ת את הייצוג הזה מול מה שנאמר בפועל?'}</p>
            </article>
          </div>

          <div className="it-next-actions">
            <button type="button" className="it-btn secondary" onClick={clearActive}>נסה עוגן אחר</button>
            <button type="button" className="it-btn ghost" onClick={chooseAnotherTree}>בחר עץ אחר</button>
            <button type="button" className="it-btn primary" onClick={nextScenario}>לתרגיל הבא</button>
          </div>

          <details className="it-guided-details">
            <summary>העמקה נוספת לפי בקשה</summary>
            <div className="it-guided-details-body">
              <BranchExplorer templateType={state.active.templateType} tokenText={activeToken.text} payload={activePayload} activeSet={activeSet} />
              <SentenceBoard
                scenario={scenario}
                selectedToken={selectedToken}
                activeTemplateType={state.active.templateType}
                activeQuestion={activePayload?.question ?? ''}
                activeReflection={activeReflection}
              />
            </div>
          </details>
        </div>
      )}
    </section>
  ) : null;

  const readStepExpanded = (
    <>
      <section className="it-panel it-guided-stage" aria-label="הקשר ומשפט העבודה">
        <div className="it-guided-stage-head">
          <div>
            <div className="it-kicker">תרחיש <code>{scenario.scenario_id}</code></div>
            <h2 className="it-title" style={{ fontSize: '1.08rem', marginTop: 4 }}>מתחילים ממשפט אחד ברור</h2>
          </div>
          <span className="it-panel-badge">שלב 1</span>
        </div>

        <div className="it-context-strip">את/ה המטפל/ת. האדם שמולך נכנס/ת ואומר/ת:</div>

        <div className="it-dialogue-panel">
          <div className="it-dialogue-label">אדם אומר:</div>
          <p className="it-dialogue-quote">"{scenario.client_text}"</p>

          <div className="it-dialogue-anchors" aria-label="עוגנים זמינים">
            {scenario.draggables.map((candidate) => {
              const isSelected = state.selectedTokenId === candidate.id;
              const isActive = state.active?.tokenId === candidate.id;
              const isDragging = draggingTokenId === candidate.id;
              return (
                <button
                  key={candidate.id}
                  type="button"
                  draggable
                  className={['it-token', 'it-guided-anchor', isSelected ? 'sel' : '', isActive ? 'active' : '', isDragging ? 'dragging' : ''].filter(Boolean).join(' ')}
                  onDragStart={(e) => onDragStart(e, candidate.id)}
                  onDragEnd={onDragEnd}
                  onClick={() => onTokenTap(candidate.id)}
                  aria-pressed={isSelected}
                  title={`מבנים אפשריים: ${candidate.allowed_templates.map((type) => TEMPLATE_META[type].titleHe).join(' · ')}`}
                >
                  {candidate.text}
                </button>
              );
            })}
          </div>
        </div>

        <div className="it-selection-card it-guided-selection-card">
          <strong>העוגן שעובדים עליו עכשיו</strong>
          <span>{selectedTokenLabel || 'עדיין לא נבחר עוגן'}</span>
          <small>{selectedTokenLabel ? `מבנים אפשריים: ${selectedTokenTemplateLabels}` : 'בחר/י מילה או ביטוי אחד כדי לפתוח את ההמשך.'}</small>
        </div>

        <section className="it-guided-cta-stage" aria-label="מעבר לבחירת היגיון חזותי">
          <button type="button" className="it-guided-cta" onClick={openTreeSelector} disabled={!selectedToken}>
            היגיון ויזואלי לפעולה!
          </button>
          <p className="it-guided-cta-note">
            {selectedToken
              ? `נבחר העוגן "${selectedToken.text}". עכשיו עוברים לעץ אחד בכל פעם.`
              : 'בחר/י קודם עוגן אחד מתוך המשפט כדי לפתוח את בוחר ההיגיונות.'}
          </p>
        </section>
      </section>
      {compactFlowStepId === 'read' ? currentFeedbackNode : null}
    </>
  );

  const chooseStepExpanded = (
    <>
      {!selectorOpen && !selectedTemplateType ? (
        <section className="it-panel it-guided-stage" aria-label="בחירת היגיון חזותי">
          <div className="it-guided-stage-head">
            <div>
              <div className="it-kicker">שלב 2</div>
              <h2 className="it-title" style={{ fontSize: '1.06rem', marginTop: 4 }}>בוחרים היגיון חזותי אחד</h2>
              <p className="it-sub">אחרי שבוחרים עוגן, פותחים עץ אחד בכל פעם ובודקים איזה מבנה מסדר אותו בצורה הכי בהירה.</p>
            </div>
            <span className="it-panel-badge">בחירת עץ</span>
          </div>
          <div className="it-step-compact">
            <p>{selectedToken ? `העוגן "${selectedToken.text}" מוכן לעבודה. עכשיו אפשר לפתוח את בוחר העצים ולעבור על המבנים בקצב רגוע.` : 'בחר/י קודם עוגן אחד מתוך המשפט.'}</p>
            <section className="it-guided-cta-stage" aria-label="פתיחת בוחר העצים">
              <button type="button" className="it-guided-cta" onClick={openTreeSelector} disabled={!selectedToken}>
                פתח/י את בוחר העצים
              </button>
              <p className="it-guided-cta-note">הבחירה כאן לא מוחלטת. אפשר לפתוח, לבדוק, ולחזור לעץ אחר בלי לאבד את ההקשר.</p>
            </section>
          </div>
        </section>
      ) : null}

      {selectorPanel}

      {selectedTemplateType && !selectorOpen ? (
        <section className="it-panel it-guided-stage" aria-label="העץ שנבחר">
          <div className="it-guided-stage-head">
            <div>
              <div className="it-kicker">שלב 2</div>
              <h2 className="it-title" style={{ fontSize: '1.06rem', marginTop: 4 }}>המבנה נבחר, עכשיו משבצים את העוגן</h2>
              <p className="it-sub">ההיגיון כבר נבחר. נשאר למקם את העוגן בתוך העץ ולראות מה נפתח ממנו.</p>
            </div>
            <span className="it-panel-badge">{workspaceMeta?.code || 'TREE'}</span>
          </div>
          <div className="it-step-compact">
            <div className="it-step-preview-row">
              <strong>העץ שנבחר</strong>
              <span>{selectedTemplateLabel}</span>
            </div>
            <p>{workspaceMeta?.shortHelp || 'ממשיכים ישירות לשיבוץ העוגן בתוך המבנה שנבחר.'}</p>
            <div className="it-actions">
              <button type="button" className="it-btn ghost" onClick={() => setSelectorOpen(true)}>פתח שוב את בוחר העצים</button>
            </div>
          </div>
        </section>
      ) : null}

      {workspaceMeta ? workspacePanel : null}
      {compactFlowStepId === 'choose' ? currentFeedbackNode : null}
    </>
  );

  const revealStepExpanded = (
    <>
      {workspacePanel || (
        <section className="it-panel it-guided-stage" aria-label="תובנה פעילה">
          <div className="it-step-compact">
            <p>כדי להגיע לתובנה פעילה צריך קודם לבחור עוגן, לבחור עץ, ואז לשבץ את העוגן במבנה.</p>
          </div>
        </section>
      )}
      {compactFlowStepId === 'reveal' ? currentFeedbackNode : null}
    </>
  );

  const flowSteps: ActiveStepFlowStep[] = [
    {
      id: 'read',
      title: 'קוראים את המשפט ובוחרים עוגן',
      shortLabel: 'עוגן',
      summary: selectedTokenLabel ? `נבחר העוגן "${selectedTokenLabel}".` : 'עדיין לא נבחר עוגן.',
      feedbackSnippet: selectedTokenTemplateLabels ? `מבנים אפשריים: ${selectedTokenTemplateLabels}` : undefined,
      status: compactFlowStepId === 'read' ? 'active' : selectedToken ? 'completed' : 'upcoming',
      expandedContent: readStepExpanded,
      collapsedContent: (
        <div className="it-step-preview">
          <div className="it-step-preview-row">
            <strong>משפט העבודה</strong>
            <span>{cleanSnippet(scenario.client_text, 140)}</span>
          </div>
          <div className="it-step-preview-row">
            <strong>עוגן שנבחר</strong>
            <span>{selectedTokenLabel || 'טרם נבחר'}</span>
          </div>
        </div>
      )
    },
    {
      id: 'choose',
      title: 'בוחרים עץ ומשבצים את העוגן',
      shortLabel: 'עץ',
      summary: revealReady ? `נבחר ${selectedTemplateLabel} עבור "${selectedTokenLabel || 'העוגן שנבחר'}".` : 'העץ עוד לא נסגר.',
      feedbackSnippet: workspaceMeta?.shortHelp || (selectedTokenLabel ? `עוגן פעיל: ${selectedTokenLabel}` : undefined),
      status: compactFlowStepId === 'choose' ? 'active' : revealReady ? 'completed' : 'upcoming',
      expandedContent: chooseStepExpanded,
      collapsedContent: (
        <div className="it-step-preview">
          <div className="it-step-preview-row">
            <strong>מבנה שנבחר</strong>
            <span>{selectedTemplateLabel}</span>
          </div>
          <div className="it-step-preview-row">
            <strong>עוגן</strong>
            <span>{selectedTokenLabel || 'טרם נבחר'}</span>
          </div>
          {selectedToken && workspaceMeta ? (
            <div className="it-step-preview-sketch">
              <TemplateSketch meta={workspaceMeta} tokenText={selectedToken.text} causeMode={workspacePreviewCauseMode} active />
            </div>
          ) : null}
        </div>
      )
    },
    {
      id: 'reveal',
      title: 'רואים מה נפתח ולוקחים הלאה',
      shortLabel: 'תובנה',
      summary: activeToken ? `כרגע עובדים מתוך "${activeToken.text}".` : 'התובנה תופיע כאן אחרי שיבוץ.',
      feedbackSnippet: activePayload?.question || undefined,
      status: compactFlowStepId === 'reveal' ? 'active' : 'upcoming',
      expandedContent: revealStepExpanded
    }
  ];

  const mainContent = (
    <div className="it-flow-stack">
      <section className="it-context-rail" aria-label="הקשר שצריך להישאר מול העיניים">
        <div className="it-context-rail-head">
          <div>
            <div className="it-kicker">תרחיש <code>{scenario.scenario_id}</code></div>
            <strong>ההקשר נשאר פתוח גם כשהשלבים נסגרים</strong>
          </div>
          <p>כך לא צריך לגלול למעלה כדי לזכור מה נאמר, איזה עוגן כבר נבחר, ובאיזה היגיון עובדים עכשיו.</p>
        </div>
        <p className="it-context-quote">"{scenario.client_text}"</p>
        <div className="it-context-meta">
          <span className="it-chip">עוגן: {selectedTokenLabel || 'טרם נבחר'}</span>
          <span className="it-chip">היגיון: {selectedTemplateType ? selectedTemplateLabel : 'טרם נבחר'}</span>
          <span className="it-chip">מיקוד: {currentProcessMeta.label}</span>
        </div>
      </section>

      {state.lastCompletedRecap ? <div className="it-flow-recap">{state.lastCompletedRecap}</div> : null}

      <ActiveStepFlow
        steps={flowSteps}
        activeStepId={compactFlowStepId}
        historyTitle="מה כבר נסגר בדרך"
        emptyHistoryText="עוד לא נסגרו שלבים. מתחילים מהמשפט ומהעוגן."
        activeKicker="השלב הפעיל"
      />
    </div>
  );

  const supportContent = <></>;

  return (
    <div className="it-wrap it-wrap-refined" dir="rtl" lang="he">
      <style>{`${TRAINER_PLATFORM_CSS}\n${ACTIVE_STEP_FLOW_CSS}\n${css}`}</style>

      {showOnboarding ? (
        <div className="it-onboarding-layer" role="dialog" aria-modal="true" aria-label="יועץ NLP למסך קצה קרחון" data-trainer-onboarding="1">
          <div className="it-onboarding-card">
            <div className="it-onboarding-head">
              <div>
                <div className="it-kicker">אימון על ארגון פנימי של חשיבה</div>
                <h2>{trainerContract.title}</h2>
                <p>כאן מתאמנים בלמיין חומר לשוני ולוגי לתוך סכמות פנימיות ברורות. זה מה שמעמיק הבנה, מזרז חשיבה, ומכוון לבחירה מדויקת יותר של ההתערבות הבאה.</p>
              </div>
              <button type="button" className="it-btn ghost" data-trainer-action="dismiss-onboarding" onClick={() => setShowOnboarding(false)}>סגור</button>
            </div>
            <div className="it-onboarding-copy">
              <p>זה לא סולם דילטס ולא ערבוב של כובעים ורמות. כאן עובדים עם עץ של הכללה, סיבתיות מסתעפת, או הנחות שמחזיקות את המשפט.</p>
              <p>המטרה היא להבין איזה סוג מיון אתה עושה, למה העוגן שייך לשם, ואיזה ענף חלופי גם יכול להתאים.</p>
            </div>
            <SchemaComparisonMini />
            <div className="it-onboarding-grid">
              <article className="it-onboarding-note"><strong>מה עושים כאן</strong><p>קוראים את המשפט, בוחרים עוגן אחד, בוחרים מבנה, ואז רואים איך העץ נפתח.</p></article>
              <article className="it-onboarding-note"><strong>איך יודעים שהצלחת</strong><p>כשברור מהו סוג המבנה, מהו הענף המרכזי, ומה עוד אפשר לבדוק במקום להינעל על פירוש אחד.</p></article>
              <article className="it-onboarding-note"><strong>דוגמה</strong><p>"מנוחה" יכולה להפוך מקריאת מצוקה כללית לעץ של קריטריונים, תנאים, או הנחות סמויות.</p></article>
            </div>
            <div className="it-onboarding-actions">
              <button type="button" className="it-btn primary" data-trainer-action="dismiss-onboarding" onClick={() => setShowOnboarding(false)}>חוזרים לעבודה</button>
            </div>
          </div>
        </div>
      ) : null}

      <TrainerPlatformShell
        trainerId="iceberg-templates"
        title={trainerContract.title}
        subtitle={trainerContract.subtitle}
        headerKicker={trainerContract.familyLabel}
        modePill={<span className="trp-mode-pill">{currentProcessMeta.label}</span>}
        headerActions={
          <>
            <button type="button" className="trp-btn is-secondary" data-trainer-action="open-settings" onClick={openSettings}>הגדרות</button>
            <button type="button" className="trp-btn is-ghost" onClick={() => setShowOnboarding(true)}>יועץ NLP</button>
          </>
        }
        purposeKicker="מה זה מאמן?"
        purposeTitle="אימון על ארגון פנימי של חשיבה, לא רק על גרירת טוקנים"
        purposeBody={<p>{INTRO_COPY}</p>}
        purposeTags={
          <>
            <span className="it-chip">תרחישים: {scenarioCount}</span>
            <span className="it-chip">עוגנים ששובצו: {state.scoreDrops}</span>
            <span className="it-chip">ענפים חלופיים: {state.scoreVariants}</span>
          </>
        }
        problemKicker="מה הבעיה שמנסים לפתור?"
        problemTitle="בלי מיון, מילה אחת גדולה סוגרת את החשיבה"
        problemBody={
          <p>
            מילה או ביטוי אחד יכולים לגרור פירוש מהיר מדי, כאילו כבר ברור למה הכוונה.
            כאן עוצרים לפני ההיצמדות לפירוש אחד, ובודקים איזה מבנה מחשבתי באמת נפתח ואילו חלופות עדיין חיות.
          </p>
        }
        startKicker={trainerContract.quickStartLabel}
        startTitle="העבודה יכולה להתחיל מיד"
        startBody={<p>המשפט הראשון, מצב הכניסה, ועזרי העבודה כבר מוכנים. ההגדרות רק מכוונות איך ייראה הסשן הבא.</p>}
        startActions={
          <>
            <button type="button" className="trp-btn is-primary" data-trainer-action="start-session" onClick={() => startIcebergSession(settings)}>{trainerContract.startActionLabel}</button>
            <button type="button" className="trp-btn is-secondary" data-trainer-action="open-settings" onClick={openSettings}>הגדרות</button>
            <span className="trp-summary-pill" data-trainer-summary="current">{currentSessionSummary}</span>
          </>
        }
        startMeta={
          <>
            <span className="it-chip">תרחיש פתיחה: {currentScenarioIndexLabel}</span>
            <span className="it-chip">עוגן פעיל: {selectedTokenLabel || 'טרם נבחר'}</span>
            <span className="it-chip">השלב הבא: {currentProcessMeta.help}</span>
          </>
        }
        clarityCards={clarityCards}
        closingNote={<p>הצלחה בדף הפתיחה הזה היא להבין מראש איך מתחילים, מה מחפשים במהלך הבחירה, ואיך תיראה תובנה טובה אחת לפני שנוגעים במשפט.</p>}
        helperSteps={helperSteps}
        supportRailMode={trainerContract.supportRailMode}
        mobilePriorityOrder={trainerContract.mobilePriorityOrder}
        main={mainContent}
        support={supportContent}
      />

      <TrainerSettingsShell
        trainerId="iceberg-templates"
        open={settingsOpen}
        title={trainerContract.settingsTitle}
        subtitle={trainerContract.settingsSubtitle}
        summaryPill={<span className="trp-summary-pill">{previewSummary}</span>}
        preview={
          <>
            <div className="it-selection-card">
              <strong>{draftLaunchModeLabel}</strong>
              <span>{previewScenario.scenario_id}</span>
              <small>{draftAidsLabel}{draftSettings.autoRevealAfterPlacement ? ' · עץ נפתח אוטומטית' : ''}</small>
            </div>
            <div className="it-help"><strong>משפט פתיחה:</strong> {cleanSnippet(previewScenario.client_text, 110)}</div>
            <div className="it-help"><strong>עוגנים זמינים:</strong> {previewScenario.draggables.map((item) => item.text).join(' · ')}</div>
          </>
        }
        sections={settingsSections}
        advancedOpen={advancedOpen}
        onAdvancedToggle={setAdvancedOpen}
        onClose={() => setSettingsOpen(false)}
        onResetDefaults={resetDraftSettings}
        onCancel={() => setSettingsOpen(false)}
        footerNote="השמירה מעדכנת מיד את סיכום הסשן למעלה. כדי להחיל תרחיש פתיחה חדש, שמרו והתחילו סשן."
        footerActions={
          <>
            <button
              type="button"
              className="trp-btn is-ghost"
              data-trainer-preset="compact"
              onClick={() => setDraftSettings((prev) => ({
                ...prev,
                defaultScenarioIndex: normalizeScenarioIndex(prev.defaultScenarioIndex === 0 ? 1 : 0, scenarioCount),
                launchMode: 'guided',
                showFocusGuide: true,
                showFocusSketch: false,
                autoRevealAfterPlacement: false
              }))}
            >
              מיקוד מהיר
            </button>
            <button type="button" className="trp-btn is-secondary" data-trainer-preset="standard" onClick={resetDraftSettings}>ברירת מחדל</button>
            <button type="button" className="trp-btn is-secondary" data-trainer-action="save-settings" onClick={() => applyDraftSettings(false)}>שמור</button>
            <button type="button" className="trp-btn is-primary" data-trainer-action="save-start" onClick={() => applyDraftSettings(true)}>שמור והתחל סשן</button>
          </>
        }
      />
    </div>
  );

}

