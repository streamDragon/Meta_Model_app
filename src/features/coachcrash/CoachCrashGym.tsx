import { useRef, useState } from 'react';
import type { Dispatch, PointerEvent as ReactPointerEvent, SetStateAction } from 'react';
import './CoachCrashGym.css';

type Pathway = 'conscious' | 'imagery';
type Phase = 'identify' | 'practice' | 'transfer';
type Handle = 'head' | 'left' | 'right' | 'torso';
type Pose = { headX: number; headY: number; bodyX: number; leftX: number; leftY: number; rightX: number; rightY: number };
type Axis = {
  key: string; crash: string; coach: string; signal: string; outside: string;
  body: string; imagery: string; inward: string; bridge: string;
};

const AXES: Axis[] = [
  {
    key: 'C', crash: 'כיווץ', coach: 'מרכוז',
    signal: 'כתפיים מורמות, קושי לחוש קרקע או נשימה מצומצמת',
    outside: 'הדמות מכווצת. איפה היית מזהה מתח או אובדן של מרכז?',
    body: 'מצא/י תנוחה נוחה. הרגש/י את המגע עם הרצפה, שחרר/י מעט את הכתפיים ותן/י לנשימה לחזור לקצב נוח.',
    imagery: 'דמיין/י מקום שבו הגוף מרגיש יציב ובטוח יחסית. מה בתמונה עוזר לך להרגיש שיש לך בסיס?',
    inward: 'איפה נמצא המרכז שלך כרגע, ואיזו תנועה קטנה מאפשרת לך לחזור אליו?',
    bridge: 'אפשר להיות במרכז גם בלי להרגיש מושלם.',
  },
  {
    key: 'O', crash: 'תגובה אוטומטית', coach: 'פתיחות',
    signal: 'תנועה חדה, הגנה, ידיים סגורות או רצון לענות מיד',
    outside: 'לפני שינוי תנוחה, מה בגוף מאותת לך שהתגובה קודמת לבחירה?',
    body: 'הרפה/י מעט את כפות הידיים ופתח/י מרווח קטן סביב החזה, בלי לכפות יציבה. נסה/י לעצור רגע לפני התגובה.',
    imagery: 'דמיין/י דלת שנפתחת מעט. איזו אפשרות נוספת נכנסת איתה לתמונה?',
    inward: 'למה עוד אני יכול/ה להיות פתוח/ה, בלי להסכים עם הכול?',
    bridge: 'פתיחות אינה ויתור על גבולות.',
  },
  {
    key: 'A', crash: 'שיתוק מניתוח יתר', coach: 'מודעות קשובה',
    signal: 'מבט תקוע, חשיבה שחוזרת על עצמה וקושי לבחור פעולה',
    outside: 'איך נראית דמות שאיבדה קשר למה שמתרחש מסביבה?',
    body: 'התבונן/י סביב ומצא/י שלושה פרטים פשוטים: צבע, צליל ומשטח. החזר/י בעדינות את המבט למרחב.',
    imagery: 'דמיין/י שאת/ה מתבונן/ת בסיטואציה מחלון רחב. מה רואים עכשיו שלא נכלל במחשבה החוזרת?',
    inward: 'מה אני קולט/ת כרגע, מעבר לסיפור שאני מספר/ת לעצמי?',
    bridge: 'מודעות היא הבחנה, לא עוד ניתוח.',
  },
  {
    key: 'C2', crash: 'ניתוק', coach: 'חיבור',
    signal: 'התרחקות מעצמי, מאחרים או מהסביבה',
    outside: 'איפה הדמות נראית מנותקת מן המרחב או ממי שנמצא מולה?',
    body: 'הרגש/י את נקודות המגע של הגוף במושב או ברצפה. בחר/י אדם או מקום תומך שאפשר לחשוב עליו ללא מאמץ.',
    imagery: 'דמיין/י נוכחות מיטיבה לצידך, או קשר של תמיכה מתוך זיכרון נעים. איזה מרחק מתאים לך?',
    inward: 'למה, למי או לאיזה משאב אני רוצה להיות מחובר/ת עכשיו?',
    bridge: 'חיבור מאפשר גם מרחק ובחירה.',
  },
  {
    key: 'H', crash: 'פגיעה או עוינות', coach: 'החזקה',
    signal: 'עלבון, קשיחות, דחף לתקוף או לברוח מן החוויה',
    outside: 'מה קורה לגוף כשהחוויה קשה מדי מכדי לתת לה מקום?',
    body: 'אפשר להניח יד על אזור נוח בגוף, או פשוט להרגיש את הכיסא. אפשר לתת לרגש מקום קטן, בלי לנסות להעלים אותו.',
    imagery: 'דמיין/י מיכל רחב מספיק שיכול להכיל גם רגש לא נעים. מה יעזור לו להרגיש בטוח ולא מציף?',
    inward: 'האם אפשר להכיר במה שכואב ובאותו זמן לשמור על בחירה?',
    bridge: 'להחזיק חוויה אין פירושו לאהוב אותה.',
  },
];

