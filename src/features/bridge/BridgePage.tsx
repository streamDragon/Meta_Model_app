import { useEffect, useRef, useState } from 'react';
import {
  ADDRESS_FORMS, BRIDGE_REVIEW_DAYS, bridgeMomentQuestion, bridgeRisk, buildNameOffers,
  buildNeedToKnowQuestion, buildTriggerPrompt, canMoveOn, makeCardText, newBridgeDraft,
  offerToName, sideLabel, valueLabel, type BodyFit, type BodySensation,
  type BridgeDraft, type BridgeMoment, type BridgeSide, type SavedBridge,
} from './bridgeEngine';
import {
  BRIDGE_UPDATED_EVENT, clearBridgeDraft, deleteAllBridgeData, dueBridgeReviews,
  loadBridgeCards, loadBridgeDraft, makeBridgeCard, markBridgeReview,
  saveBridgeCard, saveBridgeDraft, type DueBridgeReview,
} from '../../store/bridgeStore';
import './bridge.css';

const STEP_LABELS=['מתחילים','ה״או״','שני הצדדים','רגעים אמיתיים','השהיה','שאלת הגשר','שם חדש','בדיקת גוף','בדיקת המציאות','הכרטיס'];
const EXAMPLES=[
  ['לכבד את אבא שלי','להיות האבא שאני רוצה להיות לילדים','כשאבא מתקשר בערב ומעיר על החינוך'],
  ['להשקיע בעבודה','להיות פנוי למשפחה','כשמגיעה בקשה חדשה מהעבודה'],
  ['לומר את האמת','לשמור על השלום','כשמישהו שואל אותי שאלה לא נוחה'],
] as const;
const SENSATIONS: Array<{id:BodySensation;name:string}>=[
  {id:'breath',name:'נשימה עמוקה יותר'}, {id:'chest',name:'רוגע בחזה'},
  {id:'warmth',name:'חום'}, {id:'tears',name:'דמעות'}, {id:'smile',name:'חיוך'},
  {id:'neutral',name:'שום דבר מיוחד'}, {id:'tension',name:'מתח'}, {id:'contraction',name:'כיווץ'},
];
const THEORY:Record<number,{title:string;description:string}>={
  1:{title:'שתי אפשרויות שנתפסות כמנוגדות',description:'מזהים שני ערכים ואת רגע ההפעלה, בלי להסיק שמישהו טועה.'},
  2:{title:'כוונה חיובית ושני חלקים',description:'לכל צד יש היגיון וערך משלו. הפרדה לפני חיבור; שורת ברין 1 היא מיפוי המוזכר במקור, ודורשת אימות מקורות.'},
  3:{title:'Inventory, שורות 6–7',description:'אוספים חוויות אמיתיות: ראייה, שמיעה, תחושת גוף. שלוש דוגמאות הן הזמנה, לא תנאי לשינוי.'},
  4:{title:'השהיה',description:'לא ממהרים לנסח הבנה. מאפשרים רגע של תשומת לב, בלי לכפות נשימה או תגובה.'},
  5:{title:'הנחת יסוד עדינה',description:'המילים ״איך״ ו״גם״ מציעות חיבור, אבל לא קובעות שהוא כבר קיים; למשתמש מותר לא לדעת.'},
  6:{title:'Lost performative',description:'הצעות שמתחילות ב״יש שקוראים לזה״ אינן סמכות חיצונית. המשתמש בוחר שם או משנה אותו.'},
  7:{title:'Gendlin: resonating',description:'בודקים עם האדם האם הביטוי מתאים לחוויה, בלי להפוך תחושת גוף לבדיקה של אמת.'},
  8:{title:'TOTE, reality strategy',description:'חוזרים לטריגר ומבקשים סימן חווייתי להבדל. שינוי במדד איננו הוכחה ליעילות טיפולית.'},
  9:{title:'שימור וחזרה מרווחת',description:'שומרים כרטיס ומזמינים חזרה אחרי יום, שלושה ימים ושבעה ימים. זהו מעקב עצמי, לא מבחן קליני.'},
};

