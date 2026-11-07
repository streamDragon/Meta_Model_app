import { useEffect, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { ask, createSession, FICTIONAL_CASE, moveScene, probeScene, QUESTIONS, SCENES, suggestedQuestions, summarizeSession } from './clinicCaseEngine';
import type { Family, ProbeKind, QuestionId, Scene, SceneId, Session } from './clinicCaseEngine';
import './clinic-simulator.css';
import { ClinicStatusRail } from './ClinicStatusRail';

const FAMILY_LABELS: Record<Family, string> = {
  rapport: 'קשר והקשבה', row4: 'שורה 4 · הקשר וזמן',
  row5: 'שורה 5 · חוויה חושית', gforce: 'G-Force · מטרה ומשאבים',
  barrier: 'חסמים ואמונות', future: 'עתיד ומוטיבציה',
};
const FAMILY_ICONS: Record<Family, string> = {
  rapport: '🤝', row4: '🕒', row5: '👁️', gforce: '🎯', barrier: '🪨', future: '✨',
};
const FAMILIES: Family[] = ['rapport', 'row4', 'row5', 'gforce', 'barrier', 'future'];

function MiniScene({ scene }: { scene: Scene }): ReactElement {
  const items: Record<Scene['art'], string[]> = {
    clutter: ['🪑', '🧥', '🧦', '🛍️'], clean: ['🪑', '✨', '🧼', '☀️'],
    tools: ['🗑️', '🧹', '🧺'], basket: ['🧺', '👕', '✅'],
    sweep: ['🧹', '✨', '⬜'], stuck: ['🧍', '👔', '❔'],
    scope: ['🛏️', '👕', '📦', '❗'],
    fatigue: ['💼', '🪑', '🌙'], toolgap: ['🧹', '❓', '🚪'],
    choice: ['👕', '🧺', '❓'], permission: ['✨', '🗄️', '😟'],
    maintenance: ['🚪', '🛍️', '🧺'],
  };
  return <div className={`clinic-scene-art art-${scene.art}`} aria-label={`איור המחשה: ${scene.title}`} role="img">
    <span className="clinic-art-floor" />
    <div className="clinic-art-icons" aria-hidden="true">{items[scene.art].map((icon, index) => <span key={index}>{icon}</span>)}</div>
    <span className="clinic-art-caption">איור סכמטי, לא צילום אמיתי</span>
  </div>;
}

const ENDING_QUESTION: QuestionId[] = ['goal-sense', 'compare', 'smart', 'state', 'sequence-check'];
const MAX_VISIBLE_TURNS = 1;

function SceneStack({ session, onMove, onProbe }: { session: Session; onMove: (id: SceneId, dir: -1 | 1) => void; onProbe: (id: SceneId, kind: ProbeKind) => void }) {
  const summary = summarizeSession(session);
  return <section className="clinic-panel" aria-labelledby="clinic-discoveries">
    <div className="clinic-heading-line">
      <h3 id="clinic-discoveries">🃏 קלפים שנחשפו בשיחה</h3>
      <span className="clinic-count">{session.sceneOrder.length} נחשפו</span>
    </div>
    {session.sceneOrder.length === 0 ? <div className="clinic-blank">
      <div className="clinic-cardbacks" aria-hidden="true"><span>?</span><span>?</span><span>?</span></div>
      <p>אין עדיין תמונות גלויות. המטפל אינו יודע מראש מה נראה בכל מצב. השאלות החושיות חושפות קלפים.</p>
    </div> : <>
      <div className="clinic-cards">
        {session.sceneOrder.map(id => {
          const scene = SCENES[id];
          return <article className={`clinic-scene-card ${scene.kind === 'branch' ? 'clinic-branch' : ''}`} key={id}>
            <MiniScene scene={scene} />
            <div className="clinic-scene-body">
              <div className="clinic-scene-title">{scene.kind === 'branch' ? '↳ הסתעפות' : '◆ מצב שנחשף'} · {scene.title}</div>
              <p>{scene.observation}</p>
              <div className="clinic-probe-strip" aria-label={`חקירת תמונה: ${scene.title}`}>
                <button type="button" onClick={() => onProbe(id, 'imagine')}>👁️ רואה את זה?</button>
                <button type="button" onClick={() => onProbe(id, 'comfort')}>💛 מרגיש נוח?</button>
                <button type="button" onClick={() => onProbe(id, 'micro')}>🪜 יודע איך?</button>
              </div>
              {(Object.entries(session.probes[id] ?? {}) as [ProbeKind, string][]).length > 0 && <div className="clinic-probe-results">
                {(Object.entries(session.probes[id] ?? {}) as [ProbeKind, string][]).map(([kind, status]) => <span key={kind} className={`clinic-probe-status state-${status}`}>
                  {kind === 'imagine' ? 'דמיון' : kind === 'comfort' ? 'נוחות' : 'ביצוע'}: {status === 'ready' ? 'אפשרי' : status === 'blocked' ? 'חסום' : 'לא ברור'}
                </span>)}
              </div>}
              {scene.kind === 'spine' && <div className="clinic-reorder" aria-label={`סדר קלף: ${scene.title}`}>
                <button type="button" aria-label={`הזז את ${scene.title} אחורה`} onClick={() => onMove(id, -1)}>→</button>
                <button type="button" aria-label={`הזז את ${scene.title} קדימה`} onClick={() => onMove(id, 1)}>←</button>
              </div>}
            </div>
          </article>;
        })}
      </div>
      <p className="clinic-note">אלה קלפי גילוי, לא רשימת משימות מוכנה. אפשר לשנות את סדר קלפי הציר הראשי. הסתעפויות הן חלק מן הסיפור ולא צעד חובה.</p>
      {summary.main.length > 0 && <div className="clinic-domino" aria-label="רצף המצבים שנחשפו">
        {summary.main.map((id, i) => <span className="clinic-domino-item" key={id}>{i > 0 && <b aria-hidden="true">←</b>}{SCENES[id].title}</span>)}
      </div>}
      {summary.canCompare && <div className="clinic-insight">אפשר עכשיו לבדוק את הניגוד בין נקודת הפתיחה לבין התוצאה הרצויה, גם אם התמונות שבדרך עדיין חסרות.</div>}
    </>}
  </section>;
}

function Intro({ onBegin }: { onBegin: () => void }) {
  return <div className="clinic-intro-panel">
    <div className="clinic-hero-scene" aria-hidden="true">
      <div className="clinic-avatar therapist">👨🏻‍💼</div>
      <div className="clinic-talk">״אני רוצה להתחיל, אבל כל צעד הופך להר ענק.״</div>
      <div className="clinic-avatar patient">🧔🏻</div>
    </div>
    <span className="clinic-kicker">מקרה 01 · חדר שהפך לפרויקט אינסופי</span>
    <h3>אתה המטפל. איך תתחיל?</h3>
    <p><strong>איתן, בן 41</strong>, עובד וחוזר הביתה עייף. החדר שלו עמוס, והוא רוצה לסדר אותו. הוא מתחיל, נתקע ועוזב. לפעמים הוא מצליח לעשות פעולה קטנה, אבל ברגע שהוא חושב על שאר הבית, הוא מרגיש שמה שעשה לא נחשב.</p>
    <div className="clinic-intro-dialog"><strong>איתן:</strong> {FICTIONAL_CASE.introduction}</div>
    <p className="clinic-note">זהו אדם בדיוני. תפקידך אינו לכפות עליו סדר פעולות, אלא להקשיב, לבחור שאלה עם מטרה ולגלות איתו מפה שעשויה לעבוד. התגובות נכתבו מראש; אין כאן מנוע בינה מלאכותית.</p>
    <button type="button" className="clinic-primary clinic-start" onClick={onBegin}>כניסה לפגישה <span aria-hidden="true">←</span></button>
  </div>;
}

export function GForceClinicPage() {
  const [session, setSession] = useState<Session>(createSession);
  const [started, setStarted] = useState(false);
  const [family, setFamily] = useState<Family | 'suggestions'>('suggestions');
  const [showAllTurns, setShowAllTurns] = useState(false);
  const latestAnswerRef = useRef<HTMLDivElement | null>(null);
  const [showWhy, setShowWhy] = useState(false);
  const [probeFeedback, setProbeFeedback] = useState('');

  const suggestions = suggestedQuestions(session);
  const selectedQuestions = family === 'suggestions' ? suggestions : QUESTIONS.filter(q => q.family === family);
  const latestTurn = session.turns[session.turns.length - 1];
  const previousTurns = session.turns.slice(0, -MAX_VISIBLE_TURNS);

  // Keep the new reply in view, with next choices BELOW it. No scrolling back up.
  useEffect(() => {
    if (!latestTurn) return;
    latestAnswerRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  }, [latestTurn?.id]);

  function answer(id: QuestionId) {
    setSession(previous => ask(previous, id));
    setProbeFeedback('');
    setShowWhy(false);
  }

  function checkScene(id: SceneId, kind: ProbeKind) {
    const result = probeScene(session, id, kind);
    setSession(result.session);
    setProbeFeedback(`${SCENES[id].title}: ${result.direction}`);
  }

  function reset() {
    setSession(createSession());
    setStarted(false);
    setFamily('suggestions');
    setShowAllTurns(false);
    setShowWhy(false);
    setProbeFeedback('');
  }

  if (!started) return <div className="clinic-page" dir="rtl">
    <header className="clinic-header"><span className="clinic-kicker">Meta Model Gym · G-Force</span><h2>הקליניקה: לגלות את המפה</h2></header>
    <Intro onBegin={() => setStarted(true)} />
  </div>;

  return <div className="clinic-page" dir="rtl">
    <header className="clinic-header">
      <div><span className="clinic-kicker">מקרה בדיוני · סימולציה ללא API</span><h2>🧩 הקליניקה: לגלות את המפה</h2></div>
      <button className="clinic-textbutton" type="button" onClick={reset}>התחל מקרה מחדש</button>
    </header>
    <ClinicStatusRail session={session} onAsk={answer} />
    <div className="clinic-layout">
      <div className="clinic-main">
        <section className="clinic-panel clinic-dialogue" aria-labelledby="clinic-chat-heading">
          <div className="clinic-heading-line"><h3 id="clinic-chat-heading">השיחה עם איתן</h3><span className="clinic-count">{session.turns.length} שאלות</span></div>
          {!latestTurn && <div className="clinic-patient-bubble"><div className="clinic-speaker">🧔🏻 איתן</div><p>{FICTIONAL_CASE.introduction}</p></div>}
          {previousTurns.length > 0 && <div className="clinic-history">
            <button type="button" className="clinic-textbutton" aria-expanded={showAllTurns} onClick={() => setShowAllTurns(value => !value)}>
              {showAllTurns ? 'סגור שיחה קודמת' : `הצג ${previousTurns.length} חילופי דברים קודמים`}
            </button>
            {showAllTurns && <div className="clinic-history-turns">
              {previousTurns.map(turn => <div key={turn.id} className="clinic-turn">
                <div className="clinic-therapist-bubble"><div className="clinic-speaker">🗣️ אתה · {FAMILY_LABELS[turn.family]}</div><p>{turn.question}</p></div>
                <div className="clinic-patient-bubble"><div className="clinic-speaker">🧔🏻 איתן</div><p>{turn.answer}</p></div>
                {turn.newlyRevealed && <div className="clinic-reveal">🃏 נחשף קלף חדש: {SCENES[turn.newlyRevealed].title}</div>}
              </div>)}
            </div>}
          </div>}
          {latestTurn && <div className="clinic-latest-exchange" key={latestTurn.id} ref={latestAnswerRef} data-testid="clinic-latest-answer">
            <div className="clinic-therapist-bubble"><div className="clinic-speaker">🗣️ שאלת עכשיו · {FAMILY_LABELS[latestTurn.family]}</div><p>{latestTurn.question}</p></div>
            <div className="clinic-patient-bubble clinic-reply-focus" role="status" aria-live="polite">
              <div className="clinic-speaker">🧔🏻 איתן עונה עכשיו</div><p>{latestTurn.answer}</p>
            </div>
            {latestTurn.newlyRevealed && <div className="clinic-reveal" role="status">🃏 נחשף קלף חדש: {SCENES[latestTurn.newlyRevealed].title}</div>}
          </div>}
          <div className="clinic-current" aria-live="polite">{session.turns.length ? 'מה כדאי לשאול עכשיו?' : 'בחר איך לפתוח את השיחה.'}</div>
          <div className="clinic-families" aria-label="משפחות שאלות">
            <button type="button" className={family === 'suggestions' ? 'is-active' : ''} onClick={() => setFamily('suggestions')}>לפי ההקשר</button>
            {FAMILIES.map(item => <button type="button" key={item} className={family === item ? 'is-active' : ''} onClick={() => setFamily(item)}>{FAMILY_ICONS[item]} {FAMILY_LABELS[item]}</button>)}
          </div>
          <div className="clinic-questions">{selectedQuestions.map(q => <button type="button" key={q.id} onClick={() => answer(q.id)}>
            <span className="clinic-question-family">{FAMILY_LABELS[q.family]}</span>
            <span>{q.label}</span><b aria-hidden="true">←</b>
          </button>)}</div>
          <details className="clinic-why" open={showWhy} onToggle={event => setShowWhy((event.currentTarget as HTMLDetailsElement).open)}>
            <summary>למה אין תשובה אחת נכונה?</summary>
            <p>השאלות נבדלות במה שהן מחפשות: חוויה חושית, רצף בזמן, מקור מחסום, מטרה, ערכים או יחסים. לפעמים כדאי להתעכב על נושא צדדי כדי לשמור על הקשר, ולפעמים כדאי לחזור למטרה.</p>
          </details>
        </section>
        <SceneStack session={session} onMove={(id, dir) => setSession(previous => moveScene(previous, id, dir))} onProbe={checkScene} />
        {probeFeedback && <p className="clinic-probe-feedback" role="status">{probeFeedback}</p>}
      </div>
      <aside className="clinic-sidebar clinic-summary-sidebar" aria-label="סיום השיחה">
        {session.turns.length >= 4 && <section className="clinic-panel clinic-exit">
          <h3>🧠 אפשר לעצור או להעמיק</h3>
          <p>אין חובה להגיע לכל הקלפים. אפשר לחזור לתמונה הסופית, לבדוק מוטיבציה או להמשיך את השיחה.</p>
          <div className="clinic-quick-questions">{ENDING_QUESTION.map(id => {
            const q = QUESTIONS.find(item => item.id === id)!;
            return <button type="button" key={id} onClick={() => answer(id)}>{q.label}</button>;
          })}</div>
        </section>}
      </aside>
    </div>
  </div>;
}