// Short concept cards are a teaching aid, not a clinical classification.
const CONCEPTS = [
  {
    english: 'Centered', near: 'יציבות · עיגון · בסיס',
    meaning: 'מרכוז הוא היכולת למצוא נקודת ייחוס בגוף ולהישאר איתה גם כשלא הכול רגוע.',
    nuance: 'לא מוכרחים לעמוד זקוף או להפסיק להרגיש פחד. מחפשים תנועה קטנה שמחזירה בחירה.',
    question: 'איפה אפשר לחוש תמיכה, אפילו באחוז אחד יותר?',
  },
  {
    english: 'Open', near: 'גמישות · מרחב · אפשרויות',
    meaning: 'פתיחות מאפשרת לקלוט אפשרויות לפני שקופצים לתגובה מוכרת.',
    nuance: 'פתיחות אינה הסכמה לכל דבר, חשיפה מוגזמת או ויתור על גבול.',
    question: 'מה אני מוכן/ה לשים לב אליו, בלי להתחייב להסכים איתו?',
  },
  {
    english: 'Aware', near: 'מודעות · נוכחות · קשב',
    meaning: 'נוכחות היא תשומת לב למה שמתרחש עכשיו בגוף, בסביבה ובקשר עם האחר.',
    nuance: 'נוכחות אינה ניתוח אינסופי. היא קשורה למרכוז, לחיבור ולהקשבה גם כשהראש פעיל.',
    question: 'מה אני רואה, שומע או מרגיש עכשיו בלי לפרש?',
  },
  {
    english: 'Connected', near: 'קשר · שייכות · משאבים',
    meaning: 'חיבור הוא מגע עם עצמי, עם אנשים או עם משאבים שיכולים לתמוך בי.',
    nuance: 'אפשר להיות מחובר/ת גם כשצריך מרחק פיזי או רגשי. חיבור אינו ביטול עצמי.',
    question: 'איזה קשר או זיכרון תומך זמין לי כרגע?',
  },
  {
    english: 'Holding', near: 'הכלה · החזקה · כבוד',
    meaning: 'החזקה היא האפשרות לתת מקום לחוויה, בלי למהר להילחם בה או לציית לה.',
    nuance: 'להחזיק רגש אינו להסכים לפגיעה, להישאר במצב מסוכן או לסבול בכוח.',
    question: 'מה יאפשר לי לתת לחוויה מקום מוגבל ובטוח?',
  },
] as const;

const FEELINGS = [
  { key: 'tight', text: 'מכווץ/ת' },
  { key: 'neutral', text: 'רגיל/ה' },
  { key: 'space', text: 'עם מרחב' },
  { key: 'unclear', text: 'לא ברור' },
] as const;
type Feeling = (typeof FEELINGS)[number]['key'];

const SCENARIOS = [
  { id: 'feedback', label: 'מול ביקורת', detail: 'מישהו אומר שהעבודה שלך אינה מספיק טובה.' },
  { id: 'meeting', label: 'לפני מפגש', detail: 'את/ה נכנס/ת לפגישה ורוצה להיות נוכח/ת וקשוב/ה.' },
  { id: 'teaching', label: 'בתוך שיעור', detail: 'תלמיד מביע התנגדות ואת/ה מזהה תגובה גופנית.' },
] as const;

