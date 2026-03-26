import React, { useEffect, useRef, useState } from 'react';

import { CANONICAL_BREEN_GRID_RTL, CANONICAL_BREEN_ORDER, orderBreenCategories, type CanonicalBreenCode } from '../config/canonicalBreenOrder';
import { getTrainerContract } from '../config/trainerContract';
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
type RunMode = 'learning' | 'test';
type PlayOverlay = 'map' | 'help';
type PlayFamily = GroupCode | 'EXTRA';

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

const GROUP_ORDER: GroupCode[] = ['DIS', 'GEN', 'DEL'];

const GROUP_META: Record<GroupCode, { he: string; subtitle: string; tone: 'distortion' | 'generalization' | 'deletion' }> = {
  DIS: { he: 'עיוות', subtitle: 'מחפשים משמעות שנוספה מעבר למה שנאמר בפועל.', tone: 'distortion' },
  GEN: { he: 'הכללה', subtitle: 'מחפשים כללים, חובה, תמיד, או שיפוט בלי מקור ברור.', tone: 'generalization' },
  DEL: { he: 'מחיקה', subtitle: 'מחזירים שחקנים, פעולה או מידע שחסר בתוך המשפט.', tone: 'deletion' }
};

const PLAY_FAMILY_ORDER: PlayFamily[] = ['DIS', 'GEN', 'DEL', 'EXTRA'];

const AUX_META: Record<'CTX' | 'VAK', { he: string; subtitle: string; tone: 'context' }> = {
  CTX: { he: 'הקשר', subtitle: 'זמן, מקום או מצב שממקמים את הטקסט.', tone: 'context' },
  VAK: { he: 'חושי', subtitle: 'ערוצי ראייה, שמיעה ותחושה בתוך המשפט.', tone: 'context' }
};

