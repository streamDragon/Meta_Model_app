// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import App from '../../App';
import { CONVERSATION_SCENARIOS } from '../../data/conversationScenarios';
import { LEARNING_KEY } from '../../lib/conversationLearning';
beforeEach(() => {
  localStorage.clear(); window.location.hash = 'conversation';
  window.scrollTo = vi.fn();
  Object.defineProperty(window, 'matchMedia', { writable: true, value: vi.fn().mockImplementation(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })) });
});
afterEach(cleanup);
const scenario = CONVERSATION_SCENARIOS[0];
function open() {
  render(<App />);
  const section = document.getElementById('conversation')!;
  fireEvent.click(within(section).getByRole('button', { name: `תרגל: ${scenario.title}` }));
  return section;
}
describe('conversation gym', () => {
  it('keeps the first answer when retrying and never persists a free-form draft', () => {
    const section = open();
    fireEvent.change(within(section).getByLabelText(/התגובה שלך/), { target: { value: 'private draft - never save' } });
    fireEvent.click(within(section).getByRole('button', { name: scenario.turns[0].options[0].text }));
    fireEvent.click(within(section).getByRole('button', { name: 'נסה תגובה נוספת' }));
    fireEvent.click(within(section).getByRole('button', { name: scenario.turns[0].options[1].text }));
    fireEvent.click(within(section).getByRole('button', { name: 'לרגע הבא בשיחה' }));
    fireEvent.click(within(section).getByRole('button', { name: scenario.turns[1].options[0].text }));
    fireEvent.click(within(section).getByRole('button', { name: 'סכם את האימון' }));
    const saved = localStorage.getItem(LEARNING_KEY)!;
    expect(saved).not.toContain('private draft');
    expect(JSON.parse(saved).sessions[0].results[0].quality).toBe('mixed');
    expect(JSON.parse(localStorage.getItem('userProgress')!).xp).toBe(10);
    expect(within(section).getByText('מה תיקח לשיחה הבאה?')).toBeTruthy();
  });
  it('can leave an incomplete session without awarding points or storing its content', () => {
    const section = open();
    fireEvent.click(within(section).getByRole('button', { name: 'עזוב את האימון' }));
    expect(localStorage.getItem(LEARNING_KEY)).toBeNull();
    expect(screen.getByText('התחל אימון מומלץ')).toBeTruthy();
  });
  it('completes the conversation flow in mobile mode and exposes all routes without the desktop rail', () => {
    window.matchMedia = vi.fn().mockImplementation(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
    const section = open();
    for (const [index, turn] of scenario.turns.entries()) {
      fireEvent.click(within(section).getByRole('button', { name: turn.options.find((option) => option.quality === 'helpful')!.text }));
      fireEvent.click(within(section).getByRole('button', { name: index === scenario.turns.length - 1 ? 'סכם את האימון' : 'לרגע הבא בשיחה' }));
    }
    expect(within(section).getByText('מה תיקח לשיחה הבאה?')).toBeTruthy();
    const mobileNav = screen.getByLabelText('ניווט מהיר במובייל');
    expect(within(mobileNav).getAllByRole('button')).toHaveLength(5);
    expect(within(mobileNav).getByRole('button', { name: /שיחה/ })).toBeTruthy();
    fireEvent.click(within(mobileNav).getByRole('button', { name: /בית/ }));
    fireEvent(window, new HashChangeEvent('hashchange'));
    const home = document.getElementById('home')!;
    // Keep-alive pages remain mounted but correctly hidden from assistive technology.
    expect(section.hidden).toBe(true);
    expect(home.hidden).toBe(false);
    const resources = within(home).getByLabelText('מקורות וכלים נוספים');
    expect(within(resources).getAllByRole('link')).toHaveLength(2);
    expect(within(resources).getAllByRole('link').map((link) => link.getAttribute('href'))).toContain('#legacy-tools');
  });
});
