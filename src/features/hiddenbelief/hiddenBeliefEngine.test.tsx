// @vitest-environment jsdom
import { describe, expect, it, afterEach } from 'vitest';
import { cleanup, fireEvent, render, within } from '@testing-library/react';
import { analyseHiddenBeliefs, safetyRequiresReferral, validateBeliefHypothesis } from './hiddenBeliefEngine';
import { HiddenBeliefXrayPage } from './HiddenBeliefXrayPage';

afterEach(cleanup);
const moshe=[
 "My father calls every night and criticizes how I raise my kids.",
 "After the call I shout at the kids and hate myself.",
 "I think I'm an okay father. Most days.",
 "When Abba says something, it's like what I think stops counting. As if his voice is the real one.",
 "Just once I wish he'd see me.",
].join('\n');

describe('Hidden Belief X-Ray', () => {
  it('detects three bounded hypotheses from the fictional Moshe case with real evidence quotes', () => {
    const output=analyseHiddenBeliefs({text:moshe});
    expect(output).toHaveLength(3);
    expect(output.map(x=>x.type)).toEqual(['hidden_equation','fused','presupposition']);
    expect(output[1].breen_row).toBe(1);
    for(const item of output) {
      expect(validateBeliefHypothesis(item)).toBe(true);
      expect(item.status).toBe('hypothesis');
      expect(item.body_check_prompt.length).toBeGreaterThan(20);
      expect(item.hidden_belief).not.toMatch(/disorder|diagnosis/i);
      for(const evidence of item.evidence) expect(moshe).toContain(evidence.quote);
    }
  });
  it('stops when risk terms require safety support', () => {
    expect(safetyRequiresReferral('I plan to kill myself')).toBe(true);
    expect(analyseHiddenBeliefs({text:'I plan to kill myself\nNobody understands.'})).toHaveLength(0);
  });
  it('has working private transcript and training modes', () => {
    const {container}=render(<HiddenBeliefXrayPage />);
    const app=container.querySelector('.hbx-page') as HTMLElement;
    fireEvent.click(within(app).getByRole('button',{name:/מקרה לדוגמה/}));
    fireEvent.click(within(app).getByRole('button',{name:/גלה השערות/}));
    expect(within(app).getByText('3 השערות לבדיקה')).toBeTruthy();
    expect(within(app).getAllByText('השערה בלבד')).toHaveLength(3);
    fireEvent.click(within(app).getByRole('button',{name:/מיפוי לתבניות/}));
    expect(within(app).getByText(/שורת ברין \(מיפוי זמני לבדיקה\): 1/)).toBeTruthy();
    fireEvent.click(within(app).getAllByRole('button',{name:'מתאים'})[0]);
    expect(within(app).getByText(/סומן כמתאים/)).toBeTruthy();
    fireEvent.click(within(app).getByRole('button',{name:/נקה הכול/}));
    expect(within(app).queryByText('3 השערות לבדיקה')).toBeNull();
    expect((within(app).getByLabelText(/הדבק כמה משפטים/) as HTMLTextAreaElement).value).toBe('');
    fireEvent.click(within(app).getByRole('button',{name:/אימון מטפל/}));
    expect(within(app).getByLabelText('מה שאלת?')).toBeTruthy();
  });
});
