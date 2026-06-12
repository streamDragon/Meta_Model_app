import { useMemo, useState } from 'react';
import type { CbtStoredSession, ThoughtAnalysis } from '../../types/cbt';
import { XP_REWARDS } from '../../store/progress';
import { analyzeThought } from './cbtEngine';
import { metaPatternLabel, patternLabel } from './cbtContent';
import { saveCbtSession } from './cbtStorage';

interface ThoughtMapProps {
  onAward: (amount: number) => void;
  onSaved: () => void;
  mobileMode?: boolean;
}

type MobileThoughtMapStep = 'thought' | 'context' | 'result';

function nowIso() {
  return new Date().toISOString();
}

function analysisCards(analysis: ThoughtAnalysis) {
  return [
    {
      title: 'מה המשפט עושה',
      body: analysis.paceHe,
    },
    {
      title: 'מה אולי חסר',
      body:
        analysis.missingInformation.length > 0
          ? analysis.missingInformation.join(' · ')
          : 'אפשר להתחיל מבירור הקשר, ראיות ושמות מדויקים.',
    },
    {
      title: 'מה זה אולי מגן',
      body: analysis.positiveIntentionHypothesis,
    },
    {
      title: 'ריפריים אפשרי',
      body: analysis.possibleReframeHe,
    },
  ];
}

