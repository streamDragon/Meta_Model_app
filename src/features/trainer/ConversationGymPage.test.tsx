// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import App from '../../App';
import { CONVERSATION_SCENARIOS } from '../../data/conversationScenarios';
import { CONVERSATION_DECISION_PATHS } from '../../data/conversationDecisionPaths';
import { LEARNING_KEY } from '../../lib/conversationLearning';

beforeEach(() => {
  localStorage.clear();
  window.location.hash = 'conversation';
  window.scrollTo = vi.fn();
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
  });
});
afterEach(cleanup);
const scenario = CONVERSATION_SCENARIOS[0];

function open() {
  render(<App />);
  const section = document.getElementById('conversation')!;
  fireEvent.click(within(section).getByRole('button', { name: 'תרגל: ' + scenario.title }));
  return section;
}

function advanceToResponses(section: HTMLElement) {
  const path = CONVERSATION_DECISION_PATHS[scenario.id];
  fireEvent.click(within(section).getByRole('button', { name: /להצטרף ולהקשיב/ }));
  fireEvent.click(within(section).getByRole('button', { name: /שיקוף והצטרפות/ }));
  expect(within(section).getByRole('progressbar').getAttribute('aria-valuenow')).toBe('2');
  expect(within(section).getByText('מה תגיד קודם?')).toBeTruthy();
  expect(path).toBeTruthy();
}

describe('conversation gym four-stage decision flow', () => {
  it('teaches intention then method before response, with opt-in hints', () => {
    const section = open();
    const progress = within(section).getByRole('progressbar', { name: 'התקדמות באימון' });
    expect(progress.getAttribute('aria-valuenow')).toBe('0');
    expect(within(section).getByText('מה הכיוון כרגע?')).toBeTruthy();
    expect(within(section).queryByText(CONVERSATION_DECISION_PATHS.meeting.direction.hint)).toBeNull();
    fireEvent.click(within(section).getByRole('button', { name: /רמז/ }));
    expect(within(section).getByText(CONVERSATION_DECISION_PATHS.meeting.direction.hint)).toBeTruthy();
    fireEvent.click(within(section).getByRole('button', { name: /להצטרף ולהקשיב/ }));
    expect(progress.getAttribute('aria-valuenow')).toBe('1');
    expect(within(section).getByText('באיזה כלי תשתמש?')).toBeTruthy();
    expect(within(section).queryByText(CONVERSATION_DECISION_PATHS.meeting.direction.hint)).toBeNull();
    fireEvent.click(within(section).getByRole('button', { name: /שיקוף והצטרפות/ }));
    expect(progress.getAttribute('aria-valuenow')).toBe('2');
    expect(within(section).getByText('מה תגיד קודם?')).toBeTruthy();
  });

  it('preserves first answer on retry, and never saves a learner draft', () => {
    const section = open();
    advanceToResponses(section);
    fireEvent.change(within(section).getByLabelText(/התגובה שלך/), { target: { value: 'private draft - never save' } });
    fireEvent.click(within(section).getByRole('button', { name: scenario.turns[0].options[0].text }));
    expect(within(section).getByRole('button', { name: /מהכללה לחוויה/ })).toBeTruthy();
    fireEvent.click(within(section).getByRole('button', { name: 'נסה שוב' }));
    fireEvent.click(within(section).getByRole('button', { name: scenario.turns[0].options[1].text }));
    fireEvent.click(within(section).getByRole('button', { name: 'להמשך השיחה' }));
    expect(within(section).getByRole('progressbar').getAttribute('aria-valuenow')).toBe('3');
    fireEvent.click(within(section).getByRole('button', { name: scenario.turns[1].options[0].text }));
    fireEvent.click(within(section).getByRole('button', { name: 'סיים את האימון' }));
    const saved = localStorage.getItem(LEARNING_KEY)!;
    expect(saved).not.toContain('private draft');
    expect(JSON.parse(saved).sessions[0].results[0].quality).toBe('mixed');
    expect(JSON.parse(localStorage.getItem('userProgress')!).xp).toBe(10);
    expect(within(section).getByText('המסלול שבחרת')).toBeTruthy();
    expect(within(section).getByRole('progressbar').getAttribute('aria-valuenow')).toBe('4');
  });

  it('can leave without awarding points', () => {
    const section = open();
    fireEvent.click(within(section).getByRole('button', { name: 'עזוב את האימון' }));
    expect(localStorage.getItem(LEARNING_KEY)).toBeNull();
    expect(within(section).getByRole('button', { name: 'מתחילים' })).toBeTruthy();
  });

  it('completes in mobile mode while preserving other lab routes', () => {
    window.matchMedia = vi.fn().mockImplementation(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
    const section = open();
    advanceToResponses(section);
    for (const [index, turn] of scenario.turns.entries()) {
      fireEvent.click(within(section).getByRole('button', { name: turn.options.find((option) => option.quality === 'helpful')!.text }));
      fireEvent.click(within(section).getByRole('button', { name: index === 1 ? 'סיים את האימון' : 'להמשך השיחה' }));
    }
    expect(within(section).getByText('המסלול שבחרת')).toBeTruthy();
    const mobileNav = screen.getByLabelText('ניווט מהיר במובייל');
    expect(within(mobileNav).getAllByRole('button')).toHaveLength(5);
    fireEvent.click(within(mobileNav).getByRole('button', { name: /בית/ }));
    fireEvent(window, new HashChangeEvent('hashchange'));
    const home = document.getElementById('home')!;
    expect(section.hidden).toBe(true);
    expect(home.hidden).toBe(false);
    const resources = within(home).getByLabelText('מקורות וכלים נוספים');
    expect(within(resources).getAllByRole('link')).toHaveLength(2);
    expect(within(resources).getAllByRole('link').map((link) => link.getAttribute('href'))).toContain('#legacy-tools');
  });
});
