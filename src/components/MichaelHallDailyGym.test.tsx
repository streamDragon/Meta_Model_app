// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MichaelHallDailyGym } from './MichaelHallDailyGym';

const STORAGE_KEY = 'michaelHallDailyGym:v1';

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(cleanup);

describe('MichaelHallDailyGym', () => {
  it('renders a daily Neuro-Semantics trainer instead of a reader', () => {
    render(<MichaelHallDailyGym />);

    expect(screen.getByRole('heading', { name: /חדר אימון יומי/ })).toBeTruthy();
    expect(screen.getByText(/Neuro-Semantics/)).toBeTruthy();
    expect(screen.getByText(/שאלה יומית/)).toBeTruthy();
    expect(screen.getByText(/תרגילים/)).toBeTruthy();
    expect(screen.getByText(/לא לקרוא/)).toBeTruthy();
  });

  it('persists notes and completion progress locally by card id', () => {
    render(<MichaelHallDailyGym />);

    fireEvent.change(screen.getByLabelText('הערות אישיות'), {
      target: { value: 'שמתי לב שאני קורא לסימפטום בעיה.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'היום סיימתי' }));

    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}');
    expect(stored.currentCardId).toBe('mh-day-01');
    expect(stored.completedCardIds).toContain('mh-day-01');
    expect(stored.notesByCardId['mh-day-01']).toContain('סימפטום');
    expect(stored.streakCount).toBe(1);
    expect(stored.lastCompletedDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
