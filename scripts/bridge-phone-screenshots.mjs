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
const steps=[1,5,7,9];
for(const step of steps){
  const value={...moshe,step};
  const code='localStorage.setItem("wisdom:bridge:draft:v1",'+JSON.stringify(JSON.stringify(value))+');';
  const a=await call('Runtime.evaluate',{expression:code,returnByValue:true});
  if(a.exceptionDetails)throw Error('localStorage injection failed');
  await call('Page.reload',{ignoreCache:true});
  await pause(950);
  const check=await call('Runtime.evaluate',{expression:"document.querySelector('.bridge-progress-meta')?.innerText",returnByValue:true});
  if(!String(check.result?.value).includes(String(step+1)))throw new Error('QA wrong step '+step+': '+check.result?.value);
  const image=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,fromSurface:true});
  const name='bridge_step_'+step+'_390px.png';
  fs.writeFileSync(path.join(dst,name),Buffer.from(image.data,'base64'));
  const viewport=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false,fromSurface:true});
  const viewportName='bridge_step_'+step+'_390x844.png';
  fs.writeFileSync(path.join(dst,viewportName),Buffer.from(viewport.data,'base64'));
  console.log('CAPTURED '+name+' and '+viewportName);
}
await ws.close();
