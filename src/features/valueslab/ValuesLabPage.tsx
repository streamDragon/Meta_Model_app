import { useState } from 'react';
import rawPack from '../../../packs/values-constraints.json';
import {
  createTradeoff,
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
    // storage unavailable - keep in-memory only
  }
  return sessions;
}

function freshSessionId(seed: string): string {
  const suffix =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
  return `${seed}-${suffix}`;
}

function cloneStarterSession(example: VclSession): VclSession {
  const now = new Date().toISOString();
  const copy: VclSession = JSON.parse(JSON.stringify(example));
  return {
    ...copy,
    sessionId: freshSessionId(example.sessionId),
    diagnosis: [],
    questionsGenerated: [],
    insights: Array.isArray(copy.insights) ? [...copy.insights] : [],
    createdAt: now,
    updatedAt: now,
  };
}

const typeInfo = (id: string) =>
  data.card_types.find((t) => t.id === id) ?? { id, label: id, icon: '🏷️' };
const levelInfo = (id: string) =>
  data.logical_levels.find((l) => l.id === id) ?? { id, label: id };
const negotiabilityLabel = (id: string) =>
  data.negotiability_options.find((n) => n.id === id)?.label ?? id;

export function ValuesLabPage() {
  const [session, setSession] = useState<VclSession | null>(null);
  const [saved, setSaved] = useState<VclSession[]>(loadSessions);
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
    setWizardIndex(0);
    setAwarded(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const startFromExample = (example: VclSession) => {
    openSession(cloneStarterSession(example));
  };

  const closeWorkspace = () => {
    if (session) setSaved(persistSession(session));
    setSession(null);
    setWizardIndex(0);
  };

  const resetDiagnosis = (s: VclSession): VclSession => ({
    ...s,
    diagnosis: [],
    questionsGenerated: [],
  });

  const updateCard = (cardId: string, fields: Partial<VclCard>) => {
    updateSession((s) =>
      resetDiagnosis({
        ...s,
        constraints: s.constraints.map((card) =>
          card.id === cardId ? { ...card, ...fields } : card,
        ),
      }),
    );
  };

  const addTradeoff = (a: string, b: string) => {
    if (!session) return;
    const normalized = [a, b].sort().join('|');
    const exists = session.tradeoffs.some((tradeoff) => {
      const [x, y] = tradeoff.between || [];
      return [x, y].sort().join('|') === normalized;
    });
    if (exists) {
      showHint('ההתנגשות הזו כבר מסומנת');
      return;
    }
    updateSession((s) => resetDiagnosis({ ...s, tradeoffs: [...s.tradeoffs, createTradeoff(a, b)] }));
  };

  const setTradeoffWinner = (tradeoffId: string, winner: string) => {
    updateSession((s) =>
      resetDiagnosis({
        ...s,
        tradeoffs: s.tradeoffs.map((tradeoff) =>
          tradeoff.id === tradeoffId ? { ...tradeoff, winner } : tradeoff,
        ),
      }),
    );
  };

  const diagnose = () => {
    if (!session) return;
    if (session.constraints.length === 0) {
      showHint('בחר תרחיש מוכן לפני אבחון');
      return;
    }
    updateSession((s) => {
      const diagnosis = diagnoseValuesSession(s);
      const questionsGenerated = generateVclQuestions(s, data.meta_model_questions);
      const insights =
        diagnosis.length === 0
          ? [
              ...s.insights,
              'המפה מאוזנת: יש היררכיה, יש מינימום מוגדר ואין עומס אילוצים קשיחים.',
            ]
          : s.insights;
      return { ...s, diagnosis, questionsGenerated, insights };
    });
    if (!awarded) {
      addXP(15);
      recordSession();
      setAwarded(true);
    }
  };

  if (!session) {
    return (
      <div className="card vcl-start-screen">
        <h2>💎 מעבדת ערכים ואילוצים</h2>
        <p>
          בוחרים תרחיש מוכן, עובדים עם כרטיסים שכבר קיימים, ומכוונים רק החלטות קצרות:
          חשיבות, קשיחות, התנגשות ומנצח. אין כתיבה חופשית ואין קבצי יבוא/ייצוא.
        </p>
        <div className="feature-brief">
          <span>
            <strong>מטרה:</strong> לראות אילו תנאים סמויים תוקעים רצון.
          </span>
          <span>
            <strong>תוצר:</strong> אבחנה, שאלות מטה-מודל ומהלכים שאפשר לבחור מהם.
          </span>
        </div>

        <HowItWorks
          steps={[
            { icon: '📌', title: 'בוחרים תרחיש', detail: 'המשפט והכרטיסים כבר מוכנים מראש' },
            { icon: '🎚️', title: 'מכוונים כרטיסים', detail: 'חשיבות וקשיחות דרך סליידר ותפריט' },
            { icon: '⚔️', title: 'מסמנים התנגשויות', detail: 'בוחרים שני תנאים מתוך הרשימה' },
            { icon: '🩺', title: 'מאבחנים', detail: 'המערכת מחזירה אבחנה ושאלות לפי החוקים' },
          ]}
        />

        <h3 className="section-title">📦 בחר תרחיש מוכן</h3>
        <div className="vcl-example-grid">
          {data.starter_examples.map((example) => (
            <button
              key={example.sessionId}
              type="button"
              className="vcl-example-chip"
              onClick={() => startFromExample(example)}
            >
              <span className="vcl-example-action">פתח תרחיש</span>
              <strong>{example.title}</strong>
              <small>{example.initialStatement}</small>
            </button>
          ))}
        </div>

        <h3 className="section-title">🗂️ המשך סשן שמור</h3>
        {saved.length === 0 ? (
          <p className="muted">עדיין אין סשנים שמורים. בחירות נשמרות אוטומטית בזמן העבודה.</p>
        ) : (
          <div className="vcl-saved-list">
            {saved.map((s) => (
              <div className="vcl-saved-row" key={s.sessionId}>
                <button type="button" className="vcl-saved-open" onClick={() => openSession(s)}>
                  <strong>{s.title || s.mainDesire || 'סשן מוכן'}</strong>
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
                    const remaining = loadSessions().filter((x) => x.sessionId !== s.sessionId);
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

  const cards = session.constraints;
  const labelOf = (id: string) => cards.find((c) => c.id === id)?.label || id;
  const questions = generateVclQuestions(session, data.meta_model_questions);
  const rulesById = Object.fromEntries(data.diagnosis_rules.map((r) => [r.id, r]));
  const moves = generateVclMoves(session.diagnosis, data.moves);
  const wizardCard = cards.length > 0 ? cards[Math.min(wizardIndex, cards.length - 1)] : null;

  const constraintCard = (card: VclCard) => (
    <div
      key={`constraint-${card.id}`}
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
    </div>
  );

  const thresholdCard = (card: VclCard) => (
    <div className="vcl-threshold-card" key={`threshold-${card.id}`}>
      <strong>{card.label}</strong>
      <label htmlFor={`vcl-importance-${card.id}`}>
        חשיבות: <span>{card.importance}</span>/10
      </label>
      <input
        id={`vcl-importance-${card.id}`}
        type="range"
        min={1}
        max={10}
        value={card.importance}
        aria-label={`חשיבות ${card.label}`}
        onChange={(e) => updateCard(card.id, { importance: Number(e.target.value) })}
      />
      <label htmlFor={`vcl-negotiability-${card.id}`}>כמה זה קשיח?</label>
      <select
        id={`vcl-negotiability-${card.id}`}
        value={card.negotiability}
        onChange={(e) =>
          updateCard(card.id, { negotiability: e.target.value as VclCard['negotiability'] })
        }
      >
        {data.negotiability_options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
      <div className="vcl-threshold-rows">
        <div>
          <span>מינימום מקובל:</span> <em>{card.minimum || 'לא הוגדר'}</em>
        </div>
        <div>
          <span>אידיאל:</span> <em>{card.ideal || 'לא הוגדר'}</em>
        </div>
      </div>
    </div>
  );

  return (
    <div className="workbench vcl-workbench">
      <div className="workbench-main card">
        <div className="vcl-session-header">
          <div>
            <small>הרצון המרכזי</small>
            <h3>🎯 {session.mainDesire}</h3>
            <p className="muted">"{session.initialStatement}"</p>
          </div>
          <button type="button" className="btn btn-secondary" onClick={closeWorkspace}>
            בחר תרחיש אחר
          </button>
        </div>

        <div className="vcl-closed-note">
          {isMobile
            ? 'במובייל עובדים עם כרטיס אחד בכל פעם: בוחרים כרטיס, מכוונים אותו, ממשיכים הלאה ומאבחנים.'
            : 'התרחיש סגור מראש. אפשר לכוון את הכרטיסים הקיימים ולסמן יחסים ביניהם, בלי להמציא טקסט חדש.'}
        </div>

        {isMobile ? (
          <div className="vcl-wizard">
            <div className="blueprint-wizard-progress">
              {cards.length === 0
                ? 'אין כרטיסים בתרחיש'
                : `כרטיס ${Math.min(wizardIndex, cards.length - 1) + 1} מתוך ${cards.length}`}
            </div>
            <div className="vcl-card-strip" role="tablist" aria-label="כרטיסים בתרחיש">
              {cards.map((card, index) => (
                <button
                  key={card.id}
                  type="button"
                  className={`vcl-card-pill ${index === wizardIndex ? 'active' : ''}`}
                  aria-selected={index === wizardIndex}
                  onClick={() => setWizardIndex(index)}
                >
                  {index + 1}. {card.label}
                </button>
              ))}
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
              <p className="muted">התרחיש הזה ריק. בחר תרחיש אחר ממסך הפתיחה.</p>
            )}
          </div>
        ) : (
          <div className="vcl-building">
            <div className="vcl-floor vcl-floor-top">
              <div className="vcl-floor-label">
                <strong>קומה 2 · מידה, סף ופשרה</strong>
                <small>כמה מזה באמת חייב להתקיים, ומה אפשר לרכך?</small>
              </div>
              <div className="vcl-floor-questions">
                {data.floor2_questions.slice(0, 4).map((q) => (
                  <span key={q}>{q}</span>
                ))}
              </div>
              <div className="vcl-threshold-grid">{cards.map(thresholdCard)}</div>
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
              <div className="vcl-card-grid">{cards.map(constraintCard)}</div>
            </div>
          </div>
        )}

        <div className="vcl-tradeoffs-section">
          <h4>⚔️ מפת התנגשויות</h4>
          <p className="muted">
            בוחרים שני תנאים מתוך הכרטיסים המוכנים, ואז מסמנים מי מוביל כרגע.
          </p>
          {session.tradeoffs.length === 0 ? (
            <p className="muted">אין עדיין התנגשויות מסומנות.</p>
          ) : (
            session.tradeoffs.map((tradeoff) => (
              <div className="vcl-tradeoff-row" key={tradeoff.id}>
                <span className="vcl-tradeoff-pair">
                  {labelOf(tradeoff.between?.[0])} ⟷ {labelOf(tradeoff.between?.[1])}
                </span>
                <span className="vcl-tradeoff-winner">
                  {tradeoff.winner ? `מוביל כרגע: ${labelOf(tradeoff.winner)}` : 'עדיין לא הוכרע'}
                </span>
                <select
                  aria-label="בחירת מנצח"
                  value={tradeoff.winner}
                  onChange={(e) => setTradeoffWinner(tradeoff.id, e.target.value)}
                >
                  <option value="">מי מוביל?</option>
                  {(tradeoff.between || []).map((id) => (
                    <option key={id} value={id}>
                      {labelOf(id)}
                    </option>
                  ))}
                </select>
              </div>
            ))
          )}
          {cards.length >= 2 && <TradeoffForm cards={cards} onAdd={addTradeoff} />}
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
                <h4>❓ שאלות מטה-מודל לעבודה</h4>
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
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              updateSession((s) => s);
              showHint('הסשן נשמר. אפשר לחזור אליו ממסך הפתיחה.');
            }}
          >
            שמור סשן
          </button>
        </div>
      </div>

      <aside className="workbench-side">
        <div className="side-card">
          <h4>❓ שאלות מטה-מודל</h4>
          {questions.length === 0 ? (
            <p className="muted">בחר תרחיש כדי לקבל שאלות מותאמות.</p>
          ) : (
            <ul className="meta-list">
              {questions.map((q) => (
                <li key={q}>{q}</li>
              ))}
            </ul>
          )}
        </div>
        <div className="side-card">
          <h4>🗼 מיפוי רמות לוגיות</h4>
          <div className="vcl-dilts-ladder">
            {[...data.logical_levels].reverse().map((level) => {
              const atLevel = cards.filter((c) => c.logicalLevel === level.id);
              return (
                <div
                  className={`vcl-dilts-row ${atLevel.length ? 'occupied' : ''}`}
                  key={level.id}
                >
                  <strong>{level.label}</strong>
                  <span>{atLevel.length ? atLevel.map((c) => c.label).join(' · ') : '—'}</span>
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
        {cards.map((card) => (
          <option key={card.id} value={card.id}>
            {card.label}
          </option>
        ))}
      </select>
      <span>⟷</span>
      <select aria-label="תנאי שני" value={b} onChange={(e) => setB(e.target.value)}>
        <option value="">תנאי שני...</option>
        {cards.map((card) => (
          <option key={card.id} value={card.id}>
            {card.label}
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
