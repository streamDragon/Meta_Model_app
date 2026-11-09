import { useState } from 'react';
import type { CSSProperties } from 'react';
import { BODY_CUE_CASES, ZONE_LABELS } from './bodyCueCases';
import type { BodyCueCase, BodyGroup, BodyZone, PoseId } from './bodyCueCases';
import './BodyCueLab.css';

type Pose = { head: number; lean: number; arms: 'open' | 'folded' | 'chin' | 'close' | 'handchest' | 'forward' | 'headtouch' | 'low'; step: boolean; grin: boolean; brow: boolean; };
const DEFAULT: Pose = { head: 0, lean: 0, arms: 'close', step: false, grin: false, brow: false };
const POSES: Record<PoseId, Partial<Pose>> = {
  hunched: { lean: 17, head: 12, arms: 'close', brow: true },
  defensive: { arms: 'folded', brow: true },
  headtouch: { arms: 'headtouch', lean: 5, brow: true },
  withdrawn: { lean: 12, head: 17, arms: 'low' },
  guarded: { arms: 'close', brow: true },
  grounded: { arms: 'low' },
  open: { arms: 'open', grin: true },
  attentive: { arms: 'low' },
  connected: { arms: 'forward', grin: true },
  holding: { arms: 'handchest' },
  crossed: { arms: 'folded' },
  reading: { arms: 'low', head: 18, lean: 11 },
  jaw: { arms: 'low', brow: true },
  lookaside: { arms: 'low', head: -8 },
  fidget: { arms: 'close' },
  cold: { arms: 'folded', lean: 11 },
  step: { arms: 'low', step: true },
  smile: { arms: 'low', grin: true },
  upright: { arms: 'low' },
  handchest: { arms: 'handchest' },
};

