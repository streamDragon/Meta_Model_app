import {
  BRIDGE_REVIEW_DAYS, bridgeRisk, localDay, newBridgeDraft, reviewDate,
  type BodyFit, type BridgeDraft, type SavedBridge,
} from '../features/bridge/bridgeEngine';

export const BRIDGE_DRAFT_KEY='wisdom:bridge:draft:v2';
const LEGACY_BRIDGE_DRAFT_KEY='wisdom:bridge:draft:v1';
export const BRIDGE_CARDS_KEY='wisdom:bridge:cards:v1';
export const BRIDGE_UPDATED_EVENT='wisdom:bridge:updated';

function notify():void {
  try {window.dispatchEvent(new Event(BRIDGE_UPDATED_EVENT));} catch { /* non-browser test */ }
}
function fetchItem(key:string):unknown {
  try {const raw=localStorage.getItem(key);return raw?JSON.parse(raw):null;} catch {return null;}
}
function writeItem(key:string,data:unknown):boolean {
  try {localStorage.setItem(key,JSON.stringify(data));notify();return true;} catch {return false;}
}
export function loadBridgeDraft():BridgeDraft {
  // v1 stored a half-completed abstract onboarding form. Do not strand returning
  // learners there. Preserve saved cards and explicit address preference only.
  let legacyAddress:BridgeDraft['address']|undefined;
  try {
    const legacy=fetchItem(LEGACY_BRIDGE_DRAFT_KEY) as Partial<BridgeDraft>|null;
    if(legacy && ['m','f','pl'].includes(legacy.address||'')) legacyAddress=legacy.address;
    localStorage.removeItem(LEGACY_BRIDGE_DRAFT_KEY);
  } catch { /* blocked storage */ }
  const raw=fetchItem(BRIDGE_DRAFT_KEY);
  if(!raw||typeof raw!=='object') return {...newBridgeDraft(), address:legacyAddress||'m'};
  if(!raw||typeof raw!=='object')return newBridgeDraft();
  const d=raw as Partial<BridgeDraft>;
  const starter=newBridgeDraft();
  const draft:BridgeDraft={
    ...starter,...d,
    address:['f','m','pl'].includes(d.address||'')?d.address!:starter.address,
    mode:d.mode==='practitioner'?'practitioner':'self',
    trainingMode:d.trainingMode==='personal'?'personal':'case',
    caseId:['moshe','noa','daniel'].includes(d.caseId||'')?d.caseId!:null,
    step:typeof d.step==='number'&&d.step>=0&&d.step<=9?d.step:0,
    moments:Array.isArray(d.moments)?d.moments.slice(0,3).filter(m=>m&&typeof m.scene==='string').map(m=>({
      scene:m.scene.slice(0,450),saw:String(m.saw||'').slice(0,250),
      heard:String(m.heard||'').slice(0,250),felt:String(m.felt||'').slice(0,250),
    })):starter.moments,
    sensations:Array.isArray(d.sensations)?d.sensations.slice(0,8):[],
  };
  if(!draft.moments.length)draft.moments=[{scene:'',saw:'',heard:'',felt:''}];
  return bridgeRisk(draft)?newBridgeDraft():draft;
}
export function saveBridgeDraft(d:BridgeDraft):boolean {
  if(bridgeRisk(d)) {
    try {localStorage.removeItem(BRIDGE_DRAFT_KEY);notify();} catch { /* storage might be disabled */ }
    return false;
  }
  return writeItem(BRIDGE_DRAFT_KEY,d);
}
export function clearBridgeDraft():void {
  try {localStorage.removeItem(BRIDGE_DRAFT_KEY);localStorage.removeItem(LEGACY_BRIDGE_DRAFT_KEY);notify();} catch { /* blocked storage */ }
}
function validCard(x:unknown):x is SavedBridge {
  if(!x||typeof x!=='object')return false;
  const c=x as Partial<SavedBridge>;
  return typeof c.id==='string'&&typeof c.savedAt==='string'&&
    c.draft!==undefined&&typeof c.draft==='object'&&
    typeof c.draft.sideA==='string'&&typeof c.draft.sideB==='string'&&
    Array.isArray(c.draft.moments)&&Array.isArray(c.reviewsDone)&&
    !bridgeRisk(c.draft);
}
export function loadBridgeCards():SavedBridge[] {
  const raw=fetchItem(BRIDGE_CARDS_KEY);
  return Array.isArray(raw)?raw.filter(validCard).slice(0,30):[];
}
export function saveBridgeCard(card:SavedBridge):boolean {
  if(bridgeRisk(card.draft))return false;
  const old=loadBridgeCards();
  return writeItem(BRIDGE_CARDS_KEY,[card,...old.filter(x=>x.id!==card.id)].slice(0,30));
}
export function makeBridgeCard(draft:BridgeDraft,now=new Date()):SavedBridge {
  const date=now.toISOString();
  return {id:'bridge-'+now.getTime().toString(36)+'-'+Math.random().toString(36).slice(2,9),
    savedAt:date,updatedAt:date,draft:{...draft,moments:draft.moments.map(x=>({...x}))},
    reviewsDone:[],reviews:[]};
}
export interface DueBridgeReview {card:SavedBridge;day:number;due:string}
export function dueBridgeReviews(cards=loadBridgeCards(),now=new Date()):DueBridgeReview[] {
  const today=localDay(now);
  return cards.flatMap(card=>BRIDGE_REVIEW_DAYS.filter(
    day=>!card.reviewsDone.includes(day)&&reviewDate(card.savedAt,day)<=today
  ).map(day=>({card,day,due:reviewDate(card.savedAt,day)})))
  .sort((a,b)=>a.due.localeCompare(b.due));
}
export function markBridgeReview(id:string,day:number,fit:BodyFit,actionHappened:'yes'|'no'|'not-yet',now=new Date()):boolean {
  if(!BRIDGE_REVIEW_DAYS.some(n=>n===day))return false;
  const cards=loadBridgeCards();
  const card=cards.find(c=>c.id===id);
  if(!card||card.reviewsDone.includes(day))return false;
  const copy:SavedBridge={...card,reviewsDone:[...card.reviewsDone,day],
    reviews:[...card.reviews,{day,completedAt:now.toISOString(),fit,actionHappened}],
    updatedAt:now.toISOString()};
  return writeItem(BRIDGE_CARDS_KEY,cards.map(c=>c.id===id?copy:c));
}
export function deleteAllBridgeData():void {
  try {localStorage.removeItem(BRIDGE_DRAFT_KEY);localStorage.removeItem(LEGACY_BRIDGE_DRAFT_KEY);localStorage.removeItem(BRIDGE_CARDS_KEY);notify();} catch {/* blocked storage */}
}
