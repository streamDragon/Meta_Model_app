// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import App from '../../App';
import { CONVERSATION_SCENARIOS } from '../../data/conversationScenarios';
import { LEARNING_KEY } from '../../lib/conversationLearning';
import { STARTING_CONNECTION } from '../../lib/conversationMomentum';

beforeEach(() => {
  localStorage.clear();
  window.location.hash = 'conversation';
  window.scrollTo = vi.fn();
  Object.defineProperty(window, 'matchMedia', {
    writable: true, value: vi.fn().mockImplementation(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
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
function act(section: HTMLElement) {
  fireEvent.click(within(section).getByRole('button', { name: /פעל/ }));
}
describe('therapist mind conversation training', () => {
  it('keeps thinking private and allows the fourth choice to open the mind', () => {
    const section = open();
    expect(within(section).getByRole('progressbar', { name: 'התקדמות באימון' }).getAttribute('aria-valuenow')).toBe('0');
    expect(within(section).getByRole('meter').getAttribute('aria-valuenow')).toBe(String(STARTING_CONNECTION));
    act(section);
    fireEvent.click(within(section).getByRole('button', { name: /אף אחת לא מתאימה/ }));
    const dialog = within(section).getByRole('dialog', { name: 'בתוך הראש של המטפל' });
    expect(within(dialog).getByText(/הדמות לא שומעת/)).toBeTruthy();
    fireEvent.change(within(dialog).getByLabelText(/טיוטה פרטית/), { target: { value: 'private draft' } });
    fireEvent.click(within(dialog).getByRole('button', { name: /כוונה/ }));
    fireEvent.click(within(dialog).getByRole('button', { name: /להצטרף ולהקשיב/ }));
    expect(within(dialog).getByText(/מתחילים בחוויה/)).toBeTruthy();
    fireEvent.click(within(dialog).getByRole('button', { name: /חזרה לשיחה/ }));
    expect(within(section).queryByRole('dialog', { name: 'בתוך הראש של המטפל' })).toBeNull();
    expect(within(section).getByRole('meter').getAttribute('aria-valuenow')).toBe(String(STARTING_CONNECTION));
  });

  it('shows an illustrative emotional response and allows repair without erasing a bad move', () => {
    const section = open();
    act(section);
    fireEvent.click(within(section).getByRole('button', { name: scenario.turns[0].options[2].text }));
    expect(within(section).getByText('נסגר מעט')).toBeTruthy();
    const beforeRepair = Number(within(section).getByRole('meter').getAttribute('aria-valuenow'));
    expect(beforeRepair).toBeLessThan(STARTING_CONNECTION);
    fireEvent.click(within(section).getByRole('button', { name: /תיקון הקשר/ }));
    const afterRepair = Number(within(section).getByRole('meter').getAttribute('aria-valuenow'));
    expect(afterRepair).toBeGreaterThan(beforeRepair);
    expect(within(section).getByText(/המהלך הקודם עדיין נלמד/)).toBeTruthy();
    fireEvent.click(within(section).getByRole('button', { name: 'המשך השיחה' }));
    expect(within(section).getByRole('progressbar').getAttribute('aria-valuenow')).toBe('1');
    act(section);
    fireEvent.click(within(section).getByRole('button', { name: scenario.turns[1].options[0].text }));
    fireEvent.click(within(section).getByRole('button', { name: 'סיים את האימון' }));
    expect(within(section).getByText('מסלול הקשר שלך')).toBeTruthy();
    const saved = localStorage.getItem(LEARNING_KEY)!;
    expect(JSON.parse(saved).sessions[0].results[0].quality).toBe('unhelpful');
    expect(JSON.parse(localStorage.getItem('userProgress')!).xp).toBe(10);
    expect(within(section).getByRole('progressbar').getAttribute('aria-valuenow')).toBe('2');
    const recap = within(section).getByRole('list', { name: 'מה בחרת בכל מהלך' });
    const items = within(recap).getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0].textContent).toContain(scenario.turns[0].options[2].text);
    expect(items[0].textContent).toContain('תוקן');
    expect(items[1].textContent).toContain(scenario.turns[1].options[0].text);
  });

  it('does not persist free form draft and allows leaving without reward', () => {
    const section = open();
    fireEvent.click(within(section).getByRole('button', { name: /חשוב/ }));
    const dialog = within(section).getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: /ניסוח/ }));
    fireEvent.change(within(dialog).getByLabelText(/טיוטה פרטית/), { target: { value: 'secret language' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'סגור חשיבה' }));
    fireEvent.click(within(section).getByRole('button', { name: 'עזוב את האימון' }));
    expect(localStorage.getItem(LEARNING_KEY)).toBeNull();
    expect(within(section).getByRole('button', { name: 'מתחילים' })).toBeTruthy();
  });

  it('preserves mobile navigation and completing with two helpful moves', () => {
    window.matchMedia = vi.fn().mockImplementation(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
    const section = open();
    for (const [index, turn] of scenario.turns.entries()) {
      act(section);
      fireEvent.click(within(section).getByRole('button', { name: turn.options.find((option) => option.quality === 'helpful')!.text }));
      fireEvent.click(within(section).getByRole('button', { name: index === 1 ? 'סיים את האימון' : 'המשך השיחה' }));
    }
    expect(within(section).getByText('מסלול הקשר שלך')).toBeTruthy();
    const mobileNav = screen.getByLabelText('ניווט מהיר במובייל');
    expect(within(mobileNav).getAllByRole('button')).toHaveLength(5);
    fireEvent.click(within(mobileNav).getByRole('button', { name: /בית/ }));
    fireEvent(window, new HashChangeEvent('hashchange'));
    const home = document.getElementById('home')!;
    expect(section.hidden).toBe(true);
    expect(home.hidden).toBe(false);
  });
});