function DrawPerson({ pose, activeZone, highlight, size = 'full' }: { pose: PoseId; activeZone?: BodyZone | null; highlight?: (zone: BodyZone) => void; size?: 'full' | 'small' }) {
  const p = { ...DEFAULT, ...POSES[pose] };
  const leftX = p.arms === 'open' ? 46 : p.arms === 'forward' ? 80 : p.arms === 'folded' ? 145 : p.arms === 'headtouch' ? 149 : p.arms === 'handchest' ? 160 : p.arms === 'chin' ? 164 : 106;
  const leftY = p.arms === 'open' ? 125 : p.arms === 'forward' ? 135 : p.arms === 'folded' ? 189 : p.arms === 'headtouch' ? 46 : p.arms === 'handchest' ? 159 : p.arms === 'chin' ? 105 : 225;
  const rightX = p.arms === 'open' ? 274 : p.arms === 'folded' ? 175 : p.arms === 'close' ? 214 : p.arms === 'handchest' ? 211 : 218;
  const rightY = p.arms === 'open' ? 125 : p.arms === 'folded' ? 178 : p.arms === 'close' ? 218 : 231;
  const cx = 160 - p.lean * 0.33;
  const selected = (zone: BodyZone) => zone === activeZone;
  const zones: { zone: BodyZone; x: number; y: number; label: string }[] = [
    { zone: 'face', x: cx, y: 71 + p.head, label: 'ראש ופנים' },
    { zone: 'shoulders', x: cx - 41, y: 138, label: 'כתפיים' },
    { zone: 'chest', x: cx, y: 178, label: 'חזה ונשימה' },
    { zone: 'hands', x: leftX, y: leftY, label: 'כפות ידיים' },
    { zone: 'spine', x: cx, y: 225, label: 'גב' },
    { zone: 'legs', x: 185, y: 286, label: 'רגליים' },
  ];
  return <svg className={'bodycue-person bodycue-person-' + size} viewBox="0 0 320 355" role="img" aria-label="איור דמות בתנוחה לצפייה">
    <defs>
      <linearGradient id="bodycue-shirt" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#6bc5c2"/><stop offset="1" stopColor="#2b6c91"/>
      </linearGradient>
      <radialGradient id="bodycue-backdrop"><stop offset="0" stopColor="#fff" stopOpacity=".88"/><stop offset="1" stopColor="#fff" stopOpacity="0"/></radialGradient>
    </defs>
    <circle cx="160" cy="162" r="157" fill="url(#bodycue-backdrop)"/>
    <ellipse cx="160" cy="333" rx="83" ry="12" fill="#3c607b" opacity=".12"/>
    <path d={p.step ? 'M 153 233 L 135 291 L 110 320 M 176 233 L 211 294 L 240 322' : 'M 150 233 L 137 300 L 123 322 M 174 233 L 190 300 L 207 322'} stroke="#33435f" strokeWidth="24" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    <path d={'M '+cx+' 111 L '+cx+' 144'} stroke="#b77f69" strokeWidth="18" strokeLinecap="round"/>
    <path d={'M '+(cx-39)+' 136 Q '+cx+' '+(122+p.lean)+' '+(cx+39)+' 136 L '+(cx+27)+' 241 Q '+cx+' '+(253+p.lean)+' '+(cx-26)+' 241 Z'} fill="url(#bodycue-shirt)" stroke="#275d79" strokeWidth="2"/>
    <path d={'M '+(cx-36)+' 140 Q '+(cx-55)+' 171 '+leftX+' '+leftY} stroke="#c78d75" strokeWidth="18" strokeLinecap="round" fill="none"/>
    <path d={'M '+(cx+36)+' 140 Q '+(cx+62)+' 176 '+rightX+' '+rightY} stroke="#c78d75" strokeWidth="18" strokeLinecap="round" fill="none"/>
    <circle cx={cx} cy={72+p.head} r="29" fill="#e8b49a" stroke="#ad7c67" strokeWidth="1.5"/>
    <path d={'M '+(cx-29)+' '+(72+p.head)+' Q '+cx+' '+(21+p.head)+' '+(cx+29)+' '+(72+p.head)+' L '+(cx+19)+' '+(53+p.head)+' Q '+cx+' '+(42+p.head)+' '+(cx-20)+' '+(61+p.head)+' Z'} fill="#29384d"/>
    <circle cx={cx-10} cy={78+p.head} r="2.8" fill="#1c2d3e"/>
    <circle cx={cx+10} cy={78+p.head} r="2.8" fill="#1c2d3e"/>
    {p.brow && <path d={'M '+(cx-17)+' '+(69+p.head)+' L '+(cx-5)+' '+(72+p.head)+' M '+(cx+5)+' '+(72+p.head)+' L '+(cx+17)+' '+(69+p.head)} stroke="#533e3b" strokeWidth="2.3" fill="none"/>}
    <path d={'M '+(cx-10)+' '+(92+p.head)+' Q '+cx+' '+(p.grin?104:96+p.head)+' '+(cx+10)+' '+(92+p.head)} stroke="#88534d" strokeWidth="2" fill="none"/>
    {highlight && zones.map((z) => <g key={z.zone} onClick={() => highlight(z.zone)} tabIndex={0} role="button" aria-label={'סמן '+z.label} onKeyDown={(e) => { if(e.key==='Enter'||e.key===' '){e.preventDefault();highlight(z.zone);} }} className="bodycue-hotspot">
      <circle cx={z.x} cy={z.y} r={selected(z.zone)?18:15} stroke={selected(z.zone)?'#edbf74':'#fff'} strokeWidth="2.6" fill={selected(z.zone)?'#f6bb55':'#375f98'} opacity=".92"/>
      <circle cx={z.x} cy={z.y} r="5" fill="#fff"/>
    </g>)}
  </svg>;
}
const GROUPS: { id: BodyGroup | 'all'; name: string }[] = [
  { id: 'all', name: 'הכול' }, { id: 'crash', name: 'CRASH' }, { id: 'coach', name: 'COACH' }, { id: 'ambiguous', name: 'מעורב' },
];

