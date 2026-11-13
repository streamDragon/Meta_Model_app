import { useEffect, useRef, useState } from 'react';
import { revealElement } from '../../lib/reveal';
import { useProgress } from '../../store/useProgress';
import { XP_REWARDS } from '../../store/progress';
import './GuidedMetaGym.css';

/** XP for finishing all rounds; reuses the existing per-drill reward. */
const GUIDED_FINISH_XP = XP_REWARDS.trainerCorrect;

type Choice = { text:string; topic:string; why:string };
type Round = { mission:string; choices:Choice[]; correct:number; reply:string; label:string };
const rounds:Round[] = [
 {label:'פירוט',mission:'גלה מה בדיוק קשה לתלמיד.',correct:0,reply:'אני לא יודע מאיפה להתחיל את סעיף ב׳.',choices:[
 {text:'מה בדיוק קשה לך בשאלה?',topic:'פירוט',why:'בדיוק. שאלת על הפעולה שהוא מתקשה לבצע.'},
 {text:'קשה מדי ביחס למה?',topic:'השוואה',why:'שאלת השוואה טובה, אבל המשימה היא למצוא את הפעולה החסרה.'},
 {text:'איך אתה יודע שלא תצליח?',topic:'מסקנה',why:'בדקת מסקנה אפשרית. עדיין לא ביררת מה קשה לו.'},
 {text:'מי יכול לעזור לך?',topic:'משאבים',why:'שאלת משאבים מועילה, אבל כרגע נדרש פירוט.'}]},
 {label:'השוואה',mission:'חשוף את נקודת ההשוואה ב״קשה מדי״.',correct:2,reply:'בהשוואה להיסטוריה, שבה אני יודע איך להתחיל.',choices:[
 {text:'מה ניסית קודם?',topic:'פעולות',why:'זו שאלה טובה על עבר, אבל לא חושפת השוואה.'},
 {text:'מי אמר שהשאלה קשה?',topic:'מקור השיפוט',why:'זו שאלת מקור, לא השוואה.'},
 {text:'קשה מדי ביחס למה?',topic:'השוואה',why:'בדיוק. גילית את נקודת ההשוואה החסרה.'},
 {text:'מה בדיוק לא ברור בסעיף?',topic:'פירוט',why:'זו שאלת פירוט טובה, אבל לא מטרת הסבב.'}]},
 {label:'הסקת מסקנה',mission:'גלה מה התלמיד מסיק מן הקושי.',correct:1,reply:'אם איני מצליח להתחיל עכשיו, אני כנראה לא אצליח גם במבחן.',choices:[
 {text:'איזה רמז יכול לעזור?',topic:'משאבים',why:'זו שאלה לקראת פתרון, ולא בירור המסקנה.'},
 {text:'מה אתה מסיק מכך שקשה לך כרגע?',topic:'הסקת מסקנה',why:'בדיוק. נחשף הקשר בין הקושי למסקנתו על העתיד.'},
 {text:'באיזו שעה המבחן?',topic:'זמן',why:'זה מברר הקשר, אך אינו חושף מסקנה.'},
 {text:'איך הצלחת בהיסטוריה?',topic:'השוואה',why:'זה מברר השוואה שכבר זיהינו.'}]},
 {label:'שיקוף',mission:'שקף את מה ששמעת. אל תתקן ואל תייעץ.',correct:2,reply:'כן, זה בדיוק מה שהתכוונתי.',choices:[
 {text:'תתחיל מהחלק הקל ותתרגל יותר.',topic:'עצה',why:'זו הצעת פתרון, לא שיקוף.'},
 {text:'איך זה מוכיח שתיכשל במבחן?',topic:'אתגור',why:'שאלת אתגור חשובה, אבל עדיין לא שיקפת.'},
 {text:'אתה מתקשה להתחיל את סעיף ב׳ לעומת היסטוריה, וחושש שזה אומר שגם במבחן תתקשה.',topic:'שיקוף',why:'בדיוק. זה שיקוף של הפרטים שהתלמיד אישר.'},
 {text:'אתה פשוט מפחד ממתמטיקה.',topic:'פרשנות',why:'זו הכללה שלא התלמיד אמר.'}]},
 {label:'סיבה ותוצאה',mission:'אתגר את הקשר: ״לא מתחיל עכשיו, לכן לא אצליח במבחן״.',correct:3,reply:'כשאני חושב על זה, זה לא מוכיח. אני רק חושש.',choices:[
 {text:'באיזה מקצוע אתה מצליח יותר?',topic:'השוואה',why:'שאלת השוואה טובה, אבל כרגע מאתגרים קשר סיבתי.'},
 {text:'מה בדיוק לא ברור בסעיף ב׳?',topic:'פירוט',why:'פירוט מצוין, אך לא בודק את המסקנה.'},
 {text:'מי יכול לעזור לך עם השאלה?',topic:'משאבים',why:'זו שאלה על עזרה, ולא על ההכרח שבמסקנה.'},
 {text:'איך הקושי להתחיל עכשיו מוכיח שלא תצליח במבחן?',topic:'סיבה ותוצאה',why:'בדיוק. בדקת האם הסיבה בהכרח מחייבת את התוצאה.'}]},
 {label:'אפשרויות',mission:'פתח אפשרות מעשית חדשה להתחיל את סעיף ב׳.',correct:0,reply:'אני יכול לבקש רמז או לנסות דוגמה דומה קודם.',choices:[
 {text:'איזו דרך נוספת תוכל לנסות כדי להתחיל?',topic:'אפשרויות',why:'בדיוק. זו שאלה שמרחיבה את מרחב הבחירה.'},
 {text:'מה גרם לך לפחד ממבחנים?',topic:'עבר',why:'זו שאלה אפשרית על ההיסטוריה שלו, אבל עכשיו המטרה היא אפשרויות.'},
 {text:'האם במתמטיקה תמיד קשה?',topic:'הכללה',why:'זו שאלה על הכללה, לא על יצירת צעד חדש.'},
 {text:'מי קבע שהשאלה קשה?',topic:'מקור',why:'זו שאלה על מקור הקביעה, לא על דרך פעולה חדשה.'}]}
];
const depthParts = [
 <>השאלה הזאת <mark>קשה לי</mark>.</>,
 <>שאלה <mark>ב׳ במתמטיקה</mark> קשה לי, כי אני <mark>לא יודע מאיפה להתחיל אותה</mark>.</>,
 <>שאלה ב׳ במתמטיקה קשה לי להתחיל, <mark>כשאני משווה אותה לשאלות בהיסטוריה שבהן קל לי להתחיל</mark>.</>,
 <>שאלה ב׳ במתמטיקה קשה לי להתחיל, כשאני משווה אותה לשאלות בהיסטוריה, ו<mark>אני חושש שאם איני מתחיל עכשיו, לא אצליח גם במבחן</mark>.</>
];
const topics:Record<string,string> = {
 'פירוט':'מה בדיוק חסר או לא מוגדר במשפט?',
 'השוואה':'בהשוואה למי או למה? מה בסיס ההשוואה?',
 'הסקת מסקנה':'איזו משמעות או מסקנה מייחסים למקרה?',
 'סיבה ותוצאה':'איך X מחייב את Y? האם ייתכן X בלי Y?',
 'אפשרויות':'אילו צעדים ומשאבים עדיין אפשריים?'
};
const tips=['מבנה השטח: מה שנאמר בפועל. מבנה העומק: משמעות והקשר שמתגלים מתוך שאלות ומאושרים על ידי הדובר.','NLP מטרתי: שאלות טובות נבחרות לפי התוצאה שרוצים להשיג בשיחה.','מיפוי לפני אתגור: קודם מבררים ושיקופים, אחר כך מאתגרים הנחות.','הפרות מטה מודל אינן בהכרח טעויות: הן נקודות שבהן כדאי לשאול ולבדוק.'];
function chime(success:boolean){ try{ const Audio = window.AudioContext; if(!Audio)return; const ctx=new Audio(); const o=ctx.createOscillator(); const g=ctx.createGain();o.frequency.value=success?700:240;o.connect(g);g.connect(ctx.destination);g.gain.value=.045;o.start();o.stop(ctx.currentTime+.12);o.onended=()=>void ctx.close();}catch{ /* audio is optional */ } }
export function GuidedMetaGym(){
 const { addXP, recordSession } = useProgress();
 const stickyRef=useRef<HTMLElement|null>(null), feedbackRef=useRef<HTMLDivElement|null>(null), missionRef=useRef<HTMLDivElement|null>(null), finishRef=useRef<HTMLDivElement|null>(null);
 const recorded=useRef(false);
 const [scrollTo,setScrollTo]=useState<'feedback'|'mission'|'finish'|null>(null);
 const [step,setStep]=useState(0),[selected,setSelected]=useState<number|null>(null),[depthOpen,setDepthOpen]=useState(false),[help,setHelp]=useState(false),[tip,setTip]=useState(0),[hard,setHard]=useState(false),[seconds,setSeconds]=useState(40),[sound,setSound]=useState(false),[expert,setExpert]=useState(false);
 const [expertChoice,setExpertChoice]=useState(''); const [expertReason,setExpertReason]=useState('');
 const round=rounds[Math.min(step,rounds.length-1)];
 const mapped=Math.min(step,3), finished=step>=rounds.length;
 useEffect(()=>{if(!hard||selected!==null||finished)return;const id=window.setInterval(()=>setSeconds(s=>Math.max(0,s-1)),1000);return()=>window.clearInterval(id)},[hard,selected,finished,step]);
 // Keep the status bar below the app's sticky mobile top bar instead of hiding behind it.
 useEffect(()=>{const place=()=>{const bar=document.querySelector<HTMLElement>('.mobile-topbar');const sticky=stickyRef.current;if(!sticky)return;const st=bar?getComputedStyle(bar):null;sticky.style.top=(bar&&st&&(st.position==='sticky'||st.position==='fixed')&&st.display!=='none'?bar.offsetHeight:0)+'px';};place();window.addEventListener('resize',place);return()=>window.removeEventListener('resize',place);},[]);
 useEffect(()=>{if(!finished||recorded.current)return;recorded.current=true;addXP(GUIDED_FINISH_XP);recordSession();},[finished,addXP,recordSession]);
 useEffect(()=>{if(!scrollTo)return;const el=scrollTo==='feedback'?feedbackRef.current:scrollTo==='mission'?missionRef.current:finishRef.current;const sticky=stickyRef.current;const extra=sticky&&getComputedStyle(sticky).position==='sticky'?sticky.offsetHeight:0;revealElement(el,scrollTo==='feedback'?'end':'start',extra);setScrollTo(null);},[scrollTo]);
 const pick=(index:number)=>{if(selected!==null)return;setSelected(index);if(sound)chime(index===round.correct);setScrollTo('feedback');};
 const next=()=>{const last=step+1>=rounds.length;setStep(s=>Math.min(s+1,rounds.length));setSelected(null);setSeconds(hard?15:40);setDepthOpen(false);setScrollTo(last?'finish':'mission');};
 const go=(hash:string)=>{window.location.hash=hash;};
 const restart=()=>{recorded.current=false;setScrollTo('mission');setStep(0);setSelected(null);setSeconds(hard?15:40);setDepthOpen(false);setExpert(false);setExpertChoice('');setExpertReason('')};
 const phase=step<3?'בירור':step===3?'שיקוף':'אתגור';
 const progress=Math.min(100,14+step*14);
 return <div className="gmg" dir="rtl">
 <header className="gmg-sticky" ref={stickyRef}>
  <div className="gmg-dashboard"><strong>מצפן השיחה</strong><span>מרחב האפשרויות: {progress}%</span></div>
  <div className="gmg-meters">{[['רגש','🙂',Math.min(90,24+step*8)],['הזדהות','🪞',Math.max(20,90-step*10)],['ודאות','◉',Math.max(25,88-step*9)],['פתיחות','🌱',Math.min(95,12+step*14)]].map(([label,ico,n])=><div className="gmg-meter" key={String(label)} title={String(label)+': מד המחשה של השיחה המתוסרטת'} aria-label={String(label)+' '+n+'%'}><span><b aria-hidden="true">{ico}</b> <em>{label}</em></span><div className="gmg-meter-track"><i style={{width:n+'%'}}/></div></div>)}</div>
  <div className="gmg-progress"><i style={{width:progress+'%'}}/></div>
 </header>
 <div className="gmg-body">
  <div className="gmg-context"><span>סיטואציה / הקשר</span><button onClick={restart}>↻ התחלה</button></div><h2>תלמיד ומורה · שיעור מתמטיקה</h2>
  <div className="gmg-stages"><span className={step<3?'active':''}>1 · בירור</span><span className={step===3?'active':''}>2 · שיקוף</span><span className={step>=4?'active':''}>3 · אתגור</span></div>
  <section className="gmg-card gmg-surface"><div className="gmg-person">🧒🏻 <b>תלמיד</b><small>מבנה השטח</small></div><div className="gmg-quote">״אוף המורה, <mark>השאלה הזאת</mark> <mark>קשה מדי.</mark>״</div><div className="gmg-actions"><button className={'gmg-depth-btn '+(step>0?'new':'')} onClick={()=>setDepthOpen(true)} aria-label="מבנה העומק הנחשף"><b className="gmg-triangle">▲</b> מבנה העומק <em>{mapped}</em></button><button onClick={()=>{setTip((tip+1)%tips.length);setHelp(true)}}>💡</button><button onClick={()=>setSound(v=>!v)}>{sound?'🔊':'🔇'}</button></div></section>
  <section className="gmg-card">
   {finished?<><div className="gmg-finish" ref={finishRef}><div className="gmg-stars">⭐ ⭐ ⭐</div><h2>נפתחו אפשרויות חדשות!</h2><p>המשפט קיבל הקשר, שיקפנו אותו ואתגרנו את ההנחה.</p><p className="gmg-xp">+{GUIDED_FINISH_XP} XP · האימון נשמר בהתקדמות</p></div><div className="gmg-final"><small>מבנה השטח</small><p>״אוף המורה, השאלה הזאת קשה מדי.״</p><small>מבנה העומק שנחשף</small><p>שאלה ב׳ במתמטיקה קשה לי להתחיל ביחס להיסטוריה, ואני חושש שהקושי כרגע אומר שגם במבחן לא אצליח.</p><small>אחרי האתגור</small><p>אני מתקשה להתחיל כרגע, אבל זה לא מוכיח שאכשל. אפשר לבקש רמז או להתחיל מדוגמה דומה.</p></div><div className="gmg-reply">🧒🏻 ״מעניין, לא חשבתי על זה ככה. עכשיו יש לי כמה אפשרויות.״</div><button className="gmg-primary" onClick={restart}>תרגול נוסף ↻</button><div className="gmg-onward"><span>להמשיך מכאן:</span><button className="gmg-secondary" onClick={()=>go('conversation')}>💬 אימון שיחה</button><button className="gmg-secondary" onClick={()=>go('practice')}>🎮 תרגול זיהוי</button></div></>:
   <>
    <div className="gmg-teacher" ref={missionRef}><div className="gmg-avatar">👩🏻‍🏫</div><div><small>מדריכת NLP · {phase}</small><strong>{round.mission}</strong></div></div>
    <div className="gmg-questionhead"><h3>{step===3?'איזה שיקוף תיתן?':'איזו שאלה תשאל?'}</h3><div className="gmg-settings"><button className={!hard?'on':''} onClick={()=>{setHard(false);setSeconds(40)}}>קל</button><button className={hard?'on':''} onClick={()=>{setHard(true);setSeconds(15)}}>קשה</button><span>⏱ {seconds}</span></div></div>
    <div className="gmg-choices">{round.choices.map((c,i)=><button key={i} disabled={selected!==null} className={selected===i?(i===round.correct?'correct':'miss'):''} onClick={()=>pick(i)}>{c.text}</button>)}</div>
    {selected!==null&&<div className="gmg-after" ref={feedbackRef}><div className={'gmg-feedback '+(selected===round.correct?'correct':'miss')}><b>👩🏻‍🏫 {selected===round.correct?'מצוין!':'זו שאלה טובה, אבל לא המשימה.'}</b><p>{round.choices[selected].why}</p></div>{selected===round.correct?<><div className="gmg-reply">🧒🏻 {round.reply}</div>{step===2&&<div className="gmg-reward">⭐ ⭐ ⭐ מבנה העומק נחשף. עכשיו משקפים.</div>}<button className="gmg-primary" onClick={next}>{step===2?'עוברים לשיקוף ←':step===3?'עוברים לאתגור ←':'ממשיכים ←'}</button></>:<button className="gmg-secondary" onClick={()=>{setSelected(null);setScrollTo('mission');}}>נסה שאלה שמקדמת את המשימה</button>}</div>}
    {step>=4&&!expert&&<button className="gmg-link" onClick={()=>setExpert(true)}>משימת מומחה: איזו הפרה הכי משמעותית כאן?</button>}
    {expert&&<div className="gmg-expert"><strong>משימת מומחה · בחירה ונימוק</strong><div className="gmg-choices">{['השוואה חסרה','סיבה ותוצאה','מחיקה','הכללה'].map(v=><button key={v} className={expertChoice===v?'correct':''} onClick={()=>setExpertChoice(v)}>{v}</button>)}</div><textarea value={expertReason} onChange={e=>setExpertReason(e.target.value)} placeholder="מה ההפרה המשמעותית, ולמה?" rows={2}/><p>אין כאן הפרה אחת נכונה בכל מצב. נמק מה מטרת השיחה.</p><button onClick={()=>setExpert(false)}>סגור</button></div>}
   </>}
  </section>
 </div>
 {depthOpen&&<div className="gmg-overlay" onClick={()=>setDepthOpen(false)}><div className="gmg-sheet" role="dialog" aria-modal="true" aria-label="מבנה העומק הנחשף" onClick={e=>e.stopPropagation()}><div className="gmg-sheethead"><h2>מבנה העומק הנחשף</h2><button onClick={()=>setDepthOpen(false)}>✕</button></div><small>מבנה השטח</small><p className="gmg-original">״אוף המורה, השאלה הזאת קשה מדי.״</p><div className="gmg-deep">{depthParts[mapped]}</div><p className="gmg-count">{mapped} מתוך 3 גילויים</p><div className="gmg-patterns">{['פירוט','השוואה','הסקת מסקנה','סיבה ותוצאה'].slice(0,mapped+(step>=4?1:0)).map(k=><details key={k}><summary>{k}</summary><p>{topics[k]}</p></details>)}</div><button className="gmg-secondary" onClick={()=>setDepthOpen(false)}>חזרה לתרגול</button></div></div>}
 {help&&<div className="gmg-overlay" onClick={()=>setHelp(false)}><div className="gmg-sheet" role="dialog" aria-modal="true" aria-label="רגע רעיוני" onClick={e=>e.stopPropagation()}><div className="gmg-sheethead"><h2>💡 רגע רעיוני</h2><button onClick={()=>setHelp(false)}>✕</button></div><p>{tips[tip]}</p><button className="gmg-secondary" onClick={()=>setTip((tip+1)%tips.length)}>רעיון נוסף</button></div></div>}
 </div>
}
