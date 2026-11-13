import { useState } from 'react';
import {
  CERTAINTY_QUESTIONS,
  FRAME_AREAS,
  FRAME_DISCOVERIES,
  FRAME_PARTS,
  FRAME_TOPIC,
  certaintyBand,
  type FrameArea,
  type TopicKind,
} from '../../data/framingDemo';
import './framing-tool.css';

const choose = <T,>(items: readonly T[]): T => items[Math.floor(Math.random() * items.length)];
type MapItem = { id: string; certainty: number | null };
const fallbackQuestions = {
  problem: 'איזה חלק מהבעיה כדאי לנו להכיר יותר?',
  goal: 'מה צריך להיות נכון כדי שהמטרה הזאת תהיה אפשרית עבורך?',
  resource: 'מתי המשאב הזה מופיע בחיים שלך?',
};

export function FramingToolPage() {
  const [topic, setTopic] = useState<TopicKind>('problem');
  const [focus, setFocus] = useState<'event' | 'meaning' | 'action'>('event');
  const [activeArea, setActiveArea] = useState<FrameArea>('context');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [map, setMap] = useState<MapItem[]>([]);
  const [pending, setPending] = useState<string | null>(null);
  const [certaintyAsked, setCertaintyAsked] = useState(false);
  const [certaintyQuestion, setCertaintyQuestion] = useState(CERTAINTY_QUESTIONS[0]);
  const [showMap, setShowMap] = useState(false);
  const [showLegend, setShowLegend] = useState(false);
  const [showDirections, setShowDirections] = useState(false);
  const [decomposed, setDecomposed] = useState(false);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);

  const discoveries = FRAME_DISCOVERIES.filter((item) => item.area === activeArea);
  const candidate = discoveries.find((item) => !map.some((saved) => saved.id === item.id));
  const answered = FRAME_DISCOVERIES.filter((item) => map.some((saved) => saved.id === item.id));
  const activePending = FRAME_DISCOVERIES.find((item) => item.id === pending);
  const selectedDiscovery = FRAME_DISCOVERIES.find((item) => item.id === selectedItem);
  const selectedSave = map.find((item) => item.id === selectedItem);
  const percent = Math.round(100 * map.length / FRAME_DISCOVERIES.length);
  const complete = map.length === FRAME_DISCOVERIES.length;
  const [mapMode, setMapMode] = useState<"diagram" | "details">("diagram");

  const reset = (nextTopic: TopicKind) => {
    setTopic(nextTopic);
    setMap([]);
    setPending(null);
    setSelectedItem(null);
    setActiveArea('context');
    setFocus('event');
    setDecomposed(false);
    setQuestionIndex(0);
    setShowDirections(false);
  };

  const ask = () => {
    if (!candidate) return;
    setPending(candidate.id);
    setCertaintyAsked(false);
    setCertaintyQuestion(choose(CERTAINTY_QUESTIONS));
  };

  const store = (confidence: number | null) => {
    if (!activePending) return;
    const nextMap = [...map.filter((item) => item.id !== activePending.id), { id: activePending.id, certainty: confidence }];
    setMap(nextMap);
    setPending(null);
    setCertaintyAsked(false);
    setSelectedItem(activePending.id);
    setQuestionIndex((prev) => prev + 1);
    // Auto-advance: when this zone is finished, move on to the next zone that still has hidden parts.
    const isOpen = (area: FrameArea) => FRAME_DISCOVERIES.some((item) => item.area === area && !nextMap.some((saved) => saved.id === item.id));
    if (!isOpen(activeArea)) {
      const order = FRAME_AREAS.map((area) => area.id);
      const start = order.indexOf(activeArea);
      const next = [...order.slice(start + 1), ...order.slice(0, start)].find(isOpen);
      if (next) { setActiveArea(next); setQuestionIndex(0); }
    }
  };

  const sayItDifferently = () => setQuestionIndex((index) => index + 1);
  const currentQuestion = candidate?.questions[questionIndex % 3] ?? fallbackQuestions[topic];
  const groupSummary = FRAME_AREAS.map((area) => ({
    ...area, collected: answered.filter((item) => item.area === area.id).length,
    available: FRAME_DISCOVERIES.filter((item) => item.area === area.id).length,
  }));
  const changeArea = (area: FrameArea) => { setActiveArea(area); setPending(null); setSelectedItem(null); };
  const copyMap = () => {
    const lines = answered.map((item) => {
      const saved = map.find((entry) => entry.id === item.id);
      const kind = item.claimKind === 'said' ? 'נאמר במפורש' : item.claimKind === 'necessary' ? 'הנחת יסוד שאושרה' : item.claimKind === 'possible' ? 'השערה אפשרית' : 'לא מתיישב עם המפה';
      return `${item.category}: ${item.mapText} | ${kind} | ודאות: ${saved?.certainty ?? 'לא נבדקה'}`;
    });
    void navigator.clipboard?.writeText([`נושא: ${FRAME_TOPIC[topic].label}`, FRAME_TOPIC[topic].text, ...lines].join('\n'));
  };

  return (
    <div className="ft-page" dir="rtl">
      <header className="ft-head">
        <span className="ft-kicker">אימון קצר · פריימינג טול</span>
        <h2>לגלות את המפה</h2>
        <p>לא מאתגרים, לא מתקנים. שואלים ומגלים איך העולם נראה מתוך עיני האדם.</p>
      </header>

      <div className="ft-bar">
        <div className="ft-topic-options" aria-label="סוג הנושא">
          {(['problem', 'goal', 'resource'] as const).map((value) => (
            <button key={value} aria-pressed={topic === value} className={topic === value ? 'ft-active' : ''} onClick={() => reset(value)}>{FRAME_TOPIC[value].label}</button>
          ))}
        </div>
        <button className="ft-icon-button" onClick={() => setShowLegend((value) => !value)} aria-expanded={showLegend}>🎨 מקרא ודאות</button>
      </div>
      {showLegend && (
        <section className="ft-legend" aria-label="מקרא ודאות">
          <p><span className="ft-dot ft-high"/>8–10: ביטחון גבוה בעיני הדובר</p>
          <p><span className="ft-dot ft-medium"/>5–7: ביטחון בינוני</p>
          <p><span className="ft-dot ft-low"/>1–4: ביטחון נמוך</p>
          <p><span className="ft-dot ft-unknown"/>לא נבדק או רק השערה</p>
          <small>הצבע מסמן את מידת הביטחון של הדובר, לא את האמת העובדתית. סוג הטענה מופיע במילים.</small>
        </section>
      )}

      <section className="ft-center">
        <div className="ft-center-title"><span>הנושא במרכז</span><button onClick={() => setDecomposed((value) => !value)}>{decomposed ? 'סגור פירוק' : 'פרק משפט'}</button></div>
        <blockquote>{FRAME_TOPIC[topic].text}</blockquote>
        {decomposed && (
          <div className="ft-parts">
            {FRAME_PARTS.map((part) => (
              <button key={part.id} aria-pressed={focus === part.id} className={focus === part.id ? 'ft-active' : ''} onClick={() => { setFocus(part.id); setActiveArea(part.id === "event" ? "context" : part.id === "meaning" ? "west" : "north"); setPending(null); }}><strong>{part.label}</strong><span>{part.text}</span></button>
            ))}
            <small>הפירוק עוזר להתמקד ברכיב אחד. בתרגיל הזה תשובות המקרה קבועות מראש.</small>
          </div>
        )}
      </section>

      <section className="ft-reveal" aria-label="מפת הפריימינג">
        <div className="ft-reveal-heading">
          <div><strong>המפה מתגלה</strong><span>{map.length} מתוך {FRAME_DISCOVERIES.length} חלקים</span></div>
          <button onClick={() => setShowMap((value) => !value)} aria-expanded={showMap}>{showMap ? 'סגור מפה' : 'פתח מפה'} ◎</button>
        </div>
        <div className="ft-progress" role="progressbar" aria-label="חלקים שנחשפו" aria-valuenow={map.length} aria-valuemax={FRAME_DISCOVERIES.length}><span style={{ width: `${percent}%` }} /></div>
        {!showMap && <div className="ft-area-grid">
          {groupSummary.map((area) => (
            <button type="button" key={area.id} aria-pressed={activeArea === area.id} className={`ft-area ${activeArea === area.id ? 'ft-active' : ''}`} onClick={() => changeArea(area.id)}>
              <span className="ft-area-icon">{area.icon}</span><strong>{area.label}</strong><small>{area.collected}/{area.available}</small>
            </button>
          ))}
        </div>}
        {showMap && (
          <div className="ft-full-map" aria-label="המפה הנוכחית">
            <div className="ft-map-modes" role="group" aria-label="תצוגת מפה">
              <button className={mapMode === 'diagram' ? 'ft-active' : ''} onClick={() => setMapMode('diagram')}>מפת קשרים</button>
              <button className={mapMode === 'details' ? 'ft-active' : ''} onClick={() => setMapMode('details')}>כל הפרטים</button>
            </div>
            {mapMode === 'diagram' && (
              <div className="ft-diagram">
                <div className="ft-diagram-topic"><span>הנושא</span><strong>{FRAME_TOPIC[topic].label}</strong></div>
                <div className="ft-diagram-areas">
                  {groupSummary.map((area) => (
                    <button key={area.id} onClick={() => { changeArea(area.id); setShowMap(true); }} aria-pressed={activeArea === area.id} className={`ft-diagram-area${area.collected ? ' ft-discovered' : ''}${activeArea === area.id ? ' ft-active' : ''}`} aria-label={area.label + ' - ' + area.collected + ' פריטים'}>
                      <span>{area.icon}</span>
                      <strong>{area.label}</strong>
                      <small>{area.collected ? `${area.collected}/${area.available} נחשפו` : 'עדיין מוסתר'}</small>
                      {answered.filter((item) => item.area === area.id).slice(0, 2).map((item) => (
                        <em key={item.id}>{item.mapText}</em>
                      ))}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {mapMode === 'details' && <strong>המרכז: {FRAME_TOPIC[topic].label}</strong>}
            {mapMode === "details" && (answered.length === 0 ? <p>המפה ריקה. בחר אזור ולחץ על ״שאל שאלה״.</p> : answered.map((item) => {
              const value = map.find((entry) => entry.id === item.id);
              const band = certaintyBand(value?.certainty ?? null);
              return <button key={item.id} className={`ft-map-row ft-${band}`} onClick={() => { setSelectedItem(item.id); setActiveArea(item.area); }}>
                <span className={`ft-dot ft-${band}`} /><span><strong>{item.category}</strong><small>{item.mapText}</small></span><b>{value?.certainty ?? '?'}/10</b>
              </button>;
            }))}
            <button className="ft-copy" onClick={copyMap}>העתק את המפה</button>
          </div>
        )}
      </section>

      <section className="ft-workout" aria-live="polite">
        <div className="ft-workout-header">
          <div><span className="ft-kicker">{FRAME_AREAS.find((x) => x.id === activeArea)?.label}</span><h3>{candidate ? candidate.category : complete ? 'המפה הושלמה' : 'האזור הושלם'}</h3></div>
          <button onClick={sayItDifferently} disabled={!candidate || Boolean(pending)}>↻ ניסוח אחר</button>
        </div>
        {!pending && candidate && (
          <>
            <p className="ft-question">{currentQuestion}</p>
            <div className="ft-actions"><button className="ft-primary" onClick={ask}>שאל שאלה</button><button className="ft-secondary" onClick={() => setShowMap(true)}>◎ מפה</button></div>
          </>
        )}
        {!pending && !candidate && !complete && <p>כל החלקים באזור זה נחשפו. בחר אזור נוסף במפה.</p>}
        {!pending && complete && (
          <div className="ft-summary" aria-label="סיכום המפה">
            <strong>גילית את כל {FRAME_DISCOVERIES.length} חלקי המפה בנושא {FRAME_TOPIC[topic].label}</strong>
            <ul>
              {groupSummary.map((area) => (
                <li key={area.id}><span>{area.icon} {area.label}</span>{answered.filter((item) => item.area === area.id).map((item) => item.mapText).join(' · ')}</li>
              ))}
            </ul>
            <p>עכשיו, כשהמפה ברורה, אפשר לתרגל שאלות מטה־מודל בשיחה.</p>
            <div className="ft-actions">
              <a className="ft-primary" href="#conversation">המשך לאימון שיחה ←</a>
              <button className="ft-secondary" onClick={copyMap}>העתק את המפה</button>
            </div>
          </div>
        )}
        {activePending && (
          <div className="ft-response">
            <span>תשובת הדובר בדוגמה</span>
            <blockquote>{activePending.response}</blockquote>
            <small>סוג המידע: {activePending.claimKind === 'said' ? 'נאמר במפורש' : activePending.claimKind === 'necessary' ? 'הנחת יסוד שאושרה' : activePending.claimKind === 'possible' ? 'אפשרות / השערה' : 'לא מתיישב עם המפה'}</small>
            <p className="ft-certainty-question">{certaintyQuestion}</p>
            {!certaintyAsked ? (
              <div className="ft-actions"><button className="ft-primary" onClick={() => setCertaintyAsked(true)}>שאל על ודאות</button><button className="ft-secondary" onClick={() => store(null)}>דלג על ודאות</button></div>
            ) : (
              <>
                <div className="ft-certainty-answer"><span>תשובת הדובר:</span><strong>{activePending.certainty} מתוך 10</strong><small>זהו הביטחון שלו בטענה, לא ציון אמת.</small></div>
                <div className="ft-actions"><button className="ft-primary" onClick={() => store(activePending.certainty)}>הוסף למפה</button><button className="ft-secondary" onClick={() => store(null)}>השאר ללא דירוג</button></div>
              </>
            )}
          </div>
        )}
        {!pending && selectedDiscovery && selectedSave && (
          <div className="ft-last-added">
            <span className={`ft-dot ft-${certaintyBand(selectedSave.certainty)}`} />
            <div><strong>נוסף למפה: {selectedDiscovery.mapText}</strong><small>{selectedDiscovery.why} · ביטחון: {selectedSave.certainty ?? 'לא נבדק'}/10</small></div>
          </div>
        )}
      </section>

      <details className="ft-next">
        <summary>מה נוכל ללמוד מהמפה בשלב הבא?</summary>
        <p>אחרי שמבינים את האדם אפשר לבחור שאלת מטה־מודל שמתאימה למטרה ולהסכמה בשיחה. כאן עדיין לא מאתגרים טענות ולא מניחים שהמפה חייבת להשתנות.</p>
        <button onClick={() => setShowDirections((value) => !value)}>{showDirections ? 'הסתר כיוונים' : 'הצג כיוונים אפשריים'}</button>
        {showDirections && <p>למשל: לבחון באילו הקשרים הציפייה למענה חזקה יותר; לחקור את הקשר בין תחושת פגיעה להפסקת יוזמה; או לברר מה תיחשב הדדיות בעיני הדובר. אלה אפשרויות להמשך, לא אבחנות.</p>}
      </details>
      <p className="ft-footnote">דוגמה בדיונית מקורית, עם תגובות וציוני ודאות שהוגדרו מראש לצורכי לימוד. לא נאסף כאן מידע של מטופל אמיתי, ואין ציון אוטומטי ליכולת טיפולית.</p>
    </div>
  );
}
