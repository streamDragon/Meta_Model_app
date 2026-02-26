import React, { useEffect, useRef, useState } from 'react';

type CategoryCode = 'MR' | 'CEq' | 'CE' | 'PRE' | 'NOM' | 'LP' | 'UQ' | 'MN' | 'MP' | 'UV' | 'UN' | 'COMP' | 'DEL' | 'CTX' | 'VAK';
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

const BREEN_GRID_RTL: CategoryCode[][] = [
  ['MR', 'CEq', 'CE'],
  ['PRE', 'NOM', 'LP'],
  ['UQ', 'MN', 'MP'],
  ['UV', 'UN', 'COMP'],
  ['DEL', 'CTX', 'VAK']
];

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

const ORDER = BREEN_GRID_RTL.flat();

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
.c2n{direction:rtl;font-family:"Assistant","Rubik","Segoe UI",sans-serif;color:#0f172a;max-width:1180px;margin:0 auto}
.c2n *{box-sizing:border-box}.c2n-shell{background:radial-gradient(circle at 8% -5%,#cfe4ff,transparent 45%),radial-gradient(circle at 92% 0,#ccf6dd,transparent 45%),linear-gradient(180deg,#f7faff,#fbfffd);border:1px solid #dae4f3;border-radius:22px;padding:14px;box-shadow:0 18px 45px rgba(15,23,42,.07)}
.c2n h1,.c2n h2,.c2n h3,.c2n h4,.c2n p{margin:0}.c2n-card{background:#ffffffe8;border:1px solid #dde6f3;border-radius:16px;padding:12px}
.c2n-top{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:10px}.c2n-title h1{font-size:1.1rem;font-weight:900}.c2n-title p{font-size:.82rem;color:#526173}
.c2n-actions{display:flex;flex-wrap:wrap;gap:8px}.c2n-btn{border:1px solid transparent;border-radius:12px;padding:10px 12px;font-weight:900;cursor:pointer;font-family:inherit}.c2n-btn:disabled{opacity:.55;cursor:not-allowed}
.c2n-btn.p{background:#0f4cd6;color:#fff}.c2n-btn.s{background:#e8edf6;color:#0f172a}.c2n-btn.g{background:#fff;border-color:#c8d5ea;color:#173a8a}.c2n-btn.w{background:#fff7ed;border-color:#fed7aa;color:#9a3412}
.c2n-chip{display:inline-flex;align-items:center;border:1px solid #d7e0ee;background:#fff;border-radius:999px;padding:5px 10px;font-weight:800;font-size:.78rem}
.c2n-intro{margin-top:12px;display:grid;gap:10px}.c2n-intro p{line-height:1.45;color:#243242}.c2n-help{border:1px dashed #c7d5ea;background:#f9fbff;border-radius:12px;padding:10px;line-height:1.4;color:#31465e}
.c2n-layout{margin-top:12px;display:grid;grid-template-columns:340px 1fr;gap:12px}.c2n-sub{color:#546579;font-size:.82rem;line-height:1.35}.c2n-cta{margin-top:8px;border:1px solid #cbddff;background:#f3f7ff;border-radius:12px;padding:10px}.c2n-cta strong{display:block;color:#0d3fae}.c2n-cta span{display:block;margin-top:4px;color:#4a5d73;font-size:.82rem}
.c2n-grid{display:grid;gap:8px;margin-top:10px}.c2n-row{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;direction:rtl}.c2n-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:10px}
.c2n-cat{width:100%;text-align:right;border:1px solid #dbe5f2;background:#fff;border-radius:14px;padding:9px;display:grid;gap:6px;cursor:pointer;min-height:92px}.c2n-cat:hover:not(:disabled){border-color:#98b9ff;background:#f9fbff}.c2n-cat:disabled{opacity:.58;cursor:not-allowed}.c2n-cat.sel{border-color:#0f4cd6;background:#eaf1ff;box-shadow:0 0 0 2px rgba(15,76,214,.12)}
.c2n-cat-top{display:flex;justify-content:space-between;gap:8px}.c2n-code{background:#eef3ff;color:#1d4ed8;border-radius:999px;padding:2px 8px;font-weight:900;font-size:.74rem}.c2n-fam{color:#64748b;font-size:.73rem;font-weight:700}.c2n-name{font-size:.82rem;font-weight:800;line-height:1.25}.c2n-badge{width:max-content;border-radius:999px;padding:2px 8px;font-weight:800;font-size:.68rem}.c2n-badge.ok{background:#ecfdf5;color:#0f766e}.c2n-badge.off{background:#f4f6fb;color:#64748b}
.c2n-text-top{display:flex;flex-wrap:wrap;justify-content:space-between;gap:8px}.c2n-meta{display:flex;flex-wrap:wrap;gap:6px}.c2n-target{margin-top:10px;border:1px dashed #c6d6ee;background:#f9fbff;border-radius:12px;padding:10px}.c2n-target p{margin-top:4px;color:#45596f;font-size:.84rem;line-height:1.35}
.c2n-sents{margin-top:10px;display:grid;gap:8px}.c2n-sent{width:100%;text-align:right;border:1px solid #dce5f2;background:#fff;border-radius:14px;padding:10px 12px;display:grid;gap:6px;cursor:pointer}.c2n-sent:hover:not(:disabled){border-color:#9bbcff;background:#f9fbff}.c2n-sent:disabled{opacity:.75;cursor:not-allowed}
.c2n-sent-top{display:flex;justify-content:space-between;gap:8px;font-size:.75rem;font-weight:900;color:#4e647c}.c2n-sent-text{font-weight:700;line-height:1.45}.c2n-sent.sel{border-color:#0f4cd6;background:#eaf1ff}.c2n-sent.good{border-color:#86efac;background:#f0fdf4}.c2n-sent.bad{border-color:#fca5a5;background:#fff5f5}
.c2n-row-actions{margin-top:12px;display:flex;flex-wrap:wrap;gap:8px}.c2n-fb{margin-top:10px;border-radius:12px;padding:10px 12px;border:1px solid;font-weight:800;line-height:1.4}.c2n-fb.info{background:#eef4ff;border-color:#c8d8fb;color:#1e3a8a}.c2n-fb.success{background:#ecfdf5;border-color:#bbf7d0;color:#065f46}.c2n-fb.error{background:#fef2f2;border-color:#fecaca;color:#991b1b}
.c2n-hint{margin-top:10px;border:1px dashed #c9d8ef;background:#f9fbff;border-radius:12px;padding:10px;display:grid;gap:6px}.c2n-hint p{font-size:.84rem;line-height:1.4;color:#334155}
.c2n-foot{margin-top:12px;border:1px dashed #cad8ec;background:#fbfdff;border-radius:14px;padding:10px;display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px;align-items:center}.c2n-score{display:flex;flex-wrap:wrap;gap:8px}
.c2n-empty{margin-top:12px;border:1px dashed #cad8ec;background:#fbfdff;border-radius:16px;padding:18px;display:grid;gap:10px;text-align:center}.c2n-empty p{color:#4d5e73}
.c2n-overlay{position:fixed;inset:0;z-index:9999;background:rgba(15,23,42,.45);backdrop-filter:blur(4px);display:flex;justify-content:center;align-items:flex-start;padding:16px;overflow:auto}.c2n-modal{width:min(880px,100%);background:#fff;border:1px solid #dde6f2;border-radius:20px;padding:14px;display:grid;gap:12px;box-shadow:0 28px 70px rgba(15,23,42,.22)}
.c2n-modal-head{display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;align-items:flex-start}.c2n-modal-head h2{font-size:1.05rem;font-weight:900}.c2n-modal-head p{margin-top:4px;font-size:.84rem;color:#536579;line-height:1.35}
.c2n-form{display:grid;grid-template-columns:1fr 1fr;gap:12px}.c2n-field{border:1px solid #dde6f2;background:#fbfdff;border-radius:14px;padding:10px;display:grid;gap:8px}.c2n-field h3{font-size:.9rem;font-weight:900}
.c2n-radio{display:flex;gap:8px;align-items:flex-start;border:1px solid #e3eaf5;background:#fff;border-radius:10px;padding:8px}.c2n-radio input{margin-top:3px}.c2n-radio strong{display:block;font-size:.83rem}.c2n-radio span{display:block;color:#64748b;font-size:.75rem;line-height:1.3}.c2n-radio.dim{opacity:.55}
.c2n-seg{display:flex;flex-wrap:wrap;gap:6px}.c2n-seg .c2n-btn{padding:8px 10px;border-radius:999px}.c2n-toggle{display:flex;gap:8px;align-items:center;font-weight:700;font-size:.84rem}.c2n-range{width:100%}.c2n-modal-actions{display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap}.c2n-main-acts{display:flex;gap:8px;flex-wrap:wrap}
@media (max-width:980px){.c2n-layout{grid-template-columns:1fr}.c2n-form{grid-template-columns:1fr}}
@media (max-width:640px){.c2n-overlay{padding:10px}.c2n-row{grid-template-columns:1fr}.c2n-list{grid-template-columns:1fr}.c2n-actions,.c2n-row-actions,.c2n-main-acts,.c2n-modal-actions,.c2n-seg{display:grid;grid-template-columns:1fr}.c2n-btn{width:100%}}
`;

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
const rand = (n: number) => Math.floor(Math.random() * n);

function visibleCategories(s: Settings): CategoryCode[] {
  if (s.categoryDisplay === 'all') return [...ORDER];
  const base = ORDER.filter((c) => CAT[c].family === s.categoryGroup);
  const extra = s.includeCtxVak ? (['CTX', 'VAK'] as CategoryCode[]) : [];
  return ORDER.filter((c) => [...base, ...extra].includes(c));
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
  const [wizardOpen, setWizardOpen] = useState(true);
  const [draft, setDraft] = useState<Settings>({ ...DEFAULTS });
  const [settings, setSettings] = useState<Settings>({ ...DEFAULTS });
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

  const openSettings = () => { setDraft({ ...settings }); setWizardOpen(true); };

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
          {ORDER.filter((c) => vis.includes(c)).map((c) => {
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
        {BREEN_GRID_RTL.map((row, i) => (
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

  return (
    <div className="c2n" dir="rtl" lang="he">
      <style>{CSS}</style>
      <div className="c2n-shell">
        <div className="c2n-top c2n-card">
          <div className="c2n-title">
            <h1>Meta-Model Content Trainer</h1>
            <p>Classic 2 · Structure of Magic</p>
          </div>
          <div className="c2n-actions">
            <button type="button" className="c2n-btn g" onClick={openSettings}>חזרה ל-Settings</button>
            <span className="c2n-chip">{started ? progressText(roundNo, settings.rounds) : 'טרם התחיל תרגול'}</span>
            <button type="button" className="c2n-btn s" onClick={() => setHelpOpen((v) => !v)} aria-expanded={helpOpen}>עזרה / איך זה עובד</button>
          </div>
        </div>

        <div className="c2n-intro">
          <section className="c2n-card">
            <h2 style={{ fontSize: '1rem', fontWeight: 900 }}>מטרת התרגול</h2>
            <p>בוחרים קטגוריה מהמטה-מודל ולומדים לזהות אותה בתוך טקסט אמיתי. בכל סבב תקבל/י טקסט קצר. תסמן/י איפה הקטגוריה מופיעה או תדווח/י שהיא לא מופיעה בטקסט.</p>
            <p className="c2n-sub" style={{ marginTop: 8 }}>הסברי קטגוריות מפורטים (רמזים/פירושים) נשארים בדף הזה; בדפי תרגול אחרים טבלת ברין נשמרת נקייה ללחיצה מהירה.</p>
          </section>
          {helpOpen && <div className="c2n-help">1) בוחרים קטגוריה. 2) מסמנים משפט/ים (מצב משפטים/צ׳יפים). 3) בודקים תשובה או משתמשים בכפתור "אין את הקטגוריה...". 4) ממשיכים לסבב הבא.</div>}
        </div>

        {!started && (
          <div className="c2n-empty">
            <h2 style={{ fontSize: '1rem', fontWeight: 900 }}>התרגול עוד לא הופעל</h2>
            <p>המודאל נפתח אוטומטית בכניסה. אחרי "הפעל תרגול" נכנסים לטריינר.</p>
            <div className="c2n-row-actions" style={{ marginTop: 0, justifyContent: 'center' }}>
              <button type="button" className="c2n-btn p" onClick={() => setWizardOpen(true)}>פתח/י Settings</button>
            </div>
          </div>
        )}

        {started && !finished && round && (
          <div className="c2n-layout">
            <aside className="c2n-card">
              <h3 style={{ fontSize: '.98rem', fontWeight: 900 }}>שלב 1: לחץ/י – בחר קטגוריה לאימון</h3>
              <div className="c2n-sub">
                {settings.categoryDisplay === 'all'
                  ? 'כל הקטגוריות מוצגות תמיד בגריד RTL קבוע (MR בפינה הימנית-עליונה).'
                  : `קבוצה ממוקדת: ${settings.categoryGroup}${settings.includeCtxVak ? ' + CTX/VAK' : ''}`}
              </div>
              <div className="c2n-cta">
                <strong>בחר/י קטגוריה, ואז סמן/י משפט בטקסט</strong>
                <span>אם אין מופע בטקסט, השתמש/י בכפתור הייעודי.</span>
              </div>
              {renderCatPicker(settings, result === 'pending')}
            </aside>

            <section className="c2n-card">
              <div className="c2n-text-top">
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 900 }}>{round.title}</h3>
                  <div className="c2n-sub">סבב {roundNo} · {round.contextLabel} · {round.sentences.length} משפטים</div>
                </div>
                <div className="c2n-meta">
                  <span className="c2n-chip">רמה {settings.difficulty}/5</span>
                  <span className="c2n-chip">תצוגה: {settings.categoryDisplay === 'all' ? 'All Categories' : 'Group'}</span>
                  {rr.exact && <span className="c2n-chip">בדיקה מלאה</span>}
                </div>
              </div>

              <div className="c2n-target">
                <strong>{selectedCat ? `הקטגוריה הפעילה: ${selectedCat} / ${CAT[selectedCat].he}` : 'בחר/י קטגוריה לאימון'}</strong>
                <p>{selectedCat ? CAT[selectedCat].hint : 'התחל/י מהגריד משמאל. לאחר הבחירה ניתן לסמן משפטים.'}</p>
                {selectedCat && CAT[selectedCat].note && <p style={{ fontWeight: 800, color: '#0d3fae' }}>{CAT[selectedCat].note}</p>}
              </div>

              <div className="c2n-sents">
                {round.sentences.map((s, i) => {
                  const sel = selectedIds.includes(s.id);
                  const isMatch = !!selectedCat && s.tags.includes(selectedCat);
                  const showGood = !!selectedCat && (showSolution || result === 'correct') && isMatch;
                  const showBad = result === 'wrong' && sel && !isMatch;
                  return (
                    <button key={s.id} type="button" className={`c2n-sent${sel ? ' sel' : ''}${showGood ? ' good' : ''}${showBad ? ' bad' : ''}`} onClick={() => toggleSentence(s.id)} disabled={!selectedCat || result !== 'pending'} aria-pressed={sel}>
                      <div className="c2n-sent-top">
                        <span>משפט {i + 1}</span>
                        <span>{showGood ? 'פתרון / נכון' : showBad ? 'לא מתאים' : sel ? 'מסומן' : 'לחיץ'}</span>
                      </div>
                      <span className="c2n-sent-text">{s.text}</span>
                    </button>
                  );
                })}
              </div>

              <div className="c2n-row-actions">
                <button type="button" className="c2n-btn p" onClick={evaluate} disabled={!selectedCat || result !== 'pending'}>בדוק תשובה</button>
                <button type="button" className="c2n-btn w" onClick={declareNoCategory} disabled={!selectedCat || result !== 'pending'}>אין את הקטגוריה המבוקשת בתוך הטקסט</button>
                <button type="button" className="c2n-btn s" onClick={() => { setSelectedIds([]); setResult('pending'); setShowHint(false); setShowSolution(false); setFeedback(selectedCat ? { tone: 'info', message: 'נוקה סימון. נסה/י שוב.' } : { tone: 'info', message: 'בחר/י קטגוריה לאימון.' }); }}>נקה סימון</button>
                <button type="button" className="c2n-btn g" onClick={() => setShowHint(true)} disabled={!selectedCat}>הצג רמז</button>
                <button type="button" className="c2n-btn g" onClick={() => setShowSolution(true)} disabled={!selectedCat}>הצג פתרון</button>
              </div>

              {feedback && <div className={`c2n-fb ${feedback.tone}`}>{feedback.message}</div>}

              {showHint && selectedCat && (
                <div className="c2n-hint">
                  <h4 style={{ fontSize: '.88rem', fontWeight: 900 }}>רמז</h4>
                  <p>{CAT[selectedCat].hint}</p>
                  {hintIdx.length ? <p>נסה/י לבדוק במיוחד את משפט{hintIdx.length > 1 ? 'ים' : ''}: {hintIdx.join(', ')}.</p> : <p>ייתכן שאין מופע של הקטגוריה הזו בטקסט.</p>}
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
          </div>
        )}

        {started && finished && (
          <section className="c2n-card" style={{ marginTop: 12 }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 900 }}>סיכום תרגול</h3>
            <div className="c2n-sub" style={{ marginTop: 4 }}>הושלמו {done} סבבים ({correct} נכונים) · הקשר: {CTX_LABEL[settings.fieldContext]} · רמה: {settings.difficulty}/5</div>
            <div className="c2n-row-actions">
              <button type="button" className="c2n-btn p" onClick={() => startPractice(settings)}>הפעל שוב עם אותן הגדרות</button>
              <button type="button" className="c2n-btn g" onClick={openSettings}>חזרה ל-Settings</button>
            </div>
          </section>
        )}
      </div>

      {wizardOpen && (
        <div className="c2n-overlay" role="dialog" aria-modal="true" aria-label="Settings Wizard">
          <div className="c2n-modal">
            <div className="c2n-modal-head">
              <div>
                <h2>Classic 2 · Structure of Magic — Settings</h2>
                <p>המודאל נפתח מיד בכניסה. נעילת גלילת רקע מופעלת בזמן פתיחה.</p>
              </div>
              <button type="button" className="c2n-btn s" onClick={() => setWizardOpen(false)}>צא</button>
            </div>

            <div className="c2n-form">
              <section className="c2n-field">
                <h3>A. מקור הטקסט</h3>
                <label className="c2n-radio">
                  <input type="radio" name="src" checked={draft.textSource === 'built_in'} onChange={() => setDraft((p) => ({ ...p, textSource: 'built_in' }))} />
                  <div><strong>סט תרגול מובנה</strong><span>רצף תרחישים לפי ההקשר.</span></div>
                </label>
                <label className="c2n-radio">
                  <input type="radio" name="src" checked={draft.textSource === 'random'} onChange={() => setDraft((p) => ({ ...p, textSource: 'random' }))} />
                  <div><strong>טקסט רנדומלי</strong><span>בחירה אקראית של תרחיש/חלון משפטים.</span></div>
                </label>
                <label className="c2n-radio dim">
                  <input type="radio" name="src" disabled />
                  <div><strong>הדבק טקסט ידנית (אופציה עתידית)</strong><span>שמור לשלב הבא.</span></div>
                </label>
              </section>

              <section className="c2n-field">
                <h3>B. סגנון טקסט / תחום</h3>
                <div className="c2n-seg">
                  {(Object.keys(CTX_LABEL) as FieldCtx[]).map((c) => (
                    <button key={c} type="button" className={`c2n-btn ${draft.fieldContext === c ? 'p' : 's'}`} onClick={() => setDraft((p) => ({ ...p, fieldContext: c }))}>{CTX_LABEL[c]}</button>
                  ))}
                </div>
              </section>

              <section className="c2n-field">
                <h3>C. רמת קושי</h3>
                <div className="c2n-chip">{draft.difficulty}/5</div>
                <input className="c2n-range" type="range" min={1} max={5} step={1} value={draft.difficulty} onChange={(e) => setDraft((p) => ({ ...p, difficulty: Number(e.target.value) }))} />
                <div className="c2n-sub">משפיע על רמזי נוכחות, קשיחות בדיקה, ורמז אוטומטי אחרי שגיאה.</div>

                <h3 style={{ marginTop: 4 }}>D. אורך התרגול</h3>
                <div className="c2n-sub">מספר משפטים בטקסט: {draft.sentenceCount}</div>
                <input className="c2n-range" type="range" min={3} max={8} step={1} value={draft.sentenceCount} onChange={(e) => setDraft((p) => ({ ...p, sentenceCount: Number(e.target.value) }))} />
                <div className="c2n-sub">מספר סבבים / טקסטים</div>
                <div className="c2n-seg">
                  {[5, 10, 'infinite'].map((r) => (
                    <button key={String(r)} type="button" className={`c2n-btn ${draft.rounds === r ? 'p' : 's'}`} onClick={() => setDraft((p) => ({ ...p, rounds: r as RoundsChoice }))}>{r === 'infinite' ? 'אינסופי' : r}</button>
                  ))}
                </div>
              </section>

              <section className="c2n-field">
                <h3>E. תצוגת קטגוריות</h3>
                <label className="c2n-radio">
                  <input type="radio" name="disp" checked={draft.categoryDisplay === 'all'} onChange={() => setDraft((p) => ({ ...p, categoryDisplay: 'all' }))} />
                  <div><strong>כל הקטגוריות (טבלת מייקל ברין)</strong><span>סדר/מיקום קבועים ב-RTL.</span></div>
                </label>
                <label className="c2n-radio">
                  <input type="radio" name="disp" checked={draft.categoryDisplay === 'group'} onChange={() => setDraft((p) => ({ ...p, categoryDisplay: 'group' }))} />
                  <div><strong>רק קבוצה</strong><span>GEN / DIS / DEL.</span></div>
                </label>
                <div className="c2n-seg">
                  {(['GEN', 'DIS', 'DEL'] as GroupCode[]).map((g) => (
                    <button key={g} type="button" className={`c2n-btn ${draft.categoryGroup === g ? 'p' : 's'}`} onClick={() => setDraft((p) => ({ ...p, categoryGroup: g }))}>{g}</button>
                  ))}
                </div>
                <label className="c2n-toggle">
                  <input type="checkbox" checked={draft.includeCtxVak} onChange={(e) => setDraft((p) => ({ ...p, includeCtxVak: e.target.checked }))} />
                  כולל CTX + VAK
                </label>
                <div className="c2n-sub">Preview (אותו breen_grid_rtl הקבוע במצב All Categories)</div>
                {renderCatPicker(draft, false, true)}
              </section>
            </div>

            <div className="c2n-modal-actions">
              <button type="button" className="c2n-btn s" onClick={() => setDraft({ ...QUICK })}>ברירת מחדל מהירה</button>
              <div className="c2n-main-acts">
                <button type="button" className="c2n-btn g" onClick={() => setDraft({ ...DEFAULTS })}>איפוס הגדרות</button>
                <button type="button" className="c2n-btn p" onClick={() => startPractice(draft)}>הפעל תרגול</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
