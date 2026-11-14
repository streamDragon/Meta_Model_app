import { useMemo, useState } from 'react';
import { band, challenges, certaintyPrompts, coachPraise, directions, feelingPrompts, missions, shuffle, topics, type Direction, type Option, type Topic } from '../../data/framingCrossGame';
import './framing-tool.css';

type Finding = { direction:Direction; text:string; response:string; question:string; feeling:string; certainty:number };
type Phase = 'choose'|'response'|'emotion'|'certainty'|'complete'|'challenge'|'insight'|'finished';
const axes:Direction[]=['north','west','east','south'];
const pick = <T,>(arr:readonly T[]) => arr[Math.floor(Math.random()*arr.length)];

export function FramingToolPage(){
 const [topic,setTopic]=useState<Topic>('problem');
 const [missionOrder,setMissionOrder]=useState(()=>shuffle(missions));
 const [index,setIndex]=useState(0);
 const [phase,setPhase]=useState<Phase>('choose');
 const [questionOptions,setQuestionOptions]=useState(()=>shuffle(missions[0].options));
 const [selected,setSelected]=useState<Option|null>(null);
 const [findings,setFindings]=useState<Finding[]>([]);
 const [feelingQ,setFeelingQ]=useState(pick(feelingPrompts));
 const [certaintyQ,setCertaintyQ]=useState(pick(certaintyPrompts));
 const [coachMessage,setCoachMessage]=useState('');
 const [mapExpanded,setMapExpanded]=useState(false);
 const [showLegend,setShowLegend]=useState(false);
 const [showHelp,setShowHelp]=useState(false);
 const [challengeOptions,setChallengeOptions]=useState(()=>shuffle(challenges));
 const [challengeSelected,setChallengeSelected]=useState<Option|null>(null);
 const [challengeFeedback,setChallengeFeedback]=useState('');
 const current=missionOrder[index];
 const collected=useMemo(()=>axes.reduce((acc,d)=>({...acc,[d]:findings.filter(f=>f.direction===d)}),{} as Record<Direction,Finding[]>),[findings]);

 function restart(next:Topic){
  const nextOrder=shuffle(missions);
  setTopic(next);setMissionOrder(nextOrder);setQuestionOptions(shuffle(nextOrder[0].options));
  setIndex(0);setPhase('choose');setSelected(null);setFindings([]);
  setCoachMessage('');setMapExpanded(false);setChallengeSelected(null);
  setChallengeOptions(shuffle(challenges));setChallengeFeedback('');
 }
 function choose(option:Option){
  if(!option.good){
   setCoachMessage('זאת שאלה שאולי תועיל בשלב אחר, אבל היא לא חוקרת את הכיוון שביקשנו. נסה שוב.');
   return;
  }
  setSelected(option);setCoachMessage(pick(coachPraise));
  setFeelingQ(pick(feelingPrompts));setCertaintyQ(pick(certaintyPrompts));setPhase('response');
 }
 function capture(){
  if(!selected||!current)return;
  setFindings(prev=>[...prev,{
   direction:current.direction,text:selected.finding||'',response:selected.reply||'',question:selected.text,
   feeling:selected.feeling||'',certainty:selected.certainty??0
  }]);
  const next=index+1;
  setSelected(null);setCoachMessage('');
  if(next===missionOrder.length){setPhase('complete');setMapExpanded(true);}
  else{setIndex(next);setQuestionOptions(shuffle(missionOrder[next].options));setPhase('choose');}
 }
 function pickChallenge(option:Option){
  if(!option.good){setChallengeFeedback('השאלה הזאת אינה אחד משני הכיוונים המרכזיים שנבחרו למקרה. נסה למצוא שאלה שמשנה את הקשר בין עובדה למסקנה.');return;}
  setChallengeSelected(option);setChallengeFeedback('כיוון מתאים. עכשיו נשאל ונקשיב לתשובה.');setPhase('insight');
 }
 const synthesis = findings.length ? [
  'האדם מבקש קרבה והדדיות, ובמקביל מנסה להגן על עצמו מתחושת דחייה.',
  ...axes.map(direction=>{
   const items=collected[direction];
   return items.length ? `${directions[direction].title}: ${items.map(item=>item.text).join('; ')}.` : '';
  }).filter(Boolean),
  'זוהי המפה של הדובר כפי שנחשפה בתרגול. אין כאן קביעה מה באמת חושבת החברה.'
 ] : [];

 return <main className="ftg" dir="rtl">
  <header className="ftg-header">
   <span className="ftg-eyebrow">פריימינג טול · אימון מודרך</span>
   <h2>מה המשפט לא מספר לנו?</h2>
   <p>ארבעה כיוונים, מפה אחת. קודם מגלים את עולמו של האדם, ורק אחר כך מאתגרים.</p>
  </header>
  <div className="ftg-toolbar">
   <div className="ftg-topics" aria-label="סוג הנושא">{(['problem','goal','resource'] as Topic[]).map(k=><button key={k} className={topic===k?'active':''} aria-pressed={topic===k} onClick={()=>restart(k)}>{topics[k].label}</button>)}</div>
   <button className="ftg-quiet" onClick={()=>setShowLegend(!showLegend)} aria-expanded={showLegend}>◉ מקרא ודאות</button>
  </div>
  {showLegend&&<section className="ftg-legend" aria-label="מקרא ודאות"><span><i className="ftg-mark high"/>8–10 ביטחון גבוה</span><span><i className="ftg-mark medium"/>5–7 בינוני</span><span><i className="ftg-mark low"/>1–4 נמוך</span><span><i className="ftg-mark unknown"/>לא נשאל</span><small>הצבע מציג את מידת הוודאות של הדובר, לא את נכונות הטענה בעולם.</small></section>}
  <section className="ftg-statement" aria-label="הנושא שבמרכז"><small>מה שהאדם אמר</small><blockquote>{topics[topic].statement}</blockquote></section>
  <section className="ftg-compass-section" aria-label="מפת הפריימינג">
   <div className="ftg-map-heading"><strong>מפת האדם</strong><span>{findings.length} מתוך {missions.length} כיוונים שנחקרו</span><button onClick={()=>setMapExpanded(!mapExpanded)} aria-expanded={mapExpanded}>{mapExpanded?'צמצם':'פתח מפה'} ◉</button></div>
   <div className="ftg-cross">
    <div className="ftg-axis ftg-axis-v"/><div className="ftg-axis ftg-axis-h"/>
    <div className="ftg-cross-node north"><strong>↑ {directions.north.title}</strong><small>{collected.north[0]?.text||'עדיין אין מידע'}</small>{collected.north.length>0&&<span className={`ftg-mark ${band(collected.north[0].certainty)}`}/>}</div>
    <div className="ftg-cross-node west"><strong>← {directions.west.title}</strong><small>{collected.west[0]?.text||'עדיין אין מידע'}</small>{collected.west.length>0&&<span className={`ftg-mark ${band(collected.west[0].certainty)}`}/>}</div>
    <div className="ftg-cross-center"><small>הנושא</small><strong>{topics[topic].label}</strong></div>
    <div className="ftg-cross-node east"><strong>{directions.east.title} →</strong><small>{collected.east[0]?.text||'עדיין אין מידע'}</small>{collected.east.length>0&&<span className={`ftg-mark ${band(collected.east[0].certainty)}`}/>}</div>
    <div className="ftg-cross-node south"><strong>↓ {directions.south.title}</strong><small>{collected.south[0]?.text||'עדיין אין מידע'}</small>{collected.south.length>0&&<span className={`ftg-mark ${band(collected.south[0].certainty)}`}/>}</div>
   </div>
   {mapExpanded&&<div className="ftg-details">
    {axes.map(d=><div className="ftg-details-group" key={d}><strong>{directions[d].arrow} {directions[d].title}</strong>
    {collected[d].length===0?<span className="ftg-muted">טרם נאסף מידע</span>:collected[d].map((f,i)=><div className="ftg-finding" key={i}><i className={`ftg-mark ${band(f.certainty)}`}/><span>{f.text}<small>רגש: {f.feeling} · ודאות: {f.certainty}/10</small></span></div>)}</div>)}
   </div>}
  </section>
  {phase==='choose'&&current&&<section className="ftg-training" aria-live="polite">
   <div className="ftg-guide"><span className="ftg-avatar">✦</span><div><small>המדריכה · סבב {index+1} מתוך {missionOrder.length}</small><p>{current.coach}</p></div></div>
   <h3>איזו שאלה תשאל?</h3>
   <div className="ftg-options">{questionOptions.map(o=><button key={o.id} onClick={()=>choose(o)}>{o.text}</button>)}</div>
   {coachMessage&&<p className="ftg-feedback" role="status">{coachMessage}</p>}
  </section>}
  {(phase==='response'||phase==='emotion'||phase==='certainty')&&selected&&<section className="ftg-training" aria-live="polite">
   <div className="ftg-guide"><span className="ftg-avatar">✦</span><p>{coachMessage}</p></div>
   <div className="ftg-said"><small>שאלת המטפל</small><p>{selected.text}</p><small>תשובת המטופל המדומה</small><strong>{selected.reply}</strong></div>
   {phase==='response'&&<button className="ftg-primary" onClick={()=>setPhase('emotion')}>שאל על הרגש</button>}
   {(phase==='emotion'||phase==='certainty')&&<div className="ftg-follow">
     <p>{feelingQ}</p><strong>״{selected.feeling}״</strong>
     {phase==='emotion'&&<button className="ftg-primary" onClick={()=>setPhase('certainty')}>שאל על ודאות</button>}
   </div>}
   {phase==='certainty'&&<div className="ftg-follow"><p>{certaintyQ}</p><strong>״{selected.certainty} מתוך 10״</strong><small>זוהי ודאות סובייקטיבית של המטופל המדומה.</small><button className="ftg-primary" onClick={capture}>הוסף למפה והמשך</button></div>}
  </section>}
  {phase==='complete'&&<section className="ftg-training" aria-live="polite">
   <div className="ftg-guide"><span className="ftg-avatar">✦</span><p>מיפינו את ארבעת הכיוונים. עכשיו נסתכל על התמונה השלמה, בלי לשנות דבר בדברי האדם.</p></div>
   <h3>הניסוח השלם של המפה</h3><div className="ftg-synthesis">{synthesis.map((line,i)=><p key={i}>{line}</p>)}</div>
   <button className="ftg-primary" onClick={()=>{setPhase('challenge');setChallengeOptions(shuffle(challenges));}}>עבור לשלב האתגור</button>
  </section>}
  {phase==='challenge'&&<section className="ftg-training" aria-live="polite">
   <div className="ftg-guide"><span className="ftg-avatar">✦</span><p>עכשיו, כשהמפה נחשפה, איזו שאלה עשויה ליצור שינוי משמעותי? יש שתי אפשרויות טובות.</p></div>
   <div className="ftg-options">{challengeOptions.map(o=><button key={o.id} onClick={()=>pickChallenge(o)}>{o.text}</button>)}</div>
   {challengeFeedback&&<p role="status" className="ftg-feedback">{challengeFeedback}</p>}
  </section>}
  {phase==='insight'&&challengeSelected&&<section className="ftg-training" aria-live="polite">
   <p className="ftg-feedback">{challengeFeedback}</p><button className="ftg-primary" onClick={()=>setPhase('finished')}>שאל את המטופל: {challengeSelected.text}</button>
  </section>}
  {phase==='finished'&&challengeSelected&&<section className="ftg-training" aria-live="polite">
   <h3>פריצת דרך אפשרית</h3><blockquote className="ftg-breakthrough">״{challengeSelected.reply}״</blockquote><p>{challengeSelected.finding}</p>
   <p className="ftg-muted">זו תגובה אחת מתוסרטת, לא תוצאה טיפולית מובטחת.</p><button className="ftg-primary" onClick={()=>restart(topic)}>תרגול מחדש</button>
  </section>}
  <details className="ftg-help" open={showHelp} onToggle={e=>setShowHelp(e.currentTarget.open)}>
   <summary>למה יש שתי שאלות נכונות?</summary>
   <p>בשיחה אמיתית ייתכנו כמה שאלות טובות לאותו כיוון. כל שאלה תחשוף היבט מעט אחר של מפת האדם. המטרה אינה לדקלם שאלה אחת, אלא להבין איזה מידע היא עשויה להביא.</p>
  </details>
  <p className="ftg-note">המטופל והמדריכה בדוגמה מתוסרטים מראש. אין כאן AI, אבחון או שמירה של מידע אישי.</p>
 </main>;
}
