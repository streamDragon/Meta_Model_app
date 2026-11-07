import { useEffect, useMemo, useState } from 'react';
import './gforce-map.css';

type StepStatus = 'pending' | 'done' | 'unknown';
type Resource = { id: string; label: string; ready: boolean };
type ActionStep = { id: string; label: string; status: StepStatus; children: ActionStep[] };
type CaseMap = {
  schemaVersion: 2;
  title: string;
  present: string;
  desired: string;
  reason: string;
  obstacle: string;
  resourceNote: string;
  cost: string;
  resources: Resource[];
  steps: ActionStep[];
};

const STORAGE_KEY = 'wisdom:gforce-action-map:v2';

const SAMPLE: CaseMap = {
  schemaVersion: 2,
  title: 'לסדר את הרצפה בחדר',
  present: 'יש חפצים על הרצפה, ועדיין לא ברור אם כל כלי הניקיון מוכנים.',
  desired: 'הרצפה הגלויה פנויה ונקייה. אין צורך בניקיון יסודי הפעם.',
  reason: '',
  obstacle: '',
  resourceNote: '',
  cost: '',
  resources: [
    { id: 'bin', label: 'פח', ready: false },
    { id: 'broom', label: 'מטאטא', ready: false },
    { id: 'pan', label: 'יעה', ready: false },
  ],
  steps: [
    { id: 'clear', label: 'לפנות חפצים מהרצפה הגלויה', status: 'pending', children: [
      { id: 'pick', label: 'להרים חפץ אחד', status: 'pending', children: [] },
      { id: 'place', label: 'להניח אותו במקום ידוע או באזור ביניים', status: 'pending', children: [] },
    ] },
    { id: 'sweep', label: 'לטאטא את הרצפה הגלויה', status: 'pending', children: [] },
  ],
};

function isStep(value: unknown): value is ActionStep {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<ActionStep>;
  return typeof item.id === 'string' && typeof item.label === 'string' &&
    ['pending', 'done', 'unknown'].includes(item.status ?? '') &&
    Array.isArray(item.children) && item.children.every(isStep);
}

function loadMap(): CaseMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return SAMPLE;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return SAMPLE;
    const map = parsed as Partial<CaseMap>;
    if (map.schemaVersion !== 2 || typeof map.present !== 'string' ||
        typeof map.desired !== 'string' || typeof map.title !== 'string' ||
        !Array.isArray(map.resources) || !Array.isArray(map.steps) ||
        !map.steps.every(isStep)) return SAMPLE;
    return { ...SAMPLE, ...map, resources: map.resources.filter((r): r is Resource =>
      Boolean(r && typeof r.id === 'string' && typeof r.label === 'string' && typeof r.ready === 'boolean')) };
  } catch { return SAMPLE; }
}

function editStep(steps: ActionStep[], id: string, edit: (step: ActionStep) => ActionStep): ActionStep[] {
  return steps.map((step) => step.id === id ? edit(step) : { ...step, children: editStep(step.children, id, edit) });
}

function countSteps(steps: ActionStep[]): { completed: number; total: number } {
  return steps.reduce((result, step) => {
    const children = countSteps(step.children);
    // A parent with children is a container, not a second completion credit.
    return { completed: result.completed + children.completed + (step.children.length ? 0 : Number(step.status === 'done')),
      total: result.total + children.total + (step.children.length ? 0 : 1) };
  }, { completed: 0, total: 0 });
}

