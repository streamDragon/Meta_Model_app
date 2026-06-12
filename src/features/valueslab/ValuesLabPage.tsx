import { useState } from 'react';
import rawPack from '../../../packs/values-constraints.json';
import {
  createTradeoff,
  createVclCard,
  createVclSession,
  diagnoseValuesSession,
  generateVclMoves,
  generateVclQuestions,
  type VclCard,
  type VclData,
  type VclSession,
} from '../../lib/valuesLab';
import { useIsMobile } from '../../lib/useIsMobile';
import { useProgress } from '../../store/useProgress';
import { useHint } from '../../store/hint';
import { HowItWorks } from '../../components/HowItWorks';

const data = rawPack as unknown as VclData;
const STORAGE_KEY = 'vcl_sessions';
const MAX_SESSIONS = 20;

function loadSessions(): VclSession[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? (parsed as VclSession[]) : [];
  } catch {
    return [];
  }
}

function persistSession(session: VclSession): VclSession[] {
  const updated = { ...session, updatedAt: new Date().toISOString() };
  const sessions = loadSessions().filter((s) => s.sessionId !== updated.sessionId);
  sessions.unshift(updated);
  while (sessions.length > MAX_SESSIONS) sessions.pop();
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch {
    // storage unavailable — keep in-memory only
  }
  return sessions;
}

const typeInfo = (id: string) =>
  data.card_types.find((t) => t.id === id) ?? { id, label: id, icon: '🏷️' };
const levelInfo = (id: string) =>
  data.logical_levels.find((l) => l.id === id) ?? { id, label: id };
const negotiabilityLabel = (id: string) =>
  data.negotiability_options.find((n) => n.id === id)?.label ?? id;

function CardForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: VclCard;
  onSave: (fields: Partial<VclCard>) => void;
  onCancel: () => void;
}) {
  const [fields, setFields] = useState({ ...initial });
  const { showHint } = useHint();
  const set = <K extends keyof VclCard>(key: K, value: VclCard[K]) =>
    setFields((f) => ({ ...f, [key]: value }));

  return (
    <div className="vcl-card-form q-card">
      <h4>{initial.label ? 'עריכת כרטיס' : 'כרטיס חדש: ערך / אילוץ'}</h4>
      <label htmlFor="vcl-f-label">שם קצר (מה חייב להתקיים?)</label>
      <input
        id="vcl-f-label"
        type="text"
        value={fields.label}
        placeholder="לדוגמה: שזה לא יעלה יותר מדי"
        onChange={(e) => set('label', e.target.value)}
      />
      <label htmlFor="vcl-f-type">סוג</label>
      <select id="vcl-f-type" value={fields.type} onChange={(e) => set('type', e.target.value)}>
        {data.card_types.map((t) => (
          <option key={t.id} value={t.id}>
            {t.icon} {t.label} {t.hint ? `— ${t.hint}` : ''}
          </option>
        ))}
      </select>
      <label htmlFor="vcl-f-importance">
        חשיבות (1-10): <span>{fields.importance}</span>
      </label>
      <input
        id="vcl-f-importance"
        type="range"
        min={1}
        max={10}
        value={fields.importance}
        onChange={(e) => set('importance', Number(e.target.value))}
      />
      <label htmlFor="vcl-f-minimum">מינימום מקובל ("מספיק טוב לעכשיו")</label>
      <input
        id="vcl-f-minimum"
        type="text"
        value={fields.minimum}
        placeholder="מה הגרסה הקטנה ביותר שעדיין בסדר?"
        onChange={(e) => set('minimum', e.target.value)}
      />
      <label htmlFor="vcl-f-ideal">אידיאל</label>
      <input
        id="vcl-f-ideal"
        type="text"
        value={fields.ideal}
        placeholder="איך זה נראה במיטבו?"
        onChange={(e) => set('ideal', e.target.value)}
      />
      <label htmlFor="vcl-f-negotiability">משא ומתן</label>
      <select
        id="vcl-f-negotiability"
        value={fields.negotiability}
        onChange={(e) => set('negotiability', e.target.value as VclCard['negotiability'])}
      >
        {data.negotiability_options.map((n) => (
          <option key={n.id} value={n.id}>
            {n.label}
          </option>
        ))}
      </select>
      <label htmlFor="vcl-f-level">רמה לוגית (Dilts)</label>
      <select
        id="vcl-f-level"
        value={fields.logicalLevel}
        onChange={(e) => set('logicalLevel', e.target.value)}
      >
        {data.logical_levels.map((l) => (
          <option key={l.id} value={l.id}>
            {l.label} {l.hint ? `— ${l.hint}` : ''}
          </option>
        ))}
      </select>
      <label htmlFor="vcl-f-notes">הערות</label>
      <input
        id="vcl-f-notes"
        type="text"
        value={fields.notes}
        placeholder="תנאי סמוי? מי עוד צריך להיות מרוצה?"
        onChange={(e) => set('notes', e.target.value)}
      />
      <div className="step-buttons">
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          ביטול
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            if (!fields.label.trim()) {
              showHint('תן שם קצר לערך או לאילוץ');
              return;
            }
            onSave(fields);
          }}
        >
          שמור כרטיס
        </button>
      </div>
    </div>
  );
}

