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

  it('distinguishes the source movement from the same movement in quiet attention', () => {
    render(<CoachCrashGym />);
    fireEvent.click(screen.getByRole('button', { name: /זיהיתי · לתרגול/ }));
    expect(screen.getAllByText(/התחילו בתנועת כיווץ קטנה/).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: /תנועה בריכוז עדין/ }));
    expect(screen.getAllByText(/ביצוע שקט של אותה תנועה/).length).toBeGreaterThan(0);
  });

  it('presents the four Holding mantras as sourced practice, not a healing promise', () => {
    render(<CoachCrashGym />);
    fireEvent.click(screen.getByRole('button', { name: /החזקה.*פגיעה או עוינות/ }));
    fireEvent.click(screen.getByRole('button', { name: /זיהיתי · לתרגול/ }));
    expect(screen.getByText('זה מאוד מעניין.')).toBeTruthy();
    expect(screen.getByText(/משהו מתחיל להתעורר/)).toBeTruthy();
    expect(screen.getByText('ברוך הבא.')).toBeTruthy();
    expect(screen.getByText(/לא קביעה שמשהו אכן מתרפא/)).toBeTruthy();
  });

  it('switches focus areas and resets the current exercise', () => {
    render(<CoachCrashGym />);
    fireEvent.click(screen.getByRole('button', { name: /זיהיתי · לתרגול/ }));
    fireEvent.click(screen.getByRole('button', { name: /פתיחות/ }));
    expect(screen.getByText('מ־תגובה אוטומטית אל פתיחות')).toBeTruthy();
    expect(screen.getByRole('button', { name: /02 מתרגלים/ }).hasAttribute('disabled')).toBe(true);
  });
});
