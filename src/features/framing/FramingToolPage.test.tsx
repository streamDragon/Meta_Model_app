// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import App from '../../App';
import { challenges, directions, missions } from '../../data/framingCrossGame';

beforeEach(() => {
  vi.spyOn(Math, 'random').mockReturnValue(0.999);
  localStorage.clear();
  window.location.hash='framing';
  window.scrollTo=vi.fn();
  Object.defineProperty(window,'matchMedia',{writable:true,value:vi.fn().mockImplementation(()=>({matches:false,addEventListener:vi.fn(),removeEventListener:vi.fn()}))});
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

const root=()=>document.querySelector('.ftg') as HTMLElement;

describe('four-direction Breen framing practice', () => {
 it('shows four directions and the initially empty center map', () => {
  render(<App/>);
  const r=within(root());
  expect(r.getByText('מפת האדם')).toBeTruthy();
  for(const direction of Object.values(directions))expect(r.getByText(new RegExp(direction.title))).toBeTruthy();
  expect(r.getByText(/0 מתוך 4 כיוונים/)).toBeTruthy();
  expect(r.getAllByText('עדיין אין מידע')).toHaveLength(4);
 });
 it('accepts either of two good questions and only stores data after emotion and certainty', () => {
  render(<App/>);const r=within(root());
  const firstQuestion=r.getByText(missions[0].options[0].text);
  fireEvent.click(firstQuestion);
  expect(r.getByText(missions[0].options[0].reply!)).toBeTruthy();
  expect(r.getByText(/0 מתוך 4 כיוונים/)).toBeTruthy();
  fireEvent.click(r.getByRole('button',{name:'שאל על הרגש'}));
  expect(r.getByText('״'+missions[0].options[0].feeling+'״')).toBeTruthy();
  fireEvent.click(r.getByRole('button',{name:'שאל על ודאות'}));
  expect(r.getByText('״7 מתוך 10״')).toBeTruthy();
  fireEvent.click(r.getByRole('button',{name:'הוסף למפה והמשך'}));
  expect(r.getByText(/1 מתוך 4 כיוונים/)).toBeTruthy();
  expect(r.getByText(missions[0].options[0].finding!)).toBeTruthy();
 });
 it('does not accept wrong direction questions and can reset by topic',()=>{
  render(<App/>);const r=within(root());
  fireEvent.click(r.getByText(missions[0].options[2].text));
  expect(r.getByText(/לא חוקרת את הכיוון/)).toBeTruthy();
  expect(r.getByText(/0 מתוך 4 כיוונים/)).toBeTruthy();
  fireEvent.click(r.getByRole('button',{name:'מטרה'}));
  expect(r.getByText(/אני רוצה קשר שיש בו הדדיות/)).toBeTruthy();
  expect(r.getByText(/0 מתוך 4 כיוונים/)).toBeTruthy();
 });
 it('defines precisely two acceptable choices per direction and two in the final challenge',()=>{
  for(const m of missions){expect(m.options).toHaveLength(4);expect(m.options.filter(o=>o.good)).toHaveLength(2);}
  expect(challenges).toHaveLength(4);expect(challenges.filter(o=>o.good)).toHaveLength(2);
 });
 it('retains access from conversation practice without changing the mobile bottom nav',()=>{
  window.location.hash='conversation';
  render(<App/>);
  expect(screen.getByRole('button',{name:/לגלות את מפת האדם/})).toBeTruthy();
  expect(within(screen.getByLabelText('ניווט מהיר במובייל')).getAllByRole('button')).toHaveLength(5);
 });
});