export function ValuesLabPage() {
  const [session, setSession] = useState<VclSession | null>(null);
  const [saved, setSaved] = useState<VclSession[]>(loadSessions);
  const [statement, setStatement] = useState('');
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [wizardIndex, setWizardIndex] = useState(0);
  const [awarded, setAwarded] = useState(false);
  const isMobile = useIsMobile();
  const { addXP, recordSession } = useProgress();
  const { showHint } = useHint();

  const updateSession = (mutate: (s: VclSession) => VclSession) => {
    setSession((current) => {
      if (!current) return current;
      const next = mutate(current);
      setSaved(persistSession(next));
      return next;
    });
  };

  const openSession = (s: VclSession) => {
    setSession(s);
    setEditingCardId(null);
    setWizardIndex(0);
    setAwarded(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const startFromStatement = () => {
    if (!statement.trim()) {
      showHint('כתוב משפט אחד: "אני רוצה ___ אבל ___"');
      return;
    }
    openSession(createVclSession(statement.trim()));
    setStatement('');
  };

  const startFromExample = (example: VclSession) => {
    const copy: VclSession = JSON.parse(JSON.stringify(example));
    const fresh = createVclSession('');
    copy.sessionId = fresh.sessionId;
    copy.createdAt = new Date().toISOString();
    openSession(copy);
  };

  const closeWorkspace = () => {
    if (session) setSaved(persistSession(session));
    setSession(null);
    setEditingCardId(null);
    setWizardIndex(0);
  };

  const saveCard = (fields: Partial<VclCard>) => {
    updateSession((s) => {
      if (editingCardId && editingCardId !== 'new') {
        return {
          ...s,
          constraints: s.constraints.map((c) =>
            c.id === editingCardId ? { ...c, ...fields, importance: Number(fields.importance) || c.importance } : c,
          ),
        };
      }
      const next = { ...s, constraints: [...s.constraints, createVclCard(fields)] };
      setWizardIndex(next.constraints.length - 1);
      return next;
    });
    setEditingCardId(null);
  };

  const deleteCard = (id: string) => {
    updateSession((s) => ({
      ...s,
      constraints: s.constraints.filter((c) => c.id !== id),
      tradeoffs: s.tradeoffs.filter((t) => !(t.between || []).includes(id)),
    }));
    setWizardIndex((i) => Math.max(0, i - 1));
  };

  const diagnose = () => {
    if (!session) return;
    if (session.constraints.length === 0) {
      showHint('הוסף לפחות כרטיס אחד לפני אבחון');
      return;
    }
    updateSession((s) => {
      const diagnosis = diagnoseValuesSession(s);
      const questionsGenerated = generateVclQuestions(s, data.meta_model_questions);
      const insights =
        diagnosis.length === 0
          ? [...s.insights, 'המפה מאוזנת: יש היררכיה, יש מינימום מוגדר ואין עומס אילוצים קשיחים.']
          : s.insights;
      return { ...s, diagnosis, questionsGenerated, insights };
    });
    if (!awarded) {
      addXP(15);
      recordSession();
      setAwarded(true);
    }
  };

  const exportSession = () => {
    if (!session) return;
    const blob = new Blob([JSON.stringify(session, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `values_lab_${session.sessionId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ---------- start screen ----------

  if (!session) {
    return (
      <div className="card">
        <h2>💎 מעבדת ערכים ואילוצים</h2>
        <p>
          "אני רוצה ___ אבל ___" — המעבדה ממפה מה באמת חייב להתקיים, איפה ההתנגשויות,
          ומה אפשר לרכך. הכל מבוסס חוקים, ללא AI.
        </p>
        <div className="feature-brief">
          <span>
            <strong>מטרה:</strong> לגלות את מפת האילוצים הסמויה מאחורי רצון תקוע.
          </span>
          <span>
            <strong>תוצר:</strong> אבחנה למה זה תקוע + שאלות + מהלכים.
          </span>
        </div>

        <HowItWorks
          steps={[
            { icon: '✍️', title: 'כותבים משפט', detail: '"אני רוצה ___ אבל ___" — או בוחרים דוגמה' },
            { icon: '🃏', title: 'ממפים כרטיסים', detail: 'כל ערך, פחד, מחיר ואילוץ מקבל כרטיס' },
            { icon: '⚔️', title: 'מסמנים התנגשויות', detail: 'אילו שני תנאים מושכים לכיוונים מנוגדים?' },
            { icon: '🩺', title: 'מאבחנים', detail: 'למה זה תקוע + שאלות מטה-מודל + מהלכים' },
          ]}
        />

        <div className="vcl-start-row">
          <input
            id="vcl-statement"
            type="text"
            value={statement}
            placeholder='אני רוצה ___ אבל ___'
            aria-label="משפט פתיחה"
            onChange={(e) => setStatement(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && startFromStatement()}
          />
          <button type="button" className="btn btn-primary" onClick={startFromStatement}>
            🚀 התחל מיפוי
          </button>
        </div>

        <h3 className="section-title">📦 דוגמאות מוכנות</h3>
        <div className="vcl-example-grid">
          {data.starter_examples.map((example) => (
            <button
              key={example.sessionId}
              type="button"
              className="vcl-example-chip"
              onClick={() => startFromExample(example)}
            >
              <strong>{example.title}</strong>
              <small>{example.initialStatement}</small>
            </button>
          ))}
        </div>

        <h3 className="section-title">🗂️ סשנים שמורים</h3>
        {saved.length === 0 ? (
          <p className="muted">אין עדיין סשנים שמורים. ההתקדמות נשמרת אוטומטית בכל שינוי.</p>
        ) : (
          <div className="vcl-saved-list">
            {saved.map((s) => (
              <div className="vcl-saved-row" key={s.sessionId}>
                <button type="button" className="vcl-saved-open" onClick={() => openSession(s)}>
                  <strong>{s.title || s.mainDesire || 'ללא כותרת'}</strong>
                  <small>
                    {s.constraints.length} כרטיסים · עודכן{' '}
                    {new Date(s.updatedAt).toLocaleDateString('he-IL')}
                  </small>
                </button>
                <button
                  type="button"
                  className="vcl-saved-delete"
                  aria-label="מחק סשן"
                  onClick={() => {
                    const remaining = loadSessions().filter(
                      (x) => x.sessionId !== s.sessionId,
                    );
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(remaining));
                    setSaved(remaining);
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ---------- workspace ----------

  const cards = session.constraints;
  const editingCard =
    editingCardId && editingCardId !== 'new'
      ? cards.find((c) => c.id === editingCardId) ?? createVclCard()
      : createVclCard();
  const labelOf = (id: string) => cards.find((c) => c.id === id)?.label || id;
  const questions = generateVclQuestions(session, data.meta_model_questions);
  const rulesById = Object.fromEntries(data.diagnosis_rules.map((r) => [r.id, r]));
  const moves = generateVclMoves(session.diagnosis, data.moves);
  const wizardCard = cards.length > 0 ? cards[Math.min(wizardIndex, cards.length - 1)] : null;

  const constraintCard = (card: VclCard) => (
    <div
      key={card.id}
      className={`vcl-constraint-card ${
        card.negotiability === 'fixed'
          ? 'vcl-fixed'
          : card.negotiability === 'flexible'
            ? 'vcl-flexible'
            : 'vcl-unknown'
      }`}
    >
      <div className="vcl-card-head">
        <span className="vcl-card-type">
          {typeInfo(card.type).icon} {typeInfo(card.type).label}
        </span>
        <span className="vcl-card-importance">{card.importance}/10</span>
      </div>
      <strong>{card.label}</strong>
      <small>
        {levelInfo(card.logicalLevel).label} · {negotiabilityLabel(card.negotiability)}
      </small>
      {card.notes && <p className="vcl-card-notes">{card.notes}</p>}
      <div className="vcl-card-actions">
        <button type="button" onClick={() => setEditingCardId(card.id)}>
          ✏️ ערוך
        </button>
        <button type="button" onClick={() => deleteCard(card.id)}>
          🗑️
        </button>
      </div>
    </div>
  );

  const thresholdCard = (card: VclCard) => (
    <div className="vcl-threshold-card" key={card.id}>
      <strong>{card.label}</strong>
      <label>
        חשיבות: <span>{card.importance}</span>/10
      </label>
      <input
        type="range"
        min={1}
        max={10}
        value={card.importance}
        aria-label={`חשיבות ${card.label}`}
        onChange={(e) =>
          updateSession((s) => ({
            ...s,
            constraints: s.constraints.map((c) =>
              c.id === card.id ? { ...c, importance: Number(e.target.value) } : c,
            ),
          }))
        }
      />
      <div className="vcl-threshold-rows">
        <div>
          <span>מינימום מקובל:</span> <em>{card.minimum || 'לא הוגדר'}</em>
        </div>
        <div>
          <span>אידיאל:</span> <em>{card.ideal || 'לא הוגדר'}</em>
        </div>
        <div>
          <span>משא ומתן:</span> <em>{negotiabilityLabel(card.negotiability)}</em>
        </div>
      </div>
    </div>
  );

  return (
    <div className="workbench">
      <div className="workbench-main card">
        <div className="vcl-session-header">
          <div>
            <small>הרצון המרכזי</small>
            <h3>🎯 {session.mainDesire}</h3>
            <p className="muted">"{session.initialStatement}"</p>
          </div>
          <button type="button" className="btn btn-secondary" onClick={closeWorkspace}>
            → סשן חדש
          </button>
        </div>

        {isMobile && (
          <div className="vcl-mobile-note">
            📱 המפה הוויזואלית המלאה של שתי הקומות זמינה בדסקטופ. במובייל ממשיכים עם
            כרטיס אחד בכל פעם — ההתקדמות נשמרת.
          </div>
        )}

        {editingCardId !== null ? (
          <CardForm
            initial={editingCard}
            onSave={saveCard}
            onCancel={() => setEditingCardId(null)}
          />
        ) : isMobile ? (
          <div className="vcl-wizard">
            <div className="blueprint-wizard-progress">
              {cards.length === 0
                ? 'אין עדיין כרטיסים'
                : `כרטיס ${Math.min(wizardIndex, cards.length - 1) + 1} מתוך ${cards.length}`}
            </div>
            <div className="vcl-wizard-guide">
              💭{' '}
              {
                [...data.floor1_questions, ...data.floor2_questions][
                  wizardIndex % (data.floor1_questions.length + data.floor2_questions.length)
                ]
              }
            </div>
            {wizardCard ? (
              <>
                {constraintCard(wizardCard)}
                {thresholdCard(wizardCard)}
                <div className="blueprint-wizard-actions">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={wizardIndex === 0}
                    onClick={() => setWizardIndex((i) => Math.max(0, i - 1))}
                  >
                    הקודם
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={wizardIndex >= cards.length - 1}
                    onClick={() => setWizardIndex((i) => Math.min(cards.length - 1, i + 1))}
                  >
                    הבא
                  </button>
                </div>
              </>
            ) : (
              <p className="muted">התחל בהוספת הערך או האילוץ הראשון.</p>
            )}
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setEditingCardId('new')}
            >
              ＋ הוסף ערך / אילוץ
            </button>
          </div>
        ) : (
          <div className="vcl-building">
            <div className="vcl-floor vcl-floor-top">
              <div className="vcl-floor-label">
                <strong>קומה 2 · מידה, סף ופשרה</strong>
                <small>כמה מזה אתה באמת חייב?</small>
              </div>
              <div className="vcl-floor-questions">
                {data.floor2_questions.slice(0, 4).map((q) => (
                  <span key={q}>{q}</span>
                ))}
              </div>
              <div className="vcl-threshold-grid">
                {cards.length === 0 ? (
                  <p className="muted">הוסף כרטיסים בקומה 1 כדי לכוון ספים.</p>
                ) : (
                  cards.map(thresholdCard)
                )}
              </div>
            </div>
            <div className="vcl-floor vcl-floor-bottom">
              <div className="vcl-floor-label">
                <strong>קומה 1 · מפת הערכים והאילוצים הסמויים</strong>
                <small>מה עוד חייב להיות נכון? מה אסור שיקרה?</small>
              </div>
              <div className="vcl-floor-questions">
                {data.floor1_questions.slice(0, 5).map((q) => (
                  <span key={q}>{q}</span>
                ))}
              </div>
              <div className="vcl-card-grid">
                {cards.map(constraintCard)}
                <button
                  type="button"
                  className="vcl-add-card-tile"
                  onClick={() => setEditingCardId('new')}
                >
                  ＋ הוסף ערך / אילוץ
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="vcl-tradeoffs-section">
          <h4>⚔️ מפת התנגשויות (Conflict Map)</h4>
          <p className="muted">
            סמן אילו שני תנאים מושכים לכיוונים מנוגדים, והכרע מי מנצח בשלב הזה.
          </p>
          {session.tradeoffs.length === 0 ? (
            <p className="muted">אין עדיין התנגשויות מסומנות.</p>
          ) : (
            session.tradeoffs.map((t) => (
              <div className="vcl-tradeoff-row" key={t.id}>
                <span className="vcl-tradeoff-pair">
                  {labelOf(t.between?.[0])} ⟷ {labelOf(t.between?.[1])}
                </span>
                <span className="vcl-tradeoff-winner">
                  {t.winner ? `🏆 מנצח: ${labelOf(t.winner)}` : '⚠️ לא הוכרע'}
                </span>
                <select
                  aria-label="בחירת מנצח"
                  value={t.winner}
                  onChange={(e) =>
                    updateSession((s) => ({
                      ...s,
                      tradeoffs: s.tradeoffs.map((x) =>
                        x.id === t.id ? { ...x, winner: e.target.value } : x,
                      ),
                    }))
                  }
                >
                  <option value="">מי מנצח?</option>
                  {(t.between || []).map((id) => (
                    <option key={id} value={id}>
                      {labelOf(id)}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="vcl-tradeoff-delete"
                  aria-label="מחק התנגשות"
                  onClick={() =>
                    updateSession((s) => ({
                      ...s,
                      tradeoffs: s.tradeoffs.filter((x) => x.id !== t.id),
                    }))
                  }
                >
                  ✕
                </button>
              </div>
            ))
          )}
          {cards.length >= 2 ? (
            <TradeoffForm
              cards={cards}
              onAdd={(a, b) =>
                updateSession((s) => ({ ...s, tradeoffs: [...s.tradeoffs, createTradeoff(a, b)] }))
              }
            />
          ) : (
            <p className="muted">צריך לפחות שני כרטיסים כדי לסמן התנגשות.</p>
          )}
        </div>

        <div className="vcl-diagnose-bar">
          <button type="button" className="btn btn-primary btn-large" onClick={diagnose}>
            🩺 אבחן: למה זה תקוע?
          </button>
        </div>

        {session.diagnosis.length > 0 && (
          <div className="vcl-diagnosis-result">
            <h4>🩺 אבחנה: למה זה תקוע?</h4>
            {session.diagnosis.map((finding) => {
              const rule = rulesById[finding.id] ?? {
                label: finding.id,
                description: '',
                advice: '',
              };
              return (
                <div className="vcl-finding" key={finding.id}>
                  <strong>🔎 {rule.label}</strong>
                  <p>{rule.description}</p>
                  {finding.evidence.length > 0 && (
                    <div className="vcl-evidence">
                      {finding.evidence.map((e) => (
                        <span key={e}>{e}</span>
                      ))}
                    </div>
                  )}
                  <p className="vcl-advice">💡 {rule.advice}</p>
                </div>
              );
            })}
            {session.questionsGenerated.length > 0 && (
              <div className="vcl-generated-questions">
                <h4>❓ שאלות מטה מודל לעבודה</h4>
                <ul>
                  {session.questionsGenerated.map((q) => (
                    <li key={q}>{q}</li>
                  ))}
                </ul>
              </div>
            )}
            {moves.length > 0 && (
              <div className="vcl-moves">
                <h4>🚪 מהלכים אפשריים</h4>
                <div className="vcl-moves-grid">
                  {moves.map((move) => (
                    <div className="vcl-move-card" key={move.id}>
                      <strong>{move.label}</strong>
                      <p>{move.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="action-buttons">
          <button type="button" className="btn btn-secondary" onClick={exportSession}>
            📥 ייצא JSON
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              updateSession((s) => s);
              showHint('💾 הסשן נשמר. אפשר לחזור אליו ממסך הפתיחה.');
            }}
          >
            💾 שמור סשן
          </button>
        </div>
      </div>

      <aside className="workbench-side">
        <div className="side-card">
          <h4>❓ שאלות מטה מודל</h4>
          {questions.length === 0 ? (
            <p className="muted">הוסף כרטיסים כדי לקבל שאלות מותאמות.</p>
          ) : (
            <ul className="meta-list">
              {questions.map((q) => (
                <li key={q}>{q}</li>
              ))}
            </ul>
          )}
        </div>
        <div className="side-card">
          <h4>🗼 מיפוי רמות לוגיות (Dilts)</h4>
          <div className="vcl-dilts-ladder">
            {[...data.logical_levels].reverse().map((level) => {
              const atLevel = cards.filter((c) => c.logicalLevel === level.id);
              return (
                <div
                  className={`vcl-dilts-row ${atLevel.length ? 'occupied' : ''}`}
                  key={level.id}
                >
                  <strong>{level.label}</strong>
                  <span>
                    {atLevel.length ? atLevel.map((c) => c.label).join(' · ') : '—'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
        {session.insights.length > 0 && (
          <div className="side-card">
            <h4>✨ תובנות</h4>
            <ul className="meta-list">
              {session.insights.map((insight) => (
                <li key={insight}>{insight}</li>
              ))}
            </ul>
          </div>
        )}
      </aside>
    </div>
  );
}

function TradeoffForm({
  cards,
  onAdd,
}: {
  cards: VclCard[];
  onAdd: (a: string, b: string) => void;
}) {
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const { showHint } = useHint();
  return (
    <div className="vcl-tradeoff-form">
      <select aria-label="תנאי ראשון" value={a} onChange={(e) => setA(e.target.value)}>
        <option value="">תנאי ראשון...</option>
        {cards.map((c) => (
          <option key={c.id} value={c.id}>
            {c.label}
          </option>
        ))}
      </select>
      <span>⟷</span>
      <select aria-label="תנאי שני" value={b} onChange={(e) => setB(e.target.value)}>
        <option value="">תנאי שני...</option>
        {cards.map((c) => (
          <option key={c.id} value={c.id}>
            {c.label}
          </option>
        ))}
      </select>
      <button
        type="button"
        className="btn btn-secondary"
        onClick={() => {
          if (!a || !b || a === b) {
            showHint('בחר שני תנאים שונים');
            return;
          }
          onAdd(a, b);
          setA('');
          setB('');
        }}
      >
        סמן התנגשות
      </button>
    </div>
  );
}
