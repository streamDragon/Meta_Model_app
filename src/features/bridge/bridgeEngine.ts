import { safetyRequiresReferral } from '../hiddenbelief/hiddenBeliefEngine';

export type Address = 'm' | 'f' | 'pl';
export type BridgeMode = 'self' | 'practitioner';
export type BridgeSide = 'a' | 'b';
export type BodyFit = 'yes' | 'almost' | 'no' | '';
export type BodySensation = 'breath' | 'chest' | 'warmth' | 'tears' | 'smile' | 'neutral' | 'tension' | 'contraction';

export interface BridgeMoment {
  scene: string;
  saw: string;
  heard: string;
  felt: string;
}

export interface BridgeDraft {
  address: Address;
  mode: BridgeMode;
  step: number;
  sideA: string;
  sideB: string;
  valueA: string;
  valueB: string;
  trigger: string;
  inventorySide: BridgeSide;
  moments: BridgeMoment[];
  momentAttempt: number;
  bridgeAnswer: string;
  chosenName: string;
  sensations: BodySensation[];
  fit: BodyFit;
  almost: string;
  needSide: BridgeSide;
  needToKnow: string;
  checkLoops: number;
  beforePull: number;
  afterPull: number;
  difference: string;
  nextAction: string;
}

export interface SavedBridge {
  id: string;
  savedAt: string;
  updatedAt: string;
  draft: BridgeDraft;
  reviewsDone: number[];
  reviews: Array<{day: number; completedAt: string; fit: BodyFit; actionHappened: 'yes' | 'no' | 'not-yet'}>;
}

export const BRIDGE_REVIEW_DAYS = [1, 3, 7] as const;
export const EMPTY_MOMENT: BridgeMoment = {scene:'', saw:'', heard:'', felt:''};
export function newBridgeDraft(): BridgeDraft {
  return {
    address:'m', mode:'self', step:0,
    sideA:'', sideB:'', valueA:'', valueB:'', trigger:'',
    inventorySide:'b', moments:[{...EMPTY_MOMENT}], momentAttempt:0,
    bridgeAnswer:'', chosenName:'', sensations:[], fit:'',
    almost:'', needSide:'a', needToKnow:'', checkLoops:0,
    beforePull:5, afterPull:5, difference:'', nextAction:'',
  };
}

export const ADDRESS_FORMS: Record<Address, {
  subject: string; remember: string; say: string; imagine: string; pause: string;
  grow: string; look: string; know: string; describe: string; want: string;
}> = {
  m: {subject:'אתה',remember:'נזכר',say:'אמור',imagine:'דמיין',pause:'קח',grow:'תן',look:'רואה',know:'יודע',describe:'תאר',want:'רוצה'},
  f: {subject:'את',remember:'נזכרת',say:'אמרי',imagine:'דמייני',pause:'קחי',grow:'תני',look:'רואה',know:'יודעת',describe:'תארי',want:'רוצה'},
  pl: {subject:'אתם',remember:'נזכרים',say:'אמרו',imagine:'דמיינו',pause:'קחו',grow:'תנו',look:'רואים',know:'יודעים',describe:'תארו',want:'רוצים'},
};

