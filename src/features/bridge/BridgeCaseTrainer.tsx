import {useEffect, useRef, useState} from 'react';
import {BridgeInsightMap} from './BridgeInsightMap';
import type {BridgeDraft} from './bridgeEngine';
import {BRIDGE_CASES, findBridgeCase, type BridgeLearningCase, type BridgeCaseId, type BridgeDialogueTurn, type BridgeOption} from './bridgeCases';
import type {DueBridgeReview} from '../../store/bridgeStore';

function Conversation({turns,clientName}:{turns:BridgeDialogueTurn[];clientName:string}) {
  return <div className="bridge-case-chat" role="group" aria-label={'שיחה בין מטפל לבין '+clientName}>
    {turns.map((turn,index)=><div className={'bridge-chat-turn '+(turn.speaker==='therapist'?'bridge-chat-therapist':'bridge-chat-client')} key={index}>
      <span className="bridge-chat-avatar" aria-hidden="true">{turn.speaker==='therapist'?'מ':clientName.charAt(0)}</span>
      <div className="bridge-chat-content">
        <span className="bridge-chat-speaker">{turn.speaker==='therapist'?'מטפל':clientName}</span>
        <p>{turn.text}</p>
      </div>
    </div>)}
  </div>;
}

type LearningInsight={
  title:string;why:string;next:string;evidence:string;
  phase:'trap'|'values'|'unlock';showMap:boolean;
};

function lessonFor(scenario:BridgeLearningCase,stage:number):LearningInsight {
  const common={phase:'trap' as const,showMap:false};
  switch(stage){
    case 0:return {
      title:'המלכוד אינו רק שתי אפשרויות',
      why:'הוא לא רק מתלבט: גם הניסיון לדבר על הסתירה מרגיש אסור. לכן עוד בחירה בתוך אותו ״או״ לא משחררת.',
      next:'נבדוק מה בדיוק סוגר את הדרך החוצה.',
      evidence:scenario.dialogue[scenario.dialogue.length-1]?.text||'',phase:'trap',showMap:true,
    };
    case 1:return {
      title:'זה המנעול של המלכוד',
      why:'כשגם שיחה על הסתירה נחשבת לבעיה, האדם לא יכול לבחון את הכללים שמחייבים אותו לבחור.',
      next:'נקשיב למה שכל צד מנסה לשמור עליו.',
      evidence:scenario.lock[scenario.lock.length-1]?.text||'',phase:'trap',showMap:true,
    };
    case 2:return {
      title:'תיקוף אינו הסכמה לכל טענה',
      why:'אפשר להבין מה כל צד מבקש להגן עליו, בלי להניח ששתי הדרישות מוצדקות או שהצדדים מחזיקים באותו כוח.',
      next:'נחפש רגע אמיתי שבו האדם כבר הפעיל משאב חשוב.',
      evidence:scenario.inquiry.filter(x=>x.speaker==='client').map(x=>x.text).join('  •  '),
      phase:'values',showMap:true,
    };
    case 3:return {
      ...common,title:'דוגמה ממשית במקום פתרון מומצא',
      why:'רגע שקרה באמת מספק פרטים על מה שהאדם כבר יכול לעשות. לא צריך להמציא הצלחה מושלמת.',
      next:'נשהה עם הרגע, ונבחן מה ראה, שמע והרגיש.',
      evidence:scenario.memory[scenario.memory.length-1]?.text||'',
    };
    case 5:return {
      title:'זה התיקון: משנים רמת שאלה',
      why:'לא שואלים מי מהצדדים מנצח. שואלים אם הכלל שמייצר את ההתנגשות באמת מחייב. זה פותח אפשרויות חדשות.',
      next:'נראה איזו דרך חדשה מתאפשרת, ואחר כך נבדוק אם שאלה של ״גם״ מתאימה.',
      evidence:scenario.lock[scenario.lock.length-1]?.text||'',phase:'unlock',showMap:true,
    };
    case 6:return {
      title:'הגשר הוא אפשרות, לא חובה',
      why:'אחרי שבוחנים את הכלל הנוקשה, אפשר להזמין חיבור בין ערכים. לפעמים נכון יותר להציב גבול או לבחור מרחק בטוח.',
      next:'נשמע איך המטופל מגיב להצעה, ולא נניח מראש שהיא הצליחה.',
      evidence:scenario.escapeRule,phase:'unlock',showMap:true,
    };
    case 8:return {
      ...common,title:'התגובה בגוף היא מידע, לא פסק דין',
      why:'כשמשהו מתכווץ או מרגיש לא שלם, מתעניינים במה שעוד זקוק להכרה; לא דוחפים את האדם להסכים.',
      next:'נבדוק מה באמת קרה כשפגש שוב את המצב.',
      evidence:scenario.body[scenario.body.length-1]?.text||'',
    };
    case 9:return {
      ...common,title:'בודקים שינוי בחיים, לא רק תחושת הקלה',
      why:'מתארים מה האדם עשה אחרת, מה נשאר קשה, ומה ניתן לבדוק בפעם הבאה. אין כאן הבטחה לריפוי.',
      next:'נסכם מה זיהינו, איזה כלל נפתח ומה נבדק.',
      evidence:scenario.test[scenario.test.length-1]?.text||'',
    };
    default:return {...common,title:'לגלות, לא לנחש',why:'התשובה נשענת על דברי האדם ולא על הנחה מוקדמת.',
      next:'נמשיך לשיחה ונבדוק את השלב הבא.',evidence:''};
  }
}

