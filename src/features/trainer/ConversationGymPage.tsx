import { useEffect, useRef, useState } from 'react';
import { CONVERSATION_SCENARIOS } from '../../data/conversationScenarios';
import { CONVERSATION_SKILLS, type ConversationOption, type ConversationScenario } from '../../data/conversationSkills';
import { getConversationPresentation } from '../../data/conversationPresentation';
import { recommendScenario, type ConversationResult } from '../../lib/conversationLearning';
import { useConversationLearning } from '../../store/conversationLearning';
import { useProgress } from '../../store/useProgress';
import { shuffle } from '../../lib/random';

export function ConversationGymPage() {
  const { learning, stored, complete } = useConversationLearning();
  const { addXP, recordSession } = useProgress();
  const [scenario, setScenario] = useState<ConversationScenario | null>(null);
  const [turnIndex, setTurnIndex] = useState(0);
  const [options, setOptions] = useState<ConversationOption[]>([]);
  const [selected, setSelected] = useState<ConversationOption | null>(null);
  const [first, setFirst] = useState<ConversationOption | null>(null);
  const [results, setResults] = useState<ConversationResult[]>([]);
  const [draft, setDraft] = useState('');
  const [done, setDone] = useState(false);
  const [earned, setEarned] = useState(0);
  const sessionId = useRef('');
  const advancing = useRef(false);
  const feedbackRef = useRef<HTMLElement | null>(null);
  const responseRef = useRef<HTMLElement | null>(null);
  const nextScenario = recommendScenario(learning);

  const start = (value: ConversationScenario) => {
    sessionId.current = crypto.randomUUID();
    advancing.current = false;
    setScenario(value);
    setTurnIndex(0);
    setResults([]);
    setSelected(null);
    setFirst(null);
    setDone(false);
    setDraft('');
    setOptions(shuffle(value.turns[0].options));
    window.scrollTo?.({ top: 0, behavior: 'auto' });
  };

  const leave = () => {
    setScenario(null);
    setDraft('');
    setSelected(null);
  };

  const choose = (value: ConversationOption) => {
    if (selected) return;
    setSelected(value);
    setFirst((prev) => prev ?? value);
  };

  useEffect(() => {
    if (selected) feedbackRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
  }, [selected]);

  const retry = () => {
    setSelected(null);
    responseRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  };

  const next = () => {
    if (!scenario || !selected || !first || advancing.current) return;
    advancing.current = true;
    const nextResults = [...results, { skill: scenario.turns[turnIndex].skill, quality: first.quality }];
    setResults(nextResults);
    if (turnIndex + 1 === scenario.turns.length) {
      const result = complete({ id: sessionId.current, scenarioId: scenario.id, completedAt: Date.now(), results: nextResults, transfer: 'planned' });
      if (result.recorded) {
        addXP(result.xp);
        recordSession();
      }
      setEarned(result.xp);
      setDone(true);
      setDraft('');
    } else {
      const index = turnIndex + 1;
      setTurnIndex(index);
      setOptions(shuffle(scenario.turns[index].options));
      setSelected(null);
      setFirst(null);
      setDraft('');
      advancing.current = false;
      window.scrollTo?.({ top: 0, behavior: 'smooth' });
    }
  };

  if (!scenario) {
    return (
      <div className="learning-page conversation-gym" dir="rtl">
        <header className="learning-heading conversation-intro">
          <span className="learning-eyebrow">לומדים לדבר, לא רק לענות</span>
          <h2>אימון שיחה</h2>
          <p>בחר סיטואציה, הקשב למה שנאמר ותרגל תגובה אחת בכל פעם.</p>
        </header>

        <section className="conversation-featured" aria-label="אימון מומלץ">
          <img src={getConversationPresentation(nextScenario)?.image} alt="" className="conversation-featured-image" />
          <div className="conversation-featured-copy">
            <span className="conversation-kicker">✨ מומלץ עכשיו · כ־3 דקות</span>
            <h3>{nextScenario.title}</h3>
            <p>{nextScenario.context}</p>
            <button className="btn btn-primary" onClick={() => start(nextScenario)}>התחל אימון מומלץ</button>
          </div>
        </section>

        <div className="conversation-feed-heading">
          <h3>עוד שיחות לתרגול</h3>
          <span>{CONVERSATION_SCENARIOS.length} סיטואציות · גללו לבחירה</span>
        </div>
        <div className="conversation-scenario-feed">
          {CONVERSATION_SCENARIOS.map((item) => (
            <button
              type="button"
              className="conversation-feed-item"
              key={item.id}
              onClick={() => start(item)}
              aria-label={'תרגל: ' + item.title}
            >
              <img src={getConversationPresentation(item)?.image} alt="" loading="lazy" className="conversation-feed-image" />
              <span className="conversation-feed-copy">
                <strong>{item.title}</strong>
                <span className="conversation-feed-context">{item.context}</span>
                <small>{item.turns.length} רגעים בשיחה · {item.principle}</small>
              </span>
              <span className="conversation-feed-chevron" aria-hidden="true">‹</span>
            </button>
          ))}
        </div>
        <p className="learning-muted conversation-disclaimer">הסיטואציות והתגובות בדיוניות ונכתבו לצורכי למידה. בשיחה אמיתית בודקים עם האדם מה מתאים לו.</p>
      </div>
    );
  }

  const turn = scenario.turns[turnIndex];
  const visual = getConversationPresentation(scenario);
  const moment = visual?.moments[turnIndex];
  const speakerLine = moment?.speakerLine ?? (turnIndex === 0 ? scenario.opening : '');
  const question = moment?.question ?? turn.prompt;
  const skill = CONVERSATION_SKILLS.find((item) => item.id === turn.skill);
  const step = turnIndex + 1;
  const completedTurns = done ? scenario.turns.length : results.length + Number(Boolean(selected));

  return (
    <div className="learning-page conversation-gym conversation-workout" dir="rtl">
      <div className="conversation-workout-top">
        <button type="button" className="conversation-back" onClick={leave}>עזוב את האימון</button>
        <span>רגע {step} מתוך {scenario.turns.length}</span>
      </div>
      <div
        className="conversation-progress-track"
        role="progressbar"
        aria-label="התקדמות באימון"
        aria-valuemin={0}
        aria-valuemax={scenario.turns.length}
        aria-valuenow={completedTurns}
        aria-valuetext={`${completedTurns} מתוך ${scenario.turns.length} רגעים הושלמו`}
      >
        <span style={{ width: ((completedTurns / scenario.turns.length) * 100) + '%' }} />
      </div>
      <header className="conversation-scene-head">
        {visual?.image && <img src={visual.image} alt="" className="conversation-scene-image" />}
        <div>
          <span className="conversation-kicker">הסיטואציה</span>
          <h2>{scenario.title}</h2>
          <p>{scenario.context}</p>
        </div>
      </header>

      {!done ? (
        <>
          <section className="conversation-dialogue-flow" aria-label="מה קורה בשיחה">
            <div className="conversation-speaker-label"><span aria-hidden="true">💬</span> האדם שמולך אומר</div>
            {speakerLine && <blockquote className="conversation-spoken">{speakerLine}</blockquote>}
            <div className="conversation-task">
              <span className="conversation-kicker">🎯 התפקיד שלך</span>
              <h3>{question}</h3>
            </div>
          </section>

          <details className="conversation-prep">
            <summary>💡 רוצה רמז לפני הבחירה?</summary>
            <p>מה האדם רוצה שיקרה בשיחה עכשיו? חפש תגובה שמתאימה גם למילים שלו וגם לתזמון.</p>
          </details>

          <section ref={responseRef} className="conversation-response-area" aria-label="בחר תגובה">
            <div className="conversation-response-head">
              <h3>איך היית מגיב?</h3>
              <span>{skill?.title}</span>
            </div>
            <details className="learning-draft conversation-draft">
              <summary>רוצה לנסות קודם במילים שלך?</summary>
              <label htmlFor="conversation-draft">התגובה שלך (לא נשמרת ולא מקבלת ציון אוטומטי)</label>
              <textarea id="conversation-draft" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="משפט אחד, במילים שלך…" />
              <p className="learning-muted">לאחר הבחירה, השווה את הניסוח שלך לעיקרון שבמשוב.</p>
            </details>
            <div className="learning-options conversation-options" role="group" aria-label="תגובות אפשריות">
              {options.map((value, i) => (
                <button
                  key={value.id}
                  type="button"
                  className={'learning-option conversation-option' + (selected?.id === value.id ? ' is-chosen' : '')}
                  disabled={selected !== null}
                  onClick={() => choose(value)}
                >
                  <span className="conversation-option-index" aria-hidden="true">{i + 1}</span>
                  <span>{value.text}</span>
                </button>
              ))}
            </div>
          </section>

          {selected && (
            <section ref={feedbackRef} className={'card learning-feedback conversation-feedback learning-feedback-' + selected.quality} aria-live="polite">
              <span className="conversation-kicker">מה למדנו מהתגובה?</span>
              <h3>{selected.quality === 'helpful' ? 'מתאים להקשר הזה' : selected.quality === 'mixed' ? 'יש כאן כיוון, אבל התזמון חשוב' : 'כדאי לבחור תגובה אחרת'}</h3>
              <p>{selected.feedback}</p>
              {moment && (
                <aside className="conversation-theory" aria-label="רגע תיאורטי">
                  <div className="conversation-theory-title">
                    <span aria-hidden="true">💡</span>
                    <div><span>הרגע התיאורטי</span><strong>{moment.theory.title}</strong></div>
                  </div>
                  <p>{moment.theory.cue}</p>
                  <details>
                    <summary>להסבר המלא</summary>
                    <p>{moment.theory.detail}</p>
                  </details>
                </aside>
              )}
              <div className="conversation-peer-reply">
                <strong>תגובה אפשרית של הדובר</strong>
                <blockquote>{selected.reply}</blockquote>
              </div>
              <div className="learning-actions">
                {selected.quality !== 'helpful' && <button className="btn btn-secondary" onClick={retry}>נסה תגובה נוספת</button>}
                <button className="btn btn-primary" onClick={next}>{step === scenario.turns.length ? 'סכם את האימון' : 'לרגע הבא בשיחה'}</button>
              </div>
              <p className="learning-muted">במעקב נרשמת הבחירה הראשונה. ניסיון נוסף עוזר ללמוד.</p>
            </section>
          )}
        </>
      ) : (
        <section className="card learning-complete conversation-summary" aria-live="polite">
          <span className="learning-eyebrow">האימון הושלם</span>
          <h3>מה תיקח לשיחה הבאה?</h3>
          <p>{scenario.transferCue}</p>
          <p>{results.filter((result) => result.quality === 'helpful').length} מתוך {results.length} בחירות ראשונות התאימו להקשר.</p>
          <p className="learning-muted">{earned ? 'נוספו ' + earned + ' נקודות תרגול.' : 'אפשר להמשיך להתאמן; נקודות על הסיטואציה ניתנות פעם ביום.'} זהו משוב לימודי, לא מדד ליכולת טיפולית.</p>
          <div className="learning-actions">
            <button className="btn btn-primary" onClick={() => { leave(); window.location.hash = 'home'; }}>לתוכנית התרגול שלי</button>
            <button className="btn btn-secondary" onClick={leave}>בחר אימון נוסף</button>
          </div>
        </section>
      )}
      {!stored && <p role="alert">הדפדפן לא אפשר לשמור את המעקב. הוא זמין כרגע עד סגירת העמוד.</p>}
    </div>
  );
}
