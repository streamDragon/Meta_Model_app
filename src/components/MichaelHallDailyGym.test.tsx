// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MichaelHallDailyGym } from './MichaelHallDailyGym';
import { michaelHallDailyCards } from '../data/michaelHallDailyCards';

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
    const complete = screen.getByRole('button', { name: 'היום סיימתי' }) as HTMLButtonElement;
    expect(complete.disabled).toBe(true);
    fireEvent.click(screen.getAllByRole('checkbox')[0]);
    expect(complete.disabled).toBe(true);
    fireEvent.click(screen.getAllByRole('checkbox')[1]);
    fireEvent.click(complete);
    expect(complete.disabled).toBe(true);

    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}');
    expect(stored.currentCardId).toBe('mh-day-01');
    expect(stored.completedCardIds).toContain('mh-day-01');
    expect(stored.notesByCardId['mh-day-01']).toContain('סימפטום');
    expect(stored.streakCount).toBe(1);
    expect(stored.lastCompletedDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('ends the day with a completion card naming what was practised and what comes next', () => {
    render(<MichaelHallDailyGym />);
    expect(screen.queryByText('✓ סיימת להיום')).toBeNull();
    fireEvent.click(screen.getAllByRole('checkbox')[0]);
    fireEvent.click(screen.getAllByRole('checkbox')[1]);
    fireEvent.click(screen.getByRole('button', { name: 'היום סיימתי' }));
    const done = screen.getByLabelText('סיכום האימון היומי');
    expect(within(done).getByText('✓ סיימת להיום')).toBeTruthy();
    expect(within(done).getByText(michaelHallDailyCards[0].exercisesHe[0])).toBeTruthy();
    expect(within(done).getByText(michaelHallDailyCards[1].titleHe)).toBeTruthy();
    expect(within(done).getByText(/מחר/)).toBeTruthy();
  });

  it('shows no English subtitle line for the card title', () => {
    render(<MichaelHallDailyGym />);
    expect(screen.queryByText(michaelHallDailyCards[0].titleEn)).toBeNull();
    expect(screen.queryByText('Michael Hall Daily Gym')).toBeNull();
  });
});
