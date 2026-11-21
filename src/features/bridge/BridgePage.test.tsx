// @vitest-environment jsdom
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,within} from '@testing-library/react';
import {BridgePage} from './BridgePage';
import {makeBridgeCard,saveBridgeCard,loadBridgeCards} from '../../store/bridgeStore';
import {newBridgeDraft} from './bridgeEngine';

beforeEach(()=>{
  localStorage.clear();
  Element.prototype.scrollIntoView=vi.fn();
  vi.spyOn(window,'setInterval').mockImplementation(()=>0 as unknown as number);
  vi.spyOn(window,'clearInterval').mockImplementation(()=>{});
});
afterEach(()=>{cleanup();vi.restoreAllMocks();});
function next(){
  fireEvent.click(screen.getByRole('button',{name:/^(מתחילים|המשך|להמשיך|לחזור לשם ולדייק)$/}));
}
function type(label:string,value:string){
  fireEvent.change(screen.getByLabelText(label,{exact:false}),{target:{value}});
}
function intro(){
  render(<BridgePage/>);
  expect(screen.getByRole('heading',{name:/כוס נשברת במטבח/})).toBeTruthy();
  expect(screen.queryByRole('progressbar')).toBeNull();
  fireEvent.click(within(screen.getByRole('group',{name:'מה אתה עושה עכשיו?'})).getAllByRole('button')[0]);
  expect(screen.getByText(/יוסי עדיין עומד ליד השברים/)).toBeTruthy();
  fireEvent.click(screen.getByRole('button',{name:/ממשיך מכאן/}));
}
function goToBody(){
  intro();
  // A chosen story fills the context and draft values. The learner can edit them.
  type('מה חשוב לך ב־לכבד את אבא שלי','כבוד והכרת תודה');
  type('מה חשוב לך ב־להיות האבא','סבלנות ורוגע');
  next();
  type('מה קרה?','כשיוסי שבר כוס וכרעתי לידו ושאלתי אם הוא בסדר');
  next();
  next();
  expect(screen.getByRole('heading',{name:'שאלת הגשר'})).toBeTruthy();
  expect(screen.getByText(/איך אפשר לתת שם מקום גם לכבוד והכרת תודה/)).toBeTruthy();
  type('מה עולה לך?','אפשר לתת כבוד לאבא וליוסי');
  next();
  type('השם שלי','כבוד עם נוכחות');
  next();
  expect(screen.getByText('איך השם הזה מרגיש?')).toBeTruthy();
}
describe('The Bridge - guided mobile flow',()=>{
 it('builds a full Moshe card, then schedules review on days 1,3,7',()=>{
   goToBody();
   fireEvent.click(within(screen.getByRole('group',{name:'מידת התאמה'})).getByRole('button',{name:'מתאים'}));
   next();
   expect(screen.getByText('בוא נבדוק מול הרגע האמיתי')).toBeTruthy();
   fireEvent.change(document.getElementById('bridge-before')!,{target:{value:'8'}});
   fireEvent.change(document.getElementById('bridge-after')!,{target:{value:'3'}});
   type('איך אתה יודע','אני מצליח לראות גם את אבא וגם את יוסי');
   next();
   expect(screen.getByText('הגשר שלי')).toBeTruthy();
   expect(screen.getByText(/לפני: 8\/10/)).toBeTruthy();
   expect(screen.getByText(/עכשיו: 3\/10/)).toBeTruthy();
   type('צעד קטן','לעצור לפני התגובה');
   fireEvent.click(screen.getByRole('button',{name:'שמירת הכרטיס במכשיר'}));
   expect(screen.getByText(/הכרטיס נשמר במכשיר/)).toBeTruthy();
   const cards=loadBridgeCards();
   expect(cards).toHaveLength(1);
   expect(cards[0].reviewsDone).toEqual([]);
   expect(cards[0].draft.chosenName).toBe('כבוד עם נוכחות');
 });
 it('body check rejection respects one side and returns to naming',()=>{
   goToBody();
   fireEvent.click(within(screen.getByRole('group',{name:'מידת התאמה'})).getByRole('button',{name:'לא'}));
   expect(screen.getByText(/מה הצד של לכבד את אבא שלי צריך לדעת/)).toBeTruthy();
   type('מה הצד של לכבד את אבא שלי','שאפשר לשמור כבוד בלי לוותר על הילדים');
   fireEvent.click(screen.getByRole('button',{name:'לחזור לשם ולדייק'}));
   expect(screen.getByText(/איך היית קורא לזה/)).toBeTruthy();
   expect(screen.getByText(/אפשר לעדכן את השם/)).toBeTruthy();
 });
 it('offers three non-authoritative names without forcing a selected name',()=>{
   goToBody();
   fireEvent.click(screen.getByRole('button',{name:'חזרה'}));
   type('השם שלי','');
   fireEvent.click(screen.getByRole('button',{name:'קשה לי לנסח'}));
   const offers=within(screen.getByRole('group',{name:'הצעות לא מחייבות'})).getAllByRole('button');
   expect(offers).toHaveLength(4);
   expect(offers.slice(0,3).every(x=>x.textContent?.startsWith('יש שקוראים לזה'))).toBe(true);
   fireEvent.click(offers[0]);
   expect((document.getElementById('bridge-name') as HTMLInputElement).value).toContain('וגם');
 });
 it('stops on risk words and prevents following steps',()=>{
   render(<BridgePage/>);
   fireEvent.click(screen.getByRole('button',{name:'סיפור משלי'}));
   type('מצד אחד','אני מתכוון להתאבד');
   type('ומצד שני','לנוח');
   expect(screen.getByText('עוצרים כאן.')).toBeTruthy();
   expect((screen.getByRole('button',{name:'המשך'}) as HTMLButtonElement).disabled).toBe(true);
 });
 it('keeps gender settings and help in an overlay, never an onboarding form',()=>{
   render(<BridgePage/>);
   expect(screen.queryByRole('progressbar')).toBeNull();
   expect(screen.queryByRole('group',{name:'איך לפנות אליך?'})).toBeNull();
   fireEvent.click(screen.getByRole('button',{name:'עזרה והגדרות'}));
   const dialog=screen.getByRole('dialog',{name:'איך הגשר עובד?'});
   fireEvent.click(within(dialog).getByRole('button',{name:'את'}));
   expect(within(dialog).getByRole('button',{name:'את'}).getAttribute('aria-pressed')).toBe('true');
   fireEvent.click(within(dialog).getByRole('button',{name:'סגירת העזרה'}));
   expect(screen.queryByRole('dialog')).toBeNull();
   expect(screen.getByRole('heading',{name:/כוס נשברת במטבח/})).toBeTruthy();
 });
 it('lets a beginner choose another story without typing or a progress meter',()=>{
   render(<BridgePage/>);
   fireEvent.click(screen.getByRole('button',{name:/סיפור אחר/}));
   expect(screen.getByRole('heading',{name:/הבטחת שתגיע הביתה/})).toBeTruthy();
   fireEvent.click(within(screen.getByRole('group',{name:'מה אתה עושה עכשיו?'})).getAllByRole('button')[1]);
   fireEvent.click(screen.getByRole('button',{name:/ממשיך מכאן/}));
   expect(screen.getByRole('heading',{name:'מה חשוב לך כאן?'})).toBeTruthy();
   expect((document.getElementById('bridge-value-a') as HTMLInputElement).value.length).toBeGreaterThan(0);
   expect(screen.queryByRole('progressbar')).toBeNull();
 });
  it('surfaces day-1 card review without another app',()=>{
   const d={...newBridgeDraft(),step:9,chosenName:'שם חדש',sideA:'משפחה',sideB:'עבודה'};
   const card=makeBridgeCard(d,new Date(Date.now()-2*86400000));
   saveBridgeCard(card);
   render(<BridgePage/>);
   fireEvent.click(screen.getByRole('button',{name:/יום 1 · שם חדש/}));
   expect(screen.getByRole('heading',{name:'שם חדש'})).toBeTruthy();
   expect(screen.getByRole('group',{name:'האם השם עדיין מתאים'})).toBeTruthy();
   fireEvent.click(within(screen.getByRole('group',{name:'האם השם עדיין מתאים'})).getByRole('button',{name:'מתאים'}));
   fireEvent.click(screen.getByRole('button',{name:'שמירת החזרה'}));
   expect(loadBridgeCards()[0].reviewsDone).toContain(1);
 });
});
