import {useEffect, useState} from 'react';
import type {BridgeDraft} from './bridgeEngine';
import {BRIDGE_CASES, findBridgeCase, type BridgeCaseId, type BridgeDialogueTurn, type BridgeOption} from './bridgeCases';
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

function ChoiceSet({options,onSelect,feedback,seed}:{options:readonly BridgeOption[];onSelect:(option:BridgeOption)=>void;feedback:string;seed:number}) {
  // Mix the fixed answer order by case and question; the correct choice is not
  // consistently at the first position.
  const rotation=seed%options.length;
  const ordered=[...options.slice(rotation),...options.slice(0,rotation)];
  return <div className="bridge-case-choices" role="group" aria-label="בחר את התגובה המתאימה">
    {ordered.map((option,index)=>
      <button key={index} type="button" onClick={()=>onSelect(option)}>
        <span>{option.label}</span><span aria-hidden="true">←</span>
      </button>)}
    {feedback&&<p className="bridge-case-feedback" role="status">{feedback}</p>}
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
  const [feedback,setFeedback]=useState('');
  const [showEditName,setShowEditName]=useState(false);
  const scenario=findBridgeCase(draft.caseId||caseId);
  const orderSeed=(BRIDGE_CASES.findIndex(item=>item.id===scenario.id)+1)*2+draft.step;

  useEffect(()=>{setFeedback('');},[draft.step,draft.caseId]);

  const proceed=(step:number,patch:Partial<BridgeDraft>={})=>{
    setFeedback('');
    onUpdate({step,...patch});
  };
  const choose=(option:BridgeOption,step:number,patch:Partial<BridgeDraft>={})=>{
    if(option.best)proceed(step,patch);
    else setFeedback(option.feedback);
  };
  const changeCase=(next:BridgeCaseId)=>{
    setCaseId(next);setFeedback('');
    // Do not preserve partially entered patient text when changing fictional cases.
    onUpdate({
      step:0,caseId:next,sideA:'',sideB:'',valueA:'',valueB:'',trigger:'',
      bridgeAnswer:'',chosenName:'',fit:'',needToKnow:'',difference:'',
      moments:[{scene:'',saw:'',heard:'',felt:''}],beforePull:5,afterPull:5,
    });
  };
  const firstScene=draft.step===0;
  const back=()=>{
    if(draft.step===0){onReset();return;}
    proceed(draft.step-1);
  };
  const nameForBody=scenario.body.map((turn,index)=>{
    if(index!==0)return turn;
    return {...turn,text:turn.text.replace(/״[^״]*״/,'״'+draft.chosenName+'״')};
  });
  return <div className="bridge-case-trainer">
    {firstScene&&<div className="bridge-case-picker" role="group" aria-label="בחר מקרה תרגול">
      {BRIDGE_CASES.map(item=><button key={item.id} type="button" aria-pressed={scenario.id===item.id} onClick={()=>changeCase(item.id)}>
        {item.label}
      </button>)}
    </div>}
    {draft.step===0&&<>
      <div className="bridge-case-heading"><span className="bridge-case-kicker">{scenario.scene}</span><h2>משהו בשיחה לא מסתדר...</h2></div>
      <Conversation turns={scenario.dialogue} clientName={scenario.name}/>
      <h3 className="bridge-case-question">מה אתה שומע כאן?</h3>
      <ChoiceSet options={scenario.orOptions} seed={orderSeed} feedback={feedback} onSelect={option=>choose(option,1,{
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
      <Conversation turns={scenario.inquiry} clientName={scenario.name}/>
      <h3 className="bridge-case-question">מה חשוב לו באמת בכל צד?</h3>
      <ChoiceSet options={scenario.valueOptions} seed={orderSeed} feedback={feedback} onSelect={option=>choose(option,2)}/>
    </>}
    {draft.step===2&&<>
      <Conversation turns={scenario.memory} clientName={scenario.name}/>
      <h3 className="bridge-case-question">איזה רגע כדאי לקחת לגשר?</h3>
      <ChoiceSet options={scenario.memoryOptions} seed={orderSeed} feedback={feedback} onSelect={option=>choose(option,3,{moments:[scenario.moment],inventorySide:'b'})}/>
    </>}
    {draft.step===3&&<>
      <div className="bridge-case-pause">
        <span className="bridge-case-kicker">הרגע שלו</span>
        <h2>הוא כבר ידע לעשות את זה.</h2>
        <p className="bridge-case-pause-quote">״{scenario.moment.scene}״</p>
        <div className="bridge-case-senses">
          <div><span>ראה</span><p>{scenario.moment.saw}</p></div>
          <div><span>שמע</span><p>{scenario.moment.heard}</p></div>
          <div><span>הרגיש</span><p>{scenario.moment.felt}</p></div>
        </div>
        <button type="button" className="bridge-primary" onClick={()=>proceed(4)}>אל שאלת הגשר ←</button>
      </div>
    </>}
    {draft.step===4&&<>
      <div className="bridge-case-kicker">בחירת השאלה שלך כמטפל</div>
      <h2 className="bridge-case-title">איך תעזור ל{scenario.name} למצוא ״גם״?</h2>
      <ChoiceSet options={scenario.bridgeOptions} seed={orderSeed} feedback={feedback} onSelect={option=>choose(option,5,{bridgeAnswer:scenario.bridgeAnswer})}/>
    </>}
    {draft.step===5&&<>
      <Conversation turns={[
        {speaker:'therapist',text:scenario.bridgeOptions.find(o=>o.best)?.label||'ומה עולה לך?'},
        {speaker:'client',text:scenario.bridgeAnswer},
      ]} clientName={scenario.name}/>
      <h3 className="bridge-case-question">איזה שם יכול להתאים לחיבור הזה?</h3>
      <div className="bridge-case-choices" role="group" aria-label="בחר שם לגשר">
        {scenario.names.map(name=><button type="button" key={name} onClick={()=>proceed(6,{chosenName:name})}><span>{name}</span><span aria-hidden="true">←</span></button>)}
      </div>
      <button type="button" className="bridge-case-own" onClick={()=>setShowEditName(v=>!v)}>
        {showEditName?'סגור ניסוח אישי':'ניסוח אחר במילים שלך'}
      </button>
      {showEditName&&<form className="bridge-case-custom" onSubmit={e=>{
        e.preventDefault();
        if(draft.chosenName.trim())proceed(6);
      }}>
        <label htmlFor="bridge-case-custom-name">איך היית קורא לזה?</label>
        <input id="bridge-case-custom-name" value={draft.chosenName} onChange={e=>onUpdate({chosenName:e.target.value.slice(0,120)})} maxLength={120} placeholder="שם שמכבד את שני הצדדים"/>
        <button className="bridge-primary" disabled={!draft.chosenName.trim()} type="submit">ממשיך</button>
      </form>}
    </>}
    {draft.step===6&&<>
      <Conversation turns={nameForBody} clientName={scenario.name}/>
      <h3 className="bridge-case-question">מה תגיד עכשיו?</h3>
      <ChoiceSet options={scenario.bodyOptions} seed={orderSeed} feedback={feedback} onSelect={option=>choose(option,7,{fit:'almost',needToKnow:option.label})}/>
    </>}
    {draft.step===7&&<>
      <Conversation turns={scenario.test} clientName={scenario.name}/>
      <h3 className="bridge-case-question">איך תבדוק שהגשר עובד בחיים?</h3>
      <ChoiceSet options={scenario.testOptions} seed={orderSeed} feedback={feedback} onSelect={option=>choose(option,8,{
        beforePull:scenario.before,afterPull:scenario.after,difference:scenario.difference,
        nextAction:scenario.nextAction,
      })}/>
    </>}
    {draft.step===8&&<>
      <div className="bridge-case-summary">
        <span className="bridge-case-kicker">מקרה תרגול · {scenario.name}</span>
        <h2>{draft.chosenName||scenario.names[0]}</h2>
        <div className="bridge-case-link"><span>{scenario.values.valueA}</span><strong>וגם</strong><span>{scenario.values.valueB}</span></div>
        <div className="bridge-case-summary-block"><small>הרגע שעזר</small><p>{scenario.moment.scene}</p></div>
        <div className="bridge-case-summary-block"><small>שאלת הגשר</small><p>{scenario.bridgeOptions.find(o=>o.best)?.label}</p></div>
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
    {draft.step>0&&draft.step<8&&<button type="button" className="bridge-case-back" onClick={back}>→ חזרה לשיחה</button>}
  </div>;
}
