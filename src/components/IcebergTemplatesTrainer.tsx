import React, { useEffect, useMemo, useState } from 'react';

type TemplateType = 'CEQ' | 'CAUSE' | 'ASSUMPTIONS1';
type CauseMode = 'CAUSES_OF_TOKEN' | 'EFFECTS_OF_TOKEN';

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

const TEMPLATE_META: Record<TemplateType, TemplateMeta> = {
  CEQ: {
    type: 'CEQ',
    code: 'CEq',
    titleHe: 'הקבלה מורכבת / קריטריונים',
    titleEn: 'Complex Equivalence / Criteria',
    shortHelp: 'מפרקים תווית/מושג לסימנים, קריטריונים ודוגמאות.',
    slotCount: 3,
    gapHint: 'פער בין המילה לבין מה שבפועל נחשב כהוכחה/סימן.',
    factPrompt: 'מה נצפה בפועל שמצדיק את המילה הזו?'
  },
  CAUSE: {
    type: 'CAUSE',
    code: 'CE',
    titleHe: 'סיבתיות / תנאים',
    titleEn: 'Cause / Conditions',
    shortHelp: 'מה גורם למה? ומה התנאים שמאפשרים את זה?',
    slotCount: 2,
    gapHint: 'פער בין תוצאה מורגשת לבין מנגנון/תנאים שלא פורטו.',
    factPrompt: 'מה קרה קודם? באילו תנאים זה קורה?'
  },
  ASSUMPTIONS1: {
    type: 'ASSUMPTIONS1',
    code: 'A1',
    titleHe: 'הנחות יסוד (אילוסטרציה)',
    titleEn: 'Assumptions-1',
    shortHelp: 'חושפים מה כבר מונח בפנים בלי שנאמר במפורש.',
    slotCount: 3,
    gapHint: 'פער בין המשפט הגלוי לבין הנחות סמויות שמחזיקות אותו.',
    factPrompt: 'איזו הנחה צריך לבדוק מול המציאות?'
  }
};

const INTRO_COPY =
  'לפעמים מילה היא רק קצה-קרחון. כאן גוררים מילה/ביטוי לצורה שמגלה מבנה עומק אפשרי. התשובות הן אילוסטרציה בלבד — לא אמת.';
const DISCLAIMER_COPY = 'אילוסטרציה בלבד — לא אמת. לחץ/י "מטופל אחר" כדי לראות וריאציות.';
const OUTRO_COPY = 'נחשף מבנה אפשרי. לערעור/בדיקה/שינוי — במודול הבא.';

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

