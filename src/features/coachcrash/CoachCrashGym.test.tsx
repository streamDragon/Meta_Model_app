// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { CoachCrashGym } from './CoachCrashGym';

afterEach(cleanup);

describe('COACH / CRASH embodied trainer', () => {
  it('starts with observation, and keeps later steps gated', () => {
    render(<CoachCrashGym />);
    expect(screen.getByText('סטודיו תנוחה')).toBeTruthy();
    expect(screen.getByRole('button', { name: /02 מתרגלים/ }).hasAttribute('disabled')).toBe(true);
    expect(screen.getByRole('button', { name: /03 מעבירים לחיים/ }).hasAttribute('disabled')).toBe(true);
  });

  it('supports an explicit before/after body check-in without scoring emotions', () => {
    render(<CoachCrashGym />);
    const before = screen.getByRole('group', { name: 'תחושה לפני התרגול' });
    fireEvent.click(within(before).getByRole('button', { name: 'מכווץ/ת' }));
    fireEvent.click(screen.getByRole('button', { name: /זיהיתי · לתרגול/ }));
    expect(screen.getByText('מנח בתחילה')).toBeTruthy();
    const after = screen.getByRole('group', { name: 'תחושה אחרי התרגול' });
    fireEvent.click(within(after).getByRole('button', { name: 'עם מרחב' }));
    fireEvent.click(screen.getByRole('button', { name: /ניסיתי · להמשך/ }));
    const summary = screen.getByLabelText('מבט אישי על התחושה');
    expect(within(summary).getByText('מכווץ/ת')).toBeTruthy();
    expect(within(summary).getByText('עם מרחב')).toBeTruthy();
    expect(within(summary).getByText(/אין כאן ציון/)).toBeTruthy();
  });

  it('offers both conscious body practice and guided imagery', () => {
    render(<CoachCrashGym />);
    fireEvent.click(screen.getByRole('button', { name: /זיהיתי · לתרגול/ }));
    expect(screen.getByText('מצא/י תנוחה נוחה. הרגש/י את המגע עם הרצפה, שחרר/י מעט את הכתפיים ותן/י לנשימה לחזור לקצב נוח.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /דרך הדמיון/ }));
    expect(screen.getByText(/דמיין\/י מקום שבו הגוף מרגיש יציב/)).toBeTruthy();
  });

  it('switches focus areas and resets the current exercise', () => {
    render(<CoachCrashGym />);
    fireEvent.click(screen.getByRole('button', { name: /זיהיתי · לתרגול/ }));
    fireEvent.click(screen.getByRole('button', { name: /פתיחות/ }));
    expect(screen.getByText('מ־תגובה אוטומטית אל פתיחות')).toBeTruthy();
    expect(screen.getByRole('button', { name: /02 מתרגלים/ }).hasAttribute('disabled')).toBe(true);
  });
});
