import { useEffect, useRef, useState } from 'react';
import { CONVERSATION_SCENARIOS } from '../../data/conversationScenarios';
import type { ConversationOption, ConversationScenario } from '../../data/conversationSkills';
import { getConversationPresentation } from '../../data/conversationPresentation';
import { getConversationDecisionPath, type ConversationPathChoice } from '../../data/conversationDecisionPaths';
import { recommendScenario, type ConversationResult } from '../../lib/conversationLearning';
import { applyConversationMove, applyRepair, connectionDescription, illustratedEmotion, STARTING_CONNECTION } from '../../lib/conversationMomentum';
import { useConversationLearning } from '../../store/conversationLearning';
import { useProgress } from '../../store/useProgress';
import { shuffle } from '../../lib/random';

type InnerLens = 'direction' | 'method' | 'language';
type Room = 'scene' | 'mind';
const timeText = (seconds: number) => String(Math.floor(seconds / 60)).padStart(2, '0') + ':' + String(seconds % 60).padStart(2, '0');
const THINK_TABS: { id: InnerLens; icon: string; label: string }[] = [
  { id: 'direction', icon: '🧭', label: 'כוונה' },
  { id: 'method', icon: '🛠️', label: 'כלי' },
  { id: 'language', icon: '💬', label: 'ניסוח' },
];

