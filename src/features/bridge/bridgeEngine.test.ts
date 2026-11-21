// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import {
  ADDRESS_FORMS, bridgeMomentQuestion, bridgeRisk,
  buildBridgeQuestion, buildNameOffers, buildNeedToKnowQuestion,
  buildTriggerPrompt, canMoveOn, makeCardText, newBridgeDraft,
  offerToName, type BridgeDraft
} from './bridgeEngine';
import {
  dueBridgeReviews, makeBridgeCard, loadBridgeCards, saveBridgeCard,
  markBridgeReview, loadBridgeDraft, saveBridgeDraft,
  deleteAllBridgeData, BRIDGE_CARDS_KEY,
} from '../../store/bridgeStore';

function moshe():BridgeDraft {
  return {
    ...newBridgeDraft(),address:'m',step:9,
    sideA:'לכבד את אבא שלי',valueA:'כבוד והכרת תודה',
    sideB:'להיות האבא שאני רוצה להיות לילדים',valueB:'סבלנות ורוגע',
    trigger:'כשאבא מתקשר בערב ומעיר על החינוך',
    inventorySide:'b',
    moments:[{scene:'כשיוסי שבר כוס וכרעתי לידו ושאלתי אם הוא בסדר',saw:'יוסי ליד הכוס',heard:'הוא ענה לי',felt:'רוגע'}],
    bridgeAnswer:'אני מכבד את אבא וגם את הילד שלי',
    chosenName:'הכבוד שאני בוחר',beforePull:8,afterPull:3,
  };
}
describe('bridge rule-based engine',()=>{
  it('builds Moshe bridge from the user moment and the OTHER side without changing gender',()=>{
    const d=moshe(),question=bridgeMomentQuestion(d);
    expect(question).toContain('כשיוסי שבר כוס וכרעתי לידו');
    expect(question).toContain('כבוד והכרת תודה');
    expect(question).toContain('איך');
    expect(question).toContain('גם');
    expect(question).toContain('כשאתה');
    expect(question).not.toMatch(/את\/ה|undefined|""/);
    expect(buildNeedToKnowQuestion(d.sideA)).toBe('מה הצד של לכבד את אבא שלי צריך לדעת כדי שיוכל להירגע?');
  });
  it('provides three tentative name offers, with no forced name',()=>{
    const offers=buildNameOffers(moshe());
    expect(offers).toHaveLength(3);
    expect(offers.every(x=>x.startsWith('יש שקוראים לזה'))).toBe(true);
    expect(offerToName(offers[0])).toContain('כבוד והכרת תודה וגם סבלנות ורוגע');
  });
  it('uses correct forms for each requested gender and number',()=>{
    for (const [address,subject,command] of [['m','אתה','דמיין'],['f','את','דמייני'],['pl','אתם','דמיינו']] as const) {
      expect(buildBridgeQuestion({moment:'ישבתי ליד הילד',otherSide:'משפחה',address})).toContain('כש'+subject);
      expect(buildTriggerPrompt('כשאבא מגיע',address)).toContain(command);
      expect(ADDRESS_FORMS[address].subject).toBe(subject);
    }
    expect(buildBridgeQuestion({moment:'',otherSide:'',address:'f'})).not.toMatch(/undefined|""/);
  });
  it('blocks harmful content anywhere in the flow',()=>{
    expect(bridgeRisk({...moshe(),nextAction:'אני רוצה להתאבד'})).toBe(true);
    expect(bridgeRisk({...moshe(),moments:[{scene:'אני הולך להרוג',saw:'',heard:'',felt:''}]})).toBe(true);
    expect(bridgeRisk(moshe())).toBe(false);
  });
  it('requires two sides, both values, a moment, a bridge answer and a chosen name',()=>{
    const d=moshe();
    expect(canMoveOn({...d,step:1,sideB:''})).toBe(false);
    expect(canMoveOn({...d,step:2,valueA:''})).toBe(false);
    expect(canMoveOn({...d,step:3,moments:[]})).toBe(false);
    expect(canMoveOn({...d,step:5,bridgeAnswer:''})).toBe(false);
    expect(canMoveOn({...d,step:6,chosenName:''})).toBe(false);
    expect(canMoveOn({...d,step:9})).toBe(true);
  });
  it('prints the saved card and numerical change and return schedule',()=>{
    const card=makeBridgeCard(moshe(),new Date('2026-11-21T10:00:00Z'));
    const text=makeCardText(card);
    expect(text).toContain('הכבוד שאני בוחר');
    expect(text).toContain('8 ← 3');
    expect(text).toContain('יום 1');
    expect(text).toContain('יום 3');
    expect(text).toContain('יום 7');
  });
});
describe('private bridge card storage',()=>{
  it('keeps user work and schedules independent day 1, 3 and 7 returns',()=>{
    localStorage.clear();
    const d=moshe();
    expect(saveBridgeDraft({...d,step:4})).toBe(true);
    expect(loadBridgeDraft().step).toBe(4);
    const saved=makeBridgeCard(d,new Date(2026,10,21,12));
    expect(saveBridgeCard(saved)).toBe(true);
    expect(loadBridgeCards()).toHaveLength(1);
    expect(dueBridgeReviews(loadBridgeCards(),new Date(2026,10,21,20))).toHaveLength(0);
    expect(dueBridgeReviews(loadBridgeCards(),new Date(2026,10,22,14)).map(x=>x.day)).toEqual([1]);
    expect(markBridgeReview(saved.id,1,'yes','not-yet',new Date(2026,10,22,14))).toBe(true);
    expect(dueBridgeReviews(loadBridgeCards(),new Date(2026,10,24,14)).map(x=>x.day)).toEqual([3]);
    expect(markBridgeReview(saved.id,3,'almost','yes',new Date(2026,10,24,14))).toBe(true);
    expect(dueBridgeReviews(loadBridgeCards(),new Date(2026,10,28,14)).map(x=>x.day)).toEqual([7]);
    deleteAllBridgeData();
    expect(loadBridgeCards()).toHaveLength(0);
    expect(loadBridgeDraft().step).toBe(0);
  });
  it('does not save risky transcripts as drafts or cards',()=>{
    localStorage.clear();
    expect(saveBridgeDraft({...moshe(),bridgeAnswer:'אני רוצה להתאבד'})).toBe(false);
    expect(loadBridgeDraft().step).toBe(0);
    expect(saveBridgeCard(makeBridgeCard({...moshe(),nextAction:'אני רוצה להרוג'}))).toBe(false);
    expect(localStorage.getItem(BRIDGE_CARDS_KEY)).toBeNull();
  });
});