const EXTRA_META = {
  he: 'עוד קטגוריות',
  subtitle: 'הקשר וערוצי חישה שנעים מעט מחוץ לשלוש המשפחות הראשיות.',
  tone: 'extra' as const
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
.c2n{direction:rtl;font-family:"Assistant","Rubik","Segoe UI",sans-serif;color:#10233e;max-width:1280px;margin:0 auto}
.c2n *{box-sizing:border-box}.c2n-shell{background:radial-gradient(circle at top right,rgba(245,158,11,.18),transparent 28%),radial-gradient(circle at left top,rgba(59,130,246,.14),transparent 34%),linear-gradient(180deg,#f6f8fc 0%,#fcfdff 100%);border:1px solid #dbe4f0;border-radius:30px;padding:18px;box-shadow:0 28px 60px rgba(15,23,42,.08)}
.c2n h1,.c2n h2,.c2n h3,.c2n h4,.c2n p{margin:0}.c2n-card{background:rgba(255,255,255,.92);border:1px solid #dde6f2;border-radius:22px;padding:16px;box-shadow:0 16px 36px rgba(15,23,42,.05)}
.c2n-top{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:12px}.c2n-title h1{font-size:1.18rem;font-weight:900}.c2n-title p{font-size:.84rem;color:#526173}
.c2n-actions,.c2n-row-actions,.c2n-main-acts,.c2n-modal-actions,.c2n-seg,.c2n-score,.c2n-meta,.c2n-pillbar{display:flex;flex-wrap:wrap;gap:8px;align-items:center}.c2n-btn{border:1px solid transparent;border-radius:14px;padding:11px 14px;font-weight:900;cursor:pointer;font-family:inherit;transition:.18s ease}.c2n-btn:hover:not(:disabled){transform:translateY(-1px)}.c2n-btn:disabled{opacity:.55;cursor:not-allowed}
.c2n-btn.p{background:#1358d3;color:#fff;box-shadow:0 12px 24px rgba(19,88,211,.22)}.c2n-btn.s{background:#eef2f8;color:#0f172a;border-color:#d8e0eb}.c2n-btn.g{background:#ffffff;color:#0f4c81;border-color:#bad4ea}.c2n-btn.w{background:#fff8eb;color:#9a3412;border-color:#fed7aa}
.c2n-chip{display:inline-flex;align-items:center;border:1px solid #d7e0ee;background:#fff;border-radius:999px;padding:6px 11px;font-weight:800;font-size:.79rem}.c2n-chip.strong{background:#ecfdf5;border-color:#bbf7d0;color:#166534}
.c2n-sub{color:#5a6c80;font-size:.84rem;line-height:1.45}.c2n-hero{margin-top:14px;display:grid;grid-template-columns:1.1fr .9fr;gap:12px}.c2n-hero-copy{display:grid;gap:10px}.c2n-hero-copy p{line-height:1.65}.c2n-kicker{font-size:.8rem;font-weight:900;color:#0f4c81;letter-spacing:.04em}
.c2n-start-strip{display:grid;gap:12px;border:1px solid #d7e5f5;background:linear-gradient(180deg,#ffffff 0%,#f7fbff 100%);border-radius:22px;padding:16px}.c2n-start-actions{display:flex;flex-wrap:wrap;gap:10px;align-items:center}.c2n-start-summary{display:inline-flex;align-items:center;min-height:42px;padding:0 14px;border-radius:999px;background:#f8fafc;border:1px solid #dce5f1;font-weight:800;color:#334155}
.c2n-step-strip{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.c2n-step{border:1px dashed #cfdceb;border-radius:16px;background:#fcfdff;padding:12px}.c2n-step strong{display:block;margin-bottom:4px;font-size:.84rem}
.c2n-help{border:1px dashed #d3deec;background:#fbfdff;border-radius:16px;padding:12px;line-height:1.55;color:#334155}
.c2n-layout{margin-top:14px;display:grid;grid-template-columns:minmax(0,1.45fr) minmax(300px,.85fr);gap:14px;align-items:start}.c2n-main,.c2n-sidebar{display:grid;gap:12px}
.c2n-home-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.c2n-home-grid.single{grid-template-columns:1fr}.c2n-mode-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.c2n-mode-card{display:grid;gap:8px;align-content:start;border:1px solid #d8e5f5;background:#fff;border-radius:18px;padding:14px}
.c2n-mode-card strong{font-size:1rem}.c2n-mode-card p,.c2n-mode-card small{color:#516375;line-height:1.5}.c2n-mode-card small{font-weight:700}.c2n-tone-pill{display:inline-flex;align-items:center;gap:8px;width:max-content;border-radius:999px;padding:7px 12px;font-size:.78rem;font-weight:900;border:1px solid}
.c2n-tone-pill.green{background:#ecfdf5;color:#166534;border-color:#86efac}.c2n-tone-pill.amber{background:#fffbeb;color:#b45309;border-color:#fcd34d}.c2n-tone-pill.red{background:#fef2f2;color:#b91c1c;border-color:#fca5a5}
.c2n-text-top{display:flex;flex-wrap:wrap;justify-content:space-between;gap:10px;align-items:flex-start}.c2n-target{border:1px solid #d7e4f2;background:#f9fbff;border-radius:16px;padding:12px}.c2n-target p{margin-top:6px;color:#45596f;font-size:.86rem;line-height:1.45}
.c2n-grid{display:grid;gap:8px;margin-top:10px}.c2n-row{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;direction:rtl}.c2n-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:10px}
.c2n-cat{width:100%;text-align:right;border:1px solid #dbe5f2;background:rgba(255,255,255,.92);border-radius:18px;padding:12px;display:grid;gap:8px;cursor:pointer;min-height:90px;transition:.18s ease}.c2n-cat:hover:not(:disabled){border-color:#a7c1f9;background:#fbfdff;transform:translateY(-1px)}.c2n-cat:disabled{opacity:.58;cursor:not-allowed}.c2n-cat.sel{border-color:#1358d3;background:#edf3ff;box-shadow:0 0 0 2px rgba(19,88,211,.09)}
.c2n-cat-top{display:grid;gap:6px}.c2n-cat-meta{display:flex;justify-content:space-between;gap:8px;align-items:center;flex-wrap:wrap}.c2n-code{background:rgba(239,244,255,.9);color:#6b7a90;border:1px solid #d6e0ef;border-radius:999px;padding:1px 7px;font-weight:800;font-size:.63rem;letter-spacing:.02em}.c2n-fam{color:#64748b;font-size:.72rem;font-weight:800}.c2n-name{font-size:.9rem;font-weight:900;line-height:1.28;color:#13253f}.c2n-badge{width:max-content;border-radius:999px;padding:3px 8px;font-weight:800;font-size:.68rem}.c2n-badge.ok{background:#ecfdf5;color:#0f766e}.c2n-badge.off{background:#f4f6fb;color:#64748b}
.c2n-sents{display:grid;gap:10px}.c2n-sent{width:100%;text-align:right;border:1px solid #dce5f2;background:rgba(255,255,255,.88);border-radius:18px;padding:13px 14px;display:grid;gap:10px;cursor:pointer;transition:.18s ease;box-shadow:0 10px 24px rgba(15,23,42,.03)}.c2n-sent:hover:not(:disabled){border-color:#9bbcff;background:#fbfdff;transform:translateY(-1px)}.c2n-sent:disabled{opacity:.84;cursor:not-allowed}
.c2n-sent-top{display:flex;justify-content:space-between;gap:8px;font-size:.76rem;font-weight:900;color:#4e647c;align-items:center}.c2n-sent-index{display:inline-flex;align-items:center;justify-content:center;min-width:32px;height:32px;border-radius:999px;background:#eef4ff;color:#1d4ed8;font-size:.8rem}.c2n-sent-state{color:#667892;font-size:.74rem}.c2n-sent-text{font-weight:700;line-height:1.62;font-size:.95rem}.c2n-sent.sel{border-color:#1358d3;background:#edf3ff;box-shadow:0 0 0 2px rgba(19,88,211,.08)}.c2n-sent.good{border-color:#86efac;background:#f0fdf4}.c2n-sent.bad{border-color:#fca5a5;background:#fff5f5}
.c2n-fb{border-radius:18px;padding:14px;border:1px solid;font-weight:800;line-height:1.6}.c2n-fb.info{background:#eef4ff;border-color:#c8d8fb;color:#1e3a8a}.c2n-fb.success{background:#ecfdf5;border-color:#bbf7d0;color:#065f46}.c2n-fb.error{background:#fef2f2;border-color:#fecaca;color:#991b1b}
.c2n-hint,.c2n-summary-card{border:1px dashed #c9d8ef;background:#fbfdff;border-radius:18px;padding:13px;display:grid;gap:6px}.c2n-hint p{font-size:.84rem;line-height:1.5;color:#334155}
.c2n-foot{border:1px dashed #cad8ec;background:#fbfdff;border-radius:18px;padding:12px;display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px;align-items:center}.c2n-kv{display:grid;gap:6px}.c2n-kv b{font-size:.8rem;color:#64748b}
.c2n-play-screen{display:grid}
.c2n-play-shell{display:grid;gap:18px;background:linear-gradient(180deg,rgba(255,255,255,.96) 0%,rgba(248,250,255,.98) 100%);padding:22px;border-radius:30px;box-shadow:0 24px 48px rgba(15,23,42,.06)}
.c2n-play-top{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:16px;align-items:start}
.c2n-play-title{display:grid;gap:6px}
.c2n-play-title h2{font-size:1.26rem;font-weight:900;line-height:1.2}
.c2n-play-toolbar{display:grid;justify-items:end;gap:12px}
.c2n-play-stats,.c2n-play-tools,.c2n-family-tabs,.c2n-category-strip,.c2n-action-strip,.c2n-dock-summary{display:flex;flex-wrap:wrap;gap:10px;align-items:center}
.c2n-play-stat{display:inline-flex;align-items:center;gap:8px;border-radius:999px;padding:7px 12px;background:rgba(247,250,255,.96);border:1px solid #dce5f1;font-weight:800;color:#44556d}
.c2n-play-stat strong{color:#10233e}
.c2n-tool-btn{border:1px solid #dbe4f0;background:rgba(255,255,255,.78);border-radius:999px;padding:8px 12px;font-weight:800;color:#3b526f;cursor:pointer;font-family:inherit;transition:.18s ease}
.c2n-tool-btn:hover{border-color:#9fb8ef;background:#fff;color:#123761}
.c2n-family-rail{display:grid;gap:12px}
.c2n-family-head{display:flex;justify-content:space-between;gap:14px;align-items:flex-end;flex-wrap:wrap}
.c2n-family-head strong{font-size:.98rem}
.c2n-family-tabs{gap:12px}
.c2n-family-tab{display:grid;gap:4px;min-width:154px;padding:12px 14px;border-radius:20px;border:1px solid transparent;background:rgba(248,250,255,.9);cursor:pointer;text-align:right;font-family:inherit;transition:.18s ease}
.c2n-family-tab:hover:not(:disabled){transform:translateY(-1px)}
.c2n-family-tab:disabled{opacity:.42;cursor:not-allowed}
.c2n-family-tab span{font-size:.98rem;font-weight:900;line-height:1.2}
.c2n-family-tab small{font-size:.73rem;color:#64748b;font-weight:700}
.c2n-family-tab.is-distortion{background:linear-gradient(180deg,#f6f2ff 0%,#ffffff 100%);border-color:#ddd2fb}
.c2n-family-tab.is-generalization{background:linear-gradient(180deg,#effbff 0%,#ffffff 100%);border-color:#cde7f5}
.c2n-family-tab.is-deletion{background:linear-gradient(180deg,#f4fbf3 0%,#ffffff 100%);border-color:#d7ecd8}
.c2n-family-tab.is-extra{background:linear-gradient(180deg,#fff8ef 0%,#ffffff 100%);border-color:#f4dcb4}
.c2n-family-tab.is-active{box-shadow:0 0 0 2px rgba(15,23,42,.06),0 12px 24px rgba(15,23,42,.05)}
.c2n-family-tab.is-active.is-distortion{box-shadow:0 0 0 2px rgba(109,40,217,.10),0 14px 26px rgba(109,40,217,.08)}
.c2n-family-tab.is-active.is-generalization{box-shadow:0 0 0 2px rgba(13,148,136,.10),0 14px 26px rgba(13,148,136,.08)}
.c2n-family-tab.is-active.is-deletion{box-shadow:0 0 0 2px rgba(22,101,52,.10),0 14px 26px rgba(22,101,52,.08)}
.c2n-family-tab.is-active.is-extra{box-shadow:0 0 0 2px rgba(194,120,3,.10),0 14px 26px rgba(194,120,3,.08)}
.c2n-category-rail{display:grid;gap:12px;padding:14px 16px;border-radius:24px;background:rgba(247,250,255,.82);border:1px solid #e0e8f4}
.c2n-category-pill{display:inline-flex;align-items:center;justify-content:center;min-height:52px;padding:0 16px;border-radius:999px;border:1px solid #dbe4f0;background:rgba(255,255,255,.9);cursor:pointer;text-align:center;font-family:inherit;font-weight:900;font-size:.93rem;color:#17304f;transition:.18s ease}
.c2n-category-pill:hover:not(:disabled){transform:translateY(-1px);background:#fff}
.c2n-category-pill:disabled{opacity:.56;cursor:not-allowed}
.c2n-category-pill.is-active{color:#10233e;box-shadow:0 0 0 2px rgba(15,23,42,.04),0 10px 20px rgba(15,23,42,.06)}
.c2n-category-pill.is-dim{opacity:.48}
.c2n-category-pill.is-distortion{border-color:#dacffc}
.c2n-category-pill.is-generalization{border-color:#cce7ef}
.c2n-category-pill.is-deletion{border-color:#d6ecd8}
.c2n-category-pill.is-extra{border-color:#f3d9ac}
.c2n-category-pill.is-active.is-distortion{background:#f6f1ff;box-shadow:0 0 0 2px rgba(109,40,217,.10),0 12px 24px rgba(109,40,217,.08)}
.c2n-category-pill.is-active.is-generalization{background:#eefcff;box-shadow:0 0 0 2px rgba(13,148,136,.10),0 12px 24px rgba(13,148,136,.08)}
.c2n-category-pill.is-active.is-deletion{background:#f3fbf4;box-shadow:0 0 0 2px rgba(22,101,52,.10),0 12px 24px rgba(22,101,52,.08)}
.c2n-category-pill.is-active.is-extra{background:#fff8ef;box-shadow:0 0 0 2px rgba(194,120,3,.10),0 12px 24px rgba(194,120,3,.08)}
.c2n-selection-lens{display:grid;gap:4px;padding:12px 14px;border-radius:18px;background:rgba(255,255,255,.92)}
.c2n-selection-lens strong{font-size:1rem}
.c2n-selection-lens p{font-size:.84rem;color:#586b80;line-height:1.5}
.c2n-selection-lens small{font-size:.72rem;color:#7b8aa0;font-weight:800}
.c2n-workstation{display:grid;gap:14px}
.c2n-sentence-surface{display:grid;gap:14px;padding:18px;border-radius:28px;background:linear-gradient(180deg,rgba(255,255,255,.94) 0%,rgba(249,251,255,.98) 100%);border:1px solid #dfe8f3;box-shadow:inset 0 1px 0 rgba(255,255,255,.8)}
.c2n-surface-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-end;flex-wrap:wrap}
.c2n-surface-head h3{font-size:1rem;font-weight:900}
.c2n-surface-target{display:inline-flex;align-items:center;gap:8px;padding:8px 12px;border-radius:999px;background:#eef4ff;border:1px solid #d4def1;font-weight:900;color:#163a7b}
.c2n-sents-board{grid-template-columns:repeat(2,minmax(0,1fr))}
.c2n-sent{background:rgba(255,255,255,.92);border-color:#e2e9f3;box-shadow:none}
.c2n-sent:hover:not(:disabled){box-shadow:0 14px 28px rgba(15,23,42,.06)}
.c2n-action-dock{display:grid;gap:12px;padding:14px 16px;border-radius:24px;background:rgba(245,248,253,.96);border:1px solid #dbe5f2}
.c2n-dock-summary{justify-content:space-between}
.c2n-dock-chip{display:inline-flex;align-items:center;gap:8px;padding:8px 12px;border-radius:999px;background:#fff;border:1px solid #d9e3ef;font-weight:800;color:#334155}
.c2n-dock-chip strong{color:#10233e}
.c2n-feedback-line{padding:12px 14px;border-radius:18px;font-weight:800;line-height:1.55;border:1px solid transparent}
.c2n-feedback-line.info{background:#eef4ff;border-color:#c8d8fb;color:#1e3a8a}
.c2n-feedback-line.success{background:#ecfdf5;border-color:#bbf7d0;color:#065f46}
.c2n-feedback-line.error{background:#fef2f2;border-color:#fecaca;color:#991b1b}
.c2n-dock-detail{display:grid;gap:8px}
.c2n-dock-note{padding:10px 12px;border-radius:16px;background:#fff;border:1px dashed #cfdaea}
.c2n-dock-note strong{display:block;font-size:.79rem;margin-bottom:4px;color:#0f3f81}
.c2n-dock-note span{font-size:.82rem;line-height:1.5;color:#42556b}
.c2n-action-strip{gap:8px}
.c2n-btn-main{min-width:180px;justify-content:center;font-size:.95rem;padding:12px 18px}
.c2n-btn.is-subtle{background:#ffffff;color:#42556b;border:1px solid #d8e2f0}
.c2n-quiet-note{font-size:.78rem;color:#6a7a8f;line-height:1.5}
.c2n-overlay-grid{display:grid;gap:12px}
.c2n-empty{margin-top:14px;border:1px dashed #cad8ec;background:#fbfdff;border-radius:20px;padding:18px;display:grid;gap:10px;text-align:center}.c2n-empty p{color:#4d5e73;line-height:1.55}
.c2n-overlay{position:fixed;inset:0;z-index:9999;background:rgba(15,23,42,.45);backdrop-filter:blur(4px);display:flex;justify-content:center;align-items:flex-start;padding:16px;overflow:auto}.c2n-modal{width:min(960px,100%);background:#f8fbff;border:1px solid #d9e5f3;border-radius:26px;padding:16px;display:grid;gap:14px;box-shadow:0 28px 70px rgba(15,23,42,.22)}
.c2n-modal-head{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:flex-start}.c2n-modal-head h2{font-size:1.1rem;font-weight:900}.c2n-modal-head p{margin-top:5px;font-size:.86rem;color:#536579;line-height:1.45}
.c2n-settings-grid{display:grid;grid-template-columns:1.15fr .85fr;gap:12px}.c2n-settings-main,.c2n-settings-side{display:grid;gap:12px}.c2n-group{border:1px solid #d9e5f3;background:#ffffff;border-radius:18px;padding:14px;display:grid;gap:10px}.c2n-group-head{display:grid;gap:4px}.c2n-group-head h3{font-size:.94rem;font-weight:900}
.c2n-radio{display:flex;gap:8px;align-items:flex-start;border:1px solid #e3eaf5;background:#fff;border-radius:12px;padding:9px}.c2n-radio input{margin-top:3px}.c2n-radio strong{display:block;font-size:.84rem}.c2n-radio span{display:block;color:#64748b;font-size:.76rem;line-height:1.35}.c2n-radio.dim{opacity:.55}
.c2n-toggle{display:flex;gap:8px;align-items:center;font-weight:700;font-size:.84rem}.c2n-range{width:100%}.c2n-adv{border:1px dashed #c6d4e6;background:#fbfdff;border-radius:16px;padding:12px}.c2n-adv summary{cursor:pointer;font-weight:900;color:#0f4c81}
.c2n-preview{border:1px solid #cce0f0;background:linear-gradient(180deg,#f0f8ff 0%,#ffffff 100%);border-radius:18px;padding:14px;display:grid;gap:10px}.c2n-preview-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
.c2n-example-lines{display:grid;gap:8px}.c2n-example-line{border:1px solid #e2e8f0;background:#fff;border-radius:14px;padding:10px 12px;line-height:1.55}.c2n-summary-copy{display:grid;gap:10px}
.c2n-modal-actions{justify-content:space-between}.c2n-modal-actions .c2n-btn{min-width:120px}
@media (max-width:980px){.c2n-hero,.c2n-layout,.c2n-settings-grid,.c2n-home-grid,.c2n-mode-grid,.c2n-play-top{grid-template-columns:1fr}.c2n-row{grid-template-columns:repeat(3,minmax(0,1fr))}.c2n-play-toolbar{justify-items:start}.c2n-sents-board{grid-template-columns:1fr}.c2n-play-stat,.c2n-tool-btn{width:auto}.c2n-dock-summary{justify-content:flex-start}}
@media (max-width:640px){.c2n-shell{padding:12px}.c2n-overlay{padding:10px}.c2n-list,.c2n-step-strip,.c2n-preview-grid{grid-template-columns:1fr}.c2n-actions,.c2n-row-actions,.c2n-main-acts,.c2n-modal-actions,.c2n-seg,.c2n-start-actions,.c2n-action-strip,.c2n-dock-summary{display:grid;grid-template-columns:1fr}.c2n-btn,.c2n-start-summary,.c2n-family-tab,.c2n-tool-btn{width:100%}.c2n-cat{min-height:72px;padding:9px}.c2n-name{font-size:.84rem}.c2n-code{font-size:.63rem}.c2n-play-shell{padding:14px}.c2n-category-pill{width:100%;justify-content:flex-start;padding:13px 16px}.c2n-category-rail,.c2n-sentence-surface,.c2n-action-dock{padding:13px}}
`;

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
const rand = (n: number) => Math.floor(Math.random() * n);
const isPrimaryFamily = (family: FamilyCell): family is GroupCode => family === 'DIS' || family === 'GEN' || family === 'DEL';

function displayModeLabelFor(settings: Settings): string {
  if (settings.categoryDisplay === 'all') return 'מפת ברין מלאה';
  return settings.includeCtxVak
    ? `קבוצת ${GROUP_META[settings.categoryGroup].he} + עוד קטגוריות`
    : `קבוצת ${GROUP_META[settings.categoryGroup].he}`;
}

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
const rules = (s: Settings, mode: RunMode) => ({
  showPresence: mode === 'learning' && s.difficulty <= 2,
  exact: mode === 'test' || s.difficulty >= 4,
  autoHint: mode === 'learning' && s.difficulty <= 2
});

export default function Classic2Trainer(): React.ReactElement {
  const trainerContract = getTrainerContract('classic2');
  const [wizardOpen, setWizardOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [draft, setDraft] = useState<Settings>(() => loadClassic2Settings());
  const [settings, setSettings] = useState<Settings>(() => loadClassic2Settings());
  const [activeFamily, setActiveFamily] = useState<PlayFamily>(() => loadClassic2Settings().categoryGroup);
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [playOverlay, setPlayOverlay] = useState<PlayOverlay | null>(null);
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
  const [mode, setMode] = useState<RunMode>('learning');
  const [mistakes, setMistakes] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [solutionsUsed, setSolutionsUsed] = useState(0);
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

  useEffect(() => {
    if (!playOverlay) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPlayOverlay(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [playOverlay]);

  const rr = rules(settings, mode);
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
      ? { tone: 'info', message: `הקטגוריה ${CAT[auto].he} נבחרה אוטומטית. עכשיו מסמנים רק את המשפטים ששייכים לה.` }
      : { tone: 'info', message: 'בחר/י קטגוריה אחת, ואז סמן/י רק את המשפטים שמתאימים לה באמת.' });
  };

  const startPractice = (cfg: Settings, nextMode: RunMode = mode) => {
    const normalized: Settings = { ...cfg, difficulty: clamp(cfg.difficulty, 1, 5), sentenceCount: clamp(cfg.sentenceCount, 3, 8) };
    const r1 = makeRound(normalized, 1, null);
    setMode(nextMode);
    setSettings(normalized);
    setActiveFamily(normalized.categoryGroup);
    setStarted(true);
    setFinished(false);
    setPlayOverlay(null);
    setRoundNo(1);
    setDone(0);
    setCorrect(0);
    setMistakes(0);
    setHintsUsed(0);
    setSolutionsUsed(0);
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
    setPlayOverlay(null);
    setWizardOpen(true);
  };

  const selectCat = (code: CategoryCode) => {
    if (result !== 'pending') return;
    if (!visibleCategories(settings).includes(code)) return;
    if (isPrimaryFamily(CAT[code].family)) setActiveFamily(CAT[code].family);
    setSelectedCat(code);
    setSelectedIds([]);
    setShowHint(false);
    setShowSolution(false);
    setFeedback({ tone: 'info', message: `בפוקוס עכשיו: ${CAT[code].he}. סמן/י רק את המשפטים שבאמת שייכים אליה.` });
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
    setMistakes((prev) => prev + 1);
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
    setMistakes((prev) => prev + 1);
    setResult('wrong');
    setFeedback({ tone: 'error', message: "יש לפחות מופע אחד בטקסט. נסה/י שוב או לחץ/י 'רמז'." });
    if (rr.autoHint) setShowHint(true);
  };

  const nextRound = () => {
    if (!round || result !== 'correct') return;
    setPlayOverlay(null);
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

  const openHint = () => {
    if (!selectedCat) return;
    if (mode === 'test' && result === 'pending') return;
    setShowHint((prev) => {
      if (!prev) setHintsUsed((count) => count + 1);
      return true;
    });
  };

  const openSolution = () => {
    if (!selectedCat) return;
    if (mode === 'test' && result === 'pending') return;
    setShowSolution((prev) => {
      if (!prev) setSolutionsUsed((count) => count + 1);
      return true;
    });
  };

  const backToWelcome = () => {
    setStarted(false);
    setFinished(false);
    setPlayOverlay(null);
    setRoundNo(1);
    setRound(null);
    setSelectedCat(null);
    setSelectedIds([]);
    setFeedback(null);
    setShowHint(false);
    setShowSolution(false);
    setResult('pending');
  };

  const hintIdx = round && selectedCat
    ? round.sentences.map((s, i) => (s.tags.includes(selectedCat) ? i + 1 : null)).filter((n): n is number => n !== null)
    : [];

  const renderCatPicker = (cfg: Settings, interactive: boolean, compact = false, closeOnPick = false) => {
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
                onClick={() => {
                  if (cfg !== settings) return;
                  selectCat(c);
                  if (closeOnPick) setPlayOverlay(null);
                }}
                disabled={compact ? true : !interactive}
                aria-pressed={selectedCat === c && cfg === settings}
              >
                <div className="c2n-cat-top">
                  <div className="c2n-name">{CAT[c].he}</div>
                  <div className="c2n-cat-meta"><span className="c2n-fam">{CAT[c].familyHe}</span><span className="c2n-code">{c}</span></div>
                </div>
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
                <button
                  key={c}
                  type="button"
                  className={`c2n-cat${sel ? ' sel' : ''}`}
                  onClick={() => {
                    if (cfg !== settings) return;
                    selectCat(c);
                    if (closeOnPick) setPlayOverlay(null);
                  }}
                  disabled={compact ? true : !interactive || !enabled}
                  aria-pressed={sel}
                >
                  <div className="c2n-cat-top">
                    <div className="c2n-name">{CAT[c].he}</div>
                    <div className="c2n-cat-meta"><span className="c2n-fam">{CAT[c].familyHe}</span><span className="c2n-code">{c}</span></div>
                  </div>
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

  const visibleNow = visibleCategories(settings);
  const visibleCount = visibleNow.length;
  const draftVisibleCount = visibleCategories(draft).length;
  const displayLabel = displayModeLabelFor(settings);
  const draftDisplayLabel = displayModeLabelFor(draft);
  const extraCategories = orderBreenCategories(visibleNow.filter((code) => CAT[code].family === 'CTX' || CAT[code].family === 'VAK'));
  const availableFamilies = PLAY_FAMILY_ORDER.filter((family) => (
    family === 'EXTRA'
      ? extraCategories.length > 0
      : visibleNow.some((code) => CAT[code].family === family)
  ));
  const familyCategories = activeFamily === 'EXTRA'
    ? extraCategories
    : orderBreenCategories(visibleNow.filter((code) => CAT[code].family === activeFamily));
  const selectedPrimaryFamily = selectedCat
    ? (isPrimaryFamily(CAT[selectedCat].family) ? CAT[selectedCat].family : 'EXTRA')
    : null;

  useEffect(() => {
    if (selectedPrimaryFamily && selectedPrimaryFamily !== activeFamily) setActiveFamily(selectedPrimaryFamily);
  }, [selectedPrimaryFamily, activeFamily]);

  useEffect(() => {
    if (!availableFamilies.length) return;
    if (availableFamilies.includes(activeFamily)) return;
    setActiveFamily(selectedPrimaryFamily && availableFamilies.includes(selectedPrimaryFamily) ? selectedPrimaryFamily : availableFamilies[0]);
  }, [activeFamily, selectedPrimaryFamily, availableFamilies]);

  const screen = !started ? 'home' : finished ? 'summary' : 'play';
  const modeLabel = mode === 'test' ? 'מבחן' : 'לימוד';
  const modeSummary = mode === 'test' ? 'בדיקה מלאה בלי רמזים מוקדמים.' : 'לומדים תוך כדי סימון, רמז ומשוב.';
  const helperSteps = trainerContract.helperSteps?.length ? [...trainerContract.helperSteps] : [
    { title: '1. בוחרים מצב כניסה', description: 'לימוד לתמיכה תוך כדי, או מבחן לזיהוי נקי יותר.' },
    { title: '2. עובדים על קטגוריה אחת', description: 'בוחרים קטגוריה, מסמנים רק את המשפטים שבאמת שייכים לה.' },
    { title: '3. בודקים וממשיכים', description: 'מקבלים משוב, מתקנים אם צריך, ועוברים לסבב הבא.' },
  ];
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
            <div><strong>קבוצה אחת</strong><span>מיקוד במשפחת עיוות, הכללה או מחיקה.</span></div>
          </label>
        </>
      )
    },
    categories: {
      id: 'categories',
      title: 'קטגוריות',
      help: 'במצב קבוצתי בוחרים קבוצה פעילה. אפשר לצרף גם את קטגוריות ההקשר והחושי.',
      content: (
        <>
          <div className="c2n-seg">
            {(['GEN', 'DIS', 'DEL'] as GroupCode[]).map((g) => (
              <button key={g} type="button" className={`c2n-btn ${draft.categoryGroup === g ? 'p' : 's'}`} onClick={() => setDraft((p) => ({ ...p, categoryGroup: g }))}>
                {GROUP_META[g].he}
              </button>
            ))}
          </div>
          <label className="c2n-toggle">
            <input type="checkbox" checked={draft.includeCtxVak} onChange={(e) => setDraft((p) => ({ ...p, includeCtxVak: e.target.checked }))} />
            כולל הקשר + חושי
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
  const exampleScenario = scenarioPool(settings.fieldContext)[0] || SCENARIOS[0];
  const exampleLines = exampleScenario?.sentences.slice(0, 2) || [];
  const startSummary = `${modeLabel} · ${settings.sentenceCount} פריטים · ${visibleCount} קטגוריות · ${displayLabel}`;
  const previewSummary = `${modeLabel} · ${draft.sentenceCount} פריטים · ${draftVisibleCount} קטגוריות · ${draftDisplayLabel}`;
  const totalRounds = settings.rounds === 'infinite' ? done : Number(settings.rounds || 0);
  const trafficTone = mistakes === 0 && solutionsUsed === 0 ? 'green' : mistakes <= Math.max(1, totalRounds / 2 || 1) && solutionsUsed <= 1 ? 'amber' : 'red';
  const trafficLabel = trafficTone === 'green' ? 'ירוק · שליטה יציבה' : trafficTone === 'amber' ? 'צהוב · יש דיוק חלקי' : 'אדום · צריך עוד סיבוב לימוד';
  const workedText = mistakes === 0
    ? 'הזיהוי נשאר ממוקד: בחרת קטגוריה אחת ועבדת מולה בלי לערבב בין משפחות.'
    : `גם אחרי ${mistakes} עצירות חזרת לטקסט עצמו ולא נשארת ברמת תחושה כללית.`;
  const improveText = mode === 'test'
    ? 'במצב מבחן שווה לעצור רגע לפני הבדיקה ולשאול: סימנתי את כל המופעים, או רק את הראשונים שקפצו לעין?'
    : solutionsUsed > 0
      ? 'אם נפתח פתרון, נסה/י בסשן הבא להישען קודם על הרמז ועל סימון חוזר לפני החשיפה המלאה.'
      : 'כדאי לבדוק בעיקר מתי סימון חלקי נראה "כמעט נכון" אבל מפספס עוד מופע בטקסט.';
  const nextText = mode === 'test'
    ? 'אם הסשן הרגיש צפוף, חזר/י לעוד סשן לימוד קצר באותו תחום ואז נסה/י שוב מבחן.'
    : 'כשהסימון מתחיל להיות יציב, עבר/י למצב מבחן כדי לבדוק אם הדיוק מחזיק בלי תמיכה מוקדמת.';
  const helpText = selectedCat
    ? `${CAT[selectedCat].hint}${CAT[selectedCat].note ? ` ${CAT[selectedCat].note}` : ''}`
    : 'בחר/י קטגוריה אחת מהמפה, ואז סמן/י רק את המשפטים שמתאימים לה באמת.';
  const selectedCount = selectedIds.length;
  const totalMatches = matches.length;
  const toneClassForCategory = (code: CategoryCode) => {
    const family = CAT[code].family;
    if (family === 'DIS') return 'is-distortion';
    if (family === 'GEN') return 'is-generalization';
    if (family === 'DEL') return 'is-deletion';
    return 'is-extra';
  };
  const toneClassForFamily = (family: PlayFamily) => {
    if (family === 'DIS') return 'is-distortion';
    if (family === 'GEN') return 'is-generalization';
    if (family === 'DEL') return 'is-deletion';
    return 'is-extra';
  };
  const selectedCatMeta = selectedCat ? CAT[selectedCat] : null;
  const activeFamilyMeta = activeFamily === 'EXTRA' ? EXTRA_META : GROUP_META[activeFamily];
  const focusTitle = selectedCatMeta ? selectedCatMeta.he : `בוחרים קטגוריה מתוך ${activeFamilyMeta.he}`;
  const focusDescription = selectedCatMeta
    ? `${selectedCatMeta.hint}${selectedCatMeta.note ? ` ${selectedCatMeta.note}` : ''}`
    : activeFamilyMeta.subtitle;
  const activeSummaryLabel = selectedCatMeta
    ? `${selectedCatMeta.familyHe} · ${selectedCatMeta.he}`
    : `כדאי להתחיל ממשפחת ${activeFamilyMeta.he}`;
  const defaultFeedback = selectedCatMeta
    ? `בחרת ב-${selectedCatMeta.he}. עכשיו מסמנים רק את המשפטים ששייכים אליה, בלי לערבב עם קטגוריות אחרות.`
    : 'בחר/י קודם משפחה ואז קטגוריה אחת. כשהפוקוס ברור, גם סימון המשפטים נהיה פשוט יותר.';
  const primaryActionLabel = result === 'correct' ? 'לסבב הבא' : result === 'wrong' ? 'נקה וננסה שוב' : 'בדוק תשובה';
  const primaryActionHandler = () => {
    if (result === 'correct') {
      nextRound();
      return;
    }
    if (result === 'wrong') {
      setSelectedIds([]);
      setResult('pending');
      setShowHint(false);
      setShowSolution(false);
      setFeedback(selectedCat ? { tone: 'info', message: `ניקינו את הסימון. נשארים עם ${selectedCatMeta?.he ?? 'הקטגוריה שנבחרה'} ומנסים שוב.` } : { tone: 'info', message: 'בחר/י קטגוריה כדי להתחיל.' });
      return;
    }
    evaluate();
  };

  return (
    <div className="c2n" dir="rtl" lang="he">
      <style>{`${TRAINER_PLATFORM_CSS}\n${CSS}`}</style>
      <section
        className="c2n-shell"
        data-trainer-platform="1"
        data-trainer-id="classic2"
        data-screen={screen}
        data-trainer-mobile-order="purpose,start,main,support"
      >
        <section data-trainer-help-content="1" hidden>
          <div className="c2n-summary-copy">
            <span className="c2n-kicker">Classic 2 · Structure of Magic</span>
            <h2>מה חשוב לזכור לפני הסבב</h2>
            <p>Classic 2 מאמן זיהוי יציב של קטגוריה אחת בתוך טקסט אמיתי. לא מחפשים תחושה כללית אלא מופעים מדויקים, או את היכולת לומר בביטחון שאין מופע כזה.</p>
            <p>למה זה חשוב: כשעובדים רק מתוך אינטואיציה, קל לסמן משפטים שלא באמת שייכים לקטגוריה. כאן מתרגלים מעבר מקריאה מהירה לקריאת בדיקה.</p>
            <p>דוגמה קצרה: &quot;אם עולות לי שאלות זה אומר שהאמונה שלי חלשה&quot; מזמין בדיקה אם זו שקילות מורכבת, סיבה-תוצאה, או משהו אחר שמרגיש דומה אבל לא זהה.</p>
            <p>במצב לימוד יש רמזים ותמיכה. במצב מבחן הבדיקה תמיד מלאה, ואין רמזים או פתרון לפני שננעלת תוצאה.</p>
          </div>
        </section>

        {screen === 'home' ? (
          <div className="c2n-main" data-trainer-zone="main">
            <section className="c2n-card" data-trainer-zone="purpose">
              <span className="c2n-kicker">{trainerContract.familyLabel}</span>
              <h1 style={{ fontSize: '1.28rem', fontWeight: 900 }}>{trainerContract.title}</h1>
              <p className="c2n-sub" style={{ marginTop: 8 }}>
                כאן מאמנים עין יציבה על קטגוריה אחת בתוך טקסט קצר: בוחרים קטגוריה, מסמנים את כל המופעים שלה, ובודקים אם הקריאה באמת מדויקת.
              </p>
            </section>

            <section className="c2n-start-strip" data-trainer-zone="start">
              <div>
                <strong>{trainerContract.quickStartLabel}</strong>
                <p className="c2n-sub" style={{ marginTop: 6 }}>בוחרים דרך כניסה ואז נכנסים ישר לסשן. ההסברים הארוכים נשארים כאן או בעזרה, לא מעל הסבב עצמו.</p>
              </div>
              <div className="c2n-mode-grid">
                <article className="c2n-mode-card">
                  <strong>מצב לימוד</strong>
                  <p>עובדים עם רמזים, משוב מלא, ויכולת לפתוח פתרון כשצריך.</p>
                  <small>טוב להתחלה, לחזרה ממוקדת, או כשבודקים איך הקטגוריה יושבת בתוך הטקסט.</small>
                  <button type="button" className="c2n-btn p" data-trainer-action="start-session" onClick={() => startPractice(settings, 'learning')}>התחל לימוד</button>
                </article>
                <article className="c2n-mode-card">
                  <strong>מצב מבחן</strong>
                  <p>אותו מנוע תרגול, אבל בלי רמזים או פתרון לפני שננעלת תשובה.</p>
                  <small>הבדיקה תמיד מלאה, כדי לראות אם הזיהוי מחזיק גם בלי תמיכה מוקדמת.</small>
                  <button type="button" className="c2n-btn s" data-trainer-action="start-test" onClick={() => startPractice(settings, 'test')}>התחל מבחן</button>
                </article>
              </div>
              <div className="c2n-start-actions">
                <button type="button" className="c2n-btn g" data-trainer-action="open-settings" onClick={openSettings}>הגדרות</button>
                <span className="c2n-start-summary" data-trainer-summary="current">{startSummary}</span>
              </div>
            </section>

            <section className="c2n-card">
              <div className="c2n-home-grid">
                <article className="c2n-group">
                  <div className="c2n-group-head">
                    <h3>למה הכלי הזה חשוב</h3>
                    <p className="c2n-sub">בלי הפרדה ברורה בין פתיחה לאימון, קל להישאר בתוך הסבר ולא להיכנס לעבודה עצמה.</p>
                  </div>
                  <p className="c2n-sub">הערך כאן הוא לעבור מקריאה אינטואיטיבית לקריאה בודקת: לדעת מה מחפשים, איפה מחפשים, ומה נחשב תשובה מלאה.</p>
                </article>
                <article className="c2n-group">
                  <div className="c2n-group-head">
                    <h3>דוגמה קצרה מהשדה</h3>
                    <p className="c2n-sub">משפט אחד יכול להרגיש כמו כמה קטגוריות יחד. העבודה כאן היא לייצב את ההבחנה.</p>
                  </div>
                  <div className="c2n-example-lines">
                    {exampleLines.map((sentence, index) => (
                      <div key={sentence.id} className="c2n-example-line">
                        <strong>שורה {index + 1}</strong>
                        <div>{sentence.text}</div>
                      </div>
                    ))}
                  </div>
                </article>
                <article className="c2n-group">
                  <div className="c2n-group-head">
                    <h3>מה תתרגל/י כאן</h3>
                    <p className="c2n-sub">תרגול אחד, משימה אחת, וטקסט אחד בכל רגע.</p>
                  </div>
                  <div className="c2n-kv">
                    <div><b>קטגוריה בפוקוס</b><span>בוחרים רק קטגוריה אחת מתוך מפת ברין הקנונית.</span></div>
                    <div><b>טקסט קצר</b><span>{settings.sentenceCount} משפטים בכל סבב, בלי גלילה דרך דפי הסבר.</span></div>
                    <div><b>בדיקה ברורה</b><span>{modeSummary}</span></div>
                  </div>
                </article>
                <article className="c2n-group">
                  <div className="c2n-group-head">
                    <h3>איך הסשן בנוי</h3>
                    <p className="c2n-sub">אותו רצף בכל פעם, כדי שהעין תלמד איפה היא נמצאת עכשיו.</p>
                  </div>
                  <div className="c2n-step-strip">
                    {helperSteps.map((step) => (
                      <div key={step.title} className="c2n-step">
                        <strong>{step.title}</strong>
                        <span className="c2n-sub">{step.description}</span>
                      </div>
                    ))}
                  </div>
                </article>
              </div>
            </section>
          </div>
        ) : null}

        {screen === 'play' && round ? (
          <div className="c2n-play-screen" data-trainer-zone="main">
            <section className="c2n-card c2n-play-shell">
              <header className="c2n-play-top">
                <div className="c2n-play-title">
                  <span className="c2n-kicker">{trainerContract.title}</span>
                  <h2>{round.title}</h2>
                  <p className="c2n-sub">{progressText(roundNo, settings.rounds)} · {round.contextLabel} · {modeLabel}</p>
                </div>
                <div className="c2n-play-toolbar">
                  <div className="c2n-play-stats">
                    <span className="c2n-play-stat"><strong>{round.sentences.length}</strong> משפטים</span>
                    <span className="c2n-play-stat"><strong>{correct + (result === 'correct' ? 1 : 0)}</strong> סבבים מדויקים</span>
                    <span className="c2n-play-stat">{rr.exact ? 'בדיקה מלאה' : 'בדיקה גמישה'}</span>
                  </div>
                  <div className="c2n-play-tools">
                    <button type="button" className="c2n-tool-btn" onClick={() => setPlayOverlay('map')}>מפת ברין</button>
                    <button type="button" className="c2n-tool-btn" onClick={() => setPlayOverlay('status')}>סטטוס</button>
                    <button type="button" className="c2n-tool-btn" onClick={() => setPlayOverlay('help')}>עזרה</button>
                    <button type="button" className="c2n-tool-btn" data-trainer-action="open-settings" onClick={openSettings}>הגדרות</button>
                    <button type="button" className="c2n-tool-btn" onClick={backToWelcome}>פתיחה</button>
                  </div>
                </div>
              </header>

              <section className="c2n-play-chooser">
                <div className="c2n-play-chooser-head">
                  <div>
                    <strong>בחירת קטגוריה</strong>
                    <p className="c2n-sub" style={{ marginTop: 6 }}>
                      מתחילים ממשפחה אחת, ואז בוחרים רק את הקטגוריה שעובדים מולה עכשיו. מפת ברין המלאה נשארת זמינה בלחיצה כשצריך.
                    </p>
                  </div>
                  <div className="c2n-active-category">
                    <b>{focusTitle}</b>
                    <span>{activeSummaryLabel}</span>
                    {selectedCat ? <small>קוד מתקדם: {selectedCat}</small> : null}
                  </div>
                </div>

                <div className="c2n-family-tabs" role="tablist" aria-label="משפחות קטגוריה">
                  {GROUP_ORDER.map((family) => {
                    const count = visibleNow.filter((code) => CAT[code].family === family).length;
                    return (
                      <button
                        key={family}
                        type="button"
                        className={`c2n-family-tab ${toneClassForFamily(family)}${activeFamily === family ? ' is-active' : ''}`}
                        onClick={() => setActiveFamily(family)}
                        disabled={count === 0}
                        role="tab"
                        aria-selected={activeFamily === family}
                      >
                        <span>{GROUP_META[family].he}</span>
                        <small>{count ? `${count} קטגוריות זמינות` : 'לא זמין בהגדרות הנוכחיות'}</small>
                      </button>
                    );
                  })}
                </div>

                <div className="c2n-category-strip">
                  {primaryFamilyCategories.map((code) => (
                    <button
                      key={code}
                      type="button"
                      className={`c2n-category-pill ${toneClassForCategory(code)}${selectedCat === code ? ' is-active' : ''}${selectedCat && selectedCat !== code ? ' is-dim' : ''}`}
                      onClick={() => selectCat(code)}
                      disabled={result !== 'pending'}
                      aria-pressed={selectedCat === code}
                    >
                      <strong>{CAT[code].he}</strong>
                      <span>{CAT[code].hint}</span>
                      <small>{CAT[code].familyHe}</small>
                    </button>
                  ))}
                </div>

                {extraCategories.length ? (
                  <div className="c2n-extra-strip">
                    <span className="c2n-strip-label">עוד קטגוריות</span>
                    {extraCategories.map((code) => (
                      <button
                        key={code}
                        type="button"
                        className={`c2n-category-pill ${toneClassForCategory(code)}${selectedCat === code ? ' is-active' : ''}${selectedCat && selectedCat !== code ? ' is-dim' : ''}`}
                        onClick={() => selectCat(code)}
                        disabled={result !== 'pending'}
                        aria-pressed={selectedCat === code}
                      >
                        <strong>{CAT[code].he}</strong>
                        <span>{CAT[code].hint}</span>
                        <small>{AUX_META[code].he}</small>
                      </button>
                    ))}
                  </div>
                ) : null}
              </section>

              <section className="c2n-play-board">
                <section className="c2n-sentence-surface">
                  <div className="c2n-surface-head">
                    <div>
                      <h3>טקסט הסבב</h3>
                      <p className="c2n-sub" style={{ marginTop: 6 }}>
                        {selectedCatMeta
                          ? `סמן/י רק את המשפטים ששייכים ל-${selectedCatMeta.he}.`
                          : 'בחר/י קטגוריה אחת, ואז סמן/י רק את המשפטים שבאמת מתאימים לה.'}
                      </p>
                    </div>
                    {selectedCatMeta ? <span className="c2n-surface-target">{selectedCatMeta.he}</span> : null}
                  </div>

                  <div className="c2n-sents c2n-sents-board">
                    {round.sentences.map((s, i) => {
                      const sel = selectedIds.includes(s.id);
                      const isMatch = !!selectedCat && s.tags.includes(selectedCat);
                      const showGood = !!selectedCat && (showSolution || result === 'correct') && isMatch;
                      const showBad = result === 'wrong' && sel && !isMatch;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          className={`c2n-sent${sel ? ' sel' : ''}${showGood ? ' good' : ''}${showBad ? ' bad' : ''}`}
                          onClick={() => toggleSentence(s.id)}
                          disabled={!selectedCat || result !== 'pending'}
                          aria-pressed={sel}
                        >
                          <div className="c2n-sent-top">
                            <span className="c2n-sent-index">{i + 1}</span>
                            <span className="c2n-sent-state">{showGood ? 'שייך לקטגוריה' : showBad ? 'לא שייך' : sel ? 'מסומן' : 'זמין לסימון'}</span>
                          </div>
                          <span className="c2n-sent-text">{s.text}</span>
                        </button>
                      );
                    })}
                  </div>
                </section>

                <aside className="c2n-feedback-surface">
                  <section className={`c2n-focus-card ${selectedFamilyTone === 'distortion' ? 'is-distortion' : selectedFamilyTone === 'generalization' ? 'is-generalization' : selectedFamilyTone === 'deletion' ? 'is-deletion' : 'is-context'}`}>
                    <h3>בפוקוס עכשיו</h3>
                    <p>{focusDescription}</p>
                    {selectedCat ? <span className="c2n-code" style={{ width: 'max-content' }}>{selectedCat}</span> : null}
                  </section>

                  <div className={`c2n-fb ${(feedback || { tone: 'info' as Tone }).tone}`}>
                    {feedback?.message || defaultFeedback}
                  </div>

                  {(showHint || showSolution) && selectedCat ? (
                    <div className="c2n-support-stack">
                      {showHint ? (
                        <section className="c2n-support-card">
                          <span className="c2n-detail-title">רמז</span>
                          <p>{CAT[selectedCat].hint}</p>
                          {hintIdx.length ? <p>שווה לבדוק במיוחד את משפט{hintIdx.length > 1 ? 'ים' : ''} {hintIdx.join(', ')}.</p> : <p>ייתכן שאין כאן מופע של הקטגוריה הזו.</p>}
                        </section>
                      ) : null}
                      {showSolution ? (
                        <section className="c2n-support-card">
                          <span className="c2n-detail-title">פתרון</span>
                          {hintIdx.length
                            ? <p>המופעים של {CAT[selectedCat].he} נמצאים במשפט{hintIdx.length > 1 ? 'ים' : ''} {hintIdx.join(', ')}.</p>
                            : <p>בטקסט הזה אין מופע של {CAT[selectedCat].he}.</p>}
                        </section>
                      ) : null}
                    </div>
                  ) : null}

                  <section className="c2n-action-panel">
                    <button
                      type="button"
                      className="c2n-btn p c2n-btn-main"
                      onClick={primaryActionHandler}
                      disabled={result === 'pending' ? !selectedCat : result === 'correct' ? false : !selectedCat}
                    >
                      {primaryActionLabel}
                    </button>

                    <div className="c2n-action-strip">
                      <button type="button" className="c2n-btn w" onClick={declareNoCategory} disabled={!selectedCat || result !== 'pending'}>אין את הקטגוריה בטקסט</button>
                      <button
                        type="button"
                        className="c2n-btn s"
                        onClick={() => {
                          setSelectedIds([]);
                          setResult('pending');
                          setShowHint(false);
                          setShowSolution(false);
                          setFeedback(selectedCat ? { tone: 'info', message: 'הסימון נוקה. אפשר לנסות שוב באותה קטגוריה.' } : { tone: 'info', message: 'בחר/י קטגוריה כדי להתחיל.' });
                        }}
                        disabled={!selectedIds.length && result === 'pending'}
                      >
                        נקה סימון
                      </button>
                      <button type="button" className="c2n-btn g" onClick={openHint} disabled={!selectedCat || (mode === 'test' && result === 'pending')}>{mode === 'test' ? 'רמז אחרי בדיקה' : 'רמז'}</button>
                      <button type="button" className="c2n-btn g" onClick={openSolution} disabled={!selectedCat || (mode === 'test' && result === 'pending')}>{mode === 'test' ? 'פתרון אחרי בדיקה' : 'פתרון'}</button>
                    </div>

                    <p className="c2n-quiet-note">
                      {mode === 'test'
                        ? 'במבחן עובדים קודם לבד. רמז ופתרון נפתחים רק אחרי תוצאה.'
                        : 'בלימוד אפשר לפתוח רמז או פתרון רק כשצריך, בלי להעמיס על מרכז העבודה.'}
                    </p>
                  </section>
                </aside>
              </section>
            </section>
          </div>
        ) : null}

        {screen === 'summary' ? (
          <section className="c2n-main" data-trainer-zone="main">
            <section className="c2n-card c2n-summary-card">
              <span className={`c2n-tone-pill ${trafficTone}`}>{trafficLabel}</span>
              <h2 style={{ fontSize: '1.08rem', fontWeight: 900 }}>סיכום Classic 2</h2>
              <p className="c2n-sub">הושלמו {done} סבבים במצב {modeLabel}. עכשיו כבר ברור יותר אם הזיהוי מחזיק בלי להיטמע בתוך טקסט ההסבר.</p>
              <div className="c2n-preview-grid" style={{ marginTop: 6 }}>
                <div className="c2n-kv"><b>דיוק</b><span>{correct}/{done || correct || 0} סבבים הושלמו</span></div>
                <div className="c2n-kv"><b>תחום</b><span>{CTX_LABEL[settings.fieldContext]}</span></div>
                <div className="c2n-kv"><b>טעויות בדרך</b><span>{mistakes}</span></div>
                <div className="c2n-kv"><b>עזרה שנפתחה</b><span>{hintsUsed} רמזים · {solutionsUsed} פתרונות</span></div>
              </div>
              <div className="c2n-home-grid single" style={{ marginTop: 12 }}>
                <article className="c2n-group">
                  <div className="c2n-group-head">
                    <h3>מה עבד</h3>
                    <p className="c2n-sub">{workedText}</p>
                  </div>
                </article>
                <article className="c2n-group">
                  <div className="c2n-group-head">
                    <h3>מה לשפר</h3>
                    <p className="c2n-sub">{improveText}</p>
                  </div>
                </article>
                <article className="c2n-group">
                  <div className="c2n-group-head">
                    <h3>מה הלאה</h3>
                    <p className="c2n-sub">{nextText}</p>
                  </div>
                </article>
              </div>
              <div className="c2n-row-actions" style={{ marginTop: 12 }}>
                <button type="button" className="c2n-btn p" onClick={() => startPractice(settings, mode)}>עוד סשן באותו מצב</button>
                <button type="button" className="c2n-btn g" data-trainer-action="open-settings" onClick={openSettings}>עדכן הגדרות</button>
                <button type="button" className="c2n-btn s" onClick={backToWelcome}>חזרה לפתיחה</button>
              </div>
            </section>
          </section>
        ) : null}
      </section>

      {playOverlay ? (
        <div className="c2n-overlay" role="dialog" aria-modal="true" aria-labelledby="classic2-play-overlay-title" onClick={() => setPlayOverlay(null)}>
          <section className="c2n-modal" onClick={(event) => event.stopPropagation()}>
            <header className="c2n-modal-head">
              <div>
                <h2 id="classic2-play-overlay-title">
                  {playOverlay === 'map' ? 'מפת ברין' : playOverlay === 'status' ? 'סטטוס הסשן' : 'עזרה ממוקדת'}
                </h2>
                <p>
                  {playOverlay === 'map'
                    ? 'כאן נשמר הסדר הקנוני המלא. במסך הראשי עובדים עם בחירה פשוטה יותר, ובוחרים מהטבלה רק כשצריך דיוק נוסף.'
                    : playOverlay === 'status'
                      ? 'הפרטים המלאים של הסשן נשמרים כאן כדי שהמסך הראשי יישאר קל וממוקד.'
                      : 'תזכורת קצרה למה מחפשים עכשיו. את ההסבר הרחב יותר משאירים למסך הפתיחה.'}
                </p>
              </div>
              <button type="button" className="c2n-btn s" onClick={() => setPlayOverlay(null)}>סגור</button>
            </header>

            {playOverlay === 'map' ? (
              <div className="c2n-overlay-grid">
                <div className="c2n-help">
                  <p>העברית היא הכותרת הראשית של כל קטגוריה. הקוד האנגלי נשאר כאן רק כמטא־דאטה למי שעובד עם מפת ברין הקנונית.</p>
                </div>
                {renderCatPicker(settings, result === 'pending', false, true)}
              </div>
            ) : null}

            {playOverlay === 'help' ? (
              <div className="c2n-overlay-grid">
                <section className="c2n-group">
                  <div className="c2n-group-head">
                    <h3>מה עושים כאן עכשיו</h3>
                  </div>
                  <p className="c2n-sub">{defaultFeedback}</p>
                </section>
                <section className="c2n-group">
                  <div className="c2n-group-head">
                    <h3>מה כדאי לחפש</h3>
                  </div>
                  <p className="c2n-sub">{helpText}</p>
                </section>
                <section className="c2n-group">
                  <div className="c2n-group-head">
                    <h3>איך להשתמש בתמיכה</h3>
                  </div>
                  <p className="c2n-sub">
                    {mode === 'test'
                      ? 'במבחן עובדים קודם לבד, ורק אחרי תוצאה אפשר לפתוח רמז או פתרון.'
                      : 'בלימוד אפשר לפתוח רמז או פתרון לפי צורך, אבל עדיף לתת קודם קריאה עצמאית אחת לטקסט.'}
                  </p>
                </section>
              </div>
            ) : null}

            {playOverlay === 'status' ? (
              <div className="c2n-overlay-grid">
                {summaryGrid}
                <div className="c2n-status-grid">
                  <div className="c2n-status-card"><b>מצב</b><span>{modeLabel}</span></div>
                  <div className="c2n-status-card"><b>קושי</b><span>{settings.difficulty}/5</span></div>
                  <div className="c2n-status-card"><b>טעויות</b><span>{mistakes}</span></div>
                  <div className="c2n-status-card"><b>רמזים</b><span>{hintsUsed}</span></div>
                  <div className="c2n-status-card"><b>פתרונות</b><span>{solutionsUsed}</span></div>
                  <div className="c2n-status-card"><b>תצוגת עבודה</b><span>{displayLabel}</span></div>
                </div>
                <div className="c2n-help">
                  <p>{trafficLabel}</p>
                </div>
              </div>
            ) : null}
          </section>
        </div>
      ) : null}

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
