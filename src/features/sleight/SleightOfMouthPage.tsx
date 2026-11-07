import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CHALLENGE_FAMILIES,
  CONVERSATION_CASES,
  DIALOGUE_MOVES,
  movesFor,
  type DialogueMove,
  type FamilyId,
  type MoveId,
  type MoveSystem,
  type Tone,
} from '../../data/sleightConversation';
import {
  readyToChallenge,
  repairConnection,
  simulateChallenge,
  simulatedChange,
  type SimulatedState,
} from './simulation';
import './sleight-of-mouth.css';
import { BeliefDiagram } from './DiltsBeliefMap';

type Phase = 'clarify' | 'challenge' | 'complete';
type DialogueEntry = { id: number; speaker: 'person' | 'trainee' | 'coach'; text: string; pattern?: string };
const toneOptions: { id: Tone; label: string; note: string }[] = [
  { id: 'joining', label: 'רך', note: 'מכיר בחוויה קודם' },
  { id: 'direct', label: 'ישיר', note: 'בוחן את הטענה' },
  { id: 'sharp', label: 'נוקב', note: 'מאתגר בחדות, מסכן את הקשר' },
];
const systems: { id: MoveSystem; label: string; count: number }[] = [
  { id: 'dilts', label: 'דילטס', count: 14 },
  { id: 'mindlines', label: 'Mind-Lines', count: 7 },
];
const maxRounds = 21;

function suggestedLine(move: DialogueMove, caseIndex: number, tone: Tone): string {
  const base = move.sample[caseIndex];
  if (tone === 'sharp') {
    return `אז רגע, די בכך ש${CONVERSATION_CASES[caseIndex].observable} כדי לקבוע ש${CONVERSATION_CASES[caseIndex].inference}? ${base}`;
  }
  if (tone === 'joining' && !base.startsWith('אני') && !base.startsWith('נשמע')) {
    return `אני שומע כמה זה חשוב לך. ${base}`;
  }
  return base;
}

function initialModel(index: number): SimulatedState {
  return { ...CONVERSATION_CASES[index].baseline, turns: 0, pressure: 0 };
}

function ScoreBar({
  title, value, hint, inverse = false, stale = false,
}: { title: string; value: number; hint: string; inverse?: boolean; stale?: boolean }) {
  return (
    <div className={'som-gauge' + (stale ? ' som-gauge-stale' : '')}>
      <div className="som-gauge-header"><strong>{title}</strong><b>{value}<small>/10</small></b></div>
      <div className="som-gauge-track" role="meter" aria-label={title} aria-valuemin={0} aria-valuemax={10} aria-valuenow={value}>
        <span className={inverse ? 'som-gauge-fill inverse' : 'som-gauge-fill'} style={{ width: `${value * 10}%` }} />
      </div>
      <small className="som-gauge-hint">{hint}</small>
    </div>
  );
}

function PatternMap({
  used, belief, conviction, certainties, caseIndex, onChooseMove, onClose,
}: {
  used: readonly MoveId[];
  belief: string | null;
  conviction: number;
  certainties: Partial<Record<MoveId, number>>;
  caseIndex: number;
  onChooseMove?: (move: DialogueMove) => void;
  onClose: () => void;
}) {
  return (
    <div className="som-scrim" onClick={onClose}>
      <div className="som-map-dialog" role="dialog" aria-modal="true" aria-label="מפת זריזות לשון" onClick={(event) => event.stopPropagation()}>
        <div className="som-modal-top">
          <div><small>תרשים מהלכים אינטראקטיבי</small><h2>מפת זריזות לשון של דילטס</h2></div>
          <button type="button" aria-label="סגור מפה" className="som-icon-button" onClick={onClose}>✕</button>
        </div>
        <BeliefDiagram
          belief={belief}
          conviction={conviction}
          used={used}
          certainties={certainties}
          caseIndex={caseIndex}
          onChoose={onChooseMove ? (move) => {onChooseMove(move);onClose();} : undefined}
        />
        <div className="som-map-footer">
          <p>אותו תרשים, אבל אינטראקטיבי: לוחצים על תבנית וקוראים דוגמה. צבע מסמן רמת ודאות בלבד.</p>
          <button className="btn btn-secondary" type="button" onClick={onClose}>בחזרה לשיחה</button>
        </div>
      </div>
    </div>
  );
}

