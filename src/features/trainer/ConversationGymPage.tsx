import { useEffect, useRef, useState } from 'react';
import { CONVERSATION_SCENARIOS } from '../../data/conversationScenarios';
import { type ConversationOption, type ConversationScenario } from '../../data/conversationSkills';
import { getConversationPresentation } from '../../data/conversationPresentation';
import { getConversationDecisionPath, type ConversationPathChoice } from '../../data/conversationDecisionPaths';
import { recommendScenario, type ConversationResult } from '../../lib/conversationLearning';
import { useConversationLearning } from '../../store/conversationLearning';
import { useProgress } from '../../store/useProgress';
import { shuffle } from '../../lib/random';

const STAGES = [
  { icon: '🧭', label: 'כיוון' },
  { icon: '🛠️', label: 'כלי' },
  { icon: '💬', label: 'ניסוח' },
  { icon: '↪', label: 'המשך' },
] as const;
const timeText = (seconds: number) => String(Math.floor(seconds / 60)).padStart(2, '0') + ':' + String(seconds % 60).padStart(2, '0');

export function ConversationGymPage() {
  const { learning, stored, complete } = useConversationLearning();
  const { addXP, recordSession } = useProgress();
  const [scenario, setScenario] = useState<ConversationScenario | null>(null);
  const [stage, setStage] = useState(0);
  const [direction, setDirection] = useState<ConversationPathChoice | null>(null);
  const [method, setMethod] = useState<ConversationPathChoice | null>(null);
  const [options, setOptions] = useState<ConversationOption[]>([]);
  const [selected, setSelected] = useState<ConversationOption | null>(null);
  const [first, setFirst] = useState<ConversationOption | null>(null);
  const [phraseAnswers, setPhraseAnswers] = useState<ConversationOption[]>([]);
  const [results, setResults] = useState<ConversationResult[]>([]);
  const [draft, setDraft] = useState('');
  const [hintOpen, setHintOpen] = useState(false);
  const [theoryOpen, setTheoryOpen] = useState(false);
  const [timerOn, setTimerOn] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [done, setDone] = useState(false);
  const [earned, setEarned] = useState(0);
  const sessionId = useRef('');
  const advancing = useRef(false);
  const feedbackRef = useRef<HTMLElement | null>(null);
  const nextScenario = recommendScenario(learning);

  useEffect(() => {
    if (!timerOn || !scenario || done) return;
    const id = window.setInterval(() => setElapsed((value) => value + 1), 1000);
    return () => window.clearInterval(id);
  }, [timerOn, scenario, done]);

  useEffect(() => {
    if (selected) feedbackRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
  }, [selected]);

  const start = (value: ConversationScenario) => {
    sessionId.current = crypto.randomUUID();
    advancing.current = false;
    setScenario(value);
    setStage(0);
    setDirection(null);
    setMethod(null);
    setOptions([]);
    setSelected(null);
    setFirst(null);
    setPhraseAnswers([]);
    setResults([]);
    setDraft('');
    setHintOpen(false);
    setTheoryOpen(false);
    setTimerOn(false);
    setElapsed(0);
    setEarned(0);
    setDone(false);
    window.scrollTo?.({ top: 0, behavior: 'auto' });
  };

  const leave = () => {
    advancing.current = false;
    setScenario(null);
    setSelected(null);
    setDraft('');
    setTimerOn(false);
  };

  const choosePath = (value: ConversationPathChoice) => {
    if (stage === 0) {
      setDirection(value);
      setStage(1);
    } else if (stage === 1) {
      setMethod(value);
      setStage(2);
      if (scenario) setOptions(shuffle(scenario.turns[0].options));
    }
    setHintOpen(false);
    window.scrollTo?.({ top: 0, behavior: 'smooth' });
  };

  const choosePhrase = (value: ConversationOption) => {
    if (selected) return;
    setSelected(value);
    setFirst((prior) => prior ?? value);
    setHintOpen(false);
  };

  const retry = () => {
    setSelected(null);
    setTheoryOpen(false);
    window.scrollTo?.({ top: 0, behavior: 'smooth' });
  };

  const next = () => {
    if (!scenario || !selected || !first || advancing.current || stage < 2) return;
    advancing.current = true;
    const turnIndex = stage - 2;
    const nextResults: ConversationResult[] = [...results, { skill: scenario.turns[turnIndex].skill, quality: first.quality }];
    setResults(nextResults);
    setPhraseAnswers((previous) => [...previous, first]);
    setDraft('');
    setHintOpen(false);
    setTheoryOpen(false);
    setFirst(null);
    setSelected(null);
    if (stage === 3) {
      const result = complete({ id: sessionId.current, scenarioId: scenario.id, completedAt: Date.now(), results: nextResults, transfer: 'planned' });
      if (result.recorded) { addXP(result.xp); recordSession(); }
      setEarned(result.xp);
      setDone(true);
    } else {
      setStage(3);
      setOptions(shuffle(scenario.turns[1].options));
      advancing.current = false;
    }
    window.scrollTo?.({ top: 0, behavior: 'smooth' });
  };

  if (!scenario) {
    return (
      <div className="learning-page conversation-gym" dir="rtl">
        <header className="learning-heading conversation-intro">
          <span className="learning-eyebrow">אימון מיומנות · 4 החלטות קצרות</span>
          <h2>אימון שיחה</h2>
          <p>מחליטים על כיוון, בוחרים כלי ורק אז מנסחים משפט.</p>
          <p className="conversation-original-purpose">רוצה לזהות מחיקה, עיוות והכללה? <button type="button" onClick={() => { window.location.hash = 'practice'; }}>לתרגול המטה־מודל ←</button></p>
        </header>
        <section className="conversation-featured" aria-label="אימון מומלץ">
          <img src={getConversationPresentation(nextScenario)?.image} alt="" className="conversation-featured-image" />
          <div className="conversation-featured-copy">
            <span className="conversation-kicker">✨ מומלץ עכשיו</span>
            <h3>{nextScenario.title}</h3>
            <p>{getConversationDecisionPath(nextScenario).focus}</p>
            <button className="btn btn-primary" onClick={() => start(nextScenario)}>מתחילים</button>
          </div>
        </section>
        <div className="conversation-feed-heading"><h3>עוד סיטואציות</h3><span>{CONVERSATION_SCENARIOS.length} אימונים</span></div>
        <div className="conversation-scenario-feed">
          {CONVERSATION_SCENARIOS.map((item) => (
            <button type="button" className="conversation-feed-item" key={item.id} onClick={() => start(item)} aria-label={'תרגל: ' + item.title}>
              <img src={getConversationPresentation(item)?.image} alt="" loading="lazy" className="conversation-feed-image" />
              <span className="conversation-feed-copy"><strong>{item.title}</strong><span className="conversation-feed-context">{item.context}</span><small>{getConversationDecisionPath(item).focus} · 4 החלטות</small></span>
              <span className="conversation-feed-chevron" aria-hidden="true">‹</span>
            </button>
          ))}
        </div>
        <p className="learning-muted conversation-disclaimer">תרחישים בדיוניים לאימון, לא אבחון או הערכה מקצועית.</p>
      </div>
    );
  }

  const path = getConversationDecisionPath(scenario);
  const visual = getConversationPresentation(scenario);
  const turnIndex = stage < 3 ? 0 : 1;
  const moment = visual?.moments[turnIndex];
  const speakerLine = stage === 3 ? moment?.speakerLine ?? scenario.opening : scenario.opening;
  const question = stage === 0 ? path.direction.prompt : stage === 1 ? path.method.prompt : stage === 2 ? 'מה תגיד קודם?' : 'מה תגיד עכשיו?';
  const hintText = stage === 0 ? path.direction.hint : stage === 1 ? path.method.hint : stage === 2 ? 'אל תתקן את המשפט לפני שהבנת את האדם.' : 'שים לב לבקשה החדשה בשיחה.';
  const pathOptions = stage === 0 ? path.direction.choices : path.method.choices;
  const completed = done ? 4 : stage + Number(Boolean(selected));
  const summaryChoices = [direction, method, phraseAnswers[0], phraseAnswers[1]];
  const selectedHeading = selected?.quality === 'helpful' ? 'מתאים כאן' : selected?.quality === 'mixed' ? 'כיוון אפשרי, צריך דיוק' : 'כדאי לנסות אחרת';

  return (
    <div className="learning-page conversation-gym conversation-workout" dir="rtl">
      <div className="conversation-workout-top">
        <button type="button" className="conversation-back" onClick={leave}>עזוב את האימון</button>
        <div className="conversation-top-tools">
          <button className="conversation-timer" type="button" aria-pressed={timerOn} onClick={() => setTimerOn((value) => !value)} title="שעון תרגול, ללא הגבלת זמן">{timerOn ? '⏱ ' + timeText(elapsed) : '⏱ זמן'}</button>
          <span>{done ? 'הושלם' : (stage + 1) + ' / 4'}</span>
        </div>
      </div>
      <div className="conversation-progress-track" role="progressbar" aria-label="התקדמות באימון" aria-valuemin={0} aria-valuemax={4} aria-valuenow={completed} aria-valuetext={completed + ' מתוך 4 החלטות'}>
        <span style={{ width: (completed / 4) * 100 + '%' }} />
      </div>
      <div className="conversation-training-layout">
        <aside className="conversation-route-rail" aria-label="עץ ההחלטות">
          <ol className="conversation-route-list">
            {STAGES.map((item, index) => {
              const chosen = summaryChoices[index]?.text;
              return (
                <li key={item.label} className={'conversation-route-step' + (completed > index ? ' is-complete' : '') + (!done && stage === index ? ' is-active' : '')} title={chosen ?? item.label}>
                  <span className="conversation-route-dot" aria-hidden="true">{completed > index ? '✓' : item.icon}</span>
                  <span className="conversation-route-text"><strong>{item.label}</strong><small>{chosen ?? (index === stage && !done ? 'עכשיו' : '')}</small></span>
                </li>
              );
            })}
          </ol>
        </aside>
        <div className="conversation-training-main">
          <header className="conversation-scene-head">
            {visual?.image && <img src={visual.image} alt="" className="conversation-scene-image" />}
            <div><span className="conversation-kicker">מתרגלים · {path.focus}</span><h2>{scenario.title}</h2><p>{scenario.context}</p></div>
          </header>
          {!done ? (
            <>
              <section className="conversation-dialogue-flow" aria-label="מה קורה בשיחה">
                <div className="conversation-speaker-label"><span aria-hidden="true">💬</span> {stage === 3 ? 'בהמשך הוא אומר' : 'האדם אומר'}</div>
                <blockquote className="conversation-spoken">{speakerLine}</blockquote>
              </section>
              <section className="conversation-decision-area" aria-label="ההחלטה הנוכחית">
                <div className="conversation-decision-head">
                  <div><span className="conversation-kicker">החלטה {stage + 1} · {STAGES[stage].label}</span><h3>{question}</h3></div>
                  <button className="conversation-hint-button" type="button" onClick={() => setHintOpen((value) => !value)} aria-expanded={hintOpen} aria-controls="conversation-small-hint">💡 רמז</button>
                </div>
                {hintOpen && <p className="conversation-hint-message" id="conversation-small-hint">{hintText}</p>}
                {stage === 2 || stage === 3 ? (
                  <>
                    <details className="learning-draft conversation-draft">
                      <summary>✍️ ניסוח עצמי</summary>
                      <label htmlFor="conversation-draft">התגובה שלך (לא נשמרת ולא מקבלת ציון אוטומטי)</label>
                      <textarea id="conversation-draft" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="משפט אחד, במילים שלך…" />
                    </details>
                    <div className="learning-options conversation-options" role="group" aria-label="תגובות אפשריות">
                      {options.map((value) => <button type="button" key={value.id} className={'learning-option conversation-option' + (selected?.id === value.id ? ' is-chosen' : '')} disabled={selected !== null} onClick={() => choosePhrase(value)}>{value.text}</button>)}
                    </div>
                  </>
                ) : (
                  <div className="conversation-path-options" role="group" aria-label="בחירת כיוון או כלי">
                    {pathOptions.map((value) => <button type="button" key={value.id} className="conversation-path-option" onClick={() => choosePath(value)}>{value.text}<span aria-hidden="true">‹</span></button>)}
                  </div>
                )}
              </section>
              {selected && (
                <section ref={feedbackRef} className={'conversation-feedback-inline learning-feedback-' + selected.quality} aria-live="polite">
                  <h3>{selectedHeading}</h3>
                  <p>{selected.feedback}</p>
                  {moment && (
                    <div className="conversation-theory-compact">
                      <button type="button" onClick={() => setTheoryOpen((value) => !value)} aria-expanded={theoryOpen}>📘 {moment.theory.title} <span aria-hidden="true">{theoryOpen ? '⌃' : '⌄'}</span></button>
                      {theoryOpen && <p>{moment.theory.detail}</p>}
                    </div>
                  )}
                  <details className="conversation-peer-reply"><summary>התגובה האפשרית שלו</summary><blockquote>{selected.reply}</blockquote></details>
                  <div className="learning-actions">
                    {selected.quality !== 'helpful' && <button className="btn btn-secondary" onClick={retry}>נסה שוב</button>}
                    <button className="btn btn-primary" onClick={next}>{stage === 3 ? 'סיים את האימון' : 'להמשך השיחה'}</button>
                  </div>
                  <small className="learning-muted">הבחירה הראשונה נשמרת לצורך מעקב התרגול.</small>
                </section>
              )}
              {stage < 2 && <p className="conversation-path-footnote">אפשר גם לבחור לא להשתמש עדיין במטה־מודל. קודם מתאימים כיוון וכלי.</p>}
              {stage >= 2 && <p className="conversation-path-footnote">בחר ניסוח שמתאים להקשר. ההמשך בתרגיל כתוב מראש.</p>}
            </>
          ) : (
            <section className="conversation-summary" aria-live="polite">
              <span className="learning-eyebrow">4 מתוך 4 · האימון הושלם</span>
              <h3>המסלול שבחרת</h3>
              <p className="conversation-summary-lead">{path.summary}</p>
              <ol className="conversation-summary-list">
                {summaryChoices.map((value, index) => value && (
                  <li key={STAGES[index].label}>
                    <span aria-hidden="true">{STAGES[index].icon}</span>
                    <div><strong>{STAGES[index].label}: {value.text}</strong><small>{value.feedback}</small></div>
                  </li>
                ))}
              </ol>
              <p className="learning-muted">{earned ? 'נוספו ' + earned + ' נקודות.' : 'אפשר לתרגל שוב.'} זהו תרגול לימודי, לא מדד ליכולת טיפולית.</p>
              {timerOn && <p className="conversation-elapsed">⏱ זמן התרגול: {timeText(elapsed)}</p>}
              <div className="learning-actions"><button className="btn btn-primary" onClick={leave}>אימון נוסף</button><button className="btn btn-secondary" onClick={() => { leave(); window.location.hash = 'practice'; }}>זיהוי דפוסים</button></div>
            </section>
          )}
          {!stored && <p role="alert">שמירת ההתקדמות אינה זמינה כרגע בדפדפן.</p>}
        </div>
      </div>
    </div>
  );
}
