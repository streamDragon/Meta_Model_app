// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { SleightOfMouthPage } from './SleightOfMouthPage';
import { LANGUAGE_CASES, REFRAIMING_MOVES, buildStatement } from '../../data/sleightOfMouth';

afterEach(cleanup);

describe('Sleight of Mouth + Beyond Words practice', () => {
  it('provides exactly three Hebrew structures and three reframing moves', () => {
    expect(LANGUAGE_CASES.map((item) => item.id)).toEqual(['generalization', 'causality', 'equivalence']);
    expect(REFRAIMING_MOVES.map((item) => item.id)).toEqual(['counterexample', 'redefinition', 'consequence']);
    expect(buildStatement(LANGUAGE_CASES[0], 0, 'לפעמים')).toBe('לפעמים עדיף להימנע ממחלוקת.');
  });

  it('supports tapping a word and selecting another quantifier on mobile-style controls', () => {
    render(<SleightOfMouthPage />);
    const statement = screen.getByTestId('som-statement');
    expect(within(statement).getByRole('button', { name: 'בחר רכיב: תמיד' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'לפעמים' }));
    expect(statement.textContent).toContain('לפעמיםעדיףלהימנעממחלוקת');
    expect(screen.getByText(/הניסוח השתנה/)).toBeTruthy();

    fireEvent.click(within(statement).getByRole('button', { name: 'בחר רכיב: ממחלוקת' }));
    expect(document.querySelector('.som-meta')?.textContent).toContain('מאיזו מחלוקת בדיוק?');
  });

  it('separates a meta-model question from an optional reframing answer', () => {
    render(<SleightOfMouthPage />);
    expect(document.querySelector('.som-meta')?.textContent).toContain('תמיד? יש מצב שבו מחלוקת עניינית עזרה?');
    const sample = LANGUAGE_CASES[0].examples.redefinition;
    expect(screen.queryByText(sample)).toBeNull();

    fireEvent.change(screen.getByLabelText('מה היית אומר בשיחה?'), { target: { value: 'אולי נוכל לדון בלי לריב?' } });
    expect((screen.getByLabelText('מה היית אומר בשיחה?') as HTMLTextAreaElement).value).toBe('אולי נוכל לדון בלי לריב?');

    fireEvent.click(screen.getByRole('button', { name: 'השווה דוגמה' }));
    expect(screen.getByText(sample)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /דוגמה נגדית/ }));
    expect(screen.queryByText(sample)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'השווה דוגמה' }));
    expect(screen.getByText(LANGUAGE_CASES[0].examples.counterexample)).toBeTruthy();
  });

  it('switches structures and clears the unsent practice text', () => {
    render(<SleightOfMouthPage />);
    fireEvent.change(screen.getByLabelText('מה היית אומר בשיחה?'), { target: { value: 'ניסיון אישי' } });
    fireEvent.click(screen.getByRole('button', { name: 'סיבה ותוצאה' }));
    expect(screen.getByTestId('som-statement').textContent).toContain('ההערה של המנהל');
    expect((screen.getByLabelText('מה היית אומר בשיחה?') as HTMLTextAreaElement).value).toBe('');
    expect(screen.getByText('איך בדיוק ההערה קשורה להחלטה שלך?')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'שקילות ומשמעות' }));
    expect(screen.getByTestId('som-statement').textContent).toContain('בקשת עזרה');
  });

  it('shows a hint only when requested', () => {
    render(<SleightOfMouthPage />);
    expect(screen.queryByText(/מתי דווקא יש ערך למחלוקת מכבדת?/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'רמז' }));
    expect(screen.getByText(/מתי דווקא יש ערך למחלוקת מכבדת?/)).toBeTruthy();
  });
});