function Introduction({ onStart, onMap }: { onStart: () => void; onMap: () => void }) {
  return (
    <div className="som-scrim">
      <div className="som-intro" role="dialog" aria-modal="true" aria-label="איך מתרגלים זריזות לשון">
        <div className="som-intro-eyebrow">זריזות לשון · אימון שיחה</div>
        <h2>אדם מספר. אתה מברר. ואז מאתגר.</h2>
        <p>המטרה אינה לשנות מילה במשפט. אתה עובד עם אמונה שגילית מתוך סיפור, ושוב ושוב בוחר תנועה אחרת מסביבה.</p>
        <div className="som-intro-path">
          <div><span>01</span><b>מקרה</b><small>הקשבה ובירור במטה־מודל</small></div>
          <div><span>02</span><b>אמונה</b><small>משפט מרכזי שחוזרים אליו</small></div>
          <div><span>03</span><b>מהלכים</b><small>14 דילטס + 7 כיווני Mind-Lines</small></div>
        </div>
        <p className="som-intro-caption">אחרי כל מהלך הדמות מגיבה. אפשר למדוד שינוי בהרגשה, בביטחון באמונה ובאפשרויות שהיא רואה. לפעמים האמונה דווקא מתחזקת או השיחה מתפוצצת.</p>
        <div className="som-intro-actions">
          <button className="btn btn-primary" type="button" onClick={onStart}>התחל מקרה</button>
          <button className="btn btn-secondary" type="button" onClick={onMap}>הצג את המפה</button>
        </div>
      </div>
    </div>
  );
}

function Dialogue({
  items,
  speaker,
}: {
  items: readonly DialogueEntry[];
  speaker: string;
}) {
  const logRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [items.length]);
  return (
    <div ref={logRef} className="som-dialogue" role="log" aria-label="הדיאלוג עם הדמות" aria-live="polite">
      {items.map((message) => (
        <div key={message.id} className={'som-bubble som-bubble-' + message.speaker}>
          <small>{message.speaker === 'person' ? speaker : message.speaker === 'trainee' ? 'אתה · המתאמן' : 'מנחה התרגיל'}</small>
          <p>{message.text}</p>
          {message.pattern && <small className="som-bubble-pattern">{message.pattern}</small>}
        </div>
      ))}
    </div>
  );
}