function saveToFile(map: CaseMap, caseText: string) {
  const payload = { ...map, privateCase: caseText.trim() || undefined, exportedAt: new Date().toISOString() };
  const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'wisdom-gforce-map.json';
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const REFLECTIONS = [
  { key: 'reason', label: 'למה זה חשוב לי?', placeholder: 'מה זה יאפשר לי?' },
  { key: 'obstacle', label: 'מה עלול לעצור אותי?', placeholder: 'מחסום או חוסר ודאות' },
  { key: 'resourceNote', label: 'איזו יכולת או עזרה כבר יש לי?', placeholder: 'משאב שכבר קיים' },
  { key: 'cost', label: 'איזה מחיר אני מוכן לשלם, ומה לא?', placeholder: 'גם פתרון טוב דיו הוא פתרון' },
] as const;

export function GForceActionMapPage() {
  const [map, setMap] = useState<CaseMap>(loadMap);
  const [newAction, setNewAction] = useState('');
  const [substepText, setSubstepText] = useState<Record<string, string>>({});
  const [expandedStep, setExpandedStep] = useState<string | null>(null);
  const [caseText, setCaseText] = useState('');
  const [caseSaved, setCaseSaved] = useState(false);
  const [exportMessage, setExportMessage] = useState('');
  const [showGForce, setShowGForce] = useState(false);
  const counts = useMemo(() => countSteps(map.steps), [map.steps]);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(map)); } catch { /* local storage may be unavailable */ }
  }, [map]);

  const patch = (values: Partial<CaseMap>) => setMap((old) => ({ ...old, ...values }));
  const updateStep = (id: string, edit: (step: ActionStep) => ActionStep) =>
    setMap((old) => ({ ...old, steps: editStep(old.steps, id, edit) }));

  const addStep = () => {
    const label = newAction.trim();
    if (!label) return;
    patch({ steps: [...map.steps, { id: crypto.randomUUID(), label, status: 'pending', children: [] }] });
    setNewAction('');
  };

  const addSubstep = (id: string) => {
    const label = (substepText[id] ?? '').trim();
    if (!label) return;
    updateStep(id, (step) => ({
      ...step,
      status: 'pending',
      children: [...step.children, { id: crypto.randomUUID(), label, status: 'pending', children: [] }],
    }));
    setSubstepText((old) => ({ ...old, [id]: '' }));
  };

  const renderStep = (step: ActionStep, depth = 0): JSX.Element => (
    <li key={step.id} className="gf-step">
      <div className="gf-step-main" style={{ marginInlineStart: depth ? 12 : 0 }}>
        <span className="gf-step-label">{step.label}</span>
        <div className="gf-step-buttons" role="group" aria-label={`מה מצב הפעולה: ${step.label}`}>
          <button type="button" className={step.status === 'done' ? 'chosen' : ''} onClick={() =>
            updateStep(step.id, (item) => ({ ...item, status: 'done' }))} aria-label={`בוצע: ${step.label}`}>✓</button>
          <button type="button" className={step.status === 'pending' ? 'chosen' : ''} onClick={() =>
            updateStep(step.id, (item) => ({ ...item, status: 'pending' }))} aria-label={`עדיין לא: ${step.label}`}>·</button>
          <button type="button" className={step.status === 'unknown' ? 'chosen' : ''} onClick={() =>
            updateStep(step.id, (item) => ({ ...item, status: 'unknown' }))} aria-label={`לא ברור: ${step.label}`}>?</button>
        </div>
      </div>
      <button type="button" className="gf-split-link" onClick={() => setExpandedStep(expandedStep === step.id ? null : step.id)}>
        {expandedStep === step.id ? 'סגור פירוק' : '+ הפעולה גדולה מדי? פרק לצעד קטן'}
      </button>
      {expandedStep === step.id && <div className="gf-split-editor">
        <label htmlFor={`sub-${step.id}`}>מה הדבר הקטן הראשון שצריך לעשות?</label>
        <div className="gf-inline-input">
          <input id={`sub-${step.id}`} value={substepText[step.id] ?? ''}
            onChange={(event) => setSubstepText((old) => ({ ...old, [step.id]: event.target.value }))}
            onKeyDown={(event) => { if (event.key === 'Enter') addSubstep(step.id); }}
            placeholder="למשל: להביא סל" />
          <button type="button" onClick={() => addSubstep(step.id)}>הוסף</button>
        </div>
      </div>}
      {step.children.length > 0 && <ul className="gf-nested">{step.children.map((child) => renderStep(child, depth + 1))}</ul>}
    </li>
  );

  return <div className="gf-page" dir="rtl">
    <header className="gf-intro">
      <span className="gf-eyebrow">WISDOM • G-FORCE + PERSONAL TIME MAP</span>
      <h2>🧭 מפת המהלך שלי</h2>
      <p>ממצב קיים למצב רצוי. כל מעבר הוא פעולה שאפשר לבדוק, לבצע או לפרק. בלי בינה מלאכותית ובלי אבחון אוטומטי.</p>
    </header>
    <section className="gf-panel" aria-labelledby="gf-goal">
      <h3 id="gf-goal">מה רוצים לשנות?</h3>
      <label htmlFor="gf-title">שם המהלך</label>
      <input id="gf-title" value={map.title} onChange={(event) => patch({ title: event.target.value })} maxLength={120} />
      <div className="gf-scenes">
        <div className="gf-scene gf-before"><span aria-hidden="true">📍</span><label htmlFor="gf-present">המצב עכשיו</label>
          <textarea id="gf-present" rows={3} value={map.present} onChange={(event) => patch({ present: event.target.value })} /></div>
        <span className="gf-scene-arrow" aria-hidden="true">↓</span>
        <div className="gf-scene gf-after"><span aria-hidden="true">🎯</span><label htmlFor="gf-desired">כך אדע שהצלחתי</label>
          <textarea id="gf-desired" rows={3} value={map.desired} onChange={(event) => patch({ desired: event.target.value })} /></div>
      </div>
      <p className="gf-minor">מתארים רק מה שידוע. תמונות אמיתיות ופרטים שלא נבדקו אינם נוצרים אוטומטית.</p>
    </section>
    <section className="gf-panel" aria-labelledby="gf-resources">
      <h3 id="gf-resources">🧰 מה צריך להכין?</h3>
      <p>משאב אינו פעולה. סמנו רק מה שבאמת מוכן.</p>
      <div className="gf-resources">{map.resources.map((resource) =>
        <label key={resource.id} className="gf-resource">
          <input type="checkbox" checked={resource.ready} onChange={(event) =>
            patch({ resources: map.resources.map((item) => item.id === resource.id ? { ...item, ready: event.target.checked } : item) })} />
          {resource.label}
        </label>)}</div>
      <details className="gf-optional"><summary>צריך משאב אחר?</summary>
        <form onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          const label = String(data.get('resource') ?? '').trim();
          if (label) patch({ resources: [...map.resources, { id: crypto.randomUUID(), label, ready: false }] });
          event.currentTarget.reset();
        }}><input name="resource" aria-label="שם המשאב" placeholder="למשל: סל לאחסון" maxLength={90} />
          <button type="submit">הוסף משאב</button></form>
      </details>
    </section>
    <section className="gf-panel" aria-labelledby="gf-steps">
      <div className="gf-section-row"><h3 id="gf-steps">🪜 הדרך למצב הרצוי</h3><span className="gf-counter">{counts.completed}/{counts.total} צעדים הושלמו</span></div>
      <p>בכל פעולה: ✓ בוצע, · עדיין לא, ? לא ידוע. אפשר לפרק כל מעבר בלי סוף מוגדר מראש.</p>
      <ol className="gf-steps">{map.steps.map((step) => renderStep(step))}</ol>
      <div className="gf-inline-input">
        <input aria-label="פעולה חדשה" placeholder="איזו פעולה נוספת נדרשת?" value={newAction}
          onChange={(event) => setNewAction(event.target.value)}
          onKeyDown={(event) => { if (event.key === 'Enter') addStep(); }} />
        <button type="button" onClick={addStep}>+ הוסף</button>
      </div>
    </section>
    <section className="gf-panel gf-reflection" aria-labelledby="gf-reflection">
      <h3 id="gf-reflection">🧠 שאלות G-Force לפי הצורך</h3>
      <p>לא חייבים לענות על כל שאלה. פותחים אותן רק כשזה עוזר להמשיך.</p>
      <button type="button" className="gf-secondary" onClick={() => setShowGForce((value) => !value)}>
        {showGForce ? 'הסתר שאלות' : 'פתח שאלות עומק'}
      </button>
      {showGForce && <div className="gf-questions">{REFLECTIONS.map(({ key, label, placeholder }) =>
        <label key={key}>{label}<textarea rows={2} value={map[key]} placeholder={placeholder}
          onChange={(event) => patch({ [key]: event.target.value })} /></label>)}</div>}
    </section>
    <section className="gf-panel" aria-labelledby="gf-own-case">
      <h3 id="gf-own-case">📬 מקרה מהחיים שלי</h3>
      <p>אפשר לכתוב מקרה חופשי. כרגע הוא נשאר במכשיר בלבד, ואינו נשלח למנהל האתר.</p>
      <textarea aria-label="תיאור מקרה אישי" rows={4} placeholder="מה קורה? מה אני רוצה שיקרה במקום? מה כבר ניסיתי?"
        value={caseText} onChange={(event) => { setCaseText(event.target.value); setCaseSaved(false); }} />
      <div className="gf-actions">
        <button type="button" className="gf-primary" onClick={() => {
          saveToFile(map, caseText);
          setCaseSaved(true);
          setExportMessage('קובץ המפה ירד למכשיר שלך. לא נשלח מידע לאתר.');
        }}>ייצוא המפה והמקרה</button>
        <button type="button" className="gf-secondary" onClick={() => {
          saveToFile(map, '');
          setExportMessage('קובץ המפה ללא המקרה האישי ירד למכשיר.');
        }}>ייצוא בלי מקרה אישי</button>
      </div>
      {caseSaved && <p role="status">המקרה לא נשלח; ניתן לשלוח את הקובץ באופן יזום רק אם תרצה.</p>}
      {exportMessage && <p role="status">{exportMessage}</p>}
      <p className="gf-minor">טופס פניות לשרת יופעל רק אחרי הקמת תיבה פרטית עם הרשאות, מדיניות שמירה ואישור מפורש לשליחה.</p>
    </section>
    <footer className="gf-footer">
      <span>המפה נשמרת בדפדפן הנוכחי בלבד. שמור עותק בקובץ אם חשוב לך שלא תאבד.</span>
      <button type="button" className="gf-reset" onClick={() => { if (window.confirm('לאפס את המפה לדוגמה?')) setMap(SAMPLE); }}>חזרה לדוגמה</button>
    </footer>
  </div>;
}
