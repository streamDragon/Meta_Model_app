// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { XP_REWARDS } from '../../store/progress';
import { ThoughtMap } from './ThoughtMap';
import { analyzeThought } from './cbtEngine';
import { metaPatternLabel, patternLabel } from './cbtContent';

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

    expect(screen.getByLabelText('משפט שתפס אותך')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'המשך להקשר' }));
    expect(screen.getByText('הקשר ותחושה')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'פתח למפת מחשבה' }));
    expect(screen.getByText("חייב / לא יכול")).toBeTruthy();
    expect(screen.getByText(/מי זה "כולם"/)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'שמור מפת מחשבה' }));
    expect(onAward).toHaveBeenCalledWith(XP_REWARDS.thoughtMapComplete);
    expect(onSaved).toHaveBeenCalledTimes(1);
    expect(JSON.parse(window.localStorage.getItem('cbtSessions') ?? '[]')).toHaveLength(1);
  });
});

describe('thought map tag labels', () => {
  const samples = [
    'אני חייב לעשות מה שכולם אומרים.',
    'כולם תמיד חושבים שאני כישלון.',
    'אם אגיד משהו הם יכעסו עליי וזה יהיה נורא.',
    'אני לא מסוגל לעמוד מול אנשים.',
    'הוא לא ענה, זה אומר שהוא כועס.',
    'אני צריך שכולם יאהבו אותי.',
  ];

  it('maps every engine tag to a Hebrew label', () => {
    for (const text of samples) {
      const analysis = analyzeThought(text);
      for (const tag of analysis.cbtPatterns) expect(patternLabel(tag), tag).toMatch(/[\u0590-\u05FF]/);
      for (const tag of analysis.metaModelPatterns) expect(metaPatternLabel(tag), tag).toMatch(/[\u0590-\u05FF]/);
    }
    expect(patternLabel('approval_belief')).toBe('צורך באישור');
    expect(metaPatternLabel('missing_referential_index')).toBe('חסר "מי בדיוק"');
  });

  it('returns an empty label for unknown tags so they stay hidden', () => {
    expect(patternLabel('some_internal_tag')).toBe('');
    expect(metaPatternLabel('some_internal_tag')).toBe('');
  });

  it('never shows raw English tags on the map', () => {
    render(<ThoughtMap onAward={vi.fn()} onSaved={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('משפט שתפס אותך'), { target: { value: 'אני צריך שכולם יאהבו אותי, אחרת אני לא מסוגל.' } });
    fireEvent.click(screen.getByRole('button', { name: 'פתח למפת מחשבה' }));
    const chips = Array.from(document.querySelectorAll('.cbt-chip-group .chip')).map((chip) => chip.textContent ?? '');
    expect(chips.length).toBeGreaterThan(0);
    for (const chip of chips) expect(chip).not.toMatch(/[a-z]{3,}/i);
  });
});