function ChoiceSet({options,onSelect,seed,lesson,scenario}:{
  options:readonly BridgeOption[];
  onSelect:(option:BridgeOption)=>void;
  seed:number;
  lesson:LearningInsight;
  scenario:BridgeLearningCase;
}) {
  const [selected,setSelected]=useState<BridgeOption|null>(null);
  const [reveal,setReveal]=useState(false);
  const resultRef=useRef<HTMLDivElement|null>(null);
  const rotation=seed%options.length;
  const ordered=[...options.slice(rotation),...options.slice(0,rotation)];
  const best=options.find(option=>option.best);
  const solved=selected?.best===true||reveal;
  useEffect(()=>{
    if(selected||reveal){
      resultRef.current?.scrollIntoView?.({block:'nearest',behavior:'smooth'});
    }
  },[selected,reveal]);
  return <div className="bridge-choice-workspace">
    <div className="bridge-case-choices" role="group" aria-label="בחר את התגובה המתאימה">
      {ordered.map((option,index)=>
        <button key={index} type="button" aria-pressed={selected===option}
          disabled={solved} onClick={()=>{setSelected(option);setReveal(false);}}>
          <span>{option.label}</span><span aria-hidden="true">{selected===option?(option.best?'✓':'↶'):'←'}</span>
        </button>)}
    </div>
    {!selected&&!reveal&&<button className="bridge-case-own" type="button"
      onClick={()=>setReveal(true)}>לא בטוח? הראה לי איך מפענחים</button>}
    {!solved&&selected&&<div ref={resultRef} className="bridge-choice-error" role="status">
      <strong>יש כאן משהו שעדיין חסר</strong>
      <p>{selected.feedback}</p>
      <details className="bridge-evidence"><summary>חזור למה ש{scenario.name} אמר</summary><p>״{lesson.evidence}״</p></details>
      <div className="bridge-choice-error-actions">
        <button type="button" onClick={()=>setSelected(null)}>מנסה תשובה אחרת</button>
        <button type="button" onClick={()=>setReveal(true)}>הראה לי את הפענוח</button>
      </div>
    </div>}
    {solved&&best&&<section className="bridge-choice-discovery" ref={resultRef}
      aria-label="מה גילית ולמה זה חשוב" role="region" aria-live="polite">
      <span className="bridge-choice-eyebrow">{reveal?'פענוח מודרך':'מה גילית עכשיו?'}</span>
      <h4>{lesson.title}</h4>
      <p className="bridge-choice-answer">{best.label}</p>
      <div className="bridge-choice-explained">
        <strong>למה זו התשובה?</strong>
        <p>{best.feedback}</p>
        <strong>למה זה חשוב לשיחה?</strong>
        <p>{lesson.why}</p>
      </div>
      {lesson.evidence&&<details className="bridge-evidence">
        <summary>המשפט שעליו הסתמכנו</summary><p>״{lesson.evidence}״</p>
      </details>}
      {lesson.showMap&&<BridgeInsightMap scenario={scenario} phase={lesson.phase}/>}
      <div className="bridge-next-prompt"><strong>מה קורה עכשיו?</strong><p>{lesson.next}</p></div>
      <button className="bridge-case-continue" type="button"
        onClick={()=>onSelect(best)}>ממשיך לשיחה ←</button>
    </section>}
  </div>;
}

