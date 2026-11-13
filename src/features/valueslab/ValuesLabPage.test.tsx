// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import App from '../../App';

const mockMatchMedia = (matches: boolean) => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(() => ({ matches, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
  });
};

beforeEach(() => {
  localStorage.clear();
  window.scrollTo = vi.fn();
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(cleanup);

const openFirstScenario = () => {
  window.location.hash = 'valueslab';
  render(<App />);
  fireEvent.click(screen.getAllByRole('button', { name: /פתח תרחיש/ })[0]);
};

const questionLists = () => screen.queryAllByRole('heading', { name: /שאלות מטה-מודל/ });

describe('values lab', () => {
  it('renders the meta-model question list once, before and after checking the map', () => {
    mockMatchMedia(false);
    openFirstScenario();
    expect(questionLists()).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'בדוק את המפה' }));
    expect(questionLists()).toHaveLength(1);
    const items = document.querySelectorAll('.vcl-generated-questions li, .meta-list li');
    const texts = Array.from(items).map((li) => li.textContent);
    expect(new Set(texts).size).toBe(texts.length);
  });

  it('walks one step at a time on a phone and ends with a summary card', () => {
    mockMatchMedia(true);
    openFirstScenario();
    expect(screen.queryByRole('button', { name: 'בדוק את המפה' })).toBeNull();
    expect(screen.queryByText('⚔️ מפת התנגשויות')).toBeNull();
    fireEvent.click(within(screen.getByLabelText('שלבי האשף')).getByRole('button', { name: /בדיקת המפה/ }));
    expect(screen.queryByText(/כרטיס 1 מתוך/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'בדוק את המפה' }));
    expect(questionLists()).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'סיים וסכם' }));
    const summary = screen.getByLabelText('סיכום הסשן');
    expect(within(summary).getByText('המהלך שבחרת')).toBeTruthy();
    expect(within(summary).getByRole('link', { name: /בשיחה/ }).getAttribute('href')).toBe('#conversation');
  });
});