const CRASH_POSE: Pose = { headX: 13, headY: 17, bodyX: 17, leftX: 114, leftY: 199, rightX: 202, rightY: 204 };
const COACH_POSE: Pose = { headX: 0, headY: 0, bodyX: 0, leftX: 58, leftY: 151, rightX: 262, rightY: 151 };

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function PoseMini({ pose, label }: { pose: Pose; label: string }) {
  const x = 60 + pose.bodyX * .3;
  const hx = 60 + pose.headX * .7;
  return <div className="cc-mini-figure">
    <span>{label}</span>
    <svg viewBox="0 0 120 130" role="img" aria-label={'צילום מנח הדמות: ' + label}>
      <line x1="60" x2="60" y1="8" y2="123" stroke="#bed4d1" strokeWidth="1" strokeDasharray="4 5" />
      <path d={'M ' + x + ' 87 L 43 119 M ' + x + ' 87 L 78 119'} stroke="#376477" strokeWidth="10" fill="none" strokeLinecap="round" />
      <path d={'M ' + x + ' 51 L ' + x + ' 86'} stroke="#3b9088" strokeWidth="21" strokeLinecap="round" />
      <path d={'M ' + (x - 10) + ' 53 L ' + (pose.leftX * .56 + 15) + ' ' + (pose.leftY * .38 + 11)} stroke="#d5a685" strokeWidth="8" strokeLinecap="round" />
      <path d={'M ' + (x + 10) + ' 53 L ' + (pose.rightX * .38 + 12) + ' ' + (pose.rightY * .38 + 11)} stroke="#d5a685" strokeWidth="8" strokeLinecap="round" />
      <line x1={hx} x2={x} y1={37 + pose.headY * .35} y2="46" stroke="#d5a685" strokeWidth="7" />
      <circle cx={hx} cy={26 + pose.headY * .35} r="13" fill="#e6bc98" />
    </svg>
  </div>;
}

