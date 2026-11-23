// @vitest-environment jsdom
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,within} from '@testing-library/react';
import {BridgePage,BRIDGE_INTRO_SEEN_KEY} from './BridgePage';
import {BRIDGE_CASES} from './bridgeCases';
import {BRIDGE_DRAFT_KEY,BRIDGE_CARDS_KEY,loadBridgeCards,makeBridgeCard,saveBridgeCard} from '../../store/bridgeStore';
import {newBridgeDraft} from './bridgeEngine';

beforeEach(()=>{
  localStorage.clear();
  localStorage.setItem(BRIDGE_INTRO_SEEN_KEY,'1');
  Element.prototype.scrollIntoView=vi.fn();
  vi.spyOn(window,'setInterval').mockImplementation(()=>0 as unknown as number);
  vi.spyOn(window,'clearInterval').mockImplementation(()=>{});
});
afterEach(()=>{cleanup();vi.restoreAllMocks();});

function chooseCorrect(){
  const group=screen.getByRole('group',{name:'בחר את התגובה המתאימה'});
  const c=BRIDGE_CASES[0];
  const current=screen.queryByText('איפה המלכוד?')?c.orOptions:
    screen.queryByText('מה מונע ממנו לצאת מהמלכוד?')?c.lockOptions:
    screen.queryByText('איזו אמת חלקית יש בכל צד?')?c.valueOptions:
    screen.queryByText('איזה רגע כדאי לקחת לגשר?')?c.memoryOptions:
    screen.queryByText('על איזה כלל אפשר לדבר מחדש?')?c.metaOptions:
    screen.queryByText(/איך תעזור ל/) ?c.bridgeOptions:
    screen.queryByText('מה תגיד עכשיו?')?c.bodyOptions:c.testOptions;
  fireEvent.click(within(group).getByRole('button',{name:new RegExp(current.find(o=>o.best)!.label.slice(0,10))}));
  expect(screen.getByRole('region',{name:'מה גילית ולמה זה חשוב'})).toBeTruthy();
  fireEvent.click(screen.getByRole('button',{name:/ממשיך לשיחה/}));
}
function playUntilSummary(){
  render(<BridgePage/>);
  expect(screen.getByRole('group',{name:'שיחה בין מטפל לבין משה'})).toBeTruthy();
  expect(screen.queryByRole('progressbar')).toBeNull();
  chooseCorrect(); // contradicting messages
  chooseCorrect(); // exit blocked
  chooseCorrect(); // partial truths
  chooseCorrect(); // resource moment
  fireEvent.click(screen.getByRole('button',{name:/בוא נבדוק את כללי המלכוד/}));
  chooseCorrect(); // metacommunication changes the rule
  chooseCorrect(); // bridge is optional, after opening the frame
  fireEvent.click(screen.getByRole('button',{name:'כבוד בדרך שלי'}));
  chooseCorrect(); // gentle body check
  chooseCorrect(); // transfer
}