export function SleightOfMouthPage() {
  const [caseIndex, setCaseIndex] = useState(0);
  const currentCase = CONVERSATION_CASES[caseIndex];
  const [phase, setPhase] = useState<Phase>('clarify');
  const [asked, setAsked] = useState<string[]>([]);
  const [messages, setMessages] = useState<DialogueEntry[]>([{ id: 1, speaker: 'person', text: CONVERSATION_CASES[0].story }]);
  const [used, setUsed] = useState<MoveId[]>([]);
  const [system, setSystem] = useState<MoveSystem>('dilts');
  const [family, setFamily] = useState<FamilyId>('criteria');
  const [chosenMove, setChosenMove] = useState<MoveId | null>(null);
  const [tone, setTone] = useState<Tone>('joining');
  const [draft, setDraft] = useState('');
  const [state, setState] = useState<SimulatedState>(() => initialModel(0));
  const [calibrated, setCalibrated] = useState<SimulatedState>(() => initialModel(0));
  const [needsCalibration, setNeedsCalibration] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const [showMap, setShowMap] = useState(false);
  const [certaintyByMove, setCertaintyByMove] = useState<Partial<Record<MoveId, number>>>({});
  const [lastMoveId, setLastMoveId] = useState<MoveId | null>(null);
  const composeRef = useRef<HTMLDivElement>(null);
  const [explosion, setExplosion] = useState(false);
  const [workshopStep, setWorkshopStep] = useState<number | null>(null);
  const [lastShift, setLastShift] = useState<'open' | 'mixed' | 'resist' | 'rupture' | null>(null);
  const hasBelief = readyToChallenge(asked);

  const availableMoves = useMemo(() => movesFor(family, system), [family, system]);
  const selectedMove: DialogueMove | undefined = chosenMove ? DIALOGUE_MOVES.find((move) => move.id === chosenMove) : undefined;
  const progressText = `${used.length} / ${maxRounds}`;
  const latestPersonMessage = messages.length > 1 ? [...messages].reverse().find((entry) => entry.speaker === 'person') : null;

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (workshopStep !== null) return;
        setShowMap(false);
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [workshopStep]);

  const addMessages = useCallback((items: Omit<DialogueEntry, 'id'>[]) => {
    setMessages((previous) => [
      ...previous,
      ...items.map((item, index) => ({ ...item, id: previous.length + index + 1 })),
    ]);
  }, []);

  function resetCase(index: number) {
    const next = CONVERSATION_CASES[index];
    setCaseIndex(index);
    setPhase('clarify');
    setAsked([]);
    setMessages([{ id: 1, speaker: 'person', text: next.story }]);
    setUsed([]);
    setSystem('dilts');
    setFamily('criteria');
    setChosenMove(null);
    setDraft('');
    setTone('joining');
    setState(initialModel(index));
    setCalibrated(initialModel(index));
    setNeedsCalibration(false);
    setExplosion(false);
    setWorkshopStep(null);
    setLastShift(null);
    setLastMoveId(null);
    setCertaintyByMove({});
  }

  function askQuestion(id: string) {
    const question = currentCase.questions.find((q) => q.id === id);
    if (!question || asked.includes(id) || explosion) return;
    setAsked((list) => [...list, id]);
    addMessages([
      { speaker: 'trainee', text: question.question, pattern: 'מטה־מודל · ' + question.role },
      { speaker: 'person', text: question.response },
    ]);
  }

  function chooseMove(move: DialogueMove) {
    setChosenMove(move.id);
    setDraft(suggestedLine(move, caseIndex, tone));
  }

  useEffect(() => {
    if (chosenMove && composeRef.current && typeof composeRef.current.scrollIntoView === 'function') {
      composeRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [chosenMove]);

  function changeTone(next: Tone) {
    setTone(next);
    if (selectedMove) setDraft(suggestedLine(selectedMove, caseIndex, next));
  }

  function challenge() {
    if (!selectedMove || !draft.trim() || explosion || phase !== 'challenge') return;
    const result = simulateChallenge(state, selectedMove, tone);
    setState(result.next);
    setNeedsCalibration(true);
    setLastShift(result.reaction);
    setUsed((previous) => previous.includes(selectedMove.id) ? previous : [...previous, selectedMove.id]);
    setLastMoveId(selectedMove.id);
    addMessages([
      { speaker: 'trainee', text: draft.trim(), pattern: selectedMove.title + ' · ' + (tone === 'joining' ? 'רך' : tone === 'direct' ? 'ישיר' : 'נוקב') },
      { speaker: 'person', text: currentCase.reactions[result.reaction === 'rupture' ? 'rupture' : result.reaction] },
    ]);
    if (result.reaction === 'rupture') {
      setExplosion(true);
    }
    setChosenMove(null);
    setDraft('');
  }

  function askCalibration() {
    if (phase !== 'challenge' || explosion) return;
    const change = simulatedChange(calibrated, state);
    const say = needsCalibration
      ? `אני מרגיש ${state.feeling}/10 מבחינת נוחות לדבר על זה. לגבי המשפט המקורי אני בטוח ${state.conviction}/10, ואני רואה כרגע ${state.choices}/10 אפשרויות טובות.`
      : `אני עדיין מרגיש בערך כמו קודם: ${state.feeling}/10 בנוחות, ${state.conviction}/10 בוודאות, ו-${state.choices}/10 באפשרויות.`;
    addMessages([
      { speaker: 'trainee', text: 'איך אתה מרגיש עכשיו? עד כמה אתה בטוח שהאמונה המקורית נכונה, וכמה אפשרויות טובות פתוחות לך?', pattern: 'קליברציה' },
      { speaker: 'person', text: say + (needsCalibration && change.conviction > 0 ? ' האמת היא שעכשיו אני אפילו יותר מחזיק בה.' : '') },
    ]);
    if (needsCalibration && lastMoveId) {
      setCertaintyByMove((previous) => ({ ...previous, [lastMoveId]: state.conviction }));
    }
    setCalibrated({ ...state });
    setNeedsCalibration(false);
  }

  function repair() {
    const repaired = repairConnection(state);
    setState(repaired);
    setNeedsCalibration(true);
    setExplosion(false);
    setWorkshopStep(null);
    setTone('joining');
    addMessages([
      { speaker: 'trainee', text: 'עצור. ניסיתי לשכנע מהר מדי. חשוב לי קודם להבין מה פגע בך. אני לא מתווכח עם מה שחווית.', pattern: 'תיקון קשר' },
      { speaker: 'person', text: currentCase.reactions.repair },
    ]);
  }

  return (
    <div className="som-simulator" dir="rtl">
      <header className="som-heading">
        <div>
          <span className="som-eyebrow">אייקידו תקשורתי · סימולטור שיחה</span>
          <h2>זריזות לשון</h2>
          <p>מהלך אחד מול אמונה אחת, שוב ושוב. אתה מנסה לפתוח אפשרויות, והדמות לא חייבת להסכים.</p>
        </div>
        <button type="button" className="som-map-launch" onClick={() => setShowMap(true)} aria-label="פתח מפה חזותית של זריזות לשון">
          <span className="som-map-mini som-flow-symbol" aria-hidden="true">▭→◇→▭</span>
          <span>מפת המהלכים <b>{progressText}</b></span>
        </button>
      </header>

      <div className="som-case-picker" role="group" aria-label="בחר מקרה שיחה">
        {CONVERSATION_CASES.map((item, index) => (
          <button type="button" key={item.id} aria-pressed={caseIndex === index} className={'som-case-btn' + (caseIndex === index ? ' active' : '')} onClick={() => resetCase(index)}>
            {item.title}
          </button>
        ))}
        <button type="button" className="som-help-btn" onClick={() => setShowIntro(true)}>איך מתרגלים?</button>
      </div>

      <div className="som-main">
        <div className="som-main-column">
          <section className="som-panel som-conversation-panel">
            <div className="som-panel-header">
              <div>
                <small>{currentCase.context} · {currentCase.speaker}</small>
                <h3>{phase === 'clarify' ? 'הסיפור שמגיע אליך' : 'השיחה ממשיכה'}</h3>
              </div>
              <span className="som-stage">{phase === 'clarify' ? 'שלב 1 · בירור' : phase === 'challenge' ? 'שלב 2 · אתגור' : 'סיכום'}</span>
            </div>
            <Dialogue items={messages} speaker={currentCase.speaker} />
          </section>

          {phase === 'clarify' && (
            <section className="som-panel som-work-panel">
              <div className="som-panel-header"><h3>איזו שאלה תשאל?</h3><small>בוחרים שאלה אחת בכל פעם</small></div>
              {latestPersonMessage && <div className="som-latest-reply" role="status"><small>התשובה האחרונה של {currentCase.speaker}</small><p>{latestPersonMessage.text}</p></div>}
              <div className="som-meta-options">
                {currentCase.questions.map((question) => (
                  <button
                    type="button"
                    key={question.id}
                    className={'som-question' + (asked.includes(question.id) ? ' asked' : '')}
                    disabled={asked.includes(question.id)}
                    onClick={() => askQuestion(question.id)}
                  >
                    <span aria-hidden="true">{asked.includes(question.id) ? '✓' : '؟'}</span>
                    {question.question}
                  </button>
                ))}
              </div>
              {hasBelief && (
                <div className="som-unlocked" role="status">
                  <small>האמונה נחשפה מתוך דברי הדמות</small>
                  <strong>״{currentCase.coreBelief}״</strong>
                  <button type="button" className="btn btn-primary" onClick={() => setPhase('challenge')}>נתחיל את מהלכי זריזות הלשון</button>
                </div>
              )}
              {!hasBelief && <p className="som-hint-inline">כדי להגיע לאמונה מרכזית, ברר לפחות שתי שאלות, ובהן: ״מה זה אומר לך?״</p>}
            </section>
          )}

          {phase !== 'clarify' && (
            <>
              <section className="som-belief-anchor" aria-label="האמונה המרכזית">
                <div>
                  <small>האמונה המרכזית · חוזרים אליה אחרי כל מהלך</small>
                  <strong>״{currentCase.coreBelief}״</strong>
                  <span>{lastShift === 'resist' || lastShift === 'rupture' ? 'כרגע האמונה אפילו מתחזקת' : lastShift === 'open' ? 'אולי נוצר סדק בפירוש' : 'עדיין בודקים את האמונה'}</span>
                </div>
                <div className="som-anchor-count"><b>{used.length}</b><small>מהלכים שונים</small></div>
              </section>

              {phase === 'challenge' && (
                <section className="som-panel som-work-panel">
                  <div className="som-panel-header">
                    <div><small>שלב 2 · אתגור רוחבי</small><h3>בחר סוג אתגור</h3></div>
                    <button type="button" className="som-text-btn" onClick={() => setShowMap(true)}>מפת המהלכים ◈</button>
                  </div>
                  {latestPersonMessage && <div className="som-latest-reply" role="status"><small>התשובה האחרונה של {currentCase.speaker}</small><p>{latestPersonMessage.text}</p></div>}
                  <BeliefDiagram
                    belief={currentCase.coreBelief}
                    conviction={calibrated.conviction}
                    used={used}
                    certainties={certaintyByMove}
                    caseIndex={caseIndex}
                    selectedId={chosenMove}
                    onChoose={(move) => {setFamily(move.family);setSystem(move.system);chooseMove(move);}}
                  />
                  <details className="som-extra-picker">
                    <summary>הצג גם רשימת תבניות לפי סוג אתגור</summary>
                    <div className="som-families" role="group" aria-label="שלוש משפחות של מהלכי אתגור">
                      {CHALLENGE_FAMILIES.map((entry) => (
                        <button type="button" key={entry.id} className={'som-family-card som-family-' + entry.id + (family === entry.id ? ' selected' : '')} aria-pressed={family === entry.id} onClick={() => {setFamily(entry.id);setChosenMove(null);}}>
                          <span className="som-family-symbol">{entry.icon}</span>
                          <strong>{entry.title}</strong>
                          <small>{entry.question}</small>
                        </button>
                      ))}
                    </div>
                    <div className="som-system-switch" role="group" aria-label="שיטת המסגור">
                      {systems.map((item) => (
                        <button type="button" key={item.id} aria-pressed={system === item.id} className={system === item.id ? 'selected' : ''} onClick={() => {setSystem(item.id);setChosenMove(null);}}>
                          {item.label} <small>{item.count}</small>
                        </button>
                      ))}
                    </div>
                    <div className="som-pattern-grid" aria-label="בחירת מהלך">
                      {availableMoves.map((item) => (
                        <button type="button" key={item.id} aria-label={item.title + ' ' + item.direction} aria-pressed={chosenMove === item.id} className={'som-pattern' + (chosenMove === item.id ? ' active' : '')} onClick={() => chooseMove(item)}>
                          <span>{used.includes(item.id) ? '✓' : '◌'}</span><strong>{item.title}</strong><small>{item.direction}</small>
                        </button>
                      ))}
                    </div>
                  </details>

                  {selectedMove && (
                    <div ref={composeRef} className="som-compose">
                      <div className="som-compose-heading"><small>המהלך שבחרת</small><strong>{selectedMove.title}</strong></div>
                      <label htmlFor="som-trainee-line">מה תגיד לדמות?</label>
                      <textarea id="som-trainee-line" value={draft} onChange={(event) => setDraft(event.target.value)} rows={3} />
                      <p>בחר את עוצמת האתגור. הניסוח שלך יוצג בשיחה, אך התגובה המדומה מחושבת לפי סוג המהלך והעוצמה, לא על ידי הבנת הטקסט.</p>
                      <div className="som-tone-options" role="group" aria-label="עוצמת האתגור">
                        {toneOptions.map((item) => (
                          <button key={item.id} type="button" aria-label={item.label + ' ' + item.note} className={tone === item.id ? 'selected' : ''} aria-pressed={tone === item.id} onClick={() => changeTone(item.id)}>
                            <b>{item.label}</b><small>{item.note}</small>
                          </button>
                        ))}
                      </div>
                      <button className="btn btn-primary" type="button" disabled={!draft.trim()} onClick={challenge}>אמור את המשפט</button>
                    </div>
                  )}
                  {!selectedMove && <p className="som-hint-inline">גע באחת התבניות בתרשים, קרא את הדוגמה ולחץ ״בחר את המהלך לשיחה״.</p>}

                  <div className="som-after-turn">
                    <button type="button" onClick={askCalibration} className="btn btn-secondary">איך אתה מרגיש עכשיו? · קליברציה</button>
                    <button type="button" className="som-text-btn" onClick={() => setPhase('complete')}>סיום וסיכום</button>
                  </div>
                  <details className="som-more-questions">
                    <summary>חסר מידע? אפשר להמשיך לשאול מטה־מודל</summary>
                    <div className="som-meta-options">
                      {currentCase.questions.filter((question) => !asked.includes(question.id)).map((question) => (
                        <button type="button" className="som-question" key={question.id} onClick={() => askQuestion(question.id)}>{question.question}</button>
                      ))}
                      {asked.length === currentCase.questions.length && <small>שאלת את כל שאלות הבירור של המקרה הזה.</small>}
                    </div>
                  </details>
                </section>
              )}

              {phase === 'complete' && (
                <section className="som-panel som-complete">
                  <small>סיכום האימון</small>
                  <h3>מה השתנה במשפט המרכזי?</h3>
                  <p>ניסית {state.turns} מהלכי שיחה, מהם {used.length} שונים. השתמשת במפה כדי לבחור תנועה ולא רק לענות מתוך אינסטינקט.</p>
                  <div className="som-complete-actions">
                    <button className="btn btn-primary" type="button" onClick={() => setPhase('challenge')}>עוד סיבוב על אותה אמונה</button>
                    <button className="btn btn-secondary" type="button" onClick={() => resetCase((caseIndex + 1) % CONVERSATION_CASES.length)}>מקרה חדש</button>
                    <button className="btn btn-secondary" type="button" onClick={() => setShowMap(true)}>צפה במפה שהתמלאה</button>
                  </div>
                </section>
              )}
            </>
          )}
        </div>

        <aside className="som-side-column">
          <section className="som-panel som-calibration">
            <div className="som-panel-header">
              <h3>קליברציה</h3>
              <small>דיווח הדמות בסימולציה</small>
            </div>
            <ScoreBar title="מצב רגשי" value={calibrated.feeling} hint="0 = מוצף · 10 = נוח ובטוח" stale={needsCalibration} />
            <ScoreBar title="ודאות באמונה" value={calibrated.conviction} inverse hint="0 = לא בטוח · 10 = בטוח לגמרי" stale={needsCalibration} />
            <ScoreBar title="אפשרויות טובות" value={calibrated.choices} hint="0 = לא רואה · 10 = אפשרויות רבות" stale={needsCalibration} />
            {needsCalibration && <p className="som-calibration-pending">המדדים מציגים את הדיווח האחרון. שאל שוב כדי לגלות אם משהו השתנה.</p>}
            {phase === 'challenge' && !explosion && <button type="button" className="som-calibrate-btn" onClick={askCalibration}>שאל את שלוש השאלות</button>}
          </section>

          <section className="som-panel som-fact-map">
            <h3>מה יודעים עד עכשיו?</h3>
            <div><small>אירוע</small><p>{asked.includes('details') ? currentCase.observable : 'עדיין לא ביררנו את הפרטים'}</p></div>
            <div><small>פירוש</small><p>{asked.includes('meaning') ? currentCase.inference : 'עדיין לא ביררנו מה האירוע אומר לאדם'}</p></div>
            <div><small>מה חשוב לו</small><p>{asked.includes('value') ? currentCase.protect : 'עוד לא שאלנו על הרצון שמאחורי האמירה'}</p></div>
          </section>
        </aside>
      </div>

      <p className="som-disclaimer">זהו משחק תרגול לשוני עם דמות ותוצאות מדומות, לא אדם אמיתי, לא מדידת רגש אוטומטית ולא טיפול נפשי. האפקט של מהלך בשיחה אמיתית אינו צפוי מראש, והסכמה וגבולות חשובים יותר מניצחון בוויכוח.</p>

      {showMap && <PatternMap used={used} belief={hasBelief ? currentCase.coreBelief : null} conviction={calibrated.conviction} certainties={certaintyByMove} caseIndex={caseIndex} onChooseMove={phase === 'challenge' ? (move) => {setFamily(move.family);setSystem(move.system);chooseMove(move);} : undefined} onClose={() => setShowMap(false)} />}

      {showIntro && !explosion && (
        <Introduction
          onStart={() => setShowIntro(false)}
          onMap={() => { setShowIntro(false); setShowMap(true); }}
        />
      )}

      {explosion && workshopStep === null && (
        <div className="som-scrim">
          <div className="som-rupture" role="alertdialog" aria-modal="true" aria-label="פיצוץ בשיחה">
            <span className="som-rupture-icon">⚡</span>
            <small>נקודת מפנה · פיצוץ בקשר</small>
            <h2>הדמות הפסיקה לשתף פעולה</h2>
            <p>״{currentCase.reactions.rupture}״</p>
            <p>לא ממשיכים באתגור כאילו לא קרה דבר. אפשר לנסות לתקן את הקשר כאן, או לעבור לסדנת פיצוצים קצרה.</p>
            <div className="som-rupture-actions">
              <button className="btn btn-primary" type="button" onClick={repair}>תיקון הקשר כאן</button>
              <button className="btn btn-secondary" type="button" onClick={() => setWorkshopStep(0)}>לסדנת פיצוצים</button>
            </div>
          </div>
        </div>
      )}

      {workshopStep !== null && (
        <div className="som-scrim">
          <div className="som-rupture som-workshop" role="dialog" aria-modal="true" aria-label="סדנת פיצוצים">
            <small>סדנת פיצוצים · טעימה ראשונית</small>
            <h2>{['עוצרים את ההתנצחות', 'מכירים בפגיעה', 'מבקשים רשות להמשיך'][workshopStep]}</h2>
            <p>{[
              'כשהאדם נסגר, לא מחפשים טיעון מוצלח יותר. קודם מפסיקים ללחוץ.',
              'אפשר לומר: ״נראה שדחפתי אותך למקום לא נעים. אני רוצה להבין מה היה קשה בשיחה הזאת.״',
              'אפשר לשאול: ״האם מתאים לך שנמשיך להבין את זה יחד, או שנעצור כרגע?״ תשובה של ״לא״ היא אפשרות לגיטימית.',
            ][workshopStep]}</p>
            <div className="som-rupture-actions">
              {workshopStep < 2
                ? <button className="btn btn-primary" type="button" onClick={() => setWorkshopStep(workshopStep + 1)}>לצעד הבא</button>
                : <button className="btn btn-primary" type="button" onClick={repair}>להחזיר קשר ולהמשיך</button>}
              <button type="button" className="btn btn-secondary" onClick={() => { setWorkshopStep(null); setExplosion(false); setPhase('complete'); }}>לעצור את השיחה</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