function PoseAvatar({ pose, onChange }: { pose: Pose; onChange: Dispatch<SetStateAction<Pose>> }) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [dragging, setDragging] = useState<Handle | null>(null);
  const sx = 160 + pose.bodyX * 0.4;
  const head = 160 + pose.headX;
  const hand = (side: 'left' | 'right') => ({
    x: side === 'left' ? pose.leftX : pose.rightX,
    y: side === 'left' ? pose.leftY : pose.rightY,
  });

  function start(event: ReactPointerEvent<SVGCircleElement>, target: Handle) {
    event.preventDefault();
    setDragging(target);
    svgRef.current?.setPointerCapture?.(event.pointerId);
  }
  function move(event: ReactPointerEvent<SVGSVGElement>) {
    if (!dragging) return;
    // Translate client coordinates through the SVG matrix. A simple bounding
    // rectangle calculation is wrong when preserveAspectRatio creates margins.
    const matrix = event.currentTarget.getScreenCTM();
    if (!matrix) return;
    const pointer = event.currentTarget.createSVGPoint();
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    const { x, y } = pointer.matrixTransform(matrix.inverse());
    onChange((previous) => {
      if (dragging === 'head') return { ...previous, headX: clamp(x - 160, -24, 24), headY: clamp(y - 78, -16, 24) };
      if (dragging === 'left') return { ...previous, leftX: clamp(x, 42, 143), leftY: clamp(y, 112, 245) };
      if (dragging === 'right') return { ...previous, rightX: clamp(x, 177, 278), rightY: clamp(y, 112, 245) };
      return { ...previous, bodyX: clamp(x - 160, -24, 24) };
    });
  }

  const left = hand('left'), right = hand('right');
  return (
    <svg ref={svgRef} className="cc-avatar" viewBox="0 0 320 360" role="img"
      aria-label="דמות תרגול. גררו את הראש, כפות הידיים או המרכז כדי לשנות תנוחה. יש גם כפתורי תנוחה מתחת לדמות."
      onPointerMove={move}
      onPointerUp={() => setDragging(null)}
      onPointerCancel={() => setDragging(null)}
      onLostPointerCapture={() => setDragging(null)}>
      <defs>
        <linearGradient id="cc-person" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#81c6bd" /><stop offset="1" stopColor="#20787a" /></linearGradient>
        <radialGradient id="cc-aura"><stop offset="0" stopColor="#d3f5ec" stopOpacity=".88" /><stop offset="1" stopColor="#d3f5ec" stopOpacity="0" /></radialGradient>
      </defs>
      <circle cx="160" cy="157" r="146" fill="url(#cc-aura)" />
      <line x1="160" y1="18" x2="160" y2="318" stroke="#9cb8b8" strokeWidth="1.5" strokeDasharray="5 8" />
      <ellipse cx="160" cy="323" rx="80" ry="10" fill="#a4c5c1" opacity=".36" />
      <path d={'M ' + sx + ' 228 L 132 298 L 118 315'} fill="none" stroke="#23576b" strokeWidth="22" strokeLinecap="round" strokeLinejoin="round" />
      <path d={'M ' + sx + ' 228 L 189 298 L 203 315'} fill="none" stroke="#23576b" strokeWidth="22" strokeLinecap="round" strokeLinejoin="round" />
      <path d={'M ' + head + ' ' + (103 + pose.headY) + ' L ' + sx + ' 131'} stroke="#e0ad87" strokeWidth="19" strokeLinecap="round" />
      <path d={'M ' + (sx - 33) + ' 134 Q ' + sx + ' 117 ' + (sx + 33) + ' 134 L ' + (sx + 24) + ' 240 Q ' + sx + ' 251 ' + (sx - 24) + ' 240 Z'} fill="url(#cc-person)" stroke="#195d67" strokeWidth="2" />
      <path d={'M ' + (sx - 29) + ' 139 Q ' + (left.x + 37) + ' ' + (left.y - 14) + ' ' + left.x + ' ' + left.y}
        fill="none" stroke="#e0ad87" strokeWidth="16" strokeLinecap="round" />
      <path d={'M ' + (sx + 29) + ' 139 Q ' + (right.x - 37) + ' ' + (right.y - 14) + ' ' + right.x + ' ' + right.y}
        fill="none" stroke="#e0ad87" strokeWidth="16" strokeLinecap="round" />
      <circle cx={head} cy={78 + pose.headY} r="28" fill="#edc19b" stroke="#be9274" strokeWidth="1.5" />
      <path d={'M ' + (head - 27) + ' ' + (75 + pose.headY) + ' Q ' + head + ' ' + (24 + pose.headY) + ' ' + (head + 27) + ' ' + (73 + pose.headY)}
        fill="#263e4b" />
      <circle cx={head - 10} cy={81 + pose.headY} r="2.4" fill="#263e4b" />
      <circle cx={head + 10} cy={81 + pose.headY} r="2.4" fill="#263e4b" />
      <path d={'M ' + (head - 7) + ' ' + (91 + pose.headY) + ' Q ' + head + ' ' + (95 + pose.headY) + ' ' + (head + 7) + ' ' + (91 + pose.headY)} fill="none" stroke="#986653" strokeWidth="1.8" />
      <circle cx={sx} cy="176" r="9" fill="#f3faff" opacity=".8" />
      <path d={'M ' + sx + ' 151 L ' + sx + ' 218'} stroke="#e6fff9" strokeOpacity=".45" strokeWidth="2" strokeDasharray="4 6" />
      {([
        { handle: 'head' as Handle, x: head + 25, y: 76 + pose.headY, title: 'ראש' },
        { handle: 'left' as Handle, x: left.x, y: left.y, title: 'יד שמאל' },
        { handle: 'right' as Handle, x: right.x, y: right.y, title: 'יד ימין' },
        { handle: 'torso' as Handle, x: sx, y: 176, title: 'מרכז' },
      ]).map((item) => (
        <g key={item.handle}>
          <circle className="cc-drag-ring" cx={item.x} cy={item.y} r="17" />
          <circle className="cc-drag-dot" cx={item.x} cy={item.y} r="10" onPointerDown={(event) => start(event, item.handle)}>
            <title>גרור/י: {item.title}</title>
          </circle>
        </g>
      ))}
      <text x="160" y="347" textAnchor="middle" className="cc-svg-label">גררו ראש, ידיים או מרכז</text>
    </svg>
  );
}

