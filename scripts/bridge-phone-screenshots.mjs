// Local visual QA only: synthetic Moshe data, isolated headless Chrome profile.
import fs from 'node:fs';
import path from 'node:path';

const base='http://127.0.0.1:9234';
const pageURL='http://127.0.0.1:4174/#bridge';
const dst=path.join(process.cwd(),'docs','screenshots','bridge');
fs.mkdirSync(dst,{recursive:true});
const list=await (await fetch(base+'/json/list')).json();
const target=list.find(p=>p.type==='page'&&p.url.includes('4174'))||list.find(p=>p.type==='page');
if(!target)throw new Error('No QA page');
const ws=new WebSocket(target.webSocketDebuggerUrl);
await new Promise((ok,bad)=>{ws.addEventListener('open',ok,{once:true});ws.addEventListener('error',bad,{once:true});});
let id=0;
const pending=new Map();
ws.addEventListener('message',event=>{
  const data=JSON.parse(String(event.data));
  if(!data.id)return;
  const p=pending.get(data.id);if(!p)return;
  pending.delete(data.id);data.error?p.reject(Error(data.error.message)):p.resolve(data.result);
});
function call(method,params={}){return new Promise((resolve,reject)=>{const n=++id;pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}));});}
const pause=(ms)=>new Promise(ok=>setTimeout(ok,ms));
await call('Page.enable');
await call('Runtime.enable');
await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true,screenWidth:390,screenHeight:844});
await call('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
await call('Page.navigate',{url:pageURL});
await pause(800);
// First-visit onboarding: verify that the intro is visible on a clean session.
await call('Runtime.evaluate',{expression:"localStorage.removeItem('wisdom:bridge:intro-seen:double-bind-v2');localStorage.removeItem('wisdom:bridge:draft:v3');"});
await call('Page.reload',{ignoreCache:true});
await pause(900);
const introCheck=await call('Runtime.evaluate',{expression:"document.querySelector('[role=dialog]')?.textContent",returnByValue:true});
if(!introCheck.result?.value?.includes('התמודדות עם Double Bind'))throw new Error('First-visit Bridge intro missing');
const introImage=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false,fromSurface:true});
fs.writeFileSync(path.join(dst,'bridge_intro_390x844.png'),Buffer.from(introImage.data,'base64'));
console.log('CAPTURED bridge_intro_390x844.png');
await call('Runtime.evaluate',{expression:"localStorage.setItem('wisdom:bridge:intro-seen:double-bind-v2','1');"});

const moshe={
 address:'m',mode:'self',sideA:'לכבד את אבא שלי',valueA:'כבוד והכרת תודה',
 sideB:'להיות האבא שאני רוצה להיות לילדים',valueB:'סבלנות ורוגע',
 trigger:'כשאבא מתקשר בערב ומעיר על החינוך',
 inventorySide:'b',momentAttempt:0,
 moments:[{scene:'כשיוסי שבר כוס וכרעתי לידו ושאלתי אם הוא בסדר',saw:'ראיתי שהוא נבהל',heard:'שאלתי אם הוא בסדר',felt:'רוגע'}],
 bridgeAnswer:'כשאני מתייחס לבן שלי בכבוד, אני גם מכבד את מה שקיבלתי מאבא',
 chosenName:'כבוד שמאפשר לי להיות אבא',
 sensations:[],fit:'no',needSide:'a',needToKnow:'',
 beforePull:8,afterPull:3,
 difference:'אני פחות ממהר להתגונן ויותר מסוגל להקשיב',
 nextAction:'לעצור לרגע לפני השיחה הבאה עם אבא',
};
const steps=[0,1,2,4,6,8];
for(const step of steps){
  const value={...moshe,step,trainingMode:'case',caseId:'moshe'};
  const code='localStorage.setItem("wisdom:bridge:draft:v3",'+JSON.stringify(JSON.stringify(value))+');';
  const a=await call('Runtime.evaluate',{expression:code,returnByValue:true});
  if(a.exceptionDetails)throw Error('localStorage injection failed');
  await call('Page.reload',{ignoreCache:true});
  await pause(950);
  const check=await call('Runtime.evaluate',{expression:"document.querySelector('.bridge-stage')?.getAttribute('aria-label')",returnByValue:true});
  if(!check.result?.value || !check.result?.value.includes('תרגול פענוח שיחה'))throw new Error('QA missing stage '+step+': '+check.result?.value);
  const image=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,fromSurface:true});
  const name='bridge_step_'+step+'_390px.png';
  fs.writeFileSync(path.join(dst,name),Buffer.from(image.data,'base64'));
  const viewport=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false,fromSurface:true});
  const viewportName='bridge_step_'+step+'_390x844.png';
  fs.writeFileSync(path.join(dst,viewportName),Buffer.from(viewport.data,'base64'));
  console.log('CAPTURED '+name+' and '+viewportName);
  if(step===0||step===5) {
    const needle=step===0?'שתי נאמנויות מתנגשות':'כשאתה אומר';
    const click=await call('Runtime.evaluate',{expression:
      '(() => { const b=[...document.querySelectorAll(".bridge-case-choices button")].find(x=>x.textContent.includes('+JSON.stringify(needle)+'));if(!b)return "missing answer";b.click();return "clicked";})()',
      returnByValue:true});
    if(click.result?.value!=='clicked')throw new Error('QA answer button not found '+step);
    await pause(400);
    const verify=await call('Runtime.evaluate',{expression:
      "({insight:!!document.querySelector('.bridge-choice-discovery'),map:!!document.querySelector('.bridge-insight-map'),continue:!!document.querySelector('.bridge-case-continue')})",
      returnByValue:true});
    if(!verify.result?.value?.insight||!verify.result?.value?.continue||!verify.result?.value?.map)
      throw new Error('QA result not visible after correct answer at '+step+': '+JSON.stringify(verify.result?.value));
    const feedbackCapture=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,fromSurface:true});
    fs.writeFileSync(path.join(dst,'bridge_feedback_'+step+'_390px.png'),Buffer.from(feedbackCapture.data,'base64'));
    console.log('CAPTURED bridge_feedback_'+step+'_390px.png');
  }
}
await ws.close();