export function ThoughtMap({ mobileMode = false, onAward, onSaved }: ThoughtMapProps) {
  const [statement, setStatement] = useState('אני חייב לעשות מה שכולם אומרים.');
  const [situation, setSituation] = useState('');
  const [emotionLabel, setEmotionLabel] = useState('');
  const [emotionIntensity, setEmotionIntensity] = useState(55);
  const [analysis, setAnalysis] = useState<ThoughtAnalysis | null>(null);
  const [savedSessionId, setSavedSessionId] = useState<string | null>(null);
  const [mobileStep, setMobileStep] = useState<MobileThoughtMapStep>('thought');

  const cards = useMemo(() => (analysis ? analysisCards(analysis) : []), [analysis]);

  const runAnalysis = (): ThoughtAnalysis => {
    const next = analyzeThought(statement);
    setAnalysis(next);
    setSavedSessionId(null);
    return next;
  };

  const analyzeAndShowResult = () => {
    runAnalysis();
    setMobileStep('result');
  };

  const saveMap = () => {
    if (!analysis) return;
    const timestamp = nowIso();
    const sessionId = `thought-map-${Date.now()}`;
    const session: CbtStoredSession = {
      kind: 'thought-map',
      sessionId,
      title: 'מפת מחשבה',
      initialStatement: analysis.input,
      automaticThought: analysis.input,
      situation,
      emotionLabel,
      emotionIntensity,
      cbtPatterns: analysis.cbtPatterns,
      metaModelPatterns: analysis.metaModelPatterns,
      positiveIntentionHypothesis: analysis.positiveIntentionHypothesis,
      missingInformation: analysis.missingInformation,
      generatedQuestions: analysis.generatedQuestions,
      suggestedMoves: analysis.suggestedMoves.map((move) => move.type),
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    saveCbtSession(session);
    setSavedSessionId(sessionId);
    onAward(XP_REWARDS.thoughtMapComplete);
    onSaved();
  };

  const introContent = (
    <>
      <span className="cbt-kicker">מפת מחשבה</span>
      <h3>לא נלחמים במחשבה. פותחים אותה.</h3>
      <p>
        כתוב משפט שתפס אותך. המנוע יחפש קיצורי דרך, דפוסי מטה-מודל,
        מידע חסר ושאלות שמחזירות בחירה.
      </p>
      <div className="cbt-loop" aria-label="המודל הקוגניטיבי">
        <span>מצב</span>
        <span>מחשבה</span>
        <span>רגש</span>
        <span>גוף</span>
        <span>פעולה</span>
      </div>
    </>
  );

  const introPanel = (
    <aside className="cbt-panel">
      {introContent}
    </aside>
  );

  const statementField = (
    <>
      <label htmlFor="cbt-thought-input">משפט שתפס אותך</label>
      <textarea
        id="cbt-thought-input"
        value={statement}
        onChange={(event) => setStatement(event.target.value)}
        rows={4}
      />
    </>
  );

  const contextFields = (
    <>
      <label htmlFor="cbt-situation">מה קרה סביב זה?</label>
      <input
        id="cbt-situation"
        value={situation}
        onChange={(event) => setSituation(event.target.value)}
        placeholder="פגישה, הודעה, שיחה, משימה..."
      />
      <div className="cbt-field-row">
        <label htmlFor="cbt-emotion">רגש</label>
        <input
          id="cbt-emotion"
          value={emotionLabel}
          onChange={(event) => setEmotionLabel(event.target.value)}
          placeholder="פחד, בושה, כעס..."
        />
        <label htmlFor="cbt-intensity">עוצמה {emotionIntensity}</label>
        <input
          id="cbt-intensity"
          type="range"
          min={0}
          max={100}
          value={emotionIntensity}
          onChange={(event) => setEmotionIntensity(Number(event.target.value))}
        />
      </div>
    </>
  );

  const outputPanel = (
    <aside className="cbt-panel cbt-output-panel" aria-live="polite">
      {!analysis ? (
        <p className="muted">הפלט יופיע כאן אחרי פתיחת המשפט.</p>
      ) : (
        <>
          {analysis.safetyMessageHe && (
            <div className="cbt-safety-note">{analysis.safetyMessageHe}</div>
          )}
          <div className="cbt-chip-group">
            {analysis.cbtPatterns.map((pattern) => (
              <span className="chip" key={pattern}>
                {patternLabel(pattern)}
              </span>
            ))}
            {analysis.metaModelPatterns.map((pattern) => (
              <span className="chip" key={pattern}>
                {metaPatternLabel(pattern)}
              </span>
            ))}
          </div>
          {cards.map((card) => (
            <article className="cbt-mini-card" key={card.title}>
              <strong>{card.title}</strong>
              <p>{card.body}</p>
            </article>
          ))}
          <article className="cbt-mini-card">
            <strong>שאלות מטה-מודל</strong>
            <ul>
              {analysis.generatedQuestions.map((question) => (
                <li key={question}>{question}</li>
              ))}
            </ul>
          </article>
          <article className="cbt-mini-card">
            <strong>בדיקת CBT</strong>
            <ul>
              {analysis.cbtQuestions.map((question) => (
                <li key={question}>{question}</li>
              ))}
            </ul>
          </article>
          {analysis.experimentSuggestion && (
            <article className="cbt-mini-card cbt-experiment-card">
              <strong>ניסוי מציאות קטן</strong>
              <p>{analysis.experimentSuggestion}</p>
            </article>
          )}
          <button type="button" className="btn btn-primary" onClick={saveMap}>
            שמור מפת מחשבה
          </button>
          {savedSessionId && <p className="xp-pop">+{XP_REWARDS.thoughtMapComplete} XP</p>}
        </>
      )}
    </aside>
  );

  if (mobileMode) {
    return (
      <div className="cbt-mobile-wizard">
        <div className="cbt-mobile-stepper" aria-label="שלבי מפת מחשבה במובייל">
          {(['thought', 'context', 'result'] as MobileThoughtMapStep[]).map((step, index) => (
            <span key={step} className={mobileStep === step ? 'active' : ''}>
              {index + 1}
            </span>
          ))}
        </div>

        {mobileStep === 'thought' && (
          <section className="cbt-panel cbt-mobile-step">
            {introContent}
            {statementField}
            <button
              type="button"
              className="btn btn-primary"
              disabled={statement.trim().length === 0}
              onClick={() => setMobileStep('context')}
            >
              המשך להקשר
            </button>
          </section>
        )}

        {mobileStep === 'context' && (
          <section className="cbt-panel cbt-mobile-step">
            <span className="cbt-kicker">הקשר ותחושה</span>
            <h3>כרטיס קצר לפני הניתוח.</h3>
            {contextFields}
            <div className="cbt-mobile-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setMobileStep('thought')}>
                חזור
              </button>
              <button type="button" className="btn btn-primary" onClick={analyzeAndShowResult}>
                פתח למפת מחשבה
              </button>
            </div>
          </section>
        )}

        {mobileStep === 'result' && (
          <section className="cbt-mobile-step">
            {outputPanel}
            <button type="button" className="btn btn-secondary" onClick={() => setMobileStep('context')}>
              ערוך הקשר
            </button>
          </section>
        )}
      </div>
    );
  }

  return (
    <div className="cbt-three-column">
      {introPanel}

      <section className="cbt-panel cbt-active-panel">
        {statementField}
        {contextFields}
        <button type="button" className="btn btn-primary" onClick={runAnalysis}>
          פתח למפת מחשבה
        </button>
      </section>

      {outputPanel}
    </div>
  );
}