function IconTrail({draft}:{draft:BridgeDraft}) {
  return <details className="bridge-trail"><summary>הדרך שלי עד עכשיו</summary>
    <div className="bridge-trail-content">
      {draft.sideA && <p><b>צד ראשון:</b> {draft.sideA}</p>}
      {draft.sideB && <p><b>צד שני:</b> {draft.sideB}</p>}
      {draft.valueA && <p><b>חשוב לי:</b> {draft.valueA}</p>}
      {draft.valueB && <p><b>וגם:</b> {draft.valueB}</p>}
      {draft.moments.some(m=>m.scene) && <p><b>רגע:</b> {draft.moments.find(m=>m.scene)?.scene}</p>}
      {draft.chosenName && <p><b>השם שלי:</b> {draft.chosenName}</p>}
    </div>
  </details>;
}
function Field({id,label,value,onChange,placeholder='',required=false,rows=0}:{id:string;label:string;value:string;onChange:(x:string)=>void;placeholder?:string;required?:boolean;rows?:number}) {
  return <label className="bridge-field" htmlFor={id}>
    <span>{label}{required && <sup aria-hidden="true"> *</sup>}</span>
    {rows>0?<textarea id={id} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} rows={rows} maxLength={450} required={required}/>
      :<input id={id} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} maxLength={450} required={required}/>}
  </label>;
}
function PractitionerPanel({step}:{step:number}) {
  const t=THEORY[step];
  if(!t)return null;
  return <details className="bridge-theory"><summary>🧭 מה עשינו כאן? · למטפלים</summary>
    <strong>{t.title}</strong><p>{t.description}</p>
    <small>לשימוש בהסכמת האדם. כלי תרגול בלבד, לא פרוטוקול טיפול.</small>
  </details>;
}
export function BridgePage() {
  const [draft,setDraft]=useState<BridgeDraft>(loadBridgeDraft);
  const [cards,setCards]=useState<SavedBridge[]>(loadBridgeCards);
  const [savedId,setSavedId]=useState<string|null>(null);
  const [storageFailed,setStorageFailed]=useState(false);
  const [showOffers,setShowOffers]=useState(false);
  const [seconds,setSeconds]=useState(20);
  const [review,setReview]=useState<DueBridgeReview|null>(null);
  const [reviewFit,setReviewFit]=useState<BodyFit>('');
  const [reviewAction,setReviewAction]=useState<'yes'|'no'|'not-yet'>('not-yet');
  const [copyNote,setCopyNote]=useState('');
  const [confirmDelete,setConfirmDelete]=useState(false);
  const top=useRef<HTMLDivElement|null>(null);
  const suppressNextSave=useRef(false);
  const risk=bridgeRisk(draft);
  const forms=ADDRESS_FORMS[draft.address];
  const due=dueBridgeReviews(cards);
  const chosenCard=cards.find(c=>c.id===savedId);

  useEffect(()=>{
    const update=()=>setCards(loadBridgeCards());
    window.addEventListener(BRIDGE_UPDATED_EVENT,update);
    window.addEventListener('storage',update);
    return ()=>{window.removeEventListener(BRIDGE_UPDATED_EVENT,update);window.removeEventListener('storage',update);};
  },[]);
  useEffect(()=>{
    if (suppressNextSave.current) { suppressNextSave.current=false; return; }
    if (!saveBridgeDraft(draft)) setStorageFailed(true);
    else setStorageFailed(false);
  },[draft]);
  useEffect(()=>{
    if(draft.step!==4 || review)return;
    setSeconds(20);
    const timer=window.setInterval(()=>setSeconds(s=>Math.max(0,s-1)),1000);
    return ()=>window.clearInterval(timer);
  },[draft.step,review]);
  useEffect(()=>{
    try{top.current?.scrollIntoView({behavior:'smooth',block:'start'});}catch{ /* tests/older browsers */ }
  },[draft.step,review]);

  const update=(patch:Partial<BridgeDraft>)=>{setDraft(old=>({...old,...patch}));setSavedId(null);setCopyNote('');};
  const side=(i:BridgeSide)=>sideLabel(i,draft);
  const value=(i:BridgeSide)=>valueLabel(i,draft);
  const changeMoment=(index:number,key:keyof BridgeMoment,newValue:string)=>{
    setDraft(old=>({...old,moments:old.moments.map((m,j)=>j===index?{...m,[key]:newValue}:m)}));
    setSavedId(null);
  };
  const addMoment=()=>{
    if(draft.moments.length>=3)return;
    update({moments:[...draft.moments,{scene:'',saw:'',heard:'',felt:''}]});
  };
  const reset=()=>{const fresh=newBridgeDraft();suppressNextSave.current=true;clearBridgeDraft();setDraft(fresh);setSavedId(null);setReview(null);setShowOffers(false);setCopyNote('');setConfirmDelete(false);};
  const deleteEverything=()=>{deleteAllBridgeData();reset();setCards([]);};
  const save=()=>{
    if(risk)return;
    const card=makeBridgeCard(draft);
    if(saveBridgeCard(card)){setCards(loadBridgeCards());setSavedId(card.id);setStorageFailed(false);}
    else setStorageFailed(true);
  };
  const doCopy=async()=>{
    if(!chosenCard)return;
    try{
      if(!navigator.clipboard?.writeText)throw new Error('unsupported');
      await navigator.clipboard.writeText(makeCardText(chosenCard));
      setCopyNote('הכרטיס הועתק.');
    }catch{setCopyNote('ההעתקה אינה זמינה בדפדפן הזה.');}
  };
  const startReview=(entry:DueBridgeReview)=>{setReview(entry);setReviewFit('');setReviewAction('not-yet');};
  const submitReview=()=>{
    if(!review || !reviewFit)return;
    if(markBridgeReview(review.card.id,review.day,reviewFit,reviewAction)){
      setCards(loadBridgeCards());setReview(null);
    }else setStorageFailed(true);
  };
  const move=(direction:-1|1)=>{
    if(risk)return;
    if(direction===1 && !canMoveOn(draft))return;
    if(draft.step===7 && direction===1){
      const uneasy=draft.fit==='no'||draft.sensations.includes('tension')||draft.sensations.includes('contraction');
      if(draft.fit==='almost' && !uneasy && draft.checkLoops<3){
        update({step:6,checkLoops:draft.checkLoops+1,fit:'',almost:''});
        return;
      }
      if(uneasy && draft.checkLoops<3) {
        if(!draft.needToKnow.trim())return;
        update({step:6,checkLoops:draft.checkLoops+1,fit:'',sensations:[],needToKnow:''});
        return;
      }
      if(!draft.fit)return;
    }
    update({step:Math.max(0,Math.min(9,draft.step+direction))});
  };
  const noAnswer=()=>{
    if(draft.momentAttempt<draft.moments.filter(m=>m.scene.trim()).length-1){
      update({momentAttempt:draft.momentAttempt+1});
    }else update({step:6});
  };
  const followUp = review ? <section className="bridge-review" aria-label="חזרה על הגשר">
    <span className="bridge-eyebrow">חזרה · יום {review.day}</span>
    <h2>{review.card.draft.chosenName}</h2>
    <p>אפשר לקרוא את הכרטיס ולבדוק שוב. אין צורך להרגיש משהו מסוים.</p>
    <p className="bridge-review-combination">{sideLabel('a',review.card.draft)} <b>וגם</b> {sideLabel('b',review.card.draft)}</p>
    <blockquote className="bridge-review-name" aria-label="השם שבחרת">{review.card.draft.chosenName}</blockquote>
    <div className="bridge-options" role="group" aria-label="האם השם עדיין מתאים">
      {([['yes','מתאים'],['almost','כמעט'],['no','לא']] as const).map(([id,label])=><button type="button" key={id} aria-pressed={reviewFit===id} onClick={()=>setReviewFit(id)}>{label}</button>)}
    </div>
    <h3>האם הצעד הקטן קרה?</h3><p>{review.card.draft.nextAction||'לא הוגדר צעד מסוים'}</p>
    <div className="bridge-options" role="group" aria-label="האם הצעד קרה">
      {([['yes','כן'],['no','לא'],['not-yet','עדיין לא']] as const).map(([id,label])=><button key={id} type="button" aria-pressed={reviewAction===id} onClick={()=>setReviewAction(id)}>{label}</button>)}
    </div>
    <div className="bridge-actions"><button type="button" className="bridge-secondary" onClick={()=>setReview(null)}>חזרה</button><button type="button" className="bridge-primary" disabled={!reviewFit} onClick={submitReview}>שמירת החזרה</button></div>
  </section>:null;

  const renderStep=()=>{
    switch(draft.step){
      case 0:return <>
        <div className="bridge-intro-illustration" aria-hidden="true"><span>או</span><span>↝</span><strong>וגם</strong></div>
        <h2>כשנראה שצריך לבחור בין שני דברים חשובים</h2>
        <p className="bridge-intro">בשבע דקות בערך ניתן לכל צד מקום, ניזכר ברגעים אמיתיים ונבדוק אם אפשר למצוא דרך שמכבדת את שניהם.</p>
        <fieldset className="bridge-fieldset"><legend>איך לפנות אליך?</legend>
          <div className="bridge-options">
            {([['f','את'],['m','אתה'],['pl','אתם']] as const).map(([v,label])=><button type="button" key={v} aria-pressed={draft.address===v} onClick={()=>update({address:v})}>{label}</button>)}
          </div>
        </fieldset>
        <fieldset className="bridge-fieldset"><legend>איך להשתמש בתרגול?</legend>
          <div className="bridge-options">
            <button type="button" aria-pressed={draft.mode==='self'} onClick={()=>update({mode:'self'})}>לעצמי</button>
            <button type="button" aria-pressed={draft.mode==='practitioner'} onClick={()=>update({mode:'practitioner'})}>עם מטופל או מתאמן</button>
          </div>
        </fieldset>
        <p className="bridge-privacy">🔒 הטקסט נשמר רק בדפדפן הזה ולא נשלח למודל AI. אפשר למחוק הכול בכל רגע. השתמשו בדוגמאות בדויות או בלי פרטים מזהים.</p>
        <p className="bridge-disclaimer">כלי תרגול לקונפליקטים יומיומיים, לא טיפול ולא סיוע במשבר. במצב של סכנה או מצוקה חריפה יש לפנות לאיש מקצוע או לשירותי חירום.</p>
        {due.length>0&&<div className="bridge-due" aria-label="חזרות שממתינות"><strong>גשרים לחזרה</strong>
          {due.slice(0,3).map((entry)=><button key={entry.card.id+'-'+entry.day} type="button" onClick={()=>startReview(entry)}>יום {entry.day} · {entry.card.draft.chosenName||'הגשר שלי'}</button>)}
        </div>}
        {cards.length>0&&<details className="bridge-archive"><summary>הכרטיסים שלי ({cards.length})</summary>
          {cards.map(card=><p key={card.id}>{card.draft.chosenName||'גשר ללא שם'} · נשמר {new Date(card.savedAt).toLocaleDateString('he-IL')}</p>)}
        </details>}
      </>;
      case 1:return <>
        <h2>מה הם שני הדברים שנראה שאי אפשר את שניהם?</h2>
        <p>שני דברים שחשובים לך, לא שני אנשים שצריך לבחור ביניהם.</p>
        <Field id="bridge-side-a" label="מצד אחד" value={draft.sideA} onChange={v=>update({sideA:v})} required placeholder="לכבד את אבא שלי"/>
        <div className="bridge-or" aria-hidden="true">או</div>
        <Field id="bridge-side-b" label="ומצד שני" value={draft.sideB} onChange={v=>update({sideB:v})} required placeholder="להיות הורה סבלני"/>
        <Field id="bridge-trigger" label="מתי זה הכי מושך לצד אחד? (לא חובה)" value={draft.trigger} onChange={v=>update({trigger:v})} placeholder="כשאבא מתקשר בערב"/>
        <div className="bridge-examples" aria-label="דוגמאות">
          {EXAMPLES.map(([a,b,t],i)=><button type="button" key={i} onClick={()=>update({sideA:a,sideB:b,trigger:t})}>{a} / {b}</button>)}
        </div>
      </>;
      case 2:return <>
        <h2>לכל צד יש מקום</h2>
        <p className="bridge-kindness">שני הצדדים הגיוניים. אף אחד מהם לא טועה.</p>
        <div className="bridge-dual">
          <div className="bridge-value-card"><strong>{side('a')}</strong><Field id="bridge-value-a" label={'מה חשוב לך ב־'+side('a')+'?'} value={draft.valueA} onChange={v=>update({valueA:v})} required placeholder="מה הערך שמתחת לבחירה?"/></div>
          <div className="bridge-value-card"><strong>{side('b')}</strong><Field id="bridge-value-b" label={'מה חשוב לך ב־'+side('b')+'?'} value={draft.valueB} onChange={v=>update({valueB:v})} required placeholder="מה הערך שמתחת לבחירה?"/></div>
        </div>
      </>;
      case 3:return <>
        <h2>מתי זה כבר היה בחיים שלך?</h2>
        <p>ניזכר ברגע אחד לפחות; אפשר עד שלושה. משהו שהיה באמת, אפילו רגע קטן.</p>
        <fieldset className="bridge-fieldset"><legend>מאיזה צד נאסוף רגעים?</legend>
          <div className="bridge-options">
            <button type="button" aria-pressed={draft.inventorySide==='a'} onClick={()=>update({inventorySide:'a',momentAttempt:0})}>{side('a')}</button>
            <button type="button" aria-pressed={draft.inventorySide==='b'} onClick={()=>update({inventorySide:'b',momentAttempt:0})}>{side('b')}</button>
          </div>
        </fieldset>
        <p className="bridge-kindness">רגע שבו כבר חיית את {value(draft.inventorySide)}</p>
        {draft.moments.map((m,i)=><section className="bridge-moment" key={i}>
          <strong>רגע {i+1}</strong>
          <Field id={'bridge-moment-'+i} label="מה קרה?" value={m.scene} onChange={v=>changeMoment(i,'scene',v)} required={i===0} rows={2} placeholder="למשל: כרעתי ליד יוסי, שאלתי מה שלומו"/>
          <details><summary>מה ראית, שמעת והרגשת? (לא חובה)</summary>
            <Field id={'bridge-saw-'+i} label="מה ראית?" value={m.saw} onChange={v=>changeMoment(i,'saw',v)}/>
            <Field id={'bridge-heard-'+i} label="מה שמעת?" value={m.heard} onChange={v=>changeMoment(i,'heard',v)}/>
            <Field id={'bridge-felt-'+i} label="מה הרגשת בגוף?" value={m.felt} onChange={v=>changeMoment(i,'felt',v)}/>
          </details>
          {i>0&&<button type="button" className="bridge-link" onClick={()=>update({moments:draft.moments.filter((_,j)=>j!==i),momentAttempt:0})}>הסרת הרגע</button>}
        </section>)}
        {draft.moments.length<3&&<button type="button" className="bridge-secondary" onClick={addMoment}>+ הוספת רגע נוסף</button>}
      </>;
      case 4:return <>
        <h2>רגע לתת לזה לשקוע</h2>
        <p>{forms.pause} רגע. {forms.grow} לחוויה לגדול בקצב שלה.</p>
        <div className="bridge-breath" role="img" aria-label="עיגול מתרחב ומתכווץ בקצב איטי, ניתן לדלג">
          <span className="bridge-breath-circle" aria-hidden="true"/>
          <strong>{seconds===0?'אפשר להמשיך':seconds+' שניות'}</strong>
        </div>
        <blockquote>{draft.moments.find(m=>m.scene)?.scene}</blockquote>
        <p className="bridge-small">אין צורך לעשות משהו עם הנשימה או להרגיש שינוי. אפשר לדלג.</p>
      </>;
      case 5:return <>
        <h2>שאלת הגשר</h2>
        <p>אפשר לשאול בעדינות, בלי להכריח תשובה.</p>
        <blockquote className="bridge-question">{bridgeMomentQuestion(draft)}</blockquote>
        <p className="bridge-small">אין צורך לענות מיד. לפעמים רק השאלה פותחת כיוון.</p>
        <Field id="bridge-answer" label="מה עולה לך?" value={draft.bridgeAnswer} onChange={v=>update({bridgeAnswer:v})} rows={3} placeholder="אולי יש כאן מקום גם ל..."/>
        <button type="button" className="bridge-secondary" onClick={noAnswer}>{draft.momentAttempt<draft.moments.filter(m=>m.scene.trim()).length-1?'אין לי עדיין תשובה · רגע אחר':'אין לי עדיין תשובה · להמשיך בלי לכפות'}</button>
      </>;
      case 6:return <>
        <h2>איך היית קורא לזה במילים שלך?</h2>
        <p>השם הוא שלך. אין תשובה אחת נכונה.</p>
        <Field id="bridge-name" label="השם שלי" value={draft.chosenName} onChange={v=>update({chosenName:v})} required placeholder="למשל: כבוד שמאפשר לי להיות אבא נוכח"/>
        <button type="button" className="bridge-secondary" onClick={()=>setShowOffers(v=>!v)}>{showOffers?'הסתרת רעיונות':'קשה לי לנסח'}</button>
        {showOffers&&<div className="bridge-offers" role="group" aria-label="הצעות לא מחייבות">
          {buildNameOffers(draft).map(offer=><button key={offer} type="button" onClick={()=>{update({chosenName:offerToName(offer)});setShowOffers(false);}}>{offer}</button>)}
          <button type="button" className="bridge-link" onClick={()=>setShowOffers(false)}>אף אחד מאלה</button>
        </div>}
        {draft.checkLoops>0&&<p className="bridge-kindness">אפשר לעדכן את השם. בדיקה חוזרת אינה מבחן.</p>}
      </>;
      case 7:{
        const tightening=draft.fit==='no'||draft.sensations.includes('tension')||draft.sensations.includes('contraction');
        return <>
          <h2>איך השם הזה מרגיש?</h2>
          <p>{forms.say} לעצמך לאט: <strong>״{draft.chosenName}״</strong>. מה קורה בגוף?</p>
          <div className="bridge-chips" role="group" aria-label="תחושות גוף">
            {SENSATIONS.map(s=><button type="button" key={s.id} aria-pressed={draft.sensations.includes(s.id)} onClick={()=>{
              update({sensations:draft.sensations.includes(s.id)?draft.sensations.filter(x=>x!==s.id):[...draft.sensations,s.id]});
            }}>{s.name}</button>)}
          </div>
          <h3>השם מתאים?</h3>
          <div className="bridge-options" role="group" aria-label="מידת התאמה">
            {([['yes','מתאים'],['almost','כמעט'],['no','לא']] as const).map(([id,label])=><button type="button" key={id} aria-pressed={draft.fit===id} onClick={()=>update({fit:id})}>{label}</button>)}
          </div>
          {draft.fit==='almost'&&!tightening&&draft.checkLoops<3&&<Field id="bridge-almost" label="איזה חלק מתאים? (נחזור לניסוח)" value={draft.almost} onChange={v=>update({almost:v})} />}
          {tightening&&draft.checkLoops<3&&<div className="bridge-objection">
            <p>נראה שאולי אחד הצדדים שומר על משהו חשוב. אין צורך לדחוף שינוי.</p>
            <fieldset className="bridge-fieldset"><legend>איזה צד מבקש מקום?</legend><div className="bridge-options">
              <button type="button" aria-pressed={draft.needSide==='a'} onClick={()=>update({needSide:'a'})}>{side('a')}</button>
              <button type="button" aria-pressed={draft.needSide==='b'} onClick={()=>update({needSide:'b'})}>{side('b')}</button>
            </div></fieldset>
            <Field id="bridge-need" label={buildNeedToKnowQuestion(side(draft.needSide))} value={draft.needToKnow} onChange={v=>update({needToKnow:v})} rows={2} required/>
          </div>}
          {draft.checkLoops>=3&&draft.fit&&<p className="bridge-kindness">כבר ניסית כמה פעמים. אפשר להמשיך גם בלי תחושת התאמה מוחלטת.</p>}
          <p className="bridge-small">תחושת גוף אינה הוכחה לנכונות השם. גם ״שום דבר מיוחד״ הוא מידע תקין.</p>
        </>;
      }
      case 8:return <>
        <h2>בוא נבדוק מול הרגע האמיתי</h2>
        <blockquote className="bridge-question">{buildTriggerPrompt(draft.trigger,draft.address)}</blockquote>
        <label className="bridge-slider" htmlFor="bridge-before">כמה זה משך אותך לצד אחד קודם? <output>{draft.beforePull}/10</output>
          <input id="bridge-before" type="range" min="0" max="10" value={draft.beforePull} onChange={e=>update({beforePull:Number(e.target.value)})}/>
        </label>
        <label className="bridge-slider" htmlFor="bridge-after">ועכשיו, עם ״{draft.chosenName}״? <output>{draft.afterPull}/10</output>
          <input id="bridge-after" type="range" min="0" max="10" value={draft.afterPull} onChange={e=>update({afterPull:Number(e.target.value)})}/>
        </label>
        <Field id="bridge-difference" label={'איך '+forms.subject+' '+forms.know+' אם זה אחר עכשיו?'} value={draft.difference} onChange={v=>update({difference:v})} rows={2} placeholder="מה קטן השתנה, או לא השתנה?"/>
        <p className="bridge-small">שינוי במספר אינו חייב להופיע. זהו דיווח אישי, לא מבחן הצלחת טיפול.</p>
      </>;
      case 9:return <>
        <h2>הגשר שלי</h2>
        <p>כרטיס לשמירה ולחזרה, בדרך שלך.</p>
        <div className="bridge-final-card">
          <span className="bridge-eyebrow">מ״או״ ל״וגם״</span>
          <div className="bridge-final-or">{side('a')} <small>או</small> {side('b')}</div>
          <div className="bridge-final-and">{side('a')} <strong>וגם</strong> {side('b')}</div>
          <h3>{draft.chosenName}</h3>
          <p><b>רגעים:</b> {draft.moments.filter(m=>m.scene.trim()).map(m=>m.scene).join(' · ')}</p>
          <p><b>השאלה:</b> {bridgeMomentQuestion(draft)}</p>
          <p><b>התשובה:</b> {draft.bridgeAnswer||'עדיין אין תשובה'}</p>
          <div className="bridge-results"><span>לפני: {draft.beforePull}/10</span><span>עכשיו: {draft.afterPull}/10</span></div>
          {draft.difference&&<p><b>איך אני יודע:</b> {draft.difference}</p>}
        </div>
        <Field id="bridge-next-action" label="צעד קטן אחד לשבוע הזה" value={draft.nextAction} onChange={v=>update({nextAction:v})} placeholder="למשל: לעצור ולהיזכר ברגע שלי"/>
        <div className="bridge-schedule"><strong>חזרות שאפשר לעשות</strong><p>{BRIDGE_REVIEW_DAYS.map(day=>'יום '+day).join(' · ')}</p><small>החזרות יופיעו כאן ובדף הבית לפי התאריך. אין התראות או שליחה למכשיר אחר.</small></div>
        <div className="bridge-actions">
          <button type="button" className="bridge-primary" disabled={Boolean(savedId)} onClick={save}>{savedId?'הכרטיס נשמר':'שמירת הכרטיס במכשיר'}</button>
          <button type="button" className="bridge-secondary" onClick={doCopy} disabled={!chosenCard}>העתקת הכרטיס</button>
        </div>
        {savedId&&<p role="status" className="bridge-saved">✓ הכרטיס נשמר במכשיר הזה. אפשר לחזור אליו ביום 1, 3 ו־7.</p>}
        {copyNote&&<p role="status">{copyNote}</p>}
        <button type="button" className="bridge-link" onClick={reset}>יצירת גשר חדש</button>
      </>;
      default:return null;
    }
  };

  const issue= draft.step===7 ? (
    draft.fit==='no'||draft.sensations.includes('tension')||draft.sensations.includes('contraction')
  )&&draft.checkLoops<3&&!draft.needToKnow.trim()
    :draft.step===7&&!draft.fit;
  const canNext=!risk&&canMoveOn(draft)&&!issue;
  const nextText=draft.step===4?'להמשיך':draft.step===7&&draft.checkLoops<3&&
    (draft.fit==='almost'||draft.fit==='no'||draft.sensations.includes('tension')||draft.sensations.includes('contraction'))
    ?'לחזור לשם ולדייק':'המשך';

  return <div className="bridge-page" dir="rtl" ref={top}>
    <header className="bridge-header">
      <span className="bridge-eyebrow">WISDOM GAMES · חדר כושר לשיחה עם עצמנו</span>
      <h1>הגשר <span>מ״או״ ל״וגם״</span></h1>
      <div className="bridge-progress-meta"><span>שלב {draft.step+1} מתוך 10</span><span>{STEP_LABELS[draft.step]}</span></div>
      <div className="bridge-progress" role="progressbar" aria-valuenow={draft.step+1} aria-valuemin={1} aria-valuemax={10} aria-label="התקדמות הגשר">
        <div style={{width:(draft.step+1)*10+'%'}} />
      </div>
      <div className="bridge-steps" aria-hidden="true">
        {STEP_LABELS.map((label,i)=><span key={i} title={label} className={i===draft.step?'current':i<draft.step?'done':''}>{i+1}</span>)}
      </div>
    </header>
    {draft.step>0&&<IconTrail draft={draft}/>}
    {review ? followUp : <section className="bridge-stage" aria-live="polite" aria-label={'שלב '+(draft.step+1)+': '+STEP_LABELS[draft.step]}>
      {renderStep()}
      {draft.mode==='practitioner'&&<PractitionerPanel step={draft.step}/>}
      {risk&&<div role="alert" className="bridge-warning">
        <strong>עוצרים כאן.</strong>
        <p>הניסוח עשוי לרמוז על סיכון לפגיעה. התרגול אינו מיועד למצבי משבר. כדאי לפנות לאיש מקצוע מתאים, ובסכנה מיידית לשירותי החירום.</p>
        <p>אפשר למחוק הכול או להסיר את הביטוי כדי להמשיך בתרגול אחר.</p>
      </div>}
      {storageFailed&&!risk&&<p role="alert" className="bridge-warning">לא ניתן לשמור מידע בדפדפן הזה. בדוק הרשאות אחסון מקומי.</p>}
      {draft.step<9&&<div className="bridge-actions">
        {draft.step>0&&<button className="bridge-secondary" type="button" onClick={()=>move(-1)}>חזרה</button>}
        <button className="bridge-primary" type="button" disabled={!canNext} onClick={()=>move(1)}>{draft.step===0?'מתחילים':nextText}</button>
      </div>}
    </section>}
    <footer className="bridge-footer">
      <button type="button" className="bridge-link" onClick={()=>{if(confirmDelete)deleteEverything();else setConfirmDelete(true);}}>{confirmDelete?'לאישור: מחק הכול מהמכשיר':'מחק הכול'}</button>
      {confirmDelete&&<button type="button" className="bridge-link" onClick={()=>setConfirmDelete(false)}>ביטול המחיקה</button>}
      <small>המידע נשאר במכשיר הזה בלבד. אין שימוש ב־AI ואין שליחת טקסט לשירות חיצוני.</small>
    </footer>
  </div>;
}
