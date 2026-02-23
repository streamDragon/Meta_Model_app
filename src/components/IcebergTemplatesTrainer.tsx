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

type CauseTemplatePayload = TemplatePayloadBase & {
  mode?: CauseMode;
};

type TokenTemplatePayloads = Partial<Record<TemplateType, TemplatePayloadBase | CauseTemplatePayload>>;

type Scenario = {
  scenario_id: string;
  language: 'he' | string;
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

type ActiveMapping = {
  tokenId: string;
  templateType: TemplateType;
  setIndex: number;
};

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
  titleHe: string;
  titleEn: string;
  shortHelp: string;
  slotCount: 2 | 3;
};

const TEMPLATE_META: Record<TemplateType, TemplateMeta> = {
  CEQ: {
    type: 'CEQ',
    titleHe: 'הקבלה מורכבת / קריטריונים',
    titleEn: 'Complex Equivalence / Criteria',
    shortHelp: 'מה נחשב אצלך X? מפרקים למרכיבים/סימנים.',
    slotCount: 3
  },
  CAUSE: {
    type: 'CAUSE',
    titleHe: 'סיבתיות / תנאים',
    titleEn: 'Cause / Conditions',
    shortHelp: 'מה גורם ל-X או מה X מאפשר?',
    slotCount: 2
  },
  ASSUMPTIONS1: {
    type: 'ASSUMPTIONS1',
    titleHe: 'הנחות יסוד (אילוסטרציה)',
    titleEn: 'Assumptions-1',
    shortHelp: 'איזה דברים משתמעים מהמילה/ביטוי הזה?',
    slotCount: 3
  }
};

