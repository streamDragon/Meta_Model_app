import React, { useEffect, useRef, useState } from 'react';

import { CANONICAL_BREEN_GRID_RTL, CANONICAL_BREEN_ORDER, orderBreenCategories, type CanonicalBreenCode } from '../config/canonicalBreenOrder';
import { getTrainerContract } from '../config/trainerContract';
import { TrainerEmptyState, TrainerPlatformShell, TrainerSupportCard } from './trainer-shell/TrainerPlatformShell';
import { TrainerSettingsShell, type TrainerSettingsSection } from './trainer-shell/TrainerSettingsShell';
import { TRAINER_PLATFORM_CSS } from './trainer-shell/trainerPlatformStyles';

type CategoryCode = CanonicalBreenCode;
type GroupCode = 'DIS' | 'GEN' | 'DEL';
type FamilyCell = GroupCode | 'CTX' | 'VAK';
type TextSource = 'built_in' | 'random' | 'manual';
type FieldCtx = 'general' | 'work' | 'relationship' | 'family' | 'anxiety' | 'belief';
type RoundsChoice = 5 | 10 | 'infinite';
type CategoryDisplay = 'all' | 'group';
type Tone = 'info' | 'success' | 'error';

type Feedback = { tone: Tone; message: string };
type Sentence = { id: string; text: string; tags: CategoryCode[] };
type Scenario = { id: string; title: string; context: FieldCtx; contextLabel: string; sentences: Sentence[] };
type Round = { id: string; scenarioId: string; title: string; contextLabel: string; sentences: Sentence[] };
type Settings = {
  textSource: TextSource;
  fieldContext: FieldCtx;
  difficulty: number;
  sentenceCount: number;
  rounds: RoundsChoice;
  categoryDisplay: CategoryDisplay;
  categoryGroup: GroupCode;
  includeCtxVak: boolean;
};

const CLASSIC2_SETTINGS_STORAGE_KEY = 'classic2_settings_v1';

const CAT: Record<CategoryCode, { he: string; family: FamilyCell; familyHe: string; hint: string; note?: string }> = {
  MR: { he: 'קריאת מחשבות', family: 'DIS', familyHe: 'עיוות', hint: 'הנחה על מה האחר חושב/מרגיש בלי ראיה מפורשת.' },
  CEq: { he: 'שקילות מורכבת', family: 'DIS', familyHe: 'עיוות', hint: "חפש/י 'X אומר Y' / 'אם X אז זה אומר Y'." },
  CE: { he: 'סיבה-תוצאה', family: 'DIS', familyHe: 'עיוות', hint: "חפש/י 'כי/אז/בגלל/גורם'." },
  PRE: { he: 'פרסופוזיציה / הנחת מוקדמת', family: 'DIS', familyHe: 'עיוות', hint: 'שאלה/טענה שמניחה משהו מראש.' },
  NOM: { he: 'נומינליזציה', family: 'DIS', familyHe: 'עיוות', hint: 'שם פעולה/תהליך קפוא (מבוכה, דחייה, כישלון...).'},
  LP: { he: 'אמירה ערכית / Lost Performative', family: 'GEN', familyHe: 'הכללה', hint: "שיפוט בלי 'לפי מי/איזה קריטריון'." },
  UQ: { he: 'כמת אוניברסלי', family: 'GEN', familyHe: 'הכללה', hint: "תמיד/אף פעם/כולם/שום דבר/ממילא." },
  MN: { he: 'מודאל הכרח', family: 'GEN', familyHe: 'הכללה', hint: "חייב/צריך/מוכרח/אין ברירה." },
  MP: { he: 'מודאל אפשרות / פעולה', family: 'GEN', familyHe: 'הכללה', hint: "יכול/אפשר/לא יכול. כרגע כולל גם רוצה/כוונה.", note: 'WANT מקופל כרגע תחת MP כדי לשמור על גריד 15 פריטים קבוע.' },
  UV: { he: 'פועל לא מפורט', family: 'DEL', familyHe: 'מחיקה', hint: "פועל עמום בלי 'איך בדיוק'." },
  UN: { he: 'שם עצם לא מפורט / ייחוס חסר', family: 'DEL', familyHe: 'מחיקה', hint: "הם/מישהו/כולם בלי זיהוי ברור." },
  COMP: { he: 'השוואה חסרה', family: 'DEL', familyHe: 'מחיקה', hint: "יותר/פחות/טוב יותר בלי ביחס למה." },
  DEL: { he: 'מחיקה / חסר מידע', family: 'DEL', familyHe: 'מחיקה', hint: 'טענה שחסר בה מידע בסיסי (מי/מה/איך/לפי מה).' },
  CTX: { he: 'הקשר (זמן/מקום/מצב)', family: 'CTX', familyHe: 'הקשר', hint: "אתמול/בבית/לפני ישיבה/במסדרון..." },
  VAK: { he: 'ערוצי חישה', family: 'VAK', familyHe: 'חושי', hint: 'ראייה/שמיעה/תחושה גופנית.' }
};

const CTX_LABEL: Record<FieldCtx, string> = {
  general: 'כללי',
  work: 'עבודה',
  relationship: 'זוגיות',
  family: 'משפחה',
  anxiety: 'חרדה',
  belief: 'אמונה/דת'
};

const DEFAULTS: Settings = {
  textSource: 'built_in',
  fieldContext: 'general',
  difficulty: 2,
  sentenceCount: 5,
  rounds: 5,
  categoryDisplay: 'all',
  categoryGroup: 'DIS',
  includeCtxVak: true
};

const QUICK: Settings = { ...DEFAULTS, categoryDisplay: 'group', categoryGroup: 'DIS', sentenceCount: 4 };