export function ConversationGymPage() {
  const { learning, stored, complete } = useConversationLearning();
  const { addXP, recordSession } = useProgress();
  const [scenario, setScenario] = useState<ConversationScenario | null>(null);
  const [turnIndex, setTurnIndex] = useState(0);
  const [room, setRoom] = useState<Room>('scene');
  const [lens, setLens] = useState<InnerLens>('direction');
  const [direction, setDirection] = useState<ConversationPathChoice | null>(null);
  const [method, setMethod] = useState<ConversationPathChoice | null>(null);
  const [options, setOptions] = useState<ConversationOption[]>([]);
  const [showActions, setShowActions] = useState(false);
  const [selected, setSelected] = useState<ConversationOption | null>(null);
  const [first, setFirst] = useState<ConversationOption | null>(null);
  const [results, setResults] = useState<ConversationResult[]>([]);
  const [draft, setDraft] = useState('');
  const [hintOpen, setHintOpen] = useState(false);
  const [timerOn, setTimerOn] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [connection, setConnection] = useState(STARTING_CONNECTION);
  const [history, setHistory] = useState<number[]>([STARTING_CONNECTION]);
  const [repaired, setRepaired] = useState(false);
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
    if (selected && room === 'scene') feedbackRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
  }, [selected, room]);

  const start = (value: ConversationScenario) => {
    sessionId.current = crypto.randomUUID();
    advancing.current = false;
    setScenario(value);
    setTurnIndex(0);
    setRoom('scene');
    setLens('direction');
    setDirection(null);
    setMethod(null);
    setOptions(shuffle(value.turns[0].options));
    setShowActions(false);
    setSelected(null);
    setFirst(null);
    setResults([]);
    setDraft('');
    setHintOpen(false);
    setTimerOn(false);
    setElapsed(0);
    setConnection(STARTING_CONNECTION);
    setHistory([STARTING_CONNECTION]);
    setRepaired(false);
    setEarned(0);
    setDone(false);
    window.scrollTo?.({ top: 0, behavior: 'auto' });
  };

  const leave = () => {
    advancing.current = false;
    setScenario(null);
    setRoom('scene');
    setDraft('');
    setTimerOn(false);
  };

  const think = (tab: InnerLens = 'direction') => {
    setRoom('mind');
    setLens(tab);
    setHintOpen(false);
  };

  const choose = (value: ConversationOption) => {
    if (selected || !scenario) return;
    setFirst((old) => old ?? value);
    setSelected(value);
    const nextScore = applyConversationMove(connection, value.quality);
    setConnection(nextScore);
    setHistory((old) => [...old, nextScore]);
    setRepaired(false);
    setShowActions(false);
  };

  const repair = () => {
    if (!selected || repaired) return;
    const nextScore = applyRepair(connection);
    setConnection(nextScore);
    setHistory((old) => [...old, nextScore]);
    setRepaired(true);
  };

  const next = () => {
    if (!scenario || !selected || !first || advancing.current) return;
    advancing.current = true;
    const nextResults: ConversationResult[] = [...results, { skill: scenario.turns[turnIndex].skill, quality: first.quality }];
    setResults(nextResults);
    setDraft('');
    setDirection(null);
    setMethod(null);
    setShowActions(false);
    setSelected(null);
    setFirst(null);
    setRepaired(false);
    if (turnIndex + 1 === scenario.turns.length) {
      const result = complete({ id: sessionId.current, scenarioId: scenario.id, completedAt: Date.now(), results: nextResults, transfer: 'planned' });
      if (result.recorded) { addXP(result.xp); recordSession(); }
      setEarned(result.xp);
      setDone(true);
    } else {
      const index = turnIndex + 1;
      setTurnIndex(index);
      setOptions(shuffle(scenario.turns[index].options));
      advancing.current = false;
    }
    window.scrollTo?.({ top: 0, behavior: 'smooth' });
  };

  if (!scenario) {
    return (
      <div className="learning-page conversation-gym" dir="rtl">
        <header className="learning-heading conversation-intro">
          <span className="learning-eyebrow">תרגול תגובה בהקשר</span>
          <h2>אימון שיחה</h2>
          <p>מול האדם: <strong>פעל</strong>. בתוך הראש: <strong>חשוב</strong>. גם מהלך לא מוצלח אפשר לתקן.</p>
          <p className="conversation-original-purpose">לזיהוי מחיקה, עיוות והכללה: <button type="button" onClick={() => { window.location.hash = 'practice'; }}>תרגול מטה־מודל ←</button></p>
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
              <span className="conversation-feed-copy"><strong>{item.title}</strong><span className="conversation-feed-context">{item.context}</span><small>{getConversationDecisionPath(item).focus}</small></span>
              <span className="conversation-feed-chevron" aria-hidden="true">‹</span>
            </button>
          ))}
        </div>
        <p className="learning-muted conversation-disclaimer">דמויות ותגובות מומצאות. מד המצב אינו כלי אבחוני.</p>
      </div>
    );
  }

  const path = getConversationDecisionPath(scenario);
  const visual = getConversationPresentation(scenario);
  const moment = visual?.moments[turnIndex];
  const speakerLine = turnIndex === 0 ? scenario.opening : (moment?.speakerLine ?? scenario.opening);
  const mentalOptions = lens === 'direction' ? path.direction.choices : path.method.choices;
  const mentalSelection = lens === 'direction' ? direction : method;
  const completed = done ? scenario.turns.length : results.length + Number(Boolean(selected));
  const emotion = selected ? illustratedEmotion(selected.quality) : null;
  const lastText = selected?.reply;
  const detailedExplanation = moment?.theory.detail ?? scenario.principle;

  return (
    <div className="learning-page conversation-gym therapist-workout" dir="rtl">
      <div className="conversation-workout-top">
        <button type="button" className="conversation-back" onClick={leave}>עזוב את האימון</button>
        <div className="conversation-top-tools">
          <button className="conversation-timer" type="button" aria-pressed={timerOn} onClick={() => setTimerOn((old) => !old)}>{timerOn ? '⏱ ' + timeText(elapsed) : '⏱ זמן'}</button>
          <span>מהלך {Math.min(turnIndex + 1, scenario.turns.length)} / {scenario.turns.length}</span>
        </div>
      </div>
      <div className="conversation-progress-track" role="progressbar" aria-label="התקדמות באימון" aria-valuemin={0} aria-valuemax={scenario.turns.length} aria-valuenow={completed}>
        <span style={{ width: completed / scenario.turns.length * 100 + '%' }} />
      </div>
      <header className="conversation-scene-head">
        {visual?.image && <img src={visual.image} alt="" className="conversation-scene-image" />}
        <div><span className="conversation-kicker">{path.focus}</span><h2>{scenario.title}</h2><p>{scenario.context}</p></div>
      </header>
      <div className="therapist-play-layout">
        <aside className="therapist-eval" aria-label="מד קשר מדומה">
          <span className="therapist-eval-heading">קשר</span>
          <div className="therapist-eval-track" role="meter" aria-label="מד קשר לצורך משחק בלבד" aria-valuemin={0} aria-valuemax={100} aria-valuenow={connection} aria-valuetext={connectionDescription(connection)}>
            <span style={{ height: connection + '%' }} />
            <i className="therapist-eval-center" />
          </div>
          <strong>{connectionDescription(connection)}</strong>
          <details><summary>מה המד הזה?</summary><p>מחוון משחקי המדגים תנועה בקשר. לא קריאת רגשות ולא אבחון. מהלך חלש אינו סוף השיחה: אפשר לתקן ולהתקרב בהמשך.</p></details>
        </aside>
        <div className="therapist-scene-main">
          {!done && (
            <section className="therapist-client" aria-label="מה האדם אומר">
              <span className="conversation-speaker-label">💬 האדם שמולך</span>
              <blockquote className="conversation-spoken">{speakerLine}</blockquote>
              {selected && <div className="therapist-emotion" aria-live="polite"><span>{emotion?.icon}</span><strong>{emotion?.label}</strong><small>תגובה אפשרית בסימולציה</small></div>}
              {selected && <blockquote className="therapist-client-reply">{lastText}</blockquote>}
            </section>
          )}
          {!done && (
            <div className="therapist-actions">
              <button type="button" className="therapist-act" onClick={() => { setRoom('scene'); setShowActions((old) => !old); }} aria-expanded={showActions && room === 'scene'}>⚡ פעל</button>
              <button type="button" className="therapist-think" onClick={() => think()}>🧠 חשוב</button>
            </div>
          )}

          {!done && room === 'scene' && showActions && !selected && (
            <section className="therapist-action-panel" aria-label="בחר תגובה">
              <h3>מה תגיד?</h3>
              <div className="conversation-options" role="group" aria-label="תגובות אפשריות">
                {options.map((value) => <button type="button" key={value.id} className="learning-option conversation-option" onClick={() => choose(value)}>{value.text}</button>)}
                <button type="button" className="therapist-none" onClick={() => think('language')}>🧠 אף אחת לא מתאימה. אני צריך לחשוב.</button>
              </div>
            </section>
          )}

          {!done && selected && room === 'scene' && (
            <section ref={feedbackRef} className="therapist-after-move" aria-live="polite">
              <strong>{selected.quality === 'helpful' ? 'מהלך מתאים להקשר' : selected.quality === 'mixed' ? 'מהלך שאפשר לדייק' : 'המהלך הרחיק מעט'}</strong>
              <p>{selected.feedback}</p>
              {moment && <details className="therapist-lesson"><summary>📘 {moment.theory.title}</summary><p>{detailedExplanation}</p></details>}
              {selected.quality !== 'helpful' && !repaired && <button type="button" className="therapist-repair" onClick={repair}>↺ תיקון הקשר</button>}
              {repaired && <p className="therapist-repair-confirmation">↗ תיקון אפשרי: להכיר בפער ולבדוק מה האדם צריך עכשיו. המד מתאושש, והמהלך הקודם עדיין נלמד.</p>}
              <button className="btn btn-primary" type="button" onClick={next}>{turnIndex + 1 === scenario.turns.length ? 'סיים את האימון' : 'המשך השיחה'}</button>
            </section>
          )}

          {!done && room === 'mind' && (
            <section className="therapist-mind-backdrop" aria-label="החשיבה הפנימית של המטפל">
              <div className="therapist-mind-sheet" role="dialog" aria-modal="true" aria-label="בתוך הראש של המטפל">
                <div className="therapist-mind-head"><span>🧠 בתוך הראש של המטפל <small>הדמות לא שומעת את זה</small></span><button type="button" onClick={() => setRoom('scene')} aria-label="סגור חשיבה">✕</button></div>
                <div className="therapist-mind-tabs">
                  {THINK_TABS.map((tab) => <button type="button" key={tab.id} onClick={() => setLens(tab.id)} className={lens === tab.id ? 'active' : ''} aria-pressed={lens === tab.id}>{tab.icon} {tab.label}</button>)}
                </div>
                {lens !== 'language' ? (
                  <>
                    <p className="therapist-mind-question">{lens === 'direction' ? 'מה אני מבקש להשיג כרגע?' : 'איזה כלי מתאים לכוונה?'}</p>
                    <div className="therapist-mind-choices">
                      {mentalOptions.map((value) => <button type="button" key={value.id} className={mentalSelection?.id === value.id ? 'chosen' : ''} onClick={() => lens === 'direction' ? setDirection(value) : setMethod(value)}>{value.text}</button>)}
                    </div>
                    {mentalSelection && <p className="therapist-mind-insight">{mentalSelection.feedback}</p>}
                  </>
                ) : (
                  <>
                    <p className="therapist-mind-question">מה אני רוצה לומר במילים שלי?</p>
                    <label htmlFor="therapist-personal-draft">טיוטה פרטית. אינה נשמרת או נבדקת אוטומטית.</label>
                    <textarea id="therapist-personal-draft" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="מה הייתי אומר עכשיו?" />
                    <button className="therapist-hint-button" type="button" onClick={() => setHintOpen((old) => !old)}>💡 רמז</button>
                    {hintOpen && <p className="therapist-mind-insight">{turnIndex === 0 ? path.direction.hint : 'מה מבקש האדם עכשיו, והאם שאלה נוספת מתאימה?'}</p>}
                  </>
                )}
                <div className="therapist-mind-footer"><button type="button" onClick={() => { setRoom('scene'); setShowActions(true); }}>חזרה לשיחה · פעל</button></div>
              </div>
            </section>
          )}
          {done && (
            <section className="conversation-summary" aria-live="polite">
              <span className="learning-eyebrow">האימון הושלם</span>
              <h3>מסלול הקשר שלך</h3>
              <div className="therapist-history" aria-label="מהלכי הקשר בתרגול">{history.map((score, index) => <span key={index} title={connectionDescription(score)} style={{ height: score + '%' }} />)}</div>
              <p>{scenario.transferCue}</p>
              <p className="learning-muted">אפשר להתאושש גם אחרי מהלך לא מוצלח. המד ממחיש תרחיש כתוב בלבד, לא את רגשות האדם האמיתי.</p>
              <p className="learning-muted">{earned ? 'נוספו ' + earned + ' נקודות תרגול.' : 'אפשר לחזור לתרגול.'}</p>
              {timerOn && <p className="conversation-elapsed">⏱ {timeText(elapsed)}</p>}
              <div className="learning-actions"><button className="btn btn-primary" type="button" onClick={leave}>אימון נוסף</button><button className="btn btn-secondary" type="button" onClick={() => { leave(); window.location.hash = 'practice'; }}>זיהוי דפוסים</button></div>
            </section>
          )}
          {!stored && <p role="alert">שמירת ההתקדמות אינה זמינה כרגע.</p>}
        </div>
      </div>
    </div>
  );
}