export function BodyCueLab() {
  const [group, setGroup] = useState<BodyGroup | 'all'>('all');
  const [cardId, setCardId] = useState<number>(1);
  const [step, setStep] = useState<0 | 1 | 2 | 3>(0);
  const [marked, setMarked] = useState<BodyZone[]>([]);
  const [choice, setChoice] = useState<'observation' | 'assumption' | null>(null);
  const [feedback, setFeedback] = useState(false);
  const [path, setPath] = useState<'body' | 'imagery'>('body');
  const [completed, setCompleted] = useState<number[]>([]);

  const cases = BODY_CUE_CASES.filter((c) => group === 'all' || c.group === group);
  const item = BODY_CUE_CASES.find((c) => c.id === cardId) ?? BODY_CUE_CASES[0];
  const correctZones = marked.filter((zone) => item.zones.includes(zone)).length;

  function pickCard(id: number) { setCardId(id); setStep(0); setMarked([]); setChoice(null); setFeedback(false); setPath('body'); }
  function chooseGroup(g: BodyGroup | 'all') { setGroup(g); const first = BODY_CUE_CASES.find((c) => g === 'all' || c.group === g); if (first) pickCard(first.id); }
  function mark(zone: BodyZone) { setMarked((prev) => prev.includes(zone) ? prev.filter((x) => x !== zone) : [...prev, zone]); }
  function nextCase() { const currentIndex = cases.findIndex((c) => c.id === item.id); pickCard(cases[(currentIndex + 1) % cases.length]?.id ?? cases[0].id); }

  return <div className="bodycue-lab" dir="rtl">
    <header className="bodycue-hero">
      <span className="bodycue-eyebrow">WISDOM GAMES · COACH / CRASH</span>
      <h2>לומדים לראות</h2>
      <p>20 תרגילי זיהוי שפה גופנית. מה באמת רואים? מה אנחנו משערים? ומה אפשר לנסות בעצמנו?</p>
      <div className="bodycue-progress"><strong>{completed.length}/20</strong><span>תרגילים שהושלמו במפגש הנוכחי</span><div className="bodycue-track"><i style={{ width: completed.length * 5 + '%' } as CSSProperties}/></div></div>
    </header>
    <div className="bodycue-tabs" role="group" aria-label="סינון מצבים">
      {GROUPS.map((g) => <button key={g.id} type="button" aria-pressed={group===g.id} className={group===g.id?'selected':''} onClick={() => chooseGroup(g.id)}>{g.name}</button>)}
    </div>
    <div className="bodycue-grid">
      <aside className="bodycue-library" aria-label="בנק התרגילים">
        <div className="bodycue-side-head"><strong>בנק התרגול</strong><small>{cases.length} מקרים</small></div>
        <div className="bodycue-card-list">
          {cases.map((c) => <button key={c.id} className={'bodycue-tile '+(c.id===cardId?'active ':'')+(completed.includes(c.id)?'completed':'')} type="button" onClick={() => pickCard(c.id)} aria-pressed={cardId===c.id}>
            <div className="bodycue-thumbnail"><DrawPerson pose={c.pose} size="small" /></div>
            <span>{String(c.id).padStart(2, '0')}</span><strong>{c.title}</strong>{completed.includes(c.id) && <span className="bodycue-check">✓</span>}
          </button>)}
        </div>
      </aside>
      <main className="bodycue-exercise">
        <div className="bodycue-case-head"><span>תרגיל {item.id} מתוך 20</span><span>{item.group === 'crash' ? 'דוגמת כיווץ' : item.group === 'coach' ? 'דוגמת פתיחות' : 'דוגמה לא חד־משמעית'}</span></div>
        <h3>{item.title}</h3>
        <p className="bodycue-context">{item.context}</p>
        <div className="bodycue-stage">
          <div className="bodycue-picture">
            <DrawPerson pose={item.pose} activeZone={marked[marked.length-1]} highlight={step===0?mark:undefined}/>
            <div className="bodycue-picture-caption">איור מבוים לצורך התרגיל, לא צילום של מצב רגשי אמיתי</div>
          </div>
          <div className="bodycue-panel">
            <div className="bodycue-steps"><span className={step===0?'active':''}>1. סימון</span><span className={step===1?'active':''}>2. הבחנה</span><span className={step===2?'active':''}>3. הסבר</span><span className={step===3?'active':''}>4. תרגול</span></div>
            {step===0 && <>
              <span className="bodycue-kicker">מזהים בגוף</span>
              <h4>מה בולט בתמונה?</h4>
              <p>לחצו על האזורים בדמות או בחרו אותם כאן.</p>
              <div className="bodycue-zone-list">{(Object.keys(ZONE_LABELS) as BodyZone[]).map((zone) => <button type="button" key={zone} className={marked.includes(zone)?'active':''} aria-pressed={marked.includes(zone)} onClick={()=>mark(zone)}>{ZONE_LABELS[zone]}</button>)}</div>
              {marked.length>0 && <span className="bodycue-mininote">בחרתם {marked.length} אזורים. {correctZones} מהם חלק ממוקד התרגיל, אך ייתכנו גם הבחנות נוספות.</span>}
              <button className="bodycue-primary" type="button" onClick={()=>setStep(1)}>המשך להבחנה ←</button>
            </>}
            {step===1 && <>
              <span className="bodycue-kicker">תצפית או השערה</span>
              <h4>מה אפשר לדעת מהתמונה?</h4>
              <p>בחרו את המשפט שהוא תיאור ישיר, לא ניחוש על הנפש.</p>
              <button type="button" className={'bodycue-answer '+(choice==='assumption'?'chosen':'')} onClick={()=>{setChoice('assumption');setFeedback(false)}}>{item.assumption}</button>
              <button type="button" className={'bodycue-answer '+(choice==='observation'?'chosen':'')} onClick={()=>{setChoice('observation');setFeedback(false)}}>{item.observation}</button>
              <button type="button" className="bodycue-primary" disabled={!choice} onClick={()=>setFeedback(true)}>בדיקת הבחירה</button>
              {feedback && <div className="bodycue-feedback" role="status">{choice==='observation'?'זוהי תצפית גופנית שאפשר לתאר.':'זהו פירוש אפשרי, לא משהו שאפשר לדעת מתוך תנוחה בלבד.'}<button type="button" onClick={()=>setStep(2)}>להסבר ←</button></div>}
            </>}
            {step===2 && <>
              <span className="bodycue-kicker">לבדוק בלי לקרוא מחשבות</span>
              <h4>מה עוד יכול להסביר את זה?</h4>
              <div className="bodycue-answer-reveal"><strong>מה רואים</strong><p>{item.observation}</p><strong>פירוש נמהר</strong><p>{item.assumption}</p><strong>אפשרות נוספת</strong><p>{item.alternative}</p></div>
              <p className="bodycue-reflect">{item.question}</p>
              <button type="button" className="bodycue-primary" onClick={()=>setStep(3)}>להתנסות בעצמי ←</button>
            </>}
            {step===3 && <>
              <span className="bodycue-kicker">מהצופה אל הגוף שלי</span>
              <h4>תרגול קצר</h4>
              <div className="bodycue-path"><button type="button" className={path==='body'?'selected':''} onClick={()=>setPath('body')}>דרך הגוף</button><button type="button" className={path==='imagery'?'selected':''} onClick={()=>setPath('imagery')}>דרך הדמיון</button></div>
              <p className="bodycue-practice">{path==='body'?item.bodyPractice:item.imageryPractice}</p>
              <p className="bodycue-mininote">התרגיל הוא הזמנה לניסוי בלבד. אין צורך לחוש שינוי, ואפשר לדלג או לעצור.</p>
              <button type="button" className="bodycue-primary" onClick={()=>setCompleted((prev)=>prev.includes(item.id)?prev:[...prev,item.id])}>סיימתי לתרגל ✓</button>
              {completed.includes(item.id)&&<button type="button" className="bodycue-next" onClick={nextCase}>לתרגיל הבא ←</button>}
            </>}
          </div>
        </div>
      </main>
    </div>
    <p className="bodycue-disclaimer">מזהים סימנים גופניים, לא מאבחנים בני אדם. איור יחיד אינו מגלה רגשות, אמינות או מצב נפשי. התרגילים מיועדים ללמידה ולתרגול אישי, לא לאבחון או לטיפול.</p>
  </div>;
}