describe('Bridge guided case trainer',()=>{
 it('shows a first visit introduction that explains the bridge, example, origin and exercise',()=>{
   localStorage.removeItem(BRIDGE_INTRO_SEEN_KEY);
   render(<BridgePage/>);
   const dialog=screen.getByRole('dialog',{name:'התמודדות עם Double Bind'});
   expect(within(dialog).getByText(/בייטסון, ג׳קסון, היילי וויקלנד/)).toBeTruthy();
   expect(within(dialog).getByText(/מי קבע שכבוד מחייב הסכמה/)).toBeTruthy();
   expect(within(dialog).getByText(/מקשיבים לשיחת מטפל ומטופל/)).toBeTruthy();
   fireEvent.click(within(dialog).getByRole('button',{name:/הבנתי, נכנסים לשיחה/}));
   expect(screen.queryByRole('dialog')).toBeNull();
   expect(localStorage.getItem(BRIDGE_INTRO_SEEN_KEY)).toBe('1');
   expect(screen.getByRole('group',{name:'שיחה בין מטפל לבין משה'})).toBeTruthy();
 });
 it('does not force the introduction again but can reopen it through What is this?',()=>{
   render(<BridgePage/>);
   expect(screen.queryByRole('dialog')).toBeNull();
   fireEvent.click(screen.getByRole('button',{name:'הקדמה והגדרות הגשר'}));
   expect(screen.getByRole('dialog',{name:'התמודדות עם Double Bind'})).toBeTruthy();
   fireEvent.click(screen.getByRole('button',{name:'סגירת ההקדמה'}));
   expect(screen.queryByRole('dialog')).toBeNull();
 });

 it('begins with a realistic client/therapist conversation and no forms',()=>{
   render(<BridgePage/>);
   expect(screen.getByText(/כל ערב אבא מתקשר/)).toBeTruthy();
   expect(screen.getByText(/אם אני לא מקשיב לאבא/)).toBeTruthy();
   expect(screen.queryByRole('progressbar')).toBeNull();
   expect(screen.queryByLabelText('מצד אחד')).toBeNull();
   expect(screen.getByText('איפה המלכוד?')).toBeTruthy();
 });
 it('gives explanatory feedback for an incorrect interpretation, then lets the learner continue',()=>{
   render(<BridgePage/>);
   const group=screen.getByRole('group',{name:'בחר את התגובה המתאימה'});
   fireEvent.click(within(group).getByRole('button',{name:/אבא שלו צודק/}));
   expect(screen.getByRole('status').textContent).toMatch(/הכללים/);
   expect(screen.getByText('איפה המלכוד?')).toBeTruthy();
   chooseCorrect();
   expect(screen.getByText('מה מונע ממנו לצאת מהמלכוד?')).toBeTruthy();
 });
 it('explains a correct choice before moving, including a visual map and next action',()=>{
   render(<BridgePage/>);
   const choices=screen.getByRole('group',{name:'בחר את התגובה המתאימה'});
   const right=BRIDGE_CASES[0].orOptions.find(o=>o.best)!;
   fireEvent.click(within(choices).getByRole('button',{name:new RegExp(right.label.slice(0,12))}));
   expect(screen.getByText('איפה המלכוד?')).toBeTruthy();
   const insight=screen.getByRole('region',{name:'מה גילית ולמה זה חשוב'});
   expect(within(insight).getByText('למה זה חשוב לשיחה?')).toBeTruthy();
   expect(within(insight).getByText('מה קורה עכשיו?')).toBeTruthy();
   expect(within(insight).getByRole('img',{name:/מפת המלכוד/})).toBeTruthy();
   expect(screen.queryByRole('progressbar')).toBeNull();
   fireEvent.click(within(insight).getByRole('button',{name:/ממשיך לשיחה/}));
   expect(screen.getByText('מה מונע ממנו לצאת מהמלכוד?')).toBeTruthy();
 });
 it('makes a wrong answer recoverable and provides guided decoding instead of trapping the learner',()=>{
   render(<BridgePage/>);
   const choices=screen.getByRole('group',{name:'בחר את התגובה המתאימה'});
   fireEvent.click(within(choices).getByRole('button',{name:/אבא שלו צודק/}));
   const msg=screen.getByRole('status');
   expect(within(msg).getByText('יש כאן משהו שעדיין חסר')).toBeTruthy();
   fireEvent.click(within(msg).getByRole('button',{name:'הראה לי את הפענוח'}));
   expect(screen.getByText('פענוח מודרך')).toBeTruthy();
   expect(screen.getByText('איפה המלכוד?')).toBeTruthy();
   fireEvent.click(screen.getByRole('button',{name:/ממשיך לשיחה/}));
   expect(screen.getByText('מה מונע ממנו לצאת מהמלכוד?')).toBeTruthy();
 });
 it('allows another attempt after a mistaken answer, without a score or restart',()=>{
   render(<BridgePage/>);
   const choices=screen.getByRole('group',{name:'בחר את התגובה המתאימה'});
   fireEvent.click(within(choices).getByRole('button',{name:/יוסי שובר דברים/}));
   fireEvent.click(screen.getByRole('button',{name:'מנסה תשובה אחרת'}));
   expect(screen.queryByText('יש כאן משהו שעדיין חסר')).toBeNull();
   const correct=BRIDGE_CASES[0].orOptions.find(o=>o.best)!;
   fireEvent.click(within(screen.getByRole('group',{name:'בחר את התגובה המתאימה'})).getByRole('button',{name:new RegExp(correct.label.slice(0,10))}));
   expect(screen.getByRole('region',{name:'מה גילית ולמה זה חשוב'})).toBeTruthy();
 });
 it('recognizes blocked exit and asks a meta question before allowing the bridge',()=>{
   render(<BridgePage/>);
   chooseCorrect();
   expect(screen.getByText('מה מונע ממנו לצאת מהמלכוד?')).toBeTruthy();
   chooseCorrect();
   expect(screen.getByText('איזו אמת חלקית יש בכל צד?')).toBeTruthy();
   chooseCorrect();
   chooseCorrect();
   fireEvent.click(screen.getByRole('button',{name:/בוא נבדוק את כללי המלכוד/}));
   expect(screen.getByText('על איזה כלל אפשר לדבר מחדש?')).toBeTruthy();
   expect(screen.queryByText(/איך תעזור ל/)).toBeNull();
   chooseCorrect();
   expect(screen.getByText(/מה השתנה\? לא האדם, אלא הכלל/)).toBeTruthy();
   expect(screen.getByText(/לכבד אדם גם בלי להסכים/)).toBeTruthy();
 });
 it('does not confuse a plain dilemma with a communication double bind in the intro',()=>{
   localStorage.removeItem(BRIDGE_INTRO_SEEN_KEY);
   render(<BridgePage/>);
   const dialog=screen.getByRole('dialog',{name:'התמודדות עם Double Bind'});
   expect(within(dialog).getByText(/אפילו לדבר על הסתירה או לצאת מהמצב/)).toBeTruthy();
   expect(within(dialog).getByText(/לפעמים הפתרון הוא גבול/)).toBeTruthy();
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
   fireEvent.click(screen.getByRole('button',{name:'הקדמה והגדרות הגשר'}));
   const dialog=screen.getByRole('dialog',{name:'התמודדות עם Double Bind'});
   fireEvent.click(within(dialog).getByText('הגדרות · לשון פנייה ומצב מטפל'));
   fireEvent.click(within(dialog).getByRole('button',{name:'את'}));
   expect(within(dialog).getByRole('button',{name:'את'}).getAttribute('aria-pressed')).toBe('true');
   fireEvent.click(within(dialog).getByRole('button',{name:'סגירת ההקדמה'}));
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
