// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../App';
import { RealityExperiment } from './RealityExperiment';
import { ActivationBuilder } from './ActivationBuilder';
import { loadCbtSessions } from './cbtStorage';

beforeEach(() => {
  localStorage.clear();
  window.location.hash = '';
  window.scrollTo = vi.fn();
  Object.defineProperty(window, 'matchMedia', { writable: true, value: vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })) });
});
afterEach(cleanup);

describe('feature purpose and continuity', () => {
  it('updates one experiment with observations and permits an unchanged belief without duplicate rewards', () => {
    const onAward = vi.fn(), onSaved = vi.fn();
    render(<RealityExperiment onAward={onAward} onSaved={onSaved} />);
    const button = screen.getByText('שמור תוכנית לניסוי') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    for (const [label, value] of [
      ['מה אתה מצפה שיקרה?', 'אם אבקש עזרה לא יענו'],
      ['מה הפעולה הקטנה שתנסה?', 'אבקש מחבר עזרה במשימה'],
      ['מתי ואיפה?', 'מחר בבוקר בשיחה'],
      ['מה תבדוק בפועל?', 'התגובה לבקשה'],
    ]) fireEvent.change(screen.getByLabelText(label), { target: { value } });
    fireEvent.click(button);
    const id = loadCbtSessions()[0].sessionId;
    fireEvent.change(screen.getByLabelText('מה ראית או שמעת בפועל?'), { target: { value: 'החבר אמר שלא יוכל מחר' } });
    fireEvent.change(screen.getByLabelText('מה למדת, ומה עדיין לא ברור?'), { target: { value: 'לא ברור אם זמן אחר יתאים' } });
    fireEvent.click(screen.getByText('שמור תוצאה ולמידה'));
    const sessions = loadCbtSessions();
    expect(sessions).toHaveLength(1);
    expect(sessions[0]).toMatchObject({ sessionId: id, result: 'החבר אמר שלא יוכל מחר', beliefStrengthAfter: 70 });
    expect(onAward).toHaveBeenCalledTimes(1);
    expect(onSaved).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByText('ניסוי חדש'));
    fireEvent.click(screen.getByText('אם אבקש עזרה לא יענו'));
    expect(screen.getByLabelText('מה ראית או שמעת בפועל?')).toHaveProperty('value', 'החבר אמר שלא יוכל מחר');
    expect(onAward).toHaveBeenCalledTimes(1);
  });

  it('keeps mobile thought drafts across tabs and transfers the actual thought into an experiment', () => {
    window.location.hash = 'beliefs-reality-lab';
    render(<App />);
    const panel = document.getElementById('beliefs-reality-lab')!;
    const thought = within(panel).getByLabelText('משפט שתפס אותך');
    fireEvent.change(thought, { target: { value: 'אם אבקש עזרה לא יענו לי' } });
    fireEvent.click(within(panel).getByRole('tab', { name: 'ניסוי מציאות' }));
    fireEvent.change(within(panel).getByLabelText('מה אתה מצפה שיקרה?'), { target: { value: 'טיוטת ניסוי' } });
    fireEvent.click(within(panel).getByRole('tab', { name: 'מפת מחשבה' }));
    expect(thought).toHaveProperty('value', 'אם אבקש עזרה לא יענו לי');
    fireEvent.click(within(panel).getByRole('tab', { name: 'ניסוי מציאות' }));
    expect(within(panel).getByLabelText('מה אתה מצפה שיקרה?')).toHaveProperty('value', 'טיוטת ניסוי');
    fireEvent.click(within(panel).getByRole('tab', { name: 'מפת מחשבה' }));
    const next = within(panel).getByRole('button', { name: /המשך/ });
    fireEvent.click(next);
    fireEvent.click(within(panel).getByRole('button', { name: 'פתח למפת מחשבה' }));
    fireEvent.click(within(panel).getByText('המשך עם המחשבה הזו לניסוי'));
    expect(within(panel).getByLabelText('מה אתה מצפה שיקרה?')).toHaveProperty('value', 'אם אבקש עזרה לא יענו לי');
  });

  it('awards a reported action once and blocks an empty action', () => {
    const award = vi.fn();
    render(<ActivationBuilder onAward={award} />);
    const action = screen.getByLabelText('הפעולה הכי קטנה שמחזירה תנועה');
    fireEvent.change(action, { target: { value: ' ' } });
    const button = screen.getByText('ניסיתי את הפעולה') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    fireEvent.change(action, { target: { value: 'לפתוח את המסמך' } });
    fireEvent.click(button); fireEvent.click(button);
    expect(award).toHaveBeenCalledTimes(1);
  });
});
