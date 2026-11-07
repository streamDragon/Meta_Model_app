import { useState } from 'react';
import {
  CORE_CASE, SLEIGHT_FAMILIES, SLEIGHT_PATTERNS,
  type SleightPattern,
} from '../../data/sleightOfMouth';
import './sleight-workshop.css';

type View = 'practice' | 'rupture';
type RuptureKind = 'attack' | 'stuck' | 'withdrawal' | 'overjoin' | 'flood';
type Move = 'name' | 'validate' | 'own' | 'ask' | 'pause' | 'push' | 'interpret';

const RUPTURES: Record<RuptureKind, {
  title: string;
  speech: string;
  explanation: string;
  best: Move[];
  choices: { id: Move; name: string; say: string; reply: string; why: string }[];
}> = {
  attack: {
    title: 'התקפה גלויה',
    speech: 'די! אתה לא מפסיק לתקוף אותי. אמרתי לך כבר שזה עניין של כבוד!',
    explanation: 'האדם חווה את האתגור כהתקפה. אפשר לתקן את התהליך בלי להכריע מיד בוויכוח.',
    best: ['name', 'own', 'validate'],
    choices: [
      { id: 'name', name: 'לקרוא למה שקורה', say: 'אני שומע שהשאלות שלי נחוות כהתקפה. זה לא מה שהתכוונתי, אבל חשוב לי להבין את זה.', reply: 'כן. הרגשתי שאתה מנסה להוכיח שאני טועה.', why: 'מכיר בקרע ומזמין מידע על חוויית האדם.' },
      { id: 'own', name: 'לקחת אחריות', say: 'התקדמתי מהר מדי עם האתגור. הייתי צריך לבדוק איתך אם זה מתאים.', reply: 'טוב שאתה אומר את זה. זה באמת היה יותר מדי.', why: 'אחריות על המהלך, בלי לדרוש מהאדם לוותר על עמדתו.' },
      { id: 'push', name: 'עוד אתגור', say: 'אבל אתה רואה שגם אתה תוקף אותי עכשיו?', reply: 'עזוב, אין לי כוח לדבר על זה.', why: 'החלה עצמית בשיא עימות עלולה להיות מלכודת ולהחריף את הקרע.' },
    ],
  },
  stuck: {
    title: 'אין התקדמות',
    speech: 'אתה אומר לי דברים שאני כבר יודע. כל השאלות האלה לא מקדמות אותי לשום מקום.',
    explanation: 'ייתכן שנוצר חוסר הסכמה על מטרת השיחה או על הדרך, לא התנגדות לאדם עצמו.',
    best: ['ask', 'own', 'name'],
    choices: [
      { id: 'ask', name: 'לנהל משא ומתן על המטרה', say: 'אתה צודק שצריך לבדוק אם זה מועיל. מה ייחשב מבחינתך להתקדמות היום?', reply: 'לצאת עם דרך לדבר איתו בלי מריבה. זה מה שאני צריך.', why: 'מחליפים חקירה שחוזרת על עצמה במטרה מוסכמת ומדידה.' },
      { id: 'own', name: 'להכיר בחוסר התאמה', say: 'נשארנו יותר מדי זמן בבירור. בוא נבדוק אם מתאים לשנות את השיטה.', reply: 'כן, אני רוצה משהו מעשי.', why: 'מתקנים את בחירת המשימה במקום להתגונן.' },
      { id: 'interpret', name: 'לפרש את ההתנגדות', say: 'עצם זה שאתה אומר שאין התקדמות מוכיח שאתה מפחד משינוי.', reply: 'אתה אפילו לא מקשיב למה שאמרתי.', why: 'מפרש את מחאת האדם כהגנה בלי בסיס, ועלול לחסום משוב חשוב.' },
    ],
  },
  withdrawal: {
    title: 'נסיגה והסכמה ריקה',
    speech: 'בסדר, אתה צודק... מה שתגיד.',
    explanation: 'הסכמה אינה בהכרח התקדמות. ייתכן שהאדם התרחק, התעייף או חושש להתנגד.',
    best: ['name', 'ask', 'pause'],
    choices: [
      { id: 'name', name: 'לבדוק את החיבור', say: 'אני שם לב שהתשובה קצרה פתאום. יכול להיות שאיבדתי אותך. מה קורה כרגע?', reply: 'קצת התעייפתי מלהצדיק את עצמי.', why: 'בודק בזהירות סימן לנסיגה, בלי לקבוע מה האדם מרגיש.' },
      { id: 'pause', name: 'להציע עצירה', say: 'אפשר לעצור את האתגור. לא חייבים להסכים או לשנות שום דבר עכשיו.', reply: 'זה מקל עליי. אני צריך רגע.', why: 'מחזיר תחושת בחירה ושליטה על קצב השיחה.' },
      { id: 'push', name: 'להכריז על הצלחה', say: 'מצוין, סוף סוף הבנת את הנקודה!', reply: 'כן, בסדר.', why: 'מתייחס להסכמה כסיום מוצלח אף שאין סימן אמין להבנה או לבחירה חופשית.' },
    ],
  },
  overjoin: {
    title: 'הצטרפות מוגזמת',
    speech: 'אז אתה פשוט חוזר על הדברים שלי? בשביל מה באתי לשיחה?',
    explanation: 'הצטרפות ללא תנועה עלולה להרגיש חסרת ערך. צריך להחזיר בחירה בין הבנה לאתגור.',
    best: ['own', 'ask'],
    choices: [
      { id: 'own', name: 'להכיר בתקיעות', say: 'נכון, שיקפתי הרבה ולא הצעתי מבט חדש. אני רוצה לתקן את זה.', reply: 'בדיוק. אני רוצה שתציע משהו שלא חשבתי עליו.', why: 'מזהה תהליך לא מועיל ונענה לבקשת האדם.' },
      { id: 'ask', name: 'לבקש רשות לאתגר', say: 'האם תרצה שננסה עכשיו כיוון מאתגר יותר, או פתרון מעשי?', reply: 'כן, תאתגר אותי. אבל תדייק.', why: 'מתאם רמת אתגור ומטרה במקום להניח שכולם רוצים אותו דבר.' },
      { id: 'validate', name: 'עוד תיקוף כללי', say: 'זה באמת קשה, ואני לגמרי מבין אותך.', reply: 'הנה, שוב בדיוק אותו הדבר.', why: 'תיקוף לבדו אינו עונה לביקורת על חוסר התקדמות.' },
    ],
  },
  flood: {
    title: 'הצפה רגשית',
    speech: 'אני לא מצליח לחשוב עכשיו. זה יותר מדי בשבילי.',
    explanation: 'כשהעומס גבוה, ממשיכים רק בהסכמה ובהתאמה לקצב. בשיחה אמיתית אין להניח שתשובה מילולית משקפת ביטחון.',
    best: ['pause', 'validate'],
    choices: [
      { id: 'pause', name: 'לעצור את האתגור', say: 'נעצור כאן את השאלות. אפשר לשבת רגע בשקט, או לסיים להיום. מה מתאים לך?', reply: 'אני רוצה רגע שקט. אולי נמשיך בפעם אחרת.', why: 'מפחית דרישה קוגניטיבית ומחזיר בחירה.' },
      { id: 'validate', name: 'לתקף את העומס', say: 'אני רואה שזה הרבה כרגע. לא צריך לפתור הכול עכשיו.', reply: 'תודה. הייתי צריך לשמוע את זה.', why: 'נותן מקום לחוויה במקום להגביר את הלחץ.' },
      { id: 'push', name: 'ללחוץ עוד קצת', say: 'דווקא עכשיו אנחנו קרובים לפריצת הדרך. עוד שאלה אחת.', reply: 'אני רוצה להפסיק.', why: 'מחמיר עומס ומתעלם מהאות הברור של האדם.' },
    ],
  },
};