export function CoachCrashGym() {
  const [axisIndex, setAxisIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('identify');
  const [pathway, setPathway] = useState<Pathway>('conscious');
  const [scenarioId, setScenarioId] = useState<(typeof SCENARIOS)[number]['id']>('feedback');
  const [pose, setPose] = useState<Pose>(CRASH_POSE);
  const [reflection, setReflection] = useState('');
  const [observed, setObserved] = useState(false);
  const [tried, setTried] = useState(false);
  const [explain, setExplain] = useState(false);
  const [initialPose, setInitialPose] = useState<Pose | null>(null);
  const [before, setBefore] = useState<Feeling | null>(null);
  const [after, setAfter] = useState<Feeling | null>(null);
  const axis = AXES[axisIndex];
  const concept = CONCEPTS[axisIndex];
  const scenario = SCENARIOS.find((item) => item.id === scenarioId) ?? SCENARIOS[0];

  function chooseAxis(index: number) {
    setAxisIndex(index);
    setObserved(false);
    setTried(false);
    setExplain(false);
    setReflection('');
    setPose(CRASH_POSE);
    setInitialPose(null);
    setBefore(null);
    setAfter(null);
    setPhase('identify');
  }

  return (
    <div className="cc-page" dir="rtl">
      <header className="cc-header">
        <div><span className="cc-kicker">מעבדת מצבים · אימון גוף וקשב</span>
          <h2>COACH <span>↔</span> CRASH</h2>
          <p>לזהות דפוס, לשחק עם תנוחה, ולבחון איך אפשר להעביר את החוויה מהדמות אל הגוף שלי.</p>
        </div>
        <div className="cc-header-mark" aria-hidden="true">◉</div>
      </header>

      <div className="cc-flow" aria-label="שלבי האימון">
        <button type="button" className={phase === 'identify' ? 'cc-flow-active' : ''} onClick={() => setPhase('identify')}><span>01</span> מזהים</button>
        <button type="button" disabled={!observed} className={phase === 'practice' ? 'cc-flow-active' : ''} onClick={() => setPhase('practice')}><span>02</span> מתרגלים</button>
        <button type="button" disabled={!tried} className={phase === 'transfer' ? 'cc-flow-active' : ''} onClick={() => setPhase('transfer')}><span>03</span> מעבירים לחיים</button>
      </div>

      <section className="cc-axis-section" aria-label="בחירת רכיב לתרגול">
        <div className="cc-section-head"><h3>על מה עובדים?</h3><span>בחרו רכיב אחד. לא צריך לתקן הכול.</span></div>
        <div className="cc-axis-tabs">
          {AXES.map((item, index) => (
            <button key={item.key} type="button" className={axisIndex === index ? 'cc-axis-active' : ''}
              onClick={() => chooseAxis(index)} aria-pressed={axisIndex === index}>
              <small>{index + 1}/5</small><strong>{item.coach}</strong><span>{item.crash}</span>
            </button>
          ))}
        </div>
      </section>

      <div className="cc-workspace">
        <section className="cc-figure-card">
          <div className="cc-figure-title"><strong>סטודיו תנוחה</strong><span>אפשר לגרור גם באצבע</span></div>
          <div className="cc-mobile-prompt" aria-live="polite">
            <strong>{phase === 'identify' ? 'שלב 1: מתבוננים בדמות' : phase === 'practice' ? 'שלב 2: עוברים מהדמות אל הגוף' : 'שלב 3: מה נשאר איתי?'}</strong>
            <p>{phase === 'identify'
              ? 'צרו דמות שממחישה ' + axis.crash + '. אחר כך שימו לב: איך נראה הגוף שלכם?'
              : phase === 'practice' ? pathway === 'conscious' ? axis.body : axis.imagery
              : 'אחרי ההתנסות, בחרו סיטואציה אמיתית ותנועה קטנה שתוכלו לנסות בה.'}</p>
          </div>
          <PoseAvatar pose={pose} onChange={setPose} />
          {initialPose && phase !== 'identify' && (
            <div className="cc-pose-comparison" aria-label="השוואת תנוחות הדמות">
              <PoseMini pose={initialPose} label="מנח בתחילה" />
              <span aria-hidden="true">←</span>
              <PoseMini pose={pose} label="מנח עכשיו" />
            </div>
          )}
          <div className="cc-pose-actions">
            <button type="button" onClick={() => setPose(CRASH_POSE)}>מנח מכווץ</button>
            <button type="button" onClick={() => setPose(COACH_POSE)}>מנח פתוח</button>
            <button type="button" onClick={() => setPose(CRASH_POSE)} aria-label="איפוס תנוחת הדמות">↺</button>
          </div>
          <p className="cc-figure-foot">הדמות היא המחשה בלבד. אי אפשר לקבוע מצב רגשי מתוך תנוחה, ואין תנוחה אחת נכונה לכולם.</p>
        </section>

        <section className="cc-work-card">
          {phase === 'identify' && (
            <>
              <span className="cc-eyebrow">שלב 1 · להבחין בלי לשפוט</span>
              <h3>מ־{axis.crash} אל {axis.coach}</h3>
              <div className="cc-contrast">
                <div><small>CRASH · מתי זה קורה?</small><strong>{axis.crash}</strong><p>{axis.signal}</p></div>
                <div><small>COACH · מה מתרגלים?</small><strong>{axis.coach}</strong><p>{axis.outside}</p></div>
              </div>
              <p className="cc-guidance">נסו לשנות את הדמות למנח שממחיש את {axis.crash}. אילו סימנים אפשר לראות, ומה נשאר חוויה פנימית שלא ניתן להסיק מבחוץ?</p>
              <details className="cc-concept-details"><summary>מה זה {axis.coach}? מילים קשורות</summary>
                <div className="cc-concept-body">
                  <small>{concept.english} · {concept.near}</small>
                  <p>{concept.meaning}</p><p>{concept.nuance}</p>
                  <strong>שאלה לעצמי: {concept.question}</strong>
                </div>
              </details>
              <div className="cc-feeling-box">
                <strong>מה התחושה שלי עכשיו?</strong><small>בחירה אישית, לא אבחון של הדמות</small>
                <div role="group" aria-label="תחושה לפני התרגול" className="cc-feeling-options">
                  {FEELINGS.map((item) => <button type="button" key={item.key} aria-pressed={before === item.key}
                    className={before === item.key ? 'cc-feeling-active' : ''}
                    onClick={() => setBefore(item.key)}>{item.text}</button>)}
                </div>
              </div>
              <button type="button" className="cc-main-action" onClick={() => { setInitialPose({ ...pose }); setObserved(true); setPhase('practice'); }}>
                {observed ? 'להמשך התרגול' : 'זיהיתי · לתרגול'} <span aria-hidden="true">←</span>
              </button>
            </>
          )}

          {phase === 'practice' && (
            <>
              <span className="cc-eyebrow">שלב 2 · שתי דרכים אל אותו רכיב</span>
              <h3>מתרגלים {axis.coach}</h3>
              <div className="cc-pathways" role="group" aria-label="בחירת דרך התרגול">
                <button type="button" aria-pressed={pathway === 'conscious'} className={pathway === 'conscious' ? 'cc-path-active' : ''}
                  onClick={() => setPathway('conscious')}><span>🧍</span><strong>דרך הגוף</strong><small>בחירה מודעת של תנוחה וקשב</small></button>
                <button type="button" aria-pressed={pathway === 'imagery'} className={pathway === 'imagery' ? 'cc-path-active' : ''}
                  onClick={() => setPathway('imagery')}><span>🌿</span><strong>דרך הדמיון</strong><small>דימוי שיכול להזמין תגובה טבעית</small></button>
              </div>
              <div className="cc-instruction" aria-live="polite">
                <span>{pathway === 'conscious' ? 'ניסוי גופני' : 'ניסוי בדמיון'}</span>
                <p>{pathway === 'conscious' ? axis.body : axis.imagery}</p>
              </div>
              <div className="cc-transfer-question">
                <strong>ומה קורה מבפנים?</strong>
                <p>{axis.inward}</p>
              </div>
              <div className="cc-feeling-box">
                <strong>מה אני שם/ה לב אליו עכשיו, אחרי הניסוי?</strong>
                <div role="group" aria-label="תחושה אחרי התרגול" className="cc-feeling-options">
                  {FEELINGS.map((item) => <button type="button" key={item.key} aria-pressed={after === item.key}
                    className={after === item.key ? 'cc-feeling-active' : ''}
                    onClick={() => setAfter(item.key)}>{item.text}</button>)}
                </div>
              </div>
              <p className="cc-guidance">אפשר לבדוק גם מול הדמות וגם בגוף שלך. אין צורך להגיע לתחושה מסוימת. אם תרגיל אינו נעים, מפסיקים או בוחרים משהו אחר.</p>
              <div className="cc-action-row">
                <button type="button" className="cc-secondary-action" onClick={() => setPose(COACH_POSE)}>המחישו בדמות</button>
                <button type="button" className="cc-main-action" onClick={() => { setTried(true); setPhase('transfer'); }}>ניסיתי · להמשך <span aria-hidden="true">←</span></button>
              </div>
            </>
          )}

          {phase === 'transfer' && (
            <>
              <span className="cc-eyebrow">שלב 3 · מהמעבדה למפגש אנושי</span>
              <h3>איך {axis.coach} נראה בחיים?</h3>
              <div className="cc-scenarios" role="group" aria-label="בחירת סיטואציה">
                {SCENARIOS.map((item) => <button key={item.id} type="button" aria-pressed={item.id === scenarioId}
                  className={scenarioId === item.id ? 'cc-scenario-active' : ''} onClick={() => setScenarioId(item.id)}>{item.label}</button>)}
              </div>
              <div className="cc-situation"><span>הסיטואציה</span><p>{scenario.detail}</p></div>
              <div className="cc-transfer-question"><strong>מה תבחר/י לנסות?</strong><p>{axis.inward}</p><p>{axis.bridge}</p></div>
              {(before || after) && <div className="cc-inner-compare" aria-label="מבט אישי על התחושה">
                <span>לפני: <strong>{FEELINGS.find((f) => f.key === before)?.text ?? 'לא נבחר'}</strong></span>
                <span>עכשיו: <strong>{FEELINGS.find((f) => f.key === after)?.text ?? 'לא נבחר'}</strong></span>
                <small>אין כאן ציון ואין חובה להרגיש שינוי. זו רק תצפית אישית.</small>
              </div>}
              <label className="cc-note-label" htmlFor="cc-reflection">הערה לעצמי · לא נשמרת</label>
              <textarea id="cc-reflection" rows={3} value={reflection} onChange={(event) => setReflection(event.target.value)}
                placeholder="סימן גופני אחד שאזהה, ותנועה קטנה אחת שאוכל לבחור..." />
              <button type="button" className="cc-secondary-action" onClick={() => setExplain(!explain)} aria-expanded={explain}>
                {explain ? 'הסתר הסבר' : 'מה מתרגלים כאן?'}
              </button>
              {explain && <p className="cc-theory">זהו אימון עצמי לזיהוי, ניסוי והעברה למצב יומיומי. הוא אינו מאבחן CRASH, אינו מודד שינוי תת־מודע ואינו תחליף לעזרה מקצועית. המסלול דרך הדמיון הוא תוספת אימונית מוצעת, ולא טענה על שינוי לא־מודע מוכח.</p>}
              <button type="button" className="cc-main-action" onClick={() => { setPhase('identify'); setPose(CRASH_POSE); setInitialPose(null); setBefore(null); setAfter(null); setReflection(''); setObserved(false); setTried(false); }}>
                תרגול נוסף <span aria-hidden="true">↺</span>
              </button>
            </>
          )}
        </section>
      </div>

      <footer className="cc-footer">
        <span>{observed ? '✓' : '○'} זיהוי</span>
        <span>{tried ? '✓' : '○'} תרגול</span>
        <span>מקור: Dilts &amp; Gilligan, COACH / CRASH · עיבוד חווייתי לתרגול</span>
      </footer>
    </div>
  );
}