export function words(raw: string | undefined): string {
  return (raw || '').trim().replace(/[.?!…,;:״"'\s]+$/u, '').slice(0, 450);
}
export function sideLabel(side: BridgeSide, draft: BridgeDraft): string {
  return words(side === 'a' ? draft.sideA : draft.sideB) || (side === 'a' ? 'הצד הראשון' : 'הצד השני');
}
export function valueLabel(side: BridgeSide, draft: BridgeDraft): string {
  return words(side === 'a' ? (draft.valueA || draft.sideA) : (draft.valueB || draft.sideB)) || sideLabel(side, draft);
}
export function buildBridgeQuestion({moment, otherSide, otherValue, address}: {
  moment: string; otherSide: string; otherValue?: string; address: Address;
}): string {
  const g=ADDRESS_FORMS[address];
  const scene=words(moment);
  const other=words(otherValue) || words(otherSide) || 'הדבר החשוב האחר';
  return scene
    ? 'כש' + g.subject + ' ' + g.remember + ' ברגע הזה: ״' + scene + '״, איך אפשר לתת שם מקום גם ל' + other + '?'
    : 'איך אפשר למצוא מקום גם ל' + other + ' ברגע הזה?';
}
export function buildNameOffers({sideA, sideB, valueA, valueB}:{
  sideA:string; sideB:string; valueA?:string; valueB?:string;
}): string[] {
  const a=words(valueA) || words(sideA) || 'הדבר הראשון';
  const b=words(valueB) || words(sideB) || 'הדבר השני';
  const sa=words(sideA) || a;
  return [
    'יש שקוראים לזה ״' + a + ' וגם ' + b + '״',
    'יש שקוראים לזה ״' + sa + ' בדרך שלי״',
    'יש שקוראים לזה ״גם וגם״',
  ];
}
export function offerToName(offer: string): string {
  return offer.replace(/^יש שקוראים לזה\s*/, '').replace(/^״|״$/g,'').trim();
}
export function buildTriggerPrompt(trigger: string, address: Address): string {
  const g=ADDRESS_FORMS[address];
  const place=words(trigger);
  return g.imagine + ' את הרגע: ' + (place || 'בפעם הבאה שבה שני הדברים יהיו חשובים');
}
export function buildNeedToKnowQuestion(side: string): string {
  return 'מה הצד של ' + (words(side) || 'הדבר החשוב הזה') + ' צריך לדעת כדי שיוכל להירגע?';
}
export function momentDescription(m: BridgeMoment): string {
  return words(m.scene);
}
export function bridgeMomentQuestion(draft: BridgeDraft): string {
  const moment=draft.moments[Math.min(draft.momentAttempt, Math.max(0,draft.moments.length-1))];
  const other=draft.inventorySide==='a'?'b':'a';
  return buildBridgeQuestion({
    moment:momentDescription(moment||EMPTY_MOMENT),
    otherSide:sideLabel(other,draft),
    otherValue:valueLabel(other,draft),
    address:draft.address,
  });
}
export function bridgeRisk(draft: BridgeDraft): boolean {
  const text=[
    draft.sideA,draft.sideB,draft.valueA,draft.valueB,draft.trigger,
    draft.bridgeAnswer,draft.chosenName,draft.almost,draft.needToKnow,
    draft.difference,draft.nextAction,
    ...draft.moments.flatMap(m=>[m.scene,m.saw,m.heard,m.felt]),
  ].join(' ');
  return safetyRequiresReferral(text) ||
    /(?:התאבדות|להרוג|לרצוח|לדקור|להכות|לפגוע בעצמי|רצח|להתאבד|מתאבד|רוצה למות|לסיים את חיי|self.harm|suicid|murder|kill myself|kill someone)/i.test(text);
}
export function localDay(date: Date): string {
  const two=(n:number)=>String(n).padStart(2,'0');
  return date.getFullYear()+'-'+two(date.getMonth()+1)+'-'+two(date.getDate());
}
export function reviewDate(savedAt: string, offsetDays: number): string {
  const date=new Date(savedAt);
  if(Number.isNaN(date.getTime())) return '';
  date.setHours(12,0,0,0);
  date.setDate(date.getDate()+offsetDays);
  return localDay(date);
}
export function makeCardText(card: SavedBridge): string {
  const d=card.draft;
  const lines=[
    'הגשר: מ״או״ ל״וגם״',
    'או: '+sideLabel('a',d)+' / '+sideLabel('b',d),
    'וגם: '+sideLabel('a',d)+' וגם '+sideLabel('b',d),
    'השם שלי: '+(words(d.chosenName)||'עוד אין שם'),
    'רגעים: '+d.moments.map(x=>words(x.scene)).filter(Boolean).join(' | '),
    'השאלה: '+bridgeMomentQuestion(d),
    'התשובה שלי: '+(words(d.bridgeAnswer)||'עוד אין תשובה'),
    'השינוי במדד המשיכה: '+d.beforePull+' ← '+d.afterPull+' מתוך 10',
    'איך אני יודע שהשתנה: '+(words(d.difference)||'עדיין בבדיקה'),
    'צעד קטן: '+(words(d.nextAction)||'לא נבחר'),
    'לחזרה: '+BRIDGE_REVIEW_DAYS.map(n=>'יום '+n+': '+reviewDate(card.savedAt,n)).join(', '),
  ];
  return lines.join('\n');
}

export function canMoveOn(d: BridgeDraft): boolean {
  switch(d.step) {
    case 1: return Boolean(words(d.sideA) && words(d.sideB));
    case 2: return Boolean(words(d.valueA) && words(d.valueB));
    case 3: return d.moments.some(m=>words(m.scene).length>0);
    case 5: return Boolean(words(d.bridgeAnswer));
    case 6: return Boolean(words(d.chosenName));
    default: return true;
  }
}