interface Props {
  draft:BridgeDraft;
  onUpdate:(patch:Partial<BridgeDraft>)=>void;
  onReset:()=>void;
  onSave:()=>void;
  onCopy:()=>void;
  savedId:string|null;
  copyNote:string;
  due:DueBridgeReview[];
  onReview:(entry:DueBridgeReview)=>void;
  onOwnStory:()=>void;
}

export function BridgeCaseTrainer({
  draft,onUpdate,onReset,onSave,onCopy,savedId,copyNote,due,onReview,onOwnStory,
}:Props) {
  const [caseId,setCaseId]=useState<BridgeCaseId>(draft.caseId||'moshe');
  const [showEditName,setShowEditName]=useState(false);
  const scenario=findBridgeCase(draft.caseId||caseId);
  const orderSeed=(BRIDGE_CASES.findIndex(item=>item.id===scenario.id)+1)*2+draft.step;

  const proceed=(step:number,patch:Partial<BridgeDraft>={})=>{
    onUpdate({step,...patch});
  };
  const choose=(option:BridgeOption,step:number,patch:Partial<BridgeDraft>={})=>{
    if(option.best)proceed(step,patch);
  };
  const changeCase=(next:BridgeCaseId)=>{
    setCaseId(next);
    // Do not preserve partially entered patient text when changing fictional cases.
    onUpdate({
      step:0,caseId:next,sideA:'',sideB:'',valueA:'',valueB:'',trigger:'',
      bridgeAnswer:'',chosenName:'',fit:'',needToKnow:'',difference:'',
      moments:[{scene:'',saw:'',heard:'',felt:''}],beforePull:5,afterPull:5,
    });
  };
  const firstScene=draft.step===0;
  const contextLabels=['','איך ננעלת הדרך?','מה חשוב בכל צד?','המשאב שכבר קיים','רגע של הקשבה',
    'איזה כלל נוכל לבחון?','מה נפתח כשמשנים כלל?','איך השאלה משפיעה?','מה קורה בגוף?','מה קורה במציאות?','מה למדנו?'];
  const back=()=>{
    if(draft.step===0){onReset();return;}
    proceed(draft.step-1);
  };
  const nameForBody=scenario.body.map((turn,index)=>{
    if(index!==0)return turn;
    return {...turn,text:turn.text.replace(/״[^״]*״/,'״'+draft.chosenName+'״')};
  });
  return <div className="bridge-case-trainer">
    {!firstScene&&draft.step<10&&<div className="bridge-case-context">
      <span>{scenario.name} · {contextLabels[draft.step]}</span>
      <details className="bridge-case-recap">
        <summary>לא זוכר את תחילת השיחה?</summary>
        <Conversation turns={scenario.dialogue} clientName={scenario.name}/>
      </details>
    </div>}
    {firstScene&&<div className="bridge-case-picker" role="group" aria-label="בחר מקרה תרגול">
      {BRIDGE_CASES.map(item=><button key={item.id} type="button" aria-pressed={scenario.id===item.id} onClick={()=>changeCase(item.id)}>
        {item.label}
      </button>)}
    </div>}
    {draft.step===0&&<>
      <div className="bridge-case-heading"><span className="bridge-case-kicker">{scenario.scene} · אתה המטפל</span><h2>משהו בשיחה לא מסתדר...</h2></div>
      <Conversation turns={scenario.dialogue} clientName={scenario.name}/>
      <h3 className="bridge-case-question">איפה המלכוד?</h3>
      <ChoiceSet options={scenario.orOptions} key={scenario.id+'-'+draft.step} seed={orderSeed} lesson={lessonFor(scenario,draft.step)} scenario={scenario} onSelect={option=>choose(option,1,{
        caseId:scenario.id,trainingMode:'case',sideA:scenario.values.sideA,sideB:scenario.values.sideB,
        valueA:scenario.values.valueA,valueB:scenario.values.valueB,trigger:scenario.values.trigger,
        moments:[scenario.moment],inventorySide:'b',
      })}/>
      <button type="button" className="bridge-case-own" onClick={onOwnStory}>מעדיף להביא מקרה משלי</button>
      {due.length>0&&<div className="bridge-due"><strong>חזרות שממתינות לך</strong>
        {due.slice(0,3).map(entry=><button key={entry.card.id+'-'+entry.day} type="button" onClick={()=>onReview(entry)}>יום {entry.day} · {entry.card.draft.chosenName||'הגשר שלי'}</button>)}
      </div>}
    </>}
    {draft.step===1&&<>
      <Conversation turns={scenario.lock} clientName={scenario.name}/>
      <h3 className="bridge-case-question">מה מונע ממנו לצאת מהמלכוד?</h3>
      <ChoiceSet options={scenario.lockOptions} key={scenario.id+'-'+draft.step} seed={orderSeed} lesson={lessonFor(scenario,draft.step)} scenario={scenario} onSelect={option=>choose(option,2)}/>
    </>}
    {draft.step===2&&<>
      <Conversation turns={scenario.inquiry} clientName={scenario.name}/>
      <h3 className="bridge-case-question">איזו אמת חלקית יש בכל צד?</h3>
      <ChoiceSet options={scenario.valueOptions} key={scenario.id+'-'+draft.step} seed={orderSeed} lesson={lessonFor(scenario,draft.step)} scenario={scenario} onSelect={option=>choose(option,3)}/>
    </>}
    {draft.step===3&&<>
      <Conversation turns={scenario.memory} clientName={scenario.name}/>
      <h3 className="bridge-case-question">איזה רגע כדאי לקחת לגשר?</h3>
      <ChoiceSet options={scenario.memoryOptions} key={scenario.id+'-'+draft.step} seed={orderSeed} lesson={lessonFor(scenario,draft.step)} scenario={scenario} onSelect={option=>choose(option,4,{moments:[scenario.moment],inventorySide:'b'})}/>
    </>}
    {draft.step===4&&<>
      <div className="bridge-case-pause">
        <span className="bridge-case-kicker">הרגע שלו</span>
        <h2>הוא כבר ידע לעשות את זה.</h2>
        <p className="bridge-case-pause-note">זה לא פתר את המלכוד. זה רגע אמיתי שמראה איזה כוח כבר יש לו.</p>
        <p className="bridge-case-pause-quote">״{scenario.moment.scene}״</p>
        <div className="bridge-case-senses">
          <div><span>ראה</span><p>{scenario.moment.saw}</p></div>
          <div><span>שמע</span><p>{scenario.moment.heard}</p></div>
          <div><span>הרגיש</span><p>{scenario.moment.felt}</p></div>
        </div>
        <button type="button" className="bridge-primary" onClick={()=>proceed(5)}>בוא נבדוק את כללי המלכוד ←</button>
      </div>
    </>}
    {draft.step===5&&<>
      <div className="bridge-case-kicker">יוצאים מן השדה: מטא־תקשורת</div>
      <h2 className="bridge-case-title">על איזה כלל אפשר לדבר מחדש?</h2>
      <ChoiceSet options={scenario.metaOptions} key={scenario.id+'-'+draft.step} seed={orderSeed} lesson={lessonFor(scenario,draft.step)} scenario={scenario} onSelect={option=>choose(option,6)}/>
    </>}
    {draft.step===6&&<>
      <div className="bridge-case-escape" role="note"><strong>מה השתנה? לא האדם, אלא הכלל שמגביל אותו.</strong><p>{scenario.escapeRule}</p><small>עכשיו יש דרך נוספת לבדוק את המצב. לפעמים הפתרון הוא גבול או מרחק בטוח, ולא ״גם״.</small></div>
      <div className="bridge-case-kicker">שאלת הגשר היא אפשרות אחת, אחרי שהמסגרת נפתחה</div>
      <h2 className="bridge-case-title">איך תעזור ל{scenario.name} למצוא ״גם״?</h2>
      <ChoiceSet options={scenario.bridgeOptions} key={scenario.id+'-'+draft.step} seed={orderSeed} lesson={lessonFor(scenario,draft.step)} scenario={scenario} onSelect={option=>choose(option,7,{bridgeAnswer:scenario.bridgeAnswer})}/>
    </>}
    {draft.step===7&&<>
      <Conversation turns={[
        {speaker:'therapist',text:scenario.bridgeOptions.find(o=>o.best)?.label||'ומה עולה לך?'},
        {speaker:'client',text:scenario.bridgeAnswer},
      ]} clientName={scenario.name}/>
      <h3 className="bridge-case-question">איזה שם יאפשר לו להחזיק את שני הצדדים?</h3>
      <div className="bridge-case-choices" role="group" aria-label="בחר שם לגשר">
        {scenario.names.map(name=><button type="button" key={name} onClick={()=>proceed(8,{chosenName:name})}><span>{name}</span><span aria-hidden="true">←</span></button>)}
      </div>
      <button type="button" className="bridge-case-own" onClick={()=>setShowEditName(v=>!v)}>
        {showEditName?'סגור ניסוח אישי':'ניסוח אחר במילים שלך'}
      </button>
      {showEditName&&<form className="bridge-case-custom" onSubmit={e=>{
        e.preventDefault();
        if(draft.chosenName.trim())proceed(8);
      }}>
        <label htmlFor="bridge-case-custom-name">איך היית קורא לזה?</label>
        <input id="bridge-case-custom-name" value={draft.chosenName} onChange={e=>onUpdate({chosenName:e.target.value.slice(0,120)})} maxLength={120} placeholder="שם שמכבד את שני הצדדים"/>
        <button className="bridge-primary" disabled={!draft.chosenName.trim()} type="submit">ממשיך</button>
      </form>}
    </>}
    {draft.step===8&&<>
      <Conversation turns={nameForBody} clientName={scenario.name}/>
      <h3 className="bridge-case-question">מה תגיד עכשיו?</h3>
      <ChoiceSet options={scenario.bodyOptions} key={scenario.id+'-'+draft.step} seed={orderSeed} lesson={lessonFor(scenario,draft.step)} scenario={scenario} onSelect={option=>choose(option,9,{fit:'almost',needToKnow:option.label})}/>
    </>}
    {draft.step===9&&<>
      <Conversation turns={scenario.test} clientName={scenario.name}/>
      <h3 className="bridge-case-question">איך תבדוק שהגשר עובד בחיים?</h3>
      <ChoiceSet options={scenario.testOptions} key={scenario.id+'-'+draft.step} seed={orderSeed} lesson={lessonFor(scenario,draft.step)} scenario={scenario} onSelect={option=>choose(option,10,{
        beforePull:scenario.before,afterPull:scenario.after,difference:scenario.difference,
        nextAction:scenario.nextAction,
      })}/>
    </>}
    {draft.step===10&&<>
      <div className="bridge-case-summary">
        <span className="bridge-case-kicker">מקרה תרגול · {scenario.name}</span>
        <h2>{draft.chosenName||scenario.names[0]}</h2>
        <div className="bridge-case-link"><span>{scenario.values.valueA}</span><strong>וגם</strong><span>{scenario.values.valueB}</span></div>
        <div className="bridge-case-summary-block"><small>הרגע שעזר</small><p>{scenario.moment.scene}</p></div>
        <div className="bridge-case-summary-block"><small>מה היה המלכוד, ואיך השתנתה המסגרת?</small><BridgeInsightMap scenario={scenario} phase="unlock" /></div>
        <div className="bridge-case-summary-block"><small>שאלת הגשר (אם מתאימה)</small><p>{scenario.bridgeOptions.find(o=>o.best)?.label}</p></div>
        <div className="bridge-case-summary-block"><small>מה השתנה לפי הדיווח שלו?</small><p>{scenario.difference}</p></div>
        <div className="bridge-case-pull"><span>לפני: {scenario.before}/10</span><span>אחרי: {scenario.after}/10</span></div>
        <p className="bridge-case-disclaimer">אלה תגובות של דמות בדיונית לצורך אימון, לא מדידה של הצלחה טיפולית.</p>
        <button className="bridge-primary" type="button" onClick={onSave} disabled={Boolean(savedId)}>{savedId?'נשמר לתרגול חוזר':'שמור את הכרטיס לתרגול חוזר'}</button>
        {savedId&&<div className="bridge-case-saved" role="status">
          הכרטיס נשמר במכשיר. חזרות: יום 1, יום 3 ויום 7.
          <button type="button" className="bridge-case-own" onClick={onCopy}>העתק כרטיס</button>
          {copyNote&&<span>{copyNote}</span>}
        </div>}
        <button type="button" className="bridge-secondary" onClick={onReset}>מקרה חדש</button>
      </div>
    </>}
    {draft.step>0&&draft.step<10&&<button type="button" className="bridge-case-back" onClick={back}>→ חזרה לשיחה</button>}
  </div>;
}
