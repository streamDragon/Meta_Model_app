// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ProgressProvider } from '../../store/useProgress';
import { STORAGE_KEY } from '../../store/progress';
import { DAILY_STORAGE_KEY, isoDay } from '../../lib/dailySet';
import { DailySetPage } from './DailySetPage';

beforeEach(() => {
  localStorage.clear();
  window.scrollTo = vi.fn();
  window.requestAnimationFrame = ((cb: FrameRequestCallback) => { cb(0); return 0; }) as typeof window.requestAnimationFrame;
});
afterEach(cleanup);

const renderPage = () => render(<ProgressProvider><DailySetPage /></ProgressProvider>);

// Answer every item: first option for choices; for writing, type a question,
// compare, and tick only when told to.
function playThrough({ tickCore }: { tickCore: boolean }) {
  for (let step = 0; step < 8; step++) {
    const textarea = screen.queryByRole('textbox');
    if (textarea) {
      fireEvent.change(textarea, { target: { value: 'איך אתה יודע את זה?' } });
      fireEvent.click(screen.getByRole('button', { name: 'השוו לשאלה לדוגמה' }));
      if (tickCore) fireEvent.click(screen.getAllByRole('checkbox')[0]);
    } else {
      const options = document.querySelectorAll<HTMLButtonElement>('.daily-option');
      fireEvent.click(options[0]);
    }
    fireEvent.click(screen.getByRole('button', { name: /^(הבא|לסיכום)$/ }));
  }
}

describe('DailySetPage', () => {
  it('runs 8 items one at a time and records one session at the end', () => {
    renderPage();
    expect(screen.getByText('1/8')).toBeTruthy();
    playThrough({ tickCore: true });
    expect(screen.getByText('סיימתם את הסט')).toBeTruthy();
    const progress = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
    expect(progress.sessions).toBe(1);
    const daily = JSON.parse(localStorage.getItem(DAILY_STORAGE_KEY) ?? '{}');
    expect(daily.completedDays).toEqual([isoDay()]);
  });

  it('shows the model question only after the learner writes or asks to see it', () => {
    renderPage();
    // Skip to the first writing item.
    for (let step = 0; step < 5; step++) {
      fireEvent.click(document.querySelectorAll<HTMLButtonElement>('.daily-option')[0]);
      fireEvent.click(screen.getByRole('button', { name: 'הבא' }));
    }
    expect(screen.queryByText('שאלה לדוגמה:')).toBeNull();
    const compare = screen.getByRole('button', { name: 'השוו לשאלה לדוגמה' }) as HTMLButtonElement;
    expect(compare.disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'לא יודע/ת, הראו לי' }));
    expect(screen.getByText('שאלה לדוגמה:')).toBeTruthy();
  });

  it('queues unticked written answers for review tomorrow', () => {
    renderPage();
    playThrough({ tickCore: false });
    const daily = JSON.parse(localStorage.getItem(DAILY_STORAGE_KEY) ?? '{}');
    const writeMisses = daily.queue.filter((e: { kind: string }) => e.kind === 'write');
    expect(writeMisses.length).toBe(3);
  });

  it('tells a returning learner the set is done and offers another', () => {
    localStorage.setItem(DAILY_STORAGE_KEY, JSON.stringify({ queue: [], patterns: {}, completedDays: [isoDay()] }));
    renderPage();
    expect(screen.getByText('כבר התאמנתם היום')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'עוד סט' }));
    expect(screen.getByText('1/8')).toBeTruthy();
  });
});
