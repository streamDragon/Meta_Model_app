import { useRef, useState } from 'react';
import { CONVERSATION_SCENARIOS } from '../../data/conversationScenarios';
import { CONVERSATION_SKILLS, type ConversationOption, type ConversationScenario } from '../../data/conversationSkills';
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
  const nextScenario = recommendScenario(learning);
  const start = (value: ConversationScenario) => {
    sessionId.current = crypto.randomUUID();
    advancing.current = false;
    setScenario(value); setTurnIndex(0); setResults([]); setSelected(null); setFirst(null);
    setDone(false); setDraft(''); setOptions(shuffle(value.turns[0].options));
  };
  const choose = (value: ConversationOption) => {
    if (selected) return;
    setSelected(value);
    setFirst((prev) => prev ?? value);
  };
  const next = () => {
    if (!scenario || !selected || !first || advancing.current) return;
    advancing.current = true;
    const nextResults = [...results, { skill: scenario.turns[turnIndex].skill, quality: first.quality }];
    setResults(nextResults);
    if (turnIndex + 1 === scenario.turns.length) {
      const result = complete({ id: sessionId.current, scenarioId: scenario.id, completedAt: Date.now(), results: nextResults, transfer: 'planned' });
      if (result.recorded) { addXP(result.xp); recordSession(); }
      setEarned(result.xp); setDone(true); setDraft('');
    } else {
      const index = turnIndex + 1;
      setTurnIndex(index); setOptions(shuffle(scenario.turns[index].options));
      setSelected(null); setFirst(null); setDraft('');
      advancing.current = false;
    }
  };
  if (!scenario) return (
    <div className="learning-page">
      <header className="learning-heading"><span className="learning-eyebrow">מהזיהוי אל השיחה</span><h2>אימון שיחה</h2><p>בחר תגובה, ראה כיצד היא עשויה להתקבל ותרגל ניסוח נוסף.</p></header>
      <div className="learning-featured card"><div><span className="learning-eyebrow">מומלץ עכשיו · כשלוש דקות</span><h3>{nextScenario.title}</h3><p>{nextScenario.context}</p></div><button className="btn btn-primary" onClick={() => start(nextScenario)}>התחל אימון מומלץ</button></div>
      <div className="learning-scenario-grid">
        {CONVERSATION_SCENARIOS.map((item) => <article className="card learning-scenario" key={item.id}><h3>{item.title}</h3><p>{item.principle}</p><span className="learning-muted">{item.turns.length} רגעים בשיחה</span><button className="btn btn-secondary" onClick={() => start(item)}>תרגל: {item.title}</button></article>)}
      </div>
      <p className="learning-muted">הסיטואציות והתגובות בדיוניות ונכתבו לצורכי למידה. המשוב מתייחס להקשר הנתון; בשיחה אמיתית בודקים עם האדם מה מתאים לו.</p>
    </div>
  );
  const turn = scenario.turns[turnIndex];
  return (
    <div className="learning-page">
      <header className="learning-heading"><span className="learning-eyebrow">אימון שיחה</span><h2>{scenario.title}</h2><p>{scenario.context}</p></header>
      {!done ? <>
        <div className="learning-turn-meta"><span>רגע {turnIndex + 1} מתוך {scenario.turns.length}</span><span>{CONVERSATION_SKILLS.find((s) => s.id === turn.skill)?.title}</span></div>
        <article className="card learning-dialogue">
          {turnIndex === 0 && <blockquote>{scenario.opening}</blockquote>}
          <h3>{turn.prompt}</h3>
          <details className="learning-draft"><summary>נסה קודם ניסוח משלך</summary><label htmlFor="conversation-draft">התגובה שלך (לא נשמרת ולא מקבלת ציון אוטומטי)</label><textarea id="conversation-draft" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="משפט אחד, במילים שלך…" /><p className="learning-muted">לאחר הבחירה, השווה את הניסוח שלך לעיקרון שבמשוב.</p></details>
          <div className="learning-options" role="group" aria-label="תגובות אפשריות">
            {options.map((value) => <button key={value.id} type="button" className={`learning-option ${selected?.id === value.id ? 'is-chosen' : ''}`} disabled={selected !== null} onClick={() => choose(value)}>{value.text}</button>)}
          </div>
        </article>
        {selected && <section className={`card learning-feedback learning-feedback-${selected.quality}`} aria-live="polite">
          <h3>{selected.quality === 'helpful' ? 'מתאים להקשר הזה' : selected.quality === 'mixed' ? 'יש כאן כיוון — כדאי לדייק את התזמון' : 'כדאי לבחור תגובה אחרת'}</h3>
          <p>{selected.feedback}</p><p className="learning-muted">תגובה אפשרית בתרגיל:</p><blockquote>{selected.reply}</blockquote>
          <div className="learning-actions">{selected.quality !== 'helpful' && <button className="btn btn-secondary" onClick={() => setSelected(null)}>נסה תגובה נוספת</button>}<button className="btn btn-primary" onClick={next}>{turnIndex + 1 === scenario.turns.length ? 'סכם את האימון' : 'לרגע הבא בשיחה'}</button></div>
          <p className="learning-muted">במעקב נרשמת הבחירה הראשונה. ניסיון נוסף עוזר ללמוד.</p>
        </section>}
        <button className="btn btn-secondary" onClick={() => { setScenario(null); setDraft(''); }}>עזוב את האימון</button>
      </> : <section className="card learning-complete" aria-live="polite">
        <span className="learning-eyebrow">האימון הושלם</span><h3>מה תיקח לשיחה הבאה?</h3><p>{scenario.transferCue}</p>
        <p>{results.filter((r) => r.quality === 'helpful').length} מתוך {results.length} בחירות ראשונות התאימו להקשר.</p>
        <p className="learning-muted">{earned ? `נוספו ${earned} נקודות תרגול.` : 'אפשר להמשיך להתאמן; נקודות על הסיטואציה ניתנות פעם ביום.'} זהו משוב לימודי, לא מדד ליכולת טיפולית.</p>
        <div className="learning-actions"><button className="btn btn-primary" onClick={() => { setScenario(null); window.location.hash = 'home'; }}>לתוכנית התרגול שלי</button><button className="btn btn-secondary" onClick={() => setScenario(null)}>בחר אימון נוסף</button></div>
      </section>}
      {!stored && <p role="alert">הדפדפן לא אפשר לשמור את המעקב. הוא זמין כרגע עד סגירת העמוד.</p>}
    </div>
  );
}