function Meter({ label, value, note }: { label: string; value: number; note: string }) {
  return <div className="sw-meter"><span>{label}</span><strong>{value}/10</strong><div className="sw-meter-track"><i style={{ width: `${value * 10}%` }} /></div><small>{note}</small></div>;
}

export function SleightWorkshopPage() {
  const [view, setView] = useState<View>('practice');
  const [showGuide, setShowGuide] = useState(false);
  const [phase, setPhase] = useState<'clarify' | 'challenge'>('clarify');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [message, setMessage] = useState<{ who: 'אדם' | 'מתרגל'; text: string }[]>([{ who: 'אדם', text: CORE_CASE.story }]);
  const [known, setKnown] = useState<number[]>([]);
  const [lastMove, setLastMove] = useState<SleightPattern | null>(null);
  const [belief, setBelief] = useState(9);
  const [feeling, setFeeling] = useState(4);
  const [options, setOptions] = useState(2);
  const [chosenPattern, setChosenPattern] = useState<number | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [showMetrics, setShowMetrics] = useState(false);
  const [checkIn, setCheckIn] = useState(false);
  const [rupture, setRupture] = useState<RuptureKind>('attack');
  const [ruptureAnswer, setRuptureAnswer] = useState<Move | null>(null);
  const [ruptureOrigin, setRuptureOrigin] = useState(false);

  const append = (speaker: 'אדם' | 'מתרגל', text: string) => setMessage(prev => [...prev, { who: speaker, text }]);
  const ask = () => {
    const item = CORE_CASE.questions[questionIndex];
    if (!item) return;
    setMessage(prev => [...prev, { who: 'מתרגל', text: item.question }, { who: 'אדם', text: item.reply }]);
    setQuestionIndex(n => n + 1);
  };
  const beginChallenges = () => {
    setPhase('challenge');
    setLastMove(null);
  };
  const pattern = SLEIGHT_PATTERNS.find(item => item.id === chosenPattern);
  const menuPatterns = SLEIGHT_PATTERNS.filter(item => !known.includes(item.id)).slice(0, 3);
  const makeMove = (item: SleightPattern) => {
    if (known.includes(item.id)) return;
    setKnown(prev => [...prev, item.id]);
    setMessage(prev => [...prev, { who: 'מתרגל', text: item.line }, { who: 'אדם', text: item.patientReply }]);
    setLastMove(item);
    setChosenPattern(null);
    setCheckIn(false);
    if (item.change === 'opening') { setBelief(v => Math.max(1, v - 1)); setOptions(v => Math.min(10, v + 1)); }
    if (item.change === 'mixed') setFeeling(v => Math.max(1, v - 1));
  };
  const startRupture = (kind: RuptureKind, fromPractice = false) => {
    setRupture(kind); setRuptureAnswer(null); setRuptureOrigin(fromPractice); setView('rupture');
  };
  const reset = () => {
    setPhase('clarify'); setQuestionIndex(0); setMessage([{ who: 'אדם', text: CORE_CASE.story }]);
    setKnown([]); setLastMove(null); setBelief(9); setFeeling(4); setOptions(2);
    setChosenPattern(null); setCheckIn(false); setShowMap(false); setView('practice');
  };
  const ruptureScenario = RUPTURES[rupture];
  const picked = ruptureScenario.choices.find(v => v.id === ruptureAnswer);
  return <div className="sw-page" dir="rtl">
    <header className="sw-header">
      <span className="sw-kicker">מרכז עומק · מעבדת שיחה חיה</span>
      <h2>זריזות לשון</h2>
      <p>אמונה אחת. ארבע־עשרה תנועות אפשריות. התלמיד מגלה את המפה דרך השיחה.</p>
      <div className="sw-toolbar">
        <button type="button" onClick={() => setView('practice')} aria-pressed={view === 'practice'}>אימון זריזות לשון</button>
        <button type="button" onClick={() => startRupture('attack')} aria-pressed={view === 'rupture'}>סדנת פיצוצים והתנגדויות</button>
        <button type="button" onClick={() => setShowGuide(!showGuide)}>ⓘ איך זה עובד</button>
      </div>
    </header>
    {showGuide && <section className="sw-help">
      <button type="button" onClick={() => setShowGuide(false)} aria-label="סגור הסבר">✕</button>
      <h3>המפה שמאחורי המשחק</h3>
      <p>אדם מספר מקרה. קודם מבררים את העובדות ואת המשמעות באמצעות שאלת מטה־מודל אחת בכל פעם, עד שיש אמונה ברורה שאפשר לבדוק. אחר כך מתרגלים תנועות שונות סביב אותה אמונה.</p>
      <p>ארבע משפחות עוזרות לזכור את 14 תבניות דילטס: משמעות ומטרה, רזולוציה והקשר, מבט והשלכות, בדיקת הכלל. שכבת Mind-Lines של הול ובודנהיימר מציעה שבעה כיווני מסגור נוספים, שאינם שבע תבניות חדשות של דילטס.</p>
      <p>התגובות והמדדים כאן מדומים לצורך לימוד, ולא מעידים מה יקרה בשיחה אמיתית. אפשר לאתגר בעוצמה שונה, אבל אם הקשר נפגע, צריך לבדוק את התהליך במקום להמשיך לנצח בוויכוח.</p>
    </section>}
    {view === 'practice' ? <>
      <div className="sw-sticky-belief">
        <span>אמונת העוגן לבדיקה</span>
        <strong>{CORE_CASE.belief}</strong>
      </div>
      <div className="sw-body">
        <main className="sw-main">
          <section className="sw-case">
            <div className="sw-section-head"><h3>השיחה</h3><button onClick={reset} type="button">↻ להתחיל מחדש</button></div>
            <div className="sw-dialogue" aria-live="polite">
              {message.map((item, index) => <div className={`sw-line ${item.who === 'אדם' ? 'sw-person' : 'sw-trainee'}`} key={index}>
                <small>{item.who === 'אדם' ? 'האדם מספר' : 'השאלה / האתגור שלך'}</small><p>{item.text}</p>
              </div>)}
            </div>
          </section>
          {phase === 'clarify' ? <section className="sw-decision">
            <span className="sw-kicker">שלב א׳ · מטה־מודל</span><h3>מה כדאי לברר לפני שמאתגרים?</h3>
            <p>התלמיד שואל, האדם עונה, והאמונה מתחדדת. אין חובה לשאול את כל השאלות.</p>
            {questionIndex < CORE_CASE.questions.length && <button className="sw-choice" onClick={ask}>{CORE_CASE.questions[questionIndex].question}</button>}
            <button className="sw-primary" type="button" onClick={beginChallenges}>האמונה ברורה · מתחילים לאתגר</button>
          </section> : <section className="sw-decision">
            <span className="sw-kicker">שלב ב׳ · זריזות לשון · תנועה {known.length + 1}</span>
            <h3>איזו תנועה תנסה עכשיו?</h3><p>כל תנועה בודקת פן אחר באותה אמונה. אחרי התגובה אפשר לבחור עוד מהלך.</p>
            {menuPatterns.length > 0 ? <div className="sw-choice-list">
              {menuPatterns.map(item => <button className="sw-choice" key={item.id} type="button" onClick={() => setChosenPattern(item.id)}>
                <strong>{item.name}</strong><span>{item.movement}</span>
              </button>)}
            </div> : known.length < 14 ? <div className="sw-choice-list">
              {SLEIGHT_PATTERNS.filter(item => !known.includes(item.id)).slice(0, 3).map(item => <button className="sw-choice" key={item.id} onClick={() => setChosenPattern(item.id)}><strong>{item.name}</strong><span>{item.movement}</span></button>)}
            </div> : <p>ניסית את כל 14 התנועות. מפת השליפה מלאה ואפשר לעבור למקרה חדש בגרסה הבאה.</p>}
            {pattern && <div className="sw-preview">
              <span>מהלך מוצע</span><p>{pattern.line}</p>
              <div className="sw-action-row">
                <button className="sw-primary" onClick={() => makeMove(pattern)}>אמור את המשפט</button>
                <button onClick={() => setChosenPattern(null)}>בחר אחרת</button>
              </div>
            </div>}
            {lastMove && <div className="sw-learning">
              <strong>מה נפתח במפה? {lastMove.name}</strong>
              <p>{lastMove.movement}</p>
              <button onClick={() => setCheckIn(!checkIn)}>איך הוא מרגיש? · כיול</button>
              {checkIn && <div><p>בדוגמה המדומה: ביטחון באמונה {belief}/10, מצב רגשי {feeling}/10 ואפשרויות טובות {options}/10. בשיחה אמיתית יש לשאול את האדם ולא לנחש.</p>
                <button onClick={() => setShowMetrics(true)}>הצג פירוט מדדים</button></div>}
            </div>}
          </section>}
          <section className="sw-map-panel">
            <div className="sw-section-head"><div><h3>מפת השליפה הנבנית</h3><small>{known.length}/14 תבניות התגלו</small></div><button onClick={() => setShowMap(!showMap)}>{showMap ? 'הסתר מפה' : '◎ פתח מפה'}</button></div>
            <div className="sw-progress"><i style={{ width: `${known.length / 14 * 100}%` }} /></div>
            {showMap && <div className="sw-family-grid">{SLEIGHT_FAMILIES.map(family => <section key={family} className="sw-family"><strong>{family}</strong><div>{SLEIGHT_PATTERNS.filter(item => item.family === family).map(item => <span className={known.includes(item.id) ? 'sw-revealed' : 'sw-unknown'} key={item.id}>{known.includes(item.id) ? item.name : '○'}</span>)}</div></section>)}</div>}
          </section>
          <section className="sw-rupture-bridge">
            <h3>כשהשיחה מסתבכת</h3>
            <p>האדם מגיב: ״מספיק! אתה תוקף אותי״, או ״זה לא מקדם אותי״. בחר מציאות מדומה ותרגל תיקון.</p>
            <div className="sw-action-row"><button onClick={() => startRupture('attack', true)}>הוא מרגיש מותקף</button><button onClick={() => startRupture('stuck', true)}>הוא מרגיש תקוע</button><button onClick={() => startRupture('withdrawal', true)}>הוא נסגר</button></div>
          </section>
        </main>
        <aside className="sw-aside">
          <button type="button" className="sw-metrics-toggle" onClick={() => setShowMetrics(!showMetrics)}>◉ מדדי השיחה <strong>{showMetrics ? 'הסתר' : 'פירוט'}</strong></button>
          <div className="sw-compact-metrics"><span title="ביטחון באמונה">אמונה {belief}</span><span title="מצב רגשי מדומה">רגש {feeling}</span><span title="אפשרויות טובות נתפסות">אפשרויות {options}</span></div>
          {showMetrics && <div className="sw-metrics-expanded">
            <Meter label="ביטחון באמונת העוגן" value={belief} note="10 = בטוח לחלוטין" />
            <Meter label="מצב רגשי" value={feeling} note="10 = מרגיש טוב מאוד" />
            <Meter label="אפשרויות טובות פתוחות" value={options} note="10 = הרבה אפשרויות מועילות" />
            <p>הערכים מדומים בלבד. בירור אמיתי נעשה ישירות עם האדם, ושינוי באמונה אינו מוכיח שהאתגור הועיל.</p>
          </div>}
        </aside>
      </div>
    </> : <>
      <section className="sw-rupture-intro">
        <span className="sw-kicker">סדנת פיצוצים והתנגדויות</span>
        <h3>לפני שמתקנים את האמונה, מתקנים את האפשרות לדבר.</h3>
        <p>בתרגול הזה בוחרים תגובה לקרע שיכול להופיע אחרי אתגור חד, אחרי בירור מתיש או דווקא אחרי יותר מדי הצטרפות.</p>
      </section>
      <div className="sw-rupture-select">{(Object.keys(RUPTURES) as RuptureKind[]).map(kind => <button type="button" key={kind} aria-pressed={rupture === kind} onClick={() => {setRupture(kind);setRuptureAnswer(null);}}>{RUPTURES[kind].title}</button>)}</div>
      <section className="sw-rupture-example">
        <span className="sw-kicker">מה האדם אומר עכשיו?</span><blockquote>{ruptureScenario.speech}</blockquote>
        <h3>מה תעשה?</h3><div className="sw-choice-list">
          {ruptureScenario.choices.map(choice => <button className="sw-choice" key={choice.id} type="button" onClick={() => setRuptureAnswer(choice.id)} disabled={ruptureAnswer !== null}><strong>{choice.name}</strong><span>{choice.say}</span></button>)}
        </div>
        {picked && <div className="sw-feedback" aria-live="polite">
          <strong>{ruptureScenario.best.includes(picked.id) ? 'מהלך מתאים לשיחה הזאת' : 'כדאי לבחון מה קורה לקשר'}</strong>
          <p>{picked.why}</p><div className="sw-line sw-person"><small>תגובה מדומה של האדם</small><p>{picked.reply}</p></div>
          <div className="sw-action-row"><button className="sw-primary" onClick={() => setRuptureAnswer(null)}>נסה תגובה אחרת</button><button onClick={() => setRuptureAnswer(null)}>המשך תרגול</button></div>
        </div>}
        <p className="sw-context">{ruptureScenario.explanation}</p>
      </section>
      <section className="sw-finish">
        <h3>כשהאדם לא רוצה להמשיך</h3>
        <p>אפשר לומר: ״אני חושב שהאתגור היום היה חזק מדי. לא חייבים לפתור את זה עכשיו. נוכל לסיים כאן ולבדוק בפעם הבאה איך תרצה להתקדם.״</p>
        <p>בסיום מפגש אמיתי חשוב לוודא שהאדם מסוגל לסיים באופן בטוח ומבין מה האפשרויות להמשך; לא להשתמש בסיום כעונש או כדרך להכריח הסכמה.</p>
        {ruptureOrigin && <button className="sw-primary" onClick={() => setView('practice')}>חזרה לשיחה הקודמת</button>}
      </section>
    </>}
    <p className="sw-footnote">סימולציה לימודית מבוססת תרחישים כתובים מראש. אינה אבחון, טיפול או מדד אובייקטיבי לשינוי אמונה. מקורות: חוברת מרכז עומק על זריזות הלשון; Robert Dilts; Michael Hall & Bobby Bodenhamer; מחקר על תיקון קרעים בברית הטיפולית וראיונות מוטיבציוניים.</p>
  </div>;
}