const css = `
.it-wrap{direction:rtl;font-family:"Assistant","Heebo","Noto Sans Hebrew","Segoe UI",sans-serif;background:radial-gradient(circle at 10% 0%,#fef3c7 0,#fffaf0 36%,#f8fafc 100%);color:#111827;max-width:1420px;margin:0 auto;border:1px solid #fde68a;border-radius:18px;padding:14px;box-shadow:0 16px 32px rgba(17,24,39,.06)}
.it-wrap *{box-sizing:border-box}.it-panel{background:#ffffffde;border:1px solid #fde68a;border-radius:14px;padding:12px;box-shadow:0 8px 24px rgba(17,24,39,.04)}
.it-grid{display:grid;grid-template-columns:1fr 1.2fr;gap:14px}.it-stack{display:grid;gap:12px}
.it-title{margin:0;font-weight:900;font-size:1.2rem}.it-sub{margin:6px 0 0;color:#6b7280;line-height:1.4}
.it-intro{margin-top:10px;border:1px solid #fde68a;background:#fff7d6;color:#92400e;border-radius:10px;padding:10px;line-height:1.4}
.it-topbar{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}.it-chip{background:#fff;border:1px solid #fde68a;border-radius:999px;padding:6px 10px;font-weight:800;font-size:.82rem}
.it-home-links{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}.it-home-link{display:inline-flex;align-items:center;gap:6px;padding:6px 10px;border-radius:999px;border:1px solid #d1d5db;background:#fff;color:#111827;text-decoration:none;font-weight:800;font-size:.82rem}
.it-home-link:hover{border-color:#2563eb;color:#1d4ed8}
.it-textbox{margin-top:8px;border:1px solid #f3e8b3;background:#fff;border-radius:12px;padding:12px;line-height:2;min-height:120px}.it-seg{white-space:pre-wrap}
.it-token{display:inline-flex;align-items:center;padding:2px 8px;border-radius:999px;border:1px dashed #f59e0b;background:#fffbeb;color:#92400e;font-weight:800;cursor:grab;user-select:none}
.it-token:hover{background:#fef3c7}.it-token.sel{border-style:solid;border-color:#2563eb;background:#eff6ff;color:#1d4ed8}.it-token.active{border-style:solid;border-color:#059669;background:#ecfdf5;color:#065f46}.it-token.dragging{opacity:.65}
.it-help{margin-top:8px;color:#6b7280;font-size:.84rem}.it-help strong{color:#111827}.it-kicker{font-size:.78rem;color:#6b7280}
.it-board{display:grid;gap:10px}.it-board-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.it-board-card{border:1px solid #e5e7eb;border-radius:12px;padding:10px;background:#fff}
.it-board-card h3{margin:0 0 6px;font-size:.95rem;font-weight:900}.it-board-card p{margin:0;color:#4b5563;line-height:1.35}
.it-board-row{display:grid;grid-template-columns:120px 1fr;gap:8px;align-items:flex-start}.it-board-label{font-weight:900;font-size:.82rem;color:#374151}
.it-board-value{border:1px solid #e5e7eb;border-radius:10px;background:#f9fafb;padding:8px;line-height:1.35;min-height:40px}.it-board-value.emph{border-color:#bfdbfe;background:#eff6ff;color:#1e3a8a;font-weight:700}.it-board-value.warn{border-color:#fde68a;background:#fffbeb;color:#92400e}
.it-board-tags{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}.it-mini-tag{padding:4px 8px;border-radius:999px;border:1px solid #d1d5db;background:#fff;font-size:.78rem;font-weight:700}.it-mini-tag.code{background:#111827;color:#fff;border-color:#111827;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
.it-template-grid{display:grid;gap:10px}.it-template{border:1px solid #e5e7eb;background:#fff;border-radius:12px;padding:10px;transition:transform .16s ease,border-color .16s ease,box-shadow .16s ease}
.it-template[data-over="1"]{border-color:#2563eb;box-shadow:0 0 0 2px rgba(37,99,235,.14);transform:translateY(-1px)}.it-template.is-active{border-color:#059669;box-shadow:0 0 0 2px rgba(5,150,105,.12)}
.it-template.shake{animation:itShake .28s linear 1}@keyframes itShake{0%{transform:translateX(0)}25%{transform:translateX(-3px)}50%{transform:translateX(3px)}75%{transform:translateX(-2px)}100%{transform:translateX(0)}}
.it-template-head{display:flex;justify-content:space-between;gap:8px;align-items:flex-start}.it-template-title{font-weight:900;line-height:1.2}.it-template-mini{font-size:.75rem;color:#6b7280}
.it-template-meta{display:flex;align-items:center;gap:6px;flex-wrap:wrap}.it-template-code{font-size:.72rem;font-weight:900;background:#1f2937;color:#fff;padding:3px 7px;border-radius:999px}
.it-template-help{margin-top:6px;color:#4b5563;font-size:.82rem;line-height:1.3}
.it-dropzone{margin-top:8px;border:1px dashed #d1d5db;border-radius:10px;padding:8px;background:#fafafa;min-height:44px;display:flex;align-items:center;justify-content:center;text-align:center;color:#6b7280;font-weight:700}
.it-dropzone.has-active{background:#f0fdf4;border-color:#86efac;color:#065f46}
.it-sketch{margin-top:8px;border:1px solid #e5e7eb;border-radius:10px;background:linear-gradient(180deg,#fff,#f9fafb);padding:8px}
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
.it-focus-sketch .it-sketch{margin-top:0;padding:14px}
.it-focus-sketch .it-sketch svg{min-height:170px}
.it-stage-switch{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}
.it-stage-btn{border:1px solid #d1d5db;background:#fff;color:#374151;border-radius:999px;padding:6px 10px;font-weight:800;font-size:.8rem;cursor:pointer}
.it-stage-btn.is-active{border-color:#2563eb;background:#eff6ff;color:#1d4ed8}
.it-stage-btn:disabled{opacity:.5;cursor:not-allowed}
.it-stage-card{border:1px solid #e5e7eb;background:#fff;border-radius:12px;padding:10px;display:grid;gap:10px}
.it-challenge-list{display:grid;gap:8px;margin-top:8px}
.it-challenge-item{border:1px solid #fecaca;background:#fff;border-radius:10px;padding:8px;color:#7f1d1d;line-height:1.35;font-weight:700}
.it-challenge-note{margin-top:8px;border:1px dashed #fca5a5;background:#fff7f7;color:#991b1b;border-radius:10px;padding:8px;font-weight:700;line-height:1.35}
.it-scenario-list{margin:0;padding:0;list-style:none;display:grid;gap:6px}.it-scenario-list li{display:flex;justify-content:space-between;gap:8px;padding:6px 8px;border:1px solid #f3f4f6;border-radius:8px;background:#fff}
@media (max-width:1080px){.it-board-grid{grid-template-columns:1fr}}
@media (max-width:980px){.it-grid{grid-template-columns:1fr}.it-slots.cols-3,.it-slots.cols-2{grid-template-columns:1fr}.it-board-row{grid-template-columns:1fr}.it-focus-sketch .it-sketch svg{min-height:120px}}
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
  if (payload.mode === 'CAUSES_OF_TOKEN') return 'כיוון: מה גורם/מאפשר';
  if (payload.mode === 'EFFECTS_OF_TOKEN') return 'כיוון: מה זה מאפשר/יוצר';
  return null;
}

function boardGapText(templateType: TemplateType | null, tokenText: string | null): string {
  if (!templateType || !tokenText) return 'בחר/י מילה מודגשת והפעל/י תבנית כדי לראות איזה פער בודקים.';
  if (templateType === 'CEQ') return `כאן בודקים פער בין "${tokenText}" (תווית/מושג) לבין עובדות/קריטריונים.`;
  return TEMPLATE_META[templateType].gapHint;
}

function boardFactPrompt(templateType: TemplateType | null, tokenText: string | null): string {
  if (!templateType || !tokenText) return 'מה קרה בפועל? מי אמר מה? באיזה הקשר?';
  return `${TEMPLATE_META[templateType].factPrompt} סביב "${tokenText}"`;
}

function buildChallengePrompts(templateType: TemplateType | null, tokenText: string | null): string[] {
  if (!templateType || !tokenText) return [];
  const prompts: Record<TemplateType, string[]> = {
    CEQ: [
      `איך בדיוק "${tokenText}" מוגדר אצלך — ומה העובדות שמראות שזה באמת כך?`,
      `מה היה צריך לקרות כדי שזה לא ייחשב "${tokenText}"?`,
      `איזה קריטריון כאן חשוב יותר: הכוונה, ההתנהגות, או התוצאה?`
    ],
    CAUSE: [
      `מה הראיה שהקשר סביב "${tokenText}" הוא סיבתי הכרחי ולא רק אפשרי?`,
      `מה עוד יכול להסביר את "${tokenText}" מלבד הסיבה הראשונה שעלתה?`,
      `באילו תנאים "${tokenText}" לא מופיע למרות אותם גורמים?`
    ],
    ASSUMPTIONS1: [
      `איזו הנחה מתוך השלוש הכי כדאי לבדוק קודם מול המציאות?`,
      `מה העובדות שתומכות בהנחה — ומה העובדות שלא בטוח תומכות?`,
      `אם ההנחה הזו לא נכונה, מה משתנה במשמעות של "${tokenText}"?`
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
            <div className="it-board-label">Reveal</div>
            <div className="it-board-value">{activeReflection || 'כאן יופיע שיקוף קצר של מבנה עומק אפשרי (אילוסטרציה בלבד).'}</div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function IcebergTemplatesTrainer(): React.ReactElement {
  const [data, setData] = useState<ScenarioFile | null>(null);
  const [loadingError, setLoadingError] = useState('');
  const [loading, setLoading] = useState(true);
  const [draggingTokenId, setDraggingTokenId] = useState<string | null>(null);
  const [hoverTemplate, setHoverTemplate] = useState<TemplateType | null>(null);
  const [shakeTemplate, setShakeTemplate] = useState<TemplateType | null>(null);
  const [focusStage, setFocusStage] = useState<'build' | 'reveal' | 'challenge'>('build');
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
          setData(json);
          setState(INITIAL_STATE);
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
    if (!shakeTemplate) return;
    const t = window.setTimeout(() => setShakeTemplate(null), 320);
    return () => window.clearTimeout(t);
  }, [shakeTemplate]);

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
      if (prev === 'build') return 'reveal';
      return prev;
    });
  }, [revealReady, challengeReady]);

  const activeVariantKey = useMemo(() => {
    if (!scenario || !state.active) return '';
    return buildVariantKey(scenario.scenario_id, state.active.tokenId, state.active.templateType);
  }, [scenario, state.active]);

  const segments = useMemo(() => (scenario ? getSegments(scenario.client_text, scenario.draggables) : []), [scenario]);

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
          text: `מעולה. "${token.text}" הונח על ${formatTemplateLabel(templateType)} ונפתח Reveal של שאלה + חריצים.`
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
    setState((prev) => ({
      ...prev,
      active: null,
      feedback: { tone: 'info', text: 'האזור הפעיל אופס. אפשר לגרור לאותה תבנית או לבחור תבנית אחרת.' }
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
      feedback: { tone: 'info', text: 'עברנו לתרחיש הבא. בחר/י מילה מודגשת וגרור/י לצורה המתאימה.' },
      lastCompletedRecap: recap
    }));
    setHoverTemplate(null);
    setDraggingTokenId(null);
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
    setState((prev) => {
      const same = prev.selectedTokenId === tokenId;
      return {
        ...prev,
        selectedTokenId: same ? null : tokenId,
        feedback: {
          tone: 'info',
          text: same ? 'בוטל סימון הטוקן.' : 'טוקן נבחר. במובייל: הקש/י עכשיו על תבנית.'
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

  return (
    <div className="it-wrap" dir="rtl" lang="he">
      <style>{css}</style>

      <div className="it-panel">
        <div className="it-progress">
          <div>
            <h1 className="it-title">קצה קרחון / שלדי עומק</h1>
            <p className="it-sub">Iceberg Templates · גרירת מילה/ביטוי לצורת עומק</p>
          </div>
          <div className="it-topbar">
            <span className="it-chip">תרחיש <strong>{state.currentScenarioIndex + 1}</strong> / {scenarioCount}</span>
            <span className="it-chip">ניקוד מבני: <strong>{state.scoreDrops}</strong></span>
            <span className="it-chip">"מטופל אחר": <strong>{state.scoreVariants}</strong></span>
          </div>
        </div>
        <div className="it-home-links">
          <a className="it-home-link" href="index.html">🏠 דף ראשי</a>
          <a className="it-home-link" href="classic2_trainer.html">Classic 2</a>
          <a className="it-home-link" href="classic_classic_trainer.html">Classic Classic</a>
        </div>
        <div className="it-intro">{INTRO_COPY}</div>
      </div>

      <div className="it-grid" style={{ marginTop: 12 }}>
        <div className="it-stack">
          <section className="it-panel" aria-label="Scenario text">
            <div className="it-kicker">Scenario ID: <code>{scenario.scenario_id}</code></div>
            <h2 className="it-title" style={{ fontSize: '1.05rem', marginTop: 4 }}>משפט מטופל / חלון טקסט</h2>
            <p className="it-sub">גרור/י רק מילים/ביטויים מודגשים. במובייל: הקש/י מילה ואז הקש/י על תבנית.</p>

            <div className="it-textbox" aria-live="polite">
              {segments.map((seg) => {
                if (seg.kind === 'plain') return <span key={seg.key} className="it-seg">{seg.text}</span>;
                const candidate = seg.candidate;
                const isSelected = state.selectedTokenId === candidate.id;
                const isActive = state.active?.tokenId === candidate.id;
                const isDragging = draggingTokenId === candidate.id;
                return (
                  <button
                    key={seg.key}
                    type="button"
                    draggable
                    className={['it-token', isSelected ? 'sel' : '', isActive ? 'active' : '', isDragging ? 'dragging' : ''].filter(Boolean).join(' ')}
                    onDragStart={(e) => onDragStart(e, candidate.id)}
                    onDragEnd={onDragEnd}
                    onClick={() => onTokenTap(candidate.id)}
                    aria-pressed={isSelected}
                    title={`תבניות מותרות: ${candidate.allowed_templates.join(', ')}`}
                  >
                    {candidate.text}
                  </button>
                );
              })}
            </div>
            <div className="it-help"><strong>מועמדים לגרירה:</strong> {scenario.draggables.map((d) => d.text).join(' · ')}</div>
          </section>

          <details className="it-collapse" open={!!state.active}>
            <summary>
              <span>לוח משפטים / מפת בדיקה</span>
              <span className="it-kicker">{state.active ? 'פתוח בזמן עבודה' : 'אופציונלי'}</span>
            </summary>
            <div className="it-collapse-body">
              <SentenceBoard
                scenario={scenario}
                selectedToken={selectedToken}
                activeTemplateType={state.active?.templateType ?? null}
                activeQuestion={activePayload?.question ?? ''}
                activeReflection={activeReflection}
              />
            </div>
          </details>

          <section className="it-panel" aria-label="Template gallery">
            <h2 className="it-title" style={{ fontSize: '1.05rem' }}>גלריית צורות / Templates</h2>
            <p className="it-sub">כל צורה כוללת איור-שלד קטן. גרור/י טוקן — וקבל/י שאלה + מילוי חריצים.</p>
            <div className="it-template-grid">
              {(Object.keys(TEMPLATE_META) as TemplateType[]).map((type) => {
                const meta = TEMPLATE_META[type];
                const isActive = state.active?.templateType === type;
                const isHover = hoverTemplate === type;
                const payload = isActive && activePayload ? activePayload : null;
                const slotCount = meta.slotCount;
                const causeMode = payload && 'mode' in payload ? payload.mode ?? null : null;

                return (
                  <div
                    key={type}
                    className={['it-template', isActive ? 'is-active' : '', shakeTemplate === type ? 'shake' : ''].filter(Boolean).join(' ')}
                    data-over={isHover ? '1' : '0'}
                    onDragOver={(e) => { e.preventDefault(); setHoverTemplate(type); }}
                    onDragLeave={() => setHoverTemplate((prev) => (prev === type ? null : prev))}
                    onDrop={(e) => handleTemplateDrop(e, type)}
                    onClick={() => handleTemplateClick(type)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleTemplateClick(type);
                      }
                    }}
                    aria-label={`תבנית ${meta.titleHe}`}
                  >
                    <div className="it-template-head">
                      <div>
                        <div className="it-template-title">{meta.titleHe}</div>
                        <div className="it-template-mini">{meta.titleEn}</div>
                      </div>
                      <div className="it-template-meta">
                        <span className="it-template-code">{meta.code}</span>
                        <span className="it-template-mini">{slotCount} slots</span>
                      </div>
                    </div>
                    <div className="it-template-help">{meta.shortHelp}</div>
                    <TemplateSketch meta={meta} tokenText={isActive && activeToken ? activeToken.text : undefined} causeMode={causeMode} active={isActive} />
                    <div className={`it-dropzone${isActive ? ' has-active' : ''}`}>
                      {isActive && activeToken ? <>טוקן פעיל: <strong style={{ marginInlineStart: 6 }}>{activeToken.text}</strong></> : 'גרור/י לכאן טוקן מודגש'}
                    </div>
                    {isActive && payload ? (
                      <>
                        {renderCauseDirectionLabel(payload) ? <div className="it-help"><strong>{renderCauseDirectionLabel(payload)}</strong></div> : null}
                        <div className="it-help"><strong>סטטוס:</strong> התבנית פעילה. הפירוט המלא מוצג בפאנל המיקוד.</div>
                      </>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </section>
        </div>
        <div className="it-stack">
          <section className="it-panel it-focus-panel" aria-label="Focus output">
            <div className="it-focus-top">
              <div>
                <h2 className="it-title" style={{ fontSize: '1.08rem' }}>פאנל מיקוד / Build → Reveal → Challenge</h2>
                <p className="it-sub">בונים קודם את הסכמה, אחר כך חושפים שיקוף, ורק אז פותחים את שלב האתגר.</p>
              </div>
              {revealReady && activeToken && state.active ? (
                <div className="it-focus-badge">
                  {TEMPLATE_META[state.active.templateType].code} · {activeToken.text}
                </div>
              ) : null}
            </div>

            <div className="it-steps" aria-label="Focus stages">
              <span className={`it-step ${state.selectedTokenId ? 'is-done' : 'is-on'}`}>1. בחר/י בלוק</span>
              <span className={`it-step ${state.active ? 'is-done' : state.selectedTokenId ? 'is-on' : ''}`}>2. גרירה לסכמה</span>
              <span className={`it-step ${revealReady ? 'is-done' : state.active ? 'is-on' : ''}`}>3. Reveal</span>
              <span className={`it-step ${challengeReady ? 'is-on' : ''}`}>4. Challenge</span>
            </div>

            {!revealReady ? (
              <div className="it-empty" style={{ marginTop: 10 }}>
                הסכמה היא מרכז העבודה: בחר/י מילה מודגשת וגרור/י אותה לתבנית כדי לפתוח Reveal.
              </div>
            ) : (
              <div className="it-active" style={{ marginTop: 10 }}>
                <div className="it-chip" style={{ width: 'fit-content' }}>
                  טוקן: <strong>{activeToken.text}</strong> · תבנית: <strong>{formatTemplateLabel(state.active.templateType)}</strong>
                </div>

                <div className="it-focus-sketch">
                  <TemplateSketch
                    meta={TEMPLATE_META[state.active.templateType]}
                    tokenText={activeToken.text}
                    causeMode={'mode' in activePayload ? activePayload.mode ?? null : null}
                    active
                  />
                </div>

                <div className="it-stage-switch" role="tablist" aria-label="שלבי העבודה">
                  <button
                    type="button"
                    className={`it-stage-btn ${focusStage === 'build' ? 'is-active' : ''}`}
                    onClick={() => setFocusStage('build')}
                    aria-pressed={focusStage === 'build'}
                  >
                    Build
                  </button>
                  <button
                    type="button"
                    className={`it-stage-btn ${focusStage === 'reveal' ? 'is-active' : ''}`}
                    onClick={() => setFocusStage('reveal')}
                    aria-pressed={focusStage === 'reveal'}
                    disabled={!revealReady}
                  >
                    Reveal ({activeFilledSlots}/{activeSlotCount})
                  </button>
                  <button
                    type="button"
                    className={`it-stage-btn ${focusStage === 'challenge' ? 'is-active' : ''}`}
                    onClick={() => setFocusStage('challenge')}
                    aria-pressed={focusStage === 'challenge'}
                    disabled={!challengeReady}
                  >
                    Challenge
                  </button>
                </div>

                <div className="it-stage-card">
                  {focusStage === 'build' ? (
                    <>
                      <div className="it-help"><strong>Build:</strong> בחר/י בלוק רלוונטי וגרור/י לתבנית. הסכמה מגדירה את סוג החשיפה.</div>
                      <div className="it-board-row">
                        <div className="it-board-label">בלוק נבחר</div>
                        <div className="it-board-value">{activeToken.text}</div>
                      </div>
                      <div className="it-board-row">
                        <div className="it-board-label">תבנית פעילה</div>
                        <div className="it-board-value emph">{formatTemplateLabel(state.active.templateType)}</div>
                      </div>
                      <div className="it-board-row">
                        <div className="it-board-label">מה יקרה בשלב הבא</div>
                        <div className="it-board-value">המערכת תציג שאלה + חריצים + שיקוף. אחר כך תוכל/י לעבור לאתגר.</div>
                      </div>
                      <div className="it-actions">
                        <button type="button" className="it-btn primary" onClick={() => setFocusStage('reveal')}>
                          עבור ל-Reveal
                        </button>
                        <button type="button" className="it-btn ghost" onClick={clearActive}>
                          אפס תבנית
                        </button>
                      </div>
                    </>
                  ) : null}

                  {focusStage === 'reveal' ? (
                    <>
                      <div className="it-question">{activePayload.question}</div>
                      <div className={`it-slots cols-${TEMPLATE_META[state.active.templateType].slotCount}`}>
                        {Array.from({ length: TEMPLATE_META[state.active.templateType].slotCount }).map((_, idx) => (
                          <div key={idx} className="it-slot">{activeSet[idx] || '—'}</div>
                        ))}
                      </div>
                      <div className="it-reflection">{activeReflection}</div>
                      <div className="it-disclaimer">{DISCLAIMER_COPY}</div>
                      <div className="it-actions">
                        <button type="button" className="it-btn secondary" onClick={cycleVariant}>
                          מטופל אחר / תשובה אחרת
                        </button>
                        <button type="button" className="it-btn ghost" onClick={clearActive}>
                          אפס תבנית
                        </button>
                        <button
                          type="button"
                          className="it-btn primary"
                          onClick={() => setFocusStage('challenge')}
                          disabled={!challengeReady}
                        >
                          עבור לאתגר
                        </button>
                      </div>
                    </>
                  ) : null}

                  {focusStage === 'challenge' ? (
                    <>
                      <div className="it-help"><strong>Challenge:</strong> עכשיו בודקים את מה שנחשף, במקום לערבב חשיפה ואתגר באותו רגע.</div>
                      <div className="it-challenge-list">
                        {challengePrompts.map((prompt, idx) => (
                          <div key={`${state.active?.templateType}-${idx}`} className="it-challenge-item">{idx + 1}. {prompt}</div>
                        ))}
                      </div>
                      <div className="it-challenge-note">
                        שלב האתגר מגיע אחרי החשיפה: קודם בונים מפה, ואז בודקים את מה שנחשף.
                      </div>
                      <div className="it-actions">
                        <button type="button" className="it-btn secondary" onClick={() => setFocusStage('reveal')}>
                          חזרה ל-Reveal
                        </button>
                        <button type="button" className="it-btn primary" onClick={nextScenario}>
                          סיים סבב / הבא
                        </button>
                      </div>
                    </>
                  ) : null}
                </div>
              </div>
            )}

            {state.feedback ? <div className={`it-feedback ${state.feedback.tone}`}>{state.feedback.text}</div> : null}
            {state.lastCompletedRecap ? <div className="it-recap">{state.lastCompletedRecap}</div> : null}

            <div className="it-actions">
              <button type="button" className="it-btn primary" disabled={!state.completedAtLeastOneDrop} onClick={nextScenario}>
                סיים סבב / הבא
              </button>
              <button type="button" className="it-btn ghost" onClick={() => setState(INITIAL_STATE)}>
                אתחל מודול
              </button>
            </div>
          </section>

          <details className="it-collapse" open={false}>
            <summary>
              <span>מה עשינו כאן? / צ'קליסט</span>
              <span className="it-kicker">סקירה מהירה</span>
            </summary>
            <div className="it-collapse-body">
              <ul className="it-scenario-list">
                <li><span>1. בחרנו מילה/ביטוי</span><span>{state.selectedTokenId ? '✔' : '—'}</span></li>
                <li><span>2. גרירה/התאמה לתבנית</span><span>{state.completedAtLeastOneDrop ? '✔' : '—'}</span></li>
                <li><span>3. נחשפה שאלה + חריצים</span><span>{state.active ? '✔' : '—'}</span></li>
                <li><span>4. וריאציית "מטופל אחר"</span><span>{state.scoreVariants > 0 ? '✔' : '—'}</span></li>
                <li><span>5. Reveal-only (לא אמת)</span><span>✔</span></li>
              </ul>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}

