// @vitest-environment jsdom
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,within} from '@testing-library/react';
import {BridgePage} from './BridgePage';
import {BRIDGE_CASES} from './bridgeCases';
import {BRIDGE_DRAFT_KEY,BRIDGE_CARDS_KEY,loadBridgeCards,makeBridgeCard,saveBridgeCard} from '../../store/bridgeStore';
import {newBridgeDraft} from './bridgeEngine';

beforeEach(()=>{
  localStorage.clear();
  Element.prototype.scrollIntoView=vi.fn();
  vi.spyOn(window,'setInterval').mockImplementation(()=>0 as unknown as number);
  vi.spyOn(window,'clearInterval').mockImplementation(()=>{});
});
afterEach(()=>{cleanup();vi.restoreAllMocks();});

function chooseCorrect(){
  const group=screen.getByRole('group',{name:'בחר את התגובה המתאימה'});
  const c=BRIDGE_CASES[0];
  const current=screen.queryByText('מה אתה שומע כאן?')?c.orOptions:
    screen.queryByText('מה חשוב לו באמת בכל צד?')?c.valueOptions:
    screen.queryByText('איזה רגע כדאי לקחת לגשר?')?c.memoryOptions:
    screen.queryByText(/איך תעזור ל/) ?c.bridgeOptions:
    screen.queryByText('מה תגיד עכשיו?')?c.bodyOptions:c.testOptions;
  fireEvent.click(within(group).getByRole('button',{name:new RegExp(current.find(o=>o.best)!.label.slice(0,10))}));
}
function playUntilSummary(){
  render(<BridgePage/>);
  expect(screen.getByRole('group',{name:'שיחה בין מטפל לבין משה'})).toBeTruthy();
  expect(screen.queryByRole('progressbar')).toBeNull();
  chooseCorrect(); // OR
  chooseCorrect(); // values
  chooseCorrect(); // real moment
  fireEvent.click(screen.getByRole('button',{name:/אל שאלת הגשר/}));
  chooseCorrect(); // bridging question
  fireEvent.click(screen.getByRole('button',{name:'כבוד בדרך שלי'}));
  chooseCorrect(); // gentle body check
  chooseCorrect(); // transfer
}

describe('Bridge guided case trainer',()=>{
 it('begins with a realistic client/therapist conversation and no forms',()=>{
   render(<BridgePage/>);
   expect(screen.getByText(/כל ערב אבא מתקשר/)).toBeTruthy();
   expect(screen.getByText(/אם אני לא מקשיב לאבא/)).toBeTruthy();
   expect(screen.queryByRole('progressbar')).toBeNull();
   expect(screen.queryByLabelText('מצד אחד')).toBeNull();
   expect(screen.getByText('מה אתה שומע כאן?')).toBeTruthy();
 });
 it('gives explanatory feedback for an incorrect interpretation, then lets the learner continue',()=>{
   render(<BridgePage/>);
   const group=screen.getByRole('group',{name:'בחר את התגובה המתאימה'});
   fireEvent.click(within(group).getByRole('button',{name:/אבא שלו צודק/}));
   expect(screen.getByRole('status').textContent).toMatch(/מחפשים את שני הדברים/);
   expect(screen.getByText('מה אתה שומע כאן?')).toBeTruthy();
   chooseCorrect();
   expect(screen.getByText('מה חשוב לו באמת בכל צד?')).toBeTruthy();
 });
 it('completes Moshe and saves a case card for day 1,3,7',()=>{
   playUntilSummary();
   expect(screen.getByText(/הוא הצליח לעצור ולפנות ליוסי/)).toBeTruthy();
   expect(screen.getByText('לפני: 8/10')).toBeTruthy();
   expect(screen.getByText('אחרי: 6/10')).toBeTruthy();
   fireEvent.click(screen.getByRole('button',{name:'שמור את הכרטיס לתרגול חוזר'}));
   expect(screen.getByText(/חזרות: יום 1, יום 3 ויום 7/)).toBeTruthy();
   expect(loadBridgeCards()).toHaveLength(1);
   expect(loadBridgeCards()[0].draft.caseId).toBe('moshe');
 });
 it('offers three distinct full dialogue cases and private own-story mode',()=>{
   render(<BridgePage/>);
   fireEvent.click(screen.getByRole('button',{name:/נועה · עבודה ומשפחה/}));
   expect(screen.getByText(/הבטחתי לבת שלי/)).toBeTruthy();
   fireEvent.click(screen.getByRole('button',{name:/דניאל · אמת וקשר/}));
   expect(screen.getByText(/חבר שלי אלון/)).toBeTruthy();
   fireEvent.click(screen.getByRole('button',{name:/מקרה משלי/}));
   expect(screen.getByRole('heading',{name:'מה שני הדברים שמושכים אותך?'})).toBeTruthy();
 });
 it('does not resume the obsolete onboarding form saved by older versions',()=>{
   localStorage.setItem('wisdom:bridge:draft:v1',JSON.stringify({...newBridgeDraft(),trainingMode:'personal',step:1,sideA:'משהו ישן'}));
   render(<BridgePage/>);
   expect(screen.getByText(/כל ערב אבא מתקשר/)).toBeTruthy();
   expect(localStorage.getItem('wisdom:bridge:draft:v1')).toBeNull();
 });
 it('has gender and theory settings only in a help overlay',()=>{
   render(<BridgePage/>);
   expect(screen.queryByRole('dialog')).toBeNull();
   fireEvent.click(screen.getByRole('button',{name:'עזרה והגדרות'}));
   const dialog=screen.getByRole('dialog',{name:'איך הגשר עובד?'});
   fireEvent.click(within(dialog).getByRole('button',{name:'את'}));
   expect(within(dialog).getByRole('button',{name:'את'}).getAttribute('aria-pressed')).toBe('true');
   fireEvent.click(within(dialog).getByRole('button',{name:'סגירת העזרה'}));
   expect(screen.queryByRole('dialog')).toBeNull();
 });
 it('surfaces due day-one card review in same trainer',()=>{
   const draft={...newBridgeDraft(),step:8,chosenName:'הגשר שלי',sideA:'בית',sideB:'עבודה'};
   const card=makeBridgeCard(draft,new Date(Date.now()-2*86400000));
   saveBridgeCard(card);
   render(<BridgePage/>);
   fireEvent.click(screen.getByRole('button',{name:/יום 1 · הגשר שלי/}));
   expect(screen.getByRole('group',{name:'האם השם עדיין מתאים'})).toBeTruthy();
 });
 it('does not require patient personal details and has no external LLM dependency',()=>{
   render(<BridgePage/>);
   expect(localStorage.getItem(BRIDGE_CARDS_KEY)).toBeNull();
   expect(JSON.parse(localStorage.getItem(BRIDGE_DRAFT_KEY)!).trainingMode).toBe('case');
 });
});