function loadClassic2Settings(): Settings {
  if (typeof window === 'undefined') return { ...DEFAULTS };
  try {
    const raw = window.localStorage.getItem(CLASSIC2_SETTINGS_STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return {
      ...DEFAULTS,
      ...parsed,
      difficulty: clamp(Number(parsed?.difficulty) || DEFAULTS.difficulty, 1, 5),
      sentenceCount: clamp(Number(parsed?.sentenceCount) || DEFAULTS.sentenceCount, 3, 8),
      rounds: parsed?.rounds === 10 || parsed?.rounds === 'infinite' ? parsed.rounds : DEFAULTS.rounds
    };
  } catch {
    return { ...DEFAULTS };
  }
}

function saveClassic2Settings(settings: Settings): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(CLASSIC2_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}

const SCENARIOS: Scenario[] = [
  {
    id: 'g-form',
    title: 'טופס ובירוקרטיה',
    context: 'general',
    contextLabel: CTX_LABEL.general,
    sentences: [
      { id: 'g1', text: 'אתמול בעירייה לפני הסגירה החזירו לי את הטופס.', tags: ['CTX', 'UN', 'VAK'] },
      { id: 'g2', text: 'אמרו שהוא לא טוב.', tags: ['DEL', 'UN', 'LP'] },
      { id: 'g3', text: 'המסמך החדש צריך להיות יותר ברור.', tags: ['MN', 'COMP'] },
      { id: 'g4', text: 'אם אני טועה בעוד שדה אחד זה אומר שידחו הכול.', tags: ['CEq', 'CE', 'UQ'] },
      { id: 'g5', text: 'אני לא יכול להבין מה בדיוק הם רוצים ממני.', tags: ['MP', 'UN', 'DEL'] },
      { id: 'g6', text: 'למה שוב מניחים שכבר העליתי את כל האישורים?', tags: ['PRE', 'UN'] },
      { id: 'g7', text: 'בסוף לא הצלחתי להסביר מה חסר.', tags: ['UV', 'DEL'] }
    ]
  },
  {
    id: 'w-meeting',
    title: 'ישיבת צוות',
    context: 'work',
    contextLabel: CTX_LABEL.work,
    sentences: [
      { id: 'w1', text: 'אתמול במסדרון לפני הישיבה ראיתי את המנהל עובר בלי שלום.', tags: ['CTX', 'VAK'] },
      { id: 'w2', text: 'אם הוא לא אומר שלום זה אומר שהוא לא מעריך אותי.', tags: ['CEq', 'MR'] },
      { id: 'w3', text: 'ממילא אין טעם לדבר כי זה לא יעזור.', tags: ['UQ', 'CE'] },
      { id: 'w4', text: 'אני חייב לשתוק כדי לא לעשות פאדיחות.', tags: ['MN', 'CE', 'NOM'] },
      { id: 'w5', text: 'זה פשוט לא מקצועי.', tags: ['LP', 'DEL'] },
      { id: 'w6', text: 'בסוף לא הצלחתי להסביר מה אני צריך.', tags: ['UV', 'UN'] },
      { id: 'w7', text: 'התגובה שלו הייתה יותר קרה היום.', tags: ['COMP', 'MR'] },
      { id: 'w8', text: 'מתי הוא יתחיל להתייחס אליי כמו לאחרים?', tags: ['PRE', 'COMP', 'MR'] }
    ]
  },
  {
    id: 'r-evening',
    title: 'שיחה בערב',
    context: 'relationship',
    contextLabel: CTX_LABEL.relationship,
    sentences: [
      { id: 'r1', text: 'אתמול בערב בבית היא נכנסה שקטה ולא הסתכלה עליי.', tags: ['CTX', 'VAK'] },
      { id: 'r2', text: 'ידעתי שהיא כועסת עליי לפני שאמרה מילה.', tags: ['MR'] },
      { id: 'r3', text: 'אם היא שקטה זה אומר שעשיתי משהו לא בסדר.', tags: ['CEq', 'MR', 'LP'] },
      { id: 'r4', text: 'אז אני חייב להתרחק כדי שלא תתפתח דרמה.', tags: ['MN', 'CE', 'NOM'] },
      { id: 'r5', text: 'ממילא שיחות כאלה תמיד נגמרות רע.', tags: ['UQ', 'CE'] },
      { id: 'r6', text: 'אני לא מצליח לדבר נורמלי ברגעים האלה.', tags: ['UV', 'DEL'] },
      { id: 'r7', text: 'אני רוצה לפתוח את זה, אבל כרגע אני לא יכול.', tags: ['MP'] },
      { id: 'r8', text: 'מתי נצליח לדבר כמו זוג נורמלי?', tags: ['PRE', 'COMP', 'NOM'] }
    ]
  },
  {
    id: 'f-morning',
    title: 'בוקר בבית',
    context: 'family',
    contextLabel: CTX_LABEL.family,
    sentences: [
      { id: 'f1', text: 'כל בוקר לפני בית ספר אני מבקש ממנו להזדרז.', tags: ['UQ', 'CTX'] },
      { id: 'f2', text: 'הוא עושה פרצוף ואני ישר שומע את הטון הזה.', tags: ['VAK', 'MR'] },
      { id: 'f3', text: 'זה אומר שהוא מזלזל בי.', tags: ['CEq', 'MR'] },
      { id: 'f4', text: 'אני חייב להרים קול כי אחרת שום דבר לא זז.', tags: ['MN', 'CE', 'UQ'] },
      { id: 'f5', text: 'הוא אומר שכולם בבית רק לוחצים עליו.', tags: ['UN', 'UQ'] },
      { id: 'f6', text: 'אחר כך יש אווירה לא טובה.', tags: ['NOM', 'DEL', 'LP'] },
      { id: 'f7', text: 'אני לא מצליח להסביר מה בדיוק אני מבקש.', tags: ['UV', 'DEL'] },
      { id: 'f8', text: 'למה הוא כבר לא יכול להתארגן כמו אחיו?', tags: ['PRE', 'MP', 'COMP'] }
    ]
  },
  {
    id: 'a-crowd',
    title: 'אירוע חברתי',
    context: 'anxiety',
    contextLabel: CTX_LABEL.anxiety,
    sentences: [
      { id: 'a1', text: 'כשהגעתי לאולם ושמעתי את הרעש הגוף שלי מיד נסגר.', tags: ['CTX', 'VAK', 'CE'] },
      { id: 'a2', text: 'אם אני מרגיש סחרחורת זה אומר שאני עומד לאבד שליטה.', tags: ['CEq', 'CE', 'VAK'] },
      { id: 'a3', text: 'אני חייב לצאת עכשיו.', tags: ['MN'] },
      { id: 'a4', text: 'אני לא יכול להישאר פה, למרות שאני רוצה להיות עם החברים.', tags: ['MP'] },
      { id: 'a5', text: 'כולם יראו שאני מוזר.', tags: ['UQ', 'MR', 'LP'] },
      { id: 'a6', text: 'כל הסיפור הזה הוא התקף.', tags: ['NOM', 'DEL'] },
      { id: 'a7', text: 'זה מסוכן.', tags: ['DEL', 'LP'] },
      { id: 'a8', text: 'למה זה שוב מתחיל דווקא ליד הרבה אנשים?', tags: ['PRE', 'CTX'] }
    ]
  },
  {
    id: 'b-faith',
    title: 'אמונה ותרגול',
    context: 'belief',
    contextLabel: CTX_LABEL.belief,
    sentences: [
      { id: 'b1', text: 'בשבת בבוקר בבית הכנסת התחלתי להרגיש ריחוק.', tags: ['CTX', 'VAK', 'NOM'] },
      { id: 'b2', text: 'אם עולות לי שאלות זה אומר שהאמונה שלי חלשה.', tags: ['CEq', 'CE', 'LP'] },
      { id: 'b3', text: 'אני צריך להתפלל נכון יותר.', tags: ['MN', 'COMP'] },
      { id: 'b4', text: 'אני רוצה להתחבר אבל לא מצליח כרגע.', tags: ['MP', 'UV'] },
      { id: 'b5', text: 'הם בקהילה בטח שמים לב שאני לא מרוכז.', tags: ['UN', 'MR'] },
      { id: 'b6', text: 'ממילא תמיד אצא פחות רוחני מהם.', tags: ['UQ', 'COMP'] },
      { id: 'b7', text: 'מתי אחזור להיות מאמין מספיק?', tags: ['PRE', 'COMP'] },
      { id: 'b8', text: 'זה לא ראוי.', tags: ['LP', 'DEL'] }
    ]
  }
];

const CSS = `
.c2n{direction:rtl;font-family:"Assistant","Rubik","Segoe UI",sans-serif;color:#10233e;max-width:1200px;margin:0 auto}
.c2n *{box-sizing:border-box}.c2n-shell{background:radial-gradient(circle at top right,rgba(245,158,11,.18),transparent 28%),radial-gradient(circle at left top,rgba(59,130,246,.14),transparent 34%),linear-gradient(180deg,#f6f8fc 0%,#fcfdff 100%);border:1px solid #dbe4f0;border-radius:28px;padding:16px;box-shadow:0 28px 60px rgba(15,23,42,.08)}
.c2n h1,.c2n h2,.c2n h3,.c2n h4,.c2n p{margin:0}.c2n-card{background:rgba(255,255,255,.92);border:1px solid #dde6f2;border-radius:20px;padding:14px;box-shadow:0 16px 36px rgba(15,23,42,.05)}
.c2n-top{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:12px}.c2n-title h1{font-size:1.18rem;font-weight:900}.c2n-title p{font-size:.84rem;color:#526173}
.c2n-actions,.c2n-row-actions,.c2n-main-acts,.c2n-modal-actions,.c2n-seg,.c2n-score,.c2n-meta,.c2n-pillbar{display:flex;flex-wrap:wrap;gap:8px;align-items:center}.c2n-btn{border:1px solid transparent;border-radius:14px;padding:11px 14px;font-weight:900;cursor:pointer;font-family:inherit;transition:.18s ease}.c2n-btn:hover:not(:disabled){transform:translateY(-1px)}.c2n-btn:disabled{opacity:.55;cursor:not-allowed}
.c2n-btn.p{background:#1358d3;color:#fff;box-shadow:0 12px 24px rgba(19,88,211,.22)}.c2n-btn.s{background:#eef2f8;color:#0f172a;border-color:#d8e0eb}.c2n-btn.g{background:#ffffff;color:#0f4c81;border-color:#bad4ea}.c2n-btn.w{background:#fff8eb;color:#9a3412;border-color:#fed7aa}
.c2n-chip{display:inline-flex;align-items:center;border:1px solid #d7e0ee;background:#fff;border-radius:999px;padding:6px 11px;font-weight:800;font-size:.79rem}.c2n-chip.strong{background:#ecfdf5;border-color:#bbf7d0;color:#166534}
.c2n-sub{color:#5a6c80;font-size:.84rem;line-height:1.45}.c2n-hero{margin-top:14px;display:grid;grid-template-columns:1.1fr .9fr;gap:12px}.c2n-hero-copy{display:grid;gap:10px}.c2n-hero-copy p{line-height:1.65}.c2n-kicker{font-size:.8rem;font-weight:900;color:#0f4c81;letter-spacing:.04em}
.c2n-start-strip{display:grid;gap:12px;border:1px solid #d7e5f5;background:linear-gradient(180deg,#ffffff 0%,#f7fbff 100%);border-radius:22px;padding:16px}.c2n-start-actions{display:flex;flex-wrap:wrap;gap:10px;align-items:center}.c2n-start-summary{display:inline-flex;align-items:center;min-height:42px;padding:0 14px;border-radius:999px;background:#f8fafc;border:1px solid #dce5f1;font-weight:800;color:#334155}
.c2n-step-strip{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.c2n-step{border:1px dashed #cfdceb;border-radius:16px;background:#fcfdff;padding:12px}.c2n-step strong{display:block;margin-bottom:4px;font-size:.84rem}
.c2n-help{border:1px dashed #d3deec;background:#fbfdff;border-radius:16px;padding:12px;line-height:1.55;color:#334155}
.c2n-layout{margin-top:14px;display:grid;grid-template-columns:minmax(0,1.45fr) minmax(300px,.85fr);gap:14px;align-items:start}.c2n-main,.c2n-sidebar{display:grid;gap:12px}
.c2n-text-top{display:flex;flex-wrap:wrap;justify-content:space-between;gap:10px;align-items:flex-start}.c2n-target{border:1px solid #d7e4f2;background:#f9fbff;border-radius:16px;padding:12px}.c2n-target p{margin-top:6px;color:#45596f;font-size:.86rem;line-height:1.45}
.c2n-grid{display:grid;gap:8px;margin-top:10px}.c2n-row{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;direction:rtl}.c2n-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:10px}
.c2n-cat{width:100%;text-align:right;border:1px solid #dbe5f2;background:#fff;border-radius:16px;padding:10px;display:grid;gap:6px;cursor:pointer;min-height:96px;transition:.18s ease}.c2n-cat:hover:not(:disabled){border-color:#93b8ff;background:#f9fbff}.c2n-cat:disabled{opacity:.58;cursor:not-allowed}.c2n-cat.sel{border-color:#1358d3;background:#eaf1ff;box-shadow:0 0 0 2px rgba(19,88,211,.11)}
.c2n-cat-top{display:flex;justify-content:space-between;gap:8px}.c2n-code{background:#eef3ff;color:#1d4ed8;border-radius:999px;padding:2px 8px;font-weight:900;font-size:.74rem}.c2n-fam{color:#64748b;font-size:.73rem;font-weight:700}.c2n-name{font-size:.82rem;font-weight:800;line-height:1.25}.c2n-badge{width:max-content;border-radius:999px;padding:2px 8px;font-weight:800;font-size:.68rem}.c2n-badge.ok{background:#ecfdf5;color:#0f766e}.c2n-badge.off{background:#f4f6fb;color:#64748b}
.c2n-sents{display:grid;gap:10px}.c2n-sent{width:100%;text-align:right;border:1px solid #dce5f2;background:#fff;border-radius:18px;padding:12px 13px;display:grid;gap:8px;cursor:pointer;transition:.18s ease}.c2n-sent:hover:not(:disabled){border-color:#9bbcff;background:#f9fbff}.c2n-sent:disabled{opacity:.75;cursor:not-allowed}
.c2n-sent-top{display:flex;justify-content:space-between;gap:8px;font-size:.75rem;font-weight:900;color:#4e647c}.c2n-sent-text{font-weight:700;line-height:1.55}.c2n-sent.sel{border-color:#1358d3;background:#eaf1ff}.c2n-sent.good{border-color:#86efac;background:#f0fdf4}.c2n-sent.bad{border-color:#fca5a5;background:#fff5f5}
.c2n-fb{border-radius:16px;padding:12px 13px;border:1px solid;font-weight:800;line-height:1.5}.c2n-fb.info{background:#eef4ff;border-color:#c8d8fb;color:#1e3a8a}.c2n-fb.success{background:#ecfdf5;border-color:#bbf7d0;color:#065f46}.c2n-fb.error{background:#fef2f2;border-color:#fecaca;color:#991b1b}
.c2n-hint,.c2n-summary-card{border:1px dashed #c9d8ef;background:#fbfdff;border-radius:16px;padding:12px;display:grid;gap:6px}.c2n-hint p{font-size:.84rem;line-height:1.45;color:#334155}
.c2n-foot{border:1px dashed #cad8ec;background:#fbfdff;border-radius:18px;padding:12px;display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px;align-items:center}.c2n-kv{display:grid;gap:6px}.c2n-kv b{font-size:.8rem;color:#64748b}
.c2n-empty{margin-top:14px;border:1px dashed #cad8ec;background:#fbfdff;border-radius:20px;padding:18px;display:grid;gap:10px;text-align:center}.c2n-empty p{color:#4d5e73;line-height:1.55}
.c2n-overlay{position:fixed;inset:0;z-index:9999;background:rgba(15,23,42,.45);backdrop-filter:blur(4px);display:flex;justify-content:center;align-items:flex-start;padding:16px;overflow:auto}.c2n-modal{width:min(960px,100%);background:#f8fbff;border:1px solid #d9e5f3;border-radius:26px;padding:16px;display:grid;gap:14px;box-shadow:0 28px 70px rgba(15,23,42,.22)}
.c2n-modal-head{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:flex-start}.c2n-modal-head h2{font-size:1.1rem;font-weight:900}.c2n-modal-head p{margin-top:5px;font-size:.86rem;color:#536579;line-height:1.45}
.c2n-settings-grid{display:grid;grid-template-columns:1.15fr .85fr;gap:12px}.c2n-settings-main,.c2n-settings-side{display:grid;gap:12px}.c2n-group{border:1px solid #d9e5f3;background:#ffffff;border-radius:18px;padding:14px;display:grid;gap:10px}.c2n-group-head{display:grid;gap:4px}.c2n-group-head h3{font-size:.94rem;font-weight:900}
.c2n-radio{display:flex;gap:8px;align-items:flex-start;border:1px solid #e3eaf5;background:#fff;border-radius:12px;padding:9px}.c2n-radio input{margin-top:3px}.c2n-radio strong{display:block;font-size:.84rem}.c2n-radio span{display:block;color:#64748b;font-size:.76rem;line-height:1.35}.c2n-radio.dim{opacity:.55}
.c2n-toggle{display:flex;gap:8px;align-items:center;font-weight:700;font-size:.84rem}.c2n-range{width:100%}.c2n-adv{border:1px dashed #c6d4e6;background:#fbfdff;border-radius:16px;padding:12px}.c2n-adv summary{cursor:pointer;font-weight:900;color:#0f4c81}
.c2n-preview{border:1px solid #cce0f0;background:linear-gradient(180deg,#f0f8ff 0%,#ffffff 100%);border-radius:18px;padding:14px;display:grid;gap:10px}.c2n-preview-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
.c2n-modal-actions{justify-content:space-between}.c2n-modal-actions .c2n-btn{min-width:120px}
@media (max-width:980px){.c2n-hero,.c2n-layout,.c2n-settings-grid{grid-template-columns:1fr}.c2n-row{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media (max-width:640px){.c2n-shell{padding:12px}.c2n-overlay{padding:10px}.c2n-list,.c2n-step-strip,.c2n-preview-grid{grid-template-columns:1fr}.c2n-actions,.c2n-row-actions,.c2n-main-acts,.c2n-modal-actions,.c2n-seg,.c2n-start-actions{display:grid;grid-template-columns:1fr}.c2n-btn,.c2n-start-summary{width:100%}.c2n-cat{min-height:72px;padding:7px}.c2n-name{font-size:.75rem}.c2n-code{font-size:.68rem}}
`;

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
const rand = (n: number) => Math.floor(Math.random() * n);

function visibleCategories(s: Settings): CategoryCode[] {
  if (s.categoryDisplay === 'all') return [...CANONICAL_BREEN_ORDER];
  const base = CANONICAL_BREEN_ORDER.filter((c) => CAT[c].family === s.categoryGroup);
  const extra = s.includeCtxVak ? (['CTX', 'VAK'] as CategoryCode[]) : [];
  return orderBreenCategories([...base, ...extra]);
}

function scenarioPool(ctx: FieldCtx): Scenario[] {
  const exact = SCENARIOS.filter((s) => s.context === ctx);
  return exact.length ? exact : SCENARIOS.filter((s) => s.context === 'general');
}

function makeRound(settings: Settings, roundNo: number, prevScenarioId: string | null): Round {
  const pool = scenarioPool(settings.fieldContext);
  let sc = settings.textSource === 'random' ? pool[rand(pool.length)] : pool[(roundNo - 1) % pool.length];
  if (settings.textSource === 'random' && pool.length > 1 && prevScenarioId && sc.id === prevScenarioId) {
    const alts = pool.filter((x) => x.id !== prevScenarioId);
    sc = alts[rand(alts.length)];
  }
  const want = clamp(settings.sentenceCount, 3, 8);
  const count = Math.min(want, sc.sentences.length);
  let part = sc.sentences;
  if (sc.sentences.length > count) {
    const maxStart = sc.sentences.length - count;
    const start = settings.textSource === 'random' ? rand(maxStart + 1) : ((roundNo - 1) % (maxStart + 1));
    part = sc.sentences.slice(start, start + count);
  }
  return { id: `${sc.id}-${roundNo}-${part[0]?.id ?? 'x'}`, scenarioId: sc.id, title: sc.title, contextLabel: sc.contextLabel, sentences: part };
}

const progressText = (n: number, rounds: RoundsChoice) => (rounds === 'infinite' ? `סבב ${n}/∞` : `סבב ${Math.min(n, rounds)}/${rounds}`);
const roundsText = (r: RoundsChoice) => (r === 'infinite' ? 'אינסופי' : String(r));
const rules = (s: Settings) => ({ showPresence: s.difficulty <= 2, exact: s.difficulty >= 4, autoHint: s.difficulty <= 2 });

export default function Classic2Trainer(): React.ReactElement {
  const trainerContract = getTrainerContract('classic2');
  const [wizardOpen, setWizardOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [draft, setDraft] = useState<Settings>(() => loadClassic2Settings());
  const [settings, setSettings] = useState<Settings>(() => loadClassic2Settings());
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [roundNo, setRoundNo] = useState(1);
  const [done, setDone] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [round, setRound] = useState<Round | null>(null);
  const [selectedCat, setSelectedCat] = useState<CategoryCode | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const [result, setResult] = useState<'pending' | 'correct' | 'wrong'>('pending');
  const scrollYRef = useRef(0);

  useEffect(() => {
    if (!wizardOpen) return;
    const { body } = document;
    const prev = { overflow: body.style.overflow, position: body.style.position, top: body.style.top, width: body.style.width };
    scrollYRef.current = window.scrollY || 0;
    body.style.overflow = 'hidden';
    body.style.position = 'fixed';
    body.style.top = `-${scrollYRef.current}px`;
    body.style.width = '100%';
    return () => {
      body.style.overflow = prev.overflow;
      body.style.position = prev.position;
      body.style.top = prev.top;
      body.style.width = prev.width;
      window.scrollTo(0, scrollYRef.current);
    };
  }, [wizardOpen]);

  useEffect(() => {
    saveClassic2Settings(settings);
  }, [settings]);

  const rr = rules(settings);
  const matches = round && selectedCat ? round.sentences.filter((s) => s.tags.includes(selectedCat)).map((s) => s.id) : [];

  const resetInteraction = (nextRound?: Round, nextSettings?: Settings) => {
    setSelectedIds([]);
    setShowHint(false);
    setShowSolution(false);
    setResult('pending');
    if (!nextRound) {
      setFeedback(null);
      return;
    }
    const baseSettings = nextSettings || settings;
    const nextVisible = visibleCategories(baseSettings);
    const auto = nextVisible.length === 1 ? nextVisible[0] : null;
    setSelectedCat(auto);
    setFeedback(auto
      ? { tone: 'info', message: `נבחרה קטגוריה אוטומטית: ${auto} / ${CAT[auto].he}. סמן/י משפט או דווח/י שאין מופע.` }
      : { tone: 'info', message: 'בחר/י קטגוריה לאימון ואז סמן/י משפט מתאים בטקסט.' });
  };

  const startPractice = (cfg: Settings) => {
    const normalized: Settings = { ...cfg, difficulty: clamp(cfg.difficulty, 1, 5), sentenceCount: clamp(cfg.sentenceCount, 3, 8) };
    const r1 = makeRound(normalized, 1, null);
    setSettings(normalized);
    setStarted(true);
    setFinished(false);
    setHelpOpen(false);
    setRoundNo(1);
    setDone(0);
    setCorrect(0);
    setRound(r1);
    setWizardOpen(false);
    resetInteraction(r1, normalized);
  };

  const applyDraftSettings = (startAfterSave = false) => {
    const normalized: Settings = { ...draft, difficulty: clamp(draft.difficulty, 1, 5), sentenceCount: clamp(draft.sentenceCount, 3, 8) };
    setSettings(normalized);
    setDraft(normalized);
    setWizardOpen(false);
    if (startAfterSave) startPractice(normalized);
  };

  const openSettings = () => {
    setDraft({ ...settings });
    setAdvancedOpen(false);
    setWizardOpen(true);
  };

  const selectCat = (code: CategoryCode) => {
    if (result !== 'pending') return;
    if (!visibleCategories(settings).includes(code)) return;
    setSelectedCat(code);
    setSelectedIds([]);
    setShowHint(false);
    setShowSolution(false);
    setFeedback({ tone: 'info', message: `קטגוריה נבחרה: ${CAT[code].he} (${code}). סמן/י משפט או דווח/י שאין מופע.` });
  };

  const toggleSentence = (id: string) => {
    if (!round || !selectedCat || result !== 'pending') return;
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const evaluate = () => {
    if (!round) return;
    if (!selectedCat) { setFeedback({ tone: 'error', message: 'בחר/י קודם קטגוריה לאימון.' }); return; }
    if (result !== 'pending') return;
    if (!selectedIds.length) {
      setFeedback({ tone: 'error', message: 'סמן/י לפחות משפט אחד או השתמש/י בכפתור "אין את הקטגוריה המבוקשת בתוך הטקסט".' });
      return;
    }
    const sel = new Set(selectedIds);
    const wrong = selectedIds.filter((id) => !matches.includes(id));
    const missed = matches.filter((id) => !sel.has(id));
    const ok = matches.length > 0 && wrong.length === 0 && (!rr.exact || missed.length === 0);
    if (ok) {
      setResult('correct');
      setFeedback({ tone: 'success', message: 'זיהוי נכון. אפשר לעבור לסבב הבא.' });
      return;
    }
    setResult('wrong');
    setFeedback({
      tone: 'error',
      message:
        matches.length === 0
          ? 'בקטגוריה הזו אין מופע בטקסט. נסה/י את כפתור "אין את הקטגוריה המבוקשת בתוך הטקסט".'
          : rr.exact && missed.length > 0
            ? 'יש סימון חלקי או שגוי. ברמה הזו צריך לסמן את כל המשפטים המתאימים.'
            : 'הסימון לא תואם לקטגוריה. נסה/י שוב או לחץ/י "רמז".'
    });
    if (rr.autoHint) setShowHint(true);
  };

  const declareNoCategory = () => {
    if (!round) return;
    if (!selectedCat) { setFeedback({ tone: 'error', message: 'בחר/י קודם קטגוריה לאימון.' }); return; }
    if (result !== 'pending') return;
    if (!matches.length) {
      setResult('correct');
      setFeedback({ tone: 'success', message: 'נכון. אין מופע של הקטגוריה המבוקשת בתוך הטקסט. אפשר לעבור לסבב הבא.' });
      return;
    }
    setResult('wrong');
    setFeedback({ tone: 'error', message: "יש לפחות מופע אחד בטקסט. נסה/י שוב או לחץ/י 'רמז'." });
    if (rr.autoHint) setShowHint(true);
  };

  const nextRound = () => {
    if (!round || result !== 'correct') return;
    const nextDone = done + 1;
    setDone(nextDone);
    setCorrect((p) => p + 1);
    if (settings.rounds !== 'infinite' && nextDone >= settings.rounds) {
      setFinished(true);
      setRound(null);
      setSelectedCat(null);
      setSelectedIds([]);
      setFeedback({ tone: 'success', message: 'התרגול הסתיים. אפשר לפתוח Settings ולהתחיל סט חדש.' });
      setShowHint(false);
      setShowSolution(false);
      setResult('pending');
      return;
    }
    const nextNo = roundNo + 1;
    const nr = makeRound(settings, nextNo, round.scenarioId);
    setRoundNo(nextNo);
    setRound(nr);
    resetInteraction(nr, settings);
  };

  const hintIdx = round && selectedCat
    ? round.sentences.map((s, i) => (s.tags.includes(selectedCat) ? i + 1 : null)).filter((n): n is number => n !== null)
    : [];

  const renderCatPicker = (cfg: Settings, interactive: boolean, compact = false) => {
    const vis = visibleCategories(cfg);
    const showPresence = rr.showPresence && !!round && cfg === settings;
    if (cfg.categoryDisplay === 'group') {
      return (
        <div className="c2n-list">
          {orderBreenCategories(vis).map((c) => {
            const present = !!round && round.sentences.some((s) => s.tags.includes(c));
            return (
              <button
                key={c}
                type="button"
                className={`c2n-cat${selectedCat === c && cfg === settings ? ' sel' : ''}`}
                onClick={() => (cfg === settings ? selectCat(c) : undefined)}
                disabled={compact ? true : !interactive}
                aria-pressed={selectedCat === c && cfg === settings}
              >
                <div className="c2n-cat-top"><span className="c2n-code">{c}</span><span className="c2n-fam">{CAT[c].familyHe}</span></div>
                <div className="c2n-name">{CAT[c].he}</div>
                {!compact && showPresence && <span className={`c2n-badge ${present ? 'ok' : 'off'}`}>{present ? 'יש בטקסט' : 'לא בטקסט'}</span>}
              </button>
            );
          })}
        </div>
      );
    }
    return (
      <div className="c2n-grid">
        {CANONICAL_BREEN_GRID_RTL.map((row, i) => (
          <div key={i} className="c2n-row">
            {row.map((c) => {
              const enabled = vis.includes(c);
              const present = !!round && round.sentences.some((s) => s.tags.includes(c));
              const sel = selectedCat === c && cfg === settings;
              return (
                <button key={c} type="button" className={`c2n-cat${sel ? ' sel' : ''}`} onClick={() => (cfg === settings ? selectCat(c) : undefined)} disabled={compact ? true : !interactive || !enabled} aria-pressed={sel}>
                  <div className="c2n-cat-top"><span className="c2n-code">{c}</span><span className="c2n-fam">{CAT[c].familyHe}</span></div>
                  <div className="c2n-name">{CAT[c].he}</div>
                  {!compact && showPresence && enabled && <span className={`c2n-badge ${present ? 'ok' : 'off'}`}>{present ? 'יש בטקסט' : 'לא בטקסט'}</span>}
                  {!compact && !enabled && <span className="c2n-badge off">מוסתר</span>}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    );
  };

  const visibleCount = visibleCategories(settings).length;
  const draftVisibleCount = visibleCategories(draft).length;
  const displayLabel = settings.categoryDisplay === 'all' ? 'טבלת ברין מלאה' : `קבוצת ${settings.categoryGroup}`;
  const draftDisplayLabel = draft.categoryDisplay === 'all' ? 'טבלת ברין מלאה' : `קבוצת ${draft.categoryGroup}`;
  const startSummary = `${settings.sentenceCount} פריטים · ${visibleCount} קטגוריות · ${displayLabel}`;
  const previewSummary = `${draft.sentenceCount} פריטים · ${draftVisibleCount} קטגוריות · ${draftDisplayLabel}`;
  const headerModeLabel = started ? progressText(roundNo, settings.rounds) : 'מוכן להתחלה מיידית';
  const primaryStartLabel = started ? 'התחל סשן חדש' : trainerContract.startActionLabel;
  const helperSteps = trainerContract.helperSteps?.length ? [...trainerContract.helperSteps] : [
    { title: '1. בחר/י או השאר/י ברירת מחדל', description: 'אפשר להתחיל ישר או לכוונן עומס, תצוגה וקטגוריות.' },
    { title: '2. קרא/י ועבוד/י בתוך הטקסט', description: 'בחר/י קטגוריה אחת ונסה/י לזהות איפה היא באמת מופיעה.' },
    { title: '3. בדוק/י, למד/י והמשך/י', description: 'קבל/י משוב, פתח/י רמז או פתרון, ואז עבור/י לסבב הבא.' },
  ];
  const processSteps = trainerContract.processSteps?.length ? [...trainerContract.processSteps] : [];
  const clarityCards = [
    {
      kicker: 'מה קורה בפועל',
      title: 'בוחרים קטגוריה אחת ומחפשים אותה בטקסט אמיתי',
      body: <p>המטרה איננה תחושה כללית של "נדמה לי שזה שם", אלא סימון מדויק של כל המקומות שבהם הקטגוריה באמת מופיעה.</p>
    },
    {
      kicker: 'למה לשים לב',
      title: 'עובדים מול טבלת ברין יציבה',
      body: <p>הסדר לא קופץ בין סשנים, ולכן לומדים לבנות זיכרון עבודה ברור: קטגוריה, טקסט, בדיקה, והמשך.</p>
    },
    {
      kicker: 'מה מרוויחים',
      title: 'דיוק שאפשר לקחת לטקסט הבא',
      body: <p>אחרי כל סבב רואים מיד אם הזיהוי היה מלא, חלקי או שגוי, ולומדים למה. זה הופך קריאה אינטואיטיבית לקריאה בדיקה.</p>
    }
  ];
  const currentActionTitle = !started
    ? 'מתחילים מהכפתור הראשי'
    : finished
      ? 'הסשן הסתיים'
      : selectedCat
        ? `עובדים עכשיו על ${selectedCat} / ${CAT[selectedCat].he}`
        : 'השלב הבא: לבחור קטגוריה';
  const currentActionBody = !started
    ? 'הברירות כבר מוכנות. אפשר להתחיל מיד, או לפתוח הגדרות אם רוצים למקד תחום, עומס או מצב תצוגה.'
    : finished
      ? 'אפשר להפעיל שוב את אותו סט, או לעדכן הגדרות לפני הסשן הבא.'
      : selectedCat
        ? `${CAT[selectedCat].hint} ${CAT[selectedCat].note ?? ''}`.trim()
        : 'בחר/י קטגוריה אחת מתוך טבלת ברין הקנונית, ואז סמן/י את כל המשפטים שבהם היא באמת מופיעה.';
  const supportStatus = !started ? 'הדף מוכן להתחלה' : finished ? 'סשן הושלם' : progressText(roundNo, settings.rounds);
  const summaryGrid = (
    <div className="c2n-preview-grid">
      <div className="c2n-kv"><b>תחום</b><span>{CTX_LABEL[settings.fieldContext]}</span></div>
      <div className="c2n-kv"><b>תצוגה</b><span>{displayLabel}</span></div>
      <div className="c2n-kv"><b>עומס</b><span>{settings.sentenceCount} משפטים · {roundsText(settings.rounds)} סבבים</span></div>
      <div className="c2n-kv"><b>בדיקה</b><span>{rr.exact ? 'מלאה' : 'גמישה'}</span></div>
    </div>
  );
  const previewGrid = (
    <div className="c2n-preview-grid">
      <div className="c2n-kv"><b>תחום</b><span>{CTX_LABEL[draft.fieldContext]}</span></div>
      <div className="c2n-kv"><b>מצב</b><span>{draftDisplayLabel}</span></div>
      <div className="c2n-kv"><b>סבבים</b><span>{roundsText(draft.rounds)}</span></div>
      <div className="c2n-kv"><b>קושי</b><span>{draft.difficulty}/5</span></div>
    </div>
  );
  const settingsSectionMap: Record<string, TrainerSettingsSection> = {
    'what-to-practice': {
      id: 'what-to-practice',
      title: 'מה לתרגל',
      help: 'תחום הטקסט קובע את האווירה והדוגמאות של הסבב.',
      content: (
        <div className="c2n-seg">
          {(Object.keys(CTX_LABEL) as FieldCtx[]).map((c) => (
            <button key={c} type="button" className={`c2n-btn ${draft.fieldContext === c ? 'p' : 's'}`} onClick={() => setDraft((p) => ({ ...p, fieldContext: c }))}>
              {CTX_LABEL[c]}
            </button>
          ))}
        </div>
      )
    },
    'session-load': {
      id: 'session-load',
      title: 'עומס / גודל סשן',
      help: 'כמה משפטים יהיו בכל טקסט וכמה סבבים יכלול הסשן.',
      content: (
        <>
          <div className="c2n-kv"><b>משפטים בטקסט</b><span>{draft.sentenceCount}</span></div>
          <input className="c2n-range" type="range" min={3} max={8} step={1} value={draft.sentenceCount} onChange={(e) => setDraft((p) => ({ ...p, sentenceCount: Number(e.target.value) }))} />
          <div className="c2n-seg">
            {[5, 10, 'infinite'].map((r) => (
              <button key={String(r)} type="button" className={`c2n-btn ${draft.rounds === r ? 'p' : 's'}`} onClick={() => setDraft((p) => ({ ...p, rounds: r as RoundsChoice }))}>
                {r === 'infinite' ? 'אינסופי' : r}
              </button>
            ))}
          </div>
        </>
      )
    },
    'display-mode': {
      id: 'display-mode',
      title: 'מצב תצוגה',
      help: 'אפשר לעבוד עם כל הטבלה בסדר הקנוני או עם קבוצה ממוקדת.',
      content: (
        <>
          <label className="c2n-radio">
            <input type="radio" name="disp" checked={draft.categoryDisplay === 'all'} onChange={() => setDraft((p) => ({ ...p, categoryDisplay: 'all' }))} />
            <div><strong>כל הקטגוריות</strong><span>אותו סדר קבוע בכל סשן.</span></div>
          </label>
          <label className="c2n-radio">
            <input type="radio" name="disp" checked={draft.categoryDisplay === 'group'} onChange={() => setDraft((p) => ({ ...p, categoryDisplay: 'group' }))} />
            <div><strong>קבוצה אחת</strong><span>מיקוד ב- DIS / GEN / DEL.</span></div>
          </label>
        </>
      )
    },
    categories: {
      id: 'categories',
      title: 'קטגוריות',
      help: 'במצב קבוצתי בוחרים קבוצה פעילה. אפשר לצרף גם CTX + VAK.',
      content: (
        <>
          <div className="c2n-seg">
            {(['GEN', 'DIS', 'DEL'] as GroupCode[]).map((g) => (
              <button key={g} type="button" className={`c2n-btn ${draft.categoryGroup === g ? 'p' : 's'}`} onClick={() => setDraft((p) => ({ ...p, categoryGroup: g }))}>
                {g}
              </button>
            ))}
          </div>
          <label className="c2n-toggle">
            <input type="checkbox" checked={draft.includeCtxVak} onChange={(e) => setDraft((p) => ({ ...p, includeCtxVak: e.target.checked }))} />
            כולל CTX + VAK
          </label>
        </>
      )
    },
    difficulty: {
      id: 'difficulty',
      title: 'קושי',
      help: 'משפיע על רמזי נוכחות, קשיחות הבדיקה, ורמז אוטומטי אחרי שגיאה.',
      advanced: true,
      content: (
        <>
          <div className="c2n-chip">{draft.difficulty}/5</div>
          <input className="c2n-range" type="range" min={1} max={5} step={1} value={draft.difficulty} onChange={(e) => setDraft((p) => ({ ...p, difficulty: Number(e.target.value) }))} />
        </>
      )
    },
    'text-source': {
      id: 'text-source',
      title: 'מקור טקסט',
      help: 'מוכן להרחבה לטריינרים נוספים באותה מעטפת הגדרות.',
      advanced: true,
      content: (
        <>
          <label className="c2n-radio">
            <input type="radio" name="src" checked={draft.textSource === 'built_in'} onChange={() => setDraft((p) => ({ ...p, textSource: 'built_in' }))} />
            <div><strong>סט תרגול מובנה</strong><span>רצף תרחישים לפי הקשר.</span></div>
          </label>
          <label className="c2n-radio">
            <input type="radio" name="src" checked={draft.textSource === 'random'} onChange={() => setDraft((p) => ({ ...p, textSource: 'random' }))} />
            <div><strong>בחירה אקראית</strong><span>דילוג בין תרחישים וחלונות טקסט.</span></div>
          </label>
          <label className="c2n-radio dim">
            <input type="radio" name="src" disabled />
            <div><strong>הדבקה ידנית</strong><span>מוכן לשלב עתידי.</span></div>
          </label>
        </>
      )
    }
  };
  const orderedSettingsIds = trainerContract.settingsGroups?.length ? trainerContract.settingsGroups : Object.keys(settingsSectionMap);
  const settingsSections: TrainerSettingsSection[] = [
    ...orderedSettingsIds.map((id) => settingsSectionMap[id]).filter(Boolean),
    ...Object.values(settingsSectionMap).filter((section) => !orderedSettingsIds.includes(section.id))
  ];
  const mainContent = !started ? (
    <TrainerEmptyState
      title="הסשן עוד לא התחיל"
      body={<p>לחץ/י על &quot;התחל סבב&quot; כדי להיכנס ישר לתרגול עם ההגדרות הנוכחיות, או פתח/י הגדרות כדי לשנות תחום, עומס או תצוגת קטגוריות.</p>}
    />
  ) : started && finished ? (
    <section className="c2n-card">
      <h3 style={{ fontSize: '1rem', fontWeight: 900 }}>סיכום תרגול</h3>
      <div className="c2n-sub" style={{ marginTop: 4 }}>הושלמו {done} סבבים ({correct} נכונים) · הקשר: {CTX_LABEL[settings.fieldContext]} · רמה: {settings.difficulty}/5</div>
      <div className="c2n-row-actions">
        <button type="button" className="c2n-btn p" onClick={() => startPractice(settings)}>הפעל שוב עם אותן הגדרות</button>
        <button type="button" className="c2n-btn g" onClick={openSettings}>עדכן הגדרות</button>
      </div>
    </section>
  ) : started && round ? (
    <section className="c2n-card">
      <div className="c2n-text-top">
        <div>
          <h3 style={{ fontSize: '1.02rem', fontWeight: 900 }}>{round.title}</h3>
          <div className="c2n-sub">סבב {roundNo} · {round.contextLabel} · {round.sentences.length} משפטים</div>
        </div>
        <div className="c2n-meta">
          <span className="c2n-chip">רמה {settings.difficulty}/5</span>
          <span className="c2n-chip">{displayLabel}</span>
          {rr.exact && <span className="c2n-chip">בדיקה מלאה</span>}
        </div>
      </div>

      <div className="c2n-target" style={{ marginTop: 12 }}>
        <strong>{selectedCat ? `הקטגוריה הפעילה: ${selectedCat} / ${CAT[selectedCat].he}` : 'הצעד הראשון: בחר/י קטגוריה ממפת ברין שבצד'}</strong>
        <p>{selectedCat ? CAT[selectedCat].hint : 'לאחר הבחירה אפשר לסמן משפט אחד או יותר, או לדווח שאין מופע כזה בטקסט.'}</p>
        {selectedCat && CAT[selectedCat].note && <p style={{ fontWeight: 800, color: '#0d3fae' }}>{CAT[selectedCat].note}</p>}
      </div>

      <div className="c2n-sents" style={{ marginTop: 12 }}>
        {round.sentences.map((s, i) => {
          const sel = selectedIds.includes(s.id);
          const isMatch = !!selectedCat && s.tags.includes(selectedCat);
          const showGood = !!selectedCat && (showSolution || result === 'correct') && isMatch;
          const showBad = result === 'wrong' && sel && !isMatch;
          return (
            <button key={s.id} type="button" className={`c2n-sent${sel ? ' sel' : ''}${showGood ? ' good' : ''}${showBad ? ' bad' : ''}`} onClick={() => toggleSentence(s.id)} disabled={!selectedCat || result !== 'pending'} aria-pressed={sel}>
              <div className="c2n-sent-top">
                <span>משפט {i + 1}</span>
                <span>{showGood ? 'נכון' : showBad ? 'לא מתאים' : sel ? 'מסומן' : 'לחיץ'}</span>
              </div>
              <span className="c2n-sent-text">{s.text}</span>
            </button>
          );
        })}
      </div>

      <div className="c2n-row-actions">
        <button type="button" className="c2n-btn p" onClick={evaluate} disabled={!selectedCat || result !== 'pending'}>בדוק תשובה</button>
        <button type="button" className="c2n-btn w" onClick={declareNoCategory} disabled={!selectedCat || result !== 'pending'}>אין את הקטגוריה בטקסט</button>
        <button type="button" className="c2n-btn s" onClick={() => { setSelectedIds([]); setResult('pending'); setShowHint(false); setShowSolution(false); setFeedback(selectedCat ? { tone: 'info', message: 'נוקה הסימון. אפשר לנסות שוב.' } : { tone: 'info', message: 'בחר/י קטגוריה כדי להתחיל.' }); }}>נקה סימון</button>
        <button type="button" className="c2n-btn g" onClick={() => setShowHint(true)} disabled={!selectedCat}>רמז</button>
        <button type="button" className="c2n-btn g" onClick={() => setShowSolution(true)} disabled={!selectedCat}>פתרון</button>
      </div>

      {feedback && <div className={`c2n-fb ${feedback.tone}`}>{feedback.message}</div>}

      {showHint && selectedCat && (
        <div className="c2n-hint">
          <h4 style={{ fontSize: '.88rem', fontWeight: 900 }}>רמז</h4>
          <p>{CAT[selectedCat].hint}</p>
          {hintIdx.length ? <p>בדוק/י במיוחד את משפט{hintIdx.length > 1 ? 'ים' : ''}: {hintIdx.join(', ')}.</p> : <p>ייתכן שאין מופע של הקטגוריה הזו בטקסט.</p>}
        </div>
      )}

      {showSolution && selectedCat && (
        <div className="c2n-hint">
          <h4 style={{ fontSize: '.88rem', fontWeight: 900 }}>פתרון</h4>
          {hintIdx.length
            ? <p>המופעים של {selectedCat} / {CAT[selectedCat].he} נמצאים במשפט{hintIdx.length > 1 ? 'ים' : ''}: {hintIdx.join(', ')}.</p>
            : <p>אין מופע של {selectedCat} / {CAT[selectedCat].he} בטקסט הזה.</p>}
        </div>
      )}

      <div className="c2n-foot">
        <div className="c2n-score">
          <span className="c2n-chip">הושלמו: {done}</span>
          <span className="c2n-chip">נכונים: {correct + (result === 'correct' ? 1 : 0)}</span>
          <span className="c2n-chip">סבבים: {roundsText(settings.rounds)}</span>
        </div>
        <button type="button" className="c2n-btn p" onClick={nextRound} disabled={result !== 'correct'}>{settings.rounds === 'infinite' ? 'סבב הבא (∞)' : 'סבב הבא'}</button>
      </div>
    </section>
  ) : (
    <TrainerEmptyState title="אין כרגע סבב פעיל" body={<p>פתח/י סשן חדש או עדכן/י הגדרות כדי להמשיך.</p>} />
  );
  const supportContent = (
    <>
      <TrainerSupportCard title="מה קורה עכשיו" subtitle={supportStatus}>
        <p>{currentActionTitle}</p>
        <p>{currentActionBody}</p>
        <button type="button" className="trp-btn is-ghost" onClick={() => setHelpOpen((v) => !v)} aria-expanded={helpOpen}>
          {helpOpen ? 'הסתר הסבר קצר' : 'פתח הסבר קצר'}
        </button>
        {helpOpen ? <div className="c2n-help">1. בחר/י או השאר/י ברירת מחדל. 2. קרא/י את הטקסט וסמן/י רק את מה שמתאים לקטגוריה. 3. בדוק/י, קבל/י משוב, ועבור/י לסבב הבא.</div> : null}
      </TrainerSupportCard>

      {processSteps.length ? (
        <TrainerSupportCard title="תהליך העבודה" subtitle="אותו מהלך חוצה סשנים, כדי שהעין תלמד איפה היא נמצאת עכשיו.">
          <div className="c2n-kv" style={{ gap: 10 }}>
            {processSteps.map((step) => (
              <div key={step.id}>
                <b>{step.label}</b>
                <span>{step.description}</span>
              </div>
            ))}
          </div>
        </TrainerSupportCard>
      ) : null}

      <TrainerSupportCard
        title="מפת הקטגוריות"
        subtitle={trainerContract.supportRailMode === 'breen-map' && settings.categoryDisplay === 'all'
          ? 'כל הקטגוריות נשמרות תמיד באותו סדר RTL. המיקום לא קופץ בין סשנים.'
          : `מצב ממוקד: ${settings.categoryGroup}${settings.includeCtxVak ? ' + CTX/VAK' : ''}.`}
      >
        {started && !finished ? renderCatPicker(settings, result === 'pending') : renderCatPicker(settings, false, true)}
      </TrainerSupportCard>

      <TrainerSupportCard title="הסשן הנוכחי יהיה…" subtitle="הסיכום מתעדכן מיד אחרי כל שמירה בהגדרות.">
        {summaryGrid}
      </TrainerSupportCard>
    </>
  );

  return (
    <div className="c2n" dir="rtl" lang="he">
      <style>{`${TRAINER_PLATFORM_CSS}\n${CSS}`}</style>
      <TrainerPlatformShell
        trainerId="classic2"
        title={trainerContract.title}
        subtitle={trainerContract.subtitle}
        headerKicker={trainerContract.familyLabel}
        modePill={<span className="trp-mode-pill">{headerModeLabel}</span>}
        headerActions={
          <button type="button" className="trp-btn is-secondary" onClick={() => setHelpOpen((v) => !v)} aria-expanded={helpOpen}>
            {helpOpen ? 'הסתר הסבר' : 'איך זה עובד'}
          </button>
        }
        purposeKicker="מה עושים כאן?"
        purposeTitle="מאמנים עין יציבה על קטגוריה אחת בתוך טקסט אמיתי"
        purposeBody={
          <p>
            בכל סבב בוחרים קטגוריה מתוך טבלת ברין, קוראים טקסט קצר, ומסמנים את כל המשפטים שבהם הקטגוריה באמת מופיעה.
            הצלחה בסבב היא לא רק &quot;להרגיש שזה שם&quot;, אלא לזהות נכון או לדעת לומר בביטחון שאין מופע כזה בטקסט.
          </p>
        }
        purposeTags={
          <>
            <span className="c2n-chip">סדר קנוני קבוע</span>
            <span className="c2n-chip">ברירות מחדל מוכנות</span>
            <span className="c2n-chip">מתאים לדסקטופ ולמובייל</span>
          </>
        }
        startKicker={trainerContract.quickStartLabel}
        startTitle="אפשר להתחיל מיד"
        startBody={<p>Classic 2 נטען עם ברירות מחדל שמישות. ההגדרות הן התאמה אישית, לא שער כניסה.</p>}
        startActions={
          <>
            <button type="button" className="trp-btn is-primary" data-trainer-action="start-session" onClick={() => startPractice(settings)}>{primaryStartLabel}</button>
            <button type="button" className="trp-btn is-secondary" data-trainer-action="open-settings" onClick={openSettings}>הגדרות</button>
            <span className="trp-summary-pill" data-trainer-summary="current">{startSummary}</span>
          </>
        }
        startMeta={
          <>
            <span className="c2n-chip">תחום: {CTX_LABEL[settings.fieldContext]}</span>
            <span className="c2n-chip">רמה: {settings.difficulty}/5</span>
            <span className="c2n-chip">סבבים: {roundsText(settings.rounds)}</span>
          </>
        }
        clarityCards={clarityCards}
        closingNote={<p>הצלחה במסך הזה נראית כמו ידיעה ברורה מה מחפשים, איפה בודקים, ומה ייחשב תשובה מדויקת עוד לפני הלחיצה על תחילת הסשן.</p>}
        helperSteps={helperSteps}
        supportRailMode={trainerContract.supportRailMode}
        mobilePriorityOrder={trainerContract.mobilePriorityOrder}
        main={mainContent}
        support={supportContent}
      />

      <TrainerSettingsShell
        trainerId="classic2"
        open={wizardOpen}
        title={trainerContract.settingsTitle}
        subtitle={trainerContract.settingsSubtitle}
        summaryPill={<span className="trp-summary-pill">{previewSummary}</span>}
        preview={
          <>
            {previewGrid}
            <section className="c2n-group">
              <div className="c2n-group-head">
                <h3>סדר הקטגוריות</h3>
                <p className="c2n-sub">תמיד אותו מקור אמת. גם בתצוגה חלקית הסדר נשמר.</p>
              </div>
              {renderCatPicker(draft, false, true)}
            </section>
          </>
        }
        sections={settingsSections}
        advancedOpen={advancedOpen}
        onAdvancedToggle={setAdvancedOpen}
        onClose={() => setWizardOpen(false)}
        onResetDefaults={() => setDraft({ ...DEFAULTS })}
        onCancel={() => setWizardOpen(false)}
        footerNote="ברירת המחדל המהירה שומרת על זרימת התחלה מיידית, אבל אפשר לרדת גם לעומק דרך הקבוצות והקושי."
        footerActions={
          <>
            <button type="button" className="trp-btn is-ghost" data-trainer-preset="compact" onClick={() => setDraft({ ...QUICK })}>ברירת מחדל מהירה</button>
            <button type="button" className="trp-btn is-secondary" data-trainer-preset="standard" onClick={() => setDraft({ ...DEFAULTS })}>איפוס מלא</button>
            <button type="button" className="trp-btn is-primary" data-trainer-action={started ? 'save-settings' : 'save-start'} onClick={() => applyDraftSettings(!started)}>
              {started ? 'שמור הגדרות' : 'שמור והתחל סשן'}
            </button>
          </>
        }
      />
    </div>
  );
}
