import { useState } from 'react';
import { content } from '../../data/content';
import {
  PRISM_LEVELS,
  type PivotRecommendation,
  type PrismAnswer,
  type PrismSession,
} from '../../types';
import { computePivotRecommendation } from '../../lib/pivot';
import { useProgress } from '../../store/useProgress';
import { XP_REWARDS } from '../../store/progress';
import { PRISM_ART } from '../../lib/patternArt';
import { HowItWorks } from '../../components/HowItWorks';
import { SurfaceHiddenPrinciple } from '../../components/SurfaceHiddenPrinciple';

const SESSIONS_KEY = 'prism_sessions';
const MAX_SAVED_SESSIONS = 10;

function saveSession(session: PrismSession, recommendation: PivotRecommendation) {
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    const arr: unknown[] = raw ? JSON.parse(raw) : [];
    arr.unshift({ ...session, recommendation });
    while (arr.length > MAX_SAVED_SESSIONS) arr.pop();
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(arr));
  } catch {
    // storage unavailable — session still shown on screen
  }
}

function exportSessions() {
  const raw = localStorage.getItem(SESSIONS_KEY) || '[]';
  const blob = new Blob([raw], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `prism_sessions_${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

type SavedSession = PrismSession & { recommendation: PivotRecommendation };

function loadSavedSessions(): SavedSession[] {
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as SavedSession[]) : [];
  } catch {
    return [];
  }
}

export function PrismLabPage() {
  const { addXP, recordSession } = useProgress();

  const [activePrismId, setActivePrismId] = useState<string | null>(null);
  const [choices, setChoices] = useState<Record<string, string>>({});
  const [activeLevel, setActiveLevel] = useState<string>('E');
  const [emotion, setEmotion] = useState(3);
  const [resistance, setResistance] = useState(2);
  const [result, setResult] = useState<{
    session: PrismSession;
    recommendation: PivotRecommendation;
  } | null>(null);
  const [awarded, setAwarded] = useState(false);
  const [savedSessions, setSavedSessions] = useState<SavedSession[]>(loadSavedSessions);

  const pack = content.choice_packs.prism_breen;
  const prism = activePrismId
    ? content.prisms.find((p) => p.id === activePrismId)
    : null;

  const openPrism = (id: string) => {
    setActivePrismId(id);
    setChoices({});
    setActiveLevel('E');
    setEmotion(3);
    setResistance(2);
    setResult(null);
    setAwarded(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const backToLibrary = () => {
    setActivePrismId(null);
    setResult(null);
  };

  const recoveryQuestion = (levelId: string): string => {
    const choiceId = choices[levelId];
    if (!choiceId) return 'בחר אפשרות כדי לקבל שאלת ניקוי.';
    const choice = (pack.levels[levelId] ?? []).find((c) => c.id === choiceId);
    return choice?.question ?? 'בחר אפשרות כדי לקבל שאלת ניקוי.';
  };

  const collectAnswers = (): PrismAnswer[] =>
    PRISM_LEVELS.map((level) => {
      const choiceId = choices[level.id] ?? '';
      const choice = (pack.levels[level.id] ?? []).find((c) => c.id === choiceId);
      return {
        level: level.id,
        label: level.label,
        text: choice?.label ?? '',
        choice_id: choiceId,
        recovery_question: choice?.question ?? '',
      };
    }).filter((answer) => answer.text);

  const handleSubmit = () => {
    if (!prism) return;
    const session: PrismSession = {
      datetime: new Date().toISOString(),
      prism_id: prism.id,
      prism_name: prism.name_he,
      anchor: prism.anchor_question_templates[0],
      answers: collectAnswers(),
      emotion,
      resistance,
    };
    const recommendation = computePivotRecommendation(session);
    setResult({ session, recommendation });
    saveSession(session, recommendation);
    setSavedSessions(loadSavedSessions());
    // Audit bug B1 fix: prism mapping awards XP + session (once per prism opened).
    if (!awarded) {
      addXP(XP_REWARDS.prismComplete);
      recordSession();
      setAwarded(true);
    }
  };

  if (!prism) {
    return (
      <div className="card">
        <h2>🔍 מעבדת פריזמות (Prism Lab)</h2>
        <p>
          בחר פריזמה לסריקה, ואז בחר אפשרויות מוכנות מחבילת JSON. אין כאן AI ואין
          ניתוח חופשי.
        </p>

        <div className="feature-brief">
          <span>
            <strong>מטרה:</strong> לזהות איפה המשפט תקוע.
          </span>
          <span>
            <strong>ללא AI:</strong> הכל בחירות מובנות מראש מתוך חבילת JSON.
          </span>
        </div>

        <SurfaceHiddenPrinciple compact />

        <HowItWorks
          steps={[
            { icon: '🔍', title: 'בוחרים עדשה', detail: 'פריזמה אחת = דפוס לשוני אחד לסרוק דרכו' },
            { icon: '🗺️', title: 'מפה 5 שכבות', detail: 'בחר אפשרות מוכנה בכל שכבה — הקשר עד זהות' },
            { icon: '🎯', title: 'קבל Pivot', detail: 'המלצה איפה הכי קל להתחיל לזוז' },
          ]}
        />

        <div className="prism-grid" id="prism-library">
          {content.prisms.map((p) => (
            <div className="prism-card" key={p.id}>
              {PRISM_ART[p.id] && (
                <img
                  className="prism-card-art"
                  src={PRISM_ART[p.id]}
                  alt={`איור: ${p.name_he}`}
                  loading="lazy"
                />
              )}
              <h4>{p.name_he}</h4>
              <p>{p.philosophy_core}</p>
              <p>
                <strong>שאלת עוגן:</strong> {p.anchor_question_templates[0]}
              </p>
              <button
                type="button"
                className="btn prism-open-btn"
                onClick={() => openPrism(p.id)}
              >
                בחר פריזמה
              </button>
            </div>
          ))}
        </div>

        {savedSessions.length > 0 && (
          <div className="saved-sessions">
            <h3>🗂️ סשנים שמורים</h3>
            <p className="muted">עשרת המיפויים האחרונים שלך — לסקירה חוזרת ולייצוא.</p>
            {savedSessions.map((s) => (
              <div className="saved-session-row" key={s.datetime}>
                <div>
                  <strong>{s.prism_name}</strong>
                  <small className="muted">
                    {new Date(s.datetime).toLocaleDateString('he-IL', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </small>
                </div>
                <div className="saved-session-pivot">
                  <span className="chip">Pivot: {s.recommendation?.pivot ?? '—'}</span>
                </div>
              </div>
            ))}
            <div className="step-buttons">
              <button type="button" className="btn btn-secondary" onClick={exportSessions}>
                📥 ייצא הכל JSON
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="workbench">
      <div className="workbench-main card" id="prism-detail">
        <h3 id="prism-name">
          {prism.name_he} — {prism.name_en}
        </h3>
        <p id="prism-desc" className="muted">
          {prism.philosophy_core}
        </p>
        <div className="anchor-box">
          <strong>שאלת העוגן:</strong>
          <p id="prism-anchor" className="anchor-question">
            {prism.anchor_question_templates[0]}
          </p>
        </div>

        <div className="mapping-form">
          <p className="choice-pack-note">
            <strong>חבילת JSON פעילה:</strong> <span id="choice-pack-name">{pack.name}</span>
          </p>
          <p className="muted">
            בחר אפשרות אחת בכל שכבה. הבחירה מציגה שאלת ניקוי מוכנה ומייצרת מפת עבודה
            ללא כתיבה חופשית.
          </p>
          <div className="prism-accordion" aria-label="סריקת חמש שכבות">
            <div className="prism-accordion-head">
              <div>שכבה</div>
              <div>מה נאמר / מה חסר</div>
              <div>שאלת ניקוי</div>
            </div>
            {PRISM_LEVELS.map((level) => (
              <div
                key={level.id}
                className={`prism-accordion-item ${activeLevel === level.id ? 'active' : ''}`}
                data-prism-level={level.id}
                onClick={(e) => {
                  if ((e.target as HTMLElement).closest('select')) return;
                  setActiveLevel(level.id);
                }}
              >
                <div className="breen-cell">
                  <strong>{level.label}</strong>
                  <small>{level.detail}</small>
                </div>
                <div className="breen-cell">
                  <select
                    className="breen-choice-select"
                    aria-label={`בחירת ${level.label}`}
                    value={choices[level.id] ?? ''}
                    onChange={(e) =>
                      setChoices((c) => ({ ...c, [level.id]: e.target.value }))
                    }
                  >
                    <option value="">בחר מתוך חבילת JSON...</option>
                    {(pack.levels[level.id] ?? []).map((choice) => (
                      <option key={choice.id} value={choice.id}>
                        {choice.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="breen-cell">
                  <span className="breen-recovery-question">{recoveryQuestion(level.id)}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="q-card">
            <label htmlFor="prism-emotion">עוצמת רגש (1-5)</label>
            <input
              id="prism-emotion"
              type="range"
              min={1}
              max={5}
              value={emotion}
              onChange={(e) => setEmotion(Number(e.target.value))}
            />{' '}
            <span id="emotion-display">{emotion}</span>
          </div>
          <div className="q-card">
            <label htmlFor="prism-resistance">התנגדות (1-5)</label>
            <input
              id="prism-resistance"
              type="range"
              min={1}
              max={5}
              value={resistance}
              onChange={(e) => setResistance(Number(e.target.value))}
            />{' '}
            <span id="resistance-display">{resistance}</span>
          </div>

          <div className="step-buttons">
            <button type="button" className="btn btn-secondary" onClick={backToLibrary}>
              → חזור לספריה
            </button>
            <button type="button" className="btn btn-primary" onClick={handleSubmit}>
              מפה והמלץ Pivot ←
            </button>
          </div>
        </div>

        {result && (
          <div id="prism-result" className="final-blueprint-display">
            <div className="prism-result-hero">
              <span>Prism Map</span>
              <div>
                <h4>{result.session.prism_name}</h4>
                <p>
                  <strong>שאלת עוגן:</strong> {result.session.anchor}
                </p>
              </div>
            </div>
            <div className="prism-pivot-card">
              <small>המלצת Pivot</small>
              <strong>{result.recommendation.pivot}</strong>
              <p>{result.recommendation.reason}</p>
              <div className="prism-signal-row">
                <span>עוצמת רגש {result.session.emotion}/5</span>
                <span>התנגדות {result.session.resistance}/5</span>
              </div>
            </div>
            <div className="blueprint-section prism-result-levels">
              <h4>מפת 5 השכבות</h4>
              {result.session.answers.length === 0 ? (
                <p className="muted">לא מולאו תשובות בטבלה.</p>
              ) : (
                <div className="breen-result-table">
                  {result.session.answers.map((answer) => (
                    <div className="breen-result-row" key={answer.level}>
                      <strong>
                        {answer.label} ({answer.level})
                      </strong>
                      <span>
                        {answer.text}
                        {answer.recovery_question && <small>{answer.recovery_question}</small>}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="prism-export-row">
              <button type="button" className="btn btn-secondary" onClick={exportSessions}>
                ייצא סשן JSON
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Lens workbench: the prism's rich metadata, surfaced for the trainer */}
      <aside className="workbench-side">
        <div className="side-card">
          <h4>🗣️ טריגרים לשוניים</h4>
          <div className="trigger-chips">
            {prism.linguistic_triggers.map((t) => (
              <span className="chip" key={t}>
                "{t}"
              </span>
            ))}
          </div>
        </div>

        <div className="side-card">
          <h4>💬 דוגמאות אופייניות</h4>
          <ul className="meta-list">
            {prism.examples.map((ex) => (
              <li key={ex}>"{ex}"</li>
            ))}
          </ul>
        </div>

        <div className="side-card">
          <h4>⚠️ ממה להיזהר</h4>
          <ul className="meta-list warning">
            {prism.anti_patterns.map((ap) => (
              <li key={ap}>{ap}</li>
            ))}
          </ul>
        </div>

        <div className="side-card">
          <h4>🪜 התערבות מומלצת לפי שכבה</h4>
          <ul className="intervention-list">
            {Object.entries(prism.recommended_interventions_by_level).map(
              ([level, text]) => (
                <li key={level}>
                  <span className="level-key">{level}</span>
                  <span>{text}</span>
                </li>
              ),
            )}
          </ul>
        </div>
      </aside>
    </div>
  );
}
