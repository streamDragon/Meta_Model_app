// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { XP_REWARDS } from '../../store/progress';
import { ThoughtMap } from './ThoughtMap';

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(cleanup);

describe('ThoughtMap mobile wizard', () => {
  it('uses one card at a time, then analyzes and saves the map', () => {
    const onAward = vi.fn();
    const onSaved = vi.fn();

    render(<ThoughtMap mobileMode onAward={onAward} onSaved={onSaved} />);

    expect(screen.getByText('לא נלחמים במחשבה. פותחים אותה.')).toBeTruthy();
    expect(screen.queryByLabelText('מה קרה סביב זה?')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'המשך להקשר' }));
    expect(screen.getByText('הקשר ותחושה')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'פתח למפת מחשבה' }));
    expect(screen.getByText(/modal operator/i)).toBeTruthy();
    expect(screen.getByText(/מי זה "כולם"/)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'שמור מפת מחשבה' }));
    expect(onAward).toHaveBeenCalledWith(XP_REWARDS.thoughtMapComplete);
    expect(onSaved).toHaveBeenCalledTimes(1);
    expect(JSON.parse(window.localStorage.getItem('cbtSessions') ?? '[]')).toHaveLength(1);
  });
});