const INTRO_COPY = 'לפעמים מילה היא רק קצה-קרחון. כאן גוררים מילה/ביטוי לתוך "צורה" שמגלה מבנה עומק אפשרי. התשובות הן אילוסטרציה בלבד — לא אמת. אחרי שהמבנה גלוי, אפשר לבדוק/לערער בכלי אחר.';
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
.it-wrap{direction:rtl;font-family:"Assistant","Heebo","Noto Sans Hebrew","Segoe UI",sans-serif;background:radial-gradient(circle at 10% 0%,#fef3c7 0,#fffaf0 35%,#f8fafc 100%);color:#111827;max-width:1180px;margin:0 auto;border:1px solid #fde68a;border-radius:18px;padding:14px;box-shadow:0 16px 32px rgba(17,24,39,.06)}
.it-wrap *{box-sizing:border-box}.it-panel{background:#ffffffd9;border:1px solid #fde68a;border-radius:14px;padding:12px;box-shadow:0 8px 24px rgba(17,24,39,.04)}
.it-grid{display:grid;grid-template-columns:1.15fr .85fr;gap:12px}.it-stack{display:grid;gap:12px}
.it-title{margin:0;font-weight:900;font-size:1.2rem}.it-sub{margin:6px 0 0;color:#6b7280;line-height:1.4}
.it-intro{margin-top:10px;border:1px solid #fde68a;background:#fff7d6;color:#92400e;border-radius:10px;padding:10px;line-height:1.4}
.it-topbar{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}.it-chip{background:#fff;border:1px solid #fde68a;border-radius:999px;padding:6px 10px;font-weight:800;font-size:.82rem}
.it-textbox{margin-top:8px;border:1px solid #f3e8b3;background:#fff;border-radius:12px;padding:12px;line-height:2;min-height:110px}
.it-seg{white-space:pre-wrap}.it-token{display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:999px;border:1px dashed #f59e0b;background:#fffbeb;color:#92400e;font-weight:800;cursor:grab;user-select:none}
.it-token:hover{background:#fef3c7}.it-token.sel{border-style:solid;border-color:#2563eb;background:#eff6ff;color:#1d4ed8}.it-token.active{border-style:solid;border-color:#059669;background:#ecfdf5;color:#065f46}.it-token.dragging{opacity:.65}
.it-help{margin-top:8px;color:#6b7280;font-size:.84rem}.it-help strong{color:#111827}
.it-template-grid{display:grid;gap:10px}.it-template{border:1px solid #e5e7eb;background:#fff;border-radius:12px;padding:10px;transition:transform .16s ease,border-color .16s ease,box-shadow .16s ease}
.it-template[data-over="1"]{border-color:#2563eb;box-shadow:0 0 0 2px rgba(37,99,235,.14);transform:translateY(-1px)}
.it-template.is-active{border-color:#059669;box-shadow:0 0 0 2px rgba(5,150,105,.12)}
.it-template.is-disabled{opacity:.95}
.it-template.shake{animation:itShake .28s linear 1}
@keyframes itShake{0%{transform:translateX(0)}25%{transform:translateX(-3px)}50%{transform:translateX(3px)}75%{transform:translateX(-2px)}100%{transform:translateX(0)}}
.it-template-head{display:flex;justify-content:space-between;gap:8px;align-items:flex-start}.it-template-title{font-weight:900}.it-template-mini{font-size:.75rem;color:#6b7280}.it-template-help{margin-top:6px;color:#4b5563;font-size:.82rem;line-height:1.3}
.it-dropzone{margin-top:8px;border:1px dashed #d1d5db;border-radius:10px;padding:8px;background:#fafafa;min-height:44px;display:flex;align-items:center;justify-content:center;text-align:center;color:#6b7280;font-weight:700}
.it-dropzone.has-active{background:#f0fdf4;border-color:#86efac;color:#065f46}
.it-slots{margin-top:8px;display:grid;gap:8px}.it-slots.cols-2{grid-template-columns:1fr 1fr}.it-slots.cols-3{grid-template-columns:repeat(3,1fr)}
.it-slot{border:1px solid #e5e7eb;border-radius:10px;background:#f9fafb;padding:8px;min-height:56px;display:flex;align-items:center;justify-content:center;text-align:center;font-weight:700;line-height:1.3}
.it-question{margin-top:8px;border:1px solid #dbeafe;background:#eff6ff;border-radius:10px;padding:8px;color:#1e3a8a;font-weight:700;line-height:1.35}
.it-reflection{margin-top:8px;border:1px solid #dcfce7;background:#ecfdf5;border-radius:10px;padding:8px;color:#065f46;line-height:1.35}
.it-disclaimer{margin-top:8px;border:1px solid #fde68a;background:#fff7d6;border-radius:10px;padding:8px;color:#92400e;font-size:.84rem;font-weight:700;line-height:1.3}
.it-actions{margin-top:8px;display:flex;flex-wrap:wrap;gap:8px}.it-btn{border:0;border-radius:10px;padding:9px 12px;font-weight:800;cursor:pointer}.it-btn:disabled{opacity:.55;cursor:not-allowed}
.it-btn.primary{background:#2563eb;color:#fff}.it-btn.secondary{background:#e5e7eb;color:#111827}.it-btn.ghost{background:#fff;border:1px solid #d1d5db;color:#111827}
.it-feedback{margin-top:8px;border-radius:10px;padding:8px 10px;font-weight:700;line-height:1.35}.it-feedback.info{background:#eef2ff;border:1px solid #c7d2fe;color:#3730a3}.it-feedback.success{background:#ecfdf5;border:1px solid #bbf7d0;color:#166534}.it-feedback.error{background:#fef2f2;border:1px solid #fecaca;color:#991b1b}
.it-active{display:grid;gap:10px}.it-empty{color:#6b7280;border:1px dashed #d1d5db;border-radius:10px;padding:12px;background:#fafafa}
.it-recap{margin-top:8px;border:1px solid #bfdbfe;background:#f0f9ff;color:#0c4a6e;border-radius:10px;padding:8px;line-height:1.35}
.it-progress{display:flex;justify-content:space-between;gap:8px;align-items:center}.it-progress strong{font-weight:900}
.it-scenario-list{margin:0;padding:0;list-style:none;display:grid;gap:6px}
.it-scenario-list li{display:flex;justify-content:space-between;gap:8px;padding:6px 8px;border:1px solid #f3f4f6;border-radius:8px;background:#fff}
.it-kicker{font-size:.78rem;color:#6b7280}
@media (max-width: 980px){.it-grid{grid-template-columns:1fr}.it-slots.cols-3{grid-template-columns:1fr}.it-slots.cols-2{grid-template-columns:1fr}}
`;

function assetUrl(path: string): string {
  const token = (window as Window & { __ICEBERG_TEMPLATES_ASSET_V__?: string }).__ICEBERG_TEMPLATES_ASSET_V__;
  if (!token) return path;
  const sep = path.includes('?') ? '&' : '?';
  return `${path}${sep}v=${encodeURIComponent(token)}`;
}

function formatTemplateLabel(type: TemplateType): string {
  return TEMPLATE_META[type].titleHe;
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
  const parts: Array<
    | { kind: 'plain'; key: string; text: string }
    | { kind: 'token'; key: string; candidate: DraggableCandidate }
  > = [];
  let cursor = 0;
  sorted.forEach((candidate, idx) => {
    if (candidate.start > cursor) {
      parts.push({ kind: 'plain', key: `p-${idx}-${cursor}`, text: text.slice(cursor, candidate.start) });
    }
    parts.push({ kind: 'token', key: `t-${candidate.id}`, candidate });
    cursor = candidate.end;
  });
  if (cursor < text.length) {
    parts.push({ kind: 'plain', key: `p-tail-${cursor}`, text: text.slice(cursor) });
  }
  return parts;
}

function getTemplatePayload(
  scenario: Scenario,
  tokenId: string,
  templateType: TemplateType
): (TemplatePayloadBase | CauseTemplatePayload) | null {
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

function renderCauseDirectionLabel(payload: CauseTemplatePayload | TemplatePayloadBase): string | null {
  if (!('mode' in payload)) return null;
  if (payload.mode === 'CAUSES_OF_TOKEN') return 'כיוון: מה גורם/מאפשר';
  if (payload.mode === 'EFFECTS_OF_TOKEN') return 'כיוון: מה זה מאפשר';
  return null;
}

export default function IcebergTemplatesTrainer(): React.ReactElement {
  const [data, setData] = useState<ScenarioFile | null>(null);
  const [loadingError, setLoadingError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [draggingTokenId, setDraggingTokenId] = useState<string | null>(null);
  const [hoverTemplate, setHoverTemplate] = useState<TemplateType | null>(null);
  const [shakeTemplate, setShakeTemplate] = useState<TemplateType | null>(null);
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
          setLoading(false);
          setState(INITIAL_STATE);
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
    return scenario.draggables.find((d) => d.id === state.active?.tokenId) ?? null;
  }, [scenario, state.active]);

  const activePayload = useMemo(() => {
    if (!scenario || !state.active) return null;
    return getTemplatePayload(scenario, state.active.tokenId, state.active.templateType);
  }, [scenario, state.active]);

  const activeSet = useMemo(() => {
    if (!activePayload || !state.active) return [];
    return getCurrentSet(activePayload, state.active.setIndex);
  }, [activePayload, state.active]);

  const activeReflection = useMemo(() => {
    if (!activePayload || !state.active) return '';
    return fillPlaceholders(activePayload.reflection_template, activeSet);
  }, [activePayload, activeSet, state.active]);

  const activeVariantKey = useMemo(() => {
    if (!scenario || !state.active) return '';
    return buildVariantKey(scenario.scenario_id, state.active.tokenId, state.active.templateType);
  }, [scenario, state.active]);

  function setFeedback(feedback: Feedback | null) {
    setState((prev) => ({ ...prev, feedback }));
  }

  function failTemplate(templateType: TemplateType, text: string): void {
    setShakeTemplate(templateType);
    setFeedback({ tone: 'error', text });
  }

  function applyTokenToTemplate(tokenId: string, templateType: TemplateType): void {
    if (!scenario) return;
    const token = scenario.draggables.find((d) => d.id === tokenId);
    if (!token) {
      failTemplate(templateType, 'הטוקן שנבחר לא נמצא בתרחיש.');
      return;
    }
    if (!token.allowed_templates.includes(templateType)) {
      failTemplate(templateType, 'לא מתאים לתבנית הזו בסבב הזה.');
      return;
    }
    const payload = getTemplatePayload(scenario, tokenId, templateType);
    if (!payload) {
      failTemplate(templateType, 'תוכן חסר בקובץ התרגיל.');
      console.error('[IcebergTemplates] Missing template payload', { scenarioId: scenario.scenario_id, tokenId, templateType });
      return;
    }
    setState((prev) => ({
      ...prev,
      active: { tokenId, templateType, setIndex: 0 },
      selectedTokenId: tokenId,
      completedAtLeastOneDrop: true,
      scoreDrops: prev.active && prev.active.tokenId === tokenId && prev.active.templateType === templateType ? prev.scoreDrops : prev.scoreDrops + 1,
      feedback: {
        tone: 'success',
        text: `נבחרה תבנית ${formatTemplateLabel(templateType)} עבור "${token.text}". נחשף מבנה עומק אפשרי.`
      }
    }));
  }

  function cycleVariant(): void {
    if (!scenario || !state.active || !activePayload) return;
    const sets = Array.isArray(activePayload.sets) ? activePayload.sets : [];
    if (sets.length < 2) {
      setFeedback({ tone: 'info', text: 'לתרחיש הזה יש כרגע סט אילוסטרציה אחד בלבד.' });
      return;
    }
    setState((prev) => {
      if (!prev.active) return prev;
      const nextIndex = (prev.active.setIndex + 1) % sets.length;
      const alreadyAwarded = !!prev.variantBonusAwardedKeys[activeVariantKey];
      return {
        ...prev,
        active: { ...prev.active, setIndex: nextIndex },
        scoreVariants: alreadyAwarded ? prev.scoreVariants : prev.scoreVariants + 1,
        variantBonusAwardedKeys: alreadyAwarded
          ? prev.variantBonusAwardedKeys
          : { ...prev.variantBonusAwardedKeys, [activeVariantKey]: true },
        feedback: { tone: 'info', text: 'הוצגה וריאציה של "מטופל אחר" כדי להמחיש שזה לא מוחלט.' }
      };
    });
  }

  function clearActive(): void {
    setState((prev) => ({
      ...prev,
      active: null,
      feedback: { tone: 'info', text: 'האזור הפעיל אופס. אפשר לגרור טוקן לתבנית אחרת.' }
    }));
  }

  function nextScenario(): void {
    if (!scenario) return;
    const activeLabel = state.active ? formatTemplateLabel(state.active.templateType) : '';
    const tokenLabel = activeToken?.text || '';
    const recap = state.completedAtLeastOneDrop
      ? `היום חשפנו: "${tokenLabel}" בתוך תבנית "${activeLabel}". ${OUTRO_COPY}`
      : '';
    setState((prev) => ({
      ...prev,
      currentScenarioIndex: scenarioCount ? (prev.currentScenarioIndex + 1) % scenarioCount : 0,
      selectedTokenId: null,
      active: null,
      completedAtLeastOneDrop: false,
      feedback: { tone: 'info', text: 'עברנו לתרחיש הבא. בחר/י מילה/ביטוי מודגש וגרור/י לתבנית.' },
      lastCompletedRecap: recap
    }));
    setHoverTemplate(null);
    setDraggingTokenId(null);
  }

  function onDragStart(event: React.DragEvent<HTMLButtonElement>, tokenId: string): void {
    try {
      event.dataTransfer.setData('text/plain', tokenId);
      event.dataTransfer.effectAllowed = 'copyMove';
    } catch {
      // no-op
    }
    setDraggingTokenId(tokenId);
    setState((prev) => ({ ...prev, selectedTokenId: tokenId }));
  }

  function onDragEnd(): void {
    setDraggingTokenId(null);
    setHoverTemplate(null);
  }

  function onTokenTap(tokenId: string): void {
    setState((prev) => ({
      ...prev,
      selectedTokenId: prev.selectedTokenId === tokenId ? null : tokenId,
      feedback: { tone: 'info', text: prev.selectedTokenId === tokenId ? 'בוטל סימון הטוקן.' : 'נבחר טוקן. עכשיו הקש/י על תבנית כדי להחיל (מובייל).' }
    }));
  }

  function handleTemplateDrop(event: React.DragEvent<HTMLDivElement>, templateType: TemplateType): void {
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

  function handleTemplateClick(templateType: TemplateType): void {
    if (!state.selectedTokenId) {
      setFeedback({ tone: 'info', text: 'במובייל: בחר/י קודם טוקן מודגש ואז הקש/י על תבנית.' });
      return;
    }
    applyTokenToTemplate(state.selectedTokenId, templateType);
  }

  const segments = useMemo(() => {
    if (!scenario) return [];
    return getSegments(scenario.client_text, scenario.draggables);
  }, [scenario]);

  if (loading) {
    return (
      <div className="it-wrap" dir="rtl" lang="he">
        <style>{css}</style>
        <div className="it-panel">
          <h1 className="it-title">קצה קרחון / שלדי עומק</h1>
          <p className="it-sub">טוען תרחישים וצורות…</p>
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

  return (
    <div className="it-wrap" dir="rtl" lang="he">
      <style>{css}</style>

      <div className="it-panel">
        <div className="it-progress">
          <div>
            <h1 className="it-title">קצה קרחון / שלדי עומק</h1>
            <p className="it-sub">Iceberg Templates (Word → Deep-Structure Builder)</p>
          </div>
          <div className="it-topbar">
            <span className="it-chip">תרחיש <strong>{state.currentScenarioIndex + 1}</strong> / {scenarioCount}</span>
            <span className="it-chip">ניקוד מבני: <strong>{state.scoreDrops}</strong></span>
            <span className="it-chip">"מטופל אחר": <strong>{state.scoreVariants}</strong></span>
          </div>
        </div>
        <div className="it-intro">{INTRO_COPY}</div>
      </div>

      <div className="it-grid" style={{ marginTop: 12 }}>
        <div className="it-stack">
          <section className="it-panel" aria-label="Scenario text">
            <div className="it-kicker">Scenario ID: <code>{scenario.scenario_id}</code></div>
            <h2 className="it-title" style={{ fontSize: '1.05rem', marginTop: 4 }}>משפט מטופל / חלון טקסט</h2>
            <p className="it-sub">גרור/י רק מילים/ביטויים מודגשים. במובייל: הקש/י על מילה ואז הקש/י על תבנית.</p>

            <div className="it-textbox" aria-live="polite">
              {segments.map((seg) => {
                if (seg.kind === 'plain') {
                  return (
                    <span key={seg.key} className="it-seg">
                      {seg.text}
                    </span>
                  );
                }
                const candidate = seg.candidate;
                const isSelected = state.selectedTokenId === candidate.id;
                const isActive = state.active?.tokenId === candidate.id;
                const isDragging = draggingTokenId === candidate.id;
                return (
                  <button
                    key={seg.key}
                    type="button"
                    draggable
                    className={[
                      'it-token',
                      isSelected ? 'sel' : '',
                      isActive ? 'active' : '',
                      isDragging ? 'dragging' : ''
                    ].filter(Boolean).join(' ')}
                    onDragStart={(e) => onDragStart(e, candidate.id)}
                    onDragEnd={onDragEnd}
                    onClick={() => onTokenTap(candidate.id)}
                    title={`תבניות מותרות: ${candidate.allowed_templates.join(', ')}`}
                    aria-pressed={isSelected}
                  >
                    {candidate.text}
                  </button>
                );
              })}
            </div>

            <div className="it-help">
              <strong>מועמדים לגרירה:</strong> {scenario.draggables.map((d) => d.text).join(' • ')}
            </div>
          </section>

          <section className="it-panel" aria-label="Template gallery">
            <h2 className="it-title" style={{ fontSize: '1.05rem' }}>גלריית צורות / Templates</h2>
            <p className="it-sub">הפיל/י מילה/ביטוי לתוך הצורה המתאימה. אם אין התאמה — תקבל/י משוב קצר.</p>

            <div className="it-template-grid">
              {(Object.keys(TEMPLATE_META) as TemplateType[]).map((type) => {
                const meta = TEMPLATE_META[type];
                const isActive = state.active?.templateType === type;
                const isHover = hoverTemplate === type;
                const payload = isActive && activePayload ? activePayload : null;
                const slotCount = meta.slotCount;
                const slots = isActive ? activeSet : [];
                return (
                  <div
                    key={type}
                    className={[
                      'it-template',
                      isActive ? 'is-active' : '',
                      shakeTemplate === type ? 'shake' : ''
                    ].filter(Boolean).join(' ')}
                    data-over={isHover ? '1' : '0'}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setHoverTemplate(type);
                    }}
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
                      <span className="it-template-mini">{slotCount} slots</span>
                    </div>
                    <div className="it-template-help">{meta.shortHelp}</div>

                    <div className={`it-dropzone${isActive ? ' has-active' : ''}`}>
                      {isActive && activeToken
                        ? <>טוקן פעיל: <strong style={{ marginInlineStart: 6 }}>{activeToken.text}</strong></>
                        : 'גרור/י לכאן טוקן מודגש'}
                    </div>

                    {isActive && payload ? (
                      <>
                        {renderCauseDirectionLabel(payload) ? (
                          <div className="it-help"><strong>{renderCauseDirectionLabel(payload)}</strong></div>
                        ) : null}
                        <div className="it-question">{payload.question}</div>
                        <div className={`it-slots cols-${slotCount}`}>
                          {Array.from({ length: slotCount }).map((_, idx) => (
                            <div key={idx} className="it-slot">
                              {slots[idx] || <span style={{ color: '#9ca3af' }}>—</span>}
                            </div>
                          ))}
                        </div>
                        <div className="it-reflection">{activeReflection}</div>
                        <div className="it-disclaimer">{DISCLAIMER_COPY}</div>
                        <div className="it-actions">
                          <button type="button" className="it-btn secondary" onClick={(e) => { e.stopPropagation(); cycleVariant(); }}>
                            מטופל אחר / תשובה אחרת
                          </button>
                          <button type="button" className="it-btn ghost" onClick={(e) => { e.stopPropagation(); clearActive(); }}>
                            אפס תבנית
                          </button>
                        </div>
                      </>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        <div className="it-stack">
          <section className="it-panel" aria-label="Active output">
            <h2 className="it-title" style={{ fontSize: '1.05rem' }}>תצוגת תוצאה / Reveal</h2>
            <p className="it-sub">אחרי גרירה תקינה, יוצגו כאן השאלה, מילוי החריצים והשיקוף.</p>

            {state.active && activeToken && activePayload ? (
              <div className="it-active">
                <div className="it-chip" style={{ width: 'fit-content' }}>
                  טוקן: <strong>{activeToken.text}</strong> · תבנית: <strong>{formatTemplateLabel(state.active.templateType)}</strong>
                </div>
                <div className="it-question">{activePayload.question}</div>
                <div className={`it-slots cols-${TEMPLATE_META[state.active.templateType].slotCount}`}>
                  {Array.from({ length: TEMPLATE_META[state.active.templateType].slotCount }).map((_, idx) => (
                    <div key={idx} className="it-slot">{activeSet[idx] || '—'}</div>
                  ))}
                </div>
                <div className="it-reflection">{activeReflection}</div>
                <div className="it-disclaimer">{DISCLAIMER_COPY}</div>
              </div>
            ) : (
              <div className="it-empty">
                עוד לא בוצעה גרירה תקינה. בחר/י טוקן מודגש והנח/י אותו על אחת התבניות.
              </div>
            )}

            {state.feedback ? (
              <div className={`it-feedback ${state.feedback.tone}`}>{state.feedback.text}</div>
            ) : null}

            {state.lastCompletedRecap ? (
              <div className="it-recap">{state.lastCompletedRecap}</div>
            ) : null}

            <div className="it-actions">
              <button
                type="button"
                className="it-btn primary"
                disabled={!state.completedAtLeastOneDrop}
                onClick={nextScenario}
              >
                סיים סבב / הבא
              </button>
              <button
                type="button"
                className="it-btn ghost"
                onClick={() => setState(INITIAL_STATE)}
              >
                אתחל מודול
              </button>
            </div>
          </section>

          <section className="it-panel" aria-label="Quick checklist">
            <h2 className="it-title" style={{ fontSize: '1.05rem' }}>מה עשינו כאן?</h2>
            <ul className="it-scenario-list">
              <li><span>1. בחרנו מילה/ביטוי</span><span>{state.selectedTokenId ? '✓' : '—'}</span></li>
              <li><span>2. התאמה לתבנית (שלד)</span><span>{state.completedAtLeastOneDrop ? '✓' : '—'}</span></li>
              <li><span>3. נחשפה שאלה + מילוי חריצים</span><span>{state.active ? '✓' : '—'}</span></li>
              <li><span>4. "מטופל אחר" (וריאציה)</span><span>{state.scoreVariants > 0 ? '✓' : '—'}</span></li>
              <li><span>5. Reveal-only (לא אמת)</span><span>✓</span></li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}

